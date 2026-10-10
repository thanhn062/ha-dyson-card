import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../ha-dyson-card.js", import.meta.url), "utf8");
const registry = new Map();
const localValues = new Map();
const localStorage = {
  getItem(key) {
    return localValues.has(key) ? localValues.get(key) : null;
  },
  setItem(key, value) {
    localValues.set(key, String(value));
  },
  removeItem(key) {
    localValues.delete(key);
  },
  clear() {
    localValues.clear();
  },
};
const context = {
  console,
  HTMLElement: class HTMLElement {
    attachShadow() {
      return {};
    }
  },
  customElements: {
    define(name, klass) {
      registry.set(name, klass);
    },
    get(name) {
      return registry.get(name);
    },
  },
  window: { localStorage },
  navigator: { language: "fr-FR" },
};

vm.createContext(context);
vm.runInContext(source, context, { filename: "ha-dyson-card.js" });

const Card = context.customElements.get("ha-dyson-card");
assert.equal(typeof Card, "function", "card custom element should be registered");

const independent = new Card();
independent.setConfig({ entity: "fan.dyson" });
independent._derived = { deviceId: "device-1", directionPresetEntity: "select.old_direction_preset" };
independent._hass = {
  states: {
    "select.other_direction_preset": { state: "Desk", attributes: { preset_domain: "dyson_direction", fan_entity_id: "fan.other" } },
    "select.new_direction_preset": { state: "Bed", attributes: { preset_domain: "dyson_direction", fan_entity_id: "fan.dyson", presets: [{ id: "bed", name: "Bed", direction: 165 }] } },
    "select.old_direction_preset": { state: "unavailable", attributes: {} },
  },
  async callService(domain, service, data) { independentCalls.push({ domain, service, data }); },
};
const independentCalls = [];
assert.equal(independent._directionPresetEntity(), "select.new_direction_preset", "independent integration wins over unavailable legacy and other devices");
assert.equal(independent._directionPresetServiceDomain(), "dyson_direction");
await independent._saveDirectionPresets([{ id: "desk", name: "Desk", direction: 140 }]);
assert.equal(independentCalls[0].domain, "dyson_direction");
assert.equal(independentCalls[0].service, "set_presets");
assert.equal(independentCalls[0].data.device_id, "device-1");
delete independent._hass.states["select.new_direction_preset"];
assert.equal(independent._directionPresetServiceDomain(), "hass_dyson", "legacy integration is still compatible");

const card = new Card();
card._config = { entity: "fan.purificateur_dyson" };
card.setConfig({ entity: "fan.purificateur_dyson" });
assert.equal(card._config.airflow_control_side, "inline");
assert.equal(card._config.sensor_detail_layout, "inline");
card.setConfig({ entity: "fan.purificateur_dyson", airflow_control_side: "left" });
assert.equal(card._config.airflow_control_side, "left");

const presetCommitCard = new Card();
const presetCalls = [];
presetCommitCard._config = { entity: "fan.purificateur_dyson" };
presetCommitCard._derived = {
  deviceId: "dyson-device-1",
  oscillationCenterEntity: "number.purificateur_dyson_angle_centre",
};
presetCommitCard._hass = {
  states: {
    "fan.purificateur_dyson": {
      state: "on",
      attributes: { oscillating: false },
    },
  },
  async callService(domain, service, data) {
    presetCalls.push({ domain, service, data });
  },
};
presetCommitCard._render = () => {};
presetCommitCard._currentDirection = () => 100;
presetCommitCard._currentWidth = () => 45;
presetCommitCard._setPendingDirection = () => {};
presetCommitCard._settleDirectionCommand = () => {};
await presetCommitCard._commitDirection(200, 45, { preserveOscillation: true });
assert.deepEqual(
  JSON.parse(JSON.stringify(presetCalls)),
  [
    {
      domain: "number",
      service: "set_value",
      data: {
        entity_id: "number.purificateur_dyson_angle_centre",
        value: 200,
      },
    },
    {
      domain: "fan",
      service: "oscillate",
      data: {
        entity_id: "fan.purificateur_dyson",
        oscillating: false,
      },
    },
  ],
  "applying a named direction should restore the previous oscillation state",
);

