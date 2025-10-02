/**
 * Serviço de alertas
 * Gerencia notificações e alertas do sistema IoT
 */

import { supabase } from './supabase'
import { Alert, AlertType, AlertSeverity } from '../types/device.types'
import * as Notifications from 'expo-notifications'

export const alertsService = {
  /**
   * Busca alertas do usuário
   */
  async getAlerts(userId: string, limit: number = 50): Promise<Alert[]> {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Erro ao buscar alertas:', error)
      return []
    }
    
    return data || []
  },

  /**
   * Busca alertas não lidos
   */
  async getUnreadAlerts(userId: string): Promise<Alert[]> {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Erro ao buscar alertas não lidos:', error)
      return []
    }
    
    return data || []
  },

  /**
   * Marca alerta como lido
   */
  async markAsRead(alertId: number): Promise<boolean> {
    const { error } = await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('id', alertId)
    
    if (error) {
      console.error('Erro ao marcar alerta como lido:', error)
      return false
    }
    
    return true
  },

  /**
   * Marca todos os alertas como lidos
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    
    if (error) {
      console.error('Erro ao marcar todos como lidos:', error)
      return false
    }
    
    return true
  },

  /**
   * Cria novo alerta
   */
  async createAlert(
    userId: string,
    deviceId: string,
    alertType: AlertType,
    message: string,
    severity: AlertSeverity
  ): Promise<Alert | null> {
    const { data, error } = await supabase
      .from('alerts')
      .insert({
        user_id: userId,
        device_id: deviceId,
        alert_type: alertType,
        message,
        severity,
        is_read: false,
        is_resolved: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar alerta:', error)
      return null
    }

    // Enviar notificação push
    await this.sendPushNotification(message, severity)

    return data
  },

  /**
   * Resolve um alerta
   */
  async resolveAlert(alertId: number): Promise<boolean> {
    const { error } = await supabase
      .from('alerts')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', alertId)
    
    if (error) {
      console.error('Erro ao resolver alerta:', error)
      return false
    }
    
    return true
  },

  /**
   * Deleta um alerta
   */
  async deleteAlert(alertId: number): Promise<boolean> {
    const { error } = await supabase
      .from('alerts')
      .delete()
      .eq('id', alertId)
    
    if (error) {
      console.error('Erro ao deletar alerta:', error)
      return false
    }
    
    return true
  },

  /**
   * Envia notificação push
   */
  async sendPushNotification(message: string, severity: AlertSeverity): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: severity === 'critical' ? '⚠️ Alerta Crítico' : 
                 severity === 'warning' ? '⚡ Atenção' : 'ℹ️ Informação',
          body: message,
          sound: severity === 'critical' ? 'default' : undefined,
          priority: severity === 'critical' ? 'high' : 'default',
        },
        trigger: null, // Enviar imediatamente
      })
    } catch (error) {
      console.error('Erro ao enviar notificação:', error)
    }
  },

  /**
   * Configura handler de notificações
   */
  setupNotificationHandler(): void {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    })
  },
}
