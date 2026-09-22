import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { terbilang } from '@/lib/terbilang'
import { cleanFoxProString, displayCustName } from '@/lib/utils'

export interface BillReportConfig {
  paperWidthMm: number
  paperHeightMm: number
  orientation?: 'landscape' | 'portrait'
  marginTopMm: number
  marginBottomMm: number
  marginLeftMm: number
  marginRightMm: number
  pdfFontFamily: string
  matrixFontFamily: string
  baseFontSizePt: number
  tableFontSizePt: number
  headerLeftWidthPct: number
  headerRightWidthPct: number
  labelTo: string
  labelSales: string
  labelCollector: string
  labelBillNo: string
  labelDate: string
  labelMarking: string
  showSalesCollector: boolean
  showMarkingNo: boolean
  colQtyWidthPct: number
  colDescWidthPct: number
  colPriceWidthPct: number
  colAmountWidthPct: number
  labelQtyCol: string
  labelDescCol: string
  labelPriceCol: string
  labelAmountCol: string
  currencyPrefix: string
  totalCurrencyPrefix: string
  enableWatermarkPdf: boolean
  watermarkText: string
  labelTerbilang: string
  terbilangSuffix: string
  showPrintedByPdf: boolean
  printedByPrefix: string
}

export const DEFAULT_BILL_REPORT_CONFIG: BillReportConfig = {
  paperWidthMm: 210,
  paperHeightMm: 148,
  orientation: 'landscape',
  marginTopMm: 11,
  marginBottomMm: 3.5,
  marginLeftMm: 2,
  marginRightMm: 2,
  pdfFontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
  matrixFontFamily: "'Courier New', Courier, monospace",
  baseFontSizePt: 9,
  tableFontSizePt: 10,
  headerLeftWidthPct: 62.4,
  headerRightWidthPct: 37.6,
  labelTo: 'To :',
  labelSales: 'SALES :',
  labelCollector: 'COLLECTOR :',
  labelBillNo: 'BILL NO',
  labelDate: 'DATE',
  labelMarking: 'MARKING',
  showSalesCollector: true,
  showMarkingNo: true,
  colQtyWidthPct: 17.0,
  colDescWidthPct: 45.4,
  colPriceWidthPct: 17.2,
  colAmountWidthPct: 20.4,
  labelQtyCol: 'QTY',
  labelDescCol: 'DESCRIPTION',
  labelPriceCol: 'UNIT PRICE',
  labelAmountCol: 'AMOUNT',
  currencyPrefix: 'RP.',
  totalCurrencyPrefix: 'Rp.',
  enableWatermarkPdf: true,
  watermarkText: 'COPY',
  labelTerbilang: 'Terbilang',
  terbilangSuffix: 'Rp.',
  showPrintedByPdf: true,
  printedByPrefix: 'Printed by :',
}

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

function escapeHtml(str: string | null | undefined): string {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function getBillPdfFileName(data: any): string {
  const custName = displayCustName(
    data?.customer?.fdCustName || data?.fdCustName || data?.fdCustCode,
    'Customer'
  ).trim()
  const marking = (data?.fdMarkingCode || '').trim()
  const invNo = (data?.fdInvNo || '').trim()

  const sanitize = (s: string) => s.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, ' ').trim()

  const parts = ['BILL', sanitize(custName)]
  if (marking) parts.push(sanitize(marking))
  if (invNo) parts.push(sanitize(invNo))

  return parts.filter(Boolean).join('-')
}

/**
 * Generate full HTML matching 1:1 with web PrintPage.tsx
 */
