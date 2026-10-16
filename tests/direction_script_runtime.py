"""Execute generated script fixtures in real HA with simulated Dyson services.

Requires a Home Assistant development environment. Generate fixtures with:
node tests/direction-scripts.mjs /tmp/dyson-script-fixtures.json
DYSON_SCRIPT_FIXTURES=/tmp/dyson-script-fixtures.json python tests/direction_script_runtime.py
No network, installed configuration, or actual device is used.
"""
import asyncio
import copy
import json
import os
import tempfile
import unittest

from homeassistant.components.script.config import async_validate_config_item
from homeassistant.core import Context, HomeAssistant
from homeassistant.helpers.script import Script


class GeneratedScriptTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.hass = HomeAssistant(self.directory.name)
        with open(os.environ["DYSON_SCRIPT_FIXTURES"]) as source:
            self.fixtures = json.load(source)
        self.commands = []
        self.shift = 0
        self.ignore_angles = False
        self.auto_stop_point = False
        self.set_fan(118, 163, True)
        self.set_mode("45°")

        async def angles(call):
            self.commands.append(("angles", dict(call.data)))
            if self.ignore_angles:
                return
            low, high = call.data["lower_angle"], call.data["upper_angle"]
            shift = self.shift if low != high else 0
            self.set_fan(low + shift, high + shift, not (self.auto_stop_point and low == high))
            self.set_mode("Custom")

        async def oscillate(call):
            self.commands.append(("oscillate", dict(call.data)))
            a = self.hass.states.get("fan.dyson").attributes
            self.set_fan(a["angle_low"], a["angle_high"], call.data["oscillating"])

        async def select(call):
            self.commands.append(("select", dict(call.data)))
            self.set_mode(call.data["option"])
            # Native 350 mode deliberately leaves angle endpoints stale.
            a = self.hass.states.get("fan.dyson").attributes
            self.set_fan(a["angle_low"], a["angle_high"], True)

        self.hass.services.async_register("hass_dyson", "set_oscillation_angles", angles)
        self.hass.services.async_register("fan", "oscillate", oscillate)
        self.hass.services.async_register("select", "select_option", select)

    async def asyncTearDown(self):
        await self.hass.async_block_till_done()
        self.directory.cleanup()

    def set_fan(self, low, high, oscillation, state="on"):
        self.hass.states.async_set("fan.dyson", state, {
            "angle_low": low, "angle_high": high,
            "oscillation_enabled": oscillation, "percentage": 70,
        })

    def set_mode(self, mode):
        self.hass.states.async_set("select.dyson_sweep", mode, {
            "options": ["Custom", "45°", "90°", "180°", "350°"],
        })

    async def run_script(self, values, fixture="normal", short_timeout=False):
        config = copy.deepcopy(self.fixtures[fixture])
        if short_timeout:
            def shorten(node):
                if isinstance(node, dict):
                    if "wait_template" in node:
                        node["timeout"] = {"milliseconds": 20}
                    for value in node.values():
                        shorten(value)
                elif isinstance(node, list):
                    for value in node:
                        shorten(value)
            shorten(config)
        validated = await async_validate_config_item(self.hass, "dyson_test", config)
        script = Script(self.hass, validated["sequence"], "Dyson test", "script", script_mode=config["mode"])
        return await script.async_run(values, Context())

    def assert_fan(self, low, high, oscillating):
        state = self.hass.states.get("fan.dyson")
        self.assertEqual(state.state, "on")
        self.assertEqual(state.attributes["percentage"], 70)
        self.assertEqual((state.attributes["angle_low"], state.attributes["angle_high"], state.attributes["oscillation_enabled"]), (low, high, oscillating))

    async def test_all_fixture_schemas(self):
        for name, config in self.fixtures.items():
            with self.subTest(name=name):
                self.assertIsNotNone(await async_validate_config_item(self.hass, "dyson_test", config))

    async def test_preserve_active_selected_width_with_stale_bounds(self):
        self.set_fan(140, 140, True)
        await self.run_script({"preset": "bed-id"})
        self.assert_fan(143, 188, True)

    async def test_explicit_sweeps_enable_from_stationary_and_clamp(self):
        for width in (45, 90, 180):
            with self.subTest(width=width):
                self.set_fan(140, 140, False)
                await self.run_script({"preset": "bed-id", "sweep": width})
                self.assert_fan(165 - width // 2, 165 - width // 2 + width, True)

    async def test_common_one_degree_shift(self):
        self.shift = -1
        await self.run_script({"preset": "bed-id", "sweep": "45"})
        self.assert_fan(142, 187, True)

    async def test_stationary_preserves_width_and_off_state(self):
        self.set_fan(118, 163, False)
        self.auto_stop_point = True
        await self.run_script({"preset": "bed-id"})
        self.assert_fan(143, 188, False)

    async def test_direct_aims_then_stops(self):
        await self.run_script({"preset": "bed-id", "sweep": "0"})
        self.assert_fan(165, 165, False)

    async def test_native_350_and_omitted_preserve_ignore_stale_bounds(self):
        await self.run_script({"preset": "bed-id", "sweep": "350"})
        self.assertEqual(self.hass.states.get("select.dyson_sweep").state, "350°")
        await self.run_script({"preset": "bed-id"})
        self.assertEqual(self.commands[-1][0], "select")
        await self.run_script({"preset": "bed-id", "sweep": "45"})
        self.assert_fan(143, 188, True)

    async def test_stationary_native_350_is_restored_after_aiming(self):
        self.set_mode("350°")
        self.set_fan(140, 140, False)
        await self.run_script({"preset": "bed-id"})
        self.assertEqual(self.hass.states.get("select.dyson_sweep").state, "350°")
        self.assertFalse(self.hass.states.get("fan.dyson").attributes["oscillation_enabled"])

    async def test_invalid_missing_deleted_inputs_issue_no_commands(self):
        for values, fixture in [({}, "normal"), ({"preset": "deleted"}, "normal"),
                                ({"preset": "bed-id", "sweep": True}, "normal"),
                                ({"preset": "bed-id", "sweep": 30}, "normal"),
                                ({"preset": "bed-id"}, "empty")]:
            with self.subTest(values=values, fixture=fixture):
                with self.assertLogs("homeassistant.helpers.script.dyson_test", level="INFO") as logs:
                    await self.run_script(values, fixture)
                self.assertTrue(any("Error script sequence" in entry for entry in logs.output))
                self.assertEqual(self.commands, [])

    async def test_fan_off_and_unsupported_native_wide_fail_before_commands(self):
        self.set_fan(118, 163, True, "off")
        with self.assertLogs("homeassistant.helpers.script.dyson_test", level="INFO") as logs:
            await self.run_script({"preset": "bed-id"})
        self.assertTrue(any("Error script sequence" in entry for entry in logs.output))
        self.set_fan(118, 163, True)
        self.hass.states.async_set("select.dyson_sweep", "Custom", {"options": ["Custom"]})
        with self.assertLogs("homeassistant.helpers.script.dyson_test", level="INFO") as logs:
            await self.run_script({"preset": "bed-id", "sweep": "350"})
        self.assertTrue(any("Error script sequence" in entry for entry in logs.output))
        self.assertEqual(self.commands, [])

    async def test_point_timeout_stops_oscillation(self):
        self.ignore_angles = True
        with self.assertLogs("homeassistant.helpers.script.dyson_test", level="INFO") as logs:
            await self.run_script({"preset": "bed-id", "sweep": "0"}, short_timeout=True)
        self.assertTrue(any("Error script sequence" in entry for entry in logs.output))
        self.assertEqual(self.commands[-1][0], "oscillate")
        self.assertFalse(self.hass.states.get("fan.dyson").attributes["oscillation_enabled"])

    async def test_template_text_is_literal_data(self):
        await self.run_script({"preset": "{{ 8 * 8 }}", "sweep": "45"}, "hostile")
        self.assert_fan(143, 188, True)

    async def test_same_script_calls_are_queued_without_overlapping_commands(self):
        active = 0
        peak = 0

        async def slow_angles(call):
            nonlocal active, peak
            active += 1
            peak = max(peak, active)
            await asyncio.sleep(.02)
            self.set_fan(call.data["lower_angle"], call.data["upper_angle"], True)
            self.set_mode("Custom")
            self.commands.append(("angles", dict(call.data)))
            active -= 1

        self.hass.services.async_register("hass_dyson", "set_oscillation_angles", slow_angles)
        config = await async_validate_config_item(self.hass, "dyson_test", self.fixtures["normal"])
        script = Script(self.hass, config["sequence"], "Dyson queued", "script", script_mode="queued")
        await asyncio.gather(*(script.async_run({"preset": "bed-id", "sweep": width}, Context()) for width in (45, 90, 180)))
        self.assertEqual(peak, 1)
        self.assertEqual([c[1]["upper_angle"] - c[1]["lower_angle"] for c in self.commands], [45, 90, 180])
        self.assert_fan(75, 255, True)


if __name__ == "__main__":
    unittest.main()
