import axios from 'axios'
import { useAuthStore } from '../stores/authStore'
import { Platform } from 'react-native'

// Default Base URL:
// - Android Emulator: 10.0.2.2:3001
// - iOS Simulator / Web: localhost:3001
// - Live Server fallback: http://36.93.22.142:3010
export const DEFAULT_API_URL = Platform.select({
  android: 'http://10.0.2.2:3001',
  ios: 'http://localhost:3001',
  default: 'http://36.93.22.142:3010',
})

const apiClient = axios.create({
  baseURL: DEFAULT_API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach Bearer token to each request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't auto logout if error is from login endpoint
      if (!error.config?.url?.includes('/auth/login')) {
        useAuthStore.getState().logout()
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
