import { useState } from 'react'
import { Inbox, RotateCcw } from 'lucide-react'
import { BatchRow } from './BatchRow'
import { Button } from '@/components/ui/Button'
import type { GroupedDataRow } from '../types/delivery-orders.types'

interface BatchTableProps {
  rows: GroupedDataRow[]
  startIndex?: number
  expandedRow?: string | null
  onToggleRow?: (listCode: string) => void
  hasSearch?: boolean
  onResetFilter?: () => void
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
    <div className="overflow-x-auto w-full">
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
  )
}

export function BatchTableSkeleton() {
  return (
    <div className="overflow-x-auto w-full">
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
  )
}
