/**
 * Tela de Monitoramento de Água
 * Exibe dados em tempo real do nível de água no reservatório
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, StyleSheet, Dimensions, SafeAreaView } from 'react-native'
import { ActivityIndicator, Button, Card, Chip, Paragraph, ProgressBar, Title } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import { LineChart } from 'react-native-chart-kit'
import { useAuth } from '../../hooks/useAuth'
import { useWaterData } from '../../hooks/useWaterData'
import { useRealtime } from '../../hooks/useRealtime'
import { deviceService } from '../../services/device.service'
import { COLORS, GRADIENTS } from '../../constants/colors'
import { formatNumber, formatPercent, formatRelativeTime, formatVolume, formatTime } from '../../utils/formatters'
import { Device } from '../../types/device.types'
import EmptyState from '../../components/common/EmptyState'

const screenWidth = Dimensions.get('window').width
const GRID_GAP = 12
const availableWidth = screenWidth - 32
const rawGridWidth = (availableWidth - GRID_GAP) / 2
const gridCardWidth = Math.round(Math.min(rawGridWidth, 220))
const chartContentWidth = Math.max(gridCardWidth - 24, 96)

const safeConsole: any = (globalThis as any)?.console

export default function WaterMonitorScreen() {
  const navigation = useNavigation()
  const { user } = useAuth()
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [loadingDevices, setLoadingDevices] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [usingEnergyFallback, setUsingEnergyFallback] = useState(false)

  const {
    readings,
    currentReading,
    containerConfig,
    stats,
    loading,
    error,
    refresh,
  } = useWaterData(selectedDeviceId ?? '')

  const selectedDevice = useMemo(
    () => devices.find((device: Device) => device.id === selectedDeviceId) ?? null,
    [devices, selectedDeviceId]
  )

  useEffect(() => {
    if (!user?.id) {
      return
    }

    const loadDevices = async () => {
      try {
        setLoadingDevices(true)
        const { devices: loadedDevices, usedFallback } = await deviceService.getWaterCapableDevices(user.id)
        setDevices(loadedDevices)
        setUsingEnergyFallback(usedFallback)

        if (!selectedDeviceId && loadedDevices.length > 0) {
          setSelectedDeviceId(loadedDevices[0].id)
        }
      } catch (loadError) {
        safeConsole?.error?.('Erro ao carregar dispositivos de água:', loadError)
      } finally {
        setLoadingDevices(false)
      }
    }

    loadDevices()
  }, [user?.id])

  useRealtime({
    table: 'water_readings',
    event: 'INSERT',
    filter: selectedDeviceId ? `device_id=eq.${selectedDeviceId}` : undefined,
    onInsert: () => {
      refresh()
    },
  })

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }, [refresh])

  const isLoading = loadingDevices || (loading && !currentReading)

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.waterLight} />
      </View>
    )
  }

  if (!devices.length) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <EmptyState
          icon="💧"
          title="Nenhum reservatório configurado"
          message="Cadastre um dispositivo de água e personalize as dimensões do reservatório para ver as leituras."
          actionLabel="Configurar reservatório"
          onAction={() => navigation.navigate('WaterDeviceConfig' as never)}
        />
      </SafeAreaView>
    )
  }

  const levelPercent = currentReading?.water_level_percent ?? 0
  const currentVolumeLiters = currentReading?.volume_liters ?? 0
  const capacityLiters = currentReading?.tank_capacity_liters ?? containerConfig?.capacity_liters ?? 0
  const remainingLiters = Math.max(0, capacityLiters - currentVolumeLiters)
  const lastUpdate = currentReading ? formatRelativeTime(currentReading.timestamp) : '—'
  const levelColor = levelPercent < 10 ? COLORS.critical : levelPercent < 25 ? COLORS.warning : COLORS.success
  const historyPoints = readings.slice(0, 12).reverse()

  const historyValues = historyPoints.map((reading) => reading.water_level_percent)

  const chartData = {
    labels: historyPoints.map((reading) => formatTime(reading.timestamp)),
    datasets: [
      {
        data: historyValues,
        color: () => COLORS.waterLight,
        strokeWidth: 2,
      },
      {
        data: historyValues.length ? Array(historyValues.length).fill(0) : [0],
        color: () => 'rgba(0,0,0,0)',
        withDots: false,
        strokeWidth: 0,
      },
      {
        data: historyValues.length ? Array(historyValues.length).fill(100) : [100],
        color: () => 'rgba(0,0,0,0)',
        withDots: false,
        strokeWidth: 0,
      },
    ],
    legend: ['Nível (%)'],
  }

  const estimatedEmptyHoursLabel = stats
    ? Number.isFinite(stats.estimated_empty_hours)
      ? `${stats.estimated_empty_hours.toFixed(1)} h`
      : 'Indeterminado'
    : '—'

  const tankHeightCm = containerConfig?.height_cm ?? currentReading?.tank_height_cm ?? 0
  const tankRadiusCm = containerConfig?.radius_cm ?? currentReading?.tank_radius_cm ?? 0
  const sensorOffsetCm = containerConfig?.sensor_offset_cm ?? currentReading?.sensor_offset_cm ?? 0
  const dailyConsumptionLabel =
    stats && Number.isFinite(stats.daily_consumption) ? formatVolume(stats.daily_consumption) : '—'
  const avgLevelLabel =
    stats && Number.isFinite(stats.avg_level) ? formatPercent(stats.avg_level) : '—'

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.wrapper}>
        <View style={styles.content}>
          <Card style={styles.heroCard}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.heroHeader}>
                <View style={styles.deviceInfo}>
                  <Paragraph style={styles.heroSubtitle}>Reservatório monitorado</Paragraph>
                  <Title style={styles.heroTitle}>{selectedDevice?.device_name ?? 'Reservatório'}</Title>
                  <Paragraph style={styles.heroHint}>Atualizado {lastUpdate}</Paragraph>
                </View>
                <Chip
                  icon="water"
                  style={styles.heroChip}
                  textStyle={styles.heroChipText}
                  compact
                  onPress={() => navigation.navigate('WaterDeviceConfig' as never)}
                >
                  Ajustar tanque
                </Chip>
              </View>

              <View style={styles.deviceChipWrap}>
                {devices.map((device) => {
                  const isSelected = device.id === selectedDeviceId
                  return (
                    <Chip
                      key={device.id}
                      icon={isSelected ? 'check' : 'water-outline'}
                      selected={isSelected}
                      style={[styles.deviceChip, isSelected && styles.deviceChipSelected]}
                      textStyle={styles.deviceChipText}
                      onPress={() => setSelectedDeviceId(device.id)}
                    >
                      {device.device_name || 'Reservatório'}
                    </Chip>
                  )
                })}
              </View>

              <View style={styles.heroStatsRow}>
                <View style={styles.heroStat}>
                  <Paragraph style={styles.heroLabel}>Nível atual</Paragraph>
                  <Title style={[styles.heroValue, { color: levelColor }]}>{formatPercent(levelPercent)}</Title>
                </View>
                <View style={[styles.heroStat, styles.heroStatRight]}>
                  <Paragraph style={styles.heroLabel}>Volume disponível</Paragraph>
                  <Title style={styles.heroValue}>{formatVolume(currentVolumeLiters)}</Title>
                  <Paragraph style={styles.heroHint}>Restante {formatVolume(remainingLiters)}</Paragraph>
                </View>
              </View>

              {usingEnergyFallback && (
                <Paragraph style={styles.fallbackNotice}>
                  Usando o dispositivo de energia como base. Ajuste altura e raio para leituras precisas.
                </Paragraph>
              )}
            </Card.Content>
          </Card>

          <View style={styles.gridRow}>
            <Card style={[styles.gridCard, styles.tankCard, { width: gridCardWidth }]}> 
              <Card.Content style={styles.cardContent}>
                <Title style={styles.sectionTitle}>Visualização</Title>
                <View style={styles.tankContainer}>
                  <View style={styles.tankBody}>
                    <View
                      style={[
                        styles.waterFill,
                        {
                          height: `${Math.max(0, Math.min(levelPercent, 100))}%`,
                          backgroundColor: levelColor,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.tankStats}>
                    <Title style={[styles.tankLevel, { color: levelColor }]}>{formatPercent(levelPercent)}</Title>
                    <Paragraph style={styles.tankVolume}>
                      {formatVolume(currentVolumeLiters)} de {formatVolume(capacityLiters)}
                    </Paragraph>
                  </View>
                </View>
                <ProgressBar
                  progress={Math.min(levelPercent / 100, 1)}
                  color={levelColor}
                  style={styles.progressBar}
                />
              </Card.Content>
            </Card>

            <Card style={[styles.gridCard, { width: gridCardWidth }]}> 
              <Card.Content style={styles.cardContent}>
                <Title style={styles.sectionTitle}>Histórico recente</Title>
                {historyPoints.length ? (
                  <LineChart
                    data={chartData}
                    width={chartContentWidth}
                    height={140}
                    withInnerLines={false}
                    bezier
                    fromZero
                    segments={4}
                    yAxisSuffix="%"
                    style={styles.chart}
                    chartConfig={{
                      backgroundGradientFrom: GRADIENTS.water[0],
                      backgroundGradientTo: GRADIENTS.water[1],
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.8})`,
                      style: {
                        borderRadius: 12,
                      },
                      propsForDots: {
                        r: '3',
                        strokeWidth: '1',
                        stroke: COLORS.white,
                      },
                    }}
                  />
                ) : (
                  <Paragraph style={styles.emptyHistory}>
                    Ainda não há leituras suficientes para plotar o gráfico.
                  </Paragraph>
                )}
              </Card.Content>
            </Card>
          </View>

          <Card style={styles.summaryCard}>
            <Card.Content style={styles.cardContent}>
              <Title style={styles.sectionTitle}>Configuração e uso</Title>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Paragraph style={styles.summaryLabel}>Altura configurada</Paragraph>
                  <Title style={styles.summaryValue}>{formatNumber(tankHeightCm, 0)} cm</Title>
                </View>
                <View style={styles.summaryItem}>
                  <Paragraph style={styles.summaryLabel}>Raio interno</Paragraph>
                  <Title style={styles.summaryValue}>{formatNumber(tankRadiusCm, 0)} cm</Title>
                </View>
                <View style={styles.summaryItem}>
                  <Paragraph style={styles.summaryLabel}>Offset do sensor</Paragraph>
                  <Title style={styles.summaryValue}>{formatNumber(sensorOffsetCm, 0)} cm</Title>
                </View>
                <View style={styles.summaryItem}>
                  <Paragraph style={styles.summaryLabel}>Capacidade útil</Paragraph>
                  <Title style={styles.summaryValue}>{formatVolume(capacityLiters)}</Title>
                </View>
                <View style={styles.summaryItem}>
                  <Paragraph style={styles.summaryLabel}>Consumo 24h</Paragraph>
                  <Title style={styles.summaryValue}>{dailyConsumptionLabel}</Title>
                </View>
                <View style={styles.summaryItem}>
                  <Paragraph style={styles.summaryLabel}>Nível médio</Paragraph>
                  <Title style={styles.summaryValue}>{avgLevelLabel}</Title>
                </View>
                <View style={styles.summaryItem}>
                  <Paragraph style={styles.summaryLabel}>Tempo até esvaziar</Paragraph>
                  <Title style={styles.summaryValue}>{estimatedEmptyHoursLabel}</Title>
                </View>
              </View>
            </Card.Content>
          </Card>

          {error && (
            <Card style={styles.alertCard}>
              <Card.Content>
                <Paragraph style={styles.alertText}>Erro ao carregar leituras: {error}</Paragraph>
              </Card.Content>
            </Card>
          )}
        </View>

        <Button
          mode="contained"
          icon="refresh"
          onPress={handleRefresh}
          loading={refreshing}
          style={styles.refreshButton}
        >
          Atualizar leituras
        </Button>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.backdrop,
  },
  wrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backdrop,
  },
  heroCard: {
    borderRadius: 18,
    backgroundColor: COLORS.backdropMuted,
    marginBottom: 12,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  heroSubtitle: {
    color: COLORS.white,
    opacity: 0.7,
    fontSize: 13,
    marginBottom: 2,
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '700',
  },
  heroHint: {
    color: COLORS.white,
    opacity: 0.6,
    marginTop: 4,
    fontSize: 12,
  },
  heroChip: {
    backgroundColor: COLORS.water,
  },
  heroChipText: {
    color: COLORS.white,
  },
  deviceChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  deviceChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: COLORS.backdrop,
  },
  deviceChipSelected: {
    backgroundColor: COLORS.water,
  },
  deviceChipText: {
    color: COLORS.white,
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  heroStat: {
    flex: 1,
    marginRight: 12,
  },
  heroStatRight: {
    marginRight: 0,
  },
  heroLabel: {
    color: COLORS.white,
    opacity: 0.7,
    fontSize: 12,
    marginBottom: 4,
  },
  heroValue: {
    color: COLORS.white,
    fontSize: 26,
    fontWeight: '700',
  },
  fallbackNotice: {
    color: COLORS.white,
    opacity: 0.7,
    marginTop: 12,
    fontSize: 12,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  gridCard: {
    borderRadius: 16,
    backgroundColor: COLORS.backdropMuted,
    overflow: 'hidden',
    marginBottom: 12,
  },
  cardContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  tankCard: {
    marginRight: GRID_GAP,
  },
  summaryCard: {
    borderRadius: 16,
    backgroundColor: COLORS.backdropMuted,
    marginBottom: 12,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 16,
    marginBottom: 12,
  },
  tankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tankBody: {
    width: 100,
    height: 130,
    borderWidth: 3,
    borderColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: COLORS.backdrop,
  },
  waterFill: {
    width: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  tankStats: {
    flex: 1,
    marginLeft: 16,
  },
  tankLevel: {
    fontSize: 42,
    fontWeight: '700',
    color: COLORS.white,
  },
  tankVolume: {
    color: COLORS.white,
    opacity: 0.7,
  },
  progressBar: {
    height: 8,
    borderRadius: 8,
    backgroundColor: COLORS.backdrop,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '30%',
    minWidth: 96,
    marginBottom: 10,
  },
  summaryLabel: {
    color: COLORS.white,
    opacity: 0.6,
    fontSize: 12,
  },
  summaryValue: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  chart: {
    marginTop: 4,
    borderRadius: 12,
  },
  emptyHistory: {
    color: COLORS.white,
    opacity: 0.7,
  },
  alertCard: {
    borderRadius: 16,
    backgroundColor: COLORS.error,
    marginBottom: 12,
  },
  alertText: {
    color: COLORS.white,
  },
  refreshButton: {
    borderRadius: 12,
    marginTop: 4,
  },
})
