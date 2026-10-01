import { useState } from 'react'
import { Inbox, RotateCcw, Eye } from 'lucide-react'
import { BatchRow } from './BatchRow'
import { DeliveryOrderDetails } from './DeliveryOrderDetails'
import { StatusPill } from './StatusPill'
import { Button } from '@/components/ui/Button'
import { cn, displayCustName, formatNumber, formatDecimal } from '@/lib/utils'
import type { GroupedDataRow } from '../types/delivery-orders.types'

interface BatchTableProps {
  rows: GroupedDataRow[]
  startIndex?: number
  expandedRow?: string | null
  onToggleRow?: (listCode: string) => void
  hasSearch?: boolean
  onResetFilter?: () => void
}

function BatchMobileCard({
  row,
  index,
  expanded,
  onToggle,
}: {
  row: GroupedDataRow
  index?: number
  expanded: boolean
  onToggle: () => void
}) {
  const totalWeight = Number(row.totalWeight || 0)
  const totalM3 = Number(row.m3 || 0)
  const satuan = (row.satuan || 'KOLI').trim()
  const sisa = Number(row.sisa || 0)
  const terkirim = Number(row.totalTerkirim || 0)
  const totalQty = Number(row.totalQty || 0)

  return (
    <div className={cn("p-4 transition-colors", expanded && "bg-[var(--color-neutral)]/30")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {index !== undefined && (
            <span className="text-xs text-[var(--color-secondary)] font-mono">#{index + 1}</span>
          )}
          <span className="text-sm font-bold font-mono text-[var(--color-primary)]">
            {row.listCode}
          </span>
          {row.branchCode && (
            <span
              className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-extrabold border border-sky-500/30 text-sky-600 dark:text-sky-400 uppercase tracking-wider"
              title={row.branchName ? `${row.branchCode} — ${row.branchName.trim()}` : row.branchCode}
            >
              {row.branchCode}
            </span>
          )}
        </div>
        <StatusPill isSent={row.isSent} />
      </div>

      <div className="mt-2 space-y-1">
        <div className="text-xs font-semibold text-[var(--color-primary)] truncate">
          {displayCustName(row.customerName, '-')}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[var(--color-secondary)]">
          {row.markingCode && <span className="font-mono">{row.markingCode}</span>}
          {row.resiNo && (
            <>
              <span>•</span>
              <span className="font-mono">{row.resiNo}</span>
            </>
          )}
          {(row.comodity || row.typeComodityName) && (
            <>
              <span>•</span>
              <span className="truncate">{row.comodity || row.typeComodityName}</span>
            </>
          )}
        </div>
      </div>

      {/* Muatan & Progres */}
      <div className="mt-3 flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[var(--color-neutral)]/40 border border-[var(--color-border)] text-xs">
        <div>
          <span className="text-[10px] text-[var(--color-secondary)] block uppercase tracking-wider font-semibold">Total Muatan</span>
          <span className="font-bold text-[var(--color-primary)]">
            {formatNumber(totalQty)} {satuan}
          </span>
          <div className="text-[10px] text-[var(--color-secondary)]">
            {totalWeight > 0 && `${formatNumber(totalWeight)} kg`}
            {totalWeight > 0 && totalM3 > 0 && ' • '}
            {totalM3 > 0 && `${formatDecimal(totalM3, 3)} m³`}
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-[var(--color-secondary)] block uppercase tracking-wider font-semibold">Progres</span>
          <div className="flex items-center gap-1.5 justify-end">
            <span className="text-[11px] text-[var(--color-secondary)]">{formatNumber(terkirim)} kirim</span>
            {sisa > 0 ? (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold text-rose-500 border border-rose-500/40">
                {formatNumber(sisa)} sisa
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold text-emerald-500 border border-emerald-500/40">
                Lengkap
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action button */}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border",
            expanded
              ? "text-[var(--color-tertiary)] border-[var(--color-tertiary)] bg-[var(--color-tertiary)]/10 shadow-xs"
              : "border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)]"
          )}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{expanded ? 'Tutup Rincian SJ' : 'Lihat Rincian SJ'}</span>
        </button>
      </div>

      {/* Expanded DeliveryOrderDetails */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
          <DeliveryOrderDetails listCode={row.listCode} />
        </div>
      )}
    </div>
  )
}

