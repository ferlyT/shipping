import { useState, useMemo, Fragment } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Layers,
  Package,
  Scale,
  XCircle,
} from 'lucide-react'
import { formatDecimal, formatNumber } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Type2ComparisonPanel } from '../Type2ComparisonPanel'
import { CustMarkingDetailModal } from '../CustMarkingDetailModal'
import type { M3CheckResponse } from '../../types/billing.types'

export interface PhysicalAuditTabProps {
  isAir: boolean
  isType2: boolean
  billedM3: number
  effectiveBilledKg: number
  validationData?: M3CheckResponse | null
  invNo: string
  markingCode?: string | null
  isMatch: boolean
  matchLabel: string
  minChargeM3?: number
  isBilledBelowMinM3?: boolean
  matchedSourceKey?: string | null
  isCodUrgentShortfall?: boolean
  recommendedM3?: number
  custCode?: string | null
  custName?: string | null
  onSelectInvoice?: (invNo: string) => void
}

function extractMarkingGroup(markingNo?: string | null): string {
  if (!markingNo) return '(Tanpa Marking)'
  const trimmed = markingNo.trim()
  if (!trimmed) return '(Tanpa Marking)'
  const colonIdx = trimmed.indexOf(':')
  if (colonIdx !== -1) {
    const prefix = trimmed.slice(0, colonIdx).trim()
    return prefix || '(Tanpa Marking)'
  }
  return trimmed
}

