import { useMemo } from 'react'
import { evaluateItemPrice, isAuxiliaryItem, isVfcItem, isFreightChargeItem } from '../utils/billing.utils'
import type { BillingDetail } from '../types/billing.types'
import type { M3CheckResponse } from '../components/BillingValidationSummaryModal'

interface UseInvoiceMetricsParams {
  details: BillingDetail[]
  validationData?: M3CheckResponse | null
}

export interface UnderchargedItem {
  itemName: string
  billedPrice: number
  targetPrice: number
  difference: number
  priceSource?: string
  priceListDisplay?: string
}

export function useInvoiceMetrics({ details, validationData }: UseInvoiceMetricsParams) {
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

  const underchargedItems = useMemo<UnderchargedItem[]>(() => {
    if (!validationData || details.length === 0) return []

    const isAir = validationData.fdListType === 1 || validationData.expectedMode === 'BY AIR'
    const defaultTypeId = validationData.defaultFdTypeComodity ?? validationData.markingComodityType ?? null
    const defaultComodityName = validationData.markingComodities?.[0]?.fdComodityName || '—'

    return details
      .map((row) => {
        const evalRes = evaluateItemPrice(row, {
          res: validationData,
          isAir,
          defaultTypeId,
          defaultComodityName,
        })
        if (evalRes.statusType !== 'LOWER') return null
        return {
          itemName: row.fdItemName ?? '',
          billedPrice: Number(row.fdItemPrice || 0),
          targetPrice: evalRes.minTargetPrice,
          difference: evalRes.difference,
          priceSource: evalRes.targetColName,
          priceListDisplay: evalRes.priceListDisplay,
        } satisfies UnderchargedItem
      })
      .filter(Boolean) as UnderchargedItem[]
  }, [details, validationData])

  return {
    unitTotals,
    billedM3,
    billedKg,
    billedVfc,
    underchargedItems,
  }
}
