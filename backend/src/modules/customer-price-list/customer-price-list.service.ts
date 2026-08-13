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
    })),
  }
}

/**
 * Diff antara upload saat ini dan sebelumnya per customer.
 */
export async function getCustomerUploadDiff(id: number) {
  const current = await prisma.tbCustomerPriceListUpload.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!current) return null

  const previous = await prisma.tbCustomerPriceListUpload.findFirst({
    where: {
      fdCustCode: current.fdCustCode,
      effectiveDate: { lt: current.effectiveDate },
      status: { not: 'FAILED' },
    },
    orderBy: { effectiveDate: 'desc' },
    include: { items: true },
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
 * Cari harga khusus customer pada tanggal tertentu.
 */
export async function lookupCustomerPriceList(
  fdCustCode: string,
  targetDate: Date,
  filters?: { mode?: string; branch?: string; category?: string }
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
    }
  }

  const items = await prisma.tbCustomerPriceListItem.findMany({
    where: { uploadId: upload.id },
    orderBy: [{ mode: 'asc' }, { branch: 'asc' }, { category: 'asc' }],
  })

  return {
    found: true,
    fdCustCode,
    targetDate,
    uploadInfo: {
      uploadId: upload.id,
      fileName: upload.fileName,
      effectiveDate: upload.effectiveDate,
      priceDate: upload.priceDate,
      uploadedAt: upload.uploadedAt,
    },
    items: items.map((it) => ({
      id: it.id,
      mode: it.mode,
      branch: it.branch,
      transitTime: it.transitTime,
      category: it.category,
      price: Number(it.price),
    })),
  }
}

