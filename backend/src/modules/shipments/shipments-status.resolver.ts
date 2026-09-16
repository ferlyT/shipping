import { prisma } from '../../config/database'
import { Prisma } from '@prisma/client'
import type { MarkingDates, DeliveryInfo, BillingInfo, ShipmentStatus } from './shipments.types'

export const MARKING_STATUS_SELECT = {
  fdMarkingCode: true,
  fdLoadDate: true,
  fdETD: true,
  fdETA: true,
  fdExitDate: true,
  fdGudang: true,
} as const

export const EMPTY_MARKING: MarkingDates = {
  fdLoadDate: null,
  fdETD: null,
  fdETA: null,
  fdExitDate: null,
  fdGudang: null,
}

export interface BlockedFinanceInfo {
  isBlocked: boolean
  blockedBy: string | null
  blockedReason: string | null
}

export function resolveShipmentStatus(
  marking: MarkingDates | null | undefined,
  delivery: DeliveryInfo | null | undefined,
  billing: BillingInfo | null | undefined,
  fdCancel?: number | null,
  blockedInfo?: BlockedFinanceInfo | null
): ShipmentStatus {
  // fdCancel = 1 override semua status menjadi Canceled
  if (Number(fdCancel) === 1) {
    return { ...(marking || EMPTY_MARKING), statusLabel: 'Canceled', statusStep: -1 }
  }

  // Jika diblokir oleh Finance (fdBlocked = 1), kunci status pengiriman menjadi Blocked
  if (blockedInfo?.isBlocked) {
    return {
      ...(marking || EMPTY_MARKING),
      statusLabel: 'Blocked',
      statusStep: 10,
      isBlocked: true,
      blockedBy: blockedInfo.blockedBy,
      blockedReason: blockedInfo.blockedReason,
    }
  }

  if (!marking) {
    return { ...EMPTY_MARKING, statusLabel: 'Belum Ada Data Marking', statusStep: 0 }
  }

  const { fdLoadDate, fdETD, fdETA, fdExitDate } = marking

  if (fdExitDate) {
    if (billing?.isPaid) {
      return { ...marking, statusLabel: 'Paid', statusStep: 9 }
    }
    if (billing?.isPartiallyPaid) {
      return { ...marking, statusLabel: 'Partially Paid', statusStep: 8 }
    }
    if (billing?.isBilled) {
      return { ...marking, statusLabel: 'Billed', statusStep: 7 }
    }
    if (delivery?.isSent) {
      return { ...marking, statusLabel: 'Delivered', statusStep: 6 }
    }
    if (delivery?.hasDelivery) {
      return { ...marking, statusLabel: 'Delivery', statusStep: 5 }
    }
    return { ...marking, statusLabel: 'Warehouse', statusStep: 4 }
  }
  if (fdETA) {
    return { ...marking, statusLabel: 'ETA', statusStep: 3 }
  }
  if (fdETD) {
    return { ...marking, statusLabel: 'ETD', statusStep: 2 }
  }
  if (fdLoadDate) {
    return { ...marking, statusLabel: 'Loading', statusStep: 1 }
  }
  return { ...marking, statusLabel: 'Waiting', statusStep: 0 }
}

export async function getMarkingStatusMap(markingCodes: string[]) {
  const normalizedCodes = markingCodes.map((c) => c.trim()).filter(Boolean)
  const uniqueCodes = [...new Set(normalizedCodes)]
  if (uniqueCodes.length === 0) return new Map<string, MarkingDates>()

  const markings = await prisma.tbMarking.findMany({
    where: { fdMarkingCode: { in: uniqueCodes } },
    select: MARKING_STATUS_SELECT,
  })

  return new Map(markings.map((m) => [m.fdMarkingCode.trim(), m]))
}

export async function getDeliveryStatusMap(listCodes: string[]) {
  const normalizedCodes = listCodes.map((c) => c.trim()).filter(Boolean)
  const uniqueCodes = [...new Set(normalizedCodes)]
  if (uniqueCodes.length === 0) return new Map<string, DeliveryInfo>()

  const deliveries = await prisma.tbDelivery.findMany({
    where: { fdListCode: { in: uniqueCodes } },
    select: { fdListCode: true, fdSent: true },
  })

  const map = new Map<string, DeliveryInfo>()
  for (const d of deliveries) {
    const code = (d.fdListCode ?? '').trim()
    if (!code) continue
    const existing = map.get(code) ?? { hasDelivery: false, isSent: false }
    map.set(code, {
      hasDelivery: true,
      isSent: existing.isSent || d.fdSent === 1,
    })
  }
  return map
}

