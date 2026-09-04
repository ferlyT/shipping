import { PackageSearch } from 'lucide-react'
import { STATUS_STYLES, STATUS_ORDER } from '../utils/status'
import { ShipmentMobileCard } from './ShipmentMobileCard'
import type { Shipment } from '../types/shipments.types'

// Kelompokkan data per statusStep, mempertahankan urutan STATUS_ORDER
function groupByStatus(rows: Shipment[]) {
  const buckets = new Map<number, Shipment[]>()
  for (const row of rows) {
    const step = row.shipmentStatus?.statusStep ?? 0
    if (!buckets.has(step)) buckets.set(step, [])
    buckets.get(step)!.push(row)
  }
  return STATUS_ORDER
    .filter((step) => buckets.has(step))
    .map((step) => ({ step, label: STATUS_STYLES[step].label, items: buckets.get(step)! }))
}

interface ShipmentCompactViewProps {
  data: Shipment[]
  isLoading: boolean
  selectedCode: string | undefined
  onRowClick: (row: Shipment) => void
}

function CompactSkeleton() {
  return (
    <div className="bg-[var(--color-surface)] divide-y divide-[var(--color-border)]">
      {[0, 1].map((groupIndex) => (
        <div key={groupIndex}>
          {/* Sticky group header skeleton */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-[var(--color-neutral)] border-y border-[var(--color-border)]">
            <div className="h-3.5 w-28 rounded skeleton-shimmer" />
            <div className="h-4 w-16 rounded-full skeleton-shimmer" />
          </div>

          <div className="divide-y divide-[var(--color-border)]">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3.5 flex flex-col gap-2.5 bg-[var(--color-surface)]">
                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="w-20 h-5 rounded-full skeleton-shimmer" />
                    <div className="w-12 h-5 rounded skeleton-shimmer" />
                    <div className="w-16 h-5 rounded skeleton-shimmer" />
                  </div>
                  <div className="w-24 h-5 rounded skeleton-shimmer" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-4 w-2/5 rounded-md skeleton-shimmer" />
                  <div className="h-3 w-1/4 rounded skeleton-shimmer" />
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--color-neutral)] border border-[var(--color-border)] space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="h-3.5 w-24 rounded skeleton-shimmer" />
                    <div className="h-4 w-16 rounded skeleton-shimmer" />
                  </div>
                  <div className="h-3 w-2/3 rounded skeleton-shimmer" />
                  <div className="flex justify-between items-center pt-1 border-t border-[var(--color-border)]/50">
                    <div className="h-3.5 w-32 rounded skeleton-shimmer" />
                    <div className="w-4 h-4 rounded skeleton-shimmer" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ShipmentCompactView({ data, isLoading, selectedCode, onRowClick }: ShipmentCompactViewProps) {
  if (isLoading) return <CompactSkeleton />

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[var(--color-neutral)] text-[var(--color-secondary)] flex items-center justify-center mb-3">
          <PackageSearch size={24} />
        </div>
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">Tidak ada data pengiriman</h3>
        <p className="text-xs text-[var(--color-secondary)] max-w-xs">
          Coba sesuaikan filter atau kata kunci pencarian.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-[var(--color-surface)] divide-y divide-[var(--color-border)]">
      {groupByStatus(data).map((group) => (
        <div key={group.step}>
          {/* Sticky group header */}
          <div className="sticky top-0 z-[1] flex items-center justify-between px-4 sm:px-6 py-2 bg-[var(--color-neutral)] backdrop-blur-xs border-y border-[var(--color-border)]">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[var(--color-secondary)]">
              {group.label}
            </span>
            <span className="text-xs font-semibold text-[var(--color-secondary)] bg-[var(--color-surface)] px-2 py-0.5 rounded-full border border-[var(--color-border)]">
              {group.items.length.toLocaleString('en-US')} resi
            </span>
          </div>

          <div className="divide-y divide-[var(--color-border)]">
            {group.items.map((row) => (
              <ShipmentMobileCard
                key={row.fdListCode}
                item={row}
                isSelected={selectedCode === row.fdListCode}
                onClick={() => onRowClick(row)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
