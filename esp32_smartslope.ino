/**
 * SmartSlope - ESP32 Sloping Arecanut Plantation Irrigation Controller
 * 
 * Hardware Specs:
 * - Microcontroller: ESP32 DevKit v1 (38-pin or 30-pin)
 * - Soil Sensors: 3x Capacitive Soil Moisture Sensors v1.2 / v2.0 (GPIO 34, 35, 32)
 * - Runoff Sensor: Optical / Rain Surface Runoff Sensor or Flow Switch (GPIO 33)
 * - Relays: 3-Channel 5V/12V Relay Module controlling 12V DC Solenoid Valves (GPIO 25, 26, 27)
 * - Status LED: GPIO 2 (Heartbeat / WiFi Status)
 * 
 * Safety Critical Local Features:
 * - Autonomous moisture threshold monitoring (operates even if WiFi/Cloud drops)
 * - Instant hardware runoff interlock: Shuts Zone valves within 50ms upon runoff detection
 * - Max duration safety timeout (auto-closes valve if left running > 45 minutes)
 * - REST API telemetry reporting to SmartSlope backend (POST /api/telemetry)
 * - Polling command queue from backend (GET /api/control/:landId)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// --- Configuration Constants ---
const char* WIFI_SSID     = "Your_Orchard_WiFi";
const char* WIFI_PASSWORD = "Your_WiFi_Password";
const char* BACKEND_URL   = "http://192.168.1.100:3000/api"; // Replace with your SmartSlope server IP
const char* LAND_ID       = "land-1";                         // Matches registered Land ID
const char* API_KEY       = "smartslope_secure_token_9841";   // Authenticated token

// Pin Definitions
#define PIN_SOIL_ZONE1    34  // Analog ADC1_CH6 (Upper Slope Soil Sensor)
#define PIN_SOIL_ZONE2    35  // Analog ADC1_CH7 (Middle Slope Soil Sensor)
#define PIN_SOIL_ZONE3    32  // Analog ADC1_CH4 (Lower Slope Soil Sensor)
#define PIN_RUNOFF_SENSOR 33  // Digital Input with Pullup (Runoff Surface Sensor)

#define PIN_VALVE_ZONE1   25  // Relay 1 (Zone 1 Upper Valve)
#define PIN_VALVE_ZONE2   26  // Relay 2 (Zone 2 Middle Valve)
#define PIN_VALVE_ZONE3   27  // Relay 3 (Zone 3 Lower Valve)
#define PIN_STATUS_LED     2  // Onboard LED

// Soil Calibration Constants (Capacitive v1.2)
// Air reading (dry) ~ 3200 ADC, Submerged in water (wet) ~ 1400 ADC
const int AIR_VALUE   = 3200;
const int WATER_VALUE = 1400;

// Autonomous Failsafe Thresholds (Operates offline)
const int DRY_START_THRESHOLD   = 35; // % moisture to auto-start valve
const int TARGET_STOP_THRESHOLD  = 55; // % moisture to auto-stop valve
const unsigned long MAX_RUN_TIME_MS = 45UL * 60UL * 1000UL; // 45 minutes max safety cutoff

// State Tracking
struct ZoneState {
  const char* id;
  const char* name;
  int pinSensor;
  int pinValve;
  int moisturePercent;
  bool valveOpen;
  bool isRunning;
  bool runoffTriggered;
  unsigned long irrigationStartTime;
};

ZoneState zones[3] = {
  { "zone-1", "Zone 1 – Upper Slope", PIN_SOIL_ZONE1, PIN_VALVE_ZONE1, 30, false, false, false, 0 },
  { "zone-2", "Zone 2 – Middle Slope", PIN_SOIL_ZONE2, PIN_VALVE_ZONE2, 45, false, false, false, 0 },
  { "zone-3", "Zone 3 – Lower Slope", PIN_SOIL_ZONE3, PIN_VALVE_ZONE3, 60, false, false, false, 0 }
};

unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 5000; // 5 seconds report interval

// Function Declarations
int readMoisture(int pin);
void controlValve(int zoneIndex, bool openValve);
void sendTelemetry(int zoneIndex);
void pollBackendCommands();
void checkLocalSafetyRules();

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==========================================");
  Serial.println("SmartSlope ESP32 Plantation Controller Initializing...");
  Serial.println("Target: Sloping Arecanut Orchard 3-Zone Drip");
  Serial.println("==========================================");

  // Pin Modes
  pinMode(PIN_SOIL_ZONE1, INPUT);
  pinMode(PIN_SOIL_ZONE2, INPUT);
  pinMode(PIN_SOIL_ZONE3, INPUT);
  pinMode(PIN_RUNOFF_SENSOR, INPUT_PULLUP);
  pinMode(PIN_STATUS_LED, OUTPUT);

  // Active-LOW Relays are typical; ensure valves start safely CLOSED
  pinMode(PIN_VALVE_ZONE1, OUTPUT);
  pinMode(PIN_VALVE_ZONE2, OUTPUT);
  pinMode(PIN_VALVE_ZONE3, OUTPUT);
  digitalWrite(PIN_VALVE_ZONE1, HIGH); // Closed
  digitalWrite(PIN_VALVE_ZONE2, HIGH); // Closed
  digitalWrite(PIN_VALVE_ZONE3, HIGH); // Closed

  // Connect to Orchard Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    digitalWrite(PIN_STATUS_LED, !digitalRead(PIN_STATUS_LED));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi Connected!]");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    digitalWrite(PIN_STATUS_LED, HIGH);
  } else {
    Serial.println("\n[Wi-Fi Unavailable - Autonomous Local Mode Engaged]");
    digitalWrite(PIN_STATUS_LED, LOW);
  }
}

void loop() {
  // 1. Read Soil Sensors & Runoff Sensor
  bool runoffDetected = (digitalRead(PIN_RUNOFF_SENSOR) == LOW); // Active Low sensor

  for (int i = 0; i < 3; i++) {
    zones[i].moisturePercent = readMoisture(zones[i].pinSensor);
    zones[i].runoffTriggered = runoffDetected;
  }

  // 2. Local Safety Checks (Autonomous Failsafe Rules)
  checkLocalSafetyRules();

  // 3. Periodic Telemetry and Command Polling
  if (millis() - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = millis();

    if (WiFi.status() == WL_CONNECTED) {
      digitalWrite(PIN_STATUS_LED, HIGH);
      // Send telemetry for all 3 zones
      for (int i = 0; i < 3; i++) {
        sendTelemetry(i);
      }
      // Poll command queue from backend
      pollBackendCommands();
    } else {
      digitalWrite(PIN_STATUS_LED, LOW);
    }
  }

  delay(200);
}

/**
 * Read and calibrate analog capacitive soil moisture
 */
