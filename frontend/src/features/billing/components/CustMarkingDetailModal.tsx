import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { X, Search, Database, AlertTriangle, Layers, Scale, Box, Package, CheckCircle2 } from 'lucide-react'
import { billingApi } from '../services/billing.service'
import { formatDecimal, formatDate, formatNumber } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useTranslation } from '@/hooks/useTranslation'

/**
 * CustMarkingDetailModal Component
 * Modal dialog displaying detailed M3 & packing list breakdown per marking
 */

interface CustMarkingDetailModalProps {
  isOpen: boolean
  onClose: () => void
  custCode: string | null
  markingCode: string | null
}

interface ColumnDef {
  label: string
  keyCandidates: string[]
  isNumber?: boolean
  isDate?: boolean
  decimals?: number
  headerAlign?: 'left' | 'center' | 'right'
  textAlign?: 'left' | 'center' | 'right'
  headerBg?: string
  cellBg?: string
}

// Fixed ERP Column Configuration
const COLUMN_DEFS: ColumnDef[] = [
  { label: 'BC', keyCandidates: ['BC', 'fdBC', 'fdBranchCode', 'branch'], textAlign: 'center' },
  { label: 'No. Invoice', keyCandidates: ['No. Invoice', 'No_Invoice', 'fdInvNo', 'fdListCode'] },
  { label: 'Tgl. Inv', keyCandidates: ['Tgl. Inv', 'Tgl_Inv', 'fdInvDate', 'fdTgl'], isDate: true, textAlign: 'center' },
  { label: 'Marking No', keyCandidates: ['Marking No', 'Marking_No', 'fdMarkingNo', 'fdMarkingCode'] },
  { label: 'Comodity', keyCandidates: ['Comodity', 'fdComodity', 'fdDescr'] },
  { label: 'Ket', keyCandidates: ['fdDesc', 'Ket', 'fdKet', 'fdRemark'] },
  { label: 'Curr', keyCandidates: ['fdCurrValue1', 'Curr', 'fdCurr'], textAlign: 'center' },
  { label: 'Value', keyCandidates: ['fdValue2', 'Value', 'fdValue'], isNumber: true, decimals: 2, textAlign: 'right' },
  { label: 'Fc', keyCandidates: ['fdFC', 'Fc', 'fdFc'], isNumber: true, decimals: 2, textAlign: 'right' },
  { label: 'Berat', keyCandidates: ['fdJmlBerat', 'Berat', 'fdBerat'], isNumber: true, decimals: 2, textAlign: 'right' },
  { label: 'Berat SJ', keyCandidates: ['fdTotalBeratSJ', 'Berat SJ', 'Berat_SJ', 'fdBeratSJ'], isNumber: true, decimals: 2, textAlign: 'right' },
  { label: 'Berat K', keyCandidates: ['fdJmlBeratKomplain', 'Berat K', 'Berat_K', 'fdBeratK'], isNumber: true, decimals: 2, textAlign: 'right' },
  { label: 'KG Bill', keyCandidates: ['KG', 'KG Bill', 'KG_Bill', 'fdKGBill', 'KG Dll', 'Kg_Dll', 'fdKGDll'], isNumber: true, decimals: 2, textAlign: 'right' },
  { label: 'Qty SJ', keyCandidates: ['fdTotalQtySJ', 'Qty SJ', 'Qty_SJ', 'fdQtySJ'], isNumber: true, decimals: 0, textAlign: 'right' },
  { label: 'Qty Gdg', keyCandidates: ['fdTotalQty', 'Qty Gdg', 'Qty_Gdg', 'fdQtyGdg'], isNumber: true, decimals: 0, textAlign: 'right' },
  { label: 'Qty PL', keyCandidates: ['fdQtyPL', 'Qty PL', 'Qty_PL'], isNumber: true, decimals: 0, textAlign: 'right' },
  { label: 'Qty K', keyCandidates: ['fdTotalQtyKomplain', 'Qty K', 'Qty_K', 'fdQtyK'], isNumber: true, decimals: 0, textAlign: 'right' },
  { label: 'Tipe', keyCandidates: ['fdComodityName', 'Tipe', 'fdTipe', 'fdTypeComodity'] },
  { label: 'Tax', keyCandidates: ['Tax', 'fdTax'], textAlign: 'center' },
  {
    label: 'M3 PL',
    keyCandidates: ['fdM3PackingList', 'M3 PL', 'M3_PL', 'fdM3PL'],
    isNumber: true,
    decimals: 4,
    textAlign: 'right',
    headerBg: 'bg-rose-100/80 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200',
    cellBg: 'bg-rose-50/60 dark:bg-rose-950/30 font-semibold text-rose-950 dark:text-rose-200',
  },
  {
    label: 'M3',
    keyCandidates: ['fdM3', 'M3', 'm3_gdg'],
    isNumber: true,
    decimals: 4,
    textAlign: 'right',
    headerBg: 'bg-blue-100/80 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200',
    cellBg: 'bg-blue-50/60 dark:bg-blue-950/30 font-semibold text-blue-950 dark:text-blue-200',
  },
  {
    label: 'M3 K',
    keyCandidates: ['fdm3Komplain', 'fdM3Komplain', 'M3 K', 'M3_K', 'fdM3K'],
    isNumber: true,
    decimals: 4,
    textAlign: 'right',
    headerBg: 'bg-amber-100/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200',
    cellBg: 'bg-amber-50/60 dark:bg-amber-950/30 font-semibold text-amber-950 dark:text-amber-200',
  },
  {
    label: 'M3 Bill',
    keyCandidates: ['M3 Bill', 'M3_Bill', 'fdM3Bill', 'M3', 'fdM3', 'M3 Dll', 'M3_Dll', 'fdM3Dll'],
    isNumber: true,
    decimals: 4,
    textAlign: 'right',
    headerBg: 'bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200',
    cellBg: 'bg-emerald-50/60 dark:bg-emerald-950/30 font-semibold text-emerald-950 dark:text-emerald-200',
  },
  {
    label: 'Over Weight',
    keyCandidates: ['OverWeight', 'fdOverWeight', 'overweight', 'Over_Weight'],
    isNumber: true,
    decimals: 2,
    textAlign: 'right',
    headerBg: 'bg-amber-100/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200',
    cellBg: 'bg-amber-50/60 dark:bg-amber-950/30 font-semibold text-amber-950 dark:text-amber-200',
  },
]

