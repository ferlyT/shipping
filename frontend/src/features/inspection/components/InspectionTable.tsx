import { Eye, Edit2, Trash2, Camera, Plane, Ship, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { useTranslation } from '@/hooks/useTranslation'
import type { InspectionReport } from '../types/inspection.types'

interface Props {
  reports: InspectionReport[]
  isLoading?: boolean
  onViewDetail: (report: InspectionReport, tab?: 'attachments' | 'items') => void
  onEdit: (report: InspectionReport) => void
  onDelete: (report: InspectionReport) => void
}

export function InspectionTable({
  reports,
  isLoading,
  onViewDetail,
  onEdit,
  onDelete,
}: Props) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-xs">
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-10 w-full rounded skeleton-shimmer" />
          ))}
        </div>
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-[var(--color-neutral)] mx-auto flex items-center justify-center text-[var(--color-secondary)] mb-3">
          <AlertCircle size={24} />
        </div>
        <h4 className="text-sm font-bold text-[var(--color-primary)]">
          {t('common.noData')}
        </h4>
        <p className="text-xs text-[var(--color-secondary)] mt-1 max-w-sm mx-auto">
          Belum ada data Berita Acara Pemeriksaan yang sesuai dengan kriteria filter saat ini.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-neutral)] text-[var(--color-secondary)] uppercase tracking-wider font-semibold text-[10px]">
              <th className="py-2.5 px-3">No. BAP</th>
              <th className="py-2.5 px-3">Tanggal</th>
              <th className="py-2.5 px-3">Moda</th>
              <th className="py-2.5 px-3">Marking & List</th>
              <th className="py-2.5 px-3">Customer</th>
              <th className="py-2.5 px-3">No. Resi</th>
              <th className="py-2.5 px-3 text-center">Foto</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {reports.map((report) => {
              const photoCount = report.photoCount || (report.photos ? report.photos.length : 0)
              const isAir = report.fdListType === 1

              return (
                <tr
                  key={report.fdId}
                  className="hover:bg-[var(--color-neutral)]/50 transition-colors cursor-pointer"
                  onClick={() => onViewDetail(report)}
                >
                  {/* No. BAP */}
                  <td className="py-2.5 px-3 font-bold font-mono text-[var(--color-primary)]">
                    {report.fdReportNumber}
                  </td>

                  {/* Tanggal */}
                  <td className="py-2.5 px-3 text-[var(--color-secondary)] whitespace-nowrap">
                    {new Date(report.fdReportDate).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>

                  {/* Moda */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                        isAir
                          ? 'bg-sky-500/10 text-sky-500 border-sky-500/20'
                          : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                      }`}
                    >
                      {isAir ? <Plane size={11} /> : <Ship size={11} />}
                      {isAir ? 'Udara' : 'Laut'}
                    </span>
                  </td>

                  {/* Marking */}
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-[var(--color-primary)]">
                      {report.fdMarkingCode || '—'}
                      {report.fdMarkingNo ? (
                        <span className="text-[var(--color-secondary)] font-normal text-[10px]">
                          {' '}
                          #{report.fdMarkingNo}
                        </span>
                      ) : null}
                    </div>
                    {report.fdListCode ? (
                      <div className="text-[10px] text-[var(--color-secondary)] font-mono">
                        {report.fdListCode}
                      </div>
                    ) : null}
                  </td>

                  {/* Customer */}
                  <td className="py-2.5 px-3 font-medium text-[var(--color-primary)] max-w-[200px] truncate" title={report.fdNamaCustomer}>
                    {report.fdNamaCustomer}
                  </td>

                  {/* No. Resi */}
                  <td className="py-2.5 px-3 font-mono text-[var(--color-secondary)] whitespace-nowrap">
                    {report.fdTerima || '—'}
                  </td>

                  {/* Foto */}
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onViewDetail(report, 'attachments')
                      }}
                      title="Lihat Foto Pemeriksaan"
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border transition-transform hover:scale-105 ${
                        photoCount > 0
                          ? 'bg-sky-500/10 text-sky-500 border-sky-500/30 hover:bg-sky-500/20'
                          : 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20 hover:text-neutral-200'
                      }`}
                    >
                      <Camera size={11} />
                      <span>{photoCount} Foto</span>
                    </button>
                  </td>

                  {/* Status */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <Badge variant={report.fdStatus === '2' ? 'success' : 'warning'}>
                      {report.fdStatus === '2' ? t('bap.statusDone') : t('bap.statusDraft')}
                    </Badge>
                  </td>

                  {/* Aksi */}
                  <td className="py-2.5 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onViewDetail(report)}
                        title={t('common.detail')}
                        className="p-1 text-[var(--color-secondary)] hover:text-blue-500 rounded hover:bg-[var(--color-neutral)] transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(report)}
                        title={t('common.edit')}
                        className="p-1 text-[var(--color-secondary)] hover:text-amber-500 rounded hover:bg-[var(--color-neutral)] transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(report)}
                        title={t('common.delete')}
                        className="p-1 text-[var(--color-secondary)] hover:text-red-500 rounded hover:bg-[var(--color-neutral)] transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
