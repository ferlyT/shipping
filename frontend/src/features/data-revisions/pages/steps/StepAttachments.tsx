import { Paperclip } from 'lucide-react'
import type { RevisionLampiranItem } from '../../types/data-revisions.types'
import RevisionLampiranGrid from '../../components/RevisionLampiranGrid'

interface StepAttachmentsProps {
  lampiran: RevisionLampiranItem[]
  onUpload?: (file: File, keterangan?: string) => void
  onDelete?: (id: number) => void
  isUploading?: boolean
  isDeleting?: boolean
  canEdit?: boolean
}

export default function StepAttachments({
  lampiran = [],
  onUpload,
  onDelete,
  isUploading,
  isDeleting,
  canEdit = true,
}: StepAttachmentsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-[var(--color-primary)] flex items-center gap-2">
          <Paperclip size={16} className="text-[var(--color-primary)]" />
          Lampiran Dokumen &amp; Foto Form Fisik
        </h2>
        <p className="text-xs text-[var(--color-secondary)] mt-0.5">
          Unggah foto/scan formulir fisik bertanda tangan, bukti chat WhatsApp customer, atau dokumen pendukung lainnya.
        </p>
      </div>

      <RevisionLampiranGrid
        lampiran={lampiran}
        onUpload={onUpload}
        onDelete={onDelete}
        isUploading={isUploading}
        isDeleting={isDeleting}
        canEdit={canEdit}
      />
    </div>
  )
}
