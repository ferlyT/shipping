import type { SummaryModalTab } from '../components/validation-summary/types'
import { ROUTES } from '@/lib/constants'

export type VoiceIntentType =
  | 'SEARCH_INVOICE'
  | 'VALIDATE_BILL'
  | 'REFRESH_VALIDATION'
  | 'NAVIGATE_PAGE'
  | 'OPEN_SUMMARY'
  | 'CLOSE_SUMMARY'
  | 'ISSUE_INVOICE'
  | 'CONFIRM_ISSUE'
  | 'CANCEL'
  | 'UNKNOWN'

export interface VoiceIntent {
  type: VoiceIntentType
  query?: string
  tab?: SummaryModalTab
  tabLabel?: string
  route?: string
  pageName?: string
  targetMode?: 'CURRENT' | 'LIST' | 'SPECIFIC'
  rawTranscript: string
}

/**
 * Konversi kata ucapan angka bahasa Indonesia ke angka digit.
 */
const NUMBER_WORDS: Record<string, string> = {
  nol: '0',
  kosong: '0',
  satu: '1',
  dua: '2',
  tiga: '3',
  empat: '4',
  lima: '5',
  enam: '6',
  tujuh: '7',
  delapan: '8',
  sembilan: '9',
  sepuluh: '10',
}

/**
 * Konversi kata penghubung/tanda baca ucapan.
 */
const SEPARATOR_WORDS: Record<string, string> = {
  strip: '-',
  minus: '-',
  garis: '-',
  slash: '/',
  per: '/',
  titik: '.',
}

/**
 * Normalisasi ejaan fonetik singkatan kode cabang/moda invoice.
 */
function normalizeBranchSpelling(text: string): string {
  let res = text
  // GZS (Guangzhou Sea)
  res = res.replace(/\b(ge\s*zet\s*es|gezetes|g\s*z\s*s|g-z-s)\b/gi, 'GZS')
  // GZA (Guangzhou Air)
  res = res.replace(/\b(ge\s*zet\s*a|gezeta|g\s*z\s*a|g-z-a)\b/gi, 'GZA')
  // YWS (Yiwu Sea)
  res = res.replace(/\b(ye\s*we\s*es|yewees|y\s*w\s*s|y-w-s)\b/gi, 'YWS')
  // YWA (Yiwu Air)
  res = res.replace(/\b(ye\s*we\s*a|yewea|y\s*w\s*a|y-w-a)\b/gi, 'YWA')
  // JKS (Jakarta Sea)
  res = res.replace(/\b(je\s*ka\s*es|jekaes|j\s*k\s*s|j-k-s)\b/gi, 'JKS')
  // JKA (Jakarta Air)
  res = res.replace(/\b(je\s*ka\s*a|jekaa|j\s*k\s*a|j-k-a)\b/gi, 'JKA')
  // SG (Singapore)
  res = res.replace(/\b(es\s*ge|esge|s\s*g)\b/gi, 'SG')
  // HK (Hong Kong)
  res = res.replace(/\b(ha\s*ka|haka|h\s*k)\b/gi, 'HK')
  // BKK (Bangkok)
  res = res.replace(/\b(be\s*ka\s*ka|b\s*k\s*k)\b/gi, 'BKK')
  // KR (Korea)
  res = res.replace(/\b(ka\s*er|k\s*r)\b/gi, 'KR')
  // SZ (Shenzhen)
  res = res.replace(/\b(es\s*zet|eszet|s\s*z)\b/gi, 'SZ')
  // SH (Shanghai)
  res = res.replace(/\b(es\s*ha|esha|s\s*h)\b/gi, 'SH')
  // SUB / SBY (Surabaya)
  res = res.replace(/\b(es\s*u\s*be|esube|s\s*u\s*b)\b/gi, 'SUB')
  return res
}

/**
 * Normalisasi transkrip suara pengguna menjadi query invoice yang bersih.
 * Contoh: "Cari invoice G Z S strip kosong satu kosong tujuh lima satu" -> "GZS-010751"
 */
