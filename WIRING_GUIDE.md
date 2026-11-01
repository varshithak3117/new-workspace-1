# SmartSlope Hardware Wiring & Field Installation Guide
### Sloping Arecanut Plantation Smart Irrigation Management

This guide details the physical hardware setup for connecting an **ESP32 Microcontroller** to 3-zone soil moisture sensors, a runoff detector, and 12V solenoid valves for a sloping arecanut plantation.

---

## 1. System Overview & Architecture

On sloping orchards (e.g. Western Ghats areca belt in Karnataka), water flows downhill under gravity. The SmartSlope hardware architecture monitors three distinct terrace zones independently:

1. **Zone 1 (Upper Slope):** High solar exposure, thin soil crust, fast drainage.
2. **Zone 2 (Middle Slope):** Intermediate buffer zone.
3. **Zone 3 (Lower Slope):** Valley runoff accumulation basin, sensitive to waterlogging and Koleroga fungus.

```
       +-------------------------------------------------------------+
       |                  ESP32 Microcontroller                      |
       |  (WiFi / 4G GSM, Autonomous Safety Rules, Flash Memory)    |
       +--------------------+-------------------+--------------------+
                            |                   |
            Sensors Inputs  |                   | Valve Control Outputs
                            v                   v
      [Zone 1: Upper Soil Moisture] (GPIO 34)  [12V Solenoid Valve 1] (GPIO 25 via Relay)
      [Zone 2: Middle Soil Moisture] (GPIO 35) [12V Solenoid Valve 2] (GPIO 26 via Relay)
      [Zone 3: Lower Soil Moisture] (GPIO 32)  [12V Solenoid Valve 3] (GPIO 27 via Relay)
      [Surface Runoff Sensor]       (GPIO 33)  [Status Indicator LED] (GPIO 2)
```

---

## 2. Complete Pinout Table

| Component | Hardware Pin | ESP32 GPIO | Description / Notes |
| :--- | :--- | :--- | :--- |
| **Zone 1 Soil Sensor** | Analog Out (AOUT) | **GPIO 34** (ADC1_CH6) | Capacitive Sensor v1.2 (Upper Slope) |
| **Zone 2 Soil Sensor** | Analog Out (AOUT) | **GPIO 35** (ADC1_CH7) | Capacitive Sensor v1.2 (Middle Slope) |
| **Zone 3 Soil Sensor** | Analog Out (AOUT) | **GPIO 32** (ADC1_CH4) | Capacitive Sensor v1.2 (Lower Slope) |
| **Runoff Detector** | Digital Out (DO) | **GPIO 33** (INPUT_PULLUP) | Rain/Conductivity Surface Sensor |
| **Relay 1 (Zone 1 Valve)**| IN1 | **GPIO 25** | Controls 12V Solenoid Valve #1 (Upper) |
| **Relay 2 (Zone 2 Valve)**| IN2 | **GPIO 26** | Controls 12V Solenoid Valve #2 (Middle) |
| **Relay 3 (Zone 3 Valve)**| IN3 | **GPIO 27** | Controls 12V Solenoid Valve #3 (Lower) |
| **Onboard Status LED** | Anode | **GPIO 2** | Blinks on WiFi/Heartbeat Activity |
| **Relay VCC** | 5V / JD-VCC | **5V Pin / External** | 5V Power from Buck Converter |
| **Common Ground** | GND | **GND** | Connect all Grounds together |

---

## 3. Power Supply Scheme

Sloping agricultural fields typically require reliable off-grid power:

- **12V DC Deep-Cycle Battery (or 20W Solar Panel + Solar Charge Controller)**
- **Step-Down Buck Converter (12V -> 5V 2A DC):** Powers the ESP32 and Relay Module coils.
- **Direct 12V Rail:** Powers the 12V DC Normally-Closed (NC) Brass Solenoid Valves.
- **Safety Diode (1N4007):** Placed in reverse parallel across each solenoid valve coil to absorb flyback voltage spikes.

---

## 4. Sensor Placement Guidelines in Sloping Orchards

1. **Zone 1 (Upper Slope Crest):**
   - Place sensor 30 cm into the soil near the root feeder zone of mature arecanut palms (approx. 45–60 cm from the tree base).
   - Ensure the capacitive probe is firmly packed with native soil to eliminate air gaps.

2. **Zone 2 (Middle Slope):**
   - Position halfway down the plantation slope.
   - Ideal placement between tree rows to monitor capillary subsurface percolation.

3. **Zone 3 (Lower Valley Sump):**
   - Position along the lower contour terrace near the natural drainage channel.
   - Monitors water accumulation to ensure the valve stays closed when gravity-fed water from upper terraces pools down.

4. **Runoff Sensor:**
   - Install at the surface level between Zone 1 and Zone 2 in a shallow V-notch flume or contour trench.
   - Triggers immediately when irrigation application rate exceeds soil absorption rate.

---

## 5. Software & Firmware Setup

1. Open Arduino IDE.
2. Install **ESP32 by Espressif Systems** via Boards Manager.
3. Install **ArduinoJson** library by Benoit Blanchon (v6 or v7).
4. Open `esp32/esp32_smartslope.ino`.
5. Update your Wi-Fi SSID, Password, and SmartSlope server URL.
6. Select board **ESP32 Dev Module** and flash via USB.
7. Disconnect USB and deploy in a weatherproof IP65 enclosure.
