import { formatDecimal } from '@/lib/utils'

export type BillingStatus = 'draft' | 'issued' | 'collected'

export interface StatusRow {
  fdGive?: number | null
  fdGive2?: number | null
  fdCekDate?: string | null
}

/**
 * Format kuantiti desimal secara presisi untuk item M2 / M3 vs unit umum
 */
export function formatQtyDecimal(qty: number, unitStr?: string | null, itemName?: string | null): string {
  const num = Number(qty || 0)
  const unit = (unitStr || '').trim().toUpperCase()
  const name = (itemName || '').trim().toUpperCase()

  const isM2 = unit === 'M2' || name.includes('M2')
  const isM3 = unit === 'M3' || name.includes('M3')

  if (isM2 || isM3) {
    return formatDecimal(num, 4)
  }

  // Jika angka bulat tanpa pecahan, tampilkan integer
  if (Number.isInteger(num)) {
    return num.toLocaleString('id-ID')
  }

  return formatDecimal(num, 2)
}

/**
 * Menghitung selisih hari penuaan (aging) dari tanggal invoice
 */
export function getAgingDays(invDateStr?: string | null): number {
  if (!invDateStr) return 0
  const invDate = new Date(invDateStr)
  if (isNaN(invDate.getTime())) return 0
  const today = new Date()
  invDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const diffTime = today.getTime() - invDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 0
}

/**
 * Menentukan status invoice (draft | issued | collected)
 */
export function getBillingStatus(row?: StatusRow | null): BillingStatus {
  if (!row) return 'draft'
  if (row.fdGive2 === 1) return 'collected'
  if (row.fdGive === 1) return 'issued'
  if (!row.fdCekDate) return 'draft'
  return 'draft'
}
