# Changelog

## Unreleased

### Fixed

- Saved direction buttons work with the standard Dyson integration, without an additional preset helper.
- Ignore stale preset entities left behind by integration updates.
- Stationary recalls let the fan move before stopping, while preserving the configured sweep width and oscillation state.

### Improved

- Read current fan settings when a saved direction is tapped and wait for the reported angle state before completing the recall.
- Keep saved directions in the card's existing synchronized Home Assistant user storage.

## 0.2.1 - 2026-10-09

### Added

- A native direction-preset companion for `hass_dyson` 0.38.0, providing saved-center buttons, a preset select entity, and the **Set Direction Preset** automation action.
- A companion installer with a compatibility check, file validation, and backups.

### Fixed

- Provided the missing backend extension required for native saved-angle recalls and the preset action advertised by v0.2.0.

### Compatibility

- The companion is installed separately from the HACS frontend and supports upstream `hass_dyson` 0.38.0. Integration updates or re-downloads can replace it; the installer rejects unverified versions.

## 0.2.0 - 2026-10-07

### Added

- Native direction presets for Home Assistant automations when supported by the installed `hass_dyson` integration.
- A live direction readout in the center of the sweep dial.
- Saved angles on direction preset buttons.
- A clear disconnected state that disables the card while the Dyson is unavailable.
- Inline, left, and right layouts for the combined power and fan-speed controls. Inline is the new default.

### Improved

- Direction presets now move the center of the current sweep without changing its width or turning oscillation on or off.
- Direction dragging is more reliable on touchscreens and no longer scrolls the surrounding popup during a drag.
- The direct-mode indicator follows the selected direction and stays behind the numbered dial and preset markers.
- The active power button is easier to distinguish while the remaining card icons keep their original colors.
- Sensor details now use the inline layout by default.
- Sleep-timer shortcuts are now 1h, 2h, and 3h.

### Fixed

- Prevented Home Assistant state updates from interrupting an active direction drag and snapping the handle back.
- Corrected the stacking order of the direction line, current handle, and saved preset markers.
- Removed the misleading close icon from the preset deletion confirmation state.

### Changed

- Removed the per-preset YAML copy button. Native Home Assistant actions can now recall a saved direction by name when the installed `hass_dyson` integration provides direction-preset support.
- Existing card presets migrate to the native direction-preset entity when it becomes available. The previous Home Assistant user-storage method remains available as a fallback.

### Compatibility

- The card still works with standard `hass_dyson` installations. Native preset entities and the **Set Direction Preset** action require a `hass_dyson` version that provides those features.
- On systems with multiple Dysons, the named-preset action may show presets from more than one device. Use Home Assistant's **Select option** action with the target device's direction-preset entity for a strictly device-specific list.

## 0.1.7 - 2026-09-29

- Sync direction presets through Home Assistant's per-user frontend storage so they follow the same user across phones, tablets, wall panels, and browsers.
- Automatically migrate existing browser-only presets when Home Assistant has no stored copy, while retaining `localStorage` as a fast cache and failure fallback.
- Subscribe to preset storage updates so changes from another active session appear without reloading the dashboard.

## 0.1.6 - 2026-09-29

- Let inline sensor badges wrap across rows instead of forcing every badge into a clipped horizontal strip.
- Keep collapsed panel sensor details horizontally scrollable while using safe centering so content on the left remains reachable.
- Add regression coverage for inline wrapping and run the regression suite in GitHub Actions.

## 0.1.5 - 2026-09-28

- Discover Dyson companion entities from stable `unique_id` and `translation_key` registry fields before falling back to localized names, restoring humidity, air-quality, filter, night-mode, oscillation, and sleep-timer controls on non-English Home Assistant installations.
- Match fallback hints against each registry field independently so adjacent fields cannot create false matches, including the total oscillation angle incorrectly resolving to the low-angle entity.
- Keep `hide_unsupported` and `hide_empty_sensors` independent instead of making the former silently hide empty sensor badges.
- Apply narrow-layout rules using the card container width rather than the browser viewport, fixing overflow in narrow dashboard columns.

## 0.1.4 - 2026-08-30

- Add a full French (`fr`) translation of the card UI and of the visual editor, selectable via the `language` option or picked up automatically from the Home Assistant/browser locale.
- Route the remaining hardcoded English strings through the translation layer: sleep timer `Off` label, direction preset name/icon inputs, airflow direction toggle, sweep preset dial, target temperature controls, and the device-resolving helper text.

## 0.1.3 - 2026-08-12

- Add `hide_unsupported` card option to fully hide unavailable controls and info sections instead of only disabling them.
- Add `hide_empty_sensors` card option to hide sensor badges when values are missing, `unknown`, or `unavailable`.
- Improve same-device entity discovery to better match localized (for example German) Dyson entities for night mode, oscillation controls, and sleep timer helpers.
- Normalize hint matching across entity id, entity name, and original name to make detection more robust across naming styles.
- Guard sleep timer actions behind detected timer availability to avoid showing or invoking timer controls on unsupported devices.
- Document the new configuration options in the README with an updated YAML example.

## 0.1.2 - 2026-05-09

- Show saved direction presets as icon markers on the direction wheel.
- Align preset markers and the draggable direction handle to the outer wheel radius.
- Refresh the README preview image with the current direction preset UI.

## 0.1.1 - 2026-05-07

- Move the airflow speed percentage out of the vertical slider rail and place it between the slider and power button.
- Reduce the direction wheel headroom below the sensor badges for a tighter mobile layout.
- Refresh README wording, related-project links, and transparent icon artwork.

## 0.1.0 - 2026-05-07

- Prepare the dashboard card repository for HACS custom repository use.
- Document HACS Dashboard installation, manual installation, quick-start YAML, controls, sensors, entity discovery, compatibility, and troubleshooting.
- Add HACS-style README badges and repository artwork.
- Add `content_in_root` to `hacs.json`.
- Run HACS validation on a daily schedule in addition to push and pull request events.
- Remove the stale `show_debug` editor option from the production card config form.
- Remove the default oscillation width setting and add a right/left airflow control side option.
- Document that direction presets are saved in browser `localStorage` with direction only.
- Remove sweep width and airflow speed from direction preset save/apply behavior.
