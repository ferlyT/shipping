import { cn } from '@/lib/utils'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
  title?: string
}

const styles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--color-neutral)] text-[var(--color-secondary)] border-[var(--color-border)]',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  danger:  'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
  info:    'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
}

export function Badge({ variant = 'default', children, className, title }: BadgeProps) {
  return (
    <span
      title={title}
      data-component="badge"
      data-variant={variant}
      className={cn(
        'app-badge inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-[var(--radius-sm)] font-[var(--font-label)] tracking-wide uppercase transition-colors',
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
