import {
  FileText,
  Layers,
  Paperclip,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Calendar,
} from 'lucide-react'
import type {
  RevisionDetailItem,
  RevisionLampiranItem,
  RevisionAction,
  RevisionType,
} from '../../types/data-revisions.types'

interface FormState {
  fdNomorForm: string
  fdTipeData: RevisionType
  fdAksi: RevisionAction
  fdTanggal: string
  fdDibuatOleh?: string | null
  fdStuffing?: string | null
  fdBilling?: string | null
  fdAR?: string | null
  fdDiketahui?: string | null
  fdCatatan?: string | null
}

interface StepReviewProps {
  form: FormState
  details: RevisionDetailItem[]
  lampiran: RevisionLampiranItem[]
  onGoToStep: (step: number) => void
}

export default function StepReview({
  form,
  details,
  lampiran,
  onGoToStep,
}: StepReviewProps) {
  const cancelTargets = details
    .map((d, idx) => ({ no: idx + 1, listCode: d.fdAwalNoInputan?.trim() }))
    .filter((t) => Boolean(t.listCode))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-[var(--color-primary)] flex items-center gap-2">
          <FileText size={16} className="text-[var(--color-primary)]" />
          Review &amp; Konfirmasi Pengajuan
        </h2>
        <p className="text-xs text-[var(--color-secondary)] mt-0.5">
          Periksa kembali seluruh informasi formulir sebelum disimpan ke sistem.
        </p>
      </div>

      {/* Target Action Banner Callout */}
      {form.fdAksi === 'CANCEL_DATA' ? (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 sm:p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-wider">
            <Ban size={16} />
            <span>Target Pembatalan Data Inputan (fdCancel = 1)</span>
          </div>
          <p className="text-xs text-[var(--color-secondary)]">
            Sistem akan mengubah status record <code className="font-mono text-rose-500">tbEntryList.fdCancel = 1</code> untuk seluruh nomor inputan yang dicantumkan pada kolom <strong>DATA AWAL</strong>.
          </p>
          {cancelTargets.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {cancelTargets.map((t) => (
                <div
                  key={t.no}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-[var(--color-surface)] border border-rose-500/40 text-rose-500 shadow-xs"
                >
                  <span className="text-[var(--color-secondary)] text-[0.7rem] uppercase">Baris #{t.no}:</span>
                  <span className="text-[var(--color-primary)] tracking-wide font-black">{t.listCode}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-rose-500/20 text-rose-300 text-xs">
              ⚠️ <strong>Peringatan:</strong> Belum ada No. Inputan (<code className="font-mono font-bold">fdListCode</code>) yang diisi pada <strong>DATA AWAL</strong> untuk dibatalkan. Klik &quot;Ubah Rincian&quot; pada tabel di bawah untuk mengisi nomor inputan yang akan di-cancel.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
          <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-wide">
              Target Aksi: Buat Bill Baru (Default)
            </p>
            <p className="text-xs text-[var(--color-secondary)] leading-relaxed">
              Formulir diajukan untuk penerbitan tagihan baru. Sistem secara otomatis memantau <code className="font-mono text-emerald-500">tbBilling</code> dan memperbarui status formulir menjadi <strong>Bill Terbuat</strong> setelah invoice terbit.
            </p>
          </div>
        </div>
      )}

      {/* 1. Header & Identitas Card */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-[var(--color-primary)]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
              Identitas Form &amp; Target Aksi
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onGoToStep(0)}
            className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft size={12} /> Ubah Identitas
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
          <div>
            <p className="text-[0.68rem] uppercase font-semibold text-[var(--color-secondary)] mb-0.5">
              No. Form
            </p>
            <p className="text-sm font-mono font-bold text-[var(--color-primary)]">
              {form.fdNomorForm || '—'}
            </p>
          </div>
          <div>
            <p className="text-[0.68rem] uppercase font-semibold text-[var(--color-secondary)] mb-0.5">
              Tanggal Form
            </p>
            <p className="text-xs font-medium text-[var(--color-primary)] flex items-center gap-1">
              <Calendar size={13} className="text-[var(--color-secondary)]" />
              {form.fdTanggal ? form.fdTanggal.split('T')[0] : '—'}
            </p>
          </div>
          <div>
            <p className="text-[0.68rem] uppercase font-semibold text-[var(--color-secondary)] mb-0.5">
              Tipe Data
            </p>
            {form.fdAksi === 'CANCEL_DATA' ? (
              <span className="inline-flex px-2 py-0.5 rounded text-[0.72rem] font-bold border border-rose-500/30 bg-rose-500/10 text-rose-500">
                PEMBATALAN DATA
              </span>
            ) : (
              <span className="inline-flex px-2 py-0.5 rounded text-[0.72rem] font-bold border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                {form.fdTipeData}
              </span>
            )}
          </div>
          <div>
            <p className="text-[0.68rem] uppercase font-semibold text-[var(--color-secondary)] mb-0.5">
              Target Aksi
            </p>
            {form.fdAksi === 'CANCEL_DATA' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.72rem] font-bold border border-rose-500/30 bg-rose-500/10 text-rose-500">
                <Ban size={12} /> Cancel Data (fdCancel=1)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.72rem] font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 size={12} /> Buat Bill (Auto-Detect)
              </span>
            )}
          </div>
        </div>

        {/* Officers Grid */}
        <div className="pt-2 border-t border-[var(--color-border)]">
          <p className="text-[0.68rem] uppercase font-semibold text-[var(--color-secondary)] mb-2">
            Penanggung Jawab / Tanda Tangan:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Dibuat Oleh', value: form.fdDibuatOleh },
              { label: 'Stuffing', value: form.fdStuffing },
              { label: 'Billing', value: form.fdBilling },
              { label: 'AR (Finance)', value: form.fdAR },
              { label: 'Diketahui', value: form.fdDiketahui },
            ].map((pic) => (
              <div key={pic.label} className="p-2.5 rounded-lg bg-[var(--color-surface-hover)] border border-[var(--color-border)]">
                <p className="text-[0.65rem] uppercase text-[var(--color-secondary)] font-semibold">
                  {pic.label}
                </p>
                <p className="text-xs font-semibold text-[var(--color-primary)] truncate mt-0.5">
                  {pic.value || <span className="text-[var(--color-secondary)]/50 italic">Belum diisi</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Rincian Perubahan Items Card */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-[var(--color-primary)]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
              Rincian Perubahan Data ({details.length} Baris)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onGoToStep(1)}
            className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft size={12} /> Ubah Rincian
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-hover)]">
                <th className="py-2.5 px-3 font-semibold text-[var(--color-secondary)] uppercase text-[0.68rem] w-10">
                  #
                </th>
                <th className="py-2.5 px-3 font-semibold text-[var(--color-secondary)] uppercase text-[0.68rem] w-1/2">
                  DATA AWAL
                </th>
                <th className="py-2.5 px-3 font-semibold text-[var(--color-primary)] uppercase text-[0.68rem] w-1/2">
                  DATA BARU
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {details.map((d, i) => (
                <tr key={i} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                  <td className="py-3 px-3 align-top font-mono font-bold text-[var(--color-secondary)]">
                    #{i + 1}
                  </td>
                  {/* Data Awal */}
                  <td className="py-3 px-3 align-top space-y-1 bg-[var(--color-surface-hover)]/50">
                    <p className="font-semibold text-[var(--color-primary)]">
                      {d.fdAwalCustName || d.fdAwalCustCode ? (
                        <>
                          {d.fdAwalCustName}{' '}
                          <span className="font-mono text-[var(--color-secondary)]">({d.fdAwalCustCode})</span>
                        </>
                      ) : (
                        <span className="text-[var(--color-secondary)]/60">—</span>
                      )}
                    </p>
                    {d.fdAwalSpMark && (
                      <p className="text-[0.7rem] text-[var(--color-secondary)]">
                        SP/Resi: <span className="font-mono text-[var(--color-primary)]">{d.fdAwalSpMark}</span>
                      </p>
                    )}
                    {d.fdAwalNoBilling && (
                      <p className="text-[0.7rem] text-[var(--color-secondary)]">
                        No. Bill: <span className="font-mono text-[var(--color-primary)]">{d.fdAwalNoBilling}</span>
                      </p>
                    )}
                    {d.fdAwalNoInputan && (
                      <p className="text-[0.7rem] text-rose-500 font-mono font-semibold">
                        Inputan Target Cancel: {d.fdAwalNoInputan}
                      </p>
                    )}
                    {d.fdAwalQtyVolWgt && (
                      <p className="text-[0.7rem] text-[var(--color-secondary)]">
                        Vol: {d.fdAwalQtyVolWgt}
                      </p>
                    )}
                    {d.fdAwalDetail && (
                      <p className="text-[0.7rem] text-[var(--color-secondary)]/90 italic">
                        "{d.fdAwalDetail}"
                      </p>
                    )}
                  </td>

                  {/* Data Baru */}
                  <td className="py-3 px-3 align-top space-y-1 bg-[var(--color-primary)]/5">
                    <p className="font-bold text-[var(--color-primary)]">
                      {d.fdBaruCustName || d.fdBaruCustCode ? (
                        <>
                          {d.fdBaruCustName}{' '}
                          <span className="font-mono text-[var(--color-primary)]">({d.fdBaruCustCode})</span>
                        </>
                      ) : (
                        <span className="text-[var(--color-secondary)]/60">—</span>
                      )}
                    </p>
                    {d.fdBaruSpMark && (
                      <p className="text-[0.7rem] text-[var(--color-secondary)]">
                        SP/Resi: <span className="font-mono text-[var(--color-primary)]">{d.fdBaruSpMark}</span>
                      </p>
                    )}
                    {d.fdBaruNoBilling && (
                      <p className="text-[0.7rem] text-[var(--color-secondary)]">
                        No. Bill: <span className="font-mono text-[var(--color-primary)]">{d.fdBaruNoBilling}</span>
                      </p>
                    )}
                    {d.fdBaruNoInputan && (
                      <p className="text-[0.7rem] text-emerald-500 font-mono font-semibold">
                        Inputan Baru/Target Bill: {d.fdBaruNoInputan}
                      </p>
                    )}
                    {d.fdBaruQtyVolWgt && (
                      <p className="text-[0.7rem] text-[var(--color-secondary)]">
                        Vol: {d.fdBaruQtyVolWgt}
                      </p>
                    )}
                    {d.fdBaruDetail && (
                      <p className="text-[0.72rem] text-[var(--color-primary)] font-medium">
                        "{d.fdBaruDetail}"
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Lampiran Summary Card */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Paperclip size={16} className="text-[var(--color-primary)]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
              Berkas Lampiran ({lampiran.length} File)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onGoToStep(2)}
            className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft size={12} /> Kelola Lampiran
          </button>
        </div>

        {lampiran.length === 0 ? (
          <p className="text-xs text-[var(--color-secondary)]/60 py-2">
            Tidak ada lampiran dokumen fisik yang dilampirkan.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {lampiran.map((f) => (
              <span
                key={f.fdId}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border border-[var(--color-border)] bg-[var(--color-surface-hover)] text-[var(--color-primary)]"
              >
                <Paperclip size={12} className="text-[var(--color-primary)]" />
                <span className="truncate max-w-[200px]">{f.fdNamaFile}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
