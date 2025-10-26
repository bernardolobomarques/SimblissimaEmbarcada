/*
 * ESP32 - Sensor de Água (HC-SR04 Ultrassônico)
 * Envia leituras agregadas para Supabase a cada 5 minutos
 * 
 * Bibliotecas necessárias:
 * - WiFi (built-in)
 * - HTTPClient (built-in)
 * - ArduinoJson (by Benoit Blanchon)
 * - NTPClient (by Fabrice Weinberg)
 * 
 * Instalação:
 * Arduino IDE > Sketch > Include Library > Manage Libraries
 * Buscar e instalar: ArduinoJson, NTPClient
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include <Preferences.h>

// ============================================================================
// CONFIGURAÇÕES - ALTERE AQUI
// ============================================================================

// WiFi
const char* WIFI_SSID = "SEU_WIFI_AQUI";
const char* WIFI_PASSWORD = "SUA_SENHA_AQUI";

// Supabase
const char* SUPABASE_URL = "https://ybnobvonfxoqvlimfzpl.supabase.co/functions/v1/iot-ingest";
const char* DEVICE_ID = "550e8400-e29b-41d4-a716-446655440001"; // UUID do seu device
const char* API_KEY = "iot_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"; // Sua API Key

// Sensor HC-SR04
const int TRIG_PIN = 5; // GPIO5
const int ECHO_PIN = 18; // GPIO18

// Configurações do Tanque
const float TANK_HEIGHT_CM = 200.0; // Altura total do tanque em cm
const float TANK_CAPACITY_LITERS = 1000.0; // Capacidade total em litros
const float SENSOR_OFFSET_CM = 5.0; // Distância do sensor até o topo do tanque

// Configurações de Amostragem
const int SAMPLES_PER_READING = 300; // 300 amostras = 5 minutos a 1Hz
const int SAMPLE_INTERVAL_MS = 1000; // 1 segundo entre amostras

// ============================================================================
// OBJETOS GLOBAIS
// ============================================================================

WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", -3 * 3600, 60000); // UTC-3 (Brasília)
Preferences preferences;

// ============================================================================
// SETUP
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n=================================");
  Serial.println("ESP32 - Sensor de Água IoT");
  Serial.println("=================================\n");
  
  // Configurar pinos do sensor
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  
  // Conectar WiFi
  connectWiFi();
  
  // Iniciar NTP
  timeClient.begin();
  Serial.println("✓ NTP Client iniciado");
  
  // Carregar configurações salvas (opcional)
  preferences.begin("iot-config", false);
  Serial.println("✓ Preferences iniciado");
  
  Serial.println("\n✓ Setup completo! Iniciando coleta...\n");
}

// ============================================================================
// LOOP PRINCIPAL
// ============================================================================

void loop() {
  // Verificar conexão WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ WiFi desconectado! Reconectando...");
    connectWiFi();
  }
  
  // Atualizar NTP
  timeClient.update();
  
  // Coletar amostras
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.printf("Coletando %d amostras (5 minutos)...\n", SAMPLES_PER_READING);
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  float totalDistance = 0;
  int validSamples = 0;
  
  for (int i = 0; i < SAMPLES_PER_READING; i++) {
    float distance = measureDistance();
    
    if (distance > 0 && distance < 400) { // Validação (HC-SR04 range: 2-400cm)
      totalDistance += distance;
      validSamples++;
    }
    
    // Mostrar progresso a cada 30 segundos
    if ((i + 1) % 30 == 0) {
      Serial.printf("  [%d/%d] Progresso: %.1f%%\n", 
                    i + 1, SAMPLES_PER_READING, 
                    ((i + 1) * 100.0) / SAMPLES_PER_READING);
    }
    
    delay(SAMPLE_INTERVAL_MS);
  }
  
  // Calcular médias
  if (validSamples > 0) {
    float avgDistance = totalDistance / validSamples;
    float waterHeight = TANK_HEIGHT_CM - avgDistance - SENSOR_OFFSET_CM;
    
    // Garantir que waterHeight não seja negativo
    if (waterHeight < 0) waterHeight = 0;
    if (waterHeight > TANK_HEIGHT_CM) waterHeight = TANK_HEIGHT_CM;
    
    float levelPercent = (waterHeight / TANK_HEIGHT_CM) * 100.0;
    float volumeLiters = (levelPercent / 100.0) * TANK_CAPACITY_LITERS;
    
    Serial.println("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    Serial.println("RESULTADO DA AGREGAÇÃO:");
    Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    Serial.printf("  Amostras válidas: %d/%d\n", validSamples, SAMPLES_PER_READING);
    Serial.printf("  Distância média: %.2f cm\n", avgDistance);
    Serial.printf("  Altura da água: %.2f cm\n", waterHeight);
    Serial.printf("  Nível: %.1f%%\n", levelPercent);
    Serial.printf("  Volume: %.1f L\n", volumeLiters);
    Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    
    // Enviar para API
    sendReading(avgDistance, levelPercent, volumeLiters, validSamples);
  } else {
    Serial.println("✗ ERRO: Nenhuma amostra válida coletada!");
  }
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Conectar ao WiFi
 */
