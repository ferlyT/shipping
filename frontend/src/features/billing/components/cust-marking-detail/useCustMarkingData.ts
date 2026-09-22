import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { billingApi } from '../../services/billing.service'
import { calculateOverweight, calculateOverweightRaw, cleanFoxProString } from '@/lib/utils'
import type {
  ColumnPreset,
  CustMarkingAggregates,
  NormalizedMarkingRow,
  SortField,
  SortOrder,
} from './types'

// Helper to extract value from row given candidate keys
function getRowValue(row: any, candidates: string[]): any {
  for (const key of candidates) {
    if (row && row[key] !== undefined && row[key] !== null) {
      return row[key]
    }
  }
  return null
}

export function useCustMarkingData(
  isOpen: boolean,
  custCode?: string | null,
  propCustName?: string | null,
  markingCode?: string | null
) {
  const [search, setSearch] = useState('')
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL')
  const [onlyKomplain, setOnlyKomplain] = useState(false)
  const [columnPreset, setColumnPreset] = useState<ColumnPreset>('all')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const { data: rows = [], isLoading, isError, refetch } = useQuery({
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

  // Normalized rows
  const normalizedRows: NormalizedMarkingRow[] = useMemo(() => {
    return rows.map((r, idx) => {
      const invoice = String(
        getRowValue(r, ['fdInvoiceNo', 'fdInvNo', 'No. Invoice', 'No_Invoice', 'fdListCode']) ||
          `Item-${idx + 1}`
      ).trim()
      const dateStr = getRowValue(r, ['fdInvDate', 'Tgl. Inv', 'Tgl_Inv', 'fdTgl'])
      const date = dateStr ? new Date(dateStr).getTime() : 0
      const listCode = String(getRowValue(r, ['fdListCode', 'No. SJ', 'No_SJ', 'fdSJ']) || '—').trim()
      const terima = String(getRowValue(r, ['fdTerima', 'No. Terima', 'No_Terima', 'Terima']) || '—').trim()
      const marking = String(getRowValue(r, ['Marking No', 'Marking_No', 'fdMarkingNo', 'fdMarkingCode']) || '').trim()
      const fdDescr = String(getRowValue(r, ['fdDescr', 'fdDesc']) || '').trim()
      const fdComodity = String(getRowValue(r, ['fdComodity', 'Comodity', 'fdCommodity']) || '').trim()
      const fdComodityName = String(getRowValue(r, ['fdComodityName', 'Tipe', 'fdTipe']) || '').trim()
      const comodity = fdComodity || fdComodityName || fdDescr || '—'
      const rawBc = String(
        getRowValue(r, ['fdBranchCode', 'BranchCode', 'branchCode', 'BC', 'fdBC', 'branch', 'Branch']) || ''
      ).trim()
      const bc = rawBc || '—'
      const listType = getRowValue(r, ['fdListType', 'ListType'])
      const modeText = listType === 1 ? 'UDARA' : listType === 2 ? 'LAUT' : '—'
      const tax = getRowValue(r, [
        'Tax',
        'fdTax',
        'fdTaxRebates',
        'TaxRebates',
        'taxRebates',
        'TaxReturn',
        'taxReturn',
        'tax_return',
        'isTax',
        'tax',
        'fdTaxReturn',
      ])
      const isTax =
        tax === 1 ||
        tax === '1' ||
        tax === true ||
        String(tax).toUpperCase() === 'TAX' ||
        String(tax).toUpperCase() === 'YES' ||
        Number(tax) === 1
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
      const activeQty = qtyGdg > 0 ? qtyGdg : qtySJ > 0 ? qtySJ : qtyPL

      // Berat versions
      const weightSJ = parseNum(['fdTotalBeratSJ', 'Berat SJ', 'Berat_SJ', 'fdBeratSJ', 'fdBeratList', 'fdTotalBeratList'])
      const weightGdg = parseNum(['fdJmlBerat', 'Berat', 'fdBerat', 'fdJmlBeratGudang', 'fdBeratGudang', 'Berat Gdg', 'Berat_Gdg'])
      const weightK = parseNum(['fdJmlBeratKomplain', 'Berat K', 'Berat_K', 'fdBeratK', 'fdBeratKomplain'])
      const selisihKg = parseNum(['fdSelisihKg', 'SelisihKg'])
      const weight = weightK > 0 ? weightK : weightSJ > 0 ? weightSJ : weightGdg
      const weightGudangActual = weightSJ > 0 ? weightSJ : weightGdg

      // M3 versions
      const m3PL = parseNum(['fdM3PackingList', 'M3 PL', 'M3_PL']) || parseNum(['fdM3Pl', 'fdM3PL'])
      const m3Gdg = parseNum(['fdM3', 'M3', 'm3_gdg'])
      const m3K = parseNum(['fdm3Komplain', 'fdM3Komplain', 'M3 K', 'M3_K', 'fdM3K'])
      const selisihM3 = parseNum(['fdSelisihM3', 'SelisihM3'])
      const m3Bill = parseNum(['M3 Bill', 'M3_Bill', 'fdM3Bill', 'M3', 'fdM3', 'M3 Dll', 'M3_Dll', 'fdM3Dll'])
      const activeM3 = m3K > 0 ? m3K : m3Gdg

      // Rasio & VFC
      const rasioVal = getRowValue(r, [
        'fdRasioLr',
        'fdRasio',
        'Rasio',
        'rasio',
        'fdRatio',
        'Ratio',
        'ratio',
        'fdRasioHarga',
        'RasioHarga',
      ])
      const rasio = typeof rasioVal === 'number' ? rasioVal : parseFloat(String(rasioVal || 0)) || 0
      const vfcGdg = parseNum(['fdVFC', 'VFC'])
      const vfcK = parseNum(['fdVfcKomplain', 'VFC K'])
      const vfcBill = parseNum(['fdVfcBill', 'VFC Bill'])
      const selisihVfc = parseNum(['fdSelisihVfc', 'SelisihVfc'])

      // Finansial
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
      const rawOwK = rasio > 0 && hasKomplain ? calculateOverweightRaw(weight, m3K > 0 ? m3K : m3Gdg, rasio) : null
      const owK = rasio > 0 && hasKomplain ? calculateOverweight(weight, m3K > 0 ? m3K : m3Gdg, rasio) : 0
      const ow = hasKomplain ? (owK > 0 ? owK : null) : owGdg > 0 ? owGdg : null
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
      const v = getRowValue(r, [
        'fdRasio',
        'fdRasioLr',
        'Rasio',
        'rasio',
        'fdRatio',
        'Ratio',
        'ratio',
        'fdRasioHarga',
        'RasioHarga',
      ])
      if (v !== null && v !== undefined && Number(v) > 0) return Number(v)
    }
    return 0
  }, [rows])

  // Resolve Customer Name
  const displayCustName = useMemo(() => {
    if (propCustName?.trim()) return cleanFoxProString(propCustName.trim())
    for (const r of rows) {
      const name = getRowValue(r, ['fdCustName', 'Nama Customer', 'Nama_Customer', 'Customer', 'CustName'])
      if (name && String(name).trim()) return cleanFoxProString(String(name).trim())
    }
    return custCode || '—'
  }, [rows, propCustName, custCode])

  // Branches list
  const branches = useMemo(() => {
    const s = new Set<string>()
    normalizedRows.forEach((r) => {
      if (r.bc && r.bc !== '—') s.add(r.bc)
    })
    return Array.from(s).sort()
  }, [normalizedRows])

  // Filtered rows
  const filteredRows = useMemo(() => {
    let res = [...normalizedRows]

    if (selectedBranch !== 'ALL') {
      res = res.filter((r) => r.bc === selectedBranch)
    }

    if (onlyKomplain) {
      res = res.filter((r) => r.hasKomplain || r.hasSelisih)
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      res = res.filter(
        (r) =>
          r.invoice.toLowerCase().includes(q) ||
          r.listCode.toLowerCase().includes(q) ||
          r.terima.toLowerCase().includes(q) ||
          r.marking.toLowerCase().includes(q) ||
          r.comodity.toLowerCase().includes(q) ||
          r.bc.toLowerCase().includes(q)
      )
    }

    return res
  }, [normalizedRows, selectedBranch, onlyKomplain, search])

  // Sorted rows
  const sortedRows = useMemo(() => {
    const list = [...filteredRows]
    return list.sort((a, b) => {
      let valA: any = a[sortField as keyof NormalizedMarkingRow]
      let valB: any = b[sortField as keyof NormalizedMarkingRow]

      if (valA === null || valA === undefined) valA = ''
      if (valB === null || valB === undefined) valB = ''

      if (typeof valA === 'string') {
        return sortOrder === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA))
      }

      return sortOrder === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA)
    })
  }, [filteredRows, sortField, sortOrder])

  // Aggregates
  const aggregates: CustMarkingAggregates = useMemo(() => {
    return sortedRows.reduce(
      (acc, r) => {
        acc.totalResi += 1
        acc.totalQtyGdg += r.qtyGdg
        acc.totalQtySJ += r.qtySJ
        acc.totalQtyPL += r.qtyPL
        acc.totalQtyK += r.qtyK
        acc.totalWeightGdg += r.weightGdg
        acc.totalWeightSJ += r.weightSJ
        acc.totalWeightK += r.weightK
        acc.totalWeight += r.weight
        acc.totalM3PL += r.m3PL
        acc.totalM3Gdg += r.m3Gdg
        acc.totalM3K += r.m3K
        acc.totalM3Bill += r.m3Bill
        acc.totalM3Active += r.activeM3
        acc.totalVfcGdg += r.vfcGdg
        acc.totalVfcK += r.vfcK
        acc.totalVfcBill += r.vfcBill
        acc.totalValue2 += r.value2
        acc.totalFc += r.fc
        if (r.overWeight && r.overWeight > 0) {
          acc.totalOw += r.overWeight
        }
        if (r.hasKomplain) acc.countKomplain += 1
        if (r.hasSelisih) acc.countSelisih += 1
        return acc
      },
      {
        totalResi: 0,
        totalQtyGdg: 0,
        totalQtySJ: 0,
        totalQtyPL: 0,
        totalQtyK: 0,
        totalWeightGdg: 0,
        totalWeightSJ: 0,
        totalWeightK: 0,
        totalWeight: 0,
        totalM3PL: 0,
        totalM3Gdg: 0,
        totalM3K: 0,
        totalM3Bill: 0,
        totalM3Active: 0,
        totalVfcGdg: 0,
        totalVfcK: 0,
        totalVfcBill: 0,
        totalValue2: 0,
        totalFc: 0,
        totalOw: 0,
        countKomplain: 0,
        countSelisih: 0,
      }
    )
  }, [sortedRows])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const resetFilters = () => {
    setSearch('')
    setSelectedBranch('ALL')
    setOnlyKomplain(false)
    setColumnPreset('all')
  }

  return {
    rows,
    normalizedRows,
    filteredRows,
    sortedRows,
    aggregates,
    branches,
    rasioValue,
    displayCustName,
    isLoading,
    isError,
    refetch,
    search,
    setSearch,
    selectedBranch,
    setSelectedBranch,
    onlyKomplain,
    setOnlyKomplain,
    columnPreset,
    setColumnPreset,
    sortField,
    sortOrder,
    handleSort,
    resetFilters,
  }
}
