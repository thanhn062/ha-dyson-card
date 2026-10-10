"""Independent Dyson direction presets using stock Home Assistant actions."""

import voluptuous as vol

from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import service as service_helper

from .const import DOMAIN, PLATFORMS
from .runtime import Runtime


def _runtime_for_call(hass, call):
    matches = [
        runtime
        for runtime in hass.data.get(DOMAIN, {}).values()
        if runtime.device_id == call.data["device_id"]
    ]
    if len(matches) != 1:
        raise ServiceValidationError(
            "Set up Dyson Direction Presets for the selected Dyson device first"
        )
    return matches[0]


def _refresh_schema(hass):
    names = sorted(
        {
            p["name"]
            for runtime in hass.data.get(DOMAIN, {}).values()
            for p in runtime.presets
        }
    )
    service_helper.async_set_service_schema(
        hass,
        DOMAIN,
        "set_preset",
        {
            "name": "Set Direction Preset",
            "description": "Recall a saved center angle while preserving sweep width and oscillation state.",
            "fields": {
                "device_id": {
                    "name": "Dyson Device",
                    "required": True,
                    "selector": {"device": {"integration": "hass_dyson"}},
                },
                "preset": {
                    "name": "Preset",
                    "required": True,
                    "selector": {
                        "select": {
                            "options": names,
                            "custom_value": True,
                            "mode": "dropdown",
                        }
                    }
                    if names
                    else {"text": {}},
                },
            },
        },
    )


async def async_setup_entry(hass, entry):
    runtimes = hass.data.setdefault(DOMAIN, {})
    runtime = Runtime(hass, entry)
    runtimes[entry.entry_id] = runtime

    async def recall(call):
        await _runtime_for_call(hass, call).recall(call.data["preset"])

    async def save(call):
        _runtime_for_call(hass, call).save(call.data["presets"])
        _refresh_schema(hass)

    if not hass.services.has_service(DOMAIN, "set_preset"):
        hass.services.async_register(
            DOMAIN,
            "set_preset",
            recall,
            schema=vol.Schema(
                {
                    vol.Required("device_id"): str,
                    vol.Required("preset"): vol.All(str, vol.Length(min=1, max=64)),
                }
            ),
        )
        hass.services.async_register(
            DOMAIN,
            "set_presets",
            save,
            schema=vol.Schema(
                {vol.Required("device_id"): str, vol.Required("presets"): list}
            ),
        )
    try:
        await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    except Exception:
        runtimes.pop(entry.entry_id, None)
        if not runtimes:
            for action in ("set_preset", "set_presets"):
                hass.services.async_remove(DOMAIN, action)
        raise
    _refresh_schema(hass)
    return True


async def async_unload_entry(hass, entry):
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        hass.data[DOMAIN].pop(entry.entry_id, None)
        if not hass.data[DOMAIN]:
            for action in ("set_preset", "set_presets"):
                hass.services.async_remove(DOMAIN, action)
        else:
            _refresh_schema(hass)
    return unloaded
