/**
 * Cliente Supabase configurado para o projeto IoT Monitor
 * Gerencia conexão com backend, autenticação e realtime
 */

import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SUPABASE_CONFIG } from '../constants/config'

/**
 * Cliente Supabase com configuração de AsyncStorage
 * para persistência de sessão em React Native
 */
export const supabase = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)

/**
 * Helper para verificar status de conexão com Supabase
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('devices').select('count').limit(1)
    return !error
  } catch (error) {
    console.error('Erro ao conectar com Supabase:', error)
    return false
  }
}

/**
 * Helper para obter usuário atual
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
