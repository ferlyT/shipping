import { useState } from 'react'
import InspectionLampiranUploader from './InspectionLampiranUploader'
import LampiranItem from './LampiranItem'
import LampiranLightbox from './LampiranLightbox'
import { Camera } from 'lucide-react'
import type { BapPhoto } from '../../types/inspection.types'

interface LampiranGridProps {
  reportId: number
  reportNumber?: string
  items: BapPhoto[]
  onRefresh: () => void
  onDelete: (photoId: number) => void
  canEdit?: boolean
}

export default function InspectionLampiranGrid({
  reportId,
  reportNumber,
  items,
  onRefresh,
  onDelete,
  canEdit = true,
}: LampiranGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {canEdit && items.length < 10 && (
        <InspectionLampiranUploader
          reportId={reportId}
          onUploadSuccess={onRefresh}
          currentPhotoCount={items.length}
        />
      )}

      {/* Grid of Photo Cards */}
      {items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {items.map((item, index) => (
            <LampiranItem
              key={item.fdId}
              item={item}
              index={index}
              onDelete={canEdit ? onDelete : undefined}
              onClick={() => setLightboxIndex(index)}
              reportNumber={reportNumber}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 px-4 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-neutral)]/40 text-[var(--color-secondary)] space-y-2">
          <Camera size={32} className="mx-auto opacity-40 text-[var(--color-secondary)]" />
          <p className="text-xs font-semibold text-[var(--color-primary)]">
            Belum ada foto pemeriksaan kargo
          </p>
          <p className="text-[11px] text-[var(--color-secondary)] max-w-sm mx-auto">
            Gunakan area unggah di atas, seret file gambar, atau tekan <b>CTRL+V</b> untuk menempelkan tangkapan layar.
          </p>
        </div>
      )}

      {/* Fullscreen Lightbox */}
      {lightboxIndex !== null && (
        <LampiranLightbox
          items={items}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          reportNumber={reportNumber}
        />
      )}
    </div>
  )
}
