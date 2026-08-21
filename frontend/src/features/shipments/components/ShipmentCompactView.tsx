import { ChevronRight, PackageSearch } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_STYLES, STATUS_ORDER } from '../utils/status'
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
    <div className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="px-4 py-3.5 flex items-center justify-between gap-3 animate-pulse">
          <div className="space-y-1.5 flex-1">
            <div className="h-4 bg-[var(--color-border)] rounded w-2/5" />
            <div className="h-3 bg-[var(--color-neutral)] rounded w-3/5" />
          </div>
          <div className="w-20 h-5 bg-[var(--color-neutral)] rounded-full" />
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
              {group.items.length.toLocaleString('id-ID')} resi
            </span>
          </div>

          {group.items.map((row) => {
            const isSelected = selectedCode === row.fdListCode
            const markingFull = [row.fdMarkingCode, row.fdMarkingNo].filter(Boolean).join(' ')
            const style = STATUS_STYLES[row.shipmentStatus?.statusStep ?? 0] || STATUS_STYLES[0]

            return (
              <div
                key={row.fdListCode}
                onClick={() => onRowClick(row)}
                className={cn(
                  'flex items-center gap-3 px-4 sm:px-6 py-3.5 cursor-pointer transition-colors duration-150',
                  isSelected ? 'bg-[var(--color-primary)]/8 ring-1 ring-inset ring-[var(--color-primary)]/20' : 'hover:bg-[var(--color-neutral)]'
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs font-bold text-[var(--color-text)] bg-[var(--color-neutral)] px-1.5 py-0.5 rounded">
                        {row.fdListCode}
                      </span>
                      <span className="font-semibold text-sm text-[var(--color-text)] truncate">
                        {row.fdCustName || 'Customer Tidak Dikenal'}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0',
                        style.bg,
                        style.text
                      )}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
                      {row.shipmentStatus?.statusLabel || style.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1.5 text-xs text-[var(--color-secondary)] flex-wrap">
                    {markingFull && (
                      <span className="uppercase font-semibold text-[var(--color-text)]">
                        {markingFull}
                      </span>
                    )}
                    {row.fdTerima && <span className="text-[var(--color-border)]">·</span>}
                    {row.fdTerima && <span className="font-mono text-[var(--color-secondary)]">Resi: {row.fdTerima}</span>}
                    {row.fdComodity && <span className="text-[var(--color-border)]">·</span>}
                    {row.fdComodity && <span className="truncate max-w-[200px]">{row.fdComodity}</span>}
                    <span className="text-[var(--color-border)]">·</span>
                    <span className="font-medium text-[var(--color-text)]">
                      {Number(row.fdJmlPack || 0).toLocaleString('id-ID')} {row.fdSatuan?.trim() || 'koli'}
                    </span>
                  </div>
                </div>

                <ChevronRight size={16} className="shrink-0 text-[var(--color-border)] group-hover:text-[var(--color-secondary)]" />
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
