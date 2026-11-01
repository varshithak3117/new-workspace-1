/**
 * SmartSlope Configuration, Seeds, and Agricultural Constants
 * Specialized for Sloping Arecanut Plantations (Karnataka Areca Belt)
 */

const SMARTSLOPE_CONFIG = {
  appName: "SmartSlope",
  appSubtitle: "Smart Irrigation Management for Sloping Arecanut Plantations",
  appSubtitleKn: "ಅಡಿಕೆ ತೋಟಗಳ ಇಳಿಜಾರು ಸ್ಮಾರ್ಟ್ ನೀರಾವರಿ ನಿರ್ವಹಣಾ ವ್ಯವಸ್ಥೆ",
  storageKey: "smartslope_plantation_v1",
  apiBaseUrl: "http://localhost:3000/api", // backend if available
  autoSyncIntervalMs: 5000,
  
  // Traditional vs Smart Slope Irrigation metrics
  // On sloping arecanut orchards, traditional flooding wastes ~40% through surface runoff down to the valley
  traditionalFloodLitersPerAcrePerDay: 2200,
  smartSlopeSavingsPercent: 41, // ~41% water saved via slope-staged drip pulse
  
  // Default regional weather coordinates in Karnataka Arecanut Belt
  districts: [
    { name: "Sringeri (Chikkamagaluru)", lat: 13.4216, lon: 75.2562 },
    { name: "Thirthahalli (Shivamogga)", lat: 13.6923, lon: 75.2447 },
    { name: "Sirsi (Uttara Kannada)", lat: 14.6195, lon: 74.8354 },
    { name: "Puttur (Dakshina Kannada)", lat: 12.7667, lon: 75.2000 },
    { name: "Sagar (Shivamogga)", lat: 14.1670, lon: 75.0333 },
    { name: "Mudigere (Chikkamagaluru)", lat: 13.1364, lon: 75.6420 },
    { name: "Bantwal (Dakshina Kannada)", lat: 12.8947, lon: 75.0357 }
  ],

  // Initial Sample Lands required by prompt:
  // - Land 1 – Arecanut Plantation, 1 acre
  // - Land 2 – Arecanut Plantation, 2 acres
  // - Land 3 – New Arecanut Field, 1.5 acres
  initialLands: [
    {
      id: "land-1",
      name: "Land 1 – Arecanut Plantation",
      location: "Sringeri, Chikkamagaluru",
      area: 1.0,
      crop: "Arecanut (Mangala Variety)",
      slopeAngle: "Steep Slope (22°)",
      slopeType: "Steep",
      lat: 13.4216,
      lon: 75.2562,
      controllerId: "ESP32-SRG-01",
      controllerStatus: "online",
      lastHeartbeat: new Date().toISOString(),
      waterUsedToday: 420,
      totalWaterSaved: 290,
      zones: [
        {
          id: "zone-1",
          name: "Zone 1 – Upper Slope",
          position: "Upper Slope",
          elevationRank: 1,
          description: "Top hill crest; dries rapidly due to intense sun exposure & downward gravitational pull.",
          moisture: 27,
          targetMoisture: 55,
          dryThreshold: 35,
          valveStatus: "closed",
          irrigationStatus: "stopped",
          runoffDetected: false,
          soilTemp: 27.6,
          flowRateLpm: 0,
          waterUsedToday: 180,
          maxRunMinutes: 45,
          lastUpdated: new Date().toISOString()
        },
        {
          id: "zone-2",
          name: "Zone 2 – Middle Slope",
          position: "Middle Slope",
          elevationRank: 2,
          description: "Terraced central band; receives subsurface gravitational seepage from Zone 1.",
          moisture: 42,
          targetMoisture: 55,
          dryThreshold: 32,
          valveStatus: "closed",
          irrigationStatus: "stopped",
          runoffDetected: false,
          soilTemp: 26.8,
          flowRateLpm: 0,
          waterUsedToday: 140,
          maxRunMinutes: 40,
          lastUpdated: new Date().toISOString()
        },
        {
          id: "zone-3",
          name: "Zone 3 – Lower Slope",
          position: "Lower Slope",
          elevationRank: 3,
          description: "Valley bottom; prone to soil silt accumulation and water stagnation/root rot.",
          moisture: 63,
          targetMoisture: 52,
          dryThreshold: 28,
          valveStatus: "closed",
          irrigationStatus: "stopped",
          runoffDetected: false,
          soilTemp: 25.4,
          flowRateLpm: 0,
          waterUsedToday: 100,
          maxRunMinutes: 30,
          lastUpdated: new Date().toISOString()
        }
      ]
    },
    {
      id: "land-2",
      name: "Land 2 – Arecanut Plantation",
      location: "Thirthahalli, Shivamogga",
      area: 2.0,
      crop: "Arecanut (Sumangala Variety)",
      slopeAngle: "Moderate Slope (15°)",
      slopeType: "Moderate",
      lat: 13.6923,
      lon: 75.2447,
      controllerId: "ESP32-TRT-02",
      controllerStatus: "online",
      lastHeartbeat: new Date().toISOString(),
      waterUsedToday: 780,
      totalWaterSaved: 510,
      zones: [
        {
          id: "zone-1",
          name: "Zone 1 – Upper Slope",
          position: "Upper Slope",
          elevationRank: 1,
          description: "Upper terrace; gravelly laterite soil; high evaporation.",
          moisture: 38,
          targetMoisture: 55,
          dryThreshold: 35,
          valveStatus: "closed",
          irrigationStatus: "stopped",
          runoffDetected: false,
          soilTemp: 27.1,
          flowRateLpm: 0,
          waterUsedToday: 320,
          maxRunMinutes: 45,
          lastUpdated: new Date().toISOString()
        },
        {
          id: "zone-2",
          name: "Zone 2 – Middle Slope",
          position: "Middle Slope",
          elevationRank: 2,
          description: "Middle slope; intercropped with black pepper vines.",
          moisture: 45,
          targetMoisture: 55,
          dryThreshold: 32,
          valveStatus: "closed",
          irrigationStatus: "stopped",
          runoffDetected: false,
          soilTemp: 26.5,
          flowRateLpm: 0,
          waterUsedToday: 260,
          maxRunMinutes: 40,
          lastUpdated: new Date().toISOString()
        },
        {
          id: "zone-3",
          name: "Zone 3 – Lower Slope",
          position: "Lower Slope",
          elevationRank: 3,
          description: "Lower edge bordered by drainage channel.",
          moisture: 57,
          targetMoisture: 52,
          dryThreshold: 28,
          valveStatus: "closed",
          irrigationStatus: "stopped",
          runoffDetected: false,
          soilTemp: 25.6,
          flowRateLpm: 0,
          waterUsedToday: 200,
          maxRunMinutes: 30,
          lastUpdated: new Date().toISOString()
        }
      ]
    },
    {
      id: "land-3",
      name: "Land 3 – New Arecanut Field",
      location: "Sirsi, Uttara Kannada",
      area: 1.5,
      crop: "New Arecanut Saplings (2 Years)",
      slopeAngle: "Gentle Slope (9°)",
      slopeType: "Gentle",
      lat: 14.6195,
      lon: 74.8354,
      controllerId: "ESP32-SRS-03",
      controllerStatus: "online",
      lastHeartbeat: new Date().toISOString(),
      waterUsedToday: 310,
      totalWaterSaved: 220,
      zones: [
        {
          id: "zone-1",
          name: "Zone 1 – Upper Slope",
          position: "Upper Slope",
          elevationRank: 1,
          description: "Upper edge with young saplings; requires delicate micro-drip.",
          moisture: 32,
          targetMoisture: 55,
          dryThreshold: 35,
          valveStatus: "closed",
          irrigationStatus: "stopped",
          runoffDetected: false,
          soilTemp: 28.0,
          flowRateLpm: 0,
          waterUsedToday: 130,
          maxRunMinutes: 35,
          lastUpdated: new Date().toISOString()
        },
        {
          id: "zone-2",
          name: "Zone 2 – Middle Slope",
          position: "Middle Slope",
          elevationRank: 2,
          description: "Middle tier with organic mulch covering.",
          moisture: 48,
          targetMoisture: 55,
          dryThreshold: 32,
          valveStatus: "closed",
          irrigationStatus: "stopped",
          runoffDetected: false,
          soilTemp: 26.9,
          flowRateLpm: 0,
          waterUsedToday: 105,
          maxRunMinutes: 35,
          lastUpdated: new Date().toISOString()
        },
        {
          id: "zone-3",
          name: "Zone 3 – Lower Slope",
          position: "Lower Slope",
          elevationRank: 3,
          description: "Bottom tier collecting fine soil nutrients & runoff.",
          moisture: 53,
          targetMoisture: 52,
          dryThreshold: 28,
          valveStatus: "closed",
          irrigationStatus: "stopped",
          runoffDetected: false,
          soilTemp: 26.1,
          flowRateLpm: 0,
          waterUsedToday: 75,
          maxRunMinutes: 30,
          lastUpdated: new Date().toISOString()
        }
      ]
    }
  ],

  initialAlerts: [
    {
      id: "alt-1",
      landId: "land-1",
      landName: "Land 1 – Arecanut Plantation",
      zoneId: "zone-1",
      zoneName: "Zone 1 – Upper Slope",
      type: "low_moisture",
      severity: "warning",
      message: "Soil moisture dropped to 27% (Threshold: 35%). Upper slope requires irrigation.",
      kannadaMessage: "ಭೂಮಿ 1, ವಲಯ 1 ರಲ್ಲಿ ಮಣ್ಣಿನ ತೇವಾಂಶ ಕಡಿಮೆಯಾಗಿದೆ (27%). ನೀರಾವರಿ ಅಗತ್ಯವಿದೆ.",
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      active: true
    },
    {
      id: "alt-2",
      landId: "land-2",
      landName: "Land 2 – Arecanut Plantation",
      zoneId: "zone-3",
      zoneName: "Zone 3 – Lower Slope",
      type: "high_moisture",
      severity: "info",
      message: "Zone 3 moisture high (57%). Water accumulation from upper slope gravitation.",
      kannadaMessage: "ಭೂಮಿ 2, ವಲಯ 3 ರಲ್ಲಿ ತೇವಾಂಶ ಹೆಚ್ಚಾಗಿದೆ (57%). ಇಳಿಜಾರಿನ ನೀರು ಸಂಗ್ರಹವಾಗುತ್ತಿದೆ.",
      timestamp: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
      active: true
    }
  ]
};

// Expose on window
window.SMARTSLOPE_CONFIG = SMARTSLOPE_CONFIG;
