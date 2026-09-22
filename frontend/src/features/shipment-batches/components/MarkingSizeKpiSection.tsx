import { Box, Container, Scale, TrendingUp, TrendingDown, Layers } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import type { MarkingSizeSummary } from '../types/marking.types'
import { cn, formatNumber, formatDecimal, formatDateShort } from '@/lib/utils'

interface MarkingSizeKpiSectionProps {
  summary: MarkingSizeSummary
  isLoading?: boolean
}

export function MarkingSizeKpiSection({ summary, isLoading = false }: MarkingSizeKpiSectionProps) {
  const { t } = useTranslation()
  const isAir = summary.listType === 1

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-2 shadow-xs"
          >
            <div className="h-3 w-20 rounded skeleton-shimmer" />
            <div className="h-5 w-28 rounded skeleton-shimmer" />
            <div className="h-3 w-16 rounded skeleton-shimmer" />
          </div>
        ))}
      </div>
    )
  }

  const isSelisihNegatif = summary.selisihM3 < 0
  const isSelisihPackAda = summary.selisihPack !== 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {/* ── KARTU 1: Kontainer & Mode ── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-1.5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
            {isAir ? t('marking.sizeAudit.kpiAirBatch') : t('marking.sizeAudit.kpiContSize')}
          </span>
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-transparent border border-[var(--color-border)] text-[var(--color-secondary)]">
            {isAir ? <Box size={13} /> : <Container size={13} />}
          </span>
        </div>
        <div>
          <div className="text-[18px] font-bold font-[var(--font-display)] tabular-nums text-[var(--color-primary)] leading-tight">
            {isAir ? 'BY AIR' : summary.contSize ? `${summary.contSize.trim()}` : 'SEA BATCH'}
          </div>
          <div className="text-[11px] text-[var(--color-secondary)] truncate mt-0.5">
            {isAir
              ? summary.contNo ? `AWB: ${summary.contNo}` : 'Udara Kargo'
              : summary.contNo ? `No: ${summary.contNo}` : 'Kontainer Laut'}
          </div>
        </div>
        <div className="pt-1 border-t border-[var(--color-border)]/60 text-[11px] text-[var(--color-secondary)]">
          Exit: <strong className="text-[var(--color-primary)] font-semibold">{summary.exitDate ? formatDateShort(summary.exitDate) : '—'}</strong>
        </div>
      </div>

      {/* ── KARTU 2: Koli (Pack PL vs Gudang) ── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-1.5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
            {t('marking.sizeAudit.kpiTotalPack')}
          </span>
          <span
            className={cn(
              'inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-semibold border',
              isSelisihPackAda
                ? 'bg-red-500/10 border-red-500/30 text-red-500'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
            )}
          >
            {isSelisihPackAda ? `Selisih ${summary.selisihPack}` : 'Cocok'}
          </span>
        </div>
        <div>
          <div className="text-[18px] font-bold font-[var(--font-display)] tabular-nums text-[var(--color-primary)] leading-tight">
            {formatNumber(summary.totalPackGdg)}{' '}
            <span className="text-[11.5px] font-medium text-[var(--color-secondary)]">Gdg</span>
          </div>
          <div className="text-[11px] text-[var(--color-secondary)] mt-0.5">
            PL: <strong className="text-[var(--color-primary)] font-semibold">{formatNumber(summary.totalPackPL)}</strong> koli
          </div>
        </div>
        <div className="pt-1 border-t border-[var(--color-border)]/60 text-[11px] text-[var(--color-secondary)] flex items-center justify-between">
          <span>Resi kargo:</span>
          <strong className="text-[var(--color-primary)] font-semibold">{summary.totalRowCount} list</strong>
        </div>
      </div>

      {/* ── KARTU 3: Kubikasi Utama (M³) atau Tonase Utama (Kg Udara) ── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-1.5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
            {isAir ? t('marking.sizeAudit.kpiWeightGdg') : t('marking.sizeAudit.kpiM3Gdg')}
          </span>
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-transparent border border-emerald-500/40 text-emerald-500">
            {isAir ? <Scale size={13} /> : <Layers size={13} />}
          </span>
        </div>
        <div>
          <div className="text-[18px] font-bold font-[var(--font-display)] tabular-nums text-emerald-600 dark:text-emerald-400 leading-tight">
            {isAir
              ? `${formatDecimal(summary.totalBeratGdg, 2)} kg`
              : `${formatDecimal(summary.totalM3Gdg, 4)} m³`}
          </div>
          <div className="text-[11px] text-[var(--color-secondary)] mt-0.5">
            {isAir ? (
              <>List: <strong className="text-[var(--color-primary)] font-semibold">{formatDecimal(summary.totalBeratList, 2)} kg</strong></>
            ) : (
              <>PL: <strong className="text-[var(--color-primary)] font-semibold">{formatDecimal(summary.totalM3PL, 4)} m³</strong></>
            )}
          </div>
        </div>
        <div className="pt-1 border-t border-[var(--color-border)]/60 text-[11px] text-[var(--color-secondary)] flex items-center justify-between">
          <span>Komplain:</span>
          <span className={cn('font-semibold', (isAir ? summary.totalBeratKomplain : summary.totalM3Komplain) > 0 ? 'text-red-500' : 'text-[var(--color-secondary)]')}>
            {isAir
              ? `${formatDecimal(summary.totalBeratKomplain, 2)} kg`
              : `${formatDecimal(summary.totalM3Komplain, 4)} m³`}
          </span>
        </div>
      </div>

      {/* ── KARTU 4: Evaluasi Selisih & Rasio ── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-1.5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
            {isAir ? t('marking.sizeAudit.kpiSelisihKg') : t('marking.sizeAudit.kpiSelisihM3')}
          </span>
          <span
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-md border',
              isSelisihNegatif
                ? 'bg-red-500/10 border-red-500/30 text-red-500'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
            )}
          >
            {isSelisihNegatif ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
          </span>
        </div>
        <div>
          <div
            className={cn(
              'text-[18px] font-bold font-[var(--font-display)] tabular-nums leading-tight',
              isSelisihNegatif ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
            )}
          >
            {isAir
              ? `${summary.totalBeratGdg - summary.totalBeratList > 0 ? '+' : ''}${formatDecimal(summary.totalBeratGdg - summary.totalBeratList, 2)} kg`
              : `${summary.selisihM3 > 0 ? '+' : ''}${formatDecimal(summary.selisihM3, 4)} m³`}
          </div>
          <div className="text-[11px] text-[var(--color-secondary)] mt-0.5">
            Rasio Selisih:{' '}
            <strong
              className={cn(
                'font-bold',
                isSelisihNegatif ? 'text-red-500' : 'text-emerald-500'
              )}
            >
              {summary.persenSelisihM3 > 0 ? '+' : ''}{formatDecimal(summary.persenSelisihM3, 2)}%
            </strong>
          </div>
        </div>
        <div className="pt-1 border-t border-[var(--color-border)]/60 text-[11px] text-[var(--color-secondary)] flex items-center justify-between">
          <span>{isAir ? 'Berat Nett:' : 'M³ Nett:'}</span>
          <strong className="text-[var(--color-primary)] font-semibold">
            {isAir
              ? `${formatDecimal(summary.totalBeratNet, 2)} kg`
              : `${formatDecimal(summary.totalM3Net, 4)} m³`}
          </strong>
        </div>
      </div>

      {/* ── KARTU 5: Total Berat Tonase (Laut) atau Berat Volumetrik VFC (Udara) ── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-1.5 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
            {isAir ? t('marking.sizeAudit.kpiBeratSJ') : t('marking.sizeAudit.kpiTotalWeight')}
          </span>
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-transparent border border-[var(--color-border)] text-[var(--color-secondary)]">
            <Scale size={13} />
          </span>
        </div>
        <div>
          <div className="text-[18px] font-bold font-[var(--font-display)] tabular-nums text-[var(--color-primary)] leading-tight">
            {isAir
              ? `${formatDecimal(summary.totalBeratSJ, 2)} kg`
              : `${formatDecimal(summary.totalBeratGdg, 2)} kg`}
          </div>
          <div className="text-[11px] text-[var(--color-secondary)] mt-0.5">
            {isAir ? (
              <>Gudang: <strong className="text-[var(--color-primary)] font-semibold">{formatDecimal(summary.totalBeratGdg, 2)} kg</strong></>
            ) : (
              <>Surat Jalan: <strong className="text-[var(--color-primary)] font-semibold">{formatDecimal(summary.totalBeratSJ, 2)} kg</strong></>
            )}
          </div>
        </div>
        <div className="pt-1 border-t border-[var(--color-border)]/60 text-[11px] text-[var(--color-secondary)] flex items-center justify-between">
          <span>Berat Nett:</span>
          <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
            {formatDecimal(summary.totalBeratNet, 2)} kg
          </strong>
        </div>
      </div>
    </div>
  )
}
