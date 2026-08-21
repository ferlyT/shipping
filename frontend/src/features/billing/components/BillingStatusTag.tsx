export type BillingStatus = 'draft' | 'issued' | 'collected'

export const BILLING_STATUS_CONFIG: Record<BillingStatus, { label: string; className: string }> = {
  draft: { label: 'DRAFT', className: 'bg-[var(--color-neutral)] text-[var(--color-secondary)] border-[var(--color-border)]' },
  issued: { label: 'ISSUED', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  collected: { label: 'COLLECTED', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
}

type StatusRow = { fdGive?: number | null; fdGive2?: number | null; fdCekDate?: string | null }

export function getBillingStatus(row?: StatusRow | null): BillingStatus {
  if (!row) return 'draft'
  if (row.fdGive2 === 1) return 'collected'
  if (row.fdGive === 1) return 'issued'
  if (!row.fdCekDate) return 'draft'
  return 'draft'
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
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider whitespace-nowrap uppercase border ${className}`}>
      {label}
    </span>
  )
}
