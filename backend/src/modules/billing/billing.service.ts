import { prisma } from '../../config/database'
import { Prisma } from '@prisma/client'
import { buildPagination, parsePagination } from '../../utils/pagination'
import { getLastNDays, getLastNMonths, calculateTrend } from '../../utils/dateRange'
import { logger } from '../../config/logger'
import { lookupPriceByEntry } from '../price-list/price-list.service'

async function safeRunRaw<T = any>(queryFn: () => Promise<T>, description: string): Promise<T> {
  try {
    return await queryFn()
  } catch (err) {
    logger.error(`Error executing ${description}:`, err)
    return [] as unknown as T
  }
}

function findBestCategoryMatch<T extends { category: string; price?: any }>(
  items: T[],
  entryTypeName: string,
  filterFn?: (item: T) => boolean,
): T | null {
  const target = entryTypeName.trim().toUpperCase()
  if (!target || !items || items.length === 0) return null

  const candidates = filterFn ? items.filter(filterFn) : items
  if (candidates.length === 0) return null

  // 1. Prioritas Utama: Exact match (case-insensitive & trimmed)
  const exact = candidates.find((it) => it.category.trim().toUpperCase() === target)
  if (exact) return exact

  // 2. Normalized match (tanpa spasi / tanda minus, misal: "SEMI-GARMENT" vs "SEMI GARMENT")
  const normTarget = target.replace(/[^A-Z0-9]/g, '')
  const normMatch = candidates.find(
    (it) => it.category.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') === normTarget
  )
  if (normMatch) return normMatch

  // 3. Word-Boundary prefix match (misal: "GENERAL GOODS" vs "GENERAL GOODS NORMAL", tapi BUKAN "GARMENT" mencocokkan "SEMI GARMENT")
  const wordMatch = candidates.find((it) => {
    const cat = it.category.trim().toUpperCase()
    if (target.startsWith(`${cat} `) || cat.startsWith(`${target} `)) return true
    return false
  })
  if (wordMatch) return wordMatch

  return null
}

export async function getBillings(query: Record<string, string | undefined>) {
  const { page, limit } = parsePagination(query)
  const { skip, take, meta } = buildPagination({ page, limit })

  const search = query.search?.trim()
  const hasAmount = query.hasAmount === 'true' || query.validOnly === 'true'

  let custCodesFromSearch: string[] = []
  if (search) {
    const matchingCustomers = await prisma.tbCustomers.findMany({
      where: {
        OR: [
          { fdCustName: { contains: search } },
          { fdCustCode: { contains: search } },
        ],
      },
      select: { fdCustCode: true },
      take: 100,
    })
    custCodesFromSearch = matchingCustomers.map((c) => c.fdCustCode.trim())
  }

  const draftOnly = query.draftOnly === 'true' || query.status === 'draft'

  const whereConditions: Prisma.TbBillingWhereInput[] = []

  if (search) {
    whereConditions.push({
      OR: [
        { fdInvNo: { contains: search } },
        { fdDescr: { contains: search } },
        { fdCustCode: { contains: search } },
        ...(custCodesFromSearch.length > 0
          ? [{ fdCustCode: { in: custCodesFromSearch } }]
          : []),
      ],
    })
  }

  if (hasAmount) {
    whereConditions.push({
      OR: [
        { fdJumlah1: { gt: 0 } },
        { fdJumlah2: { gt: 0 } },
      ],
    })
  }

  const minYear = query.minYear ? parseInt(query.minYear, 10) : 2023

  if (draftOnly) {
    whereConditions.push({
      AND: [
        { OR: [{ fdGive: null }, { fdGive: { not: 1 } }] },
        { OR: [{ fdGive2: null }, { fdGive2: { not: 1 } }] },
        { fdCekDate: null },
        { fdInvDate: { gte: new Date(`${minYear}-01-01T00:00:00.000Z`) } },
      ],
    })
  } else if (query.minYear) {
    whereConditions.push({
      fdInvDate: { gte: new Date(`${minYear}-01-01T00:00:00.000Z`) },
    })
  }

  const where: Prisma.TbBillingWhereInput =
    whereConditions.length > 0 ? { AND: whereConditions } : {}

  const isNoPagination =
    query.noPagination === 'true' || query.all === 'true' || query.limit === 'all' || query.limit === '0'

  const [data, total] = await Promise.all([
    prisma.tbBilling.findMany({
      where,
      ...(isNoPagination ? {} : { skip, take }),
      orderBy: { fdInvDate: 'desc' },
      select: {
        fdInvNo: true,
        fdInvDate: true,
        fdListType: true,
        fdCustCode: true,
        fdMarkingCode: true,
        fdMarkingNo: true,
        fdDescr: true,
        fdGive: true,
        fdGive2: true,
        fdCekDate: true,
        fdJumlah1: true,
        fdJumlah2: true,
        fdTypeBilling: true,
        fdEmpCode: true,
        customer: { select: { fdCustName: true, fdBlocked: true } },
      }
    }),
    prisma.tbBilling.count({ where }),
  ])

  // Prisma relation fails if tbBilling.fdEmpCode has trailing spaces and tbEmployees doesn't
  const empCodes = [...new Set(data.map(d => d.fdEmpCode?.trim()).filter(Boolean))] as string[]
  let empMap = new Map<string, string>()
  if (empCodes.length > 0) {
    const employees = await prisma.tbEmployees.findMany({
      where: { fdEmpCode: { in: empCodes } },
      select: { fdEmpCode: true, fdEmpName: true }
    })
    empMap = new Map(employees.map(e => [e.fdEmpCode.trim(), e.fdEmpName.trim()]))
  }

  const mappedData = data.map(d => {
    const { fdEmpCode, ...rest } = d
    return {
      ...rest,
      employee: fdEmpCode ? { fdEmpName: empMap.get(fdEmpCode.trim()) || null } : null
    }
  })

  return { data: mappedData, meta: meta(total) }
}

