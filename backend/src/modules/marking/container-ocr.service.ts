import sharp from 'sharp'
import { createWorker } from 'tesseract.js'
import { logger } from '../../config/logger'

/**
 * Nilai numerik huruf untuk perhitungan Check Digit ISO 6346.
 * Catatan: Angka kelipatan 11 (11, 22, 33) dilewati dalam standar ISO 6346.
 */
const ISO_LETTER_VALUES: Record<string, number> = {
  A: 10, B: 12, C: 13, D: 14, E: 15, F: 16, G: 17, H: 18, I: 19, J: 20,
  K: 21, L: 23, M: 24, N: 25, O: 26, P: 27, Q: 28, R: 29, S: 30, T: 31,
  U: 32, V: 34, W: 35, X: 36, Y: 37, Z: 38,
}

/**
 * Menghitung check-digit resmi standar ISO 6346 untuk 4 huruf + 6 digit angka.
 * @param ownerCode 4 karakter huruf (misal: "MSCU", "TGHU")
 * @param serialNumber 6 karakter angka (misal: "123456")
 * @returns digit 0-9 atau null jika input tidak valid
 */
export function calculateIso6346CheckDigit(ownerCode: string, serialNumber: string): number | null {
  const code = (ownerCode + serialNumber).toUpperCase()
  if (code.length !== 10) return null

  let sum = 0
  for (let i = 0; i < 10; i++) {
    const char = code[i] || ''
    let val: number
    if (char >= '0' && char <= '9') {
      val = parseInt(char, 10)
    } else if (ISO_LETTER_VALUES[char] !== undefined) {
      val = ISO_LETTER_VALUES[char]!
    } else {
      return null
    }

    const weight = Math.pow(2, i)
    sum += val * weight
  }

  const remainder = sum % 11
  return remainder === 10 ? 0 : remainder
}

/**
 * Validasi apakah nomor kontainer 11 karakter sesuai rumus check-digit ISO 6346.
 */
export function isValidIso6346(containerNo: string): boolean {
  const clean = containerNo.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  if (clean.length !== 11) return false

  const owner = clean.slice(0, 4)
  const serial = clean.slice(4, 10)
  const checkDigitStr = clean.slice(10, 11)

  if (!/^[A-Z]{4}$/.test(owner) || !/^\d{6}$/.test(serial) || !/^\d$/.test(checkDigitStr)) {
    return false
  }

  const expectedDigit = calculateIso6346CheckDigit(owner, serial)
  return expectedDigit === parseInt(checkDigitStr, 10)
}

export interface ContainerCandidate {
  containerNo: string
  formatted: string
  isValidIso: boolean
  confidenceScore: number
}

/**
 * Parser cerdas untuk mengekstrak kandidat nomor kontainer dari teks mentah OCR.
 */
