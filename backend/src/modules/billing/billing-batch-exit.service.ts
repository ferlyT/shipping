import { prisma } from '../../config/database'
import { Prisma } from '@prisma/client'
import { logger } from '../../config/logger'

const BRANCH_NAME_MAP: Record<string, string> = {
  SG: 'Singapore',
  GZ: 'Guangzhou',
  YW: 'Yiwu',
  SH: 'Shanghai',
  SZ: 'Shenzhen',
  HK: 'Hong Kong',
  LM: 'Legal Mandiri',
  LG: 'Legal',
  EX: 'Export',
  TH: 'Thailand',
  KR: 'South Korea',
  IM: 'Import Lain-lain',
  BT: 'Batam',
  MY: 'Malaysia',
  TW: 'Taiwan',
  XM: 'Xiamen',
  DG: 'Dongguan',
  LAIN: 'Lainnya',
}

function normalizeBranch(rawCode: string, rawName?: string): { branchCode: string; branchName: string } {
  let cleanCode = (rawCode || '').trim().toUpperCase()
  // Aturan ERP: -- dan SG disamakan ke Singapore (SG)
  if (cleanCode === '--' || cleanCode === '-' || cleanCode === 'SG') {
    return { branchCode: 'SG', branchName: 'Singapore' }
  }
  if (!cleanCode) {
    cleanCode = 'LAIN'
  }
  const branchName = BRANCH_NAME_MAP[cleanCode] || (rawName || '').trim() || cleanCode
  return { branchCode: cleanCode, branchName }
}

export interface BatchExitBranchMetric {
  branchCode: string
  branchName: string
  totalBatches: number
  fullyBilledBatches: number
  pendingBatches: number
  totalKargo: number
  totalBilled: number
  totalUnbilled: number
  billedPercentage: number
  airBatches: number
  airKargo: number
  airBilled: number
  airUnbilled: number
  seaBatches: number
  seaKargo: number
  seaBilled: number
  seaUnbilled: number
}

export interface BatchExitComparisonSummary {
  totalBatches: number
  fullyBilledBatches: number
  pendingBatches: number
  totalKargo: number
  totalBilled: number
  totalUnbilled: number
  billedPercentage: number
  air: {
    totalBatches: number
    totalKargo: number
    totalBilled: number
    totalUnbilled: number
    billedPercentage: number
  }
  sea: {
    totalBatches: number
    totalKargo: number
    totalBilled: number
    totalUnbilled: number
    billedPercentage: number
  }
  byBranch: BatchExitBranchMetric[]
  byCustomerStatus: {
    blocked: CustomerStatusMetric
    warning: CustomerStatusMetric
    urgent: CustomerStatusMetric
    cod: CustomerStatusMetric
    ok: CustomerStatusMetric
    noStatus: CustomerStatusMetric
  }
}

export interface CustomerStatusMetric {
  totalKargo: number
  totalBilled: number
  totalUnbilled: number
  billedPercentage: number
}

export interface BatchCustomerStatusCounts {
  blocked: number
  warning: number
  urgent: number
  cod: number
  ok: number
  noStatus: number
  unbilledBlocked: number
  unbilledWarning: number
  unbilledUrgent: number
  unbilledCod: number
}

export interface BatchExitItem {
  markingCode: string
  exitDate: string | null
  listType: number // 1: Udara, 2: Laut
  branchCode: string
  branchName: string
  totalKargo: number
  totalBilled: number
  totalUnbilled: number
  billedPercentage: number
  isFullyBilled: boolean
  customerStatus: BatchCustomerStatusCounts
}

export interface BatchExitCargoItem {
  listCode: string
  markingCode: string
  custCode: string
  custName: string
  custStatus: number
  custStatusLabel: string
  isBroker: boolean
  coly: number
  satuan: string
  m3: number
  berat: number
  isBilled: boolean
  sjNo: string | null
  isSent: boolean
}

export interface BatchExitComparisonResponse {
  summary: BatchExitComparisonSummary
  batches: BatchExitItem[]
}

