import { useState } from 'react'
import { AlertTriangle, ExternalLink, Layers } from 'lucide-react'
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
}: PhysicalAuditTabProps) {
  const [isCustMarkingModalOpen, setIsCustMarkingModalOpen] = useState(false)

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

  return (
    <div className="space-y-3">
      {/* Box Rincian Akumulasi Bill Terkait (Fallback Validasi No Invoice) */}
      {res?.relatedBillsSummary?.hasRelatedBills && (
        <div className="p-3 rounded-lg border border-sky-500/30 bg-sky-50/50 dark:bg-sky-950/20 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-sky-800 dark:text-sky-300">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              <span>Kelompok Bill Terkait (Induk & Pecahan dalam 1 Batch)</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold border border-sky-500/20">
              {res.relatedBillsSummary.isParent ? 'Invoice Induk' : `Invoice Pecahan (${res.relatedBillsSummary.childLetter || 'Anak'})`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
            <div className="space-y-1">
              <span className="text-[10.5px] text-[var(--color-secondary)] block">Daftar Bill Terkait:</span>
              <div className="space-y-1">
                {res.relatedBillsSummary.relatedInvoices.map((inv) => (
                  <div key={inv.invNo} className="flex items-center justify-between p-1.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)]">
                    <span className="font-mono font-medium">{inv.invNo} {inv.isParent ? '(Induk)' : ''}</span>
                    <span className="tabular-nums font-semibold">
                      {inv.billedM3 > 0 ? `${formatDecimal(inv.billedM3, 4)} m³` : (inv.firstItemName || 'Digabung')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-2 rounded bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between">
              <div>
                <span className="text-[10.5px] text-[var(--color-secondary)] block">Akumulasi Data Fisik Terkait:</span>
                <div className="mt-1 space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-secondary)]">Total M³ Gudang:</span>
                    <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {formatDecimal(res.relatedBillsSummary.sumM3Gudang, 4)} m³
                    </span>
                  </div>
                  {res.relatedBillsSummary.sumM3PL > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--color-secondary)]">Total M³ Packing List:</span>
                      <span className="font-bold tabular-nums">
                        {formatDecimal(res.relatedBillsSummary.sumM3PL, 4)} m³
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[var(--color-secondary)]">Total Billed M³:</span>
                    <span className="font-bold tabular-nums text-sky-700 dark:text-sky-300">
                      {formatDecimal(res.relatedBillsSummary.totalBilledM3, 4)} m³
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-[var(--color-secondary)] pt-1 border-t border-[var(--color-border)]">
                    <span>Total Qty / Berat:</span>
                    <span>{formatNumber(res.relatedBillsSummary.sumQty)} Coly / {formatNumber(res.relatedBillsSummary.sumBerat)} kg</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Peringatan Tagihan di Bawah Min Charge M3 */}
      {isBilledBelowMinM3 && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="font-medium">
            <span className="font-bold">Peringatan: Tagihan di Bawah Batas Minimum Charge ({formatDecimal(minChargeM3, 3)} m³).</span>
            <p className="mt-0.5 text-[11px] opacity-90">
              Volume yang ditagihkan ({formatDecimal(billedM3, 4)} m³) lebih rendah dari batas minimum charge ({formatDecimal(minChargeM3, 4)} m³). Pastikan apakah penagihan volume riil ini disengaja atau seharusnya ditagihkan dengan tarif batas minimum.
            </p>
          </div>
        </div>
      )}

      {/* Peringatan Tagihan di Bawah Rekomendasi COD/Urgent */}
      {isCodUrgentShortfall && !isBilledBelowMinM3 && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="font-medium">
            <span className="font-bold">Perhatian: Volume Ditagihkan ({formatDecimal(billedM3, 4)} m³) di Bawah Rekomendasi COD/Urgent ({formatDecimal(recommendedM3, 4)} m³).</span>
            <p className="mt-0.5 text-[11px] opacity-90 leading-relaxed">
              Pelanggan ini berstatus COD / Urgent di mana disarankan menagihkan volume tertinggi ({formatDecimal(recommendedM3, 4)} m³ dari Packing List). Invoice saat ini menagihkan volume riil gudang ({formatDecimal(billedM3, 4)} m³). Pastikan apakah penagihan volume riil ini disengaja sebelum menerbitkan invoice.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards Ukuran */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
        {/* Card 1: Nilai Tagihan (Ditagihkan) */}
        <div className={`p-2.5 rounded-lg border transition-all ${
          isBilledBelowMinM3
            ? 'border-amber-500/60 bg-amber-500/5 shadow-xs'
            : isMatch
              ? 'border-[var(--color-tertiary)]/70 bg-[var(--color-tertiary)]/5 shadow-xs'
              : 'border-rose-500/50 bg-rose-500/5 shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
              {isAir ? 'Berat Ditagihkan' : 'Volume Ditagihkan'}
            </span>
            {isBilledBelowMinM3 ? (
              <span className="text-[8.5px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 rounded px-1">
                &lt; Min M3
              </span>
            ) : isMatch ? (
              <span className="text-[8.5px] font-bold text-[var(--color-tertiary)] bg-[var(--color-tertiary)]/15 border border-[var(--color-tertiary)]/30 rounded px-1">
                Ditagihkan
              </span>
            ) : (
              <span className="text-[8.5px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/15 border border-rose-500/30 rounded px-1">
                Selisih
              </span>
            )}
          </div>
          <div className="text-[16px] sm:text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
            {isAir ? `${formatNumber(effectiveBilledKg)} kg` : `${formatDecimal(billedM3, 4)} m³`}
          </div>
          <span className="text-[10.5px] text-[var(--color-secondary)] truncate block">
            {isBilledBelowMinM3 ? `Min: ${formatDecimal(minChargeM3, 3)} m³` : `Status: ${matchLabel}`}
          </span>
        </div>

        {/* Card 2: Data Fisik Gudang */}
        <div className={`p-2.5 rounded-lg border transition-all ${
          isUsedGudang
            ? 'border-emerald-500/70 dark:border-emerald-400/70 bg-emerald-500/5 shadow-xs ring-1 ring-emerald-500/20'
            : 'border-[var(--color-border)] bg-[var(--color-neutral)]/20'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
              {isAir ? 'Berat Gudang' : 'Volume Gudang'}
            </span>
            {isUsedGudang && (
              <span className="text-[8.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 rounded px-1">
                Dipakai Bill
              </span>
            )}
          </div>
          <div className="text-[16px] sm:text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
            {isAir ? `${formatNumber(beratGdg)} kg` : `${formatDecimal(m3Gdg, 4)} m³`}
          </div>
          <span className="text-[10.5px] text-[var(--color-secondary)] truncate block">
            {isUsedGudang
              ? 'Dipakai sebagai Acuan Tagihan'
              : (m3Gdg > 0 || beratGdg > 0 ? 'Data Fisik Tersedia' : 'Belum Ada Ukuran')}
          </span>
        </div>

        {/* Card 3: Packing List (Laut) */}
        {!isAir && (
          <div className={`p-2.5 rounded-lg border transition-all ${
            isUsedPL
              ? 'border-emerald-500/70 dark:border-emerald-400/70 bg-emerald-500/5 shadow-xs ring-1 ring-emerald-500/20'
              : 'border-[var(--color-border)] bg-[var(--color-neutral)]/20'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                Volume Packing List
              </span>
              {isUsedPL && (
                <span className="text-[8.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 rounded px-1">
                  Dipakai Bill
                </span>
              )}
            </div>
            <div className="text-[16px] sm:text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
              {m3PL > 0 ? `${formatDecimal(m3PL, 4)} m³` : '—'}
            </div>
            <span className="text-[10.5px] text-[var(--color-secondary)] truncate block">
              {isUsedPL ? 'Dipakai sebagai Acuan Tagihan' : 'Dokumen Supplier'}
            </span>
          </div>
        )}

        {/* Card 4: Komplain */}
        <div className={`p-2.5 rounded-lg border transition-all ${
          isUsedKomplain
            ? 'border-emerald-500/70 dark:border-emerald-400/70 bg-emerald-500/5 shadow-xs ring-1 ring-emerald-500/20'
            : 'border-[var(--color-border)] bg-[var(--color-neutral)]/20'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
              {isAir ? 'Berat Komplain' : 'Volume Komplain'}
            </span>
            {isUsedKomplain && (
              <span className="text-[8.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 rounded px-1">
                Dipakai Bill
              </span>
            )}
          </div>
          <div className="text-[16px] sm:text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
            {isAir ? (beratK > 0 ? `${formatNumber(beratK)} kg` : '—') : m3K > 0 ? `${formatDecimal(m3K, 4)} m³` : '—'}
          </div>
          <span className="text-[10.5px] text-[var(--color-secondary)] truncate block">
            {isUsedKomplain
              ? 'Dipakai sebagai Acuan Tagihan'
              : (m3K > 0 || beratK > 0 ? 'Klaim Disetujui' : 'Tidak Ada Komplain')}
          </span>
        </div>
      </div>

      {/* ─── Data Per Batch Marking ─── */}
      <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
              Data Fisik Per Batch Marking {resolvedMarkingCode ? `(${resolvedMarkingCode})` : ''}
            </h4>
          </div>
          {effectiveCustCode && resolvedMarkingCode && (
            <button
              type="button"
              onClick={() => setIsCustMarkingModalOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              title="Buka rincian lengkap form marking pelanggan"
            >
              <span>Detail Marking Pelanggan</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Grid KPI Cards Per Marking */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
          {!isAir ? (
            <>
              {/* Card 1: M3 Gudang Per Marking */}
              <div className={`p-2.5 rounded-lg border transition-all ${
                isUsedMarkingGudang
                  ? 'border-emerald-500/70 dark:border-emerald-400/70 bg-emerald-500/5 shadow-xs ring-1 ring-emerald-500/20'
                  : 'border-[var(--color-border)] bg-[var(--color-neutral)]/20'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block truncate">
                    M³ Marking (Gudang)
                  </span>
                  {isUsedMarkingGudang && (
                    <span className="text-[8.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 rounded px-1">
                      Dipakai Bill
                    </span>
                  )}
                </div>
                <div className="text-[16px] sm:text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
                  {custMarkingValues.length > 0 ? `${formatDecimal(custMarkingValues[0], 4)} m³` : '—'}
                </div>
                <div className="text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1 mt-1">
                  <span>Total ListCode</span>
                  <span className="font-semibold text-[var(--color-primary)]">
                    {totalEntryList !== null ? `${formatNumber(totalEntryList)} LC` : '—'}
                  </span>
                </div>
              </div>

              {/* Card 2: PL Per Marking */}
              <div className={`p-2.5 rounded-lg border transition-all ${
                isUsedPLPerMarking
                  ? 'border-emerald-500/70 dark:border-emerald-400/70 bg-emerald-500/5 shadow-xs ring-1 ring-emerald-500/20'
                  : 'border-[var(--color-border)] bg-[var(--color-neutral)]/20'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block truncate">
                    PL Per Marking
                  </span>
                  {isUsedPLPerMarking && (
                    <span className="text-[8.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 rounded px-1">
                      Dipakai Bill
                    </span>
                  )}
                </div>
                <div className="text-[16px] sm:text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
                  {plPerMarkingValues.length > 0 ? `${formatDecimal(plPerMarkingValues[0], 4)} m³` : '—'}
                </div>
                <div className="text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1 mt-1">
                  <span>Packing List</span>
                  <span className="font-semibold text-[var(--color-primary)]">
                    {plPerMarkingValues.length > 0 ? 'Dokumen Supplier' : '—'}
                  </span>
                </div>
              </div>

              {/* Card 3: Komplain Per Marking */}
              <div className={`p-2.5 rounded-lg border transition-all ${
                isUsedKomplainPerMarking
                  ? 'border-emerald-500/70 dark:border-emerald-400/70 bg-emerald-500/5 shadow-xs ring-1 ring-emerald-500/20'
                  : 'border-[var(--color-border)] bg-[var(--color-neutral)]/20'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block truncate">
                    Komplain Per Marking
                  </span>
                  {isUsedKomplainPerMarking && (
                    <span className="text-[8.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 rounded px-1">
                      Dipakai Bill
                    </span>
                  )}
                </div>
                <div className="text-[16px] sm:text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
                  {komplainPerMarkingValues.length > 0 ? `${formatDecimal(komplainPerMarkingValues[0], 4)} m³` : '—'}
                </div>
                <div className="text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1 mt-1">
                  <span>Total Komplain</span>
                  <span className="font-semibold text-[var(--color-primary)]">
                    {totalEntryKomplain !== null && totalEntryKomplain > 0 ? `${formatNumber(totalEntryKomplain)} LC` : 'Tidak Ada'}
                  </span>
                </div>
              </div>

              {/* Card 4: Komplain Hybrid ATAU Total Berat Marking */}
              {res?.m3KomplainPlusGudang && res.m3KomplainPlusGudang > 0 ? (
                <div className={`p-2.5 rounded-lg border transition-all ${
                  isUsedKomplainHybrid
                    ? 'border-emerald-500/70 dark:border-emerald-400/70 bg-emerald-500/5 shadow-xs ring-1 ring-emerald-500/20'
                    : 'border-[var(--color-border)] bg-[var(--color-neutral)]/20'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block truncate" title="Komplain Parsial + Gudang">
                      Komplain + Gudang
                    </span>
                    {isUsedKomplainHybrid && (
                      <span className="text-[8.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 rounded px-1">
                        Dipakai Bill
                      </span>
                    )}
                  </div>
                  <div className="text-[16px] sm:text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
                    {formatDecimal(res.m3KomplainPlusGudang, 4)} m³
                  </div>
                  <div className="text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1 mt-1">
                    <span>Parsial</span>
                    <span className="font-semibold text-[var(--color-primary)]">
                      {res.countKomplainLC ?? 0} K + {res.countGudangLC ?? 0} Gdg
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/20">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block truncate">
                      Total Berat Batch
                    </span>
                  </div>
                  <div className="text-[16px] sm:text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
                    {res?.totalBeratPerMarking ? `${formatNumber(res.totalBeratPerMarking)} kg` : '—'}
                  </div>
                  <div className="text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1 mt-1">
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
              <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/20">
                <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block truncate">
                  VFC Gudang Marking
                </span>
                <div className="text-[16px] sm:text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
                  {res?.vfcGudangPerMarking ? `${formatDecimal(res.vfcGudangPerMarking, 2)} kg` : '—'}
                </div>
                <div className="text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1 mt-1">
                  <span>Total ListCode</span>
                  <span className="font-semibold text-[var(--color-primary)]">{totalEntryList ?? '—'} LC</span>
                </div>
              </div>

              {/* Air: VFC Komplain */}
              <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/20">
                <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block truncate">
                  VFC Komplain Marking
                </span>
                <div className="text-[16px] sm:text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
                  {res?.vfcKomplainPerMarking ? `${formatDecimal(res.vfcKomplainPerMarking, 2)} kg` : '—'}
                </div>
                <div className="text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1 mt-1">
                  <span>Total Komplain</span>
                  <span className="font-semibold text-[var(--color-primary)]">{totalEntryKomplain ?? '—'} LC</span>
                </div>
              </div>

              {/* Air: Berat Surat Jalan */}
              <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/20">
                <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block truncate">
                  Berat Surat Jalan
                </span>
                <div className="text-[16px] sm:text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
                  {beratSJ > 0 ? `${formatDecimal(beratSJ, 2)} kg` : '—'}
                </div>
                <div className="text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1 mt-1">
                  <span>Dokumen SJ</span>
                  <span className="font-semibold text-[var(--color-primary)]">{beratSJ > 0 ? 'Tercatat' : '—'}</span>
                </div>
              </div>

              {/* Air: Total Berat Fisik Marking */}
              <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/20">
                <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block truncate">
                  Total Berat Fisik
                </span>
                <div className="text-[16px] sm:text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
                  {res?.totalBeratPerMarking ? `${formatDecimal(res.totalBeratPerMarking, 2)} kg` : '—'}
                </div>
                <div className="text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1 mt-1">
                  <span>Timbangan</span>
                  <span className="font-semibold text-[var(--color-primary)]">Akumulasi Batch</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Mini Table Breakdown ListCode jika markingDetails > 0 */}
        {markingDetails && markingDetails.length > 0 && (
          <div className="mt-2 border border-[var(--color-border)] rounded-md overflow-hidden">
            <div className="bg-[var(--color-neutral)]/50 px-2.5 py-1.5 border-b border-[var(--color-border)] flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
                Rincian List Code dalam Batch Marking ({markingDetails.length} Item)
              </span>
              <span className="text-[10px] text-[var(--color-secondary)]">
                Total: {formatNumber(markingDetails.reduce((a, b) => a + Number(b.fdQty || 0), 0))} Coly
              </span>
            </div>
            <div className="overflow-x-auto max-h-48 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[var(--color-neutral)]/30 sticky top-0 border-b border-[var(--color-border)] text-[10px] uppercase text-[var(--color-secondary)] font-semibold">
                  <tr>
                    <th className="px-2 py-1 text-center w-8">No</th>
                    <th className="px-2 py-1">List Code</th>
                    <th className="px-2 py-1">Marking No</th>
                    <th className="px-2 py-1 text-right">Qty</th>
                    {!isAir && <th className="px-2 py-1 text-right">M³ PL</th>}
                    <th className="px-2 py-1 text-right">{!isAir ? 'M³ Gudang' : 'VFC Gudang'}</th>
                    {!isAir && <th className="px-2 py-1 text-right">M³ Komplain</th>}
                    <th className="px-2 py-1 text-right">Berat (kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]/40 font-mono text-[11px]">
                  {markingDetails.map((d, i) => (
                    <tr key={d.fdListCode || i} className="hover:bg-[var(--color-neutral)]/20">
                      <td className="px-2 py-1 text-center text-[var(--color-secondary)]">{i + 1}</td>
                      <td className="px-2 py-1 font-semibold text-[var(--color-primary)]">{d.fdListCode || '—'}</td>
                      <td className="px-2 py-1 font-sans text-[var(--color-secondary)]">{d.fdMarkingNo || '—'}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{formatNumber(d.fdQty)} {d.fdSatuan || ''}</td>
                      {!isAir && (
                        <td className="px-2 py-1 text-right tabular-nums text-[var(--color-secondary)]">
                          {d.fdM3PL ? formatDecimal(d.fdM3PL, 4) : '—'}
                        </td>
                      )}
                      <td className="px-2 py-1 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                        {d.fdM3Gudang ? formatDecimal(d.fdM3Gudang, 4) : '—'}
                      </td>
                      {!isAir && (
                        <td className="px-2 py-1 text-right tabular-nums text-amber-500">
                          {d.fdM3Komplain ? formatDecimal(d.fdM3Komplain, 4) : '—'}
                        </td>
                      )}
                      <td className="px-2 py-1 text-right tabular-nums">{d.fdBerat ? formatNumber(d.fdBerat) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Rincian Koli & Timbangan */}
      <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
          Audit Konsistensi Muatan Fisik
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
          <div className="p-2 rounded-md bg-[var(--color-neutral)]/20 border border-[var(--color-border)]">
            <span className="text-[10.5px] text-[var(--color-secondary)]">Jumlah Koli (Qty)</span>
            <div className="text-xs font-semibold text-[var(--color-primary)] mt-0.5">
              Entry: {formatNumber(qtyList)} · Gudang: {formatNumber(qtyGdg)} {qtyK > 0 && `· K: ${formatNumber(qtyK)}`}
            </div>
          </div>

          <div className="p-2 rounded-md bg-[var(--color-neutral)]/20 border border-[var(--color-border)]">
            <span className="text-[10.5px] text-[var(--color-secondary)]">Kesesuaian Timbangan</span>
            <div className="text-xs font-semibold text-[var(--color-primary)] mt-0.5">
              {formatNumber(beratGdg)} kg {beratK > 0 ? `(Komplain: ${formatNumber(beratK)} kg)` : '(Sesuai)'}
            </div>
          </div>

          <div className="p-2 rounded-md bg-[var(--color-neutral)]/20 border border-[var(--color-border)] flex items-center justify-between">
            <div>
              <span className="text-[10.5px] text-[var(--color-secondary)] block">Status Audit Fisik</span>
              <span className="text-xs font-semibold text-[var(--color-primary)]">
                {isMatch ? 'Ukuran Cocok' : 'Ada Selisih'}
              </span>
            </div>
            <StatusBadge status={isMatch ? 'MATCHED' : 'UNMATCHED'} size="sm" />
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
