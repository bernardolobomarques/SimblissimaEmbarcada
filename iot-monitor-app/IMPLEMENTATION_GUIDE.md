# 🚀 Guia de Implementação - Sistema IoT Monitor

## 📋 Checklist de Implementação

### 1. Configuração do Supabase

#### 1.1 Executar Migração SQL
```bash
# No dashboard do Supabase > SQL Editor
# Copiar e colar o conteúdo de: supabase-migration.sql
# Executar o script completo
```

**O que isso faz:**
- ✅ Cria tabelas de agregação (`energy_daily_stats`, `water_daily_stats`)
- ✅ Adiciona índices para performance
- ✅ Habilita Row Level Security (RLS)
- ✅ Cria triggers para atualização automática de estatísticas
- ✅ Adiciona detecção automática de anomalias
- ✅ Cria tabela de API Keys para dispositivos

#### 1.2 Deploy da Edge Function
```bash
# Instalar Supabase CLI
npm install -g supabase

# Login no Supabase
supabase login

# Link ao projeto
supabase link --project-ref ybnobvonfxoqvlimfzpl

# Criar pasta de functions
mkdir -p supabase/functions/iot-ingest

# Copiar arquivo
cp supabase-edge-function-iot-ingest.ts supabase/functions/iot-ingest/index.ts

# Deploy
supabase functions deploy iot-ingest
```

#### 1.3 Configurar pg_cron (Limpeza Automática)
```sql
-- No SQL Editor do Supabase
SELECT cron.schedule(
  'cleanup-old-data',
  '0 2 * * *', -- Todo dia às 2h da manhã
  'SELECT cleanup_old_readings()'
);
```

---

### 2. Configuração do App React Native

#### 2.1 Já Implementado ✅
- [x] Credenciais Supabase atualizadas em `src/constants/config.ts`
- [x] Types atualizados com `EnergyDailyStats` e `WaterDailyStats`
- [x] Componente `Card` corrigido
- [x] `HomeScreen` corrigido

#### 2.2 Próximos Passos no App

**Criar hook para dados históricos:**
```typescript
// src/hooks/useHistoricalData.ts
import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { EnergyDailyStats } from '../types/energy.types'

export function useEnergyHistory(deviceId: string, days: number = 30) {
  const [data, setData] = useState<EnergyDailyStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [deviceId, days])

  const loadHistory = async () => {
    const { data, error } = await supabase
      .from('energy_daily_stats')
      .select('*')
      .eq('device_id', deviceId)
      .gte('date', new Date(Date.now() - days * 86400000).toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (!error && data) setData(data)
    setLoading(false)
  }

  return { data, loading, reload: loadHistory }
}
```

**Atualizar EnergyMonitorScreen:**
```typescript
// Adicionar no componente:
const { data: historyData } = useEnergyHistory(deviceId, 30)

// Usar historyData para gráficos
```

---

### 3. Configuração do ESP8266

#### 3.1 Criar Dispositivo no App

1. Abrir app mobile
2. Ir em "Adicionar Dispositivo"
3. Preencher:
   - Nome: "Sensor Energia Sala"
   - Tipo: Energia
   - Localização: "Sala de estar"

4. O app deve criar um registro na tabela `devices`

#### 3.2 Gerar API Key

```sql
-- No Supabase SQL Editor
-- Substituir UUID pelo ID do device criado
SELECT generate_device_api_key('550e8400-e29b-41d4-a716-446655440000');

-- Retorna algo como: iot_AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
```

#### 3.3 Programar ESP8266

```cpp
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>
#include <NTPClient.h>
#include <WiFiUdp.h>

// Configurações WiFi
const char* ssid = "SEU_WIFI";
const char* password = "SUA_SENHA";

// Configurações API
const char* deviceId = "550e8400-e29b-41d4-a716-446655440000";
const char* apiKey = "iot_AbCdEfGhIjKlMnOpQrStUvWxYz1234567890";
const char* apiUrl = "https://ybnobvonfxoqvlimfzpl.supabase.co/functions/v1/iot-ingest";

WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", -3 * 3600); // UTC-3

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nWiFi Connected!");
  timeClient.begin();
}

void loop() {
  // Coletar 300 amostras (5 minutos a 1Hz)
  float currentSum = 0;
  int validSamples = 0;
  
  for (int i = 0; i < 300; i++) {
    float sensorValue = analogRead(A0);
    float voltage = (sensorValue / 1024.0) * 5.0;
    float current = (voltage - 2.5) / 0.185; // ACS712-5A
    
    if (current >= 0 && current < 30) {
      currentSum += current;
      validSamples++;
    }
    
    delay(1000);
  }
  
  float avgCurrent = currentSum / validSamples;
  float avgPower = avgCurrent * 127.0;
  
  // Enviar para API
  sendReading(avgCurrent, 127.0, avgPower, validSamples);
}

void sendReading(float current, float voltage, float power, int samples) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    WiFiClientSecure client;
    client.setInsecure(); // Para testes; em produção use certificado
    
    http.begin(client, apiUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", String("Bearer ") + apiKey);
    http.addHeader("X-Device-Type", "energy");
    
    timeClient.update();
    String timestamp = getISOTimestamp();
    
    StaticJsonDocument<512> doc;
    doc["device_id"] = deviceId;
    doc["timestamp"] = timestamp;
    doc["readings"]["current_rms"] = current;
    doc["readings"]["voltage"] = voltage;
    doc["readings"]["power_watts"] = power;
    doc["readings"]["sample_count"] = samples;
    
    String payload;
    serializeJson(doc, payload);
    
    int httpCode = http.POST(payload);
    
    if (httpCode > 0) {
      String response = http.getString();
      Serial.println("Response: " + response);
    } else {
      Serial.println("Error: " + String(httpCode));
    }
    
    http.end();
  }
}

String getISOTimestamp() {
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

### 4. Teste End-to-End

#### 4.1 Teste Manual da Edge Function
```bash
curl -X POST https://ybnobvonfxoqvlimfzpl.supabase.co/functions/v1/iot-ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer iot_SUA_API_KEY_AQUI" \
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

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Energy reading recorded successfully",
  "reading_id": 123
}
```

#### 4.2 Verificar no Supabase
```sql
-- Ver últimas leituras
SELECT * FROM energy_readings 
ORDER BY timestamp DESC 
LIMIT 10;

