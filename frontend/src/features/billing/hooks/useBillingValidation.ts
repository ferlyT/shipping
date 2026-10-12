import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { billingApi } from '../services/billing.service'
import {
  evaluateItemPrice,
  isAuxiliaryItem,
  isVfcItem,
  isFreightChargeItem,
  type ItemPriceEvaluation,
} from '../utils/billing.utils'
import { getBillType, BILL_TYPES } from '../constants/billing.constants'
import { useOverweightValidation, type OverweightValidationResult } from './useOverweightValidation'
import { formatDecimal } from '@/lib/utils'
import type { Billing, BillingDetail, M3CheckResponse, RelatedBillsSummary } from '../types/billing.types'

export interface UnderchargedItem {
  itemName: string
  billedPrice: number
  targetPrice: number
  difference: number
  priceSource?: string
  priceListDisplay?: string
}

export interface OverchargedItem {
  itemName: string
  billedPrice: number
  targetPrice: number
  difference: number
  priceSource?: string
  priceListDisplay?: string
}

export interface CandidateEntry {
  sourceKey: string
  sourceName: string
  val: number
  rawVal?: number
}

export interface UseBillingValidationParams {
  billingData: Billing | null | undefined
  validationData?: M3CheckResponse | null
  transportValidation?: {
    isValid?: boolean
    hasDuplicate?: boolean
    duplicates?: any[]
    expedisiList?: any[]
    matchingExpedisi?: any | null
    checkedAmount?: number
  } | null
}

export interface BillingValidationState {
  // Details yang sudah terurut rapi
  details: BillingDetail[]

  // Tipe Billing
  billType: string
  isAir: boolean
  isType2: boolean
  isType2Match: boolean
  isType2Discrepancy: boolean
  type2CompareData?: any
  isGabungan: boolean

  // Metrik Tagihan
  unitTotals: Record<string, number>
  billedM3: number
  billedKg: number
  billedVfc: number

  // Evaluasi Volume / Kubikasi & Berat Utama
  airCandidates: CandidateEntry[]
  airPrimaryMatch: CandidateEntry | null
  seaCandidates: CandidateEntry[]
  seaPrimaryMatch: CandidateEntry | null
  seaMarkingMatch: boolean
  matchStatus: 'MATCH_PRIMARY' | 'MATCH_MARKING' | 'NO_MATCH'
  matchedSourceName: string
  matchLabel: string
  isMatch: boolean
  isMinChargeApplied: boolean
  isCodUrgentShortfall: boolean

  // Logika Komplain (Approved vs Rejected)
  rawKomplainM3: number | null
  targetKomplainM3: number | null
  isApprovedKomplainActive: boolean
  isKomplainRejected: boolean
  isHybridActive: boolean
  isBilledMatchedApprovedKomplain: boolean
  isBilledMismatchedApprovedKomplain: boolean
  isBilledUsingRejectedKomplain: boolean

  // Qty Validation
  qtyList: number | null
  qtyPL: number | null
  qtyGudang: number | null
  qtyKomplain: number | null
  totalEntryKomplain: number | null
  totalEntryList: number | null
  fdSatuan: string
  activeQtys: { key: string; label: string; val: number }[]
  hasQtyMismatch: boolean
  isQtyListDiff: boolean
  isQtyPLDiff: boolean
  isQtyGudangDiff: boolean
  isQtyKomplainDiff: boolean

  // Weight Validation (List vs Surat Jalan vs Komplain)
  beratMarking: number | null
  beratList: number
  beratSJ: number
  beratKomplain: number
  activeWeights: { key: string; label: string; val: number }[]
  hasWeightMismatch: boolean
  isWeightListDiff: boolean
  isWeightSJDiff: boolean
  isWeightKomplainDiff: boolean

  // Overweight & Rasio Validation (Single Source of Truth)
  overweight: OverweightValidationResult

  // Evaluasi Biaya Ekspedisi / Transport (tbExpIndo)
  transportDetailItem: BillingDetail | undefined
  hasTransportItem: boolean
  effectiveTransportAmount: number
  validExpedisiList: any[]
  mustBillExpedisiList: any[]
  codExpedisiList: any[]
  unbilledExpedisiList: any[]
  totalUnbilledTransportAmount: number
  hasUnbilledTransport: boolean
  matchingExpedisi: any | null

  // Evaluasi Harga Item & Tarif Master
  defaultTypeId: number | null
  defaultComodityName: string
  evaluatedItems: Array<{ item: BillingDetail; evaluation: ItemPriceEvaluation }>
  underchargedItems: UnderchargedItem[]
  overchargedItems: OverchargedItem[]
  hasPriceDiscrepancy: boolean

  // Min Charge M3 Validation (Sea)
  minChargeM3: number
  isBilledBelowMinM3: boolean

  // Fallback Validasi M3 Berbasis No Invoice Terkait (Induk & Anak)
  relatedBillsSummary: RelatedBillsSummary | null
  isChildBillMerged: boolean
  isRelatedBillsMatch: boolean

  // Kesimpulan / Overall Verdict
  isPhysicalValid: boolean
  isFinancialValid: boolean
  isOverallValid: boolean
  validationIssues: string[]

  // Deteksi Kesalahan Input Mata Uang (fdJumlah2 terisi valas tapi tidak ada item bervalas)
  isCurrencyInputError: boolean
  currencyInputErrorDetail?: {
    foreignCurr: string
    fdJumlah2: number
    matchedItemName?: string
    correctTotalRp: number
  }
}

const parseQty = (val: any): number | null => {
  if (val === null || val === undefined || val === '') return null
  const n = typeof val === 'number' ? val : parseInt(String(val), 10)
  return isNaN(n) ? null : n
}

const normM3 = (v: number) => (v > 0 && v < 0.1 ? 0.1 : v)

