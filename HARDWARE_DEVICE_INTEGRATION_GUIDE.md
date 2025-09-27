# Hardware Device Integration Guide

This guide explains how to integrate real RFID hardware devices with the Asset Access Control System.

## 🚀 **Quick Start for Hardware Integration**

### **1. Device Registration**

First, register your hardware device with the system:

```bash
# Register a new RFID reader
curl -X POST http://your-server:5000/api/device/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Main Entrance RFID Reader",
    "deviceId": "RFID-MAIN-001",
    "deviceType": "RFID_READER",
    "secretKey": "your-secure-secret-key-32-chars-long",
    "ipAddress": "192.168.1.100",
    "macAddress": "00:11:22:33:44:55",
    "locationId": "location-uuid-here"
  }'
```

### **2. Device Authentication**

Your hardware device must authenticate using device headers:

```bash
# Device ping/heartbeat
curl -X POST http://your-server:5000/api/device/RFID-MAIN-001/ping \
  -H "Content-Type: application/json" \
  -H "x-device-id: RFID-MAIN-001" \
  -H "x-device-secret: your-secure-secret-key-32-chars-long" \
  -d '{
    "batteryLevel": 85,
    "signalStrength": -45,
    "firmwareVersion": "1.2.3"
  }'
```

### **3. Access Attempt Logging**

When a card is read, log the access attempt:

```bash
# Log access attempt with device authentication
curl -X POST http://your-server:5000/api/lock/access-attempt \
  -H "Content-Type: application/json" \
  -H "x-device-id: RFID-MAIN-001" \
  -H "x-device-secret: your-secure-secret-key-32-chars-long" \
  -d '{
    "cardId": "CARD-ABC123",
    "lockId": "lock-uuid-here",
    "accessType": "RFID_CARD"
  }'
```

## 🔧 **Device Implementation Requirements**

### **Minimum Device Requirements:**

1. **Network Connectivity**: WiFi, Ethernet, or Cellular
2. **HTTP Client**: Ability to make REST API calls
3. **JSON Support**: Parse and generate JSON payloads
4. **Secure Storage**: Store device credentials securely
5. **Real-time Clock**: For accurate timestamps

### **Recommended Device Features:**

1. **Battery Monitoring**: Report battery levels
2. **Signal Strength**: Report connectivity quality
3. **Local Caching**: Cache access decisions for offline scenarios
4. **Error Handling**: Retry failed requests with exponential backoff
5. **Firmware Updates**: Support over-the-air updates

## 🔌 **ESP32-DevKitC-VE Compatibility Assessment**

### ✅ **FULLY COMPATIBLE** - Excellent Choice!

The **Espressif ESP32-DevKitC-VE** is **perfectly compatible** with our hardware integration system and is actually an ideal choice for RFID access control devices.

#### **Hardware Specifications:**

- **Microcontroller**: ESP32-WROOM-32E module
- **CPU**: Dual-core Xtensa 32-bit LX6 @ 240MHz
- **Memory**: 520KB SRAM, 4MB Flash (plenty for our application)
- **Connectivity**: Built-in WiFi 802.11 b/g/n + Bluetooth 4.2/BLE
- **GPIO**: 30+ pins for RFID reader, LEDs, buzzers, sensors
- **Power**: 3.3V operation, low power modes available

#### **Perfect Match for Our System:**

| Requirement              | ESP32-DevKitC-VE            | Status                      |
| ------------------------ | --------------------------- | --------------------------- |
| **Network Connectivity** | Built-in WiFi 802.11 b/g/n  | ✅ **Perfect**              |
| **HTTP Client**          | ESP32 Arduino/IDF libraries | ✅ **Excellent**            |
| **JSON Support**         | ArduinoJson library         | ✅ **Native Support**       |
| **Secure Storage**       | NVS (Non-Volatile Storage)  | ✅ **Built-in**             |
| **Real-time Clock**      | Built-in RTC + NTP sync     | ✅ **Full Support**         |
| **HTTPS/TLS**            | mbedTLS library             | ✅ **Hardware Accelerated** |
| **OTA Updates**          | Built-in OTA support        | ✅ **Native**               |

#### **Additional Benefits:**

🔋 **Power Management**: Built-in deep sleep modes (ideal for battery operation)  
🔐 **Security**: Hardware encryption, secure boot, flash encryption  
📶 **WiFi Features**: WPA2/WPA3, signal strength monitoring  
🔧 **Development**: Arduino IDE + PlatformIO support  
💾 **Storage**: Ample flash memory for firmware + local caching  
⚡ **Performance**: More than enough processing power for real-time RFID

#### **Recommended RFID Module Integration:**

The ESP32-DevKitC-VE works excellently with:

