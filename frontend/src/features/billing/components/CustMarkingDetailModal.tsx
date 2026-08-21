import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import {
  X,
  Search,
  Database,
  AlertTriangle,
  Layers,
  Scale,
  Box,
  Package,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { billingApi } from '../services/billing.service'
import { formatDecimal, formatDate, formatNumber, calculateOverweight, calculateOverweightRaw } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useTranslation } from '@/hooks/useTranslation'
import { Badge } from '@/components/ui/Badge'

/**
 * CustMarkingDetailModal Component
 * Refactored with a clean, sortable Short List design for streamlined ERP inspection
 */

interface CustMarkingDetailModalProps {
  isOpen: boolean
  onClose: () => void
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

export function CustMarkingDetailModal({
  isOpen,
  onClose,
  custCode,
  markingCode,
}: CustMarkingDetailModalProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setSearch('')
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const { data: rows = [], isLoading: loading, isError } = useQuery({
    queryKey: ['m3CustMarkingDetails', custCode, markingCode],
    queryFn: async () => {
      if (!custCode || !markingCode) return []
      const res = await billingApi.m3CustMarkingDetails(custCode, markingCode)
      const data = res.data?.data || res.data || []
      return Array.isArray(data) ? data : []
    },
    enabled: isOpen && !!custCode && !!markingCode,
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

  // Normalized rows for short list display & sorting
  const normalizedRows = useMemo(() => {
    return rows.map((r, idx) => {
      const invoice = String(getRowValue(r, ['No. Invoice', 'No_Invoice', 'fdInvNo', 'fdListCode']) || `Item-${idx + 1}`)
      const dateStr = getRowValue(r, ['Tgl. Inv', 'Tgl_Inv', 'fdInvDate', 'fdTgl'])
      const date = dateStr ? new Date(dateStr).getTime() : 0
      const marking = String(getRowValue(r, ['Marking No', 'Marking_No', 'fdMarkingNo', 'fdMarkingCode']) || '')
      const fdComodity = String(getRowValue(r, ['fdComodity', 'Comodity', 'fdCommodity']) || '').trim()
      const fdComodityName = String(getRowValue(r, ['fdComodityName', 'Tipe', 'fdTipe']) || '').trim()
      const fdDescr = String(getRowValue(r, ['fdDescr', 'fdDesc']) || '').trim()
      const comodity = fdComodity || fdComodityName || fdDescr || '—'
      const bc = String(getRowValue(r, ['BC', 'fdBC', 'fdBranchCode', 'branch']) || '')
      const tax = getRowValue(r, ['Tax', 'fdTax', 'fdTaxRebates', 'TaxRebates', 'taxRebates', 'TaxReturn', 'taxReturn', 'tax_return', 'isTax', 'tax', 'fdTaxReturn'])
      const isTax = tax === 1 || tax === '1' || tax === true || String(tax).toUpperCase() === 'TAX' || String(tax).toUpperCase() === 'YES' || Number(tax) === 1

      const parseNum = (cands: string[]) => {
        const v = getRowValue(r, cands)
        return typeof v === 'number' ? v : parseFloat(String(v || 0)) || 0
      }

      // Qty versions: Entry (SJ), Gudang, PL, Komplain
      const qtySJ = parseNum(['fdTotalQtySJ', 'Qty SJ', 'Qty_SJ', 'fdQtySJ', 'fdQtyList', 'fdTotalQtyList'])
      const qtyGdg = parseNum(['fdTotalQty', 'Qty Gdg', 'Qty_Gdg', 'fdQtyGdg', 'fdQty', 'fdTotalQtyGudang'])
      const qtyPL = parseNum(['fdQtyPL', 'Qty PL', 'Qty_PL', 'fdTotalQtyPL'])
      const qtyK = parseNum(['fdTotalQtyKomplain', 'Qty K', 'Qty_K', 'fdQtyK', 'fdQtyKomplain', 'fdTotalQtyK'])

      // Berat versions: Entry (SJ), Gudang, Komplain
      const weightSJ = parseNum(['fdTotalBeratSJ', 'Berat SJ', 'Berat_SJ', 'fdBeratSJ', 'fdBeratList', 'fdTotalBeratList'])
      const weightGdg = parseNum(['fdJmlBerat', 'Berat', 'fdBerat', 'fdJmlBeratGudang', 'fdBeratGudang', 'Berat Gdg', 'Berat_Gdg'])
      const weightK = parseNum(['fdJmlBeratKomplain', 'Berat K', 'Berat_K', 'fdBeratK', 'fdBeratKomplain'])
      const weight = weightGdg || weightSJ

      // M3 versions: PL, Gudang, Komplain, Bill
      const m3PL = parseNum(['fdM3PackingList', 'M3 PL', 'M3_PL', 'fdM3PL'])
      const m3Gdg = parseNum(['fdM3', 'M3', 'm3_gdg'])
      const m3K = parseNum(['fdm3Komplain', 'fdM3Komplain', 'M3 K', 'M3_K', 'fdM3K'])
      const m3Bill = parseNum(['M3 Bill', 'M3_Bill', 'fdM3Bill', 'M3', 'fdM3', 'M3 Dll', 'M3_Dll', 'fdM3Dll'])

      const rasioVal = getRowValue(r, ['fdRasioLr', 'fdRasio', 'Rasio', 'rasio', 'fdRatio', 'Ratio', 'ratio', 'fdRasioHarga', 'RasioHarga'])
      const rasio = typeof rasioVal === 'number' ? rasioVal : parseFloat(String(rasioVal || 0)) || 0

      // Overweight versions:
      // 1. Overweight PL: fdJmlBerat - (m3PL * rasio)
      const rawOwPL = rasio > 0 ? calculateOverweightRaw(weight, m3PL, rasio) : null
      const owPL = rasio > 0 ? calculateOverweight(weight, m3PL, rasio) : 0

      // 2. Overweight Gudang: berat - (m3Gudang * rasio)
      const rawOwGdg = rasio > 0 ? calculateOverweightRaw(weight, m3Gdg, rasio) : null
      const owGdg = rasio > 0 ? calculateOverweight(weight, m3Gdg, rasio) : 0

      // 3. Overweight Komplain: (weightK || weight) - ((m3K || m3Gdg) * rasio)
      const hasKomplain = m3K > 0 || weightK > 0
      const rawOwK = (rasio > 0 && hasKomplain) ? calculateOverweightRaw(weightK > 0 ? weightK : weight, m3K > 0 ? m3K : m3Gdg, rasio) : null
      const owK = (rasio > 0 && hasKomplain) ? calculateOverweight(weightK > 0 ? weightK : weight, m3K > 0 ? m3K : m3Gdg, rasio) : 0
      const ow = hasKomplain ? (owK > 0 ? owK : null) : (owGdg > 0 ? owGdg : null)
      const rawOw = hasKomplain ? rawOwK : rawOwGdg

      return {
        raw: r,
        originalIndex: idx + 1,
        invoice,
        dateStr: dateStr ? String(dateStr) : '',
        date,
        marking,
        fdComodity,
        fdComodityName,
        fdDescr,
        comodity,
        bc,
        isTax,
        qtySJ,
        qtyGdg,
        qtyPL,
        qtyK,
        weightSJ,
        weightGdg,
        weightK,
        weight,
        m3PL,
        m3Gdg,
        m3K,
        m3Bill,
        rasio,
        owPL,
        owGdg,
        owK,
        rawOwPL,
        rawOwGdg,
        rawOwK,
        rawOw,
        overWeight: ow,
      }
    })
  }, [rows])

  // Filtered & Sorted Rows
  const sortedAndFilteredRows = useMemo(() => {
    let result = normalizedRows

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (r) =>
          r.invoice.toLowerCase().includes(q) ||
          r.marking.toLowerCase().includes(q) ||
          r.fdComodity.toLowerCase().includes(q) ||
          r.fdComodityName.toLowerCase().includes(q) ||
          r.comodity.toLowerCase().includes(q) ||
          r.bc.toLowerCase().includes(q) ||
          r.dateStr.toLowerCase().includes(q)
      )
    }

    result = [...result].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'invoice':
          cmp = a.invoice.localeCompare(b.invoice)
          break
        case 'date':
          cmp = a.date - b.date
          break
        case 'marking':
          cmp = a.marking.localeCompare(b.marking)
          break
        case 'comodity':
          cmp = a.comodity.localeCompare(b.comodity)
          break
        case 'qtySJ':
          cmp = a.qtySJ - b.qtySJ
          break
        case 'qtyGdg':
          cmp = a.qtyGdg - b.qtyGdg
          break
        case 'qtyK':
          cmp = a.qtyK - b.qtyK
          break
        case 'weightSJ':
          cmp = a.weightSJ - b.weightSJ
          break
        case 'weightGdg':
          cmp = a.weightGdg - b.weightGdg
          break
        case 'weightK':
          cmp = a.weightK - b.weightK
          break
        case 'm3PL':
          cmp = a.m3PL - b.m3PL
          break
        case 'm3Gdg':
          cmp = a.m3Gdg - b.m3Gdg
          break
        case 'm3K':
          cmp = a.m3K - b.m3K
          break
        case 'm3Bill':
          cmp = a.m3Bill - b.m3Bill
          break
        default:
          cmp = 0
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })

    return result
  }, [normalizedRows, search, sortField, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  // Summary totals calculation
  const summary = useMemo(() => {
    let totalM3PL = 0
    let totalM3Gdg = 0
    let totalM3K = 0
    let totalM3Bill = 0
    let totalQtySJ = 0
    let totalQtyGdg = 0
    let totalQtyPL = 0
    let totalQtyK = 0
    let totalBeratSJ = 0
    let totalBeratGdg = 0
    let totalBeratK = 0
    let totalBerat = 0
    let totalOverWeightPL = 0
    let totalOverWeightGdg = 0
    let totalOverWeightK = 0
    let totalOverWeight = 0
    let hasOverWeightData = false

    const m3ByTypeMap = new Map<
      string,
      {
        totalM3Gdg: number
        totalM3PL: number
        totalM3K: number
        totalM3Bill: number
        totalBerat: number
        totalOverWeight: number
        count: number
      }
    >()

    let totalM3Hybrid = 0
    let countKomplainRows = 0
    let countGudangRows = 0

    normalizedRows.forEach((r) => {
      totalM3PL += r.m3PL
      totalM3Gdg += r.m3Gdg
      totalM3K += r.m3K
      totalM3Bill += r.m3Bill
      totalQtySJ += r.qtySJ
      totalQtyGdg += r.qtyGdg
      totalQtyPL += r.qtyPL
      totalQtyK += r.qtyK
      totalBeratSJ += r.weightSJ
      totalBeratGdg += r.weightGdg
      totalBeratK += r.weightK
      totalBerat += r.weight
      totalOverWeightPL += r.owPL
      totalOverWeightGdg += r.owGdg
      totalOverWeightK += r.owK
      if (r.overWeight !== null && r.overWeight > 0) {
        totalOverWeight += r.overWeight
        hasOverWeightData = true
      }

      // Hybrid calculation: Komplain if exists (> 0), else Gudang
      if (r.m3K > 0) {
        totalM3Hybrid += r.m3K
        countKomplainRows++
      } else {
        totalM3Hybrid += r.m3Gdg
        countGudangRows++
      }

      const typeName = r.fdComodityName || r.fdComodity || 'LAINNYA'
      const current = m3ByTypeMap.get(typeName) || {
        totalM3Gdg: 0,
        totalM3PL: 0,
        totalM3K: 0,
        totalM3Bill: 0,
        totalBerat: 0,
        totalOverWeight: 0,
        count: 0,
      }
      current.totalM3Gdg += r.m3Gdg
      current.totalM3PL += r.m3PL
      current.totalM3K += r.m3K
      current.totalM3Bill += r.m3Bill
      current.totalBerat += r.weight
      if (r.overWeight !== null && r.overWeight > 0) {
        current.totalOverWeight += r.overWeight
      }
      current.count += 1
      m3ByTypeMap.set(typeName, current)
    })

    const m3ByType = Array.from(m3ByTypeMap.entries()).map(([typeName, val]) => ({
      typeName,
      ...val,
    }))

    const isBillMatchingGdg = Math.abs(totalM3Bill - totalM3Gdg) < 0.001
    const isBillMatchingHybrid = Math.abs(totalM3Bill - totalM3Hybrid) < 0.001
    const isPartialKomplain = countKomplainRows > 0 && countKomplainRows < normalizedRows.length
    const m3PlGdgDiff = totalM3PL - totalM3Gdg
    const hasQtyDiff = (totalQtySJ !== totalQtyGdg || totalQtyGdg !== totalQtyPL || totalQtySJ !== totalQtyPL) && (totalQtySJ > 0 || totalQtyGdg > 0 || totalQtyPL > 0)

    // Tax Return (Tax = 1) Calculations
    let totalM3TaxPL = 0
    let totalM3TaxGdg = 0
    let totalM3TaxK = 0
    let totalM3TaxBill = 0
    let totalM3TaxHybrid = 0
    let totalBeratTax = 0
    let countTaxRows = 0

    normalizedRows.forEach((r) => {
      if (r.isTax) {
        totalM3TaxPL += r.m3PL
        totalM3TaxGdg += r.m3Gdg
        totalM3TaxK += r.m3K
        totalM3TaxBill += r.m3Bill
        totalM3TaxHybrid += (r.m3K > 0 ? r.m3K : r.m3Gdg)
        totalBeratTax += r.weight
        countTaxRows += 1
      }
    })

    const isTaxBillMatchingGdg = Math.abs(totalM3TaxBill - totalM3TaxGdg) < 0.001
    const isTaxBillMatchingHybrid = Math.abs(totalM3TaxBill - totalM3TaxHybrid) < 0.001
    const isTaxBillMatching = isTaxBillMatchingGdg || isTaxBillMatchingHybrid || (totalM3TaxBill === 0 && totalM3TaxGdg > 0)

    // Extract first available Rasio for summary
    let rasioNum: number | null = null
    for (const r of rows) {
      const v = getRowValue(r, ['fdRasio', 'fdRasioLr', 'Rasio', 'rasio', 'fdRatio', 'Ratio', 'ratio', 'fdRasioHarga', 'RasioHarga'])
      if (v !== null && v !== undefined && v !== '') {
        const num = typeof v === 'number' ? v : parseFloat(String(v || 0))
        if (!isNaN(num) && num > 0) {
          rasioNum = num
          break
        }
      }
    }

    const rawTotalOverWeightPL = rasioNum !== null && rasioNum > 0 ? calculateOverweightRaw(totalBerat, totalM3PL, rasioNum) : null
    const rawTotalOverWeightGdg = rasioNum !== null && rasioNum > 0 ? calculateOverweightRaw(totalBerat, totalM3Gdg, rasioNum) : null
    const rawTotalOverWeightK = (rasioNum !== null && rasioNum > 0 && countKomplainRows > 0) ? calculateOverweightRaw(totalBeratK > 0 ? totalBeratK : totalBerat, totalM3K, rasioNum) : null
    const rawTotalOverWeightHybrid = (rasioNum !== null && rasioNum > 0) ? calculateOverweightRaw(totalBerat, totalM3Hybrid, rasioNum) : null

    return {
      totalRows: normalizedRows.length,
      totalM3PL,
      totalM3Gdg,
      totalM3K,
      totalM3Bill,
      totalM3Hybrid,
      totalM3TaxPL,
      totalM3TaxGdg,
      totalM3TaxK,
      totalM3TaxBill,
      totalM3TaxHybrid,
      totalBeratTax,
      countTaxRows,
      hasTaxRows: countTaxRows > 0,
      isTaxBillMatching,
      isTaxBillMatchingGdg,
      isTaxBillMatchingHybrid,
      countKomplainRows,
      countGudangRows,
      isPartialKomplain,
      isBillMatchingGdg,
      isBillMatchingHybrid,
      totalQtySJ,
      totalQtyGdg,
      totalQtyPL,
      totalQtyK,
      totalBeratSJ,
      totalBeratGdg,
      totalBeratK,
      totalBerat,
      totalOverWeightPL,
      totalOverWeightGdg,
      totalOverWeightK,
      totalOverWeight,
      rawTotalOverWeightPL,
      rawTotalOverWeightGdg,
      rawTotalOverWeightK,
      rawTotalOverWeightHybrid,
      hasOverWeightData,
      m3ByType,
      m3PlGdgDiff,
      hasQtyDiff,
    }
  }, [normalizedRows, rows])

  // Extract single Rasio value
  const rasioValue = useMemo(() => {
    for (const r of rows) {
      const v = getRowValue(r, ['fdRasio', 'fdRasioLr', 'Rasio', 'rasio', 'fdRatio', 'Ratio', 'ratio', 'fdRasioHarga', 'RasioHarga'])
      if (v !== null && v !== undefined && v !== '') {
        const num = typeof v === 'number' ? v : parseFloat(String(v || 0))
        if (!isNaN(num) && num > 0) return num
      }
    }
    return null
  }, [rows])

  // Helper to render colored real overweight delta (Hijau jika <= 0, Merah jika > 0)
  const renderDeltaOverweight = (val: number | null | undefined, titlePrefix: string = 'Selisih') => {
    if (val === null || val === undefined) return <span className="text-slate-400 font-normal">—</span>
    const isOver = val > 0
    const sign = val > 0 ? '+' : ''
    const colorClass = isOver
      ? 'text-rose-600 dark:text-rose-400 font-bold'
      : 'text-emerald-600 dark:text-emerald-400 font-semibold'

    return (
      <span
        className={`tabular-nums ${colorClass}`}
        title={`${titlePrefix}: ${sign}${formatNumber(val)} kg (${isOver ? 'Overweight / Kelebihan Berat' : 'Aman / Masih dalam Kuota'})`}
      >
        {sign}{formatNumber(val)} kg
      </span>
    )
  }

  // Extract Customer Name
  const custName = useMemo(() => {
    for (const r of rows) {
      const name = getRowValue(r, ['fdCustName', 'CustName', 'CustomerName', 'fdCustomerName'])
      if (name) return String(name).trim()
    }
    return null
  }, [rows])

  // Extract distinct commodity types for header summary
  const typeDisplay = useMemo(() => {
    const set = new Set<string>()
    for (const r of normalizedRows) {
      if (r.fdComodityName && r.fdComodityName !== '—') set.add(r.fdComodityName)
    }
    return Array.from(set).join(', ')
  }, [normalizedRows])

  // Extract distinct commodity names for header summary
  const comodityDisplay = useMemo(() => {
    const set = new Set<string>()
    for (const r of normalizedRows) {
      if (r.fdComodity && r.fdComodity !== '—') set.add(r.fdComodity)
      else if (r.comodity && r.comodity !== '—') set.add(r.comodity)
    }
    return Array.from(set).join(', ')
  }, [normalizedRows])

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 stroke-[2.5]" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 stroke-[2.5]" />
    )
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[var(--color-surface)] w-full max-w-[96vw] xl:max-w-[90vw] rounded-[var(--radius-xl)] shadow-2xl border border-[var(--color-border)] flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-[var(--color-border)] bg-[var(--color-neutral)] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-xs shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-[var(--color-primary)] font-[var(--font-display)]">
                  Detail M3 per Marking
                </h2>
                <Badge variant="info" className="text-[10px] px-1.5 py-0">
                  Sort List
                </Badge>
              </div>
              <div className="mt-0.5 flex items-center gap-2 flex-wrap text-xs text-[var(--color-secondary)]">
                <span>
                  Customer: <strong className="text-[var(--color-primary)] font-semibold">{custName || custCode || '—'}</strong>
                </span>
                <span>•</span>
                <span>
                  Marking: <strong className="text-[var(--color-primary)] font-mono">{markingCode || '—'}</strong>
                </span>
                {typeDisplay && (
                  <>
                    <span>•</span>
                    <span>
                      Tipe: <strong className="text-[var(--color-primary)] font-semibold">{typeDisplay}</strong>
                    </span>
                  </>
                )}
                {comodityDisplay && (
                  <>
                    <span>•</span>
                    <span>
                      Komoditas: <strong className="text-[var(--color-primary)] font-semibold">{comodityDisplay}</strong>
                    </span>
                  </>
                )}
                <span>•</span>
                <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-[var(--color-border)] font-mono text-[10px]">
                  <Layers className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  Total SJ: <strong>{summary.totalRows}</strong>
                </span>
                {summary.hasTaxRows && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 px-1.5 py-0.2 rounded border border-emerald-300 dark:border-emerald-800 font-mono text-[10px]">
                      Tax Return (1): <strong>{formatDecimal(summary.totalM3TaxGdg, 4)} m³</strong> ({summary.countTaxRows} SJ)
                    </span>
                  </>
                )}
                {rasioValue !== null && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.2 rounded border border-purple-200 dark:border-purple-800 font-mono text-[10px]">
                      Rasio: {formatDecimal(rasioValue, 2)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-border)]/50 transition-colors"
              title={t('common.close') || 'Tutup'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Compact KPI Summary Cards (6 Columns) */}
        <div className="p-2.5 sm:p-3 bg-[var(--color-neutral)]/40 border-b border-[var(--color-border)] shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">

            {/* Total Berat */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md p-2 shadow-xs flex flex-col justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-secondary)] flex items-center gap-1">
                  <Scale className="w-3 h-3 text-slate-600" />
                  TOTAL BERAT
                </p>
                <p className="mt-0.5 text-sm font-bold text-[var(--color-primary)] font-mono">
                  {formatDecimal(summary.totalBerat, 2)} kg
                </p>
              </div>
              <div className="mt-1.5 pt-1.5 border-t border-[var(--color-border)]/60 space-y-0.5">
                <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                  <span className="text-[9px] font-sans font-medium text-[var(--color-secondary)]">
                    Gudang (SJ)
                  </span>
                  <span className="font-semibold tabular-nums ml-1">
                    {summary.totalBeratSJ > 0 ? `${formatDecimal(summary.totalBeratSJ, 2)} kg` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[var(--color-primary)] font-mono">
                  <span className="text-[9px] font-sans font-medium text-[var(--color-secondary)]">
                    Entrylist
                  </span>
                  <span className="font-semibold tabular-nums ml-1">
                    {summary.totalBeratGdg > 0 ? `${formatDecimal(summary.totalBeratGdg, 2)} kg` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-amber-700 dark:text-amber-400 font-mono">
                  <span className="text-[9px] font-sans font-medium text-amber-800 dark:text-amber-300">
                    Komplain
                  </span>
                  <span className="font-semibold tabular-nums ml-1">
                    {summary.totalBeratK > 0 ? `${formatDecimal(summary.totalBeratK, 2)} kg` : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Overweight */}
            <div className={`border rounded-md p-2 shadow-xs flex flex-col justify-between transition-colors ${
              (summary.rawTotalOverWeightHybrid ?? 0) > 0
                ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900/60'
                : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-900/50'
            }`}>
              <div>
                <p className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                  (summary.rawTotalOverWeightHybrid ?? 0) > 0
                    ? 'text-rose-800 dark:text-rose-300'
                    : 'text-emerald-800 dark:text-emerald-300'
                }`}>
                  <AlertTriangle className={`w-3 h-3 ${
                    (summary.rawTotalOverWeightHybrid ?? 0) > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`} />
                  OVERWEIGHT
                </p>
                {(summary.rawTotalOverWeightHybrid ?? 0) > 0 ? (
                  <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-bold text-rose-950 dark:text-rose-100 font-mono">
                      +{formatNumber(summary.rawTotalOverWeightHybrid!)} kg
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 px-1 py-0.2 rounded border border-rose-300 dark:border-rose-700 font-sans">
                      Overweight
                    </span>
                  </div>
                ) : (
                  <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-bold text-emerald-950 dark:text-emerald-100 font-mono">
                      {summary.rawTotalOverWeightHybrid !== null ? formatNumber(summary.rawTotalOverWeightHybrid) : '0'} kg
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 px-1 py-0.2 rounded border border-emerald-300 dark:border-emerald-700 font-sans">
                      No Overweight
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-1.5 pt-1.5 border-t border-[var(--color-border)]/60 space-y-0.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-[9px] font-sans font-medium text-[var(--color-secondary)]">
                    PL (Entry)
                  </span>
                  {renderDeltaOverweight(summary.rawTotalOverWeightPL, 'PL (Entry)')}
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-[9px] font-sans font-medium text-[var(--color-secondary)]">
                    Gudang
                  </span>
                  {renderDeltaOverweight(summary.rawTotalOverWeightGdg, 'Gudang')}
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-[9px] font-sans font-medium text-amber-800 dark:text-amber-300">
                    Komplain
                  </span>
                  {summary.countKomplainRows > 0
                    ? renderDeltaOverweight(summary.rawTotalOverWeightK, 'Komplain')
                    : <span className="text-slate-400 font-normal">—</span>}
                </div>
              </div>
            </div>

            {/* M3 PL */}
            <div className="bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-md p-2 shadow-xs flex flex-col justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-1">
                  <Package className="w-3 h-3 text-rose-600" />
                  M3 PL
                </p>
                <p className="mt-0.5 text-sm font-bold text-rose-900 dark:text-rose-100 font-mono">
                  {formatDecimal(summary.totalM3PL, 4)} m³
                </p>
              </div>
              <div className="mt-1.5 pt-1.5 border-t border-rose-200/60 dark:border-rose-900/40 space-y-0.5">
                {summary.hasTaxRows && (
                  <div className="flex items-center justify-between text-[10px] font-mono bg-rose-100/70 dark:bg-rose-900/40 px-1 py-0.5 rounded text-rose-950 dark:text-rose-100 mb-1">
                    <span className="text-[9px] font-sans font-bold text-rose-900 dark:text-rose-200">
                      Tax Return (1)
                    </span>
                    <span className="font-bold tabular-nums ml-1">
                      {formatDecimal(summary.totalM3TaxPL, 4)}
                    </span>
                  </div>
                )}
                {summary.m3ByType.map((t) => (
                  <div key={t.typeName} className="flex items-center justify-between text-[10px] text-rose-950/80 dark:text-rose-200/80 font-mono">
                    <span className="truncate max-w-[85px] text-[9px] font-sans font-medium text-rose-800/90 dark:text-rose-300" title={t.typeName}>
                      {t.typeName}
                    </span>
                    <span className="font-semibold tabular-nums ml-1">
                      {formatDecimal(t.totalM3PL, 4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* M3 Gudang */}
            <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-md p-2 shadow-xs flex flex-col justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1">
                  <Box className="w-3 h-3 text-blue-600" />
                  M3 GUDANG
                </p>
                <p className="mt-0.5 text-sm font-bold text-blue-900 dark:text-blue-100 font-mono">
                  {formatDecimal(summary.totalM3Gdg, 4)} m³
                </p>
              </div>
              <div className="mt-1.5 pt-1.5 border-t border-blue-200/60 dark:border-blue-900/40 space-y-0.5">
                {summary.hasTaxRows && (
                  <div className="flex items-center justify-between text-[10px] font-mono bg-blue-100/70 dark:bg-blue-900/40 px-1 py-0.5 rounded text-blue-950 dark:text-blue-100 mb-1">
                    <span className="text-[9px] font-sans font-bold text-blue-900 dark:text-blue-200">
                      Tax Return (1)
                    </span>
                    <span className="font-bold tabular-nums ml-1">
                      {formatDecimal(summary.totalM3TaxGdg, 4)}
                    </span>
                  </div>
                )}
                {summary.m3ByType.map((t) => (
                  <div key={t.typeName} className="flex items-center justify-between text-[10px] text-blue-950/80 dark:text-blue-200/80 font-mono">
                    <span className="truncate max-w-[85px] text-[9px] font-sans font-medium text-blue-800/90 dark:text-blue-300" title={t.typeName}>
                      {t.typeName}
                    </span>
                    <span className="font-semibold tabular-nums ml-1">
                      {formatDecimal(t.totalM3Gdg, 4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* M3 Komplain */}
            <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-md p-2 shadow-xs flex flex-col justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-amber-600" />
                  M3 KOMPLAIN
                </p>
                <p className="mt-0.5 text-sm font-bold text-amber-900 dark:text-amber-100 font-mono">
                  {formatDecimal(summary.totalM3K, 4)} m³
                </p>
              </div>
              <div className="mt-1.5 pt-1.5 border-t border-amber-200/60 dark:border-amber-900/40 space-y-0.5">
                {summary.hasTaxRows && (
                  <div className="flex items-center justify-between text-[10px] font-mono bg-amber-100/70 dark:bg-amber-900/40 px-1 py-0.5 rounded text-amber-950 dark:text-amber-100 mb-1">
                    <span className="text-[9px] font-sans font-bold text-amber-900 dark:text-amber-200">
                      Tax Return (1)
                    </span>
                    <span className="font-bold tabular-nums ml-1">
                      {formatDecimal(summary.totalM3TaxK, 4)}
                    </span>
                  </div>
                )}
                {summary.m3ByType.map((t) => (
                  <div key={t.typeName} className="flex items-center justify-between text-[10px] text-amber-950/80 dark:text-amber-200/80 font-mono">
                    <span className="truncate max-w-[85px] text-[9px] font-sans font-medium text-amber-800/90 dark:text-amber-300" title={t.typeName}>
                      {t.typeName}
                    </span>
                    <span className="font-semibold tabular-nums ml-1">
                      {formatDecimal(t.totalM3K, 4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* M3 Bill */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-md p-2 shadow-xs flex flex-col justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:emerald-300 flex items-center gap-1">
                  <Database className="w-3 h-3 text-emerald-600" />
                  M3 BILL
                </p>
                <p className="mt-0.5 text-sm font-bold text-emerald-900 dark:text-emerald-100 font-mono">
                  {formatDecimal(summary.totalM3Bill, 4)} m³
                </p>
              </div>
              <div className="mt-1.5 pt-1.5 border-t border-emerald-200/60 dark:border-emerald-900/40 space-y-0.5">
                {summary.hasTaxRows && (
                  <div className="flex items-center justify-between text-[10px] font-mono bg-emerald-100/70 dark:bg-emerald-900/40 px-1 py-0.5 rounded text-emerald-950 dark:text-emerald-100 mb-1">
                    <span className="text-[9px] font-sans font-bold text-emerald-900 dark:text-emerald-200">
                      Tax Return (1)
                    </span>
                    <span className="font-bold tabular-nums ml-1">
                      {formatDecimal(summary.totalM3TaxBill, 4)}
                    </span>
                  </div>
                )}
                {summary.m3ByType.map((t) => (
                  <div key={t.typeName} className="flex items-center justify-between text-[10px] text-emerald-950/80 dark:text-emerald-200/80 font-mono">
                    <span className="truncate max-w-[85px] text-[9px] font-sans font-medium text-emerald-800/90 dark:text-emerald-300" title={t.typeName}>
                      {t.typeName}
                    </span>
                    <span className="font-semibold tabular-nums ml-1">
                      {formatDecimal(t.totalM3Bill, 4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar: Search, Sort Active Indicator & Item Count */}
        <div className="p-2.5 sm:p-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--color-secondary)]">
            <span>
              Menampilkan <strong className="text-[var(--color-primary)] font-mono">{sortedAndFilteredRows.length}</strong> dari {rows.length} baris
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-[11px]">
              Sortir: <strong className="text-[var(--color-primary)] font-semibold uppercase">{sortField}</strong> ({sortOrder === 'asc' ? 'A-Z / Min-Max' : 'Z-A / Max-Min'})
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative min-w-[220px] sm:min-w-[260px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-secondary)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari invoice, marking, comodity..."
                className="w-full pl-8 pr-7 py-1 text-xs rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Short List Table Body */}
        <div className="p-2.5 sm:p-3 overflow-auto flex-1 min-h-[260px] bg-slate-50/50 dark:bg-slate-900/20">
          {loading ? (
            <div className="py-20 flex items-center justify-center">
              <LoadingSpinner message="Memuat detail data M3..." />
            </div>
          ) : isError ? (
            <div className="p-6 text-center text-xs text-red-600 bg-red-50 rounded-xl border border-red-200">
              {t('billing.validation.error') || 'Gagal memuat detail M3 per Marking'}
            </div>
          ) : sortedAndFilteredRows.length === 0 ? (
            <EmptyState
              icon={<Database className="w-7 h-7" />}
              title="Data M3 Tidak Ditemukan"
              description={`Tidak ada data yang cocok dengan pencarian pada CustCode: ${custCode} & Marking: ${markingCode}`}
            />
          ) : (
            <div className="overflow-x-auto border border-[var(--color-border)] rounded-lg shadow-xs bg-[var(--color-surface)]">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  {/* Tier 1 Header Groups */}
                  <tr className="bg-slate-100 dark:bg-slate-800/90 border-b border-[var(--color-border)] uppercase tracking-wider text-[10px] text-slate-700 dark:text-slate-200 font-bold sticky top-0 z-10 select-none">
                    <th rowSpan={2} className="p-2 border-r border-[var(--color-border)] w-10 text-center bg-slate-100 dark:bg-slate-800">#</th>

                    {/* No. Invoice */}
                    <th
                      rowSpan={2}
                      onClick={() => handleSort('invoice')}
                      className="p-2 border-r border-[var(--color-border)] cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-700/60 transition-colors group whitespace-nowrap align-middle"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span>No. Invoice</span>
                        {renderSortIcon('invoice')}
                      </div>
                    </th>

                    {/* Tgl Inv */}
                    <th
                      rowSpan={2}
                      onClick={() => handleSort('date')}
                      className="p-2 border-r border-[var(--color-border)] cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-700/60 transition-colors group text-center whitespace-nowrap align-middle"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Tgl Inv</span>
                        {renderSortIcon('date')}
                      </div>
                    </th>

                    {/* Marking No */}
                    <th
                      rowSpan={2}
                      onClick={() => handleSort('marking')}
                      className="p-2 border-r border-[var(--color-border)] cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-700/60 transition-colors group whitespace-nowrap align-middle"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span>Marking No</span>
                        {renderSortIcon('marking')}
                      </div>
                    </th>

                    {/* Komoditas */}
                    <th
                      rowSpan={2}
                      onClick={() => handleSort('comodity')}
                      className="p-2 border-r border-[var(--color-border)] cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-700/60 transition-colors group whitespace-nowrap align-middle"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span>Komoditas / Tipe</span>
                        {renderSortIcon('comodity')}
                      </div>
                    </th>

                    {/* QTY Group */}
                    <th colSpan={3} className="p-1.5 border-r border-[var(--color-border)] text-center bg-slate-200/80 dark:bg-slate-700/80 text-slate-800 dark:text-slate-100 font-bold border-b border-[var(--color-border)]">
                      QTY
                    </th>

                    {/* BERAT Group */}
                    <th colSpan={3} className="p-1.5 border-r border-[var(--color-border)] text-center bg-slate-200/80 dark:bg-slate-700/80 text-slate-800 dark:text-slate-100 font-bold border-b border-[var(--color-border)]">
                      BERAT (KG)
                    </th>

                    {/* VOLUME M3 Group */}
                    <th colSpan={4} className="p-1.5 text-center bg-slate-200/80 dark:bg-slate-700/80 text-slate-800 dark:text-slate-100 font-bold border-b border-[var(--color-border)]">
                      VOLUME M³
                    </th>
                  </tr>

                  {/* Tier 2 Sub-Headers */}
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-[var(--color-border)] uppercase tracking-wider text-[9px] text-slate-600 dark:text-slate-300 font-semibold sticky top-[33px] z-10 select-none">
                    {/* QTY Sub-headers: Gudang (SJ), Entrylist, Komplain */}
                    <th
                      onClick={() => handleSort('qtySJ')}
                      className="p-1.5 border-r border-[var(--color-border)] cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-700/60 transition-colors group text-right whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Gudang (SJ)</span>
                        {renderSortIcon('qtySJ')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('qtyGdg')}
                      className="p-1.5 border-r border-[var(--color-border)] cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-700/60 transition-colors group text-right font-bold text-[var(--color-primary)] whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Entrylist</span>
                        {renderSortIcon('qtyGdg')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('qtyK')}
                      className="p-1.5 border-r border-[var(--color-border)] cursor-pointer hover:bg-amber-200/70 dark:hover:bg-amber-900/60 transition-colors group text-right text-amber-700 dark:text-amber-300 whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Komplain</span>
                        {renderSortIcon('qtyK')}
                      </div>
                    </th>

                    {/* BERAT Sub-headers: Gudang (SJ), Entrylist, Komplain */}
                    <th
                      onClick={() => handleSort('weightSJ')}
                      className="p-1.5 border-r border-[var(--color-border)] cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-700/60 transition-colors group text-right whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Gudang (SJ)</span>
                        {renderSortIcon('weightSJ')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('weightGdg')}
                      className="p-1.5 border-r border-[var(--color-border)] cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-700/60 transition-colors group text-right font-bold text-[var(--color-primary)] whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Entrylist</span>
                        {renderSortIcon('weightGdg')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('weightK')}
                      className="p-1.5 border-r border-[var(--color-border)] cursor-pointer hover:bg-amber-200/70 dark:hover:bg-amber-900/60 transition-colors group text-right text-amber-700 dark:text-amber-300 whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Komplain</span>
                        {renderSortIcon('weightK')}
                      </div>
                    </th>

                    {/* M3 Sub-headers: PL (Entry), Gudang, Komplain, Bill */}
                    <th
                      onClick={() => handleSort('m3PL')}
                      className="p-1.5 border-r border-[var(--color-border)] cursor-pointer hover:bg-rose-200/70 dark:hover:bg-rose-900/60 transition-colors group text-right bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>PL</span>
                        {renderSortIcon('m3PL')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('m3Gdg')}
                      className="p-1.5 border-r border-[var(--color-border)] cursor-pointer hover:bg-blue-200/70 dark:hover:bg-blue-900/60 transition-colors group text-right bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Gudang</span>
                        {renderSortIcon('m3Gdg')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('m3K')}
                      className="p-1.5 border-r border-[var(--color-border)] cursor-pointer hover:bg-amber-200/70 dark:hover:bg-amber-900/60 transition-colors group text-right bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>K</span>
                        {renderSortIcon('m3K')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('m3Bill')}
                      className="p-1.5 cursor-pointer hover:bg-emerald-200/70 dark:hover:bg-emerald-900/60 transition-colors group text-right bg-emerald-50/70 dark:emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Bill</span>
                        {renderSortIcon('m3Bill')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] font-mono text-[11px]">
                  {sortedAndFilteredRows.map((r, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="p-2 text-center border-r border-[var(--color-border)] text-slate-400 font-sans text-[10px]">
                        {idx + 1}
                      </td>

                      {/* Invoice & BC */}
                      <td className="p-2 border-r border-[var(--color-border)] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[var(--color-primary)]">{r.invoice}</span>
                          {r.bc && (
                            <span className="text-[9px] font-sans font-bold px-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                              {r.bc}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tgl Inv */}
                      <td className="p-2 border-r border-[var(--color-border)] text-center font-sans text-[10px] text-[var(--color-secondary)] whitespace-nowrap">
                        {r.dateStr ? formatDate(r.dateStr) : '—'}
                      </td>

                      {/* Marking No */}
                      <td className="p-2 border-r border-[var(--color-border)] whitespace-nowrap text-[var(--color-primary)]">
                        {r.marking || '—'}
                      </td>

                      {/* Komoditas / Tipe */}
                      <td className="p-2 border-r border-[var(--color-border)] font-sans whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-[var(--color-primary)]">
                            {r.fdComodity || r.comodity}
                          </span>
                          {r.fdComodityName && r.fdComodity && r.fdComodityName !== r.fdComodity && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-[var(--color-border)]">
                              {r.fdComodityName}
                            </span>
                          )}
                          {r.isTax && (
                            <span className="text-[8px] font-bold px-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                              TAX
                            </span>
                          )}
                        </div>
                      </td>

                      {/* QTY: Gudang (SJ) */}
                      <td className="p-2 border-r border-[var(--color-border)] text-right whitespace-nowrap tabular-nums text-slate-500">
                        {r.qtySJ > 0 ? formatNumber(r.qtySJ) : '—'}
                      </td>

                      {/* QTY: Entrylist */}
                      <td className="p-2 border-r border-[var(--color-border)] text-right whitespace-nowrap tabular-nums font-semibold text-[var(--color-primary)]">
                        {r.qtyGdg > 0 ? formatNumber(r.qtyGdg) : '—'}
                      </td>

                      {/* QTY: Komplain */}
                      <td className="p-2 border-r border-[var(--color-border)] text-right whitespace-nowrap tabular-nums">
                        {r.qtyK > 0 ? (
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {formatNumber(r.qtyK)}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 font-normal">—</span>
                        )}
                      </td>

                      {/* BERAT: Gudang (SJ) */}
                      <td className="p-2 border-r border-[var(--color-border)] text-right whitespace-nowrap tabular-nums text-slate-500">
                        {r.weightSJ > 0 ? formatDecimal(r.weightSJ, 2) : '—'}
                      </td>

                      {/* BERAT: Entrylist */}
                      <td className="p-2 border-r border-[var(--color-border)] text-right whitespace-nowrap tabular-nums font-semibold text-[var(--color-primary)]">
                        {r.weightGdg > 0 ? formatDecimal(r.weightGdg, 2) : '—'}
                      </td>

                      {/* BERAT: Komplain */}
                      <td className="p-2 border-r border-[var(--color-border)] text-right whitespace-nowrap tabular-nums">
                        {r.weightK > 0 ? (
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {formatDecimal(r.weightK, 2)}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 font-normal">—</span>
                        )}
                      </td>

                      {/* M3 PL */}
                      <td className="p-2 border-r border-[var(--color-border)] text-right bg-rose-50/40 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 whitespace-nowrap tabular-nums">
                        {r.m3PL > 0 ? formatDecimal(r.m3PL, 4) : '—'}
                      </td>

                      {/* M3 Gudang */}
                      <td className="p-2 border-r border-[var(--color-border)] text-right bg-blue-50/40 dark:bg-blue-950/20 font-bold text-blue-950 dark:text-blue-200 whitespace-nowrap tabular-nums">
                        {r.m3Gdg > 0 ? formatDecimal(r.m3Gdg, 4) : '—'}
                      </td>

                      {/* M3 Komplain */}
                      <td className="p-2 border-r border-[var(--color-border)] text-right bg-amber-50/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 whitespace-nowrap tabular-nums">
                        {r.m3K > 0 ? formatDecimal(r.m3K, 4) : <span className="text-slate-300 dark:text-slate-600 font-normal">—</span>}
                      </td>

                      {/* M3 Bill */}
                      <td className="p-2 text-right bg-emerald-50/40 dark:bg-emerald-950/20 font-bold text-emerald-950 dark:text-emerald-200 whitespace-nowrap tabular-nums">
                        {r.m3Bill > 0 ? formatDecimal(r.m3Bill, 4) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Summary / Breakdown per Komoditas */}
        {normalizedRows.length > 0 && (
          <div className="px-4 py-2.5 bg-slate-50/90 dark:bg-slate-900/80 border-t border-[var(--color-border)] shrink-0 flex flex-col gap-2">
            {/* Quick Summary Chips */}
            <div className="flex items-center flex-wrap justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                {summary.isBillMatchingGdg ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 font-mono">
                    <span>✓</span> M3 Bill = SUM M3 Gudang ({formatDecimal(summary.totalM3Gdg, 4)} m³)
                  </span>
                ) : summary.isBillMatchingHybrid ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 font-mono">
                    <span>✓</span> M3 Bill = SUM Komplain Parsial + Gudang ({formatDecimal(summary.totalM3Hybrid, 4)} m³)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 font-mono">
                    <span>⚠</span> M3 Bill {formatDecimal(summary.totalM3Bill, 4)} ≠ SUM Gudang {formatDecimal(summary.totalM3Gdg, 4)} m³
                  </span>
                )}

                {/* Validasi M3 Tax Return */}
                {summary.hasTaxRows && (
                  summary.isTaxBillMatching ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 font-mono">
                      <span>✓</span> M3 Tax Return Sesuai ({formatDecimal(summary.totalM3TaxGdg, 4)} m³)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 font-mono">
                      <span>⚠</span> M3 Tax Return Selisih: Bill {formatDecimal(summary.totalM3TaxBill, 4)} ≠ Gdg {formatDecimal(summary.totalM3TaxGdg, 4)} m³ (Δ {formatDecimal(Math.abs(summary.totalM3TaxBill - summary.totalM3TaxGdg), 4)} m³)
                    </span>
                  )
                )}

                {summary.isPartialKomplain && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 font-mono">
                    Komplain Parsial ({summary.countKomplainRows} Komplain + {summary.countGudangRows} Gudang): {formatDecimal(summary.totalM3Hybrid, 4)} m³
                  </span>
                )}

                {Math.abs(summary.m3PlGdgDiff) > 0.001 && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 font-mono">
                    Δ PL vs Gudang: {formatDecimal(Math.abs(summary.m3PlGdgDiff), 4)} m³
                  </span>
                )}

                {summary.hasQtyDiff && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 font-mono">
                    ⚠ Qty Selisih (Gdg: {formatNumber(summary.totalQtyGdg)}, PL: {formatNumber(summary.totalQtyPL)})
                  </span>
                )}
              </div>

              <div className="text-[11px] text-[var(--color-secondary)]">
                Total <strong>{summary.totalRows}</strong> record • Qty (SJ: <strong>{formatNumber(summary.totalQtySJ)}</strong>, Entrylist: <strong>{formatNumber(summary.totalQtyGdg)}</strong>{summary.totalQtyK > 0 ? `, K: ${formatNumber(summary.totalQtyK)}` : ''}) • Berat (Entrylist: <strong>{formatDecimal(summary.totalBeratGdg, 2)} kg</strong>)
              </div>
            </div>
          </div>
        )}

        {/* Modal Bottom Action */}
        <div className="px-4 py-2.5 sm:px-5 border-t border-[var(--color-border)] bg-[var(--color-neutral)] flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-[var(--color-secondary)]">
            Data dimuat dari <strong className="font-mono text-[var(--color-primary)]">get_qr_tbm3_perMarking_plus_rasio</strong>
          </span>

          <Button variant="secondary" size="sm" onClick={onClose} className="px-4 text-xs">
            {t('common.close') || 'Tutup'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
