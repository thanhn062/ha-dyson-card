import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

let Card;
const storage = new Map();
const context = vm.createContext({
  HTMLElement: class { attachShadow() { return {}; } dispatchEvent() {} },
  CustomEvent: class {}, console,
  customElements: { define(name, klass) { if (name === "ha-dyson-card") Card = klass; } },
  window: { localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) }, setTimeout, clearTimeout },
  navigator: { language: "en-US" },
});
vm.runInContext(fs.readFileSync(new URL("../ha-dyson-card.js", import.meta.url), "utf8"), context);
const plain = (value) => JSON.parse(JSON.stringify(value));
const presets = [{ id: "bed-id", name: "Bed", direction: 165, icon: "mdi:bed" }];
function setup(user = "user1", device = "device1") {
  const card = new Card();
  card._config = { entity: "fan.dyson" };
  card._derived = { deviceId: device, oscillationSelectEntity: "select.dyson_sweep" };
  card._hass = { user: { id: user, is_admin: true }, states: { "fan.dyson": { state: "on", attributes: { friendly_name: "Dyson Bedroom" } } } };
  card._directionPresets = () => presets;
  card._render = () => {};
  card._showToast = () => {};
  return card;
}
const card = setup();
const config = plain(card._buildDirectionScript());
assert.equal(config.mode, "queued");
assert.equal(config.fields.sweep.required, true);
assert.equal(config.fields.sweep.default, "preserve");
assert.deepEqual(config.fields.preset.selector.select.options, [{ label: "Bed", value: "bed-id" }]);
assert.equal(config.fields.sweep.selector.select.options.length, 6);
assert.doesNotMatch(JSON.stringify(config), /dyson_direction\.(set_preset|set_presets)/);
assert.notEqual(card._directionScriptIdentity().key, setup("other")._directionScriptIdentity().key);
assert.notEqual(card._directionScriptIdentity().key, setup("user1", "other")._directionScriptIdentity().key);

let saved;
let writes = 0;
card._hass.callApi = async (method, path, body) => {
  assert.equal(path, `config/script/config/${card._directionScriptIdentity().key}`);
  if (method === "GET") {
    if (!saved) throw { status_code: 404 };
    return plain(saved);
  }
  assert.equal(method, "POST");
  saved = plain(body); writes++;
};
assert.equal(await card._syncDirectionScript(), false, "loading the card must not create scripts");
await card._syncDirectionScript({ create: true });
assert.equal(writes, 1);
await card._syncDirectionScript({ create: true });
assert.equal(writes, 1, "unchanged scripts must not reload all HA scripts");
const renamed = [{ ...presets[0], name: "Reading couch", direction: 140 }];
await card._syncDirectionScript({ presets: renamed });
assert.equal(writes, 2);
assert.deepEqual(saved.fields.preset.selector.select.options, [{ label: "Reading couch", value: "bed-id" }]);
await card._syncDirectionScript({ presets: [] });
assert.deepEqual(saved.fields.preset.selector.select.options, [], "deleting the last preset invalidates old calls without deleting the script");
card._hass.callWS = async () => ({ value: { presets: renamed } });
await card._syncDirectionScript({ presets });
assert.equal(saved.fields.preset.selector.select.options[0].label, "Reading couch", "another browser's newer saved data wins over a queued stale snapshot");
delete card._hass.callWS;
saved.description = "My unrelated script";
await assert.rejects(card._syncDirectionScript({ create: true }), /left unchanged/);
assert.equal(writes, 4, "never overwrite another script");
card._hass.callApi = async () => { throw { status_code: 403 }; };
await assert.rejects(card._syncDirectionScript({ create: true }));
card._hass.user.is_admin = false;
assert.equal(await card._syncDirectionScript(), false);
await assert.rejects(card._syncDirectionScript({ create: true }), /administrator/);
assert.doesNotMatch(card._renderDirectionPresets(165, 45, true), /data-create-direction-script/);

const bound = setup();
let handler;
let clicks = 0;
bound.shadowRoot = {
  querySelector: (selector) => selector === "[data-create-direction-script]" ? { addEventListener: (_type, callback) => { handler = callback; } } : null,
  querySelectorAll: () => [],
};
bound._createDirectionScript = async () => { clicks++; };
bound._bindControls({}, "On");
handler();
assert.equal(clicks, 1, "the rendered button must invoke script creation");

const failure = setup();
failure._hass.callApi = async () => { throw { status_code: 503 }; };
await failure._refreshManagedDirectionScript(presets);
assert.match(failure._directionScriptSyncError, /out of sync/);
assert.equal(storage.size, 0, "script sync failure must not alter saved preset storage");

const snapshot = setup();
const fixture = {
  normal: plain(snapshot._buildDirectionScript()),
  empty: plain(snapshot._buildDirectionScript([])),
  hostile: plain(snapshot._buildDirectionScript([{ ...presets[0], name: '{{ 7 * 7 }} "quoted"', id: "{{ 8 * 8 }}" }])),
};
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(fixture));
console.log("direction script API, ownership, stable IDs, permissions and deletion tests passed");
