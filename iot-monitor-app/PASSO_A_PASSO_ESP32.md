# 🚀 PASSO A PASSO - Configurar ESP32 com Supabase

## ✅ Status Atual

- [x] Tabelas criadas no Supabase (migration executada)
- [x] Edge Function deployed no Supabase
- [x] Código ESP32 preparado
- [ ] **PRÓXIMO: Configurar ESP32 e testar**

---

## 📋 PASSO 1: Criar Dispositivo no Supabase

### 1.1 Inserir Dispositivo Manualmente

No **Supabase > SQL Editor**, execute:

```sql
-- Para sensor de ENERGIA
INSERT INTO devices (user_id, device_type, device_name, location, is_active, status)
VALUES (
  'SEU_USER_ID_AQUI', -- UUID do usuário (veja em Authentication > Users)
  'energy',
  'Sensor Energia Sala',
  'Sala de estar',
  true,
  'offline'
)
RETURNING id;
```

**OU para sensor de ÁGUA:**

```sql
-- Para sensor de ÁGUA
INSERT INTO devices (user_id, device_type, device_name, location, is_active, status)
VALUES (
  'SEU_USER_ID_AQUI',
  'water',
  'Sensor Água Cozinha',
  'Cozinha',
  true,
  'offline'
)
RETURNING id;
```

**⚠️ IMPORTANTE:** 
- Copie o **UUID retornado** (ex: `550e8400-e29b-41d4-a716-446655440000`)
- Este é o `DEVICE_ID` que você vai usar no ESP32

### 1.2 Como obter seu USER_ID

```sql
-- Listar usuários cadastrados
SELECT id, email FROM auth.users;
```

Copie o `id` do usuário que você quer associar ao dispositivo.

---

## 📋 PASSO 2: Gerar API Key para o Dispositivo

No **Supabase > SQL Editor**, execute:

```sql
-- Substituir pelo UUID do device criado no Passo 1
SELECT generate_device_api_key('550e8400-e29b-41d4-a716-446655440000');
```

**Resultado esperado:**
```
iot_AbCdEfGhIjKlMnOpQrStUvWxYz1234567890==
```

**⚠️ IMPORTANTE:**
- Copie esta API Key
- Você vai colar no código do ESP32

---

## 📋 PASSO 3: Preparar o ESP32

### 3.1 Instalar Arduino IDE

1. Baixar: https://www.arduino.cc/en/software
2. Instalar normalmente

### 3.2 Adicionar Suporte ao ESP32

1. Abrir **Arduino IDE**
2. Ir em **File > Preferences**
3. Em **Additional Boards Manager URLs**, adicionar:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Clicar **OK**
5. Ir em **Tools > Board > Boards Manager**
6. Buscar: `esp32`
7. Instalar: **ESP32 by Espressif Systems**

### 3.3 Instalar Bibliotecas Necessárias

1. **ArduinoJson**
   - **Sketch > Include Library > Manage Libraries**
   - Buscar: `ArduinoJson`
   - Instalar versão **6.x.x** (by Benoit Blanchon)

2. **NTPClient**
   - Buscar: `NTPClient`
   - Instalar (by Fabrice Weinberg)

---

## 📋 PASSO 4: Configurar o Código ESP32

### 4.1 Abrir o Código

**Para sensor de ENERGIA:**
- Abrir: `esp32_energia_exemplo.ino`

**Para sensor de ÁGUA:**
- Abrir: `esp32_agua_exemplo.ino`

### 4.2 Editar Configurações

Procurar a seção **CONFIGURAÇÕES** no início do código e alterar:

```cpp
// WiFi
const char* WIFI_SSID = "Nome_Do_Seu_WiFi";       // ← Alterar
const char* WIFI_PASSWORD = "Senha_Do_Seu_WiFi";  // ← Alterar

// Supabase
const char* DEVICE_ID = "550e8400-..."; // ← Colar UUID do Passo 1
const char* API_KEY = "iot_AbCd...";    // ← Colar API Key do Passo 2
```

### 4.3 Configurar Pinos (se necessário)

**ENERGIA (ACS712):**
```cpp
const int SENSOR_PIN = 34; // GPIO34 - Alterar se conectou em outro pino
```

**ÁGUA (HC-SR04):**
```cpp
const int TRIG_PIN = 5;  // GPIO5 - Pino TRIG
const int ECHO_PIN = 18; // GPIO18 - Pino ECHO
```

### 4.4 Ajustar Parâmetros do Tanque (só para ÁGUA)

```cpp
const float TANK_HEIGHT_CM = 200.0;        // Altura do seu tanque
const float TANK_CAPACITY_LITERS = 1000.0; // Capacidade do seu tanque
```

---

## 📋 PASSO 5: Conectar ESP32 e Fazer Upload

### 5.1 Conectar Hardware

**ENERGIA (ACS712):**
```
ACS712       ESP32
------       -----
VCC    →     3.3V
GND    →     GND
OUT    →     GPIO34
```

**ÁGUA (HC-SR04):**
```
HC-SR04      ESP32
-------      -----
VCC    →     5V
GND    →     GND
TRIG   →     GPIO5
ECHO   →     GPIO18
```

### 5.2 Conectar ESP32 ao Computador

1. Conectar cabo USB
2. No Arduino IDE:
   - **Tools > Board** → ESP32 Dev Module (ou seu modelo específico)
   - **Tools > Port** → Selecionar porta COM do ESP32
   - **Tools > Upload Speed** → 115200

