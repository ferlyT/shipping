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
    description: 'Tagihan revisi (tanpa fdListCode pada tabel billing, karakter ke-5 no invoice angka 1 atau 2). Dikecualikan dari validasi operasional.',
    badgeVariant: 'warning',
    badgeClasses: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    skipValidation: true,
  },
  [BILL_TYPES.TRANSPORT]: {
    type: BILL_TYPES.TRANSPORT,
    label: 'Bill Transport',
    shortLabel: 'Transport',
    description: 'Tagihan ongkos transport (karakter ke-10 huruf A sampai Z dan terdapat item TRANSPORT). Validasi khusus: pengecekan ekspedisi lokal & duplikasi nominal.',
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
 * Cek apakah string list code merupakan unit code umum / mata uang (bukan kode entry list operasional)
 */
export function isUnitCode(code?: string | null): boolean {
  if (!code?.trim()) return true
  const u = code.trim().toUpperCase()
  return [
    'M3',
    'M2',
    'KG',
    'PCS',
    'COLY',
    'CTN',
    'BOX',
    'PKGS',
    'VOLUME FREIGHT CHARGES',
    'SGD',
    'USD',
    'RMB',
    'RP',
    'IDR',
    'EUR',
    'HKD',
    'JPY',
    'AUD',
    'MYR',
    'GBP',
    'S$',
    'US$',
    'HK$',
    'Y$',
  ].includes(u)
}

/**
 * Cek apakah sebuah tagihan memiliki fdListCode operasional langsung pada tabel billing (tbBilling)
 */
export function hasBillingTableListCode(bill?: {
  fdListCode?: string | null
} | null): boolean {
  if (!bill?.fdListCode) return false
  const clean = bill.fdListCode.trim()
  if (!clean) return false
  return !isUnitCode(clean)
}

/**
 * Backward-compatibility helper
 */
export function hasOperationalListCode(bill?: {
  fdListCode?: string | null
  details?: Array<{ fdListCode?: string | null }> | null
} | null): boolean {
  return hasBillingTableListCode(bill)
}

/**
 * Mendeteksi tipe tagihan:
 * 1. Bill Transport: Karakter ke-10 (index 9) adalah 'A' sampai 'Z' DAN pada item name ada text 'TRANSPORT'
 * 2. Bill Gabungan: HARUS memiliki fdListCode pada tabel billing DAN marking no / marking code mengandung tanda ';'
 * 3. Bill Revisi: TIDAK memiliki fdListCode pada tabel billing DAN karakter ke-5 (index 4) adalah '1' atau '2'
 * 4. Bill Reguler: tagihan standar lainnya
 */
export function getBillType(bill?: {
  fdInvNo?: string | null
  fdListCode?: string | null
  fdMarkingCode?: string | null
  fdMarkingNo?: string | null
  fdDescr?: string | null
  details?: Array<{
    fdListCode?: string | null
    fdItemName?: string | null
    fdComodity?: string | null
  }> | null
} | null): BillType {
  if (!bill) return BILL_TYPES.REGULAR

  const invNo = (bill.fdInvNo || '').trim()
  const char10 = invNo.length >= 10 ? invNo.charAt(9).toUpperCase() : ''
  const isChar10Alpha = /^[A-Z]$/.test(char10)

  // Cek apakah ada teks TRANSPORT pada baris item tagihan atau keterangan invoice
  const hasTransportText = Boolean(
    (bill.details &&
      bill.details.some(
        (d) =>
          (d.fdItemName || '').toUpperCase().includes('TRANSPORT') ||
          (d.fdComodity || '').toUpperCase().includes('TRANSPORT')
      )) ||
      (bill.fdDescr && bill.fdDescr.toUpperCase().includes('TRANSPORT'))
  )

  // 1. Bill Transport:
  // Aturan: karakter ke-10 (index 9) adalah huruf A sampai Z DAN pada item name ada text TRANSPORT
  if (isChar10Alpha && hasTransportText) {
    return BILL_TYPES.TRANSPORT
  }

  // Aturan Bisnis: fdListCode harus ada langsung pada tabel billing (tbBilling)
  const hasOpListCode = hasBillingTableListCode(bill)
  const markingCombined = `${bill.fdMarkingCode || ''} ${bill.fdMarkingNo || ''}`
  const char5 = invNo.length >= 5 ? invNo.charAt(4) : ''

  // 2. Bill Gabungan: HARUS memiliki fdListCode pada tabel billing DAN marking mengandung tanda ';'
  if (hasOpListCode && markingCombined.includes(';')) {
    return BILL_TYPES.GABUNGAN
  }

  // 3. Bill Revisi: TIDAK memiliki fdListCode pada tabel billing DAN karakter ke-5 (index 4) adalah '1' atau '2'
  if (!hasOpListCode && (char5 === '1' || char5 === '2')) {
    return BILL_TYPES.REVISI
  }

  return BILL_TYPES.REGULAR
}
