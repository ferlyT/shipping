import { Check, Circle } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import type { Shipment } from '../../types/shipments.types'

interface ShipmentTimelineTabProps {
  shipment: Shipment
}

export function ShipmentTimelineTab({ shipment }: ShipmentTimelineTabProps) {
  const status = shipment.shipmentStatus
  const currentStep = status?.statusStep ?? 0
  const gudang = status?.fdGudang?.trim()
  const isCanceled = currentStep === -1 || Number(shipment.fdCancel) === 1

  if (isCanceled) {
    return (
      <div className="bg-[var(--color-surface)] rounded-2xl border border-rose-500/20 shadow-sm p-6 text-center flex flex-col items-center justify-center gap-3 animate-in fade-in duration-200">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 font-bold text-lg border border-rose-500/20">
          ✕
        </div>
        <div>
          <h4 className="text-sm font-bold text-[var(--color-text)]">Pengiriman Dibatalkan (Canceled)</h4>
          <p className="text-xs text-[var(--color-secondary)] max-w-sm mt-1 leading-relaxed">
            Data resi ini memiliki status dibatalkan (<code className="text-rose-500 font-mono">fdCancel = 1</code>). Seluruh aktivitas dan tahapan logistik tidak dilanjutkan.
          </p>
        </div>
      </div>
    )
  }

  const steps = [
    { label: 'Waiting Loading', desc: 'Menunggu proses loading ke kontainer', date: status?.fdLoadDate, stepValue: 1 },
    { label: 'ETD (Keberangkatan)', desc: 'Estimated Time of Departure', date: status?.fdETD, stepValue: 2 },
    { label: 'ETA (Kedatangan)', desc: 'Estimated Time of Arrival di pelabuhan', date: status?.fdETA, stepValue: 3 },
    { label: 'Warehouse (Gudang)', desc: gudang ? `Tiba di ${gudang}` : 'Tiba di gudang penyortiran', date: status?.fdExitDate, stepValue: 4 },
    { label: 'Delivery', desc: 'Dalam pengantaran ke penerima', date: null, stepValue: 5, noDate: true },
    { label: 'Delivered', desc: 'Barang telah diterima oleh customer', date: null, stepValue: 6, noDate: true },
  ]

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-4 sm:p-5 animate-in fade-in duration-200">
      <div className="relative flex flex-col gap-5">
        {steps.map((step, idx) => {
          const isDone = currentStep >= step.stepValue
          const isCurrent = currentStep === step.stepValue
          const isLast = idx === steps.length - 1

          return (
            <div key={step.label} className="relative flex gap-3.5">
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'absolute top-6 bottom-[-20px] left-[13px] w-[2px] transition-colors',
                    currentStep > step.stepValue ? 'bg-emerald-500' : 'bg-[var(--color-border)]'
                  )}
                />
              )}

              {/* Step indicator node */}
              <div
                className={cn(
                  'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                  isDone
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                    : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)]',
                  isCurrent && 'ring-4 ring-emerald-500/20 border-emerald-500'
                )}
              >
                {isDone ? (
                  <Check size={14} strokeWidth={3} />
                ) : (
                  <Circle size={6} className="fill-[var(--color-border)]" />
                )}
              </div>

              {/* Step Details */}
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1 min-w-0 pt-0.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn('text-xs sm:text-[13px] font-bold', isDone ? 'text-[var(--color-text)]' : 'text-[var(--color-secondary)]')}>
                      {step.label}
                    </p>
                    {isCurrent && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-500 uppercase tracking-wider">
                        Sedang Berjalan
                      </span>
                    )}
                  </div>
                  <p className={cn('text-[11px] leading-relaxed', isDone ? 'text-[var(--color-secondary)]' : 'text-[var(--color-secondary)]')}>
                    {step.desc}
                  </p>
                </div>

                <div className="shrink-0 mt-0.5 sm:mt-0">
                  {step.noDate ? (
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold',
                        isDone ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[var(--color-neutral)] text-[var(--color-secondary)]'
                      )}
                    >
                      {isDone ? 'Selesai' : 'Menunggu'}
                    </span>
                  ) : step.date ? (
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tabular-nums',
                        isDone ? 'bg-[var(--color-neutral)] text-[var(--color-text)]' : 'bg-[var(--color-neutral)] text-[var(--color-secondary)]'
                      )}
                    >
                      {formatDate(step.date)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium text-[var(--color-secondary)] bg-[var(--color-neutral)]">
                      Menunggu
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
