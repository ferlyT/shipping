/**
 * Commodity Synonym Groups and Category Matching Engine
 */

export const COMMODITY_SYNONYM_GROUPS: string[][] = [
  ['LARTAS - N', 'LARTAS-N', 'LARTAS N', 'LARTAS NORMAL', 'BRANDED GOODS,LARTAS NORMAL'],
  ['LARTAS - S', 'LARTAS-S', 'LARTAS S', 'LARTAS SUPER', 'BRANDED GOODS,LARTAS', 'BRANDED GOODS', 'BRANDED', 'KOSMETIK,OBAT2AN & LS', 'KOSMETIK,OBAT2AN & SUPPLEMENT', 'ALKES, MAKANAN & LS LAINNYA', 'ALKES'],
  ['UMUM', 'GENERAL', 'GENERAL GOODS', 'GENERAL GOODS & NON-BRAND (NON BATTERY)', 'GENERAL GOODS & NON-BRAND', 'NON BRAND', 'NON-BRAND'],
  ['TEKSTIL', 'FABRIC', 'TEXTILE', 'FABRIC, GARMENTS'],
  ['SEMI GARMENT', 'SEMI-GARMENT', 'SEMI GARMENT / BATTERY / POWERBANK ( MSDS REQUIRED)', 'SEMI GARMENT / BATTERY ( MSDS BATTERY REQUIRED FOR CHECKING )', 'SEMI GARMENT / BATTERY'],
  ['GARMENT', 'GARMENTS', 'FABRIC, GARMENTS (PACKING WITH FULL BOXES)'],
  ['ALKES', 'MEDICAL', 'ALKES, MAKANAN & LS LAINNYA', 'KOSMETIK,OBAT2AN & SUPPLEMENT', 'KOSMETIK,OBAT2AN & LS', 'FOOD', 'MAKANAN', 'OBAT', 'KOSMETIK', 'SUPPLEMENT', 'LS & (GOODS WITH BATTERY)'],
  [
    'LAPTOP/TABLET',
    'MACBOOK & OTHER LAPTOP',
    'LAPTOP',
    'LAPTOPS',
    'USED LAPTOP',
    'NOTEBOOK',
    'NOTEBOOK COMPUTER',
    'MACBOOK',
    'LAPTOP (PRICE PER PCS, MIN. CHARGE 3 PCS)',
    'LAPTOP (SELAIN MEREK APPLE PRICE PER KG, MIN. 3PCS)',
    'APPLE LAPTOP',
    'APPLE LAPTOP ( PER KG )',
  ],
  [
    'IPAD & OTHER TABLET',
    'IPAD',
    'APPLE IPAD',
    'TABLET',
    'SMART TABLET',
    'APPLE SMART TABLET',
    'KHUSUS IPAD (PRICE PER PCS, MIN. CHARGE 3 PCS )',
    'KHUSUS IPAD',
    'TABLET (PRICE PER PCS, MIN. CHARGE 3PCS)',
    'TABLET (PRICE PER KG, MIN 3PCS)',
  ],
  ['HANDPHONE', 'APPLE PRODUCT (IWATCH, AIRPODS, IPENCIL)', 'HP'],
  ['FCL'],
  ['LEGAL'],
  ['MASKER'],
  ['SEPEDA MAHAL'],
  ['PESTISIDA'],
]

