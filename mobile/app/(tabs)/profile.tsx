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
  Moon,
  Sun,
  Globe,
  LogOut,
  Server,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Camera,
  KeyRound,
  Smartphone,
  Fingerprint,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
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
  const { colors, mode, preference, toggleTheme } = useThemeStore()
  const { showToast } = useToastStore()
  const { language, setLanguage, t, toggleLanguage } = useTranslation()
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
      t('profile.logoutConfirmTitle', 'Konfirmasi keluar'),
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
  const lineColor = isDark ? '#222C38' : '#E3E7EC'

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: isDark ? '#0B0F17' : '#F7F5F2' }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Header: Editorial Style matching Overview */}
        <View style={styles.topHeaderRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={[styles.overlineLabel, { color: colors.secondary }]}>
              {t('profile.accountSubtitle', 'Pengaturan akun & sistem')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
              <Text style={[styles.pageTitle, { color: colors.primary }]} numberOfLines={1}>
                {user?.fullName || user?.username || 'User'}
              </Text>
              <View style={[styles.roleTextTag, { borderColor: lineColor }]}>
                <Text style={[styles.roleTextTagLabel, { color: colors.secondary }]}>
                  {user?.role || 'User'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={toggleLanguage}
              style={[styles.headerBtn, { borderColor: lineColor, backgroundColor: isDark ? '#131A23' : '#FFFFFF' }]}
            >
              <Globe size={18} color={colors.secondary} />
              <Text style={[styles.langText, { color: colors.primary }]}>
                {language.toUpperCase()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleTheme}
              style={[styles.headerBtn, { borderColor: lineColor, backgroundColor: isDark ? '#131A23' : '#FFFFFF' }]}
            >
              {isDark ? <Sun size={18} color="#FBBF24" /> : <Moon size={18} color={colors.primary} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* User Profile Summary Row (Editorial Flat) */}
        <View style={[styles.userSection, { borderTopColor: lineColor }]}>
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
                  backgroundColor: isDark ? '#131A23' : '#E2E8F0',
                  borderColor: lineColor,
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
                  backgroundColor: '#E0644E',
                  borderColor: isDark ? '#0B0F17' : '#F7F5F2',
                },
              ]}
            >
              <Camera size={11} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={[styles.userMainName, { color: colors.primary }]}>
              {user?.fullName || user?.username || 'User'}
            </Text>
            <Text style={[styles.usernameText, { color: colors.secondary }]}>
              @{user?.username} {user?.fdEmpCode ? `• ${user.fdEmpCode}` : ''}
            </Text>
            <Text style={[styles.avatarHint, { color: colors.secondary }]}>
              {t('profile.tapAvatarChange', 'Ketuk foto untuk mengganti')}
            </Text>
          </View>
        </View>

        {/* Keamanan & Biometrik Section */}
        <View style={[styles.sectionBlock, { borderTopColor: lineColor }]}>
          <Text style={[styles.sectionHeading, { color: colors.primary }]}>
            {t('profile.securitySection', 'Keamanan & autentikasi')}
          </Text>

          {/* Ganti Kata Sandi */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              setPasswordModalVisible(true)
            }}
            style={[styles.menuRow, { borderTopColor: lineColor }]}
          >
            <View style={styles.menuLeft}>
              <KeyRound size={17} color={colors.secondary} style={styles.menuIcon} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuTitle, { color: colors.primary }]}>
                  {t('profile.changePassword', 'Ganti kata sandi')}
                </Text>
                <Text style={[styles.menuDesc, { color: colors.secondary }]}>
                  {t('profile.changePasswordDesc', 'Perbarui kata sandi akun secara berkala')}
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color={colors.secondary} />
          </TouchableOpacity>

          {/* Biometrik */}
          <View style={[styles.menuRow, { borderTopColor: lineColor }]}>
            <View style={styles.menuLeft}>
              <Fingerprint size={17} color={colors.secondary} style={styles.menuIcon} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuTitle, { color: colors.primary }]}>
                  {t('profile.biometricLogin', 'Login biometrik')} ({biometricType})
                </Text>
                <Text style={[styles.menuDesc, { color: colors.secondary }]}>
                  {biometricAvailable
                    ? `Masuk cepat menggunakan sidik jari atau wajah`
                    : 'Perangkat tidak mendukung biometrik'}
                </Text>
              </View>
            </View>
            <Switch
              disabled={!biometricAvailable}
              value={biometricEnabled}
              onValueChange={toggleBiometric}
              thumbColor={biometricEnabled ? '#E0644E' : '#94A3B8'}
              trackColor={{ false: isDark ? '#222C38' : '#CBD5E1', true: 'rgba(224, 100, 78, 0.35)' }}
            />
          </View>
        </View>

        {/* Preferensi Aplikasi Section */}
        <View style={[styles.sectionBlock, { borderTopColor: lineColor }]}>
          <Text style={[styles.sectionHeading, { color: colors.primary }]}>
            {t('profile.systemSection', 'Preferensi aplikasi')}
          </Text>

          {/* Theme Mode */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              setThemeModalVisible(true)
            }}
            style={[styles.menuRow, { borderTopColor: lineColor }]}
          >
            <View style={styles.menuLeft}>
              {preference === 'system' ? (
                <Smartphone size={17} color={colors.secondary} style={styles.menuIcon} />
              ) : isDark ? (
                <Moon size={17} color={colors.secondary} style={styles.menuIcon} />
              ) : (
                <Sun size={17} color={colors.secondary} style={styles.menuIcon} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuTitle, { color: colors.primary }]}>
                  {t('profile.themeTitle', 'Mode tampilan')}
                </Text>
                <Text style={[styles.menuDesc, { color: colors.secondary }]}>
                  {preference === 'system'
                    ? `${t('profile.themeSystem', 'Ikuti tema perangkat')} (${isDark ? 'Gelap' : 'Terang'})`
                    : preference === 'midnight'
                      ? 'Midnight (Mode gelap)'
                      : 'Heritage (Mode terang)'}
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color={colors.secondary} />
          </TouchableOpacity>

          {/* Language Switcher */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              setLanguage(language === 'id' ? 'en' : 'id')
            }}
            style={[styles.menuRow, { borderTopColor: lineColor }]}
          >
            <View style={styles.menuLeft}>
              <Globe size={17} color={colors.secondary} style={styles.menuIcon} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuTitle, { color: colors.primary }]}>
                  {t('profile.language', 'Bahasa')}
                </Text>
                <Text style={[styles.menuDesc, { color: colors.secondary }]}>
                  {language === 'id' ? 'Bahasa Indonesia' : 'English'}
                </Text>
              </View>
            </View>
            <View style={[styles.statusTextTag, { borderColor: lineColor }]}>
              <Text style={[styles.statusTagText, { color: colors.primary }]}>
                {language.toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Informasi Sistem ERP & Pembaruan Section */}
        <View style={[styles.sectionBlock, { borderTopColor: lineColor }]}>
          <Text style={[styles.sectionHeading, { color: colors.primary }]}>
            {t('profile.infoSection', 'Informasi sistem')}
          </Text>

          {/* ERP Server Status */}
          <View style={[styles.menuRow, { borderTopColor: lineColor }]}>
            <View style={styles.menuLeft}>
              <Server size={17} color={colors.secondary} style={styles.menuIcon} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuTitle, { color: colors.primary }]}>
                  {t('profile.backendServer', 'Status sistem ERP')}
                </Text>
                <Text style={[styles.menuDesc, { color: colors.secondary }]}>
                  Terhubung • Operasional normal
                </Text>
              </View>
            </View>
            <View style={[styles.statusTextTag, { borderColor: isDark ? 'rgba(76, 195, 138, 0.4)' : '#17855A' }]}>
              <Text style={[styles.statusTagText, { color: isDark ? '#4CC38A' : '#17855A' }]}>
                ONLINE
              </Text>
            </View>
          </View>

          {/* Versi Aplikasi & Cek Update */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleCheckUpdate}
            style={[styles.menuRow, { borderTopColor: lineColor }]}
            disabled={isChecking}
          >
            <View style={styles.menuLeft}>
              {hasUpdate ? (
                <Sparkles size={17} color="#E0644E" style={styles.menuIcon} />
              ) : (
                <RefreshCw size={17} color={colors.secondary} style={styles.menuIcon} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuTitle, { color: colors.primary }]}>
                  {t('profile.appVersion', 'Versi aplikasi')}: v{currentVersion} (Build {APP_VERSION_CODE})
                </Text>
                <Text
                  style={[
                    styles.menuDesc,
                    { color: hasUpdate ? '#E0644E' : colors.secondary },
                  ]}
                >
                  {hasUpdate
                    ? `Pembaruan tersedia (${updateInfo?.version ? 'v' + updateInfo.version : 'baru'}) • Ketuk untuk unduh`
                    : `Versi terkini • Ketuk untuk periksa`}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {hasUpdate && (
                <View style={[styles.statusTextTag, { borderColor: '#EF6B5B' }]}>
                  <Text style={[styles.statusTagText, { color: '#EF6B5B' }]}>UPDATE</Text>
                </View>
              )}
              <View style={[styles.statusTextTag, { borderColor: lineColor }]}>
                <Text style={[styles.statusTagText, { color: colors.secondary }]}>
                  {isChecking ? '...' : `v${currentVersion}`}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Logout Row */}
        <View style={[styles.sectionBlock, { borderTopColor: lineColor, marginTop: 4 }]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleLogout}
            style={[styles.logoutRow, { borderTopColor: lineColor }]}
          >
            <LogOut size={17} color="#EF6B5B" style={styles.menuIcon} />
            <Text style={styles.logoutText}>
              {t('profile.logout', 'Keluar dari akun')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer Editorial */}
        <View style={styles.versionFooterBox}>
          <Text style={[styles.versionFooterText, { color: colors.secondary }]}>
            M-Shipping Mobile v{currentVersion} · Build {APP_VERSION_CODE}
          </Text>
          <Text style={[styles.versionFooterSub, { color: colors.secondary }]}>
            Enterprise Logistics & Finance System · Production
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
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 48,
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  overlineLabel: {
    fontSize: 13,
    fontWeight: '400',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  roleTextTag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  roleTextTagLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
  },
  langText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderTopWidth: 1,
    paddingVertical: 18,
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatarBox: {
    width: 54,
    height: 54,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  initialsText: {
    fontSize: 20,
    fontWeight: '600',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMainName: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  usernameText: {
    fontSize: 13,
    marginTop: 2,
  },
  avatarHint: {
    fontSize: 11.5,
    marginTop: 4,
  },
  sectionBlock: {
    borderTopWidth: 1,
    paddingTop: 18,
    paddingBottom: 4,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: -0.1,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderTopWidth: 1,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  menuIcon: {
    flexShrink: 0,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  menuDesc: {
    fontSize: 12.5,
    marginTop: 2,
    lineHeight: 16,
  },
  statusTextTag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF6B5B',
  },
  versionFooterBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    gap: 3,
  },
  versionFooterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  versionFooterSub: {
    fontSize: 11,
  },
})
