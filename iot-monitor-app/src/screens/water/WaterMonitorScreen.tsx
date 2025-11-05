/**
 * Tela de Monitoramento de Água
 * Exibe dados em tempo real do nível de água no reservatório
 */

import React, { useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet, Dimensions, RefreshControl } from 'react-native'
import { ActivityIndicator, Card, Chip, Paragraph, ProgressBar, Title } from 'react-native-paper'
import { LineChart } from 'react-native-chart-kit'
import { supabase } from '../../services/supabase'
import { useRealtime } from '../../hooks/useRealtime'
import { WaterReading } from '../../types/water.types'
import { COLORS } from '../../constants/colors'
import { formatPercent, formatVolume, formatTime } from '../../utils/formatters'

const safeConsole: any = (globalThis as any)?.console

const screenWidth = Dimensions.get('window').width

export default function WaterMonitorScreen() {
  const [readings, setReadings] = useState<WaterReading[]>([])
  const [currentLevel, setCurrentLevel] = useState(0)
  const [currentVolume, setCurrentVolume] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Subscrever a atualizações em tempo real
  useRealtime({
    table: 'water_readings',
    event: 'INSERT',
    onInsert: (newReading: WaterReading) => {
      setCurrentLevel(newReading.water_level_percent)
      setCurrentVolume(newReading.volume_liters)
      setReadings((prev: WaterReading[]) => [newReading, ...prev].slice(0, 50))
    },
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      const { data } = await supabase
        .from('water_readings')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50)
      
      if (data && data.length > 0) {
        setReadings(data)
        setCurrentLevel(data[0].water_level_percent)
        setCurrentVolume(data[0].volume_liters)
      }
    } catch (error) {
      safeConsole?.error?.('Erro ao carregar dados de água:', error)
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const getLevelColor = () => {
    if (currentLevel < 10) return COLORS.critical
    if (currentLevel < 20) return COLORS.warning
    return COLORS.success
  }

  const chartData = {
    labels: readings.slice(0, 10).reverse().map((r: WaterReading) => formatTime(r.timestamp)),
    datasets: [{
      data: readings.slice(0, 10).reverse().map((r: WaterReading) => r.water_level_percent),
    }],
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.water} />
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
            <Paragraph style={styles.heroSubtitle}>Reservatório monitorado</Paragraph>
            <Chip icon="water" style={styles.heroChip}>Água</Chip>
          </View>
          <Title style={styles.heroTitle}>Status em tempo real</Title>
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Paragraph style={styles.heroLabel}>Nível atual</Paragraph>
              <Title style={styles.heroValue}>{formatPercent(currentLevel)}</Title>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Paragraph style={styles.heroLabel}>Volume estimado</Paragraph>
              <Title style={styles.heroValue}>{formatVolume(currentVolume)}</Title>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Visualização do Tanque */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Nível do Reservatório</Title>
          <View style={styles.tankContainer}>
            <View style={styles.tank}>
              <View
                style={[
                  styles.water,
                  {
                    height: `${currentLevel}%`,
                    backgroundColor: getLevelColor(),
                  },
                ]}
              />
            </View>
            <Title style={[styles.levelText, { color: getLevelColor() }]}>
              {formatPercent(currentLevel)}
            </Title>
          </View>
          <ProgressBar
            progress={currentLevel / 100}
            color={getLevelColor()}
            style={styles.progressBar}
          />
          <Paragraph style={styles.volumeText}>
            Volume: {formatVolume(currentVolume)}
          </Paragraph>
        </Card.Content>
      </Card>

      {/* Gráfico de Histórico */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Variação do Nível</Title>
          {readings.length > 0 && (
            <LineChart
              data={chartData}
              width={screenWidth - 60}
              height={220}
              chartConfig={{
                backgroundColor: COLORS.water,
                backgroundGradientFrom: COLORS.waterLight,
                backgroundGradientTo: COLORS.water,
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
  heroCard: {
    marginBottom: 16,
    borderRadius: 18,
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
    backgroundColor: COLORS.water,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  heroValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.water,
  },
  heroDivider: {
    width: 1,
    height: 48,
    backgroundColor: COLORS.grayLight,
    borderRadius: 1,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  tankContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  tank: {
    width: 120,
    height: 200,
    borderWidth: 3,
    borderColor: '#333',
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: COLORS.grayLight,
  },
  water: {
    width: '100%',
  },
  levelText: {
    fontSize: 48,
    fontWeight: 'bold',
    marginTop: 10,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    marginVertical: 10,
  },
  volumeText: {
    fontSize: 16,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
})
