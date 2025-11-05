/**
 * Tela Home (Dashboard Principal)
 * Visão geral de todos os sistemas IoT
 */

import React, { useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { ActivityIndicator, Badge, Button, Card, Chip, Paragraph, Title } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../hooks/useAuth'
import { COLORS } from '../../constants/colors'
import { formatPower, formatPercent } from '../../utils/formatters'

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
      const { data: energyData } = await supabase
        .from('energy_readings')
        .select('power_watts')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()
      
      if (energyData) setEnergyPower(energyData.power_watts)

      // Buscar última leitura de água
      const { data: waterData } = await supabase
        .from('water_readings')
        .select('water_level_percent')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()
      
      if (waterData) setWaterLevel(waterData.water_level_percent)

      // Contar dispositivos online e carregar metadados
      const { data: devices } = await supabase
        .from('devices')
        .select('device_type, is_active, metadata')
        .eq('is_active', true)
        .eq('user_id', user?.id)

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
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Title style={styles.header}>Dashboard IoT</Title>
      <Paragraph style={styles.welcome}>
        Bem-vindo, {user?.email?.split('@')[0]}!
      </Paragraph>

        {demoConfig && (
          <Card style={styles.demoCard}>
            <Card.Content>
              <View style={styles.demoHeader}>
                <Paragraph style={styles.demoSubtitle}>Corrente demonstrativa</Paragraph>
                <Chip icon="flash" style={styles.demoChip}>Energia</Chip>
              </View>
              <Title style={styles.demoTitle}>{demoConfig.label}</Title>
              <View style={styles.demoRow}>
                <View style={styles.demoStat}>
                  <Paragraph style={styles.demoLabel}>Corrente</Paragraph>
                  <Title style={styles.demoValue}>{demoConfig.nominalCurrent.toFixed(1)} A</Title>
                </View>
                <View style={styles.demoDivider} />
                <View style={styles.demoStat}>
                  <Paragraph style={styles.demoLabel}>Limite</Paragraph>
                  <Title style={styles.demoValue}>{demoConfig.maxCurrent.toFixed(1)} A</Title>
                </View>
                <View style={styles.demoDivider} />
                <View style={styles.demoStat}>
                  <Paragraph style={styles.demoLabel}>Tensão</Paragraph>
                  <Title style={styles.demoValue}>{demoConfig.voltage.toFixed(0)} V</Title>
                </View>
              </View>
              <Button
                icon="tune"
                mode="outlined"
                onPress={() => navigation.navigate('DeviceConfig' as never)}
                style={styles.demoButton}
              >
                Ajustar apresentação
              </Button>
            </Card.Content>
          </Card>
        )}

      {/* Card Energia */}
      <Card
        style={[styles.card, { borderLeftWidth: 4, borderLeftColor: COLORS.secondary }]}
        onPress={() => navigation.navigate('Energia' as never)}
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title style={styles.cardTitle}>⚡ Energia</Title>
            <Badge style={styles.badge}>
              {`${devicesOnline.energy} online`}
            </Badge>
          </View>
          <Paragraph style={[styles.powerValue, { color: COLORS.secondary }]}>
            {formatPower(energyPower)}
          </Paragraph>
          <Paragraph style={styles.label}>Potência atual</Paragraph>
        </Card.Content>
      </Card>

      {/* Card Água */}
      <Card
        style={[styles.card, { borderLeftWidth: 4, borderLeftColor: COLORS.water }]}
        onPress={() => navigation.navigate('Água' as never)}
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title style={styles.cardTitle}>💧 Água</Title>
            <Badge style={styles.badge}>
              {`${devicesOnline.water} online`}
            </Badge>
          </View>
          <Paragraph style={[styles.powerValue, { color: COLORS.water }]}>
            {formatPercent(waterLevel)}
          </Paragraph>
          <Paragraph style={styles.label}>Nível do reservatório</Paragraph>
        </Card.Content>
      </Card>

      {/* Card de Status Geral */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>📊 Status Geral</Title>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Paragraph style={styles.statusValue}>
                {devicesOnline.energy + devicesOnline.water}
              </Paragraph>
              <Paragraph style={styles.statusLabel}>Dispositivos Online</Paragraph>
            </View>
            <View style={styles.statusItem}>
              <Paragraph style={styles.statusValue}>
                2
              </Paragraph>
              <Paragraph style={styles.statusLabel}>Sistemas Ativos</Paragraph>
            </View>
          </View>
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
  header: {
    fontSize: 24,
    marginBottom: 8,
    color: COLORS.textPrimary,
  },
  welcome: {
    fontSize: 16,
    marginBottom: 20,
    color: COLORS.textSecondary,
  },
  card: {
    marginBottom: 16,
    elevation: 3,
    backgroundColor: COLORS.white,
  },
  demoCard: {
    marginBottom: 20,
    borderRadius: 18,
    elevation: 4,
  },
  demoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  demoSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  demoChip: {
    backgroundColor: COLORS.secondary,
  },
  demoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  demoStat: {
    flex: 1,
    alignItems: 'center',
  },
  demoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  demoValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  demoDivider: {
    width: 1,
    height: 48,
    backgroundColor: COLORS.grayLight,
    borderRadius: 1,
  },
  demoButton: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
  },
  badge: {
    backgroundColor: COLORS.success,
  },
  powerValue: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statusLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
})