const registryData = {
  devices: [{ id: "dyson-device-1", name: "Purificateur Dyson" }],
  entities: [
    { entity_id: "fan.purificateur_dyson", device_id: "dyson-device-1", unique_id: "DYSON123_fan" },
    { entity_id: "sensor.purificateur_dyson_temperature", device_id: "dyson-device-1", unique_id: "DYSON123_temperature", original_name: "Temperature" },
    { entity_id: "sensor.purificateur_dyson_humidite", device_id: "dyson-device-1", unique_id: "DYSON123_humidity", original_name: "Humidite" },
    { entity_id: "sensor.purificateur_dyson_qualite_air", device_id: "dyson-device-1", translation_key: "air_quality_category", original_name: "Qualite de l'air" },
    { entity_id: "sensor.purificateur_dyson_filtre_hepa", device_id: "dyson-device-1", unique_id: "DYSON123_hepa_filter_life", original_name: "Filtre HEPA" },
    { entity_id: "sensor.purificateur_dyson_filtre_carbone", device_id: "dyson-device-1", unique_id: "DYSON123_carbon_filter_life", original_name: "Filtre carbone" },
    { entity_id: "switch.purificateur_dyson_mode_nuit", device_id: "dyson-device-1", unique_id: "DYSON123_night_mode", original_name: "Mode nuit" },
    { entity_id: "select.purificateur_dyson_oscillation", device_id: "dyson-device-1", unique_id: "DYSON123_oscillation", original_name: "Oscillation" },
    { entity_id: "number.purificateur_dyson_angle_bas", device_id: "dyson-device-1", unique_id: "DYSON123_oscillation_low_angle", original_name: "Angle bas" },
    { entity_id: "number.purificateur_dyson_angle_haut", device_id: "dyson-device-1", unique_id: "DYSON123_oscillation_high_angle", original_name: "Angle haut" },
    { entity_id: "number.purificateur_dyson_angle_centre", device_id: "dyson-device-1", unique_id: "DYSON123_oscillation_center_angle", original_name: "Angle centre" },
    { entity_id: "number.purificateur_dyson_angle_oscillation", device_id: "dyson-device-1", unique_id: "DYSON123_oscillation_angle", original_name: "Angle d'oscillation" },
    { entity_id: "number.purificateur_dyson_minuterie", device_id: "dyson-device-1", translation_key: "sleep_timer", original_name: "Minuterie de veille" },
  ],
};

const derived = card._deriveFromRegistry(registryData);
assert.equal(derived.deviceId, "dyson-device-1");
assert.equal(derived.temperatureEntity, "sensor.purificateur_dyson_temperature");
assert.equal(derived.humidityEntity, "sensor.purificateur_dyson_humidite");
assert.equal(derived.airQualityEntity, "sensor.purificateur_dyson_qualite_air");
assert.equal(derived.hepaFilterEntity, "sensor.purificateur_dyson_filtre_hepa");
assert.equal(derived.carbonFilterEntity, "sensor.purificateur_dyson_filtre_carbone");
assert.equal(derived.nightModeEntity, "switch.purificateur_dyson_mode_nuit");
assert.equal(derived.oscillationSelectEntity, "select.purificateur_dyson_oscillation");
assert.equal(derived.oscillationLowEntity, "number.purificateur_dyson_angle_bas");
assert.equal(derived.oscillationHighEntity, "number.purificateur_dyson_angle_haut");
assert.equal(derived.oscillationCenterEntity, "number.purificateur_dyson_angle_centre");
assert.equal(derived.oscillationSpanEntity, "number.purificateur_dyson_angle_oscillation");
assert.equal(derived.sleepTimerEntity, "number.purificateur_dyson_minuterie");
assert.notEqual(derived.oscillationSpanEntity, derived.oscillationLowEntity);