export async function getBillingById(id: string) {
  const data = await prisma.tbBilling.findUnique({
    where: { fdInvNo: id },
    include: {
      details: true,
      customer: { select: { fdCustName: true, fdBlocked: true, fdBillTo: true, fdContact: true, fdBillAddr1: true, fdSalesNM: true, fdBroker: true } },
    }
  })

  if (!data) return null

  let fdTypeComodity: number | null = null
  if (data.fdListCode) {
    const el = await safeRunRaw(async () => {
      return prisma.$queryRaw<any[]>`
        SELECT TOP 1 fdTypeComodity FROM tbEntryList WITH (NOLOCK) WHERE fdListCode = ${data.fdListCode}
      `
    }, 'get_entrylist_typecomodity')
    if (el && el.length > 0 && el[0]?.fdTypeComodity !== null && el[0]?.fdTypeComodity !== undefined) {
      fdTypeComodity = Number(el[0].fdTypeComodity)
    }
  }

  let employee = null
  if (data.fdEmpCode) {
    const emp = await prisma.tbEmployees.findFirst({
      where: { fdEmpCode: data.fdEmpCode.trim() },
      select: { fdEmpName: true }
    })
    if (emp) employee = { fdEmpName: emp.fdEmpName.trim() }
  }

  const { fdEmpCode, ...rest } = data
  return {
    ...rest,
    employee,
    fdTypeComodity,
  }
}

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
  // `counts` mengisi field `${key}` (dipakai chart mode "Jumlah Bill"),
  // `sums` mengisi field `${key}__value` (dipakai chart mode "Total Tagihan")
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

  // Diganti dari 42 query `aggregate()` paralel (1 per hari/bulan) jadi 2 query
  // raw SQL `GROUP BY` — dikonfirmasi aman terhadap schema.prisma:
  // tabel fisik `tbBilling`, kolom `fdInvDate` (SmallDateTime) & `fdJumlah1` (Decimal 18,2, nullable).
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

  // NOTE timezone: key hari di-derive dari `CAST(fdInvDate AS DATE)` lalu di-toISOString().
  // Ini konsisten dengan cara `getLastNDays()` bikin key (`start.toISOString().slice(0,10)`),
  // tapi kalau server DB & server app beda timezone, ada risiko hari "geser" 1.
  // Sebelum deploy, cek dulu 1-2 baris hasil query ini vs data aslinya di SSMS.
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
  // endOfPrevMonth == startOfMonth, dipakai sebagai batas eksklusif

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
        const [partialRows, entryRows, priceEntries] = await Promise.all([
          prisma.$queryRaw<any[]>`
            SELECT 
              RTRIM(el.fdMarkingCode) AS markingCode,
              RTRIM(el.fdCustCode) AS custCode,
              RTRIM(c.fdCustName) AS custName,
              COUNT(el.fdTerima) AS countTerima
            FROM tbEntryList el WITH (NOLOCK)
            LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = el.fdCustCode
            WHERE RTRIM(el.fdMarkingCode) IN (${Prisma.join(distinctMarkings)})
              AND el.fdTerima IS NOT NULL AND RTRIM(el.fdTerima) <> ''
            GROUP BY RTRIM(el.fdMarkingCode), RTRIM(el.fdCustCode), RTRIM(c.fdCustName)
            HAVING COUNT(el.fdTerima) > 1
          `,
          prisma.$queryRaw<any[]>`
            SELECT 
              RTRIM(el.fdMarkingCode) AS markingCode,
              RTRIM(el.fdMarkingNo) AS markingNo,
              RTRIM(c.fdCustName) AS custName,
              el.fdLoad AS loadDate
            FROM tbEntryList el WITH (NOLOCK)
            LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = el.fdCustCode
            WHERE RTRIM(el.fdMarkingCode) IN (${Prisma.join(distinctMarkings)})
              AND el.fdLoad IS NOT NULL
          `,
          prisma.$queryRaw<any[]>`
            SELECT 
              RTRIM(el.fdMarkingCode) AS markingCode,
              RTRIM(el.fdMarkingNo) AS markingNo,
              RTRIM(el.fdCustCode) AS custCode,
              RTRIM(el.fdBranchCode) AS branchCode,
              RTRIM(br.fdBranchName) AS branchName,
              el.fdTypeComodity,
              RTRIM(tc.fdComodityName) AS comodityName,
              el.fdListType,
              RTRIM(el.fdListCode) AS listCode
            FROM tbEntryList el WITH (NOLOCK)
            LEFT JOIN tbCabang br WITH (NOLOCK) ON br.fdBranchCode = el.fdBranchCode
            LEFT JOIN tbTypeComodity tc WITH (NOLOCK) ON tc.fdTypeComodity = el.fdTypeComodity AND tc.fdListType = el.fdListType
            WHERE RTRIM(el.fdMarkingCode) IN (${Prisma.join(distinctMarkings)})
          `
        ])

        for (const r of partialRows) {
          if (r.markingCode && r.custName) {
            partialMap.set(`${r.markingCode.toUpperCase()}:::${r.custName.toUpperCase()}`, Number(r.countTerima))
          }
        }

        for (const r of entryRows) {
          if (r.markingCode && r.markingNo && r.loadDate) {
            loadDateMap.set(`${r.markingCode.toUpperCase()}:::${r.markingNo.toUpperCase()}`, r.loadDate)
          }
          if (r.markingCode && r.custName && r.loadDate && !loadDateMap.has(`${r.markingCode.toUpperCase()}:::${r.custName.toUpperCase()}`)) {
            loadDateMap.set(`${r.markingCode.toUpperCase()}:::${r.custName.toUpperCase()}`, r.loadDate)
          }
        }

        const distinctCustCodes = Array.from(new Set(priceEntries.map((e) => e.custCode).filter(Boolean)))
        const customerBrokerMap = new Map<string, number>()

        for (const e of priceEntries) {
          if (e.markingCode && e.markingNo) {
            entryMap.set(`${e.markingCode}:::${e.markingNo}`.toUpperCase(), e)
          }
          if (e.markingCode && !entryMap.has(e.markingCode.toUpperCase())) {
            entryMap.set(e.markingCode.toUpperCase(), e)
          }
        }

        const [custUploads, masterUploads, custRows] = await Promise.all([
          prisma.tbCustomerPriceListUpload.findMany({
            where: {
              fdCustCode: { in: distinctCustCodes },
              status: { not: 'FAILED' },
              isSuperseded: false,
            },
            orderBy: { effectiveDate: 'desc' },
            include: { items: true, markings: true },
          }),
          prisma.tbPriceListUpload.findMany({
            where: { status: { not: 'FAILED' }, isSuperseded: false },
            orderBy: { effectiveDate: 'desc' },
            include: { items: true, markings: true },
            take: 10,
          }),
          prisma.tbCustomers.findMany({
            where: { fdCustCode: { in: distinctCustCodes } },
            select: { fdCustCode: true, fdBroker: true },
          }),
        ])

        for (const c of custRows) {
          if (c.fdCustCode) {
            customerBrokerMap.set(c.fdCustCode.trim().toUpperCase(), c.fdBroker ?? 0)
          }
        }

        allMasterUploads.push(...masterUploads)
        allCustUploads.push(...custUploads)
      } catch (err) {
        logger.warn('[getBillingTargetDetails] Error fetching partial / fdLoad / price data from tbEntryList:', err)
      }
    }

    const getBranchCode = (b: string) => {
      const u = (b || '').toUpperCase().trim()
      if (u.includes('GUANGZHOU') || u === 'GZ') return 'GZ'
      if (u.includes('YIWU') || u === 'YW') return 'YW'
      if (u.includes('SHANGHAI') || u === 'SH') return 'SH'
      if (u.includes('SHENZHEN') || u === 'SZ') return 'SZ'
      if (u.includes('HONGKONG') || u === 'HK') return 'HK'
      if (u.includes('SINGAPORE') || u === 'SG') return 'SG'
      return u
    }

    return filtered.map((r) => {
      let pic = 'kiki'
      if (mode === 'udara') {
        pic = picMap.get(r.Marking_code?.trim() || '') || 'kiki'
      } else {
        const branch = String(r.Branch || '').toUpperCase().trim()
        const typeStr = String(r.Type || '').toUpperCase().trim()
        if (typeStr.includes('FCL') || typeStr.includes('KONTAINER')) {
          pic = 'ferly'
        } else if (branch === 'GUANGZHOU') {
          pic = 'thara'
        } else {
          pic = 'rico'
        }
      }

      const markingCodeUpper = (r.Marking_code?.trim() || '').toUpperCase()
      const customerUpper = (r.Customer?.trim() || '').toUpperCase()
      const markingNoUpper = (r.Marking_no?.trim() || '').toUpperCase()

      const partialKey = `${markingCodeUpper}:::${customerUpper}`
      const countTerima = partialMap.get(partialKey) || 0
      const isPartial = countTerima > 1

      const loadDate = loadDateMap.get(`${markingCodeUpper}:::${markingNoUpper}`) || loadDateMap.get(partialKey)
      const fdLoad = loadDate ? new Date(loadDate).toISOString() : null

      // Evaluasi kesesuaian harga menggunakan 4-Tier Price List Engine (sama seperti PriceLookupPage)
      const entry = entryMap.get(`${markingCodeUpper}:::${markingNoUpper}`) || entryMap.get(markingCodeUpper)
      const custCode = entry?.custCode || ''
      const branchName = entry?.branchName || (r.Branch?.trim() || '')
      const listType = entry?.fdListType || (mode === 'udara' ? 1 : 2)
      const typeName = entry?.comodityName || (r.Type?.trim() || '')

      let hargaDb = 0
      let priceSourceType = 'NONE'

      const rowTglAgen = r.Tgl_Agen ? new Date(r.Tgl_Agen) : new Date()
      const targetBranchCode = getBranchCode(branchName)
      const targetModeStr = listType === 1 ? 'BY AIR' : 'BY SEA'
      const entryTypeUpper = typeName.toUpperCase().trim()

      // 1. Coba cari di Customer Price List Upload (Level 1 & Level 2)
      const customerUploadCandidates = allCustUploads.filter(
        (u) => u.fdCustCode?.trim().toUpperCase() === custCode.toUpperCase() && new Date(u.effectiveDate) <= rowTglAgen
      )

      if (customerUploadCandidates.length > 0) {
        const markingOverrideUpload = customerUploadCandidates.find((u) =>
          u.markings?.some((m: any) => m.markingCode?.trim().toUpperCase() === markingCodeUpper)
        )
        const chosenCustUpload = markingOverrideUpload || customerUploadCandidates[0]

        if (chosenCustUpload?.items) {
          const matchedItem = findBestCategoryMatch(chosenCustUpload.items, entryTypeUpper, (it: any) => {
            const mMatch = !it.mode || it.mode.toUpperCase() === targetModeStr
            const bMatch = !it.branch || getBranchCode(it.branch) === targetBranchCode
            return mMatch && bMatch
          })
          if (matchedItem) {
            hargaDb = Number(matchedItem.price || 0)
            priceSourceType = markingOverrideUpload ? 'CUSTOMER_MARKING' : 'CUSTOMER_DEFAULT'
          }
        }
      }

      // 2. Jika tidak ada di Customer Price List, fallback ke General Master Price List (Level 3 & Level 4)
      if (hargaDb === 0 && allMasterUploads.length > 0) {
        const brokerVal = customerBrokerMap.get(custCode.toUpperCase()) ?? 0
        const isBroker = Boolean(
          (brokerVal && (brokerVal === 1 || brokerVal === 2)) ||
          (r.Sales || '').toUpperCase().includes('BROKER') ||
          (r.Sales || '').toUpperCase().includes('PA') ||
          (r.Customer || '').toUpperCase().includes('BROKER')
        )
        const targetSheetType = isBroker ? 'MKT' : 'CS'

        const masterUploadCandidates = allMasterUploads.filter((u) => new Date(u.effectiveDate) <= rowTglAgen)
        const generalUpload = masterUploadCandidates[0] || allMasterUploads[0]

        if (generalUpload?.items) {
          const matchedItem = findBestCategoryMatch(generalUpload.items, entryTypeUpper, (it: any) => {
            const sMatch = it.sheetType?.toUpperCase() === targetSheetType
            const mMatch = !it.mode || it.mode.toUpperCase() === targetModeStr || (listType === 1 ? it.mode.toUpperCase().includes('AIR') : it.mode.toUpperCase().includes('SEA'))
            const bMatch = !it.branch || getBranchCode(it.branch) === targetBranchCode || it.branch.toUpperCase().includes(targetBranchCode)
            return sMatch && mMatch && bMatch
          })
          if (matchedItem) {
            hargaDb = Number(matchedItem.price || 0)
            priceSourceType = isBroker ? 'MASTER_MKT' : 'MASTER_CS'
          }
        }
      }

      const currentHarga = Number(r.Harga ?? r.harga ?? r.fdHarga ?? 0)

      let priceStatus: 'MATCH' | 'DIFFERENT' | 'NOT_SET' | 'NO_RATE' = 'NO_RATE'
      if (currentHarga > 0 && hargaDb > 0 && Math.abs(currentHarga - hargaDb) < 1) {
        priceStatus = 'MATCH'
      } else if (currentHarga > 0 && hargaDb > 0 && Math.abs(currentHarga - hargaDb) >= 1) {
        priceStatus = 'DIFFERENT'
      } else if (currentHarga === 0 && hargaDb > 0) {
        priceStatus = 'NOT_SET'
      } else {
        priceStatus = 'NO_RATE'
      }

      return {
        hari: Number(r.hari || 0),
        pic,
        customer: r.Customer?.trim() || '',
        branch: r.Branch?.trim() || '',
        sales: r.Sales?.trim() || '',
        markingCode: r.Marking_code?.trim() || '',
        markingNo: r.Marking_no?.trim() || '',
        status: r.Status?.trim() || '',
        jmlPack: Number(r.Jml_pack || 0),
        satuan: r.Satuan?.trim() || '',
        berat: Number(r.Berat || 0),
        m3List: Number(r.M3_List || 0),
        m3Gudang: Number(r.M3_Gudang || 0),
        type: r.Type?.trim() || '',
        taxReturn: Number(r.TaxReturn ?? r.taxReturn ?? 0),
        comodity: r.Comodity?.trim() || '',
        tglAgen: r.Tgl_Agen ? new Date(r.Tgl_Agen).toISOString() : null,
        exitDate: r.ExitDate ? new Date(r.ExitDate).toISOString() : null,
        statusKirim: r.StatusKirim?.trim() || '',
        harga: currentHarga,
        hargaDb,
        priceStatus,
        comodityNameDb: typeName || '',
        updateBy: r.UpdateBy?.trim() || '',
        updateDate: r.UpdateDate ? new Date(r.UpdateDate).toISOString() : null,
        isPartial,
        countTerima,
        fdLoad,
        // Kolom baru dari get_data_billing_and_data_m3
        m3Komplain: Number(r.fdM3Komplain ?? 0),
        vfcKomplain: Number(r.fdVFCKomplain ?? 0),
        totalQtyKomplain: Number(r.fdTotalQtyKomplain ?? 0),
        totalQtyGudang: Number(r.fdTotalQtyGudang ?? 0),
        jmlBeratKomplain: Number(r.fdJmlBeratKomplain ?? 0),
        // Validasi hanya untuk mode laut
        validasiMismatch: mode === 'laut' ? (() => {
          const m3K    = Number(r.fdM3Komplain ?? 0)
          const jml    = Number(r.Jml_pack ?? 0)
          const qtyG   = Number(r.fdTotalQtyGudang ?? 0)
          const qtyK   = Number(r.fdTotalQtyKomplain ?? 0)
          const beratK = Number(r.fdJmlBeratKomplain ?? 0)
          const berat  = Number(r.Berat ?? 0)
          const hasKomplainM3 = m3K > 0
          const hasKomplainBerat = beratK > 0

          if (hasKomplainM3) {
            const isQtyMismatch = !(qtyK === jml && qtyK === qtyG)
            const isBeratMismatch = hasKomplainBerat ? beratK !== berat : false
            return isQtyMismatch || isBeratMismatch
          } else {
            const isQtyMismatch = !(qtyG === jml)
            const isBeratMismatch = hasKomplainBerat ? beratK !== berat : false
            return isQtyMismatch || isBeratMismatch
          }
        })() : false,
      }
    })
  }

  let items: any[] = []
  if (typeParam === 'all') {
    const [udaraItems, lautItems] = await Promise.all([fetchItemsForType('udara'), fetchItemsForType('laut')])
    items = [...udaraItems, ...lautItems]
  } else if (typeParam === 'laut') {
    items = await fetchItemsForType('laut')
  } else {
    items = await fetchItemsForType('udara')
  }

  const result = picFilter === 'all' ? items : items.filter((i) => i.pic === picFilter)

  // Sort ASC by aging (hari)
  return result.sort((a, b) => b.hari - a.hari)
}

