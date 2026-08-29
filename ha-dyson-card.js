class HaDysonCard extends HTMLElement {
  static _registryCache = null;

  static getStubConfig() {
    return {
      entity: "fan.my_dyson",
      airflow_control_side: "right",
      language: "auto",
      sensor_detail_layout: "panel",
    };
  }

  static getConfigForm() {
    const locale = (typeof navigator !== "undefined" ? String(navigator.language || "en") : "en").toLowerCase();
    const editorLang = locale.startsWith("de") ? "de" : locale.startsWith("fr") ? "fr" : "en";
    const t = (de, en, fr) => (editorLang === "de" ? de : editorLang === "fr" ? fr ?? en : en);

    return {
      schema: [
        {
          name: "entity",
          required: true,
          selector: {
            entity: {
              filter: [
                {
                  domain: "fan",
                },
              ],
            },
          },
        },
        {
          name: "title",
          selector: {
            text: {},
          },
        },
        {
          name: "language",
          selector: {
            select: {
              mode: "dropdown",
              options: [
                {
                  value: "auto",
                  label: t("Automatisch", "Auto", "Automatique"),
                },
                {
                  value: "en",
                  label: t("Englisch", "English", "Anglais"),
                },
                {
                  value: "de",
                  label: t("Deutsch", "German", "Allemand"),
                },
                {
                  value: "fr",
                  label: t("Französisch", "French", "Français"),
                },
              ],
            },
          },
        },
        {
          name: "airflow_control_side",
          selector: {
            select: {
              mode: "dropdown",
              options: [
                {
                  value: "right",
                  label: t("Rechts", "Right", "Droite"),
                },
                {
                  value: "left",
                  label: t("Links", "Left", "Gauche"),
                },
              ],
            },
          },
        },
        {
          name: "hide_unsupported",
          selector: {
            select: {
              mode: "dropdown",
              options: [
                {
                  value: "true",
                  label: t("An", "On", "Activé"),
                },
                {
                  value: "false",
                  label: t("Aus", "Off", "Désactivé"),
                },
              ],
            },
          },
        },
        {
          name: "hide_empty_sensors",
          selector: {
            select: {
              mode: "dropdown",
              options: [
                {
                  value: "true",
                  label: t("An", "On", "Activé"),
                },
                {
                  value: "false",
                  label: t("Aus", "Off", "Désactivé"),
                },
              ],
            },
          },
        },
        {
          name: "sensor_more_button_threshold",
          selector: {
            text: {},
          },
        },
        {
          name: "sensor_detail_layout",
          selector: {
            select: {
              mode: "dropdown",
              options: [
                {
                  value: "inline",
                  label: t("Inline", "Inline", "En ligne"),
                },
                {
                  value: "panel",
                  label: t("Panel", "Panel", "Panneau"),
                },
              ],
            },
          },
        },
      ],
      computeLabel: (schema) => {
        switch (schema.name) {
          case "entity":
            return t("Dyson-Entität", "Dyson entity", "Entité Dyson");
          case "title":
            return t("Titel", "Title", "Titre");
          case "language":
            return t("Sprache", "Language", "Langue");
          case "airflow_control_side":
            return t("Luftstrom-Reglerseite", "Airflow control side", "Côté du réglage du flux d'air");
          case "hide_unsupported":
            return t(
              "Nicht unterstützte Steuerelemente ausblenden",
              "Hide unsupported controls",
              "Masquer les commandes non prises en charge"
            );
          case "hide_empty_sensors":
            return t("Leere Sensor-Abzeichen ausblenden", "Hide empty sensor badges", "Masquer les badges de capteur vides");
          case "sensor_more_button_threshold":
            return t("Schwellwert für Mehr-Button", "Sensor more button threshold", "Seuil du bouton « Plus »");
          case "sensor_detail_layout":
            return t("Sensor-Detail-Layout", "Sensor detail layout", "Disposition du détail des capteurs");
          default:
            return undefined;
        }
      },
      computeHelper: (schema) => {
        switch (schema.name) {
          case "airflow_control_side":
            return t(
              "Platziert den vertikalen Luftstrom-Regler rechts oder links am Richtungsrad.",
              "Places the vertical airflow speed control on the right or left side of the direction wheel.",
              "Place le réglage vertical de la vitesse du flux d'air à droite ou à gauche de la molette de direction."
            );
          case "language":
            return t(
              "Optionale Sprachvorgabe. Automatisch folgt der Home Assistant oder Browser-Sprache.",
              "Optional language override. Auto follows the Home Assistant or browser language.",
              "Choix de langue facultatif. « Automatique » suit la langue de Home Assistant ou du navigateur."
            );
          case "hide_unsupported":
            return t(
              "Wenn aktiv, werden nicht verfügbare Steuerelemente und Info-Chips komplett ausgeblendet.",
              "When enabled, controls and info chips are fully hidden if unavailable on the selected device.",
              "Si activé, les commandes et les puces d'information indisponibles sur l'appareil sélectionné sont entièrement masquées."
            );
          case "hide_empty_sensors":
            return t(
              "Wenn aktiv, werden Sensor-Abzeichen ohne Wert ausgeblendet.",
              "When enabled, sensor badges with no value are hidden (for example unknown, unavailable, or missing values).",
              "Si activé, les badges de capteur sans valeur sont masqués (par exemple inconnu, indisponible ou valeur absente)."
            );
          case "sensor_more_button_threshold":
            return t(
              "Zeigt den Mehr/Weniger-Button nur, wenn mehr Sensorwerte sichtbar sind als dieser Wert.",
              "Show the More/Less button only when visible sensor items are greater than this value.",
              "N'affiche le bouton Plus/Moins que si le nombre de capteurs visibles dépasse cette valeur."
            );
          case "sensor_detail_layout":
            return t(
              "Erzwingt die Position der Detail-Sensoren: inline in der oberen Zeile oder im ausklappbaren Panel.",
              "Force where detail sensors appear: inline in the top strip, or in the expandable panel.",
              "Impose l'emplacement des capteurs détaillés : en ligne dans le bandeau supérieur, ou dans le panneau dépliant."
            );
          default:
            return undefined;
        }
      },
    };
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._busy = false;
    this._draftDirection = null;
    this._draftWidth = null;
    this._draggingDial = false;
    this._derived = null;
    this._pendingDirection = null;
    this._pendingWidth = null;
    this._pendingSince = null;
    this._pendingLabel = "";
    this._pendingTimer = null;
    this._pendingSpeed = null;
    this._pendingSpeedSince = null;
    this._pendingSpeedTimer = null;
    this._optimisticDirection = null;
    this._optimisticWidth = null;
    this._optimisticSince = null;
    this._optimisticTimer = null;
    this._timerMenuOpen = false;
    this._customTimerOpen = false;
    this._presetEditorOpen = false;
    this._presetDraftName = "";
    this._presetDraftIcon = "mdi:crosshairs-gps";
    this._pendingPresetDeleteId = null;
    this._sensorDetailsOpen = false;
  }

  setConfig(config) {
    if (!config?.entity) {
      throw new Error("Entity is required");
    }
    const hideUnsupported = config.hide_unsupported === true || String(config.hide_unsupported).toLowerCase() === "true";
    const hideEmptySensors = config.hide_empty_sensors === true || String(config.hide_empty_sensors).toLowerCase() === "true";
    const thresholdValue = Number(config.sensor_more_button_threshold);
    const sensorMoreButtonThreshold = Number.isFinite(thresholdValue) ? this._clamp(Math.round(thresholdValue), 1, 20) : 4;
    this._config = {
      title: "",
      airflow_control_side: "right",
      hide_unsupported: hideUnsupported,
      hide_empty_sensors: hideEmptySensors,
      sensor_more_button_threshold: sensorMoreButtonThreshold,
      sensor_detail_layout: "panel",
      ...config,
    };
    this._config.hide_unsupported = hideUnsupported;
    this._config.hide_empty_sensors = hideEmptySensors;
    this._config.sensor_more_button_threshold = sensorMoreButtonThreshold;
    this._derived = null;
    this._timerMenuOpen = false;
    this._customTimerOpen = false;
    this._presetEditorOpen = false;
    this._presetDraftName = "";
    this._presetDraftIcon = "mdi:crosshairs-gps";
    this._pendingPresetDeleteId = null;
    this._sensorDetailsOpen = false;
    this._clearPending(false);
    this._clearPendingSpeed(false);
    this._clearOptimisticDirection(false);
    this._render();
  }

  set hass(hass) {
    const preserveEditorFocus = this._presetEditorHasFocus();
    this._hass = hass;
    this._ensureDerived();
    this._reconcilePendingState();
    if (!preserveEditorFocus) {
      this._render();
    }
  }

  getCardSize() {
    return 5;
  }

  async _ensureRegistryCache() {
    if (!this._hass?.callWS) return null;
    if (!HaDysonCard._registryCache) {
      HaDysonCard._registryCache = Promise.all([
        this._hass.callWS({ type: "config/entity_registry/list" }),
        this._hass.callWS({ type: "config/device_registry/list" }),
      ]).then(([entities, devices]) => ({ entities, devices }));
    }
    return HaDysonCard._registryCache;
  }

  async _ensureDerived() {
    if (!this._hass || !this._config.entity || this._derived) return;
    try {
      const registry = await this._ensureRegistryCache();
      if (!registry) return;
      this._derived = this._deriveFromRegistry(registry);
      if (!this._presetEditorHasFocus()) {
        this._render();
      }
    } catch (_error) {
      // Keep the card usable even if registry queries fail.
    }
  }

  _presetEditorHasFocus() {
    const active = this.shadowRoot?.activeElement;
    const editor = this.shadowRoot?.querySelector(".preset-editor");
    return Boolean(this._presetEditorOpen && active && editor?.contains(active));
  }

  _syncPresetDraftFromEditor() {
    if (!this._presetEditorOpen) return;
    const nameInput = this.shadowRoot?.querySelector(".preset-name-input");
    const activeIcon = this.shadowRoot?.querySelector("[data-preset-icon].active");
    if (nameInput) {
      this._presetDraftName = nameInput.value || "";
    }
    if (activeIcon?.dataset?.presetIcon) {
      this._presetDraftIcon = activeIcon.dataset.presetIcon;
    }
  }

  _deriveFromRegistry(registry) {
    const entries = Array.isArray(registry?.entities) ? registry.entities : [];
    const deviceEntries = Array.isArray(registry?.devices) ? registry.devices : [];
    const fanEntry = entries.find((entry) => entry.entity_id === this._config.entity);
    const deviceId = fanEntry?.device_id || null;
    const sameDevice = deviceId ? entries.filter((entry) => entry.device_id === deviceId) : [];
    const device = deviceEntries.find((entry) => entry.id === deviceId) || null;

    return {
      deviceId,
      device,
      temperatureEntity: this._findEntityByHints(sameDevice, "sensor", ["temperature"]),
      humidityEntity: this._findEntityByHints(sameDevice, "sensor", ["humidity"]),
      airQualityEntity: this._findEntityByHints(sameDevice, "sensor", ["air_quality_category", "air_quality", "aqi", "pm25", "pm2_5", "pm10", "no2", "voc"]),
      vocEntity: this._findEntityByHints(sameDevice, "sensor", ["voc"]),
      hepaFilterEntity: this._findEntityByHints(sameDevice, "sensor", ["hepa_filter_life", "hepa filter life"]),
      carbonFilterEntity: this._findEntityByHints(sameDevice, "sensor", ["carbon_filter_life", "carbon filter life"]),
      nightModeEntity: this._findEntityByHints(sameDevice, "switch", ["night mode", "night_mode", "nachtmodus", "nacht modus"]),
      climateEntity: this._findFirstEntity(sameDevice, "climate"),
      oscillationSelectEntity: this._findEntityByHints(sameDevice, "select", ["oscillation", "oszillation"]),
      oscillationLowEntity: this._findEntityByHints(sameDevice, "number", ["oscillation low angle", "oscillation low", "oszillations unterwinkel", "unterwinkel"]),
      oscillationHighEntity: this._findEntityByHints(sameDevice, "number", ["oscillation high angle", "oscillation high", "oszillations oberwinkel", "oberwinkel"]),
      oscillationCenterEntity: this._findEntityByHints(sameDevice, "number", ["oscillation center angle", "oscillation center", "oszillations mittelwinkel", "mittelwinkel"]),
      oscillationSpanEntity: this._findEntityByHints(sameDevice, "number", ["oscillation angle", "oscillation span", "oszillationswinkel", "winkel"]),
      sleepTimerEntity: this._findEntityByHints(sameDevice, "number", ["sleep timer", "sleep_timer", "schlaftimer", "schlaf timer"]),
      relatedEntities: sameDevice
        .map((entry) => entry.entity_id)
        .filter(Boolean)
        .sort(),
    };
  }

  _normalizeSearchText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replaceAll("ä", "ae")
      .replaceAll("ö", "oe")
      .replaceAll("ü", "ue")
      .replaceAll("ß", "ss")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  _findEntityByExactName(entries, domain, names) {
    const normalizedNames = names.map((name) => this._normalizeSearchText(name));
    const matchingDomain = entries.filter((entry) => entry.entity_id?.startsWith(`${domain}.`));
    const byOriginalName = matchingDomain.find((entry) => normalizedNames.includes(this._normalizeSearchText(entry.original_name || "")));
    if (byOriginalName) return byOriginalName.entity_id;

    const byName = matchingDomain.find((entry) => normalizedNames.includes(this._normalizeSearchText(entry.name || "")));
    return byName?.entity_id || "";
  }

  _findFirstEntity(entries, domain) {
    return entries.find((entry) => entry.entity_id?.startsWith(`${domain}.`))?.entity_id || "";
  }

  _findEntityByHints(entries, domain, hints) {
    const normalizedHints = hints.map((hint) => this._normalizeSearchText(hint)).filter(Boolean);
    const matchingDomain = entries.filter((entry) => entry.entity_id?.startsWith(`${domain}.`));
    for (const hint of normalizedHints) {
      const byHint = matchingDomain.find((entry) => {
        const haystack = this._normalizeSearchText(`${entry.entity_id || ""} ${entry.original_name || ""} ${entry.name || ""}`);
        return haystack.includes(hint);
      });
      if (byHint) return byHint.entity_id;
    }
    return "";
  }

  _findRelatedEntitiesByHints(domain, hints) {
    const normalizedHints = hints.map((hint) => String(hint).toLowerCase());
    const related = this._derived?.relatedEntities || [];
    return related.filter((entityId) => {
      if (!entityId?.startsWith(`${domain}.`)) return false;
      const stateObj = this._stateObj(entityId);
      const haystack = [
        entityId,
        stateObj?.attributes?.friendly_name || "",
      ].join(" ").toLowerCase();
      return normalizedHints.some((hint) => haystack.includes(hint.replaceAll("_", " "))) ||
        normalizedHints.some((hint) => haystack.includes(hint));
    });
  }

  _stateObj(entityId) {
    if (!entityId || !this._hass) return null;
    return this._hass.states?.[entityId] || null;
  }

  _stateValue(entityId, fallback = "Unavailable") {
    const stateObj = this._stateObj(entityId);
    return stateObj?.state ?? fallback;
  }

  _friendlyName(entityId, fallback = "") {
    return this._stateObj(entityId)?.attributes?.friendly_name || fallback || entityId || "";
  }

  _numericState(entityId) {
    const value = Number(this._stateValue(entityId, NaN));
    return Number.isFinite(value) ? value : null;
  }

  _parseSweepWidth(value) {
    const text = String(value ?? "").trim();
    if (!text || ["unknown", "unavailable"].includes(text.toLowerCase())) {
      return null;
    }
    if (/\b(direct|direkt|off|aus|none)\b/i.test(text)) {
      return 0;
    }
    const match = text.match(/(\d+(?:\.\d+)?)/);
    if (!match) return null;
    const width = Number(match[1]);
    if (!Number.isFinite(width)) return null;
    return this._normalizeAngle(width);
  }

  _selectSweepWidth() {
    const stateObj = this._stateObj(this._oscillationSelectEntity());
    if (!stateObj) return null;
    const attributes = stateObj.attributes || {};
    const candidates = [
      stateObj.state,
      attributes.current_option,
      attributes.selected_option,
      attributes.option,
    ];
    for (const candidate of candidates) {
      const parsed = this._parseSweepWidth(candidate);
      if (parsed !== null) return parsed;
    }
    return null;
  }

  _deviceId() {
    return this._derived?.deviceId || "";
  }

  _temperatureEntity() {
    return this._derived?.temperatureEntity || "";
  }

  _humidityEntity() {
    return this._derived?.humidityEntity || "";
  }

  _airQualityEntity() {
    return this._derived?.airQualityEntity || "";
  }

  _oscillationAngleEntity() {
    return this._derived?.oscillationSpanEntity || "";
  }

  _oscillationSelectEntity() {
    return this._derived?.oscillationSelectEntity || "";
  }

  _oscillationCenterEntity() {
    return this._derived?.oscillationCenterEntity || "";
  }

  _nightModeEntity() {
    return this._derived?.nightModeEntity || "";
  }

  _climateEntity() {
    return this._derived?.climateEntity || "";
  }

  _sleepTimerEntity() {
    return this._derived?.sleepTimerEntity || "";
  }

  _vocEntity() {
    return this._derived?.vocEntity || this._airQualityEntity();
  }

  _filterEntities() {
    return [
      this._derived?.hepaFilterEntity || "",
      this._derived?.carbonFilterEntity || "",
    ].filter(Boolean);
  }

  _normalizeAngle(value) {
    if (!Number.isFinite(Number(value))) return 0;
    const normalized = ((Number(value) % 360) + 360) % 360;
    return Math.max(0, Math.min(350, Math.round(normalized / 5) * 5));
  }

  _normalizeDeviceAngle(value) {
    if (!Number.isFinite(Number(value))) return 0;
    return Math.max(0, Math.min(350, Math.round(Number(value))));
  }

  _normalizeVisualAngle(value) {
    if (!Number.isFinite(Number(value))) return 0;
    return ((Number(value) % 360) + 360) % 360;
  }

  _visualAngleFromDevice(value) {
    return this._normalizeVisualAngle(Number(value) + 5);
  }

  _deviceAngleFromVisual(value) {
    return this._normalizeAngle(Number(value) - 5);
  }

  _clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  _extractBounds(attributes) {
    const lowerCandidates = [
      attributes.lower_angle,
      attributes.lowerAngle,
      attributes.angle_low,
      attributes.oscillation_lower_angle,
      attributes.oscillationLowerAngle,
      attributes.oscillation_min_angle,
      attributes.oscillationMinAngle,
    ];
    const upperCandidates = [
      attributes.upper_angle,
      attributes.upperAngle,
      attributes.angle_high,
      attributes.oscillation_upper_angle,
      attributes.oscillationUpperAngle,
      attributes.oscillation_max_angle,
      attributes.oscillationMaxAngle,
    ];
    const lower = lowerCandidates.find((value) => Number.isFinite(Number(value)));
    const upper = upperCandidates.find((value) => Number.isFinite(Number(value)));
    if (!Number.isFinite(Number(lower)) || !Number.isFinite(Number(upper))) {
      return null;
    }
    return {
      lower: this._normalizeDeviceAngle(lower),
      upper: this._normalizeDeviceAngle(upper),
    };
  }

  _selectAttributes() {
    return this._stateObj(this._oscillationSelectEntity())?.attributes || {};
  }

  _currentBounds(attributes) {
    const fromFan = this._extractBounds(attributes);
    if (fromFan) return fromFan;

    const selectAttributes = this._selectAttributes();
    const lower = Number(selectAttributes.oscillation_angle_low);
    const upper = Number(selectAttributes.oscillation_angle_high);
    if (Number.isFinite(lower) && Number.isFinite(upper)) {
      return {
        lower: this._normalizeDeviceAngle(lower),
        upper: this._normalizeDeviceAngle(upper),
      };
    }

    const lowerEntity = this._derived?.oscillationLowEntity || "";
    const highEntity = this._derived?.oscillationHighEntity || "";
    const lowerState = this._numericState(lowerEntity);
    const highState = this._numericState(highEntity);
    if (lowerState !== null && highState !== null) {
      return {
        lower: this._normalizeDeviceAngle(lowerState),
        upper: this._normalizeDeviceAngle(highState),
      };
    }

    return null;
  }

  _oscillationEnabled(attributes) {
    if (typeof attributes.oscillation_enabled === "boolean") {
      return attributes.oscillation_enabled;
    }
    if (typeof attributes.oscillating === "boolean") {
      return attributes.oscillating;
    }
    const selectAttributes = this._selectAttributes();
    if (typeof selectAttributes.oscillation_enabled === "boolean") {
      return selectAttributes.oscillation_enabled;
    }
    return null;
  }

  _widthFromBounds(bounds) {
    if (!bounds) return null;
    return this._normalizeAngle(bounds.upper - bounds.lower);
  }

  _centerFromBounds(bounds) {
    if (!bounds) return null;
    const width = this._widthFromBounds(bounds) ?? 0;
    return this._normalizeAngle(bounds.lower + (width / 2));
  }

  _sourceWidth(attributes) {
    const fromSelect = this._selectSweepWidth();
    if (fromSelect !== null) {
      return fromSelect;
    }
    if (this._oscillationEnabled(attributes) === false) {
      return 0;
    }
    const bounds = this._currentBounds(attributes);
    const fromBounds = this._widthFromBounds(bounds);
    if (fromBounds !== null) {
      return fromBounds;
    }
    const fromEntity = this._numericState(this._oscillationAngleEntity());
    if (fromEntity !== null) {
      return this._normalizeAngle(fromEntity);
    }
    return 0;
  }

  _sourceDirection(attributes) {
    const bounds = this._currentBounds(attributes);
    const fromBounds = this._centerFromBounds(bounds);
    if (fromBounds !== null) {
      return fromBounds;
    }
    const centerFromEntity = this._numericState(this._oscillationCenterEntity());
    if (centerFromEntity !== null) {
      return this._normalizeAngle(centerFromEntity);
    }
    return 180;
  }

  _pendingActive() {
    return Number.isFinite(this._pendingSince) && Date.now() - this._pendingSince < 20000;
  }

  _pendingSpeedActive() {
    return Number.isFinite(this._pendingSpeedSince) && Date.now() - this._pendingSpeedSince < 20000;
  }

  _optimisticDirectionActive() {
    return Number.isFinite(this._optimisticSince) && Date.now() - this._optimisticSince < 600000;
  }

  _setPendingDirection(direction, width, label) {
    const bounds = this._boundsFromCenterWidth(direction, width);
    this._pendingDirection = bounds.center;
    this._pendingWidth = bounds.width;
    this._pendingSince = Date.now();
    this._pendingLabel = label;

    if (this._pendingTimer) {
      clearTimeout(this._pendingTimer);
    }
    this._pendingTimer = setTimeout(() => {
      this._clearPending();
    }, 20000);
  }

  _setOptimisticDirection(direction, width) {
    const bounds = this._boundsFromCenterWidth(direction, width);
    this._optimisticDirection = bounds.center;
    this._optimisticWidth = bounds.width;
    this._optimisticSince = Date.now();

    if (this._optimisticTimer) {
      clearTimeout(this._optimisticTimer);
    }
    this._optimisticTimer = setTimeout(() => {
      this._clearOptimisticDirection();
    }, 600000);
  }

  _clearPending(render = true) {
    if (this._pendingTimer) {
      clearTimeout(this._pendingTimer);
      this._pendingTimer = null;
    }
    this._pendingDirection = null;
    this._pendingWidth = null;
    this._pendingSince = null;
    this._pendingLabel = "";
    if (render) {
      this._render();
    }
  }

  _clearOptimisticDirection(render = true) {
    if (this._optimisticTimer) {
      clearTimeout(this._optimisticTimer);
      this._optimisticTimer = null;
    }
    this._optimisticDirection = null;
    this._optimisticWidth = null;
    this._optimisticSince = null;
    if (render) {
      this._render();
    }
  }

  _setPendingSpeed(percentage) {
    this._pendingSpeed = Math.max(0, Math.min(100, Math.round(Number(percentage))));
    this._pendingSpeedSince = Date.now();

    if (this._pendingSpeedTimer) {
      clearTimeout(this._pendingSpeedTimer);
    }
    this._pendingSpeedTimer = setTimeout(() => {
      this._clearPendingSpeed();
    }, 20000);
  }

  _settleDirectionCommand(direction, width, render = false) {
    this._clearPending(false);
    this._setOptimisticDirection(direction, width);
    if (render) {
      this._render();
    }
  }

  _clearPendingSpeed(render = true) {
    if (this._pendingSpeedTimer) {
      clearTimeout(this._pendingSpeedTimer);
      this._pendingSpeedTimer = null;
    }
    this._pendingSpeed = null;
    this._pendingSpeedSince = null;
    if (render) {
      this._render();
    }
  }

  _anglesMatch(sourceDirection, sourceWidth) {
    if (!this._pendingActive()) return false;
    return this._directionWidthMatches(
      this._pendingDirection,
      this._pendingWidth,
      sourceDirection,
      sourceWidth
    );
  }

  _directionWidthMatches(targetDirection, targetWidth, sourceDirection, sourceWidth) {
    const directionMatches = this._normalizeAngle(sourceDirection) === this._normalizeAngle(targetDirection);
    const sourceWidthMatches = this._normalizeAngle(sourceWidth) === this._normalizeAngle(targetWidth);
    const selectWidth = this._selectSweepWidth();
    const selectWidthMatches = selectWidth !== null && this._normalizeAngle(selectWidth) === this._normalizeAngle(targetWidth);
    return directionMatches && (sourceWidthMatches || selectWidthMatches);
  }

  _reconcilePendingState() {
    const fan = this._config.entity ? this._hass?.states?.[this._config.entity] : null;
    const attributes = fan?.attributes || {};

    if (this._pendingSpeedActive() && this._sourceSpeed(attributes) === this._pendingSpeed) {
      this._clearPendingSpeed(false);
    } else if (!this._pendingSpeedActive() && this._pendingSpeedSince !== null) {
      this._clearPendingSpeed(false);
    }

    if (this._optimisticDirectionActive() && fan) {
      const sourceDirection = this._sourceDirection(attributes);
      const sourceWidth = this._sourceWidth(attributes);
      if (this._directionWidthMatches(this._optimisticDirection, this._optimisticWidth, sourceDirection, sourceWidth)) {
        this._clearOptimisticDirection(false);
      }
    } else if (!this._optimisticDirectionActive() && this._optimisticSince !== null) {
      this._clearOptimisticDirection(false);
    }

    if (!this._pendingActive()) {
      if (this._pendingSince !== null) {
        this._clearPending(false);
      }
      return;
    }
    if (!fan) return;
    if (this._anglesMatch(this._sourceDirection(attributes), this._sourceWidth(attributes))) {
      this._clearPending(false);
    }
  }

  _sourceSpeed(attributes) {
    const value = Number(attributes.percentage);
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  _currentSpeed(attributes) {
    if (this._pendingSpeedActive() && Number.isFinite(this._pendingSpeed)) {
      return this._pendingSpeed;
    }
    return this._sourceSpeed(attributes);
  }

  _currentWidth(attributes) {
    if (this._draggingDial && Number.isFinite(this._draftWidth)) {
      return this._normalizeAngle(this._draftWidth);
    }
    if (this._pendingActive() && Number.isFinite(this._pendingWidth)) {
      return this._normalizeAngle(this._pendingWidth);
    }
    if (this._optimisticDirectionActive() && Number.isFinite(this._optimisticWidth)) {
      return this._normalizeAngle(this._optimisticWidth);
    }
    return this._sourceWidth(attributes);
  }

  _currentDirection(attributes) {
    if (this._draggingDial && Number.isFinite(this._draftDirection)) {
      return this._normalizeAngle(this._draftDirection);
    }
    if (this._pendingActive() && Number.isFinite(this._pendingDirection)) {
      return this._normalizeAngle(this._pendingDirection);
    }
    if (this._optimisticDirectionActive() && Number.isFinite(this._optimisticDirection)) {
      return this._normalizeAngle(this._optimisticDirection);
    }
    return this._sourceDirection(attributes);
  }

  _displayAngle(direction, width) {
    if (!width) {
      return `${direction}\u00b0 ${this._t("direct").toLowerCase()}`;
    }
    return `${direction}\u00b0 center \u00b7 ${width}\u00b0 ${this._t("sweep")}`;
  }

  _boundsFromCenterWidth(direction, width) {
    const normalizedWidth = this._normalizeAngle(width);
    const halfWidth = normalizedWidth / 2;
    const requestedCenter = this._normalizeAngle(direction);
    const constrainedCenter = this._clamp(requestedCenter, halfWidth, 350 - halfWidth);
    const lower = this._normalizeDeviceAngle(constrainedCenter - halfWidth);
    const upper = this._normalizeDeviceAngle(constrainedCenter + halfWidth);
    const center = this._normalizeAngle(lower + ((upper - lower) / 2));
    return { lower, upper, center, width: normalizedWidth };
  }

  _pointForAngle(cx, cy, radius, angle) {
    const radians = (angle * Math.PI) / 180;
    return {
      x: cx + Math.sin(radians) * radius,
      y: cy - Math.cos(radians) * radius,
    };
  }

  _arcPath(cx, cy, radius, startAngle, endAngle) {
    const start = this._pointForAngle(cx, cy, radius, startAngle);
    const end = this._pointForAngle(cx, cy, radius, endAngle);
    const sweep = ((endAngle - startAngle) + 360) % 360;
    const largeArc = sweep > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  }

  _sectorPath(cx, cy, outerRadius, startAngle, endAngle) {
    const start = this._pointForAngle(cx, cy, outerRadius, startAngle);
    const end = this._pointForAngle(cx, cy, outerRadius, endAngle);
    const sweep = ((endAngle - startAngle) + 360) % 360;
    const largeArc = sweep > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
  }

  _updateDialPreview(direction, width) {
    const wheel = this.shadowRoot;
    if (!wheel) return;
    const bounds = this._boundsFromCenterWidth(direction, width);
    const handle = this._pointForAngle(160, 160, 128, this._visualAngleFromDevice(bounds.center));
    const cone = wheel.querySelector(".wheel-cone");
    const direct = wheel.querySelector(".wheel-direct");
    const handleCircle = wheel.querySelector(".wheel-handle");
    const handleHit = wheel.querySelector(".wheel-handle-hit");
    if (handleCircle) {
      handleCircle.setAttribute("cx", String(handle.x));
      handleCircle.setAttribute("cy", String(handle.y));
    }
    if (handleHit) {
      handleHit.style.left = `${((handle.x / 320) * 100).toFixed(4)}%`;
      handleHit.style.top = `${((handle.y / 320) * 100).toFixed(4)}%`;
    }

    if (bounds.width === 0) {
      if (cone) {
        cone.setAttribute("d", "");
        cone.style.display = "none";
      }
      if (direct) {
        const visualCenter = this._visualAngleFromDevice(bounds.center);
        direct.setAttribute("d", this._arcPath(160, 160, 116, visualCenter - 1, visualCenter + 1));
        direct.style.display = "";
      }
      return;
    }

    if (cone) {
      cone.setAttribute("d", this._sectorPath(160, 160, 128, this._visualAngleFromDevice(bounds.lower), this._visualAngleFromDevice(bounds.upper)));
      cone.style.display = "";
    }
    if (direct) {
      direct.style.display = "none";
    }
  }

  _renderMetric(label, value, unit = "") {
    if (!value || value === "Unavailable") return "";
    return `
      <div class="metric">
        <div class="metric-label">${label}</div>
        <div class="metric-value">${value}${unit}</div>
      </div>
    `;
  }

  _displayState(entityId, fallback = "—") {
    const stateObj = this._stateObj(entityId);
    if (!stateObj || ["unknown", "unavailable"].includes(stateObj.state)) return fallback;
    return stateObj.state;
  }

  _hasMeaningfulValue(value) {
    if (value === null || value === undefined) return false;
    const text = String(value).trim().toLowerCase();
    if (!text) return false;
    return !["unknown", "unavailable", "none", "null", "nan", "-", "—"].includes(text);
  }

  _localeCode() {
    const configured = String(this._config?.language || "").trim().toLowerCase();
    if (configured && configured !== "auto") return configured;
    const hassLocale = String(this._hass?.locale?.language || "").trim().toLowerCase();
    if (hassLocale) return hassLocale;
    const hassLanguage = String(this._hass?.language || "").trim().toLowerCase();
    if (hassLanguage) return hassLanguage;
    const browser = typeof navigator !== "undefined" ? String(navigator.language || "").trim().toLowerCase() : "";
    return browser || "en";
  }

  _t(key, vars = {}) {
    const de = {
      save: "Speichern",
      auto: "Auto",
      night: "Nachtmodus",
      airflow: "Luftstrom",
      sleep_timer: "Schlaf-Timer",
      custom_sleep_timer: "Eigener Schlaf-Timer",
      hours: "Stunden",
      set: "Setzen",
      cancel: "Abbrechen",
      forward: "Vorwärts",
      reverse: "Rückwärts",
      more: "Mehr",
      less: "Weniger",
      show_more_sensors: "Mehr Sensoren anzeigen",
      hide_sensor_details: "Sensor-Details ausblenden",
      set_dyson_entity: "Dyson-Entität setzen.",
      entity_not_found_prefix: "Entität",
      entity_not_found_suffix: "wurde nicht gefunden. Stelle sicher, dass hass_dyson installiert ist und die Entität existiert.",
      applying: "Wird angewendet",
      waiting_for_device: "Warte auf Gerät",
      direct: "Direkt",
      wide_sweep: "Breite Schwenkung",
      sweep: "Schwenkung",
      delete_direction_preset: "Richtungs-Preset löschen",
      remove_prefix: "Entfernen",
      no_direction_presets_saved: "Keine Richtungsvoreinstellungen gespeichert",
      set_dyson_direction: "Dyson-Richtung setzen",
      drag_set_direction: "Ziehen, um Dyson-Richtung zu setzen",
      set_airflow_speed: "Luftstrom-Geschwindigkeit setzen",
      turn_dyson_off: "Dyson ausschalten",
      turn_dyson_on: "Dyson einschalten",
      heat_mode: "Heizmodus",
      fan_only_mode: "Nur-Lüfter-Modus",
      save_current_direction_preset: "Aktuelles Richtungs-Preset speichern",
      hide_unsupported_controls: "Nicht unterstützte Steuerelemente ausblenden",
      hide_empty_sensor_badges: "Leere Sensor-Abzeichen ausblenden",
      direction: "Richtung",
      delete_confirm: "LÖSCHEN",
      point_fan: "Lüfter wird ausgerichtet",
      apply_angle: "Winkel wird angewendet",
      apply_sweep: "Schwenkung wird angewendet",
      right: "Rechts",
      left: "Links",
      less_details: "Weniger",
      more_details: "Mehr",
      hide_debug: "Debug ausblenden",
      air_quality: "Luftqualität",
      timer_off: "Aus",
      preset_name: "Preset-Name",
      preset_name_placeholder: "Name",
      preset_icon: "Preset-Symbol",
      sweep_presets: "Schwenk-Presets",
      toggle_airflow_direction: "Luftstromrichtung umschalten",
      set_target_temperature: "Zieltemperatur setzen",
      decrease_target_temperature: "Zieltemperatur verringern",
      increase_target_temperature: "Zieltemperatur erhöhen",
      resolving_device: "Diese Karte ermittelt noch das zugehörige Dyson-Gerät und die Begleit-Entitäten der ausgewählten Lüfter-Entität.",
    };

    const en = {
      save: "Save",
      auto: "Auto",
      night: "Night",
      airflow: "Airflow",
      sleep_timer: "Sleep Timer",
      custom_sleep_timer: "Custom sleep timer",
      hours: "Hours",
      set: "Set",
      cancel: "Cancel",
      forward: "Forward",
      reverse: "Reverse",
      more: "More",
      less: "Less",
      show_more_sensors: "Show more sensors",
      hide_sensor_details: "Hide sensor details",
      set_dyson_entity: "Set a Dyson entity.",
      entity_not_found_prefix: "Entity",
      entity_not_found_suffix: "was not found. Make sure hass_dyson is installed and the entity exists.",
      applying: "Applying",
      waiting_for_device: "Waiting for device",
      direct: "Direct",
      wide_sweep: "Wide sweep",
      sweep: "sweep",
      delete_direction_preset: "Delete direction preset",
      remove_prefix: "Remove",
      no_direction_presets_saved: "No direction presets saved",
      set_dyson_direction: "Set Dyson direction",
      drag_set_direction: "Drag to set Dyson direction",
      set_airflow_speed: "Set airflow speed",
      turn_dyson_off: "Turn Dyson off",
      turn_dyson_on: "Turn Dyson on",
      heat_mode: "Heat mode",
      fan_only_mode: "Fan only mode",
      save_current_direction_preset: "Save current direction preset",
      hide_unsupported_controls: "Hide unsupported controls",
      hide_empty_sensor_badges: "Hide empty sensor badges",
      direction: "direction",
      delete_confirm: "DELETE",
      point_fan: "Pointing fan",
      apply_angle: "Applying angle",
      apply_sweep: "Applying",
      right: "Right",
      left: "Left",
      less_details: "Less",
      more_details: "More",
      hide_debug: "Hide debug",
      air_quality: "Air Quality",
      timer_off: "Off",
      preset_name: "Preset name",
      preset_name_placeholder: "Name",
      preset_icon: "Preset icon",
      sweep_presets: "Sweep presets",
      toggle_airflow_direction: "Toggle airflow direction",
      set_target_temperature: "Set target temperature",
      decrease_target_temperature: "Decrease target temperature",
      increase_target_temperature: "Increase target temperature",
      resolving_device: "This card is still resolving the related Dyson device and companion entities from the selected fan entity.",
    };

    const fr = {
      save: "Enregistrer",
      auto: "Auto",
      night: "Nuit",
      airflow: "Flux d'air",
      sleep_timer: "Minuterie",
      custom_sleep_timer: "Minuterie personnalisée",
      hours: "Heures",
      set: "Appliquer",
      cancel: "Annuler",
      forward: "Avant",
      reverse: "Arrière",
      more: "Plus",
      less: "Moins",
      show_more_sensors: "Afficher plus de capteurs",
      hide_sensor_details: "Masquer le détail des capteurs",
      set_dyson_entity: "Sélectionnez une entité Dyson.",
      entity_not_found_prefix: "L'entité",
      entity_not_found_suffix: "est introuvable. Vérifiez que hass_dyson est installé et que l'entité existe.",
      applying: "Application en cours",
      waiting_for_device: "En attente de l'appareil",
      direct: "Direct",
      wide_sweep: "Balayage large",
      sweep: "de balayage",
      delete_direction_preset: "Supprimer le préréglage de direction",
      remove_prefix: "Supprimer",
      no_direction_presets_saved: "Aucun préréglage de direction enregistré",
      set_dyson_direction: "Définir la direction du Dyson",
      drag_set_direction: "Faites glisser pour définir la direction du Dyson",
      set_airflow_speed: "Régler la vitesse du flux d'air",
      turn_dyson_off: "Éteindre le Dyson",
      turn_dyson_on: "Allumer le Dyson",
      heat_mode: "Mode chauffage",
      fan_only_mode: "Mode ventilation seule",
      save_current_direction_preset: "Enregistrer la direction actuelle comme préréglage",
      hide_unsupported_controls: "Masquer les commandes non prises en charge",
      hide_empty_sensor_badges: "Masquer les badges de capteur vides",
      direction: "direction",
      delete_confirm: "SUPPRIMER",
      point_fan: "Orientation du ventilateur",
      apply_angle: "Application de l'angle",
      apply_sweep: "Application",
      right: "Droite",
      left: "Gauche",
      less_details: "Moins",
      more_details: "Plus",
      hide_debug: "Masquer le debug",
      air_quality: "Qualité de l'air",
      timer_off: "Désactivée",
      preset_name: "Nom du préréglage",
      preset_name_placeholder: "Nom",
      preset_icon: "Icône du préréglage",
      sweep_presets: "Préréglages de balayage",
      toggle_airflow_direction: "Inverser le sens du flux d'air",
      set_target_temperature: "Définir la température de consigne",
      decrease_target_temperature: "Diminuer la température de consigne",
      increase_target_temperature: "Augmenter la température de consigne",
      resolving_device: "Cette carte recherche encore l'appareil Dyson associé et ses entités complémentaires à partir de l'entité ventilateur sélectionnée.",
    };

    const locale = this._localeCode();
    const dict = locale.startsWith("de") ? de : locale.startsWith("fr") ? fr : en;
    let text = dict[key] ?? en[key] ?? key;
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
    return text;
  }

  _displayNumber(entityId) {
    const value = Number(this._displayState(entityId, NaN));
    return Number.isFinite(value) ? value : null;
  }

  _unit(entityId, fallback = "") {
    return this._stateObj(entityId)?.attributes?.unit_of_measurement || fallback;
  }

  _sensorDetailValue(entityId) {
    const stateObj = this._stateObj(entityId);
    if (!stateObj || ["unknown", "unavailable"].includes(stateObj.state)) return null;
    const unit = stateObj.attributes?.unit_of_measurement || "";
    return `${stateObj.state}${unit}`;
  }

  _sensorDetailItem(label, hints, domain = "sensor") {
    const entityId = this._findRelatedEntitiesByHints(domain, hints)[0];
    const value = this._sensorDetailValue(entityId);
    if (!entityId || !value) return null;
    return { label, value, entityId };
  }

  _sensorDetailGroups() {
    const groups = [
      {
        id: "air_quality",
        title: this._t("air_quality"),
        icon: "mdi:air-filter",
        items: [
          this._sensorDetailItem("AQI", ["aqi", "air_quality", "air quality"]),
          this._sensorDetailItem("PM2.5", ["pm25", "pm2_5", "p25r", "pm2.5"]),
          this._sensorDetailItem("PM10", ["pm10", "p10r"]),
          this._sensorDetailItem("VOC", ["voc", "vact", "va10"]),
          this._sensorDetailItem("NO2", ["no2", "nox", "noxl"]),
        ],
      },
    ];

    return groups
      .map((group) => ({
        ...group,
        items: group.items
          .filter(Boolean)
          .filter((item, index, items) =>
            items.findIndex((candidate) => candidate.entityId === item.entityId) === index
          ),
      }))
      .filter((group) => group.items.length);
  }

  _sensorDetailLayout() {
    const value = String(this._config?.sensor_detail_layout || "panel").trim().toLowerCase();
    return value === "inline" ? "inline" : "panel";
  }

  _numericFromSensorValue(value) {
    const match = String(value || "").replace(",", ".").match(/-?\d+(?:\.\d+)?/);
    if (!match) return null;
    const numeric = Number(match[0]);
    return Number.isFinite(numeric) ? numeric : null;
  }

  _sensorDetailTone(label, value) {
    const normalized = String(label || "").trim().toUpperCase();
    const numeric = this._numericFromSensorValue(value);

    if (normalized === "AQI") {
      return this._qualityTone(this._qualityLabel(value));
    }

    if (numeric === null) return "neutral";

    if (normalized === "PM2.5") {
      if (numeric <= 15) return "good";
      if (numeric <= 35) return "fair";
      return "poor";
    }

    if (normalized === "PM10") {
      if (numeric <= 30) return "good";
      if (numeric <= 80) return "fair";
      return "poor";
    }

    if (normalized === "VOC" || normalized === "NO2") {
      if (numeric <= 3) return "good";
      if (numeric <= 7) return "fair";
      return "poor";
    }

    return "neutral";
  }

  _renderInlineSensorDetails(items) {
    if (!Array.isArray(items) || !items.length) return "";
    return items.map((item) => {
      const tone = this._sensorDetailTone(item.label, item.value);
      return `
        <span class="sensor-detail-chip ${tone}" title="${this._escapeHtml(item.entityId)}">
          <strong>${this._escapeHtml(item.label)}</strong>
          <span>${this._escapeHtml(item.value)}</span>
        </span>
      `;
    }).join("");
  }

  _renderSensorDetails(forceOpen = false) {
    const groups = this._sensorDetailGroups();
    if ((!this._sensorDetailsOpen && !forceOpen) || !groups.length) return "";
    return `
      <div class="sensor-details-panel">
        ${groups.map((group) => `
          <section class="sensor-details-section">
            <div class="sensor-details-heading">
              <ha-icon icon="${this._escapeHtml(group.icon)}"></ha-icon>
              <span>${this._escapeHtml(group.title)}</span>
            </div>
            <div class="sensor-details-grid ${group.id === "air_quality" ? "compact" : ""}">
              ${group.items.map((item) => {
                const tone = this._sensorDetailTone(item.label, item.value);
                return `
                <div class="sensor-detail-item ${group.id === "air_quality" ? "compact" : ""} ${tone}" title="${this._escapeHtml(item.entityId)}">
                  <span>${this._escapeHtml(item.label)}</span>
                  <strong>${this._escapeHtml(item.value)}</strong>
                </div>
              `;
              }).join("")}
            </div>
          </section>
        `).join("")}
      </div>
    `;
  }

  _qualityLabel(airQualityValue) {
    const value = String(airQualityValue || "").trim();
    if (!value || value === "Unavailable") return "Unknown";
    if (/^\d+(\.\d+)?$/.test(value)) {
      const numeric = Number(value);
      if (numeric <= 50) return "Good";
      if (numeric <= 100) return "Fair";
      if (numeric <= 150) return "Poor";
      return "Bad";
    }
    return value;
  }

  _qualityTone(label) {
    const normalized = String(label || "").toLowerCase();
    if (["good", "low", "excellent"].some((term) => normalized.includes(term))) return "good";
    if (["fair", "medium", "moderate"].some((term) => normalized.includes(term))) return "fair";
    if (["poor", "bad", "high", "severe"].some((term) => normalized.includes(term))) return "poor";
    return "neutral";
  }

  _filterPercent() {
    const values = this._filterEntities()
      .map((entityId) => this._displayNumber(entityId))
      .filter((value) => Number.isFinite(value));
    if (!values.length) return null;
    return Math.min(...values);
  }

  _timerLabel(attributes) {
    const minutes = Number(attributes.sleep_timer || 0);
    if (!Number.isFinite(minutes) || minutes <= 0) return this._t("timer_off");
    if (minutes % 60 === 0) return `${minutes / 60}h`;
    return `${minutes}m`;
  }

  _isAutoMode(mode, attributes) {
    return String(mode).toLowerCase() === "auto" || attributes.auto_mode === true;
  }

  _nightModeOn(attributes) {
    const switchState = this._displayState(this._nightModeEntity(), "");
    if (switchState) return switchState === "on";
    return attributes.night_mode === true;
  }

  _fanDirection(attributes) {
    return attributes.direction || attributes.current_direction || "forward";
  }

  _fanFeature(attributes, featureBit) {
    const features = Number(attributes.supported_features);
    return Number.isFinite(features) && (features & featureBit) === featureBit;
  }

  _supportsFanSpeed(attributes) {
    return this._fanFeature(attributes, 1) || attributes.percentage !== undefined;
  }

  _supportsFanDirection(attributes) {
    const features = Number(attributes.supported_features);
    if (Number.isFinite(features)) {
      // Trust Home Assistant's fan capability bitmask when present.
      return (features & 4) === 4;
    }
    // Fallback for integrations that omit supported_features.
    return attributes.direction !== undefined || attributes.current_direction !== undefined;
  }

  _supportsAutoMode(attributes) {
    const presetModes = attributes.preset_modes || attributes.presetModes || [];
    return (Array.isArray(presetModes) && presetModes.some((preset) => String(preset).toLowerCase() === "auto"))
      || attributes.auto_mode !== undefined
      || String(attributes.mode || attributes.preset_mode || "").toLowerCase() === "auto";
  }

  _fanModes(attributes) {
    const modes = attributes.preset_modes || attributes.presetModes || [];
    return Array.isArray(modes) && modes.length ? modes : ["manual", "auto"];
  }

  _resolvePresetModeValue(attributes, targetMode, fallbackMode) {
    const modes = this._fanModes(attributes);
    const normalized = String(targetMode || "").toLowerCase();
    if (Array.isArray(modes)) {
      const match = modes.find((mode) => String(mode).toLowerCase() === normalized);
      if (match !== undefined) return match;
    }
    return fallbackMode;
  }

  _resolveManualPresetMode(attributes) {
    const modes = this._fanModes(attributes);
    if (Array.isArray(modes) && modes.length) {
      const nonAuto = modes.find((mode) => String(mode).toLowerCase() !== "auto");
      if (nonAuto) return nonAuto;
    }
    const currentMode = attributes.mode || attributes.preset_mode;
    if (currentMode && String(currentMode).toLowerCase() !== "auto") {
      return currentMode;
    }
    return "manual";
  }

  _climateAttributes() {
    return this._stateObj(this._climateEntity())?.attributes || {};
  }

  _heatModes(attributes) {
    const modes = attributes.hvac_modes || [];
    return Array.isArray(modes) ? modes : [];
  }

  _targetTemperature(attributes) {
    const value = Number(attributes.temperature ?? attributes.target_temperature);
    return Number.isFinite(value) ? value : null;
  }

  _hasHeatMode(modes, mode) {
    return Array.isArray(modes) && modes.includes(mode);
  }

  _renderSelectOption(value, currentValue, label = value) {
    return `<option value="${this._escapeHtml(value)}" ${String(currentValue) === String(value) ? "selected" : ""}>${this._escapeHtml(label)}</option>`;
  }

  _presetStorageKey() {
    return `ha-dyson-card:direction-presets:${this._config.entity || "default"}`;
  }

  _directionPresets() {
    try {
      const raw = window.localStorage?.getItem(this._presetStorageKey());
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((preset) => {
          const direction = Number(preset.direction);
          return {
            id: String(preset.id || ""),
            name: String(preset.name || "").trim(),
            icon: String(preset.icon || "mdi:crosshairs-gps").trim(),
            direction: Number.isFinite(direction) ? this._normalizeAngle(direction) : NaN,
          };
        })
        .filter((preset) => preset.id && preset.name && Number.isFinite(preset.direction));
    } catch (_error) {
      return [];
    }
  }

  _saveDirectionPresets(presets) {
    try {
      window.localStorage?.setItem(this._presetStorageKey(), JSON.stringify(presets));
    } catch (_error) {
      // Local storage can be unavailable in restricted browser contexts.
    }
  }

  _addDirectionPreset(name, icon, direction) {
    const trimmedName = String(name || "").trim();
    if (!trimmedName) return;
    const normalizedIcon = String(icon || "mdi:crosshairs-gps").trim() || "mdi:crosshairs-gps";
    const presets = this._directionPresets();
    presets.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: trimmedName,
      icon: normalizedIcon.startsWith("mdi:") ? normalizedIcon : `mdi:${normalizedIcon}`,
      direction: this._normalizeAngle(direction),
    });
    this._saveDirectionPresets(presets);
  }

  _removeDirectionPreset(id) {
    this._saveDirectionPresets(this._directionPresets().filter((preset) => preset.id !== id));
    if (this._pendingPresetDeleteId === id) {
      this._pendingPresetDeleteId = null;
    }
  }

  _clearPresetDeleteArm() {
    const hadPending = Boolean(this._pendingPresetDeleteId);
    this._pendingPresetDeleteId = null;
    return hadPending;
  }

  _renderDirectionPresets(direction, width, controlReady) {
    const presets = this._directionPresets();
    const disabled = controlReady ? "" : "disabled";
    const iconChoices = [
      "mdi:crosshairs-gps",
      "mdi:bed",
      "mdi:sofa",
      "mdi:desk",
      "mdi:television",
      "mdi:table-chair",
      "mdi:door-open",
      "mdi:account",
    ];
    const draftIcon = iconChoices.includes(this._presetDraftIcon) ? this._presetDraftIcon : "mdi:crosshairs-gps";
    const editor = this._presetEditorOpen ? `
      <div class="preset-editor">
        <input class="preset-name-input" type="text" placeholder="${this._escapeHtml(this._t("preset_name_placeholder"))}" aria-label="${this._escapeHtml(this._t("preset_name"))}" value="${this._escapeHtml(this._presetDraftName || "")}" />
        <div class="preset-icon-picker" role="radiogroup" aria-label="${this._escapeHtml(this._t("preset_icon"))}">
          ${iconChoices.map((icon, index) => `
            <button class="preset-icon-option ${icon === draftIcon ? "active" : ""}" data-preset-icon="${this._escapeHtml(icon)}" type="button" role="radio" aria-checked="${icon === draftIcon ? "true" : "false"}" aria-label="${this._escapeHtml(icon.replace("mdi:", "").replaceAll("-", " "))}">
              <ha-icon icon="${this._escapeHtml(icon)}"></ha-icon>
            </button>
          `).join("")}
        </div>
        <button class="preset-action" data-preset-save>${this._t("save")}</button>
        <button class="preset-action" data-preset-cancel>${this._t("cancel")}</button>
      </div>
    ` : "";

    return `
      <div class="direction-presets">
        <div class="direction-presets-row">
          ${presets.length ? presets.map((preset) => {
            const confirmingDelete = this._pendingPresetDeleteId === preset.id;
            return `
            <div class="direction-preset-item ${confirmingDelete ? "confirm-delete" : ""}">
              <button class="direction-preset-button" ${confirmingDelete ? `data-preset-delete-confirm="${this._escapeHtml(preset.id)}" title="${this._escapeHtml(this._t("delete_direction_preset"))}"` : `data-preset-apply="${this._escapeHtml(preset.id)}" title="${this._escapeHtml(`${preset.direction}\u00b0 ${this._t("direction")}`)}"`} ${disabled}>
                ${confirmingDelete ? "" : `<ha-icon icon="${this._escapeHtml(preset.icon)}"></ha-icon>`}
                <span>${confirmingDelete ? this._t("delete_confirm") : this._escapeHtml(preset.name)}</span>
              </button>
              <button class="direction-preset-remove" data-preset-remove="${this._escapeHtml(preset.id)}" aria-label="${confirmingDelete ? this._escapeHtml(this._t("delete_direction_preset")) : this._escapeHtml(`${this._t("remove_prefix")} ${preset.name}`)}">${confirmingDelete ? "×" : "×"}</button>
            </div>
          `;
          }).join("") : `<span class="direction-presets-empty">${this._t("no_direction_presets_saved")}</span>`}
        </div>
        ${editor}
      </div>
    `;
  }

  _renderToggleButton(className, label, icon, active, disabled = false) {
    return `
      <button class="control-pill ${active ? "active" : ""}" ${disabled ? "disabled" : ""} data-control="${className}">
        <ha-icon icon="${icon}"></ha-icon>
        <span>${label}</span>
      </button>
    `;
  }

  _renderTimerButton(minutes, label, activeMinutes) {
    const active = Number(activeMinutes) === minutes;
    return `
      <button class="timer-chip ${active ? "active" : ""}" data-timer="${minutes}">
        ${label}
      </button>
    `;
  }

  _renderWidthOption(preset, currentWidth) {
    const label = preset === 0 ? this._t("direct") : `${preset}\u00b0`;
    return `<option value="${preset}" ${currentWidth === preset ? "selected" : ""}>${label}</option>`;
  }

  _renderSweepButton(preset, currentWidth, disabled = false) {
    const active = currentWidth === preset;
    const label = preset === 0 ? "0" : preset === 350 ? "350" : `${preset}`;
    const title = preset === 0 ? this._t("direct") : preset === 350 ? this._t("wide_sweep") : `${preset}\u00b0 ${this._t("sweep")}`;
    return `<button class="sweep-dial-option sweep-dial-option--${preset} ${active ? "active" : ""}" data-sweep-width="${preset}" title="${this._escapeHtml(title)}" aria-label="${this._escapeHtml(title)}" ${disabled ? "disabled" : ""}>
      <span>${label}</span>
    </button>`;
  }

  _renderDirectionPresetMarkers() {
    const markerSize = 30;
    const markerRadius = 128;
    return this._directionPresets().map((preset) => {
      const point = this._pointForAngle(160, 160, markerRadius, this._visualAngleFromDevice(preset.direction));
      const icon = String(preset.icon || "mdi:crosshairs-gps").trim() || "mdi:crosshairs-gps";
      return `
        <div
          class="wheel-preset-marker"
          style="
            left: ${((point.x / 320) * 100).toFixed(4)}%;
            top: ${((point.y / 320) * 100).toFixed(4)}%;
            width: ${markerSize}px;
            height: ${markerSize}px;
          "
          title="${this._escapeHtml(`${preset.name} ${preset.direction}\u00b0`)}"
        >
          <ha-icon icon="${this._escapeHtml(icon)}"></ha-icon>
        </div>
      `;
    }).join("");
  }

  _escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  _formatDebugValue(value) {
    if (value === undefined) return "undefined";
    if (value === null) return "null";
    if (typeof value === "string") return value;
    return JSON.stringify(value, null, 2);
  }

  _renderDebugRow(label, value) {
    return `
      <div class="debug-row">
        <div class="debug-label">${this._escapeHtml(label)}</div>
        <pre class="debug-value">${this._escapeHtml(this._formatDebugValue(value))}</pre>
      </div>
    `;
  }

  _renderEntityDebug(entityId) {
    const stateObj = this._stateObj(entityId);
    const attributes = stateObj?.attributes || {};
    return `
      <details class="debug-entity">
        <summary>
          <span>${this._escapeHtml(entityId)}</span>
          <strong>${this._escapeHtml(stateObj?.state ?? "missing")}</strong>
        </summary>
        <div class="debug-entity-body">
          ${this._renderDebugRow("friendly_name", attributes.friendly_name || "")}
          ${this._renderDebugRow("unit", attributes.unit_of_measurement || "")}
          ${this._renderDebugRow("device_class", attributes.device_class || "")}
          ${this._renderDebugRow("state_class", attributes.state_class || "")}
          ${this._renderDebugRow("attributes", attributes)}
        </div>
      </details>
    `;
  }

  _renderDebugPanel(entityId, attributes, bounds, direction, width, controlReady) {
    if (!this._config.show_debug) return "";
    const relatedEntities = this._derived?.relatedEntities || [];
    const debugEntities = Array.from(new Set([
      entityId,
      this._temperatureEntity(),
      this._humidityEntity(),
      this._airQualityEntity(),
      this._vocEntity(),
      this._nightModeEntity(),
      ...this._filterEntities(),
      this._oscillationSelectEntity(),
      this._derived?.oscillationLowEntity || "",
      this._derived?.oscillationHighEntity || "",
      this._oscillationCenterEntity(),
      this._oscillationAngleEntity(),
      ...relatedEntities,
    ].filter(Boolean))).sort();

    const derivedDebug = {
      control_ready: controlReady,
      device_id: this._deviceId(),
      device_name: this._derived?.device?.name_by_user || this._derived?.device?.name || "",
      temperature_entity: this._temperatureEntity(),
      humidity_entity: this._humidityEntity(),
      air_quality_entity: this._airQualityEntity(),
      voc_entity: this._vocEntity(),
      night_mode_entity: this._nightModeEntity(),
      climate_entity: this._climateEntity(),
      filter_entities: this._filterEntities(),
      oscillation_select_entity: this._oscillationSelectEntity(),
      oscillation_low_entity: this._derived?.oscillationLowEntity || "",
      oscillation_high_entity: this._derived?.oscillationHighEntity || "",
      oscillation_center_entity: this._oscillationCenterEntity(),
      oscillation_span_entity: this._oscillationAngleEntity(),
      sleep_timer_entity: this._sleepTimerEntity(),
      related_entity_count: relatedEntities.length,
    };

    const computedDebug = {
      source_direction: this._sourceDirection(attributes),
      source_width: this._sourceWidth(attributes),
      rendered_direction: direction,
      rendered_width: width,
      bounds,
      oscillation_enabled: this._oscillationEnabled(attributes),
      pending_active: this._pendingActive(),
      pending_direction: this._pendingDirection,
      pending_width: this._pendingWidth,
      pending_label: this._pendingLabel,
      pending_speed: this._pendingSpeed,
      pending_speed_active: this._pendingSpeedActive(),
      busy: this._busy,
      dragging: this._draggingDial,
    };

    return `
      <details class="debug-panel">
        <summary>
          <span>Live Dyson Debug</span>
          <strong>${debugEntities.length} entities</strong>
        </summary>
        <div class="debug-grid">
          ${this._renderDebugRow("config", this._config)}
          ${this._renderDebugRow("derived", derivedDebug)}
          ${this._renderDebugRow("computed", computedDebug)}
          ${this._renderDebugRow("fan_attributes", attributes)}
        </div>
        <div class="debug-entities">
          ${debugEntities.map((debugEntityId) => this._renderEntityDebug(debugEntityId)).join("")}
        </div>
      </details>
    `;
  }

  async _setPower(nextState) {
    if (!this._hass || !this._config.entity || this._busy) return;
    this._busy = true;
    this._render();
    try {
      await this._hass.callService("fan", nextState === "on" ? "turn_on" : "turn_off", {
        entity_id: this._config.entity,
      });
    } finally {
      this._busy = false;
      this._render();
    }
  }

  async _setAutoMode(enabled) {
    const attributes = this._stateObj(this._config.entity)?.attributes || {};
    if (!this._hass || !this._config.entity || this._busy || !this._supportsAutoMode(attributes)) return;
    this._busy = true;
    this._render();
    try {
      const presetMode = enabled
        ? this._resolvePresetModeValue(attributes, "auto", "auto")
        : this._resolveManualPresetMode(attributes);
      await this._hass.callService("fan", "set_preset_mode", {
        entity_id: this._config.entity,
        preset_mode: presetMode,
      });
    } finally {
      this._busy = false;
      this._render();
    }
  }

  async _setFanMode(mode) {
    if (!this._hass || !this._config.entity || this._busy || !mode) return;
    this._busy = true;
    this._render();
    try {
      await this._hass.callService("fan", "set_preset_mode", {
        entity_id: this._config.entity,
        preset_mode: mode,
      });
    } finally {
      this._busy = false;
      this._render();
    }
  }

  async _setHeatMode(mode) {
    const entityId = this._climateEntity();
    if (!this._hass || !entityId || this._busy || !mode) return;
    this._busy = true;
    this._render();
    try {
      await this._hass.callService("climate", "set_hvac_mode", {
        entity_id: entityId,
        hvac_mode: mode,
      });
    } finally {
      this._busy = false;
      this._render();
    }
  }

  async _setTargetTemperature(temperature) {
    const entityId = this._climateEntity();
    const value = Number(temperature);
    if (!this._hass || !entityId || this._busy || !Number.isFinite(value)) return;
    this._busy = true;
    this._render();
    try {
      await this._hass.callService("climate", "set_temperature", {
        entity_id: entityId,
        temperature: value,
      });
    } finally {
      this._busy = false;
      this._render();
    }
  }

  async _adjustTargetTemperature(delta) {
    const climateAttributes = this._climateAttributes();
    const current = this._targetTemperature(climateAttributes);
    if (current === null) return;
    const step = Number(climateAttributes.target_temp_step ?? 1);
    const min = Number(climateAttributes.min_temp ?? 1);
    const max = Number(climateAttributes.max_temp ?? 37);
    const next = current + delta * (Number.isFinite(step) && step > 0 ? step : 1);
    const clamped = Math.min(Number.isFinite(max) ? max : next, Math.max(Number.isFinite(min) ? min : next, next));
    await this._setTargetTemperature(Number(clamped.toFixed(1)));
  }

  async _setNightMode(enabled) {
    const entityId = this._nightModeEntity();
    if (!this._hass || !entityId || this._busy) return;
    this._busy = true;
    this._render();
    try {
      await this._hass.callService("switch", enabled ? "turn_on" : "turn_off", {
        entity_id: entityId,
      });
    } finally {
      this._busy = false;
      this._render();
    }
  }

  async _setFanSpeed(percentage) {
    const attributes = this._stateObj(this._config.entity)?.attributes || {};
    if (!this._hass || !this._config.entity || this._busy || !this._supportsFanSpeed(attributes)) return;
    const normalizedPercentage = Math.max(0, Math.min(100, Math.round(Number(percentage))));
    if (this._sourceSpeed(attributes) === normalizedPercentage && !this._pendingSpeedActive()) return;
    this._busy = true;
    this._setPendingSpeed(normalizedPercentage);
    this._render();
    try {
      await this._hass.callService("fan", "set_percentage", {
        entity_id: this._config.entity,
        percentage: normalizedPercentage,
      });
    } catch (error) {
      this._clearPendingSpeed(false);
      throw error;
    } finally {
      this._busy = false;
      this._render();
    }
  }

  async _setAirflowDirection(direction) {
    const attributes = this._stateObj(this._config.entity)?.attributes || {};
    if (!this._hass || !this._config.entity || this._busy || !this._supportsFanDirection(attributes)) return;
    if (this._fanDirection(attributes) === direction) return;
    this._busy = true;
    this._render();
    try {
      await this._hass.callService("fan", "set_direction", {
        entity_id: this._config.entity,
        direction,
      });
    } finally {
      this._busy = false;
      this._render();
    }
  }

  async _setSleepTimer(minutes) {
    const deviceId = this._deviceId();
    const hasSleepTimer = Boolean(this._sleepTimerEntity()) || Number.isFinite(Number(this._stateObj(this._config.entity)?.attributes?.sleep_timer));
    if (!this._hass || !deviceId || this._busy || !hasSleepTimer) return;
    const currentMinutes = Number(this._stateObj(this._config.entity)?.attributes?.sleep_timer || 0);
    if (Number.isFinite(currentMinutes) && currentMinutes === Number(minutes)) return;
    this._busy = true;
    this._render();
    try {
      await this._hass.callService("hass_dyson", "set_sleep_timer", {
        device_id: deviceId,
        minutes,
      });
    } finally {
      this._busy = false;
      this._render();
    }
  }

  async _commitDirection(direction, width) {
    const deviceId = this._deviceId();
    if (!this._hass || !deviceId || this._busy) return;
    const bounds = this._boundsFromCenterWidth(direction, width);
    const { lower, upper, center, width: normalizedWidth } = bounds;
    const directMode = normalizedWidth === 0;
    const fanOn = this._stateObj(this._config.entity)?.state === "on";
    const currentDirection = this._currentDirection(this._stateObj(this._config.entity)?.attributes || {});
    const currentWidth = this._currentWidth(this._stateObj(this._config.entity)?.attributes || {});
    if (!this._pendingActive() && this._directionWidthMatches(center, normalizedWidth, currentDirection, currentWidth)) return;

    this._busy = true;
    if (fanOn) {
      this._setPendingDirection(center, normalizedWidth, directMode ? this._t("point_fan") : this._t("apply_angle"));
    } else {
      this._setOptimisticDirection(center, normalizedWidth);
    }
    this._render();

    try {
      if (directMode) {
        if (fanOn) {
          await this._hass.callService("fan", "oscillate", {
            entity_id: this._config.entity,
            oscillating: false,
          });
        }
        await this._hass.callService("hass_dyson", "set_oscillation_angles", {
          device_id: deviceId,
          lower_angle: center,
          upper_angle: center,
        });
      } else if (this._oscillationCenterEntity()) {
        await this._hass.callService("number", "set_value", {
          entity_id: this._oscillationCenterEntity(),
          value: center,
        });
        if (fanOn) {
          await this._hass.callService("fan", "oscillate", {
            entity_id: this._config.entity,
            oscillating: true,
          });
        }
      } else {
        await this._hass.callService("hass_dyson", "set_oscillation_angles", {
          device_id: deviceId,
          lower_angle: lower,
          upper_angle: upper,
        });
        if (fanOn) {
          await this._hass.callService("fan", "oscillate", {
            entity_id: this._config.entity,
            oscillating: true,
          });
        }
      }
      this._settleDirectionCommand(center, normalizedWidth, false);
    } catch (error) {
      this._clearPending(false);
      this._clearOptimisticDirection(false);
      throw error;
    } finally {
      this._busy = false;
      this._draftDirection = null;
      this._draftWidth = null;
      this._render();
    }
  }

  _angleFromPointer(event, element) {
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = x - cx;
    const dy = cy - y;
    const radians = Math.atan2(dx, dy);
    const degrees = (radians * 180) / Math.PI;
    return this._deviceAngleFromVisual(degrees);
  }

  _isPointerOnHandle(event, element, direction) {
    const rect = element.getBoundingClientRect();
    if (!rect.width) return false;
    const scale = rect.width / 320;
    const handle = this._pointForAngle(160, 160, 128, this._visualAngleFromDevice(direction));
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;
    const distance = Math.hypot(x - handle.x, y - handle.y);
    return distance <= 28;
  }

  _bindWheel(attributes) {
    const wheel = this.shadowRoot?.querySelector(".wheel-button");
    const handleTarget = this.shadowRoot?.querySelector(".wheel-handle-hit");
    if (!wheel || !handleTarget || !this._deviceId()) return;

    const currentWidth = this._currentWidth(attributes);
    let draftDirection = this._currentDirection(attributes);

    const updateDraft = (event) => {
      draftDirection = this._angleFromPointer(event, wheel);
      this._draftDirection = draftDirection;
      this._draftWidth = currentWidth;
      this._updateDialPreview(draftDirection, currentWidth);
    };

    handleTarget.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this._draggingDial = true;
      handleTarget.setPointerCapture?.(event.pointerId);
      updateDraft(event);
    });

    handleTarget.addEventListener("pointermove", (event) => {
      if (!this._draggingDial) return;
      event.preventDefault();
      updateDraft(event);
    });

    const finish = async (event) => {
      if (!this._draggingDial) return;
      event.preventDefault();
      this._draggingDial = false;
      handleTarget.releasePointerCapture?.(event.pointerId);
      updateDraft(event);
      await this._commitDirection(draftDirection, currentWidth);
    };

    handleTarget.addEventListener("pointerup", finish);
    handleTarget.addEventListener("pointercancel", () => {
      this._draggingDial = false;
      this._draftDirection = null;
      this._draftWidth = null;
      this._render();
    });
  }

  _bindControls(attributes, powerState) {
    this._bindWheel(attributes);

    this.shadowRoot?.querySelector(".power-button")?.addEventListener("click", async () => {
      this._clearPresetDeleteArm();
      await this._setPower(powerState === "On" ? "off" : "on");
    });

    this.shadowRoot?.querySelector("[data-control='auto']")?.addEventListener("click", async () => {
      this._clearPresetDeleteArm();
      await this._setAutoMode(!this._isAutoMode(attributes.preset_mode || attributes.mode, attributes));
    });

    this.shadowRoot?.querySelectorAll("[data-hvac-mode]")?.forEach((button) => {
      button.addEventListener("click", async () => {
        this._clearPresetDeleteArm();
        await this._setHeatMode(button.dataset.hvacMode);
      });
    });

    this.shadowRoot?.querySelectorAll("[data-temp-step]")?.forEach((button) => {
      button.addEventListener("click", async () => {
        this._clearPresetDeleteArm();
        await this._adjustTargetTemperature(Number(button.dataset.tempStep));
      });
    });

    this.shadowRoot?.querySelector(".target-temp-input")?.addEventListener("change", async (event) => {
      this._clearPresetDeleteArm();
      await this._setTargetTemperature(event.target.value);
    });

    this.shadowRoot?.querySelector("[data-control='night']")?.addEventListener("click", async () => {
      this._clearPresetDeleteArm();
      await this._setNightMode(!this._nightModeOn(attributes));
    });

    const speedControl = this.shadowRoot?.querySelector(".speed-control");
    const speedSlider = this.shadowRoot?.querySelector(".speed-slider");
    const updateSpeedPreview = (nextSpeed) => {
      this._setPendingSpeed(nextSpeed);
      if (speedSlider) {
        speedSlider.value = String(nextSpeed);
      }
      this.shadowRoot?.querySelectorAll(".speed-control").forEach((node) => {
        node.style.setProperty("--speed-fill", `${nextSpeed}%`);
      });
      this.shadowRoot?.querySelectorAll(".speed-value").forEach((node) => {
        node.textContent = `${nextSpeed}%`;
      });
    };
    const speedFromPointer = (event) => {
      const rect = speedControl?.getBoundingClientRect();
      if (!rect?.height) return this._currentSpeed(attributes);
      const raw = 100 - (((event.clientY - rect.top) / rect.height) * 100);
      return this._clamp(Math.round(raw / 10) * 10, 0, 100);
    };
    let speedDragging = false;
    speedControl?.addEventListener("pointerdown", (event) => {
      if (!this._supportsFanSpeed(attributes)) return;
      this._clearPresetDeleteArm();
      event.preventDefault();
      speedDragging = true;
      try {
        speedControl.setPointerCapture?.(event.pointerId);
      } catch (_error) {
        // Synthetic/test pointer events may not have an active capture target.
      }
      updateSpeedPreview(speedFromPointer(event));
    });
    speedControl?.addEventListener("pointermove", (event) => {
      if (!speedDragging) return;
      event.preventDefault();
      updateSpeedPreview(speedFromPointer(event));
    });
    speedControl?.addEventListener("pointerup", async (event) => {
      if (!speedDragging) return;
      event.preventDefault();
      speedDragging = false;
      try {
        speedControl.releasePointerCapture?.(event.pointerId);
      } catch (_error) {
        // Ignore capture release failures from synthetic/test pointer events.
      }
      const nextSpeed = speedFromPointer(event);
      updateSpeedPreview(nextSpeed);
      await this._setFanSpeed(nextSpeed);
    });
    speedControl?.addEventListener("pointercancel", () => {
      speedDragging = false;
      this._clearPendingSpeed();
    });
    speedSlider?.addEventListener("change", async (event) => {
      this._clearPresetDeleteArm();
      const nextSpeed = this._clamp(Math.round(Number(event.target.value) / 10) * 10, 0, 100);
      updateSpeedPreview(nextSpeed);
      await this._setFanSpeed(nextSpeed);
    });

    this.shadowRoot?.querySelectorAll("[data-direction]")?.forEach((button) => {
      button.addEventListener("click", async () => {
        this._clearPresetDeleteArm();
        await this._setAirflowDirection(button.dataset.direction);
      });
    });

    this.shadowRoot?.querySelector("[data-direction-toggle]")?.addEventListener("click", async () => {
      this._clearPresetDeleteArm();
      const nextDirection = this._fanDirection(attributes) === "forward" ? "reverse" : "forward";
      await this._setAirflowDirection(nextDirection);
    });

    this.shadowRoot?.querySelectorAll("[data-timer]")?.forEach((button) => {
      button.addEventListener("click", async () => {
        this._clearPresetDeleteArm();
        this._timerMenuOpen = false;
        this._customTimerOpen = false;
        await this._setSleepTimer(Number(button.dataset.timer));
      });
    });

    this.shadowRoot?.querySelector("[data-timer-toggle]")?.addEventListener("click", () => {
      this._clearPresetDeleteArm();
      this._timerMenuOpen = !this._timerMenuOpen;
      if (!this._timerMenuOpen) {
        this._customTimerOpen = false;
      }
      this._render();
    });

    this.shadowRoot?.querySelector("[data-timer-custom]")?.addEventListener("click", () => {
      this._clearPresetDeleteArm();
      this._timerMenuOpen = true;
      this._customTimerOpen = true;
      this._render();
    });

    this.shadowRoot?.querySelector("[data-timer-cancel]")?.addEventListener("click", () => {
      this._clearPresetDeleteArm();
      this._customTimerOpen = false;
      this._render();
    });

    this.shadowRoot?.querySelector("[data-timer-set]")?.addEventListener("click", async () => {
      this._clearPresetDeleteArm();
      const input = this.shadowRoot?.querySelector(".timer-custom-input");
      const requestedHours = Number(input?.value);
      if (!Number.isFinite(requestedHours) || requestedHours <= 0) return;
      const hours = Math.max(1, Math.min(9, Math.round(requestedHours)));
      this._timerMenuOpen = false;
      this._customTimerOpen = false;
      await this._setSleepTimer(hours * 60);
    });

    this.shadowRoot?.querySelector("[data-preset-add]")?.addEventListener("click", () => {
      this._pendingPresetDeleteId = null;
      this._presetDraftName = "";
      this._presetDraftIcon = "mdi:crosshairs-gps";
      this._presetEditorOpen = true;
      this._render();
    });

    this.shadowRoot?.querySelector("[data-preset-cancel]")?.addEventListener("click", () => {
      this._presetEditorOpen = false;
      this._presetDraftName = "";
      this._presetDraftIcon = "mdi:crosshairs-gps";
      this._pendingPresetDeleteId = null;
      this._render();
    });

    this.shadowRoot?.querySelector(".preset-name-input")?.addEventListener("input", (event) => {
      this._presetDraftName = event.target.value || "";
    });

    this.shadowRoot?.querySelectorAll("[data-preset-icon]")?.forEach((button) => {
      button.addEventListener("click", () => {
        this._presetDraftIcon = button.dataset.presetIcon || "mdi:crosshairs-gps";
        this.shadowRoot?.querySelectorAll("[data-preset-icon]")?.forEach((candidate) => {
          candidate.classList.toggle("active", candidate === button);
          candidate.setAttribute("aria-checked", candidate === button ? "true" : "false");
        });
      });
    });

    this.shadowRoot?.querySelector("[data-preset-save]")?.addEventListener("click", () => {
      this._syncPresetDraftFromEditor();
      const name = this._presetDraftName || this.shadowRoot?.querySelector(".preset-name-input")?.value;
      const icon = this._presetDraftIcon || this.shadowRoot?.querySelector("[data-preset-icon].active")?.dataset?.presetIcon || "mdi:crosshairs-gps";
      this._addDirectionPreset(
        name,
        icon,
        this._currentDirection(attributes),
      );
      this._presetEditorOpen = false;
      this._presetDraftName = "";
      this._presetDraftIcon = "mdi:crosshairs-gps";
      this._pendingPresetDeleteId = null;
      this._render();
    });

    this.shadowRoot?.querySelectorAll("[data-preset-delete-confirm]")?.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        this._removeDirectionPreset(button.dataset.presetDeleteConfirm);
        this._render();
      });
    });

    this.shadowRoot?.querySelectorAll("[data-preset-apply]")?.forEach((button) => {
      button.addEventListener("click", async () => {
        const preset = this._directionPresets().find((candidate) => candidate.id === button.dataset.presetApply);
        if (!preset) return;
        if (this._pendingPresetDeleteId) {
          this._pendingPresetDeleteId = null;
          this._render();
          return;
        }
        await this._commitDirection(preset.direction, this._currentWidth(attributes));
      });
    });

    this.shadowRoot?.querySelectorAll("[data-preset-remove]")?.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        if (this._pendingPresetDeleteId === button.dataset.presetRemove) {
          this._removeDirectionPreset(button.dataset.presetRemove);
        } else {
          this._pendingPresetDeleteId = button.dataset.presetRemove;
        }
        this._render();
      });
    });

    this.shadowRoot?.querySelectorAll("[data-sweep-width]")?.forEach((button) => {
      button.addEventListener("click", async () => {
        this._clearPresetDeleteArm();
        await this._setSweepWidth(Number(button.dataset.sweepWidth), attributes);
      });
    });

    this.shadowRoot?.querySelector("[data-sensor-more]")?.addEventListener("click", (event) => {
      event.stopPropagation();
      this._clearPresetDeleteArm();
      this._sensorDetailsOpen = !this._sensorDetailsOpen;
      this._render();
    });

    this.shadowRoot?.querySelector(".card")?.addEventListener("click", (event) => {
      const target = event.target;
      if (target?.closest?.(".direction-preset-item")) return;
      if (this._clearPresetDeleteArm()) {
        this._render();
      }
    });
  }

  async _setSweepWidth(width, attributes) {
    if (!this._hass || this._busy) return;
    const normalizedWidth = this._normalizeAngle(width);
    const direction = this._currentDirection(attributes);
    if (!this._pendingActive() && this._normalizeAngle(this._currentWidth(attributes)) === normalizedWidth) return;

    if (normalizedWidth === 0) {
      await this._commitDirection(direction, 0);
      return;
    }

    const selectEntity = this._oscillationSelectEntity();
    const option = `${normalizedWidth}\u00b0`;
    const options = this._stateObj(selectEntity)?.attributes?.options || [];
    if (selectEntity && options.includes(option)) {
      const fanOn = this._stateObj(this._config.entity)?.state === "on";
      this._busy = true;
      if (fanOn) {
        this._setPendingDirection(direction, normalizedWidth, `${this._t("apply_sweep")} ${option} ${this._t("sweep")}`);
      } else {
        this._setOptimisticDirection(direction, normalizedWidth);
      }
      this._render();
      try {
        await this._hass.callService("select", "select_option", {
          entity_id: selectEntity,
          option,
        });
        if (fanOn) {
          await this._hass.callService("fan", "oscillate", {
            entity_id: this._config.entity,
            oscillating: true,
          });
        }
        this._settleDirectionCommand(direction, normalizedWidth, false);
      } catch (error) {
        this._clearPending(false);
        this._clearOptimisticDirection(false);
        throw error;
      } finally {
        this._busy = false;
        this._render();
      }
      return;
    }

    await this._commitDirection(direction, normalizedWidth);
  }

  _render() {
    if (!this.shadowRoot) return;

    const entityId = this._config.entity;
    const fan = entityId ? this._hass?.states?.[entityId] : null;

    if (!entityId) {
      this.shadowRoot.innerHTML = `<ha-card><div class="error">${this._t("set_dyson_entity")}</div></ha-card>`;
      return;
    }

    if (!fan) {
      this.shadowRoot.innerHTML = `
        <ha-card>
          <div class="error">
            ${this._t("entity_not_found_prefix")} ${entityId} ${this._t("entity_not_found_suffix")}
          </div>
        </ha-card>
      `;
      return;
    }

    const title = String(this._config.title || "").trim();
    const attributes = fan.attributes || {};
    const powerState = fan.state === "on" ? "On" : "Off";
    const mode = attributes.preset_mode || attributes.mode || "Unknown";
    const climateAttributes = this._climateAttributes();
    const heatMode = this._stateValue(this._climateEntity(), "");
    const heatModes = this._heatModes(climateAttributes);
    const targetTemperature = this._targetTemperature(climateAttributes);
    const minTemp = Number(climateAttributes.min_temp ?? 1);
    const maxTemp = Number(climateAttributes.max_temp ?? 37);
    const targetTempStep = Number(climateAttributes.target_temp_step ?? 1);
    const tempUnit = climateAttributes.temperature_unit || this._unit(this._temperatureEntity(), "\u00b0");
    const temp = this._stateValue(this._temperatureEntity(), "");
    const humidity = this._stateValue(this._humidityEntity(), "");
    const aqi = this._sensorDetailItem("AQI", ["aqi", "air_quality", "air quality"])?.value || "";
    const aqiTone = aqi ? this._qualityTone(this._qualityLabel(aqi)) : "neutral";
    const speedPercent = this._currentSpeed(attributes);
    const filterPercent = this._filterPercent();
    const timerLabel = this._timerLabel(attributes);
    const activeTimer = Number(attributes.sleep_timer || 0);
    const autoActive = this._isAutoMode(mode, attributes);
    const autoAvailable = this._supportsAutoMode(attributes);
    const nightActive = this._nightModeOn(attributes);
    const airflowDirection = this._fanDirection(attributes);
    const airflowDirectionAvailable = this._supportsFanDirection(attributes);
    const speedAvailable = this._supportsFanSpeed(attributes);
    const airflowControlSide = String(this._config.airflow_control_side || "right").toLowerCase() === "left" ? "left" : "right";
    const speedOnLeft = airflowControlSide === "left";
    const direction = this._currentDirection(attributes);
    const width = this._currentWidth(attributes);
    const sensorDetailGroups = this._sensorDetailGroups();
    const bounds = this._boundsFromCenterWidth(direction, width);
    const visualCenter = this._visualAngleFromDevice(bounds.center);
    const handle = this._pointForAngle(160, 160, 128, visualCenter);
    const presetWidths = [0, 45, 90, 180, 350];
    const controlReady = Boolean(this._deviceId());
    const operationActive = this._busy || this._pendingActive();
    const operationLabel = this._busy
      ? this._pendingLabel || this._t("applying")
      : this._pendingActive()
        ? this._pendingLabel || this._t("waiting_for_device")
        : "";
    const hideUnsupported = Boolean(this._config.hide_unsupported);
    const hideEmptySensors = Boolean(this._config.hide_empty_sensors);
    const sensorDetailLayout = this._sensorDetailLayout();
    const nightAvailable = Boolean(this._nightModeEntity());
    const sleepTimerAvailable = Boolean(this._sleepTimerEntity()) || Number.isFinite(Number(attributes.sleep_timer));
    const heatAvailable = this._climateEntity() && this._hasHeatMode(heatModes, "heat");
    const fanOnlyAvailable = this._climateEntity() && this._hasHeatMode(heatModes, "fan_only");
    const targetTempAvailable = this._climateEntity() && targetTemperature !== null;
    const showSaveControl = !hideUnsupported || controlReady;
    const showAutoControl = !hideUnsupported || autoAvailable;
    const showNightControl = !hideUnsupported || nightAvailable;
    const showControlGrid = showSaveControl || showAutoControl || showNightControl;
    const showAirflowControl = airflowDirectionAvailable;
    const showSleepTimerControl = !hideUnsupported || sleepTimerAvailable;
    const showDirectionRow = showAirflowControl || showSleepTimerControl;
    const showModeRow = (!hideUnsupported) || heatAvailable || fanOnlyAvailable || targetTempAvailable;
    const hideEmptyData = hideUnsupported || hideEmptySensors;
    const hasTempValue = this._hasMeaningfulValue(temp);
    const hasHumidityValue = this._hasMeaningfulValue(humidity);
    const hasAqiValue = this._hasMeaningfulValue(aqi);
    const showTempBadge = hideEmptyData ? hasTempValue : true;
    const showHumidityBadge = hideEmptyData ? hasHumidityValue : true;
    const showAqiBadge = hideEmptyData ? hasAqiValue : true;
    const showFilterBadge = hideEmptyData ? filterPercent !== null : true;
    const sensorDetailItems = sensorDetailGroups
      .flatMap((group) => Array.isArray(group.items) ? group.items : [])
      .filter((item) => item && this._hasMeaningfulValue(item.value));
    const inlineSensorDetails = sensorDetailLayout === "inline" ? sensorDetailItems : [];
    const primarySensorBadgeCount = (showTempBadge ? 1 : 0) + (showHumidityBadge ? 1 : 0) + (showAqiBadge ? 1 : 0) + (showFilterBadge ? 1 : 0);
    const sensorDetailItemCount = sensorDetailItems.length;
    const totalSensorItemCount = primarySensorBadgeCount + sensorDetailItemCount;
    const moreButtonThreshold = this._clamp(Math.round(Number(this._config.sensor_more_button_threshold || 4)), 1, 20);
    const showSensorMoreButton = sensorDetailLayout === "panel" && sensorDetailGroups.length > 0 && totalSensorItemCount > moreButtonThreshold;
    const showSensorStrip = primarySensorBadgeCount > 0 || sensorDetailItems.length > 0 || sensorDetailGroups.length > 0;
    const showDirectionPresets = !hideUnsupported || controlReady;
    const travelPath = this._sectorPath(160, 160, 128, 5, 355);
    const travelRingPath = this._arcPath(160, 160, 128, 5, 355);
    const lowerLimitInner = this._pointForAngle(160, 160, 54, 5);
    const lowerLimitOuter = this._pointForAngle(160, 160, 132, 5);
    const upperLimitInner = this._pointForAngle(160, 160, 54, 355);
    const upperLimitOuter = this._pointForAngle(160, 160, 132, 355);
    const conePath = bounds.width
      ? this._sectorPath(160, 160, 128, this._visualAngleFromDevice(bounds.lower), this._visualAngleFromDevice(bounds.upper))
      : "";
    const directPath = this._arcPath(160, 160, 116, visualCenter - 1, visualCenter + 1);

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }
        ha-card {
          --dyson-panel-bg: color-mix(in srgb, var(--card-background-color, #fff) 94%, #000 6%);
          --dyson-field-bg: color-mix(in srgb, var(--card-background-color, #fff) 84%, transparent);
          --dyson-raised-bg: var(--card-background-color, #fff);
          --dyson-pill-bg: color-mix(in srgb, var(--card-background-color, #fff) 90%, var(--primary-text-color) 5%);
          --dyson-active-bg: color-mix(in srgb, var(--primary-color, #4f46e5) 16%, var(--card-background-color, #fff));
          --dyson-control-bg: color-mix(in srgb, var(--card-background-color, #fff) 92%, #000 8%);
          --dyson-inset-bg: color-mix(in srgb, var(--card-background-color, #fff) 84%, #000 16%);
          --dyson-panel-surface: color-mix(in srgb, var(--dyson-panel-bg) 72%, transparent);
          --dyson-wheel-bg: color-mix(in srgb, var(--card-background-color, #ffffff) 78%, var(--primary-text-color) 22%);
          --dyson-cone-bg: color-mix(in srgb, var(--primary-color, #4f46e5) 22%, transparent);
          --dyson-border: var(--divider-color);
          --dyson-soft-border: color-mix(in srgb, var(--divider-color) 72%, transparent);
          --dyson-shadow: 0 4px 12px color-mix(in srgb, #000 16%, transparent);
          --dyson-inner-highlight: inset 0 1px 0 color-mix(in srgb, var(--primary-text-color) 5%, transparent);
          padding: 12px;
          margin-block-end: max(12px, env(safe-area-inset-bottom));
          border-radius: 18px;
          overflow: hidden;
          color: var(--primary-text-color);
        }
        @media (prefers-color-scheme: dark) {
          ha-card {
            --dyson-panel-bg: #242b33;
            --dyson-field-bg: #1b222a;
            --dyson-raised-bg: #2b333d;
            --dyson-pill-bg: #28323c;
            --dyson-active-bg: #123f56;
            --dyson-control-bg: #202832;
            --dyson-inset-bg: #171d24;
            --dyson-panel-surface: var(--dyson-panel-bg);
            --dyson-wheel-bg: #505861;
            --dyson-cone-bg: rgba(3, 169, 244, 0.25);
            --dyson-border: rgba(255, 255, 255, 0.23);
            --dyson-soft-border: rgba(255, 255, 255, 0.13);
            --dyson-shadow: 0 8px 18px color-mix(in srgb, #000 34%, transparent);
            --dyson-inner-highlight: inset 0 1px 0 color-mix(in srgb, white 10%, transparent);
          }
        }
        .card {
          display: grid;
          gap: 10px;
        }
        .header {
          display: block;
        }
        .title {
          font-size: 0.96rem;
          font-weight: 700;
          line-height: 1.2;
        }
        .control-panel {
          display: grid;
          gap: 8px;
          border: 1px solid var(--dyson-soft-border);
          border-radius: 18px;
          padding: 8px;
          background: var(--dyson-panel-surface);
        }
        .control-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
        }
        .control-pill,
        .timer-chip,
        .direction-chip {
          min-width: 0;
          border: 1px solid var(--dyson-soft-border);
          border-radius: 999px;
          padding: 8px 8px;
          background: var(--dyson-pill-bg);
          color: var(--primary-text-color);
          font: inherit;
          font-size: 0.74rem;
          font-weight: 750;
          box-shadow: var(--dyson-inner-highlight);
        }
        .control-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }
        .control-pill ha-icon {
          --mdc-icon-size: 17px;
          width: 24px;
          height: 24px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: color-mix(in srgb, var(--primary-text-color) 6%, transparent);
        }
        .control-pill.active,
        .timer-chip.active,
        .direction-chip.active {
          border-color: color-mix(in srgb, var(--primary-color, #4f46e5) 34%, transparent);
          background: var(--dyson-active-bg);
          color: var(--primary-text-color);
        }
        .direction-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          align-items: stretch;
          gap: 6px;
          min-width: 0;
          border: 1px solid var(--dyson-soft-border);
          border-radius: 18px;
          padding: 6px;
          background: color-mix(in srgb, var(--dyson-field-bg) 82%, transparent);
        }
        .direction-row.single-control {
          grid-template-columns: minmax(0, 1fr);
        }
        .airflow-control,
        .sleep-timer-control {
          min-width: 0;
          display: grid;
          grid-template-rows: auto 32px;
          gap: 4px;
          padding: 3px;
        }
        .row-label {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 6px;
          color: var(--primary-text-color);
          font-size: 0.66rem;
          font-weight: 750;
          min-height: 16px;
          padding-left: 5px;
        }
        .row-label span,
        .row-label strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .timer-buttons,
        .timer-custom {
          display: grid;
          gap: 8px;
        }
        .direction-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          width: 100%;
          min-height: 34px;
          padding: 7px 10px;
          font-size: 0.68rem;
        }
        .direction-chip ha-icon {
          --mdc-icon-size: 14px;
        }
        .timer-buttons {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .timer-inline-buttons {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 4px;
          min-width: 0;
          justify-items: center;
        }
        .timer-inline-buttons .timer-chip {
          min-width: 0;
          min-height: 32px;
          width: 100%;
          padding: 6px 4px;
          font-size: 0.66rem;
        }
        .timer-plus {
          font-size: 0;
        }
        .timer-plus ha-icon {
          --mdc-icon-size: 16px;
        }
        .timer-custom {
          grid-template-columns: minmax(0, 1fr) auto auto;
          align-items: center;
        }
        .timer-custom-input,
        .target-temp-input {
          min-width: 0;
          border: 1px solid var(--dyson-border);
          border-radius: 12px;
          background: var(--dyson-raised-bg);
          color: var(--primary-text-color);
          font: inherit;
          font-size: 0.78rem;
          font-weight: 750;
        }
        .timer-custom-input {
          padding: 8px 10px;
        }
        .timer-action {
          border: 1px solid var(--dyson-border);
          border-radius: 12px;
          padding: 8px 10px;
          background: var(--dyson-raised-bg);
          color: var(--primary-text-color);
          font: inherit;
          font-size: 0.75rem;
          font-weight: 750;
        }
        .control-shell {
          display: grid;
          gap: 2px;
          justify-items: center;
        }
        .wheel-wrap {
          --dyson-speed-gutter: 52px;
          --dyson-wheel-size: min(calc(100% - var(--dyson-speed-gutter)), 304px);
          --dyson-wheel-offset: -8px;
          position: relative;
          width: 100%;
          height: auto;
        }
        .wheel-stage {
          position: relative;
          width: var(--dyson-wheel-size);
          height: auto;
          aspect-ratio: 1 / 1;
          margin: ${speedOnLeft ? "var(--dyson-wheel-offset) 0 0 var(--dyson-speed-gutter)" : "var(--dyson-wheel-offset) var(--dyson-speed-gutter) 0 0"};
        }
        .wheel-button {
          appearance: none;
          border: 0;
          padding: 0;
          background: none;
          cursor: default;
          width: 100%;
          margin: 0;
          touch-action: pan-y;
          display: block;
        }
        .wheel {
          width: 100%;
          height: auto;
          display: block;
        }
        .wheel-bg {
          fill: var(--dyson-wheel-bg);
          pointer-events: none;
        }
        .wheel-ring {
          fill: none;
          stroke: color-mix(in srgb, var(--primary-text-color, #111) 14%, transparent);
          stroke-width: 2;
          pointer-events: none;
        }
        .wheel-limit {
          stroke: color-mix(in srgb, var(--primary-text-color, #111) 28%, transparent);
          stroke-width: 3;
          stroke-linecap: round;
          pointer-events: none;
        }
        .wheel-cone {
          fill: var(--dyson-cone-bg);
          pointer-events: none;
        }
        .wheel-direct {
          fill: none;
          stroke: color-mix(in srgb, var(--primary-color, #4f46e5) 72%, white 8%);
          stroke-width: 8;
          stroke-linecap: round;
          pointer-events: none;
        }
        .wheel-preset-marker {
          position: absolute;
          transform: translate(-50%, -50%);
          z-index: 2;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: color-mix(in srgb, var(--success-color, #22c55e) 82%, transparent);
          border: 1px solid color-mix(in srgb, white 45%, transparent);
          box-shadow:
            inset 0 1px 0 color-mix(in srgb, white 42%, transparent),
            0 4px 10px color-mix(in srgb, #000 24%, transparent);
          color: white;
          pointer-events: none;
        }
        .wheel-preset-marker ha-icon {
          --mdc-icon-size: 18px;
          filter: drop-shadow(0 1px 1px color-mix(in srgb, #000 32%, transparent));
        }
        .wheel-handle {
          fill: var(--card-background-color, #fff);
          stroke: var(--primary-text-color, #111);
          stroke-width: 5;
          cursor: ${controlReady ? "grab" : "default"};
          pointer-events: none;
        }
        .wheel-handle-hit {
          position: absolute;
          left: ${((handle.x / 320) * 100).toFixed(4)}%;
          top: ${((handle.y / 320) * 100).toFixed(4)}%;
          width: 52px;
          height: 52px;
          transform: translate(-50%, -50%);
          border: 0;
          border-radius: 999px;
          padding: 0;
          background: transparent;
          cursor: ${controlReady ? "grab" : "default"};
          touch-action: none;
          z-index: 3;
        }
        .wheel-handle-hit:active {
          cursor: grabbing;
        }
        .wheel-speed {
          position: absolute;
          ${speedOnLeft ? "left: 0; right: auto;" : "right: 0; left: auto;"}
          top: calc(var(--dyson-wheel-offset) + 24px);
          bottom: 0;
          width: 42px;
          display: grid;
          grid-template-rows: minmax(0, 1fr) 13px 32px;
          gap: 6px;
          color: var(--secondary-text-color);
          font-size: 0.66rem;
          font-weight: 800;
          pointer-events: auto;
          z-index: 2;
        }
        .wheel-speed ha-icon {
          --mdc-icon-size: 15px;
          color: var(--primary-color, #4f46e5);
        }
        .speed-control {
          --speed-fill: ${speedPercent}%;
          position: relative;
          width: 42px;
          height: 100%;
          display: grid;
          place-items: center;
          border-radius: 999px;
          touch-action: none;
          filter: drop-shadow(0 5px 12px color-mix(in srgb, #000 10%, transparent));
        }
        .speed-rail {
          position: absolute;
          inset: 0 5px;
          overflow: hidden;
          border-radius: 999px;
          border: 0;
          background:
            linear-gradient(
              to top,
              color-mix(in srgb, var(--primary-color, #03a9f4) 86%, #00bcd4 14%) 0 var(--speed-fill),
              color-mix(in srgb, var(--primary-text-color) 8%, transparent) var(--speed-fill) 100%
            );
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary-text-color) 7%, transparent);
          pointer-events: none;
        }
        .speed-rail::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: var(--speed-fill);
          width: 18px;
          height: 3px;
          transform: translate(-50%, 50%);
          border-radius: 999px;
          background: color-mix(in srgb, white 92%, transparent);
          box-shadow: 0 1px 3px color-mix(in srgb, #000 14%, transparent);
          opacity: ${speedPercent > 5 && speedPercent < 95 ? "1" : "0"};
        }
        .speed-slider {
          position: relative;
          z-index: 1;
          width: 42px;
          height: 100%;
          writing-mode: vertical-lr;
          direction: rtl;
          touch-action: none;
          appearance: none;
          background: transparent;
          opacity: 0;
          pointer-events: none;
          cursor: pointer;
        }
        .speed-slider::-webkit-slider-runnable-track {
          width: 42px;
          height: 100%;
          background: transparent;
          border: 0;
        }
        .speed-slider::-webkit-slider-thumb {
          appearance: none;
          width: 1px;
          height: 1px;
          border: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
        }
        .speed-slider::-moz-range-track {
          width: 42px;
          height: 100%;
          background: transparent;
          border: 0;
        }
        .speed-slider::-moz-range-thumb {
          width: 1px;
          height: 1px;
          border: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
        }
        .speed-value {
          position: relative;
          z-index: 2;
          min-width: 0;
          padding: 0;
          border-radius: 0;
          background: transparent;
          color: var(--primary-text-color);
          text-align: center;
          font-size: 0.62rem;
          font-weight: 850;
          line-height: 1;
          pointer-events: none;
          text-shadow: none;
          box-shadow: none;
        }
        .speed-power-button {
          position: relative;
          z-index: 3;
          width: 42px;
          height: 32px;
          border: 1px solid var(--dyson-soft-border);
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          background: var(--dyson-pill-bg);
          color: var(--primary-text-color);
          box-shadow: var(--dyson-inner-highlight);
        }
        .speed-power-button.active {
          border-color: color-mix(in srgb, var(--primary-color, #4f46e5) 34%, transparent);
          background: var(--dyson-active-bg);
        }
        .speed-power-button ha-icon {
          --mdc-icon-size: 18px;
        }
        .timer-flyout {
          position: relative;
          z-index: 3;
          display: grid;
          gap: 8px;
          width: 100%;
          padding: 10px;
          border: 1px solid var(--dyson-border);
          border-radius: 14px;
          background: var(--dyson-raised-bg);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
        }
        .timer-icon-button {
          width: 46px;
          height: 34px;
          border: 1px solid var(--dyson-soft-border);
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          background: var(--dyson-pill-bg);
          color: var(--primary-text-color);
          box-shadow: var(--dyson-inner-highlight);
        }
        .timer-icon-button.active {
          border-color: transparent;
          background: color-mix(in srgb, var(--primary-color, #4f46e5) 18%, var(--card-background-color, #fff));
        }
        .timer-icon-button ha-icon {
          --mdc-icon-size: 19px;
        }
        .wheel-core {
          fill: transparent;
          stroke: none;
          pointer-events: none;
        }
        .wheel-core-inner {
          fill: transparent;
          pointer-events: none;
        }
        .wheel-spinner {
          fill: none;
          stroke: var(--primary-color, #4f46e5);
          stroke-width: 3;
          stroke-linecap: round;
          stroke-dasharray: 18 34;
          transform-origin: 160px 160px;
          animation: dyson-spin 1.6s linear infinite;
        }
        @keyframes dyson-spin {
          to {
            transform: rotate(360deg);
          }
        }
        .wheel-sensor-strip {
          width: 100%;
          max-width: 100%;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 0 6px;
          border-radius: 0;
          background: transparent;
          border: 0;
          pointer-events: auto;
          color: var(--secondary-text-color);
          font-size: 0.68rem;
          font-weight: 760;
          line-height: 1;
          z-index: 1;
        }
        .wheel-sensor-strip:not(.expanded) {
          flex-wrap: nowrap;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .wheel-sensor-strip:not(.expanded)::-webkit-scrollbar {
          display: none;
        }
        .sensor-more-button {
          pointer-events: auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          min-height: 27px;
          padding: 5px 9px;
          border: 1px solid var(--dyson-soft-border);
          border-radius: 999px;
          background: color-mix(in srgb, var(--primary-color, #03a9f4) 9%, var(--dyson-pill-bg));
          color: var(--primary-text-color);
          font: inherit;
          font-size: 0.66rem;
          line-height: 1;
        }
        .sensor-more-button ha-icon {
          --mdc-icon-size: 13px;
          color: currentColor;
        }
        .sensor-more-button.active {
          border-color: transparent;
          background: var(--dyson-active-bg);
          color: var(--primary-text-color);
        }
        .wheel-sensor-strip ha-icon {
          --mdc-icon-size: 14px;
          color: currentColor;
        }
        .sensor-temp,
        .sensor-humidity,
        .sensor-aqi,
        .sensor-filter,
        .sensor-detail-chip {
          display: inline-grid;
          grid-template-columns: 14px auto;
          align-items: center;
          justify-content: start;
          gap: 3px;
          min-width: 0;
          flex: 0 0 auto;
          min-height: 27px;
          padding: 5px 9px;
          border: 1px solid var(--dyson-soft-border);
          border-radius: 999px;
          background: var(--dyson-raised-bg);
          color: var(--primary-text-color);
          box-shadow: var(--dyson-inner-highlight);
          pointer-events: none;
        }
        .sensor-detail-chip {
          grid-template-columns: auto;
          gap: 1px;
          min-height: 27px;
          padding: 5px 9px;
          line-height: 1.05;
        }
        .sensor-detail-chip strong {
          font-size: 0.56rem;
          font-weight: 800;
          color: var(--secondary-text-color);
          letter-spacing: 0.02em;
        }
        .sensor-detail-chip span {
          font-size: 0.66rem;
          font-weight: 800;
          color: var(--primary-text-color);
        }
        .sensor-aqi.good {
          border-color: color-mix(in srgb, #22c55e 46%, transparent);
          background: color-mix(in srgb, #22c55e 18%, var(--dyson-raised-bg));
          color: var(--primary-text-color);
        }
        .sensor-aqi.fair {
          border-color: color-mix(in srgb, #f59e0b 50%, transparent);
          background: color-mix(in srgb, #f59e0b 18%, var(--dyson-raised-bg));
          color: var(--primary-text-color);
        }
        .sensor-aqi.poor {
          border-color: color-mix(in srgb, #ef4444 52%, transparent);
          background: color-mix(in srgb, #ef4444 20%, var(--dyson-raised-bg));
          color: var(--primary-text-color);
        }
        .sensor-detail-chip.good {
          border-color: color-mix(in srgb, #22c55e 46%, transparent);
          background: color-mix(in srgb, #22c55e 18%, var(--dyson-raised-bg));
        }
        .sensor-detail-chip.fair {
          border-color: color-mix(in srgb, #f59e0b 50%, transparent);
          background: color-mix(in srgb, #f59e0b 18%, var(--dyson-raised-bg));
        }
        .sensor-detail-chip.poor {
          border-color: color-mix(in srgb, #ef4444 52%, transparent);
          background: color-mix(in srgb, #ef4444 20%, var(--dyson-raised-bg));
        }
        .sensor-temp ha-icon,
        .sensor-humidity ha-icon,
        .sensor-aqi ha-icon,
        .sensor-filter ha-icon {
          justify-self: center;
        }
        .sensor-details-panel {
          display: grid;
          gap: 8px;
          padding: 10px;
          border: 1px solid var(--dyson-border);
          border-radius: 16px;
          background: var(--dyson-control-bg);
          box-shadow: var(--dyson-inner-highlight);
        }
        .wheel-sensor-strip .sensor-details-panel {
          flex: 0 0 100%;
          width: 100%;
          margin-top: 2px;
          padding: 7px;
          border-radius: 12px;
          background: color-mix(in srgb, var(--dyson-control-bg) 76%, transparent);
        }
        .sensor-details-section {
          display: grid;
          gap: 6px;
        }
        .sensor-details-heading {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: var(--secondary-text-color);
          font-size: 0.62rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0;
        }
        .sensor-details-heading ha-icon {
          --mdc-icon-size: 13px;
          color: var(--primary-color, #03a9f4);
        }
        .sensor-details-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6px;
        }
        .sensor-details-grid.compact {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 6px;
        }
        .wheel-sensor-strip .sensor-details-grid {
          gap: 5px;
        }
        .sensor-detail-item {
          min-width: 0;
          display: grid;
          gap: 2px;
          padding: 7px 8px;
          border-radius: 12px;
          background: var(--dyson-raised-bg);
          border: 1px solid var(--dyson-soft-border);
        }
        .sensor-detail-item.compact {
          width: 74px;
          min-height: 40px;
          border-radius: 999px;
          padding: 5px 7px;
          place-items: center;
          align-content: center;
          gap: 1px;
          text-align: center;
        }
        .sensor-detail-item.good {
          border-color: color-mix(in srgb, #22c55e 46%, transparent);
          background: color-mix(in srgb, #22c55e 18%, var(--dyson-raised-bg));
        }
        .sensor-detail-item.fair {
          border-color: color-mix(in srgb, #f59e0b 50%, transparent);
          background: color-mix(in srgb, #f59e0b 18%, var(--dyson-raised-bg));
        }
        .sensor-detail-item.poor {
          border-color: color-mix(in srgb, #ef4444 52%, transparent);
          background: color-mix(in srgb, #ef4444 20%, var(--dyson-raised-bg));
        }
        .sensor-detail-item span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--secondary-text-color);
          font-size: 0.58rem;
          font-weight: 720;
        }
        .sensor-detail-item.compact span {
          font-size: 0.54rem;
        }
        .sensor-detail-item strong {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--primary-text-color);
          font-size: 0.72rem;
          font-weight: 820;
        }
        .sensor-detail-item.compact strong {
          font-size: 0.66rem;
        }
        .wheel-center-info {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 152px;
          height: 152px;
          pointer-events: auto;
          color: var(--primary-text-color);
          z-index: 3;
        }
        .sweep-dial {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 999px;
          background: color-mix(in srgb, var(--dyson-raised-bg) 72%, transparent);
          border: 1px solid color-mix(in srgb, var(--primary-text-color) 7%, transparent);
          box-shadow:
            inset 0 1px 0 color-mix(in srgb, white 16%, transparent),
            0 4px 10px color-mix(in srgb, #000 8%, transparent);
          --sweep-start: 0deg;
          --sweep-size: 72deg;
        }
        .sweep-dial-active-0 {
          --sweep-start: -36deg;
        }
        .sweep-dial-active-45 {
          --sweep-start: 36deg;
        }
        .sweep-dial-active-90 {
          --sweep-start: 108deg;
        }
        .sweep-dial-active-180 {
          --sweep-start: 180deg;
        }
        .sweep-dial-active-350 {
          --sweep-start: 252deg;
        }
        .sweep-dial::before {
          content: "";
          position: absolute;
          inset: 4px;
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--primary-text-color) 9%, transparent);
          background:
            conic-gradient(
              from var(--sweep-start),
              color-mix(in srgb, var(--primary-color, #03a9f4) 13%, transparent) 0 var(--sweep-size),
              transparent var(--sweep-size) 360deg
            ),
            repeating-conic-gradient(
              from -36deg,
              color-mix(in srgb, var(--primary-text-color) 9%, transparent) 0 1deg,
              transparent 1deg 72deg
            );
          box-shadow: none;
        }
        .sweep-dial-option {
          position: absolute;
          border: 0;
          border-radius: 999px;
          background: transparent;
          color: var(--secondary-text-color);
          font: inherit;
          font-size: 0.88rem;
          font-weight: 860;
          line-height: 1;
        }
        .sweep-dial-option {
          width: 44px;
          height: 44px;
          padding: 0;
          transform: translate(-50%, -50%);
          z-index: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .sweep-dial-option span {
          min-width: 34px;
          height: 30px;
          padding: 0 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
          font-size: inherit;
          font-weight: inherit;
        }
        .sweep-dial-option--0 {
          left: 50%;
          top: 16%;
        }
        .sweep-dial-option--45 {
          left: 77%;
          top: 38%;
        }
        .sweep-dial-option--90 {
          left: 67%;
          top: 74%;
        }
        .sweep-dial-option--180 {
          left: 33%;
          top: 74%;
        }
        .sweep-dial-option--350 {
          left: 23%;
          top: 38%;
        }
        .sweep-dial-option.active span {
          background: transparent;
          color: var(--primary-color, #03a9f4);
          box-shadow: none;
          text-shadow: 0 0 10px color-mix(in srgb, var(--primary-color, #03a9f4) 24%, transparent);
        }
        .operation-status {
          min-height: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: min(100%, 292px);
          margin: -18px auto -1px;
          padding: 2px 10px;
          border-radius: 999px;
          background: ${operationActive ? "color-mix(in srgb, var(--primary-color, #03a9f4) 10%, transparent)" : "transparent"};
          color: var(--secondary-text-color);
          font-size: 0.62rem;
          font-weight: 760;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .mode-row {
          box-sizing: border-box;
          display: flex;
          align-items: center;
          gap: 10px;
          justify-content: center;
          width: min(100%, 302px);
          height: 56px;
          padding: 7px 10px;
          border: 1px solid var(--dyson-border);
          border-radius: 999px;
          background: var(--dyson-control-bg);
          box-shadow:
            var(--dyson-inner-highlight),
            var(--dyson-shadow);
        }
        .mode-icon-button {
          box-sizing: border-box;
          width: 44px;
          height: 42px;
          border: 0;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          background: transparent;
          color: var(--secondary-text-color);
          font: inherit;
          font-size: 0.9rem;
          font-weight: 850;
        }
        .mode-icon-button ha-icon {
          --mdc-icon-size: 23px;
        }
        .mode-icon-button.active {
          background: color-mix(in srgb, var(--primary-color, #4f46e5) 18%, transparent);
          color: var(--primary-text-color);
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary-color, #4f46e5) 18%, transparent);
        }
        .mode-icon-button:disabled,
        .temp-step-button:disabled,
        .target-temp-input:disabled,
        .speed-slider:disabled,
        .direction-preset-button:disabled,
        .direction-preset-add:disabled,
        .sweep-dial-option:disabled {
          opacity: 0.44;
        }
        .target-temp-wrap {
          display: grid;
          grid-template-columns: 38px minmax(0, 74px) 38px;
          gap: 0;
          align-items: center;
          min-width: 0;
          width: 150px;
          height: 42px;
          max-width: 100%;
          margin-left: auto;
          border-radius: 999px;
          background: var(--dyson-inset-bg);
          border: 1px solid var(--dyson-border);
          box-shadow:
            var(--dyson-inner-highlight);
        }
        .temp-step-button {
          box-sizing: border-box;
          width: 38px;
          height: 42px;
          border: 0;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          background: transparent;
          color: var(--primary-text-color);
          font: inherit;
          font-size: 1.12rem;
          font-weight: 820;
        }
        .target-temp-input {
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
          height: 42px;
          min-height: 42px;
          border: 0;
          padding: 6px 5px;
          background: transparent;
          text-align: center;
          border-radius: 0;
          color: var(--primary-text-color);
          font-size: 0.84rem;
          font-weight: 850;
          appearance: textfield;
        }
        .target-temp-input::-webkit-outer-spin-button,
        .target-temp-input::-webkit-inner-spin-button {
          margin: 0;
          appearance: none;
        }
        .temp-value-wrap {
          position: relative;
          min-width: 0;
        }
        .target-temp-unit {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          color: var(--secondary-text-color);
          font-size: 0.62rem;
          font-weight: 800;
          pointer-events: none;
        }
        .helper {
          font-size: 0.78rem;
          color: var(--secondary-text-color);
          text-align: center;
        }
        .debug-panel {
          border: 1px solid var(--dyson-border);
          border-radius: 12px;
          padding: 10px 12px;
          background: var(--dyson-control-bg);
        }
        .direction-presets {
          display: grid;
          gap: 8px;
          width: 100%;
          border: 0;
          border-radius: 0;
          padding: 0;
          background: transparent;
          box-shadow: none;
        }
        .direction-presets-row {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 38px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .direction-presets-empty {
          color: var(--secondary-text-color);
          font-size: 0.72rem;
          font-weight: 750;
          padding: 0 6px;
          white-space: nowrap;
        }
        .direction-presets-row::-webkit-scrollbar {
          display: none;
        }
        .direction-preset-item {
          display: inline-flex;
          align-items: center;
          flex: 0 0 auto;
          border: 1px solid var(--dyson-border);
          border-radius: 999px;
          background: var(--dyson-raised-bg);
          overflow: hidden;
        }
        .direction-preset-item.confirm-delete {
          border-color: color-mix(in srgb, #ef4444 68%, transparent);
          background: color-mix(in srgb, #ef4444 18%, var(--dyson-raised-bg));
        }
        .direction-preset-button,
        .direction-preset-remove,
        .direction-preset-add,
        .preset-action {
          border: 0;
          background: transparent;
          color: var(--primary-text-color);
          font: inherit;
          font-weight: 800;
        }
        .direction-preset-button {
          min-width: 0;
          height: 38px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 0 10px;
        }
        .direction-preset-item.confirm-delete .direction-preset-button {
          color: #ef4444;
          letter-spacing: 0;
        }
        .direction-preset-button ha-icon,
        .direction-preset-add ha-icon {
          --mdc-icon-size: 18px;
          color: var(--secondary-text-color);
        }
        .direction-preset-button span {
          max-width: 92px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .direction-preset-remove {
          width: 30px;
          height: 38px;
          color: var(--secondary-text-color);
          border-left: 1px solid var(--dyson-border);
          font-size: 1rem;
        }
        .direction-preset-item.confirm-delete .direction-preset-remove {
          color: #ef4444;
          border-left-color: color-mix(in srgb, #ef4444 54%, transparent);
        }
        .direction-preset-add {
          flex: 0 0 auto;
          width: 38px;
          height: 38px;
          border: 1px solid var(--dyson-border);
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--dyson-raised-bg);
        }
        .preset-editor {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          gap: 6px;
          align-items: center;
        }
        .preset-name-input {
          min-width: 0;
          height: 34px;
          border: 1px solid var(--dyson-border);
          border-radius: 999px;
          padding: 0 10px;
          background: var(--dyson-inset-bg);
          color: var(--primary-text-color);
          font: inherit;
          font-size: 0.74rem;
          font-weight: 750;
        }
        .preset-icon-picker {
          grid-column: 1 / -1;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }
        .preset-icon-option {
          width: 34px;
          height: 34px;
          border: 1px solid var(--dyson-border);
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          background: var(--dyson-raised-bg);
          color: var(--secondary-text-color);
          box-shadow: var(--dyson-inner-highlight);
        }
        .preset-icon-option.active {
          border-color: color-mix(in srgb, var(--primary-color, #4f46e5) 36%, transparent);
          background: var(--dyson-active-bg);
          color: var(--primary-color, #03a9f4);
        }
        .preset-icon-option ha-icon {
          --mdc-icon-size: 18px;
        }
        .preset-action {
          height: 34px;
          border: 1px solid var(--dyson-border);
          border-radius: 999px;
          padding: 0 10px;
          background: var(--dyson-raised-bg);
          font-size: 0.72rem;
        }
        .debug-panel > summary,
        .debug-entity > summary {
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--primary-text-color);
        }
        .debug-panel > summary strong,
        .debug-entity > summary strong {
          color: var(--secondary-text-color);
          font-size: 0.72rem;
          font-weight: 700;
          white-space: nowrap;
        }
        .debug-grid {
          display: grid;
          gap: 8px;
          margin-top: 10px;
        }
        .debug-row {
          display: grid;
          gap: 4px;
        }
        .debug-label {
          color: var(--secondary-text-color);
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .debug-value {
          margin: 0;
          max-height: 180px;
          overflow: auto;
          border-radius: 8px;
          padding: 8px;
          background: var(--dyson-inset-bg);
          color: var(--primary-text-color);
          font: 600 0.72rem ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .debug-entities {
          display: grid;
          gap: 8px;
          margin-top: 10px;
        }
        .debug-entity {
          border-top: 1px solid var(--dyson-border);
          padding-top: 8px;
        }
        .debug-entity-body {
          display: grid;
          gap: 8px;
          margin-top: 8px;
        }
        .error {
          padding: 16px;
          color: #d9485f;
        }
        .busy {
          opacity: 0.68;
          pointer-events: none;
        }
        @media (max-width: 520px) {
          .direction-chip {
            padding-inline: 6px;
            font-size: 0.7rem;
          }
          .wheel-speed {
            ${speedOnLeft ? "left: 0; right: auto;" : "right: 0; left: auto;"}
          }
          .speed-control,
          .speed-slider,
          .speed-slider::-webkit-slider-runnable-track,
          .speed-slider::-moz-range-track {
            width: 38px;
          }
          .speed-rail {
            inset-inline: 4px;
          }
          .wheel-center-info {
            width: 146px;
            height: 146px;
          }
          .sweep-dial-option {
            width: 40px;
            height: 40px;
            font-size: 0.82rem;
          }
          .timer-custom {
            grid-template-columns: 1fr 1fr;
          }
          .timer-custom-input {
            grid-column: 1 / -1;
          }
          .preset-editor {
            grid-template-columns: 1fr 1fr;
          }
          .preset-name-input,
          .preset-icon-picker {
            grid-column: 1 / -1;
          }
        }
      </style>
      <ha-card>
        <div class="card ${this._busy ? "busy" : ""}">
          ${title ? `
            <div class="header">
              <div class="title">${this._escapeHtml(title)}</div>
            </div>
          ` : ""}

          <div class="control-panel">
            ${showControlGrid ? `
              <div class="control-grid">
                ${showSaveControl ? `
                  <button class="control-pill direction-preset-add-control" data-preset-add aria-label="${this._escapeHtml(this._t("save_current_direction_preset"))}" ${controlReady ? "" : "disabled"}>
                    <ha-icon icon="mdi:camera-plus-outline"></ha-icon>
                    <span>${this._t("save")}</span>
                  </button>
                ` : ""}
                ${showAutoControl ? this._renderToggleButton("auto", this._t("auto"), "mdi:auto-mode", autoActive, !autoAvailable) : ""}
                ${showNightControl ? this._renderToggleButton("night", this._t("night"), "mdi:weather-night", nightActive, !nightAvailable) : ""}
              </div>
            ` : ""}

            ${showDirectionRow ? `
              <div class="direction-row ${showAirflowControl && showSleepTimerControl ? "" : "single-control"}">
                ${showAirflowControl ? `
                  <div class="airflow-control">
                    <div class="row-label">
                      <span>${this._t("airflow")}</span>
                    </div>
                    <button class="direction-chip active" data-direction-toggle aria-label="${this._escapeHtml(this._t("toggle_airflow_direction"))}" ${airflowDirectionAvailable ? "" : "disabled"}>
                      <ha-icon icon="${airflowDirection === "forward" ? "mdi:arrow-up-bold" : "mdi:arrow-down-bold"}"></ha-icon>
                      <span>${airflowDirection === "forward" ? this._t("forward") : this._t("reverse")}</span>
                    </button>
                  </div>
                ` : ""}
                ${showSleepTimerControl ? `
                  <div class="sleep-timer-control">
                    <div class="row-label">
                      <span>${this._t("sleep_timer")}</span>
                    </div>
                    <div class="timer-inline-buttons">
                      ${this._renderTimerButton(60, "1h", activeTimer)}
                      ${this._renderTimerButton(120, "2h", activeTimer)}
                      ${this._renderTimerButton(240, "4h", activeTimer)}
                      <button class="timer-chip timer-plus ${this._customTimerOpen ? "active" : ""}" data-timer-custom aria-label="${this._t("custom_sleep_timer")}">
                        <ha-icon icon="mdi:plus"></ha-icon>
                      </button>
                    </div>
                  </div>
                ` : ""}
              </div>
            ` : ""}
            ${showSleepTimerControl ? `
              <div class="timer-flyout" style="${this._customTimerOpen ? "" : "display:none;"}">
                <div class="row-label">
                  <span>${this._t("sleep_timer")}</span>
                  <strong>${timerLabel}</strong>
                </div>
                <div class="timer-custom">
                  <input class="timer-custom-input" type="number" min="1" max="9" step="1" inputmode="numeric" placeholder="${this._t("hours")}" />
                  <button class="timer-action" data-timer-set>${this._t("set")}</button>
                  <button class="timer-action" data-timer-cancel>${this._t("cancel")}</button>
                </div>
              </div>
            ` : ""}
          </div>

          <div class="control-shell">
            ${showSensorStrip ? `
              <div class="wheel-sensor-strip ${this._sensorDetailsOpen ? "expanded" : ""}">
                ${showTempBadge ? `<span class="sensor-temp"><ha-icon icon="mdi:thermometer"></ha-icon>${this._escapeHtml(hasTempValue ? temp : "—")}${hasTempValue ? this._escapeHtml(this._unit(this._temperatureEntity(), "\u00b0")) : ""}</span>` : ""}
                ${showHumidityBadge ? `<span class="sensor-humidity"><ha-icon icon="mdi:water-percent"></ha-icon>${this._escapeHtml(hasHumidityValue ? humidity : "—")}${hasHumidityValue ? this._escapeHtml(this._unit(this._humidityEntity(), "%")) : ""}</span>` : ""}
                ${showAqiBadge ? `<span class="sensor-aqi ${aqiTone}"><ha-icon icon="mdi:gauge"></ha-icon>${this._escapeHtml(hasAqiValue ? aqi : "—")}</span>` : ""}
                ${showFilterBadge ? `<span class="sensor-filter"><ha-icon icon="mdi:air-filter"></ha-icon>${filterPercent === null ? "—" : `${filterPercent}%`}</span>` : ""}
                ${sensorDetailLayout === "inline" ? this._renderInlineSensorDetails(inlineSensorDetails) : ""}
                ${showSensorMoreButton ? `
                  <button class="sensor-more-button ${this._sensorDetailsOpen ? "active" : ""}" data-sensor-more aria-label="${this._sensorDetailsOpen ? this._t("hide_sensor_details") : this._t("show_more_sensors")}">
                    <span>${this._sensorDetailsOpen ? this._t("less") : this._t("more")}</span>
                    <ha-icon icon="${this._sensorDetailsOpen ? "mdi:chevron-up" : "mdi:dots-horizontal"}"></ha-icon>
                  </button>
                ` : ""}
                ${sensorDetailLayout === "panel" ? this._renderSensorDetails(!showSensorMoreButton) : ""}
              </div>
            ` : ""}
            <div class="wheel-wrap">
              <div class="wheel-stage">
                <button class="wheel-button" aria-label="${this._t("set_dyson_direction")}">
                  <svg class="wheel" viewBox="0 0 320 320" role="img" aria-hidden="true">
                    <path class="wheel-bg" d="${travelPath}"></path>
                    <path class="wheel-ring" d="${travelRingPath}"></path>
                    <line class="wheel-limit" x1="${lowerLimitInner.x}" y1="${lowerLimitInner.y}" x2="${lowerLimitOuter.x}" y2="${lowerLimitOuter.y}"></line>
                    <line class="wheel-limit" x1="${upperLimitInner.x}" y1="${upperLimitInner.y}" x2="${upperLimitOuter.x}" y2="${upperLimitOuter.y}"></line>
                    <path class="wheel-cone" d="${conePath}" style="${bounds.width ? "" : "display:none;"}"></path>
                    <path class="wheel-direct" d="${directPath}" style="${bounds.width ? "display:none;" : ""}"></path>
                    <circle class="wheel-core" cx="160" cy="160" r="48"></circle>
                    <circle class="wheel-core-inner" cx="160" cy="160" r="36"></circle>
                    ${operationActive ? `<circle class="wheel-spinner" cx="160" cy="160" r="42"></circle>` : ""}
                    <circle class="wheel-handle" cx="${handle.x}" cy="${handle.y}" r="13"></circle>
                  </svg>
                </button>
                ${this._renderDirectionPresetMarkers()}
                <button class="wheel-handle-hit" aria-label="${this._t("drag_set_direction")}"></button>
                <div class="wheel-center-info">
                  <div class="sweep-dial sweep-dial-active-${bounds.width}" aria-label="${this._escapeHtml(this._t("sweep_presets"))}">
                    ${(hideUnsupported && !controlReady) ? "" : presetWidths.map((preset) => this._renderSweepButton(preset, bounds.width, !controlReady)).join("")}
                  </div>
                </div>
              </div>
              <div class="wheel-speed">
                <div class="speed-control" style="--speed-fill: ${speedPercent}%;">
                  <div class="speed-rail" aria-hidden="true"></div>
                  <input class="speed-slider" type="range" min="0" max="100" step="10" value="${speedPercent}" aria-label="${this._t("set_airflow_speed")}" ${speedAvailable ? "" : "disabled"} />
                </div>
                <span class="speed-value" aria-hidden="true">${speedPercent}%</span>
                <button class="speed-power-button power-button ${powerState === "On" ? "active" : ""}" aria-label="${powerState === "On" ? this._t("turn_dyson_off") : this._t("turn_dyson_on")}">
                  <ha-icon icon="mdi:power"></ha-icon>
                </button>
              </div>
            </div>

            <div class="operation-status" aria-live="polite">
              ${operationActive ? this._escapeHtml(operationLabel) : ""}
            </div>

            ${showModeRow ? `
              <div class="mode-row">
                ${(!hideUnsupported || heatAvailable) ? `
                  <button class="mode-icon-button ${heatMode === "heat" ? "active" : ""}" data-hvac-mode="heat" aria-label="${this._t("heat_mode")}" ${heatAvailable ? "" : "disabled"}>
                    <ha-icon icon="mdi:fire"></ha-icon>
                  </button>
                ` : ""}
                ${(!hideUnsupported || fanOnlyAvailable) ? `
                  <button class="mode-icon-button ${heatMode === "fan_only" ? "active" : ""}" data-hvac-mode="fan_only" aria-label="${this._t("fan_only_mode")}" ${fanOnlyAvailable ? "" : "disabled"}>
                    <ha-icon icon="mdi:fan"></ha-icon>
                  </button>
                ` : ""}
                ${(!hideUnsupported || targetTempAvailable) ? `
                  <div class="target-temp-wrap">
                    <button class="temp-step-button" data-temp-step="-1" aria-label="${this._escapeHtml(this._t("decrease_target_temperature"))}" ${targetTempAvailable ? "" : "disabled"}>-</button>
                    <div class="temp-value-wrap">
                      <input class="target-temp-input" type="number" min="${Number.isFinite(minTemp) ? minTemp : 1}" max="${Number.isFinite(maxTemp) ? maxTemp : 37}" step="${Number.isFinite(targetTempStep) ? targetTempStep : 1}" value="${targetTemperature ?? ""}" aria-label="${this._escapeHtml(this._t("set_target_temperature"))}" ${targetTempAvailable ? "" : "disabled"} />
                      <span class="target-temp-unit">${this._escapeHtml(tempUnit)}</span>
                    </div>
                    <button class="temp-step-button" data-temp-step="1" aria-label="${this._escapeHtml(this._t("increase_target_temperature"))}" ${targetTempAvailable ? "" : "disabled"}>+</button>
                  </div>
                ` : ""}
              </div>
            ` : ""}

          </div>

          ${showDirectionPresets ? this._renderDirectionPresets(direction, width, controlReady) : ""}

          ${controlReady ? "" : `<div class="helper">${this._escapeHtml(this._t("resolving_device"))}</div>`}
        </div>
      </ha-card>
    `;

    this._bindControls(attributes, powerState);
  }
}

customElements.define("ha-dyson-card", HaDysonCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ha-dyson-card",
  name: "HA Dyson Card",
  description: "A Dyson Lovelace card with direct oscillation aiming and cone-width control.",
});
