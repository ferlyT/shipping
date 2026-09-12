import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { billingApi } from '../services/billing.service'
import { terbilang } from '@/lib/terbilang'
import { useAuthStore } from '@/stores/authStore'
import { useReportDesignerStore } from '../stores/reportDesignerStore'
import { ROUTES } from '@/lib/constants'
import { exportBillToPdf } from '../utils/pdf-export.utils'
import type { Billing } from '../types/billing.types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtRp(n: number | null | undefined): string {
  if (n == null) return ''
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function formatBillDate(d: string | Date | null | undefined): string {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`
}

function getBillPdfFileName(data: Billing): string {
  const custName = (data.customer?.fdCustName || data.fdCustCode || 'Customer').trim()
  const marking = (data.fdMarkingCode || '').trim()
  const invNo = (data.fdInvNo || '').trim()

  const sanitize = (s: string) => s.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, ' ').trim()

  const parts = ['BILL', sanitize(custName)]
  if (marking) parts.push(sanitize(marking))
  if (invNo) parts.push(sanitize(invNo))

  return parts.filter(Boolean).join('-')
}

// ─── PrintPage Component ────────────────────────────────────────────────────

export default function PrintPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { config, updateConfig, loadFromBackend } = useReportDesignerStore()
  const autoPrintDone = useRef(false)
  const billWrapperRef = useRef<HTMLDivElement>(null)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  // Muat konfigurasi desain terbaru dari database agar cetak selalu serentak & up-to-date
  useEffect(() => {
    loadFromBackend()
  }, [loadFromBackend])

  // Mode: 'pdf' (default, shows Printed By & watermark) vs 'matrix' (LX310 continuous form, monospace, hides Printed By & watermark)
  const initialMode = searchParams.get('mode') === 'matrix' ? 'matrix' : 'pdf'
  const [printMode, setPrintMode] = useState<'pdf' | 'matrix'>(initialMode)

  useEffect(() => {
    const modeParam = searchParams.get('mode')
    if (modeParam === 'matrix' || modeParam === 'pdf') {
      setPrintMode(modeParam)
    }
  }, [searchParams])

  const cleanId = (id || '').trim()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['billingPrint', cleanId],
    queryFn: async () => {
      if (!cleanId) return null
      const res = await billingApi.detail(cleanId)
      return res.data?.data as Billing
    },
    enabled: !!cleanId,
    staleTime: 60000,
  })

  // Format nama file PDF: BILL-[nama customer]-[marking code]-[no invoice]
  const pdfFileName = data ? getBillPdfFileName(data) : 'BILL'

  // Set document.title agar otomatis menjadi nama file saat browser "Save as PDF"
  useEffect(() => {
    if (!data) return
    const originalTitle = document.title
    document.title = pdfFileName

    return () => {
      document.title = originalTitle
    }
  }, [data, pdfFileName])

  const isDirect = searchParams.get('direct') === '1' || window.self !== window.top
  const isDownload = searchParams.get('download') === '1'

  // Instant PDF Download handler (jika diakses via iframe/query param ?download=1)
  useEffect(() => {
    if (!data || !isDownload || autoPrintDone.current) return
    autoPrintDone.current = true

    const timer = setTimeout(async () => {
      try {
        if (billWrapperRef.current) {
          await exportBillToPdf(billWrapperRef.current, {
            fileName: pdfFileName,
            widthMm: config.paperWidthMm || 210,
            heightMm: config.paperHeightMm || 148,
            scale: 2.5,
          })
        }
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(
            { type: 'BILLING_PDF_DOWNLOADED', invNo: data.fdInvNo, fileName: pdfFileName },
            '*'
          )
        }
      } catch (err) {
        console.error('Failed to download instant PDF:', err)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [data, isDownload, pdfFileName, config])

  // Auto-trigger print dialog ketika data pertama kali dimuat (hanya jika BUKAN instant download)
  useEffect(() => {
    if (data && !autoPrintDone.current && !isDownload) {
      autoPrintDone.current = true
      document.title = pdfFileName
      const delay = isDirect ? 200 : 500
      const timer = setTimeout(() => {
        window.focus()
        window.print()
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [data, pdfFileName, isDirect, isDownload])

  if (isLoading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
        <p style={{ fontSize: '14px', color: '#555' }}>Memuat data invoice tagihan...</p>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
        <p style={{ fontSize: '14px', color: '#e11d48' }}>Gagal memuat invoice. Silakan periksa nomor tagihan atau kembali ke daftar tagihan.</p>
        <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button
            onClick={() => navigate(ROUTES.BILLING_LIST)}
            style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '6px', background: '#2563eb', color: '#fff', border: 'none', fontWeight: 600 }}
          >
            ← Kembali ke Daftar Tagihan
          </button>
          <button
            onClick={() => {
              window.close()
              setTimeout(() => navigate(ROUTES.BILLING_LIST), 150)
            }}
            style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '6px', background: '#e2e8f0', border: '1px solid #cbd5e1' }}
          >
            Tutup
          </button>
        </div>
      </div>
    )
  }

  // ─── Data Extraction ───────────────────────────────────────────────────────

  const details = [...(data.details || [])].sort((a, b) => a.fdID.localeCompare(b.fdID))
  const total = data.fdJumlah1 ?? details.reduce((s, d) => s + Number(d.fdTotal || 0), 0)

  // Header info: nama customer diambil dari fdBillTo pada tbCustomers tanpa kode customer
  const rawBillTo = (data.customer?.fdBillTo || data.customer?.fdCustName || '').trim()
  const displayTo = (data.fdCustCode
    ? rawBillTo.replace(new RegExp(`^${data.fdCustCode}\\s*-\\s*`, 'i'), '')
    : rawBillTo
  ).replace(/^[A-Za-z0-9]+\s*-\\s*/, '') || rawBillTo || (data.fdCustCode || '').trim()

  const salesName = (data.customer?.fdSalesCode || data.customer?.fdSalesNM || data.employee?.fdEmpName || '').trim()
  const collectorName = (data.giveEmployee?.fdEmpName || '').trim()

  const markingCode = (data.fdMarkingCode || '').trim()
  const markingNo = (data.fdMarkingNo || '').trim()
  const invDate = formatBillDate(data.fdInvDate)

  // Terbilang text
  const totalTerbilang = terbilang(total)

  // Printed by: diambil dari nama login
  const printedBy = (user?.fullName || user?.username || user?.fdEmpName || 'Ferly').trim()

  const handlePrint = (mode: 'pdf' | 'matrix') => {
    setPrintMode(mode)
    document.title = pdfFileName
    setTimeout(() => {
      window.print()
    }, 150)
  }

  const handleDownloadPdf = async () => {
    if (!billWrapperRef.current || !data) return
    setIsExportingPdf(true)
    try {
      await exportBillToPdf(billWrapperRef.current, {
        fileName: pdfFileName,
        widthMm: config.paperWidthMm || 210,
        heightMm: config.paperHeightMm || 148,
        scale: 2.5,
      })
    } catch (err) {
      console.error('Failed to export PDF:', err)
    } finally {
      setIsExportingPdf(false)
    }
  }

  const handleClose = () => {
    window.close()
    setTimeout(() => {
      navigate(ROUTES.BILLING_DETAIL(data?.fdInvNo || cleanId || ''))
    }, 150)
  }

  const isWatermarkVisible = printMode === 'pdf' ? config.enableWatermarkPdf : config.enableWatermarkMatrix
  const isPrintedByVisible = printMode === 'pdf' ? config.showPrintedByPdf : config.showPrintedByMatrix

  return (
    <>
      {/* ── CSS Styles ────────────────────────────────────────────────────── */}
      <style>{`
        /* Reset */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
          background: #e2e8f0;
          font-family: ${printMode === 'matrix' ? config.matrixFontFamily : config.pdfFontFamily};
          color: #000;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* ── Page setup: A5 landscape untuk PDF resmi, continuous form untuk Matrix ── */
        @page {
          size: ${printMode === 'pdf' ? 'A5 landscape' : config.orientation || 'landscape'};
          margin: 0;
        }

        body, table, th, td, div, span, img {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        @media print {
          html, body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: ${config.paperWidthMm}mm !important;
            height: ${config.paperHeightMm}mm !important;
            overflow: hidden !important;
          }
          .no-print {
            display: none !important;
          }
          .bill-page-wrapper {
            margin: 0 !important;
            padding: ${config.marginTopMm}mm ${config.marginRightMm}mm ${config.marginBottomMm}mm ${config.marginLeftMm}mm !important;
            box-shadow: none !important;
            border: none !important;
            width: ${config.paperWidthMm}mm !important;
            height: ${config.paperHeightMm}mm !important;
            max-height: ${config.paperHeightMm}mm !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
        }

        /* Screen Preview Toolbar */
        .print-toolbar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: #0f172a;
          color: #fff;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .toolbar-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-action {
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.15s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .btn-primary { background: #2563eb; color: #fff; }
        .btn-primary:hover { background: #1d4ed8; }
        .btn-matrix { background: #059669; color: #fff; }
        .btn-matrix:hover { background: #047857; }
        .btn-secondary { background: #334155; color: #f8fafc; border: 1px solid #475569; }
        .btn-secondary:hover { background: #475569; }

        .mode-badge {
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 4px;
          background: #1e293b;
          border: 1px solid #334155;
          color: #94a3b8;
          cursor: pointer;
        }
        .mode-active {
          background: #3b82f6;
          color: #fff;
          border-color: #3b82f6;
          font-weight: 600;
        }

        /* ── Screen Preview Container ── */
        .preview-container {
          padding: 20px 0 40px;
          display: flex;
          justify-content: center;
        }

        .bill-page-wrapper {
          width: ${config.paperWidthMm}mm;
          height: ${config.paperHeightMm}mm;
          max-height: ${config.paperHeightMm}mm;
          background: #ffffff;
          padding: ${config.marginTopMm}mm ${config.marginRightMm}mm ${config.marginBottomMm}mm ${config.marginLeftMm}mm;
          box-sizing: border-box;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
          position: relative;
          display: flex;
          flex-direction: column;
          font-family: ${printMode === 'matrix' ? config.matrixFontFamily : config.pdfFontFamily};
          color: #000;
          overflow: hidden;
          line-height: 1.3;
        }

        .bill-page-wrapper,
        .bill-page-wrapper * {
          box-sizing: border-box;
        }

        /* ── Top Header Section (2 Boxes) ── */
        .bill-header-row {
          display: flex;
          gap: 4px;
          width: 100%;
          height: 38.4mm;
          min-height: 38.4mm;
        }

        /* Left Box: Customer & Sales/Collector */
        .header-box-left {
          flex: 0 0 ${config.headerLeftWidthPct}%;
          max-width: ${config.headerLeftWidthPct}%;
          border: 1px solid #000;
          height: 38.4mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .header-to-row {
          height: 9.5mm;
          min-height: 9.5mm;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 8px;
          line-height: 1.3;
        }
        .header-to-label {
          font-family: ${printMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif"};
          font-size: 11.5pt;
          font-weight: normal;
          white-space: nowrap;
          line-height: 1.3;
        }
        .header-to-val {
          font-family: ${printMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif"};
          font-size: 11pt;
          font-weight: normal;
          word-break: break-word;
          line-height: 1.3;
        }

        .header-sales-row {
          display: flex;
          height: 8.5mm;
          min-height: 8.5mm;
          border-top: 1px solid #000;
          font-size: 9pt;
          line-height: 1;
          align-items: center;
        }
        .header-sales-cell {
          flex: 1;
          border-right: 1px solid #000;
          padding: 0 8px;
          display: flex;
          align-items: center;
          height: 100%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: ${printMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif"};
          font-size: 9pt;
          line-height: 1;
        }
        .header-collector-cell {
          flex: 1.18;
          padding: 0 8px;
          display: flex;
          align-items: center;
          height: 100%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: ${printMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif"};
          font-size: 9pt;
          line-height: 1;
        }

        /* Right Box: BILL NO, DATE, MARKING */
        .header-box-right {
          flex: 1;
          border: 1px solid #000;
          height: 38.4mm;
          display: flex;
          flex-direction: column;
          font-size: 9pt;
          overflow: visible;
        }
        .header-info-line {
          display: flex;
          align-items: center;
          padding: 0 8px;
          border-bottom: 1px solid #000;
          overflow: visible;
          line-height: 1;
        }
        .header-info-line:first-child {
          height: 9.5mm;
          min-height: 9.5mm;
        }
        .header-info-line:nth-child(2) {
          height: 8.5mm;
          min-height: 8.5mm;
        }
        .header-info-line:last-child {
          border-bottom: none;
          flex: 1;
          align-items: flex-start;
          padding: 3px 8px 0 8px;
          overflow: visible;
        }
        .info-lbl {
          width: 72px;
          flex-shrink: 0;
          white-space: nowrap;
          font-family: ${printMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif"};
          font-size: 9pt;
          line-height: 1;
          display: flex;
          align-items: center;
        }
        .info-sep {
          margin: 0 6px 0 2px;
          flex-shrink: 0;
          font-family: ${printMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif"};
          font-size: 9pt;
          line-height: 1;
          display: flex;
          align-items: center;
        }
        .info-val {
          flex: 1;
          overflow: visible;
          font-family: ${printMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif"};
          font-size: 9pt;
          line-height: 1;
          display: flex;
          align-items: center;
        }
        .info-val-billno {
          font-family: ${printMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif"} !important;
          font-size: 11.5pt !important;
          font-weight: normal;
          line-height: 1 !important;
          letter-spacing: 0.2px;
          display: flex;
          align-items: center;
        }
        .info-val-marking {
          display: flex;
          flex-direction: column;
          align-items: flex-start !important;
          text-align: left !important;
          width: 100%;
          word-break: break-word;
          line-height: 1.3;
          overflow: visible;
          font-family: ${printMode === 'matrix' ? config.matrixFontFamily : "Tahoma, Verdana, sans-serif"};
        }
        .info-val-marking > div {
          text-align: left !important;
          width: 100%;
        }

        /* ── Main Table Section ── */
        .bill-table-container {
          margin-top: 7.1mm;
          flex: 1;
          border: 1px solid #000;
          position: relative;
          display: flex;
          flex-direction: column;
          background: #fff;
        }

        /* Watermark */
        .copy-watermark {
          position: absolute;
          top: 38%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-family: ${printMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif"};
          font-size: 58pt;
          font-weight: normal;
          color: #eeeeee;
          letter-spacing: 12px;
          pointer-events: none;
          user-select: none;
          z-index: 0;
        }

        .bill-table {
          width: 100%;
          height: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 10pt;
          position: relative;
          z-index: 1;
        }

        /* Headers */
        .bill-table thead th {
          height: 9mm;
          border-bottom: 1px solid #000;
          border-right: 1px solid #000;
          padding: 2px 6px;
          text-align: center;
          vertical-align: middle;
          font-family: ${printMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif"};
          font-weight: normal;
          font-size: 10pt;
          letter-spacing: 0.2px;
          background: transparent;
        }
        .bill-table thead th:last-child {
          border-right: none;
        }

        /* Cells */
        .bill-table td {
          border-right: 1px solid #000;
          padding: 3px 6px;
          vertical-align: middle;
          line-height: 1.2;
          font-size: 10pt;
          border-bottom: none;
        }
        .bill-table td:last-child {
          border-right: none;
        }

        /* QTY column: numbers aligned right, units aligned left on same vertical line */
        .split-qty {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          width: 100%;
          line-height: 1.35;
          padding-right: 6px;
        }
        .qty-val {
          flex: 1;
          text-align: right;
          font-family: ${printMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif"};
          font-size: 10pt;
          font-weight: normal;
          line-height: 1.35;
        }
        .qty-unit {
          width: 38px;
          text-align: left;
          margin-left: 5px;
          flex-shrink: 0;
          font-family: ${printMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif"};
          font-size: 10pt;
          font-weight: normal;
          line-height: 1.35;
        }

        .cell-desc {
          padding: 2px 6px 2px 8px !important;
          vertical-align: middle;
        }
        .split-desc {
          display: block;
          width: 100%;
          line-height: 1.25;
        }
        .desc-text {
          white-space: normal;
          word-break: break-word;
          overflow: visible;
          width: 100%;
          display: block;
          text-transform: uppercase;
          font-family: ${printMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif"};
          font-size: 10pt;
          font-weight: normal;
          line-height: 1.25;
        }
        
        .split-currency {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          padding: 0 4px;
          line-height: 1.35;
          white-space: nowrap;
        }
        .currency-lbl {
          font-family: ${printMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif"};
          font-size: 10pt;
          font-weight: normal;
          line-height: 1.35;
        }
        .price-val,
        .amount-val {
          font-family: ${printMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif"};
          font-size: 10pt;
          font-weight: normal;
          text-align: right;
          line-height: 1.35;
          white-space: nowrap;
        }

        /* Spacer row to fill vertical space */
        .spacer-row td {
          height: 100%;
          border-bottom: none;
        }

        /* Footer Row inside table */
        .footer-row td {
          vertical-align: bottom;
          padding: 2px 4px 10px 4px;
        }
        .cell-terbilang {
          text-align: left;
          padding-left: 8px !important;
          padding-right: 8px !important;
          vertical-align: bottom !important;
        }
        .terbilang-container {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          width: 100%;
        }
        .terbilang-title {
          font-family: ${printMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif"};
          font-weight: normal;
          font-size: 9pt;
          line-height: 1.35;
          flex-shrink: 0;
          white-space: nowrap;
        }
        .terbilang-val {
          font-family: ${printMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif"};
          font-weight: normal;
          font-size: 8.5pt;
          line-height: 1.35;
          word-break: break-word;
          flex: 1;
        }

        .amount-total-line {
          border-top: 1px solid #000;
          margin-bottom: 2px;
        }
        .amount-total-box {
          margin: 0;
          padding: 1px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10.5pt;
          font-weight: normal;
          line-height: 1.2;
          overflow: visible;
        }
        .total-currency-lbl {
          font-family: ${printMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif"};
          font-size: 10.5pt;
          font-weight: normal;
          line-height: 1.2;
        }
        .total-val {
          font-family: ${printMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif"};
          font-size: 10.5pt;
          font-weight: normal;
          line-height: 1.2;
        }

        /* ── Bottom Right: Printed By ── */
        .bill-table .row-printedby td {
          font-family: "Arial Narrow", Arial, Helvetica, sans-serif !important;
          font-size: 5.5pt !important;
          font-style: normal !important;
          font-weight: normal !important;
          color: #000 !important;
          text-align: right !important;
          white-space: nowrap !important;
          line-height: 1 !important;
          padding: 1px 4px 0 0 !important;
          border: none !important;
          border-right: none !important;
          height: auto !important;
          vertical-align: top !important;
        }

        /* Versi Dot Matrix (LX310) */
        .bill-page-wrapper.matrix-mode {
          font-family: ${config.matrixFontFamily} !important;
        }
        .bill-page-wrapper.matrix-mode thead th {
          font-family: ${config.matrixFontFamily} !important;
          font-weight: bold;
        }
      `}</style>

      {/* ── Screen Toolbar (No-Print) ────────────────────────────────────── */}
      {!isDirect && (
        <div className="print-toolbar no-print">
          <div className="toolbar-group">
            <Link
              to={ROUTES.BILLING_DETAIL(data.fdInvNo)}
              style={{ fontWeight: 'bold', fontSize: '13px', color: '#38bdf8', marginRight: '4px', textDecoration: 'none' }}
              className="hover:underline"
              title={`Buka detail tagihan ${data.fdInvNo}`}
            >
              Bill: {data.fdInvNo}
            </Link>
            <span
              style={{
                fontSize: '11px',
                background: '#1e293b',
                color: '#38bdf8',
                border: '1px solid #334155',
                borderRadius: '4px',
                padding: '2px 8px',
                fontFamily: 'monospace',
                maxWidth: '360px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={`Format nama file saat Save as PDF: ${pdfFileName}.pdf`}
            >
              📄 {pdfFileName}.pdf
            </span>
            <button
              className={`mode-badge ${printMode === 'pdf' ? 'mode-active' : ''}`}
              onClick={() => setPrintMode('pdf')}
              title="Tampilkan format PDF resmi"
            >
              📄 Versi PDF
            </button>
            <button
              className={`mode-badge ${printMode === 'matrix' ? 'mode-active' : ''}`}
              onClick={() => setPrintMode('matrix')}
              title="Tampilkan format Dot Matrix LX310 Continuous Form"
            >
              🖨️ Versi Dot Matrix (LX310)
            </button>
            <button
              className={`mode-badge ${(config.orientation || 'landscape') === 'landscape' ? 'mode-active' : ''}`}
              onClick={() => updateConfig({ orientation: (config.orientation || 'landscape') === 'landscape' ? 'portrait' : 'landscape' })}
              title="Ubah orientasi cetak printer (Landscape / Portrait)"
            >
              📐 {(config.orientation || 'landscape') === 'landscape' ? 'Landscape' : 'Portrait'}
            </button>
          </div>

          <div className="toolbar-group">
            <Link
              to={ROUTES.BILLING_DETAIL(data.fdInvNo)}
              className="btn-action btn-secondary"
              title="Kembali ke detail tagihan"
            >
              ← Kembali
            </Link>
            {user?.role === 'admin' && (
              <a
                href={ROUTES.BILLING_REPORT_DESIGNER}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-action btn-secondary"
                title="Buka Report Designer di tab baru untuk edit format cetak ini (Hanya Admin)"
              >
                ⚙️ Edit Desain
              </a>
            )}
            <button
              className="btn-action btn-primary"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              title="Download file PDF resmi langsung ke komputer tanpa dialog print"
            >
              {isExportingPdf ? '⏳ Mengunduh...' : '📥 Download PDF Instan'}
            </button>
            <button
              className="btn-action btn-secondary"
              onClick={() => handlePrint('pdf')}
              title="Buka dialog cetak bawaan browser"
            >
              📄 Dialog Print
            </button>
            <button className="btn-action btn-matrix" onClick={() => handlePrint('matrix')}>
              🖨️ Cetak LX310
            </button>
            <button className="btn-action btn-secondary" onClick={handleClose} title="Tutup halaman print">
              ✕ Tutup
            </button>
          </div>
        </div>
      )}

      {/* ── Bill Continuous Form Container ────────────────────────────────── */}
      <div className="preview-container" style={isDirect ? { padding: 0 } : undefined}>
        <div ref={billWrapperRef} className={`bill-page-wrapper ${printMode === 'matrix' ? 'matrix-mode' : 'pdf-mode'}`}>

          {/* ══ 1. HEADER ROW (2 BOXES) ══ */}
          <div className="bill-header-row">

            {/* Left Box: Customer & Sales/Collector */}
            <div className="header-box-left">
              <div className="header-to-row">
                <span className="header-to-label">{config.labelTo}</span>
                <span className="header-to-val">{displayTo}</span>
              </div>
              {config.showSalesCollector && (
                <div className="header-sales-row">
                  <div className="header-sales-cell">
                    <span>{config.labelSales} {salesName || '-'}</span>
                  </div>
                  <div className="header-collector-cell">
                    <span>{config.labelCollector} {collectorName}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Box: BILL NO, DATE, MARKING */}
            <div className="header-box-right">
              <div className="header-info-line">
                <span className="info-lbl">{config.labelBillNo}</span>
                <span className="info-sep">:</span>
                <span className="info-val info-val-billno">{data.fdInvNo}</span>
              </div>
              <div className="header-info-line">
                <span className="info-lbl">{config.labelDate}</span>
                <span className="info-sep">:</span>
                <span className="info-val">{invDate}</span>
              </div>
              <div className="header-info-line">
                <span className="info-lbl">{config.labelMarking}</span>
                <span className="info-sep">:</span>
                <div className="info-val info-val-marking">
                  <div>{markingCode}</div>
                  {config.showMarkingNo && markingNo && (
                    <div style={{ marginTop: '2px' }}>
                      {markingNo}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* ══ 2. MAIN TABLE ══ */}
          <div className="bill-table-container">
            {/* Watermark "COPY" */}
            {isWatermarkVisible && (
              <div className="copy-watermark">{config.watermarkText}</div>
            )}

            <table className="bill-table">
              <colgroup>
                <col style={{ width: `${config.colQtyWidthPct}%` }} />
                <col style={{ width: `${config.colDescWidthPct}%` }} />
                <col style={{ width: `${config.colPriceWidthPct}%` }} />
                <col style={{ width: `${config.colAmountWidthPct}%` }} />
              </colgroup>

              <thead>
                <tr>
                  <th>{config.labelQtyCol}</th>
                  <th>{config.labelDescCol}</th>
                  <th>{config.labelPriceCol}</th>
                  <th>{config.labelAmountCol}</th>
                </tr>
              </thead>

              <tbody>
                {details.map((row) => {
                  const qty = Number(row.fdQty || 0)
                  const unitPrice = Number(row.fdItemPrice || 0)
                  const amount = Number(row.fdTotal || qty * unitPrice)
                  const unit = (row.fdListCode || '').trim().toUpperCase()
                  const curr = (row.fdCurr || '').trim().toUpperCase()
                  const comodity = (row.fdComodity || '').trim()

                  // Unit / Mata uang tampilan kolom QTY
                  const unitStr = unit || curr || ''
                  let qtyNumStr = ''
                  if (qty > 0) {
                    if (unitStr === 'M3') {
                      qtyNumStr = Number(qty).toLocaleString('en-US', {
                        minimumFractionDigits: 4,
                        maximumFractionDigits: 4,
                      })
                    } else {
                      qtyNumStr = Number(qty).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    }
                  }

                  // Description item (uppercase persis format dokumen resmi)
                  let desc = (row.fdItemName || '').trim()
                  if (comodity && !desc.toLowerCase().includes(comodity.toLowerCase())) {
                    desc += ` - ${comodity}`
                  }
                  desc = desc.toUpperCase()

                  return (
                    <tr key={row.fdID}>
                      <td className="cell-qty">
                        <div className="split-qty">
                          <span className="qty-val">{qtyNumStr}</span>
                          <span className="qty-unit">{unitStr}</span>
                        </div>
                      </td>
                      <td style={{
                        borderRight: '1px solid #000',
                        borderBottom: 'none',
                        borderTop: 'none',
                        borderLeft: 'none',
                        padding: '3px 6px 3px 8px',
                        verticalAlign: 'middle',
                        overflow: 'hidden',
                      }}>
                        <span style={{
                          display: 'block',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          textTransform: 'uppercase',
                          fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
                          fontSize: '9pt',
                          fontWeight: 'normal',
                          lineHeight: 1.2,
                        }}>{desc}</span>
                      </td>
                      <td>
                        {unitPrice > 0 ? (
                          <div className="split-currency">
                            <span className="currency-lbl">{config.currencyPrefix}</span>
                            <span className="price-val">{fmtRp(unitPrice)}</span>
                          </div>
                        ) : null}
                      </td>
                      <td>
                        {amount > 0 ? (
                          <div className="split-currency">
                            <span className="currency-lbl">{config.currencyPrefix}</span>
                            <span className="amount-val">{fmtRp(amount)}</span>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}

                {/* Spacer row untuk menjaga garis vertikal tabel turun hingga footer */}
                <tr className="spacer-row">
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
              </tbody>

              <tfoot>
                <tr className="footer-row">
                  <td>&nbsp;</td>
                  <td className="cell-terbilang">
                    <div className="terbilang-container">
                      <span className="terbilang-title">{config.labelTerbilang}</span>
                      <div className="terbilang-val">{totalTerbilang}</div>
                    </div>
                  </td>
                  <td></td>
                  <td>
                    <div style={{ padding: '0 4px' }}>
                      <div className="amount-total-line" />
                      <div className="amount-total-box">
                        <span className="total-currency-lbl">{config.totalCurrencyPrefix}</span>
                        <span className="total-val">{fmtRp(total)}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ══ 3. PRINTED BY ══ */}
          {isPrintedByVisible && (
            <div style={{
              textAlign: 'right',
              paddingRight: '4px',
              marginTop: '1px',
              fontFamily: '"Arial Narrow", Arial, Helvetica, sans-serif',
              fontSize: '5.5pt',
              fontWeight: 'normal',
              fontStyle: 'normal',
              color: '#000',
              whiteSpace: 'nowrap',
              lineHeight: 1,
              flexShrink: 0,
            }}>
              {`${config.printedByPrefix}${printedBy}`}
            </div>
          )}

        </div>
      </div>
    </>
  )
}
