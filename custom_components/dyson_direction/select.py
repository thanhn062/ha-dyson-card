"""Native select backed by independent direction-preset storage."""

from homeassistant.components.select import SelectEntity
from homeassistant.const import EVENT_STATE_CHANGED
from homeassistant.core import callback

from .const import DOMAIN


async def async_setup_entry(hass, entry, async_add_entities):
    runtime = hass.data[DOMAIN][entry.entry_id]
    entity = DirectionPresetSelect(runtime)
    runtime.entity = entity
    async_add_entities([entity])


class DirectionPresetSelect(SelectEntity):
    _attr_should_poll = False
    _attr_icon = "mdi:map-marker-radius"

    def __init__(self, runtime):
        self.runtime = runtime
        self._attr_unique_id = f"{runtime.entry.unique_id}_direction_preset"
        self._attr_name = f"{runtime.entry.title} Preset"

    @property
    def available(self):
        try:
            self.runtime.snapshot()
        except (ValueError, KeyError, TypeError):
            return False
        return self.hass.services.has_service("hass_dyson", "set_oscillation_angles")

    @property
    def options(self):
        return [p["name"] for p in self.runtime.presets]

    @property
    def current_option(self):
        try:
            center = self.runtime.snapshot()["center"]
        except (ValueError, KeyError, TypeError):
            return None
        return next(
            (
                p["name"]
                for p in self.runtime.presets
                if abs(p["direction"] - center) <= 2
            ),
            None,
        )

    @property
    def extra_state_attributes(self):
        return {
            "presets": self.runtime.presets,
            "fan_entity_id": self.runtime.fan_entity_id,
            "source_device_id": self.runtime.device_id,
            "preset_domain": DOMAIN,
        }

    async def async_select_option(self, option):
        await self.runtime.recall(option)

    async def async_added_to_hass(self):
        await super().async_added_to_hass()
        self.async_on_remove(
            self.hass.bus.async_listen(EVENT_STATE_CHANGED, self._state_changed)
        )

    @callback
    def _state_changed(self, event):
        if event.data.get("entity_id") == self.runtime.fan_entity_id:
            self.async_write_ha_state()