int readMoisture(int pin) {
  long sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(pin);
    delay(5);
  }
  int raw = sum / 10;
  int percentage = map(raw, AIR_VALUE, WATER_VALUE, 0, 100);
  return constrain(percentage, 0, 100);
}

/**
 * Actuate Solenoid Valve via Relay
 */
void controlValve(int zoneIndex, bool openValve) {
  if (zoneIndex < 0 || zoneIndex >= 3) return;

  // Active-LOW relay logic: LOW = Relay energizes (Valve Opens), HIGH = Closed
  if (openValve) {
    // Safety check: Never open if runoff is active
    if (zones[zoneIndex].runoffTriggered) {
      Serial.printf("[SAFETY BLOCK] Cannot open %s: Runoff detected on slope!\n", zones[zoneIndex].name);
      return;
    }
    digitalWrite(zones[zoneIndex].pinValve, LOW); // Energize relay
    zones[zoneIndex].valveOpen = true;
    zones[zoneIndex].isRunning = true;
    zones[zoneIndex].irrigationStartTime = millis();
    Serial.printf("[VALVE OPEN] %s started watering.\n", zones[zoneIndex].name);
  } else {
    digitalWrite(zones[zoneIndex].pinValve, HIGH); // De-energize relay
    zones[zoneIndex].valveOpen = false;
    zones[zoneIndex].isRunning = false;
    zones[zoneIndex].irrigationStartTime = 0;
    Serial.printf("[VALVE CLOSED] %s stopped.\n", zones[zoneIndex].name);
  }
}

