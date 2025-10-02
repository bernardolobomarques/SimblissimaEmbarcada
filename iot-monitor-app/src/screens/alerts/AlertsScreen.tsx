/**
 * Tela de Alertas
 * Exibe notificações e alertas do sistema
 */

import React, { useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { Card, Title, Paragraph, Chip, IconButton, ActivityIndicator } from 'react-native-paper'
import { alertsService } from '../../services/alerts.service'
import { useAuth } from '../../hooks/useAuth'
import { useRealtime } from '../../hooks/useRealtime'
import { Alert } from '../../types/device.types'
import { COLORS } from '../../constants/colors'
import { formatDateTime } from '../../utils/formatters'

export default function AlertsScreen() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Subscrever a novos alertas
  useRealtime({
    table: 'alerts',
    event: 'INSERT',
    onInsert: (newAlert: Alert) => {
      setAlerts(prev => [newAlert, ...prev])
    },
  })

  useEffect(() => {
    if (user) {
      loadAlerts()
    }
  }, [user])

  const loadAlerts = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const data = await alertsService.getAlerts(user.id)
      setAlerts(data)
    } catch (error) {
      console.error('Erro ao carregar alertas:', error)
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadAlerts()
    setRefreshing(false)
  }

  const handleMarkAsRead = async (alertId: number) => {
    await alertsService.markAsRead(alertId)
    setAlerts(prev =>
      prev.map(alert =>
        alert.id === alertId ? { ...alert, is_read: true } : alert
      )
    )
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return COLORS.critical
      case 'warning': return COLORS.warning
      default: return COLORS.info
    }
  }

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical': return 'Crítico'
      case 'warning': return 'Atenção'
      default: return 'Info'
    }
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
      {alerts.map(alert => (
        <Card
          key={alert.id}
          style={[
            styles.card,
            !alert.is_read && styles.unreadCard,
            { borderLeftWidth: 4, borderLeftColor: getSeverityColor(alert.severity) }
          ]}
        >
          <Card.Content>
            <View style={styles.alertHeader}>
              <Chip
                style={{
                  backgroundColor: getSeverityColor(alert.severity),
                }}
                textStyle={{ color: COLORS.white }}
              >
                {getSeverityLabel(alert.severity)}
              </Chip>
              {!alert.is_read && (
                <IconButton
                  icon="check"
                  size={20}
                  onPress={() => handleMarkAsRead(alert.id)}
                />
              )}
            </View>
            <Paragraph style={styles.message}>{alert.message}</Paragraph>
            <Paragraph style={styles.timestamp}>
              {formatDateTime(alert.created_at)}
            </Paragraph>
          </Card.Content>
        </Card>
      ))}

      {alerts.length === 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Paragraph style={styles.emptyText}>
              Nenhum alerta no momento
            </Paragraph>
          </Card.Content>
        </Card>
      )}
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
    marginBottom: 12,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: '#FFF9C4',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    marginVertical: 8,
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginVertical: 20,
  },
})
