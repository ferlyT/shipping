import { prisma } from '../../config/database'
import { logger } from '../../config/logger'
import type {
  DataRevision,
  DataRevisionsListResponse,
  DataRevisionsStats,
  RevisionDetailItem,
} from './dataRevisions.types'
import ExcelJS from 'exceljs'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'data-revisions')
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

/**
 * Mendapatkan preview nomor form berikutnya (READ-ONLY, tidak mengubah counter di DB)
 */
export async function getNextFormNumber(): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const mm = String(month).padStart(2, '0')

  // Ambil counter saat ini tanpa melakukan increment
  const counter = await prisma.tbDataRevisionCounter.findUnique({
    where: {
      fdYear_fdMonth: {
        fdYear: year,
        fdMonth: month,
      },
    },
  })

  let currentCount = counter?.fdCount ?? 0

  // Cari nomor form tertinggi yang sudah ada di database untuk bulan dan tahun ini
  const existingForms = await prisma.tbDataRevision.findMany({
    where: {
      fdNomorForm: {
        endsWith: `/${mm}/${year}`,
      },
      fdDeletedAt: null,
    },
    select: { fdNomorForm: true },
  })

  for (const f of existingForms) {
    const parts = f.fdNomorForm.trim().split('/')
    if (parts.length === 3 && parts[0]) {
      const num = parseInt(parts[0], 10)
      if (!isNaN(num) && num > currentCount) {
        currentCount = num
      }
    }
  }

  const nextSeq = currentCount + 1
  const seq = String(nextSeq).padStart(3, '0')
  return `${seq}/${mm}/${year}`
}

/**
 * Periksa apakah daftar fdListCode boleh dibatalkan:
 * Proteksi: fdListCode yang sudah ada bill atau sudah fdGive = 1 TIDAK BISA di-cancel.
 */
