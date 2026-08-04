/**
 * Hook de autenticação
 * Gerencia estado de autenticação do usuário
 */

import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { User } from '@supabase/supabase-js'
import { USE_MOCK_DATA } from '../constants/config'
import { MOCK_USER } from '../services/mockData'

export function useAuth() {
  const [user, setUser] = useState<User | null>(USE_MOCK_DATA ? MOCK_USER : null)
  const [loading, setLoading] = useState(!USE_MOCK_DATA)

  useEffect(() => {
    if (USE_MOCK_DATA) {
      return
    }

    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
