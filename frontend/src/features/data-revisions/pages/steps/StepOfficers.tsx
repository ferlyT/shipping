import { useState } from 'react'
import {
  FileText,
  User,
  Calendar,
  Ban,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { RevisionAction, RevisionType } from '../../types/data-revisions.types'

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

interface StepOfficersProps {
  form: FormState
  onChange: (field: keyof FormState, value: any) => void
  onGenerateNextNumber?: () => void
  isGeneratingNumber?: boolean
  canEdit?: boolean
}

export default function StepOfficers({
  form,
  onChange,
  onGenerateNextNumber,
  isGeneratingNumber = false,
  canEdit = true,
}: StepOfficersProps) {
  // Accordion penanggung jawab tertutup secara default
  const [showOfficers, setShowOfficers] = useState(false)

  return (
    <div className="space-y-6">
      {/* 1. Target Aksi & Identitas Form Card */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs rounded-2xl p-5 sm:p-7 space-y-6">
        <div>
          <h2 className="text-base font-bold text-[var(--color-primary)] flex items-center gap-2.5">
            <FileText size={18} className="text-[var(--color-primary)]" />
            Identitas Form &amp; Target Aksi
          </h2>
          <p className="text-xs text-[var(--color-secondary)] mt-1">
            Pilih target aksi sistem, kategori pengajuan formulir, dan nomor dokumen.
          </p>
        </div>

        {/* 1.A. Target Aksi Sistem (DEFAULT: BUAT_BILL) */}
        <div>
          <label className="block text-[0.72rem] font-bold uppercase tracking-wider text-[var(--color-secondary)] mb-2.5">
            Target Aksi Sistem <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Opsi BUAT_BILL (Diletakkan Pertama & Default) */}
            <label
              className={`flex items-start gap-3.5 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                form.fdAksi === 'BUAT_BILL'
                  ? 'border-emerald-500 bg-emerald-500/10 shadow-sm ring-2 ring-emerald-500/20'
                  : 'border-[var(--color-border)] hover:border-[var(--color-border)] bg-[var(--color-surface)]'
              }`}
            >
              <input
                type="radio"
                name="fdAksi"
                value="BUAT_BILL"
                checked={form.fdAksi === 'BUAT_BILL'}
                onChange={() => onChange('fdAksi', 'BUAT_BILL')}
                className="mt-1 text-emerald-500 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                disabled={!canEdit}
              />
              <div className="space-y-1">
                <span className="text-sm font-bold text-[var(--color-primary)] flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  Buat Bill (Default • Auto-Detect Billing)
                </span>
                <p className="text-xs text-[var(--color-secondary)] leading-relaxed">
                  Pengajuan pembuatan tagihan baru. Sistem otomatis memantau <code className="font-mono text-emerald-500">tbBilling</code> dan mengupdate status menjadi <strong>Bill Terbuat</strong> saat invoice terbit.
                </p>
              </div>
            </label>

            {/* Opsi CANCEL_DATA */}
            <label
              className={`flex items-start gap-3.5 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                form.fdAksi === 'CANCEL_DATA'
                  ? 'border-rose-500 bg-rose-500/10 shadow-sm ring-2 ring-rose-500/20'
                  : 'border-[var(--color-border)] hover:border-[var(--color-border)] bg-[var(--color-surface)]'
              }`}
            >
              <input
                type="radio"
                name="fdAksi"
                value="CANCEL_DATA"
                checked={form.fdAksi === 'CANCEL_DATA'}
                onChange={() => {
                  onChange('fdAksi', 'CANCEL_DATA')
                  onChange('fdTipeData', 'REVISI')
                }}
                className="mt-1 text-rose-500 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                disabled={!canEdit}
              />
              <div className="space-y-1">
                <span className="text-sm font-bold text-[var(--color-primary)] flex items-center gap-1.5">
                  <Ban size={16} className="text-rose-500" />
                  Cancel Data (Set fdCancel = 1)
                </span>
                <p className="text-xs text-[var(--color-secondary)] leading-relaxed">
                  Membatalkan nomor inputan lama di sistem <code className="font-mono text-rose-400">tbEntryList</code> melalui tombol eksekusi cancel.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* 1.B. Tipe Data (Hanya jika BUKAN CANCEL_DATA) */}
        {form.fdAksi !== 'CANCEL_DATA' ? (
          <div>
            <label className="block text-[0.72rem] font-bold uppercase tracking-wider text-[var(--color-secondary)] mb-2.5">
              Kategori Tipe Data <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'REVISI', label: 'REVISI', desc: 'Perbaikan / koreksi data eksisting' },
                { id: 'INPUT_BARU', label: 'INPUT BARU', desc: 'Barang luar list / datang partial' },
                { id: 'INPUT_LOCAL_CHARGES', label: 'INPUT LOCAL CHARGES', desc: 'Biaya kirim / charges lokal' },
              ].map((t) => (
                <label
                  key={t.id}
                  className={`p-3.5 rounded-xl border-2 text-left cursor-pointer transition-all ${
                    form.fdTipeData === t.id
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/30 shadow-xs'
                      : 'border-[var(--color-border)] hover:border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-secondary)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="fdTipeData"
                      value={t.id}
                      checked={form.fdTipeData === t.id}
                      onChange={() => onChange('fdTipeData', t.id as RevisionType)}
                      className="text-[var(--color-primary)] focus:ring-[var(--color-primary)] w-4 h-4 cursor-pointer"
                      disabled={!canEdit}
                    />
                    <span className="text-xs sm:text-sm font-bold">{t.label}</span>
                  </div>
                  <p className="text-[0.7rem] text-[var(--color-secondary)] mt-1 ml-6 leading-tight">
                    {t.desc}
                  </p>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 text-xs text-[var(--color-secondary)] flex items-center gap-2.5">
            <Ban size={15} className="text-rose-500 shrink-0" />
            <span>Mode Pembatalan Data: Kategori tipe data tidak diperlukan karena formulir ini ditujukan khusus untuk pembatalan nomor inputan (<code className="font-mono text-rose-500 font-bold">fdCancel = 1</code>).</span>
          </div>
        )}

        {/* 1.C. Nomor Form & Tanggal Input Redesigned */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
          {/* Nomor Form */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[0.72rem] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
                No. Form <span className="text-rose-500">*</span>
              </label>
              {onGenerateNextNumber && canEdit && (
                <button
                  type="button"
                  onClick={onGenerateNextNumber}
                  disabled={isGeneratingNumber}
                  className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Sparkles size={13} />
                  {isGeneratingNumber ? 'Membuat...' : 'Auto-Generate Nomor'}
                </button>
              )}
            </div>
            <input
              type="text"
              value={form.fdNomorForm}
              onChange={(e) => onChange('fdNomorForm', e.target.value)}
              placeholder="Contoh: 001/07/2026"
              className="form-input text-sm font-mono font-bold py-2.5 px-3.5 w-full rounded-xl border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 bg-[var(--color-surface)] shadow-xs"
              disabled={!canEdit}
              required
            />
            <p className="text-[0.68rem] text-[var(--color-secondary)] mt-1">
              Nomor urut resmi dengan format <code className="font-mono">NNN/MM/YYYY</code>.
            </p>
          </div>

          {/* Tanggal */}
          <div>
            <label className="block text-[0.72rem] font-bold uppercase tracking-wider text-[var(--color-secondary)] mb-1.5">
              Tanggal Formulir <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={form.fdTanggal ? form.fdTanggal.split('T')[0] : ''}
                onChange={(e) => onChange('fdTanggal', e.target.value)}
                className="form-input text-sm font-medium py-2.5 pl-10 pr-3.5 w-full rounded-xl border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 bg-[var(--color-surface)] shadow-xs"
                disabled={!canEdit}
                required
              />
              <Calendar
                size={16}
                className="absolute left-3.5 top-3 text-[var(--color-secondary)] pointer-events-none"
              />
            </div>
            <p className="text-[0.68rem] text-[var(--color-secondary)] mt-1">
              Tanggal registrasi pengajuan data ke sistem.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Accordion Penanggung Jawab / Tanda Tangan (Opsional & Default Tertutup) */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowOfficers(!showOfficers)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-[var(--color-surface-hover)] transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--color-surface-hover)] text-[var(--color-secondary)]">
              <User size={16} />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-[var(--color-primary)]">
                Tanda Tangan / Penanggung Jawab Form{' '}
                <span className="text-xs font-normal text-[var(--color-secondary)]">(Opsional)</span>
              </p>
              <p className="text-[0.68rem] text-[var(--color-secondary)]">
                {showOfficers
                  ? 'Klik untuk menyembunyikan kolom PIC'
                  : 'Sementara tidak diperlukan. Klik untuk membuka jika ingin mengisi nama tanda tangan fisik.'}
              </p>
            </div>
          </div>
          <div className="p-1 rounded text-[var(--color-secondary)]">
            {showOfficers ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>

        {showOfficers && (
          <div className="px-5 pb-5 pt-2 border-t border-[var(--color-border)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-150">
            {/* Dibuat Oleh */}
            <div>
              <label className="block text-[0.7rem] font-semibold uppercase text-[var(--color-secondary)] mb-1">
                Dibuat Oleh (Shipping / CSO)
              </label>
              <input
                type="text"
                value={form.fdDibuatOleh || ''}
                onChange={(e) => onChange('fdDibuatOleh', e.target.value)}
                placeholder="Nama pembuat form..."
                className="form-input text-sm py-2 px-3 w-full rounded-xl"
                disabled={!canEdit}
              />
            </div>

            {/* Stuffing */}
            <div>
              <label className="block text-[0.7rem] font-semibold uppercase text-[var(--color-secondary)] mb-1">
                Stuffing (Warehouse)
              </label>
              <input
                type="text"
                value={form.fdStuffing || ''}
                onChange={(e) => onChange('fdStuffing', e.target.value)}
                placeholder="Nama petugas stuffing..."
                className="form-input text-sm py-2 px-3 w-full rounded-xl"
                disabled={!canEdit}
              />
            </div>

            {/* Billing */}
            <div>
              <label className="block text-[0.7rem] font-semibold uppercase text-[var(--color-secondary)] mb-1">
                Billing (Invoicing)
              </label>
              <input
                type="text"
                value={form.fdBilling || ''}
                onChange={(e) => onChange('fdBilling', e.target.value)}
                placeholder="Nama petugas billing..."
                className="form-input text-sm py-2 px-3 w-full rounded-xl"
                disabled={!canEdit}
              />
            </div>

            {/* AR */}
            <div>
              <label className="block text-[0.7rem] font-semibold uppercase text-[var(--color-secondary)] mb-1">
                AR (Finance)
              </label>
              <input
                type="text"
                value={form.fdAR || ''}
                onChange={(e) => onChange('fdAR', e.target.value)}
                placeholder="Nama petugas AR..."
                className="form-input text-sm py-2 px-3 w-full rounded-xl"
                disabled={!canEdit}
              />
            </div>

            {/* Diketahui */}
            <div>
              <label className="block text-[0.7rem] font-semibold uppercase text-[var(--color-secondary)] mb-1">
                Diketahui (Manager / Head)
              </label>
              <input
                type="text"
                value={form.fdDiketahui || ''}
                onChange={(e) => onChange('fdDiketahui', e.target.value)}
                placeholder="Nama pimpinan..."
                className="form-input text-sm py-2 px-3 w-full rounded-xl"
                disabled={!canEdit}
              />
            </div>

            {/* Catatan Tambahan */}
            <div>
              <label className="block text-[0.7rem] font-semibold uppercase text-[var(--color-secondary)] mb-1">
                Catatan Tambahan
              </label>
              <input
                type="text"
                value={form.fdCatatan || ''}
                onChange={(e) => onChange('fdCatatan', e.target.value)}
                placeholder="Catatan formulir..."
                className="form-input text-sm py-2 px-3 w-full rounded-xl"
                disabled={!canEdit}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
