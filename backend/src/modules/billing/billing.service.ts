import { prisma } from '../../config/database'
import { logger } from '../../config/logger'
import { Prisma } from '@prisma/client'
import { buildPagination, parsePagination } from '../../utils/pagination'
import { safeRunRaw } from './billing-validation.service'
import { suggestionCache, SuggestionCache } from '../../utils/cache'

// In-memory cache for repeated billing searches (<1ms)
const billingSearchCache = new SuggestionCache(25_000, 500)

// Re-export domain modules for full backwards compatibility
export * from './billing.types'
export * from './billing-category.matcher'
export * from './billing-analytics.service'
export * from './billing-validation.service'
export * from './billing-batch-exit.service'

/**
 * Core Billing Queries & CRUD
 */

export async function getBillings(query: Record<string, string | undefined>) {
  const { page, limit } = parsePagination(query)
  const { skip, take, meta } = buildPagination({ page, limit })

  const search = query.search?.trim()
  const custCode = query.custCode?.trim()
  const hasAmount  = query.hasAmount  === 'true' || query.validOnly === 'true'
  const draftOnly  = query.draftOnly  === 'true' || query.status === 'draft'
  const statusFilter = query.status?.toLowerCase()
  const minYear = query.minYear ? parseInt(query.minYear, 10) : 2023
  const isNoPagination =
    query.noPagination === 'true' || query.all === 'true' || query.limit === 'all' || query.limit === '0'

  // Cache check for rapid repeated queries / pagination
  const cacheKey = search
    ? `billings:search:${search.toLowerCase()}:${custCode || ''}:${statusFilter || ''}:${hasAmount}:${draftOnly}:${minYear}:${page}:${limit}`
    : null
  if (cacheKey) {
    const cached = billingSearchCache.get<any>(cacheKey)
    if (cached) return cached
  }

  let data: any[] = []
  let total = 0
  const isNoPaginationFinal = isNoPagination

  let fastSearchFailed = false

  // ── High Performance Fast Path: Jika ada search teks bebas, gunakan CTE Candidate Query ──
  // Menghindari 1.000 parameter OR Prisma dan full-table-scan 735.000 baris (turun dari 18s ke <1s)
  if (search && !custCode) {
    try {
      const cleanSearch = search.replace(/'/g, "''")
      const contains = `%${cleanSearch}%`
      const prefix = `${cleanSearch}%`

      let statusFilterSql = ''
      if (draftOnly) {
        statusFilterSql = `
          AND ISNULL(b.fdGive, 0) <> 1
          AND ISNULL(b.fdGive2, 0) <> 1
          AND b.fdCekDate IS NULL
          AND b.fdInvDate >= '${minYear}-01-01'
          AND NOT EXISTS (
            SELECT 1 FROM tbBillingTotal bt WITH (NOLOCK)
            WHERE bt.fdInvNo = b.fdInvNo AND (ISNULL(bt.fdSLunas, 0) = 1 OR ISNULL(bt.fdBayar, 0) > 0)
          )
        `
      } else if (statusFilter === 'lunas' || statusFilter === 'collected') {
        statusFilterSql = `
          AND b.fdGive = 1
          AND (b.fdGive2 = 1 OR EXISTS (
            SELECT 1 FROM tbBillingTotal bt WITH (NOLOCK)
            WHERE bt.fdInvNo = b.fdInvNo AND bt.fdSLunas = 1
          ))
          AND b.fdInvDate >= '${minYear}-01-01'
        `
      } else if (statusFilter === 'partial') {
        statusFilterSql = `
          AND b.fdGive = 1
          AND EXISTS (
            SELECT 1 FROM tbBillingTotal bt WITH (NOLOCK)
            WHERE bt.fdInvNo = b.fdInvNo AND ISNULL(bt.fdBayar, 0) > 0
          )
          AND ISNULL(b.fdGive2, 0) <> 1
          AND b.fdInvDate >= '${minYear}-01-01'
        `
      } else if (statusFilter === 'issued') {
        statusFilterSql = `
          AND b.fdGive = 1
          AND b.fdInvDate >= '${minYear}-01-01'
        `
      } else if (query.minYear) {
        statusFilterSql = `AND b.fdInvDate >= '${minYear}-01-01'`
      }

      if (hasAmount) {
        statusFilterSql += ` AND (ISNULL(b.fdJumlah1, 0) > 0 OR ISNULL(b.fdJumlah2, 0) > 0)`
      }

      // T-SQL: ORDER BY di dalam CTE dilarang kecuali disertai TOP atau OFFSET
      const pagingSql = isNoPaginationFinal
        ? ''
        : `ORDER BY fdInvDate DESC OFFSET ${skip} ROWS FETCH NEXT ${take} ROWS ONLY`

      const [dataRows, countRow] = await Promise.all([
        prisma.$queryRawUnsafe<any[]>(`
          WITH Candidates AS (
            SELECT fdInvNo, fdInvDate FROM tbBilling WITH (NOLOCK) WHERE fdInvNo LIKE '${contains}'
            UNION
            SELECT fdInvNo, fdInvDate FROM tbBilling WITH (NOLOCK) WHERE fdMarkingCode LIKE '${contains}'
            UNION
            SELECT fdInvNo, fdInvDate FROM tbBilling WITH (NOLOCK) WHERE fdMarkingNo LIKE '${contains}'
            UNION
            SELECT b.fdInvNo, b.fdInvDate
            FROM tbBilling b WITH (NOLOCK)
            INNER JOIN tbCustomers c WITH (NOLOCK) ON b.fdCustCode = c.fdCustCode
            WHERE c.fdCustName LIKE '${contains}' OR c.fdCustCode LIKE '${prefix}' OR c.fdBillTo LIKE '${contains}'
          ),
          FilteredCandidates AS (
            SELECT c.fdInvNo, c.fdInvDate
            FROM Candidates c
            INNER JOIN tbBilling b WITH (NOLOCK) ON c.fdInvNo = b.fdInvNo
            WHERE 1=1 ${statusFilterSql}
          ),
          PagedCandidates AS (
            SELECT fdInvNo
            FROM FilteredCandidates
            ${pagingSql}
          )
          SELECT
            b.fdInvNo, b.fdInvDate, b.fdListType, b.fdCustCode, b.fdMarkingCode,
            b.fdMarkingNo, b.fdDescr, b.fdGive, b.fdGive2, b.fdCekDate,
            b.fdJumlah1, b.fdJumlah2, b.fdTypeBilling, b.fdEmpCode,
            cust.fdCustName, cust.fdBlocked, cust.fdBillTo
          FROM PagedCandidates pc
          INNER JOIN tbBilling b WITH (NOLOCK) ON pc.fdInvNo = b.fdInvNo
          LEFT JOIN tbCustomers cust WITH (NOLOCK) ON b.fdCustCode = cust.fdCustCode
          ORDER BY b.fdInvDate DESC
        `),
        prisma.$queryRawUnsafe<any[]>(`
          WITH Candidates AS (
            SELECT fdInvNo, fdInvDate FROM tbBilling WITH (NOLOCK) WHERE fdInvNo LIKE '${contains}'
            UNION
            SELECT fdInvNo, fdInvDate FROM tbBilling WITH (NOLOCK) WHERE fdMarkingCode LIKE '${contains}'
            UNION
            SELECT fdInvNo, fdInvDate FROM tbBilling WITH (NOLOCK) WHERE fdMarkingNo LIKE '${contains}'
            UNION
            SELECT b.fdInvNo, b.fdInvDate
            FROM tbBilling b WITH (NOLOCK)
            INNER JOIN tbCustomers c WITH (NOLOCK) ON b.fdCustCode = c.fdCustCode
            WHERE c.fdCustName LIKE '${contains}' OR c.fdCustCode LIKE '${prefix}' OR c.fdBillTo LIKE '${contains}'
          )
          SELECT COUNT_BIG(1) AS total
          FROM Candidates c
          INNER JOIN tbBilling b WITH (NOLOCK) ON c.fdInvNo = b.fdInvNo
          WHERE 1=1 ${statusFilterSql}
        `),
      ])

      data = dataRows.map((r) => ({
        fdInvNo: (r.fdInvNo || '').trim(),
        fdInvDate: r.fdInvDate,
        fdListType: r.fdListType,
        fdCustCode: (r.fdCustCode || '').trim(),
        fdMarkingCode: r.fdMarkingCode ? r.fdMarkingCode.trim() : null,
        fdMarkingNo: r.fdMarkingNo ? r.fdMarkingNo.trim() : null,
        fdDescr: r.fdDescr ? r.fdDescr.trim() : null,
        fdGive: r.fdGive,
        fdGive2: r.fdGive2,
        fdCekDate: r.fdCekDate,
        fdJumlah1: r.fdJumlah1,
        fdJumlah2: r.fdJumlah2,
        fdTypeBilling: r.fdTypeBilling,
        fdEmpCode: r.fdEmpCode ? r.fdEmpCode.trim() : null,
        customer: r.fdCustCode
          ? {
              fdCustName: r.fdCustName ? r.fdCustName.trim() : null,
              fdBlocked: r.fdBlocked,
              fdBillTo: r.fdBillTo ? r.fdBillTo.trim() : null,
            }
          : null,
      }))
      total = Number(countRow[0]?.total || 0)
    } catch (searchErr) {
      fastSearchFailed = true
      logger.warn(`Fast candidate search gagal, fallback ke standar: ${searchErr}`)
    }
  }

  // Fallback / Standar: Jika data masih kosong dan bukan hasil pencarian CTE kosong yang valid
  if (fastSearchFailed || (data.length === 0 && total === 0 && (!search || custCode))) {
    const whereConditions: Prisma.TbBillingWhereInput[] = []

    if (custCode) {
      whereConditions.push({ fdCustCode: custCode })
    }

    if (hasAmount) {
      whereConditions.push({ OR: [{ fdJumlah1: { gt: 0 } }, { fdJumlah2: { gt: 0 } }] })
    }

    if (draftOnly) {
      whereConditions.push({
        AND: [
          { OR: [{ fdGive: null }, { fdGive: { not: 1 } }] },
          { OR: [{ fdGive2: null }, { fdGive2: { not: 1 } }] },
          { fdCekDate: null },
          { fdInvDate: { gte: new Date(`${minYear}-01-01T00:00:00.000Z`) } },
          { NOT: { totals: { some: { OR: [{ fdSLunas: 1 }, { fdBayar: { gt: 0 } }] } } } },
        ],
      })
    } else if (statusFilter === 'lunas' || statusFilter === 'collected') {
      whereConditions.push({
        AND: [
          { fdGive: 1 },
          { OR: [{ fdGive2: 1 }, { totals: { some: { fdSLunas: 1 } } }] },
          { fdInvDate: { gte: new Date(`${minYear}-01-01T00:00:00.000Z`) } },
        ],
      })
    } else if (statusFilter === 'partial') {
      whereConditions.push({
        AND: [
          { fdGive: 1 },
          { totals: { some: { fdBayar: { gt: 0 } } } },
          { OR: [{ fdGive2: null }, { fdGive2: { not: 1 } }] },
          { fdInvDate: { gte: new Date(`${minYear}-01-01T00:00:00.000Z`) } },
        ],
      })
    } else if (statusFilter === 'issued') {
      whereConditions.push({
        AND: [
          { fdGive: 1 },
          { fdInvDate: { gte: new Date(`${minYear}-01-01T00:00:00.000Z`) } },
        ],
      })
    } else if (query.minYear) {
      whereConditions.push({ fdInvDate: { gte: new Date(`${minYear}-01-01T00:00:00.000Z`) } })
    }

    const prismaWhere: Prisma.TbBillingWhereInput = whereConditions.length > 0 ? { AND: whereConditions } : {}

    const [prismaData, prismaTotal] = await Promise.all([
      prisma.tbBilling.findMany({
        where: prismaWhere,
        ...(isNoPaginationFinal ? {} : { skip, take }),
        orderBy: { fdInvDate: 'desc' },
        select: {
          fdInvNo:       true,
          fdInvDate:     true,
          fdListType:    true,
          fdCustCode:    true,
          fdMarkingCode: true,
          fdMarkingNo:   true,
          fdDescr:       true,
          fdGive:        true,
          fdGive2:       true,
          fdCekDate:     true,
          fdJumlah1:     true,
          fdJumlah2:     true,
          fdTypeBilling: true,
          fdEmpCode:     true,
          customer: { select: { fdCustName: true, fdBlocked: true, fdBillTo: true } },
        },
      }),
      prisma.tbBilling.count({ where: prismaWhere }),
    ])

    data = prismaData
    total = prismaTotal
  }

  let empMap          = new Map<string, string>()
  let totalsMap       = new Map<string, { totalJumlah: number; totalBayar: number; hasSLunas: boolean }>()
  let consigneeMap    = new Map<string, string>()
  let attachmentMap   = new Map<string, number>()

  if (data.length > 0) {
    // Kumpulkan kode unik
    const invNos      = [...new Set(data.map(d => d.fdInvNo.trim()))]
    const empCodes    = [...new Set(data.map(d => d.fdEmpCode?.trim()).filter(Boolean))] as string[]
    const markingCodes = [...new Set(
      data.flatMap((d: any) => d.fdMarkingCode ? d.fdMarkingCode.split(';').map((c: string) => c.trim()).filter(Boolean) : [])
    )]

    // Helper untuk query batching yang aman
    const fetchTotals = async () => {
      if (invNos.length === 0) return []
      const chunkSize = 1000
      const results: { fdInvNo: string; totalJumlah: number; totalBayar: number; hasSLunas: number }[] = []
      for (let i = 0; i < invNos.length; i += chunkSize) {
        const chunk = invNos.slice(i, i + chunkSize)
        try {
          const chunkRows = await prisma.$queryRawUnsafe<any[]>(`
            SELECT
              RTRIM(fdInvNo)          AS fdInvNo,
              ISNULL(SUM(fdJumlah),0) AS totalJumlah,
              ISNULL(SUM(fdBayar), 0) AS totalBayar,
              MAX(CASE WHEN fdSLunas = 1 THEN 1 ELSE 0 END) AS hasSLunas
            FROM tbBillingTotal WITH (NOLOCK)
            WHERE fdInvNo IN (${chunk.map((v) => `'${v.replace(/'/g, "''")}'`).join(',')})
            GROUP BY RTRIM(fdInvNo)
          `)
          results.push(...chunkRows)
        } catch (err) {
          logger.warn(`Gagal fetch totals batch: ${err}`)
        }
      }
      return results
    }

    const fetchMarkings = async () => {
      if (markingCodes.length === 0) return []
      const chunkSize = 500
      const results: { fdMarkingCode: string; fdConsignee: string }[] = []
      for (let i = 0; i < markingCodes.length; i += chunkSize) {
        const chunk = markingCodes.slice(i, i + chunkSize)
        try {
          const chunkRows = await prisma.$queryRawUnsafe<any[]>(`
            SELECT fdMarkingCode, fdConsignee
            FROM tbMarking WITH (INDEX(IX_tbMarking_fdMarkingCode_fdConsignee), NOLOCK)
            WHERE fdMarkingCode IN (${chunk.map((v) => `'${v.replace(/'/g, "''")}'`).join(',')})
              AND LTRIM(RTRIM(fdConsignee)) <> ''
          `)
          results.push(...chunkRows)
        } catch {
          // Fallback tanpa index hint jika index tidak ada/berbeda
          try {
            const fallbackRows = await prisma.tbMarking.findMany({
              where: { fdMarkingCode: { in: chunk } },
              select: { fdMarkingCode: true, fdConsignee: true },
            })
            results.push(
              ...fallbackRows
                .filter((r) => r.fdConsignee && r.fdConsignee.trim())
                .map((r) => ({ fdMarkingCode: r.fdMarkingCode, fdConsignee: r.fdConsignee! }))
            )
          } catch (err2) {
            logger.warn(`Gagal fetch markings fallback: ${err2}`)
          }
        }
      }
      return results
    }

    const fetchAttachmentCounts = async () => {
      if (invNos.length === 0) return []
      const chunkSize = 1000
      const results: { fdInvNo: string; count: number }[] = []
      for (let i = 0; i < invNos.length; i += chunkSize) {
        const chunk = invNos.slice(i, i + chunkSize)
        try {
          const chunkRows = await prisma.$queryRawUnsafe<any[]>(`
            SELECT RTRIM(fdInvNo) AS fdInvNo, COUNT(fdId) AS count
            FROM tbBillingAttachment WITH (NOLOCK)
            WHERE fdInvNo IN (${chunk.map((v) => `'${v.replace(/'/g, "''")}'`).join(',')})
            GROUP BY RTRIM(fdInvNo)
          `)
          results.push(...chunkRows)
        } catch (err) {
          logger.warn(`Gagal fetch attachment counts batch: ${err}`)
        }
      }
      return results
    }

    // Jalankan 4 enrichment query secara paralel
    const [employees, totalsRows, markingRows, attachmentRows] = await Promise.all([
      // 1. Employee names
      empCodes.length > 0
        ? prisma.tbEmployees.findMany({
            where: { fdEmpCode: { in: empCodes } },
            select: { fdEmpCode: true, fdEmpName: true },
          })
        : Promise.resolve([]),

      // 2. Totals agregasi
      fetchTotals(),

      // 3. Konsignee
      fetchMarkings(),

      // 4. Lampiran berkas
      fetchAttachmentCounts(),
    ])

    // Build maps
    empMap = new Map(employees.map((e) => [e.fdEmpCode.trim(), e.fdEmpName.trim()]))
    totalsRows.forEach((t: any) => {
      totalsMap.set(t.fdInvNo.trim(), {
        totalJumlah: Number(t.totalJumlah ?? 0),
        totalBayar: Number(t.totalBayar ?? 0),
        hasSLunas: Number(t.hasSLunas) === 1,
      })
    })
    markingRows.forEach((m: any) => {
      if (m.fdConsignee?.trim()) {
        consigneeMap.set(m.fdMarkingCode.trim(), m.fdConsignee.trim())
      }
    })
    attachmentRows.forEach((a: any) => {
      if (a.fdInvNo) {
        attachmentMap.set(a.fdInvNo.trim(), Number(a.count ?? 0))
      }
    })
  }

  const now = new Date()

  // ── Step 6: Map rows → response shape ──
  const mappedData = data.map(d => {
    const { fdEmpCode, ...rest } = d

    const invDate     = d.fdInvDate ? new Date(d.fdInvDate) : null
    const ageDays     = invDate ? Math.floor((now.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
    const isIssued    = Number(d.fdGive)  === 1
    const isCollected = Number(d.fdGive2) === 1

    const invNoTrimmed = d.fdInvNo.trim()
    const totEntry = totalsMap.get(invNoTrimmed)
    const totalJumlah = totEntry?.totalJumlah ?? Number(d.fdJumlah1 ?? 0)
    const totalBayar  = totEntry?.totalBayar  ?? 0
    const hasSLunas   = totEntry?.hasSLunas   ?? false

    let paymentStatus: 'LUNAS' | 'PARTIAL' | 'OVERDUE' | 'UNPAID' | 'ISSUED' | 'DRAFT' = 'DRAFT'
    if (!isIssued) {
      paymentStatus = 'DRAFT'
    } else if (isCollected || hasSLunas || (totalJumlah > 0 && Math.abs(totalJumlah - totalBayar) <= 0.01)) {
      paymentStatus = 'LUNAS'
    } else if (totalBayar > 0) {
      paymentStatus = 'PARTIAL'
    } else if (totalBayar === 0 && ageDays > 30) {
      paymentStatus = 'OVERDUE'
    } else if (totalBayar === 0 && ageDays < 7) {
      paymentStatus = 'ISSUED'
    } else {
      paymentStatus = 'UNPAID'
    }

    let fdConsignee: string | null = null
    if (d.fdMarkingCode) {
      const codes = d.fdMarkingCode.split(';').map((c: string) => c.trim()).filter(Boolean)
      const consignees = codes.map((c: string) => consigneeMap.get(c)).filter(Boolean)
      if (consignees.length > 0) fdConsignee = [...new Set(consignees)].join(', ')
    }

    return {
      ...rest,
      totals: [],
      totalJumlah,
      fdTotalAmount: totalJumlah,
      totalBayar,
      sisaBayar: Math.max(0, totalJumlah - totalBayar),
      paymentStatus,
      fdConsignee,
      attachmentCount: attachmentMap.get(invNoTrimmed) ?? 0,
      employee: fdEmpCode ? { fdEmpName: empMap.get(fdEmpCode.trim()) || null } : null,
    }
  })

  const result = { data: mappedData, meta: meta(total) }
  if (cacheKey) {
    billingSearchCache.set(cacheKey, result, 25_000)
  }

  return result
}

export async function getBillingById(id: string) {
  const cleanId = id.trim()

  let billRows = await safeRunRaw(async () => {
    return prisma.$queryRaw<any[]>`
      SELECT TOP 1 
        b.*,
        c.fdCustName, c.fdBlocked, c.fdBillTo, c.fdContact, c.fdBillAddr1, c.fdSalesNM, c.fdBroker,
        RTRIM(c.fdEmpName) as fdCustEmpName, RTRIM(c.fdEmpCode) as fdCustEmpCode
      FROM tbBilling b WITH (NOLOCK)
      LEFT JOIN tbCustomers c WITH (NOLOCK) ON b.fdCustCode = c.fdCustCode
      WHERE b.fdInvNo = CAST(${cleanId} AS CHAR(20))
    `
  }, 'get_billing_header')

  let rawBill = billRows && billRows.length > 0 ? billRows[0] : null

  // If not found and cleanId is a combined bill (e.g. SGS-A01783-09-2026), fallback to parent (e.g. SGS-001783-09-2026)
  if (!rawBill) {
    const parts = cleanId.split('-')
    if (parts.length >= 4 && parts[1] && /^[A-Za-z]/.test(parts[1])) {
      const parentNum = '0' + parts[1].slice(1)
      const parentInvNo = `${parts[0]}-${parentNum}-${parts[2]}-${parts[3]}`
      billRows = await safeRunRaw(async () => {
        return prisma.$queryRaw<any[]>`
          SELECT TOP 1 
            b.*,
            c.fdCustName, c.fdBlocked, c.fdBillTo, c.fdContact, c.fdBillAddr1, c.fdSalesNM, c.fdBroker,
            RTRIM(c.fdEmpName) as fdCustEmpName, RTRIM(c.fdEmpCode) as fdCustEmpCode
          FROM tbBilling b WITH (NOLOCK)
          LEFT JOIN tbCustomers c WITH (NOLOCK) ON b.fdCustCode = c.fdCustCode
          WHERE b.fdInvNo = CAST(${parentInvNo} AS CHAR(20))
        `
      }, 'get_billing_parent_header')
      rawBill = billRows && billRows.length > 0 ? billRows[0] : null
    }
  }

  if (!rawBill) return null

  const targetInvNo = String(rawBill.fdInvNo).trim()
  const {
    fdCustName,
    fdBlocked,
    fdBillTo,
    fdContact,
    fdBillAddr1,
    fdSalesNM,
    fdBroker,
    fdCustEmpName,
    fdCustEmpCode,
    fdEmpCode,
    ...billFields
  } = rawBill

  const is7DigitListCode = (c?: string | null): boolean => !!c && /^\d{5,8}$/.test(c.trim())

  let resolvedListCode = ''
  if (is7DigitListCode(rawBill.fdListCode)) {
    resolvedListCode = rawBill.fdListCode.trim()
  }

  const markingCode = rawBill.fdMarkingCode?.trim() || ''
  const markingCodes = markingCode.split(';').map((c: string) => c.trim()).filter(Boolean)
  const cleanInvNo = targetInvNo
  const custSalesNM = fdSalesNM ? String(fdSalesNM).trim() : ''
  const empCode = fdEmpCode ? String(fdEmpCode).trim() : ''
  const billingCustCode = rawBill.fdCustCode ? String(rawBill.fdCustCode).trim() : ''

  // Eksekusi details dan seluruh query pengkayaan secara paralel
  const [
    details,
    entryListInfo,
    markingInfo,
    cashierRows,
    emp,
    giveEmpRow,
    salesRow,
    resiRows,
    attachmentCountRow
  ] = await Promise.all([
    safeRunRaw(async () => {
      return prisma.$queryRaw<any[]>`
        SELECT *
        FROM tbBillingDetail d WITH (NOLOCK)
        WHERE d.fdInvNo = CAST(${targetInvNo} AS CHAR(20))
        ORDER BY d.fdID ASC
      `
    }, 'get_billing_details'),

    resolvedListCode
      ? safeRunRaw(async () => {
          return prisma.$queryRaw<any[]>`
            SELECT TOP 1
              e.fdTglAgent,
              e.fdTypeComodity,
              RTRIM(e.fdComodity) as fdComodity,
              RTRIM(tc.fdComodityName) as fdTypeComodityName
            FROM tbEntryList e WITH (NOLOCK)
            LEFT JOIN tbTypeComodity tc WITH (NOLOCK)
              ON e.fdTypeComodity = tc.fdTypeComodity
             AND (e.fdListType = tc.fdListType OR tc.fdListType IS NULL)
            WHERE e.fdListCode = CAST(${resolvedListCode} AS CHAR(7))
          `
        }, 'get_entrylist_info')
      : Promise.resolve([]),

    markingCodes.length > 0
      ? safeRunRaw(async () => {
          return prisma.tbMarking.findMany({
            where: { fdMarkingCode: { in: markingCodes } },
            select: { fdMarkingCode: true, fdConsignee: true },
          })
        }, 'get_marking_consignee')
      : Promise.resolve([]),

    safeRunRaw(async () => {
      return prisma.$queryRaw<any[]>`
        SELECT 
          RTRIM(fdCashierID) as fdCashierID,
          fdDate,
          RTRIM(fdType) as fdType,
          RTRIM(fdCCYCode) as fdCCYCode,
          fdAmount,
          fdTotal
        FROM tbCashierDetail WITH (NOLOCK)
        WHERE fdInvNo = CAST(${cleanInvNo} AS CHAR(20))
        ORDER BY fdDate DESC
      `
    }, 'get_cashier_payment'),

    empCode
      ? prisma.tbEmployees.findFirst({
          where: { fdEmpCode: empCode },
          select: { fdEmpName: true }
        })
      : Promise.resolve(null),

    safeRunRaw(async () => {
      return prisma.$queryRaw<any[]>`
        SELECT TOP 1 RTRIM(ge.fdEmpId) as fdEmpId, RTRIM(e.fdEmpName) as fdEmpName
        FROM tbBillingGiveEmp ge WITH (NOLOCK)
        LEFT JOIN tbEmployees e WITH (NOLOCK) ON ge.fdEmpId = e.fdEmpCode
        WHERE ge.fdInvNo = CAST(${cleanInvNo} AS CHAR(20))
      `
    }, 'get_billing_give_emp'),

    custSalesNM
      ? safeRunRaw(async () => {
          return prisma.$queryRaw<any[]>`
            SELECT TOP 1 RTRIM(fdSalesCode) as fdSalesCode, RTRIM(fdSalesNM) as fdSalesNM
            FROM tbSales WITH (NOLOCK)
            WHERE LTRIM(RTRIM(fdSalesNM)) = ${custSalesNM}
          `
        }, 'get_sales_code')
      : Promise.resolve([]),

    safeRunRaw(async () => {
      if (resolvedListCode) {
        return prisma.$queryRaw<any[]>`
          SELECT DISTINCT RTRIM(el.fdTerima) as fdTerima
          FROM tbEntryList el WITH (NOLOCK)
          WHERE el.fdListCode = CAST(${resolvedListCode} AS CHAR(7))
            AND el.fdTerima IS NOT NULL
            AND el.fdTerima NOT IN ('', '-', '.', 'SIN', 'SIN/AIR')
        `
      }
      return prisma.$queryRaw<any[]>`
        SELECT DISTINCT RTRIM(el.fdTerima) as fdTerima
        FROM tbEntryList el WITH (NOLOCK)
        WHERE el.fdInvoiceNo = CAST(${cleanInvNo} AS CHAR(20))
          AND el.fdTerima IS NOT NULL
          AND el.fdTerima NOT IN ('', '-', '.', 'SIN', 'SIN/AIR')
      `
    }, 'get_billing_resi_summary'),

    safeRunRaw(async () => {
      return prisma.tbBillingAttachment.count({
        where: { fdInvNo: targetInvNo },
      })
    }, 'get_billing_attachment_count')
  ])

  // Fallback resolvedListCode dari details jika header fdListCode kosong
  if (!resolvedListCode && details && details.length > 0) {
    const found = details.find((d: any) => is7DigitListCode(d.fdListCode))
    if (found?.fdListCode) {
      resolvedListCode = found.fdListCode.trim()
    }
  }

  let fdTypeComodity: number | null = null
  let fdTypeComodityName: string | null = null
  let fdComodity: string | null = null
  let fdTglAgent: string | null = null
  let fdConsignee: string | null = null

  if (entryListInfo && entryListInfo.length > 0) {
    const row = entryListInfo[0]
    if (row.fdTglAgent) fdTglAgent = new Date(row.fdTglAgent).toISOString()
    if (row.fdTypeComodity !== null && row.fdTypeComodity !== undefined) {
      fdTypeComodity = Number(row.fdTypeComodity)
    }
    if (row.fdComodity) fdComodity = String(row.fdComodity).trim()
    if (row.fdTypeComodityName) fdTypeComodityName = String(row.fdTypeComodityName).trim()
  }

  if (markingInfo && markingInfo.length > 0) {
    const consignees = markingInfo
      .map((m: any) => (m.fdConsignee ? String(m.fdConsignee).trim() : ''))
      .filter(Boolean)
    if (consignees.length > 0) {
      fdConsignee = Array.from(new Set(consignees)).join(', ')
    }
  }

  let isPaid = false
  let paymentStatus: 'LUNAS' | 'SEBAGIAN' | 'BELUM LUNAS' = 'BELUM LUNAS'
  let cashierID: string | null = null
  let cashierDate: string | null = null
  let totalPaid = 0
  let cashierDetails: any[] = []

  if (cashierRows && cashierRows.length > 0) {
    cashierDetails = cashierRows.map((r: any) => ({
      fdCashierID: r.fdCashierID ? String(r.fdCashierID).trim() : null,
      fdDate: r.fdDate ? new Date(r.fdDate).toISOString() : null,
      fdType: r.fdType ? String(r.fdType).trim() : null,
      fdCCYCode: r.fdCCYCode ? String(r.fdCCYCode).trim() : null,
      fdAmount: Number(r.fdAmount || 0),
      fdTotal: Number(r.fdTotal || 0),
    }))

    totalPaid = cashierDetails.reduce((sum: number, item: any) => sum + (item.fdTotal || item.fdAmount || 0), 0)
    const billTotal = Number(rawBill.fdJumlah2 || 0) > 0 ? Number(rawBill.fdJumlah2) : Number(rawBill.fdJumlah1 || 0)

    isPaid = totalPaid > 0
    paymentStatus = totalPaid >= billTotal && billTotal > 0 ? 'LUNAS' : (totalPaid > 0 ? 'SEBAGIAN' : 'BELUM LUNAS')
    cashierID = cashierDetails[0]?.fdCashierID || null
    cashierDate = cashierDetails[0]?.fdDate || null
  }

  let employee = emp ? { fdEmpName: emp.fdEmpName.trim() } : null

  let giveEmployee: { fdEmpId: string | null; fdEmpName: string | null } | null = null
  if (giveEmpRow && giveEmpRow.length > 0 && giveEmpRow[0]?.fdEmpId) {
    giveEmployee = {
      fdEmpId: giveEmpRow[0].fdEmpId || null,
      fdEmpName: giveEmpRow[0].fdEmpName || null,
    }
  }

  let resiSummary: { isPartial: boolean; totalResi: number; resiList: string[]; primaryResi?: string | null } = {
    isPartial: false,
    totalResi: 0,
    resiList: [],
    primaryResi: null,
  }

  if (resiRows && resiRows.length > 0) {
    const rawResiList = resiRows.map((r: any) => String(r.fdTerima || '').trim()).filter(Boolean)
    const uniqueResiList = Array.from(new Set(rawResiList))

    let isPartial = false
    if (uniqueResiList.length > 0 && billingCustCode) {
      const partialCheck = await safeRunRaw(async () => {
        return prisma.$queryRaw<any[]>`
          SELECT TOP 1 1
          FROM tbEntryList el WITH (NOLOCK)
          WHERE el.fdCustCode = CAST(${billingCustCode} AS CHAR(7))
            AND el.fdTerima IN (${Prisma.join(uniqueResiList)})
            AND el.fdMarkingCode <> CAST(${markingCode} AS VARCHAR(30))
        `
      }, 'check_parcial_resi')
      if (partialCheck && partialCheck.length > 0) {
        isPartial = true
      }
    }

    resiSummary = {
      isPartial,
      totalResi: uniqueResiList.length,
      resiList: uniqueResiList,
      primaryResi: uniqueResiList[0] || null,
    }
  }

  let fdSalesCode: string | null = null
  if (salesRow && salesRow.length > 0 && salesRow[0]?.fdSalesCode) {
    fdSalesCode = String(salesRow[0].fdSalesCode).trim()
  }

  const custEmpName = fdCustEmpName ? String(fdCustEmpName).trim() : ''
  const fdCollector = custEmpName ? custEmpName.slice(0, 2).toUpperCase() : null

  const initialCustomer = rawBill.fdCustCode ? {
    fdCustName,
    fdBlocked,
    fdBillTo,
    fdContact,
    fdBillAddr1,
    fdSalesNM,
    fdBroker,
    fdEmpName: custEmpName || null,
    fdEmpCode: fdCustEmpCode ? String(fdCustEmpCode).trim() : null,
    fdSalesCode: fdSalesCode || (fdSalesNM ? String(fdSalesNM).trim() : null),
    fdCollector,
  } : null

  return {
    ...billFields,
    details: details || [],
    customer: initialCustomer,
    employee,
    giveEmployee,
    resiSummary,
    fdTypeComodity,
    fdTypeComodityName,
    fdComodity,
    fdTglAgent,
    fdConsignee,
    isPaid,
    paymentStatus,
    cashierID,
    cashierDate,
    totalPaid,
    cashierDetails,
    attachmentCount: typeof attachmentCountRow === 'number' ? attachmentCountRow : 0,
  }
}

/**
 * Mendapatkan daftar master karyawan untuk opsi penyerah invoice
 */
export async function getBillingEmployees() {
  const employees = await prisma.tbEmployees.findMany({
    select: { fdEmpCode: true, fdEmpName: true },
    orderBy: { fdEmpName: 'asc' }
  })
  return employees.map((e) => ({
    fdEmpCode: e.fdEmpCode.trim(),
    fdEmpName: e.fdEmpName.trim()
  }))
}

/**
 * Timeline siklus kargo per invoice
 * Mengambil 8 milestone kronologis: Diterima Agen → Loading → ETD → ETA → Masuk Gudang → SJ → Kirim → Diserahkan
 * JOIN: tbEntrylist (fdListCode) → tbMarking (fdMarkingCode) → tbDelivery (fdListCode)
 */
export async function getBillingTimeline(invNo: string) {
  const cleanInvNo = (invNo || '').trim()
  if (!cleanInvNo) return null

  // Resolve listCode dari invNo
  const billRows = await prisma.$queryRaw<{ fdListCode: string }[]>`
    SELECT TOP 1 RTRIM(b.fdListCode) AS fdListCode
    FROM tbBilling b WITH (NOLOCK)
    WHERE b.fdInvNo = ${cleanInvNo}
  `
  const listCode = billRows[0]?.fdListCode?.trim()
  if (!listCode) return null

  const rows = await prisma.$queryRaw<any[]>`
    SELECT
      CONVERT(VARCHAR(10), MIN(el.fdTglAgent), 120) AS fdTglAgent,
      CONVERT(VARCHAR(10), MIN(
        CASE
          WHEN el.fdTgl_IN IS NOT NULL AND el.fdTgl_IN > '1900-01-01' THEN el.fdTgl_IN
          WHEN m.fdExitDate IS NOT NULL AND m.fdExitDate > '1900-01-01' THEN m.fdExitDate
          ELSE NULL
        END
      ), 120)                                        AS fdTgl_IN,
      CONVERT(VARCHAR(10), m.fdLoadDate, 120)        AS fdLoadDate,
      CONVERT(VARCHAR(10), m.fdETD, 120)             AS fdETD,
      CONVERT(VARCHAR(10), m.fdETA, 120)             AS fdETA,
      CONVERT(VARCHAR(10), MIN(d.fdSJDate), 120)     AS fdSjDate,
      CONVERT(VARCHAR(10), MAX(d.fdSndDate), 120)    AS fdSndDate,
      CONVERT(VARCHAR(10), MAX(d.fdGiveDate), 120)   AS fdGiveDate,
      MAX(RTRIM(m.fdGudang))                          AS fdGudang
    FROM tbEntrylist el WITH (NOLOCK)
    LEFT JOIN tbMarking m WITH (NOLOCK)
      ON RTRIM(m.fdMarkingCode) = RTRIM(el.fdMarkingCode)
    LEFT JOIN tbDelivery d WITH (NOLOCK)
      ON RTRIM(d.fdListCode) = RTRIM(el.fdListCode)
    WHERE RTRIM(el.fdListCode) = CAST(${listCode} AS CHAR(7))
    GROUP BY m.fdLoadDate, m.fdETD, m.fdETA
  `

  if (!rows || rows.length === 0) {
    return {
      fdTglAgent: null,
      fdLoadDate: null,
      fdETD: null,
      fdETA: null,
      fdTgl_IN: null,
      fdGudang: null,
      fdSjDate: null,
      fdSndDate: null,
      fdGiveDate: null,
    }
  }

  const r = rows[0]
  return {
    fdTglAgent: r.fdTglAgent ? String(r.fdTglAgent).trim() : null,
    fdLoadDate: r.fdLoadDate ? String(r.fdLoadDate).trim() : null,
    fdETD:      r.fdETD      ? String(r.fdETD).trim()      : null,
    fdETA:      r.fdETA      ? String(r.fdETA).trim()      : null,
    fdTgl_IN:   r.fdTgl_IN   ? String(r.fdTgl_IN).trim()   : null,
    fdGudang:   r.fdGudang   ? String(r.fdGudang).trim()   : null,
    fdSjDate:   r.fdSjDate   ? String(r.fdSjDate).trim()   : null,
    fdSndDate:  r.fdSndDate  ? String(r.fdSndDate).trim()  : null,
    fdGiveDate: r.fdGiveDate ? String(r.fdGiveDate).trim() : null,
  }
}


/**
 * Memperbarui status invoice menjadi Issued (Terbit)
 * Menggunakan query resmi pada tbBilling, tbBillingPrev, dan tbBillingGiveEmp
 */
export async function issueInvoice(
  invNo: string,
  empId?: string,
  userPayload?: { fdEmpCode?: string | null; username?: string; role?: string }
) {
  const cleanInvNo = invNo.trim()

  // 1. Cek keberadaan invoice di tbBilling
  const existingRows = await prisma.$queryRaw<any[]>`
    SELECT TOP 1 
      RTRIM(b.fdInvNo) as fdInvNo, 
      b.fdGive, 
      b.fdGiveDate,
      RTRIM(ge.fdEmpId) as fdEmpId,
      RTRIM(e.fdEmpName) as fdEmpName
    FROM tbBilling b WITH (NOLOCK)
    LEFT JOIN tbBillingGiveEmp ge WITH (NOLOCK) ON RTRIM(b.fdInvNo) = RTRIM(ge.fdInvNo)
    LEFT JOIN tbEmployees e WITH (NOLOCK) ON RTRIM(ge.fdEmpId) = RTRIM(e.fdEmpCode)
    WHERE RTRIM(b.fdInvNo) = ${cleanInvNo}
  `

  if (!existingRows || existingRows.length === 0) {
    throw new Error(`Invoice ${cleanInvNo} tidak ditemukan di database tbBilling.`)
  }

  const existing = existingRows[0]

  // Opsi A: Tolak jika sudah terbit (fdGive = 1)
  if (Number(existing.fdGive) === 1) {
    const giveDateStr = existing.fdGiveDate ? new Date(existing.fdGiveDate).toLocaleString('id-ID') : 'waktu sebelumnya'
    const empInfo = existing.fdEmpName
      ? ` oleh ${existing.fdEmpName} (${existing.fdEmpId})`
      : existing.fdEmpId
      ? ` oleh ${existing.fdEmpId}`
      : ''
    throw new Error(`Invoice ${cleanInvNo} sudah berstatus Terbit pada ${giveDateStr}${empInfo}. Tidak dapat diterbitkan ulang.`)
  }

  // 2. Tentukan karyawan penyerah (finalEmpId)
  const finalEmpId = (empId && empId.trim()) || (userPayload?.fdEmpCode && userPayload.fdEmpCode.trim()) || null
  if (!finalEmpId) {
    throw new Error(
      'Identitas karyawan penyerah (fdEmpId) belum ditentukan. Silakan hubungi admin untuk menghubungkan akun Anda ke master karyawan, atau pilih karyawan penyerah.'
    )
  }

  // Validasi karyawan di tbEmployees
  const emp = await prisma.tbEmployees.findFirst({
    where: { fdEmpCode: finalEmpId },
    select: { fdEmpCode: true, fdEmpName: true }
  })
  if (!emp) {
    throw new Error(`Karyawan dengan kode ${finalEmpId} tidak ditemukan di master tbEmployees.`)
  }

  const empCode = emp.fdEmpCode.trim()
  const empName = emp.fdEmpName.trim()

  // 3. Eksekusi transaksi SQL atomik
  await prisma.$transaction(async (tx) => {
    // Update tbBilling
    await tx.$executeRaw`
      UPDATE tbBilling
      SET fdGive = 1, fdGiveDate = GETDATE()
      WHERE RTRIM(fdInvNo) = ${cleanInvNo}
    `

    // Update tbBillingPrev
    await tx.$executeRaw`
      UPDATE tbBillingPrev
      SET fdGive = 1, fdGiveDate = GETDATE()
      WHERE RTRIM(fdInvNo) = ${cleanInvNo}
    `

    // Upsert tbBillingGiveEmp
    const exists = await tx.$queryRaw<any[]>`
      SELECT 1 FROM tbBillingGiveEmp WHERE RTRIM(fdInvNo) = ${cleanInvNo}
    `

    if (exists && exists.length > 0) {
      await tx.$executeRaw`
        UPDATE tbBillingGiveEmp
        SET fdEmpId = ${empCode}, fdGiveDate = GETDATE()
        WHERE RTRIM(fdInvNo) = ${cleanInvNo}
      `
    } else {
      await tx.$executeRaw`
        INSERT INTO tbBillingGiveEmp (fdEmpId, fdInvNo, fdGiveDate)
        VALUES (${empCode}, ${cleanInvNo}, GETDATE())
      `
    }
  })

  logger.info(`Invoice ${cleanInvNo} berhasil diterbitkan (Issued) oleh ${empName} (${empCode})`)

  return {
    fdInvNo: cleanInvNo,
    fdGive: 1,
    fdGiveDate: new Date().toISOString(),
    fdEmpId: empCode,
    fdEmpName: empName,
    message: `Invoice ${cleanInvNo} berhasil diterbitkan oleh ${empName} (${empCode})`
  }
}

/**
 * Mengecek persebaran nomor resi (fdTerima) pada bill di marking code apa saja.
 * Menandai status PARSIAL jika resi muncul di beberapa marking code dengan customer (fdCustCode) yang sama.
 */
export async function checkBillResiMarking(invNo: string, searchResi?: string) {
  const cleanInvNo = invNo.trim()

  // 1. Ambil info bill & langsung ambil fdTerima via JOIN tbEntryList
  const billRows = await prisma.$queryRaw<any[]>`
    SELECT 
      RTRIM(b.fdInvNo) as fdInvNo,
      RTRIM(b.fdListCode) as fdListCode,
      RTRIM(b.fdCustCode) as fdCustCode,
      RTRIM(c.fdCustName) as fdCustName,
      RTRIM(b.fdMarkingCode) as fdMarkingCode,
      RTRIM(b.fdMarkingNo) as fdMarkingNo,
      RTRIM(e.fdTerima) as fdTerima
    FROM tbBilling b WITH (NOLOCK)
    LEFT JOIN tbCustomers c WITH (NOLOCK) ON RTRIM(b.fdCustCode) = RTRIM(c.fdCustCode)
    LEFT JOIN tbEntryList e WITH (NOLOCK) ON (
      RTRIM(b.fdListCode) = RTRIM(e.fdListCode)
      OR RTRIM(e.fdInvoiceNo) = RTRIM(b.fdInvNo)
    )
    WHERE RTRIM(b.fdInvNo) = ${cleanInvNo}
  `

  if (!billRows || billRows.length === 0) {
    throw new Error(`Invoice ${cleanInvNo} tidak ditemukan`)
  }

  const bill = billRows[0]
  const custCode = bill.fdCustCode || ''
  const markingCode = bill.fdMarkingCode || ''
  const listCode = bill.fdListCode || ''

  // 2. Kumpulkan list fdTerima dari hasil Query 1 (tanpa menarik seluruh resi satu marking code)
  let targetResiList = Array.from(
    new Set(
      billRows
        .map((r) => String(r.fdTerima || '').trim())
        .filter((t) => t && !['', '-', '.'].includes(t))
    )
  )

  if (searchResi && searchResi.trim()) {
    const cleanSearch = searchResi.trim()
    if (!targetResiList.includes(cleanSearch)) {
      targetResiList.unshift(cleanSearch)
    }
  }

  if (targetResiList.length === 0) {
    return {
      invNo: cleanInvNo,
      custCode,
      custName: bill.fdCustName || '—',
      markingCode,
      markingNo: bill.fdMarkingNo || '—',
      summary: {
        totalResi: 0,
        isPartial: false,
        partialCount: 0,
        crossMarkingCount: 0,
        totalColly: 0,
        totalBerat: 0,
        totalM3: 0,
      },
      resiList: [],
    }
  }

  // 3. Query seluruh kemunculan fdTerima ini di database (murni berdasarkan fdTerima dan fdCustCode)
  const occurrences = await prisma.$queryRaw<any[]>`
    SELECT 
      RTRIM(el.fdListCode) as fdListCode,
      RTRIM(el.fdCustCode) as fdCustCode,
      RTRIM(c.fdCustName) as fdCustName,
      RTRIM(el.fdMarkingCode) as fdMarkingCode,
      RTRIM(el.fdMarkingNo) as fdMarkingNo,
      RTRIM(el.fdTerima) as fdTerima,
      RTRIM(el.fdInvoiceNo) as fdInvoiceNo,
      el.fdListDate,
      COALESCE(el.fdJmlPack, 0) as fdJmlPack,
      RTRIM(el.fdSatuan) as fdSatuan,
      CAST(COALESCE(el.fdJmlBerat, 0) as float) as fdJmlBerat,
      CAST(COALESCE(el.fdM3, 0) as float) as fdM3,
      RTRIM(el.fdComodity) as fdComodity,
      tm.fdAWB,
      tm.fdEtd,
      tm.fdExitDate
    FROM tbEntryList el WITH (NOLOCK)
    LEFT JOIN tbCustomers c WITH (NOLOCK) ON RTRIM(el.fdCustCode) = RTRIM(c.fdCustCode)
    LEFT JOIN tbMarking tm WITH (NOLOCK) ON RTRIM(el.fdMarkingCode) = RTRIM(tm.fdMarkingCode)
    WHERE RTRIM(el.fdTerima) IN (${Prisma.join(targetResiList)})
      AND (${custCode} = '' OR RTRIM(el.fdCustCode) = ${custCode})
    ORDER BY el.fdListDate DESC, el.fdListCode DESC
  `

  // 4. Kelompokkan per nomor resi (fdTerima)
  let partialResiCount = 0
  let crossMarkingCount = 0
  let totalColly = 0
  let totalBerat = 0
  let totalM3 = 0

  const groupedResi = targetResiList.map((resi) => {
    const records = occurrences.filter((o) => String(o.fdTerima || '').trim() === resi)
    const markingCodes = Array.from(new Set(records.map((r) => String(r.fdMarkingCode || '').trim()).filter(Boolean)))
    
    // Cek apakah ada di marking code lain dengan custCode yang sama (PARSIAL)
    const sameCustOtherMarkings = records.filter(
      (r) => String(r.fdCustCode || '').trim() === custCode && String(r.fdMarkingCode || '').trim() !== markingCode
    )
    const isPartial = sameCustOtherMarkings.length > 0
    if (isPartial) partialResiCount++

    const isCrossMarking = markingCodes.length > 1
    if (isCrossMarking) crossMarkingCount++

    const resiColly = records.reduce((sum, r) => sum + Number(r.fdJmlPack || 0), 0)
    const resiBerat = records.reduce((sum, r) => sum + Number(r.fdJmlBerat || 0), 0)
    const resiM3 = records.reduce((sum, r) => sum + Number(r.fdM3 || 0), 0)

    totalColly += resiColly
    totalBerat += resiBerat
    totalM3 += resiM3

    return {
      fdTerima: resi,
      isPartial,
      isCrossMarking,
      markingCodes,
      totalRecords: records.length,
      totalColly: resiColly,
      totalBerat: resiBerat,
      totalM3: resiM3,
      records: records.map((r) => ({
        fdListCode: r.fdListCode,
        fdCustCode: r.fdCustCode,
        fdCustName: r.fdCustName || '—',
        fdMarkingCode: r.fdMarkingCode,
        fdMarkingNo: r.fdMarkingNo || '—',
        fdInvoiceNo: r.fdInvoiceNo || '—',
        isCurrentBill: r.fdInvoiceNo === cleanInvNo || r.fdListCode === listCode,
        isCurrentMarking: r.fdMarkingCode === markingCode,
        isSameCustomer: r.fdCustCode === custCode,
        fdListDate: r.fdListDate ? new Date(r.fdListDate).toISOString() : null,
        fdJmlPack: Number(r.fdJmlPack || 0),
        fdSatuan: r.fdSatuan || '',
        fdJmlBerat: Number(r.fdJmlBerat || 0),
        fdM3: Number(r.fdM3 || 0),
        fdComodity: r.fdComodity || '',
        fdAWB: r.fdAWB ? String(r.fdAWB).trim() : null,
        fdEtd: r.fdEtd ? new Date(r.fdEtd).toISOString() : null,
        fdExitDate: r.fdExitDate ? new Date(r.fdExitDate).toISOString() : null,
      })),
    }
  })

  return {
    invNo: cleanInvNo,
    custCode,
    custName: bill.fdCustName || '—',
    markingCode,
    markingNo: bill.fdMarkingNo || '—',
    summary: {
      totalResi: targetResiList.length,
      isPartial: partialResiCount > 0,
      partialCount: partialResiCount,
      crossMarkingCount,
      totalColly,
      totalBerat,
      totalM3,
    },
    resiList: groupedResi,
  }
}

/**
 * Memperbarui rincian item tagihan (tbBillingDetail) secara atomik,
 * menghitung ulang grand total (fdJumlah1) di tbBilling, dan menyinkronkan tbBillingTotal via trigger database.
 */
export async function updateBillingDetails(
  invNo: string,
  items: import('./billing.types').BillingDetailUpdateItem[],
  userPayload?: { fdEmpCode?: string | null; username?: string; role?: string },
  saveToPrev: boolean = true
) {
  const cleanInvNo = invNo.trim()
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Rincian item tagihan tidak boleh kosong (minimal 1 baris item)')
  }

  // 1. Cek keberadaan invoice
  const billing = await prisma.tbBilling.findFirst({
    where: { fdInvNo: cleanInvNo },
    include: { details: true },
  })

  if (!billing) {
    throw new Error(`Invoice ${cleanInvNo} tidak ditemukan di database tbBilling.`)
  }

  // 1b. Proteksi Integritas Data: Kunci invoice jika sudah ISSUED (fdGive = 1) atau LUNAS / COLLECTED (fdGive2 = 1)
  const isIssued = Number(billing.fdGive || 0) === 1
  const isCollected = Number(billing.fdGive2 || 0) === 1
  const isSuperadmin = userPayload?.role === 'superadmin'

  if ((isIssued || isCollected) && !isSuperadmin) {
    const statusDesc = isCollected ? 'LUNAS / COLLECTED' : 'ISSUED'
    logger.warn(
      `Percobaan pengeditan rincian item invoice ${cleanInvNo} yang terkunci (${statusDesc}) oleh ${userPayload?.username || 'user'} ditolak.`
    )
    throw new Error(
      `Invoice ${cleanInvNo} telah berstatus ${statusDesc} dan telah dikunci. Perubahan rincian item tidak diizinkan demi integritas data akuntansi.`
    )
  }

  // 2. Format & validasi setiap item
  let totalJumlah1 = 0

  const preparedItems = items.map((item, idx) => {
    const rawName = String(item.fdItemName || '').trim()
    if (!rawName) {
      throw new Error(`Baris item #${idx + 1}: Deskripsi / Nama item wajib diisi.`)
    }
    const qty = Number(item.fdQty || 0)
    if (isNaN(qty) || qty < 0) {
      throw new Error(`Baris item "${rawName}": Kuantitas tidak boleh negatif.`)
    }
    const price = Number(item.fdItemPrice || 0)
    if (isNaN(price) || price < 0) {
      throw new Error(`Baris item "${rawName}": Harga satuan tidak boleh negatif.`)
    }
    // Jika qty = 0, subtotal = price * 1, selain itu subtotal = qty * price
    const multiplier = qty === 0 ? 1 : qty
    const total =
      item.fdTotal !== undefined && item.fdTotal !== null
        ? Number(item.fdTotal)
        : Math.round(multiplier * price)
    totalJumlah1 += total

    // Pastikan fdID 2 karakter (contoh: '01', '02', '03')
    const assignedID =
      item.fdID && item.fdID.trim().length <= 2
        ? item.fdID.trim().padStart(2, '0')
        : String(idx + 1).padStart(2, '0')

    return {
      fdInvNo: cleanInvNo,
      fdID: assignedID,
      fdItemName: rawName.slice(0, 100),
      fdListCode: item.fdListCode ? String(item.fdListCode).trim().slice(0, 7) : (billing.fdListType === 1 ? 'KG' : 'M3'),
      fdItemCode: item.fdItemCode ? String(item.fdItemCode).trim().slice(0, 7) : 'P0001',
      fdCurr: item.fdCurr ? String(item.fdCurr).trim().slice(0, 3) : 'RP.',
      fdQty: qty,
      fdItemPrice: price,
      fdTotal: total,
      fdSatuan: item.fdSatuan ? String(item.fdSatuan).trim().slice(0, 10) : '',
      fdComodity: item.fdComodity ? String(item.fdComodity).trim().slice(0, 100) : '',
      fdTypeComodity: item.fdTypeComodity !== undefined && item.fdTypeComodity !== null ? Number(item.fdTypeComodity) : 0,
    }
  })

  // Pastikan ID tidak ada duplikasi
  const idSet = new Set<string>()
  for (const prepItem of preparedItems) {
    let currentId = prepItem.fdID
    if (idSet.has(currentId)) {
      let nextNum = 1
      while (idSet.has(String(nextNum).padStart(2, '0'))) nextNum++
      currentId = String(nextNum).padStart(2, '0')
      prepItem.fdID = currentId
    }
    idSet.add(currentId)
  }

  // Urutkan preparedItems berdasarkan fdID ascending secara numerik
  preparedItems.sort((a, b) => a.fdID.localeCompare(b.fdID, undefined, { numeric: true }))

  // 3. Jalankan transaksi SQL atomik
  await prisma.$transaction(async (tx) => {
    // A. Hapus item lama yang tidak ada lagi di daftar item baru dari tbBillingDetail
    const newIdList = preparedItems.map((p) => p.fdID)
    await tx.$executeRaw`
      DELETE FROM tbBillingDetail 
      WHERE RTRIM(fdInvNo) = ${cleanInvNo} 
        AND RTRIM(fdID) NOT IN (${Prisma.join(newIdList)})
    `

    // Hapus juga dari tbBillingDetailPrev jika saveToPrev aktif
    if (saveToPrev) {
      await tx.$executeRaw`
        DELETE FROM tbBillingDetailPrev 
        WHERE RTRIM(fdInvNo) = ${cleanInvNo} 
          AND RTRIM(fdID) NOT IN (${Prisma.join(newIdList)})
      `
    }

    // B. Upsert setiap baris item
    for (const item of preparedItems) {
      // 1) Upsert ke tbBillingDetail
      const existingDetail = await tx.$queryRaw<any[]>`
        SELECT TOP 1 RTRIM(fdID) as fdID FROM tbBillingDetail WITH (NOLOCK)
        WHERE RTRIM(fdInvNo) = ${cleanInvNo} AND RTRIM(fdID) = ${item.fdID}
      `

      if (existingDetail && existingDetail.length > 0) {
        await tx.$executeRaw`
          UPDATE tbBillingDetail
          SET fdItemName = ${item.fdItemName},
              fdListCode = ${item.fdListCode},
              fdItemCode = ${item.fdItemCode},
              fdCurr = ${item.fdCurr},
              fdQty = ${item.fdQty},
              fdItemPrice = ${item.fdItemPrice},
              fdTotal = ${item.fdTotal},
              fdSatuan = ${item.fdSatuan},
              fdComodity = ${item.fdComodity},
              fdTypeComodity = ${item.fdTypeComodity}
          WHERE RTRIM(fdInvNo) = ${cleanInvNo} AND RTRIM(fdID) = ${item.fdID}
        `
      } else {
        await tx.$executeRaw`
          INSERT INTO tbBillingDetail (
            fdInvNo, fdID, fdListCode, fdItemCode, fdItemName, fdCurr, fdQty, fdItemPrice, fdTotal, fdSatuan, fdComodity, fdTypeComodity
          ) VALUES (
            ${item.fdInvNo}, ${item.fdID}, ${item.fdListCode}, ${item.fdItemCode}, ${item.fdItemName}, ${item.fdCurr}, ${item.fdQty}, ${item.fdItemPrice}, ${item.fdTotal}, ${item.fdSatuan}, ${item.fdComodity}, ${item.fdTypeComodity}
          )
        `
      }

      // 2) Upsert ke tbBillingDetailPrev jika saveToPrev aktif
      if (saveToPrev) {
        const existingPrev = await tx.$queryRaw<any[]>`
          SELECT TOP 1 RTRIM(fdID) as fdID FROM tbBillingDetailPrev WITH (NOLOCK)
          WHERE RTRIM(fdInvNo) = ${cleanInvNo} AND RTRIM(fdID) = ${item.fdID}
        `

        const prevTypeComodity =
          item.fdTypeComodity !== undefined && item.fdTypeComodity !== null
            ? String(item.fdTypeComodity)
            : null

        if (existingPrev && existingPrev.length > 0) {
          await tx.$executeRaw`
            UPDATE tbBillingDetailPrev
            SET fdItemName = ${item.fdItemName},
                fdListCode = ${item.fdListCode},
                fdItemCode = ${item.fdItemCode},
                fdCurr = ${item.fdCurr},
                fdQty = ${item.fdQty},
                fdItemPrice = ${item.fdItemPrice},
                fdTotal = ${item.fdTotal},
                fdSatuan = ${item.fdSatuan},
                fdTypeComodity = ${prevTypeComodity}
            WHERE RTRIM(fdInvNo) = ${cleanInvNo} AND RTRIM(fdID) = ${item.fdID}
          `
        } else {
          await tx.$executeRaw`
            INSERT INTO tbBillingDetailPrev (
              fdInvNo, fdID, fdListCode, fdItemCode, fdItemName, fdCurr, fdQty, fdItemPrice, fdTotal, fdSatuan, fdTypeComodity
            ) VALUES (
              ${item.fdInvNo}, ${item.fdID}, ${item.fdListCode}, ${item.fdItemCode}, ${item.fdItemName}, ${item.fdCurr}, ${item.fdQty}, ${item.fdItemPrice}, ${item.fdTotal}, ${item.fdSatuan}, ${prevTypeComodity}
            )
          `
        }
      }
    }

    // C. Update tbBilling.fdJumlah1
    // Update ini memicu trigger upd_bill yang secara otomatis menyinkronkan tabel tbBillingTotal (sp_tbBillingTotal)
    await tx.$executeRaw`
      UPDATE tbBilling
      SET fdJumlah1 = ${totalJumlah1},
          fdLoad = GETDATE()
      WHERE RTRIM(fdInvNo) = ${cleanInvNo}
    `
  })

  logger.info({
    event: 'billing_details_updated',
    invNo: cleanInvNo,
    itemCount: preparedItems.length,
    newTotal: totalJumlah1,
    savedToPrev: saveToPrev,
    user: userPayload?.username || userPayload?.fdEmpCode || 'system',
  })

  // 4. Return data billing terbaru lengkap
  return getBillingById(cleanInvNo)
}

/**
 * Mengambil data rincian dimensi fisik per coly dari tbEntryListDetail
 * untuk sekumpulan listCode (batch query)
 */
export async function getBatchEntryListDetails(listCodes: string[]) {
  const cleanListCodes = Array.from(
    new Set(listCodes.map((c) => String(c || '').trim()).filter((c) => c.length >= 4))
  )
  if (cleanListCodes.length === 0) return []

  const details = await safeRunRaw(async () => {
    return prisma.tbEntryListDetail.findMany({
      where: {
        fdListCode: { in: cleanListCodes },
      },
      orderBy: [
        { fdListCode: 'asc' },
        { fdListDCode: 'asc' },
      ],
      select: {
        fdListCode: true,
        fdListDCode: true,
        fdDescr: true,
        fdPjg: true,
        fdLbr: true,
        fdTng: true,
        fdQty: true,
        fdLoad: true,
      },
    })
  }, 'getBatchEntryListDetails')

  return (details || []).map((d) => {
    const pjg = Number(d.fdPjg || 0)
    const lbr = Number(d.fdLbr || 0)
    const tng = Number(d.fdTng || 0)
    const qty = Number(d.fdQty || 1)
    const m3 = parseFloat(((pjg * lbr * tng * qty) / 1000000).toFixed(4))
    return {
      fdListCode: d.fdListCode.trim(),
      fdListDCode: d.fdListDCode.trim(),
      fdDescr: d.fdDescr?.trim() || '',
      fdPjg: pjg,
      fdLbr: lbr,
      fdTng: tng,
      fdQty: qty,
      fdM3: m3,
      fdLoad: d.fdLoad,
    }
  })
}

export interface DimensionItem {
  fdListCode: string
  fdListDCode: string
  fdDescr: string
  fdPjg: number
  fdLbr: number
  fdTng: number
  fdQty: number
  fdM3: number
  fdMarkingCode?: string
  fdComodity?: string
  fdLoad?: Date | string | null
}

export interface DimensionGroup {
  items: DimensionItem[]
  totalQty: number
  totalM3: number
  count: number
}

export interface BillingDimensionsResponse {
  listCode: string
  entryList: DimensionGroup
  packingList: DimensionGroup
  komplain: DimensionGroup
}

/**
 * Mengambil detail ukuran fisik per koli (Panjang, Lebar, Tinggi, Qty, dan Hasil Hitungan M3)
 * dari tabel terkait:
 * - entrylist -> tbEntryListDetail
 * - packing list -> tbEntryListDetail_PackingList
 * - komplain -> tbEntryListDetail_Komplain
 */
export async function getBillingDimensions(listCodeInput: string): Promise<BillingDimensionsResponse> {
  const rawCodes = (listCodeInput || '').split(',').map((s) => s.trim()).filter(Boolean)
  const cleanCodes = rawCodes.length > 0 ? rawCodes : ['']
  const codeVariants = cleanCodes.flatMap((c) => [c, c.padStart(7, ' ')])

  const [rawEntryList, rawPackingList, rawKomplain] = await Promise.all([
    safeRunRaw(async () => {
      return prisma.tbEntryListDetail.findMany({
        where: { fdListCode: { in: codeVariants } },
        orderBy: [
          { fdListCode: 'asc' },
          { fdListDCode: 'asc' },
        ],
      })
    }, 'getDimensions_EntryList'),
    safeRunRaw(async () => {
      return prisma.tbEntryListDetailPackingList.findMany({
        where: { fdListCode: { in: codeVariants } },
        orderBy: [
          { fdListCode: 'asc' },
          { fdListDCode: 'asc' },
        ],
      })
    }, 'getDimensions_PackingList'),
    safeRunRaw(async () => {
      return prisma.tbEntryListDetailKomplain.findMany({
        where: { fdListCode: { in: codeVariants } },
        orderBy: [
          { fdListCode: 'asc' },
          { fdListDCode: 'asc' },
        ],
      })
    }, 'getDimensions_Komplain'),
  ])

  const mapItem = (row: any, extraFields?: (r: any) => Record<string, any>): DimensionItem => {
    const pjg = Number(row.fdPjg || 0)
    const lbr = Number(row.fdLbr || 0)
    const tng = Number(row.fdTng || 0)
    const qty = Number(row.fdQty || 0)
    // Formula resmi: (Panjang * Lebar * Tinggi * Qty) / 1,000,000 (cm^3 ke m^3)
    const m3 = parseFloat(((pjg * lbr * tng * qty) / 1000000).toFixed(4))
    return {
      fdListCode: (row.fdListCode || '').trim(),
      fdListDCode: (row.fdListDCode || '').trim(),
      fdDescr: (row.fdDescr || '').trim(),
      fdPjg: pjg,
      fdLbr: lbr,
      fdTng: tng,
      fdQty: qty,
      fdM3: m3,
      fdLoad: row.fdLoad || null,
      ...(extraFields ? extraFields(row) : {}),
    }
  }

  const buildGroup = (rawList: any[], extraFields?: (r: any) => Record<string, any>): DimensionGroup => {
    const items = (rawList || []).map((r) => mapItem(r, extraFields))
    const totalQty = items.reduce((sum, item) => sum + item.fdQty, 0)
    const totalM3 = parseFloat(items.reduce((sum, item) => sum + item.fdM3, 0).toFixed(4))
    return {
      items,
      totalQty,
      totalM3,
      count: items.length,
    }
  }

  return {
    listCode: cleanCodes.join(', '),
    entryList: buildGroup(rawEntryList || []),
    packingList: buildGroup(rawPackingList || [], (r) => ({
      fdMarkingCode: (r.fdMarkingCode || '').trim(),
      fdComodity: (r.fdComodity || '').trim(),
    })),
    komplain: buildGroup(rawKomplain || []),
  }
}

export interface BillingSuggestion {
  type: 'invoice' | 'customer' | 'marking'
  title: string
  subtitle: string
  value: string
  custCode?: string
}

export async function getBillingSuggestions(keyword: string, draftOnly = false): Promise<BillingSuggestion[]> {
  const cleanQ = (keyword || '').trim()
  if (!cleanQ || cleanQ.length < 2) return []

  const cacheKey = `billing:${draftOnly}:${cleanQ.toLowerCase()}`
  const cached = suggestionCache.get<BillingSuggestion[]>(cacheKey)
  if (cached) return cached

  const prefixLike = `${cleanQ}%`
  const searchLike = `%${cleanQ}%`

  try {
    // 1. Invoices query: prefix first, fallback to searchLike, bounded by fdInvDate >= '2023-01-01'
    // If draftOnly, exclude given (fdGive=1, fdGive2=1), checked (fdCekDate is not null), and paid (tbBillingTotal fdSLunas=1 or fdBayar>0)
    let invoices = draftOnly
      ? await prisma.$queryRaw<any[]>`
          SELECT TOP 5 
            RTRIM(ISNULL(b.fdInvNo, '')) AS fdInvNo, 
            RTRIM(ISNULL(b.fdCustCode, '')) AS fdCustCode, 
            RTRIM(ISNULL(b.fdMarkingCode, '')) AS fdMarkingCode
          FROM tbBilling b WITH (NOLOCK)
          WHERE b.fdInvDate >= '2023-01-01'
            AND b.fdInvNo LIKE ${prefixLike}
            AND ISNULL(b.fdGive, 0) <> 1
            AND ISNULL(b.fdGive2, 0) <> 1
            AND b.fdCekDate IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM tbBillingTotal bt WITH (NOLOCK)
              WHERE bt.fdInvNo = b.fdInvNo AND (ISNULL(bt.fdSLunas, 0) = 1 OR ISNULL(bt.fdBayar, 0) > 0)
            )
          ORDER BY b.fdInvDate DESC
        `.catch(() => [])
      : await prisma.$queryRaw<any[]>`
          SELECT TOP 5 
            RTRIM(ISNULL(b.fdInvNo, '')) AS fdInvNo, 
            RTRIM(ISNULL(b.fdCustCode, '')) AS fdCustCode, 
            RTRIM(ISNULL(b.fdMarkingCode, '')) AS fdMarkingCode
          FROM tbBilling b WITH (NOLOCK)
          WHERE b.fdInvDate >= '2023-01-01'
            AND b.fdInvNo LIKE ${prefixLike}
          ORDER BY b.fdInvDate DESC
        `.catch(() => [])

    if (!invoices || invoices.length === 0) {
      invoices = draftOnly
        ? await prisma.$queryRaw<any[]>`
            SELECT TOP 5 
              RTRIM(ISNULL(b.fdInvNo, '')) AS fdInvNo, 
              RTRIM(ISNULL(b.fdCustCode, '')) AS fdCustCode, 
              RTRIM(ISNULL(b.fdMarkingCode, '')) AS fdMarkingCode
            FROM tbBilling b WITH (NOLOCK)
            WHERE b.fdInvDate >= '2023-01-01'
              AND b.fdInvNo LIKE ${searchLike}
              AND ISNULL(b.fdGive, 0) <> 1
              AND ISNULL(b.fdGive2, 0) <> 1
              AND b.fdCekDate IS NULL
              AND NOT EXISTS (
                SELECT 1 FROM tbBillingTotal bt WITH (NOLOCK)
                WHERE bt.fdInvNo = b.fdInvNo AND (ISNULL(bt.fdSLunas, 0) = 1 OR ISNULL(bt.fdBayar, 0) > 0)
              )
            ORDER BY b.fdInvDate DESC
          `.catch(() => [])
        : await prisma.$queryRaw<any[]>`
            SELECT TOP 5 
              RTRIM(ISNULL(b.fdInvNo, '')) AS fdInvNo, 
              RTRIM(ISNULL(b.fdCustCode, '')) AS fdCustCode, 
              RTRIM(ISNULL(b.fdMarkingCode, '')) AS fdMarkingCode
            FROM tbBilling b WITH (NOLOCK)
            WHERE b.fdInvDate >= '2023-01-01'
              AND b.fdInvNo LIKE ${searchLike}
            ORDER BY b.fdInvDate DESC
          `.catch(() => [])
    }

    // 2. Customers & Markings queries
    const [customers, markings] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT TOP 5 
          RTRIM(ISNULL(fdCustCode, '')) AS fdCustCode, 
          RTRIM(ISNULL(fdCustName, '')) AS fdCustName
        FROM tbCustomers WITH (NOLOCK)
        WHERE (fdCustName LIKE ${searchLike} OR fdCustCode LIKE ${searchLike}) AND ISNULL(fdDiscontinued, 0) <> 1
        ORDER BY fdCustName ASC
      `.catch(() => []),
      prisma.$queryRaw<any[]>`
        SELECT TOP 5 
          RTRIM(ISNULL(fdMarkingCode, '')) AS fdMarkingCode, 
          RTRIM(ISNULL(fdConsignee, '')) AS fdConsignee
        FROM tbMarking WITH (NOLOCK)
        WHERE fdMarkingCode LIKE ${searchLike}
        ORDER BY fdSysDate DESC
      `.catch(() => []),
    ])

    const suggestions: BillingSuggestion[] = []
    const seen = new Set<string>()

    for (const inv of invoices) {
      if (inv.fdInvNo && !seen.has(`inv:${inv.fdInvNo}`)) {
        seen.add(`inv:${inv.fdInvNo}`)
        suggestions.push({
          type: 'invoice',
          title: inv.fdInvNo,
          subtitle: inv.fdMarkingCode ? `Marking: ${inv.fdMarkingCode}` : 'No. Invoice',
          value: inv.fdInvNo,
        })
      }
    }

    for (const cust of customers) {
      if (cust.fdCustCode && !seen.has(`cust:${cust.fdCustCode}`)) {
        seen.add(`cust:${cust.fdCustCode}`)
        suggestions.push({
          type: 'customer',
          title: cust.fdCustName,
          subtitle: `Customer (${cust.fdCustCode})`,
          value: cust.fdCustName,
          custCode: cust.fdCustCode,
        })
      }
    }

    for (const m of markings) {
      if (m.fdMarkingCode && !seen.has(`m:${m.fdMarkingCode}`)) {
        seen.add(`m:${m.fdMarkingCode}`)
        suggestions.push({
          type: 'marking',
          title: m.fdMarkingCode,
          subtitle: m.fdConsignee ? `Consignee: ${m.fdConsignee}` : 'Marking Code',
          value: m.fdMarkingCode,
        })
      }
    }

    const result = suggestions.slice(0, 10)
    suggestionCache.set(cacheKey, result)
    return result
  } catch {
    return []
  }
}

