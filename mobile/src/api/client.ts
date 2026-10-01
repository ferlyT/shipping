import axios from 'axios'
import { useAuthStore } from '../stores/authStore'
import { Platform } from 'react-native'

// Production Backend ERP M-Shipping:
// Server: app.sampai.co (HTTPS Port 443 with Let's Encrypt SSL)
// API Base Path: /api
export const DEFAULT_API_URL = 'https://app.sampai.co/api'

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

// Handle 401 unauthorized & transparent sliding token refresh
apiClient.interceptors.response.use(
  (response) => {
    // Sliding token refresh: jika backend menyertakan token baru pada header, simpan otomatis
    const refreshedToken = response.headers?.['x-refreshed-token']
    if (refreshedToken && typeof refreshedToken === 'string') {
      useAuthStore.getState().setToken(refreshedToken)
    }
    return response
  },
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