export function CustMarkingDetailModal({
  isOpen,
  onClose,
  custCode,
  markingCode,
}: CustMarkingDetailModalProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setSearch('')
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const { data: rows = [], isLoading: loading, isError } = useQuery({
    queryKey: ['m3CustMarkingDetails', custCode, markingCode],
    queryFn: async () => {
      if (!custCode || !markingCode) return []
      const res = await billingApi.m3CustMarkingDetails(custCode, markingCode)
      const data = res.data?.data || res.data || []
      return Array.isArray(data) ? data : []
    },
    enabled: isOpen && !!custCode && !!markingCode,
    staleTime: 60000,
  })

  // Helper to extract value from row given candidate keys
  const getRowValue = (row: any, candidates: string[]) => {
    for (const key of candidates) {
      if (row && row[key] !== undefined && row[key] !== null) {
        return row[key]
      }
    }
    return null
  }

  // Helper to compute OverWeight per row according to formula:
  // If fdTypeTagihan === 1 -> diff = (rasio * m3) - berat. If minus (< 0), then OverWeight = Math.abs(diff)
  const computeOverWeight = (row: any) => {
    const typeTagihan = getRowValue(row, ['fdTypeTagihan', 'TypeTagihan', 'fdTypeTag', 'typeTagihan', 'Type_Tagihan'])
    if (typeTagihan === 1 || typeTagihan === '1' || typeTagihan === true) {
      const rasioVal = getRowValue(row, ['fdRasioLr', 'fdRasio', 'Rasio', 'rasio', 'fdRatio', 'Ratio', 'ratio', 'fdRasioHarga', 'RasioHarga'])
      const rasio = typeof rasioVal === 'number' ? rasioVal : parseFloat(String(rasioVal || 0)) || 0

      const m3GdgVal = getRowValue(row, ['fdM3', 'M3', 'm3_gdg'])
      const m3Gdg = typeof m3GdgVal === 'number' ? m3GdgVal : parseFloat(String(m3GdgVal || 0)) || 0

      const m3PLVal = getRowValue(row, ['fdM3PackingList', 'M3 PL', 'M3_PL', 'fdM3PL'])
      const m3PL = typeof m3PLVal === 'number' ? m3PLVal : parseFloat(String(m3PLVal || 0)) || 0

      const m3 = m3Gdg > 0 ? m3Gdg : m3PL

      const beratVal = getRowValue(row, ['fdJmlBerat', 'Berat', 'fdBerat'])
      const berat = typeof beratVal === 'number' ? beratVal : parseFloat(String(beratVal || 0)) || 0

      if (rasio > 0 && m3 > 0 && berat > 0) {
        return berat - (m3 * rasio)
      }
    }
    return null
  }

  // Determine active columns (standard ERP columns + any leftover raw keys)
  const activeColumns = useMemo(() => {
    if (rows.length === 0) return COLUMN_DEFS.map((def) => ({ ...def, actualKey: def.keyCandidates[0] }))

    const rawKeys = new Set(Object.keys(rows[0]))

    return COLUMN_DEFS.map((def) => {
      let foundKey = def.keyCandidates.find((k) => rawKeys.has(k))
      return { ...def, actualKey: foundKey || def.keyCandidates[0] }
    })
  }, [rows])

  // Filtered rows by search term
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((r) =>
      Object.values(r).some((val) => val !== null && val !== undefined && String(val).toLowerCase().includes(q))
    )
  }, [rows, search])

  // Summary totals calculation
  const summary = useMemo(() => {
    let totalM3PL = 0
    let totalM3Gdg = 0
    let totalM3K = 0
    let totalM3Bill = 0
    let totalQtySJ = 0
    let totalQtyGdg = 0
    let totalQtyPL = 0
    let totalBerat = 0
    let totalOverWeight = 0
    let hasOverWeightData = false

    const m3ByTypeMap = new Map<string, { totalM3Gdg: number; totalM3PL: number; totalM3K: number; totalM3Bill: number; count: number }>()

    rows.forEach((r) => {
      const parseVal = (cand: string[]) => {
        const v = getRowValue(r, cand)
        return typeof v === 'number' ? v : parseFloat(String(v || 0)) || 0
      }

      const m3PL = parseVal(['fdM3PackingList', 'M3 PL', 'M3_PL', 'fdM3PL'])
      const m3Gdg = parseVal(['fdM3', 'M3', 'm3_gdg'])
      const m3K = parseVal(['fdm3Komplain', 'fdM3Komplain', 'M3 K', 'M3_K', 'fdM3K'])
      const m3Bill = parseVal(['M3 Bill', 'M3_Bill', 'fdM3Bill', 'M3', 'fdM3', 'M3 Dll', 'M3_Dll', 'fdM3Dll'])
      const weight = parseVal(['fdJmlBerat', 'Berat', 'fdBerat'])
      const ow = computeOverWeight(r)
      if (ow !== null) {
        totalOverWeight += ow
        hasOverWeightData = true
      }

      totalM3PL += m3PL
      totalM3Gdg += m3Gdg
      totalM3K += m3K
      totalM3Bill += m3Bill
      totalQtySJ += parseVal(['fdTotalQtySJ', 'Qty SJ', 'Qty_SJ', 'fdQtySJ'])
      totalQtyGdg += parseVal(['fdTotalQty', 'Qty Gdg', 'Qty_Gdg', 'fdQtyGdg'])
      totalQtyPL += parseVal(['fdQtyPL', 'Qty PL', 'Qty_PL'])
      totalBerat += weight

      const rawType = getRowValue(r, ['fdComodityName', 'Tipe', 'fdTipe', 'fdTypeComodity', 'Comodity', 'fdComodity'])
      const typeName = rawType ? String(rawType).trim() : 'LAINNYA'

      const current = m3ByTypeMap.get(typeName) || { totalM3Gdg: 0, totalM3PL: 0, totalM3K: 0, totalM3Bill: 0, count: 0 }
      current.totalM3Gdg += m3Gdg
      current.totalM3PL += m3PL
      current.totalM3K += m3K
      current.totalM3Bill += m3Bill
      current.count += 1
      m3ByTypeMap.set(typeName, current)
    })

    const m3ByType = Array.from(m3ByTypeMap.entries()).map(([typeName, val]) => ({
      typeName,
      ...val,
    }))

    const hasWarning = Math.abs(totalM3PL - totalM3Gdg) > 0.001 || totalM3K > 0
    const isBillMatchingGdg = Math.abs(totalM3Bill - totalM3Gdg) < 0.001
    const m3PlGdgDiff = totalM3PL - totalM3Gdg
    const hasQtyDiff = (totalQtySJ !== totalQtyGdg || totalQtyGdg !== totalQtyPL || totalQtySJ !== totalQtyPL) && (totalQtySJ > 0 || totalQtyGdg > 0 || totalQtyPL > 0)

    return {
      totalRows: rows.length,
      totalM3PL,
      totalM3Gdg,
      totalM3K,
      totalM3Bill,
      totalQtySJ,
      totalQtyGdg,
      totalQtyPL,
      totalBerat,
      totalOverWeight,
      hasOverWeightData,
      m3ByType,
      hasWarning,
      isBillMatchingGdg,
      m3PlGdgDiff,
      hasQtyDiff,
    }
  }, [rows])

  // Extract single Rasio value (from fdRasio / fdRasioLr) to display outside table
  const rasioValue = useMemo(() => {
    for (const r of rows) {
      const v = getRowValue(r, ['fdRasio', 'fdRasioLr', 'Rasio', 'rasio', 'fdRatio', 'Ratio', 'ratio', 'fdRasioHarga', 'RasioHarga'])
      if (v !== null && v !== undefined && v !== '') {
        const num = typeof v === 'number' ? v : parseFloat(String(v || 0))
        if (!isNaN(num) && num > 0) return num
      }
    }
    return null
  }, [rows])

  // Extract Customer Name if returned by SP
  const custName = useMemo(() => {
    for (const r of rows) {
      const name = getRowValue(r, ['fdCustName', 'CustName', 'CustomerName', 'fdCustomerName'])
      if (name) return String(name).trim()
    }
    return null
  }, [rows])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/65 backdrop-blur-md animate-fadeIn">
      <div className="bg-[var(--color-surface)] w-full max-w-[98vw] xl:max-w-[94vw] rounded-[var(--radius-xl)] shadow-2xl border border-[var(--color-border)] flex flex-col max-h-[94vh] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-[var(--color-border)] bg-[var(--color-neutral)] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--color-primary)] text-white shadow-md shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-[var(--color-primary)] font-[var(--font-display)]">
                  Detail M3 per Marking
                </h2>
              </div>
              <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-[var(--color-secondary)]">
                <span>
                  Customer: <strong className="text-[var(--color-primary)] font-semibold">{custName || custCode || '—'}</strong>
                </span>
                <span>•</span>
                <span>Marking: <strong className="text-[var(--color-primary)] font-mono">{markingCode || '—'}</strong></span>
                {rasioValue !== null && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800 font-mono text-[11px]">
                      Rasio: {formatDecimal(rasioValue, 2)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-border)]/50 transition-colors"
            title={t('common.close') || 'Tutup'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metric Cards KPI Row */}
        <div className="p-3 sm:p-4 bg-[var(--color-neutral)]/40 border-b border-[var(--color-border)] shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {/* Total SJ */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-2.5 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                TOTAL SJ
              </p>
              <p className="mt-1 text-base font-bold text-[var(--color-primary)] font-mono">
                {summary.totalRows}
              </p>
            </div>

            {/* Total Berat */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-2.5 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-slate-600" />
                TOTAL BERAT
              </p>
              <p className="mt-1 text-base font-bold text-[var(--color-primary)] font-mono">
                {formatDecimal(summary.totalBerat, 2)} kg
              </p>
            </div>

            {/* M3 PL */}
            <div className="bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg p-2.5 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-rose-600" />
                M3 PACKING LIST
              </p>
              <p className="mt-1 text-base font-bold text-rose-900 dark:text-rose-100 font-mono">
                {formatDecimal(summary.totalM3PL, 4)} m³
              </p>
            </div>

            {/* M3 Gudang */}
            <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-lg p-2.5 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1">
                <Box className="w-3.5 h-3.5 text-blue-600" />
                M3 GUDANG
              </p>
              <p className="mt-1 text-base font-bold text-blue-900 dark:text-blue-100 font-mono">
                {formatDecimal(summary.totalM3Gdg, 4)} m³
              </p>
            </div>

            {/* M3 Komplain */}
            <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-lg p-2.5 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                M3 KOMPLAIN
              </p>
              <p className="mt-1 text-base font-bold text-amber-900 dark:text-amber-100 font-mono">
                {formatDecimal(summary.totalM3K, 4)} m³
              </p>
            </div>

            {/* M3 Bill */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-lg p-2.5 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                M3 BILL
              </p>
              <p className="mt-1 text-base font-bold text-emerald-900 dark:text-emerald-100 font-mono">
                {formatDecimal(summary.totalM3Bill, 4)} m³
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar Search & Table Count */}
        <div className="p-3 sm:p-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Menampilkan <strong className="text-[var(--color-primary)] font-mono">{filteredRows.length}</strong> dari {rows.length} baris data
          </div>

          <div className="relative min-w-[240px] max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari invoice, commodity, marking..."
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table Body */}
        <div className="p-3 sm:p-4 overflow-auto flex-1 min-h-[300px] bg-slate-50/50 dark:bg-slate-900/20">
          {loading ? (
            <div className="py-20 flex items-center justify-center">
              <LoadingSpinner message="Memuat detail data M3 per Marking..." />
            </div>
          ) : isError ? (
            <div className="p-6 text-center text-xs text-red-600 bg-red-50 rounded-xl border border-red-200">
              {t('billing.validation.error') || 'Gagal memuat detail M3 per Marking'}
            </div>
          ) : filteredRows.length === 0 ? (
            <EmptyState
              icon={<Database className="w-7 h-7" />}
              title="Data M3 per Marking Tidak Ditemukan"
              description={`Tidak ada baris data pada view qr_tbm3_perMarking_rev1 untuk CustCode: ${custCode} & Marking: ${markingCode}`}
            />
          ) : (
            <div className="overflow-x-auto border border-[var(--color-border)] rounded-xl shadow-xs bg-[var(--color-surface)]">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-[var(--color-border)] uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-300 font-bold sticky top-0 z-10">
                    <th className="p-2.5 border-r border-[var(--color-border)] w-10 text-center bg-slate-100 dark:bg-slate-800">#</th>
                    {activeColumns.map((col) => (
                      <th
                        key={col.label}
                        className={`p-2.5 border-r border-[var(--color-border)] whitespace-nowrap ${
                          col.textAlign === 'right'
                            ? 'text-right'
                            : col.textAlign === 'center'
                            ? 'text-center'
                            : 'text-left'
                        } ${col.headerBg || ''}`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {filteredRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors font-mono text-[11px]"
                    >
                      <td className="p-2.5 text-center border-r border-[var(--color-border)] text-slate-400 font-sans">
                        {idx + 1}
                      </td>
                      {activeColumns.map((col) => {
                        const val = getRowValue(row, col.keyCandidates)
                        let displayVal = '—'
                        if (val !== null && val !== undefined && val !== '') {
                          if (col.isNumber) {
                            const num = typeof val === 'number' ? val : parseFloat(String(val))
                            displayVal = isNaN(num) ? '—' : formatDecimal(num, col.decimals ?? 2)
                          } else if (col.isDate || (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/))) {
                            displayVal = formatDate(String(val))
                          } else {
                            displayVal = String(val)
                          }
                        }

                        return (
                          <td
                            key={col.label}
                            className={`p-2.5 border-r border-[var(--color-border)] whitespace-nowrap ${
                              col.textAlign === 'right'
                                ? 'text-right tabular-nums'
                                : col.textAlign === 'center'
                                ? 'text-center'
                                : 'text-left font-sans'
                            } ${col.cellBg || ''}`}
                          >
                            {col.label === 'Tipe' && displayVal !== '—' ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                                {displayVal}
                              </span>
                            ) : col.label === 'Tax' ? (
                              val === 1 || val === '1' || val === true || String(val).toUpperCase() === 'TAX' || String(val).toUpperCase() === 'YES' ? (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                                  TAX
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal">—</span>
                              )
                            ) : col.label === 'Over Weight' ? (
                              (() => {
                                const owVal = val !== null && val !== undefined && val !== ''
                                  ? (typeof val === 'number' ? val : parseFloat(String(val)))
                                  : computeOverWeight(row)
                                return owVal !== null && !isNaN(owVal) ? (
                                  <span className={`font-mono font-bold ${owVal > 0 ? 'text-amber-700 dark:text-amber-400' : owVal < 0 ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                    {formatDecimal(owVal, 2)} kg
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal">—</span>
                                )
                              })()
                            ) : col.label === 'BC' && displayVal !== '—' ? (
                              <span className="font-bold text-blue-700 dark:text-blue-400">{displayVal}</span>
                            ) : (
                              displayVal
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Total M3 per Tipe Breakdown & Executive Kesimpulan — Placed After Main Table */}
        {rows.length > 0 && (
          <div className="px-4 py-3 bg-slate-50/90 dark:bg-slate-900/80 border-t border-[var(--color-border)] shrink-0 flex flex-col gap-3">
            {/* Breakdown Table Grid */}
            {summary.m3ByType.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5 text-[10px] uppercase font-bold text-[var(--color-secondary)] tracking-wider">
                  <Layers className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                  <span>Total M3 per Tipe Komoditas</span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
                  <table className="w-full text-[11px] border-collapse font-mono">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/70 border-b border-[var(--color-border)] text-[9px] uppercase tracking-widest font-bold text-[var(--color-secondary)]">
                        <th className="px-3 py-1.5 text-left border-r border-[var(--color-border)] font-sans">Tipe Komoditas</th>
                        <th className="px-3 py-1.5 text-right border-r border-[var(--color-border)] text-rose-600 dark:text-rose-400">M3 PL</th>
                        <th className="px-3 py-1.5 text-right border-r border-[var(--color-border)] text-blue-600 dark:text-blue-400">M3 Gudang</th>
                        <th className="px-3 py-1.5 text-right border-r border-[var(--color-border)] text-amber-600 dark:text-amber-400">M3 Komplain</th>
                        <th className="px-3 py-1.5 text-right border-r border-[var(--color-border)] text-emerald-600 dark:text-emerald-400">M3 Bill</th>
                        <th className="px-3 py-1.5 text-center font-sans text-slate-500">SJ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {summary.m3ByType.map((t) => (
                        <tr key={t.typeName} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-3 py-1.5 border-r border-[var(--color-border)] font-sans font-semibold text-[var(--color-primary)] text-[11px] whitespace-nowrap">
                            {t.typeName}
                          </td>
                          <td className="px-3 py-1.5 text-right border-r border-[var(--color-border)] text-rose-700 dark:text-rose-300 tabular-nums">
                            {formatDecimal(t.totalM3PL, 4)}
                          </td>
                          <td className="px-3 py-1.5 text-right border-r border-[var(--color-border)] text-blue-700 dark:text-blue-300 tabular-nums font-bold">
                            {formatDecimal(t.totalM3Gdg, 4)}
                          </td>
                          <td className="px-3 py-1.5 text-right border-r border-[var(--color-border)] tabular-nums">
                            {t.totalM3K > 0
                              ? <span className="text-amber-700 dark:text-amber-300 font-bold">{formatDecimal(t.totalM3K, 4)}</span>
                              : <span className="text-slate-300 dark:text-slate-600">—</span>
                            }
                          </td>
                          <td className="px-3 py-1.5 text-right border-r border-[var(--color-border)] tabular-nums">
                            {t.totalM3Bill > 0
                              ? <span className="text-emerald-700 dark:text-emerald-300 font-bold">{formatDecimal(t.totalM3Bill, 4)}</span>
                              : <span className="text-slate-300 dark:text-slate-600">—</span>
                            }
                          </td>
                          <td className="px-3 py-1.5 text-center text-slate-500 font-sans">{t.count}</td>
                        </tr>
                      ))}
                      {/* Total Row */}
                      <tr className="bg-slate-100/80 dark:bg-slate-800/50 border-t-2 border-[var(--color-border)] font-bold">
                        <td className="px-3 py-1.5 border-r border-[var(--color-border)] font-sans text-[10px] uppercase text-[var(--color-secondary)] tracking-wider">TOTAL</td>
                        <td className="px-3 py-1.5 text-right border-r border-[var(--color-border)] text-rose-700 dark:text-rose-300 tabular-nums">{formatDecimal(summary.totalM3PL, 4)}</td>
                        <td className="px-3 py-1.5 text-right border-r border-[var(--color-border)] text-blue-700 dark:text-blue-300 tabular-nums">{formatDecimal(summary.totalM3Gdg, 4)}</td>
                        <td className="px-3 py-1.5 text-right border-r border-[var(--color-border)] text-amber-700 dark:text-amber-300 tabular-nums">
                          {summary.totalM3K > 0 ? formatDecimal(summary.totalM3K, 4) : <span className="text-slate-300 dark:text-slate-600 font-normal">—</span>}
                        </td>
                        <td className="px-3 py-1.5 text-right border-r border-[var(--color-border)] text-emerald-700 dark:text-emerald-300 tabular-nums">{formatDecimal(summary.totalM3Bill, 4)}</td>
                        <td className="px-3 py-1.5 text-center text-slate-500 font-sans">{summary.totalRows}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Kesimpulan Banner */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5 text-[10px] uppercase font-bold text-[var(--color-secondary)] tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                <span>Kesimpulan Validasi</span>
              </div>
              <div className="flex items-center flex-wrap gap-2">
                {/* M3 Bill vs Gudang */}
                {summary.isBillMatchingGdg ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800 font-mono">
                    <span className="text-emerald-600">✓</span>
                    M3 Bill {formatDecimal(summary.totalM3Bill, 4)} = SUM M3 Gudang {formatDecimal(summary.totalM3Gdg, 4)} m³
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800 font-mono">
                    <span>⚠</span>
                    M3 Bill {formatDecimal(summary.totalM3Bill, 4)} ≠ SUM M3 Gudang {formatDecimal(summary.totalM3Gdg, 4)} m³
                  </span>
                )}

                {/* Selisih M3 PL vs Gudang */}
                {Math.abs(summary.m3PlGdgDiff) > 0.001 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-900 font-mono">
                    <span className="text-rose-500">Δ</span>
                    PL vs Gudang: {formatDecimal(Math.abs(summary.m3PlGdgDiff), 4)} m³
                  </span>
                )}

                {/* OverWeight Banner */}
                {summary.hasOverWeightData && (
                  summary.totalOverWeight > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800 font-mono">
                      <span>⚠</span>
                      OverWeight Total: {formatDecimal(summary.totalOverWeight, 2)} kg
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800 font-mono">
                      <span className="text-emerald-600">✓</span>
                      Tidak Ada OverWeight
                    </span>
                  )
                )}

                {/* Qty comparison */}
                {summary.hasQtyDiff ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800 font-mono">
                    <span>⚠</span>
                    Qty Beda — SJ: {formatNumber(summary.totalQtySJ)}, Gdg: {formatNumber(summary.totalQtyGdg)}, PL: {formatNumber(summary.totalQtyPL)} Pcs
                  </span>
                ) : summary.totalQtySJ > 0 || summary.totalQtyGdg > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900 font-mono">
                    <span className="text-emerald-600">✓</span>
                    Qty SJ = Gdg = PL ({formatNumber(summary.totalQtySJ)} Pcs)
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        )}
        <div className="px-4 py-3 sm:px-6 border-t border-[var(--color-border)] bg-[var(--color-neutral)] flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[var(--color-secondary)]">
            Total <strong className="text-[var(--color-primary)] font-mono">{summary.totalRows}</strong> Surat Jalan / Invoice
          </div>

          <Button variant="secondary" size="sm" onClick={onClose} className="px-4">
            {t('common.close') || 'Tutup'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
