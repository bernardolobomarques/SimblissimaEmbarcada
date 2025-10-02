<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# **PRD - React Native App para Monitoramento IoT**

## **Documento de Requisitos do Produto para Desenvolvimento**


***

## **1. VISÃO GERAL DO PROJETO**

### **Nome do Projeto**

IoT Monitor App - Aplicativo Unificado de Monitoramento de Energia e Água

### **Descrição**

Aplicativo móvel React Native que unifica dois sistemas IoT independentes: monitoramento de consumo de energia elétrica (usando ESP8266 + sensor ACS712) e monitoramento de nível de água em reservatórios (usando ESP8266 + sensor HC-SR04). O app será apresentado no simpósio SBrT 2025 no IBMEC-RJ.[^11][^12]

### **Objetivos**

- Fornecer dashboards interativos em tempo real para monitoramento de energia e água
- Implementar sistema de alertas inteligentes para consumo anormal e níveis críticos
- Oferecer análise histórica com gráficos e estatísticas
- Permitir gerenciamento de múltiplos dispositivos IoT
- Interface intuitiva e profissional para demonstração acadêmica

***

## **2. STACK TECNOLÓGICO**

### **Frontend**

- **React Native**: 0.72+
- **Expo**: SDK 49+ (para desenvolvimento rápido e deploy)
- **TypeScript**: Para type safety
- **React Navigation**: v6 (navegação entre telas)
- **React Native Paper**: Componentes Material Design
- **React Native Chart Kit** ou **Victory Native**: Gráficos e visualizações
- **AsyncStorage**: Cache local


### **Backend**

- **Supabase** (Backend-as-a-Service)
    - PostgreSQL Database
    - REST API
    - Realtime Subscriptions
    - Authentication


### **Bibliotecas Principais**

```json
{
  "@react-navigation/native": "^6.1.0",
  "@react-navigation/bottom-tabs": "^6.5.0",
  "@react-navigation/native-stack": "^6.9.0",
  "@supabase/supabase-js": "^2.38.0",
  "@react-native-async-storage/async-storage": "^1.19.0",
  "react-native-paper": "^5.10.0",
  "react-native-chart-kit": "^6.12.0",
  "react-native-svg": "^13.14.0",
  "expo-notifications": "^0.20.0",
  "date-fns": "^2.30.0",
  "formik": "^2.4.0",
  "yup": "^1.3.0"
}
```


### **Configuração do Supabase**

- **URL**: `https://ybnobvonfxoqv1iafzpl.supabase.co`
- **Database**: PostgreSQL na região `sa-east-1` (São Paulo)
- **Autenticação**: JWT com Row Level Security (RLS)
[^11]

***

## **3. ESTRUTURA DE PASTAS**

```
iot-monitor-app/
├── src/
│   ├── components/           # Componentes reutilizáveis
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── energy/
│   │   │   ├── PowerGauge.tsx
│   │   │   ├── EnergyChart.tsx
│   │   │   └── ConsumptionCard.tsx
│   │   ├── water/
│   │   │   ├── WaterTank.tsx
│   │   │   ├── WaterLevelChart.tsx
│   │   │   └── VolumeCard.tsx
│   │   └── alerts/
│   │       ├── AlertCard.tsx
│   │       └── AlertBadge.tsx
│   ├── screens/              # Telas principais
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── RegisterScreen.tsx
│   │   ├── home/
│   │   │   └── HomeScreen.tsx
│   │   ├── energy/
│   │   │   └── EnergyMonitorScreen.tsx
│   │   ├── water/
│   │   │   └── WaterMonitorScreen.tsx
│   │   ├── alerts/
│   │   │   └── AlertsScreen.tsx
│   │   └── settings/
│   │       ├── SettingsScreen.tsx
│   │       ├── ProfileScreen.tsx
│   │       └── DevicesScreen.tsx
│   ├── navigation/           # Configuração de navegação
│   │   ├── AppNavigator.tsx
│   │   └── AuthNavigator.tsx
│   ├── services/             # Serviços e API
│   │   ├── supabase.ts
│   │   ├── auth.service.ts
│   │   ├── energy.service.ts
│   │   ├── water.service.ts
│   │   └── alerts.service.ts
│   ├── hooks/                # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useEnergyData.ts
│   │   ├── useWaterData.ts
│   │   ├── useRealtime.ts
│   │   └── useNotifications.ts
│   ├── types/                # TypeScript types
│   │   ├── energy.types.ts
│   │   ├── water.types.ts
│   │   ├── auth.types.ts
│   │   └── device.types.ts
│   ├── utils/                # Funções utilitárias
│   │   ├── calculations.ts
│   │   ├── formatters.ts
│   │   └── validators.ts
│   ├── constants/            # Constantes
│   │   ├── colors.ts
│   │   ├── config.ts
│   │   └── thresholds.ts
│   └── App.tsx               # Entry point
├── assets/                   # Imagens, fontes, etc
├── app.json
├── package.json
└── tsconfig.json
```


