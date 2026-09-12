import ExcelJS from 'exceljs'
import { prisma } from '../../config/database'
import { logger } from '../../config/logger'
import { Prisma } from '@prisma/client'
import type {
  PairingLocalChargeResult,
  PairingLocalChargeRow,
  PairingLocalChargeSummary,
  ParsedShippingMark,
  OperationalStatus,
  PairingValidationStatus,
} from './pairing-local-charge.types'

/**
 * Normalisasi karakter huruf Yunani yang secara visual mirip huruf Latin
 * Contoh: 26ΗΚΑ21 (Η=Eta U+0397, Κ=Kappa U+039A, Α=Alpha U+0391) -> 26HKA21
 */
export function normalizeGreekToLatin(str: string): string {
  if (!str) return ''
  return str
    .replace(/\u0391/g, 'A')
    .replace(/\u0392/g, 'B')
    .replace(/\u0395/g, 'E')
    .replace(/\u0397/g, 'H')
    .replace(/\u0399/g, 'I')
    .replace(/\u039A/g, 'K')
    .replace(/\u039C/g, 'M')
    .replace(/\u039D/g, 'N')
    .replace(/\u039F/g, 'O')
    .replace(/\u03A1/g, 'P')
    .replace(/\u03A4/g, 'T')
    .replace(/\u03A7/g, 'X')
    .replace(/\u03A5/g, 'Y')
    .replace(/\u0396/g, 'Z')
    .replace(/\u03B1/g, 'a')
    .replace(/\u03B2/g, 'b')
    .replace(/\u03B5/g, 'e')
    .replace(/\u03B7/g, 'h')
    .replace(/\u03B9/g, 'i')
    .replace(/\u03BA/g, 'k')
    .replace(/\u03BD/g, 'n')
    .replace(/\u03BF/g, 'o')
    .replace(/\u03C1/g, 'p')
    .replace(/\u03C4/g, 't')
}

/**
 * Membersihkan karakter control characters yang tidak terlihat (misal \u0002 STX)
 * dan whitespace berlebih.
 */
export function sanitizeControlChars(str: string | null | undefined): string {
  if (!str) return ''
  // Hapus karakter non-printable ASCII 0-31 kecuali newline/tab jika diperlukan, atau \x00-\x1F\x7F
  return String(str).replace(/[\x00-\x1F\x7F]/g, '').trim()
}

/**
 * Memecah string pada kolom Shipping Mark menjadi marking code dan marking no.
 * Pemisah koma menandakan multiple data/markings.
 * Kata kunci pemisah no biasanya: 'NO.', 'No.', 'NO ', 'No '
 */
export function parseShippingMarks(rawMark: string): ParsedShippingMark[] {
  if (!rawMark) return []
  const normalized = normalizeGreekToLatin(String(rawMark).trim())

  // Pisahkan berdasarkan koma
  const parts = normalized.split(',').map((p) => p.trim()).filter(Boolean)
  const results: ParsedShippingMark[] = []

  for (const part of parts) {
    // Cari pola 'NO.' atau 'NO' (case-insensitive)
    const match = part.match(/^(.*?)(?:\s+NO\.?|\s+No\.?|NO\.?|No\.?)\s*(.*)$/i)
    if (match) {
      results.push({
        markingCode: match[1].trim(),
        markingNo: match[2].trim(),
      })
    } else {
      // Fallback: jika tidak ada kata 'NO.', pisahkan berdasarkan spasi pertama
      const firstSpace = part.indexOf(' ')
      if (firstSpace > -1) {
        results.push({
          markingCode: part.slice(0, firstSpace).trim(),
          markingNo: part.slice(firstSpace + 1).trim(),
        })
      } else {
        results.push({
          markingCode: part.trim(),
          markingNo: '',
        })
      }
    }
  }

  return results
}

/**
 * Memperbaiki nomor receipt jika memiliki separator koma.
 * Karakter akhir dari string dasar diganti dengan karakter setelah koma
 * sepanjang panjang karakter setelah koma tersebut.
 * Contoh: 'HK260703-014,5' -> ['HK260703-014', 'HK260703-015']
 */
export function parseReceiptNos(rawReceipt: string): string[] {
  if (!rawReceipt) return []
  const str = String(rawReceipt).trim()
  if (!str.includes(',')) return [str]

  const parts = str.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) return []

  const base = parts[0]
  const results = [base]

  for (let i = 1; i < parts.length; i++) {
    const suffix = parts[i]
    if (suffix.length < base.length) {
      const prefix = base.slice(0, base.length - suffix.length)
      results.push(prefix + suffix)
    } else {
      results.push(suffix)
    }
  }

  return results
}

/**
 * Ekstrak teks bersih dari cell value ExcelJS
 */
function getCellText(val: ExcelJS.CellValue): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'object') {
    if ('text' in val && typeof (val as any).text === 'string') return (val as any).text.trim()
    if ('result' in val) return String((val as any).result ?? '').trim()
    if (val instanceof Date) return val.toISOString()
    return JSON.stringify(val)
  }
  return String(val).trim()
}

/**
 * Parse nominal angka dari format string Excel (mendukung tanda kurung untuk minus, koma, dsb)
 */
function parseChargeValue(raw: any): number {
  if (raw === null || raw === undefined || raw === '') return 0
  if (typeof raw === 'number') return raw
  const str = String(raw).trim()
  const isNegative = str.startsWith('(') && str.endsWith(')')
  const clean = str.replace(/[^\d.-]/g, '')
  const val = parseFloat(clean) || 0
  return isNegative ? -Math.abs(val) : val
}

/**
 * Helper untuk menyusun status operasional dari tbMarking & tbDelivery.
 * Memeriksa fdExitDate pada tbMarking: jika belum ada, status adalah Belum Exit.
 */
