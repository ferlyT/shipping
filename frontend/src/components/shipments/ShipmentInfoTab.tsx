import { Box, Truck, CheckCircle2, Circle } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { ShipmentStatusBadge } from './ShipmentStatusBadge'
import type { Shipment } from '@/types/shipments'

export function ShipmentInfoTab({ shipment }: { shipment: Shipment }) {
  const status = shipment.shipmentStatus
  const gudang = status?.fdGudang?.trim()
  const steps = [
    { label: 'Load Date', date: status?.fdLoadDate, stepValue: 1 },
    { label: 'ETD', date: status?.fdETD, stepValue: 2 },
    { label: 'ETA', date: status?.fdETA, stepValue: 3 },
    { label: 'Keluar Gudang', date: status?.fdExitDate, stepValue: 4, sub: gudang ? `Gudang: ${gudang}` : undefined },
    { label: 'Dalam Pengiriman', date: null, stepValue: 5, noDate: true },
    { label: 'Terkirim', date: null, stepValue: 6, noDate: true },
  ] as const
  const currentStep = status?.statusStep ?? 0

  return (
    <div className="space-y-6">
      {/* Customer Info Card */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <Box className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-semibold text-gray-900">Informasi Umum</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 p-5">
          <div className="sm:col-span-2">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Customer</p>
            <p className="text-sm text-gray-900 font-semibold">{shipment.fdCustName || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Tgl Agent</p>
            <p className="text-sm text-gray-900 font-medium">{formatDate(shipment.fdTglAgent)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Penerima</p>
            <p className="text-sm text-gray-900 font-medium">{shipment.fdTerima || '—'}</p>
          </div>
          <div className="sm:col-span-2 pt-2 border-t border-gray-50">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Marking Code</p>
            <p className="text-sm text-gray-900 font-medium">{shipment.fdMarkingCode || '—'}</p>
          </div>
          <div className="sm:col-span-2 pt-2 border-t border-gray-50">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Komoditi / Deskripsi</p>
            <p className="text-sm text-gray-900">{shipment.fdComodity || '—'}</p>
            {shipment.fdDesc && (
              <p className="text-xs text-gray-500 mt-1 italic">{shipment.fdDesc}</p>
            )}
          </div>
        </div>
      </div>

      {/* Status Kirim Card */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold text-gray-900">Status Pengiriman</span>
          </div>
          <ShipmentStatusBadge status={status} />
        </div>
        <div className="p-5">
          <div className="flex flex-col">
            {steps.map((step, idx) => {
              const isDone = currentStep >= step.stepValue
              const isLast = idx === steps.length - 1
              const StepIcon = isDone ? CheckCircle2 : Circle
              return (
                <div key={step.label} className="flex gap-3">
                  {/* Icon + connector line */}
                  <div className="flex flex-col items-center">
                    <StepIcon className={cn('w-5 h-5 shrink-0', isDone ? 'text-emerald-500' : 'text-gray-300')} />
                    {!isLast && (
                      <div className={cn(
                        'w-0.5 flex-1 my-1 rounded-full',
                        currentStep > step.stepValue ? 'bg-emerald-400' : 'bg-gray-200'
                      )} style={{ minHeight: '20px' }} />
                    )}
                  </div>
                  {/* Label + date */}
                  <div className={cn('flex-1 flex items-center justify-between gap-2', isLast ? 'pb-0' : 'pb-5')}>
                    <div>
                      <p className={cn('text-sm font-medium', isDone ? 'text-gray-900' : 'text-gray-400')}>
                        {step.label}
                      </p>
                      {'sub' in step && step.sub && isDone && (
                        <p className="text-xs text-gray-400 mt-0.5">{step.sub}</p>
                      )}
                    </div>
                    <p className={cn(
                      'text-xs font-medium whitespace-nowrap',
                      isDone ? 'text-gray-600' : 'text-gray-300'
                    )}>
                      {'noDate' in step && step.noDate
                        ? (isDone ? 'Tercapai' : 'Belum')
                        : (step.date ? formatDate(step.date) : 'Belum')}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Fisik Info Card */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <Box className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-gray-900">Rekapitulasi Fisik</span>
        </div>
        <div className="grid grid-cols-3 divide-x divide-gray-100">
          <div className="p-5 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Jml Pack</p>
            <p className="text-lg font-bold text-gray-900 tabular-nums">{Number(shipment.fdJmlPack || 0).toLocaleString('id-ID')}</p>
          </div>
          <div className="p-5 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Total Berat</p>
            <div className="flex items-baseline justify-center gap-1">
              <p className="text-lg font-bold text-gray-900 tabular-nums">{Number(shipment.fdJmlBerat || 0).toLocaleString('id-ID')}</p>
              <span className="text-xs text-gray-500 font-medium">kg</span>
            </div>
          </div>
          <div className="p-5 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Volume</p>
            <div className="flex items-baseline justify-center gap-1">
              <p className="text-lg font-bold text-gray-900 tabular-nums">{Number(shipment.fdM3 || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}</p>
              <span className="text-xs text-gray-500 font-medium">m³</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
