import { prisma } from '../../config/database'
import { logger } from '../../config/logger'

export interface ColumnMappingInfo {
  branchCode: string | null
  branchName: string | null
  mode: 'BY SEA' | 'BY AIR' | null
  serviceType: string | null
  commodityType: string | null
  displayName: string
  isCurrency: boolean
}

const BRANCH_MAP: Record<string, string> = {
  GZ: 'GUANGZHOU',
  YW: 'YIWU',
  SH: 'SHANGHAI',
  SZ: 'SHENZHEN',
  HK: 'HONGKONG',
  SG: 'SINGAPORE',
  BKK: 'BANGKOK',
  BK: 'BANGKOK',
  KR: 'KOREA',
}

const SERVICE_MAP: Record<string, { mode: 'BY SEA' | 'BY AIR'; label: string }> = {
  LR: { mode: 'BY SEA', label: 'Laut Reguler' },
  SP: { mode: 'BY SEA', label: 'Laut SP' },
  PM: { mode: 'BY SEA', label: 'Laut Premium' },
  UC: { mode: 'BY AIR', label: 'Udara Cepat' },
  AS: { mode: 'BY AIR', label: 'Udara AS' },
}

const COMMODITY_MAP: Record<string, string> = {
  UMUM: 'UMUM',
  GENERAL: 'GENERAL',
  LARTASN: 'LARTAS - N',
  LARTASS: 'LARTAS - S',
  SEMI: 'SEMI GARMENT',
  SEMIGARMENT: 'SEMI GARMENT',
  GARMENT: 'GARMENT',
  TEKSTIL: 'TEKSTIL',
  BRANDED: 'BRANDED',
  FOOD: 'FOOD',
  SHOES: 'SHOES',
  KG: 'HARGA PER KG (OVERWEIGHT)',
}

export function parseColumnMapping(colName: string): ColumnMappingInfo {
  const clean = colName.trim()
  const lower = clean.toLowerCase()

  // Special metadata/ratio fields
  if (lower === 'fdrasiolr') {
    return {
      branchCode: null,
      branchName: null,
      mode: 'BY SEA',
      serviceType: 'Laut Reguler',
      commodityType: null,
      displayName: 'Rasio Laut Reguler (kg/m³)',
      isCurrency: false,
    }
  }
  if (lower === 'fdrasiosp') {
    return {
      branchCode: null,
      branchName: null,
      mode: 'BY SEA',
      serviceType: 'Laut SP',
      commodityType: null,
      displayName: 'Rasio Laut SP (kg/m³)',
      isCurrency: false,
    }
  }
  if (lower === 'fdrasiopm') {
    return {
      branchCode: null,
      branchName: null,
      mode: 'BY SEA',
      serviceType: 'Laut Premium',
      commodityType: null,
      displayName: 'Rasio Laut Premium (kg/m³)',
      isCurrency: false,
    }
  }
  if (lower === 'fdtypetagihan') {
    return {
      branchCode: null,
      branchName: null,
      mode: null,
      serviceType: null,
      commodityType: null,
      displayName: 'Tipe Tagihan (1: m³+kg, 2: Compare, 3: m³ only, 4: kg only)',
      isCurrency: false,
    }
  }
  if (lower === 'fdupdate') {
    return {
      branchCode: null,
      branchName: null,
      mode: null,
      serviceType: null,
      commodityType: null,
      displayName: 'User Update Terakhir',
      isCurrency: false,
    }
  }
  if (lower === 'fdtglupdate' || lower === 'fdload') {
    return {
      branchCode: null,
      branchName: null,
      mode: null,
      serviceType: null,
      commodityType: null,
      displayName: 'Waktu Update Terakhir',
      isCurrency: false,
    }
  }
  if (lower === 'fdnote' || lower === 'fdnote1') {
    return {
      branchCode: null,
      branchName: null,
      mode: null,
      serviceType: null,
      commodityType: null,
      displayName: 'Catatan Tarif',
      isCurrency: false,
    }
  }
  if (lower === 'fdpenawaran') {
    return {
      branchCode: null,
      branchName: null,
      mode: null,
      serviceType: null,
      commodityType: null,
      displayName: 'No. Surat Penawaran',
      isCurrency: false,
    }
  }
  if (lower === 'fdasuransi1' || lower === 'fdasuransi') {
    return {
      branchCode: null,
      branchName: null,
      mode: null,
      serviceType: null,
      commodityType: null,
      displayName: 'Tarif Asuransi',
      isCurrency: true,
    }
  }

  // Tariff column decomposition: fd + [Branch: 2-3 chars] + [Service: 2 chars] + [Commodity]
  // e.g. fdGzLrLartasN, fdSgUcGeneral, fdHkLrSemi
  if (clean.startsWith('fd') && clean.length >= 6) {
    const raw = clean.substring(2) // remove 'fd'

    // Try match branch (GZ, YW, SH, SZ, HK, SG, BKK, BK, KR)
    let branchCode: string | null = null
    let rest = raw

    for (const b of ['BKK', 'GZ', 'YW', 'SH', 'SZ', 'HK', 'SG', 'BK', 'KR']) {
      if (raw.toUpperCase().startsWith(b)) {
        branchCode = b === 'BK' ? 'BKK' : b
        rest = raw.substring(b.length)
        break
      }
    }

    if (branchCode) {
      const branchName = BRANCH_MAP[branchCode] || branchCode

      // Try match service (LR, SP, PM, UC, AS)
      let serviceKey: string | null = null
      let commodityKey = rest

      for (const s of ['LR', 'SP', 'PM', 'UC', 'AS']) {
        if (rest.toUpperCase().startsWith(s)) {
          serviceKey = s
          commodityKey = rest.substring(s.length)
          break
        }
      }

      const serviceInfo = serviceKey ? SERVICE_MAP[serviceKey] : null
      const cleanCommKey = commodityKey.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
      const commodityType = COMMODITY_MAP[cleanCommKey] || (commodityKey ? commodityKey.trim() : null)

      const parts: string[] = [branchName]
      if (serviceInfo) {
        parts.push(serviceInfo.label)
      }
      if (commodityType) {
        parts.push(commodityType)
      }

      return {
        branchCode,
        branchName,
        mode: serviceInfo?.mode || null,
        serviceType: serviceInfo?.label || null,
        commodityType,
        displayName: parts.join(' · '),
        isCurrency: true,
      }
    }
  }

  return {
    branchCode: null,
    branchName: null,
    mode: null,
    serviceType: null,
    commodityType: null,
    displayName: clean,
    isCurrency: !isNaN(Number(clean)),
  }
}

