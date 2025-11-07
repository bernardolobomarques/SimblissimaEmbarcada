/**
 * Navegador principal do aplicativo
 * Gerencia navegação entre telas autenticadas
 */

import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator, type BottomTabNavigationOptions } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '../hooks/useAuth'
import AuthNavigator from './AuthNavigator'
import HomeScreen from '../screens/home/HomeScreen'
import EnergyMonitorScreen from '../screens/energy/EnergyMonitorScreen'
import WaterMonitorScreen from '../screens/water/WaterMonitorScreen'
import AlertsScreen from '../screens/alerts/AlertsScreen'
import SettingsScreen from '../screens/settings/SettingsScreen'
import DeviceConfigScreen from '../screens/settings/DeviceConfigScreen'
import WaterDeviceConfigScreen from '../screens/settings/WaterDeviceConfigScreen'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../constants/colors'

const Tab = createBottomTabNavigator()
const RootStack = createNativeStackNavigator()

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }): BottomTabNavigationOptions => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline'
              break
            case 'Energia':
              iconName = focused ? 'flash' : 'flash-outline'
              break
            case 'Água':
              iconName = focused ? 'water' : 'water-outline'
              break
            case 'Alertas':
              iconName = focused ? 'notifications' : 'notifications-outline'
              break
            default:
              iconName = focused ? 'settings' : 'settings-outline'
          }

          return <Ionicons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        headerShown: true,
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen
        name="Energia"
        component={EnergyMonitorScreen}
        options={{ title: 'Energia' }}
      />
      <Tab.Screen
        name="Água"
        component={WaterMonitorScreen}
        options={{ title: 'Água' }}
      />
      <Tab.Screen
        name="Alertas"
        component={AlertsScreen}
        options={{ title: 'Alertas' }}
      />
      <Tab.Screen
        name="Configurações"
        component={SettingsScreen}
        options={{ title: 'Configurações' }}
      />
    </Tab.Navigator>
  )
}

export default function AppNavigator() {
  const { user } = useAuth()

  if (!user) {
    return (
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    )
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator>
        <RootStack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <RootStack.Screen
          name="DeviceConfig"
          component={DeviceConfigScreen}
          options={{
            title: 'Configuração de Corrente',
            headerStyle: { backgroundColor: COLORS.primary },
            headerTintColor: COLORS.white,
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        />
        <RootStack.Screen
          name="WaterDeviceConfig"
          component={WaterDeviceConfigScreen}
          options={{
            title: 'Configuração do Reservatório',
            headerStyle: { backgroundColor: COLORS.water },
            headerTintColor: COLORS.white,
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  )
}
