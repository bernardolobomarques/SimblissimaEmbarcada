# Análise de Arquitetura - Sistema IoT Monitor

## 📋 Requisitos do Sistema

### Fluxo de Dados
1. **Sensores IoT** coletam leituras continuamente
2. **Agregação local** (no ESP8266): Média a cada 5 minutos
3. **Envio para Supabase**: Dados agregados a cada 5 minutos
4. **App Mobile**: Exibe dados em tempo real e histórico de 30 dias

---

## 🚨 Problemas Identificados no Schema Atual

### 1. **Foreign Keys Quebradas**
```sql
-- PROBLEMA: device_id é TEXT mas deveria referenciar devices.id (UUID)
energy_readings.device_id text NOT NULL
water_readings.device_id text NOT NULL
devices.id uuid NOT NULL
```

**Impacto:** 
- Não há integridade referencial
- Dados órfãos podem ser inseridos
- Queries de JOIN ficam lentas

**Solução:** Converter `device_id` para UUID e criar FK constraints.

---

### 2. **Falta de Índices**
```sql
-- Queries mais comuns não têm índices:
SELECT * FROM energy_readings WHERE device_id = 'xxx' ORDER BY timestamp DESC
SELECT * FROM water_readings WHERE timestamp > NOW() - INTERVAL '30 days'
```

**Impacto:**
- Queries lentas conforme dados crescem
- Full table scan em cada busca

**Solução:** Criar índices compostos em (device_id, timestamp).

---

### 3. **Sem Row Level Security (RLS)**
```sql
-- Atualmente QUALQUER usuário pode ver dados de QUALQUER outro
```

**Impacto:**
- **CRÍTICO**: Violação de privacidade
- Usuário A pode ver consumo de Usuário B

**Solução:** Habilitar RLS e criar policies por user_id.

---

### 4. **Sem Mecanismo de Limpeza Histórica**
```sql
-- Dados crescem infinitamente
-- Sem particionamento ou auto-delete
```

**Impacto:**
- Custo crescente de storage
- Queries cada vez mais lentas

**Solução:** Trigger ou função cron para deletar dados > 30 dias.

---

### 5. **Sem Tabelas de Agregação**
```sql
-- App precisa calcular médias diárias/horárias toda vez
SELECT AVG(power_watts) FROM energy_readings WHERE timestamp::date = '2025-10-26'
-- Essa query roda TODA VEZ que o usuário abre a tela
```

**Impacto:**
- Lentidão na UI
- Desperdício de compute do Supabase
- Custo alto em databases grandes

**Solução:** Criar tabelas de agregação pré-calculadas.

---

### 6. **Sem Sistema de Autenticação para IoT Devices**
```sql
-- Como o ESP8266 autentica no Supabase?
-- Usa anon key? (INSEGURO!)
-- Usa service role key? (PIOR AINDA!)
```

**Impacto:**
- Qualquer pessoa com a anon key pode enviar dados falsos
- Não há rate limiting
- Não há validação de origem

**Solução:** API Key por dispositivo + Edge Function para validação.

---

### 7. **Cálculos Derivados Não Armazenados**
```sql
-- energy_kwh é calculado mas não persiste corretamente
-- Consumo diário precisa ser recalculado sempre
```

**Impacto:**
- Inconsistências em relatórios
- Impossível fazer histórico preciso de kWh

**Solução:** Materializar cálculos em tabelas agregadas.

---

### 8. **Sem Detecção de Anomalias**
```sql
-- Não há triggers para detectar:
-- - Consumo fora do padrão
-- - Sensor offline
-- - Vazamentos (drop súbito de nível)
```

**Impacto:**
- Alertas só funcionam manualmente no app
- Usuário não é notificado de problemas

**Solução:** Triggers + Edge Functions para criar alerts automaticamente.

---

### 9. **Timestamps Sem Timezone Handling**
```sql
timestamp with time zone DEFAULT now()
-- Ok, mas queries do app não consideram timezone do usuário
```

**Impacto:**
- Gráficos podem estar "deslocados" para usuários em TZ diferente do servidor

**Solução:** Sempre converter para timezone do usuário no app.

---

