import React from 'react'
import { Scale } from 'lucide-react'
import { formatNumber, formatDecimal } from '@/lib/utils'
import type { useOverweightValidation } from '../../hooks/useOverweightValidation'

export interface OverweightTabProps {
  overweight: ReturnType<typeof useOverweightValidation>
  hasWeightMismatch: boolean
  isGabungan: boolean
  beratList: number
  isWeightListDiff: boolean
  beratSJ: number
  isWeightSJDiff: boolean
  beratKomplain: number
  isWeightKomplainDiff: boolean
}

export const OverweightTab: React.FC<OverweightTabProps> = ({
  overweight,
  hasWeightMismatch,
  isGabungan,
  beratList,
  isWeightListDiff,
  beratSJ,
  isWeightSJDiff,
  beratKomplain,
  isWeightKomplainDiff,
}) => {
  const {
    effectiveBilledKg: seaBilledKg,
    actualWeightKg,
    maxAllowedWeight,
    overweightKg,
    isOverweight,
    isBilledOverweightExactMatch,
    isBilledOverweightTolerated,
    isBilledOverweightMatch,
    isBilledUnneededOverweight,
    overweightDiff,
    weightSource,
    isChildBillMerged,
    parentInvNo,
    matchedCandidateSource,
  } = overweight

  return (
    <div className="space-y-3.5">
      <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
            <Scale size={16} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[var(--color-primary)]">
              Analisis Rasio Overweight Muatan Laut
            </h4>
            <span className="text-[10px] text-[var(--color-secondary)]">
              Rasio standard {overweight.rasio} kg/m³
            </span>
          </div>
        </div>
        <span
          className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
            isChildBillMerged
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
              : isBilledOverweightExactMatch || (isBilledOverweightMatch && matchedCandidateSource)
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                : isBilledOverweightTolerated
                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                  : isOverweight || isBilledUnneededOverweight
                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
          }`}
        >
          {isChildBillMerged
            ? 'Digabung ke Induk'
            : isBilledOverweightExactMatch
              ? 'Overweight Ditagihkan'
              : matchedCandidateSource
                ? 'Cocok Fallback Berat'
                : isBilledOverweightTolerated
                  ? 'Toleransi Wajar'
                  : isBilledUnneededOverweight
                    ? 'Ditagih Tanpa Overweight'
                    : isOverweight
                      ? seaBilledKg > 0
                        ? 'Selisih Tagihan KG'
                        : 'Overweight Belum Ditagih'
                      : 'Tidak Ada Overweight'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between space-y-1">
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Batas Kuota Rasio</span>
            <span className="text-base font-bold font-mono text-[var(--color-primary)] block mt-0.5">
              {formatNumber(maxAllowedWeight)} kg
            </span>
          </div>
          <span className="text-[10px] text-[var(--color-secondary)] block truncate pt-1 border-t border-[var(--color-border)]/60">
            {formatDecimal(overweight.refM3, 4)} m³ × {overweight.rasio} kg {overweight.isMinM3EnforcedForKg ? '(Min 0.1)' : ''}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between space-y-1">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Berat Aktual Fisik</span>
              {hasWeightMismatch ? (
                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/30">
                  Selisih
                </span>
              ) : null}
            </div>
            <span className="text-base font-bold font-mono text-[var(--color-primary)] block mt-0.5">
              {actualWeightKg > 0 ? `${formatDecimal(actualWeightKg, 2)} kg` : '—'}
            </span>
            <span className="text-[10px] text-[var(--color-secondary)] block truncate" title={weightSource}>
              {weightSource || (isGabungan ? 'Total berat gabungan marking' : 'Timbangan riil acuan')}
            </span>
          </div>
          <div className="pt-1.5 mt-1 border-t border-[var(--color-border)]/60 space-y-0.5 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-secondary)]">{isGabungan ? 'Entry List (Marking):' : 'Entry List:'}</span>
              <span className={`font-mono ${isWeightListDiff ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-[var(--color-primary)] font-medium'}`}>
                {beratList > 0 ? `${formatDecimal(beratList, 2)} kg` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-secondary)]">{isGabungan ? 'Surat Jalan (Marking):' : 'Surat Jalan:'}</span>
              <span className={`font-mono ${isWeightSJDiff ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-[var(--color-primary)] font-medium'}`}>
                {beratSJ > 0 ? `${formatDecimal(beratSJ, 2)} kg` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-secondary)]">Komplain:</span>
              <span className={`font-mono ${isWeightKomplainDiff ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-[var(--color-primary)] font-medium'}`}>
                {beratKomplain > 0 ? `${formatDecimal(beratKomplain, 2)} kg` : '—'}
              </span>
            </div>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between space-y-1">
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">
              {isOverweight ? 'Kelebihan (Overweight)' : 'Sisa Kuota Berat'}
            </span>
            <span className={`text-base font-bold font-mono block mt-0.5 ${isOverweight ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {isOverweight ? `+${formatNumber(overweightKg)} kg` : `${formatNumber(Math.max(0, maxAllowedWeight - actualWeightKg))} kg`}
            </span>
          </div>
          <span className="text-[10px] text-[var(--color-secondary)] block truncate pt-1 border-t border-[var(--color-border)]/60">
            {isOverweight ? 'Melebihi batas kuota' : 'Sisa kuota aman'}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between space-y-1">
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Item KG di Tagihan</span>
            <span className="text-base font-bold font-mono text-[var(--color-primary)] block mt-0.5">
              {formatNumber(seaBilledKg)} kg
            </span>
          </div>
          <span className="text-[10px] text-[var(--color-secondary)] block truncate pt-1 border-t border-[var(--color-border)]/60">
            {isChildBillMerged
              ? 'Digabung ke Induk'
              : isBilledOverweightExactMatch
                ? 'Cocok presisi'
                : matchedCandidateSource
                  ? `Cocok ${matchedCandidateSource}`
                  : isBilledOverweightTolerated
                    ? 'Selisih wajar'
                    : 'Baris invoice'}
          </span>
        </div>
      </div>

      {/* Banner Status Overweight */}
      <div className="p-3.5 rounded-xl bg-[var(--color-neutral)] border border-[var(--color-border)] text-xs text-[var(--color-secondary)] leading-relaxed">
        {isChildBillMerged ? (
          <span className="text-emerald-800 dark:text-emerald-300 font-medium">
            ✓ Tagihan ini merupakan invoice pecahan yang digabung ke Invoice Induk ({parentInvNo || 'Induk'}). Validasi overweight dihitung terpusat pada invoice induk.
          </span>
        ) : isBilledOverweightExactMatch ? (
          <span className="text-emerald-800 dark:text-emerald-300 font-medium">
            ✓ Muatan terindikasi overweight (+{formatNumber(overweightKg)} kg) dan invoice telah memuat item penagihan KG sebesar {formatNumber(seaBilledKg)} kg secara presisi.
          </span>
        ) : matchedCandidateSource ? (
          <span className="text-emerald-800 dark:text-emerald-300 font-medium">
            ✓ Item penagihan KG pada invoice ({formatNumber(seaBilledKg)} kg) COCOK dengan perhitungan overweight dari {matchedCandidateSource}.
          </span>
        ) : isBilledOverweightTolerated ? (
          <span className="text-amber-800 dark:text-amber-300 font-medium">
            ⚠ Tagihan memuat item penagihan KG sebesar {formatNumber(seaBilledKg)} kg. Terdapat selisih pembulatan wajar {Math.abs(overweightDiff ?? 0)} kg dengan perhitungan sistem (+{formatNumber(overweightKg)} kg).
          </span>
        ) : isBilledUnneededOverweight ? (
          <span className="text-amber-800 dark:text-amber-300 font-medium">
            ⚠ Berat fisik aktual ({formatNumber(actualWeightKg)} kg) masih berada dalam batas kuota rasio (0 kg overweight), namun invoice menagihkan item KG sebesar {formatNumber(seaBilledKg)} kg.
          </span>
        ) : isOverweight ? (
          seaBilledKg > 0 ? (
            <span className="text-rose-800 dark:text-rose-300 font-medium">
              ⚠ Muatan fisik melebihi batas kuota rasio sebesar +{formatNumber(overweightKg)} kg, namun item penagihan KG pada invoice ({formatNumber(seaBilledKg)} kg) memiliki selisih {Math.abs(overweightDiff ?? 0)} kg dengan sistem.
            </span>
          ) : (
            <span className="text-rose-800 dark:text-rose-300 font-medium">
              ⚠ Muatan fisik melebihi batas kuota rasio sebesar +{formatNumber(overweightKg)} kg ({weightSource}), namun invoice belum memuat item penagihan KG.
            </span>
          )
        ) : (
          <span className="text-emerald-800 dark:text-emerald-300 font-medium">
            ✓ Berat fisik aktual ({formatNumber(actualWeightKg)} kg{weightSource ? ` · ${weightSource}` : ''}) berada di dalam batas kuota rasio ({formatNumber(maxAllowedWeight)} kg). Sisa kuota aman: {formatNumber(Math.max(0, maxAllowedWeight - actualWeightKg))} kg.
          </span>
        )}
      </div>
    </div>
  )
}