export async function checkListCodeCancelEligibility(codes: string[]): Promise<{
  eligible: boolean
  violations: Array<{
    fdListCode: string
    reason: string
  }>
}> {
  const cleanCodes = codes.map((c) => c.trim()).filter(Boolean)
  if (cleanCodes.length === 0) {
    return { eligible: true, violations: [] }
  }

  const inList = cleanCodes.map((c) => `'${c.replace(/'/g, "''")}'`).join(',')
  const rows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT 
      RTRIM(e.fdListCode) as fdListCode,
      RTRIM(bill.fdInvNo) as fdInvNo,
      bill.fdGive as fdBillGive,
      RTRIM(deliv.fdSJNo) as fdSJNo,
      deliv.fdGive as fdDelivGive
    FROM tbEntryList e WITH (NOLOCK)
    OUTER APPLY (
      SELECT TOP 1 RTRIM(b.fdInvNo) as fdInvNo, b.fdGive
      FROM tbBilling b WITH (NOLOCK) 
      WHERE b.fdListCode = e.fdListCode
    ) bill
    OUTER APPLY (
      SELECT TOP 1 RTRIM(d.fdSJNo) as fdSJNo, d.fdGive 
      FROM tbDelivery d WITH (NOLOCK) 
      WHERE d.fdListCode = e.fdListCode AND d.fdGive = 1
    ) deliv
    WHERE RTRIM(e.fdListCode) IN (${inList})
  `)

  const violations: Array<{ fdListCode: string; reason: string }> = []

  for (const row of rows) {
    const listCode = (row.fdListCode || '').trim()
    const hasBill = Boolean(row.fdInvNo && row.fdInvNo.trim())
    const isGiven = row.fdDelivGive === 1 || row.fdBillGive === 1

    if (hasBill && isGiven) {
      violations.push({
        fdListCode: listCode,
        reason: `Sudah terbit Bill (Inv: ${row.fdInvNo}) & kargo sudah diserahkan / fdGive=1 (SJ: ${row.fdSJNo || '-'})`,
      })
    } else if (hasBill) {
      violations.push({
        fdListCode: listCode,
        reason: `Sudah terbit Bill (Invoice: ${row.fdInvNo})`,
      })
    } else if (isGiven) {
      violations.push({
        fdListCode: listCode,
        reason: `Kargo sudah diserahkan / fdGive=1 (SJ: ${row.fdSJNo || '-'})`,
      })
    }
  }

  return {
    eligible: violations.length === 0,
    violations,
  }
}

/**
 * Fast lookup fdListCode dari tbEntryList (index scan cepat)
 * Mendukung variabel pencarian: fdListCode, no resi (fdTerima/fdTrackingNo), markingcode, dan nama customer
 * Dilengkapi proteksi billing dan penyerahan kargo (fdGive)
 */
export async function lookupListCode(q?: string, limit = 20) {
  const cleanQ = (q || '').trim()
  const safeLimit = Math.min(Math.max(1, limit), 50)
  const escapedQ = cleanQ.replace(/'/g, "''")

  if (!cleanQ) {
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT TOP ${safeLimit}
        RTRIM(e.fdListCode) as fdListCode,
        RTRIM(e.fdCustCode) as fdCustCode,
        RTRIM(c.fdCustName) as fdCustName,
        RTRIM(e.fdTerima) as fdTerima,
        RTRIM(e.fdMarkingCode) as fdMarkingCode,
        RTRIM(e.fdMarkingNo) as fdMarkingNo,
        e.fdJmlPack,
        e.fdM3,
        e.fdJmlBerat,
        e.fdCancel,
        RTRIM(bill.fdInvNo) as fdInvNo,
        bill.fdGive as fdBillGive,
        RTRIM(deliv.fdSJNo) as fdSJNo,
        deliv.fdGive as fdDelivGive
      FROM tbEntryList e WITH (NOLOCK)
      LEFT JOIN tbCustomers c WITH (NOLOCK) ON e.fdCustCode = c.fdCustCode
      OUTER APPLY (
        SELECT TOP 1 RTRIM(b.fdInvNo) as fdInvNo, b.fdGive
        FROM tbBilling b WITH (NOLOCK) 
        WHERE b.fdListCode = e.fdListCode
      ) bill
      OUTER APPLY (
        SELECT TOP 1 RTRIM(d.fdSJNo) as fdSJNo, d.fdGive 
        FROM tbDelivery d WITH (NOLOCK) 
        WHERE d.fdListCode = e.fdListCode AND d.fdGive = 1
      ) deliv
      ORDER BY e.fdListCode DESC
    `)
    return formatLookupRows(rows)
  }

  // Cari kode customer yang cocok secara cepat via tbCustomers
  const matchedCusts = await prisma.$queryRawUnsafe<any[]>(`
    SELECT TOP 15 RTRIM(fdCustCode) as fdCustCode
    FROM tbCustomers WITH (NOLOCK)
    WHERE fdCustName LIKE '%${escapedQ}%' OR fdCustCode LIKE '${escapedQ}%'
  `).catch(() => [])

  const custInSql = matchedCusts.length > 0
    ? `SELECT TOP ${safeLimit} fdListCode FROM tbEntryList WITH (NOLOCK) WHERE fdCustCode IN (${matchedCusts.map(c => `'${c.fdCustCode.replace(/'/g, "''")}'`).join(',')})`
    : `SELECT TOP 0 fdListCode FROM tbEntryList WITH (NOLOCK)`

  const rows = await prisma.$queryRawUnsafe<any[]>(`
    WITH Candidates AS (
      -- 1. By fdListCode (No. Inputan)
      SELECT TOP ${safeLimit} fdListCode
      FROM tbEntryList WITH (NOLOCK)
      WHERE fdListCode LIKE '${escapedQ}%'

      UNION

      -- 2. By fdTerima (No. Resi Pengiriman)
      SELECT TOP ${safeLimit} fdListCode
      FROM tbEntryList WITH (NOLOCK)
      WHERE fdTerima LIKE '%${escapedQ}%'

      UNION

      -- 3. By fdTrackingNo (Resi / Tracking)
      SELECT TOP ${safeLimit} fdListCode
      FROM tbEntryList WITH (NOLOCK)
      WHERE fdTrackingNo LIKE '%${escapedQ}%'

      UNION

      -- 4. By fdMarkingCode (Marking Code)
      SELECT TOP ${safeLimit} fdListCode
      FROM tbEntryList WITH (NOLOCK)
      WHERE fdMarkingCode LIKE '%${escapedQ}%'

      UNION

      -- 5. By fdMarkingNo (Nomor Marking)
      SELECT TOP ${safeLimit} fdListCode
      FROM tbEntryList WITH (NOLOCK)
      WHERE fdMarkingNo LIKE '%${escapedQ}%'

      UNION

      -- 6. By Nama Pelanggan / Kode Pelanggan
      ${custInSql}
    )
    SELECT TOP ${safeLimit}
      RTRIM(e.fdListCode) as fdListCode,
      RTRIM(e.fdCustCode) as fdCustCode,
      RTRIM(c.fdCustName) as fdCustName,
      RTRIM(e.fdTerima) as fdTerima,
      RTRIM(e.fdMarkingCode) as fdMarkingCode,
      RTRIM(e.fdMarkingNo) as fdMarkingNo,
      e.fdJmlPack,
      e.fdM3,
      e.fdJmlBerat,
      e.fdCancel,
      RTRIM(bill.fdInvNo) as fdInvNo,
      bill.fdGive as fdBillGive,
      RTRIM(deliv.fdSJNo) as fdSJNo,
      deliv.fdGive as fdDelivGive
    FROM Candidates cd
    JOIN tbEntryList e WITH (NOLOCK) ON e.fdListCode = cd.fdListCode
    LEFT JOIN tbCustomers c WITH (NOLOCK) ON e.fdCustCode = c.fdCustCode
    OUTER APPLY (
      SELECT TOP 1 RTRIM(b.fdInvNo) as fdInvNo, b.fdGive
      FROM tbBilling b WITH (NOLOCK) 
      WHERE b.fdListCode = e.fdListCode
    ) bill
    OUTER APPLY (
      SELECT TOP 1 RTRIM(d.fdSJNo) as fdSJNo, d.fdGive 
      FROM tbDelivery d WITH (NOLOCK) 
      WHERE d.fdListCode = e.fdListCode AND d.fdGive = 1
    ) deliv
    ORDER BY e.fdListCode DESC
  `)

  return formatLookupRows(rows)
}

