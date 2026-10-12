import { useMemo } from 'react'
import {
  formatCurrency,
  formatNumber,
  formatCompactRupiah,
} from '@/lib/utils'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import { CustomXAxisTick } from './ChartTick'
import type {
  BillingKpis,
  BillingTrends,
  BillingByEmployeeDaily,
  SjVsBillPoint,
  UnbilledSjDetailItem,
  BatchExitComparisonSummary,
  BatchExitItem,
} from '../types/billing.types'
import { MONTH_NAMES } from './BillingPeriodMatrixSection'
import { TrendChart } from './TrendChart'
import { EmployeeChart } from './EmployeeChart'

export interface DashboardPdfFullReportProps {
  reportType?: 'finance' | 'operation' | 'all'
  kpis: BillingKpis & {
    targetBillUdara?: {
      total: number
      breakdown: { kiki: number; yati: number }
      categories?: { sjSent: number; codUrgent: number; agingGt7: number; fcl: number }
    }
    targetBillLaut?: {
      total: number
      breakdown: { thara: number; rico: number; ferly: number }
      categories?: { sjSent: number; codUrgent: number; agingGt7: number; fcl: number }
    }
    invoicesBulanIniBreakdown?: { udara: number; laut: number }
    tagihanBulanIniBreakdown?: { udara: number; laut: number }
  } | undefined
  selectedYear: number
  selectedMonth: number
  daily: BillingTrends['daily']
  monthly: BillingTrends['monthly']
  byEmployeeSeries: BillingByEmployeeDaily['series']
  byEmployeeData: BillingByEmployeeDaily['data']
  sjVsBillData: SjVsBillPoint[]
  unbilledSjDetails?: UnbilledSjDetailItem[]
  batchExitSummary?: BatchExitComparisonSummary
  batchExitBatches?: BatchExitItem[]
  selectedBranch?: string
  printedBy?: string
  printTimeString?: string
  employeeDaysFilter?: number
  sjDaysFilter?: number
  dailyDaysFilter?: number
}

