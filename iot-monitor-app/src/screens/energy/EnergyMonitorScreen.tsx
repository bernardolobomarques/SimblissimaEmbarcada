/**
 * Tela de Monitoramento de Energia
 * Exibe dados em tempo real do consumo de energia elétrica
 */

import React, { useEffect, useMemo, useState } from 'react'
import { View, ScrollView, StyleSheet, Dimensions, RefreshControl } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { ActivityIndicator, Button, Card, Chip, Paragraph, ProgressBar, Title } from 'react-native-paper'
import { LineChart } from 'react-native-chart-kit'
import { supabase } from '../../services/supabase'
import { useRealtime } from '../../hooks/useRealtime'
import { EnergyReading } from '../../types/energy.types'
import { Device } from '../../types/device.types'
import { COLORS } from '../../constants/colors'
import { formatPower, formatEnergy, formatCurrency, formatTime } from '../../utils/formatters'
import { APP_CONFIG } from '../../constants/config'
import { useAuth } from '../../hooks/useAuth'
import { deviceService } from '../../services/device.service'

const safeConsole: any = (globalThis as any)?.console

const screenWidth = Dimensions.get('window').width

export default function EnergyMonitorScreen() {
  const navigation = useNavigation()
  const { user } = useAuth()
  const [readings, setReadings] = useState<EnergyReading[]>([])
  const [currentPower, setCurrentPower] = useState(0)
  const [dailyConsumption, setDailyConsumption] = useState(0)
  const [estimatedCost, setEstimatedCost] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [isLoadingDevices, setIsLoadingDevices] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      return
    }

    const loadDevices = async () => {
      setIsLoadingDevices(true)
      const fetchedDevices = await deviceService.getDevicesByType(user.id, 'energy')
      setDevices(fetchedDevices)
      if (fetchedDevices.length > 0) {
        setSelectedDeviceId((prev: string | null) => prev || fetchedDevices[0].id)
      }
      setIsLoadingDevices(false)
    }

    loadDevices()
  }, [user?.id])

  // Subscrever a atualizações em tempo real
  useRealtime({
    table: 'energy_readings',
    event: 'INSERT',
    filter: selectedDeviceId ? `device_id=eq.${selectedDeviceId}` : undefined,
    onInsert: (newReading: EnergyReading) => {
      if (selectedDeviceId && newReading.device_id !== selectedDeviceId) {
        return
      }
      setCurrentPower(newReading.power_watts)
  setReadings((prev: EnergyReading[]) => [newReading, ...prev].slice(0, 50))
    },
  })

  useEffect(() => {
    if (selectedDeviceId) {
      loadData(selectedDeviceId)
    }
  }, [selectedDeviceId])

  const loadData = async (deviceId: string) => {
    try {
      setLoading(true)

      // Buscar últimas 50 leituras
      const { data } = await supabase
        .from('energy_readings')
        .select('*')
        .eq('device_id', deviceId)
        .order('timestamp', { ascending: false })
        .limit(50)
      
      if (data && data.length > 0) {
        setReadings(data)
        setCurrentPower(data[0].power_watts)
        
        // Calcular consumo diário
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const todayReadings = data.filter((r: EnergyReading) => 
          new Date(r.timestamp) >= today
        )
        
        if (todayReadings.length > 1) {
          const avgPower = todayReadings.reduce(
            (sum: number, r: EnergyReading) => sum + r.power_watts,
            0
          ) / todayReadings.length
          const hoursElapsed = (Date.now() - today.getTime()) / (1000 * 60 * 60)
          const kwh = (avgPower * hoursElapsed) / 1000
          setDailyConsumption(kwh)
          setEstimatedCost(kwh * APP_CONFIG.energyTariffPerKWh)
        }
      }
    } catch (error) {
      safeConsole?.error?.('Erro ao carregar dados de energia:', error)
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    if (selectedDeviceId) {
      await loadData(selectedDeviceId)
    }
    setRefreshing(false)
  }

  const activeDevice = useMemo(
    () => devices.find((device: Device) => device.id === selectedDeviceId) || null,
    [devices, selectedDeviceId]
  )

  const metadata = activeDevice?.metadata || {}
  const demoNominalCurrent = Number(metadata.demo_nominal_current ?? 15)
  const demoMaxCurrent = Number(metadata.demo_max_current ?? Math.max(demoNominalCurrent * 1.2, 20))
  const demoVoltage = Number(metadata.demo_nominal_voltage ?? 127)
  const demoLabel: string = metadata.demo_scenario_label ?? 'Cenário demonstrativo'

  const estimatedCurrent = demoVoltage > 0 ? currentPower / demoVoltage : 0
  const utilizationRatio = demoMaxCurrent > 0 ? Math.min(estimatedCurrent / demoMaxCurrent, 1) : 0
  const utilizationColor = utilizationRatio >= 0.85 ? COLORS.warning : COLORS.success

  const formattedDevices = devices.map((device: Device) => ({
    id: device.id,
    name: device.device_name || 'Dispositivo',
  }))

  // Preparar dados para o gráfico (últimas 10 leituras)
  const chartData = {
    labels: readings.slice(0, 10).reverse().map((r: EnergyReading) => formatTime(r.timestamp)),
    datasets: [{
      data: readings.slice(0, 10).reverse().map((r: EnergyReading) => r.power_watts),
    }],
  }

  if (isLoadingDevices) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    )
  }

  if (!selectedDeviceId || devices.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Title>Nenhum dispositivo configurado</Title>
            <Paragraph style={styles.emptyParagraph}>
              Acesse Configurações {'>'} Corrente demonstrativa para selecionar um dispositivo de energia.
            </Paragraph>
            <Button
              mode="contained"
              icon="cog"
              onPress={() => navigation.navigate('DeviceConfig' as never)}
              style={styles.emptyButton}
            >
              Ir para configurações
            </Button>
          </Card.Content>
        </Card>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Card style={styles.heroCard}>
        <Card.Content>
          <View style={styles.heroHeader}>
            <Paragraph style={styles.heroSubtitle}>Cenário demonstrativo</Paragraph>
            <Chip icon="flash" style={styles.heroChip}>Energia</Chip>
          </View>
          <Title style={styles.heroTitle}>{demoLabel}</Title>
          <Paragraph style={styles.heroDescription}>
            Baseado no dispositivo {activeDevice?.device_name || 'sem nome'}. Ajuste os parâmetros conforme a apresentação.
          </Paragraph>
          {formattedDevices.length > 1 && (
            <View style={styles.deviceChipRow}>
              {formattedDevices.map((device: { id: string; name: string }) => {
                const isSelected = device.id === selectedDeviceId
                return (
                  <Chip
                    key={device.id}
                    icon={isSelected ? 'check' : 'server'}
                    selected={isSelected}
                    selectedColor={COLORS.white}
                    style={[
                      styles.selectorChip,
                      isSelected && { backgroundColor: COLORS.secondary },
                    ]}
                    textStyle={isSelected ? styles.selectorChipTextActive : styles.selectorChipText}
                    onPress={() => setSelectedDeviceId(device.id)}
                  >
                    {device.name}
                  </Chip>
                )
              })}
            </View>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.currentCard}>
        <Card.Content>
          <View style={styles.currentRow}>
            <View style={styles.currentColumn}>
              <Paragraph style={styles.label}>Corrente estimada</Paragraph>
              <Title style={styles.currentValue}>{estimatedCurrent.toFixed(2)} A</Title>
              <Paragraph style={styles.detailText}>
                Potência medida: {formatPower(currentPower)}
              </Paragraph>
            </View>
            <View style={styles.divider} />
            <View style={styles.currentColumn}>
              <Paragraph style={styles.label}>Corrente nominal</Paragraph>
              <Title style={styles.currentValue}>{demoNominalCurrent.toFixed(1)} A</Title>
              <Paragraph style={styles.detailText}>Limite seguro: {demoMaxCurrent.toFixed(1)} A</Paragraph>
            </View>
          </View>

          <Paragraph style={styles.progressLabel}>Utilização do limite configurado</Paragraph>
          <ProgressBar
            progress={utilizationRatio}
            color={utilizationColor}
            style={styles.progressBar}
          />
          <Paragraph style={styles.progressFooter}>
            Margem calculada: {(demoMaxCurrent - estimatedCurrent).toFixed(1)} A
          </Paragraph>

          <Button
            mode="text"
            icon="tune"
            onPress={() => navigation.navigate('DeviceConfig' as never)}
            style={styles.adjustButton}
          >
            Ajustar parâmetros demonstrativos
          </Button>
        </Card.Content>
      </Card>

      {/* Card de Potência Atual */}
      <Card style={styles.card}>
        <Card.Content>
          <Paragraph style={styles.label}>Potência Atual</Paragraph>
          <Title style={[styles.bigNumber, { color: COLORS.secondary }]}>
            {formatPower(currentPower)}
          </Title>
        </Card.Content>
      </Card>

      {/* Card de Consumo Diário */}
      <Card style={styles.card}>
        <Card.Content>
          <Paragraph style={styles.label}>Consumo Hoje</Paragraph>
          <Title style={styles.bigNumber}>
            {formatEnergy(dailyConsumption)}
          </Title>
          <Paragraph style={styles.detailText}>
            Custo estimado: {formatCurrency(estimatedCost)}
          </Paragraph>
        </Card.Content>
      </Card>

      {/* Gráfico de Leituras */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Últimas 10 Leituras</Title>
          {readings.length > 0 && (
            <LineChart
              data={chartData}
              width={screenWidth - 60}
              height={220}
              chartConfig={{
                backgroundColor: COLORS.secondary,
                backgroundGradientFrom: COLORS.secondaryLight,
                backgroundGradientTo: COLORS.secondary,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
              }}
              bezier
              style={styles.chart}
            />
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 24,
  },
  emptyCard: {
    width: '100%',
    borderRadius: 16,
  },
  emptyParagraph: {
    marginTop: 8,
    color: COLORS.textSecondary,
  },
  emptyButton: {
    marginTop: 16,
  },
  heroCard: {
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    elevation: 4,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  heroChip: {
    backgroundColor: COLORS.secondary,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
    color: COLORS.textPrimary,
  },
  heroDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  deviceChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  selectorChip: {
    backgroundColor: COLORS.background,
    marginRight: 8,
    marginBottom: 8,
  },
  selectorChipText: {
    color: COLORS.textPrimary,
  },
  selectorChipTextActive: {
    color: COLORS.white,
  },
  currentCard: {
    marginBottom: 16,
    borderRadius: 18,
    elevation: 4,
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentColumn: {
    flex: 1,
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: COLORS.grayLight,
    marginHorizontal: 12,
    borderRadius: 1,
  },
  card: {
    marginBottom: 16,
    elevation: 3,
    borderRadius: 18,
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  progressBar: {
    height: 10,
    borderRadius: 10,
    marginVertical: 8,
  },
  progressFooter: {
    fontSize: 12,
    textAlign: 'right',
    color: COLORS.textSecondary,
  },
  adjustButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  bigNumber: {
    fontSize: 42,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  currentValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  sublabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
})
