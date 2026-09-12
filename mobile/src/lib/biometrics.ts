import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'

const BIOMETRIC_ENABLED_KEY = 'mshipping_biometric_enabled'
const SAVED_CREDENTIALS_KEY = 'mshipping_saved_credentials'

export interface SavedCredentials {
  username: string
  token: string
}

export const biometricService = {
  async isHardwareAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync()
      const isEnrolled = await LocalAuthentication.isEnrolledAsync()
      return hasHardware && isEnrolled
    } catch {
      return false
    }
  },

  async getSupportedTypes(): Promise<string> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'Face ID'
      }
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return 'Fingerprint'
      }
      return 'Biometrik'
    } catch {
      return 'Biometrik'
    }
  },

  async isBiometricEnabled(): Promise<boolean> {
    try {
      const val = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY)
      return val === 'true'
    } catch {
      return false
    }
  },

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    try {
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false')
    } catch (err) {
      console.warn('Gagal menyimpan status biometrik', err)
    }
  },

  async saveCredentials(credentials: SavedCredentials): Promise<void> {
    try {
      await SecureStore.setItemAsync(SAVED_CREDENTIALS_KEY, JSON.stringify(credentials))
    } catch (err) {
      console.warn('Gagal menyimpan kredensial aman', err)
    }
  },

  async getSavedCredentials(): Promise<SavedCredentials | null> {
    try {
      const data = await SecureStore.getItemAsync(SAVED_CREDENTIALS_KEY)
      if (!data) return null
      return JSON.parse(data)
    } catch {
      return null
    }
  },

  async clearSavedCredentials(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(SAVED_CREDENTIALS_KEY)
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY)
    } catch (err) {
      console.warn('Gagal menghapus kredensial', err)
    }
  },

  async authenticate(promptMessage = 'Gunakan biometrik untuk masuk'): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: 'Gunakan kata sandi',
        cancelLabel: 'Batal',
        disableDeviceFallback: false,
      })
      return result.success
    } catch {
      return false
    }
  },
}
