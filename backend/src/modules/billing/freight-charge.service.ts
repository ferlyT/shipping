import { prisma } from '../../config/database'

export interface FreightChargeItem {
  fdListCode: string
  fdCustCode: string
  fdMarkingCode: string
  fdMarkingNo: string
  fdInvoiceNo: string
  fdContainerNo: string
  fdJmlPack: number
  fdSatuan: string
  fdJmlBerat: number
  fdM3: number
  fdFc: number
  fdCurrFc: string
  fdFcCurr: number
  fdComodity: string
  fdTrackingNo: string
  fdKeteranganSJ: string
  fdListDate: Date | null
  fdTgl_IN: Date | null
  fdCreatedDate: Date | null
}

export interface FreightChargeCurrencySummary {
  currency: string
  totalFc: number
  totalColly: number
  totalBerat: number
  totalM3: number
  count: number
}

export interface FreightChargeCheckResponse {
  custCode: string
  markingCode: string
  totalLists: number
  listsWithFcCount: number
  totalColly: number
  totalBerat: number
  totalM3: number
  currencySummaries: FreightChargeCurrencySummary[]
  items: FreightChargeItem[]
}

/**
 * Get Freight Charge details and summary from tbEntrylist by custCode and markingCode
 */
export async function getFreightChargeByMarking(
  custCode: string,
  markingCode: string
): Promise<FreightChargeCheckResponse> {
  const cleanCustCode = (custCode || '').trim()
  const cleanMarkingCode = (markingCode || '').trim()

  if (!cleanCustCode && !cleanMarkingCode) {
    return {
      custCode: cleanCustCode,
      markingCode: cleanMarkingCode,
      totalLists: 0,
      listsWithFcCount: 0,
      totalColly: 0,
      totalBerat: 0,
      totalM3: 0,
      currencySummaries: [],
      items: [],
    }
  }

  // Query entrylist items
  const rows = await prisma.$queryRaw<any[]>`
    SELECT 
      RTRIM(e.fdListCode) as fdListCode,
      RTRIM(e.fdCustCode) as fdCustCode,
      RTRIM(e.fdMarkingCode) as fdMarkingCode,
      RTRIM(e.fdMarkingNo) as fdMarkingNo,
      RTRIM(e.fdInvoiceNo) as fdInvoiceNo,
      RTRIM(e.fdContainerNo) as fdContainerNo,
      COALESCE(e.fdJmlPack, 0) as fdJmlPack,
      RTRIM(e.fdSatuan) as fdSatuan,
      CAST(COALESCE(e.fdJmlBerat, 0) as float) as fdJmlBerat,
      CAST(COALESCE(e.fdM3, 0) as float) as fdM3,
      CAST(COALESCE(e.fdFc, 0) as float) as fdFc,
      RTRIM(COALESCE(e.fdCurrFc, '')) as fdCurrFc,
      COALESCE(e.fdFcCurr, 0) as fdFcCurr,
      RTRIM(COALESCE(e.fdComodity, '')) as fdComodity,
      RTRIM(COALESCE(e.fdTrackingNo, '')) as fdTrackingNo,
      RTRIM(COALESCE(e.fdKeteranganSJ, '')) as fdKeteranganSJ,
      e.fdListDate,
      e.fdTgl_IN,
      e.fdCreatedDate
    FROM tbEntrylist e WITH (NOLOCK)
    WHERE (${cleanCustCode} = '' OR RTRIM(e.fdCustCode) = ${cleanCustCode})
      AND (${cleanMarkingCode} = '' OR RTRIM(e.fdMarkingCode) = ${cleanMarkingCode})
    ORDER BY e.fdListCode ASC
  `

  const items: FreightChargeItem[] = rows.map((r) => ({
    fdListCode: String(r.fdListCode || '').trim(),
    fdCustCode: String(r.fdCustCode || '').trim(),
    fdMarkingCode: String(r.fdMarkingCode || '').trim(),
    fdMarkingNo: String(r.fdMarkingNo || '').trim(),
    fdInvoiceNo: String(r.fdInvoiceNo || '').trim(),
    fdContainerNo: String(r.fdContainerNo || '').trim(),
    fdJmlPack: Number(r.fdJmlPack || 0),
    fdSatuan: String(r.fdSatuan || '').trim(),
    fdJmlBerat: Number(r.fdJmlBerat || 0),
    fdM3: Number(r.fdM3 || 0),
    fdFc: Number(r.fdFc || 0),
    fdCurrFc: String(r.fdCurrFc || '').trim() || '—',
    fdFcCurr: Number(r.fdFcCurr || 0),
    fdComodity: String(r.fdComodity || '').trim(),
    fdTrackingNo: String(r.fdTrackingNo || '').trim(),
    fdKeteranganSJ: String(r.fdKeteranganSJ || '').trim(),
    fdListDate: r.fdListDate ? new Date(r.fdListDate) : null,
    fdTgl_IN: r.fdTgl_IN ? new Date(r.fdTgl_IN) : null,
    fdCreatedDate: r.fdCreatedDate ? new Date(r.fdCreatedDate) : null,
  }))

  // Calculate summaries
  let totalColly = 0
  let totalBerat = 0
  let totalM3 = 0
  let listsWithFcCount = 0

  const currMap = new Map<string, { totalFc: number; totalColly: number; totalBerat: number; totalM3: number; count: number }>()

  items.forEach((item) => {
    totalColly += item.fdJmlPack
    totalBerat += item.fdJmlBerat
    totalM3 += item.fdM3

    if (item.fdFc > 0) {
      listsWithFcCount++
      const curr = item.fdCurrFc || '—'
      if (!currMap.has(curr)) {
        currMap.set(curr, { totalFc: 0, totalColly: 0, totalBerat: 0, totalM3: 0, count: 0 })
      }
      const cData = currMap.get(curr)!
      cData.totalFc += item.fdFc
      cData.totalColly += item.fdJmlPack
      cData.totalBerat += item.fdJmlBerat
      cData.totalM3 += item.fdM3
      cData.count++
    }
  })

  const currencySummaries: FreightChargeCurrencySummary[] = []
  currMap.forEach((val, currency) => {
    currencySummaries.push({
      currency,
      totalFc: Number(val.totalFc.toFixed(4)),
      totalColly: val.totalColly,
      totalBerat: Number(val.totalBerat.toFixed(2)),
      totalM3: Number(val.totalM3.toFixed(4)),
      count: val.count,
    })
  })

  return {
    custCode: cleanCustCode,
    markingCode: cleanMarkingCode,
    totalLists: items.length,
    listsWithFcCount,
    totalColly,
    totalBerat: Number(totalBerat.toFixed(2)),
    totalM3: Number(totalM3.toFixed(4)),
    currencySummaries,
    items,
  }
}
