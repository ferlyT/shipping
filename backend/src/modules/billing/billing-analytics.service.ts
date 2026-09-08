import { prisma } from '../../config/database'
import { Prisma } from '@prisma/client'
import { getLastNDays, getLastNMonths, calculateTrend } from '../../utils/dateRange'
import { logger } from '../../config/logger'
import { findBestCategoryMatch } from './billing-category.matcher'
import { evaluateBatchPriceCheck } from '../price-check/price-check.service'

function getBranchCode(b: string): string {
  const u = (b || '').toUpperCase().trim()
  if (u.includes('GUANGZHOU') || u === 'GZ') return 'GZ'
  if (u.includes('YIWU') || u === 'YW') return 'YW'
  if (u.includes('SHANGHAI') || u === 'SH') return 'SH'
  if (u.includes('SHENZHEN') || u === 'SZ') return 'SZ'
  if (u.includes('HONGKONG') || u === 'HK') return 'HK'
  if (u.includes('SINGAPORE') || u === 'SG') return 'SG'
  return u
}

const PIC_KEYS = ['thara', 'yati', 'kiki', 'ferly', 'rico'] as const

export async function getBillingByEmployeeDaily(query?: Record<string, string | undefined>) {
  const customDays = query?.days ? parseInt(query.days, 10) : 7
  const days = getLastNDays(customDays)

  const rows = await prisma.tbBilling.findMany({
    where: { fdInvDate: { gte: days[0]!.start, lte: days[days.length - 1]!.end } },
    select: { fdInvDate: true, fdEmpCode: true, fdJumlah1: true },
  })

  // Tentukan top 5 karyawan berdasarkan total bill dalam 7 hari ini
  const totalPerEmp = new Map<string, number>()
  for (const row of rows) {
    const code = row.fdEmpCode?.trim() || '-'
    totalPerEmp.set(code, (totalPerEmp.get(code) || 0) + 1)
  }
  const topCodes = [...totalPerEmp.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([code]) => code)

  const employees = await prisma.tbEmployees.findMany({
    where: { fdEmpCode: { in: topCodes.filter((c) => c !== '-') } },
    select: { fdEmpCode: true, fdEmpName: true },
  })
  // fdEmpCode ber-tipe Char(7) di SQL Server → di-pad spasi di belakang saat disimpan.
  const nameMap = new Map(employees.map((e) => [e.fdEmpCode.trim(), e.fdEmpName.trim()]))
  const empLabel = (code: string) => (code === '-' ? 'Tanpa Nama' : nameMap.get(code) || code)

  const hasOthers = [...totalPerEmp.keys()].some((code) => !topCodes.includes(code))
  const seriesKeys = hasOthers ? [...topCodes, '__others__'] : topCodes

  // Hitung jumlah bill DAN total tagihan per hari per seri (karyawan top 5, sisanya digabung "Lainnya")
  const counts = days.map(() => new Map<string, number>())
  const sums = days.map(() => new Map<string, number>())
  for (const row of rows) {
    const code = row.fdEmpCode?.trim() || '-'
    const dayIdx = days.findIndex((d) => row.fdInvDate >= d.start && row.fdInvDate <= d.end)
    if (dayIdx === -1) continue
    const seriesKey = topCodes.includes(code) ? code : '__others__'
    counts[dayIdx]!.set(seriesKey, (counts[dayIdx]!.get(seriesKey) || 0) + 1)
    sums[dayIdx]!.set(seriesKey, (sums[dayIdx]!.get(seriesKey) || 0) + Number(row.fdJumlah1 || 0))
  }

  const data = days.map((d, idx) => {
    const point: Record<string, string | number> = { date: d.date, label: d.label }
    for (const key of seriesKeys) {
      point[key] = counts[idx]!.get(key) || 0
      point[`${key}__value`] = sums[idx]!.get(key) || 0
    }
    return point
  })

  const series = seriesKeys.map((key) => ({
    key,
    name: key === '__others__' ? 'Lainnya' : empLabel(key),
  }))

  return { data, series }
}

