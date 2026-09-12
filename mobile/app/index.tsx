import React from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { Redirect } from 'expo-router'
import { Package } from 'lucide-react-native'
import { useAuthStore } from '../src/stores/authStore'
import { useThemeStore } from '../src/theme/themeStore'

export default function Index() {
  const { isAuthenticated, isInitialized } = useAuthStore()
  const { colors, mode } = useThemeStore()

  if (!isInitialized) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: mode === 'midnight' ? '#0B0F17' : '#F7F5F2',
          },
        ]}
      >
        <View
          style={[
            styles.logoBox,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Package size={36} color={colors.tertiary} />
        </View>
        <Text style={[styles.title, { color: colors.primary }]}>M-Shipping</Text>
        <Text style={[styles.subtitle, { color: colors.secondary }]}>Enterprise Logistics & Finance</Text>
        <ActivityIndicator color={colors.tertiary} style={{ marginTop: 24 }} />
      </View>
    )
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/overview" />
  }

  return <Redirect href="/(auth)/login" />
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
})
