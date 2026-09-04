import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/lib/constants'

export function useCustomerTierPermission(): boolean {
  const user = useAuthStore((s) => s.user)
  if (!user) return false
  if (user.role?.toLowerCase() === 'admin') return true
  const perms = user.permissions || []
  return (
    perms.includes('/*') ||
    perms.includes(ROUTES.CUSTOMERS_TIER) ||
    perms.includes('/mshipping/master/customers/tier')
  )
}
