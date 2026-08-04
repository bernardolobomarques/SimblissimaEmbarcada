/**
 * Tela Home (Dashboard Principal)
 * Visão geral de todos os sistemas IoT
 */

import React, { useEffect, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { ActivityIndicator, Badge, Button, Card, Chip, Paragraph, Title, Divider } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../hooks/useAuth'
import { COLORS } from '../../constants/colors'
import { formatPower, formatPercent } from '../../utils/formatters'
import { USE_MOCK_DATA } from '../../constants/config'
import { MOCK_ENERGY_READINGS, MOCK_WATER_READINGS, MOCK_DEVICES } from '../../services/mockData'

const safeConsole: any = (globalThis as any)?.console

type DashboardDevice = {
  device_type: 'energy' | 'water'
  is_active: boolean
  metadata?: Record<string, any>
}

export default function HomeScreen() {
  const { user } = useAuth()
  const navigation = useNavigation()
  const [refreshing, setRefreshing] = useState(false)
  const [energyPower, setEnergyPower] = useState(0)
  const [waterLevel, setWaterLevel] = useState(0)
  const [devicesOnline, setDevicesOnline] = useState({ energy: 0, water: 0 })
  const [loading, setLoading] = useState(true)
  const [demoConfig, setDemoConfig] = useState<{
    label: string
    nominalCurrent: number
    maxCurrent: number
    voltage: number
  } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Buscar última leitura de energia
      const energyData = USE_MOCK_DATA
        ? MOCK_ENERGY_READINGS[0]
        : (
            await supabase
              .from('energy_readings')
              .select('power_watts')
              .order('timestamp', { ascending: false })
              .limit(1)
              .single()
          ).data

      if (energyData) setEnergyPower(energyData.power_watts)

      // Buscar última leitura de água
      const waterData = USE_MOCK_DATA
        ? MOCK_WATER_READINGS[0]
        : (
            await supabase
              .from('water_readings')
              .select('water_level_percent')
              .order('timestamp', { ascending: false })
              .limit(1)
              .single()
          ).data

      if (waterData) setWaterLevel(waterData.water_level_percent)

      // Contar dispositivos online e carregar metadados
      const devices = USE_MOCK_DATA
        ? MOCK_DEVICES.filter((d) => d.is_active && d.user_id === user?.id)
        : (
            await supabase
              .from('devices')
              .select('device_type, is_active, metadata')
              .eq('is_active', true)
              .eq('user_id', user?.id)
          ).data

      if (devices) {
        const energyDevices = devices.filter((d: DashboardDevice) => d.device_type === 'energy')
        const waterDevices = devices.filter((d: DashboardDevice) => d.device_type === 'water')
        const energyCount = energyDevices.length
        const waterCount = waterDevices.length
        setDevicesOnline({ energy: energyCount, water: waterCount })

        if (energyDevices.length > 0) {
          const metadata = energyDevices[0].metadata || {}
          setDemoConfig({
            label: metadata.demo_scenario_label || 'Cenário demonstrativo',
            nominalCurrent: Number(metadata.demo_nominal_current ?? 15),
            maxCurrent: Number(metadata.demo_max_current ?? 20),
            voltage: Number(metadata.demo_nominal_voltage ?? 127),
          })
        }
      }
    } catch (error) {
      safeConsole?.error?.('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View>
        <Title style={styles.header}>Dashboard IoT</Title>
        <Paragraph style={styles.welcome}>Bem-vindo, {user?.email?.split('@')[0]}!</Paragraph>

        {demoConfig && (
          <Card style={styles.demoCard}>
            <Card.Content>
              <View style={styles.demoHeader}>
                <View>
                  <Paragraph style={styles.demoSubtitle}>Corrente demonstrativa</Paragraph>
                  <Title style={styles.demoTitle}>{demoConfig.label}</Title>
                </View>
                <Chip icon="flash" style={styles.demoChip}>Energia</Chip>
              </View>
              <View style={styles.demoRow}>
                <View style={styles.demoStat}>
                  <Paragraph style={styles.demoLabel}>Nominal</Paragraph>
                  <Paragraph style={styles.demoValue}>{demoConfig.nominalCurrent.toFixed(1)} A</Paragraph>
                </View>
                <Divider style={styles.demoDivider} />
                <View style={styles.demoStat}>
                  <Paragraph style={styles.demoLabel}>Limite</Paragraph>
                  <Paragraph style={styles.demoValue}>{demoConfig.maxCurrent.toFixed(1)} A</Paragraph>
                </View>
                <Divider style={styles.demoDivider} />
                <View style={styles.demoStat}>
                  <Paragraph style={styles.demoLabel}>Tensão</Paragraph>
                  <Paragraph style={styles.demoValue}>{demoConfig.voltage.toFixed(0)} V</Paragraph>
                </View>
              </View>
              <Button
                compact
                icon="tune"
                mode="outlined"
                onPress={() => navigation.navigate('DeviceConfig' as never)}
              >
                Ajustar apresentação
              </Button>
            </Card.Content>
          </Card>
        )}

        <View style={styles.metricsRow}>
          <Card
            style={[styles.metricCard, styles.metricCardLeft, { borderTopColor: COLORS.secondary }]}
            onPress={() => navigation.navigate('Energia' as never)}
          >
            <Card.Content>
              <View style={styles.cardHeader}>
                <Paragraph style={styles.metricTitle}>⚡ Energia</Paragraph>
                <Badge style={styles.badge}>{`${devicesOnline.energy} online`}</Badge>
              </View>
              <Paragraph style={[styles.metricValue, { color: COLORS.secondary }]}>
                {formatPower(energyPower)}
              </Paragraph>
              <Paragraph style={styles.metricLabel}>Potência atual</Paragraph>
            </Card.Content>
          </Card>

          <Card
            style={[styles.metricCard, { borderTopColor: COLORS.water }]}
            onPress={() => navigation.navigate('Água' as never)}
          >
            <Card.Content>
              <View style={styles.cardHeader}>
                <Paragraph style={styles.metricTitle}>💧 Água</Paragraph>
                <Badge style={styles.badge}>{`${devicesOnline.water} online`}</Badge>
              </View>
              <Paragraph style={[styles.metricValue, { color: COLORS.water }]}>
                {formatPercent(waterLevel)}
              </Paragraph>
              <Paragraph style={styles.metricLabel}>Nível do reservatório</Paragraph>
            </Card.Content>
          </Card>
        </View>

        <Card style={styles.summaryCard}>
          <Card.Content style={styles.summaryContent}>
            <View style={styles.summaryItem}>
              <Paragraph style={styles.summaryLabel}>Dispositivos online</Paragraph>
              <Paragraph style={styles.summaryValue}>{devicesOnline.energy + devicesOnline.water}</Paragraph>
            </View>
            <Divider style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Paragraph style={styles.summaryLabel}>Sistemas ativos</Paragraph>
              <Paragraph style={styles.summaryValue}>2</Paragraph>
            </View>
          </Card.Content>
        </Card>
      </View>

      <Button
        mode="contained"
        style={styles.refreshButton}
        icon="refresh"
        loading={refreshing}
        onPress={onRefresh}
      >
        Atualizar dados
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    fontSize: 22,
    marginBottom: 4,
    color: COLORS.textPrimary,
  },
  welcome: {
    fontSize: 14,
    marginBottom: 12,
    color: COLORS.textSecondary,
  },
  demoCard: {
    marginBottom: 12,
    borderRadius: 14,
    elevation: 2,
  },
  demoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  demoSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  demoChip: {
    backgroundColor: COLORS.secondary,
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  demoStat: {
    flex: 1,
    alignItems: 'center',
  },
  demoLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  demoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  demoDivider: {
    height: 40,
    width: 1,
    backgroundColor: COLORS.grayLight,
    marginHorizontal: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badge: {
    backgroundColor: COLORS.success,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 14,
    borderTopWidth: 4,
    elevation: 2,
    backgroundColor: COLORS.white,
  },
  metricCardLeft: {
    marginRight: 12,
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  summaryCard: {
    borderRadius: 14,
    elevation: 2,
    backgroundColor: COLORS.white,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  summaryDivider: {
    height: 32,
    width: 1,
    backgroundColor: COLORS.grayLight,
  },
  refreshButton: {
    marginTop: 8,
    borderRadius: 12,
  },
})
