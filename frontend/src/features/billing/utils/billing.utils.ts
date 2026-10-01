import { formatDecimal, formatCurrency } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'
import type { Billing, BillingDetail } from '../types/billing.types'

export type BillingStatus = 'draft' | 'issued' | 'collected'

export interface StatusRow {
  fdGive?: number | null
  fdGive2?: number | null
  fdCekDate?: string | null
}

/**
 * Menghitung total nilai invoice dan mata uang efektif (mendukung valas / foreign currency).
 * Otomatis menangani:
 * 1. Kesalahan input valas (header valas tapi semua item Rupiah) -> pakai total riil Rupiah
 * 2. Valas murni (fdJumlah2 > 0 dan item bervalas cocok)
 * 3. Tagihan Rupiah resmi (fdJumlah1 > 0)
 * 4. Tagihan draft / belum terbit yang fdJumlah1 masih 0 -> akumulasi sum(details)
 */
export function getEffectiveInvoiceTotal(
  billingData: Billing,
  details: BillingDetail[] = []
): { total: number; currency: string } {
  const rawJumlah2 = Number(billingData.fdJumlah2 || 0)
  const foreignCurr = (billingData.fdCurr1 || '').trim().toUpperCase()
  const isForeignCandidate = rawJumlah2 > 0 && foreignCurr && !['RP', 'RP.', 'IDR'].includes(foreignCurr)

  // Cek apakah ada item yang menggunakan valas tersebut
  const hasMatchingForeignItem = isForeignCandidate && details.some((d) => {
    const listCode = (d.fdListCode || '').trim().toUpperCase()
    const curr = (d.fdCurr || '').trim().toUpperCase()
    if (listCode === foreignCurr || curr === foreignCurr) return true
    if (foreignCurr.includes('S$') && (listCode === 'SGD' || listCode === 'S$' || curr === 'S$' || curr === 'SGD')) return true
    if (foreignCurr.includes('HK$') && (listCode === 'HKD' || listCode === 'HK$' || curr === 'HK$' || curr === 'HKD')) return true
    if (foreignCurr.includes('US$') && (listCode === 'USD' || listCode === 'US$' || curr === 'US$' || curr === 'USD')) return true
    return false
  })

  // Jika ada fdJumlah2 valas namun tidak ada item yang bervalas -> ini kesalahan input, total riil dalam Rupiah
  if (isForeignCandidate && !hasMatchingForeignItem) {
    const sumAllItems = details.reduce(
      (sum, d) => sum + (Number(d.fdTotal) || Number(d.fdQty || 0) * Number(d.fdItemPrice || 0)),
      0
    )
    const total = sumAllItems > 0 ? sumAllItems : (Number(billingData.fdJumlah1 || 0) + rawJumlah2)
    return { total, currency: 'Rp.' }
  }

  const isForeign = rawJumlah2 > 0
  const currency = isForeign
    ? billingData.fdCurr1?.trim() || 'Rp.'
    : details.find((d) => d?.fdCurr?.trim())?.fdCurr?.trim() || 'Rp.'

  const total = isForeign
    ? Number(billingData.fdJumlah2)
    : Number(billingData.fdJumlah1 || 0) > 0
      ? Number(billingData.fdJumlah1)
      : details.reduce(
          (sum, d) => sum + (Number(d.fdTotal) || Number(d.fdQty || 0) * Number(d.fdItemPrice || 0)),
          0
        )

  return { total, currency }
}

/**
 * Format kuantiti desimal secara presisi untuk item M2 / M3 vs unit umum
 */
export function formatQtyDecimal(qty: number, unitStr?: string | null, itemName?: string | null): string {
  const num = Number(qty || 0)
  const unit = (unitStr || '').trim().toUpperCase()
  const name = (itemName || '').trim().toUpperCase()

  const isM2 = unit === 'M2' || name.includes('M2')
  const isM3 = unit === 'M3' || name.includes('M3')

  if (isM2 || isM3) {
    return formatDecimal(num, 4)
  }

  // Jika angka bulat tanpa pecahan, tampilkan integer
  if (Number.isInteger(num)) {
    return num.toLocaleString('en-US')
  }

  return formatDecimal(num, 2)
}

/**
 * Menghitung selisih hari penuaan (aging) dari tanggal invoice
 */
export function getAgingDays(invDateStr?: string | null): number {
  if (!invDateStr) return 0
  const invDate = new Date(invDateStr)
  if (isNaN(invDate.getTime())) return 0
  const today = new Date()
  invDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const diffTime = today.getTime() - invDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 0
}

/**
 * Menentukan status invoice (draft | issued | collected)
 */
export function getBillingStatus(row?: StatusRow | null): BillingStatus {
  if (!row) return 'draft'
  if (row.fdGive2 === 1) return 'collected'
  if (row.fdGive === 1) return 'issued'
  if (!row.fdCekDate) return 'draft'
  return 'draft'
}

export interface TransportExpedisiRef {
  fdId?: number
  fdListCode?: string | null
  fdExpID?: string | null
  fdExpName?: string | null
  fdResiExp?: string | null
  fdCurrExp?: string | null
  fdTotalExp: number
  fdPaid?: number | null
  fdCreatedDate?: string | null
  fdCreatedBy?: string | null
  fdJmlBerat?: number | null
  fdMarkingCode?: string | null
  fdMarkingNo?: string | null
}

// ─── Daftar Kata Kunci Item Biaya Cabang '--' Non-Validasi (Tidak Ada di DB) ───
export const UNVALIDATED_BRANCH_DASH_FEE_KEYWORDS: readonly string[] = [
  'AGENCY FEE',
  'AWB FEE',
  'ADJUSMENT',
  'ADJUSTMENT',
  'AIRLINE IMPORT FEE',
  'ADDITIONAL FEE - MEDICAL/ VITAMIN',
  'ADDITIONAL FEE - MEDICAL/VITAMIN',
  'ADDITIONAL FEE',
  'ADDITIONAL PAYMENT DUE (SHORTAGE)',
  'ADDITIONAL PAYMENT DUE',
  'BILL OF LANDING',
  'BL FOR BANK INDORSMENT',
  'BANK INDORSMENT',
  'BANK ENDORSEMENT',
  'BEING SUPPLY LABOUR & TRANSPORT',
  'BEING CHECK RECEIVED',
  'BEA CUKAI',
  'BRANDED CHARGES',
  'BIAYA JASA',
  'CUSTOM COMPOUND',
  'CHARGE COLLECT',
  'CONTROL DEPARTEMENT FEE',
  'CONTROL DEPARTMENT FEE',
  'CUSTOM FEE',
  'CHARGE FOR NO SHIPPING MARK',
  'COMMISSION',
  'CHARGE FOR MISSING INVOICE',
  'CENTRAL NARCOTICS BUREAU LICENCE',
  'CENTRAL NARCOTICS BUREAU LICENSE',
  'COST OF PARTS',
  'CUSTOM SUPERVISOR FEE',
  'CONTAINER TO JAKARTA',
  'COURIER DOCUMENT',
  'CLEARENCE FEE',
  'CLEARANCE FEE',
  'CUSTOM CLEARANCE',
  'CARRIER CHARGES',
  'CUSTOM HANDLING',
  'COLOADER CHARGES',
  'DOCUMENT FEE',
  'DRAFT',
  'DAMAGE CONTAINER',
  'DETENTION',
  'DHC',
  'DEMURRAGE',
  'DENDA',
  'DUTY & IMPORT TAX',
  'DOCUMENT CHARGES',
  'DOCUMENT & STAMP FEE',
  'EX WORK SHORT COLLECT',
  'EXPORT TAX',
  'EXPORT OCEAN FREIGHT',
  'EXPORT PERMIT',
  'EXWORK',
  'FREIGHT CHARGE',
  'FORKLIFT',
  'FUEL SURCHARGES',
  'FOOD CONTROL DEPT.',
  'FOOD CONTROL DEPT',
  'ICA CHARGES',
  'FREIGHT & SERVICE CHARGE',
  'G.S.T',
  'GST',
  'HAND CARRY',
  'HANDLING FEE',
  'INBOUND FREIGHT CHARGES',
  'IMPORT FEE FOR CONTROL ITEM',
  'INSURANCE PREMIUM',
  'JASA UNDERNAME',
  'LABOUR CHARGES',
  'LICENCE FEE',
  'LICENSE FEE',
  'LOCAL AGENT HANDLING FEE',
  'LETTER OF INDEMNITY',
  'LOADING & UNLOADING CHARGES',
  'LOADING & SERVICES',
  'LOADING & SERVICES CHARGES',
  'LOLO',
  'LAB TEST FEE',
  'LOCAL CHARGES',
  'MISS CHARGES (CUSTOM LETTER)',
  'NON REIMBURSMENT',
  'NON REIMBURSEMENT',
  'NO INVOICE',
  'OUTBOUND FREIGHT CHARGES',
  'OTHER CHARGES',
  'PSA CHARGES',
  'PERMIT FEE',
  'PACKING CHARGES',
  'PLUS',
  'PERMIT & COURIER FEE',
  'PREMIUM FEE',
  'PICKUP & PROCEDURE FREIGHT',
  'PORT HANDLING',
  'PEMELIHARAAN KONTAINER',
  'PICKUP & CUSTOM FEE',
  'REIMBURSE',
  'REMOVALLANEL',
  'REMOVALLABEL',
  'REMOVAL LABEL',
  'REMOVAL PANEL',
  'RADIATION PROTECTION LICENCE',
  'RADIATION PROTECTION LICENSE',
  'REIMBURSMENT',
  'REIMBURSEMENT',
  'SERVICE CHARGES',
  'SECURITY FEE',
  'STAMP FEE',
  'STORAGE',
  'SURVEY FEE',
  'SUPPLY WOODEN CASE',
  'SPLIT DELIVERY ORDER',
  'STUFFING',
  'SHIPPING LINE',
  'STORAGE REMOVAL CHARGES',
  'SHIPPING LINE CHARGES',
  'SEWA GUDANG JAKARTA',
  'TRANSPORT CHARGES',
  'TERMINAL FEE',
  'TRADE NET',
  'TRUCKING',
  'TRANSPORT & SERVICE CHARGES',
  'TAX RETURN',
  'UNSTUFFING',
  'USED OF SPECIAL EQUIPMENT',
  'UPS COURIER FEE',
  'UBTS CHARGES',
  'UNDERNAME CHARGES',
  'WASHING',
  'WAREHOUSE CHARGES',
]

