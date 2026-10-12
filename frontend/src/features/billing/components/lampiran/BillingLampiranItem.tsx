import React from 'react'
import { Eye, Trash2, Download, FileText } from 'lucide-react'
import { resolveMediaUrl } from '@/lib/utils'
import type { BillingAttachment } from '../../types/billing.types'

interface BillingLampiranItemProps {
  item: BillingAttachment
  index: number
  onDelete?: (id: number) => void
  onClick: () => void
  invNo?: string
}

function formatBytes(bytes: number, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export default function BillingLampiranItem({
  item,
  index,
  onDelete,
  onClick,
  invNo,
}: BillingLampiranItemProps) {
  const fileUrl = resolveMediaUrl(item.fdFileUrl) || item.fdFileUrl
  const isPdf =
    item.fdFileType?.toLowerCase() === 'application/pdf' ||
    item.fdFileName?.toLowerCase().endsWith('.pdf')

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = item.fdFileName || `${invNo || 'invoice'}-lampiran-${index + 1}`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div
      className="group relative flex flex-col items-center justify-between p-2.5 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] overflow-hidden cursor-pointer hover:border-[var(--color-tertiary)] transition-all shadow-xs hover:shadow-sm"
      onClick={onClick}
    >
      <div className="w-full h-32 sm:h-36 flex items-center justify-center bg-[var(--color-neutral)] rounded-lg overflow-hidden mb-2 relative">
        {isPdf ? (
          <div className="flex flex-col items-center justify-center p-3 text-center">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 flex items-center justify-center mb-1.5 border border-rose-500/30">
              <FileText className="w-6 h-6 stroke-[2]" />
            </div>
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              DOKUMEN PDF
            </span>
          </div>
        ) : (
          <img
            src={fileUrl}
            alt={item.fdFileName || `Lampiran #${index + 1}`}
            className="object-cover w-full h-full transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
          />
        )}

        {/* Index Tag Badge */}
        <div className="absolute top-1.5 left-1.5 bg-black/75 px-1.5 py-0.5 rounded text-[9px] font-mono text-white/95">
          #{index + 1}
        </div>

        {/* File Size Badge */}
        <div className="absolute top-1.5 right-1.5 bg-black/60 px-1.5 py-0.5 rounded text-[9px] font-mono text-white/90">
          {formatBytes(item.fdFileSize)}
        </div>

        {/* Overlay Hover Actions */}
        <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            type="button"
            className="p-1.5 bg-[var(--color-surface)] text-[var(--color-primary)] rounded-full hover:bg-[var(--color-neutral)] transition shadow-sm"
            title="Pratinjau Berkas"
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
            title="Unduh Berkas"
            onClick={handleDownload}
          >
            <Download size={16} />
          </button>
          {onDelete && (
            <button
              type="button"
              className="p-1.5 bg-[var(--color-surface)] text-rose-500 rounded-full hover:bg-[var(--color-neutral)] transition shadow-sm"
              title="Hapus Lampiran"
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
          title={item.fdFileName || `Lampiran #${index + 1}`}
        >
          {item.fdFileName || `Lampiran #${index + 1}`}
        </p>
        <p className="text-[0.70rem] text-[var(--color-secondary)] truncate mt-0.5">
          {item.fdUploadedBy} • {new Date(item.fdCreatedAt).toLocaleDateString('id-ID')}
        </p>
      </div>
    </div>
  )
}
