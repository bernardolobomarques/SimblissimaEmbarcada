/**
 * Navegador principal do aplicativo
 * Gerencia navegação entre telas autenticadas
 */

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
import { COLORS } from '../constants/colors'

const Tab = createBottomTabNavigator()

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
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.gray,
          headerShown: true,
          headerStyle: {
            backgroundColor: COLORS.primary,
            elevation: 4,
          },
          headerTintColor: COLORS.white,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
          },
          tabBarStyle: {
            height: 56,
            paddingBottom: 4,
            paddingTop: 4,
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
    </NavigationContainer>
  )
}
