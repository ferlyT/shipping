import { cn } from '@/lib/utils'
import type { ShipmentStatus } from '@/types/shipments'

// Konfigurasi tampilan badge status kirim berdasarkan statusStep dari tbMarking + tbDelivery
export const STATUS_STYLES: Record<number, { label: string; className: string }> = {
  0: { label: 'Menunggu Loading', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  1: { label: 'Sudah Loading', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  2: { label: 'Dalam Perjalanan (ETD)', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  3: { label: 'Tiba (ETA)', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  4: { label: 'Keluar Gudang', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  5: { label: 'Dalam Pengiriman', className: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  6: { label: 'Terkirim', className: 'bg-green-100 text-green-700 border-green-300' },
}

// Urutan tampilan grup: dari yang paling awal proses ke paling akhir
export const STATUS_ORDER = [0, 1, 2, 3, 4, 5, 6]

export function ShipmentStatusBadge({ status }: { status?: ShipmentStatus }) {
  const step = status?.statusStep ?? 0
  const style = STATUS_STYLES[step] || STATUS_STYLES[0]
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap',
      style.className
    )}>
      {status?.statusLabel || style.label}
    </span>
  )
}