// ─── SJ vs Bill Comparison (per PIC, 30 hari terakhir) ──────────────

const PIC_KEYS = ['thara', 'yati', 'kiki', 'ferly', 'rico'] as const

export async function getSjVsBillComparison(query?: Record<string, string | undefined>) {
  const customDays = query?.days ? parseInt(query.days, 10) : 30
  const days = getLastNDays(customDays)
  const startDate = days[0]!.start
  const endDate = days[days.length - 1]!.end

  // Query 1: SJ diterima (berdasarkan fdKembali)
  // Khusus Ferly (FCL / fdTypeComodity = 5), dihitung berdasarkan COUNT(DISTINCT markingCode) (jumlah kontainer)
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
  // Khusus Ferly (FCL / fdTypeComodity = 5), dihitung berdasarkan COUNT(DISTINCT markingCode) (jumlah kontainer)
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

  // Build lookup maps: "YYYY-MM-DD|pic" → count
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

  // Merge into daily data points
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
    // Unbilled SJ: SJ returned in last 30 days where no tbBilling exists for that fdListCode
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
    // Surplus Bill: Bill created in last 30 days where no returned tbDelivery exists for that fdListCode
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

export async function getBillingM3Check(listCode: string) {
  const cleanListCode = listCode.trim()

  // 1. Resolve listCode, custCode, and markingCode from tbBilling or tbEntryList
  let resolvedListCode = cleanListCode
  let resolvedCustCode = ''
  let resolvedMarkingCode = ''
  let resolvedListType: number | null = null
  let resolvedBranchCode: string | null = null
  let resolvedBranchName: string | null = null
  let custBlocked = 0
  let custBroker = 0
  let custName = ''
  let custSalesNM = ''

  // First try matching tbBilling
  const billingInfo = await safeRunRaw(async () => {
    return prisma.tbBilling.findFirst({
      where: {
        OR: [
          { fdListCode: cleanListCode },
          { fdInvNo: cleanListCode },
        ],
      },
      select: {
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
    if (billingInfo.fdListCode?.trim()) resolvedListCode = billingInfo.fdListCode.trim()
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
  } else {
    // Try tbEntryList
    const entryInfo = await safeRunRaw(async () => {
      const entry = await prisma.tbEntryList.findUnique({
        where: { fdListCode: cleanListCode },
        select: {
          fdListCode: true,
          fdListType: true,
          fdMarkingCode: true,
          deliveries: {
            select: {
              fdCustCode: true,
            },
            take: 1,
          },
        },
      })
      if (!entry) return null

      let custData: { fdCustCode: string; fdCustName: string | null; fdBlocked: number; fdSalesNM: string | null; fdBroker: number } | null = null
      const dCustCode = entry.deliveries?.[0]?.fdCustCode?.trim()
      if (dCustCode) {
        const foundCust = await prisma.tbCustomers.findUnique({
          where: { fdCustCode: dCustCode },
          select: { fdCustCode: true, fdCustName: true, fdBlocked: true, fdSalesNM: true, fdBroker: true },
        })
        if (foundCust) {
          custData = {
            fdCustCode: foundCust.fdCustCode,
            fdCustName: foundCust.fdCustName,
            fdBlocked: foundCust.fdBlocked ?? 0,
            fdSalesNM: foundCust.fdSalesNM?.trim() || null,
            fdBroker: foundCust.fdBroker ?? 0,
          }
        }
      }

      return {
        fdListCode: entry.fdListCode,
        fdListType: entry.fdListType,
        fdMarkingCode: entry.fdMarkingCode,
        customer: custData,
      }
    }, 'entryInfo')

    if (entryInfo && entryInfo.fdListCode) {
      resolvedListCode = entryInfo.fdListCode.trim()
      if (entryInfo.fdListType !== null && entryInfo.fdListType !== undefined) {
        resolvedListType = Number(entryInfo.fdListType)
      }
      if (entryInfo.fdMarkingCode?.trim()) resolvedMarkingCode = entryInfo.fdMarkingCode.trim()
      if (entryInfo.customer) {
        resolvedCustCode = entryInfo.customer.fdCustCode.trim()
        custName = entryInfo.customer.fdCustName?.trim() || ''
        custBlocked = entryInfo.customer.fdBlocked ?? 0
        custBroker = entryInfo.customer.fdBroker ?? 0
        custSalesNM = entryInfo.customer.fdSalesNM?.trim() || ''
      }
    }
  }

  // Fetch marking & cabang info
  const markingBranch = await safeRunRaw(async () => {
    if (!resolvedListCode && !resolvedMarkingCode) return null
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
      WHERE el.fdListCode = ${resolvedListCode}
         OR el.fdMarkingCode = ${resolvedMarkingCode}
    `
    return res && res.length > 0 ? res[0] : null
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
  else if (resolvedBranchCode?.trim()) expectedBranch = resolvedBranchCode.trim().toUpperCase()

  // Execute M3 check & Profile Harga queries in parallel
  const [unifiedM3Rows, m3CustRows, profileHargaRows, markingComodityRows] = await Promise.all([
    // 1. Unified M3 SP: exec get_m3_listcode
    safeRunRaw(() => prisma.$queryRaw<any[]>`EXEC get_m3_listcode ${resolvedListCode}`, 'get_m3_listcode'),
    // 2. M3 Customer per Marking: exec get_m3_customer_permarking @fdCustCode, @fdMarkingCode
    safeRunRaw(async () => {
      if (!resolvedCustCode || !resolvedMarkingCode) return []
      return prisma.$queryRaw<any[]>`EXEC get_m3_customer_permarking ${resolvedCustCode}, ${resolvedMarkingCode}`
    }, 'get_m3_customer_permarking'),
    // 3. Customer Profile Harga SP: exec get_profile_harga_dari_listcode @fdListCode
    safeRunRaw(async () => {
      if (!resolvedListCode) return []
      return prisma.$queryRaw<any[]>`EXEC dbo.get_profile_harga_dari_listcode @fdListCode = ${resolvedListCode}`
    }, 'get_profile_harga_dari_listcode'),
    // 4. Marking Commodity Type from qr_tbm3_perMarking_rev1
    safeRunRaw(async () => {
      if (!resolvedCustCode || !resolvedMarkingCode) return []
      return prisma.$queryRaw<any[]>`EXEC dbo.get_qr_tbm3_perMarking_plus_rasio @fdCustCode = ${resolvedCustCode}, @fdMarkingCode = ${resolvedMarkingCode}`
    }, 'get_qr_tbm3_perMarking_plus_rasio'),
  ])

  const profileHargaRow = Array.isArray(profileHargaRows) && profileHargaRows.length > 0 ? profileHargaRows[0] : null
  const profileHarga = profileHargaRow
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
      }
    : null

  const unifiedRow = Array.isArray(unifiedM3Rows) && unifiedM3Rows.length > 0 ? unifiedM3Rows[0] : null
  const markingComodityRow = Array.isArray(markingComodityRows) && markingComodityRows.length > 0 ? markingComodityRows[0] : null
  const rawFirstType = markingComodityRow?.fdTypeComodity ?? markingComodityRow?.TypeComodity ?? markingComodityRow?.fdTipe ?? markingComodityRow?.Tipe
  const markingComodityType: number | null = rawFirstType !== undefined && rawFirstType !== null && !isNaN(Number(rawFirstType)) ? Number(rawFirstType) : null

  const markingComodities = Array.isArray(markingComodityRows)
    ? markingComodityRows.map((r) => {
        const rawType = r.fdTypeComodity ?? r.TypeComodity ?? r.fdTipe ?? r.Tipe
        const rawComodity = r.fdComodity ?? r.Comodity ?? r.fdCommodity ?? r.Commodity ?? r.fdDescr ?? r.Descr
        const rawComodityName = r.fdComodityName ?? r.ComodityName ?? r.Tipe ?? r.fdTipe
        return {
          fdTypeComodity: rawType !== null && rawType !== undefined && !isNaN(Number(rawType)) ? Number(rawType) : null,
          fdComodity: rawComodity ? String(rawComodity).trim() : null,
          fdComodityName: rawComodityName ? String(rawComodityName).trim() : null,
        }
      })
    : []

  const parseM3Val = (val: any): number | null => {
    if (val === null || val === undefined) return null
    const num = typeof val === 'number' ? val : parseFloat(String(val || 0))
    return isNaN(num) ? null : parseFloat(num.toFixed(4))
  }

  const parseQtyVal = (val: any): number | null => {
    if (val === null || val === undefined || val === '') return null
    const num = typeof val === 'number' ? val : parseInt(String(val), 10)
    return isNaN(num) ? null : num
  }

  const m3PL = parseM3Val(unifiedRow?.fdM3PL)
  const m3Gudang = parseM3Val(unifiedRow?.fdM3Gudang)
  // Parse dari get_m3_listcode (Unified SP)
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

  if (detailRows.length > 0) {
    let sumHybrid = 0
    let sumPL = 0
    let hasValidPL = false
    for (const r of detailRows) {
      const m3K = parseM3Val(r.fdM3Komplain ?? r.fdm3Komplain ?? r['M3 K'] ?? r['M3_K'])
      const m3G = parseM3Val(r.fdM3 ?? r['M3'] ?? r.m3_gdg)
      const plV = parseM3Val(r.fdM3PackingList ?? r.fdM3PL ?? r['M3 PL'] ?? r['M3_PL'] ?? r.m3_pl ?? r.fdm3PL)

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
    }
    m3KomplainPlusGudang = parseFloat(sumHybrid.toFixed(4))
    if (m3PLPerMarking === null && hasValidPL) {
      m3PLPerMarking = parseFloat(sumPL.toFixed(4))
    }
  }

  // Fallback: jika m3PLPerMarking masih null setelah semua sumber (unified SP + perMarking SP),
  // gunakan m3PL dari get_m3_listcode sebagai nilai representatif PL untuk marking ini
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
  const normM3List = m3List !== null && m3List > 0 ? normM3(m3List) : null

  const normKomplainPerMarkingValues = komplainPerMarkingValues.map(normM3)
  const normPlPerMarkingValues = plPerMarkingValues.map(normM3)
  const normHybridValues = m3KomplainPlusGudang !== null && m3KomplainPlusGudang > 0 ? [normM3(m3KomplainPlusGudang)] : []

  const hasPlValue = m3PL !== null && m3PL > 0
  const allM3Values = [...normPlValues, ...normGudangValues, ...normCustValues, ...normKomplainValues, ...normKomplainPerMarkingValues, ...normPlPerMarkingValues, ...normHybridValues]
  if (!hasPlValue && normM3List !== null && normM3List > 0) {
    allM3Values.push(normM3List)
  }
  const maxM3 = allM3Values.length > 0 ? parseFloat(Math.max(...allM3Values).toFixed(4)) : 0

  // Check if Customer status is COD (fdBlocked = 2) or URGENT (fdBlocked = 5)
  const isCodOrUrgent = custBlocked === 2 || custBlocked === 5
  const rawRec = isCodOrUrgent ? maxM3 : (normGudangValues[0] ?? normPlValues[0] ?? maxM3)
  const recommendedM3 = parseFloat(Number(rawRec || 0).toFixed(4))

  // Fetch fdTglAgent from tbEntryList / vwShipment
  const tglAgentRes = await safeRunRaw(async () => {
    const r1 = await prisma.$queryRaw<any[]>`
      SELECT TOP 1 fdTglAgent FROM tbEntryList WITH (NOLOCK) WHERE fdListCode = ${resolvedListCode}
    `
    if (r1 && r1.length > 0 && r1[0].fdTglAgent) return r1[0].fdTglAgent
    const r2 = await prisma.$queryRaw<any[]>`
      SELECT TOP 1 fdTglAgent FROM vwShipment WITH (NOLOCK) WHERE fdListCode = ${resolvedListCode}
    `
    if (r2 && r2.length > 0 && r2[0].fdTglAgent) return r2[0].fdTglAgent
    return null
  }, 'get_tgl_agent')

  const agentDate = tglAgentRes ? new Date(tglAgentRes) : null

  // 1. Fetch customer-specific price list if available
  let customerPriceListItems: any[] = []
  let customerPriceEffectiveDate: string | null = null
  let hasCustomerPriceList = false

  if (resolvedCustCode) {
    const custUpload = await safeRunRaw(async () => {
      if (agentDate) {
        const up = await prisma.tbCustomerPriceListUpload.findFirst({
          where: {
            fdCustCode: resolvedCustCode,
            effectiveDate: { lte: agentDate },
            status: { not: 'FAILED' },
            isSuperseded: false,
          },
          orderBy: [{ effectiveDate: 'desc' }, { uploadedAt: 'desc' }],
          include: { items: true },
        })
        if (up) return up
      }

      return prisma.tbCustomerPriceListUpload.findFirst({
        where: {
          fdCustCode: resolvedCustCode,
          status: { not: 'FAILED' },
          isSuperseded: false,
        },
        orderBy: [{ effectiveDate: 'desc' }, { uploadedAt: 'desc' }],
        include: { items: true },
      })
    }, 'get_customer_price_list')

    if (custUpload && Array.isArray(custUpload.items) && custUpload.items.length > 0) {
      hasCustomerPriceList = true
      customerPriceEffectiveDate = custUpload.effectiveDate ? custUpload.effectiveDate.toISOString() : null
      customerPriceListItems = custUpload.items.map((it) => ({
        id: it.id,
        sheetType: 'CUSTOMER',
        mode: it.mode,
        branch: it.branch,
        category: it.category,
        price: Number(it.price),
        isCustomerPrice: true,
      }))
    }
  }

  // 2. Fetch master price list items effective for agentDate
  let masterPriceListItems: any[] = []
  let priceEffectiveDate: string | null = null

  if (agentDate) {
    const upload = await safeRunRaw(async () => {
      return prisma.tbPriceListUpload.findFirst({
        where: {
          effectiveDate: { lte: agentDate },
          status: { not: 'FAILED' },
          isSuperseded: false,
        },
        orderBy: { effectiveDate: 'desc' },
        include: { items: true },
      })
    }, 'get_effective_price_list')

    if (upload) {
      priceEffectiveDate = upload.effectiveDate.toISOString()
      masterPriceListItems = upload.items.map((it) => ({
        id: it.id,
        sheetType: it.sheetType,
        mode: it.mode,
        branch: it.branch,
        category: it.category,
        price: Number(it.price),
        isCustomerPrice: false,
      }))
    }
  }

  if (masterPriceListItems.length === 0) {
    const latestUpload = await safeRunRaw(async () => {
      return prisma.tbPriceListUpload.findFirst({
        where: { status: { not: 'FAILED' }, isSuperseded: false },
        orderBy: { effectiveDate: 'desc' },
        include: { items: true },
      })
    }, 'get_latest_price_list')

    if (latestUpload) {
      priceEffectiveDate = latestUpload.effectiveDate.toISOString()
      masterPriceListItems = latestUpload.items.map((it) => ({
        id: it.id,
        sheetType: it.sheetType,
        mode: it.mode,
        branch: it.branch,
        category: it.category,
        price: Number(it.price),
        isCustomerPrice: false,
      }))
    }
  }

  const allPriceListItems = [...customerPriceListItems, ...masterPriceListItems]

  return {
    fdListCode: resolvedListCode,
    fdListType: resolvedListType,
    defaultFdTypeComodity: markingBranch?.fdTypeComodity !== null && markingBranch?.fdTypeComodity !== undefined ? Number(markingBranch.fdTypeComodity) : null,
    markingComodityType,
    markingComodities,
    fdTglAgent: agentDate ? agentDate.toISOString() : null,
    expectedMode,
    expectedBranch,
    priceValidation: {
      fdTglAgent: agentDate ? agentDate.toISOString() : null,
      effectiveDate: customerPriceEffectiveDate || priceEffectiveDate,
      masterEffectiveDate: priceEffectiveDate,
      customerEffectiveDate: customerPriceEffectiveDate,
      hasCustomerPriceList,
      expectedMode,
      expectedBranch,
      items: allPriceListItems,
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
    fdJmlBeratKomplain: parseM3Val(unifiedRow?.fdJmlBeratKomplain),
    totalJmlBeratSJ: parseM3Val(unifiedRow?.TotalJmlBeratSJ),
    fdVFCGudang: parseM3Val(unifiedRow?.fdVFCGudang),
    fdVFCPL: parseM3Val(unifiedRow?.fdVFCPL),
    fdVFCKomplain: parseM3Val(unifiedRow?.fdVFCKomplain),
    vfcGudangPerMarking: parseM3Val(unifiedRow?.VFCGudangPerMarking),
    vfcKomplainPerMarking: parseM3Val(unifiedRow?.VFCKomplainPerMarking),
    minChargeKg: profileHarga?.minChargeKg ? profileHarga.minChargeKg : (resolvedListType === 1 ? 3 : 0),
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
  }
}

export async function getM3CustPerMarkingDetails(custCode: string, markingCode: string) {
  const cleanCustCode = custCode.trim()
  const cleanMarkingCode = markingCode.trim()

  if (!cleanCustCode || !cleanMarkingCode) {
    return []
  }

  try {
    const rows = await prisma.$queryRaw<any[]>`
      EXEC dbo.get_qr_tbm3_perMarking_plus_rasio @fdCustCode = ${cleanCustCode}, @fdMarkingCode = ${cleanMarkingCode}
    `
    return rows
  } catch (err) {
    logger.error(`Error executing dbo.get_qr_tbm3_perMarking_plus_rasio for ${cleanCustCode} / ${cleanMarkingCode}:`, err)
    return []
  }
}

export async function getBillingPartialDetails(query: Record<string, string | undefined>) {
  const markingCode = query.markingCode?.trim() || ''
  const customer = query.customer?.trim() || ''
  const custCode = query.custCode?.trim() || ''

  if (!markingCode) {
    return []
  }

  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT
        RTRIM(el.fdListCode) AS fdListCode,
        RTRIM(el.fdMarkingCode) AS fdMarkingCode,
        RTRIM(el.fdMarkingNo) AS fdMarkingNo,
        RTRIM(el.fdCustCode) AS fdCustCode,
        RTRIM(c.fdCustName) AS custName,
        COALESCE(RTRIM(emp1.fdEmpName), RTRIM(el.fdEmp1), '') AS fdEmp1,
        el.fdLoad AS fdLoad,
        RTRIM(el.fdTerima) AS fdTerima,
        COALESCE(RTRIM(b.fdInvNo), RTRIM(bd.fdInvNo), RTRIM(el.fdInvoiceNo), '') AS fdInvNo,
        el.fdJmlPack AS fdJmlPack,
        RTRIM(el.fdSatuan) AS fdSatuan,
        el.fdM3 AS fdM3,
        el.fdJmlBerat AS fdJmlBerat,
        RTRIM(el.fdDesc) AS fdDesc
      FROM tbEntryList el WITH (NOLOCK)
      LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = el.fdCustCode
      LEFT JOIN tbEmployees emp1 WITH (NOLOCK) ON emp1.fdEmpCode = el.fdEmp1
      LEFT JOIN tbBilling b WITH (NOLOCK) ON b.fdListCode = el.fdListCode
      LEFT JOIN tbBillingDetail bd WITH (NOLOCK) ON bd.fdListCode = el.fdListCode
      WHERE RTRIM(el.fdMarkingCode) = ${markingCode}
        AND (
          (${customer} <> '' AND RTRIM(c.fdCustName) = ${customer})
          OR (${custCode} <> '' AND RTRIM(el.fdCustCode) = ${custCode})
          OR (${customer} = '' AND ${custCode} = '')
        )
      ORDER BY el.fdLoad ASC, el.fdListCode ASC
    `

    return rows.map((r) => ({
      listCode: r.fdListCode?.trim() || '',
      markingCode: r.fdMarkingCode?.trim() || '',
      markingNo: r.fdMarkingNo?.trim() || '',
      custCode: r.fdCustCode?.trim() || '',
      customer: r.custName?.trim() || customer,
      fdEmp1: r.fdEmp1?.trim() || '',
      fdLoad: r.fdLoad ? new Date(r.fdLoad).toISOString() : null,
      fdTerima: r.fdTerima?.trim() || '',
      invNo: r.fdInvNo?.trim() || '',
      jmlPack: Number(r.fdJmlPack || 0),
      satuan: r.fdSatuan?.trim() || 'COLY',
      m3: Number(r.fdM3 || 0),
      berat: Number(r.fdJmlBerat || 0),
      desc: r.fdDesc?.trim() || '',
    }))
  } catch (err) {
    logger.error(`[getBillingPartialDetails] Error fetching partial details for ${markingCode} / ${customer}:`, err)
    return []
  }
}

/**
 * Pengecekan harga mendalam untuk item Target Billing terhadap database (vwCustomersHarga, SP profile harga, tbCustomerPriceList)
 */
export async function getBillingTargetPriceCheck(query: Record<string, any>) {
  const markingCode = String(query.markingCode || '').trim()
  const markingNo = String(query.markingNo || '').trim()
  const customer = String(query.customer || query.custName || '').trim()
  const branch = String(query.branch || '').trim()
  const type = String(query.type || '').trim()
  const mode = String(query.mode || '').toLowerCase().trim()
  const currentPrice = Number(query.harga || 0)

  if (!markingCode) {
    throw new Error('Parameter markingCode wajib diisi')
  }

  return safeRunRaw(async () => {
    // 1. Ambil data entry list terkait marking
    const entryRows = await prisma.$queryRaw<any[]>`
      SELECT TOP 1
        RTRIM(el.fdListCode) AS fdListCode,
        RTRIM(el.fdMarkingCode) AS fdMarkingCode,
        RTRIM(el.fdMarkingNo) AS fdMarkingNo,
        RTRIM(el.fdCustCode) AS fdCustCode,
        RTRIM(c.fdCustName) AS custName,
        RTRIM(c.fdSalesNM) AS sales,
        c.fdBlocked AS blocked,
        RTRIM(el.fdBranchCode) AS branchCode,
        RTRIM(br.fdBranchName) AS branchName,
        el.fdTypeComodity,
        RTRIM(tc.fdComodityName) AS comodityName,
        RTRIM(el.fdComodity) AS comodityText,
        el.fdListType,
        el.fdTglAgent,
        el.fdM3,
        el.fdJmlBerat,
        el.fdJmlPack,
        RTRIM(el.fdSatuan) AS satuan,
        el.fdTaxRebates
      FROM tbEntryList el WITH (NOLOCK)
      LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = el.fdCustCode
      LEFT JOIN tbCabang br WITH (NOLOCK) ON br.fdBranchCode = el.fdBranchCode
      LEFT JOIN tbTypeComodity tc WITH (NOLOCK) ON tc.fdTypeComodity = el.fdTypeComodity AND tc.fdListType = el.fdListType
      WHERE RTRIM(el.fdMarkingCode) = ${markingCode}
        AND (${markingNo} = '' OR RTRIM(el.fdMarkingNo) = ${markingNo})
      ORDER BY el.fdLoad DESC
    `

    const entry = entryRows[0] || null
    const custCode = entry?.fdCustCode || ''
    const resolvedBranch = entry?.branchName || branch || ''
    const resolvedListType = entry?.fdListType || (mode === 'udara' ? 1 : 2)
    const listCode = entry?.fdListCode || ''
    const agentDate = entry?.fdTglAgent ? new Date(entry.fdTglAgent) : null

    // 2. Ambil seluruh tarif yang terdaftar di vwCustomersHarga untuk customer ini
    let customerTariffs: any[] = []
    if (custCode) {
      const tariffRows = await prisma.$queryRaw<any[]>`
        SELECT 
          RTRIM(fdCustCode) AS custCode,
          RTRIM(fdCustName) AS custName,
          RTRIM(fdBranchName) AS branchName,
          fdListType,
          jenis,
          fdTypeComodity,
          RTRIM(fdComodityName) AS comodityName,
          Harga,
          RTRIM(UpdateBy) AS updateBy,
          UpdateDate AS updateDate
        FROM vwCustomersHarga WITH (NOLOCK)
        WHERE RTRIM(fdCustCode) = ${custCode}
          AND (${resolvedBranch} = '' OR RTRIM(fdBranchName) = ${resolvedBranch})
          AND (${resolvedListType} = 0 OR fdListType = ${resolvedListType})
        ORDER BY fdBranchName ASC, fdComodityName ASC
      `
      customerTariffs = tariffRows.map((r) => ({
        custCode: r.custCode,
        custName: r.custName,
        branchName: r.branchName,
        listType: r.fdListType,
        jenis: r.jenis,
        typeComodity: r.fdTypeComodity,
        comodityName: r.comodityName,
        harga: Number(r.Harga || 0),
        updateBy: r.updateBy || '',
        updateDate: r.updateDate ? new Date(r.updateDate).toISOString() : null,
      }))
    }

    // 3. Ambil SP profile harga dari dbo.get_profile_harga_dari_listcode jika ada listCode
    let profileHarga: any = null
    if (listCode) {
      try {
        const spRes = await prisma.$queryRaw<any[]>`
          EXEC dbo.get_profile_harga_dari_listcode ${listCode}
        `
        if (spRes && spRes[0]) {
          profileHarga = {
            harga: Number(spRes[0].Harga || 0),
            rasio: Number(spRes[0].Rasio || 0),
            typeTagihan: Number(spRes[0].fdTypeTagihan || 0),
            kg: Number(spRes[0].Kg || 0),
            minChargeM3: Number(spRes[0].MinChargeM3 || 0),
            minChargeKg: Number(spRes[0].MinChargeKG || 0),
            taxReturnPrice: Number(spRes[0].fdTaxReturnPrice || 0),
            taxReturnMinCharge: Number(spRes[0].fdTaxReturnMinCharge || 0),
          }
        }
      } catch (err) {
        logger.warn(`[getBillingTargetPriceCheck] SP profile error for ${listCode}:`, err)
      }
    }

    // 4. Jalankan 4-Tier Price List Lookup Engine (Sama persis seperti PriceLookupPage)
    const lookupEntryCode = entry?.fdListCode || markingCode
    const priceLookupRes = await lookupPriceByEntry(lookupEntryCode)

    let priceCS: number | null = null
    let priceMKT: number | null = null
    let customerPriceList: any = null
    let masterPriceList: any = null
    let dbPrice = 0
    let priceSource: 'CUSTOMER_TARIFF' | 'PRICE_LIST_CS' | 'PRICE_LIST_MKT' | 'PROFILE_SP' = 'PRICE_LIST_MKT'
    let priceSourceLabel = 'Tarif Price List'
    let matchedWith: 'CUSTOMER' | 'MASTER_CS' | 'MASTER_MKT' | 'PROFILE_SP' | 'NONE' = 'NONE'
    let appliedTierLabel = 'Level 4: Tarif Price List Umum Standar'

    const customerInfo = custCode
      ? await prisma.tbCustomers.findUnique({
          where: { fdCustCode: custCode },
          select: { fdCustCode: true, fdCustName: true, fdBroker: true, fdSalesNM: true },
        })
      : null

    const isBroker = Boolean(
      (customerInfo?.fdBroker && (customerInfo.fdBroker === 1 || customerInfo.fdBroker === 2)) ||
      (entry?.sales || '').toUpperCase().includes('BROKER') ||
      (entry?.sales || '').toUpperCase().includes('PA') ||
      (customerInfo?.fdCustName || '').toUpperCase().includes('BROKER')
    )

    const entryTypeName = (entry?.comodityName || type || '').toUpperCase().trim()

    if (priceLookupRes.found && priceLookupRes.priceValidation) {
      const pv = priceLookupRes.priceValidation
      const appliedRule = priceLookupRes.appliedRule

      if (pv.source === 'CUSTOMER') {
        appliedTierLabel =
          appliedRule === 'CUSTOMER_MARKING'
            ? 'Level 1: Tarif Khusus Customer (Marking Agen)'
            : 'Level 2: Tarif Khusus Customer (Default)'
        customerPriceList = {
          uploadId: pv.uploadInfo?.uploadId,
          fileName: pv.uploadInfo?.fileName,
          effectiveDate: pv.effectiveDate,
          items: pv.items || [],
        }

        const matchedItem = findBestCategoryMatch(pv.items, entryTypeName)

        if (matchedItem && Number(matchedItem.price) > 0) {
          dbPrice = Number(matchedItem.price)
          priceSource = 'CUSTOMER_TARIFF'
          priceSourceLabel = appliedTierLabel
          matchedWith = 'CUSTOMER'
        }
      } else {
        // Source is GENERAL Price List
        appliedTierLabel =
          appliedRule === 'GENERAL_MARKING'
            ? 'Level 3: Tarif Price List Umum (Marking Agen)'
            : 'Level 4: Tarif Price List Umum Standar'
        masterPriceList = {
          uploadId: pv.uploadInfo?.uploadId,
          fileName: pv.uploadInfo?.fileName,
          effectiveDate: pv.effectiveDate,
          items: pv.items || [],
        }

        const csItem = findBestCategoryMatch(pv.items, entryTypeName, (it: any) => it.sheetType?.toUpperCase() === 'CS')
        const mktItem = findBestCategoryMatch(pv.items, entryTypeName, (it: any) => it.sheetType?.toUpperCase() === 'MKT')

        priceCS = csItem ? Number(csItem.price) : null
        priceMKT = mktItem ? Number(mktItem.price) : null

        if (isBroker && priceMKT) {
          dbPrice = priceMKT
          priceSource = 'PRICE_LIST_MKT'
          priceSourceLabel = `${appliedTierLabel} (MKT - Broker)`
          matchedWith = 'MASTER_MKT'
        } else if (!isBroker && priceCS) {
          dbPrice = priceCS
          priceSource = 'PRICE_LIST_CS'
          priceSourceLabel = `${appliedTierLabel} (CS - Non-Broker)`
          matchedWith = 'MASTER_CS'
        } else if (priceMKT || priceCS) {
          dbPrice = (isBroker ? priceMKT : priceCS) || priceCS || priceMKT || 0
          priceSource = isBroker ? 'PRICE_LIST_MKT' : 'PRICE_LIST_CS'
          priceSourceLabel = `${appliedTierLabel} (${isBroker ? 'MKT' : 'CS'})`
          matchedWith = isBroker ? 'MASTER_MKT' : 'MASTER_CS'
        }
      }
    }

    const matchedTariff =
      customerTariffs.find(
        (t) =>
          (entry?.fdTypeComodity && t.typeComodity === entry.fdTypeComodity) ||
          (entryTypeName && t.comodityName?.toUpperCase() === entryTypeName)
      ) || (customerTariffs.length === 1 ? customerTariffs[0] : null)

    let status: 'MATCH' | 'DIFFERENT' | 'NOT_SET' | 'NO_RATE' = 'NO_RATE'
    let statusLabel = ''
    let statusDescription = ''

    const effectiveDateStr = priceLookupRes.priceValidation?.effectiveDate
      ? new Date(priceLookupRes.priceValidation.effectiveDate).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'Aktif'

    if (currentPrice > 0 && dbPrice > 0 && Math.abs(currentPrice - dbPrice) < 1) {
      status = 'MATCH'
      statusLabel = 'Harga Sesuai Price List'
      statusDescription = `Harga saat ini (Rp ${currentPrice.toLocaleString('id-ID')}) SESUAI dengan acuan ${priceSourceLabel} (Periode ${effectiveDateStr}).`
    } else if (currentPrice > 0 && dbPrice > 0 && Math.abs(currentPrice - dbPrice) >= 1) {
      const diff = currentPrice - dbPrice
      status = 'DIFFERENT'
      statusLabel = 'Terdapat Selisih Harga'
      statusDescription = `Harga di Target Bill (Rp ${currentPrice.toLocaleString('id-ID')}) BERBEDA dengan Acuan Price List Rp ${dbPrice.toLocaleString('id-ID')} (${priceSourceLabel}, Periode ${effectiveDateStr}). Selisih: ${diff > 0 ? '+' : ''}Rp ${diff.toLocaleString('id-ID')}.`
    } else if (currentPrice === 0 && dbPrice > 0) {
      status = 'NOT_SET'
      statusLabel = 'Tarif Tersedia di DB (Belum Terisi di Target)'
      statusDescription = `Acuan tarif price list tersedia sebesar Rp ${dbPrice.toLocaleString('id-ID')} (${priceSourceLabel}, Periode ${effectiveDateStr}), namun harga pada target bill masih 0.`
    } else {
      status = 'NO_RATE'
      statusLabel = 'Belum Ada Tarif di Price List'
      statusDescription = `Tidak ditemukan acuan tarif yang aktif pada tanggal agen ${entry?.fdTglAgent ? new Date(entry.fdTglAgent).toLocaleDateString('id-ID') : 'terkait'} untuk komoditi ${entryTypeName} di cabang ${resolvedBranch}.`
    }

    return {
      markingCode,
      markingNo: entry?.fdMarkingNo || markingNo,
      customer: entry?.custName || customer,
      custCode,
      sales: entry?.sales || '',
      isBroker,
      matchedWith,
      appliedTierLabel,
      branch: resolvedBranch,
      mode: resolvedListType === 1 ? 'UDARA' : 'LAUT',
      listType: resolvedListType,
      currentType: entry?.comodityName || type || '—',
      currentComodityText: entry?.comodityText || '',
      tglAgen: entry?.fdTglAgent ? new Date(entry.fdTglAgent).toISOString() : null,
      effectiveDate: priceLookupRes.priceValidation?.effectiveDate || null,
      priceSource,
      priceSourceLabel,
      priceCS,
      priceMKT,
      currentPrice,
      dbPrice,
      difference: currentPrice > 0 && dbPrice > 0 ? currentPrice - dbPrice : 0,
      status,
      statusLabel,
      statusDescription,
      matchedTariff,
      profileHarga,
      customerTariffs,
      customerPriceList,
      masterPriceList,
    }
  }, 'get_billing_target_price_check')
}






