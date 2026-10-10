"""Movement policy regressions without a Home Assistant installation."""

import asyncio
import importlib.util
from pathlib import Path
import unittest

path = (
    Path(__file__).resolve().parents[1] / "custom_components/dyson_direction/presets.py"
)
spec = importlib.util.spec_from_file_location("direction_presets", path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class Controls:
    def __init__(self, span=0, oscillating=False, on=True):
        self.state = {"on": on, "center": 140, "span": span, "oscillating": oscillating}
        self.events = []
        self.fail_confirm = False

    def snapshot(self):
        return dict(self.state)

    async def angles(self, lower, upper):
        self.events.append(("angles", lower, upper))
        self.state.update(
            center=(lower + upper) / 2, span=upper - lower, oscillating=True
        )

    async def confirm(self, lower, upper, oscillating):
        self.events.append(("confirm", lower, upper, oscillating))
        if self.fail_confirm:
            raise RuntimeError("No device response")
        assert self.state["oscillating"] == oscillating

    async def stop(self):
        self.events.append(("stop",))
        self.state["oscillating"] = False

    async def sleep(self, seconds):
        self.events.append(("settle", seconds))
        await asyncio.sleep(0)


class MovementTests(unittest.IsolatedAsyncioTestCase):
    async def test_stationary_zero_width(self):
        controls = Controls()
        await module.Movement(controls, controls.sleep).recall(165)
        self.assertEqual(
            controls.state, {"on": True, "center": 165, "span": 0, "oscillating": False}
        )
        self.assertEqual(
            [x[0] for x in controls.events],
            ["angles", "confirm", "settle", "stop", "confirm"],
        )

    async def test_stationary_configured_width(self):
        controls = Controls(span=90)
        await module.Movement(controls, controls.sleep).recall(165)
        self.assertEqual(
            controls.state,
            {"on": True, "center": 165, "span": 90, "oscillating": False},
        )
        self.assertLess(
            controls.events.index(("angles", 120, 210)),
            controls.events.index(("stop",)),
        )

    async def test_active_sweep(self):
        controls = Controls(span=90, oscillating=True)
        await module.Movement(controls, controls.sleep).recall(165)
        self.assertEqual(controls.state["span"], 90)
        self.assertTrue(controls.state["oscillating"])
        self.assertEqual(len(controls.events), 2)

    async def test_off_fan_not_started(self):
        controls = Controls(on=False)
        with self.assertRaises(ValueError):
            await module.Movement(controls, controls.sleep).recall(165)
        self.assertEqual(controls.events, [])

    async def test_failure_stops_stationary_motor(self):
        controls = Controls()
        controls.fail_confirm = True
        with self.assertRaises(RuntimeError):
            await module.Movement(controls, controls.sleep).recall(165)
        self.assertFalse(controls.state["oscillating"])

    async def test_recalls_are_serialized(self):
        controls = Controls(span=90)
        movement = module.Movement(controls, controls.sleep)
        await asyncio.gather(movement.recall(165), movement.recall(140))
        self.assertEqual(controls.state["center"], 140)
        self.assertEqual(
            [event for event in controls.events if event[0] == "angles"],
            [
                ("angles", 165, 165),
                ("angles", 120, 210),
                ("angles", 140, 140),
                ("angles", 95, 185),
            ],
        )


class ValidationTests(unittest.TestCase):
    def test_invalid_inputs(self):
        for angle in [float("nan"), float("inf"), True, -1, 351, "165"]:
            with self.assertRaises(ValueError):
                module.normalize_presets([{"name": "Bed", "direction": angle}])
        with self.assertRaises(ValueError):
            module.normalize_presets(
                [{"name": "Bed", "direction": 165}, {"name": "bed", "direction": 140}]
            )

    def test_bounds_keep_width(self):
        self.assertEqual(module.sweep_bounds(0, 90), (0, 90))
        self.assertEqual(module.sweep_bounds(350, 90), (260, 350))
        self.assertEqual(module.sweep_bounds(165, 90), (120, 210))
        self.assertEqual(module.sweep_bounds(165, 350), (0, 350))


if __name__ == "__main__":
    unittest.main()
