-- ============================================================================
-- MIGRATION SCRIPT - IoT Monitor System
-- ============================================================================
-- Este script corrige o schema atual e adiciona funcionalidades necessárias
-- IMPORTANTE: Rodar em ambiente de desenvolvimento primeiro!
-- ============================================================================

-- ============================================================================
-- PARTE 1: EXTENSÕES
-- ============================================================================

-- Habilita UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PARTE 2: BACKUP DAS TABELAS EXISTENTES (OPCIONAL - SEGURANÇA)
-- ============================================================================

-- Descomente se quiser fazer backup antes da migração
-- CREATE TABLE energy_readings_backup AS SELECT * FROM energy_readings;
-- CREATE TABLE water_readings_backup AS SELECT * FROM water_readings;
-- CREATE TABLE devices_backup AS SELECT * FROM devices;
-- CREATE TABLE alerts_backup AS SELECT * FROM alerts;

-- ============================================================================
-- PARTE 3: ADICIONAR NOVAS COLUNAS E CORRIGIR TIPOS
-- ============================================================================

-- Adicionar colunas faltantes em devices
ALTER TABLE devices 
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- PARTE 4: CRIAR NOVA TABELA DE API KEYS PARA DISPOSITIVOS IoT
-- ============================================================================

CREATE TABLE IF NOT EXISTS device_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  api_key TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  request_count BIGINT DEFAULT 0
);

-- Índice para lookup rápido de API key
CREATE INDEX IF NOT EXISTS idx_device_api_keys_api_key 
  ON device_api_keys(api_key) WHERE is_active = true;

-- ============================================================================
-- PARTE 5: CRIAR TABELAS DE AGREGAÇÃO DIÁRIA
-- ============================================================================

-- Estatísticas diárias de energia
CREATE TABLE IF NOT EXISTS energy_daily_stats (
  id BIGSERIAL PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  avg_power_watts NUMERIC(10, 2),
  max_power_watts NUMERIC(10, 2),
  min_power_watts NUMERIC(10, 2),
  total_kwh NUMERIC(10, 3),
  reading_count INTEGER DEFAULT 0,
  estimated_cost NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_energy_daily_stat UNIQUE(device_id, date)
);

-- Estatísticas diárias de água
CREATE TABLE IF NOT EXISTS water_daily_stats (
  id BIGSERIAL PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  avg_level_percent NUMERIC(5, 2),
  max_level_percent NUMERIC(5, 2),
  min_level_percent NUMERIC(5, 2),
  avg_volume_liters NUMERIC(10, 2),
  consumption_liters NUMERIC(10, 2), -- Consumo = max - min do dia
  reading_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_water_daily_stat UNIQUE(device_id, date)
);

