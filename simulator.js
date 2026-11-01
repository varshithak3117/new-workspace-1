/**
 * SmartSlope Hardware Telemetry & Physics Simulator (Demo Mode)
 * Accurately models gravitational water percolation and runoff on sloping arecanut orchards
 */

class SmartSlopeSimulator {
  constructor() {
    this.isActive = true;
    this.timer = null;
    this.intervalMs = 4000; // updates every 4 seconds
    this.evaporationRate = 0.4; // natural moisture drop per cycle
  }

  start(appInstance) {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.isActive) {
        this.stepSimulation(appInstance);
      }
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * One physical simulation tick across all lands
   */
  stepSimulation(appInstance) {
    if (!appInstance || !appInstance.lands) return;

    let stateChanged = false;

    appInstance.lands.forEach(land => {
      const z1 = land.zones[0]; // Upper Slope
      const z2 = land.zones[1]; // Middle Slope
      const z3 = land.zones[2]; // Lower Slope

      // Zone 1 (Upper Slope) physics:
      // High sunlight exposure, steep slope -> highest evaporation (-0.6% / cycle)
      if (z1.irrigationStatus === 'running') {
        z1.moisture = Math.min(85, z1.moisture + 2.5);
        z1.waterUsedToday = (z1.waterUsedToday || 0) + 2;
        land.waterUsedToday = (land.waterUsedToday || 0) + 2;
        stateChanged = true;

        // Gravity percolation: after upper slope absorbs water, downward sub-surface seepage wets Zone 2
        if (z1.moisture > 45) {
          z2.moisture = Math.min(80, z2.moisture + 0.8);
        }
      } else {
        // Natural soil drying
        if (z1.moisture > 20) {
          z1.moisture = Math.max(18, +(z1.moisture - 0.5).toFixed(1));
          stateChanged = true;
        }
      }

      // Zone 2 (Middle Slope) physics:
      if (z2.irrigationStatus === 'running') {
        z2.moisture = Math.min(85, z2.moisture + 2.2);
        z2.waterUsedToday = (z2.waterUsedToday || 0) + 2;
        land.waterUsedToday = (land.waterUsedToday || 0) + 2;
        stateChanged = true;

        // Downward seepage to Zone 3
        if (z2.moisture > 50) {
          z3.moisture = Math.min(90, z3.moisture + 0.9);
        }
      } else {
        if (z2.moisture > 22) {
          z2.moisture = Math.max(20, +(z2.moisture - 0.35).toFixed(1));
          stateChanged = true;
        }
      }

      // Zone 3 (Lower Slope) physics:
      // Collects runoff and gravitational accumulation from above; slowest drying rate
      if (z3.irrigationStatus === 'running') {
        z3.moisture = Math.min(95, z3.moisture + 2.0);
        z3.waterUsedToday = (z3.waterUsedToday || 0) + 2;
        land.waterUsedToday = (land.waterUsedToday || 0) + 2;
        stateChanged = true;
      } else {
        if (z3.moisture > 25) {
          z3.moisture = Math.max(22, +(z3.moisture - 0.2).toFixed(1));
          stateChanged = true;
        }
      }

      // Update timestamps
      const nowIso = new Date().toISOString();
      z1.lastUpdated = nowIso;
      z2.lastUpdated = nowIso;
      z3.lastUpdated = nowIso;
    });

    if (stateChanged && appInstance) {
      // Run automatic threshold evaluation
      appInstance.evaluateAutoCycle();
      appInstance.updateDashboardUI(false); // fast re-render without full redraw
    }
  }

  /**
   * Inject Runoff Event on a specific zone for testing
   */
  injectRunoff(land, zoneId, appInstance) {
    if (window.smartSlopeIrrigation) {
      const alert = window.smartSlopeIrrigation.handleRunoffEvent(land, zoneId, appInstance);
      appInstance.saveToStorage();
      appInstance.updateDashboardUI(true);
      return alert;
    }
  }

  /**
   * Inject Dry Drought Condition on Zone 1 (Upper Slope)
   */
  injectDrought(land, zoneId = 'zone-1', appInstance) {
    const zone = land.zones.find(z => z.id === zoneId);
    if (zone) {
      zone.moisture = 22; // Well below 35% dry threshold
      appInstance.saveToStorage();
      appInstance.evaluateAutoCycle();
      appInstance.updateDashboardUI(true);
    }
  }

  /**
   * Inject Heavy Rain Downpour (Simulates +25% moisture across all zones and pools in Zone 3)
   */
  injectRainstorm(land, appInstance) {
    if (!land) return;
    land.zones.forEach((z, idx) => {
      z.moisture = Math.min(95, z.moisture + (idx === 2 ? 30 : 20));
      if (z.irrigationStatus === 'running') {
        z.valveStatus = 'closed';
        z.irrigationStatus = 'stopped';
      }
    });

    appInstance.addAlert({
      id: `alt-rain-${Date.now()}`,
      landId: land.id,
      landName: land.name,
      zoneId: 'all',
      zoneName: 'All Zones',
      type: 'rain_event',
      severity: 'info',
      message: `Rainstorm absorbed across ${land.name}. Valleys in Zone 3 are saturated. All irrigation stopped.`,
      kannadaMessage: `${land.name} ನಲ್ಲಿ ಮಳೆ ಸುರಿದಿದೆ. ವಲಯ 3 ರಲ್ಲಿ ನೀರು ತುಂಬಿದೆ. ನೀರಾವರಿಯನ್ನು ನಿಲ್ಲಿಸಲಾಗಿದೆ.`,
      timestamp: new Date().toISOString(),
      active: true
    });

    if (window.smartSlopeVoice) {
      window.smartSlopeVoice.speakAlert({
        kannadaText: `${land.name} ನಲ್ಲಿ ಭಾರಿ ಮಳೆಯಾಗಿದೆ. ಎಲ್ಲಾ ಕವಾಟಗಳನ್ನು ಮುಚ್ಚಲಾಗಿದೆ.`,
        englishText: `Heavy rain absorbed on ${land.name}. All irrigation valves safely closed.`,
        severity: 'info'
      });
    }

    appInstance.saveToStorage();
    appInstance.updateDashboardUI(true);
  }
}

// Global instance
window.smartSlopeSimulator = new SmartSlopeSimulator();
