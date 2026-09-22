import { useState } from 'react'
import {
  Printer,
  CheckSquare,
  Square,
  AlertCircle,
  ExternalLink,
  Layers,
  FileText,
  Ruler,
} from 'lucide-react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { deliveryOrdersApi } from '../services/delivery-orders.service'
import { useToastStore } from '@/stores/toastStore'
import { formatDate } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'
import type { DeliveryOrderDetailResponse, PrintDeliveryOrderDto } from '../types/delivery-orders.types'

interface PrintDeliveryOrderModalProps {
  isOpen: boolean
  onClose: () => void
  data: DeliveryOrderDetailResponse
  onPrintSuccess?: () => void
}

export function PrintDeliveryOrderModal({
  isOpen,
  onClose,
  data,
  onPrintSuccess,
}: PrintDeliveryOrderModalProps) {
  const { addToast } = useToastStore()
  const [isPrinting, setIsPrinting] = useState(false)

  // Dokumen yang dipilih: 'both' | 'sj' | 'ukuran'
  const [documentType, setDocumentType] = useState<'both' | 'sj' | 'ukuran'>('both')

  // 4 FoxPro Print Options (sesuai frm_input_surat_jalan_2021)
  const [options, setOptions] = useState<PrintDeliveryOrderDto>({
    cetakUkuran: false, // check1
    cetakSJKosong: false, // check2
    cetakKeterangan: true, // check3
    cetakSupir: true, // fdCetakSupir
  })

  const toggleOption = (key: keyof PrintDeliveryOrderDto) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const { delivery, customer, entryList } = data

  /**
   * Bangun URL halaman cetak mandiri lengkap dengan query params
   */
  const buildPrintUrl = (autoprint = false): string => {
    const base = ROUTES.DELIVERY_PRINT(delivery.fdSJNo, documentType)
    const params = new URLSearchParams()
    if (options.cetakUkuran) params.set('ukuran', '1')
    if (options.cetakSJKosong) params.set('kosong', '1')
    if (options.cetakKeterangan === false) params.set('ket', '0')
    if (options.cetakSupir === false) params.set('supir', '0')
    if (autoprint) params.set('autoprint', '1')
    const qs = params.toString()
    return qs ? `${base}${base.includes('?') ? '&' : '?'}${qs}` : base
  }

  /**
   * Buka pratinjau halaman cetak di tab baru
   */
  const handleOpenPreview = () => {
    const url = buildPrintUrl(false)
    window.open(url, '_blank')
  }

  /**
   * Eksekusi cetak:
   * 1. Catat status cetak ke database backend (fdPrint = 1, fdPrintDate, fdPrintBy)
   * 2. Buka jendela cetak mandiri dengan autoprint=1
   * 3. Refresh data & tutup modal
   */
  const handlePrint = async () => {
    try {
      setIsPrinting(true)
      await deliveryOrdersApi.recordPrint(delivery.fdSJNo, options)
      addToast({
        message: `Status cetak Surat Jalan ${delivery.fdSJNo} berhasil diperbarui.`,
        type: 'success',
      })
      if (onPrintSuccess) onPrintSuccess()

      // Buka halaman cetak di tab baru dengan dialog print otomatis
      const printUrl = buildPrintUrl(true)
      const printWindow = window.open(printUrl, '_blank')
      if (!printWindow) {
        // Fallback jika popup blocker aktif: redirect langsung
        window.location.href = printUrl
      }

      onClose()
    } catch (err: any) {
      addToast({
        message: err?.response?.data?.error || err.message || 'Gagal mencatat status cetak',
        type: 'error',
      })
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader
        title={`Cetak Surat Jalan: ${delivery.fdSJNo}`}
        subtitle="Media Cetak: Kertas Continuous Form 23 × 16.5 cm (Landscape)"
      />

      <ModalBody className="space-y-4">
        {/* Ringkasan Dokumen */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-neutral)]/40 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-secondary)] uppercase tracking-wider font-semibold text-[10.5px]">
              No. Surat Jalan
            </span>
            <span className="font-mono font-bold text-[var(--color-primary)] text-sm">
              {delivery.fdSJNo}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--color-secondary)]">Penerima</span>
            <span className="font-semibold text-[var(--color-primary)] truncate max-w-[280px]">
              {delivery.fdCustNameSJ || customer?.fdCustName || 'Customer'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--color-secondary)]">Armada / Supir</span>
            <span className="text-[var(--color-primary)] font-medium">
              {delivery.fdCarID || '—'} {delivery.fdSupir ? `(${delivery.fdSupir})` : ''}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--color-secondary)]">Muatan Kargo</span>
            <span className="text-[var(--color-primary)] font-semibold tabular-nums">
              {delivery.fdJmlPackSJ ?? entryList?.fdJmlPack ?? 0} {delivery.fdSatuan || 'KOLI'} /{' '}
              {delivery.fdJmlBeratSJ ?? entryList?.fdJmlBerat ?? 0} kg
            </span>
          </div>

          {delivery.fdPrintDate && (
            <div className="flex items-center gap-1.5 pt-1 text-[11px] text-sky-600 dark:text-sky-400">
              <AlertCircle size={12} className="shrink-0" />
              <span>
                Pernah dicetak pada {formatDate(delivery.fdPrintDate)} oleh {delivery.fdPrintBy || 'Staf'}
              </span>
            </div>
          )}
        </div>

        {/* ─── PEMILIHAN DOKUMEN YANG DICETAK ─── */}
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
            Pilih Dokumen yang Dicetak
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Opsi 1: Keduanya (SJ + Ukuran) */}
            <div
              onClick={() => setDocumentType('both')}
              className={`p-3 rounded-xl border cursor-pointer transition-all duration-150 select-none flex flex-col justify-between ${
                documentType === 'both'
                  ? 'border-[var(--color-tertiary)] bg-[var(--color-tertiary)]/10 text-[var(--color-primary)] ring-1 ring-[var(--color-tertiary)]/30'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)]/40 text-[var(--color-secondary)]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="p-1.5 rounded-lg bg-[var(--color-tertiary)]/15 text-[var(--color-tertiary)]">
                  <Layers size={16} />
                </div>
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                    documentType === 'both'
                      ? 'border-[var(--color-tertiary)] bg-[var(--color-tertiary)] text-white'
                      : 'border-[var(--color-border-strong)]'
                  }`}
                >
                  {documentType === 'both' ? '✓' : ''}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--color-primary)]">SJ + Lampiran</p>
                <p className="text-[10.5px] text-[var(--color-secondary)] mt-0.5 leading-snug">
                  Cetak 2 lembar continuous form (Surat Jalan & Lampiran Ukuran).
                </p>
              </div>
            </div>

            {/* Opsi 2: Surat Jalan Saja */}
            <div
              onClick={() => setDocumentType('sj')}
              className={`p-3 rounded-xl border cursor-pointer transition-all duration-150 select-none flex flex-col justify-between ${
                documentType === 'sj'
                  ? 'border-[var(--color-tertiary)] bg-[var(--color-tertiary)]/10 text-[var(--color-primary)] ring-1 ring-[var(--color-tertiary)]/30'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)]/40 text-[var(--color-secondary)]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
                  <FileText size={16} />
                </div>
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                    documentType === 'sj'
                      ? 'border-[var(--color-tertiary)] bg-[var(--color-tertiary)] text-white'
                      : 'border-[var(--color-border-strong)]'
                  }`}
                >
                  {documentType === 'sj' ? '✓' : ''}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--color-primary)]">Hanya Surat Jalan</p>
                <p className="text-[10.5px] text-[var(--color-secondary)] mt-0.5 leading-snug">
                  Format resmi 1 lembar (rpf_delivery_2022).
                </p>
              </div>
            </div>

            {/* Opsi 3: Lampiran Ukuran Saja */}
            <div
              onClick={() => setDocumentType('ukuran')}
              className={`p-3 rounded-xl border cursor-pointer transition-all duration-150 select-none flex flex-col justify-between ${
                documentType === 'ukuran'
                  ? 'border-[var(--color-tertiary)] bg-[var(--color-tertiary)]/10 text-[var(--color-primary)] ring-1 ring-[var(--color-tertiary)]/30'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)]/40 text-[var(--color-secondary)]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Ruler size={16} />
                </div>
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                    documentType === 'ukuran'
                      ? 'border-[var(--color-tertiary)] bg-[var(--color-tertiary)] text-white'
                      : 'border-[var(--color-border-strong)]'
                  }`}
                >
                  {documentType === 'ukuran' ? '✓' : ''}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--color-primary)]">Hanya Lampiran Ukuran</p>
                <p className="text-[10.5px] text-[var(--color-secondary)] mt-0.5 leading-snug">
                  Tabel rincian dimensi (rpt_deliverysize_bill_2023).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 4 OPSI CETAK FOXPRO ─── */}
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
            Konfigurasi Opsi Cetak Dokumen
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* 1. Cetak Ukuran di SJ */}
            <div
              onClick={() => toggleOption('cetakUkuran')}
              className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all duration-150 select-none ${
                options.cetakUkuran
                  ? 'border-[var(--color-tertiary)] bg-[var(--color-tertiary)]/5 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)]/40 text-[var(--color-secondary)]'
              }`}
            >
              <div className="mt-0.5 shrink-0 text-[var(--color-tertiary)]">
                {options.cetakUkuran ? (
                  <CheckSquare size={15} />
                ) : (
                  <Square size={15} className="text-[var(--color-border-strong)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--color-primary)]">
                  Cetak Ukuran Dimensi di SJ
                </p>
                <p className="text-[10.5px] text-[var(--color-secondary)] mt-0.5 leading-tight">
                  Tampilkan rincian box (P × L × T) di badan Surat Jalan.
                </p>
              </div>
            </div>

            {/* 2. Cetak Keterangan di SJ */}
            <div
              onClick={() => toggleOption('cetakKeterangan')}
              className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all duration-150 select-none ${
                options.cetakKeterangan
                  ? 'border-[var(--color-tertiary)] bg-[var(--color-tertiary)]/5 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)]/40 text-[var(--color-secondary)]'
              }`}
            >
              <div className="mt-0.5 shrink-0 text-[var(--color-tertiary)]">
                {options.cetakKeterangan ? (
                  <CheckSquare size={15} />
                ) : (
                  <Square size={15} className="text-[var(--color-border-strong)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--color-primary)]">
                  Cetak Catatan & Deskripsi
                </p>
                <p className="text-[10.5px] text-[var(--color-secondary)] mt-0.5 leading-tight">
                  Sertakan deskripsi barang dan catatan instruksi CS.
                </p>
              </div>
            </div>

            {/* 3. Cetak Nama Supir */}
            <div
              onClick={() => toggleOption('cetakSupir')}
              className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all duration-150 select-none ${
                options.cetakSupir
                  ? 'border-[var(--color-tertiary)] bg-[var(--color-tertiary)]/5 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)]/40 text-[var(--color-secondary)]'
              }`}
            >
              <div className="mt-0.5 shrink-0 text-[var(--color-tertiary)]">
                {options.cetakSupir ? (
                  <CheckSquare size={15} />
                ) : (
                  <Square size={15} className="text-[var(--color-border-strong)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--color-primary)]">
                  Cetak Nama Supir & Armada
                </p>
                <p className="text-[10.5px] text-[var(--color-secondary)] mt-0.5 leading-tight">
                  Cetak nama pengemudi dan nomor polisi di tanda terima.
                </p>
              </div>
            </div>

            {/* 4. Cetak SJ Kosong */}
            <div
              onClick={() => toggleOption('cetakSJKosong')}
              className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all duration-150 select-none ${
                options.cetakSJKosong
                  ? 'border-amber-500 bg-amber-500/5 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)]/40 text-[var(--color-secondary)]'
              }`}
            >
              <div className="mt-0.5 shrink-0 text-amber-500">
                {options.cetakSJKosong ? (
                  <CheckSquare size={15} />
                ) : (
                  <Square size={15} className="text-[var(--color-border-strong)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--color-primary)]">
                  Cetak Form SJ Kosong
                </p>
                <p className="text-[10.5px] text-[var(--color-secondary)] mt-0.5 leading-tight">
                  Kosongkan isian muatan untuk keperluan pengisian darurat.
                </p>
              </div>
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter className="flex items-center justify-between gap-2.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenPreview}
          className="gap-1.5 text-xs text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
        >
          <ExternalLink size={13} />
          <span>Pratinjau Halaman Cetak</span>
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isPrinting}>
            Batal
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            disabled={isPrinting}
            className="gap-1.5 cursor-pointer"
          >
            <Printer size={14} />
            <span>{isPrinting ? 'Memproses...' : 'Cetak Dokumen'}</span>
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  )
}
