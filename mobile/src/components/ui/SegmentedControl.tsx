import React from 'react'
import { View, TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useThemeStore } from '../../theme/themeStore'

export interface SegmentOption<T = string> {
  label: string
  value: T
  icon?: React.ReactNode
}

interface SegmentedControlProps<T = string> {
  options: SegmentOption<T>[]
  selectedValue: T
  onValueChange: (value: T) => void
  style?: ViewStyle
}

export function SegmentedControl<T = string>({
  options,
  selectedValue,
  onValueChange,
  style,
}: SegmentedControlProps<T>) {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#101622' : '#EFEFEF',
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const isActive = opt.value === selectedValue
        return (
          <TouchableOpacity
            key={String(opt.value)}
            activeOpacity={0.7}
            onPress={() => {
              if (!isActive) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                onValueChange(opt.value)
              }
            }}
            style={[
              styles.segment,
              isActive && {
                backgroundColor: isDark ? 'rgba(56, 189, 248, 0.12)' : '#FFFFFF',
                borderColor: isDark ? colors.tertiary : '#CBD5E1',
                borderWidth: 1,
              },
            ]}
          >
            {opt.icon ? <View style={styles.icon}>{opt.icon}</View> : null}
            <Text
              style={[
                styles.label,
                {
                  color: isActive ? colors.tertiary : colors.secondary,
                  fontWeight: isActive ? '700' : '500',
                },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  icon: {
    marginRight: 5,
  },
  label: {
    fontSize: 12,
  },
})