-- Ver estatísticas agregadas
SELECT * FROM energy_daily_stats 
ORDER BY date DESC 
LIMIT 10;

-- Ver alertas gerados
SELECT * FROM alerts 
WHERE is_read = false 
ORDER BY created_at DESC;
```

#### 4.3 Verificar no App
1. Abrir app mobile
2. Ir para "Dashboard"
3. Verificar se mostra última leitura
4. Ir para "Energia" > "Histórico"
5. Verificar gráfico de consumo dos últimos 30 dias

---

### 5. Problemas Comuns e Soluções

#### Problema: ESP8266 não conecta na API
**Solução:**
- Verificar se WiFi está conectado (`WiFi.status() == WL_CONNECTED`)
- Verificar se API Key está correta
- Verificar logs do Serial Monitor
- Testar com cURL primeiro

#### Problema: Dados não aparecem no app
**Solução:**
```sql
-- Verificar RLS policies
SELECT * FROM pg_policies WHERE tablename = 'energy_readings';

-- Testar query manualmente
SELECT * FROM energy_readings WHERE device_id = 'SEU_UUID';
```

#### Problema: Triggers não estão funcionando
**Solução:**
```sql
-- Verificar se triggers existem
SELECT * FROM pg_trigger WHERE tgname LIKE '%energy%';

-- Re-criar trigger se necessário
DROP TRIGGER IF EXISTS trigger_update_energy_stats ON energy_readings;
CREATE TRIGGER trigger_update_energy_stats
  AFTER INSERT ON energy_readings
  FOR EACH ROW
  EXECUTE FUNCTION update_energy_daily_stats();
```

---

### 6. Monitoramento e Manutenção

#### Verificar Health do Sistema
```sql
-- Dispositivos online vs offline
SELECT 
  device_type,
  status,
  COUNT(*) 
FROM devices 
GROUP BY device_type, status;

-- Leituras por dia (últimos 7 dias)
SELECT 
  DATE(timestamp) as dia,
  COUNT(*) as leituras
FROM energy_readings
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY dia
ORDER BY dia DESC;

-- Alertas não resolvidos
SELECT 
  alert_type,
  severity,
  COUNT(*) 
FROM alerts 
WHERE is_resolved = false 
GROUP BY alert_type, severity;
```

#### Limpar Dados Manualmente
```sql
-- Deletar leituras antigas
SELECT cleanup_old_readings();

-- Ver quanto foi deletado
SELECT 
  'energy_readings' as tabela,
  COUNT(*) as total
FROM energy_readings
UNION ALL
SELECT 
  'water_readings',
  COUNT(*)
FROM water_readings;
```

---

## ✅ Status da Implementação

- [x] Análise de arquitetura completa
- [x] Script SQL de migração criado
- [x] Edge Function de ingestão criada
- [x] Documentação de API para ESP8266
- [x] Types TypeScript atualizados
- [ ] Deploy da Edge Function no Supabase
- [ ] Execução do script SQL no banco
- [ ] Criação de hooks de dados históricos
- [ ] Atualização das telas com gráficos
- [ ] Programação do ESP8266
- [ ] Teste end-to-end

---

## 📚 Arquivos Criados

1. `ARCHITECTURE_ANALYSIS.md` - Análise completa de problemas e soluções
2. `supabase-migration.sql` - Script SQL para rodar no Supabase
3. `supabase-edge-function-iot-ingest.ts` - Edge Function para receber dados IoT
4. `IOT_API_DOCS.md` - Documentação completa da API para ESP8266
5. `IMPLEMENTATION_GUIDE.md` - Este guia (você está aqui!)

---

## 🆘 Próximos Passos Recomendados

1. **Imediato**: Executar `supabase-migration.sql` no Supabase SQL Editor
2. **Em seguida**: Deploy da Edge Function
3. **Depois**: Testar com cURL
4. **Então**: Programar ESP8266
5. **Finalmente**: Atualizar telas do app com dados históricos

---

**Dúvidas?** Consulte `ARCHITECTURE_ANALYSIS.md` para entender o raciocínio por trás de cada decisão.
