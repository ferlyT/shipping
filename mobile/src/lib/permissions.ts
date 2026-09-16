import { User } from '@/stores/authStore'

/**
 * Helper izin akses (permission & role) sinkron dengan aturan frontend web
 */

export function isAdmin(user: User | null | undefined): boolean {
  return user?.role === 'admin' || user?.role === 'superadmin' || Boolean(user?.permissions?.includes('/*'))
}

export function hasPermission(user: User | null | undefined, path: string): boolean {
  if (!user) return false
  if (isAdmin(user)) return true
  if (!user.permissions || user.permissions.length === 0) return false
  return user.permissions.some((p) => p === path || p.startsWith(path) || path.startsWith(p))
}

export function canViewConsignee(user: User | null | undefined): boolean {
  if (!user) return false
  if (isAdmin(user)) return true
  return Boolean(user.permissions?.includes('billing.view_consignee'))
}

export function hasTabAccess(user: User | null | undefined, tab: 'overview' | 'logistics' | 'finance' | 'master' | 'profile'): boolean {
  if (!user) return false
  if (isAdmin(user)) return true
  if (tab === 'overview' || tab === 'profile') return true

  if (tab === 'logistics') {
    return Boolean(
      user.permissions?.some(
        (p) =>
          p.startsWith('/mshipping/logistics') ||
          p === '/mshipping/logistics/shipments' ||
          p === '/mshipping/logistics/batches' ||
          p === '/mshipping/logistics/delivery-orders'
      )
    )
  }

  if (tab === 'finance') {
    return Boolean(
      user.permissions?.some(
        (p) =>
          p.startsWith('/mshipping/finance') ||
          p === '/mshipping/finance/billing' ||
          p === '/mshipping/finance/price-list'
      )
    )
  }

  if (tab === 'master') {
    return Boolean(
      user.permissions?.some(
        (p) =>
          p.startsWith('/mshipping/master') ||
          p === '/mshipping/master/customers'
      )
    )
  }

  return true
}

export function canViewBillingValidation(user: User | null | undefined): boolean {
  if (!user) return false
  if (isAdmin(user)) return true
  return Boolean(
    user.permissions?.some(
      (p) =>
        p === '/mshipping/finance/billing/validation' ||
        p === '/mshipping/finance/billing/validation/list' ||
        p === '/mshipping/finance/billing/validation/summary'
    )
  )
}
