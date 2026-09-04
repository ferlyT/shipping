import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import {
  X,
  ScanBarcode,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { billingApi } from '../services/billing.service'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatDate, formatDecimal, formatNumber } from '@/lib/utils'
import type { BillResiCheckResponse, BillResiItem } from '../types/billing.types'

interface BillResiMarkingModalProps {
  isOpen: boolean
  onClose: () => void
  invNo: string
  custName?: string
  custCode?: string
  markingCode?: string
  markingNo?: string
}

export function BillResiMarkingModal({
  isOpen,
  onClose,
  invNo,
  custName,
  custCode: _custCode,
  markingCode,
  markingNo: _markingNo,
}: BillResiMarkingModalProps) {
  const [searchInput, setSearchInput] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [expandedResi, setExpandedResi] = useState<Record<string, boolean>>({})

  // Fetch data resi & persebaran marking
  const { data, isLoading, isFetching, refetch } = useQuery<BillResiCheckResponse>({
    queryKey: ['billResiMarkingCheck', invNo, activeSearch],
    queryFn: () =>
      billingApi.checkBillResiMarking(invNo, activeSearch || undefined).then((res) => res.data.data),
    enabled: isOpen && Boolean(invNo),
  })

  // Expand all by default saat data pertama kali tiba
  useEffect(() => {
    if (data?.resiList) {
      const exp: Record<string, boolean> = {}
      data.resiList.forEach((r) => {
        exp[r.fdTerima] = true
      })
      setExpandedResi(exp)
    }
  }, [data?.resiList])

  // Reset search saat modal dibuka/tutup
  useEffect(() => {
    if (isOpen) {
      setSearchInput('')
      setActiveSearch('')
    }
  }, [isOpen])

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const toggleExpand = (resi: string) => {
    setExpandedResi((prev) => ({
      ...prev,
      [resi]: !prev[resi],
    }))
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setActiveSearch(searchInput.trim())
  }

  const handleClearSearch = () => {
    setSearchInput('')
    setActiveSearch('')
  }

  const summary = data?.summary
  const resiList = data?.resiList || []

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn font-[var(--font-body)]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl max-h-[92vh] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/70 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
              <ScanBarcode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-[var(--color-primary)] font-[var(--font-label)] uppercase tracking-wide">
                  Pengecekan Resi & Persebaran Marking
                </h3>
                {summary?.isPartial && (
                  <Badge variant="warning" className="text-[10px] px-2 py-0.5 font-bold animate-pulse">
                    ⚠ PARSIAL (Customer Sama)
                  </Badge>
                )}
              </div>
              <p className="text-xs text-[var(--color-secondary)] truncate">
                Invoice: <strong className="font-mono text-[var(--color-primary)]">{invNo}</strong>
                {markingCode && <> · Marking: <span className="font-semibold text-[var(--color-primary)]">{markingCode}</span></>}
                {custName && <> · Pelanggan: <span>{custName}</span></>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isLoading || isFetching}
              className="p-1.5 rounded-lg text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer"
              title="Segarkan Data"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer"
              title="Tutup (ESC)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Toolbar Pencarian Resi Manual */}
        <div className="p-3 sm:p-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)]" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari atau masukkan nomor resi (fdTerima) lain..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-tertiary)] placeholder:text-[var(--color-secondary)] font-mono"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="px-4 py-2 text-xs font-semibold shrink-0 shadow-xs"
            >
              Cari Resi
            </Button>
          </form>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 font-sans text-xs">
          {isLoading ? (
            <div className="py-16">
              <LoadingSpinner message="Menganalisis persebaran nomor resi (fdTerima)..." fullscreen={false} />
            </div>
          ) : (
            <>
              {/* Summary Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-neutral)]/40 space-y-1 shadow-2xs">
                  <span className="text-[10px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider block">
                    Total Resi (fdTerima)
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold font-mono text-[var(--color-primary)]">
                      {summary?.totalResi || 0}
                    </span>
                    <span className="text-[10px] text-[var(--color-secondary)]">nomor</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-neutral)]/40 space-y-1 shadow-2xs">
                  <span className="text-[10px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider block">
                    Status Parsial Cust
                  </span>
                  <div className="flex items-center gap-1.5">
                    {summary?.isPartial ? (
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle size={14} className="shrink-0" />
                        {summary.partialCount} Resi Parsial
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={14} className="shrink-0" />
                        Aman (1 Marking)
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-neutral)]/40 space-y-1 shadow-2xs">
                  <span className="text-[10px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider block">
                    Total Colly
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold font-mono text-[var(--color-primary)]">
                      {formatNumber(summary?.totalColly || 0)}
                    </span>
                    <span className="text-[10px] text-[var(--color-secondary)]">pack</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-neutral)]/40 space-y-1 shadow-2xs">
                  <span className="text-[10px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider block">
                    Total Berat / Volume
                  </span>
                  <div className="text-xs font-mono font-bold text-[var(--color-primary)] space-y-0.5">
                    <div>{formatDecimal(summary?.totalBerat || 0)} <span className="font-normal text-[10px] text-[var(--color-secondary)]">Kg</span></div>
                    <div className="text-[11px] text-[var(--color-secondary)]">{formatDecimal(summary?.totalM3 || 0)} <span className="font-normal text-[10px]">M3</span></div>
                  </div>
                </div>
              </div>

              {/* Daftar Resi List */}
              {resiList.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-neutral)]/20 space-y-2">
                  <ScanBarcode className="w-10 h-10 mx-auto text-[var(--color-secondary)] opacity-50" />
                  <p className="text-sm font-semibold text-[var(--color-primary)]">
                    Tidak Ditemukan Nomor Resi (fdTerima)
                  </p>
                  <p className="text-xs text-[var(--color-secondary)] max-w-md mx-auto">
                    Bill ini belum memiliki nomor resi di data entry list, atau nomor resi yang Anda cari tidak terdaftar di database.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[var(--color-secondary)] px-1">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">
                      Rincian Resi & Persebaran Marking Code ({resiList.length})
                    </span>
                    <span>Klik kartu resi untuk melihat/menutup tabel rincian</span>
                  </div>

                  {resiList.map((item: BillResiItem) => {
                    const isExp = expandedResi[item.fdTerima] ?? true

                    return (
                      <div
                        key={item.fdTerima}
                        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs overflow-hidden transition-all"
                      >
                        {/* Header Item Resi */}
                        <div
                          onClick={() => toggleExpand(item.fdTerima)}
                          className="p-3 sm:p-4 bg-[var(--color-neutral)]/50 hover:bg-[var(--color-neutral)]/80 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                            <span className="text-xs sm:text-sm font-mono font-bold text-[var(--color-primary)] bg-[var(--color-surface)] px-2.5 py-1 rounded-lg border border-[var(--color-border)] shadow-2xs">
                              {item.fdTerima}
                            </span>

                            {item.isPartial ? (
                              <Badge variant="warning" className="text-[10px] px-2 py-0.5 font-bold animate-pulse">
                                ⚠ PARSIAL ({item.markingCodes.length} Marking Code)
                              </Badge>
                            ) : item.isCrossMarking ? (
                              <Badge variant="info" className="text-[10px] px-2 py-0.5 font-bold">
                                Multi-Marking ({item.markingCodes.length} Marking)
                              </Badge>
                            ) : (
                              <Badge variant="success" className="text-[10px] px-2 py-0.5 font-bold">
                                ✓ Eksklusif 1 Marking
                              </Badge>
                            )}

                            <span className="text-xs text-[var(--color-secondary)]">
                              Marking:{' '}
                              <strong className="text-[var(--color-primary)]">
                                {item.markingCodes.join(', ')}
                              </strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right hidden sm:block text-xs font-mono">
                              <span className="font-semibold text-[var(--color-primary)]">
                                {formatNumber(item.totalColly)} pack
                              </span>
                              <span className="text-[var(--color-secondary)] text-[10px] ml-1.5">
                                ({formatDecimal(item.totalBerat)} kg · {formatDecimal(item.totalM3)} m3)
                              </span>
                            </div>
                            <button
                              type="button"
                              className="p-1 rounded text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                            >
                              {isExp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>
                        </div>

                        {/* Rincian Tabel Kemunculan */}
                        {isExp && (
                          <div className="border-t border-[var(--color-border)] overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse font-sans">
                              <thead>
                                <tr className="bg-[var(--color-neutral)]/20 text-[10px] uppercase font-semibold text-[var(--color-secondary)] tracking-wider border-b border-[var(--color-border)]">
                                  <th className="py-2 px-3">Marking Code</th>
                                  <th className="py-2 px-3">Marking No</th>
                                  <th className="py-2 px-3">No. SJ (List)</th>
                                  <th className="py-2 px-3">No. Invoice</th>
                                  <th className="py-2 px-3">Customer</th>
                                  <th className="py-2 px-3 text-right">Colly</th>
                                  <th className="py-2 px-3 text-right">Berat (Kg)</th>
                                  <th className="py-2 px-3 text-right">Volume (M3)</th>
                                  <th className="py-2 px-3">Tgl SJ</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[var(--color-border)]/60">
                                {item.records.map((rec, idx) => (
                                  <tr
                                    key={`${rec.fdListCode}_${idx}`}
                                    className={`transition-colors ${
                                      rec.isCurrentBill
                                        ? 'bg-blue-500/10 dark:bg-blue-900/20 font-semibold'
                                        : 'hover:bg-[var(--color-neutral)]/30'
                                    }`}
                                  >
                                    <td className="py-2 px-3 whitespace-nowrap">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold font-mono text-[var(--color-primary)]">
                                          {rec.fdMarkingCode}
                                        </span>
                                        {rec.isCurrentMarking && (
                                          <Badge variant="info" className="text-[9px] px-1 py-0">
                                            Marking Bill
                                          </Badge>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2 px-3 max-w-[180px] truncate text-[var(--color-secondary)]" title={rec.fdMarkingNo}>
                                      {rec.fdMarkingNo}
                                    </td>
                                    <td className="py-2 px-3 font-mono font-medium text-[var(--color-primary)] whitespace-nowrap">
                                      {rec.fdListCode}
                                    </td>
                                    <td className="py-2 px-3 font-mono whitespace-nowrap">
                                      {rec.fdInvoiceNo && rec.fdInvoiceNo !== '—' ? (
                                        <span className={rec.isCurrentBill ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-[var(--color-primary)]'}>
                                          {rec.fdInvoiceNo}
                                        </span>
                                      ) : (
                                        <span className="text-[var(--color-secondary)]">—</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 max-w-[160px] truncate text-[var(--color-primary)]" title={`${rec.fdCustName} (${rec.fdCustCode})`}>
                                      {rec.fdCustName}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono font-medium text-[var(--color-primary)]">
                                      {formatNumber(rec.fdJmlPack)} {rec.fdSatuan}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono font-medium text-[var(--color-primary)]">
                                      {formatDecimal(rec.fdJmlBerat)}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono font-medium text-[var(--color-primary)]">
                                      {formatDecimal(rec.fdM3)}
                                    </td>
                                    <td className="py-2 px-3 whitespace-nowrap text-[var(--color-secondary)] font-mono text-[11px]">
                                      {rec.fdListDate ? formatDate(rec.fdListDate) : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-[var(--color-border)] bg-[var(--color-neutral)]/50 shrink-0 flex items-center justify-between gap-3">
          <span className="text-[11px] text-[var(--color-secondary)] hidden sm:inline">
            Tekan <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-2xs">ESC</kbd> untuk menutup dialog
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto ml-auto px-5 py-2 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)] text-xs font-semibold shadow-xs transition-all cursor-pointer text-center justify-center flex items-center"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
