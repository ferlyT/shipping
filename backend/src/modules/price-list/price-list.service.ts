import { prisma } from '../../config/database'
import { Prisma } from '@prisma/client'
import { parsePriceListWorkbook } from './price-list.parser'
import { normalizeMode } from './price-list-lookup.service'

// Re-export types and lookup subservice
export * from './price-list.types'
export * from './price-list-lookup.service'

/**
 * Ingest Master Price List Excel file
 */
export async function ingestPriceListFile(
  buffer: Buffer,
  fileName: string,
  effectiveDate: Date,
  uploadedBy?: string,
) {
  const parsed = await parsePriceListWorkbook(buffer)

  const upload = await prisma.tbPriceListUpload.create({
    data: {
      fileName,
      uploadedBy: uploadedBy ?? null,
      priceDate: parsed.priceDate,
      effectiveDate,
      status: parsed.status,
      warnings: JSON.stringify(parsed.warnings),
      rawSnapshot: JSON.stringify(parsed.rawSnapshot),
      items: {
        create: parsed.items.map((it) => ({
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

  // Mark older uploads for the same effectiveDate as superseded
  await prisma.tbPriceListUpload.updateMany({
    where: {
      effectiveDate: upload.effectiveDate,
      id: { not: upload.id },
      isSuperseded: false,
    },
    data: { isSuperseded: true },
  })

  return {
    uploadId: upload.id,
    status: upload.status,
    effectiveDate: upload.effectiveDate,
    priceDate: upload.priceDate,
    itemCount: parsed.items.length,
    warnings: parsed.warnings,
    hasOlderVersions: false,
  }
}

export async function listUploads(page = 1, pageSize = 20) {
  const [rows, total] = await Promise.all([
    prisma.tbPriceListUpload.findMany({
      orderBy: { uploadedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        fileName: true,
        uploadedBy: true,
        uploadedAt: true,
        priceDate: true,
        effectiveDate: true,
        status: true,
        isSuperseded: true,
        _count: { select: { items: true } },
        markings: {
          select: { id: true, markingCode: true, agentName: true, mode: true },
          orderBy: { markingCode: 'asc' },
        },
      },
    }),
    prisma.tbPriceListUpload.count(),
  ])
  return { rows, total, page, pageSize }
}

export async function getUploadDiff(id: number) {
  const current = await prisma.tbPriceListUpload.findUnique({
    where: { id },
    include: {
      items: true,
      markings: true,
    },
  })
  if (!current) return null

  // Find previous upload with effectiveDate strictly before this one
  const previous = await prisma.tbPriceListUpload.findFirst({
    where: {
      effectiveDate: { lt: current.effectiveDate },
      status: { not: 'FAILED' },
    },
    orderBy: { effectiveDate: 'desc' },
    include: { items: true },
  })

  const key = (it: { sheetType: string; mode: string; branch: string; category: string }) =>
    `${it.sheetType}||${it.mode}||${it.branch}||${it.category}`

  const prevMap = new Map<string, number>()
  previous?.items.forEach((it) => prevMap.set(key(it), Number(it.price)))

  const diff = current.items.map((it) => {
    const prevPrice = prevMap.get(key(it))
    const currPrice = Number(it.price)
    return {
      id: it.id,
      sheetType: it.sheetType,
      mode: it.mode,
      branch: it.branch,
      category: it.category,
      currentPrice: currPrice,
      previousPrice: prevPrice ?? null,
      delta: prevPrice !== undefined ? currPrice - prevPrice : null,
      deltaPct: prevPrice ? ((currPrice - prevPrice) / prevPrice) * 100 : null,
      markings: current.markings?.map((m) => ({
        id: m.id,
        markingCode: m.markingCode,
        agentName: m.agentName,
        mode: m.mode,
      })) || [],
    }
  })

  return {
    currentUploadId: current.id,
    currentEffectiveDate: current.effectiveDate,
    previousUploadId: previous?.id ?? null,
    previousEffectiveDate: previous?.effectiveDate ?? null,
    markings: current.markings?.map((m) => ({
      id: m.id,
      markingCode: m.markingCode,
      agentName: m.agentName,
      mode: m.mode,
    })) || [],
    diff,
  }
}

export async function updateUploadEffectiveDate(id: number, newEffectiveDate: Date) {
  const current = await prisma.tbPriceListUpload.findUnique({
    where: { id },
  })
  if (!current) return null

  const updated = await prisma.tbPriceListUpload.update({
    where: { id },
    data: { effectiveDate: newEffectiveDate },
  })

  // Recalculate superseded status for uploads with the same effectiveDate
  const allForDate = await prisma.tbPriceListUpload.findMany({
    where: {
      effectiveDate: newEffectiveDate,
      status: { not: 'FAILED' },
    },
    orderBy: { uploadedAt: 'desc' },
  })

  if (allForDate.length > 1) {
    const latest = allForDate[0]
    const older = allForDate.slice(1)
    if (latest) {
      await prisma.tbPriceListUpload.update({
        where: { id: latest.id },
        data: { isSuperseded: false },
      })
    }
    for (const old of older) {
      await prisma.tbPriceListUpload.update({
        where: { id: old.id },
        data: { isSuperseded: true },
      })
    }
  } else if (allForDate.length === 1 && allForDate[0]) {
    await prisma.tbPriceListUpload.update({
      where: { id: allForDate[0].id },
      data: { isSuperseded: false },
    })
  }

  return updated
}

export async function getLatestUploadDiff() {
  const latest = await prisma.tbPriceListUpload.findFirst({
    where: { isSuperseded: false, status: { not: 'FAILED' } },
    orderBy: { effectiveDate: 'desc' },
  })
  if (!latest) return null
  return getUploadDiff(latest.id)
}

export async function getPriceTrend(filter: {
  sheetType?: string
  mode?: string
  branch?: string
  category?: string
  from?: Date
  to?: Date
}) {
  const items = await prisma.tbPriceListItem.findMany({
    where: {
      sheetType: filter.sheetType || undefined,
      mode: filter.mode || undefined,
      branch: filter.branch || undefined,
      category: filter.category || undefined,
      upload: {
        isSuperseded: false,
        uploadedAt: {
          gte: filter.from,
          lte: filter.to,
        },
      },
    },
    include: {
      upload: {
        select: { id: true, uploadedAt: true, priceDate: true, effectiveDate: true },
      },
    },
    orderBy: { upload: { effectiveDate: 'asc' } },
  })

  return items.map((it) => ({
    uploadId: it.upload.id,
    date: (it.upload.effectiveDate ?? it.upload.priceDate).toISOString().slice(0, 10),
    sheetType: it.sheetType,
    mode: it.mode,
    branch: it.branch,
    category: it.category,
    price: Number(it.price),
  }))
}

export async function getFilterOptions(params: {
  sheetType?: string | string[]
  mode?: string
}) {
  const sheetTypeFilter = params.sheetType
    ? { in: Array.isArray(params.sheetType) ? params.sheetType : [params.sheetType] }
    : undefined

  const activeUploadWhere = { upload: { isSuperseded: false } }

  const [sheetTypes, modes, branches, categories] = await Promise.all([
    prisma.tbPriceListItem.findMany({
      where: activeUploadWhere,
      distinct: ['sheetType'],
      select: { sheetType: true },
    }),
    prisma.tbPriceListItem.findMany({
      where: activeUploadWhere,
      distinct: ['mode'],
      select: { mode: true },
    }),
    prisma.tbPriceListItem.findMany({
      where: { ...activeUploadWhere, sheetType: sheetTypeFilter, mode: params.mode || undefined },
      distinct: ['branch'],
      select: { branch: true },
    }),
    prisma.tbPriceListItem.findMany({
      where: { ...activeUploadWhere, sheetType: sheetTypeFilter, mode: params.mode || undefined },
      distinct: ['category'],
      select: { category: true },
    }),
  ])

  return {
    sheetTypes: sheetTypes.map((s) => s.sheetType),
    modes: modes.map((m) => m.mode),
    branches: branches.map((b) => b.branch),
    categories: categories.map((c) => c.category),
  }
}

export async function getDistinctBranches(): Promise<string[]> {
  const [generalBranches, customerBranches] = await Promise.all([
    prisma.tbPriceListItem.findMany({
      distinct: ['branch'],
      select: { branch: true },
      where: { branch: { not: '' } },
    }),
    prisma.tbCustomerPriceListItem.findMany({
      distinct: ['branch'],
      select: { branch: true },
      where: { branch: { not: '' } },
    }),
  ])

  const set = new Set<string>()
  generalBranches.forEach((b) => {
    if (b.branch && b.branch.trim()) set.add(b.branch.trim())
  })
  customerBranches.forEach((b) => {
    if (b.branch && b.branch.trim()) set.add(b.branch.trim())
  })

  return Array.from(set).sort()
}

export async function getUploadMarkings(uploadId: number) {
  return prisma.tbPriceListUploadMarking.findMany({
    where: { uploadId },
    orderBy: { markingCode: 'asc' },
  })
}

export async function setUploadMarkings(
  uploadId: number,
  markings: { markingCode: string; agentName?: string; mode?: string }[],
) {
  return prisma.$transaction(async (tx) => {
    await tx.tbPriceListUploadMarking.deleteMany({
      where: { uploadId },
    })

    if (markings.length > 0) {
      const validMarkings = markings
        .map((m) => ({
          uploadId,
          markingCode: m.markingCode.trim(),
          agentName: m.agentName?.trim() || null,
          mode: normalizeMode(m.mode),
        }))
        .filter((m) => m.markingCode.length > 0)

      const uniqueMap = new Map<string, typeof validMarkings[0]>()
      validMarkings.forEach((m) => uniqueMap.set(`${m.markingCode.toUpperCase()}||${m.mode || 'ALL'}`, m))
      const uniqueList = Array.from(uniqueMap.values())

      if (uniqueList.length > 0) {
        await tx.tbPriceListUploadMarking.createMany({
          data: uniqueList,
        })
      }
    }

    return tx.tbPriceListUploadMarking.findMany({
      where: { uploadId },
      orderBy: { markingCode: 'asc' },
    })
  })
}

export async function deleteUploadMarking(uploadId: number, markingCode: string) {
  return prisma.tbPriceListUploadMarking.deleteMany({
    where: {
      uploadId,
      markingCode: markingCode.trim(),
    },
  })
}
