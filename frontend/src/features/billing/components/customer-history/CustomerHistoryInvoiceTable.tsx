import { useState, useRef, useEffect, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight, Copy, Check, ExternalLink } from 'lucide-react'
import { formatDate, formatDecimal, formatNumber, formatCurrency, copyToClipboard, cleanFoxProString } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/lib/constants'
import { resolveBranchCode } from '../../utils/billing.utils'
import type { CustomerBillingHistoryItem } from './types'

export interface CustomerHistoryInvoiceTableProps {
  invoices: CustomerBillingHistoryItem[]
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  onLoadMore?: () => void
  totalCount?: number
}

export function CustomerHistoryInvoiceTable({
  invoices,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  totalCount,
}: CustomerHistoryInvoiceTableProps) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [copiedInvNo, setCopiedInvNo] = useState<string | null>(null)
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

  const toggleRow = (invNo: string) => {
    setExpandedRows((prev) => ({ ...prev, [invNo]: !prev[invNo] }))
  }

  const handleCopy = async (invNo: string) => {
    const ok = await copyToClipboard(invNo)
    if (ok) {
      setCopiedInvNo(invNo)
      setTimeout(() => setCopiedInvNo(null), 2000)
    }
  }

  if (invoices.length === 0) {
    return (
      <div className="p-12 text-center text-xs text-[var(--color-secondary)]">
        Tidak ada data invoice yang sesuai dengan filter.
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto" onScroll={handleScroll}>
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-[var(--color-surface)] sticky top-0 z-10 border-b border-[var(--color-border)]">
          <tr>
            <th className="px-3 py-2 w-10 text-center text-[11px] font-semibold text-[var(--color-secondary)]">
              #
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
            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)] whitespace-nowrap">
              Tipe Komoditi
            </th>
            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
              Deskripsi Barang
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
              Berat (kg)
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
              Volume (m³)
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
              Total Tagihan
            </th>
            <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
              Status
            </th>
            <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {invoices.map((inv, idx) => {
            const isExpanded = Boolean(expandedRows[inv.fdInvNo])
            const branch = resolveBranchCode(inv.fdBranchCode, inv.fdInvNo, inv.fdMarkingCode)
            const hasDetails = inv.details && inv.details.length > 0

            return (
              <Fragment key={inv.fdInvNo}>
                <tr className="hover:bg-[var(--color-neutral)]/20 transition-colors">
                  <td className="px-3 py-2 text-center">
                    {hasDetails ? (
                      <button
                        type="button"
                        onClick={() => toggleRow(inv.fdInvNo)}
                        className="p-0.5 rounded text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    ) : (
                      <span className="text-[var(--color-secondary)] tabular-nums">{idx + 1}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium text-[var(--color-primary)] tabular-nums">
                    <div className="flex items-center gap-1.5">
                      <span>{inv.fdInvNo}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(inv.fdInvNo)}
                        title="Salin No Invoice"
                        className="p-1 rounded text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
                      >
                        {copiedInvNo === inv.fdInvNo ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[var(--color-secondary)] tabular-nums whitespace-nowrap">
                    {inv.fdInvDate ? formatDate(inv.fdInvDate) : '—'}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-secondary)] tabular-nums whitespace-nowrap">
                    {inv.fdTglAgent ? formatDate(inv.fdTglAgent) : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span className="px-1.5 py-0.5 rounded text-[10.5px] font-semibold border border-[var(--color-border)] text-[var(--color-secondary)]">
                      {branch || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-semibold text-[var(--color-primary)]">
                    {inv.fdMarkingCode || '—'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {inv.fdTypeComodityName ? (
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)]">
                        {inv.fdTypeComodityName}
                      </span>
                    ) : (
                      <span className="text-[var(--color-secondary)]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 max-w-xs truncate text-[var(--color-secondary)]" title={cleanFoxProString(inv.fdDescr) || ''}>
                    {cleanFoxProString(inv.fdDescr) || '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {inv.fdBerat ? formatNumber(inv.fdBerat) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium text-[var(--color-primary)]">
                    {inv.fdM3 ? formatDecimal(inv.fdM3, 3) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold text-[var(--color-primary)]">
                    {formatCurrency(inv.totalAmount || inv.fdTotalInv || 0)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <StatusBadge status={inv.paymentStatus} size="sm" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Link
                      to={ROUTES.BILLING_DETAIL(inv.fdInvNo)}
                      className="inline-flex items-center gap-1 text-[11px] text-[var(--color-tertiary)] hover:underline font-semibold"
                    >
                      <span>Detail</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>

                {/* Sub-rows: Line Item Details */}
                {isExpanded && hasDetails && (
                  <tr>
                    <td colSpan={13} className="p-0 bg-[var(--color-neutral)]/25">
                      <div className="p-3 pl-10 space-y-1.5 border-y border-[var(--color-border)]/60">
                        <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                          Rincian Muatan Invoice ({inv.details!.length} item)
                        </span>
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-[10px] uppercase text-[var(--color-secondary)] border-b border-[var(--color-border)]">
                              <th className="py-1">Listcode</th>
                              <th className="py-1">Tipe Komoditi</th>
                              <th className="py-1">Item / Deskripsi</th>
                              <th className="py-1 text-right">Qty</th>
                              <th className="py-1 text-right">Harga</th>
                              <th className="py-1 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--color-border)]/40">
                            {inv.details!.map((d, dIdx) => (
                              <tr key={`${d.fdID || dIdx}`} className="text-[11.5px]">
                                <td className="py-1 text-[var(--color-secondary)] tabular-nums">{d.fdListCode || '—'}</td>
                                <td className="py-1 whitespace-nowrap">
                                  {d.typeComodityName || inv.fdTypeComodityName ? (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-secondary)]">
                                      {d.typeComodityName || inv.fdTypeComodityName}
                                    </span>
                                  ) : (
                                    <span className="text-[var(--color-secondary)]">—</span>
                                  )}
                                </td>
                                <td className="py-1 font-medium text-[var(--color-primary)]">{cleanFoxProString(d.fdItemName)}</td>
                                <td className="py-1 text-right tabular-nums">
                                  {formatNumber(d.fdQty)} {d.fdSatuan || ''}
                                </td>
                                <td className="py-1 text-right tabular-nums text-[var(--color-secondary)]">
                                  {formatCurrency(d.fdItemPrice)}
                                </td>
                                <td className="py-1 text-right tabular-nums font-semibold text-[var(--color-primary)]">
                                  {formatCurrency(d.fdTotal)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>

      {/* Infinite Scroll Sentinel & Status */}
      <div ref={sentinelRef} className="py-3.5 flex flex-col items-center justify-center gap-1.5 border-t border-[var(--color-border)]/40 bg-[var(--color-surface)]">
        {isFetchingNextPage ? (
          <div className="flex items-center gap-2 text-xs text-[var(--color-secondary)]">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--color-tertiary)] border-t-transparent animate-spin" />
            <span>Memuat invoice berikutnya...</span>
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
        ) : invoices.length > 0 ? (
          <div className="text-[11px] text-[var(--color-secondary)] opacity-70">
            ✓ Semua data ({totalCount ?? invoices.length} invoice) telah dimuat
          </div>
        ) : null}
      </div>
    </div>
  )
}
