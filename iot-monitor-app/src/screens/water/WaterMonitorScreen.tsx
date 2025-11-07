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
const chartWidth = Math.min(screenWidth - 48, 420)
const chartHeight = 170

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

  const quickFacts = [
    { label: 'Volume atual', value: formatVolume(currentVolumeLiters) },
    { label: 'Restante', value: formatVolume(remainingLiters) },
    { label: 'Capacidade', value: formatVolume(capacityLiters) },
    { label: 'Esvaziar em', value: estimatedEmptyHoursLabel },
  ]

  const configFacts = [
    { label: 'Altura configurada', value: `${formatNumber(tankHeightCm, 0)} cm` },
    { label: 'Raio interno', value: `${formatNumber(tankRadiusCm, 0)} cm` },
    { label: 'Offset do sensor', value: `${formatNumber(sensorOffsetCm, 0)} cm` },
    { label: 'Consumo 24h', value: dailyConsumptionLabel },
    { label: 'Nível médio', value: avgLevelLabel },
  ]

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.headerRow}>
              <View style={styles.headerText}>
                <Paragraph style={styles.headerEyebrow}>Reservatório monitorado</Paragraph>
                <Title style={styles.headerTitle}>{selectedDevice?.device_name ?? 'Reservatório'}</Title>
                <Paragraph style={styles.headerMeta}>Atualizado {lastUpdate}</Paragraph>
              </View>
              <Chip
                icon="water"
                compact
                mode="outlined"
                style={styles.headerChip}
                onPress={() => navigation.navigate('WaterDeviceConfig' as never)}
              >
                Ajustar tanque
              </Chip>
            </View>

            <View style={styles.selectorRow}>
              {devices.map((device) => {
                const isSelected = device.id === selectedDeviceId
                return (
                  <Chip
                    key={device.id}
                    icon={isSelected ? 'check' : 'water-outline'}
                    selected={isSelected}
                    style={[styles.selectorChip, isSelected && styles.selectorChipActive]}
                    textStyle={isSelected ? styles.selectorChipTextActive : styles.selectorChipText}
                    onPress={() => setSelectedDeviceId(device.id)}
                  >
                    {device.device_name || 'Reservatório'}
                  </Chip>
                )
              })}
            </View>

            {usingEnergyFallback && (
              <Paragraph style={styles.headerNotice}>
                Usando calibração de energia. Ajuste altura e raio para leituras reais.
              </Paragraph>
            )}
          </Card.Content>
        </Card>

        <View style={styles.cardRow}>
          <Card style={styles.statusCard}>
            <Card.Content>
              <View style={styles.statusHeader}>
                <Title style={[styles.statusValue, { color: levelColor }]}>{formatPercent(levelPercent)}</Title>
                <View>
                  <Paragraph style={styles.statusLabel}>Nível atual</Paragraph>
                  <Paragraph style={styles.statusMeta}>Capacidade {formatVolume(capacityLiters)}</Paragraph>
                </View>
              </View>
              <ProgressBar
                progress={Math.min(levelPercent / 100, 1)}
                color={levelColor}
                style={styles.statusProgress}
              />
              <View style={styles.factsRow}>
                {quickFacts.map((fact) => (
                  <View key={fact.label} style={styles.factItem}>
                    <Paragraph style={styles.factLabel}>{fact.label}</Paragraph>
                    <Title style={styles.factValue}>{fact.value}</Title>
                  </View>
                ))}
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.chartCard}>
            <Card.Content>
              <View style={styles.chartHeader}>
                <Title style={styles.sectionTitle}>Histórico recente</Title>
                <Paragraph style={styles.chartHint}>Últimas leituras (% ao longo do tempo)</Paragraph>
              </View>
              {historyPoints.length ? (
                <LineChart
                  data={chartData}
                  width={chartWidth}
                  height={chartHeight}
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
                  Ainda não há leituras suficientes para exibir um gráfico.
                </Paragraph>
              )}
            </Card.Content>
          </Card>
        </View>

        <Card style={styles.summaryCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Configuração e tendências</Title>
            <View style={styles.summaryGrid}>
              {configFacts.map((fact) => (
                <View key={fact.label} style={styles.summaryItem}>
                  <Paragraph style={styles.summaryLabel}>{fact.label}</Paragraph>
                  <Title style={styles.summaryValue}>{fact.value}</Title>
                </View>
              ))}
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
  page: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backdrop,
  },
  headerCard: {
    borderRadius: 18,
    backgroundColor: COLORS.backdropMuted,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  headerEyebrow: {
    color: COLORS.white,
    opacity: 0.65,
    fontSize: 12,
    marginBottom: 4,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '700',
  },
  headerMeta: {
    color: COLORS.white,
    opacity: 0.6,
    fontSize: 12,
  },
  headerChip: {
    borderColor: COLORS.water,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  selectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  selectorChip: {
    marginHorizontal: 4,
    marginBottom: 8,
    backgroundColor: COLORS.backdrop,
  },
  selectorChipActive: {
    backgroundColor: COLORS.water,
  },
  selectorChipText: {
    color: COLORS.white,
    opacity: 0.7,
  },
  selectorChipTextActive: {
    color: COLORS.white,
  },
  headerNotice: {
    marginTop: 8,
    color: COLORS.white,
    opacity: 0.7,
    fontSize: 12,
  },
  cardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusCard: {
    flex: 1,
    minWidth: 260,
    borderRadius: 16,
    backgroundColor: COLORS.backdropMuted,
    marginRight: 12,
    marginBottom: 16,
  },
  chartCard: {
    flex: 1,
    minWidth: 260,
    borderRadius: 16,
    backgroundColor: COLORS.backdropMuted,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusValue: {
    fontSize: 46,
    fontWeight: '700',
    color: COLORS.white,
  },
  statusLabel: {
    color: COLORS.white,
    opacity: 0.7,
    fontSize: 12,
    textAlign: 'right',
  },
  statusMeta: {
    color: COLORS.white,
    opacity: 0.6,
    fontSize: 12,
    textAlign: 'right',
  },
  statusProgress: {
    marginVertical: 12,
    height: 8,
    borderRadius: 8,
    backgroundColor: COLORS.backdrop,
  },
  factsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  factItem: {
    width: '48%',
    marginBottom: 12,
  },
  factLabel: {
    color: COLORS.white,
    opacity: 0.6,
    fontSize: 12,
  },
  factValue: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  chartHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  chartHint: {
    color: COLORS.white,
    opacity: 0.6,
    fontSize: 12,
    marginTop: 4,
  },
  chart: {
    marginTop: 4,
    borderRadius: 12,
  },
  emptyHistory: {
    color: COLORS.white,
    opacity: 0.7,
  },
  summaryCard: {
    borderRadius: 16,
    backgroundColor: COLORS.backdropMuted,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    marginBottom: 12,
  },
  summaryLabel: {
    color: COLORS.white,
    opacity: 0.6,
    fontSize: 12,
  },
  summaryValue: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  alertCard: {
    borderRadius: 16,
    backgroundColor: COLORS.error,
    marginBottom: 16,
  },
  alertText: {
    color: COLORS.white,
  },
  refreshButton: {
    alignSelf: 'stretch',
    borderRadius: 12,
  },
})