export function normalizeCommodityString(val: string): string {
  return (val || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
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

export function findBestCategoryMatch<T extends { category: string; price?: any }>(
  items: T[],
  entryTypeName: string,
  filterFn?: (item: T) => boolean,
): T | null {
  const target = (entryTypeName || '').trim().toUpperCase()
  if (!target || !items || items.length === 0) return null

  const candidates = filterFn ? items.filter(filterFn) : items
  if (candidates.length === 0) return null

  // 1. Prioritas Utama: Exact match (case-insensitive & trimmed)
  const exact = candidates.find((it) => it.category.trim().toUpperCase() === target)
  if (exact) return exact

  // 2. Normalized match (tanpa spasi / tanda minus, misal: "SEMI-GARMENT" vs "SEMI GARMENT")
  const normTarget = normalizeCommodityString(target)
  const normMatch = candidates.find(
    (it) => normalizeCommodityString(it.category) === normTarget
  )
  if (normMatch) return normMatch

  // 2b. Jika target adalah genuine battery (misal: "LAPTOP BATTERY", "POWERBANK", "BATTERY"), cocokkan langsung ke kategori SEMI GARMENT / BATTERY
  if (isGenuineBattery(target)) {
    const batteryMatch = candidates.find((it) => {
      const cat = it.category.trim().toUpperCase()
      return cat.includes('SEMI GARMENT') || cat.includes('BATTERY') || cat.includes('POWERBANK')
    })
    if (batteryMatch) return batteryMatch
  }

  // 2c. Jika target adalah genuine iPad / Tablet, cocokkan langsung ke kategori Khusus Ipad / Tablet di Price List
  if (isGenuineIpad(target)) {
    const ipadMatch = candidates.find((it) => {
      const cat = it.category.trim().toUpperCase()
      return cat.includes('KHUSUS IPAD') || cat.includes('TABLET') || cat.includes('IPAD')
    })
    if (ipadMatch) return ipadMatch
  }

  // 2d. Jika target adalah genuine Laptop / MacBook / Notebook, cocokkan ke kategori Laptop di Price List
  if (isGenuineLaptop(target)) {
    if (isAppleDevice(target)) {
      const appleLaptopMatch = candidates.find((it) => {
        const cat = it.category.trim().toUpperCase()
        return cat.includes('APPLE LAPTOP') || cat.includes('MACBOOK')
      })
      if (appleLaptopMatch) return appleLaptopMatch
    }
    const laptopMatch = candidates.find((it) => {
      const cat = it.category.trim().toUpperCase()
      return cat.includes('LAPTOP') || cat.includes('NOTEBOOK')
    })
    if (laptopMatch) return laptopMatch
  }

  // 3. Synonym Group Match (Pencocokan relasi nama komoditi tbTypeComodity <-> kategori Excel Price List)
  const matchingGroup = COMMODITY_SYNONYM_GROUPS.find((group) => {
    const isLaptopGroup = group.some((s) => s.includes('LAPTOP') || s.includes('MACBOOK'))
    const isIpadGroup = group.some((s) => s.includes('IPAD') || s.includes('TABLET'))
    if (isLaptopGroup && !isGenuineLaptop(target)) return false
    if (isIpadGroup && !isGenuineIpad(target)) return false

    return group.some((syn) => {
      const sNorm = normalizeCommodityString(syn)
      return sNorm === normTarget || syn.toUpperCase() === target
    })
  })

  if (matchingGroup) {
    // 3a. Exact match against synonym item
    for (const syn of matchingGroup) {
      const synNorm = normalizeCommodityString(syn)
      const found = candidates.find((it) => {
        const cat = it.category.trim().toUpperCase()
        const catNorm = normalizeCommodityString(cat)
        return cat === syn.toUpperCase() || catNorm === synNorm
      })
      if (found) return found
    }

    // 3b. StartsWith match against synonym item (e.g. 'SEMI GARMENT' matching 'SEMI GARMENT / BATTERY...')
    for (const syn of matchingGroup) {
      const found = candidates.find((it) => {
        const cat = it.category.trim().toUpperCase()
        return cat.startsWith(syn.toUpperCase()) || syn.toUpperCase().startsWith(cat)
      })
      if (found) return found
    }
  }

  // 4. Word-Boundary prefix match (misal: "GENERAL GOODS" vs "GENERAL GOODS NORMAL", tapi BUKAN "GARMENT" mencocokkan "SEMI GARMENT")
  const wordMatch = candidates.find((it) => {
    const cat = it.category.trim().toUpperCase()
    if (['LAPTOP', 'NOTEBOOK', 'MACBOOK'].some((k) => cat.includes(k)) && !isGenuineLaptop(target)) {
      return false
    }
    if (['IPAD', 'TABLET'].some((k) => cat.includes(k)) && !isGenuineIpad(target)) {
      return false
    }
    if (target.startsWith(`${cat} `) || cat.startsWith(`${target} `)) return true
    return false
  })
  if (wordMatch) return wordMatch

  return null
}

/**
 * Enhanced category matcher that first checks dynamic db-backed commodity mapping
 * (Customer -> Global), then falls back to static matching.
 */
export async function matchCategoryWithDynamicMapping<T extends { category: string; price?: any }>(
  items: T[],
  commodityName: string,
  options?: {
    custCode?: string | null
    targetDate?: Date
    mode?: string | null
    filterFn?: (item: T) => boolean
  }
): Promise<{ matchedItem: T | null; isDynamicMapped: boolean; mappedTarget?: string; sourceScope?: string }> {
  if (!commodityName || !items || items.length === 0) {
    return { matchedItem: null, isDynamicMapped: false }
  }

  try {
    // Dynamic import to avoid circular dependency
    const { resolveMappedCommodity } = await import('../commodity-mapping/commodity-mapping.service')
    const resolution = await resolveMappedCommodity(
      commodityName,
      options?.custCode,
      options?.targetDate || new Date(),
      options?.mode
    )

    if (resolution.isMapped && resolution.targetCommodity) {
      const match = findBestCategoryMatch(items, resolution.targetCommodity, options?.filterFn)
      if (match) {
        return {
          matchedItem: match,
          isDynamicMapped: true,
          mappedTarget: resolution.targetCommodity,
          sourceScope: resolution.sourceScope,
        }
      }
    }
  } catch (err) {
    // Fallback gracefully to static matching if dynamic resolution encounters an error
  }

  const staticMatch = findBestCategoryMatch(items, commodityName, options?.filterFn)
  return {
    matchedItem: staticMatch,
    isDynamicMapped: false,
  }
}