export async function getBillingTrends(query?: Record<string, string | undefined>) {
  const customDays = query?.days ? parseInt(query.days, 10) : 30
  const days = getLastNDays(customDays)
  // 12 bulan terakhir
  const months = getLastNMonths(12)

  const dailyStart = days[0]!.start
  const dailyEnd = days[days.length - 1]!.end
  const monthlyStart = months[0]!.start
  const monthlyEnd = months[months.length - 1]!.end

  const [dailyRows, monthlyRows] = await Promise.all([
    prisma.$queryRaw<{ day: Date; totalBill: number; totalTagihan: unknown }[]>`
      SELECT CAST(fdInvDate AS DATE) AS day,
             COUNT(*) AS totalBill,
             SUM(ISNULL(fdJumlah1, 0)) AS totalTagihan
      FROM tbBilling
      WHERE fdInvDate >= ${dailyStart} AND fdInvDate <= ${dailyEnd}
      GROUP BY CAST(fdInvDate AS DATE)
    `,
    prisma.$queryRaw<{ yr: number; mo: number; totalBill: number; totalTagihan: unknown }[]>`
      SELECT YEAR(fdInvDate) AS yr,
             MONTH(fdInvDate) AS mo,
             COUNT(*) AS totalBill,
             SUM(ISNULL(fdJumlah1, 0)) AS totalTagihan
      FROM tbBilling
      WHERE fdInvDate >= ${monthlyStart} AND fdInvDate <= ${monthlyEnd}
      GROUP BY YEAR(fdInvDate), MONTH(fdInvDate)
    `,
  ])

  const dailyMap = new Map(
    dailyRows.map((r) => [
      new Date(r.day).toISOString().slice(0, 10),
      { totalBill: Number(r.totalBill), totalTagihan: Number(r.totalTagihan ?? 0) },
    ])
  )

  const monthlyMap = new Map(
    monthlyRows.map((r) => [
      `${r.yr}-${r.mo}`,
      { totalBill: Number(r.totalBill), totalTagihan: Number(r.totalTagihan ?? 0) },
    ])
  )

  const daily = days.map((d) => {
    const agg = dailyMap.get(d.date)
    return {
      date: d.date,
      label: d.label,
      totalBill: agg?.totalBill || 0,
      totalTagihan: agg?.totalTagihan || 0,
    }
  })

  const monthly = months.map((m) => {
    const key = `${m.start.getFullYear()}-${m.start.getMonth() + 1}`
    const agg = monthlyMap.get(key)
    return {
      label: m.label,
      totalBill: agg?.totalBill || 0,
      totalTagihan: agg?.totalTagihan || 0,
    }
  })

  return { daily, monthly }
}

export async function getBillingKPIs(query: Record<string, string | undefined>) {
  const search = query.search?.trim()
  const where = search
    ? {
      OR: [
        { fdInvNo: { contains: search } },
        { fdDescr: { contains: search } },
        { fdCustCode: { contains: search } },
      ],
    }
    : {}

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [
    totalInvoices,
    totalTagihanAgg,
    invoicesBulanIni,
    tagihanBulanIniAgg,
    invoicesBulanLalu,
    tagihanBulanLaluAgg,
    monthlyBreakdownRows,
  ] = await Promise.all([
    prisma.tbBilling.count({ where }),
    prisma.tbBilling.aggregate({
      where,
      _sum: { fdJumlah1: true }
    }),
    prisma.tbBilling.count({
      where: {
        ...where,
        fdInvDate: { gte: startOfMonth, lt: endOfMonth }
      }
    }),
    prisma.tbBilling.aggregate({
      where: {
        ...where,
        fdInvDate: { gte: startOfMonth, lt: endOfMonth }
      },
      _sum: { fdJumlah1: true }
    }),
    prisma.tbBilling.count({
      where: {
        ...where,
        fdInvDate: { gte: startOfPrevMonth, lt: startOfMonth }
      }
    }),
    prisma.tbBilling.aggregate({
      where: {
        ...where,
        fdInvDate: { gte: startOfPrevMonth, lt: startOfMonth }
      },
      _sum: { fdJumlah1: true }
    }),
    prisma.$queryRaw<any[]>`
      SELECT
        fdListType,
        COUNT(*) AS totalInvoices,
        SUM(ISNULL(fdJumlah1, 0)) AS totalTagihan
      FROM tbBilling WITH (NOLOCK)
      WHERE fdInvDate >= ${startOfMonth} AND fdInvDate < ${endOfMonth}
      GROUP BY fdListType
    `,
  ])

  let udaraInvoicesMonth = 0
  let udaraTagihanMonth = 0
  let lautInvoicesMonth = 0
  let lautTagihanMonth = 0

  for (const r of monthlyBreakdownRows) {
    const typeNum = Number(r.fdListType)
    const cnt = Number(r.totalInvoices || 0)
    const sum = Number(r.totalTagihan || 0)
    if (typeNum === 1) {
      udaraInvoicesMonth = cnt
      udaraTagihanMonth = sum
    } else if (typeNum === 2) {
      lautInvoicesMonth = cnt
      lautTagihanMonth = sum
    }
  }

  const tagihanBulanIni = Number(tagihanBulanIniAgg._sum.fdJumlah1 || 0)
  const tagihanBulanLalu = Number(tagihanBulanLaluAgg._sum.fdJumlah1 || 0)

  // Fetch Target Bill Hari Ini dari stored procedures (Udara = 1, Laut = 2)
  const [uData, lData] = await Promise.all([
    prisma.$queryRaw<any[]>`exec get_data_billing_gsheet 1`,
    prisma.$queryRaw<any[]>`exec get_data_billing_gsheet 2`,
  ])

  const isTarget = (r: any) => {
    const statusKirim = String(r.StatusKirim || '').toUpperCase().trim()
    if (statusKirim.includes('BELUM DITERIMA GDG')) return false

    const cust = String(r.Customer || '').toUpperCase().trim()
    if (cust.includes('MR.X') || cust.includes('MR X') || cust === 'NO NAME' || cust === 'NONAME') return false

    const st = String(r.Status || '').toUpperCase().trim()
    const typeStr = String(r.Type || '').toUpperCase().trim()
    const comodityStr = String(r.Comodity || '').toUpperCase().trim()

    const isCodOrUrgent = st.includes('COD') || st.includes('URGENT')
    const isAgingGt7 = Number(r.hari || 0) > 7
    const isFcl = typeStr.includes('FCL') || comodityStr.includes('FCL')

    return isCodOrUrgent || isAgingGt7 || isFcl
  }

  const uTarget = uData.filter(isTarget)
  const lTarget = lData.filter(isTarget)

  // Map Udara markings untuk memisahkan Yati vs Kiki
  const uMarkings = uTarget.map((r) => r.Marking_code?.trim()).filter(Boolean)
  let picMap = new Map<string, string>()
  if (uMarkings.length > 0) {
    const picRows = await prisma.$queryRaw<any[]>`
      SELECT
        RTRIM(el.fdMarkingCode) AS markingCode,
        RTRIM(el.fdEmp1) AS emp1,
        RTRIM(b.fdEmpCode) AS bEmpCode
      FROM tbEntryList el WITH (NOLOCK)
      LEFT JOIN tbBilling b WITH (NOLOCK) ON b.fdListCode = el.fdListCode
      WHERE el.fdMarkingCode IN (${Prisma.join(uMarkings)})
    `
    for (const r of picRows) {
      const p = r.bEmpCode === 'Y001' || r.emp1 === 'Y001' ? 'yati' : 'kiki'
      picMap.set(r.markingCode, p)
    }
  }

  let yatiTarget = 0
  let kikiTarget = 0
  for (const r of uTarget) {
    const m = r.Marking_code?.trim() || ''
    const pic = picMap.get(m) || 'kiki'
    if (pic === 'yati') yatiTarget++
    else kikiTarget++
  }

  let tharaTarget = 0
  let ferlyTarget = 0
  let ricoTarget = 0
  for (const r of lTarget) {
    const branch = String(r.Branch || '').toUpperCase().trim()
    const typeStr = String(r.Type || '').toUpperCase().trim()
    if (typeStr.includes('FCL') || typeStr.includes('KONTAINER')) {
      ferlyTarget++
    } else if (branch === 'GUANGZHOU') {
      tharaTarget++
    } else {
      ricoTarget++
    }
  }

  return {
    totalInvoices,
    totalTagihan: totalTagihanAgg._sum.fdJumlah1 || 0,
    invoicesBulanIni,
    invoicesBulanIniBreakdown: {
      udara: udaraInvoicesMonth,
      laut: lautInvoicesMonth,
    },
    tagihanBulanIni,
    tagihanBulanIniBreakdown: {
      udara: udaraTagihanMonth,
      laut: lautTagihanMonth,
    },
    targetBillUdara: {
      total: uTarget.length,
      breakdown: { kiki: kikiTarget, yati: yatiTarget },
    },
    targetBillLaut: {
      total: lTarget.length,
      breakdown: { thara: tharaTarget, rico: ricoTarget, ferly: ferlyTarget },
    },
    trend: {
      invoicesBulanIni: calculateTrend(invoicesBulanIni, invoicesBulanLalu),
      tagihanBulanIni: calculateTrend(tagihanBulanIni, tagihanBulanLalu),
    },
  }
}

