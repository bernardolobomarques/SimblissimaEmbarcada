/**
 * Serviço de autenticação
 * Gerencia login, registro, logout e recuperação de senha
 */

import { supabase } from './supabase'
import { LoginCredentials, RegisterCredentials, AuthResponse } from '../types/auth.types'

export const authService = {
  /**
   * Faz login com email e senha
   */
  async login({ email, password }: LoginCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      return {
        user: data.user,
        session: data.session,
        error: null,
      }
    } catch (error: any) {
      return {
        user: null,
        session: null,
        error,
      }
    }
  },

  /**
   * Registra novo usuário
   */
  async register({ email, password, full_name }: RegisterCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name,
          },
        },
      })
      
      if (error) throw error
      
      return {
        user: data.user,
        session: data.session,
        error: null,
      }
    } catch (error: any) {
      return {
        user: null,
        session: null,
        error,
      }
    }
  },

  /**
   * Faz logout do usuário atual
   */
  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  /**
   * Obtém o usuário atual
   */
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  /**
   * Solicita reset de senha
   */
  async resetPassword(email: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'iotmonitor://reset-password',
      })
      
      if (error) throw error
      
      return { error: null }
    } catch (error: any) {
      return { error }
    }
  },

  /**
   * Atualiza senha do usuário
   */
  async updatePassword(newPassword: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })
      
      if (error) throw error
      
      return { error: null }
    } catch (error: any) {
      return { error }
    }
  },

  /**
   * Verifica se há sessão ativa
   */
  async hasActiveSession(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession()
    return !!session
  },
}