export async function getBillingStatusMap(listCodes: string[]) {
  const normalizedCodes = listCodes.map((c) => c.trim()).filter(Boolean)
  const uniqueCodes = [...new Set(normalizedCodes)]
  if (uniqueCodes.length === 0) return new Map<string, BillingInfo>()

  const billings = await prisma.tbBilling.findMany({
    where: { 
      fdListCode: { in: uniqueCodes },
      fdGive: 1 
    },
    include: {
      totals: true
    }
  })

  const map = new Map<string, BillingInfo>()
  for (const b of billings) {
    const code = (b.fdListCode ?? '').trim()
    if (!code) continue

    const totals = b.totals || []
    let isPaid = false
    let isPartiallyPaid = false

    if (totals.length > 0) {
      const isAllPaid = totals.every(t => Number(t.fdBayar || 0) >= Number(t.fdJumlah || 0))
      if (isAllPaid) {
        isPaid = true
      } else {
        const hasSomePayment = totals.some(t => Number(t.fdBayar || 0) > 0)
        if (hasSomePayment) {
          isPartiallyPaid = true
        }
      }
    }

    const existing = map.get(code)
    map.set(code, {
      isBilled: true,
      isPartiallyPaid: existing?.isPartiallyPaid || isPartiallyPaid,
      isPaid: existing?.isPaid || isPaid,
    })
  }
  return map
}

export async function getBlockedFinanceStatusMap(listCodes: string[]): Promise<Map<string, BlockedFinanceInfo>> {
  const normalizedCodes = listCodes.map((c) => c.trim()).filter(Boolean)
  const uniqueCodes = [...new Set(normalizedCodes)]
  if (uniqueCodes.length === 0) return new Map()

  try {
    const rows = await prisma.$queryRaw<any[]>`
      WITH Ranked AS (
        SELECT fdListCode, fdBlocked, RTRIM(fdCreated) as fdCreated, RTRIM(fdKeterangan) as fdKeterangan,
               ROW_NUMBER() OVER (PARTITION BY fdListCode ORDER BY fdID DESC) as rn
        FROM tbEntryList_Bloked_Finance WITH (NOLOCK)
        WHERE fdListCode IN (${Prisma.join(uniqueCodes)})
      )
      SELECT fdListCode, fdBlocked, fdCreated, fdKeterangan
      FROM Ranked
      WHERE rn = 1 AND fdBlocked = 1
    `

    const map = new Map<string, BlockedFinanceInfo>()
    for (const r of rows) {
      const code = (r.fdListCode ?? '').trim()
      if (!code) continue
      map.set(code, {
        isBlocked: Number(r.fdBlocked) === 1,
        blockedBy: r.fdCreated ? r.fdCreated.trim() : null,
        blockedReason: r.fdKeterangan ? r.fdKeterangan.trim() : null,
      })
    }
    return map
  } catch (err) {
    return new Map()
  }
}