function formatLookupRows(rows: any[]) {
  return rows.map((r) => {
    const hasBill = Boolean(r.fdInvNo && r.fdInvNo.trim())
    const isGiven = r.fdDelivGive === 1 || r.fdBillGive === 1
    let cancelBlockReason: string | null = null

    if (hasBill && isGiven) {
      cancelBlockReason = `Sudah terbit Bill (${r.fdInvNo}) & kargo sudah diserahkan (fdGive=1, SJ: ${r.fdSJNo || '-'})`
    } else if (hasBill) {
      cancelBlockReason = `Sudah terbit Bill (${r.fdInvNo})`
    } else if (isGiven) {
      cancelBlockReason = `Kargo sudah diserahkan / fdGive=1 (SJ: ${r.fdSJNo || '-'})`
    }

    return {
      ...r,
      hasBill,
      isGiven,
      isCancelBlocked: hasBill || isGiven,
      cancelBlockReason,
    }
  })
}

/**
 * Auto-detect Billing untuk form BUAT_BILL yang masih PENDING
 */
async function autoDetectBillingForForms(forms: any[]) {
  const pendingBillForms = forms.filter(
    (f) => f.fdAksi === 'BUAT_BILL' && f.fdStatus === 'PENDING'
  )

  if (pendingBillForms.length === 0) return

  for (const form of pendingBillForms) {
    const details = form.details || []
    const inputanCodes: string[] = []

    for (const d of details) {
      if (d.fdBaruNoInputan?.trim()) inputanCodes.push(d.fdBaruNoInputan.trim())
      if (d.fdAwalNoInputan?.trim()) inputanCodes.push(d.fdAwalNoInputan.trim())
    }

    if (inputanCodes.length === 0) continue

    // Cari di tbBilling
    const matchedBill = await prisma.tbBilling.findFirst({
      where: {
        fdListCode: { in: inputanCodes },
      },
      select: {
        fdInvNo: true,
        fdInvDate: true,
      },
      orderBy: {
        fdInvDate: 'desc',
      },
    })

    if (matchedBill) {
      await prisma.tbDataRevision.update({
        where: { fdId: form.fdId },
        data: {
          fdStatus: 'BILL_TERBUAT',
          fdMatchedInvNo: matchedBill.fdInvNo.trim(),
          fdMatchedInvDate: matchedBill.fdInvDate,
        },
      })
      form.fdStatus = 'BILL_TERBUAT'
      form.fdMatchedInvNo = matchedBill.fdInvNo.trim()
      form.fdMatchedInvDate = matchedBill.fdInvDate
    }
  }
}

/**
 * Mengambil daftar data revisions dengan filter, pagination, dan auto-detect billing
 */
export async function getDataRevisionsList(params: {
  page: number
  limit: number
  search?: string
  status?: string
  tipeData?: string
  aksi?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}): Promise<DataRevisionsListResponse> {
  const {
    page = 1,
    limit = 10,
    search,
    status = 'ALL',
    tipeData = 'ALL',
    aksi = 'ALL',
    sortBy = 'fdCreatedAt',
    sortOrder = 'desc',
  } = params

  const where: any = {
    fdDeletedAt: null,
  }

  if (status !== 'ALL') {
    where.fdStatus = status === 'BILL_CREATED' ? 'BILL_TERBUAT' : status
  }

  if (tipeData !== 'ALL') {
    where.fdTipeData = tipeData
  }

  if (aksi !== 'ALL') {
    where.fdAksi = aksi
  }

  if (search && search.trim() !== '') {
    const s = search.trim()
    where.OR = [
      { fdNomorForm: { contains: s } },
      { fdDibuatOleh: { contains: s } },
      { fdStuffing: { contains: s } },
      { fdBilling: { contains: s } },
      { fdAR: { contains: s } },
      { fdMatchedInvNo: { contains: s } },
      {
        details: {
          some: {
            OR: [
              { fdAwalCustCode: { contains: s } },
              { fdAwalCustName: { contains: s } },
              { fdAwalSpMark: { contains: s } },
              { fdAwalNoBilling: { contains: s } },
              { fdAwalNoInputan: { contains: s } },
              { fdBaruCustCode: { contains: s } },
              { fdBaruCustName: { contains: s } },
              { fdBaruSpMark: { contains: s } },
              { fdBaruNoBilling: { contains: s } },
              { fdBaruNoInputan: { contains: s } },
            ],
          },
        },
      },
    ]
  }

  const [total, rawData, allStats] = await Promise.all([
    prisma.tbDataRevision.count({ where }),
    prisma.tbDataRevision.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        details: {
          orderBy: { fdNo: 'asc' },
        },
        lampiran: true,
      },
    }),
    prisma.tbDataRevision.groupBy({
      by: ['fdStatus', 'fdTipeData'],
      where: { fdDeletedAt: null },
      _count: true,
    }),
  ])

  // Jalankan auto-detect untuk baris form yang dimuat
  await autoDetectBillingForForms(rawData)

  // Hitung stats
  const stats: DataRevisionsStats = {
    total: 0,
    pending: 0,
    cancelled: 0,
    billTerbuat: 0,
    tipeInputBaru: 0,
    tipeLocalCharges: 0,
    tipeRevisi: 0,
  }

  for (const s of allStats) {
    stats.total += s._count
    if (s.fdStatus === 'PENDING') stats.pending += s._count
    if (s.fdStatus === 'DATA_CANCELLED') stats.cancelled += s._count
    if (s.fdStatus === 'BILL_TERBUAT') stats.billTerbuat += s._count

    if (s.fdTipeData === 'INPUT_BARU') stats.tipeInputBaru += s._count
    if (s.fdTipeData === 'INPUT_LOCAL_CHARGES') stats.tipeLocalCharges += s._count
    if (s.fdTipeData === 'REVISI') stats.tipeRevisi += s._count
  }

  return {
    data: rawData as unknown as DataRevision[],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    stats,
  }
}

