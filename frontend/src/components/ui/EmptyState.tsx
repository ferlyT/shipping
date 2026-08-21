import type { ReactNode } from 'react'
import { PackageOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)]/50', className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-neutral)] text-[var(--color-secondary)] mb-4 shadow-inner">
        {icon || <PackageOpen className="w-7 h-7" />}
      </div>
      <h3 className="text-base font-semibold text-[var(--color-primary)] font-[var(--font-display)]">{title}</h3>
      {description && <p className="mt-1 text-sm text-[var(--color-secondary)] max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
