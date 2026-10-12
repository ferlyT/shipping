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
  return user.permissions.some((p) => {
    if (p === path || p === '/*') return true
    if (p.endsWith('/*') && path.startsWith(p.slice(0, -2))) return true
    if (path.startsWith(p + '/')) return true
    return false
  })
}

export function canViewConsignee(user: User | null | undefined): boolean {
  if (!user) return false
  if (isAdmin(user)) return true
  return Boolean(
    user.permissions?.includes('billing.view_consignee') ||
    user.permissions?.includes('/mshipping/finance/billing/view_consignee') ||
    user.permissions?.includes('/mshipping/finance/billing/view-consignee')
  )
}

export function hasTabAccess(user: User | null | undefined, tab: 'overview' | 'logistics' | 'finance' | 'master' | 'profile'): boolean {
  if (!user) return false
  if (isAdmin(user)) return true
  if (tab === 'overview' || tab === 'profile') return true

  if (tab === 'logistics') {
    return Boolean(
      user.permissions?.some(
        (p) =>
          p === '/mshipping/logistics' ||
          p === '/mshipping/logistics/*' ||
          p.startsWith('/mshipping/logistics/') ||
          p.startsWith('/mshipping/shipment') ||
          p.startsWith('/mshipping/delivery-orders') ||
          p.startsWith('/mshipping/inspection') ||
          p.startsWith('/mshipping/data-revisions')
      )
    )
  }

  if (tab === 'finance') {
    return Boolean(
      user.permissions?.some(
        (p) =>
          p === '/mshipping/finance' ||
          p === '/mshipping/finance/*' ||
          p.startsWith('/mshipping/finance/') ||
          p.startsWith('/mshipping/billing') ||
          p.startsWith('/mshipping/price-list') ||
          p.startsWith('/mshipping/customer-price-list') ||
          p.startsWith('/mshipping/cashier')
      )
    )
  }

  if (tab === 'master') {
    return Boolean(
      user.permissions?.some(
        (p) =>
          p === '/mshipping/master' ||
          p === '/mshipping/master/*' ||
          p.startsWith('/mshipping/master/') ||
          p.startsWith('/mshipping/customers')
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
        p === '/mshipping/finance/billing/validation/summary' ||
        p.startsWith('/mshipping/finance/billing/validation/')
    )
  )
}

export function canManageInspectionReports(user: User | null | undefined): boolean {
  if (!user) return false
  if (isAdmin(user)) return true
  return Boolean(
    user.permissions?.some(
      (p) =>
        p === '/mshipping/logistics' ||
        p === '/mshipping/logistics/*' ||
        p === '/mshipping/logistics/inspection' ||
        p === '/mshipping/logistics/inspection-reports' ||
        p === '/mshipping/inspection-reports' ||
        p.startsWith('/mshipping/logistics/inspection')
    )
  )
}

export function canManageDataRevisions(user: User | null | undefined): boolean {
  if (!user) return false
  if (isAdmin(user)) return true
  return Boolean(
    user.permissions?.some(
      (p) =>
        p === '/mshipping/logistics' ||
        p === '/mshipping/logistics/*' ||
        p === '/mshipping/logistics/data-revisions' ||
        p === '/mshipping/data-revisions' ||
        p.startsWith('/mshipping/logistics/data-revisions')
    )
  )
}

export function canManageBatchExitDate(user: User | null | undefined): boolean {
  if (!user) return false
  if (isAdmin(user)) return true
  return Boolean(
    user.permissions?.some(
      (p) =>
        p === '/mshipping/logistics' ||
        p === '/mshipping/logistics/*' ||
        p === '/mshipping/logistics/batches' ||
        p === '/mshipping/logistics/shipment-batches' ||
        p === '/mshipping/shipment-batches' ||
        p.startsWith('/mshipping/logistics/batches') ||
        p.startsWith('/mshipping/logistics/shipment-batches')
    )
  )
}

export function canManageBillingAttachments(user: User | null | undefined): boolean {
  if (!user) return false
  if (isAdmin(user)) return true
  return Boolean(
    user.permissions?.some(
      (p) =>
        p === '/mshipping/finance' ||
        p === '/mshipping/finance/*' ||
        p === '/mshipping/finance/billing' ||
        p === '/mshipping/finance/billing/attachments' ||
        p === '/mshipping/billing/attachments' ||
        p.startsWith('/mshipping/finance/billing/attachments')
    )
  )
}

export function canDeleteBillingAttachment(user: User | null | undefined): boolean {
  if (!user) return false
  if (isAdmin(user)) return true
  return Boolean(
    user.permissions?.some(
      (p) =>
        p === '/mshipping/finance/billing/attachments/delete' ||
        p === '/mshipping/billing/attachments/delete'
    )
  )
}

export function canViewBillingOperational(user: User | null | undefined): boolean {
  if (!user) return false
  if (isAdmin(user)) return true
  const perms = user.permissions || []
  return Boolean(
    perms.includes('/*') ||
    perms.includes('/mshipping/finance/billing/operational') ||
    perms.includes('/mshipping/finance/billing/operation') ||
    perms.includes('/mshipping/finance/billing') ||
    perms.includes('/mshipping/billing')
  )
}

export function canViewBillingFinance(user: User | null | undefined): boolean {
  if (!user) return false
  if (isAdmin(user)) return true
  const perms = user.permissions || []
  return Boolean(
    perms.includes('/*') ||
    perms.includes('/mshipping/finance/billing/finance') ||
    perms.includes('/mshipping/finance/billing') ||
    perms.includes('/mshipping/billing')
  )
}

export function canValidateBilling(user: User | null | undefined): boolean {
  if (!user) return false
  if (isAdmin(user)) return true
  const perms = user.permissions || []
  return Boolean(
    perms.includes('/*') ||
    perms.includes('/mshipping/finance/billing/validation') ||
    perms.includes('/mshipping/finance/billing/validation/list') ||
    perms.includes('/mshipping/finance/billing/validation/summary') ||
    perms.includes('/mshipping/billing/validation')
  )
}






