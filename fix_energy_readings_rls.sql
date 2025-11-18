-- ============================================================================
-- FIX: Corrigir RLS Policies para energy_readings
-- ============================================================================
-- Execute este SQL no Supabase SQL Editor
-- ============================================================================

-- 1. Remover policy antiga
DROP POLICY IF EXISTS "Usuários veem leituras de seus devices" ON energy_readings;

-- 2. Criar policy corrigida (device_id já é TEXT em energy_readings)
CREATE POLICY "Usuários veem leituras de seus devices" 
  ON energy_readings FOR SELECT 
  USING (
    device_id IN (
      SELECT id::text FROM devices WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 3. Verificar se há leituras na tabela
SELECT 
  COUNT(*) as total_leituras,
  MIN(timestamp) as primeira_leitura,
  MAX(timestamp) as ultima_leitura,
  COUNT(DISTINCT device_id) as total_dispositivos
FROM energy_readings;

-- 4. Verificar leituras do seu dispositivo específico
SELECT 
  id,
  device_id,
  timestamp,
  current_rms,
  voltage,
  power_watts
FROM energy_readings
WHERE device_id = '4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e'
ORDER BY timestamp DESC
LIMIT 20;

-- 5. Verificar se o dispositivo existe e está ativo
SELECT 
  id,
  device_name,
  device_type,
  is_active,
  user_id,
  last_seen
FROM devices
WHERE id = '4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e';

-- 6. Verificar latest_energy_readings view
SELECT * FROM latest_energy_readings
WHERE device_id = '4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e';