function resolveOperationalStatus(
  code: string,
  markingMap: Map<string, any>,
  deliveriesList: any[]
): OperationalStatus | null {
  if (!code) return null
  const m = markingMap.get(code)
  if (!m) return null

  const hasExit = Boolean(m.fdExitDate)
  const exitDate = hasExit ? new Date(m.fdExitDate).toISOString() : null
  const exitDateFormatted = hasExit ? new Date(m.fdExitDate).toLocaleDateString('id-ID') : '-'
  const etaDate = m.fdETA ? new Date(m.fdETA).toISOString() : null
  const etaFormatted = m.fdETA ? new Date(m.fdETA).toLocaleDateString('id-ID') : '—'
  const etdDate = m.fdETD ? new Date(m.fdETD).toISOString() : null
  const loadDate = m.fdLoadDate ? new Date(m.fdLoadDate).toISOString() : null
  const gudang = m.fdGudang || ''

  const exitPrefix = hasExit
    ? `Sudah Exit (${exitDateFormatted})`
    : `Belum Exit (ETA: ${etaFormatted})`

  const delivery = deliveriesList.find(
    (d) =>
      String(d.fdMarkingCode || '').trim() === code ||
      String(d.fdMarkingCodeAsal || '').trim() === code
  )

  if (delivery) {
    const sjNo = delivery.fdSJNo || ''
    const sjDate = delivery.fdSJDate ? new Date(delivery.fdSJDate).toISOString() : null
    const kembali = delivery.fdKembali ? new Date(delivery.fdKembali).toISOString() : null

    if (delivery.fdKembali) {
      const tglKembali = new Date(delivery.fdKembali).toLocaleDateString('id-ID')
      return {
        statusLabel: `${exitPrefix} - SJ ${sjNo} Selesai Diterima (${tglKembali})`,
        markingCode: code,
        exitDate,
        eta: etaDate,
        etd: etdDate,
        loadDate,
        gudang,
        batchStatus: m.fdStatus,
        sjNo,
        sjDate,
        sjStatus: 'SELESAI',
        sent: delivery.fdSent,
        kembali,
        supir: delivery.fdSupir || '',
        penerima: delivery.fdTerima || '',
      }
    } else if (Number(delivery.fdSent) === 1) {
      const supirLabel = delivery.fdSupir ? ` oleh ${delivery.fdSupir}` : ''
      return {
        statusLabel: `${exitPrefix} - SJ ${sjNo} Sedang Dikirim${supirLabel}`,
        markingCode: code,
        exitDate,
        eta: etaDate,
        etd: etdDate,
        loadDate,
        gudang,
        batchStatus: m.fdStatus,
        sjNo,
        sjDate,
        sjStatus: 'DIKIRIM',
        sent: 1,
        kembali: null,
        supir: delivery.fdSupir || '',
        penerima: delivery.fdTerima || '',
      }
    } else {
      return {
        statusLabel: `${exitPrefix} - SJ ${sjNo} Terbit (Belum Jalan)`,
        markingCode: code,
        exitDate,
        eta: etaDate,
        etd: etdDate,
        loadDate,
        gudang,
        batchStatus: m.fdStatus,
        sjNo,
        sjDate,
        sjStatus: 'TERBIT_BELUM_JALAN',
        sent: delivery.fdSent,
        kembali: null,
        supir: delivery.fdSupir || '',
        penerima: delivery.fdTerima || '',
      }
    }
  } else {
    return {
      statusLabel: `${exitPrefix} - Belum Ada Surat Jalan`,
      markingCode: code,
      exitDate,
      eta: etaDate,
      etd: etdDate,
      loadDate,
      gudang,
      batchStatus: m.fdStatus,
      sjStatus: 'BELUM_ADA_SJ',
    }
  }
}


/**
 * Memproses file Excel untuk Pairing Local Charge secara CEPAT via BATCH QUERY
 */
