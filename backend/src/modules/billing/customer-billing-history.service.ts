import { prisma } from '../../config/database'
import { Prisma } from '@prisma/client'

export interface CustomerBillingHistoryItem {
  fdInvNo: string
  fdInvDate: Date | string
  fdCustCode: string
  fdBranchCode: string | null
  fdBranchName: string | null
  fdMarkingCode: string | null
  fdMarkingNo: string | null
  fdListCode: string | null
  fdListType: number | null
  fdTglAgent: Date | string | null
  fdTerima: string | null
  fdTypeComodity: number | null
  fdTypeComodityName: string | null
  fdConsignee: string | null
  hasPrevDiff: boolean
  prevDiffCount: number
  prevItemCount: number
  moda: 'Udara' | 'Laut' | 'Unknown'
  fdDescr: string
  commodities: string[]
  fdJumlah1: number
  fdJumlah2: number
  fdCurr1: string | null
  totalAmount: number
  fdEmpCode: string | null
  empName: string | null
  isIssued: boolean
  paymentStatus: 'LUNAS' | 'PARTIAL' | 'OVERDUE' | 'UNPAID' | 'ISSUED' | 'DRAFT'
  ageDays: number
  isOverdue: boolean
  totalBayar: number
  sisaBayar: number
  fdGive: number | null
  fdGive2: number | null
  fdGiveDate: Date | string | null
  fdCekDate: Date | string | null
  fdCekBy: string | null
  detailsCount: number
  details?: Array<{
    fdID: string
    fdItemName: string | null
    fdQty: number | null
    fdItemPrice: number | null
    fdTotal: number | null
    fdCurr: string | null
    fdListCode: string | null
    fdComodity?: string | null
  }>
  totals: Array<{
    fdID: string
    fdCCYCode: string | null
    fdJumlah: number | null
    fdBayar: number | null
    fdSLunas: number | null
  }>
}

export interface CustomerBillingHistoryResponse {
  customer: {
    fdCustCode: string
    fdCustName: string | null
    fdSalesNM: string | null
    fdBroker: number | null
  } | null
  summary: {
    totalInvoices: number
    totalAmountIdr: number
    totalAirInvoices: number
    totalSeaInvoices: number
    issuedCount: number
    draftCount: number
    lunasCount: number
    partialCount: number
    overdueCount: number
    unpaidCount: number
    issuedRecentCount: number
    latestInvoiceDate: Date | string | null
    earliestInvoiceDate: Date | string | null
    yearsAvailable: number[]
  }
  items: CustomerBillingHistoryItem[]
}

let cachedEmpMap: Map<string, string> | null = null
let cachedEmpTime = 0
const EMP_CACHE_TTL = 10 * 60 * 1000 // 10 minutes

async function getEmployeesMap(): Promise<Map<string, string>> {
  const now = Date.now()
  if (cachedEmpMap && now - cachedEmpTime < EMP_CACHE_TTL) {
    return cachedEmpMap
  }
  const emps = await prisma.tbEmployees.findMany({
    select: { fdEmpCode: true, fdEmpName: true },
  })
  const map = new Map<string, string>()
  for (const emp of emps) {
    if (emp.fdEmpCode) {
      map.set(emp.fdEmpCode.trim().toUpperCase(), emp.fdEmpName.trim())
    }
  }
  cachedEmpMap = map
  cachedEmpTime = now
  return map
}

let cachedBranchMap: Map<string, string> | null = null
let cachedBranchTime = 0
const BRANCH_CACHE_TTL = 10 * 60 * 1000 // 10 minutes

async function getBranchesMap(): Promise<Map<string, string>> {
  const now = Date.now()
  if (cachedBranchMap && now - cachedBranchTime < BRANCH_CACHE_TTL) {
    return cachedBranchMap
  }
  const branches = await prisma.tbCabang.findMany({
    select: { fdBranchCode: true, fdBranchName: true },
  })
  const map = new Map<string, string>()
  for (const br of branches) {
    if (br.fdBranchCode) {
      map.set(br.fdBranchCode.trim().toUpperCase(), (br.fdBranchName || '').trim())
    }
  }
  cachedBranchMap = map
  cachedBranchTime = now
  return map
}

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

