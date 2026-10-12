import path from 'path'
import fs from 'fs/promises'
import { prisma } from '../../config/database'
import { logger } from '../../config/logger'

const UPLOAD_AUDIO_DIR = path.join(process.cwd(), 'public', 'uploads', 'bap-audio')

async function ensureAudioUploadDir() {
  try {
    await fs.mkdir(UPLOAD_AUDIO_DIR, { recursive: true })
  } catch (err) {
    logger.error('Failed to create bap-audio upload dir:', err)
  }
}

/**
 * Upload single BAP voice memo from Base64 string (.m4a)
 */
export async function uploadBapVoiceMemo(
  reportId: number,
  base64Audio: string,
  durationSeconds: number = 0,
  uploadedBy: string = 'system'
) {
  const report = await prisma.tbInspectionReport.findFirst({
    where: { fdId: reportId, fdDeletedAt: null },
  })

  if (!report) {
    throw new Error('Data Berita Acara Pemeriksaan tidak ditemukan')
  }

  await ensureAudioUploadDir()

  // Clean base64 data header if present
  let cleanBase64 = base64Audio
  let ext = 'm4a'
  if (base64Audio.includes(';base64,')) {
    const parts = base64Audio.split(';base64,')
    const mime = parts[0] || ''
    if (mime.includes('aac')) ext = 'aac'
    else if (mime.includes('mp3')) ext = 'mp3'
    else if (mime.includes('wav')) ext = 'wav'
    else if (mime.includes('ogg')) ext = 'ogg'
    cleanBase64 = parts[1] || base64Audio
  }

  const buffer = Buffer.from(cleanBase64, 'base64')
  if (buffer.length > 10 * 1024 * 1024) {
    throw new Error('Ukuran memo audio melebihi batas 10 MB')
  }

  const folderName = report.fdReportNumber.replace(/[^a-zA-Z0-9_-]/g, '_')
  const reportDir = path.join(UPLOAD_AUDIO_DIR, folderName)
  await fs.mkdir(reportDir, { recursive: true })

  // If previous audio existed, archive/delete it
  if (report.fdAudioUrl) {
    try {
      const prevRel = report.fdAudioUrl.replace(/^\/uploads\//, '')
      const prevPath = path.join(process.cwd(), 'public', 'uploads', prevRel)
      await fs.unlink(prevPath).catch(() => {})
    } catch {
      // ignore
    }
  }

  const filename = `memo_${reportId}_${Date.now()}.${ext}`
  const filePath = path.join(reportDir, filename)

  await fs.writeFile(filePath, buffer)

  const relativeUrl = `/uploads/bap-audio/${folderName}/${filename}`

  const updated = await prisma.tbInspectionReport.update({
    where: { fdId: reportId },
    data: {
      fdAudioUrl: relativeUrl,
      fdAudioDuration: Math.min(90, Math.max(1, Math.round(durationSeconds))),
      fdUpdatedAt: new Date(),
    },
  })

  logger.info(`BAP voice memo uploaded: Report ${reportId} (${durationSeconds}s) by ${uploadedBy}: ${relativeUrl}`)
  return {
    fdAudioUrl: updated.fdAudioUrl,
    fdAudioDuration: updated.fdAudioDuration,
  }
}

/**
 * Delete BAP voice memo
 */
export async function deleteBapVoiceMemo(reportId: number) {
  const report = await prisma.tbInspectionReport.findFirst({
    where: { fdId: reportId, fdDeletedAt: null },
  })

  if (!report) {
    throw new Error('Data Berita Acara Pemeriksaan tidak ditemukan')
  }

  if (report.fdAudioUrl) {
    try {
      const prevRel = report.fdAudioUrl.replace(/^\/uploads\//, '')
      const prevPath = path.join(process.cwd(), 'public', 'uploads', prevRel)
      await fs.unlink(prevPath).catch(() => {})
    } catch (e) {
      logger.warn(`Could not delete physical audio file: ${report.fdAudioUrl}`, e)
    }
  }

  await prisma.tbInspectionReport.update({
    where: { fdId: reportId },
    data: {
      fdAudioUrl: null,
      fdAudioDuration: null,
      fdUpdatedAt: new Date(),
    },
  })

  logger.info(`BAP voice memo deleted for Report ${reportId}`)
  return { success: true }
}