export async function processPairingLocalCharge(
  fileBuffer: Buffer,
  fileName?: string
): Promise<PairingLocalChargeResult> {
  const tStart = Date.now()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(fileBuffer as unknown as ExcelJS.Buffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet || worksheet.rowCount < 2) {
    throw new Error('File Excel kosong atau tidak memiliki baris data')
  }

  // 1. Ekstrak Header Column Index
  const headerRow = worksheet.getRow(1)
  const colMap = new Map<string, number>()

  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const txt = getCellText(cell.value).toLowerCase().trim()
    colMap.set(txt, colNumber)
  })

  const getColIdx = (aliases: string[]): number | undefined => {
    for (const a of aliases) {
      const idx = colMap.get(a.toLowerCase().trim())
      if (idx !== undefined) return idx
    }
    return undefined
  }

  const dateCol = getColIdx(['date', 'tanggal']) || 1
  const receiptCol = getColIdx(['recepit no.', 'receipt no.', 'recepit no', 'receipt no', 'receiptno']) || 2
  const customerCol = getColIdx(['customer', 'nama customer']) || 3
  const fromCol = getColIdx(['from', 'asal', 'dari']) || 4
  const ctnCol = getColIdx(['ctn', 'koli']) || 5
  const kgCol = getColIdx(['kg', 'berat']) || 6
  const cbmCol = getColIdx(['cbm', 'volume', 'm3']) || 7
  const chargeCol = getColIdx(['charge', 'biaya']) || 8
  const markCol = getColIdx(['shipping mark', 'marking', 'marking code']) || 9

  // 2. Baca seluruh baris dan kumpulkan nilai pencarian
  interface ParsedRowDraft {
    rowIndex: number
    date: string
    receiptNo: string
    receiptNosParsed: string[]
    customer: string
    from: string
    ctn: string | number
    kg: string | number
    cbm: string | number
    charge: number
    chargeRaw: string
    shippingMark: string
    shippingMarksParsed: ParsedShippingMark[]
  }

  const drafts: ParsedRowDraft[] = []
  const allReceiptNos = new Set<string>()
  const allMarkingCodes = new Set<string>()

  for (let r = 2; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r)
    const rawDate = getCellText(row.getCell(dateCol).value)
    const rawReceipt = getCellText(row.getCell(receiptCol).value)
    const rawCustomer = getCellText(row.getCell(customerCol).value)
    const rawFrom = getCellText(row.getCell(fromCol).value)
    const rawCtn = getCellText(row.getCell(ctnCol).value)
    const rawKg = getCellText(row.getCell(kgCol).value)
    const rawCbm = getCellText(row.getCell(cbmCol).value)
    const rawCharge = getCellText(row.getCell(chargeCol).value)
    const rawMark = getCellText(row.getCell(markCol).value)

    if (!rawReceipt && !rawMark && !rawCustomer && !rawCharge) continue

    const charge = parseChargeValue(rawCharge)
    const shippingMarksParsed = parseShippingMarks(rawMark)
    const receiptNosParsed = parseReceiptNos(rawReceipt)

    receiptNosParsed.forEach((rc) => allReceiptNos.add(rc))
    shippingMarksParsed.forEach((m) => {
      if (m.markingCode) allMarkingCodes.add(m.markingCode)
    })

    drafts.push({
      rowIndex: drafts.length + 1,
      date: rawDate,
      receiptNo: rawReceipt,
      receiptNosParsed,
      customer: rawCustomer,
      from: rawFrom,
      ctn: rawCtn,
      kg: rawKg,
      cbm: rawCbm,
      charge,
      chargeRaw: rawCharge,
      shippingMark: rawMark,
      shippingMarksParsed,
    })
  }

  const receiptArr = Array.from(allReceiptNos).filter(Boolean)
  const markArr = Array.from(allMarkingCodes).filter(Boolean)

  logger.info(`[processPairingLocalCharge] Memulai batch query untuk ${drafts.length} baris (Receipt: ${receiptArr.length}, Marking: ${markArr.length})`)

  // 3. BATCH QUERY 1: Ambil tbEntryList
  let entriesList: any[] = []
  if (receiptArr.length > 0 || markArr.length > 0) {
    try {
      entriesList = await prisma.$queryRaw<any[]>`
        SELECT 
          RTRIM(el.fdListCode) as fdListCode,
          el.fdLoad,
          RTRIM(el.fdMarkingCode) as fdMarkingCode,
          RTRIM(el.fdMarkingCodeAsal) as fdMarkingCodeAsal,
          RTRIM(el.fdMarkingNo) as fdMarkingNo,
          RTRIM(el.fdTerima) as fdTerima,
          ISNULL(el.fdFc, 0) as fdFc,
          RTRIM(el.fdInvoiceNo) as fdInvoiceNo
        FROM tbEntryList el WITH (NOLOCK)
        WHERE (${receiptArr.length > 0 ? Prisma.sql`el.fdTerima IN (${Prisma.join(receiptArr)})` : Prisma.sql`1=0`}
           OR ${markArr.length > 0 ? Prisma.sql`el.fdMarkingCode IN (${Prisma.join(markArr)})` : Prisma.sql`1=0`}
           OR ${markArr.length > 0 ? Prisma.sql`el.fdMarkingCodeAsal IN (${Prisma.join(markArr)})` : Prisma.sql`1=0`})
          AND el.fdLoad >= DATEADD(MONTH, -6, GETDATE())
        ORDER BY el.fdLoad DESC
      `
    } catch (err) {
      logger.warn('[processPairingLocalCharge] Batch query tbEntryList error:', err)
    }
  }

  // 4. BATCH QUERY 2: Ambil tbBilling berdasarkan fdListCode
  const listCodesFromEntries = Array.from(new Set(entriesList.map((e) => String(e.fdListCode || '').trim()).filter(Boolean)))
  let billingsList: any[] = []
  if (listCodesFromEntries.length > 0) {
    try {
      billingsList = await prisma.$queryRaw<any[]>`
        SELECT RTRIM(b.fdInvNo) as fdInvNo, RTRIM(b.fdListCode) as fdListCode, b.fdJumlah1
        FROM tbBilling b WITH (NOLOCK)
        WHERE b.fdListCode IN (${Prisma.join(listCodesFromEntries)})
      `
    } catch (err) {
      logger.warn('[processPairingLocalCharge] Batch query tbBilling error:', err)
    }
  }

  const billMapByListCode = new Map<string, any>()
  for (const b of billingsList) {
    if (b.fdListCode && !billMapByListCode.has(b.fdListCode)) {
      billMapByListCode.set(b.fdListCode, b)
    }
  }

  // 5. BATCH QUERY 3: Ambil tbBillingDetail untuk charge HKD / HK$
  const allInvoiceNos = Array.from(new Set([
    ...entriesList.map((e) => String(e.fdInvoiceNo || '').trim()).filter(Boolean),
    ...billingsList.map((b) => String(b.fdInvNo || '').trim()).filter(Boolean),
  ]))

  let detailsList: any[] = []
  if (allInvoiceNos.length > 0 || listCodesFromEntries.length > 0) {
    try {
      detailsList = await prisma.$queryRaw<any[]>`
        SELECT 
          RTRIM(d.fdInvNo) as fdInvNo,
          RTRIM(d.fdID) as fdID,
          RTRIM(d.fdListCode) as fdListCode,
          RTRIM(d.fdItemName) as fdItemName,
          ISNULL(d.fdQty, 0) as fdQty,
          ISNULL(d.fdItemPrice, 0) as fdItemPrice,
          ISNULL(d.fdTotal, 0) as fdTotal
        FROM tbBillingDetail d WITH (NOLOCK)
        WHERE (
          ${allInvoiceNos.length > 0 ? Prisma.sql`d.fdInvNo IN (${Prisma.join(allInvoiceNos)})` : Prisma.sql`1=0`}
          OR ${listCodesFromEntries.length > 0 ? Prisma.sql`d.fdListCode IN (${Prisma.join(listCodesFromEntries)})` : Prisma.sql`1=0`}
        )
        AND (
          LOWER(d.fdItemName) LIKE '%freight charge%'
          OR LOWER(d.fdItemName) LIKE '%local charge%'
          OR LOWER(d.fdItemName) LIKE '%transport%'
        )
        AND d.fdListCode IN ('HKD', 'HK$')
        ORDER BY d.fdID ASC
      `
    } catch (err) {
      logger.warn('[processPairingLocalCharge] Batch query tbBillingDetail error:', err)
    }
  }

  // 6. BATCH QUERY 4: Ambil tbMarking & tbDelivery untuk fallback status operasional
  const allMarkingCodesToQuery = Array.from(new Set([
    ...markArr,
    ...entriesList.map((e) => String(e.fdMarkingCode || '').trim()).filter(Boolean),
    ...entriesList.map((e) => String(e.fdMarkingCodeAsal || '').trim()).filter(Boolean),
  ]))

  let markingsList: any[] = []
  if (allMarkingCodesToQuery.length > 0) {
    try {
      markingsList = await prisma.$queryRaw<any[]>`
        SELECT 
          RTRIM(fdMarkingCode) as fdMarkingCode,
          fdLoadDate, fdETD, fdETA, fdExitDate,
          RTRIM(fdGudang) as fdGudang,
          fdStatus
        FROM tbMarking WITH (NOLOCK)
        WHERE fdMarkingCode IN (${Prisma.join(allMarkingCodesToQuery)})
      `
    } catch (err) {
      logger.warn('[processPairingLocalCharge] Batch query tbMarking error:', err)
    }
  }

  const markingMap = new Map<string, any>()
  for (const m of markingsList) {
    if (m.fdMarkingCode) markingMap.set(m.fdMarkingCode, m)
  }

  let deliveriesList: any[] = []
  if (allMarkingCodesToQuery.length > 0 || listCodesFromEntries.length > 0) {
    try {
      deliveriesList = await prisma.$queryRaw<any[]>`
        SELECT 
          RTRIM(d.fdSJNo) as fdSJNo,
          d.fdSJDate, d.fdSent, d.fdKembali,
          RTRIM(d.fdSupir) as fdSupir,
          RTRIM(d.fdTerima) as fdTerima,
          RTRIM(d.fdListCode) as fdListCode,
          RTRIM(el.fdMarkingCode) as fdMarkingCode,
          RTRIM(el.fdMarkingCodeAsal) as fdMarkingCodeAsal
        FROM tbDelivery d WITH (NOLOCK)
        INNER JOIN tbEntryList el WITH (NOLOCK) ON d.fdListCode = el.fdListCode
        WHERE (${allMarkingCodesToQuery.length > 0 ? Prisma.sql`el.fdMarkingCode IN (${Prisma.join(allMarkingCodesToQuery)}) OR el.fdMarkingCodeAsal IN (${Prisma.join(allMarkingCodesToQuery)})` : Prisma.sql`1=0`}
           OR ${listCodesFromEntries.length > 0 ? Prisma.sql`d.fdListCode IN (${Prisma.join(listCodesFromEntries)})` : Prisma.sql`1=0`})
        ORDER BY d.fdSJDate DESC
      `
    } catch (err) {
      logger.warn('[processPairingLocalCharge] Batch query tbDelivery error:', err)
    }
  }

  logger.info(`[processPairingLocalCharge] Batch queries selesai dalam ${Date.now() - tStart}ms. Memulai pencocokan in-memory...`)

  // 7. PENCOCOKAN IN-MEMORY
  const rows: PairingLocalChargeRow[] = []

  let totalCocok = 0
  let totalSelisih = 0
  let totalBillBelumAda = 0
  let totalBelumExit = 0
  let totalSudahExit = 0
  let totalTidakDitemukan = 0
  let totalChargeExcel = 0
  let totalChargeDb = 0

  for (const draft of drafts) {
    const { charge, shippingMarksParsed, receiptNosParsed } = draft
    totalChargeExcel += charge

    let matchedBy: 'SHIPPING_MARK' | 'RECEIPT_NO' | 'NONE' = 'NONE'
    let matchedEntries: any[] = []
    
    // A. Prioritas 1: Cari via Receipt No. (fdTerima) jika tersedia karena unik per pengiriman
    if (receiptNosParsed.length > 0) {
      const setNos = new Set(receiptNosParsed.map((r) => r.trim().toLowerCase()))
      matchedEntries = entriesList.filter((e) => {
        const t = String(e.fdTerima || '').trim().toLowerCase()
        return setNos.has(t)
      })
      if (matchedEntries.length > 0) {
        matchedBy = 'RECEIPT_NO'
      }
    }

    // B. Prioritas 2: Cari via Shipping Mark jika belum ditemukan via Receipt No.
    if (matchedEntries.length === 0 && shippingMarksParsed.length > 0) {
      for (const m of shippingMarksParsed) {
        if (!m.markingCode) continue
        const cleanCode = m.markingCode.trim().toLowerCase()
        const cleanNo = m.markingNo.trim().toLowerCase()

        const hits = entriesList.filter((e) => {
          const eCode = String(e.fdMarkingCode || '').trim().toLowerCase()
          const eCodeAsal = String(e.fdMarkingCodeAsal || '').trim().toLowerCase()
          const eNo = String(e.fdMarkingNo || '').trim().toLowerCase()

          const codeMatch = eCode === cleanCode || eCodeAsal === cleanCode || eCode.includes(cleanCode) || eCodeAsal.includes(cleanCode)
          if (!codeMatch) return false
          if (!cleanNo) return true
          return eNo === cleanNo || eNo.includes(cleanNo)
        })

        if (hits.length > 0) {
          matchedEntries = hits
          matchedBy = 'SHIPPING_MARK'
          break
        }
      }
    }

    let invNo: string | null = null
    let invNos: string[] = []
    let chargeDb = 0
    let chargeItemName: string | null = null
    let chargeItemCurr: string | null = null
    let validationStatus: PairingValidationStatus = 'TIDAK_DITEMUKAN'
    let validationNote = ''
    let operationalInfo: OperationalStatus | null = null

    if (matchedEntries.length > 0) {
      const invoiceSet = new Set<string>()
      let totalMatchedFc = 0
      let totalMatchedDetailCharge = 0
      let hasDetailMatch = false
      const matchedDetailNames: string[] = []

      for (const entry of matchedEntries) {
        const listCode = entry.fdListCode ? String(entry.fdListCode).trim() : ''
        const entryFc = parseFloat(entry.fdFc) || 0
        totalMatchedFc += entryFc

        // Ambil No. Invoice dari tbBilling atau entry
        let rowInv: string | null = null
        const billingRow = listCode ? billMapByListCode.get(listCode) : null
        if (billingRow && billingRow.fdInvNo) {
          rowInv = sanitizeControlChars(billingRow.fdInvNo)
        } else if (entry.fdInvoiceNo) {
          rowInv = sanitizeControlChars(entry.fdInvoiceNo)
        }
        if (rowInv) {
          invoiceSet.add(rowInv)
        }

        // Cek detail charge untuk rowInv atau listCode ini
        const detailItem = detailsList.find((d) => {
          if (rowInv && String(d.fdInvNo || '').trim() === rowInv) return true
          if (listCode && String(d.fdListCode || '').trim() === listCode) return true
          return false
        })

        if (detailItem) {
          hasDetailMatch = true
          const qty = parseFloat(detailItem.fdQty) || 0
          totalMatchedDetailCharge += qty
          if (detailItem.fdItemName && !matchedDetailNames.includes(detailItem.fdItemName)) {
            matchedDetailNames.push(detailItem.fdItemName)
          }
          if (detailItem.fdListCode) {
            chargeItemCurr = detailItem.fdListCode
          }
        }
      }

      // Kumpulkan invoice yang ditemukan
      invNos = Array.from(invoiceSet)
      invNo = invNos.length > 0 ? invNos.join(', ') : null

      if (hasDetailMatch) {
        chargeDb = totalMatchedDetailCharge
        chargeItemName = matchedDetailNames.join(', ') || 'LOCAL CHARGES'
        if (!chargeItemCurr) chargeItemCurr = 'HKD'
      } else {
        chargeDb = totalMatchedFc
        chargeItemName = totalMatchedFc > 0 ? 'fdFc (tbEntryList)' : null
        chargeItemCurr = 'HKD'
      }

      totalChargeDb += chargeDb
      const diff = Math.round((charge - chargeDb) * 100) / 100

      // Cek tbMarking & tbDelivery untuk entry ini
      const primaryEntry = matchedEntries[0] || null
      const entryMarkingCode = primaryEntry ? (String(primaryEntry.fdMarkingCode || primaryEntry.fdMarkingCodeAsal || '').trim()) : ''
      if (entryMarkingCode) {
        operationalInfo = resolveOperationalStatus(entryMarkingCode, markingMap, deliveriesList)
      }
      if (!operationalInfo) {
        for (const sm of shippingMarksParsed) {
          if (sm.markingCode) {
            operationalInfo = resolveOperationalStatus(sm.markingCode, markingMap, deliveriesList)
            if (operationalInfo) break
          }
        }
      }

      if (invNos.length > 0) {
        if (Math.abs(diff) < 0.01) {
          validationStatus = 'COCOK'
          validationNote = invNos.length > 1 ? `Cocok dengan ${invNos.length} invoice` : 'Cocok dengan item billing'
          totalCocok++
        } else {
          validationStatus = 'SELISIH'
          validationNote = `Selisih HKD ${Math.abs(diff).toLocaleString('id-ID', { minimumFractionDigits: 2 })} (DB: ${chargeDb.toLocaleString('id-ID', { minimumFractionDigits: 2 })})`
          totalSelisih++
        }
      } else {
        // Cek apakah belum exit gudang
        const mRecord = entryMarkingCode ? markingMap.get(entryMarkingCode) : null
        if (mRecord && !mRecord.fdExitDate) {
          validationStatus = 'BELUM_EXIT'
          const etaFormatted = mRecord.fdETA ? new Date(mRecord.fdETA).toLocaleDateString('id-ID') : '—'
          validationNote = operationalInfo?.statusLabel || `Belum Exit (ETA: ${etaFormatted}) - Bill belum dibuat`
          totalBelumExit++
        } else {
          validationStatus = 'BILL_BELUM_ADA'
          if (chargeDb > 0) {
            const fcDiff = Math.round((charge - chargeDb) * 100) / 100
            if (Math.abs(fcDiff) < 0.01) {
              validationNote = `Bill belum dibuat (fdFc DB cocok: ${chargeDb})`
            } else {
              validationNote = `Bill belum dibuat (fdFc DB: ${chargeDb}, selisih: ${fcDiff})`
            }
          } else {
            validationNote = 'Bill belum dibuat di tbBilling'
          }
          totalBillBelumAda++
        }
      }
    } else {
      // C. Fallback ke tbMarking & tbDelivery jika tidak ada di tbEntryList
      const markingCodes = shippingMarksParsed.map((m) => m.markingCode).filter(Boolean)
      for (const code of markingCodes) {
        operationalInfo = resolveOperationalStatus(code, markingMap, deliveriesList)
        if (operationalInfo) break
      }

      if (operationalInfo) {
        if (operationalInfo.exitDate) {
          validationStatus = 'SUDAH_EXIT'
          validationNote = operationalInfo.statusLabel
          totalSudahExit++
        } else {
          validationStatus = 'BELUM_EXIT'
          validationNote = operationalInfo.statusLabel
          totalBelumExit++
        }
      } else {
        validationStatus = 'TIDAK_DITEMUKAN'
        validationNote = 'Tidak terdaftar di Entry List maupun Master Marking'
        totalTidakDitemukan++
      }
    }

    const diffCharge = Math.round((charge - chargeDb) * 100) / 100

    const primaryEntry = matchedEntries[0] || null
    rows.push({
      rowIndex: draft.rowIndex,
      date: draft.date,
      receiptNo: draft.receiptNo,
      receiptNosParsed: draft.receiptNosParsed,
      customer: draft.customer,
      from: draft.from,
      ctn: draft.ctn,
      kg: draft.kg,
      cbm: draft.cbm,
      charge,
      chargeRaw: draft.chargeRaw,
      shippingMark: draft.shippingMark,
      shippingMarksParsed: draft.shippingMarksParsed,
      matchedBy,
      entryList: primaryEntry
        ? {
            listCode: primaryEntry.fdListCode || '',
            markingCode: primaryEntry.fdMarkingCode || '',
            markingCodeAsal: primaryEntry.fdMarkingCodeAsal || '',
            markingNo: primaryEntry.fdMarkingNo || '',
            terima: primaryEntry.fdTerima || '',
            fc: parseFloat(primaryEntry.fdFc) || 0,
            invoiceNo: primaryEntry.fdInvoiceNo || '',
          }
        : null,
      invNo,
      invNos,
      chargeDb,
      diffCharge,
      chargeItemName,
      chargeItemCurr,
      validationStatus,
      validationNote,
      operationalInfo,
    })
  }

  const summary: PairingLocalChargeSummary = {
    totalRows: rows.length,
    totalCocok,
    totalSelisih,
    totalBillBelumAda,
    totalBelumExit,
    totalSudahExit,
    totalTidakDitemukan,
    totalChargeExcel: Math.round(totalChargeExcel * 100) / 100,
    totalChargeDb: Math.round(totalChargeDb * 100) / 100,
    totalDiffCharge: Math.round((totalChargeExcel - totalChargeDb) * 100) / 100,
  }

  logger.info(`[processPairingLocalCharge] Berhasil selesai dalam total waktu ${Date.now() - tStart}ms`)

  return {
    fileName,
    uploadedAt: new Date().toISOString(),
    summary,
    rows,
  }
}

