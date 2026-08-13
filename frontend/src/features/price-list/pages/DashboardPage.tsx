import React, { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ArrowUpRight,
  Sparkles,
  History as HistoryIcon,
  Upload as UploadIcon,
} from 'lucide-react'
import { usePriceListFilters } from '../hooks/usePriceListFilters'
import { usePriceListTrend } from '../hooks/usePriceListTrend'
import { useLatestPriceDiff } from '../hooks/useLatestPriceDiff'
import { DashboardFilters } from '../components/DashboardFilters'
import { PriceTrendChart } from '../components/PriceTrendChart'
import { formatCurrency, formatDate } from '@/lib/utils'
import FadeIn from '@/components/ui/FadeIn'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'

type PriceChangeItem = {
  sheetType: string
  mode: string
  branch: string
  category: string
  previousPrice: number | null
  currentPrice: number
  deltaPct: number | null
}

function PriceChangeCard({
  title,
  icon,
  iconBg,
  emptyText,
  items,
  variant,
}: {
  title: string
  icon: React.ReactNode
  iconBg: string
  emptyText: string
  items: PriceChangeItem[]
  variant: 'naik' | 'turun'
}) {
  const isNaik = variant === 'naik'
  const chipBg = isNaik ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'
  const TrendIcon = isNaik ? TrendingUp : TrendingDown
  const sign = isNaik ? '+' : ''

  return (
    <div className="card p-4 sm:p-5 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[0.72rem] tracking-[0.06em] font-semibold text-[var(--color-secondary)] uppercase">{title}</p>
        <div className={`p-1.5 rounded-lg ${iconBg}`}>{icon}</div>
      </div>
      {items.length === 0 ? (
        <p className="text-[0.85rem] text-[var(--color-secondary)]">{emptyText}</p>
      ) : (
        <ul className="space-y-3 sm:space-y-2.5">
          {items.slice(0, 5).map((d, i) => (
            <li
              key={`${d.sheetType}-${d.mode}-${d.branch}-${d.category}-${i}`}
              className="flex items-start sm:items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-[0.9rem] font-semibold text-[var(--color-primary)] sm:truncate">
                  {d.branch}
                  <span className="hidden sm:inline text-[var(--color-secondary)] font-normal">
                    {' '}
                    · {d.sheetType} · {d.mode} · {d.category}
                  </span>
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5 sm:hidden">
                  <span className="inline-flex px-1.5 py-0.5 rounded-md bg-[var(--color-neutral)] text-[0.68rem] font-medium text-[var(--color-secondary)]">
                    {d.sheetType}
                  </span>
                  <span className="inline-flex px-1.5 py-0.5 rounded-md bg-[var(--color-neutral)] text-[0.68rem] font-medium text-[var(--color-secondary)]">
                    {d.mode}
                  </span>
                  <span className="inline-flex px-1.5 py-0.5 rounded-md bg-[var(--color-neutral)] text-[0.68rem] font-medium text-[var(--color-secondary)]">
                    {d.category}
                  </span>
                </div>
                <p className="text-[0.75rem] text-[var(--color-secondary)] mt-1">
                  {d.previousPrice !== null ? formatCurrency(d.previousPrice) : '—'} → {formatCurrency(d.currentPrice)}
                </p>
              </div>
              <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.78rem] font-medium ${chipBg}`}>
                <TrendIcon size={12} />
                {sign}
                {(d.deltaPct ?? 0).toFixed(1)}%
              </span>
            </li>
          ))}
          {items.length > 5 && (
            <li className="text-[0.75rem] text-[var(--color-secondary)] pt-1">+{items.length - 5} baris lainnya {variant}</li>
          )}
        </ul>
      )}
    </div>
  )
}

export function DashboardPage() {
  const { t } = useTranslation()

  const {
    options,
    optionsLoading,
    sheetTypes,
    setSheetTypes,
    mode,
    setMode,
    categories,
    setCategories,
    branch,
    setBranch,
    branchOptions,
    categoryOptions,
    categoriesLoading,
    filterError,
  } = usePriceListFilters()

  const {
    loading,
    error: trendError,
    chartData,
    series,
    yDomain,
    latestPrices,
    seriesTrend,
    maxPrice,
  } = usePriceListTrend(sheetTypes, mode, categories, branch)

  const {
    loading: diffLoading,
    error: diffError,
    currentEffectiveDate,
    previousEffectiveDate,
    naik,
    turun,
    tetapCount,
    baruCount,
  } = useLatestPriceDiff()

  const [activeMobileTab, setActiveMobileTab] = useState<'chart' | 'changes'>('chart')

  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  function handleSwipeStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function handleSwipeEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    touchStartX.current = null
    touchStartY.current = null
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    if (dx < 0 && activeMobileTab === 'chart') setActiveMobileTab('changes')
    if (dx > 0 && activeMobileTab === 'changes') setActiveMobileTab('chart')
  }

  const combinedError = filterError || trendError
  const hasChanges =
    !diffLoading && !!currentEffectiveDate && (naik.length > 0 || turun.length > 0 || tetapCount > 0 || baruCount > 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0 flex flex-col gap-6 sm:gap-8 bg-[var(--color-surface)] font-[var(--font-body)] animate-fadeIn pb-24">
      {/* Page Header (3-Level ERP Breadcrumbs) */}
      <PageHeader
        title={t('nav.priceListDashboard')}
        subtitle="Analisis tren tarif pengiriman dan riwayat perubahan harga"
        breadcrumbs={[
          { label: t('module.finance'), path: ROUTES.BILLING },
          { label: t('nav.priceList'), path: ROUTES.PRICE_LIST },
          { label: t('nav.priceListDashboard') },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link to={ROUTES.PRICE_LIST_HISTORY}>
              <Button variant="secondary" size="sm">
                <HistoryIcon className="w-4 h-4 mr-1.5" />
                {t('nav.priceListHistory')}
              </Button>
            </Link>
            <Link to={ROUTES.PRICE_LIST_UPLOAD}>
              <Button variant="primary" size="sm">
                <UploadIcon className="w-4 h-4 mr-1.5" />
                {t('nav.priceListUpload')}
              </Button>
            </Link>
          </div>
        }
      />

      <FadeIn show={!!(combinedError || diffError)}>
        <div className="flex items-start gap-3 rounded-lg border border-rose-500/25 bg-rose-500/5 px-4 py-3.5 text-sm text-rose-600">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">Gagal memuat data</p>
            <p className="text-rose-500/80">{combinedError || diffError}</p>
          </div>
        </div>
      </FadeIn>

      <DashboardFilters
        options={options}
        optionsLoading={optionsLoading}
        sheetTypes={sheetTypes}
        setSheetTypes={setSheetTypes}
        mode={mode}
        setMode={setMode}
        categories={categories}
        setCategories={setCategories}
        branch={branch}
        setBranch={setBranch}
        branchOptions={branchOptions}
        categoryOptions={categoryOptions}
        categoriesLoading={categoriesLoading}
      />

      {hasChanges && (
        <div className="sm:hidden -mt-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setActiveMobileTab('chart')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[0.8rem] font-medium transition-all ${
                activeMobileTab === 'chart'
                  ? 'bg-[var(--color-surface)] shadow-xs text-[var(--color-primary)]'
                  : 'text-[var(--color-secondary)]'
              }`}
            >
              <BarChart3 size={14} />
              Tren Harga
            </button>
            <button
              type="button"
              onClick={() => setActiveMobileTab('changes')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[0.8rem] font-medium transition-all ${
                activeMobileTab === 'changes'
                  ? 'bg-[var(--color-surface)] shadow-xs text-[var(--color-primary)]'
                  : 'text-[var(--color-secondary)]'
              }`}
            >
              <ArrowUpRight size={14} />
              Perubahan Harga{naik.length + turun.length > 0 ? ` (${naik.length + turun.length})` : ''}
            </button>
          </div>
        </div>
      )}

      <div
        onTouchStart={handleSwipeStart}
        onTouchEnd={handleSwipeEnd}
        className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px] gap-6 items-start"
      >
        <div className={`space-y-6 ${activeMobileTab === 'changes' ? 'hidden sm:block' : ''}`}>
          <PriceTrendChart
            mode={mode}
            loading={loading}
            chartData={chartData}
            series={series}
            yDomain={yDomain}
            latestPrices={latestPrices}
            seriesTrend={seriesTrend || {}}
            maxPrice={maxPrice}
            sheetTypes={sheetTypes}
            categories={categories}
            branch={branch}
          />
        </div>

        {hasChanges && (
          <div className={`space-y-4 ${activeMobileTab === 'chart' ? 'hidden sm:block' : ''}`}>
            <div className="card p-4 sm:p-5 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
                  Ringkasan Perubahan Tarif
                </p>
                <Sparkles size={14} className="text-amber-500" />
              </div>
              <p className="text-xs text-[var(--color-secondary)]">
                Perbandingan {currentEffectiveDate ? formatDate(currentEffectiveDate) : '—'} vs{' '}
                {previousEffectiveDate ? formatDate(previousEffectiveDate) : '—'}
              </p>

              <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-[var(--color-border)] text-center">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600">
                  <p className="text-lg font-bold tabular-nums">{naik.length}</p>
                  <p className="text-[0.68rem] font-medium uppercase tracking-wider">Naik</p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <p className="text-lg font-bold tabular-nums">{turun.length}</p>
                  <p className="text-[0.68rem] font-medium uppercase tracking-wider">Turun</p>
                </div>
                <div className="p-2 rounded-lg bg-[var(--color-neutral)] text-[var(--color-secondary)]">
                  <p className="text-lg font-bold tabular-nums text-[var(--color-primary)]">{tetapCount}</p>
                  <p className="text-[0.68rem] font-medium uppercase tracking-wider">Tetap</p>
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                  <p className="text-lg font-bold tabular-nums">{baruCount}</p>
                  <p className="text-[0.68rem] font-medium uppercase tracking-wider">Baru</p>
                </div>
              </div>
            </div>

            <PriceChangeCard
              title="Kenaikan Tarif Tertinggi"
              icon={<TrendingUp size={16} className="text-rose-600" />}
              iconBg="bg-rose-500/10"
              emptyText="Tidak ada kenaikan tarif."
              items={naik}
              variant="naik"
            />

            <PriceChangeCard
              title="Penurunan Tarif Terbesar"
              icon={<TrendingDown size={16} className="text-emerald-600" />}
              iconBg="bg-emerald-500/10"
              emptyText="Tidak ada penurunan tarif."
              items={turun}
              variant="turun"
            />
          </div>
        )}
      </div>
    </div>
  )
}
