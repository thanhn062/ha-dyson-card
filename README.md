# HA Dyson Card

<p align="center">
  <img src=".github/images/ha-dyson-card-icon.png" alt="HA Dyson Card" width="180">
</p>

[![Release](https://img.shields.io/github/v/release/thanhn062/ha-dyson-card?style=for-the-badge)](https://github.com/thanhn062/ha-dyson-card/releases)
[![Downloads](https://img.shields.io/github/downloads/thanhn062/ha-dyson-card/total?style=for-the-badge)](https://github.com/thanhn062/ha-dyson-card/releases)
[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg?style=for-the-badge)](https://github.com/thanhn062/ha-dyson-card/blob/main/LICENSE)
[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2024.8.0-blue.svg?style=for-the-badge&logo=home-assistant)](https://www.home-assistant.io/)
[![HACS](https://img.shields.io/badge/HACS-Default-41BDF5.svg?style=for-the-badge)](https://www.hacs.xyz/docs/use/repositories/dashboard/)
[![Validate](https://img.shields.io/github/actions/workflow/status/thanhn062/ha-dyson-card/validate.yaml?branch=main&style=for-the-badge&label=validate)](https://github.com/thanhn062/ha-dyson-card/actions/workflows/validate.yaml)
[![Requires hass_dyson](https://img.shields.io/badge/Requires-hass__dyson-00A3E0.svg?style=for-the-badge)](https://github.com/cmgrayb/hass-dyson)
[![Made with AI](https://img.shields.io/badge/Made%20with-AI-lightgrey?style=for-the-badge)](https://github.com/mefengl/made-by-ai)
[![Commit Messages by AI](https://img.shields.io/badge/Commit%20Messages%20by-AI-green?style=for-the-badge)](https://github.com/mefengl/made-by-ai)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=000000)](https://www.buymeacoffee.com/thanhnatos)

> Check out my other Home Assistant related creations: [Maintenance Tracker](https://github.com/thanhn062/ha-maintenance-tracker)

A sleek Lovelace dashboard card for Dyson fans exposed through [`hass_dyson`](https://github.com/cmgrayb/hass-dyson).

[![Open your Home Assistant instance and open this repository in HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=thanhn062&repository=ha-dyson-card&category=plugin)

I built this because I dislike having to open the Dyson app just to make the fan face a certain direction. This card brings that daily control flow into Home Assistant, next to the rest of the dashboard.

This is a frontend card only. It does not replace the Dyson integration; it uses the fan, climate, switch, select, number, and sensor entities already exposed in Home Assistant.

<p align="center">
  <img src=".github/images/ha-dyson-card-preview.jpg" alt="HA Dyson Card dashboard preview" width="390">
</p>

## Why This Card?

The default Home Assistant entity cards can control a Dyson device, but the experience is scattered across many entities.

HA Dyson Card pulls the useful pieces into one mobile-friendly control surface: direction aiming, sweep presets, airflow speed, power, auto/night mode, heat controls, filter life, and air-quality readings.

The goal is to make the Dyson feel like a polished Home Assistant appliance control instead of a collection of separate toggles and sensors.

## Highlights

- Fully functional Dyson control surface for the main things you would normally open the Dyson app to do
- Save preset directions with a name and icon, then tap once to aim the fan back there
- Mobile-first layout with direction, sweep, airflow, timer, sensor, filter, heat, and mode controls in one card
- Run repeatable fan settings from scripts, NFC tags, schedules, or Stream Deck buttons ([automation examples](#scripts-and-automations))

## Features

### Controls

- Direction wheel with drag-to-aim control
- Sweep dial presets for direct, 45°, 90°, 180°, and wide sweep
- Direction presets with custom name and MDI icon
- Inline airflow speed control with power button by default
- Auto mode, night mode, airflow direction, and sleep timer controls
- Heat, fan-only, and target temperature controls when a climate entity exists
- Optional left or right placement for the power and airflow speed controls

### Live Information

- Compact badges for temperature, humidity, AQI, and filter life
- Expandable air-quality details for AQI, PM2.5, PM10, VOC, and NO2
- AQI color coding when status/value can be mapped
- Same-device entity discovery from the selected Dyson fan entity
- Home Assistant theme-aware light and dark styling

### Direction Presets

Direction presets are for repeatable aiming positions such as `Bed`, `Desk`, or `Door`.

Each preset stores:

- name
- MDI icon
- center direction

Each preset chip displays its saved angle. Tapping it uses the existing Dyson angle controls, preserving the configured sweep width and oscillation state. The fan must be on to recall a saved direction.

Presets are saved in Home Assistant's per-user frontend storage and synchronized across that user's cards and browsers, with a local cache for temporary connection failures. You create your own preset names, icons, and angles in the card. No additional integration or helper is required.

For NFC tags, physical buttons, schedules, and Stream Deck, create a reusable Home Assistant script using the [Scripts and Automations](#scripts-and-automations) examples below.

## Requirements

- Home Assistant 2024.8.0 or newer
- [`hass_dyson`](https://github.com/cmgrayb/hass-dyson) installed and configured
- A Dyson `fan.` entity from `hass_dyson`
- Related Dyson entities attached to the same Home Assistant device for the best experience

## HACS Install

Use the **Open in HACS** button near the top of this page, or install it manually from the default HACS catalog:

1. HACS -> `Dashboard`
2. Search for `HA Dyson Card`
3. Install `HA Dyson Card`
4. Refresh or reopen Home Assistant so the dashboard resource is loaded

HACS installs dashboard cards under `www/community/` and serves them through `/hacsfiles/`.

## Quick Start

Add the card to a dashboard:

```yaml
type: custom:ha-dyson-card
entity: fan.my_dyson
```

Optional configuration:

```yaml
type: custom:ha-dyson-card
entity: fan.my_dyson
title: Bedroom Dyson
airflow_control_side: inline
```

## Configuration

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `entity` | string | required | Dyson `fan.` entity from `hass_dyson`. |
| `title` | string | empty | Optional card title. Empty titles do not render a header. |
| `airflow_control_side` | `inline`, `left`, or `right` | `inline` | Places power and fan speed in a horizontal panel below the wheel, or vertically on its left or right side. |
| `language` | string | auto | Optional UI language override (`en`, `de`, or `fr`). If omitted, the card follows the Home Assistant/frontend locale. |
| `hide_unsupported` | boolean | `false` | Hides controls and info chips that are unavailable on the selected device instead of showing them as disabled/empty. |
| `hide_empty_sensors` | boolean | `false` | Hides sensor badges with empty values (`unknown`, `unavailable`, or missing values). |
| `sensor_more_button_threshold` | number | `4` | Shows the More/Less sensor toggle only when the visible sensor item count is greater than this value. |
| `sensor_detail_layout` | `inline` or `panel` | `inline` | Forces where sensor details are rendered: inline in the top strip or in the details panel.

Example with both cleanup options enabled:

```yaml
type: custom:ha-dyson-card
entity: fan.purifier_cool_wohnung
title: Purifier Wohnung
airflow_control_side: right
language: de
hide_unsupported: true
hide_empty_sensors: true
sensor_more_button_threshold: 5
sensor_detail_layout: inline
```

## Control Mapping

| Control | Entity or service |
| --- | --- |
| Power | `fan.turn_on`, `fan.turn_off` |
| Auto | `fan.set_preset_mode` |
| Night | same-device night mode `switch.` |
| Airflow direction | `fan.set_direction` |
| Airflow speed | `fan.set_percentage` |
| Sleep timer | `hass_dyson.set_sleep_timer` |
| Direction wheel | `hass_dyson.set_oscillation_angles` or oscillation number entities |
| Sweep dial | oscillation select entity or angle services |
| Saved direction preset | Existing `hass_dyson.set_oscillation_angles` and `fan.oscillate` actions |
| Heat / Fan only | `climate.set_hvac_mode` |
| Target temperature | `climate.set_temperature` |

## Scripts and Automations

Use a Home Assistant script to make an aiming position available to automations, NFC tags, physical buttons, voice routines, and Stream Deck. Once configured, these run through Home Assistant even when the dashboard is closed.

Card presets and Home Assistant scripts are configured separately. The card saves each user's preset names and angles in frontend storage; those names do not automatically become callable Home Assistant actions. Use the angle shown on a saved chip as a reference when setting up your script.

### Create a reusable script

In **Settings → Automations & scenes → Scripts**, create a script and open **Edit in YAML**. Paste this example, replacing `fan.my_dyson` and `YOUR_DYSON_DEVICE_ID` with your own device values:

```yaml
alias: Dyson reading chair
mode: single
sequence:
  - action: fan.turn_on
    target:
      entity_id: fan.my_dyson
  - action: hass_dyson.set_oscillation_angles
    data:
      device_id: YOUR_DYSON_DEVICE_ID
      lower_angle: 90
      upper_angle: 180
  - action: fan.oscillate
    target:
      entity_id: fan.my_dyson
    data:
      oscillating: true
```

This example turns the fan on and selects a **90° sweep centered at 135°**. It explicitly enables oscillation. Adjust the lower and upper angles for your location: their difference is the sweep width, and their midpoint is the center direction. Both angles must be between 0° and 350°, with the lower angle no greater than the upper angle. The script sets its own range and oscillation state each time it runs.

To find the device ID, open **Developer tools → Actions**, select **Dyson: Set oscillation angles**, choose your Dyson device, and switch to YAML to copy the `device_id`. Use the fan entity belonging to that same device.

Save the script and check its entity ID. The examples below use `script.dyson_reading_chair`; replace it if Home Assistant assigned a different ID. Run it once to check the chosen angle range before connecting a trigger.

### Run it from an automation or button

Use **Scripts: Turn on** and select your script. The same action can be used by a schedule, a physical button automation, or another script:

```yaml
action: script.turn_on
target:
  entity_id: script.dyson_reading_chair
```

### Scan an NFC tag

Register a tag in **Settings → Tags** using the Home Assistant Companion app. Create an automation with **Tag scanned** as its trigger and **Scripts: Turn on** as its action:

```yaml
alias: NFC - Dyson reading chair
triggers:
  - trigger: tag
    tag_id: REPLACE_WITH_YOUR_TAG_ID
actions:
  - action: script.turn_on
    target:
      entity_id: script.dyson_reading_chair
mode: single
```

### Use a Stream Deck button

In a Stream Deck plugin that supports Home Assistant action/service calls, configure a button with:

| Setting | Value |
| --- | --- |
| Action / service | `script.turn_on` |
| Target entity | `script.dyson_reading_chair` |

Plugin field names vary. If the plugin uses service data instead of a separate target field, use `{"entity_id": "script.dyson_reading_chair"}`. The button runs the same script as your NFC tag and automations, so you only need to update the script when you change the desired settings.

See Home Assistant's official [script](https://www.home-assistant.io/integrations/script/) and [NFC tag](https://www.home-assistant.io/integrations/tag/) documentation for additional triggers and setup options.

## Sensors

The default badge row shows the values most useful at a glance:

| Badge | Meaning |
| --- | --- |
| Temperature | Ambient temperature reported by the Dyson device. |
| Humidity | Ambient relative humidity. |
| AQI | Air Quality Index or category exposed by the integration. |
| Filter life | Lowest remaining HEPA/carbon percentage. Icon: amber at ≤20%, red at 0%; normal and unavailable readings stay neutral. |

The `More` section expands air-quality details when matching sensors exist:

| Detail | Meaning |
| --- | --- |
| AQI | Air Quality Index. Higher values or worse categories usually mean poorer air quality. |
| PM2.5 | Fine particulate matter around 2.5 microns. |
| PM10 | Larger particulate matter around 10 microns. |
| VOC | Volatile Organic Compounds from sources like cooking, cleaning products, smoke, or materials. |
| NO2 | Nitrogen dioxide, commonly associated with combustion sources. |

## Model Compatibility

The card adapts to the entities exposed by `hass_dyson`; it is not hard-coded to one Dyson model.

- Purifier-only models can use fan, speed, direction, sweep, sensor, filter, auto, and night controls when those entities exist.
- Heater models can also show heat, fan-only, and target temperature controls when a climate entity exists.
- Models without reverse airflow, heat, sleep timer, or specific air-quality sensors will have those controls hidden or disabled.

## Manual Install

Download `ha-dyson-card.js` and place it in:

```text
config/www/community/ha-dyson-card/ha-dyson-card.js
```

Then add this dashboard resource:

```text
/local/community/ha-dyson-card/ha-dyson-card.js
```

Resource type:

```text
JavaScript module
```

## Troubleshooting

### The card does not appear in the card picker

Refresh or reopen Home Assistant after installing the dashboard resource. If it still does not appear, use a Manual card with `type: custom:ha-dyson-card`.

### HACS installed it, but the browser still shows an old version

Hard refresh the Home Assistant frontend. If you manually edited the file under `www/community`, remove the generated `.gz` copy so Home Assistant serves the updated JavaScript.

### Controls are missing

Check that the missing feature is exposed by `hass_dyson` as an entity or supported fan/climate feature. The card hides or disables controls that cannot be safely mapped.

### Direction or sweep behaves differently than expected

Dyson models and `hass_dyson` entity sets vary. The card prefers same-device oscillation select/number entities when available and falls back to `hass_dyson.set_oscillation_angles` for angle commands.

## Development

Run the syntax check locally:

```bash
node --check ha-dyson-card.js
```

The GitHub workflow runs:

- HACS plugin validation
- JavaScript syntax validation on Node 24

## Credits

- Built for [`hass_dyson`](https://github.com/cmgrayb/hass-dyson)
- Distributed as a HACS Dashboard/plugin repository

## Disclaimer

This project was built with Codex, with me serving as project manager and overseeing the direction, review, and iteration process throughout.

## License

Apache-2.0
