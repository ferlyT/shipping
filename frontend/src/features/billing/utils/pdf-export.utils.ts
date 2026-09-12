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
      // Pastikan semua child table juga tidak clip
      const allCells = clonedEl.querySelectorAll('td, th, div')
      allCells.forEach((cell) => {
        const el = cell as HTMLElement
        if (el.style.overflow === 'hidden') {
          el.style.overflow = 'visible'
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
