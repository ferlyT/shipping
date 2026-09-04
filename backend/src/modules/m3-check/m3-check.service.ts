import { prisma } from '../../config/database'
import { logger } from '../../config/logger'
import { safeRunRaw } from '../../utils/db'
import { lookupPriceList } from '../price-list/price-list-lookup.service'
import { lookupCustomerPriceList } from '../customer-price-list/customer-price-list.service'
import { getCustomerTariffsWithAudit } from '../price-check/price-check.service'
import type {
  UnifiedM3CheckResult,
  ProfileHargaItem,
  MarkingDetailItem,
  ComodityTypeOption,
} from './m3-check.types'

/**
 * Helper untuk memeriksa apakah kode adalah format 5-8 digit list code
 */
export const is7DigitListCode = (c?: string | null): boolean => !!c && /^\d{5,8}$/.test(c.trim())

/**
 * Parser nilai desimal M3
 */
export const parseM3Val = (val: any): number | null => {
  if (val === null || val === undefined) return null
  const num = typeof val === 'number' ? val : parseFloat(String(val || 0))
  return isNaN(num) ? null : parseFloat(num.toFixed(4))
}

/**
 * Parser nilai integer Qty
 */
export const parseQtyVal = (val: any): number | null => {
  if (val === null || val === undefined || val === '') return null
  const num = typeof val === 'number' ? val : parseInt(String(val), 10)
  return isNaN(num) ? null : num
}

/**
 * Evaluasi Cek M3 / Volume secara mendalam.
 * Merupakan Single Source of Truth yang dapat dipanggil dari mana saja:
 * - Billing Validation Modal (BillingValidationCard / BillingValidationSummaryModal)
 * - M3 Check Standalone Endpoint (/api/m3-check/:listCode)
 * - Fitur Surat Jalan / DO / Warehouse / Shipment lainnya
 */
