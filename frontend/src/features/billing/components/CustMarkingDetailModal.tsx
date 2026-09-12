import { useModalEscape } from '@/hooks/useModalEscape'
import { Fragment, useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { FileSpreadsheet, Loader2 } from 'lucide-react'
import { billingApi } from '../services/billing.service'
import { formatDecimal, formatDate, formatNumber, calculateOverweight, calculateOverweightRaw } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
import { useToastStore } from '@/stores/toastStore'

interface CustMarkingDetailModalProps {
  isOpen: boolean
  onClose: () => void
  custCode?: string | null
  custName?: string | null
  markingCode?: string | null
}

type ColumnPreset = 'all' | 'physical' | 'complaint' | 'finance'

type SortField =
  | 'invoice'
  | 'branchCode'
  | 'date'
  | 'listCode'
  | 'terima'
  | 'marking'
  | 'comodity'
  | 'qtyGdg'
  | 'qtySJ'
  | 'qtyPL'
  | 'qtyK'
  | 'weightGdg'
  | 'weightSJ'
  | 'weightK'
  | 'selisihKg'
  | 'm3Gdg'
  | 'm3PL'
  | 'm3K'
  | 'selisihM3'
  | 'm3Bill'
  | 'rasio'
  | 'vfcGdg'
  | 'vfcK'
  | 'vfcBill'
  | 'overWeight'
  | 'value2'
  | 'fc'

type SortOrder = 'asc' | 'desc'

export function CustMarkingDetailModal({
  isOpen,
  onClose,
  custCode,
  custName: propCustName,
  markingCode,
}: CustMarkingDetailModalProps) {
  useModalEscape(isOpen, onClose)
  const { t } = useTranslation()
  const { addToast } = useToastStore()
  const [search, setSearch] = useState('')
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL')
  const [onlyKomplain, setOnlyKomplain] = useState(false)
  const [columnPreset, setColumnPreset] = useState<ColumnPreset>('all')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setSearch('')
      setSelectedBranch('ALL')
      setOnlyKomplain(false)
      setColumnPreset('all')
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

  // 1. Normalized rows (Single source of truth with ALL columns)
  const normalizedRows = useMemo(() => {
    return rows.map((r, idx) => {
      const invoice = String(getRowValue(r, ['fdInvoiceNo', 'fdInvNo', 'No. Invoice', 'No_Invoice', 'fdListCode']) || `Item-${idx + 1}`).trim()
      const dateStr = getRowValue(r, ['fdInvDate', 'Tgl. Inv', 'Tgl_Inv', 'fdTgl'])
      const date = dateStr ? new Date(dateStr).getTime() : 0
      const listCode = String(getRowValue(r, ['fdListCode', 'No. SJ', 'No_SJ', 'fdSJ']) || '—').trim()
      const terima = String(getRowValue(r, ['fdTerima', 'No. Terima', 'No_Terima', 'Terima']) || '—').trim()
      const marking = String(getRowValue(r, ['Marking No', 'Marking_No', 'fdMarkingNo', 'fdMarkingCode']) || '').trim()
      const fdDescr = String(getRowValue(r, ['fdDescr', 'fdDesc']) || '').trim()
      const fdComodity = String(getRowValue(r, ['fdComodity', 'Comodity', 'fdCommodity']) || '').trim()
      const fdComodityName = String(getRowValue(r, ['fdComodityName', 'Tipe', 'fdTipe']) || '').trim()
      const comodity = fdComodity || fdComodityName || fdDescr || '—'
      const rawBc = String(getRowValue(r, ['fdBranchCode', 'BranchCode', 'branchCode', 'BC', 'fdBC', 'branch', 'Branch']) || '').trim()
      const bc = rawBc || '—'
      const listType = getRowValue(r, ['fdListType', 'ListType'])
      const modeText = listType === 1 ? 'UDARA' : listType === 2 ? 'LAUT' : '—'
      const tax = getRowValue(r, ['Tax', 'fdTax', 'fdTaxRebates', 'TaxRebates', 'taxRebates', 'TaxReturn', 'taxReturn', 'tax_return', 'isTax', 'tax', 'fdTaxReturn'])
      const isTax = tax === 1 || tax === '1' || tax === true || String(tax).toUpperCase() === 'TAX' || String(tax).toUpperCase() === 'YES' || Number(tax) === 1
      const taxVal = typeof tax === 'number' ? tax : parseFloat(String(tax || 0)) || 0

      const parseNum = (cands: string[]) => {
        const v = getRowValue(r, cands)
        return typeof v === 'number' ? v : parseFloat(String(v || 0)) || 0
      }

      // Qty versions
      const qtySJ = parseNum(['fdTotalQtySJ', 'Qty SJ', 'Qty_SJ', 'fdQtySJ', 'fdQtyList', 'fdTotalQtyList'])
      const qtyGdg = parseNum(['fdTotalQty', 'Qty Gdg', 'Qty_Gdg', 'fdQtyGdg', 'fdQty', 'fdTotalQtyGudang'])
      const qtyPL = parseNum(['fdQtyPL', 'Qty PL', 'Qty_PL', 'fdTotalQtyPL'])
      const qtyK = parseNum(['fdTotalQtyKomplain', 'Qty K', 'Qty_K', 'fdQtyK', 'fdQtyKomplain', 'fdTotalQtyK'])
      const activeQty = qtyGdg > 0 ? qtyGdg : (qtySJ > 0 ? qtySJ : qtyPL)

      // Berat versions (Hirarki: Komplain > SJ > Gudang)
      const weightSJ = parseNum(['fdTotalBeratSJ', 'Berat SJ', 'Berat_SJ', 'fdBeratSJ', 'fdBeratList', 'fdTotalBeratList'])
      const weightGdg = parseNum(['fdJmlBerat', 'Berat', 'fdBerat', 'fdJmlBeratGudang', 'fdBeratGudang', 'Berat Gdg', 'Berat_Gdg'])
      const weightK = parseNum(['fdJmlBeratKomplain', 'Berat K', 'Berat_K', 'fdBeratK', 'fdBeratKomplain'])
      const selisihKg = parseNum(['fdSelisihKg', 'SelisihKg'])
      const weight = weightK > 0 ? weightK : (weightSJ > 0 ? weightSJ : weightGdg)
      const weightGudangActual = weightSJ > 0 ? weightSJ : weightGdg

      // M3 versions
      const m3PL = parseNum(['fdM3PackingList', 'M3 PL', 'M3_PL', 'fdM3PL', 'fdM3Pl'])
      const m3Gdg = parseNum(['fdM3', 'M3', 'm3_gdg'])
      const m3K = parseNum(['fdm3Komplain', 'fdM3Komplain', 'M3 K', 'M3_K', 'fdM3K'])
      const selisihM3 = parseNum(['fdSelisihM3', 'SelisihM3'])
      const m3Bill = parseNum(['M3 Bill', 'M3_Bill', 'fdM3Bill', 'M3', 'fdM3', 'M3 Dll', 'M3_Dll', 'fdM3Dll'])
      const activeM3 = m3K > 0 ? m3K : m3Gdg

      // Rasio & VFC
      const rasioVal = getRowValue(r, ['fdRasioLr', 'fdRasio', 'Rasio', 'rasio', 'fdRatio', 'Ratio', 'ratio', 'fdRasioHarga', 'RasioHarga'])
      const rasio = typeof rasioVal === 'number' ? rasioVal : parseFloat(String(rasioVal || 0)) || 0
      const vfcGdg = parseNum(['fdVFC', 'VFC'])
      const vfcK = parseNum(['fdVfcKomplain', 'VFC K'])
      const vfcBill = parseNum(['fdVfcBill', 'VFC Bill'])
      const selisihVfc = parseNum(['fdSelisihVfc', 'SelisihVfc'])

      // Finansial & Status
      const currValue1 = String(getRowValue(r, ['fdCurrValue1', 'CurrValue1']) || '').trim()
      const value2 = parseNum(['fdValue2', 'Value2'])
      const currFc = String(getRowValue(r, ['fdCurrFc', 'CurrFc']) || '').trim()
      const fc = parseNum(['fdFc', 'FC', 'Fc'])
      const status = parseNum(['fdStatus', 'Status'])
      const typeTagihan = parseNum(['fdTypeTagihan', 'TypeTagihan'])
      const totalSJ = parseNum(['fdTotalSJ', 'TotalSJ'])

      // Overweight versions
      const rawOwPL = rasio > 0 ? calculateOverweightRaw(weightGdg > 0 ? weightGdg : weightSJ, m3PL, rasio) : null
      const owPL = rasio > 0 ? calculateOverweight(weightGdg > 0 ? weightGdg : weightSJ, m3PL, rasio) : 0
      const rawOwGdg = rasio > 0 ? calculateOverweightRaw(weightGudangActual, m3Gdg, rasio) : null
      const owGdg = rasio > 0 ? calculateOverweight(weightGudangActual, m3Gdg, rasio) : 0
      const hasKomplain = m3K > 0 || weightK > 0 || qtyK > 0 || vfcK > 0
      const hasSelisih = Math.abs(selisihM3) > 0.0001 || Math.abs(selisihKg) > 0.01
      const rawOwK = (rasio > 0 && hasKomplain) ? calculateOverweightRaw(weight, m3K > 0 ? m3K : m3Gdg, rasio) : null
      const owK = (rasio > 0 && hasKomplain) ? calculateOverweight(weight, m3K > 0 ? m3K : m3Gdg, rasio) : 0
      const ow = hasKomplain ? (owK > 0 ? owK : null) : (owGdg > 0 ? owGdg : null)
      const rawOw = hasKomplain ? rawOwK : rawOwGdg

      return {
        raw: r,
        originalIndex: idx + 1,
        invoice,
        dateStr: dateStr ? String(dateStr) : '',
        date,
        listCode,
        terima,
        marking,
        fdDescr,
        fdComodity,
        fdComodityName,
        comodity,
        bc,
        branchCode: bc,
        listType,
        modeText,
        isTax,
        taxVal,
        qtySJ,
        qtyGdg,
        qtyPL,
        qtyK,
        activeQty,
        weightSJ,
        weightGdg,
        weightK,
        selisihKg,
        weight,
        m3PL,
        m3Gdg,
        m3K,
        selisihM3,
        m3Bill,
        activeM3,
        rasio,
        vfcGdg,
        vfcK,
        vfcBill,
        selisihVfc,
        currValue1,
        value2,
        currFc,
        fc,
        status,
        typeTagihan,
        totalSJ,
        hasKomplain,
        hasSelisih,
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

  // Extract single Rasio value for display
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

  // 2. Filtered by SEARCH & ONLY KOMPLAIN
  const searchFilteredRows = useMemo(() => {
    let result = normalizedRows

    if (onlyKomplain) {
      result = result.filter((r) => r.hasKomplain)
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      result = result.filter(
        (r) =>
          r.invoice.toLowerCase().includes(q) ||
          r.listCode.toLowerCase().includes(q) ||
          r.terima.toLowerCase().includes(q) ||
          r.marking.toLowerCase().includes(q) ||
          r.fdComodity.toLowerCase().includes(q) ||
          r.fdComodityName.toLowerCase().includes(q) ||
          r.comodity.toLowerCase().includes(q) ||
          r.bc.toLowerCase().includes(q) ||
          r.dateStr.toLowerCase().includes(q) ||
          r.modeText.toLowerCase().includes(q)
      )
    }

    return result
  }, [normalizedRows, search, onlyKomplain])

  // 3. Live Branch Grouping derived from searchFilteredRows
  const branchGrouping = useMemo(() => {
    const map = new Map<
      string,
      {
        branchCode: string
        count: number
        qty: number
        weight: number
        m3Gdg: number
        m3PL: number
        m3K: number
        m3Bill: number
        overWeight: number
        countKomplain: number
      }
    >()

    searchFilteredRows.forEach((r) => {
      const code = r.bc && r.bc !== '—' ? r.bc : 'LAINNYA'
      const curr = map.get(code) || {
        branchCode: code,
        count: 0,
        qty: 0,
        weight: 0,
        m3Gdg: 0,
        m3PL: 0,
        m3K: 0,
        m3Bill: 0,
        overWeight: 0,
        countKomplain: 0,
      }

      curr.count += 1
      curr.qty += r.activeQty
      curr.weight += r.weight
      curr.m3Gdg += r.m3Gdg
      curr.m3PL += r.m3PL
      curr.m3K += r.m3K
      curr.m3Bill += r.m3Bill
      if (r.overWeight !== null && r.overWeight > 0) {
        curr.overWeight += r.overWeight
      }
      if (r.hasKomplain) {
        curr.countKomplain += 1
      }

      map.set(code, curr)
    })

    return Array.from(map.values()).sort((a, b) => a.branchCode.localeCompare(b.branchCode))
  }, [searchFilteredRows])

  // Auto-reset selectedBranch if the active search makes that branch empty
  useEffect(() => {
    if (selectedBranch !== 'ALL' && branchGrouping.length > 0 && !branchGrouping.some((b) => b.branchCode === selectedBranch)) {
      setSelectedBranch('ALL')
    }
  }, [branchGrouping, selectedBranch])

  // 4. Final Filtered Rows (Search + Selected Branch)
  const finalFilteredRows = useMemo(() => {
    if (selectedBranch === 'ALL') return searchFilteredRows
    return searchFilteredRows.filter((r) => r.bc === selectedBranch)
  }, [searchFilteredRows, selectedBranch])

  // 5. Live Interactive Summary Totals (Recalculates dynamically for all columns!)
  const activeSummary = useMemo(() => {
    let totalM3PL = 0
    let totalM3Gdg = 0
    let totalM3K = 0
    let totalSelisihM3 = 0
    let totalM3Bill = 0
    let totalM3Hybrid = 0
    let totalQtySJ = 0
    let totalQtyGdg = 0
    let totalQtyPL = 0
    let totalQtyK = 0
    let totalBeratSJ = 0
    let totalBeratGdg = 0
    let totalBeratK = 0
    let totalSelisihKg = 0
    let totalBerat = 0
    let totalVfcGdg = 0
    let totalVfcK = 0
    let totalVfcBill = 0
    let totalValue2 = 0
    let totalOverWeight = 0
    let countTaxRows = 0
    let totalM3TaxGdg = 0
    let totalM3TaxPL = 0
    let totalM3TaxBill = 0
    let countKomplainRows = 0

    finalFilteredRows.forEach((r) => {
      totalM3PL += r.m3PL
      totalM3Gdg += r.m3Gdg
      totalM3K += r.m3K
      totalSelisihM3 += r.selisihM3
      totalM3Bill += r.m3Bill
      totalM3Hybrid += (r.m3K > 0 ? r.m3K : r.m3Gdg)
      totalQtySJ += r.qtySJ
      totalQtyGdg += r.qtyGdg
      totalQtyPL += r.qtyPL
      totalQtyK += r.qtyK
      totalBeratSJ += r.weightSJ
      totalBeratGdg += r.weightGdg
      totalBeratK += r.weightK
      totalSelisihKg += r.selisihKg
      totalBerat += r.weight
      totalVfcGdg += r.vfcGdg
      totalVfcK += r.vfcK
      totalVfcBill += r.vfcBill
      totalValue2 += r.value2
      if (r.overWeight && r.overWeight > 0) {
        totalOverWeight += r.overWeight
      }
      if (r.hasKomplain) countKomplainRows++
      if (r.isTax) {
        countTaxRows++
        totalM3TaxGdg += r.m3Gdg
        totalM3TaxPL += r.m3PL
        totalM3TaxBill += r.m3Bill
      }
    })

    const rasio = rasioValue || 0
    const rawTotalOwPL = rasio > 0 ? calculateOverweightRaw(totalBerat, totalM3PL, rasio) : null
    const rawTotalOwGdg = rasio > 0 ? calculateOverweightRaw(totalBerat, totalM3Gdg, rasio) : null
    const rawTotalOwHybrid = rasio > 0 ? calculateOverweightRaw(totalBerat, totalM3Hybrid, rasio) : null

    const isBillMatchingGdg = Math.abs(totalM3Bill - totalM3Gdg) < 0.001
    const isBillMatchingHybrid = Math.abs(totalM3Bill - totalM3Hybrid) < 0.001

    return {
      totalRows: finalFilteredRows.length,
      totalQty: totalQtyGdg > 0 ? totalQtyGdg : totalQtySJ,
      totalQtySJ,
      totalQtyGdg,
      totalQtyPL,
      totalQtyK,
      totalBerat,
      totalBeratSJ,
      totalBeratGdg,
      totalBeratK,
      totalSelisihKg,
      totalM3PL,
      totalM3Gdg,
      totalM3K,
      totalSelisihM3,
      totalM3Bill,
      totalM3Hybrid,
      totalVfcGdg,
      totalVfcK,
      totalVfcBill,
      totalValue2,
      isBillMatchingGdg,
      isBillMatchingHybrid,
      isBillMatching: isBillMatchingGdg || isBillMatchingHybrid,
      rawTotalOwPL,
      rawTotalOwGdg,
      rawTotalOwHybrid,
      totalOverWeight,
      hasTaxRows: countTaxRows > 0,
      totalM3TaxGdg,
      totalM3TaxPL,
      totalM3TaxBill,
      countKomplainRows,
      hasQtyDiff: (totalQtySJ !== totalQtyGdg) && totalQtySJ > 0 && totalQtyGdg > 0,
    }
  }, [finalFilteredRows, rasioValue])

  // 6. Sorted rows for presentation
  const displayRows = useMemo(() => {
    return [...finalFilteredRows].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'invoice':
          cmp = a.invoice.localeCompare(b.invoice)
          break
        case 'branchCode':
          cmp = a.bc.localeCompare(b.bc)
          break
        case 'date':
          cmp = a.date - b.date
          break
        case 'listCode':
          cmp = a.listCode.localeCompare(b.listCode)
          break
        case 'terima':
          cmp = a.terima.localeCompare(b.terima)
          break
        case 'marking':
          cmp = a.marking.localeCompare(b.marking)
          break
        case 'comodity':
          cmp = a.comodity.localeCompare(b.comodity)
          break
        case 'qtyGdg':
          cmp = a.qtyGdg - b.qtyGdg
          break
        case 'qtySJ':
          cmp = a.qtySJ - b.qtySJ
          break
        case 'qtyPL':
          cmp = a.qtyPL - b.qtyPL
          break
        case 'qtyK':
          cmp = a.qtyK - b.qtyK
          break
        case 'weightGdg':
          cmp = a.weightGdg - b.weightGdg
          break
        case 'weightSJ':
          cmp = a.weightSJ - b.weightSJ
          break
        case 'weightK':
          cmp = a.weightK - b.weightK
          break
        case 'selisihKg':
          cmp = a.selisihKg - b.selisihKg
          break
        case 'm3Gdg':
          cmp = a.m3Gdg - b.m3Gdg
          break
        case 'm3PL':
          cmp = a.m3PL - b.m3PL
          break
        case 'm3K':
          cmp = a.m3K - b.m3K
          break
        case 'selisihM3':
          cmp = a.selisihM3 - b.selisihM3
          break
        case 'm3Bill':
          cmp = a.m3Bill - b.m3Bill
          break
        case 'rasio':
          cmp = a.rasio - b.rasio
          break
        case 'vfcGdg':
          cmp = a.vfcGdg - b.vfcGdg
          break
        case 'vfcK':
          cmp = a.vfcK - b.vfcK
          break
        case 'vfcBill':
          cmp = a.vfcBill - b.vfcBill
          break
        case 'value2':
          cmp = a.value2 - b.value2
          break
        case 'fc':
          cmp = a.fc - b.fc
          break
        case 'overWeight':
          cmp = (a.rawOw || 0) - (b.rawOw || 0)
          break
        default:
          cmp = 0
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })
  }, [finalFilteredRows, sortField, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  // Helper to render colored real overweight delta
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
        title={`${titlePrefix}: ${sign}${formatNumber(val)} kg (${isOver ? 'Overweight' : 'Aman'})`}
      >
        {sign}{formatNumber(val)} kg
      </span>
    )
  }

  // Extract Customer Name (Prioritaskan master customer propCustName jika disediakan)
  const custName = useMemo(() => {
    if (propCustName && propCustName.trim()) return propCustName.trim()
    for (const r of rows) {
      const name = getRowValue(r, ['fdCustName', 'CustName', 'CustomerName', 'fdCustomerName'])
      if (name) return String(name).trim()
    }
    return null
  }, [propCustName, rows])

  // Group displayRows by branch code (r.bc) for inline branch headers in tbody
  const groupedDisplayRows = useMemo(() => {
    const map = new Map<string, typeof displayRows>()
    displayRows.forEach((row) => {
      const code = row.bc && row.bc !== '—' ? row.bc : 'LAINNYA'
      if (!map.has(code)) {
        map.set(code, [])
      }
      map.get(code)!.push(row)
    })

    return Array.from(map.entries()).map(([branchCode, bRows]) => ({
      branchCode,
      count: bRows.length,
      weight: bRows.reduce((sum, r) => sum + r.weight, 0),
      rows: bRows,
    }))
  }, [displayRows])

  // Context bar dynamic summary metrics
  const contextBarInfo = useMemo(() => {
    const komplainCount = finalFilteredRows.filter((r) => r.hasKomplain).length
    const missingPLRows = finalFilteredRows.filter((r) => r.m3PL === 0)
    const missingPLBranches = Array.from(
      new Set(missingPLRows.map((r) => r.bc).filter((bc) => bc && bc !== '—'))
    ).join(', ')

    let maxDiff = 0
    let maxSelisihInvoice: string | null = null
    let maxDeltaVal = 0

    finalFilteredRows.forEach((r) => {
      if (r.m3PL > 0) {
        const delta = r.m3PL - r.m3Gdg
        if (Math.abs(delta) > maxDiff) {
          maxDiff = Math.abs(delta)
          maxSelisihInvoice = r.invoice
          maxDeltaVal = delta
        }
      }
    })

    return {
      komplainCount,
      missingPLCount: missingPLRows.length,
      missingPLBranches,
      maxSelisihInvoice,
      maxDeltaVal,
    }
  }, [finalFilteredRows])

  // Subtitle metadata info (HSK/WK · 26GZD04 · Garment · Laut)
  const subtitleInfo = useMemo(() => {
    const custDisplay = custName || custCode || '—'
    const markingDisplay = markingCode || '—'

    const commodities = Array.from(
      new Set(normalizedRows.map((r) => r.comodity).filter((c) => c && c !== '—'))
    )
    const commodityDisplay =
      commodities.length === 1
        ? commodities[0]
        : commodities.length > 1
          ? `${commodities[0]} (+${commodities.length - 1})`
          : 'Semua item Garment'

    const modes = Array.from(
      new Set(normalizedRows.map((r) => r.modeText).filter((m) => m && m !== '—'))
    )
    const modeDisplay =
      modes.length === 1
        ? `Mode ${modes[0].toLowerCase().replace(/^./, (s) => s.toUpperCase())}`
        : modes.length > 1
          ? 'Multi-mode'
          : 'Mode Laut'

    return { custDisplay, markingDisplay, commodityDisplay, modeDisplay }
  }, [custName, custCode, markingCode, normalizedRows])

  const handleExportExcel = async () => {
    if (normalizedRows.length === 0) {
      addToast({ type: 'warning', message: 'Tidak ada data untuk diexport' })
      return
    }

    try {
      setIsExporting(true)
      addToast({ type: 'info', message: 'Sedang mengambil detail ukuran dari tbEntryListDetail...' })

      // 1. Ambil listCode unik dari normalizedRows
      const listCodes = Array.from(
        new Set(
          normalizedRows
            .map((r) => r.listCode)
            .filter((lc): lc is string => typeof lc === 'string' && lc.trim().length >= 4 && lc !== '—')
        )
      )

      // 2. Fetch data detail ukuran dari backend tbEntryListDetail
      let entryDetails: Array<{
        fdListCode: string
        fdListDCode: string
        fdDescr: string
        fdPjg: number
        fdLbr: number
        fdTng: number
        fdQty: number
        fdM3: number
        fdLoad: string | null
      }> = []

      if (listCodes.length > 0) {
        try {
          const res = await billingApi.entryListDetails(listCodes)
          entryDetails = res.data?.data || []
        } catch (fetchErr) {
          console.error('Failed to fetch tbEntryListDetail:', fetchErr)
        }
      }

      // 3. Siapkan Sheet 1: Ringkasan Listcode & Marking
      const sheet1Rows = finalFilteredRows.map((r, idx) => ({
        'No': idx + 1,
        'No. Invoice': r.invoice,
        'Tgl Invoice': r.dateStr ? formatDate(r.dateStr) : '—',
        'Cabang': r.branchCode,
        'No. Listcode': r.listCode,
        'No. Terima / Resi': r.terima,
        'Marking No': r.marking,
        'Komoditas': r.fdComodity || r.comodity,
        'Tipe Komoditas': r.fdComodityName || '—',
        'Mode': r.modeText,
        'Tax Return': r.isTax ? 'TAX' : 'NON TAX',
        'Qty Gudang': r.qtyGdg,
        'Qty Listcode': r.qtySJ,
        'Qty PL': r.qtyPL,
        'Qty Komplain': r.qtyK,
        'Berat Gudang (kg)': r.weightGdg,
        'Berat Listcode (kg)': r.weightSJ,
        'Berat Komplain (kg)': r.weightK,
        'Selisih Berat (kg)': r.selisihKg,
        'Volume Gudang (m³)': r.m3Gdg,
        'Volume PL (m³)': r.m3PL,
        'Volume Komplain (m³)': r.m3K,
        'Selisih Volume (m³)': r.selisihM3,
        'Volume Bill (m³)': r.m3Bill,
        'Rasio (kg/m³)': r.rasio,
        'VFC Gudang': r.vfcGdg,
        'VFC Komplain': r.vfcK,
        'VFC Bill': r.vfcBill,
        'Overweight (kg)': r.overWeight || 0,
        'Nilai Tagihan (Rp)': r.value2,
        'Nilai Tax Return (Rp)': r.fc,
        'Status': r.status === 1 ? 'LUNAS' : r.status === 2 ? 'BATAL' : 'PENDING',
        'Tipe Tagihan': r.typeTagihan ? `Tipe ${r.typeTagihan}` : '—',
      }))

      // 4. Siapkan Sheet 2: Detail Ukuran Fisik (Format FoxPro: Blok per Listcode/Marking)
      const sheet2Aoa: any[][] = []

      finalFilteredRows.forEach((rowItem) => {
        const listCodeKey = rowItem.listCode
        const details = entryDetails.filter((d) => d.fdListCode === listCodeKey)

        // Header Blok Metadata sesuai FoxPro:
        // .cells(i,   26).VALUE = thisform.fdCusTNAME.value
        // .cells(i+1, 26).VALUE = dataCust.fdterima
        // .cells(i+2, 26).VALUE = dataCust.fdMarkingCode
        // .cells(i+3, 26).VALUE = dataCust.fdMarkingNo
        sheet2Aoa.push([custName || (rowItem as any).custName || custCode || ''])
        sheet2Aoa.push([rowItem.terima && rowItem.terima !== '—' ? rowItem.terima : ''])
        sheet2Aoa.push([rowItem.listCode && rowItem.listCode !== '—' ? rowItem.listCode : ''])
        sheet2Aoa.push([rowItem.marking && rowItem.marking !== '—' ? rowItem.marking : (rowItem.invoice || '')])

        // Table Header: PJG, LBR, TNG, QTY, M3
        sheet2Aoa.push(['PJG', 'LBR', 'TNG', 'QTY', 'M3', 'DESKRIPSI'])

        let lnTotalM3 = 0
        let lnTotalQty = 0

        if (details.length > 0) {
          details.forEach((d) => {
            const pjg = Number(d.fdPjg) || 0
            const lbr = Number(d.fdLbr) || 0
            const tng = Number(d.fdTng) || 0
            const qty = Number(d.fdQty) || 0
            const m3 = Math.round(((pjg * lbr * tng * qty) / 1000000) * 10000) / 10000

            lnTotalM3 += m3
            lnTotalQty += qty

            sheet2Aoa.push([pjg, lbr, tng, qty, m3, d.fdDescr || ''])
          })
        } else {
          const fallbackQty = rowItem.qtyGdg || rowItem.activeQty || 0
          const fallbackM3 = rowItem.m3Gdg || rowItem.activeM3 || 0
          lnTotalQty = fallbackQty
          lnTotalM3 = fallbackM3
          sheet2Aoa.push(['—', '—', '—', fallbackQty, fallbackM3, rowItem.comodity || ''])
        }

        // Baris TOTAL: .cells(i, 29).VALUE = "TOTAL :" ; .cells(i, 30).VALUE = lnTotalM3
        sheet2Aoa.push(['', '', 'TOTAL :', lnTotalQty, Number(lnTotalM3.toFixed(4))])

        // Pemisah 2 baris kosong antar blok
        sheet2Aoa.push([])
        sheet2Aoa.push([])
      })

      // 5. Buat Workbook XLSX
      const wb = XLSX.utils.book_new()

      const ws1 = XLSX.utils.json_to_sheet(sheet1Rows)
      ws1['!cols'] = [
        { wch: 5 },  // No
        { wch: 22 }, // No. Invoice
        { wch: 14 }, // Tgl Invoice
        { wch: 8 },  // Cabang
        { wch: 14 }, // No. Listcode
        { wch: 18 }, // No. Terima / Resi
        { wch: 18 }, // Marking No
        { wch: 25 }, // Komoditas
        { wch: 25 }, // Tipe Komoditas
        { wch: 8 },  // Mode
        { wch: 12 }, // Tax Return
        { wch: 12 }, // Qty Gudang
        { wch: 12 }, // Qty Listcode
        { wch: 10 }, // Qty PL
        { wch: 12 }, // Qty Komplain
        { wch: 16 }, // Berat Gudang
        { wch: 16 }, // Berat Listcode
        { wch: 16 }, // Berat Komplain
        { wch: 16 }, // Selisih Berat
        { wch: 16 }, // Volume Gudang
        { wch: 16 }, // Volume PL
        { wch: 16 }, // Volume Komplain
        { wch: 16 }, // Selisih Volume
        { wch: 16 }, // Volume Bill
        { wch: 12 }, // Rasio
        { wch: 12 }, // VFC Gudang
        { wch: 12 }, // VFC Komplain
        { wch: 12 }, // VFC Bill
        { wch: 15 }, // Overweight
        { wch: 18 }, // Nilai Tagihan
        { wch: 18 }, // Nilai Tax Return
        { wch: 12 }, // Status
        { wch: 14 }, // Tipe Tagihan
      ]
      XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan Marking')

      const ws2 = XLSX.utils.aoa_to_sheet(
        sheet2Aoa.length > 0 ? sheet2Aoa : [['Tidak ada data detail ukuran']]
      )
      ws2['!cols'] = [
        { wch: 14 }, // PJG / Customer
        { wch: 14 }, // LBR / Terima
        { wch: 14 }, // TNG / Listcode
        { wch: 14 }, // QTY / TOTAL :
        { wch: 16 }, // M3
        { wch: 30 }, // DESKRIPSI
      ]
      XLSX.utils.book_append_sheet(wb, ws2, 'Detail Ukuran Gudang')

      // 6. Generate filename & Trigger Download
      const cleanCust = (custCode || 'CUSTOMER').replace(/[^a-zA-Z0-9_-]/g, '_')
      const cleanMarking = (markingCode || 'MARKING').replace(/[^a-zA-Z0-9_-]/g, '_')
      const dateTag = new Date().toISOString().slice(0, 10)
      const fileName = `Detail_M3_${cleanCust}_${cleanMarking}_${dateTag}.xlsx`

      XLSX.writeFile(wb, fileName)
      addToast({
        type: 'success',
        message: `File Excel "${fileName}" berhasil diunduh (2 Sheet)!`,
      })
    } catch (err) {
      console.error('Export Excel failed:', err)
      addToast({ type: 'error', message: 'Gagal mengexport file Excel' })
    } finally {
      setIsExporting(false)
    }
  }

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null
    return (
      <span style={{ fontSize: '11px', marginLeft: '4px', opacity: 0.8 }}>
        {sortOrder === 'asc' ? '↑' : '↓'}
      </span>
    )
  }

  const colSpan = columnPreset === 'all' ? 6 : 7

  if (!isOpen) return null

  let globalRowCounter = 0

  return createPortal(
    <div className="m3-modal-root fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <style>{`
        .m3-modal-root {
          /* Typography from active theme tokens */
          --font-display-active: var(--font-display, 'Fraunces', serif);
          --font-body-active:    var(--font-body, 'Public Sans', sans-serif);
          --font-label-active:   var(--font-label, 'Space Grotesk', sans-serif);

          /* Colors mapped dynamically to active theme tokens */
          --ink:             var(--color-primary);
          --ink-soft:        var(--color-secondary);
          --limestone:       var(--color-neutral);
          --limestone-deep:  color-mix(in srgb, var(--color-neutral) 75%, var(--color-border));
          --paper:           var(--color-surface);
          --rust:            var(--color-danger);
          --rust-soft:       color-mix(in srgb, var(--color-danger) 15%, transparent);
          --line:            var(--color-border);
          --line-soft:       color-mix(in srgb, var(--color-border) 60%, transparent);
          --ok-bg:           color-mix(in srgb, var(--color-success) 12%, transparent);
          --ok-ink:          var(--color-success);
          --warn-bg:         color-mix(in srgb, var(--color-warning) 12%, transparent);
          --warn-ink:        var(--color-warning);
          --muted:           var(--color-secondary);
          --radius:          10px;
        }

        .m3-modal-root .modal {
          max-width: 1180px;
          width: 100%;
          margin: 0 auto;
          background: var(--paper);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
          border: 1px solid var(--line);
          display: flex;
          flex-direction: column;
          max-height: 92vh;
          font-family: var(--font-body-active);
          color: var(--ink);
        }

        .m3-modal-root .modal-header {
          background: var(--limestone);
          padding: 14px 20px 12px;
          border-bottom: 1px solid var(--line);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-shrink: 0;
        }

        .m3-modal-root .header-left { display: flex; gap: 12px; align-items: flex-start; }
        .m3-modal-root .header-icon {
          width: 34px; height: 34px; border-radius: 8px;
          background: var(--ink);
          color: var(--color-on-primary, #FFFFFF);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }
        [data-theme="midnight"] .m3-modal-root .header-icon {
          background: transparent;
          border: 1px solid var(--line);
          color: var(--color-tertiary);
        }

        .m3-modal-root .header-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .m3-modal-root h1 {
          font-family: var(--font-label-active);
          font-weight: 700;
          font-size: 15px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          margin: 0;
          color: var(--ink);
        }
        .m3-modal-root .chip {
          font-family: var(--font-label-active);
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 100px;
          background: var(--paper);
          border: 1px solid var(--line);
          color: var(--ink-soft);
        }
        .m3-modal-root .chip.rust {
          background: var(--rust-soft);
          color: var(--rust);
          border-color: color-mix(in srgb, var(--rust) 35%, transparent);
        }
        .m3-modal-root .chip.warn {
          background: var(--warn-bg);
          color: var(--warn-ink);
          border-color: color-mix(in srgb, var(--warn-ink) 35%, transparent);
        }
        .m3-modal-root .header-sub {
          margin-top: 4px;
          font-size: 12px;
          color: var(--ink-soft);
          display: flex;
          gap: 6px;
          align-items: center;
          flex-wrap: wrap;
        }
        .m3-modal-root .header-sub .divider { color: var(--line); }
        .m3-modal-root .export-excel-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 28px;
          padding: 0 10px;
          border-radius: 6px;
          border: 1px solid color-mix(in srgb, var(--color-success, #16A34A) 40%, var(--line));
          background: var(--paper);
          color: var(--color-success, #16A34A);
          font-family: var(--font-body-active);
          font-weight: 600;
          font-size: 11.5px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .m3-modal-root .export-excel-btn:hover:not(:disabled) {
          background: color-mix(in srgb, var(--color-success, #16A34A) 12%, transparent);
          border-color: var(--color-success, #16A34A);
        }
        .m3-modal-root .export-excel-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        [data-theme="midnight"] .m3-modal-root .export-excel-btn {
          background: transparent;
          border-color: color-mix(in srgb, #34d399 40%, var(--line));
          color: #34d399;
        }
        [data-theme="midnight"] .m3-modal-root .export-excel-btn:hover:not(:disabled) {
          background: rgba(52, 211, 153, 0.12);
        }

        .m3-modal-root .close-btn {
          width: 28px; height: 28px;
          border-radius: 6px;
          border: 1px solid var(--line);
          background: var(--paper);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          color: var(--ink-soft);
          font-size: 12px;
          flex-shrink: 0;
          transition: all 0.15s;
        }
        .m3-modal-root .close-btn:hover {
          background: var(--limestone);
          color: var(--ink);
          border-color: var(--color-border-strong);
        }

        .m3-modal-root .modal-body {
          padding: 14px 20px 0;
          overflow-y: auto;
          flex: 1;
          min-height: 0;
        }

        .m3-modal-root .branch-row {
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .m3-modal-root .branch-label {
          font-size: 11px; font-weight: 700; color: var(--ink-soft);
          display: flex; align-items: center; gap: 4px;
          margin-right: 2px;
          font-family: var(--font-label-active);
          letter-spacing: 0.05em;
        }
        .m3-modal-root .branch-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
        .m3-modal-root .tab {
          font-family: var(--font-body-active);
          font-size: 12px;
          font-weight: 600;
          padding: 5px 10px;
          border-radius: 6px;
          border: 1px solid var(--line);
          background: var(--paper);
          color: var(--ink-soft);
          cursor: pointer;
          transition: all 0.15s;
        }
        .m3-modal-root .tab:hover {
          border-color: var(--color-border-strong);
          color: var(--ink);
        }
        .m3-modal-root .tab .count { font-weight: 400; opacity: 0.8; font-family: var(--font-label-active); }
        .m3-modal-root .tab.active {
          background: var(--ink);
          border-color: var(--ink);
          color: var(--color-on-primary, #FFFFFF);
        }
        [data-theme="midnight"] .m3-modal-root .tab.active {
          background: transparent;
          border-color: var(--color-tertiary);
          color: var(--color-tertiary);
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.15);
        }

        .m3-modal-root .kpi-row {
          display: grid;
          grid-template-columns: 1.3fr 1fr 1fr 1fr;
          gap: 10px;
          margin-bottom: 14px;
        }
        @media (max-width: 768px) {
          .m3-modal-root .kpi-row {
            grid-template-columns: 1fr;
          }
        }
        .m3-modal-root .kpi {
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: 10px 14px;
          background: var(--paper);
          transition: border-color 0.15s;
        }
        .m3-modal-root .kpi-label {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.03em;
          margin-bottom: 4px;
          display: flex; align-items: center; gap: 6px;
          font-family: var(--font-body-active);
        }
        .m3-modal-root .kpi-value {
          font-family: var(--font-label-active);
          font-size: 18px;
          font-weight: 700;
          color: var(--ink);
          line-height: 1.1;
        }
        .m3-modal-root .kpi-value .unit { font-size: 11.5px; font-weight: 500; color: var(--ink-soft); margin-left: 2px; }
        .m3-modal-root .kpi-foot {
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px solid var(--line-soft);
          display: flex; justify-content: space-between;
          font-size: 11px;
          color: var(--ink-soft);
        }
        .m3-modal-root .kpi-foot b { color: var(--ink); font-family: var(--font-label-active); font-weight: 600; }
        .m3-modal-root .kpi.status-ok {
          background: var(--ok-bg);
          border-color: color-mix(in srgb, var(--ok-ink) 35%, transparent);
        }
        .m3-modal-root .kpi.status-ok .kpi-label { color: var(--ok-ink); }
        .m3-modal-root .kpi.status-ok .kpi-value {
          color: var(--ok-ink);
          font-family: var(--font-body-active);
          font-size: 15px;
          font-weight: 700;
        }
        .m3-modal-root .kpi.status-ok .kpi-foot { border-top-color: color-mix(in srgb, var(--ok-ink) 25%, transparent); }
        .m3-modal-root .kpi.split .kpi-value-row { display: flex; align-items: baseline; gap: 10px; }
        .m3-modal-root .kpi.split .kpi-value-row .divider-line { width: 1px; height: 18px; background: var(--line); }
        .m3-modal-root .kpi.split .sub-label { font-size: 10.5px; color: var(--muted); display: block; margin-top: 1px; }

        .m3-modal-root .toolbar {
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 4px;
          flex-wrap: wrap;
        }
        .m3-modal-root .search-box {
          flex: 1;
          min-width: 200px;
          display: flex; align-items: center; gap: 6px;
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 6px 10px;
          color: var(--muted);
          font-size: 12px;
          background: var(--limestone);
        }
        .m3-modal-root .search-box input {
          border: none;
          background: transparent;
          width: 100%;
          font-size: 12px;
          font-family: var(--font-body-active);
          color: var(--ink);
          outline: none;
        }
        .m3-modal-root .search-box input::placeholder {
          color: var(--muted);
          opacity: 0.7;
        }
        .m3-modal-root .segmented {
          display: flex;
          background: var(--limestone);
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 2px;
          gap: 2px;
        }
        .m3-modal-root .segmented button {
          border: none; background: transparent; font-size: 11.5px; font-weight: 600;
          padding: 4px 10px; border-radius: 6px; color: var(--ink-soft); cursor: pointer;
          font-family: var(--font-body-active);
          transition: all 0.15s;
        }
        .m3-modal-root .segmented button:hover {
          color: var(--ink);
        }
        .m3-modal-root .segmented button.active {
          background: var(--paper);
          color: var(--ink);
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid var(--line);
        }
        [data-theme="midnight"] .m3-modal-root .segmented button.active {
          background: transparent;
          border-color: var(--color-tertiary);
          color: var(--color-tertiary);
        }

        .m3-modal-root .context-bar {
          margin: 10px 0;
          display: flex; align-items: center; gap: 12px;
          font-size: 11.5px; color: var(--ink-soft);
          padding: 7px 12px;
          background: var(--limestone);
          border: 1px solid var(--line);
          border-radius: 8px;
          flex-wrap: wrap;
        }
        .m3-modal-root .context-bar .item { display: flex; align-items: center; gap: 5px; }
        .m3-modal-root .context-bar b { color: var(--ink); font-weight: 600; }
        .m3-modal-root .context-bar .sep { width: 1px; height: 10px; background: var(--line); }

        .m3-modal-root .table-wrap {
          border: 1px solid var(--line);
          border-radius: var(--radius);
          overflow: hidden;
          margin-bottom: 12px;
          overflow-x: auto;
          background: var(--paper);
        }
        .m3-modal-root table { width: 100%; border-collapse: collapse; }
        .m3-modal-root thead th {
          text-align: left;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: var(--muted);
          padding: 8px 12px;
          background: var(--limestone);
          border-bottom: 1px solid var(--line);
          white-space: nowrap;
          font-family: var(--font-body-active);
        }
        .m3-modal-root thead th.num { text-align: right; }
        .m3-modal-root thead th.clickable { cursor: pointer; user-select: none; }
        .m3-modal-root thead th.clickable:hover { color: var(--ink); }
        .m3-modal-root tbody td {
          padding: 8px 12px;
          border-bottom: 1px solid var(--line-soft);
          font-size: 12px;
          vertical-align: middle;
          color: var(--ink);
        }
        .m3-modal-root tbody tr:last-child td { border-bottom: none; }
        .m3-modal-root tbody tr:hover { background: color-mix(in srgb, var(--line) 30%, var(--paper)); }

        .m3-modal-root .branch-group-row td {
          background: var(--limestone-deep);
          padding: 5px 12px;
          font-family: var(--font-label-active);
          font-size: 11.5px;
          font-weight: 700;
          color: var(--ink-soft);
          border-bottom: 1px solid var(--line);
        }
        .m3-modal-root .branch-group-row td span.pill {
          display: inline-block; padding: 1px 6px; border-radius: 100px;
          background: var(--paper); border: 1px solid var(--line); margin-right: 6px;
          color: var(--ink); font-size: 10.5px;
        }

        .m3-modal-root .idx { color: var(--muted); opacity: 0.8; font-size: 11px; width: 24px; font-family: var(--font-label-active); }
        .m3-modal-root .idcell .invoice { font-weight: 600; color: var(--ink); font-family: var(--font-label-active); font-size: 12px; }
        .m3-modal-root .idcell .meta { font-size: 11px; color: var(--muted); margin-top: 1px; }

        .m3-modal-root .markcell .marking { font-weight: 600; color: var(--ink); font-family: var(--font-label-active); font-size: 12px; }
        .m3-modal-root .markcell .komoditas { font-size: 11.5px; color: var(--ink-soft); margin-top: 1px; }

        .m3-modal-root td.num {
          text-align: right;
          font-family: var(--font-label-active);
          font-variant-numeric: tabular-nums;
          color: var(--ink);
          font-size: 12px;
        }
        .m3-modal-root td.num .secondary { display: block; font-size: 10.5px; color: var(--muted); font-family: var(--font-body-active); margin-top: 1px; }
        .m3-modal-root td.num.flag { color: var(--rust); font-weight: 600; }

        .m3-modal-root .vol-cell .bar-row { display: flex; align-items: baseline; justify-content: flex-end; gap: 6px; }
        .m3-modal-root .vol-cell .pl { font-size: 11px; color: var(--muted); }
        .m3-modal-root .vol-cell .delta { display: block; text-align: right; font-size: 10.5px; margin-top: 1px; font-family: var(--font-body-active); }
        .m3-modal-root .vol-cell .delta.neg { color: var(--rust); font-weight: 600; }
        .m3-modal-root .vol-cell .delta.pos { color: var(--ok-ink); font-weight: 600; }
        .m3-modal-root .vol-cell .delta.zero { color: var(--muted); }

        .m3-modal-root .qty-open { color: var(--warn-ink); font-size: 10.5px; margin-left: 4px; font-weight: 600; font-family: var(--font-body-active); }

        .m3-modal-root tfoot td {
          padding: 9px 12px;
          font-family: var(--font-label-active);
          font-weight: 700;
          font-size: 12px;
          background: var(--limestone-deep);
          border-top: 1px solid var(--line);
          color: var(--ink);
        }
        .m3-modal-root tfoot td.num { text-align: right; }

        .m3-modal-root .footer-bar {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 20px 14px;
          border-top: 1px solid var(--line);
          background: var(--limestone);
          font-size: 12px;
          color: var(--ink-soft);
          flex-wrap: wrap;
          gap: 10px;
        }
        .m3-modal-root .footer-bar b { color: var(--ink); font-family: var(--font-label-active); }
        .m3-modal-root .footer-btn {
          padding: 6px 14px;
          border-radius: 6px;
          background: var(--ink);
          color: var(--color-on-primary, #FFFFFF);
          border: 1px solid var(--ink);
          font-family: var(--font-body-active);
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .m3-modal-root .footer-btn:hover { opacity: 0.9; }
        [data-theme="midnight"] .m3-modal-root .footer-btn {
          background: transparent;
          border-color: var(--color-tertiary);
          color: var(--color-tertiary);
        }
        [data-theme="midnight"] .m3-modal-root .footer-btn:hover {
          background: color-mix(in srgb, var(--color-tertiary) 15%, transparent);
        }

        .m3-modal-root .legend {
          padding: 0 20px 10px;
          background: var(--limestone);
          font-size: 11px; color: var(--ink-soft);
          display: flex; gap: 14px; flex-wrap: wrap;
        }
        .m3-modal-root .legend .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 5px; }
      `}</style>

      <div className="modal">
        {/* Header */}
        <div className="modal-header">
          <div className="header-left">
            <div className="header-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M3 10h18" />
              </svg>
            </div>
            <div>
              <div className="header-title-row">
                <h1>Detail M³ per Marking</h1>
                <span className="chip">
                  {finalFilteredRows.length === normalizedRows.length
                    ? `${normalizedRows.length} Listcode`
                    : `${finalFilteredRows.length} dari ${normalizedRows.length} Listcode`}
                </span>
                {rasioValue !== null && (
                  <span className="chip rust">
                    Rasio {formatDecimal(rasioValue, 0)} kg/m³
                  </span>
                )}
                {activeSummary.countKomplainRows > 0 && (
                  <span className="chip warn">
                    ⚠ {activeSummary.countKomplainRows} Komplain
                  </span>
                )}
              </div>
              <div className="header-sub">
                <span>{subtitleInfo.custDisplay}</span>
                <span className="divider">·</span>
                <span>{subtitleInfo.markingDisplay}</span>
                <span className="divider">·</span>
                <span>{subtitleInfo.commodityDisplay}</span>
                <span className="divider">·</span>
                <span>{subtitleInfo.modeDisplay}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="export-excel-btn"
              onClick={handleExportExcel}
              disabled={isExporting || rows.length === 0}
              title="Export isi modal & detail ukuran (tbEntryListDetail) ke file Excel (2 Sheet)"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengexport...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </>
              )}
            </button>
            <button className="close-btn" onClick={onClose} title="Tutup">✕</button>
          </div>
        </div>

        <div className="modal-body">
          {/* Branch filter tabs */}
          <div className="branch-row">
            <span className="branch-label">CABANG</span>
            <div className="branch-tabs">
              <button
                type="button"
                className={`tab ${selectedBranch === 'ALL' ? 'active' : ''}`}
                onClick={() => setSelectedBranch('ALL')}
              >
                Semua <span className="count">· {searchFilteredRows.length} Listcode</span>
              </button>
              {branchGrouping.map((bg) => (
                <button
                  key={bg.branchCode}
                  type="button"
                  className={`tab ${selectedBranch === bg.branchCode ? 'active' : ''}`}
                  onClick={() => setSelectedBranch(selectedBranch === bg.branchCode ? 'ALL' : bg.branchCode)}
                >
                  {bg.branchCode} <span className="count">· {bg.count} Listcode · {formatNumber(Math.round(bg.weight))} kg</span>
                </button>
              ))}
            </div>
          </div>

          {/* KPI cards */}
          <div className="kpi-row">
            {/* Card 1: Split Berat & Qty */}
            <div className="kpi split">
              <div className="kpi-label">Berat &amp; Qty</div>
              <div className="kpi-value-row">
                <div>
                  <div className="kpi-value">
                    {formatNumber(Math.round(activeSummary.totalBerat))}
                    <span className="unit">kg</span>
                  </div>
                  <span className="sub-label">{formatNumber(activeSummary.totalQty)} coly</span>
                </div>
                <div className="divider-line"></div>
                <div>
                  {activeSummary.hasQtyDiff || Math.abs(activeSummary.totalSelisihKg) > 0.01 ? (
                    <>
                      <div className="kpi-value" style={{ fontSize: '15px', color: 'var(--rust)' }}>
                        {activeSummary.totalSelisihKg > 0 ? '+' : ''}{formatDecimal(activeSummary.totalSelisihKg, 1)} kg
                      </div>
                      <span className="sub-label">ada selisih berat</span>
                    </>
                  ) : (
                    <>
                      <div className="kpi-value" style={{ fontSize: '15px', color: 'var(--ink-soft)' }}>
                        Listcode = Gdg
                      </div>
                      <span className="sub-label">tidak ada selisih</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: Volume Gudang */}
            <div className="kpi">
              <div className="kpi-label">Volume Gudang</div>
              <div className="kpi-value">
                {formatDecimal(activeSummary.totalM3Gdg, 4)}
                <span className="unit">m³</span>
              </div>
              <div className="kpi-foot">
                <span>M³ Bill</span>
                <b>{formatDecimal(activeSummary.totalM3Bill, 4)} m³</b>
              </div>
            </div>

            {/* Card 3: Volume PL */}
            <div className="kpi">
              <div className="kpi-label">Volume PL</div>
              <div className="kpi-value">
                {formatDecimal(activeSummary.totalM3PL, 4)}
                <span className="unit">m³</span>
              </div>
              <div className="kpi-foot">
                <span>Selisih Gdg – PL</span>
                <b style={{ color: Math.abs(activeSummary.totalM3Gdg - activeSummary.totalM3PL) > 0.0001 ? 'var(--rust)' : 'var(--ink)' }}>
                  {formatDecimal(activeSummary.totalM3Gdg - activeSummary.totalM3PL, 4)} m³
                </b>
              </div>
            </div>

            {/* Card 4: Overweight Status */}
            <div className={`kpi ${(activeSummary.rawTotalOwHybrid ?? 0) > 0 ? '' : 'status-ok'}`}>
              <div
                className="kpi-label"
                style={{ color: (activeSummary.rawTotalOwHybrid ?? 0) > 0 ? 'var(--rust)' : 'var(--ok-ink)' }}
              >
                Overweight
              </div>
              <div
                className="kpi-value"
                style={{ color: (activeSummary.rawTotalOwHybrid ?? 0) > 0 ? 'var(--rust)' : 'var(--ok-ink)' }}
              >
                {(activeSummary.rawTotalOwHybrid ?? 0) > 0 ? `+${formatNumber(activeSummary.rawTotalOwHybrid!)} kg` : '✓ Aman'}
              </div>
              <div className="kpi-foot">
                <span>PL Delta</span>
                <b style={{ color: (activeSummary.rawTotalOwPL ?? 0) > 0 ? 'var(--rust)' : 'var(--ok-ink)' }}>
                  {activeSummary.rawTotalOwPL !== null
                    ? `${activeSummary.rawTotalOwPL > 0 ? '+' : ''}${formatNumber(activeSummary.rawTotalOwPL)} kg`
                    : '—'}
                </b>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="toolbar">
            <div className="search-box">
              <span>🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari invoice, Listcode, resi, marking, komoditas…"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '13px' }}
                >
                  ✕
                </button>
              )}
            </div>
            <div className="segmented">
              <button
                type="button"
                className={columnPreset === 'all' ? 'active' : ''}
                onClick={() => setColumnPreset('all')}
              >
                Semua Kolom
              </button>
              <button
                type="button"
                className={columnPreset === 'physical' ? 'active' : ''}
                onClick={() => setColumnPreset('physical')}
              >
                Fisik (M³/KG)
              </button>
              <button
                type="button"
                className={columnPreset === 'complaint' ? 'active' : ''}
                onClick={() => setColumnPreset('complaint')}
              >
                Komplain
              </button>
              <button
                type="button"
                className={columnPreset === 'finance' ? 'active' : ''}
                onClick={() => setColumnPreset('finance')}
              >
                Financial
              </button>
            </div>
          </div>

          {/* Context bar */}
          <div className="context-bar">
            <div className="item">
              {contextBarInfo.komplainCount > 0 ? (
                <>⚠ <b>{contextBarInfo.komplainCount}</b> komplain pada {finalFilteredRows.length} Listcode ini</>
              ) : (
                <>✓ <b>0</b> komplain pada {finalFilteredRows.length} Listcode ini</>
              )}
            </div>
            <div className="sep"></div>
            <div className="item">
              {contextBarInfo.missingPLCount > 0 ? (
                <><b>{contextBarInfo.missingPLCount}</b> Listcode {contextBarInfo.missingPLBranches ? `(${contextBarInfo.missingPLBranches}) ` : ''}belum ada data PL</>
              ) : (
                <>✓ Semua Listcode memiliki data PL</>
              )}
            </div>
            <div className="sep"></div>
            <div className="item">
              {contextBarInfo.maxSelisihInvoice ? (
                <>
                  Selisih Gdg–PL terbesar: <b>{contextBarInfo.maxSelisihInvoice} · {contextBarInfo.maxDeltaVal > 0 ? '+' : ''}{formatDecimal(contextBarInfo.maxDeltaVal, 4)} m³</b>
                </>
              ) : (
                <>Selisih Gdg–PL: <b>Semua data PL sesuai</b></>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="table-wrap">
            <table>
              <thead>
                {columnPreset === 'all' && (
                  <tr>
                    <th className="idx clickable" onClick={() => handleSort('date')}>#</th>
                    <th className="clickable" onClick={() => handleSort('invoice')}>
                      Invoice &amp; Listcode {renderSortIndicator('invoice')}
                    </th>
                    <th className="clickable" onClick={() => handleSort('marking')}>
                      Marking &amp; Komoditas {renderSortIndicator('marking')}
                    </th>
                    <th className="num clickable" onClick={() => handleSort('qtyGdg')}>
                      Qty {renderSortIndicator('qtyGdg')}
                    </th>
                    <th className="num clickable" onClick={() => handleSort('weightGdg')}>
                      Berat {renderSortIndicator('weightGdg')}
                    </th>
                    <th className="num clickable" onClick={() => handleSort('m3Gdg')}>
                      Volume (Gdg / PL) {renderSortIndicator('m3Gdg')}
                    </th>
                  </tr>
                )}

                {columnPreset === 'physical' && (
                  <tr>
                    <th className="idx clickable" onClick={() => handleSort('date')}>#</th>
                    <th className="clickable" onClick={() => handleSort('invoice')}>
                      Invoice &amp; Listcode {renderSortIndicator('invoice')}
                    </th>
                    <th className="clickable" onClick={() => handleSort('marking')}>
                      Marking &amp; Komoditas {renderSortIndicator('marking')}
                    </th>
                    <th className="num clickable" onClick={() => handleSort('qtyGdg')}>
                      Qty (Gdg/Listcode) {renderSortIndicator('qtyGdg')}
                    </th>
                    <th className="num clickable" onClick={() => handleSort('weightGdg')}>
                      Berat (Gdg/Listcode) {renderSortIndicator('weightGdg')}
                    </th>
                    <th className="num clickable" onClick={() => handleSort('m3Gdg')}>
                      Volume (Gdg/PL) {renderSortIndicator('m3Gdg')}
                    </th>
                    <th className="num clickable" onClick={() => handleSort('overWeight')}>
                      Overweight {renderSortIndicator('overWeight')}
                    </th>
                  </tr>
                )}

                {columnPreset === 'complaint' && (
                  <tr>
                    <th className="idx clickable" onClick={() => handleSort('date')}>#</th>
                    <th className="clickable" onClick={() => handleSort('invoice')}>
                      Invoice &amp; Listcode {renderSortIndicator('invoice')}
                    </th>
                    <th className="clickable" onClick={() => handleSort('marking')}>
                      Marking &amp; Komoditas {renderSortIndicator('marking')}
                    </th>
                    <th className="num clickable" onClick={() => handleSort('qtyK')}>
                      Qty (Gdg/K) {renderSortIndicator('qtyK')}
                    </th>
                    <th className="num clickable" onClick={() => handleSort('weightK')}>
                      Berat (Gdg/K) {renderSortIndicator('weightK')}
                    </th>
                    <th className="num clickable" onClick={() => handleSort('m3K')}>
                      Volume (Gdg/K/PL) {renderSortIndicator('m3K')}
                    </th>
                    <th className="num clickable" onClick={() => handleSort('selisihM3')}>
                      Selisih M³ {renderSortIndicator('selisihM3')}
                    </th>
                  </tr>
                )}

                {columnPreset === 'finance' && (
                  <tr>
                    <th className="idx clickable" onClick={() => handleSort('date')}>#</th>
                    <th className="clickable" onClick={() => handleSort('invoice')}>
                      Invoice &amp; Listcode {renderSortIndicator('invoice')}
                    </th>
                    <th className="clickable" onClick={() => handleSort('marking')}>
                      Marking &amp; Komoditas {renderSortIndicator('marking')}
                    </th>
                    <th className="num clickable" onClick={() => handleSort('vfcGdg')}>
                      VFC (Gdg/K/Bill) {renderSortIndicator('vfcGdg')}
                    </th>
                    <th className="num clickable" onClick={() => handleSort('value2')}>
                      Nilai Inv (Value2) {renderSortIndicator('value2')}
                    </th>
                    <th className="num clickable" onClick={() => handleSort('fc')}>
                      FC {renderSortIndicator('fc')}
                    </th>
                    <th>Status</th>
                  </tr>
                )}
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={colSpan} style={{ textAlign: 'center', padding: '36px 14px', color: 'var(--muted)' }}>
                      Memuat rincian data M³ per Marking...
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={colSpan} style={{ textAlign: 'center', padding: '36px 14px', color: 'var(--rust)' }}>
                      Gagal memuat detail data. Silakan coba lagi.
                    </td>
                  </tr>
                ) : displayRows.length === 0 ? (
                  <tr>
                    <td colSpan={colSpan} style={{ textAlign: 'center', padding: '36px 14px', color: 'var(--muted)' }}>
                      Tidak ada data yang cocok dengan pencarian &quot;{search}&quot;.
                    </td>
                  </tr>
                ) : (
                  groupedDisplayRows.map((group) => (
                    <Fragment key={group.branchCode}>
                      <tr className="branch-group-row">
                        <td colSpan={colSpan}>
                          <span className="pill">{group.branchCode}</span>
                          Cabang {group.branchCode} — {group.count} Listcode · {formatNumber(Math.round(group.weight))} kg
                        </td>
                      </tr>
                      {group.rows.map((r) => {
                        globalRowCounter++
                        const rowIdx = globalRowCounter

                        if (columnPreset === 'physical') {
                          return (
                            <tr key={r.invoice + rowIdx}>
                              <td className="idx">{rowIdx}</td>
                              <td className="idcell">
                                <div className="invoice">{r.invoice}</div>
                                <div className="meta">
                                  Listcode {r.listCode} · Resi {r.terima}
                                  {r.dateStr ? ` · ${formatDate(r.dateStr)}` : ''}
                                </div>
                              </td>
                              <td className="markcell">
                                <div className="marking">{r.marking || '—'}</div>
                                <div className="komoditas">{r.comodity}</div>
                              </td>
                              <td className="num">
                                <div>{formatNumber(r.qtyGdg)}</div>
                                <span className="secondary">Listcode: {formatNumber(r.qtySJ)}</span>
                              </td>
                              <td className="num">
                                <div>{formatDecimal(r.weightGdg, 1)} kg</div>
                                <span className="secondary">Listcode: {formatDecimal(r.weightSJ, 1)} kg</span>
                              </td>
                              <td className="num vol-cell">
                                <div className="bar-row">
                                  <span>{formatDecimal(r.m3Gdg, 4)}</span>
                                  <span className="pl">/ {r.m3PL > 0 ? formatDecimal(r.m3PL, 4) : '—'}</span>
                                </div>
                                {r.m3PL > 0 ? (
                                  (() => {
                                    const delta = r.m3PL - r.m3Gdg
                                    const deltaClass = delta > 0.0001 ? 'pos' : delta < -0.0001 ? 'neg' : 'zero'
                                    const sign = delta > 0 ? '+' : ''
                                    return (
                                      <span className={`delta ${deltaClass}`}>
                                        {sign}{formatDecimal(delta, 4)} m³
                                      </span>
                                    )
                                  })()
                                ) : (
                                  <span className="delta zero">menunggu PL</span>
                                )}
                              </td>
                              <td className="num">
                                {renderDeltaOverweight(r.rawOw, 'OW')}
                              </td>
                            </tr>
                          )
                        }

                        if (columnPreset === 'complaint') {
                          return (
                            <tr key={r.invoice + rowIdx}>
                              <td className="idx">{rowIdx}</td>
                              <td className="idcell">
                                <div className="invoice">{r.invoice}</div>
                                <div className="meta">
                                  Listcode {r.listCode} · Resi {r.terima}
                                  {r.hasKomplain && (
                                    <span style={{ marginLeft: 6, fontSize: '10px', fontWeight: 700, color: 'var(--rust)' }}>
                                      KOMPLAIN
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="markcell">
                                <div className="marking">{r.marking || '—'}</div>
                                <div className="komoditas">{r.comodity}</div>
                              </td>
                              <td className="num">
                                <div>{formatNumber(r.qtyGdg)}</div>
                                {r.qtyK > 0 && <span className="secondary" style={{ color: 'var(--warn-ink)', fontWeight: 600 }}>K: {formatNumber(r.qtyK)}</span>}
                              </td>
                              <td className="num">
                                <div>{formatDecimal(r.weightGdg, 1)} kg</div>
                                {r.weightK > 0 && <span className="secondary" style={{ color: 'var(--rust)', fontWeight: 600 }}>K: {formatDecimal(r.weightK, 1)} kg</span>}
                              </td>
                              <td className="num vol-cell">
                                <div className="bar-row">
                                  <span>{formatDecimal(r.m3Gdg, 4)}</span>
                                  <span className="pl">/ {r.m3K > 0 ? formatDecimal(r.m3K, 4) : '—'}</span>
                                </div>
                                {r.m3PL > 0 && (
                                  <span className="secondary">PL: {formatDecimal(r.m3PL, 4)}</span>
                                )}
                              </td>
                              <td className="num">
                                {Math.abs(r.selisihM3) > 0.0001 ? (
                                  <span style={{ color: 'var(--rust)', fontWeight: 600 }}>
                                    {formatDecimal(r.selisihM3, 4)} m³
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--muted)' }}>—</span>
                                )}
                              </td>
                            </tr>
                          )
                        }

                        if (columnPreset === 'finance') {
                          return (
                            <tr key={r.invoice + rowIdx}>
                              <td className="idx">{rowIdx}</td>
                              <td className="idcell">
                                <div className="invoice">{r.invoice}</div>
                                <div className="meta">Listcode {r.listCode} · Resi {r.terima}</div>
                              </td>
                              <td className="markcell">
                                <div className="marking">{r.marking || '—'}</div>
                                <div className="komoditas">{r.comodity}</div>
                              </td>
                              <td className="num">
                                <div>{formatDecimal(r.vfcGdg, 2)}</div>
                                <span className="secondary">Bill: {formatDecimal(r.vfcBill, 2)}</span>
                              </td>
                              <td className="num">
                                {r.value2 > 0 ? formatNumber(r.value2) : '—'}
                              </td>
                              <td className="num">
                                {r.fc > 0 ? formatDecimal(r.fc, 2) : '—'}
                              </td>
                              <td>
                                <div style={{ fontSize: '12px' }}>
                                  {r.isTax ? <span style={{ color: 'var(--ok-ink)', fontWeight: 600 }}>Tax Return</span> : 'Non-Tax'}
                                </div>
                                <span className="secondary">Status: {r.status}</span>
                              </td>
                            </tr>
                          )
                        }

                        // Default: Semua Kolom (Condenced 6 columns from mockup)
                        return (
                          <tr key={r.invoice + rowIdx}>
                            <td className="idx">{rowIdx}</td>
                            <td className="idcell">
                              <div className="invoice">{r.invoice}</div>
                              <div className="meta">
                                Listcode {r.listCode} · Resi {r.terima}
                                {r.dateStr ? ` · ${formatDate(r.dateStr)}` : ''}
                                {r.isTax && <span style={{ marginLeft: 6, fontSize: '10px', fontWeight: 700, color: 'var(--ok-ink)' }}>TAX</span>}
                              </div>
                            </td>
                            <td className="markcell">
                              <div className="marking">{r.marking || '—'}</div>
                              <div className="komoditas">{r.comodity}</div>
                            </td>
                            <td className="num">
                              {formatNumber(r.activeQty)}
                              {r.m3PL === 0 && <span className="qty-open">PL belum</span>}
                              {r.qtyK > 0 && <span className="secondary" style={{ color: 'var(--warn-ink)', fontWeight: 600 }}>K: {formatNumber(r.qtyK)}</span>}
                            </td>
                            <td className="num">
                              {formatDecimal(r.weight, 1)} kg
                              {r.weightK > 0 ? (
                                <span className="secondary" style={{ color: 'var(--rust)', fontWeight: 600 }}>K: {formatDecimal(r.weightK, 1)} kg</span>
                              ) : r.weightSJ > 0 && Math.abs(r.weightSJ - r.weightGdg) > 0.01 ? (
                                <span className="secondary">Listcode: {formatDecimal(r.weightSJ, 1)} kg</span>
                              ) : null}
                            </td>
                            <td className="num vol-cell">
                              <div className="bar-row">
                                <span>{formatDecimal(r.m3Gdg, 4)}</span>
                                <span className="pl">/ {r.m3PL > 0 ? formatDecimal(r.m3PL, 4) : '—'}</span>
                              </div>
                              {r.m3PL > 0 ? (
                                (() => {
                                  const delta = r.m3PL - r.m3Gdg
                                  const deltaClass = delta > 0.0001 ? 'pos' : delta < -0.0001 ? 'neg' : 'zero'
                                  const sign = delta > 0 ? '+' : ''
                                  return (
                                    <span className={`delta ${deltaClass}`}>
                                      {sign}{formatDecimal(delta, 4)} m³
                                    </span>
                                  )
                                })()
                              ) : (
                                <span className="delta zero">menunggu PL</span>
                              )}
                              {r.m3K > 0 && (
                                <span style={{ display: 'block', textAlign: 'right', fontSize: '11px', color: 'var(--warn-ink)', fontWeight: 600, marginTop: '2px' }}>
                                  K: {formatDecimal(r.m3K, 4)} m³
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </Fragment>
                  ))
                )}
              </tbody>

              {displayRows.length > 0 && (
                <tfoot>
                  {columnPreset === 'all' && (
                    <tr>
                      <td colSpan={3}>Total — {finalFilteredRows.length} Listcode</td>
                      <td className="num">{formatNumber(activeSummary.totalQty)}</td>
                      <td className="num">{formatDecimal(activeSummary.totalBerat, 1)} kg</td>
                      <td className="num">{formatDecimal(activeSummary.totalM3Gdg, 4)} / {formatDecimal(activeSummary.totalM3PL, 4)} m³</td>
                    </tr>
                  )}

                  {columnPreset === 'physical' && (
                    <tr>
                      <td colSpan={3}>Total — {finalFilteredRows.length} Listcode</td>
                      <td className="num">{formatNumber(activeSummary.totalQtyGdg)} / {formatNumber(activeSummary.totalQtySJ)}</td>
                      <td className="num">{formatDecimal(activeSummary.totalBeratGdg, 1)} kg</td>
                      <td className="num">{formatDecimal(activeSummary.totalM3Gdg, 4)} / {formatDecimal(activeSummary.totalM3PL, 4)} m³</td>
                      <td className="num">{renderDeltaOverweight(activeSummary.rawTotalOwHybrid, 'Total OW')}</td>
                    </tr>
                  )}

                  {columnPreset === 'complaint' && (
                    <tr>
                      <td colSpan={3}>Total — {finalFilteredRows.length} Listcode ({activeSummary.countKomplainRows} Komplain)</td>
                      <td className="num">{formatNumber(activeSummary.totalQtyGdg)} / {formatNumber(activeSummary.totalQtyK)}</td>
                      <td className="num">{formatDecimal(activeSummary.totalBeratGdg, 1)} / {formatDecimal(activeSummary.totalBeratK, 1)} kg</td>
                      <td className="num">{formatDecimal(activeSummary.totalM3Gdg, 4)} / {formatDecimal(activeSummary.totalM3K, 4)} m³</td>
                      <td className="num">{Math.abs(activeSummary.totalSelisihM3) > 0.0001 ? `${formatDecimal(activeSummary.totalSelisihM3, 4)} m³` : '—'}</td>
                    </tr>
                  )}

                  {columnPreset === 'finance' && (
                    <tr>
                      <td colSpan={3}>Total — {finalFilteredRows.length} Listcode</td>
                      <td className="num">{formatDecimal(activeSummary.totalVfcGdg, 2)} / {formatDecimal(activeSummary.totalVfcBill, 2)}</td>
                      <td className="num">{formatNumber(activeSummary.totalValue2)}</td>
                      <td className="num">—</td>
                      <td>—</td>
                    </tr>
                  )}
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="legend">
          <span><span className="dot" style={{ background: 'var(--rust)' }}></span>Volume PL lebih kecil dari Gudang</span>
          <span><span className="dot" style={{ background: 'var(--ok-ink)' }}></span>Volume PL lebih besar dari Gudang</span>
          <span><span className="dot" style={{ background: 'var(--muted)' }}></span>PL belum tersedia</span>
        </div>

        {/* Footer */}
        <div className="footer-bar">
          <div>
            Menampilkan <b>{finalFilteredRows.length}</b> dari <b>{normalizedRows.length}</b> Listcode · Total Qty <b>{formatNumber(activeSummary.totalQty)} coly</b> · Total Berat <b>{formatDecimal(activeSummary.totalBerat, 1)} kg</b> · M³ Gudang <b>{formatDecimal(activeSummary.totalM3Gdg, 4)} m³</b>
          </div>
          <button type="button" className="footer-btn" onClick={onClose}>
            {t('common.close') || 'Tutup'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
