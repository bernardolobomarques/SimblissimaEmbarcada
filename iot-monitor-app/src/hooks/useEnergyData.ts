/**
 * Hook para dados de energia
 * Gerencia estado e atualizações de dados de energia
 */

import { useState, useEffect, useCallback } from 'react'
import { energyService } from '../services/energy.service'
import { EnergyReading, EnergyStats } from '../types/energy.types'
import { APP_CONFIG } from '../constants/config'

export function useEnergyData(deviceId: string) {
  const [readings, setReadings] = useState<EnergyReading[]>([])
  const [currentReading, setCurrentReading] = useState<EnergyReading | null>(null)
  const [stats, setStats] = useState<EnergyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Carregar leituras
      const readingsData = await energyService.getLatestReadings(deviceId, 50)
      setReadings(readingsData)

      // Carregar leitura atual
      if (readingsData.length > 0) {
        setCurrentReading(readingsData[0])
      }

      // Carregar estatísticas diárias
      const statsData = await energyService.getDailyConsumption(deviceId)
      setStats(statsData)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados de energia')
    } finally {
      setLoading(false)
    }
  }, [deviceId])

  useEffect(() => {
    loadData()

    // Auto-refresh
    const interval = setInterval(loadData, APP_CONFIG.dataRefreshInterval)

    return () => clearInterval(interval)
  }, [loadData])

  const refresh = useCallback(() => {
    loadData()
  }, [loadData])

  return {
    readings,
    currentReading,
    stats,
    loading,
    error,
    refresh,
  }
}