export function extractContainerCandidates(rawText: string): ContainerCandidate[] {
  if (!rawText) return []

  // Normalisasi karakter umum yang sering salah terbaca OCR
  // Contoh: '0' (nol) terbaca 'O', '1' terbaca 'I'/'l', '5' terbaca 'S', dsb.
  const lines = rawText
    .toUpperCase()
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter(Boolean)

  const candidatesMap = new Map<string, ContainerCandidate>()

  // Helper untuk registrasi kandidat
  const registerCandidate = (rawCode: string, baseConfidence: number) => {
    const clean = rawCode.replace(/[^A-Z0-9]/g, '').toUpperCase()
    if (clean.length < 9 || clean.length > 12) return

    // Normalisasi ke 11 karakter jika 4 huruf + 7 digit
    if (/^[A-Z]{4}\d{7}$/.test(clean)) {
      const isIso = isValidIso6346(clean)
      const formatted = `${clean.slice(0, 4)} ${clean.slice(4, 10)}-${clean.slice(10)}`
      candidatesMap.set(clean, {
        containerNo: clean,
        formatted,
        isValidIso: isIso,
        confidenceScore: isIso ? baseConfidence + 20 : baseConfidence,
      })
      return
    }

    // Jika 4 huruf + 6 digit (digit ke-7 / check digit terpisah bingkai/box atau terhalang tiang)
    // Otomatis hitung check digit resmi ISO 6346
    if (/^[A-Z]{4}\d{6}$/.test(clean)) {
      const owner = clean.slice(0, 4)
      const serial = clean.slice(4, 10)
      const calculatedDigit = calculateIso6346CheckDigit(owner, serial)
      if (calculatedDigit !== null) {
        const full11 = `${owner}${serial}${calculatedDigit}`
        const formatted = `${owner} ${serial}-${calculatedDigit}`
        candidatesMap.set(full11, {
          containerNo: full11,
          formatted,
          isValidIso: true,
          confidenceScore: baseConfidence + 25,
        })
      }
    }

    // Format domestik / umum (3-4 huruf + 6-7 digit)
    if (/^[A-Z]{3,4}\d{6,7}$/.test(clean)) {
      const prefix = clean.replace(/\d+$/, '')
      const numbers = clean.slice(prefix.length)
      const formatted = `${prefix} ${numbers}`
      if (!candidatesMap.has(clean)) {
        candidatesMap.set(clean, {
          containerNo: clean,
          formatted,
          isValidIso: false,
          confidenceScore: baseConfidence - 10,
        })
      }
    }
  }

  // Pola 1: Standar ISO 6346 horizontal: 4 huruf diikuti 6 digit dan 1 check digit
  // Contoh: "MSCU 123456-7", "TGHU-765432-1", "EMCU1234567"
  const isoRegex = /\b([A-Z]{3}[A-Z0-9])\s*[-–]?\s*(\d{6})\s*[-–\s]?\s*(\d)\b/g
  let match: RegExpExecArray | null
  while ((match = isoRegex.exec(rawText.toUpperCase())) !== null) {
    const code = `${match[1]}${match[2]}${match[3]}`
    registerCandidate(code, 80)
  }

  // Pola 2: Format domestik / umum
  const domesticRegex = /\b([A-Z]{3,4})\s*[-–]?\s*(\d{6,7})\b/g
  while ((match = domesticRegex.exec(rawText.toUpperCase())) !== null) {
    const code = `${match[1]}${match[2]}`
    registerCandidate(code, 65)
  }

  // Pola 3: Deteksi vertikal (sering terjadi di pintu kontainer, huruf dan angka berada di baris terpisah)
  // Baris 1: 4 huruf (misal "MSCU")
  // Baris 2: 6 digit (misal "123456")
  // Baris 3: 1 digit check digit (misal "7")
  for (let i = 0; i < lines.length - 1; i++) {
    const lineCurrent = lines[i]
    const lineNext = lines[i + 1]
    if (!lineCurrent || !lineNext) continue

    const l1 = lineCurrent.replace(/[^A-Z]/g, '')
    const l2 = lineNext.replace(/[^0-9]/g, '')

    if (l1.length === 4 && l2.length === 7) {
      registerCandidate(`${l1}${l2}`, 75)
    } else if (l1.length === 4 && l2.length === 6 && i + 2 < lines.length) {
      const lineThird = lines[i + 2]
      if (lineThird) {
        const l3 = lineThird.replace(/[^0-9]/g, '')
        if (l3.length === 1) {
          registerCandidate(`${l1}${l2}${l3}`, 80)
        }
      }
    }
  }

  // Urutkan kandidat berdasarkan skor confidence tertinggi (ISO valid di atas)
  return Array.from(candidatesMap.values()).sort((a, b) => b.confidenceScore - a.confidenceScore)
}

/**
 * Mengoptimalkan buffer gambar untuk OCR menggunakan Sharp.
 */
export async function preProcessImageForOcr(imageBuffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(imageBuffer)
      .rotate() // Auto-orient berdasarkan EXIF kamera ponsel
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .grayscale() // Hilangkan gangguan warna cat kontainer
      .normalize() // Rentangkan histogram kontras
      .sharpen({ sigma: 1.5 }) // Pertegas batas huruf stensil
      .toFormat('png')
      .toBuffer()
  } catch (err: any) {
    logger.warn(`[OCR Preprocess] Gagal melakukan image enhancement: ${err.message}`)
    return imageBuffer
  }
}

let tesseractWorker: any = null

/**
 * Menginisialisasi worker tesseract tunggal (singleton) untuk efisiensi memori.
 */
async function getWorker() {
  if (!tesseractWorker) {
    tesseractWorker = await createWorker('eng')
    await tesseractWorker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ',
    })
  }
  return tesseractWorker
}

export interface ContainerOcrResult {
  containerNo: string | null
  formatted: string | null
  isValidIso: boolean
  confidence: number
  rawText: string
  candidates: ContainerCandidate[]
}

/**
 * Memproses gambar kontainer dan mengidentifikasi nomor kontainer.
 */
export async function recognizeContainerFromImage(imageBuffer: Buffer): Promise<ContainerOcrResult> {
  const enhancedBuffer = await preProcessImageForOcr(imageBuffer)
  const worker = await getWorker()

  const { data } = await worker.recognize(enhancedBuffer)
  const rawText = data?.text || ''
  const ocrConfidence = Math.round(data?.confidence || 0)

  const candidates = extractContainerCandidates(rawText)
  const bestMatch = candidates.length > 0 ? candidates[0] : null

  return {
    containerNo: bestMatch ? bestMatch.containerNo : null,
    formatted: bestMatch ? bestMatch.formatted : null,
    isValidIso: bestMatch ? bestMatch.isValidIso : false,
    confidence: bestMatch ? Math.min(100, Math.round((ocrConfidence + bestMatch.confidenceScore) / 2)) : ocrConfidence,
    rawText: rawText.trim(),
    candidates,
  }
}
