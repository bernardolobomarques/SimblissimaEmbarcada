
/**
 * ESP32 - Sensor de Energia (ACS712)
 * Envia leituras agregadas para Supabase a cada 5 minutos
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WiFiUdp.h>
#include <NTPClient.h>

// ============================================================================
// CONFIGURAÇÕES - ALTERE AQUI
// ============================================================================

// WiFi
const char* WIFI_SSID = "POCO X5 5G";
const char* WIFI_PASSWORD = "vascodagama";
const unsigned long WIFI_CONNECT_TIMEOUT_MS = 30000;

// Supabase
const char* SUPABASE_URL = "https://ybnobvonfxoqvlimfzpl.supabase.co/functions/v1/supabase-edge-function-iot-ingest-ts";
const char* DEVICE_ID = "4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e";
const char* API_KEY = "iot_XzSw0pRPQolvrXu2St3t-dnxY-wJYhhn";

// Sensor ACS712 calibrado (modelo 30A)
const int SENSOR_PIN = 34;      // GPIO34 (ADC1_CH6)
const float VOLTAGE_NOMINAL = 127.0;
const float ADC_VREF = 3.3;
const int ADC_RESOLUTION = 4096;
const int ACS_OFFSET = 2947;
const float ACS_SENSITIVITY = 0.0814;
const float CURRENT_DEAD_ZONE = 0.15;
const uint16_t RMS_WINDOW_MS = 500;
const uint16_t RMS_SAMPLE_DELAY_US = 100;

// Agregação das leituras
const int SAMPLES_PER_READING = 45;  // ~45s totais para agregação
const int SAMPLE_INTERVAL_MS = 1000; // 1 segundo entre leituras

// ============================================================================
// OBJETOS GLOBAIS
// ============================================================================

WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", -3 * 3600, 60000);

// ============================================================================
// PROTÓTIPOS
// ============================================================================

bool ensureWiFiConnected();
bool connectWiFi();
float readCurrentRMS();
String getISOTimestamp();
void sendReading(float current, float voltage, float power, int sampleCount);

// ============================================================================
// SETUP
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=================================");
  Serial.println("ESP32 - Sensor de Energia IoT");
  Serial.println("=================================\n");

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
  analogSetPinAttenuation(SENSOR_PIN, ADC_11db);

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);

  if (!connectWiFi()) {
    Serial.println("WiFi indisponível. Retentando em 10 segundos.");
    delay(10000);
  }

  timeClient.begin();
  Serial.println("NTP Client iniciado");

  Serial.print("Sincronizando horário");
  int ntpAttempts = 0;
  while (!timeClient.update() && ntpAttempts < 10) {
    delay(1000);
    Serial.print(".");
    ntpAttempts++;
  }

  if (ntpAttempts < 10) {
    Serial.printf(" OK (%s)\n", timeClient.getFormattedTime().c_str());
  } else {
    Serial.println(" FALHOU");
    Serial.println("Aviso: NTP não sincronizado, timestamps podem estar incorretos");
  }

  Serial.println();
  Serial.println("Calibração ativa:");
  Serial.printf("  Offset: %d\n", ACS_OFFSET);
  Serial.printf("  Sensibilidade: %.4f V/A\n", ACS_SENSITIVITY);
  Serial.printf("  Vref: %.2f V\n", ADC_VREF);
  Serial.println();
}

// ============================================================================
// LOOP PRINCIPAL
// ============================================================================

void loop() {
  if (!ensureWiFiConnected()) {
    Serial.println("WiFi indisponível. Tentando novamente em 5 segundos...");
    delay(5000);
    return;
  }

  timeClient.update();

  Serial.println("========================================");
  Serial.printf("Coletando %d amostras agregadas...\n", SAMPLES_PER_READING);
  Serial.println("========================================");

  float totalCurrent = 0;
  int validSamples = 0;

  for (int i = 0; i < SAMPLES_PER_READING; i++) {
    float current = readCurrentRMS();

    if (current >= 0 && current < 50) {
      totalCurrent += current;
      validSamples++;
    }

    if ((i + 1) % 30 == 0) {
      Serial.printf("  [%d/%d] Progresso: %.1f%%\n", i + 1, SAMPLES_PER_READING, ((i + 1) * 100.0) / SAMPLES_PER_READING);
    }

    delay(SAMPLE_INTERVAL_MS);
  }

  if (validSamples > 0) {
    float avgCurrent = totalCurrent / validSamples;
    float avgPower = avgCurrent * VOLTAGE_NOMINAL;

    Serial.println("\n========================================");
    Serial.println("RESULTADO DA AGREGAÇÃO:");
    Serial.println("========================================");
    Serial.printf("  Amostras válidas: %d/%d\n", validSamples, SAMPLES_PER_READING);
    Serial.printf("  Corrente média: %.3f A\n", avgCurrent);
    Serial.printf("  Tensão: %.1f V\n", VOLTAGE_NOMINAL);
    Serial.printf("  Potência média: %.2f W\n", avgPower);
    Serial.println("========================================\n");

    sendReading(avgCurrent, VOLTAGE_NOMINAL, avgPower, validSamples);
  } else {
    Serial.println("ERRO: Nenhuma amostra válida coletada!");
  }
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

bool ensureWiFiConnected() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }

  Serial.println("WiFi desconectado! Tentando reconectar...");
  return connectWiFi();
}

bool connectWiFi() {
  Serial.printf("Conectando ao WiFi: %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < WIFI_CONNECT_TIMEOUT_MS) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" OK");
    Serial.printf("IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("RSSI: %d dBm\n", WiFi.RSSI());
    return true;
  }

  Serial.println(" FALHOU");
  WiFi.disconnect(true, true);
  return false;
}

float readCurrentRMS() {
  unsigned long startMillis = millis();
  long sumSquares = 0;
  int sampleCount = 0;

  while (millis() - startMillis < RMS_WINDOW_MS) {
    int raw = analogRead(SENSOR_PIN);
    long valueMinusOffset = raw - ACS_OFFSET;
    sumSquares += valueMinusOffset * valueMinusOffset;
    sampleCount++;
    delayMicroseconds(RMS_SAMPLE_DELAY_US);
  }

  if (sampleCount == 0) {
    return 0;
  }

  float meanSquare = static_cast<float>(sumSquares) / sampleCount;
  float rmsAdc = sqrt(meanSquare);
  float rmsVoltage = rmsAdc * (ADC_VREF / ADC_RESOLUTION);
  float currentRms = rmsVoltage / ACS_SENSITIVITY;

  if (currentRms < CURRENT_DEAD_ZONE) {
    return 0;
  }

  return currentRms;
}

String getISOTimestamp() {
  timeClient.update();
  unsigned long epochTime = timeClient.getEpochTime();

  if (epochTime < 1577836800) {
    Serial.println("Aviso: Timestamp NTP parece incorreto, usando fallback");
    epochTime = 1698700000 + (millis() / 1000);
  }

  time_t rawTime = static_cast<time_t>(epochTime);
  struct tm* timeinfo = gmtime(&rawTime);

  char buffer[32];
  sprintf(buffer, "%04d-%02d-%02dT%02d:%02d:%02d-03:00",
          timeinfo->tm_year + 1900,
          timeinfo->tm_mon + 1,
          timeinfo->tm_mday,
          timeinfo->tm_hour,
          timeinfo->tm_min,
          timeinfo->tm_sec);

  return String(buffer);
}

void sendReading(float current, float voltage, float power, int sampleCount) {
  Serial.println("----------------------------------------");
  Serial.println("ENVIANDO PARA SUPABASE");
  Serial.println("----------------------------------------");

  if (!ensureWiFiConnected()) {
    Serial.println("WiFi indisponível, cancelando envio.");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  if (!http.begin(client, SUPABASE_URL)) {
    Serial.println("ERRO: Falha ao iniciar conexão HTTPS.");
    return;
  }

  http.setTimeout(15000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);
  http.addHeader("X-Device-Type", "energy");

  StaticJsonDocument<384> doc;
  doc["device_id"] = DEVICE_ID;
  doc["timestamp"] = getISOTimestamp();

  JsonObject readings = doc.createNestedObject("readings");
  readings["current_rms"] = round(current * 1000) / 1000.0;
  readings["voltage"] = voltage;
  readings["power_watts"] = round(power * 100) / 100.0;
  readings["sample_count"] = sampleCount;
  readings["aggregation_window_seconds"] = SAMPLES_PER_READING * (SAMPLE_INTERVAL_MS / 1000.0);

  String payload;
  serializeJson(doc, payload);

  Serial.println("Payload:");
  Serial.println(payload);

  int httpCode = http.POST(payload);
  Serial.printf("HTTP Status: %d\n", httpCode);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("Resposta:");
    Serial.println(response);

    if (httpCode == 200 || httpCode == 201) {
      Serial.println("Leitura enviada com sucesso!");
    } else if (httpCode == 429) {
      Serial.println("Rate limit atingido! Aguarde antes de enviar novamente.");
    } else if (httpCode == 401 || httpCode == 403) {
      Serial.println("ERRO: Credenciais inválidas para Supabase!");
    } else if (httpCode >= 400) {
      Serial.println("ERRO: Supabase rejeitou o payload.");
    }
  } else {
    Serial.printf("ERRO HTTP: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
  Serial.println("----------------------------------------\n");
}
