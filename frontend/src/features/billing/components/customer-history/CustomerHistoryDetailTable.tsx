import { useRef, useEffect } from 'react'
import { formatDate, formatDecimal, formatNumber, formatCurrency, cleanFoxProString } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import type { FlatDetailTraceItem } from './types'

export interface CustomerHistoryDetailTableProps {
  items: FlatDetailTraceItem[]
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  onLoadMore?: () => void
  totalCount?: number
}

export function CustomerHistoryDetailTable({
  items,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  totalCount,
}: CustomerHistoryDetailTableProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasNextPage || isFetchingNextPage || !onLoadMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore()
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, onLoadMore])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!hasNextPage || isFetchingNextPage || !onLoadMore) return
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollHeight - scrollTop - clientHeight < 250) {
      onLoadMore()
    }
  }
  if (items.length === 0) {
    return (
      <div className="p-12 text-center text-xs text-[var(--color-secondary)]">
        Tidak ada data rincian item yang sesuai dengan filter.
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto" onScroll={handleScroll}>
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-[var(--color-surface)] sticky top-0 z-10 border-b border-[var(--color-border)]">
          <tr>
            <th className="px-3 py-2 w-10 text-center text-[11px] font-semibold text-[var(--color-secondary)]">
              No
            </th>
            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
              No. Invoice
            </th>
            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)] whitespace-nowrap">
              Tgl Invoice
            </th>
            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)] whitespace-nowrap">
              Tgl Agent
            </th>
            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
              Cabang
            </th>
            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
              Marking
            </th>
            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
              Listcode
            </th>
            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)] whitespace-nowrap">
              Tipe Komoditi
            </th>
            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
              Nama Item / Deskripsi
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
              Qty
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
              Berat (kg)
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
              Volume (m³)
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
              Harga Satuan
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
              Total Tagihan
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {items.map((item, idx) => (
            <tr key={item.id} className="hover:bg-[var(--color-neutral)]/20 transition-colors">
              <td className="px-3 py-2 text-center text-[var(--color-secondary)] tabular-nums">
                {idx + 1}
              </td>
              <td className="px-3 py-2 font-medium text-[var(--color-primary)] tabular-nums">
                {item.invNo}
              </td>
              <td className="px-3 py-2 text-[var(--color-secondary)] tabular-nums whitespace-nowrap">
                {item.invDate ? formatDate(item.invDate) : '—'}
              </td>
              <td className="px-3 py-2 text-[var(--color-secondary)] tabular-nums whitespace-nowrap">
                {item.tglAgent ? formatDate(item.tglAgent) : '—'}
              </td>
              <td className="px-3 py-2">
                <span className="px-1.5 py-0.5 rounded text-[10.5px] font-semibold border border-[var(--color-border)] text-[var(--color-secondary)]">
                  {item.branchCode || '—'}
                </span>
              </td>
              <td className="px-3 py-2 font-medium text-[var(--color-primary)]">
                {item.markingCode || '—'}
              </td>
              <td className="px-3 py-2 text-[var(--color-secondary)] tabular-nums">
                {item.listCode || '—'}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {item.typeComodityName ? (
                  <span className="px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)]">
                    {item.typeComodityName}
                  </span>
                ) : (
                  <span className="text-[var(--color-secondary)]">—</span>
                )}
              </td>
              <td className="px-3 py-2 max-w-xs truncate text-[var(--color-primary)]" title={cleanFoxProString(item.itemName) || ''}>
                {cleanFoxProString(item.itemName) || '—'}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatNumber(item.qty)} {item.satuan || ''}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {item.berat ? formatNumber(item.berat) : '—'}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-medium text-[var(--color-primary)]">
                {item.m3 ? formatDecimal(item.m3, 3) : '—'}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-[var(--color-secondary)]">
                {formatCurrency(item.itemPrice)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-[var(--color-primary)]">
                {formatCurrency(item.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Infinite Scroll Sentinel & Status */}
      <div ref={sentinelRef} className="py-3.5 flex flex-col items-center justify-center gap-1.5 border-t border-[var(--color-border)]/40 bg-[var(--color-surface)]">
        {isFetchingNextPage ? (
          <div className="flex items-center gap-2 text-xs text-[var(--color-secondary)]">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--color-tertiary)] border-t-transparent animate-spin" />
            <span>Memuat rincian berikutnya...</span>
          </div>
        ) : hasNextPage ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onLoadMore?.()}
            className="text-[11px] text-[var(--color-tertiary)] hover:bg-[var(--color-neutral)]/50 cursor-pointer"
          >
            Muat lebih banyak
          </Button>
        ) : items.length > 0 ? (
          <div className="text-[11px] text-[var(--color-secondary)] opacity-70">
            ✓ Semua data ({items.length} rincian item{totalCount ? ` dari ${totalCount} invoice` : ''}) telah dimuat
          </div>
        ) : null}
      </div>
    </div>
  )
}
