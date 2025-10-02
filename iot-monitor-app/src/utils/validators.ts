/**
 * Funções de validação
 */

/**
 * Valida email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Valida senha (mínimo 6 caracteres)
 */
export function validatePassword(password: string): boolean {
  return password.length >= 6
}

/**
 * Valida nome (mínimo 2 caracteres)
 */
export function validateName(name: string): boolean {
  return name.trim().length >= 2
}

/**
 * Valida número positivo
 */
export function validatePositiveNumber(value: number): boolean {
  return !isNaN(value) && value > 0
}

/**
 * Valida porcentagem (0-100)
 */
export function validatePercentage(value: number): boolean {
  return !isNaN(value) && value >= 0 && value <= 100
}

/**
 * Valida campo obrigatório
 */
export function validateRequired(value: any): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0
  }
  return value !== null && value !== undefined
}

/**
 * Valida device_id
 */
export function validateDeviceId(deviceId: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(deviceId)
}

/**
 * Retorna mensagem de erro para email
 */
export function getEmailError(email: string): string | null {
  if (!validateRequired(email)) {
    return 'Email é obrigatório'
  }
  if (!validateEmail(email)) {
    return 'Email inválido'
  }
  return null
}

/**
 * Retorna mensagem de erro para senha
 */
export function getPasswordError(password: string): string | null {
  if (!validateRequired(password)) {
    return 'Senha é obrigatória'
  }
  if (!validatePassword(password)) {
    return 'Senha deve ter no mínimo 6 caracteres'
  }
  return null
}

/**
 * Retorna mensagem de erro para nome
 */
export function getNameError(name: string): string | null {
  if (!validateRequired(name)) {
    return 'Nome é obrigatório'
  }
  if (!validateName(name)) {
    return 'Nome deve ter no mínimo 2 caracteres'
  }
  return null
}
