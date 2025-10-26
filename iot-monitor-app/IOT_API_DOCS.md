# API IoT - Documentação para Dispositivos ESP32

## 📡 Visão Geral

Esta API permite que dispositivos IoT (ESP32) enviem leituras de sensores para o backend Supabase.

---

## 🔐 Autenticação

Cada dispositivo precisa de uma **API Key** única.

### Como obter API Key

1. Criar dispositivo no app mobile
2. No Supabase, executar:
```sql
SELECT generate_device_api_key('UUID_DO_SEU_DEVICE');
```
3. Armazenar a API Key no ESP32 (NVS ou SPIFFS)

### Formato da API Key
```
iot_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 📤 Endpoint de Ingestão

### URL
```
https://ybnobvonfxoqvlimfzpl.supabase.co/functions/v1/iot-ingest
```

### Método
```
POST
```

### Headers Obrigatórios
```http
Content-Type: application/json
Authorization: Bearer iot_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
X-Device-Type: energy|water
```

---

## 📊 Formato de Payload

### Energia (Energy)

```json
{
  "device_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-10-26T14:30:00-03:00",
  "readings": {
    "current_rms": 5.2,
    "voltage": 127.0,
    "power_watts": 660.4,
    "sample_count": 300
  },
  "metadata": {
    "firmware_version": "1.0.0",
    "rssi": -65,
    "uptime_seconds": 86400
  }
}
```

**Campos:**
- `device_id` (string, UUID): ID do dispositivo
- `timestamp` (string, ISO8601): Data/hora da leitura com timezone
- `readings.current_rms` (number): Corrente RMS média em Amperes (0-30A)
- `readings.voltage` (number): Tensão em Volts (110-220V)
- `readings.power_watts` (number): Potência média em Watts (calculado)
- `readings.sample_count` (number): Quantidade de amostras agregadas (ex: 300 = 5min a 1Hz)
- `metadata` (object, opcional): Informações adicionais do dispositivo

### Água (Water)

```json
{
  "device_id": "550e8400-e29b-41d4-a716-446655440001",
  "timestamp": "2025-10-26T14:30:00-03:00",
  "readings": {
    "distance_cm": 45.3,
    "water_level_percent": 75.2,
    "volume_liters": 752.0,
    "tank_height_cm": 200,
    "tank_capacity_liters": 1000,
    "sample_count": 300
  },
  "metadata": {
    "firmware_version": "1.0.0",
    "rssi": -58,
    "uptime_seconds": 172800
  }
}
```

**Campos:**
- `device_id` (string, UUID): ID do dispositivo
- `timestamp` (string, ISO8601): Data/hora da leitura com timezone
- `readings.distance_cm` (number): Distância do sensor até a água em cm (0-400)
- `readings.water_level_percent` (number): Nível calculado em % (0-100)
- `readings.volume_liters` (number): Volume calculado em litros
- `readings.tank_height_cm` (number): Altura total do tanque
- `readings.tank_capacity_liters` (number): Capacidade total do tanque
- `readings.sample_count` (number): Quantidade de amostras agregadas
- `metadata` (object, opcional): Informações adicionais

---

## ✅ Respostas

### Sucesso (200 OK)
```json
{
  "success": true,
  "message": "Reading recorded successfully",
  "reading_id": 12345
}
```

### Erro de Autenticação (401 Unauthorized)
```json
{
  "error": "Invalid API key"
}
```

### Erro de Validação (400 Bad Request)
```json
{
  "error": "Invalid payload",
  "details": {
    "power_watts": "Must be between 0 and 100000"
  }
}
```

### Rate Limit Excedido (429 Too Many Requests)
```json
{
  "error": "Rate limit exceeded",
  "retry_after": 300
}
```

### Erro do Servidor (500 Internal Server Error)
```json
{
  "error": "Internal server error",
  "message": "Database connection failed"
}
```

---

## ⚡ Rate Limits

- **12 requisições por hora** por dispositivo
- **1 requisição a cada 5 minutos** (intervalo recomendado)
- Headers de resposta:
  ```
  X-RateLimit-Limit: 12
  X-RateLimit-Remaining: 8
  X-RateLimit-Reset: 1698335400
  ```

---

## 🔄 Lógica de Retry

### Recomendações para ESP8266

```cpp
int retry_count = 0;
int max_retries = 3;
int base_delay = 5000; // 5 segundos

