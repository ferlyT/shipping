import { prisma } from '../../config/database'
import { logger } from '../../config/logger'
import { safeRunRaw } from '../../utils/db'
import { lookupPriceList } from '../price-list/price-list-lookup.service'
import { lookupCustomerPriceList } from '../customer-price-list/customer-price-list.service'
import { isGenuineLaptop, isGenuineIpad, isGenuineBattery } from '../billing/billing-category.matcher'
import type {
  UnifiedM3CheckResult,
  ProfileHargaItem,
  MarkingDetailItem,
  ComodityTypeOption,
  RelatedBillsSummary,
  RelatedInvoiceItem,
} from './m3-check.types'

/**
 * Helper untuk memeriksa apakah kode adalah format 5-8 digit list code
 */
export const is7DigitListCode = (c?: string | null): boolean => !!c && /^\d{5,8}$/.test(c.trim())

/**
 * Helper untuk parsing format nomor invoice dan mengenali keluarga invoice (induk & anak/pecahan A-Z)
 */
export function parseInvoiceFamily(invNo: string) {
  const clean = invNo.replace(/^[\x00-\x1F]+/, '').trim()
  const match = clean.match(/^([A-Za-z0-9_-]+-)([0-9A-Za-z])(\d{5})(-\d{2}-\d{4})$/)
  if (!match) return null

  const [, prefix, headChar, seq5, tail] = match
  const isChild = headChar !== '0' && /[A-Za-z]/.test(headChar)
  const isParent = headChar === '0'
  const parentInvNo = `${prefix}0${seq5}${tail}`

  return {
    clean,
    prefix,
    headChar,
    seq5,
    tail,
    isChild,
    isParent,
    parentInvNo,
  }
}

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
 * Ambil informasi histori audit / tanggal update terakhir untuk profil harga customer.
 * Prioritas 1: tbCustomersHargaAudit (tbAuditHarga) jika ada
 * Prioritas 2 (Fallback): tbCustomersHarga -> fdUpdate (nama) dan fdLoad (tgl update)
 */
