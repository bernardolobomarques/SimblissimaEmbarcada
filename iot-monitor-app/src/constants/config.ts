/**
 * Configurações gerais do aplicativo IoT Monitor
 * Inclui configuração do Supabase, tarifas e thresholds
 */

export const SUPABASE_CONFIG = {
  url: 'https://ybnobvonfxoqv1iafzpl.supabase.co',
  anonKey: 'YOUR_SUPABASE_ANON_KEY', // TODO: Adicionar chave do dashboard Supabase
  region: 'sa-east-1',
}

export const APP_CONFIG = {
  name: 'IoT Monitor',
  version: '1.0.0',
  energyTariffPerKWh: 0.75, // R$ por kWh (tarifa média brasileira)
  dataRefreshInterval: 5000, // 5 segundos - intervalo de atualização dos dados
  maxHistoricalDays: 30, // Número máximo de dias de histórico
}

export const ALERT_THRESHOLDS = {
  energy: {
    high: 3000, // Watts - consumo alto
    critical: 5000, // Watts - consumo crítico
  },
  water: {
    low: 20, // Percentual - nível baixo
    critical: 10, // Percentual - nível crítico
    high: 95, // Percentual - nível muito alto (quase transbordando)
  },
}
