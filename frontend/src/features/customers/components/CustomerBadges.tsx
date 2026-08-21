import { Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export const statusConfig = {
  0: { label: 'NO STATUS', badgeVariant: 'default' as const, accentClass: 'border-l-[var(--color-border)]', dotClass: 'bg-[var(--color-secondary)]' },
  1: { label: 'OK', badgeVariant: 'default' as const, accentClass: 'border-l-[var(--color-secondary)]', dotClass: 'bg-[var(--color-primary)]' },
  2: { label: 'COD', badgeVariant: 'success' as const, accentClass: 'border-l-emerald-500', dotClass: 'bg-emerald-500' },
  3: { label: 'WARNING', badgeVariant: 'warning' as const, accentClass: 'border-l-amber-500', dotClass: 'bg-amber-500' },
  4: { label: 'BLOCKED', badgeVariant: 'danger' as const, accentClass: 'border-l-rose-500', dotClass: 'bg-rose-500' },
  5: { label: 'URGENT', badgeVariant: 'info' as const, accentClass: 'border-l-sky-500', dotClass: 'bg-sky-500' },
}

export function BrokerBadge({ size = 'sm' }: { size?: 'xs' | 'sm' | 'md' }) {
  const sizing = {
    xs: 'text-[8px] px-1 py-0.5 gap-0.5 [&>svg]:w-2 [&>svg]:h-2',
    sm: 'text-[9px] px-1.5 py-0.5 gap-0.5 [&>svg]:w-2.5 [&>svg]:h-2.5',
    md: 'text-[10px] px-2 py-1 gap-1 [&>svg]:w-3 [&>svg]:h-3',
  }[size]

  return (
    <span
      className={cn(
        'shrink-0 inline-flex items-center rounded-full font-bold tracking-wider',
        'border border-indigo-500/50 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
        sizing
      )}
      title="Registered broker"
    >
      <Building2 />
      BROKER
    </span>
  )
}

export function DiscontinuedBadge({ size = 'sm' }: { size?: 'xs' | 'sm' | 'md' }) {
  const sizing = {
    xs: 'text-[8px] px-1 py-0.5',
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-[10px] px-2 py-1',
  }[size]

  return (
    <span className={cn('shrink-0 bg-[var(--color-neutral)] text-[var(--color-secondary)] rounded-full font-bold tracking-wider border border-[var(--color-border)]', sizing)}>
      DISCONTINUED
    </span>
  )
}

export function formatCustomerSince(dateStr?: string | null) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

export function formatCustomerTenure(dateStr?: string | null): string | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return null
  const now = new Date()
  let months = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth())
  if (now.getDate() < date.getDate()) months -= 1
  if (months < 1) return 'Baru'
  if (months < 12) return `${months} bln`
  const years = Math.floor(months / 12)
  return `${years} thn`
}
