/**
 * Funções utilitárias para cálculos de energia e água
 */

/**
 * Calcula a potência em Watts
 * P = V × I
 */
export function calculatePower(voltage: number, currentRms: number): number {
  return voltage * currentRms
}

/**
 * Calcula energia em kWh
 * E = P × t / 1000
 */
export function calculateEnergy(powerWatts: number, hoursElapsed: number): number {
  return (powerWatts * hoursElapsed) / 1000
}

/**
 * Calcula custo de energia
 */
export function calculateEnergyCost(kWh: number, tariffPerKWh: number): number {
  return kWh * tariffPerKWh
}

/**
 * Calcula nível de água em porcentagem
 * Com base na distância medida pelo sensor ultrassônico
 */
export function calculateWaterLevel(
  distanceCm: number,
  tankHeightCm: number,
  sensorHeightCm: number = 0
): number {
  // Distância do sensor até o fundo = tankHeightCm - sensorHeightCm
  // Nível de água = tankHeightCm - distanceCm
  const waterHeightCm = tankHeightCm - sensorHeightCm - distanceCm
  const percentage = (waterHeightCm / tankHeightCm) * 100
  
  // Garantir que está entre 0 e 100
  return Math.max(0, Math.min(100, percentage))
}

/**
 * Calcula volume em litros baseado em tanque cilíndrico
 * V = π × r² × h
 */
export function calculateCylindricalVolume(
  diameterCm: number,
  heightCm: number,
  waterLevelPercent: number
): number {
  const radiusCm = diameterCm / 2
  const waterHeightCm = (heightCm * waterLevelPercent) / 100
  const volumeCm3 = Math.PI * radiusCm * radiusCm * waterHeightCm
  
  // Converter cm³ para litros (1L = 1000cm³)
  return volumeCm3 / 1000
}

/**
 * Calcula capacidade total de um cilindro (em litros)
 */
export function calculateCylindricalCapacityLiters(
  radiusCm: number,
  heightCm: number
): number {
  if (radiusCm <= 0 || heightCm <= 0) {
    return 0
  }

  const volumeCm3 = Math.PI * radiusCm * radiusCm * heightCm
  return volumeCm3 / 1000
}

/**
 * Calcula volume de água em litros a partir da altura preenchida (cm)
 */
export function calculateCylindricalVolumeFromHeight(
  radiusCm: number,
  waterHeightCm: number
): number {
  if (radiusCm <= 0 || waterHeightCm <= 0) {
    return 0
  }

  const volumeCm3 = Math.PI * radiusCm * radiusCm * waterHeightCm
  return volumeCm3 / 1000
}

/**
 * Calcula volume em litros baseado em tanque retangular
 * V = comprimento × largura × altura
 */
export function calculateRectangularVolume(
  lengthCm: number,
  widthCm: number,
  heightCm: number,
  waterLevelPercent: number
): number {
  const waterHeightCm = (heightCm * waterLevelPercent) / 100
  const volumeCm3 = lengthCm * widthCm * waterHeightCm
  
  // Converter cm³ para litros
  return volumeCm3 / 1000
}

/**
 * Calcula tempo estimado até esvaziar
 */
export function calculateTimeToEmpty(
  currentVolumeLiters: number,
  consumptionRateLitersPerHour: number
): number {
  if (consumptionRateLitersPerHour <= 0) {
    return Infinity
  }
  
  return currentVolumeLiters / consumptionRateLitersPerHour
}

/**
 * Calcula média de um array de números
 */
export function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length
}

/**
 * Calcula valor máximo de um array
 */
export function calculateMax(numbers: number[]): number {
  if (numbers.length === 0) return 0
  return Math.max(...numbers)
}

/**
 * Calcula valor mínimo de um array
 */
export function calculateMin(numbers: number[]): number {
  if (numbers.length === 0) return 0
  return Math.min(...numbers)
}