export function BatchTable({
  rows,
  startIndex = 0,
  expandedRow: controlledExpandedRow,
  onToggleRow: controlledOnToggleRow,
  hasSearch = false,
  onResetFilter,
}: BatchTableProps) {
  const [internalExpandedRow, setInternalExpandedRow] = useState<string | null>(null)

  const expandedRow = controlledExpandedRow !== undefined ? controlledExpandedRow : internalExpandedRow
  const handleToggle = (listCode: string) => {
    if (controlledOnToggleRow) {
      controlledOnToggleRow(listCode)
    } else {
      setInternalExpandedRow((prev) => (prev === listCode ? null : listCode))
    }
  }

  if (rows.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-center gap-3 bg-[var(--color-surface)]">
        <div className="p-3.5 rounded-full bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-secondary)]">
          <Inbox className="w-8 h-8 opacity-60" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-[var(--color-primary)]">
            {hasSearch ? 'Tidak ada data yang cocok' : 'Belum ada data kargo pengiriman'}
          </h3>
          <p className="text-xs text-[var(--color-secondary)] max-w-sm">
            {hasSearch
              ? 'Tidak ditemukan kargo atau surat jalan dengan kata kunci pencarian atau filter cabang terpilih.'
              : 'Belum ada kargo tercatat pada status dan kriteria filter ini.'}
          </p>
        </div>
        {hasSearch && onResetFilter && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onResetFilter}
            className="mt-2 text-xs gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Pencarian & Filter</span>
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto w-full">
        <table className="w-full min-w-[900px] border-collapse bg-[var(--color-surface)] text-left text-xs">
          <thead>
            <tr className="bg-[var(--color-neutral)]/80 border-b border-[var(--color-border)] text-left text-[11px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider select-none">
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3">List Code / Marking</th>
              <th className="py-2.5 px-3">Customer / Resi</th>
              <th className="py-2.5 px-3">Komoditas</th>
              <th className="py-2.5 px-3">Total Muatan</th>
              <th className="py-2.5 px-3">Progres Kirim</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
            {rows.map((row, idx) => (
              <BatchRow 
                key={row.listCode} 
                row={row} 
                index={startIndex + idx}
                expanded={expandedRow === row.listCode} 
                onToggle={() => handleToggle(row.listCode)} 
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Touch Cards View */}
      <div className="block md:hidden divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
        {rows.map((row, idx) => (
          <BatchMobileCard
            key={row.listCode}
            row={row}
            index={startIndex + idx}
            expanded={expandedRow === row.listCode}
            onToggle={() => handleToggle(row.listCode)}
          />
        ))}
      </div>
    </>
  )
}

export function BatchTableSkeleton() {
  return (
    <>
      {/* Desktop Table Skeleton */}
      <div className="hidden md:block overflow-x-auto w-full">
        <table className="w-full min-w-[900px] border-collapse bg-[var(--color-surface)]">
          <thead>
            <tr className="bg-[var(--color-neutral)]/80 border-b border-[var(--color-border)] text-left text-[11px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider">
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3">List Code / Marking</th>
              <th className="py-2.5 px-3">Customer / Resi</th>
              <th className="py-2.5 px-3">Komoditas</th>
              <th className="py-2.5 px-3">Total Muatan</th>
              <th className="py-2.5 px-3">Progres Kirim</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                <td className="py-3 px-3 text-center">
                  <div className="h-3.5 w-4 mx-auto rounded skeleton-shimmer" />
                </td>
                <td className="py-3 px-3">
                  <div className="space-y-1.5">
                    <div className="h-4 w-24 rounded-md skeleton-shimmer" />
                    <div className="h-3 w-32 rounded skeleton-shimmer" />
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div className="space-y-1.5">
                    <div className="h-4 w-36 rounded skeleton-shimmer" />
                    <div className="h-3 w-20 rounded skeleton-shimmer" />
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div className="h-3.5 w-24 rounded skeleton-shimmer" />
                </td>
                <td className="py-3 px-3">
                  <div className="space-y-1.5">
                    <div className="h-4 w-16 rounded skeleton-shimmer" />
                    <div className="h-3 w-20 rounded skeleton-shimmer" />
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-16 rounded skeleton-shimmer" />
                    <div className="h-4 w-12 rounded skeleton-shimmer" />
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div className="h-5 w-20 rounded-full skeleton-shimmer" />
                </td>
                <td className="py-3 px-3 text-right">
                  <div className="h-7 w-16 rounded-lg skeleton-shimmer ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards Skeleton */}
      <div className="block md:hidden divide-y divide-[var(--color-border)] p-2 space-y-3 bg-[var(--color-surface)]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-3 space-y-2 rounded-lg bg-[var(--color-surface)]">
            <div className="flex justify-between items-center">
              <div className="h-4 w-28 rounded-md skeleton-shimmer" />
              <div className="h-5 w-16 rounded-full skeleton-shimmer" />
            </div>
            <div className="h-3.5 w-40 rounded skeleton-shimmer" />
            <div className="h-12 w-full rounded-lg skeleton-shimmer" />
          </div>
        ))}
      </div>
    </>
  )
}
