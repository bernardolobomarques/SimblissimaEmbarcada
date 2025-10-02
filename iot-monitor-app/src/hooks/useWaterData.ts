/**
 * Hook para dados de água
 * Gerencia estado e atualizações de dados de água
 */

import { useState, useEffect, useCallback } from 'react'
import { waterService } from '../services/water.service'
import { WaterReading, WaterStats } from '../types/water.types'
import { APP_CONFIG } from '../constants/config'

export function useWaterData(deviceId: string) {
  const [readings, setReadings] = useState<WaterReading[]>([])
  const [currentReading, setCurrentReading] = useState<WaterReading | null>(null)
  const [stats, setStats] = useState<WaterStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Carregar leituras
      const readingsData = await waterService.getLatestReadings(deviceId, 50)
      setReadings(readingsData)

      // Carregar leitura atual
      if (readingsData.length > 0) {
        setCurrentReading(readingsData[0])
      }

      // Carregar estatísticas diárias
      const statsData = await waterService.getDailyStats(deviceId)
      setStats(statsData)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados de água')
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