***

## **4. CONFIGURAÇÃO INICIAL**

### **Arquivo: `src/constants/config.ts`**

```typescript
export const SUPABASE_CONFIG = {
  url: 'https://ybnobvonfxoqv1iafzpl.supabase.co',
  anonKey: 'YOUR_SUPABASE_ANON_KEY', // Adicionar chave do dashboard
  region: 'sa-east-1',
}

export const APP_CONFIG = {
  name: 'IoT Monitor',
  version: '1.0.0',
  energyTariffPerKWh: 0.75, // R$ por kWh
  dataRefreshInterval: 5000, // 5 segundos
  maxHistoricalDays: 30,
}

export const ALERT_THRESHOLDS = {
  energy: {
    high: 3000, // Watts
    critical: 5000,
  },
  water: {
    low: 20, // Percentual
    critical: 10,
    high: 95,
  },
}
```


### **Arquivo: `src/services/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SUPABASE_CONFIG } from '../constants/config'

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
```


***

## **5. SCHEMAS DE TIPOS TYPESCRIPT**

### **Arquivo: `src/types/energy.types.ts`**

```typescript
export interface EnergyReading {
  id: number
  device_id: string
  timestamp: string
  current_rms: number
  voltage: number
  power_watts: number
  energy_kwh?: number
  appliance_name?: string
}

export interface EnergyStats {
  total_kwh: number
  avg_power_watts: number
  max_power_watts: number
  reading_count: number
  estimated_cost: number
}
```


### **Arquivo: `src/types/water.types.ts`**

```typescript
export interface WaterReading {
  id: number
  device_id: string
  timestamp: string
  distance_cm: number
  water_level_percent: number
  volume_liters: number
  tank_height_cm: number
  tank_capacity_liters: number
}

export interface WaterStats {
  current_level: number
  current_volume: number
  daily_consumption: number
  avg_level: number
  estimated_empty_hours: number
}
```


### **Arquivo: `src/types/auth.types.ts`**

```typescript
export interface User {
  id: string
  email: string
  full_name?: string
  created_at: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials extends LoginCredentials {
  full_name: string
}
```


### **Arquivo: `src/types/device.types.ts`**

```typescript
export type DeviceType = 'energy' | 'water'

export interface Device {
  id: string
  user_id: string
  device_type: DeviceType
  device_name: string
  location?: string
  is_active: boolean
  created_at: string
}

export interface Alert {
  id: number
  user_id: string
  device_id: string
  alert_type: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  is_read: boolean
  created_at: string
}
```


***

## **6. NAVEGAÇÃO**

### **Arquivo: `src/navigation/AppNavigator.tsx`**

```typescript
import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useAuth } from '../hooks/useAuth'
import AuthNavigator from './AuthNavigator'
import HomeScreen from '../screens/home/HomeScreen'
import EnergyMonitorScreen from '../screens/energy/EnergyMonitorScreen'
import WaterMonitorScreen from '../screens/water/WaterMonitorScreen'
import AlertsScreen from '../screens/alerts/AlertsScreen'
import SettingsScreen from '../screens/settings/SettingsScreen'
import { Ionicons } from '@expo/vector-icons'

const Tab = createBottomTabNavigator()

