import { prisma } from '../../config/database'
import { logger } from '../../config/logger'

/**
 * Menghasilkan nomor kasir bulanan:
 * - Kasir Resmi: RR-000001-MM-YYYY
 * - Kasir Sementara: TR-000001-MM-YYYY
 * Urutan 6-digit otomatis di-reset ke 1 setiap awal bulan baru.
 */
export async function generateMonthlyCashierId(
  type: 'OFFICIAL' | 'TEMPORARY',
  cashierDate: Date | string,
  tx?: any
): Promise<string> {
  const db = tx || prisma
  const d = typeof cashierDate === 'string' ? new Date(cashierDate) : cashierDate
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = String(d.getFullYear())
  const prefix = type === 'OFFICIAL' ? 'RR-' : 'TR-'
  const tableName = type === 'OFFICIAL' ? 'tbCashier' : 'tb2Cashier'
  const suffix = `-${mm}-${yyyy}`

  try {
    // Cari sequence tertinggi pada bulan dan tahun terpilih
    const query = `
      SELECT TOP 1 fdCashierID
      FROM ${tableName} WITH (UPDLOCK, HOLDLOCK)
      WHERE fdCashierID LIKE '${prefix}%${suffix}'
      ORDER BY fdCashierID DESC
    `
    const rows: any[] = await db.$queryRawUnsafe(query)

    let nextSeq = 1
    if (rows && rows.length > 0 && rows[0]?.fdCashierID) {
      const rawId = String(rows[0].fdCashierID).trim()
      const parts = rawId.split('-')
      if (parts.length >= 4) {
        // Format: RR-XXXXXX-MM-YYYY -> parts[1] adalah 6 digit sequence
        const currentSeq = parseInt(parts[1] || '0', 10)
        if (!isNaN(currentSeq) && currentSeq >= 1) {
          nextSeq = currentSeq + 1
        }
      }
    }

    const paddedSeq = String(nextSeq).padStart(6, '0')
    return `${prefix}${paddedSeq}${suffix}`
  } catch (err: any) {
    logger.error(`[generateMonthlyCashierId] Gagal generate nomor kasir ${type}: ${err.message}`)
    throw err
  }
}

/**
 * Mengambil dan meng-increment nomor baris unik 7 digit secara atomik dari tbMasterCounter
 * - code 'A' -> Kasir Resmi
 * - code 'B' -> Kasir Sementara
 * - field 'fdCRCounter' -> Baris Penerimaan Uang (tbCashierRcv / tb2CashierRcv)
 * - field 'fdCDCounter' -> Baris Alokasi Invoice (tbCashierDetail / tb2CashierDetail)
 */
export async function getNextMasterCounterId(
  code: 'A' | 'B',
  field: 'fdCRCounter' | 'fdCDCounter',
  tx?: any
): Promise<string> {
  const db = tx || prisma

  try {
    const updateQuery = `
      UPDATE tbMasterCounter
      SET ${field} = ${field} + 1
      OUTPUT INSERTED.${field}
      WHERE fdCode = '${code}'
    `
    const result: any[] = await db.$queryRawUnsafe(updateQuery)

    if (!result || result.length === 0) {
      throw new Error(`tbMasterCounter record untuk fdCode = '${code}' tidak ditemukan`)
    }

    const counterVal = Number(result[0][field])
    return String(counterVal).padStart(7, '0')
  } catch (err: any) {
    logger.error(`[getNextMasterCounterId] Gagal increment counter ${field} (code: ${code}): ${err.message}`)
    throw err
  }
}
