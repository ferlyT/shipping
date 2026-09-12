import React from 'react'
import { Tabs, Redirect } from 'expo-router'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LayoutDashboard, Truck, FileText, Users, Settings } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useAuthStore } from '../../src/stores/authStore'
import { useThemeStore } from '../../src/theme/themeStore'
import { useTranslation } from '../../src/hooks/useTranslation'

export default function TabsLayout() {
  const { isAuthenticated, isInitialized } = useAuthStore()
  const { colors, mode } = useThemeStore()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  if (isInitialized && !isAuthenticated) {
    return <Redirect href="/(auth)/login" />
  }

  const isDark = mode === 'midnight'

  // Dynamic bottom padding to strictly avoid collision with Android navigation buttons (3-button / gesture bar)
  // insets.bottom is typically ~48dp on Android 3-button nav or ~16-24dp on gesture bar.
  // Fallback to at least 12dp on Android to prevent hugging the bottom screen edge.
  const bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 12 : 8)
  const tabBarHeight = 54 + bottomInset

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: bottomInset,
          paddingTop: 6,
          elevation: 8,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: -2,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
      }}
      screenListeners={{
        tabPress: () => {
          Haptics.selectionAsync()
        },
      }}
    >
      <Tabs.Screen
        name="overview"
        options={{
          title: t('nav.dashboard', 'Overview'),
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="logistics"
        options={{
          title: t('module.logistics', 'Logistik'),
          tabBarIcon: ({ color, size }) => <Truck size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: t('module.finance', 'Keuangan'),
          tabBarIcon: ({ color, size }) => <FileText size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="master"
        options={{
          title: t('module.masterdata', 'Master'),
          tabBarIcon: ({ color, size }) => <Users size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile.settings', 'Akun'),
          tabBarIcon: ({ color, size }) => <Settings size={size - 2} color={color} />,
        }}
      />
    </Tabs>
  )
}
