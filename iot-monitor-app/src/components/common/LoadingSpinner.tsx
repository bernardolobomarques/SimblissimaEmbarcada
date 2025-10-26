/**
 * Componente de Loading Spinner
 * Exibido durante carregamento de dados
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { ActivityIndicator, Text } from 'react-native-paper'
import { COLORS } from '../../constants/colors'

interface LoadingSpinnerProps {
  message?: string
  size?: 'small' | 'large'
  color?: string
}

export default function LoadingSpinner({
  message = 'Carregando...',
  size = 'large',
  color = COLORS.primary,
}: LoadingSpinnerProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
})