export default function AppNavigator() {
  const { user } = useAuth()

  if (!user) {
    return <AuthNavigator />
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap

            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline'
            } else if (route.name === 'Energia') {
              iconName = focused ? 'flash' : 'flash-outline'
            } else if (route.name === 'Água') {
              iconName = focused ? 'water' : 'water-outline'
            } else if (route.name === 'Alertas') {
              iconName = focused ? 'notifications' : 'notifications-outline'
            } else {
              iconName = focused ? 'settings' : 'settings-outline'
            }

            return <Ionicons name={iconName} size={size} color={color} />
          },
          tabBarActiveTintColor: '#2196F3',
          tabBarInactiveTintColor: 'gray',
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Energia" component={EnergyMonitorScreen} />
        <Tab.Screen name="Água" component={WaterMonitorScreen} />
        <Tab.Screen name="Alertas" component={AlertsScreen} />
        <Tab.Screen name="Configurações" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  )
}
```


***

## **7. AUTENTICAÇÃO**

### **Arquivo: `src/services/auth.service.ts`**

```typescript
import { supabase } from './supabase'
import { LoginCredentials, RegisterCredentials } from '../types/auth.types'

export const authService = {
  async login({ email, password }: LoginCredentials) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    return data
  },

  async register({ email, password, full_name }: RegisterCredentials) {
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
    return data
  },

  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },
}
```


### **Arquivo: `src/hooks/useAuth.ts`**

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
```


***

## **8. TELA DE LOGIN**

### **Arquivo: `src/screens/auth/LoginScreen.tsx`**

```typescript
import React, { useState } from 'react'
import { View, StyleSheet, Alert } from 'react-native'
import { TextInput, Button, Title } from 'react-native-paper'
import { authService } from '../../services/auth.service'

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha todos os campos')
      return
    }

    setLoading(true)
    try {
      await authService.login({ email, password })
      // Navegação será tratada automaticamente pelo useAuth
    } catch (error: any) {
      Alert.alert('Erro no login', error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Title style={styles.title}>IoT Monitor</Title>
      
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      
      <TextInput
        label="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      
      <Button
        mode="contained"
        onPress={handleLogin}
        loading={loading}
        style={styles.button}
      >
        Entrar
      </Button>
      
      <Button
        mode="text"
        onPress={() => navigation.navigate('Register')}
      >
        Criar conta
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    textAlign: 'center',
    marginBottom: 30,
    fontSize: 28,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
    paddingVertical: 5,
  },
})
```


***

## **9. TELA HOME (DASHBOARD PRINCIPAL)**

### **Arquivo: `src/screens/home/HomeScreen.tsx`**

```typescript
import React, { useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { Card, Title, Paragraph, Badge } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import { supabase } from '../../services/supabase'
import { Device } from '../../types/device.types'

export default function HomeScreen() {
  const [devices, setDevices] = useState<Device[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [energyPower, setEnergyPower] = useState(0)
  const [waterLevel, setWaterLevel] = useState(0)
  const navigation = useNavigation()

  useEffect(() => {
    loadDevices()
    loadLatestReadings()
  }, [])

  const loadDevices = async () => {
    const { data } = await supabase
      .from('devices')
      .select('*')
      .eq('is_active', true)
    
    setDevices(data || [])
  }

  const loadLatestReadings = async () => {
    // Buscar última leitura de energia
    const { data: energyData } = await supabase
      .from('energy_readings')
      .select('power_watts')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()
    
    if (energyData) setEnergyPower(energyData.power_watts)

    // Buscar última leitura de água
    const { data: waterData } = await supabase
      .from('water_readings')
      .select('water_level_percent')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()
    
    if (waterData) setWaterLevel(waterData.water_level_percent)
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadLatestReadings()
    setRefreshing(false)
  }

  const energyDevices = devices.filter(d => d.device_type === 'energy')
  const waterDevices = devices.filter(d => d.device_type === 'water')

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Title style={styles.header}>Dashboard IoT</Title>

      {/* Card Energia */}
      <Card
        style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#FFA500' }]}
        onPress={() => navigation.navigate('Energia' as never)}
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title>⚡ Monitoramento de Energia</Title>
            <Badge style={{ backgroundColor: '#4CAF50' }}>
              {energyDevices.length} online
            </Badge>
          </View>
          <Paragraph style={styles.powerValue}>
            {energyPower.toFixed(1)} W
          </Paragraph>
          <Paragraph>Potência atual</Paragraph>
        </Card.Content>
      </Card>

      {/* Card Água */}
      <Card
        style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#2196F3' }]}
        onPress={() => navigation.navigate('Água' as never)}
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title>💧 Monitoramento de Água</Title>
            <Badge style={{ backgroundColor: '#4CAF50' }}>
              {waterDevices.length} online
            </Badge>
          </View>
          <Paragraph style={styles.powerValue}>
            {waterLevel.toFixed(1)}%
          </Paragraph>
          <Paragraph>Nível atual do reservatório</Paragraph>
        </Card.Content>
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
  },
  card: {
    marginBottom: 16,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  powerValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
  },
})
```