-- ============================================================================
-- PARTE 6: CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índices para energy_readings
CREATE INDEX IF NOT EXISTS idx_energy_readings_device_timestamp 
  ON energy_readings(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_energy_readings_timestamp 
  ON energy_readings(timestamp DESC);

-- Índices para water_readings
CREATE INDEX IF NOT EXISTS idx_water_readings_device_timestamp 
  ON water_readings(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_water_readings_timestamp 
  ON water_readings(timestamp DESC);

-- Índices para devices
CREATE INDEX IF NOT EXISTS idx_devices_user_type 
  ON devices(user_id, device_type) WHERE is_active = true;

-- Índices para alerts
CREATE INDEX IF NOT EXISTS idx_alerts_user_unread 
  ON alerts(user_id, created_at DESC) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_alerts_device 
  ON alerts(device_id, created_at DESC);

-- Índices para stats
CREATE INDEX IF NOT EXISTS idx_energy_daily_stats_device_date 
  ON energy_daily_stats(device_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_water_daily_stats_device_date 
  ON water_daily_stats(device_id, date DESC);

-- ============================================================================
-- PARTE 7: ADICIONAR CHECK CONSTRAINTS PARA VALIDAÇÃO
-- ============================================================================

-- Validação de valores em energy_readings
ALTER TABLE energy_readings 
  DROP CONSTRAINT IF EXISTS check_energy_positive_values,
  ADD CONSTRAINT check_energy_positive_values 
    CHECK (
      current_rms >= 0 AND 
      voltage >= 0 AND voltage <= 380 AND  -- Máx 380V trifásico
      power_watts >= 0 AND power_watts <= 100000 AND  -- Máx 100kW residencial
      (energy_kwh IS NULL OR energy_kwh >= 0)
    );

-- Validação de valores em water_readings
ALTER TABLE water_readings 
  DROP CONSTRAINT IF EXISTS check_water_valid_values,
  ADD CONSTRAINT check_water_valid_values 
    CHECK (
      distance_cm >= 0 AND distance_cm <= 1000 AND  -- Max 10m
      water_level_percent >= 0 AND water_level_percent <= 100 AND
      volume_liters >= 0 AND
      tank_height_cm > 0 AND tank_height_cm <= 1000 AND
      tank_capacity_liters > 0 AND tank_capacity_liters <= 1000000
    );

-- ============================================================================
-- PARTE 8: HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_api_keys ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PARTE 9: CRIAR POLICIES DE SEGURANÇA
-- ============================================================================

-- Policies para devices
DROP POLICY IF EXISTS "Usuários veem apenas seus devices" ON devices;
CREATE POLICY "Usuários veem apenas seus devices" 
  ON devices FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários criam seus devices" ON devices;
CREATE POLICY "Usuários criam seus devices" 
  ON devices FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários atualizam seus devices" ON devices;
CREATE POLICY "Usuários atualizam seus devices" 
  ON devices FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários deletam seus devices" ON devices;
CREATE POLICY "Usuários deletam seus devices" 
  ON devices FOR DELETE 
  USING (auth.uid() = user_id);

-- Policies para energy_readings
-- Usuários veem leituras dos seus dispositivos
DROP POLICY IF EXISTS "Usuários veem leituras de seus devices" ON energy_readings;
CREATE POLICY "Usuários veem leituras de seus devices" 
  ON energy_readings FOR SELECT 
  USING (
    device_id IN (
      SELECT id::text FROM devices WHERE user_id = auth.uid()
    )
  );

-- Service role pode inserir (para Edge Functions)
DROP POLICY IF EXISTS "Service role insere leituras" ON energy_readings;
CREATE POLICY "Service role insere leituras" 
  ON energy_readings FOR INSERT 
  WITH CHECK (true);  -- Validação será feita na Edge Function

-- Policies para water_readings (similar)
DROP POLICY IF EXISTS "Usuários veem leituras de seus devices" ON water_readings;
CREATE POLICY "Usuários veem leituras de seus devices" 
  ON water_readings FOR SELECT 
  USING (
    device_id IN (
      SELECT id::text FROM devices WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role insere leituras" ON water_readings;
CREATE POLICY "Service role insere leituras" 
  ON water_readings FOR INSERT 
  WITH CHECK (true);

-- Policies para alerts
DROP POLICY IF EXISTS "Usuários veem seus alertas" ON alerts;
CREATE POLICY "Usuários veem seus alertas" 
  ON alerts FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role cria alertas" ON alerts;
CREATE POLICY "Service role cria alertas" 
  ON alerts FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários atualizam seus alertas" ON alerts;
CREATE POLICY "Usuários atualizam seus alertas" 
  ON alerts FOR UPDATE 
  USING (auth.uid() = user_id);

-- Policies para stats tables
DROP POLICY IF EXISTS "Usuários veem stats de seus devices" ON energy_daily_stats;
CREATE POLICY "Usuários veem stats de seus devices" 
  ON energy_daily_stats FOR SELECT 
  USING (
    device_id IN (
      SELECT id FROM devices WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Usuários veem stats de seus devices" ON water_daily_stats;
CREATE POLICY "Usuários veem stats de seus devices" 
  ON water_daily_stats FOR SELECT 
  USING (
    device_id IN (
      SELECT id FROM devices WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- PARTE 10: FUNÇÕES AUXILIARES
-- ============================================================================

-- Função para calcular custo de energia
CREATE OR REPLACE FUNCTION calculate_energy_cost(kwh NUMERIC, tariff NUMERIC DEFAULT 0.75)
RETURNS NUMERIC AS $$
BEGIN
  RETURN ROUND(kwh * tariff, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para calcular consumo de água (diferença entre leituras)
CREATE OR REPLACE FUNCTION calculate_water_consumption(
  prev_volume NUMERIC,
  curr_volume NUMERIC
)
RETURNS NUMERIC AS $$
BEGIN
  IF prev_volume IS NULL THEN
    RETURN 0;
  END IF;
  -- Se volume diminuiu, houve consumo
  IF prev_volume > curr_volume THEN
    RETURN prev_volume - curr_volume;
  END IF;
  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- PARTE 11: TRIGGERS PARA ATUALIZAR ESTATÍSTICAS AUTOMATICAMENTE
-- ============================================================================

-- Função que atualiza estatísticas diárias de energia
CREATE OR REPLACE FUNCTION update_energy_daily_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_device_id UUID;
  v_date DATE;
  v_tariff NUMERIC := 0.75; -- Tarifa padrão em R$/kWh
BEGIN
  v_device_id := NEW.device_id::UUID;
  v_date := NEW.timestamp::DATE;

  WITH day_readings AS (
    SELECT
      power_watts,
      timestamp,
      LEAD(timestamp) OVER (ORDER BY timestamp) AS next_timestamp
    FROM energy_readings
    WHERE device_id = NEW.device_id
      AND timestamp::DATE = v_date
  ),
  aggregated AS (
    SELECT
      AVG(power_watts) AS avg_power_watts,
      MAX(power_watts) AS max_power_watts,
      MIN(power_watts) AS min_power_watts,
      SUM(power_watts * GREATEST(EXTRACT(EPOCH FROM (COALESCE(next_timestamp, timestamp) - timestamp)), 0) / 3600000.0) AS total_kwh,
      COUNT(*) AS reading_count
    FROM day_readings
  )
  INSERT INTO energy_daily_stats (
    device_id,
    date,
    avg_power_watts,
    max_power_watts,
    min_power_watts,
    total_kwh,
    reading_count,
    estimated_cost,
    updated_at
  )
  SELECT
    v_device_id,
    v_date,
    aggregated.avg_power_watts,
    aggregated.max_power_watts,
    aggregated.min_power_watts,
    aggregated.total_kwh,
    aggregated.reading_count,
    calculate_energy_cost(aggregated.total_kwh, v_tariff),
    NOW()
  FROM aggregated
  ON CONFLICT (device_id, date)
  DO UPDATE SET
    avg_power_watts = EXCLUDED.avg_power_watts,
    max_power_watts = EXCLUDED.max_power_watts,
    min_power_watts = EXCLUDED.min_power_watts,
    total_kwh = EXCLUDED.total_kwh,
    reading_count = EXCLUDED.reading_count,
    estimated_cost = EXCLUDED.estimated_cost,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para chamar a função após cada INSERT
DROP TRIGGER IF EXISTS trigger_update_energy_stats ON energy_readings;
CREATE TRIGGER trigger_update_energy_stats
  AFTER INSERT ON energy_readings
  FOR EACH ROW
  EXECUTE FUNCTION update_energy_daily_stats();

-- Função que atualiza estatísticas diárias de água
CREATE OR REPLACE FUNCTION update_water_daily_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_device_id UUID;
  v_date DATE;
  v_max_volume NUMERIC;
  v_min_volume NUMERIC;
BEGIN
  v_device_id := NEW.device_id::UUID;
  v_date := NEW.timestamp::DATE;
  
  -- Calcular estatísticas do dia
  SELECT 
    MAX(volume_liters),
    MIN(volume_liters)
  INTO v_max_volume, v_min_volume
  FROM water_readings
  WHERE device_id = NEW.device_id 
    AND timestamp::DATE = v_date;
  
  -- Inserir ou atualizar
  INSERT INTO water_daily_stats (
    device_id,
    date,
    avg_level_percent,
    max_level_percent,
    min_level_percent,
    avg_volume_liters,
    consumption_liters,
    reading_count,
    updated_at
  )
  SELECT 
    v_device_id,
    v_date,
    AVG(water_level_percent),
    MAX(water_level_percent),
    MIN(water_level_percent),
    AVG(volume_liters),
    v_max_volume - v_min_volume, -- Consumo = diferença entre máx e mín
    COUNT(*),
    NOW()
  FROM water_readings
  WHERE device_id = NEW.device_id 
    AND timestamp::DATE = v_date
  ON CONFLICT (device_id, date)
  DO UPDATE SET
    avg_level_percent = EXCLUDED.avg_level_percent,
    max_level_percent = EXCLUDED.max_level_percent,
    min_level_percent = EXCLUDED.min_level_percent,
    avg_volume_liters = EXCLUDED.avg_volume_liters,
    consumption_liters = EXCLUDED.consumption_liters,
    reading_count = EXCLUDED.reading_count,
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_water_stats ON water_readings;
CREATE TRIGGER trigger_update_water_stats
  AFTER INSERT ON water_readings
  FOR EACH ROW
  EXECUTE FUNCTION update_water_daily_stats();

-- ============================================================================
-- PARTE 12: TRIGGER PARA DETECÇÃO AUTOMÁTICA DE ANOMALIAS
-- ============================================================================

CREATE OR REPLACE FUNCTION detect_anomalies()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_device_name TEXT;
  v_avg_power NUMERIC;
  v_avg_level NUMERIC;
BEGIN
  -- Buscar informações do dispositivo
  SELECT user_id, device_name 
  INTO v_user_id, v_device_name
  FROM devices 
  WHERE id = NEW.device_id::UUID;
  
  -- ENERGIA: Detectar consumo anormal
  IF TG_TABLE_NAME = 'energy_readings' THEN
    -- Calcular média dos últimos 30 dias
    SELECT AVG(avg_power_watts) INTO v_avg_power
    FROM energy_daily_stats
    WHERE device_id = NEW.device_id::UUID
      AND date >= CURRENT_DATE - INTERVAL '30 days';
    
    -- Alerta de consumo alto (>50% acima da média)
    IF NEW.power_watts > (v_avg_power * 1.5) AND v_avg_power IS NOT NULL THEN
      INSERT INTO alerts (
        user_id, device_id, alert_type, message, severity, metadata
      ) VALUES (
        v_user_id,
        NEW.device_id,
        'energy_high',
        format('Consumo alto detectado em %s: %s W (média: %s W)', 
               v_device_name, 
               ROUND(NEW.power_watts, 0), 
               ROUND(v_avg_power, 0)),
        'warning',
        jsonb_build_object(
          'current_power', NEW.power_watts,
          'avg_power', v_avg_power,
          'deviation_percent', ROUND((NEW.power_watts - v_avg_power) / v_avg_power * 100, 1)
        )
      );
    END IF;
    
    -- Alerta crítico (>3000W)
    IF NEW.power_watts > 3000 THEN
      INSERT INTO alerts (
        user_id, device_id, alert_type, message, severity, metadata
      ) VALUES (
        v_user_id,
        NEW.device_id,
        'energy_critical',
        format('ATENÇÃO: Consumo crítico em %s: %s W', 
               v_device_name, 
               ROUND(NEW.power_watts, 0)),
        'critical',
        jsonb_build_object('power_watts', NEW.power_watts)
      );
    END IF;
  END IF;
  
  -- ÁGUA: Detectar nível baixo ou vazamento
  IF TG_TABLE_NAME = 'water_readings' THEN
    -- Alerta de nível baixo
    IF NEW.water_level_percent < 20 THEN
      INSERT INTO alerts (
        user_id, device_id, alert_type, message, severity, metadata
      ) VALUES (
        v_user_id,
        NEW.device_id,
        'water_low',
        format('Nível de água baixo em %s: %s%%', 
               v_device_name, 
               ROUND(NEW.water_level_percent, 1)),
        'warning',
        jsonb_build_object(
          'level_percent', NEW.water_level_percent,
          'volume_liters', NEW.volume_liters
        )
      );
    END IF;
    
    -- Alerta crítico (<10%)
    IF NEW.water_level_percent < 10 THEN
      INSERT INTO alerts (
        user_id, device_id, alert_type, message, severity, metadata
      ) VALUES (
        v_user_id,
        NEW.device_id,
        'water_critical',
        format('CRÍTICO: Reservatório quase vazio em %s: %s%%', 
               v_device_name, 
               ROUND(NEW.water_level_percent, 1)),
        'critical',
        jsonb_build_object(
          'level_percent', NEW.water_level_percent,
          'volume_liters', NEW.volume_liters
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_detect_energy_anomalies ON energy_readings;
CREATE TRIGGER trigger_detect_energy_anomalies
  AFTER INSERT ON energy_readings
  FOR EACH ROW
  EXECUTE FUNCTION detect_anomalies();

DROP TRIGGER IF EXISTS trigger_detect_water_anomalies ON water_readings;
CREATE TRIGGER trigger_detect_water_anomalies
  AFTER INSERT ON water_readings
  FOR EACH ROW
  EXECUTE FUNCTION detect_anomalies();

-- ============================================================================
-- PARTE 13: FUNÇÃO DE LIMPEZA AUTOMÁTICA (CRON)
-- ============================================================================

-- Função para deletar dados antigos (>30 dias)
CREATE OR REPLACE FUNCTION cleanup_old_readings()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  temp_count INTEGER;
BEGIN
  -- Deletar leituras de energia antigas
  DELETE FROM energy_readings 
  WHERE timestamp < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Deletar leituras de água antigas
  DELETE FROM water_readings 
  WHERE timestamp < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Deletar estatísticas diárias antigas (manter 90 dias)
  DELETE FROM energy_daily_stats 
  WHERE date < CURRENT_DATE - INTERVAL '90 days';
  
  DELETE FROM water_daily_stats 
  WHERE date < CURRENT_DATE - INTERVAL '90 days';
  
  -- Deletar alertas resolvidos antigos (manter 30 dias)
  DELETE FROM alerts 
  WHERE is_resolved = true 
    AND resolved_at < NOW() - INTERVAL '30 days';
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Para agendar essa função, use pg_cron (extensão do Supabase):
-- SELECT cron.schedule('cleanup-old-data', '0 2 * * *', 'SELECT cleanup_old_readings()');

-- ============================================================================
-- PARTE 14: VIEWS ÚTEIS
-- ============================================================================

-- View de últimas leituras por dispositivo
CREATE OR REPLACE VIEW latest_energy_readings AS
SELECT DISTINCT ON (device_id)
  e.*,
  d.device_name,
  d.user_id
FROM energy_readings e
JOIN devices d ON d.id::text = e.device_id
WHERE d.is_active = true
ORDER BY device_id, timestamp DESC;

CREATE OR REPLACE VIEW latest_water_readings AS
SELECT DISTINCT ON (device_id)
  w.*,
  d.device_name,
  d.user_id
FROM water_readings w
JOIN devices d ON d.id::text = w.device_id
WHERE d.is_active = true
ORDER BY device_id, timestamp DESC;

-- ============================================================================
-- PARTE 15: FUNÇÃO PARA GERAR API KEY PARA DISPOSITIVO
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_device_api_key(p_device_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_api_key TEXT;
BEGIN
  -- Gerar API key segura (32 caracteres aleatórios)
  v_api_key := 'iot_' || encode(gen_random_bytes(24), 'base64');
  v_api_key := replace(v_api_key, '/', '_');
  v_api_key := replace(v_api_key, '+', '-');
  
  -- Inserir na tabela
  INSERT INTO device_api_keys (device_id, api_key)
  VALUES (p_device_id, v_api_key);
  
  RETURN v_api_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================

-- Para verificar se tudo foi criado corretamente:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;
