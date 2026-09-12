import { prisma } from '../../config/database'
import { Prisma } from '@prisma/client'
import { logger } from '../../config/logger'
import { isMarkingGreaterOrEqual } from '../price-list/marking-matcher'
import {
  findBestCategoryMatch,
  isGenuineBattery,
  isGenuineIpad,
  isGenuineLaptop,
  isAppleDevice,
} from '../billing/billing-category.matcher'
import type {
  PriceCheckParams,
  UnifiedPriceCheckResult,
  PriceStatus,
  PriceSourceType,
} from './price-check.types'
import { getCustomerHargaAuditInfo } from '../m3-check/m3-check.service'

/**
 * Normalisasi kode cabang (GZ, YW, SH, SZ, HK, SG)
 */
export function getNormalizedBranchCode(branch?: string | null): string {
  const b = String(branch || '').toUpperCase().trim()
  if (b.includes('GUANGZHOU') || b === 'GZ') return 'GZ'
  if (b.includes('YIWU') || b === 'YW') return 'YW'
  if (b.includes('SHANGHAI') || b === 'SH') return 'SH'
  if (b.includes('SHENZHEN') || b === 'SZ') return 'SZ'
  if (b.includes('HONGKONG') || b.includes('HONG KONG') || b === 'HK') return 'HK'
  if (b.includes('SINGAPORE') || b.includes('SINGAPURA') || b === 'SG') return 'SG'
  return b
}

/**
 * Daftar nama sales yang seluruh customernya otomatis diarahkan ke acuan harga Marketing (MKT).
 * Rule: semua customer dengan sales ERIC, EDDIE HTM, FEBRI A, HERY, INDAH, SUSI, TSC.
 */
export const MKT_SALES_GROUP = [
  'ERIC',
  'EDDIE HTM',
  'FEBRI A',
  'HERY',
  'INDAH',
  'SUSI',
  'TSC',
  'KB',
  'ALDY',
] as const

/**
 * Helper untuk menentukan apakah customer harus menggunakan acuan harga Marketing (MKT)
 * berdasarkan status fdBroker === 1 ATAU sales customer termasuk dalam grouping MKT.
 */
export function isMktCustomer(
  customer?: { fdBroker?: number | null; fdSalesNM?: string | null; sales?: string | null } | null,
  salesParam?: string | null
): boolean {
  if (!customer && !salesParam) return false

  // 1. Cek flag fdBroker === 1
  if (customer && (customer as any).fdBroker === 1) return true

  // 2. Cek nama sales
  const salesName = (
    salesParam ||
    customer?.sales ||
    customer?.fdSalesNM ||
    (customer as any)?.salesNM ||
    ''
  ).trim().toUpperCase()

  if (!salesName) return false
  if (salesName.includes('BROKER')) return true

  return MKT_SALES_GROUP.some((mkt) => {
    return (
      salesName === mkt ||
      salesName.startsWith(`${mkt} `) ||
      salesName.startsWith(`${mkt}/`) ||
      salesName.endsWith(` ${mkt}`) ||
      new RegExp(`\\b${mkt}\\b`, 'i').test(salesName)
    )
  })
}

/**
 * Resolusi nama komoditas mentah menjadi target kategori Price List
 */
export function resolveCommodityName(
  inputRaw: string,
  custCode: string | null | undefined,
  activeMappings: any[],
  modeStr?: string
): string {
  const raw = (inputRaw || '').trim().toUpperCase()
  if (!raw) return ''

  const isAirMode = modeStr ? (modeStr.toUpperCase().includes('AIR') || modeStr.toUpperCase().includes('UDARA')) : false
  const matchesMode = (m: any) => {
    if (!m.mode || m.mode.trim().toUpperCase() === 'ALL') return true
    const mMode = m.mode.trim().toUpperCase()
    if (isAirMode) return mMode.includes('AIR') || mMode.includes('UDARA')
    return mMode.includes('SEA') || mMode.includes('LAUT')
  }

  const isValidGadgetMapping = (m: any) => {
    const mUpper = String(m.commodityName || '').trim().toUpperCase()
    if (['LAPTOP', 'NOTEBOOK', 'MACBOOK', 'LAPTOPS'].includes(mUpper) && !isGenuineLaptop(raw)) {
      return false
    }
    if (['IPAD', 'TABLET'].includes(mUpper) && !isGenuineIpad(raw)) {
      return false
    }
    const tUpper = String(m.targetCommodity || '').trim().toUpperCase()
    if (
      ['BATTERY', 'BATTERIES', 'LAPTOP BATTERY', 'POWERBANK', 'ACCU', 'AKI'].includes(mUpper) ||
      tUpper.includes('SEMI GARMENT') ||
      tUpper.includes('BATTERY') ||
      tUpper.includes('POWERBANK')
    ) {
      if (!isGenuineBattery(raw)) return false
    }
    return true
  }

  if (custCode) {
    const cm = activeMappings.find(
      (m) =>
        matchesMode(m) &&
        isValidGadgetMapping(m) &&
        m.fdCustCode?.trim().toUpperCase() === custCode.toUpperCase() &&
        m.commodityName.trim().toUpperCase() === raw
    )
    if (cm) return cm.targetCommodity.trim().toUpperCase()
  }
  const gm = activeMappings.find(
    (m) =>
      matchesMode(m) &&
      isValidGadgetMapping(m) &&
      !m.fdCustCode &&
      m.commodityName.trim().toUpperCase() === raw
  )
  if (gm) return gm.targetCommodity.trim().toUpperCase()

  // Aturan bisnis: Jika komoditas adalah genuine battery (bukan charger/case), petakan ke SEMI GARMENT untuk Laut
  const isSeaMode = !modeStr || modeStr.toUpperCase().includes('SEA') || modeStr.toUpperCase().includes('LAUT')
  if (isSeaMode && isGenuineBattery(raw)) {
    return 'SEMI GARMENT'
  }

  // Aturan bisnis: iPad / Tablet
  if (isGenuineIpad(raw)) {
    return isSeaMode ? 'KHUSUS IPAD' : 'TABLET'
  }

  // Aturan bisnis: Laptop / MacBook / Notebook
  if (isGenuineLaptop(raw)) {
    if (!isSeaMode && isAppleDevice(raw)) {
      return 'APPLE LAPTOP'
    }
    return 'LAPTOP'
  }

  return raw
}

/**
 * Logika terpusat untuk menentukan apakah suatu komoditas mengalami override resmi
 * (misal: genuine battery dialihkan ke SEMI GARMENT, iPad/Laptop dialihkan ke kategori Price List,
 * atau pemetaan eksplisit di tbCommodityMapping).
 * Menghindari false positive pada sinonim normal (misal LARTAS - N vs Lartas Normal).
 */
