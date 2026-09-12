import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import {
  User as UserIcon,
  Shield,
  Fingerprint,
  Moon,
  Sun,
  Globe,
  LogOut,
  Server,
  ChevronRight,
  Info,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { Card } from '../../src/components/ui/Card'
import { Badge } from '../../src/components/ui/Badge'
import { useAuthStore } from '../../src/stores/authStore'
import { useThemeStore } from '../../src/theme/themeStore'
import { useToastStore } from '../../src/stores/toastStore'
import { useTranslation } from '../../src/hooks/useTranslation'
import { biometricService } from '../../src/lib/biometrics'

export default function ProfileScreen() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { colors, mode, setMode } = useThemeStore()
  const { showToast } = useToastStore()
  const { language, setLanguage, t } = useTranslation()

  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [biometricType, setBiometricType] = useState('Biometrik')
  const [biometricAvailable, setBiometricAvailable] = useState(false)

  useEffect(() => {
    checkBiometricStatus()
  }, [])

  const checkBiometricStatus = async () => {
    const isAvail = await biometricService.isHardwareAvailable()
    setBiometricAvailable(isAvail)
    if (isAvail) {
      const type = await biometricService.getSupportedTypes()
      setBiometricType(type)
      const enabled = await biometricService.isBiometricEnabled()
      setBiometricEnabled(enabled)
    }
  }

  const toggleBiometric = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (value) {
      const authenticated = await biometricService.authenticate(`Aktifkan login ${biometricType}`)
      if (authenticated) {
        await biometricService.setBiometricEnabled(true)
        setBiometricEnabled(true)
        showToast(`Login dengan ${biometricType} diaktifkan`, 'success')
      }
    } else {
      await biometricService.setBiometricEnabled(false)
      setBiometricEnabled(false)
      showToast(`Login dengan ${biometricType} dinonaktifkan`, 'info')
    }
  }

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    Alert.alert('Konfirmasi Keluar', 'Apakah Anda yakin ingin keluar dari akun ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          await logout()
          showToast('Anda telah keluar dari aplikasi', 'info')
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  const isDark = mode === 'midnight'

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#0B0F17' : '#F7F5F2' }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Card Header */}
        <Card style={styles.userCard}>
          <View style={[styles.avatarBox, { backgroundColor: isDark ? '#1C2638' : '#E2E8F0' }]}>
            <UserIcon size={32} color={colors.tertiary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.fullName, { color: colors.primary }]}>
              {user?.fullName || user?.username || 'User'}
            </Text>
            <Text style={[styles.usernameText, { color: colors.secondary }]}>
              @{user?.username}
            </Text>
            <View style={{ flexDirection: 'row', marginTop: 6 }}>
              <Badge label={user?.role?.toUpperCase() || 'VIEWER'} variant="info" />
            </View>
          </View>
        </Card>

        {/* Keamanan & Biometrik Section */}
        <Text style={[styles.sectionTitle, { color: colors.secondary }]}>
          KEAMANAN & AUTENTIKASI
        </Text>
        <Card style={styles.settingsCard}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <Fingerprint size={18} color="#38BDF8" />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.primary }]}>
                  Login {biometricType}
                </Text>
                <Text style={[styles.settingDesc, { color: colors.secondary }]}>
                  {biometricAvailable
                    ? `Masuk cepat menggunakan ${biometricType}`
                    : 'Perangkat tidak mendukung biometrik'}
                </Text>
              </View>
            </View>
            <Switch
              disabled={!biometricAvailable}
              value={biometricEnabled}
              onValueChange={toggleBiometric}
              thumbColor={biometricEnabled ? colors.tertiary : '#94A3B8'}
              trackColor={{ false: '#334155', true: 'rgba(56, 189, 248, 0.4)' }}
            />
          </View>
        </Card>

        {/* Pengaturan Tampilan & Bahasa */}
        <Text style={[styles.sectionTitle, { color: colors.secondary }]}>
          PREFERENSI APLIKASI
        </Text>
        <Card style={styles.settingsCard}>
          {/* Theme Mode */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              setMode(isDark ? 'heritage' : 'midnight')
            }}
            style={styles.settingItem}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                {isDark ? <Sun size={18} color="#FBBF24" /> : <Moon size={18} color="#D97706" />}
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.primary }]}>Mode Tampilan</Text>
                <Text style={[styles.settingDesc, { color: colors.secondary }]}>
                  {isDark ? 'Midnight (Dark Mode)' : 'Heritage (Light Mode)'}
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color={colors.secondary} />
          </TouchableOpacity>

          {/* Language Switcher */}
          <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              setLanguage(language === 'id' ? 'en' : 'id')
            }}
            style={styles.settingItem}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Globe size={18} color="#10B981" />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.primary }]}>Bahasa (Language)</Text>
                <Text style={[styles.settingDesc, { color: colors.secondary }]}>
                  {language === 'id' ? '🇮🇩 Bahasa Indonesia' : '🇬🇧 English'}
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color={colors.secondary} />
          </TouchableOpacity>
        </Card>

        {/* Informasi Server ERP */}
        <Text style={[styles.sectionTitle, { color: colors.secondary }]}>INFORMASI SISTEM</Text>
        <Card style={styles.settingsCard}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                <Server size={18} color="#8B5CF6" />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.primary }]}>Status Server ERP</Text>
                <Text style={[styles.settingDesc, { color: colors.success }]}>Online • 36.93.22.142:3010</Text>
              </View>
            </View>
            <Badge label="v1.0.0" variant="neutral" />
          </View>
        </Card>

        {/* Logout Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleLogout}
          style={[
            styles.logoutBtn,
            {
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEE2E2',
              borderColor: 'rgba(239, 68, 68, 0.4)',
            },
          ]}
        >
          <LogOut size={18} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Keluar dari Akun</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  avatarBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullName: {
    fontSize: 16,
    fontWeight: '800',
  },
  usernameText: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 10,
    marginLeft: 4,
  },
  settingsCard: {
    padding: 6,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  settingDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: 10,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
})
