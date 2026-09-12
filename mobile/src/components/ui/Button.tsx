import React from 'react'
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useThemeStore } from '../../theme/themeStore'

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  icon?: React.ReactNode
  style?: ViewStyle
  textStyle?: TextStyle
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) => {
  const { colors } = useThemeStore()

  const handlePress = () => {
    if (disabled || loading) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress()
  }

  // Variant Styles
  let bg = colors.tertiary
  let textColor = '#FFFFFF'
  let borderColor = 'transparent'
  let borderWidth = 0

  if (variant === 'secondary') {
    bg = colors.surfaceElevated
    textColor = colors.primary
    borderColor = colors.border
    borderWidth = 1
  } else if (variant === 'outline') {
    bg = 'transparent'
    textColor = colors.tertiary
    borderColor = colors.tertiary
    borderWidth = 1
  } else if (variant === 'ghost') {
    bg = 'transparent'
    textColor = colors.secondary
  } else if (variant === 'danger') {
    bg = colors.danger
    textColor = '#FFFFFF'
  }

  // Size Styles
  let py = 10
  let px = 16
  let fontSize = 14

  if (size === 'sm') {
    py = 6
    px = 12
    fontSize = 12
  } else if (size === 'lg') {
    py = 14
    px = 20
    fontSize = 16
  }

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.btn,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth,
          paddingVertical: py,
          paddingHorizontal: px,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon ? <>{icon}</> : null}
          <Text
            style={[
              styles.text,
              {
                color: textColor,
                fontSize,
                marginLeft: icon ? 8 : 0,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  text: {
    fontWeight: '600',
  },
})
