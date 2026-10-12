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

export function useBillingViewConsigneePermission(): boolean {
  const user = useAuthStore((s) => s.user)
  if (!user) return false
  const role = user.role?.toLowerCase()
  if (role === 'admin' || role === 'superadmin') return true
  const perms = user.permissions || []
  return (
    perms.includes('/*') ||
    perms.includes(ROUTES.BILLING_VIEW_CONSIGNEE) ||
    perms.includes('/mshipping/finance/billing/view-consignee') ||
    perms.includes('/mshipping/finance/billing/view_consignee') ||
    perms.includes('billing.view_consignee')
  )
}

export interface BillingDashboardPermissions {
  canViewOperation: boolean
  canViewFinance: boolean
  canViewAny: boolean
}

export function useBillingDashboardPermissions(): BillingDashboardPermissions {
  const user = useAuthStore((s) => s.user)
  if (!user) return { canViewOperation: false, canViewFinance: false, canViewAny: false }
  const role = user.role?.toLowerCase()
  if (role === 'admin' || role === 'superadmin') {
    return { canViewOperation: true, canViewFinance: true, canViewAny: true }
  }
  const perms = user.permissions || []
  if (perms.includes('/*')) {
    return { canViewOperation: true, canViewFinance: true, canViewAny: true }
  }

  const hasOp =
    perms.includes(ROUTES.BILLING_OPERATIONAL) ||
    perms.includes('/mshipping/finance/billing/operational') ||
    perms.includes('/mshipping/finance/billing/operation')
  const hasFin =
    perms.includes(ROUTES.BILLING_FINANCE) ||
    perms.includes('/mshipping/finance/billing/finance')
  const hasLegacy =
    perms.includes(ROUTES.BILLING) ||
    perms.includes('/mshipping/finance/billing')

  const canViewOperation = hasOp || (hasLegacy && !hasFin)
  const canViewFinance = hasFin || (hasLegacy && !hasOp)

  return {
    canViewOperation,
    canViewFinance,
    canViewAny: canViewOperation || canViewFinance,
  }
}

