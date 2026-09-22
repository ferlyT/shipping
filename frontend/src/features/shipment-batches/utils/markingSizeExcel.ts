import * as XLSX from 'xlsx'
import { markingApi } from '../services/marking.service'
import type { MarkingSizeAuditResponse } from '../types/marking.types'
import { displayCustName } from '@/lib/utils'

export async function exportMarkingSizeToExcel(auditData: MarkingSizeAuditResponse): Promise<void> {
  const { header, summary, items } = auditData
  const markingCode = (header.fdMarkingCode || summary.markingCode || '').trim()
  const isAir = Number(header.fdListType) === 1

  // 1. Ambil seluruh data dimensi dari backend
  let allDims: {
    gudang: Array<{ fdListCode: string; fdPjg: number; fdLbr: number; fdTng: number; fdQty: number; fdDescr?: string }>
    original: Array<{ fdListCode: string; fdPjg: number; fdLbr: number; fdTng: number; fdQty: number; fdDescr?: string }>
    komplain: Array<{ fdListCode: string; fdPjg: number; fdLbr: number; fdTng: number; fdQty: number; fdDescr?: string }>
  } = { gudang: [], original: [], komplain: [] }

  try {
    const res = await markingApi.getAllBatchDimensions(markingCode)
    if (res.data?.data) {
      allDims = res.data.data
    }
  } catch (err) {
    console.error('Gagal mengambil semua data dimensi batch untuk Excel:', err)
  }

  // Helper untuk group dimensi berdasarkan listcode
  const gudangMap = new Map<string, typeof allDims.gudang>()
  for (const row of allDims.gudang) {
    const lc = (row.fdListCode || '').trim()
    if (!gudangMap.has(lc)) gudangMap.set(lc, [])
    gudangMap.get(lc)!.push(row)
  }

  const oriMap = new Map<string, typeof allDims.original>()
  for (const row of allDims.original) {
    const lc = (row.fdListCode || '').trim()
    if (!oriMap.has(lc)) oriMap.set(lc, [])
    oriMap.get(lc)!.push(row)
  }

  const komplainMap = new Map<string, typeof allDims.komplain>()
  for (const row of allDims.komplain) {
    const lc = (row.fdListCode || '').trim()
    if (!komplainMap.has(lc)) komplainMap.set(lc, [])
    komplainMap.get(lc)!.push(row)
  }

  const wb = XLSX.utils.book_new()

  // ─────────────────────────────────────────────────────────────
  // SHEET 1: DETAIL (Ukuran Gudang Fisik)
  // ─────────────────────────────────────────────────────────────
  const sheet1Aoa: any[][] = []
  sheet1Aoa.push([`Laporan Detil Ukuran Marking ${markingCode}`])
  sheet1Aoa.push([])
  sheet1Aoa.push(['NO', 'MARKING CODE', 'CUSTOMER', 'MARKING NO', 'PANJANG', 'LEBAR', 'TINGGI', 'QTY', isAir ? 'VFC (KG)' : 'VOL (M3)'])

  let noUrut1 = 0
  items.forEach((item) => {
    noUrut1++
    const lc = item.fdListCode.trim()
    const boxRows = gudangMap.get(lc) || []

    if (boxRows.length > 0) {
      let subtotalQty = 0
      let subtotalVol = 0

      boxRows.forEach((box, bIdx) => {
        const p = Number(box.fdPjg) || 0
        const l = Number(box.fdLbr) || 0
        const t = Number(box.fdTng) || 0
        const q = Number(box.fdQty) || 0
        const vol = isAir ? Number(((p * l * t * q) / 6000).toFixed(2)) : Number(((p * l * t * q) / 1000000).toFixed(4))

        subtotalQty += q
        subtotalVol += vol

        sheet1Aoa.push([
          bIdx === 0 ? noUrut1 : '',
          bIdx === 0 ? item.fdMarkingCode : '',
          bIdx === 0 ? displayCustName(item.fdCustName) : '',
          bIdx === 0 ? item.fdMarkingNo : '',
          p,
          l,
          t,
          q,
          vol,
        ])
      })

      sheet1Aoa.push(['', '', '', '', '', '', 'TOTAL :', subtotalQty, Number(subtotalVol.toFixed(4))])
    } else {
      // Fallback jika tidak ada breakdown koli
      sheet1Aoa.push([
        noUrut1,
        item.fdMarkingCode,
        displayCustName(item.fdCustName),
        item.fdMarkingNo,
        '-',
        '-',
        '-',
        item.fdTotalQty || item.fdJmlPack,
        item.fdM3,
      ])
    }
  })

  sheet1Aoa.push([])
  sheet1Aoa.push(['', '', '', 'TOTAL JML PACK', summary.totalPackPL])
  sheet1Aoa.push(['', '', '', 'TOTAL BERAT', summary.totalBeratList])
  sheet1Aoa.push(['', '', '', 'TOTAL M3 PL', summary.totalM3PL])
  sheet1Aoa.push(['', '', '', 'TOTAL M3 GUDANG', summary.totalM3Gdg])
  sheet1Aoa.push(['', '', '', 'TOTAL SELISIH', summary.selisihM3])

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Aoa)
  ws1['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 30 },
    { wch: 22 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
  ]
  XLSX.utils.book_append_sheet(wb, ws1, 'DETAIL')

  // ─────────────────────────────────────────────────────────────
  // SHEET 2: ORIGINAL (Ukuran Original dari tbEntryListDetailOri)
  // ─────────────────────────────────────────────────────────────
  const sheet2Aoa: any[][] = []
  sheet2Aoa.push([`Laporan Detil Ukuran Original Marking ${markingCode}`])
  sheet2Aoa.push([])
  sheet2Aoa.push(['NO', 'MARKING CODE', 'CUSTOMER', 'MARKING NO', 'PANJANG', 'LEBAR', 'TINGGI', 'QTY', isAir ? 'VFC (KG)' : 'VOL (M3)'])

  let noUrut2 = 0
  items.forEach((item) => {
    const lc = item.fdListCode.trim()
    const boxRows = oriMap.get(lc) || []

    if (boxRows.length > 0) {
      noUrut2++
      let subtotalQty = 0
      let subtotalVol = 0

      boxRows.forEach((box, bIdx) => {
        const p = Number(box.fdPjg) || 0
        const l = Number(box.fdLbr) || 0
        const t = Number(box.fdTng) || 0
        const q = Number(box.fdQty) || 0
        const vol = isAir ? Number(((p * l * t * q) / 6000).toFixed(2)) : Number(((p * l * t * q) / 1000000).toFixed(4))

        subtotalQty += q
        subtotalVol += vol

        sheet2Aoa.push([
          bIdx === 0 ? noUrut2 : '',
          bIdx === 0 ? item.fdMarkingCode : '',
          bIdx === 0 ? displayCustName(item.fdCustName) : '',
          bIdx === 0 ? item.fdMarkingNo : '',
          p,
          l,
          t,
          q,
          vol,
        ])
      })

      sheet2Aoa.push(['', '', '', '', '', '', 'TOTAL :', subtotalQty, Number(subtotalVol.toFixed(4))])
    }
  })

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Aoa)
  ws2['!cols'] = ws1['!cols']
  XLSX.utils.book_append_sheet(wb, ws2, 'ORIGINAL')

  // ─────────────────────────────────────────────────────────────
  // SHEET 3: KOMPLAIN (Ukuran Komplain dari tbEntryListDetail_Komplain)
  // ─────────────────────────────────────────────────────────────
  const sheet3Aoa: any[][] = []
  sheet3Aoa.push([`Laporan Detil Ukuran Komplain Marking ${markingCode}`])
  sheet3Aoa.push([])
  sheet3Aoa.push(['NO', 'MARKING CODE', 'CUSTOMER', 'MARKING NO', 'PANJANG', 'LEBAR', 'TINGGI', 'QTY', isAir ? 'VFC (KG)' : 'VOL (M3)'])

  let noUrut3 = 0
  items.forEach((item) => {
    if (item.fdm3Komplain > 0 || item.fdJmlBeratKomplain > 0) {
      const lc = item.fdListCode.trim()
      const boxRows = komplainMap.get(lc) || []

      if (boxRows.length > 0) {
        noUrut3++
        let subtotalQty = 0
        let subtotalVol = 0

        boxRows.forEach((box, bIdx) => {
          const p = Number(box.fdPjg) || 0
          const l = Number(box.fdLbr) || 0
          const t = Number(box.fdTng) || 0
          const q = Number(box.fdQty) || 0
          const vol = isAir ? Number(((p * l * t * q) / 6000).toFixed(2)) : Number(((p * l * t * q) / 1000000).toFixed(4))

          subtotalQty += q
          subtotalVol += vol

          sheet3Aoa.push([
            bIdx === 0 ? noUrut3 : '',
            bIdx === 0 ? item.fdMarkingCode : '',
            bIdx === 0 ? displayCustName(item.fdCustName) : '',
            bIdx === 0 ? item.fdMarkingNo : '',
            p,
            l,
            t,
            q,
            vol,
          ])
        })

        sheet3Aoa.push(['', '', '', '', '', '', 'TOTAL :', subtotalQty, Number(subtotalVol.toFixed(4))])
      }
    }
  })

  const ws3 = XLSX.utils.aoa_to_sheet(sheet3Aoa)
  ws3['!cols'] = ws1['!cols']
  XLSX.utils.book_append_sheet(wb, ws3, 'KOMPLAIN')

  // ─────────────────────────────────────────────────────────────
  // SHEET 4: REKAP (Tabel Lengkap Per Listcode)
  // ─────────────────────────────────────────────────────────────
  const sheet4Aoa: any[][] = []
  sheet4Aoa.push([`Laporan Rekap Ukuran Marking ${markingCode}`])
  sheet4Aoa.push([])
  sheet4Aoa.push([
    'NO',
    'MARKING CODE',
    'CUSTOMER',
    'MARKING NO',
    'JML PACK',
    'QTY DETIL',
    'M3 PL',
    'M3',
    'M3 KOMPLAIN',
    'BERAT LIST',
    'BERAT GDG',
    'BERAT SJ',
    'BERAT KOMPLAIN',
    'LISTCODE',
    'TYPE',
    'COMODITY',
    'KETERANGAN',
  ])

  items.forEach((item, idx) => {
    sheet4Aoa.push([
      idx + 1,
      item.fdMarkingCode,
      displayCustName(item.fdCustName),
      item.fdMarkingNo,
      item.fdJmlPack,
      item.fdTotalQty,
      item.fdM3List,
      item.fdM3,
      item.fdm3Komplain,
      item.fdJmlBerat,
      item.fdJmlBeratGudang,
      item.fdJmlBeratSJ,
      item.fdJmlBeratKomplain,
      item.fdListCode,
      Number(item.fdListType) === 1 ? 'UDARA' : 'LAUT',
      item.fdComodity,
      item.fdKeterangan || item.fdDesc,
    ])
  })

  // Baris Total Rekap
  sheet4Aoa.push([
    'TOTAL',
    '',
    '',
    '',
    summary.totalPackPL,
    summary.totalPackGdg,
    summary.totalM3PL,
    summary.totalM3Gdg,
    summary.totalM3Komplain,
    summary.totalBeratList,
    summary.totalBeratGdg,
    summary.totalBeratSJ,
    summary.totalBeratKomplain,
    '',
    '',
    '',
    '',
  ])

  const ws4 = XLSX.utils.aoa_to_sheet(sheet4Aoa)
  ws4['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 30 },
    { wch: 22 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 8 },
    { wch: 25 },
    { wch: 25 },
  ]
  XLSX.utils.book_append_sheet(wb, ws4, 'REKAP')

  // Trigger Download
  const filename = `Laporan_Ukuran_Marking_${markingCode.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`
  XLSX.writeFile(wb, filename)
}
