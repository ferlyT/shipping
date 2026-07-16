import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/lib/constants'

export function DefaultRouteRedirect() {
  const { user } = useAuthStore()

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (user.role === 'admin') {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  if (user.defaultRoute) {
    return <Navigate to={user.defaultRoute} replace />
  }

  // Fallback if no default route is set
  if (user.permissions && user.permissions.length > 0) {
    return <Navigate to={user.permissions[0]} replace />
  }

  // If no permissions at all, stay on a blank or unauthorized page
  // For now, redirect to login which will clear state or show unauthorized
  return (
    <div className="flex h-screen items-center justify-center text-gray-500">
      Anda tidak memiliki izin untuk melihat halaman manapun. Silakan hubungi Administrator.
    </div>
  )
}
