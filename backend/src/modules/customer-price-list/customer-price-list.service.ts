import { prisma } from '../../config/database'
import { Prisma } from '@prisma/client'
import { parsePriceListWorkbook } from '../price-list/price-list.parser'

/**
 * Ingest file Excel price list customer ke DB.
 * Reuse parser yang sama dengan general price list.
 */
export async function ingestCustomerPriceListFile(
  buffer: Buffer,
  fdCustCode: string,
  fileName: string,
  effectiveDate: Date,
  uploadedBy?: string,
) {
  const parsed = await parsePriceListWorkbook(buffer)

  const upload = await prisma.tbCustomerPriceListUpload.create({
    data: {
      fdCustCode,
      fileName,
      uploadedBy: uploadedBy ?? null,
      priceDate: parsed.priceDate,
      effectiveDate,
      status: parsed.status,
      warnings: JSON.stringify(parsed.warnings),
      rawSnapshot: JSON.stringify(parsed.rawSnapshot),
      items: {
        create: parsed.items.map((it) => ({
          fdCustCode,
          sheetType: it.sheetType,
          mode: it.mode,
          branch: it.branch,
          transitTime: it.transitTime ?? null,
          category: it.category,
          price: new Prisma.Decimal(it.price),
        })),
      },
    },
    include: { items: false },
  })

  // Mark uploads LAMA dengan effectiveDate yang sama sebagai superseded
  await prisma.tbCustomerPriceListUpload.updateMany({
    where: {
      fdCustCode,
      effectiveDate: upload.effectiveDate,
      id: { not: upload.id },
      isSuperseded: false,
    },
    data: { isSuperseded: true },
  })

  return {
    uploadId: upload.id,
    fdCustCode,
    status: upload.status,
    effectiveDate: upload.effectiveDate,
    priceDate: upload.priceDate,
    itemCount: parsed.items.length,
    warnings: parsed.warnings,
  }
}

/**
 * List semua customer yang punya price list (distinct fdCustCode + info upload terakhir).
 */
export async function listCustomersWithPriceList() {
  const rows = await prisma.tbCustomerPriceListUpload.findMany({
    where: { isSuperseded: false, status: { not: 'FAILED' } },
    orderBy: { uploadedAt: 'desc' },
    select: {
      id: true,
      fdCustCode: true,
      fileName: true,
      uploadedBy: true,
      uploadedAt: true,
      priceDate: true,
      effectiveDate: true,
      status: true,
      _count: { select: { items: true } },
    },
    distinct: ['fdCustCode'],
  })

  // Enrich dengan nama customer
  const custCodes = [...new Set(rows.map((r) => r.fdCustCode))]
  const customers = await prisma.tbCustomers.findMany({
    where: { fdCustCode: { in: custCodes } },
    select: { fdCustCode: true, fdCustName: true },
  })
  const custMap = new Map(customers.map((c) => [c.fdCustCode, c.fdCustName ?? '-']))

  return rows.map((r) => ({
    ...r,
    custName: custMap.get(r.fdCustCode) ?? '-',
    itemCount: r._count.items,
  }))
}

/**
 * List upload history per customer dengan pagination.
 */
