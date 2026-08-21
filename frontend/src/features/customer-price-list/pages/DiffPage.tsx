import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { ArrowLeft, AlertCircle, TrendingUp, TrendingDown, Minus, Sparkles, Filter, Calendar, Tag, Plane, Ship } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { customerPriceListApi } from '../services/customerPriceList.service'
import type { CustomerPriceListDiff, CustomerPriceListDiffRow } from '../types'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EditEffectiveDateModal } from '@/features/price-list/components/EditEffectiveDateModal'
import { MarkingManagerModal } from '@/features/price-list/components/MarkingManagerModal'

export function DiffPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const uploadId = Number(id)

  const [data, setData] = useState<CustomerPriceListDiff | null>(null)
  const [onlyChanged, setOnlyChanged] = useState(false)
  const [activeKpi, setActiveKpi] = useState<'all' | 'naik' | 'turun' | 'tetap' | 'baru'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isEditingEffectiveDate, setIsEditingEffectiveDate] = useState(false)
  const [isManagingMarkings, setIsManagingMarkings] = useState(false)

  const loadData = () => {
    if (!uploadId) return
    setLoading(true)
    customerPriceListApi
      .getUploadDiff(uploadId)
      .then((res) => {
        setData(res.data.data)
      })
      .catch((err: any) => {
        setError(err?.response?.data?.message || err?.message || 'Gagal memuat detail upload')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [uploadId])

  let rows: CustomerPriceListDiffRow[] = data ? data.diff : []

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

  const custCode = data?.fdCustCode || ''
  const uploadMarkings = data?.markings || []

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0 space-y-6 sm:space-y-8 bg-[var(--color-surface)] font-[var(--font-body)] animate-fadeIn pb-24">
      <PageHeader
        title={`${t('nav.priceListDetail')} #${uploadId}`}
        subtitle={
          loading
            ? t('common.loading')
            : data
            ? `Customer: ${custCode} · Berlaku mulai: ${formatDate(data.currentEffectiveDate)}${
                data.previousUploadId && data.previousEffectiveDate
                  ? ` · vs. ${formatDate(data.previousEffectiveDate)}`
                  : ' · (upload pertama untuk periode ini)'
              }`
            : ''
        }
        breadcrumbs={[
          { label: t('module.finance'), path: ROUTES.BILLING },
          { label: t('nav.customerPriceList'), path: ROUTES.CUSTOMER_PRICE_LIST },
          { label: custCode || 'History', path: custCode ? ROUTES.CUSTOMER_PRICE_LIST_DETAIL(custCode) : '#' },
          { label: `#${uploadId}` },
        ]}
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            {data && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsManagingMarkings(true)}
                >
                  <Tag className="w-4 h-4 mr-1.5 text-amber-500" />
                  Agen / Marking ({uploadMarkings.length})
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditingEffectiveDate(true)}
                >
                  <Calendar className="w-4 h-4 mr-1.5" />
                  Edit Tgl Efektif
                </Button>
              </>
            )}
            <Link to={custCode ? ROUTES.CUSTOMER_PRICE_LIST_DETAIL(custCode) : ROUTES.CUSTOMER_PRICE_LIST}>
              <Button variant="secondary" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Kembali
              </Button>
            </Link>
          </div>
        }
      />

      {/* Info Agen / Marking Banner */}
      {!loading && data && (
        <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Tag size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[var(--color-primary)]">Agen & Kode Marking Terkait:</span>
                {uploadMarkings.length === 0 ? (
                  <span className="text-xs text-[var(--color-secondary)] italic">
                    Berlaku untuk semua agen customer ini
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {uploadMarkings.map((m) => (
                      <span
                        key={m.markingCode}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      >
                        {m.markingCode}
                        {m.agentName && <span className="ml-1 text-[10px] opacity-80 font-normal">({m.agentName})</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsManagingMarkings(true)}
            className="text-xs shrink-0"
          >
            {uploadMarkings.length > 0 ? 'Edit Marking' : '+ Tambah Marking Agen'}
          </Button>
        </div>
      )}


      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/25 bg-rose-500/5 px-4 py-3.5 text-sm text-rose-600">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

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

      <div className="bg-[var(--color-surface)] shadow-xs border border-[var(--color-border)] rounded-xl overflow-hidden">
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
                {['Mode', 'Cabang', 'Kategori Barang', 'Agen / Marking', 'Harga Sebelumnya', 'Harga Sekarang', 'Perubahan'].map((h, i) => (
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
                    <td className="px-6 py-4 whitespace-nowrap text-[0.9rem] text-[var(--color-secondary)]">{r.mode}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-[0.85rem] font-semibold text-[var(--color-primary)]">{r.branch}</span>
                    </td>
                    <td className="px-6 py-4 text-[0.9rem] text-[var(--color-primary)] max-w-[220px] truncate">{r.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {r.markings && r.markings.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {r.markings.map((m, mi) => (
                            <span
                              key={`${m.markingCode}-${m.mode || 'ALL'}-${mi}`}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25"
                              title={
                                m.agentName
                                  ? `${m.markingCode} (${m.agentName}${m.mode ? ` · ${m.mode}` : ''})`
                                  : `${m.markingCode}${m.mode ? ` (${m.mode})` : ''}`
                              }
                            >
                              {m.mode?.toUpperCase().includes('AIR') && <Plane size={9} className="text-sky-500" />}
                              {m.mode?.toUpperCase().includes('SEA') && <Ship size={9} className="text-blue-500" />}
                              <span>{m.markingCode}</span>
                              {m.agentName && (
                                <span className="text-[9px] font-normal text-[var(--color-secondary)]">
                                  · {m.agentName}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] font-medium text-[var(--color-secondary)]/60 italic">
                          Semua Agen
                        </span>
                      )}
                    </td>

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

      {/* Edit Effective Date Modal */}
      {data && (
        <EditEffectiveDateModal
          isOpen={isEditingEffectiveDate}
          onClose={() => setIsEditingEffectiveDate(false)}
          uploadId={uploadId}
          currentEffectiveDate={data.currentEffectiveDate}
          onSave={async (newDate) => {
            await customerPriceListApi.updateEffectiveDate(uploadId, newDate)
            loadData()
          }}
        />
      )}

      {/* Marking Manager Modal */}
      {data && (
        <MarkingManagerModal
          isOpen={isManagingMarkings}
          onClose={() => setIsManagingMarkings(false)}
          uploadId={uploadId}
          uploadDescription={{
            title: `Price List Upload #${uploadId}`,
            effectiveDate: data.currentEffectiveDate,
            custCode,
          }}
          initialMarkings={uploadMarkings}
          onSave={async (markings) => {
            await customerPriceListApi.setUploadMarkings(uploadId, markings)
            loadData()
          }}
        />
      )}
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
  color: 'emerald' | 'rose' | 'secondary' | 'tertiary'
  isActive?: boolean
  onClick?: () => void
}) {
  const borderColors = {
    emerald: 'border-emerald-500/40 text-emerald-500 hover:border-emerald-500',
    rose: 'border-rose-500/40 text-rose-500 hover:border-rose-500',
    secondary: 'border-[var(--color-border)] text-[var(--color-primary)] hover:border-[var(--color-secondary)]',
    tertiary: 'border-indigo-500/40 text-indigo-500 hover:border-indigo-500',
  }
  
  const activeBorders = {
    emerald: 'ring-2 ring-emerald-500/50 border-emerald-500',
    rose: 'ring-2 ring-rose-500/50 border-rose-500',
    secondary: 'ring-2 ring-[var(--color-primary)]/40 border-[var(--color-primary)]',
    tertiary: 'ring-2 ring-indigo-500/50 border-indigo-500',
  }

  return (
    <div
      onClick={onClick}
      className={`
        bg-transparent border rounded-xl p-4 sm:p-5 
        shadow-xs transition-all duration-200 cursor-pointer flex flex-col gap-3
        ${borderColors[color]}
        ${isActive ? activeBorders[color] : ''}
      `}
    >
      <div className="flex items-center justify-between">
        <span className="text-[0.8rem] font-semibold text-[var(--color-secondary)] tracking-wide">{label}</span>
        <div className="p-1.5 rounded-lg bg-transparent border border-[var(--color-border)]">{icon}</div>
      </div>
      <div className="text-[1.5rem] leading-none font-bold text-[var(--color-primary)] font-mono">
        {value.toLocaleString('id-ID')}
      </div>
    </div>
  )
}
