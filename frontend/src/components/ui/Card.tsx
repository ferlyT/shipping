import { isValidElement, type ComponentType, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'bordered' | 'glass' | 'accent'
  accentColor?: string
  onClick?: () => void
}

export function Card({
  children,
  className,
  variant = 'default',
  accentColor,
  onClick,
}: CardProps) {
  const variantStyles = {
    default: 'bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm',
    bordered: 'bg-[var(--color-surface)] border border-[var(--color-border-strong)] shadow-sm',
    glass: 'bg-white/80 backdrop-blur-md border border-white/20 shadow-md',
    accent: 'bg-[var(--color-surface)] border border-[var(--color-border)] border-l-4 shadow-sm',
  }

  return (
    <div
      onClick={onClick}
      style={accentColor ? { borderLeftColor: accentColor } : undefined}
      className={cn(
        'rounded-2xl transition-all duration-200 overflow-hidden flex flex-col h-full',
        variantStyles[variant],
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5',
        className
      )}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

Card.Header = function CardHeader({ title, subtitle, icon, action, className }: CardHeaderProps) {
  const renderIcon = () => {
    if (!icon) return null
    if (isValidElement(icon)) return icon
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && 'render' in icon)) {
      const Component = icon as unknown as ComponentType<{ className?: string }>
      return <Component className="w-5 h-5" />
    }
    return icon
  }

  return (
    <div className={cn('p-4 sm:p-5 border-b border-[var(--color-border)] flex items-center justify-between gap-3 sm:gap-4 flex-shrink-0', className)}>
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {icon && <div className="p-2 rounded-xl bg-[var(--color-neutral)] text-[var(--color-primary)] flex-shrink-0">{renderIcon()}</div>}
        <div className="min-w-0">
          <h3 className="font-semibold text-[var(--color-primary)] font-[var(--font-display)] text-sm sm:text-base tracking-tight leading-tight truncate">{title}</h3>
          {subtitle && <p className="text-xs text-[var(--color-secondary)] mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

Card.Body = function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-4 sm:p-5 flex-1', className)}>{children}</div>
}

Card.Footer = function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('px-4 py-3 sm:px-5 border-t border-[var(--color-border)] bg-[var(--color-neutral)]/40 flex items-center justify-between text-xs text-[var(--color-secondary)] mt-auto flex-shrink-0', className)}>
      {children}
    </div>
  )
}