/**
 * Memeriksa apakah branch code dari invoice adalah branch '--'
 */
export function isBranchDash(branchCode?: string | null, invNo?: string | null): boolean {
  const b = (branchCode || '').trim().toUpperCase()
  if (b === '--' || b === '-') return true
  const inv = (invNo || '').trim().toUpperCase()
  if (inv.startsWith('--')) return true
  return false
}

/**
 * Memeriksa apakah nama item invoice memuat kata-kata biaya/fee non-database (branch code --)
 */
export function isBranchDashExemptFee(itemName?: string | null): boolean {
  if (!itemName) return false
  const upper = itemName.toUpperCase().trim()

  for (const kw of UNVALIDATED_BRANCH_DASH_FEE_KEYWORDS) {
    if (kw.length <= 4) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (new RegExp(`\\b${escaped}\\b`, 'i').test(upper)) {
        return true
      }
    } else {
      if (upper.includes(kw)) {
        return true
      }
    }
  }

  return false
}

export interface PriceEvaluationContext {
  res?: any
  isAir: boolean
  defaultTypeId?: number | null
  defaultComodityName?: string
  expedisiList?: TransportExpedisiRef[]
  branchCode?: string | null
  invNo?: string | null
}

export interface ItemPriceEvaluation {
  comodityName: string
  priceItem: any | null
  minTargetPrice: number
  maxTargetPrice: number
  profilePrice: number
  isMatched: boolean
  hasTargetPrice: boolean
  isTaxReturnItem: boolean
  isKgOverweightItem: boolean
  isM3MainItem?: boolean
  isTransportItem: boolean
  isFreightChargeItem?: boolean
  isNonValidatedBranchDashFee?: boolean
  targetColName: string
  priceListDisplay: string
  statusType: 'MATCH' | 'LOWER' | 'HIGHER' | 'NO_TARGET'
  difference: number
  isUndercharge?: boolean
  isOvercharge?: boolean
  isProfileMatchOverMaster?: boolean
  isProfileMatchUnderMaster?: boolean
  masterPriceDiff?: number
  tierSource?: string
  transportExpedisi?: TransportExpedisiRef | null
  isCustomerPriceExpired?: boolean
  customerPriceEndDate?: string | null
}

function isSingleGenuineBattery(rawToken: string): boolean {
  if (!rawToken) return false
  const token = rawToken.toUpperCase().trim()

  const hasWord =
    /\b(BATTERY|BATTERIES|BATERAI|BATRE|POWERBANK|POWER\s*BANK|ACCU|AKI)\b/i.test(token) ||
    token.includes('BATTERY') ||
    token.includes('BATTERIES') ||
    token.includes('BATERAI') ||
    token.includes('BATRE') ||
    token.includes('POWERBANK')

  if (!hasWord) return false

  // Cek apakah ini murni aksesoris/alat (misal: "BATTERY CHARGER", "BATTERY CASE", "BATTERY HOLDER", "BATTERY TESTER")
  // di mana kata BATTERY hanya sebagai penjelas fungsi alat tersebut dan tidak ada baterai fisiknya.
  const pureAccessoriesPattern =
    /\b(BATTERY|BATTERIES|BATERAI|BATRE)\s+(CHARGER|CHARGING|CASAN|CASE|CASING|HOLDER|TESTER|COVER|BAG|BOX|STRAP|SPRING|CONNECTOR|CLIP|CLAMP|INSULATOR|WRAP|CABLE|WIRE|BRACKET|INDICATOR|GAUGE|FRAME|STAND|MOUNT|HOUSING|SHELL|PROTECTOR|PROTECTIVE|SLOT)\b/i

  if (pureAccessoriesPattern.test(token)) {
    return false
  }

  const reverseAccessoriesPattern =
    /\b(CHARGER|CHARGING|CASAN|CASE|CASING|HOLDER|TESTER|COVER|BAG|BOX|STRAP|SPRING|CONNECTOR|CLIP|CLAMP|INSULATOR|WRAP|CABLE|WIRE|BRACKET|INDICATOR|GAUGE|FRAME|STAND|MOUNT|HOUSING|SHELL|PROTECTOR|PROTECTIVE|SLOT)\s+(BATTERY|BATTERIES|BATERAI|BATRE)\b/i

  if (reverseAccessoriesPattern.test(token)) {
    return false
  }

  const prepAccessoriesPattern =
    /\b(CHARGER|CHARGING|CASAN|CASE|CASING|HOLDER|TESTER|COVER|BAG|BOX|STRAP|SPRING|CONNECTOR|CLIP|CLAMP|INSULATOR|WRAP|CABLE|WIRE|BRACKET|INDICATOR|GAUGE|FRAME|STAND|MOUNT|HOUSING|SHELL|PROTECTOR|PROTECTIVE|SLOT)\s+(FOR|UNTUK|OF)\s+(BATTERY|BATTERIES|BATERAI|BATRE)\b/i

  if (prepAccessoriesPattern.test(token)) {
    return false
  }

  return true
}

/**
 * Memeriksa apakah teks komoditas adalah barang baterai murni (misal: LAPTOP BATTERY, POWERBANK, LITHIUM BATTERY)
 * dan BUKAN aksesoris non-baterai (misal: BATTERY CHARGER, BATTERY CASE, BATTERY HOLDER, BATTERY TESTER, dll).
 */
export function isGenuineBattery(text: string): boolean {
  if (!text) return false
  const upper = text.toUpperCase().trim()

  const hasBatteryWord =
    /\b(BATTERY|BATTERIES|BATERAI|BATRE|POWERBANK|POWER\s*BANK|ACCU|AKI)\b/i.test(upper) ||
    upper.includes('BATTERY') ||
    upper.includes('BATTERIES') ||
    upper.includes('BATERAI') ||
    upper.includes('BATRE') ||
    upper.includes('POWERBANK')

  if (!hasBatteryWord) return false

  // Pisahkan berdasarkan pemisah item (koma, titik koma, garis miring, plus, ampersand, kata hubung)
  const segments = upper.split(/[,;|/&+]|\b(?:AND|DAN|WITH|SERTA|BESERTA)\b/i)
  if (segments.length > 1) {
    return segments.some((segment) => isSingleGenuineBattery(segment.trim()))
  }

  return isSingleGenuineBattery(upper)
}

/**
 * Memeriksa apakah teks komoditas adalah unit iPad / Tablet fisik
 * dan BUKAN aksesoris (misal: case, cover, charger, pen, strap, tempered glass, battery).
 */
export function isGenuineIpad(text: string): boolean {
  if (!text) return false
  const upper = text.toUpperCase().trim()
  const hasIpadWord =
    /\b(IPAD|TABLET)\b/i.test(upper) ||
    upper.includes('IPAD') ||
    upper.includes('TABLET')

  if (!hasIpadWord) return false

  const nonGadgetAcc = [
    'CASE',
    'CASING',
    'COVER',
    'BAG',
    'SCREEN',
    'LCD',
    'LED',
    'TEMPERED',
    'CHARGER',
    'ADAPTER',
    'CABLE',
    'PEN',
    'PENCIL',
    'STRAP',
    'STAND',
    'HOLDER',
    'PARTS',
    'SPAREPART',
    'BATTERY',
    'KEYBOARD',
  ]

  for (const acc of nonGadgetAcc) {
    if (new RegExp(`\\b${acc}\\b`, 'i').test(upper)) {
      return false
    }
  }

  return true
}

