# Dyson Direction Presets

An independent Home Assistant helper for saved Dyson center angles. It adds a native preset select and the `dyson_direction.set_preset` action without modifying `hass_dyson`.

## Installation

Requirements: Home Assistant 2026.10.0 or newer, HA Dyson Card 0.3.0 or newer for automatic discovery, and a configured `hass_dyson` fan with advanced angle controls and the standard **Set Oscillation Angles** action. The helper can also be used without the card through its actions and select entity. Compatibility is tested against the public controls exposed by `hass_dyson` 0.38.0.

Download and extract the standalone helper ZIP from the card release. In Terminal & SSH, change into the extracted directory and run:

```sh
python3 tools/install_direction.py --check /config
python3 tools/install_direction.py /config
ha core check
ha core restart
```

Then open **Settings → Devices & services → Add integration → Dyson Direction Presets**, choose your Dyson fan, and refresh the dashboard. Repeat setup for each fan you want to use. Manual installation is also supported: copy the included `custom_components/dyson_direction` folder into your Home Assistant `custom_components` directory, then restart Core and add the integration.

The installer writes only the helper's own directory and backs up an existing helper before updating it. It does not edit the upstream Dyson integration or your Home Assistant configuration files.

## Actions and behavior

```yaml
action: dyson_direction.set_preset
data:
  device_id: YOUR_DYSON_DEVICE_ID
  preset: Bed
```

The preset name is case-insensitive. The action editor offers the saved names in a dropdown. With multiple fans, that dropdown combines names; the selected device is validated when the action runs. For a device-specific list, use `select.select_option` on the helper's preset select.

Recalling a preset preserves sweep width and whether oscillation is enabled. A stationary fan briefly turns toward the saved center, then stops; a fan already oscillating keeps its sweep around the new center. Recalls for the same fan run sequentially. The fan must be on, and recall does not change its power or speed. Near the 0°/350° limits, the range shifts to preserve its width, so not every center is possible with every width.

The card automatically prefers this helper over the old patched integration and saves changes using `dyson_direction.set_presets`. Presets belong to this helper's own config entry, independent of the upstream Dyson integration files.

## Migrating from 0.2.1

On first setup, the helper imports presets stored by the old companion. If presets were saved only in the card, opening the updated card migrates its existing saved list to the helper.

Existing automations using `hass_dyson.set_direction_preset` must change their action to `dyson_direction.set_preset`. Existing calls to the old preset select must target the new helper select, or use the new named action. Those action names are not automatically rewritten by installation.

Confirm your saved buttons and migrated automations work before removing the old patch. A HACS re-download of upstream `hass_dyson` restores its stock files and leaves this helper directory and its saved presets untouched. Back up configuration before a re-download if you have other local Dyson modifications.

## Updates

Updating or re-downloading **hass_dyson** no longer overwrites this helper's files or saved presets. Reinstalling the old 0.2.1 patch is unnecessary. Future upstream changes to the standard angle action, reported angle attributes, or oscillation controls may still require a compatibility update to this helper.