***

## **10. MONITORAMENTO DE ENERGIA**

### **Arquivo: `src/screens/energy/EnergyMonitorScreen.tsx`**

```typescript
import React, { useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native'
import { Card, Title, Paragraph } from 'react-native-paper'
import { LineChart } from 'react-native-chart-kit'
import { supabase } from '../../services/supabase'
import { EnergyReading } from '../../types/energy.types'
import { format } from 'date-fns'

const screenWidth = Dimensions.get('window').width

export default function EnergyMonitorScreen() {
  const [readings, setReadings] = useState<EnergyReading[]>([])
  const [currentPower, setCurrentPower] = useState(0)
  const [dailyConsumption, setDailyConsumption] = useState(0)
  const [estimatedCost, setEstimatedCost] = useState(0)

  useEffect(() => {
    loadData()
    
    // Subscrever a atualizações em tempo real
    const channel = supabase
      .channel('energy-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'energy_readings',
        },
        (payload) => {
          const newReading = payload.new as EnergyReading
          setCurrentPower(newReading.power_watts)
          setReadings(prev => [newReading, ...prev].slice(0, 50))
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const loadData = async () => {
    // Últimas 50 leituras
    const { data } = await supabase
      .from('energy_readings')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50)
    
    if (data) {
      setReadings(data)
      if (data.length > 0) {
        setCurrentPower(data[^0].power_watts)
      }
    }

    // Consumo diário usando função do banco
    const { data: statsData } = await supabase.rpc(
      'calculate_energy_consumption',
      {
        device_id_param: 'YOUR_DEVICE_ID',
        start_time: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
        end_time: new Date().toISOString(),
      }
    )

    if (statsData && statsData.length > 0) {
      const consumption = statsData[^0].total_kwh || 0
      setDailyConsumption(consumption)
      setEstimatedCost(consumption * 0.75) // R$ 0.75 por kWh
    }
  }

  // Preparar dados para o gráfico
  const chartData = {
    labels: readings.slice(0, 10).reverse().map((r, i) => 
      format(new Date(r.timestamp), 'HH:mm')
    ),
    datasets: [{
      data: readings.slice(0, 10).reverse().map(r => r.power_watts),
    }],
  }

  return (
    <ScrollView style={styles.container}>
      <Title style={styles.title}>Monitoramento de Energia</Title>

      {/* Card de Potência Atual */}
      <Card style={styles.card}>
        <Card.Content>
          <Paragraph>Potência Atual</Paragraph>
          <Title style={styles.bigNumber}>{currentPower.toFixed(1)} W</Title>
        </Card.Content>
      </Card>

      {/* Card de Consumo Diário */}
      <Card style={styles.card}>
        <Card.Content>
          <Paragraph>Consumo Hoje</Paragraph>
          <Title style={styles.bigNumber}>{dailyConsumption.toFixed(2)} kWh</Title>
          <Paragraph>Custo estimado: R$ {estimatedCost.toFixed(2)}</Paragraph>
        </Card.Content>
      </Card>

      {/* Gráfico */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Últimas 10 Leituras</Title>
          {readings.length > 0 && (
            <LineChart
              data={chartData}
              width={screenWidth - 60}
              height={220}
              chartConfig={{
                backgroundColor: '#FFA500',
                backgroundGradientFrom: '#FFB84D',
                backgroundGradientTo: '#FFA500',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
              }}
              bezier
              style={styles.chart}
            />
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 3,
  },
  bigNumber: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFA500',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
})
```