export function buildSingleStatusCondition(status: number): Prisma.Sql {
  if (status === 10) {
    return Prisma.sql`fdListCode IN (
      SELECT fdListCode FROM (
        SELECT fdListCode, fdBlocked, ROW_NUMBER() OVER (PARTITION BY fdListCode ORDER BY fdID DESC) as rn
        FROM tbEntryList_Bloked_Finance WITH (NOLOCK)
      ) b WHERE b.rn = 1 AND b.fdBlocked = 1
    )`
  } else if (status === 0) {
    return Prisma.sql`(fdMarkingCode IS NULL OR fdMarkingCode = '' OR fdMarkingCode IN (SELECT fdMarkingCode FROM tbMarking WHERE fdLoadDate IS NULL AND fdETD IS NULL AND fdETA IS NULL AND fdExitDate IS NULL))`
  } else if (status === 1) {
    return Prisma.sql`fdMarkingCode IN (SELECT fdMarkingCode FROM tbMarking WHERE fdLoadDate IS NOT NULL AND fdETD IS NULL AND fdETA IS NULL AND fdExitDate IS NULL)`
  } else if (status === 2) {
    return Prisma.sql`fdMarkingCode IN (SELECT fdMarkingCode FROM tbMarking WHERE fdETD IS NOT NULL AND fdETA IS NULL AND fdExitDate IS NULL)`
  } else if (status === 3) {
    return Prisma.sql`fdMarkingCode IN (SELECT fdMarkingCode FROM tbMarking WHERE fdETA IS NOT NULL AND fdExitDate IS NULL)`
  } else if (status === 4) {
    return Prisma.sql`(fdMarkingCode IN (SELECT fdMarkingCode FROM tbMarking WHERE fdExitDate IS NOT NULL) AND fdListCode NOT IN (SELECT fdListCode FROM tbDelivery))`
  } else if (status === 5) {
    return Prisma.sql`(fdMarkingCode IN (SELECT fdMarkingCode FROM tbMarking WHERE fdExitDate IS NOT NULL) AND fdListCode IN (SELECT fdListCode FROM tbDelivery GROUP BY fdListCode HAVING MAX(ISNULL(fdSent, 0)) = 0))`
  } else if (status === 6) {
    return Prisma.sql`(fdMarkingCode IN (SELECT fdMarkingCode FROM tbMarking WHERE fdExitDate IS NOT NULL) AND fdListCode IN (SELECT fdListCode FROM tbDelivery WHERE fdSent = 1) AND fdListCode NOT IN (SELECT fdListCode FROM tbBilling WHERE fdGive = 1))`
  } else if (status === 7) {
    return Prisma.sql`(fdMarkingCode IN (SELECT fdMarkingCode FROM tbMarking WHERE fdExitDate IS NOT NULL) AND fdListCode IN (SELECT fdListCode FROM tbBilling WHERE fdGive = 1 AND fdInvNo NOT IN (SELECT fdInvNo FROM tbBillingTotal WHERE ISNULL(fdBayar, 0) > 0)))`
  } else if (status === 8) {
    return Prisma.sql`(fdMarkingCode IN (SELECT fdMarkingCode FROM tbMarking WHERE fdExitDate IS NOT NULL) AND fdListCode IN (SELECT fdListCode FROM tbBilling WHERE fdGive = 1 AND fdInvNo IN (SELECT fdInvNo FROM tbBillingTotal WHERE ISNULL(fdBayar, 0) > 0 AND ISNULL(fdBayar, 0) < ISNULL(fdJumlah, 0))))`
  } else if (status === 9) {
    return Prisma.sql`(fdMarkingCode IN (SELECT fdMarkingCode FROM tbMarking WHERE fdExitDate IS NOT NULL) AND fdListCode IN (SELECT fdListCode FROM tbBilling WHERE fdGive = 1 AND fdInvNo IN (SELECT fdInvNo FROM tbBillingTotal) AND fdInvNo NOT IN (SELECT fdInvNo FROM tbBillingTotal WHERE ISNULL(fdBayar, 0) < ISNULL(fdJumlah, 0))))`
  }
  return Prisma.sql`1=1`
}