void connectWiFi() {
  Serial.printf("Conectando ao WiFi: %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" ✓");
    Serial.printf("✓ IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("✓ RSSI: %d dBm\n", WiFi.RSSI());
  } else {
    Serial.println(" ✗");
    Serial.println("✗ ERRO: Não foi possível conectar ao WiFi!");
    Serial.println("Reiniciando em 10 segundos...");
    delay(10000);
    ESP.restart();
  }
}

/**
 * Medir distância com sensor HC-SR04
 * Retorna distância em centímetros
 */
float measureDistance() {
  // Limpar o pino TRIG
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  
  // Enviar pulso de 10μs
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  // Ler o tempo do pulso ECHO
  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // Timeout 30ms
  
  if (duration == 0) {
    return -1; // Timeout - sem objeto detectado
  }
  
  // Calcular distância (velocidade do som = 343 m/s = 0.0343 cm/μs)
  // Distância = (tempo * velocidade) / 2 (ida e volta)
  float distance = (duration * 0.0343) / 2.0;
  
  return distance;
}

/**
 * Obter timestamp em formato ISO8601
 */
String getISOTimestamp() {
  unsigned long epochTime = timeClient.getEpochTime();
  struct tm *ptm = gmtime((time_t *)&epochTime);
  
  char buffer[32];
  sprintf(buffer, "%04d-%02d-%02dT%02d:%02d:%02d-03:00",
          ptm->tm_year + 1900,
          ptm->tm_mon + 1,
          ptm->tm_mday,
          ptm->tm_hour,
          ptm->tm_min,
          ptm->tm_sec);
  
  return String(buffer);
}

/**
 * Enviar leitura para API do Supabase
 */
void sendReading(float distance, float levelPercent, float volumeLiters, int sampleCount) {
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.println("ENVIANDO PARA SUPABASE");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ WiFi desconectado!");
    return;
  }
  
  HTTPClient http;
  http.begin(SUPABASE_URL);
  
  // Headers
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + API_KEY);
  http.addHeader("X-Device-Type", "water");
  
  // Criar JSON
  StaticJsonDocument<512> doc;
  doc["device_id"] = DEVICE_ID;
  doc["timestamp"] = getISOTimestamp();
  
  JsonObject readings = doc.createNestedObject("readings");
  readings["distance_cm"] = round(distance * 10) / 10.0; // 1 casa decimal
  readings["water_level_percent"] = round(levelPercent * 10) / 10.0;
  readings["volume_liters"] = round(volumeLiters * 10) / 10.0;
  readings["tank_height_cm"] = TANK_HEIGHT_CM;
  readings["tank_capacity_liters"] = TANK_CAPACITY_LITERS;
  readings["sample_count"] = sampleCount;
  
  JsonObject metadata = doc.createNestedObject("metadata");
  metadata["firmware_version"] = "1.0.0";
  metadata["rssi"] = WiFi.RSSI();
  metadata["uptime_seconds"] = millis() / 1000;
  
  String payload;
  serializeJson(doc, payload);
  
  Serial.println("Payload:");
  Serial.println(payload);
  Serial.println();
  
  // Enviar POST
  int httpCode = http.POST(payload);
  
  Serial.printf("HTTP Status: %d\n", httpCode);
  
  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("Resposta:");
    Serial.println(response);
    
    if (httpCode == 200) {
      Serial.println("✓ Leitura enviada com sucesso!");
    } else if (httpCode == 429) {
      Serial.println("⚠ Rate limit atingido! Aguarde antes de enviar novamente.");
    } else if (httpCode == 401) {
      Serial.println("✗ ERRO: API Key inválida!");
    } else if (httpCode >= 400) {
      Serial.println("✗ ERRO: Problema no payload ou validação.");
    }
  } else {
    Serial.printf("✗ ERRO HTTP: %s\n", http.errorToString(httpCode).c_str());
  }
  
  http.end();
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}
