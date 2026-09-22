import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export interface ExportBillPdfOptions {
  fileName?: string
  widthMm?: number
  heightMm?: number
  scale?: number
}

/**
 * Mengubah elemen invoice HTML menjadi file PDF berkualitas tinggi dan langsung men-trigger unduhan di browser.
 */
export async function exportBillToPdf(
  element: HTMLElement,
  options: ExportBillPdfOptions = {}
): Promise<void> {
  const {
    fileName = 'BILL-INVOICE.pdf',
    widthMm = 210,
    heightMm = 148,
    scale = 2.5,
  } = options

  // Capture elemen dengan html2canvas
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    scrollX: 0,
    scrollY: 0,
    width: element.offsetWidth,
    height: element.offsetHeight,
    windowWidth: element.offsetWidth,
    windowHeight: element.offsetHeight,
    onclone: (_doc: Document, clonedEl: HTMLElement) => {
      // Pastikan wrapper clone tidak clip konten
      clonedEl.style.overflow = 'visible'
      // Pastikan semua child element (td, th, div, span, dll) juga tidak clip teks
      const allElements = clonedEl.querySelectorAll('*')
      allElements.forEach((node) => {
        const el = node as HTMLElement
        if (el.style) {
          if (el.style.overflow === 'hidden') {
            el.style.overflow = 'visible'
          }
          if (el.style.overflowY === 'hidden') {
            el.style.overflowY = 'visible'
          }
          if (el.style.overflowX === 'hidden') {
            el.style.overflowX = 'visible'
          }
        }
      })
    },
  })

  const imgData = canvas.toDataURL('image/jpeg', 0.95)
  const orientation = widthMm >= heightMm ? 'landscape' : 'portrait'

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [widthMm, heightMm],
    compress: true,
  })

  pdf.addImage(imgData, 'JPEG', 0, 0, widthMm, heightMm)
  
  const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`
  pdf.save(cleanFileName)
}
