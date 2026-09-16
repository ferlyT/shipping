import { Coins, Info } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

export interface FreightAuditTabProps {
  freightChargeSummary?: {
    totalFc?: number
    currency?: string
    listsWithFcCount?: number
  } | null
}

export function FreightAuditTab({ freightChargeSummary }: FreightAuditTabProps) {
  const hasFc = Boolean(freightChargeSummary?.totalFc && freightChargeSummary.totalFc > 0)

  return (
    <div className="space-y-2.5 animate-fadeIn">
      <div className="p-2.5 sm:p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
            <Coins size={14} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[var(--color-primary)]">
              Status Biaya Freight Charge (Valas)
            </h4>
            <span className="text-[10px] text-[var(--color-secondary)]">
              Data operasional EntryList
            </span>
          </div>
        </div>
        <span
          className={`text-[10.5px] px-2 py-0.5 rounded-full font-bold border ${
            hasFc
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
          }`}
        >
          {hasFc ? 'Terdapat Biaya FC' : 'Tidak Ada FC'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">
            Total FC Valas
          </span>
          <span className="text-[16px] sm:text-[17px] font-bold font-mono text-[var(--color-primary)] block">
            {formatNumber(freightChargeSummary?.totalFc || 0)} {freightChargeSummary?.currency || ''}
          </span>
          <span className="text-[10px] text-[var(--color-secondary)] block truncate">
            EntryList operasional
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">
            Jumlah List Batch
          </span>
          <span className="text-[16px] sm:text-[17px] font-bold font-mono text-[var(--color-primary)] block">
            {freightChargeSummary?.listsWithFcCount || 0} list
          </span>
          <span className="text-[10px] text-[var(--color-secondary)] block truncate">
            List dengan nilai FC
          </span>
        </div>
      </div>

      <div className="p-2 rounded-md bg-[var(--color-neutral)]/70 text-[10.5px] text-[var(--color-secondary)] flex items-center gap-2">
        <Info size={12} className="text-[var(--color-tertiary)] shrink-0" />
        <span>
          Untuk rincian kurs valas dan nomor list batch terkait, user dapat melihat pada halaman validasi detail di belakang dialog ini.
        </span>
      </div>
    </div>
  )
}
