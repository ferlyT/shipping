import path from 'path'
import fs from 'fs/promises'
import { prisma } from '../../config/database'
import { logger } from '../../config/logger'
import type {
  CreateInspectionReportPayload,
  UpdateInspectionReportPayload,
  ListInspectionReportsQuery,
  LookupMarkingResult,
} from './inspectionReports.types'

/**
 * Generate atomic sequential BAP number formatted: BAP-YYYY-MM-00001
 * Resets each month based on tbBAPCounter
 */
export async function generateReportNumber(date: Date = new Date()): Promise<string> {
  const year = date.getFullYear()
  const month = date.getMonth() + 1

  try {
    const result = await prisma.$queryRaw<Array<{ fdCount: number }>>`
      MERGE [dbo].[tbBAPCounter] WITH (HOLDLOCK) AS target
      USING (SELECT ${year} AS fdYear, ${month} AS fdMonth) AS source
      ON (target.fdYear = source.fdYear AND target.fdMonth = source.fdMonth)
      WHEN MATCHED THEN
        UPDATE SET target.fdCount = target.fdCount + 1
      WHEN NOT MATCHED THEN
        INSERT (fdYear, fdMonth, fdCount) VALUES (${year}, ${month}, 1)
      OUTPUT inserted.fdCount;
    `

    const count = result[0]?.fdCount || 1
    const monthStr = String(month).padStart(2, '0')
    const countStr = String(count).padStart(5, '0')
    return `BAP-${year}-${monthStr}-${countStr}`
  } catch (error) {
    logger.error('Error generating BAP report number:', error)
    // Fallback: count records created this month + 1
    const startOfMonth = new Date(year, month - 1, 1)
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999)
    const existingCount = await prisma.tbInspectionReport.count({
      where: {
        fdReportDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    })
    const count = existingCount + 1
    const monthStr = String(month).padStart(2, '0')
    const countStr = String(count).padStart(5, '0')
    return `BAP-${year}-${monthStr}-${countStr}`
  }
}

/**
 * Get paginated list of inspection reports
 */
