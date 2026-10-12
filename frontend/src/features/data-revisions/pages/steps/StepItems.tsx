import { useState } from 'react'
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  Layers,
  Ban,
  CheckCircle2,
} from 'lucide-react'
import type {
  RevisionDetailItem,
  RevisionType,
  RevisionAction,
} from '../../types/data-revisions.types'
import CustomerLookupModal from '../../components/CustomerLookupModal'
import InputanLookupModal from '../../components/InputanLookupModal'

interface StepItemsProps {
  details: RevisionDetailItem[]
  tipeData: RevisionType
  aksi: RevisionAction
  onUpdate: (index: number, field: keyof RevisionDetailItem, value: any) => void
  onUpdateMultiple: (index: number, data: Partial<RevisionDetailItem>) => void
  onAdd: () => void
  onRemove: (index: number) => void
  canEdit?: boolean
}

export default function StepItems({
  details,
  tipeData,
  aksi,
  onUpdate,
  onUpdateMultiple,
  onAdd,
  onRemove,
  canEdit = true,
}: StepItemsProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(
    () => new Set(details.map((_, i) => i))
  )

  // Modals state
  const [activeCustomerLookup, setActiveCustomerLookup] = useState<{
    rowIndex: number
    target: 'awal' | 'baru'
  } | null>(null)

  const [activeInputanLookup, setActiveInputanLookup] = useState<{
    rowIndex: number
    target: 'awal' | 'baru'
  } | null>(null)

  const toggleRow = (index: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const isRowValid = (d: RevisionDetailItem) => {
    if (aksi === 'CANCEL_DATA') {
      return Boolean(d.fdAwalNoInputan?.trim())
    }
    if (tipeData === 'REVISI') {
      return (
        (Boolean(d.fdAwalCustCode) || Boolean(d.fdAwalNoInputan)) &&
        (Boolean(d.fdBaruCustCode) || Boolean(d.fdBaruDetail))
      )
    }
    return Boolean(d.fdBaruCustCode) || Boolean(d.fdBaruDetail) || Boolean(d.fdBaruNoInputan)
  }

  const completedCount = details.filter(isRowValid).length

  return (
    <div className="space-y-6">
      {/* Target Action Alert Context Banner */}
      {aksi === 'CANCEL_DATA' ? (
        <div className="p-4 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 flex items-start gap-3.5 animate-in fade-in">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-500 shrink-0 mt-0.5">
            <Ban size={20} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-rose-500 flex items-center gap-2">
              Target Pembatalan: Masukkan fdListCode pada kolom DATA AWAL
            </h4>
            <p className="text-xs text-[var(--color-primary)]/80 leading-relaxed">
              Dokumen ini bertarget <strong>Cancel Data</strong>. Masukkan nomor inputan (<code className="font-mono font-bold text-rose-500">fdListCode</code>) yang ingin dibatalkan pada box <strong>DATA AWAL</strong> di bawah. Saat aksi dieksekusi, sistem akan mengubah <code className="font-mono font-bold text-rose-500">fdCancel = 1</code> di database <code className="font-mono">tbEntryList</code> untuk nomor tersebut.
            </p>
            <p className="text-[0.72rem] text-rose-400 font-semibold flex items-center gap-1.5 pt-1">
              <span>🔒 <strong>Proteksi Sistem:</strong> Nomor inputan yang sudah memiliki faktur/bill aktif di <code className="font-mono">tbBilling</code> atau barangnya sudah diserahkan (<code className="font-mono">fdGive = 1</code> di <code className="font-mono">tbDelivery</code>) terkunci otomatis dan tidak dapat dibatalkan.</span>
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/20 flex items-start gap-3.5 animate-in fade-in">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-500 shrink-0 mt-0.5">
            <CheckCircle2 size={20} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-emerald-500 flex items-center gap-2">
              Target Pembuatan Bill: Masukkan Spesifikasi Data Baru
            </h4>
            <p className="text-xs text-[var(--color-primary)]/80 leading-relaxed">
              Isi data pada kolom <strong>DATA BARU</strong>. Sistem akan otomatis memindai <code className="font-mono">tbBilling</code> berdasarkan nomor inputan (<code className="font-mono font-bold text-emerald-500">fdListCode</code>) yang diajukan dan mengubah status menjadi <strong>Bill Terbuat</strong> saat invoice diterbitkan.
            </p>
          </div>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[var(--color-primary)] flex items-center gap-2">
            <Layers size={18} className="text-[var(--color-primary)]" />
            Rincian Perubahan Data (Data Awal vs Data Baru)
          </h2>
          <p className="text-xs text-[var(--color-secondary)] mt-0.5">
            {tipeData === 'REVISI'
              ? 'Bandingkan data awal eksisting dengan target perubahan data baru.'
              : 'Isi detail data baru yang diajukan ke sistem penagihan.'}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span
            className={`text-xs px-3 py-1.5 rounded-full border font-mono ${
              completedCount === details.length && details.length > 0
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-bold'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-500 font-semibold'
            }`}
          >
            {completedCount} / {details.length} baris lengkap
          </span>

          {canEdit && (
            <button
              type="button"
              onClick={() => {
                onAdd()
                setExpandedRows((prev) => new Set([...prev, details.length]))
              }}
              className="btn btn-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5 cursor-pointer shadow-sm rounded-xl"
            >
              <Plus size={15} /> Tambah Baris
            </button>
          )}
        </div>
      </div>

      {/* Row list */}
      <div className="space-y-5">
        {details.map((item, index) => {
          const isExpanded = expandedRows.has(index)
          const valid = isRowValid(item)

          return (
            <div
              key={index}
              className={`border-2 rounded-2xl transition-all duration-200 overflow-hidden shadow-xs ${
                aksi === 'CANCEL_DATA' && !item.fdAwalNoInputan?.trim()
                  ? 'border-rose-400 bg-rose-500/5'
                  : valid
                  ? 'border-[var(--color-border)] bg-[var(--color-surface)]'
                  : 'border-amber-500/40 bg-amber-500/5'
              }`}
            >
              {/* Row header accordion toggle */}
              <div
                className="px-5 py-3.5 bg-[var(--color-surface-hover)] border-b border-[var(--color-border)] flex items-center justify-between gap-3 cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors"
                onClick={() => toggleRow(index)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-mono font-bold shrink-0">
                    #{index + 1}
                  </span>
                  <div className="text-xs sm:text-sm truncate">
                    <span className="font-bold text-[var(--color-primary)]">
                      {item.fdBaruCustName || item.fdAwalCustName || `Baris Perubahan #${index + 1}`}
                    </span>
                    {(item.fdAwalNoInputan || item.fdBaruNoInputan) && (
                      <span className="text-[var(--color-secondary)] font-mono ml-2 font-semibold">
                        [fdListCode: {item.fdAwalNoInputan || item.fdBaruNoInputan}]
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canEdit && details.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`Hapus baris perubahan #${index + 1}?`)) {
                          onRemove(index)
                        }
                      }}
                      className="p-1.5 rounded-lg text-[var(--color-secondary)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Hapus baris ini"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="p-1.5 rounded-lg text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                  >
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>

              {/* Row Content Body */}
              {isExpanded && (
                <div className="p-5 sm:p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* SISI KIRI: DATA AWAL */}
                    <div
                      className={`p-5 rounded-2xl border-2 space-y-4 ${
                        aksi === 'CANCEL_DATA'
                          ? 'border-rose-500/50 bg-rose-500/5 ring-1 ring-rose-500/20'
                          : tipeData !== 'REVISI'
                          ? 'opacity-60 bg-[var(--color-surface-hover)] border-dashed border-[var(--color-border)]'
                          : 'bg-[var(--color-surface)] border-[var(--color-border)]'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                        <div>
                          <span
                            className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                              aksi === 'CANCEL_DATA' ? 'text-rose-500' : 'text-[var(--color-secondary)]'
                            }`}
                          >
                            Data Awal {tipeData !== 'REVISI' && aksi !== 'CANCEL_DATA' ? '(Opsional)' : ''}
                          </span>
                          {aksi === 'CANCEL_DATA' && (
                            <p className="text-[0.68rem] text-rose-500 font-semibold mt-0.5">
                              ⚠️ Kolom target pembatalan (fdListCode)
                            </p>
                          )}
                        </div>

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveInputanLookup({ rowIndex: index, target: 'awal' })
                            }
                            className="btn btn-secondary text-xs py-1.5 px-2.5 inline-flex items-center gap-1 border-[var(--color-primary)]/40 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 cursor-pointer rounded-lg"
                          >
                            <Search size={13} /> Cari fdListCode
                          </button>
                        )}
                      </div>

                      {/* No. Inputan (fdListCode Target Cancel) — DITONJOLKAN DI ATAS JIKA CANCEL */}
                      <div
                        className={`p-3 rounded-xl border ${
                          aksi === 'CANCEL_DATA'
                            ? 'border-rose-500 bg-rose-500/10 shadow-xs'
                            : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[0.72rem] font-bold uppercase tracking-wide text-[var(--color-primary)]">
                            No. Inputan (fdListCode Target Cancel){' '}
                            {aksi === 'CANCEL_DATA' && <span className="text-rose-500">* (Wajib)</span>}
                          </label>
                          {aksi === 'CANCEL_DATA' && (
                            <span className="text-[0.65rem] font-bold uppercase px-2 py-0.5 rounded bg-rose-500 text-white font-mono">
                              Set fdCancel = 1
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={item.fdAwalNoInputan || ''}
                          onChange={(e) => onUpdate(index, 'fdAwalNoInputan', e.target.value)}
                          placeholder="Masukkan fdListCode yang akan di-cancel (contoh: 0924697)..."
                          className="form-input text-sm font-mono font-bold py-2.5 px-3.5 w-full rounded-xl border-[var(--color-border)] focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-[var(--color-surface)]"
                          disabled={!canEdit || (tipeData !== 'REVISI' && aksi !== 'CANCEL_DATA')}
                        />
                        <p className="text-[0.68rem] text-[var(--color-secondary)] mt-1">
                          Nomor inputan 7 digit dari manifest gudang / FoxPro.
                        </p>
                      </div>

                      {/* Customer Code & Name */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[0.7rem] font-bold uppercase text-[var(--color-secondary)]">
                            Customer Awal
                          </label>
                          {canEdit && (tipeData === 'REVISI' || aksi === 'CANCEL_DATA') && (
                            <button
                              type="button"
                              onClick={() =>
                                setActiveCustomerLookup({ rowIndex: index, target: 'awal' })
                              }
                              className="text-[0.7rem] text-[var(--color-primary)] hover:underline font-semibold cursor-pointer"
                            >
                              Pilih Master Customer
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2.5">
                          <input
                            type="text"
                            value={item.fdAwalCustCode || ''}
                            onChange={(e) => onUpdate(index, 'fdAwalCustCode', e.target.value)}
                            placeholder="Kode..."
                            className="form-input text-sm font-mono font-bold py-2.5 px-3 rounded-xl col-span-1"
                            disabled={!canEdit || (tipeData !== 'REVISI' && aksi !== 'CANCEL_DATA')}
                          />
                          <input
                            type="text"
                            value={item.fdAwalCustName || ''}
                            onChange={(e) => onUpdate(index, 'fdAwalCustName', e.target.value)}
                            placeholder="Nama Pelanggan Awal..."
                            className="form-input text-sm font-medium py-2.5 px-3 rounded-xl col-span-2"
                            disabled={!canEdit || (tipeData !== 'REVISI' && aksi !== 'CANCEL_DATA')}
                          />
                        </div>
                      </div>

                      {/* SP Mark / No. Resi */}
                      <div>
                        <label className="block text-[0.7rem] font-bold uppercase text-[var(--color-secondary)] mb-1.5">
                          SP Mark / No. Resi Awal
                        </label>
                        <input
                          type="text"
                          value={item.fdAwalSpMark || ''}
                          onChange={(e) => onUpdate(index, 'fdAwalSpMark', e.target.value)}
                          placeholder="Contoh: 26GZA01 / GZ-000000"
                          className="form-input text-sm py-2.5 px-3.5 w-full rounded-xl"
                          disabled={!canEdit || (tipeData !== 'REVISI' && aksi !== 'CANCEL_DATA')}
                        />
                      </div>

                      {/* No. Billing & Qty/Vol/Wgt */}
                      <div className="grid grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-[0.7rem] font-bold uppercase text-[var(--color-secondary)] mb-1.5">
                            No. Billing Awal
                          </label>
                          <input
                            type="text"
                            value={item.fdAwalNoBilling || ''}
                            onChange={(e) => onUpdate(index, 'fdAwalNoBilling', e.target.value)}
                            placeholder="GZS-001234-07-2026..."
                            className="form-input text-sm font-mono py-2.5 px-3 rounded-xl w-full"
                            disabled={!canEdit || (tipeData !== 'REVISI' && aksi !== 'CANCEL_DATA')}
                          />
                        </div>
                        <div>
                          <label className="block text-[0.7rem] font-bold uppercase text-[var(--color-secondary)] mb-1.5">
                            Qty / Vol / Wgt Awal
                          </label>
                          <input
                            type="text"
                            value={item.fdAwalQtyVolWgt || ''}
                            onChange={(e) => onUpdate(index, 'fdAwalQtyVolWgt', e.target.value)}
                            placeholder="1 Colly / 0.12 m3 / 8 kg"
                            className="form-input text-sm py-2.5 px-3 rounded-xl w-full"
                            disabled={!canEdit || (tipeData !== 'REVISI' && aksi !== 'CANCEL_DATA')}
                          />
                        </div>
                      </div>

                      {/* Detail Keterangan Awal */}
                      <div>
                        <label className="block text-[0.7rem] font-bold uppercase text-[var(--color-secondary)] mb-1.5">
                          Alasan / Keterangan Awal
                        </label>
                        <textarea
                          rows={2}
                          value={item.fdAwalDetail || ''}
                          onChange={(e) => onUpdate(index, 'fdAwalDetail', e.target.value)}
                          placeholder="Alasan pembatalan atau perubahan data..."
                          className="form-input text-sm py-2.5 px-3.5 w-full rounded-xl"
                          disabled={!canEdit || (tipeData !== 'REVISI' && aksi !== 'CANCEL_DATA')}
                        />
                      </div>
                    </div>

                    {/* SISI KANAN: DATA BARU */}
                    <div className="p-5 rounded-2xl border-2 border-[var(--color-primary)]/30 bg-[var(--color-surface)] shadow-xs space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1.5">
                          Data Baru {aksi === 'BUAT_BILL' ? '(Target Penagihan)' : ''}
                        </span>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveInputanLookup({ rowIndex: index, target: 'baru' })
                            }
                            className="btn btn-secondary text-xs py-1.5 px-2.5 inline-flex items-center gap-1 border-[var(--color-primary)]/40 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 cursor-pointer rounded-lg"
                          >
                            <Search size={13} /> Cari fdListCode
                          </button>
                        )}
                      </div>

                      {/* No. Inputan (fdListCode Target Bill) */}
                      <div>
                        <label className="block text-[0.7rem] font-bold uppercase text-[var(--color-secondary)] mb-1.5">
                          No. Inputan (fdListCode Target Bill)
                        </label>
                        <input
                          type="text"
                          value={item.fdBaruNoInputan || ''}
                          onChange={(e) => onUpdate(index, 'fdBaruNoInputan', e.target.value)}
                          placeholder="Nomor fdListCode baru untuk penagihan..."
                          className="form-input text-sm font-mono font-bold text-emerald-500 py-2.5 px-3.5 w-full rounded-xl border-[var(--color-border)] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-[var(--color-surface)]"
                          disabled={!canEdit}
                        />
                      </div>

                      {/* Customer Code & Name */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[0.7rem] font-bold uppercase text-[var(--color-secondary)]">
                            Customer Baru
                          </label>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() =>
                                setActiveCustomerLookup({ rowIndex: index, target: 'baru' })
                              }
                              className="text-[0.7rem] text-[var(--color-primary)] hover:underline font-semibold cursor-pointer"
                            >
                              Pilih Master Customer
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2.5">
                          <input
                            type="text"
                            value={item.fdBaruCustCode || ''}
                            onChange={(e) => onUpdate(index, 'fdBaruCustCode', e.target.value)}
                            placeholder="Kode..."
                            className="form-input text-sm font-mono font-bold py-2.5 px-3 rounded-xl col-span-1"
                            disabled={!canEdit}
                          />
                          <input
                            type="text"
                            value={item.fdBaruCustName || ''}
                            onChange={(e) => onUpdate(index, 'fdBaruCustName', e.target.value)}
                            placeholder="Nama Lengkap Customer Baru..."
                            className="form-input text-sm font-medium py-2.5 px-3 rounded-xl col-span-2"
                            disabled={!canEdit}
                          />
                        </div>
                      </div>

                      {/* SP Mark / No. Resi */}
                      <div>
                        <label className="block text-[0.7rem] font-bold uppercase text-[var(--color-secondary)] mb-1.5">
                          SP Mark / No. Resi Baru
                        </label>
                        <input
                          type="text"
                          value={item.fdBaruSpMark || ''}
                          onChange={(e) => onUpdate(index, 'fdBaruSpMark', e.target.value)}
                          placeholder="Contoh: 26GZA01 / GZ-000000"
                          className="form-input text-sm py-2.5 px-3.5 w-full rounded-xl"
                          disabled={!canEdit}
                        />
                      </div>

                      {/* No. Billing & Qty/Vol/Wgt */}
                      <div className="grid grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-[0.7rem] font-bold uppercase text-[var(--color-secondary)] mb-1.5">
                            No. Billing Baru
                          </label>
                          <input
                            type="text"
                            value={item.fdBaruNoBilling || ''}
                            onChange={(e) => onUpdate(index, 'fdBaruNoBilling', e.target.value)}
                            placeholder="GZS-001234-07-2026..."
                            className="form-input text-sm font-mono py-2.5 px-3 rounded-xl w-full"
                            disabled={!canEdit}
                          />
                        </div>
                        <div>
                          <label className="block text-[0.7rem] font-bold uppercase text-[var(--color-secondary)] mb-1.5">
                            Qty / Vol / Wgt Baru
                          </label>
                          <input
                            type="text"
                            value={item.fdBaruQtyVolWgt || ''}
                            onChange={(e) => onUpdate(index, 'fdBaruQtyVolWgt', e.target.value)}
                            placeholder="Contoh: 2 colly / 0.1230 m3 / 12 kgs"
                            className="form-input text-sm py-2.5 px-3 rounded-xl w-full"
                            disabled={!canEdit}
                          />
                        </div>
                      </div>

                      {/* Detail Keterangan Baru */}
                      <div>
                        <label className="block text-[0.7rem] font-bold uppercase text-[var(--color-secondary)] mb-1.5">
                          Detail / Keterangan Perubahan <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={2}
                          value={item.fdBaruDetail || ''}
                          onChange={(e) => onUpdate(index, 'fdBaruDetail', e.target.value)}
                          placeholder="Contoh: Customer request ganti nama; Biaya kirim ke gudang Shipper SGD 200..."
                          className="form-input text-sm py-2.5 px-3.5 w-full rounded-xl"
                          disabled={!canEdit}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Fast Lookup Modals */}
      {activeCustomerLookup && (
        <CustomerLookupModal
          isOpen={true}
          onClose={() => setActiveCustomerLookup(null)}
          onSelect={(c) => {
            const { rowIndex, target } = activeCustomerLookup
            if (target === 'awal') {
              onUpdateMultiple(rowIndex, {
                fdAwalCustCode: c.custCode,
                fdAwalCustName: c.custName,
              })
            } else {
              onUpdateMultiple(rowIndex, {
                fdBaruCustCode: c.custCode,
                fdBaruCustName: c.custName,
              })
            }
          }}
        />
      )}

      {activeInputanLookup && (
        <InputanLookupModal
          isOpen={true}
          onClose={() => setActiveInputanLookup(null)}
          isTargetCancel={activeInputanLookup.target === 'awal' && aksi === 'CANCEL_DATA'}
          title={
            activeInputanLookup.target === 'awal' && aksi === 'CANCEL_DATA'
              ? 'Pilih fdListCode Target Pembatalan (DATA AWAL)'
              : 'Pilih No. Inputan (fdListCode)'
          }
          onSelect={(data) => {
            const { rowIndex, target } = activeInputanLookup
            if (target === 'awal') {
              onUpdateMultiple(rowIndex, {
                fdAwalNoInputan: data.fdNoInputan,
                fdAwalCustCode: data.fdCustCode || undefined,
                fdAwalCustName: data.fdCustName || undefined,
                fdAwalSpMark: data.fdSpMark || undefined,
                fdAwalQtyVolWgt: data.fdQtyVolWgt || undefined,
              })
            } else {
              onUpdateMultiple(rowIndex, {
                fdBaruNoInputan: data.fdNoInputan,
                fdBaruCustCode: data.fdCustCode || undefined,
                fdBaruCustName: data.fdCustName || undefined,
                fdBaruSpMark: data.fdSpMark || undefined,
                fdBaruQtyVolWgt: data.fdQtyVolWgt || undefined,
              })
            }
          }}
        />
      )}
    </div>
  )
}
