/**
 * Hook para subscrições realtime do Supabase
 * Gerencia atualizações em tempo real de leituras e alertas
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

type TableName = 'energy_readings' | 'water_readings' | 'alerts'
type EventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

interface UseRealtimeOptions {
  table: TableName
  event?: EventType
  filter?: string
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
}

export function useRealtime({
  table,
  event = '*',
  filter,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeOptions) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const channelName = `${table}-realtime-${Date.now()}`
      const newChannel = supabase.channel(channelName)

      // Configurar listener para eventos específicos
      if (event === '*' || event === 'INSERT') {
        newChannel.on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table,
            filter,
          },
          (payload) => {
            if (onInsert) onInsert(payload.new)
          }
        )
      }

      if (event === '*' || event === 'UPDATE') {
        newChannel.on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table,
            filter,
          },
          (payload) => {
            if (onUpdate) onUpdate(payload.new)
          }
        )
      }

      if (event === '*' || event === 'DELETE') {
        newChannel.on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table,
            filter,
          },
          (payload) => {
            if (onDelete) onDelete(payload.old)
          }
        )
      }

      // Subscrever ao canal
      newChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true)
        }
      })

      setChannel(newChannel)
    } catch (err: any) {
      setError(err.message || 'Erro ao criar subscrição realtime')
    }

    // Cleanup
    return () => {
      if (channel) {
        channel.unsubscribe()
        setIsSubscribed(false)
      }
    }
  }, [table, event, filter])

  const unsubscribe = useCallback(() => {
    if (channel) {
      channel.unsubscribe()
      setIsSubscribed(false)
    }
  }, [channel])

  return {
    isSubscribed,
    error,
    unsubscribe,
  }
}
