/**
 * Funções utilitárias para formatação de dados
 */

import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Formata número com casas decimais
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals)
}

/**
 * Formata valor monetário em Reais
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/**
 * Formata potência (Watts ou kW)
 */
export function formatPower(watts: number): string {
  if (watts >= 1000) {
    return `${formatNumber(watts / 1000, 2)} kW`
  }
  return `${formatNumber(watts, 1)} W`
}

/**
 * Formata energia em kWh
 */
export function formatEnergy(kWh: number): string {
  return `${formatNumber(kWh, 2)} kWh`
}

/**
 * Formata volume em litros
 */
export function formatVolume(liters: number): string {
  return `${formatNumber(liters, 0)} L`
}

/**
 * Formata percentual
 */
export function formatPercent(value: number): string {
  return `${formatNumber(value, 1)}%`
}

/**
 * Formata data e hora
 */
export function formatDateTime(dateString: string): string {
  return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", {
    locale: ptBR,
  })
}

/**
 * Formata apenas data
 */
export function formatDate(dateString: string): string {
  return format(new Date(dateString), 'dd/MM/yyyy', {
    locale: ptBR,
  })
}

/**
 * Formata apenas hora
 */
export function formatTime(dateString: string): string {
  return format(new Date(dateString), 'HH:mm', {
    locale: ptBR,
  })
}

/**
 * Formata tempo relativo (ex: "há 5 minutos")
 */
export function formatRelativeTime(dateString: string): string {
  return formatDistanceToNow(new Date(dateString), {
    addSuffix: true,
    locale: ptBR,
  })
}

/**
 * Formata duração em horas e minutos
 */
export function formatDuration(hours: number): string {
  if (hours === Infinity) {
    return 'Indeterminado'
  }
  
  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)
  
  if (wholeHours === 0) {
    return `${minutes} min`
  }
  
  if (minutes === 0) {
    return `${wholeHours} h`
  }
  
  return `${wholeHours} h ${minutes} min`
}

/**
 * Formata número grande (ex: 1000 => 1k, 1000000 => 1M)
 */
export function formatCompactNumber(value: number): string {
  if (value >= 1000000) {
    return `${formatNumber(value / 1000000, 1)}M`
  }
  if (value >= 1000) {
    return `${formatNumber(value / 1000, 1)}k`
  }
  return formatNumber(value, 0)
}

/**
 * Trunca texto com ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength - 3) + '...'
}
