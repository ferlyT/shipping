import { formatDecimal, formatNumber } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { OverweightValidationResult } from '../../hooks/useOverweightValidation'

export interface OverweightAuditTabProps {
  overweight: OverweightValidationResult
  billedM3: number
}

export function OverweightAuditTab({ overweight, billedM3 }: OverweightAuditTabProps) {
  const {
    actualWeightKg,
    rasio,
    maxAllowedWeight,
    overweightKg,
    isOverweight,
    isBilledOverweightExactMatch,
    isBilledOverweightTolerated,
    isBilledOverweightMatch,
    isBilledUnneededOverweight,
    effectiveBilledKg,
    refM3,
    isMinM3EnforcedForKg,
    weightSource,
    isChildBillMerged,
    parentInvNo,
    matchedCandidateSource,
    overweightDiff,
  } = overweight

  const sisaKuota = Math.max(0, maxAllowedWeight - actualWeightKg)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
        <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/20">
          <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
            Rasio Acuan
          </span>
          <div className="text-[16px] sm:text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
            {rasio > 0 ? formatNumber(rasio) : '—'} <span className="text-xs font-normal">kg/m³</span>
          </div>
          <span className="text-[10.5px] text-[var(--color-secondary)]">
            Basis: {formatDecimal(refM3, 3)} m³ {isMinM3EnforcedForKg ? `(Min 0.1 · Real: ${formatDecimal(billedM3, 3)} m³)` : ''}
          </span>
        </div>

        <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/20">
          <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
            Berat Muatan Aktual
          </span>
          <div className="text-[16px] sm:text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
            {formatNumber(actualWeightKg)} <span className="text-xs font-normal">kg</span>
          </div>
          <span className="text-[10.5px] text-[var(--color-secondary)] truncate block" title={weightSource}>
            {weightSource || 'Timbangan Gudang'}
          </span>
        </div>

        <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/20">
          <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
            Batas Kuota Berat
          </span>
          <div className="text-[16px] sm:text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
            {formatNumber(maxAllowedWeight)} <span className="text-xs font-normal">kg</span>
          </div>
          <span className="text-[10.5px] text-[var(--color-secondary)]">Maksimal Tanpa OW</span>
        </div>

        <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/20">
          <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
            {isOverweight ? 'Kelebihan Berat' : 'Sisa Kuota Berat'}
          </span>
          <div className="text-[16px] sm:text-[17px] font-bold tabular-nums mt-0.5">
            {isOverweight ? (
              <span className="text-rose-500">+{formatNumber(overweightKg)} kg</span>
            ) : (
              <span className="text-emerald-500">{formatNumber(sisaKuota)} kg</span>
            )}
          </div>
          <span className="text-[10.5px] text-[var(--color-secondary)]">
            {isChildBillMerged ? 'Digabung ke Induk' : isOverweight ? 'Perlu Dikenakan Biaya' : 'Muatan Aman'}
          </span>
        </div>
      </div>

      <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
          Audit Status Penagihan Overweight
        </h4>
        <div className="flex items-center justify-between text-xs p-2.5 rounded-md bg-[var(--color-neutral)]/20 border border-[var(--color-border)]">
          <div>
            <span className="text-[var(--color-secondary)]">Item Overweight Ditagihkan: </span>
            <strong className="text-[var(--color-primary)]">{formatNumber(effectiveBilledKg)} kg</strong>
            {matchedCandidateSource ? (
              <span className="ml-1.5 text-[10.5px] text-emerald-600 dark:text-emerald-400 font-medium">
                (Cocok: {matchedCandidateSource})
              </span>
            ) : null}
          </div>
          <div>
            <StatusBadge
              status={
                isChildBillMerged || isBilledOverweightExactMatch || isBilledOverweightTolerated || (isBilledOverweightMatch && matchedCandidateSource)
                  ? 'AMAN'
                  : isBilledUnneededOverweight
                    ? 'SELISIH'
                    : isOverweight
                      ? 'SELISIH'
                      : 'AMAN'
              }
              size="sm"
            />
          </div>
        </div>

        {/* Banner Keterangan Overweight */}
        <div className="p-2.5 rounded-md text-xs leading-relaxed border border-[var(--color-border)]/60 bg-[var(--color-neutral)]/10">
          {isChildBillMerged ? (
            <span className="text-emerald-800 dark:text-emerald-300 font-medium">
              ✓ Tagihan ini merupakan invoice pecahan yang digabung ke Invoice Induk ({parentInvNo || 'Induk'}). Validasi overweight dihitung terpusat pada invoice induk.
            </span>
          ) : isBilledOverweightExactMatch ? (
            <span className="text-emerald-800 dark:text-emerald-300 font-medium">
              ✓ Muatan terindikasi overweight (+{formatNumber(overweightKg)} kg) dan invoice telah memuat item penagihan KG sebesar {formatNumber(effectiveBilledKg)} kg secara presisi.
            </span>
          ) : matchedCandidateSource ? (
            <span className="text-emerald-800 dark:text-emerald-300 font-medium">
              ✓ Item penagihan KG pada invoice ({formatNumber(effectiveBilledKg)} kg) COCOK dengan perhitungan overweight dari {matchedCandidateSource}.
            </span>
          ) : isBilledOverweightTolerated ? (
            <span className="text-amber-800 dark:text-amber-300 font-medium">
              ⚠ Tagihan memuat item penagihan KG sebesar {formatNumber(effectiveBilledKg)} kg. Terdapat selisih pembulatan wajar {Math.abs(overweightDiff ?? 0)} kg dengan sistem (+{formatNumber(overweightKg)} kg).
            </span>
          ) : isBilledUnneededOverweight ? (
            <span className="text-rose-800 dark:text-rose-300 font-medium">
              ❌ Kesalahan Hitung: Berat fisik aktual ({formatNumber(actualWeightKg)} kg) masih berada dalam batas kuota rasio (0 kg overweight), namun invoice menagihkan item KG sebesar {formatNumber(effectiveBilledKg)} kg.
            </span>
          ) : isOverweight ? (
            effectiveBilledKg > 0 ? (
              <span className="text-rose-800 dark:text-rose-300 font-medium">
                ⚠ Muatan fisik melebihi batas kuota rasio sebesar +{formatNumber(overweightKg)} kg, namun item penagihan KG ({formatNumber(effectiveBilledKg)} kg) memiliki selisih {Math.abs(overweightDiff ?? 0)} kg dengan sistem.
              </span>
            ) : (
              <span className="text-rose-800 dark:text-rose-300 font-medium">
                ⚠ Muatan fisik melebihi batas kuota rasio sebesar +{formatNumber(overweightKg)} kg ({weightSource}), namun invoice belum memuat item penagihan KG.
              </span>
            )
          ) : (
            <span className="text-emerald-800 dark:text-emerald-300 font-medium">
              ✓ Berat fisik aktual ({formatNumber(actualWeightKg)} kg{weightSource ? ` · ${weightSource}` : ''}) berada di dalam batas kuota rasio ({formatNumber(maxAllowedWeight)} kg). Sisa kuota aman: {formatNumber(sisaKuota)} kg.
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
