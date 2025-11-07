/**
 * Tela de resumo pensada para visualização rápida em navegadores (Expo Web)
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Platform, SafeAreaView, StyleSheet, View } from 'react-native'
import { ActivityIndicator, Button, Card, Paragraph, Title } from 'react-native-paper'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../services/supabase'
import { COLORS } from '../../constants/colors'
import { formatPercent, formatPower, formatRelativeTime, formatVolume } from '../../utils/formatters'

interface SummaryState {
  energyPower: number | null
  energyTimestamp: string | null
  waterLevelPercent: number | null
  waterVolumeLiters: number | null
  waterCapacityLiters: number | null
  waterTimestamp: string | null
  devicesOnline: {
    energy: number
    water: number
  }
}

const initialState: SummaryState = {
  energyPower: null,
  energyTimestamp: null,
  waterLevelPercent: null,
  waterVolumeLiters: null,
  waterCapacityLiters: null,
  waterTimestamp: null,
  devicesOnline: {
    energy: 0,
    water: 0,
  },
}

export default function SummaryWebScreen() {
  const { user } = useAuth()
  const [state, setState] = useState<SummaryState>(initialState)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lastUpdatedLabel = useMemo(() => {
    if (!state.energyTimestamp && !state.waterTimestamp) {
      return '—'
    }

    const latest = [state.energyTimestamp, state.waterTimestamp]
      .filter((timestamp): timestamp is string => Boolean(timestamp))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]

    return latest ? formatRelativeTime(latest) : '—'
  }, [state.energyTimestamp, state.waterTimestamp])

  const loadData = useCallback(async (showSpinner: boolean = true) => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      if (showSpinner) {
        setLoading(true)
      }

      const [energyResult, waterResult, devicesResult] = await Promise.all([
        supabase
          .from('energy_readings')
          .select('power_watts, timestamp')
          .order('timestamp', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('water_readings')
          .select('water_level_percent, volume_liters, tank_capacity_liters, timestamp')
          .order('timestamp', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('devices')
          .select('device_type')
          .eq('is_active', true)
          .eq('user_id', user.id),
      ])

      if (energyResult.error) {
        throw new Error(energyResult.error.message)
      }

      if (waterResult.error) {
        throw new Error(waterResult.error.message)
      }

      if (devicesResult.error) {
        throw new Error(devicesResult.error.message)
      }

      const devices = devicesResult.data ?? []
      const energyDevices = devices.filter((device) => device.device_type === 'energy').length
      const waterDevices = devices.filter((device) => device.device_type === 'water').length

      setState({
        energyPower: energyResult.data?.power_watts ?? null,
        energyTimestamp: energyResult.data?.timestamp ?? null,
        waterLevelPercent: waterResult.data?.water_level_percent ?? null,
        waterVolumeLiters: waterResult.data?.volume_liters ?? null,
        waterCapacityLiters: waterResult.data?.tank_capacity_liters ?? null,
        waterTimestamp: waterResult.data?.timestamp ?? null,
        devicesOnline: {
          energy: energyDevices,
          water: waterDevices,
        },
      })
    } catch (loadError) {
      console.error('Erro ao carregar resumo web:', loadError)
      setError(loadError instanceof Error ? loadError.message : 'Erro inesperado ao carregar dados')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRefresh = () => {
    setRefreshing(true)
    loadData(false)
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <Paragraph style={styles.infoText}>Faça login para visualizar os dados resumidos.</Paragraph>
        </View>
      </SafeAreaView>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Paragraph style={styles.infoText}>Carregando dados mais recentes...</Paragraph>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerArea}>
          <View>
            <Title style={styles.pageTitle}>Resumo em tempo real</Title>
            <Paragraph style={styles.subtitle}>Atualizado {lastUpdatedLabel}</Paragraph>
          </View>
          <Button
            mode="contained"
            icon="refresh"
            compact
            onPress={handleRefresh}
            loading={refreshing}
          >
            Atualizar
          </Button>
        </View>

        {error && (
          <Card style={styles.errorCard}>
            <Card.Content>
              <Paragraph style={styles.errorText}>Não foi possível carregar todas as informações: {error}</Paragraph>
              <Button mode="text" onPress={handleRefresh}>Tentar novamente</Button>
            </Card.Content>
          </Card>
        )}

        <View style={styles.cardsWrapper}>
          <Card style={[styles.metricCard, styles.energyCard]}>
            <Card.Content>
              <Paragraph style={styles.metricLabel}>Energia - Potência instantânea</Paragraph>
              <Title style={styles.metricValue}>{state.energyPower != null ? formatPower(state.energyPower) : 'Sem dados'}</Title>
              <Paragraph style={styles.metricHint}>
                Atualizado {state.energyTimestamp ? formatRelativeTime(state.energyTimestamp) : 'nunca'}
              </Paragraph>
              <Paragraph style={styles.metricSecondary}>
                Dispositivos ativos: {state.devicesOnline.energy}
              </Paragraph>
            </Card.Content>
          </Card>

          <Card style={[styles.metricCard, styles.waterCard]}>
            <Card.Content>
              <Paragraph style={styles.metricLabel}>Água - Nível do reservatório</Paragraph>
              <Title style={styles.metricValue}>
                {state.waterLevelPercent != null ? formatPercent(state.waterLevelPercent) : 'Sem dados'}
              </Title>
              <Paragraph style={styles.metricHint}>
                Volume: {state.waterVolumeLiters != null ? formatVolume(state.waterVolumeLiters) : '—'}
                {state.waterCapacityLiters ? ` de ${formatVolume(state.waterCapacityLiters)}` : ''}
              </Paragraph>
              <Paragraph style={styles.metricSecondary}>
                Atualizado {state.waterTimestamp ? formatRelativeTime(state.waterTimestamp) : 'nunca'}
              </Paragraph>
            </Card.Content>
          </Card>
        </View>

        <Card style={styles.footerCard}>
          <Card.Content>
            <Paragraph style={styles.footerText}>
              Este painel foi otimizado para capturas de tela do artigo: números atualizados, visual limpo e contraste alto.
            </Paragraph>
          </Card.Content>
        </Card>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: Platform.OS === 'web' ? 32 : 16,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  infoText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  headerArea: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: Platform.OS === 'web' ? 28 : 22,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  cardsWrapper: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    elevation: 2,
    backgroundColor: COLORS.white,
  },
  energyCard: {
    marginRight: Platform.OS === 'web' ? 12 : 0,
    marginBottom: Platform.OS === 'web' ? 0 : 12,
    borderTopWidth: 4,
    borderTopColor: COLORS.secondary,
  },
  waterCard: {
    borderTopWidth: 4,
    borderTopColor: COLORS.water,
    marginBottom: Platform.OS === 'web' ? 0 : 12,
  },
  metricLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  metricValue: {
    fontSize: Platform.OS === 'web' ? 40 : 32,
    fontWeight: '700',
    marginVertical: 8,
    color: COLORS.textPrimary,
  },
  metricHint: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  metricSecondary: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.gray,
  },
  errorCard: {
    borderRadius: 14,
    backgroundColor: COLORS.surfaceMuted,
  },
  errorText: {
    color: COLORS.error,
    marginBottom: 8,
  },
  footerCard: {
    borderRadius: 14,
    backgroundColor: COLORS.white,
  },
  footerText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
})
