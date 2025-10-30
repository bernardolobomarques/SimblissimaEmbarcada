/**
 * Types para monitoramento de água
 * Baseado no sistema ESP32 + sensor ultrassônico HC-SR04
 */

export interface WaterReading {
  id: number
  device_id: string
  timestamp: string
  distance_cm: number // Distância medida pelo sensor em centímetros
  water_level_percent: number // Nível de água em porcentagem
  volume_liters: number // Volume de água em litros
  tank_height_cm: number // Altura total do tanque em centímetros
  tank_capacity_liters: number // Capacidade total do tanque em litros
}

export interface WaterStats {
  current_level: number // Nível atual em porcentagem
  current_volume: number // Volume atual em litros
  daily_consumption: number // Consumo diário em litros
  avg_level: number // Nível médio em porcentagem
  estimated_empty_hours: number // Horas estimadas até esvaziar
}

// Novo: Estatísticas diárias agregadas
export interface WaterDailyStats {
  id: number
  device_id: string
  date: string // YYYY-MM-DD
  avg_level_percent: number
  max_level_percent: number
  min_level_percent: number
  avg_volume_liters: number
  consumption_liters: number // Consumo do dia (max - min)
  reading_count: number
  created_at: string
  updated_at: string
}

export interface WaterDevice {
  device_id: string
  device_name: string
  location?: string
  tank_height_cm: number
  tank_capacity_liters: number
  sensor_height_cm: number // Altura onde o sensor está instalado
  is_online: boolean
  last_reading?: WaterReading
}

export interface WaterAlert {
  type: 'low' | 'critical' | 'full' | 'leak' | 'normal'
  message: string
  level_percent: number
  timestamp: string
}

export interface TankDimensions {
  height_cm: number
  diameter_cm?: number
  width_cm?: number
  length_cm?: number
  capacity_liters: number
}

export interface ConsumptionRate {
  rate_liters_per_hour: number
  timestamp: string
  estimated_empty_time?: string
}

