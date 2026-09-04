import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  Scale,
  Box,
  Package,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  Rows3,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import { billingApi } from '../services/billing.service'
import { formatDecimal, formatDate, formatNumber, calculateOverweight, calculateOverweightRaw } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'

interface CustMarkingTabProps {
  custCode: string | null
  markingCode: string | null
}

type SortField =
  | 'invoice'
  | 'date'
  | 'marking'
  | 'comodity'
  | 'qtySJ'
  | 'qtyGdg'
  | 'qtyK'
  | 'weightSJ'
  | 'weightGdg'
  | 'weightK'
  | 'm3PL'
  | 'm3Gdg'
  | 'm3K'
  | 'm3Bill'

type SortOrder = 'asc' | 'desc'

export function CustMarkingTab({ custCode, markingCode }: CustMarkingTabProps) {
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() =>
    typeof window !== 'undefined' && window.innerWidth >= 768 ? 'table' : 'cards'
  )

  const { data: rows = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['m3CustMarkingDetails', custCode, markingCode],
    queryFn: async () => {
      if (!custCode || !markingCode) return []
      const res = await billingApi.m3CustMarkingDetails(custCode, markingCode)
      const data = res.data?.data || res.data || []
      return Array.isArray(data) ? data : []
    },
    enabled: Boolean(custCode && markingCode),
    staleTime: 60000,
  })

  // Helper to extract value from row given candidate keys
  const getRowValue = (row: any, candidates: string[]) => {
    for (const key of candidates) {
      if (row && row[key] !== undefined && row[key] !== null) {
        return row[key]
      }
    }
    return null
  }

  // Normalized rows
  const normalizedRows = useMemo(() => {
    return rows.map((r: any, idx: number) => {
      const invoice = String(getRowValue(r, ['No. Invoice', 'No_Invoice', 'fdInvNo', 'fdListCode']) || `Item-${idx + 1}`)
      const dateStr = getRowValue(r, ['Tgl. Inv', 'Tgl_Inv', 'fdInvDate', 'fdTgl'])
      const date = dateStr ? new Date(dateStr).getTime() : 0
      const marking = String(getRowValue(r, ['Marking No', 'Marking_No', 'fdMarkingNo', 'fdMarkingCode']) || '')
      const fdComodity = String(getRowValue(r, ['fdComodity', 'Comodity', 'fdCommodity']) || '').trim()
      const fdComodityName = String(getRowValue(r, ['fdComodityName', 'Tipe', 'fdTipe']) || '').trim()
      const fdDescr = String(getRowValue(r, ['fdDescr', 'fdDesc']) || '').trim()
      const comodity = fdComodity || fdComodityName || fdDescr || '—'
      const bc = String(getRowValue(r, ['BC', 'fdBC', 'fdBranchCode', 'branch']) || '')

      const parseNum = (cands: string[]) => {
        const v = getRowValue(r, cands)
        return typeof v === 'number' ? v : parseFloat(String(v || 0)) || 0
      }

      const qtySJ = parseNum(['fdTotalQtySJ', 'Qty SJ', 'Qty_SJ', 'fdQtySJ', 'fdQtyList', 'fdTotalQtyList'])
      const qtyGdg = parseNum(['fdTotalQty', 'Qty Gdg', 'Qty_Gdg', 'fdQtyGdg', 'fdQty', 'fdTotalQtyGudang'])
      const qtyPL = parseNum(['fdQtyPL', 'Qty PL', 'Qty_PL', 'fdTotalQtyPL'])
      const qtyK = parseNum(['fdTotalQtyKomplain', 'Qty K', 'Qty_K', 'fdQtyK', 'fdQtyKomplain', 'fdTotalQtyK'])

      const weightSJ = parseNum(['fdTotalBeratSJ', 'Berat SJ', 'Berat_SJ', 'fdBeratSJ', 'fdBeratList', 'fdTotalBeratList'])
      const weightGdg = parseNum(['fdJmlBerat', 'Berat', 'fdBerat', 'fdJmlBeratGudang', 'fdBeratGudang', 'Berat Gdg', 'Berat_Gdg'])
      const weightK = parseNum(['fdJmlBeratKomplain', 'Berat K', 'Berat_K', 'fdBeratK', 'fdBeratKomplain'])
      const weightGudangActual = weightSJ > 0 ? weightSJ : weightGdg

      const m3PL = parseNum(['fdM3PackingList', 'M3 PL', 'M3_PL', 'fdM3PL'])
      const m3Gdg = parseNum(['fdM3', 'M3', 'm3_gdg'])
      const m3K = parseNum(['fdm3Komplain', 'fdM3Komplain', 'M3 K', 'M3_K', 'fdM3K'])
      const m3Bill = parseNum(['M3 Bill', 'M3_Bill', 'fdM3Bill', 'M3', 'fdM3', 'M3 Dll', 'M3_Dll', 'fdM3Dll'])

      const rasioVal = getRowValue(r, ['fdRasioLr', 'fdRasio', 'Rasio', 'rasio', 'fdRatio', 'Ratio', 'ratio', 'fdRasioHarga', 'RasioHarga'])
      const rasio = typeof rasioVal === 'number' ? rasioVal : parseFloat(String(rasioVal || 0)) || 0

      const owPL = rasio > 0 ? calculateOverweight(weightGdg > 0 ? weightGdg : weightSJ, m3PL, rasio) : 0
      const owGdg = rasio > 0 ? calculateOverweight(weightGudangActual, m3Gdg, rasio) : 0
      const owK = rasio > 0 ? calculateOverweight(weightK > 0 ? weightK : weightGudangActual, m3K > 0 ? m3K : m3Gdg, rasio) : 0

      return {
        raw: r,
        originalIndex: idx + 1,
        invoice,
        dateStr: dateStr ? String(dateStr) : '',
        date,
        marking,
        comodity,
        bc,
        qtySJ,
        qtyGdg,
        qtyPL,
        qtyK,
        weightSJ,
        weightGdg,
        weightK,
        m3PL,
        m3Gdg,
        m3K,
        m3Bill,
        rasio,
        owPL,
        owGdg,
        owK,
      }
    })
  }, [rows])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const filteredItems = useMemo(() => {
    let result = normalizedRows

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (it) =>
          it.invoice?.toLowerCase().includes(q) ||
          it.marking?.toLowerCase().includes(q) ||
          it.comodity?.toLowerCase().includes(q) ||
          it.bc?.toLowerCase().includes(q)
      )
    }

    return [...result].sort((a, b) => {
      let valA: any = 0
      let valB: any = 0

      switch (sortField) {
        case 'invoice':
          valA = a.invoice || ''
          valB = b.invoice || ''
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
        case 'date':
          valA = a.date
          valB = b.date
          break
        case 'marking':
          valA = a.marking || ''
          valB = b.marking || ''
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
        case 'comodity':
          valA = a.comodity || ''
          valB = b.comodity || ''
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
        case 'qtySJ':
          valA = a.qtySJ
          valB = b.qtySJ
          break
        case 'qtyGdg':
          valA = a.qtyGdg
          valB = b.qtyGdg
          break
        case 'qtyK':
          valA = a.qtyK
          valB = b.qtyK
          break
        case 'weightSJ':
          valA = a.weightSJ
          valB = b.weightSJ
          break
        case 'weightGdg':
          valA = a.weightGdg
          valB = b.weightGdg
          break
        case 'weightK':
          valA = a.weightK
          valB = b.weightK
          break
        case 'm3PL':
          valA = a.m3PL
          valB = b.m3PL
          break
        case 'm3Gdg':
          valA = a.m3Gdg
          valB = b.m3Gdg
          break
        case 'm3K':
          valA = a.m3K
          valB = b.m3K
          break
        case 'm3Bill':
          valA = a.m3Bill
          valB = b.m3Bill
          break
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [normalizedRows, search, sortField, sortOrder])

  // Recalculate totals for filtered items
  const dynamicTotals = useMemo(() => {
    return filteredItems.reduce(
      (acc, it) => {
        acc.qtySJ += it.qtySJ || 0
        acc.qtyGdg += it.qtyGdg || 0
        acc.qtyPL += it.qtyPL || 0
        acc.qtyK += it.qtyK || 0
        acc.weightSJ += it.weightSJ || 0
        acc.weightGdg += it.weightGdg || 0
        acc.weightK += it.weightK || 0
        acc.m3PL += it.m3PL || 0
        acc.m3Gdg += it.m3Gdg || 0
        acc.m3K += it.m3K || 0
        acc.m3Bill += it.m3Bill || 0

        const actualWeightPL = it.weightSJ > 0 ? it.weightSJ : it.weightGdg
        acc.owPL += calculateOverweightRaw(actualWeightPL, it.m3PL, it.rasio) || 0
        acc.owGdg += calculateOverweight(it.weightGdg, it.m3Gdg, it.rasio)
        acc.owK += calculateOverweight(it.weightK, it.m3K, it.rasio)

        return acc
      },
      {
        qtySJ: 0,
        qtyGdg: 0,
        qtyPL: 0,
        qtyK: 0,
        weightSJ: 0,
        weightGdg: 0,
        weightK: 0,
        m3PL: 0,
        m3Gdg: 0,
        m3K: 0,
        m3Bill: 0,
        owPL: 0,
        owGdg: 0,
        owK: 0,
      }
    )
  }, [filteredItems])

  if (!custCode && !markingCode) {
    return (
      <div className="py-12 text-center text-sm text-[var(--color-secondary)]">
        Customer Code atau Marking Code tidak tersedia.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Top summary KPIs */}
      {dynamicTotals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-[var(--color-secondary)]">
              <Package className="w-3.5 h-3.5 text-blue-500" />
              <span>Total Colly</span>
            </div>
            <p className="text-sm font-bold text-[var(--color-primary)]">
              SJ: {formatNumber(dynamicTotals.qtySJ)} · Gdg: {formatNumber(dynamicTotals.qtyGdg)}
            </p>
            {dynamicTotals.qtyK > 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                Komp: {formatNumber(dynamicTotals.qtyK)}
              </p>
            )}
          </div>

          <div className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-[var(--color-secondary)]">
              <Scale className="w-3.5 h-3.5 text-purple-500" />
              <span>Total Berat (KG)</span>
            </div>
            <p className="text-sm font-bold text-[var(--color-primary)] font-mono">
              {formatDecimal(dynamicTotals.weightSJ || dynamicTotals.weightGdg, 2)} kg
            </p>
            <p className="text-[11px] text-[var(--color-secondary)] font-mono">
              Gudang: {formatDecimal(dynamicTotals.weightGdg, 2)} kg
            </p>
          </div>

          <div className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-[var(--color-secondary)]">
              <Box className="w-3.5 h-3.5 text-emerald-500" />
              <span>Volume Gudang (M3)</span>
            </div>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {formatDecimal(dynamicTotals.m3Gdg, 4)} m³
            </p>
            <p className="text-[11px] text-[var(--color-secondary)] font-mono">
              PL: {formatDecimal(dynamicTotals.m3PL, 4)} m³
            </p>
          </div>

          <div className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-[var(--color-secondary)]">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span>Overweight Gudang</span>
            </div>
            <p className="text-sm font-bold text-rose-600 dark:text-rose-400 font-mono">
              {formatDecimal(dynamicTotals.owGdg, 2)} kg
            </p>
            <p className="text-[11px] text-[var(--color-secondary)] font-mono">
              PL OW: {formatDecimal(dynamicTotals.owPL, 2)} kg
            </p>
          </div>
        </div>
      )}

      {/* Filter & Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] p-3 rounded-2xl shadow-2xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-[var(--color-secondary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari barcode / invoice, marking, komoditi..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-[var(--color-neutral)]/70 border border-[var(--color-border)] rounded-full text-[var(--color-primary)] placeholder:text-[var(--color-secondary)] focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 rounded-full border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-purple-500' : ''}`} />
          </button>

          <div className="inline-flex rounded-full border border-[var(--color-border)] p-0.5 bg-[var(--color-neutral)]">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[var(--color-surface)] text-purple-600 dark:text-purple-400 shadow-2xs'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              }`}
            >
              <Rows3 className="w-3.5 h-3.5" />
              <span>Tabel</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-[var(--color-surface)] text-purple-600 dark:text-purple-400 shadow-2xs'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Table or Cards */}
      {isLoading ? (
        <div className="space-y-3 animate-fadeIn">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2 shadow-2xs">
              <div className="flex justify-between items-center">
                <div className="h-4 w-36 rounded skeleton-shimmer" />
                <div className="h-4 w-16 rounded-full skeleton-shimmer" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="h-10 rounded-lg skeleton-shimmer" />
                <div className="h-10 rounded-lg skeleton-shimmer" />
                <div className="h-10 rounded-lg skeleton-shimmer" />
                <div className="h-10 rounded-lg skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="py-12 text-center text-rose-500 border border-dashed border-rose-300 rounded-2xl p-6 bg-rose-50/30">
          Gagal memuat rincian marking. Silakan klik refresh.
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-[var(--color-border)] rounded-2xl p-6 bg-[var(--color-neutral)]/30">
          <Package className="w-8 h-8 text-[var(--color-secondary)] mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-[var(--color-primary)]">
            Tidak ada item list ditemukan untuk marking ini.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[var(--color-neutral)] border-b border-[var(--color-border)] text-[9px] uppercase font-bold text-[var(--color-secondary)] tracking-wider">
                <tr>
                  <th className="px-3 py-2.5 w-8 text-center">#</th>
                  <th
                    className="px-3 py-2.5 cursor-pointer hover:text-[var(--color-primary)] select-none"
                    onClick={() => handleSort('invoice')}
                  >
                    <div className="flex items-center gap-1">
                      <span>No List / Invoice</span>
                      {sortField === 'invoice' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th
                    className="px-3 py-2.5 cursor-pointer hover:text-[var(--color-primary)] select-none"
                    onClick={() => handleSort('marking')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Marking No</span>
                      {sortField === 'marking' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th
                    className="px-3 py-2.5 text-right cursor-pointer hover:text-[var(--color-primary)] select-none"
                    onClick={() => handleSort('qtyGdg')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Colly (SJ/Gdg)</span>
                      {sortField === 'qtyGdg' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th
                    className="px-3 py-2.5 text-right cursor-pointer hover:text-[var(--color-primary)] select-none"
                    onClick={() => handleSort('weightGdg')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Berat (KG)</span>
                      {sortField === 'weightGdg' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th
                    className="px-3 py-2.5 text-right cursor-pointer hover:text-[var(--color-primary)] select-none"
                    onClick={() => handleSort('m3Gdg')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>M3 Gudang</span>
                      {sortField === 'm3Gdg' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th className="px-3 py-2.5 text-right">M3 PL</th>
                  <th className="px-3 py-2.5 text-right">OW Gudang</th>
                  <th className="px-3 py-2.5">Komoditi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
                {filteredItems.map((item, idx) => {
                  return (
                    <tr key={item.invoice || idx} className="hover:bg-[var(--color-neutral)]/40 transition-colors">
                      <td className="px-3 py-2.5 text-center font-mono text-[10px] text-[var(--color-secondary)]">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-[var(--color-primary)]">
                          {item.invoice}
                        </span>
                        {item.dateStr && (
                          <div className="text-[10px] text-[var(--color-secondary)]">
                            {formatDate(item.dateStr)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-medium text-[var(--color-primary)]">{item.marking || '—'}</span>
                        {item.bc && (
                          <span className="ml-1.5 text-[10px] text-[var(--color-secondary)] font-bold">
                            [{item.bc}]
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap font-mono">
                        <span className="font-bold text-[var(--color-primary)]">{item.qtySJ || item.qtyGdg}</span>
                        <span className="text-[10px] text-[var(--color-secondary)] ml-1">/ {item.qtyGdg}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap font-mono">
                        {formatDecimal(item.weightSJ || item.weightGdg, 2)}
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatDecimal(item.m3Gdg, 4)}
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap font-mono text-[var(--color-secondary)]">
                        {formatDecimal(item.m3PL, 4)}
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap font-mono">
                        {item.owGdg > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 font-bold">
                            +{formatDecimal(item.owGdg, 2)}
                          </span>
                        ) : (
                          <span className="text-[var(--color-secondary)]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-[var(--color-primary)] line-clamp-1">
                          {item.comodity || '—'}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredItems.map((item, idx) => {
            return (
              <div
                key={item.invoice || idx}
                className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-[var(--color-primary)]">
                    {item.invoice}
                  </span>
                  <Badge variant="default" className="text-[10px]">
                    {item.bc || 'GZ'}
                  </Badge>
                </div>
                <p className="text-xs font-semibold text-[var(--color-primary)] truncate">
                  {item.marking}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[var(--color-border)]/60">
                  <div>
                    <span className="text-[10px] text-[var(--color-secondary)] block">Colly & Berat:</span>
                    <span className="font-bold">{item.qtySJ || item.qtyGdg} colly</span> ·{' '}
                    <span className="font-mono">{formatDecimal(item.weightSJ || item.weightGdg, 2)} kg</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--color-secondary)] block">M3 Gudang:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatDecimal(item.m3Gdg, 4)} m³
                    </span>
                  </div>
                </div>
                {item.owGdg > 0 && (
                  <div className="text-[11px] text-rose-600 dark:text-rose-400 font-bold pt-1">
                    Overweight: +{formatDecimal(item.owGdg, 2)} kg
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