/**
 * Memproses input nomor resi langsung dari form teks (mendukung multi nomor resi: newline, koma, spasi, titik-koma)
 */
export async function processPairingByReceiptNos(
  rawReceiptInput: string
): Promise<PairingLocalChargeResult> {
  const tStart = Date.now()
  if (!rawReceiptInput || !rawReceiptInput.trim()) {
    throw new Error('Nomor resi tidak boleh kosong')
  }

  // 1. Ekstrak token resi dari baris/koma/titik-koma
  const rawTokens = rawReceiptInput
    .split(/[\n\r,;]+/)
    .map((t) => t.trim())
    .filter(Boolean)

  if (rawTokens.length === 0) {
    throw new Error('Tidak ada nomor resi yang valid ditemukan dalam input')
  }

  // Bentuk drafts per nomor resi input
  interface ReceiptDraft {
    rowIndex: number
    receiptNo: string
    receiptNosParsed: string[]
  }

  const drafts: ReceiptDraft[] = []
  const allReceiptNos = new Set<string>()

  for (let i = 0; i < rawTokens.length; i++) {
    const rawToken = rawTokens[i]
    const parsed = parseReceiptNos(rawToken)
    parsed.forEach((rc) => allReceiptNos.add(rc))

    drafts.push({
      rowIndex: i + 1,
      receiptNo: rawToken,
      receiptNosParsed: parsed,
    })
  }

  const receiptArr = Array.from(allReceiptNos).filter(Boolean)
  logger.info(`[processPairingByReceiptNos] Memulai batch query untuk ${drafts.length} resi (${receiptArr.length} token unik)`)

  // 2. Query tbEntryList join tbCustomers
  let entriesList: any[] = []
  if (receiptArr.length > 0) {
    try {
      entriesList = await prisma.$queryRaw<any[]>`
        SELECT 
          RTRIM(el.fdListCode) as fdListCode,
          el.fdListDate,
          el.fdLoad,
          RTRIM(el.fdMarkingCode) as fdMarkingCode,
          RTRIM(el.fdMarkingCodeAsal) as fdMarkingCodeAsal,
          RTRIM(el.fdMarkingNo) as fdMarkingNo,
          RTRIM(el.fdTerima) as fdTerima,
          ISNULL(el.fdFc, 0) as fdFc,
          RTRIM(el.fdInvoiceNo) as fdInvoiceNo,
          RTRIM(c.fdCustName) as fdCustName,
          RTRIM(el.fdCustCode) as fdCustCode,
          RTRIM(el.fdShipper) as fdShipper,
          el.fdJmlPack,
          el.fdJmlBerat,
          el.fdM3
        FROM tbEntryList el WITH (NOLOCK)
        LEFT JOIN tbCustomers c WITH (NOLOCK) ON el.fdCustCode = c.fdCustCode
        WHERE el.fdTerima IN (${Prisma.join(receiptArr)})
          AND el.fdLoad >= DATEADD(MONTH, -6, GETDATE())
        ORDER BY el.fdLoad DESC
      `
    } catch (err) {
      logger.warn('[processPairingByReceiptNos] Batch query tbEntryList error:', err)
    }
  }

  // 3. Query tbBilling berdasarkan fdListCode
  const listCodesFromEntries = Array.from(new Set(entriesList.map((e) => String(e.fdListCode || '').trim()).filter(Boolean)))
  let billingsList: any[] = []
  if (listCodesFromEntries.length > 0) {
    try {
      billingsList = await prisma.$queryRaw<any[]>`
        SELECT RTRIM(b.fdInvNo) as fdInvNo, RTRIM(b.fdListCode) as fdListCode, b.fdJumlah1
        FROM tbBilling b WITH (NOLOCK)
        WHERE b.fdListCode IN (${Prisma.join(listCodesFromEntries)})
      `
    } catch (err) {
      logger.warn('[processPairingByReceiptNos] Batch query tbBilling error:', err)
    }
  }

  const billMapByListCode = new Map<string, any>()
  for (const b of billingsList) {
    if (b.fdListCode && !billMapByListCode.has(b.fdListCode)) {
      billMapByListCode.set(b.fdListCode, b)
    }
  }

  // 4. Query tbBillingDetail untuk charge HKD / HK$
  const allInvoiceNos = Array.from(new Set([
    ...entriesList.map((e) => String(e.fdInvoiceNo || '').trim()).filter(Boolean),
    ...billingsList.map((b) => String(b.fdInvNo || '').trim()).filter(Boolean),
  ]))

  let detailsList: any[] = []
  if (allInvoiceNos.length > 0 || listCodesFromEntries.length > 0) {
    try {
      detailsList = await prisma.$queryRaw<any[]>`
        SELECT 
          RTRIM(d.fdInvNo) as fdInvNo,
          RTRIM(d.fdID) as fdID,
          RTRIM(d.fdListCode) as fdListCode,
          RTRIM(d.fdItemName) as fdItemName,
          ISNULL(d.fdQty, 0) as fdQty,
          ISNULL(d.fdItemPrice, 0) as fdItemPrice,
          ISNULL(d.fdTotal, 0) as fdTotal
        FROM tbBillingDetail d WITH (NOLOCK)
        WHERE (
          ${allInvoiceNos.length > 0 ? Prisma.sql`d.fdInvNo IN (${Prisma.join(allInvoiceNos)})` : Prisma.sql`1=0`}
          OR ${listCodesFromEntries.length > 0 ? Prisma.sql`d.fdListCode IN (${Prisma.join(listCodesFromEntries)})` : Prisma.sql`1=0`}
        )
        AND (
          LOWER(d.fdItemName) LIKE '%freight charge%'
          OR LOWER(d.fdItemName) LIKE '%local charge%'
          OR LOWER(d.fdItemName) LIKE '%transport%'
        )
        AND d.fdListCode IN ('HKD', 'HK$')
        ORDER BY d.fdID ASC
      `
    } catch (err) {
      logger.warn('[processPairingByReceiptNos] Batch query tbBillingDetail error:', err)
    }
  }

  // 5. Query tbMarking & tbDelivery untuk fallback status operasional
  const allMarkingCodes = Array.from(new Set([
    ...entriesList.map((e) => String(e.fdMarkingCode || '').trim()).filter(Boolean),
    ...entriesList.map((e) => String(e.fdMarkingCodeAsal || '').trim()).filter(Boolean),
  ]))

  let markingsList: any[] = []
  if (allMarkingCodes.length > 0) {
    try {
      markingsList = await prisma.$queryRaw<any[]>`
        SELECT 
          RTRIM(fdMarkingCode) as fdMarkingCode,
          fdLoadDate, fdETD, fdETA, fdExitDate,
          RTRIM(fdGudang) as fdGudang,
          fdStatus
        FROM tbMarking WITH (NOLOCK)
        WHERE fdMarkingCode IN (${Prisma.join(allMarkingCodes)})
      `
    } catch (err) {
      logger.warn('[processPairingByReceiptNos] Batch query tbMarking error:', err)
    }
  }

  const markingMap = new Map<string, any>()
  for (const m of markingsList) {
    if (m.fdMarkingCode) markingMap.set(m.fdMarkingCode, m)
  }

  let deliveriesList: any[] = []
  if (allMarkingCodes.length > 0 || listCodesFromEntries.length > 0) {
    try {
      deliveriesList = await prisma.$queryRaw<any[]>`
        SELECT 
          RTRIM(d.fdSJNo) as fdSJNo,
          d.fdSJDate, d.fdSent, d.fdKembali,
          RTRIM(d.fdSupir) as fdSupir,
          RTRIM(d.fdTerima) as fdTerima,
          RTRIM(d.fdListCode) as fdListCode,
          RTRIM(el.fdMarkingCode) as fdMarkingCode,
          RTRIM(el.fdMarkingCodeAsal) as fdMarkingCodeAsal
        FROM tbDelivery d WITH (NOLOCK)
        INNER JOIN tbEntryList el WITH (NOLOCK) ON d.fdListCode = el.fdListCode
        WHERE (${allMarkingCodes.length > 0 ? Prisma.sql`el.fdMarkingCode IN (${Prisma.join(allMarkingCodes)}) OR el.fdMarkingCodeAsal IN (${Prisma.join(allMarkingCodes)})` : Prisma.sql`1=0`}
           OR ${listCodesFromEntries.length > 0 ? Prisma.sql`d.fdListCode IN (${Prisma.join(listCodesFromEntries)})` : Prisma.sql`1=0`})
        ORDER BY d.fdSJDate DESC
      `
    } catch (err) {
      logger.warn('[processPairingByReceiptNos] Batch query tbDelivery error:', err)
    }
  }

  // 6. Pencocokan In-Memory
  const rows: PairingLocalChargeRow[] = []
  let totalCocok = 0
  let totalSelisih = 0
  let totalBillBelumAda = 0
  let totalBelumExit = 0
  let totalSudahExit = 0
  let totalTidakDitemukan = 0
  let totalChargeExcel = 0
  let totalChargeDb = 0

  for (const draft of drafts) {
    const { receiptNosParsed } = draft
    const setNos = new Set(receiptNosParsed.map((r) => r.trim().toLowerCase()))

    const matchedEntries = entriesList.filter((e) => {
      const t = String(e.fdTerima || '').trim().toLowerCase()
      return setNos.has(t)
    })

    const matchedBy = matchedEntries.length > 0 ? 'RECEIPT_NO' : 'NONE'
    let invNo: string | null = null
    let invNos: string[] = []
    let chargeDb = 0
    let chargeItemName: string | null = null
    let chargeItemCurr: string | null = null
    let validationStatus: PairingValidationStatus = 'TIDAK_DITEMUKAN'
    let validationNote = ''
    let operationalInfo: OperationalStatus | null = null

    // Nilai fisik bawaan entry jika ada
    let dateStr = ''
    let customerName = ''
    let fromStr = ''
    let ctnVal: string | number = '—'
    let kgVal: string | number = '—'
    let cbmVal: string | number = '—'
    let shippingMarkStr = ''
    const shippingMarksParsed: ParsedShippingMark[] = []

    if (matchedEntries.length > 0) {
      const invoiceSet = new Set<string>()
      let totalMatchedFc = 0
      let totalMatchedDetailCharge = 0
      let hasDetailMatch = false
      const matchedDetailNames: string[] = []

      let totalCtn = 0
      let totalKg = 0
      let totalM3 = 0

      for (const entry of matchedEntries) {
        const listCode = entry.fdListCode ? String(entry.fdListCode).trim() : ''
        const entryFc = parseFloat(entry.fdFc) || 0
        totalMatchedFc += entryFc

        if (!dateStr && entry.fdListDate) {
          dateStr = new Date(entry.fdListDate).toLocaleDateString('id-ID')
        }
        if (!customerName && (entry.fdCustName || entry.fdCustCode)) {
          customerName = (entry.fdCustName || entry.fdCustCode).trim()
        }
        if (!fromStr && entry.fdShipper) {
          fromStr = entry.fdShipper.trim()
        }

        const ePack = parseFloat(entry.fdJmlPack) || 0
        const eKg = parseFloat(entry.fdJmlBerat) || 0
        const eM3 = parseFloat(entry.fdM3) || 0
        totalCtn += ePack
        totalKg += eKg
        totalM3 += eM3

        const mCode = (entry.fdMarkingCodeAsal || entry.fdMarkingCode || '').trim()
        const mNo = (entry.fdMarkingNo || '').trim()
        if (mCode || mNo) {
          const markDesc = `${mCode} ${mNo}`.trim()
          if (!shippingMarkStr) {
            shippingMarkStr = markDesc
          } else if (!shippingMarkStr.includes(markDesc)) {
            shippingMarkStr += `, ${markDesc}`
          }
          if (mCode && !shippingMarksParsed.some((sm) => sm.markingCode === mCode && sm.markingNo === mNo)) {
            shippingMarksParsed.push({ markingCode: mCode, markingNo: mNo })
          }
        }

        // Ambil No. Invoice dari tbBilling atau entry
        let rowInv: string | null = null
        const billingRow = listCode ? billMapByListCode.get(listCode) : null
        if (billingRow && billingRow.fdInvNo) {
          rowInv = sanitizeControlChars(billingRow.fdInvNo)
        } else if (entry.fdInvoiceNo) {
          rowInv = sanitizeControlChars(entry.fdInvoiceNo)
        }
        if (rowInv) {
          invoiceSet.add(rowInv)
        }

        // Cek detail charge untuk rowInv atau listCode ini
        const detailItem = detailsList.find((d) => {
          if (rowInv && String(d.fdInvNo || '').trim() === rowInv) return true
          if (listCode && String(d.fdListCode || '').trim() === listCode) return true
          return false
        })

        if (detailItem) {
          hasDetailMatch = true
          const qty = parseFloat(detailItem.fdQty) || 0
          totalMatchedDetailCharge += qty
          if (detailItem.fdItemName && !matchedDetailNames.includes(detailItem.fdItemName)) {
            matchedDetailNames.push(detailItem.fdItemName)
          }
          if (detailItem.fdListCode) {
            chargeItemCurr = detailItem.fdListCode
          }
        }
      }

      ctnVal = totalCtn > 0 ? totalCtn : '—'
      kgVal = totalKg > 0 ? totalKg : '—'
      cbmVal = totalM3 > 0 ? totalM3.toFixed(3) : '—'

      invNos = Array.from(invoiceSet)
      invNo = invNos.length > 0 ? invNos.join(', ') : null

      if (hasDetailMatch) {
        chargeDb = totalMatchedDetailCharge
        chargeItemName = matchedDetailNames.join(', ') || 'LOCAL CHARGES'
        if (!chargeItemCurr) chargeItemCurr = 'HKD'
      } else {
        chargeDb = totalMatchedFc
        chargeItemName = totalMatchedFc > 0 ? 'fdFc (tbEntryList)' : null
        chargeItemCurr = 'HKD'
      }

      totalChargeDb += chargeDb

      // Cek tbMarking & tbDelivery untuk entry ini
      const primaryEntry = matchedEntries[0] || null
      const entryMarkingCode = primaryEntry ? (String(primaryEntry.fdMarkingCode || primaryEntry.fdMarkingCodeAsal || '').trim()) : ''
      if (entryMarkingCode) {
        operationalInfo = resolveOperationalStatus(entryMarkingCode, markingMap, deliveriesList)
      }
      if (!operationalInfo) {
        for (const sm of shippingMarksParsed) {
          if (sm.markingCode) {
            operationalInfo = resolveOperationalStatus(sm.markingCode, markingMap, deliveriesList)
            if (operationalInfo) break
          }
        }
      }

      if (invNos.length > 0) {
        validationStatus = 'COCOK'
        validationNote = invNos.length > 1
          ? `Ditemukan ${invNos.length} invoice (${invNos.join(', ')})`
          : `Ditemukan invoice ${invNos[0]}`
        totalCocok++
      } else {
        // Cek apakah belum exit gudang
        const mRecord = entryMarkingCode ? markingMap.get(entryMarkingCode) : null
        if (mRecord && !mRecord.fdExitDate) {
          validationStatus = 'BELUM_EXIT'
          const etaFormatted = mRecord.fdETA ? new Date(mRecord.fdETA).toLocaleDateString('id-ID') : '—'
          validationNote = operationalInfo?.statusLabel || `Belum Exit (ETA: ${etaFormatted}) - Bill belum dibuat`
          totalBelumExit++
        } else {
          validationStatus = 'BILL_BELUM_ADA'
          if (chargeDb > 0) {
            validationNote = `Bill belum dibuat (fdFc DB: ${chargeDb})`
          } else {
            validationNote = 'Bill belum dibuat di tbBilling'
          }
          totalBillBelumAda++
        }
      }
    } else {
      validationStatus = 'TIDAK_DITEMUKAN'
      validationNote = 'Nomor resi tidak ditemukan di tbEntryList'
      totalTidakDitemukan++
    }

    const primaryEntry = matchedEntries[0] || null
    rows.push({
      rowIndex: draft.rowIndex,
      date: dateStr || '—',
      receiptNo: draft.receiptNo,
      receiptNosParsed: draft.receiptNosParsed,
      customer: customerName || '—',
      from: fromStr || '—',
      ctn: ctnVal,
      kg: kgVal,
      cbm: cbmVal,
      charge: 0,
      chargeRaw: '0',
      shippingMark: shippingMarkStr || '—',
      shippingMarksParsed,
      matchedBy,
      entryList: primaryEntry
        ? {
            listCode: primaryEntry.fdListCode || '',
            markingCode: primaryEntry.fdMarkingCode || '',
            markingCodeAsal: primaryEntry.fdMarkingCodeAsal || '',
            markingNo: primaryEntry.fdMarkingNo || '',
            terima: primaryEntry.fdTerima || '',
            fc: parseFloat(primaryEntry.fdFc) || 0,
            invoiceNo: primaryEntry.fdInvoiceNo || '',
          }
        : null,
      invNo,
      invNos,
      chargeDb,
      diffCharge: 0,
      chargeItemName,
      chargeItemCurr,
      validationStatus,
      validationNote,
      operationalInfo,
    })
  }

  const summary: PairingLocalChargeSummary = {
    totalRows: rows.length,
    totalCocok,
    totalSelisih,
    totalBillBelumAda,
    totalBelumExit,
    totalSudahExit,
    totalTidakDitemukan,
    totalChargeExcel: 0,
    totalChargeDb: Math.round(totalChargeDb * 100) / 100,
    totalDiffCharge: 0,
  }

  logger.info(`[processPairingByReceiptNos] Berhasil selesai dalam total waktu ${Date.now() - tStart}ms`)

  return {
    fileName: `Form Resi (${drafts.length} resi)`,
    uploadedAt: new Date().toISOString(),
    summary,
    rows,
  }
}

