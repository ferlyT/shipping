import React from 'react'
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native'
import { useThemeStore } from '../../theme/themeStore'

interface CardProps {
  children: React.ReactNode
  style?: ViewStyle
  onPress?: () => void
  elevated?: boolean
}

export const Card: React.FC<CardProps> = ({ children, style, onPress, elevated = false }) => {
  const { colors } = useThemeStore()

  const cardStyle: ViewStyle = {
    backgroundColor: elevated ? colors.surfaceElevated : colors.surface,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  }

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={[cardStyle, style]}>
        {children}
      </TouchableOpacity>
    )
  }

  return <View style={[cardStyle, style]}>{children}</View>
}
