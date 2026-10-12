import React, { useState, useEffect, useRef } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, ViewStyle, Keyboard } from 'react-native'
import { Search, X, ScanLine, Camera } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useThemeStore } from '../../theme/themeStore'

interface SearchBarProps {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  onScanPress?: () => void
  onScanContainerPress?: () => void
  onFocus?: () => void
  debounceMs?: number
  style?: ViewStyle
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Cari...',
  onScanPress,
  onScanContainerPress,
  onFocus,
  debounceMs = 0,
  style,
}) => {
  const { colors } = useThemeStore()
  const [localText, setLocalText] = useState(value)
  const isTypingRef = useRef(false)

  // Sync external value changes (e.g. suggestion selected, cleared)
  useEffect(() => {
    setLocalText(value)
    isTypingRef.current = false
  }, [value])

  // Only debounce if debounceMs > 0 and user is actively typing
  useEffect(() => {
    if (debounceMs <= 0 || !isTypingRef.current) return

    const timer = setTimeout(() => {
      isTypingRef.current = false
      if (localText !== value) {
        onChangeText(localText)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [localText, debounceMs, value, onChangeText])

  const handleChangeText = (text: string) => {
    setLocalText(text)
    if (debounceMs <= 0) {
      isTypingRef.current = false
      onChangeText(text)
    } else {
      isTypingRef.current = true
    }
  }

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    isTypingRef.current = false
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
        onChangeText={handleChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.secondary}
        returnKeyType="search"
        onFocus={onFocus}
        onSubmitEditing={() => {
          onChangeText(localText)
          Keyboard.dismiss()
        }}
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
      {onScanContainerPress && (
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            onScanContainerPress()
          }}
          style={styles.scanBtn}
          accessibilityLabel="Pindai Nomor Kontainer"
        >
          <Camera size={17} color={colors.tertiary} />
        </TouchableOpacity>
      )}
      {onScanPress && (
        <TouchableOpacity onPress={handleScan} style={styles.scanBtn} accessibilityLabel="Pindai Barcode">
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
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
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
    padding: 4,
    marginLeft: 6,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(128,128,128,0.15)',
    paddingLeft: 8,
  },
})
