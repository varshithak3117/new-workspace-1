/**
 * SmartSlope Main Application Controller
 * Handles Multi-Land Management, Zone Telemetry, Smart Recommendations, and UI Routing
 */

class SmartSlopeApp {
  constructor() {
    this.lands = [];
    this.alerts = [];
    this.history = [];
    this.selectedLandId = "land-1";
    this.currentView = "home"; // 'home', 'lands', 'land-detail', 'zones', 'irrigation', 'weather', 'analytics', 'alerts', 'settings', 'hardware'
    this.isDemoMode = true; // clearly labeled simulation mode by default
    this.currentLang = localStorage.getItem('smartslope_lang') || 'kn';
    this.weatherData = null;
    this.autoRefreshTimer = null;
    this.activeTimeframe = 'day';

    this.init();
  }

  async init() {
    this.loadState();
    this.setupEventListeners();
    this.applyLanguage(this.currentLang);

    // Initialize Weather
    await this.refreshWeather();

    // Start Demo Simulator if in demo mode
    if (this.isDemoMode && window.smartSlopeSimulator) {
      window.smartSlopeSimulator.start(this);
    }

    // Render Initial UI
    this.render();

    // Periodic auto evaluation every 10 seconds
    setInterval(() => {
      this.evaluateAutoCycle();
    }, 10000);
  }