export function normalizeInvoiceVoiceTranscript(rawText: string): string {
  if (!rawText) return ''

  let text = rawText.trim().toLowerCase()

  // 1. Normalisasi ejaan cabang fonetik
  text = normalizeBranchSpelling(text)

  // 2. Tokenize kata dan ubah kata angka / simbol
  const words = text.split(/\s+/)
  const convertedWords: string[] = []

  for (let i = 0; i < words.length; i++) {
    const w = words[i].toLowerCase()
    if (NUMBER_WORDS[w] !== undefined) {
      convertedWords.push(NUMBER_WORDS[w])
    } else if (SEPARATOR_WORDS[w] !== undefined) {
      convertedWords.push(SEPARATOR_WORDS[w])
    } else {
      convertedWords.push(words[i])
    }
  }

  let result = convertedWords.join(' ')

  // 3. Gabungkan angka-angka terpisah yang bersambung: misal "0 1 0 7 5 1" -> "010751"
  // Lakukan replace berulang untuk mendempetkan angka yang bersebelahan
  result = result.replace(/(\d)\s+(\d)/g, '$1$2')
  result = result.replace(/(\d)\s+(\d)/g, '$1$2')
  result = result.replace(/(\d)\s+(\d)/g, '$1$2')
  result = result.replace(/(\d)\s+(\d)/g, '$1$2')

  // 4. Hilangkan spasi di sekitar separator '-' dan '/'
  result = result.replace(/\s*([-\/])\s*/g, '$1')

  // 5. Hilangkan prefix percakapan / filler
  result = result.replace(
    /^(tolong\s+)?(cari|buka|lihat|cek|validasi|periksa|audit)\s+(nomor\s+|no\.?\s+)?(invoice|inv|faktur|bill|tagihan)?\s*/gi,
    ''
  )
  result = result.replace(/^(nomor\s+|no\.?\s+)?(invoice|inv|faktur|bill|tagihan)\s*/gi, '')

  // 6. Hubungkan kode cabang dan angka jika belum ada strip: misal "GZS 010751" -> "GZS-010751"
  result = result.replace(/\b(GZS|GZA|YWS|YWA|JKS|JKA|SG|HK|BKK|KR|SZ|SH|SUB)\s*(\d+)\b/gi, '$1-$2')

  // 7. Rapikan spasi dan jadikan huruf kapital untuk kode invoice
  result = result.trim()

  // Jika mengandung format seperti gzs-xxx atau kode alfanumerik, uppercase kan
  if (/^[a-z0-9\-\/]+$/i.test(result)) {
    result = result.toUpperCase()
  }

  return result
}

/**
 * Ekstraksi target nomor invoice dari transkrip perintah suara "buka no invoice [nomor]".
 * Mendukung format ucapan:
 * - "buka no invoice GZS 010751" -> "GZS-010751"
 * - "buka invoice 010751" -> "010751"
 * - "buka no bill GZS 010751" -> "GZS-010751"
 * - "buka bill 010751" -> "010751"
 * - "buka faktur 010866" -> "010866"
 * - "buka 010751" -> "010751"
 * - "buka no 010751" -> "010751"
 * - "buka nomor 010751" -> "010751"
 * - "buka GZS 010751" -> "GZS-010751"
 * - "GZS 010751" -> "GZS-010751"
 *
 * Mengabaikan kata reserved sistem: tab, drawer, resi, inspeksi, refresh, cetak, dsb.
 */
export function extractInvoiceOpenTarget(rawText: string): string | null {
  if (!rawText) return null
  const lower = rawText.trim().toLowerCase()

  // 1. Abaikan perintah navigasi tab (misal "buka tab 1", "tab m3", "tab tarif")
  if (/\b(?:tab|ke\s+tab|pindah\s+tab)\b/i.test(lower)) {
    return null
  }

  // 2. Abaikan perintah drawer pencarian murni tanpa nomor faktur (misal "pilih invoice", "cari", "buka drawer")
  if (/^(?:pilih\s+(?:invoice|faktur|bill)|cari(?:\s+(?:invoice|faktur|bill))?|drawer|daftar\s+invoice|ganti\s+invoice)$/i.test(lower)) {
    return null
  }

  // 3. Abaikan perintah aksi global / modal murni tanpa nomor faktur
  if (/^(?:refresh|segarkan|muat\s*ulang|reload|cek\s*ulang|sinkron|update\s*data|cetak|print|unduh\s*pdf|download\s*pdf|terbitkan|inspeksi|summary|ringkasan|kesimpulan|resi|marking|history|riwayat|audit|kembali|batal|tutup)$/i.test(lower)) {
    return null
  }

  // 4. Deteksi apakah frasa mengandung pola pembukaan nomor faktur:
  // a. Kata kunci invoice/inv/faktur/bill diikuti nomor/target
  const hasInvoicePattern = /\b(?:buka\s+)?(?:no\s+|nomor\s+)?(?:invoice|inv|faktur|bill|tagihan)\s+([a-z0-9\-\s]{2,})\b/i.test(lower)

  // b. "buka [nomor]" atau "buka no [nomor]" (minimal 3 digit)
  const hasBukaNumber = /\bbuka\s+(?:no\s+|nomor\s+)?([0-9\s]{3,})\b/i.test(lower)

  // c. "buka [kode cabang] [nomor]"
  const hasBukaBranch = /\bbuka\s+(?:no\s+|nomor\s+)?(gzs|gza|yws|ywa|jks|jka|sg|hk|bkk|kr|sz|sh|sub)[-\s]*([a-z0-9\-\s]{2,})\b/i.test(lower)

  // d. Pola langsung cabang dan angka (misal "GZS 010751" atau "GZS-010751")
  const hasDirectBranch = /\b(gzs|gza|yws|ywa|jks|jka|sg|hk|bkk|kr|sz|sh|sub)[-\s]*\d{3,}\b/i.test(lower)

  if (!hasInvoicePattern && !hasBukaNumber && !hasBukaBranch && !hasDirectBranch) {
    return null
  }

  // Lakukan normalisasi fonetik, konversi angka, dan perapian tanda hubung
  const normalized = normalizeInvoiceVoiceTranscript(rawText)
  if (!normalized || normalized.length < 2) return null

  // Pastikan hasil normalisasi bukan merupakan kata sistem
  const isSystemWord = /^(tab|drawer|resi|marking|history|riwayat|audit|refresh|cetak|print|terbitkan|kembali|batal|tutup)$/i.test(normalized)
  if (isSystemWord) {
    return null
  }

  return normalized
}

