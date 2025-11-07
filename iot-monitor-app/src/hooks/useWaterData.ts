/**
 * Hook para dados de água
 * Gerencia estado e atualizações de dados de água
 */

import { useState, useEffect, useCallback } from 'react'
import { waterService } from '../services/water.service'
import { WaterReading, WaterStats, WaterContainerConfig } from '../types/water.types'
import { APP_CONFIG } from '../constants/config'

export function useWaterData(deviceId: string) {
  const [readings, setReadings] = useState<WaterReading[]>([])
  const [currentReading, setCurrentReading] = useState<WaterReading | null>(null)
  const [stats, setStats] = useState<WaterStats | null>(null)
  const [containerConfig, setContainerConfig] = useState<WaterContainerConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!deviceId) {
      setReadings([])
      setCurrentReading(null)
      setStats(null)
      setContainerConfig(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const config = await waterService.getContainerConfig(deviceId)
      setContainerConfig(config)

      // Carregar leituras
      const readingsData = await waterService.getLatestReadings(deviceId, 50)
      const adjustedReadings = config
        ? readingsData.map((reading: WaterReading) => waterService.applyContainerConfig(reading, config))
        : readingsData

      setReadings(adjustedReadings)

      // Carregar leitura atual
      if (adjustedReadings.length > 0) {
        setCurrentReading(adjustedReadings[0])
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
    containerConfig,
    loading,
    error,
    refresh,
  }
}