- **MFRC522** (13.56MHz, SPI interface) - Most common, cheap
- **PN532** (13.56MHz, SPI/I2C/UART) - More features, NFC support
- **RDM6300** (125kHz, UART) - Simple, low-cost option
- **PN532 v3** (13.56MHz) - Professional grade with antenna

#### **Sample Hardware Setup:**

```
ESP32-DevKitC-VE Connections:
├── RFID Reader (MFRC522)
│   ├── SDA  → GPIO 21
│   ├── SCK  → GPIO 18
│   ├── MOSI → GPIO 23
│   ├── MISO → GPIO 19
│   └── RST  → GPIO 22
├── Status LED → GPIO 2 (built-in)
├── Buzzer → GPIO 4
├── Lock Relay → GPIO 5
└── Power: 5V USB or 3.3V external
```

## 📋 **Device Communication Protocol**

### **1. Device Registration Flow**

```mermaid
sequenceDiagram
    participant D as Device
    participant S as Server
    participant A as Admin

    A->>S: Register Device (POST /api/device/register)
    S->>A: Device Credentials (deviceId, secretKey)
    A->>D: Configure Device with Credentials
    D->>S: First Ping (POST /api/device/:id/ping)
    S->>D: Ping Success Response
```

### **2. Normal Operation Flow**

```mermaid
sequenceDiagram
    participant D as Device
    participant S as Server
    participant U as User

    loop Every Ping Interval
        D->>S: Heartbeat Ping
        S->>D: Ping Response
    end

    U->>D: Present RFID Card
    D->>S: Access Attempt (POST /api/lock/access-attempt)
    S->>D: Access Decision (GRANTED/DENIED)
    D->>U: Lock Action (UNLOCK/DENY)
```

### **3. Command Execution Flow**

```mermaid
sequenceDiagram
    participant A as Admin
    participant S as Server
    participant D as Device

    A->>S: Send Command (POST /api/device/:id/command)
    S->>A: Command Queued Response

    D->>S: Get Pending Commands
    S->>D: Command List
    D->>D: Execute Command
    D->>S: Command Response
    S->>A: Command Completed (WebSocket)
```

## 🛡️ **Security Best Practices**

### **Device Security:**

1. **Secure Key Storage**: Store secret keys in secure hardware (TPM, secure element)
2. **Certificate Pinning**: Pin server certificates to prevent MITM attacks
3. **Encrypted Communication**: Always use HTTPS/TLS
4. **Key Rotation**: Support periodic secret key updates
5. **Tamper Detection**: Detect and report physical tampering

### **Network Security:**

1. **VPN Connection**: Use VPN for internet-connected devices
2. **Firewall Rules**: Restrict outbound connections to necessary endpoints
3. **Network Isolation**: Use separate VLAN for IoT devices
4. **Regular Updates**: Keep firmware and certificates updated

## 📊 **Monitoring & Alerts**

### **Device Health Monitoring:**

The system automatically monitors:

- **Online/Offline Status**: Based on ping intervals
- **Battery Levels**: Alerts when below 20%
- **Signal Strength**: Network connectivity quality
- **Error Rates**: Failed requests and system errors
- **Firmware Versions**: Track deployed versions

### **Real-time Notifications:**

WebSocket events are sent for:

- Device goes offline
- Low battery alerts
- High error count warnings
- Device registration/updates
- Command execution status

## 🔍 **Troubleshooting**

### **Common Issues:**

1. **Device Authentication Failed**

   - Check deviceId and secretKey
   - Verify device is registered and active
   - Check for typos in headers

2. **Device Marked Offline**

   - Check network connectivity
   - Verify ping interval configuration
   - Check server logs for errors

3. **Access Attempts Rejected**
   - Verify lock is active and online
   - Check RFID key validity
   - Verify user permissions

### **Debug Endpoints:**

```bash
# Get device health metrics
curl -H "Authorization: Bearer JWT_TOKEN" \
  http://your-server:5000/api/device/DEVICE-ID/health

# Check pending commands
curl -H "x-device-id: DEVICE-ID" \
     -H "x-device-secret: SECRET" \
  http://your-server:5000/api/device/DEVICE-ID/commands/pending
```

## 📈 **Performance Guidelines**

### **Recommended Intervals:**

- **Ping Interval**: 5-10 minutes for battery devices, 1-2 minutes for powered devices
- **Command Polling**: 30-60 seconds when commands are expected
- **Health Metrics**: Every ping or on significant changes
- **Retry Interval**: Exponential backoff (1s, 2s, 4s, 8s, max 60s)

### **Rate Limits:**

- **Ping Requests**: 10 per minute per device
- **Access Attempts**: 200 per minute per device
- **Command Responses**: 100 per minute per device

## 🔗 **ESP32-DevKitC-VE Code Example**

### **Complete Arduino IDE Implementation:**

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Preferences.h>

