import { prisma } from '../../config/database'
import { Prisma } from '@prisma/client'

export interface CustomerBillingHistoryItem {
  fdInvNo: string
  fdInvDate: Date | string
  fdCustCode: string
  fdMarkingCode: string | null
  fdMarkingNo: string | null
  fdListCode: string | null
  fdListType: number | null
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
        CREATE NONCLUSTERED INDEX IX_tbBillingDetail_InvNo ON tbBillingDetail (fdInvNo) INCLUDE (fdItemName, fdComodity)
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

  // Ensure database indexes exist
  ensureBillingIndexes().catch(() => {})

  const escapedCustCode = cleanCustCode.replace(/'/g, "''")

  // Build conditions
  const conditions: string[] = [
    `(b.fdCustCode = '${escapedCustCode}' OR RTRIM(b.fdCustCode) = '${escapedCustCode}')`
  ]

  if (options?.year && options.year !== 'all') {
    const y = typeof options.year === 'number' ? options.year : parseInt(options.year, 10)
    if (!isNaN(y) && y > 2000) {
      conditions.push(`b.fdInvDate >= '${y}-01-01 00:00:00' AND b.fdInvDate <= '${y}-12-31 23:59:59'`)
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
      ISNULL(tot.totalJumlah, b.fdJumlah1) AS totalJumlah,
      ISNULL(tot.totalBayar, 0) AS totalBayar,
      ISNULL(tot.totalSLunas, 0) AS totalSLunas,
      d_comm.commodityNames
    FROM tbBilling b WITH (NOLOCK)
    OUTER APPLY (
      SELECT 
        SUM(t.fdJumlah) AS totalJumlah,
        SUM(t.fdBayar) AS totalBayar,
        MAX(t.fdSLunas) AS totalSLunas
      FROM tbBillingTotal t WITH (NOLOCK)
      WHERE t.fdInvNo = b.fdInvNo
    ) tot
    OUTER APPLY (
      SELECT STRING_AGG(RTRIM(d.fdItemName), ' | ') AS commodityNames
      FROM tbBillingDetail d WITH (NOLOCK)
      WHERE d.fdInvNo = b.fdInvNo
    ) d_comm
    WHERE ${whereClause}
    ORDER BY b.fdInvDate DESC
  `

  // Execute customer info, raw billings query, and employees map in parallel
  const [customer, rawBillings, empMap] = await Promise.all([
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
  ])

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

    return {
      fdInvNo: String(b.fdInvNo || '').trim(),
      fdInvDate: b.fdInvDate,
      fdCustCode: (b.fdCustCode || cleanCustCode).trim(),
      fdMarkingCode: b.fdMarkingCode ? String(b.fdMarkingCode).trim() : null,
      fdMarkingNo: b.fdMarkingNo ? String(b.fdMarkingNo).trim() : null,
      fdListCode: b.fdListCode ? String(b.fdListCode).trim() : null,
      fdListType: b.fdListType !== null && b.fdListType !== undefined ? Number(b.fdListType) : null,
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
      detailsCount: 0,
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

  const filteredItems =
    options?.status === 'lunas' ||
    options?.status === 'partial' ||
    options?.status === 'overdue' ||
    options?.status === 'issued' ||
    options?.status === 'unpaid'
      ? items.filter((it) => it.paymentStatus.toLowerCase() === options.status?.toLowerCase())
      : options?.status === 'draft'
      ? items.filter((it) => !it.isIssued)
      : items

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
      d.fdComodity,
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
      changeStatus,
      hasAdjustment,
      diffs,
    }
  })
}
