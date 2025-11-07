/**
 * Supabase Edge Function: IoT Data Ingestion
 * 
 * Recebe dados de sensores IoT (ESP32), valida e armazena no banco.
 * 
 * Deploy Manual via Dashboard:
 * 1. Acesse: https://supabase.com/dashboard/project/ybnobvonfxoqvlimfzpl/functions
 * 2. Clique em "Create a new function"
 * 3. Nome: iot-ingest
 * 4. Cole este código
 * 5. Deploy
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-type',
}

// Rate limiting em memória (em produção, usar Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

interface EnergyPayload {
  device_id: string
  timestamp: string
  readings: {
    current_rms: number
    voltage: number
    power_watts: number
    sample_count?: number
  }
  metadata?: {
    firmware_version?: string
    rssi?: number
    uptime_seconds?: number
  }
}

interface WaterPayload {
  device_id: string
  timestamp: string
  readings: {
    distance_cm: number
    water_level_percent: number
    volume_liters: number
    tank_height_cm: number
    tank_capacity_liters: number
    sample_count?: number
  }
  metadata?: {
    firmware_version?: string
    rssi?: number
    uptime_seconds?: number
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Extrair headers
    const authHeader = req.headers.get('Authorization')
    const deviceType = req.headers.get('X-Device-Type') as 'energy' | 'water'
    
    if (!authHeader || !authHeader.startsWith('Bearer iot_')) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!deviceType || !['energy', 'water'].includes(deviceType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing X-Device-Type header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = authHeader.replace('Bearer ', '')

    // 2. Conectar ao Supabase com service role (bypass RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 3. Validar API Key e obter device_id
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('device_api_keys')
      .select('device_id, is_active, request_count')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single()

    if (apiKeyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const deviceId = apiKeyData.device_id

    const { data: deviceRow, error: deviceError } = await supabase
      .from('devices')
      .select('id, device_type, water_tank_height_cm, water_tank_radius_cm, water_sensor_offset_cm, water_tank_capacity_liters')
      .eq('id', deviceId)
      .maybeSingle()

    if (deviceError || !deviceRow) {
      return new Response(
        JSON.stringify({ error: 'Device not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const deviceTypeMismatch =
      deviceRow.device_type !== deviceType &&
      !(deviceRow.device_type === 'energy' && deviceType === 'water')

    if (deviceTypeMismatch) {
      return new Response(
        JSON.stringify({ error: `Device type mismatch: expected ${deviceRow.device_type}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Rate Limiting (12 req/hora = 1 a cada 5 min)
    const now = Date.now()
    const rateLimitKey = `${deviceId}-${deviceType}`
    const rateLimit = rateLimitMap.get(rateLimitKey)

    if (rateLimit) {
      if (now < rateLimit.resetAt) {
        if (rateLimit.count >= 12) {
          return new Response(
            JSON.stringify({
              error: 'Rate limit exceeded',
              retry_after: Math.ceil((rateLimit.resetAt - now) / 1000),
            }),
            {
              status: 429,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
                'X-RateLimit-Limit': '12',
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(Math.floor(rateLimit.resetAt / 1000)),
              },
            }
          )
        }
        rateLimit.count++
      } else {
        // Reset window
        rateLimitMap.set(rateLimitKey, {
          count: 1,
          resetAt: now + 3600000, // 1 hora
        })
      }
    } else {
      rateLimitMap.set(rateLimitKey, {
        count: 1,
        resetAt: now + 3600000,
      })
    }

    const currentRateLimit = rateLimitMap.get(rateLimitKey)!

    // 5. Parse payload
    const payload = await req.json()

    // 6. Validar payload
    if (deviceType === 'energy') {
      const energyPayload = payload as EnergyPayload

      // Validações
      if (!energyPayload.device_id || !energyPayload.timestamp || !energyPayload.readings) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { current_rms, voltage, power_watts } = energyPayload.readings

      if (
        current_rms < 0 || current_rms > 30 ||
        voltage < 0 || voltage > 380 ||
        power_watts < 0 || power_watts > 100000
      ) {
        return new Response(
          JSON.stringify({
            error: 'Invalid reading values',
            details: {
              current_rms: 'Must be between 0 and 30',
              voltage: 'Must be between 0 and 380',
              power_watts: 'Must be between 0 and 100000',
            },
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // 7. Inserir no banco
      const { data, error } = await supabase
        .from('energy_readings')
        .insert({
          device_id: deviceId,
          timestamp: energyPayload.timestamp,
          current_rms,
          voltage,
          power_watts,
        })
        .select('id')
        .single()

      if (error) {
        console.error('Database error:', error)
        return new Response(
          JSON.stringify({ error: 'Database insertion failed', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // 8. Atualizar contador de requests da API Key
      await supabase
        .from('device_api_keys')
        .update({
          request_count: apiKeyData.request_count + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('device_id', deviceId)

      // 9. Atualizar last_seen do device
      await supabase
        .from('devices')
        .update({
          last_seen: new Date().toISOString(),
          status: 'online',
        })
        .eq('id', deviceId)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Energy reading recorded successfully',
          reading_id: data.id,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': '12',
            'X-RateLimit-Remaining': String(12 - currentRateLimit.count),
            'X-RateLimit-Reset': String(Math.floor(currentRateLimit.resetAt / 1000)),
          },
        }
      )
    } else {
      // Water
      const waterPayload = payload as WaterPayload

      if (!waterPayload.device_id || !waterPayload.timestamp || !waterPayload.readings) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const {
        distance_cm,
        water_level_percent,
        volume_liters,
        tank_height_cm,
        tank_capacity_liters,
      } = waterPayload.readings

      const configuredHeight = Number(deviceRow.water_tank_height_cm ?? tank_height_cm)
      const configuredRadius = deviceRow.water_tank_radius_cm != null
        ? Number(deviceRow.water_tank_radius_cm)
        : null
      const configuredSensorOffset = Number(deviceRow.water_sensor_offset_cm ?? 0)
      const storedCapacity = deviceRow.water_tank_capacity_liters != null
        ? Number(deviceRow.water_tank_capacity_liters)
        : null

      const effectiveHeight = configuredHeight
      const safeDistance = Math.min(Math.max(distance_cm, 0), 1000)
      const computedWaterHeight = Math.max(0, effectiveHeight - configuredSensorOffset - safeDistance)
      const computedLevelPercent = effectiveHeight > 0
        ? Math.max(0, Math.min(100, (computedWaterHeight / effectiveHeight) * 100))
        : water_level_percent
      const computedCapacity = storedCapacity ?? (configuredRadius != null
        ? Math.PI * configuredRadius * configuredRadius * effectiveHeight / 1000
        : tank_capacity_liters)
      const computedVolume = configuredRadius != null
        ? Math.max(0, Math.PI * configuredRadius * configuredRadius * computedWaterHeight / 1000)
        : volume_liters

      if (
        distance_cm < 0 || distance_cm > 1000 ||
        water_level_percent < 0 || water_level_percent > 100 ||
        volume_liters < 0 ||
        tank_height_cm <= 0 || tank_height_cm > 1000 ||
        tank_capacity_liters <= 0 || tank_capacity_liters > 1000000
      ) {
        return new Response(
          JSON.stringify({
            error: 'Invalid reading values',
            details: {
              distance_cm: 'Must be between 0 and 1000',
              water_level_percent: 'Must be between 0 and 100',
              tank_height_cm: 'Must be between 0 and 1000',
            },
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('water_readings')
        .insert({
          device_id: deviceId,
          timestamp: waterPayload.timestamp,
          distance_cm: safeDistance,
          water_level_percent: computedLevelPercent,
          volume_liters: computedVolume,
          tank_height_cm: effectiveHeight,
          tank_capacity_liters: computedCapacity,
          tank_radius_cm: configuredRadius,
          sensor_offset_cm: configuredSensorOffset,
          computed_with_device_profile: deviceRow.water_tank_height_cm != null || deviceRow.water_tank_radius_cm != null,
        })
        .select('id')
        .single()

      if (error) {
        console.error('Database error:', error)
        return new Response(
          JSON.stringify({ error: 'Database insertion failed', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      await supabase
        .from('device_api_keys')
        .update({
          request_count: apiKeyData.request_count + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('device_id', deviceId)

      await supabase
        .from('devices')
        .update({
          last_seen: new Date().toISOString(),
          status: 'online',
        })
        .eq('id', deviceId)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Water reading recorded successfully',
          reading_id: data.id,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': '12',
            'X-RateLimit-Remaining': String(12 - currentRateLimit.count),
            'X-RateLimit-Reset': String(Math.floor(currentRateLimit.resetAt / 1000)),
          },
        }
      )
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
