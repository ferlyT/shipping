import { Link } from 'react-router-dom'
import {
  Printer,
  Edit,
  Trash2,
  Ban,
  RotateCcw,
  CheckCircle2,
  FileText,
  Eye,
} from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import type { DataRevision } from '../types/data-revisions.types'
import RevisionStatusBadge from './RevisionStatusBadge'

interface RevisionTableProps {
  data: DataRevision[]
  onView: (id: number) => void
  onExecuteCancel: (id: number) => void
  onRevertCancel: (id: number) => void
  onDelete: (id: number) => void
  isExecuting?: boolean
}

export default function RevisionTable({
  data = [],
  onView,
  onExecuteCancel,
  onRevertCancel,
  onDelete,
  isExecuting = false,
}: RevisionTableProps) {
  if (data.length === 0) {
    return (
      <div className="p-12 text-center text-[var(--color-secondary)] text-xs space-y-2">
        <FileText size={32} className="mx-auto text-[var(--color-secondary)]/40" />
        <p>Tidak ada data form input &amp; revisi yang ditemukan.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-hover)]">
            <th className="py-3 px-3.5 font-semibold text-[var(--color-secondary)] uppercase text-[0.68rem] tracking-wider">
              No. Form
            </th>
            <th className="py-3 px-3 font-semibold text-[var(--color-secondary)] uppercase text-[0.68rem] tracking-wider">
              Tanggal
            </th>
            <th className="py-3 px-3 font-semibold text-[var(--color-secondary)] uppercase text-[0.68rem] tracking-wider">
              Kategori
            </th>
            <th className="py-3 px-3 font-semibold text-[var(--color-secondary)] uppercase text-[0.68rem] tracking-wider">
              Target Aksi
            </th>
            <th className="py-3 px-3 font-semibold text-[var(--color-secondary)] uppercase text-[0.68rem] tracking-wider">
              Status Sistem
            </th>
            <th className="py-3 px-3 font-semibold text-[var(--color-secondary)] uppercase text-[0.68rem] tracking-wider">
              Customer &amp; Rincian
            </th>
            <th className="py-3 px-3 font-semibold text-[var(--color-secondary)] uppercase text-[0.68rem] tracking-wider">
              No. Inputan (SPBL)
            </th>
            <th className="py-3 px-3 font-semibold text-[var(--color-secondary)] uppercase text-[0.68rem] tracking-wider">
              Dibuat Oleh
            </th>
            <th className="py-3 px-3.5 font-semibold text-[var(--color-secondary)] uppercase text-[0.68rem] tracking-wider text-right">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {data.map((row) => {
            const firstDetail = row.details?.[0]
            const custName = firstDetail?.fdBaruCustName || firstDetail?.fdAwalCustName || '—'
            const custCode = firstDetail?.fdBaruCustCode || firstDetail?.fdAwalCustCode
            const inputan = firstDetail?.fdBaruNoInputan || firstDetail?.fdAwalNoInputan || '—'
            const dateFormatted = row.fdTanggal ? row.fdTanggal.split('T')[0] : '—'

            return (
              <tr
                key={row.fdId}
                className="hover:bg-[var(--color-surface-hover)] transition-colors group"
              >
                {/* No. Form */}
                <td className="py-3 px-3.5 font-mono font-bold text-[var(--color-primary)]">
                  <button
                    type="button"
                    onClick={() => onView(row.fdId)}
                    className="hover:text-[var(--color-primary)] transition-colors inline-flex items-center gap-1.5 cursor-pointer text-left font-mono font-bold"
                    title="Lihat Detail Formulir & Galeri Lampiran"
                  >
                    {row.fdNomorForm}
                  </button>
                </td>

                {/* Tanggal */}
                <td className="py-3 px-3 text-[var(--color-secondary)] font-mono text-[0.7rem] whitespace-nowrap">
                  {dateFormatted}
                </td>

                {/* Kategori / Tipe Data */}
                <td className="py-3 px-3">
                  <span className="inline-flex px-2 py-0.5 rounded text-[0.68rem] font-bold border border-[var(--color-border)] bg-[var(--color-surface-hover)] text-[var(--color-primary)] whitespace-nowrap">
                    {row.fdTipeData}
                  </span>
                </td>

                {/* Target Aksi */}
                <td className="py-3 px-3">
                  {row.fdAksi === 'CANCEL_DATA' ? (
                    <span className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-rose-500 whitespace-nowrap">
                      <Ban size={12} /> Cancel Data
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-emerald-500 whitespace-nowrap">
                      <CheckCircle2 size={12} /> Buat Bill
                    </span>
                  )}
                </td>

                {/* Status Sistem */}
                <td className="py-3 px-3">
                  <RevisionStatusBadge
                    status={row.fdStatus}
                    matchedInvNo={row.fdMatchedInvNo}
                  />
                </td>

                {/* Customer & Rincian */}
                <td className="py-3 px-3 max-w-[220px]">
                  <div className="truncate">
                    <span className="font-semibold text-[var(--color-primary)]">{custName}</span>
                    {custCode && (
                      <span className="font-mono text-[var(--color-secondary)] ml-1">
                        ({custCode})
                      </span>
                    )}
                  </div>
                  {row.details && row.details.length > 1 && (
                    <span className="text-[0.65rem] text-[var(--color-primary)] font-medium">
                      +{row.details.length - 1} baris lainnya
                    </span>
                  )}
                </td>

                {/* No. Inputan (SPBL) */}
                <td className="py-3 px-3 font-mono font-bold text-[var(--color-primary)]">
                  {inputan}
                </td>

                {/* Dibuat Oleh */}
                <td className="py-3 px-3 text-[var(--color-secondary)] truncate max-w-[120px]">
                  {row.fdDibuatOleh || '—'}
                </td>

                {/* Aksi Button */}
                <td className="py-3 px-3.5 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5">
                    {/* Tombol Eksekusi Cancel jika aksi = CANCEL_DATA */}
                    {row.fdAksi === 'CANCEL_DATA' && row.fdStatus === 'PENDING' && (
                      <button
                        type="button"
                        onClick={() => onExecuteCancel(row.fdId)}
                        disabled={isExecuting}
                        className="btn btn-secondary text-[0.68rem] py-1 px-2.5 inline-flex items-center gap-1 border-rose-500/40 text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        title="Eksekusi pembatalan inputan (Set fdCancel = 1 di tbEntryList)"
                      >
                        <Ban size={12} />
                        Cancel Data
                      </button>
                    )}

                    {/* Tombol Revert Cancel jika status DATA_CANCELLED */}
                    {row.fdAksi === 'CANCEL_DATA' && row.fdStatus === 'DATA_CANCELLED' && (
                      <button
                        type="button"
                        onClick={() => onRevertCancel(row.fdId)}
                        disabled={isExecuting}
                        className="btn btn-secondary text-[0.68rem] py-1 px-2 inline-flex items-center gap-1 text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
                        title="Kembalikan status cancel (Set fdCancel = 0)"
                      >
                        <RotateCcw size={12} />
                        Revert
                      </button>
                    )}

                    {/* Tombol Lihat Detail & Galeri */}
                    <button
                      type="button"
                      onClick={() => onView(row.fdId)}
                      className="p-1.5 rounded-md text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors cursor-pointer"
                      title="Lihat Detail Form & Galeri Lampiran"
                    >
                      <Eye size={15} />
                    </button>

                    {/* Tombol Cetak Form A4 */}
                    <Link
                      to={ROUTES.DATA_REVISION_PRINT(row.fdId)}
                      className="p-1.5 rounded-md text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors"
                      title="Cetak Form Fisik (A4)"
                    >
                      <Printer size={15} />
                    </Link>

                    {/* Tombol Edit */}
                    <Link
                      to={ROUTES.DATA_REVISION_EDIT(row.fdId)}
                      className="p-1.5 rounded-md text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
                      title="Edit Dokumen"
                    >
                      <Edit size={14} />
                    </Link>

                    {/* Tombol Hapus */}
                    <button
                      type="button"
                      onClick={() => onDelete(row.fdId)}
                      className="p-1.5 rounded-md text-[var(--color-secondary)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Hapus Dokumen"
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
  )
}