export function useBillingValidation({
  billingData,
  validationData: res,
  transportValidation,
}: UseBillingValidationParams): BillingValidationState {
  // 1. Details urut berdasarkan fdID
  const details = useMemo(() => {
    return [...(billingData?.details || [])].sort((a, b) =>
      String(a?.fdID ?? '').trim().localeCompare(String(b?.fdID ?? '').trim(), undefined, { numeric: true })
    )
  }, [billingData?.details])

  const billType = useMemo(() => getBillType(billingData), [billingData])
  const isAir = Boolean(res?.fdListType === 1 || res?.expectedMode === 'BY AIR')
  const isType2 = Boolean(res?.profileHarga?.typeTagihan === 2)
  const isGabungan = billType === BILL_TYPES.GABUNGAN

  // Type 2 Comparison Check (Single Source of Truth)
  const { data: type2CompareData } = useQuery({
    queryKey: ['type2Compare', billingData?.fdInvNo, billingData?.fdListCode],
    queryFn: async () => {
      if (!billingData?.fdInvNo) return null
      const response = await billingApi.type2CompareCheck({
        invNo: billingData.fdInvNo,
        listCode: billingData.fdListCode || undefined,
        markingCode: billingData.fdMarkingCode || undefined,
      })
      return response.data?.data as any
    },
    enabled: isType2 && !!billingData?.fdInvNo,
    staleTime: 120000,
  })

  const isType2Discrepancy = Boolean(
    isType2 &&
      type2CompareData &&
      (type2CompareData.validationStatus === 'OVERCHARGE' || type2CompareData.validationStatus === 'UNDERCHARGE')
  )
  const isType2Match = Boolean(
    isType2 &&
      (!type2CompareData ||
        type2CompareData.validationStatus === 'VALID' ||
        type2CompareData.validationStatus === 'EQUAL')
  )

  // 2. Metrik Unit & Tagihan
  const unitTotals = useMemo(() => {
    const acc = details.reduce<Record<string, number>>((map, row) => {
      if (isAuxiliaryItem(row.fdItemName, billingData?.fdBranchCode, billingData?.fdInvNo)) return map

      const nameUpper = (row.fdItemName || '').toUpperCase()
      let unit = row.fdListCode?.trim()?.toUpperCase()

      if (isFreightChargeItem(row.fdItemName, row.fdListCode)) {
        const key = !unit || unit === 'FREIGHT CHARGE'
          ? 'FREIGHT CHARGE'
          : `FREIGHT CHARGE (${unit})`
        map[key] = (map[key] || 0) + Number(row.fdQty || 0)
        return map
      }

      if (isVfcItem(row.fdItemName, row.fdListCode)) {
        map['VOLUME FREIGHT CHARGES (KG)'] = (map['VOLUME FREIGHT CHARGES (KG)'] || 0) + Number(row.fdQty || 0)
        return map
      }

      if (!unit) {
        if (nameUpper.includes('(M3)')) unit = 'M3'
        else if (nameUpper.includes('(KG)') || nameUpper.includes('PARCELS TO JAKARTA (KG)')) unit = 'KG'
        else if (nameUpper.includes('(PCS)')) unit = 'PCS'
      }

      if (!unit) return map
      map[unit] = (map[unit] || 0) + Number(row.fdQty || 0)
      return map
    }, {})
    return acc
  }, [details, billingData?.fdBranchCode, billingData?.fdInvNo])

  const { rawM3, rawKg, rawVfc } = useMemo(() => {
    let m3 = 0, kg = 0, vfc = 0
    for (const d of details) {
      if (isAuxiliaryItem(d.fdItemName, billingData?.fdBranchCode, billingData?.fdInvNo)) continue
      if (isVfcItem(d.fdItemName, d.fdListCode)) { vfc += Number(d.fdQty || 0); continue }
      if (isFreightChargeItem(d.fdItemName, d.fdListCode)) continue

      let unit = d.fdListCode?.trim()?.toUpperCase()
      const nameUpper = (d.fdItemName || '').toUpperCase()
      if (!unit && nameUpper.includes('(M3)')) unit = 'M3'
      if (!unit && (nameUpper.includes('(KG)') || nameUpper.includes('PARCELS TO JAKARTA (KG)'))) unit = 'KG'
      if (!unit && nameUpper.includes('(PCS)')) unit = 'PCS'

      const isM3 =
        unit === 'M3' ||
        (unit !== 'KG' && unit !== 'PCS' && nameUpper.includes('(M3)')) ||
        (unit !== 'KG' && unit !== 'PCS' && nameUpper.includes('PARCEL') && !nameUpper.includes('(KG)') && !nameUpper.includes('(PCS)') && !nameUpper.includes('PARCELS TO JAKARTA (KG)'))
      const isKg =
        unit === 'KG' ||
        (unit !== 'M3' && unit !== 'PCS' && (nameUpper.includes('(KG)') || nameUpper.includes('PARCELS TO JAKARTA (KG)')))

      if (isM3) m3 += Number(d.fdQty || 0)
      else if (isKg) kg += Number(d.fdQty || 0)
    }
    return { rawM3: m3, rawKg: kg, rawVfc: vfc }
  }, [details])

  const calcM3 = unitTotals['M3'] ?? rawM3
  const billedM3 = calcM3
  const billedKg = unitTotals['KG'] ?? rawKg
  const billedVfc = unitTotals['VOLUME FREIGHT CHARGES (KG)'] ?? rawVfc

  // 3. Evaluasi Transport / Ekspedisi (tbExpIndo)
  // Aturan Bisnis ERP:
  // fdPaid = 1 -> Harus Tagih (Biaya dibayar kantor, WAJIB ditagihkan ke customer)
  // fdPaid = 2 -> COD (Cash on Delivery / Bayar Tujuan, TIDAK PERLU ditagih ke invoice customer)
  const transportDetailItem = useMemo(() => {
    return details.find((d) => {
      const name = (d?.fdItemName || '').toUpperCase()
      return name.includes('TRANSPORT') || name.includes('DELIVERY') || name.includes('ONGKIR') || name.includes('TRUCKING')
    })
  }, [details])

  const hasTransportItem = billType === BILL_TYPES.TRANSPORT || !!transportDetailItem
  const effectiveTransportAmount = transportDetailItem
    ? (Number(transportDetailItem.fdTotal || 0) > 0 ? Number(transportDetailItem.fdTotal) : Number(transportDetailItem.fdItemPrice || 0))
    : (Number(billingData?.fdJumlah2 || 0) > 0 ? Number(billingData?.fdJumlah2) : Number(billingData?.fdJumlah1 || 0))

  const validExpedisiList = useMemo(() => {
    return (transportValidation?.expedisiList || []).filter((e) => Number(e.fdTotalExp || 0) > 0)
  }, [transportValidation?.expedisiList])

  // Ekspedisi yang WAJIB ditagihkan (fdPaid === 1)
  const mustBillExpedisiList = useMemo(() => {
    return validExpedisiList.filter((e) => e.fdPaid === 1)
  }, [validExpedisiList])

  // Ekspedisi COD (fdPaid === 2) -> dibayar langsung di tujuan, TIDAK PERLU ditagih
  const codExpedisiList = useMemo(() => {
    return validExpedisiList.filter((e) => e.fdPaid === 2)
  }, [validExpedisiList])

  // Unbilled HANYA untuk ekspedisi Harus Tagih (fdPaid === 1) jika invoice belum ada item transport
  const unbilledExpedisiList = !hasTransportItem ? mustBillExpedisiList : []
  const totalUnbilledTransportAmount = useMemo(() => {
    return unbilledExpedisiList.reduce((acc, curr) => acc + Number(curr.fdTotalExp || 0), 0)
  }, [unbilledExpedisiList])
  const hasUnbilledTransport = unbilledExpedisiList.length > 0 && totalUnbilledTransportAmount > 0
  const matchingExpedisi = transportValidation?.matchingExpedisi || null

  // 4. Qty Extraction & Parsing
  const rawUnified = res?.m3PackingList?.raw?.[0] || res?.m3ListBatch?.raw?.[0] || {}
  const qtyList = res?.fdQtyList ?? res?.m3ListBatch?.qty ?? parseQty(rawUnified.fdQtyList ?? rawUnified.qtyList)
  const qtyPL = res?.fdTotalQtyPL ?? res?.m3PackingList?.qty ?? parseQty(rawUnified.fdTotalQtyPL ?? rawUnified.fdTtoalQtyPL ?? rawUnified.fdQtyPL)
  const qtyGudang = res?.fdTotalQtyGudang ?? res?.m3Gudang?.qty ?? parseQty(rawUnified.fdTotalQtyGudang ?? rawUnified.fdQtyGudang)
  const qtyKomplain = res?.fdTotalQtyKomplain ?? res?.m3Komplain?.qty ?? parseQty(rawUnified.fdTotalQtyKomplain ?? rawUnified.fdQtyKomplain)
  const totalEntryKomplain = res?.totalEntryKomplain ?? res?.m3KomplainPerMarking?.totalEntryKomplain ?? parseQty(rawUnified.TotalEntryKomplain ?? rawUnified.totalEntryKomplain ?? rawUnified.fdTotalEntryKomplain)
  const totalEntryList = res?.totalEntryList ?? res?.m3CustPerMarking?.totalEntryList ?? parseQty(rawUnified.TotalEntryList ?? rawUnified.totalEntryList ?? rawUnified.fdTotalEntryList)
  const fdSatuan = (res?.fdSatuan || rawUnified.fdSatuan || rawUnified.Satuan || '').trim()

  const activeQtys = useMemo(() => {
    const list: { key: string; label: string; val: number }[] = []
    if (qtyList !== null) list.push({ key: 'ListBatch', label: 'EntryList', val: qtyList })
    if (qtyPL !== null) list.push({ key: 'PL', label: 'Packing List', val: qtyPL })
    if (qtyGudang !== null) list.push({ key: 'Gudang', label: 'Gudang', val: qtyGudang })
    if (qtyKomplain !== null && qtyKomplain > 0) {
      list.push({ key: 'Komplain', label: 'Komplain', val: qtyKomplain })
    }
    return list
  }, [qtyList, qtyPL, qtyGudang, qtyKomplain])

  const distinctQtyVals = useMemo(() => Array.from(new Set(activeQtys.map((q) => q.val))), [activeQtys])
  const hasQtyMismatch = activeQtys.length > 1 && distinctQtyVals.length > 1
  const isQtyListDiff = hasQtyMismatch && qtyList !== null && activeQtys.some((q) => q.key !== 'ListBatch' && q.val !== qtyList)
  const isQtyPLDiff = hasQtyMismatch && qtyPL !== null && activeQtys.some((q) => q.key !== 'PL' && q.val !== qtyPL)
  const isQtyGudangDiff = hasQtyMismatch && qtyGudang !== null && activeQtys.some((q) => q.key !== 'Gudang' && q.val !== qtyGudang)
  const isQtyKomplainDiff = hasQtyMismatch && qtyKomplain !== null && qtyKomplain > 0 && activeQtys.some((q) => q.key !== 'Komplain' && q.val !== qtyKomplain)

  // 5. Relasi Bill Terkait & Volume/Weight Candidates
  const relatedBills = res?.relatedBillsSummary || null
  const hasRelatedBills = Boolean(relatedBills?.hasRelatedBills)

  // Kasus invoice pecahan anak yang digabung ke invoice induk
  const isChildBillMerged = Boolean(
    !isAir &&
    relatedBills?.isChild &&
    billedM3 === 0 &&
    details.some((d) => (d.fdItemName || '').toUpperCase().startsWith('GABUNG'))
  )

  const beratMarking = (res?.totalBeratPerMarking !== undefined && res?.totalBeratPerMarking !== null && Number(res.totalBeratPerMarking) > 0)
    ? Number(res.totalBeratPerMarking)
    : null
  const beratRelatedBills = (hasRelatedBills && (relatedBills?.sumBerat ?? 0) > 0)
    ? Number(relatedBills!.sumBerat)
    : null
  const beratList = beratRelatedBills !== null
    ? beratRelatedBills
    : (isGabungan && beratMarking !== null
        ? beratMarking
        : (res?.fdBeratList ? Number(res.fdBeratList) : 0))
  const beratKomplain = res?.fdJmlBeratKomplain ? Number(res.fdJmlBeratKomplain) : 0
  const beratSJ = beratRelatedBills !== null
    ? beratRelatedBills
    : (isGabungan
        ? (res?.totalJmlBeratSJ ?? 0)
        : ((res?.fdBeratSJ && res.fdBeratSJ > 0) ? res.fdBeratSJ : (res?.totalJmlBeratSJ ?? 0)))
  const minChargeKg = res?.profileHarga?.minChargeKg && res?.profileHarga.minChargeKg > 0
    ? res.profileHarga.minChargeKg
    : (res?.minChargeKg ?? 3)

  // Evaluasi Perbedaan Berat Fisik (List vs Surat Jalan vs Komplain)
  const activeWeights = useMemo(() => {
    const list: { key: string; label: string; val: number }[] = []
    if (beratList > 0) list.push({ key: 'List', label: hasRelatedBills ? 'Berat Bill Terkait' : isGabungan ? 'Berat List (Marking)' : 'Berat List', val: beratList })
    if (beratSJ > 0) list.push({ key: 'SJ', label: hasRelatedBills ? 'Berat SJ (Terkait)' : isGabungan ? 'Berat SJ (Marking)' : 'Berat Surat Jalan', val: beratSJ })
    if (beratKomplain > 0) list.push({ key: 'Komplain', label: 'Berat Komplain', val: beratKomplain })
    return list
  }, [beratList, beratSJ, beratKomplain, isGabungan, hasRelatedBills])

  const isWeightListDiff = Boolean(
    beratList > 0 && activeWeights.some((w) => w.key !== 'List' && Math.abs(w.val - beratList) > 0.1)
  )
  const isWeightSJDiff = Boolean(
    beratSJ > 0 && activeWeights.some((w) => w.key !== 'SJ' && Math.abs(w.val - beratSJ) > 0.1)
  )
  const isWeightKomplainDiff = Boolean(
    beratKomplain > 0 && activeWeights.some((w) => w.key !== 'Komplain' && Math.abs(w.val - beratKomplain) > 0.1)
  )
  const hasWeightMismatch = Boolean(
    activeWeights.length > 1 && (isWeightListDiff || isWeightSJDiff || isWeightKomplainDiff)
  )

  const plValues = res?.m3PackingList?.values || []
  const gudangValues = res?.m3Gudang?.values || []
  const komplainValues = res?.m3Komplain?.values || []
  const listBatchValues = res?.m3ListBatch?.values || []
  const custMarkingValues = res?.m3CustPerMarking?.values || []
  const komplainPerMarkingValues = res?.m3KomplainPerMarking?.values || []
  const plPerMarkingValues = res?.m3PLPerMarking?.values || []

  // Kandidat By Air
  const airCandidates: CandidateEntry[] = useMemo(() => {
    return [
      ...(beratKomplain > 0 ? [{ sourceKey: 'Komplain', sourceName: 'Berat Komplain', val: beratKomplain, rawVal: beratKomplain }] : []),
      ...(isGabungan && beratSJ > 0 ? [{ sourceKey: 'SJ', sourceName: 'Berat Surat Jalan', val: beratSJ, rawVal: beratSJ }] : []),
      { sourceKey: 'EntryList', sourceName: 'Berat EntryList', val: beratList, rawVal: beratList },
      ...(minChargeKg > 0 ? [{ sourceKey: 'MinCharge', sourceName: `Min. Charge (${minChargeKg} kg)`, val: minChargeKg, rawVal: minChargeKg }] : []),
    ]
  }, [beratKomplain, isGabungan, beratSJ, beratList, minChargeKg])

  // Overweight Hook terpusat (Single Source of Truth)
  const refM3Fallback = komplainValues[0] ?? gudangValues[0] ?? plValues[0] ?? res?.recommendedM3 ?? 0
  const overweight = useOverweightValidation({
    res,
    invoiceDetails: details,
    billedM3,
    billedKg,
    isAir,
    isGabungan,
    refM3Fallback,
    isChildBillMerged,
  })

  const airPrimaryMatch = isAir
    ? airCandidates.find((c) => Math.abs(c.val - overweight.effectiveBilledKg) < 0.01) || null
    : null

  // Kandidat By Sea
  const hasValidPlQty = qtyPL !== null && qtyPL > 0
  const isHybridActive = Boolean(res?.isPartialKomplain && res?.m3KomplainPlusGudang && res.m3KomplainPlusGudang > 0)

  const seaCandidates: CandidateEntry[] = useMemo(() => {
    return [
      ...(hasValidPlQty ? plValues.map((v) => ({ sourceKey: 'PL', sourceName: 'Packing List', val: normM3(v), rawVal: v })) : []),
      ...gudangValues.map((v) => ({ sourceKey: 'Gudang', sourceName: 'Gudang', val: normM3(v), rawVal: v })),
      ...komplainValues.map((v) => ({ sourceKey: 'Komplain', sourceName: 'Komplain', val: normM3(v), rawVal: v })),
      ...custMarkingValues.map((v) => ({ sourceKey: 'GudangPerMarking', sourceName: 'M3 Gudang Per Marking', val: normM3(v), rawVal: v })),
      ...plPerMarkingValues.map((v) => ({ sourceKey: 'PLPerMarking', sourceName: 'Packing List (Per Marking)', val: normM3(v), rawVal: v })),
      ...komplainPerMarkingValues.map((v) => ({ sourceKey: 'KomplainPerMarking', sourceName: 'M3 Komplain Per Marking', val: normM3(v), rawVal: v })),
      ...listBatchValues.map((v) => ({ sourceKey: 'ListBatch', sourceName: 'List Batch', val: normM3(v), rawVal: v })),
      ...(isHybridActive ? [{
        sourceKey: 'KomplainHybrid',
        sourceName: `Komplain Parsial + Gudang (${res?.countKomplainLC ?? 0} LC Komplain + ${res?.countGudangLC ?? 0} LC Gudang)`,
        val: normM3(res!.m3KomplainPlusGudang!),
        rawVal: res!.m3KomplainPlusGudang!,
      }] : []),
      ...(hasRelatedBills && (relatedBills?.sumM3Gudang ?? 0) > 0 ? [{
        sourceKey: 'RelatedBillsGudang',
        sourceName: `M3 Bill Terkait Gudang (${relatedBills!.relatedInvoices.map((i) => i.invNo).join(' + ')})`,
        val: normM3(relatedBills!.sumM3Gudang),
        rawVal: relatedBills!.sumM3Gudang,
      }] : []),
      ...(hasRelatedBills && (relatedBills?.sumM3PL ?? 0) > 0 ? [{
        sourceKey: 'RelatedBillsPL',
        sourceName: `M3 Bill Terkait PL (${relatedBills!.relatedInvoices.map((i) => i.invNo).join(' + ')})`,
        val: normM3(relatedBills!.sumM3PL),
        rawVal: relatedBills!.sumM3PL,
      }] : []),
      ...(hasRelatedBills && (relatedBills?.sumM3Komplain ?? 0) > 0 ? [{
        sourceKey: 'RelatedBillsKomplain',
        sourceName: `M3 Bill Terkait Komplain (${relatedBills!.relatedInvoices.map((i) => i.invNo).join(' + ')})`,
        val: normM3(relatedBills!.sumM3Komplain),
        rawVal: relatedBills!.sumM3Komplain,
      }] : []),
    ]
  }, [hasValidPlQty, plValues, gudangValues, komplainValues, custMarkingValues, plPerMarkingValues, komplainPerMarkingValues, listBatchValues, isHybridActive, res, hasRelatedBills, relatedBills])

  // Komplain logic
  const rawKomplainM3 = isGabungan
    ? (komplainPerMarkingValues[0] ?? komplainValues[0] ?? null)
    : (komplainValues[0] ?? komplainPerMarkingValues[0] ?? null)

  const effectiveQtyKomplain = isGabungan
    ? parseQty(res?.m3KomplainPerMarking?.raw?.[0]?.QtyKomplainPerMarking) ?? qtyKomplain
    : qtyKomplain

  const effectiveQtyList = isGabungan
    ? parseQty(res?.m3KomplainPerMarking?.raw?.[0]?.TotalJmlPackSJ) ?? parseQty(res?.totalEntryList) ?? qtyList
    : qtyList

  const hasKomplainM3 = rawKomplainM3 !== null && rawKomplainM3 > 0
  const isFullKomplainQtyMatch = Boolean(
    hasKomplainM3 &&
    effectiveQtyKomplain !== null &&
    effectiveQtyList !== null &&
    effectiveQtyKomplain > 0 &&
    effectiveQtyKomplain === effectiveQtyList
  )
  const isApprovedKomplainActive = Boolean(res?.hasApprovedKomplain ?? (hasKomplainM3 && isFullKomplainQtyMatch))
  const isKomplainRejected = Boolean(res?.isKomplainRejected ?? (hasKomplainM3 && !isFullKomplainQtyMatch))
  // Target komplain M3: jika pengiriman hybrid (isHybridActive), target gabungannya adalah m3KomplainPlusGudang!
  const targetKomplainM3 = isApprovedKomplainActive
    ? (isHybridActive && res?.m3KomplainPlusGudang
        ? normM3(res.m3KomplainPlusGudang)
        : (rawKomplainM3 !== null ? normM3(rawKomplainM3) : null))
    : null

  const seaPrimaryMatch = !isAir
    ? seaCandidates.find((c) => Math.abs((c.rawVal ?? c.val) - billedM3) < 0.001 || Math.abs(c.val - billedM3) < 0.001) || null
    : null
  const isBilledMatchedApprovedKomplain = !isAir && isApprovedKomplainActive && (
    (rawKomplainM3 !== null && Math.abs(rawKomplainM3 - billedM3) < 0.001) ||
    (targetKomplainM3 !== null && Math.abs(targetKomplainM3 - billedM3) < 0.001)
  )
  const isBilledMismatchedApprovedKomplain = !isAir && isApprovedKomplainActive && targetKomplainM3 !== null && !isBilledMatchedApprovedKomplain && !(isHybridActive && seaPrimaryMatch?.sourceKey === 'KomplainHybrid')
  const isBilledUsingRejectedKomplain = !isAir && isKomplainRejected && rawKomplainM3 !== null && (
    Math.abs(rawKomplainM3 - billedM3) < 0.001 || Math.abs(normM3(rawKomplainM3) - billedM3) < 0.001
  )

  const rawMarkingVal = custMarkingValues.length > 0 ? custMarkingValues[0] : null
  const seaMarkingMatch = !isAir && !seaPrimaryMatch && custMarkingValues.length > 0 && (
    Math.abs(custMarkingValues[0] - billedM3) < 0.001 ||
    Math.abs(normM3(custMarkingValues[0]) - billedM3) < 0.001
  )

  let matchStatus: 'MATCH_PRIMARY' | 'MATCH_MARKING' | 'NO_MATCH' = 'NO_MATCH'
  let matchedSourceName = ''
  let matchLabel = ''
  let isMinChargeApplied = false

  if (isType2) {
    if (!isType2Discrepancy) {
      matchStatus = 'MATCH_PRIMARY'
      matchedSourceName = type2CompareData?.overallWinner
        ? `Compare M3:KG (${type2CompareData.overallWinner})`
        : 'Compare M3:KG'
      matchLabel = 'Compare M3:KG'
    } else {
      matchStatus = 'NO_MATCH'
      matchedSourceName = 'Compare M3:KG'
      matchLabel = 'Selisih Compare M3:KG'
    }
  } else if (isAir) {
    if (airPrimaryMatch) {
      matchStatus = 'MATCH_PRIMARY'
      matchedSourceName = airPrimaryMatch.sourceName
      matchLabel = airPrimaryMatch.sourceName
      isMinChargeApplied = airPrimaryMatch.sourceKey === 'MinCharge'
    } else {
      matchStatus = 'NO_MATCH'
      matchLabel = overweight.effectiveBilledKg === 0 ? 'Tagihan Berat Belum Diisi' : 'Selisih Berat'
    }
  } else {
    if (seaPrimaryMatch) {
      matchStatus = 'MATCH_PRIMARY'
      matchedSourceName = seaPrimaryMatch.sourceName
      isMinChargeApplied = Boolean(
        (seaPrimaryMatch.rawVal ?? 0) > 0 &&
        (seaPrimaryMatch.rawVal ?? 0) < 0.1 &&
        Math.abs(seaPrimaryMatch.val - billedM3) < 0.001 &&
        billedM3 >= 0.1
      )
      if (seaPrimaryMatch.sourceKey === 'RelatedBillsGudang') {
        matchLabel = `M3 Terkait: ${relatedBills?.relatedInvoices?.map((i) => i.invNo).join(' + ') || 'Gudang'}`
      } else if (seaPrimaryMatch.sourceKey === 'RelatedBillsPL') {
        matchLabel = `M3 Terkait PL: ${relatedBills?.relatedInvoices?.map((i) => i.invNo).join(' + ') || 'PL'}`
      } else if (seaPrimaryMatch.sourceKey === 'RelatedBillsKomplain') {
        matchLabel = `M3 Terkait Komplain: ${relatedBills?.relatedInvoices?.map((i) => i.invNo).join(' + ') || 'Komplain'}`
      } else {
        matchLabel = isBilledMatchedApprovedKomplain
          ? (isGabungan ? 'M3 Komplain Per Marking' : 'Ukuran Komplain')
          : seaPrimaryMatch.sourceName
      }
    } else if (isChildBillMerged) {
      matchStatus = 'MATCH_PRIMARY'
      matchedSourceName = `Digabung ke Invoice Induk (${relatedBills?.parentInvNo})`
      matchLabel = `Digabung ke ${relatedBills?.parentInvNo}`
    } else if (seaMarkingMatch) {
      matchStatus = 'MATCH_MARKING'
      matchedSourceName = 'M3 Customer Per Marking'
      matchLabel = 'M3 Per Marking'
      isMinChargeApplied = Boolean(
        (rawMarkingVal ?? 0) > 0 &&
        (rawMarkingVal ?? 0) < 0.1 &&
        Math.abs(normM3(rawMarkingVal ?? 0) - billedM3) < 0.001 &&
        billedM3 >= 0.1
      )
    } else {
      matchStatus = 'NO_MATCH'
      matchLabel = 'Selisih Kubikasi (M3)'
    }
  }

  const isMatch = matchStatus === 'MATCH_PRIMARY' || matchStatus === 'MATCH_MARKING'
  const isRelatedBillsMatch = Boolean(
    isChildBillMerged ||
    (seaPrimaryMatch && seaPrimaryMatch.sourceKey.startsWith('RelatedBills'))
  )
  const isCodOrUrgent = Boolean(res?.isCodOrUrgent)
  const recommendedM3 = res?.recommendedM3 ?? 0
  const isCodUrgentShortfall = !isAir && !isChildBillMerged && isCodOrUrgent && recommendedM3 > billedM3 + 0.001

  // Evaluasi Tagihan di Bawah Minimum Charge M3 (Khusus Pengiriman Laut)
  const effectiveMinChargeM3 = (res?.profileHarga?.minChargeM3 && res.profileHarga.minChargeM3 > 0)
    ? res.profileHarga.minChargeM3
    : (res?.minChargeM3 && res.minChargeM3 > 0 ? res.minChargeM3 : 0.1)

  const isBilledBelowMinM3 = !isAir && !isChildBillMerged && billedM3 > 0 && billedM3 < (effectiveMinChargeM3 - 0.0001)

  // 6. Commodity & Item Pricing Evaluation
  // User Rule: Untuk item baris 1 selalu ikuti tipe comoditi dari tbentrylist
  const entryListTypeId = (res?.entryListTypeComodity !== null && res?.entryListTypeComodity !== undefined && Number(res.entryListTypeComodity) > 0)
    ? Number(res.entryListTypeComodity)
    : (res?.defaultFdTypeComodity !== null && res?.defaultFdTypeComodity !== undefined && Number(res.defaultFdTypeComodity) > 0 ? Number(res.defaultFdTypeComodity) : null)

  const billTypeId = (billingData?.fdTypeComodity !== null && billingData?.fdTypeComodity !== undefined && Number(billingData.fdTypeComodity) > 0)
    ? Number(billingData.fdTypeComodity)
    : null
  const defaultTypeId = entryListTypeId ?? billTypeId ?? res?.markingComodityType ?? null
  const defaultMatchType = res?.comodityTypes?.find(
    (c) => c.fdTypeComodity === defaultTypeId && (res?.fdListType ? c.fdListType === res.fdListType : true)
  )
  const defaultComodityName = res?.entryListComodityName || defaultMatchType?.fdComodityName || (res?.markingComodities?.[0]?.fdComodityName || (defaultTypeId ? `Kategori ${defaultTypeId}` : '—'))

  const evaluatedItems = useMemo(() => {
    if ((!res && (!validExpedisiList || validExpedisiList.length === 0)) || details.length === 0) return []
    return details.map((item, idx) => {
      const evaluation = evaluateItemPrice(item, {
        res,
        isAir,
        defaultTypeId,
        defaultComodityName,
        expedisiList: validExpedisiList,
        branchCode: billingData?.fdBranchCode,
        invNo: billingData?.fdInvNo,
        itemIndex: idx,
        entryListTypeId,
        entryListComodityName: res?.entryListComodityName || defaultMatchType?.fdComodityName,
      })
      return { item, evaluation }
    })
  }, [details, res, isAir, defaultTypeId, defaultComodityName, validExpedisiList, billingData?.fdBranchCode, billingData?.fdInvNo, entryListTypeId, defaultMatchType])

  const underchargedItems = useMemo<UnderchargedItem[]>(() => {
    return evaluatedItems
      .filter(({ evaluation }) => evaluation.statusType === 'LOWER' && !evaluation.isNonValidatedBranchDashFee)
      .map(({ item, evaluation }) => ({
        itemName: item.fdItemName ?? '',
        billedPrice: Number(item.fdItemPrice || 0),
        targetPrice: evaluation.minTargetPrice,
        difference: evaluation.difference,
        priceSource: evaluation.targetColName,
        priceListDisplay: evaluation.priceListDisplay,
      }))
  }, [evaluatedItems])

  const overchargedItems = useMemo<OverchargedItem[]>(() => {
    return evaluatedItems
      .filter(({ evaluation }) => evaluation.statusType === 'HIGHER' && !evaluation.isNonValidatedBranchDashFee)
      .map(({ item, evaluation }) => ({
        itemName: item.fdItemName ?? '',
        billedPrice: Number(item.fdItemPrice || 0),
        targetPrice: evaluation.minTargetPrice,
        difference: evaluation.difference,
        priceSource: evaluation.targetColName,
        priceListDisplay: evaluation.priceListDisplay,
      }))
  }, [evaluatedItems])

  const hasPriceDiscrepancy = underchargedItems.length > 0

  // 7. Overall Verdict
  // Untuk pengiriman laut (!isAir), selisih catatan berat fisik antar dokumen (hasWeightMismatch)
  // TIDAK menggagalkan validasi fisik selama sisa kuota berat >= 0 (tidak overweight).
  // Warning kelebihan berat hanya muncul jika sisa kuota berat < 0 (overweight.isOverweight).
  const isWeightPhysicallyValid = isAir
    ? !hasWeightMismatch
    : (!overweight.isOverweight || overweight.isBilledOverweightMatch)

  const isPhysicalValid = isType2
    ? (!isType2Discrepancy && (!hasWeightMismatch || overweight.isOverweight))
    : Boolean(
        isMatch &&
        !hasQtyMismatch &&
        isWeightPhysicallyValid &&
        !isCodUrgentShortfall &&
        !isBilledMismatchedApprovedKomplain &&
        (!overweight.isOverweight || overweight.isBilledOverweightMatch) &&
        !overweight.isBilledUnneededOverweight
      )

  const isFinancialValid = !hasPriceDiscrepancy && !hasUnbilledTransport

  const validationIssues = useMemo(() => {
    const issues: string[] = []
    if (isType2) {
      if (isType2Discrepancy) {
        issues.push(
          type2CompareData?.validationStatus === 'UNDERCHARGE'
            ? `Tagihan Type 2 lebih rendah dari perhitungan acuan M3 vs KG (Selisih Rp ${Math.abs(type2CompareData?.selisihVsAktual || 0).toLocaleString('id-ID')})`
            : `Tagihan Type 2 lebih tinggi dari perhitungan acuan M3 vs KG (Selisih Rp ${Math.abs(type2CompareData?.selisihVsAktual || 0).toLocaleString('id-ID')})`
        )
      }
    } else {
      if (!isMatch) {
        issues.push(isAir ? 'Berat tagihan tidak sesuai timbangan operasional' : 'Kubikasi tagihan tidak sesuai data operasional')
      }
    }
    if (hasQtyMismatch) {
      issues.push(`Terdapat ketidaksesuaian jumlah koli (Qty) antar tahapan (${activeQtys.map((q) => `${q.label}: ${q.val}`).join(' vs ')})`)
    }
    // Perbedaan berat antar dokumen hanya menjadi issue jika moda udara atau muatan overweight (sisa kuota < 0)
    if (hasWeightMismatch && (isAir || overweight.isOverweight)) {
      issues.push(
        `Terdapat perbedaan berat fisik antar dokumen (${activeWeights.map((w) => `${w.label}: ${w.val.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kg`).join(' vs ')})`
      )
    }
    if (isCodUrgentShortfall) {
      issues.push(`Volume tagihan (${formatDecimal(billedM3, 4)} m³) lebih rendah dari rekomendasi COD/Urgent (${formatDecimal(recommendedM3, 4)} m³ dari Packing List)`)
    }
    if (isBilledMismatchedApprovedKomplain) {
      issues.push(`Ukuran komplain disetujui (${formatDecimal(targetKomplainM3 ?? 0, 4)} m³), namun tagihan tidak mencocokinya (${formatDecimal(billedM3, 4)} m³)`)
    }
    if (!isType2 && overweight.isOverweight && !overweight.isBilledOverweightMatch) {
      issues.push(`Muatan melebihi kuota rasio (+${formatDecimal(overweight.overweightKg, 2)} kg) namun belum ditagihkan`)
    }
    if (!isType2 && overweight.isBilledUnneededOverweight) {
      issues.push(`Muatan tidak overweight (${overweight.actualWeightKg} kg < kuota ${formatDecimal(overweight.maxAllowedWeight, 1)} kg) namun invoice menagihkan item KG`)
    }
    if (hasUnbilledTransport) {
      issues.push(`Ditemukan ${unbilledExpedisiList.length} biaya ekspedisi lokal Harus Tagih (tbExpIndo) yang belum ditagihkan`)
    }
    if (hasPriceDiscrepancy) {
      issues.push(`Terdapat ${underchargedItems.length} item dengan tarif di bawah master (undercharge: ${underchargedItems.map((u) => u.itemName).join(', ')})`)
    }
    if (isBilledBelowMinM3) {
      issues.push(`Volume yang ditagihkan (${formatDecimal(billedM3, 4)} m³) lebih rendah dari batas minimum charge (${formatDecimal(effectiveMinChargeM3, 4)} m³)`)
    }
    return issues
  }, [
    isMatch,
    isAir,
    isType2,
    isType2Discrepancy,
    type2CompareData,
    hasQtyMismatch,
    activeQtys,
    hasWeightMismatch,
    activeWeights,
    isCodUrgentShortfall,
    recommendedM3,
    isBilledMismatchedApprovedKomplain,
    targetKomplainM3,
    overweight,
    hasUnbilledTransport,
    unbilledExpedisiList.length,
    hasPriceDiscrepancy,
    underchargedItems,
    isBilledBelowMinM3,
    billedM3,
    effectiveMinChargeM3,
  ])

  // ── Deteksi Kesalahan Input Mata Uang ──────────────────────────────────────
  // Kondisi: fdJumlah2 > 0 dengan fdCurr1 valas (S$, HK$, US$, dll),
  // namun TIDAK ADA satu pun item detail yang menggunakan satuan/mata uang valas tersebut.
  const isCurrencyInputError = useMemo(() => {
    const rawJumlah2 = Number(billingData?.fdJumlah2 || 0)
    if (rawJumlah2 <= 0) return false
    const foreignCurr = (billingData?.fdCurr1 || '').trim().toUpperCase()
    if (!foreignCurr || foreignCurr === 'RP.' || foreignCurr === 'RPD' || foreignCurr === 'IDR') return false
    const hasMatchingForeignItem = details.some((d) => {
      const listCode = (d.fdListCode || '').trim().toUpperCase()
      const curr = (d.fdCurr || '').trim().toUpperCase()
      if (listCode === foreignCurr || curr === foreignCurr) return true
      if (foreignCurr.includes('S$') && (listCode === 'SGD' || listCode === 'S$' || curr === 'S$' || curr === 'SGD')) return true
      if (foreignCurr.includes('HK$') && (listCode === 'HKD' || listCode === 'HK$' || curr === 'HK$' || curr === 'HKD')) return true
      if (foreignCurr.includes('US$') && (listCode === 'USD' || listCode === 'US$' || curr === 'US$' || curr === 'USD')) return true
      if (foreignCurr === 'USD' && (listCode === 'US$' || curr === 'US$')) return true
      if (foreignCurr === 'SGD' && (listCode === 'S$' || curr === 'S$')) return true
      if (foreignCurr === 'HKD' && (listCode === 'HK$' || curr === 'HK$')) return true
      return false
    })
    return !hasMatchingForeignItem
  }, [billingData?.fdJumlah2, billingData?.fdCurr1, details])

  const currencyInputErrorDetail = useMemo(() => {
    if (!isCurrencyInputError) return undefined
    const rawJumlah2 = Number(billingData?.fdJumlah2 || 0)
    const foreignCurr = (billingData?.fdCurr1 || '').trim()
    const matchedItem = details.find((d) => Math.abs(Number(d.fdTotal || 0) - rawJumlah2) < 1)
    return {
      foreignCurr,
      fdJumlah2: rawJumlah2,
      matchedItemName: matchedItem?.fdItemName ?? undefined,
      correctTotalRp: Number(billingData?.fdJumlah1 || 0) + rawJumlah2,
    }
  }, [isCurrencyInputError, billingData?.fdJumlah2, billingData?.fdCurr1, billingData?.fdJumlah1, details])

  const finalValidationIssues = useMemo(() => {
    if (!isCurrencyInputError || !currencyInputErrorDetail) return validationIssues
    const errMsg = `Kesalahan input mata uang: Header invoice memiliki nilai ${currencyInputErrorDetail.foreignCurr} ${currencyInputErrorDetail.fdJumlah2.toLocaleString('id-ID')} namun tidak ada item yang menggunakan satuan/mata uang tersebut${currencyInputErrorDetail.matchedItemName ? ` (kemungkinan item '${currencyInputErrorDetail.matchedItemName}' salah dimasukkan ke kolom valas)` : ''}.`
    return [...validationIssues, errMsg]
  }, [isCurrencyInputError, currencyInputErrorDetail, validationIssues])

  const finalIsFinancialValid = isFinancialValid && !isCurrencyInputError
  const finalIsOverallValid = isPhysicalValid && finalIsFinancialValid



  return {
    details,
    billType,
    isAir,
    isType2,
    isType2Match,
    isType2Discrepancy,
    type2CompareData,
    isGabungan,

    unitTotals,
    billedM3,
    billedKg,
    billedVfc,

    airCandidates,
    airPrimaryMatch,
    seaCandidates,
    seaPrimaryMatch,
    seaMarkingMatch,
    matchStatus,
    matchedSourceName,
    matchLabel,
    isMatch,
    isMinChargeApplied,
    minChargeM3: effectiveMinChargeM3,
    isBilledBelowMinM3,
    isCodUrgentShortfall,

    relatedBillsSummary: relatedBills,
    isChildBillMerged,
    isRelatedBillsMatch,

    rawKomplainM3,
    targetKomplainM3,
    isApprovedKomplainActive,
    isKomplainRejected,
    isHybridActive,
    isBilledMatchedApprovedKomplain,
    isBilledMismatchedApprovedKomplain,
    isBilledUsingRejectedKomplain,

    qtyList,
    qtyPL,
    qtyGudang,
    qtyKomplain,
    totalEntryKomplain,
    totalEntryList,
    fdSatuan,
    activeQtys,
    hasQtyMismatch,
    isQtyListDiff,
    isQtyPLDiff,
    isQtyGudangDiff,
    isQtyKomplainDiff,

    beratMarking,
    beratList,
    beratSJ,
    beratKomplain,
    activeWeights,
    hasWeightMismatch,
    isWeightListDiff,
    isWeightSJDiff,
    isWeightKomplainDiff,

    overweight,

    transportDetailItem,
    hasTransportItem,
    effectiveTransportAmount,
    validExpedisiList,
    mustBillExpedisiList,
    codExpedisiList,
    unbilledExpedisiList,
    totalUnbilledTransportAmount,
    hasUnbilledTransport,
    matchingExpedisi,

    defaultTypeId,
    defaultComodityName,
    evaluatedItems,
    underchargedItems,
    overchargedItems,
    hasPriceDiscrepancy,

    isPhysicalValid,
    isFinancialValid: finalIsFinancialValid,
    isOverallValid: finalIsOverallValid,
    validationIssues: finalValidationIssues,

    isCurrencyInputError,
    currencyInputErrorDetail,
  }
}
