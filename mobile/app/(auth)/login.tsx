import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Package, Lock, User as UserIcon, Eye, EyeOff, Fingerprint } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { Button } from '../../src/components/ui/Button'
import { useAuthStore } from '../../src/stores/authStore'
import { useToastStore } from '../../src/stores/toastStore'
import { useThemeStore } from '../../src/theme/themeStore'
import { biometricService } from '../../src/lib/biometrics'
import apiClient from '../../src/api/client'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const { showToast } = useToastStore()
  const { colors, mode } = useThemeStore()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricType, setBiometricType] = useState('Biometrik')

  useEffect(() => {
    checkBiometrics()
  }, [])

  const checkBiometrics = async () => {
    const isAvail = await biometricService.isHardwareAvailable()
    if (isAvail) {
      const type = await biometricService.getSupportedTypes()
      setBiometricType(type)
      const isEnabled = await biometricService.isBiometricEnabled()
      const saved = await biometricService.getSavedCredentials()
      if (isEnabled && saved) {
        setBiometricAvailable(true)
        // Auto prompt biometrics on mount
        handleBiometricLogin()
      } else if (isAvail) {
        setBiometricAvailable(true)
      }
    }
  }

  const handleBiometricLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const success = await biometricService.authenticate(`Masuk dengan ${biometricType}`)
    if (success) {
      const saved = await biometricService.getSavedCredentials()
      if (saved && saved.token) {
        setLoading(true)
        try {
          // Verify with /auth/me
          const res = await apiClient.get('/auth/me', {
            headers: { Authorization: `Bearer ${saved.token}` },
          })
          const user = res.data.data
          await login(saved.token, user)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          showToast(`Selamat datang kembali, ${user.fullName || user.username}!`, 'success')
          router.replace('/(tabs)/overview')
          return
        } catch {
          showToast('Sesi biometrik kedaluwarsa, silakan masukkan password kembali', 'warning')
        } finally {
          setLoading(false)
        }
      }
    }
  }

  const handleManualLogin = async () => {
    if (!username.trim() || !password.trim()) {
      showToast('Mohon masukkan username dan password', 'warning')
      return
    }

    setLoading(true)
    try {
      const res = await apiClient.post('/auth/login', {
        username: username.trim(),
        password: password.trim(),
      })

      const { token, user } = res.data.data
      await login(token, user)

      // Save credentials for biometrics
      await biometricService.saveCredentials({ username: user.username, token })
      await biometricService.setBiometricEnabled(true)

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      showToast(`Selamat datang, ${user.fullName || user.username}!`, 'success')
      router.replace('/(tabs)/overview')
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      const errorMsg =
        err.response?.data?.message || err.response?.data?.error || 'Login gagal, periksa kredensial Anda.'
      showToast(errorMsg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const isDark = mode === 'midnight'

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: isDark ? '#0B0F17' : '#F7F5F2',
        },
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Logo & Brand Header */}
          <View style={styles.brandContainer}>
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
            <Text style={[styles.brandTitle, { color: colors.primary }]}>M-Shipping</Text>
            <Text style={[styles.brandSubtitle, { color: colors.secondary }]}>
              Masuk ke akun ERP Anda
            </Text>
          </View>

          {/* Form Card */}
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            {/* Username Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.secondary }]}>Username</Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: isDark ? '#0B0F17' : '#F8FAFC',
                    borderColor: colors.border,
                  },
                ]}
              >
                <UserIcon size={16} color={colors.secondary} style={styles.fieldIcon} />
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Masukkan username"
                  placeholderTextColor={colors.secondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.input, { color: colors.primary }]}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.secondary }]}>Password</Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: isDark ? '#0B0F17' : '#F8FAFC',
                    borderColor: colors.border,
                  },
                ]}
              >
                <Lock size={16} color={colors.secondary} style={styles.fieldIcon} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Masukkan password"
                  placeholderTextColor={colors.secondary}
                  secureTextEntry={!showPassword}
                  style={[styles.input, { color: colors.primary }]}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  {showPassword ? (
                    <EyeOff size={16} color={colors.secondary} />
                  ) : (
                    <Eye size={16} color={colors.secondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <Button
              title="Masuk Sekarang"
              onPress={handleManualLogin}
              loading={loading}
              style={{ marginTop: 8 }}
            />

            {/* Biometric Quick Login */}
            {biometricAvailable && (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleBiometricLogin}
                style={[
                  styles.biometricBtn,
                  {
                    borderColor: colors.border,
                    backgroundColor: isDark ? 'rgba(56, 189, 248, 0.05)' : 'rgba(184, 66, 46, 0.05)',
                  },
                ]}
              >
                <Fingerprint size={20} color={colors.tertiary} style={{ marginRight: 8 }} />
                <Text style={[styles.biometricText, { color: colors.tertiary }]}>
                  Masuk dengan {biometricType}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Register Nav Footer */}
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: colors.secondary }]}>Belum punya akun?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={[styles.registerLink, { color: colors.tertiary }]}>Daftar di sini</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBox: {
    width: 68,
    height: 68,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
  },
  fieldIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 6,
  },
  biometricText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  footerText: {
    fontSize: 13,
  },
  registerLink: {
    fontSize: 13,
    fontWeight: '700',
  },
})
