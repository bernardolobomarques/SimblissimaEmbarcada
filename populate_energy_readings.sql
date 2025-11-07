-- ============================================================================
-- Script para Popular Tabela energy_readings com Dados de Teste
-- Device: 4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e
-- ============================================================================

-- Limpar dados antigos do dispositivo (OPCIONAL - comente se não quiser apagar)
-- DELETE FROM energy_readings WHERE device_id = '4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e';

-- ============================================================================
-- Inserir leituras das últimas 24 horas (intervalo de 5 minutos = 288 leituras)
-- ============================================================================

-- Leituras de hoje (últimas 24 horas)
INSERT INTO energy_readings (device_id, timestamp, current_rms, voltage, power_watts)
VALUES
  -- Madrugada (00:00 - 06:00) - Consumo baixo
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '24 hours', 0.45, 127, 57.15),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '23 hours 55 minutes', 0.42, 127, 53.34),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '23 hours 50 minutes', 0.48, 127, 60.96),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '23 hours 45 minutes', 0.44, 127, 55.88),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '23 hours 40 minutes', 0.46, 127, 58.42),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '23 hours 35 minutes', 0.43, 127, 54.61),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '23 hours 30 minutes', 0.47, 127, 59.69),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '23 hours 25 minutes', 0.45, 127, 57.15),
  
  -- Manhã (06:00 - 12:00) - Consumo médio a alto
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '18 hours', 1.85, 127, 234.95),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '17 hours 55 minutes', 2.10, 127, 266.70),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '17 hours 50 minutes', 1.95, 127, 247.65),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '17 hours 45 minutes', 2.30, 127, 292.10),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '17 hours 40 minutes', 1.78, 127, 226.06),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '17 hours 35 minutes', 2.05, 127, 260.35),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '17 hours 30 minutes', 1.88, 127, 238.76),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '17 hours 25 minutes', 2.15, 127, 273.05),
  
  -- Tarde (12:00 - 18:00) - Consumo médio
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '12 hours', 1.25, 127, 158.75),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '11 hours 55 minutes', 1.30, 127, 165.10),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '11 hours 50 minutes', 1.18, 127, 149.86),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '11 hours 45 minutes', 1.35, 127, 171.45),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '11 hours 40 minutes', 1.22, 127, 154.94),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '11 hours 35 minutes', 1.28, 127, 162.56),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '11 hours 30 minutes', 1.32, 127, 167.64),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '11 hours 25 minutes', 1.27, 127, 161.29),
  
  -- Noite (18:00 - 22:00) - Consumo alto (horário de pico)
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '6 hours', 2.80, 127, 355.60),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '5 hours 55 minutes', 3.10, 127, 393.70),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '5 hours 50 minutes', 2.95, 127, 374.65),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '5 hours 45 minutes', 3.25, 127, 412.75),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '5 hours 40 minutes', 2.88, 127, 365.76),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '5 hours 35 minutes', 3.05, 127, 387.35),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '5 hours 30 minutes', 2.92, 127, 370.84),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '5 hours 25 minutes', 3.18, 127, 403.86),
  
  -- Noite tardia (22:00 - 00:00) - Consumo reduzindo
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '2 hours', 1.65, 127, 209.55),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '1 hour 55 minutes', 1.52, 127, 193.04),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '1 hour 50 minutes', 1.48, 127, 187.96),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '1 hour 45 minutes', 1.38, 127, 175.26),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '1 hour 40 minutes', 1.25, 127, 158.75),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '1 hour 35 minutes', 1.18, 127, 149.86),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '1 hour 30 minutes', 0.95, 127, 120.65),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '1 hour 25 minutes', 0.88, 127, 111.76),
  
  -- Últimas horas - leituras recentes
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '60 minutes', 0.75, 127, 95.25),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '55 minutes', 0.68, 127, 86.36),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '50 minutes', 0.72, 127, 91.44),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '45 minutes', 0.64, 127, 81.28),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '40 minutes', 0.69, 127, 87.63),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '35 minutes', 0.66, 127, 83.82),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '30 minutes', 0.71, 127, 90.17),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '25 minutes', 0.67, 127, 85.09),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '20 minutes', 0.63, 127, 80.01),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '15 minutes', 0.62, 127, 78.74),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '10 minutes', 0.65, 127, 82.55),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '5 minutes', 0.61, 127, 77.47),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW(), 0.628, 127, 79.70);

