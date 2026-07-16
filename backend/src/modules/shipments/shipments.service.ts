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
  billing: BillingInfo | null | undefined
): ShipmentStatus {
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

export async function getShipments(query: Record<string, string | undefined>) {
  const { page, limit } = parsePagination(query)
  const { skip, take, meta } = buildPagination({ page, limit })

  const search = query.search?.trim()
  const listType = query.listType
  const branch = query.branch?.trim()
  const statusParam = query.status

  const conditions: Prisma.Sql[] = []

  if (search) {
    const searchStarts = `${search}%`
    const searchLike = `%${search}%`
    conditions.push(Prisma.sql`(
      fdListCode LIKE ${searchStarts} OR 
      fdMarkingCode LIKE ${searchStarts} OR 
      fdTerima LIKE ${searchStarts} OR 
      fdLocalTrackingNo LIKE ${searchStarts} OR 
      fdCustName LIKE ${searchLike}
    )`)
  }

  if (listType !== undefined && listType !== '' && listType !== 'ALL') {
    conditions.push(Prisma.sql`fdListType = ${parseInt(listType, 10)}`)
  }

  if (branch && branch !== 'ALL') {
    conditions.push(Prisma.sql`fdBranchCode = ${branch}`)
  }

  if (statusParam && statusParam !== 'ALL') {
    const status = parseInt(statusParam, 10)
    
    if (status === 0) {
      conditions.push(Prisma.sql`(fdMarkingCode IS NULL OR fdMarkingCode = '' OR fdMarkingCode IN (SELECT fdMarkingCode FROM tbMarking WHERE fdLoadDate IS NULL AND fdETD IS NULL AND fdETA IS NULL AND fdExitDate IS NULL))`)
    } else if (status === 1) {
      conditions.push(Prisma.sql`fdMarkingCode IN (SELECT fdMarkingCode FROM tbMarking WHERE fdLoadDate IS NOT NULL AND fdETD IS NULL AND fdETA IS NULL AND fdExitDate IS NULL)`)
    } else if (status === 2) {
      conditions.push(Prisma.sql`fdMarkingCode IN (SELECT fdMarkingCode FROM tbMarking WHERE fdETD IS NOT NULL AND fdETA IS NULL AND fdExitDate IS NULL)`)
    } else if (status === 3) {
      conditions.push(Prisma.sql`fdMarkingCode IN (SELECT fdMarkingCode FROM tbMarking WHERE fdETA IS NOT NULL AND fdExitDate IS NULL)`)
    } else if (status === 4) {
      conditions.push(Prisma.sql`fdMarkingCode IN (SELECT fdMarkingCode FROM tbMarking WHERE fdExitDate IS NOT NULL)`)
      conditions.push(Prisma.sql`fdListCode NOT IN (SELECT fdListCode FROM tbDelivery)`)
    } else if (status === 5) {
      conditions.push(Prisma.sql`fdMarkingCode IN (SELECT fdMarkingCode FROM tbMarking WHERE fdExitDate IS NOT NULL)`)
      conditions.push(Prisma.sql`fdListCode IN (SELECT fdListCode FROM tbDelivery GROUP BY fdListCode HAVING MAX(ISNULL(fdSent, 0)) = 0)`)
    } else if (status === 6) {
      conditions.push(Prisma.sql`fdMarkingCode IN (SELECT fdMarkingCode FROM tbMarking WHERE fdExitDate IS NOT NULL)`)
      conditions.push(Prisma.sql`fdListCode IN (SELECT fdListCode FROM tbDelivery WHERE fdSent = 1)`)
      conditions.push(Prisma.sql`fdListCode NOT IN (SELECT fdListCode FROM tbBilling WHERE fdGive = 1)`)
    } else if (status === 7) {
      conditions.push(Prisma.sql`fdMarkingCode IN (SELECT fdMarkingCode FROM tbMarking WHERE fdExitDate IS NOT NULL)`)
      conditions.push(Prisma.sql`fdListCode IN (SELECT fdListCode FROM tbBilling WHERE fdGive = 1 AND fdInvNo NOT IN (SELECT fdInvNo FROM tbBillingTotal WHERE ISNULL(fdBayar, 0) > 0))`)
    } else if (status === 8) {
      conditions.push(Prisma.sql`fdMarkingCode IN (SELECT fdMarkingCode FROM tbMarking WHERE fdExitDate IS NOT NULL)`)
      conditions.push(Prisma.sql`fdListCode IN (SELECT fdListCode FROM tbBilling WHERE fdGive = 1 AND fdInvNo IN (SELECT fdInvNo FROM tbBillingTotal WHERE ISNULL(fdBayar, 0) > 0 AND ISNULL(fdBayar, 0) < ISNULL(fdJumlah, 0)))`)
    } else if (status === 9) {
      conditions.push(Prisma.sql`fdMarkingCode IN (SELECT fdMarkingCode FROM tbMarking WHERE fdExitDate IS NOT NULL)`)
      conditions.push(Prisma.sql`fdListCode IN (SELECT fdListCode FROM tbBilling WHERE fdGive = 1 AND fdInvNo IN (SELECT fdInvNo FROM tbBillingTotal) AND fdInvNo NOT IN (SELECT fdInvNo FROM tbBillingTotal WHERE ISNULL(fdBayar, 0) < ISNULL(fdJumlah, 0)))`)
    }
  }

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
      row.fdListCode ? billingMap.get(row.fdListCode.trim()) : null
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
    shipmentStatus: resolveShipmentStatus(marking, delivery, billing),
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
  const search = query.search?.trim()
  const listType = query.listType
  const where: any = search
    ? {
      OR: [
        { fdListCode: { startsWith: search } },
        { fdCustName: { contains: search } },
        { fdMarkingCode: { startsWith: search } },
        { fdTerima: { startsWith: search } },
        { fdLocalTrackingNo: { startsWith: search } },
      ],
    }
    : {}

  if (listType !== undefined && listType !== '' && listType !== 'ALL') {
    where.fdListType = parseInt(listType, 10)
  }

  const [totalResi, aggregateData] = await Promise.all([
    prisma.vwShipment.count({ where }),
    prisma.vwShipment.aggregate({
      where,
      _sum: {
        fdJmlPack: true,
        fdJmlBerat: true,
        fdM3: true,
      },
    }),
  ])

  return {
    totalResi,
    totalPackages: aggregateData._sum.fdJmlPack || 0,
    totalBerat: aggregateData._sum.fdJmlBerat || 0,
    totalVolume: aggregateData._sum.fdM3 || 0,
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