/**
 * Mengambil detail 1 dokumen form
 */
export async function getDataRevisionDetail(id: number): Promise<DataRevision | null> {
  const form = await prisma.tbDataRevision.findFirst({
    where: { fdId: id, fdDeletedAt: null },
    include: {
      details: {
        orderBy: { fdNo: 'asc' },
      },
      lampiran: {
        orderBy: { fdUploadedAt: 'desc' },
      },
    },
  })

  if (!form) return null

  // Auto-detect billing jika masih PENDING
  if (form.fdAksi === 'BUAT_BILL' && form.fdStatus === 'PENDING') {
    await autoDetectBillingForForms([form])
  }

  return form as unknown as DataRevision
}

/**
 * Membuat Form Input & Revisi Data baru
 */
export async function createDataRevision(
  payload: {
    fdNomorForm: string
    fdTipeData: string
    fdAksi: string
    fdTanggal: string
    fdDibuatOleh?: string | null
    fdStuffing?: string | null
    fdBilling?: string | null
    fdAR?: string | null
    fdDiketahui?: string | null
    fdCatatan?: string | null
    details: RevisionDetailItem[]
  },
  username: string
): Promise<DataRevision> {
  // Proteksi Cancel: fdListCode yang sudah ada bill atau sudah fdGive = 1 TIDAK BISA di-cancel
  if (payload.fdAksi === 'CANCEL_DATA') {
    const targetCodes: string[] = []
    for (const d of payload.details) {
      if (d.fdAwalNoInputan?.trim()) targetCodes.push(d.fdAwalNoInputan.trim())
      else if (d.fdBaruNoInputan?.trim()) targetCodes.push(d.fdBaruNoInputan.trim())
    }

    if (targetCodes.length > 0) {
      const check = await checkListCodeCancelEligibility(targetCodes)
      if (!check.eligible) {
        const errorMsg = check.violations
          .map((v) => `fdListCode ${v.fdListCode}: ${v.reason}`)
          .join('; ')
        throw new Error(`Data tidak dapat dibatalkan! ${errorMsg}`)
      }
    }
  }

  const created = await prisma.tbDataRevision.create({
    data: {
      fdNomorForm: payload.fdNomorForm.trim(),
      fdTipeData: payload.fdTipeData,
      fdAksi: payload.fdAksi,
      fdStatus: 'PENDING',
      fdTanggal: new Date(payload.fdTanggal),
      fdDibuatOleh: payload.fdDibuatOleh?.trim() || null,
      fdTglDibuat: payload.fdDibuatOleh ? new Date() : null,
      fdStuffing: payload.fdStuffing?.trim() || null,
      fdTglStuffing: payload.fdStuffing ? new Date() : null,
      fdBilling: payload.fdBilling?.trim() || null,
      fdTglBilling: payload.fdBilling ? new Date() : null,
      fdAR: payload.fdAR?.trim() || null,
      fdTglAR: payload.fdAR ? new Date() : null,
      fdDiketahui: payload.fdDiketahui?.trim() || null,
      fdTglDiketahui: payload.fdDiketahui ? new Date() : null,
      fdCatatan: payload.fdCatatan?.trim() || null,
      fdCreatedBy: username,
      details: {
        create: payload.details.map((d, idx) => ({
          fdNo: d.fdNo || idx + 1,
          fdAwalCustCode: d.fdAwalCustCode?.trim() || null,
          fdAwalCustName: d.fdAwalCustName?.trim() || null,
          fdAwalSpMark: d.fdAwalSpMark?.trim() || null,
          fdAwalNoBilling: d.fdAwalNoBilling?.trim() || null,
          fdAwalQtyVolWgt: d.fdAwalQtyVolWgt?.trim() || null,
          fdAwalNoInputan: d.fdAwalNoInputan?.trim() || null,
          fdAwalDetail: d.fdAwalDetail?.trim() || null,
          fdBaruCustCode: d.fdBaruCustCode?.trim() || null,
          fdBaruCustName: d.fdBaruCustName?.trim() || null,
          fdBaruSpMark: d.fdBaruSpMark?.trim() || null,
          fdBaruNoBilling: d.fdBaruNoBilling?.trim() || null,
          fdBaruQtyVolWgt: d.fdBaruQtyVolWgt?.trim() || null,
          fdBaruNoInputan: d.fdBaruNoInputan?.trim() || null,
          fdBaruDetail: d.fdBaruDetail?.trim() || null,
        })),
      },
    },
    include: {
      details: true,
      lampiran: true,
    },
  })

  // Update counter di tbDataRevisionCounter saat form benar-benar disimpan
  try {
    const tgl = payload.fdTanggal ? new Date(payload.fdTanggal) : new Date()
    const formYear = isNaN(tgl.getFullYear()) ? new Date().getFullYear() : tgl.getFullYear()
    const formMonth = isNaN(tgl.getMonth()) ? new Date().getMonth() + 1 : tgl.getMonth() + 1

    const parts = payload.fdNomorForm.trim().split('/')
    let usedSeq = 1
    if (parts.length === 3 && parts[0]) {
      const parsed = parseInt(parts[0], 10)
      if (!isNaN(parsed)) {
        usedSeq = parsed
      }
    }

    const currentCounter = await prisma.tbDataRevisionCounter.findUnique({
      where: {
        fdYear_fdMonth: {
          fdYear: formYear,
          fdMonth: formMonth,
        },
      },
    })

    const newCount = Math.max(currentCounter?.fdCount ?? 0, usedSeq)

    await prisma.tbDataRevisionCounter.upsert({
      where: {
        fdYear_fdMonth: {
          fdYear: formYear,
          fdMonth: formMonth,
        },
      },
      update: {
        fdCount: newCount,
      },
      create: {
        fdYear: formYear,
        fdMonth: formMonth,
        fdCount: newCount,
      },
    })
  } catch (err: any) {
    logger.warn(`[DataRevision] Gagal update tbDataRevisionCounter: ${err.message}`)
  }

  // Cek apakah langsung terdeteksi bill jika BUAT_BILL
  if (created.fdAksi === 'BUAT_BILL') {
    await autoDetectBillingForForms([created])
  }

  logger.info(`[DataRevision] Form dibuat: ${created.fdNomorForm} oleh ${username}`)
  return created as unknown as DataRevision
}

