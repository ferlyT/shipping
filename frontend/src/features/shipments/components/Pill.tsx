import { cn } from '@/lib/utils'

interface PillProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  title?: string
  className?: string
  isLoading?: boolean
}

export function Pill({
  active,
  onClick,
  children,
  title,
  className = '',
}: PillProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-[5px] rounded-full border text-xs font-medium transition-all duration-150 shrink-0 cursor-pointer select-none',
        active
          ? 'bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs'
          : 'bg-transparent border-[var(--color-border)] text-[var(--color-secondary)] hover:border-[var(--color-tertiary)] hover:text-[var(--color-primary)]',
        className
      )}
    >
      {children}
    </button>
  )
}
