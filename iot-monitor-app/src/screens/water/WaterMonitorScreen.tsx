/**
 * Tela de Monitoramento de Água
 * Exibe dados em tempo real do nível de água no reservatório
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, ScrollView, StyleSheet, Dimensions, RefreshControl, SafeAreaView } from 'react-native'
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

  const chartData = {
    labels: historyPoints.map((reading) => formatTime(reading.timestamp)),
    datasets: [
      {
        data: historyPoints.map((reading) => reading.water_level_percent),
        color: () => COLORS.waterLight,
        strokeWidth: 2,
      },
    ],
    legend: ['Nível (%)'],
  }

  const estimatedEmptyHoursLabel = stats
    ? Number.isFinite(stats.estimated_empty_hours)
      ? `${stats.estimated_empty_hours.toFixed(1)} h`
      : 'Indeterminado'
    : '—'

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.white} />}>
        <Card style={styles.heroCard}>
          <Card.Content>
            <View style={styles.heroHeader}>
              <View style={styles.deviceInfo}>
                <Paragraph style={styles.heroSubtitle}>Reservatório monitorado</Paragraph>
                <Title style={styles.heroTitle}>{selectedDevice?.device_name ?? 'Reservatório'}</Title>
              </View>
              <Chip
                icon="water"
                style={styles.heroChip}
                textStyle={styles.heroChipText}
                onPress={() => navigation.navigate('WaterDeviceConfig' as never)}
              >
                Ajustar tanque
              </Chip>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deviceChips}>
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
            </ScrollView>

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Paragraph style={styles.heroLabel}>Nível atual</Paragraph>
                <Title style={[styles.heroValue, { color: levelColor }]}>{formatPercent(levelPercent)}</Title>
                <Paragraph style={styles.heroHint}>Atualizado {lastUpdate}</Paragraph>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStat}>
                <Paragraph style={styles.heroLabel}>Volume disponível</Paragraph>
                <Title style={styles.heroValue}>{formatVolume(currentVolumeLiters)}</Title>
                <Paragraph style={styles.heroHint}>Restante: {formatVolume(remainingLiters)}</Paragraph>
              </View>
            </View>

            {usingEnergyFallback && (
              <Paragraph style={styles.fallbackNotice}>
                Usando o mesmo dispositivo monitorado em energia. Configure a altura e o raio para habilitar cálculos precisos.
              </Paragraph>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.profileCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Perfil do reservatório</Title>
            {containerConfig ? (
              <View style={styles.profileGrid}>
                <View style={styles.profileItem}>
                  <Paragraph style={styles.profileLabel}>Altura configurada</Paragraph>
                  <Title style={styles.profileValue}>{formatNumber(containerConfig.height_cm, 0)} cm</Title>
                </View>
                <View style={styles.profileItem}>
                  <Paragraph style={styles.profileLabel}>Raio</Paragraph>
                  <Title style={styles.profileValue}>{formatNumber(containerConfig.radius_cm, 0)} cm</Title>
                </View>
                <View style={styles.profileItem}>
                  <Paragraph style={styles.profileLabel}>Sensor</Paragraph>
                  <Title style={styles.profileValue}>{formatNumber(containerConfig.sensor_offset_cm, 0)} cm</Title>
                </View>
                <View style={styles.profileItem}>
                  <Paragraph style={styles.profileLabel}>Capacidade total</Paragraph>
                  <Title style={styles.profileValue}>{formatVolume(containerConfig.capacity_liters)}</Title>
                </View>
              </View>
            ) : (
              <View>
                <Paragraph style={styles.profileFallback}>
                  Configure a altura e o raio do reservatório para leituras mais precisas.
                </Paragraph>
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate('WaterDeviceConfig' as never)}
                  style={styles.profileButton}
                >
                  Ajustar dimensões
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Visualização do tanque</Title>
            <View style={styles.tankContainer}>
              <View style={styles.tankBody}>
                <View
                  style={[styles.waterFill, {
                    height: `${Math.max(0, Math.min(levelPercent, 100))}%`,
                    backgroundColor: levelColor,
                  }]}
                />
              </View>
              <View style={styles.tankStats}>
                <Title style={[styles.tankLevel, { color: levelColor }]}>{formatPercent(levelPercent)}</Title>
                <Paragraph style={styles.tankVolume}>{formatVolume(currentVolumeLiters)} de {formatVolume(capacityLiters)}</Paragraph>
              </View>
            </View>
            <ProgressBar progress={Math.min(levelPercent / 100, 1)} color={levelColor} style={styles.progressBar} />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Histórico recente</Title>
            {historyPoints.length ? (
              <LineChart
                data={chartData}
                width={screenWidth - 48}
                height={220}
                withInnerLines={false}
                bezier
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
                style={styles.chart}
              />
            ) : (
              <Paragraph style={styles.emptyHistory}>Ainda não há leituras suficientes para plotar o gráfico.</Paragraph>
            )}
          </Card.Content>
        </Card>

        {error && (
          <Card style={styles.alertCard}>
            <Card.Content>
              <Paragraph style={styles.alertText}>Erro ao carregar leituras: {error}</Paragraph>
              <Button mode="text" onPress={handleRefresh} textColor={COLORS.white}>
                Tentar novamente
              </Button>
            </Card.Content>
          </Card>
        )}

        {stats && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Resumo diário</Title>
              <View style={styles.statsGrid}>
                <View style={styles.statsItem}>
                  <Paragraph style={styles.profileLabel}>Consumo nas últimas horas</Paragraph>
                  <Title style={styles.profileValue}>{formatVolume(stats.daily_consumption)}</Title>
                </View>
                <View style={styles.statsItem}>
                  <Paragraph style={styles.profileLabel}>Volume médio</Paragraph>
                  <Title style={styles.profileValue}>{formatPercent(stats.avg_level)}</Title>
                </View>
                <View style={styles.statsItem}>
                  <Paragraph style={styles.profileLabel}>Tempo estimado até esvaziar</Paragraph>
                  <Title style={styles.profileValue}>{estimatedEmptyHoursLabel}</Title>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.backdrop,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backdrop,
  },
  heroCard: {
    borderRadius: 18,
    padding: 4,
    backgroundColor: COLORS.backdropMuted,
    marginBottom: 16,
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
    fontSize: 14,
    marginBottom: 4,
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '700',
  },
  heroChip: {
    backgroundColor: COLORS.water,
  },
  heroChipText: {
    color: COLORS.white,
  },
  deviceChips: {
    marginTop: 12,
    marginBottom: 4,
  },
  deviceChip: {
    marginRight: 8,
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
    alignItems: 'stretch',
    marginTop: 16,
  },
  heroStat: {
    flex: 1,
    paddingRight: 8,
  },
  heroLabel: {
    color: COLORS.white,
    opacity: 0.7,
    fontSize: 13,
    marginBottom: 4,
  },
  heroValue: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '700',
  },
  heroHint: {
    color: COLORS.white,
    opacity: 0.6,
    marginTop: 4,
  },
  heroDivider: {
    width: 1,
    backgroundColor: COLORS.backdropTint,
    marginHorizontal: 12,
  },
  profileCard: {
    borderRadius: 16,
    padding: 4,
    backgroundColor: COLORS.backdropMuted,
    marginBottom: 16,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 18,
    marginBottom: 16,
  },
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  profileItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  profileLabel: {
    color: COLORS.white,
    opacity: 0.6,
    fontSize: 12,
  },
  profileValue: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  profileFallback: {
    color: COLORS.white,
    opacity: 0.7,
    marginBottom: 12,
  },
  profileButton: {
    alignSelf: 'flex-start',
  },
  card: {
    borderRadius: 16,
    backgroundColor: COLORS.backdropMuted,
    marginBottom: 16,
    padding: 4,
  },
  tankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  tankBody: {
    width: 140,
    height: 220,
    borderWidth: 3,
    borderColor: COLORS.white,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: COLORS.backdrop,
  },
  waterFill: {
    width: '100%',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  tankStats: {
    flex: 1,
    marginLeft: 24,
  },
  tankLevel: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.white,
  },
  tankVolume: {
    color: COLORS.white,
    opacity: 0.7,
  },
  progressBar: {
    height: 12,
    borderRadius: 8,
    backgroundColor: COLORS.backdrop,
  },
  chart: {
    marginTop: 8,
    borderRadius: 12,
  },
  emptyHistory: {
    color: COLORS.white,
    opacity: 0.7,
  },
  alertCard: {
    borderRadius: 16,
    backgroundColor: COLORS.error,
  },
  alertText: {
    color: COLORS.white,
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  statsItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  fallbackNotice: {
    color: COLORS.white,
    opacity: 0.7,
    marginTop: 16,
  },
})