export function determineCommodityOverride(params: {
  comodityStr?: string | null
  typeStr?: string | null
  isBatteryItem?: boolean
  isIpadItem?: boolean
  isLaptopItem?: boolean
  isApple?: boolean
  modeStr?: string | null
  activeMappings?: any[]
  custCode?: string | null
}): { isCommodityOverride: boolean; commodityOverrideDetail: string } {
  const rawComodity = (params.comodityStr || '').trim().toUpperCase()
  const rawType = (params.typeStr || '').trim().toUpperCase()

  // 1. Genuine Battery Override (dialihkan ke SEMI GARMENT di laut)
  if (params.isBatteryItem) {
    const isAlreadyBatteryType =
      rawType.includes('SEMI GARMENT') ||
      rawType.includes('SEMI-GARMENT') ||
      rawType.includes('BATTERY') ||
      rawType.includes('POWERBANK')

    if (!isAlreadyBatteryType) {
      const shortName = rawComodity.includes('BATTERY') ? 'LAPTOP BATTERY' : 'BATTERY'
      return {
        isCommodityOverride: true,
        commodityOverrideDetail: `${shortName} ➔ SEMI GARMENT`,
      }
    }
  }

  // 2. Genuine iPad Override
  if (params.isIpadItem) {
    const isAlreadyIpadType = rawType.includes('IPAD') || rawType.includes('TABLET')
    if (!isAlreadyIpadType) {
      const isAir = params.modeStr?.toUpperCase().includes('AIR') || params.modeStr?.toUpperCase().includes('UDARA')
      const target = isAir ? 'TABLET' : 'KHUSUS IPAD'
      return {
        isCommodityOverride: true,
        commodityOverrideDetail: `IPAD ➔ ${target}`,
      }
    }
  }

  // 3. Genuine Laptop Override
  if (params.isLaptopItem) {
    const isAlreadyLaptopType =
      rawType.includes('LAPTOP') || rawType.includes('MACBOOK') || rawType.includes('NOTEBOOK')
    if (!isAlreadyLaptopType) {
      const isAir = params.modeStr?.toUpperCase().includes('AIR') || params.modeStr?.toUpperCase().includes('UDARA')
      const target = isAir ? (params.isApple ? 'APPLE LAPTOP' : 'LAPTOP') : 'LAPTOP'
      const source = params.isApple ? 'MACBOOK' : 'LAPTOP'
      return {
        isCommodityOverride: true,
        commodityOverrideDetail: `${source} ➔ ${target}`,
      }
    }
  }

  // 4. Pemetaan Eksplisit di tbCommodityMapping
  if (params.activeMappings && params.activeMappings.length > 0) {
    const custCodeUpper = (params.custCode || '').trim().toUpperCase()
    const isAirMode = params.modeStr ? (params.modeStr.toUpperCase().includes('AIR') || params.modeStr.toUpperCase().includes('UDARA')) : false
    const matchesMode = (m: any) => {
      if (!m.mode || m.mode.trim().toUpperCase() === 'ALL') return true
      const mMode = m.mode.trim().toUpperCase()
      if (isAirMode) return mMode.includes('AIR') || mMode.includes('UDARA')
      return mMode.includes('SEA') || mMode.includes('LAUT')
    }

    const isValidGadgetMapping = (m: any) => {
      const mUpper = String(m.commodityName || '').trim().toUpperCase()
      if (['LAPTOP', 'NOTEBOOK', 'MACBOOK', 'LAPTOPS'].includes(mUpper) && !isGenuineLaptop(rawComodity) && !isGenuineLaptop(rawType)) {
        return false
      }
      if (['IPAD', 'TABLET'].includes(mUpper) && !isGenuineIpad(rawComodity) && !isGenuineIpad(rawType)) {
        return false
      }
      const tUpper = String(m.targetCommodity || '').trim().toUpperCase()
      if (
        ['BATTERY', 'BATTERIES', 'LAPTOP BATTERY', 'POWERBANK', 'ACCU', 'AKI'].includes(mUpper) ||
        tUpper.includes('SEMI GARMENT') ||
        tUpper.includes('BATTERY') ||
        tUpper.includes('POWERBANK')
      ) {
        if (!isGenuineBattery(rawComodity) && !isGenuineBattery(rawType)) return false
      }
      return true
    }

    const mapping = params.activeMappings.find(
      (m) =>
        matchesMode(m) &&
        isValidGadgetMapping(m) &&
        (m.fdCustCode?.trim().toUpperCase() === custCodeUpper || !m.fdCustCode) &&
        (rawComodity === m.commodityName.trim().toUpperCase() || rawType === m.commodityName.trim().toUpperCase())
    )

    if (mapping) {
      const targetUpper = mapping.targetCommodity.trim().toUpperCase()
      if (targetUpper !== rawType && !rawType.includes(targetUpper)) {
        return {
          isCommodityOverride: true,
          commodityOverrideDetail: `${mapping.commodityName.trim().toUpperCase()} ➔ ${targetUpper}`,
        }
      }
    }
  }

  return { isCommodityOverride: false, commodityOverrideDetail: '' }
}

/**
 * Helper untuk memetakan Lokasi, Jenis, dan Kategori ke nama kolom fisik di tbCustomersHarga (dan tbCustomersHargaAudit).
 */
export function getHargaColumnName(lokasi: string, jenis: string, category: string): string | null {
  const loc = lokasi.charAt(0).toUpperCase() + lokasi.slice(1).toLowerCase()
  const jen = jenis.charAt(0).toUpperCase() + jenis.slice(1).toLowerCase()
  let cat = ''
  const cUpper = category.toUpperCase().trim()
  if (cUpper === 'UMUM') cat = 'Umum'
  else if (cUpper === 'TEKSTIL') cat = 'Tekstil'
  else if (cUpper === 'LARTAS - N' || cUpper === 'LARTAS N' || cUpper === 'LARTAS-N') cat = 'LartasN'
  else if (cUpper === 'LARTAS - S' || cUpper === 'LARTAS S' || cUpper === 'LARTAS-S') cat = 'LartasS'
  else if (cUpper === 'SEMI GARMENT' || cUpper === 'SEMI') cat = 'Semi'
  else if (cUpper === 'GARMENT') cat = 'Garment'
  else if (cUpper === 'GENERAL') cat = 'General'
  else if (cUpper === 'BRANDED') cat = 'Branded'
  else if (cUpper === 'FOOD') cat = 'Food'
  else if (cUpper === 'SHOES') cat = 'Shoes'
  else return null

  return `fd${loc}${jen}${cat}`
}

/**
 * Mengambil tarif khusus customer dari vwCustomersHargaUnpivot dan memprioritaskan
 * data log perubahan harga terbaru dari tbCustomersHargaAudit jika ada.
 */
export async function getCustomerTariffsWithAudit(custCode: string): Promise<any[]> {
  if (!custCode) return []
  return getBatchCustomerTariffsWithAudit([custCode])
}

/**
 * Mengambil tarif khusus banyak customer secara batch dengan memprioritaskan tbCustomersHargaAudit.
 */
