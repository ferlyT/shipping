import type { ReactNode } from 'react'
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: ReactNode
  className?: string
  badge?: ReactNode
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  className,
  badge,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-[var(--color-border)] mb-6', className)}>
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumb items={breadcrumbs} />}
        <div className="flex items-center gap-3">
          <h1 className="font-[var(--font-display)] font-semibold text-2xl sm:text-3xl tracking-tight text-[var(--color-primary)]">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && <p className="text-sm text-[var(--color-secondary)] mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  )
}
