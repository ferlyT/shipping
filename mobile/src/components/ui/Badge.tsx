import React from 'react'
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native'
import { useThemeStore } from '../../theme/themeStore'

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'air' | 'sea'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
  icon?: React.ReactNode
  style?: ViewStyle
  textStyle?: TextStyle
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  icon,
  style,
  textStyle,
}) => {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'

  let borderColor = colors.border
  let textColor = colors.secondary
  let bgColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)'

  if (variant === 'success') {
    borderColor = isDark ? 'rgba(52, 211, 153, 0.4)' : 'rgba(5, 150, 105, 0.3)'
    textColor = colors.success
    bgColor = isDark ? 'rgba(52, 211, 153, 0.1)' : 'rgba(5, 150, 105, 0.08)'
  } else if (variant === 'warning') {
    borderColor = isDark ? 'rgba(251, 191, 36, 0.4)' : 'rgba(217, 119, 6, 0.3)'
    textColor = colors.warning
    bgColor = isDark ? 'rgba(251, 191, 36, 0.1)' : 'rgba(217, 119, 6, 0.08)'
  } else if (variant === 'danger') {
    borderColor = isDark ? 'rgba(248, 113, 113, 0.4)' : 'rgba(220, 38, 38, 0.3)'
    textColor = colors.danger
    bgColor = isDark ? 'rgba(248, 113, 113, 0.1)' : 'rgba(220, 38, 38, 0.08)'
  } else if (variant === 'info') {
    borderColor = isDark ? 'rgba(56, 189, 248, 0.4)' : 'rgba(37, 99, 235, 0.3)'
    textColor = colors.tertiary
    bgColor = isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(37, 99, 235, 0.08)'
  } else if (variant === 'air') {
    borderColor = 'rgba(56, 189, 248, 0.4)'
    textColor = '#38BDF8'
    bgColor = 'rgba(56, 189, 248, 0.1)'
  } else if (variant === 'sea') {
    borderColor = 'rgba(129, 140, 248, 0.4)'
    textColor = '#818CF8'
    bgColor = 'rgba(129, 140, 248, 0.1)'
  }

  return (
    <View
      style={[
        styles.badge,
        {
          borderColor,
          backgroundColor: bgColor,
        },
        style,
      ]}
    >
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <Text
        style={[
          styles.text,
          {
            color: textColor,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  iconContainer: {
    marginRight: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
})