/**
 * Parser Intent Suara untuk Global ERP & Billing Validation.
 * Membedakan intent: SEARCH, VALIDATE_BILL, REFRESH_VALIDATION, OPEN_SUMMARY, CLOSE_SUMMARY, ISSUE_INVOICE, CONFIRM, CANCEL, NAVIGATE_PAGE.
 */
export function parseVoiceIntent(rawTranscript: string): VoiceIntent {
  const clean = (rawTranscript || '').trim()
  if (!clean) {
    return { type: 'UNKNOWN', rawTranscript: '' }
  }

  const lower = clean.toLowerCase()

  // 1. Intent: Batalkan / Tutup dialog suara
  if (/^(batal|jangan|cancel|kembali)$/i.test(lower) || /\b(batalkan|batal proses)\b/i.test(lower)) {
    return { type: 'CANCEL', rawTranscript: clean }
  }

  // 2. Intent: Konfirmasi Penerbitan Invoice
  if (
    /^(konfirmasi|setuju|ya\s+terbitkan|oke\s+proses|lanjutkan|setuju\s+undercharge|proses\s+sekarang)$/i.test(
      lower
    ) ||
    /\b(ya\s+setuju|saya\s+setuju|konfirmasi\s+terbit)\b/i.test(lower)
  ) {
    return { type: 'CONFIRM_ISSUE', rawTranscript: clean }
  }

  // 3. Intent: Refresh / Muat Ulang Validasi
  if (
    /\b(refresh|muat\s+ulang|ulangi|cek\s+ulang|reload)\b/i.test(lower) &&
    /\b(validasi|audit|pengecekan|bill|invoice|halaman)?\b/i.test(lower)
  ) {
    return { type: 'REFRESH_VALIDATION', rawTranscript: clean }
  }

  // 4. Intent: Tutup Summary Modal
  if (
    /\b(tutup|close)\s+(summary|ringkasan|inspeksi|modal|dialog|detail)\b/i.test(lower) ||
    /^(tutup\s+summary|close\s+summary)$/i.test(lower)
  ) {
    return { type: 'CLOSE_SUMMARY', rawTranscript: clean }
  }

  // 5. Intent: VALIDASI BILL & KESIMPULAN VALIDASI
  // Deteksi kata kunci: validasi, inspeksi, audit, periksa, summary, ringkasan, atau tab
  const isValidationKeyword =
    /\b(validasi|inspeksi|audit|periksa|cek\s+validasi|summary|ringkasan)\b/i.test(lower) ||
    /\b(buka\s+tab|lihat\s+tab|pindah\s+tab|ke\s+tab)\b/i.test(lower)

  if (isValidationKeyword) {
    // 5a. Sub-tab: Fisik (m3 / weight)
    if (/\b(fisik|volume|kubikasi|m3|timbangan?|berat|kg)\b/i.test(lower)) {
      return {
        type: 'VALIDATE_BILL',
        tab: 'm3_weight',
        tabLabel: 'Audit Fisik (M³ / Kg)',
        targetMode: 'CURRENT',
        rawTranscript: clean,
      }
    }

    // 5b. Sub-tab: Overweight
    if (/\b(overweight|lebih\s+berat|kelebihan\s+berat)\b/i.test(lower)) {
      return {
        type: 'VALIDATE_BILL',
        tab: 'overweight',
        tabLabel: 'Audit Overweight',
        targetMode: 'CURRENT',
        rawTranscript: clean,
      }
    }

    // 5c. Sub-tab: Items / Finansial / Tarif
    if (/\b(tarif|harga|item|rincian|keuangan|finansial|undercharge)\b/i.test(lower)) {
      return {
        type: 'VALIDATE_BILL',
        tab: 'items',
        tabLabel: 'Audit Tarif & Item',
        targetMode: 'CURRENT',
        rawTranscript: clean,
      }
    }

    // 5d. Sub-tab: Transport / Ekspedisi Lokal
    if (/\b(transport|ekspedisi|ongkir|trucking|tbexpindo|expedisi)\b/i.test(lower)) {
      return {
        type: 'VALIDATE_BILL',
        tab: 'transport',
        tabLabel: 'Audit Transport (tbExpIndo)',
        targetMode: 'CURRENT',
        rawTranscript: clean,
      }
    }

    // 5e. Sub-tab: Freight Charge
    if (/\b(freight|uang\s+tambang|tambang)\b/i.test(lower)) {
      return {
        type: 'VALIDATE_BILL',
        tab: 'freight',
        tabLabel: 'Freight Charge',
        targetMode: 'CURRENT',
        rawTranscript: clean,
      }
    }

    // 5f. Deteksi Validasi Bill Spesifik dengan nomor invoice atau nama customer
    // Contoh: "Validasi bill GZS 010751", "Validasi invoice 010751", "Validasi bill Santoso"
    const cleanedTarget = normalizeInvoiceVoiceTranscript(clean)
    const isDeicticWordOnly = /^(ini|itu|sekarang|aktif|saat\s+ini)?$/i.test(cleanedTarget)
    if (cleanedTarget && !isDeicticWordOnly && cleanedTarget.length >= 2) {
      return {
        type: 'VALIDATE_BILL',
        query: cleanedTarget,
        targetMode: 'SPECIFIC',
        rawTranscript: clean,
      }
    }

    // 5g. Deteksi Antrean / Daftar Validasi: "Antrean validasi bill", "Daftar validasi bill"
    if (/\b(antrean|daftar|list)\b/i.test(lower)) {
      return {
        type: 'VALIDATE_BILL',
        targetMode: 'LIST',
        route: ROUTES.BILLING_VALIDATION_LIST,
        pageName: 'Antrean Validasi Billing',
        rawTranscript: clean,
      }
    }

    // 5h. Validasi Bill Aktif saat ini: "Validasi bill ini", "Validasi bill", "Cek validasi", "Inspeksi bill"
    return {
      type: 'VALIDATE_BILL',
      targetMode: 'CURRENT',
      tabLabel: 'Kesimpulan Validasi Bill',
      rawTranscript: clean,
    }
  }

  // 6. Intent: Terbitkan Invoice
  if (
    /\b(terbitkan|terbit|issue|keluarkan)\b/i.test(lower) &&
    /\b(invoice|faktur|bill|tagihan)?\b/i.test(lower)
  ) {
    return { type: 'ISSUE_INVOICE', rawTranscript: clean }
  }

  // 7. Intent: Navigasi Halaman Global ERP
  const hasInvoicePattern =
    /\d{3,}/.test(lower) ||
    /\b(gzs|gza|yws|ywa|jks|jka|sg|hk|bkk|kr)[-\s]*\d+/i.test(lower) ||
    /^(cari|buka\s+invoice|buka\s+faktur)\b/i.test(lower)

  if (!hasInvoicePattern) {
    for (const cmd of PAGE_COMMANDS) {
      if (cmd.regex.test(lower)) {
        return {
          type: 'NAVIGATE_PAGE',
          route: cmd.route,
          pageName: cmd.pageName,
          rawTranscript: clean,
        }
      }
    }
  }

  // 8. Default: Intent Pencarian Invoice
  const normalizedQuery = normalizeInvoiceVoiceTranscript(clean)
  if (normalizedQuery && normalizedQuery.length >= 2) {
    return {
      type: 'SEARCH_INVOICE',
      query: normalizedQuery,
      rawTranscript: clean,
    }
  }

  return {
    type: 'UNKNOWN',
    rawTranscript: clean,
  }
}

