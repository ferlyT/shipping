export type BillingStatus = 'draft' | 'issued' | 'collected'

export const BILLING_STATUS_CONFIG: Record<BillingStatus, { label: string; className: string }> = {
  draft: { label: 'DRAFT', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  issued: { label: 'ISSUED', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  collected: { label: 'COLLECTED', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
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
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold tracking-wider whitespace-nowrap uppercase ${className}`}>
      {label}
    </span>
  )
}
