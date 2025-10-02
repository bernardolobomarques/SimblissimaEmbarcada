/**
 * Componente de Card customizado
 * Card base para exibição de informações
 */

import React from 'react'
import { StyleSheet } from 'react-native'
import { Card as PaperCard } from 'react-native-paper'
import { COLORS } from '../../constants/colors'

interface CardProps {
  children: React.ReactNode
  onPress?: () => void
  elevation?: number
  borderLeftColor?: string
}

export default function Card({
  children,
  onPress,
  elevation = 2,
  borderLeftColor,
}: CardProps) {
  return (
    <PaperCard
      style={[
        styles.card,
        { elevation },
        borderLeftColor ? { borderLeftWidth: 3, borderLeftColor } : undefined,
      ]}
      onPress={onPress}
    >
      {children}
    </PaperCard>
  )
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    backgroundColor: COLORS.white,
    borderRadius: 8,
  },
})