export function buildSingleWordCondition(word: string, field: string, matchedCustCodes?: string[]): Prisma.Sql {
  const searchLike = `%${word}%`

  if (field === 'customer') {
    if (matchedCustCodes && matchedCustCodes.length > 0) {
      const inList = Prisma.join(matchedCustCodes.map((c) => Prisma.sql`${c}`), ', ')
      return Prisma.sql`(fdCustCode IN (${inList}) OR fdCustName LIKE ${searchLike})`
    }
    return Prisma.sql`fdCustName LIKE ${searchLike}`
  } else if (field === 'resi') {
    return Prisma.sql`fdTerima LIKE ${searchLike}`
  } else if (field === 'markingNo') {
    return Prisma.sql`fdMarkingNo LIKE ${searchLike}`
  } else if (field === 'markingCode') {
    return Prisma.sql`fdMarkingCode LIKE ${searchLike}`
  } else if (field === 'marking') {
    return Prisma.sql`(
      fdMarkingCode LIKE ${searchLike} OR 
      fdMarkingNo LIKE ${searchLike}
    )`
  } else if (field === 'tracking') {
    return Prisma.sql`fdLocalTrackingNo LIKE ${searchLike}`
  } else if (field === 'listCode') {
    return Prisma.sql`fdListCode LIKE ${searchLike}`
  } else if (field === 'customer_marking') {
    if (matchedCustCodes && matchedCustCodes.length > 0) {
      const inList = Prisma.join(matchedCustCodes.map((c) => Prisma.sql`${c}`), ', ')
      return Prisma.sql`(
        fdCustCode IN (${inList}) OR 
        fdCustName LIKE ${searchLike} OR 
        fdMarkingCode LIKE ${searchLike} OR 
        fdMarkingNo LIKE ${searchLike}
      )`
    }
    return Prisma.sql`(
      fdCustName LIKE ${searchLike} OR 
      fdMarkingCode LIKE ${searchLike} OR 
      fdMarkingNo LIKE ${searchLike}
    )`
  } else {
    // Sesuai instruksi: Pencarian resi dibatasi hanya pada resi (fdTerima), customer name, marking code, dan marking no
    // Jika ada matched customer codes dari tbCustomers, gunakan index fdCustCode pada tbEntryList untuk percepatan drastis
    if (matchedCustCodes && matchedCustCodes.length > 0) {
      const inList = Prisma.join(matchedCustCodes.map((c) => Prisma.sql`${c}`), ', ')
      return Prisma.sql`(
        fdCustCode IN (${inList}) OR
        fdTerima LIKE ${searchLike} OR 
        fdMarkingCode LIKE ${searchLike} OR 
        fdMarkingNo LIKE ${searchLike}
      )`
    }
    return Prisma.sql`(
      fdTerima LIKE ${searchLike} OR 
      fdCustName LIKE ${searchLike} OR 
      fdMarkingCode LIKE ${searchLike} OR 
      fdMarkingNo LIKE ${searchLike}
    )`
  }
}

export function buildTermCondition(term: string, field: string, matchedCustCodes?: string[]): Prisma.Sql {
  const words = term.split(/\s+/).map((w) => w.trim()).filter(Boolean)

  if (words.length <= 1) {
    return buildSingleWordCondition(term, field, matchedCustCodes)
  }

  const wordConditions = words.map((w) => buildSingleWordCondition(w, field, matchedCustCodes))
  return Prisma.sql`(${Prisma.join(wordConditions, ' AND ')})`
}

