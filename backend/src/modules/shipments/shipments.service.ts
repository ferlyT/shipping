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
  statusStep: number // 0=menunggu loading .. 4=keluar gudang, 5=dalam pengiriman, 6=terkirim
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
  delivery: DeliveryInfo | null | undefined
): ShipmentStatus {
  if (!marking) {
    return { ...EMPTY_MARKING, statusLabel: 'Belum Ada Data Marking', statusStep: 0 }
  }

  const { fdLoadDate, fdETD, fdETA, fdExitDate } = marking

  if (fdExitDate) {
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
    // Kita gunakan SUBQUERY ke tbEntryList agar SQL Server memfilter data DULU
    // sebelum melakukan LEFT JOIN yang sangat berat di dalam vwShipment.
    if (/\\d/.test(search) && !/\\s/.test(search)) {
      conditions.push(Prisma.sql`fdListCode IN (SELECT fdListCode FROM tbEntryList WHERE fdListCode LIKE ${search + '%'} OR fdMarkingCode LIKE ${search + '%'} OR fdTerima LIKE ${search + '%'} OR fdTrackingNo LIKE ${search + '%'})`)
    } else {
      conditions.push(Prisma.sql`(
        fdListCode IN (SELECT fdListCode FROM tbEntryList WHERE fdListCode LIKE ${search + '%'} OR fdMarkingCode LIKE ${search + '%'} OR fdTerima LIKE ${search + '%'} OR fdTrackingNo LIKE ${search + '%'} OR fdDesc LIKE ${'%' + search + '%'})
        OR fdListCode IN (SELECT e.fdListCode FROM tbEntryList e JOIN tbCustomers c ON e.fdCustCode = c.fdCustCode WHERE c.fdCustName LIKE ${'%' + search + '%'})
      )`)
    }
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

  // Ambil status kirim (loaddate, etd, eta, exit, gudang) dari tbMarking + status lanjutan dari tbDelivery
  // untuk semua baris pada halaman ini sekaligus (batch, hindari N+1 query)
  const [markingMap, deliveryMap] = await Promise.all([
    getMarkingStatusMap(data.map((d) => d.fdMarkingCode ?? '')),
    getDeliveryStatusMap(data.map((d) => d.fdListCode ?? '')),
  ])

  const dataWithStatus = data.map((row) => ({
    ...row,
    shipmentStatus: resolveShipmentStatus(
      row.fdMarkingCode ? markingMap.get(row.fdMarkingCode.trim()) : null,
      row.fdListCode ? deliveryMap.get(row.fdListCode.trim()) : null
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

  // Status lanjutan (Dalam Pengiriman / Terkirim) hanya relevan setelah fdExitDate terisi,
  // tapi query-nya murah (per fdListCode) jadi cukup dijalankan setiap kali ada marking.
  let delivery: DeliveryInfo | null = null
  if (marking?.fdExitDate) {
    const deliveries = await prisma.tbDelivery.findMany({
      where: { fdListCode: shipment.fdListCode.trim() },
      select: { fdSent: true },
    })
    delivery = {
      hasDelivery: deliveries.length > 0,
      isSent: deliveries.some((d) => d.fdSent === 1),
    }
  }

  return {
    ...shipment,
    shipmentStatus: resolveShipmentStatus(marking, delivery),
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
        { fdListCode: { contains: search } },
        { fdCustName: { contains: search } },
        { fdMarkingCode: { contains: search } },
        { fdDesc: { contains: search } },
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