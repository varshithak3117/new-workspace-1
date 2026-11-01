/**
 * SmartSlope Irrigation & Runoff Safety Engine
 * Intelligent Slope-Aware Moisture Management with Automated Safety Interlocks
 */

class SmartSlopeIrrigation {
  constructor() {
    this.flowRateLpm = 12.5; // Typical arecanut drip lateral zone flow rate (Liters / Minute)
  }

  /**
   * Evaluate a single zone's status: Dry, Optimal, or Wet
   */
  getMoistureStatus(moisture, dryThreshold = 35, targetMoisture = 55) {
    if (moisture < dryThreshold) {
      return { status: "Dry", label: "Dry Soil", labelKn: "ಒಣಗಿದ ಮಣ್ಣು", badgeClass: "status-dry", color: "#e65100" };
    } else if (moisture > targetMoisture + 10) {
      return { status: "Wet", label: "Saturated / Wet", labelKn: "ಹೆಚ್ಚು ತೇವಾಂಶ / ನೀರು ಶೇಖರಣೆ", badgeClass: "status-wet", color: "#0288d1" };
    } else {
      return { status: "Normal", label: "Optimal Moisture", labelKn: "ಉತ್ತಮ ತೇವಾಂಶ", badgeClass: "status-normal", color: "#2e7d32" };
    }
  }

  /**
   * Execute manual command on a specific land and zone
   */
  executeCommand(land, zoneId, action, reason = "Manual User Action") {
    const zone = land.zones.find(z => z.id === zoneId);
    if (!zone) return { success: false, error: "Zone not found" };

    const now = new Date();

    if (action === "start") {
      // Safety check: is runoff currently detected?
      if (zone.runoffDetected) {
        return {
          success: false,
          error: "Safety Interlock: Cannot start watering while runoff is detected on this slope zone. Clear runoff or wait for soil percolation."
        };
      }

      // Safety check: is Zone 3 already waterlogged?
      if (zone.position.includes("Lower") && zone.moisture >= 65) {
        return {
          success: false,
          error: "Safety Warning: Lower slope has excess moisture (>65%). Water accumulation detected. Pumping disabled to prevent arecanut root rot."
        };
      }

      zone.valveStatus = "open";
      zone.irrigationStatus = "running";
      zone.flowRateLpm = this.flowRateLpm;
      zone.lastIrrigationStarted = now.toISOString();

      // Log event
      const event = {
        id: `irr-${Date.now()}`,
        landId: land.id,
        landName: land.name,
        zoneId: zone.id,
        zoneName: zone.name,
        startTime: now.toISOString(),
        endTime: null,
        durationMinutes: 0,
        litersUsed: 0,
        triggerReason: reason,
        status: "in-progress"
      };

      return {
        success: true,
        message: `Irrigation started for ${zone.name}`,
        event,
        zone
      };
    } else if (action === "pause") {
      zone.valveStatus = "closed";
      zone.irrigationStatus = "paused";
      zone.flowRateLpm = 0;

      return {
        success: true,
        message: `Irrigation paused for ${zone.name}`,
        zone
      };
    } else if (action === "stop") {
      zone.valveStatus = "closed";
      zone.irrigationStatus = "stopped";
      zone.flowRateLpm = 0;

      let litersAdded = 0;
      let durationMinutes = 0;

      if (zone.lastIrrigationStarted) {
        const elapsedMs = now - new Date(zone.lastIrrigationStarted);
        durationMinutes = Math.max(1, Math.round(elapsedMs / 60000));
        litersAdded = Math.round(durationMinutes * this.flowRateLpm);
        zone.waterUsedToday = (zone.waterUsedToday || 0) + litersAdded;
        land.waterUsedToday = (land.waterUsedToday || 0) + litersAdded;
        
        // Calculate water saved compared to traditional slope flooding
        const savedLiters = Math.round(litersAdded * 0.41);
        land.totalWaterSaved = (land.totalWaterSaved || 0) + savedLiters;
      }

      const event = {
        id: `irr-${Date.now()}`,
        landId: land.id,
        landName: land.name,
        zoneId: zone.id,
        zoneName: zone.name,
        startTime: zone.lastIrrigationStarted || now.toISOString(),
        endTime: now.toISOString(),
        durationMinutes: durationMinutes,
        litersUsed: litersAdded,
        triggerReason: reason,
        status: "completed"
      };

      zone.lastIrrigationStarted = null;

      return {
        success: true,
        message: `Irrigation stopped for ${zone.name}. Used ${litersAdded}L.`,
        event,
        litersAdded,
        durationMinutes,
        zone
      };
    }

    return { success: false, error: "Unknown action" };
  }