// Hardware pins
#define SS_PIN 21
#define RST_PIN 22
#define LED_PIN 2
#define BUZZER_PIN 4
#define RELAY_PIN 5

// Network credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server configuration
const char* serverURL = "http://your-server:5000/api";
const char* deviceId = "ESP32-RFID-001";
const char* deviceSecret = "your-secure-secret-key-32-chars-long";

// Objects
MFRC522 rfid(SS_PIN, RST_PIN);
Preferences preferences;
HTTPClient http;

// Timing
unsigned long lastPing = 0;
const unsigned long pingInterval = 300000; // 5 minutes

void setup() {
  Serial.begin(115200);

  // Initialize hardware
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);

  SPI.begin();
  rfid.PCD_Init();

  preferences.begin("device", false);

  // Connect to WiFi
  connectWiFi();

  // Initial device ping
  sendPing();

  Serial.println("ESP32 RFID Access Control Ready!");
  digitalWrite(LED_PIN, HIGH); // Ready indicator
}

void loop() {
  // Check for RFID cards
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    handleRFIDCard();
  }

  // Send periodic ping
  if (millis() - lastPing > pingInterval) {
    sendPing();
    lastPing = millis();
  }

  delay(100);
}

void connectWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.printf("Connected! IP: %s\n", WiFi.localIP().toString().c_str());
}

void handleRFIDCard() {
  // Read card ID
  String cardId = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    cardId += String(rfid.uid.uidByte[i], HEX);
  }
  cardId.toUpperCase();

  Serial.printf("Card detected: %s\n", cardId.c_str());

  // Send access attempt
  bool accessGranted = sendAccessAttempt(cardId);

  // Handle response
  if (accessGranted) {
    grantAccess();
  } else {
    denyAccess();
  }

  // Halt card
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}

bool sendAccessAttempt(String cardId) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected!");
    return false;
  }

  http.begin(String(serverURL) + "/lock/access-attempt");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-id", deviceId);
  http.addHeader("x-device-secret", deviceSecret);

  // Create JSON payload
  DynamicJsonDocument doc(1024);
  doc["cardId"] = "CARD-" + cardId;
  doc["lockId"] = preferences.getString("lockId", "default-lock-id");
  doc["accessType"] = "RFID_CARD";

  String payload;
  serializeJson(doc, payload);

  int httpCode = http.POST(payload);
  bool accessGranted = false;

  if (httpCode == 200) {
    String response = http.getString();
    DynamicJsonDocument responseDoc(1024);
    deserializeJson(responseDoc, response);

    accessGranted = responseDoc["data"]["accessGranted"];
    Serial.printf("Access result: %s\n", accessGranted ? "GRANTED" : "DENIED");
  } else {
    Serial.printf("HTTP Error: %d\n", httpCode);
  }

  http.end();
  return accessGranted;
}

void sendPing() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    return;
  }

  http.begin(String(serverURL) + "/device/" + deviceId + "/ping");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-id", deviceId);
  http.addHeader("x-device-secret", deviceSecret);

  // Create ping payload
  DynamicJsonDocument doc(512);
  doc["signalStrength"] = WiFi.RSSI();
  doc["firmwareVersion"] = "1.0.0";

  String payload;
  serializeJson(doc, payload);

  int httpCode = http.POST(payload);

  if (httpCode == 200) {
    Serial.println("Ping successful");
    digitalWrite(LED_PIN, HIGH);
  } else {
    Serial.printf("Ping failed: %d\n", httpCode);
    digitalWrite(LED_PIN, LOW);
  }

  http.end();
}

void grantAccess() {
  Serial.println("ACCESS GRANTED");

  // Visual/audio feedback
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    tone(BUZZER_PIN, 1000, 200);
    delay(200);
    digitalWrite(LED_PIN, LOW);
    delay(100);
  }

  // Activate lock relay
  digitalWrite(RELAY_PIN, HIGH);
  delay(3000); // 3 second unlock
  digitalWrite(RELAY_PIN, LOW);

  digitalWrite(LED_PIN, HIGH); // Back to ready state
}

void denyAccess() {
  Serial.println("ACCESS DENIED");

  // Visual/audio feedback
  for (int i = 0; i < 5; i++) {
    digitalWrite(LED_PIN, HIGH);
    tone(BUZZER_PIN, 500, 100);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(100);
  }

  digitalWrite(LED_PIN, HIGH); // Back to ready state
}
```

### **Required Arduino Libraries:**

```
// Install via Arduino Library Manager:
- WiFi (ESP32 built-in)
- HTTPClient (ESP32 built-in)
- ArduinoJson by Benoit Blanchon
- MFRC522 by GithubCommunity
- Preferences (ESP32 built-in)
```

### **PlatformIO Configuration:**

```ini
[env:esp32doit-devkit-v1]
platform = espressif32
board = esp32doit-devkit-v1
framework = arduino
lib_deps =
    bblanchon/ArduinoJson@^6.21.3
    miguelbalboa/MFRC522@^1.4.10
