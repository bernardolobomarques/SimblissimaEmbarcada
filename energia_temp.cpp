/*
 * ESP32 - Sensor de Energia (ACS712)
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
const char* WIFI_SSID = "POCO X5 5G";
const char* WIFI_PASSWORD = "vascodagama";

// Supabase
const char* SUPABASE_URL = "https://ybnobvonfxoqvlimfzpl.supabase.co/functions/v1/supabase-edge-function-iot-ingest-ts";
const char* DEVICE_ID = "4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e"; // UUID do seu device
const char* API_KEY = "iot_XzSw0pRPQolvrXu2St3t-dnxY-wJYhhn"; // Sua API Key

// Sensor ACS712
const int SENSOR_PIN = 34; // GPIO34 (ADC1_CH6)
const float VOLTAGE_NOMINAL = 127.0; // 127V ou 220V
const float ACS_SENSITIVITY = 0.185; // ACS712-5A = 0.185V/A, 20A = 0.1V/A, 30A = 0.066V/A
const float ACS_ZERO_VOLTAGE = 2.5; // Tensão em 0A (geralmente metade de Vcc)

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
  Serial.println("ESP32 - Sensor de Energia IoT");
  Serial.println("=================================\n");
  
  // Configurar ADC
  analogReadResolution(12); // ESP32 tem ADC de 12 bits (0-4095)
  analogSetAttenuation(ADC_11db); // 0-3.3V
  
  // Conectar WiFi
  connectWiFi();
  
  // Iniciar NTP e aguardar sincronização
  timeClient.begin();
  Serial.println("NTP Client iniciado");
  
  Serial.println("Sincronizando horário...");
  int ntpAttempts = 0;
  while (!timeClient.update() && ntpAttempts < 10) {
    delay(1000);
    Serial.print(".");
    ntpAttempts++;
  }
  
  if (ntpAttempts < 10) {
    Serial.println(" OK");
    Serial.printf("Horário atual: %s\n", timeClient.getFormattedTime().c_str());
  } else {
    Serial.println(" FALHOU");
    Serial.println("Aviso: NTP não sincronizado, timestamps podem estar incorretos");
  }
  
  // Carregar configurações salvas (opcional)
  preferences.begin("iot-config", false);
  Serial.println("Preferences iniciado");
  
  Serial.println("\nSetup completo! Iniciando coleta...\n");
}

// ============================================================================
// LOOP PRINCIPAL
// ============================================================================

void loop() {
  // Verificar conexão WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi desconectado! Reconectando...");
    connectWiFi();
  }
  
  // Atualizar NTP periodicamente
  timeClient.update();
  
  // Coletar amostras
  Serial.println("========================================");
  Serial.printf("Coletando %d amostras (5 minutos)...\n", SAMPLES_PER_READING);
  Serial.println("========================================");
  
  float totalCurrent = 0;
  int validSamples = 0;
  
  for (int i = 0; i < SAMPLES_PER_READING; i++) {
    float current = readCurrent();
    
    if (current >= 0 && current < 30) { // Validação
      totalCurrent += current;
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
    float avgCurrent = totalCurrent / validSamples;
    float avgPower = avgCurrent * VOLTAGE_NOMINAL;
    
    Serial.println("\n========================================");
    Serial.println("RESULTADO DA AGREGACAO:");
    Serial.println("========================================");
    Serial.printf("  Amostras validas: %d/%d\n", validSamples, SAMPLES_PER_READING);
    Serial.printf("  Corrente media: %.3f A\n", avgCurrent);
    Serial.printf("  Tensao: %.1f V\n", VOLTAGE_NOMINAL);
    Serial.printf("  Potencia media: %.2f W\n", avgPower);
    Serial.println("========================================\n");
    
    // Enviar para API
    sendReading(avgCurrent, VOLTAGE_NOMINAL, avgPower, validSamples);
  } else {
    Serial.println("ERRO: Nenhuma amostra valida coletada!");
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
    Serial.println(" OK");
    Serial.printf("IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("RSSI: %d dBm\n", WiFi.RSSI());
  } else {
    Serial.println(" FALHOU");
    Serial.println("ERRO: Nao foi possivel conectar ao WiFi!");
    Serial.println("Reiniciando em 10 segundos...");
    delay(10000);
    ESP.restart();
  }
}

/**
 * Ler corrente do sensor ACS712
 * Retorna corrente RMS em Amperes
 */
float readCurrent() {
  const int NUM_SAMPLES = 100; // Amostras para calcular RMS
  float sumSquares = 0;
  
  for (int i = 0; i < NUM_SAMPLES; i++) {
    int rawValue = analogRead(SENSOR_PIN);
    float voltage = (rawValue / 4095.0) * 3.3; // ESP32: 12-bit ADC, 3.3V
    float current = (voltage - ACS_ZERO_VOLTAGE) / ACS_SENSITIVITY;
    sumSquares += current * current;
    delayMicroseconds(500); // ~2ms total para 100 amostras
  }
  
  float rms = sqrt(sumSquares / NUM_SAMPLES);
  return abs(rms); // Retornar valor absoluto
}

/**
 * Obter timestamp em formato ISO8601 - CORRIGIDO
 */
String getISOTimestamp() {
  // Garantir que o NTP está atualizado
  timeClient.update();
  
  // Verificar se o tempo foi sincronizado corretamente
  unsigned long epochTime = timeClient.getEpochTime();
  
  // Validar se o timestamp é razoável (após 2020)
  if (epochTime < 1577836800) { // 1 de Janeiro de 2020
    Serial.println("Aviso: Timestamp NTP parece incorreto, usando fallback");
    // Usar timestamp atual baseado em millis() como fallback
    epochTime = 1698700000 + (millis() / 1000); // Base aproximada + uptime
  }
  
  // Converter para struct tm com timezone local (Brasil -3h já configurado no NTP)
  time_t rawTime = (time_t)epochTime;
  struct tm *timeinfo = gmtime(&rawTime);
  
  // Formatar no padrão ISO8601
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

/**
 * Enviar leitura para API do Supabase
 */
void sendReading(float current, float voltage, float power, int sampleCount) {
  Serial.println("----------------------------------------");
  Serial.println("ENVIANDO PARA SUPABASE");
  Serial.println("----------------------------------------");

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi desconectado!");
    return;
  }

  HTTPClient http;
  http.begin(SUPABASE_URL);

  // Headers
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);
  http.addHeader("X-Device-Type", "energy");

  // Criar JSON
  StaticJsonDocument<384> doc;
  doc["device_id"] = DEVICE_ID;
  doc["timestamp"] = getISOTimestamp();
  
  JsonObject readings = doc.createNestedObject("readings");
  readings["current_rms"] = round(current * 1000) / 1000.0;
  readings["voltage"] = voltage;
  readings["power_watts"] = round(power * 100) / 100.0;
  readings["sample_count"] = sampleCount;

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
      Serial.println("Rate limit atingido! Aguarde antes de enviar novamente.");
    } else if (httpCode == 401) {
      Serial.println("ERRO: API Key invalida!");
    } else if (httpCode >= 400) {
      Serial.println("ERRO: Problema no payload ou validacao.");
    }
  } else {
    Serial.printf("ERRO HTTP: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
  Serial.println("----------------------------------------\n");
}
