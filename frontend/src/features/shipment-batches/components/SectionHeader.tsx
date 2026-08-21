import { type LucideIcon, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SectionHeaderProps {
  icon: LucideIcon
  label: string
  colorClass?: string
  collapsible?: boolean
  isOpen?: boolean
  onToggle?: () => void
  badgeText?: string
}

export function SectionHeader({
  icon: Icon,
  label,
  colorClass = 'text-[var(--color-secondary)]',
  collapsible = false,
  isOpen = true,
  onToggle,
  badgeText,
}: SectionHeaderProps) {
  const content = (
    <>
      <Icon className={cn("h-3.5 w-3.5 shrink-0", colorClass)} />
      <span className={cn("font-[var(--font-label)] text-xs tracking-[0.08em] uppercase font-semibold", colorClass)}>
        {label}
      </span>
      {badgeText && (
        <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)] font-normal">
          {badgeText}
        </span>
      )}
      {collapsible && (
        isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 text-[var(--color-secondary)] ml-auto" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-[var(--color-secondary)] ml-auto" />
        )
      )}
    </>
  )

  if (collapsible) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 mb-2.5 px-0.5 py-0.5 text-left cursor-pointer hover:opacity-80 transition-opacity"
        aria-expanded={isOpen}
      >
        {content}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5 mb-2.5 px-0.5">
      {content}
    </div>
  )
}