  /**
   * Load state from localStorage or seed initial data
   */
  loadState() {
    const saved = localStorage.getItem(window.SMARTSLOPE_CONFIG.storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.lands = parsed.lands || window.SMARTSLOPE_CONFIG.initialLands;
        this.alerts = parsed.alerts || window.SMARTSLOPE_CONFIG.initialAlerts;
        this.history = parsed.history || [];
        this.selectedLandId = parsed.selectedLandId || (this.lands[0] && this.lands[0].id) || "land-1";
      } catch (e) {
        console.error("Error reading saved state, restoring seeds:", e);
        this.lands = JSON.parse(JSON.stringify(window.SMARTSLOPE_CONFIG.initialLands));
        this.alerts = JSON.parse(JSON.stringify(window.SMARTSLOPE_CONFIG.initialAlerts));
      }
    } else {
      this.lands = JSON.parse(JSON.stringify(window.SMARTSLOPE_CONFIG.initialLands));
      this.alerts = JSON.parse(JSON.stringify(window.SMARTSLOPE_CONFIG.initialAlerts));
      this.saveToStorage();
    }
  }

  saveToStorage() {
    const payload = {
      lands: this.lands,
      alerts: this.alerts,
      history: this.history,
      selectedLandId: this.selectedLandId,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(window.SMARTSLOPE_CONFIG.storageKey, JSON.stringify(payload));
  }

  /**
   * Multi-Land Management: Add a new land
   * Automatically initializes Zone 1 (Upper), Zone 2 (Middle), Zone 3 (Lower)
   */
  addLand(formData) {
    const newId = `land-${Date.now()}`;
    const newLand = {
      id: newId,
      name: formData.name.trim(),
      location: formData.location.trim(),
      area: parseFloat(formData.area) || 1.0,
      crop: formData.crop ? formData.crop.trim() : "Arecanut Plantation",
      slopeAngle: formData.slopeAngle || "Moderate Slope (15°)",
      slopeType: formData.slopeType || "Moderate",
      lat: parseFloat(formData.lat) || 13.5,
      lon: parseFloat(formData.lon) || 75.3,
      controllerId: `ESP32-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      controllerStatus: "online",
      lastHeartbeat: new Date().toISOString(),
      waterUsedToday: 0,
      totalWaterSaved: 0,
      zones: [
        {
          id: "zone-1",
          name: "Zone 1 – Upper Slope",
          position: "Upper Slope",
          elevationRank: 1,
          description: "Upper slope ridge; fast water runoff & quick moisture loss.",
          moisture: 32,
          targetMoisture: 55,
          dryThreshold: 35,
          valveStatus: "closed",
          irrigationStatus: "stopped",
          runoffDetected: false,
          soilTemp: 27.2,
          flowRateLpm: 0,
          waterUsedToday: 0,
          maxRunMinutes: 45,
          lastUpdated: new Date().toISOString()
        },
        {
          id: "zone-2",
          name: "Zone 2 – Middle Slope",
          position: "Middle Slope",
          elevationRank: 2,
          description: "Middle slope band; steady soil infiltration.",
          moisture: 44,
          targetMoisture: 55,
          dryThreshold: 32,
          valveStatus: "closed",
          irrigationStatus: "stopped",
          runoffDetected: false,
          soilTemp: 26.5,
          flowRateLpm: 0,
          waterUsedToday: 0,
          maxRunMinutes: 40,
          lastUpdated: new Date().toISOString()
        },
        {
          id: "zone-3",
          name: "Zone 3 – Lower Slope",
          position: "Lower Slope",
          elevationRank: 3,
          description: "Lower slope basin; collects gravity seepage; sensitive to waterlogging.",
          moisture: 54,
          targetMoisture: 52,
          dryThreshold: 28,
          valveStatus: "closed",
          irrigationStatus: "stopped",
          runoffDetected: false,
          soilTemp: 25.8,
          flowRateLpm: 0,
          waterUsedToday: 0,
          maxRunMinutes: 30,
          lastUpdated: new Date().toISOString()
        }
      ]
    };

    this.lands.push(newLand);
    this.selectedLandId = newId;
    this.saveToStorage();

    // Create confirmation alert
    this.addAlert({
      id: `alt-new-land-${Date.now()}`,
      landId: newId,
      landName: newLand.name,
      zoneId: "all",
      zoneName: "All 3 Zones",
      type: "system_event",
      severity: "info",
      message: `New field registered: "${newLand.name}" with 3 independent slope zones initialized.`,
      kannadaMessage: `ಹೊಸ ಜಮೀನು ನೋಂದಣಿಯಾಗಿದೆ: "${newLand.name}". 3 ಇಳಿಜಾರು ವಲಯಗಳು ಸಕ್ರಿಯಗೊಂಡಿವೆ.`,
      timestamp: new Date().toISOString(),
      active: false
    });

    this.showToast(`Land "${newLand.name}" created with 3 slope zones!`, "success");
    this.render();
  }

  /**
   * Edit existing land details
   */
  editLand(landId, updatedFields) {
    const land = this.lands.find(l => l.id === landId);
    if (!land) return;

    if (updatedFields.name) land.name = updatedFields.name.trim();
    if (updatedFields.location) land.location = updatedFields.location.trim();
    if (updatedFields.area) land.area = parseFloat(updatedFields.area);
    if (updatedFields.crop) land.crop = updatedFields.crop.trim();
    if (updatedFields.slopeAngle) land.slopeAngle = updatedFields.slopeAngle;
    if (updatedFields.lat) land.lat = parseFloat(updatedFields.lat);
    if (updatedFields.lon) land.lon = parseFloat(updatedFields.lon);

    this.saveToStorage();
    this.showToast(`Updated details for ${land.name}`, "info");
    this.render();
  }

  /**
   * Remove a land after user confirmation
   */
  deleteLand(landId) {
    const index = this.lands.findIndex(l => l.id === landId);
    if (index === -1) return;

    const landName = this.lands[index].name;
    this.lands.splice(index, 1);

    // If active land was deleted, switch to the first available land
    if (this.selectedLandId === landId) {
      this.selectedLandId = this.lands.length > 0 ? this.lands[0].id : null;
    }

    // Clean up associated alerts
    this.alerts = this.alerts.filter(a => a.landId !== landId);

    this.saveToStorage();
    this.showToast(`Land "${landName}" removed successfully`, "warning");
    this.render();
  }

  /**
   * Select active land
   */
  selectLand(landId) {
    this.selectedLandId = landId;
    this.saveToStorage();
    this.refreshWeather();
    this.render();
  }

  getActiveLand() {
    return this.lands.find(l => l.id === this.selectedLandId) || this.lands[0] || null;
  }

  /**
   * Add an alert to the log
   */
  addAlert(alert) {
    // Avoid duplicate flood of identical active alerts
    const existing = this.alerts.find(a => a.landId === alert.landId && a.zoneId === alert.zoneId && a.type === alert.type && a.active);
    if (existing) {
      existing.timestamp = alert.timestamp;
      existing.message = alert.message;
      return;
    }

    this.alerts.unshift(alert);
    if (this.alerts.length > 50) this.alerts.pop(); // keep last 50
    this.saveToStorage();
    this.updateNotificationBadge();
  }

  /**
   * Resolve / mark alert as handled
   */
  resolveAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.active = false;
      alert.resolvedAt = new Date().toISOString();
      this.saveToStorage();
      this.renderAlertsList();
      this.updateNotificationBadge();
    }
  }

  clearAllResolvedAlerts() {
    this.alerts = this.alerts.filter(a => a.active);
    this.saveToStorage();
    this.renderAlertsList();
    this.updateNotificationBadge();
    this.showToast("Cleared resolved alerts", "info");
  }

  /**
   * Automatic cycle evaluation
   */
  evaluateAutoCycle() {
    const land = this.getActiveLand();
    if (land && window.smartSlopeIrrigation) {
      window.smartSlopeIrrigation.evaluateAutoCycle(land, this);
    }
  }

  /**
   * Fetch weather forecast for active land
   */
  async refreshWeather() {
    const land = this.getActiveLand();
    if (!land) return;

    if (window.smartSlopeWeather) {
      this.weatherData = await window.smartSlopeWeather.getForecast(land.lat, land.lon, land.name);
      this.renderWeatherWidget();
    }
  }

  /**
   * Smart Rule-Based Recommendations Engine (Section 9)
   * Analyzes soil moisture across Zone 1, 2, and 3, rainfall forecasts, and slope risks
   */
  generateSmartRecommendations() {
    const land = this.getActiveLand();
    if (!land) return [];

    const recommendations = [];
    const z1 = land.zones[0];
    const z2 = land.zones[1];
    const z3 = land.zones[2];
    const weather = this.weatherData;

    // 1. Upper Slope Dryness rule
    if (z1 && z1.moisture < z1.dryThreshold) {
      recommendations.push({
        id: "rec-dry-z1",
        landName: land.name,
        zoneName: z1.name,
        badge: "Irrigation Needed",
        severity: "warning",
        title: `${land.name}, ${z1.name} is dry (${z1.moisture}%). Irrigation needed.`,
        titleKn: `${land.name}, ${z1.name} ಒಣಗಿದೆ (${z1.moisture}%). ನೀರಾವರಿ ಅಗತ್ಯವಿದೆ.`,
        reason: "Upper slope terraces have thin topsoil and lose water fastest due to gravity and sunlight. Palms in Zone 1 risk moisture stress.",
        reasonKn: "ಇಳಿಜಾರಿನ ಮೇಲ್ಭಾಗದಲ್ಲಿ ನೀರು ಬೇಗ ಇಳಿದುಹೋಗುತ್ತದೆ ಮತ್ತು ಬಿಸಿಲಿನಿಂದ ಒಣಗುತ್ತದೆ.",
        suggestedAction: "Trigger micro-drip pulse for 25 minutes or enable auto-irrigation threshold.",
        suggestedActionKn: "25 ನಿಮಿಷಗಳ ಕಾಲ ಹನಿ ನೀರಾವರಿ ಪ್ರಾರಂಭಿಸಿ.",
        actionBtn: { text: "Start Zone 1 Drip", action: () => this.triggerZoneManual(land.id, z1.id, 'start') }
      });
    }

    // 2. Lower Slope Waterlogging / Accumulation rule
    if (z3 && z3.moisture > 62) {
      recommendations.push({
        id: "rec-high-z3",
        landName: land.name,
        zoneName: z3.name,
        badge: "Water Accumulation",
        severity: "info",
        title: `${land.name}, ${z3.name} has high moisture (${z3.moisture}%). Check accumulation.`,
        titleKn: `${land.name}, ${z3.name} ನಲ್ಲಿ ಹೆಚ್ಚು ತೇವಾಂಶವಿದೆ (${z3.moisture}%). ನೀರು ನಿಲ್ಲದಂತೆ ಪರಿಶೀಲಿಸಿ.`,
        reason: "Sub-surface gravitational percolation from Zones 1 and 2 collects in the lower valley basin. Prolonged saturation (>65%) promotes Koleroga fungal root rot in arecanut.",
        reasonKn: "ಮೇಲಿನಿಂದ ಹರಿದುಬಂದ ನೀರು ತಗ್ಗಿನಲ್ಲಿ ಸಂಗ್ರಹವಾಗಿದೆ. ಅತಿಯಾದ ನೀರಿನಿಂದ ಕೊಳೆರೋಗ ಉಂಟಾಗುವ ಸಾಧ್ಯತೆ ಇದೆ.",
        suggestedAction: "Keep Zone 3 valve closed; inspect drainage trenches along the lower plantation boundary.",
        suggestedActionKn: "ವಲಯ 3 ರ ವಾಲ್ವ್ ಮುಚ್ಚಿರಲಿ; ಒಳಚರಂಡಿ ಕಾಲುವೆಗಳನ್ನು ತೆರವುಗೊಳಿಸಿ."
      });
    }

    // 3. Weather / Rain Forecast rule
    if (weather && (weather.rainProbability > 65 || weather.expectedRainfallMm > 8 || weather.tomorrowRainMm > 10)) {
      recommendations.push({
        id: "rec-rain-delay",
        landName: land.name,
        zoneName: "All 3 Zones",
        badge: "Rain Expected",
        severity: "info",
        title: `Rain is forecast for ${land.name}. Consider delaying irrigation.`,
        titleKn: `${land.name} ಭಾಗದಲ್ಲಿ ಮಳೆ ಮುನ್ಸೂಚನೆ ಇದೆ. ನೀರಾವರಿಯನ್ನು ಮುಂದೂಡಿ.`,
        reason: `Open-Meteo predicts ${weather.tomorrowRainMm || 12}mm of precipitation within 24-36h. Irrigating now will cause slope runoff, fertilizer leaching, and water wastage.`,
        reasonKn: `ಮುಂದಿನ 24 ಗಂಟೆಗಳಲ್ಲಿ ಮಳೆಯಾಗಲಿದೆ. ಈಗ ನೀರುಣಿಸಿದರೆ ಗೊಬ್ಬರ ಮತ್ತು ಮಣ್ಣು ಕೊಚ್ಚಿಹೋಗುತ್ತದೆ.`,
        suggestedAction: "Delay scheduled irrigation cycles by 24 hours to conserve well water.",
        suggestedActionKn: "ನೀರು ಉಳಿಸಲು ನೀರಾವರಿಯನ್ನು 24 ಗಂಟೆಗಳ ಕಾಲ ಮುಂದೂಡಿ."
      });
    }

    // 4. Runoff Active Alert rule
    const runoffZone = land.zones.find(z => z.runoffDetected);
    if (runoffZone) {
      recommendations.push({
        id: "rec-runoff-safety",
        landName: land.name,
        zoneName: runoffZone.name,
        badge: "Runoff Active",
        severity: "critical",
        title: `Runoff detected in ${land.name}, ${runoffZone.name}. Irrigation paused.`,
        titleKn: `${land.name}, ${runoffZone.name} ನಲ್ಲಿ ನೀರು ಹರಿದುಹೋಗುವಿಕೆ ಪತ್ತೆಯಾಗಿದೆ. ನೀರಾವರಿ ನಿಲ್ಲಿಸಲಾಗಿದೆ.`,
        reason: "Water is flowing over the surface faster than the soil infiltration capacity. Topsoil erosion hazard.",
        reasonKn: "ಮಣ್ಣು ಹೀರಿಕೊಳ್ಳುವುದಕ್ಕಿಂತ ವೇಗವಾಗಿ ನೀರು ಇಳಿಜಾರಿನಲ್ಲಿ ಹರಿಯುತ್ತಿದೆ. ಮಣ್ಣಿನ ಸವೆತದ ಅಪಾಯವಿದೆ.",
        suggestedAction: "Allow 15 minutes of soak time. Inspect drip emitter placement before manually clearing the lockout.",
        suggestedActionKn: "15 ನಿಮಿಷಗಳ ಕಾಲ ಮಣ್ಣು ನೀರನ್ನು ಹೀರಿಕೊಳ್ಳಲು ಬಿಡಿ, ನಂತರ ಲಾಕ್ ತೆರವುಗೊಳಿಸಿ.",
        actionBtn: { text: "Clear Safety Lockout", action: () => this.clearRunoffLockout(land.id, runoffZone.id) }
      });
    }

    // 5. Slope Gravitational Staging tip
    if (z1 && z2 && z1.moisture > 50 && z2.moisture < 35) {
      recommendations.push({
        id: "rec-slope-stage",
        landName: land.name,
        zoneName: `${z1.name} → ${z2.name}`,
        badge: "Slope Optimization",
        severity: "normal",
        title: `Upper slope irrigated. Downward seepage underway to Middle slope.`,
        titleKn: `ಮೇಲಿನ ವಲಯಕ್ಕೆ ನೀರುಣಿಸಲಾಗಿದೆ. ಮಧ್ಯದ ವಲಯಕ್ಕೆ ನೈಸರ್ಗಿಕ ತೇವಾಂಶ ಇಳಿಯುತ್ತಿದೆ.`,
        reason: "SmartSlope slope intelligence detected recent Zone 1 watering. Allow 20 minutes for gravitational capillary action before activating Zone 2 valve.",
        reasonKn: "ನೈಸರ್ಗಿಕ ಗುರುತ್ವಾಕರ್ಷಣೆಯಿಂದ ನೀರು ಮಧ್ಯದ ವಲಯಕ್ಕೆ ಹರಿಯಲು 20 ನಿಮಿಷ ಸಮಯ ನೀಡಿ.",
        suggestedAction: "Pause Zone 2 start to utilize free gravity seepage and save ~350 Liters.",
        suggestedActionKn: "ಉಚಿತ ನೈಸರ್ಗಿಕ ನೀರನ್ನು ಬಳಸಿ 350 ಲೀಟರ್ ನೀರು ಉಳಿಸಿ."
      });
    }

    return recommendations;
  }

  /**
   * Manual Valve Operations
   */
  triggerZoneManual(landId, zoneId, action) {
    const land = this.lands.find(l => l.id === landId);
    if (!land) return;

    if (window.smartSlopeIrrigation) {
      const result = window.smartSlopeIrrigation.executeCommand(land, zoneId, action);
      if (!result.success) {
        this.showToast(result.error, "error");
        if (window.smartSlopeVoice) {
          window.smartSlopeVoice.speakAlert({
            kannadaText: result.error,
            englishText: result.error,
            severity: "critical"
          });
        }
        return;
      }

      this.saveToStorage();
      this.updateDashboardUI(true);
      this.showToast(result.message, "success");

      // Voice announcements
      const zone = land.zones.find(z => z.id === zoneId);
      if (window.smartSlopeVoice && window.smartSlopeVoice.enabled) {
        if (action === 'start') {
          window.smartSlopeVoice.speakAlert({
            kannadaText: `${land.name}, ${zone.name} ನಲ್ಲಿ ನೀರಾವರಿ ಪ್ರಾರಂಭವಾಗಿದೆ.`,
            englishText: `Irrigation valve opened for ${zone.name}.`,
            severity: "info"
          });
        } else if (action === 'stop') {
          window.smartSlopeVoice.speakAlert({
            kannadaText: `${land.name}, ${zone.name} ನಲ್ಲಿ ನೀರಾವರಿಯನ್ನು ನಿಲ್ಲಿಸಲಾಗಿದೆ.`,
            englishText: `Irrigation stopped for ${zone.name}.`,
            severity: "info"
          });
        }
      }
    }
  }

  /**
   * Clear Runoff Lockout
   */
  clearRunoffLockout(landId, zoneId) {
    const land = this.lands.find(l => l.id === landId);
    if (!land) return;

    if (window.smartSlopeIrrigation) {
      window.smartSlopeIrrigation.clearRunoffLockout(land, zoneId);
      this.saveToStorage();
      this.updateDashboardUI(true);
      this.showToast(`Runoff lockout cleared for Zone ${zoneId}`, "info");
    }
  }

  /**
   * Language Switcher (Kannada / English)
   */
  applyLanguage(lang) {
    this.currentLang = lang;
    localStorage.setItem('smartslope_lang', lang);
    if (window.smartSlopeVoice) {
      window.smartSlopeVoice.setLanguage(lang);
    }

    const htmlEl = document.documentElement;
    htmlEl.lang = lang;

    // Toggle active state on language pills
    document.querySelectorAll('.lang-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // Update dynamic text tags
    document.querySelectorAll('[data-kn]').forEach(el => {
      const knText = el.getAttribute('data-kn');
      const enText = el.getAttribute('data-en') || el.innerText;
      if (!el.getAttribute('data-en')) el.setAttribute('data-en', enText);
      el.innerText = lang === 'kn' ? knText : enText;
    });

    this.render();
  }

  /**
   * Router / Section Switcher
   */
  navigateTo(viewName) {
    this.currentView = viewName;
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.view === viewName);
    });

    document.querySelectorAll('.page-view').forEach(view => {
      view.classList.toggle('active', view.id === `view-${viewName}`);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.render();
  }

  /**
   * Primary Render Dispatcher
   */
  render() {
    this.renderNavLandSelector();
    this.renderOverviewKpis();
    this.renderWeatherWidget();

    switch (this.currentView) {
      case 'home':
        this.renderHomeCards();
        this.renderRecommendations();
        this.renderRecentAlertsWidget();
        break;
      case 'lands':
        this.renderMyLandsPage();
        break;
      case 'land-detail':
        this.renderLandDetailView();
        break;
      case 'zones':
        this.renderZonesDedicatedView();
        break;
      case 'irrigation':
        this.renderIrrigationDedicatedView();
        break;
      case 'weather':
        this.renderWeatherFullPage();
        break;
      case 'analytics':
        this.renderAnalyticsPage();
        break;
      case 'alerts':
        this.renderAlertsList();
        break;
      case 'hardware':
        this.renderHardwarePage();
        break;
      case 'settings':
        this.renderSettingsPage();
        break;
    }

    this.updateNotificationBadge();
  }

  /**
   * Update dynamic metrics without tearing down the entire DOM
   */
  updateDashboardUI(fullRedraw = false) {
    if (fullRedraw) {
      this.render();
      return;
    }
    this.renderOverviewKpis();
    if (this.currentView === 'home') {
      this.renderHomeCards();
    } else if (['land-detail', 'zones', 'irrigation'].includes(this.currentView)) {
      this.updateZoneCardsLive();
    }
  }

  /**
   * Render Top Navbar Land Selector Dropdown
   */
  renderNavLandSelector() {
    const selector = document.getElementById('nav-land-selector');
    if (!selector) return;

    selector.innerHTML = this.lands.map(l => `
      <option value="${l.id}" ${l.id === this.selectedLandId ? 'selected' : ''}>
        📍 ${l.name} (${l.area} Ac)
      </option>
    `).join('');
  }

  /**
   * Render Main Dashboard KPI Counters (Section 2)
   */
  renderOverviewKpis() {
    const totalLands = this.lands.length;
    let zonesNeedingWater = 0;
    let totalWaterUsedToday = 0;
    let activeValvesCount = 0;
    let runoffActiveCount = 0;

    this.lands.forEach(land => {
      totalWaterUsedToday += (land.waterUsedToday || 0);
      land.zones.forEach(z => {
        if (z.moisture <= z.dryThreshold) zonesNeedingWater++;
        if (z.valveStatus === 'open') activeValvesCount++;
        if (z.runoffDetected) runoffActiveCount++;
      });
    });

    const elTotalLands = document.getElementById('kpi-total-lands');
    const elNeedWater = document.getElementById('kpi-zones-need-water');
    const elWaterToday = document.getElementById('kpi-water-today');
    const elIrrStatus = document.getElementById('kpi-irrigation-status');

    if (elTotalLands) elTotalLands.innerText = totalLands;
    if (elNeedWater) {
      elNeedWater.innerText = zonesNeedingWater;
      elNeedWater.className = zonesNeedingWater > 0 ? 'kpi-num text-warning' : 'kpi-num text-success';
    }
    if (elWaterToday) elWaterToday.innerText = `${totalWaterUsedToday.toLocaleString()} L`;
    if (elIrrStatus) {
      if (runoffActiveCount > 0) {
        elIrrStatus.innerHTML = `<span class="badge-status badge-critical">🚨 RUNOFF ALERT (${runoffActiveCount})</span>`;
      } else if (activeValvesCount > 0) {
        elIrrStatus.innerHTML = `<span class="badge-status badge-running"><span class="pulse-dot"></span> WATERING (${activeValvesCount} VALVES)</span>`;
      } else {
        elIrrStatus.innerHTML = `<span class="badge-status badge-normal">🌱 IDLE / SAFE MONITORING</span>`;
      }
    }
  }

  /**
   * Render Weather Box on Dashboard
   */
  renderWeatherWidget() {
    const container = document.getElementById('home-weather-widget');
    if (!container) return;

    const w = this.weatherData;
    const land = this.getActiveLand();

    if (!w) {
      container.innerHTML = `
        <div class="weather-loading">
          <div class="spinner"></div>
          <p>Retrieving Open-Meteo Weather Forecast...</p>
        </div>
      `;
      return;
    }

    const isKn = this.currentLang === 'kn';
    const conditionText = isKn ? w.conditionKn : w.condition;
    const advisory = w.advisory;

    container.innerHTML = `
      <div class="weather-card">
        <div class="weather-header">
          <div class="weather-loc">
            <span class="weather-loc-pin">📍</span>
            <div>
              <h4>${land ? land.location : "Karnataka Arecanut Belt"}</h4>
              <span class="weather-source">${w.source} • ${w.lastUpdated}</span>
            </div>
          </div>
          <div class="weather-badge ${advisory.severity}">
            ${advisory.badge || "Advisory"}
          </div>
        </div>

        <div class="weather-main-grid">
          <div class="weather-curr">
            <span class="weather-icon-big">${w.icon}</span>
            <div>
              <div class="weather-temp">${w.temperature}°C</div>
              <div class="weather-cond">${conditionText}</div>
            </div>
          </div>
          <div class="weather-params">
            <div class="param-row">
              <span class="param-label">💧 ${isKn ? 'ಮಳೆ ಸಂಭವನೀಯತೆ' : 'Rain Probability'}:</span>
              <span class="param-val"><strong>${w.rainProbability}%</strong></span>
            </div>
            <div class="param-row">
              <span class="param-label">🌧️ ${isKn ? 'ನಿರೀಕ್ಷಿತ ಮಳೆ' : 'Expected Rainfall'}:</span>
              <span class="param-val"><strong>${w.expectedRainfallMm} mm</strong></span>
            </div>
            <div class="param-row">
              <span class="param-label">💨 ${isKn ? 'ಗಾಳಿಯ ವೇಗ' : 'Wind Speed'}:</span>
              <span class="param-val">${w.windSpeed} km/h</span>
            </div>
          </div>
        </div>

        <div class="weather-advisory-box ${advisory.severity}">
          <span class="advisory-icon">💡</span>
          <div class="advisory-body">
            <strong>${isKn ? 'ಸ್ಮಾರ್ಟ್ ಇಳಿಜಾರು ಸಲಹೆ:' : 'Smart Slope Advisory:'}</strong>
            <p>${isKn ? advisory.recommendationKn : advisory.recommendation}</p>
          </div>
        </div>

        <div class="weather-mini-forecast">
          ${(w.dailyOutlook || []).map(day => `
            <div class="forecast-day-col">
              <span class="day-label">${day.day}</span>
              <span class="day-icon">${day.icon}</span>
              <span class="day-temps">${day.maxTemp}° / ${day.minTemp}°</span>
              <span class="day-rain ${day.rainProb > 40 ? 'rain-high' : ''}">${day.rainProb}%</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render Home Cards for Every Registered Land (Section 2 & 3)
   */
  renderHomeCards() {
    const grid = document.getElementById('home-lands-grid');
    if (!grid) return;

    const isKn = this.currentLang === 'kn';

    grid.innerHTML = this.lands.map(land => {
      const z1 = land.zones[0];
      const z2 = land.zones[1];
      const z3 = land.zones[2];

      const activeValves = land.zones.filter(z => z.valveStatus === 'open').length;
      const runoffDetected = land.zones.some(z => z.runoffDetected);
      const lowMoistureCount = land.zones.filter(z => z.moisture <= z.dryThreshold).length;

      let statusBadge = '';
      if (runoffDetected) {
        statusBadge = `<span class="badge-status badge-critical">🚨 RUNOFF PAUSED</span>`;
      } else if (activeValves > 0) {
        statusBadge = `<span class="badge-status badge-running"><span class="pulse-dot"></span> WATERING (${activeValves} Zones)</span>`;
      } else if (lowMoistureCount > 0) {
        statusBadge = `<span class="badge-status badge-warning">⚠️ ${lowMoistureCount} ZONES DRY</span>`;
      } else {
        statusBadge = `<span class="badge-status badge-normal">✅ MOISTURE OPTIMAL</span>`;
      }

      return `
        <div class="land-summary-card ${land.id === this.selectedLandId ? 'active-border' : ''}">
          <div class="land-card-header">
            <div>
              <div class="land-card-title-row">
                <h3 class="land-title">${land.name}</h3>
                <span class="slope-type-pill">${land.slopeAngle || 'Moderate Slope'}</span>
              </div>
              <p class="land-location">📍 ${land.location} • 🌾 ${land.crop} (${land.area} Acres)</p>
            </div>
            ${statusBadge}
          </div>

          <!-- 3-Zone Slope Visualizer Strip -->
          <div class="slope-visual-strip">
            <div class="slope-step slope-step-upper">
              <div class="step-meta">
                <span class="step-label">Z1: Upper Slope</span>
                <span class="step-val ${z1.moisture < z1.dryThreshold ? 'val-dry' : ''}">${z1.moisture}%</span>
              </div>
              <div class="mini-bar-track">
                <div class="mini-bar-fill ${this.getMoistureBarColorClass(z1.moisture, z1.dryThreshold, z1.targetMoisture)}" style="width: ${z1.moisture}%"></div>
              </div>
              <span class="valve-tag ${z1.valveStatus === 'open' ? 'valve-on' : 'valve-off'}">
                ${z1.valveStatus === 'open' ? '💧 Valve Open' : 'Closed'}
              </span>
            </div>

            <div class="slope-connector">⬇️</div>

            <div class="slope-step slope-step-middle">
              <div class="step-meta">
                <span class="step-label">Z2: Middle Slope</span>
                <span class="step-val ${z2.moisture < z2.dryThreshold ? 'val-dry' : ''}">${z2.moisture}%</span>
              </div>
              <div class="mini-bar-track">
                <div class="mini-bar-fill ${this.getMoistureBarColorClass(z2.moisture, z2.dryThreshold, z2.targetMoisture)}" style="width: ${z2.moisture}%"></div>
              </div>
              <span class="valve-tag ${z2.valveStatus === 'open' ? 'valve-on' : 'valve-off'}">
                ${z2.valveStatus === 'open' ? '💧 Valve Open' : 'Closed'}
              </span>
            </div>

            <div class="slope-connector">⬇️</div>

            <div class="slope-step slope-step-lower">
              <div class="step-meta">
                <span class="step-label">Z3: Lower Slope</span>
                <span class="step-val ${z3.moisture > 65 ? 'val-wet' : ''}">${z3.moisture}%</span>
              </div>
              <div class="mini-bar-track">
                <div class="mini-bar-fill ${this.getMoistureBarColorClass(z3.moisture, z3.dryThreshold, z3.targetMoisture)}" style="width: ${z3.moisture}%"></div>
              </div>
              <span class="valve-tag ${z3.valveStatus === 'open' ? 'valve-on' : 'valve-off'}">
                ${z3.valveStatus === 'open' ? '💧 Valve Open' : 'Closed'}
              </span>
            </div>
          </div>

          <!-- Bottom Footer Details -->
          <div class="land-card-footer">
            <div class="water-consumed-stat">
              <span class="stat-muted">${isKn ? 'ಇಂದಿನ ನೀರು ಬಳಕೆ:' : 'Water Used Today:'}</span>
              <strong>${(land.waterUsedToday || 0).toLocaleString()} Liters</strong>
              <span class="stat-saved">🌿 ~${(land.totalWaterSaved || Math.round((land.waterUsedToday || 0) * 0.41)).toLocaleString()}L saved</span>
            </div>

            <div class="land-card-actions">
              <button class="btn btn-outline btn-sm" onclick="app.selectLandAndOpen('${land.id}', 'land-detail')">
                🔍 ${isKn ? 'ವಿವರಣೆ ಮತ್ತು ನಿಯಂತ್ರಣ' : 'Inspect Land & Zones'}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  selectLandAndOpen(landId, view = 'land-detail') {
    this.selectedLandId = landId;
    this.saveToStorage();
    this.navigateTo(view);
  }

  /**
   * Render Land Detail View with Interactive Slope Cross-Section Diagram & 3 Zone Cards
   */
  renderLandDetailView() {
    const container = document.getElementById('land-detail-container');
    if (!container) return;

    const land = this.getActiveLand();
    if (!land) {
      container.innerHTML = `<div class="empty-state"><p>No land selected. Register or select a land from the top bar.</p></div>`;
      return;
    }

    const isKn = this.currentLang === 'kn';

    container.innerHTML = `
      <div class="land-detail-header-card">
        <div class="land-dh-left">
          <div class="land-dh-title-wrap">
            <h2>${land.name}</h2>
            <span class="slope-type-pill">${land.slopeAngle}</span>
            <span class="hardware-id-pill">📡 Controller: ${land.controllerId} (${land.controllerStatus})</span>
          </div>
          <p class="land-dh-sub">📍 ${land.location} | 🌴 ${land.crop} | 📐 ${land.area} Acres | 🌍 Coordinates: ${land.lat.toFixed(4)}°N, ${land.lon.toFixed(4)}°E</p>
        </div>
        <div class="land-dh-right">
          <button class="btn btn-outline btn-sm" onclick="app.openEditLandModal('${land.id}')">✏️ ${isKn ? 'ಸಂಪಾದಿಸಿ' : 'Edit Land'}</button>
          <button class="btn btn-danger-outline btn-sm" onclick="app.confirmDeleteLand('${land.id}')">🗑️ ${isKn ? 'ತೆಗೆದುಹಾಕಿ' : 'Remove'}</button>
        </div>
      </div>

      <!-- Slope Cross-Section Interactive Diagram -->
      <div class="slope-elevation-diagram-card">
        <div class="slope-diagram-title">
          <h4>⛰️ ${isKn ? 'ಇಳಿಜಾರು ತೋಟದ ನೀರಾವರಿ ವಿನ್ಯಾಸ (Cross-Section)' : 'Sloping Plantation Elevation & Water Flow Dynamics'}</h4>
          <span class="slope-diagram-sub">${isKn ? 'ಗುರುತ್ವಾಕರ್ಷಣೆಯಿಂದ ನೀರು ಮೇಲಿನಿಂದ ಕೆಳಕ್ಕೆ ಹರಿಯುತ್ತದೆ' : 'Shows elevation gradient, gravity percolation & runoff accumulation'}</span>
        </div>

        <div class="slope-diagram-canvas">
          <!-- Zone 1 Upper Terrace -->
          <div class="diagram-tier tier-zone1">
            <div class="tier-badge">
              <span class="tier-pos">ZONE 1: UPPER CREST</span>
              <span class="tier-elevation">Elevation: +18m</span>
            </div>
            <div class="tier-indicators">
              <span class="moist-pill ${land.zones[0].moisture < land.zones[0].dryThreshold ? 'pill-dry' : ''}">Moisture: ${land.zones[0].moisture}%</span>
              <span class="valve-pill ${land.zones[0].valveStatus === 'open' ? 'pill-active' : ''}">Valve: ${land.zones[0].valveStatus.toUpperCase()}</span>
            </div>
            <div class="flow-arrow-down">⬇️ Gravitational Downflow ⬇️</div>
          </div>

          <!-- Zone 2 Middle Terrace -->
          <div class="diagram-tier tier-zone2">
            <div class="tier-badge">
              <span class="tier-pos">ZONE 2: MIDDLE TERRACE</span>
              <span class="tier-elevation">Elevation: +9m</span>
            </div>
            <div class="tier-indicators">
              <span class="moist-pill ${land.zones[1].moisture < land.zones[1].dryThreshold ? 'pill-dry' : ''}">Moisture: ${land.zones[1].moisture}%</span>
              <span class="valve-pill ${land.zones[1].valveStatus === 'open' ? 'pill-active' : ''}">Valve: ${land.zones[1].valveStatus.toUpperCase()}</span>
            </div>
            <div class="flow-arrow-down">⬇️ Sub-Surface Seepage ⬇️</div>
          </div>

          <!-- Zone 3 Lower Terrace -->
          <div class="diagram-tier tier-zone3">
            <div class="tier-badge">
              <span class="tier-pos">ZONE 3: LOWER VALLEY</span>
              <span class="tier-elevation">Elevation: 0m (Basin)</span>
            </div>
            <div class="tier-indicators">
              <span class="moist-pill ${land.zones[2].moisture > 65 ? 'pill-wet' : ''}">Moisture: ${land.zones[2].moisture}%</span>
              <span class="valve-pill ${land.zones[2].valveStatus === 'open' ? 'pill-active' : ''}">Valve: ${land.zones[2].valveStatus.toUpperCase()}</span>
            </div>
            <div class="ditch-indicator">🌿 Drainage Sump & Contour Trenches</div>
          </div>
        </div>
      </div>

      <!-- 3 Independent Zone Cards -->
      <div class="three-zones-grid">
        ${land.zones.map((zone, idx) => this.renderSingleZoneCard(land, zone, idx, isKn)).join('')}
      </div>
    `;
  }

  /**
   * Render a dedicated Zone Card with all requirements from Section 4 & 5
   */
  renderSingleZoneCard(land, zone, idx, isKn) {
    const moistureInfo = window.smartSlopeIrrigation.getMoistureStatus(zone.moisture, zone.dryThreshold, zone.targetMoisture);
    const isValveOpen = zone.valveStatus === 'open';
    const isRunning = zone.irrigationStatus === 'running';
    const isPaused = zone.irrigationStatus === 'paused';
    const isRunoff = zone.runoffDetected;

    return `
      <div class="zone-card ${isRunoff ? 'zone-card-runoff' : ''}" id="card-zone-${zone.id}">
        <div class="zone-card-top">
          <div class="zone-pos-badge">
            <span class="zone-num-circle">${idx + 1}</span>
            <div>
              <h3 class="zone-title">${zone.name}</h3>
              <span class="zone-elevation-subtitle">${zone.position}</span>
            </div>
          </div>
          <span class="moisture-status-tag ${moistureInfo.badgeClass}">
            ${isKn ? moistureInfo.labelKn : moistureInfo.label}
          </span>
        </div>

        <!-- Moisture Gauge Circle & Percentage -->
        <div class="zone-gauge-row">
          <div class="circular-progress" style="--val: ${zone.moisture}%; --color: ${moistureInfo.color}">
            <div class="inner-circle">
              <span class="gauge-pct">${zone.moisture}%</span>
              <span class="gauge-sub">${isKn ? 'ತೇವಾಂಶ' : 'Moisture'}</span>
            </div>
          </div>

          <div class="zone-metrics-column">
            <div class="zone-metric-item">
              <span class="zm-label">${isKn ? 'ಕವಾಟದ ಸ್ಥಿತಿ (Valve):' : 'Valve Status:'}</span>
              <span class="zm-val ${isValveOpen ? 'text-success' : 'text-muted'}">
                ${isValveOpen ? '💧 OPEN (Flowing)' : '🔒 CLOSED'}
              </span>
            </div>
            <div class="zone-metric-item">
              <span class="zm-label">${isKn ? 'ನೀರಾವರಿ ಸ್ಥಿತಿ:' : 'Irrigation Status:'}</span>
              <span class="zm-val ${isRunning ? 'text-primary' : isPaused ? 'text-warning' : 'text-muted'}">
                ${isRunning ? '▶️ Running' : isPaused ? '⏸️ Paused' : '⏹️ Stopped'}
              </span>
            </div>
            <div class="zone-metric-item">
              <span class="zm-label">${isKn ? 'ಹರಿದುಹೋಗುವಿಕೆ (Runoff):' : 'Runoff Sensor:'}</span>
              <span class="zm-val ${isRunoff ? 'text-danger font-bold' : 'text-success'}">
                ${isRunoff ? '🚨 DETECTED' : '✅ Safe / No Runoff'}
              </span>
            </div>
            <div class="zone-metric-item">
              <span class="zm-label">${isKn ? 'ಇಂದಿನ ಬಳಕೆ:' : 'Water Used Today:'}</span>
              <span class="zm-val font-semibold">${zone.waterUsedToday || 0} Liters</span>
            </div>
          </div>
        </div>

        <!-- Runoff Alert Warning Banner if detected -->
        ${isRunoff ? `
          <div class="runoff-alert-box">
            <span class="rab-icon">⚠️</span>
            <div class="rab-text">
              <strong>${isKn ? 'ನೀರು ಹರಿದುಹೋಗುವಿಕೆ ಪತ್ತೆಯಾಗಿದೆ!' : 'Runoff Lockout Engaged!'}</strong>
              <p>${isKn ? 'ಮಣ್ಣಿನ ರಕ್ಷಣೆಗಾಗಿ ಕವಾಟವನ್ನು ಮುಚ್ಚಲಾಗಿದೆ.' : 'Valve held shut to protect topsoil erosion.'}</p>
            </div>
            <button class="btn btn-warning-sm" onclick="app.clearRunoffLockout('${land.id}', '${zone.id}')">
              ${isKn ? 'ತೆರವುಗೊಳಿಸಿ' : 'Clear Lock'}
            </button>
          </div>
        ` : ''}

        <!-- Description Note -->
        <p class="zone-desc-note">${zone.description}</p>

        <!-- Thresholds & Config row -->
        <div class="zone-thresholds-bar">
          <span>Dry Trigger: <strong><${zone.dryThreshold}%</strong></span>
          <span>Target: <strong>${zone.targetMoisture}%</strong></span>
          <span>Max Duration: <strong>${zone.maxRunMinutes || 40}m</strong></span>
        </div>

        <!-- Manual Controls (Start, Pause, Stop) -->
        <div class="zone-controls-row">
          <button 
            class="btn btn-success btn-sm ${isRunning ? 'disabled' : ''}" 
            onclick="app.triggerZoneManual('${land.id}', '${zone.id}', 'start')"
            ${isRunning || isRunoff ? 'disabled' : ''}>
            ▶️ ${isKn ? 'ಪ್ರಾರಂಭಿಸಿ' : 'Start'}
          </button>
          <button 
            class="btn btn-warning btn-sm ${!isRunning ? 'disabled' : ''}" 
            onclick="app.triggerZoneManual('${land.id}', '${zone.id}', 'pause')"
            ${!isRunning ? 'disabled' : ''}>
            ⏸️ ${isKn ? 'ವಿರಾಮ' : 'Pause'}
          </button>
          <button 
            class="btn btn-danger btn-sm ${!isRunning && !isPaused ? 'disabled' : ''}" 
            onclick="app.triggerZoneManual('${land.id}', '${zone.id}', 'stop')"
            ${!isRunning && !isPaused ? 'disabled' : ''}>
            ⏹️ ${isKn ? 'ನಿಲ್ಲಿಸಿ' : 'Stop'}
          </button>
        </div>

        <div class="zone-card-bottom-info">
          <span class="update-ts">🕒 ${isKn ? 'ಕೊನೆಯ ನವೀಕರಣ:' : 'Updated:'} ${new Date(zone.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          <span class="sensor-temp">🌡️ ${zone.soilTemp || 26.5}°C</span>
        </div>
      </div>
    `;
  }

  /**
   * Fast DOM update for zone cards during live simulation
   */
  updateZoneCardsLive() {
    const land = this.getActiveLand();
    if (!land) return;

    land.zones.forEach((zone, idx) => {
      const card = document.getElementById(`card-zone-${zone.id}`);
      if (!card) return;

      const pctEl = card.querySelector('.gauge-pct');
      if (pctEl) pctEl.innerText = `${zone.moisture}%`;

      const progressCircle = card.querySelector('.circular-progress');
      if (progressCircle) {
        progressCircle.style.setProperty('--val', `${zone.moisture}%`);
      }
    });
  }

  /**
   * Render Dedicated 3-Zone Telemetry View (Section 4)
   */
  renderZonesDedicatedView() {
    const container = document.getElementById('zones-view-container');
    if (!container) return;

    const land = this.getActiveLand();
    if (!land) return;
    const isKn = this.currentLang === 'kn';

    container.innerHTML = `
      <div class="active-land-banner mb-3">
        <span>📍 ${isKn ? 'ಪ್ರಸ್ತುತ ಜಮೀನು:' : 'Active Land:'} <strong>${land.name}</strong> (${land.location})</span>
        <span class="slope-type-pill">${land.slopeAngle}</span>
      </div>

      <div class="slope-explanation-banner">
        <span class="seb-icon">⛰️</span>
        <div class="seb-content">
          <strong>${isKn ? 'ಇಳಿಜಾರಿನ ವಲಯ ತತ್ತ್ವ:' : '3-Zone Sloping Land Dynamics:'}</strong>
          <p>${isKn 
            ? 'ವಲಯ 1 (ಮೇಲ್ಭಾಗ) ಬಿಸಿಲು ಮತ್ತು ಇಳಿಜಾರಿನಿಂದ ಶೀಘ್ರವಾಗಿ ಒಣಗುತ್ತದೆ. ವಲಯ 2 (ಮಧ್ಯಭಾಗ) ಮಧ್ಯಮ ಇಂಗುವಿಕೆಯನ್ನು ಹೊಂದಿದೆ. ವಲಯ 3 (ಕೆಳಭಾಗ) ಗುರುತ್ವಾಕರ್ಷಣೆಯ ನೀರನ್ನು ಸಂಗ್ರಹಿಸುತ್ತದೆ ಮತ್ತು ಬೇರು ಕೊಳೆಯುವ ಅಪಾಯವನ್ನು ಹೊಂದಿರುತ್ತದೆ.' 
            : 'Zone 1 (Upper) dries rapidly due to gravity and solar exposure. Zone 2 (Middle) acts as an absorption buffer. Zone 3 (Lower) collects drainage; excessive moisture triggers root rot risk.'}</p>
        </div>
      </div>

      <div class="three-zones-grid mt-3">
        ${land.zones.map((zone, idx) => this.renderSingleZoneCard(land, zone, idx, isKn)).join('')}
      </div>
    `;
  }

  /**
   * Render Dedicated Irrigation & Runoff Control View (Section 5 & 6)
   */
  renderIrrigationDedicatedView() {
    const container = document.getElementById('irrigation-view-container');
    if (!container) return;

    const land = this.getActiveLand();
    if (!land) return;
    const isKn = this.currentLang === 'kn';

    const hasRunoff = land.zones.some(z => z.runoffDetected);
    const activeValves = land.zones.filter(z => z.valveStatus === 'open').length;

    container.innerHTML = `
      <div class="active-land-banner mb-3">
        <span>📍 ${isKn ? 'ಪ್ರಸ್ತುತ ಜಮೀನು:' : 'Active Land:'} <strong>${land.name}</strong></span>
        <span>${isKn ? 'ತೆರೆದಿರುವ ಕವಾಟಗಳು:' : 'Active Valves:'} <strong>${activeValves} / 3</strong></span>
      </div>

      ${hasRunoff ? `
        <div class="runoff-alert-box mb-4">
          <span class="rab-icon">🚨</span>
          <div class="rab-text">
            <strong>${isKn ? 'ತುರ್ತು ಎಚ್ಚರಿಕೆ: ನೀರು ಹರಿದುಹೋಗುವಿಕೆ ಪತ್ತೆಯಾಗಿದೆ!' : 'EMERGENCY: Surface Runoff Detected on Sloping Ground!'}</strong>
            <p>${isKn ? 'ಮಣ್ಣಿನ ಸವೆತ ತಡೆಯಲು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ನೀರಾವರಿಯನ್ನು ನಿಲ್ಲಿಸಲಾಗಿದೆ. ಮಣ್ಣು ನೀರನ್ನು ಹೀರಿಕೊಳ್ಳಲು ಬಿಡಿ.' : 'Automatic irrigation safely paused. Runoff safety interlocks engaged to prevent slope wash.'}</p>
          </div>
          <button class="btn btn-warning-sm" onclick="app.clearAllRunoffs('${land.id}')">
            ${isKn ? 'ಎಲ್ಲಾ ಲಾಕ್ ತೆರವುಗೊಳಿಸಿ' : 'Clear All Safety Locks'}
          </button>
        </div>
      ` : ''}

      <div class="irrigation-master-bar mb-4">
        <div>
          <h4>${isKn ? 'ಸ್ವಯಂಚಾಲಿತ ಇಳಿಜಾರು ನಿಯಂತ್ರಣ' : 'Intelligent Slope-Aware Closed-Loop Automation'}</h4>
          <p class="text-sm text-muted">${isKn ? 'ಪ್ರತಿ ವಲಯವು ಸ್ವತಂತ್ರ ಕವಾಟ ಮತ್ತು ಸಂವೇದಕ ನಿಯಂತ್ರಣವನ್ನು ಹೊಂದಿದೆ' : 'Each zone acts independently based on moisture thresholds and gravity seepage'}</p>
        </div>
        <div class="master-buttons-row">
          <button class="btn btn-danger btn-sm" onclick="app.stopAllValves('${land.id}')">
            ⏹️ ${isKn ? 'ಎಲ್ಲಾ ಕವಾಟಗಳನ್ನು ನಿಲ್ಲಿಸಿ' : 'Emergency Stop All'}
          </button>
        </div>
      </div>

      <div class="three-zones-grid">
        ${land.zones.map((zone, idx) => this.renderSingleZoneCard(land, zone, idx, isKn)).join('')}
      </div>
    `;
  }

  stopAllValves(landId) {
    const land = this.lands.find(l => l.id === landId);
    if (!land) return;

    land.zones.forEach(z => {
      if (window.smartSlopeIrrigation) {
        window.smartSlopeIrrigation.executeCommand(land, z.id, 'stop', 'Emergency Master Stop All');
      }
    });

    this.saveToStorage();
    this.updateDashboardUI(true);
    this.showToast("All irrigation valves stopped safely", "warning");
  }

  clearAllRunoffs(landId) {
    const land = this.lands.find(l => l.id === landId);
    if (!land) return;

    land.zones.forEach(z => {
      z.runoffDetected = false;
      if (z.irrigationStatus === 'paused') z.irrigationStatus = 'stopped';
    });

    this.saveToStorage();
    this.updateDashboardUI(true);
    this.showToast("Runoff locks cleared across all zones", "info");
  }

  /**
   * Render Comprehensive Weather Page (Section 7)
   */
  renderWeatherFullPage() {
    const container = document.getElementById('weather-full-widget');
    if (!container) return;

    const w = this.weatherData;
    const land = this.getActiveLand();
    const isKn = this.currentLang === 'kn';

    if (!w) {
      container.innerHTML = `<div class="p-4 text-center">Loading weather data from Open-Meteo...</div>`;
      return;
    }

    container.innerHTML = `
      <div class="weather-full-card">
        <div class="wfc-header">
          <div>
            <h3>📍 ${land ? land.name : 'Estate'} - ${land ? land.location : 'Karnataka'}</h3>
            <span class="text-muted text-sm">Lat: ${land ? land.lat.toFixed(4) : 13.5}°, Lon: ${land ? land.lon.toFixed(4) : 75.3}° | Data Source: ${w.source}</span>
          </div>
          <div class="weather-badge ${w.advisory.severity}">
            ${w.advisory.badge || "Weather Active"}
          </div>
        </div>

        <div class="wfc-current-row">
          <div class="wfc-main-temp">
            <span class="wfc-icon">${w.icon}</span>
            <div>
              <div class="wfc-temp-num">${w.temperature}°C</div>
              <div class="wfc-condition">${isKn ? w.conditionKn : w.condition}</div>
            </div>
          </div>

          <div class="wfc-metrics-grid">
            <div class="wfc-metric">
              <span class="wfc-m-label">🌧️ ${isKn ? 'ಇಂದಿನ ಮಳೆ ಸಂಭವನೀಯತೆ:' : 'Rain Probability Today:'}</span>
              <span class="wfc-m-val"><strong>${w.rainProbability}%</strong></span>
            </div>
            <div class="wfc-metric">
              <span class="wfc-m-label">💧 ${isKn ? 'ನಿರೀಕ್ಷಿತ ಮಳೆ ಪ್ರಮಾಣ:' : 'Expected Rainfall Today:'}</span>
              <span class="wfc-m-val"><strong>${w.expectedRainfallMm} mm</strong></span>
            </div>
            <div class="wfc-metric">
              <span class="wfc-m-label">🌧️ ${isKn ? 'ನಾಳೆಯ ಮಳೆ ಸಂಭವನೀಯತೆ:' : 'Tomorrow Rain Probability:'}</span>
              <span class="wfc-m-val"><strong>${w.tomorrowRainProb}%</strong></span>
            </div>
            <div class="wfc-metric">
              <span class="wfc-m-label">💧 ${isKn ? 'ನಾಳೆಯ ಮಳೆ ಪ್ರಮಾಣ:' : 'Tomorrow Expected Rain:'}</span>
              <span class="wfc-m-val"><strong>${w.tomorrowRainMm} mm</strong></span>
            </div>
            <div class="wfc-metric">
              <span class="wfc-m-label">💨 ${isKn ? 'ಗಾಳಿಯ ವೇಗ:' : 'Wind Speed:'}</span>
              <span class="wfc-m-val">${w.windSpeed} km/h</span>
            </div>
            <div class="wfc-metric">
              <span class="wfc-m-label">💧 ${isKn ? 'ಗಾಳಿಯ ತೇವಾಂಶ:' : 'Relative Humidity:'}</span>
              <span class="wfc-m-val">${w.humidity}%</span>
            </div>
          </div>
        </div>

        <!-- Weather Recommendation Banner -->
        <div class="weather-advisory-box ${w.advisory.severity} mt-4">
          <span class="advisory-icon" style="font-size: 24px;">💡</span>
          <div class="advisory-body">
            <h4 style="margin-bottom: 4px;">${isKn ? 'ಹವಾಮಾನ ಆಧಾರಿತ ಸ್ಮಾರ್ಟ್ ಇಳಿಜಾರು ಸಲಹೆ:' : 'Weather-Based Slope Irrigation Recommendation:'}</h4>
            <p style="font-size: 13.5px;">${isKn ? w.advisory.recommendationKn : w.advisory.recommendation}</p>
            <p class="text-sm mt-1 text-muted"><strong>Reasoning:</strong> ${w.advisory.reason}</p>
          </div>
        </div>

        <!-- 3-Day Forecast Cards -->
        <h4 class="mt-4 mb-2">📅 3-Day Agro-Weather Outlook</h4>
        <div class="weather-mini-forecast" style="grid-template-columns: repeat(3, 1fr);">
          ${(w.dailyOutlook || []).map(day => `
            <div class="forecast-day-col p-3">
              <span class="day-label" style="font-size: 13px;">${day.day}</span>
              <span class="day-icon" style="font-size: 28px;">${day.icon}</span>
              <span class="day-temps" style="font-size: 14px;">${day.maxTemp}°C / ${day.minTemp}°C</span>
              <span class="day-rain ${day.rainProb > 40 ? 'rain-high' : ''}" style="font-size: 13px; font-weight:700;">Rain: ${day.rainProb}% (${day.rainSum}mm)</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render My Lands Management Page (Section 3)
   */
  renderMyLandsPage() {
    const container = document.getElementById('my-lands-container');
    if (!container) return;

    const isKn = this.currentLang === 'kn';

    container.innerHTML = `
      <div class="my-lands-top-bar">
        <div>
          <h2>${isKn ? 'ನನ್ನ ಜಮೀನುಗಳು (My Lands)' : 'Registered Lands & Fields'}</h2>
          <p class="section-subtitle">${isKn ? 'ನಿಮ್ಮ ಎಲ್ಲಾ ಅಡಿಕೆ ತೋಟಗಳ ವಿವರ ಮತ್ತು ನಿರ್ವಹಣೆ' : 'Configure individual sloping orchards, slope angles, and crop varieties'}</p>
        </div>
        <button class="btn btn-primary" onclick="app.openAddLandModal()">
          ➕ ${isKn ? 'ಹೊಸ ಜಮೀನು ಸೇರಿಸಿ' : 'Add New Land'}
        </button>
      </div>

      <div class="my-lands-table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>${isKn ? 'ಜಮೀನಿನ ಹೆಸರು' : 'Land Name'}</th>
              <th>${isKn ? 'ಸ್ಥಳ' : 'Location'}</th>
              <th>${isKn ? 'ವಿಸ್ತೀರ್ಣ (Acres)' : 'Area'}</th>
              <th>${isKn ? 'ಇಳಿಜಾರಿನ ಮಾದರಿ' : 'Slope Type'}</th>
              <th>${isKn ? 'ಬೆಳೆ' : 'Crop'}</th>
              <th>${isKn ? '3-ವಲಯಗಳ ತೇವಾಂಶ' : '3-Zone Moisture'}</th>
              <th>${isKn ? 'ಇಂದಿನ ನೀರು' : 'Water Today'}</th>
              <th>${isKn ? 'ಕ್ರಮಗಳು' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            ${this.lands.map(land => `
              <tr class="${land.id === this.selectedLandId ? 'active-row' : ''}">
                <td>
                  <strong>${land.name}</strong>
                  <br><small class="text-muted">${land.controllerId}</small>
                </td>
                <td>${land.location}</td>
                <td>${land.area} Ac</td>
                <td><span class="slope-type-pill">${land.slopeAngle}</span></td>
                <td>${land.crop}</td>
                <td>
                  <div class="table-zone-strip">
                    <span title="Upper Slope">Z1: ${land.zones[0].moisture}%</span> |
                    <span title="Middle Slope">Z2: ${land.zones[1].moisture}%</span> |
                    <span title="Lower Slope">Z3: ${land.zones[2].moisture}%</span>
                  </div>
                </td>
                <td><strong>${(land.waterUsedToday || 0).toLocaleString()} L</strong></td>
                <td>
                  <div class="action-btns-group">
                    <button class="btn-icon" title="Inspect" onclick="app.selectLandAndOpen('${land.id}', 'land-detail')">🔍</button>
                    <button class="btn-icon" title="Edit" onclick="app.openEditLandModal('${land.id}')">✏️</button>
                    <button class="btn-icon text-danger" title="Remove" onclick="app.confirmDeleteLand('${land.id}')">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render Smart Recommendations section (Section 9)
   */
  renderRecommendations() {
    const container = document.getElementById('home-recommendations-container');
    if (!container) return;

    const recommendations = this.generateSmartRecommendations();
    const isKn = this.currentLang === 'kn';

    if (recommendations.length === 0) {
      container.innerHTML = `
        <div class="recommendations-empty">
          <span class="rec-icon-check">✅</span>
          <div>
            <strong>${isKn ? 'ಎಲ್ಲಾ ಪರಿಸ್ಥಿತಿಗಳು ಉತ್ತಮವಾಗಿವೆ' : 'All Conditions Optimal'}</strong>
            <p>${isKn ? 'ಪ್ರಸ್ತುತ ಯಾವುದೇ ತುರ್ತು ಬದಲಾವಣೆಗಳ ಅಗತ್ಯವಿಲ್ಲ. ನಿಯಮಿತ ತೇವಾಂಶ ನಿರ್ವಹಣೆ ಮುಂದುವರಿದಿದೆ.' : 'Soil moisture in upper, middle, and lower zones are within target bands. No water runoff or stress detected.'}</p>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = recommendations.map(rec => `
      <div class="recommendation-card ${rec.severity}">
        <div class="rec-header">
          <span class="rec-badge ${rec.severity}">${rec.badge}</span>
          <span class="rec-target-zone">📍 ${rec.landName} • ${rec.zoneName}</span>
        </div>
        <h4 class="rec-title">${isKn ? rec.titleKn : rec.title}</h4>
        <div class="rec-reason-box">
          <strong>${isKn ? 'ಕಾರಣ:' : 'Reason:'}</strong> ${isKn ? rec.reasonKn : rec.reason}
        </div>
        <div class="rec-action-box">
          <strong>${isKn ? 'ಶಿಫಾರಸು ಮಾಡಿದ ಕ್ರಮ:' : 'Suggested Action:'}</strong> ${isKn ? rec.suggestedActionKn : rec.suggestedAction}
        </div>
        ${rec.actionBtn ? `
          <div class="rec-btn-wrap">
            <button class="btn btn-primary-sm" onclick="app.executeRecAction('${rec.id}')">
              ${rec.actionBtn.text}
            </button>
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  executeRecAction(recId) {
    const recommendations = this.generateSmartRecommendations();
    const match = recommendations.find(r => r.id === recId);
    if (match && match.actionBtn && match.actionBtn.action) {
      match.actionBtn.action();
    }
  }

  /**
   * Render Recent Alerts List on Home Dashboard (Section 2)
   */
  renderRecentAlertsWidget() {
    const container = document.getElementById('home-recent-alerts');
    if (!container) return;

    const isKn = this.currentLang === 'kn';
    const recent = this.alerts.slice(0, 4);

    if (recent.length === 0) {
      container.innerHTML = `<p class="text-muted p-3">No active alerts. System healthy.</p>`;
      return;
    }

    container.innerHTML = recent.map(alt => `
      <div class="recent-alert-item ${alt.severity} ${alt.active ? 'is-active' : 'is-resolved'}">
        <span class="alert-icon-sym">${alt.severity === 'critical' ? '🚨' : alt.severity === 'warning' ? '⚠️' : 'ℹ️'}</span>
        <div class="alert-item-content">
          <div class="alert-item-head">
            <span class="alert-target">${alt.landName} • ${alt.zoneName}</span>
            <span class="alert-time">${new Date(alt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <p class="alert-item-msg">${isKn && alt.kannadaMessage ? alt.kannadaMessage : alt.message}</p>
        </div>
      </div>
    `).join('');
  }

  /**
   * Render Alerts Full Page (Section 11)
   */
  renderAlertsList() {
    const container = document.getElementById('alerts-page-container');
    if (!container) return;

    const isKn = this.currentLang === 'kn';

    container.innerHTML = `
      <div class="alerts-top-bar">
        <div>
          <h2>${isKn ? 'ಎಚ್ಚರಿಕೆಗಳು ಮತ್ತು ಸೂಚನೆಗಳು' : 'Notifications & Field Alerts'}</h2>
          <p class="section-subtitle">${isKn ? 'ಮಣ್ಣಿನ ತೇವಾಂಶ, ನೀರು ಹರಿದುಹೋಗುವಿಕೆ ಮತ್ತು ನಿಯಂತ್ರಕದ ಸ್ಥಿತಿ' : 'Complete audit trail of moisture alerts, runoff incidents, and irrigation triggers'}</p>
        </div>
        <div class="alerts-action-btns">
          <button class="btn btn-outline btn-sm" onclick="app.clearAllResolvedAlerts()">
            🧹 ${isKn ? 'ಪರಿಹರಿಸಿದವುಗಳನ್ನು ತೆರವುಗೊಳಿಸಿ' : 'Clear Resolved'}
          </button>
        </div>
      </div>

      <div class="alerts-full-list">
        ${this.alerts.length === 0 ? `
          <div class="empty-state">
            <span class="empty-icon">🔔</span>
            <p>No notifications or safety warnings recorded.</p>
          </div>
        ` : this.alerts.map(alt => `
          <div class="alert-full-card ${alt.severity} ${alt.active ? 'active-alert' : 'resolved-alert'}">
            <div class="afc-header">
              <div class="afc-tags">
                <span class="afc-severity-badge ${alt.severity}">${alt.severity.toUpperCase()}</span>
                <span class="afc-loc">📍 ${alt.landName} • ${alt.zoneName}</span>
                <span class="afc-status-pill">${alt.active ? '🔴 Active Warning' : '🟢 Resolved'}</span>
              </div>
              <span class="afc-date">${new Date(alt.timestamp).toLocaleString()}</span>
            </div>

            <div class="afc-body">
              <h4 class="afc-en-msg">${alt.message}</h4>
              ${alt.kannadaMessage ? `<p class="afc-kn-msg">ಕನ್ನಡ: ${alt.kannadaMessage}</p>` : ''}
            </div>

            <div class="afc-footer">
              <button class="btn btn-outline btn-sm" onclick="smartSlopeVoice.speakAlert({ kannadaText: '${alt.kannadaMessage || alt.message}', englishText: '${alt.message}', severity: '${alt.severity}' })">
                🔊 ${isKn ? 'ಧ್ವನಿ ಕೇಳಿ' : 'Play Voice'}
              </button>
              ${alt.active ? `
                <button class="btn btn-success-sm" onclick="app.resolveAlert('${alt.id}')">
                  ✓ ${isKn ? 'ಪರಿಹರಿಸಲಾಗಿದೆ ಎಂದು ಗುರುತಿಸಿ' : 'Mark as Resolved'}
                </button>
              ` : `
                <span class="resolved-note">Resolved at ${new Date(alt.resolvedAt || alt.timestamp).toLocaleTimeString()}</span>
              `}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Render Analytics Page (Section 8)
   */
  renderAnalyticsPage() {
    const container = document.getElementById('analytics-page-container');
    if (!container) return;

    const land = this.getActiveLand();
    const isKn = this.currentLang === 'kn';

    container.innerHTML = `
      <div class="analytics-top-bar">
        <div>
          <h2>📊 ${isKn ? 'ನೀರಿನ ಬಳಕೆ ಮತ್ತು ವಿಶ್ಲೇಷಣೆ' : 'Water Consumption & Slope Analytics'}</h2>
          <p class="section-subtitle">${isKn ? 'ಇಳಿಜಾರಿನಲ್ಲಿ ನೀರಿನ ಉಳಿತಾಯ ಮತ್ತು ತೇವಾಂಶದ ಇತಿಹಾಸ' : 'Interactive charts, zone-by-zone breakdown, and water savings vs traditional slope flooding'}</p>
        </div>
        <div class="analytics-actions-row">
          <div class="timeframe-selector">
            <button class="tf-btn ${this.activeTimeframe === 'day' ? 'active' : ''}" onclick="app.setTimeframe('day')">24 Hours</button>
            <button class="tf-btn ${this.activeTimeframe === 'week' ? 'active' : ''}" onclick="app.setTimeframe('week')">7 Days</button>
            <button class="tf-btn ${this.activeTimeframe === 'month' ? 'active' : ''}" onclick="app.setTimeframe('month')">30 Days</button>
          </div>
          <button class="btn btn-primary-sm" onclick="smartSlopeAnalytics.exportToCsv(app.lands, app.history, app.isDemoMode)">
            📥 ${isKn ? 'ವರದಿ ಡೌನ್‌ಲೋಡ್ (CSV)' : 'Export CSV Log'}
          </button>
        </div>
      </div>

      <!-- Demo Data Banner Disclaimer required by Prompt -->
      <div class="demo-data-disclaimer">
        ℹ️ <strong>Demo Data Notice:</strong> Currently displaying telemetry and continuous logs in Demo Simulation mode. Live readings will stream when ESP32 hardware is connected.
      </div>

      <!-- KPI Summary Cards -->
      <div class="analytics-kpi-grid">
        <div class="akpi-card">
          <span class="akpi-label">${isKn ? 'ಇಂದಿನ ನೀರು ಬಳಕೆ' : 'Water Applied Today'}</span>
          <span class="akpi-num" id="stat-water-used-today">-- L</span>
          <span class="akpi-sub">Across 3 slope zones</span>
        </div>
        <div class="akpi-card akpi-saved">
          <span class="akpi-label">${isKn ? 'ಉಳಿತಾಯವಾದ ನೀರು (vs Flooding)' : 'Water Conserved vs Flood'}</span>
          <span class="akpi-num text-success" id="stat-water-saved-today">-- L</span>
          <span class="akpi-sub">~41% average slope reduction</span>
        </div>
        <div class="akpi-card">
          <span class="akpi-label">${isKn ? 'ಉಳಿತಾಯವಾದ ಪಂಪ್ ಸಮಯ' : 'Pumping Hours Saved'}</span>
          <span class="akpi-num" id="stat-pump-saved-today">-- hrs</span>
          <span class="akpi-sub">Reduced motor wear</span>
        </div>
        <div class="akpi-card">
          <span class="akpi-label">${isKn ? 'ವಿದ್ಯುತ್ ಉಳಿತಾಯ ಮೊತ್ತ' : 'Est. Electricity Savings'}</span>
          <span class="akpi-num text-primary" id="stat-rupees-saved-today">₹--</span>
          <span class="akpi-sub">At ₹7.50 / kWh tariff</span>
        </div>
      </div>

      <!-- Charts Grid -->
      <div class="analytics-charts-grid">
        <div class="chart-box chart-full">
          <div class="chart-box-header">
            <h4>📈 Soil Moisture Trends: Zone 1 (Upper), Zone 2 (Middle) & Zone 3 (Lower)</h4>
            <span class="chart-subtitle">Tracks rapid upper slope drainage vs lower slope accumulation</span>
          </div>
          <div class="chart-canvas-wrapper">
            <canvas id="moistureTrendChart"></canvas>
          </div>
        </div>

        <div class="chart-box chart-half">
          <div class="chart-box-header">
            <h4>💧 Water Consumed by Zone (Liters)</h4>
            <span class="chart-subtitle">Zone 1 typically consumes more due to evaporation and gravity loss</span>
          </div>
          <div class="chart-canvas-wrapper">
            <canvas id="waterUsageChart"></canvas>
          </div>
        </div>

        <div class="chart-box chart-half">
          <div class="chart-box-header">
            <h4>🌱 Water Conservation Ratio (vs Flood Baseline)</h4>
            <span class="chart-subtitle">Eliminates downstream runoff wastage on sloping areca fields</span>
          </div>
          <div class="chart-canvas-wrapper">
            <canvas id="waterSavingsChart"></canvas>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      if (window.smartSlopeAnalytics) {
        window.smartSlopeAnalytics.renderCharts(land, this.activeTimeframe, this.isDemoMode);
      }
    }, 50);
  }

  setTimeframe(tf) {
    this.activeTimeframe = tf;
    this.renderAnalyticsPage();
  }

  /**
   * Render Hardware & ESP32 Configuration Page (Section 14 & 15)
   */
  renderHardwarePage() {
    const container = document.getElementById('hardware-page-container');
    if (!container) return;

    const land = this.getActiveLand();
    const isKn = this.currentLang === 'kn';

    container.innerHTML = `
      <div class="hardware-top-bar">
        <div>
          <h2>📡 ${isKn ? 'ಹಾರ್ಡ್‌ವೇರ್ ಮತ್ತು ಇಎಸ್‌ಪಿ೩೨ ಸಂಯೋಜನೆ' : 'Hardware & ESP32 Microcontroller Integration'}</h2>
          <p class="section-subtitle">${isKn ? 'ಸಂವೇದಕಗಳು, ರಿಲೇ ವಾಲ್ವ್‌ಗಳು ಮತ್ತು ಲೈವ್ ಸಿಮ್ಯುಲೇಟರ್' : 'Connect real ESP32 sensors or test with interactive slope physics demo'}</p>
        </div>
        <div class="hardware-mode-switch">
          <span class="hw-switch-label">Operation Mode:</span>
          <button class="btn btn-sm ${this.isDemoMode ? 'btn-primary' : 'btn-outline'}" onclick="app.setDemoMode(true)">
            🎮 Demo Simulator
          </button>
          <button class="btn btn-sm ${!this.isDemoMode ? 'btn-primary' : 'btn-outline'}" onclick="app.setDemoMode(false)">
            🔌 ESP32 Live Gateway
          </button>
        </div>
      </div>

      <!-- Live Simulator Injection Controls for testing -->
      <div class="simulator-controls-card">
        <div class="sim-card-header">
          <div>
            <h4>🧪 Interactive Slope Test Lab (Simulator Controls)</h4>
            <p>Inject real-time conditions to observe the system's runoff interlocks, voice alerts, and automated valves:</p>
          </div>
          <span class="sim-badge">${this.isDemoMode ? 'SIMULATOR ACTIVE' : 'GATEWAY MODE'}</span>
        </div>

        <div class="sim-buttons-row">
          <button class="btn btn-outline" onclick="smartSlopeSimulator.injectDrought(app.getActiveLand(), 'zone-1', app)">
            ☀️ Simulate Dry Upper Slope (<30% Moisture)
          </button>
          <button class="btn btn-danger-outline" onclick="smartSlopeSimulator.injectRunoff(app.getActiveLand(), 'zone-1', app)">
            🌊 Trigger Surface Runoff Alert (Zone 1)
          </button>
          <button class="btn btn-outline" onclick="smartSlopeSimulator.injectRainstorm(app.getActiveLand(), app)">
            ⛈️ Simulate Heavy Downpour (>25mm)
          </button>
          <button class="btn btn-outline" onclick="smartSlopeVoice.testAlert()">
            🔊 Test Kannada / English Voice
          </button>
        </div>
      </div>

      <!-- Hardware Architecture & Pinout -->
      <div class="hardware-specs-grid">
        <div class="spec-card">
          <h4>🔌 ESP32 Pinout Mapping (Per Land)</h4>
          <ul class="spec-list">
            <li><strong>GPIO 34 (ADC1):</strong> Capacitive Soil Moisture Sensor #1 (Zone 1 Upper Slope)</li>
            <li><strong>GPIO 35 (ADC1):</strong> Capacitive Soil Moisture Sensor #2 (Zone 2 Middle Slope)</li>
            <li><strong>GPIO 32 (ADC1):</strong> Capacitive Soil Moisture Sensor #3 (Zone 3 Lower Slope)</li>
            <li><strong>GPIO 33 (Digital):</strong> Optical / Water Flow Runoff Sensor</li>
            <li><strong>GPIO 25 (Relay 1):</strong> 12V Solenoid Valve #1 (Zone 1)</li>
            <li><strong>GPIO 26 (Relay 2):</strong> 12V Solenoid Valve #2 (Zone 2)</li>
            <li><strong>GPIO 27 (Relay 3):</strong> 12V Solenoid Valve #3 (Zone 3)</li>
          </ul>
        </div>

        <div class="spec-card">
          <h4>🌐 REST API & Microcontroller Endpoints</h4>
          <ul class="spec-list">
            <li><code>POST /api/telemetry</code> - ESP32 posts moisture, runoff, & temperature.</li>
            <li><code>GET /api/control/:landId</code> - ESP32 polls valve open/close commands.</li>
            <li><code>POST /api/irrigation/command</code> - Direct manual valve override.</li>
          </ul>
          <p class="mt-2 text-sm text-muted">A full production-ready Arduino sketch is located at <code>esp32/esp32_smartslope.ino</code> in the project directory.</p>
        </div>
      </div>
    `;
  }

  setDemoMode(val) {
    this.isDemoMode = val;
    this.showToast(val ? "Demo Simulation Mode Enabled" : "ESP32 Hardware Gateway Mode Enabled", "info");
    this.render();
  }

  /**
   * Render Settings Page (Section 12)
   */
  renderSettingsPage() {
    const container = document.getElementById('settings-page-container');
    if (!container) return;

    const land = this.getActiveLand();
    const isKn = this.currentLang === 'kn';

    container.innerHTML = `
      <div class="settings-top-bar">
        <div>
          <h2>⚙️ ${isKn ? 'ವ್ಯವಸ್ಥೆಯ ಸೆಟ್ಟಿಂಗ್‌ಗಳು' : 'System Settings & Thresholds'}</h2>
          <p class="section-subtitle">${isKn ? 'ಮಣ್ಣಿನ ತೇವಾಂಶ ಮಿತಿಗಳು, ಧ್ವನಿ ಆದ್ಯತೆಗಳು ಮತ್ತು ನಿಯತಾಂಕಗಳು' : 'Configure dry triggers, target moisture, voice language, and safety timers'}</p>
        </div>
      </div>

      <div class="settings-sections-wrap">
        <!-- Zone Moisture Threshold Settings -->
        <div class="settings-card">
          <h3>🌱 ${isKn ? 'ವಲಯವಾರು ತೇವಾಂಶ ಮಿತಿಗಳು (Moisture Thresholds)' : 'Zone Moisture Threshold Configuration'}</h3>
          <p class="text-muted text-sm mb-3">Configure automatic start (dry threshold) and automatic stop (target moisture) for ${land ? land.name : 'Active Land'}.</p>

          ${land ? land.zones.map(zone => `
            <div class="threshold-slider-group">
              <div class="slider-header">
                <strong>${zone.name} (${zone.position})</strong>
                <span class="slider-vals">Start when <span id="val-dry-${zone.id}">${zone.dryThreshold}%</span> | Stop at <span id="val-target-${zone.id}">${zone.targetMoisture}%</span></span>
              </div>
              <div class="sliders-row">
                <label>Dry Trigger (%):</label>
                <input type="range" min="15" max="45" value="${zone.dryThreshold}" oninput="app.updateThreshold('${land.id}', '${zone.id}', 'dryThreshold', this.value)">
                <label>Target Stop (%):</label>
                <input type="range" min="45" max="75" value="${zone.targetMoisture}" oninput="app.updateThreshold('${land.id}', '${zone.id}', 'targetMoisture', this.value)">
              </div>
            </div>
          `).join('') : '<p>No land selected.</p>'}
        </div>

        <!-- Voice & Language Preferences -->
        <div class="settings-card">
          <h3>🔊 ${isKn ? 'ಧ್ವನಿ ಮತ್ತು ಭಾಷೆಯ ಸೆಟ್ಟಿಂಗ್‌ಗಳು' : 'Voice & Language Preferences'}</h3>
          <div class="setting-item-row">
            <div>
              <strong>${isKn ? 'ಕನ್ನಡ / ಇಂಗ್ಲಿಷ್ ಭಾಷೆ' : 'Interface Language'}</strong>
              <p class="text-sm text-muted">Choose your preferred dashboard language.</p>
            </div>
            <div class="lang-pills-wrap">
              <button class="btn btn-sm ${this.currentLang === 'kn' ? 'btn-primary' : 'btn-outline'}" onclick="app.applyLanguage('kn')">ಕನ್ನಡ (Kannada)</button>
              <button class="btn btn-sm ${this.currentLang === 'en' ? 'btn-primary' : 'btn-outline'}" onclick="app.applyLanguage('en')">English</button>
            </div>
          </div>

          <div class="setting-item-row">
            <div>
              <strong>${isKn ? 'ಧ್ವನಿ ಎಚ್ಚರಿಕೆಗಳನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ' : 'Audio Speech Alerts'}</strong>
              <p class="text-sm text-muted">Plays browser voice announcements when runoff is detected or moisture is low.</p>
            </div>
            <button class="btn btn-sm ${window.smartSlopeVoice?.enabled ? 'btn-success' : 'btn-outline'}" onclick="app.toggleVoiceAlerts()">
              ${window.smartSlopeVoice?.enabled ? '🔊 Voice ON' : '🔇 Voice OFF'}
            </button>
          </div>

          <div class="setting-item-row">
            <div>
              <strong>${isKn ? 'ಧ್ವನಿ ಪರೀಕ್ಷೆ' : 'Test Speech Engine'}</strong>
              <p class="text-sm text-muted">Test speaker audio in the active language.</p>
            </div>
            <button class="btn btn-outline btn-sm" onclick="smartSlopeVoice.testAlert()">
              📢 ${isKn ? 'ಪರೀಕ್ಷಾರ್ಥ ಧ್ವನಿ ಪ್ಲೇ ಮಾಡಿ' : 'Play Test Alert'}
            </button>
          </div>
        </div>

        <!-- Danger Zone / Data Reset -->
        <div class="settings-card border-danger">
          <h3 class="text-danger">⚠️ Reset & Restore</h3>
          <p class="text-sm text-muted">Reset all land data and moisture records back to default sample arecanut plantations.</p>
          <button class="btn btn-danger-outline btn-sm mt-3" onclick="app.resetToDefaults()">
            🔄 Reset to Default Sample Plantations
          </button>
        </div>
      </div>
    `;
  }

  updateThreshold(landId, zoneId, key, value) {
    const land = this.lands.find(l => l.id === landId);
    if (!land) return;
    const zone = land.zones.find(z => z.id === zoneId);
    if (!zone) return;

    zone[key] = parseInt(value, 10);
    const labelEl = document.getElementById(key === 'dryThreshold' ? `val-dry-${zone.id}` : `val-target-${zone.id}`);
    if (labelEl) labelEl.innerText = `${zone[key]}%`;

    this.saveToStorage();
  }

  toggleVoiceAlerts() {
    if (window.smartSlopeVoice) {
      const isEnabled = window.smartSlopeVoice.toggleVoice();
      this.showToast(isEnabled ? "Voice alerts enabled" : "Voice alerts muted", "info");
      this.renderSettingsPage();
    }
  }

  resetToDefaults() {
    if (confirm("Reset all lands, telemetry, and alerts back to default sample arecanut plantations?")) {
      localStorage.removeItem(window.SMARTSLOPE_CONFIG.storageKey);
      this.lands = JSON.parse(JSON.stringify(window.SMARTSLOPE_CONFIG.initialLands));
      this.alerts = JSON.parse(JSON.stringify(window.SMARTSLOPE_CONFIG.initialAlerts));
      this.selectedLandId = "land-1";
      this.saveToStorage();
      this.showToast("Restored default arecanut plantations", "success");
      this.render();
    }
  }

  /**
   * Modals Management
   */
  openAddLandModal() {
    const modal = document.getElementById('modal-add-land');
    if (modal) modal.classList.add('active');
  }

  closeAddLandModal() {
    const modal = document.getElementById('modal-add-land');
    if (modal) modal.classList.remove('active');
  }

  openEditLandModal(landId) {
    const land = this.lands.find(l => l.id === landId);
    if (!land) return;

    const modal = document.getElementById('modal-edit-land');
    if (!modal) return;

    document.getElementById('edit-land-id').value = land.id;
    document.getElementById('edit-land-name').value = land.name;
    document.getElementById('edit-land-location').value = land.location;
    document.getElementById('edit-land-area').value = land.area;
    document.getElementById('edit-land-crop').value = land.crop;
    document.getElementById('edit-land-slope').value = land.slopeAngle;

    modal.classList.add('active');
  }

  closeEditLandModal() {
    const modal = document.getElementById('modal-edit-land');
    if (modal) modal.classList.remove('active');
  }

  confirmDeleteLand(landId) {
    const land = this.lands.find(l => l.id === landId);
    if (!land) return;

    if (confirm(`Are you sure you want to remove "${land.name}"? All 3 slope zones and logs for this field will be permanently deleted.`)) {
      this.deleteLand(landId);
    }
  }

  /**
   * Toast Notifications Helper
   */
  showToast(message, type = "info") {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-pill ${type}`;
    toast.innerHTML = `
      <span class="toast-dot"></span>
      <span class="toast-text">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  updateNotificationBadge() {
    const activeCount = this.alerts.filter(a => a.active).length;
    const badge = document.getElementById('nav-alert-badge');
    if (badge) {
      badge.innerText = activeCount;
      badge.style.display = activeCount > 0 ? 'inline-flex' : 'none';
    }
  }

  getMoistureBarColorClass(val, dry, target) {
    if (val < dry) return 'bar-dry';
    if (val > target + 10) return 'bar-wet';
    return 'bar-optimal';
  }

  /**
   * Event Listeners Setup
   */
  setupEventListeners() {
    // Nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.dataset.view;
        if (view) this.navigateTo(view);
      });
    });

    // Top Land Dropdown
    const selector = document.getElementById('nav-land-selector');
    if (selector) {
      selector.addEventListener('change', (e) => {
        this.selectLand(e.target.value);
      });
    }

    // Add Land Form
    const addForm = document.getElementById('form-add-land');
    if (addForm) {
      addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = {
          name: document.getElementById('add-land-name').value,
          location: document.getElementById('add-land-location').value,
          area: document.getElementById('add-land-area').value,
          crop: document.getElementById('add-land-crop').value,
          slopeAngle: document.getElementById('add-land-slope').value,
          lat: document.getElementById('add-land-lat').value || 13.5,
          lon: document.getElementById('add-land-lon').value || 75.3
        };
        this.addLand(formData);
        this.closeAddLandModal();
        addForm.reset();
      });
    }

    // Edit Land Form
    const editForm = document.getElementById('form-edit-land');
    if (editForm) {
      editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const landId = document.getElementById('edit-land-id').value;
        const formData = {
          name: document.getElementById('edit-land-name').value,
          location: document.getElementById('edit-land-location').value,
          area: document.getElementById('edit-land-area').value,
          crop: document.getElementById('edit-land-crop').value,
          slopeAngle: document.getElementById('edit-land-slope').value
        };
        this.editLand(landId, formData);
        this.closeEditLandModal();
      });
    }
  }
}

// Global application bootstrap
window.addEventListener('DOMContentLoaded', () => {
  window.app = new SmartSlopeApp();
});
