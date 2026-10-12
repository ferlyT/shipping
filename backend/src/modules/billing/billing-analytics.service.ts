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

  // Jika customDays >= 360 (1 tahun / 365 hari), lakukan agregasi per bulan (12 bulan) agar grafik rapi dan performa optimal
  if (customDays >= 360) {
    const months = getLastNMonths(12)
    const startDate = months[0]!.start
    const endDate = months[months.length - 1]!.end

    const rows = await prisma.tbBilling.findMany({
      where: { fdInvDate: { gte: startDate, lte: endDate } },
      select: { fdInvDate: true, fdEmpCode: true, fdJumlah1: true },
    })

    // Tentukan top 5 karyawan berdasarkan total bill dalam 1 tahun ini
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
    const nameMap = new Map(employees.map((e) => [e.fdEmpCode.trim(), e.fdEmpName.trim()]))
    const empLabel = (code: string) => (code === '-' ? 'Tanpa Nama' : nameMap.get(code) || code)

    const hasOthers = [...totalPerEmp.keys()].some((code) => !topCodes.includes(code))
    const seriesKeys = hasOthers ? [...topCodes, '__others__'] : topCodes

    const counts = months.map(() => new Map<string, number>())
    const sums = months.map(() => new Map<string, number>())
    for (const row of rows) {
      const code = row.fdEmpCode?.trim() || '-'
      const mIdx = months.findIndex((m) => row.fdInvDate >= m.start && row.fdInvDate <= m.end)
      if (mIdx === -1) continue
      const seriesKey = topCodes.includes(code) ? code : '__others__'
      counts[mIdx]!.set(seriesKey, (counts[mIdx]!.get(seriesKey) || 0) + 1)
      sums[mIdx]!.set(seriesKey, (sums[mIdx]!.get(seriesKey) || 0) + Number(row.fdJumlah1 || 0))
    }

    const data = months.map((m, idx) => {
      const y = m.start.getFullYear()
      const mon = String(m.start.getMonth() + 1).padStart(2, '0')
      const point: Record<string, string | number> = {
        date: `${y}-${mon}`, // YYYY-MM
        label: m.label,
      }
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

  const days = getLastNDays(customDays)

  const rows = await prisma.tbBilling.findMany({
    where: { fdInvDate: { gte: days[0]!.start, lte: days[days.length - 1]!.end } },
    select: { fdInvDate: true, fdEmpCode: true, fdJumlah1: true },
  })

  // Tentukan top 5 karyawan berdasarkan total bill dalam periode hari ini
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
  // Untuk data bulanan dan YoY (Year-over-Year), tarik rentang dari 12 bulan sebelum bulan pertama (24 bulan)
  const monthlyStart = new Date(months[0]!.start.getFullYear() - 1, months[0]!.start.getMonth(), 1)
  const monthlyEnd = months[months.length - 1]!.end

  const [dailyRows, monthlyRows] = await Promise.all([
    prisma.$queryRaw<{
      day: Date
      totalBill: number
      totalTagihan: unknown
      billUdara: number
      tagihanUdara: unknown
      billLaut: number
      tagihanLaut: unknown
    }[]>`
      SELECT CAST(fdInvDate AS DATE) AS day,
             COUNT(*) AS totalBill,
             SUM(ISNULL(fdJumlah1, 0)) AS totalTagihan,
             SUM(CASE WHEN fdListType = 1 THEN 1 ELSE 0 END) AS billUdara,
             SUM(CASE WHEN fdListType = 1 THEN ISNULL(fdJumlah1, 0) ELSE 0 END) AS tagihanUdara,
             SUM(CASE WHEN fdListType = 2 THEN 1 ELSE 0 END) AS billLaut,
             SUM(CASE WHEN fdListType = 2 THEN ISNULL(fdJumlah1, 0) ELSE 0 END) AS tagihanLaut
      FROM tbBilling WITH (NOLOCK)
      WHERE fdInvDate >= ${dailyStart} AND fdInvDate <= ${dailyEnd}
      GROUP BY CAST(fdInvDate AS DATE)
    `,
    prisma.$queryRaw<{
      yr: number
      mo: number
      totalBill: number
      totalTagihan: unknown
      billUdara: number
      tagihanUdara: unknown
      billLaut: number
      tagihanLaut: unknown
    }[]>`
      SELECT YEAR(fdInvDate) AS yr,
             MONTH(fdInvDate) AS mo,
             COUNT(*) AS totalBill,
             SUM(ISNULL(fdJumlah1, 0)) AS totalTagihan,
             SUM(CASE WHEN fdListType = 1 THEN 1 ELSE 0 END) AS billUdara,
             SUM(CASE WHEN fdListType = 1 THEN ISNULL(fdJumlah1, 0) ELSE 0 END) AS tagihanUdara,
             SUM(CASE WHEN fdListType = 2 THEN 1 ELSE 0 END) AS billLaut,
             SUM(CASE WHEN fdListType = 2 THEN ISNULL(fdJumlah1, 0) ELSE 0 END) AS tagihanLaut
      FROM tbBilling WITH (NOLOCK)
      WHERE fdInvDate >= ${monthlyStart} AND fdInvDate <= ${monthlyEnd}
      GROUP BY YEAR(fdInvDate), MONTH(fdInvDate)
    `,
  ])

  const dailyMap = new Map(
    dailyRows.map((r) => [
      new Date(r.day).toISOString().slice(0, 10),
      {
        totalBill: Number(r.totalBill),
        totalTagihan: Number(r.totalTagihan ?? 0),
        billUdara: Number(r.billUdara ?? 0),
        tagihanUdara: Number(r.tagihanUdara ?? 0),
        billLaut: Number(r.billLaut ?? 0),
        tagihanLaut: Number(r.tagihanLaut ?? 0),
      },
    ])
  )

  const monthlyMap = new Map(
    monthlyRows.map((r) => [
      `${r.yr}-${r.mo}`,
      {
        totalBill: Number(r.totalBill),
        totalTagihan: Number(r.totalTagihan ?? 0),
        billUdara: Number(r.billUdara ?? 0),
        tagihanUdara: Number(r.tagihanUdara ?? 0),
        billLaut: Number(r.billLaut ?? 0),
        tagihanLaut: Number(r.tagihanLaut ?? 0),
      },
    ])
  )

  const daily = days.map((d) => {
    const agg = dailyMap.get(d.date)
    return {
      date: d.date,
      label: d.label,
      totalBill: agg?.totalBill || 0,
      totalTagihan: agg?.totalTagihan || 0,
      billUdara: agg?.billUdara || 0,
      tagihanUdara: agg?.tagihanUdara || 0,
      billLaut: agg?.billLaut || 0,
      tagihanLaut: agg?.tagihanLaut || 0,
    }
  })

  const monthly = months.map((m) => {
    const yr = m.start.getFullYear()
    const mo = m.start.getMonth() + 1
    const key = `${yr}-${mo}`
    const prevKey = `${yr - 1}-${mo}`

    const agg = monthlyMap.get(key)
    const prevAgg = monthlyMap.get(prevKey)

    const totalBill = agg?.totalBill || 0
    const prevTotalBill = prevAgg?.totalBill || 0
    const totalTagihan = agg?.totalTagihan || 0
    const prevTotalTagihan = prevAgg?.totalTagihan || 0

    const billUdara = agg?.billUdara || 0
    const prevBillUdara = prevAgg?.billUdara || 0
    const tagihanUdara = agg?.tagihanUdara || 0
    const prevTagihanUdara = prevAgg?.tagihanUdara || 0

    const billLaut = agg?.billLaut || 0
    const prevBillLaut = prevAgg?.billLaut || 0
    const tagihanLaut = agg?.tagihanLaut || 0
    const prevTagihanLaut = prevAgg?.tagihanLaut || 0

    const totalBillYoYPct = prevTotalBill > 0
      ? Number((((totalBill - prevTotalBill) / prevTotalBill) * 100).toFixed(1))
      : (totalBill > 0 ? 100 : 0)

    const totalTagihanYoYPct = prevTotalTagihan > 0
      ? Number((((totalTagihan - prevTotalTagihan) / prevTotalTagihan) * 100).toFixed(1))
      : (totalTagihan > 0 ? 100 : 0)

    const billUdaraYoYPct = prevBillUdara > 0
      ? Number((((billUdara - prevBillUdara) / prevBillUdara) * 100).toFixed(1))
      : (billUdara > 0 ? 100 : 0)

    const tagihanUdaraYoYPct = prevTagihanUdara > 0
      ? Number((((tagihanUdara - prevTagihanUdara) / prevTagihanUdara) * 100).toFixed(1))
      : (tagihanUdara > 0 ? 100 : 0)

    const billLautYoYPct = prevBillLaut > 0
      ? Number((((billLaut - prevBillLaut) / prevBillLaut) * 100).toFixed(1))
      : (billLaut > 0 ? 100 : 0)

    const tagihanLautYoYPct = prevTagihanLaut > 0
      ? Number((((tagihanLaut - prevTagihanLaut) / prevTagihanLaut) * 100).toFixed(1))
      : (tagihanLaut > 0 ? 100 : 0)

    const prevDate = new Date(yr - 1, mo - 1, 1)
    const prevYearLabel = prevDate.toLocaleString('id-ID', { month: 'short', year: 'numeric' })

    return {
      label: m.label,
      prevYearLabel,
      totalBill,
      prevTotalBill,
      totalTagihan,
      prevTotalTagihan,
      billUdara,
      prevBillUdara,
      tagihanUdara,
      prevTagihanUdara,
      billLaut,
      prevBillLaut,
      tagihanLaut,
      prevTagihanLaut,
      totalBillYoYPct,
      totalTagihanYoYPct,
      billUdaraYoYPct,
      tagihanUdaraYoYPct,
      billLautYoYPct,
      tagihanLautYoYPct,
    }
  })

  return { daily, monthly }
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

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
  const targetYear = query.year && !isNaN(Number(query.year)) ? Number(query.year) : now.getFullYear()
  const targetMonth = query.month && !isNaN(Number(query.month)) ? Math.min(12, Math.max(1, Number(query.month))) : now.getMonth() + 1

  // 1. Current Period (Bulan Berjalan / Target)
  const currYear = targetYear
  const currMonth = targetMonth
  const startOfCurr = new Date(currYear, currMonth - 1, 1)
  const endOfCurr = new Date(currYear, currMonth, 1)

  // 2. Previous Month (Bulan Sebelumnya / MoM)
  const prevYear = currMonth === 1 ? currYear - 1 : currYear
  const prevMonth = currMonth === 1 ? 12 : currMonth - 1
  const startOfPrev = new Date(prevYear, prevMonth - 1, 1)
  const endOfPrev = new Date(prevYear, prevMonth, 1)

  // 3. Same Month Last Year (Bulan yang Sama Tahun Lalu / YoY)
  const lastYear = currYear - 1
  const lastYearMonth = currMonth
  const startOfLastYear = new Date(lastYear, lastYearMonth - 1, 1)
  const endOfLastYear = new Date(lastYear, lastYearMonth, 1)

  const BRANCH_NAME_MAP: Record<string, string> = {
    GZ: 'Guangzhou',
    SG: 'Singapore',
    HK: 'Hong Kong',
    YW: 'Yiwu',
    SH: 'Shanghai',
    SZ: 'Shenzhen',
    LM: 'Legal Mandiri',
    LG: 'Legal',
    EX: 'Export',
    IM: 'Import Lain-lain',
    KR: 'South Korea',
    TH: 'Thailand',
    BT: 'Batam',
    MY: 'Malaysia',
    TW: 'Taiwan',
    XM: 'Xiamen',
    DG: 'Dongguan',
    CP: 'Cost of Part',
    IN: 'Indonesia',
    LAIN: 'Lainnya',
  }

  const BRANCH_PRIORITY: Record<string, number> = {
    GZ: 1,
    SG: 2,
    HK: 3,
    YW: 4,
    SH: 5,
    SZ: 6,
    LM: 7,
    LG: 8,
    EX: 9,
    KR: 10,
    TH: 11,
  }

  const fetchPeriodMetrics = async (start: Date, end: Date, yr: number, mo: number) => {
    try {
      const [summaryRows, branchRows] = await Promise.all([
        prisma.$queryRaw<any[]>`
          SELECT 
            COUNT(*) AS totalBill,
            SUM(ISNULL(fdJumlah1, 0)) AS totalTagihan,
            SUM(CASE WHEN fdListType = 1 THEN 1 ELSE 0 END) AS billUdara,
            SUM(CASE WHEN fdListType = 1 THEN ISNULL(fdJumlah1, 0) ELSE 0 END) AS tagihanUdara,
            SUM(CASE WHEN fdListType = 2 THEN 1 ELSE 0 END) AS billLaut,
            SUM(CASE WHEN fdListType = 2 THEN ISNULL(fdJumlah1, 0) ELSE 0 END) AS tagihanLaut,
            COUNT(DISTINCT fdCustCode) AS uniqueCust
          FROM tbBilling WITH (NOLOCK)
          WHERE fdInvDate >= ${start} AND fdInvDate < ${end}
        `,
        prisma.$queryRaw<any[]>`
          SELECT 
            CASE 
              WHEN RTRIM(fdBranchCode) IN ('--', 'SG', '-') THEN 'SG'
              WHEN RTRIM(fdBranchCode) IS NULL OR RTRIM(fdBranchCode) = '' THEN 
                CASE 
                  WHEN fdInvNo LIKE '--S%' OR fdInvNo LIKE '--A%' OR fdInvNo LIKE 'SGS%' OR fdInvNo LIKE 'SGA%' OR fdInvNo LIKE 'SG-%' THEN 'SG'
                  WHEN fdInvNo LIKE 'GZS%' OR fdInvNo LIKE 'GZA%' OR fdInvNo LIKE 'GZ-%' THEN 'GZ'
                  WHEN fdInvNo LIKE 'HKS%' OR fdInvNo LIKE 'HKA%' OR fdInvNo LIKE 'HK-%' THEN 'HK'
                  WHEN fdInvNo LIKE 'YWS%' OR fdInvNo LIKE 'YWA%' OR fdInvNo LIKE 'YW-%' THEN 'YW'
                  WHEN fdInvNo LIKE 'SHS%' OR fdInvNo LIKE 'SHA%' OR fdInvNo LIKE 'SH-%' THEN 'SH'
                  WHEN fdInvNo LIKE 'SZS%' OR fdInvNo LIKE 'SZA%' OR fdInvNo LIKE 'SZ-%' THEN 'SZ'
                  WHEN fdInvNo LIKE 'KRS%' OR fdInvNo LIKE 'KRA%' OR fdInvNo LIKE 'KR-%' THEN 'KR'
                  WHEN fdInvNo LIKE 'BKS%' OR fdInvNo LIKE 'BKA%' OR fdInvNo LIKE 'THS%' OR fdInvNo LIKE 'THA%' THEN 'TH'
                  ELSE 'LAIN'
                END
              ELSE RTRIM(fdBranchCode)
            END AS branchCode,
            COUNT(*) AS totalBill,
            SUM(ISNULL(fdJumlah1, 0)) AS totalTagihan,
            SUM(CASE WHEN fdListType = 1 THEN 1 ELSE 0 END) AS billUdara,
            SUM(CASE WHEN fdListType = 1 THEN ISNULL(fdJumlah1, 0) ELSE 0 END) AS tagihanUdara,
            SUM(CASE WHEN fdListType = 2 THEN 1 ELSE 0 END) AS billLaut,
            SUM(CASE WHEN fdListType = 2 THEN ISNULL(fdJumlah1, 0) ELSE 0 END) AS tagihanLaut,
            COUNT(DISTINCT fdCustCode) AS uniqueCust
          FROM tbBilling WITH (NOLOCK)
          WHERE fdInvDate >= ${start} AND fdInvDate < ${end}
          GROUP BY 
            CASE 
              WHEN RTRIM(fdBranchCode) IN ('--', 'SG', '-') THEN 'SG'
              WHEN RTRIM(fdBranchCode) IS NULL OR RTRIM(fdBranchCode) = '' THEN 
                CASE 
                  WHEN fdInvNo LIKE '--S%' OR fdInvNo LIKE '--A%' OR fdInvNo LIKE 'SGS%' OR fdInvNo LIKE 'SGA%' OR fdInvNo LIKE 'SG-%' THEN 'SG'
                  WHEN fdInvNo LIKE 'GZS%' OR fdInvNo LIKE 'GZA%' OR fdInvNo LIKE 'GZ-%' THEN 'GZ'
                  WHEN fdInvNo LIKE 'HKS%' OR fdInvNo LIKE 'HKA%' OR fdInvNo LIKE 'HK-%' THEN 'HK'
                  WHEN fdInvNo LIKE 'YWS%' OR fdInvNo LIKE 'YWA%' OR fdInvNo LIKE 'YW-%' THEN 'YW'
                  WHEN fdInvNo LIKE 'SHS%' OR fdInvNo LIKE 'SHA%' OR fdInvNo LIKE 'SH-%' THEN 'SH'
                  WHEN fdInvNo LIKE 'SZS%' OR fdInvNo LIKE 'SZA%' OR fdInvNo LIKE 'SZ-%' THEN 'SZ'
                  WHEN fdInvNo LIKE 'KRS%' OR fdInvNo LIKE 'KRA%' OR fdInvNo LIKE 'KR-%' THEN 'KR'
                  WHEN fdInvNo LIKE 'BKS%' OR fdInvNo LIKE 'BKA%' OR fdInvNo LIKE 'THS%' OR fdInvNo LIKE 'THA%' THEN 'TH'
                  ELSE 'LAIN'
                END
              ELSE RTRIM(fdBranchCode)
            END
          ORDER BY totalTagihan DESC
        `,
      ])

      const r = summaryRows[0] || {}
      const totalInvoices = Number(r.totalBill || 0)
      const totalTagihan = Number(Number(r.totalTagihan || 0).toFixed(2))

      const branches = (branchRows || []).map((br: any) => {
        const code = String(br.branchCode || 'LAIN').trim().toUpperCase()
        const bTagihan = Number(Number(br.totalTagihan || 0).toFixed(2))
        const bInvoices = Number(br.totalBill || 0)
        return {
          branchCode: code,
          branchName: BRANCH_NAME_MAP[code] || code,
          totalInvoices: bInvoices,
          totalTagihan: bTagihan,
          invoicesUdara: Number(br.billUdara || 0),
          tagihanUdara: Number(Number(br.tagihanUdara || 0).toFixed(2)),
          invoicesLaut: Number(br.billLaut || 0),
          tagihanLaut: Number(Number(br.tagihanLaut || 0).toFixed(2)),
          avgInvoiceValue: bInvoices > 0 ? Math.round(bTagihan / bInvoices) : 0,
          uniqueCustomers: Number(br.uniqueCust || 0),
          shareOfTotal: totalTagihan > 0 ? Number(((bTagihan / totalTagihan) * 100).toFixed(1)) : 0,
        }
      })

      return {
        year: yr,
        month: mo,
        monthName: `${MONTH_NAMES[mo - 1]} ${yr}`,
        totalInvoices,
        totalTagihan,
        invoicesUdara: Number(r.billUdara || 0),
        tagihanUdara: Number(Number(r.tagihanUdara || 0).toFixed(2)),
        invoicesLaut: Number(r.billLaut || 0),
        tagihanLaut: Number(Number(r.tagihanLaut || 0).toFixed(2)),
        avgInvoiceValue: totalInvoices > 0 ? Math.round(totalTagihan / totalInvoices) : 0,
        uniqueCustomers: Number(r.uniqueCust || 0),
        branches,
      }
    } catch {
      return {
        year: yr,
        month: mo,
        monthName: `${MONTH_NAMES[mo - 1]} ${yr}`,
        totalInvoices: 0,
        totalTagihan: 0,
        invoicesUdara: 0,
        tagihanUdara: 0,
        invoicesLaut: 0,
        tagihanLaut: 0,
        avgInvoiceValue: 0,
        uniqueCustomers: 0,
        branches: [],
      }
    }
  }

  const [
    totalInvoices,
    totalTagihanAgg,
    currentMetrics,
    prevMetrics,
    lastYearMetrics,
  ] = await Promise.all([
    prisma.tbBilling.count({ where }),
    prisma.tbBilling.aggregate({
      where,
      _sum: { fdJumlah1: true }
    }),
    fetchPeriodMetrics(startOfCurr, endOfCurr, currYear, currMonth),
    fetchPeriodMetrics(startOfPrev, endOfPrev, prevYear, prevMonth),
    fetchPeriodMetrics(startOfLastYear, endOfLastYear, lastYear, lastYearMonth),
  ])

  const calcComp = (curr: number, prev: number, lastYr: number) => {
    const momDiff = Number((curr - prev).toFixed(2))
    const momPercent = prev > 0 ? Number((((curr - prev) / prev) * 100).toFixed(1)) : 0
    const yoyDiff = Number((curr - lastYr).toFixed(2))
    const yoyPercent = lastYr > 0 ? Number((((curr - lastYr) / lastYr) * 100).toFixed(1)) : 0
    return {
      current: curr,
      prev,
      momDiff,
      momPercent,
      lastYear: lastYr,
      yoyDiff,
      yoyPercent,
    }
  }

  // Komparasi per Cabang (MoM & YoY)
  const currBranchMap = new Map((currentMetrics.branches || []).map((b) => [b.branchCode, b]))
  const prevBranchMap = new Map((prevMetrics.branches || []).map((b) => [b.branchCode, b]))
  const lastYearBranchMap = new Map((lastYearMetrics.branches || []).map((b) => [b.branchCode, b]))

  const allBranchCodes = Array.from(new Set([
    ...currBranchMap.keys(),
    ...prevBranchMap.keys(),
    ...lastYearBranchMap.keys(),
  ]))

  const byBranch = allBranchCodes.map((code) => {
    const curr = currBranchMap.get(code) || {
      branchCode: code,
      branchName: BRANCH_NAME_MAP[code] || code,
      totalInvoices: 0,
      totalTagihan: 0,
      invoicesUdara: 0,
      tagihanUdara: 0,
      invoicesLaut: 0,
      tagihanLaut: 0,
      avgInvoiceValue: 0,
      uniqueCustomers: 0,
      shareOfTotal: 0,
    }
    const prev = prevBranchMap.get(code)
    const lastYear = lastYearBranchMap.get(code)

    const momTagihanDiff = Number((curr.totalTagihan - (prev?.totalTagihan || 0)).toFixed(2))
    const momTagihanPercent = (prev?.totalTagihan || 0) > 0
      ? Number((((curr.totalTagihan - prev!.totalTagihan) / prev!.totalTagihan) * 100).toFixed(1))
      : (curr.totalTagihan > 0 ? 100 : 0)

    const yoyTagihanDiff = Number((curr.totalTagihan - (lastYear?.totalTagihan || 0)).toFixed(2))
    const yoyTagihanPercent = (lastYear?.totalTagihan || 0) > 0
      ? Number((((curr.totalTagihan - lastYear!.totalTagihan) / lastYear!.totalTagihan) * 100).toFixed(1))
      : (curr.totalTagihan > 0 ? 100 : 0)

    const momInvoicesDiff = curr.totalInvoices - (prev?.totalInvoices || 0)
    const momInvoicesPercent = (prev?.totalInvoices || 0) > 0
      ? Number((((curr.totalInvoices - prev!.totalInvoices) / prev!.totalInvoices) * 100).toFixed(1))
      : (curr.totalInvoices > 0 ? 100 : 0)

    const yoyInvoicesDiff = curr.totalInvoices - (lastYear?.totalInvoices || 0)
    const yoyInvoicesPercent = (lastYear?.totalInvoices || 0) > 0
      ? Number((((curr.totalInvoices - lastYear!.totalInvoices) / lastYear!.totalInvoices) * 100).toFixed(1))
      : (curr.totalInvoices > 0 ? 100 : 0)

    const shareOfTotal = currentMetrics.totalTagihan > 0
      ? Number(((curr.totalTagihan / currentMetrics.totalTagihan) * 100).toFixed(1))
      : 0

    return {
      branchCode: code,
      branchName: BRANCH_NAME_MAP[code] || code,
      current: curr,
      prev,
      lastYear,
      momTagihanDiff,
      momTagihanPercent,
      yoyTagihanDiff,
      yoyTagihanPercent,
      momInvoicesDiff,
      momInvoicesPercent,
      yoyInvoicesDiff,
      yoyInvoicesPercent,
      shareOfTotal,
    }
  })

  // Urutkan cabang berdasarkan prioritas utama & omzet tagihan
  byBranch.sort((a, b) => {
    const pA = BRANCH_PRIORITY[a.branchCode] || 99
    const pB = BRANCH_PRIORITY[b.branchCode] || 99
    if (pA !== pB) return pA - pB
    return b.current.totalTagihan - a.current.totalTagihan
  })

  const comparisons = {
    totalInvoices: calcComp(currentMetrics.totalInvoices, prevMetrics.totalInvoices, lastYearMetrics.totalInvoices),
    totalTagihan: calcComp(currentMetrics.totalTagihan, prevMetrics.totalTagihan, lastYearMetrics.totalTagihan),
    invoicesUdara: calcComp(currentMetrics.invoicesUdara, prevMetrics.invoicesUdara, lastYearMetrics.invoicesUdara),
    tagihanUdara: calcComp(currentMetrics.tagihanUdara, prevMetrics.tagihanUdara, lastYearMetrics.tagihanUdara),
    invoicesLaut: calcComp(currentMetrics.invoicesLaut, prevMetrics.invoicesLaut, lastYearMetrics.invoicesLaut),
    tagihanLaut: calcComp(currentMetrics.tagihanLaut, prevMetrics.tagihanLaut, lastYearMetrics.tagihanLaut),
    avgInvoiceValue: calcComp(currentMetrics.avgInvoiceValue, prevMetrics.avgInvoiceValue, lastYearMetrics.avgInvoiceValue),
    uniqueCustomers: calcComp(currentMetrics.uniqueCustomers, prevMetrics.uniqueCustomers, lastYearMetrics.uniqueCustomers),
    byBranch,
  }

  const invoicesBulanIni = currentMetrics.totalInvoices
  const tagihanBulanIni = currentMetrics.totalTagihan
  const invoicesBulanLalu = prevMetrics.totalInvoices
  const tagihanBulanLalu = prevMetrics.totalTagihan

  // Fetch Target Bill Hari Ini dari stored procedures (Udara = 1, Laut = 2) & Surat Jalan yang sudah terkirim (fdSent = 1) belum di-bill & Unissued Bills
  const [uData, lData, sentDeliveryRows, entryListRows, unissuedRows] = await Promise.all([
    prisma.$queryRaw<any[]>`exec get_data_billing_gsheet 1`,
    prisma.$queryRaw<any[]>`exec get_data_billing_gsheet 2`,
    prisma.$queryRaw<any[]>`
      SELECT DISTINCT RTRIM(d.fdListCode) AS fdListCode
      FROM tbDelivery d WITH (NOLOCK)
      INNER JOIN tbEntryList el WITH (NOLOCK) ON d.fdListCode = el.fdListCode
      WHERE d.fdSent = 1
        AND el.fdBillCreated = 0
        AND el.fdFinish = 0
        AND YEAR(d.fdSjDate) >= 2024
        AND d.fdListCode NOT IN (
          SELECT RTRIM(fdListCode) FROM tbBilling WITH (NOLOCK) 
          WHERE fdListCode IS NOT NULL AND RTRIM(fdListCode) <> ''
        )
    `,
    prisma.$queryRaw<any[]>`
      SELECT 
        RTRIM(el.fdListCode) AS fdListCode,
        RTRIM(el.fdMarkingCode) AS markingCode,
        RTRIM(el.fdMarkingNo) AS markingNo
      FROM tbEntryList el WITH (NOLOCK)
      INNER JOIN tbMarking m WITH (NOLOCK) ON el.fdMarkingCode = m.fdMarkingCode
      WHERE el.fdBillCreated = 0 
        AND el.fdFinish = 0 
        AND el.fdListCode <> ''
        AND YEAR(m.fdExitDate) > 2020
    `,
    prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) AS totalCount,
        ISNULL(SUM(CAST(b.fdJumlah1 AS float)), 0) AS totalNominal,
        SUM(CASE WHEN ISNULL(b.fdListType, 1) = 1 THEN 1 ELSE 0 END) AS countUdara,
        ISNULL(SUM(CASE WHEN ISNULL(b.fdListType, 1) = 1 THEN CAST(b.fdJumlah1 AS float) ELSE 0 END), 0) AS nominalUdara,
        SUM(CASE WHEN ISNULL(b.fdListType, 1) <> 1 THEN 1 ELSE 0 END) AS countLaut,
        ISNULL(SUM(CASE WHEN ISNULL(b.fdListType, 1) <> 1 THEN CAST(b.fdJumlah1 AS float) ELSE 0 END), 0) AS nominalLaut,
        SUM(CASE WHEN DATEDIFF(day, b.fdInvDate, GETDATE()) <= 7 THEN 1 ELSE 0 END) AS countLe7,
        ISNULL(SUM(CASE WHEN DATEDIFF(day, b.fdInvDate, GETDATE()) <= 7 THEN CAST(b.fdJumlah1 AS float) ELSE 0 END), 0) AS nominalLe7,
        SUM(CASE WHEN DATEDIFF(day, b.fdInvDate, GETDATE()) BETWEEN 8 AND 14 THEN 1 ELSE 0 END) AS count8to14,
        ISNULL(SUM(CASE WHEN DATEDIFF(day, b.fdInvDate, GETDATE()) BETWEEN 8 AND 14 THEN CAST(b.fdJumlah1 AS float) ELSE 0 END), 0) AS nominal8to14,
        SUM(CASE WHEN DATEDIFF(day, b.fdInvDate, GETDATE()) BETWEEN 15 AND 30 THEN 1 ELSE 0 END) AS count15to30,
        ISNULL(SUM(CASE WHEN DATEDIFF(day, b.fdInvDate, GETDATE()) BETWEEN 15 AND 30 THEN CAST(b.fdJumlah1 AS float) ELSE 0 END), 0) AS nominal15to30,
        SUM(CASE WHEN DATEDIFF(day, b.fdInvDate, GETDATE()) > 30 THEN 1 ELSE 0 END) AS countGt30,
        ISNULL(SUM(CASE WHEN DATEDIFF(day, b.fdInvDate, GETDATE()) > 30 THEN CAST(b.fdJumlah1 AS float) ELSE 0 END), 0) AS nominalGt30
      FROM tbBilling b WITH (NOLOCK)
      LEFT JOIN tbBillingTotal bt WITH (NOLOCK) ON b.fdInvNo = bt.fdInvNo
      WHERE ISNULL(bt.fdJumlah, 0) > 0 
        AND ISNULL(b.fdJumlah1, 0) > 0 
        AND ISNULL(b.fdGive, 0) <> 1
        AND YEAR(b.fdInvDate) > 2024
    `,
  ])

  const sentListCodeSet = new Set(sentDeliveryRows.map((r) => r.fdListCode?.trim()).filter(Boolean))
  const entryMap = new Map<string, string>()
  for (const e of entryListRows) {
    const k = `${e.markingCode}|||${e.markingNo}`
    entryMap.set(k, e.fdListCode)
  }

  const isTarget = (r: any) => {
    const cust = String(r.Customer || '').toUpperCase().trim()
    if (cust.includes('MR.X') || cust.includes('MR X') || cust === 'NO NAME' || cust === 'NONAME') return false

    const statusKirim = String(r.StatusKirim || '').toUpperCase().trim()
    const mCode = String(r.Marking_code || '').trim()
    const mNo = String(r.Marking_no || '').trim()
    const listCode = entryMap.get(`${mCode}|||${mNo}`)
    const isSent = statusKirim.includes('TERKIRIM') || statusKirim.includes('TERIMA SJ') || (listCode ? sentListCodeSet.has(listCode) : false)

    const typeStr = String(r.Type || '').toUpperCase().trim()
    const comodityStr = String(r.Comodity || '').toUpperCase().trim()
    const isFcl = typeStr.includes('FCL') || comodityStr.includes('FCL')

    // Kargo FCL dan kargo dengan Surat Jalan terkirim harus muncul tanpa melihat status gudang
    if (!isFcl && !isSent) {
      if (statusKirim.includes('BELUM DITERIMA GDG')) return false
    }

    const st = String(r.Status || '').toUpperCase().trim()
    const isCodOrUrgent = st.includes('COD') || st.includes('URGENT')
    const isAgingGt7 = Number(r.hari || 0) > 7

    return isCodOrUrgent || isAgingGt7 || isFcl || isSent
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
  let uCodUrgent = 0
  let uSjSent = 0
  let uAgingGt7 = 0
  let uFcl = 0
  for (const r of uTarget) {
    const m = r.Marking_code?.trim() || ''
    const pic = picMap.get(m) || 'kiki'
    if (pic === 'yati') yatiTarget++
    else kikiTarget++

    const st = String(r.Status || '').toUpperCase().trim()
    const isCodOrUrgent = st.includes('COD') || st.includes('URGENT')
    const statusKirim = String(r.StatusKirim || '').toUpperCase().trim()
    const mNo = String(r.Marking_no || '').trim()
    const listCode = entryMap.get(`${m}|||${mNo}`)
    const isSent = statusKirim.includes('TERKIRIM') || statusKirim.includes('TERIMA SJ') || (listCode ? sentListCodeSet.has(listCode) : false)
    const isAging = Number(r.hari || 0) > 7
    const typeStr = String(r.Type || '').toUpperCase().trim()
    const comodityStr = String(r.Comodity || '').toUpperCase().trim()
    const isFcl = typeStr.includes('FCL') || comodityStr.includes('FCL')

    if (isSent) uSjSent++
    if (isCodOrUrgent) uCodUrgent++
    if (isAging) uAgingGt7++
    if (isFcl) uFcl++
  }

  let tharaTarget = 0
  let ferlyTarget = 0
  let ricoTarget = 0
  let lCodUrgent = 0
  let lSjSent = 0
  let lAgingGt7 = 0
  let lFcl = 0
  for (const r of lTarget) {
    const branch = String(r.Branch || '').toUpperCase().trim()
    const typeStr = String(r.Type || '').toUpperCase().trim()
    const comodityStr = String(r.Comodity || '').toUpperCase().trim()
    const isFcl = typeStr.includes('FCL') || comodityStr.includes('FCL')
    if (typeStr.includes('FCL') || typeStr.includes('KONTAINER')) {
      ferlyTarget++
    } else if (branch === 'GUANGZHOU') {
      tharaTarget++
    } else {
      ricoTarget++
    }

    const st = String(r.Status || '').toUpperCase().trim()
    const isCodOrUrgent = st.includes('COD') || st.includes('URGENT')
    const statusKirim = String(r.StatusKirim || '').toUpperCase().trim()
    const mCode = String(r.Marking_code || '').trim()
    const mNo = String(r.Marking_no || '').trim()
    const listCode = entryMap.get(`${mCode}|||${mNo}`)
    const isSent = statusKirim.includes('TERKIRIM') || statusKirim.includes('TERIMA SJ') || (listCode ? sentListCodeSet.has(listCode) : false)
    const isAging = Number(r.hari || 0) > 7

    if (isSent) lSjSent++
    if (isCodOrUrgent) lCodUrgent++
    if (isAging) lAgingGt7++
    if (isFcl) lFcl++
  }

  return {
    totalInvoices,
    totalTagihan: totalTagihanAgg._sum.fdJumlah1 || 0,
    invoicesBulanIni,
    invoicesBulanIniBreakdown: {
      udara: currentMetrics.invoicesUdara,
      laut: currentMetrics.invoicesLaut,
    },
    tagihanBulanIni,
    tagihanBulanIniBreakdown: {
      udara: currentMetrics.tagihanUdara,
      laut: currentMetrics.tagihanLaut,
    },
    currentMonth: currentMetrics,
    prevMonth: prevMetrics,
    lastYearSameMonth: lastYearMetrics,
    comparisons,
    targetBillUdara: {
      total: uTarget.length,
      breakdown: { kiki: kikiTarget, yati: yatiTarget },
      categories: {
        sjSent: uSjSent,
        codUrgent: uCodUrgent,
        agingGt7: uAgingGt7,
        fcl: uFcl,
      },
    },
    targetBillLaut: {
      total: lTarget.length,
      breakdown: { thara: tharaTarget, rico: ricoTarget, ferly: ferlyTarget },
      categories: {
        sjSent: lSjSent,
        codUrgent: lCodUrgent,
        agingGt7: lAgingGt7,
        fcl: lFcl,
      },
    },
    unissuedBills: (() => {
      const uRow = unissuedRows[0] || {}
      return {
        totalCount: Number(uRow.totalCount || 0),
        totalNominal: Number(Number(uRow.totalNominal || 0).toFixed(2)),
        countUdara: Number(uRow.countUdara || 0),
        nominalUdara: Number(Number(uRow.nominalUdara || 0).toFixed(2)),
        countLaut: Number(uRow.countLaut || 0),
        nominalLaut: Number(Number(uRow.nominalLaut || 0).toFixed(2)),
        aging: {
          le7: { count: Number(uRow.countLe7 || 0), nominal: Number(Number(uRow.nominalLe7 || 0).toFixed(2)) },
          d8to14: { count: Number(uRow.count8to14 || 0), nominal: Number(Number(uRow.nominal8to14 || 0).toFixed(2)) },
          d15to30: { count: Number(uRow.count15to30 || 0), nominal: Number(Number(uRow.nominal15to30 || 0).toFixed(2)) },
          gt30: { count: Number(uRow.countGt30 || 0), nominal: Number(Number(uRow.nominalGt30 || 0).toFixed(2)) },
        },
      }
    })(),
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

  const fetchItemsForType = async (mode: 'udara' | 'laut') => {
    const spNum = mode === 'laut' ? 2 : 1
    const [rawRows, sentDeliveryRows, entryListRows] = await Promise.all([
      prisma.$queryRaw<any[]>`exec get_data_billing_and_data_m3 ${spNum}`,
      prisma.$queryRaw<any[]>`
        SELECT DISTINCT RTRIM(d.fdListCode) AS fdListCode
        FROM tbDelivery d WITH (NOLOCK)
        INNER JOIN tbEntryList el WITH (NOLOCK) ON d.fdListCode = el.fdListCode
        WHERE d.fdSent = 1
          AND el.fdBillCreated = 0
          AND el.fdFinish = 0
          AND d.fdListType = ${spNum}
          AND YEAR(d.fdSjDate) >= 2024
          AND d.fdListCode NOT IN (
            SELECT RTRIM(fdListCode) FROM tbBilling WITH (NOLOCK) 
            WHERE fdListCode IS NOT NULL AND RTRIM(fdListCode) <> ''
          )
      `,
      prisma.$queryRaw<any[]>`
        SELECT 
          RTRIM(el.fdListCode) AS fdListCode,
          RTRIM(el.fdMarkingCode) AS markingCode,
          RTRIM(el.fdMarkingNo) AS markingNo,
          RTRIM(el.fdCustCode) AS custCode
        FROM tbEntryList el WITH (NOLOCK)
        INNER JOIN tbMarking m WITH (NOLOCK) ON el.fdMarkingCode = m.fdMarkingCode
        WHERE el.fdBillCreated = 0 
          AND el.fdFinish = 0 
          AND el.fdListType = ${spNum}
          AND el.fdListCode <> ''
          AND YEAR(m.fdExitDate) > 2020
      `,
    ])

    const sentListCodeSet = new Set(sentDeliveryRows.map((r) => r.fdListCode?.trim()).filter(Boolean))
    const entryItemMap = new Map<string, { listCode: string; custCode: string }>()
    for (const e of entryListRows) {
      const k = `${e.markingCode}|||${e.markingNo}`
      entryItemMap.set(k, { listCode: e.fdListCode, custCode: e.custCode })
    }

    const isTarget = (r: any) => {
      const cust = String(r.Customer || '').toUpperCase().trim()
      if (cust.includes('MR.X') || cust.includes('MR X') || cust === 'NO NAME' || cust === 'NONAME') return false

      const statusKirim = String(r.StatusKirim || '').toUpperCase().trim()
      const mCode = String(r.Marking_code || '').trim()
      const mNo = String(r.Marking_no || '').trim()
      const listCode = entryItemMap.get(`${mCode}|||${mNo}`)?.listCode
      const isSent = statusKirim.includes('TERKIRIM') || statusKirim.includes('TERIMA SJ') || (listCode ? sentListCodeSet.has(listCode) : false)

      const typeStr = String(r.Type || '').toUpperCase().trim()
      const comodityStr = String(r.Comodity || '').toUpperCase().trim()
      const isFcl = typeStr.includes('FCL') || comodityStr.includes('FCL')

      // Kargo FCL dan kargo dengan Surat Jalan terkirim harus muncul tanpa melihat status gudang
      if (!isFcl && !isSent) {
        if (statusKirim.includes('BELUM DITERIMA GDG')) return false
      }

      const st = String(r.Status || '').toUpperCase().trim()
      const isCodOrUrgent = st.includes('COD') || st.includes('URGENT')
      const isAgingGt7 = Number(r.hari || 0) > 7

      return isCodOrUrgent || isAgingGt7 || isFcl || isSent
    }

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
    const distinctCustCodes = Array.from(
      new Set(
        filtered.map((r) => {
          const mCode = String(r.Marking_code ?? r.markingCode ?? '').trim()
          const mNo = String(r.Marking_no ?? r.markingNo ?? '').trim()
          const itemCust = entryItemMap.get(`${mCode}|||${mNo}`)?.custCode
          return (itemCust || String(r.custCode ?? r.CustCode ?? r.fdCustCode ?? '')).trim()
        }).filter(Boolean)
      )
    )

    const custCodeToMasterMap = new Map<string, { fdCustCode: string; fdCustName: string | null; fdBillTo?: string | null }>()
    const custNameToMasterMap = new Map<string, { fdCustCode: string; fdCustName: string | null; fdBillTo?: string | null }>()
    const custNameToCodeMap = new Map<string, string>()

    if (distinctCustomers.length > 0 || distinctCustCodes.length > 0) {
      try {
        const custRows = await prisma.tbCustomers.findMany({
          where: {
            OR: [
              ...(distinctCustomers.length > 0 ? [{ fdCustName: { in: distinctCustomers } }] : []),
              ...(distinctCustCodes.length > 0 ? [{ fdCustCode: { in: distinctCustCodes } }] : []),
            ],
          },
          select: { fdCustCode: true, fdCustName: true, fdBillTo: true },
        })
        for (const c of custRows) {
          if (c.fdCustCode) {
            const trimmedCode = c.fdCustCode.trim()
            custCodeToMasterMap.set(trimmedCode, c)
            if (c.fdCustName) {
              const trimmedName = c.fdCustName.trim().toUpperCase()
              custNameToMasterMap.set(trimmedName, c)
              custNameToCodeMap.set(trimmedName, trimmedCode)
            }
          }
        }
      } catch (err) {
        logger.error('Error querying tbCustomers in getBillingTargetDetails:', err)
      }
    }

    const markingConsigneeMap = new Map<string, string>()
    if (distinctMarkings.length > 0) {
      try {
        const markingRows = await prisma.tbMarking.findMany({
          where: { fdMarkingCode: { in: distinctMarkings } },
          select: { fdMarkingCode: true, fdConsignee: true },
        })
        for (const m of markingRows) {
          if (m.fdMarkingCode) {
            markingConsigneeMap.set(m.fdMarkingCode.trim(), (m.fdConsignee || '').trim())
          }
        }
      } catch (err) {
        logger.error('Error querying markingConsigneeMap in getBillingTargetDetails:', err)
      }
    }

    const batchPriceInput = filtered.map((r) => {
      const rawCustName = String(r.Customer ?? r.customer ?? '').trim()
      const mCode = (r.Marking_code ?? r.markingCode ?? '').trim()
      const mNo = String(r.Marking_no ?? r.markingNo ?? '').trim()
      const itemCustCode = entryItemMap.get(`${mCode}|||${mNo}`)?.custCode || ''
      const rowCustCode = String(r.custCode ?? r.CustCode ?? r.fdCustCode ?? '').trim()
      const resolvedCustCode =
        (itemCustCode ? custCodeToMasterMap.get(itemCustCode)?.fdCustCode?.trim() : undefined) ||
        (rowCustCode ? custCodeToMasterMap.get(rowCustCode)?.fdCustCode?.trim() : undefined) ||
        custNameToCodeMap.get(rawCustName.toUpperCase()) ||
        itemCustCode ||
        rowCustCode

      const masterCust =
        (resolvedCustCode ? custCodeToMasterMap.get(resolvedCustCode) : undefined) ||
        custNameToMasterMap.get(rawCustName.toUpperCase())

      return {
        markingCode: mCode,
        markingNo: mNo,
        customer: masterCust?.fdCustName?.trim() || rawCustName,
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
      const markingNo = String(r.Marking_no ?? r.markingNo ?? '').trim()
      const rawCustName = String(r.Customer ?? r.customer ?? '').trim()
      const itemCustCode = entryItemMap.get(`${marking}|||${markingNo}`)?.custCode || ''
      const rowCustCode = String(r.custCode ?? r.CustCode ?? r.fdCustCode ?? '').trim()

      const masterByCode =
        (itemCustCode ? custCodeToMasterMap.get(itemCustCode) : undefined) ||
        (rowCustCode ? custCodeToMasterMap.get(rowCustCode) : undefined)
      const masterByName = custNameToMasterMap.get(rawCustName.toUpperCase())
      const masterCust = masterByCode || masterByName

      // Single Source of Truth: tbCustomers.fdCustName
      const officialCustName = masterCust?.fdCustName?.trim() || rawCustName
      const resolvedCustCode =
        masterCust?.fdCustCode?.trim() ||
        itemCustCode ||
        rowCustCode ||
        custNameToCodeMap.get(rawCustName.toUpperCase()) ||
        ''
      const officialBillTo = masterCust?.fdBillTo?.trim() || ''
      const consignee = markingConsigneeMap.get(marking) || ''

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
      const custCode = resolvedCustCode || ''

      const pRes = priceCheckMap.get(String(idx)) || priceCheckMap.get(marking)
      const hargaDb = pRes?.dbPrice || 0
      const priceStatus = pRes?.status || 'NO_RATE'
      const diffAmount = pRes?.difference || 0
      const priceSourceType = pRes?.priceSource || 'NONE'
      const matchedTier = pRes?.appliedTierLabel || 'Level 4: Tarif Umum'
      const isBroker = pRes?.isBroker ?? false
      const currentHarga = Number(r.Harga ?? r.harga ?? 0)
      const rowListCode = entryItemMap.get(`${marking}|||${markingNo}`)?.listCode || ''
      const statusKirim = (r.StatusKirim ?? r.statusKirim ?? '').trim()
      const isSent = statusKirim.toUpperCase().includes('TERKIRIM') || statusKirim.toUpperCase().includes('TERIMA SJ') || (rowListCode ? sentListCodeSet.has(rowListCode) : false)

      return {
        ...r,
        hari: Number(r.hari || 0),
        pic,
        listCode: rowListCode,
        customer: officialCustName,
        custCode,
        billTo: officialBillTo,
        consignee,
        branch: (r.Branch ?? r.branch ?? '').trim(),
        sales: (r.Sales ?? r.sales ?? '').trim(),
        markingCode: marking,
        markingNo: markingNo,
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
        statusKirim,
        isSjSent: Boolean(isSent),
        harga: currentHarga,
        updateBy: (r.UpdateBy ?? r.updateBy ?? '').trim(),
        updateDate: r.UpdateDate ? new Date(r.UpdateDate).toISOString() : null,
        mode,
        isPartial,
        countTerima,
        loadDate,
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

  if (query.search?.trim()) {
    const s = query.search.trim().toLowerCase()
    const qTokens = s.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ').split(/\s+/).filter(Boolean)
    finalItems = finalItems.filter((it) => {
      const pool = [
        it.customer,
        it.custCode,
        it.billTo,
        it.consignee,
        it.markingCode,
        it.markingNo,
        it.listCode,
        it.branch,
        it.sales,
        it.comodity,
        it.type,
        it.pic,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')

      return qTokens.every((token) => pool.includes(token))
    })
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
  const sjRows = await prisma.$queryRaw<{ day: Date; pic: string; total: number; totalListCodes: number }[]>`
    SELECT
      t.day,
      t.pic,
      CASE
        WHEN t.pic = 'ferly' THEN COUNT(DISTINCT t.markingCode)
        ELSE COUNT(*)
      END AS total,
      COUNT(DISTINCT t.listCode) AS totalListCodes
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
        d.fdListCode AS listCode,
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
  const billRows = await prisma.$queryRaw<{ day: Date; pic: string; total: number; totalListCodes: number }[]>`
    SELECT
      t.day,
      t.pic,
      CASE
        WHEN t.pic = 'ferly' THEN COUNT(DISTINCT t.markingCode)
        ELSE COUNT(*)
      END AS total,
      COUNT(DISTINCT t.listCode) AS totalListCodes
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
        b.fdListCode AS listCode,
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
  const sjListMap = new Map<string, number>()
  for (const row of sjRows) {
    if (!row.pic) continue
    const key = `${new Date(row.day).toISOString().slice(0, 10)}|${row.pic}`
    sjMap.set(key, Number(row.total))
    sjListMap.set(key, Number(row.totalListCodes || row.total))
  }

  const billMap = new Map<string, number>()
  const billListMap = new Map<string, number>()
  for (const row of billRows) {
    if (!row.pic) continue
    const key = `${new Date(row.day).toISOString().slice(0, 10)}|${row.pic}`
    billMap.set(key, Number(row.total))
    billListMap.set(key, Number(row.totalListCodes || row.total))
  }

  // Query 3: Belum Bill (berdasarkan fdKembali, tapi b.fdInvNo IS NULL)
  const unbilledRows = await prisma.$queryRaw<{ day: Date; pic: string; total: number; totalListCodes: number }[]>`
    SELECT
      t.day,
      t.pic,
      CASE
        WHEN t.pic = 'ferly' THEN COUNT(DISTINCT t.markingCode)
        ELSE COUNT(*)
      END AS total,
      COUNT(DISTINCT t.listCode) AS totalListCodes
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
        d.fdListCode AS listCode,
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
  const unbilledListMap = new Map<string, number>()
  for (const row of unbilledRows) {
    if (!row.pic) continue
    const key = `${new Date(row.day).toISOString().slice(0, 10)}|${row.pic}`
    unbilledMap.set(key, Number(row.total))
    unbilledListMap.set(key, Number(row.totalListCodes || row.total))
  }

  return days.map((d) => {
    const point: Record<string, string | number> = { date: d.date, label: d.label }
    for (const pic of PIC_KEYS) {
      point[`sj_${pic}`] = sjMap.get(`${d.date}|${pic}`) || 0
      point[`sj_list_${pic}`] = sjListMap.get(`${d.date}|${pic}`) || 0
      point[`bill_${pic}`] = billMap.get(`${d.date}|${pic}`) || 0
      point[`bill_list_${pic}`] = billListMap.get(`${d.date}|${pic}`) || 0
      point[`unbilled_${pic}`] = unbilledMap.get(`${d.date}|${pic}`) || 0
      point[`unbilled_list_${pic}`] = unbilledListMap.get(`${d.date}|${pic}`) || 0
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
        t.fdListType,
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
          ISNULL(el.fdListType, d.fdListType) AS fdListType,
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
      listType: Number(r.fdListType) === 1 ? 'Udara' : 'Laut',
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

/**
 * Mengambil daftar dan agregasi rincian unissued bills (fdJumlah > 0 AND fdJumlah1 > 0 AND fdGive <> 1) lengkap dengan aging
 */
export async function getUnissuedBillsDetails(query?: Record<string, string | undefined>) {
  const search = query?.search?.trim() || ''
  const mode = query?.mode?.trim().toLowerCase() || 'all' // 'all' | '1' | '2' | 'udara' | 'laut'
  const aging = query?.aging?.trim().toLowerCase() || 'all' // 'all' | 'le7' | '8to14' | '15to30' | 'gt30'
  const startDate = query?.startDate?.trim() || ''
  const endDate = query?.endDate?.trim() || ''

  const rows = await prisma.$queryRaw<any[]>`
    SELECT
      RTRIM(b.fdInvNo) AS invNo,
      b.fdInvDate AS invDate,
      RTRIM(b.fdCustCode) AS custCode,
      ISNULL(RTRIM(c.fdCustName), RTRIM(b.fdCustCode)) AS custName,
      ISNULL(b.fdListType, 1) AS listType,
      RTRIM(b.fdMarkingCode) AS markingCode,
      RTRIM(b.fdMarkingNo) AS markingNo,
      ISNULL(b.fdJumlah1, 0) AS jumlah1,
      ISNULL(bt.fdJumlah, 0) AS jumlahTotal,
      RTRIM(b.fdEmpCode) AS empCode,
      ISNULL(RTRIM(e.fdEmpName), RTRIM(b.fdEmpCode)) AS empName,
      RTRIM(b.fdBranchCode) AS branchCode,
      DATEDIFF(day, b.fdInvDate, GETDATE()) AS agingDays
    FROM tbBilling b WITH (NOLOCK)
    LEFT JOIN tbBillingTotal bt WITH (NOLOCK) ON b.fdInvNo = bt.fdInvNo
    LEFT JOIN tbCustomers c WITH (NOLOCK) ON b.fdCustCode = c.fdCustCode
    LEFT JOIN tbEmployees e WITH (NOLOCK) ON b.fdEmpCode = e.fdEmpCode
    WHERE ISNULL(bt.fdJumlah, 0) > 0 
      AND ISNULL(b.fdJumlah1, 0) > 0 
      AND ISNULL(b.fdGive, 0) <> 1
      AND YEAR(b.fdInvDate) > 2024
    ORDER BY b.fdInvDate ASC, b.fdInvNo ASC
  `

  const mapped = rows.map((r) => {
    const agingDays = Number(r.agingDays || 0)
    let agingGroup: 'le7' | '8to14' | '15to30' | 'gt30' = 'le7'
    if (agingDays <= 7) agingGroup = 'le7'
    else if (agingDays <= 14) agingGroup = '8to14'
    else if (agingDays <= 30) agingGroup = '15to30'
    else agingGroup = 'gt30'

    const listType = Number(r.listType || 1)
    const modeName: 'udara' | 'laut' = listType === 1 ? 'udara' : 'laut'

    return {
      invNo: String(r.invNo || ''),
      invDate: r.invDate ? new Date(r.invDate).toISOString() : null,
      custCode: String(r.custCode || ''),
      custName: String(r.custName || ''),
      listType,
      mode: modeName,
      markingCode: String(r.markingCode || ''),
      markingNo: String(r.markingNo || ''),
      jumlah1: Number(Number(r.jumlah1 || 0).toFixed(2)),
      jumlahTotal: Number(Number(r.jumlahTotal || 0).toFixed(2)),
      empCode: String(r.empCode || ''),
      empName: String(r.empName || ''),
      branchCode: String(r.branchCode || ''),
      agingDays,
      agingGroup,
    }
  })

  const summary = {
    totalCount: mapped.length,
    totalNominal: Number(mapped.reduce((acc, it) => acc + it.jumlah1, 0).toFixed(2)),
    countUdara: mapped.filter((it) => it.mode === 'udara').length,
    nominalUdara: Number(mapped.filter((it) => it.mode === 'udara').reduce((acc, it) => acc + it.jumlah1, 0).toFixed(2)),
    countLaut: mapped.filter((it) => it.mode === 'laut').length,
    nominalLaut: Number(mapped.filter((it) => it.mode === 'laut').reduce((acc, it) => acc + it.jumlah1, 0).toFixed(2)),
    aging: {
      le7: {
        count: mapped.filter((it) => it.agingGroup === 'le7').length,
        nominal: Number(mapped.filter((it) => it.agingGroup === 'le7').reduce((acc, it) => acc + it.jumlah1, 0).toFixed(2)),
      },
      d8to14: {
        count: mapped.filter((it) => it.agingGroup === '8to14').length,
        nominal: Number(mapped.filter((it) => it.agingGroup === '8to14').reduce((acc, it) => acc + it.jumlah1, 0).toFixed(2)),
      },
      d15to30: {
        count: mapped.filter((it) => it.agingGroup === '15to30').length,
        nominal: Number(mapped.filter((it) => it.agingGroup === '15to30').reduce((acc, it) => acc + it.jumlah1, 0).toFixed(2)),
      },
      gt30: {
        count: mapped.filter((it) => it.agingGroup === 'gt30').length,
        nominal: Number(mapped.filter((it) => it.agingGroup === 'gt30').reduce((acc, it) => acc + it.jumlah1, 0).toFixed(2)),
      },
    },
  }

  let filtered = mapped
  if (search) {
    const s = search.toLowerCase()
    filtered = filtered.filter(
      (it) =>
        it.invNo.toLowerCase().includes(s) ||
        it.custCode.toLowerCase().includes(s) ||
        it.custName.toLowerCase().includes(s) ||
        it.markingCode.toLowerCase().includes(s) ||
        it.markingNo.toLowerCase().includes(s) ||
        it.empName.toLowerCase().includes(s)
    )
  }

  if (mode !== 'all') {
    if (mode === 'udara' || mode === '1') {
      filtered = filtered.filter((it) => it.mode === 'udara')
    } else if (mode === 'laut' || mode === '2') {
      filtered = filtered.filter((it) => it.mode === 'laut')
    }
  }

  if (aging !== 'all') {
    if (aging === 'le7' || aging === '<=7') {
      filtered = filtered.filter((it) => it.agingGroup === 'le7')
    } else if (aging === '8to14' || aging === '8-14') {
      filtered = filtered.filter((it) => it.agingGroup === '8to14')
    } else if (aging === '15to30' || aging === '15-30') {
      filtered = filtered.filter((it) => it.agingGroup === '15to30')
    } else if (aging === 'gt30' || aging === '>30') {
      filtered = filtered.filter((it) => it.agingGroup === 'gt30')
    }
  }

  if (startDate) {
    const start = new Date(startDate).getTime()
    filtered = filtered.filter((it) => it.invDate && new Date(it.invDate).getTime() >= start)
  }
  if (endDate) {
    const end = new Date(endDate).getTime()
    filtered = filtered.filter((it) => it.invDate && new Date(it.invDate).getTime() <= end)
  }

  return {
    summary,
    filteredCount: filtered.length,
    filteredNominal: Number(filtered.reduce((acc, it) => acc + it.jumlah1, 0).toFixed(2)),
    items: filtered,
  }
}