while (retry_count < max_retries) {
  int response = sendToAPI(payload);
  
  if (response == 200) {
    // Sucesso
    break;
  } else if (response == 429) {
    // Rate limit - esperar mais tempo
    delay(60000); // 1 minuto
  } else if (response >= 500) {
    // Erro do servidor - retry com backoff exponencial
    delay(base_delay * pow(2, retry_count));
    retry_count++;
  } else {
    // Erro 4xx - não fazer retry, logar erro
    logError(response);
    break;
  }
}
```

---

## 📐 Cálculos no ESP8266

### Para Sensor de Energia (ACS712)

```cpp
// Agregação a cada 5 minutos (300 amostras a 1Hz)
const int SAMPLE_COUNT = 300;
float currentSum = 0;
int validSamples = 0;

for (int i = 0; i < SAMPLE_COUNT; i++) {
  float sensorValue = analogRead(A0);
  float voltage = (sensorValue / 1024.0) * 5.0;
  float current = (voltage - 2.5) / 0.185; // ACS712-5A
  
  if (current >= 0 && current < 30) { // Validação
    currentSum += current;
    validSamples++;
  }
  
  delay(1000); // 1 segundo entre amostras
}

float avgCurrent = currentSum / validSamples;
float avgPower = avgCurrent * 127.0; // Tensão nominal

// Montar payload JSON
String payload = "{";
payload += "\"device_id\":\"" + DEVICE_ID + "\",";
payload += "\"timestamp\":\"" + getISOTimestamp() + "\",";
payload += "\"readings\":{";
payload += "\"current_rms\":" + String(avgCurrent, 2) + ",";
payload += "\"voltage\":127.0,";
payload += "\"power_watts\":" + String(avgPower, 2) + ",";
payload += "\"sample_count\":" + String(validSamples);
payload += "}}";
```

### Para Sensor de Água (HC-SR04)

```cpp
const int SAMPLE_COUNT = 300;
float distanceSum = 0;
int validSamples = 0;

for (int i = 0; i < SAMPLE_COUNT; i++) {
  long duration = measureUltrasonic();
  float distance = duration * 0.034 / 2; // cm
  
  if (distance > 0 && distance < 400) { // Validação
    distanceSum += distance;
    validSamples++;
  }
  
  delay(1000);
}

float avgDistance = distanceSum / validSamples;
float tankHeight = 200.0; // cm
float waterHeight = tankHeight - avgDistance;
float levelPercent = (waterHeight / tankHeight) * 100.0;
float volumeLiters = (levelPercent / 100.0) * 1000.0; // Tank capacity

String payload = "{";
payload += "\"device_id\":\"" + DEVICE_ID + "\",";
payload += "\"timestamp\":\"" + getISOTimestamp() + "\",";
payload += "\"readings\":{";
payload += "\"distance_cm\":" + String(avgDistance, 1) + ",";
payload += "\"water_level_percent\":" + String(levelPercent, 1) + ",";
payload += "\"volume_liters\":" + String(volumeLiters, 1) + ",";
payload += "\"tank_height_cm\":200,";
payload += "\"tank_capacity_liters\":1000,";
payload += "\"sample_count\":" + String(validSamples);
payload += "}}";
```

---

## 🕐 Timestamp com Timezone

### Obter timestamp ISO8601 no ESP8266

```cpp
#include <NTPClient.h>
#include <WiFiUdp.h>

WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", -3 * 3600); // UTC-3 (Brasília)