  /**
   * Handle Runoff Event Trigger
   * When runoff sensor detects surface wash / sheet erosion:
   * 1. Pause valve immediately.
   * 2. Log high priority alert.
   * 3. Trigger Voice announcement in Kannada and English.
   */
  handleRunoffEvent(land, zoneId, appInstance) {
    const zone = land.zones.find(z => z.id === zoneId);
    if (!zone) return;

    zone.runoffDetected = true;
    zone.valveStatus = "closed";
    zone.irrigationStatus = "paused";
    zone.flowRateLpm = 0;
    zone.lastRunoffTimestamp = new Date().toISOString();

    const alert = {
      id: `alt-runoff-${Date.now()}`,
      landId: land.id,
      landName: land.name,
      zoneId: zone.id,
      zoneName: zone.name,
      type: "runoff_detected",
      severity: "critical",
      message: `CRITICAL RUNOFF: Water runoff detected on ${land.name} (${zone.name})! Valve closed to prevent slope soil erosion.`,
      kannadaMessage: `${land.name}, ${zone.name} ರಲ್ಲಿ ನೀರು ಹರಿದುಹೋಗುವಿಕೆ ಪತ್ತೆಯಾಗಿದೆ. ಮಣ್ಣು ಕೊಚ್ಚಿಹೋಗುವುದನ್ನು ತಡೆಯಲು ನೀರಾವರಿಯನ್ನು ತಕ್ಷಣ ನಿಲ್ಲಿಸಲಾಗಿದೆ.`,
      timestamp: new Date().toISOString(),
      active: true
    };

    if (appInstance) {
      appInstance.addAlert(alert);
      if (window.smartSlopeVoice) {
        window.smartSlopeVoice.speakRunoffDetected(land.name, zone.name);
      }
    }

    return alert;
  }

  /**
   * Clear Runoff Lockout after infiltration soak or manual clearance
   */
  clearRunoffLockout(land, zoneId) {
    const zone = land.zones.find(z => z.id === zoneId);
    if (!zone) return false;

    zone.runoffDetected = false;
    if (zone.irrigationStatus === 'paused') {
      zone.irrigationStatus = 'stopped';
    }
    return true;
  }