export function DashboardPdfFullReport({
  reportType = 'finance',
  kpis,
  selectedYear,
  selectedMonth,
  daily,
  monthly,
  byEmployeeSeries,
  byEmployeeData,
  sjVsBillData,
  unbilledSjDetails = [],
  batchExitSummary,
  batchExitBatches = [],
  selectedBranch = 'ALL',
  printedBy = 'Finance PIC',
  printTimeString = new Date().toLocaleString('id-ID') + ' WIB',
  employeeDaysFilter = 30,
  sjDaysFilter = 30,
  dailyDaysFilter = 30,
}: DashboardPdfFullReportProps) {
  const isOperation = reportType === 'operation'
  const isAll = reportType === 'all'
  const totalPages = isAll ? 13 : isOperation ? 10 : 6

  const periodLabel = `${MONTH_NAMES[selectedMonth - 1] || 'Bulan'} ${selectedYear}`
  const prevMonthName = kpis?.prevMonth?.monthName || 'Bulan Lalu'
  const lastYearMonthName = kpis?.lastYearSameMonth?.monthName || 'Tahun Lalu'

  const employeeRangeLabel = employeeDaysFilter === 365 ? '1 Tahun Terakhir' : `${employeeDaysFilter} Hari Terakhir`
  const sjRangeLabel = sjDaysFilter === 365 ? '1 Tahun Terakhir' : `${sjDaysFilter} Hari Terakhir`
  const dailyRangeLabel = `${dailyDaysFilter} Hari Terakhir`
  const empDaysDivisor = employeeDaysFilter === 365 ? 365 : employeeDaysFilter

  // Hitung metrik komparasi
  const comparisons = kpis?.comparisons
  const currentMonth = kpis?.currentMonth
  const prevMonth = kpis?.prevMonth
  const lastYearSameMonth = kpis?.lastYearSameMonth
  const branchComparisons = comparisons?.byBranch || []

  // Perhitungan komparasi operasional (Kuantiti Bill & Rasio non-moneter)
  const opTotInv = comparisons?.totalInvoices?.current ?? currentMonth?.totalInvoices ?? 0
  const opAirInv = comparisons?.invoicesUdara?.current ?? currentMonth?.invoicesUdara ?? 0
  const opSeaInv = comparisons?.invoicesLaut?.current ?? currentMonth?.invoicesLaut ?? 0
  const opCust = comparisons?.uniqueCustomers?.current ?? currentMonth?.uniqueCustomers ?? 0

  const opAirVolPct = opTotInv > 0 ? (opAirInv / opTotInv) * 100 : 0
  const opSeaVolPct = opTotInv > 0 ? (opSeaInv / opTotInv) * 100 : 0
  const opAvgInvCust = opCust > 0 ? opTotInv / opCust : 0

  const opPrevTotInv = prevMonth?.totalInvoices || 0
  const opPrevAirInv = prevMonth?.invoicesUdara || 0
  const opPrevSeaInv = prevMonth?.invoicesLaut || 0
  const opPrevCust = prevMonth?.uniqueCustomers || 0

  const opLyTotInv = lastYearSameMonth?.totalInvoices || 0
  const opLyAirInv = lastYearSameMonth?.invoicesUdara || 0
  const opLySeaInv = lastYearSameMonth?.invoicesLaut || 0
  const opLyCust = lastYearSameMonth?.uniqueCustomers || 0

  const opPrevAirPct = opPrevTotInv > 0 ? (opPrevAirInv / opPrevTotInv) * 100 : 0
  const opLyAirPct = opLyTotInv > 0 ? (opLyAirInv / opLyTotInv) * 100 : 0
  const opAirShareMomDiff = opAirVolPct - opPrevAirPct
  const opAirShareMomPct = opPrevAirPct > 0 ? ((opAirVolPct - opPrevAirPct) / opPrevAirPct) * 100 : undefined
  const opAirShareYoyDiff = opAirVolPct - opLyAirPct
  const opAirShareYoyPct = opLyAirPct > 0 ? ((opAirVolPct - opLyAirPct) / opLyAirPct) * 100 : undefined

  const opPrevSeaPct = opPrevTotInv > 0 ? (opPrevSeaInv / opPrevTotInv) * 100 : 0
  const opLySeaPct = opLyTotInv > 0 ? (opLySeaInv / opLyTotInv) * 100 : 0
  const opSeaShareMomDiff = opSeaVolPct - opPrevSeaPct
  const opSeaShareMomPct = opPrevSeaPct > 0 ? ((opSeaVolPct - opPrevSeaPct) / opPrevSeaPct) * 100 : undefined
  const opSeaShareYoyDiff = opSeaVolPct - opLySeaPct
  const opSeaShareYoyPct = opLySeaPct > 0 ? ((opSeaVolPct - opLySeaPct) / opLySeaPct) * 100 : undefined

  const opPrevAvgCust = opPrevCust > 0 ? opPrevTotInv / opPrevCust : 0
  const opLyAvgCust = opLyCust > 0 ? opLyTotInv / opLyCust : 0
  const opAvgCustMomDiff = opAvgInvCust - opPrevAvgCust
  const opAvgCustMomPct = opPrevAvgCust > 0 ? ((opAvgInvCust - opPrevAvgCust) / opPrevAvgCust) * 100 : undefined
  const opAvgCustYoyDiff = opAvgInvCust - opLyAvgCust
  const opAvgCustYoyPct = opLyAvgCust > 0 ? ((opAvgInvCust - opLyAvgCust) / opLyAvgCust) * 100 : undefined

  // Total konsolidasi cabang
  const totalOmzet = branchComparisons.reduce((acc, b) => acc + (b.current.totalTagihan || 0), 0)
  const totalBillCount = branchComparisons.reduce((acc, b) => acc + (b.current.totalInvoices || 0), 0)
  const totalUdaraAmount = branchComparisons.reduce((acc, b) => acc + (b.current.tagihanUdara || 0), 0)
  const totalLautAmount = branchComparisons.reduce((acc, b) => acc + (b.current.tagihanLaut || 0), 0)

  // Proporsi moda
  const totalTagihanAktual = comparisons?.totalTagihan?.current ?? currentMonth?.totalTagihan ?? 0
  const tagihanUdaraAktual = comparisons?.tagihanUdara?.current ?? currentMonth?.tagihanUdara ?? 0
  const tagihanLautAktual = comparisons?.tagihanLaut?.current ?? currentMonth?.tagihanLaut ?? 0
  const airPct = totalTagihanAktual > 0 ? (tagihanUdaraAktual / totalTagihanAktual) * 100 : 0
  const seaPct = totalTagihanAktual > 0 ? (tagihanLautAktual / totalTagihanAktual) * 100 : 0

  // Perhitungan statistik harian (30 hari)
  const dailyTotalAmount = daily.reduce((sum, d) => sum + (d.totalTagihan || 0), 0)
  const dailyTotalBills = daily.reduce((sum, d) => sum + (d.totalBill || 0), 0)
  const dailyAvgAmount = daily.length > 0 ? dailyTotalAmount / daily.length : 0
  const peakDailyPoint = daily.reduce(
    (max, cur) => ((cur.totalTagihan || 0) > (max.totalTagihan || 0) ? cur : max),
    daily[0] || {}
  )

  // Perhitungan statistik SJ vs Bill (30 Hari)
  const totalSjCount = sjVsBillData.reduce((sum, row) => sum + (Number(row.sj_all ?? row.sj) || 0), 0)
  const totalSjBilled = sjVsBillData.reduce((sum, row) => sum + (Number(row.bill_all ?? row.bill) || 0), 0)
  const totalSjUnbilled = sjVsBillData.reduce((sum, row) => sum + (Number(row.unbilled_all ?? row.unbilled) || 0), 0)
  const totalUnbilledListCodes = sjVsBillData.reduce((sum, row) => sum + (Number(row.unbilled_list_all ?? row.unbilledList) || 0), 0)
  const sjConversionRate = totalSjCount > 0 ? (totalSjBilled / totalSjCount) * 100 : 0

  const unbilledDistinctListCodes = useMemo(() => {
    const set = new Set(unbilledSjDetails.map((item) => item.listCode?.trim()).filter(Boolean))
    return set.size
  }, [unbilledSjDetails])

  // Agregasi cabang untuk Lembar 2 Operasional (Rasio Penagihan per Cabang Asal Kargo)
  const branchMetrics = batchExitSummary?.byBranch || []
  const branchCount = branchMetrics.length
  const totalBranchKargo = branchMetrics.reduce((acc, b) => acc + (b.totalKargo || 0), 0)
  const totalBranchBilled = branchMetrics.reduce((acc, b) => acc + (b.totalBilled || 0), 0)
  const totalBranchUnbilled = branchMetrics.reduce((acc, b) => acc + (b.totalUnbilled || 0), 0)
  const totalBranchBatches = branchMetrics.reduce((acc, b) => acc + (b.totalBatches || 0), 0)
  const totalBranchFullyBilledBatches = branchMetrics.reduce((acc, b) => acc + (b.fullyBilledBatches || 0), 0)
  const totalBranchPendingBatches = branchMetrics.reduce((acc, b) => acc + (b.pendingBatches || 0), 0)
  const totalBranchAirKargo = branchMetrics.reduce((acc, b) => acc + (b.airKargo || 0), 0)
  const totalBranchSeaKargo = branchMetrics.reduce((acc, b) => acc + (b.seaKargo || 0), 0)
  const totalBranchBilledPct = totalBranchKargo > 0 ? (totalBranchBilled / totalBranchKargo) * 100 : (batchExitSummary?.billedPercentage || 0)

  const topBilledBranch = useMemo(() => {
    if (branchMetrics.length === 0) return null
    return [...branchMetrics].sort((a, b) => b.billedPercentage - a.billedPercentage)[0] || null
  }, [branchMetrics])

  const highestUnbilledBranch = useMemo(() => {
    if (branchMetrics.length === 0) return null
    const sorted = [...branchMetrics].sort((a, b) => b.totalUnbilled - a.totalUnbilled)
    return sorted[0]?.totalUnbilled > 0 ? sorted[0] : null
  }, [branchMetrics])

  const formatDateDmy = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      const day = String(d.getDate()).padStart(2, '0')
      const mon = String(d.getMonth() + 1).padStart(2, '0')
      const year = d.getFullYear()
      return `${day}/${mon}/${year}`
    } catch {
      return dateStr
    }
  }

  const formatPicName = (pic?: string): string => {
    if (!pic) return '-'
    const p = pic.toLowerCase()
    if (p === 'yati') return 'Yati'
    if (p === 'kiki') return 'Kiki'
    if (p === 'thara') return 'Thara'
    if (p === 'ferly') return 'Ferly'
    if (p === 'rico') return 'Rico'
    return pic.charAt(0).toUpperCase() + pic.slice(1)
  }

  // Perhitungan statistik 12 bulan (Kuantiti & Nilai)
  const monthly12mSummary = useMemo(() => {
    let totalBill = 0
    let billUdara = 0
    let billLaut = 0
    let prevTotalBill = 0
    let totalTagihan = 0
    let tagihanUdara = 0
    let tagihanLaut = 0
    let prevTotalTagihan = 0

    for (const m of monthly) {
      const uCount = m.billUdara || 0
      const lCount = m.billLaut || 0
      const tCount = m.totalBill || (uCount + lCount)
      totalBill += tCount
      billUdara += uCount
      billLaut += lCount
      prevTotalBill += m.prevTotalBill || 0

      const uVal = Number(m.tagihanUdara || 0)
      const lVal = Number(m.tagihanLaut || 0)
      const tVal = Number(m.totalTagihan || (uVal + lVal))
      totalTagihan += tVal
      tagihanUdara += uVal
      tagihanLaut += lVal
      prevTotalTagihan += Number(m.prevTotalTagihan || 0)
    }

    const billYoYPct = prevTotalBill > 0 ? ((totalBill - prevTotalBill) / prevTotalBill) * 100 : 0
    const tagihanYoYPct = prevTotalTagihan > 0 ? ((totalTagihan - prevTotalTagihan) / prevTotalTagihan) * 100 : 0
    const airQtyShare = totalBill > 0 ? (billUdara / totalBill) * 100 : 0
    const seaQtyShare = totalBill > 0 ? (billLaut / totalBill) * 100 : 0

    return {
      totalBill,
      billUdara,
      billLaut,
      prevTotalBill,
      billYoYPct,
      billDiff: totalBill - prevTotalBill,
      totalTagihan,
      tagihanUdara,
      tagihanLaut,
      prevTotalTagihan,
      tagihanYoYPct,
      airQtyShare,
      seaQtyShare,
      avgMonthlyBill: monthly.length > 0 ? Math.round(totalBill / monthly.length) : 0,
      avgMonthlyTagihan: monthly.length > 0 ? totalTagihan / monthly.length : 0,
    }
  }, [monthly])

  // Perhitungan Performa PIC / User Pembuat Invoice (30 Hari)
  const employeePerformances = useMemo(() => {
    if (!byEmployeeSeries || !byEmployeeData) return []

    let grandTotalBills = 0

    const list = byEmployeeSeries.map((emp) => {
      let totalBills = 0

      for (const row of byEmployeeData) {
        totalBills += Number(row[emp.key] || 0)
      }

      grandTotalBills += totalBills

      return {
        key: emp.key,
        name: emp.name,
        totalBills,
      }
    })

    return list
      .map((item) => ({
        ...item,
        billShare: grandTotalBills > 0 ? (item.totalBills / grandTotalBills) * 100 : 0,
      }))
      .sort((a, b) => b.totalBills - a.totalBills)
  }, [byEmployeeSeries, byEmployeeData])

  const totalEmpBills = employeePerformances.reduce((acc, e) => acc + e.totalBills, 0)

  return (
    <div className="pdf-document-root" style={{ width: '1200px', backgroundColor: '#ffffff', color: '#0f172a' }}>
      {/* ══════════════════════════════════════════════════════════════════════
          SEGMEN 1 FINANCE (HALAMAN 1): RINGKASAN EKSEKUTIF FINANSIAL & OMZET
          ══════════════════════════════════════════════════════════════════════ */}
      {!isOperation && (
        <div
          className="pdf-page-sheet"
          style={{
            width: '1200px',
            height: '840px',
            boxSizing: 'border-box',
            padding: '24px 30px',
            backgroundColor: '#ffffff',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {/* Kop Resmi Eksekutif Finansial */}
            <div
              style={{
                borderBottom: '2.5px solid #0284c7',
                paddingBottom: '12px',
                marginBottom: '18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ display: 'inline-block', width: '14px', height: '14px', background: '#0284c7', borderRadius: '3px' }} />
                  <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '0.5px', color: '#0f172a', textTransform: 'uppercase' }}>
                    M-SHIPPING FINANCE EXECUTIVE REPORT
                  </span>
                </div>
                <p style={{ fontSize: '11.5px', color: '#475569', margin: '0 0 6px 0', fontWeight: 600 }}>
                  Bagian 1: Ringkasan Eksekutif, Pencapaian Omzet Penagihan &amp; Portofolio Finansial
                </p>
                <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#1e293b', marginTop: '4px' }}>
                  <span><strong>Periode Audit:</strong> {periodLabel}</span>
                  <span>•</span>
                  <span><strong>Filter Cabang:</strong> {selectedBranch === 'ALL' ? 'Semua Cabang Konsolidasi' : `Cabang ${selectedBranch}`}</span>
                  <span>•</span>
                  <span><strong>Evaluasi:</strong> vs {prevMonthName} (MoM) &amp; vs {lastYearMonthName} (YoY)</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '10.5px', color: '#64748b', lineHeight: 1.5 }}>
                <div style={{ fontWeight: 800, color: '#0284c7', fontSize: '11px', marginBottom: '2px' }}>CONFIDENTIAL / FINANCE</div>
                <div>Dicetak Oleh: <strong>{printedBy}</strong></div>
                <div>Waktu Cetak: {printTimeString}</div>
              </div>
            </div>

            {/* 4 Kartu KPI Utama Finansial (Murni Metrik Uang Rp) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
              {/* Total Omzet Penagihan */}
              <div style={{ border: '1.5px solid #cbd5e1', borderRadius: '12px', padding: '16px 18px', background: '#f8fafc' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase', marginBottom: '6px' }}>
                  💰 Total Omzet Tagihan
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                  {formatCurrency(kpis?.tagihanBulanIni ?? currentMonth?.totalTagihan ?? 0)}
                </div>
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                  Udara: <strong>{formatCompactRupiah(kpis?.tagihanBulanIniBreakdown?.udara ?? currentMonth?.tagihanUdara ?? 0)}</strong> | Laut: <strong>{formatCompactRupiah(kpis?.tagihanBulanIniBreakdown?.laut ?? currentMonth?.tagihanLaut ?? 0)}</strong>
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                  MoM: {(comparisons?.totalTagihan?.momPercent ?? 0) >= 0 ? '+' : ''}{(comparisons?.totalTagihan?.momPercent ?? 0).toFixed(1)}% vs {prevMonthName}
                </div>
              </div>

              {/* Omzet Tagihan Udara */}
              <div style={{ border: '1.5px solid #cbd5e1', borderRadius: '12px', padding: '16px 18px', background: '#f8fafc' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', marginBottom: '6px' }}>
                  ✈️ Omzet Tagihan (Udara)
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                  {formatCurrency(tagihanUdaraAktual)}
                </div>
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                  Pangsa Omzet: <strong>{airPct.toFixed(1)}%</strong> dari Total
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                  MoM: {(comparisons?.tagihanUdara?.momPercent ?? 0) >= 0 ? '+' : ''}{(comparisons?.tagihanUdara?.momPercent ?? 0).toFixed(1)}% vs {prevMonthName}
                </div>
              </div>

              {/* Omzet Tagihan Laut */}
              <div style={{ border: '1.5px solid #cbd5e1', borderRadius: '12px', padding: '16px 18px', background: '#f8fafc' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#047857', textTransform: 'uppercase', marginBottom: '6px' }}>
                  🚢 Omzet Tagihan (Laut)
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                  {formatCurrency(tagihanLautAktual)}
                </div>
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                  Pangsa Omzet: <strong>{seaPct.toFixed(1)}%</strong> dari Total
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                  MoM: {(comparisons?.tagihanLaut?.momPercent ?? 0) >= 0 ? '+' : ''}{(comparisons?.tagihanLaut?.momPercent ?? 0).toFixed(1)}% vs {prevMonthName}
                </div>
              </div>

              {/* Rata-rata Nilai per Tiket Faktur */}
              <div style={{ border: '1.5px solid #cbd5e1', borderRadius: '12px', padding: '16px 18px', background: '#f8fafc' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', marginBottom: '6px' }}>
                  🏷️ Rata-rata Nilai / Faktur
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                  {formatCurrency(comparisons?.avgInvoiceValue?.current ?? currentMonth?.avgInvoiceValue ?? 0)}
                </div>
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                  Tiket Faktur Rata-rata Pelanggan
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                  MoM: {(comparisons?.avgInvoiceValue?.momPercent ?? 0) >= 0 ? '+' : ''}{(comparisons?.avgInvoiceValue?.momPercent ?? 0).toFixed(1)}% vs {prevMonthName}
                </div>
              </div>
            </div>

            {/* 3 Quick Summary Highlights (MoM & YoY) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px 18px', background: '#ffffff' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Total Omzet Penagihan</span>
                <div style={{ fontSize: '19px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', margin: '4px 0' }}>
                  {formatCurrency(comparisons?.totalTagihan?.current ?? currentMonth?.totalTagihan ?? 0)}
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', fontWeight: 700 }}>
                  <span style={{ color: (comparisons?.totalTagihan?.momPercent ?? 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                    MoM: {(comparisons?.totalTagihan?.momPercent ?? 0) >= 0 ? '+' : ''}{(comparisons?.totalTagihan?.momPercent ?? 0).toFixed(1)}%
                  </span>
                  <span>•</span>
                  <span style={{ color: (comparisons?.totalTagihan?.yoyPercent ?? 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                    YoY: {(comparisons?.totalTagihan?.yoyPercent ?? 0) >= 0 ? '+' : ''}{(comparisons?.totalTagihan?.yoyPercent ?? 0).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px 18px', background: '#ffffff' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Realisasi Laut &amp; Udara</span>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', margin: '4px 0', lineHeight: 1.5 }}>
                  <div style={{ color: '#047857' }}>🚢 Laut: {formatCompactRupiah(tagihanLautAktual)}</div>
                  <div style={{ color: '#d97706' }}>✈️ Udara: {formatCompactRupiah(tagihanUdaraAktual)}</div>
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', fontWeight: 700 }}>
                  <span style={{ color: (comparisons?.tagihanLaut?.momPercent ?? 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                    MoM Laut: {(comparisons?.tagihanLaut?.momPercent ?? 0) >= 0 ? '+' : ''}{(comparisons?.tagihanLaut?.momPercent ?? 0).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px 18px', background: '#ffffff' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Nilai Rata-rata / Faktur</span>
                <div style={{ fontSize: '19px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', margin: '4px 0' }}>
                  {formatCurrency(comparisons?.avgInvoiceValue?.current ?? currentMonth?.avgInvoiceValue ?? 0)}
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', fontWeight: 700 }}>
                  <span style={{ color: (comparisons?.avgInvoiceValue?.momPercent ?? 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                    MoM: {(comparisons?.avgInvoiceValue?.momPercent ?? 0) >= 0 ? '+' : ''}{(comparisons?.avgInvoiceValue?.momPercent ?? 0).toFixed(1)}%
                  </span>
                  <span>•</span>
                  <span style={{ color: (comparisons?.avgInvoiceValue?.yoyPercent ?? 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                    YoY: {(comparisons?.avgInvoiceValue?.yoyPercent ?? 0) >= 0 ? '+' : ''}{(comparisons?.avgInvoiceValue?.yoyPercent ?? 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Panel Pangsa Moda Transportasi & Ringkasan Kebijakan Audit */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '18px 22px', background: '#f8fafc' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: '10px' }}>
                Pangsa Omzet Finansial Moda Transportasi (Udara vs Laut)
              </div>
              <div style={{ height: '14px', width: '100%', borderRadius: '7px', background: '#e2e8f0', overflow: 'hidden', display: 'flex', marginBottom: '10px' }}>
                <div style={{ width: `${airPct}%`, background: '#f59e0b' }} />
                <div style={{ width: `${seaPct}%`, background: '#0284c7' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '12px' }}>
                <span style={{ color: '#d97706' }}>✈️ Moda Udara: {airPct.toFixed(1)}% ({formatCurrency(tagihanUdaraAktual)})</span>
                <span style={{ color: '#0284c7' }}>🚢 Moda Laut: {seaPct.toFixed(1)}% ({formatCurrency(tagihanLautAktual)})</span>
              </div>
              <p style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.6, margin: 0, borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                Laporan ringkasan eksekutif keuangan ini diterbitkan secara otomatis oleh sistem ERP M-Shipping untuk keperluan audit finansial, evaluasi pencapaian omzet penagihan, serta pengawasan portofolio moda pengiriman.
              </p>
            </div>
          </div>

          {/* Footer Lembar 1 Finansial */}
          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
            <span>Sistem Finansial M-Shipping • Dokumen Sah Eksekutif Keuangan</span>
            <span>Lembar 1 dari {totalPages} (Ringkasan Eksekutif &amp; KPI Finansial)</span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SEGMEN 1 OPERATION (HALAMAN 1): RINGKASAN EKSEKUTIF OPERASIONAL & TARGET KARGO
          ══════════════════════════════════════════════════════════════════════ */}
      {isOperation && (
        <div
          className="pdf-page-sheet"
          style={{
            width: '1200px',
            height: '840px',
            boxSizing: 'border-box',
            padding: '24px 30px',
            backgroundColor: '#ffffff',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {/* Kop Resmi Eksekutif Operasional */}
            <div
              style={{
                borderBottom: '2.5px solid #059669',
                paddingBottom: '12px',
                marginBottom: '18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ display: 'inline-block', width: '14px', height: '14px', background: '#059669', borderRadius: '3px' }} />
                  <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '0.5px', color: '#0f172a', textTransform: 'uppercase' }}>
                    M-SHIPPING LOGISTICS &amp; BILLING OPERATIONS REPORT
                  </span>
                </div>
                <p style={{ fontSize: '11.5px', color: '#475569', margin: '0 0 6px 0', fontWeight: 600 }}>
                  Bagian 1: Ringkasan Eksekutif Target Kargo, Volume Faktur &amp; Kesiapan Pengiriman Fisik
                </p>
                <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#1e293b', marginTop: '4px' }}>
                  <span><strong>Periode Audit:</strong> {periodLabel}</span>
                  <span>•</span>
                  <span><strong>Filter Cabang:</strong> {selectedBranch === 'ALL' ? 'Semua Cabang Konsolidasi' : `Cabang ${selectedBranch}`}</span>
                  <span>•</span>
                  <span><strong>Status Penagihan:</strong> Realisasi Surat Jalan vs Penerbitan Bill</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '10.5px', color: '#64748b', lineHeight: 1.5 }}>
                <div style={{ fontWeight: 800, color: '#059669', fontSize: '11px', marginBottom: '2px' }}>CONFIDENTIAL / OPERATIONAL</div>
                <div>Dicetak Oleh: <strong>{printedBy}</strong></div>
                <div>Waktu Cetak: {printTimeString}</div>
              </div>
            </div>

            {/* ── 3 KARTU KPI OPERASIONAL (SAMA SEPERTI DI UI) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '16px' }}>
              {/* 1. Target Bill Udara */}
              <div
                style={{
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  background: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Target Bill (Udara)
                    </span>
                    <span style={{ fontSize: '11px', color: '#d97706' }}>✈️</span>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', lineHeight: 1.2 }}>
                    {formatNumber(kpis?.targetBillUdara?.total ?? 0)} <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>List</span>
                  </div>
                  {/* Category Pills Identik UI */}
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                    <span style={{ fontSize: '8.5px', fontWeight: 700, padding: '1.5px 5px', borderRadius: '4px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
                      SJ Sent: {kpis?.targetBillUdara?.categories?.sjSent ?? 0}
                    </span>
                    <span style={{ fontSize: '8.5px', fontWeight: 700, padding: '1.5px 5px', borderRadius: '4px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}>
                      COD: {kpis?.targetBillUdara?.categories?.codUrgent ?? 0}
                    </span>
                    {(kpis?.targetBillUdara?.categories?.agingGt7 ?? 0) > 0 && (
                      <span style={{ fontSize: '8.5px', fontWeight: 700, padding: '1.5px 5px', borderRadius: '4px', background: '#faf5ff', color: '#9333ea', border: '1px solid #e9d5ff' }}>
                        &gt;7 Hari: {kpis?.targetBillUdara?.categories?.agingGt7}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '6px', marginTop: '8px', fontSize: '9.5px', color: '#64748b' }}>
                  PIC: Kiki: <strong>{kpis?.targetBillUdara?.breakdown?.kiki ?? 0}</strong> | Yati: <strong>{kpis?.targetBillUdara?.breakdown?.yati ?? 0}</strong>
                </div>
              </div>

              {/* 2. Target Bill Laut */}
              <div
                style={{
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  background: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Target Bill (Laut)
                    </span>
                    <span style={{ fontSize: '11px', color: '#059669' }}>🚢</span>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', lineHeight: 1.2 }}>
                    {formatNumber(kpis?.targetBillLaut?.total ?? 0)} <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>List</span>
                  </div>
                  {/* Category Pills Identik UI */}
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                    <span style={{ fontSize: '8.5px', fontWeight: 700, padding: '1.5px 5px', borderRadius: '4px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
                      SJ Sent: {kpis?.targetBillLaut?.categories?.sjSent ?? 0}
                    </span>
                    <span style={{ fontSize: '8.5px', fontWeight: 700, padding: '1.5px 5px', borderRadius: '4px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}>
                      COD: {kpis?.targetBillLaut?.categories?.codUrgent ?? 0}
                    </span>
                    {(kpis?.targetBillLaut?.categories?.agingGt7 ?? 0) > 0 && (
                      <span style={{ fontSize: '8.5px', fontWeight: 700, padding: '1.5px 5px', borderRadius: '4px', background: '#faf5ff', color: '#9333ea', border: '1px solid #e9d5ff' }}>
                        &gt;7 Hari: {kpis?.targetBillLaut?.categories?.agingGt7}
                      </span>
                    )}
                    {(kpis?.targetBillLaut?.categories?.fcl ?? 0) > 0 && (
                      <span style={{ fontSize: '8.5px', fontWeight: 700, padding: '1.5px 5px', borderRadius: '4px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                        FCL: {kpis?.targetBillLaut?.categories?.fcl}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '6px', marginTop: '8px', fontSize: '9.5px', color: '#64748b' }}>
                  PIC: Thara: <strong>{kpis?.targetBillLaut?.breakdown?.thara ?? 0}</strong> | Rico: <strong>{kpis?.targetBillLaut?.breakdown?.rico ?? 0}</strong> | Ferly: <strong>{kpis?.targetBillLaut?.breakdown?.ferly ?? 0}</strong>
                </div>
              </div>

              {/* 3. Volume Faktur Diterbitkan */}
              <div
                style={{
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  background: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Volume Faktur Diterbitkan
                    </span>
                    <span style={{ fontSize: '11px', color: '#0284c7' }}>📄</span>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', lineHeight: 1.2 }}>
                    {formatNumber(kpis?.invoicesBulanIni ?? currentMonth?.totalInvoices ?? 0)} <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Bill</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#475569', marginTop: '6px' }}>
                    ✈️ {formatNumber(kpis?.invoicesBulanIniBreakdown?.udara ?? currentMonth?.invoicesUdara ?? 0)} Bill • 🚢 {formatNumber(kpis?.invoicesBulanIniBreakdown?.laut ?? currentMonth?.invoicesLaut ?? 0)} Bill
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '6px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9.5px' }}>
                  <span style={{ color: '#64748b' }}>Pertumbuhan Faktur:</span>
                  <span style={{ fontWeight: 800, color: '#0284c7', fontFamily: 'monospace' }}>
                    {(comparisons?.totalInvoices?.momPercent ?? 0) >= 0 ? '+' : ''}{(comparisons?.totalInvoices?.momPercent ?? 0).toFixed(1)}% MoM
                  </span>
                </div>
              </div>
            </div>

            {/* ── WIDGET BLOK BATCH EXIT COMPARISON SECTION (IDENTIK SEPERTI DI UI) ── */}
            <div style={{ border: '1.5px solid #cbd5e1', borderRadius: '14px', padding: '14px 16px', background: '#f8fafc', marginBottom: '14px' }}>
              {/* Ribbon Header Widget */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-flex', padding: '4px', background: '#ecfdf5', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                    📦
                  </span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                        Perbandingan Batch Marking Exit vs Bill Dibuat
                      </span>
                      <span style={{ fontSize: '9.5px', fontWeight: 700, padding: '1px 6px', borderRadius: '999px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                        {periodLabel}
                      </span>
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '1px' }}>
                      Audit keselarasan kargo fisik yang keluar gudang terhadap faktur yang telah diterbitkan
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '9.5px', color: '#64748b' }}>
                  Pending: <strong style={{ color: '#d97706' }}>{batchExitSummary?.pendingBatches ?? 0} batch</strong>
                </div>
              </div>

              {/* Grid 2 Kolom Panel: Kiri (Hero & Moda) | Kanan (Status Customer Bars) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: '14px' }}>
                {/* ── PANEL KIRI: Rasio Penyelesaian, 3 Stat Kargo, & Dual Moda ── */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px', background: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  {/* Baris 1: Hero Number & 3 Stat Kargo */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: 600, color: '#64748b' }}>Rasio penyelesaian</div>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', lineHeight: 1.1, marginTop: '2px' }}>
                        {batchExitSummary?.billedPercentage ?? 0}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>
                        {formatNumber(batchExitSummary?.totalKargo ?? 0)}
                      </div>
                      <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#0f172a' }}>Total kargo exit</div>
                      <div style={{ fontSize: '8.5px', color: '#64748b' }}>dari {batchExitSummary?.totalBatches ?? 0} batch</div>
                    </div>
                    <div style={{ borderLeft: '2px solid #10b981', paddingLeft: '8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'monospace', color: '#059669' }}>
                        {formatNumber(batchExitSummary?.totalBilled ?? 0)}
                      </div>
                      <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#0f172a' }}>Sudah terbit bill</div>
                      <div style={{ fontSize: '8.5px', color: '#059669', fontWeight: 600 }}>{batchExitSummary?.billedPercentage ?? 0}% kargo</div>
                    </div>
                    <div style={{ borderLeft: '2px solid #f59e0b', paddingLeft: '8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'monospace', color: '#d97706' }}>
                        {formatNumber(batchExitSummary?.totalUnbilled ?? 0)}
                      </div>
                      <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#0f172a' }}>Belum terbit bill</div>
                      <div style={{ fontSize: '8.5px', color: '#d97706', fontWeight: 600 }}>di {batchExitSummary?.pendingBatches ?? 0} batch</div>
                    </div>
                  </div>

                  {/* Baris 2: Thick Dual Progress Bar */}
                  <div style={{ height: '7px', width: '100%', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', display: 'flex', marginBottom: '10px' }}>
                    <div style={{ width: `${batchExitSummary?.billedPercentage ?? 0}%`, background: '#059669' }} />
                    <div style={{ width: `${100 - (batchExitSummary?.billedPercentage ?? 0)}%`, background: '#fde68a' }} />
                  </div>

                  {/* Baris 3: Dual Moda Breakdown (Udara vs Laut) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                    {/* Moda Udara */}
                    <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '6px 8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '9.5px', fontWeight: 700 }}>
                        <span style={{ color: '#92400e' }}>✈️ Moda Udara · {batchExitSummary?.air?.totalBatches ?? 0} batch</span>
                        <span style={{ color: '#d97706', fontFamily: 'monospace' }}>{batchExitSummary?.air?.billedPercentage ?? 0}%</span>
                      </div>
                      <div style={{ height: '4px', width: '100%', background: '#fde68a', borderRadius: '999px', overflow: 'hidden', margin: '4px 0' }}>
                        <div style={{ height: '100%', width: `${batchExitSummary?.air?.billedPercentage ?? 0}%`, background: '#d97706' }} />
                      </div>
                      <div style={{ fontSize: '8.5px', color: '#78350f', display: 'flex', justifyContent: 'space-between' }}>
                        <span><strong>{formatNumber(batchExitSummary?.air?.totalBilled ?? 0)}</strong> bill · <strong>{formatNumber(batchExitSummary?.air?.totalUnbilled ?? 0)}</strong> belum</span>
                        <span>Total <strong>{formatNumber(batchExitSummary?.air?.totalKargo ?? 0)}</strong></span>
                      </div>
                    </div>

                    {/* Moda Laut */}
                    <div style={{ background: '#f0f9ff', border: '1px solid #e0f2fe', borderRadius: '8px', padding: '6px 8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '9.5px', fontWeight: 700 }}>
                        <span style={{ color: '#075985' }}>🚢 Moda Laut · {batchExitSummary?.sea?.totalBatches ?? 0} batch</span>
                        <span style={{ color: '#0284c7', fontFamily: 'monospace' }}>{batchExitSummary?.sea?.billedPercentage ?? 0}%</span>
                      </div>
                      <div style={{ height: '4px', width: '100%', background: '#bae6fd', borderRadius: '999px', overflow: 'hidden', margin: '4px 0' }}>
                        <div style={{ height: '100%', width: `${batchExitSummary?.sea?.billedPercentage ?? 0}%`, background: '#0284c7' }} />
                      </div>
                      <div style={{ fontSize: '8.5px', color: '#0c4a6e', display: 'flex', justifyContent: 'space-between' }}>
                        <span><strong>{formatNumber(batchExitSummary?.sea?.totalBilled ?? 0)}</strong> bill · <strong>{formatNumber(batchExitSummary?.sea?.totalUnbilled ?? 0)}</strong> belum</span>
                        <span>Total <strong>{formatNumber(batchExitSummary?.sea?.totalKargo ?? 0)}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── PANEL KANAN: Kelengkapan Bill Per Status Customer (5 Bar Sesuai UI) ── */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px', background: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                        Kelengkapan Bill per Status Customer
                      </span>
                      <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: '#f1f5f9', color: '#475569' }}>
                        Total {formatNumber(batchExitSummary?.totalKargo ?? 0)} Kargo
                      </span>
                    </div>
                    <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '8px' }}>
                      Persentase kargo yang sudah diterbitkan tagihan berdasarkan profil pelanggan
                    </div>

                    {/* 5 Baris Status Customer (Blocked, Warning, Urgent, COD, OK) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {[
                        {
                          label: 'Blocked',
                          badgeBg: '#fee2e2',
                          badgeColor: '#991b1b',
                          barColor: '#dc2626',
                          data: batchExitSummary?.byCustomerStatus?.blocked,
                        },
                        {
                          label: 'Warning',
                          badgeBg: '#fef3c7',
                          badgeColor: '#92400e',
                          barColor: '#d97706',
                          data: batchExitSummary?.byCustomerStatus?.warning,
                        },
                        {
                          label: 'Urgent',
                          badgeBg: '#e0f2fe',
                          badgeColor: '#075985',
                          barColor: '#0284c7',
                          data: batchExitSummary?.byCustomerStatus?.urgent,
                        },
                        {
                          label: 'COD',
                          badgeBg: '#ccfbf1',
                          badgeColor: '#115e59',
                          barColor: '#0d9488',
                          data: batchExitSummary?.byCustomerStatus?.cod,
                        },
                        {
                          label: 'OK',
                          badgeBg: '#f1f5f9',
                          badgeColor: '#334155',
                          barColor: '#64748b',
                          data: batchExitSummary?.byCustomerStatus?.ok,
                        },
                      ].map((st) => {
                        const total = st.data?.totalKargo ?? 0
                        const unbilled = st.data?.totalUnbilled ?? 0
                        const pct = st.data?.billedPercentage ?? 0

                        return (
                          <div key={st.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Badge Label */}
                            <span
                              style={{
                                width: '56px',
                                textAlign: 'center',
                                padding: '2px 0',
                                borderRadius: '4px',
                                fontSize: '9px',
                                fontWeight: 800,
                                background: st.badgeBg,
                                color: st.badgeColor,
                                flexShrink: 0,
                              }}
                            >
                              {st.label}
                            </span>

                            {/* Bar & Subketerangan */}
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${pct}%`, background: st.barColor }} />
                                </div>
                                <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '9.5px', color: '#0f172a', width: '36px', textAlign: 'right' }}>
                                  {pct.toFixed(0)}%
                                </span>
                              </div>
                              <div style={{ fontSize: '8.5px', color: '#64748b', marginTop: '1px' }}>
                                {formatNumber(total)} kargo · {unbilled === 0 ? <strong style={{ color: '#16a34a' }}>tuntas</strong> : <span>{formatNumber(unbilled)} belum</span>}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Note Penutup Eksekutif */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', background: '#ffffff', fontSize: '9px', color: '#64748b', lineHeight: 1.4 }}>
              <strong>Catatan Operasional:</strong> Laporan ini diselaraskan langsung dengan dashboard operasional ERP. Rincian rasio penagihan per cabang logistik tersedia di Lembar 2, evaluasi matriks volume di Lembar 3, produktivitas PIC di Lembar 4 &amp; 5, arus SJ vs faktur di Lembar 6 &amp; 7, dan rincian lengkap seluruh batch marking exit tersedia di Lembar 10.
            </div>
          </div>

          {/* Footer Lembar 1 Operasional */}
          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
            <span>Sistem Operasional M-Shipping • Dokumen Sah Eksekutif Operasional</span>
            <span>Lembar 1 dari {totalPages} (Ringkasan Eksekutif Operasional &amp; Target Kargo)</span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SEGMEN 2 OPERATION (HALAMAN 2 BARU): RASIO PENAGIHAN PER CABANG ASAL KARGO
          ══════════════════════════════════════════════════════════════════════ */}
      {isOperation && (
        <div
          className="pdf-page-sheet"
          style={{
            width: '1200px',
            height: '840px',
            boxSizing: 'border-box',
            padding: '24px 30px',
            backgroundColor: '#ffffff',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {/* Header Lembar 2 Operasional */}
            <div
              style={{
                borderBottom: '2.5px solid #059669',
                paddingBottom: '12px',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#059669', borderRadius: '3px' }} />
                  <span style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    M-SHIPPING OPERATION REPORT — RASIO PENAGIHAN PER CABANG ASAL KARGO
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: '#475569', margin: '0', fontWeight: 600 }}>
                  Bagian 2: Distribusi Realisasi Faktur, Kargo Billed vs Sisa per Cabang Logistik &amp; Moda Pengiriman ({periodLabel})
                </p>
              </div>
              <div style={{ textAlign: 'right', fontSize: '10.5px', color: '#64748b' }}>
                <div>Periode: <strong>{periodLabel}</strong></div>
                <div>Status: <strong>CONFIDENTIAL / OPERATIONAL</strong></div>
              </div>
            </div>

            {/* 4 Mini KPI Cards Ringkasan Cabang & Kargo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '14px' }}>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', background: '#f8fafc', borderLeft: '4px solid #0284c7' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Cabang Logistik</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', margin: '2px 0' }}>
                  {branchCount} <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Cabang Aktif</span>
                </div>
                <div style={{ fontSize: '9px', color: '#64748b' }}>Singapore menyatukan kode <strong style={{ color: '#0f172a' }}>--</strong> dan <strong style={{ color: '#0f172a' }}>SG</strong></div>
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', background: '#f8fafc', borderLeft: '4px solid #6366f1' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Kargo Exit Gudang</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#4338ca', fontFamily: 'monospace', margin: '2px 0' }}>
                  {formatNumber(totalBranchKargo)} <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Kargo</span>
                </div>
                <div style={{ fontSize: '9px', color: '#64748b' }}>Terkonsolidasi dari {formatNumber(totalBranchBatches)} batch marking</div>
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', background: '#f8fafc', borderLeft: '4px solid #059669' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Sudah Terbit Faktur (Billed)</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#059669', fontFamily: 'monospace', margin: '2px 0' }}>
                  {formatNumber(totalBranchBilled)} <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669' }}>({totalBranchBilledPct.toFixed(1)}%)</span>
                </div>
                <div style={{ fontSize: '9px', color: '#059669', fontWeight: 600 }}>Telah terbit invoice resmi operasional</div>
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', background: '#f8fafc', borderLeft: '4px solid #d97706' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Sisa Belum Ditagih (Unbilled)</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: totalBranchUnbilled > 0 ? '#d97706' : '#64748b', fontFamily: 'monospace', margin: '2px 0' }}>
                  {formatNumber(totalBranchUnbilled)} <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Kargo</span>
                </div>
                <div style={{ fontSize: '9px', color: totalBranchUnbilled > 0 ? '#b45309' : '#64748b' }}>
                  {totalBranchPendingBatches > 0 ? `${totalBranchPendingBatches} batch marking masih pending` : 'Seluruh batch telah tuntas'}
                </div>
              </div>
            </div>

            {/* 2 Highlight Cards: Cabang Kinerja Tertinggi & Fokus Penagihan */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '18px' }}>🏆</div>
                <div style={{ fontSize: '10px', color: '#166534', flex: 1 }}>
                  <strong>Rasio Penyelesaian Tertinggi:</strong>{' '}
                  {topBilledBranch ? (
                    <span>
                      Cabang <strong>{topBilledBranch.branchName}</strong> ({topBilledBranch.branchCode === 'SG' ? '-- & SG' : topBilledBranch.branchCode}) mencapai{' '}
                      <strong style={{ fontFamily: 'monospace' }}>{topBilledBranch.billedPercentage.toFixed(1)}%</strong> ({formatNumber(topBilledBranch.totalBilled)} dari {formatNumber(topBilledBranch.totalKargo)} kargo) di {topBilledBranch.fullyBilledBatches} batch tuntas.
                    </span>
                  ) : (
                    <span>Belum ada data kargo pada periode ini.</span>
                  )}
                </div>
              </div>

              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '18px' }}>⚠️</div>
                <div style={{ fontSize: '10px', color: '#92400e', flex: 1 }}>
                  <strong>Prioritas Follow-Up Penagihan:</strong>{' '}
                  {highestUnbilledBranch ? (
                    <span>
                      Cabang <strong>{highestUnbilledBranch.branchName}</strong> ({highestUnbilledBranch.branchCode === 'SG' ? '-- & SG' : highestUnbilledBranch.branchCode}) memiliki backlog tertinggi{' '}
                      <strong style={{ fontFamily: 'monospace' }}>{formatNumber(highestUnbilledBranch.totalUnbilled)} kargo</strong> di {highestUnbilledBranch.pendingBatches} batch pending.
                    </span>
                  ) : (
                    <span>Seluruh cabang telah menyelesaikan penagihan 100%.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Tabel Utama: Rasio Penagihan per Cabang Asal Kargo */}
            <div style={{ border: '1.5px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden', background: '#ffffff', marginBottom: '14px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#1e293b', textTransform: 'uppercase', fontSize: '10px' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '35px' }}>#</th>
                    <th style={{ padding: '8px 12px', width: '190px' }}>Cabang Asal Kargo</th>
                    <th style={{ padding: '8px 12px', width: '240px' }}>Rasio Penagihan (Billed)</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', width: '100px' }}>Billed</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', width: '100px' }}>Sisa (Unbilled)</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', width: '100px' }}>Total Kargo</th>
                    <th style={{ padding: '8px 12px', width: '180px' }}>Batch (Tuntas · Pending)</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', width: '150px' }}>Moda Kargo</th>
                  </tr>
                </thead>
                <tbody>
                  {branchMetrics.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                        Tidak ada data rasio penagihan cabang yang tercatat untuk periode {periodLabel}.
                      </td>
                    </tr>
                  ) : (
                    branchMetrics.map((br, bIdx) => {
                      const isOver80 = br.billedPercentage >= 80
                      const isOver50 = br.billedPercentage >= 50
                      const barColor = isOver80 ? '#059669' : isOver50 ? '#d97706' : br.billedPercentage > 0 ? '#e11d48' : '#cbd5e1'
                      const textColor = isOver80 ? '#059669' : isOver50 ? '#d97706' : br.billedPercentage > 0 ? '#e11d48' : '#64748b'

                      return (
                        <tr
                          key={br.branchCode}
                          style={{
                            borderBottom: '1px solid #e2e8f0',
                            backgroundColor: bIdx % 2 === 0 ? '#ffffff' : '#fcfcfd',
                          }}
                        >
                          <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b', fontFamily: 'monospace', fontSize: '10px' }}>
                            {bIdx + 1}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 800, color: '#0f172a' }}>{br.branchName}</span>
                              <span style={{ fontSize: '9.5px', fontFamily: 'monospace', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569' }}>
                                {br.branchCode === 'SG' ? '-- & SG' : br.branchCode}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, br.billedPercentage))}%`, background: barColor }} />
                              </div>
                              <span style={{ fontFamily: 'monospace', fontWeight: 800, width: '48px', textAlign: 'right', fontSize: '11px', color: textColor }}>
                                {br.billedPercentage.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#059669' }}>
                            {formatNumber(br.totalBilled)}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: br.totalUnbilled > 0 ? '#d97706' : '#64748b' }}>
                            {formatNumber(br.totalUnbilled)}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>
                            {formatNumber(br.totalKargo)}
                          </td>
                          <td style={{ padding: '8px 12px', fontSize: '10.5px', color: '#334155' }}>
                            <strong style={{ color: '#0f172a' }}>{br.totalBatches} Batch</strong>
                            <span style={{ color: '#64748b', fontSize: '9.5px', marginLeft: '4px' }}>
                              ({br.fullyBilledBatches} tuntas · {br.pendingBatches} pending)
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: '10px', fontFamily: 'monospace' }}>
                            {br.airKargo > 0 && (
                              <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: '4px', background: '#fef3c7', border: '1px solid #fde68a', color: '#b45309', fontWeight: 700, marginRight: '4px' }}>
                                ✈️ {formatNumber(br.airKargo)}
                              </span>
                            )}
                            {br.seaKargo > 0 && (
                              <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: '4px', background: '#e0f2fe', border: '1px solid #bae6fd', color: '#0369a1', fontWeight: 700 }}>
                                🚢 {formatNumber(br.seaKargo)}
                              </span>
                            )}
                            {br.airKargo === 0 && br.seaKargo === 0 && <span style={{ color: '#94a3b8' }}>—</span>}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
                {branchMetrics.length > 0 && (
                  <tfoot>
                    <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 800, color: '#0f172a' }}>
                      <td style={{ padding: '9px 10px', textAlign: 'center', color: '#64748b' }}>Σ</td>
                      <td style={{ padding: '9px 12px' }}>
                        KONSOLIDASI SELURUH CABANG ({branchCount} CABANG)
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '8px', background: '#cbd5e1', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, totalBranchBilledPct))}%`, background: '#059669' }} />
                          </div>
                          <span style={{ fontFamily: 'monospace', fontWeight: 900, width: '48px', textAlign: 'right', fontSize: '11px', color: '#059669' }}>
                            {totalBranchBilledPct.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: '#059669' }}>
                        {formatNumber(totalBranchBilled)}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: totalBranchUnbilled > 0 ? '#d97706' : '#64748b' }}>
                        {formatNumber(totalBranchUnbilled)}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900 }}>
                        {formatNumber(totalBranchKargo)}
                      </td>
                      <td style={{ padding: '9px 12px', fontSize: '10.5px' }}>
                        <strong>{totalBranchBatches} Batch</strong> ({totalBranchFullyBilledBatches} tuntas · {totalBranchPendingBatches} pending)
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: '10px', fontFamily: 'monospace' }}>
                        <span style={{ color: '#b45309', fontWeight: 700, marginRight: '4px' }}>✈️ {formatNumber(totalBranchAirKargo)}</span>
                        <span style={{ color: '#0369a1', fontWeight: 700 }}>🚢 {formatNumber(totalBranchSeaKargo)}</span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Box Catatan Kepatuhan Operasional & Pedoman Cabang */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px', background: '#f8fafc', fontSize: '9.5px', color: '#475569', lineHeight: 1.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
                <strong style={{ color: '#0f172a', textTransform: 'uppercase', fontSize: '10px' }}>Pedoman Kepatuhan Penagihan Cabang:</strong>
                <span style={{ fontSize: '9px', color: '#64748b' }}>
                  Indikator: <span style={{ color: '#059669', fontWeight: 700 }}>Hijau ≥80% (Baik)</span> • <span style={{ color: '#d97706', fontWeight: 700 }}>Amber 50–79% (Dalam Proses)</span> • <span style={{ color: '#e11d48', fontWeight: 700 }}>Merah &lt;50% (Prioritas)</span>
                </span>
              </div>
              <div>
                1. <strong>Standardisasi Cabang:</strong> Seluruh kargo dengan kode cabang warisan <code>--</code> dan <code>SG</code> telah dikonsolidasikan ke dalam entitas <strong>SINGAPORE</strong> untuk keselarasan audit dengan database ERP.<br />
                2. <strong>Tindak Lanjut Operasional:</strong> Cabang dengan status kargo pending diwajibkan segera menerbitkan invoice penagihan resmi guna mencegah penumpukan kargo tak tertagih.<br />
                3. <strong>Navigasi Laporan:</strong> Matriks komparasi volume 3 periode disajikan pada <strong>Lembar 3</strong>, evaluasi produktivitas PIC pada <strong>Lembar 4 &amp; 5</strong>, monitoring arus SJ pada <strong>Lembar 6 &amp; 7</strong>, dan rincian lengkap batch marking exit pada <strong>Lembar 10</strong>.
              </div>
            </div>
          </div>

          {/* Footer Lembar 2 Operasional */}
          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
            <span>Sistem Operasional M-Shipping • Monitoring Rasio Penagihan Cabang Asal Kargo</span>
            <span>Lembar 2 dari {totalPages} (Rasio Penagihan per Cabang Asal Kargo)</span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SEGMEN 3 OPERATION (HALAMAN 3): MATRIKS KOMPARASI 3 PERIODE VOLUME OPERASIONAL
          ══════════════════════════════════════════════════════════════════════ */}
      {isOperation && (
        <div
          className="pdf-page-sheet"
          style={{
            width: '1200px',
            height: '840px',
            boxSizing: 'border-box',
            padding: '24px 30px',
            backgroundColor: '#ffffff',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {/* Header Lembar Matriks Operasional */}
            <div
              style={{
                borderBottom: '2.5px solid #059669',
                paddingBottom: '12px',
                marginBottom: '18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                  M-SHIPPING OPERATION REPORT — MATRIKS KOMPARASI 3 PERIODE (MoM &amp; YoY)
                </div>
                <p style={{ fontSize: '11px', color: '#475569', margin: '3px 0 0 0', fontWeight: 600 }}>
                  Bagian 3: Evaluasi Komparasi Kuantiti Faktur Diterbitkan, Distribusi Moda, dan Penetrasi Pelanggan (Non-Moneter)
                </p>
              </div>
              <div style={{ textAlign: 'right', fontSize: '10.5px', color: '#64748b' }}>
                <div>Periode: <strong>{periodLabel}</strong></div>
                <div>Status: <strong>CONFIDENTIAL / OPERATIONAL</strong></div>
              </div>
            </div>

            {/* Banner Indikator Periode */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '10px 16px',
                marginBottom: '16px',
                fontSize: '11px',
                display: 'flex',
                justifyContent: 'space-between',
                color: '#334155',
              }}
            >
              <span><strong>Bulan Berjalan:</strong> {currentMonth?.monthName || periodLabel}</span>
              <span><strong>Bulan Lalu (MoM):</strong> {prevMonth?.monthName || prevMonthName}</span>
              <span><strong>Tahun Lalu (YoY):</strong> {lastYearSameMonth?.monthName || lastYearMonthName}</span>
              <span><strong>Filter Cabang:</strong> {selectedBranch === 'ALL' ? 'Semua Cabang' : selectedBranch}</span>
            </div>

            {/* Tabel Matriks 7 Metrik Operasional */}
            <div style={{ border: '1.5px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#1e293b', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 14px' }}>Metrik Operasional Penagihan</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Volume Saat Ini ({periodLabel})</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>MoM Growth (%)</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>MoM Selisih (Diff)</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>YoY Growth (%)</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>YoY Selisih (Diff)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Total Faktur Terbit', val: `${formatNumber(comparisons?.totalInvoices?.current ?? currentMonth?.totalInvoices ?? 0)} Bill`, mom: comparisons?.totalInvoices?.momPercent, yoy: comparisons?.totalInvoices?.yoyPercent, momDiff: comparisons?.totalInvoices?.momDiff, yoyDiff: comparisons?.totalInvoices?.yoyDiff, unit: 'Bill' },
                    { label: 'Faktur Moda Udara', val: `${formatNumber(comparisons?.invoicesUdara?.current ?? currentMonth?.invoicesUdara ?? 0)} Bill`, mom: comparisons?.invoicesUdara?.momPercent, yoy: comparisons?.invoicesUdara?.yoyPercent, momDiff: comparisons?.invoicesUdara?.momDiff, yoyDiff: comparisons?.invoicesUdara?.yoyDiff, unit: 'Bill' },
                    { label: 'Faktur Moda Laut', val: `${formatNumber(comparisons?.invoicesLaut?.current ?? currentMonth?.invoicesLaut ?? 0)} Bill`, mom: comparisons?.invoicesLaut?.momPercent, yoy: comparisons?.invoicesLaut?.yoyPercent, momDiff: comparisons?.invoicesLaut?.momDiff, yoyDiff: comparisons?.invoicesLaut?.yoyDiff, unit: 'Bill' },
                    { label: 'Customer Unik Ditagih', val: `${formatNumber(comparisons?.uniqueCustomers?.current ?? currentMonth?.uniqueCustomers ?? 0)} Cust`, mom: comparisons?.uniqueCustomers?.momPercent, yoy: comparisons?.uniqueCustomers?.yoyPercent, momDiff: comparisons?.uniqueCustomers?.momDiff, yoyDiff: comparisons?.uniqueCustomers?.yoyDiff, unit: 'Cust' },
                    {
                      label: 'Pangsa Volume Udara',
                      val: `${opAirVolPct.toFixed(1)}%`,
                      mom: opAirShareMomPct,
                      yoy: opAirShareYoyPct,
                      momDiff: opAirShareMomDiff,
                      yoyDiff: opAirShareYoyDiff,
                      unit: '%',
                    },
                    {
                      label: 'Pangsa Volume Laut',
                      val: `${opSeaVolPct.toFixed(1)}%`,
                      mom: opSeaShareMomPct,
                      yoy: opSeaShareYoyPct,
                      momDiff: opSeaShareMomDiff,
                      yoyDiff: opSeaShareYoyDiff,
                      unit: '%',
                    },
                    {
                      label: 'Rata-rata Faktur / Customer',
                      val: `${opAvgInvCust.toFixed(1)} Bill/Cust`,
                      mom: opAvgCustMomPct,
                      yoy: opAvgCustYoyPct,
                      momDiff: opAvgCustMomDiff,
                      yoyDiff: opAvgCustYoyDiff,
                      unit: 'Bill/Cust',
                    },
                  ].map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfcfd' }}>
                      <td style={{ padding: '11px 14px', fontWeight: 700, color: '#0f172a' }}>{row.label}</td>
                      <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>{row.val}</td>
                      <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: (row.mom ?? 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                        {row.mom !== undefined ? `${(row.mom ?? 0) >= 0 ? '+' : ''}${row.mom.toFixed(1)}%` : '—'}
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: '11.5px', color: '#475569' }}>
                        {row.momDiff !== undefined ? `${(row.momDiff ?? 0) >= 0 ? '+' : ''}${typeof row.momDiff === 'number' ? row.momDiff.toFixed(1) : row.momDiff} ${row.unit || ''}` : '—'}
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: (row.yoy ?? 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                        {row.yoy !== undefined ? `${(row.yoy ?? 0) >= 0 ? '+' : ''}${row.yoy.toFixed(1)}%` : '—'}
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: '11.5px', color: '#475569' }}>
                        {row.yoyDiff !== undefined ? `${(row.yoyDiff ?? 0) >= 0 ? '+' : ''}${typeof row.yoyDiff === 'number' ? row.yoyDiff.toFixed(1) : row.yoyDiff} ${row.unit || ''}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px 18px', background: '#f8fafc' }}>
              <h5 style={{ fontSize: '11.5px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', margin: '0 0 6px 0' }}>
                Catatan Evaluasi Volume Operasional:
              </h5>
              <p style={{ fontSize: '11px', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                Matriks komparasi operasional ini berfokus 100% pada pergerakan kuantiti faktur terbit, dinamika pergeseran moda pengiriman, dan rasio penetrasi faktur per pelanggan tanpa melibatkan nilai nominal uang.
              </p>
            </div>
          </div>

          {/* Footer Lembar 3 Operasional */}
          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
            <span>Sistem Operasional M-Shipping • Analisis Komparasi 3 Periode</span>
            <span>Lembar 3 dari {totalPages} (Matriks Komparasi 3 Periode Volume Operasional)</span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SEGMEN 2 FINANCE (HALAMAN 2): MATRIKS KOMPARASI 3 PERIODE (8 METRIK FINANSIAL)
          ══════════════════════════════════════════════════════════════════════ */}
      {!isOperation && (
        <div
          className="pdf-page-sheet"
        style={{
          width: '1200px',
          height: '840px',
          boxSizing: 'border-box',
          padding: '24px 30px',
          backgroundColor: '#ffffff',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          {/* Header Lembar 2 */}
          <div
            style={{
              borderBottom: '2.5px solid #0284c7',
              paddingBottom: '12px',
              marginBottom: '18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                M-SHIPPING FINANCE REPORT — MATRIKS KOMPARASI 3 PERIODE (MoM &amp; YoY)
              </div>
              <p style={{ fontSize: '11px', color: '#475569', margin: '3px 0 0 0', fontWeight: 600 }}>
                Bagian 2: Evaluasi Mendalam 8 Metrik Kunci Finansial Bulan Ini vs Bulan Lalu vs Tahun Lalu
              </p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '10.5px', color: '#64748b' }}>
              <div>Periode: <strong>{periodLabel}</strong></div>
              <div>Status: <strong>CONFIDENTIAL</strong></div>
            </div>
          </div>

          {/* Banner Indikator Periode */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '10px 16px',
              marginBottom: '16px',
              fontSize: '11px',
              display: 'flex',
              justifyContent: 'space-between',
              color: '#334155',
            }}
          >
            <span><strong>Bulan Berjalan:</strong> {currentMonth?.monthName || periodLabel}</span>
            <span><strong>Bulan Lalu (MoM):</strong> {prevMonth?.monthName || prevMonthName}</span>
            <span><strong>Tahun Lalu (YoY):</strong> {lastYearSameMonth?.monthName || lastYearMonthName}</span>
            <span><strong>Filter Cabang:</strong> {selectedBranch === 'ALL' ? 'Semua Cabang' : selectedBranch}</span>
          </div>

          {/* Tabel Matriks 8 Metrik Finansial (Desain Lapang) */}
          <div style={{ border: '1.5px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#1e293b', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 14px' }}>Metrik Finansial Penagihan</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Nilai Saat Ini ({periodLabel})</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>MoM Growth (%)</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>MoM Selisih (Diff)</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>YoY Growth (%)</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>YoY Selisih (Diff)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Total Faktur Terbit', val: `${formatNumber(comparisons?.totalInvoices?.current ?? currentMonth?.totalInvoices ?? 0)} Bill`, mom: comparisons?.totalInvoices?.momPercent, yoy: comparisons?.totalInvoices?.yoyPercent, momDiff: comparisons?.totalInvoices?.momDiff, yoyDiff: comparisons?.totalInvoices?.yoyDiff, isCur: false },
                  { label: 'Total Omzet Tagihan', val: formatCurrency(comparisons?.totalTagihan?.current ?? currentMonth?.totalTagihan ?? 0), mom: comparisons?.totalTagihan?.momPercent, yoy: comparisons?.totalTagihan?.yoyPercent, momDiff: comparisons?.totalTagihan?.momDiff, yoyDiff: comparisons?.totalTagihan?.yoyDiff, isCur: true },
                  { label: 'Faktur Moda Udara', val: `${formatNumber(comparisons?.invoicesUdara?.current ?? currentMonth?.invoicesUdara ?? 0)} Bill`, mom: comparisons?.invoicesUdara?.momPercent, yoy: comparisons?.invoicesUdara?.yoyPercent, momDiff: comparisons?.invoicesUdara?.momDiff, yoyDiff: comparisons?.invoicesUdara?.yoyDiff, isCur: false },
                  { label: 'Tagihan Moda Udara', val: formatCurrency(comparisons?.tagihanUdara?.current ?? currentMonth?.tagihanUdara ?? 0), mom: comparisons?.tagihanUdara?.momPercent, yoy: comparisons?.tagihanUdara?.yoyPercent, momDiff: comparisons?.tagihanUdara?.momDiff, yoyDiff: comparisons?.tagihanUdara?.yoyDiff, isCur: true },
                  { label: 'Faktur Moda Laut', val: `${formatNumber(comparisons?.invoicesLaut?.current ?? currentMonth?.invoicesLaut ?? 0)} Bill`, mom: comparisons?.invoicesLaut?.momPercent, yoy: comparisons?.invoicesLaut?.yoyPercent, momDiff: comparisons?.invoicesLaut?.momDiff, yoyDiff: comparisons?.invoicesLaut?.yoyDiff, isCur: false },
                  { label: 'Tagihan Moda Laut', val: formatCurrency(comparisons?.tagihanLaut?.current ?? currentMonth?.tagihanLaut ?? 0), mom: comparisons?.tagihanLaut?.momPercent, yoy: comparisons?.tagihanLaut?.yoyPercent, momDiff: comparisons?.tagihanLaut?.momDiff, yoyDiff: comparisons?.tagihanLaut?.yoyDiff, isCur: true },
                  { label: 'Nilai Rata-rata / Faktur', val: formatCurrency(comparisons?.avgInvoiceValue?.current ?? currentMonth?.avgInvoiceValue ?? 0), mom: comparisons?.avgInvoiceValue?.momPercent, yoy: comparisons?.avgInvoiceValue?.yoyPercent, momDiff: comparisons?.avgInvoiceValue?.momDiff, yoyDiff: comparisons?.avgInvoiceValue?.yoyDiff, isCur: true },
                  { label: 'Customer Unik Ditagih', val: `${formatNumber(comparisons?.uniqueCustomers?.current ?? currentMonth?.uniqueCustomers ?? 0)} Cust`, mom: comparisons?.uniqueCustomers?.momPercent, yoy: comparisons?.uniqueCustomers?.yoyPercent, momDiff: comparisons?.uniqueCustomers?.momDiff, yoyDiff: comparisons?.uniqueCustomers?.yoyDiff, isCur: false },
                ].map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfcfd' }}>
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: '#0f172a' }}>{row.label}</td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>{row.val}</td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: (row.mom ?? 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                      {row.mom !== undefined ? `${(row.mom ?? 0) >= 0 ? '+' : ''}${row.mom.toFixed(1)}%` : '—'}
                    </td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: '11.5px', color: '#475569' }}>
                      {row.momDiff !== undefined ? (row.isCur ? formatCurrency(row.momDiff) : `${formatNumber(row.momDiff)} Bill`) : '—'}
                    </td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: (row.yoy ?? 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                      {row.yoy !== undefined ? `${(row.yoy ?? 0) >= 0 ? '+' : ''}${row.yoy.toFixed(1)}%` : '—'}
                    </td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: '11.5px', color: '#475569' }}>
                      {row.yoyDiff !== undefined ? (row.isCur ? formatCurrency(row.yoyDiff) : `${formatNumber(row.yoyDiff)} Bill`) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px 18px', background: '#f8fafc' }}>
            <h5 style={{ fontSize: '11.5px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', margin: '0 0 6px 0' }}>
              Catatan Interpretasi Data Finansial:
            </h5>
            <p style={{ fontSize: '11px', color: '#475569', lineHeight: 1.6, margin: 0 }}>
              Kenaikan persentase MoM mencerminkan akselerasi performa operasional bulan berjalan terhadap bulan sebelumnya, sedangkan persentase YoY memberikan tolak ukur stabilitas pertumbuhan tahunan terhadap siklus kargo tahun lalu pada bulan yang sama.
            </p>
          </div>
        </div>

        {/* Footer Lembar 2 */}
        <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
          <span>Sistem Finansial M-Shipping • Analisis Komparasi 3 Periode</span>
          <span>Lembar 2 dari {totalPages} (Matriks Komparasi 3 Periode)</span>
        </div>
      </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SEGMEN 3 (HALAMAN 3): RINCIAN KINERJA PENAGIHAN PER CABANG
          ══════════════════════════════════════════════════════════════════════ */}
      {!isOperation && (
        <div
          className="pdf-page-sheet"
        style={{
          width: '1200px',
          height: '840px',
          boxSizing: 'border-box',
          padding: '24px 30px',
          backgroundColor: '#ffffff',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          {/* Header Lembar 3 */}
          <div
            style={{
              borderBottom: '2.5px solid #0284c7',
              paddingBottom: '12px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                M-SHIPPING FINANCE REPORT — RINCIAN KINERJA PENAGIHAN PER CABANG
              </div>
              <p style={{ fontSize: '11px', color: '#475569', margin: '3px 0 0 0', fontWeight: 600 }}>
                Bagian 3: Kontribusi Omzet, Pertumbuhan, dan Komposisi Moda Seluruh Cabang Asal Logistik ({periodLabel})
              </p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '10.5px', color: '#64748b' }}>
              <div>Periode: <strong>{periodLabel}</strong></div>
              <div>Status: <strong>CONFIDENTIAL</strong></div>
            </div>
          </div>

          {/* Banner Singapore Normalisasi */}
          <div
            style={{
              background: '#f0fdfa',
              border: '1px solid #5eead4',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '16px',
              fontSize: '11px',
              color: '#0f766e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>🇸🇬 <strong>Agregasi Cabang Singapore:</strong> Sistem secara otomatis mengagregasi seluruh transaksi dengan kode cabang <code>SG</code> dan kode warisan <code>--</code> (e.g. <code>--S...</code>, <code>--A...</code>) ke dalam cabang Singapore / Batam.</span>
            <span style={{ fontWeight: 800 }}>Total {branchComparisons.length} Cabang Logistik</span>
          </div>

          {/* Tabel Lengkap Cabang (Desain Lapang) */}
          <div style={{ border: '1.5px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
            <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#1e293b', fontSize: '10.5px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 10px' }}>Cabang Asal Kargo</th>
                  <th style={{ padding: '10px 10px', textAlign: 'right' }}>Total Tagihan ({periodLabel})</th>
                  <th style={{ padding: '10px 10px', textAlign: 'right' }}>MoM vs {prevMonthName}</th>
                  <th style={{ padding: '10px 10px', textAlign: 'right' }}>YoY vs {lastYearMonthName}</th>
                  <th style={{ padding: '10px 10px', textAlign: 'right' }}>Volume Faktur (Bill)</th>
                  <th style={{ padding: '10px 10px', textAlign: 'right' }}>Proporsi Moda (Air / Sea)</th>
                  <th style={{ padding: '10px 10px', textAlign: 'right' }}>Pangsa Omzet (%)</th>
                </tr>
              </thead>
              <tbody>
                {branchComparisons.map((b, idx) => {
                  const totalModa = (b.current.invoicesUdara || 0) + (b.current.invoicesLaut || 0)
                  const airRatio = totalModa > 0 ? ((b.current.invoicesUdara || 0) / totalModa) * 100 : 0
                  const seaRatio = totalModa > 0 ? 100 - airRatio : 0
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfcfd' }}>
                      <td style={{ padding: '9px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontWeight: 800, fontSize: '10px', fontFamily: 'monospace' }}>
                            {b.branchCode}
                          </span>
                          <div>
                            <strong style={{ color: '#0f172a', display: 'block' }}>{b.branchName}</strong>
                            {b.branchCode === 'SG' && <span style={{ fontSize: '9px', color: '#64748b' }}>Termasuk kode '--'</span>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>
                        {formatCurrency(b.current.totalTagihan)}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: b.momTagihanPercent >= 0 ? '#16a34a' : '#dc2626' }}>
                        {b.momTagihanPercent >= 0 ? '+' : ''}{b.momTagihanPercent.toFixed(1)}%
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: b.yoyTagihanPercent >= 0 ? '#16a34a' : '#dc2626' }}>
                        {b.yoyTagihanPercent >= 0 ? '+' : ''}{b.yoyTagihanPercent.toFixed(1)}%
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'monospace' }}>
                        <strong style={{ color: '#0f172a' }}>{formatNumber(b.current.totalInvoices)} Bill</strong>
                        <span style={{ fontSize: '9.5px', color: '#64748b', display: 'block' }}>
                          {b.momInvoicesDiff >= 0 ? '+' : ''}{b.momInvoicesDiff} MoM
                        </span>
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontSize: '11px' }}>
                        <span style={{ color: '#d97706', fontWeight: 600 }}>✈️ {airRatio.toFixed(0)}% ({formatNumber(b.current.invoicesUdara)})</span>
                        <span style={{ color: '#0284c7', fontWeight: 600, marginLeft: '6px' }}>🚢 {seaRatio.toFixed(0)}% ({formatNumber(b.current.invoicesLaut)})</span>
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>
                        {b.shareOfTotal.toFixed(1)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot style={{ borderTop: '2.5px solid #0f172a', background: '#f8fafc', fontWeight: 800, fontFamily: 'monospace', fontSize: '11.5px' }}>
                <tr>
                  <td style={{ padding: '11px 10px', color: '#0f172a' }}>TOTAL KONSOLIDASI</td>
                  <td style={{ padding: '11px 10px', textAlign: 'right', color: '#0f172a' }}>{formatCurrency(totalOmzet)}</td>
                  <td colSpan={2} style={{ padding: '11px 10px', textAlign: 'center', color: '#64748b', fontSize: '10.5px' }}>
                    {branchComparisons.length} Cabang Terkonsolidasi
                  </td>
                  <td style={{ padding: '11px 10px', textAlign: 'right', color: '#0f172a' }}>{formatNumber(totalBillCount)} Bill</td>
                  <td style={{ padding: '11px 10px', textAlign: 'right', fontSize: '10.5px', color: '#475569' }}>
                    ✈️ {formatCurrency(totalUdaraAmount)} | 🚢 {formatCurrency(totalLautAmount)}
                  </td>
                  <td style={{ padding: '11px 10px', textAlign: 'right', color: '#0f172a' }}>100.0%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Footer Lembar 3 */}
        <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
          <span>Sistem Finansial M-Shipping • Analisis Cabang Logistik</span>
          <span>Lembar 3 dari {totalPages} (Rincian Kinerja Penagihan Per Cabang)</span>
        </div>
      </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SEGMEN 4 (HALAMAN 4): ANALITIK TREN BULANAN 12 BULAN & YoY (GRAFIK)
          ══════════════════════════════════════════════════════════════════════ */}
      {!isOperation && (
        <div
          className="pdf-page-sheet"
          style={{
            width: '1200px',
            height: '840px',
            boxSizing: 'border-box',
            padding: '24px 30px',
            backgroundColor: '#ffffff',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {/* Header Lembar 4 */}
            <div
              style={{
                borderBottom: '2.5px solid #0284c7',
                paddingBottom: '12px',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                  M-SHIPPING FINANCE REPORT — ANALITIK TREN BULANAN 12 BULAN &amp; YoY
                </div>
                <p style={{ fontSize: '11px', color: '#475569', margin: '3px 0 0 0', fontWeight: 600 }}>
                  Bagian 4: Kurva Perkembangan Omzet Bulanan per Moda (Udara &amp; Laut) serta Volume Kuantiti Faktur Diterbitkan (YoY)
                </p>
              </div>
              <div style={{ textAlign: 'right', fontSize: '10.5px', color: '#64748b' }}>
                <div>Rentang: <strong>12 Bulan Terakhir</strong></div>
                <div>Status: <strong>CONFIDENTIAL / FINANCIAL</strong></div>
              </div>
            </div>

            {/* 4 Kartu KPI Kuantiti & Finansial 12 Bulan */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '14px' }}>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', background: '#f8fafc', borderLeft: '4px solid #0284c7' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Total Kuantiti Faktur (12 Bln)
                </div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', margin: '2px 0' }}>
                  {formatNumber(monthly12mSummary.totalBill)} <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Bill</span>
                </div>
                <div style={{ fontSize: '9px', color: '#475569' }}>
                  ✈️ {formatNumber(monthly12mSummary.billUdara)} ({monthly12mSummary.airQtyShare.toFixed(0)}%) • 🚢 {formatNumber(monthly12mSummary.billLaut)} ({monthly12mSummary.seaQtyShare.toFixed(0)}%)
                </div>
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', background: '#f8fafc', borderLeft: '4px solid #16a34a' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Pertumbuhan Qty Bill (YoY)
                </div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: monthly12mSummary.billYoYPct >= 0 ? '#16a34a' : '#dc2626', fontFamily: 'monospace', margin: '2px 0' }}>
                  {monthly12mSummary.billYoYPct >= 0 ? '+' : ''}{monthly12mSummary.billYoYPct.toFixed(1)}%
                </div>
                <div style={{ fontSize: '9px', color: '#64748b' }}>
                  {monthly12mSummary.billDiff >= 0 ? '+' : ''}{formatNumber(monthly12mSummary.billDiff)} Bill vs Thn Lalu ({formatNumber(monthly12mSummary.prevTotalBill)})
                </div>
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', background: '#f8fafc', borderLeft: '4px solid #059669' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Total Omzet Tagihan (12 Bln)
                </div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', margin: '2px 0' }}>
                  {formatCurrency(monthly12mSummary.totalTagihan)}
                </div>
                <div style={{ fontSize: '9px', color: monthly12mSummary.tagihanYoYPct >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                  YoY: {monthly12mSummary.tagihanYoYPct >= 0 ? '+' : ''}{monthly12mSummary.tagihanYoYPct.toFixed(1)}% vs Thn Lalu
                </div>
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', background: '#f8fafc', borderLeft: '4px solid #d97706' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Rata-rata Bulanan
                </div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#0284c7', fontFamily: 'monospace', margin: '2px 0' }}>
                  {formatNumber(monthly12mSummary.avgMonthlyBill)} <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Bill/Bln</span>
                </div>
                <div style={{ fontSize: '9px', color: '#64748b' }}>
                  Omzet: ~{formatCompactRupiah(monthly12mSummary.avgMonthlyTagihan)} / bulan
                </div>
              </div>
            </div>

            {/* Grafik Tren Bulanan + Kuantiti Bar (Full Canvas Lega) */}
            <div style={{ border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '14px 18px', background: '#ffffff', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'uppercase' }}>
                    Kurva Penagihan 12 Bulan (Batang: Kuantiti Faktur Diterbitkan | Garis: Omzet Tagihan vs YoY)
                  </h4>
                </div>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
                  Sumbu Kiri: Omzet Tagihan (Rp) • Sumbu Kanan: Kuantiti Faktur (Bill)
                </span>
              </div>
              <div style={{ width: '100%' }}>
                <TrendChart
                  data={monthly}
                  isLoading={false}
                  emptyMessage="Tidak ada data tren bulanan"
                  isMobile={false}
                  metric="value"
                  modeFilter="all"
                  showYoY={true}
                  isMonthly={true}
                  chartHeight={420}
                  showQuantityBar={true}
                  hideSummaryBanner={true}
                />
              </div>
            </div>

            {/* Catatan Analisis Tren Finansial & Navigasi ke Lembar 5 */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px', background: '#f8fafc', fontSize: '10px', color: '#475569', lineHeight: 1.5 }}>
              <strong style={{ color: '#0f172a', textTransform: 'uppercase' }}>Catatan Analisis Tren Finansial: </strong>
              Visualisasi di atas memperlihatkan korelasi antara volume penerbitan faktur fisik dengan realisasi nilai nominal omzet tagihan selama 12 bulan terakhir. Rincian tabel data komparasi angka lengkap per bulan, moda kargo, dan pertumbuhan tahunan disajikan secara mandiri pada <strong>Lembar 5</strong>.
            </div>
          </div>

          {/* Footer Lembar 4 */}
          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', flexShrink: 0 }}>
            <span>Sistem Finansial M-Shipping • Analisis Tren Jangka Panjang</span>
            <span>Lembar 4 dari {totalPages} (Kurva Tren Penagihan Bulanan 12 Bulan &amp; YoY)</span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SEGMEN 4B (HALAMAN 5): TABEL REKAPITULASI KINERJA PENAGIHAN 12 BULAN
          ══════════════════════════════════════════════════════════════════════ */}
      {!isOperation && (
        <div
          className="pdf-page-sheet"
          style={{
            width: '1200px',
            height: '840px',
            boxSizing: 'border-box',
            padding: '24px 30px',
            backgroundColor: '#ffffff',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {/* Header Lembar 5 */}
            <div
              style={{
                borderBottom: '2.5px solid #0284c7',
                paddingBottom: '12px',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                  M-SHIPPING FINANCE REPORT — REKAPITULASI KINERJA PENAGIHAN 12 BULAN TERAKHIR
                </div>
                <p style={{ fontSize: '11px', color: '#475569', margin: '3px 0 0 0', fontWeight: 600 }}>
                  Bagian 5: Tabel Rekapitulasi Lengkap Kuantiti Faktur &amp; Nominal Omzet per Moda (Udara &amp; Laut) Serta Perbandingan Pertumbuhan Tahunan (YoY)
                </p>
              </div>
              <div style={{ textAlign: 'right', fontSize: '10.5px', color: '#64748b' }}>
                <div>Rentang: <strong>12 Periode Konsolidasi</strong></div>
                <div>Status: <strong>CONFIDENTIAL / AUDITED</strong></div>
              </div>
            </div>

            {/* 4 Mini Summary Cards 12 Bulan */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '14px' }}>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', background: '#f8fafc', borderLeft: '4px solid #0284c7' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Omzet Tagihan (12 Bln)</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', margin: '2px 0' }}>
                  {formatCurrency(monthly12mSummary.totalTagihan)}
                </div>
                <div style={{ fontSize: '9px', color: monthly12mSummary.tagihanYoYPct >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                  YoY: {monthly12mSummary.tagihanYoYPct >= 0 ? '+' : ''}{monthly12mSummary.tagihanYoYPct.toFixed(1)}% vs Thn Lalu
                </div>
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', background: '#f8fafc', borderLeft: '4px solid #059669' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Kuantiti Faktur (12 Bln)</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', margin: '2px 0' }}>
                  {formatNumber(monthly12mSummary.totalBill)} <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Bill</span>
                </div>
                <div style={{ fontSize: '9px', color: '#64748b' }}>
                  ✈️ {formatNumber(monthly12mSummary.billUdara)} ({monthly12mSummary.airQtyShare.toFixed(0)}%) · 🚢 {formatNumber(monthly12mSummary.billLaut)} ({monthly12mSummary.seaQtyShare.toFixed(0)}%)
                </div>
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', background: '#f8fafc', borderLeft: '4px solid #d97706' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Rata-rata Nilai per Bill</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', margin: '2px 0' }}>
                  {formatCurrency(monthly12mSummary.totalBill > 0 ? Math.round(monthly12mSummary.totalTagihan / monthly12mSummary.totalBill) : 0)}
                </div>
                <div style={{ fontSize: '9px', color: '#b45309' }}>Efisiensi nominal transaksi</div>
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', background: '#f8fafc', borderLeft: '4px solid #7c3aed' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Rata-rata Omzet / Bulan</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', margin: '2px 0' }}>
                  ~{formatCompactRupiah(monthly12mSummary.avgMonthlyTagihan)}
                </div>
                <div style={{ fontSize: '9px', color: '#64748b' }}>
                  Rata-rata volume: {formatNumber(monthly12mSummary.avgMonthlyBill)} Bill/bulan
                </div>
              </div>
            </div>

            {/* Tabel Rekap Data Bulanan (12 Bulan Lengkap Kuantiti & Finansial) - Standalone Page */}
            <div style={{ border: '1.5px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden', background: '#ffffff', marginBottom: '14px' }}>
              <div style={{ background: '#f8fafc', padding: '8px 14px', borderBottom: '1.5px solid #cbd5e1', fontSize: '11px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Rekapitulasi Lengkap 12 Bulan Terakhir (Kuantiti Bill &amp; Nominal Omzet)</span>
                <span style={{ color: '#64748b', fontWeight: 700, fontSize: '10px' }}>12 Periode Konsolidasi Resmi</span>
              </div>
              <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #cbd5e1', background: '#f1f5f9', color: '#334155', fontSize: '9.5px', textTransform: 'uppercase', fontWeight: 800 }}>
                    <th style={{ padding: '6px 10px' }}>Bulan</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Qty Udara</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Qty Laut</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 900, color: '#0f172a' }}>Total Qty (Bill)</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>YoY Qty (%)</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Omzet Udara</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Omzet Laut</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 900, color: '#0f172a' }}>Total Omzet</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>YoY Omzet (%)</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Rata-rata/Bill</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((m, idx) => {
                    const uCount = m.billUdara || 0
                    const lCount = m.billLaut || 0
                    const totCount = m.totalBill || (uCount + lCount)
                    const prevCount = m.prevTotalBill || 0
                    const qtyYoY = prevCount > 0 ? ((totCount - prevCount) / prevCount) * 100 : undefined

                    const uVal = m.tagihanUdara || 0
                    const lVal = m.tagihanLaut || 0
                    const totVal = m.totalTagihan || (uVal + lVal)
                    const prevVal = m.prevTotalTagihan || 0
                    const valYoY = prevVal > 0 ? ((totVal - prevVal) / prevVal) * 100 : undefined
                    const avgPerBill = totCount > 0 ? Math.round(totVal / totCount) : 0

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '5px 10px', fontWeight: 800, color: '#0f172a' }}>{m.label || (m as any).date || ''}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#0369a1', fontWeight: 600 }}>{formatNumber(uCount)}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#047857', fontWeight: 600 }}>{formatNumber(lCount)}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>{formatNumber(totCount)} Bill</td>
                        <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: (qtyYoY ?? 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                          {qtyYoY !== undefined ? `${qtyYoY >= 0 ? '+' : ''}${qtyYoY.toFixed(1)}%` : '—'}
                        </td>
                        <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(uVal)}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(lVal)}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>{formatCurrency(totVal)}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: (valYoY ?? 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                          {valYoY !== undefined ? `${valYoY >= 0 ? '+' : ''}${valYoY.toFixed(1)}%` : '—'}
                        </td>
                        <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#475569', fontWeight: 600 }}>{formatCurrency(avgPerBill)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot style={{ borderTop: '2.5px solid #0f172a', background: '#f1f5f9', fontWeight: 800, fontFamily: 'monospace', fontSize: '10px' }}>
                  <tr>
                    <td style={{ padding: '6px 10px', color: '#0f172a', textTransform: 'uppercase' }}>TOTAL 12 BULAN</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: '#0369a1' }}>{formatNumber(monthly12mSummary.billUdara)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: '#047857' }}>{formatNumber(monthly12mSummary.billLaut)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: '#0f172a', fontWeight: 900 }}>{formatNumber(monthly12mSummary.totalBill)} Bill</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: monthly12mSummary.billYoYPct >= 0 ? '#16a34a' : '#dc2626' }}>
                      {monthly12mSummary.billYoYPct >= 0 ? '+' : ''}{monthly12mSummary.billYoYPct.toFixed(1)}%
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right' }}>{formatCurrency(monthly12mSummary.tagihanUdara)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right' }}>{formatCurrency(monthly12mSummary.tagihanLaut)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: '#0f172a', fontWeight: 900 }}>{formatCurrency(monthly12mSummary.totalTagihan)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: monthly12mSummary.tagihanYoYPct >= 0 ? '#16a34a' : '#dc2626' }}>
                      {monthly12mSummary.tagihanYoYPct >= 0 ? '+' : ''}{monthly12mSummary.tagihanYoYPct.toFixed(1)}%
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: '#0f172a' }}>
                      {formatCurrency(monthly12mSummary.totalBill > 0 ? Math.round(monthly12mSummary.totalTagihan / monthly12mSummary.totalBill) : 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Catatan Kepatuhan & Pedoman Audit Finansial */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px', background: '#f8fafc', fontSize: '10px', color: '#475569', lineHeight: 1.5 }}>
              <strong style={{ color: '#0f172a', textTransform: 'uppercase' }}>Pedoman Audit &amp; Kepatuhan Finansial: </strong>
              Angka kuantiti faktur dan omzet tagihan di atas mencerminkan seluruh transaksi billing yang telah berstatus resmi (terbit invoice) pada masing-masing periode bulan kalender. Persentase pertumbuhan tahunan (YoY) dihitung secara linier terhadap bulan yang sama pada tahun buku sebelumnya.
            </div>
          </div>

          {/* Footer Lembar 5 */}
          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', flexShrink: 0 }}>
            <span>Sistem Finansial M-Shipping • Rekapitulasi Komparatif Buku Besar</span>
            <span>Lembar 5 dari {totalPages} (Tabel Rekapitulasi Kinerja Finansial 12 Bulan &amp; YoY)</span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SEGMEN 5 (HALAMAN 6): ANALITIK TREN HARIAN (DAILY BILL 30 HARI)
          ══════════════════════════════════════════════════════════════════════ */}
      {!isOperation && (
        <div
          className="pdf-page-sheet"
        style={{
          width: '1200px',
          height: '840px',
          boxSizing: 'border-box',
          padding: '24px 30px',
          backgroundColor: '#ffffff',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          {/* Header Lembar 6 */}
          <div
            style={{
              borderBottom: '2.5px solid #0284c7',
              paddingBottom: '12px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                M-SHIPPING FINANCE REPORT — TREN PENAGIHAN HARIAN (DAILY BILL)
              </div>
              <p style={{ fontSize: '11px', color: '#475569', margin: '3px 0 0 0', fontWeight: 600 }}>
                Bagian 6: Fluktuasi Harian Penerbitan Tagihan dan Omzet Finansial {dailyRangeLabel}
              </p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '10.5px', color: '#64748b' }}>
              <div>Rentang: <strong>{dailyRangeLabel}</strong></div>
              <div>Status: <strong>CONFIDENTIAL</strong></div>
            </div>
          </div>

          {/* 3 Kartu Ringkasan Harian */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '16px' }}>
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px 18px', background: '#f8fafc' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Total Tagihan {dailyDaysFilter} Hari</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', margin: '4px 0' }}>
                {formatCurrency(dailyTotalAmount)}
              </div>
              <div style={{ fontSize: '11px', color: '#475569' }}>
                Volume: <strong>{formatNumber(dailyTotalBills)} Bill Diterbitkan</strong>
              </div>
            </div>

            <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px 18px', background: '#f8fafc' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Rata-rata Tagihan / Hari</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', margin: '4px 0' }}>
                {formatCurrency(dailyAvgAmount)}
              </div>
              <div style={{ fontSize: '11px', color: '#475569' }}>
                Rata-rata: <strong>{daily.length > 0 ? (dailyTotalBills / daily.length).toFixed(1) : 0} Bill / Hari</strong>
              </div>
            </div>

            <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px 18px', background: '#f8fafc' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Puncak Tagihan Harian (Peak Day)</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0284c7', fontFamily: 'monospace', margin: '4px 0' }}>
                {formatCurrency(peakDailyPoint.totalTagihan || 0)}
              </div>
              <div style={{ fontSize: '11px', color: '#475569' }}>
                Tanggal: <strong>{peakDailyPoint.label || peakDailyPoint.date || '-'}</strong> ({peakDailyPoint.totalBill || 0} Bill)
              </div>
            </div>
          </div>

          {/* Grafik Tren Harian (Full Canvas 380px) */}
          <div style={{ border: '1.5px solid #cbd5e1', borderRadius: '12px', padding: '16px 18px', background: '#ffffff', overflow: 'hidden' }}>
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: '8px' }}>
              Grafik Fluktuasi Harian Tagihan (Daily Bill {dailyRangeLabel})
            </div>
            <div style={{ width: '100%' }}>
              <TrendChart
                data={daily}
                isLoading={false}
                emptyMessage="Tidak ada data tren harian"
                isMobile={false}
                metric="value"
                modeFilter="all"
                isMonthly={false}
                chartHeight={310}
              />
            </div>
          </div>
        </div>

        {/* Footer Lembar 6 */}
        <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
          <span>Sistem Finansial M-Shipping • Analisis Harian Operasional</span>
          <span>Lembar 6 dari {totalPages} (Tren Penagihan Harian {dailyDaysFilter} Hari)</span>
        </div>
      </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SEGMEN 4 (HALAMAN 4 / LEMBAR 4 OPERASIONAL): TABEL REKAPITULASI PRODUKTIVITAS PIC
          ══════════════════════════════════════════════════════════════════════ */}
      {(isOperation || isAll) && (
        <div
          className="pdf-page-sheet"
          style={{
            width: '1200px',
            height: '840px',
            boxSizing: 'border-box',
            padding: '24px 30px',
            backgroundColor: '#ffffff',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {/* Header Lembar 4 */}
            <div
              style={{
                borderBottom: '2.5px solid #0284c7',
                paddingBottom: '12px',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                  M-SHIPPING OPERATION REPORT — EVALUASI PRODUKTIVITAS USER PEMBUAT INVOICE (PIC)
                </div>
                <p style={{ fontSize: '11px', color: '#475569', margin: '3px 0 0 0', fontWeight: 600 }}>
                  Bagian {isOperation ? 4 : 7}: Rekapitulasi &amp; Peringkat Produktivitas PIC Penagihan ({employeeRangeLabel})
                </p>
              </div>
              <div style={{ textAlign: 'right', fontSize: '10.5px', color: '#64748b' }}>
                <div>Rentang: <strong>{employeeRangeLabel}</strong></div>
                <div>Status: <strong>CONFIDENTIAL / OPERATIONAL</strong></div>
              </div>
            </div>

            {/* Banner Tim Penagihan & KPI Cepat */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '12px 18px',
                marginBottom: '16px',
                fontSize: '11.5px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: '#334155',
              }}
            >
              <div style={{ display: 'flex', gap: '24px' }}>
                <span>✈️ <strong>Tim Udara:</strong> Kiki, Yati</span>
                <span>🚢 <strong>Tim Laut:</strong> Thara, Rico, Ferly</span>
                <span>👥 <strong>PIC Aktif Terdata:</strong> {employeePerformances.length} User</span>
              </div>
              <div style={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', fontSize: '12.5px' }}>
                Total {employeeDaysFilter === 365 ? '1 Tahun' : `${employeeDaysFilter} Hari`}: {formatNumber(totalEmpBills)} Faktur Diterbitkan
              </div>
            </div>

            {/* Tabel Rekapitulasi Performa User Pembuat Invoice (Full Height & Lega) */}
            <div style={{ border: '1.5px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px', background: '#ffffff' }}>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderBottom: '1.5px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                  Tabel Peringkat &amp; Produktivitas User Pembuat Invoice (PIC Billing)
                </span>
                <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>
                  Berdasarkan Akumulasi Kuantiti Faktur Diterbitkan {employeeDaysFilter === 365 ? '1 Tahun Terakhir (12 Bulan)' : `${employeeDaysFilter} Hari Terakhir`}
                </span>
              </div>
              <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#1e293b', fontSize: '10.5px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 12px', width: '75px', textAlign: 'center' }}>Rank</th>
                    <th style={{ padding: '10px 12px' }}>Nama Karyawan / User (PIC)</th>
                    <th style={{ padding: '10px 12px', width: '100px' }}>Kode PIC</th>
                    <th style={{ padding: '10px 12px', width: '140px', textAlign: 'center' }}>Fokus Moda</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Kuantiti Faktur (Bill)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Pangsa Volume (%)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>{employeeDaysFilter === 365 ? 'Rata-rata / Bulan (Hari)' : 'Rata-rata Faktur / Hari'}</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', width: '140px' }}>Status Aktivitas</th>
                  </tr>
                </thead>
                <tbody>
                  {employeePerformances.map((emp, idx) => {
                    const rankBadge = idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`
                    const rankBg = idx === 0 ? '#fef3c7' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#ffedd5' : '#f8fafc'
                    const rankColor = idx === 0 ? '#92400e' : idx === 1 ? '#334155' : idx === 2 ? '#9a3412' : '#64748b'

                    const isAirTeam = ['kiki', 'yati'].includes(emp.key.toLowerCase())
                    const isSeaTeam = ['thara', 'rico', 'ferly'].includes(emp.key.toLowerCase())
                    const modaTag = isAirTeam ? '✈️ Moda Udara' : isSeaTeam ? '🚢 Moda Laut' : 'Konsolidasi'
                    const modaBg = isAirTeam ? '#eff6ff' : isSeaTeam ? '#f0fdf4' : '#f8fafc'
                    const modaColor = isAirTeam ? '#1d4ed8' : isSeaTeam ? '#047857' : '#475569'
                    const avgDailyBill = employeeDaysFilter === 365
                      ? `${(emp.totalBills / 12).toFixed(0)}/bln · ${(emp.totalBills / 365).toFixed(1)}/hari`
                      : `${(emp.totalBills / empDaysDivisor).toFixed(1)} Bill/Hari`

                    return (
                      <tr key={emp.key} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              padding: '3px 9px',
                              borderRadius: '4px',
                              background: rankBg,
                              color: rankColor,
                              fontWeight: 800,
                              fontSize: '11px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {rankBadge}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>
                              {emp.name.slice(0, 2).toUpperCase()}
                            </span>
                            <span style={{ fontSize: '12px' }}>{emp.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#64748b', fontSize: '11px' }}>
                          {emp.key}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '4px', background: modaBg, color: modaColor, fontSize: '10.5px', fontWeight: 700 }}>
                            {modaTag}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#0f172a', fontSize: '12px' }}>
                          {formatNumber(emp.totalBills)} <span style={{ fontSize: '10.5px', fontWeight: 600 }}>Bill</span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#0284c7', fontWeight: 800, fontSize: '12px' }}>
                          {emp.billShare.toFixed(1)}%
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#0f172a', fontSize: '11.5px' }}>
                          {avgDailyBill}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#f0fdf4', color: '#166534', fontSize: '10px', fontWeight: 700 }}>
                            Aktif Diterbitkan
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot style={{ borderTop: '2px solid #0f172a', background: '#f8fafc', fontWeight: 800, fontFamily: 'monospace', fontSize: '11.5px' }}>
                  <tr>
                    <td colSpan={4} style={{ padding: '10px 12px', color: '#0f172a' }}>TOTAL KONSOLIDASI SELURUH USER PIC</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0f172a', fontSize: '12.5px' }}>{formatNumber(totalEmpBills)} Bill</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0284c7', fontSize: '12.5px' }}>100.0%</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0f172a' }}>
                      {employeeDaysFilter === 365
                        ? `${(totalEmpBills / 12).toFixed(0)}/bln · ${(totalEmpBills / 365).toFixed(1)}/hari`
                        : `${(totalEmpBills / empDaysDivisor).toFixed(1)} Bill/Hari`}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#059669', fontSize: '10.5px' }}>Kapasitas 100% Aktif</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Box Catatan Evaluasi Produktivitas PIC & Pedoman SLA */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px 16px', background: '#f8fafc', fontSize: '10.5px', color: '#475569', lineHeight: 1.6 }}>
              <div style={{ fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: '4px' }}>
                Pedoman Evaluasi Kinerja PIC &amp; Standar SLA Billing:
              </div>
              <div>
                1. <strong>Spesialisasi Tim:</strong> Tim Udara (Kiki, Yati) berfokus pada kecepatan terbit faktur harian kargo udara (SLA 24 jam), sedangkan Tim Laut (Thara, Rico, Ferly) menangani volume kontainer dan kargo konsolidasi laut.<br />
                2. <strong>Distribusi Beban Kerja:</strong> PIC dengan volume di atas rata-rata konsolidasi menunjukkan utilisasi operasional yang optimal dan menjaga kelancaran penagihan piutang.<br />
                3. <strong>Navigasi Laporan:</strong> Visualisasi kurva tren volume deret waktu per PIC disajikan secara terperinci pada <strong>Lembar {isOperation ? 5 : 8}</strong>.
              </div>
            </div>
          </div>

          {/* Footer Lembar 4 Operasional / Lembar 7 All */}
          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
            <span>Sistem Operasional M-Shipping • Analisis Produktivitas SDM &amp; PIC</span>
            <span>Lembar {isOperation ? 4 : 7} dari {totalPages} (Tabel Rekapitulasi Produktivitas User Pembuat Invoice)</span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SEGMEN 5 (HALAMAN 5 / LEMBAR 5 OPERASIONAL): KURVA TREN VOLUME PENERBITAN FAKTUR PER PIC
          ══════════════════════════════════════════════════════════════════════ */}
      {(isOperation || isAll) && (
        <div
          className="pdf-page-sheet"
          style={{
            width: '1200px',
            height: '840px',
            boxSizing: 'border-box',
            padding: '24px 30px',
            backgroundColor: '#ffffff',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {/* Header Lembar 5 */}
            <div
              style={{
                borderBottom: '2.5px solid #0284c7',
                paddingBottom: '12px',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                  M-SHIPPING OPERATION REPORT — KURVA TREN VOLUME PENERBITAN FAKTUR PER PIC
                </div>
                <p style={{ fontSize: '11px', color: '#475569', margin: '3px 0 0 0', fontWeight: 600 }}>
                  Bagian {isOperation ? 5 : 8}: Analisis Deret Waktu Volume Penerbitan Faktur per Karyawan/PIC ({employeeRangeLabel})
                </p>
              </div>
              <div style={{ textAlign: 'right', fontSize: '10.5px', color: '#64748b' }}>
                <div>Rentang: <strong>{employeeRangeLabel}</strong></div>
                <div>Status: <strong>CONFIDENTIAL / OPERATIONAL</strong></div>
              </div>
            </div>

            {/* 4 Mini Summary KPI Cards Tren PIC */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '14px' }}>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', background: '#f8fafc', borderLeft: '4px solid #0284c7' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Faktur Terbit</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', margin: '2px 0' }}>
                  {formatNumber(totalEmpBills)} <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Bill</span>
                </div>
                <div style={{ fontSize: '9px', color: '#64748b' }}>Akumulasi periode {employeeRangeLabel}</div>
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', background: '#f8fafc', borderLeft: '4px solid #059669' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Rata-rata Konsolidasi</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#059669', fontFamily: 'monospace', margin: '2px 0' }}>
                  {employeeDaysFilter === 365 ? (totalEmpBills / 12).toFixed(0) : (totalEmpBills / empDaysDivisor).toFixed(1)} <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>{employeeDaysFilter === 365 ? 'Bill/Bln' : 'Bill/Hari'}</span>
                </div>
                <div style={{ fontSize: '9px', color: '#059669', fontWeight: 600 }}>Rata-rata produksi tim billing</div>
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', background: '#f8fafc', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>PIC Volume Terbanyak</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#d97706', fontFamily: 'monospace', margin: '2px 0' }}>
                  {employeePerformances[0]?.name || '—'}
                </div>
                <div style={{ fontSize: '9px', color: '#b45309' }}>
                  {formatNumber(employeePerformances[0]?.totalBills || 0)} Bill ({employeePerformances[0]?.billShare?.toFixed(1) || 0}%)
                </div>
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', background: '#f8fafc', borderLeft: '4px solid #6366f1' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Jumlah PIC Aktif</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#4338ca', fontFamily: 'monospace', margin: '2px 0' }}>
                  {employeePerformances.length} <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Staf PIC</span>
                </div>
                <div style={{ fontSize: '9px', color: '#64748b' }}>Tim Udara &amp; Laut beroperasi</div>
              </div>
            </div>

            {/* Kotak Grafik Kontribusi Harian/Bulanan User PIC (Ukuran Besar & Jelas) */}
            <div style={{ border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '14px 18px', background: '#ffffff', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                  Kurva Tren {employeeDaysFilter === 365 ? 'Bulanan' : 'Harian'} Volume Penerbitan Faktur per PIC ({employeeRangeLabel})
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>
                  Metrik: Kuantiti Faktur Diterbitkan (Bill Count)
                </div>
              </div>
              <div style={{ width: '100%' }}>
                <EmployeeChart
                  data={byEmployeeData}
                  series={byEmployeeSeries}
                  isLoading={false}
                  isMobile={false}
                  metric="count"
                  chartHeight={440}
                />
              </div>
            </div>

            {/* Box Analisis Tren & Kesimpulan Produktivitas */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px', background: '#f8fafc', fontSize: '10px', color: '#475569', lineHeight: 1.5 }}>
              <strong style={{ color: '#0f172a', textTransform: 'uppercase' }}>Analisis Tren Produktivitas: </strong>
              Grafik di atas memetakan fluktuasi harian dan bulanan kuantiti faktur terbit dari masing-masing PIC. Pola puncak mengindikasikan lonjakan kargo keluar gudang yang berhasil dikonversi menjadi tagihan tepat waktu sesuai jadwal operasional logistik.
            </div>
          </div>

          {/* Footer Lembar 5 Operasional / Lembar 8 All */}
          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
            <span>Sistem Operasional M-Shipping • Analisis Produktivitas SDM &amp; PIC</span>
            <span>Lembar {isOperation ? 5 : 8} dari {totalPages} (Kurva Tren Volume Penerbitan Faktur per PIC)</span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SEGMEN 7A (HALAMAN 7A / LEMBAR 6 OPERASIONAL): MONITORING ARUS SJ VS BILL (KPI & GRAFIK)
          ══════════════════════════════════════════════════════════════════════ */}
      {(isOperation || isAll) && (
        <div
          className="pdf-page-sheet"
          style={{
            width: '1200px',
            height: '840px',
            boxSizing: 'border-box',
            padding: '24px 30px',
            backgroundColor: '#ffffff',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {/* Header Lembar 6 */}
            <div
              style={{
                borderBottom: '2.5px solid #0284c7',
                paddingBottom: '12px',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                  M-SHIPPING OPERATION REPORT — MONITORING ARUS SURAT JALAN (SJ) VS FAKTUR (BILL)
                </div>
                <p style={{ fontSize: '11px', color: '#475569', margin: '3px 0 0 0', fontWeight: 600 }}>
                  Bagian {isOperation ? 6 : 9}: Evaluasi Aliran Kargo Keluar Gudang terhadap Realisasi Penerbitan Invoice Resmi ({sjRangeLabel})
                </p>
              </div>
              <div style={{ textAlign: 'right', fontSize: '10.5px', color: '#64748b' }}>
                <div>Rentang: <strong>{sjRangeLabel}</strong></div>
                <div>Status: <strong>CONFIDENTIAL / OPERATIONAL</strong></div>
              </div>
            </div>

            {/* 4 Kartu KPI Konversi SJ vs Bill (Ukuran Lega) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '14px' }}>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px 16px', background: '#f8fafc', borderLeft: '4px solid #1a365d' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Total Surat Jalan (SJ)</span>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', margin: '3px 0' }}>
                  {formatNumber(totalSjCount)} <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>SJ</span>
                </div>
                <span style={{ fontSize: '10px', color: '#64748b' }}>Kargo Keluar Gudang ({sjDaysFilter === 365 ? '1 Tahun' : `${sjDaysFilter} Hari`})</span>
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px 16px', background: '#f8fafc', borderLeft: '4px solid #16a34a' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Faktur Terbit (Bill)</span>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#16a34a', fontFamily: 'monospace', margin: '3px 0' }}>
                  {formatNumber(totalSjBilled)} <span style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>Bill</span>
                </div>
                <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: 600 }}>Tagihan Selesai Terbit Resmi</span>
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px 16px', background: '#f8fafc', borderLeft: '4px solid #dc2626' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Belum Ditagih (Unbilled)</span>
                <div style={{ fontSize: '22px', fontWeight: 800, color: totalSjUnbilled > 0 ? '#dc2626' : '#16a34a', fontFamily: 'monospace', margin: '3px 0' }}>
                  {formatNumber(totalSjUnbilled)} <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>SJ</span>
                </div>
                <span style={{ fontSize: '10px', color: totalSjUnbilled > 0 ? '#b91c1c' : '#64748b', fontWeight: 600 }}>
                  {formatNumber(totalUnbilledListCodes || unbilledDistinctListCodes || totalSjUnbilled)} Resi (ListCode) Backlog
                </span>
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px 16px', background: '#f8fafc', borderLeft: '4px solid #0284c7' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Rasio Konversi Penagihan</span>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#0284c7', fontFamily: 'monospace', margin: '3px 0' }}>
                  {sjConversionRate.toFixed(1)}%
                </div>
                <span style={{ fontSize: '10px', color: '#64748b' }}>Efektivitas Billing Rate</span>
              </div>
            </div>

            {/* Kotak Grafik Besar Kurva Konversi SJ vs Bill */}
            <div
              style={{
                border: '1.5px solid #cbd5e1',
                borderRadius: '10px',
                padding: '14px 20px',
                background: '#ffffff',
                marginBottom: '14px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                  borderBottom: '1px solid #e2e8f0',
                  paddingBottom: '8px',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                    Kurva Harian Konversi Surat Jalan vs Faktur Diterbitkan ({sjRangeLabel})
                  </div>
                  <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 0 0' }}>
                    Monitoring pergerakan kargo keluar gudang (SJ) terhadap realisasi invoice terbit (Bill)
                  </p>
                </div>

                {/* Legend Terpadu di dalam Kotak */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '18px', fontSize: '11px', fontWeight: 700 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#1a365d' }}>
                    <span style={{ width: '16px', height: '3.5px', background: '#2A5C8A', borderRadius: '2px', display: 'inline-block' }} />
                    Surat Jalan (SJ)
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#b91c1c' }}>
                    <span style={{ width: '16px', height: '0', borderTop: '3px dashed #B8422E', display: 'inline-block' }} />
                    Faktur Terbit (Bill)
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#047857' }}>
                    <span style={{ width: '16px', height: '3.5px', background: '#1F6E5C', borderRadius: '2px', display: 'inline-block' }} />
                    Belum Ditagih (Unbilled)
                  </span>
                </div>
              </div>

              <div style={{ height: '420px', width: '100%', overflow: 'hidden' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sjVsBillData} margin={{ top: 10, right: 24, left: 10, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#e2e8f0" opacity={0.8} />
                    <XAxis
                      dataKey={(row: any) => row.date || row.label}
                      axisLine={false}
                      tickLine={false}
                      tick={<CustomXAxisTick />}
                      interval="preserveStartEnd"
                      dy={4}
                      height={32}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10.5, fill: '#64748b' }}
                      width={44}
                      tickMargin={6}
                      allowDecimals={false}
                    />
                    <Line name="Surat Jalan" type="monotone" dataKey="sj_all" stroke="#2A5C8A" strokeWidth={2.4} dot={{ r: 2.8, strokeWidth: 1.2, stroke: '#FFFFFF', fill: '#2A5C8A' }} isAnimationActive={false} />
                    <Line name="Faktur Terbit" type="monotone" dataKey="bill_all" stroke="#B8422E" strokeWidth={2.4} strokeDasharray="4 4" dot={{ r: 2.8, strokeWidth: 1.2, stroke: '#FFFFFF', fill: '#B8422E' }} isAnimationActive={false} />
                    <Line name="Belum Ditagih" type="monotone" dataKey="unbilled_all" stroke="#1F6E5C" strokeWidth={2.4} dot={{ r: 2.8, strokeWidth: 1.2, stroke: '#FFFFFF', fill: '#1F6E5C' }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Catatan Definisi Metrik Surat Jalan vs Faktur */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px', background: '#f8fafc', fontSize: '10px', color: '#475569', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>ℹ️ Definisi Metrik Surat Jalan vs Faktur: </span>
              <span>
                <strong>Total SJ</strong> ({formatNumber(totalSjCount)} SJ) mencakup seluruh lembar fisik pengantaran kargo yang sudah kembali dari pelanggan. <strong>Belum Ditagih (Unbilled)</strong> merinci {formatNumber(totalSjUnbilled)} lembar SJ yang memuat {formatNumber(totalUnbilledListCodes || unbilledDistinctListCodes || totalSjUnbilled)} nomor resi kargo (<code>fdListCode</code>). Rincian detail seluruh kargo belum ditagihkan disajikan pada <strong>Lembar {isOperation ? 7 : 10}</strong>.
              </span>
            </div>
          </div>

          {/* Footer Lembar 6 Operasional / Lembar 9 All */}
          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
            <span>Sistem Operasional M-Shipping • Monitoring Operasional Logistik</span>
            <span>Lembar {isOperation ? 6 : 9} dari {totalPages} (Monitoring Surat Jalan vs Faktur)</span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SEGMEN 7B (HALAMAN 7B / LEMBAR 7 OPERASIONAL): DAFTAR RINCIAN SJ BELUM DITAGIH
          ══════════════════════════════════════════════════════════════════════ */}
      {(isOperation || isAll) && (
        <div
          className="pdf-page-sheet"
          style={{
            width: '1200px',
            height: '840px',
            boxSizing: 'border-box',
            padding: '24px 30px',
            backgroundColor: '#ffffff',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {/* Header Lembar 7 */}
            <div
              style={{
                borderBottom: '2.5px solid #0284c7',
                paddingBottom: '12px',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                  M-SHIPPING OPERATION REPORT — RINCIAN SURAT JALAN BELUM DITAGIH (UNBILLED SJ)
                </div>
                <p style={{ fontSize: '11px', color: '#475569', margin: '3px 0 0 0', fontWeight: 600 }}>
                  Bagian {isOperation ? 7 : 10}: Daftar Kargo &amp; Resi yang Telah Diterima Pelanggan Namun Belum Diterbitkan Faktur Penagihan ({sjRangeLabel})
                </p>
              </div>
              <div style={{ textAlign: 'right', fontSize: '10.5px', color: '#64748b' }}>
                <div>Rentang: <strong>{sjRangeLabel}</strong></div>
                <div>Status: <strong>CONFIDENTIAL / OPERATIONAL</strong></div>
              </div>
            </div>

            {/* 4 Mini Summary Cards Unbilled */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '10px' }}>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', background: '#f8fafc', borderLeft: '4px solid #dc2626' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Surat Jalan Fisik Pending</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: totalSjUnbilled > 0 ? '#dc2626' : '#16a34a', fontFamily: 'monospace', margin: '1px 0' }}>
                  {formatNumber(totalSjUnbilled)} <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>SJ</span>
                </div>
                <div style={{ fontSize: '8.5px', color: '#64748b' }}>Dokumen SJ telah kembali</div>
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', background: '#f8fafc', borderLeft: '4px solid #d97706' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Nomor Resi (ListCode) Backlog</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#d97706', fontFamily: 'monospace', margin: '1px 0' }}>
                  {formatNumber(totalUnbilledListCodes || unbilledDistinctListCodes || totalSjUnbilled)} <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Resi</span>
                </div>
                <div style={{ fontSize: '8.5px', color: '#b45309' }}>Kargo belum terbit invoice</div>
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', background: '#f8fafc', borderLeft: '4px solid #0284c7' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Backlog Moda Udara</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#0284c7', fontFamily: 'monospace', margin: '1px 0' }}>
                  {formatNumber(unbilledSjDetails.filter(d => d.listType === 'Udara').length)} <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>SJ</span>
                </div>
                <div style={{ fontSize: '8.5px', color: '#0369a1' }}>Penagihan Tim Udara</div>
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', background: '#f8fafc', borderLeft: '4px solid #059669' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Backlog Moda Laut</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#059669', fontFamily: 'monospace', margin: '1px 0' }}>
                  {formatNumber(unbilledSjDetails.filter(d => d.listType === 'Laut').length)} <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>SJ</span>
                </div>
                <div style={{ fontSize: '8.5px', color: '#047857' }}>Penagihan Tim Laut</div>
              </div>
            </div>

            {/* Kotak Tabel Rincian Kargo Belum Ditagih (Unbilled Backlog) */}
            <div
              style={{
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                padding: '8px 12px',
                background: '#ffffff',
                marginBottom: '10px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                  borderBottom: '1.5px solid #f1f5f9',
                  paddingBottom: '5px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                    Daftar Rincian Surat Jalan Belum Ditagih (Unbilled Backlog)
                  </span>
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 700,
                      padding: '1.5px 8px',
                      borderRadius: '999px',
                      backgroundColor: unbilledSjDetails.length > 0 ? '#fef2f2' : '#f0fdf4',
                      color: unbilledSjDetails.length > 0 ? '#b91c1c' : '#166534',
                      border: `1px solid ${unbilledSjDetails.length > 0 ? '#fecaca' : '#bbf7d0'}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {unbilledSjDetails.length > 0
                      ? `${unbilledSjDetails.length} SJ Fisik • ${unbilledDistinctListCodes || unbilledSjDetails.length} Resi (ListCode)`
                      : '0 Backlog • 100% Ditagihkan'}
                  </span>
                </div>
                <span style={{ fontSize: '9.5px', color: '#64748b', fontWeight: 600 }}>
                  Prioritas Penerbitan Invoice Operasional
                </span>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#475569', fontWeight: 700, fontSize: '9.5px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '4px 6px', textAlign: 'center', width: '28px' }}>No</th>
                    <th style={{ padding: '4px 8px', textAlign: 'left', width: '120px', whiteSpace: 'nowrap' }}>No. Surat Jalan</th>
                    <th style={{ padding: '4px 8px', textAlign: 'left', width: '125px', whiteSpace: 'nowrap' }}>No. Resi (ListCode)</th>
                    <th style={{ padding: '4px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>Nama Customer</th>
                    <th style={{ padding: '4px 8px', textAlign: 'left', width: '115px', whiteSpace: 'nowrap' }}>Kode Marking</th>
                    <th style={{ padding: '4px 6px', textAlign: 'center', width: '75px', whiteSpace: 'nowrap' }}>Moda</th>
                    <th style={{ padding: '4px 8px', textAlign: 'center', width: '95px', whiteSpace: 'nowrap' }}>Tgl SJ Kembali</th>
                    <th style={{ padding: '4px 6px', textAlign: 'center', width: '80px', whiteSpace: 'nowrap' }}>PIC</th>
                    <th style={{ padding: '4px 8px', textAlign: 'center', width: '125px', whiteSpace: 'nowrap' }}>Prioritas</th>
                  </tr>
                </thead>
                <tbody>
                  {unbilledSjDetails.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          padding: '18px',
                          textAlign: 'center',
                          color: '#16a34a',
                          fontWeight: 700,
                          backgroundColor: '#f0fdf4',
                          borderRadius: '6px',
                          fontSize: '11px',
                        }}
                      >
                        ✅ Tidak ada backlog Surat Jalan yang belum ditagihkan pada periode ini. Seluruh kargo telah diterbitkan invoice resmi.
                      </td>
                    </tr>
                  ) : (
                    unbilledSjDetails.slice(0, 11).map((item, idx) => (
                      <tr
                        key={`${item.sjNo}-${item.listCode}-${idx}`}
                        style={{
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                          borderBottom: '1px solid #e2e8f0',
                        }}
                      >
                        <td style={{ padding: '3.5px 6px', textAlign: 'center', color: '#64748b', whiteSpace: 'nowrap' }}>{idx + 1}</td>
                        <td style={{ padding: '3.5px 8px', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                          {item.sjNo || '-'}
                        </td>
                        <td style={{ padding: '3.5px 8px', fontFamily: 'monospace', fontWeight: 800, color: '#0284c7', whiteSpace: 'nowrap' }}>
                          {item.listCode || '-'}
                        </td>
                        <td
                          style={{
                            padding: '3.5px 8px',
                            fontWeight: 700,
                            color: '#1e293b',
                            maxWidth: '250px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={item.custName}
                        >
                          {item.custName || '-'}
                        </td>
                        <td style={{ padding: '3.5px 8px', fontFamily: 'monospace', color: '#475569', whiteSpace: 'nowrap' }}>
                          {item.markingCode || '-'}
                        </td>
                        <td style={{ padding: '3.5px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              padding: '1px 6px',
                              borderRadius: '3px',
                              fontSize: '8.5px',
                              fontWeight: 700,
                              backgroundColor: item.listType === 'Udara' ? '#eff6ff' : '#f0fdf4',
                              color: item.listType === 'Udara' ? '#1d4ed8' : '#047857',
                              border: `1px solid ${item.listType === 'Udara' ? '#bfdbfe' : '#bbf7d0'}`,
                              whiteSpace: 'nowrap',
                              display: 'inline-block',
                            }}
                          >
                            {item.listType === 'Udara' ? '✈️ Udara' : '🚢 Laut'}
                          </span>
                        </td>
                        <td style={{ padding: '3.5px 8px', textAlign: 'center', color: '#475569', fontSize: '9px', whiteSpace: 'nowrap' }}>
                          {formatDateDmy(item.kembaliDate || item.sjDate)}
                        </td>
                        <td style={{ padding: '3.5px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              padding: '1px 6px',
                              borderRadius: '3px',
                              fontSize: '8.5px',
                              fontWeight: 700,
                              backgroundColor: '#f1f5f9',
                              color: '#334155',
                              whiteSpace: 'nowrap',
                              display: 'inline-block',
                            }}
                          >
                            {formatPicName(item.pic)}
                          </span>
                        </td>
                        <td style={{ padding: '3.5px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              padding: '1.5px 6px',
                              borderRadius: '3px',
                              fontSize: '8.5px',
                              fontWeight: 800,
                              backgroundColor: '#fef2f2',
                              color: '#b91c1c',
                              border: '1px solid #fecaca',
                              whiteSpace: 'nowrap',
                              display: 'inline-block',
                              letterSpacing: '0.2px',
                            }}
                          >
                            🚨 SEGERA TAGIH
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {unbilledSjDetails.length > 11 && (
                <div style={{ textAlign: 'right', fontSize: '8.5px', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>
                  * Menampilkan 11 resi prioritas teratas dari total {unbilledSjDetails.length} surat jalan backlog.
                </div>
              )}
            </div>

            {/* Catatan Instruksi Operasional Follow-up Backlog */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 12px', background: '#f8fafc', fontSize: '9px', color: '#475569', lineHeight: 1.4 }}>
              <strong style={{ color: '#0f172a', textTransform: 'uppercase' }}>Instruksi Operasional Penagihan Backlog: </strong>
              Seluruh Surat Jalan yang terdaftar di atas telah selesai proses pengantaran fisiknya kepada pelanggan. Tim penagihan (PIC) diwajibkan segera menerbitkan invoice resmi untuk kargo terkait demi mencegah keterlambatan siklus piutang usaha (AR Aging).
            </div>
          </div>

          {/* Footer Lembar 7 Operasional / Lembar 10 All */}
          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: '#64748b', flexShrink: 0, marginTop: 'auto', backgroundColor: '#ffffff' }}>
            <span>Sistem Operasional M-Shipping • Monitoring Operasional Logistik</span>
            <span>Lembar {isOperation ? 7 : 10} dari {totalPages} (Rincian Surat Jalan Belum Ditagih)</span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SEGMEN 8 (HALAMAN 8 / LEMBAR 4 OPERASIONAL): BATCH EXIT VS PROGRES BILL
          ══════════════════════════════════════════════════════════════════════ */}
      {(isOperation || isAll) && (
        <div
          className="pdf-page-sheet"
        style={{
          width: '1200px',
          height: '840px',
          boxSizing: 'border-box',
          padding: '24px 30px',
          backgroundColor: '#ffffff',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          {/* Header Lembar 8 */}
          <div
            style={{
              borderBottom: '2.5px solid #059669',
              paddingBottom: '12px',
              marginBottom: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                M-SHIPPING OPERATION REPORT — MONITORING BATCH MARKING EXIT VS BILL DIBUAT
              </div>
              <p style={{ fontSize: '11px', color: '#475569', margin: '3px 0 0 0', fontWeight: 600 }}>
                Bagian {isOperation ? 8 : 11}: Evaluasi Kesiapan Penagihan Seluruh Kargo Dari Batch Keluar Gudang ({periodLabel})
              </p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '10.5px', color: '#64748b' }}>
              <div>Periode: <strong>{periodLabel}</strong></div>
              <div>Status: <strong>CONFIDENTIAL / OPERATIONAL</strong></div>
            </div>
          </div>

          {/* Top Section: Ringkasan Hero & Moda + Status Customer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', marginBottom: '14px' }}>
            {/* Box Kiri: Hero Rasio & Moda */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px', background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Rasio Penyelesaian Kargo Exit</div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: '#059669', fontFamily: 'monospace' }}>
                    {batchExitSummary ? `${batchExitSummary.billedPercentage.toFixed(1)}%` : '0%'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '11px', color: '#334155' }}>
                  <div>Total <strong>{formatNumber(batchExitSummary?.totalKargo || 0)}</strong> kargo exit</div>
                  <div style={{ color: '#64748b' }}>dari {formatNumber(batchExitSummary?.totalBatches || 0)} batch marking</div>
                </div>
              </div>

              {/* 3 Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', borderLeft: '3px solid #0284c7' }}>
                  <div style={{ fontSize: '9px', color: '#64748b' }}>Total Kargo</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'monospace' }}>{formatNumber(batchExitSummary?.totalKargo || 0)}</div>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', borderLeft: '3px solid #059669' }}>
                  <div style={{ fontSize: '9px', color: '#64748b' }}>Sudah Terbit Bill</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#059669', fontFamily: 'monospace' }}>{formatNumber(batchExitSummary?.totalBilled || 0)}</div>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', borderLeft: '3px solid #d97706' }}>
                  <div style={{ fontSize: '9px', color: '#64748b' }}>Belum Terbit Bill</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#d97706', fontFamily: 'monospace' }}>{formatNumber(batchExitSummary?.totalUnbilled || 0)}</div>
                </div>
              </div>

              {/* Breakdown Moda Udara & Laut */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '10px' }}>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#1d4ed8' }}>
                    <span>✈️ Moda Udara ({batchExitSummary?.air?.totalBatches || 0} batch)</span>
                    <span style={{ fontFamily: 'monospace' }}>{batchExitSummary?.air ? `${batchExitSummary.air.billedPercentage.toFixed(1)}%` : '0%'}</span>
                  </div>
                  <div style={{ color: '#475569', marginTop: '3px', fontSize: '9.5px' }}>
                    {formatNumber(batchExitSummary?.air?.totalBilled || 0)} bill · {formatNumber(batchExitSummary?.air?.totalUnbilled || 0)} belum (Total {formatNumber(batchExitSummary?.air?.totalKargo || 0)})
                  </div>
                </div>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#047857' }}>
                    <span>🚢 Moda Laut ({batchExitSummary?.sea?.totalBatches || 0} batch)</span>
                    <span style={{ fontFamily: 'monospace' }}>{batchExitSummary?.sea ? `${batchExitSummary.sea.billedPercentage.toFixed(1)}%` : '0%'}</span>
                  </div>
                  <div style={{ color: '#475569', marginTop: '3px', fontSize: '9.5px' }}>
                    {formatNumber(batchExitSummary?.sea?.totalBilled || 0)} bill · {formatNumber(batchExitSummary?.sea?.totalUnbilled || 0)} belum (Total {formatNumber(batchExitSummary?.sea?.totalKargo || 0)})
                  </div>
                </div>
              </div>
            </div>

            {/* Box Kanan: Kelengkapan Bill per Status Customer */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px', background: '#f8fafc' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: '8px' }}>
                Kelengkapan Bill per Status Customer
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { label: 'Blocked', metric: batchExitSummary?.byCustomerStatus?.blocked, color: '#ef4444', bg: '#fef2f2' },
                  { label: 'Warning', metric: batchExitSummary?.byCustomerStatus?.warning, color: '#f59e0b', bg: '#fffbeb' },
                  { label: 'Urgent', metric: batchExitSummary?.byCustomerStatus?.urgent, color: '#0284c7', bg: '#f0f9ff' },
                  { label: 'COD', metric: batchExitSummary?.byCustomerStatus?.cod, color: '#0d9488', bg: '#f0fdfa' },
                  { label: 'OK', metric: batchExitSummary?.byCustomerStatus?.ok, color: '#64748b', bg: '#f8fafc' },
                ].map((st, sIdx) => {
                  const pct = st.metric ? st.metric.billedPercentage : 0
                  return (
                    <div key={sIdx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 700, marginBottom: '3px' }}>
                        <span style={{ color: st.color }}>{st.label}</span>
                        <span style={{ fontFamily: 'monospace', color: '#0f172a' }}>
                          {pct.toFixed(1)}% ({formatNumber(st.metric?.totalBilled || 0)}/{formatNumber(st.metric?.totalKargo || 0)})
                        </span>
                      </div>
                      <div style={{ height: '5px', width: '100%', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: st.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Bottom Section: Tabel Rasio per Cabang */}
          <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden', background: '#ffffff' }}>
            <div style={{ background: '#f1f5f9', padding: '8px 12px', borderBottom: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>
              Rasio Penagihan per Cabang Asal Kargo (Cabang Singapore menyatukan kode -- dan SG)
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#475569', textTransform: 'uppercase', fontSize: '9.5px' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Cabang</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', width: '160px' }}>Rasio Bill</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Bill</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Sisa</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Total</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Batch</th>
                  <th style={{ padding: '6px 10px', textAlign: 'center' }}>Moda Kargo</th>
                </tr>
              </thead>
              <tbody>
                {(batchExitSummary?.byBranch || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>
                      Tidak ada data perbandingan cabang untuk periode ini.
                    </td>
                  </tr>
                ) : (
                  (batchExitSummary?.byBranch || []).map((br, bIdx) => (
                    <tr key={bIdx} style={{ borderBottom: '1px solid #e2e8f0', background: bIdx % 2 === 0 ? '#ffffff' : '#fcfcfd' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 700, color: '#0f172a' }}>
                        {br.branchName} <span style={{ fontFamily: 'monospace', color: '#64748b' }}>({br.branchCode === 'SG' ? '-- & SG' : br.branchCode})</span>
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${br.billedPercentage}%`, background: '#059669' }} />
                          </div>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, width: '42px', textAlign: 'right', fontSize: '10px' }}>
                            {br.billedPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#059669' }}>{formatNumber(br.totalBilled)}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: br.totalUnbilled > 0 ? '#d97706' : '#64748b' }}>{formatNumber(br.totalUnbilled)}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800 }}>{formatNumber(br.totalKargo)}</td>
                      <td style={{ padding: '6px 10px', color: '#475569', fontSize: '9.5px' }}>
                        {br.totalBatches} ({br.fullyBilledBatches} tuntas · {br.pendingBatches} pending)
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'center', fontSize: '9.5px', fontFamily: 'monospace' }}>
                        {br.airKargo > 0 && <span style={{ color: '#d97706', marginRight: '4px' }}>🟠 {formatNumber(br.airKargo)}</span>}
                        {br.seaKargo > 0 && <span style={{ color: '#0284c7' }}>🔵 {formatNumber(br.seaKargo)}</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Lembar 8 Operasional / Lembar 11 All */}
        <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: '#64748b' }}>
          <span>Sistem Operasional M-Shipping • Monitoring Operasional Batch Exit</span>
          <span>Lembar {isOperation ? 8 : 11} dari {totalPages} (Batch Marking Exit vs Bill Dibuat)</span>
        </div>
      </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SEGMEN 9 (HALAMAN 9 / LEMBAR 5 OPERASIONAL): RINCIAN BATCH PENDING
          ══════════════════════════════════════════════════════════════════════ */}
      {(isOperation || isAll) && (
        <div
          className="pdf-page-sheet"
        style={{
          width: '1200px',
          height: '840px',
          boxSizing: 'border-box',
          padding: '24px 30px',
          backgroundColor: '#ffffff',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          {/* Header Lembar 9 */}
          <div
            style={{
              borderBottom: '2.5px solid #d97706',
              paddingBottom: '12px',
              marginBottom: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                M-SHIPPING OPERATION REPORT — RINCIAN BATCH PENDING PENAGIHAN
              </div>
              <p style={{ fontSize: '11px', color: '#475569', margin: '3px 0 0 0', fontWeight: 600 }}>
                Bagian {isOperation ? 9 : 12}: Daftar Batch Marking yang Memiliki Kargo Belum Diterbitkan Tagihan ({periodLabel})
              </p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '10.5px', color: '#64748b' }}>
              <div>Periode: <strong>{periodLabel}</strong></div>
              <div>Status: <strong>CONFIDENTIAL / OPERATIONAL</strong></div>
            </div>
          </div>

          {/* Highlight Target Harian */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px', background: '#fffbeb', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>
                ✈️ Kesiapan Target Bill Udara (Hari Ini)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
                <span style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'monospace', color: '#92400e' }}>
                  {formatNumber(kpis?.targetBillUdara?.total || 0)} List Siap Ditagih
                </span>
                <span style={{ fontSize: '10px', color: '#78350f' }}>
                  PIC Kiki: {kpis?.targetBillUdara?.breakdown?.kiki || 0} | Yati: {kpis?.targetBillUdara?.breakdown?.yati || 0}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', fontSize: '9px', fontWeight: 700 }}>
                <span style={{ padding: '2px 6px', background: '#fef3c7', borderRadius: '4px', border: '1px solid #fde68a' }}>
                  SJ Sent: {kpis?.targetBillUdara?.categories?.sjSent || 0}
                </span>
                <span style={{ padding: '2px 6px', background: '#fef3c7', borderRadius: '4px', border: '1px solid #fde68a' }}>
                  COD/Urgent: {kpis?.targetBillUdara?.categories?.codUrgent || 0}
                </span>
                <span style={{ padding: '2px 6px', background: '#fef3c7', borderRadius: '4px', border: '1px solid #fde68a' }}>
                  &gt;7 Hari: {kpis?.targetBillUdara?.categories?.agingGt7 || 0}
                </span>
              </div>
            </div>

            <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px', background: '#f0f9ff', borderLeft: '4px solid #0284c7' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>
                🚢 Kesiapan Target Bill Laut (Hari Ini)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
                <span style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'monospace', color: '#075985' }}>
                  {formatNumber(kpis?.targetBillLaut?.total || 0)} List Siap Ditagih
                </span>
                <span style={{ fontSize: '10px', color: '#0c4a6e' }}>
                  Thara: {kpis?.targetBillLaut?.breakdown?.thara || 0} | Rico: {kpis?.targetBillLaut?.breakdown?.rico || 0} | Ferly: {kpis?.targetBillLaut?.breakdown?.ferly || 0}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', fontSize: '9px', fontWeight: 700 }}>
                <span style={{ padding: '2px 6px', background: '#e0f2fe', borderRadius: '4px', border: '1px solid #bae6fd' }}>
                  SJ Sent: {kpis?.targetBillLaut?.categories?.sjSent || 0}
                </span>
                <span style={{ padding: '2px 6px', background: '#e0f2fe', borderRadius: '4px', border: '1px solid #bae6fd' }}>
                  COD/Urgent: {kpis?.targetBillLaut?.categories?.codUrgent || 0}
                </span>
                <span style={{ padding: '2px 6px', background: '#e0f2fe', borderRadius: '4px', border: '1px solid #bae6fd' }}>
                  &gt;7 Hari: {kpis?.targetBillLaut?.categories?.agingGt7 || 0}
                </span>
                <span style={{ padding: '2px 6px', background: '#e0f2fe', borderRadius: '4px', border: '1px solid #bae6fd' }}>
                  FCL: {kpis?.targetBillLaut?.categories?.fcl || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Tabel Batch Pending */}
          <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden', background: '#ffffff' }}>
            <div style={{ background: '#f8fafc', padding: '8px 12px', borderBottom: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>
              Daftar Batch Marking Yang Memerlukan Tindak Lanjut Penagihan (Pending Batches)
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#475569', textTransform: 'uppercase', fontSize: '9px' }}>
                  <th style={{ padding: '5px 8px', textAlign: 'center', width: '30px' }}>No</th>
                  <th style={{ padding: '5px 8px', textAlign: 'left', width: '150px' }}>Kode Marking</th>
                  <th style={{ padding: '5px 8px', textAlign: 'left', width: '110px' }}>Cabang &amp; Moda</th>
                  <th style={{ padding: '5px 8px', textAlign: 'center', width: '85px' }}>Tgl Exit</th>
                  <th style={{ padding: '5px 8px', textAlign: 'center', width: '120px' }}>Progres Kargo</th>
                  <th style={{ padding: '5px 8px', textAlign: 'right', width: '60px' }}>Belum</th>
                  <th style={{ padding: '5px 8px', textAlign: 'right', width: '60px' }}>Total</th>
                  <th style={{ padding: '5px 8px', textAlign: 'left' }}>Status Kargo Pelanggan</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const pendingBatches = (batchExitBatches || []).filter((b) => !b.isFullyBilled)
                  if (pendingBatches.length === 0) {
                    return (
                      <tr>
                        <td colSpan={8} style={{ padding: '16px', textAlign: 'center', color: '#16a34a', fontWeight: 700, background: '#f0fdf4' }}>
                          ✅ Seluruh batch marking yang keluar gudang telah 100% tuntas ditagih! Tidak ada pending batch.
                        </td>
                      </tr>
                    )
                  }
                  return pendingBatches.slice(0, 11).map((b, idx) => (
                    <tr key={`${b.markingCode}-${idx}`} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#fcfcfd' }}>
                      <td style={{ padding: '4px 6px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>{b.markingCode}</td>
                      <td style={{ padding: '4px 8px' }}>
                        <span style={{ fontWeight: 600 }}>{b.branchName}</span>{' '}
                        <span style={{ fontSize: '9px', color: b.listType === 1 ? '#d97706' : '#0284c7' }}>
                          ({b.listType === 1 ? '✈️ Udara' : '🚢 Laut'})
                        </span>
                      </td>
                      <td style={{ padding: '4px 8px', textAlign: 'center', color: '#475569', fontSize: '9px' }}>
                        {formatDateDmy(b.exitDate)}
                      </td>
                      <td style={{ padding: '4px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{ flex: 1, height: '5px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${b.billedPercentage}%`, background: '#059669' }} />
                          </div>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '9px', width: '34px', textAlign: 'right' }}>
                            {b.billedPercentage.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#d97706' }}>
                        {formatNumber(b.totalUnbilled)}
                      </td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                        {formatNumber(b.totalKargo)}
                      </td>
                      <td style={{ padding: '4px 8px', fontSize: '9px' }}>
                        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                          {b.customerStatus?.unbilledBlocked > 0 && (
                            <span style={{ padding: '1px 4px', background: '#fee2e2', color: '#991b1b', borderRadius: '3px', fontWeight: 700 }}>
                              🚨 {b.customerStatus.unbilledBlocked} Blocked
                            </span>
                          )}
                          {b.customerStatus?.unbilledWarning > 0 && (
                            <span style={{ padding: '1px 4px', background: '#fef3c7', color: '#92400e', borderRadius: '3px', fontWeight: 700 }}>
                              ⚠️ {b.customerStatus.unbilledWarning} Warn
                            </span>
                          )}
                          {b.customerStatus?.unbilledUrgent > 0 && (
                            <span style={{ padding: '1px 4px', background: '#e0f2fe', color: '#075985', borderRadius: '3px', fontWeight: 700 }}>
                              ⚡ {b.customerStatus.unbilledUrgent} Urgent
                            </span>
                          )}
                          {b.customerStatus?.unbilledCod > 0 && (
                            <span style={{ padding: '1px 4px', background: '#ccfbf1', color: '#115e59', borderRadius: '3px', fontWeight: 700 }}>
                              💵 {b.customerStatus.unbilledCod} COD
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Lembar 9 Operasional / Lembar 12 All */}
        <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: '#64748b' }}>
          <span>Sistem Operasional M-Shipping • Monitoring Operasional Logistik</span>
          <span>Lembar {isOperation ? 9 : 12} dari {totalPages} (Rincian Batch Pending &amp; Target Bill)</span>
        </div>
      </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SEGMEN 10 (HALAMAN 10 / LEMBAR 7 OPERASIONAL): BATCH MARKING EXIT & BILLING PROGRESS DETAILS
          ══════════════════════════════════════════════════════════════════════ */}
      {(isOperation || isAll) && (
        <div
          className="pdf-page-sheet"
          style={{
            width: '1200px',
            height: '840px',
            boxSizing: 'border-box',
            padding: '24px 30px',
            backgroundColor: '#ffffff',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {/* Header Lembar 7 */}
            <div
              style={{
                borderBottom: '2.5px solid #059669',
                paddingBottom: '12px',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <span style={{ display: 'inline-block', width: '14px', height: '14px', background: '#059669', borderRadius: '3px' }} />
                  <span style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                    M-SHIPPING OPERATION REPORT — RINCIAN PROGRES BATCH MARKING EXIT
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: '#475569', margin: '0', fontWeight: 600 }}>
                  Bagian {isOperation ? 10 : 13}: Batch Marking Exit &amp; Billing Progress Details ({periodLabel})
                </p>
              </div>
              <div style={{ textAlign: 'right', fontSize: '10.5px', color: '#64748b' }}>
                <div>Periode: <strong>{periodLabel}</strong></div>
                <div>Status: <strong>CONFIDENTIAL / OPERATIONAL</strong></div>
              </div>
            </div>

            {/* Mini Summary Cards Baris Atas */}
            {(() => {
              const allBatches = batchExitBatches || []
              const totalBatches = allBatches.length
              const completedBatches = allBatches.filter((b) => b.isFullyBilled).length
              const pendingBatches = allBatches.filter((b) => !b.isFullyBilled).length
              const totalExitCargo = allBatches.reduce((acc, b) => acc + (b.totalKargo || 0), 0)
              const totalBilledCargo = allBatches.reduce((acc, b) => acc + (b.totalBilled || 0), 0)
              const totalUnbilledCargo = allBatches.reduce((acc, b) => acc + (b.totalUnbilled || 0), 0)
              const overallBilledPct = totalExitCargo > 0 ? (totalBilledCargo / totalExitCargo) * 100 : 0

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '9px 12px', background: '#f8fafc', borderLeft: '4px solid #0284c7' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>Total Batch Terdata</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'monospace', color: '#0f172a', marginTop: '2px' }}>
                      {formatNumber(totalBatches)} <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Batch</span>
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '2px' }}>
                      {completedBatches} Tuntas • {pendingBatches} Pending
                    </div>
                  </div>

                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '9px 12px', background: '#f0fdf4', borderLeft: '4px solid #059669' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>Kargo Sudah Billed</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'monospace', color: '#166534', marginTop: '2px' }}>
                      {formatNumber(totalBilledCargo)} <span style={{ fontSize: '11px', fontWeight: 600, color: '#15803d' }}>Kargo ({overallBilledPct.toFixed(1)}%)</span>
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#166534', marginTop: '2px' }}>
                      Dari total {formatNumber(totalExitCargo)} kargo exit
                    </div>
                  </div>

                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '9px 12px', background: '#fffbeb', borderLeft: '4px solid #d97706' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>Kargo Belum Ditagih (Unbilled)</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'monospace', color: '#92400e', marginTop: '2px' }}>
                      {formatNumber(totalUnbilledCargo)} <span style={{ fontSize: '11px', fontWeight: 600, color: '#b45309' }}>Kargo</span>
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#78350f', marginTop: '2px' }}>
                      Sisa muatan menanti faktur
                    </div>
                  </div>

                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '9px 12px', background: '#fef2f2', borderLeft: '4px solid #e11d48' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#be123c', textTransform: 'uppercase' }}>Prioritas Status Kargo</div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#881337', marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      <span style={{ padding: '1px 5px', background: '#fee2e2', borderRadius: '3px' }}>
                        🚨 {allBatches.reduce((acc, b) => acc + (b.customerStatus?.unbilledBlocked || 0), 0)} Blocked
                      </span>
                      <span style={{ padding: '1px 5px', background: '#fef3c7', borderRadius: '3px', color: '#92400e' }}>
                        ⚠️ {allBatches.reduce((acc, b) => acc + (b.customerStatus?.unbilledWarning || 0), 0)} Warn
                      </span>
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#9f1239', marginTop: '3px' }}>
                      Perhatian penagihan khusus
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Tabel Utama Batch Marking Exit & Billing Progress Details */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden', background: '#ffffff' }}>
              <div style={{ background: '#f8fafc', padding: '7px 12px', borderBottom: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                  Daftar Batch Marking Exit &amp; Status Progres Billing
                </span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>
                  Menampilkan hingga 14 batch prioritas (pending &amp; terbaru)
                </span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#475569', textTransform: 'uppercase', fontSize: '9px' }}>
                    <th style={{ padding: '5px 7px', textAlign: 'center', width: '28px' }}>#</th>
                    <th style={{ padding: '5px 7px', textAlign: 'left', width: '140px' }}>Kode Marking</th>
                    <th style={{ padding: '5px 7px', textAlign: 'center', width: '80px' }}>Tgl Exit</th>
                    <th style={{ padding: '5px 7px', textAlign: 'left', width: '110px' }}>Moda / Cabang</th>
                    <th style={{ padding: '5px 7px', textAlign: 'left', width: '180px' }}>Status Customer</th>
                    <th style={{ padding: '5px 7px', textAlign: 'center', width: '110px' }}>Status Kargo</th>
                    <th style={{ padding: '5px 7px', textAlign: 'left' }}>Progres Billing</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const allBatches = batchExitBatches || []
                    if (allBatches.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} style={{ padding: '18px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                            Tidak ada data batch marking exit yang tercatat pada periode ini.
                          </td>
                        </tr>
                      )
                    }

                    // Urutkan: Pending batch dengan customer status unbilledBlocked/unbilledWarning di posisi teratas, lalu pending lainnya, lalu completed
                    const sortedBatches = [...allBatches].sort((a, b) => {
                      if (a.isFullyBilled !== b.isFullyBilled) {
                        return a.isFullyBilled ? 1 : -1
                      }
                      const aCritical = (a.customerStatus?.unbilledBlocked || 0) + (a.customerStatus?.unbilledWarning || 0)
                      const bCritical = (b.customerStatus?.unbilledBlocked || 0) + (b.customerStatus?.unbilledWarning || 0)
                      if (aCritical !== bCritical) {
                        return bCritical - aCritical
                      }
                      return (b.totalUnbilled || 0) - (a.totalUnbilled || 0)
                    })

                    const displayBatches = sortedBatches.slice(0, 14)

                    return displayBatches.map((batch, idx) => {
                      const isAir = batch.listType === 1
                      const isFullyBilled = batch.isFullyBilled
                      const cs = batch.customerStatus

                      return (
                        <tr
                          key={`${batch.markingCode}-${idx}`}
                          style={{
                            borderBottom: '1px solid #e2e8f0',
                            background: !isFullyBilled && (cs?.unbilledBlocked || cs?.unbilledWarning) ? '#fffbeb' : idx % 2 === 0 ? '#ffffff' : '#fafaf9',
                          }}
                        >
                          {/* 1. Index */}
                          <td style={{ padding: '4.5px 6px', textAlign: 'center', color: '#64748b' }}>
                            {idx + 1}
                          </td>

                          {/* 2. Kode Marking */}
                          <td style={{ padding: '4.5px 7px', fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>
                            {batch.markingCode}
                          </td>

                          {/* 3. Tgl Exit */}
                          <td style={{ padding: '4.5px 7px', textAlign: 'center', color: '#475569', fontSize: '9px' }}>
                            {formatDateDmy(batch.exitDate)}
                          </td>

                          {/* 4. Moda / Cabang */}
                          <td style={{ padding: '4.5px 7px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '9px', fontWeight: 700, color: isAir ? '#d97706' : '#0284c7' }}>
                                {isAir ? '✈️ Udara' : '🚢 Laut'}
                              </span>
                              <span style={{ color: '#94a3b8' }}>•</span>
                              <span style={{ fontWeight: 600, color: '#334155' }}>
                                {batch.branchName || 'Cabang'}
                              </span>
                            </div>
                          </td>

                          {/* 5. Status Customer Badges */}
                          <td style={{ padding: '4.5px 7px' }}>
                            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', alignItems: 'center' }}>
                              {cs && cs.blocked > 0 && (
                                <span style={{ padding: '1px 4px', background: '#fee2e2', color: '#991b1b', borderRadius: '3px', fontWeight: 700, fontSize: '8.5px' }}>
                                  🚨 {cs.blocked}{cs.unbilledBlocked > 0 ? ` (${cs.unbilledBlocked})` : ''}
                                </span>
                              )}
                              {cs && cs.warning > 0 && (
                                <span style={{ padding: '1px 4px', background: '#fef3c7', color: '#92400e', borderRadius: '3px', fontWeight: 700, fontSize: '8.5px' }}>
                                  ⚠️ {cs.warning}{cs.unbilledWarning > 0 ? ` (${cs.unbilledWarning})` : ''}
                                </span>
                              )}
                              {cs && cs.urgent > 0 && (
                                <span style={{ padding: '1px 4px', background: '#e0f2fe', color: '#075985', borderRadius: '3px', fontWeight: 700, fontSize: '8.5px' }}>
                                  ⚡ {cs.urgent}
                                </span>
                              )}
                              {cs && cs.cod > 0 && (
                                <span style={{ padding: '1px 4px', background: '#ccfbf1', color: '#115e59', borderRadius: '3px', fontWeight: 700, fontSize: '8.5px' }}>
                                  💵 {cs.cod}
                                </span>
                              )}
                              {cs && cs.ok > 0 && (
                                <span style={{ padding: '1px 4px', background: '#f1f5f9', color: '#475569', borderRadius: '3px', fontWeight: 600, fontSize: '8.5px' }}>
                                  OK: {cs.ok}
                                </span>
                              )}
                              {(!cs || (cs.blocked === 0 && cs.warning === 0 && cs.urgent === 0 && cs.cod === 0 && cs.ok === 0)) && (
                                <span style={{ color: '#94a3b8', fontSize: '8.5px' }}>-</span>
                              )}
                            </div>
                          </td>

                          {/* 6. Status Kargo (Billed / Unbilled / Total) */}
                          <td style={{ padding: '4.5px 7px', textAlign: 'center' }}>
                            <span style={{ fontWeight: 800, color: '#166534' }}>{formatNumber(batch.totalBilled)}</span>
                            <span style={{ color: '#94a3b8', margin: '0 2px' }}>/</span>
                            <span style={{ fontWeight: 800, color: batch.totalUnbilled > 0 ? '#d97706' : '#64748b' }}>
                              {batch.totalUnbilled > 0 ? `${formatNumber(batch.totalUnbilled)} sisa` : '0 sisa'}
                            </span>
                            <span style={{ color: '#64748b', fontSize: '8.5px', display: 'block' }}>
                              (Total {formatNumber(batch.totalKargo)})
                            </span>
                          </td>

                          {/* 7. Progres Bar & Persentase */}
                          <td style={{ padding: '4.5px 7px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    width: `${batch.billedPercentage}%`,
                                    background: isFullyBilled ? '#059669' : batch.billedPercentage > 50 ? '#d97706' : '#e11d48',
                                  }}
                                />
                              </div>
                              <span
                                style={{
                                  fontFamily: 'monospace',
                                  fontWeight: 800,
                                  fontSize: '9px',
                                  width: '38px',
                                  textAlign: 'right',
                                  color: isFullyBilled ? '#166534' : batch.billedPercentage > 50 ? '#b45309' : '#be123c',
                                }}
                              >
                                {batch.billedPercentage.toFixed(0)}%
                              </span>
                              <span
                                style={{
                                  fontSize: '8px',
                                  fontWeight: 700,
                                  padding: '1px 4px',
                                  borderRadius: '3px',
                                  background: isFullyBilled ? '#dcfce7' : '#fef3c7',
                                  color: isFullyBilled ? '#166534' : '#92400e',
                                }}
                              >
                                {isFullyBilled ? 'TUNTAS' : 'PENDING'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Lembar 10 Operasional / Lembar 13 All */}
          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: '#64748b' }}>
            <span>Sistem Operasional M-Shipping • Rincian Progres Batch Marking Exit &amp; Billing</span>
            <span>Lembar {isOperation ? 10 : 13} dari {totalPages} (Batch Marking Exit &amp; Billing Progress Details)</span>
          </div>
        </div>
      )}
    </div>
  )
}

