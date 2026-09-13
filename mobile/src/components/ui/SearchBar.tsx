import React, { useState, useEffect } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native'
import { Search, X, ScanLine } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useThemeStore } from '../../theme/themeStore'

interface SearchBarProps {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  onScanPress?: () => void
  debounceMs?: number
  style?: ViewStyle
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Cari...',
  onScanPress,
  debounceMs = 400,
  style,
}) => {
  const { colors } = useThemeStore()
  const [localText, setLocalText] = useState(value)

  useEffect(() => {
    setLocalText(value)
  }, [value])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localText !== value) {
        onChangeText(localText)
      }
    }, debounceMs)
    return () => clearTimeout(timer)
  }, [localText, debounceMs])

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setLocalText('')
    onChangeText('')
  }

  const handleScan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (onScanPress) onScanPress()
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Search size={16} color={colors.secondary} style={styles.searchIcon} />
      <TextInput
        value={localText}
        onChangeText={setLocalText}
        placeholder={placeholder}
        placeholderTextColor={colors.secondary}
        returnKeyType="search"
        onSubmitEditing={() => onChangeText(localText)}
        style={[
          styles.input,
          {
            color: colors.primary,
          },
        ]}
      />
      {localText.length > 0 && (
        <TouchableOpacity onPress={handleClear} style={styles.actionBtn}>
          <X size={15} color={colors.secondary} />
        </TouchableOpacity>
      )}
      {onScanPress && (
        <TouchableOpacity onPress={handleScan} style={styles.scanBtn}>
          <ScanLine size={18} color={colors.tertiary} />
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  actionBtn: {
    padding: 4,
  },
  scanBtn: {
    padding: 6,
    marginLeft: 6,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)',
  },
})
