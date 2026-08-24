import { getBillingStatus, type BillingStatus, type StatusRow } from '../utils/billing.utils'

export const BILLING_STATUS_CONFIG: Record<BillingStatus, { label: string; className: string }> = {
  draft: { label: 'DRAFT', className: 'bg-transparent text-[var(--color-secondary)] border-[var(--color-border)]' },
  issued: { label: 'ISSUED', className: 'bg-transparent text-amber-600 dark:text-amber-400 border-amber-500/40' },
  collected: { label: 'COLLECTED', className: 'bg-transparent text-emerald-600 dark:text-emerald-400 border-emerald-500/40' },
}

export function BillingStatusTag({
  row,
  give,
  give2,
  cekDate,
}: {
  row?: StatusRow | null
  give?: number | null
  give2?: number | null
  cekDate?: string | null
}) {
  const statusRow = row || { fdGive: give, fdGive2: give2, fdCekDate: cekDate }
  const { label, className } = BILLING_STATUS_CONFIG[getBillingStatus(statusRow)]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider whitespace-nowrap uppercase border ${className}`}>
      {label}
    </span>
  )
}
