import { prisma } from '../../config/database'
import { logger } from '../../config/logger'

export interface CargoResiDetail {
  fdListCode: string
  fdTerima: string | null
  fdMarkingCode: string
  fdBranchCode: string
  fdTahun: number
  fdListType: number // 1: Udara, 2: Laut
  fdTypeComodity: number
  fdComodityName: string
  fdInvNo: string | null
  calculatedM3: number
  calculatedBeratUdara: number
  calculatedBeratLaut: number
  sourceM3: 'BILLING' | 'GUDANG' | 'PACKING_LIST' | 'ENTRY_LIST' | 'NONE'
}

export interface CargoCustomerSummary {
  fdCustCode: string
  fdCustName: string
  fdSalesNM: string
  totalResi: number
  totalM3: number
  totalBeratUdara: number
  totalBeratLaut: number
  resiDetails?: CargoResiDetail[]
}

export interface CargoVolumeFilterMeta {
  branches: Array<{ code: string; name: string }>
  commodities: Array<{ id: number; name: string; listType: number }>
  availableYears: number[]
}

export interface CargoVolumeReportResponse {
  meta: CargoVolumeFilterMeta
  years: number[]
  data: CargoCustomerSummary[]
  summary: {
    totalCustomers: number
    totalResi: number
    grandTotalM3: number
    grandTotalBeratUdara: number
    grandTotalBeratLaut: number
  }
}

