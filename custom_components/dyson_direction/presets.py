"""Validation and movement policy, independent of upstream integration code."""

import asyncio
import math


def normalize_presets(value):
    if not isinstance(value, list) or len(value) > 32:
        raise ValueError("Provide a list of at most 32 presets")
    result = []
    names = set()
    for raw in value:
        if not isinstance(raw, dict):
            raise ValueError("Each preset must be an object")
        name = str(raw.get("name", "")).strip()
        angle = raw.get("direction")
        if not name or len(name) > 64 or name.casefold() in names:
            raise ValueError(
                "Preset names must be nonempty and unique (maximum 64 characters)"
            )
        if (
            isinstance(angle, bool)
            or not isinstance(angle, (int, float))
            or not math.isfinite(angle)
            or not 0 <= angle <= 350
        ):
            raise ValueError("Direction must be a finite number from 0 to 350")
        names.add(name.casefold())
        icon = str(raw.get("icon", "mdi:crosshairs-gps"))[:128]
        result.append(
            {
                "id": str(raw.get("id") or name.casefold())[:128],
                "name": name,
                "icon": icon if icon.startswith("mdi:") else "mdi:crosshairs-gps",
                "direction": round(angle / 5) * 5,
            }
        )
    return result


def sweep_bounds(center, span):
    lower = max(0, min(350 - span, center - span // 2))
    return lower, lower + span


class Movement:
    """Serialize recalls and preserve the fan's reported sweep settings."""

    def __init__(self, controls, sleep=asyncio.sleep):
        self.controls = controls
        self.sleep = sleep
        self.lock = asyncio.Lock()

    async def recall(self, center):
        async with self.lock:
            initial = self.controls.snapshot()
            if not initial["on"]:
                raise ValueError("Turn the Dyson fan on before recalling a direction")
            lower, upper = sweep_bounds(center, initial["span"])
            if initial["oscillating"]:
                await self.controls.angles(lower, upper)
                await self.controls.confirm(lower, upper, True)
                return
            try:
                await self.controls.angles(center, center)
                await self.controls.confirm(center, center, True)
                travel = abs(center - initial["center"])
                await self.sleep(max(1.5, min(7.0, travel / 30.0 + 0.8)))
                if initial["span"]:
                    await self.controls.angles(lower, upper)
                    await self.controls.confirm(lower, upper, True)
            finally:
                # A standalone stop is accepted by the stock Dyson action API.
                await self.controls.stop()
            await self.controls.confirm(lower, upper, False)
