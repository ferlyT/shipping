import { useState, useMemo } from 'react'
import {
  Boxes,
  Eye,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/hooks/useTranslation'
import { cn, formatNumber } from '@/lib/utils'
import type { BatchExitComparisonSummary, BatchExitItem } from '../types/billing.types'
import { BatchExitModal } from './BatchExitModal'

interface BatchExitComparisonSectionProps {
  summary?: BatchExitComparisonSummary
  batches: BatchExitItem[]
  isLoading: boolean
  selectedPeriodLabel: string
  allTime: boolean
  onToggleAllTime: () => void
}

type CustomerStatusFilter = 'all' | 'udara' | 'laut'

export function BatchExitComparisonSection({
  summary,
  batches,
  isLoading,
  selectedPeriodLabel,
  allTime,
  onToggleAllTime,
}: BatchExitComparisonSectionProps) {
  const { t } = useTranslation()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [statusModaFilter, setStatusModaFilter] = useState<CustomerStatusFilter>('all')

  const totalBatches = summary?.totalBatches ?? 0
  const totalKargo = summary?.totalKargo ?? 0
  const totalBilled = summary?.totalBilled ?? 0
  const totalUnbilled = summary?.totalUnbilled ?? 0
  const billedPct = summary?.billedPercentage ?? 0
  const pendingBatches = summary?.pendingBatches ?? 0

  const airSummary = summary?.air
  const seaSummary = summary?.sea

  const airPct = airSummary?.billedPercentage ?? 0
  const seaPct = seaSummary?.billedPercentage ?? 0

  const airBatchesPending = batches.filter((b) => b.listType === 1 && !b.isFullyBilled).length
  const airBatchesCompleted = batches.filter((b) => b.listType === 1 && b.isFullyBilled).length
  const seaBatchesPending = batches.filter((b) => b.listType === 2 && !b.isFullyBilled).length
  const seaBatchesCompleted = batches.filter((b) => b.listType === 2 && b.isFullyBilled).length

  // Hitung metrik status customer sesuai filter moda yang aktif (Semua, Udara, Laut)
  const currentStatusMetrics = useMemo(() => {
    if (statusModaFilter === 'all' && summary?.byCustomerStatus) {
      return summary.byCustomerStatus
    }

    const filteredBatches = batches.filter((b) => {
      if (statusModaFilter === 'udara') return b.listType === 1
      if (statusModaFilter === 'laut') return b.listType === 2
      return true
    })

    const agg = {
      blocked: { totalKargo: 0, totalBilled: 0, totalUnbilled: 0, billedPercentage: 0 },
      warning: { totalKargo: 0, totalBilled: 0, totalUnbilled: 0, billedPercentage: 0 },
      urgent: { totalKargo: 0, totalBilled: 0, totalUnbilled: 0, billedPercentage: 0 },
      cod: { totalKargo: 0, totalBilled: 0, totalUnbilled: 0, billedPercentage: 0 },
      ok: { totalKargo: 0, totalBilled: 0, totalUnbilled: 0, billedPercentage: 0 },
      noStatus: { totalKargo: 0, totalBilled: 0, totalUnbilled: 0, billedPercentage: 0 },
    }

    for (const b of filteredBatches) {
      const cs = b.customerStatus
      if (!cs) continue

      agg.blocked.totalKargo += cs.blocked || 0
      agg.blocked.totalUnbilled += cs.unbilledBlocked || 0
      agg.blocked.totalBilled += Math.max(0, (cs.blocked || 0) - (cs.unbilledBlocked || 0))

      agg.warning.totalKargo += cs.warning || 0
      agg.warning.totalUnbilled += cs.unbilledWarning || 0
      agg.warning.totalBilled += Math.max(0, (cs.warning || 0) - (cs.unbilledWarning || 0))

      agg.urgent.totalKargo += cs.urgent || 0
      agg.urgent.totalUnbilled += cs.unbilledUrgent || 0
      agg.urgent.totalBilled += Math.max(0, (cs.urgent || 0) - (cs.unbilledUrgent || 0))

      agg.cod.totalKargo += cs.cod || 0
      agg.cod.totalUnbilled += cs.unbilledCod || 0
      agg.cod.totalBilled += Math.max(0, (cs.cod || 0) - (cs.unbilledCod || 0))

      const knownUnbilled =
        (cs.unbilledBlocked || 0) +
        (cs.unbilledWarning || 0) +
        (cs.unbilledUrgent || 0) +
        (cs.unbilledCod || 0)
      const unbilledOther = Math.max(0, b.totalUnbilled - knownUnbilled)
      const unbilledOk = Math.min(cs.ok || 0, unbilledOther)
      agg.ok.totalKargo += cs.ok || 0
      agg.ok.totalUnbilled += unbilledOk
      agg.ok.totalBilled += Math.max(0, (cs.ok || 0) - unbilledOk)

      const unbilledNoStatus = Math.max(0, unbilledOther - unbilledOk)
      agg.noStatus.totalKargo += cs.noStatus || 0
      agg.noStatus.totalUnbilled += unbilledNoStatus
      agg.noStatus.totalBilled += Math.max(0, (cs.noStatus || 0) - unbilledNoStatus)
    }

    const calcPct = (b: number, tot: number) => (tot > 0 ? Math.round((b / tot) * 1000) / 10 : 0)
    agg.blocked.billedPercentage = calcPct(agg.blocked.totalBilled, agg.blocked.totalKargo)
    agg.warning.billedPercentage = calcPct(agg.warning.totalBilled, agg.warning.totalKargo)
    agg.urgent.billedPercentage = calcPct(agg.urgent.totalBilled, agg.urgent.totalKargo)
    agg.cod.billedPercentage = calcPct(agg.cod.totalBilled, agg.cod.totalKargo)
    agg.ok.billedPercentage = calcPct(agg.ok.totalBilled, agg.ok.totalKargo)
    agg.noStatus.billedPercentage = calcPct(agg.noStatus.totalBilled, agg.noStatus.totalKargo)

    return agg
  }, [statusModaFilter, summary?.byCustomerStatus, batches])

  // Hitung jumlah kargo untuk switcher pill
  const filterCounts = useMemo(() => {
    return {
      all: totalKargo,
      udara: airSummary?.totalKargo ?? 0,
      laut: seaSummary?.totalKargo ?? 0,
    }
  }, [totalKargo, airSummary?.totalKargo, seaSummary?.totalKargo])

  return (
    <>
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xs p-4 sm:p-5 transition-all space-y-4">
        {/* Header Ribbon Utama */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              <Boxes className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-[var(--color-primary)] font-[var(--font-display)]">
                  {t('billing.batchExitComparison.title')}
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {allTime ? t('billing.batchExitComparison.allTime') : selectedPeriodLabel}
                </span>
              </div>
              <p className="text-xs text-[var(--color-secondary)] mt-0.5">
                {t('billing.batchExitComparison.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Toggle All Time vs Bulan Aktif */}
            <button
              type="button"
              onClick={onToggleAllTime}
              className={cn(
                'px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs select-none',
                allTime
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15'
                  : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)]'
              )}
              title="Ganti filter antara bulan aktif terpilih dan akumulasi semua waktu"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{allTime ? t('billing.batchExitComparison.allTime') : t('billing.batchExitComparison.currentMonth')}</span>
            </button>

            {/* Tombol Buka Modal Rincian */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 cursor-pointer text-[var(--color-primary)] font-semibold border-[var(--color-border)]"
            >
              <Eye className="w-3.5 h-3.5 text-blue-500" />
              <span>{t('billing.batchExitComparison.viewDetails')}</span>
              {pendingBatches > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  {pendingBatches}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Content Section */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-48 rounded-2xl skeleton-shimmer" />
            <div className="h-48 rounded-2xl skeleton-shimmer" />
          </div>
        ) : totalBatches === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--color-secondary)]">
            <p>{t('billing.batchExitComparison.noBatchesFound')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ── ROW 1: 2 Card Panel Berdampingan ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* ── PANEL KIRI: Rasio Penyelesaian, Metrik Hero, & Breakdown Moda ── */}
              <div className="p-4 sm:p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs flex flex-col justify-between space-y-4">
                {/* Baris 1: Hero Number & 3 Metrik Stat */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-2">
                  {/* Hero: Rasio Penyelesaian */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-[var(--color-secondary)] block">
                      Rasio penyelesaian
                    </span>
                    <div className="text-3xl sm:text-4xl font-extrabold font-mono text-[var(--color-primary)] tracking-tight leading-none">
                      {billedPct}%
                    </div>
                  </div>

                  {/* Stat 1: Total Kargo Exit */}
                  <div className="space-y-0.5">
                    <div className="text-lg sm:text-xl font-bold font-mono text-[var(--color-primary)]">
                      {formatNumber(totalKargo)}
                    </div>
                    <div className="text-xs font-semibold text-[var(--color-primary)]">
                      Total kargo exit
                    </div>
                    <div className="text-[11px] text-[var(--color-secondary)]">
                      dari {totalBatches} batch
                    </div>
                  </div>

                  {/* Stat 2: Sudah Terbit Bill */}
                  <div className="space-y-0.5 sm:border-l-2 sm:border-emerald-500/40 sm:pl-3">
                    <div className="text-lg sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {formatNumber(totalBilled)}
                    </div>
                    <div className="text-xs font-semibold text-[var(--color-primary)]">
                      Sudah terbit bill
                    </div>
                    <div className="text-[11px] text-emerald-600/90 dark:text-emerald-400/90 font-medium">
                      {billedPct}% kargo
                    </div>
                  </div>

                  {/* Stat 3: Belum Terbit Bill */}
                  <div className="space-y-0.5 sm:border-l-2 sm:border-amber-500/40 sm:pl-3">
                    <div className="text-lg sm:text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                      {formatNumber(totalUnbilled)}
                    </div>
                    <div className="text-xs font-semibold text-[var(--color-primary)]">
                      Belum terbit bill
                    </div>
                    <div className="text-[11px] text-amber-600/90 dark:text-amber-400/90 font-medium">
                      di {pendingBatches} batch
                    </div>
                  </div>
                </div>

                {/* Baris 2: Progress Bar Horizontal Tebal */}
                <div className="h-2.5 w-full rounded-full bg-[var(--color-neutral)] overflow-hidden flex border border-[var(--color-border)]/40">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${billedPct}%` }}
                    title={`Sudah terbit bill: ${billedPct}% (${formatNumber(totalBilled)} kargo)`}
                  />
                  <div
                    className="bg-amber-400/30 dark:bg-amber-500/20 h-full transition-all duration-500"
                    style={{ width: `${100 - billedPct}%` }}
                    title={`Belum terbit bill: ${(100 - billedPct).toFixed(1)}% (${formatNumber(totalUnbilled)} kargo)`}
                  />
                </div>

                {/* Garis Pembatas Putus-putus */}
                <div className="border-t border-dashed border-[var(--color-border)] my-1" />

                {/* Baris 3: Dual Moda Breakdown (Udara vs Laut) */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Moda Udara */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[var(--color-primary)]">
                        Moda Udara · {airSummary?.totalBatches ?? 0} batch
                      </span>
                      <span className="font-bold font-mono text-amber-600 dark:text-amber-400 italic">
                        {airPct}%
                      </span>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-[var(--color-neutral)] overflow-hidden flex border border-amber-500/20">
                      <div
                        className="bg-amber-500 h-full transition-all duration-500"
                        style={{ width: `${airPct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[var(--color-secondary)]">
                        <strong className="text-[var(--color-primary)]">{formatNumber(airSummary?.totalBilled ?? 0)}</strong> bill · <strong className="text-[var(--color-primary)]">{formatNumber(airSummary?.totalUnbilled ?? 0)}</strong> belum
                      </span>
                      <span className="text-[var(--color-primary)] font-semibold">
                        Total <strong className="font-bold">{formatNumber(airSummary?.totalKargo ?? 0)}</strong>
                      </span>
                    </div>

                    <div className="text-[10px] text-[var(--color-secondary)]">
                      {airBatchesCompleted} batch tuntas · {airBatchesPending} pending
                    </div>
                  </div>

                  {/* Moda Laut */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[var(--color-primary)]">
                        Moda Laut · {seaSummary?.totalBatches ?? 0} batch
                      </span>
                      <span className="font-bold font-mono text-sky-600 dark:text-sky-400 italic">
                        {seaPct}%
                      </span>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-[var(--color-neutral)] overflow-hidden flex border border-sky-500/20">
                      <div
                        className="bg-sky-500 h-full transition-all duration-500"
                        style={{ width: `${seaPct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[var(--color-secondary)]">
                        <strong className="text-[var(--color-primary)]">{formatNumber(seaSummary?.totalBilled ?? 0)}</strong> bill · <strong className="text-[var(--color-primary)]">{formatNumber(seaSummary?.totalUnbilled ?? 0)}</strong> belum
                      </span>
                      <span className="text-[var(--color-primary)] font-semibold">
                        Total <strong className="font-bold">{formatNumber(seaSummary?.totalKargo ?? 0)}</strong>
                      </span>
                    </div>

                    <div className="text-[10px] text-[var(--color-secondary)]">
                      {seaBatchesCompleted} batch tuntas · {seaBatchesPending} pending
                    </div>
                  </div>
                </div>
              </div>

              {/* ── PANEL KANAN: Kelengkapan Bill Per Status Customer ── */}
              <div className="p-4 sm:p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs space-y-3.5">
                {/* Header Panel */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[var(--color-primary)] font-[var(--font-display)]">
                      Kelengkapan bill per status customer
                    </h4>
                    <p className="text-[11px] text-[var(--color-secondary)] mt-0.5">
                      Persentase kargo yang sudah ditagih
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer shrink-0 transition-colors"
                  >
                    Buka rincian
                  </button>
                </div>

                {/* Switcher Pill Filter: [Semua N] [Udara N] [Laut N] */}
                <div className="inline-flex items-center gap-1 p-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs">
                  <button
                    type="button"
                    onClick={() => setStatusModaFilter('all')}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer',
                      statusModaFilter === 'all'
                        ? 'bg-[var(--color-surface)] text-[var(--color-primary)] font-bold shadow-2xs border border-[var(--color-border)]'
                        : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                    )}
                  >
                    Semua {formatNumber(filterCounts.all)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusModaFilter('udara')}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1',
                      statusModaFilter === 'udara'
                        ? 'bg-[var(--color-surface)] text-[var(--color-primary)] font-bold shadow-2xs border border-[var(--color-border)]'
                        : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                    )}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    <span>Udara {formatNumber(filterCounts.udara)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusModaFilter('laut')}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1',
                      statusModaFilter === 'laut'
                        ? 'bg-[var(--color-surface)] text-[var(--color-primary)] font-bold shadow-2xs border border-[var(--color-border)]'
                        : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                    )}
                  >
                    <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
                    <span>Laut {formatNumber(filterCounts.laut)}</span>
                  </button>
                </div>

                {/* List 5 Baris Status Customer */}
                <div className="space-y-3 pt-1">
                  {[
                    {
                      key: 'blocked',
                      label: 'Blocked',
                      badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60',
                      barClass: 'bg-rose-600',
                      data: currentStatusMetrics.blocked,
                    },
                    {
                      key: 'warning',
                      label: 'Warning',
                      badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60',
                      barClass: 'bg-amber-500',
                      data: currentStatusMetrics.warning,
                    },
                    {
                      key: 'urgent',
                      label: 'Urgent',
                      badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-900/60',
                      barClass: 'bg-sky-500',
                      data: currentStatusMetrics.urgent,
                    },
                    {
                      key: 'cod',
                      label: 'COD',
                      badgeClass: 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-900/60',
                      barClass: 'bg-teal-500',
                      data: currentStatusMetrics.cod,
                    },
                    {
                      key: 'ok',
                      label: 'OK',
                      badgeClass: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700',
                      barClass: 'bg-slate-400',
                      data: currentStatusMetrics.ok,
                    },
                  ].map((st) => {
                    const kargoCount = st.data.totalKargo
                    const unbilledCount = st.data.totalUnbilled
                    const pct = st.data.billedPercentage

                    return (
                      <div key={st.key} className="flex items-center gap-3">
                        {/* Badge Label */}
                        <div
                          className={cn(
                            'w-20 sm:w-22 px-2 py-0.5 rounded-lg text-xs font-semibold text-center shrink-0 select-none',
                            st.badgeClass
                          )}
                        >
                          {st.label}
                        </div>

                        {/* Bar & Subketerangan */}
                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 rounded-full bg-[var(--color-neutral)] overflow-hidden flex border border-[var(--color-border)]/40">
                              <div
                                className={cn('h-full transition-all duration-500', st.barClass)}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-xs text-[var(--color-primary)] shrink-0 w-12 text-right">
                              {pct}%
                            </span>
                          </div>

                          <div className="text-[11px] text-[var(--color-secondary)]">
                            {formatNumber(kargoCount)} kargo ·{' '}
                            {unbilledCount === 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                tuntas
                              </span>
                            ) : (
                              <span>{formatNumber(unbilledCount)} belum ditagih</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* ── ROW 2: Rasio Penagihan Per Cabang Asal Kargo (Tabel Rapi & Sejajar) ── */}
            {summary?.byBranch && summary.byBranch.length > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs space-y-3">
                {/* Header Rincian Cabang */}
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--color-primary)] font-[var(--font-display)]">
                    Rasio penagihan per cabang asal kargo
                  </h4>
                  <p className="text-[11px] text-[var(--color-secondary)] mt-0.5">
                    {summary.byBranch.length} cabang aktif · Cabang Singapore menyatukan kode <strong className="font-mono text-[var(--color-primary)]">--</strong> dan <strong className="font-mono text-[var(--color-primary)]">SG</strong>
                  </p>
                </div>

                {/* Tabel Sejajar */}
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] text-[var(--color-secondary)] font-semibold">
                        <th className="py-2.5 px-3 font-medium">Cabang</th>
                        <th className="py-2.5 px-3 font-medium">Rasio bill</th>
                        <th className="py-2.5 px-3 font-medium text-right sm:text-center">Bill</th>
                        <th className="py-2.5 px-3 font-medium text-right sm:text-center">Sisa</th>
                        <th className="py-2.5 px-3 font-medium text-right sm:text-center">Total</th>
                        <th className="py-2.5 px-3 font-medium">Batch</th>
                        <th className="py-2.5 px-3 font-medium">Moda</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]/60 font-[var(--font-body)]">
                      {summary.byBranch.map((br) => {
                        const isSG = br.branchCode === 'SG'
                        const isOver80 = br.billedPercentage >= 80
                        const isOver50 = br.billedPercentage >= 50

                        return (
                          <tr
                            key={br.branchCode}
                            className="hover:bg-[var(--color-neutral)]/40 transition-colors"
                          >
                            {/* Cabang */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="font-bold text-[var(--color-primary)]">
                                {br.branchName}
                              </span>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)] ml-1.5">
                                {isSG ? '-- & SG' : br.branchCode}
                              </span>
                            </td>

                            {/* Rasio bill: Bar + Persentase */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-28 sm:w-44 h-2.5 rounded-full bg-[var(--color-neutral)] overflow-hidden flex border border-[var(--color-border)]/40">
                                  <div
                                    className={cn(
                                      'h-full transition-all duration-300',
                                      isOver80
                                        ? 'bg-emerald-600'
                                        : isOver50
                                        ? 'bg-amber-500'
                                        : br.billedPercentage > 0
                                        ? 'bg-rose-500'
                                        : 'bg-transparent'
                                    )}
                                    style={{ width: `${br.billedPercentage}%` }}
                                  />
                                </div>
                                <span
                                  className={cn(
                                    'font-mono font-bold text-xs w-11 text-right',
                                    isOver80
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : isOver50
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-rose-600 dark:text-rose-400'
                                  )}
                                >
                                  {br.billedPercentage}%
                                </span>
                              </div>
                            </td>

                            {/* Bill */}
                            <td className="py-2.5 px-3 text-right sm:text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                              {formatNumber(br.totalBilled)}
                            </td>

                            {/* Sisa */}
                            <td className="py-2.5 px-3 text-right sm:text-center font-mono font-medium text-[var(--color-secondary)] whitespace-nowrap">
                              {formatNumber(br.totalUnbilled)}
                            </td>

                            {/* Total */}
                            <td className="py-2.5 px-3 text-right sm:text-center font-mono font-semibold text-[var(--color-primary)] whitespace-nowrap">
                              {formatNumber(br.totalKargo)}
                            </td>

                            {/* Batch */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-[var(--color-secondary)] font-mono text-[11px]">
                              <strong className="text-[var(--color-primary)] font-bold">{br.totalBatches}</strong> ({br.fullyBilledBatches} tuntas · {br.pendingBatches} pending)
                            </td>

                            {/* Moda */}
                            <td className="py-2.5 px-3 whitespace-nowrap font-mono text-xs">
                              <div className="flex items-center gap-2">
                                {br.airKargo > 0 && (
                                  <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block shrink-0" />
                                    <span>{formatNumber(br.airKargo)}</span>
                                  </span>
                                )}
                                {br.seaKargo > 0 && (
                                  <span className="inline-flex items-center gap-1 font-semibold text-sky-600 dark:text-sky-400">
                                    <span className="w-2 h-2 rounded-full bg-sky-500 inline-block shrink-0" />
                                    <span>{formatNumber(br.seaKargo)}</span>
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Keterangan Footer */}
                <div className="pt-2 border-t border-[var(--color-border)]/50 text-[11px] text-[var(--color-secondary)] flex items-center gap-2">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    <span>Udara</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
                    <span>Laut</span>
                  </span>
                  <span>·</span>
                  <span>angka pada kolom Moda adalah jumlah kargo</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Rincian Batch */}
      <BatchExitModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        batches={batches}
        summary={summary}
        selectedPeriodLabel={selectedPeriodLabel}
        allTime={allTime}
      />
    </>
  )
}