export async function getBatchExitComparison(query?: Record<string, string | undefined>): Promise<BatchExitComparisonResponse> {
  const now = new Date()
  const targetYear = query?.year && !isNaN(Number(query.year)) ? Number(query.year) : now.getFullYear()
  const targetMonth = query?.month && !isNaN(Number(query.month)) ? Math.min(12, Math.max(1, Number(query.month))) : now.getMonth() + 1
  const allTime = query?.allTime === 'true'

  const startOfMonth = new Date(targetYear, targetMonth - 1, 1)
  const endOfMonth = new Date(targetYear, targetMonth, 1)

  try {
    let rows: any[]

    if (allTime) {
      rows = await prisma.$queryRaw<any[]>`
        SELECT 
          m.fdMarkingCode, 
          m.fdExitDate, 
          m.fdListType,
          CASE 
            WHEN RTRIM(m.fdBranchCode) IN ('--', 'SG', '-') THEN 'SG'
            ELSE RTRIM(m.fdBranchCode)
          END AS branchCode,
          cb.fdBranchName,
          COUNT(el.fdListCode) AS totalKargo, 
          SUM(CASE WHEN ISNULL(el.fdBillCreated, 0) = 1 THEN 1 ELSE 0 END) AS totalBilled,
          SUM(CASE WHEN ISNULL(el.fdBillCreated, 0) = 0 THEN 1 ELSE 0 END) AS totalUnbilled,
          SUM(CASE WHEN ISNULL(c.fdBlocked, 0) = 4 THEN 1 ELSE 0 END) AS blockedCount,
          SUM(CASE WHEN ISNULL(c.fdBlocked, 0) = 3 THEN 1 ELSE 0 END) AS warningCount,
          SUM(CASE WHEN ISNULL(c.fdBlocked, 0) = 5 THEN 1 ELSE 0 END) AS urgentCount,
          SUM(CASE WHEN ISNULL(c.fdBlocked, 0) = 2 THEN 1 ELSE 0 END) AS codCount,
          SUM(CASE WHEN ISNULL(c.fdBlocked, 0) = 1 THEN 1 ELSE 0 END) AS okCount,
          SUM(CASE WHEN ISNULL(c.fdBlocked, 0) <= 0 THEN 1 ELSE 0 END) AS noStatusCount,
          SUM(CASE WHEN ISNULL(c.fdBlocked, 0) = 4 AND ISNULL(el.fdBillCreated, 0) = 0 THEN 1 ELSE 0 END) AS unbilledBlocked,
          SUM(CASE WHEN ISNULL(c.fdBlocked, 0) = 3 AND ISNULL(el.fdBillCreated, 0) = 0 THEN 1 ELSE 0 END) AS unbilledWarning,
          SUM(CASE WHEN ISNULL(c.fdBlocked, 0) = 5 AND ISNULL(el.fdBillCreated, 0) = 0 THEN 1 ELSE 0 END) AS unbilledUrgent,
          SUM(CASE WHEN ISNULL(c.fdBlocked, 0) = 2 AND ISNULL(el.fdBillCreated, 0) = 0 THEN 1 ELSE 0 END) AS unbilledCod
        FROM tbMarking m WITH (NOLOCK) 
        INNER JOIN tbEntryList el WITH (NOLOCK) ON el.fdMarkingCode = m.fdMarkingCode 
        LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = el.fdCustCode
        LEFT JOIN tbCabang cb WITH (NOLOCK) ON cb.fdBranchCode = m.fdBranchCode
        WHERE m.fdExitDate IS NOT NULL 
        GROUP BY 
          m.fdMarkingCode, 
          m.fdExitDate, 
          m.fdListType, 
          CASE 
            WHEN RTRIM(m.fdBranchCode) IN ('--', 'SG', '-') THEN 'SG'
            ELSE RTRIM(m.fdBranchCode)
          END,
          cb.fdBranchName
        ORDER BY m.fdExitDate DESC, m.fdMarkingCode ASC
      `
    } else {
      rows = await prisma.$queryRaw<any[]>`
        SELECT 
          m.fdMarkingCode, 
          m.fdExitDate, 
          m.fdListType,
          CASE 
            WHEN RTRIM(m.fdBranchCode) IN ('--', 'SG', '-') THEN 'SG'
            ELSE RTRIM(m.fdBranchCode)
          END AS branchCode,
          cb.fdBranchName,
          COUNT(el.fdListCode) AS totalKargo, 
          SUM(CASE WHEN ISNULL(el.fdBillCreated, 0) = 1 THEN 1 ELSE 0 END) AS totalBilled,
          SUM(CASE WHEN ISNULL(el.fdBillCreated, 0) = 0 THEN 1 ELSE 0 END) AS totalUnbilled,
          SUM(CASE WHEN ISNULL(c.fdBlocked, 0) = 4 THEN 1 ELSE 0 END) AS blockedCount,
          SUM(CASE WHEN ISNULL(c.fdBlocked, 0) = 3 THEN 1 ELSE 0 END) AS warningCount,
          SUM(CASE WHEN ISNULL(c.fdBlocked, 0) = 5 THEN 1 ELSE 0 END) AS urgentCount,
          SUM(CASE WHEN ISNULL(c.fdBlocked, 0) = 2 THEN 1 ELSE 0 END) AS codCount,
          SUM(CASE WHEN ISNULL(c.fdBlocked, 0) = 1 THEN 1 ELSE 0 END) AS okCount,
          SUM(CASE WHEN ISNULL(c.fdBlocked, 0) <= 0 THEN 1 ELSE 0 END) AS noStatusCount,
          SUM(CASE WHEN ISNULL(c.fdBlocked, 0) = 4 AND ISNULL(el.fdBillCreated, 0) = 0 THEN 1 ELSE 0 END) AS unbilledBlocked,
          SUM(CASE WHEN ISNULL(c.fdBlocked, 0) = 3 AND ISNULL(el.fdBillCreated, 0) = 0 THEN 1 ELSE 0 END) AS unbilledWarning,
          SUM(CASE WHEN ISNULL(c.fdBlocked, 0) = 5 AND ISNULL(el.fdBillCreated, 0) = 0 THEN 1 ELSE 0 END) AS unbilledUrgent,
          SUM(CASE WHEN ISNULL(c.fdBlocked, 0) = 2 AND ISNULL(el.fdBillCreated, 0) = 0 THEN 1 ELSE 0 END) AS unbilledCod
        FROM tbMarking m WITH (NOLOCK) 
        INNER JOIN tbEntryList el WITH (NOLOCK) ON el.fdMarkingCode = m.fdMarkingCode 
        LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = el.fdCustCode
        LEFT JOIN tbCabang cb WITH (NOLOCK) ON cb.fdBranchCode = m.fdBranchCode
        WHERE m.fdExitDate IS NOT NULL 
          AND m.fdExitDate >= ${startOfMonth} 
          AND m.fdExitDate < ${endOfMonth}
        GROUP BY 
          m.fdMarkingCode, 
          m.fdExitDate, 
          m.fdListType, 
          CASE 
            WHEN RTRIM(m.fdBranchCode) IN ('--', 'SG', '-') THEN 'SG'
            ELSE RTRIM(m.fdBranchCode)
          END,
          cb.fdBranchName
        ORDER BY m.fdExitDate DESC, m.fdMarkingCode ASC
      `
    }

    let totalBatches = 0
    let fullyBilledBatches = 0
    let pendingBatches = 0
    let totalKargo = 0
    let totalBilled = 0
    let totalUnbilled = 0

    let airBatches = 0
    let airKargo = 0
    let airBilled = 0
    let airUnbilled = 0

    let seaBatches = 0
    let seaKargo = 0
    let seaBilled = 0
    let seaUnbilled = 0

    const branchMap = new Map<string, BatchExitBranchMetric>()

    const statusAgg = {
      blocked: { totalKargo: 0, totalBilled: 0, totalUnbilled: 0, billedPercentage: 0 },
      warning: { totalKargo: 0, totalBilled: 0, totalUnbilled: 0, billedPercentage: 0 },
      urgent: { totalKargo: 0, totalBilled: 0, totalUnbilled: 0, billedPercentage: 0 },
      cod: { totalKargo: 0, totalBilled: 0, totalUnbilled: 0, billedPercentage: 0 },
      ok: { totalKargo: 0, totalBilled: 0, totalUnbilled: 0, billedPercentage: 0 },
      noStatus: { totalKargo: 0, totalBilled: 0, totalUnbilled: 0, billedPercentage: 0 },
    }

    const batches: BatchExitItem[] = rows.map((r) => {
      const kargo = Number(r.totalKargo || 0)
      const billed = Number(r.totalBilled || 0)
      const unbilled = Number(r.totalUnbilled || 0)
      const listType = Number(r.fdListType || 2)
      const pct = kargo > 0 ? Math.round((billed / kargo) * 1000) / 10 : 0
      const isFullyBilled = unbilled === 0

      const blocked = Number(r.blockedCount || 0)
      const warning = Number(r.warningCount || 0)
      const urgent = Number(r.urgentCount || 0)
      const cod = Number(r.codCount || 0)
      const ok = Number(r.okCount || 0)
      const noStatus = Number(r.noStatusCount || 0)

      const unbilledBlocked = Number(r.unbilledBlocked || 0)
      const unbilledWarning = Number(r.unbilledWarning || 0)
      const unbilledUrgent = Number(r.unbilledUrgent || 0)
      const unbilledCod = Number(r.unbilledCod || 0)

      statusAgg.blocked.totalKargo += blocked
      statusAgg.blocked.totalUnbilled += unbilledBlocked
      statusAgg.blocked.totalBilled += Math.max(0, blocked - unbilledBlocked)

      statusAgg.warning.totalKargo += warning
      statusAgg.warning.totalUnbilled += unbilledWarning
      statusAgg.warning.totalBilled += Math.max(0, warning - unbilledWarning)

      statusAgg.urgent.totalKargo += urgent
      statusAgg.urgent.totalUnbilled += unbilledUrgent
      statusAgg.urgent.totalBilled += Math.max(0, urgent - unbilledUrgent)

      statusAgg.cod.totalKargo += cod
      statusAgg.cod.totalUnbilled += unbilledCod
      statusAgg.cod.totalBilled += Math.max(0, cod - unbilledCod)

      statusAgg.ok.totalKargo += ok
      const knownUnbilled = unbilledBlocked + unbilledWarning + unbilledUrgent + unbilledCod
      const unbilledOther = Math.max(0, unbilled - knownUnbilled)
      const unbilledOk = Math.min(ok, unbilledOther)
      statusAgg.ok.totalUnbilled += unbilledOk
      statusAgg.ok.totalBilled += Math.max(0, ok - unbilledOk)

      statusAgg.noStatus.totalKargo += noStatus
      const unbilledNoStatus = Math.max(0, unbilledOther - unbilledOk)
      statusAgg.noStatus.totalUnbilled += unbilledNoStatus
      statusAgg.noStatus.totalBilled += Math.max(0, noStatus - unbilledNoStatus)

      const { branchCode, branchName } = normalizeBranch(r.branchCode, r.fdBranchName)

      totalBatches++
      totalKargo += kargo
      totalBilled += billed
      totalUnbilled += unbilled

      if (isFullyBilled) {
        fullyBilledBatches++
      } else {
        pendingBatches++
      }

      if (listType === 1) {
        airBatches++
        airKargo += kargo
        airBilled += billed
        airUnbilled += unbilled
      } else {
        seaBatches++
        seaKargo += kargo
        seaBilled += billed
        seaUnbilled += unbilled
      }

      // Group per branch
      let bMetric = branchMap.get(branchCode)
      if (!bMetric) {
        bMetric = {
          branchCode,
          branchName,
          totalBatches: 0,
          fullyBilledBatches: 0,
          pendingBatches: 0,
          totalKargo: 0,
          totalBilled: 0,
          totalUnbilled: 0,
          billedPercentage: 0,
          airBatches: 0,
          airKargo: 0,
          airBilled: 0,
          airUnbilled: 0,
          seaBatches: 0,
          seaKargo: 0,
          seaBilled: 0,
          seaUnbilled: 0,
        }
        branchMap.set(branchCode, bMetric)
      }

      bMetric.totalBatches++
      if (isFullyBilled) {
        bMetric.fullyBilledBatches++
      } else {
        bMetric.pendingBatches++
      }
      bMetric.totalKargo += kargo
      bMetric.totalBilled += billed
      bMetric.totalUnbilled += unbilled

      if (listType === 1) {
        bMetric.airBatches++
        bMetric.airKargo += kargo
        bMetric.airBilled += billed
        bMetric.airUnbilled += unbilled
      } else {
        bMetric.seaBatches++
        bMetric.seaKargo += kargo
        bMetric.seaBilled += billed
        bMetric.seaUnbilled += unbilled
      }

      return {
        markingCode: (r.fdMarkingCode || '').trim(),
        exitDate: r.fdExitDate ? new Date(r.fdExitDate).toISOString() : null,
        listType,
        branchCode,
        branchName,
        totalKargo: kargo,
        totalBilled: billed,
        totalUnbilled: unbilled,
        billedPercentage: pct,
        isFullyBilled,
        customerStatus: {
          blocked,
          warning,
          urgent,
          cod,
          ok,
          noStatus,
          unbilledBlocked,
          unbilledWarning,
          unbilledUrgent,
          unbilledCod,
        },
      }
    })

    const billedPercentage = totalKargo > 0 ? Math.round((totalBilled / totalKargo) * 1000) / 10 : 0
    const airPercentage = airKargo > 0 ? Math.round((airBilled / airKargo) * 1000) / 10 : 0
    const seaPercentage = seaKargo > 0 ? Math.round((seaBilled / seaKargo) * 1000) / 10 : 0

    const calcPct = (b: number, tot: number) => (tot > 0 ? Math.round((b / tot) * 1000) / 10 : 0)
    statusAgg.blocked.billedPercentage = calcPct(statusAgg.blocked.totalBilled, statusAgg.blocked.totalKargo)
    statusAgg.warning.billedPercentage = calcPct(statusAgg.warning.totalBilled, statusAgg.warning.totalKargo)
    statusAgg.urgent.billedPercentage = calcPct(statusAgg.urgent.totalBilled, statusAgg.urgent.totalKargo)
    statusAgg.cod.billedPercentage = calcPct(statusAgg.cod.totalBilled, statusAgg.cod.totalKargo)
    statusAgg.ok.billedPercentage = calcPct(statusAgg.ok.totalBilled, statusAgg.ok.totalKargo)
    statusAgg.noStatus.billedPercentage = calcPct(statusAgg.noStatus.totalBilled, statusAgg.noStatus.totalKargo)

    // Finalize byBranch array sorted by totalKargo DESC
    const byBranch: BatchExitBranchMetric[] = [...branchMap.values()]
      .map((b) => ({
        ...b,
        billedPercentage: b.totalKargo > 0 ? Math.round((b.totalBilled / b.totalKargo) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.totalKargo - a.totalKargo)

    return {
      summary: {
        totalBatches,
        fullyBilledBatches,
        pendingBatches,
        totalKargo,
        totalBilled,
        totalUnbilled,
        billedPercentage,
        air: {
          totalBatches: airBatches,
          totalKargo: airKargo,
          totalBilled: airBilled,
          totalUnbilled: airUnbilled,
          billedPercentage: airPercentage,
        },
        sea: {
          totalBatches: seaBatches,
          totalKargo: seaKargo,
          totalBilled: seaBilled,
          totalUnbilled: seaUnbilled,
          billedPercentage: seaPercentage,
        },
        byBranch,
        byCustomerStatus: statusAgg,
      },
      batches,
    }
  } catch (err) {
    logger.error('Failed to getBatchExitComparison:', err)
    throw err
  }
}

const CUST_STATUS_LABELS: Record<number, string> = {
  0: 'NO STATUS',
  1: 'OK',
  2: 'COD',
  3: 'WARNING',
  4: 'BLOCKED',
  5: 'URGENT',
}

export async function getBatchExitCargoDetails(markingCode: string): Promise<BatchExitCargoItem[]> {
  const cleanCode = markingCode.trim()
  if (!cleanCode) return []

  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT 
        el.fdListCode,
        el.fdMarkingCode,
        el.fdCustCode,
        ISNULL(c.fdCustName, el.fdTerima) AS custName,
        ISNULL(c.fdBlocked, 0) AS custStatus,
        ISNULL(c.fdBroker, 0) AS custBroker,
        ISNULL(el.fdJmlPack, 0) AS coly,
        ISNULL(el.fdSatuan, 'COLY') AS satuan,
        ISNULL(el.fdM3, 0) AS m3,
        ISNULL(el.fdJmlBerat, 0) AS berat,
        ISNULL(el.fdBillCreated, 0) AS fdBillCreated,
        d.fdSJNo,
        ISNULL(d.fdSent, 0) AS fdSent
      FROM tbEntryList el WITH (NOLOCK)
      LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = el.fdCustCode
      LEFT JOIN tbDelivery d WITH (NOLOCK) ON d.fdListCode = el.fdListCode
      WHERE el.fdMarkingCode = ${cleanCode}
      ORDER BY el.fdBillCreated ASC, el.fdListCode ASC
    `

    return rows.map((r) => {
      const custStatus = Number(r.custStatus ?? 0)
      return {
        listCode: (r.fdListCode || '').trim(),
        markingCode: (r.fdMarkingCode || '').trim(),
        custCode: (r.fdCustCode || '').trim(),
        custName: (r.custName || '').trim() || '-',
        custStatus,
        custStatusLabel: CUST_STATUS_LABELS[custStatus] || 'NO STATUS',
        isBroker: Number(r.custBroker || 0) === 2,
        coly: Number(r.coly || 0),
        satuan: (r.satuan || '').trim() || 'COLY',
        m3: Number(r.m3 || 0),
        berat: Number(r.berat || 0),
        isBilled: Number(r.fdBillCreated || 0) === 1,
        sjNo: r.fdSJNo ? (r.fdSJNo || '').trim() : null,
        isSent: Number(r.fdSent || 0) === 1,
      }
    })
  } catch (err) {
    logger.error(`Failed to getBatchExitCargoDetails for ${cleanCode}:`, err)
    return []
  }
}