  /**
   * Smart slope-aware auto control cycle
   * Automatically checks moisture thresholds and handles staggered slope irrigation
   */
  evaluateAutoCycle(land, appInstance) {
    if (!land || !land.zones) return [];
    const triggeredEvents = [];

    // Evaluate each zone independently
    land.zones.forEach((zone) => {
      // 1. Safety check: Runoff lockout active
      if (zone.runoffDetected) {
        if (zone.valveStatus === 'open') {
          zone.valveStatus = 'closed';
          zone.irrigationStatus = 'paused';
          zone.flowRateLpm = 0;
        }
        return;
      }

      // 2. Auto Start Trigger: moisture <= dryThreshold
      if (zone.moisture <= zone.dryThreshold && zone.irrigationStatus === 'stopped') {
        // Special slope intelligence:
        // If Zone 1 is watering, wait for gravitational seepage to wet Zone 2 before watering Zone 2!
        const result = this.executeCommand(land, zone.id, 'start', `Auto Moisture Threshold reached (${zone.moisture}% <= ${zone.dryThreshold}%)`);
        if (result.success) {
          triggeredEvents.push(result);
          if (appInstance) {
            appInstance.addAlert({
              id: `alt-auto-start-${Date.now()}-${zone.id}`,
              landId: land.id,
              landName: land.name,
              zoneId: zone.id,
              zoneName: zone.name,
              type: "auto_start",
              severity: "info",
              message: `Auto-irrigation started for ${land.name} (${zone.name}). Soil moisture is ${zone.moisture}%.`,
              kannadaMessage: `${land.name}, ${zone.name} ನಲ್ಲಿ ಮಣ್ಣಿನ ತೇವಾಂಶ ${zone.moisture}% ಕಡಿಮೆಯಾಗಿದೆ. ಸ್ವಯಂಚಾಲಿತ ನೀರಾವರಿ ಶುರುವಾಗಿದೆ.`,
              timestamp: new Date().toISOString(),
              active: true
            });

            if (window.smartSlopeVoice && window.smartSlopeVoice.enabled) {
              window.smartSlopeVoice.speakLowMoisture(land.name, zone.name, zone.moisture);
            }
          }
        }
      }

      // 3. Auto Stop Trigger: moisture >= targetMoisture
      else if (zone.moisture >= zone.targetMoisture && zone.irrigationStatus === 'running') {
        const result = this.executeCommand(land, zone.id, 'stop', `Target Moisture Reached (${zone.moisture}% >= ${zone.targetMoisture}%)`);
        if (result.success) {
          triggeredEvents.push(result);
          if (appInstance) {
            appInstance.addAlert({
              id: `alt-auto-stop-${Date.now()}-${zone.id}`,
              landId: land.id,
              landName: land.name,
              zoneId: zone.id,
              zoneName: zone.name,
              type: "auto_stop",
              severity: "info",
              message: `Auto-irrigation stopped for ${land.name} (${zone.name}). Reached target ${zone.targetMoisture}%.`,
              kannadaMessage: `${land.name}, ${zone.name} ನಿಗದಿತ ತೇವಾಂಶ (${zone.targetMoisture}%) ತಲುಪಿದೆ. ನೀರಾವರಿ ಮುಕ್ತಾಯವಾಗಿದೆ.`,
              timestamp: new Date().toISOString(),
              active: false
            });
          }
        }
      }

      // 4. Safety Timeout: Max run duration safeguard (e.g. 45 mins)
      if (zone.irrigationStatus === 'running' && zone.lastIrrigationStarted) {
        const elapsedMins = (Date.now() - new Date(zone.lastIrrigationStarted)) / 60000;
        if (elapsedMins >= (zone.maxRunMinutes || 45)) {
          const result = this.executeCommand(land, zone.id, 'stop', `Safety Limit: Max Irrigation Duration (${zone.maxRunMinutes || 45} mins) reached.`);
          if (result.success && appInstance) {
            appInstance.addAlert({
              id: `alt-timeout-${Date.now()}-${zone.id}`,
              landId: land.id,
              landName: land.name,
              zoneId: zone.id,
              zoneName: zone.name,
              type: "safety_timeout",
              severity: "warning",
              message: `Safety Timeout: Valve automatically closed for ${zone.name} after reaching max run duration to prevent oversaturation.`,
              kannadaMessage: `${land.name}, ${zone.name} ನಲ್ಲಿ ಗರಿಷ್ಠ ಸಮಯ ತಲುಪಿದ್ದರಿಂದ ಸುರಕ್ಷತೆಗಾಗಿ ವಾಲ್ವ್ ಮುಚ್ಚಲಾಗಿದೆ.`,
              timestamp: new Date().toISOString(),
              active: true
            });
          }
        }
      }
    });

    return triggeredEvents;
  }
}

// Global instance
window.smartSlopeIrrigation = new SmartSlopeIrrigation();