export async function getCustomerHargaAuditInfo(custCode?: string | null): Promise<{
  fdUpdate: string | null
  fdUpdateDate: Date | null
  source: 'AUDIT' | 'CUSTOMER_HARGA' | null
  fdNoteAir: string | null
  fdNote1Sea: string | null
}> {
  const targetCust = (custCode || '').trim()
  if (!targetCust) {
    return { fdUpdate: null, fdUpdateDate: null, source: null, fdNoteAir: null, fdNote1Sea: null }
  }

  const [auditRes, custHargaRes] = await Promise.all([
    safeRunRaw(async () => {
      return prisma.$queryRaw<any[]>`
        SELECT TOP 1 
          RTRIM(fdUpdatedBy) AS fdUpdate, 
          fdUpdateDate AS fdUpdateDate
        FROM tbCustomersHargaAudit WITH (NOLOCK)
        WHERE fdCustCode = CAST(${targetCust} AS CHAR(7))
        ORDER BY fdUpdateDate DESC
      `
    }, 'get_customer_harga_audit'),
    safeRunRaw(async () => {
      return prisma.$queryRaw<any[]>`
        SELECT TOP 1 
          RTRIM(fdUpdate) AS fdUpdate, 
          fdLoad AS fdUpdateDate,
          RTRIM(fdNote) AS fdNoteAir,
          RTRIM(fdNote1) AS fdNote1Sea
        FROM tbCustomersHarga WITH (NOLOCK)
        WHERE fdCustCode = CAST(${targetCust} AS CHAR(7))
      `
    }, 'get_customer_harga_fallback')
  ])

  const fdNoteAir =
    custHargaRes && custHargaRes.length > 0 && custHargaRes[0].fdNoteAir
      ? String(custHargaRes[0].fdNoteAir).trim()
      : null
  const fdNote1Sea =
    custHargaRes && custHargaRes.length > 0 && custHargaRes[0].fdNote1Sea
      ? String(custHargaRes[0].fdNote1Sea).trim()
      : null

  if (auditRes && auditRes.length > 0 && auditRes[0].fdUpdate) {
    return {
      fdUpdate: auditRes[0].fdUpdate ? String(auditRes[0].fdUpdate).trim() : null,
      fdUpdateDate: auditRes[0].fdUpdateDate ? new Date(auditRes[0].fdUpdateDate) : null,
      source: 'AUDIT',
      fdNoteAir,
      fdNote1Sea,
    }
  }

  if (custHargaRes && custHargaRes.length > 0) {
    return {
      fdUpdate: custHargaRes[0].fdUpdate ? String(custHargaRes[0].fdUpdate).trim() : null,
      fdUpdateDate: custHargaRes[0].fdUpdateDate ? new Date(custHargaRes[0].fdUpdateDate) : null,
      source: 'CUSTOMER_HARGA',
      fdNoteAir,
      fdNote1Sea,
    }
  }

  return { fdUpdate: null, fdUpdateDate: null, source: null, fdNoteAir, fdNote1Sea }
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

  // 1. Resolve listCode, custCode, dan markingCode dari tbEntryList atau tbBilling
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

  let agentDate: Date | null = null

  if (is7DigitListCode(cleanIdentifier)) {
    // Jalur Cepat (Index Seek PK tbEntryList) jika identifier adalah 5-8 digit list code
    const entryRows = await safeRunRaw(async () => {
      return prisma.$queryRaw<any[]>`
        SELECT TOP 1 
          RTRIM(el.fdListCode) as fdListCode, 
          el.fdListType, 
          RTRIM(el.fdMarkingCode) as fdMarkingCode, 
          RTRIM(el.fdCustCode) as fdCustCode,
          el.fdTglAgent,
          el.fdTypeComodity,
          el.fdSatuan,
          RTRIM(c.fdCustName) as fdCustName, 
          c.fdBlocked, 
          RTRIM(c.fdSalesNM) as fdSalesNM, 
          c.fdBroker,
          RTRIM(m.fdBranchCode) as fdBranchCode,
          RTRIM(cb.fdBranchName) as fdBranchName
        FROM tbEntryList el WITH (NOLOCK)
        LEFT JOIN tbCustomers c WITH (NOLOCK) ON el.fdCustCode = c.fdCustCode
        LEFT JOIN tbMarking m WITH (NOLOCK) ON m.fdMarkingCode = el.fdMarkingCode
        LEFT JOIN tbCabang cb WITH (NOLOCK) ON cb.fdBranchCode = m.fdBranchCode
        WHERE el.fdListCode = CAST(${cleanIdentifier} AS CHAR(7))
      `
    }, 'entryInfo_fast')

    if (entryRows && entryRows.length > 0) {
      const e = entryRows[0]
      resolvedListCode = e.fdListCode || cleanIdentifier
      if (e.fdListType !== null && e.fdListType !== undefined) {
        resolvedListType = Number(e.fdListType)
      }
      if (e.fdMarkingCode) resolvedMarkingCode = e.fdMarkingCode
      if (e.fdCustCode) resolvedCustCode = e.fdCustCode
      if (e.fdCustName) custName = e.fdCustName
      custBlocked = e.fdBlocked ?? 0
      custBroker = e.fdBroker ?? 0
      if (e.fdSalesNM) custSalesNM = e.fdSalesNM
      if (e.fdBranchCode) resolvedBranchCode = e.fdBranchCode
      if (e.fdBranchName) resolvedBranchName = e.fdBranchName
      if (e.fdTglAgent) agentDate = new Date(e.fdTglAgent)
    }
  }

  // Jika belum resolved (bukan listcode atau tidak ketemu di tbEntryList), cari di tbBilling secara spesifik
  if (!resolvedCustCode) {
    const isInvFormat = cleanIdentifier.includes('-') || /^[A-Za-z]/.test(cleanIdentifier)
    const billingInfo = await safeRunRaw(async () => {
      if (isInvFormat) {
        return prisma.tbBilling.findFirst({
          where: { fdInvNo: cleanIdentifier },
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
      }
      return prisma.tbBilling.findFirst({
        where: {
          OR: [
            { fdListCode: cleanIdentifier },
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
        const batchCode = resolvedMarkingCode.split(';')[0]?.trim() || ''
        const markingPart = resolvedMarkingCode.split(';')[1]?.trim() || ''
        const invDigitsMatch = billingInfo.fdInvNo.trim().match(/(\d{5,6})/)
        const invNum = invDigitsMatch?.[1] || ''
        const invTail = invNum.length === 6 ? invNum.slice(1) : invNum

        const entries = await safeRunRaw(async () => {
          let sql = `
            SELECT fdListCode, fdMarkingCode, fdMarkingNo, fdCustCode, fdJmlPack, fdSatuan, fdJmlBerat, fdM3, fdInvoiceNo, fdTglAgent
            FROM tbEntryList WITH (NOLOCK)
            WHERE 1=0
          `
          if (resolvedCustCode && batchCode) {
            sql += ` OR (fdCustCode = CAST('${resolvedCustCode}' AS CHAR(7)) AND fdMarkingCode = CAST('${batchCode}' AS VARCHAR(30)))`
          }
          if (billingInfo.fdInvNo) {
            sql += ` OR (fdInvoiceNo = CAST('${billingInfo.fdInvNo.trim()}' AS CHAR(20)))`
          }
          if (resolvedCustCode && invTail) {
            sql += ` OR (fdCustCode = CAST('${resolvedCustCode}' AS CHAR(7)) AND fdInvoiceNo LIKE '%${invTail}%')`
          }
          return prisma.$queryRawUnsafe<any[]>(sql)
        }, 'find_candidate_entries')

        if (Array.isArray(entries) && entries.length > 0) {
          const exactMarkingMatch = markingPart
            ? entries.find((e) => e.fdMarkingNo?.trim().toUpperCase().includes(markingPart.toUpperCase()))
            : null

          const chosenEntry = exactMarkingMatch || entries[0]
          resolvedListCode = chosenEntry.fdListCode.trim()
          if (chosenEntry.fdTglAgent) agentDate = new Date(chosenEntry.fdTglAgent)
        }
      }
    }
  }

  // Ambil informasi cabang dan marking jika belum lengkap
  let markingBranch: any = null
  if (!resolvedBranchCode && (resolvedListCode || resolvedMarkingCode)) {
    markingBranch = await safeRunRaw(async () => {
      if (resolvedListCode) {
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
          WHERE el.fdListCode = CAST(${resolvedListCode} AS CHAR(7))
        `
        if (res && res.length > 0) return res[0]
      }
      if (resolvedMarkingCode) {
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
          WHERE el.fdMarkingCode = CAST(${resolvedMarkingCode} AS VARCHAR(30))
          ORDER BY el.fdListCode ASC
        `
        return res && res.length > 0 ? res[0] : null
      }
      return null
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
  else if (bCombined.includes('SZ') || bCombined.includes('SHENZHEN')) expectedBranch = 'SZ'
  else if (resolvedBranchCode?.trim()) expectedBranch = resolvedBranchCode.trim().toUpperCase()

  const cleanBatchCode = resolvedMarkingCode.split(';')[0]?.trim() || resolvedMarkingCode

  // 2. Eksekusi seluruh query pengecekan M3, SP, audit profil, dan price lookup secara paralel
  const [
    unifiedM3Rows,
    m3CustRows,
    profileHargaRows,
    markingComodityRows,
    beratGudangRows,
    freightChargeRows,
    commodityMappingRows,
    beratSJRows,
    auditInfo,
    generalLookup,
    custLookupResult,
    fallbackAgentDate
  ] = await Promise.all([
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
        SELECT TOP 1 fdJmlBerat FROM tbEntryListGudang WITH (NOLOCK) WHERE fdListCode = CAST(${resolvedListCode} AS CHAR(7))
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
        WHERE fdCustCode = CAST(${resolvedCustCode} AS CHAR(7))
          AND fdMarkingCode = CAST(${cleanBatchCode} AS VARCHAR(30))
      `
    }, 'get_freight_charge_summary'),
    // G. Commodity Mapping dari tbCommodityMapping (khusus customer atau global)
    safeRunRaw(async () => {
      const now = new Date()
      return prisma.tbCommodityMapping.findMany({
        where: {
          OR: [
            ...(resolvedCustCode ? [{ fdCustCode: resolvedCustCode }] : []),
            { fdCustCode: null },
            { fdCustCode: '' }
          ],
          effectiveDate: { lte: now },
          AND: [
            {
              OR: [
                { endDate: null },
                { endDate: { gte: now } }
              ]
            }
          ]
        },
        orderBy: [
          { fdCustCode: 'desc' },
          { createdAt: 'desc' }
        ]
      })
    }, 'get_commodity_mappings'),
    // H. Berat Surat Jalan dari tbDelivery (khusus listcode ini)
    safeRunRaw(async () => {
      if (!resolvedListCode) return null
      const rows = await prisma.$queryRaw<any[]>`
        SELECT CAST(COALESCE(SUM(fdJmlBeratSJ), 0) as float) as totalBeratSJ
        FROM tbDelivery WITH (NOLOCK)
        WHERE fdListCode = ${resolvedListCode}
      `
      return rows && rows.length > 0 ? Number(rows[0].totalBeratSJ || 0) : null
    }, 'get_berat_delivery_sj'),
    // I. Audit info histori profil harga customer
    getCustomerHargaAuditInfo(resolvedCustCode),
    // J. Master Price List lookup
    lookupPriceList(agentDate || new Date(), {
      mode: expectedMode || undefined,
      branch: expectedBranch || undefined,
      markingCode: resolvedMarkingCode || undefined,
    }),
    // K. Customer Price List lookup
    resolvedCustCode
      ? lookupCustomerPriceList(resolvedCustCode, agentDate || new Date(), {
          mode: expectedMode || undefined,
          branch: expectedBranch || undefined,
          markingCode: resolvedMarkingCode || undefined,
        })
      : Promise.resolve(null),
    // L. Fallback agent date jika belum terisi dari tbEntryList
    (!agentDate && resolvedListCode)
      ? safeRunRaw(async () => {
          const r = await prisma.$queryRaw<any[]>`
            SELECT TOP 1 fdTglAgent FROM vwShipment WITH (NOLOCK) WHERE fdListCode = ${resolvedListCode}
          `
          return r && r.length > 0 && r[0].fdTglAgent ? new Date(r[0].fdTglAgent) : null
        }, 'get_fallback_tgl_agent')
      : Promise.resolve(null)
  ])

  if (!agentDate && fallbackAgentDate) {
    agentDate = fallbackAgentDate
  }

  const profileHargaRow = Array.isArray(profileHargaRows) && profileHargaRows.length > 0 ? profileHargaRows[0] : null
  const custForAudit = (profileHargaRow?.fdCustCode || resolvedCustCode || '').trim()

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
        fdUpdate: auditInfo.fdUpdate,
        fdUpdateDate: auditInfo.fdUpdateDate,
        fdUpdateSource: auditInfo.source,
        fdNoteAir: auditInfo.fdNoteAir,
        fdNote1Sea: auditInfo.fdNote1Sea,
      }
    : (auditInfo.fdNoteAir || auditInfo.fdNote1Sea || auditInfo.fdUpdate)
    ? {
        fdListCode: resolvedListCode,
        fdCustCode: custForAudit,
        harga: 0,
        rasio: 0,
        typeTagihan: 0,
        kg: 0,
        taxReturnPrice: 0,
        taxReturnMinCharge: 0,
        minChargeM3: 0,
        minChargeKg: 0,
        fdUpdate: auditInfo.fdUpdate,
        fdUpdateDate: auditInfo.fdUpdateDate,
        fdUpdateSource: auditInfo.source,
        fdNoteAir: auditInfo.fdNoteAir,
        fdNote1Sea: auditInfo.fdNote1Sea,
      }
    : null

  const unifiedRow = Array.isArray(unifiedM3Rows) && unifiedM3Rows.length > 0 ? unifiedM3Rows[0] : null
  const markingComodityRow = Array.isArray(markingComodityRows) && markingComodityRows.length > 0 ? markingComodityRows[0] : null
  const rawFirstType = markingComodityRow?.fdTypeComodity ?? markingComodityRow?.TypeComodity ?? markingComodityRow?.fdTipe ?? markingComodityRow?.Tipe

  const markingComodities = Array.isArray(markingComodityRows)
    ? markingComodityRows.map((r) => {
        const rawType = r.fdTypeComodity ?? r.TypeComodity ?? r.fdTipe ?? r.Tipe
        const rawComodity = r.fdComodity ?? r.Comodity ?? r.fdCommodity ?? r.Commodity ?? r.fdDescr ?? r.Descr
        const rawComodityName = r.fdComodityName ?? r.ComodityName ?? r.Tipe ?? r.fdTipe

        let fdComodity = rawComodity ? String(rawComodity).trim() : null
        let fdTypeComodity = rawType !== null && rawType !== undefined && !isNaN(Number(rawType)) ? Number(rawType) : null
        let fdComodityName = rawComodityName ? String(rawComodityName).trim() : null

        // Cek override dari tbCommodityMapping jika tersedia
        if (fdComodity && Array.isArray(commodityMappingRows) && commodityMappingRows.length > 0) {
          const comUpper = fdComodity.toUpperCase().trim()
          const matchedMapping = commodityMappingRows.find((m: any) => {
            if (m.branch && m.branch !== 'ALL' && expectedBranch) {
              const mB = m.branch.toUpperCase().trim()
              const eB = expectedBranch.toUpperCase().trim()
              if (mB !== eB && !eB.includes(mB) && !mB.includes(eB)) return false
            }
            if (m.mode && m.mode !== 'ALL') {
              const mMode = m.mode.toUpperCase()
              if (resolvedListType === 1 && !mMode.includes('AIR') && !mMode.includes('UDARA')) return false
              if (resolvedListType === 2 && !mMode.includes('SEA') && !mMode.includes('LAUT')) return false
            }
            const mUpper = String(m.commodityName || '').trim().toUpperCase()
            if (['LAPTOP', 'NOTEBOOK', 'MACBOOK', 'LAPTOPS'].includes(mUpper) && !isGenuineLaptop(comUpper)) {
              return false
            }
            if (['IPAD', 'TABLET'].includes(mUpper) && !isGenuineIpad(comUpper)) {
              return false
            }
            const tUpper = String(m.targetCommodity || '').trim().toUpperCase()
            if (
              ['BATTERY', 'BATTERIES', 'LAPTOP BATTERY', 'POWERBANK', 'ACCU', 'AKI'].includes(mUpper) ||
              tUpper.includes('SEMI GARMENT') ||
              tUpper.includes('BATTERY') ||
              tUpper.includes('POWERBANK')
            ) {
              if (!isGenuineBattery(comUpper)) return false
            }
            return comUpper === mUpper || comUpper.includes(mUpper) || mUpper.includes(comUpper)
          })
          if (matchedMapping) {
            fdComodityName = String(matchedMapping.targetCommodity || '').trim()
            if (matchedMapping.fdTypeComodity !== null && matchedMapping.fdTypeComodity !== undefined) {
              fdTypeComodity = Number(matchedMapping.fdTypeComodity)
            }
          }

          return {
            fdTypeComodity,
            fdComodity,
            fdComodityName,
            directPrice: matchedMapping && matchedMapping.price ? Number(matchedMapping.price) : null,
          }
        }

        return {
          fdTypeComodity,
          fdComodity,
          fdComodityName,
          directPrice: null,
        }
      })
    : []

  const firstMappedType = markingComodities.length > 0 ? (markingComodities[0]?.fdTypeComodity ?? null) : null
  const markingComodityType: number | null = firstMappedType !== null && firstMappedType !== undefined
    ? firstMappedType
    : (rawFirstType !== undefined && rawFirstType !== null && !isNaN(Number(rawFirstType)) ? Number(rawFirstType) : null)

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
  if (allM3Values.length === 0 && normM3List !== null && normM3List > 0) {
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
    if (isPartialKomplain && m3KomplainPlusGudang !== null && m3KomplainPlusGudang > 0) {
      rawRec = m3KomplainPlusGudang
      recommendedM3Source = 'KOMPLAIN'
    } else {
      rawRec = rawKomplainM3!
      recommendedM3Source = 'KOMPLAIN'
    }
  } else if (isCodOrUrgent) {
    // Apabila customer COD/Urgent:
    // Jika ada Packing List (m3PL > 0), ambil ukuran terbesar antara Gudang & Packing List.
    // Apabila m3packinglist 0 / tidak ada, gunakan ukuran gudang sebagai acuan.
    if (hasPlValue) {
      const candidateValues = [
        ...validNormPlValues,
        ...validNormPlPerMarkingValues,
        ...normGudangValues,
        ...normCustValues,
      ]
      rawRec = candidateValues.length > 0 ? Math.max(...candidateValues) : maxM3
      recommendedM3Source = 'MAX'
    } else if (normGudangValues.length > 0 || normCustValues.length > 0) {
      rawRec = (normGudangValues[0] ?? normCustValues[0]) ?? maxM3
      recommendedM3Source = 'GUDANG'
    } else {
      rawRec = maxM3
      recommendedM3Source = 'MAX'
    }
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

  // Master Price List items
  let masterPriceListItems: any[] = []
  let priceEffectiveDate: string | null = null

  if (generalLookup && generalLookup.found && generalLookup.uploadInfo) {
    priceEffectiveDate = generalLookup.uploadInfo.effectiveDate
      ? new Date(generalLookup.uploadInfo.effectiveDate).toISOString()
      : null
    masterPriceListItems = (generalLookup.items || []).map((it: any) => ({
      id: it.id,
      sheetType: it.sheetType,
      mode: it.mode,
      branch: it.branch,
      category: it.category,
      price: Number(it.price),
      isCustomerPrice: false,
    }))
  }

  // Customer Price List items
  let customerPriceListItems: any[] = []
  let customerPriceEffectiveDate: string | null = null
  let hasCustomerPriceList = false

  if (custLookupResult && custLookupResult.found && custLookupResult.items?.length > 0) {
    hasCustomerPriceList = true
    customerPriceEffectiveDate = custLookupResult.uploadInfo?.effectiveDate
      ? new Date(custLookupResult.uploadInfo.effectiveDate).toISOString()
      : null
    customerPriceListItems = custLookupResult.items.map((it: any) => ({
      id: it.id,
      sheetType: 'CUSTOMER',
      mode: it.mode,
      branch: it.branch,
      category: it.category,
      price: Number(it.price),
      isCustomerPrice: true,
    }))
  }

  const allPriceListItems = [...customerPriceListItems, ...masterPriceListItems]

  // ─── Evaluasi Fallback M3 Berbasis No Invoice Terkait (Induk & Anak / Tambahan) ─
  let relatedBillsSummary: RelatedBillsSummary | null = null
  try {
    const rawInvNo = (cleanIdentifier.includes('-') || /^[A-Za-z]/.test(cleanIdentifier))
      ? cleanIdentifier.replace(/^[\x00-\x1F]+/, '').trim()
      : ''

    let targetInvNo = rawInvNo
    if (!targetInvNo && resolvedListCode) {
      const b = await safeRunRaw(async () => {
        return prisma.tbBilling.findFirst({
          where: { fdListCode: resolvedListCode },
          select: { fdInvNo: true },
        })
      }, 'find_billing_inv_by_listcode')
      if (b?.fdInvNo) {
        targetInvNo = b.fdInvNo.replace(/^[\x00-\x1F]+/, '').trim()
      }
    }

    if (targetInvNo && resolvedCustCode && cleanBatchCode) {
      const parsedFam = parseInvoiceFamily(targetInvNo)
      const parentInvNo = parsedFam?.parentInvNo || targetInvNo

      // Ambil seluruh bill dalam batch & customer yang sama
      const batchBills = await safeRunRaw(async () => {
        return prisma.tbBilling.findMany({
          where: {
            fdCustCode: resolvedCustCode,
            fdMarkingCode: { startsWith: cleanBatchCode },
          },
          select: {
            fdInvNo: true,
            fdListCode: true,
            fdMarkingNo: true,
            fdBillTambahan: true,
            details: {
              select: {
                fdItemName: true,
                fdQty: true,
                fdListCode: true,
              },
            },
          },
        })
      }, 'get_related_batch_bills')

      if (Array.isArray(batchBills) && batchBills.length > 0) {
        // Filter invoice yang saling berelasi
        const relatedBatchBills = batchBills.filter((b) => {
          const bInv = b.fdInvNo.replace(/^[\x00-\x1F]+/, '').trim()
          if (bInv === parentInvNo || bInv === targetInvNo) return true
          const bFam = parseInvoiceFamily(bInv)
          if (bFam && bFam.parentInvNo === parentInvNo) return true
          const hasGabung = b.details.some((d) => {
            const itemName = (d.fdItemName || '').toUpperCase()
            return itemName.includes(parentInvNo.toUpperCase()) || itemName.includes(targetInvNo.toUpperCase())
          })
          if (hasGabung) return true
          return false
        })

        // Hanya bentuk summary jika terdapat lebih dari 1 invoice terkait atau ada relasi induk/anak
        if (relatedBatchBills.length > 1 || (parsedFam?.isChild && relatedBatchBills.length > 0)) {
          const relatedListCodes = Array.from(
            new Set(
              relatedBatchBills
                .map((b) => (b.fdListCode ? String(b.fdListCode).trim() : ''))
                .filter(Boolean)
            )
          )

          // Akumulasi dari detailRows untuk listCode terkait
          let sumM3Gudang = 0
          let sumM3PL = 0
          let sumM3Komplain = 0
          let sumQty = 0
          let sumBerat = 0

          for (const d of (detailRows || [])) {
            const lc = String(d.fdListCode || '').trim()
            if (relatedListCodes.includes(lc)) {
              sumM3Gudang += parseM3Val(d.fdM3 ?? d['M3'] ?? d.m3_gdg) || 0
              sumM3PL += parseM3Val(d.fdM3PackingList ?? d.fdM3PL ?? d['M3 PL'] ?? d['M3_PL'] ?? d.m3_pl ?? d.fdm3PL) || 0
              sumM3Komplain += parseM3Val(d.fdM3Komplain ?? d.fdm3Komplain ?? d['M3 K'] ?? d['M3_K']) || 0
              sumQty += parseM3Val(d.fdTotalQty ?? d.fdQtyPL ?? d.fdTotalQtySJ ?? d.fdJmlPack) || 0
              sumBerat += parseM3Val(d.fdTotalBeratSJ ?? d.fdJmlBerat ?? d.berat ?? d.Berat) || 0
            }
          }

          let totalBilledM3 = 0
          let totalBilledKg = 0
          const relatedInvoices: RelatedInvoiceItem[] = relatedBatchBills.map((b) => {
            const bInv = b.fdInvNo.replace(/^[\x00-\x1F]+/, '').trim()
            const bFam = parseInvoiceFamily(bInv)
            const isP = bFam ? bFam.isParent : bInv === parentInvNo

            let invBilledM3 = 0
            let invBilledKg = 0
            for (const item of (b.details || [])) {
              const u = (item.fdListCode || '').trim().toUpperCase()
              const n = (item.fdItemName || '').toUpperCase()
              const q = Number(item.fdQty || 0)
              if (u === 'M3' || (!u && n.includes('(M3)'))) {
                invBilledM3 += q
              } else if (u === 'KG' || (!u && n.includes('(KG)'))) {
                invBilledKg += q
              }
            }
            totalBilledM3 += invBilledM3
            totalBilledKg += invBilledKg

            return {
              invNo: bInv,
              listCode: b.fdListCode ? String(b.fdListCode).trim() : '',
              isParent: isP,
              billedM3: parseFloat(invBilledM3.toFixed(4)),
              billedKg: parseFloat(invBilledKg.toFixed(2)),
              markingNo: b.fdMarkingNo ? String(b.fdMarkingNo).trim() : '',
              firstItemName: b.details?.[0]?.fdItemName ? String(b.details[0].fdItemName).trim() : undefined,
            }
          })

          relatedBillsSummary = {
            hasRelatedBills: true,
            isParent: parsedFam ? parsedFam.isParent : targetInvNo === parentInvNo,
            isChild: parsedFam ? parsedFam.isChild : false,
            parentInvNo,
            childLetter: parsedFam?.isChild ? parsedFam.headChar : undefined,
            relatedInvoices,
            relatedListCodes,
            sumM3Gudang: parseFloat(sumM3Gudang.toFixed(4)),
            sumM3PL: parseFloat(sumM3PL.toFixed(4)),
            sumM3Komplain: parseFloat(sumM3Komplain.toFixed(4)),
            sumQty: parseFloat(sumQty.toFixed(2)),
            sumBerat: parseFloat(sumBerat.toFixed(2)),
            totalBilledM3: parseFloat(totalBilledM3.toFixed(4)),
            totalBilledKg: parseFloat(totalBilledKg.toFixed(2)),
          }
        }
      }
    }
  } catch (err: any) {
    logger.warn('[M3Check] Gagal evaluasi related bills fallback: ' + (err?.message || err))
  }

  return {
    fdListCode: resolvedListCode,
    fdListType: resolvedListType,
    defaultFdTypeComodity: markingBranch?.fdTypeComodity !== null && markingBranch?.fdTypeComodity !== undefined ? Number(markingBranch.fdTypeComodity) : null,
    markingComodityType,
    markingComodities,
    commodityMappings: Array.isArray(commodityMappingRows)
      ? commodityMappingRows.map((m: any) => ({
          id: m.id,
          commodityName: String(m.commodityName || '').trim(),
          targetCommodity: String(m.targetCommodity || '').trim(),
          fdTypeComodity: m.fdTypeComodity !== null && m.fdTypeComodity !== undefined ? Number(m.fdTypeComodity) : null,
          fdCustCode: m.fdCustCode ? String(m.fdCustCode).trim() : null,
          mode: m.mode ? String(m.mode).trim().toUpperCase() : null,
          price: m.price !== null && m.price !== undefined ? Number(m.price) : null,
          branch: m.branch ? String(m.branch).trim() : null,
          startMarkingCode: m.startMarkingCode ? String(m.startMarkingCode).trim() : null,
          startAgentDate: m.startAgentDate ? m.startAgentDate.toISOString() : null,
          effectiveDate: m.effectiveDate ? m.effectiveDate.toISOString() : null,
          endDate: m.endDate ? m.endDate.toISOString() : null,
        }))
      : [],
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
        ? ((custLookupResult as any)?.matchedMarkingCode || null)
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
    fdBeratSJ: parseM3Val(beratSJRows),
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
    minChargeM3: profileHarga?.minChargeM3 ? profileHarga.minChargeM3 : (resolvedListType === 2 ? 0.1 : 0),
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
    relatedBillsSummary,
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
    const [rows, commodityMappings, masterCust] = await Promise.all([
      prisma.$queryRaw<any[]>`
        EXEC dbo.get_qr_tbm3_perMarking_plus_rasio @fdCustCode = ${cleanCustCode}, @fdMarkingCode = ${cleanMarkingCode}
      `,
      prisma.tbCommodityMapping.findMany({
        where: {
          OR: [
            { fdCustCode: cleanCustCode },
            { fdCustCode: null },
            { fdCustCode: '' },
          ],
        },
        orderBy: [
          { fdCustCode: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      prisma.tbCustomers.findFirst({
        where: { fdCustCode: cleanCustCode },
        select: { fdCustName: true },
      }),
    ])

    if (!Array.isArray(rows)) return []

    const officialCustName = masterCust?.fdCustName ? masterCust.fdCustName.trim() : null

    // Pastikan fdCustName selalu mengutamakan dari master tbCustomers (Single Source of Truth)
    let processedRows = rows.map((r: any) => ({
      ...r,
      fdCustName: officialCustName || (r.fdCustName ? String(r.fdCustName).trim() : null),
    }))

    // Terapkan override pemetaan komoditas (tbCommodityMapping) ke setiap baris surat jalan
    if (commodityMappings && commodityMappings.length > 0) {
      return processedRows.map((r: any) => {
        const rawComodity = r.fdComodity ?? r.Comodity ?? r.fdCommodity ?? r.Commodity
        if (!rawComodity) return r

        const comUpper = String(rawComodity).toUpperCase().trim()
        const isAir = r.fdListType === 1 || r.ListType === 1
        const isSea = r.fdListType === 2 || r.ListType === 2
        const matchedMapping = commodityMappings.find((m: any) => {
          if (m.mode && m.mode !== 'ALL') {
            const mMode = m.mode.toUpperCase()
            if (isAir && !mMode.includes('AIR') && !mMode.includes('UDARA')) return false
            if (isSea && !mMode.includes('SEA') && !mMode.includes('LAUT')) return false
          }
          const mUpper = String(m.commodityName || '').trim().toUpperCase()
          if (['LAPTOP', 'NOTEBOOK', 'MACBOOK', 'LAPTOPS'].includes(mUpper) && !isGenuineLaptop(comUpper)) {
            return false
          }
          if (['IPAD', 'TABLET'].includes(mUpper) && !isGenuineIpad(comUpper)) {
            return false
          }
          const tUpper = String(m.targetCommodity || '').trim().toUpperCase()
          if (
            ['BATTERY', 'BATTERIES', 'LAPTOP BATTERY', 'POWERBANK', 'ACCU', 'AKI'].includes(mUpper) ||
            tUpper.includes('SEMI GARMENT') ||
            tUpper.includes('BATTERY') ||
            tUpper.includes('POWERBANK')
          ) {
            if (!isGenuineBattery(comUpper)) return false
          }
          return comUpper === mUpper || comUpper.includes(mUpper) || mUpper.includes(comUpper)
        })

        if (matchedMapping) {
          return {
            ...r,
            fdComodityName: String(matchedMapping.targetCommodity || '').trim(),
            fdTypeComodity:
              matchedMapping.fdTypeComodity !== null && matchedMapping.fdTypeComodity !== undefined
                ? Number(matchedMapping.fdTypeComodity)
                : r.fdTypeComodity,
          }
        }
        return r
      })
    }

    return processedRows
  } catch (err) {
    logger.error(`Error executing dbo.get_qr_tbm3_perMarking_plus_rasio for ${cleanCustCode} / ${cleanMarkingCode}:`, err)
    return []
  }
}
