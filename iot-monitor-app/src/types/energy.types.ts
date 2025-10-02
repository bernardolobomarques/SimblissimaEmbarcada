/**
 * Types para monitoramento de energia
 * Baseado no sistema ESP8266 + sensor ACS712
 */

export interface EnergyReading {
  id: number
  device_id: string
  timestamp: string
  current_rms: number // Corrente RMS em Amperes
  voltage: number // Tensão em Volts (geralmente 127V ou 220V)
  power_watts: number // Potência em Watts
  energy_kwh?: number // Energia consumida em kWh (opcional)
  appliance_name?: string // Nome do aparelho (opcional)
}

export interface EnergyStats {
  total_kwh: number // Total de energia consumida em kWh
  avg_power_watts: number // Potência média em Watts
  max_power_watts: number // Potência máxima em Watts
  reading_count: number // Número de leituras
  estimated_cost: number // Custo estimado em R$
}

export interface EnergyDevice {
  device_id: string
  device_name: string
  location?: string
  voltage_nominal: number // Tensão nominal (127V ou 220V)
  max_current: number // Corrente máxima suportada
  is_online: boolean
  last_reading?: EnergyReading
}

export interface EnergyAlert {
  type: 'high' | 'critical' | 'spike' | 'normal'
  message: string
  power_watts: number
  timestamp: string
}

export interface ChartDataPoint {
  timestamp: string
  value: number
  label?: string
}
