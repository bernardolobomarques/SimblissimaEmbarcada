/**
 * IoT Monitor App
 * Aplicativo Unificado de Monitoramento de Energia e Água
 * 
 * Desenvolvido para SBrT 2025 - IBMEC-RJ
 */

// IMPORTANTE: Polyfill para URL no React Native (necessário para Supabase)
import 'react-native-url-polyfill/auto'

import React, { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { Provider as PaperProvider } from 'react-native-paper'
import AppNavigator from './src/navigation/AppNavigator'
import { COLORS } from './src/constants/colors'

// Configurar tema do Material Design
const theme = {
  colors: {
    primary: COLORS.primary,
    accent: COLORS.secondary,
    background: COLORS.background,
    surface: COLORS.surface,
    text: COLORS.textPrimary,
    error: COLORS.error,
  },
}

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <StatusBar style="light" backgroundColor={COLORS.primary} />
      <AppNavigator />
    </PaperProvider>
  )
}
