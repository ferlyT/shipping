import { prisma } from '../../config/database'
import { logger } from '../../config/logger'

export const DEFAULT_BILL_REPORT_CONFIG = {
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
  enableWatermarkMatrix: false,
  watermarkText: 'COPY',
  watermarkOpacityPct: 5,
  watermarkFontSizePt: 59,

  labelTerbilang: 'Terbilang',
  terbilangSuffix: 'Rp.',

  showPrintedByPdf: true,
  showPrintedByMatrix: false,
  printedByPrefix: 'Printed by :',
}

const TEMPLATE_ID = 'BILL_INVOICE'
const TEMPLATE_NAME = 'Template Tagihan Invoice (A5 Continuous Form)'

export async function getReportTemplate(id: string = TEMPLATE_ID) {
  try {
    const record = await prisma.tbReportTemplates.findUnique({
      where: { id },
    })

    if (!record) {
      // Buat template default di database jika belum ada
      const initialConfigStr = JSON.stringify(DEFAULT_BILL_REPORT_CONFIG)
      const created = await prisma.tbReportTemplates.create({
        data: {
          id,
          name: TEMPLATE_NAME,
          config: initialConfigStr,
          updatedBy: 'system',
        },
      })
      return {
        id: created.id,
        name: created.name,
        config: DEFAULT_BILL_REPORT_CONFIG,
        updatedBy: created.updatedBy,
        updatedAt: created.updatedAt,
      }
    }

    let parsedConfig = DEFAULT_BILL_REPORT_CONFIG
    try {
      parsedConfig = {
        ...DEFAULT_BILL_REPORT_CONFIG,
        ...JSON.parse(record.config),
      }
    } catch (parseErr) {
      logger.error('Failed to parse report template config JSON from DB', parseErr)
    }

    return {
      id: record.id,
      name: record.name,
      config: parsedConfig,
      updatedBy: record.updatedBy,
      updatedAt: record.updatedAt,
    }
  } catch (error) {
    logger.error('Error fetching report template from database', error)
    // Fallback safe
    return {
      id,
      name: TEMPLATE_NAME,
      config: DEFAULT_BILL_REPORT_CONFIG,
      updatedBy: 'fallback',
      updatedAt: new Date(),
    }
  }
}

export async function saveReportTemplate(
  config: Record<string, any>,
  username: string = 'admin',
  id: string = TEMPLATE_ID
) {
  if (!config || typeof config !== 'object') {
    throw new Error('Konfigurasi template tidak valid')
  }

  // Merge dengan default untuk memastikan key penting selalu ada
  const mergedConfig = {
    ...DEFAULT_BILL_REPORT_CONFIG,
    ...config,
  }

  const configStr = JSON.stringify(mergedConfig)

  const updated = await prisma.tbReportTemplates.upsert({
    where: { id },
    create: {
      id,
      name: TEMPLATE_NAME,
      config: configStr,
      updatedBy: username,
    },
    update: {
      config: configStr,
      updatedBy: username,
      updatedAt: new Date(),
    },
  })

  logger.info(`Report template '${id}' updated by ${username}`)

  return {
    id: updated.id,
    name: updated.name,
    config: mergedConfig,
    updatedBy: updated.updatedBy,
    updatedAt: updated.updatedAt,
  }
}
