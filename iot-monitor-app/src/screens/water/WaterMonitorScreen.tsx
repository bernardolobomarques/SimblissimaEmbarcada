/**
 * Tela de Monitoramento de Água
 * Exibe dados em tempo real do nível de água no reservatório
 */

import React, { useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet, Dimensions, RefreshControl } from 'react-native'
import { Card, Title, Paragraph, ProgressBar, ActivityIndicator } from 'react-native-paper'
import { LineChart } from 'react-native-chart-kit'
import { supabase } from '../../services/supabase'
import { useRealtime } from '../../hooks/useRealtime'
import { WaterReading } from '../../types/water.types'
import { COLORS } from '../../constants/colors'
import { formatPercent, formatVolume, formatTime } from '../../utils/formatters'

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
      setReadings(prev => [newReading, ...prev].slice(0, 50))
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
      console.error('Erro ao carregar dados de água:', error)
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
    labels: readings.slice(0, 10).reverse().map(r => formatTime(r.timestamp)),
    datasets: [{
      data: readings.slice(0, 10).reverse().map(r => r.water_level_percent),
    }],
  }

  const chartWidth = screenWidth - 48 // Reduzindo para dar mais espaço

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
              width={chartWidth}
              height={200}
              chartConfig={{
                backgroundColor: COLORS.water,
                backgroundGradientFrom: COLORS.waterLight,
                backgroundGradientTo: COLORS.water,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: {
                  borderRadius: 12,
                },
                propsForLabels: {
                  fontSize: 10,
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
    padding: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
    borderRadius: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  tankContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  tank: {
    width: 100,
    height: 160,
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: COLORS.grayLight,
  },
  water: {
    width: '100%',
  },
  levelText: {
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginVertical: 12,
  },
  volumeText: {
    fontSize: 14,
    textAlign: 'center',
    color: COLORS.textSecondary,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 12,
  },
})
