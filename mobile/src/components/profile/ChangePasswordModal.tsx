import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native'
import { X, Lock, Eye, EyeOff, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { Button } from '../ui/Button'
import { useThemeStore } from '../../theme/themeStore'
import { useToastStore } from '../../stores/toastStore'
import { useTranslation } from '../../hooks/useTranslation'
import apiClient from '../../api/client'

interface ChangePasswordModalProps {
  visible: boolean
  onClose: () => void
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ visible, onClose }) => {
  const { colors, mode } = useThemeStore()
  const { showToast } = useToastStore()
  const { t } = useTranslation()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isDark = mode === 'midnight'

  const resetForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setShowCurrentPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
    setErrorMessage(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async () => {
    Keyboard.dismiss()
    setErrorMessage(null)

    if (!currentPassword) {
      setErrorMessage(t('profile.enterCurrentPassword'))
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      return
    }

    if (newPassword.length < 6) {
      setErrorMessage(t('profile.passwordMinLength'))
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(t('profile.passwordMismatch'))
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      return
    }

    try {
      setLoading(true)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      const response = await apiClient.put('/profile/password', {
        currentPassword,
        newPassword,
        confirmPassword,
      })

      if (response.data?.success || response.status === 200) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        showToast(t('profile.passwordSuccess'), 'success')
        handleClose()
      }
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Gagal mengubah kata sandi. Periksa koneksi Anda.'
      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }

  const passwordsMatch = newPassword.length >= 6 && confirmPassword.length >= 6 && newPassword === confirmPassword

  return (
    <Modal
      visible={visible}
      animationType='fade'
      transparent
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.backdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: isDark ? '#151D2A' : '#FFFFFF',
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <View style={styles.headerTitleRow}>
                  <View style={[styles.iconCircle, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                    <KeyRound size={20} color='#38BDF8' />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: colors.primary }]}>
                      {t('profile.changePassword')}
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.secondary }]}>
                      {t('profile.changePasswordDesc')}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleClose}
                  style={[styles.closeBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                >
                  <X size={18} color={colors.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.formContent}
              >
                {/* Error Banner */}
                {errorMessage && (
                  <View style={styles.errorBox}>
                    <AlertCircle size={16} color='#EF4444' style={{ marginTop: 1 }} />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                {/* Field: Current Password */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.primary }]}>
                    {t('profile.currentPassword')}
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: isDark ? '#0B0F17' : '#F8FAFC',
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Lock size={16} color={colors.secondary} style={styles.inputLeftIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.primary }]}
                      placeholder={t('profile.enterCurrentPassword')}
                      placeholderTextColor={colors.secondary}
                      secureTextEntry={!showCurrentPassword}
                      value={currentPassword}
                      onChangeText={(val) => {
                        setCurrentPassword(val)
                        if (errorMessage) setErrorMessage(null)
                      }}
                      autoCapitalize='none'
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                      style={styles.eyeBtn}
                    >
                      {showCurrentPassword ? (
                        <EyeOff size={18} color={colors.secondary} />
                      ) : (
                        <Eye size={18} color={colors.secondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Field: New Password */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.primary }]}>
                    {t('profile.newPassword')}
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: isDark ? '#0B0F17' : '#F8FAFC',
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Lock size={16} color={colors.secondary} style={styles.inputLeftIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.primary }]}
                      placeholder={t('profile.enterNewPassword')}
                      placeholderTextColor={colors.secondary}
                      secureTextEntry={!showNewPassword}
                      value={newPassword}
                      onChangeText={(val) => {
                        setNewPassword(val)
                        if (errorMessage) setErrorMessage(null)
                      }}
                      autoCapitalize='none'
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      style={styles.eyeBtn}
                    >
                      {showNewPassword ? (
                        <EyeOff size={18} color={colors.secondary} />
                      ) : (
                        <Eye size={18} color={colors.secondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.helperText, { color: colors.secondary }]}>
                    {t('profile.passwordMinLength')}
                  </Text>
                </View>

                {/* Field: Confirm Password */}
                <View style={styles.fieldGroup}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.fieldLabel, { color: colors.primary }]}>
                      {t('profile.confirmPassword')}
                    </Text>
                    {passwordsMatch && (
                      <View style={styles.matchBadge}>
                        <CheckCircle2 size={12} color='#10B981' />
                        <Text style={styles.matchText}>Cocok</Text>
                      </View>
                    )}
                  </View>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: isDark ? '#0B0F17' : '#F8FAFC',
                        borderColor: passwordsMatch ? '#10B981' : colors.border,
                      },
                    ]}
                  >
                    <Lock size={16} color={colors.secondary} style={styles.inputLeftIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.primary }]}
                      placeholder={t('profile.enterConfirmPassword')}
                      placeholderTextColor={colors.secondary}
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={(val) => {
                        setConfirmPassword(val)
                        if (errorMessage) setErrorMessage(null)
                      }}
                      autoCapitalize='none'
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeBtn}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} color={colors.secondary} />
                      ) : (
                        <Eye size={18} color={colors.secondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                  <Button
                    title={t('common.cancel')}
                    variant='secondary'
                    onPress={handleClose}
                    disabled={loading}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title={t('profile.savePassword')}
                    variant='primary'
                    onPress={handleSubmit}
                    loading={loading}
                    disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                    style={{ flex: 1.5 }}
                  />
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardAvoid: {
    width: '100%',
    maxWidth: 420,
  },
  modalCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContent: {
    padding: 18,
    gap: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    padding: 10,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
  },
  inputLeftIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 13,
  },
  eyeBtn: {
    padding: 6,
  },
  helperText: {
    fontSize: 11,
    marginLeft: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
})
