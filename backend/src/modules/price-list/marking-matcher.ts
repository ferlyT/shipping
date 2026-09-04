import { prisma } from '../../config/database'

export interface MarkingInfo {
  code: string
  branch: string | null
  listType: number | null
  loadDate: Date | null
}

export function normalizeMode(mode?: string | null): string {
  if (!mode) return 'BY SEA'
  const m = mode.trim().toUpperCase()
  if (m.includes('AIR') || m.includes('UDARA')) return 'BY AIR'
  return 'BY SEA'
}

/**
 * Mengambil data kontainer / marking dari tbMarking
 */
export async function getMarkingInfo(markingCode: string): Promise<MarkingInfo | null> {
  const clean = markingCode.trim().toUpperCase()
  const rows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT TOP 1 RTRIM(fdMarkingCode) as code, RTRIM(fdBranchCode) as branch, fdListType, fdLoadDate
    FROM tbMarking WITH (NOLOCK)
    WHERE RTRIM(fdMarkingCode) = '${clean}'
  `)
  if (!rows || rows.length === 0) return null
  return {
    code: rows[0].code,
    branch: rows[0].branch || null,
    listType: rows[0].fdListType ? Number(rows[0].fdListType) : null,
    loadDate: rows[0].fdLoadDate ? new Date(rows[0].fdLoadDate) : null,
  }
}

/**
 * Memeriksa apakah shipmentMarking >= overrideMarking:
 * 1. Jika sama persis -> true
 * 2. Jika ada di tbMarking dengan rute (branch & mode) sama:
 *    bandingkan fdLoadDate (tanggal muat kontainer).
 * 3. Fallback alfanumerik jika berawalan kode tahun & cabang sama (misal 26GZ...).
 */
export async function isMarkingGreaterOrEqual(
  shipmentMarking: string,
  overrideMarking: string,
  expectedMode?: string,
  expectedBranch?: string
): Promise<boolean> {
  const cleanShipment = shipmentMarking.trim().toUpperCase()
  const cleanOverride = overrideMarking.trim().toUpperCase()

  if (cleanShipment === cleanOverride) return true

  const [infoShipment, infoOverride] = await Promise.all([
    getMarkingInfo(cleanShipment),
    getMarkingInfo(cleanOverride),
  ])

  if (infoShipment && infoOverride) {
    // Validasi cabang / rute
    const bShipment = (infoShipment.branch || expectedBranch || '').trim().toUpperCase()
    const bOverride = (infoOverride.branch || '').trim().toUpperCase()
    if (bShipment && bOverride && bShipment !== bOverride) {
      return false
    }

    // Validasi moda transportasi (Laut = 2, Udara = 1)
    if (infoShipment.listType && infoOverride.listType && infoShipment.listType !== infoOverride.listType) {
      return false
    }

    // Bandingkan tanggal muat kontainer (fdLoadDate)
    if (infoShipment.loadDate && infoOverride.loadDate) {
      const tShipment = infoShipment.loadDate.getTime()
      const tOverride = infoOverride.loadDate.getTime()
      if (tShipment !== tOverride) {
        return tShipment >= tOverride
      }
    }
  }

  // Fallback perbandingan alfanumerik (misal 26GZD07 >= 26GZC91)
  const prefixShipment = cleanShipment.slice(0, 4)
  const prefixOverride = cleanOverride.slice(0, 4)
  if (prefixShipment && prefixOverride && prefixShipment === prefixOverride) {
    return cleanShipment >= cleanOverride
  }

  // Jika beda cabang/prefix (misal 26SG vs 26GZ): tidak boleh dianggap override
  return false
}

/**
 * Mencari upload master price list yang memiliki marking override dan shipmentMarking >= overrideMarking
 */
export async function findGeneralMarkingOverrideUpload(
  markingCode: string,
  filters?: { mode?: string; branch?: string; targetDate?: Date }
) {
  const targetMode = filters?.mode ? normalizeMode(filters.mode) : undefined
  const targetBranch = filters?.branch ? filters.branch.trim().toUpperCase() : undefined

  const shipmentInfo = await getMarkingInfo(markingCode)
  const shipmentDate = shipmentInfo?.loadDate || filters?.targetDate || new Date()

  // Ambil upload aktif yang memiliki marking override, diurutkan terbaru
  const uploadsWithMarkings = await prisma.tbPriceListUpload.findMany({
    where: {
      status: { not: 'FAILED' },
      isSuperseded: false,
      markings: { some: {} },
    },
    include: { markings: true },
    orderBy: [{ effectiveDate: 'desc' }, { uploadedAt: 'desc' }],
  })

  // Cek jika ada upload umum baru (tanpa marking) yang tanggal efektifnya sudah berlaku untuk shipmentDate ini
  const newerGeneralUpload = await prisma.tbPriceListUpload.findFirst({
    where: {
      status: { not: 'FAILED' },
      isSuperseded: false,
      effectiveDate: { lte: shipmentDate },
    },
    orderBy: [{ effectiveDate: 'desc' }, { uploadedAt: 'desc' }],
  })

  for (const upload of uploadsWithMarkings) {
    for (const m of upload.markings) {
      if (targetMode && m.mode && normalizeMode(m.mode) !== targetMode) {
        continue
      }
      if (targetBranch && m.agentName && m.agentName.trim().toUpperCase() !== targetBranch) {
        continue
      }

      const isGe = await isMarkingGreaterOrEqual(markingCode, m.markingCode, targetMode, targetBranch)
      if (isGe) {
        return {
          upload,
          matchedMarking: m.markingCode,
        }
      }
    }
  }

  return null
}

/**
 * Mencari upload customer price list yang memiliki marking override dan shipmentMarking >= overrideMarking
 */
export async function findCustomerMarkingOverrideUpload(
  fdCustCode: string,
  markingCode: string,
  filters?: { mode?: string; branch?: string; targetDate?: Date }
) {
  const cleanCust = fdCustCode.trim()
  const targetMode = filters?.mode ? normalizeMode(filters.mode) : undefined
  const targetBranch = filters?.branch ? filters.branch.trim().toUpperCase() : undefined

  const shipmentInfo = await getMarkingInfo(markingCode)
  const shipmentDate = shipmentInfo?.loadDate || filters?.targetDate || new Date()

  const uploadsWithMarkings = await prisma.tbCustomerPriceListUpload.findMany({
    where: {
      fdCustCode: cleanCust,
      status: { not: 'FAILED' },
      isSuperseded: false,
      markings: { some: {} },
    },
    include: { markings: true },
    orderBy: [{ effectiveDate: 'desc' }, { uploadedAt: 'desc' }],
  })

  for (const upload of uploadsWithMarkings) {
    for (const m of upload.markings) {
      if (targetMode && m.mode && normalizeMode(m.mode) !== targetMode) {
        continue
      }
      if (targetBranch && m.agentName && m.agentName.trim().toUpperCase() !== targetBranch) {
        continue
      }

      const isGe = await isMarkingGreaterOrEqual(markingCode, m.markingCode, targetMode, targetBranch)
      if (isGe) {
        return {
          upload,
          matchedMarking: m.markingCode,
        }
      }
    }
  }

  return null
}
