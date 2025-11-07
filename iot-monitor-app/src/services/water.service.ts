/**
 * Serviço de monitoramento de água
 * Gerencia leituras do sensor HC-SR04 e cálculos de nível/volume
 */

import { supabase } from './supabase'
import { WaterReading, WaterStats, ConsumptionRate, WaterContainerConfig } from '../types/water.types'
import { calculateWaterLevel, calculateCylindricalCapacityLiters, calculateCylindricalVolumeFromHeight } from '../utils/calculations'

export const waterService = {
  /**
   * Busca últimas leituras de água
   */
  async getLatestReadings(deviceId: string, limit: number = 50): Promise<WaterReading[]> {
    const { data, error } = await supabase
      .from('water_readings')
      .select('*')
      .eq('device_id', deviceId)
      .order('timestamp', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Erro ao buscar leituras de água:', error)
      return []
    }
    
    return data || []
  },

  async getContainerConfig(deviceId: string): Promise<WaterContainerConfig | null> {
    const { data, error } = await supabase
      .from('devices')
      .select('water_tank_height_cm, water_tank_radius_cm, water_sensor_offset_cm, water_tank_capacity_liters, updated_at')
      .eq('id', deviceId)
      .maybeSingle()

    if (error) {
      console.error('Erro ao carregar configuração do reservatório:', error)
      return null
    }

    if (!data || data.water_tank_height_cm == null || data.water_tank_radius_cm == null) {
      return null
    }

    const height = Number(data.water_tank_height_cm)
    const radius = Number(data.water_tank_radius_cm)
    const sensorOffset = Number(data.water_sensor_offset_cm ?? 0)
    const capacity = Number(
      data.water_tank_capacity_liters ?? calculateCylindricalCapacityLiters(radius, height)
    )

    return {
      height_cm: height,
      radius_cm: radius,
      sensor_offset_cm: sensorOffset,
      capacity_liters: capacity,
      updated_at: data.updated_at,
    }
  },

  /**
   * Busca leitura mais recente
   */
  async getCurrentReading(deviceId: string): Promise<WaterReading | null> {
    const { data, error } = await supabase
      .from('water_readings')
      .select('*')
      .eq('device_id', deviceId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()
    
    if (error) {
      console.error('Erro ao buscar leitura atual:', error)
      return null
    }
    
    return data
  },

  /**
   * Calcula estatísticas de água para um período
   */
  async getWaterStats(
    deviceId: string,
    startTime: string,
    endTime: string
  ): Promise<WaterStats | null> {
    const readings = await this.getLatestReadings(deviceId, 100)
    
    if (readings.length === 0) {
      return null
    }

    const currentReading = readings[0]
    const periodReadings = readings.filter(r => {
      const timestamp = new Date(r.timestamp).getTime()
      return timestamp >= new Date(startTime).getTime() && 
             timestamp <= new Date(endTime).getTime()
    })

    // Calcular consumo diário (diferença entre primeira e última leitura do período)
    const dailyConsumption = periodReadings.length > 1
      ? periodReadings[periodReadings.length - 1].volume_liters - periodReadings[0].volume_liters
      : 0

    // Calcular nível médio
    const avgLevel = periodReadings.reduce((sum, r) => sum + r.water_level_percent, 0) / 
                     (periodReadings.length || 1)

    // Estimar horas até esvaziar (baseado na taxa de consumo)
    const consumptionRate = this.calculateConsumptionRate(readings)
    const estimatedEmptyHours = consumptionRate > 0
      ? currentReading.volume_liters / consumptionRate
      : 0

    return {
      current_level: currentReading.water_level_percent,
      current_volume: currentReading.volume_liters,
      daily_consumption: Math.abs(dailyConsumption),
      avg_level: avgLevel,
      estimated_empty_hours: estimatedEmptyHours,
    }
  },

  /**
   * Calcula taxa de consumo em litros/hora
   */
  calculateConsumptionRate(readings: WaterReading[]): number {
    if (readings.length < 2) return 0

    const latest = readings[0]
    const previous = readings[1]
    
    const volumeDiff = previous.volume_liters - latest.volume_liters
    const timeDiff = new Date(latest.timestamp).getTime() - 
                     new Date(previous.timestamp).getTime()
    const hoursDiff = timeDiff / (1000 * 60 * 60)
    
    return hoursDiff > 0 ? volumeDiff / hoursDiff : 0
  },

  /**
   * Busca estatísticas diárias
   */
  async getDailyStats(deviceId: string): Promise<WaterStats | null> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return this.getWaterStats(
      deviceId,
      today.toISOString(),
      new Date().toISOString()
    )
  },

  /**
   * Busca histórico de nível para gráficos
   */
  async getLevelHistory(
    deviceId: string,
    hours: number = 24
  ): Promise<{ timestamp: string; level: number; volume: number }[]> {
    const startTime = new Date()
    startTime.setHours(startTime.getHours() - hours)

    const readings = await this.getLatestReadings(deviceId, 200)
    
    return readings
      .filter(r => new Date(r.timestamp) >= startTime)
      .map(r => ({
        timestamp: r.timestamp,
        level: r.water_level_percent,
        volume: r.volume_liters,
      }))
      .reverse()
  },

  /**
   * Insere nova leitura de água (para testes)
   */
  async insertReading(reading: Omit<WaterReading, 'id' | 'timestamp'>): Promise<WaterReading | null> {
    const { data, error } = await supabase
      .from('water_readings')
      .insert({
        ...reading,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao inserir leitura:', error)
      return null
    }

    return data
  },

  applyContainerConfig(reading: WaterReading, config: WaterContainerConfig): WaterReading {
    const effectiveHeight = config.height_cm
    const sensorOffset = config.sensor_offset_cm

    const levelPercent = calculateWaterLevel(reading.distance_cm, effectiveHeight, sensorOffset)
    const waterHeight = Math.max(0, effectiveHeight - sensorOffset - reading.distance_cm)
    const recalculatedVolume = calculateCylindricalVolumeFromHeight(config.radius_cm, waterHeight)
    const capacity = calculateCylindricalCapacityLiters(config.radius_cm, effectiveHeight)

    return {
      ...reading,
      water_level_percent: levelPercent,
      volume_liters: recalculatedVolume,
      tank_height_cm: effectiveHeight,
      tank_capacity_liters: capacity,
      tank_radius_cm: config.radius_cm,
      sensor_offset_cm: sensorOffset,
      computed_with_device_profile: true,
    }
  },
}