/**
 * Memeriksa apakah teks komoditas adalah unit Laptop / MacBook / Notebook fisik
 * dan BUKAN aksesoris atau sparepart (misal: baterai, fan, screen, keyboard, case, charger).
 */
export function isGenuineLaptop(text: string): boolean {
  if (!text) return false
  const upper = text.toUpperCase().trim()
  const hasLaptopWord =
    /\b(LAPTOP|LAPTOPS|MACBOOK|NOTEBOOK)\b/i.test(upper) ||
    upper.includes('LAPTOP') ||
    upper.includes('MACBOOK') ||
    upper.includes('NOTEBOOK')

  if (!hasLaptopWord) return false

  const nonLaptopAcc = [
    'BATTERY',
    'BATTERIES',
    'SCREEN',
    'LCD',
    'LED',
    'FAN',
    'KEYBOARD',
    'CASE',
    'CASING',
    'COVER',
    'BAG',
    'CHARGER',
    'ADAPTER',
    'CABLE',
    'STAND',
    'SPAREPART',
    'PARTS',
    'TOUCHPAD',
    'HOLDER',
    'CONNECTOR',
    'FLEXIBLE',
    'SKIN',
    'STICKER',
    'DECAL',
    'DOCK',
    'DOCKING',
  ]

  for (const acc of nonLaptopAcc) {
    if (new RegExp(`\\b${acc}\\b`, 'i').test(upper)) {
      return false
    }
  }

  return true
}

/**
 * Memeriksa apakah perangkat adalah produk Apple (Apple Laptop / MacBook / iPad).
 */
