/**
 * Serviço de gerenciamento de dispositivos IoT
 * Facilita busca e atualização de metadados dos dispositivos
 */

import { supabase } from './supabase'
import { Device, DeviceType } from '../types/device.types'
import { calculateCylindricalCapacityLiters } from '../utils/calculations'

const safeConsole: any = (globalThis as any)?.console

const logError = (message: string, error: unknown) => {
  if (safeConsole?.error) {
    safeConsole.error(message, error)
  }
}

export interface DeviceMetadataUpdate {
  [key: string]: any
}

export interface WaterTankConfigInput {
  height_cm: number
  radius_cm: number
  sensor_offset_cm?: number
}

export interface WaterCapableDevicesResult {
  devices: Device[]
  usedFallback: boolean
}

export const deviceService = {
  /**
   * Busca dispositivos do usuário filtrando por tipo opcionalmente
   */
  async getDevicesByType(userId: string, deviceType?: DeviceType): Promise<Device[]> {
    const query = supabase
      .from('devices')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('device_name', { ascending: true })

    if (deviceType) {
      query.eq('device_type', deviceType)
    }

    const { data, error } = await query

    if (error) {
      logError('Erro ao buscar dispositivos:', error)
      return []
    }

    return data || []
  },

  async getWaterCapableDevices(userId: string): Promise<WaterCapableDevicesResult> {
    const waterDevices = await this.getDevicesByType(userId, 'water')
    if (waterDevices.length > 0) {
      return { devices: waterDevices, usedFallback: false }
    }

    const energyDevices = await this.getDevicesByType(userId, 'energy')
    return { devices: energyDevices, usedFallback: energyDevices.length > 0 }
  },

  /**
   * Busca um dispositivo específico
   */
  async getDeviceById(deviceId: string): Promise<Device | null> {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('id', deviceId)
      .single()

    if (error) {
      logError('Erro ao buscar dispositivo:', error)
      return null
    }

    return data
  },

  /**
   * Atualiza os metadados do dispositivo de forma incremental
   */
  async updateDeviceMetadata(deviceId: string, metadataUpdate: DeviceMetadataUpdate): Promise<Device | null> {
    const { data: currentData, error: currentError } = await supabase
      .from('devices')
      .select('metadata')
      .eq('id', deviceId)
      .single()

    if (currentError) {
      logError('Erro ao carregar metadados atuais:', currentError)
      return null
    }

    const mergedMetadata = {
      ...(currentData?.metadata || {}),
      ...metadataUpdate,
    }

    const { data, error } = await supabase
      .from('devices')
      .update({
        metadata: mergedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deviceId)
      .select()
      .single()

    if (error) {
      logError('Erro ao atualizar metadados do dispositivo:', error)
      return null
    }

    return data
  },

  /**
   * Atualiza parâmetros do reservatório de água de um dispositivo
   */
  async updateWaterTankConfig(deviceId: string, config: WaterTankConfigInput): Promise<Device | null> {
    const capacityLiters = calculateCylindricalCapacityLiters(config.radius_cm, config.height_cm)
    const sensorOffset = config.sensor_offset_cm ?? 0

    const { data, error } = await supabase
      .from('devices')
      .update({
        water_tank_height_cm: config.height_cm,
        water_tank_radius_cm: config.radius_cm,
        water_sensor_offset_cm: sensorOffset,
        water_tank_capacity_liters: capacityLiters,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deviceId)
      .select()
      .single()

    if (error) {
      logError('Erro ao atualizar reservatório de água:', error)
      return null
    }

    return data
  },
}
