import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { Upload, Eye, ArrowRight, History as HistoryIcon, AlertCircle, FileSpreadsheet, CornerDownRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { priceListApi } from '../services/priceList.service'
import type { UploadRow } from '../types'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface UploadGroup {
  effectiveDate: string
  items: UploadRow[]
}

const STATUS_CLASS: Record<UploadRow['status'], string> = {
  PARSED: 'badge bg-emerald-500/10 text-emerald-600 border-emerald-500/25',
  PARTIAL: 'badge bg-amber-500/10 text-amber-600 border-amber-500/25',
  FAILED: 'badge bg-rose-500/10 text-rose-600 border-rose-500/25',
}

const STATUS_LABEL: Record<UploadRow['status'], string> = {
  PARSED: 'Berhasil',
  PARTIAL: 'Sebagian',
  FAILED: 'Gagal',
}

export function HistoryPage() {
  const { t } = useTranslation()
  const [rows, setRows] = useState<UploadRow[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pageSize = 20
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    setLoading(true)
    priceListApi
      .listUploads({ page, pageSize })
      .then((res) => {
        const raw = res.data as any
        const data = raw?.data ?? raw
        const meta = raw?.meta ?? {}
        if (Array.isArray(data)) {
          setRows(data)
          setTotal(meta.total ?? data.length)
        } else if (data?.rows) {
          setRows(data.rows)
          setTotal(data.total ?? data.rows.length)
        }
      })
      .catch((err: any) => {
        setError(err?.response?.data?.message || err?.message || 'Gagal memuat riwayat upload')
      })
      .finally(() => setLoading(false))
  }, [page])

  // Group by effectiveDate so superseded versions stay pinned beneath active version
  const groups: UploadGroup[] = useMemo(() => {
    const map = new Map<string, UploadRow[]>()
    for (const row of rows) {
      const key = row.effectiveDate
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(row)
    }

    const result = Array.from(map.entries()).map(([effectiveDate, items]) => ({
      effectiveDate,
      items: [...items].sort((a, b) => {
        if (a.isSuperseded !== b.isSuperseded) return a.isSuperseded ? 1 : -1
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      }),
    }))

    result.sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())
    return result
  }, [rows])

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0 space-y-6 sm:space-y-8 bg-[var(--color-surface)] font-[var(--font-body)] animate-fadeIn pb-24">
      {/* Page Header (3-Level ERP Breadcrumbs) */}
      <PageHeader
        title={t('nav.priceListHistory')}
        subtitle={loading ? t('common.loading') : `Total ${total} file price list telah diupload.`}
        breadcrumbs={[
          { label: t('module.finance'), path: ROUTES.BILLING },
          { label: t('nav.priceList'), path: ROUTES.PRICE_LIST },
          { label: t('nav.priceListHistory') },
        ]}
        actions={
          <div className="flex items-center gap-3 shrink-0">
            <Link to={ROUTES.PRICE_LIST}>
              <Button variant="secondary" size="sm">
                <HistoryIcon className="w-4 h-4 mr-1.5" />
                {t('nav.priceListDashboard')}
              </Button>
            </Link>
            <Link to={ROUTES.PRICE_LIST_UPLOAD}>
              <Button variant="primary" size="sm">
                <Upload className="w-4 h-4 mr-1.5" />
                {t('nav.priceListUpload')}
              </Button>
            </Link>
          </div>
        }
      />

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/25 bg-rose-500/5 px-4 py-3.5 text-sm text-rose-600">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-[var(--color-surface)] shadow-xs border border-[var(--color-border)] rounded-xl overflow-hidden">
        {/* Mobile list view */}
        <div className="sm:hidden">
          {loading ? (
            <div className="p-6 flex justify-center">
              <LoadingSpinner message={t('common.loading')} />
            </div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                <div className="w-16 h-16 bg-[var(--color-neutral)] rounded-full flex items-center justify-center mb-4 border border-[var(--color-border)]">
                  <FileSpreadsheet className="w-8 h-8 text-[var(--color-secondary)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-1">Belum ada riwayat upload</h3>
                <p className="text-[var(--color-secondary)] text-sm leading-relaxed mb-4">
                  File Excel price list yang Anda upload akan tersimpan di sini secara rapi.
                </p>
                <Link to={ROUTES.PRICE_LIST_UPLOAD}>
                  <Button variant="secondary" size="sm">
                    <Upload className="w-4 h-4 mr-1.5" /> {t('nav.priceListUpload')}
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {groups.map((group, gi) => (
                <div key={group.effectiveDate} className={`p-3 ${gi % 2 === 1 ? 'bg-[var(--color-neutral)]/50' : 'bg-[var(--color-surface)]'}`}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-[0.9rem] font-bold text-[var(--color-primary)]">
                      {new Date(group.effectiveDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    {group.items.length > 1 && (
                      <span className="text-[0.62rem] font-mono font-semibold text-[var(--color-tertiary)]/70 uppercase tracking-wide">
                        {group.items.length} versi
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {group.items.map((row) => (
                      <Link
                        key={row.id}
                        to={ROUTES.PRICE_LIST_DETAIL(row.id)}
                        className={`block rounded-lg border bg-[var(--color-surface)] p-3 transition-colors duration-150 active:bg-[var(--color-neutral)] ${
                          row.isSuperseded ? 'opacity-55 border-[var(--color-border)]/50' : 'border-[var(--color-border)]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {row.isSuperseded && <CornerDownRight size={13} className="text-[var(--color-secondary)]/40 shrink-0" />}
                            <span className="text-[0.85rem] font-mono text-[var(--color-secondary)] truncate">{row.fileName}</span>
                          </div>
                          <span className={`${STATUS_CLASS[row.status]} shrink-0 text-xs`}>{STATUS_LABEL[row.status]}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[0.78rem] text-[var(--color-secondary)]">
                          <span className="truncate">
                            {row.uploadedBy ?? '—'} ·{' '}
                            {new Date(row.uploadedAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="shrink-0 font-mono flex items-center gap-1 text-[var(--color-tertiary)] font-semibold">
                            {row._count.items.toLocaleString('id-ID')} baris
                            <ArrowRight size={12} />
                          </span>
                        </div>
                        {row.isSuperseded && (
                          <p className="text-[0.62rem] uppercase tracking-wide text-[var(--color-secondary)]/50 font-mono mt-1">
                            · digantikan
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop table view */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--color-border)]">
            <thead className="bg-[var(--color-neutral)]">
              <tr>
                {[
                  { label: 'Berlaku Mulai', note: 'Tanggal harga berlaku' },
                  { label: 'File' },
                  { label: 'Diupload Oleh' },
                  { label: 'Waktu Upload' },
                  { label: 'Baris Harga' },
                  { label: 'Status Parsing' },
                  { label: '' },
                ].map((h, i) => (
                  <th
                    key={i}
                    scope="col"
                    className={`px-6 py-4 text-left text-[0.72rem] tracking-[0.06em] font-semibold text-[var(--color-secondary)] uppercase ${
                      h.label === '' ? 'text-right' : ''
                    }`}
                  >
                    {h.label}
                    {h.note && (
                      <span className="hidden lg:block text-[0.65rem] font-normal tracking-normal normal-case text-[var(--color-secondary)]/60">
                        {h.note}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            {loading ? (
              <tbody className="divide-y divide-[var(--color-border)]">
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <LoadingSpinner message={t('common.loading')} />
                  </td>
                </tr>
              </tbody>
            ) : rows.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                      <div className="w-16 h-16 bg-[var(--color-neutral)] rounded-full flex items-center justify-center mb-4 border border-[var(--color-border)]">
                        <FileSpreadsheet className="w-8 h-8 text-[var(--color-secondary)]" />
                      </div>
                      <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-1">Belum ada riwayat upload</h3>
                      <p className="text-[var(--color-secondary)] text-sm leading-relaxed mb-4">
                        File Excel price list yang Anda upload akan tersimpan di sini secara rapi.
                      </p>
                      <Link to={ROUTES.PRICE_LIST_UPLOAD}>
                        <Button variant="secondary" size="sm">
                          <Upload size={16} className="mr-1.5" /> {t('nav.priceListUpload')}
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              </tbody>
            ) : (
              groups.map((group, gi) => (
                <tbody
                  key={group.effectiveDate}
                  className={`divide-y divide-[var(--color-border)] ${gi % 2 === 1 ? 'bg-[var(--color-neutral)]/40' : 'bg-[var(--color-surface)]'}`}
                >
                  {group.items.map((row, ri) => {
                    const isHead = ri === 0
                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-[var(--color-neutral)] transition-colors duration-150 ${row.isSuperseded ? 'opacity-55' : ''} ${
                          gi > 0 && isHead ? 'border-t-2 border-[var(--color-border)]' : ''
                        }`}
                      >
                        {isHead && (
                          <td
                            rowSpan={group.items.length}
                            className="px-6 py-4 align-top whitespace-nowrap border-r border-dashed border-[var(--color-border)]"
                          >
                            <div className="flex flex-col gap-1">
                              <span className="text-[0.95rem] font-bold text-[var(--color-primary)]">
                                {new Date(group.effectiveDate).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                              {group.items.length > 1 && (
                                <span className="text-[0.65rem] font-mono font-semibold text-[var(--color-tertiary)] uppercase tracking-wide">
                                  {group.items.length} versi
                                </span>
                              )}
                            </div>
                          </td>
                        )}

                        <td
                          className={`px-6 py-4 text-[0.88rem] max-w-[220px] font-mono ${
                            row.isSuperseded ? 'text-[var(--color-secondary)]/70' : 'text-[var(--color-secondary)]'
                          }`}
                        >
                          <div
                            className={`flex items-center gap-1.5 min-w-0 ${
                              !isHead ? 'pl-3 border-l-2 border-dashed border-[var(--color-border)]' : ''
                            }`}
                          >
                            {!isHead && <CornerDownRight size={13} className="text-[var(--color-secondary)]/40 shrink-0" />}
                            <span className="truncate">{row.fileName}</span>
                            {!isHead && (
                              <span className="shrink-0 text-[0.62rem] uppercase tracking-wide text-[var(--color-secondary)]/50 font-mono">
                                · digantikan
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-[0.9rem] text-[var(--color-secondary)]">
                          {row.uploadedBy ?? <span className="text-[var(--color-secondary)]/40">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[0.88rem] text-[var(--color-secondary)]">
                          {new Date(row.uploadedAt).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[0.9rem] font-mono text-[var(--color-secondary)]">
                          {row._count.items.toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={STATUS_CLASS[row.status]}>{STATUS_LABEL[row.status]}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Link
                            to={ROUTES.PRICE_LIST_DETAIL(row.id)}
                            className="p-1.5 text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] rounded-md transition-all duration-150 inline-flex items-center gap-1 text-[0.85rem]"
                          >
                            <Eye size={16} />
                            <span className="hidden sm:inline">Detail</span>
                            <ArrowRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              ))
            )}
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="px-4 sm:px-6 py-4 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[0.82rem] sm:text-[0.9rem] text-[var(--color-secondary)] text-center sm:text-left order-2 sm:order-1">
              Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} dari {total} upload
            </p>
            <div className="flex items-center justify-between gap-2 order-1 sm:order-2 sm:justify-start">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft size={16} className="sm:hidden" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </Button>
              <div className="font-mono text-[0.8rem] sm:text-sm text-[var(--color-secondary)] shrink-0 whitespace-nowrap text-center flex-1 sm:flex-none sm:px-3">
                {page} / {totalPages}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight size={16} className="sm:hidden" />
                <span className="hidden sm:inline">Selanjutnya</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
