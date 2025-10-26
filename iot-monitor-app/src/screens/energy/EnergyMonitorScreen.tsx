/**
 * Tela de Monitoramento de Energia
 * Exibe dados em tempo real do consumo de energia elétrica
 */

import React, { useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet, Dimensions, RefreshControl } from 'react-native'
import { Card, Title, Paragraph, ActivityIndicator } from 'react-native-paper'
import { LineChart } from 'react-native-chart-kit'
import { supabase } from '../../services/supabase'
import { useRealtime } from '../../hooks/useRealtime'
import { EnergyReading } from '../../types/energy.types'
import { COLORS } from '../../constants/colors'
import { formatPower, formatEnergy, formatCurrency, formatTime } from '../../utils/formatters'
import { APP_CONFIG } from '../../constants/config'

const screenWidth = Dimensions.get('window').width

export default function EnergyMonitorScreen() {
  const [readings, setReadings] = useState<EnergyReading[]>([])
  const [currentPower, setCurrentPower] = useState(0)
  const [dailyConsumption, setDailyConsumption] = useState(0)
  const [estimatedCost, setEstimatedCost] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Subscrever a atualizações em tempo real
  useRealtime({
    table: 'energy_readings',
    event: 'INSERT',
    onInsert: (newReading: EnergyReading) => {
      setCurrentPower(newReading.power_watts)
      setReadings(prev => [newReading, ...prev].slice(0, 50))
    },
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Buscar últimas 50 leituras
      const { data } = await supabase
        .from('energy_readings')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50)
      
      if (data && data.length > 0) {
        setReadings(data)
        setCurrentPower(data[0].power_watts)
        
        // Calcular consumo diário
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const todayReadings = data.filter(r => 
          new Date(r.timestamp) >= today
        )
        
        if (todayReadings.length > 1) {
          const avgPower = todayReadings.reduce((sum, r) => sum + r.power_watts, 0) / todayReadings.length
          const hoursElapsed = (Date.now() - today.getTime()) / (1000 * 60 * 60)
          const kwh = (avgPower * hoursElapsed) / 1000
          setDailyConsumption(kwh)
          setEstimatedCost(kwh * APP_CONFIG.energyTariffPerKWh)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados de energia:', error)
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  // Preparar dados para o gráfico (últimas 10 leituras)
  const chartData = {
    labels: readings.slice(0, 10).reverse().map(r => formatTime(r.timestamp)),
    datasets: [{
      data: readings.slice(0, 10).reverse().map(r => r.power_watts),
    }],
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
          <Paragraph style={styles.sublabel}>
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
  card: {
    marginBottom: 16,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  bigNumber: {
    fontSize: 42,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
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
