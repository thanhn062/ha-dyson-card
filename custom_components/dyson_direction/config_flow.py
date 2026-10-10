"""Set up independent presets for one existing Dyson fan."""

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.helpers import entity_registry as er, selector

from .const import DOMAIN
from .presets import normalize_presets


class DysonDirectionConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Create one direction-preset entry per Dyson fan."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        errors = {}
        if user_input is not None:
            fan = user_input["fan_entity_id"]
            source = er.async_get(self.hass).async_get(fan)
            state = self.hass.states.get(fan)
            if (
                not source
                or source.platform != "hass_dyson"
                or not source.device_id
                or not state
                or "angle_low" not in state.attributes
                or "angle_high" not in state.attributes
            ):
                errors["base"] = "unsupported_fan"
            else:
                await self.async_set_unique_id(source.unique_id)
                self._abort_if_unique_id_configured()
                legacy = self.hass.config_entries.async_get_entry(
                    source.config_entry_id
                )
                presets = legacy.data.get("direction_presets", []) if legacy else []
                try:
                    presets = normalize_presets(presets)
                except ValueError:
                    presets = []
                return self.async_create_entry(
                    title=f"{state.name} Direction",
                    data={
                        "fan_entity_id": fan,
                        "source_unique_id": source.unique_id,
                        "source_device_id": source.device_id,
                        "presets": presets,
                    },
                )
        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required("fan_entity_id"): selector.EntitySelector(
                        selector.EntitySelectorConfig(
                            domain="fan", integration="hass_dyson"
                        )
                    )
                }
            ),
            errors=errors,
        )