export function generateBillingInvoiceHtml(
  data: any,
  user: any,
  customConfig?: Partial<BillReportConfig>
): string {
  const config = { ...DEFAULT_BILL_REPORT_CONFIG, ...customConfig }
  const details = [...(data?.details || [])].sort((a: any, b: any) =>
    String(a.fdID || '').localeCompare(String(b.fdID || ''))
  )
  const total = data?.fdJumlah1 ?? details.reduce((s, d) => s + Number(d.fdTotal || 0), 0)

  // Header info
  const rawBillTo = cleanFoxProString(
    data?.customer?.fdBillTo || data?.customer?.fdCustName || data?.fdBillTo || data?.fdCustName || ''
  ).trim()

  const displayTo = (data?.fdCustCode
    ? rawBillTo.replace(new RegExp(`^${data.fdCustCode}\\s*-\\s*`, 'i'), '')
    : rawBillTo
  ).replace(/^[A-Za-z0-9]+\s*-\\s*/, '') || rawBillTo || (data?.fdCustCode || '').trim()

  const salesName = (
    data?.customer?.fdSalesCode ||
    data?.customer?.fdSalesNM ||
    data?.employee?.fdEmpName ||
    data?.fdSalesNM ||
    ''
  ).trim()

  const custEmpName = (data?.customer?.fdEmpName || '').trim()
  const collectorName = (
    data?.customer?.fdCollector ||
    (custEmpName ? custEmpName.slice(0, 2).toUpperCase() : '')
  ).trim()

  const markingCode = (data?.fdMarkingCode || '').trim()
  const markingNo = (data?.fdMarkingNo || '').trim()
  const invDate = formatBillDate(data?.fdInvDate)
  const totalTerbilang = terbilang(total)
  const printedBy = (user?.fullName || user?.username || user?.fdEmpName || 'Mobile App').trim()

  // Generate table rows HTML
  const rowsHtml = details
    .map((row: any) => {
      const qty = Number(row.fdQty || 0)
      const unitPrice = Number(row.fdItemPrice || 0)
      const amount = Number(row.fdTotal || qty * unitPrice)
      const unit = (row.fdListCode || '').trim().toUpperCase()
      const curr = (row.fdCurr || '').trim().toUpperCase()
      const comodity = cleanFoxProString(row.fdComodity).trim()

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

      let desc = cleanFoxProString(row.fdItemName).trim()
      if (comodity && !desc.toLowerCase().includes(comodity.toLowerCase())) {
        desc += ` - ${comodity}`
      }
      desc = desc.toUpperCase()

      const maxDescLength = Math.max(38, Math.round((config.colDescWidthPct || 45.4) * 1.05))
      if (desc.length > maxDescLength) {
        desc = desc.slice(0, maxDescLength - 3).trim() + '...'
      }

      return `
        <tr>
          <td class="cell-qty">
            <div class="split-qty">
              <span class="qty-val">${escapeHtml(qtyNumStr)}</span>
              <span class="qty-unit">${escapeHtml(unitStr)}</span>
            </div>
          </td>
          <td class="cell-desc">
            <div class="split-desc">
              <span class="desc-text">${escapeHtml(desc)}</span>
            </div>
          </td>
          <td>
            ${unitPrice > 0 ? `
              <div class="split-currency">
                <span class="currency-lbl">${escapeHtml(config.currencyPrefix)}</span>
                <span class="price-val">${escapeHtml(fmtRp(unitPrice))}</span>
              </div>
            ` : ''}
          </td>
          <td>
            ${amount > 0 ? `
              <div class="split-currency">
                <span class="currency-lbl">${escapeHtml(config.currencyPrefix)}</span>
                <span class="amount-val">${escapeHtml(fmtRp(amount))}</span>
              </div>
            ` : ''}
          </td>
        </tr>
      `
    })
    .join('')

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(getBillPdfFileName(data))}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    
    html, body {
      background: #ffffff;
      font-family: ${config.pdfFontFamily};
      color: #000000;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      width: ${config.paperWidthMm}mm;
      height: ${config.paperHeightMm}mm;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }

    @page {
      size: ${config.paperWidthMm}mm ${config.paperHeightMm}mm;
      margin: 0;
    }

    .bill-page-wrapper {
      width: ${config.paperWidthMm}mm;
      height: ${config.paperHeightMm}mm;
      max-height: ${config.paperHeightMm}mm;
      padding: ${config.marginTopMm}mm ${config.marginRightMm}mm ${config.marginBottomMm}mm ${config.marginLeftMm}mm;
      box-sizing: border-box;
      position: relative;
      display: flex;
      flex-direction: column;
      font-family: ${config.pdfFontFamily};
      color: #000000;
      overflow: hidden;
      line-height: 1.3;
      background: #ffffff;
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
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
      font-size: 11.5pt;
      font-weight: normal;
      white-space: nowrap;
      line-height: 1.3;
    }
    .header-to-val {
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
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
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
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
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
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
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
      font-size: 9pt;
      line-height: 1;
      display: flex;
      align-items: center;
    }
    .info-sep {
      margin: 0 6px 0 2px;
      flex-shrink: 0;
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
      font-size: 9pt;
      line-height: 1;
      display: flex;
      align-items: center;
    }
    .info-val {
      flex: 1;
      overflow: visible;
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
      font-size: 9pt;
      line-height: 1;
      display: flex;
      align-items: center;
    }
    .info-val-billno {
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif !important;
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
      font-family: Tahoma, Verdana, sans-serif;
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
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
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
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
      font-weight: normal;
      font-size: 10pt;
      letter-spacing: 0.2px;
      background: transparent;
    }
    .bill-table thead th:last-child {
      border-right: none;
    }

    .bill-table tbody tr:not(.spacer-row):not(.footer-row) {
      height: 5.5mm;
      max-height: 5.8mm;
    }

    /* Cells */
    .bill-table td {
      border-right: 1px solid #000;
      padding: 1px 6px;
      vertical-align: middle;
      line-height: 1.25;
      font-size: 9pt;
      border-bottom: none;
    }
    .bill-table td:last-child {
      border-right: none;
    }

    /* QTY column */
    .split-qty {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      width: 100%;
      line-height: 1.25;
      padding-right: 4px;
    }
    .qty-val {
      flex: 1;
      text-align: right;
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
      font-size: 9pt;
      font-weight: normal;
      line-height: 1.25;
    }
    .qty-unit {
      width: 36px;
      text-align: left;
      margin-left: 4px;
      flex-shrink: 0;
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
      font-size: 9pt;
      font-weight: normal;
      line-height: 1.25;
    }

    .cell-desc {
      padding: 1.5px 6px 1.5px 8px !important;
      vertical-align: middle !important;
      overflow: visible !important;
      white-space: nowrap !important;
    }
    .split-desc {
      display: flex;
      align-items: center;
      width: 100%;
      line-height: 1.35;
      overflow: visible !important;
      white-space: nowrap !important;
    }
    .desc-text {
      white-space: nowrap !important;
      overflow: visible !important;
      width: 100%;
      display: block;
      text-transform: uppercase;
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
      font-size: 9pt;
      font-weight: normal;
      line-height: 1.35;
    }
    
    .split-currency {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      padding: 0 4px;
      line-height: 1.25;
      white-space: nowrap;
    }
    .currency-lbl {
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
      font-size: 9pt;
      font-weight: normal;
      line-height: 1.25;
    }
    .price-val,
    .amount-val {
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
      font-size: 9pt;
      font-weight: normal;
      text-align: right;
      line-height: 1.25;
      white-space: nowrap;
    }

    .spacer-row td {
      height: 100%;
      border-bottom: none;
    }

    /* Footer Row */
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
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
      font-weight: normal;
      font-size: 9pt;
      line-height: 1.35;
      flex-shrink: 0;
      white-space: nowrap;
    }
    .terbilang-val {
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
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
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
      font-size: 10.5pt;
      font-weight: normal;
      line-height: 1.2;
    }
    .total-val {
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
      font-size: 10.5pt;
      font-weight: normal;
      line-height: 1.2;
    }
  </style>
