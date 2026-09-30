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

// Helper resolving commodity type according to legacy FoxPro ctypesea.prg and ctypeair.prg
function resolveCommodityType(typeId: number, isAir: boolean): string {
  if (isAir) {
    switch (typeId) {
      case 1:
        return 'GENERAL'
      case 2:
        return 'BRANDED'
      case 3:
        return 'GARMENT'
      case 4:
        return 'FOOD'
      case 5:
        return 'SHOES'
      case 6:
        return 'LEGAL'
      default:
        return 'GENERAL'
    }
  } else {
    switch (typeId) {
      case 1:
        return 'UMUM'
      case 2:
        return 'TEKSTIL'
      case 3:
        return 'LARTAS-N'
      case 4:
        return 'LARTAS-S'
      case 5:
        return 'FCL'
      case 6:
        return 'LEGAL'
      case 7:
        return 'SEMI GMN'
      case 8:
        return 'GARMENT'
      default:
        return 'UMUM'
    }
  }
}

export function useCustMarkingData(
  isOpen: boolean,
  custCode?: string | null,
  propCustName?: string | null,
  markingCode?: string | null
) {
  const [search, setSearch] = useState('')
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL')
  const [selectedCommodityType, setSelectedCommodityType] = useState<string>('ALL')
  const [onlyKomplain, setOnlyKomplain] = useState(false)
  const [columnPreset, setColumnPreset] = useState<ColumnPreset>('all')
  const [sortField, setSortField] = useState<SortField>('invoice')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

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
      const marking = String(getRowValue(r, ['fdMarkingCode', 'Marking', 'marking']) || markingCode || '').trim()
      const markingNo = String(getRowValue(r, ['fdMarkingNo', 'Marking No', 'Marking_No']) || '').trim()
      const fdDesc = String(getRowValue(r, ['fdDesc', 'fdDescr', 'Ket', 'Keterangan']) || '').trim()
      const fdDescr = fdDesc
      const fdComodity = String(getRowValue(r, ['fdComodity', 'Comodity', 'fdCommodity']) || '').trim()
      const fdComodityName = String(getRowValue(r, ['fdComodityName', 'Tipe', 'fdTipe']) || '').trim()
      const comodity = fdComodity || fdComodityName || fdDesc || '—'
      const rawBc = String(
        getRowValue(r, ['fdBranchCode', 'BranchCode', 'branchCode', 'BC', 'fdBC', 'branch', 'Branch']) || ''
      ).trim()
      const bc = rawBc || '—'
      const listType = getRowValue(r, ['fdListType', 'ListType'])
      const isAir = listType === 1
      const modeText = isAir ? 'UDARA' : listType === 2 ? 'LAUT' : '—'

      const rawTypeId = Number(getRowValue(r, ['fdTypeComodity', 'TypeComodity']) || 1)
      const typeComodityText = fdComodityName || resolveCommodityType(rawTypeId, isAir)

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
      const kgBill = parseNum(['KG', 'Kg', 'kg', 'kgBill', 'fdKGBill', 'KGBill'])
      const selisihKg = parseNum(['fdSelisihKg', 'SelisihKg'])
      const weight = weightK > 0 ? weightK : weightSJ > 0 ? weightSJ : weightGdg

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

      // Overweight versions:
      // 1. Lebih kilo dari fdJmlBerat (Gudang)
      const rawOwGdg = rasio > 0 ? calculateOverweightRaw(weightGdg, m3Gdg, rasio) : null
      const owGdg = rasio > 0 ? calculateOverweight(weightGdg, m3Gdg, rasio) : 0

      // 2. Lebih kilo dari berat SJ
      const refM3SJ = m3Gdg > 0 ? m3Gdg : m3PL
      const rawOwSJ = rasio > 0 ? calculateOverweightRaw(weightSJ, refM3SJ, rasio) : null
      const owSJ = rasio > 0 ? calculateOverweight(weightSJ, refM3SJ, rasio) : 0

      // 3. Lebih kilo dari berat Komplain (hybrid)
      const hasKomplain = m3K > 0 || weightK > 0 || qtyK > 0 || vfcK > 0
      const hasSelisih = Math.abs(selisihM3) > 0.0001 || Math.abs(selisihKg) > 0.01
      const hybridWeight = weightK > 0 ? weightK : weightGdg
      const hybridM3 = m3K > 0 ? m3K : m3Gdg
      const rawOwK = rasio > 0 && hasKomplain ? calculateOverweightRaw(hybridWeight, hybridM3, rasio) : null
      const owK = rasio > 0 && hasKomplain ? calculateOverweight(hybridWeight, hybridM3, rasio) : 0

      // PL Overweight
      const rawOwPL = rasio > 0 ? calculateOverweightRaw(weightGdg > 0 ? weightGdg : weightSJ, m3PL, rasio) : null
      const owPL = rasio > 0 ? calculateOverweight(weightGdg > 0 ? weightGdg : weightSJ, m3PL, rasio) : 0

      const ow = hasKomplain ? (owK > 0 ? owK : null) : owGdg > 0 ? owGdg : null
      const rawOw = hasKomplain ? rawOwK : rawOwGdg

      // FoxPro specific alert flags
      const isUnderbilledM3 = m3Gdg > m3Bill && m3Bill > 0
      const isPlEmpty = qtyPL === 0
      const isStatusNonStandard = status !== 1
      const isQtyKomplainMismatch = qtyK > 0 && qtyK !== qtyGdg

      // Klasifikasi Invoice berdasarkan Karakter ke-5 dan ke-10 (1-indexed)
      // Invoice Utama: char 5 & 10 angka
      // Bill Gabungan: char 5 huruf
      // Bill Tambahan: char 10 huruf
      const cleanInv = invoice.trim()
      const c5 = cleanInv.charAt(4)
      const c10 = cleanInv.charAt(9)
      const isChar5Digit = /[0-9]/.test(c5)
      const isChar5Letter = /[a-zA-Z]/.test(c5)
      const isChar10Digit = /[0-9]/.test(c10)
      const isChar10Letter = /[a-zA-Z]/.test(c10)

      const isInvoiceUtama = isChar5Digit && isChar10Digit
      const isBillGabungan = isChar5Letter
      const isBillTambahan = isChar10Letter

      return {
        raw: r,
        originalIndex: idx + 1,
        invoice,
        dateStr: dateStr ? String(dateStr) : '',
        date,
        listCode,
        terima,
        marking,
        markingNo,
        fdDescr,
        fdDesc,
        fdComodity,
        fdComodityName,
        comodity,
        typeComodityText,
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
        kgBill,
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
        isUnderbilledM3,
        isPlEmpty,
        isStatusNonStandard,
        isInvoiceUtama,
        isBillGabungan,
        isBillTambahan,
        isQtyKomplainMismatch,
        owPL,
        owGdg,
        owSJ,
        owK,
        rawOwPL,
        rawOwGdg,
        rawOwSJ,
        rawOwK,
        rawOw,
        overWeight: ow,
      }
    })
  }, [rows, markingCode])

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

    if (selectedCommodityType !== 'ALL') {
      res = res.filter((r) => r.typeComodityText === selectedCommodityType)
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
          r.markingNo.toLowerCase().includes(q) ||
          r.fdDesc.toLowerCase().includes(q) ||
          r.typeComodityText.toLowerCase().includes(q) ||
          r.comodity.toLowerCase().includes(q) ||
          r.bc.toLowerCase().includes(q)
      )
    }

    return res
  }, [normalizedRows, selectedBranch, selectedCommodityType, onlyKomplain, search])

  // Commodity Types list across normalized rows
  const commodityTypes = useMemo(() => {
    const map = new Map<string, { count: number; weight: number; m3: number }>()
    normalizedRows.forEach((r) => {
      const type = r.typeComodityText || 'LAINNYA'
      const cur = map.get(type) || { count: 0, weight: 0, m3: 0 }
      cur.count += 1
      cur.weight += r.weightGdg > 0 ? r.weightGdg : r.weight
      cur.m3 += r.listType === 1 ? r.vfcGdg : r.m3Gdg
      map.set(type, cur)
    })
    return Array.from(map.entries())
      .map(([type, stats]) => ({
        type,
        ...stats,
      }))
      .sort((a, b) => b.count - a.count)
  }, [normalizedRows])

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
    // Unique invoice classification map
    const uniqueInvMap = new Map<
      string,
      { isUtama: boolean; isGabungan: boolean; isTambahan: boolean }
    >()

    const base = sortedRows.reduce<CustMarkingAggregates>(
      (acc, r) => {
        acc.totalResi += 1
        acc.totalQtyGdg += r.qtyGdg
        acc.totalQtySJ += r.qtySJ
        acc.totalQtyPL += r.qtyPL
        acc.totalQtyK += r.qtyK
        acc.totalWeightGdg += r.weightGdg
        acc.totalWeightSJ += r.weightSJ
        acc.totalWeightK += r.weightK
        acc.totalKgBill += r.kgBill
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
        if (r.owGdg && r.owGdg > 0) {
          acc.totalOwGdg += r.owGdg
        }
        if (r.owSJ && r.owSJ > 0) {
          acc.totalOwSJ += r.owSJ
        }
        if (r.owK && r.owK > 0) {
          acc.totalOwK += r.owK
        }
        if (r.hasKomplain) acc.countKomplain += 1
        if (r.hasSelisih) acc.countSelisih += 1
        if (r.isQtyKomplainMismatch) acc.countQtyKomplainMismatch += 1

        const inv = (r.invoice || '').trim()
        if (inv && inv !== '—' && !inv.startsWith('Item-') && !uniqueInvMap.has(inv)) {
          uniqueInvMap.set(inv, {
            isUtama: r.isInvoiceUtama,
            isGabungan: r.isBillGabungan,
            isTambahan: r.isBillTambahan,
          })
        }

        return acc
      },
      {
        totalResi: 0,
        totalInvoices: 0,
        countInvoiceUtama: 0,
        countBillGabungan: 0,
        countBillTambahan: 0,
        countQtyKomplainMismatch: 0,
        totalQtyGdg: 0,
        totalQtySJ: 0,
        totalQtyPL: 0,
        totalQtyK: 0,
        totalWeightGdg: 0,
        totalWeightSJ: 0,
        totalWeightK: 0,
        totalKgBill: 0,
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
        totalOwGdg: 0,
        totalOwSJ: 0,
        totalOwK: 0,
        countKomplain: 0,
        countSelisih: 0,
        commodityTypes: [],
      }
    )

    base.totalInvoices = uniqueInvMap.size
    base.countInvoiceUtama = Array.from(uniqueInvMap.values()).filter((v) => v.isUtama).length
    base.countBillGabungan = Array.from(uniqueInvMap.values()).filter((v) => v.isGabungan).length
    base.countBillTambahan = Array.from(uniqueInvMap.values()).filter((v) => v.isTambahan).length
    base.commodityTypes = commodityTypes

    return base
  }, [sortedRows, commodityTypes])

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
    setSelectedCommodityType('ALL')
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
    commodityTypes,
    selectedCommodityType,
    setSelectedCommodityType,
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