interface TargetBillingCache {
  items: any[]
  timestamp: number
}
const targetDetailsCache = new Map<string, TargetBillingCache>()

export function invalidateTargetDetailsCache() {
  targetDetailsCache.clear()
}

export async function getBillingTargetDetails(query: Record<string, string | undefined>) {
  const typeParam = query.type?.trim().toLowerCase() || 'all'
  const picFilter = query.pic?.trim().toLowerCase() || 'all'

  const isTarget = (r: any) => {
    const statusKirim = String(r.StatusKirim || '').toUpperCase().trim()
    if (statusKirim.includes('BELUM DITERIMA GDG')) return false

    const cust = String(r.Customer || '').toUpperCase().trim()
    if (cust.includes('MR.X') || cust.includes('MR X') || cust === 'NO NAME' || cust === 'NONAME') return false

    const st = String(r.Status || '').toUpperCase().trim()
    const typeStr = String(r.Type || '').toUpperCase().trim()
    const comodityStr = String(r.Comodity || '').toUpperCase().trim()

    const isCodOrUrgent = st.includes('COD') || st.includes('URGENT')
    const isAgingGt7 = Number(r.hari || 0) > 7
    const isFcl = typeStr.includes('FCL') || comodityStr.includes('FCL')

    return isCodOrUrgent || isAgingGt7 || isFcl
  }

  const fetchItemsForType = async (mode: 'udara' | 'laut') => {
    const spNum = mode === 'laut' ? 2 : 1
    const rawRows = await prisma.$queryRaw<any[]>`exec get_data_billing_and_data_m3 ${spNum}`
    const filtered = rawRows.filter(isTarget)
    const distinctMarkings = Array.from(new Set(filtered.map((r) => r.Marking_code?.trim()).filter(Boolean)))

    const picMap = new Map<string, string>()
    const partialMap = new Map<string, number>()
    const loadDateMap = new Map<string, Date | string>()
    const entryMap = new Map<string, any>()
    const hargaMap = new Map<string, any>()
    const customerBrokerMap = new Map<string, number>()
    const allMasterUploads: any[] = []
    const allCustUploads: any[] = []
    const activeMappings: any[] = []
    const markingInfoMap = new Map<string, any>()

    if (mode === 'udara' && distinctMarkings.length > 0) {
      const picRows = await prisma.$queryRaw<any[]>`
        SELECT
          RTRIM(el.fdMarkingCode) AS markingCode,
          RTRIM(el.fdEmp1) AS emp1,
          RTRIM(b.fdEmpCode) AS bEmpCode
        FROM tbEntryList el WITH (NOLOCK)
        LEFT JOIN tbBilling b WITH (NOLOCK) ON b.fdListCode = el.fdListCode
        WHERE RTRIM(el.fdMarkingCode) IN (${Prisma.join(distinctMarkings)})
      `
      for (const r of picRows) {
        const p = r.bEmpCode === 'Y001' || r.emp1 === 'Y001' ? 'yati' : 'kiki'
        picMap.set(r.markingCode, p)
      }
    }

    if (distinctMarkings.length > 0) {
      try {
        const [partialRows, entryRows] = await Promise.all([
          prisma.$queryRaw<any[]>`
            WITH PartialSJ AS (
              SELECT 
                RTRIM(el.fdTerima) AS fdTerima,
                RTRIM(el.fdCustCode) AS custCode,
                COUNT(DISTINCT RTRIM(el.fdMarkingCode)) AS countMarking
              FROM tbEntryList el WITH (NOLOCK)
              WHERE el.fdTerima IS NOT NULL 
                AND RTRIM(el.fdTerima) <> ''
                AND el.fdLoad >= DATEADD(MONTH, -6, GETDATE())
              GROUP BY RTRIM(el.fdTerima), RTRIM(el.fdCustCode)
              HAVING COUNT(DISTINCT RTRIM(el.fdMarkingCode)) > 1
            )
            SELECT 
              RTRIM(el.fdMarkingCode) AS markingCode,
              RTRIM(el.fdCustCode) AS custCode,
              RTRIM(el.fdTerima) AS fdTerima,
              MAX(p.countMarking) AS countMarking
            FROM tbEntryList el WITH (NOLOCK)
            INNER JOIN PartialSJ p 
              ON p.fdTerima = RTRIM(el.fdTerima) 
             AND (p.custCode = RTRIM(el.fdCustCode) OR p.custCode = '' OR el.fdCustCode IS NULL)
            WHERE RTRIM(el.fdMarkingCode) IN (${Prisma.join(distinctMarkings)})
              AND el.fdLoad >= DATEADD(MONTH, -6, GETDATE())
            GROUP BY RTRIM(el.fdMarkingCode), RTRIM(el.fdCustCode), RTRIM(el.fdTerima)
          `,
          prisma.$queryRaw<any[]>`
            SELECT
              RTRIM(el.fdMarkingCode) AS markingCode,
              MAX(el.fdLoad) AS maxLoadDate,
              MAX(el.fdListCode) AS sampleListCode,
              MAX(el.fdCustCode) AS sampleCustCode,
              MAX(el.fdComodity) AS sampleComodity,
              MAX(tc.fdComodityName) AS sampleComodityName,
              MAX(el.fdTypeComodity) AS sampleTypeComodity
            FROM tbEntryList el WITH (NOLOCK)
            LEFT JOIN tbTypeComodity tc WITH (NOLOCK) ON tc.fdTypeComodity = el.fdTypeComodity AND tc.fdListType = el.fdListType
            WHERE RTRIM(el.fdMarkingCode) IN (${Prisma.join(distinctMarkings)})
            GROUP BY RTRIM(el.fdMarkingCode)
          `,
        ])

        for (const pr of partialRows) {
          const cCode = pr.custCode?.trim() || ''
          const mCode = pr.markingCode?.trim() || ''
          const count = Number(pr.countMarking || 0)
          if (cCode && mCode) {
            partialMap.set(`${mCode}_${cCode}`, count)
          }
        }
        for (const er of entryRows) {
          if (er.maxLoadDate) loadDateMap.set(er.markingCode, er.maxLoadDate)
          entryMap.set(er.markingCode, er)
        }
      } catch (err) {
        logger.error('Error querying auxiliary target details:', err)
      }
    }

    const distinctCustomers = Array.from(
      new Set(filtered.map((r) => String(r.Customer ?? r.customer ?? '').trim()).filter(Boolean))
    )
    const custNameToCodeMap = new Map<string, string>()
    if (distinctCustomers.length > 0) {
      try {
        const custRows = await prisma.tbCustomers.findMany({
          where: { fdCustName: { in: distinctCustomers } },
          select: { fdCustCode: true, fdCustName: true },
        })
        for (const c of custRows) {
          if (c.fdCustName && c.fdCustCode) {
            custNameToCodeMap.set(c.fdCustName.trim().toUpperCase(), c.fdCustCode.trim())
          }
        }
      } catch (err) {
        logger.error('Error querying custNameToCodeMap:', err)
      }
    }

    const batchPriceInput = filtered.map((r) => {
      const custName = String(r.Customer ?? r.customer ?? '').trim()
      const resolvedCustCode =
        custNameToCodeMap.get(custName.toUpperCase()) ||
        String(entryMap.get((r.Marking_code ?? '').trim())?.sampleCustCode || '').trim()

      return {
        markingCode: String(r.Marking_code ?? r.markingCode ?? '').trim(),
        markingNo: String(r.Marking_no ?? r.markingNo ?? '').trim(),
        customer: custName,
        custCode: resolvedCustCode,
        branch: String(r.Branch ?? r.branch ?? '').trim(),
        sales: String(r.Sales ?? r.sales ?? '').trim(),
        type: String(r.Type ?? r.type ?? '').trim(),
        comodity: String(r.Comodity ?? r.comodity ?? '').trim(),
        harga: Number(r.Harga ?? r.harga ?? 0),
        targetDate: r.Tgl_Agen ? new Date(r.Tgl_Agen) : undefined,
        mode,
      }
    })

    const priceCheckMap = await evaluateBatchPriceCheck(batchPriceInput, mode)

    return filtered.map((r, idx) => {
      const branch = String(r.Branch || '').toUpperCase().trim()
      const typeStr = String(r.Type || '').toUpperCase().trim()
      const comodityStr = String(r.Comodity || '').toUpperCase().trim()
      const marking = (r.Marking_code ?? r.markingCode ?? '').trim()
      const custName = String(r.Customer ?? r.customer ?? '').trim()
      const resolvedCustCode =
        custNameToCodeMap.get(custName.toUpperCase()) ||
        String(entryMap.get(marking)?.sampleCustCode || '').trim()

      let pic = 'rico'
      if (mode === 'udara') {
        pic = picMap.get(marking) || 'kiki'
      } else {
        if (typeStr.includes('FCL') || typeStr.includes('KONTAINER') || comodityStr.includes('FCL')) {
          pic = 'ferly'
        } else if (branch === 'GUANGZHOU') {
          pic = 'thara'
        } else {
          pic = 'rico'
        }
      }

      const countTerima =
        (resolvedCustCode ? partialMap.get(`${marking}_${resolvedCustCode}`) : undefined) ??
        (resolvedCustCode ? partialMap.get(resolvedCustCode) : undefined) ??
        0
      const isPartial = countTerima > 1
      const loadDate = loadDateMap.get(marking) || null
      const entryInfo = entryMap.get(marking) || null
      const custHarga = hargaMap.get(marking) || null
      const custCode = resolvedCustCode || entryInfo?.sampleCustCode || ''

      const pRes = priceCheckMap.get(String(idx)) || priceCheckMap.get(marking)
      const hargaDb = pRes?.dbPrice || 0
      const priceStatus = pRes?.status || 'NO_RATE'
      const diffAmount = pRes?.difference || 0
      const priceSourceType = pRes?.priceSource || 'NONE'
      const matchedTier = pRes?.appliedTierLabel || 'Level 4: Tarif Umum'
      const isBroker = pRes?.isBroker ?? false
      const currentHarga = Number(r.Harga ?? r.harga ?? 0)

      return {
        ...r,
        hari: Number(r.hari || 0),
        pic,
        customer: (r.Customer ?? r.customer ?? '').trim(),
        branch: (r.Branch ?? r.branch ?? '').trim(),
        sales: (r.Sales ?? r.sales ?? '').trim(),
        markingCode: (r.Marking_code ?? r.markingCode ?? '').trim(),
        markingNo: (r.Marking_no ?? r.markingNo ?? '').trim(),
        status: (r.Status ?? r.status ?? '').trim(),
        jmlPack: Number(r.Jml_pack ?? r.jmlPack ?? 0),
        satuan: (r.Satuan ?? r.satuan ?? '').trim(),
        berat: Number(r.Berat ?? r.berat ?? 0),
        m3List: Number(r.M3_List ?? r.m3List ?? r.fdM3List ?? 0),
        m3Gudang: Number(r.M3_Gudang ?? r.m3Gudang ?? r.fdM3Gudang ?? 0),
        type: (r.Type ?? r.type ?? '').trim(),
        taxReturn: Number(r.TaxReturn ?? r.taxReturn ?? 0),
        comodity: (r.Comodity ?? r.comodity ?? '').trim(),
        tglAgen: r.Tgl_Agen ? new Date(r.Tgl_Agen).toISOString() : null,
        exitDate: r.ExitDate ? new Date(r.ExitDate).toISOString() : null,
        statusKirim: (r.StatusKirim ?? r.statusKirim ?? '').trim(),
        harga: currentHarga,
        updateBy: (r.UpdateBy ?? r.updateBy ?? '').trim(),
        updateDate: r.UpdateDate ? new Date(r.UpdateDate).toISOString() : null,
        mode,
        isPartial,
        countTerima,
        loadDate,
        custCode,
        isBroker,
        isCommodityOverride: pRes?.isCommodityOverride ?? false,
        commodityOverrideDetail: pRes?.commodityOverrideDetail || '',
        matchedCategory: pRes?.matchedCategory || '',
        entryInfo,
        custHarga,
        hargaDb,
        priceStatus,
        diffAmount: currentHarga > 0 && hargaDb > 0 ? currentHarga - hargaDb : 0,
        priceSourceType,
        matchedTier,
      }
    })
  }

  const now = Date.now()
  let allTargetItems: any[] = []

  const cached = targetDetailsCache.get(typeParam)
  if (cached && now - cached.timestamp < 15_000) {
    allTargetItems = cached.items
  } else {
    if (typeParam === 'udara') {
      allTargetItems = await fetchItemsForType('udara')
    } else if (typeParam === 'laut') {
      allTargetItems = await fetchItemsForType('laut')
    } else {
      const [u, l] = await Promise.all([fetchItemsForType('udara'), fetchItemsForType('laut')])
      allTargetItems = [...u, ...l]
    }
    targetDetailsCache.set(typeParam, { items: allTargetItems, timestamp: now })
  }

  let finalItems = allTargetItems
  if (picFilter !== 'all') {
    finalItems = allTargetItems.filter((it) => it.pic.toLowerCase() === picFilter)
  }

  return {
    total: finalItems.length,
    items: finalItems,
  }
}

