import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Ban,
  Clock,
  Receipt,
  User,
  Image as ImageIcon,
  Eye,
  Printer,
  Edit,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { ROUTES } from '@/lib/constants'
import { useDataRevisionDetail } from '../hooks/useDataRevisions'
import RevisionStatusBadge from './RevisionStatusBadge'
import RevisionGalleryModal from './RevisionGalleryModal'
export interface RevisionDetailViewModalProps {
  revisionId: number | null
  isOpen: boolean
  onClose: () => void
  onExecuteCancel?: (id: number) => void
  onRevertCancel?: (id: number) => void
}

export default function RevisionDetailViewModal({
  revisionId,
  isOpen,
  onClose,
  onExecuteCancel,
  onRevertCancel,
}: RevisionDetailViewModalProps) {
  const { data: detailData, isLoading, isError } = useDataRevisionDetail(revisionId ?? undefined)
  const form = detailData?.data

  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0)

  if (!isOpen || !revisionId) return null

  const detailsList = form?.details || []
  const lampiranList = form?.lampiran || []

  const isCancel = form?.fdAksi === 'CANCEL_DATA'
  const isPending = form?.fdStatus === 'PENDING'
  const isCancelled = form?.fdStatus === 'DATA_CANCELLED'
  const isBilled = form?.fdStatus === 'BILL_TERBUAT'

  const openGalleryAt = (idx: number) => {
    setGalleryInitialIndex(idx)
    setGalleryOpen(true)
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="3xl"
        className="h-[88vh] max-h-[88vh] flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl"
        zIndex="z-[100]"
      >
        {/* ── Modal Header Standard ── */}
        <Modal.Header
          icon={<FileText className="w-5 h-5 text-[var(--color-primary)]" />}
          title={
            <div className="flex items-center gap-2 flex-wrap">
              <span>{form?.fdNomorForm || 'Detail Formulir Revisi'}</span>
              {form && (
                <RevisionStatusBadge
                  status={form.fdStatus}
                  matchedInvNo={form.fdMatchedInvNo}
                />
              )}
            </div>
          }
          subtitle={
            <div className="flex items-center gap-2 flex-wrap text-[11px] sm:text-[12px] text-[var(--color-secondary)]">
              <span>Formulir Input &amp; Revisi Data</span>
              {form?.fdTanggal && (
                <>
                  <span>•</span>
                  <span className="font-mono flex items-center gap-1">
                    <Calendar size={11} />
                    {form.fdTanggal.split('T')[0]}
                  </span>
                </>
              )}
              <span>•</span>
              <span className="font-semibold text-[var(--color-primary)]">
                Kategori: {form?.fdTipeData || 'REVISI'}
              </span>
            </div>
          }
          onClose={onClose}
        >
          {form && (
            <div className="flex items-center gap-1.5 mr-1">
              <Link
                to={ROUTES.DATA_REVISION_PRINT(form.fdId)}
                className="btn btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Cetak Dokumen Form A4"
              >
                <Printer size={14} />
                <span className="hidden sm:inline">Cetak A4</span>
              </Link>
              <Link
                to={ROUTES.DATA_REVISION_EDIT(form.fdId)}
                className="btn btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Edit Data Formulir"
              >
                <Edit size={14} />
                <span className="hidden sm:inline">Edit</span>
              </Link>
            </div>
          )}
        </Modal.Header>

        {/* ── Modal Body Content ── */}
        <Modal.Body className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 bg-[var(--color-surface)] space-y-4 font-[var(--font-body)] text-[var(--color-primary)]">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-[var(--color-secondary)] space-y-3">
              <div className="h-6 w-44 mx-auto rounded-lg skeleton-shimmer" />
              <div className="h-24 w-full rounded-xl skeleton-shimmer" />
              <div className="h-32 w-full rounded-xl skeleton-shimmer" />
              <p>Memuat rincian dokumen formulir revisi...</p>
            </div>
          ) : isError || !form ? (
            <div className="py-10 text-center text-rose-500 space-y-2 rounded-xl border border-rose-500/20 bg-rose-500/5">
              <AlertTriangle size={32} className="mx-auto text-rose-500" />
              <p className="text-sm font-bold">Gagal memuat formulir revisi</p>
              <p className="text-xs text-[var(--color-secondary)]">Dokumen mungkin telah dihapus atau tidak ditemukan.</p>
            </div>
          ) : (
            <>
              {/* 1. Baris Status & Aksi Operasional */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)]">
                <div>
                  <span className="text-[0.68rem] text-[var(--color-secondary)] uppercase font-bold tracking-wider block">
                    Target Aksi Dokumen
                  </span>
                  <div className="mt-1 flex items-center gap-1.5">
                    {isCancel ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30">
                        <Ban size={14} /> PEMBATALAN DATA (CANCEL)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                        <CheckCircle2 size={14} /> BUAT BILL PENAGIHAN
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[0.68rem] text-[var(--color-secondary)] uppercase font-bold tracking-wider block">
                    Kategori Tipe Data
                  </span>
                  <span className="mt-1 inline-flex px-2.5 py-1 rounded-lg text-xs font-bold font-mono border border-[var(--color-border)] bg-[var(--color-neutral)] text-[var(--color-primary)]">
                    {form.fdTipeData}
                  </span>
                </div>

                <div>
                  <span className="text-[0.68rem] text-[var(--color-secondary)] uppercase font-bold tracking-wider block">
                    Status Lapangan
                  </span>
                  <div className="mt-1 flex items-center gap-1.5">
                    {isPending ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-500">
                        <Clock size={13} /> Menunggu Proses
                      </span>
                    ) : isCancelled ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-500">
                        <Ban size={13} /> Data Dibatalkan
                      </span>
                    ) : isBilled ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500">
                        <Receipt size={13} /> Bill Telah Terbit
                      </span>
                    ) : (
                      <span className="text-xs font-bold">{form.fdStatus}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Banner Audit Pembatalan / Invoice Match */}
              {isCancel && (
                <div
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    isCancelled
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="font-bold flex items-center gap-1.5">
                      {isCancelled ? (
                        <>
                          <CheckCircle2 size={15} /> Data Telah Dibatalkan (fdCancel = 1)
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={15} /> Menunggu Eksekusi Pembatalan
                        </>
                      )}
                    </p>
                    <p className="text-[0.72rem] text-[var(--color-secondary)]">
                      {isCancelled
                        ? `Dieksekusi oleh ${form.fdExecutedBy || 'Sistem'} pada ${
                            form.fdExecutedAt
                              ? new Date(form.fdExecutedAt).toLocaleString('id-ID')
                              : '-'
                          }.`
                        : 'Nomor inputan belum diubah menjadi fdCancel = 1 di database tbEntryList.'}
                    </p>
                  </div>

                  {/* Tombol aksi eksekusi */}
                  <div className="shrink-0 flex items-center gap-2">
                    {isPending && onExecuteCancel && (
                      <button
                        type="button"
                        onClick={() => onExecuteCancel(form.fdId)}
                        className="btn btn-primary text-xs py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                      >
                        Eksekusi Cancel Sekarang
                      </button>
                    )}
                    {isCancelled && onRevertCancel && (
                      <button
                        type="button"
                        onClick={() => onRevertCancel(form.fdId)}
                        className="btn btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw size={13} />
                        Kembalikan (Revert)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {form.fdMatchedInvNo && (
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between">
                  <div>
                    <p className="font-bold flex items-center gap-1.5">
                      <Receipt size={15} /> Invoice Telah Diterbitkan
                    </p>
                    <p className="text-[0.72rem] text-[var(--color-secondary)]">
                      No. Invoice: <span className="font-mono font-bold text-[var(--color-primary)]">{form.fdMatchedInvNo}</span>
                      {form.fdMatchedInvDate && ` (${form.fdMatchedInvDate.split('T')[0]})`}
                    </p>
                  </div>
                </div>
              )}

              {/* 3. Komparasi Data (Data Awal vs Data Baru) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary)] flex items-center gap-1.5">
                    <Layers size={14} /> Rincian Perubahan Data ({detailsList.length} baris)
                  </h3>
                </div>

                <div className="space-y-3">
                  {detailsList.map((detail, idx) => (
                    <div
                      key={detail.fdId || idx}
                      className="rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)] shadow-xs"
                    >
                      <div className="px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface-hover)] flex items-center justify-between text-xs">
                        <span className="font-bold text-[var(--color-primary)]">
                          Baris #{detail.fdNo || idx + 1}
                        </span>
                        {detail.fdAwalDetail && (
                          <span className="text-[var(--color-secondary)] text-[0.7rem] truncate max-w-sm">
                            Keterangan: {detail.fdAwalDetail}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--color-border)]">
                        {/* Sisi Kiri: DATA AWAL */}
                        <div className="p-3.5 space-y-2 text-xs bg-rose-500/5 dark:bg-rose-950/20">
                          <div className="flex items-center justify-between">
                            <span className="text-[0.68rem] font-bold text-rose-500 uppercase tracking-wider">
                              [ DATA AWAL / ASAL ]
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            <div>
                              <span className="text-[var(--color-secondary)] text-[0.68rem] block">No. Inputan (fdListCode):</span>
                              <span className="font-mono font-bold text-[var(--color-primary)]">
                                {detail.fdAwalNoInputan || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[var(--color-secondary)] text-[0.68rem] block">Pelanggan:</span>
                              <span className="font-semibold text-[var(--color-primary)]">
                                {detail.fdAwalCustName || '—'}{' '}
                                {detail.fdAwalCustCode && (
                                  <span className="font-mono text-[var(--color-secondary)]">({detail.fdAwalCustCode})</span>
                                )}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--color-border)]/50">
                              <div>
                                <span className="text-[var(--color-secondary)] text-[0.68rem] block">Marking:</span>
                                <span className="font-mono font-bold text-[var(--color-primary)]">{detail.fdAwalSpMark || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[var(--color-secondary)] text-[0.68rem] block">Qty / Vol / Wgt:</span>
                                <span className="font-mono text-[var(--color-primary)]">{detail.fdAwalQtyVolWgt || '—'}</span>
                              </div>
                            </div>
                            {detail.fdAwalNoBilling && (
                              <div>
                                <span className="text-[var(--color-secondary)] text-[0.68rem] block">No. Billing Asal:</span>
                                <span className="font-mono text-[var(--color-primary)]">{detail.fdAwalNoBilling}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Sisi Kanan: DATA BARU */}
                        <div className="p-3.5 space-y-2 text-xs bg-emerald-500/5 dark:bg-emerald-950/20">
                          <div className="flex items-center justify-between">
                            <span className="text-[0.68rem] font-bold text-emerald-500 uppercase tracking-wider">
                              [ DATA BARU / TARGET ]
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            <div>
                              <span className="text-[var(--color-secondary)] text-[0.68rem] block">No. Inputan Baru:</span>
                              <span className="font-mono font-bold text-[var(--color-primary)]">
                                {detail.fdBaruNoInputan || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[var(--color-secondary)] text-[0.68rem] block">Pelanggan Baru:</span>
                              <span className="font-semibold text-[var(--color-primary)]">
                                {detail.fdBaruCustName || '—'}{' '}
                                {detail.fdBaruCustCode && (
                                  <span className="font-mono text-[var(--color-secondary)]">({detail.fdBaruCustCode})</span>
                                )}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--color-border)]/50">
                              <div>
                                <span className="text-[var(--color-secondary)] text-[0.68rem] block">Marking Baru:</span>
                                <span className="font-mono font-bold text-[var(--color-primary)]">{detail.fdBaruSpMark || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[var(--color-secondary)] text-[0.68rem] block">Qty / Vol / Wgt Baru:</span>
                                <span className="font-mono text-[var(--color-primary)]">{detail.fdBaruQtyVolWgt || '—'}</span>
                              </div>
                            </div>
                            {detail.fdBaruDetail && (
                              <div>
                                <span className="text-[var(--color-secondary)] text-[0.68rem] block">Keterangan Spesifik:</span>
                                <span className="text-[var(--color-primary)]">{detail.fdBaruDetail}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Section Galeri Lampiran Foto Fisik */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary)] flex items-center gap-1.5">
                    <ImageIcon size={15} /> Lampiran &amp; Bukti Fisik Formulir ({lampiranList.length})
                  </h3>
                  {lampiranList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => openGalleryAt(0)}
                      className="btn btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1.5 cursor-pointer text-[var(--color-primary)]"
                    >
                      <Eye size={13} />
                      Buka Galeri Foto Penuh
                    </button>
                  )}
                </div>

                {lampiranList.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-surface-hover)] text-[var(--color-secondary)] text-xs">
                    Tidak ada foto atau berkas lampiran yang dilampirkan pada formulir ini.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {lampiranList.map((lamp, idx) => {
                      const isImg = lamp.fdMimeType?.startsWith('image/')
                      const isPdf = lamp.fdMimeType === 'application/pdf'

                      return (
                        <div
                          key={lamp.fdId || idx}
                          onClick={() => openGalleryAt(idx)}
                          className="group relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] overflow-hidden cursor-pointer hover:border-[var(--color-primary)] hover:shadow-md transition-all text-left"
                        >
                          {/* Thumbnail Image / Icon */}
                          <div className="w-full aspect-[4/3] bg-[var(--color-neutral)] flex items-center justify-center overflow-hidden relative">
                            {isImg ? (
                              <img
                                src={lamp.fdPath}
                                alt={lamp.fdNamaFile}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            ) : isPdf ? (
                              <div className="flex flex-col items-center gap-1 text-rose-500">
                                <FileText size={32} />
                                <span className="text-[0.65rem] font-bold font-mono">PDF DOKUMEN</span>
                              </div>
                            ) : (
                              <FileText size={32} className="text-[var(--color-secondary)]" />
                            )}

                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white">
                              <span className="p-1.5 rounded-lg bg-black/60 backdrop-blur-xs">
                                <Eye size={15} />
                              </span>
                            </div>
                          </div>

                          {/* Info file */}
                          <div className="p-2 space-y-0.5">
                            <p className="text-[0.72rem] font-semibold text-[var(--color-primary)] truncate" title={lamp.fdNamaFile}>
                              {lamp.fdNamaFile}
                            </p>
                            <div className="flex items-center justify-between text-[0.65rem] text-[var(--color-secondary)] font-mono">
                              <span>{formatFileSize(lamp.fdUkuranBytes)}</span>
                              <span className="truncate max-w-[70px]">{lamp.fdUploadedBy}</span>
                            </div>
                            {lamp.fdKeterangan && (
                              <p className="text-[0.65rem] text-[var(--color-secondary)]/80 italic truncate">
                                "{lamp.fdKeterangan}"
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 5. Bagian PIC & Tanda Tangan */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary)] flex items-center gap-1.5">
                  <User size={14} /> Penanggung Jawab &amp; Tanda Tangan
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] text-xs">
                  <div>
                    <span className="text-[0.65rem] text-[var(--color-secondary)] uppercase block font-semibold">Dibuat Oleh</span>
                    <span className="font-bold text-[var(--color-primary)] truncate block">{form.fdDibuatOleh || form.fdCreatedBy || '—'}</span>
                    {form.fdTglDibuat && (
                      <span className="text-[0.65rem] text-[var(--color-secondary)] font-mono block">{form.fdTglDibuat.split('T')[0]}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[0.65rem] text-[var(--color-secondary)] uppercase block font-semibold">Stuffing</span>
                    <span className="font-bold text-[var(--color-primary)] truncate block">{form.fdStuffing || '—'}</span>
                    {form.fdTglStuffing && (
                      <span className="text-[0.65rem] text-[var(--color-secondary)] font-mono block">{form.fdTglStuffing.split('T')[0]}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[0.65rem] text-[var(--color-secondary)] uppercase block font-semibold">Billing</span>
                    <span className="font-bold text-[var(--color-primary)] truncate block">{form.fdBilling || '—'}</span>
                    {form.fdTglBilling && (
                      <span className="text-[0.65rem] text-[var(--color-secondary)] font-mono block">{form.fdTglBilling.split('T')[0]}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[0.65rem] text-[var(--color-secondary)] uppercase block font-semibold">Petugas AR</span>
                    <span className="font-bold text-[var(--color-primary)] truncate block">{form.fdAR || '—'}</span>
                    {form.fdTglAR && (
                      <span className="text-[0.65rem] text-[var(--color-secondary)] font-mono block">{form.fdTglAR.split('T')[0]}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[0.65rem] text-[var(--color-secondary)] uppercase block font-semibold">Diketahui Oleh</span>
                    <span className="font-bold text-[var(--color-primary)] truncate block">{form.fdDiketahui || '—'}</span>
                    {form.fdTglDiketahui && (
                      <span className="text-[0.65rem] text-[var(--color-secondary)] font-mono block">{form.fdTglDiketahui.split('T')[0]}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 6. Catatan Form */}
              {form.fdCatatan && (
                <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] text-xs space-y-1">
                  <span className="text-[0.68rem] text-[var(--color-secondary)] uppercase font-bold tracking-wider block">
                    Catatan Dokumen
                  </span>
                  <p className="text-[var(--color-primary)] whitespace-pre-wrap">{form.fdCatatan}</p>
                </div>
              )}
            </>
          )}
        </Modal.Body>

        {/* ── Modal Footer Standard ── */}
        <Modal.Footer className="justify-between bg-[var(--color-surface)] border-t border-[var(--color-border)] px-4 sm:px-5 py-3">
          <span className="text-xs text-[var(--color-secondary)] font-mono">
            ID Form: #{form?.fdId || revisionId}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary text-xs py-1.5 px-4 cursor-pointer"
          >
            Tutup
          </button>
        </Modal.Footer>
      </Modal>

      {/* Gallery Lightbox Modal */}
      <RevisionGalleryModal
        items={lampiranList}
        initialIndex={galleryInitialIndex}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />
    </>
  )
}
