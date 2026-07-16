import axios from 'axios'

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

// Handle 401 — auto logout
apiClient.interceptors.response.use(
  (response) => response,
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