export async function getCargoVolumeReport(params: {
  branch?: string
  yearFrom?: number
  yearTo?: number
  mode?: number
  typeComodity?: number
  sales?: string
  search?: string
}): Promise<CargoVolumeReportResponse> {
  const currentYear = new Date().getFullYear()
  const yearFrom = params.yearFrom ? Number(params.yearFrom) : currentYear
  const yearTo = params.yearTo ? Number(params.yearTo) : currentYear

  const minYear = Math.min(yearFrom, yearTo)
  const maxYear = Math.max(yearFrom, yearTo)

  const selectedBranch = params.branch?.trim() && params.branch.trim() !== 'ALL' ? params.branch.trim() : null
  const selectedMode = params.mode && Number(params.mode) > 0 ? Number(params.mode) : null // 1: Udara, 2: Laut
  const selectedComodity = params.typeComodity && Number(params.typeComodity) > 0 ? Number(params.typeComodity) : null
  const selectedSales = params.sales?.trim() && params.sales.trim() !== 'ALL' ? params.sales.trim() : null
  const search = params.search?.trim() || ''

  try {
    // 1. Ambil metadata master (Cabang, Komoditi, Available Years) secara paralel
    const [branchesRes, commoditiesRes, yearsRes] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ fdBranchCode: string; fdBranchName: string }>>(`
        SELECT RTRIM(fdBranchCode) AS fdBranchCode, RTRIM(fdBranchName) AS fdBranchName
        FROM tbCabang WITH (NOLOCK)
        WHERE fdActive = 1
        ORDER BY fdBranchName ASC
      `),
      prisma.$queryRawUnsafe<Array<{ fdTypeComodity: number; fdComodityName: string; fdListType: number }>>(`
        SELECT DISTINCT fdTypeComodity, RTRIM(fdComodityName) AS fdComodityName, fdListType
        FROM tbTypeComodity WITH (NOLOCK)
        WHERE fdTypeComodity IS NOT NULL AND fdComodityName IS NOT NULL
        ORDER BY fdListType ASC, fdComodityName ASC
      `),
      prisma.$queryRawUnsafe<Array<{ fdTahun: number }>>(`
        SELECT DISTINCT YEAR(fdLoadDate) AS fdTahun
        FROM tbMarking WITH (NOLOCK)
        WHERE fdLoadDate IS NOT NULL AND YEAR(fdLoadDate) >= 2020
        ORDER BY fdTahun DESC
      `),
    ])

    const branchesMap = new Map<string, string>()
    for (const b of branchesRes) {
      const rawCode = b.fdBranchCode?.trim() || ''
      if (!rawCode) continue
      const code = rawCode === '--' || rawCode === '-' ? 'SG' : rawCode
      const name = code === 'SG' ? 'SINGAPORE' : b.fdBranchName?.trim() || code
      if (!branchesMap.has(code)) {
        branchesMap.set(code, name)
      }
    }

    const branches = Array.from(branchesMap.entries()).map(([code, name]) => ({ code, name }))

    const commodities = commoditiesRes.map((c) => ({
      id: Number(c.fdTypeComodity),
      name: c.fdComodityName,
      listType: Number(c.fdListType),
    }))

    const availableYears = yearsRes.map((y) => Number(y.fdTahun)).filter(Boolean)
    if (!availableYears.includes(currentYear)) {
      availableYears.unshift(currentYear)
    }

    // 2. Susun Filter Clauses
    let filterClauses = `WHERE YEAR(COALESCE(m.fdLoadDate, el.fdListDate)) BETWEEN ${minYear} AND ${maxYear}`

    if (selectedBranch) {
      if (selectedBranch === 'SG' || selectedBranch === '--' || selectedBranch === '-') {
        filterClauses += ` AND (RTRIM(el.fdBranchCode) IN ('SG', '--', '-') OR RTRIM(m.fdBranchCode) IN ('SG', '--', '-'))`
      } else {
        const cleanBranch = selectedBranch.replace(/'/g, "''")
        filterClauses += ` AND (RTRIM(el.fdBranchCode) = '${cleanBranch}' OR RTRIM(m.fdBranchCode) = '${cleanBranch}')`
      }
    }

    if (selectedMode) {
      filterClauses += ` AND el.fdListType = ${selectedMode}`
    }

    if (selectedComodity) {
      filterClauses += ` AND el.fdTypeComodity = ${selectedComodity}`
    }

    if (selectedSales) {
      const cleanSales = selectedSales.replace(/'/g, "''")
      filterClauses += ` AND LTRIM(RTRIM(c.fdSalesNM)) = '${cleanSales}'`
    }

    if (search) {
      const cleanSearch = search.replace(/'/g, "''")
      filterClauses += ` AND (
        LTRIM(RTRIM(el.fdCustCode)) LIKE '%${cleanSearch}%'
        OR LTRIM(RTRIM(c.fdCustName)) LIKE '%${cleanSearch}%'
        OR LTRIM(RTRIM(c.fdSalesNM)) LIKE '%${cleanSearch}%'
        OR LTRIM(RTRIM(el.fdListCode)) LIKE '%${cleanSearch}%'
        OR LTRIM(RTRIM(el.fdTerima)) LIKE '%${cleanSearch}%'
        OR LTRIM(RTRIM(el.fdMarkingCode)) LIKE '%${cleanSearch}%'
      )`
    }

    // 3. Fast Temp Table Query dengan indeks
    const query = `
      -- 1) Salin candidate resi ke temporary table
      SELECT 
        LTRIM(RTRIM(el.fdListCode)) AS fdListCode,
        LTRIM(RTRIM(ISNULL(el.fdTerima, ''))) AS fdTerima,
        el.fdListType,
        ISNULL(el.fdTypeComodity, 0) AS fdTypeComodity,
        LTRIM(RTRIM(ISNULL(tc.fdComodityName, '-'))) AS fdComodityName,
        LTRIM(RTRIM(ISNULL(el.fdCustCode, ''))) AS fdCustCode,
        LTRIM(RTRIM(COALESCE(c.fdCustName, el.fdCustCode, 'Tanpa Nama'))) AS fdCustName,
        LTRIM(RTRIM(COALESCE(NULLIF(c.fdSalesNM, ''), '-'))) AS fdSalesNM,
        LTRIM(RTRIM(ISNULL(el.fdMarkingCode, ''))) AS fdMarkingCode,
        CASE 
          WHEN RTRIM(COALESCE(NULLIF(el.fdBranchCode, ''), NULLIF(m.fdBranchCode, ''))) IN ('--', 'SG', '-') THEN 'SG'
          ELSE LTRIM(RTRIM(COALESCE(NULLIF(el.fdBranchCode, ''), NULLIF(m.fdBranchCode, ''), 'OTHER')))
        END AS fdBranchCode,
        YEAR(COALESCE(m.fdLoadDate, el.fdListDate)) AS fdTahun,
        ISNULL(el.fdJmlBerat, 0) AS fdJmlBerat,
        ISNULL(el.fdM3, 0) AS elM3,
        LTRIM(RTRIM(COALESCE(b.fdInvNo, b2.fdInvNo, ''))) AS fdInvNo
      INTO #CandidateResi
      FROM tbEntryList el WITH (NOLOCK)
      LEFT JOIN tbMarking m WITH (NOLOCK) ON m.fdMarkingCode = el.fdMarkingCode
      LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = el.fdCustCode
      LEFT JOIN tbTypeComodity tc WITH (NOLOCK) ON tc.fdTypeComodity = el.fdTypeComodity AND tc.fdListType = el.fdListType
      LEFT JOIN tbBilling b WITH (NOLOCK) ON b.fdListCode = el.fdListCode
      LEFT JOIN tbBilling b2 WITH (NOLOCK) ON b2.fdInvNo = el.fdInvoiceNo AND el.fdInvoiceNo IS NOT NULL AND el.fdInvoiceNo <> ''
      ${filterClauses};

      CREATE INDEX IX_Temp_ListCode ON #CandidateResi(fdListCode);
      CREATE INDEX IX_Temp_InvNo ON #CandidateResi(fdInvNo);

      -- 2) Agregasi Detail M3 secara terindeks
      WITH BilledM3 AS (
        SELECT 
          LTRIM(RTRIM(bd.fdInvNo)) AS fdInvNo,
          SUM(CAST(bd.fdQty AS DECIMAL(18,4))) AS billedM3
        FROM tbBillingDetail bd WITH (NOLOCK)
        INNER JOIN #CandidateResi cr ON cr.fdInvNo = bd.fdInvNo
        WHERE RTRIM(bd.fdListCode) = 'M3'
        GROUP BY bd.fdInvNo
      ),
      GudangDetailM3 AS (
        SELECT 
          det.fdListCode,
          SUM(CAST((det.fdPjg * det.fdLbr * det.fdTng * ISNULL(det.fdQty, 1)) / 1000000.0 AS DECIMAL(18,4))) AS gudangM3
        FROM tbEntryListDetail det WITH (NOLOCK)
        INNER JOIN #CandidateResi cr ON cr.fdListCode = det.fdListCode
        GROUP BY det.fdListCode
      ),
      PackingListM3 AS (
        SELECT 
          pl.fdListCode,
          SUM(CAST((pl.fdPjg * pl.fdLbr * pl.fdTng * ISNULL(pl.fdQty, 1)) / 1000000.0 AS DECIMAL(18,4))) AS plM3
        FROM tbEntryListDetail_packinglist pl WITH (NOLOCK)
        INNER JOIN #CandidateResi cr ON cr.fdListCode = pl.fdListCode
        GROUP BY pl.fdListCode
      )
      SELECT 
        cr.fdListCode,
        cr.fdTerima,
        cr.fdListType,
        cr.fdTypeComodity,
        cr.fdComodityName,
        cr.fdCustCode,
        cr.fdCustName,
        cr.fdSalesNM,
        cr.fdMarkingCode,
        cr.fdBranchCode,
        cr.fdTahun,
        cr.fdJmlBerat,
        cr.fdInvNo,
        bm.billedM3,
        gm.gudangM3,
        pm.plM3,
        cr.elM3,
        -- Hierarki kalkulasi M3
        CASE 
          WHEN cr.fdListType = 1 THEN 0
          WHEN bm.billedM3 IS NOT NULL AND bm.billedM3 > 0 THEN bm.billedM3
          WHEN gm.gudangM3 IS NOT NULL AND gm.gudangM3 > 0 THEN gm.gudangM3
          WHEN pm.plM3 IS NOT NULL AND pm.plM3 > 0 THEN pm.plM3
          ELSE ISNULL(cr.elM3, 0)
        END AS calculatedM3,
        -- Sumber M3
        CASE 
          WHEN cr.fdListType = 1 THEN 'NONE'
          WHEN bm.billedM3 IS NOT NULL AND bm.billedM3 > 0 THEN 'BILLING'
          WHEN gm.gudangM3 IS NOT NULL AND gm.gudangM3 > 0 THEN 'GUDANG'
          WHEN pm.plM3 IS NOT NULL AND pm.plM3 > 0 THEN 'PACKING_LIST'
          WHEN cr.elM3 IS NOT NULL AND cr.elM3 > 0 THEN 'ENTRY_LIST'
          ELSE 'NONE'
        END AS sourceM3,
        -- Berat Udara vs Laut
        CASE WHEN cr.fdListType = 1 THEN ISNULL(cr.fdJmlBerat, 0) ELSE 0 END AS calculatedBeratUdara,
        CASE WHEN cr.fdListType = 2 THEN ISNULL(cr.fdJmlBerat, 0) ELSE 0 END AS calculatedBeratLaut
      FROM #CandidateResi cr
      LEFT JOIN BilledM3 bm ON bm.fdInvNo = cr.fdInvNo
      LEFT JOIN GudangDetailM3 gm ON gm.fdListCode = cr.fdListCode
      LEFT JOIN PackingListM3 pm ON pm.fdListCode = cr.fdListCode
      ORDER BY cr.fdCustName ASC, cr.fdTahun DESC, cr.fdListCode ASC;

      DROP TABLE #CandidateResi;
    `

    const rawRows: Array<{
      fdListCode: string
      fdTerima: string
      fdListType: number
      fdTypeComodity: number
      fdComodityName: string
      fdCustCode: string
      fdCustName: string
      fdSalesNM: string
      fdMarkingCode: string
      fdBranchCode: string
      fdTahun: number
      fdJmlBerat: any
      fdInvNo: string
      billedM3: any
      gudangM3: any
      pmM3: any
      elM3: any
      calculatedM3: any
      sourceM3: string
      calculatedBeratUdara: any
      calculatedBeratLaut: any
    }> = await prisma.$queryRawUnsafe(query)

    // 4. Transformasi & Agregasi per Customer & Sales
    const customerMap = new Map<string, CargoCustomerSummary>()

    let grandTotalM3 = 0
    let grandTotalBeratUdara = 0
    let grandTotalBeratLaut = 0
    let totalResiCount = 0

    for (const row of rawRows) {
      const custKey = `${row.fdCustCode || ''}|${row.fdCustName || ''}|${row.fdSalesNM || ''}`
      const m3Val = Number(row.calculatedM3 || 0)
      const beratUdaraVal = Number(row.calculatedBeratUdara || 0)
      const beratLautVal = Number(row.calculatedBeratLaut || 0)

      const detailItem: CargoResiDetail = {
        fdListCode: row.fdListCode,
        fdTerima: row.fdTerima && row.fdTerima.trim() !== '' ? row.fdTerima.trim() : null,
        fdMarkingCode: row.fdMarkingCode || '-',
        fdBranchCode: row.fdBranchCode || '-',
        fdTahun: Number(row.fdTahun),
        fdListType: Number(row.fdListType),
        fdTypeComodity: Number(row.fdTypeComodity),
        fdComodityName: row.fdComodityName || '-',
        fdInvNo: row.fdInvNo ? row.fdInvNo.trim() : null,
        calculatedM3: parseFloat(m3Val.toFixed(4)),
        calculatedBeratUdara: parseFloat(beratUdaraVal.toFixed(2)),
        calculatedBeratLaut: parseFloat(beratLautVal.toFixed(2)),
        sourceM3: (row.sourceM3 as any) || 'NONE',
      }

      if (!customerMap.has(custKey)) {
        customerMap.set(custKey, {
          fdCustCode: row.fdCustCode || '-',
          fdCustName: row.fdCustName || 'Tanpa Nama',
          fdSalesNM: row.fdSalesNM && row.fdSalesNM !== '' ? row.fdSalesNM : '-',
          totalResi: 0,
          totalM3: 0,
          totalBeratUdara: 0,
          totalBeratLaut: 0,
          resiDetails: [],
        })
      }

      const custSummary = customerMap.get(custKey)!
      custSummary.totalResi += 1
      custSummary.totalM3 = parseFloat((custSummary.totalM3 + m3Val).toFixed(4))
      custSummary.totalBeratUdara = parseFloat((custSummary.totalBeratUdara + beratUdaraVal).toFixed(2))
      custSummary.totalBeratLaut = parseFloat((custSummary.totalBeratLaut + beratLautVal).toFixed(2))
      custSummary.resiDetails!.push(detailItem)

      grandTotalM3 += m3Val
      grandTotalBeratUdara += beratUdaraVal
      grandTotalBeratLaut += beratLautVal
      totalResiCount += 1
    }

    const data = Array.from(customerMap.values())

    return {
      meta: {
        branches,
        commodities,
        availableYears,
      },
      years: Array.from(new Set(rawRows.map((r) => Number(r.fdTahun)))).sort((a, b) => b - a),
      data,
      summary: {
        totalCustomers: data.length,
        totalResi: totalResiCount,
        grandTotalM3: parseFloat(grandTotalM3.toFixed(4)),
        grandTotalBeratUdara: parseFloat(grandTotalBeratUdara.toFixed(2)),
        grandTotalBeratLaut: parseFloat(grandTotalBeratLaut.toFixed(2)),
      },
    }
  } catch (error: any) {
    logger.error('Error saat mengambil data report rekap volume & berat kargo:', { error: error.message })
    throw error
  }
}
