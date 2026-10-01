import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Inject token ke setiap request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle token refresh & 401 — auto logout
apiClient.interceptors.response.use(
  (response) => {
    // Auto-refresh token jika backend menyertakan header X-Refreshed-Token
    const refreshedToken = response.headers?.['x-refreshed-token']
    if (refreshedToken && typeof refreshedToken === 'string') {
      localStorage.setItem('token', refreshedToken)
      useAuthStore.setState({ token: refreshedToken })
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      // Hindari redirect (refresh) saat API login mengembalikan 401 (misal karena salah password / belum disetujui)
      if (!error.config?.url?.includes('/auth/login')) {
        window.location.href = import.meta.env.VITE_APP_BASE + '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
