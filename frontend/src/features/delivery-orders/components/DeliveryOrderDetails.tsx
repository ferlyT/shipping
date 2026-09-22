import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2, CheckCircle2, Clock, Printer, FileCheck } from 'lucide-react'
import { deliveryOrdersApi } from '../services/delivery-orders.service'
import { ROUTES } from '@/lib/constants'
import { formatDate, displayCustName } from '@/lib/utils'

export function DeliveryOrderDetails({ listCode }: { listCode: string }) {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['delivery-orders', listCode],
    queryFn: async () => {
      const res = await deliveryOrdersApi.list({ listCode, limit: 100 })
      return res.data as { data: any[] }
    },
  })

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center py-8 bg-[var(--color-neutral)] gap-3">
        <Loader2 className="w-7 h-7 text-[var(--color-tertiary)] animate-spin" />
        <p className="text-[var(--color-secondary)] text-xs animate-pulse">Memuat delivery orders...</p>
      </div>
    )
  }

  if (!data?.data?.length) {
    return (
      <div className="bg-[var(--color-neutral)] px-6 py-8 text-center text-sm text-[var(--color-secondary)]">
        Tidak ada delivery order yang ditemukan untuk list code ini.
      </div>
    )
  }

  return (
    <div className="bg-[var(--color-neutral)]/50 p-5 sm:p-6 border-t border-[var(--color-border)]">
      <div className="flex items-center gap-2 mb-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">Delivery Orders</h4>
        <span className="rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-0.5 text-xs font-semibold text-[var(--color-secondary)]">
          {data.data.length}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {data.data.map((sj: any) => (
          <div 
            key={sj.fdSJNo}
            onClick={() => navigate(ROUTES.DELIVERY_DETAIL(sj.fdSJNo))}
            className="group cursor-pointer rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all duration-200 hover:border-[var(--color-tertiary)] hover:shadow-sm"
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="truncate text-sm font-semibold text-[var(--color-primary)] group-hover:text-[var(--color-tertiary)] transition-colors">
                {sj.fdSJNo}
              </p>
              <span className="flex-shrink-0 rounded-md bg-[var(--color-neutral)] border border-[var(--color-border)] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--color-secondary)]">
                {sj.fdJmlPackSJ ?? 0} qty
              </span>
            </div>

            {/* Status Badges */}
            <div className="flex items-center gap-1 flex-wrap mb-2">
              {sj.fdSent === 1 ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-emerald-500/10 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={9} className="shrink-0 text-emerald-500" />
                  <span>Terkirim</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-amber-500/10 border border-amber-500/40 text-amber-600 dark:text-amber-400">
                  <Clock size={9} className="shrink-0 text-amber-500" />
                  <span>Proses</span>
                </span>
              )}

              {sj.fdPrintDate && (
                <span
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-sky-500/10 border border-sky-500/40 text-sky-600 dark:text-sky-400"
                  title={`Dicetak: ${formatDate(sj.fdPrintDate)}`}
                >
                  <Printer size={9} className="shrink-0 text-sky-500" />
                  <span>Printed</span>
                </span>
              )}

              {sj.fdGive === 1 && (
                <span
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-purple-500/10 border border-purple-500/40 text-purple-600 dark:text-purple-400"
                  title={sj.fdGiveDate ? `Diserahkan ke AR: ${formatDate(sj.fdGiveDate)}` : 'AR'}
                >
                  <FileCheck size={9} className="shrink-0 text-purple-500" />
                  <span>AR{sj.fdGiveDate ? ` (${formatDate(sj.fdGiveDate)})` : ''}</span>
                </span>
              )}
            </div>

            <p className="truncate text-xs text-[var(--color-secondary)] mb-3" title={displayCustName(sj.fdCustNameSJ || sj.fdCustCode)}>
              {displayCustName(sj.fdCustNameSJ || sj.fdCustCode, 'No Customer')}
            </p>
            <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-2.5 text-xs text-[var(--color-secondary)]">
              <span className="truncate font-medium text-[var(--color-primary)]" title={sj.fdSupir || undefined}>
                {sj.fdSupir || '—'}
              </span>
              <span className="flex-shrink-0 tabular-nums">
                {formatDate(sj.fdSJDate)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
