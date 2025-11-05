/**
 * Serviço de gerenciamento de dispositivos IoT
 * Facilita busca e atualização de metadados dos dispositivos
 */

import { supabase } from './supabase'
import { Device, DeviceType } from '../types/device.types'

const safeConsole: any = (globalThis as any)?.console

const logError = (message: string, error: unknown) => {
  if (safeConsole?.error) {
    safeConsole.error(message, error)
  }
}

export interface DeviceMetadataUpdate {
  [key: string]: any
}

export const deviceService = {
  /**
   * Busca dispositivos do usuário filtrando por tipo opcionalmente
   */
  async getDevicesByType(userId: string, deviceType?: DeviceType): Promise<Device[]> {
    const query = supabase
      .from<Device>('devices')
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

  /**
   * Busca um dispositivo específico
   */
  async getDeviceById(deviceId: string): Promise<Device | null> {
    const { data, error } = await supabase
      .from<Device>('devices')
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
      .from<Device>('devices')
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
      .from<Device>('devices')
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
}
