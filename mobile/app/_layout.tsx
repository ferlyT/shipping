import React, { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuthStore } from '../src/stores/authStore'
import { useThemeStore } from '../src/theme/themeStore'
import { ToastContainer } from '../src/components/ui/ToastContainer'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 2, // 2 minutes
    },
  },
})

export default function RootLayout() {
  const { initializeAuth } = useAuthStore()
  const { mode } = useThemeStore()

  useEffect(() => {
    initializeAuth()
  }, [])

  const isDark = mode === 'midnight'

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: {
              backgroundColor: isDark ? '#0B0F17' : '#F7F5F2',
            },
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <ToastContainer />
      </SafeAreaProvider>
    </QueryClientProvider>
  )
}