export function isAppleDevice(text: string): boolean {
  if (!text) return false
  const upper = text.toUpperCase().trim()
  return (
    /\b(APPLE|MACBOOK|MAC|IPAD)\b/i.test(upper) ||
    upper.includes('APPLE') ||
    upper.includes('MACBOOK') ||
    upper.includes('IPAD')
  )
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

export function getNormalizedBranchCode(branch?: string | null): string {
  const b = String(branch || '').toUpperCase().trim()
  if (b.includes('GUANGZHOU') || b === 'GZ') return 'GZ'
  if (b.includes('YIWU') || b === 'YW') return 'YW'
  if (b.includes('SHANGHAI') || b === 'SH') return 'SH'
  if (b.includes('SHENZHEN') || b === 'SZ') return 'SZ'
  if (b.includes('HONGKONG') || b.includes('HONG KONG') || b === 'HK') return 'HK'
  if (b.includes('SINGAPORE') || b.includes('SINGAPURA') || b === 'SG') return 'SG'
  if (b.includes('BANGKOK') || b === 'BKK') return 'BKK'
  return b
}

export function isBranchMatched(itemBranch?: string | null, filterBranch?: string | null): boolean {
  if (!filterBranch || !itemBranch) return true
  const b1 = getNormalizedBranchCode(itemBranch)
  const b2 = getNormalizedBranchCode(filterBranch)
  return b1 === b2 || itemBranch.toUpperCase().includes(b2) || filterBranch.toUpperCase().includes(b1)
}

/**
 * Logika evaluasi harga item invoice terhadap Price List & Tarif Database.
 * Dipakai seragam di:
 * 1. BillingValidationCard (Section 3: Item Price & Price List Validation)
 * 2. BillingValidationSummaryModal (Tabel Item & Kesimpulan Akhir Validasi)
 */
export function evaluateItemPrice(
  item: any,
  ctx: PriceEvaluationContext
): ItemPriceEvaluation {
  const invNo = String(item?.fdInvNo || ctx.invNo || ctx.res?.billing?.fdInvNo || ctx.res?.fdInvNo || '').trim()
  const branchCode = String(ctx.branchCode || ctx.res?.expectedBranch || ctx.res?.branch || ctx.res?.customer?.fdBranchCode || ctx.res?.billing?.fdBranchCode || '').trim()
  const isDashBranch = isBranchDash(branchCode, invNo)
  const isExemptFee = isDashBranch && isBranchDashExemptFee(item?.fdItemName)

  // 0. Item invoice dengan branch code '--' yang memuat kata kunci biaya khusus tidak divalidasi ke database tarif
  if (isExemptFee) {
    return {
      comodityName: (item?.fdItemName || 'BIAYA KHUSUS').trim(),
      priceItem: null,
      minTargetPrice: 0,
      maxTargetPrice: 0,
      profilePrice: 0,
      isMatched: true,
      hasTargetPrice: false,
      isTaxReturnItem: false,
      isKgOverweightItem: false,
      isTransportItem: false,
      isFreightChargeItem: false,
      isNonValidatedBranchDashFee: true,
      targetColName: 'Non-Validasi (Cabang --)',
      priceListDisplay: 'Tidak Terdapat di Database',
      statusType: 'NO_TARGET',
      difference: 0,
      isUndercharge: false,
      isOvercharge: false,
    }
  }

  const itemNameUpper = (item?.fdItemName || '').toUpperCase()
  const isTransportItem =
    itemNameUpper.includes('TRANSPORT') ||
    itemNameUpper.includes('DELIVERY') ||
    itemNameUpper.includes('ONGKIR') ||
    itemNameUpper.includes('TRUCKING')

  // Pengecekan item Transport Charges terhadap data operasional tbExpIndo
  if (isTransportItem) {
    const billedAmount = Number(item?.fdTotal || 0) > 0 ? Number(item?.fdTotal) : Number(item?.fdItemPrice || 0)
    // Filter hanya ekspedisi dengan biaya valid > 0 (karena biaya 0 tidak valid)
    const validExpedisiList = (ctx.expedisiList || []).filter((e) => Number(e.fdTotalExp || 0) > 0)

    if (validExpedisiList.length > 0) {
      // 1. Cari yang nominalnya persis cocok dengan billedAmount
      const exactMatch = validExpedisiList.find((e) => Math.abs(Number(e.fdTotalExp || 0) - billedAmount) < 0.01)
      // 2. Jika tidak ada yang persis cocok, prioritaskan ekspedisi Harus Tagih (fdPaid === 1)
      const mustBillList = validExpedisiList.filter((e) => e.fdPaid === 1)
      const refExp = exactMatch || (mustBillList.length > 0 ? mustBillList[0] : validExpedisiList[0])
      const refTotalExp = Number(refExp.fdTotalExp || 0)
      const isMatched = Math.abs(refTotalExp - billedAmount) < 0.01
      const diff = billedAmount - refTotalExp

      const paidLabel = refExp.fdPaid === 1 ? 'Harus Tagih' : refExp.fdPaid === 2 ? 'COD' : ''
      const expLabel = refExp.fdExpName
        ? `${refExp.fdExpName}${refExp.fdResiExp ? ` (Resi: ${refExp.fdResiExp})` : ''}${paidLabel ? ` [${paidLabel}]` : ''}`
        : `tbExpIndo${paidLabel ? ` [${paidLabel}]` : ''}`

      return {
        comodityName: 'TRANSPORT CHARGES',
        priceItem: null,
        minTargetPrice: refTotalExp,
        maxTargetPrice: refTotalExp,
        profilePrice: 0,
        isMatched,
        hasTargetPrice: true,
        isTaxReturnItem: false,
        isKgOverweightItem: false,
        isTransportItem: true,
        isFreightChargeItem: false,
        targetColName: isMatched ? `tbExpIndo (${paidLabel ? `${paidLabel} ` : ''}Cocok)` : `tbExpIndo (${paidLabel || 'Ref'})`,
        priceListDisplay: `${formatCurrency(refTotalExp)} (${expLabel})`,
        statusType: isMatched ? 'MATCH' : diff < 0 ? 'LOWER' : 'HIGHER',
        difference: diff,
        isUndercharge: !isMatched && diff < 0,
        isOvercharge: !isMatched && diff > 0,
        transportExpedisi: refExp,
      }
    }

    return {
      comodityName: 'TRANSPORT CHARGES',
      priceItem: null,
      minTargetPrice: 0,
      maxTargetPrice: 0,
      profilePrice: 0,
      isMatched: false,
      hasTargetPrice: false,
      isTaxReturnItem: false,
      isKgOverweightItem: false,
      isTransportItem: true,
      isFreightChargeItem: false,
      targetColName: 'Belum Ada di tbExpIndo',
      priceListDisplay: 'Belum Ada di tbExpIndo',
      statusType: 'NO_TARGET',
      difference: 0,
    }
  }

  const unitUpper = (item?.fdListCode || '').toUpperCase().trim()

  // 1. Air VFC (Volume Freight Charges dalam satuan KG)
  const isAirVfcItem =
    (itemNameUpper.includes('VOLUME FREIGHT') || itemNameUpper.includes('VFC')) &&
    (unitUpper === 'KG' || ctx.isAir) &&
    !itemNameUpper.includes('FREIGHT CHARGE')

  if (isAirVfcItem) {
    const vfcRef = ctx.res?.vfcGudangPerMarking || ctx.res?.fdVFCGudang || 0
    const billedQty = Number(item?.fdQty || 0)
    const isMatched = vfcRef > 0 && Math.abs(billedQty - vfcRef) < 0.01
    const diff = billedQty - vfcRef
    return {
      comodityName: 'VFC (VOLUME FREIGHT)',
      priceItem: null,
      minTargetPrice: 0,
      maxTargetPrice: 0,
      profilePrice: 0,
      isMatched,
      hasTargetPrice: vfcRef > 0,
      isTaxReturnItem: false,
      isKgOverweightItem: false,
      isTransportItem: false,
      isFreightChargeItem: false,
      targetColName: isMatched ? 'Cocok (VFC)' : (vfcRef > 0 ? 'Selisih VFC' : 'VFC 0'),
      priceListDisplay: vfcRef > 0 ? `${vfcRef} kg (Gudang)` : '—',
      statusType: isMatched ? 'MATCH' : (diff < 0 ? 'LOWER' : 'HIGHER'),
      difference: diff,
      isUndercharge: !isMatched && diff < 0,
      isOvercharge: !isMatched && diff > 0,
    }
  }

  // 2. Monetary Freight Charge (tbEntrylist fdFC)
  const isFreightChargeItem =
    itemNameUpper.includes('FREIGHT CHARGE') ||
    itemNameUpper.includes('FREIGHT CHARGES') ||
    ['HK$', 'Y$', 'RMB', 'USD', 'S$', '$'].includes(unitUpper)

  if (isFreightChargeItem) {
    const fcSummary = ctx.res?.freightChargeSummary
    const totalFc = fcSummary?.totalFc ?? 0
    const currency = fcSummary?.currency || unitUpper || ''
    const billedQty = Number(item?.fdQty || 0)

    if (totalFc > 0) {
      const isMatched = Math.abs(billedQty - totalFc) < 0.01
      const diff = billedQty - totalFc
      return {
        comodityName: 'FREIGHT CHARGE',
        priceItem: null,
        minTargetPrice: 0,
        maxTargetPrice: 0,
        profilePrice: 0,
        isMatched,
        hasTargetPrice: true,
        isTaxReturnItem: false,
        isKgOverweightItem: false,
        isTransportItem: false,
        isFreightChargeItem: true,
        targetColName: isMatched ? 'Cocok (fdFC)' : 'Selisih fdFC',
        priceListDisplay: `${totalFc} ${currency} (tbEntrylist)`,
        statusType: isMatched ? 'MATCH' : (diff < 0 ? 'LOWER' : 'HIGHER'),
        difference: diff,
        isUndercharge: !isMatched && diff < 0,
        isOvercharge: !isMatched && diff > 0,
      }
    } else {
      return {
        comodityName: 'FREIGHT CHARGE',
        priceItem: null,
        minTargetPrice: 0,
        maxTargetPrice: 0,
        profilePrice: 0,
        isMatched: false,
        hasTargetPrice: true,
        isTaxReturnItem: false,
        isKgOverweightItem: false,
        isTransportItem: false,
        isFreightChargeItem: true,
        targetColName: 'fdFC Kosong (0)',
        priceListDisplay: '0 di tbEntrylist',
        statusType: 'LOWER',
        difference: billedQty,
        isUndercharge: true,
        isOvercharge: false,
      }
    }
  }

  const { res, isAir, defaultTypeId, defaultComodityName = '—' } = ctx
  const listType = res?.fdListType ?? null
  const itemTypeId = (item?.fdTypeComodity !== null && item?.fdTypeComodity !== undefined && Number(item.fdTypeComodity) > 0)
    ? Number(item.fdTypeComodity)
    : null
  let typeId = itemTypeId ?? (defaultTypeId && defaultTypeId > 0 ? defaultTypeId : null) ?? res?.markingComodityType ?? null
  let directComodityName = ''
  let isCustPriceExpired = Boolean(res?.priceValidation?.isCustomerPriceExpired)
  let expiredCustEndDate: string | null = res?.priceValidation?.customerEndDate || null

  // 1. Ekstraksi teks nama barang / komoditas dari item invoice
  const textAfterDash = itemNameUpper.includes('-')
    ? itemNameUpper.split('-').slice(1).join('-').trim()
    : itemNameUpper.replace(/^PARCELS\s+/i, '').trim()

  // 1a. Cek Pemetaan Komoditas Eksplisit (tbCommodityMapping)
  let matchedMapping: any = null
  if (res?.commodityMappings && res.commodityMappings.length > 0) {
    const custCode = res.customer?.fdCustCode?.trim().toUpperCase()
    // Prioritaskan mapping khusus customer terlebih dahulu, lalu global
    const sortedMappings = [...res.commodityMappings].sort((a: any, b: any) => {
      const aIsCust = Boolean(a.fdCustCode && custCode && a.fdCustCode.trim().toUpperCase() === custCode)
      const bIsCust = Boolean(b.fdCustCode && custCode && b.fdCustCode.trim().toUpperCase() === custCode)
      return (bIsCust ? 1 : 0) - (aIsCust ? 1 : 0)
    })

    const itemTokens = textAfterDash.split(',').map((t: string) => t.trim().toUpperCase()).filter(Boolean)

    matchedMapping = sortedMappings.find((m: any) => {
      // Filter mode pengiriman: BY AIR vs BY SEA
      if (m.mode && m.mode.trim().toUpperCase() !== 'ALL') {
        const mMode = m.mode.trim().toUpperCase()
        if (isAir && !mMode.includes('AIR') && !mMode.includes('UDARA')) return false
        if (!isAir && !mMode.includes('SEA') && !mMode.includes('LAUT')) return false
      }

      // Filter cabang jika diisi
      if (m.branch && m.branch.trim().toUpperCase() !== 'ALL') {
        const mBranch = m.branch.trim().toUpperCase()
        const expBranch = (res?.expectedBranch || (res as any)?.branch || res?.customer?.fdBranchCode || '').trim().toUpperCase()
        if (expBranch && mBranch !== expBranch && !expBranch.includes(mBranch) && !mBranch.includes(expBranch)) return false
      }

      // Filter customer jika diisi
      if (m.fdCustCode && custCode && m.fdCustCode.trim().toUpperCase() !== custCode) return false

      // Filter marking code awal jika diisi
      if (m.startMarkingCode && m.startMarkingCode.trim()) {
        const reqMark = m.startMarkingCode.trim().toUpperCase()
        const shipMark = (res?.customer?.fdMarkingCode || (res as any)?.markingCode || '').trim().toUpperCase()
        if (shipMark && reqMark) {
          if (shipMark.slice(0, 4) === reqMark.slice(0, 4) && shipMark < reqMark) {
            return false
          }
        }
      }

      // Filter tanggal agen jika diisi
      if (m.startAgentDate && res?.fdTglAgent) {
        if (new Date(res.fdTglAgent) < new Date(m.startAgentDate)) return false
      }

      // Filter masa berlaku endDate jika diisi
      if (m.endDate) {
        const shipDate = res?.fdTglAgent ? new Date(res.fdTglAgent) : new Date()
        if (shipDate > new Date(m.endDate)) return false
      }

      const mUpper = String(m.commodityName || '').trim().toUpperCase()

      // Guard genuine gadget & battery: jangan petakan jika ini aksesoris / sparepart (seperti screen, charger, case)
      if (['LAPTOP', 'NOTEBOOK', 'MACBOOK', 'LAPTOPS'].includes(mUpper)) {
        if (!isGenuineLaptop(textAfterDash) && !isGenuineLaptop(itemNameUpper)) return false
      }
      if (['IPAD', 'TABLET'].includes(mUpper)) {
        if (!isGenuineIpad(textAfterDash) && !isGenuineIpad(itemNameUpper)) return false
      }
      const tUpper = String(m.targetCommodity || '').trim().toUpperCase()
      if (
        ['BATTERY', 'BATTERIES', 'LAPTOP BATTERY', 'POWERBANK', 'ACCU', 'AKI'].includes(mUpper) ||
        tUpper.includes('SEMI GARMENT') ||
        tUpper.includes('BATTERY') ||
        tUpper.includes('POWERBANK')
      ) {
        if (!isGenuineBattery(textAfterDash) && !isGenuineBattery(itemNameUpper)) return false
      }

      return (
        textAfterDash === mUpper ||
        itemTokens.some((tok: string) => tok === mUpper) ||
        (mUpper.length >= 4 && new RegExp(`\\b${mUpper}\\b`, 'i').test(textAfterDash))
      )
    })

    if (matchedMapping) {
      directComodityName = matchedMapping.targetCommodity.trim()
      if (matchedMapping.fdTypeComodity !== null && matchedMapping.fdTypeComodity !== undefined) {
        typeId = Number(matchedMapping.fdTypeComodity)
      }
    }
  }

  // 1b. Scoring & token matching dengan marking commodities (jika belum ditentukan via mapping)
  if (!directComodityName && res?.markingComodities && res.markingComodities.length > 0) {
    const itemTokens = textAfterDash.split(',').map((t: string) => t.trim()).filter(Boolean)

    const scoredCandidates = res.markingComodities
      .filter((m: any) => !!m.fdComodity)
      .map((m: any) => {
        const mComUpper = m.fdComodity!.toUpperCase().trim()
        const mTokens = mComUpper.split(',').map((t: string) => t.trim()).filter(Boolean)

        let matchCount = 0
        for (const it of itemTokens) {
          for (const mt of mTokens) {
            if (it === mt) {
              matchCount += 3 // Exact token match
            } else if (it.includes(mt) || mt.includes(it)) {
              matchCount += 1 // Partial token match
            }
          }
        }

        const isFullExact = textAfterDash === mComUpper
        const isSubstring = textAfterDash.includes(mComUpper) || mComUpper.includes(textAfterDash)
        if (isSubstring) matchCount += 2

        return {
          candidate: m,
          mComUpper,
          matchCount,
          isFullExact,
          length: mComUpper.length,
        }
      })
      .filter((sc: any) => sc.matchCount > 0)
      .sort((a: any, b: any) => {
        if (a.isFullExact !== b.isFullExact) return a.isFullExact ? -1 : 1
        if (a.matchCount !== b.matchCount) return b.matchCount - a.matchCount
        return b.length - a.length
      })

    const matched = scoredCandidates.length > 0 ? scoredCandidates[0].candidate : null

    if (matched) {
      if (matched.fdTypeComodity) {
        typeId = matched.fdTypeComodity
      }
      if (matched.fdComodityName) {
        directComodityName = matched.fdComodityName
      } else if (matched.fdComodity) {
        directComodityName = matched.fdComodity
      }
    }
  }

  // Evaluasi Tier 0: Direct Price dari pemetaan komoditas atau marking commodities
  const isCustMapping = Boolean(
    matchedMapping?.fdCustCode &&
    res?.customer?.fdCustCode &&
    matchedMapping.fdCustCode.trim().toUpperCase() === res.customer.fdCustCode.trim().toUpperCase()
  )

  const matchedMarkingComodity = res?.markingComodities?.find((mc: any) => {
    const mcCom = (mc.fdComodity || '').toUpperCase().trim()
    return (
      mcCom === textAfterDash ||
      textAfterDash.includes(mcCom) ||
      mcCom.includes(textAfterDash) ||
      (isGenuineBattery(textAfterDash) && isGenuineBattery(mcCom))
    ) && Number(mc.directPrice || 0) > 0
  })

  const tier0Price = (matchedMapping && matchedMapping.price && Number(matchedMapping.price) > 0)
    ? Number(matchedMapping.price)
    : (matchedMarkingComodity && Number(matchedMarkingComodity.directPrice) > 0
      ? Number(matchedMarkingComodity.directPrice)
      : null)

  const itemUnit = (item?.fdListCode || '').trim().toUpperCase()
  const isTaxReturnItem = itemNameUpper.includes('TAX RETURN') || itemNameUpper.includes('TAXRETURN')
  const isKgOverweightItem =
    !isAir &&
    (itemUnit === 'KG' || itemNameUpper.includes('(KG)') || itemNameUpper.includes('PARCELS TO JAKARTA (KG)'))
  const isM3MainItem =
    !isAir &&
    itemUnit === 'M3' &&
    !isTaxReturnItem

  // 2. Tentukan nama komoditi
  let comodityName = ''
  if (isKgOverweightItem) {
    comodityName = 'HARGA KG (PER AGEN)'
  } else if (directComodityName) {
    // 💡 Prioritaskan nama komoditas hasil pemetaan eksplisit (Customer Mapping lebih dulu, lalu Global).
    // DILARANG menimpa directComodityName dengan fallback isGenuineBattery / isGenuineIpad / isGenuineLaptop!
    comodityName = directComodityName
  } else if (isGenuineBattery(itemNameUpper) || isGenuineBattery(item?.fdComodity)) {
    comodityName = isAir ? 'LS & (GOODS WITH BATTERY)' : 'SEMI GARMENT'
  } else if (isGenuineIpad(itemNameUpper)) {
    comodityName = isAir ? 'TABLET' : 'KHUSUS IPAD'
  } else if (isGenuineLaptop(itemNameUpper)) {
    comodityName = !isAir && isAppleDevice(itemNameUpper) ? 'APPLE LAPTOP' : 'LAPTOP'
  } else {
    // Prioritaskan spesifikasi barang dari teks item invoice (setelah tanda '-') jika ada
    const itemSpecificText = textAfterDash && textAfterDash !== 'M3' && textAfterDash !== 'KG' ? textAfterDash : ''

    if (typeId) {
      const matchType = res?.comodityTypes?.find(
        (c: any) => c.fdTypeComodity === typeId && (listType ? c.fdListType === listType : true)
      )
      if (matchType) {
        comodityName = matchType.fdComodityName
      }
    }
    const rawTarget = (item?.fdComodity || '').trim()
    if (!comodityName || (itemSpecificText && (comodityName.toUpperCase().includes('LARTAS') || comodityName === '—'))) {
      // Jika nama komoditas umum (LARTAS - S / LARTAS - N) tapi item punya teks barang spesifik, gunakan teks barang spesifik
      comodityName = itemSpecificText || rawTarget || (defaultComodityName !== '—' ? defaultComodityName : '') || comodityName || itemNameUpper || '—'
    }
  }

  // 3. Pencocokan dengan items di Price List atau Tarif Langsung Tier 0
  let priceItem: any | null = null
  let minTargetPrice = 0
  let maxTargetPrice = 0
  let tierSource: string | undefined = undefined

  if (tier0Price !== null && tier0Price > 0) {
    minTargetPrice = tier0Price
    maxTargetPrice = tier0Price
    tierSource = isCustMapping ? 'Pemetaan Khusus Pelanggan (Tier 0)' : 'Pemetaan Komoditas Global (Tier 0)'
    priceItem = {
      category: comodityName,
      price: tier0Price,
      sheetType: isCustMapping ? 'CUSTOMER' : 'TIER_0',
    }
  } else if (!isTaxReturnItem && !isKgOverweightItem && res?.priceValidation?.items && comodityName !== '—') {
    const modeFilter = res.expectedMode || (listType === 1 ? 'BY AIR' : listType === 2 ? 'BY SEA' : null)
    const branchFilter = res.expectedBranch || null
    const isMkt = isMktCustomer(res?.customer, res?.customer?.fdSalesNM || (res as any)?.sales)
    const expectedSheetType = isMkt ? 'MKT' : 'CS'

    const targetDateStr = ctx.res?.fdTglAgent || (ctx.res as any)?.tglAgent || ctx.res?.billing?.fdInvDate || null
    const targetDate = targetDateStr ? new Date(targetDateStr) : new Date()

    const custCandidates = res.priceValidation.items.filter((p: any) => {
      if (p.sheetType?.toUpperCase() !== 'CUSTOMER') return false
      if (modeFilter && p.mode && p.mode.toUpperCase() !== modeFilter.toUpperCase()) return false
      if (branchFilter && p.branch && !isBranchMatched(p.branch, branchFilter)) return false
      if (p.endDate && new Date(p.endDate) < targetDate) {
        isCustPriceExpired = true
        expiredCustEndDate = p.endDate
        return false
      }
      return true
    })

    const masterCandidates = res.priceValidation.items.filter((p: any) => {
      if (p.sheetType?.toUpperCase() === 'CUSTOMER') return false
      if (modeFilter && p.mode && p.mode.toUpperCase() !== modeFilter.toUpperCase()) return false
      if (branchFilter && p.branch && !isBranchMatched(p.branch, branchFilter)) return false
      if (p.sheetType && p.sheetType.toUpperCase() !== expectedSheetType) return false
      return true
    })

    const rawTargetUpper = (directComodityName || item?.fdComodity || itemNameUpper || '').toUpperCase().trim()
    const nameUpper = comodityName.toUpperCase().trim()
    const normName = nameUpper.replace(/[\s\-_]+/g, ' ').trim()

    const searchInItems = (items: any[]) => {
      if (!items || items.length === 0) return null

      // 3a. Prioritaskan kecocokan eksplisit kategori atau alias komoditi khusus
      const aliasMatchedItem = items.find((p: any) => {
        const pCat = String(p?.category || '').toUpperCase().trim()
        const pNorm = pCat.replace(/[\s\-_]+/g, ' ')
        if (pCat && (pCat === rawTargetUpper || pNorm === rawTargetUpper.replace(/[\s\-_]+/g, ' '))) return true
        if (pCat && (pCat === nameUpper || pNorm === normName)) return true
        if (p?.aliases && Array.isArray(p.aliases)) {
          if (p.aliases.some((a: string) => String(a || '').toUpperCase().trim() === rawTargetUpper || String(a || '').toUpperCase().trim() === nameUpper)) return true
        }
        return false
      })

      if (aliasMatchedItem) {
        return { item: aliasMatchedItem, min: 0, max: 0, catName: aliasMatchedItem.category }
      }

      const exactMatched = items.find((p: any) => {
        const catUpper = String(p?.category || '').toUpperCase().trim()
        return catUpper && (catUpper === nameUpper || catUpper.replace(/[\s\-_]+/g, ' ').trim() === normName)
      })
      if (exactMatched) {
        return { item: exactMatched, min: 0, max: 0, catName: exactMatched.category }
      }

      let heuristicItem: any = null
      let minP = 0
      let maxP = 0

      // 3b. Prioritaskan pengecekan komoditas fisik khusus (Baterai, iPad, Laptop, Semi Garment)
      const isSemiGarmentComodity =
        normName.includes('SEMI GARMENT') ||
        normName.includes('SEMI-GARMENT') ||
        rawTargetUpper.includes('SEMI GARMENT') ||
        rawTargetUpper.includes('SEMI-GARMENT')

      const isBatteryComodity =
        !directComodityName && (isGenuineBattery(itemNameUpper) || isGenuineBattery(normName))

      if (isSemiGarmentComodity || isBatteryComodity) {
        heuristicItem = isAir
          ? items.find((p: any) => {
              const c = String(p?.category || '').toLowerCase()
              return c.includes('semi garment') || c.includes('semi-garment') || c.includes('goods with battery') || c.includes('ls &')
            })
          : items.find((p: any) => {
              const c = String(p?.category || '').toLowerCase()
              return c.includes('semi garment') || c.includes('semi-garment') || c.includes('battery')
            })
      } else if (!directComodityName && (isGenuineIpad(itemNameUpper) || isGenuineIpad(normName) || normName.includes('TABLET') || normName.includes('IPAD'))) {
        heuristicItem = isAir
          ? items.find((p: any) => String(p?.category || '').toLowerCase().includes('tablet') || String(p?.category || '').toLowerCase().includes('ipad'))
          : items.find((p: any) => String(p?.category || '').toLowerCase().includes('khusus ipad') || String(p?.category || '').toLowerCase().includes('ipad') || String(p?.category || '').toLowerCase().includes('tablet'))
      } else if (!directComodityName && (isGenuineLaptop(itemNameUpper) || isGenuineLaptop(normName) || normName.includes('LAPTOP') || normName.includes('MACBOOK'))) {
        if (isAppleDevice(itemNameUpper) || isAppleDevice(normName)) {
          heuristicItem = items.find((p: any) => String(p?.category || '').toLowerCase().includes('apple laptop') || String(p?.category || '').toLowerCase().includes('macbook'))
        }
        if (!heuristicItem) {
          heuristicItem = items.find((p: any) => String(p?.category || '').toLowerCase().includes('laptop') || String(p?.category || '').toLowerCase().includes('selain merek apple') || String(p?.category || '').toLowerCase().includes('notebook'))
        }
      } else if (isAir) {
        if (normName.includes('GENERAL') || normName.includes('UMUM')) {
          heuristicItem = items.find((p: any) => String(p?.category || '').toLowerCase().includes('general goods') || String(p?.category || '').toUpperCase() === 'UMUM') || null
        } else if (normName.includes('BRANDED')) {
          heuristicItem = items.find((p: any) => String(p?.category || '').toLowerCase().includes('branded goods')) || null
        } else if (normName.includes('SEMI GARMENT') || normName.includes('SEMI-GARMENT')) {
          heuristicItem = items.find((p: any) => {
            const c = String(p?.category || '').toLowerCase()
            return c.includes('semi garment') || c.includes('semi-garment') || c.includes('goods with battery') || c.includes('ls &')
          }) || null
        } else if (normName.includes('GARMENT')) {
          // PENTING: Jika mencari GARMENT biasa, pastikan TIDAK mencocokkan SEMI GARMENT!
          heuristicItem = items.find((p: any) => {
            const c = String(p?.category || '').toLowerCase()
            return (c.includes('fabric') || c.includes('garment')) && !c.includes('semi')
          }) || null
        } else if (normName.includes('FOOD')) {
          heuristicItem = items.find((p: any) => String(p?.category || '').toLowerCase().includes('ls &') || String(p?.category || '').toLowerCase().includes('food')) || null
        }
      } else {
        if (
          normName.includes('UMUM') ||
          normName.includes('GENERAL') ||
          textAfterDash.includes('GLASS') ||
          textAfterDash.includes('ACCESSORIES') ||
          textAfterDash.includes('SPAREPART')
        ) {
          heuristicItem = items.find((p: any) => String(p?.category || '').toLowerCase().includes('general goods') || String(p?.category || '').toUpperCase() === 'UMUM') || null
        } else if (normName.includes('TEKSTIL')) {
          heuristicItem = items.find((p: any) => String(p?.category || '').toLowerCase().includes('fabric') || String(p?.category || '').toUpperCase() === 'TEKSTIL') || null
        } else if (
          normName.includes('LARTAS N') ||
          normName.includes('LARTAS NORMAL') ||
          textAfterDash.includes('TABLEWARE') ||
          textAfterDash.includes('STAINLESS') ||
          textAfterDash.includes('CUPS')
        ) {
          heuristicItem = items.find((p: any) => String(p?.category || '').toLowerCase().includes('lartas normal') || String(p?.category || '').toUpperCase().includes('LARTAS NORMAL') || String(p?.category || '').toUpperCase().includes('LARTAS - N') || String(p?.category || '').toUpperCase().includes('LARTAS-N')) || null
        } else if (
          normName.includes('ALKES') ||
          normName.includes('MAKANAN') ||
          normName.includes('FOOD') ||
          /\bLS\b/i.test(normName) ||
          textAfterDash.includes('MEDICAL') ||
          textAfterDash.includes('ALKES') ||
          textAfterDash.includes('MEDIS')
        ) {
          heuristicItem = items.find((p: any) => {
            const cat = String(p?.category || '').toLowerCase()
            return cat.includes('alkes') || cat.includes('makanan') || /\bls\b/i.test(cat)
          }) || null
        } else if (
          normName.includes('LARTAS S') ||
          normName.includes('LARTAS SUPER') ||
          normName.includes('LARTAS SPECIAL') ||
          normName.includes('KOSMETIK') ||
          textAfterDash.includes('KOSMETIK') ||
          textAfterDash.includes('COSMETIC') ||
          textAfterDash.includes('SKINCARE') ||
          textAfterDash.includes('OBAT') ||
          textAfterDash.includes('SUPPLEMENT')
        ) {
          const isCosmetic =
            textAfterDash.includes('KOSMETIK') ||
            textAfterDash.includes('COSMETIC') ||
            textAfterDash.includes('SKINCARE') ||
            textAfterDash.includes('OBAT') ||
            textAfterDash.includes('SUPPLEMENT') ||
            normName.includes('KOSMETIK')

          const matchedItems = items.filter((p: any) => {
            const cat = String(p?.category || '').toLowerCase()
            const catUpper = String(p?.category || '').toUpperCase()
            if (isCosmetic) {
              return cat.includes('kosmetik') || cat.includes('obat')
            }
            return cat.includes('kosmetik') || cat.includes('obat') || cat.includes('alkes') || cat.includes('makanan') || /\bls\b/i.test(cat) || catUpper.includes('LARTAS S') || catUpper.includes('LARTAS-S')
          })
          if (matchedItems.length > 0) {
            heuristicItem = matchedItems[0]
            minP = Math.min(...matchedItems.map((p: any) => Number(p?.price || 0)))
            maxP = Math.max(...matchedItems.map((p: any) => Number(p?.price || 0)))
          }
        } else if (normName.includes('SEMI GARMENT') || normName.includes('SEMI-GARMENT')) {
          heuristicItem = items.find((p: any) => {
            const cat = String(p?.category || '').toLowerCase()
            return cat.includes('semi garment') || cat.includes('semi-garment') || cat.includes('battery')
          }) || null
        } else if (normName.includes('GARMENT')) {
          // PENTING: Jika mencari GARMENT biasa, pastikan TIDAK mencocokkan SEMI GARMENT!
          heuristicItem = items.find((p: any) => {
            const cat = String(p?.category || '').toLowerCase()
            return cat.includes('garment') && !cat.includes('semi')
          }) || null
        }
      }

      if (heuristicItem) {
        return { item: heuristicItem, min: minP, max: maxP, catName: comodityName }
      }

      const substringMatched = items.find((p: any) => {
        const catUpper = String(p?.category || '').toUpperCase()
        if (!catUpper) return false
        // PENTING: Jangan biarkan SEMI GARMENT dicocokkan dengan GARMENT biasa, atau sebaliknya!
        if (nameUpper.includes('SEMI') && !catUpper.includes('SEMI')) return false
        if (!nameUpper.includes('SEMI') && catUpper.includes('SEMI')) return false
        return catUpper.includes(nameUpper) || nameUpper.includes(catUpper)
      }) || null
      if (substringMatched) {
        return { item: substringMatched, min: 0, max: 0, catName: substringMatched.category }
      }

      return null
    }

    // 1. Prioritas 1: Cari pada daftar tarif khusus customer (Customer Price List)
    let searchResult = custCandidates.length > 0 ? searchInItems(custCandidates) : null

    // 2. Prioritas 2: Fallback ke Master Price List sesuai group sales (MKT jika sales/broker, CS jika direct)
    if (!searchResult && masterCandidates.length > 0) {
      searchResult = searchInItems(masterCandidates)
    }

    // 3. Prioritas 3: Fallback ke seluruh item price validation yang tersedia
    if (!searchResult && res.priceValidation.items.length > 0) {
      searchResult = searchInItems(res.priceValidation.items)
    }

    if (searchResult) {
      priceItem = searchResult.item
      if (searchResult.min > 0 && searchResult.max > 0) {
        minTargetPrice = searchResult.min
        maxTargetPrice = searchResult.max
      }
      if (searchResult.catName) {
        comodityName = searchResult.catName
      }
    }
  }

  if (priceItem && minTargetPrice === 0 && maxTargetPrice === 0) {
    minTargetPrice = Number(priceItem.price || 0)
    maxTargetPrice = Number(priceItem.price || 0)
  }

  // 4. Harga profil customer di DB (Overweight KG & Tax Return sebagai acuan agen/khusus; Komoditi biasa sebagai pembanding)
  let profilePrice = 0
  if (isKgOverweightItem) {
    profilePrice = Number(res?.profileHarga?.kg || 0)
    minTargetPrice = profilePrice
    maxTargetPrice = profilePrice
  } else if (isTaxReturnItem) {
    profilePrice = Number(res?.profileHarga?.taxReturnPrice || 0)
    minTargetPrice = profilePrice
    maxTargetPrice = profilePrice
  } else {
    // Tampilkan profil customer dari DB sebagai data pembanding (inputan manual CS di FoxPro)
    profilePrice = Number(res?.profileHarga?.harga || 0)
    // Fallback: HANYA jika tidak ditemukan tarif di Price List (priceItem === null && tier0Price === null),
    // dan customer memiliki tarif flat M3 di profilnya (profilePrice > 0), barulah jadikan profilePrice sebagai target acuan
    if (!priceItem && (tier0Price === null || tier0Price === 0) && profilePrice > 0 && isM3MainItem) {
      minTargetPrice = profilePrice
      maxTargetPrice = profilePrice
    }
  }

  const billedPrice = Number(item?.fdItemPrice || 0)

  // 5. Evaluasi kecocokan harga
  // Prioritas 1: Cocok dengan Price List resmi sistem (Tier 0 / Customer Price List / Master Price List CS/MKT)
  const hasPriceList = priceItem !== null || (tier0Price !== null && tier0Price > 0)
  const isPriceListMatched = hasPriceList && billedPrice >= minTargetPrice - 0.01 && billedPrice <= maxTargetPrice + 0.01

  // Prioritas 2: Cocok dengan kesepakatan flat M3 profil pelanggan (profileHarga.harga)
  const isProfileFlatMatched = isM3MainItem && profilePrice > 0 && Math.abs(billedPrice - profilePrice) < 0.01

  // Deteksi Hybrid: Cocok dengan Profil CS tapi berbeda dengan Master/Customer Price List
  const isProfileMatchOverMaster = isProfileFlatMatched && hasPriceList && billedPrice > maxTargetPrice + 0.01
  const isProfileMatchUnderMaster = isProfileFlatMatched && hasPriceList && billedPrice < minTargetPrice - 0.01
  const masterPriceDiff = hasPriceList ? (billedPrice - (isProfileMatchOverMaster ? maxTargetPrice : minTargetPrice)) : 0

  const isMatched = isKgOverweightItem
    ? (profilePrice > 0 && Math.abs(billedPrice - profilePrice) < 0.01)
    : isTaxReturnItem
    ? (profilePrice > 0 && Math.abs(billedPrice - profilePrice) < 0.01)
    : (isPriceListMatched || isProfileFlatMatched)

  const hasTargetPrice = isKgOverweightItem
    ? profilePrice > 0
    : isTaxReturnItem
    ? profilePrice > 0
    : (hasPriceList || (isM3MainItem && profilePrice > 0))

  const targetColName = isKgOverweightItem
    ? 'Tarif KG Agen'
    : isTaxReturnItem
    ? 'Tarif Tax Return'
    : tier0Price !== null && tier0Price > 0
    ? (isCustMapping ? 'Tarif Khusus Cust (Tier 0)' : 'Tarif Komoditas (Tier 0)')
    : priceItem
    ? (priceItem.sheetType === 'CUSTOMER' ? 'Price List Cust' : 'Price List Master')
    : (isM3MainItem && profilePrice > 0)
    ? 'Tarif M3 Profile'
    : 'Tidak Ada Acuan'

  let priceListDisplay = '—'
  if (isKgOverweightItem) {
    priceListDisplay = profilePrice > 0 ? formatCurrency(profilePrice) : '—'
  } else if (isTaxReturnItem) {
    priceListDisplay = res?.profileHarga?.taxReturnPrice && res.profileHarga.taxReturnPrice > 0 ? formatCurrency(res.profileHarga.taxReturnPrice) : '—'
  } else if (tier0Price !== null && tier0Price > 0) {
    const sourceSuffix = isCustMapping ? ' (Cust)' : ' (Tier 0)'
    priceListDisplay = `${formatCurrency(tier0Price)}${sourceSuffix}`
  } else if (priceItem) {
    const isCustPrice = priceItem.sheetType?.toUpperCase() === 'CUSTOMER'
    const isMktPrice = priceItem.sheetType?.toUpperCase() === 'MKT'
    const isOverride = res?.priceValidation?.isMarkingOverride
    const overrideSuffix = isOverride && res?.priceValidation?.matchedMarkingCode ? ` - Override: ${res.priceValidation.matchedMarkingCode}` : ''
    const sheetSuffix = isCustPrice ? ' (Cust)' : isMktPrice ? ` (MKT${overrideSuffix})` : ` (CS${overrideSuffix})`
    if (minTargetPrice !== maxTargetPrice) {
      priceListDisplay = `${formatCurrency(minTargetPrice)} - ${formatCurrency(maxTargetPrice)}${sheetSuffix}`
    } else {
      priceListDisplay = `${formatCurrency(priceItem.price)}${sheetSuffix}`
    }
  } else if (isM3MainItem && profilePrice > 0) {
    priceListDisplay = `${formatCurrency(profilePrice)}/M3 (Profile)`
  }

  let statusType: 'MATCH' | 'LOWER' | 'HIGHER' | 'NO_TARGET' = 'NO_TARGET'
  let difference = 0
  let isUndercharge = false
  let isOvercharge = false

  if (isMatched) {
    statusType = 'MATCH'
  } else if (hasTargetPrice) {
    const targetRef = (isTaxReturnItem || isKgOverweightItem || (!hasPriceList && isM3MainItem)) ? profilePrice : maxTargetPrice
    if (billedPrice > targetRef) {
      statusType = 'HIGHER'
      difference = billedPrice - targetRef
      isOvercharge = true
    } else {
      const minRef = (isTaxReturnItem || isKgOverweightItem || (!hasPriceList && isM3MainItem)) ? profilePrice : minTargetPrice
      statusType = 'LOWER'
      difference = billedPrice - minRef
      isUndercharge = true
    }
  }

  return {
    comodityName,
    priceItem,
    minTargetPrice,
    maxTargetPrice,
    profilePrice,
    isMatched,
    hasTargetPrice,
    isTaxReturnItem,
    isKgOverweightItem,
    isM3MainItem,
    isTransportItem: false,
    targetColName,
    priceListDisplay,
    statusType,
    difference: isProfileMatchOverMaster || isProfileMatchUnderMaster ? masterPriceDiff : difference,
    isUndercharge,
    isOvercharge: isOvercharge || isProfileMatchOverMaster,
    isProfileMatchOverMaster,
    isProfileMatchUnderMaster,
    masterPriceDiff,
    tierSource,
    isCustomerPriceExpired: isCustPriceExpired,
    customerPriceEndDate: expiredCustEndDate,
  }
}

/**
 * Mendeteksi apakah no invoice adalah Bill Gabungan (karakter pertama setelah prefix pemisah '-' adalah huruf)
 * dan mengembalikan nomor invoice induk yang direferensikan (huruf diganti '0').
 * Contoh: SGS-A01783-09-2026 -> SGS-001783-09-2026
 */
export function resolveInvoiceRelation(invNo?: string | null) {
  const clean = (invNo || '').trim()
  if (!clean) {
    return {
      isCombined: false,
      subCode: null,
      parentInvNo: null,
      targetInvNo: '',
    }
  }

  const parts = clean.split('-')
  // Format: [PREFIX]-[NOMOR]-[BULAN]-[TAHUN]
  // Contoh: ["SGS", "A01783", "09", "2026"] atau ["GZS", "B09728", "09", "2026"]
  if (parts.length >= 4 && parts[1] && /^[A-Za-z]/.test(parts[1])) {
    const subCode = parts[1][0].toUpperCase()
    const numDigits = parts[1].slice(1)
    const parentInvNo = `${parts[0]}-0${numDigits}-${parts[2]}-${parts[3]}`
    return {
      isCombined: true,
      subCode,
      parentInvNo,
      targetInvNo: parentInvNo,
    }
  }

  return {
    isCombined: false,
    subCode: null,
    parentInvNo: null,
    targetInvNo: clean,
  }
}

/**
 * Normalisasi dan deteksi branch code dari raw branch, prefix nomor invoice, atau marking code.
 */
export function resolveBranchCode(
  rawBranch?: string | null,
  invNo?: string | null,
  markingCode?: string | null
): string | null {
  const clean = (rawBranch || '').trim().toUpperCase()
  if (clean && clean !== '--' && clean !== '-' && clean !== 'NONE' && clean !== 'NULL') {
    return clean
  }

  const cleanInv = (invNo || '').trim().toUpperCase()
  if (cleanInv) {
    if (
      cleanInv.startsWith('--S') ||
      cleanInv.startsWith('--A') ||
      cleanInv.startsWith('SGS') ||
      cleanInv.startsWith('SGA') ||
      cleanInv.startsWith('SG-')
    ) {
      return 'SG'
    }
    if (
      cleanInv.startsWith('GZS') ||
      cleanInv.startsWith('GZA') ||
      cleanInv.startsWith('GZ-')
    ) {
      return 'GZ'
    }
    if (
      cleanInv.startsWith('YWS') ||
      cleanInv.startsWith('YWA') ||
      cleanInv.startsWith('YW-')
    ) {
      return 'YW'
    }
    if (
      cleanInv.startsWith('SHS') ||
      cleanInv.startsWith('SHA') ||
      cleanInv.startsWith('SH-')
    ) {
      return 'SH'
    }
    if (
      cleanInv.startsWith('SZS') ||
      cleanInv.startsWith('SZA') ||
      cleanInv.startsWith('SZ-')
    ) {
      return 'SZ'
    }
    if (
      cleanInv.startsWith('HKS') ||
      cleanInv.startsWith('HKA') ||
      cleanInv.startsWith('HK-')
    ) {
      return 'HK'
    }
    if (
      cleanInv.startsWith('KRS') ||
      cleanInv.startsWith('KRA') ||
      cleanInv.startsWith('KR-')
    ) {
      return 'KR'
    }
    if (
      cleanInv.startsWith('BKS') ||
      cleanInv.startsWith('BKA') ||
      cleanInv.startsWith('THS') ||
      cleanInv.startsWith('THA')
    ) {
      return 'BK'
    }
    const match = cleanInv.match(/^([A-Z]{2})/)
    if (match && match[1]) {
      return match[1]
    }
  }

  const cleanMark = (markingCode || '').trim().toUpperCase()
  if (cleanMark) {
    if (cleanMark.includes('SG')) return 'SG'
    if (cleanMark.includes('GZ')) return 'GZ'
    if (cleanMark.includes('YW')) return 'YW'
    if (cleanMark.includes('SH')) return 'SH'
    if (cleanMark.includes('SZ')) return 'SZ'
    if (cleanMark.includes('HK')) return 'HK'
    if (cleanMark.includes('KR')) return 'KR'
  }

  return null
}

// ─── Item Classifiers ────────────────────────────────────────────────────────

/** Returns true for auxiliary items like Tax Return, Admin, Surcharge, etc. or non-validated branch '--' fee items */
export function isAuxiliaryItem(name?: string | null, branchCode?: string | null, invNo?: string | null): boolean {
  if (!name) return false
  const n = name.toUpperCase().trim()

  // Item muatan kargo utama (PARCEL / PARCELS) bukan auxiliary item
  if (/^PARCELS?\b/i.test(n)) return false

  if (isBranchDash(branchCode, invNo) && isBranchDashExemptFee(n)) {
    return true
  }

  return (
    n.includes('TAX RETURN') ||
    /\bADMIN(ISTRASI)?\b/i.test(n) ||
    /\bSURCHARGE\b/i.test(n) ||
    /\bDISCOUNT\b/i.test(n) ||
    /\bBIAYA\b/i.test(n) ||
    /\bPENYESUAIAN\b/i.test(n)
  )
}

/** Returns true for Volume Freight Charge (VFC) items billed in KG. */
export function isVfcItem(name?: string | null, unitCode?: string | null): boolean {
  const n = (name || '').toUpperCase()
  const u = (unitCode || '').toUpperCase().trim()
  return (
    (n.includes('VOLUME FREIGHT') || n.includes('VFC')) &&
    (u === 'KG' || !u || u === 'VFC') &&
    !n.includes('FREIGHT CHARGE')
  )
}

/** Returns true for Freight Charge items (foreign-currency or explicit FC name). */
export function isFreightChargeItem(name?: string | null, unitCode?: string | null): boolean {
  if (isVfcItem(name, unitCode)) return false
  const n = (name || '').toUpperCase()
  const u = (unitCode || '').toUpperCase().trim()
  return (
    n.includes('FREIGHT CHARGE') ||
    n.includes('FREIGHT CHARGES') ||
    ['HK$', 'Y$', 'RMB', 'USD', 'S$', '$'].includes(u)
  )
}

/**
 * Mencetak invoice secara langsung (PDF atau Dot Matrix) via hidden iframe
 * sehingga dialog print native browser langsung terbuka tanpa perlu berpindah halaman / membuka tab baru.
 */
export function printInvoiceDirect(invNo: string, mode: 'pdf' | 'matrix' = 'pdf') {
  const cleanId = (invNo || '').trim()
  if (!cleanId) return

  const iframeId = '__billing_direct_print_iframe__'
  let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null
  if (!iframe) {
    iframe = document.createElement('iframe')
    iframe.id = iframeId
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.style.visibility = 'hidden'
    document.body.appendChild(iframe)
  }

  const baseUrl = ROUTES.BILLING_PRINT(cleanId, mode)
  const printUrl = baseUrl + (baseUrl.includes('?') ? '&direct=1' : '?direct=1')
  iframe.src = printUrl
}

/**
 * Mengunduh file PDF invoice secara instan (1-klik) langsung ke folder Downloads
 * tanpa membuka dialog browser print.
 */
export function downloadInvoicePdf(invNo: string) {
  const cleanId = (invNo || '').trim()
  if (!cleanId) return

  const iframeId = '__billing_instant_download_iframe__'
  let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null
  if (!iframe) {
    iframe = document.createElement('iframe')
    iframe.id = iframeId
    // Off-screen dengan dimensi nyata agar canvas dapat mengukur dan merender font/tabel secara sempurna
    iframe.style.position = 'fixed'
    iframe.style.left = '-9999px'
    iframe.style.top = '0'
    iframe.style.width = '1200px'
    iframe.style.height = '900px'
    iframe.style.opacity = '0'
    iframe.style.pointerEvents = 'none'
    iframe.style.border = '0'
    iframe.style.zIndex = '-999'
    document.body.appendChild(iframe)
  }

  const baseUrl = ROUTES.BILLING_PRINT(cleanId, 'pdf')
  const downloadUrl = baseUrl + (baseUrl.includes('?') ? '&download=1' : '?download=1')
  iframe.src = downloadUrl
}