export async function getSjVsBillComparison(query?: Record<string, string | undefined>) {
  const customDays = query?.days ? parseInt(query.days, 10) : 30
  const days = getLastNDays(customDays)
  const startDate = days[0]!.start
  const endDate = days[days.length - 1]!.end

  // Query 1: SJ diterima (berdasarkan fdKembali)
  const sjRows = await prisma.$queryRaw<{ day: Date; pic: string; total: number }[]>`
    SELECT
      t.day,
      t.pic,
      CASE
        WHEN t.pic = 'ferly' THEN COUNT(DISTINCT t.markingCode)
        ELSE COUNT(*)
      END AS total
    FROM (
      SELECT
        CAST(d.fdKembali AS DATE) AS day,
        CASE
          WHEN ISNULL(el.fdListType, d.fdListType) = 1 AND (RTRIM(b.fdEmpCode) = 'Y001' OR RTRIM(el.fdEmp1) = 'Y001') THEN 'yati'
          WHEN ISNULL(el.fdListType, d.fdListType) = 1 THEN 'kiki'
          WHEN ISNULL(el.fdListType, d.fdListType) = 2 AND el.fdTypeComodity = 5 THEN 'ferly'
          WHEN ISNULL(el.fdListType, d.fdListType) = 2 AND cb.fdBranchName = 'GUANGZHOU' THEN 'thara'
          WHEN ISNULL(el.fdListType, d.fdListType) = 2 THEN 'rico'
        END AS pic,
        d.fdSJNo AS sjNo,
        el.fdMarkingCode AS markingCode
      FROM tbDelivery d WITH (NOLOCK)
      LEFT JOIN tbEntryList el WITH (NOLOCK) ON el.fdListCode = d.fdListCode
      LEFT JOIN tbMarking tm WITH (NOLOCK) ON tm.fdMarkingCode = el.fdMarkingCode
      LEFT JOIN tbCabang cb WITH (NOLOCK) ON cb.fdBranchCode = tm.fdBranchCode
      LEFT JOIN tbBilling b WITH (NOLOCK) ON b.fdListCode = d.fdListCode
      WHERE d.fdKembali >= ${startDate} AND d.fdKembali <= ${endDate}
    ) t
    WHERE t.pic IS NOT NULL
    GROUP BY t.day, t.pic
  `

  // Query 2: Bill dibuat (berdasarkan fdInvDate)
  const billRows = await prisma.$queryRaw<{ day: Date; pic: string; total: number }[]>`
    SELECT
      t.day,
      t.pic,
      CASE
        WHEN t.pic = 'ferly' THEN COUNT(DISTINCT t.markingCode)
        ELSE COUNT(*)
      END AS total
    FROM (
      SELECT
        CAST(b.fdInvDate AS DATE) AS day,
        CASE
          WHEN ISNULL(el.fdListType, b.fdListType) = 1 AND (RTRIM(b.fdEmpCode) = 'Y001' OR RTRIM(el.fdEmp1) = 'Y001') THEN 'yati'
          WHEN ISNULL(el.fdListType, b.fdListType) = 1 THEN 'kiki'
          WHEN ISNULL(el.fdListType, b.fdListType) = 2 AND el.fdTypeComodity = 5 THEN 'ferly'
          WHEN ISNULL(el.fdListType, b.fdListType) = 2 AND cb.fdBranchName = 'GUANGZHOU' THEN 'thara'
          WHEN ISNULL(el.fdListType, b.fdListType) = 2 THEN 'rico'
        END AS pic,
        b.fdInvNo AS invNo,
        ISNULL(b.fdMarkingCode, el.fdMarkingCode) AS markingCode
      FROM tbBilling b WITH (NOLOCK)
      LEFT JOIN tbEntryList el WITH (NOLOCK) ON el.fdListCode = b.fdListCode
      LEFT JOIN tbMarking tm WITH (NOLOCK) ON tm.fdMarkingCode = ISNULL(b.fdMarkingCode, el.fdMarkingCode)
      LEFT JOIN tbCabang cb WITH (NOLOCK) ON cb.fdBranchCode = tm.fdBranchCode
      WHERE b.fdInvDate >= ${startDate} AND b.fdInvDate <= ${endDate}
    ) t
    WHERE t.pic IS NOT NULL
    GROUP BY t.day, t.pic
  `

  // Build lookup maps
  const sjMap = new Map<string, number>()
  for (const row of sjRows) {
    if (!row.pic) continue
    const key = `${new Date(row.day).toISOString().slice(0, 10)}|${row.pic}`
    sjMap.set(key, Number(row.total))
  }

  const billMap = new Map<string, number>()
  for (const row of billRows) {
    if (!row.pic) continue
    const key = `${new Date(row.day).toISOString().slice(0, 10)}|${row.pic}`
    billMap.set(key, Number(row.total))
  }

  // Query 3: Belum Bill (berdasarkan fdKembali, tapi b.fdInvNo IS NULL)
  const unbilledRows = await prisma.$queryRaw<{ day: Date; pic: string; total: number }[]>`
    SELECT
      t.day,
      t.pic,
      CASE
        WHEN t.pic = 'ferly' THEN COUNT(DISTINCT t.markingCode)
        ELSE COUNT(*)
      END AS total
    FROM (
      SELECT
        CAST(d.fdKembali AS DATE) AS day,
        CASE
          WHEN ISNULL(el.fdListType, d.fdListType) = 1 AND (RTRIM(b.fdEmpCode) = 'Y001' OR RTRIM(el.fdEmp1) = 'Y001') THEN 'yati'
          WHEN ISNULL(el.fdListType, d.fdListType) = 1 THEN 'kiki'
          WHEN ISNULL(el.fdListType, d.fdListType) = 2 AND el.fdTypeComodity = 5 THEN 'ferly'
          WHEN ISNULL(el.fdListType, d.fdListType) = 2 AND cb.fdBranchName = 'GUANGZHOU' THEN 'thara'
          WHEN ISNULL(el.fdListType, d.fdListType) = 2 THEN 'rico'
        END AS pic,
        d.fdSJNo AS sjNo,
        el.fdMarkingCode AS markingCode
      FROM tbDelivery d WITH (NOLOCK)
      LEFT JOIN tbEntryList el WITH (NOLOCK) ON el.fdListCode = d.fdListCode
      LEFT JOIN tbMarking tm WITH (NOLOCK) ON tm.fdMarkingCode = el.fdMarkingCode
      LEFT JOIN tbCabang cb WITH (NOLOCK) ON cb.fdBranchCode = tm.fdBranchCode
      LEFT JOIN tbBilling b WITH (NOLOCK) ON b.fdListCode = d.fdListCode
      WHERE d.fdKembali >= ${startDate} AND d.fdKembali <= ${endDate}
        AND b.fdInvNo IS NULL
    ) t
    WHERE t.pic IS NOT NULL
    GROUP BY t.day, t.pic
  `

  const unbilledMap = new Map<string, number>()
  for (const row of unbilledRows) {
    if (!row.pic) continue
    const key = `${new Date(row.day).toISOString().slice(0, 10)}|${row.pic}`
    unbilledMap.set(key, Number(row.total))
  }

  return days.map((d) => {
    const point: Record<string, string | number> = { date: d.date, label: d.label }
    for (const pic of PIC_KEYS) {
      point[`sj_${pic}`] = sjMap.get(`${d.date}|${pic}`) || 0
      point[`bill_${pic}`] = billMap.get(`${d.date}|${pic}`) || 0
      point[`unbilled_${pic}`] = unbilledMap.get(`${d.date}|${pic}`) || 0
    }
    return point
  })
}

