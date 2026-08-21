import { prisma } from '../../config/database'
import { buildPagination, parsePagination } from '../../utils/pagination'

// ---------------------------------------------------------------------------
// Status Kirim
// Tahapan: fdLoadDate -> fdETD -> fdETA -> fdExitDate (dari tbMarking)
// Setelah fdExitDate terisi, tahapan lanjut dicek dari tbDelivery (by fdListCode):
//   - ada surat jalan (record tbDelivery ada)  -> Dalam Pengiriman
//   - fdSent = 1 pada surat jalan tsb           -> Terkirim
// ---------------------------------------------------------------------------

type MarkingDates = {
  fdLoadDate: Date | null
  fdETD: Date | null
  fdETA: Date | null
  fdExitDate: Date | null
  fdGudang: string | null
}

type DeliveryInfo = {
  hasDelivery: boolean
  isSent: boolean
}

export type ShipmentStatus = MarkingDates & {
  statusLabel: string
  statusStep: number // 0=menunggu loading .. 4=keluar gudang, 5=dalam pengiriman, 6=terkirim, 7=billed, 8=partially paid, 9=paid
}

type BillingInfo = {
  isBilled: boolean
  isPartiallyPaid: boolean
  isPaid: boolean
}

const MARKING_STATUS_SELECT = {
  fdMarkingCode: true,
  fdLoadDate: true,
  fdETD: true,
  fdETA: true,
  fdExitDate: true,
  fdGudang: true,
} as const

const EMPTY_MARKING: MarkingDates = {
  fdLoadDate: null,
  fdETD: null,
  fdETA: null,
  fdExitDate: null,
  fdGudang: null,
}

