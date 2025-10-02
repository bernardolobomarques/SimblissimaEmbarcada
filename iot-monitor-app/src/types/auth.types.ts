/**
 * Types para autenticação e usuários
 * Integração com Supabase Auth
 */

import { User as SupabaseUser } from '@supabase/supabase-js'

export interface User {
  id: string
  email: string
  full_name?: string
  created_at: string
  updated_at?: string
  avatar_url?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials extends LoginCredentials {
  full_name: string
}

export interface AuthState {
  user: SupabaseUser | null
  loading: boolean
  error: string | null
}

export interface AuthResponse {
  user: SupabaseUser | null
  session: any | null
  error: Error | null
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordUpdateRequest {
  current_password: string
  new_password: string
}

export interface UserProfile {
  user_id: string
  full_name: string
  email: string
  phone?: string
  address?: string
  created_at: string
  updated_at: string
}
