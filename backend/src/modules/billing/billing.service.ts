import { prisma } from '../../config/database'
import { logger } from '../../config/logger'
import { Prisma } from '@prisma/client'
import { buildPagination, parsePagination } from '../../utils/pagination'
import { safeRunRaw } from './billing-validation.service'

// Re-export domain modules for full backwards compatibility
export * from './billing.types'
export * from './billing-category.matcher'
export * from './billing-analytics.service'
export * from './billing-validation.service'

/**
 * Core Billing Queries & CRUD
 */

export async function getBillings(query: Record<string, string | undefined>) {
  const { page, limit } = parsePagination(query)
  const { skip, take, meta } = buildPagination({ page, limit })

  const search = query.search?.trim()
  const hasAmount = query.hasAmount === 'true' || query.validOnly === 'true'

  let custCodesFromSearch: string[] = []
  let empCodesFromSearch: string[] = []
  let markingCodesFromSearch: string[] = []

  if (search) {
    const [matchingCustomers, matchingEmployees, matchingMarkings] = await Promise.all([
      prisma.tbCustomers.findMany({
        where: {
          OR: [
            { fdCustName: { contains: search } },
            { fdCustCode: { contains: search } },
          ],
        },
        select: { fdCustCode: true },
        take: 500,
      }),
      prisma.tbEmployees.findMany({
        where: {
          OR: [
            { fdEmpName: { contains: search } },
            { fdEmpCode: { contains: search } },
          ],
        },
        select: { fdEmpCode: true },
        take: 50,
      }),
      prisma.tbMarking.findMany({
        where: {
          fdConsignee: { contains: search },
        },
        select: { fdMarkingCode: true },
        take: 500,
      }),
    ])
    custCodesFromSearch = matchingCustomers.map((c) => c.fdCustCode.trim())
    empCodesFromSearch = matchingEmployees.map((e) => e.fdEmpCode.trim())
    markingCodesFromSearch = matchingMarkings.map((m) => m.fdMarkingCode.trim())
  }

  const draftOnly = query.draftOnly === 'true' || query.status === 'draft'
  const statusFilter = query.status?.toLowerCase()

  const whereConditions: Prisma.TbBillingWhereInput[] = []

  if (search) {
    whereConditions.push({
      OR: [
        { fdInvNo: { contains: search } },
        { fdDescr: { contains: search } },
        { fdCustCode: { contains: search } },
        { fdMarkingCode: { contains: search } },
        { fdMarkingNo: { contains: search } },
        { fdListCode: { contains: search } },
        ...(custCodesFromSearch.length > 0
          ? [{ fdCustCode: { in: custCodesFromSearch } }]
          : []),
        ...(empCodesFromSearch.length > 0
          ? [{ fdEmpCode: { in: empCodesFromSearch } }]
          : []),
        ...(markingCodesFromSearch.length > 0
          ? [{ fdMarkingCode: { in: markingCodesFromSearch } }]
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
  } else if (statusFilter === 'lunas' || statusFilter === 'collected') {
    whereConditions.push({
      AND: [
        { fdGive: 1 },
        {
          OR: [
            { fdGive2: 1 },
            { totals: { some: { fdSLunas: 1 } } },
          ],
        },
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
        totals: {
          select: {
            fdJumlah: true,
            fdBayar: true,
            fdSLunas: true,
            fdFinish: true,
          },
        },
        details: {
          select: {
            fdItemName: true,
            fdListCode: true,
            fdComodity: true,
          },
        },
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

  // Collect unique marking codes to fetch consignee
  const allMarkingCodes = new Set<string>()
  data.forEach((d) => {
    if (d.fdMarkingCode) {
      d.fdMarkingCode.split(';').forEach((c) => {
        const trimmed = c.trim()
        if (trimmed) allMarkingCodes.add(trimmed)
      })
    }
  })

  let consigneeMap = new Map<string, string>()
  if (allMarkingCodes.size > 0) {
    const markings = await prisma.tbMarking.findMany({
      where: { fdMarkingCode: { in: Array.from(allMarkingCodes) } },
      select: { fdMarkingCode: true, fdConsignee: true },
    })
    consigneeMap = new Map(
      markings
        .filter((m) => m.fdConsignee && m.fdConsignee.trim())
        .map((m) => [m.fdMarkingCode.trim(), m.fdConsignee.trim()])
    )
  }

  const now = new Date()

  const mappedData = data.map(d => {
    const { fdEmpCode, totals, ...rest } = d

    const invDate = d.fdInvDate ? new Date(d.fdInvDate) : null
    const ageDays = invDate ? Math.floor((now.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
    const isIssued = Number(d.fdGive) === 1
    const isCollected = Number(d.fdGive2) === 1

    const totalJumlah = (totals && totals.length > 0)
      ? totals.reduce((sum, t) => sum + Number(t.fdJumlah || 0), 0)
      : Number(d.fdJumlah1 || 0)

    const totalBayar = (totals && totals.length > 0)
      ? totals.reduce((sum, t) => sum + Number(t.fdBayar || 0), 0)
      : 0

    const hasSLunas = totals?.some(t => t.fdSLunas === 1)

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
      const codes = d.fdMarkingCode.split(';').map((c) => c.trim()).filter(Boolean)
      const consignees = codes.map((c) => consigneeMap.get(c)).filter(Boolean)
      if (consignees.length > 0) {
        fdConsignee = [...new Set(consignees)].join(', ')
      }
    }

    return {
      ...rest,
      totals,
      totalJumlah,
      totalBayar,
      sisaBayar: Math.max(0, totalJumlah - totalBayar),
      paymentStatus,
      fdConsignee,
      employee: fdEmpCode ? { fdEmpName: empMap.get(fdEmpCode.trim()) || null } : null
    }
  })

  return { data: mappedData, meta: meta(total) }
}

export async function getBillingById(id: string) {
  const cleanId = id.trim()
  let data = await prisma.tbBilling.findUnique({
    where: { fdInvNo: cleanId },
    include: {
      details: { orderBy: { fdID: 'asc' } },
      customer: { select: { fdCustName: true, fdBlocked: true, fdBillTo: true, fdContact: true, fdBillAddr1: true, fdSalesNM: true, fdBroker: true } },
    }
  })

  // If not found and cleanId is a combined bill (e.g. SGS-A01783-09-2026), fallback to parent (e.g. SGS-001783-09-2026)
  if (!data) {
    const parts = cleanId.split('-')
    if (parts.length >= 4 && parts[1] && /^[A-Za-z]/.test(parts[1])) {
      const parentNum = '0' + parts[1].slice(1)
      const parentInvNo = `${parts[0]}-${parentNum}-${parts[2]}-${parts[3]}`
      data = await prisma.tbBilling.findUnique({
        where: { fdInvNo: parentInvNo },
        include: {
          details: { orderBy: { fdID: 'asc' } },
          customer: { select: { fdCustName: true, fdBlocked: true, fdBillTo: true, fdContact: true, fdBillAddr1: true, fdSalesNM: true, fdBroker: true } },
        }
      })
    }
  }

  if (!data) return null

  let fdTypeComodity: number | null = null
  let fdTypeComodityName: string | null = null
  let fdComodity: string | null = null
  let fdTglAgent: string | null = null
  let fdConsignee: string | null = null

  const is7DigitListCode = (c?: string | null): boolean => !!c && /^\d{5,8}$/.test(c.trim())

  let resolvedListCode = ''
  if (is7DigitListCode(data.fdListCode)) {
    resolvedListCode = data.fdListCode!.trim()
  } else if (data.details && data.details.length > 0) {
    const found = data.details.find((d) => is7DigitListCode(d.fdListCode))
    if (found?.fdListCode) {
      resolvedListCode = found.fdListCode.trim()
    }
  }

  const markingCode = data.fdMarkingCode?.trim() || ''

  // 1. Query tbEntryList for fdTglAgent, fdComodity, fdTypeComodity using fdListCode
  if (resolvedListCode) {
    const entryListInfo = await safeRunRaw(async () => {
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
        WHERE e.fdListCode = ${resolvedListCode}
      `
    }, 'get_entrylist_info')

    if (entryListInfo && entryListInfo.length > 0) {
      const row = entryListInfo[0]
      if (row.fdTglAgent) {
        fdTglAgent = new Date(row.fdTglAgent).toISOString()
      }
      if (row.fdTypeComodity !== null && row.fdTypeComodity !== undefined) {
        fdTypeComodity = Number(row.fdTypeComodity)
      }
      if (row.fdComodity) {
        fdComodity = String(row.fdComodity).trim()
      }
      if (row.fdTypeComodityName) {
        fdTypeComodityName = String(row.fdTypeComodityName).trim()
      }
    }
  }

  // 2. Query tbMarking for fdConsignee using fdMarkingCode
  if (markingCode) {
    const markingCodes = markingCode.split(';').map((c) => c.trim()).filter(Boolean)
    const markingInfo = await safeRunRaw(async () => {
      return prisma.tbMarking.findMany({
        where: { fdMarkingCode: { in: markingCodes } },
        select: { fdMarkingCode: true, fdConsignee: true },
      })
    }, 'get_marking_consignee')

    if (markingInfo && markingInfo.length > 0) {
      const consignees = markingInfo
        .map((m) => (m.fdConsignee ? String(m.fdConsignee).trim() : ''))
        .filter(Boolean)
      if (consignees.length > 0) {
        fdConsignee = Array.from(new Set(consignees)).join(', ')
      }
    }
  }

  // 3. Query tbCashierDetail for payment status, cashierID, cashierDate
  const cleanInvNo = data.fdInvNo.trim()
  let isPaid = false
  let paymentStatus: 'LUNAS' | 'SEBAGIAN' | 'BELUM LUNAS' = 'BELUM LUNAS'
  let cashierID: string | null = null
  let cashierDate: string | null = null
  let totalPaid = 0
  let cashierDetails: any[] = []

  const cashierRows = await safeRunRaw(async () => {
    return prisma.$queryRaw<any[]>`
      SELECT 
        RTRIM(fdCashierID) as fdCashierID,
        fdDate,
        RTRIM(fdType) as fdType,
        RTRIM(fdCCYCode) as fdCCYCode,
        fdAmount,
        fdTotal
      FROM tbCashierDetail WITH (NOLOCK)
      WHERE fdInvNo = ${cleanInvNo}
      ORDER BY fdDate DESC
    `
  }, 'get_cashier_payment')

  if (cashierRows && cashierRows.length > 0) {
    cashierDetails = cashierRows.map((r) => ({
      fdCashierID: r.fdCashierID ? String(r.fdCashierID).trim() : null,
      fdDate: r.fdDate ? new Date(r.fdDate).toISOString() : null,
      fdType: r.fdType ? String(r.fdType).trim() : null,
      fdCCYCode: r.fdCCYCode ? String(r.fdCCYCode).trim() : null,
      fdAmount: Number(r.fdAmount || 0),
      fdTotal: Number(r.fdTotal || 0),
    }))

    totalPaid = cashierDetails.reduce((sum, item) => sum + (item.fdTotal || item.fdAmount || 0), 0)
    const billTotal = Number(data.fdJumlah2 || 0) > 0 ? Number(data.fdJumlah2) : Number(data.fdJumlah1 || 0)

    isPaid = totalPaid > 0
    paymentStatus = totalPaid >= billTotal && billTotal > 0 ? 'LUNAS' : (totalPaid > 0 ? 'SEBAGIAN' : 'BELUM LUNAS')
    cashierID = cashierDetails[0]?.fdCashierID || null
    cashierDate = cashierDetails[0]?.fdDate || null
  }

  let employee = null
  if (data.fdEmpCode) {
    const emp = await prisma.tbEmployees.findFirst({
      where: { fdEmpCode: data.fdEmpCode.trim() },
      select: { fdEmpName: true }
    })
    if (emp) employee = { fdEmpName: emp.fdEmpName.trim() }
  }

  // Query penyerah invoice dari tbBillingGiveEmp jika sudah ada
  let giveEmployee: { fdEmpId: string | null; fdEmpName: string | null } | null = null
  const giveEmpRow = await safeRunRaw(async () => {
    return prisma.$queryRaw<any[]>`
      SELECT TOP 1 RTRIM(ge.fdEmpId) as fdEmpId, RTRIM(e.fdEmpName) as fdEmpName
      FROM tbBillingGiveEmp ge WITH (NOLOCK)
      LEFT JOIN tbEmployees e WITH (NOLOCK) ON RTRIM(ge.fdEmpId) = RTRIM(e.fdEmpCode)
      WHERE ge.fdInvNo = ${cleanInvNo}
    `
  }, 'get_billing_give_emp')

  if (giveEmpRow && giveEmpRow.length > 0 && giveEmpRow[0]?.fdEmpId) {
    giveEmployee = {
      fdEmpId: giveEmpRow[0].fdEmpId || null,
      fdEmpName: giveEmpRow[0].fdEmpName || null,
    }
  }

  // Query nomor resi (fdTerima) dan cek apakah parsial (muncul di marking code lain untuk customer yang sama)
  let resiSummary: { isPartial: boolean; totalResi: number; resiList: string[]; primaryResi?: string | null } = {
    isPartial: false,
    totalResi: 0,
    resiList: [],
    primaryResi: null,
  }

  const billingCustCode = data.fdCustCode ? data.fdCustCode.trim() : ''
  const billingListCode = resolvedListCode || (data.fdListCode ? data.fdListCode.trim() : '')

  const resiRows = await safeRunRaw(async () => {
    if (billingListCode) {
      return prisma.$queryRaw<any[]>`
        SELECT DISTINCT RTRIM(el.fdTerima) as fdTerima
        FROM tbEntryList el WITH (NOLOCK)
        WHERE (el.fdInvoiceNo = ${cleanInvNo} OR el.fdListCode = ${billingListCode})
          AND el.fdTerima IS NOT NULL
          AND el.fdTerima NOT IN ('', '-', '.', 'SIN', 'SIN/AIR')
      `
    }
    return prisma.$queryRaw<any[]>`
      SELECT DISTINCT RTRIM(el.fdTerima) as fdTerima
      FROM tbEntryList el WITH (NOLOCK)
      WHERE (
        el.fdInvoiceNo = ${cleanInvNo}
        OR (${billingCustCode} <> '' AND ${markingCode} <> '' AND el.fdCustCode = ${billingCustCode} AND el.fdMarkingCode = ${markingCode})
      )
      AND el.fdTerima IS NOT NULL
      AND el.fdTerima NOT IN ('', '-', '.', 'SIN', 'SIN/AIR')
    `
  }, 'get_billing_resi_summary')

  if (resiRows && resiRows.length > 0) {
    const rawResiList = resiRows.map((r) => String(r.fdTerima || '').trim()).filter(Boolean)
    const uniqueResiList = Array.from(new Set(rawResiList))

    let isPartial = false
    if (uniqueResiList.length > 0 && billingCustCode) {
      const partialCheck = await safeRunRaw(async () => {
        return prisma.$queryRaw<any[]>`
          SELECT TOP 1 1
          FROM tbEntryList el WITH (NOLOCK)
          WHERE el.fdCustCode = ${billingCustCode}
            AND el.fdTerima IN (${Prisma.join(uniqueResiList)})
            AND el.fdMarkingCode <> ${markingCode}
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

  // Lookup salesCode from tbSales (tbCustomers join tbSales on fdSalesNM)
  let fdSalesCode: string | null = null
  const custSalesNM = data.customer?.fdSalesNM ? data.customer.fdSalesNM.trim() : ''
  if (custSalesNM) {
    const salesRow = await safeRunRaw(async () => {
      return prisma.$queryRaw<any[]>`
        SELECT TOP 1 RTRIM(fdSalesCode) as fdSalesCode, RTRIM(fdSalesNM) as fdSalesNM
        FROM tbSales WITH (NOLOCK)
        WHERE LTRIM(RTRIM(fdSalesNM)) = ${custSalesNM}
      `
    }, 'get_sales_code')

    if (salesRow && salesRow.length > 0 && salesRow[0]?.fdSalesCode) {
      fdSalesCode = String(salesRow[0].fdSalesCode).trim()
    }
  }

  const customer = data.customer ? {
    ...data.customer,
    fdSalesCode: fdSalesCode || data.customer.fdSalesNM?.trim() || null,
  } : null

  const { fdEmpCode, customer: _origCust, ...rest } = data
  return {
    ...rest,
    customer,
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

  // 1. Ambil info bill
  const billRows = await prisma.$queryRaw<any[]>`
    SELECT TOP 1
      RTRIM(b.fdInvNo) as fdInvNo,
      RTRIM(b.fdListCode) as fdListCode,
      RTRIM(b.fdCustCode) as fdCustCode,
      RTRIM(c.fdCustName) as fdCustName,
      RTRIM(b.fdMarkingCode) as fdMarkingCode,
      RTRIM(b.fdMarkingNo) as fdMarkingNo
    FROM tbBilling b WITH (NOLOCK)
    LEFT JOIN tbCustomers c WITH (NOLOCK) ON RTRIM(b.fdCustCode) = RTRIM(c.fdCustCode)
    WHERE RTRIM(b.fdInvNo) = ${cleanInvNo}
  `

  if (!billRows || billRows.length === 0) {
    throw new Error(`Invoice ${cleanInvNo} tidak ditemukan`)
  }

  const bill = billRows[0]
  const custCode = bill.fdCustCode || ''
  const markingCode = bill.fdMarkingCode || ''
  const listCode = bill.fdListCode || ''

  // 2. Kumpulkan semua fdTerima dari bill ini
  const billResiRows = await prisma.$queryRaw<any[]>`
    SELECT DISTINCT RTRIM(el.fdTerima) as fdTerima
    FROM tbEntryList el WITH (NOLOCK)
    WHERE (
      RTRIM(el.fdInvoiceNo) = ${cleanInvNo}
      OR (${listCode} <> '' AND RTRIM(el.fdListCode) = ${listCode})
      OR (${custCode} <> '' AND ${markingCode} <> '' AND RTRIM(el.fdCustCode) = ${custCode} AND RTRIM(el.fdMarkingCode) = ${markingCode})
    )
    AND el.fdTerima IS NOT NULL
    AND RTRIM(el.fdTerima) NOT IN ('', '-', '.')
  `

  let targetResiList = (billResiRows || []).map((r) => String(r.fdTerima || '').trim()).filter(Boolean)

  if (searchResi && searchResi.trim()) {
    const cleanSearch = searchResi.trim()
    if (!targetResiList.includes(cleanSearch)) {
      targetResiList.unshift(cleanSearch)
    }
  }

  targetResiList = Array.from(new Set(targetResiList))

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

  // 3. Query seluruh kemunculan fdTerima ini di tbEntryList
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