function resolveShipmentStatus(
  marking: MarkingDates | null | undefined,
  delivery: DeliveryInfo | null | undefined,
  billing: BillingInfo | null | undefined,
  fdCancel?: number | null
): ShipmentStatus {
  // fdCancel = 1 override semua status menjadi Canceled
  if (Number(fdCancel) === 1) {
    return { ...(marking || EMPTY_MARKING), statusLabel: 'Canceled', statusStep: -1 }
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

async function getMarkingStatusMap(markingCodes: string[]) {
  // Trim di sini penting: CHAR di SQL Server padding-insensitive saat dibandingkan lewat query,
  // tapi Map.get() di JS adalah exact string match. Tanpa trim, marking code yang sama tapi
  // beda panjang padding akan dianggap berbeda dan menyebabkan status di list vs detail tidak sinkron.
  const normalizedCodes = markingCodes.map((c) => c.trim()).filter(Boolean)
  const uniqueCodes = [...new Set(normalizedCodes)]
  if (uniqueCodes.length === 0) return new Map<string, MarkingDates>()

  const markings = await prisma.tbMarking.findMany({
    where: { fdMarkingCode: { in: uniqueCodes } },
    select: MARKING_STATUS_SELECT,
  })

  return new Map(markings.map((m) => [m.fdMarkingCode.trim(), m]))
}

async function getDeliveryStatusMap(listCodes: string[]) {
  // Sama seperti marking code, fdListCode juga CHAR dengan panjang berbeda antar tabel
  // (vwShipment Char(20) vs tbDelivery Char(7)), jadi tetap perlu trim di sisi JS.
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

async function getBillingStatusMap(listCodes: string[]) {
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

import { Prisma } from '@prisma/client'

// ---------------------------------------------------------------------------
// Multi-variable SQL condition builder
// ---------------------------------------------------------------------------

function buildSingleStatusCondition(status: number): Prisma.Sql {
  if (status === 0) {
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

function buildSingleWordCondition(word: string, field: string): Prisma.Sql {
  const searchLike = `%${word}%`

  if (field === 'customer') {
    return Prisma.sql`fdCustName LIKE ${searchLike}`
  } else if (field === 'resi') {
    return Prisma.sql`fdTerima LIKE ${searchLike}`
  } else if (field === 'marking') {
    return Prisma.sql`(
      fdMarkingCode LIKE ${searchLike} OR 
      fdMarkingNo LIKE ${searchLike} OR 
      (ISNULL(fdMarkingCode, '') + ' ' + ISNULL(fdMarkingNo, '')) LIKE ${searchLike}
    )`
  } else if (field === 'tracking') {
    return Prisma.sql`fdLocalTrackingNo LIKE ${searchLike}`
  } else if (field === 'listCode') {
    return Prisma.sql`fdListCode LIKE ${searchLike}`
  } else if (field === 'customer_marking') {
    return Prisma.sql`(
      fdCustName LIKE ${searchLike} OR 
      fdMarkingCode LIKE ${searchLike} OR 
      fdMarkingNo LIKE ${searchLike} OR 
      (ISNULL(fdMarkingCode, '') + ' ' + ISNULL(fdMarkingNo, '')) LIKE ${searchLike}
    )`
  } else {
    return Prisma.sql`(
      fdCustName LIKE ${searchLike} OR 
      fdMarkingCode LIKE ${searchLike} OR 
      fdMarkingNo LIKE ${searchLike} OR 
      (ISNULL(fdMarkingCode, '') + ' ' + ISNULL(fdMarkingNo, '')) LIKE ${searchLike} OR 
      fdListCode LIKE ${searchLike} OR 
      fdTerima LIKE ${searchLike} OR 
      fdLocalTrackingNo LIKE ${searchLike} OR 
      fdComodity LIKE ${searchLike}
    )`
  }
}

function buildTermCondition(term: string, field: string): Prisma.Sql {
  const words = term.split(/\s+/).map((w) => w.trim()).filter(Boolean)

  if (words.length <= 1) {
    return buildSingleWordCondition(term, field)
  }

  // Multi-word (e.g. "bintang buana gzd36"): setiap kata harus cocok pada salah satu field (AND antar kata)
  const wordConditions = words.map((w) => buildSingleWordCondition(w, field))
  return Prisma.sql`(${Prisma.join(wordConditions, ' AND ')})`
}

function buildShipmentConditions(query: Record<string, string | undefined>): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = []

  // 1. Multi-token Search (Support delimiter koma, titik-koma, newline, tab + multi-word AND)
  const search = query.search?.trim()
  const searchField = query.searchField?.trim() || 'ALL'

  if (search) {
    const terms = search
      .split(/[,\n;\r\t]+/)
      .map((s) => s.trim())
      .filter(Boolean)

    if (terms.length > 0) {
      const termConditions = terms.map((t) => buildTermCondition(t, searchField))
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

  // 2. Multi-variable List Type (e.g. "1", "2", "1,2")
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

  // 3. Multi-variable Branch (e.g. "Cabang Jakarta,Cabang Surabaya")
  const branch = query.branch?.trim()
  if (branch && branch !== 'ALL') {
    const branches = branch
      .split(',')
      .map((b) => b.trim())
      .filter((b) => b && b !== 'ALL')

    if (branches.length === 1) {
      conditions.push(Prisma.sql`fdBranchCode = ${branches[0]}`)
    } else if (branches.length > 1) {
      conditions.push(Prisma.sql`fdBranchCode IN (${Prisma.join(branches)})`)
    }
  }

  // 4. Multi-variable Status (e.g. "0,1,2", "-1,6")
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

  return conditions
}

// ---------------------------------------------------------------------------

export async function getShipments(query: Record<string, string | undefined>) {
  const { page, limit } = parsePagination(query)
  const { skip, take, meta } = buildPagination({ page, limit })

  const conditions = buildShipmentConditions(query)

  const whereClause = conditions.length > 0 
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` 
    : Prisma.empty

  // Execute raw SQL for data and count to bypass parameter limits
  const [rawData, countRes] = await Promise.all([
    prisma.$queryRaw<any[]>`
      SELECT * FROM vwShipment 
      ${whereClause} 
      ORDER BY fdListCode DESC 
      OFFSET ${skip} ROWS FETCH NEXT ${take} ROWS ONLY
    `,
    prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM vwShipment 
      ${whereClause}
    `
  ])

  const data = rawData
  const total = Number(countRes[0]?.count || 0)

  // Ambil status kirim (loaddate, etd, eta, exit, gudang) dari tbMarking + status lanjutan dari tbDelivery + status billing
  // untuk semua baris pada halaman ini sekaligus (batch, hindari N+1 query)
  const [markingMap, deliveryMap, billingMap] = await Promise.all([
    getMarkingStatusMap(data.map((d) => d.fdMarkingCode ?? '')),
    getDeliveryStatusMap(data.map((d) => d.fdListCode ?? '')),
    getBillingStatusMap(data.map((d) => d.fdListCode ?? '')),
  ])

  const dataWithStatus = data.map((row) => ({
    ...row,
    shipmentStatus: resolveShipmentStatus(
      row.fdMarkingCode ? markingMap.get(row.fdMarkingCode.trim()) : null,
      row.fdListCode ? deliveryMap.get(row.fdListCode.trim()) : null,
      row.fdListCode ? billingMap.get(row.fdListCode.trim()) : null,
      row.fdCancel
    ),
  }))

  return { data: dataWithStatus, meta: meta(total) }
}

export async function getShipmentById(id: string) {
  const shipment = await prisma.vwShipment.findUnique({
    where: { fdListCode: id },
  })

  if (!shipment) return null

  const marking = shipment.fdMarkingCode
    ? await prisma.tbMarking.findUnique({
      where: { fdMarkingCode: shipment.fdMarkingCode.trim() },
      select: MARKING_STATUS_SELECT,
    })
    : null

  let delivery: DeliveryInfo | null = null
  let billing: BillingInfo | null = null
  if (marking?.fdExitDate) {
    const deliveries = await prisma.tbDelivery.findMany({
      where: { fdListCode: shipment.fdListCode.trim() },
      select: { fdSent: true },
    })
    delivery = {
      hasDelivery: deliveries.length > 0,
      isSent: deliveries.some((d) => d.fdSent === 1),
    }

    const billings = await prisma.tbBilling.findMany({
      where: { fdListCode: shipment.fdListCode.trim(), fdGive: 1 },
      include: { totals: true },
    })
    
    if (billings.length > 0) {
      billing = { isBilled: true, isPartiallyPaid: false, isPaid: false }
      for (const b of billings) {
        const totals = b.totals || []
        if (totals.length > 0) {
          const isAllPaid = totals.every(t => Number(t.fdBayar || 0) >= Number(t.fdJumlah || 0))
          if (isAllPaid) {
            billing.isPaid = true
          } else {
            const hasSomePayment = totals.some(t => Number(t.fdBayar || 0) > 0)
            if (hasSomePayment) {
              billing.isPartiallyPaid = true
            }
          }
        }
      }
    }
  }

  return {
    ...shipment,
    shipmentStatus: resolveShipmentStatus(marking, delivery, billing, shipment.fdCancel),
  }
}

export async function getShipmentDimensions(id: string) {
  // list dimensions based on listcode
  // fdListCode in vwShipmentDimensionWH is Char(7), might need trimming or exact match
  return prisma.vwShipmentDimensionWH.findMany({
    where: { fdListCode: id }
  })
}

export async function getShipmentsKPIs(query: Record<string, string | undefined>) {
  const conditions = buildShipmentConditions(query)
  const whereClause = conditions.length > 0 
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` 
    : Prisma.empty

  const [countRes, aggregateRes] = await Promise.all([
    prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM vwShipment 
      ${whereClause}
    `,
    prisma.$queryRaw<any[]>`
      SELECT 
        SUM(CAST(ISNULL(fdJmlPack, 0) AS BIGINT)) as totalPackages,
        SUM(CAST(ISNULL(fdJmlBerat, 0) AS FLOAT)) as totalBerat,
        SUM(CAST(ISNULL(fdM3, 0) AS FLOAT)) as totalVolume
      FROM vwShipment 
      ${whereClause}
    `,
  ])

  return {
    totalResi: Number(countRes[0]?.count || 0),
    totalPackages: Number(aggregateRes[0]?.totalPackages || 0),
    totalBerat: Number(aggregateRes[0]?.totalBerat || 0),
    totalVolume: Number(aggregateRes[0]?.totalVolume || 0),
  }
}

export async function getShipmentBranches() {
  const branches = await prisma.vwShipment.findMany({
    select: { fdBranchCode: true },
    distinct: ['fdBranchCode']
  })
  return branches
    .map(b => b.fdBranchCode?.trim() || 'Unassigned')
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort()
}

// ---------------------------------------------------------------------------
// Dimension detail tables
// ---------------------------------------------------------------------------

export async function getDimensionsGudang(id: string) {
  return prisma.tbEntryListDetail.findMany({
    where: { fdListCode: id },
    orderBy: { fdListDCode: 'asc' },
  })
}

export async function getDimensionsPackingList(id: string) {
  return prisma.tbEntryListDetailPackingList.findMany({
    where: { fdListCode: id },
    orderBy: { fdListDCode: 'asc' },
  })
}

export async function getDimensionsKomplain(id: string) {
  return prisma.tbEntryListDetailKomplain.findMany({
    where: { fdListCode: id },
    orderBy: { fdListDCode: 'asc' },
  })
}