let indexesChecked = false
async function ensureBillingIndexes() {
  if (indexesChecked) return
  try {
    await prisma.$executeRawUnsafe(`
      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tbBilling_CustCode_InvDate' AND object_id = OBJECT_ID('tbBilling'))
      BEGIN
        CREATE NONCLUSTERED INDEX IX_tbBilling_CustCode_InvDate ON tbBilling (fdCustCode, fdInvDate DESC)
      END
    `)
    await prisma.$executeRawUnsafe(`
      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tbBillingTotal_InvNo' AND object_id = OBJECT_ID('tbBillingTotal'))
      BEGIN
        CREATE NONCLUSTERED INDEX IX_tbBillingTotal_InvNo ON tbBillingTotal (fdInvNo) INCLUDE (fdJumlah, fdBayar, fdSLunas)
      END
    `)
    await prisma.$executeRawUnsafe(`
      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tbBillingDetail_InvNo' AND object_id = OBJECT_ID('tbBillingDetail'))
      BEGIN
        CREATE NONCLUSTERED INDEX IX_tbBillingDetail_InvNo ON tbBillingDetail (fdInvNo) INCLUDE (fdItemName)
      END
    `)
    await prisma.$executeRawUnsafe(`
      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tbBillingDetailPrev_InvNo' AND object_id = OBJECT_ID('tbBillingDetailPrev'))
      BEGIN
        CREATE NONCLUSTERED INDEX IX_tbBillingDetailPrev_InvNo ON tbBillingDetailPrev (fdInvNo) INCLUDE (fdID, fdItemName, fdQty, fdItemPrice, fdTotal, fdCurr)
      END
    `)
    indexesChecked = true
  } catch (err) {
    // Non-fatal if user doesn't have DDL permissions
  }
}

