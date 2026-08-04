/**
 * Dados mockados usados enquanto o backend Supabase original não está disponível.
 * Os valores são determinísticos (sem Math.random) para que o app renderize
 * sempre o mesmo estado visual — importante para tirar screenshots consistentes
 * para os artigos. As séries respeitam as fórmulas de src/utils/calculations.ts
 * e os thresholds de ALERT_THRESHOLDS (config.ts).
 */

import { User } from '@supabase/supabase-js'
import { Device } from '../types/device.types'
import { WaterReading, WaterContainerConfig } from '../types/water.types'
import { EnergyReading, EnergyStats } from '../types/energy.types'
import { Alert } from '../types/device.types'
import {
  calculatePower,
  calculateEnergy,
  calculateEnergyCost,
  calculateWaterLevel,
  calculateCylindricalCapacityLiters,
  calculateCylindricalVolumeFromHeight,
  calculateAverage,
  calculateMax,
} from '../utils/calculations'
import { APP_CONFIG } from '../constants/config'

export const MOCK_WATER_DEVICE_ID = 'mock-water-device-01'
export const MOCK_ENERGY_DEVICE_ID = 'mock-energy-device-01'

export const MOCK_USER = {
  id: 'mock-user-simblissima',
  email: 'demo@simblissima.dev',
  app_metadata: {},
  user_metadata: { full_name: 'Simblissima Demo' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as unknown as User

// Reservatório cilíndrico: 120cm de altura, 30cm de raio, sensor 5cm acima da lâmina d'água máxima
const WATER_TANK_HEIGHT_CM = 120
const WATER_TANK_RADIUS_CM = 30
const WATER_SENSOR_OFFSET_CM = 5
const WATER_TANK_CAPACITY_LITERS = calculateCylindricalCapacityLiters(
  WATER_TANK_RADIUS_CM,
  WATER_TANK_HEIGHT_CM
)

export const MOCK_WATER_CONTAINER_CONFIG: WaterContainerConfig = {
  height_cm: WATER_TANK_HEIGHT_CM,
  radius_cm: WATER_TANK_RADIUS_CM,
  sensor_offset_cm: WATER_SENSOR_OFFSET_CM,
  capacity_liters: WATER_TANK_CAPACITY_LITERS,
  updated_at: new Date().toISOString(),
}

export const MOCK_DEVICES: Device[] = [
  {
    id: MOCK_WATER_DEVICE_ID,
    user_id: MOCK_USER.id,
    device_type: 'water',
    device_name: 'Caixa d’água - Cobertura',
    location: 'Cobertura do prédio',
    is_active: true,
    status: 'online',
    last_seen: new Date().toISOString(),
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {},
    water_tank_height_cm: WATER_TANK_HEIGHT_CM,
    water_tank_radius_cm: WATER_TANK_RADIUS_CM,
    water_sensor_offset_cm: WATER_SENSOR_OFFSET_CM,
    water_tank_capacity_liters: WATER_TANK_CAPACITY_LITERS,
  },
  {
    id: MOCK_ENERGY_DEVICE_ID,
    user_id: MOCK_USER.id,
    device_type: 'energy',
    device_name: 'Quadro de energia - Apto 101',
    location: 'Apartamento 101',
    is_active: true,
    status: 'online',
    last_seen: new Date().toISOString(),
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {
      demo_scenario_label: 'Consumo residencial típico',
      demo_nominal_current: 15,
      demo_max_current: 20,
      demo_nominal_voltage: 127,
    },
  },
]

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

/**
 * Gera 48 leituras de água ao longo de 24h (a cada 30min), com o nível caindo
 * suavemente de ~82% para ~64% e um pequeno reabastecimento perto do final,
 * sem nunca cruzar os thresholds de alerta (20% / 10%) para representar
 * operação normal do reservatório.
 */
function buildMockWaterReadings(): WaterReading[] {
  const points = 48
  const readings: WaterReading[] = []

  for (let i = 0; i < points; i++) {
    const hoursFromStart = i * 0.5
    const refillBoost = hoursFromStart > 20 ? 6 : 0 // reabastecimento nas últimas horas
    const levelPercent = Math.max(
      60,
      82 - hoursFromStart * 0.75 + refillBoost
    )

    const waterHeightCm = (levelPercent / 100) * WATER_TANK_HEIGHT_CM
    const distanceCm =
      WATER_TANK_HEIGHT_CM - WATER_SENSOR_OFFSET_CM - waterHeightCm
    const volumeLiters = calculateCylindricalVolumeFromHeight(
      WATER_TANK_RADIUS_CM,
      waterHeightCm
    )

    readings.push({
      id: 1000 + i,
      device_id: MOCK_WATER_DEVICE_ID,
      timestamp: hoursAgo(24 - hoursFromStart),
      distance_cm: Number(distanceCm.toFixed(1)),
      water_level_percent: Number(levelPercent.toFixed(1)),
      volume_liters: Number(volumeLiters.toFixed(1)),
      tank_height_cm: WATER_TANK_HEIGHT_CM,
      tank_capacity_liters: WATER_TANK_CAPACITY_LITERS,
      tank_radius_cm: WATER_TANK_RADIUS_CM,
      sensor_offset_cm: WATER_SENSOR_OFFSET_CM,
    })
  }

  // Mais recente primeiro, igual ao retorno real do Supabase (order desc)
  return readings.reverse()
}

/**
 * Gera 48 leituras de energia ao longo de 24h (a cada 30min), com consumo
 * subindo no início da noite (pico residencial) e caindo de madrugada,
 * sem ultrapassar o threshold de alerta "high" (3000W).
 */
function buildMockEnergyReadings(): EnergyReading[] {
  const points = 48
  const voltage = 127
  const readings: EnergyReading[] = []

  for (let i = 0; i < points; i++) {
    const hoursFromStart = i * 0.5
    // Curva suave de consumo: baixo de madrugada, pico à noite (~19h-22h)
    const hourOfDay = (6 + hoursFromStart) % 24
    const eveningPeak = Math.exp(-((hourOfDay - 20) ** 2) / 8) * 9
    const baseLoad = 2.5 + eveningPeak
    const currentRms = Number(baseLoad.toFixed(2))
    const powerWatts = calculatePower(voltage, currentRms)

    readings.push({
      id: 2000 + i,
      device_id: MOCK_ENERGY_DEVICE_ID,
      timestamp: hoursAgo(24 - hoursFromStart),
      current_rms: currentRms,
      voltage,
      power_watts: Number(powerWatts.toFixed(1)),
    })
  }

  return readings.reverse()
}

export const MOCK_WATER_READINGS: WaterReading[] = buildMockWaterReadings()
export const MOCK_ENERGY_READINGS: EnergyReading[] = buildMockEnergyReadings()

const energyPowers = MOCK_ENERGY_READINGS.map((r) => r.power_watts)
const totalKwh = calculateEnergy(calculateAverage(energyPowers), 24)

export const MOCK_ENERGY_STATS: EnergyStats = {
  total_kwh: Number(totalKwh.toFixed(2)),
  avg_power_watts: Number(calculateAverage(energyPowers).toFixed(1)),
  max_power_watts: Number(calculateMax(energyPowers).toFixed(1)),
  reading_count: MOCK_ENERGY_READINGS.length,
  estimated_cost: Number(
    calculateEnergyCost(totalKwh, APP_CONFIG.energyTariffPerKWh).toFixed(2)
  ),
}

export const MOCK_ALERTS: Alert[] = [
  {
    id: 9001,
    user_id: MOCK_USER.id,
    device_id: MOCK_WATER_DEVICE_ID,
    alert_type: 'water_low',
    message: 'Nível do reservatório abaixo de 65%. Consumo normal, sem ação necessária.',
    severity: 'info',
    is_read: false,
    is_resolved: false,
    created_at: hoursAgo(3),
  },
  {
    id: 9002,
    user_id: MOCK_USER.id,
    device_id: MOCK_ENERGY_DEVICE_ID,
    alert_type: 'energy_high',
    message: 'Pico de consumo detectado no horário de ponta (19h-22h).',
    severity: 'warning',
    is_read: true,
    is_resolved: true,
    created_at: hoursAgo(10),
    resolved_at: hoursAgo(9),
  },
]

export function getMockWaterReadings(deviceId: string, limit: number = 50): WaterReading[] {
  if (deviceId !== MOCK_WATER_DEVICE_ID) return []
  return MOCK_WATER_READINGS.slice(0, limit)
}

export function getMockEnergyReadings(deviceId: string, limit: number = 50): EnergyReading[] {
  if (deviceId !== MOCK_ENERGY_DEVICE_ID) return []
  return MOCK_ENERGY_READINGS.slice(0, limit)
}

export function getMockDevicesByType(deviceType?: 'energy' | 'water'): Device[] {
  if (!deviceType) return MOCK_DEVICES
  return MOCK_DEVICES.filter((device) => device.device_type === deviceType)
}