export async function getSjVsBillDetails(query: Record<string, string | undefined>) {
  const pic = query.pic?.trim() || 'all'
  const type = query.type?.trim() === 'surplus' ? 'surplus' : 'unbilled'

  const days = getLastNDays(30)
  const startDate = days[0]!.start
  const endDate = days[days.length - 1]!.end

  if (type === 'unbilled') {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT TOP 200
        t.fdSJNo,
        t.fdSJDate,
        t.fdKembali,
        t.fdCustCode,
        t.fdCustNameSJ,
        t.masterCustName,
        t.fdListCode,
        t.fdMarkingCode,
        t.fdBranchName,
        t.fdDescr,
        t.pic
      FROM (
        SELECT
          d.fdSJNo,
          d.fdSJDate,
          d.fdKembali,
          d.fdCustCode,
          d.fdCustNameSJ,
          c.fdCustName AS masterCustName,
          d.fdListCode,
          el.fdMarkingCode,
          cb.fdBranchName,
          d.fdDescr,
          CASE
            WHEN ISNULL(el.fdListType, d.fdListType) = 1 AND (RTRIM(b.fdEmpCode) = 'Y001' OR RTRIM(el.fdEmp1) = 'Y001') THEN 'yati'
            WHEN ISNULL(el.fdListType, d.fdListType) = 1 THEN 'kiki'
            WHEN ISNULL(el.fdListType, d.fdListType) = 2 AND el.fdTypeComodity = 5 THEN 'ferly'
            WHEN ISNULL(el.fdListType, d.fdListType) = 2 AND cb.fdBranchName = 'GUANGZHOU' THEN 'thara'
            WHEN ISNULL(el.fdListType, d.fdListType) = 2 THEN 'rico'
          END AS pic
        FROM tbDelivery d WITH (NOLOCK)
        LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = d.fdCustCode
        LEFT JOIN tbEntryList el WITH (NOLOCK) ON el.fdListCode = d.fdListCode
        LEFT JOIN tbMarking tm WITH (NOLOCK) ON tm.fdMarkingCode = el.fdMarkingCode
        LEFT JOIN tbCabang cb WITH (NOLOCK) ON cb.fdBranchCode = tm.fdBranchCode
        LEFT JOIN tbBilling b WITH (NOLOCK) ON b.fdListCode = d.fdListCode
        WHERE d.fdKembali >= ${startDate} AND d.fdKembali <= ${endDate}
          AND b.fdInvNo IS NULL
      ) t
      WHERE t.pic IS NOT NULL
        AND (${pic} = 'all' OR t.pic = ${pic})
      ORDER BY t.fdKembali ASC
    `

    return rows.map((r) => ({
      sjNo: r.fdSJNo?.trim() || '',
      sjDate: r.fdSJDate ? new Date(r.fdKembali || r.fdSJDate).toISOString() : null,
      kembaliDate: r.fdKembali ? new Date(r.fdKembali).toISOString() : null,
      custCode: r.fdCustCode?.trim() || '',
      custName: r.masterCustName?.trim() || r.fdCustNameSJ?.trim() || '',
      sjCustName: r.fdCustNameSJ?.trim() || '',
      masterCustName: r.masterCustName?.trim() || '',
      listCode: r.fdListCode?.trim() || '',
      markingCode: r.fdMarkingCode?.trim() || '',
      branchName: r.fdBranchName?.trim() || '',
      descr: r.fdDescr?.trim() || '',
      pic: r.pic,
    }))
  } else {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT TOP 200
        t.fdInvNo,
        t.fdInvDate,
        t.fdCustCode,
        t.fdCustName,
        t.fdListCode,
        t.fdMarkingCode,
        t.fdJumlah1,
        t.fdDescr,
        t.pic
      FROM (
        SELECT
          b.fdInvNo,
          b.fdInvDate,
          b.fdCustCode,
          c.fdCustName,
          b.fdListCode,
          ISNULL(b.fdMarkingCode, el.fdMarkingCode) AS fdMarkingCode,
          b.fdJumlah1,
          b.fdDescr,
          CASE
            WHEN ISNULL(el.fdListType, b.fdListType) = 1 AND (RTRIM(b.fdEmpCode) = 'Y001' OR RTRIM(el.fdEmp1) = 'Y001') THEN 'yati'
            WHEN ISNULL(el.fdListType, b.fdListType) = 1 THEN 'kiki'
            WHEN ISNULL(el.fdListType, b.fdListType) = 2 AND el.fdTypeComodity = 5 THEN 'ferly'
            WHEN ISNULL(el.fdListType, b.fdListType) = 2 AND cb.fdBranchName = 'GUANGZHOU' THEN 'thara'
            WHEN ISNULL(el.fdListType, b.fdListType) = 2 THEN 'rico'
          END AS pic
        FROM tbBilling b WITH (NOLOCK)
        LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = b.fdCustCode
        LEFT JOIN tbEntryList el WITH (NOLOCK) ON el.fdListCode = b.fdListCode
        LEFT JOIN tbMarking tm WITH (NOLOCK) ON tm.fdMarkingCode = ISNULL(b.fdMarkingCode, el.fdMarkingCode)
        LEFT JOIN tbCabang cb WITH (NOLOCK) ON cb.fdBranchCode = tm.fdBranchCode
        LEFT JOIN tbDelivery d WITH (NOLOCK) ON d.fdListCode = b.fdListCode AND d.fdKembali IS NOT NULL
        WHERE b.fdInvDate >= ${startDate} AND b.fdInvDate <= ${endDate}
          AND d.fdSJNo IS NULL
      ) t
      WHERE t.pic IS NOT NULL
        AND (${pic} = 'all' OR t.pic = ${pic})
      ORDER BY t.fdInvDate ASC
    `

    return rows.map((r) => ({
      invNo: r.fdInvNo?.trim() || '',
      invDate: r.fdInvDate ? new Date(r.fdInvDate).toISOString() : null,
      custCode: r.fdCustCode?.trim() || '',
      custName: r.fdCustName?.trim() || '',
      masterCustName: r.fdCustName?.trim() || '',
      listCode: r.fdListCode?.trim() || '',
      markingCode: r.fdMarkingCode?.trim() || '',
      totalAmount: Number(r.fdJumlah1 || 0),
      descr: r.fdDescr?.trim() || '',
      pic: r.pic,
    }))
  }
}