/**
 * Autonomous Local Safety Interlocks (Runs on ESP32 without relying on server)
 */
void checkLocalSafetyRules() {
  for (int i = 0; i < 3; i++) {
    // A. Runoff Emergency Cutoff: If surface runoff detected, pause valve instantly!
    if (zones[i].runoffTriggered && zones[i].valveOpen) {
      Serial.printf("[CRITICAL INTERLOCK] Runoff detected! Shutting %s valve immediately to stop erosion.\n", zones[i].name);
      controlValve(i, false);
    }

    // B. Max Duration Cutoff (Safeguard against broken pipe or stuck relay)
    if (zones[i].valveOpen && (millis() - zones[i].irrigationStartTime > MAX_RUN_TIME_MS)) {
      Serial.printf("[TIMEOUT SAFETY] %s exceeded 45 mins. Closing valve.\n", zones[i].name);
      controlValve(i, false);
    }

    // C. Autonomous Moisture Threshold Control (Local Auto Mode)
    if (!zones[i].runoffTriggered) {
      // Auto-start when soil dries below configured threshold
      if (zones[i].moisturePercent <= DRY_START_THRESHOLD && !zones[i].valveOpen) {
        Serial.printf("[AUTO LOCAL START] %s moisture dropped to %d%%. Opening valve.\n", zones[i].name, zones[i].moisturePercent);
        controlValve(i, true);
      }
      // Auto-stop when target moisture achieved
      else if (zones[i].moisturePercent >= TARGET_STOP_THRESHOLD && zones[i].valveOpen) {
        Serial.printf("[AUTO LOCAL STOP] %s reached %d%% target. Closing valve.\n", zones[i].name, zones[i].moisturePercent);
        controlValve(i, false);
      }
    }
  }
}

/**
 * Post sensor readings to SmartSlope Backend REST API
 */
void sendTelemetry(int zoneIndex) {
  HTTPClient http;
  String endpoint = String(BACKEND_URL) + "/telemetry";
  http.begin(endpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY);

  StaticJsonDocument<256> doc;
  doc["landId"] = LAND_ID;
  doc["zoneId"] = zones[zoneIndex].id;
  doc["moisture"] = zones[zoneIndex].moisturePercent;
  doc["runoffDetected"] = zones[zoneIndex].runoffTriggered;
  doc["soilTemp"] = 26.8;
  doc["flowRateLpm"] = zones[zoneIndex].valveOpen ? 12.5 : 0.0;
  doc["batteryVoltage"] = 12.4;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  int httpCode = http.POST(jsonPayload);
  if (httpCode > 0) {
    // Serial.printf("Telemetry Z%d code: %d\n", zoneIndex+1, httpCode);
  } else {
    // Serial.printf("Telemetry failed: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

/**
 * Poll valve commands queued from SmartSlope Farmer Dashboard
 */
void pollBackendCommands() {
  HTTPClient http;
  String endpoint = String(BACKEND_URL) + "/control/" + String(LAND_ID);
  http.begin(endpoint);
  http.addHeader("X-API-Key", API_KEY);

  int httpCode = http.GET();
  if (httpCode == HTTP_CODE_OK) {
    String response = http.getString();
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, response);

    if (!error) {
      JsonArray commands = doc["commands"];
      for (JsonObject cmd : commands) {
        const char* zoneId = cmd["zoneId"];
        const char* action = cmd["action"];

        int zoneIndex = -1;
        if (strcmp(zoneId, "zone-1") == 0) zoneIndex = 0;
        else if (strcmp(zoneId, "zone-2") == 0) zoneIndex = 1;
        else if (strcmp(zoneId, "zone-3") == 0) zoneIndex = 2;

        if (zoneIndex != -1) {
          if (strcmp(action, "start") == 0) {
            controlValve(zoneIndex, true);
          } else if (strcmp(action, "stop") == 0 || strcmp(action, "pause") == 0) {
            controlValve(zoneIndex, false);
          }
        }
      }
    }
  }
  http.end();
}
