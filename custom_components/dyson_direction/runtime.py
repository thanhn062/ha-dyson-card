"""Control an existing Dyson through Home Assistant's public actions."""

import asyncio
import time

from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.helpers import entity_registry as er

from .presets import Movement, normalize_presets


class Runtime:
    def __init__(self, hass, entry):
        self.hass = hass
        self.entry = entry
        self.entity = None
        self.movement = Movement(self)

    @property
    def fan_entity_id(self):
        for entity in er.async_get(self.hass).entities.values():
            if (
                entity.platform == "hass_dyson"
                and entity.domain == "fan"
                and entity.unique_id == self.entry.data["source_unique_id"]
            ):
                return entity.entity_id
        return self.entry.data["fan_entity_id"]

    @property
    def device_id(self):
        source = er.async_get(self.hass).async_get(self.fan_entity_id)
        return source.device_id if source else self.entry.data["source_device_id"]

    @property
    def presets(self):
        return self.entry.data.get("presets", [])

    def snapshot(self):
        state = self.hass.states.get(self.fan_entity_id)
        if state is None or state.state in ("unknown", "unavailable"):
            raise ValueError("Dyson fan is unavailable")
        attrs = state.attributes
        lower = int(attrs["angle_low"])
        upper = int(attrs["angle_high"])
        if not 0 <= lower <= upper <= 350:
            raise ValueError("Dyson reported an invalid sweep range")
        oscillating = attrs.get("oscillation_enabled", attrs.get("oscillating"))
        if not isinstance(oscillating, bool):
            raise ValueError("Dyson oscillation state is unavailable")
        return {
            "on": state.state == "on",
            "center": (lower + upper) / 2,
            "span": upper - lower,
            "oscillating": oscillating,
            "lower": lower,
            "upper": upper,
        }

    async def angles(self, lower, upper):
        if not self.hass.services.has_service("hass_dyson", "set_oscillation_angles"):
            raise HomeAssistantError(
                "Dyson's Set Oscillation Angles action is unavailable"
            )
        await self.hass.services.async_call(
            "hass_dyson",
            "set_oscillation_angles",
            {"device_id": self.device_id, "lower_angle": lower, "upper_angle": upper},
            blocking=True,
        )

    async def stop(self):
        await self.hass.services.async_call(
            "fan",
            "oscillate",
            {"entity_id": self.fan_entity_id, "oscillating": False},
            blocking=True,
        )

    async def confirm(self, lower, upper, oscillating):
        deadline = time.monotonic() + 8
        while time.monotonic() < deadline:
            current = self.snapshot()
            if (
                current["lower"] == lower
                and current["upper"] == upper
                and current["oscillating"] == oscillating
            ):
                return
            await asyncio.sleep(0.1)
        raise HomeAssistantError(
            "Dyson did not confirm the requested direction/oscillation state"
        )

    async def recall(self, name):
        preset = next(
            (
                p
                for p in self.presets
                if p["name"].casefold() == name.strip().casefold()
            ),
            None,
        )
        if preset is None:
            raise ServiceValidationError(f"Unknown direction preset: {name}")
        try:
            await self.movement.recall(preset["direction"])
        except (ValueError, KeyError, TypeError) as error:
            raise ServiceValidationError(str(error)) from error

    def save(self, presets):
        try:
            normalized = normalize_presets(presets)
        except ValueError as error:
            raise ServiceValidationError(str(error)) from error
        self.hass.config_entries.async_update_entry(
            self.entry, data={**self.entry.data, "presets": normalized}
        )
        if self.entity:
            self.entity.async_write_ha_state()
