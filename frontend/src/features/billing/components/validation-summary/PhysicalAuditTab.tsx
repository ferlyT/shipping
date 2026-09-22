import { AlertTriangle } from 'lucide-react'
import { formatDecimal, formatNumber } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Type2ComparisonPanel } from '../Type2ComparisonPanel'
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
}: PhysicalAuditTabProps) {
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

  // Helper normalisasi min charge M3 (0.1) untuk pencocokan nilai kubikasi laut
  const normM3 = (v: number) => (v > 0 && v < 0.1 ? 0.1 : v)

  // Evaluasi kandidat data fisik yang dipakai oleh tagihan (Bill)
  const isUsedPL = Boolean(
    isMatch &&
      !isAir &&
      (matchedSourceKey === 'PL' ||
        matchedSourceKey === 'PLPerMarking' ||
        (m3PL > 0 && (Math.abs(normM3(m3PL) - billedM3) < 0.001 || Math.abs(m3PL - billedM3) < 0.001)))
  )

  const isUsedKomplain = Boolean(
    isMatch &&
      (isAir
        ? matchedSourceKey === 'Komplain' || (beratK > 0 && Math.abs(beratK - effectiveBilledKg) < 0.01)
        : matchedSourceKey === 'Komplain' ||
          matchedSourceKey === 'KomplainPerMarking' ||
          matchedSourceKey === 'KomplainHybrid' ||
          (m3K > 0 && (Math.abs(normM3(m3K) - billedM3) < 0.001 || Math.abs(m3K - billedM3) < 0.001)))
  )

  const isUsedGudang = Boolean(
    isMatch &&
      (isAir
        ? matchedSourceKey === 'EntryList' ||
          matchedSourceKey === 'SJ' ||
          (!isUsedKomplain && beratGdg > 0 && Math.abs(beratGdg - effectiveBilledKg) < 0.01)
        : matchedSourceKey === 'Gudang' ||
          matchedSourceKey === 'ListBatch' ||
          (!isUsedPL && !isUsedKomplain && m3Gdg > 0 && (Math.abs(normM3(m3Gdg) - billedM3) < 0.001 || Math.abs(m3Gdg - billedM3) < 0.001)))
  )

  return (
    <div className="space-y-3">
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
    </div>
  )
}