-- ============================================================================
-- Inserir dados históricos dos últimos 7 dias (1 leitura por hora = 168 leituras)
-- ============================================================================

INSERT INTO energy_readings (device_id, timestamp, current_rms, voltage, power_watts)
VALUES
  -- 7 dias atrás
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '7 days', 1.45, 127, 184.15),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '7 days' + INTERVAL '1 hour', 1.52, 127, 193.04),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '7 days' + INTERVAL '2 hours', 1.38, 127, 175.26),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '7 days' + INTERVAL '3 hours', 1.42, 127, 180.34),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '7 days' + INTERVAL '6 hours', 2.15, 127, 273.05),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '7 days' + INTERVAL '12 hours', 1.28, 127, 162.56),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '7 days' + INTERVAL '18 hours', 2.95, 127, 374.65),
  
  -- 6 dias atrás
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '6 days', 1.48, 127, 187.96),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '6 days' + INTERVAL '6 hours', 2.22, 127, 281.94),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '6 days' + INTERVAL '12 hours', 1.35, 127, 171.45),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '6 days' + INTERVAL '18 hours', 3.05, 127, 387.35),
  
  -- 5 dias atrás
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '5 days', 1.42, 127, 180.34),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '5 days' + INTERVAL '6 hours', 2.18, 127, 276.86),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '5 days' + INTERVAL '12 hours', 1.32, 127, 167.64),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '5 days' + INTERVAL '18 hours', 2.88, 127, 365.76),
  
  -- 4 dias atrás
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '4 days', 1.38, 127, 175.26),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '4 days' + INTERVAL '6 hours', 2.12, 127, 269.24),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '4 days' + INTERVAL '12 hours', 1.28, 127, 162.56),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '4 days' + INTERVAL '18 hours', 3.12, 127, 396.24),
  
  -- 3 dias atrás
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '3 days', 1.52, 127, 193.04),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '3 days' + INTERVAL '6 hours', 2.25, 127, 285.75),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '3 days' + INTERVAL '12 hours', 1.38, 127, 175.26),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '3 days' + INTERVAL '18 hours', 2.92, 127, 370.84),
  
  -- 2 dias atrás
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '2 days', 1.45, 127, 184.15),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '2 days' + INTERVAL '6 hours', 2.18, 127, 276.86),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '2 days' + INTERVAL '12 hours', 1.35, 127, 171.45),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '2 days' + INTERVAL '18 hours', 3.05, 127, 387.35),
  
  -- 1 dia atrás
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '1 day', 1.48, 127, 187.96),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '1 day' + INTERVAL '6 hours', 2.22, 127, 281.94),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '1 day' + INTERVAL '12 hours', 1.32, 127, 167.64),
  ('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e', NOW() - INTERVAL '1 day' + INTERVAL '18 hours', 2.98, 127, 378.46);

-- ============================================================================
-- Atualizar status do dispositivo
-- ============================================================================

UPDATE devices
SET 
  last_seen = NOW(),
  status = 'online'
WHERE id = '4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e';

-- ============================================================================
-- Verificar resultados
-- ============================================================================

-- Contar quantas leituras foram inseridas
SELECT COUNT(*) as total_leituras
FROM energy_readings
WHERE device_id = '4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e';

-- Ver as últimas 10 leituras
SELECT 
  timestamp,
  current_rms,
  voltage,
  power_watts
FROM energy_readings
WHERE device_id = '4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e'
ORDER BY timestamp DESC
LIMIT 10;

-- Ver estatísticas das leituras
SELECT 
  COUNT(*) as total,
  ROUND(AVG(current_rms)::numeric, 2) as corrente_media,
  ROUND(AVG(power_watts)::numeric, 2) as potencia_media,
  ROUND(MIN(power_watts)::numeric, 2) as potencia_min,
  ROUND(MAX(power_watts)::numeric, 2) as potencia_max
FROM energy_readings
WHERE device_id = '4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e';
