"""Isolated setup and persistence tests using actual Home Assistant APIs."""

import asyncio
import json
from pathlib import Path
import shutil
import tempfile
from types import MappingProxyType

from homeassistant.config_entries import ConfigEntry, ConfigEntries
from homeassistant.core import HomeAssistant
from homeassistant import loader
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import device_registry as dr, area_registry as ar
from homeassistant.setup import async_setup_component


def entry(domain, data, unique_id="TEST"):
    return ConfigEntry(
        domain=domain,
        title="Dyson Direction",
        data=data,
        unique_id=unique_id,
        version=1,
        minor_version=1,
        source="user",
        options={},
        discovery_keys=MappingProxyType({}),
        subentries_data=None,
    )


async def main():
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        shutil.copytree(
            Path(__file__).resolve().parents[1] / "custom_components/dyson_direction",
            root / "custom_components/dyson_direction",
        )
        upstream = root / "custom_components/hass_dyson"
        upstream.mkdir()
        (root / "custom_components/__init__.py").write_text("")
        (upstream / "__init__.py").write_text(
            "async def async_setup(hass, config):\n    return True\nasync def async_setup_entry(hass, entry):\n    return True\nasync def async_unload_entry(hass, entry):\n    return True\n"
        )
        (upstream / "config_flow.py").write_text(
            'from homeassistant import config_entries\nclass Flow(config_entries.ConfigFlow, domain="hass_dyson"):\n    VERSION = 1\n'
        )
        (upstream / "manifest.json").write_text(
            json.dumps(
                {
                    "domain": "hass_dyson",
                    "name": "Fake stock Dyson",
                    "version": "0.38.0",
                    "requirements": [],
                }
            )
        )
        hass = HomeAssistant(str(root))
        hass.config_entries = ConfigEntries(hass, {})
        await hass.config_entries.async_initialize()
        loader.async_setup(hass)
        await ar.async_load(hass)
        dr.async_setup(hass)
        await dr.async_load(hass)
        source = entry(
            "hass_dyson", {"direction_presets": [{"name": "Bed", "direction": 165}]}
        )
        hass.config_entries._entries[source.entry_id] = source
        registry = er.async_get(hass)
        await registry.async_load()
        fan = registry.async_get_or_create(
            "fan",
            "hass_dyson",
            "FAN_TEST",
            suggested_object_id="dyson",
            config_entry=source,
        )
        device = dr.async_get(hass).async_get_or_create(
            config_entry_id=source.entry_id, identifiers={("hass_dyson", "TEST")}
        )
        registry.async_update_entity(fan.entity_id, device_id=device.id)
        attributes = {
            "angle_low": 140,
            "angle_high": 140,
            "oscillation_enabled": False,
            "oscillating": False,
        }
        hass.states.async_set(fan.entity_id, "on", attributes)
        calls = []

        async def angles(call):
            calls.append(("angles", dict(call.data)))
            attributes.update(
                angle_low=call.data["lower_angle"],
                angle_high=call.data["upper_angle"],
                oscillation_enabled=True,
                oscillating=True,
            )
            hass.states.async_set(fan.entity_id, "on", dict(attributes))

        async def oscillate(call):
            calls.append(("stop", dict(call.data)))
            attributes.update(
                oscillation_enabled=call.data["oscillating"],
                oscillating=call.data["oscillating"],
            )
            hass.states.async_set(fan.entity_id, "on", dict(attributes))

        hass.services.async_register("hass_dyson", "set_oscillation_angles", angles)
        hass.services.async_register("fan", "oscillate", oscillate)
        await hass.async_start()
        assert await async_setup_component(hass, "dyson_direction", {})
        # Exercise the actual UI config flow and migration from the old entry.
        form = await hass.config_entries.flow.async_init(
            "dyson_direction", context={"source": "user"}
        )
        result = await hass.config_entries.flow.async_configure(
            form["flow_id"], {"fan_entity_id": fan.entity_id}
        )
        assert result["type"] == "create_entry", result
        configured = result["result"]
        await hass.async_block_till_done()
        assert hass.services.has_service("dyson_direction", "set_preset")
        runtime = hass.data["dyson_direction"][configured.entry_id]
        assert runtime.presets[0]["name"] == "Bed"
        assert runtime.entity.available
        assert runtime.entity.extra_state_attributes["fan_entity_id"] == fan.entity_id

        async def settle(seconds):
            await asyncio.sleep(0)

        runtime.movement.sleep = settle
        await hass.services.async_call(
            "dyson_direction",
            "set_preset",
            {"device_id": device.id, "preset": "bed"},
            blocking=True,
        )
        assert attributes["angle_low"] == attributes["angle_high"] == 165
        assert not attributes["oscillation_enabled"]
        await hass.services.async_call(
            "dyson_direction",
            "set_presets",
            {"device_id": device.id, "presets": [{"name": "Desk", "direction": 140}]},
            blocking=True,
        )
        assert configured.data["presets"][0]["name"] == "Desk"
        assert source.data["direction_presets"][0]["name"] == "Bed", (
            "upstream config must not be changed"
        )

        # Mimic the original failure: remove the patched upstream actions/files.
        assert not hass.services.has_service("hass_dyson", "set_direction_preset")
        assert not (upstream / "direction_presets.py").exists()
        assert configured.data["presets"][0]["name"] == "Desk"
        await hass.services.async_call(
            "dyson_direction",
            "set_preset",
            {"device_id": device.id, "preset": "Desk"},
            blocking=True,
        )
        assert attributes["angle_low"] == attributes["angle_high"] == 140
        assert not attributes["oscillation_enabled"]
        renamed = registry.async_update_entity(
            fan.entity_id, new_entity_id="fan.renamed_dyson"
        )
        hass.states.async_set(renamed.entity_id, "on", dict(attributes))
        assert runtime.fan_entity_id == renamed.entity_id
        assert await hass.config_entries.async_unload(configured.entry_id)
        assert not hass.services.has_service("dyson_direction", "set_preset")
        assert await hass.config_entries.async_setup(configured.entry_id)
        assert (
            hass.data["dyson_direction"][configured.entry_id].presets[0]["name"]
            == "Desk"
        )
        await hass.config_entries.async_unload(configured.entry_id)
        await hass.async_stop()
        stored = json.loads((root / ".storage/core.config_entries").read_text())
        saved = next(
            item
            for item in stored["data"]["entries"]
            if item["domain"] == "dyson_direction"
        )
        assert saved["data"]["presets"][0]["name"] == "Desk"
        print(
            "PASS: HA config flow, migration, standalone action, select, source isolation, rename, unload/reload and preset persistence"
        )


asyncio.run(main())
