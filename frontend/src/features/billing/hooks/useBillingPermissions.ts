import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/lib/constants'

export function useBillingValidationSummaryPermission(): boolean {
  const user = useAuthStore((s) => s.user)
  if (!user) return false
  if (user.role?.toLowerCase() === 'admin') return true
  const perms = user.permissions || []
  return (
    perms.includes('/*') ||
    perms.includes(ROUTES.BILLING_VALIDATION_SUMMARY) ||
    perms.includes('/mshipping/finance/billing/validation/summary')
  )
}

export function useBillingValidationDetailPermission(): boolean {
  const user = useAuthStore((s) => s.user)
  if (!user) return false
  if (user.role?.toLowerCase() === 'admin') return true
  const perms = user.permissions || []
  return (
    perms.includes('/*') ||
    perms.includes(ROUTES.BILLING_VALIDATION_DETAIL_PATH) ||
    perms.includes('/mshipping/finance/billing/validation') ||
    perms.includes(ROUTES.BILLING_VALIDATION_LIST)
  )
}
