import { useState } from 'react'
import { Paperclip, FileQuestion } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import {
  useBillingAttachments,
  useBillingAttachmentMutations,
} from '../../hooks/useBillingAttachments'
import BillingLampiranUploader from './BillingLampiranUploader'
import BillingLampiranItem from './BillingLampiranItem'
import BillingLampiranLightbox from './BillingLampiranLightbox'

interface BillingLampiranSectionProps {
  invNo: string
  compact?: boolean
}

export default function BillingLampiranSection({
  invNo,
  compact = false,
}: BillingLampiranSectionProps) {
  const { user } = useAuthStore()
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const { data: items = [], isLoading, refetch } = useBillingAttachments(invNo)
  const { deleteAttachmentMutation } = useBillingAttachmentMutations(invNo)

  const canUpload =
    user?.role === 'admin' ||
    user?.role === 'superadmin' ||
    Boolean(user?.permissions?.includes('/mshipping/finance/billing/attachments'))

  const canDelete =
    user?.role === 'admin' ||
    user?.role === 'superadmin' ||
    Boolean(user?.permissions?.includes('/mshipping/finance/billing/attachments/delete'))

  const handleDelete = async (photoId: number) => {
    if (!invNo || !canDelete) return
    const confirmed = window.confirm('Apakah Anda yakin ingin menghapus lampiran ini?')
    if (!confirmed) return

    try {
      await deleteAttachmentMutation.mutateAsync(photoId)
      toast.success('Lampiran berhasil dihapus.')
      refetch()
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Gagal menghapus lampiran')
    }
  }

  return (
    <div className={`space-y-4 font-[var(--font-body)] ${compact ? '' : 'p-4 sm:p-6 bg-[var(--color-surface)] rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-xs'}`}>
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-neutral)] flex items-center justify-center border border-[var(--color-border)] text-[var(--color-tertiary)]">
            <Paperclip size={17} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--color-primary)] font-[var(--font-heading)] flex items-center gap-2">
              Lampiran Dokumen & Bukti Bayar
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)]">
                {items.length}/10 berkas
              </span>
            </h3>
            <p className="text-[11px] text-[var(--color-secondary)]">
              Foto bukti transfer, kuitansi pelunasan, nota, dan scan dokumen invoice.
            </p>
          </div>
        </div>
      </div>

      {/* Uploader Box */}
      {canUpload && items.length < 10 && (
        <BillingLampiranUploader
          invNo={invNo}
          onUploadSuccess={refetch}
          currentCount={items.length}
        />
      )}

      {/* Items Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-xl border border-[var(--color-border)] skeleton-shimmer" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {items.map((item, index) => (
            <BillingLampiranItem
              key={item.fdId}
              item={item}
              index={index}
              invNo={invNo}
              onDelete={canDelete ? handleDelete : undefined}
              onClick={() => setLightboxIndex(index)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 px-4 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-neutral)]/40 text-[var(--color-secondary)] space-y-2">
          <FileQuestion size={32} className="mx-auto opacity-40 text-[var(--color-secondary)]" />
          <p className="text-xs font-semibold text-[var(--color-primary)]">
            Belum ada lampiran untuk invoice ini
          </p>
          <p className="text-[11px] text-[var(--color-secondary)] max-w-sm mx-auto">
            {canUpload
              ? 'Tarik berkas ke area di atas, klik untuk memilih file, atau tekan CTRL+V untuk menempelkan gambar.'
              : 'Tidak ada dokumen atau bukti pembayaran yang diunggah.'}
          </p>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <BillingLampiranLightbox
          items={items}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          invNo={invNo}
        />
      )}
    </div>
  )
}
