import React from 'react'
import { Coins } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatNumber } from '@/lib/utils'
import type { M3CheckResponse } from './types'

export interface FreightChargeTabProps {
  res?: M3CheckResponse | null
  hasFreightCharge: boolean
}

export const FreightChargeTab: React.FC<FreightChargeTabProps> = ({
  res,
  hasFreightCharge,
}) => {
  return (
    <div className="space-y-3.5">
      <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
            <Coins size={16} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[var(--color-primary)]">
              Status Biaya Freight Charge (Valas)
            </h4>
            <span className="text-[10px] text-[var(--color-secondary)]">
              Data operasional dari EntryList pengiriman
            </span>
          </div>
        </div>
        <span
          className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
            hasFreightCharge
              ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
              : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
          }`}
        >
          {hasFreightCharge ? 'Terdapat Biaya FC' : 'Tidak Ada FC'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
        <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
          <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Total FC Valas</span>
          <span className="text-base font-bold font-mono text-[var(--color-primary)] block">
            {formatNumber(res?.freightChargeSummary?.totalFc || 0)} {res?.freightChargeSummary?.currency || ''}
          </span>
          <span className="text-[10px] text-[var(--color-secondary)] block truncate">Total biaya freight charge valas</span>
        </div>
        <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
          <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Jumlah List Batch Terkena</span>
          <span className="text-base font-bold font-mono text-[var(--color-primary)] block">
            {res?.freightChargeSummary?.listsWithFcCount || 0} list
          </span>
          <span className="text-[10px] text-[var(--color-secondary)] block truncate">Nomor list batch yang memuat nilai FC</span>
        </div>
      </div>

      {(() => {
        const fcSummary = res?.freightChargeSummary as any
        const listsWithFc = fcSummary?.listsWithFc as string[] | undefined
        if (!hasFreightCharge || !listsWithFc || listsWithFc.length === 0) return null
        return (
          <div className="p-3 rounded-xl bg-[var(--color-neutral)] border border-[var(--color-border)] text-xs space-y-1.5">
            <span className="text-[11px] font-bold text-[var(--color-primary)] block">Daftar List Batch FC:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {listsWithFc.map((lc: string) => (
                <Badge key={lc} variant="default" className="font-mono text-[10px]">
                  {lc}
                </Badge>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
