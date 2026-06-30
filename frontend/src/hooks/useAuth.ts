import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/lib/constants'

export function useAuth() {
  const { user, isAuthenticated, login, logout } = useAuthStore()
  return { user, isAuthenticated, login, logout }
}

// Gunakan ini di halaman yang membutuhkan auth
export function useRequireAuth() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  useEffect(() => {
    if (!isAuthenticated) navigate(ROUTES.LOGIN, { replace: true })
  }, [isAuthenticated, navigate])
}
