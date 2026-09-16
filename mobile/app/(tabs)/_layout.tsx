import React from 'react'
import { Tabs, Redirect } from 'expo-router'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LayoutDashboard, Truck, FileText, Users, Settings } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useAuthStore } from '../../src/stores/authStore'
import { useThemeStore } from '../../src/theme/themeStore'
import { useTranslation } from '../../src/hooks/useTranslation'
import { hasTabAccess } from '../../src/lib/permissions'

export default function TabsLayout() {
  const { user, isAuthenticated, isInitialized } = useAuthStore()
  const { colors, mode } = useThemeStore()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  if (isInitialized && !isAuthenticated) {
    return <Redirect href="/(auth)/login" />
  }

  const isDark = mode === 'midnight'
  const canLogistics = hasTabAccess(user, 'logistics')
  const canFinance = hasTabAccess(user, 'finance')
  const canMaster = hasTabAccess(user, 'master')

  // Dynamic bottom padding to strictly avoid collision with Android navigation buttons (3-button / gesture bar)
  // On Android, 3-button navigation bar requires at least 48dp.
  // Many OEM ROMs (MIUI/HyperOS, ColorOS, etc.) report insets.bottom = 0 even when 3-button nav is active.
  // Fallback to Math.max(insets.bottom, 48) on Android guarantees system buttons never collide with tab bar.
  const bottomInset = Platform.OS === 'android'
    ? Math.max(insets.bottom, 48)
    : Math.max(insets.bottom, 16)
  const tabBarHeight = 52 + bottomInset

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
          paddingTop: 4,
          elevation: 8,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '600',
          marginTop: 1,
          marginBottom: 1,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
          justifyContent: 'center',
          alignItems: 'center',
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
          title: t('tab.overview', 'Overview'),
          tabBarLabel: t('tab.overview', 'Overview'),
          tabBarIcon: ({ color }) => <LayoutDashboard size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="logistics"
        options={{
          href: canLogistics ? '/(tabs)/logistics' : null,
          title: t('tab.logistics', 'Logistik'),
          tabBarLabel: t('tab.logistics', 'Logistik'),
          tabBarIcon: ({ color }) => <Truck size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          href: canFinance ? '/(tabs)/finance' : null,
          title: t('tab.finance', 'Billing'),
          tabBarLabel: t('tab.finance', 'Billing'),
          tabBarIcon: ({ color }) => <FileText size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="master"
        options={{
          href: canMaster ? '/(tabs)/master' : null,
          title: t('tab.master', 'Master'),
          tabBarLabel: t('tab.master', 'Master'),
          tabBarIcon: ({ color }) => <Users size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tab.profile', 'Akun'),
          tabBarLabel: t('tab.profile', 'Akun'),
          tabBarIcon: ({ color }) => <Settings size={20} color={color} />,
        }}
      />
    </Tabs>
  )
}
