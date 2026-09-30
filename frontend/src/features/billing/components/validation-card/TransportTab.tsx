import React from 'react'
import { AlertTriangle, Truck } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { BillingValidationState } from '../../hooks/useBillingValidation'

export interface TransportTabProps {
  hasUnbilledTransport: boolean
  unbilledExpedisiList: any[]
  codExpedisiList: any[]
  validExpedisiList: any[]
  validation?: BillingValidationState
}

export const TransportTab: React.FC<TransportTabProps> = ({
  hasUnbilledTransport,
  unbilledExpedisiList,
  codExpedisiList,
  validExpedisiList,
  validation,
}) => {
  return (
    <div className="space-y-3.5 animate-fadeIn">
      {hasUnbilledTransport && (
        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-amber-800 dark:text-amber-300 block">
              Biaya Ekspedisi Harus Tagih (tbExpIndo) Belum Ditagihkan
            </span>
            <span className="text-amber-700 dark:text-amber-400 mt-0.5 block">
              Ditemukan {unbilledExpedisiList.length} data ekspedisi Harus Tagih (fdPaid: 1) dengan total biaya {formatCurrency(validation?.totalUnbilledTransportAmount || 0)} di tbExpIndo yang belum tercantum pada item invoice.
            </span>
          </div>
        </div>
      )}

      {!validation?.hasTransportItem && codExpedisiList.length > 0 && !hasUnbilledTransport && (
        <div className="p-3.5 rounded-xl border border-sky-500/30 bg-sky-500/10 flex items-start gap-2.5">
          <Truck className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-sky-900 dark:text-sky-300 block">
              Ekspedisi Berstatus COD (Bayar di Tujuan) — Tidak Perlu Tagih
            </span>
            <span className="text-sky-800/90 dark:text-sky-400 mt-0.5 block">
              Tercatat {codExpedisiList.length} pengiriman berstatus COD (fdPaid = 2). Biaya ongkir dibayar langsung oleh penerima saat barang tiba.
            </span>
          </div>
        </div>
      )}

      <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2.5 shadow-2xs">
        <div className="flex items-center justify-between text-xs font-bold text-[var(--color-primary)]">
          <span className="flex items-center gap-1.5">
            <Truck size={14} className="text-blue-600 dark:text-blue-400" />
            Data Ekspedisi Lokal (tbExpIndo)
          </span>
          <span className="text-[10px] text-[var(--color-secondary)]">
            {validExpedisiList.length} Data Terverifikasi
          </span>
        </div>
        {validExpedisiList.length > 0 ? (
          <div className="divide-y divide-[var(--color-border)]/60 text-xs">
            {validExpedisiList.map((exp: any) => (
              <div key={exp.fdId} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-[var(--color-primary)] truncate">
                      {exp.fdExpName || 'Ekspedisi'}
                    </span>
                    {exp.fdPaid === 1 ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                        Harus Tagih
                      </span>
                    ) : exp.fdPaid === 2 ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-500/10 text-sky-600 border border-sky-500/30">
                        COD
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[10px] text-[var(--color-secondary)] block truncate">
                    {exp.fdResiExp ? `No. Resi: ${exp.fdResiExp}` : 'Tanpa resi'} {exp.fdJmlBerat ? `• Berat: ${exp.fdJmlBerat} kg` : ''}
                  </span>
                </div>
                <span className="font-mono font-bold text-sm text-[var(--color-primary)] shrink-0">
                  {formatCurrency(exp.fdTotalExp)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center space-y-1">
            <p className="text-xs font-semibold text-[var(--color-primary)]">
              Tidak Ditemukan Catatan Ekspedisi Lokal (tbExpIndo)
            </p>
            <p className="text-[11px] text-[var(--color-secondary)] max-w-sm mx-auto">
              Belum ada data biaya ekspedisi lokal tercatat untuk list atau customer ini.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