export async function evaluateM3Check(identifier: string): Promise<UnifiedM3CheckResult> {
  const cleanIdentifier = (identifier || '').trim()
  if (!cleanIdentifier) {
    throw new Error('Parameter identifier (listCode/invNo/markingCode) wajib diisi')
  }

  // 1. Resolve listCode, custCode, dan markingCode dari tbBilling atau tbEntryList
  let resolvedListCode = cleanIdentifier
  let resolvedCustCode = ''
  let resolvedMarkingCode = ''
  let resolvedListType: number | null = null
  let resolvedBranchCode: string | null = null
  let resolvedBranchName: string | null = null
  let custBlocked = 0
  let custBroker = 0
  let custName = ''
  let custSalesNM = ''

  // Coba cari di tbBilling terlebih dahulu
  const billingInfo = await safeRunRaw(async () => {
    return prisma.tbBilling.findFirst({
      where: {
        OR: [
          { fdListCode: cleanIdentifier },
          { fdInvNo: cleanIdentifier },
          { fdMarkingCode: cleanIdentifier },
        ],
      },
      select: {
        fdInvNo: true,
        fdListCode: true,
        fdMarkingCode: true,
        fdCustCode: true,
        fdListType: true,
        fdBranchCode: true,
        customer: { select: { fdCustCode: true, fdCustName: true, fdBlocked: true, fdSalesNM: true, fdBroker: true } },
      },
    })
  }, 'billingInfo')

  if (billingInfo) {
    if (billingInfo.fdMarkingCode?.trim()) resolvedMarkingCode = billingInfo.fdMarkingCode.trim()
    if (billingInfo.fdCustCode?.trim()) resolvedCustCode = billingInfo.fdCustCode.trim()
    if (billingInfo.fdListType !== null && billingInfo.fdListType !== undefined) {
      resolvedListType = Number(billingInfo.fdListType)
    }
    if (billingInfo.fdBranchCode?.trim()) resolvedBranchCode = billingInfo.fdBranchCode.trim()
    if (billingInfo.customer) {
      custName = billingInfo.customer.fdCustName?.trim() || ''
      custBlocked = billingInfo.customer.fdBlocked ?? 0
      custBroker = billingInfo.customer.fdBroker ?? 0
      custSalesNM = billingInfo.customer.fdSalesNM?.trim() || ''
    }

    if (is7DigitListCode(billingInfo.fdListCode)) {
      resolvedListCode = billingInfo.fdListCode!.trim()
    } else {
      // Cari candidate entries di tbEntryList
      const batchCode = resolvedMarkingCode.split(';')[0]?.trim() || ''
      const markingPart = resolvedMarkingCode.split(';')[1]?.trim() || ''

      const invDigitsMatch = billingInfo.fdInvNo.trim().match(/(\d{5,6})/)
      const invNum = invDigitsMatch?.[1] || ''
      const invTail = invNum.length === 6 ? invNum.slice(1) : invNum

      const entries = await safeRunRaw(async () => {
        let sql = `
          SELECT fdListCode, fdMarkingCode, fdMarkingNo, fdCustCode, fdJmlPack, fdSatuan, fdJmlBerat, fdM3, fdInvoiceNo
          FROM tbEntryList WITH (NOLOCK)
          WHERE 1=0
        `
        if (resolvedCustCode && batchCode) {
          sql += ` OR (fdCustCode = '${resolvedCustCode}' AND fdMarkingCode = '${batchCode}')`
        }
        if (billingInfo.fdInvNo) {
          sql += ` OR (fdInvoiceNo = '${billingInfo.fdInvNo}')`
        }
        if (resolvedCustCode && invTail) {
          sql += ` OR (fdCustCode = '${resolvedCustCode}' AND fdInvoiceNo LIKE '%${invTail}%')`
        }
        return prisma.$queryRawUnsafe<any[]>(sql)
      }, 'find_candidate_entries')

      if (Array.isArray(entries) && entries.length > 0) {
        const exactMarkingMatch = markingPart
          ? entries.find((e) => e.fdMarkingNo?.trim().toUpperCase().includes(markingPart.toUpperCase()))
          : null

        const chosenEntry = exactMarkingMatch || entries[0]
        resolvedListCode = chosenEntry.fdListCode.trim()
      }
    }
  } else {
    // Cari di tbEntryList
    const entryInfo = await safeRunRaw(async () => {
      const entry = await prisma.tbEntryList.findUnique({
        where: { fdListCode: cleanIdentifier },
        select: {
          fdListCode: true,
          fdListType: true,
          fdMarkingCode: true,
          deliveries: {
            select: {
              fdCustCode: true,
            },
            take: 1,
          },
        },
      })
      if (!entry) return null

      let custData: { fdCustCode: string; fdCustName: string | null; fdBlocked: number; fdSalesNM: string | null; fdBroker: number } | null = null
      const dCustCode = entry.deliveries?.[0]?.fdCustCode?.trim()
      if (dCustCode) {
        const foundCust = await prisma.tbCustomers.findUnique({
          where: { fdCustCode: dCustCode },
          select: { fdCustCode: true, fdCustName: true, fdBlocked: true, fdSalesNM: true, fdBroker: true },
        })
        if (foundCust) {
          custData = {
            fdCustCode: foundCust.fdCustCode,
            fdCustName: foundCust.fdCustName,
            fdBlocked: foundCust.fdBlocked ?? 0,
            fdSalesNM: foundCust.fdSalesNM?.trim() || null,
            fdBroker: foundCust.fdBroker ?? 0,
          }
        }
      }

      return {
        fdListCode: entry.fdListCode,
        fdListType: entry.fdListType,
        fdMarkingCode: entry.fdMarkingCode,
        customer: custData,
      }
    }, 'entryInfo')

    if (entryInfo && entryInfo.fdListCode) {
      resolvedListCode = entryInfo.fdListCode.trim()
      if (entryInfo.fdListType !== null && entryInfo.fdListType !== undefined) {
        resolvedListType = Number(entryInfo.fdListType)
      }
      if (entryInfo.fdMarkingCode?.trim()) resolvedMarkingCode = entryInfo.fdMarkingCode.trim()
      if (entryInfo.customer) {
        resolvedCustCode = entryInfo.customer.fdCustCode.trim()
        custName = entryInfo.customer.fdCustName?.trim() || ''
        custBlocked = entryInfo.customer.fdBlocked ?? 0
        custBroker = entryInfo.customer.fdBroker ?? 0
        custSalesNM = entryInfo.customer.fdSalesNM?.trim() || ''
      }
    }
  }

  // Ambil informasi cabang dan marking
  const markingBranch = await safeRunRaw(async () => {
    if (!resolvedListCode && !resolvedMarkingCode) return null
    const res = await prisma.$queryRaw<any[]>`
      SELECT TOP 1
        el.fdListType,
        el.fdTypeComodity,
        el.fdSatuan,
        m.fdBranchCode,
        cb.fdBranchName
      FROM tbEntryList el WITH (NOLOCK)
      LEFT JOIN tbMarking m WITH (NOLOCK) ON m.fdMarkingCode = el.fdMarkingCode
      LEFT JOIN tbCabang cb WITH (NOLOCK) ON cb.fdBranchCode = m.fdBranchCode
      WHERE el.fdListCode = ${resolvedListCode}
         OR el.fdMarkingCode = ${resolvedMarkingCode}
    `
    return res && res.length > 0 ? res[0] : null
  }, 'markingBranch')

  if (markingBranch) {
    if (resolvedListType === null && markingBranch.fdListType !== null && markingBranch.fdListType !== undefined) {
      resolvedListType = Number(markingBranch.fdListType)
    }
    if (markingBranch.fdBranchCode) {
      resolvedBranchCode = String(markingBranch.fdBranchCode).trim()
    }
    if (markingBranch.fdBranchName) {
      resolvedBranchName = String(markingBranch.fdBranchName).trim()
    }
  }

  let expectedMode: string | null = null
  if (resolvedListType === 1) expectedMode = 'BY AIR'
  else if (resolvedListType === 2) expectedMode = 'BY SEA'

  let expectedBranch: string | null = null
  const bCombined = `${resolvedBranchName || ''} ${resolvedBranchCode || ''}`.toUpperCase()
  if (bCombined.includes('GZ') || bCombined.includes('GUANGZHOU')) expectedBranch = 'GZ'
  else if (bCombined.includes('HK') || bCombined.includes('HONGKONG')) expectedBranch = 'HK'
  else if (bCombined.includes('SG') || bCombined.includes('SINGAPORE')) expectedBranch = 'SG'
  else if (bCombined.includes('SH') || bCombined.includes('SHANGHAI')) expectedBranch = 'SH'
  else if (bCombined.includes('YW') || bCombined.includes('YIWU')) expectedBranch = 'YW'
  else if (resolvedBranchCode?.trim()) expectedBranch = resolvedBranchCode.trim().toUpperCase()

  const cleanBatchCode = resolvedMarkingCode.split(';')[0]?.trim() || resolvedMarkingCode

  // 2. Eksekusi query pengecekan M3 & SP secara paralel
  const [unifiedM3Rows, m3CustRows, profileHargaRows, markingComodityRows, beratGudangRows, freightChargeRows] = await Promise.all([
    // A. Unified M3 SP: exec get_m3_listcode
    safeRunRaw(async () => {
      if (!is7DigitListCode(resolvedListCode)) return []
      return prisma.$queryRaw<any[]>`EXEC get_m3_listcode ${resolvedListCode}`
    }, 'get_m3_listcode'),
    // B. M3 Customer per Marking: exec get_m3_customer_permarking @fdCustCode, @fdMarkingCode
    safeRunRaw(async () => {
      if (!resolvedCustCode || !cleanBatchCode) return []
      return prisma.$queryRaw<any[]>`EXEC get_m3_customer_permarking ${resolvedCustCode}, ${cleanBatchCode}`
    }, 'get_m3_customer_permarking'),
    // C. Customer Profile Harga SP: exec get_profile_harga_dari_listcode @fdListCode
    safeRunRaw(async () => {
      if (!resolvedListCode) return []
      return prisma.$queryRaw<any[]>`EXEC dbo.get_profile_harga_dari_listcode @fdListCode = ${resolvedListCode}`
    }, 'get_profile_harga_dari_listcode'),
    // D. Marking Commodity Type dari qr_tbm3_perMarking_rev1
    safeRunRaw(async () => {
      if (!resolvedCustCode || !cleanBatchCode) return []
      return prisma.$queryRaw<any[]>`EXEC dbo.get_qr_tbm3_perMarking_plus_rasio @fdCustCode = ${resolvedCustCode}, @fdMarkingCode = ${cleanBatchCode}`
    }, 'get_qr_tbm3_perMarking_plus_rasio'),
    // E. Berat Gudang dari tbEntryListGudang
    safeRunRaw(async () => {
      if (!resolvedListCode) return []
      return prisma.$queryRaw<any[]>`
        SELECT TOP 1 fdJmlBerat FROM tbEntryListGudang WITH (NOLOCK) WHERE fdListCode = ${resolvedListCode}
      `
    }, 'get_berat_gudang'),
    // F. Freight Charge Summary dari tbEntrylist
    safeRunRaw(async () => {
      if (!resolvedCustCode && !cleanBatchCode && !resolvedListCode) return []
      return prisma.$queryRaw<any[]>`
        SELECT 
          CAST(COALESCE(SUM(fdFc), 0) as float) as totalFc,
          COUNT(CASE WHEN COALESCE(fdFc, 0) > 0 THEN 1 END) as listsWithFcCount,
          MAX(RTRIM(fdCurrFc)) as currency
        FROM tbEntrylist WITH (NOLOCK)
        WHERE (${resolvedCustCode ? true : false} = 0 OR RTRIM(fdCustCode) = ${resolvedCustCode})
          AND (${cleanBatchCode ? true : false} = 0 OR RTRIM(fdMarkingCode) = ${cleanBatchCode})
      `
    }, 'get_freight_charge_summary'),
  ])

  const profileHargaRow = Array.isArray(profileHargaRows) && profileHargaRows.length > 0 ? profileHargaRows[0] : null
  const profileHarga: ProfileHargaItem | null = profileHargaRow
    ? {
        fdListCode: profileHargaRow.fdListCode,
        fdCustCode: profileHargaRow.fdCustCode,
        harga: Number(profileHargaRow.Harga || 0),
        rasio: Number(profileHargaRow.Rasio || 0),
        typeTagihan: Number(profileHargaRow.fdTypeTagihan || 0),
        kg: Number(profileHargaRow.Kg || 0),
        taxReturnPrice: Number(profileHargaRow.fdTaxReturnPrice || 0),
        taxReturnMinCharge: Number(profileHargaRow.fdTaxReturnMinCharge || 0),
        minChargeM3: Number(profileHargaRow.MinChargeM3 ?? profileHargaRow.minChargeM3 ?? 0),
        minChargeKg: Number(profileHargaRow.MinChargeKG ?? profileHargaRow.MinChargeKg ?? profileHargaRow.minChargeKg ?? 0),
      }
    : null

  const unifiedRow = Array.isArray(unifiedM3Rows) && unifiedM3Rows.length > 0 ? unifiedM3Rows[0] : null
  const markingComodityRow = Array.isArray(markingComodityRows) && markingComodityRows.length > 0 ? markingComodityRows[0] : null
  const rawFirstType = markingComodityRow?.fdTypeComodity ?? markingComodityRow?.TypeComodity ?? markingComodityRow?.fdTipe ?? markingComodityRow?.Tipe
  const markingComodityType: number | null = rawFirstType !== undefined && rawFirstType !== null && !isNaN(Number(rawFirstType)) ? Number(rawFirstType) : null

  const markingComodities = Array.isArray(markingComodityRows)
    ? markingComodityRows.map((r) => {
        const rawType = r.fdTypeComodity ?? r.TypeComodity ?? r.fdTipe ?? r.Tipe
        const rawComodity = r.fdComodity ?? r.Comodity ?? r.fdCommodity ?? r.Commodity ?? r.fdDescr ?? r.Descr
        const rawComodityName = r.fdComodityName ?? r.ComodityName ?? r.Tipe ?? r.fdTipe
        return {
          fdTypeComodity: rawType !== null && rawType !== undefined && !isNaN(Number(rawType)) ? Number(rawType) : null,
          fdComodity: rawComodity ? String(rawComodity).trim() : null,
          fdComodityName: rawComodityName ? String(rawComodityName).trim() : null,
        }
      })
    : []

  const m3PL = parseM3Val(unifiedRow?.fdM3PL)
  const m3Gudang = parseM3Val(unifiedRow?.fdM3Gudang)
  const m3Komplain = parseM3Val(unifiedRow?.fdM3Komplain)
  const m3List = parseM3Val(unifiedRow?.fdM3List)
  const m3KomplainPerMarking = parseM3Val(unifiedRow?.M3KomplainPerMarking)
  const m3CustPerMarking = parseM3Val(unifiedRow?.M3GudangPerMarking)
  let m3PLPerMarking = parseM3Val(
    unifiedRow?.fdM3PLPerMarking ??
    unifiedRow?.M3PLPerMarking ??
    unifiedRow?.fdM3PL_PerMarking ??
    unifiedRow?.M3PL_PerMarking
  )

  const qtyList = parseQtyVal(unifiedRow?.fdQtyList ?? unifiedRow?.qtyList)
  const qtyPL = parseQtyVal(unifiedRow?.fdTotalQtyPL ?? unifiedRow?.fdTtoalQtyPL ?? unifiedRow?.fdQtyPL ?? unifiedRow?.totalQtyPL)
  const qtyGudang = parseQtyVal(unifiedRow?.fdTotalQtyGudang ?? unifiedRow?.fdQtyGudang ?? unifiedRow?.totalQtyGudang)
  const qtyKomplain = parseQtyVal(unifiedRow?.fdTotalQtyKomplain ?? unifiedRow?.fdQtyKomplain ?? unifiedRow?.totalQtyKomplain)
  const totalEntryKomplain = parseQtyVal(unifiedRow?.TotalEntryKomplain ?? unifiedRow?.totalEntryKomplain ?? unifiedRow?.fdTotalEntryKomplain)
  const totalEntryList = parseQtyVal(unifiedRow?.TotalEntryList ?? unifiedRow?.totalEntryList ?? unifiedRow?.fdTotalEntryList)
  const fdSatuan = (unifiedRow?.fdSatuan || unifiedRow?.Satuan || markingBranch?.fdSatuan || '') ? String(unifiedRow?.fdSatuan || unifiedRow?.Satuan || markingBranch?.fdSatuan || '').trim() : null

  // Kalkulasi M3 Hybrid (Komplain Parsial + Gudang Non-Komplain)
  let m3KomplainPlusGudang: number | null = null
  let countKomplainLC = 0
  let countGudangLC = 0

  const detailRows = Array.isArray(markingComodityRows) && markingComodityRows.length > 0
    ? markingComodityRows
    : Array.isArray(m3CustRows) && m3CustRows.length > 0
      ? m3CustRows
      : []

  let sumWeightPerMarking = 0
  let hasWeightPerMarking = false
  if (detailRows.length > 0) {
    let sumHybrid = 0
    let sumPL = 0
    let hasValidPL = false
    for (const r of detailRows) {
      const m3K = parseM3Val(r.fdM3Komplain ?? r.fdm3Komplain ?? r['M3 K'] ?? r['M3_K'])
      const m3G = parseM3Val(r.fdM3 ?? r['M3'] ?? r.m3_gdg)
      const plV = parseM3Val(r.fdM3PackingList ?? r.fdM3PL ?? r['M3 PL'] ?? r['M3_PL'] ?? r.m3_pl ?? r.fdm3PL)
      const wK = parseM3Val(r.fdJmlBeratKomplain)
      const wSJ = parseM3Val(r.fdTotalBeratSJ)
      const wGdg = parseM3Val(r.fdJmlBerat ?? r.berat ?? r.Berat)
      const w = (wK !== null && wK > 0) ? wK : ((wSJ !== null && wSJ > 0) ? wSJ : (wGdg ?? 0))

      if (m3K !== null && m3K > 0) {
        sumHybrid += m3K
        countKomplainLC++
      } else if (m3G !== null && m3G > 0) {
        sumHybrid += m3G
        countGudangLC++
      }

      if (plV !== null && plV > 0) {
        sumPL += plV
        hasValidPL = true
      }

      if (w !== null && w > 0) {
        sumWeightPerMarking += w
        hasWeightPerMarking = true
      }
    }
    m3KomplainPlusGudang = parseFloat(sumHybrid.toFixed(4))
    if (m3PLPerMarking === null && hasValidPL) {
      m3PLPerMarking = parseFloat(sumPL.toFixed(4))
    }
  }
  const totalBeratPerMarking = hasWeightPerMarking ? parseFloat(sumWeightPerMarking.toFixed(2)) : null

  if (m3PLPerMarking === null && m3PL !== null) {
    m3PLPerMarking = m3PL
  }

  const isPartialKomplain =
    Boolean(totalEntryKomplain !== null &&
    totalEntryList !== null &&
    totalEntryKomplain > 0 &&
    totalEntryKomplain < totalEntryList)

  const plValues = m3PL !== null ? [m3PL] : []
  const gudangValues = m3Gudang !== null ? [m3Gudang] : []
  const komplainValues = m3Komplain !== null ? [m3Komplain] : []
  const komplainPerMarkingValues = m3KomplainPerMarking !== null ? [m3KomplainPerMarking] : []
  const custValues = m3CustPerMarking !== null ? [m3CustPerMarking] : []
  const plPerMarkingValues = m3PLPerMarking !== null ? [m3PLPerMarking] : []

  const normM3 = (v: number) => (v > 0 && v < 0.1 ? 0.1 : v)
  const normPlValues = plValues.map(normM3)
  const normGudangValues = gudangValues.map(normM3)
  const normCustValues = custValues.map(normM3)
  const normKomplainValues = komplainValues.map(normM3)
  const normKomplainPerMarkingValues = komplainPerMarkingValues.map(normM3)
  const normPlPerMarkingValues = plPerMarkingValues.map(normM3)
  const normM3List = m3List !== null ? normM3(m3List) : null
  const normHybridValues = m3KomplainPlusGudang !== null && m3KomplainPlusGudang > 0 ? [normM3(m3KomplainPlusGudang)] : []

  const hasValidPlQty = qtyPL !== null && qtyPL > 0
  const validNormPlValues = hasValidPlQty ? normPlValues : []
  const validNormPlPerMarkingValues = hasValidPlQty ? normPlPerMarkingValues : []

  const hasPlValue = m3PL !== null && m3PL > 0 && hasValidPlQty
  const allM3Values = [
    ...validNormPlValues,
    ...normGudangValues,
    ...normCustValues,
    ...normKomplainValues,
    ...normKomplainPerMarkingValues,
    ...validNormPlPerMarkingValues,
    ...normHybridValues,
  ]
  if (!hasPlValue && normM3List !== null && normM3List > 0) {
    allM3Values.push(normM3List)
  }
  const maxM3 = allM3Values.length > 0 ? parseFloat(Math.max(...allM3Values).toFixed(4)) : 0

  // Pengecekan Ukuran Komplain & Kesesuaian Qty
  // Aturan Mutlak: Jika isFullKomplainQtyMatch = false, maka ukuran komplain TIDAK BISA DITERIMA
  const rawKomplainM3 = normKomplainValues[0] ?? normKomplainPerMarkingValues[0] ?? null
  const hasKomplainM3 = rawKomplainM3 !== null && rawKomplainM3 > 0
  const isFullKomplainQtyMatch = Boolean(
    hasKomplainM3 &&
    qtyKomplain !== null &&
    qtyList !== null &&
    qtyKomplain > 0 &&
    qtyKomplain === qtyList
  )

  // Komplain hanya disetujui jika qty sama persis (Full Komplain Qty Match)
  const hasApprovedKomplain = isFullKomplainQtyMatch
  const isKomplainRejected = hasKomplainM3 && !isFullKomplainQtyMatch
  const komplainRejectedReason = isKomplainRejected
    ? `Ukuran komplain tidak dapat diterima karena Qty komplain (${qtyKomplain ?? 0} coly) tidak sama dengan Qty EntryList (${qtyList ?? 0} coly)`
    : null

  const isCodOrUrgent = custBlocked === 2 || custBlocked === 5
  
  let rawRec: number
  let recommendedM3Source: 'KOMPLAIN' | 'MAX' | 'GUDANG' | 'PL'
  if (hasApprovedKomplain) {
    rawRec = rawKomplainM3!
    recommendedM3Source = 'KOMPLAIN'
  } else if (isCodOrUrgent) {
    rawRec = maxM3
    recommendedM3Source = 'MAX'
  } else if (normGudangValues[0] !== undefined) {
    rawRec = normGudangValues[0]
    recommendedM3Source = 'GUDANG'
  } else if (hasValidPlQty && normPlValues[0] !== undefined) {
    rawRec = normPlValues[0]
    recommendedM3Source = 'PL'
  } else {
    rawRec = maxM3
    recommendedM3Source = 'MAX'
  }

  const recommendedM3 = parseFloat(Number(rawRec || 0).toFixed(4))

  // Ambil fdTglAgent dari tbEntryList / vwShipment
  const tglAgentRes = await safeRunRaw(async () => {
    const r1 = await prisma.$queryRaw<any[]>`
      SELECT TOP 1 fdTglAgent FROM tbEntryList WITH (NOLOCK) WHERE fdListCode = ${resolvedListCode}
    `
    if (r1 && r1.length > 0 && r1[0].fdTglAgent) return r1[0].fdTglAgent
    const r2 = await prisma.$queryRaw<any[]>`
      SELECT TOP 1 fdTglAgent FROM vwShipment WITH (NOLOCK) WHERE fdListCode = ${resolvedListCode}
    `
    if (r2 && r2.length > 0 && r2[0].fdTglAgent) return r2[0].fdTglAgent
    return null
  }, 'get_tgl_agent')

  const agentDate = tglAgentRes ? new Date(tglAgentRes) : null

  // Ambil Master Price List untuk referensi harga modal
  let masterPriceListItems: any[] = []
  let priceEffectiveDate: string | null = null

  const generalLookup = await lookupPriceList(agentDate || new Date(), {
    mode: expectedMode || undefined,
    branch: expectedBranch || undefined,
    markingCode: resolvedMarkingCode || undefined,
  })

  if (generalLookup.found && generalLookup.uploadInfo) {
    priceEffectiveDate = generalLookup.uploadInfo.effectiveDate
      ? new Date(generalLookup.uploadInfo.effectiveDate).toISOString()
      : null
    masterPriceListItems = generalLookup.items.map((it) => ({
      id: it.id,
      sheetType: it.sheetType,
      mode: it.mode,
      branch: it.branch,
      category: it.category,
      price: Number(it.price),
      isCustomerPrice: false,
    }))
  }

  // Ambil Customer Price List jika ada
  let customerPriceListItems: any[] = []
  let customerPriceEffectiveDate: string | null = null
  let hasCustomerPriceList = false
  let custLookupResult: any = null

  if (resolvedCustCode) {
    const refDate = (priceEffectiveDate ? new Date(priceEffectiveDate) : agentDate) || new Date()
    const custLookup = await lookupCustomerPriceList(resolvedCustCode, refDate, {
      mode: expectedMode || undefined,
      branch: expectedBranch || undefined,
      markingCode: resolvedMarkingCode || undefined,
    })
    custLookupResult = custLookup

    if (custLookup.found && custLookup.items.length > 0) {
      hasCustomerPriceList = true
      customerPriceEffectiveDate = custLookup.uploadInfo?.effectiveDate
        ? new Date(custLookup.uploadInfo.effectiveDate).toISOString()
        : null
      customerPriceListItems = custLookup.items.map((it) => ({
        id: it.id,
        sheetType: 'CUSTOMER',
        mode: it.mode,
        branch: it.branch,
        category: it.category,
        price: Number(it.price),
        isCustomerPrice: true,
      }))
    }

    // Jika tidak ada upload Excel customer, periksa tarif khusus customer di ERP (memadukan tbCustomersHargaAudit)
    if (customerPriceListItems.length === 0) {
      const vwTariffs = await getCustomerTariffsWithAudit(resolvedCustCode)

      if (vwTariffs && vwTariffs.length > 0) {
        hasCustomerPriceList = true
        customerPriceListItems = vwTariffs.map((t, idx) => ({
          id: 900000 + idx,
          sheetType: 'CUSTOMER',
          mode: t.listType === 1 ? 'BY AIR' : 'BY SEA',
          branch: t.branchName?.trim() || expectedBranch || 'ALL',
          category: t.comodityName?.trim() || '',
          price: Number(t.harga),
          isCustomerPrice: true,
        }))
      }
    }
  }

  const allPriceListItems = [...customerPriceListItems, ...masterPriceListItems]

  return {
    fdListCode: resolvedListCode,
    fdListType: resolvedListType,
    defaultFdTypeComodity: markingBranch?.fdTypeComodity !== null && markingBranch?.fdTypeComodity !== undefined ? Number(markingBranch.fdTypeComodity) : null,
    markingComodityType,
    markingComodities,
    fdTglAgent: agentDate ? agentDate.toISOString() : null,
    expectedMode,
    expectedBranch,
    priceValidation: {
      fdTglAgent: agentDate ? agentDate.toISOString() : null,
      effectiveDate: hasCustomerPriceList ? (customerPriceEffectiveDate || priceEffectiveDate) : priceEffectiveDate,
      masterEffectiveDate: priceEffectiveDate,
      customerEffectiveDate: customerPriceEffectiveDate,
      hasCustomerPriceList,
      isMarkingOverride: hasCustomerPriceList
        ? (custLookupResult?.isMarkingOverride || false)
        : (generalLookup.isMarkingOverride || false),
      matchedMarkingCode: hasCustomerPriceList
        ? (custLookupResult?.matchedMarkingCode || null)
        : (generalLookup.matchedMarkingCode || null),
      expectedMode,
      expectedBranch,
      items: allPriceListItems,
      customerPriceListName: custLookupResult?.uploadInfo?.fileName || null,
    },
    customer: {
      fdListCode: resolvedListCode,
      fdMarkingCode: resolvedMarkingCode,
      fdCustCode: resolvedCustCode,
      fdCustName: custName,
      fdBlocked: custBlocked,
      fdSalesNM: custSalesNM,
      fdBroker: custBroker,
    },
    isCodOrUrgent,
    recommendedM3,
    recommendedM3Source,
    hasApprovedKomplain,
    isFullKomplainQtyMatch,
    isKomplainRejected,
    komplainRejectedReason,
    m3PackingList: {
      raw: unifiedM3Rows,
      values: plValues,
      qty: qtyPL,
    },
    m3Gudang: {
      raw: unifiedM3Rows,
      values: gudangValues,
      qty: qtyGudang,
    },
    m3CustPerMarking: {
      raw: m3CustRows,
      values: custValues,
      totalEntryList,
    },
    m3PLPerMarking: {
      raw: unifiedM3Rows,
      values: plPerMarkingValues,
      totalEntryList,
    },
    m3Komplain: {
      raw: unifiedM3Rows,
      values: komplainValues,
      qty: qtyKomplain,
    },
    m3KomplainPerMarking: {
      raw: unifiedM3Rows,
      values: komplainPerMarkingValues,
      totalEntryKomplain,
    },
    m3ListBatch: {
      raw: unifiedM3Rows,
      values: m3List !== null ? [m3List] : [],
      qty: qtyList,
    },
    fdQtyList: qtyList,
    fdTotalQtyPL: qtyPL,
    fdTotalQtyGudang: qtyGudang,
    fdTotalQtyKomplain: qtyKomplain,
    totalEntryKomplain,
    totalEntryList,
    isPartialKomplain,
    m3KomplainPlusGudang,
    countKomplainLC,
    countGudangLC,
    fdSatuan,
    fdBeratList: parseM3Val(unifiedRow?.fdBeratList),
    fdJmlBeratGudang: parseM3Val(beratGudangRows?.[0]?.fdJmlBerat),
    fdJmlBeratKomplain: parseM3Val(unifiedRow?.fdJmlBeratKomplain),
    totalJmlBeratSJ: parseM3Val(unifiedRow?.TotalJmlBeratSJ),
    totalBeratPerMarking,
    markingDetails: Array.isArray(detailRows) ? detailRows.map((r: any) => ({
      fdListCode: r.fdListCode ? String(r.fdListCode).trim() : '',
      fdMarkingNo: r.fdMarkingNo ? String(r.fdMarkingNo).trim() : '',
      fdQty: parseM3Val(r.fdTotalQty ?? r.fdQtyPL ?? r.fdTotalQtySJ ?? r.fdJmlPack),
      fdM3PL: parseM3Val(r.fdM3PackingList ?? r.fdM3Pl ?? r.fdM3PL ?? r['M3 PL']),
      fdM3Gudang: parseM3Val(r.fdM3 ?? r['M3'] ?? r.m3_gdg),
      fdM3Komplain: parseM3Val(r.fdm3Komplain ?? r.fdM3Komplain ?? r['M3 K']),
      fdBerat: (parseM3Val(r.fdTotalBeratSJ) ?? 0) > 0 ? parseM3Val(r.fdTotalBeratSJ) : parseM3Val(r.fdJmlBerat ?? r.berat ?? r.Berat),
      fdSatuan: r.fdSatuan ? String(r.fdSatuan).trim() : 'COLY',
    })) : [],
    fdVFCGudang: parseM3Val(unifiedRow?.fdVFCGudang),
    fdVFCPL: parseM3Val(unifiedRow?.fdVFCPL),
    fdVFCKomplain: parseM3Val(unifiedRow?.fdVFCKomplain),
    vfcGudangPerMarking: parseM3Val(unifiedRow?.VFCGudangPerMarking),
    vfcKomplainPerMarking: parseM3Val(unifiedRow?.VFCKomplainPerMarking),
    minChargeKg: profileHarga?.minChargeKg ? profileHarga.minChargeKg : (resolvedListType === 1 ? 3 : 0),
    profileHarga,
    comodityTypes: await safeRunRaw(async () => {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT fdID, fdTypeComodity, fdComodityName, fdListType
        FROM tbTypeComodity WITH (NOLOCK)
      `
      return Array.isArray(rows)
        ? rows.map((c) => ({
            fdID: Number(c.fdID || 0),
            fdTypeComodity: c.fdTypeComodity !== null && c.fdTypeComodity !== undefined ? Number(c.fdTypeComodity) : null,
            fdComodityName: c.fdComodityName ? String(c.fdComodityName).trim() : '',
            fdListType: c.fdListType !== null && c.fdListType !== undefined ? Number(c.fdListType) : null,
          }))
        : []
    }, 'get_tbTypeComodity'),
    freightChargeSummary: Array.isArray(freightChargeRows) && freightChargeRows.length > 0
      ? {
          totalFc: Number(freightChargeRows[0].totalFc || 0),
          listsWithFcCount: Number(freightChargeRows[0].listsWithFcCount || 0),
          currency: String(freightChargeRows[0].currency || '').trim() || '—',
        }
      : null,
  }
}

/**
 * Rincian M3 Customer per Marking (dbo.get_qr_tbm3_perMarking_plus_rasio)
 */
export async function getM3CustPerMarkingDetails(custCode: string, markingCode: string) {
  const cleanCustCode = custCode.trim()
  const cleanMarkingCode = markingCode.trim()

  if (!cleanCustCode || !cleanMarkingCode) {
    return []
  }

  try {
    const rows = await prisma.$queryRaw<any[]>`
      EXEC dbo.get_qr_tbm3_perMarking_plus_rasio @fdCustCode = ${cleanCustCode}, @fdMarkingCode = ${cleanMarkingCode}
    `
    return rows
  } catch (err) {
    logger.error(`Error executing dbo.get_qr_tbm3_perMarking_plus_rasio for ${cleanCustCode} / ${cleanMarkingCode}:`, err)
    return []
  }
}