/**
 * Mengupdate Form Input & Revisi Data
 */
export async function updateDataRevision(
  id: number,
  payload: any,
  username: string
): Promise<DataRevision | null> {
  const existing = await prisma.tbDataRevision.findFirst({
    where: { fdId: id, fdDeletedAt: null },
  })

  if (!existing) return null

  // Hapus detail lama jika ada payload details
  if (payload.details && Array.isArray(payload.details)) {
    await prisma.tbDataRevisionDetail.deleteMany({
      where: { fdRevisionId: id },
    })
  }

  const updated = await prisma.tbDataRevision.update({
    where: { fdId: id },
    data: {
      fdNomorForm: payload.fdNomorForm?.trim() ?? existing.fdNomorForm,
      fdTipeData: payload.fdTipeData ?? existing.fdTipeData,
      fdAksi: payload.fdAksi ?? existing.fdAksi,
      fdTanggal: payload.fdTanggal ? new Date(payload.fdTanggal) : existing.fdTanggal,
      fdDibuatOleh: payload.fdDibuatOleh?.trim() ?? existing.fdDibuatOleh,
      fdStuffing: payload.fdStuffing?.trim() ?? existing.fdStuffing,
      fdBilling: payload.fdBilling?.trim() ?? existing.fdBilling,
      fdAR: payload.fdAR?.trim() ?? existing.fdAR,
      fdDiketahui: payload.fdDiketahui?.trim() ?? existing.fdDiketahui,
      fdCatatan: payload.fdCatatan?.trim() ?? existing.fdCatatan,
      fdUpdatedAt: new Date(),
      details: payload.details
        ? {
            create: payload.details.map((d: any, idx: number) => ({
              fdNo: d.fdNo || idx + 1,
              fdAwalCustCode: d.fdAwalCustCode?.trim() || null,
              fdAwalCustName: d.fdAwalCustName?.trim() || null,
              fdAwalSpMark: d.fdAwalSpMark?.trim() || null,
              fdAwalNoBilling: d.fdAwalNoBilling?.trim() || null,
              fdAwalQtyVolWgt: d.fdAwalQtyVolWgt?.trim() || null,
              fdAwalNoInputan: d.fdAwalNoInputan?.trim() || null,
              fdAwalDetail: d.fdAwalDetail?.trim() || null,
              fdBaruCustCode: d.fdBaruCustCode?.trim() || null,
              fdBaruCustName: d.fdBaruCustName?.trim() || null,
              fdBaruSpMark: d.fdBaruSpMark?.trim() || null,
              fdBaruNoBilling: d.fdBaruNoBilling?.trim() || null,
              fdBaruQtyVolWgt: d.fdBaruQtyVolWgt?.trim() || null,
              fdBaruNoInputan: d.fdBaruNoInputan?.trim() || null,
              fdBaruDetail: d.fdBaruDetail?.trim() || null,
            })),
          }
        : undefined,
    },
    include: {
      details: true,
      lampiran: true,
    },
  })

  logger.info(`[DataRevision] Form diperbarui: ${updated.fdNomorForm} oleh ${username}`)
  return updated as unknown as DataRevision
}

/**
 * Soft delete form
 */
export async function deleteDataRevision(id: number, username: string): Promise<boolean> {
  const existing = await prisma.tbDataRevision.findFirst({
    where: { fdId: id, fdDeletedAt: null },
  })
  if (!existing) return false

  await prisma.tbDataRevision.update({
    where: { fdId: id },
    data: {
      fdDeletedAt: new Date(),
    },
  })

  logger.info(`[DataRevision] Form dihapus (soft-delete): ${existing.fdNomorForm} oleh ${username}`)
  return true
}

/**
 * Eksekusi Aksi Cancel: Mengubah fdCancel = 1 pada tbEntryList
 */
