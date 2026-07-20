import { Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { DefaultRouteRedirect } from './DefaultRouteRedirect'

// Extracted from dynamic config or just mapped here
// We can also just match against path directly
export function PermissionGuard() {
  const { user } = useAuthStore()
  const { pathname } = useLocation()

  // Always allow admin to pass, or check strictly
  if (user?.role === 'admin') {
    return <Outlet />
  }

  // Check if current path is in the user's permissions
  // To handle dynamic IDs like /shipping/shipments/123, we should check if the pathname starts with the permission path
  // or we can just require exact matches for base routes.
  
  const hasAccess = user?.permissions?.some(p => {
    if (p === '/*') return true
    // If permission is /mshipping/shipments, it should allow /mshipping/shipments/123
    return pathname === p || pathname.startsWith(p + '/')
  })

  if (!hasAccess) {
    // If no access, fallback to DefaultRouteRedirect logic
    return <DefaultRouteRedirect />
  }

  return <Outlet />
}
