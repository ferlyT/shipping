// Komponen badge status marking — dipakai di BatchRow & BatchListRow
// Single Source of Truth untuk STATUS_META dan statusMeta
// DILARANG: mendefinisikan ulang STATUS_META atau statusMeta di halaman manapun

import { Clock, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Konstanta status numerik & dinamis
export const MARKING_STATUS_META: Record<number | string, {
  label: string
  bg: string
  text: string
  dot: string
}> = {
  1: { label: 'PROCESS',   bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  2: { label: 'COMPLETED', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  3: { label: 'CANCELLED', bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
  4: { label: 'RE-EXPORT', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
  LOADED: { label: 'LOADED', bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400 border border-sky-500/20', dot: 'bg-sky-500' },
  DELIVERED: { label: 'DELIVERED', bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400 border border-indigo-500/20', dot: 'bg-indigo-500' },
  CUSTOM: { label: 'CUSTOM', bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400 border border-purple-500/20', dot: 'bg-purple-500' },
  CANCELLED: { label: 'CANCELLED', bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400 border border-rose-500/20', dot: 'bg-rose-500' },
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

interface MarkingStatusBadgeProps {
  status?: number | null
  exitDate?: string | null
  loadDate?: string | null
  etdDate?: string | null
  etaDate?: string | null
  sysDate?: string | Date | null
}

const isPastOrToday = (dateStr?: string | null): boolean => {
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return false
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return d <= today
}

const isOlderThan60Days = (dateStr?: string | Date | null): boolean => {
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return false
  const today = new Date()
  const diffTime = today.getTime() - d.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 60
}

/**
 * Badge status untuk item marking.
 * 1. Paksa tampilkan "Selesai" jika fdExitDate sudah terisi.
 * 2. Jika status 3/4 -> Batal/Re-export.
 * 3. Jika fdStatus=1, fdLoadDate is null DAN (today - fdSysDate > 60 hari) -> CANCELLED
 * 4. Jika masih proses (status 1 / exitDate null), hitung milestone: CUSTOM -> DELIVERED -> LOADED -> Proses
 */
export function MarkingStatusBadge({
  status,
  exitDate,
  loadDate,
  etdDate,
  etaDate,
  sysDate,
}: MarkingStatusBadgeProps) {
  // Jika exitDate sudah terisi, status otomatis Selesai (2)
  if (exitDate) {
    const meta = MARKING_STATUS_META[2]
    return (
      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] md:text-xs font-semibold whitespace-nowrap', meta.bg, meta.text)}>
        <span className={cn('w-1.5 h-1.5 rounded-full', meta.dot)} />
        {meta.label}
      </span>
    )
  }

  // Jika status Batal (3) atau Re-export (4)
  if (status === 3 || status === 4) {
    const meta = MARKING_STATUS_META[status]
    return (
      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] md:text-xs font-semibold whitespace-nowrap', meta.bg, meta.text)}>
        <span className={cn('w-1.5 h-1.5 rounded-full', meta.dot)} />
        {meta.label}
      </span>
    )
  }

  // Cek kondisi CANCELLED (fdLoadDate is NULL & sysDate > 60 hari)
  if (!loadDate && sysDate && isOlderThan60Days(sysDate)) {
    const meta = MARKING_STATUS_META.CANCELLED
    return (
      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] md:text-xs font-semibold whitespace-nowrap', meta.bg, meta.text)}>
        <span className={cn('w-1.5 h-1.5 rounded-full', meta.dot)} />
        {meta.label}
      </span>
    )
  }

  // Saat masih proses (fdStatus === 1 atau exitDate NULL)
  let key: number | string = 1

  if (etaDate && isPastOrToday(etaDate)) {
    key = 'CUSTOM'
  } else if (etdDate && isPastOrToday(etdDate)) {
    key = 'DELIVERED'
  } else if (loadDate && isPastOrToday(loadDate)) {
    key = 'LOADED'
  }

  const meta = MARKING_STATUS_META[key] || MARKING_STATUS_META[1]

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] md:text-xs font-semibold whitespace-nowrap', meta.bg, meta.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  )
}