/**
 * Menghasilkan file Excel (.xlsx) dengan format kolom asli
 * ditambah kolom 'No. Invoice' dan 'Hasil Validasi' menggunakan ExcelJS
 */
export async function generatePairingLocalChargeExcel(
  rows: PairingLocalChargeRow[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Pairing Local Charge')

  worksheet.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Recepit No.', key: 'receiptNo', width: 18 },
    { header: 'Customer', key: 'customer', width: 22 },
    { header: 'From', key: 'from', width: 22 },
    { header: 'ctn', key: 'ctn', width: 8 },
    { header: 'KG', key: 'kg', width: 10 },
    { header: 'CBM', key: 'cbm', width: 10 },
    { header: 'Charge', key: 'charge', width: 14 },
    { header: 'Shipping Mark', key: 'shippingMark', width: 30 },
    { header: 'No. Invoice', key: 'invNo', width: 24 },
    { header: 'Hasil Validasi', key: 'validationResult', width: 50 },
  ]

  // Styling header row
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }, // Slate 800
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }

  for (const r of rows) {
    let valResult = r.validationNote
    if (r.validationStatus === 'COCOK') {
      valResult = 'COCOK'
    } else if (r.validationStatus === 'SELISIH') {
      valResult = `SELISIH (${r.validationNote})`
    } else if (r.validationStatus === 'BILL_BELUM_ADA') {
      valResult = `BILL BELUM DIBUAT (${r.validationNote})`
    }

    const addedRow = worksheet.addRow({
      date: r.date,
      receiptNo: r.receiptNo,
      customer: r.customer,
      from: r.from,
      ctn: r.ctn,
      kg: r.kg,
      cbm: r.cbm,
      charge: r.charge,
      shippingMark: r.shippingMark,
      invNo: r.invNo || '—',
      validationResult: valResult,
    })

    // Highlight row berdasarkan status
    const statusCell = addedRow.getCell('validationResult')
    if (r.validationStatus === 'COCOK') {
      statusCell.font = { color: { argb: 'FF15803D' }, bold: true }
    } else if (r.validationStatus === 'SELISIH') {
      statusCell.font = { color: { argb: 'FFB91C1C' }, bold: true }
    } else if (r.validationStatus === 'BILL_BELUM_ADA') {
      statusCell.font = { color: { argb: 'FFB45309' }, bold: true }
    } else if (r.validationStatus === 'SUDAH_EXIT') {
      statusCell.font = { color: { argb: 'FF4338CA' }, bold: true }
    } else if (r.validationStatus === 'BELUM_EXIT') {
      statusCell.font = { color: { argb: 'FF0284C7' }, bold: true }
    } else {
      statusCell.font = { color: { argb: 'FF64748B' } }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
