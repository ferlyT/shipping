import React from 'react'
import { Eye, Trash2, Download } from 'lucide-react'
import { resolveMediaUrl } from '@/lib/utils'
import type { BapPhoto } from '../../types/inspection.types'

interface LampiranItemProps {
  item: BapPhoto
  index: number
  onDelete?: (id: number) => void
  onClick: () => void
  reportNumber?: string
}

export default function LampiranItem({
  item,
  index,
  onDelete,
  onClick,
  reportNumber,
}: LampiranItemProps) {
  const photoUrl = resolveMediaUrl(item.fdPhotoUrl) || item.fdPhotoUrl

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    const link = document.createElement('a')
    link.href = photoUrl
    link.download = `${reportNumber || 'bap'}-foto-${index + 1}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div
      className="group relative flex flex-col items-center justify-center p-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] overflow-hidden cursor-pointer hover:border-[var(--color-tertiary)] transition-colors shadow-xs"
      onClick={onClick}
    >
      <div className="w-full h-32 sm:h-36 flex items-center justify-center bg-[var(--color-neutral)] rounded overflow-hidden mb-2 relative">
        <img
          src={photoUrl}
          alt={item.fdCaption || `Foto #${index + 1}`}
          className="object-cover w-full h-full transition-transform duration-200 group-hover:scale-105"
          loading="lazy"
        />

        {/* Index Tag Badge */}
        <div className="absolute top-1.5 left-1.5 bg-black/70 px-1.5 py-0.5 rounded text-[9px] font-mono text-white/90">
          #{index + 1}
        </div>

        {/* Overlay Actions */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            type="button"
            className="p-1.5 bg-[var(--color-surface)] text-[var(--color-primary)] rounded-full hover:bg-[var(--color-neutral)] transition shadow-sm"
            title="Lihat Foto"
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
          >
            <Eye size={16} />
          </button>
          <button
            type="button"
            className="p-1.5 bg-[var(--color-surface)] text-[var(--color-primary)] rounded-full hover:bg-[var(--color-neutral)] transition shadow-sm"
            title="Unduh Foto"
            onClick={handleDownload}
          >
            <Download size={16} />
          </button>
          {onDelete && (
            <button
              type="button"
              className="p-1.5 bg-[var(--color-surface)] text-rose-500 rounded-full hover:bg-[var(--color-neutral)] transition shadow-sm"
              title="Hapus Foto"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(item.fdId)
              }}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="w-full text-center px-1">
        <p
          className="text-[0.72rem] tracking-[0.02em] font-medium text-[var(--color-primary)] truncate"
          title={item.fdCaption || `Foto #${index + 1}`}
        >
          {item.fdCaption || `Foto Pemeriksaan #${index + 1}`}
        </p>
        <p className="text-[0.72rem] text-[var(--color-secondary)]">
          {item.fdUploadedBy} • {new Date(item.fdCreatedAt).toLocaleDateString('id-ID')}
        </p>
      </div>
    </div>
  )
}
