import { formatDecimal, formatCurrency } from '@/lib/utils'

export type BillingStatus = 'draft' | 'issued' | 'collected'

export interface StatusRow {
  fdGive?: number | null
  fdGive2?: number | null
  fdCekDate?: string | null
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

export interface PriceEvaluationContext {
  res?: any
  isAir: boolean
  defaultTypeId?: number | null
  defaultComodityName?: string
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
  isTransportItem: boolean
  isFreightChargeItem?: boolean
  targetColName: string
  priceListDisplay: string
  statusType: 'MATCH' | 'LOWER' | 'HIGHER' | 'NO_TARGET'
  difference: number
  isUndercharge?: boolean
  isOvercharge?: boolean
  tierSource?: string
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

  const nonBatteryAccessories = [
    'CHARGER',
    'CHARGING',
    'CASAN',
    'CASE',
    'CASING',
    'HOLDER',
    'TESTER',
    'COVER',
    'BAG',
    'BOX',
    'STRAP',
    'SPRING',
    'CONNECTOR',
    'CLIP',
    'CLAMP',
    'INSULATOR',
    'WRAP',
    'CABLE',
    'WIRE',
    'BRACKET',
    'INDICATOR',
    'GAUGE',
  ]

  for (const acc of nonBatteryAccessories) {
    const regex = new RegExp(`\\b${acc}\\b`, 'i')
    if (regex.test(upper)) {
      return false
    }
  }

  return true
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
  const itemNameUpper = (item?.fdItemName || '').toUpperCase()
  const isTransportItem =
    itemNameUpper.includes('TRANSPORT') ||
    itemNameUpper.includes('DELIVERY') ||
    itemNameUpper.includes('ONGKIR') ||
    itemNameUpper.includes('TRUCKING')

