/**
 * Serviço de monitoramento de água
 * Gerencia leituras do sensor HC-SR04 e cálculos de nível/volume
 */

import { supabase } from './supabase'
import { WaterReading, WaterStats, ConsumptionRate } from '../types/water.types'

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
}