export async function getCustomerBillingHistory(
  custCode: string,
  options?: {
    search?: string
    year?: number | string
    branch?: string
    typeComodity?: number | string
    diffStatus?: 'all' | 'diff' | 'same'
    moda?: 'air' | 'sea' | 'all'
    status?: 'issued' | 'draft' | 'lunas' | 'partial' | 'overdue' | 'unpaid' | 'all'
    limit?: number
  }
): Promise<CustomerBillingHistoryResponse> {
  const cleanCustCode = custCode.trim()
  if (!cleanCustCode) {
    return {
      customer: null,
      summary: {
        totalInvoices: 0,
        totalAmountIdr: 0,
        totalAirInvoices: 0,
        totalSeaInvoices: 0,
        issuedCount: 0,
        draftCount: 0,
        lunasCount: 0,
        partialCount: 0,
        overdueCount: 0,
        unpaidCount: 0,
        issuedRecentCount: 0,
        latestInvoiceDate: null,
        earliestInvoiceDate: null,
        yearsAvailable: [],
      },
      items: [],
    }
  }

  await ensureBillingIndexes()

  // Build WHERE conditions
  const conditions: string[] = [`(b.fdCustCode = '${cleanCustCode.replace(/'/g, "''")}' OR RTRIM(b.fdCustCode) = '${cleanCustCode.replace(/'/g, "''")}')`]

  if (options?.year && options.year !== 'all') {
    const y = typeof options.year === 'number' ? options.year : parseInt(options.year, 10)
    if (!isNaN(y) && y > 2000) {
      conditions.push(`b.fdInvDate >= '${y}-01-01 00:00:00' AND b.fdInvDate <= '${y}-12-31 23:59:59'`)
    }
  }

  if (options?.branch && options.branch !== 'all') {
    const br = options.branch.trim().replace(/'/g, "''")
    conditions.push(`(
      b.fdBranchCode = '${br}' OR RTRIM(b.fdBranchCode) = '${br}' OR m.fdBranchCode = '${br}'
      OR ('${br}' = 'SG' AND (b.fdInvNo LIKE '--S%' OR b.fdInvNo LIKE '--A%' OR b.fdInvNo LIKE 'SGS%' OR b.fdInvNo LIKE 'SGA%'))
      OR ('${br}' = 'GZ' AND (b.fdInvNo LIKE 'GZS%' OR b.fdInvNo LIKE 'GZA%'))
      OR ('${br}' = 'YW' AND (b.fdInvNo LIKE 'YWS%' OR b.fdInvNo LIKE 'YWA%'))
      OR ('${br}' = 'SH' AND (b.fdInvNo LIKE 'SHS%' OR b.fdInvNo LIKE 'SHA%'))
      OR ('${br}' = 'SZ' AND (b.fdInvNo LIKE 'SZS%' OR b.fdInvNo LIKE 'SZA%'))
      OR ('${br}' = 'HK' AND (b.fdInvNo LIKE 'HKS%' OR b.fdInvNo LIKE 'HKA%'))
      OR ('${br}' = 'KR' AND (b.fdInvNo LIKE 'KRS%' OR b.fdInvNo LIKE 'KRA%'))
      OR ('${br}' = 'BK' AND (b.fdInvNo LIKE 'BKS%' OR b.fdInvNo LIKE 'THS%'))
    )`)
  }

  if (options?.typeComodity !== undefined && options.typeComodity !== 'all') {
    const tcVal = Number(options.typeComodity)
    if (!isNaN(tcVal)) {
      conditions.push(`(el.fdTypeComodity = ${tcVal} OR EXISTS (SELECT 1 FROM tbBillingDetail dtc WHERE dtc.fdInvNo = b.fdInvNo AND dtc.fdTypeComodity = ${tcVal}))`)
    }
  }

  if (options?.moda === 'air') {
    conditions.push(`b.fdListType = 1`)
  } else if (options?.moda === 'sea') {
    conditions.push(`b.fdListType = 2`)
  }

  if (options?.search?.trim()) {
    const s = options.search.trim().replace(/'/g, "''")
    conditions.push(`(
      b.fdInvNo LIKE '%${s}%' OR
      b.fdMarkingCode LIKE '%${s}%' OR
      b.fdMarkingNo LIKE '%${s}%' OR
      b.fdListCode LIKE '%${s}%' OR
      b.fdDescr LIKE '%${s}%' OR
      b.fdBranchCode LIKE '%${s}%' OR
      tc.fdComodityName LIKE '%${s}%' OR
      m.fdConsignee LIKE '%${s}%' OR
      EXISTS (
        SELECT 1 FROM tbBillingDetail d WITH (NOLOCK)
        WHERE d.fdInvNo = b.fdInvNo AND (d.fdItemName LIKE '%${s}%' OR d.fdComodity LIKE '%${s}%')
      )
    )`)
  }

  const whereClause = conditions.join(' AND ')
  const limit = Math.min(options?.limit || 500, 1000)

  const querySql = `
    SELECT TOP (${limit})
      b.fdInvNo,
      b.fdInvDate,
      b.fdCustCode,
      CASE 
        WHEN NULLIF(RTRIM(b.fdBranchCode), '') IS NOT NULL AND RTRIM(b.fdBranchCode) NOT IN ('--', '-') THEN RTRIM(b.fdBranchCode)
        WHEN NULLIF(RTRIM(m.fdBranchCode), '') IS NOT NULL AND RTRIM(m.fdBranchCode) NOT IN ('--', '-') THEN RTRIM(m.fdBranchCode)
        WHEN b.fdInvNo LIKE '--S%' OR b.fdInvNo LIKE '--A%' OR b.fdInvNo LIKE 'SGS%' OR b.fdInvNo LIKE 'SGA%' THEN 'SG'
        WHEN b.fdInvNo LIKE 'GZS%' OR b.fdInvNo LIKE 'GZA%' THEN 'GZ'
        WHEN b.fdInvNo LIKE 'YWS%' OR b.fdInvNo LIKE 'YWA%' THEN 'YW'
        WHEN b.fdInvNo LIKE 'SHS%' OR b.fdInvNo LIKE 'SHA%' THEN 'SH'
        WHEN b.fdInvNo LIKE 'SZS%' OR b.fdInvNo LIKE 'SZA%' THEN 'SZ'
        WHEN b.fdInvNo LIKE 'HKS%' OR b.fdInvNo LIKE 'HKA%' THEN 'HK'
        WHEN b.fdInvNo LIKE 'KRS%' OR b.fdInvNo LIKE 'KRA%' THEN 'KR'
        WHEN b.fdInvNo LIKE 'BKS%' OR b.fdInvNo LIKE 'THS%' THEN 'BK'
        ELSE RTRIM(b.fdBranchCode)
      END AS fdBranchCode,
      RTRIM(cb.fdBranchName) AS fdBranchName,
      b.fdMarkingCode,
      b.fdMarkingNo,
      b.fdListCode,
      b.fdListType,
      b.fdDescr,
      b.fdJumlah1,
      b.fdJumlah2,
      b.fdCurr1,
      b.fdEmpCode,
      b.fdGive,
      b.fdGive2,
      b.fdGiveDate,
      b.fdCekDate,
      b.fdCekBy,
      b.fdEmp2Code,
      el.fdTglAgent,
      RTRIM(el.fdTerima) AS fdTerima,
      COALESCE(el.fdTypeComodity, first_tc.fdTypeComodity) AS fdTypeComodity,
      COALESCE(
        tc.fdComodityName,
        first_tc.detailTypeComodityName,
        NULLIF(RTRIM(first_tc.fdComodity), '')
      ) AS fdTypeComodityName,
      m.fdConsignee,
      ISNULL(tot.totalJumlah, b.fdJumlah1) AS totalJumlah,
      ISNULL(tot.totalBayar, 0) AS totalBayar,
      ISNULL(tot.totalSLunas, 0) AS totalSLunas,
      ISNULL(prev_chk.prevDiffCount, 0) AS prevDiffCount,
      ISNULL(prev_chk.prevItemCount, 0) AS prevItemCount,
      d_comm.commodityNames
    FROM tbBilling b WITH (NOLOCK)
    LEFT JOIN tbCabang cb WITH (NOLOCK) ON cb.fdBranchCode = b.fdBranchCode
    LEFT JOIN tbEntryList el WITH (NOLOCK) ON b.fdListCode = el.fdListCode
    LEFT JOIN tbTypeComodity tc WITH (NOLOCK) 
      ON el.fdTypeComodity = tc.fdTypeComodity 
     AND (el.fdListType = tc.fdListType OR tc.fdListType IS NULL)
    LEFT JOIN tbMarking m WITH (NOLOCK) ON b.fdMarkingCode = m.fdMarkingCode
    OUTER APPLY (
      SELECT TOP 1 
        d_tc.fdTypeComodity,
        tc_d.fdComodityName AS detailTypeComodityName,
        d_tc.fdComodity
      FROM tbBillingDetail d_tc WITH (NOLOCK)
      LEFT JOIN tbTypeComodity tc_d WITH (NOLOCK) 
        ON d_tc.fdTypeComodity = tc_d.fdTypeComodity
       AND (b.fdListType = tc_d.fdListType OR tc_d.fdListType IS NULL)
      WHERE d_tc.fdInvNo = b.fdInvNo 
        AND (tc_d.fdComodityName IS NOT NULL OR (d_tc.fdComodity IS NOT NULL AND RTRIM(d_tc.fdComodity) <> ''))
      ORDER BY CASE WHEN tc_d.fdComodityName IS NOT NULL THEN 0 ELSE 1 END
    ) first_tc
    OUTER APPLY (
      SELECT 
        SUM(t.fdJumlah) AS totalJumlah,
        SUM(t.fdBayar) AS totalBayar,
        MAX(t.fdSLunas) AS totalSLunas
      FROM tbBillingTotal t WITH (NOLOCK)
      WHERE t.fdInvNo = b.fdInvNo
    ) tot
    OUTER APPLY (
      SELECT 
        COUNT(CASE 
          WHEN prev.fdID IS NULL THEN 1
          WHEN d.fdID IS NULL THEN 1
          WHEN (
            ISNULL(d.fdQty, 0) <> ISNULL(prev.fdQty, 0)
            OR ISNULL(d.fdItemPrice, 0) <> ISNULL(prev.fdItemPrice, 0)
            OR ISNULL(d.fdTotal, 0) <> ISNULL(prev.fdTotal, 0)
            OR RTRIM(ISNULL(d.fdItemName, '')) <> RTRIM(ISNULL(prev.fdItemName, ''))
            OR RTRIM(ISNULL(d.fdCurr, '')) <> RTRIM(ISNULL(prev.fdCurr, ''))
          ) THEN 1
        END) AS prevDiffCount,
        COUNT(prev.fdID) AS prevItemCount
      FROM (SELECT * FROM tbBillingDetail WITH (NOLOCK) WHERE fdInvNo = b.fdInvNo) d
      FULL OUTER JOIN (SELECT * FROM tbBillingDetailPrev WITH (NOLOCK) WHERE fdInvNo = b.fdInvNo) prev
        ON d.fdID = prev.fdID
    ) prev_chk
    OUTER APPLY (
      SELECT STRING_AGG(RTRIM(d.fdItemName), ' | ') AS commodityNames
      FROM tbBillingDetail d WITH (NOLOCK)
      WHERE d.fdInvNo = b.fdInvNo
    ) d_comm
    WHERE ${whereClause}
    ORDER BY b.fdInvDate DESC
  `

  // Execute customer info, raw billings query, employees map, and branches map in parallel
  const [customer, rawBillings, empMap, branchMap] = await Promise.all([
    prisma.tbCustomers.findUnique({
      where: { fdCustCode: cleanCustCode },
      select: {
        fdCustCode: true,
        fdCustName: true,
        fdSalesNM: true,
        fdBroker: true,
      },
    }),
    prisma.$queryRawUnsafe<any[]>(querySql),
    getEmployeesMap(),
    getBranchesMap(),
  ])

  // Batch fetch details for all raw billings
  const invNos = rawBillings.map((b) => String(b.fdInvNo).trim()).filter(Boolean)
  const allDetailsMap = new Map<string, any[]>()
  if (invNos.length > 0) {
    const escapedInvList = invNos.map((inv) => `'${inv.replace(/'/g, "''")}'`).join(',')
    try {
      const rawDetails = await prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          COALESCE(d.fdInvNo, prev.fdInvNo) AS fdInvNo,
          COALESCE(d.fdID, prev.fdID) AS fdID,
          d.fdItemName,
          prev.fdItemName AS prevItemName,
          d.fdQty,
          prev.fdQty AS prevQty,
          d.fdItemPrice,
          prev.fdItemPrice AS prevItemPrice,
          d.fdTotal,
          prev.fdTotal AS prevTotal,
          d.fdCurr,
          prev.fdCurr AS prevCurr,
          d.fdListCode,
          prev.fdListCode AS prevListCode,
          d.fdComodity AS fdComodity,
          COALESCE(d.fdTypeComodity, prev.fdTypeComodity) AS fdTypeComodity,
          COALESCE(tc_d.fdComodityName, tc_prev.fdComodityName) AS typeComodityName,
          CASE 
            WHEN prev.fdID IS NULL THEN 'INSERT'
            WHEN d.fdID IS NULL THEN 'DELETE'
            WHEN (
              ISNULL(d.fdQty, 0) <> ISNULL(prev.fdQty, 0)
              OR ISNULL(d.fdItemPrice, 0) <> ISNULL(prev.fdItemPrice, 0)
              OR ISNULL(d.fdTotal, 0) <> ISNULL(prev.fdTotal, 0)
              OR RTRIM(ISNULL(d.fdItemName, '')) <> RTRIM(ISNULL(prev.fdItemName, ''))
              OR RTRIM(ISNULL(d.fdCurr, '')) <> RTRIM(ISNULL(prev.fdCurr, ''))
            ) THEN 'UPDATE'
            ELSE 'UNCHANGED'
          END AS changeStatus
        FROM tbBillingDetail d WITH (NOLOCK)
        FULL OUTER JOIN tbBillingDetailPrev prev WITH (NOLOCK) 
          ON d.fdInvNo = prev.fdInvNo AND d.fdID = prev.fdID
        LEFT JOIN tbTypeComodity tc_d WITH (NOLOCK)
          ON d.fdTypeComodity = tc_d.fdTypeComodity
        LEFT JOIN tbTypeComodity tc_prev WITH (NOLOCK)
          ON prev.fdTypeComodity = tc_prev.fdTypeComodity
        WHERE d.fdInvNo IN (${escapedInvList}) OR prev.fdInvNo IN (${escapedInvList})
        ORDER BY COALESCE(d.fdInvNo, prev.fdInvNo), COALESCE(d.fdID, prev.fdID) ASC
      `)

      for (const d of rawDetails) {
        const inv = String(d.fdInvNo || '').trim()
        if (!allDetailsMap.has(inv)) {
          allDetailsMap.set(inv, [])
        }
        const fdID = String(d.fdID || '').trim()
        const itemName = d.fdItemName ? String(d.fdItemName).trim() : null
        const prevItemName = d.prevItemName ? String(d.prevItemName).trim() : null
        const qty = d.fdQty !== null && d.fdQty !== undefined ? Number(d.fdQty) : null
        const prevQty = d.prevQty !== null && d.prevQty !== undefined ? Number(d.prevQty) : null
        const price = d.fdItemPrice !== null && d.fdItemPrice !== undefined ? Number(d.fdItemPrice) : null
        const prevPrice = d.prevItemPrice !== null && d.prevItemPrice !== undefined ? Number(d.prevItemPrice) : null
        const total = d.fdTotal !== null && d.fdTotal !== undefined ? Number(d.fdTotal) : null
        const prevTotal = d.prevTotal !== null && d.prevTotal !== undefined ? Number(d.prevTotal) : null
        const curr = d.fdCurr ? String(d.fdCurr).trim() : null
        const prevCurr = d.prevCurr ? String(d.prevCurr).trim() : null
        const listCode = d.fdListCode ? String(d.fdListCode).trim() : d.prevListCode ? String(d.prevListCode).trim() : null
        const comodity = d.fdComodity ? String(d.fdComodity).trim() : null
        const typeComodity = d.fdTypeComodity !== null && d.fdTypeComodity !== undefined ? Number(d.fdTypeComodity) : null
        const typeComodityName = d.typeComodityName ? String(d.typeComodityName).trim() : comodity || null
        const changeStatus: 'UNCHANGED' | 'UPDATE' | 'INSERT' | 'DELETE' = d.changeStatus || 'UNCHANGED'
        const hasAdjustment = changeStatus !== 'UNCHANGED'

        const diffs: Record<string, { old: any; new: any }> = {}
        if (prevItemName !== null && itemName !== null && prevItemName !== itemName) {
          diffs.itemName = { old: prevItemName, new: itemName }
        }
        if (prevQty !== null && qty !== null && prevQty !== qty) {
          diffs.qty = { old: prevQty, new: qty }
        }
        if (prevPrice !== null && price !== null && prevPrice !== price) {
          diffs.price = { old: prevPrice, new: price }
        }
        if (prevTotal !== null && total !== null && prevTotal !== total) {
          diffs.total = { old: prevTotal, new: total }
        }
        if (prevCurr !== null && curr !== null && prevCurr !== curr) {
          diffs.curr = { old: prevCurr, new: curr }
        }

        allDetailsMap.get(inv)!.push({
          fdID,
          fdItemName: itemName,
          prevItemName,
          fdQty: qty,
          prevQty,
          fdItemPrice: price,
          prevItemPrice: prevPrice,
          fdTotal: total,
          prevTotal,
          fdCurr: curr,
          prevCurr,
          fdListCode: listCode,
          fdComodity: comodity,
          fdTypeComodity: typeComodity,
          typeComodityName,
          changeStatus,
          hasAdjustment,
          diffs,
        })
      }
    } catch (err) {
      // Non-fatal if details query fails
    }
  }

  // Calculate summary stats
  let totalAmountIdr = 0
  let totalAir = 0
  let totalSea = 0
  let issuedCount = 0
  let draftCount = 0
  let lunasCount = 0
  let partialCount = 0
  let overdueCount = 0
  let unpaidCount = 0
  let issuedRecentCount = 0
  const yearSet = new Set<number>()
  const now = new Date()

  const items: CustomerBillingHistoryItem[] = rawBillings.map((b) => {
    const invDate = b.fdInvDate ? new Date(b.fdInvDate) : new Date()
    if (b.fdInvDate) {
      yearSet.add(invDate.getFullYear())
    }

    const moda: 'Udara' | 'Laut' | 'Unknown' =
      b.fdListType === 1 ? 'Udara' : b.fdListType === 2 ? 'Laut' : 'Unknown'

    if (moda === 'Udara') totalAir++
    else if (moda === 'Laut') totalSea++

    const isIssued = Number(b.fdGive) === 1

    if (isIssued) issuedCount++
    else draftCount++

    const sumJumlahTotals = Number(b.totalJumlah || b.fdJumlah1 || 0)
    const sumBayarTotals = Number(b.totalBayar || 0)
    totalAmountIdr += sumJumlahTotals

    const commoditiesList: string[] = []
    if (b.fdDescr) commoditiesList.push(String(b.fdDescr).trim())
    if (b.commodityNames) {
      const splitNames = String(b.commodityNames)
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean)
      commoditiesList.push(...splitNames)
    }
    const uniqueCommodities = Array.from(new Set(commoditiesList.filter(Boolean)))

    const invoiceDate = b.fdInvDate ? new Date(b.fdInvDate) : null
    const ageDays = invoiceDate
      ? Math.floor((now.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0
    const isOverdue = ageDays > 30

    const sisaBayar = Math.max(0, sumJumlahTotals - sumBayarTotals)

    // Status Hierarchy:
    // 1. DRAFT: fdGive = 0 (belum terbit / konsep invoice)
    // Jika fdGive = 1 (sudah terbit):
    // 2. LUNAS: fdJumlah - fdBayar = 0
    // 3. PARTIAL: fdBayar > 0
    // 4. JATUH TEMPO: fdBayar = 0 & ageDays > 30
    // 5. BARU TERBIT: fdBayar = 0 & ageDays < 7
    // 6. BELUM LUNAS: fdBayar = 0 & ageDays 7 - 30
    let paymentStatus: 'LUNAS' | 'PARTIAL' | 'OVERDUE' | 'UNPAID' | 'ISSUED' | 'DRAFT' = 'DRAFT'
    if (!isIssued) {
      paymentStatus = 'DRAFT'
    } else if (sumJumlahTotals > 0 && Math.abs(sumJumlahTotals - sumBayarTotals) <= 0.01) {
      paymentStatus = 'LUNAS'
      lunasCount++
    } else if (sumBayarTotals > 0) {
      paymentStatus = 'PARTIAL'
      partialCount++
    } else if (sumBayarTotals === 0 && isOverdue) {
      paymentStatus = 'OVERDUE'
      overdueCount++
    } else if (sumBayarTotals === 0 && ageDays < 7) {
      paymentStatus = 'ISSUED'
      issuedRecentCount++
    } else {
      paymentStatus = 'UNPAID'
      unpaidCount++
    }

    const cleanEmpCode = (b.fdEmpCode || '').trim()
    const resolvedEmpName =
      (cleanEmpCode ? empMap.get(cleanEmpCode.toUpperCase()) : null) ||
      cleanEmpCode ||
      null

    const cleanCekBy = (b.fdCekBy || '').trim()
    const cleanEmp2Code = (b.fdEmp2Code || '').trim()
    const resolvedCekName =
      (cleanCekBy ? empMap.get(cleanCekBy.toUpperCase()) : null) ||
      (cleanEmp2Code ? empMap.get(cleanEmp2Code.toUpperCase()) : null) ||
      cleanCekBy ||
      cleanEmp2Code ||
      null

    const prevDiffCount = Number(b.prevDiffCount || 0)
    const prevItemCount = Number(b.prevItemCount || 0)
    const hasPrevDiff = prevDiffCount > 0

    const cleanInvNo = String(b.fdInvNo || '').trim()
    const invoiceDetails = allDetailsMap.get(cleanInvNo) || []

    const resolvedBranchCode = resolveBranchCode(b.fdBranchCode, b.fdInvNo, b.fdMarkingCode)
    const resolvedBranchName =
      (b.fdBranchName ? String(b.fdBranchName).trim() : null) ||
      (resolvedBranchCode ? branchMap.get(resolvedBranchCode.toUpperCase()) : null) ||
      null

    return {
      fdInvNo: cleanInvNo,
      fdInvDate: b.fdInvDate,
      fdCustCode: (b.fdCustCode || cleanCustCode).trim(),
      fdBranchCode: resolvedBranchCode,
      fdBranchName: resolvedBranchName,
      fdMarkingCode: b.fdMarkingCode ? String(b.fdMarkingCode).trim() : null,
      fdMarkingNo: b.fdMarkingNo ? String(b.fdMarkingNo).trim() : null,
      fdListCode: b.fdListCode ? String(b.fdListCode).trim() : null,
      fdListType: b.fdListType !== null && b.fdListType !== undefined ? Number(b.fdListType) : null,
      fdTglAgent: b.fdTglAgent || null,
      fdTerima: b.fdTerima ? String(b.fdTerima).trim() : null,
      fdTypeComodity: b.fdTypeComodity !== null && b.fdTypeComodity !== undefined ? Number(b.fdTypeComodity) : null,
      fdTypeComodityName: b.fdTypeComodityName ? String(b.fdTypeComodityName).trim() : null,
      fdConsignee: b.fdConsignee ? String(b.fdConsignee).trim() : null,
      hasPrevDiff,
      prevDiffCount,
      prevItemCount,
      moda,
      fdDescr: String(b.fdDescr || '').trim(),
      commodities: uniqueCommodities,
      fdJumlah1: Number(b.fdJumlah1 || 0),
      fdJumlah2: Number(b.fdJumlah2 || 0),
      fdCurr1: b.fdCurr1 ? String(b.fdCurr1).trim() : 'IDR',
      totalAmount: sumJumlahTotals,
      fdEmpCode: cleanEmpCode || null,
      empName: resolvedEmpName,
      isIssued,
      paymentStatus,
      ageDays,
      isOverdue,
      totalBayar: sumBayarTotals,
      sisaBayar,
      fdGive: b.fdGive !== null && b.fdGive !== undefined ? Number(b.fdGive) : null,
      fdGive2: b.fdGive2 !== null && b.fdGive2 !== undefined ? Number(b.fdGive2) : null,
      fdGiveDate: b.fdGiveDate,
      fdCekDate: b.fdCekDate,
      fdCekBy: resolvedCekName,
      detailsCount: invoiceDetails.length,
      details: invoiceDetails,
      totals: [
        {
          fdID: '01',
          fdCCYCode: b.fdCurr1 ? String(b.fdCurr1).trim() : 'IDR',
          fdJumlah: sumJumlahTotals,
          fdBayar: sumBayarTotals,
          fdSLunas: b.totalSLunas !== null && b.totalSLunas !== undefined ? Number(b.totalSLunas) : null,
        }
      ],
    }
  })

  const yearsAvailable = Array.from(yearSet).sort((a, b) => b - a)

  let filteredItems = items
  if (
    options?.status === 'lunas' ||
    options?.status === 'partial' ||
    options?.status === 'overdue' ||
    options?.status === 'issued' ||
    options?.status === 'unpaid'
  ) {
    filteredItems = filteredItems.filter((it) => it.paymentStatus.toLowerCase() === options.status?.toLowerCase())
  } else if (options?.status === 'draft') {
    filteredItems = filteredItems.filter((it) => !it.isIssued)
  }

  if (options?.diffStatus === 'diff') {
    filteredItems = filteredItems.filter((it) => it.hasPrevDiff)
  } else if (options?.diffStatus === 'same') {
    filteredItems = filteredItems.filter((it) => !it.hasPrevDiff)
  }

  return {
    customer: customer
      ? {
          fdCustCode: customer.fdCustCode.trim(),
          fdCustName: customer.fdCustName ? customer.fdCustName.trim() : null,
          fdSalesNM: customer.fdSalesNM ? customer.fdSalesNM.trim() : null,
          fdBroker: customer.fdBroker,
        }
      : null,
    summary: {
      totalInvoices: items.length,
      totalAmountIdr,
      totalAirInvoices: totalAir,
      totalSeaInvoices: totalSea,
      issuedCount,
      draftCount,
      lunasCount,
      partialCount,
      overdueCount,
      unpaidCount,
      issuedRecentCount,
      latestInvoiceDate: items[0]?.fdInvDate || null,
      earliestInvoiceDate: items[items.length - 1]?.fdInvDate || null,
      yearsAvailable,
    },
    items: filteredItems,
  }
}

/**
 * Lazy loading endpoint for single invoice details with original comparison (tbBillingDetail vs tbBillingDetailPrev)
 */
export async function getInvoiceDetails(invNo: string) {
  const cleanInvNo = invNo.trim().replace(/'/g, "''")
  if (!cleanInvNo) return []

  const details = await prisma.$queryRawUnsafe<any[]>(`
    SELECT 
      COALESCE(d.fdID, prev.fdID) AS fdID,
      d.fdItemName,
      prev.fdItemName AS prevItemName,
      d.fdQty,
      prev.fdQty AS prevQty,
      d.fdItemPrice,
      prev.fdItemPrice AS prevItemPrice,
      d.fdTotal,
      prev.fdTotal AS prevTotal,
      d.fdCurr,
      prev.fdCurr AS prevCurr,
      d.fdListCode,
      prev.fdListCode AS prevListCode,
      d.fdComodity AS fdComodity,
      COALESCE(d.fdTypeComodity, prev.fdTypeComodity) AS fdTypeComodity,
      COALESCE(tc_d.fdComodityName, tc_prev.fdComodityName) AS typeComodityName,
      CASE 
        WHEN prev.fdID IS NULL THEN 'INSERT'
        WHEN d.fdID IS NULL THEN 'DELETE'
        WHEN (
          ISNULL(d.fdQty, 0) <> ISNULL(prev.fdQty, 0)
          OR ISNULL(d.fdItemPrice, 0) <> ISNULL(prev.fdItemPrice, 0)
          OR ISNULL(d.fdTotal, 0) <> ISNULL(prev.fdTotal, 0)
          OR RTRIM(ISNULL(d.fdItemName, '')) <> RTRIM(ISNULL(prev.fdItemName, ''))
          OR RTRIM(ISNULL(d.fdCurr, '')) <> RTRIM(ISNULL(prev.fdCurr, ''))
        ) THEN 'UPDATE'
        ELSE 'UNCHANGED'
      END AS changeStatus
    FROM tbBillingDetail d WITH (NOLOCK)
    FULL OUTER JOIN tbBillingDetailPrev prev WITH (NOLOCK) 
      ON d.fdInvNo = prev.fdInvNo AND d.fdID = prev.fdID
    LEFT JOIN tbTypeComodity tc_d WITH (NOLOCK)
      ON d.fdTypeComodity = tc_d.fdTypeComodity
    LEFT JOIN tbTypeComodity tc_prev WITH (NOLOCK)
      ON prev.fdTypeComodity = tc_prev.fdTypeComodity
    WHERE (d.fdInvNo = '${cleanInvNo}' OR RTRIM(d.fdInvNo) = '${cleanInvNo}')
       OR (prev.fdInvNo = '${cleanInvNo}' OR RTRIM(prev.fdInvNo) = '${cleanInvNo}')
    ORDER BY COALESCE(d.fdID, prev.fdID) ASC
  `)

  return details.map((d) => {
    const fdID = String(d.fdID || '').trim()
    const itemName = d.fdItemName ? String(d.fdItemName).trim() : null
    const prevItemName = d.prevItemName ? String(d.prevItemName).trim() : null
    const qty = d.fdQty !== null && d.fdQty !== undefined ? Number(d.fdQty) : null
    const prevQty = d.prevQty !== null && d.prevQty !== undefined ? Number(d.prevQty) : null
    const price = d.fdItemPrice !== null && d.fdItemPrice !== undefined ? Number(d.fdItemPrice) : null
    const prevPrice = d.prevItemPrice !== null && d.prevItemPrice !== undefined ? Number(d.prevItemPrice) : null
    const total = d.fdTotal !== null && d.fdTotal !== undefined ? Number(d.fdTotal) : null
    const prevTotal = d.prevTotal !== null && d.prevTotal !== undefined ? Number(d.prevTotal) : null
    const curr = d.fdCurr ? String(d.fdCurr).trim() : null
    const prevCurr = d.prevCurr ? String(d.prevCurr).trim() : null
    const listCode = d.fdListCode ? String(d.fdListCode).trim() : d.prevListCode ? String(d.prevListCode).trim() : null
    const comodity = d.fdComodity ? String(d.fdComodity).trim() : null
    const typeComodity = d.fdTypeComodity !== null && d.fdTypeComodity !== undefined ? Number(d.fdTypeComodity) : null
    const typeComodityName = d.typeComodityName ? String(d.typeComodityName).trim() : comodity || null
    const changeStatus: 'UNCHANGED' | 'UPDATE' | 'INSERT' | 'DELETE' = d.changeStatus || 'UNCHANGED'
    const hasAdjustment = changeStatus !== 'UNCHANGED'

    const diffs: Record<string, { old: any; new: any }> = {}
    if (prevItemName !== null && itemName !== null && prevItemName !== itemName) {
      diffs.itemName = { old: prevItemName, new: itemName }
    }
    if (prevQty !== null && qty !== null && prevQty !== qty) {
      diffs.qty = { old: prevQty, new: qty }
    }
    if (prevPrice !== null && price !== null && prevPrice !== price) {
      diffs.price = { old: prevPrice, new: price }
    }
    if (prevTotal !== null && total !== null && prevTotal !== total) {
      diffs.total = { old: prevTotal, new: total }
    }
    if (prevCurr !== null && curr !== null && prevCurr !== curr) {
      diffs.curr = { old: prevCurr, new: curr }
    }

    return {
      fdID,
      fdItemName: itemName,
      prevItemName,
      fdQty: qty,
      prevQty,
      fdItemPrice: price,
      prevItemPrice: prevPrice,
      fdTotal: total,
      prevTotal,
      fdCurr: curr,
      prevCurr,
      fdListCode: listCode,
      fdComodity: comodity,
      fdTypeComodity: typeComodity,
      typeComodityName,
      changeStatus,
      hasAdjustment,
      diffs,
    }
  })
}
