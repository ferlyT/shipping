import path from 'path'
import fs from 'fs/promises'
import { prisma } from '../../config/database'
import { logger } from '../../config/logger'
import type { UploadBillingAttachmentInput } from './billing-attachments.types'

const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads', 'billing-attachments')
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_ATTACHMENTS_PER_INVOICE = 10

async function ensureUploadDir(folderPath: string) {
  try {
    await fs.mkdir(folderPath, { recursive: true })
  } catch (err) {
    logger.error('Failed to create upload directory:', err)
  }
}

function sanitizeInvNo(invNo: string): string {
  return invNo.trim().replace(/[^a-zA-Z0-9_-]/g, '_')
}

export async function getBillingAttachments(invNo: string) {
  const cleanInv = invNo.trim()
  const attachments = await prisma.tbBillingAttachment.findMany({
    where: { fdInvNo: cleanInv },
    orderBy: { fdCreatedAt: 'desc' },
  })

  // Convert BigInt fdFileSize to number for safe JSON serialization
  return attachments.map((att) => ({
    ...att,
    fdFileSize: Number(att.fdFileSize),
  }))
}

export async function uploadBillingAttachment(
  invNo: string,
  payload: UploadBillingAttachmentInput,
  uploadedBy: string
) {
  const cleanInv = invNo.trim()

  // 1. Validasi keberadaan invoice
  const billing = await prisma.tbBilling.findUnique({
    where: { fdInvNo: cleanInv },
    select: { fdInvNo: true },
  })

  if (!billing) {
    throw new Error(`Invoice dengan nomor ${cleanInv} tidak ditemukan`)
  }

  // 2. Cek kuota lampiran
  const count = await prisma.tbBillingAttachment.count({
    where: { fdInvNo: cleanInv },
  })

  if (count >= MAX_ATTACHMENTS_PER_INVOICE) {
    throw new Error(`Maksimal ${MAX_ATTACHMENTS_PER_INVOICE} lampiran per invoice telah tercapai`)
  }

  // 3. Parse dan validasi base64 string
  let cleanBase64 = payload.fileBase64
  let detectedMime = payload.fileType || ''
  let ext = 'jpg'

  if (payload.fileBase64.includes(';base64,')) {
    const parts = payload.fileBase64.split(';base64,')
    const mimePart = parts[0] || ''
    cleanBase64 = parts[1] || payload.fileBase64

    if (mimePart.includes('image/png')) {
      detectedMime = 'image/png'
      ext = 'png'
    } else if (mimePart.includes('image/webp')) {
      detectedMime = 'image/webp'
      ext = 'webp'
    } else if (mimePart.includes('application/pdf')) {
      detectedMime = 'application/pdf'
      ext = 'pdf'
    } else if (mimePart.includes('image/jpeg') || mimePart.includes('image/jpg')) {
      detectedMime = 'image/jpeg'
      ext = 'jpg'
    }
  }

  // Fallback detection from fileName extension
  const extFromName = path.extname(payload.fileName).toLowerCase().replace('.', '')
  if (extFromName === 'pdf') {
    detectedMime = 'application/pdf'
    ext = 'pdf'
  } else if (['jpg', 'jpeg'].includes(extFromName)) {
    detectedMime = 'image/jpeg'
    ext = 'jpg'
  } else if (extFromName === 'png') {
    detectedMime = 'image/png'
    ext = 'png'
  } else if (extFromName === 'webp') {
    detectedMime = 'image/webp'
    ext = 'webp'
  }

  if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(detectedMime)) {
    throw new Error('Format berkas tidak didukung. Harap unggah berkas gambar (JPG, PNG, WebP) atau PDF.')
  }

  const buffer = Buffer.from(cleanBase64, 'base64')
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error('Ukuran berkas melebihi batas maksimal 10 MB')
  }

  // 4. Buat direktori penyimpanan
  const folderName = sanitizeInvNo(cleanInv)
  const targetDir = path.join(UPLOAD_ROOT, folderName)
  await ensureUploadDir(targetDir)

  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 7)
  const savedFilename = `inv_${folderName}_${timestamp}_${randomSuffix}.${ext}`
  const filePath = path.join(targetDir, savedFilename)

  // 5. Tulis berkas fisik
  await fs.writeFile(filePath, buffer)

  const relativeUrl = `/uploads/billing-attachments/${folderName}/${savedFilename}`

  // 6. Simpan entri database
  const record = await prisma.tbBillingAttachment.create({
    data: {
      fdInvNo: cleanInv,
      fdFileName: payload.fileName.trim(),
      fdFileSavedName: savedFilename,
      fdFileType: detectedMime,
      fdFileSize: BigInt(buffer.length),
      fdFileUrl: relativeUrl,
      fdCaption: payload.caption?.trim() || null,
      fdUploadedBy: uploadedBy || 'system',
    },
  })

  logger.info(`Lampiran invoice berhasil diunggah: ID ${record.fdId} untuk invoice ${cleanInv} (${savedFilename})`)

  return {
    ...record,
    fdFileSize: Number(record.fdFileSize),
  }
}

export async function deleteBillingAttachment(attachmentId: number, invNo: string) {
  const cleanInv = invNo.trim()
  const attachment = await prisma.tbBillingAttachment.findFirst({
    where: {
      fdId: attachmentId,
      fdInvNo: cleanInv,
    },
  })

  if (!attachment) {
    throw new Error('Berkas lampiran tidak ditemukan')
  }

  // Pindahkan berkas fisik ke folder deleted/
  try {
    const folderName = sanitizeInvNo(cleanInv)
    const relativePart = attachment.fdFileUrl.replace(/^\/uploads\//, '')
    const sourcePath = path.join(process.cwd(), 'public', 'uploads', relativePart)

    if (await fs.stat(sourcePath).then(() => true).catch(() => false)) {
      const deletedDir = path.join(UPLOAD_ROOT, 'deleted', folderName)
      await ensureUploadDir(deletedDir)
      const targetPath = path.join(deletedDir, attachment.fdFileSavedName)

      await fs.rename(sourcePath, targetPath).catch(async () => {
        await fs.copyFile(sourcePath, targetPath)
        await fs.unlink(sourcePath).catch(() => {})
      })
      logger.info(`Berkas lampiran ID ${attachmentId} dipindahkan ke arsip hapus: ${targetPath}`)
    }
  } catch (err) {
    logger.warn(`Gagal memindahkan berkas fisik lampiran: ${attachment.fdFileUrl}`, err)
  }

  // Hapus dari database
  await prisma.tbBillingAttachment.delete({
    where: { fdId: attachmentId },
  })

  logger.info(`Lampiran invoice ID ${attachmentId} berhasil dihapus dari database (${cleanInv})`)
  return { fdId: attachmentId }
}