export async function listCustomerUploads(fdCustCode: string, page = 1, pageSize = 20) {
  const [rows, total] = await Promise.all([
    prisma.tbCustomerPriceListUpload.findMany({
      where: { fdCustCode },
      orderBy: { uploadedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        fdCustCode: true,
        fileName: true,
        uploadedBy: true,
        uploadedAt: true,
        priceDate: true,
        effectiveDate: true,
        status: true,
        isSuperseded: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.tbCustomerPriceListUpload.count({ where: { fdCustCode } }),
  ])

  return { rows, total, page, pageSize }
}

/**
 * Ambil item price list aktif per customer (upload terbaru non-superseded).
 */
export async function getActiveCustomerPriceList(fdCustCode: string) {
  const latestUpload = await prisma.tbCustomerPriceListUpload.findFirst({
    where: { fdCustCode, isSuperseded: false, status: { not: 'FAILED' } },
    orderBy: { effectiveDate: 'desc' },
  })
  if (!latestUpload) return null

  const items = await prisma.tbCustomerPriceListItem.findMany({
    where: { uploadId: latestUpload.id },
    include: { markings: true },
    orderBy: [{ mode: 'asc' }, { branch: 'asc' }, { category: 'asc' }],
  })

  return {
    uploadId: latestUpload.id,
    fdCustCode: latestUpload.fdCustCode,
    effectiveDate: latestUpload.effectiveDate,
    priceDate: latestUpload.priceDate,
    uploadedAt: latestUpload.uploadedAt,
    fileName: latestUpload.fileName,
    items: items.map((it) => ({
      id: it.id,
      mode: it.mode,
      branch: it.branch,
      transitTime: it.transitTime,
      category: it.category,
      price: Number(it.price),
      markings: it.markings?.map((m) => ({
        id: m.id,
        markingCode: m.markingCode,
        agentName: m.agentName,
      })) || [],
    })),
  }
}

/**
 * Diff antara upload saat ini dan sebelumnya per customer.
 */
export async function getCustomerUploadDiff(id: number) {
  const current = await prisma.tbCustomerPriceListUpload.findUnique({
    where: { id },
    include: { items: { include: { markings: true } } },
  })
  if (!current) return null

  const previous = await prisma.tbCustomerPriceListUpload.findFirst({
    where: {
      fdCustCode: current.fdCustCode,
      effectiveDate: { lt: current.effectiveDate },
      status: { not: 'FAILED' },
    },
    orderBy: { effectiveDate: 'desc' },
    include: { items: { include: { markings: true } } },
  })

  const key = (it: { mode: string; branch: string; category: string }) =>
    `${it.mode}||${it.branch}||${it.category}`

  const prevMap = new Map<string, number>()
  previous?.items.forEach((it) => prevMap.set(key(it), Number(it.price)))

  const diff = current.items.map((it) => {
    const prevPrice = prevMap.get(key(it))
    const currPrice = Number(it.price)
    return {
      mode: it.mode,
      branch: it.branch,
      category: it.category,
      currentPrice: currPrice,
      previousPrice: prevPrice ?? null,
      delta: prevPrice !== undefined ? currPrice - prevPrice : null,
      deltaPct: prevPrice ? ((currPrice - prevPrice) / prevPrice) * 100 : null,
      markings: it.markings?.map((m) => ({
        id: m.id,
        markingCode: m.markingCode,
        agentName: m.agentName,
      })) || [],
    }
  })

  return {
    fdCustCode: current.fdCustCode,
    currentUploadId: current.id,
    currentEffectiveDate: current.effectiveDate,
    previousUploadId: previous?.id ?? null,
    previousEffectiveDate: previous?.effectiveDate ?? null,
    diff,
  }
}

export async function getCustomerPriceListFilters(fdCustCode?: string) {
  const whereUpload: Prisma.TbCustomerPriceListUploadWhereInput = {
    isSuperseded: false,
    status: { not: 'FAILED' },
  }
  if (fdCustCode) {
    whereUpload.fdCustCode = fdCustCode
  }

  const uploads = await prisma.tbCustomerPriceListUpload.findMany({
    where: whereUpload,
    select: { id: true },
  })
  const uploadIds = uploads.map((u) => u.id)

  if (uploadIds.length === 0) return { modes: [], branches: [], categories: [] }

  const [modes, branches, categories] = await Promise.all([
    prisma.tbCustomerPriceListItem.findMany({
      where: { uploadId: { in: uploadIds } },
      distinct: ['mode'],
      select: { mode: true },
    }),
    prisma.tbCustomerPriceListItem.findMany({
      where: { uploadId: { in: uploadIds } },
      distinct: ['branch'],
      select: { branch: true },
    }),
    prisma.tbCustomerPriceListItem.findMany({
      where: { uploadId: { in: uploadIds } },
      distinct: ['category'],
      select: { category: true },
    }),
  ])

  return {
    modes: modes.map((m) => m.mode),
    branches: branches.map((b) => b.branch),
    categories: categories.map((c) => c.category),
  }
}

/**
 * Cari harga khusus customer pada tanggal tertentu dengan dukungan filter markingCode agen (Level 1 & Level 2).
 */
export async function lookupCustomerPriceList(
  fdCustCode: string,
  targetDate: Date,
  filters?: { mode?: string; branch?: string; category?: string; markingCode?: string }
) {
  const upload = await prisma.tbCustomerPriceListUpload.findFirst({
    where: {
      fdCustCode,
      effectiveDate: { lte: targetDate },
      status: { not: 'FAILED' },
      isSuperseded: false,
    },
    orderBy: [
      { effectiveDate: 'desc' },
      { uploadedAt: 'desc' },
    ],
  })

  if (!upload) {
    return {
      found: false,
      fdCustCode,
      targetDate,
      uploadInfo: null,
      items: [],
      isMarkingOverride: false,
    }
  }

  const baseWhere: Prisma.TbCustomerPriceListItemWhereInput = {
    uploadId: upload.id,
  }

  if (filters?.mode) baseWhere.mode = filters.mode;
  if (filters?.branch) baseWhere.branch = filters.branch;
  if (filters?.category) {
    const catStr = filters.category;
    const categories = catStr.split(',').map((s) => s.trim()).filter(Boolean);
    if (categories.length === 1) {
      baseWhere.category = categories[0];
    } else if (categories.length > 1) {
      baseWhere.category = { in: categories } as any;
    }
  }

  let items: any[] = []
  let isMarkingOverride = false

  // 1. Coba cari dengan markingCode (Level 1)
  if (filters?.markingCode?.trim()) {
    const cleanMarking = filters.markingCode.trim()
    const markingItems = await prisma.tbCustomerPriceListItem.findMany({
      where: {
        ...baseWhere,
        markings: {
          some: {
            markingCode: { equals: cleanMarking },
          },
        },
      },
      include: { markings: true },
      orderBy: [{ mode: 'asc' }, { branch: 'asc' }, { category: 'asc' }],
    })

    if (markingItems.length > 0) {
      items = markingItems
      isMarkingOverride = true
    }
  }

  // 2. Fallback ke item customer standar (Level 2) jika tidak ada item khusus markingCode
  if (items.length === 0) {
    items = await prisma.tbCustomerPriceListItem.findMany({
      where: baseWhere,
      include: { markings: true },
      orderBy: [{ mode: 'asc' }, { branch: 'asc' }, { category: 'asc' }],
    })
  }

  return {
    found: items.length > 0,
    fdCustCode,
    targetDate,
    uploadInfo: {
      uploadId: upload.id,
      fileName: upload.fileName,
      effectiveDate: upload.effectiveDate,
      priceDate: upload.priceDate,
      uploadedAt: upload.uploadedAt,
    },
    isMarkingOverride,
    items: items.map((it) => ({
      id: it.id,
      mode: it.mode,
      branch: it.branch,
      transitTime: it.transitTime,
      category: it.category,
      price: Number(it.price),
      markings: it.markings?.map((m: any) => ({
        id: m.id,
        markingCode: m.markingCode,
        agentName: m.agentName,
      })) || [],
    })),
  }
}

export async function getCustomerItemMarkings(itemId: number) {
  return prisma.tbCustomerPriceListItemMarking.findMany({
    where: { itemId },
    orderBy: { markingCode: 'asc' },
  })
}

export async function setCustomerItemMarkings(
  itemId: number,
  markings: { markingCode: string; agentName?: string }[],
) {
  return prisma.$transaction(async (tx) => {
    await tx.tbCustomerPriceListItemMarking.deleteMany({
      where: { itemId },
    })

    if (markings.length > 0) {
      const validMarkings = markings
        .map((m) => ({
          itemId,
          markingCode: m.markingCode.trim(),
          agentName: m.agentName?.trim() || null,
        }))
        .filter((m) => m.markingCode.length > 0)

      const uniqueMap = new Map<string, typeof validMarkings[0]>()
      validMarkings.forEach((m) => uniqueMap.set(m.markingCode.toUpperCase(), m))
      const uniqueList = Array.from(uniqueMap.values())

      if (uniqueList.length > 0) {
        await tx.tbCustomerPriceListItemMarking.createMany({
          data: uniqueList,
        })
      }
    }

    return tx.tbCustomerPriceListItemMarking.findMany({
      where: { itemId },
      orderBy: { markingCode: 'asc' },
    })
  })
}

export async function deleteCustomerItemMarking(itemId: number, markingCode: string) {
  return prisma.tbCustomerPriceListItemMarking.deleteMany({
    where: {
      itemId,
      markingCode: markingCode.trim(),
    },
  })
}