</head>
<body>
  <div class="bill-page-wrapper">

    <!-- 1. HEADER ROW (2 BOXES) -->
    <div class="bill-header-row">

      <!-- Left Box -->
      <div class="header-box-left">
        <div class="header-to-row">
          <span class="header-to-label">${escapeHtml(config.labelTo)}</span>
          <span class="header-to-val">${escapeHtml(displayTo)}</span>
        </div>
        ${config.showSalesCollector ? `
          <div class="header-sales-row">
            <div class="header-sales-cell">
              <span>${escapeHtml(config.labelSales)} ${escapeHtml(salesName || '-')}</span>
            </div>
            <div class="header-collector-cell">
              <span>${escapeHtml(config.labelCollector)} ${escapeHtml(collectorName)}</span>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Right Box -->
      <div class="header-box-right">
        <div class="header-info-line">
          <span class="info-lbl">${escapeHtml(config.labelBillNo)}</span>
          <span class="info-sep">:</span>
          <span class="info-val info-val-billno">${escapeHtml(data?.fdInvNo || '')}</span>
        </div>
        <div class="header-info-line">
          <span class="info-lbl">${escapeHtml(config.labelDate)}</span>
          <span class="info-sep">:</span>
          <span class="info-val">${escapeHtml(invDate)}</span>
        </div>
        <div class="header-info-line">
          <span class="info-lbl">${escapeHtml(config.labelMarking)}</span>
          <span class="info-sep">:</span>
          <div class="info-val info-val-marking">
            <div>${escapeHtml(markingCode)}</div>
            ${config.showMarkingNo && markingNo ? `
              <div style="margin-top: 2px;">${escapeHtml(markingNo)}</div>
            ` : ''}
          </div>
        </div>
      </div>

    </div>

    <!-- 2. MAIN TABLE -->
    <div class="bill-table-container">
      ${config.enableWatermarkPdf ? `
        <div class="copy-watermark">${escapeHtml(config.watermarkText)}</div>
      ` : ''}

      <table class="bill-table">
        <colgroup>
          <col style="width: ${config.colQtyWidthPct}%" />
          <col style="width: ${config.colDescWidthPct}%" />
          <col style="width: ${config.colPriceWidthPct}%" />
          <col style="width: ${config.colAmountWidthPct}%" />
        </colgroup>

        <thead>
          <tr>
            <th>${escapeHtml(config.labelQtyCol)}</th>
            <th>${escapeHtml(config.labelDescCol)}</th>
            <th>${escapeHtml(config.labelPriceCol)}</th>
            <th>${escapeHtml(config.labelAmountCol)}</th>
          </tr>
        </thead>

        <tbody>
          ${rowsHtml}
          <!-- Spacer row -->
          <tr class="spacer-row">
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
          </tr>
        </tbody>

        <tfoot>
          <tr class="footer-row">
            <td>&nbsp;</td>
            <td class="cell-terbilang">
              <div class="terbilang-container">
                <span class="terbilang-title">${escapeHtml(config.labelTerbilang)}</span>
                <div class="terbilang-val">${escapeHtml(totalTerbilang)}</div>
              </div>
            </td>
            <td></td>
            <td>
              <div style="padding: 0 4px;">
                <div class="amount-total-line"></div>
                <div class="amount-total-box">
                  <span class="total-currency-lbl">${escapeHtml(config.totalCurrencyPrefix)}</span>
                  <span class="total-val">${escapeHtml(fmtRp(total))}</span>
                </div>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- 3. PRINTED BY -->
    ${config.showPrintedByPdf ? `
      <div style="
        text-align: right;
        padding-right: 4px;
        margin-top: 1px;
        font-family: 'Arial Narrow', Arial, Helvetica, sans-serif;
        font-size: 5.5pt;
        font-weight: normal;
        font-style: normal;
        color: #000;
        white-space: nowrap;
        line-height: 1;
        flex-shrink: 0;
      ">
        ${escapeHtml(`${config.printedByPrefix} ${printedBy}`)}
      </div>
    ` : ''}

  </div>
</body>
</html>
  `.trim()
}

/**
 * Trigger native print dialog for the invoice
 */
export async function printInvoicePdf(data: any, user: any): Promise<void> {
  const html = generateBillingInvoiceHtml(data, user)
  await Print.printAsync({
    html,
    orientation: Print.Orientation.landscape,
  })
}

/**
 * Generate PDF file and trigger native sharing dialog
 */
export async function shareInvoicePdf(data: any, user: any): Promise<void> {
  const html = generateBillingInvoiceHtml(data, user)
  const fileName = getBillPdfFileName(data)
  const { uri } = await Print.printToFileAsync({
    html,
    width: 595,
    height: 420,
  })

  await Sharing.shareAsync(uri, {
    UTI: '.pdf',
    mimeType: 'application/pdf',
    dialogTitle: `Bagikan Tagihan: ${fileName}`,
  })
}