export async function getInspectionReports(query: ListInspectionReportsQuery) {
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
  const skip = (page - 1) * limit
  const search = (query.search || '').trim()
  const status = query.status?.trim()
  const listType = query.listType ? Number(query.listType) : undefined
  const sortBy = query.sortBy || 'fdCreatedAt'
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc'

  const where: any = {
    fdDeletedAt: null,
  }

  if (status && status !== 'all') {
    where.fdStatus = status
  }

  if (listType) {
    where.fdListType = listType
  }

  if (search) {
    where.OR = [
      { fdReportNumber: { contains: search } },
      { fdNamaCustomer: { contains: search } },
      { fdMarkingCode: { contains: search } },
      { fdMarkingNo: { contains: search } },
      { fdListCode: { contains: search } },
      { fdTerima: { contains: search } },
    ]
  }

  const allowedSortFields = ['fdReportNumber', 'fdReportDate', 'fdCreatedAt', 'fdNamaCustomer', 'fdMarkingCode', 'fdStatus']
  const resolvedSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'fdCreatedAt'

  const [total, rawData] = await Promise.all([
    prisma.tbInspectionReport.count({ where }),
    prisma.tbInspectionReport.findMany({
      where,
      include: {
        _count: {
          select: { photos: true },
        },
      },
      orderBy: { [resolvedSortBy]: sortOrder },
      skip,
      take: limit,
    }),
  ])

  const data = rawData.map((item) => ({
    ...item,
    photoCount: item._count?.photos || 0,
  }))

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Get single inspection report by ID
 */
export async function getInspectionReportById(id: number) {
  const report = await prisma.tbInspectionReport.findFirst({
    where: {
      fdId: id,
      fdDeletedAt: null,
    },
    include: {
      photos: {
        orderBy: { fdCreatedAt: 'desc' },
      },
    },
  })
  if (!report) return null
  return {
    ...report,
    photoCount: report.photos?.length || 0,
  }
}

/**
 * Create new inspection report
 */
export async function createInspectionReport(
  payload: CreateInspectionReportPayload,
  username: string
) {
  if (!payload.fdNamaCustomer || !payload.fdNamaCustomer.trim()) {
    throw new Error('Nama Customer wajib diisi')
  }

  const reportDate = payload.fdReportDate ? new Date(payload.fdReportDate) : new Date()
  const reportNumber = await generateReportNumber(reportDate)

  const newReport = await prisma.tbInspectionReport.create({
    data: {
      fdReportNumber: reportNumber,
      fdReportDate: reportDate,
      fdListType: payload.fdListType ? Number(payload.fdListType) : 2,
      fdListCode: payload.fdListCode?.trim() || '',
      fdMarkingCode: payload.fdMarkingCode?.trim() || '',
      fdMarkingNo: payload.fdMarkingNo?.trim() || '',
      fdNamaCustomer: payload.fdNamaCustomer.trim(),
      fdTerima: payload.fdTerima?.trim() || null,
      fdKeterangan: payload.fdKeterangan?.trim() || null,
      fdStatus: payload.fdStatus || '1',
      fdCreatedBy: username || 'system',
    },
  })

  logger.info(`Inspection report created: ${reportNumber} by ${username}`)
  return newReport
}

/**
 * Update inspection report
 */
export async function updateInspectionReport(
  id: number,
  payload: UpdateInspectionReportPayload
) {
  const existing = await prisma.tbInspectionReport.findFirst({
    where: { fdId: id, fdDeletedAt: null },
  })

  if (!existing) {
    throw new Error('Data Berita Acara Pemeriksaan tidak ditemukan')
  }

  const updateData: any = {
    fdUpdatedAt: new Date(),
  }

  if (payload.fdReportDate !== undefined) {
    updateData.fdReportDate = new Date(payload.fdReportDate)
  }
  if (payload.fdListType !== undefined) {
    updateData.fdListType = Number(payload.fdListType)
  }
  if (payload.fdNamaCustomer !== undefined) {
    if (!payload.fdNamaCustomer.trim()) {
      throw new Error('Nama Customer tidak boleh kosong')
    }
    updateData.fdNamaCustomer = payload.fdNamaCustomer.trim()
  }
  if (payload.fdListCode !== undefined) updateData.fdListCode = payload.fdListCode.trim()
  if (payload.fdMarkingCode !== undefined) updateData.fdMarkingCode = payload.fdMarkingCode.trim()
  if (payload.fdMarkingNo !== undefined) updateData.fdMarkingNo = payload.fdMarkingNo.trim()
  if (payload.fdTerima !== undefined) updateData.fdTerima = payload.fdTerima?.trim() || null
  if (payload.fdKeterangan !== undefined) updateData.fdKeterangan = payload.fdKeterangan?.trim() || null
  if (payload.fdStatus !== undefined) updateData.fdStatus = payload.fdStatus

  const updated = await prisma.tbInspectionReport.update({
    where: { fdId: id },
    data: updateData,
  })

  logger.info(`Inspection report updated: ${updated.fdReportNumber}`)
  return updated
}

/**
 * Soft delete inspection report
 */
export async function deleteInspectionReport(id: number) {
  const existing = await prisma.tbInspectionReport.findFirst({
    where: { fdId: id, fdDeletedAt: null },
    include: { photos: true },
  })

  if (!existing) {
    throw new Error('Data Berita Acara Pemeriksaan tidak ditemukan')
  }

  // Soft delete report record
  await prisma.tbInspectionReport.update({
    where: { fdId: id },
    data: { fdDeletedAt: new Date() },
  })

  // Relocate physical photos to dedicated deleted folder
  if (existing.photos && existing.photos.length > 0) {
    const folderName = existing.fdReportNumber.replace(/[^a-zA-Z0-9_-]/g, '_')
    const baseUploads = path.join(process.cwd(), 'public', 'uploads', 'bap-photos')
    const sourceDir = path.join(baseUploads, folderName)
    const targetDir = path.join(baseUploads, 'deleted', folderName)

    try {
      await fs.mkdir(path.dirname(targetDir), { recursive: true })

      const sourceExists = await fs.stat(sourceDir).then(() => true).catch(() => false)
      if (sourceExists) {
        // Move directory to deleted/
        await fs.rename(sourceDir, targetDir).catch(async () => {
          await fs.cp(sourceDir, targetDir, { recursive: true })
          await fs.rm(sourceDir, { recursive: true, force: true })
        })
      }

      // Update database URLs and handle legacy loose files if any
      for (const photo of existing.photos) {
        let newUrl = photo.fdPhotoUrl

        if (photo.fdPhotoUrl.includes(`/uploads/bap-photos/${folderName}/`)) {
          newUrl = photo.fdPhotoUrl.replace(
            `/uploads/bap-photos/${folderName}/`,
            `/uploads/bap-photos/deleted/${folderName}/`
          )
        } else if (!photo.fdPhotoUrl.includes('/bap-photos/deleted/')) {
          // Legacy file in root bap-photos/
          const relativePart = photo.fdPhotoUrl.replace(/^\/uploads\//, '')
          const legacyFile = path.join(process.cwd(), 'public', 'uploads', relativePart)
          const filename = path.basename(legacyFile)
          const targetFile = path.join(targetDir, filename)

          if (await fs.stat(legacyFile).then(() => true).catch(() => false)) {
            await fs.mkdir(targetDir, { recursive: true })
            await fs.rename(legacyFile, targetFile).catch(() => {})
          }
          newUrl = `/uploads/bap-photos/deleted/${folderName}/${filename}`
        }

        if (newUrl !== photo.fdPhotoUrl) {
          await prisma.tbInspectionPhoto.update({
            where: { fdId: photo.fdId },
            data: { fdPhotoUrl: newUrl },
          })
        }
      }

      logger.info(`Archived ${existing.photos.length} photos for BAP ${existing.fdReportNumber} into deleted/${folderName}`)
    } catch (err) {
      logger.error(`Error archiving photos for deleted BAP ${existing.fdReportNumber}:`, err)
    }
  }

  logger.info(`Inspection report deleted: ${existing.fdReportNumber}`)
  return { id, reportNumber: existing.fdReportNumber }
}

/**
 * Lookup marking code and shipment info for autocomplete in BAP form
 */
export async function lookupInspectionMarking(
  search: string,
  page = 1,
  limit = 20,
  listType?: number
): Promise<LookupMarkingResult[]> {
  const cleanSearch = search.trim()
  const skip = (Math.max(1, page) - 1) * limit

  try {
    const where: any = {}
    if (listType) {
      where.fdListType = Number(listType)
    }

    if (cleanSearch && cleanSearch.length >= 1) {
      where.OR = [
        { fdMarkingCode: { contains: cleanSearch } },
        { fdMarkingNo: { contains: cleanSearch } },
        { fdCustName: { contains: cleanSearch } },
        { fdListCode: { contains: cleanSearch } },
        { fdTerima: { contains: cleanSearch } },
      ]
    }

    const shipments = await prisma.vwShipment.findMany({
      where,
      select: {
        fdListCode: true,
        fdMarkingCode: true,
        fdMarkingNo: true,
        fdCustName: true,
        fdTerima: true,
        fdListType: true,
      },
      orderBy: { fdListCode: 'desc' },
      skip,
      take: limit,
    })

    return shipments.map((s) => ({
      fdListCode: s.fdListCode?.trim() || '',
      fdMarkingCode: s.fdMarkingCode?.trim() || '',
      fdMarkingNo: s.fdMarkingNo?.trim() || '',
      fdCustName: s.fdCustName?.trim() || '',
      fdTerima: s.fdTerima?.trim() || undefined,
      fdListType: s.fdListType ?? undefined,
    }))
  } catch (error) {
    logger.error('Error looking up inspection marking:', error)
    return []
  }
}

/**
 * Get aggregated statistics for BAP reports (KPIs, status distribution, monthly trend, top customers)
 */
export async function getInspectionReportStats() {
  const now = new Date()
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

  const [totalReports, totalThisMonth, totalLastMonth, statusGroups, totalPhotos] = await Promise.all([
    prisma.tbInspectionReport.count({ where: { fdDeletedAt: null } }),
    prisma.tbInspectionReport.count({
      where: { fdDeletedAt: null, fdCreatedAt: { gte: startOfThisMonth } },
    }),
    prisma.tbInspectionReport.count({
      where: { fdDeletedAt: null, fdCreatedAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
    }),
    prisma.tbInspectionReport.groupBy({
      by: ['fdStatus'],
      where: { fdDeletedAt: null },
      _count: { fdId: true },
    }),
    prisma.tbInspectionPhoto.count({
      where: {
        report: { fdDeletedAt: null },
      },
    }),
  ])

  let growthPercent = 0
  if (totalLastMonth > 0) {
    growthPercent = ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100
  } else if (totalThisMonth > 0) {
    growthPercent = 100
  }

  // Top 5 customers
  const topCustomersRaw = await prisma.tbInspectionReport.groupBy({
    by: ['fdNamaCustomer'],
    where: {
      fdNamaCustomer: { not: '' },
      fdDeletedAt: null,
    },
    _count: { fdId: true },
    orderBy: { _count: { fdId: 'desc' } },
    take: 5,
  })

  // Monthly trend: last 6 months
  const monthlyTrend = await prisma.$queryRaw<Array<{ month: string; count: bigint | number }>>`
    SELECT 
      FORMAT(fdCreatedAt, 'yyyy-MM') AS month,
      COUNT(*) AS count
    FROM [dbo].[tbInspectionReport]
    WHERE fdDeletedAt IS NULL
      AND fdCreatedAt >= DATEADD(MONTH, -5, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
    GROUP BY FORMAT(fdCreatedAt, 'yyyy-MM')
    ORDER BY month ASC
  `

  const statusMap: Record<string, string> = { '1': 'Draft', '2': 'Done' }
  const byStatus = statusGroups.reduce((acc, curr) => {
    const statusName = statusMap[curr.fdStatus.toString()] || `Status ${curr.fdStatus}`
    acc[statusName] = curr._count.fdId
    return acc
  }, {} as Record<string, number>)

  return {
    totalForms: totalReports,
    totalThisMonth,
    totalLastMonth,
    growthPercent: Math.round(growthPercent),
    byStatus,
    topCustomers: topCustomersRaw.map((c) => ({
      name: c.fdNamaCustomer,
      count: c._count.fdId,
    })),
    monthlyTrend: monthlyTrend.map((r) => ({
      month: r.month,
      count: Number(r.count),
    })),
    totalPhotos,
  }
}

