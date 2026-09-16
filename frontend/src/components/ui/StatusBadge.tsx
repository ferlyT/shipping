import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type StatusVariant =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'purple'
  | 'indigo'
  | 'amber'

export interface StatusBadgeProps {
  status?: string | null
  variant?: StatusVariant
  label?: ReactNode
  dot?: boolean
  className?: string
  size?: 'sm' | 'md'
}

const variantStyles: Record<StatusVariant, { text: string; border: string; dot: string }> = {
  neutral: {
    text: 'text-[var(--color-secondary)]',
    border: 'border-[var(--color-border)]',
    dot: 'bg-[var(--color-secondary)]',
  },
  info: {
    text: 'text-sky-500',
    border: 'border-sky-500/30',
    dot: 'bg-sky-500',
  },
  success: {
    text: 'text-emerald-500',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  warning: {
    text: 'text-amber-500',
    border: 'border-amber-500/30',
    dot: 'bg-amber-500',
  },
  danger: {
    text: 'text-rose-500',
    border: 'border-rose-500/30',
    dot: 'bg-rose-500',
  },
  purple: {
    text: 'text-purple-500',
    border: 'border-purple-500/30',
    dot: 'bg-purple-500',
  },
  indigo: {
    text: 'text-indigo-500',
    border: 'border-indigo-500/30',
    dot: 'bg-indigo-500',
  },
  amber: {
    text: 'text-amber-500',
    border: 'border-amber-500/30',
    dot: 'bg-amber-500',
  },
}

// Helper resolusi variant otomatis berdasarkan nama status string
function resolveVariant(status?: string | null): StatusVariant {
  if (!status) return 'neutral'
  const s = status.trim().toUpperCase()

  // Success
  if (['COLLECTED', 'ISSUED', 'EQUAL', 'MATCH', 'DELIVERED', 'ACTIVE', 'AMAN', 'SUDAH KIRIM'].includes(s)) {
    return 'success'
  }

  // Info
  if (['ON_DELIVERY', 'ON DELIVERY', 'INVOICE', 'SEDANG KIRIM', 'UDARA', 'AIR'].includes(s)) {
    return 'info'
  }

  // Warning
  if (['DRAFT', 'PENDING', 'OVERCHARGE', 'BELUM SELESAI', 'SCHEDULED', 'PERINGATAN'].includes(s)) {
    return 'warning'
  }

  // Danger
  if (['UNDERCHARGE', 'BLOCKED', 'CANCEL', 'CANCELLED', 'BATAL', 'ERROR', 'MISMATCH', 'SELISIH'].includes(s)) {
    return 'danger'
  }

  // Indigo / Sea
  if (['LAUT', 'SEA'].includes(s)) {
    return 'indigo'
  }

  // Purple
  if (['BROKER', 'SPECIAL', 'MARKETING'].includes(s)) {
    return 'purple'
  }

  return 'neutral'
}

export function StatusBadge({
  status,
  variant,
  label,
  dot = false,
  className,
  size = 'md',
}: StatusBadgeProps) {
  const resolvedVariant = variant || resolveVariant(status)
  const styles = variantStyles[resolvedVariant]
  const displayText = label !== undefined ? label : (status || '—')

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold bg-transparent rounded-full tracking-wide transition-colors whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-[10.5px]' : 'px-2.5 py-0.5 text-[11px]',
        styles.text,
        styles.border,
        'border',
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0 animate-pulse', styles.dot)} />}
      <span className="truncate">{displayText}</span>
    </span>
  )
}
