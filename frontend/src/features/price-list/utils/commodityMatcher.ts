/**
 * Commodity Matcher - Pure utility function
 * Adopted from BillingValidationCard.tsx commodity matching logic
 */

export function isCommodityMatch(
  comodityName: string,
  category: string,
  mode?: string | null,
  isAirMode?: boolean,
): boolean {
  if (!comodityName || !category) return false

  const normCom = comodityName.toUpperCase().replace(/[\s\-_]+/g, ' ').trim()
  const normCat = category.toUpperCase().replace(/[\s\-_]+/g, ' ').trim()

  // 1. Explicit distinction: SEMI GARMENT vs GARMENT
  const isComSemiGarment = normCom.includes('SEMI GARMENT')
  const isCatSemiGarment = normCat.includes('SEMI GARMENT')

  if (isComSemiGarment) return isCatSemiGarment
  if (isCatSemiGarment) return false

  // 2. Direct exact match
  if (normCat === normCom) return true

  const isAir = isAirMode || (mode || '').toUpperCase().includes('AIR')

  if (isAir) {
    if (normCom.includes('GENERAL') && normCat.includes('GENERAL GOODS')) return true
    if (normCom.includes('BRANDED') && normCat.includes('BRANDED GOODS')) return true
    if (normCom.includes('GARMENT') && (normCat.includes('FABRIC') || normCat.includes('GARMENT'))) return true
    if ((normCom.includes('FOOD') || normCom.includes('MAKANAN')) && (normCat.includes('LS &') || normCat.includes('FOOD') || normCat.includes('MAKANAN'))) return true
    if (
      (normCom.includes('LAPTOP') || normCom.includes('TABLET')) &&
      (normCat.includes('LAPTOP') || normCat.includes('TABLET'))
    )
      return true
  } else {
    if (normCom.includes('UMUM') && (normCat.includes('GENERAL GOODS') || normCat === 'UMUM')) return true
    if (normCom.includes('TEKSTIL') && (normCat.includes('FABRIC') || normCat === 'TEKSTIL')) return true
    
    // LARTAS NORMAL
    const isComLartasNormal = normCom.includes('LARTAS N') || normCom.includes('LARTAS NORMAL')
    const isCatLartasNormal = normCat.includes('LARTAS NORMAL') || normCat.includes('LARTAS N')
    if (isComLartasNormal) return isCatLartasNormal

    // LARTAS SUPER / SPECIAL / KOSMETIK / ALKES / MAKANAN / LS
    // Operational Note: ALKES / MAKANAN / LS in operational data maps to LARTAS SUPER range (Kosmetik, Obat2an & Supplement & Alkes, Makanan & LS Lainnya)
    const isComLartasSuper =
      normCom.includes('LARTAS S') ||
      normCom.includes('LARTAS SUPER') ||
      normCom.includes('LARTAS SPECIAL') ||
      normCom.includes('KOSMETIK') ||
      normCom.includes('ALKES') ||
      normCom.includes('MAKANAN') ||
      normCom.includes('FOOD') ||
      normCom.includes('LS')

    if (isComLartasSuper) {
      return (
        normCat.includes('KOSMETIK') ||
        normCat.includes('OBAT') ||
        normCat.includes('SUPPLEMENT') ||
        normCat.includes('ALKES') ||
        normCat.includes('MAKANAN') ||
        normCat.includes('LS') ||
        normCat.includes('LARTAS S') ||
        normCat.includes('LARTAS SUPER')
      )
    }

    if (normCom.includes('GARMENT') && normCat.includes('GARMENT')) return true
    if ((normCom.includes('MACBOOK') || normCom.includes('LAPTOP')) && normCat.includes('LAPTOP')) return true
    if (
      (normCom.includes('IPAD') || normCom.includes('TABLET')) &&
      (normCat.includes('IPAD') || normCat.includes('TABLET'))
    )
      return true
  }

  // 3. Fallback exact substring match for longer strings
  if (normCat.length >= 5 && normCom.length >= 5) {
    if (normCat === normCom) return true
  }

  return false
}
