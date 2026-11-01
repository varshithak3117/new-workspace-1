/**
 * SmartSlope - Backend Server & Hardware Gateway API
 * Provides REST endpoints for Farmer Web Dashboard and ESP32 Microcontrollers
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'smartslope_db.json');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Ensure data folder exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initial Seed Data for Sloping Arecanut Plantations in Karnataka
const defaultDatabase = {
  lands: [
    {
      id: "land-1",
      name: "Land 1 – Arecanut Plantation",
      location: "Sringeri, Chikkamagaluru",
      area: 1.0,
      crop: "Arecanut (Mangala Variety)",
      slopeAngle: "Steep (22°)",
      slopeType: "Steep Slope",
      lat: 13.4216,
      lon: 75.2562,
      controllerId: "ESP32-SRG-01",
      controllerStatus: "online",
      lastHeartbeat: new Date().toISOString(),
      waterUsedToday: 420,
      totalWaterSaved: 280,
      zones: [
        {
          id: "zone-1",
          name: "Zone 1 – Upper Slope",
          position: "Upper Slope",
          description: "Top crest; highest solar radiation and rapid gravity runoff.",
          moisture: 28,
          targetMoisture: 55,
          dryThreshold: 35,
          valveStatus: "closed",
          irrigationStatus: "stopped",
          runoffDetected: false,
          soilTemp: 27.4,
          lastUpdated: new Date().toISOString(),
          flowRateLpm: 0,
          waterUsedToday: 180,
          maxRunMinutes: 45
        },
        {
          id: "zone-2",
          name: "Zone 2 – Middle Slope",
          position: "Middle Slope",
          description: "Terraced central band; moderate downward seepage.",
          moisture: 44,
          targetMoisture: 55,
          dryThreshold: 32,
          valveStatus: "closed",
          irrigationStatus: "stopped",
          runoffDetected: false,
          soilTemp: 26.8,
          lastUpdated: new Date().toISOString(),
          flowRateLpm: 0,
          waterUsedToday: 140,
          maxRunMinutes: 40
        },
        {
          id: "zone-3",
          name: "Zone 3 – Lower Slope",
          position: "Lower Slope",
          description: "Valley bottom; gravity runoff pooling danger & silt accumulation.",
          moisture: 62,
          targetMoisture: 52,
          dryThreshold: 28,
          valveStatus: "closed",
          irrigationStatus: "stopped",
          runoffDetected: false,
          soilTemp: 25.9,
          lastUpdated: new Date().toISOString(),
          flowRateLpm: 0,
          waterUsedToday: 100,
          maxRunMinutes: 30
        }
      ]
    },
    {
      id: "land-2",
      name: "Land 2 – Arecanut Plantation",
      location: "Thirthahalli, Shivamogga",
      area: 2.0,
      crop: "Arecanut (Sumangala Variety)",
      slopeAngle: "Moderate (15°)",
      slopeType: "Moderate Slope",
      lat: 13.6923,
      lon: 75.2447,
      controllerId: "ESP32-TRT-02",
      controllerStatus: "online",
      lastHeartbeat: new Date().toISOString(),
      waterUsedToday: 780,
      totalWaterSaved: 490,
      zones: [
        {
          id: "zone-1",
          name: "Zone 1 – Upper Slope",
          position: "Upper Slope",
          description: "Upper terrace with gravelly red loam soil.",
          moisture: 38,
          targetMoisture: 55,
          dryThreshold: 35,
          valveStatus: "closed",
          irrigationStatus: "stopped",
          runoffDetected: false,
          soilTemp: 27.1,
          lastUpdated: new Date().toISOString(),
          flowRateLpm: 0,
          waterUsedToday: 320,
          maxRunMinutes: 45
        },
        {
          id: "zone-2",
          name: "Zone 2 – Middle Slope",
          position: "Middle Slope",
          description: "Center slope with intercropped pepper vines on palms.",
          moisture: 42,
          targetMoisture: 55,
          dryThreshold: 32,
          valveStatus: "closed",
          irrigationStatus: "stopped",
          runoffDetected: false,
          soilTemp: 26.5,
          lastUpdated: new Date().toISOString(),
          flowRateLpm: 0,
          waterUsedToday: 260,
          maxRunMinutes: 40
        },
        {
          id: "zone-3",
          name: "Zone 3 – Lower Slope",
          position: "Lower Slope",
          description: "Lower edge adjacent to drainage contour ditch.",
          moisture: 58,
          targetMoisture: 52,
          dryThreshold: 28,
          valveStatus: "closed",
          irrigationStatus: "stopped",
          runoffDetected: false,
          soilTemp: 25.7,
          lastUpdated: new Date().toISOString(),
          flowRateLpm: 0,
          waterUsedToday: 200,
          maxRunMinutes: 30
        }
      ]
    },
    {
      id: "land-3",
      name: "Land 3 – New Arecanut Field",
      location: "Sirsi, Uttara Kannada",
      area: 1.5,
      crop: "Young Arecanut Saplings (2 Years)",
      slopeAngle: "Gentle (9°)",
      slopeType: "Gentle Slope",
      lat: 14.6195,
      lon: 74.8354,
      controllerId: "ESP32-SRS-03",
      controllerStatus: "online",
      lastHeartbeat: new Date().toISOString(),
      waterUsedToday: 310,
      totalWaterSaved: 215,
      zones: [
        {
          id: "zone-1",
          name: "Zone 1 – Upper Slope",
          position: "Upper Slope",
          description: "Upper border; light canopy exposure.",
          moisture: 33,
          targetMoisture: 55,
          dryThreshold: 35,
          valveStatus: "closed",
          irrigationStatus: "stopped",
          runoffDetected: false,
          soilTemp: 28.2,
          lastUpdated: new Date().toISOString(),
          flowRateLpm: 0,
          waterUsedToday: 130,
          maxRunMinutes: 35
        },
        {
          id: "zone-2",
          name: "Zone 2 – Middle Slope",
          position: "Middle Slope",
          description: "Middle section; drip lateral line #2.",
          moisture: 46,
          targetMoisture: 55,
          dryThreshold: 32,
          valveStatus: "closed",
          irrigationStatus: "stopped",
          runoffDetected: false,
          soilTemp: 27.0,
          lastUpdated: new Date().toISOString(),
          flowRateLpm: 0,
          waterUsedToday: 105,
          maxRunMinutes: 35
        },
        {
          id: "zone-3",
          name: "Zone 3 – Lower Slope",
          position: "Lower Slope",
          description: "Lower basin catch area.",
          moisture: 51,
          targetMoisture: 52,
          dryThreshold: 28,
          valveStatus: "closed",
          irrigationStatus: "stopped",
          runoffDetected: false,
          soilTemp: 26.2,
          lastUpdated: new Date().toISOString(),
          flowRateLpm: 0,
          waterUsedToday: 75,
          maxRunMinutes: 30
        }
      ]
    }
  ],
  alerts: [
    {
      id: "alt-1",
      landId: "land-1",
      landName: "Land 1 – Arecanut Plantation",
      zoneId: "zone-1",
      zoneName: "Zone 1 – Upper Slope",
      type: "low_moisture",
      severity: "warning",
      message: "Soil moisture dropped to 28% (Threshold: 35%). Upper slope requires irrigation.",
      kannadaMessage: "ಭೂಮಿ 1, ವಲಯ 1 ರಲ್ಲಿ ಮಣ್ಣಿನ ತೇವಾಂಶ ಕಡಿಮೆಯಾಗಿದೆ (28%). ನೀರಾವರಿ ಅಗತ್ಯವಿದೆ.",
      timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
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
      message: "Zone 3 moisture at 58% due to sub-surface gravity accumulation from upper terraces.",
      kannadaMessage: "ಭೂಮಿ 2, ವಲಯ 3 ರಲ್ಲಿ ತೇವಾಂಶ 58% ಆಗಿದೆ. ಮೇಲಿನ ಇಳಿಜಾರಿನಿಂದ ನೀರು ಸಂಗ್ರಹವಾಗಿದೆ.",
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      active: true
    }
  ],
  irrigationHistory: [
    {
      id: "irr-1",
      landId: "land-1",
      zoneId: "zone-1",
      startTime: new Date(Date.now() - 140 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
      durationMinutes: 30,
      litersUsed: 180,
      triggerReason: "Auto Moisture Threshold (29% -> 55%)",
      status: "completed"
    },
    {
      id: "irr-2",
      landId: "land-2",
      zoneId: "zone-2",
      startTime: new Date(Date.now() - 200 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 170 * 60 * 1000).toISOString(),
      durationMinutes: 30,
      litersUsed: 260,
      triggerReason: "Scheduled Drip Cycle",
      status: "completed"
    }
  ],
  controllerCommands: {}
};

// Database helper functions
function loadDatabase() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading database, using default:", err);
  }
  saveDatabase(defaultDatabase);
  return defaultDatabase;
}

function saveDatabase(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing database:", err);
  }
}

// Ensure database file exists
let db = loadDatabase();

// --- REST API ENDPOINTS ---

// GET /api/lands - List all registered lands
app.get('/api/lands', (req, res) => {
  db = loadDatabase();
  res.json({ success: true, count: db.lands.length, lands: db.lands });
});

// GET /api/lands/:id - Get single land
app.get('/api/lands/:id', (req, res) => {
  db = loadDatabase();
  const land = db.lands.find(l => l.id === req.params.id);
  if (!land) return res.status(404).json({ success: false, error: 'Land not found' });
  res.json({ success: true, land });
});

// POST /api/lands - Add new land (automatically initializes Zone 1, Zone 2, Zone 3)
app.post('/api/lands', (req, res) => {
  db = loadDatabase();
  const { name, location, area, crop, slopeAngle, slopeType, lat, lon } = req.body;

  if (!name || !location) {
    return res.status(400).json({ success: false, error: 'Land name and location are required' });
  }

  const newId = `land-${Date.now()}`;
  const newLand = {
    id: newId,
    name: name.trim(),
    location: location.trim(),
    area: parseFloat(area) || 1.0,
    crop: crop ? crop.trim() : "Arecanut Plantation",
    slopeAngle: slopeAngle || "Moderate (15°)",
    slopeType: slopeType || "Moderate Slope",
    lat: parseFloat(lat) || 13.5,
    lon: parseFloat(lon) || 75.3,
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
        description: "Upper slope ridge; fast water runoff & quick moisture loss.",
        moisture: 35,
        targetMoisture: 55,
        dryThreshold: 35,
        valveStatus: "closed",
        irrigationStatus: "stopped",
        runoffDetected: false,
        soilTemp: 27.0,
        lastUpdated: new Date().toISOString(),
        flowRateLpm: 0,
        waterUsedToday: 0,
        maxRunMinutes: 40
      },
      {
        id: "zone-2",
        name: "Zone 2 – Middle Slope",
        position: "Middle Slope",
        description: "Middle slope band; steady soil infiltration.",
        moisture: 42,
        targetMoisture: 55,
        dryThreshold: 32,
        valveStatus: "closed",
        irrigationStatus: "stopped",
        runoffDetected: false,
        soilTemp: 26.5,
        lastUpdated: new Date().toISOString(),
        flowRateLpm: 0,
        waterUsedToday: 0,
        maxRunMinutes: 35
      },
      {
        id: "zone-3",
        name: "Zone 3 – Lower Slope",
        position: "Lower Slope",
        description: "Lower slope basin; collects gravity seepage; sensitive to waterlogging.",
        moisture: 52,
        targetMoisture: 52,
        dryThreshold: 28,
        valveStatus: "closed",
        irrigationStatus: "stopped",
        runoffDetected: false,
        soilTemp: 25.8,
        lastUpdated: new Date().toISOString(),
        flowRateLpm: 0,
        waterUsedToday: 0,
        maxRunMinutes: 30
      }
    ]
  };

  db.lands.push(newLand);
  saveDatabase(db);
  res.status(201).json({ success: true, message: 'Land registered with 3 zones initialized', land: newLand });
});

// PUT /api/lands/:id - Update land
app.put('/api/lands/:id', (req, res) => {
  db = loadDatabase();
  const index = db.lands.findIndex(l => l.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, error: 'Land not found' });

  const { name, location, area, crop, slopeAngle, slopeType, lat, lon } = req.body;
  if (name) db.lands[index].name = name.trim();
  if (location) db.lands[index].location = location.trim();
  if (area) db.lands[index].area = parseFloat(area);
  if (crop) db.lands[index].crop = crop.trim();
  if (slopeAngle) db.lands[index].slopeAngle = slopeAngle;
  if (slopeType) db.lands[index].slopeType = slopeType;
  if (lat) db.lands[index].lat = parseFloat(lat);
  if (lon) db.lands[index].lon = parseFloat(lon);

  saveDatabase(db);
  res.json({ success: true, message: 'Land updated', land: db.lands[index] });
});

// DELETE /api/lands/:id - Remove a land after confirmation
app.delete('/api/lands/:id', (req, res) => {
  db = loadDatabase();
  const initialLength = db.lands.length;
  db.lands = db.lands.filter(l => l.id !== req.params.id);
  if (db.lands.length === initialLength) {
    return res.status(404).json({ success: false, error: 'Land not found' });
  }

  // Remove corresponding alerts
  db.alerts = db.alerts.filter(a => a.landId !== req.params.id);
  saveDatabase(db);
  res.json({ success: true, message: 'Land removed successfully' });
});

// POST /api/irrigation/command - Start / Pause / Stop valve on specific land and zone
app.post('/api/irrigation/command', (req, res) => {
  db = loadDatabase();
  const { landId, zoneId, action, reason } = req.body;

  const land = db.lands.find(l => l.id === landId);
  if (!land) return res.status(404).json({ success: false, error: 'Land not found' });

  const zone = land.zones.find(z => z.id === zoneId);
  if (!zone) return res.status(404).json({ success: false, error: 'Zone not found' });

  const validActions = ['start', 'pause', 'stop'];
  if (!validActions.includes(action)) {
    return res.status(400).json({ success: false, error: 'Invalid action: must be start, pause, or stop' });
  }

  // Handle runoff safety lock
  if (action === 'start' && zone.runoffDetected) {
    return res.status(400).json({
      success: false,
      error: 'Cannot start irrigation: Runoff is currently detected in this zone. Safety lock active.'
    });
  }

  if (action === 'start') {
    zone.valveStatus = 'open';
    zone.irrigationStatus = 'running';
    zone.flowRateLpm = 12.5; // typical drip flow rate for 1 zone
    // Record event
    db.irrigationHistory.unshift({
      id: `irr-${Date.now()}`,
      landId,
      zoneId,
      startTime: new Date().toISOString(),
      endTime: null,
      durationMinutes: 0,
      litersUsed: 0,
      triggerReason: reason || 'Manual User Command',
      status: 'in-progress'
    });
  } else if (action === 'pause') {
    zone.valveStatus = 'closed';
    zone.irrigationStatus = 'paused';
    zone.flowRateLpm = 0;
  } else if (action === 'stop') {
    zone.valveStatus = 'closed';
    zone.irrigationStatus = 'stopped';
    zone.flowRateLpm = 0;
    // Finish last active irrigation history item
    const activeItem = db.irrigationHistory.find(i => i.landId === landId && i.zoneId === zoneId && i.status === 'in-progress');
    if (activeItem) {
      activeItem.endTime = new Date().toISOString();
      activeItem.status = 'completed';
      const durationMs = new Date(activeItem.endTime) - new Date(activeItem.startTime);
      activeItem.durationMinutes = Math.max(1, Math.round(durationMs / 60000));
      activeItem.litersUsed = Math.round(activeItem.durationMinutes * 12.5);
      land.waterUsedToday += activeItem.litersUsed;
      zone.waterUsedToday += activeItem.litersUsed;
    }
  }

  // Queue hardware command for ESP32
  if (!db.controllerCommands) db.controllerCommands = {};
  if (!db.controllerCommands[landId]) db.controllerCommands[landId] = [];
  db.controllerCommands[landId].push({
    zoneId,
    action,
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({
    success: true,
    message: `Zone ${zoneId} on ${land.name} set to ${action}`,
    zone
  });
});

// POST /api/telemetry - ESP32 microcontroller posts live sensor telemetry
app.post('/api/telemetry', (req, res) => {
  db = loadDatabase();
  const { landId, zoneId, moisture, runoffDetected, soilTemp, flowRateLpm, batteryVoltage } = req.body;

  const land = db.lands.find(l => l.id === landId);
  if (!land) return res.status(404).json({ success: false, error: 'Land not found' });

  land.lastHeartbeat = new Date().toISOString();
  land.controllerStatus = 'online';

  const zone = land.zones.find(z => z.id === zoneId);
  if (!zone) return res.status(404).json({ success: false, error: 'Zone not found' });

  // Update telemetry
  if (moisture !== undefined) zone.moisture = Math.max(0, Math.min(100, Math.round(moisture)));
  if (soilTemp !== undefined) zone.soilTemp = parseFloat(soilTemp);
  if (flowRateLpm !== undefined) zone.flowRateLpm = parseFloat(flowRateLpm);
  zone.lastUpdated = new Date().toISOString();

  // Safety Runoff Detection Handling
  if (runoffDetected === true && !zone.runoffDetected) {
    zone.runoffDetected = true;
    zone.valveStatus = 'closed';
    zone.irrigationStatus = 'paused';
    zone.flowRateLpm = 0;

    // Create high-severity alert
    const runoffAlert = {
      id: `alt-${Date.now()}`,
      landId: land.id,
      landName: land.name,
      zoneId: zone.id,
      zoneName: zone.name,
      type: 'runoff_detected',
      severity: 'critical',
      message: `CRITICAL: Water runoff detected on ${zone.name}. Irrigation paused immediately to prevent soil erosion.`,
      kannadaMessage: `${land.name}, ${zone.name} ರಲ್ಲಿ ನೀರು ಹರಿದುಹೋಗುವಿಕೆ ಪತ್ತೆಯಾಗಿದೆ. ನೀರಾವರಿಯನ್ನು ನಿಲ್ಲಿಸಲಾಗಿದೆ.`,
      timestamp: new Date().toISOString(),
      active: true
    };
    db.alerts.unshift(runoffAlert);
  } else if (runoffDetected === false) {
    zone.runoffDetected = false;
  }

  // Automatic threshold control check
  if (zone.irrigationStatus !== 'paused' && !zone.runoffDetected) {
    if (zone.moisture <= zone.dryThreshold && zone.irrigationStatus !== 'running') {
      zone.valveStatus = 'open';
      zone.irrigationStatus = 'running';
      zone.flowRateLpm = 12.5;
      db.alerts.unshift({
        id: `alt-${Date.now()}`,
        landId: land.id,
        landName: land.name,
        zoneId: zone.id,
        zoneName: zone.name,
        type: 'auto_start',
        severity: 'info',
        message: `Auto-irrigation started for ${zone.name}. Moisture ${zone.moisture}% <= ${zone.dryThreshold}% threshold.`,
        kannadaMessage: `${land.name}, ${zone.name} ನಲ್ಲಿ ಮಣ್ಣು ಒಣಗಿದೆ. ಸ್ವಯಂಚಾಲಿತ ನೀರಾವರಿ ಪ್ರಾರಂಭವಾಗಿದೆ.`,
        timestamp: new Date().toISOString(),
        active: true
      });
    } else if (zone.moisture >= zone.targetMoisture && zone.irrigationStatus === 'running') {
      zone.valveStatus = 'closed';
      zone.irrigationStatus = 'stopped';
      zone.flowRateLpm = 0;
      db.alerts.unshift({
        id: `alt-${Date.now()}`,
        landId: land.id,
        landName: land.name,
        zoneId: zone.id,
        zoneName: zone.name,
        type: 'auto_stop',
        severity: 'info',
        message: `Auto-irrigation stopped for ${zone.name}. Target moisture of ${zone.targetMoisture}% reached.`,
        kannadaMessage: `${land.name}, ${zone.name} ನಿಗದಿತ ತೇವಾಂಶ ತಲುಪಿದೆ. ನೀರಾವರಿ ನಿಲ್ಲಿಸಲಾಗಿದೆ.`,
        timestamp: new Date().toISOString(),
        active: false
      });
    }
  }

  saveDatabase(db);
  res.json({
    success: true,
    message: 'Telemetry recorded',
    valveStatus: zone.valveStatus,
    irrigationStatus: zone.irrigationStatus
  });
});

// GET /api/control/:landId - ESP32 polls commands for its valves
app.get('/api/control/:landId', (req, res) => {
  db = loadDatabase();
  const land = db.lands.find(l => l.id === req.params.landId);
  if (!land) return res.status(404).json({ success: false, error: 'Land not found' });

  // Return pending commands
  const commands = (db.controllerCommands && db.controllerCommands[land.id]) || [];
  // Reset command queue after retrieval
  if (db.controllerCommands) db.controllerCommands[land.id] = [];
  saveDatabase(db);

  // Also return current desired valve state for all 3 zones
  const currentStates = land.zones.map(z => ({
    zoneId: z.id,
    valveStatus: z.valveStatus,
    irrigationStatus: z.irrigationStatus
  }));

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    commands,
    valves: currentStates
  });
});

// GET /api/alerts - List all alerts
app.get('/api/alerts', (req, res) => {
  db = loadDatabase();
  res.json({ success: true, alerts: db.alerts });
});

// POST /api/alerts/resolve - Mark alert as resolved
app.post('/api/alerts/resolve', (req, res) => {
  db = loadDatabase();
  const { alertId } = req.body;
  const alert = db.alerts.find(a => a.id === alertId);
  if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });

  alert.active = false;
  alert.resolvedAt = new Date().toISOString();
  saveDatabase(db);
  res.json({ success: true, message: 'Alert resolved', alert });
});

// GET /api/analytics - Get historical analytics and water savings
app.get('/api/analytics', (req, res) => {
  db = loadDatabase();
  const { landId } = req.query;

  let totalLiters = 0;
  let totalSaved = 0;

  db.lands.forEach(l => {
    totalLiters += l.waterUsedToday;
    totalSaved += l.totalWaterSaved;
  });

  const history = landId
    ? db.irrigationHistory.filter(h => h.landId === landId)
    : db.irrigationHistory;

  res.json({
    success: true,
    totalLitersToday: totalLiters,
    totalLitersSaved: totalSaved,
    history
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`SmartSlope Backend running at: http://localhost:${PORT}`);
  console.log(`Sloping Arecanut Plantation Irrigation Manager`);
  console.log(`REST API & ESP32 Hardware Gateway Active`);
  console.log(`=======================================================`);
});
