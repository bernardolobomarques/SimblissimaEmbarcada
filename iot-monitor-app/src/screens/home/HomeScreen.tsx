/**
 * Tela Home (Dashboard Principal)
 * Visão geral de todos os sistemas IoT
 */

import React, { useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { Card, Title, Paragraph, Badge, ActivityIndicator } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../hooks/useAuth'
import { COLORS } from '../../constants/colors'
import { formatPower, formatPercent } from '../../utils/formatters'

export default function HomeScreen() {
  const { user } = useAuth()
  const navigation = useNavigation()
  const [refreshing, setRefreshing] = useState(false)
  const [energyPower, setEnergyPower] = useState(0)
  const [waterLevel, setWaterLevel] = useState(0)
  const [devicesOnline, setDevicesOnline] = useState({ energy: 0, water: 0 })
  const [loading, setLoading] = useState(true)

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

      // Contar dispositivos online
      const { data: devices } = await supabase
        .from('devices')
        .select('device_type, is_active')
        .eq('is_active', true)
        .eq('user_id', user?.id)

      if (devices) {
        const energyCount = devices.filter(d => d.device_type === 'energy').length
        const waterCount = devices.filter(d => d.device_type === 'water').length
        setDevicesOnline({ energy: energyCount, water: waterCount })
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
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
