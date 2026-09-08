import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { Billing } from '../types/billing.types'
import type { StatusRow } from '../utils/billing.utils'

export type BillingPaymentStatus = 'LUNAS' | 'SEBAGIAN' | 'BELUM LUNAS' | 'PARTIAL' | 'OVERDUE' | 'UNPAID' | 'ISSUED' | 'DRAFT'

export function computeBillingPaymentStatus(row?: (Billing & StatusRow) | null): BillingPaymentStatus {
  if (!row) return 'DRAFT'
  if (row.paymentStatus) return row.paymentStatus

  const isIssued = Number(row.fdGive) === 1
  const isCollected = Number(row.fdGive2) === 1

  if (!isIssued) return 'DRAFT'

  const totals = (row as Billing).totals
  const sumJumlahTotals = totals && totals.length > 0
    ? totals.reduce((sum, t) => sum + Number(t.fdJumlah || 0), 0)
    : Number(row.fdJumlah1 || 0)

  const sumBayarTotals = totals && totals.length > 0
    ? totals.reduce((sum, t) => sum + Number(t.fdBayar || 0), 0)
    : 0

  const hasSLunas = totals?.some((t) => t.fdSLunas === 1)

  if (isCollected || hasSLunas || (sumJumlahTotals > 0 && Math.abs(sumJumlahTotals - sumBayarTotals) <= 0.01)) {
    return 'LUNAS'
  }

  if (sumBayarTotals > 0) {
    return 'PARTIAL'
  }

  const now = new Date()
  const invoiceDate = row.fdInvDate ? new Date(row.fdInvDate) : null
  const ageDays = invoiceDate
    ? Math.floor((now.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  if (sumBayarTotals === 0 && ageDays > 30) {
    return 'OVERDUE'
  }

  if (sumBayarTotals === 0 && ageDays < 7) {
    return 'ISSUED'
  }

  return 'UNPAID'
}

export function BillingStatusTag({
  row,
  status,
  give,
  give2,
  cekDate,
}: {
  row?: (Billing & StatusRow) | null
  status?: BillingPaymentStatus | null
  give?: number | null
  give2?: number | null
  cekDate?: string | null
}) {
  const paymentStatus = status || computeBillingPaymentStatus(row || ({ fdGive: give, fdGive2: give2, fdCekDate: cekDate } as any))

  const variant =
    paymentStatus === 'LUNAS'
      ? 'success'
      : paymentStatus === 'PARTIAL'
      ? 'warning'
      : paymentStatus === 'OVERDUE'
      ? 'danger'
      : paymentStatus === 'DRAFT'
      ? 'default'
      : 'info'

  const label =
    paymentStatus === 'LUNAS'
      ? 'Lunas'
      : paymentStatus === 'PARTIAL'
      ? 'Sebagian'
      : paymentStatus === 'ISSUED'
      ? 'Baru Terbit'
      : paymentStatus === 'OVERDUE'
      ? 'Jatuh Tempo'
      : paymentStatus === 'DRAFT'
      ? 'Draft'
      : 'Belum Lunas'

  return (
    <Badge
      variant={variant}
      className="text-[10px] px-1.5 py-0.5 font-bold inline-flex items-center gap-1 whitespace-nowrap"
    >
      {paymentStatus === 'LUNAS' && <CheckCircle2 size={10} />}
      {(paymentStatus === 'PARTIAL' || paymentStatus === 'ISSUED' || paymentStatus === 'UNPAID' || paymentStatus === 'DRAFT') && <Clock size={10} />}
      {paymentStatus === 'OVERDUE' && <AlertTriangle size={10} />}
      <span>{label}</span>
    </Badge>
  )
}

export const BILLING_STATUS_CONFIG = {
  draft: { label: 'DRAFT', className: 'bg-transparent text-[var(--color-secondary)] border-[var(--color-border)]' },
  issued: { label: 'ISSUED', className: 'bg-transparent text-amber-600 dark:text-amber-400 border-amber-500/40' },
  collected: { label: 'COLLECTED', className: 'bg-transparent text-emerald-600 dark:text-emerald-400 border-emerald-500/40' },
} as const
