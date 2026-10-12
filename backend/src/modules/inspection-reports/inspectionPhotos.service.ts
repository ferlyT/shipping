import path from 'path'
import fs from 'fs/promises'
import { prisma } from '../../config/database'
import { logger } from '../../config/logger'
import { applyBapWatermark } from './imageWatermark.service'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'bap-photos')

async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  } catch (err) {
    logger.error('Failed to create bap-photos upload dir:', err)
  }
}

/**
 * Upload single BAP photo from Base64 string
 */
export async function uploadBapPhoto(
  reportId: number,
  base64String: string,
  caption: string | undefined,
  uploadedBy: string,
  annotationsSvg?: string
) {
  const report = await prisma.tbInspectionReport.findFirst({
    where: { fdId: reportId, fdDeletedAt: null },
  })

  if (!report) {
    throw new Error('Data Berita Acara Pemeriksaan tidak ditemukan')
  }

  // Count existing photos
  const existingCount = await prisma.tbInspectionPhoto.count({
    where: { fdReportId: reportId },
  })

  if (existingCount >= 10) {
    throw new Error('Maksimal 10 foto per Berita Acara Pemeriksaan')
  }

  await ensureUploadDir()

  // Clean base64 data header if present
  let cleanBase64 = base64String
  let ext = 'jpg'
  if (base64String.includes(';base64,')) {
    const parts = base64String.split(';base64,')
    const mime = parts[0] || ''
    if (mime.includes('png')) ext = 'png'
    else if (mime.includes('webp')) ext = 'webp'
    cleanBase64 = parts[1] || base64String
  }

  const buffer = Buffer.from(cleanBase64, 'base64')
  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error('Ukuran foto melebihi batas 5 MB')
  }

  // Apply burned-in metadata watermark onto photo (and composited visual annotations if provided)
  const watermarkedBuffer = await applyBapWatermark(
    buffer,
    {
      markingCode: report.fdMarkingCode,
      markingNo: report.fdMarkingNo,
      custName: report.fdNamaCustomer,
      terima: report.fdTerima,
      reportNumber: report.fdReportNumber,
      timestamp: new Date(),
    },
    annotationsSvg
  )

  const folderName = report.fdReportNumber.replace(/[^a-zA-Z0-9_-]/g, '_')
  const reportDir = path.join(UPLOAD_DIR, folderName)
  await fs.mkdir(reportDir, { recursive: true })

  const filename = `bap_${reportId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`
  const filePath = path.join(reportDir, filename)

  await fs.writeFile(filePath, watermarkedBuffer)

  const relativeUrl = `/uploads/bap-photos/${folderName}/${filename}`

  const photo = await prisma.tbInspectionPhoto.create({
    data: {
      fdReportId: reportId,
      fdPhotoUrl: relativeUrl,
      fdCaption: caption?.trim() || null,
      fdUploadedBy: uploadedBy || 'system',
    },
  })

  logger.info(`BAP photo uploaded: ID ${photo.fdId} in ${folderName} for Report ${reportId}`)
  return photo
}

/**
 * Get photos for specific BAP
 */
export async function getBapPhotos(reportId: number) {
  return prisma.tbInspectionPhoto.findMany({
    where: { fdReportId: reportId },
    orderBy: { fdCreatedAt: 'desc' },
  })
}

/**
 * Delete single BAP photo
 */
export async function deleteBapPhoto(photoId: number, reportId: number) {
  const photo = await prisma.tbInspectionPhoto.findFirst({
    where: { fdId: photoId, fdReportId: reportId },
    include: { report: { select: { fdReportNumber: true } } },
  })

  if (!photo) {
    throw new Error('Foto tidak ditemukan')
  }

  // Move physical file to deleted archive folder
  try {
    const reportNumber = photo.report?.fdReportNumber || `report_${reportId}`
    const folderName = reportNumber.replace(/[^a-zA-Z0-9_-]/g, '_')
    const relativePart = photo.fdPhotoUrl.replace(/^\/uploads\//, '')
    const sourcePath = path.join(process.cwd(), 'public', 'uploads', relativePart)

    if (await fs.stat(sourcePath).then(() => true).catch(() => false)) {
      const filename = path.basename(sourcePath)
      const targetDir = path.join(process.cwd(), 'public', 'uploads', 'bap-photos', 'deleted', folderName)
      await fs.mkdir(targetDir, { recursive: true })
      const targetPath = path.join(targetDir, filename)

      await fs.rename(sourcePath, targetPath).catch(async () => {
        await fs.copyFile(sourcePath, targetPath)
        await fs.unlink(sourcePath).catch(() => {})
      })
      logger.info(`Photo ID ${photoId} moved to deleted archive: ${targetPath}`)

      // Clean up empty source directory if no more files
      const sourceDir = path.dirname(sourcePath)
      const remaining = await fs.readdir(sourceDir).catch(() => [])
      if (remaining.length === 0) {
        await fs.rmdir(sourceDir).catch(() => {})
      }
    }
  } catch (e) {
    logger.warn(`Could not move photo file to deleted folder: ${photo.fdPhotoUrl}`, e)
  }

  await prisma.tbInspectionPhoto.delete({
    where: { fdId: photoId },
  })

  logger.info(`BAP photo deleted: ID ${photoId} for Report ${reportId}`)
  return { fdId: photoId }
}