### 5.3 Fazer Upload do Código

1. Clicar em **Upload** (seta para direita) ou `Ctrl+U`
2. Aguardar compilação e upload
3. Se der erro "Failed to connect", segurar botão **BOOT** do ESP32 durante upload

---

## 📋 PASSO 6: Monitorar Funcionamento

### 6.1 Abrir Serial Monitor

1. **Tools > Serial Monitor** ou `Ctrl+Shift+M`
2. Configurar **Baud Rate** para: `115200`

### 6.2 Saída Esperada

```
=================================
ESP32 - Sensor de Energia IoT
=================================

Conectando ao WiFi: MeuWiFi..... ✓
✓ IP: 192.168.1.100
✓ RSSI: -45 dBm
✓ NTP Client iniciado
✓ Preferences iniciado

✓ Setup completo! Iniciando coleta...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Coletando 300 amostras (5 minutos)...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [30/300] Progresso: 10.0%
  [60/300] Progresso: 20.0%
  ...
  [300/300] Progresso: 100.0%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESULTADO DA AGREGAÇÃO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Amostras válidas: 300/300
  Corrente média: 5.234 A
  Tensão: 127.0 V
  Potência média: 664.72 W
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENVIANDO PARA SUPABASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Payload:
{"device_id":"550e8400-...","timestamp":"2025-10-26T15:30:00-03:00",...}

HTTP Status: 200
Resposta:
{"success":true,"message":"Energy reading recorded successfully","reading_id":123}
✓ Leitura enviada com sucesso!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📋 PASSO 7: Verificar no Supabase

### 7.1 Verificar Leituras

No **Supabase > SQL Editor**:

```sql
-- Ver últimas leituras
SELECT * FROM energy_readings 
ORDER BY timestamp DESC 
LIMIT 10;
```

**OU para água:**

```sql
SELECT * FROM water_readings 
ORDER BY timestamp DESC 
LIMIT 10;
```

### 7.2 Verificar Estatísticas Agregadas

```sql
-- Ver estatísticas diárias
SELECT * FROM energy_daily_stats 
ORDER BY date DESC 
LIMIT 7;
```

### 7.3 Verificar Alertas

```sql
-- Ver alertas criados automaticamente
SELECT * FROM alerts 
WHERE is_read = false 
ORDER BY created_at DESC;
```

### 7.4 Verificar Status do Device

```sql
-- Ver se device está online
SELECT 
  device_name,
  status,
  last_seen,
  NOW() - last_seen as tempo_sem_dados
FROM devices
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

---

## 📋 PASSO 8: Testar no App Mobile

### 8.1 Abrir o App

1. Rodar: `npm run start` na pasta `iot-monitor-app`
2. Escanear QR code com Expo Go

### 8.2 Verificar Dashboard

1. Fazer login com usuário associado ao device
2. Ir para **Dashboard**
3. Deve aparecer:
   - ⚡ Energia: `664.72 W` (última leitura)
   - Status: `1 online`

### 8.3 Verificar Tela de Energia

1. Clicar no card **Energia**
2. Deve aparecer:
   - Gráfico com dados
   - Histórico de leituras
   - Estatísticas

---

## 🔧 PROBLEMAS COMUNS

### ❌ Erro: "WiFi desconectado"

**Solução:**
- Verificar SSID e senha
- Verificar se WiFi é 2.4GHz (ESP32 não suporta 5GHz)
- Aproximar ESP32 do roteador

### ❌ Erro: "HTTP Status: 401"

**Solução:**
- API Key incorreta
- Verificar se copiou corretamente (incluindo `iot_` no início)
- Regenerar API Key se necessário

### ❌ Erro: "HTTP Status: 429"

**Solução:**
- Rate limit atingido (12 requisições/hora)
- Aguardar 5 minutos e tentar novamente
- Código já está configurado para 5 minutos entre envios

### ❌ Erro: "HTTP Status: 400"

**Solução:**
- Payload inválido
- Verificar timestamp (NTP sincronizado?)
- Verificar se DEVICE_ID é UUID válido

### ❌ Erro: Sensor retorna valores errados

**ENERGIA:**
- Calibrar `ACS_ZERO_VOLTAGE` (testar sem carga: deve ser ~2.5V)
- Verificar `ACS_SENSITIVITY` (depende do modelo: 5A=0.185, 20A=0.1, 30A=0.066)

**ÁGUA:**
- Verificar conexões TRIG/ECHO
- Testar medição manual: colocar objeto a 10cm e ver se retorna ~10cm
- Ajustar `SENSOR_OFFSET_CM` se necessário

---

## ✅ PRÓXIMOS PASSOS

Depois que tudo estiver funcionando:

1. **Deixar rodando 24h** e monitorar estabilidade
2. **Verificar consumo de energia** do ESP32
3. **Implementar Deep Sleep** para economizar bateria (se usar bateria)
4. **Adicionar LEDs** de status (conectado, enviando, erro)
5. **Criar case 3D** para proteger ESP32 e sensores
6. **Configurar alertas** no app para níveis críticos

---

## 📞 Suporte

Se tiver problemas:

1. ✅ Verificar Serial Monitor para mensagens de erro
2. ✅ Testar Edge Function com cURL (veja IOT_API_DOCS.md)
3. ✅ Verificar logs no Supabase > Functions > iot-ingest
4. ✅ Conferir se tabelas têm dados: `SELECT COUNT(*) FROM energy_readings`

---

**Boa sorte! 🚀**
