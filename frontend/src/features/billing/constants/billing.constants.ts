/**
 * Konstanta Tipe Tagihan (Bill Types)
 * - BILL_GABUNGAN: ditandai dengan adanya tanda ';' pada marking no / marking code.
 *   Validasi dicek menggunakan data agregasi per marking (Modal Detail M3 per Marking).
 * - BILL_REVISI: tidak punya fdListCode operasional dan karakter ke-5 (index 4) adalah angka '1'.
 *   Sementara tidak perlu divalidasi.
 * - BILL_TRANSPORT: tidak punya fdListCode operasional dan karakter ke-10 (index 9) adalah huruf 'A'.
 *   Sementara tidak perlu divalidasi.
 * - BILL_REGULAR: tagihan standar dengan kode entry list operasional.
 */

export const BILL_TYPES = {
  GABUNGAN: 'BILL_GABUNGAN',
  REVISI: 'BILL_REVISI',
  TRANSPORT: 'BILL_TRANSPORT',
  REGULAR: 'BILL_REGULAR',
} as const

export type BillType = typeof BILL_TYPES[keyof typeof BILL_TYPES]

export interface BillTypeConfig {
  type: BillType
  label: string
  shortLabel: string
  description: string
  badgeVariant: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
  badgeClasses: string
  skipValidation: boolean
}

export const BILL_TYPE_CONFIGS: Record<BillType, BillTypeConfig> = {
  [BILL_TYPES.GABUNGAN]: {
    type: BILL_TYPES.GABUNGAN,
    label: 'Bill Gabungan',
    shortLabel: 'Gabungan',
    description: 'Tagihan gabungan multi-marking / konsolidasi. Validasi divalidasi menggunakan data Detail M3 per Marking.',
    badgeVariant: 'primary',
    badgeClasses: 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    skipValidation: false,
  },
  [BILL_TYPES.REVISI]: {
    type: BILL_TYPES.REVISI,
    label: 'Bill Revisi',
    shortLabel: 'Revisi',
    description: 'Tagihan revisi (tanpa list code, karakter ke-5 angka 1). Untuk sementara tidak perlu divalidasi.',
    badgeVariant: 'warning',
    badgeClasses: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    skipValidation: true,
  },
  [BILL_TYPES.TRANSPORT]: {
    type: BILL_TYPES.TRANSPORT,
    label: 'Bill Transport',
    shortLabel: 'Transport',
    description: 'Tagihan ongkos transport (tanpa list code, karakter ke-10 huruf A). Validasi khusus: pengecekan duplikasi nominal pada customer & marking code yang sama.',
    badgeVariant: 'info',
    badgeClasses: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    skipValidation: false,
  },
  [BILL_TYPES.REGULAR]: {
    type: BILL_TYPES.REGULAR,
    label: 'Bill Reguler',
    shortLabel: 'Reguler',
    description: 'Tagihan reguler standar operasional.',
    badgeVariant: 'default',
    badgeClasses: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    skipValidation: false,
  },
}

/**
 * Cek apakah string list code merupakan unit code umum (bukan kode entry list operasional)
 */
export function isUnitCode(code?: string | null): boolean {
  if (!code?.trim()) return true
  const u = code.trim().toUpperCase()
  return ['M3', 'M2', 'KG', 'PCS', 'COLY', 'CTN', 'BOX', 'PKGS', 'VOLUME FREIGHT CHARGES'].includes(u)
}

/**
 * Cek apakah sebuah tagihan memiliki fdListCode operasional
 */
export function hasOperationalListCode(bill?: {
  fdListCode?: string | null
  details?: Array<{ fdListCode?: string | null }> | null
} | null): boolean {
  if (!bill) return false
  if (!isUnitCode(bill.fdListCode)) return true
  if (bill.details && bill.details.some((d) => !isUnitCode(d.fdListCode))) return true
  return false
}

/**
 * Mendeteksi tipe tagihan:
 * 1. Bill Gabungan: HARUS memiliki fdListCode operasional DAN marking no / marking code mengandung tanda ';'
 * 2. Bill Transport: TIDAK memiliki fdListCode operasional DAN karakter ke-10 (index 9) adalah 'A'
 * 3. Bill Revisi: TIDAK memiliki fdListCode operasional DAN karakter ke-5 (index 4) adalah '1'
 * 4. Bill Reguler: tagihan standar lainnya
 */
export function getBillType(bill?: {
  fdInvNo?: string | null
  fdListCode?: string | null
  fdMarkingCode?: string | null
  fdMarkingNo?: string | null
  details?: Array<{ fdListCode?: string | null }> | null
} | null): BillType {
  if (!bill) return BILL_TYPES.REGULAR

  const hasOpListCode = hasOperationalListCode(bill)
  const invNo = (bill.fdInvNo || '').trim()
  const markingCombined = `${bill.fdMarkingCode || ''} ${bill.fdMarkingNo || ''}`

  // 1. Bill Gabungan: HARUS memiliki fdListCode operasional DAN marking mengandung tanda ';'
  if (hasOpListCode && markingCombined.includes(';')) {
    return BILL_TYPES.GABUNGAN
  }

  // 2. Bill Transport: TIDAK punya fdListCode operasional dan karakter ke-10 (index 9) adalah 'A'
  if (!hasOpListCode && invNo.length >= 10 && invNo.charAt(9).toUpperCase() === 'A') {
    return BILL_TYPES.TRANSPORT
  }

  // 3. Bill Revisi: TIDAK punya fdListCode operasional dan karakter ke-5 (index 4) adalah '1'
  if (!hasOpListCode && invNo.length >= 5 && invNo.charAt(4) === '1') {
    return BILL_TYPES.REVISI
  }

  return BILL_TYPES.REGULAR
}
