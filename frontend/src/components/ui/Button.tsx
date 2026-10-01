import React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading,
    asChild = false,
    children,
    className,
    disabled,
    ...props
  },
  ref
) {
  const base =
    'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none'

  const variants = {
    primary:
      'bg-[var(--color-tertiary)] text-[var(--color-on-primary)] hover:opacity-90 focus:ring-[var(--color-tertiary)] rounded-[var(--radius-md)]',
    secondary:
      'border border-[var(--color-border-strong)] text-[var(--color-primary)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] focus:ring-[var(--color-primary)] rounded-[var(--radius-md)]',
    outline:
      'border border-[var(--color-border)] text-[var(--color-primary)] bg-transparent hover:bg-[var(--color-neutral)] focus:ring-[var(--color-tertiary)] rounded-[var(--radius-md)]',
    ghost:
      'text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] rounded-[var(--radius-md)]',
    danger:
      'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 rounded-[var(--radius-md)]',
  }

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-5 py-2.5 gap-2',
    lg: 'text-base px-6 py-3 gap-2.5',
  }

  const combinedClassName = cn(base, variants[variant], sizes[size], className)
  if (asChild) {
    return (
      <Slot
        ref={ref}
        className={combinedClassName}
        aria-disabled={disabled || isLoading ? true : undefined}
        {...props}
      >
        {children}
      </Slot>
    )
  }

  return (
    <button
      ref={ref}
      className={combinedClassName}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      )}
      {children}
    </button>
  )
})
