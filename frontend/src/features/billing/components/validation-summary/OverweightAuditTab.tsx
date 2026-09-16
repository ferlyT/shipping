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
    isBilledUnneededOverweight,
    effectiveBilledKg,
    refM3,
    isMinM3EnforcedForKg,
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
          <span className="text-[10.5px] text-[var(--color-secondary)]">Timbangan Gudang</span>
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
            {isOverweight ? 'Perlu Dikenakan Biaya' : 'Muatan Aman'}
          </span>
        </div>
      </div>

      <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] space-y-1.5">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
          Audit Status Penagihan Overweight
        </h4>
        <div className="flex items-center justify-between text-xs p-2.5 rounded-md bg-[var(--color-neutral)]/20 border border-[var(--color-border)]">
          <div>
            <span className="text-[var(--color-secondary)]">Item Overweight Ditagihkan: </span>
            <strong className="text-[var(--color-primary)]">{formatNumber(effectiveBilledKg)} kg</strong>
          </div>
          <div>
            <StatusBadge
              status={
                isBilledOverweightExactMatch || isBilledOverweightTolerated
                  ? 'AMAN'
                  : isBilledUnneededOverweight
                    ? 'PERINGATAN'
                    : isOverweight
                      ? 'SELISIH'
                      : 'AMAN'
              }
              size="sm"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
