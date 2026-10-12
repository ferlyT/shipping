import { prisma } from '../../config/database'
import { logger } from '../../config/logger'
import ExcelJS from 'exceljs'

export interface OmsetVolumeItem {
  fdCustCode: string
  fdCustName: string
  fdSalesNM: string
  metrics: Record<string, {
    m3: number
    kgLaut: number
    kgUdara: number
    totalFcl: number
    fdJumlah: number
  }>
  totalM3: number
  totalKgLaut: number
  totalKgUdara: number
  totalFcl: number
  totalOmset: number
}

export interface OmsetVolumeReportResponse {
  years: number[]
  data: OmsetVolumeItem[]
  summary: {
    totalCustomers: number
    metricsPerYear: Record<string, {
      m3: number
      kgLaut: number
      kgUdara: number
      totalFcl: number
      fdJumlah: number
    }>
    grandTotalM3: number
    grandTotalKgLaut: number
    grandTotalKgUdara: number
    grandTotalFcl: number
    grandTotalOmset: number
  }
}

export async function getOmsetVolumeReport(params: {
  yearFrom?: number
  yearTo?: number
  search?: string
  sales?: string
}): Promise<OmsetVolumeReportResponse> {
  const currentYear = new Date().getFullYear()
  const yearFrom = params.yearFrom ? Number(params.yearFrom) : currentYear - 1
  const yearTo = params.yearTo ? Number(params.yearTo) : currentYear

  const search = params.search?.trim() || ''
  const sales = params.sales?.trim() || ''

  try {
    // 1. Ambil daftar tahun unik yang tersedia
    const availableYearsResult: Array<{ fdTahun: number }> = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT m.fdTahun
      FROM qr_data_master_billing m
      WHERE m.fdTahun IS NOT NULL AND m.fdTahun >= 2020
      ORDER BY m.fdTahun DESC
    `)
    const availableYears = availableYearsResult.map(r => Number(r.fdTahun)).filter(Boolean)

    // Tentukan range tahun yang diminta (terurut naik)
    const selectedYears = availableYears
      .filter(y => y >= Math.min(yearFrom, yearTo) && y <= Math.max(yearFrom, yearTo))
      .sort((a, b) => a - b)

    if (selectedYears.length === 0) {
      selectedYears.push(currentYear)
    }

    // 2. Query agregat data per customer, sales, dan tahun
    // Single Source of Truth nama customer: tbCustomers.fdCustName
    let filterClause = `WHERE m.fdTahun >= ${Math.min(...selectedYears)} AND m.fdTahun <= ${Math.max(...selectedYears)}`
    if (sales) {
      const cleanSales = sales.replace(/'/g, "''")
      filterClause += ` AND LTRIM(RTRIM(m.fdSalesNM)) = '${cleanSales}'`
    }
    if (search) {
      const cleanSearch = search.replace(/'/g, "''")
      filterClause += ` AND (
        LTRIM(RTRIM(m.fdCustCode)) LIKE '%${cleanSearch}%'
        OR LTRIM(RTRIM(c.fdCustName)) LIKE '%${cleanSearch}%'
        OR LTRIM(RTRIM(m.fdCustName)) LIKE '%${cleanSearch}%'
        OR LTRIM(RTRIM(m.fdSalesNM)) LIKE '%${cleanSearch}%'
      )`
    }

    const query = `
      SELECT 
        LTRIM(RTRIM(m.fdCustCode)) AS fdCustCode,
        LTRIM(RTRIM(ISNULL(c.fdCustName, m.fdCustName))) AS fdCustName,
        LTRIM(RTRIM(ISNULL(m.fdSalesNM, '-'))) AS fdSalesNM,
        m.fdTahun,
        CAST(SUM(ISNULL(m.m3, 0)) AS DECIMAL(18,2)) AS m3,
        CAST(SUM(ISNULL(m.KG_LAUT, 0)) AS DECIMAL(18,2)) AS KG_LAUT,
        CAST(SUM(ISNULL(m.KG_UDARA, 0)) AS DECIMAL(18,2)) AS KG_UDARA,
        CAST(SUM(ISNULL(m.TotalFcl, 0)) AS DECIMAL(18,2)) AS TotalFcl,
        CAST(SUM(ISNULL(m.fdJumlah, 0)) AS DECIMAL(18,2)) AS fdJumlah
      FROM qr_data_master_billing m
      LEFT JOIN tbCustomers c ON m.fdCustCode = c.fdCustCode
      LEFT JOIN QR_TB_TOTALBILL_PER_CUSTOMER t ON m.fdCustCode = t.fdCustCode AND m.fdTahun = t.fdTahun
      ${filterClause}
      GROUP BY m.fdCustCode, c.fdCustName, m.fdCustName, m.fdSalesNM, m.fdTahun
      ORDER BY fdCustName ASC, m.fdTahun ASC
    `

    const rawRows: Array<{
      fdCustCode: string
      fdCustName: string
      fdSalesNM: string
      fdTahun: number
      m3: any
      KG_LAUT: any
      KG_UDARA: any
      TotalFcl: any
      fdJumlah: any
    }> = await prisma.$queryRawUnsafe(query)

    // 3. Transformasi Pivot di level memori (TypeScript)
    const customerMap = new Map<string, OmsetVolumeItem>()

    for (const row of rawRows) {
      const custKey = `${row.fdCustCode || ''}|${row.fdCustName || ''}`
      const tahunStr = String(row.fdTahun)
      const m3Val = Number(row.m3) || 0
      const kgLautVal = Number(row.KG_LAUT) || 0
      const kgUdaraVal = Number(row.KG_UDARA) || 0
      const fclVal = Number(row.TotalFcl) || 0
      const omsetVal = Number(row.fdJumlah) || 0

      if (!customerMap.has(custKey)) {
        customerMap.set(custKey, {
          fdCustCode: row.fdCustCode || '-',
          fdCustName: row.fdCustName || 'Tanpa Nama',
          fdSalesNM: row.fdSalesNM && row.fdSalesNM !== '' ? row.fdSalesNM : '-',
          metrics: {},
          totalM3: 0,
          totalKgLaut: 0,
          totalKgUdara: 0,
          totalFcl: 0,
          totalOmset: 0,
        })
      }

      const item = customerMap.get(custKey)!
      item.metrics[tahunStr] = {
        m3: m3Val,
        kgLaut: kgLautVal,
        kgUdara: kgUdaraVal,
        totalFcl: fclVal,
        fdJumlah: omsetVal,
      }

      item.totalM3 += m3Val
      item.totalKgLaut += kgLautVal
      item.totalKgUdara += kgUdaraVal
      item.totalFcl += fclVal
      item.totalOmset += omsetVal
    }

    const data = Array.from(customerMap.values())

    // 4. Hitung Ringkasan / Summary Konsolidasi
    const metricsPerYear: Record<string, {
      m3: number
      kgLaut: number
      kgUdara: number
      totalFcl: number
      fdJumlah: number
    }> = {}

    for (const y of selectedYears) {
      metricsPerYear[String(y)] = {
        m3: 0,
        kgLaut: 0,
        kgUdara: 0,
        totalFcl: 0,
        fdJumlah: 0,
      }
    }

    let grandTotalM3 = 0
    let grandTotalKgLaut = 0
    let grandTotalKgUdara = 0
    let grandTotalFcl = 0
    let grandTotalOmset = 0

    for (const item of data) {
      for (const y of selectedYears) {
        const yStr = String(y)
        const metric = item.metrics[yStr]
        if (metric && metricsPerYear[yStr]) {
          metricsPerYear[yStr]!.m3 += metric.m3
          metricsPerYear[yStr]!.kgLaut += metric.kgLaut
          metricsPerYear[yStr]!.kgUdara += metric.kgUdara
          metricsPerYear[yStr]!.totalFcl += metric.totalFcl
          metricsPerYear[yStr]!.fdJumlah += metric.fdJumlah
        }
      }
      grandTotalM3 += item.totalM3
      grandTotalKgLaut += item.totalKgLaut
      grandTotalKgUdara += item.totalKgUdara
      grandTotalFcl += item.totalFcl
      grandTotalOmset += item.totalOmset
    }

    return {
      years: selectedYears,
      data,
      summary: {
        totalCustomers: data.length,
        metricsPerYear,
        grandTotalM3,
        grandTotalKgLaut,
        grandTotalKgUdara,
        grandTotalFcl,
        grandTotalOmset,
      },
    }
  } catch (error: any) {
    logger.error('Error saat mengambil data report omset & volume customer:', { error: error.message })
    throw error
  }
}

// Karakter kontrol yang tidak valid untuk XML/Excel
const ILLEGAL_CHARS_RE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x84\x86-\x9f]/g

function sanitizeText(val: any): string {
  if (typeof val === 'string') {
    return val.replace(ILLEGAL_CHARS_RE, '')
  }
  return val ? String(val) : ''
}

type MetricKey = 'fdJumlah' | 'm3' | 'KG_UDARA' | 'TotalFcl'

interface TabConfig {
  metric: MetricKey
  sheetName: string
}

const TABS: TabConfig[] = [
  { metric: 'fdJumlah', sheetName: 'Total' },
  { metric: 'm3', sheetName: 'M3' },
  { metric: 'KG_UDARA', sheetName: 'KG Udara' },
  { metric: 'TotalFcl', sheetName: 'CTR' },
]

/**
 * Generate Excel Pivot Report dengan 4 sheet (Total, M3, KG Udara, CTR)
 * Format identik dengan skrip Python:
 * - 4 sheet terpisah sesuai metrik
 * - Kolom tahun bersih (2018, 2019, dst.) terurut ascending
 * - Header navy #1F4E78, font putih bold Arial, alignment center
 * - Kolom fdCustName & fdSalesNM lebar 28, kolom tahun lebar 14 dengan format '#,##0'
 * - Freeze panes C2
 * - Single source of truth nama customer dari tbCustomers.fdCustName
 */
export async function generateOmsetVolumePivotExcel(yearFrom = 2018): Promise<Buffer> {
  logger.info(`Memulai pembuatan Excel Pivot Report multi-sheet dari tahun ${yearFrom}`)

  const startYear = Math.max(2010, Number(yearFrom) || 2018)

  // Query agregasi seluruh customer dan tahun >= yearFrom
  const rawRows: Array<{
    fdCustName: string
    fdSalesNM: string
    fdTahun: number
    fdJumlah: any
    m3: any
    KG_UDARA: any
    TotalFcl: any
  }> = await prisma.$queryRawUnsafe(`
    SELECT 
      LTRIM(RTRIM(ISNULL(c.fdCustName, m.fdCustName))) AS fdCustName,
      LTRIM(RTRIM(ISNULL(m.fdSalesNM, '-'))) AS fdSalesNM,
      m.fdTahun,
      CAST(SUM(ISNULL(m.fdJumlah, 0)) AS DECIMAL(18,2)) AS fdJumlah,
      CAST(SUM(ISNULL(m.m3, 0)) AS DECIMAL(18,2)) AS m3,
      CAST(SUM(ISNULL(m.KG_UDARA, 0)) AS DECIMAL(18,2)) AS KG_UDARA,
      CAST(SUM(ISNULL(m.TotalFcl, 0)) AS DECIMAL(18,2)) AS TotalFcl
    FROM qr_data_master_billing m
    LEFT JOIN tbCustomers c ON m.fdCustCode = c.fdCustCode
    LEFT JOIN QR_TB_TOTALBILL_PER_CUSTOMER t ON m.fdCustCode = t.fdCustCode AND m.fdTahun = t.fdTahun
    WHERE m.fdTahun >= ${startYear}
    GROUP BY c.fdCustName, m.fdCustName, m.fdSalesNM, m.fdTahun
    ORDER BY fdCustName ASC, fdSalesNM ASC, m.fdTahun ASC
  `)

  // 1. Dapatkan daftar tahun unik terurut ascending
  const yearSet = new Set<number>()
  for (const r of rawRows) {
    if (r.fdTahun) yearSet.add(Number(r.fdTahun))
  }
  const years = Array.from(yearSet).sort((a, b) => a - b)
  if (years.length === 0) {
    years.push(new Date().getFullYear())
  }

  // 2. Kumpulkan customer dan map nilainya per metrik & tahun
  const customerMap = new Map<string, {
    custName: string
    salesName: string
    metrics: Record<MetricKey, Record<number, number>>
  }>()

  for (const r of rawRows) {
    const custName = sanitizeText(r.fdCustName) || '-'
    const salesName = sanitizeText(r.fdSalesNM) || '-'
    const key = `${custName}|${salesName}`

    if (!customerMap.has(key)) {
      customerMap.set(key, {
        custName,
        salesName,
        metrics: {
          fdJumlah: {},
          m3: {},
          KG_UDARA: {},
          TotalFcl: {},
        },
      })
    }

    const item = customerMap.get(key)!
    const y = Number(r.fdTahun)
    item.metrics.fdJumlah[y] = Number(r.fdJumlah) || 0
    item.metrics.m3[y] = Number(r.m3) || 0
    item.metrics.KG_UDARA[y] = Number(r.KG_UDARA) || 0
    item.metrics.TotalFcl[y] = Number(r.TotalFcl) || 0
  }

  const customerList = Array.from(customerMap.values()).sort((a, b) =>
    a.custName.localeCompare(b.custName) || a.salesName.localeCompare(b.salesName)
  )

  // 3. Bangun Workbook ExcelJS
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'M-Shipping ERP'
  workbook.created = new Date()

  for (const tab of TABS) {
    const ws = workbook.addWorksheet(tab.sheetName, {
      views: [{ state: 'frozen', xSplit: 2, ySplit: 1 }],
    })

    // Definisi kolom
    const columns = [
      { header: 'fdCustName', key: 'custName', width: 28 },
      { header: 'fdSalesNM', key: 'salesName', width: 28 },
      ...years.map((y) => ({
        header: String(y),
        key: `y_${y}`,
        width: 14,
      })),
    ]
    ws.columns = columns

    // Styling baris header (Row 1)
    const headerRow = ws.getRow(1)
    headerRow.height = 24
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E78' },
      }
      cell.font = {
        name: 'Arial',
        size: 10,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      }
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
      }
    })

    // Isi baris data
    for (const cust of customerList) {
      const rowData: Record<string, any> = {
        custName: cust.custName,
        salesName: cust.salesName,
      }

      for (const y of years) {
        const val = cust.metrics[tab.metric][y]
        rowData[`y_${y}`] = val !== undefined ? val : null
      }

      const row = ws.addRow(rowData)

      // Format sel angka
      for (let i = 0; i < years.length; i++) {
        const cell = row.getCell(3 + i)
        if (cell.value !== null && cell.value !== undefined) {
          cell.numFmt = '#,##0'
        }
      }
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer()
  logger.info(`Excel Pivot Report berhasil dibuat (${arrayBuffer.byteLength} bytes)`)
  return Buffer.from(arrayBuffer)
}

