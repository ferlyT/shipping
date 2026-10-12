import { prisma } from '../../config/database'
import { logger } from '../../config/logger'

export interface CommodityMonthlyStat {
  month: number
  monthName: string
  value: number
  percentage: number
}

export interface CommodityStatItem {
  name: string
  color: string
  unit: string
  totalValue: number
  percentage: number
  monthly: CommodityMonthlyStat[]
}

export interface ModeCommodityStats {
  hasData: boolean
  totalResi: number
  commodities: CommodityStatItem[]
}

export interface CustomerCommodityStatsResult {
  year: number
  hasData: boolean
  sea: ModeCommodityStats
  air: ModeCommodityStats
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des']

const PALETTE = [
  '#E0644E', // accent terra cotta
  '#2E9F76', // ok emerald
  '#4B9CFA', // sea ocean blue
  '#E5A93C', // air amber
  '#9D72FF', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#10B981', // mint
  '#6366F1', // indigo
]

export async function getCustomerCommodityStats(
  customerId: string,
  targetYear?: number
): Promise<CustomerCommodityStatsResult> {
  const year = targetYear || new Date().getFullYear()
  const cleanId = customerId.trim()

  const emptyResult: CustomerCommodityStatsResult = {
    year,
    hasData: false,
    sea: { hasData: false, totalResi: 0, commodities: [] },
    air: { hasData: false, totalResi: 0, commodities: [] },
  }

  const startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0))
  const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999))
  const billingEnd = new Date(Date.UTC(year + 1, 1, 28, 23, 59, 59, 999))

  try {
    // 1. Kueri CTE MS SQL Server berindeks: CustomerResi, ResiDetailVolume, dan BillingSpecialUnits
    const rawRows = await prisma.$queryRaw<any[]>`
      WITH CustomerResi AS (
        SELECT 
          el.fdListCode,
          ISNULL(el.fdListType, 2) AS fdListType,
          ISNULL(el.fdTypeComodity, 0) AS fdTypeComodity,
          RTRIM(ISNULL(tc.fdComodityName, '')) AS rawComodityName,
          MONTH(el.fdTglAgent) AS fdMonth,
          CAST(ISNULL(el.fdJmlBerat, 0) AS DECIMAL(18,2)) AS elBerat,
          CAST(ISNULL(el.fdM3, 0) AS DECIMAL(18,4)) AS elM3,
          CAST(ISNULL(el.fdJmlPack, 1) AS DECIMAL(18,2)) AS elPack
        FROM tbEntryList el WITH (NOLOCK)
        LEFT JOIN tbTypeComodity tc WITH (NOLOCK) 
          ON tc.fdTypeComodity = el.fdTypeComodity AND tc.fdListType = el.fdListType
        WHERE el.fdCustCode = ${cleanId}
          AND el.fdTglAgent >= ${startDate}
          AND el.fdTglAgent <= ${endDate}
      ),
      ResiDetailVolume AS (
        SELECT 
          det.fdListCode,
          SUM(
            CAST(
              (COALESCE(komp.fdPjg, det.fdPjg, 0) * 
               COALESCE(komp.fdLbr, det.fdLbr, 0) * 
               COALESCE(komp.fdTng, det.fdTng, 0) * 
               COALESCE(komp.fdQty, det.fdQty, 1)) / 1000000.0 
            AS DECIMAL(18,4))
          ) AS detailM3
        FROM tbEntryListDetail det WITH (NOLOCK)
        INNER JOIN CustomerResi cr ON cr.fdListCode = det.fdListCode
        LEFT JOIN tbEntryListDetail_Komplain komp WITH (NOLOCK)
          ON komp.fdListCode = det.fdListCode AND komp.fdListDCode = det.fdListDCode
        GROUP BY det.fdListCode
      ),
      BillingSpecialUnits AS (
        SELECT 
          b.fdListCode,
          RTRIM(bd.fdListCode) AS bdListCode,
          SUM(CAST(ISNULL(bd.fdQty, 0) AS DECIMAL(18,2))) AS bdQty
        FROM tbBillingDetail bd WITH (NOLOCK)
        INNER JOIN tbBilling b WITH (NOLOCK) ON b.fdInvNo = bd.fdInvNo
        WHERE b.fdCustCode = ${cleanId}
          AND b.fdInvDate >= ${startDate}
          AND b.fdInvDate <= ${billingEnd}
          AND RTRIM(bd.fdListCode) IN ('PCS', 'PCE', 'UNIT', 'CTR')
        GROUP BY b.fdListCode, RTRIM(bd.fdListCode)
      )
      SELECT 
        cr.fdListCode,
        cr.fdListType,
        cr.fdTypeComodity,
        cr.rawComodityName,
        cr.fdMonth,
        cr.elBerat,
        cr.elPack,
        CASE 
          WHEN rdv.detailM3 IS NOT NULL AND rdv.detailM3 > 0 THEN rdv.detailM3
          ELSE cr.elM3 
        END AS finalM3,
        bsu.bdListCode AS specialUnit,
        bsu.bdQty AS specialQty
      FROM CustomerResi cr
      LEFT JOIN ResiDetailVolume rdv ON rdv.fdListCode = cr.fdListCode
      LEFT JOIN BillingSpecialUnits bsu ON bsu.fdListCode = cr.fdListCode
    `

    if (!rawRows || rawRows.length === 0) {
      return emptyResult
    }

    // Pisahkan muatan laut dan udara
    const seaRows = rawRows.filter((r) => Number(r.fdListType) === 2)
    const airRows = rawRows.filter((r) => Number(r.fdListType) === 1)

    const processMode = (rows: any[], mode: 'sea' | 'air'): ModeCommodityStats => {
      if (rows.length === 0) {
        return { hasData: false, totalResi: 0, commodities: [] }
      }

      // Group per komoditas
      // Komoditas item: { name, unit, totalValue, monthlyValues: number[12] }
      const map = new Map<string, { name: string; unit: string; totalValue: number; monthlyValues: number[] }>()
      const totalMonthValues: number[] = Array(12).fill(0)

      for (const row of rows) {
        const monthIdx = Math.max(0, Math.min(11, (Number(row.fdMonth) || 1) - 1))
        const typeComodity = Number(row.fdTypeComodity)
        const rawName = String(row.rawComodityName || '').trim()
        const specialUnit = String(row.specialUnit || '').trim().toUpperCase()
        const specialQty = Number(row.specialQty) || 0
        const elBerat = Number(row.elBerat) || 0
        const finalM3 = Number(row.finalM3) || 0
        const elPack = Number(row.elPack) || 1

        let name = rawName
        let unit = mode === 'sea' ? 'm³' : 'kg'
        let value = 0

        // 1. Evaluasi FCL (Laut: typeComodity = 5 atau nama mengandung FCL atau specialUnit = CTR)
        if (mode === 'sea' && (typeComodity === 5 || rawName.includes('FCL') || specialUnit === 'CTR')) {
          name = 'FCL'
          unit = 'CTR'
          value = specialQty > 0 ? specialQty : 1
        }
        // 2. Evaluasi Laptop / iPad / Gadget (specialUnit IN (PCS, PCE, UNIT) atau typeComodity Laptop)
        else if (
          ['PCS', 'PCE', 'UNIT'].includes(specialUnit) ||
          typeComodity === 8 ||
          typeComodity === 15 ||
          typeComodity === 16 ||
          rawName.includes('LAPTOP') ||
          rawName.includes('TABLET') ||
          rawName.includes('MACBOOK') ||
          rawName.includes('IPAD')
        ) {
          name = rawName || (mode === 'sea' ? 'LAPTOP & GADGET' : 'LAPTOP/TABLET')
          unit = specialUnit || 'PCS'
          value = specialQty > 0 ? specialQty : (elPack > 0 ? elPack : 1)
        }
        // 3. Kargo Laut Umum
        else if (mode === 'sea') {
          name = rawName || 'UMUM'
          unit = 'm³'
          value = finalM3
        }
        // 4. Kargo Udara Umum
        else {
          name = rawName || 'GENERAL'
          unit = 'kg'
          value = elBerat
        }

        const mapKey = `${name}__${unit}`
        let entry = map.get(mapKey)
        if (!entry) {
          entry = {
            name,
            unit,
            totalValue: 0,
            monthlyValues: Array(12).fill(0),
          }
          map.set(mapKey, entry)
        }

        entry.totalValue += value
        entry.monthlyValues[monthIdx] = (entry.monthlyValues[monthIdx] ?? 0) + value
        totalMonthValues[monthIdx] = (totalMonthValues[monthIdx] ?? 0) + value
      }

      // Hitung total keseluruhan untuk penentuan persentase tahunan
      // Hitung sum of totals
      const overallSum = Array.from(map.values()).reduce((acc, curr) => acc + curr.totalValue, 0)

      let colorIdx = 0
      const commodities: CommodityStatItem[] = Array.from(map.values())
        .map((entry) => {
          const color = PALETTE[colorIdx % PALETTE.length] || '#E0644E'
          colorIdx++

          const percentage = overallSum > 0 ? Number(((entry.totalValue / overallSum) * 100).toFixed(1)) : 0

          const monthly: CommodityMonthlyStat[] = entry.monthlyValues.map((val, idx) => {
            const mTotal = totalMonthValues[idx] ?? 0
            const mPct = mTotal > 0 ? Number(((val / mTotal) * 100).toFixed(1)) : 0
            return {
              month: idx + 1,
              monthName: MONTH_NAMES[idx] || `Bulan ${idx + 1}`,
              value: Number(val.toFixed(2)),
              percentage: mPct,
            }
          })

          return {
            name: entry.name,
            color,
            unit: entry.unit,
            totalValue: Number(entry.totalValue.toFixed(2)),
            percentage,
            monthly,
          }
        })
        .sort((a, b) => b.totalValue - a.totalValue)

      return {
        hasData: commodities.length > 0,
        totalResi: rows.length,
        commodities,
      }
    }

    const sea = processMode(seaRows, 'sea')
    const air = processMode(airRows, 'air')

    return {
      year,
      hasData: sea.hasData || air.hasData,
      sea,
      air,
    }
  } catch (error: any) {
    logger.error('Error fetching customer commodity stats:', {
      customerId,
      year,
      error: error.message,
    })
    return emptyResult
  }
}
