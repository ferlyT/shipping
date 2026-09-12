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
import type { Billing, BillingDetail } from '../types/billing.types'
import type { M3CheckResponse } from '../components/BillingValidationSummaryModal'

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

  // Kesimpulan / Overall Verdict
  isPhysicalValid: boolean
  isFinancialValid: boolean
  isOverallValid: boolean
  validationIssues: string[]
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
      if (isAuxiliaryItem(row.fdItemName)) return map

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

    // Min-charge enforcement: M3 < 0.1 → round up to 0.1
    if (acc['M3'] !== undefined && acc['M3'] > 0 && acc['M3'] < 0.1) {
      acc['M3'] = 0.1
    }
    return acc
  }, [details])

  const { rawM3, rawKg, rawVfc } = useMemo(() => {
    let m3 = 0, kg = 0, vfc = 0
    for (const d of details) {
      if (isAuxiliaryItem(d.fdItemName)) continue
      if (isVfcItem(d.fdItemName, d.fdListCode)) { vfc += Number(d.fdQty || 0); continue }
      if (isFreightChargeItem(d.fdItemName, d.fdListCode)) continue

      let unit = d.fdListCode?.trim()?.toUpperCase()
      const nameUpper = (d.fdItemName || '').toUpperCase()
      if (!unit && nameUpper.includes('(M3)')) unit = 'M3'
      if (!unit && (nameUpper.includes('(KG)') || nameUpper.includes('PARCELS TO JAKARTA (KG)'))) unit = 'KG'

      const isM3 =
        unit === 'M3' ||
        (unit !== 'KG' && nameUpper.includes('(M3)')) ||
        (unit !== 'KG' && nameUpper.includes('PARCEL') && !nameUpper.includes('(KG)') && !nameUpper.includes('PARCELS TO JAKARTA (KG)'))
      const isKg =
        unit === 'KG' ||
        (unit !== 'M3' && (nameUpper.includes('(KG)') || nameUpper.includes('PARCELS TO JAKARTA (KG)')))

      if (isM3) m3 += Number(d.fdQty || 0)
      else if (isKg) kg += Number(d.fdQty || 0)
    }
    return { rawM3: m3, rawKg: kg, rawVfc: vfc }
  }, [details])

  const calcM3 = unitTotals['M3'] ?? rawM3
  const billedM3 = calcM3 > 0 && calcM3 < 0.1 ? 0.1 : calcM3
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

  // 5. Volume & Weight Candidates
  const beratMarking = (res?.totalBeratPerMarking !== undefined && res?.totalBeratPerMarking !== null && Number(res.totalBeratPerMarking) > 0)
    ? Number(res.totalBeratPerMarking)
    : null
  const beratList = isGabungan && beratMarking !== null
    ? beratMarking
    : (res?.fdBeratList ? Number(res.fdBeratList) : 0)
  const beratKomplain = res?.fdJmlBeratKomplain ? Number(res.fdJmlBeratKomplain) : 0
  const beratSJ = isGabungan
    ? (res?.totalJmlBeratSJ ?? 0)
    : ((res?.fdBeratSJ && res.fdBeratSJ > 0) ? res.fdBeratSJ : (res?.totalJmlBeratSJ ?? 0))
  const minChargeKg = res?.profileHarga?.minChargeKg && res?.profileHarga.minChargeKg > 0
    ? res.profileHarga.minChargeKg
    : (res?.minChargeKg ?? 3)

  // Evaluasi Perbedaan Berat Fisik (List vs Surat Jalan vs Komplain)
  const activeWeights = useMemo(() => {
    const list: { key: string; label: string; val: number }[] = []
    if (beratList > 0) list.push({ key: 'List', label: isGabungan ? 'Berat List (Marking)' : 'Berat List', val: beratList })
    if (beratSJ > 0) list.push({ key: 'SJ', label: isGabungan ? 'Berat SJ (Marking)' : 'Berat Surat Jalan', val: beratSJ })
    if (beratKomplain > 0) list.push({ key: 'Komplain', label: 'Berat Komplain', val: beratKomplain })
    return list
  }, [beratList, beratSJ, beratKomplain, isGabungan])

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
      ...plPerMarkingValues.map((v) => ({ sourceKey: 'PLPerMarking', sourceName: 'Packing List (Per Marking)', val: normM3(v), rawVal: v })),
      ...komplainPerMarkingValues.map((v) => ({ sourceKey: 'KomplainPerMarking', sourceName: 'M3 Komplain Per Marking', val: normM3(v), rawVal: v })),
      ...listBatchValues.map((v) => ({ sourceKey: 'ListBatch', sourceName: 'List Batch', val: normM3(v), rawVal: v })),
      ...(isHybridActive ? [{
        sourceKey: 'KomplainHybrid',
        sourceName: `Komplain Parsial + Gudang (${res?.countKomplainLC ?? 0} LC Komplain + ${res?.countGudangLC ?? 0} LC Gudang)`,
        val: normM3(res!.m3KomplainPlusGudang!),
        rawVal: res!.m3KomplainPlusGudang!,
      }] : []),
    ]
  }, [hasValidPlQty, plValues, gudangValues, komplainValues, plPerMarkingValues, komplainPerMarkingValues, listBatchValues, isHybridActive, res])

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

  const seaPrimaryMatch = !isAir ? seaCandidates.find((c) => Math.abs(c.val - billedM3) < 0.001) || null : null
  const isBilledMatchedApprovedKomplain = !isAir && isApprovedKomplainActive && targetKomplainM3 !== null && Math.abs(targetKomplainM3 - billedM3) < 0.001
  const isBilledMismatchedApprovedKomplain = !isAir && isApprovedKomplainActive && targetKomplainM3 !== null && !isBilledMatchedApprovedKomplain && !(isHybridActive && seaPrimaryMatch?.sourceKey === 'KomplainHybrid')
  const isBilledUsingRejectedKomplain = !isAir && isKomplainRejected && rawKomplainM3 !== null && Math.abs(normM3(rawKomplainM3) - billedM3) < 0.001

  const rawMarkingVal = custMarkingValues.length > 0 ? custMarkingValues[0] : null
  const seaMarkingMatch = !isAir && !seaPrimaryMatch && custMarkingValues.length > 0 && Math.abs(normM3(custMarkingValues[0]) - billedM3) < 0.001

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
      isMinChargeApplied = (seaPrimaryMatch.rawVal ?? 0) > 0 && (seaPrimaryMatch.rawVal ?? 0) < 0.1
      matchLabel = isBilledMatchedApprovedKomplain
        ? (isGabungan ? 'M3 Komplain Per Marking' : 'Ukuran Komplain')
        : seaPrimaryMatch.sourceName
    } else if (seaMarkingMatch) {
      matchStatus = 'MATCH_MARKING'
      matchedSourceName = 'M3 Customer Per Marking'
      matchLabel = 'M3 Per Marking'
      isMinChargeApplied = (rawMarkingVal ?? 0) > 0 && (rawMarkingVal ?? 0) < 0.1
    } else {
      matchStatus = 'NO_MATCH'
      matchLabel = 'Selisih Kubikasi (M3)'
    }
  }

  const isMatch = matchStatus === 'MATCH_PRIMARY' || matchStatus === 'MATCH_MARKING'
  const isCodOrUrgent = Boolean(res?.isCodOrUrgent)
  const recommendedM3 = res?.recommendedM3 ?? 0
  const isCodUrgentShortfall = !isAir && isCodOrUrgent && recommendedM3 > billedM3 + 0.001

  // 6. Commodity & Item Pricing Evaluation
  const defaultTypeId = billingData?.fdTypeComodity ?? res?.defaultFdTypeComodity ?? res?.markingComodityType ?? null
  const defaultMatchType = res?.comodityTypes?.find(
    (c) => c.fdTypeComodity === defaultTypeId && (res?.fdListType ? c.fdListType === res.fdListType : true)
  )
  const defaultComodityName = defaultMatchType
    ? defaultMatchType.fdComodityName
    : (res?.markingComodities?.[0]?.fdComodityName || (defaultTypeId ? `Kategori ${defaultTypeId}` : '—'))

  const evaluatedItems = useMemo(() => {
    if ((!res && (!validExpedisiList || validExpedisiList.length === 0)) || details.length === 0) return []
    return details.map((item) => {
      const evaluation = evaluateItemPrice(item, {
        res,
        isAir,
        defaultTypeId,
        defaultComodityName,
        expedisiList: validExpedisiList,
      })
      return { item, evaluation }
    })
  }, [details, res, isAir, defaultTypeId, defaultComodityName, validExpedisiList])

  const underchargedItems = useMemo<UnderchargedItem[]>(() => {
    return evaluatedItems
      .filter(({ evaluation }) => evaluation.statusType === 'LOWER')
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
      .filter(({ evaluation }) => evaluation.statusType === 'HIGHER')
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
  const isPhysicalValid = isType2
    ? (!isType2Discrepancy && !hasWeightMismatch)
    : Boolean(
        isMatch &&
        !hasQtyMismatch &&
        !hasWeightMismatch &&
        !isCodUrgentShortfall &&
        !isBilledMismatchedApprovedKomplain &&
        (!overweight.isOverweight || overweight.isBilledOverweightMatch) &&
        !overweight.isBilledUnneededOverweight
      )

  const isFinancialValid = !hasPriceDiscrepancy && !hasUnbilledTransport
  const isOverallValid = isPhysicalValid && isFinancialValid

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
      issues.push('Terdapat ketidaksesuaian jumlah koli (Qty) antar tahapan')
    }
    if (hasWeightMismatch) {
      issues.push(
        `Terdapat perbedaan berat fisik antar dokumen (${activeWeights.map((w) => `${w.label}: ${w.val.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kg`).join(' vs ')})`
      )
    }
    if (isCodUrgentShortfall) {
      issues.push('Tagihan M3 lebih rendah dari rekomendasi COD/Urgent')
    }
    if (isBilledMismatchedApprovedKomplain) {
      issues.push('Ukuran komplain disetujui, namun tagihan tidak mencocokinya')
    }
    if (!isType2 && overweight.isOverweight && !overweight.isBilledOverweightMatch) {
      issues.push(`Muatan melebihi kuota rasio (+${overweight.overweightKg} kg) namun belum ditagihkan`)
    }
    if (!isType2 && overweight.isBilledUnneededOverweight) {
      issues.push('Muatan tidak overweight namun invoice menagihkan item KG')
    }
    if (hasUnbilledTransport) {
      issues.push(`Ditemukan ${unbilledExpedisiList.length} biaya ekspedisi lokal Harus Tagih (tbExpIndo) yang belum ditagihkan`)
    }
    if (hasPriceDiscrepancy) {
      issues.push(`Terdapat ${underchargedItems.length} item dengan tarif di bawah master (undercharge)`)
    }
    return issues
  }, [
    isMatch,
    isAir,
    isType2,
    isType2Discrepancy,
    type2CompareData,
    hasQtyMismatch,
    hasWeightMismatch,
    activeWeights,
    isCodUrgentShortfall,
    isBilledMismatchedApprovedKomplain,
    overweight,
    hasUnbilledTransport,
    unbilledExpedisiList.length,
    hasPriceDiscrepancy,
    underchargedItems.length,
  ])

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
    isCodUrgentShortfall,

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
    isFinancialValid,
    isOverallValid,
    validationIssues,
  }
}