export async function getBatchCustomerTariffsWithAudit(custCodes: string[]): Promise<any[]> {
  if (!custCodes || custCodes.length === 0) return []

  try {
    const [rawRows, auditLogs] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT
          a.fdCustCode as custCode,
          a.fdCustName as custName,
          c.fdBranchName as branchName,
          a.Lokasi as lokasi,
          a.jenis,
          b.fdListType as listType,
          b.fdTypeComodity as typeComodity,
          b.fdComodityName as comodityName,
          a.Category as category,
          a.Tarif as hargaAwal,
          a.UpdateDate as initialUpdateDate,
          RTRIM(a.UpdateBy) as initialUpdateBy
        FROM vwCustomersHargaUnpivot a WITH (NOLOCK)
        LEFT JOIN tbCabang c WITH (NOLOCK) ON a.Lokasi = c.fdBranchCode
        LEFT JOIN tbTypeComodity b WITH (NOLOCK)
          ON UPPER(LTRIM(RTRIM(b.fdComodityName))) = UPPER(LTRIM(RTRIM(a.Category)))
          AND (
            (a.Jenis IN ('SP','LR','PM') AND b.fdListType = 2)
            OR (a.Jenis IN ('UC','AS') AND b.fdListType = 1)
          )
        WHERE RTRIM(a.fdCustCode) IN (${Prisma.join(custCodes)})
      `,
      prisma.$queryRaw<any[]>`
        SELECT
          fdAuditID,
          RTRIM(fdCustCode) as fdCustCode,
          RTRIM(fdColumnName) as fdColumnName,
          RTRIM(fdOldValue) as fdOldValue,
          RTRIM(fdNewValue) as fdNewValue,
          RTRIM(fdUpdatedBy) as fdUpdatedBy,
          fdUpdateDate
        FROM tbCustomersHargaAudit WITH (NOLOCK)
        WHERE RTRIM(fdCustCode) IN (${Prisma.join(custCodes)})
        ORDER BY fdAuditID DESC
      `,
    ])

    const latestAuditMap = new Map<string, any>()
    for (const log of auditLogs) {
      const key = `${(log.fdCustCode || '').toUpperCase()}:${(log.fdColumnName || '').toUpperCase()}`
      if (!latestAuditMap.has(key)) {
        latestAuditMap.set(key, log)
      }
    }

    const finalTariffs: any[] = []
    for (const r of rawRows) {
      const colName = getHargaColumnName(r.lokasi || '', r.jenis || '', r.category || '')
      const key = `${(r.custCode || '').toUpperCase()}:${(colName || '').toUpperCase()}`
      const audit = colName ? latestAuditMap.get(key) : null

      let effectiveHarga = Number(r.hargaAwal || 0)
      let effectiveUpdateDate = r.initialUpdateDate ? new Date(r.initialUpdateDate).toISOString() : null
      let effectiveUpdateBy = r.initialUpdateBy || ''
      let isFromAudit = false

      if (audit) {
        const parsedNew = parseFloat(audit.fdNewValue || '0')
        effectiveHarga = isNaN(parsedNew) ? 0 : parsedNew
        effectiveUpdateDate = audit.fdUpdateDate ? new Date(audit.fdUpdateDate).toISOString() : effectiveUpdateDate
        effectiveUpdateBy = audit.fdUpdatedBy || effectiveUpdateBy
        isFromAudit = true
      }

      if (effectiveHarga > 0) {
        finalTariffs.push({
          custCode: r.custCode?.trim(),
          custName: r.custName?.trim(),
          branchName: r.branchName?.trim(),
          listType: r.listType,
          jenis: r.jenis?.trim(),
          typeComodity: r.typeComodity,
          comodityName: r.comodityName?.trim() || r.category?.trim(),
          harga: effectiveHarga,
          updateBy: effectiveUpdateBy,
          updateDate: effectiveUpdateDate,
          isFromAudit,
        })
      }
    }

    return finalTariffs
  } catch (err) {
    logger.error('[getBatchCustomerTariffsWithAudit] Error fetching customer tariffs with audit:', err)
    return []
  }
}

// ─── IN-MEMORY REFERENCE CACHE (TTL: 60 Detik) ───
interface ReferenceCacheData {
  mUploads: any[]
  cUploads: any[]
  activeMappings: any[]
  timestamp: number
}
const refCache = new Map<string, ReferenceCacheData>()

export function invalidatePriceCheckCache() {
  refCache.clear()
}

export async function getCachedReferenceData(modeStr: string): Promise<{ mUploads: any[]; cUploads: any[]; activeMappings: any[] }> {
  const now = Date.now()
  const cached = refCache.get(modeStr)
  if (cached && now - cached.timestamp < 60_000) {
    return cached
  }

  try {
    const [mUploads, cUploads, activeMappings] = await Promise.all([
      prisma.tbPriceListUpload.findMany({
        where: {
          status: { not: 'FAILED' },
          isSuperseded: false,
          items: { some: { mode: { contains: modeStr } } },
        },
        include: { items: true, markings: true },
        orderBy: { effectiveDate: 'desc' },
      }),
      prisma.tbCustomerPriceListUpload.findMany({
        where: {
          status: { not: 'FAILED' },
          isSuperseded: false,
          items: { some: { mode: { contains: modeStr } } },
        },
        include: { items: true, markings: true },
        orderBy: { effectiveDate: 'desc' },
      }),
      prisma.tbCommodityMapping.findMany({
        where: {
          OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
        },
        orderBy: [{ effectiveDate: 'desc' }],
      }),
    ])

    const entry: ReferenceCacheData = { mUploads, cUploads, activeMappings, timestamp: now }
    refCache.set(modeStr, entry)
    return entry
  } catch (err) {
    logger.error('[getCachedReferenceData] Error fetching reference data:', err)
    return {
      mUploads: cached?.mUploads || [],
      cUploads: cached?.cUploads || [],
      activeMappings: cached?.activeMappings || [],
    }
  }
}

/**
 * Evaluasi perbandingan harga untuk satu transaksi/item secara komprehensif.
 * Fungsi ini adalah Single Source of Truth yang digunakan di:
 * 1. Modal Detail Cek Kesesuaian Harga (TargetPriceCheckModal)
 * 2. API endpoint mandiri Cek Harga
 * 3. Halaman pengecekan tarif lainnya
 */
export async function evaluatePriceCheck(params: PriceCheckParams): Promise<UnifiedPriceCheckResult> {
  const listCode = params.listCode ? params.listCode.trim() : ''
  let markingCode = params.markingCode ? params.markingCode.trim() : ''
  let custCode = params.custCode ? params.custCode.trim() : ''
  let customerName = params.customer ? params.customer.trim() : ''
  let branch = params.branch ? params.branch.trim() : ''
  let sales = params.sales ? params.sales.trim() : ''
  let type = params.type ? params.type.trim() : ''
  let comodity = params.comodity ? params.comodity.trim() : ''
  const currentPrice = Number(params.harga || 0)
  let targetDate = params.targetDate ? new Date(params.targetDate) : new Date()

  // 1. Jika ada listCode, resolve informasi dari tbEntryList atau tbBilling
  let entryInfo: any = null
  if (listCode) {
    try {
      const entryRows = await prisma.$queryRaw<any[]>`
        SELECT TOP 1
          RTRIM(el.fdListCode) as listCode,
          RTRIM(el.fdCustCode) as custCode,
          RTRIM(el.fdMarkingCode) as markingCode,
          RTRIM(el.fdMarkingNo) as markingNo,
          RTRIM(el.fdBranchCode) as branchCode,
          el.fdListType as listType,
          el.fdTypeComodity as typeComodity,
          RTRIM(el.fdComodity) as comodityText,
          el.fdLoad as loadDate,
          el.fdTglAgent as tglAgent,
          RTRIM(tc.fdComodityName) as comodityName,
          RTRIM(c.fdCustName) as custName,
          ISNULL(c.fdBroker, 0) as fdBroker,
          RTRIM(c.fdSalesNM) as fdSalesNM
        FROM tbEntryList el WITH (NOLOCK)
        LEFT JOIN tbTypeComodity tc WITH (NOLOCK) ON tc.fdTypeComodity = el.fdTypeComodity AND tc.fdListType = el.fdListType
        LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = el.fdCustCode
        WHERE RTRIM(el.fdListCode) = ${listCode}
      `
      if (entryRows && entryRows[0]) {
        entryInfo = entryRows[0]
        if (!markingCode && entryInfo.markingCode) markingCode = entryInfo.markingCode
        if (!custCode && entryInfo.custCode) custCode = entryInfo.custCode
        if (!customerName && entryInfo.custName) customerName = entryInfo.custName
        if (!branch && entryInfo.branchCode) branch = entryInfo.branchCode
        if (!sales && entryInfo.fdSalesNM) sales = entryInfo.fdSalesNM
        if (!type && entryInfo.comodityName) type = entryInfo.comodityName
        if (!comodity && (entryInfo.comodityText || entryInfo.comodityName)) {
          comodity = entryInfo.comodityText || entryInfo.comodityName
        }
        if (entryInfo.tglAgent) targetDate = new Date(entryInfo.tglAgent)
      }
    } catch (err) {
      logger.warn('[evaluatePriceCheck] Error resolving listCode:', err)
    }
  }

  // 2. Resolve Customer Info & Status Broker
  let isBroker = false
  if (custCode || customerName) {
    try {
      const custRow = await prisma.tbCustomers.findFirst({
        where: {
          OR: [
            ...(custCode ? [{ fdCustCode: custCode }] : []),
            ...(customerName ? [{ fdCustName: customerName }] : []),
          ],
        },
        select: { fdCustCode: true, fdCustName: true, fdBroker: true, fdSalesNM: true },
      })
      if (custRow) {
        if (!custCode && custRow.fdCustCode) custCode = custRow.fdCustCode
        if (!customerName && custRow.fdCustName) customerName = custRow.fdCustName
        if (!sales && custRow.fdSalesNM) sales = custRow.fdSalesNM.trim()
        if (custRow.fdBroker === 1 || isMktCustomer(custRow, sales)) isBroker = true
      }
    } catch (err) {
      logger.warn('[evaluatePriceCheck] Error fetching customer info:', err)
    }
  }

  if (!isBroker) {
    if (isMktCustomer(null, sales)) {
      isBroker = true
    }
  }

  if (!isBroker) {
    const sUpper = sales.toUpperCase()
    const cUpper = customerName.toUpperCase()
    if (sUpper.includes('BROKER') || cUpper.includes('BROKER')) {
      isBroker = true
    }
  }


  // 4. Ambil profil tarif SP ERP (dbo.get_profile_harga_dari_listcode) jika ada listCode
  let profileTariff: any = null
  if (listCode) {
    try {
      const spRes = await prisma.$queryRaw<any[]>`
        EXEC dbo.get_profile_harga_dari_listcode ${listCode}
      `
      if (spRes && spRes[0]) {
        const auditInfo = await getCustomerHargaAuditInfo(spRes[0].fdCustCode || params.custCode || '')
        profileTariff = {
          harga: Number(spRes[0].Harga || 0),
          rasio: Number(spRes[0].Rasio || 0),
          typeTagihan: Number(spRes[0].fdTypeTagihan || 0),
          kg: Number(spRes[0].Kg || 0),
          minChargeM3: Number(spRes[0].MinChargeM3 || 0),
          minChargeKg: Number(spRes[0].MinChargeKG || 0),
          taxReturnPrice: Number(spRes[0].fdTaxReturnPrice || 0),
          taxReturnMinCharge: Number(spRes[0].fdTaxReturnMinCharge || 0),
          fdUpdate: auditInfo.fdUpdate,
          fdUpdateDate: auditInfo.fdUpdateDate,
          fdUpdateSource: auditInfo.source,
        }
      }
    } catch (err) {
      logger.warn('[evaluatePriceCheck] Error executing get_profile_harga_dari_listcode:', err)
    }
  }

  // ─── Deteksi Mode Pengiriman (Udara vs Laut) Secara Cerdas ───
  let resolvedMode = (params.mode || '').trim().toLowerCase()
  const markingUpper = markingCode.trim().toUpperCase()

  // A. Jika params.mode kosong atau 'all', deteksi dari entryInfo jika ada
  if (!resolvedMode || resolvedMode === 'all') {
    if (entryInfo?.listType === 1) resolvedMode = 'udara'
    else if (entryInfo?.listType === 2) resolvedMode = 'laut'
  }

  // B. Deteksi dari pola penamaan kode marking (26AGZ, AGZ, ASH, AYW, ASZ, AHK, ASG adalah Air/Udara)
  if (!resolvedMode || resolvedMode === 'all') {
    if (/^26A|^A[A-Z]{2}|AGZ|ASH|AYW|ASZ|AHK|ASG|AIR/i.test(markingUpper)) {
      resolvedMode = 'udara'
    }
  }

  // C. Deteksi dari tbMarking jika masih belum terdeteksi
  if ((!resolvedMode || resolvedMode === 'all') && markingUpper) {
    try {
      const mRow = await prisma.tbMarking.findFirst({
        where: { fdMarkingCode: markingCode },
        select: { fdListType: true },
      })
      if (mRow?.fdListType === 1) resolvedMode = 'udara'
      else if (mRow?.fdListType === 2) resolvedMode = 'laut'
    } catch {}
  }

  // Final mode: jika terdeteksi udara maka 'Air', jika tidak 'Sea'
  const isAirMode = resolvedMode.includes('udara') || resolvedMode.toUpperCase().includes('AIR')
  const modeStr = isAirMode ? 'Air' : 'Sea'
  const modeCategory = modeStr === 'Air' ? 'BY AIR' : 'BY SEA'
  const targetBranchCode = getNormalizedBranchCode(branch)

  // 5 & 6. Load Reference Data dari In-Memory Cache
  const { mUploads: allMasterUploads, cUploads: allCustUploads, activeMappings } = await getCachedReferenceData(modeStr)

  // Resolusi komoditas dan kandidat kategori untuk pencocokan bertingkat
  const resolvedComodity = resolveCommodityName(comodity, custCode, activeMappings, modeStr)
  const resolvedType = resolveCommodityName(type, custCode, activeMappings, modeStr)

  const isBatteryItem = !isAirMode && (isGenuineBattery(comodity) || isGenuineBattery(type))
  const isIpadItem = isGenuineIpad(comodity) || isGenuineIpad(type)
  const isLaptopItem = isGenuineLaptop(comodity) || isGenuineLaptop(type)
  const isApple = isAppleDevice(comodity) || isAppleDevice(type)

  const gadgetCandidates = isIpadItem
    ? (isAirMode
        ? ['TABLET (PRICE PER KG, MIN 3PCS)', 'TABLET', 'KHUSUS IPAD']
        : ['KHUSUS IPAD (PRICE PER PCS, MIN. CHARGE 3 PCS )', 'KHUSUS IPAD', 'TABLET (PRICE PER PCS, MIN. CHARGE 3PCS)', 'TABLET'])
    : isLaptopItem
      ? (isAirMode
          ? (isApple ? ['APPLE LAPTOP ( PER KG )', 'APPLE LAPTOP', 'LAPTOP'] : ['LAPTOP (SELAIN MEREK APPLE PRICE PER KG, MIN. 3PCS)', 'LAPTOP'])
          : ['LAPTOP (PRICE PER PCS, MIN. CHARGE 3 PCS)', 'LAPTOP'])
      : []

  const categoryCandidates = Array.from(
    new Set(
      [
        ...(isBatteryItem ? ['SEMI GARMENT'] : []),
        ...gadgetCandidates,
        resolvedComodity,
        resolvedType,
        type,
        comodity,
      ]
        .map((c) => (c || '').trim())
        .filter(Boolean)
    )
  )

  const targetCategoryToMatch = categoryCandidates[0] || ''

  // Helper pencocokan kategori bertingkat terhadap seluruh kandidat (comodity, type, remapped)
  const matchCategoryInItems = (items: any[], filterFn?: (it: any) => boolean) => {
    if (!items || items.length === 0) return null
    for (const cat of categoryCandidates) {
      const match = findBestCategoryMatch(items, cat, filterFn)
      if (match) return match
    }
    return null
  }

  // ─── 7. EKSEKUSI MESIN CEK HARGA (6-TIER WATERFALL) ───
  let dbPrice = 0
  let priceSource: PriceSourceType = 'NONE'
  let priceSourceLabel = 'Belum Ada Tarif Acuan'
  let appliedTier = 'NONE'
  let appliedTierLabel = 'Belum Ada Tarif'
  let matchedWith: 'CUSTOMER' | 'MASTER_CS' | 'MASTER_MKT' | 'NONE' = 'NONE'
  let isMarkingOverride = false
  let matchedMarkingCode: string | undefined = undefined
  let priceCS: number | null = null
  let priceMKT: number | null = null
  let effectiveDate: string | null = null
  let matchedCategory = targetCategoryToMatch
  let chosenMasterUpload: any = null
  let chosenCustUpload: any = null

  // ── TIER 1: Harga Customer Commodity (Manual Entry / Mapping Spesifik Customer) ──
  if (custCode && allCustUploads.length > 0) {
    const custUploads = allCustUploads.filter(
      (u) => u.fdCustCode?.trim().toUpperCase() === custCode.toUpperCase() && new Date(u.effectiveDate) <= targetDate
    )
    for (const u of custUploads) {
      const isManualEntry = (u.fileName || '').toUpperCase().includes('MANUAL_ENTRY')
      const matchedItem = matchCategoryInItems(u.items, (it: any) => {
        const mMatch = !it.mode || it.mode.toUpperCase().includes(modeStr.toUpperCase())
        const bMatch = !it.branch || getNormalizedBranchCode(it.branch) === targetBranchCode
        return mMatch && bMatch
      })

      const isCustomerMapped = activeMappings.some(
        (m) =>
          m.fdCustCode?.trim().toUpperCase() === custCode.toUpperCase() &&
          categoryCandidates.some(
            (c) =>
              c.toUpperCase() === m.commodityName?.trim().toUpperCase() ||
              c.toUpperCase() === m.targetCommodity?.trim().toUpperCase()
          )
      )

      if (matchedItem && Number(matchedItem.price) > 0 && (isManualEntry || isCustomerMapped)) {
        dbPrice = Number(matchedItem.price)
        priceSource = 'CUSTOMER_COMMODITY'
        priceSourceLabel = 'Tier 1: Harga Komoditi Khusus Customer'
        appliedTier = 'TIER_1_CUSTOMER_COMMODITY'
        appliedTierLabel = 'Tier 1: Customer Commodity'
        matchedWith = 'CUSTOMER'
        effectiveDate = u.effectiveDate ? new Date(u.effectiveDate).toISOString() : null
        matchedCategory = matchedItem.category
        chosenCustUpload = u
        break
      }
    }
  }

  // ── TIER 2: Harga Customer Marking (Marking Override Customer) ──
  if (dbPrice === 0 && custCode && markingUpper && allCustUploads.length > 0) {
    const custUploads = allCustUploads.filter(
      (u) => u.fdCustCode?.trim().toUpperCase() === custCode.toUpperCase() && new Date(u.effectiveDate) <= targetDate
    )
    for (const u of custUploads) {
      if (u.markings && u.markings.length > 0) {
        for (const m of u.markings) {
          if (m.markingCode) {
            const isGE = await isMarkingGreaterOrEqual(markingUpper, m.markingCode, modeCategory, targetBranchCode)
            if (isGE) {
              const matchedItem = matchCategoryInItems(u.items, (it: any) => {
                const mMatch = !it.mode || it.mode.toUpperCase().includes(modeStr.toUpperCase())
                const bMatch = !it.branch || getNormalizedBranchCode(it.branch) === targetBranchCode
                return mMatch && bMatch
              })
              if (matchedItem && Number(matchedItem.price) > 0) {
                dbPrice = Number(matchedItem.price)
                priceSource = 'CUSTOMER_MARKING'
                priceSourceLabel = `Tier 2: Tarif Khusus Customer (Marking Override: ${m.markingCode})`
                appliedTier = 'TIER_2_CUSTOMER_MARKING'
                appliedTierLabel = 'Tier 2: Customer Marking Override'
                matchedWith = 'CUSTOMER'
                isMarkingOverride = true
                matchedMarkingCode = m.markingCode
                effectiveDate = u.effectiveDate ? new Date(u.effectiveDate).toISOString() : null
                matchedCategory = matchedItem.category
                chosenCustUpload = u
                break
              }
            }
          }
        }
      }
      if (dbPrice > 0) break
    }
  }

  // ── TIER 3: Harga Customer Default (Default Upload) ──
  if (dbPrice === 0 && custCode && allCustUploads.length > 0) {
    const custDefaultUpload = allCustUploads.find(
      (u) => u.fdCustCode?.trim().toUpperCase() === custCode.toUpperCase() && new Date(u.effectiveDate) <= targetDate
    )
    if (custDefaultUpload && custDefaultUpload.items) {
      const matchedItem = matchCategoryInItems(custDefaultUpload.items, (it: any) => {
        const mMatch = !it.mode || it.mode.toUpperCase().includes(modeStr.toUpperCase())
        const bMatch = !it.branch || getNormalizedBranchCode(it.branch) === targetBranchCode
        return mMatch && bMatch
      })
      if (matchedItem && Number(matchedItem.price) > 0) {
        dbPrice = Number(matchedItem.price)
        priceSource = 'CUSTOMER_DEFAULT'
        priceSourceLabel = 'Tier 3: Tarif Khusus Customer (Default Upload)'
        appliedTier = 'TIER_3_CUSTOMER_DEFAULT'
        appliedTierLabel = 'Tier 3: Customer Default'
        matchedWith = 'CUSTOMER'
        effectiveDate = custDefaultUpload.effectiveDate ? new Date(custDefaultUpload.effectiveDate).toISOString() : null
        matchedCategory = matchedItem.category
        chosenCustUpload = custDefaultUpload
      }
    }
  }

  // ── TIER 4: Harga Commodity Global (Global Mapping / Special Commodity Master) ──
  const isGlobalCommodityCandidate =
    isBatteryItem ||
    isIpadItem ||
    isLaptopItem ||
    activeMappings.some(
      (m) =>
        !m.fdCustCode &&
        categoryCandidates.some(
          (c) =>
            c.toUpperCase() === m.commodityName?.trim().toUpperCase() ||
            c.toUpperCase() === m.targetCommodity?.trim().toUpperCase()
        )
    )

  if (dbPrice === 0 && isGlobalCommodityCandidate && allMasterUploads.length > 0) {
    const masterCandidates = allMasterUploads.filter((u) => new Date(u.effectiveDate) <= targetDate)
    const masterUpload = masterCandidates[0] || allMasterUploads[0]

    if (masterUpload?.items) {
      const targetCategoryCandidates = isBatteryItem
        ? ['SEMI GARMENT']
        : gadgetCandidates.length > 0
        ? gadgetCandidates
        : categoryCandidates

      const matchedItem = targetCategoryCandidates
        .map((cat) =>
          findBestCategoryMatch(masterUpload.items, cat, (it: any) => {
            const sMatch = it.sheetType?.toUpperCase() === (isBroker ? 'MKT' : 'CS')
            const mMatch = !it.mode || it.mode.toUpperCase().includes(modeStr.toUpperCase())
            const bMatch = !it.branch || getNormalizedBranchCode(it.branch) === targetBranchCode || it.branch.toUpperCase().includes(targetBranchCode)
            return sMatch && mMatch && bMatch
          })
        )
        .find((res) => res && Number(res.price) > 0)

      if (matchedItem) {
        dbPrice = Number(matchedItem.price)
        priceSource = 'GLOBAL_COMMODITY'
        priceSourceLabel = `Tier 4: Tarif Komoditi Khusus Global (${isBroker ? 'MKT' : 'CS'})`
        appliedTier = 'TIER_4_GLOBAL_COMMODITY'
        appliedTierLabel = `Tier 4: Global Commodity (${isBroker ? 'MKT' : 'CS'})`
        matchedWith = isBroker ? 'MASTER_MKT' : 'MASTER_CS'
        effectiveDate = masterUpload.effectiveDate ? new Date(masterUpload.effectiveDate).toISOString() : null
        matchedCategory = matchedItem.category
        chosenMasterUpload = masterUpload
      }
    }
  }

  // ── TIER 5: Harga Marking Global (Master Marking Override) ──
  let generalMarkingOverrideUpload: any = null
  let generalMatchedMarking: string | undefined = undefined

  if (dbPrice === 0 && markingUpper && allMasterUploads.length > 0) {
    for (const u of allMasterUploads) {
      if (u.markings && u.markings.length > 0) {
        for (const m of u.markings) {
          if (m.markingCode) {
            const isGE = await isMarkingGreaterOrEqual(markingUpper, m.markingCode, modeCategory, targetBranchCode)
            if (isGE) {
              generalMarkingOverrideUpload = u
              generalMatchedMarking = m.markingCode
              break
            }
          }
        }
      }
      if (generalMarkingOverrideUpload) break
    }
  }

  if (dbPrice === 0 && generalMarkingOverrideUpload) {
    chosenMasterUpload = generalMarkingOverrideUpload
    effectiveDate = generalMarkingOverrideUpload.effectiveDate
      ? new Date(generalMarkingOverrideUpload.effectiveDate).toISOString()
      : null

    const csItem = matchCategoryInItems(generalMarkingOverrideUpload.items, (it: any) => {
      const sMatch = it.sheetType?.toUpperCase() === 'CS'
      const mMatch = !it.mode || it.mode.toUpperCase().includes(modeStr.toUpperCase())
      const bMatch = !it.branch || getNormalizedBranchCode(it.branch) === targetBranchCode || it.branch.toUpperCase().includes(targetBranchCode)
      return sMatch && mMatch && bMatch
    })
    const mktItem = matchCategoryInItems(generalMarkingOverrideUpload.items, (it: any) => {
      const sMatch = it.sheetType?.toUpperCase() === 'MKT'
      const mMatch = !it.mode || it.mode.toUpperCase().includes(modeStr.toUpperCase())
      const bMatch = !it.branch || getNormalizedBranchCode(it.branch) === targetBranchCode || it.branch.toUpperCase().includes(targetBranchCode)
      return sMatch && mMatch && bMatch
    })

    priceCS = csItem ? Number(csItem.price) : null
    priceMKT = mktItem ? Number(mktItem.price) : null

    const selectedItem = isBroker ? mktItem : csItem
    if (selectedItem && Number(selectedItem.price) > 0) {
      dbPrice = Number(selectedItem.price)
      priceSource = isBroker ? 'MASTER_MKT_OVERRIDE' : 'MASTER_CS_OVERRIDE'
      priceSourceLabel = `Tier 5: Tarif Price List Umum (Marking Override: ${generalMatchedMarking} - ${isBroker ? 'MKT' : 'CS'})`
      appliedTier = 'TIER_5_GLOBAL_MARKING'
      appliedTierLabel = `Tier 5: Master Marking Override (${isBroker ? 'MKT' : 'CS'})`
      matchedWith = isBroker ? 'MASTER_MKT' : 'MASTER_CS'
      isMarkingOverride = true
      matchedMarkingCode = generalMatchedMarking
      matchedCategory = selectedItem.category
    }
  }

  // ── TIER 6: Master MKT / CS Standar Global ──
  if (dbPrice === 0 && allMasterUploads.length > 0) {
    const masterCandidates = allMasterUploads.filter((u) => new Date(u.effectiveDate) <= targetDate)
    const masterUpload = masterCandidates[0] || allMasterUploads[0]
    chosenMasterUpload = masterUpload
    effectiveDate = masterUpload.effectiveDate ? new Date(masterUpload.effectiveDate).toISOString() : null

    const csItem = matchCategoryInItems(masterUpload.items, (it: any) => {
      const sMatch = it.sheetType?.toUpperCase() === 'CS'
      const mMatch = !it.mode || it.mode.toUpperCase().includes(modeStr.toUpperCase())
      const bMatch = !it.branch || getNormalizedBranchCode(it.branch) === targetBranchCode || it.branch.toUpperCase().includes(targetBranchCode)
      return sMatch && mMatch && bMatch
    })
    const mktItem = matchCategoryInItems(masterUpload.items, (it: any) => {
      const sMatch = it.sheetType?.toUpperCase() === 'MKT'
      const mMatch = !it.mode || it.mode.toUpperCase().includes(modeStr.toUpperCase())
      const bMatch = !it.branch || getNormalizedBranchCode(it.branch) === targetBranchCode || it.branch.toUpperCase().includes(targetBranchCode)
      return sMatch && mMatch && bMatch
    })

    priceCS = csItem ? Number(csItem.price) : null
    priceMKT = mktItem ? Number(mktItem.price) : null

    const selectedItem = isBroker ? mktItem : csItem
    if (selectedItem && Number(selectedItem.price) > 0) {
      dbPrice = Number(selectedItem.price)
      priceSource = isBroker ? 'MASTER_MKT' : 'MASTER_CS'
      priceSourceLabel = `Tier 6: Tarif Price List Umum Standar (${isBroker ? 'MKT' : 'CS'})`
      appliedTier = isBroker ? 'TIER_6_MASTER_MKT' : 'TIER_6_MASTER_CS'
      appliedTierLabel = isBroker ? 'Tier 6: Master MKT (Broker)' : 'Tier 6: Master CS (Non-Broker)'
      matchedWith = isBroker ? 'MASTER_MKT' : 'MASTER_CS'
      matchedCategory = selectedItem.category
    }
  }

  // Pastikan harga CS dan MKT terisi dari Master Upload aktif untuk kebutuhan visualisasi pembanding
  if ((!priceCS || !priceMKT) && allMasterUploads.length > 0) {
    const fallbackMaster = chosenMasterUpload || allMasterUploads[0]
    if (fallbackMaster?.items) {
      if (!priceCS) {
        const cs = matchCategoryInItems(fallbackMaster.items, (it: any) => it.sheetType?.toUpperCase() === 'CS' && (!it.mode || it.mode.toUpperCase().includes(modeStr.toUpperCase())))
        if (cs) priceCS = Number(cs.price)
      }
      if (!priceMKT) {
        const mkt = matchCategoryInItems(fallbackMaster.items, (it: any) => it.sheetType?.toUpperCase() === 'MKT' && (!it.mode || it.mode.toUpperCase().includes(modeStr.toUpperCase())))
        if (mkt) priceMKT = Number(mkt.price)
      }
    }
  }

  // 8. Evaluasi Status Kesesuaian Harga & Penegakan Undercharge / Overcharge
  let status: PriceStatus = 'NO_RATE'
  let statusLabel = 'Belum Ada Acuan'
  let statusDescription = 'Belum ditemukan acuan tarif yang sesuai di sistem.'
  let isUndercharge = false
  let isOvercharge = false
  let validationVerdict: 'MATCH' | 'UNDERCHARGE_WARNING' | 'OVERCHARGE_WARNING' | 'NO_RATE' = 'NO_RATE'

  const diff = currentPrice > 0 && dbPrice > 0 ? currentPrice - dbPrice : 0

  if (dbPrice === 0) {
    status = 'NO_RATE'
    statusLabel = 'Belum Ada Harga'
    statusDescription = 'Tarif belum ditentukan di Price List (6-Tier Waterfall).'
    validationVerdict = 'NO_RATE'
  } else if (currentPrice === 0) {
    status = 'NOT_SET'
    statusLabel = 'Harga Belum Diisi'
    statusDescription = `Harga saat ini masih Rp 0. Acuan database adalah Rp ${dbPrice.toLocaleString('id-ID')} (${priceSourceLabel}).`
    isUndercharge = true
    validationVerdict = 'UNDERCHARGE_WARNING'
  } else if (Math.abs(diff) < 1) {
    status = 'MATCH'
    statusLabel = 'Harga Sesuai Price List'
    statusDescription = `Harga saat ini (Rp ${currentPrice.toLocaleString('id-ID')}) SESUAI dengan acuan ${priceSourceLabel}.`
    validationVerdict = 'MATCH'
  } else if (diff > 0) {
    status = 'DIFFERENT'
    statusLabel = 'Harga di Atas Acuan (Overcharge)'
    statusDescription = `Harga saat ini (Rp ${currentPrice.toLocaleString('id-ID')}) berada DI ATAS acuan database Rp ${dbPrice.toLocaleString('id-ID')} (${priceSourceLabel}). Selisih: +Rp ${diff.toLocaleString('id-ID')}.`
    isOvercharge = true
    validationVerdict = 'OVERCHARGE_WARNING'
  } else {
    status = 'DIFFERENT'
    statusLabel = 'Harga di Bawah Acuan (Undercharge)'
    statusDescription = `Harga saat ini (Rp ${currentPrice.toLocaleString('id-ID')}) berada DI BAWAH acuan database Rp ${dbPrice.toLocaleString('id-ID')} (${priceSourceLabel}). Selisih: -Rp ${Math.abs(diff).toLocaleString('id-ID')}.`
    isUndercharge = true
    validationVerdict = 'UNDERCHARGE_WARNING'
  }

  // Deteksi Override Komoditas (misal: genuine battery dialihkan ke SEMI GARMENT, iPad/Laptop, atau dynamic mapping)
  const { isCommodityOverride, commodityOverrideDetail } = determineCommodityOverride({
    comodityStr: comodity,
    typeStr: type,
    isBatteryItem,
    isIpadItem,
    isLaptopItem,
    isApple,
    modeStr,
    activeMappings,
    custCode,
  })

  return {
    currentPrice,
    dbPrice,
    difference: diff,
    status,
    statusLabel,
    statusDescription,
    appliedTier,
    appliedTierLabel,
    priceSource,
    priceSourceLabel,
    matchedWith,
    isBroker,
    isMarkingOverride,
    matchedMarkingCode,
    isCommodityOverride,
    commodityOverrideDetail,
    priceCS,
    priceMKT,
    effectiveDate,
    matchedCategory,
    resolvedCommodity: targetCategoryToMatch,
    currentType: type || entryInfo?.comodityName || '',
    currentComodityText: comodity || entryInfo?.comodityText || '',
    sales: sales || entryInfo?.fdSalesNM || '',
    branch: branch || entryInfo?.branchCode || '',
    markingCode: markingCode || entryInfo?.markingCode || '',
    customer: customerName || entryInfo?.custName || '',
    custCode: custCode || entryInfo?.custCode || '',
    tglAgen: entryInfo?.tglAgent ? new Date(entryInfo.tglAgent).toISOString() : null,
    customerPriceList: chosenCustUpload ? { uploadId: chosenCustUpload.id, fileName: chosenCustUpload.fileName, effectiveDate: chosenCustUpload.effectiveDate, items: chosenCustUpload.items } : null,
    masterPriceList: chosenMasterUpload ? { uploadId: chosenMasterUpload.id, fileName: chosenMasterUpload.fileName, effectiveDate: chosenMasterUpload.effectiveDate, items: chosenMasterUpload.items } : null,
    customerTariffs: [],
    matchedTariff: null,
    profileTariff,
    listCode: listCode || entryInfo?.listCode || undefined,
    mode: isAirMode ? 'UDARA' : 'LAUT',
    isUndercharge,
    isOvercharge,
    validationVerdict,
  }
}

/**
 * Evaluasi Batch Price Check untuk efisiensi tabel (Target Billing).
 * Menjalankan evaluasi in-memory secara sinkron dengan single-query preloading.
 */
export async function evaluateBatchPriceCheck(
  items: PriceCheckParams[],
  mode: 'udara' | 'laut'
): Promise<Map<string, UnifiedPriceCheckResult>> {
  const resultMap = new Map<string, UnifiedPriceCheckResult>()
  if (!items || items.length === 0) return resultMap

  const modeStr = mode === 'laut' ? 'Sea' : 'Air'
  const modeCategory = mode === 'laut' ? 'BY SEA' : 'BY AIR'

  const distinctMarkings = Array.from(new Set(items.map((it) => it.markingCode?.trim()).filter(Boolean) as string[]))
  const distinctCustCodes = Array.from(new Set(items.map((it) => it.custCode?.trim()).filter(Boolean) as string[]))
  const distinctCustNames = Array.from(new Set(items.map((it) => it.customer?.trim()).filter(Boolean) as string[]))

  // Single preloading query: Reference data is loaded from in-memory cache
  const [{ mUploads, cUploads, activeMappings }, markingRows, brokerRows] = await Promise.all([
    getCachedReferenceData(modeStr),
    distinctMarkings.length > 0
      ? prisma.$queryRaw<any[]>`
          SELECT RTRIM(fdMarkingCode) AS code, RTRIM(fdBranchCode) AS branch, fdListType, fdLoadDate
          FROM tbMarking WITH (NOLOCK)
          WHERE RTRIM(fdMarkingCode) IN (${Prisma.join(distinctMarkings)})
        `
      : Promise.resolve([]),
    distinctCustCodes.length > 0 || distinctCustNames.length > 0
      ? prisma.tbCustomers.findMany({
          where: {
            OR: [
              ...(distinctCustCodes.length > 0 ? [{ fdCustCode: { in: distinctCustCodes } }] : []),
              ...(distinctCustNames.length > 0 ? [{ fdCustName: { in: distinctCustNames } }] : []),
            ],
          },
          select: { fdCustCode: true, fdCustName: true, fdBroker: true, fdSalesNM: true },
        })
      : Promise.resolve([]),
  ])

  // Bangun markingInfoMap
  const markingInfoMap = new Map<string, any>()
  for (const m of markingRows) {
    if (m.code) {
      markingInfoMap.set(m.code.trim().toUpperCase(), {
        branch: m.branch ? m.branch.trim().toUpperCase() : null,
        listType: m.fdListType ? Number(m.fdListType) : null,
        loadDate: m.fdLoadDate ? new Date(m.fdLoadDate) : null,
      })
    }
  }

  // Bangun customerBrokerMap
  const customerBrokerMap = new Map<string, number>()
  for (const br of brokerRows) {
    const isMkt = br.fdBroker === 1 || isMktCustomer(br, br.fdSalesNM)
    if (br.fdCustCode) customerBrokerMap.set(br.fdCustCode.trim().toUpperCase(), isMkt ? 1 : 0)
    if (br.fdCustName) customerBrokerMap.set(br.fdCustName.trim().toUpperCase(), isMkt ? 1 : 0)
  }

  // Helper isMarkingGE
  const isMarkingGE = (shipmentCode: string, overrideCode: string): boolean => {
    const s = shipmentCode.trim().toUpperCase()
    const o = overrideCode.trim().toUpperCase()
    if (s === o) return true

    // Validasi prefix 4 karakter (misal '26GZ', '26SG') - beda cabang tidak boleh dibanding
    const sPrefix = s.slice(0, 4)
    const oPrefix = o.slice(0, 4)
    if (sPrefix && oPrefix && sPrefix !== oPrefix) {
      return false
    }

    const sInfo = markingInfoMap.get(s)
    const oInfo = markingInfoMap.get(o)
    if (sInfo?.branch && oInfo?.branch && sInfo.branch !== oInfo.branch) {
      return false
    }
    if (sInfo?.loadDate && oInfo?.loadDate) {
      return sInfo.loadDate.getTime() >= oInfo.loadDate.getTime()
    }
    return s >= o
  }

  // Evaluasi setiap item
  for (let idx = 0; idx < items.length; idx++) {
    const it = items[idx]!
    const key = String(idx)
    const custCode = (it.custCode || '').trim()
    const customerName = (it.customer || '').trim()
    const markingUpper = (it.markingCode || '').trim().toUpperCase()
    const branchUpper = (it.branch || '').trim().toUpperCase()
    const targetBranchCode = getNormalizedBranchCode(branchUpper)
    const currentPrice = Number(it.harga || 0)
    const targetDate = it.targetDate ? new Date(it.targetDate) : new Date()
    let actualMatchedCategory = ''

    const comodityStr = (it.comodity || '').trim().toUpperCase()
    const typeStr = (it.type || '').trim().toUpperCase()
    const resolvedComodity = resolveCommodityName(comodityStr, custCode, activeMappings, modeStr)
    const resolvedType = resolveCommodityName(typeStr, custCode, activeMappings, modeStr)

    const isBatteryItem = modeStr !== 'Air' && (isGenuineBattery(comodityStr) || isGenuineBattery(typeStr))
    const isIpadItem = isGenuineIpad(comodityStr) || isGenuineIpad(typeStr)
    const isLaptopItem = isGenuineLaptop(comodityStr) || isGenuineLaptop(typeStr)
    const isApple = isAppleDevice(comodityStr) || isAppleDevice(typeStr)

    const gadgetCandidates = isIpadItem
      ? (modeStr === 'Air'
          ? ['TABLET (PRICE PER KG, MIN 3PCS)', 'TABLET', 'KHUSUS IPAD']
          : ['KHUSUS IPAD (PRICE PER PCS, MIN. CHARGE 3 PCS )', 'KHUSUS IPAD', 'TABLET (PRICE PER PCS, MIN. CHARGE 3PCS)', 'TABLET'])
      : isLaptopItem
        ? (modeStr === 'Air'
            ? (isApple ? ['APPLE LAPTOP ( PER KG )', 'APPLE LAPTOP', 'LAPTOP'] : ['LAPTOP (SELAIN MEREK APPLE PRICE PER KG, MIN. 3PCS)', 'LAPTOP'])
            : ['LAPTOP (PRICE PER PCS, MIN. CHARGE 3 PCS)', 'LAPTOP'])
        : []

    // Prioritaskan nama komoditas spesifik jika ada mapping khusus (misal LAPTOP BATTERY -> SEMI GARMENT, atau IPAD / LAPTOP)
    const categoryCandidates = Array.from(
      new Set(
        [
          ...(isBatteryItem ? ['SEMI GARMENT'] : []),
          ...gadgetCandidates,
          resolvedComodity,
          resolvedType,
          typeStr,
          comodityStr,
        ]
          .map((c) => (c || '').trim())
          .filter(Boolean)
      )
    )

    const targetCategory = categoryCandidates[0] || ''

    const matchCategoryInItems = (itemList: any[], filterFn?: (item: any) => boolean) => {
      if (!itemList || itemList.length === 0) return null
      for (const cat of categoryCandidates) {
        const match = findBestCategoryMatch(itemList, cat, filterFn)
        if (match) return match
      }
      return null
    }

    let isBroker = false
    if (custCode && customerBrokerMap.get(custCode.toUpperCase()) === 1) isBroker = true
    if (customerName && customerBrokerMap.get(customerName.toUpperCase()) === 1) isBroker = true
    if (isMktCustomer({ sales: it.sales, fdSalesNM: it.sales }, it.sales)) isBroker = true
    if ((it.sales || '').toUpperCase().includes('BROKER') || customerName.toUpperCase().includes('BROKER')) {
      isBroker = true
    }

    let dbPrice = 0
    let priceSource: PriceSourceType = 'NONE'
    let priceSourceLabel = 'Belum Ada Acuan'
    let appliedTier = 'NONE'
    let appliedTierLabel = 'Belum Ada Tarif'
    let matchedWith: 'CUSTOMER' | 'MASTER_CS' | 'MASTER_MKT' | 'NONE' = 'NONE'
    let isMarkingOverride = false
    let matchedMarkingCode: string | undefined = undefined
    let priceCS: number | null = null
    let priceMKT: number | null = null

    // ── TIER 1: Harga Customer Commodity (Manual Entry / Mapping Spesifik Customer) ──
    if (custCode && cUploads.length > 0) {
      const custUploads = cUploads.filter(
        (u) => u.fdCustCode?.trim().toUpperCase() === custCode.toUpperCase() && new Date(u.effectiveDate) <= targetDate
      )
      for (const u of custUploads) {
        const isManualEntry = (u.fileName || '').toUpperCase().includes('MANUAL_ENTRY')
        const matchedItem = matchCategoryInItems(u.items, (item: any) => {
          const mMatch = !item.mode || item.mode.toUpperCase().includes(modeStr.toUpperCase())
          const bMatch = !item.branch || getNormalizedBranchCode(item.branch) === targetBranchCode
          return mMatch && bMatch
        })

        const isCustomerMapped = activeMappings.some(
          (m) =>
            m.fdCustCode?.trim().toUpperCase() === custCode.toUpperCase() &&
            categoryCandidates.some(
              (c) =>
                c.toUpperCase() === m.commodityName?.trim().toUpperCase() ||
                c.toUpperCase() === m.targetCommodity?.trim().toUpperCase()
            )
        )

        if (matchedItem && Number(matchedItem.price) > 0 && (isManualEntry || isCustomerMapped)) {
          dbPrice = Number(matchedItem.price)
          actualMatchedCategory = matchedItem.category || ''
          priceSource = 'CUSTOMER_COMMODITY'
          priceSourceLabel = 'Tier 1: Harga Komoditi Khusus Customer'
          appliedTier = 'TIER_1_CUSTOMER_COMMODITY'
          appliedTierLabel = 'Tier 1: Customer Commodity'
          matchedWith = 'CUSTOMER'
          break
        }
      }
    }

    // ── TIER 2: Harga Customer Marking (Marking Override Customer) ──
    if (dbPrice === 0 && custCode && markingUpper && cUploads.length > 0) {
      const custUploads = cUploads.filter(
        (u) => u.fdCustCode?.trim().toUpperCase() === custCode.toUpperCase() && new Date(u.effectiveDate) <= targetDate
      )
      for (const u of custUploads) {
        if (u.markings && u.markings.length > 0) {
          for (const m of u.markings) {
            if (m.markingCode && isMarkingGE(markingUpper, m.markingCode)) {
              const matchedItem = matchCategoryInItems(u.items, (item: any) => {
                const mMatch = !item.mode || item.mode.toUpperCase().includes(modeStr.toUpperCase())
                const bMatch = !item.branch || getNormalizedBranchCode(item.branch) === targetBranchCode
                return mMatch && bMatch
              })
              if (matchedItem && Number(matchedItem.price) > 0) {
                dbPrice = Number(matchedItem.price)
                actualMatchedCategory = matchedItem.category || ''
                priceSource = 'CUSTOMER_MARKING'
                priceSourceLabel = `Tier 2: Tarif Khusus Customer (Marking: ${m.markingCode})`
                appliedTier = 'TIER_2_CUSTOMER_MARKING'
                appliedTierLabel = 'Tier 2: Customer Marking Override'
                matchedWith = 'CUSTOMER'
                isMarkingOverride = true
                matchedMarkingCode = m.markingCode
                break
              }
            }
          }
        }
        if (dbPrice > 0) break
      }
    }

    // ── TIER 3: Harga Customer Default (Default Upload) ──
    if (dbPrice === 0 && custCode && cUploads.length > 0) {
      const custDefaultUpload = cUploads.find(
        (u) => u.fdCustCode?.trim().toUpperCase() === custCode.toUpperCase() && new Date(u.effectiveDate) <= targetDate
      )
      if (custDefaultUpload?.items) {
        const matchedItem = matchCategoryInItems(custDefaultUpload.items, (item: any) => {
          const mMatch = !item.mode || item.mode.toUpperCase().includes(modeStr.toUpperCase())
          const bMatch = !item.branch || getNormalizedBranchCode(item.branch) === targetBranchCode
          return mMatch && bMatch
        })
        if (matchedItem && Number(matchedItem.price) > 0) {
          dbPrice = Number(matchedItem.price)
          actualMatchedCategory = matchedItem.category || ''
          priceSource = 'CUSTOMER_DEFAULT'
          priceSourceLabel = 'Tier 3: Tarif Khusus Customer (Default Upload)'
          appliedTier = 'TIER_3_CUSTOMER_DEFAULT'
          appliedTierLabel = 'Tier 3: Customer Default'
          matchedWith = 'CUSTOMER'
        }
      }
    }

    // ── TIER 4: Harga Commodity Global (Global Mapping / Special Commodity Master) ──
    const isGlobalCommodityCandidate =
      isBatteryItem ||
      isIpadItem ||
      isLaptopItem ||
      activeMappings.some(
        (m) =>
          !m.fdCustCode &&
          categoryCandidates.some(
            (c) =>
              c.toUpperCase() === m.commodityName?.trim().toUpperCase() ||
              c.toUpperCase() === m.targetCommodity?.trim().toUpperCase()
          )
      )

    if (dbPrice === 0 && isGlobalCommodityCandidate && mUploads.length > 0) {
      const masterCandidates = mUploads.filter((u) => new Date(u.effectiveDate) <= targetDate)
      const masterUpload = masterCandidates[0] || mUploads[0]

      if (masterUpload?.items) {
        const targetCategoryCandidates = isBatteryItem
          ? ['SEMI GARMENT']
          : gadgetCandidates.length > 0
          ? gadgetCandidates
          : categoryCandidates

        const matchedItem = targetCategoryCandidates
          .map((cat) =>
            findBestCategoryMatch(masterUpload.items, cat, (item: any) => {
              const sMatch = item.sheetType?.toUpperCase() === (isBroker ? 'MKT' : 'CS')
              const mMatch = !item.mode || item.mode.toUpperCase().includes(modeStr.toUpperCase())
              const bMatch = !item.branch || getNormalizedBranchCode(item.branch) === targetBranchCode || item.branch.toUpperCase().includes(targetBranchCode)
              return sMatch && mMatch && bMatch
            })
          )
          .find((res) => res && Number(res.price) > 0)

        if (matchedItem) {
          dbPrice = Number(matchedItem.price)
          actualMatchedCategory = matchedItem.category || ''
          priceSource = 'GLOBAL_COMMODITY'
          priceSourceLabel = `Tier 4: Tarif Komoditi Khusus Global (${isBroker ? 'MKT' : 'CS'})`
          appliedTier = 'TIER_4_GLOBAL_COMMODITY'
          appliedTierLabel = `Tier 4: Global Commodity (${isBroker ? 'MKT' : 'CS'})`
          matchedWith = isBroker ? 'MASTER_MKT' : 'MASTER_CS'
        }
      }
    }

    // ── TIER 5: Harga Marking Global (Master Marking Override) ──
    let genOverrideUpload: any = null
    let genMatchedMarking: string | undefined = undefined

    if (dbPrice === 0 && markingUpper && mUploads.length > 0) {
      for (const u of mUploads) {
        if (u.markings && u.markings.length > 0) {
          for (const m of u.markings) {
            if (m.markingCode && isMarkingGE(markingUpper, m.markingCode)) {
              genOverrideUpload = u
              genMatchedMarking = m.markingCode
              break
            }
          }
        }
        if (genOverrideUpload) break
      }
    }

    if (dbPrice === 0 && genOverrideUpload) {
      const csItem = matchCategoryInItems(genOverrideUpload.items, (item: any) => {
        const sMatch = item.sheetType?.toUpperCase() === 'CS'
        const mMatch = !item.mode || item.mode.toUpperCase().includes(modeStr.toUpperCase())
        const bMatch = !item.branch || getNormalizedBranchCode(item.branch) === targetBranchCode || item.branch.toUpperCase().includes(targetBranchCode)
        return sMatch && mMatch && bMatch
      })
      const mktItem = matchCategoryInItems(genOverrideUpload.items, (item: any) => {
        const sMatch = item.sheetType?.toUpperCase() === 'MKT'
        const mMatch = !item.mode || item.mode.toUpperCase().includes(modeStr.toUpperCase())
        const bMatch = !item.branch || getNormalizedBranchCode(item.branch) === targetBranchCode || item.branch.toUpperCase().includes(targetBranchCode)
        return sMatch && mMatch && bMatch
      })

      priceCS = csItem ? Number(csItem.price) : null
      priceMKT = mktItem ? Number(mktItem.price) : null

      const selectedItem = isBroker ? mktItem : csItem
      if (selectedItem && Number(selectedItem.price) > 0) {
        dbPrice = Number(selectedItem.price)
        actualMatchedCategory = selectedItem.category || ''
        priceSource = isBroker ? 'MASTER_MKT_OVERRIDE' : 'MASTER_CS_OVERRIDE'
        priceSourceLabel = `Tier 5: Master Marking Override (${isBroker ? 'MKT' : 'CS'})`
        appliedTier = 'TIER_5_GLOBAL_MARKING'
        appliedTierLabel = `Tier 5: Master Marking Override (${isBroker ? 'MKT' : 'CS'})`
        matchedWith = isBroker ? 'MASTER_MKT' : 'MASTER_CS'
        isMarkingOverride = true
        matchedMarkingCode = genMatchedMarking
      }
    }

    // ── TIER 6: Master MKT / CS Standar Global ──
    if (dbPrice === 0 && mUploads.length > 0) {
      const masterCandidates = mUploads.filter((u) => new Date(u.effectiveDate) <= targetDate)
      const masterUpload = masterCandidates[0] || mUploads[0]

      if (masterUpload?.items) {
        const csItem = matchCategoryInItems(masterUpload.items, (item: any) => {
          const sMatch = item.sheetType?.toUpperCase() === 'CS'
          const mMatch = !item.mode || item.mode.toUpperCase().includes(modeStr.toUpperCase())
          const bMatch = !item.branch || getNormalizedBranchCode(item.branch) === targetBranchCode || item.branch.toUpperCase().includes(targetBranchCode)
          return sMatch && mMatch && bMatch
        })
        const mktItem = matchCategoryInItems(masterUpload.items, (item: any) => {
          const sMatch = item.sheetType?.toUpperCase() === 'MKT'
          const mMatch = !item.mode || item.mode.toUpperCase().includes(modeStr.toUpperCase())
          const bMatch = !item.branch || getNormalizedBranchCode(item.branch) === targetBranchCode || item.branch.toUpperCase().includes(targetBranchCode)
          return sMatch && mMatch && bMatch
        })

        priceCS = csItem ? Number(csItem.price) : null
        priceMKT = mktItem ? Number(mktItem.price) : null

        const selectedItem = isBroker ? mktItem : csItem
        if (selectedItem && Number(selectedItem.price) > 0) {
          dbPrice = Number(selectedItem.price)
          actualMatchedCategory = selectedItem.category || ''
          priceSource = isBroker ? 'MASTER_MKT' : 'MASTER_CS'
          priceSourceLabel = `Tier 6: Master MKT / CS Standar (${isBroker ? 'MKT' : 'CS'})`
          appliedTier = isBroker ? 'TIER_6_MASTER_MKT' : 'TIER_6_MASTER_CS'
          appliedTierLabel = isBroker ? 'Tier 6: Master MKT (Broker)' : 'Tier 6: Master CS (Non-Broker)'
          matchedWith = isBroker ? 'MASTER_MKT' : 'MASTER_CS'
        }
      }
    }

    // Status evaluation & Undercharge / Overcharge flags
    let status: PriceStatus = 'NO_RATE'
    let statusLabel = 'Belum Ada Acuan'
    let statusDescription = 'Belum ditemukan acuan tarif yang sesuai di sistem.'
    let isUndercharge = false
    let isOvercharge = false
    let validationVerdict: 'MATCH' | 'UNDERCHARGE_WARNING' | 'OVERCHARGE_WARNING' | 'NO_RATE' = 'NO_RATE'
    const diff = currentPrice > 0 && dbPrice > 0 ? currentPrice - dbPrice : 0

    if (dbPrice === 0) {
      status = 'NO_RATE'
      statusLabel = 'Belum Ada Harga'
      statusDescription = 'Tarif belum ditentukan di database Price List (6-Tier Waterfall).'
      validationVerdict = 'NO_RATE'
    } else if (currentPrice === 0) {
      status = 'NOT_SET'
      statusLabel = 'Harga Belum Diisi'
      statusDescription = `Harga saat ini masih Rp 0. Acuan database adalah Rp ${dbPrice.toLocaleString('id-ID')}.`
      isUndercharge = true
      validationVerdict = 'UNDERCHARGE_WARNING'
    } else if (Math.abs(diff) < 1) {
      status = 'MATCH'
      statusLabel = 'Harga Sesuai'
      statusDescription = `Harga saat ini (Rp ${currentPrice.toLocaleString('id-ID')}) SESUAI dengan database.`
      validationVerdict = 'MATCH'
    } else if (diff > 0) {
      status = 'DIFFERENT'
      statusLabel = 'Harga di Atas Acuan (Overcharge)'
      statusDescription = `Harga saat ini (Rp ${currentPrice.toLocaleString('id-ID')}) di ATAS database Rp ${dbPrice.toLocaleString('id-ID')} (+Rp ${diff.toLocaleString('id-ID')}).`
      isOvercharge = true
      validationVerdict = 'OVERCHARGE_WARNING'
    } else {
      status = 'DIFFERENT'
      statusLabel = 'Harga di Bawah Acuan (Undercharge)'
      statusDescription = `Harga saat ini (Rp ${currentPrice.toLocaleString('id-ID')}) di BAWAH database Rp ${dbPrice.toLocaleString('id-ID')} (-Rp ${Math.abs(diff).toLocaleString('id-ID')}).`
      isUndercharge = true
      validationVerdict = 'UNDERCHARGE_WARNING'
    }

    // Deteksi Override Komoditas (misal: genuine battery dialihkan ke SEMI GARMENT, iPad/Laptop, atau dynamic mapping)
    const { isCommodityOverride, commodityOverrideDetail } = determineCommodityOverride({
      comodityStr,
      typeStr,
      isBatteryItem,
      isIpadItem,
      isLaptopItem,
      isApple,
      modeStr,
      activeMappings,
      custCode,
    })

    const resultItem: UnifiedPriceCheckResult = {
      currentPrice,
      dbPrice,
      difference: diff,
      status,
      statusLabel,
      statusDescription,
      appliedTier,
      appliedTierLabel,
      priceSource,
      priceSourceLabel,
      matchedWith,
      isBroker,
      isMarkingOverride,
      matchedMarkingCode,
      isCommodityOverride,
      commodityOverrideDetail,
      priceCS,
      priceMKT,
      effectiveDate: null,
      matchedCategory: actualMatchedCategory || targetCategory,
      resolvedCommodity: actualMatchedCategory || targetCategory,
      isUndercharge,
      isOvercharge,
      validationVerdict,
    }

    resultMap.set(key, resultItem)
    if (it.markingCode && !resultMap.has(it.markingCode)) {
      resultMap.set(it.markingCode, resultItem)
    }
  }

  return resultMap
}
