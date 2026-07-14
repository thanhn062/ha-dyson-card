# Changelog

## Unreleased

- Fix Auto mode toggle by resolving preset mode values case-insensitively and using a safe non-Auto fallback when disabling Auto.
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