String getISOTimestamp() {
  timeClient.update();
  unsigned long epochTime = timeClient.getEpochTime();
  
  struct tm *ptm = gmtime((time_t *)&epochTime);
  
  char buffer[30];
  sprintf(buffer, "%04d-%02d-%02dT%02d:%02d:%02d-03:00",
          ptm->tm_year + 1900,
          ptm->tm_mon + 1,
          ptm->tm_mday,
          ptm->tm_hour,
          ptm->tm_min,
          ptm->tm_sec);
  
  return String(buffer);
}
```

---

## 🔒 Segurança

### Armazenar API Key com Segurança

```cpp
#include <EEPROM.h>

#define API_KEY_ADDR 0
#define API_KEY_SIZE 64

void saveAPIKey(String apiKey) {
  EEPROM.begin(512);
  for (int i = 0; i < apiKey.length(); i++) {
    EEPROM.write(API_KEY_ADDR + i, apiKey[i]);
  }
  EEPROM.write(API_KEY_ADDR + apiKey.length(), '\0');
  EEPROM.commit();
  EEPROM.end();
}

String loadAPIKey() {
  EEPROM.begin(512);
  char apiKey[API_KEY_SIZE];
  for (int i = 0; i < API_KEY_SIZE; i++) {
    apiKey[i] = EEPROM.read(API_KEY_ADDR + i);
    if (apiKey[i] == '\0') break;
  }
  EEPROM.end();
  return String(apiKey);
}
```

---

## 🧪 Teste da API

### Usando cURL

```bash
curl -X POST https://ybnobvonfxoqvlimfzpl.supabase.co/functions/v1/iot-ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer iot_xxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "X-Device-Type: energy" \
  -d '{
    "device_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-10-26T14:30:00-03:00",
    "readings": {
      "current_rms": 5.2,
      "voltage": 127.0,
      "power_watts": 660.4,
      "sample_count": 300
    }
  }'
```

---

## 📊 Monitoramento

### Verificar Status do Dispositivo

```sql
-- Ver últimas leituras
SELECT * FROM energy_readings 
WHERE device_id = 'SEU_DEVICE_ID' 
ORDER BY timestamp DESC 
LIMIT 10;

-- Ver estatísticas de uso da API
SELECT 
  api_key,
  request_count,
  last_used_at,
  is_active
FROM device_api_keys
WHERE device_id = 'SEU_DEVICE_ID';
```

---

## ❓ FAQ

### 1. Qual a frequência ideal de envio?
**R:** A cada 5 minutos (300 segundos). Isso respeita o rate limit e economiza bateria.

### 2. O que fazer se perder conexão WiFi?
**R:** Armazene as leituras em buffer local (SPIFFS) e envie quando reconectar.

### 3. Como lidar com falhas de envio?
**R:** Implemente retry com backoff exponencial (veja seção de Retry).

### 4. Posso enviar leituras em lote?
**R:** Não no momento. Cada requisição deve conter apenas 1 leitura agregada.

### 5. Como atualizar configurações do dispositivo?
**R:** Por enquanto, manualmente. Futuramente teremos endpoint de configuração.

---

## 📝 Checklist de Implementação

- [ ] Obter e armazenar API Key com segurança
- [ ] Implementar coleta de amostras (1Hz por 5min)
- [ ] Calcular médias das amostras
- [ ] Sincronizar relógio com NTP
- [ ] Formatar timestamp em ISO8601
- [ ] Montar payload JSON corretamente
- [ ] Implementar lógica de retry
- [ ] Adicionar watchdog timer
- [ ] Logar erros em serial
- [ ] Testar em ambiente de desenvolvimento

---

## 🆘 Suporte

Em caso de problemas:
1. Verifique logs do Serial Monitor
2. Teste com cURL primeiro
3. Valide formato do JSON em jsonlint.com
4. Verifique se API Key está ativa no banco

---

**Última atualização:** 26/10/2025
