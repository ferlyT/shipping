import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: string
  unit?: string
  icon: React.ElementType
  tone: 'amber' | 'blue' | 'purple'
}

export function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  tone,
}: MetricCardProps) {
  const toneStyles = {
    amber: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-600',
      border: 'border-amber-100/70',
      iconBg: 'bg-amber-500 text-white',
    },
    blue: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-600',
      border: 'border-blue-100/70',
      iconBg: 'bg-blue-600 text-white',
    },
    purple: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-600',
      border: 'border-purple-100/70',
      iconBg: 'bg-purple-600 text-white',
    },
  }[tone]

  return (
    <div className={cn('relative flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm overflow-hidden')}>
      <div className="flex items-center justify-between mb-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)]">{label}</span>
        <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center text-xs shadow-sm', toneStyles.iconBg)}>
          <Icon size={12} />
        </div>
      </div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text)] tabular-nums">{value}</span>
        {unit && <span className="text-xs font-semibold text-[var(--color-secondary)] lowercase">{unit}</span>}
      </div>
    </div>
  )
}
