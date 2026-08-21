import { Eye, Receipt, Tag, Barcode, MapPin, PackageSearch } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusBadge } from './StatusBadge'
import type { Shipment } from '../types/shipments.types'

interface ShipmentGridViewProps {
  data: Shipment[]
  isLoading: boolean
  selectedCode: string | undefined
  onRowClick: (row: Shipment) => void
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-xs animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 bg-[var(--color-border)] rounded w-1/3" />
            <div className="h-5 bg-[var(--color-border)] rounded-full w-1/4" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-[var(--color-border)] rounded w-3/4" />
            <div className="h-3 bg-[var(--color-neutral)] rounded w-1/2" />
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--color-border)]">
            <div className="h-8 bg-[var(--color-neutral)] rounded" />
            <div className="h-8 bg-[var(--color-neutral)] rounded" />
            <div className="h-8 bg-[var(--color-neutral)] rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ShipmentGridView({ data, isLoading, selectedCode, onRowClick }: ShipmentGridViewProps) {
  if (isLoading) return <GridSkeleton />

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
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {data.map((row) => {
        const isSelected = selectedCode === row.fdListCode
        const markingFull = [row.fdMarkingCode, row.fdMarkingNo].filter(Boolean).join(' ')

        return (
          <div
            key={row.fdListCode}
            onClick={() => onRowClick(row)}
            className={cn(
              'bg-[var(--color-surface)] border rounded-2xl overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col',
              isSelected
                ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 shadow-sm'
                : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40'
            )}
          >
            {/* Card Header */}
            <div className="px-4 py-3 bg-[var(--color-neutral)] border-b border-[var(--color-border)] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-mono text-xs font-bold text-[var(--color-text)] bg-[var(--color-surface)] px-2 py-0.5 rounded-md border border-[var(--color-border)] shadow-2xs">
                  {row.fdListCode}
                </span>
                {row.fdBranchCode && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-1.5 py-0.5 rounded border border-[var(--color-primary)]/20">
                    <MapPin size={10} />
                    {row.fdBranchCode}
                  </span>
                )}
              </div>
              <div className="shrink-0">
                <StatusBadge status={row.shipmentStatus} />
              </div>
            </div>

            {/* Card Body */}
            <div className="p-4 flex-1 flex flex-col justify-between gap-3">
              {/* Customer & Commodity */}
              <div>
                <h4 className="font-bold text-sm text-[var(--color-text)] leading-snug line-clamp-1" title={row.fdCustName || ''}>
                  {row.fdCustName || 'Customer Tidak Dikenal'}
                </h4>
                <p className="text-xs text-[var(--color-secondary)] mt-1 line-clamp-1">
                  {row.fdComodity || row.fdDesc || '—'}
                </p>
              </div>

              {/* Identifiers (Resi, Marking, Tracking) */}
              <div className="space-y-1.5 pt-2 border-t border-[var(--color-border)] text-xs">
                {row.fdTerima && (
                  <div className="flex items-center justify-between text-[var(--color-secondary)]">
                    <span className="text-[var(--color-secondary)] flex items-center gap-1">
                      <Receipt size={12} className="text-[var(--color-primary)]" /> Resi:
                    </span>
                    <span className="font-mono font-semibold text-[var(--color-text)]">{row.fdTerima}</span>
                  </div>
                )}
                {markingFull && (
                  <div className="flex items-center justify-between text-[var(--color-secondary)]">
                    <span className="text-[var(--color-secondary)] flex items-center gap-1">
                      <Tag size={12} className="text-[var(--color-primary)]" /> Marking:
                    </span>
                    <span className="font-semibold text-[var(--color-text)] uppercase">{markingFull}</span>
                  </div>
                )}
                {row.fdLocalTrackingNo && (
                  <div className="flex items-center justify-between text-[var(--color-secondary)]">
                    <span className="text-[var(--color-secondary)] flex items-center gap-1">
                      <Barcode size={12} /> Tracking:
                    </span>
                    <span className="font-mono text-[var(--color-secondary)]">{row.fdLocalTrackingNo}</span>
                  </div>
                )}
              </div>

              {/* Physical Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-[var(--color-neutral)] rounded-xl border border-[var(--color-border)] text-center">
                <div>
                  <span className="block text-[10px] font-bold text-[var(--color-secondary)] uppercase">Koli</span>
                  <span className="text-xs font-bold text-[var(--color-text)] tabular-nums">
                    {Number(row.fdJmlPack || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="border-x border-[var(--color-border)]">
                  <span className="block text-[10px] font-bold text-[var(--color-secondary)] uppercase">Berat</span>
                  <span className="text-xs font-bold text-[var(--color-text)] tabular-nums">
                    {Number(row.fdJmlBerat || 0).toLocaleString('id-ID')} <span className="text-[10px] font-normal text-[var(--color-secondary)]">kg</span>
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[var(--color-secondary)] uppercase">Volume</span>
                  <span className="text-xs font-bold text-[var(--color-primary)] tabular-nums">
                    {Number(row.fdM3 || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })} <span className="text-[10px] font-normal text-[var(--color-primary)]/60">m³</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Card Footer */}
            <div className="px-4 pb-3.5 pt-1">
              <button
                type="button"
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[var(--color-neutral)] hover:bg-[var(--color-primary)]/10 text-[var(--color-secondary)] hover:text-[var(--color-primary)] text-xs font-semibold transition-colors cursor-pointer"
              >
                <Eye size={13} />
                <span>Lihat Detail Pengiriman</span>
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