***

## **11. MONITORAMENTO DE ÁGUA**

### **Arquivo: `src/screens/water/WaterMonitorScreen.tsx`**

```typescript
import React, { useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native'
import { Card, Title, Paragraph, ProgressBar } from 'react-native-paper'
import { LineChart } from 'react-native-chart-kit'
import { supabase } from '../../services/supabase'
import { WaterReading } from '../../types/water.types'
import { format } from 'date-fns'

const screenWidth = Dimensions.get('window').width

export default function WaterMonitorScreen() {
  const [readings, setReadings] = useState<WaterReading[]>([])
  const [currentLevel, setCurrentLevel] = useState(0)
  const [currentVolume, setCurrentVolume] = useState(0)

  useEffect(() => {
    loadData()
    
    // Subscrever a atualizações em tempo real
    const channel = supabase
      .channel('water-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'water_readings',
        },
        (payload) => {
          const newReading = payload.new as WaterReading
          setCurrentLevel(newReading.water_level_percent)
          setCurrentVolume(newReading.volume_liters)
          setReadings(prev => [newReading, ...prev].slice(0, 50))
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const loadData = async () => {
    const { data } = await supabase
      .from('water_readings')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50)
    
    if (data) {
      setReadings(data)
      if (data.length > 0) {
        setCurrentLevel(data[^0].water_level_percent)
        setCurrentVolume(data[^0].volume_liters)
      }
    }
  }

  const getLevelColor = () => {
    if (currentLevel < 10) return '#F44336'
    if (currentLevel < 20) return '#FF9800'
    return '#4CAF50'
  }

  const chartData = {
    labels: readings.slice(0, 10).reverse().map((r, i) => 
      format(new Date(r.timestamp), 'HH:mm')
    ),
    datasets: [{
      data: readings.slice(0, 10).reverse().map(r => r.water_level_percent),
    }],
  }

  return (
    <ScrollView style={styles.container}>
      <Title style={styles.title}>Monitoramento de Água</Title>

      {/* Visualização do Tanque */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Nível do Reservatório</Title>
          <View style={styles.tankContainer}>
            <View style={styles.tank}>
              <View
                style={[
                  styles.water,
                  {
                    height: `${currentLevel}%`,
                    backgroundColor: getLevelColor(),
                  },
                ]}
              />
            </View>
            <Title style={[styles.levelText, { color: getLevelColor() }]}>
              {currentLevel.toFixed(1)}%
            </Title>
          </View>
          <ProgressBar
            progress={currentLevel / 100}
            color={getLevelColor()}
            style={styles.progressBar}
          />
          <Paragraph style={styles.volumeText}>
            Volume: {currentVolume.toFixed(0)} litros
          </Paragraph>
        </Card.Content>
      </Card>

      {/* Gráfico de Histórico */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Variação do Nível</Title>
          {readings.length > 0 && (
            <LineChart
              data={chartData}
              width={screenWidth - 60}
              height={220}
              chartConfig={{
                backgroundColor: '#2196F3',
                backgroundGradientFrom: '#64B5F6',
                backgroundGradientTo: '#2196F3',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
              }}
              bezier
              style={styles.chart}
            />
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 3,
  },
  tankContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  tank: {
    width: 120,
    height: 200,
    borderWidth: 3,
    borderColor: '#333',
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: '#E0E0E0',
  },
  water: {
    width: '100%',
  },
  levelText: {
    fontSize: 48,
    fontWeight: 'bold',
    marginTop: 10,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    marginVertical: 10,
  },
  volumeText: {
    fontSize: 16,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
})
```


***

## **12. SISTEMA DE ALERTAS**

### **Arquivo: `src/screens/alerts/AlertsScreen.tsx`**

