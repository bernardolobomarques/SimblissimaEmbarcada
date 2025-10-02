/**
 * Thresholds e limites para alertas do sistema IoT
 */

export const ENERGY_THRESHOLDS = {
  // Potência em Watts
  power: {
    idle: 100, // Consumo em modo idle
    low: 500, // Consumo baixo
    normal: 1500, // Consumo normal
    high: 3000, // Consumo alto
    critical: 5000, // Consumo crítico
  },
  
  // Consumo diário em kWh
  dailyConsumption: {
    low: 5,
    normal: 15,
    high: 25,
    critical: 35,
  },
  
  // Custo diário em R$
  dailyCost: {
    low: 3.75, // 5 kWh * R$ 0.75
    normal: 11.25, // 15 kWh * R$ 0.75
    high: 18.75, // 25 kWh * R$ 0.75
    critical: 26.25, // 35 kWh * R$ 0.75
  },
}

export const WATER_THRESHOLDS = {
  // Nível em porcentagem
  level: {
    empty: 0,
    critical: 10, // Abaixo de 10% é crítico
    low: 20, // Abaixo de 20% é baixo
    normal: 50,
    high: 90,
    full: 100,
  },
  
  // Taxa de consumo em litros/hora
  consumptionRate: {
    low: 5,
    normal: 15,
    high: 30,
    critical: 50,
  },
  
  // Tempo estimado até esvaziar (horas)
  estimatedTime: {
    critical: 2, // Menos de 2 horas
    warning: 6, // Menos de 6 horas
    normal: 24, // Mais de 24 horas
  },
}

export const ALERT_PRIORITIES = {
  info: 0,
  warning: 1,
  critical: 2,
}

// Mensagens de alerta pré-configuradas
export const ALERT_MESSAGES = {
  energy: {
    high: 'Consumo de energia acima do normal',
    critical: 'ALERTA: Consumo de energia crítico!',
    spike: 'Pico de consumo detectado',
    normal: 'Consumo de energia normalizado',
  },
  water: {
    low: 'Nível de água baixo',
    critical: 'ALERTA: Nível de água crítico!',
    full: 'Reservatório cheio',
    leak: 'Possível vazamento detectado',
    normal: 'Nível de água normalizado',
  },
}
