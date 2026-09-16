// Utility helpers untuk Finance Screen
import { formatDecimal } from '@/lib/utils'

export function getAgingDays(dateStr?: string | Date): number {
  if (!dateStr) return 0
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 0
  const diffTime = Date.now() - d.getTime()
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))
}

export function getAgingBadge(days: number): { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' } {
  if (days <= 7) return { label: `${days}h (Baru)`, variant: 'success' }
  if (days <= 14) return { label: `${days}h (Perhatian)`, variant: 'warning' }
  if (days <= 30) return { label: `${days}h (Kritis)`, variant: 'danger' }
  return { label: `${days}h (Macet)`, variant: 'danger' }
}

export function formatQtyDecimal(qty: number, unitStr?: string | null, itemName?: string | null): string {
  const num = Number(qty || 0)
  const unit = (unitStr || '').trim().toUpperCase()
  const name = (itemName || '').trim().toUpperCase()

  const isM2 = unit === 'M2' || name.includes('M2')
  const isM3 = unit === 'M3' || name.includes('M3')

  if (isM2 || isM3) {
    return formatDecimal(num, 4)
  }

  if (Number.isInteger(num)) {
    return num.toLocaleString('en-US')
  }

  return formatDecimal(num, 2)
}

export function isVfcItem(name?: string | null): boolean {
  const n = (name || '').toUpperCase()
  return (
    n.includes('VOLUME FREIGHT') ||
    n.includes('FREIGHT CHARGE') ||
    n.includes('VFC')
  )
}

export function isMktCustomer(
  customer?: { fdBroker?: number | null; fdSalesNM?: string | null; sales?: string | null } | null,
  salesParam?: string | null
): boolean {
  if (!customer && !salesParam) return false
  if (customer && (customer as any).fdBroker === 1) return true
  const salesName = (
    salesParam ||
    customer?.sales ||
    customer?.fdSalesNM ||
    (customer as any)?.salesNM ||
    ''
  ).trim().toUpperCase()
  if (!salesName) return false
  if (salesName.includes('BROKER') || salesName.includes('MKT') || salesName.includes('MARKETING')) return true
  return false
}
