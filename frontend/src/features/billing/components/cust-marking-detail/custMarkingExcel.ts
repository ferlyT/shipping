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
    sheet2Aoa.push([
      `LISTCODE: ${rowItem.listCode}`,
      `MARKING: ${rowItem.marking || markingCode || '—'}`,
      `INVOICE: ${rowItem.invoice}`,
      `CABANG: ${rowItem.branchCode}`,
      `KOMODITAS: ${rowItem.comodity}`,
    ])
    sheet2Aoa.push(['Item / Kode', 'Keterangan', 'Panjang (cm)', 'Lebar (cm)', 'Tinggi (cm)', 'Qty (Koli)', 'Volume (m³)', 'Load / Kontainer'])

    const matchedDetails = entryDetails.filter((d) => d.fdListCode === rowItem.listCode)

    if (matchedDetails.length > 0) {
      matchedDetails.forEach((d) => {
        sheet2Aoa.push([
          d.fdListDCode || '—',
          d.fdDescr || '—',
          d.fdPjg || 0,
          d.fdLbr || 0,
          d.fdTng || 0,
          d.fdQty || 0,
          d.fdM3 || 0,
          d.fdLoad || '—',
        ])
      })
    } else {
      sheet2Aoa.push(['—', 'Data ukuran fisik tidak ditemukan / belum diisi', 0, 0, 0, rowItem.qtyGdg || rowItem.qtySJ, rowItem.m3Gdg || rowItem.m3PL, '—'])
    }

    sheet2Aoa.push([]) // baris kosong pemisah
  })

  // 5. Buat Workbook
  const wb = XLSX.utils.book_new()
  const ws1 = XLSX.utils.json_to_sheet(sheet1Rows)
  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Aoa)

  XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan Marking')
  XLSX.utils.book_append_sheet(wb, ws2, 'Detail Ukuran Fisik')

  const safeCustomer = (custName || custCode || 'CUSTOMER').replace(/[/\\?%*:|"<>]/g, '_').trim()
  const safeMarking = (markingCode || 'MARKING').replace(/[/\\?%*:|"<>]/g, '_').trim()
  const filename = `Detail_Marking_${safeCustomer}_${safeMarking}_${new Date().toISOString().slice(0, 10)}.xlsx`

  XLSX.writeFile(wb, filename)
}