### 10. **Sem Validação de Dados**
```sql
-- Nada impede valores impossíveis:
INSERT INTO water_readings (water_level_percent) VALUES (150); -- ❌
INSERT INTO energy_readings (power_watts) VALUES (-500); -- ❌
```

**Impacto:**
- Dados corrompidos no banco
- Gráficos quebrados

**Solução:** CHECK constraints e validação em Edge Function.

---

## ✅ Arquitetura Proposta

### Camadas do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    ESP8266 (Sensores)                       │
│  - Coleta 1 leitura/segundo                                 │
│  - Calcula média de 300 leituras (5min)                     │
│  - Envia payload agregado                                   │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTPS POST
                  │ API Key authentication
                  ▼
┌─────────────────────────────────────────────────────────────┐
│           Supabase Edge Function (Validação)                │
│  - Valida API Key                                           │
│  - Verifica formato de dados                                │
│  - Rate limiting (12 req/hora por device)                   │
│  - Insere em *_readings table                               │
└─────────────────┬───────────────────────────────────────────┘
                  │ Row Insert
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                Database Triggers                            │
│  - ON INSERT: Atualiza tabela de agregação                  │
│  - Detecta anomalias e cria alertas                         │
│  - Atualiza devices.updated_at                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Tabelas de Agregação (Views)                   │
│  - energy_hourly_stats                                      │
│  - energy_daily_stats                                       │
│  - water_hourly_stats                                       │
│  - water_daily_stats                                        │
└─────────────────┬───────────────────────────────────────────┘
                  │ Realtime subscription
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                React Native App                             │
│  - Subscribe a mudanças em tempo real                       │
│  - Cache local com AsyncStorage                             │
│  - Fallback para queries agregadas                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Novas Tabelas Necessárias

### 1. **device_api_keys** (Autenticação IoT)
```sql
CREATE TABLE device_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  api_key TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  request_count BIGINT DEFAULT 0
);
```

### 2. **energy_daily_stats** (Agregação Pré-calculada)
```sql
CREATE TABLE energy_daily_stats (
  id BIGSERIAL PRIMARY KEY,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  avg_power_watts NUMERIC,
  max_power_watts NUMERIC,
  min_power_watts NUMERIC,
  total_kwh NUMERIC,
  reading_count INTEGER,
  estimated_cost NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(device_id, date)
);
```

### 3. **water_daily_stats**
```sql
CREATE TABLE water_daily_stats (
  id BIGSERIAL PRIMARY KEY,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  avg_level_percent NUMERIC,
  max_level_percent NUMERIC,
  min_level_percent NUMERIC,
  avg_volume_liters NUMERIC,
  consumption_liters NUMERIC, -- Diferença entre max e min do dia
  reading_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(device_id, date)
);
```

---

## 🔧 Mudanças Necessárias

### No Supabase (SQL)
1. ✅ Converter `device_id` de TEXT para UUID
2. ✅ Adicionar Foreign Keys
3. ✅ Criar índices compostos
4. ✅ Habilitar RLS com policies
5. ✅ Criar tabelas de agregação
6. ✅ Criar triggers de atualização
7. ✅ Criar função de limpeza histórica
8. ✅ Adicionar CHECK constraints
9. ✅ Criar Edge Function de ingestão

### No Código React Native
1. ✅ Atualizar types para incluir agregações
2. ✅ Criar hooks para dados históricos
3. ✅ Implementar cache local
4. ✅ Adicionar tratamento de timezone
5. ✅ Criar telas de histórico detalhado
6. ✅ Implementar sistema de notificações
7. ✅ Adicionar loading states e error handling

### No ESP8266 (Firmware)
1. ✅ Armazenar API Key em EEPROM
2. ✅ Implementar buffer circular para agregação
3. ✅ Adicionar retry logic para falhas de rede
4. ✅ Enviar timestamp em ISO8601 com timezone
5. ✅ Implementar watchdog timer

---

## 🎯 Próximos Passos

Vou criar os seguintes arquivos:
1. `supabase-migration.sql` - Script completo de migração
2. `supabase-edge-function.ts` - Função de ingestão IoT
3. Atualizar types TypeScript
4. Criar hooks de dados históricos
5. Atualizar componentes de telas
6. Documentação de API para ESP8266

Deseja que eu prossiga com a implementação?
