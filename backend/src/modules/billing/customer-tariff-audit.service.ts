import { prisma } from '../../config/database'

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
    console.error(`Error fetching tbCustomersHargaAudit for ${cleanCustCode}:`, err)
    return []
  }
}
