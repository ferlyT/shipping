import * as XLSX from 'xlsx'
import { billingApi } from '../../services/billing.service'
import { formatDate } from '@/lib/utils'
import type { NormalizedMarkingRow } from './types'

export async function exportCustMarkingToExcel({
  rows,
  custName,
  custCode,
  markingCode,
}: {
  rows: NormalizedMarkingRow[]
  custName: string
  custCode?: string | null
  markingCode?: string | null
}): Promise<void> {
  if (rows.length === 0) return

  // 1. Ambil listCode unik dari rows
  const listCodes = Array.from(
    new Set(
      rows
        .map((r) => r.listCode)
        .filter((lc): lc is string => typeof lc === 'string' && lc.trim().length >= 4 && lc !== '—')
    )
  )

  // 2. Fetch data detail ukuran dari backend tbEntryListDetail
  let entryDetails: Array<{
    fdListCode: string
    fdListDCode: string
    fdDescr: string
    fdPjg: number
    fdLbr: number
    fdTng: number
    fdQty: number
    fdM3: number
    fdLoad: string | null
  }> = []

  if (listCodes.length > 0) {
    try {
      const res = await billingApi.entryListDetails(listCodes)
      entryDetails = res.data?.data || []
    } catch (fetchErr) {
      // Fallback silent or minimal log
    }
  }

  // 3. Siapkan Sheet 1: Ringkasan Listcode & Marking
  const sheet1Rows = rows.map((r, idx) => ({
    No: idx + 1,
    'No. Invoice': r.invoice,
    'Tgl Invoice': r.dateStr ? formatDate(r.dateStr) : '—',
    Cabang: r.branchCode,
    'No. Listcode': r.listCode,
    'No. Terima / Resi': r.terima,
    'Marking No': r.marking,
    Komoditas: r.fdComodity || r.comodity,
    'Tipe Komoditas': r.fdComodityName || '—',
    Mode: r.modeText,
    'Tax Return': r.isTax ? 'TAX' : 'NON TAX',
    'Qty Gudang': r.qtyGdg,
    'Qty Listcode': r.qtySJ,
    'Qty PL': r.qtyPL,
    'Qty Komplain': r.qtyK,
    'Berat Gudang (kg)': r.weightGdg,
    'Berat Listcode (kg)': r.weightSJ,
    'Berat Komplain (kg)': r.weightK,
    'Selisih Berat (kg)': r.selisihKg,
    'Volume Gudang (m³)': r.m3Gdg,
    'Volume PL (m³)': r.m3PL,
    'Volume Komplain (m³)': r.m3K,
    'Selisih Volume (m³)': r.selisihM3,
    'Volume Bill (m³)': r.m3Bill,
    'Rasio (kg/m³)': r.rasio,
    'VFC Gudang': r.vfcGdg,
    'VFC Komplain': r.vfcK,
    'VFC Bill': r.vfcBill,
    'Overweight (kg)': r.overWeight || 0,
    'Nilai Tagihan (Rp)': r.value2,
    'Nilai Tax Return (Rp)': r.fc,
    Status: r.status === 1 ? 'LUNAS' : r.status === 2 ? 'BATAL' : 'PENDING',
    'Tipe Tagihan': r.typeTagihan ? `Tipe ${r.typeTagihan}` : '—',
  }))

  // 4. Siapkan Sheet 2: Detail Ukuran Fisik
  const sheet2Aoa: any[][] = []

  rows.forEach((rowItem) => {
    const effectiveCustName = rowItem.raw?.fdCustName?.trim() || custName || '—'
    const effectiveMarking = rowItem.raw?.fdMarkingCode?.trim() || markingCode || '—'
    const effectiveMarkingNo = rowItem.marking || rowItem.raw?.fdMarkingNo?.trim() || '—'
    const effectiveResi = rowItem.terima || rowItem.raw?.fdTerima?.trim() || '—'
    const effectiveKomoditas = rowItem.fdComodity || rowItem.comodity || '—'

    // Header identitas kargo vertikal
    sheet2Aoa.push(['Customer Name', effectiveCustName])
    sheet2Aoa.push(['Marking', effectiveMarking])
    sheet2Aoa.push(['Marking No', effectiveMarkingNo])
    sheet2Aoa.push(['Resi', effectiveResi])
    sheet2Aoa.push(['Komoditas', effectiveKomoditas])

    // Header tabel data detail horizontal
    sheet2Aoa.push([
      'No',
      'Panjang (cm)',
      'Lebar (cm)',
      'Tinggi (cm)',
      'Qty',
      'Volume (m³)',
    ])

    const matchedDetails = entryDetails.filter((d) => d.fdListCode === rowItem.listCode)

    let totalQty = 0
    let totalM3 = 0

    if (matchedDetails.length > 0) {
      matchedDetails.forEach((d, dIdx) => {
        const pjg = Number(d.fdPjg) || 0
        const lbr = Number(d.fdLbr) || 0
        const tng = Number(d.fdTng) || 0
        const qty = Number(d.fdQty) || 0
        const m3 =
          Number(d.fdM3) ||
          (pjg > 0 && lbr > 0 && tng > 0 ? parseFloat(((pjg * lbr * tng * qty) / 1000000).toFixed(4)) : 0)

        totalQty += qty
        totalM3 += m3

        sheet2Aoa.push([
          dIdx + 1,
          pjg,
          lbr,
          tng,
          qty,
          parseFloat(m3.toFixed(4)),
        ])
      })
    } else {
      const fallbackQty = rowItem.qtyGdg || rowItem.qtySJ || 0
      const fallbackM3 = rowItem.m3Gdg || rowItem.m3PL || rowItem.m3Bill || 0
      totalQty = fallbackQty
      totalM3 = fallbackM3

      sheet2Aoa.push([
        1,
        0,
        0,
        0,
        fallbackQty,
        parseFloat(Number(fallbackM3).toFixed(4)),
      ])
    }

    // Baris terakhir: Total m3
    sheet2Aoa.push([
      'Total',
      '',
      '',
      '',
      totalQty,
      parseFloat(totalM3.toFixed(4)),
    ])

    sheet2Aoa.push([]) // baris kosong pemisah antar kargo
    sheet2Aoa.push([])
  })

  // 5. Buat Workbook
  const wb = XLSX.utils.book_new()
  const ws1 = XLSX.utils.json_to_sheet(sheet1Rows)
  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Aoa)

  // Pengaturan lebar kolom agar rapi dan proporsional
  ws2['!cols'] = [
    { wch: 18 }, // Col A: Label / No / Total
    { wch: 28 }, // Col B: Value / Panjang (cm)
    { wch: 14 }, // Col C: Lebar (cm)
    { wch: 14 }, // Col D: Tinggi (cm)
    { wch: 12 }, // Col E: Qty
    { wch: 16 }, // Col F: Volume (m³)
  ]

  XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan Marking')
  XLSX.utils.book_append_sheet(wb, ws2, 'Detail Ukuran Fisik')

  const safeCustomer = (custName || custCode || 'CUSTOMER').replace(/[/\\?%*:|"<>]/g, '_').trim()
  const safeMarking = (markingCode || 'MARKING').replace(/[/\\?%*:|"<>]/g, '_').trim()
  const filename = `Detail_Marking_${safeCustomer}_${safeMarking}_${new Date().toISOString().slice(0, 10)}.xlsx`

  XLSX.writeFile(wb, filename)
}
