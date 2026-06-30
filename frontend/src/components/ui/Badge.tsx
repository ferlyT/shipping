import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const styles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--color-neutral)] text-[var(--color-secondary)] border-[var(--color-border)]',
  success: 'bg-green-50 text-[var(--color-success)] border-green-200',
  warning: 'bg-yellow-50 text-[var(--color-warning)] border-yellow-200',
  danger:  'bg-red-50 text-[var(--color-tertiary)] border-red-200',
  info:    'bg-blue-50 text-blue-700 border-blue-200',
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-[var(--radius-sm)] font-[var(--font-label)] tracking-wide uppercase',
      styles[variant],
      className
    )}>
      {children}
    </span>
  )
}
