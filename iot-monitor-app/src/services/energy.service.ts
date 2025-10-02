/**
 * Serviço de monitoramento de energia
 * Gerencia leituras do sensor ACS712 e cálculos de consumo
 */

import { supabase } from './supabase'
import { EnergyReading, EnergyStats } from '../types/energy.types'
import { APP_CONFIG } from '../constants/config'

export const energyService = {
  /**
   * Busca últimas leituras de energia
   */
  async getLatestReadings(deviceId: string, limit: number = 50): Promise<EnergyReading[]> {
    const { data, error } = await supabase
      .from('energy_readings')
      .select('*')
      .eq('device_id', deviceId)
      .order('timestamp', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Erro ao buscar leituras de energia:', error)
      return []
    }
    
    return data || []
  },

  /**
   * Busca leitura mais recente
   */
  async getCurrentReading(deviceId: string): Promise<EnergyReading | null> {
    const { data, error } = await supabase
      .from('energy_readings')
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
   * Calcula estatísticas de consumo para um período
   */
  async getEnergyStats(
    deviceId: string,
    startTime: string,
    endTime: string
  ): Promise<EnergyStats | null> {
    const { data, error } = await supabase.rpc(
      'calculate_energy_consumption',
      {
        device_id_param: deviceId,
        start_time: startTime,
        end_time: endTime,
      }
    )

    if (error) {
      console.error('Erro ao calcular estatísticas:', error)
      return null
    }

    if (data && data.length > 0) {
      const stats = data[0]
      return {
        total_kwh: stats.total_kwh || 0,
        avg_power_watts: stats.avg_power_watts || 0,
        max_power_watts: stats.max_power_watts || 0,
        reading_count: stats.reading_count || 0,
        estimated_cost: (stats.total_kwh || 0) * APP_CONFIG.energyTariffPerKWh,
      }
    }

    return null
  },

  /**
   * Busca consumo diário
   */
  async getDailyConsumption(deviceId: string): Promise<EnergyStats | null> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return this.getEnergyStats(
      deviceId,
      today.toISOString(),
      new Date().toISOString()
    )
  },

  /**
   * Busca histórico de consumo para gráficos
   */
  async getConsumptionHistory(
    deviceId: string,
    days: number = 7
  ): Promise<{ date: string; kwh: number; cost: number }[]> {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase.rpc(
      'get_daily_energy_consumption',
      {
        device_id_param: deviceId,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      }
    )

    if (error) {
      console.error('Erro ao buscar histórico:', error)
      return []
    }

    return (data || []).map((item: any) => ({
      date: item.date,
      kwh: item.total_kwh,
      cost: item.total_kwh * APP_CONFIG.energyTariffPerKWh,
    }))
  },

  /**
   * Insere nova leitura de energia (para testes)
   */
  async insertReading(reading: Omit<EnergyReading, 'id' | 'timestamp'>): Promise<EnergyReading | null> {
    const { data, error } = await supabase
      .from('energy_readings')
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
