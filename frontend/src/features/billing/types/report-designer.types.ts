// Types and Default Configuration for Bill Report Designer

export interface BillReportConfig {
  // ── Paper & Page Margins ──
  paperWidthMm: number        // default: 230
  paperHeightMm: number       // default: 156
  orientation?: 'landscape' | 'portrait' // default: "landscape"
  marginTopMm: number         // default: 8
  marginBottomMm: number      // default: 4
  marginLeftMm: number        // default: 10
  marginRightMm: number       // default: 10

  // ── Typography ──
  pdfFontFamily: string       // default: "Arial, 'Helvetica Neue', Helvetica, sans-serif"
  matrixFontFamily: string    // default: "'Courier New', Courier, monospace"
  baseFontSizePt: number      // default: 9
  tableFontSizePt: number     // default: 9

  // ── Header Box ──
  headerLeftWidthPct: number  // default: 62 (left box %)
  headerRightWidthPct: number // default: 38 (right box %)
  
  // Header Labels
  labelTo: string             // default: "To :"
  labelSales: string          // default: "SALES :"
  labelCollector: string      // default: "COLLECTOR :"
  labelBillNo: string         // default: "BILL NO"
  labelDate: string           // default: "DATE"
  labelMarking: string        // default: "MARKING"

  // Header Visibility
  showSalesCollector: boolean // default: true
  showMarkingNo: boolean      // default: true

  // ── Items Table ──
  colQtyWidthPct: number      // default: 16
  colDescWidthPct: number     // default: 46
  colPriceWidthPct: number    // default: 17
  colAmountWidthPct: number   // default: 21

  labelQtyCol: string         // default: "QTY"
  labelDescCol: string        // default: "DESCRIPTION"
  labelPriceCol: string       // default: "UNIT PRICE"
  labelAmountCol: string      // default: "AMOUNT"
  
  currencyPrefix: string      // default: "RP."
  totalCurrencyPrefix: string // default: "Rp."

  // ── Watermark ──
  enableWatermarkPdf: boolean // default: true
  enableWatermarkMatrix: boolean // default: false
  watermarkText: string       // default: "COPY"
  watermarkOpacityPct: number // default: 4 (0.04)
  watermarkFontSizePt: number // default: 74

  // ── Footer ──
  labelTerbilang: string      // default: "Terbilang"
  terbilangSuffix: string     // default: "Rp."
  
  // ── Printed By ──
  showPrintedByPdf: boolean   // default: true
  showPrintedByMatrix: boolean// default: false
  printedByPrefix: string     // default: "Printed by :"
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

  labelTo: "To :",
  labelSales: "SALES :",
  labelCollector: "COLLECTOR :",
  labelBillNo: "BILL NO",
  labelDate: "DATE",
  labelMarking: "MARKING",

  showSalesCollector: true,
  showMarkingNo: true,

  colQtyWidthPct: 17.0,
  colDescWidthPct: 45.4,
  colPriceWidthPct: 17.2,
  colAmountWidthPct: 20.4,

  labelQtyCol: "QTY",
  labelDescCol: "DESCRIPTION",
  labelPriceCol: "UNIT PRICE",
  labelAmountCol: "AMOUNT",

  currencyPrefix: "RP.",
  totalCurrencyPrefix: "Rp.",

  enableWatermarkPdf: true,
  enableWatermarkMatrix: false,
  watermarkText: "COPY",
  watermarkOpacityPct: 5,
  watermarkFontSizePt: 59,

  labelTerbilang: "Terbilang",
  terbilangSuffix: "Rp.",

  showPrintedByPdf: true,
  showPrintedByMatrix: false,
  printedByPrefix: "Printed by :",
}
