import React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  asChild?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  asChild,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary:
      'bg-[var(--color-tertiary)] text-[var(--color-on-primary)] hover:opacity-90 focus:ring-[var(--color-tertiary)] rounded-[var(--radius-md)]',
    secondary:
      'border border-[var(--color-border-strong)] text-[var(--color-primary)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] focus:ring-[var(--color-primary)] rounded-[var(--radius-md)]',
    ghost:
      'text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] rounded-[var(--radius-md)]',
    danger:
      'bg-red-50 text-[var(--color-tertiary)] hover:bg-red-100 border border-[var(--color-tertiary)] rounded-[var(--radius-md)]',
  }

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-5 py-2.5 gap-2',
    lg: 'text-base px-6 py-3 gap-2.5',
  }

  const combinedClassName = cn(base, variants[variant], sizes[size], className)

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>
    return React.cloneElement(child, {
      className: cn(combinedClassName, child.props.className),
    })
  }

  return (
    <button className={combinedClassName} disabled={disabled || isLoading} {...props}>
      {isLoading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