```typescript
import React, { useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { Card, Title, Paragraph, Chip, IconButton } from 'react-native-paper'
import { supabase } from '../../services/supabase'
import { Alert } from '../../types/device.types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadAlerts()
    
    // Subscrever a novos alertas
    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          const newAlert = payload.new as Alert
          setAlerts(prev => [newAlert, ...prev])
          // Trigger notificação push aqui
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const loadAlerts = async () => {
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (data) setAlerts(data)
  }

  const markAsRead = async (alertId: number) => {
    await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('id', alertId)
    
    setAlerts(prev =>
      prev.map(alert =>
        alert.id === alertId ? { ...alert, is_read: true } : alert
      )
    )
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadAlerts()
    setRefreshing(false)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#F44336'
      case 'warning': return '#FF9800'
      default: return '#2196F3'
    }
  }

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical': return 'Crítico'
      case 'warning': return 'Atenção'
      default: return 'Info'
    }
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Title style={styles.title}>Alertas</Title>

      {alerts.map(alert => (
        <Card
          key={alert.id}
          style={[
            styles.card,
            !alert.is_read && styles.unreadCard,
            { borderLeftWidth: 4, borderLeftColor: getSeverityColor(alert.severity) }
          ]}
        >
          <Card.Content>
            <View style={styles.alertHeader}>
              <Chip
                style={{
                  backgroundColor: getSeverityColor(alert.severity),
                }}
                textStyle={{ color: '#fff' }}
              >
                {getSeverityLabel(alert.severity)}
              </Chip>
              {!alert.is_read && (
                <IconButton
                  icon="check"
                  size={20}
                  onPress={() => markAsRead(alert.id)}
                />
              )}
            </View>
            <Paragraph style={styles.message}>{alert.message}</Paragraph>
            <Paragraph style={styles.timestamp}>
              {format(new Date(alert.created_at), "dd/MM/yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            </Paragraph>
          </Card.Content>
        </Card>
      ))}

      {alerts.length === 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Paragraph style={styles.emptyText}>
              Nenhum alerta no momento
            </Paragraph>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: '#FFF9C4',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    marginVertical: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginVertical: 20,
  },
})
```


***

## **13. CONFIGURAÇÕES**

### **Arquivo: `src/screens/settings/SettingsScreen.tsx`**

```typescript
import React from 'react'
import { View, ScrollView, StyleSheet, Alert } from 'react-native'
import { List, Divider, Avatar } from 'react-native-paper'
import { useAuth } from '../../hooks/useAuth'
import { authService } from '../../services/auth.service'

export default function SettingsScreen({ navigation }: any) {
  const { user } = useAuth()

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Deseja realmente sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await authService.logout()
          },
        },
      ]
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar.Text
          size={80}
          label={user?.email?.charAt(0).toUpperCase() || 'U'}
        />
      </View>

      <List.Section>
        <List.Subheader>Conta</List.Subheader>
        <List.Item
          title="Perfil"
          description={user?.email}
          left={props => <List.Icon {...props} icon="account" />}
          onPress={() => navigation.navigate('Profile')}
        />
        <Divider />
        <List.Item
          title="Dispositivos"
          description="Gerenciar dispositivos IoT"
          left={props => <List.Icon {...props} icon="devices" />}
          onPress={() => navigation.navigate('Devices')}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Preferências</List.Subheader>
        <List.Item
          title="Tarifa de Energia"
          description="R$ 0,75 por kWh"
          left={props => <List.Icon {...props} icon="currency-brl" />}
        />
        <Divider />
        <List.Item
          title="Notificações"
          description="Configurar alertas"
          left={props => <List.Icon {...props} icon="bell" />}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Item
          title="Sair"
          left={props => <List.Icon {...props} icon="logout" color="#F44336" />}
          titleStyle={{ color: '#F44336' }}
          onPress={handleLogout}
        />
      </List.Section>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
})
```


***

## **14. INSTRUÇÕES DE IMPLEMENTAÇÃO**

### **Passo 1: Setup Inicial**

```bash
# Criar projeto Expo
npx create-expo-app iot-monitor-app --template blank-typescript
cd iot-monitor-app

# Instalar dependências
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack
npm install @supabase/supabase-js @react-native-async-storage/async-storage
npm install react-native-paper react-native-chart-kit react-native-svg
npm install date-fns
npm install expo-notifications
npx expo install react-native-screens react-native-safe-area-context
```


### **Passo 2: Configurar Supabase**

