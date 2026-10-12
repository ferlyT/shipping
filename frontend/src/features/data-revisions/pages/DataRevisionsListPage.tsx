import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Search,
  LayoutList,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  Download,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { toast } from 'sonner'
import { ROUTES } from '@/lib/constants'
import { useTranslation } from '@/hooks/useTranslation'
import { useDebounce } from '@/hooks/useDebounce'
import { PageHeader } from '@/components/ui/PageHeader'
import { useDataRevisions, useDataRevisionMutations } from '../hooks/useDataRevisions'
import { dataRevisionsApi } from '../services/data-revisions.service'
import RevisionAnalyticsSection from '../components/RevisionAnalyticsSection'
import RevisionTable from '../components/RevisionTable'
import RevisionGrid from '../components/RevisionGrid'
import RevisionDetailViewModal from '../components/RevisionDetailViewModal'

export default function DataRevisionsListPage() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('ALL')
  const [tipeData, setTipeData] = useState<string>('ALL')
  const [aksi, setAksi] = useState<string>('ALL')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [showAnalytics, setShowAnalytics] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [viewingRevisionId, setViewingRevisionId] = useState<number | null>(null)

  const debouncedSearch = useDebounce(search, 400)

  const { data, isLoading, isFetching } = useDataRevisions({
    page,
    limit,
    search: debouncedSearch,
    status,
    tipeData,
    aksi,
  })

  const {
    executeCancelMutation,
    revertCancelMutation,
    deleteMutation,
  } = useDataRevisionMutations()

  const handleExecuteCancel = (id: number) => {
    if (
      confirm(
        'Apakah Anda yakin ingin membatalkan data inputan ini?\nSistem akan mengeksekusi fdCancel = 1 pada tbEntryList untuk nomor inputan terkait.'
      )
    ) {
      executeCancelMutation.mutate(id)
    }
  }

  const handleRevertCancel = (id: number) => {
    if (
      confirm(
        'Kembalikan status data inputan ini?\nSistem akan mengembalikan fdCancel = 0 pada tbEntryList.'
      )
    ) {
      revertCancelMutation.mutate(id)
    }
  }

  const handleDelete = (id: number) => {
    if (confirm('Hapus dokumen form input & revisi ini?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleExportExcel = async () => {
    setIsExporting(true)
    try {
      const blob = await dataRevisionsApi.exportExcel()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `data-revisi-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('Ekspor Excel berhasil diunduh')
    } catch {
      toast.error('Gagal mengekspor berkas Excel')
    } finally {
      setIsExporting(false)
    }
  }

  const handleResetFilters = () => {
    setSearch('')
    setStatus('ALL')
    setTipeData('ALL')
    setAksi('ALL')
    setPage(1)
  }

  const formsList = data?.data || []
  const meta = data?.meta
  const stats = meta?.stats
  const totalPages = meta?.totalPages || 1
  const hasActiveFilters =
    search.trim() !== '' || status !== 'ALL' || tipeData !== 'ALL' || aksi !== 'ALL'

  return (
    <div className="flex flex-col min-h-full bg-[var(--color-neutral)]">
      {/* ── Page Header ── */}
      <div className="px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6 pb-3 sm:pb-4">
        <PageHeader
          title={t('nav.dataRevisions')}
          subtitle="Pencatatan form revisi kargo, pembatalan data inputan (fdCancel = 1), dan pemantauan penerbitan bill."
          breadcrumbs={[
            { label: t('module.logistics'), path: ROUTES.SHIPMENTS },
            { label: t('nav.dataRevisions'), path: ROUTES.DATA_REVISIONS_LIST },
            { label: 'Daftar Form' },
          ]}
          actions={
            <>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={isExporting}
                className="btn btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download size={14} />
                {isExporting ? 'Mengekspor...' : 'Ekspor Excel'}
              </button>
              <Link
                to={ROUTES.DATA_REVISION_NEW}
                className="btn btn-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-transform"
              >
                <Plus size={16} /> Buat Form Baru
              </Link>
            </>
          }
          className="!pb-0 !border-b-0 !mb-0"
        />
      </div>

      <div className="flex-1 flex flex-col px-3 sm:px-4 lg:px-6 pb-4 sm:pb-6 space-y-4">
        {/* ── Analytics KPI Section ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
              Ringkasan Pengajuan &amp; Status
            </h2>
            <button
              type="button"
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="text-xs font-medium text-[var(--color-secondary)] hover:text-[var(--color-primary)] flex items-center gap-1 transition-colors cursor-pointer"
            >
              {showAnalytics ? (
                <><ChevronUp size={14} /> Sembunyikan</>
              ) : (
                <><ChevronDown size={14} /> Tampilkan Ringkasan</>
              )}
            </button>
          </div>

          {showAnalytics && (
            <RevisionAnalyticsSection
              stats={stats}
              isLoading={isLoading}
              selectedStatus={status}
              onSelectStatus={(s) => {
                setStatus(s)
                setPage(1)
              }}
            />
          )}
        </div>

        {/* ── Toolbar & Filters ── */}
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-3 sm:p-4 space-y-3 sticky top-4 z-20 shadow-md">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-2.5 text-[var(--color-secondary)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Cari No. Form, ListCode, Customer, Marking, atau Pembuat..."
                className="form-input text-xs pl-9 pr-3 py-2 w-full"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2 text-xs text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={tipeData}
                onChange={(e) => { setTipeData(e.target.value); setPage(1) }}
                className="form-input text-xs py-1.5 px-2 bg-transparent cursor-pointer"
              >
                <option value="ALL">Semua Kategori</option>
                <option value="REVISI">REVISI</option>
                <option value="INPUT_BARU">INPUT BARU</option>
                <option value="INPUT_LOCAL_CHARGES">INPUT LOCAL CHARGES</option>
              </select>

              <select
                value={aksi}
                onChange={(e) => { setAksi(e.target.value); setPage(1) }}
                className="form-input text-xs py-1.5 px-2 bg-transparent cursor-pointer"
              >
                <option value="ALL">Semua Target Aksi</option>
                <option value="CANCEL_DATA">Cancel Data (fdCancel=1)</option>
                <option value="BUAT_BILL">Buat Bill</option>
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="btn btn-secondary text-xs py-1.5 px-2.5 inline-flex items-center gap-1 text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
                  title="Reset Semua Filter"
                >
                  <RotateCcw size={12} /> Reset
                </button>
              )}

              {/* View Switcher & Limit */}
              <div className="flex items-center gap-1 border-l border-[var(--color-border)] pl-2">
                <select
                  value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}
                  className="form-input text-xs py-1.5 px-2 bg-transparent cursor-pointer font-mono"
                >
                  <option value={10}>10 / hal</option>
                  <option value={20}>20 / hal</option>
                  <option value={50}>50 / hal</option>
                  <option value={100}>100 / hal</option>
                </select>

                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
                      : 'text-[var(--color-secondary)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                  title="Tampilan Tabel"
                >
                  <LayoutList size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
                      : 'text-[var(--color-secondary)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                  title="Tampilan Kartu"
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Status Segmented Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[var(--color-border)] text-[0.72rem]">
            <span className="text-[var(--color-secondary)] font-medium mr-1 flex items-center gap-1">
              <Filter size={12} /> Status:
            </span>
            {[
              { id: 'ALL', label: 'Semua Status' },
              { id: 'PENDING', label: 'Menunggu' },
              { id: 'DATA_CANCELLED', label: 'Data Dibatalkan (fdCancel=1)' },
              { id: 'BILL_TERBUAT', label: 'Bill Terbuat' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { setStatus(s.id); setPage(1) }}
                className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                  status === s.id
                    ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/40 shadow-xs'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-hover)] border border-transparent'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main Data Container ── */}
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 rounded-xl skeleton-shimmer" />
              ))}
            </div>
          ) : viewMode === 'table' ? (
            <RevisionTable
              data={formsList}
              onView={(id) => setViewingRevisionId(id)}
              onExecuteCancel={handleExecuteCancel}
              onRevertCancel={handleRevertCancel}
              onDelete={handleDelete}
              isExecuting={executeCancelMutation.isPending || revertCancelMutation.isPending}
            />
          ) : (
            <div className="p-4 sm:p-5">
              <RevisionGrid
                data={formsList}
                onView={(id) => setViewingRevisionId(id)}
                onExecuteCancel={handleExecuteCancel}
                onRevertCancel={handleRevertCancel}
                onDelete={handleDelete}
                isExecuting={executeCancelMutation.isPending || revertCancelMutation.isPending}
              />
            </div>
          )}

          {/* Pagination Footer */}
          {formsList.length > 0 && (
            <div className="p-4 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--color-secondary)] bg-[var(--color-surface-hover)]">
              <div>
                Menampilkan{' '}
                <strong className="text-[var(--color-primary)] font-mono">
                  {Math.min((page - 1) * limit + 1, meta?.total || 0)}
                </strong>{' '}
                sampai{' '}
                <strong className="text-[var(--color-primary)] font-mono">
                  {Math.min(page * limit, meta?.total || 0)}
                </strong>{' '}
                dari <strong className="text-[var(--color-primary)] font-mono">{meta?.total || 0}</strong> form
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isFetching}
                  className="p-1.5 rounded-md border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-2 font-mono font-medium text-[var(--color-primary)]">
                  Hal {page} dari {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isFetching}
                  className="p-1.5 rounded-md border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Detail Form & Galeri Lampiran */}
      <RevisionDetailViewModal
        revisionId={viewingRevisionId}
        isOpen={Boolean(viewingRevisionId)}
        onClose={() => setViewingRevisionId(null)}
        onExecuteCancel={handleExecuteCancel}
        onRevertCancel={handleRevertCancel}
      />
    </div>
  )
}
