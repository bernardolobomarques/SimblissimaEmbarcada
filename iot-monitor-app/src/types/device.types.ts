/**
 * Types para dispositivos e alertas
 * Sistema unificado de monitoramento IoT
 */

export type DeviceType = 'energy' | 'water'

export type DeviceStatus = 'online' | 'offline' | 'error'

export interface Device {
  id: string
  user_id: string
  device_type: DeviceType
  device_name: string
  location?: string
  is_active: boolean
  status: DeviceStatus
  last_seen?: string
  created_at: string
  updated_at?: string
  metadata?: Record<string, any>
}

export type AlertSeverity = 'info' | 'warning' | 'critical'

export type AlertType = 
  | 'energy_high'
  | 'energy_critical'
  | 'energy_spike'
  | 'water_low'
  | 'water_critical'
  | 'water_full'
  | 'water_leak'
  | 'device_offline'
  | 'device_error'

export interface Alert {
  id: number
  user_id: string
  device_id: string
  alert_type: AlertType
  message: string
  severity: AlertSeverity
  is_read: boolean
  is_resolved: boolean
  created_at: string
  resolved_at?: string
  metadata?: Record<string, any>
}

export interface DeviceConfig {
  device_id: string
  config_key: string
  config_value: any
  updated_at: string
}

export interface SystemHealth {
  total_devices: number
  online_devices: number
  offline_devices: number
  active_alerts: number
  critical_alerts: number
  last_updated: string
}

export interface NotificationSettings {
  user_id: string
  email_notifications: boolean
  push_notifications: boolean
  alert_severities: AlertSeverity[]
  quiet_hours_start?: string
  quiet_hours_end?: string
}