1. Obter `SUPABASE_ANON_KEY` no dashboard do Supabase
2. Adicionar no arquivo `src/constants/config.ts`
3. Criar as tabelas no SQL Editor do Supabase (schemas fornecidos anteriormente)

### **Passo 3: Implementar Autenticação**

- Criar `AuthNavigator.tsx` com LoginScreen e RegisterScreen
- Implementar hook `useAuth` para gerenciar estado de autenticação
- Configurar proteção de rotas


### **Passo 4: Desenvolver Telas Principais**

- HomeScreen: Dashboard com cards dos projetos
- EnergyMonitorScreen: Monitoramento de energia com gráficos
- WaterMonitorScreen: Monitoramento de água com animação de tanque
- AlertsScreen: Lista de alertas com filtros
- SettingsScreen: Configurações e gerenciamento


### **Passo 5: Implementar Realtime**

- Configurar subscriptions do Supabase Realtime
- Criar hooks customizados para cada tipo de dado
- Implementar auto-refresh nos dashboards


### **Passo 6: Configurar Notificações Push**

```typescript
import * as Notifications from 'expo-notifications'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})
```


### **Passo 7: Testes e Deploy**

- Testar em dispositivos reais iOS e Android
- Configurar build com `eas build`
- Deploy para TestFlight/Google Play Console

***

## **15. FUNCIONALIDADES OBRIGATÓRIAS**

### **Autenticação ✓**

- Login com email e senha
- Registro de novos usuários
- Logout
- Persistência de sessão


### **Dashboard Home ✓**

- Cards separados para Energia e Água
- Indicadores de status dos dispositivos
- Valores em tempo real
- Navegação para telas detalhadas


### **Monitoramento de Energia ✓**

- Potência instantânea em Watts
- Consumo acumulado em kWh
- Custo estimado
- Gráfico de histórico
- Alertas de consumo alto
- Atualização em tempo real


### **Monitoramento de Água ✓**

- Nível percentual do reservatório
- Volume em litros
- Visualização animada do tanque
- Gráfico de variação
- Alertas de nível baixo/crítico
- Atualização em tempo real


### **Sistema de Alertas ✓**

- Lista de notificações
- Severidade visual (crítico/atenção/info)
- Marcar como lido
- Push notifications
- Histórico completo


### **Configurações ✓**

- Perfil do usuário
- Gerenciamento de dispositivos
- Preferências de tarifa
- Logout

***

## **16. CRITÉRIOS DE SUCESSO**

✅ App compila e roda sem erros no iOS e Android
✅ Autenticação funciona corretamente com Supabase
✅ Dados dos ESP8266 aparecem em tempo real
✅ Gráficos renderizam corretamente
✅ Alertas são gerados automaticamente
✅ Navegação fluida entre todas as telas
✅ Interface responsiva e profissional
✅ Realtime updates funcionando (< 2s latência)
✅ App não crasha durante demonstração
✅ Performance aceitável (60fps na maioria das telas)

***

**Este PRD contém todas as informações necessárias para uma IA ou desenvolvedor implementar o aplicativo React Native completo de monitoramento IoT**.[^2][^4][^5][^12][^13][^11]
<span style="display:none">[^1][^10][^3][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://www.designveloper.com/blog/react-native-app-examples/

[^2]: https://www.expertappdevs.com/blog/nowadays-react-native-is-a-good-choice-for-iot-project

[^3]: https://www.reddit.com/r/reactnative/comments/l7p5od/how_to_create_a_react_native_template/

[^4]: https://www.brilworks.com/blog/react-native-app-development-for-iot-and-wearable-technology/

[^5]: https://cedalo.com/blog/mqtt-react-native-guide/

[^6]: https://pagepro.co/blog/react-native-apps/

[^7]: https://reactnative.dev/docs/getting-started

[^8]: https://blog.back4app.com/pt/top-10-templates-para-seu-aplicativo-react-native/

[^9]: https://www.resolutesoftware.com/media/b4mdmdxw/react-whitepaper-compressed.pdf

[^10]: https://github.com/exemplar-codes/RNTemplate

[^11]: image.jpg

[^12]: SBrT2026_IOT_Based_Smart_Water_Tank_Monitoring_System_G6__IBM3119_2025_2.pdf

[^13]: https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native

