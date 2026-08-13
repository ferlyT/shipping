import { Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export const statusConfig = {
  0: { label: 'NO STATUS', badgeVariant: 'default' as const, accentClass: 'border-l-gray-200', dotClass: 'bg-gray-300' },
  1: { label: 'OK', badgeVariant: 'default' as const, accentClass: 'border-l-slate-400', dotClass: 'bg-slate-600' },
  2: { label: 'COD', badgeVariant: 'success' as const, accentClass: 'border-l-green-500', dotClass: 'bg-green-500' },
  3: { label: 'WARNING', badgeVariant: 'warning' as const, accentClass: 'border-l-amber-500', dotClass: 'bg-amber-500' },
  4: { label: 'BLOCKED', badgeVariant: 'danger' as const, accentClass: 'border-l-red-500', dotClass: 'bg-red-500' },
  5: { label: 'URGENT', badgeVariant: 'info' as const, accentClass: 'border-l-cyan-500', dotClass: 'bg-cyan-500' },
}

export const badgeColorClasses: Record<string, string> = {
  danger: 'bg-red-100 text-red-700 border border-red-200',
  warning: 'bg-amber-100 text-amber-700 border border-amber-200',
  success: 'bg-green-100 text-green-700 border border-green-200',
  info: 'bg-cyan-100 text-cyan-700 border border-cyan-200',
  default: 'bg-gray-100 text-gray-600 border border-gray-200',
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
        'shrink-0 inline-flex items-center rounded-full font-bold tracking-wider text-white',
        'bg-gradient-to-r from-indigo-500 to-blue-500 shadow-xs shadow-indigo-500/20',
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
    <span className={cn('shrink-0 bg-gray-100 text-gray-500 rounded-full font-bold tracking-wider border border-gray-200', sizing)}>
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
