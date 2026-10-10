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
  window: { localStorage, setTimeout, clearTimeout },
  navigator: { language: "fr-FR" },
};

vm.createContext(context);
vm.runInContext(source, context, { filename: "ha-dyson-card.js" });

const Card = context.customElements.get("ha-dyson-card");
assert.equal(typeof Card, "function", "card custom element should be registered");

const card = new Card();
card._config = { entity: "fan.purificateur_dyson" };
card.setConfig({ entity: "fan.purificateur_dyson" });
assert.equal(card._config.airflow_control_side, "inline");
assert.equal(card._config.sensor_detail_layout, "inline");
card.setConfig({ entity: "fan.purificateur_dyson", airflow_control_side: "left" });
assert.equal(card._config.airflow_control_side, "left");

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
assert.doesNotMatch(source, /directionPresetEntity: this\._findEntityByRegistryKeys/);
assert.doesNotMatch(source, /"dyson_direction"|set_direction_presets|_backendDirectionPresets/);
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

function movementCard({ lower = 100, upper = 100, oscillating = false, power = "on" } = {}) {
  const card = new Card();
  card._config = { entity: "fan.test" };
  card._derived = { deviceId: "test-device", directionPresetEntity: "select.stale_preset", oscillationCenterEntity: "number.test_center" };
  const fan = { state: power, attributes: { angle_low: lower, angle_high: upper, oscillation_enabled: oscillating, oscillating } };
  const calls = [];
  const delays = [];
  card._hass = {
    states: { "fan.test": fan, "select.stale_preset": { state: "unavailable", attributes: {} } },
    async callService(domain, service, data) {
      calls.push({ domain, service, data });
      if (domain === "hass_dyson") {
        fan.attributes.angle_low = data.lower_angle;
        fan.attributes.angle_high = data.upper_angle;
        fan.attributes.oscillation_enabled = true;
        fan.attributes.oscillating = true;
      } else if (domain === "fan") {
        fan.attributes.oscillation_enabled = data.oscillating;
        fan.attributes.oscillating = data.oscillating;
      } else throw new Error("Unexpected custom preset action");
    },
  };
  card._render = () => {};
  card._setPendingDirection = () => {};
  card._settleDirectionCommand = () => {};
  card._directionDelay = async (milliseconds) => { delays.push(milliseconds); };
  return { card, fan, calls, delays };
}

for (const [span, oscillating] of [[0, false], [90, false], [90, true]]) {
  const { card, fan, calls, delays } = movementCard({ lower: 100 - span / 2, upper: 100 + span / 2, oscillating });
  await card._commitDirection(200, span, { preserveOscillation: true });
  assert.equal(fan.attributes.angle_low, 200 - span / 2);
  assert.equal(fan.attributes.angle_high, 200 + span / 2);
  assert.equal(fan.attributes.oscillation_enabled, oscillating);
  assert.equal(fan.state, "on", "preset recall never changes power");
  assert.equal(card._busy, false);
  assert.equal(calls[0].domain, "hass_dyson", "use stock angles even when a center number and stale select exist");
  if (!oscillating) {
    assert.equal(calls[0].data.lower_angle, 200);
    assert.equal(calls[0].data.upper_angle, 200);
    assert.ok(delays.some((ms) => ms >= 1500), "let the stationary fan move before stopping");
    assert.equal(calls.at(-1).data.oscillating, false);
  } else assert.equal(calls.length, 1, "an active sweep stays active");
}

const off = movementCard({ power: "off" });
await off.card._commitDirection(200, 0, { preserveOscillation: true });
assert.equal(off.calls.length, 0, "a saved button must not start an off fan");

const autoStop = movementCard();
const autoStopService = autoStop.card._hass.callService;
autoStop.card._hass.callService = async (domain, service, data) => {
  await autoStopService(domain, service, data);
  if (domain === "hass_dyson" && data.lower_angle === data.upper_angle) {
    autoStop.fan.attributes.oscillation_enabled = false;
  }
};
await autoStop.card._commitDirection(200, 0, { preserveOscillation: true });
assert.equal(autoStop.fan.attributes.angle_low, 200, "accept firmware that finishes a point move before reporting ON");
assert.equal(autoStop.fan.attributes.oscillation_enabled, false);

const failed = movementCard();
failed.card._waitForDirectionState = async () => { throw new Error("confirmation failed"); };
await assert.rejects(failed.card._commitDirection(200, 0, { preserveOscillation: true }), /confirmation failed/);
assert.equal(failed.calls.at(-1).data.oscillating, false, "stop temporary motion after confirmation failure");
assert.equal(failed.card._busy, false, "failed recalls release controls");

const stale = movementCard();
let polls = 0;
stale.fan.attributes.oscillating = true;
stale.card._directionDelay = async () => {
  polls += 1;
  stale.fan.attributes.angle_low = 200;
  stale.fan.attributes.angle_high = 200;
  stale.fan.attributes.oscillation_enabled = true;
};
await stale.card._waitForDirectionState("fan.test", 200, 200, true);
assert.equal(polls, 1, "optimistic oscillating alone does not confirm a command");

const timeout = movementCard();
let clock = 0;
context.Date = class extends Date { static now() { return clock; } };
timeout.card._directionDelay = async (ms) => { clock += ms; };
await assert.rejects(timeout.card._waitForDirectionState("fan.test", 200, 200, true), /did not confirm/);
assert.equal(clock, 8000, "unconfirmed motion has a bounded timeout");
context.Date = Date;

const overlap = movementCard();
let releaseMove;
overlap.card._directionDelay = () => new Promise((resolve) => { releaseMove = resolve; });
const moving = overlap.card._commitDirection(200, 0, { preserveOscillation: true });
while (!releaseMove) await Promise.resolve();
await overlap.card._commitDirection(250, 0, { preserveOscillation: true });
assert.equal(overlap.calls.length, 1, "a second click cannot interrupt an in-flight recall");
releaseMove();
await moving;

const click = movementCard({ lower: 55, upper: 145 });
let handler;
click.card._directionPresets = () => [{ id: "custom", name: "User's choice", direction: 200 }];
click.card._bindWheel = () => {};
click.card.shadowRoot = {
  querySelector: () => null,
  querySelectorAll: (selector) => selector === "[data-preset-apply]" ? [{ dataset: { presetApply: "custom" }, addEventListener: (_event, callback) => { handler = callback; } }] : [],
};
click.card._bindControls({ angle_low: 100, angle_high: 100 }, "On");
await handler();
assert.equal(click.fan.attributes.angle_high - click.fan.attributes.angle_low, 90, "button reads current settings, not attributes captured at render");
assert.equal(click.calls.some((call) => call.domain === "select"), false, "stale preset selects never receive button calls");

console.log("regressions passed");