export async function getCustomerTariffAuditList(custCode: string) {
  const cleanCustCode = custCode.trim()
  if (!cleanCustCode) return []

  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT 
        fdAuditID,
        fdCustCode,
        fdAction,
        fdColumnName,
        fdOldValue,
        fdNewValue,
        fdUpdatedBy,
        fdUpdateDate,
        fdHostName,
        fdIPAddress,
        fdAppName,
        fdTransactionID
      FROM tbCustomersHargaAudit WITH (NOLOCK)
      WHERE fdCustCode = ${cleanCustCode}
      ORDER BY fdUpdateDate DESC, fdAuditID DESC
    `

    return rows.map((r) => {
      const colName = String(r.fdColumnName || '').trim()
      const mapping = parseColumnMapping(colName)

      return {
        fdAuditID: typeof r.fdAuditID === 'bigint' ? r.fdAuditID.toString() : String(r.fdAuditID || ''),
        fdCustCode: String(r.fdCustCode || '').trim(),
        fdAction: String(r.fdAction || 'UPDATE').trim().toUpperCase(),
        fdColumnName: colName,
        mapping,
        fdOldValue: r.fdOldValue !== null && r.fdOldValue !== undefined ? String(r.fdOldValue).trim() : null,
        fdNewValue: r.fdNewValue !== null && r.fdNewValue !== undefined ? String(r.fdNewValue).trim() : null,
        fdUpdatedBy: String(r.fdUpdatedBy || 'SYSTEM').trim(),
        fdUpdateDate: r.fdUpdateDate ? new Date(r.fdUpdateDate).toISOString() : new Date().toISOString(),
        fdHostName: r.fdHostName ? String(r.fdHostName).trim() : null,
        fdIPAddress: r.fdIPAddress ? String(r.fdIPAddress).trim() : null,
        fdAppName: r.fdAppName ? String(r.fdAppName).trim() : null,
        fdTransactionID: r.fdTransactionID ? String(r.fdTransactionID).trim() : null,
      }
    })
  } catch (err) {
    logger.error(`Error fetching tbCustomersHargaAudit for ${cleanCustCode}:`, { error: err })
    return []
  }
}

export interface CustomerHargaTariffItem {
  colName: string
  branchCode: string
  branchName: string
  mode: 'BY SEA' | 'BY AIR'
  serviceType: string
  commodityType: string
  displayName: string
  hargaAwal: number
  hargaAktif: number
  isEdited: boolean
  auditInfo?: {
    auditId: string
    oldValue: string | null
    newValue: string | null
    updatedBy: string
    updateDate: string
  } | null
}

export interface CustomerHargaDetailResult {
  custCode: string
  custName: string
  metadata: {
    penawaran: string | null
    rasioLr: number | null
    rasioSp: number | null
    rasioPm: number | null
    typeTagihan: number | null
    typeTagihanLabel: string | null
    noteUdara: string | null
    noteLaut: string | null
    asuransi: number | null
    asuransi1: number | null
    lastUpdateBy: string | null
    lastUpdateDate: string | null
  }
  tariffs: CustomerHargaTariffItem[]
  branches: {
    code: string
    name: string
    count: number
  }[]
}

const TYPE_TAGIHAN_LABELS: Record<number, string> = {
  1: 'm³ + kg (Kombinasi)',
  2: 'Compare (Nilai Tertinggi)',
  3: 'm³ only (Kubikasi Saja)',
  4: 'kg only (Timbangan Saja)',
}

export async function getCustomerHargaDetail(custCode: string): Promise<CustomerHargaDetailResult | null> {
  const cleanCustCode = custCode.trim()
  if (!cleanCustCode) return null

  try {
    let metaRows = await prisma.$queryRaw<any[]>`
      SELECT TOP 1
        t.*,
        ISNULL(c.fdCustName, t.fdCustName) as resolvedCustName
      FROM tbCustomersHarga t WITH (NOLOCK)
      LEFT JOIN tbCustomers c WITH (NOLOCK) ON RTRIM(t.fdCustCode) = RTRIM(c.fdCustCode)
      WHERE RTRIM(t.fdCustCode) = ${cleanCustCode}
    `

    if (!metaRows.length) {
      metaRows = await prisma.$queryRaw<any[]>`
        SELECT TOP 1
          t.*,
          ISNULL(c.fdCustName, t.fdCustName) as resolvedCustName
        FROM tbCustomersHarga t WITH (NOLOCK)
        LEFT JOIN tbCustomers c WITH (NOLOCK) ON RTRIM(t.fdCustCode) = RTRIM(c.fdCustCode)
        WHERE RTRIM(t.fdCustName) = ${cleanCustCode}
           OR RTRIM(c.fdCustName) = ${cleanCustCode}
      `
    }

    const row = metaRows[0]
    if (!row) return null

    const resolvedCustCode = String(row.fdCustCode || cleanCustCode).trim()

    const auditRows = await prisma.$queryRaw<any[]>`
      SELECT 
        fdAuditID,
        RTRIM(fdColumnName) as fdColumnName,
        RTRIM(fdOldValue) as fdOldValue,
        RTRIM(fdNewValue) as fdNewValue,
        RTRIM(fdUpdatedBy) as fdUpdatedBy,
        fdUpdateDate
      FROM tbCustomersHargaAudit WITH (NOLOCK)
      WHERE RTRIM(fdCustCode) = ${resolvedCustCode}
      ORDER BY fdAuditID DESC
    `

    // Index latest audit per column
    const latestAuditMap = new Map<string, any>()
    for (const a of auditRows) {
      const colKey = String(a.fdColumnName || '').trim().toLowerCase()
      if (colKey && !latestAuditMap.has(colKey)) {
        latestAuditMap.set(colKey, a)
      }
    }

    const typeTagihanNum = row.fdTypeTagihan !== null && row.fdTypeTagihan !== undefined ? Number(row.fdTypeTagihan) : null

    const metadata = {
      penawaran: row.fdPenawaran ? String(row.fdPenawaran).trim() : null,
      rasioLr: row.fdRasioLr !== null && row.fdRasioLr !== undefined ? Number(row.fdRasioLr) : null,
      rasioSp: row.fdRasioSp !== null && row.fdRasioSp !== undefined ? Number(row.fdRasioSp) : null,
      rasioPm: row.fdRasioPm !== null && row.fdRasioPm !== undefined ? Number(row.fdRasioPm) : null,
      typeTagihan: typeTagihanNum,
      typeTagihanLabel: typeTagihanNum !== null ? (TYPE_TAGIHAN_LABELS[typeTagihanNum] || `Tipe ${typeTagihanNum}`) : null,
      noteUdara: row.fdNote ? String(row.fdNote).trim() : null,
      noteLaut: row.fdNote1 ? String(row.fdNote1).trim() : null,
      asuransi: row.fdAsuransi !== null && row.fdAsuransi !== undefined ? Number(row.fdAsuransi) : null,
      asuransi1: row.fdAsuransi1 !== null && row.fdAsuransi1 !== undefined ? Number(row.fdAsuransi1) : null,
      lastUpdateBy: row.fdUpdate ? String(row.fdUpdate).trim() : null,
      lastUpdateDate: row.fdLoad ? new Date(row.fdLoad).toISOString() : null,
    }

    const tariffs: CustomerHargaTariffItem[] = []
    const processedCols = new Set<string>()

    // Parse every active column from tbCustomersHarga
    for (const [col, val] of Object.entries(row)) {
      if (col === 'fdCustCode' || col === 'fdCustName' || col === 'resolvedCustName') continue
      const numVal = Number(val)
      const colLower = col.toLowerCase()

      const audit = latestAuditMap.get(colLower)
      const auditNum = audit ? Number(audit.fdNewValue) : NaN

      // If either base value > 0 or audit revised value > 0
      const basePrice = !isNaN(numVal) && numVal > 0 ? numVal : 0
      const activePrice = audit && !isNaN(auditNum) ? auditNum : basePrice

      if (activePrice > 0) {
        const mapping = parseColumnMapping(col)
        if (mapping.branchCode && mapping.mode && mapping.serviceType && mapping.commodityType) {
          processedCols.add(colLower)
          const isEdited = Boolean(audit && audit.fdNewValue !== undefined && Number(audit.fdNewValue) !== basePrice)
          tariffs.push({
            colName: col,
            branchCode: mapping.branchCode,
            branchName: mapping.branchName || mapping.branchCode,
            mode: mapping.mode,
            serviceType: mapping.serviceType,
            commodityType: mapping.commodityType,
            displayName: mapping.displayName,
            hargaAwal: basePrice,
            hargaAktif: activePrice,
            isEdited,
            auditInfo: audit ? {
              auditId: typeof audit.fdAuditID === 'bigint' ? audit.fdAuditID.toString() : String(audit.fdAuditID || ''),
              oldValue: audit.fdOldValue ? String(audit.fdOldValue).trim() : null,
              newValue: audit.fdNewValue ? String(audit.fdNewValue).trim() : null,
              updatedBy: String(audit.fdUpdatedBy || '').trim(),
              updateDate: audit.fdUpdateDate ? new Date(audit.fdUpdateDate).toISOString() : new Date().toISOString(),
            } : null,
          })
        }
      }
    }

    // Check if there are audit logs for columns not yet processed that have positive price
    for (const [colLower, audit] of latestAuditMap.entries()) {
      if (processedCols.has(colLower)) continue
      const auditNum = Number(audit.fdNewValue)
      if (!isNaN(auditNum) && auditNum > 0) {
        const mapping = parseColumnMapping(audit.fdColumnName)
        if (mapping.branchCode && mapping.mode && mapping.serviceType && mapping.commodityType) {
          tariffs.push({
            colName: audit.fdColumnName,
            branchCode: mapping.branchCode,
            branchName: mapping.branchName || mapping.branchCode,
            mode: mapping.mode,
            serviceType: mapping.serviceType,
            commodityType: mapping.commodityType,
            displayName: mapping.displayName,
            hargaAwal: 0,
            hargaAktif: auditNum,
            isEdited: true,
            auditInfo: {
              auditId: typeof audit.fdAuditID === 'bigint' ? audit.fdAuditID.toString() : String(audit.fdAuditID || ''),
              oldValue: audit.fdOldValue ? String(audit.fdOldValue).trim() : null,
              newValue: audit.fdNewValue ? String(audit.fdNewValue).trim() : null,
              updatedBy: String(audit.fdUpdatedBy || '').trim(),
              updateDate: audit.fdUpdateDate ? new Date(audit.fdUpdateDate).toISOString() : new Date().toISOString(),
            },
          })
        }
      }
    }

    // Sort tariffs by branch priority (GZ, YW, SH, SZ, HK, SG, etc.), mode (SEA, AIR), service, commodity
    const branchPriority: Record<string, number> = {
      GZ: 1, YW: 2, SH: 3, SZ: 4, HK: 5, SG: 6, BKK: 7, BK: 8, KR: 9
    }
    tariffs.sort((a, b) => {
      const pA = branchPriority[a.branchCode] || 99
      const pB = branchPriority[b.branchCode] || 99
      if (pA !== pB) return pA - pB
      if (a.mode !== b.mode) return a.mode.localeCompare(b.mode)
      if (a.serviceType !== b.serviceType) return a.serviceType.localeCompare(b.serviceType)
      return a.commodityType.localeCompare(b.commodityType)
    })

    // Compute distinct branches
    const branchCountMap = new Map<string, { code: string; name: string; count: number }>()
    for (const t of tariffs) {
      if (!branchCountMap.has(t.branchCode)) {
        branchCountMap.set(t.branchCode, { code: t.branchCode, name: t.branchName, count: 0 })
      }
      branchCountMap.get(t.branchCode)!.count++
    }
    const branches = [...branchCountMap.values()].sort((a, b) => {
      const pA = branchPriority[a.code] || 99
      const pB = branchPriority[b.code] || 99
      return pA - pB
    })

    return {
      custCode: resolvedCustCode,
      custName: String(row.resolvedCustName || row.fdCustName || cleanCustCode).trim(),
      metadata,
      tariffs,
      branches,
    }
  } catch (err) {
    logger.error(`Error in getCustomerHargaDetail for ${cleanCustCode}:`, { error: err })
    return null
  }
}
