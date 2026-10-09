"""Exercise recovered preset movement code without an HA installation.

Usage: python3 test_direction_presets.py /path/to/patched/hass_dyson
"""

import ast
import asyncio
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest.mock import AsyncMock


root = Path(sys.argv[1])
events = []


class Entity:
    def __init__(self, coordinator):
        self.coordinator = coordinator

    def async_write_ha_state(self):
        events.append(("publish",))


class Device:
    @staticmethod
    def get_state_value(state, key, default):
        return state.get(key, default)

    async def set_oscillation_angles(self, lower, upper, oscillating=True):
        events.append(("angles", lower, upper, oscillating))

    async def set_oscillation(self, enabled):
        events.append(("oscillate", enabled))


async def sleep(seconds):
    events.append(("settle", seconds))


def extract(filename, names, namespace):
    tree = ast.parse((root / filename).read_text())
    nodes = [node for node in tree.body if getattr(node, "name", None) in names]
    assert len(nodes) == len(names)
    code = ast.Module(body=[ast.ImportFrom(module="__future__", names=[ast.alias(name="annotations")], level=0)] + nodes, type_ignores=[])
    exec(compile(ast.fix_missing_locations(code), filename, "exec"), namespace)


namespace = {
    "DysonEntity": Entity,
    "SelectEntity": object,
    "callback": lambda function: function,
    "HomeAssistantError": RuntimeError,
    "ServiceValidationError": ValueError,
    "get_direction_presets": lambda coordinator: [{"name": "Bed", "direction": 165}],
    "asyncio": SimpleNamespace(sleep=sleep),
}
extract("select.py", {"DysonDirectionPresetSelect"}, namespace)
Preset = namespace["DysonDirectionPresetSelect"]


async def main():
    for oscillating, span in [(False, 0), (False, 90), (True, 90)]:
        events.clear()
        state = {"osal": "0140", "osau": f"{140 + span:04d}", "oson": "ON" if oscillating else "OFF"}
        preset = Preset(SimpleNamespace(device=Device(), data={"product-state": state}, serial_number="TEST"))
        await preset.async_select_option("Bed")
        if oscillating:
            assert events == [("angles", 120, 210, True), ("publish",)], events
        else:
            assert events[0] == ("angles", 165, 165, True), events
            assert events[1][0] == "settle" and 1.5 <= events[1][1] <= 7, events
            expected = ("angles", 120, 210, False) if span else ("oscillate", False)
            assert events[2:] == [expected, ("publish",)], events
        events.clear()
        try:
            await preset.async_select_option("Missing")
        except ValueError:
            pass
        else:
            raise AssertionError("Unknown preset accepted")
        assert not events

    coordinator = SimpleNamespace(device=Device(), serial_number="TEST")
    resolve = AsyncMock(return_value=coordinator)
    registry = SimpleNamespace(async_get_entity_id=lambda *args: "select.dyson_direction_preset")
    namespace.update({"_get_coordinator_from_device_id": resolve, "er": SimpleNamespace(async_get=lambda hass: registry), "DOMAIN": "hass_dyson"})
    extract("services.py", {"_handle_set_direction_preset"}, namespace)
    service = AsyncMock()
    hass = SimpleNamespace(services=SimpleNamespace(async_call=service))
    call = SimpleNamespace(data={"device_id": "TEST", "preset": " bed "}, context=object())
    await namespace["_handle_set_direction_preset"](hass, call)
    service.assert_awaited_once_with("select", "select_option", {"entity_id": "select.dyson_direction_preset", "option": "Bed"}, blocking=True, context=call.context)
    print("PASS: stationary movement settles before stopping; sweep width/state preserved; action resolves preset and delegates to select")


asyncio.run(main())