monitor_speed = 115200
```

## � **ESP32-DevKitC-VE Deployment Steps**

### **Step 1: Hardware Assembly**

```
ESP32-DevKitC-VE Pinout:
- GPIO21 → MFRC522 SDA (SS)
- GPIO22 → MFRC522 RST
- GPIO18 → MFRC522 SCK
- GPIO23 → MFRC522 MOSI
- GPIO19 → MFRC522 MISO
- 3.3V   → MFRC522 VCC
- GND    → MFRC522 GND

- GPIO2  → Status LED (+ 220Ω resistor)
- GPIO4  → Buzzer/Speaker
- GPIO5  → Relay Module (for lock control)
- 5V     → Relay Module VCC
- GND    → Relay Module GND
```

### **Step 2: Software Setup**

1. **Install Arduino IDE 2.x**
2. **Add ESP32 Board Support:**

   - File → Preferences → Additional Board Manager URLs
   - Add: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - Tools → Board → Boards Manager → Search "ESP32" → Install

3. **Install Required Libraries:**

   ```
   ArduinoJson by Benoit Blanchon (v6.21.3+)
   MFRC522 by GithubCommunity (v1.4.10+)
   ```

4. **Configure Code:**
   - Update WiFi credentials: `ssid` and `password`
   - Set server URL: `serverURL`
   - Generate unique device ID: `deviceId`
   - Create secure device secret: `deviceSecret` (32+ characters)

### **Step 3: Device Registration**

1. **Upload Code to ESP32**

   - Select Board: "ESP32 Dev Module"
   - Upload Speed: 921600
   - Flash

2. **Register Device via API:**

   ```powershell
   # PowerShell command
   $headers = @{
       'Content-Type' = 'application/json'
       'Authorization' = 'Bearer YOUR_ADMIN_JWT_TOKEN'
   }

   $body = @{
       deviceId = "ESP32-RFID-001"
       name = "Main Door RFID Reader"
       type = "RFID_READER"
       location = "Building A - Entrance"
       secret = "your-secure-secret-key-32-chars-long"
   } | ConvertTo-Json

   Invoke-RestMethod -Uri "http://your-server:5000/api/device/register" -Method POST -Headers $headers -Body $body
   ```

3. **Verify Device Connection:**
   - Check Serial Monitor for "Ping successful"
   - Device should appear in admin dashboard
   - Status LED should be solid ON

### **Step 4: Lock Assignment**

```powershell
# Assign device to specific lock
$lockAssignment = @{
    lockId = "LOCK-123"
    projectCityId = "PROJ-CITY-001"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://your-server:5000/api/device/ESP32-RFID-001/lock" -Method POST -Headers $headers -Body $lockAssignment
```

### **Step 5: Testing & Validation**

1. **Test RFID Card Reading:**

   - Present registered RFID card
   - Observe serial output for card ID
   - Verify LED and buzzer feedback

2. **Test Access Control:**

   - Use registered user's card → Should grant access
   - Use unregistered card → Should deny access
   - Check access logs in dashboard

3. **Test Network Recovery:**
   - Disconnect WiFi temporarily
   - Device should attempt reconnection
   - Verify ping resumes after reconnection

### **Step 6: Production Deployment**

1. **Secure Installation:**

   - Mount ESP32 in weatherproof enclosure
   - Secure wiring connections
   - Position RFID reader at appropriate height

2. **Final Configuration:**

   - Set unique device credentials for each installation
   - Update server URL to production endpoint
   - Enable WPA2-Enterprise if available

3. **Monitoring Setup:**
   - Configure device health alerts
   - Set up ping failure notifications
   - Monitor signal strength and battery (if applicable)

### **Step 7: Troubleshooting Common Issues**

- **WiFi Connection Failed:** Check credentials, signal strength
- **RFID Not Reading:** Verify SPI connections, check MFRC522 power
- **Server Connection Failed:** Verify server URL, check firewall
- **Access Denied for Valid Card:** Check user permissions, project assignments
- **Device Not Registered:** Verify device secret, check API credentials

## �🔗 **Additional Example Implementations**

See the `/examples/` directory for complete device implementation examples in:

- **ESP32/Arduino** (Complete working example above)
- Python (Raspberry Pi)
- JavaScript (Node.js)
- Go (embedded Linux)

## 📞 **Support**

For hardware integration support:

- Check the troubleshooting section
- Review server logs for detailed error messages
- Use the debug endpoints to verify device status
- Test with the simulation endpoints first

The system is now ready for production hardware integration! 🎉