assert.match(source, /const hideEmptyData = hideEmptySensors;/);
assert.doesNotMatch(source, /const hideEmptyData = hideUnsupported \|\| hideEmptySensors;/);
assert.match(source, /container-type:\s*inline-size;/);
assert.match(source, /@container \(max-width: 520px\)/);
assert.doesNotMatch(source, /@media \(max-width: 520px\)/);
assert.match(source, /wheel-sensor-strip sensor-layout-\$\{sensorDetailLayout\}/);
assert.match(source, /\.wheel-sensor-strip:not\(\.expanded\):not\(\.sensor-layout-inline\)/);
assert.match(source, /justify-content:\s*safe center;/);
assert.doesNotMatch(source, /\.wheel-sensor-strip:not\(\.expanded\)\s*\{/);
assert.match(source, /--dyson-wheel-size:\s*min\(calc\(100% - var\(--dyson-speed-gutter\) - var\(--dyson-speed-gutter\)\), 304px\)/);
assert.match(source, /--dyson-speed-gutter:\s*42px/);
assert.match(source, /airflow_control_side:\s*"inline"/);
assert.match(source, /value:\s*"inline"[\s\S]*?label:/);
assert.match(source, /wheel-wrap airflow-control-\$\{airflowControlPosition\}/);
assert.match(source, /\.wheel-wrap\.airflow-control-inline \.wheel-speed/);
assert.match(source, /speedControl\.closest\("\.airflow-control-inline"\)/);
assert.match(source, /\{ preserveOscillation = false \} = \{\}/);
assert.match(source, /\{ preserveOscillation: true \}/);
assert.match(source, /oscillating:\s*previousOscillation/);
assert.match(source, /margin:\s*var\(--dyson-wheel-offset\) auto 0/);
assert.match(source, /class="wheel-direction-center"/);
assert.match(source, /class="wheel-direction-line-overlay"/);
assert.match(source, /class="wheel-direction-handle-overlay"/);
assert.match(source, /\.wheel-direction-line-overlay\s*\{[\s\S]*?z-index:\s*2;/);
assert.match(source, /\.wheel-center-info\s*\{[\s\S]*?z-index:\s*3;/);
assert.match(source, /\.wheel-direction-handle-overlay\s*\{[\s\S]*?z-index:\s*4;/);
assert.equal((source.match(/class="wheel-handle"/g) || []).length, 1);
assert.match(source, /\.wheel-preset-marker\s*\{[\s\S]*?z-index:\s*5;/);
assert.match(source, /\.sweep-dial\s*\{[\s\S]*?background:\s*color-mix\(in srgb, var\(--dyson-raised-bg\) 84%, transparent\);/);
assert.match(source, /const centerLineEnd = this\._pointForAngle\(160, 160, 115, visualCenter\)/);
assert.match(source, /const centerLineStart = this\._pointForAngle\(160, 160, 82, visualCenter\)/);
assert.match(source, /class="wheel-direction-center" x1="\$\{centerLineStart\.x\}" y1="\$\{centerLineStart\.y\}"/);
assert.match(source, /centerLine\.setAttribute\("x1", String\(centerLineStart\.x\)\)/);
assert.match(source, /centerLine\.setAttribute\("y1", String\(centerLineStart\.y\)\)/);
assert.match(source, /centerLine\.setAttribute\("x2", String\(centerLineEnd\.x\)\)/);
assert.match(source, /centerLine\.style\.display = "none"/);
assert.match(source, /bounds\.width === 0 \? "" : "display:none;"/);
assert.doesNotMatch(source, /wheel-zero-reference|wheel-zero-label|>0°</);
assert.match(source, /if \(this\._draggingDial\) \{[\s\S]*?this\._renderPendingAfterDrag = true;[\s\S]*?return;/);
assert.match(source, /handleTarget\.addEventListener\("pointerdown",[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);/);
assert.match(source, /handleTarget\.addEventListener\("pointermove",[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);/);
assert.match(source, /handleTarget\.addEventListener\("pointercancel",[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);/);
assert.match(source, /handleTarget\.addEventListener\("lostpointercapture",[\s\S]*?this\._draggingDial = false;[\s\S]*?this\._render\(\);/);
assert.match(source, /\.wheel-handle-hit\s*\{[\s\S]*?width:\s*72px;[\s\S]*?height:\s*72px;[\s\S]*?touch-action:\s*none;/);
assert.match(source, /const fanAvailable = !\["unknown", "unavailable"\]/);
assert.match(source, /class="unavailable-banner"/);
assert.doesNotMatch(source, /data-preset-automation|direction-preset-automation|content-copy/);
assert.match(source, /directionPresetEntity: this\._findEntityByRegistryKeys/);
assert.match(source, /callService\("select", "select_option", \{[\s\S]*?entity_id: directionPresetEntity,[\s\S]*?option: preset\.name/);
assert.match(source, /domain === "dyson_direction" \? "set_presets" : "set_direction_presets"/);
assert.match(source, /class="wheel-direction-value"/);
assert.match(source, /directionValue\.textContent = `\$\{bounds\.center\}\\u00b0`/);
assert.match(source, /\.wheel-preset-marker\s*\{[\s\S]*?color:\s*white;/);
assert.match(source, /\.speed-power-button\.active ha-icon\s*\{[\s\S]*?color:\s*#000;/);
assert.match(source, /\$\{confirmingDelete \? "" : `\s*<button class="direction-preset-remove"/);
assert.doesNotMatch(source, /this\._pendingPresetDeleteId === button\.dataset\.presetRemove[\s\S]*?_removeDirectionPreset/);
assert.match(source, /querySelectorAll\("\[data-preset-remove\]"\)[\s\S]*?this\._pendingPresetDeleteId = button\.dataset\.presetRemove;/);
assert.match(source, /querySelector\("\.card"\)[\s\S]*?_clearPresetDeleteArm\(\)[\s\S]*?this\._render\(\);/);
assert.match(source, /_renderTimerButton\(180, "3h", activeTimer\)/);
assert.doesNotMatch(source, /_renderTimerButton\(240, "4h", activeTimer\)/);

const dragRenderCard = new Card();
dragRenderCard.shadowRoot = { innerHTML: "drag-preview" };
dragRenderCard._draggingDial = true;
dragRenderCard._render();
assert.equal(dragRenderCard.shadowRoot.innerHTML, "drag-preview", "HA updates must not replace the active drag DOM");
assert.equal(dragRenderCard._renderPendingAfterDrag, true, "a suppressed drag render should be replayed after release");

const syncCard = new Card();
syncCard._config = { entity: "fan.synced_dyson" };
const syncKey = syncCard._presetStorageKey();
localStorage.setItem(syncKey, JSON.stringify([
  { id: "local-bed", name: "Bed", icon: "mdi:bed", direction: 42 },
]));

let serverValue = null;
let subscriptionCallback = null;
let subscriptionClosed = false;
const syncCalls = [];
syncCard._hass = {
  async callWS(message) {
    syncCalls.push(message);
    if (message.type === "frontend/get_user_data") {
      return { value: serverValue };
    }
    if (message.type === "frontend/set_user_data") {
      serverValue = message.value;
      if (subscriptionCallback) subscriptionCallback({ value: serverValue });
      return null;
    }
    throw new Error(`Unexpected message type: ${message.type}`);
  },
  connection: {
    async subscribeMessage(callback, message) {
      assert.equal(message.type, "frontend/subscribe_user_data");
      assert.equal(message.key, syncKey);
      subscriptionCallback = callback;
      callback({ value: serverValue });
      return () => {
        subscriptionClosed = true;
      };
    },
  },
};

await syncCard._ensureDirectionPresets();
assert.equal(serverValue.version, 1, "local migration should write a versioned HA payload");
assert.deepEqual(JSON.parse(JSON.stringify(serverValue.presets)), [
  { id: "local-bed", name: "Bed", icon: "mdi:bed", direction: 40 },
]);
assert.equal(syncCalls.filter((call) => call.type === "frontend/set_user_data").length, 1);
assert.equal(syncCard._directionPresets()[0].name, "Bed");

await syncCard._addDirectionPreset("Desk", "mdi:desk", 91);
assert.equal(serverValue.presets.length, 2, "adding a preset should persist to HA storage");
assert.equal(serverValue.presets[1].name, "Desk");
assert.equal(serverValue.presets[1].direction, 90);

subscriptionCallback({
  value: {
    version: 1,
    presets: [{ id: "remote-sofa", name: "Sofa", icon: "mdi:sofa", direction: 181 }],
  },
});
assert.deepEqual(JSON.parse(JSON.stringify(syncCard._directionPresets())), [
  { id: "remote-sofa", name: "Sofa", icon: "mdi:sofa", direction: 180 },
]);
assert.equal(JSON.parse(localStorage.getItem(syncKey))[0].name, "Sofa", "subscription updates should refresh the local cache");

syncCard.disconnectedCallback();
assert.equal(subscriptionClosed, true, "disconnecting the card should release the HA subscription");

const serverWinsCard = new Card();
serverWinsCard._config = { entity: "fan.server_wins" };
const serverWinsKey = serverWinsCard._presetStorageKey();
localStorage.setItem(serverWinsKey, JSON.stringify([
  { id: "stale-local", name: "Stale", icon: "mdi:history", direction: 10 },
]));
let serverWinsWriteCount = 0;
serverWinsCard._hass = {
  async callWS(message) {
    if (message.type === "frontend/get_user_data") {
      return {
        value: {
          version: 1,
          presets: [{ id: "server-chair", name: "Chair", icon: "mdi:chair-rolling", direction: 275 }],
        },
      };
    }
    if (message.type === "frontend/set_user_data") {
      serverWinsWriteCount += 1;
      return null;
    }
    throw new Error(`Unexpected message type: ${message.type}`);
  },
};
await serverWinsCard._ensureDirectionPresets();
assert.equal(serverWinsWriteCount, 0, "an existing HA value should not be overwritten during hydration");
assert.deepEqual(JSON.parse(JSON.stringify(serverWinsCard._directionPresets())), [
  { id: "server-chair", name: "Chair", icon: "mdi:chair-rolling", direction: 275 },
]);
assert.equal(JSON.parse(localStorage.getItem(serverWinsKey))[0].name, "Chair", "the server value should refresh stale local data");

const recoveryCard = new Card();
recoveryCard._config = { entity: "fan.pending_recovery" };
const recoveryKey = recoveryCard._presetStorageKey();
const oldServerValue = {
  version: 1,
  presets: [{ id: "old-server", name: "Old", icon: "mdi:history", direction: 20 }],
};
recoveryCard._hass = {
  async callWS(message) {
    if (message.type === "frontend/get_user_data") return { value: oldServerValue };
    if (message.type === "frontend/set_user_data") throw new Error("temporary write failure");
    throw new Error(`Unexpected message type: ${message.type}`);
  },
};
await recoveryCard._ensureDirectionPresets();
const failedSave = await recoveryCard._saveDirectionPresets([
  { id: "new-local", name: "New", icon: "mdi:sync-alert", direction: 205 },
]);
assert.equal(failedSave, false);
assert.equal(localStorage.getItem(`${recoveryKey}:pending-sync`), "1", "a failed server write should leave a durable retry marker");

let recoveredServerValue = oldServerValue;
const reloadedRecoveryCard = new Card();
reloadedRecoveryCard._config = { entity: "fan.pending_recovery" };
reloadedRecoveryCard._hass = {
  async callWS(message) {
    if (message.type === "frontend/get_user_data") return { value: recoveredServerValue };
    if (message.type === "frontend/set_user_data") {
      recoveredServerValue = message.value;
      return null;
    }
    throw new Error(`Unexpected message type: ${message.type}`);
  },
};
await reloadedRecoveryCard._ensureDirectionPresets();
assert.equal(recoveredServerValue.presets[0].name, "New", "a pending local change should recover over stale server data");
assert.equal(localStorage.getItem(`${recoveryKey}:pending-sync`), null, "successful recovery should clear the retry marker");

const fallbackCard = new Card();
fallbackCard._config = { entity: "fan.local_fallback" };
const fallbackKey = fallbackCard._presetStorageKey();
localStorage.setItem(fallbackKey, JSON.stringify([
  { id: "fallback-door", name: "Door", icon: "mdi:door", direction: 135 },
]));
fallbackCard._hass = {
  async callWS() {
    throw new Error("HA storage unavailable");
  },
};
await fallbackCard._ensureDirectionPresets();
assert.equal(fallbackCard._directionPresets()[0].name, "Door", "local presets should remain usable after a HA storage failure");

console.log("regressions passed");
