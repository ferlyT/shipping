import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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
  Sparkles,
  RefreshCw,
  Camera,
  KeyRound,
  Smartphone,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { Card } from '../../src/components/ui/Card'
import { Badge } from '../../src/components/ui/Badge'
import { useAuthStore } from '../../src/stores/authStore'
import { useThemeStore } from '../../src/theme/themeStore'
import { useToastStore } from '../../src/stores/toastStore'
import { useUpdateStore } from '../../src/stores/updateStore'
import { useTranslation } from '../../src/hooks/useTranslation'
import { biometricService } from '../../src/lib/biometrics'
import { resolveAvatarUrl, getInitials } from '../../src/lib/utils'
import { AvatarModal } from '../../src/components/profile/AvatarModal'
import { ChangePasswordModal } from '../../src/components/profile/ChangePasswordModal'
import { ThemeSelectionModal } from '../../src/components/profile/ThemeSelectionModal'
import { APP_VERSION_CODE } from '../../src/config/version'

export default function ProfileScreen() {
  const router = useRouter()
  const { user, token, logout } = useAuthStore()
  const { colors, mode, preference } = useThemeStore()
  const { showToast } = useToastStore()
  const { language, setLanguage, t } = useTranslation()
  const { currentVersion, isChecking, hasUpdate, checkUpdate, openModal, updateInfo } = useUpdateStore()

  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [biometricType, setBiometricType] = useState('Biometrik')
  const [biometricAvailable, setBiometricAvailable] = useState(false)

  const [avatarModalVisible, setAvatarModalVisible] = useState(false)
  const [passwordModalVisible, setPasswordModalVisible] = useState(false)
  const [themeModalVisible, setThemeModalVisible] = useState(false)

  const handleCheckUpdate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (hasUpdate) {
      openModal()
    } else {
      await checkUpdate(true)
    }
  }

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
        if (token && user) {
          await biometricService.saveCredentials({ username: user.username, token })
        }
        await biometricService.setBiometricEnabled(true)
        setBiometricEnabled(true)
        showToast(`Login dengan ${biometricType} diaktifkan`, 'success')
      }
    } else {
      await biometricService.setBiometricEnabled(false)
      await biometricService.clearSavedCredentials()
      setBiometricEnabled(false)
      showToast(`Login dengan ${biometricType} dinonaktifkan`, 'info')
    }
  }

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    Alert.alert(
      t('profile.logoutConfirmTitle', 'Konfirmasi Keluar'),
      t('profile.logoutConfirmDesc', 'Apakah Anda yakin ingin keluar dari akun ini?'),
      [
        { text: t('common.cancel', 'Batal'), style: 'cancel' },
        {
          text: t('profile.logoutConfirmBtn', 'Keluar'),
          style: 'destructive',
          onPress: async () => {
            await logout()
            showToast('Anda telah keluar dari aplikasi', 'info')
            router.replace('/(auth)/login')
          },
        },
      ]
    )
  }

  const isDark = mode === 'midnight'
  const resolvedAvatar = resolveAvatarUrl(user?.avatarUrl)

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: isDark ? '#0B0F17' : '#F7F5F2' }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Card Header */}
        <Card style={styles.userCard}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              setAvatarModalVisible(true)
            }}
            style={styles.avatarTouchable}
          >
            <View
              style={[
                styles.avatarBox,
                {
                  backgroundColor: isDark ? '#1C2638' : '#E2E8F0',
                  borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(0,0,0,0.1)',
                },
              ]}
            >
              {resolvedAvatar ? (
                <Image source={{ uri: resolvedAvatar }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.initialsText, { color: colors.tertiary }]}>
                  {getInitials(user?.fullName || user?.username)}
                </Text>
              )}
            </View>
            <View
              style={[
                styles.cameraBadge,
                {
                  backgroundColor: colors.tertiary,
                  borderColor: isDark ? '#151D2A' : '#FFFFFF',
                },
              ]}
            >
              <Camera size={11} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

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
          {t('profile.securitySection', 'KEAMANAN & AUTENTIKASI')}
        </Text>
        <Card style={styles.settingsCard}>
          {/* Ganti Kata Sandi */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              setPasswordModalVisible(true)
            }}
            style={styles.settingItem}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <KeyRound size={18} color="#38BDF8" />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.primary }]}>
                  {t('profile.changePassword')}
                </Text>
                <Text style={[styles.settingDesc, { color: colors.secondary }]}>
                  {t('profile.changePasswordDesc')}
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color={colors.secondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

          {/* Biometrik */}
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <Fingerprint size={18} color="#38BDF8" />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.primary }]}>
                  {t('profile.biometricLogin', 'Login Biometrik')} ({biometricType})
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
          {t('profile.systemSection', 'PREFERENSI APLIKASI')}
        </Text>
        <Card style={styles.settingsCard}>
          {/* Theme Mode */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              setThemeModalVisible(true)
            }}
            style={styles.settingItem}
          >
            <View style={styles.settingLeft}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor:
                      preference === 'system'
                        ? 'rgba(56, 189, 248, 0.15)'
                        : isDark
                          ? 'rgba(129, 140, 248, 0.15)'
                          : 'rgba(245, 158, 11, 0.15)',
                  },
                ]}
              >
                {preference === 'system' ? (
                  <Smartphone size={18} color="#38BDF8" />
                ) : isDark ? (
                  <Moon size={18} color="#818CF8" />
                ) : (
                  <Sun size={18} color="#D97706" />
                )}
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.primary }]}>
                  {t('profile.themeTitle', 'Mode Tampilan')}
                </Text>
                <Text style={[styles.settingDesc, { color: colors.secondary }]}>
                  {preference === 'system'
                    ? `${t('profile.themeSystem', 'Ikuti Tema Perangkat')} (${isDark ? 'Gelap' : 'Terang'})`
                    : preference === 'midnight'
                      ? t('profile.themeMidnight', 'Midnight (Mode Gelap)')
                      : t('profile.themeHeritage', 'Heritage (Mode Terang)')}
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
                <Text style={[styles.settingLabel, { color: colors.primary }]}>{t('profile.language', 'Bahasa (Language)')}</Text>
                <Text style={[styles.settingDesc, { color: colors.secondary }]}>
                  {language === 'id' ? '🇮🇩 Bahasa Indonesia' : '🇬🇧 English'}
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color={colors.secondary} />
          </TouchableOpacity>
        </Card>

        {/* Informasi Server ERP & Versi Aplikasi */}
        <Text style={[styles.sectionTitle, { color: colors.secondary }]}>
          {t('profile.infoSection', 'INFORMASI SISTEM')}
        </Text>
        <Card style={styles.settingsCard}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                <Server size={18} color="#8B5CF6" />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.primary }]}>{t('profile.backendServer', 'Status Sistem ERP')}</Text>
                <Text style={[styles.settingDesc, { color: colors.success }]}>Terhubung • Operasional Normal</Text>
              </View>
            </View>
            <Badge label="ONLINE" variant="success" />
          </View>

          <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleCheckUpdate}
            style={styles.settingItem}
            disabled={isChecking}
          >
            <View style={styles.settingLeft}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: hasUpdate
                      ? 'rgba(56, 189, 248, 0.2)'
                      : 'rgba(56, 189, 248, 0.12)',
                  },
                ]}
              >
                {hasUpdate ? (
                  <Sparkles size={18} color="#38BDF8" />
                ) : (
                  <RefreshCw size={18} color="#38BDF8" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: colors.primary }]}>
                  {t('profile.appVersion', 'Versi Aplikasi')}: v{currentVersion} (Build {APP_VERSION_CODE})
                </Text>
                <Text
                  style={[
                    styles.settingDesc,
                    { color: hasUpdate ? colors.tertiary : colors.secondary },
                  ]}
                >
                  {hasUpdate
                    ? `Pembaruan tersedia (${updateInfo?.version ? 'v' + updateInfo.version : 'baru'}) • Ketuk untuk update`
                    : `Versi terkini • Ketuk untuk cek`}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {hasUpdate && <Badge label="UPDATE" variant="danger" />}
              <Badge
                label={isChecking ? t('profile.checkingUpdate', 'MEMERIKSA...') : `v${currentVersion}`}
                variant="neutral"
              />
            </View>
          </TouchableOpacity>
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
          <Text style={styles.logoutText}>{t('profile.logout', 'Keluar dari Akun')}</Text>
        </TouchableOpacity>

        {/* App Version Info Footer */}
        <View style={styles.versionFooterBox}>
          <Text style={[styles.versionFooterText, { color: colors.secondary }]}>
            M-Shipping Mobile v{currentVersion} • Build {APP_VERSION_CODE}
          </Text>
          <Text style={[styles.versionFooterSub, { color: isDark ? '#64748B' : '#94A3B8' }]}>
            Enterprise Logistics & Finance System • Production
          </Text>
        </View>
      </ScrollView>

      {/* Modals */}
      <AvatarModal
        visible={avatarModalVisible}
        onClose={() => setAvatarModalVisible(false)}
      />
      <ChangePasswordModal
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
      />
      <ThemeSelectionModal
        visible={themeModalVisible}
        onClose={() => setThemeModalVisible(false)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
    gap: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatarBox: {
    width: 62,
    height: 62,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  initialsText: {
    fontSize: 22,
    fontWeight: '800',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
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
  versionFooterBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 4,
  },
  versionFooterText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  versionFooterSub: {
    fontSize: 10.5,
  },
})
