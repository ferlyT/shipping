import React, { useState } from 'react'
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
import { Package, Lock, User as UserIcon, ArrowLeft } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { Button } from '../../src/components/ui/Button'
import { useToastStore } from '../../src/stores/toastStore'
import { useThemeStore } from '../../src/theme/themeStore'
import apiClient from '../../src/api/client'

export default function RegisterPage() {
  const router = useRouter()
  const { showToast } = useToastStore()
  const { colors, mode } = useThemeStore()

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    if (!fullName.trim() || !username.trim() || !password.trim()) {
      showToast('Mohon lengkapi seluruh field', 'warning')
      return
    }

    if (password !== confirmPassword) {
      showToast('Konfirmasi password tidak cocok', 'warning')
      return
    }

    setLoading(true)
    try {
      await apiClient.post('/auth/register', {
        fullName: fullName.trim(),
        username: username.trim(),
        password: password.trim(),
      })

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      showToast('Pendaftaran berhasil! Silakan tunggu persetujuan admin.', 'success', 5000)
      router.replace('/(auth)/login')
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      const errorMsg =
        err.response?.data?.message || err.response?.data?.error || 'Pendaftaran gagal.'
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
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { borderColor: colors.border }]}
          >
            <ArrowLeft size={18} color={colors.primary} />
          </TouchableOpacity>

          {/* Header */}
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
              <Package size={32} color={colors.tertiary} />
            </View>
            <Text style={[styles.brandTitle, { color: colors.primary }]}>Daftar Akun</Text>
            <Text style={[styles.brandSubtitle, { color: colors.secondary }]}>
              Buat akun baru untuk akses sistem ERP
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
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.secondary }]}>Nama Lengkap</Text>
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
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Contoh: Budi Santoso"
                  placeholderTextColor={colors.secondary}
                  style={[styles.input, { color: colors.primary }]}
                />
              </View>
            </View>

            {/* Username */}
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
                  placeholder="Masukkan username unik"
                  placeholderTextColor={colors.secondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.input, { color: colors.primary }]}
                />
              </View>
            </View>

            {/* Password */}
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
                  placeholder="Minimal 6 karakter"
                  placeholderTextColor={colors.secondary}
                  secureTextEntry
                  style={[styles.input, { color: colors.primary }]}
                />
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.secondary }]}>Konfirmasi Password</Text>
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
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Ulangi password"
                  placeholderTextColor={colors.secondary}
                  secureTextEntry
                  style={[styles.input, { color: colors.primary }]}
                />
              </View>
            </View>

            {/* Submit Button */}
            <Button
              title="Daftar Sekarang"
              onPress={handleRegister}
              loading={loading}
              style={{ marginTop: 8 }}
            />
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
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'center',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  brandTitle: {
    fontSize: 20,
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
    gap: 14,
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
})
