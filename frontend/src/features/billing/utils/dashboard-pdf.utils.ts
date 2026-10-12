import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export interface ExportDashboardPdfOptions {
  fileName?: string
  periodLabel?: string
  printedBy?: string
  activeTabLabel?: string
  selectedBranchLabel?: string
}

/**
 * Mengonversi seluruh elemen container Dashboard Billing menjadi dokumen PDF multi-halaman
 * berorientasi A4 Landscape beresolusi tinggi dengan tata letak laporan eksekutif resmi.
 *
 * Fitur Utama:
 * 1. Mendukung Multi-Sheet Rendering: Menangkap seluruh seksi dashboard (KPI, Matriks 3 Periode,
 *    Rincian Cabang, Tren Bulanan 12 Bulan YoY, Tren Harian, Kinerja Karyawan, dan SJ vs Bill)
 *    tanpa perlu berpindah tab.
 * 2. Lembar Mandiri Tanpa Terpotong (Zero Page-Cut): Setiap lembar dikonversi pas 1 halaman A4 Landscape
 *    sehingga tidak ada teks, baris tabel, atau grafik yang terbelah dua.
 * 3. Fallback Smart Boundary Slicing jika menangkap kontainer dinamis tunggal.
 */
export async function exportDashboardToPdf(
  element: HTMLElement,
  options: ExportDashboardPdfOptions = {}
): Promise<void> {
  const {
    fileName,
    periodLabel = 'Periode Aktif',
    printedBy = 'Finance PIC',
    activeTabLabel = 'Laporan Lengkap Konsolidasi',
    selectedBranchLabel = 'Semua Cabang',
  } = options

  const now = new Date()

  // Format A4 Landscape (297mm x 210mm)
  const pdfWidthMm = 297
  const pdfHeightMm = 210
  const marginMm = 6
  const printWidthMm = pdfWidthMm - marginMm * 2 // 285mm
  const printHeightMm = pdfHeightMm - marginMm * 2 // 198mm

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  // Cari apakah elemen memuat lembar terstruktur .pdf-page-sheet
  const pageSheets = Array.from(element.querySelectorAll<HTMLElement>('.pdf-page-sheet'))

  if (pageSheets.length > 0) {
    // ── Mode Multi-Sheet Terstruktur (Semua Data Dashboard Sekaligus) ──
    for (let i = 0; i < pageSheets.length; i++) {
      if (i > 0) {
        pdf.addPage('a4', 'landscape')
      }

      const sheet = pageSheets[i]

      // Berikan style sementara agar render sempurna
      const canvas = await html2canvas(sheet, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 1200,
        windowWidth: 1240,
        onclone: (clonedDoc, clonedEl) => {
          clonedDoc.documentElement.classList.remove('dark')
          clonedEl.classList.remove('dark')
          clonedEl.style.width = '1200px'
          clonedEl.style.maxWidth = '1200px'
          clonedEl.style.minWidth = '1200px'
          clonedEl.style.backgroundColor = '#ffffff'
          clonedEl.style.color = '#0f172a'
        },
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const mmPerPx = printWidthMm / canvas.width
      const renderHeightMm = Math.min(printHeightMm, canvas.height * mmPerPx)

      // Cetak lembar tepat di dalam batas margin A4 Landscape
      pdf.addImage(
        imgData,
        'JPEG',
        marginMm,
        marginMm,
        printWidthMm,
        renderHeightMm
      )
    }
  } else {
    // ── Mode Fallback: Smart Boundary Slicing untuk Elemen Tunggal ──
    const CAPTURE_WIDTH = 1200
    const atomicBlocks: { top: number; bottom: number }[] = []

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: CAPTURE_WIDTH,
      windowWidth: 1240,
      onclone: (clonedDoc: Document, clonedEl: HTMLElement) => {
        clonedDoc.documentElement.classList.remove('dark')
        clonedEl.classList.remove('dark')
        clonedEl.style.width = `${CAPTURE_WIDTH}px`
        clonedEl.style.backgroundColor = '#ffffff'
        clonedEl.style.color = '#0f172a'

        const containerRect = clonedEl.getBoundingClientRect()
        const candidateElements = clonedEl.querySelectorAll<HTMLElement>(
          '.dashboard-pdf-header, tr, .kpi-card-item, .comparison-summary-card, h2, h3, h4, tfoot, .matrix-and-audit-grid > div'
        )

        candidateElements.forEach((el) => {
          const rect = el.getBoundingClientRect()
          const top = rect.top - containerRect.top
          const bottom = rect.bottom - containerRect.top
          if (rect.height >= 8 && rect.height < 500) {
            atomicBlocks.push({ top, bottom })
          }
        })
        atomicBlocks.sort((a, b) => a.top - b.top)
      },
    })

    const headerHeightMm = 8
    const footerHeightMm = 8
    const pageContentHeightMm = printHeightMm - headerHeightMm - footerHeightMm
    const mmPerPx = printWidthMm / canvas.width
    const scaleFactor = canvas.width / CAPTURE_WIDTH
    const maxPageHeightCanvasPx = Math.round(pageContentHeightMm / mmPerPx)
    const minPageHeightCanvasPx = Math.round(maxPageHeightCanvasPx * 0.45)

    const pageSlices: { sourceY: number; sliceHeightPx: number }[] = []
    let currentY = 0

    while (currentY < canvas.height) {
      const remaining = canvas.height - currentY
      if (remaining <= maxPageHeightCanvasPx) {
        pageSlices.push({ sourceY: currentY, sliceHeightPx: remaining })
        break
      }

      let candidateCutCanvasY = currentY + maxPageHeightCanvasPx
      const candidateCutDomY = candidateCutCanvasY / scaleFactor

      const cutBlock = atomicBlocks.find(
        (b) => b.top + 4 < candidateCutDomY && b.bottom - 4 > candidateCutDomY
      )

      if (cutBlock) {
        const safeCutCanvasY = Math.floor(cutBlock.top * scaleFactor)
        if (safeCutCanvasY - currentY >= minPageHeightCanvasPx) {
          candidateCutCanvasY = safeCutCanvasY
        }
      }

      const sliceH = Math.max(1, candidateCutCanvasY - currentY)
      pageSlices.push({ sourceY: currentY, sliceHeightPx: sliceH })
      currentY = candidateCutCanvasY
    }

    const totalPages = Math.max(1, pageSlices.length)

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      if (pageIndex > 0) pdf.addPage('a4', 'landscape')
      const slice = pageSlices[pageIndex]

      const sliceCanvas = document.createElement('canvas')
      sliceCanvas.width = canvas.width
      sliceCanvas.height = slice.sliceHeightPx

      const sliceCtx = sliceCanvas.getContext('2d')
      if (sliceCtx) {
        sliceCtx.fillStyle = '#ffffff'
        sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)
        sliceCtx.drawImage(
          canvas,
          0,
          slice.sourceY,
          canvas.width,
          slice.sliceHeightPx,
          0,
          0,
          canvas.width,
          slice.sliceHeightPx
        )
      }

      const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 0.95)
      const renderHeightMm = slice.sliceHeightPx * mmPerPx

      pdf.setFontSize(8)
      pdf.setTextColor(100, 116, 139)
      pdf.setFont('helvetica', 'normal')
      pdf.text(
        `M-SHIPPING FINANCE REPORT — ${periodLabel} | ${activeTabLabel} | Cabang: ${selectedBranchLabel}`,
        marginMm,
        marginMm + 4
      )
      pdf.text(
        `Dicetak: ${printedBy}`,
        pdfWidthMm - marginMm,
        marginMm + 4,
        { align: 'right' }
      )

      pdf.addImage(
        sliceImgData,
        'JPEG',
        marginMm,
        marginMm + headerHeightMm,
        printWidthMm,
        renderHeightMm
      )
    }
  }

  // Nama file PDF
  const defaultFileName = `Laporan-Lengkap-Billing-Dashboard-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf`
  const finalFileName = (fileName || defaultFileName).endsWith('.pdf')
    ? (fileName || defaultFileName)
    : `${fileName || defaultFileName}.pdf`

  pdf.save(finalFileName)
}