  // Apabila ada item Transport Charges: tidak perlu dicek karena angkanya tidak dapat divalidasi dengan master tarif
  if (isTransportItem) {
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
      targetColName: 'Tidak Dicek',
      priceListDisplay: '— (Biaya Transport)',
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
  let typeId = item?.fdTypeComodity ?? defaultTypeId ?? res?.markingComodityType ?? null
  let directComodityName = ''

  // 1. Scoring & token matching dengan marking commodities
  if (res?.markingComodities && res.markingComodities.length > 0) {
    const textAfterDash = itemNameUpper.includes('-')
      ? itemNameUpper.split('-').slice(1).join('-').trim()
      : itemNameUpper.replace(/^PARCELS\s+/i, '').trim()

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

        const catNameUpper = (m.fdComodityName || '').toUpperCase()
        const isSuperLartas =
          catNameUpper.includes('LARTAS - S') ||
          catNameUpper.includes('LARTAS-S') ||
          catNameUpper.includes('LARTAS S')

        return {
          candidate: m,
          mComUpper,
          matchCount,
          isFullExact,
          isSuperLartas,
          length: mComUpper.length,
        }
      })
      .filter((sc: any) => sc.matchCount > 0)
      .sort((a: any, b: any) => {
        if (a.isFullExact !== b.isFullExact) return a.isFullExact ? -1 : 1
        if (a.matchCount !== b.matchCount) return b.matchCount - a.matchCount
        if (a.isSuperLartas !== b.isSuperLartas) return a.isSuperLartas ? -1 : 1
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

  const itemUnit = (item?.fdListCode || '').trim().toUpperCase()
  const isTaxReturnItem = itemNameUpper.includes('TAX RETURN') || itemNameUpper.includes('TAXRETURN')
  const isKgOverweightItem =
    !isAir &&
    (itemUnit === 'KG' || itemNameUpper.includes('(KG)') || itemNameUpper.includes('PARCELS TO JAKARTA (KG)'))

  // 2. Tentukan nama komoditi
  let comodityName = ''
  if (isKgOverweightItem) {
    comodityName = 'HARGA KG (PER AGEN)'
  } else {
    if (typeId) {
      const matchType = res?.comodityTypes?.find(
        (c: any) => c.fdTypeComodity === typeId && (listType ? c.fdListType === listType : true)
      )
      if (matchType) {
        comodityName = matchType.fdComodityName
      }
    }
    const rawTarget = directComodityName || item?.fdComodity || itemNameUpper
    if (!comodityName) {
      comodityName = rawTarget || defaultComodityName || '—'
    }
  }

  // 3. Pencocokan dengan items di Price List
  let priceItem: any | null = null
  let minTargetPrice = 0
  let maxTargetPrice = 0

  if (!isTaxReturnItem && !isKgOverweightItem && res?.priceValidation?.items && comodityName !== '—') {
    const modeFilter = res.expectedMode || (listType === 1 ? 'BY AIR' : listType === 2 ? 'BY SEA' : null)
    const branchFilter = res.expectedBranch || null
    const isMkt = isMktCustomer(res?.customer, res?.customer?.fdSalesNM || (res as any)?.sales)
    const expectedSheetType = isMkt ? 'MKT' : 'CS'

    const custCandidates = res.priceValidation.items.filter((p: any) => {
      if (p.sheetType?.toUpperCase() !== 'CUSTOMER') return false
      if (modeFilter && p.mode && p.mode.toUpperCase() !== modeFilter.toUpperCase()) return false
      if (branchFilter && p.branch && !isBranchMatched(p.branch, branchFilter)) return false
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

      if (isAir) {
        if (normName.includes('GENERAL') || normName.includes('UMUM')) {
          heuristicItem = items.find((p: any) => String(p?.category || '').toLowerCase().includes('general goods') || String(p?.category || '').toUpperCase() === 'UMUM') || null
        } else if (normName.includes('BRANDED')) {
          heuristicItem = items.find((p: any) => String(p?.category || '').toLowerCase().includes('branded goods')) || null
        } else if (normName.includes('GARMENT')) {
          heuristicItem = items.find((p: any) => String(p?.category || '').toLowerCase().includes('fabric') || String(p?.category || '').toLowerCase().includes('garment')) || null
        } else if (normName.includes('FOOD')) {
          heuristicItem = items.find((p: any) => String(p?.category || '').toLowerCase().includes('ls &') || String(p?.category || '').toLowerCase().includes('food')) || null
        } else if (isGenuineIpad(normName) || normName.includes('TABLET') || normName.includes('IPAD')) {
          heuristicItem = items.find((p: any) => String(p?.category || '').toLowerCase().includes('tablet') || String(p?.category || '').toLowerCase().includes('ipad')) || null
        } else if (isGenuineLaptop(normName) || normName.includes('LAPTOP') || normName.includes('MACBOOK')) {
          if (isAppleDevice(normName)) {
            heuristicItem = items.find((p: any) => String(p?.category || '').toLowerCase().includes('apple laptop')) || null
          }
          if (!heuristicItem) {
            heuristicItem = items.find((p: any) => String(p?.category || '').toLowerCase().includes('selain merek apple') || String(p?.category || '').toLowerCase().includes('laptop')) || null
          }
        }
      } else {
        if (normName.includes('UMUM') || normName.includes('GENERAL')) {
          heuristicItem = items.find((p: any) => String(p?.category || '').toLowerCase().includes('general goods') || String(p?.category || '').toUpperCase() === 'UMUM') || null
        } else if (normName.includes('TEKSTIL')) {
          heuristicItem = items.find((p: any) => String(p?.category || '').toLowerCase().includes('fabric') || String(p?.category || '').toUpperCase() === 'TEKSTIL') || null
        } else if (normName.includes('LARTAS N') || normName.includes('LARTAS NORMAL')) {
          heuristicItem = items.find((p: any) => String(p?.category || '').toLowerCase().includes('lartas normal') || String(p?.category || '').toUpperCase().includes('LARTAS NORMAL') || String(p?.category || '').toUpperCase().includes('LARTAS - N') || String(p?.category || '').toUpperCase().includes('LARTAS-N')) || null
        } else if (normName.includes('ALKES') || normName.includes('MAKANAN') || normName.includes('FOOD') || normName.includes('LS')) {
          heuristicItem = items.find((p: any) => String(p?.category || '').toLowerCase().includes('alkes') || String(p?.category || '').toLowerCase().includes('makanan') || String(p?.category || '').toLowerCase().includes('ls')) || null
        } else if (normName.includes('LARTAS S') || normName.includes('LARTAS SUPER') || normName.includes('LARTAS SPECIAL') || normName.includes('KOSMETIK')) {
          const matchedItems = items.filter((p: any) => {
            const cat = String(p?.category || '').toLowerCase()
            const catUpper = String(p?.category || '').toUpperCase()
            return cat.includes('kosmetik') || cat.includes('obat') || cat.includes('alkes') || cat.includes('makanan') || cat.includes('ls') || catUpper.includes('LARTAS S') || catUpper.includes('LARTAS-S')
          })
          if (matchedItems.length > 0) {
            heuristicItem = matchedItems[0]
            minP = Math.min(...matchedItems.map((p: any) => Number(p?.price || 0)))
            maxP = Math.max(...matchedItems.map((p: any) => Number(p?.price || 0)))
          }
        } else if (normName.includes('SEMI GARMENT') || isGenuineBattery(normName) || isGenuineBattery(itemNameUpper)) {
          heuristicItem = items.find((p: any) => String(p?.category || '').toLowerCase().includes('semi garment')) || null
        } else if (normName.includes('GARMENT')) {
          heuristicItem = items.find((p: any) => String(p?.category || '').toLowerCase().includes('garment')) || null
        } else if (isGenuineLaptop(normName) || normName.includes('MACBOOK') || normName.includes('LAPTOP')) {
          heuristicItem = items.find((p: any) => String(p?.category || '').toLowerCase().includes('laptop')) || null
        } else if (isGenuineIpad(normName) || normName.includes('IPAD') || normName.includes('TABLET')) {
          heuristicItem = items.find((p: any) => String(p?.category || '').toLowerCase().includes('khusus ipad') || String(p?.category || '').toLowerCase().includes('ipad') || String(p?.category || '').toLowerCase().includes('tablet')) || null
        }
      }

      if (heuristicItem) {
        return { item: heuristicItem, min: minP, max: maxP, catName: comodityName }
      }

      const substringMatched = items.find((p: any) => {
        const catUpper = String(p?.category || '').toUpperCase()
        return catUpper && (catUpper.includes(nameUpper) || nameUpper.includes(catUpper))
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

  // 4. Harga profil customer di DB (Overweight KG & Tax Return sebagai acuan, Komoditi biasa sebagai pembanding saja)
  let profilePrice = 0
  if (isKgOverweightItem) {
    profilePrice = Number(res?.profileHarga?.kg || 0)
    minTargetPrice = profilePrice
    maxTargetPrice = profilePrice
  } else if (isTaxReturnItem) {
    profilePrice = Number(res?.profileHarga?.taxReturnPrice || 0)
  } else {
    // Tampilkan profil customer dari DB sebagai data pembanding (TIDAK menjadi acuan validasi tarif)
    profilePrice = Number(res?.profileHarga?.harga || 0)
  }

  const billedPrice = Number(item?.fdItemPrice || 0)

  // 5. Evaluasi kecocokan harga
  const isMatched = isKgOverweightItem
    ? (profilePrice > 0 && Math.abs(billedPrice - profilePrice) < 0.01)
    : isTaxReturnItem
    ? (profilePrice > 0 && Math.abs(billedPrice - profilePrice) < 0.01)
    : (priceItem ? (billedPrice >= minTargetPrice - 0.01 && billedPrice <= maxTargetPrice + 0.01) : false)

  const hasTargetPrice = isKgOverweightItem ? profilePrice > 0 : isTaxReturnItem ? profilePrice > 0 : priceItem !== null
  const targetColName = isKgOverweightItem
    ? 'Tarif KG Agen'
    : isTaxReturnItem
    ? 'Tarif Tax Return'
    : priceItem
    ? (priceItem.sheetType === 'CUSTOMER' ? 'Price List Cust' : 'Price List Master')
    : 'Tidak Ada Acuan'

  let priceListDisplay = '—'
  if (isKgOverweightItem) {
    priceListDisplay = profilePrice > 0 ? formatCurrency(profilePrice) : '—'
  } else if (isTaxReturnItem) {
    priceListDisplay = res?.profileHarga?.taxReturnPrice && res.profileHarga.taxReturnPrice > 0 ? formatCurrency(res.profileHarga.taxReturnPrice) : '—'
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
  }

  let statusType: 'MATCH' | 'LOWER' | 'HIGHER' | 'NO_TARGET' = 'NO_TARGET'
  let difference = 0
  let isUndercharge = false
  let isOvercharge = false

  if (isMatched) {
    statusType = 'MATCH'
  } else if (hasTargetPrice && (isTaxReturnItem ? profilePrice > 0 : priceItem !== null)) {
    const targetRef = isTaxReturnItem ? profilePrice : maxTargetPrice
    if (billedPrice > targetRef) {
      statusType = 'HIGHER'
      difference = billedPrice - targetRef
      isOvercharge = true
    } else {
      const minRef = isTaxReturnItem ? profilePrice : minTargetPrice
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
    isTransportItem: false,
    targetColName,
    priceListDisplay,
    statusType,
    difference,
    isUndercharge,
    isOvercharge,
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
      parentInvNo: '',
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

// ─── Item Classifiers ────────────────────────────────────────────────────────

/** Returns true for auxiliary items like Tax Return, Admin, Surcharge, etc. */
export function isAuxiliaryItem(name?: string | null): boolean {
  const n = (name || '').toUpperCase()
  return (
    n.includes('TAX RETURN') ||
    n.includes('ADMIN') ||
    n.includes('SURCHARGE') ||
    n.includes('DISCOUNT') ||
    n.includes('BIAYA') ||
    n.includes('PENYESUAIAN')
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