export async function executeCancelData(id: number, username: string): Promise<DataRevision> {
  const form = await prisma.tbDataRevision.findFirst({
    where: { fdId: id, fdDeletedAt: null },
    include: { details: true },
  })

  if (!form) throw new Error('Dokumen Form Input & Revisi Data tidak ditemukan')

  // Ambil semua nomor inputan (fdListCode) dari detail form
  const inputanCodes: string[] = []
  for (const d of form.details) {
    if (d.fdAwalNoInputan?.trim()) inputanCodes.push(d.fdAwalNoInputan.trim())
    else if (d.fdBaruNoInputan?.trim()) inputanCodes.push(d.fdBaruNoInputan.trim())
  }

  if (inputanCodes.length === 0) {
    throw new Error('Tidak ada Nomor Inputan (fdListCode) yang valid untuk dibatalkan')
  }

  // Proteksi: Double check apakah ada fdListCode yang sudah dibuatkan Bill atau sudah diserahkan (fdGive = 1)
  const check = await checkListCodeCancelEligibility(inputanCodes)
  if (!check.eligible) {
    const errorMsg = check.violations
      .map((v) => `fdListCode ${v.fdListCode}: ${v.reason}`)
      .join('; ')
    throw new Error(`Eksekusi pembatalan diblokir! ${errorMsg}`)
  }

  // Update fdCancel = 1 di tbEntryList
  for (const code of inputanCodes) {
    await prisma.$executeRawUnsafe(
      `UPDATE tbEntryList SET fdCancel = 1 WHERE RTRIM(fdListCode) = '${code.replace(/'/g, "''")}'`
    )
  }

  // Update status form menjadi DATA_CANCELLED
  const updated = await prisma.tbDataRevision.update({
    where: { fdId: id },
    data: {
      fdStatus: 'DATA_CANCELLED',
      fdExecutedBy: username,
      fdExecutedAt: new Date(),
    },
    include: {
      details: true,
      lampiran: true,
    },
  })

  logger.info(
    `[DataRevision] Eksekusi Cancel Data berhasil: Form ${form.fdNomorForm}, inputan: [${inputanCodes.join(', ')}] oleh ${username}`
  )

  return updated as unknown as DataRevision
}

/**
 * Revert Cancel Data: Mengembalikan fdCancel = 0 pada tbEntryList
 */
export async function revertCancelData(id: number, username: string): Promise<DataRevision> {
  const form = await prisma.tbDataRevision.findFirst({
    where: { fdId: id, fdDeletedAt: null },
    include: { details: true },
  })

  if (!form) throw new Error('Dokumen Form Input & Revisi Data tidak ditemukan')

  const inputanCodes: string[] = []
  for (const d of form.details) {
    if (d.fdAwalNoInputan?.trim()) inputanCodes.push(d.fdAwalNoInputan.trim())
    else if (d.fdBaruNoInputan?.trim()) inputanCodes.push(d.fdBaruNoInputan.trim())
  }

  for (const code of inputanCodes) {
    await prisma.$executeRawUnsafe(
      `UPDATE tbEntryList SET fdCancel = 0 WHERE RTRIM(fdListCode) = '${code.replace(/'/g, "''")}'`
    )
  }

  const updated = await prisma.tbDataRevision.update({
    where: { fdId: id },
    data: {
      fdStatus: 'PENDING',
      fdExecutedBy: null,
      fdExecutedAt: null,
    },
    include: {
      details: true,
      lampiran: true,
    },
  })

  logger.info(
    `[DataRevision] Revert Cancel Data berhasil: Form ${form.fdNomorForm}, inputan: [${inputanCodes.join(', ')}] oleh ${username}`
  )

  return updated as unknown as DataRevision
}

/**
 * Upload lampiran ke form
 */
export async function uploadLampiran(
  revisionId: number,
  file: File,
  username: string,
  keterangan?: string
) {
  const form = await prisma.tbDataRevision.findFirst({
    where: { fdId: revisionId, fdDeletedAt: null },
  })
  if (!form) throw new Error('Form revisi data tidak ditemukan')

  const ext = path.extname(file.name) || '.bin'
  const savedFilename = `rev_${revisionId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`
  const targetPath = path.join(UPLOAD_DIR, savedFilename)

  const arrayBuffer = await file.arrayBuffer()
  fs.writeFileSync(targetPath, Buffer.from(arrayBuffer))

  const lampiran = await prisma.tbDataRevisionLampiran.create({
    data: {
      fdRevisionId: revisionId,
      fdNamaFile: file.name,
      fdNamaFileSimpan: savedFilename,
      fdMimeType: file.type || 'application/octet-stream',
      fdUkuranBytes: BigInt(file.size),
      fdPath: `/uploads/data-revisions/${savedFilename}`,
      fdUploadedBy: username,
      fdKeterangan: keterangan || null,
    },
  })

  return {
    ...lampiran,
    fdUkuranBytes: Number(lampiran.fdUkuranBytes),
  }
}

/**
 * Upload lampiran dari Base64 string (khusus mobile app / API payload)
 */