export function PhysicalAuditTab({
  isAir,
  isType2,
  billedM3,
  effectiveBilledKg,
  validationData: res,
  invNo,
  markingCode,
  isMatch,
  matchLabel,
  minChargeM3 = 0.1,
  isBilledBelowMinM3 = false,
  matchedSourceKey,
  isCodUrgentShortfall = false,
  recommendedM3 = 0,
  custCode,
  custName,
  onSelectInvoice,
}: PhysicalAuditTabProps) {
  const [isCustMarkingModalOpen, setIsCustMarkingModalOpen] = useState(false)
  const [isMarkingDetailsOpen, setIsMarkingDetailsOpen] = useState(false)

  // Jika ini Type 2 (Compare M3 vs KG)
  if (isType2) {
    return (
      <div className="space-y-4">
        <Type2ComparisonPanel
          invNo={invNo}
          markingCode={markingCode}
        />
      </div>
    )
  }

  const m3Gdg = res?.m3Gudang?.values?.[0] ?? 0
  const m3PL = res?.m3PackingList?.values?.[0] ?? 0
  const m3K = res?.m3Komplain?.values?.[0] ?? 0
  const beratGdg = res?.fdJmlBeratGudang ?? res?.fdBeratList ?? 0
  const beratK = res?.fdJmlBeratKomplain ?? 0
  const qtyList = res?.fdQtyList ?? 0
  const qtyGdg = res?.fdTotalQtyGudang ?? 0
  const qtyK = res?.fdTotalQtyKomplain ?? 0

  // Data Per Batch Marking
  const custMarkingValues = res?.m3CustPerMarking?.values || []
  const plPerMarkingValues = res?.m3PLPerMarking?.values || []
  const komplainPerMarkingValues = res?.m3KomplainPerMarking?.values || []
  const totalEntryList = res?.totalEntryList ?? res?.m3CustPerMarking?.totalEntryList ?? null
  const totalEntryKomplain = res?.totalEntryKomplain ?? res?.m3KomplainPerMarking?.totalEntryKomplain ?? null
  const beratSJ = res?.fdBeratSJ ?? res?.totalJmlBeratSJ ?? 0
  const markingDetails = res?.markingDetails || []

  const resolvedMarkingCode = markingCode || res?.customer?.fdMarkingCode || res?.markingDetails?.[0]?.fdMarkingNo || ''
  const effectiveCustCode = custCode || res?.customer?.fdCustCode || ''
  const effectiveCustName = custName || res?.customer?.fdCustName || ''

  // Grouping fdMarkingNo berdasarkan string sebelum karakter ":"
  const markingGroups = useMemo(() => {
    const breakdown = res?.relatedBillsSummary?.listCodeBreakdown || []
    if (breakdown.length === 0) return []

    const groupMap = new Map<string, typeof breakdown>()
    for (const item of breakdown) {
      const grp = extractMarkingGroup(item.fdMarkingNo)
      if (!groupMap.has(grp)) {
        groupMap.set(grp, [])
      }
      groupMap.get(grp)!.push(item)
    }

    const result: Array<{
      groupName: string
      items: typeof breakdown
      subtotalM3Gudang: number
      subtotalBerat: number
      subtotalQty: number
      subtotalBilledM3: number
      allHaveBill: boolean
      hasMissingBill: boolean
    }> = []

    for (const [groupName, items] of groupMap.entries()) {
      const subtotalM3Gudang = items.reduce((acc, x) => acc + (x.m3Gudang || 0), 0)
      const subtotalBerat = items.reduce((acc, x) => acc + (x.berat || 0), 0)
      const subtotalQty = items.reduce((acc, x) => acc + (x.qty || 0), 0)
      const subtotalBilledM3 = items.reduce((acc, x) => acc + (x.billedM3 || 0), 0)
      const hasMissingBill = items.some((x) => !x.hasBill)
      const allHaveBill = !hasMissingBill && items.length > 0

      result.push({
        groupName,
        items,
        subtotalM3Gudang,
        subtotalBerat,
        subtotalQty,
        subtotalBilledM3,
        allHaveBill,
        hasMissingBill,
      })
    }

    return result
  }, [res?.relatedBillsSummary?.listCodeBreakdown])

  const fallbackMarkingGroups = useMemo(() => {
    const invoices = res?.relatedBillsSummary?.relatedInvoices || []
    if (invoices.length === 0) return []

    const groupMap = new Map<string, typeof invoices>()
    for (const inv of invoices) {
      const grp = extractMarkingGroup(inv.markingNo)
      if (!groupMap.has(grp)) {
        groupMap.set(grp, [])
      }
      groupMap.get(grp)!.push(inv)
    }

    const result: Array<{
      groupName: string
      items: typeof invoices
      subtotalM3Gudang: number
      subtotalBerat: number
      subtotalQty: number
      subtotalBilledM3: number
    }> = []

    for (const [groupName, items] of groupMap.entries()) {
      const subtotalM3Gudang = items.reduce((acc, x) => acc + (x.m3Gudang || 0), 0)
      const subtotalBerat = items.reduce((acc, x) => acc + (x.berat || 0), 0)
      const subtotalQty = items.reduce((acc, x) => acc + (x.qty || 0), 0)
      const subtotalBilledM3 = items.reduce((acc, x) => acc + (x.billedM3 || 0), 0)

      result.push({
        groupName,
        items,
        subtotalM3Gudang,
        subtotalBerat,
        subtotalQty,
        subtotalBilledM3,
      })
    }

    return result
  }, [res?.relatedBillsSummary?.relatedInvoices])

  // Helper normalisasi min charge M3 (0.1) untuk pencocokan nilai kubikasi laut
  const normM3 = (v: number) => (v > 0 && v < 0.1 ? 0.1 : v)

  // Evaluasi kandidat data fisik yang dipakai oleh tagihan (Bill)
  const isUsedPL = Boolean(
    isMatch &&
      !isAir &&
      (matchedSourceKey === 'PL' ||
        (m3PL > 0 && (Math.abs(normM3(m3PL) - billedM3) < 0.001 || Math.abs(m3PL - billedM3) < 0.001)))
  )

  const isUsedKomplain = Boolean(
    isMatch &&
      (isAir
        ? matchedSourceKey === 'Komplain' || (beratK > 0 && Math.abs(beratK - effectiveBilledKg) < 0.01)
        : matchedSourceKey === 'Komplain' ||
          (m3K > 0 && (Math.abs(normM3(m3K) - billedM3) < 0.001 || Math.abs(m3K - billedM3) < 0.001)))
  )

  const isUsedRelatedBills = Boolean(
    isMatch &&
      !isAir &&
      (matchedSourceKey?.startsWith('RelatedBills') ||
        (res?.relatedBillsSummary?.sumM3Gudang &&
          Math.abs(normM3(res.relatedBillsSummary.sumM3Gudang) - billedM3) < 0.001))
  )

  const isUsedGudang = Boolean(
    isMatch &&
      (isAir
        ? matchedSourceKey === 'EntryList' ||
          matchedSourceKey === 'SJ' ||
          (!isUsedKomplain && beratGdg > 0 && Math.abs(beratGdg - effectiveBilledKg) < 0.01)
        : matchedSourceKey === 'Gudang' ||
          matchedSourceKey === 'ListBatch' ||
          isUsedRelatedBills ||
          (!isUsedPL && !isUsedKomplain && m3Gdg > 0 && (Math.abs(normM3(m3Gdg) - billedM3) < 0.001 || Math.abs(m3Gdg - billedM3) < 0.001)))
  )

  // Evaluasi kandidat data per batch marking yang cocok
  const isUsedMarkingGudang = Boolean(
    isMatch &&
      !isAir &&
      (matchedSourceKey === 'Marking' ||
        matchedSourceKey === 'GudangPerMarking' ||
        (custMarkingValues.length > 0 &&
          (Math.abs(normM3(custMarkingValues[0]) - billedM3) < 0.001 || Math.abs(custMarkingValues[0] - billedM3) < 0.001)))
  )

  const isUsedPLPerMarking = Boolean(
    isMatch &&
      !isAir &&
      (matchedSourceKey === 'PLPerMarking' ||
        (plPerMarkingValues.length > 0 &&
          (Math.abs(normM3(plPerMarkingValues[0]) - billedM3) < 0.001 || Math.abs(plPerMarkingValues[0] - billedM3) < 0.001)))
  )

  const isUsedKomplainPerMarking = Boolean(
    isMatch &&
      !isAir &&
      (matchedSourceKey === 'KomplainPerMarking' ||
        (komplainPerMarkingValues.length > 0 &&
          (Math.abs(normM3(komplainPerMarkingValues[0]) - billedM3) < 0.001 || Math.abs(komplainPerMarkingValues[0] - billedM3) < 0.001)))
  )

  const isUsedKomplainHybrid = Boolean(
    isMatch &&
      !isAir &&
      (matchedSourceKey === 'KomplainHybrid' ||
        (res?.m3KomplainPlusGudang && Math.abs(normM3(res.m3KomplainPlusGudang) - billedM3) < 0.001))
  )

  const hasQtyDiff = qtyList !== qtyGdg || (qtyK > 0 && qtyK !== qtyGdg)
  const hasWeightDiff = (beratK > 0 && Math.abs(beratK - beratGdg) > 0.1) || (beratSJ > 0 && Math.abs(beratSJ - beratGdg) > 0.5)

  return (
    <div className="space-y-3.5">
      {/* ─── Peringatan Tagihan di Bawah Min Charge M3 ─── */}
      {isBilledBelowMinM3 && (
        <div className="flex items-start gap-3 p-3 rounded-lg border-l-4 border-l-amber-500 border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 text-xs shadow-xs">
          <div className="w-6 h-6 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-0.5">
            <div className="font-bold text-amber-800 dark:text-amber-300">
              Peringatan: Tagihan di Bawah Batas Minimum Charge ({formatDecimal(minChargeM3, 3)} m³)
            </div>
            <p className="text-[11px] text-[var(--color-secondary)] leading-relaxed">
              Volume yang ditagihkan (<span className="font-mono font-semibold text-[var(--color-primary)]">{formatDecimal(billedM3, 4)} m³</span>) lebih rendah dari batas minimum charge (<span className="font-mono font-semibold text-[var(--color-primary)]">{formatDecimal(minChargeM3, 4)} m³</span>). Pastikan apakah penagihan volume riil ini disengaja atau seharusnya ditagihkan dengan tarif batas minimum.
            </p>
          </div>
        </div>
      )}

      {/* ─── Peringatan Tagihan di Bawah Rekomendasi COD/Urgent ─── */}
      {isCodUrgentShortfall && !isBilledBelowMinM3 && (
        <div className="flex items-start gap-3 p-3 rounded-lg border-l-4 border-l-amber-500 border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 text-xs shadow-xs">
          <div className="w-6 h-6 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-0.5">
            <div className="font-bold text-amber-800 dark:text-amber-300">
              Perhatian: Volume Ditagihkan ({formatDecimal(billedM3, 4)} m³) di Bawah Rekomendasi COD/Urgent ({formatDecimal(recommendedM3, 4)} m³)
            </div>
            <p className="text-[11px] text-[var(--color-secondary)] leading-relaxed">
              Pelanggan ini berstatus COD / Urgent di mana disarankan menagihkan volume tertinggi (<span className="font-mono font-semibold text-[var(--color-primary)]">{formatDecimal(recommendedM3, 4)} m³</span> dari Packing List). Invoice saat ini menagihkan volume riil gudang (<span className="font-mono font-semibold text-[var(--color-primary)]">{formatDecimal(billedM3, 4)} m³</span>). Pastikan apakah penagihan volume riil ini disengaja sebelum menerbitkan invoice.
            </p>
          </div>
        </div>
      )}

      {/* ─── Kelompok Bill Terkait (Induk & Pecahan dalam 1 Batch) ─── */}
      {res?.relatedBillsSummary?.hasRelatedBills && (
        <div className="p-3 sm:p-4 rounded-xl border border-sky-500/30 bg-sky-50/40 dark:bg-sky-950/20 text-xs space-y-3 shadow-xs">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-500/20 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500" />
              </span>
              <span className="font-bold text-sky-900 dark:text-sky-200 text-xs sm:text-[13px] tracking-tight">
                Kelompok Bill Terkait (Induk &amp; Pecahan dalam 1 Batch)
              </span>
              {markingCode && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                  {markingCode.split(';')[0]?.trim()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {res.relatedBillsSummary.allListCodesHaveBill !== false ? (
                <span className="inline-flex items-center gap-1 text-[10.5px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/30">
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                  <span>Semua ListCode Ada Bill ({res.relatedBillsSummary.totalListCodesCount || res.relatedBillsSummary.relatedListCodes.length}/{res.relatedBillsSummary.totalListCodesCount || res.relatedBillsSummary.relatedListCodes.length})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10.5px] px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 font-semibold border border-rose-500/30 animate-pulse">
                  <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                  <span>{res.relatedBillsSummary.missingBillsCount} ListCode Belum Ada Bill</span>
                </span>
              )}
              <span className="text-[10.5px] px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 font-semibold border border-sky-500/30">
                {res.relatedBillsSummary.isParent ? 'Invoice Induk' : `Invoice Pecahan (${res.relatedBillsSummary.childLetter || 'Anak'})`}
              </span>
              {markingGroups.length > 0 && (
                <span className="text-[10.5px] px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-500/30">
                  {markingGroups.length} Grup Marking
                </span>
              )}
            </div>
          </div>

          {/* Tabel Rekapitulasi ListCode & Status Bill */}
          <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-[var(--color-surface-hover)] border-b border-[var(--color-border)] text-[10px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider">
                  <th className="py-2 px-2.5">No. Invoice</th>
                  <th className="py-2 px-2">Posisi</th>
                  <th className="py-2 px-2 font-mono">fdMarkingNo</th>
                  <th className="py-2 px-2 font-mono">fdListCode</th>
                  <th className="py-2 px-2 text-right">M³ Fisik</th>
                  <th className="py-2 px-2 text-right">Berat (kg)</th>
                  <th className="py-2 px-2 text-right">Koli</th>
                  <th className="py-2 px-2 text-right">M³ Ditagih</th>
                  <th className="py-2 px-2.5 text-center">Status Bill</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {markingGroups.length > 0 ? (
                  markingGroups.map((grp) => (
                    <Fragment key={grp.groupName}>
                      {/* Sub-header Pemisah Grup Prefix Marking */}
                      <tr className="bg-sky-500/10 dark:bg-sky-950/50 border-t-2 border-b border-sky-500/30 text-[10.5px] font-semibold">
                        <td colSpan={4} className="py-1.5 px-2.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[12px]">📦</span>
                            <span className="font-mono font-bold text-sky-900 dark:text-sky-200">
                              {grp.groupName}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-800 dark:text-sky-300 font-mono font-bold">
                              {grp.items.length} ListCode
                            </span>
                            {grp.hasMissingBill && (
                              <span className="text-[8.5px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold border border-rose-500/30 animate-pulse">
                                Missing Bill
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-right tabular-nums text-emerald-800 dark:text-emerald-300 font-bold">
                          {formatDecimal(grp.subtotalM3Gudang, 4)} m³
                        </td>
                        <td className="py-1.5 px-2 text-right tabular-nums text-[var(--color-primary)] font-bold">
                          {formatDecimal(grp.subtotalBerat, 2)} kg
                        </td>
                        <td className="py-1.5 px-2 text-right tabular-nums text-[var(--color-primary)] font-bold">
                          {formatNumber(grp.subtotalQty)}
                        </td>
                        <td className="py-1.5 px-2 text-right tabular-nums text-sky-800 dark:text-sky-300 font-bold">
                          {grp.subtotalBilledM3 > 0 ? `${formatDecimal(grp.subtotalBilledM3, 4)} m³` : '—'}
                        </td>
                        <td className="py-1.5 px-2.5 text-center">
                          {grp.allHaveBill ? (
                            <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                              ✓ Lengkap
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-rose-700 dark:text-rose-400 bg-rose-500/15 px-1.5 py-0.2 rounded border border-rose-500/30">
                              Belum Lengkap
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Baris-baris data dalam grup */}
                      {grp.items.map((item) => {
                        const isCur = item.isCurrent || (item.invNo && (invNo || '').replace(/^[\x00-\x1F]+/, '').trim() === item.invNo.replace(/^[\x00-\x1F]+/, '').trim())
                        return (
                          <tr
                            key={item.listCode}
                            className={`transition-colors ${
                              isCur
                                ? 'bg-sky-500/10 dark:bg-sky-950/40 font-semibold'
                                : !item.hasBill
                                  ? 'bg-rose-500/5 dark:bg-rose-950/20'
                                  : 'hover:bg-[var(--color-surface-hover)]'
                            }`}
                          >
                            <td className="py-1.5 px-2.5 font-mono">
                              <div className="flex items-center gap-1.5">
                                {item.invNo ? (
                                  onSelectInvoice ? (
                                    <button
                                      type="button"
                                      onClick={() => onSelectInvoice(item.invNo!)}
                                      className="text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
                                      title={`Buka invoice ${item.invNo}`}
                                    >
                                      <span>{item.invNo}</span>
                                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                    </button>
                                  ) : (
                                    <span>{item.invNo}</span>
                                  )
                                ) : (
                                  <span className="text-[var(--color-secondary)] italic">—</span>
                                )}
                                {isCur && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                                    Saat Ini
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-1.5 px-2">
                              {item.isParent ? (
                                <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold border border-sky-500/20">
                                  Induk
                                </span>
                              ) : item.childLetter ? (
                                <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-500/20">
                                  Pecahan {item.childLetter}
                                </span>
                              ) : (
                                <span className="text-[var(--color-secondary)] text-[10px]">—</span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 font-mono text-[var(--color-secondary)]">
                              {item.fdMarkingNo || '—'}
                            </td>
                            <td className="py-1.5 px-2 font-mono tabular-nums text-[var(--color-primary)]">
                              {item.listCode}
                            </td>
                            <td className="py-1.5 px-2 text-right tabular-nums text-emerald-700 dark:text-emerald-400 font-medium">
                              {formatDecimal(item.m3Gudang, 4)} m³
                            </td>
                            <td className="py-1.5 px-2 text-right tabular-nums">
                              {formatDecimal(item.berat, 2)} kg
                            </td>
                            <td className="py-1.5 px-2 text-right tabular-nums">
                              {formatNumber(item.qty)}
                            </td>
                            <td className="py-1.5 px-2 text-right tabular-nums">
                              {item.billedM3 > 0 ? (
                                <span className="text-sky-700 dark:text-sky-300 font-semibold">
                                  {formatDecimal(item.billedM3, 4)} m³
                                </span>
                              ) : item.firstItemName ? (
                                <span className="text-[10px] text-[var(--color-secondary)] truncate max-w-[130px] inline-block" title={item.firstItemName}>
                                  {item.firstItemName}
                                </span>
                              ) : (
                                <span className="text-[10px] text-[var(--color-secondary)] italic">Digabung</span>
                              )}
                            </td>
                            <td className="py-1.5 px-2.5 text-center">
                              {item.hasBill ? (
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.2">
                                  <span>✓</span>
                                  <span>Ada Bill</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-rose-700 dark:text-rose-400 bg-rose-500/15 border border-rose-500/30 rounded-full px-2 py-0.2 animate-pulse">
                                  <span>✕</span>
                                  <span>Belum Ada Bill</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </Fragment>
                  ))
                ) : fallbackMarkingGroups.length > 0 ? (
                  /* Fallback bila listCodeBreakdown belum tersedia */
                  fallbackMarkingGroups.map((grp) => (
                    <Fragment key={grp.groupName}>
                      {/* Sub-header Pemisah Grup Prefix Marking Fallback */}
                      <tr className="bg-sky-500/10 dark:bg-sky-950/50 border-t-2 border-b border-sky-500/30 text-[10.5px] font-semibold">
                        <td colSpan={4} className="py-1.5 px-2.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[12px]">📦</span>
                            <span className="font-mono font-bold text-sky-900 dark:text-sky-200">
                              {grp.groupName}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-800 dark:text-sky-300 font-mono font-bold">
                              {grp.items.length} Invoice
                            </span>
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-right tabular-nums text-emerald-800 dark:text-emerald-300 font-bold">
                          {formatDecimal(grp.subtotalM3Gudang, 4)} m³
                        </td>
                        <td className="py-1.5 px-2 text-right tabular-nums text-[var(--color-primary)] font-bold">
                          {formatDecimal(grp.subtotalBerat, 2)} kg
                        </td>
                        <td className="py-1.5 px-2 text-right tabular-nums text-[var(--color-primary)] font-bold">
                          {formatNumber(grp.subtotalQty)}
                        </td>
                        <td className="py-1.5 px-2 text-right tabular-nums text-sky-800 dark:text-sky-300 font-bold">
                          {grp.subtotalBilledM3 > 0 ? `${formatDecimal(grp.subtotalBilledM3, 4)} m³` : '—'}
                        </td>
                        <td className="py-1.5 px-2.5 text-center">
                          <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                            ✓ Terdata
                          </span>
                        </td>
                      </tr>

                      {grp.items.map((inv) => (
                        <tr key={inv.invNo} className="hover:bg-[var(--color-surface-hover)]">
                          <td className="py-1.5 px-2.5 font-mono">{inv.invNo}</td>
                          <td className="py-1.5 px-2">
                            <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold border border-sky-500/20">
                              {inv.isParent ? 'Induk' : 'Pecahan'}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 font-mono text-[var(--color-secondary)]">{inv.markingNo || '—'}</td>
                          <td className="py-1.5 px-2 font-mono tabular-nums">{inv.listCode || '—'}</td>
                          <td className="py-1.5 px-2 text-right tabular-nums text-emerald-700 dark:text-emerald-400 font-medium">
                            {inv.m3Gudang !== undefined ? `${formatDecimal(inv.m3Gudang, 4)} m³` : '—'}
                          </td>
                          <td className="py-1.5 px-2 text-right tabular-nums">
                            {inv.berat !== undefined ? `${formatDecimal(inv.berat, 2)} kg` : '—'}
                          </td>
                          <td className="py-1.5 px-2 text-right tabular-nums">
                            {inv.qty !== undefined ? formatNumber(inv.qty) : '—'}
                          </td>
                          <td className="py-1.5 px-2 text-right tabular-nums">
                            {inv.billedM3 > 0 ? `${formatDecimal(inv.billedM3, 4)} m³` : (inv.firstItemName || 'Digabung')}
                          </td>
                          <td className="py-1.5 px-2.5 text-center">
                            <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.2">
                              <span>✓</span>
                              <span>Ada Bill</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))
                ) : null}
              </tbody>
              <tfoot>
                <tr className="bg-[var(--color-surface-hover)] border-t-2 border-[var(--color-border)] font-bold text-[11px]">
                  <td colSpan={4} className="py-2.5 px-2.5 text-[var(--color-primary)]">
                    Total Rekapitulasi ({res.relatedBillsSummary.totalListCodesCount || res.relatedBillsSummary.relatedListCodes.length} ListCode)
                  </td>
                  <td className="py-2.5 px-2 text-right text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {formatDecimal(res.relatedBillsSummary.sumM3Gudang, 4)} m³
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums">
                    {formatDecimal(res.relatedBillsSummary.sumBerat, 2)} kg
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums">
                    {formatNumber(res.relatedBillsSummary.sumQty)} Coly
                  </td>
                  <td className="py-2.5 px-2 text-right text-sky-700 dark:text-sky-300 tabular-nums">
                    {formatDecimal(res.relatedBillsSummary.totalBilledM3, 4)} m³
                  </td>
                  <td className="py-2.5 px-2.5 text-center">
                    {res.relatedBillsSummary.allListCodesHaveBill !== false ? (
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">100% Lengkap</span>
                    ) : (
                      <span className="text-[10px] text-rose-700 dark:text-rose-400 font-bold">
                        {res.relatedBillsSummary.missingBillsCount} Missing
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Keterangan Sistem Pecahan */}
          <div className="text-[10.5px] text-[var(--color-secondary)] leading-relaxed flex items-start gap-1.5 pt-0.5">
            <span className="text-sky-600 dark:text-sky-400 font-bold">ℹ Catatan:</span>
            <span>
              Invoice Induk (<span className="font-mono font-medium text-[var(--color-primary)]">{res.relatedBillsSummary.parentInvNo}</span>) menagihkan akumulasi volume/rupiah seluruh muatan dalam 1 batch, sedangkan Invoice Pecahan (A, B, C, dst) diterbitkan Rp 0 sebagai penampung fisik listcode, packing list, dan surat jalan terkait.
            </span>
          </div>
        </div>
      )}

      {/* ─── Primary KPI Cards Ukuran ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Card 1: Nilai Tagihan (Ditagihkan) */}
        <div
          className={`p-3 rounded-xl border transition-all duration-200 ${
            isBilledBelowMinM3
              ? 'border-amber-500/60 bg-amber-500/5 shadow-xs'
              : isMatch
                ? 'border-sky-500/60 dark:border-sky-400/50 bg-sky-500/[0.03] shadow-xs'
                : 'border-rose-500/50 bg-rose-500/5 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] block">
              {isAir ? 'Berat Ditagihkan' : 'Volume Ditagihkan'}
            </span>
            {isBilledBelowMinM3 ? (
              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 rounded px-1.5 py-0.2">
                &lt; Min M³
              </span>
            ) : isMatch ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-sky-700 dark:text-sky-300 bg-sky-500/15 border border-sky-500/30 rounded px-1.5 py-0.2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                Ditagihkan
              </span>
            ) : (
              <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/15 border border-rose-500/30 rounded px-1.5 py-0.2">
                Selisih
              </span>
            )}
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[var(--color-primary)] mt-1 tracking-tight">
            {isAir ? `${formatNumber(effectiveBilledKg)} kg` : `${formatDecimal(billedM3, 4)} m³`}
          </div>
          <div className="border-t border-[var(--color-border)]/50 pt-1.5 mt-1.5 flex items-center justify-between text-[10.5px] text-[var(--color-secondary)]">
            <span>Status</span>
            <span className="font-semibold text-[var(--color-primary)] truncate max-w-[120px]" title={matchLabel}>
              {isBilledBelowMinM3 ? `Min: ${formatDecimal(minChargeM3, 3)} m³` : matchLabel}
            </span>
          </div>
        </div>

        {/* Card 2: Data Fisik Gudang */}
        <div
          className={`p-3 rounded-xl border transition-all duration-200 ${
            isUsedGudang
              ? 'border-emerald-500/60 dark:border-emerald-400/50 bg-emerald-500/[0.04] shadow-xs ring-1 ring-emerald-500/20'
              : 'border-[var(--color-border)] bg-[var(--color-surface)]'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] block">
              {isAir ? 'Berat Gudang' : 'Volume Gudang'}
            </span>
            {isUsedGudang && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded px-1.5 py-0.2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Dipakai Bill
              </span>
            )}
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[var(--color-primary)] mt-1 tracking-tight">
            {isAir ? `${formatNumber(beratGdg)} kg` : `${formatDecimal(m3Gdg, 4)} m³`}
          </div>
          <div className="border-t border-[var(--color-border)]/50 pt-1.5 mt-1.5 flex items-center justify-between text-[10.5px] text-[var(--color-secondary)]">
            <span>Sumber</span>
            <span className="font-semibold text-[var(--color-primary)]">
              {isUsedGudang ? 'Acuan Tagihan' : m3Gdg > 0 || beratGdg > 0 ? 'tbEntryList' : 'Belum Ada'}
            </span>
          </div>
        </div>

        {/* Card 3: Packing List (Laut) */}
        {!isAir && (
          <div
            className={`p-3 rounded-xl border transition-all duration-200 ${
              isUsedPL
                ? 'border-emerald-500/60 dark:border-emerald-400/50 bg-emerald-500/[0.04] shadow-xs ring-1 ring-emerald-500/20'
                : 'border-[var(--color-border)] bg-[var(--color-surface)]'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] block">
                Volume Packing List
              </span>
              {isUsedPL && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded px-1.5 py-0.2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Dipakai Bill
                </span>
              )}
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[var(--color-primary)] mt-1 tracking-tight">
              {m3PL > 0 ? `${formatDecimal(m3PL, 4)} m³` : '—'}
            </div>
            <div className="border-t border-[var(--color-border)]/50 pt-1.5 mt-1.5 flex items-center justify-between text-[10.5px] text-[var(--color-secondary)]">
              <span>Sumber</span>
              <span className="font-semibold text-[var(--color-primary)]">
                {isUsedPL ? 'Acuan Tagihan' : 'Dokumen PL'}
              </span>
            </div>
          </div>
        )}

        {/* Card 4: Komplain */}
        <div
          className={`p-3 rounded-xl border transition-all duration-200 ${
            isUsedKomplain
              ? 'border-emerald-500/60 dark:border-emerald-400/50 bg-emerald-500/[0.04] shadow-xs ring-1 ring-emerald-500/20'
              : 'border-[var(--color-border)] bg-[var(--color-surface)]'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] block">
              {isAir ? 'Berat Komplain' : 'Volume Komplain'}
            </span>
            {isUsedKomplain && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded px-1.5 py-0.2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Dipakai Bill
              </span>
            )}
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[var(--color-primary)] mt-1 tracking-tight">
            {isAir ? (beratK > 0 ? `${formatNumber(beratK)} kg` : '—') : m3K > 0 ? `${formatDecimal(m3K, 4)} m³` : '—'}
          </div>
          <div className="border-t border-[var(--color-border)]/50 pt-1.5 mt-1.5 flex items-center justify-between text-[10.5px] text-[var(--color-secondary)]">
            <span>Status</span>
            <span className="font-semibold text-[var(--color-primary)]">
              {isUsedKomplain ? 'Acuan Tagihan' : m3K > 0 || beratK > 0 ? 'Klaim Disetujui' : 'Nihil'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Data Fisik Per Batch Marking ─── */}
      <div className="p-3.5 sm:p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3 shadow-xs">
        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[var(--color-border)]/60 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
              <Layers className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
              Data Fisik Per Batch Marking
            </h4>
            {resolvedMarkingCode && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-secondary)]">
                {resolvedMarkingCode}
              </span>
            )}
          </div>
          {effectiveCustCode && resolvedMarkingCode && (
            <button
              type="button"
              onClick={() => setIsCustMarkingModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 border border-sky-500/30 transition-all active:scale-[0.98] cursor-pointer"
              title="Buka rincian lengkap form marking pelanggan"
            >
              <span>Detail Marking Pelanggan</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Grid KPI Cards Per Marking */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {!isAir ? (
            <>
              {/* Card 1: M3 Gudang Per Marking */}
              <div
                className={`p-3 rounded-lg border transition-all ${
                  isUsedMarkingGudang
                    ? 'border-emerald-500/60 dark:border-emerald-400/50 bg-emerald-500/[0.04] shadow-xs ring-1 ring-emerald-500/20'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] block truncate">
                    M³ Marking (Gdg)
                  </span>
                  {isUsedMarkingGudang && (
                    <span className="inline-flex items-center gap-1 text-[8.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded px-1.5 py-0.2">
                      Dipakai Bill
                    </span>
                  )}
                </div>
                <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-[var(--color-primary)] mt-1">
                  {custMarkingValues.length > 0 ? `${formatDecimal(custMarkingValues[0], 4)} m³` : '—'}
                </div>
                <div className="text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/50 pt-1 mt-1">
                  <span>Total ListCode</span>
                  <span className="font-semibold text-[var(--color-primary)]">
                    {totalEntryList !== null ? `${formatNumber(totalEntryList)} LC` : '—'}
                  </span>
                </div>
              </div>

              {/* Card 2: PL Per Marking */}
              <div
                className={`p-3 rounded-lg border transition-all ${
                  isUsedPLPerMarking
                    ? 'border-emerald-500/60 dark:border-emerald-400/50 bg-emerald-500/[0.04] shadow-xs ring-1 ring-emerald-500/20'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] block truncate">
                    PL Per Marking
                  </span>
                  {isUsedPLPerMarking && (
                    <span className="inline-flex items-center gap-1 text-[8.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded px-1.5 py-0.2">
                      Dipakai Bill
                    </span>
                  )}
                </div>
                <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-[var(--color-primary)] mt-1">
                  {plPerMarkingValues.length > 0 ? `${formatDecimal(plPerMarkingValues[0], 4)} m³` : '—'}
                </div>
                <div className="text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/50 pt-1 mt-1">
                  <span>Packing List</span>
                  <span className="font-semibold text-[var(--color-primary)]">
                    {plPerMarkingValues.length > 0 ? 'Dokumen PL' : '—'}
                  </span>
                </div>
              </div>

              {/* Card 3: Komplain Per Marking */}
              <div
                className={`p-3 rounded-lg border transition-all ${
                  isUsedKomplainPerMarking
                    ? 'border-emerald-500/60 dark:border-emerald-400/50 bg-emerald-500/[0.04] shadow-xs ring-1 ring-emerald-500/20'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] block truncate">
                    Komplain Marking
                  </span>
                  {isUsedKomplainPerMarking && (
                    <span className="inline-flex items-center gap-1 text-[8.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded px-1.5 py-0.2">
                      Dipakai Bill
                    </span>
                  )}
                </div>
                <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-[var(--color-primary)] mt-1">
                  {komplainPerMarkingValues.length > 0 ? `${formatDecimal(komplainPerMarkingValues[0], 4)} m³` : '—'}
                </div>
                <div className="text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/50 pt-1 mt-1">
                  <span>Klaim</span>
                  <span className="font-semibold text-[var(--color-primary)]">
                    {totalEntryKomplain !== null && totalEntryKomplain > 0 ? `${formatNumber(totalEntryKomplain)} LC` : 'Nihil'}
                  </span>
                </div>
              </div>

              {/* Card 4: Komplain Hybrid ATAU Total Berat Marking */}
              {res?.m3KomplainPlusGudang && res.m3KomplainPlusGudang > 0 ? (
                <div
                  className={`p-3 rounded-lg border transition-all ${
                    isUsedKomplainHybrid
                      ? 'border-emerald-500/60 dark:border-emerald-400/50 bg-emerald-500/[0.04] shadow-xs ring-1 ring-emerald-500/20'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] block truncate" title="Komplain Parsial + Gudang">
                      Komplain + Gudang
                    </span>
                    {isUsedKomplainHybrid && (
                      <span className="inline-flex items-center gap-1 text-[8.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded px-1.5 py-0.2">
                        Dipakai Bill
                      </span>
                    )}
                  </div>
                  <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-[var(--color-primary)] mt-1">
                    {formatDecimal(res.m3KomplainPlusGudang, 4)} m³
                  </div>
                  <div className="text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/50 pt-1 mt-1">
                    <span>Parsial</span>
                    <span className="font-semibold text-[var(--color-primary)]">
                      {res.countKomplainLC ?? 0} K + {res.countGudangLC ?? 0} Gdg
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] block truncate">
                      Total Berat Batch
                    </span>
                  </div>
                  <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-[var(--color-primary)] mt-1">
                    {res?.totalBeratPerMarking ? `${formatNumber(res.totalBeratPerMarking)} kg` : '—'}
                  </div>
                  <div className="text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/50 pt-1 mt-1">
                    <span>Timbangan</span>
                    <span className="font-semibold text-[var(--color-primary)]">
                      {res?.totalBeratPerMarking ? 'Akumulasi Batch' : '—'}
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Air: VFC Marking */}
              <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] block truncate">
                  VFC Gudang Marking
                </span>
                <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-[var(--color-primary)] mt-1">
                  {res?.vfcGudangPerMarking ? `${formatDecimal(res.vfcGudangPerMarking, 2)} kg` : '—'}
                </div>
                <div className="text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/50 pt-1 mt-1">
                  <span>Total ListCode</span>
                  <span className="font-semibold text-[var(--color-primary)]">{totalEntryList ?? '—'} LC</span>
                </div>
              </div>

              {/* Air: VFC Komplain */}
              <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] block truncate">
                  VFC Komplain Marking
                </span>
                <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-[var(--color-primary)] mt-1">
                  {res?.vfcKomplainPerMarking ? `${formatDecimal(res.vfcKomplainPerMarking, 2)} kg` : '—'}
                </div>
                <div className="text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/50 pt-1 mt-1">
                  <span>Total Komplain</span>
                  <span className="font-semibold text-[var(--color-primary)]">{totalEntryKomplain ?? '—'} LC</span>
                </div>
              </div>

              {/* Air: Berat Surat Jalan */}
              <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] block truncate">
                  Berat Surat Jalan
                </span>
                <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-[var(--color-primary)] mt-1">
                  {beratSJ > 0 ? `${formatDecimal(beratSJ, 2)} kg` : '—'}
                </div>
                <div className="text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/50 pt-1 mt-1">
                  <span>Dokumen SJ</span>
                  <span className="font-semibold text-[var(--color-primary)]">{beratSJ > 0 ? 'Tercatat' : '—'}</span>
                </div>
              </div>

              {/* Air: Total Berat Fisik Marking */}
              <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] block truncate">
                  Total Berat Fisik
                </span>
                <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-[var(--color-primary)] mt-1">
                  {res?.totalBeratPerMarking ? `${formatDecimal(res.totalBeratPerMarking, 2)} kg` : '—'}
                </div>
                <div className="text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/50 pt-1 mt-1">
                  <span>Timbangan</span>
                  <span className="font-semibold text-[var(--color-primary)]">Akumulasi Batch</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Mini Table Breakdown ListCode jika markingDetails > 0 */}
        {markingDetails && markingDetails.length > 0 && (
          <div className="pt-1">
            {res?.relatedBillsSummary?.hasRelatedBills ? (
              /* Jika kelompok bill terkait sudah tampil di atas, sediakan drawer toggle agar tidak duplikat */
              <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsMarkingDetailsOpen(!isMarkingDetailsOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-[var(--color-surface-hover)] text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] uppercase font-bold tracking-wider text-[var(--color-secondary)]">
                      Rincian Dimensi Marking ({markingDetails.length} Item)
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 font-mono">
                      {formatNumber(markingDetails.reduce((a, b) => a + Number(b.fdQty || 0), 0))} Coly
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-[var(--color-secondary)] font-medium">
                    <span>{isMarkingDetailsOpen ? 'Sembunyikan' : 'Lihat Detail'}</span>
                    {isMarkingDetailsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </button>
                {isMarkingDetailsOpen && (
                  <div className="overflow-x-auto max-h-52 overflow-y-auto border-t border-[var(--color-border)]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[var(--color-surface-hover)] sticky top-0 border-b border-[var(--color-border)] text-[10px] uppercase text-[var(--color-secondary)] font-semibold">
                        <tr>
                          <th className="px-2.5 py-1.5 text-center w-8">No</th>
                          <th className="px-2 py-1.5">List Code</th>
                          <th className="px-2 py-1.5">Marking No</th>
                          <th className="px-2 py-1.5 text-right">Qty</th>
                          {!isAir && <th className="px-2 py-1.5 text-right">M³ PL</th>}
                          <th className="px-2 py-1.5 text-right">{!isAir ? 'M³ Gudang' : 'VFC Gudang'}</th>
                          {!isAir && <th className="px-2 py-1.5 text-right">M³ Komplain</th>}
                          <th className="px-2 py-1.5 text-right">Berat (kg)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]/50 font-mono text-[11px]">
                        {markingDetails.map((d, i) => (
                          <tr key={d.fdListCode || i} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                            <td className="px-2.5 py-1.5 text-center text-[var(--color-secondary)]">{i + 1}</td>
                            <td className="px-2 py-1.5 font-semibold text-[var(--color-primary)]">{d.fdListCode || '—'}</td>
                            <td className="px-2 py-1.5 font-sans text-[var(--color-secondary)]">{d.fdMarkingNo || '—'}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums">{formatNumber(d.fdQty)} {d.fdSatuan || ''}</td>
                            {!isAir && (
                              <td className="px-2 py-1.5 text-right tabular-nums text-[var(--color-secondary)]">
                                {d.fdM3PL ? formatDecimal(d.fdM3PL, 4) : '—'}
                              </td>
                            )}
                            <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                              {d.fdM3Gudang ? formatDecimal(d.fdM3Gudang, 4) : '—'}
                            </td>
                            {!isAir && (
                              <td className="px-2 py-1.5 text-right tabular-nums text-amber-500">
                                {d.fdM3Komplain ? formatDecimal(d.fdM3Komplain, 4) : '—'}
                              </td>
                            )}
                            <td className="px-2 py-1.5 text-right tabular-nums">{d.fdBerat ? formatNumber(d.fdBerat) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              /* Jika single bill, tampilkan tabel langsung */
              <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
                <div className="bg-[var(--color-surface-hover)] px-3 py-2 border-b border-[var(--color-border)] flex items-center justify-between">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
                    Rincian List Code dalam Batch Marking ({markingDetails.length} Item)
                  </span>
                  <span className="text-[10px] text-[var(--color-secondary)]">
                    Total: {formatNumber(markingDetails.reduce((a, b) => a + Number(b.fdQty || 0), 0))} Coly
                  </span>
                </div>
                <div className="overflow-x-auto max-h-52 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[var(--color-surface-hover)] sticky top-0 border-b border-[var(--color-border)] text-[10px] uppercase text-[var(--color-secondary)] font-semibold">
                      <tr>
                        <th className="px-2.5 py-1.5 text-center w-8">No</th>
                        <th className="px-2 py-1.5">List Code</th>
                        <th className="px-2 py-1.5">Marking No</th>
                        <th className="px-2 py-1.5 text-right">Qty</th>
                        {!isAir && <th className="px-2 py-1.5 text-right">M³ PL</th>}
                        <th className="px-2 py-1.5 text-right">{!isAir ? 'M³ Gudang' : 'VFC Gudang'}</th>
                        {!isAir && <th className="px-2 py-1.5 text-right">M³ Komplain</th>}
                        <th className="px-2 py-1.5 text-right">Berat (kg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]/50 font-mono text-[11px]">
                      {markingDetails.map((d, i) => (
                        <tr key={d.fdListCode || i} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                          <td className="px-2.5 py-1.5 text-center text-[var(--color-secondary)]">{i + 1}</td>
                          <td className="px-2 py-1.5 font-semibold text-[var(--color-primary)]">{d.fdListCode || '—'}</td>
                          <td className="px-2 py-1.5 font-sans text-[var(--color-secondary)]">{d.fdMarkingNo || '—'}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{formatNumber(d.fdQty)} {d.fdSatuan || ''}</td>
                          {!isAir && (
                            <td className="px-2 py-1.5 text-right tabular-nums text-[var(--color-secondary)]">
                              {d.fdM3PL ? formatDecimal(d.fdM3PL, 4) : '—'}
                            </td>
                          )}
                          <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                            {d.fdM3Gudang ? formatDecimal(d.fdM3Gudang, 4) : '—'}
                          </td>
                          {!isAir && (
                            <td className="px-2 py-1.5 text-right tabular-nums text-amber-500">
                              {d.fdM3Komplain ? formatDecimal(d.fdM3Komplain, 4) : '—'}
                            </td>
                          )}
                          <td className="px-2 py-1.5 text-right tabular-nums">{d.fdBerat ? formatNumber(d.fdBerat) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Audit Konsistensi Muatan Fisik ─── */}
      <div className="p-3.5 sm:p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2.5 shadow-xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary)]">
          Audit Konsistensi Muatan Fisik
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-0.5 text-xs">
          {/* Box 1: Koli (Qty) */}
          <div className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[var(--color-secondary)]">
                <Package className="w-3.5 h-3.5" />
                <span className="text-[10.5px] uppercase font-bold tracking-wider">Kuantitas Koli</span>
              </div>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                hasQtyDiff
                  ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                  : 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
              }`}>
                {hasQtyDiff ? 'Ada Selisih' : 'Sesuai'}
              </span>
            </div>
            <div className="text-xs font-semibold font-mono tabular-nums text-[var(--color-primary)] pt-0.5">
              Entry: {formatNumber(qtyList)} · Gudang: {formatNumber(qtyGdg)} {qtyK > 0 && `· K: ${formatNumber(qtyK)}`}
            </div>
            <div className="text-[10px] text-[var(--color-secondary)] pt-0.5">
              Total koli operasional
            </div>
          </div>

          {/* Box 2: Timbangan */}
          <div className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[var(--color-secondary)]">
                <Scale className="w-3.5 h-3.5" />
                <span className="text-[10.5px] uppercase font-bold tracking-wider">Timbangan Fisik</span>
              </div>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                hasWeightDiff
                  ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                  : 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
              }`}>
                {beratK > 0 ? 'Komplain Disetujui' : 'Normal'}
              </span>
            </div>
            <div className="text-xs font-semibold font-mono tabular-nums text-[var(--color-primary)] pt-0.5">
              {formatNumber(beratGdg)} kg {beratK > 0 ? `· K: ${formatNumber(beratK)} kg` : ''} {beratSJ > 0 ? `· SJ: ${formatNumber(beratSJ)} kg` : ''}
            </div>
            <div className="text-[10px] text-[var(--color-secondary)] pt-0.5">
              Timbangan gudang &amp; ekspedisi
            </div>
          </div>

          {/* Box 3: Status Audit */}
          <div className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] uppercase font-bold tracking-wider text-[var(--color-secondary)]">Status Validasi</span>
              <StatusBadge status={isMatch ? 'MATCHED' : 'UNMATCHED'} size="sm" />
            </div>
            <div className="pt-1">
              {isMatch ? (
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Ukuran Fisik Valid &amp; Cocok</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-bold text-xs">
                  <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>Terdapat Selisih Fisik</span>
                </div>
              )}
              <div className="text-[10px] text-[var(--color-secondary)] pt-0.5">
                Acuan: {matchedSourceKey || (isAir ? 'Timbangan Udara' : 'Kubikasi Gudang')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Rincian Marking Pelanggan */}
      {effectiveCustCode && resolvedMarkingCode && (
        <CustMarkingDetailModal
          isOpen={isCustMarkingModalOpen}
          onClose={() => setIsCustMarkingModalOpen(false)}
          custCode={effectiveCustCode}
          custName={effectiveCustName}
          markingCode={resolvedMarkingCode}
        />
      )}
    </div>
  )
}