export async function buildShipmentConditions(query: Record<string, string | undefined>): Promise<Prisma.Sql[]> {
  const conditions: Prisma.Sql[] = []

  // 1. Multi-token Search
  const search = query.search?.trim()
  const searchField = query.searchField?.trim() || 'ALL'

  let matchedCustCodes: string[] = []
  if (search && (searchField === 'ALL' || searchField === 'customer' || searchField === 'customer_marking')) {
    try {
      const searchTerms = search.split(/[,\n;\r\t\s]+/).map((s) => s.trim()).filter(Boolean)
      const orClauses = searchTerms.map((t) => Prisma.sql`fdCustName LIKE ${'%' + t + '%'}`)
      if (orClauses.length > 0) {
        const custs = await prisma.$queryRaw<any[]>`
          SELECT TOP 50 RTRIM(fdCustCode) AS fdCustCode 
          FROM tbCustomers WITH (NOLOCK) 
          WHERE ${Prisma.join(orClauses, ' OR ')}
        `
        matchedCustCodes = custs.map((c) => c.fdCustCode).filter(Boolean)
      }
    } catch {
      // safe fallback jika koneksi sempat terputus
    }
  }

  if (search) {
    const terms = search
      .split(/[,\n;\r\t]+/)
      .map((s) => s.trim())
      .filter(Boolean)

    if (terms.length > 0) {
      const termConditions = terms.map((t) => buildTermCondition(t, searchField, matchedCustCodes))
      conditions.push(Prisma.sql`(${Prisma.join(termConditions, ' OR ')})`)
    }
  }

  // 2. Explicit Customer filter
  const customer = query.customer?.trim()
  if (customer && customer !== 'ALL') {
    conditions.push(Prisma.sql`fdCustName LIKE ${'%' + customer + '%'}`)
  }

  // 3. Explicit Marking filter
  const marking = query.marking?.trim()
  if (marking && marking !== 'ALL') {
    const cleanMarking = marking.replace(/[-\s]/g, '')
    conditions.push(Prisma.sql`(
      fdMarkingCode LIKE ${'%' + marking + '%'} OR 
      fdMarkingNo LIKE ${'%' + marking + '%'} OR 
      (ISNULL(fdMarkingCode, '') + ' ' + ISNULL(fdMarkingNo, '')) LIKE ${'%' + marking + '%'} OR 
      REPLACE(REPLACE(ISNULL(fdMarkingCode, '') + ISNULL(fdMarkingNo, ''), ' ', ''), '-', '') LIKE ${'%' + cleanMarking + '%'}
    )`)
  }

  // 4. Multi-variable List Type (e.g. "1", "2", "1,2")
  const listType = query.listType?.trim()
  if (listType && listType !== 'ALL') {
    const types = listType
      .split(',')
      .map((t) => parseInt(t.trim(), 10))
      .filter((n) => !isNaN(n))

    if (types.length === 1) {
      conditions.push(Prisma.sql`fdListType = ${types[0]}`)
    } else if (types.length > 1) {
      conditions.push(Prisma.sql`fdListType IN (${Prisma.join(types)})`)
    }
  }

  // 5. Multi-variable Branch (-- dan SG adalah sama)
  const branch = query.branch?.trim()
  if (branch && branch !== 'ALL') {
    const branches = branch
      .split(',')
      .map((b) => b.trim())
      .filter((b) => b && b !== 'ALL')

    const hasSg = branches.includes('SG') || branches.includes('--')
    const otherBranches = branches.filter((b) => b !== 'SG' && b !== '--')

    if (hasSg && otherBranches.length > 0) {
      conditions.push(
        Prisma.sql`(fdBranchCode IN (${Prisma.join(otherBranches)}) OR fdBranchCode IN ('SG', '--', '-') OR fdBranchCode IS NULL OR LTRIM(RTRIM(fdBranchCode)) = '')`
      )
    } else if (hasSg) {
      conditions.push(
        Prisma.sql`(fdBranchCode IN ('SG', '--', '-') OR fdBranchCode IS NULL OR LTRIM(RTRIM(fdBranchCode)) = '')`
      )
    } else if (otherBranches.length === 1) {
      conditions.push(Prisma.sql`fdBranchCode = ${otherBranches[0]}`)
    } else if (otherBranches.length > 1) {
      conditions.push(Prisma.sql`fdBranchCode IN (${Prisma.join(otherBranches)})`)
    }
  }

  // 6. Multi-variable Status
  const statusParam = query.status?.toString().trim()
  if (statusParam && statusParam !== 'ALL') {
    const rawStatuses = statusParam
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n))

    if (rawStatuses.length > 0) {
      const hasCancel = rawStatuses.includes(-1)
      const normalStatuses = rawStatuses.filter((s) => s !== -1)

      if (hasCancel && normalStatuses.length > 0) {
        const normalSqlList = normalStatuses.map(buildSingleStatusCondition)
        conditions.push(
          Prisma.sql`(ISNULL(fdCancel, 0) = 1 OR (ISNULL(fdCancel, 0) = 0 AND (${Prisma.join(normalSqlList, ' OR ')})))`
        )
      } else if (hasCancel) {
        conditions.push(Prisma.sql`ISNULL(fdCancel, 0) = 1`)
      } else if (normalStatuses.length > 0) {
        const normalSqlList = normalStatuses.map(buildSingleStatusCondition)
        conditions.push(
          Prisma.sql`(ISNULL(fdCancel, 0) = 0 AND (${Prisma.join(normalSqlList, ' OR ')}))`
        )
      }
    }
  }

  // 7. Filter Tahun Berdasarkan fdLoadDate -> tbMarking
  const yearParam = query.year?.toString().trim()
  if (yearParam && yearParam !== 'ALL' && yearParam !== 'all') {
    const targetYear = parseInt(yearParam, 10)
    if (!isNaN(targetYear)) {
      const startOfYear = new Date(targetYear, 0, 1)
      const startOfNextYear = new Date(targetYear + 1, 0, 1)
      conditions.push(
        Prisma.sql`fdMarkingCode IN (
          SELECT fdMarkingCode 
          FROM tbMarking WITH (NOLOCK) 
          WHERE fdLoadDate >= ${startOfYear} AND fdLoadDate < ${startOfNextYear}
        )`
      )
    }
  }

  return conditions
}