export async function uploadLampiranBase64(
  revisionId: number,
  base64String: string,
  fileName: string | undefined,
  username: string,
  keterangan?: string
) {
  const form = await prisma.tbDataRevision.findFirst({
    where: { fdId: revisionId, fdDeletedAt: null },
  })
  if (!form) throw new Error('Form revisi data tidak ditemukan')

  // Bersihkan data URL prefix jika ada
  let cleanBase64 = base64String
  let ext = '.jpg'
  let mimeType = 'image/jpeg'

  if (base64String.includes(';base64,')) {
    const parts = base64String.split(';base64,')
    const mime = parts[0] || ''
    if (mime.includes('png')) {
      ext = '.png'
      mimeType = 'image/png'
    } else if (mime.includes('webp')) {
      ext = '.webp'
      mimeType = 'image/webp'
    } else if (mime.includes('pdf')) {
      ext = '.pdf'
      mimeType = 'application/pdf'
    }
    cleanBase64 = parts[1] || base64String
  } else if (fileName) {
    const fileExt = path.extname(fileName)
    if (fileExt) ext = fileExt
  }

  const buffer = Buffer.from(cleanBase64, 'base64')
  if (buffer.length > 20 * 1024 * 1024) {
    throw new Error('Ukuran file lampiran melebihi batas 20 MB')
  }

  const originalName = fileName || `lampiran_${Date.now()}${ext}`
  const savedFilename = `rev_${revisionId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`
  const targetPath = path.join(UPLOAD_DIR, savedFilename)

  fs.writeFileSync(targetPath, buffer)

  const lampiran = await prisma.tbDataRevisionLampiran.create({
    data: {
      fdRevisionId: revisionId,
      fdNamaFile: originalName,
      fdNamaFileSimpan: savedFilename,
      fdMimeType: mimeType,
      fdUkuranBytes: BigInt(buffer.length),
      fdPath: `/uploads/data-revisions/${savedFilename}`,
      fdUploadedBy: username,
      fdKeterangan: keterangan || null,
    },
  })

  return {
    ...lampiran,
    fdUkuranBytes: Number(lampiran.fdUkuranBytes),
  }
}

/**
 * Hapus lampiran
 */
export async function deleteLampiran(lampiranId: number) {
  const lampiran = await prisma.tbDataRevisionLampiran.findUnique({
    where: { fdId: lampiranId },
  })
  if (!lampiran) throw new Error('Lampiran tidak ditemukan')

  const filePath = path.join(UPLOAD_DIR, lampiran.fdNamaFileSimpan)
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath)
    } catch (e) {
      logger.warn(`Gagal menghapus fisik file lampiran: ${filePath}`)
    }
  }

  await prisma.tbDataRevisionLampiran.delete({
    where: { fdId: lampiranId },
  })

  return true
}

/**
 * Crop & Rotate file fisik lampiran existing
 */
export async function cropLampiran(
  lampiranId: number,
  options: {
    rotate?: number
    crop?: { x: number; y: number; width: number; height: number }
    isRatio?: boolean
  },
  username: string
) {
  const lampiran = await prisma.tbDataRevisionLampiran.findUnique({
    where: { fdId: lampiranId },
  })
  if (!lampiran) throw new Error('Lampiran tidak ditemukan')

  const filePath = path.join(UPLOAD_DIR, lampiran.fdNamaFileSimpan)
  if (!fs.existsSync(filePath)) {
    throw new Error('File fisik lampiran tidak ditemukan di server')
  }

  // 1. Baca metadata gambar dengan sharp
  let image = sharp(filePath)
  const metadata = await image.metadata()

  // 2. Putar jika ada rotasi
  const rotateDeg = Number(options.rotate) || 0
  if (rotateDeg > 0) {
    image = image.rotate(rotateDeg)
  }

  const rotatedBuffer = await image.toBuffer()
  let rotatedImage = sharp(rotatedBuffer)
  const rotatedMeta = await rotatedImage.metadata()

  const imgW = rotatedMeta.width || metadata.width || 1000
  const imgH = rotatedMeta.height || metadata.height || 1000

  // 3. Extract crop jika ada crop
  if (options.crop) {
    let left = options.crop.x
    let top = options.crop.y
    let width = options.crop.width
    let height = options.crop.height

    if (options.isRatio) {
      left = Math.round(left * imgW)
      top = Math.round(top * imgH)
      width = Math.round(width * imgW)
      height = Math.round(height * imgH)
    }

    // Boundary check
    left = Math.max(0, Math.min(Math.round(left), imgW - 10))
    top = Math.max(0, Math.min(Math.round(top), imgH - 10))
    width = Math.max(10, Math.min(Math.round(width), imgW - left))
    height = Math.max(10, Math.min(Math.round(height), imgH - top))

    rotatedImage = rotatedImage.extract({ left, top, width, height })
  }

  // Simpan hasil crop
  const newFilename = `rev_${lampiran.fdRevisionId}_${Date.now()}_cropped.jpg`
  const newFilePath = path.join(UPLOAD_DIR, newFilename)

  await rotatedImage.jpeg({ quality: 90 }).toFile(newFilePath)

  // Hapus file lama jika berbeda
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath)
    } catch {
      // ignore
    }
  }

  const stat = fs.statSync(newFilePath)

  const updated = await prisma.tbDataRevisionLampiran.update({
    where: { fdId: lampiranId },
    data: {
      fdNamaFileSimpan: newFilename,
      fdMimeType: 'image/jpeg',
      fdUkuranBytes: BigInt(stat.size),
      fdPath: `/uploads/data-revisions/${newFilename}`,
    },
  })

  logger.info(`[DataRevision] Lampiran #${lampiranId} berhasil di-crop oleh ${username}`)
  return updated
}

/**
 * Crop & Rotate gambar Base64 (untuk preview / form wizard sebelum disubmit)
 */
