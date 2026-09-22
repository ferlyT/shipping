import { useCallback } from 'react'
import * as Haptics from 'expo-haptics'
import { biometricService } from '../lib/biometrics'
import { useToastStore } from '../stores/toastStore'
import { useTranslation } from './useTranslation'

/**
 * Hook to guard sensitive actions (like printing/sharing invoices) with biometric verification.
 * If biometrics is enabled and hardware is available, prompt the user.
 * If not enabled or unavailable, the action proceeds directly without blocking.
 */
export function useBiometricGuard() {
  const { showToast } = useToastStore()
  const { t } = useTranslation()

  const guardedAction = useCallback(
    async (action: () => Promise<void> | void, customPrompt?: string): Promise<boolean> => {
      try {
        const isHardwareAvail = await biometricService.isHardwareAvailable()
        const isEnabled = await biometricService.isBiometricEnabled()

        if (isHardwareAvail && isEnabled) {
          const type = await biometricService.getSupportedTypes()
          const prompt = customPrompt || t('finance.biometricPrompt', `Verifikasi ${type} untuk melanjutkan`)

          const success = await biometricService.authenticate(prompt)
          if (!success) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
            showToast(t('finance.biometricFailed', 'Verifikasi biometrik dibatalkan atau gagal.'), 'warning')
            return false
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        }

        await action()
        return true
      } catch (err: any) {
        showToast(err?.message || 'Terjadi kesalahan saat verifikasi', 'error')
        return false
      }
    },
    [showToast, t]
  )

  return { guardedAction }
}
