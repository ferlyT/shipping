// Komponen badge status marking — dipakai di BatchRow & BatchListRow
// Single Source of Truth untuk STATUS_META dan statusMeta
// DILARANG: mendefinisikan ulang STATUS_META atau statusMeta di halaman manapun

import { Clock, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Konstanta status numerik dari DB
export const MARKING_STATUS_META: Record<number, {
  label: string
  bg: string
  text: string
  dot: string
}> = {
  1: { label: 'Proses',     bg: 'bg-[#FFF4E6]', text: 'text-[#E8590C]', dot: 'bg-[#E8590C]' },
  2: { label: 'Selesai',    bg: 'bg-[#EBFBEE]', text: 'text-[#2B8A3E]', dot: 'bg-[#2B8A3E]' },
  3: { label: 'Batal',      bg: 'bg-[#FFF0F0]', text: 'text-[#C92A2A]', dot: 'bg-[#C92A2A]' },
  4: { label: 'Re-export',  bg: 'bg-[#EDF2FF]', text: 'text-[#3B5BDB]', dot: 'bg-[#3B5BDB]' },
}

// Metadata status open/closed untuk header StatusBlock
export const MARKING_BLOCK_META = {
  open: {
    label: 'Belum keluar gudang',
    hint: 'Exit date belum tercatat — masih dalam proses.',
    icon: Clock,
    accent: 'text-[var(--color-warning)]',
    bg: 'bg-[var(--color-warning)]/5',
    border: 'border-[var(--color-warning)]/30',
    badgeBg: 'bg-[var(--color-warning)]/10',
    badgeText: 'text-[var(--color-warning)]',
  },
  closed: {
    label: 'Sudah keluar gudang',
    hint: 'Exit date sudah tercatat — siklus batch selesai.',
    icon: CheckCircle2,
    accent: 'text-[var(--color-success)]',
    bg: 'bg-[var(--color-success)]/5',
    border: 'border-[var(--color-success)]/30',
    badgeBg: 'bg-[var(--color-success)]/10',
    badgeText: 'text-[var(--color-success)]',
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// MarkingStatusBadge Component
// ─────────────────────────────────────────────────────────────────────────────

interface MarkingStatusBadgeProps {
  status?: number | null
  exitDate?: string | null
}

/**
 * Badge status untuk item marking.
 * Paksa tampilkan "Selesai" jika fdExitDate sudah terisi, apapun nilai fdStatus.
 */
export function MarkingStatusBadge({ status, exitDate }: MarkingStatusBadgeProps) {
  const effectiveStatus = exitDate ? 2 : status
  const meta = effectiveStatus != null ? MARKING_STATUS_META[effectiveStatus] : undefined
  const label = meta?.label ?? 'Tidak diketahui'
  const bg    = meta?.bg    ?? 'bg-[#F1F3F5]'
  const text  = meta?.text  ?? 'text-[#495057]'
  const dot   = meta?.dot   ?? 'bg-[#495057]'

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] md:text-xs font-semibold whitespace-nowrap',
      bg, text
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />
      {label}
    </span>
  )
}