/**
 * Daftar perintah suara untuk navigasi langsung ke halaman / modul ERP.
 */
export const PAGE_COMMANDS: Array<{
  regex: RegExp
  route: string
  pageName: string
}> = [
  {
    regex: /\b(dashboard|overview|halaman\s+utama|beranda)\b/i,
    route: ROUTES.DASHBOARD,
    pageName: 'Dashboard',
  },
  {
    regex: /\b(monitoring\s+(surat\s+jalan|sj|pengantaran|delivery)|surat\s+jalan\s+pending|sj\s+pending)\b/i,
    route: ROUTES.DELIVERY_ORDERS_MONITORING,
    pageName: 'Monitoring Surat Jalan',
  },
  {
    regex: /\b(surat\s+jalan|daftar\s+surat\s+jalan|delivery\s+orders?)\b/i,
    route: ROUTES.DELIVERY_ORDERS_LIST,
    pageName: 'Daftar Surat Jalan',
  },
  {
    regex: /\b(inventori\s+gudang|stok\s+gudang|stok\s+kargo|inventory\s+delivery)\b/i,
    route: ROUTES.DELIVERY_ORDERS_INVENTORY,
    pageName: 'Inventori Gudang Delivery',
  },
  {
    regex: /\b(bap|berita\s+acara|pemeriksaan\s+kargo|inspection\s+reports?)\b/i,
    route: ROUTES.INSPECTION_REPORTS,
    pageName: 'Berita Acara (BAP)',
  },
  {
    regex: /\b(batch\s+marking|kontainer|muatan\s+kontainer|shipment\s+batches?)\b/i,
    route: ROUTES.SHIPMENT_BATCHES,
    pageName: 'Batch Marking (Kontainer)',
  },
  {
    regex: /\b(ukuran\s+marking|marking\s+size|audit\s+ukuran)\b/i,
    route: ROUTES.SHIPMENT_BATCH_MARKING_SIZE,
    pageName: 'Ukuran Marking',
  },
  {
    regex: /\b(shipments?|resi|daftar\s+resi|pengiriman)\b/i,
    route: ROUTES.SHIPMENTS,
    pageName: 'Shipments (Resi)',
  },
  {
    regex: /\b(antrean\s+validasi(\s+bill)?|validasi\s+(bill|billing|invoice)|list\s+validasi(\s+bill)?|daftar\s+validasi(\s+bill)?)\b/i,
    route: ROUTES.BILLING_VALIDATION_LIST,
    pageName: 'Antrean Validasi Billing',
  },
  {
    regex: /\b(target\s+billing|target\s+tagihan|target\s+penagihan|target\s+invoice)\b/i,
    route: ROUTES.BILLING_TARGET,
    pageName: 'Target Penagihan',
  },
  {
    regex: /\b(daftar\s+invoice|daftar\s+billing|list\s+invoice|faktur\s+penagihan)\b/i,
    route: ROUTES.BILLING_LIST,
    pageName: 'Daftar Invoice',
  },
  {
    regex: /\b(pairing\s+local\s+charge|biaya\s+lokal|matching\s+excel)\b/i,
    route: ROUTES.BILLING_PAIRING_LOCAL_CHARGE,
    pageName: 'Pairing Local Charge',
  },
  {
    regex: /\b(kasir|pelunasan|pembayaran\s+invoice|cashier)\b/i,
    route: ROUTES.CASHIER,
    pageName: 'Kasir & Pelunasan',
  },
  {
    regex: /\b(wallet|saldo\s+deposit|saldo\s+customer|customer\s+wallet)\b/i,
    route: ROUTES.WALLET,
    pageName: 'Saldo Wallet Customer',
  },
  {
    regex: /\b(master\s+tarif|price\s*list|tarif\s+umum)\b/i,
    route: ROUTES.PRICE_LIST,
    pageName: 'Master Tarif (Price List)',
  },
  {
    regex: /\b(tarif\s+customer|tarif\s+khusus|customer\s+price\s*list)\b/i,
    route: ROUTES.CUSTOMER_PRICE_LIST,
    pageName: 'Tarif Khusus Customer',
  },
  {
    regex: /\b(master\s+customer|data\s+customer|pelanggan)\b/i,
    route: ROUTES.CUSTOMERS,
    pageName: 'Master Customer',
  },
  {
    regex: /\b(profil|profile|akun\s+saya)\b/i,
    route: ROUTES.PROFILE,
    pageName: 'Profil Pengguna',
  },
  {
    regex: /\b(user\s+management|kelola\s+user|admin\s+user|manajemen\s+pengguna)\b/i,
    route: ROUTES.USERS,
    pageName: 'Manajemen Pengguna',
  },
]
