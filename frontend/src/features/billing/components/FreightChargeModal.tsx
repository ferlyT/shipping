import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import {
  X,
  Coins,
  Search,
  RefreshCw,
  Package,
  Weight,
  Box,
  CheckCircle2,
  AlertTriangle,
  Receipt,
} from 'lucide-react'
import { useModalEscape } from '@/hooks/useModalEscape'
import { billingApi } from '../services/billing.service'
import { formatDate, formatNumber, formatCurrency, cn } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import type { FreightChargeResponse, FreightChargeItem } from '../types/billing.types'

interface FreightChargeModalProps {
  isOpen: boolean
  custCode: string | null
  custName?: string | null
  markingCode: string | null
  markingNo?: string | null
  invoiceNo?: string | null
  invoiceDetails?: Array<{
    fdItemName?: string | null
    fdQty?: number | string | null
    fdHarga?: number | string | null
    fdJumlah?: number | string | null
    fdListCode?: string | null
  }>
  onClose: () => void
}

export function FreightChargeModal({
  isOpen,
  custCode,
  custName,
  markingCode,
  markingNo,
  invoiceNo,
  invoiceDetails = [],
  onClose,
}: FreightChargeModalProps) {
  useModalEscape(isOpen, onClose)

  const [search, setSearch] = useState('')
  const [fcFilter, setFcFilter] = useState<'all' | 'has_fc'>('all')
  const [selectedCurr, setSelectedCurr] = useState<string>('ALL')

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['freightCharge', custCode, markingCode],
    queryFn: async () => {
      if (!custCode && !markingCode) return null
      const res = await billingApi.freightCharge(custCode || '', markingCode || '')
      return (res.data as { data?: FreightChargeResponse })?.data || null
    },
    enabled: isOpen && Boolean(custCode || markingCode),
    staleTime: 30_000,
  })

  const rawList: FreightChargeItem[] = data?.items || []

  // Extract invoice items containing "FREIGHT CHARGE"
  const invoiceFcItems = useMemo(() => {
    return invoiceDetails.filter((d) => {
      const name = (d.fdItemName || '').toUpperCase()
      return name.includes('FREIGHT CHARGE') || name.includes('FREIGHT CHARGES')
    })
  }, [invoiceDetails])

  const totalBilledFcQty = useMemo(() => {
    return invoiceFcItems.reduce((sum, item) => sum + Number(item.fdQty || 0), 0)
  }, [invoiceFcItems])

  const totalBilledFcAmount = useMemo(() => {
    return invoiceFcItems.reduce((sum, item) => sum + Number(item.fdJumlah || 0), 0)
  }, [invoiceFcItems])

  // Extract available currencies
  const availableCurrencies = useMemo(() => {
    const set = new Set<string>()
    rawList.forEach((item) => {
      if (item.fdCurrFc && item.fdCurrFc !== '—') {
        set.add(item.fdCurrFc)
      }
    })
    return Array.from(set).sort()
  }, [rawList])

  // Filtered List
  const filteredList = useMemo(() => {
    return rawList.filter((item) => {
      // 1. FC filter
      if (fcFilter === 'has_fc' && (!item.fdFc || item.fdFc <= 0)) {
        return false
      }

      // 2. Currency filter
      if (selectedCurr !== 'ALL' && item.fdCurrFc !== selectedCurr) {
        return false
      }

      // 3. Search query
      if (search.trim()) {
        const q = search.toLowerCase()
        const listCode = (item.fdListCode || '').toLowerCase()
        const tracking = (item.fdTrackingNo || '').toLowerCase()
        const comodity = (item.fdComodity || '').toLowerCase()
        const marking = (item.fdMarkingNo || item.fdMarkingCode || '').toLowerCase()
        const ket = (item.fdKeteranganSJ || '').toLowerCase()
        const fcVal = String(item.fdFc || '')

        return (
          listCode.includes(q) ||
          tracking.includes(q) ||
          comodity.includes(q) ||
          marking.includes(q) ||
          ket.includes(q) ||
          fcVal.includes(q)
        )
      }

      return true
    })
  }, [rawList, fcFilter, selectedCurr, search])

  if (!isOpen || (!custCode && !markingCode) || typeof document === 'undefined') return null

  // Total FC across all items
  const totalFcInEntrylist = data?.currencySummaries?.reduce((sum, s) => sum + s.totalFc, 0) || 0

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-xs p-2 sm:p-4 md:p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xl)] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-[var(--font-display)] font-bold text-base sm:text-lg text-[var(--color-primary)] leading-tight">
                  Pengecekan Freight Charge (tbEntrylist)
                </h2>
                {markingCode && (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-2xs">
                    {markingCode}
                  </span>
                )}
                {custCode && (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono font-bold bg-[var(--color-neutral)] text-[var(--color-primary)] border border-[var(--color-border)] shadow-2xs">
                    {custCode}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--color-secondary)] mt-0.5 flex items-center gap-1.5 flex-wrap">
                {custName && <span className="font-semibold text-[var(--color-primary)]">{custName}</span>}
                {custName && <span>•</span>}
                {markingNo && <span className="text-[var(--color-primary)] font-medium">Marking: {markingNo}</span>}
                {markingNo && <span>•</span>}
                <span>Sumber: <code className="font-mono text-[11px]">tbEntrylist (fdFC, fdCurrFC)</code></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2 rounded-full border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin text-amber-500')} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer"
              title="Tutup (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Comparison with Invoice Banner */}
          <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-neutral)]/40 shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
                  Komparasi Tagihan Invoice (Item "Freight Charges") vs Data tbEntrylist
                </span>
              </div>
              {invoiceFcItems.length > 0 ? (
                <Badge variant="info" className="text-[10px] font-bold rounded-full">
                  {invoiceFcItems.length} Item Freight Charge di Invoice
                </Badge>
              ) : (
                <Badge variant="default" className="text-[10px] font-medium rounded-full">
                  Tidak ada item Freight Charge di Invoice
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Box 1: Billed in Invoice */}
              <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">
                  Ditagihkan di Invoice ({invoiceNo || 'Draft'}):
                </span>
                {invoiceFcItems.length > 0 ? (
                  <div>
                    <div className="text-sm font-bold text-purple-700 dark:text-purple-300">
                      Qty: {formatNumber(totalBilledFcQty)} {invoiceFcItems[0]?.fdListCode || 'VFC'}
                    </div>
                    <div className="text-xs text-[var(--color-secondary)] font-mono">
                      Total: {formatCurrency(totalBilledFcAmount)}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--color-secondary)] italic">0 (Tidak ada tagihan Freight Charge)</p>
                )}
              </div>

              {/* Box 2: Total in tbEntrylist */}
              <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">
                  Total Tercatat di tbEntrylist (fdFC):
                </span>
                {data && data.currencySummaries.length > 0 ? (
                  <div className="space-y-0.5">
                    {data.currencySummaries.map((curr) => (
                      <div key={curr.currency} className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                        <span className="font-mono">{curr.currency}</span>
                        <span>{formatNumber(curr.totalFc)}</span>
                        <span className="text-[10px] text-[var(--color-secondary)] font-normal">
                          ({curr.count} list)
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--color-secondary)] italic">0 (Tidak ada Freight Charge di entrylist)</p>
                )}
              </div>

              {/* Box 3: Verification Status */}
              <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">
                  Status Verifikasi:
                </span>
                {invoiceFcItems.length > 0 && totalFcInEntrylist > 0 ? (
                  Math.abs(totalBilledFcQty - totalFcInEntrylist) < 0.01 ? (
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>MATCH (Qty Invoice = Total fdFC)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>SELISIH (Invoice: {totalBilledFcQty} vs Entry: {totalFcInEntrylist})</span>
                    </div>
                  )
                ) : invoiceFcItems.length > 0 && totalFcInEntrylist === 0 ? (
                  <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Tagihan ada di Invoice tetapi fdFC = 0 di tbEntrylist</span>
                  </div>
                ) : invoiceFcItems.length === 0 && totalFcInEntrylist > 0 ? (
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Ada fdFC di tbEntrylist ({totalFcInEntrylist}) tapi belum ditagihkan</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Bebas Freight Charge</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-1 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-[var(--color-secondary)]">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span>List Ber-FC</span>
              </div>
              <p className="text-base font-bold text-[var(--color-primary)]">
                {data?.listsWithFcCount ?? 0}{' '}
                <span className="text-xs text-[var(--color-secondary)] font-normal">/ {data?.totalLists ?? 0} list</span>
              </p>
            </div>

            <div className="p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-1 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-[var(--color-secondary)]">
                <Package className="w-3.5 h-3.5 text-blue-500" />
                <span>Total Colly</span>
              </div>
              <p className="text-base font-bold text-[var(--color-primary)]">
                {data?.totalColly ?? 0} <span className="text-xs text-[var(--color-secondary)] font-normal">colly</span>
              </p>
            </div>

            <div className="p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-1 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-[var(--color-secondary)]">
                <Weight className="w-3.5 h-3.5 text-purple-500" />
                <span>Total Berat (KG)</span>
              </div>
              <p className="text-base font-bold text-[var(--color-primary)]">
                {formatNumber(data?.totalBerat ?? 0)} <span className="text-xs text-[var(--color-secondary)] font-normal">kg</span>
              </p>
            </div>

            <div className="p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-1 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-[var(--color-secondary)]">
                <Box className="w-3.5 h-3.5 text-emerald-500" />
                <span>Total M3</span>
              </div>
              <p className="text-base font-bold text-[var(--color-primary)]">
                {formatNumber(data?.totalM3 ?? 0)} <span className="text-xs text-[var(--color-secondary)] font-normal">m³</span>
              </p>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] p-3 rounded-2xl shadow-2xs">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-[var(--color-secondary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari no list, resi/tracking, komoditas, dll..."
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-[var(--color-neutral)]/70 border border-[var(--color-border)] rounded-full text-[var(--color-primary)] placeholder:text-[var(--color-secondary)] focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Toggle: All vs Has FC */}
            <div className="flex items-center gap-2 flex-wrap">
              {availableCurrencies.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)]">Mata Uang:</span>
                  <select
                    value={selectedCurr}
                    onChange={(e) => setSelectedCurr(e.target.value)}
                    className="bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-full px-2.5 py-1 text-xs text-[var(--color-primary)] focus:outline-none"
                  >
                    <option value="ALL">Semua ({availableCurrencies.length})</option>
                    {availableCurrencies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="inline-flex rounded-full border border-[var(--color-border)] p-0.5 bg-[var(--color-neutral)]">
                <button
                  type="button"
                  onClick={() => setFcFilter('all')}
                  className={cn(
                    'px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer',
                    fcFilter === 'all'
                      ? 'bg-[var(--color-surface)] text-amber-600 dark:text-amber-400 shadow-2xs'
                      : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                  )}
                >
                  Semua List ({rawList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFcFilter('has_fc')}
                  className={cn(
                    'px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer',
                    fcFilter === 'has_fc'
                      ? 'bg-[var(--color-surface)] text-amber-600 dark:text-amber-400 shadow-2xs'
                      : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                  )}
                >
                  Hanya Ada FC ({data?.listsWithFcCount ?? 0})
                </button>
              </div>
            </div>
          </div>

          {/* Table Details */}
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <LoadingSpinner message="Memuat data Freight Charge dari tbEntrylist..." />
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-[var(--color-border)] rounded-2xl p-6 bg-[var(--color-neutral)]/30">
              <Coins className="w-8 h-8 text-[var(--color-secondary)] mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-[var(--color-primary)]">
                {search || fcFilter !== 'all' || selectedCurr !== 'ALL'
                  ? 'Tidak ada list yang sesuai dengan filter'
                  : 'Tidak ada list ditemukan untuk marking ini'}
              </p>
              <p className="text-xs text-[var(--color-secondary)] mt-1 font-mono">
                tbEntrylist WHERE fdCustCode = '{custCode}' AND fdMarkingCode = '{markingCode}'
              </p>
            </div>
          ) : (
            <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[var(--color-neutral)] border-b border-[var(--color-border)] text-[10px] uppercase font-bold text-[var(--color-secondary)] tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5 w-10 text-center">#</th>
                      <th className="px-3 py-2.5">No List</th>
                      <th className="px-3 py-2.5">No Resi / Tracking</th>
                      <th className="px-3 py-2.5">Tanggal Masuk</th>
                      <th className="px-3 py-2.5 text-right">Colly</th>
                      <th className="px-3 py-2.5 text-right">Berat (KG)</th>
                      <th className="px-3 py-2.5 text-right">Volume (M3)</th>
                      <th className="px-3 py-2.5 text-right font-bold text-amber-700 dark:text-amber-400">
                        Freight Charge (fdFC)
                      </th>
                      <th className="px-3 py-2.5">Komoditi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
                    {filteredList.map((item, idx) => {
                      const hasFc = item.fdFc > 0

                      return (
                        <tr
                          key={item.fdListCode || idx}
                          className={cn(
                            'hover:bg-[var(--color-neutral)]/40 transition-colors',
                            hasFc && 'bg-amber-500/5 dark:bg-amber-500/10'
                          )}
                        >
                          {/* Index */}
                          <td className="px-3 py-2.5 text-center font-mono text-[10px] text-[var(--color-secondary)]">
                            {idx + 1}
                          </td>

                          {/* List Code */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className="font-mono font-bold text-[var(--color-primary)]">
                              {item.fdListCode}
                            </span>
                            {item.fdInvoiceNo && (
                              <div className="text-[10px] text-[var(--color-secondary)] font-mono">
                                Inv: {item.fdInvoiceNo}
                              </div>
                            )}
                          </td>

                          {/* Tracking No */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className="font-mono text-[11px] text-[var(--color-primary)]">
                              {item.fdTrackingNo || '—'}
                            </span>
                          </td>

                          {/* Tanggal */}
                          <td className="px-3 py-2.5 whitespace-nowrap text-[11px] text-[var(--color-secondary)]">
                            {item.fdTgl_IN ? formatDate(item.fdTgl_IN) : item.fdListDate ? formatDate(item.fdListDate) : '—'}
                          </td>

                          {/* Colly */}
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            <span className="font-bold text-[var(--color-primary)]">{item.fdJmlPack}</span>{' '}
                            <span className="text-[10px] text-[var(--color-secondary)]">{item.fdSatuan}</span>
                          </td>

                          {/* Berat */}
                          <td className="px-3 py-2.5 text-right whitespace-nowrap font-mono">
                            {formatNumber(item.fdJmlBerat)}
                          </td>

                          {/* M3 */}
                          <td className="px-3 py-2.5 text-right whitespace-nowrap font-mono">
                            {formatNumber(item.fdM3)}
                          </td>

                          {/* Freight Charge (fdFC & fdCurrFC) */}
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            {hasFc ? (
                              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-2xs">
                                <span>{item.fdCurrFc}</span>
                                <span>{formatNumber(item.fdFc)}</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-[var(--color-secondary)] font-mono">0</span>
                            )}
                          </td>

                          {/* Komoditi */}
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-[var(--color-primary)] line-clamp-1" title={item.fdComodity}>
                              {item.fdComodity || '—'}
                            </div>
                            {item.fdKeteranganSJ && (
                              <div className="text-[10px] text-[var(--color-secondary)] italic truncate max-w-[180px]" title={item.fdKeteranganSJ}>
                                SJ: {item.fdKeteranganSJ}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 sm:px-6 sm:py-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between text-xs text-[var(--color-secondary)]">
          <div className="font-mono text-[11px]">
            Menampilkan <span className="font-bold text-[var(--color-primary)]">{filteredList.length}</span> list dari{' '}
            <span className="font-bold text-[var(--color-primary)]">{rawList.length}</span> total list marking
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[var(--color-neutral)] hover:bg-[var(--color-neutral)]/80 text-[var(--color-primary)] font-semibold rounded-full border border-[var(--color-border)] transition-colors cursor-pointer shadow-2xs"
          >
            Tutup (Esc)
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
