# Native direction-preset companion

This is the legacy 0.2.1 patch. For new installations and upgrades, use the independent [Dyson Direction Presets helper](../custom_components/dyson_direction/README.md), which does not modify upstream integration files. Keep this patch only until your presets and automations have been migrated.

This extension adds native saved-direction support to **hass_dyson 0.38.0**:

- A `select.*_direction_preset` entity with your saved names and center angles.
- **Set Direction Preset** (`hass_dyson.set_direction_preset`) for recalling a saved center while preserving sweep width and oscillation state.
- **Manage Saved Presets (advanced)** for saving the complete preset list.
- A saved-name dropdown in Home Assistant's action editor.

For a stationary fan, recall briefly starts point-aim movement, waits for the turn, then restores the stationary state and configured sweep width. An already oscillating fan keeps oscillating around the new center. Near the 0°/350° limits, the range shifts as needed to retain its width.

## Install

Install and configure upstream [hass_dyson 0.38.0](https://github.com/cmgrayb/hass-dyson/releases/tag/v0.38.0) first. Download and extract the companion archive attached to the card release. In Home Assistant's Terminal & SSH app, change into the extracted companion directory and run:

```sh
python3 install.py --check /config/custom_components/hass_dyson
python3 install.py /config/custom_components/hass_dyson
ha core check
ha core restart
```

The first command only checks compatibility. The installer validates every affected file before writing, backs up the original files under `/config/dyson-direction-preset-backups/`, and rejects unsupported versions or other local modifications. Running it again on the same installed extension makes no changes.

After restarting, refresh the dashboard and confirm that **Dyson Direction Preset** is available. The card uses that entity for saved buttons and migrates its existing presets when needed. **Set Direction Preset** should also appear in Home Assistant's action picker.

## Updates and compatibility

Installing this companion is separate from installing the card through HACS. HACS installs the frontend file; it does not install this Python extension.

A hass_dyson update or re-download replaces the extended integration files. If the native select becomes unavailable or the action disappears, check the installed integration version before reinstalling the companion. This package supports upstream **0.38.0 only**; it deliberately refuses other versions until compatibility has been checked. A frontend update cannot restore missing backend actions.

This companion was tested with Home Assistant 2026.10.0 and an advanced-oscillation Dyson fan. Devices without `AdvanceOscillationDay1` support do not receive the native direction-preset entity. With multiple Dysons, the action dropdown combines their saved names; the selected device is validated when the action runs.

The patch extends the MIT-licensed upstream integration. Its license is included in `LICENSE.hass-dyson`.
