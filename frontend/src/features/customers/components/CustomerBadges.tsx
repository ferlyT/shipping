import { Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CustomerTierKey } from '../types/customers.types'

export const statusConfig = {
  0: { label: 'NO STATUS', badgeVariant: 'default' as const, accentClass: 'border-l-[var(--color-border)]', dotClass: 'bg-[var(--color-secondary)]' },
  1: { label: 'OK', badgeVariant: 'default' as const, accentClass: 'border-l-[var(--color-secondary)]', dotClass: 'bg-[var(--color-primary)]' },
  2: { label: 'COD', badgeVariant: 'success' as const, accentClass: 'border-l-emerald-500', dotClass: 'bg-emerald-500' },
  3: { label: 'WARNING', badgeVariant: 'warning' as const, accentClass: 'border-l-amber-500', dotClass: 'bg-amber-500' },
  4: { label: 'BLOCKED', badgeVariant: 'danger' as const, accentClass: 'border-l-rose-500', dotClass: 'bg-rose-500' },
  5: { label: 'URGENT', badgeVariant: 'info' as const, accentClass: 'border-l-sky-500', dotClass: 'bg-sky-500' },
}

export const tierBadgeConfig: Record<
  CustomerTierKey,
  {
    label: string
    shortLabel: string
    badgeClass: string
    dotClass: string
  }
> = {
  diamond: {
    label: 'DIAMOND',
    shortLabel: 'DIAMOND',
    badgeClass: 'border-cyan-500/50 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 shadow-2xs font-extrabold',
    dotClass: 'bg-cyan-400 shadow-sm',
  },
  platinum: {
    label: 'PLATINUM',
    shortLabel: 'PLATINUM',
    badgeClass: 'border-purple-500/50 bg-purple-500/15 text-purple-700 dark:text-purple-300 shadow-2xs font-extrabold',
    dotClass: 'bg-purple-400',
  },
  gold: {
    label: 'GOLD',
    shortLabel: 'GOLD',
    badgeClass: 'border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300 shadow-2xs font-extrabold',
    dotClass: 'bg-amber-400',
  },
  silver: {
    label: 'SILVER',
    shortLabel: 'SILVER',
    badgeClass: 'border-slate-400/50 bg-slate-400/15 text-slate-700 dark:text-slate-300 font-bold',
    dotClass: 'bg-slate-400',
  },
  bronze: {
    label: 'BRONZE',
    shortLabel: 'BRONZE',
    badgeClass: 'border-orange-500/50 bg-orange-500/15 text-orange-700 dark:text-orange-300 font-bold',
    dotClass: 'bg-orange-400',
  },
  none: {
    label: 'UNRANKED',
    shortLabel: 'UNRANKED',
    badgeClass: 'border-[var(--color-border)] bg-[var(--color-neutral)] text-[var(--color-secondary)] font-medium',
    dotClass: 'bg-[var(--color-secondary)]',
  },
}

export function CustomerTierBadge({
  tier = 'none',
  size = 'sm',
  showDot = true,
}: {
  tier?: CustomerTierKey
  size?: 'xs' | 'sm' | 'md'
  showDot?: boolean
}) {
  if (!tier || tier === 'none') return null
  const config = tierBadgeConfig[tier] || tierBadgeConfig.none

  const sizing = {
    xs: 'text-[8px] px-1.5 py-0.2 gap-1',
    sm: 'text-[9px] px-2 py-0.5 gap-1',
    md: 'text-[10px] px-2.5 py-1 gap-1.5',
  }[size]

  return (
    <span
      className={cn(
        'shrink-0 inline-flex items-center rounded-full tracking-wider border',
        config.badgeClass,
        sizing
      )}
      title={`Customer Tier: ${config.label}`}
    >
      {showDot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dotClass)} />}
      <span>{config.shortLabel}</span>
    </span>
  )
}

export function BrokerBadge({ size = 'sm', className }: { size?: 'xs' | 'sm' | 'md'; className?: string }) {
  const sizing = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-1 [&>svg]:w-2.5 [&>svg]:h-2.5',
    sm: 'text-[9px] px-2 py-0.5 gap-1 [&>svg]:w-2.5 [&>svg]:h-2.5',
    md: 'text-[10px] px-2.5 py-1 gap-1.5 [&>svg]:w-3 [&>svg]:h-3',
  }[size]

  return (
    <span
      className={cn(
        'shrink-0 inline-flex items-center rounded font-bold tracking-wide uppercase',
        'border border-indigo-200 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:border-indigo-800 dark:text-indigo-300',
        sizing,
        className
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
