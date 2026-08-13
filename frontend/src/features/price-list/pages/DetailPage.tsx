import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { ArrowLeft, AlertCircle, TrendingUp, TrendingDown, Minus, Sparkles, Filter, Anchor, Plane } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { priceListApi } from '../services/priceList.service'
import type { DiffResponse, DiffRow } from '../types'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { SegmentedControl, PillSingleToggle } from '../components/DashboardFilters'

export function DetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const uploadId = Number(id)

  const [data, setData] = useState<DiffResponse | null>(null)
  const [onlyChanged, setOnlyChanged] = useState(false)
  const [activeKpi, setActiveKpi] = useState<'all' | 'naik' | 'turun' | 'tetap' | 'baru'>('all')
  const [modeFilter, setModeFilter] = useState<string>('')
  const [branchFilter, setBranchFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!uploadId) return
    setLoading(true)
    priceListApi
      .getUploadDiff(uploadId)
      .then((res) => {
        const raw = res.data as any
        setData(raw?.data ?? raw)
      })
      .catch((err: any) => {
        setError(err?.response?.data?.message || err?.message || 'Gagal memuat detail upload')
      })
      .finally(() => setLoading(false))
  }, [uploadId])

  const modeOptions = useMemo(() => {
    if (!data?.diff) return ['BY SEA', 'BY AIR']
    const set = new Set(data.diff.map((r) => r.mode).filter(Boolean))
    return set.size > 0 ? Array.from(set) : ['BY SEA', 'BY AIR']
  }, [data])

  const branchOptions = useMemo(() => {
    if (!data?.diff) return ['GZ', 'YW']
    const set = new Set(data.diff.map((r) => r.branch).filter(Boolean))
    return set.size > 0 ? Array.from(set) : ['GZ', 'YW']
  }, [data])

  let rows: DiffRow[] = data ? data.diff : []

  if (modeFilter) {
    rows = rows.filter((r) => r.mode.toUpperCase() === modeFilter.toUpperCase())
  }

  if (branchFilter) {
    rows = rows.filter((r) => r.branch.toUpperCase() === branchFilter.toUpperCase())
  }

  if (onlyChanged) {
    rows = rows.filter((r) => r.delta !== null && r.delta !== 0)
  }

  if (activeKpi !== 'all') {
    rows = rows.filter((r) => {
      if (activeKpi === 'naik') return r.delta !== null && r.delta > 0
      if (activeKpi === 'turun') return r.delta !== null && r.delta < 0
      if (activeKpi === 'tetap') return r.delta !== null && r.delta === 0
      if (activeKpi === 'baru') return r.delta === null
      return true
    })
  }

  const stats = data
    ? {
        naik: data.diff.filter((r) => r.delta !== null && r.delta > 0).length,
        turun: data.diff.filter((r) => r.delta !== null && r.delta < 0).length,
        tetap: data.diff.filter((r) => r.delta !== null && r.delta === 0).length,
        baru: data.diff.filter((r) => r.delta === null).length,
      }
    : null

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0 space-y-6 sm:space-y-8 bg-[var(--color-surface)] font-[var(--font-body)] animate-fadeIn pb-24">
      {/* Page Header (3-Level ERP Breadcrumbs) */}
      <PageHeader
        title={`${t('priceList.detailTitle')} #${uploadId}`}
        subtitle={
          loading
            ? t('common.loading')
            : data
            ? `Berlaku mulai: ${formatDate(data.currentEffectiveDate)}${
                data.previousUploadId && data.previousEffectiveDate
                  ? ` · vs. ${formatDate(data.previousEffectiveDate)}`
                  : ' · (upload pertama untuk periode ini)'
              }`
            : ''
        }
        breadcrumbs={[
          { label: t('module.finance'), path: ROUTES.BILLING },
          { label: t('nav.priceList'), path: ROUTES.PRICE_LIST },
          { label: t('nav.priceListHistory'), path: ROUTES.PRICE_LIST_HISTORY },
          { label: `#${uploadId}` },
        ]}
        actions={
          <Link to={ROUTES.PRICE_LIST_HISTORY}>
            <Button variant="secondary" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              {t('nav.priceListHistory')}
            </Button>
          </Link>
        }
      />

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/25 bg-rose-500/5 px-4 py-3.5 text-sm text-rose-600">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Pill Groups Filter (Tipe Mode & Cabang Target) */}
      {!loading && data && (
        <div className="card border border-[var(--color-border)] rounded-2xl p-4 sm:p-5 bg-[var(--color-surface)] shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SegmentedControl
              label="Tipe Mode"
              value={modeFilter}
              onChange={setModeFilter}
              options={modeOptions}
              getIcon={(o) => {
                const v = o.toLowerCase()
                if (v.includes('sea') || v.includes('laut')) return Anchor
                if (v.includes('air') || v.includes('udara')) return Plane
                return undefined
              }}
            />

            <PillSingleToggle
              label="Cabang Target"
              value={branchFilter}
              onChange={setBranchFilter}
              options={branchOptions}
              clearLabel="Semua Cabang"
            />
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {!loading && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            icon={<TrendingUp size={18} className="text-rose-500" />}
            label="Naik"
            value={stats.naik}
            color="rose"
            isActive={activeKpi === 'naik'}
            onClick={() => setActiveKpi((prev) => (prev === 'naik' ? 'all' : 'naik'))}
          />
          <StatCard
            icon={<TrendingDown size={18} className="text-emerald-600" />}
            label="Turun"
            value={stats.turun}
            color="emerald"
            isActive={activeKpi === 'turun'}
            onClick={() => setActiveKpi((prev) => (prev === 'turun' ? 'all' : 'turun'))}
          />
          <StatCard
            icon={<Minus size={18} className="text-[var(--color-secondary)]" />}
            label="Tetap"
            value={stats.tetap}
            color="secondary"
            isActive={activeKpi === 'tetap'}
            onClick={() => setActiveKpi((prev) => (prev === 'tetap' ? 'all' : 'tetap'))}
          />
          <StatCard
            icon={<Sparkles size={18} className="text-indigo-500" />}
            label="Baru"
            value={stats.baru}
            color="tertiary"
            isActive={activeKpi === 'baru'}
            onClick={() => setActiveKpi((prev) => (prev === 'baru' ? 'all' : 'baru'))}
          />
        </div>
      )}

      {/* Table */}
      <div className="bg-[var(--color-surface)] shadow-xs border border-[var(--color-border)] rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-[var(--color-secondary)]" />
            <h2 className="text-[1rem] font-semibold text-[var(--color-primary)]">
              {rows.length.toLocaleString('id-ID')} baris harga
            </h2>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setOnlyChanged((v) => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                onlyChanged ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-secondary)]/25'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                  onlyChanged ? 'translate-x-4' : ''
                }`}
              />
            </div>
            <span className="text-sm text-[var(--color-secondary)] font-medium">Yang berubah saja</span>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--color-border)]">
            <thead className="bg-[var(--color-neutral)]">
              <tr>
                {['Tipe', 'Mode', 'Cabang', 'Kategori Barang', 'Harga Sebelumnya', 'Harga Sekarang', 'Perubahan'].map((h, i) => (
                  <th
                    key={h}
                    scope="col"
                    className={`px-6 py-4 text-[0.72rem] tracking-[0.06em] font-semibold text-[var(--color-secondary)] uppercase ${
                      i >= 4 ? 'text-right' : 'text-left'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <LoadingSpinner message={t('common.loading')} />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <p className="text-[var(--color-secondary)] text-sm">Tidak ada data yang ditampilkan.</p>
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={i} className="hover:bg-[var(--color-neutral)] transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[0.78rem] font-mono font-semibold bg-[var(--color-neutral)] text-[var(--color-primary)] border border-[var(--color-border)] px-2 py-0.5 rounded">
                        {r.sheetType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[0.9rem] text-[var(--color-secondary)]">{r.mode}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-[0.85rem] font-semibold text-[var(--color-primary)]">{r.branch}</span>
                    </td>
                    <td className="px-6 py-4 text-[0.9rem] text-[var(--color-primary)] max-w-[220px] truncate">{r.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-[0.88rem] font-mono text-[var(--color-secondary)]/70">
                      {r.previousPrice !== null ? formatCurrency(r.previousPrice) : <span className="text-[var(--color-secondary)]/30">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-[0.9rem] font-mono font-semibold text-[var(--color-primary)]">
                      {formatCurrency(r.currentPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {r.delta === null ? (
                        <span className="badge bg-indigo-500/10 text-indigo-600 border-indigo-500/20">Baru</span>
                      ) : r.delta === 0 ? (
                        <span className="badge bg-[var(--color-neutral)] text-[var(--color-secondary)] border-[var(--color-border)]">Tetap</span>
                      ) : r.delta > 0 ? (
                        <span className="badge bg-rose-500/10 text-rose-600 border-rose-500/20 inline-flex items-center gap-1 font-semibold">
                          <TrendingUp size={11} />
                          +{(r.deltaPct ?? 0).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="badge bg-emerald-500/10 text-emerald-600 border-emerald-500/20 inline-flex items-center gap-1 font-semibold">
                          <TrendingDown size={11} />
                          {(r.deltaPct ?? 0).toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
  isActive,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
  isActive?: boolean
  onClick?: () => void
}) {
  const colorMap: Record<string, string> = {
    rose: 'bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10',
    emerald: 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10',
    secondary: 'bg-[var(--color-neutral)] border-[var(--color-border)] hover:bg-[var(--color-neutral)]/80',
    tertiary: 'bg-indigo-500/5 border-indigo-500/20 hover:bg-indigo-500/10',
  }
  const activeClassMap: Record<string, string> = {
    rose: 'ring-2 ring-rose-500 bg-rose-500/10',
    emerald: 'ring-2 ring-emerald-500 bg-emerald-500/10',
    secondary: 'ring-2 ring-[var(--color-primary)]/50 bg-[var(--color-neutral)]',
    tertiary: 'ring-2 ring-indigo-500 bg-indigo-500/10',
  }
  return (
    <div
      className={`card p-4 border rounded-xl flex items-center gap-3 cursor-pointer transition-all duration-200 ${
        colorMap[color] ?? ''
      } ${isActive ? activeClassMap[color] : ''}`}
      onClick={onClick}
    >
      <div className="p-2 rounded-lg bg-[var(--color-surface)] shadow-xs">{icon}</div>
      <div>
        <div className="text-[1.5rem] font-bold font-mono text-[var(--color-primary)] leading-none">{value}</div>
        <div className="text-[0.72rem] uppercase tracking-wider text-[var(--color-secondary)] font-semibold mt-0.5">{label}</div>
      </div>
    </div>
  )
}
