import axios from 'axios'
import { useAuthStore } from '../stores/authStore'
import { Platform } from 'react-native'

// Production Backend ERP M-Shipping:
// Server: 36.93.22.142 Port: 3010
// API Base Path: /api
export const DEFAULT_API_URL = 'http://36.93.22.142:3010/api'

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
