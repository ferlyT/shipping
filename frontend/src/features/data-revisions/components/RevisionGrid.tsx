import { Link } from 'react-router-dom'
import {
  Printer,
  Edit,
  Trash2,
  Ban,
  RotateCcw,
  CheckCircle2,
  FileText,
  Calendar,
  Eye,
} from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import type { DataRevision } from '../types/data-revisions.types'
import RevisionStatusBadge from './RevisionStatusBadge'

interface RevisionGridProps {
  data: DataRevision[]
  onView: (id: number) => void
  onExecuteCancel: (id: number) => void
  onRevertCancel: (id: number) => void
  onDelete: (id: number) => void
  isExecuting?: boolean
}

export default function RevisionGrid({
  data = [],
  onView,
  onExecuteCancel,
  onRevertCancel,
  onDelete,
  isExecuting = false,
}: RevisionGridProps) {
  if (data.length === 0) {
    return (
      <div className="p-12 text-center text-[var(--color-secondary)] text-xs space-y-2 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
        <FileText size={32} className="mx-auto text-[var(--color-secondary)]/40" />
        <p>Tidak ada data form input &amp; revisi yang ditemukan.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((row) => {
        const firstDetail = row.details?.[0]
        const custName = firstDetail?.fdBaruCustName || firstDetail?.fdAwalCustName || '—'
        const custCode = firstDetail?.fdBaruCustCode || firstDetail?.fdAwalCustCode
        const inputan = firstDetail?.fdBaruNoInputan || firstDetail?.fdAwalNoInputan || '—'
        const dateFormatted = row.fdTanggal ? row.fdTanggal.split('T')[0] : '—'

        return (
          <div
            key={row.fdId}
            className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 flex flex-col justify-between space-y-3 hover:border-[var(--color-primary)]/50 transition-all hover:shadow-md"
          >
            {/* Top row: Form number and badge */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="inline-flex px-2 py-0.5 rounded text-[0.65rem] font-bold border border-[var(--color-border)] bg-[var(--color-surface-hover)] text-[var(--color-primary)] mb-1">
                  {row.fdTipeData}
                </span>
                <button
                  type="button"
                  onClick={() => onView(row.fdId)}
                  className="block text-sm font-bold font-mono text-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer text-left"
                  title="Lihat Detail Formulir & Galeri Lampiran"
                >
                  {row.fdNomorForm}
                </button>
              </div>
              <RevisionStatusBadge
                status={row.fdStatus}
                matchedInvNo={row.fdMatchedInvNo}
              />
            </div>

            {/* Target Aksi & Info */}
            <div className="p-2.5 rounded-lg bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-xs space-y-1.5">
              <div className="flex items-center justify-between text-[0.7rem]">
                <span className="text-[var(--color-secondary)]">Target Aksi:</span>
                {row.fdAksi === 'CANCEL_DATA' ? (
                  <span className="font-semibold text-rose-500 inline-flex items-center gap-1">
                    <Ban size={12} /> Cancel Data
                  </span>
                ) : (
                  <span className="font-semibold text-emerald-500 inline-flex items-center gap-1">
                    <CheckCircle2 size={12} /> Buat Bill
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-[0.7rem]">
                <span className="text-[var(--color-secondary)]">SPBL / Inputan:</span>
                <span className="font-mono font-bold text-[var(--color-primary)]">{inputan}</span>
              </div>

              <div className="pt-1 border-t border-[var(--color-border)]">
                <p className="text-[0.68rem] text-[var(--color-secondary)] uppercase font-semibold">
                  Customer:
                </p>
                <p className="font-semibold text-[var(--color-primary)] truncate">
                  {custName}{' '}
                  {custCode && <span className="font-mono text-[var(--color-secondary)]">({custCode})</span>}
                </p>
              </div>

              {row.details && row.details.length > 1 && (
                <p className="text-[0.65rem] text-[var(--color-primary)] font-medium">
                  +{row.details.length - 1} rincian perubahan lainnya
                </p>
              )}
            </div>

            {/* Bottom Meta & Actions */}
            <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
              <div className="text-[0.68rem] text-[var(--color-secondary)] flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <Calendar size={11} /> {dateFormatted}
                </span>
                <span>•</span>
                <span className="truncate max-w-[80px]" title={row.fdDibuatOleh || undefined}>
                  {row.fdDibuatOleh || '—'}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {row.fdAksi === 'CANCEL_DATA' && row.fdStatus === 'PENDING' && (
                  <button
                    type="button"
                    onClick={() => onExecuteCancel(row.fdId)}
                    disabled={isExecuting}
                    className="btn btn-secondary text-[0.65rem] py-1 px-2 border-rose-500/40 text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                    title="Eksekusi Cancel Data (fdCancel = 1)"
                  >
                    Cancel Data
                  </button>
                )}

                {row.fdAksi === 'CANCEL_DATA' && row.fdStatus === 'DATA_CANCELLED' && (
                  <button
                    type="button"
                    onClick={() => onRevertCancel(row.fdId)}
                    disabled={isExecuting}
                    className="btn btn-secondary text-[0.65rem] py-1 px-1.5 text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
                    title="Kembalikan status cancel"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}

                {/* Tombol Lihat Detail & Galeri */}
                <button
                  type="button"
                  onClick={() => onView(row.fdId)}
                  className="p-1.5 rounded text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors cursor-pointer"
                  title="Lihat Detail Form & Galeri Lampiran"
                >
                  <Eye size={15} />
                </button>

                <Link
                  to={ROUTES.DATA_REVISION_PRINT(row.fdId)}
                  className="p-1.5 rounded text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors"
                  title="Cetak Form A4"
                >
                  <Printer size={14} />
                </Link>

                <Link
                  to={ROUTES.DATA_REVISION_EDIT(row.fdId)}
                  className="p-1.5 rounded text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors"
                  title="Edit Form"
                >
                  <Edit size={14} />
                </Link>

                <button
                  type="button"
                  onClick={() => onDelete(row.fdId)}
                  className="p-1.5 rounded text-[var(--color-secondary)] hover:text-rose-500 transition-colors cursor-pointer"
                  title="Hapus Form"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
