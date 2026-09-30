import * as XLSX from 'xlsx'
import { billingApi } from '../../services/billing.service'
import { formatDate } from '@/lib/utils'
import type { NormalizedMarkingRow } from './types'

export async function exportCustMarkingToExcel({
  rows,
  custName,
  custCode: _custCode,
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

  // 3. Siapkan Sheet 1: Ringkasan Listcode & Marking (23 Kolom FoxPro)
  const sheet1Rows = rows.map((r, idx) => ({
    No: idx + 1,
    'BC.': r.branchCode,
    'No. Invoice': r.invoice,
    'Tgl Inv': r.dateStr ? formatDate(r.dateStr) : '—',
    'Marking No': r.markingNo || r.marking,
    Comodity: r.fdComodity || r.comodity,
    Ket: r.fdDesc || '—',
    Curr: r.currValue1 || 'IDR',
    Value: r.value2 || 0,
    Fc: r.fc || 0,
    Berat: r.weightGdg,
    'Berat SJ': r.weightSJ,
    'Berat K': r.weightK,
    'KG Bill': r.kgBill,
    'Qty SJ': r.qtySJ,
    'Qty Gdg': r.qtyGdg,
    'Qty PL': r.qtyPL,
    'Qty K': r.qtyK,
    Tipe: r.typeComodityText || '—',
    Tax: r.isTax ? 'YES' : 'NO',
    'M3 Pl': r.m3PL,
    'M3 / Vfc': r.listType === 1 ? r.vfcGdg : r.m3Gdg,
    'M3 K / Vfc K': r.listType === 1 ? r.vfcK : r.m3K,
    'M3 Bill / Vfc Bill': r.listType === 1 ? r.vfcBill : r.m3Bill,
    'No. Listcode': r.listCode,
    'No. Terima / Resi': r.terima,
    'Rasio (kg/m³)': r.rasio,
    'Overweight (kg)': r.overWeight || 0,
    Status: r.status === 1 ? 'LUNAS' : r.status === 2 ? 'BATAL' : 'PENDING',
  }))

  // 4. Siapkan Sheet 2: Detail Ukuran Fisik
  const sheet2Aoa: any[][] = []

  rows.forEach((rowItem) => {
    const effectiveCustName = rowItem.raw?.fdCustName?.trim() || custName || '—'
    const effectiveMarking = rowItem.raw?.fdMarkingCode?.trim() || markingCode || '—'
    const effectiveMarkingNo = rowItem.raw?.fdMarkingNo?.trim() || '—'
    const effectiveResi = rowItem.terima || rowItem.raw?.fdTerima?.trim() || '—'
    const effectiveKomoditas = rowItem.fdComodity || rowItem.comodity || '—'

    // Header identitas kargo vertikal
    sheet2Aoa.push(['Customer Name', effectiveCustName])
    sheet2Aoa.push(['Marking', effectiveMarking])
    sheet2Aoa.push(['Marking No', effectiveMarkingNo])
    sheet2Aoa.push(['No. Terima / Resi', effectiveResi])
    sheet2Aoa.push(['Komoditas', effectiveKomoditas])
    sheet2Aoa.push(['No. Listcode', rowItem.listCode])
    sheet2Aoa.push([]) // baris kosong pemisah

    // Sub-tabel ukuran fisik barang
    const details = entryDetails.filter((d) => d.fdListCode === rowItem.listCode)

    if (details.length > 0) {
      sheet2Aoa.push(['No', 'Panjang', 'Lebar', 'Tinggi', 'Qty', 'Volume', 'Keterangan'])
      let subQty = 0
      let subM3 = 0
      details.forEach((item, dIdx) => {
        subQty += item.fdQty || 0
        subM3 += item.fdM3 || 0
        sheet2Aoa.push([
          dIdx + 1,
          Number(Number(item.fdPjg || 0).toFixed(2)),
          Number(Number(item.fdLbr || 0).toFixed(2)),
          Number(Number(item.fdTng || 0).toFixed(2)),
          item.fdQty || 0,
          Number(Number(item.fdM3 || 0).toFixed(4)),
          item.fdDescr || '',
        ])
      })
      sheet2Aoa.push(['TOTAL', '', '', '', subQty, Number(subM3.toFixed(4)), ''])
    } else {
      sheet2Aoa.push(['Informasi', 'Data rincian dimensi fisik per-coly tidak tercatat dalam arsip listcode gudang.'])
    }

    sheet2Aoa.push([]) // spacer antar resi
    sheet2Aoa.push(['--------------------------------------------------------------------------------------------------------------------------------'])
    sheet2Aoa.push([]) // spacer
  })

  // 5. Buat Workbook Excel multi-sheet
  const wb = XLSX.utils.book_new()

  const ws1 = XLSX.utils.json_to_sheet(sheet1Rows)
  XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan Marking')

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Aoa)
  ws2['!cols'] = [
    { wch: 18 }, // Col A: No / Label / TOTAL
    { wch: 14 }, // Col B: Panjang
    { wch: 14 }, // Col C: Lebar
    { wch: 14 }, // Col D: Tinggi
    { wch: 12 }, // Col E: Qty
    { wch: 16 }, // Col F: Volume
    { wch: 30 }, // Col G: Keterangan
  ]
  XLSX.utils.book_append_sheet(wb, ws2, 'Detail Ukuran Fisik')

  // 6. Nama file dinamis
  const safeCust = custName.replace(/[^a-zA-Z0-9_-]/g, '_')
  const safeMarking = (markingCode || 'ALL').replace(/[^a-zA-Z0-9_-]/g, '_')
  const dateStamp = new Date().toISOString().slice(0, 10)
  const filename = `Detail_Marking_${safeCust}_${safeMarking}_${dateStamp}.xlsx`

  // 7. Unduh file via browser
  XLSX.writeFile(wb, filename)
}