export async function cropBase64Image(
  base64String: string,
  options: {
    rotate?: number
    crop?: { x: number; y: number; width: number; height: number }
    isRatio?: boolean
  }
) {
  let cleanBase64 = base64String
  if (base64String.includes(';base64,')) {
    cleanBase64 = base64String.split(';base64,')[1] || ''
  }

  const buffer = Buffer.from(cleanBase64, 'base64')
  let image = sharp(buffer)

  const rotateDeg = Number(options.rotate) || 0
  if (rotateDeg > 0) {
    image = image.rotate(rotateDeg)
  }

  const rotatedBuffer = await image.toBuffer()
  let rotatedImage = sharp(rotatedBuffer)
  const meta = await rotatedImage.metadata()

  const imgW = meta.width || 1000
  const imgH = meta.height || 1000

  if (options.crop) {
    let left = options.crop.x
    let top = options.crop.y
    let width = options.crop.width
    let height = options.crop.height

    if (options.isRatio) {
      left = Math.round(left * imgW)
      top = Math.round(top * imgH)
      width = Math.round(width * imgW)
      height = Math.round(height * imgH)
    }

    left = Math.max(0, Math.min(Math.round(left), imgW - 10))
    top = Math.max(0, Math.min(Math.round(top), imgH - 10))
    width = Math.max(10, Math.min(Math.round(width), imgW - left))
    height = Math.max(10, Math.min(Math.round(height), imgH - top))

    rotatedImage = rotatedImage.extract({ left, top, width, height })
  }

  const outBuffer = await rotatedImage.jpeg({ quality: 90 }).toBuffer()
  return `data:image/jpeg;base64,${outBuffer.toString('base64')}`
}

/**
 * Ekspor Excel data revisi
 */
export async function exportDataRevisionsExcel(): Promise<Buffer> {
  const forms = await prisma.tbDataRevision.findMany({
    where: { fdDeletedAt: null },
    include: {
      details: { orderBy: { fdNo: 'asc' } },
    },
    orderBy: { fdTanggal: 'desc' },
  })

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'mshipping ERP'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Form Revisi Data')

  sheet.columns = [
    { header: 'No. Form', key: 'nomorForm', width: 16 },
    { header: 'Tanggal', key: 'tanggal', width: 14 },
    { header: 'Tipe Data', key: 'tipeData', width: 18 },
    { header: 'Target Aksi', key: 'aksi', width: 16 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'No. Item', key: 'itemNo', width: 8 },
    // Data Awal
    { header: 'Awal Cust Code', key: 'awalCustCode', width: 14 },
    { header: 'Awal Cust Name', key: 'awalCustName', width: 22 },
    { header: 'Awal SP/Resi', key: 'awalSpMark', width: 18 },
    { header: 'Awal Billing', key: 'awalBilling', width: 18 },
    { header: 'Awal Qty/Vol', key: 'awalQty', width: 16 },
    { header: 'Awal No Inputan', key: 'awalInputan', width: 16 },
    { header: 'Awal Detail', key: 'awalDetail', width: 28 },
    // Data Baru
    { header: 'Baru Cust Code', key: 'baruCustCode', width: 14 },
    { header: 'Baru Cust Name', key: 'baruCustName', width: 22 },
    { header: 'Baru SP/Resi', key: 'baruSpMark', width: 18 },
    { header: 'Baru Billing', key: 'baruBilling', width: 18 },
    { header: 'Baru Qty/Vol', key: 'baruQty', width: 16 },
    { header: 'Baru No Inputan', key: 'baruInputan', width: 16 },
    { header: 'Baru Detail', key: 'baruDetail', width: 28 },
    // Officers
    { header: 'Dibuat Oleh', key: 'dibuatOleh', width: 16 },
    { header: 'Stuffing', key: 'stuffing', width: 16 },
    { header: 'Billing', key: 'billing', width: 16 },
    { header: 'AR', key: 'ar', width: 16 },
    { header: 'Diketahui', key: 'diketahui', width: 16 },
    { header: 'Invoice Terbit', key: 'matchedInv', width: 20 },
  ]

  // Header styling
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  }

  for (const form of forms) {
    const details = form.details.length > 0 ? form.details : [{} as any]

    for (const d of details) {
      sheet.addRow({
        nomorForm: form.fdNomorForm,
        tanggal: form.fdTanggal.toISOString().split('T')[0],
        tipeData: form.fdTipeData,
        aksi: form.fdAksi,
        status: form.fdStatus,
        itemNo: d.fdNo || 1,
        awalCustCode: d.fdAwalCustCode || '-',
        awalCustName: d.fdAwalCustName || '-',
        awalSpMark: d.fdAwalSpMark || '-',
        awalBilling: d.fdAwalNoBilling || '-',
        awalQty: d.fdAwalQtyVolWgt || '-',
        awalInputan: d.fdAwalNoInputan || '-',
        awalDetail: d.fdAwalDetail || '-',
        baruCustCode: d.fdBaruCustCode || '-',
        baruCustName: d.fdBaruCustName || '-',
        baruSpMark: d.fdBaruSpMark || '-',
        baruBilling: d.fdBaruNoBilling || '-',
        baruQty: d.fdBaruQtyVolWgt || '-',
        baruInputan: d.fdBaruNoInputan || '-',
        baruDetail: d.fdBaruDetail || '-',
        dibuatOleh: form.fdDibuatOleh || '-',
        stuffing: form.fdStuffing || '-',
        billing: form.fdBilling || '-',
        ar: form.fdAR || '-',
        diketahui: form.fdDiketahui || '-',
        matchedInv: form.fdMatchedInvNo || '-',
      })
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
