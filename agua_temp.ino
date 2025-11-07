/**
 * ESP32 - Sensor de Água (HC-SR04 Ultrassônico)
 * Versão 2025-11-06: leitura com interpolação calibrada e envio estendido
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include <math.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

// ============================================================================
// CONFIGURAÇÕES - ALTERE AQUI
// ============================================================================

// WiFi
const char* WIFI_SSID = "Lobo";
const char* WIFI_PASSWORD = "01112006";
const unsigned long WIFI_CONNECT_TIMEOUT_MS = 30000;

// Supabase
const char* SUPABASE_URL = "https://ybnobvonfxoqvlimfzpl.supabase.co/functions/v1/iot-ingest";
const char* DEVICE_ID = "4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e";
const char* API_KEY = "iot_XzSw0pRPQolvrXu2St3t-dnxY-wJYhhn";

// Sensor HC-SR04
const int TRIG_PIN = 5;   // GPIO5
const int ECHO_PIN = 18;  // GPIO18
const float SPEED_OF_SOUND_CM_PER_US = 0.0343f;

// Geometria do tanque (cilíndrico)
const float TANK_HEIGHT_CM = 10.0f;
const float TANK_DIAMETER_CM = 12.5f;
const float TANK_RADIUS_CM = TANK_DIAMETER_CM / 2.0f;
const float SENSOR_OFFSET_CM = 1.27f;  // sensor a 11.27 cm do fundo (offset = sensor_height - TANK_HEIGHT)
const float TANK_CAPACITY_ML = 1400.0f;  // volume aferido em testes
const float TANK_CAPACITY_LITERS = TANK_CAPACITY_ML / 1000.0f;
const float NOMINAL_BASE_AREA_CM2 = (float)(M_PI * TANK_RADIUS_CM * TANK_RADIUS_CM);
const float EFFECTIVE_BASE_AREA_CM2 = TANK_CAPACITY_ML / TANK_HEIGHT_CM;
const float VOLUME_CORRECTION_FACTOR = EFFECTIVE_BASE_AREA_CM2 / NOMINAL_BASE_AREA_CM2;

// Agregação das leituras
const int SAMPLES_PER_READING = 45;   // ~45 s totais
const int SAMPLE_INTERVAL_MS = 1000;  // 1 Hz
const float MAX_VALID_DISTANCE_CM = TANK_HEIGHT_CM + 5.0f;  // filtro simples para outliers (distância corrigida)

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
float measureDistance();
float computeWaterHeightCm(float distanceCm);
float computeVolumeMlFromHeight(float waterHeightCm);
float computeLevelPercent(float waterHeightCm);
float clampValue(float value, float minValue, float maxValue);
float roundToDecimals(float value, uint8_t decimals);
String getISOTimestamp();
void sendReading(float distanceCmCorrected, float distanceCmRaw, float waterHeightCm, float levelPercent, float volumeLiters, float volumeMl, int validSamples);

// ============================================================================
// SETUP
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=================================");
  Serial.println("ESP32 - Sensor de Água IoT");
  Serial.println("=================================\n");

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

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
  Serial.println("Configurações do tanque cilíndrico:");
  Serial.printf("  Altura: %.2f cm\n", TANK_HEIGHT_CM);
  Serial.printf("  Raio: %.2f cm (diâmetro %.2f cm)\n", TANK_RADIUS_CM, TANK_DIAMETER_CM);
  Serial.printf("  Capacidade útil (medida): %.1f mL (%.3f L)\n", TANK_CAPACITY_ML, TANK_CAPACITY_LITERS);
  Serial.printf("  Fator de correção: %.4f\n", VOLUME_CORRECTION_FACTOR);
  Serial.printf("  Offset do sensor (altura da flange): %.2f cm\n", SENSOR_OFFSET_CM);
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

  float totalDistanceCorrected = 0.0f;
  float totalDistanceRaw = 0.0f;
  int validSamples = 0;

  for (int i = 0; i < SAMPLES_PER_READING; i++) {
    float rawDistance = measureDistance();
    float correctedDistance = clampValue(rawDistance - SENSOR_OFFSET_CM, 0.0f, 1000.0f);

    if (correctedDistance > 0 && correctedDistance < MAX_VALID_DISTANCE_CM) {
      totalDistanceCorrected += correctedDistance;
      totalDistanceRaw += rawDistance;
      validSamples++;
    }

    if ((i + 1) % 30 == 0) {
      Serial.printf("  [%d/%d] Progresso: %.1f%%\n", i + 1, SAMPLES_PER_READING, ((i + 1) * 100.0f) / SAMPLES_PER_READING);
    }

    delay(SAMPLE_INTERVAL_MS);
  }

  if (validSamples > 0) {
    float avgDistanceCorrected = totalDistanceCorrected / validSamples;
    float avgDistanceRaw = totalDistanceRaw / validSamples;
    float waterHeightCm = computeWaterHeightCm(avgDistanceCorrected);
    float clampedWaterHeight = clampValue(waterHeightCm, 0.0f, TANK_HEIGHT_CM);
    float volumeMl = computeVolumeMlFromHeight(clampedWaterHeight);
    float levelPercent = computeLevelPercent(clampedWaterHeight);
    float volumeLiters = volumeMl / 1000.0f;

    Serial.println("\n========================================");
    Serial.println("RESULTADO DA AGREGAÇÃO:");
    Serial.println("========================================");
    Serial.printf("  Amostras válidas: %d/%d\n", validSamples, SAMPLES_PER_READING);
    Serial.printf("  Distância média (corrigida): %.2f cm\n", avgDistanceCorrected);
    Serial.printf("  Distância média (bruta): %.2f cm\n", avgDistanceRaw);
  Serial.printf("  Altura média da água: %.2f cm\n", clampedWaterHeight);
  Serial.printf("  Volume estimado: %.1f mL (%.3f L)\n", volumeMl, volumeLiters);
    Serial.printf("  Nível: %.1f%%\n", levelPercent);
    Serial.println("========================================\n");

    sendReading(avgDistanceCorrected, avgDistanceRaw, clampedWaterHeight, levelPercent, volumeLiters, volumeMl, validSamples);
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

float measureDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);

  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);

  if (duration == 0) {
    return -1.0f;
  }

  float distance = (duration * SPEED_OF_SOUND_CM_PER_US) / 2.0f;
  return distance;
}

float computeWaterHeightCm(float distanceCm) {
  float waterHeight = TANK_HEIGHT_CM - distanceCm;
  return clampValue(waterHeight, 0.0f, TANK_HEIGHT_CM);
}

float computeVolumeMlFromHeight(float waterHeightCm) {
  float volume = NOMINAL_BASE_AREA_CM2 * waterHeightCm * VOLUME_CORRECTION_FACTOR;
  return clampValue(volume, 0.0f, TANK_CAPACITY_ML);
}

float computeLevelPercent(float waterHeightCm) {
  float percent = (waterHeightCm / TANK_HEIGHT_CM) * 100.0f;
  return clampValue(percent, 0.0f, 100.0f);
}

float clampValue(float value, float minValue, float maxValue) {
  if (value < minValue) {
    return minValue;
  }
  if (value > maxValue) {
    return maxValue;
  }
  return value;
}

float roundToDecimals(float value, uint8_t decimals) {
  float factor = 1.0f;
  for (uint8_t i = 0; i < decimals; i++) {
    factor *= 10.0f;
  }

  if (value >= 0.0f) {
    return (long)(value * factor + 0.5f) / factor;
  }

  return (long)(value * factor - 0.5f) / factor;
}

String getISOTimestamp() {
  timeClient.update();
  unsigned long epochTime = timeClient.getEpochTime();

  if (epochTime < 1577836800UL) {
    Serial.println("Aviso: Timestamp NTP parece incorreto, usando fallback");
    epochTime = 1698700000UL + (millis() / 1000UL);
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

void sendReading(float distanceCmCorrected, float distanceCmRaw, float waterHeightCm, float levelPercent, float volumeLiters, float volumeMl, int validSamples) {
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
  http.addHeader("Authorization", String("Bearer ") + API_KEY);
  http.addHeader("X-Device-Type", "water");

  StaticJsonDocument<768> doc;
  doc["device_id"] = DEVICE_ID;
  doc["timestamp"] = getISOTimestamp();

  JsonObject readings = doc.createNestedObject("readings");
  readings["distance_cm"] = roundToDecimals(distanceCmCorrected, 2);
  readings["water_height_cm"] = roundToDecimals(waterHeightCm, 2);
  readings["water_level_percent"] = roundToDecimals(levelPercent, 1);
  readings["volume_liters"] = roundToDecimals(volumeLiters, 3);
  readings["tank_height_cm"] = roundToDecimals(TANK_HEIGHT_CM, 2);
  readings["tank_capacity_liters"] = roundToDecimals(TANK_CAPACITY_LITERS, 3);
  readings["sensor_offset_cm"] = roundToDecimals(SENSOR_OFFSET_CM, 2);
  readings["sample_count"] = validSamples;
  readings["aggregation_window_seconds"] = roundToDecimals(SAMPLES_PER_READING * (SAMPLE_INTERVAL_MS / 1000.0f), 1);

  JsonObject metadata = doc.createNestedObject("metadata");
  metadata["firmware_version"] = "1.2.0-cylinder";
  metadata["rssi"] = WiFi.RSSI();
  metadata["uptime_seconds"] = millis() / 1000;
  metadata["tank_radius_cm"] = TANK_RADIUS_CM;
  metadata["tank_diameter_cm"] = TANK_DIAMETER_CM;
  metadata["tank_height_cm"] = TANK_HEIGHT_CM;
  metadata["tank_capacity_ml"] = TANK_CAPACITY_ML;
  metadata["volume_correction_factor"] = VOLUME_CORRECTION_FACTOR;
  metadata["calibration_points"] = 2;
  metadata["calibration_last_update"] = "2025-11-06";
  metadata["interpolation"] = "cylinder";
  metadata["volume_ml"] = roundToDecimals(volumeMl, 1);
  metadata["samples_requested"] = SAMPLES_PER_READING;
  metadata["valid_samples"] = validSamples;
  metadata["distance_raw_cm"] = roundToDecimals(distanceCmRaw, 2);

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
