import { useState, useEffect } from 'react'
import {
  Plane,
  Ship,
  Calendar,
  User,
  Hash,
  Clock,
  FileText,
  Camera,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Tag,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useTranslation } from '@/hooks/useTranslation'
import { useInspectionReport, useInspectionMutations } from '../hooks/useInspectionReports'
import InspectionLampiranGrid from './lampiran/InspectionLampiranGrid'
import { toast } from '@/stores/toastStore'
import type { InspectionReport } from '../types/inspection.types'

interface Props {
  isOpen: boolean
  onClose: () => void
  reportId: number | null
  defaultTab?: 'attachments' | 'items'
  onEdit?: (report: InspectionReport) => void
}

export function InspectionDetailModal({
  isOpen,
  onClose,
  reportId,
  defaultTab = 'attachments',
  onEdit,
}: Props) {
  const { t } = useTranslation()
  const { data: reportData, isLoading, refetch } = useInspectionReport(reportId, isOpen)
  const report = reportData?.data

  const { deletePhotoMutation } = useInspectionMutations()
  const [activeTab, setActiveTab] = useState<'items' | 'attachments'>('items')

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab)
    }
  }, [isOpen, defaultTab])

  const photos = report?.photos || []
  const isAir = report?.fdListType === 1

  const handleDeletePhoto = async (photoId: number) => {
    if (!report) return
    const confirmDelete = window.confirm(t('bap.deletePhotoConfirm'))
    if (!confirmDelete) return

    try {
      await deletePhotoMutation.mutateAsync({
        reportId: report.fdId,
        photoId,
      })
      toast.success('Foto berhasil dihapus dan dipindahkan ke folder arsip.')
      refetch()
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Gagal menghapus foto')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl">
      <Modal.Header
        title={report?.fdReportNumber || t('bap.detail')}
        subtitle={
          report
            ? `${report.fdNamaCustomer} • ${isAir ? 'Udara (Air)' : 'Laut (Sea)'}`
            : 'Detail Berita Acara Pemeriksaan Fisik Kargo'
        }
      />

      <Modal.Body className="space-y-6 py-4 text-xs sm:text-sm">
        {isLoading || !report ? (
          <div className="space-y-4 py-8">
            <div className="h-20 w-full rounded-xl skeleton-shimmer" />
            <div className="h-10 w-64 rounded skeleton-shimmer" />
            <div className="h-64 w-full rounded-xl skeleton-shimmer" />
          </div>
        ) : (
          <>
            {/* Header Metadata Section Card — matching local-charges Form.tsx */}
            <div className="p-4 sm:p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs flex flex-col md:flex-row gap-4 justify-between md:items-center">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-primary)] font-[var(--font-heading)]">
                  Informasi Berita Acara
                </h3>
                <p className="text-[11px] text-[var(--color-secondary)] mt-0.5">
                  Dokumentasi pemeriksaan fisik kargo gudang M-Shipping
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* No BAP */}
                <div className="bg-[var(--color-neutral)] px-3 py-1.5 rounded-lg border border-[var(--color-border)] flex items-center gap-2 text-xs font-medium text-[var(--color-primary)]">
                  <Hash size={13} className="text-[var(--color-secondary)]" />
                  <span className="text-[10px] text-[var(--color-secondary)] uppercase font-semibold">NO:</span>
                  <span className="font-mono font-bold">{report.fdReportNumber}</span>
                </div>

                {/* Petugas */}
                <div className="bg-[var(--color-neutral)] px-3 py-1.5 rounded-lg border border-[var(--color-border)] flex items-center gap-2 text-xs font-medium text-[var(--color-primary)]">
                  <User size={13} className="text-[var(--color-secondary)]" />
                  <span className="text-[10px] text-[var(--color-secondary)] uppercase font-semibold">PETUGAS:</span>
                  <span>{report.fdCreatedBy || 'Staf Lapangan'}</span>
                </div>

                {/* Tanggal */}
                <div className="bg-[var(--color-neutral)] px-3 py-1.5 rounded-lg border border-[var(--color-border)] flex items-center gap-2 text-xs font-medium text-[var(--color-primary)]">
                  <Clock size={13} className="text-[var(--color-secondary)]" />
                  <span className="text-[10px] text-[var(--color-secondary)] uppercase font-semibold">TANGGAL:</span>
                  <span className="font-mono">
                    {new Date(report.fdReportDate).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {/* Status Badge */}
                <Badge variant={report.fdStatus === '2' ? 'success' : 'warning'}>
                  {report.fdStatus === '2' ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={11} /> {t('bap.statusDone')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <AlertCircle size={11} /> {t('bap.statusDraft')}
                    </span>
                  )}
                </Badge>
              </div>
            </div>

            {/* Tab Bar — matching local-charges Form.tsx */}
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-0">
              <button
                type="button"
                onClick={() => setActiveTab('items')}
                className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'items'
                  ? 'border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs'
                  : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                  }`}
              >
                <FileText size={15} />
                <span>Detail & Kargo</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('attachments')}
                className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'attachments'
                  ? 'border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs'
                  : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                  }`}
              >
                <Camera size={15} />
                <span>Foto Pemeriksaan</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${activeTab === 'attachments'
                    ? 'bg-[var(--color-tertiary)]/15 text-[var(--color-tertiary)]'
                    : 'bg-[var(--color-neutral)] text-[var(--color-secondary)]'
                    }`}
                >
                  {photos.length}
                </span>
              </button>


            </div>

            {/* Tab Content Wrapper */}
            <div className="min-h-[300px]">
              {/* TAB 1: FOTO PEMERIKSAAN / LAMPIRAN GRID */}
              {activeTab === 'attachments' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--color-primary)]">
                        Galeri Foto & Watermark Kargo
                      </h4>
                      <p className="text-[11px] text-[var(--color-secondary)] mt-0.5">
                        Watermark resmi tercetak otomatis pada gambar. Maksimal 10 foto per Berita Acara.
                      </p>
                    </div>
                  </div>

                  <InspectionLampiranGrid
                    reportId={report.fdId}
                    reportNumber={report.fdReportNumber}
                    items={photos}
                    onRefresh={() => refetch()}
                    onDelete={handleDeletePhoto}
                    canEdit={true}
                  />
                </div>
              )}

              {/* TAB 2: DETAIL PEMERIKSAAN & DATA KARGO */}
              {activeTab === 'items' && (
                <div className="space-y-6">
                  {/* SECTION 1: IDENTIFIKASI */}
                  <div className="p-4 sm:p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs space-y-4">
                    <h5 className="text-[10px] font-bold text-[var(--color-secondary)] tracking-widest uppercase flex items-center gap-1.5">
                      <Layers size={13} />
                      Identifikasi Pengiriman & Kargo
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Moda */}
                      <div className="p-3 rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)]">
                        <span className="text-[10px] text-[var(--color-secondary)] uppercase font-semibold block mb-1">
                          Moda Pengiriman
                        </span>
                        <div className="flex items-center gap-2 font-bold text-xs">
                          {isAir ? (
                            <>
                              <Plane size={14} className="text-sky-500" />
                              <span className="text-sky-500">Udara (Air)</span>
                            </>
                          ) : (
                            <>
                              <Ship size={14} className="text-blue-500" />
                              <span className="text-blue-500">Laut (Sea)</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Tanggal */}
                      <div className="p-3 rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)]">
                        <span className="text-[10px] text-[var(--color-secondary)] uppercase font-semibold block mb-1">
                          Tanggal Pemeriksaan
                        </span>
                        <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--color-primary)]">
                          <Calendar size={13} className="text-[var(--color-secondary)]" />
                          <span>{new Date(report.fdReportDate).toLocaleDateString('id-ID')}</span>
                        </div>
                      </div>

                      {/* Customer */}
                      <div className="p-3 rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)]">
                        <span className="text-[10px] text-[var(--color-secondary)] uppercase font-semibold block mb-1">
                          Nama Customer
                        </span>
                        <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--color-primary)]">
                          <User size={13} className="text-emerald-500" />
                          <span className="truncate">{report.fdNamaCustomer}</span>
                        </div>
                      </div>

                      {/* Kode Marking */}
                      <div className="p-3 rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)]">
                        <span className="text-[10px] text-[var(--color-secondary)] uppercase font-semibold block mb-1">
                          Kode Marking
                        </span>
                        <span className="font-mono font-bold text-xs text-[var(--color-primary)]">
                          {report.fdMarkingCode}
                        </span>
                      </div>

                      {/* No. Marking */}
                      <div className="p-3 rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)]">
                        <span className="text-[10px] text-[var(--color-secondary)] uppercase font-semibold block mb-1">
                          No. Marking
                        </span>
                        <span className="font-mono font-bold text-xs text-[var(--color-primary)]">
                          {report.fdMarkingNo || '-'}
                        </span>
                      </div>

                      {/* List Code */}
                      <div className="p-3 rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)]">
                        <span className="text-[10px] text-[var(--color-secondary)] uppercase font-semibold block mb-1">
                          List Code
                        </span>
                        <span className="font-mono font-bold text-xs text-[var(--color-primary)]">
                          {report.fdListCode || '-'}
                        </span>
                      </div>

                      {/* No. Resi Terima */}
                      <div className="p-3 rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)]">
                        <span className="text-[10px] text-[var(--color-secondary)] uppercase font-semibold block mb-1">
                          No. Resi (Terima)
                        </span>
                        <span className="font-mono font-bold text-xs text-sky-500">
                          {report.fdTerima || '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: KETERANGAN FISIK KARGO */}
                  <div className="p-4 sm:p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs space-y-3">
                    <h5 className="text-[10px] font-bold text-[var(--color-secondary)] tracking-widest uppercase flex items-center gap-1.5">
                      <FileSpreadsheet size={13} />
                      Keterangan Pemeriksaan Fisik Kargo
                    </h5>
                    <div className="p-3.5 rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)]">
                      <p className="text-xs text-[var(--color-primary)] whitespace-pre-wrap leading-relaxed font-medium">
                        {report.fdKeterangan || 'Tidak ada catatan khusus pemeriksaan kargo.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <div className="flex items-center justify-between w-full">
          <div>
            {report && onEdit && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose()
                  onEdit(report)
                }}
                className="gap-1.5 text-xs"
              >
                <Tag size={13} />
                <span>{t('common.edit')} BAP</span>
              </Button>
            )}
          </div>
          <Button type="button" variant="primary" size="sm" onClick={onClose} className="px-5">
            {t('common.close')}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}
