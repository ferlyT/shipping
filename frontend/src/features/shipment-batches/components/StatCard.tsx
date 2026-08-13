import { type LucideIcon, Plane, Ship } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StatCardProps {
  icon: LucideIcon
  iconColorClass?: string
  label: string
  value: string | number
  unit?: string
  isLoading?: boolean
  onClick?: () => void
  actionLabel?: string
  variant?: 'default' | 'warning' | 'danger' | 'success' | 'info' | 'purple'
  airValue?: string | number
  seaValue?: string | number
}

const VARIANT_BORDER_HOVER: Record<NonNullable<StatCardProps['variant']>, string> = {
  default: 'hover:border-indigo-400',
  warning: 'hover:border-amber-400',
  danger: 'hover:border-rose-400',
  success: 'hover:border-emerald-400',
  info: 'hover:border-blue-400',
  purple: 'hover:border-purple-400',
}

const VARIANT_BG_ICON: Record<NonNullable<StatCardProps['variant']>, string> = {
  default: 'text-indigo-500',
  warning: 'text-amber-500',
  danger: 'text-rose-500',
  success: 'text-emerald-500',
  info: 'text-blue-500',
  purple: 'text-purple-500',
}

export function StatCard({
  icon: Icon,
  iconColorClass,
  label,
  value,
  unit,
  isLoading = false,
  onClick,
  actionLabel,
  variant = 'default',
  airValue,
  seaValue,
}: StatCardProps) {
  const isClickable = Boolean(onClick)
  const hoverBorder = isClickable ? VARIANT_BORDER_HOVER[variant] : ''
  const finalIconColor = iconColorClass || VARIANT_BG_ICON[variant]

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group transition-all flex flex-col justify-between min-h-[110px]",
        isClickable ? `hover:shadow cursor-pointer ${hoverBorder}` : ""
      )}
    >
      {/* Background Watermark Icon */}
      <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
        <Icon className={cn("w-24 h-24", finalIconColor)} />
      </div>

      {/* Header: Icon + Label */}
      <div className="flex items-center gap-2 text-[var(--color-secondary)] relative z-10">
        <Icon className={cn("w-4 h-4 shrink-0", finalIconColor)} />
        <span className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-wider truncate">
          {label}
        </span>
      </div>

      {/* Content & Action Row */}
      <div className="mt-3 flex items-end justify-between relative z-10 gap-2">
        {isLoading ? (
          <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded" />
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-1">
              <h3 className="text-3xl sm:text-[2rem] md:text-[2.2rem] font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums leading-none">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </h3>
              {unit && (
                <span className="text-xs sm:text-[13px] md:text-[14px] font-bold text-[var(--color-secondary)] uppercase">
                  {unit}
                </span>
              )}
            </div>

            {(airValue !== undefined || seaValue !== undefined) && (
              <div className="flex items-center gap-2 text-[11px]">
                {airValue !== undefined && (
                  <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded border border-sky-200/60 font-semibold">
                    <Plane className="w-3 h-3 text-sky-500 shrink-0" />
                    <span>{typeof airValue === 'number' ? airValue.toLocaleString() : airValue}</span>
                  </span>
                )}
                {seaValue !== undefined && (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200/60 font-semibold">
                    <Ship className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>{typeof seaValue === 'number' ? seaValue.toLocaleString() : seaValue}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {actionLabel && !isLoading && (
          <span className="text-[10px] sm:text-[11px] md:text-xs text-[var(--color-secondary)] underline decoration-dashed underline-offset-2 shrink-0 self-end mb-1">
            {actionLabel}
          </span>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// StatCardGroup — SATU card dengan header internal (icon + judul, border-bottom)
// lalu beberapa kolom data polos (label kecil + angka besar + link opsional)
// di bawahnya, dipisah divider tipis.
// ─────────────────────────────────────────────────────────────────────────────

export interface StatCardGroupItem {
  label: string
  value: string | number
  unit?: string
  valueColorClass?: string
  isLoading?: boolean
  onClick?: () => void
  actionLabel?: string
  airValue?: string | number
  seaValue?: string | number
}

const ITEMS_FLOW_CLASSES: Record<'sm' | 'lg' | 'xl', string> = {
  sm: 'sm:grid-flow-col sm:auto-cols-fr',
  lg: 'lg:grid-flow-col lg:auto-cols-fr',
  xl: 'xl:grid-flow-col xl:auto-cols-fr',
}
const ITEMS_DIVIDER_CLASSES: Record<'sm' | 'lg' | 'xl', string> = {
  sm: 'border-t sm:border-t-0 sm:border-l',
  lg: 'border-t lg:border-t-0 lg:border-l',
  xl: 'border-t xl:border-t-0 xl:border-l',
}

export interface StatCardGroupProps {
  icon: LucideIcon
  iconColorClass?: string
  title: string
  titleColorClass?: string
  items: StatCardGroupItem[]
  collapsible?: boolean
  isOpen?: boolean
  onToggle?: () => void
  itemsBreakpoint?: 'sm' | 'lg' | 'xl'
}

export function StatCardGroup({
  icon: Icon,
  iconColorClass = 'text-[var(--color-secondary)]',
  title,
  titleColorClass = 'text-[var(--color-secondary)]',
  items,
  collapsible = false,
  isOpen = true,
  onToggle,
  itemsBreakpoint = 'sm',
}: StatCardGroupProps) {
  const headerContent = (
    <>
      <Icon className={cn("h-4 w-4 shrink-0", iconColorClass)} />
      <span className={cn("text-[11px] sm:text-[11.5px] font-bold uppercase tracking-wider", titleColorClass)}>
        {title}
      </span>
    </>
  )

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header internal card */}
      {collapsible ? (
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center gap-2 px-4 sm:px-5 py-3.5 text-left cursor-pointer hover:bg-[var(--color-neutral)]/40 transition-colors border-b border-[var(--color-border)] shrink-0"
          aria-expanded={isOpen}
        >
          {headerContent}
        </button>
      ) : (
        <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 border-b border-[var(--color-border)] shrink-0">
          {headerContent}
        </div>
      )}

      {/* Kolom data */}
      {isOpen && (
        <div className={cn("grid grid-cols-1 flex-1", ITEMS_FLOW_CLASSES[itemsBreakpoint])}>
          {items.map((item, idx) => {
            const isClickable = Boolean(item.onClick)
            return (
              <div
                key={item.label}
                onClick={item.onClick}
                className={cn(
                  "p-4 sm:p-5 flex flex-col justify-between transition-colors",
                  idx > 0 && cn(ITEMS_DIVIDER_CLASSES[itemsBreakpoint], "border-[var(--color-border)]"),
                  isClickable && "cursor-pointer hover:bg-[var(--color-neutral)]/40"
                )}
              >
                <div>
                  <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-[var(--color-secondary)]">
                    {item.label}
                  </span>

                  <div className="mt-1.5">
                    {item.isLoading ? (
                      <div className="h-7 w-14 bg-[var(--color-border)] animate-pulse rounded" />
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <h3 className={cn(
                          "text-2xl sm:text-[1.7rem] font-semibold font-[var(--font-display)] tabular-nums leading-none",
                          item.valueColorClass || "text-[var(--color-primary)]"
                        )}>
                          {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                        </h3>
                        {item.unit && (
                          <span className="text-[11px] font-bold text-[var(--color-secondary)] uppercase">
                            {item.unit}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {(item.airValue !== undefined || item.seaValue !== undefined) && !item.isLoading && (
                    <div className="mt-2.5 flex items-center gap-1.5 flex-wrap text-[11px]">
                      {item.airValue !== undefined && (
                        <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded border border-sky-200/60 font-semibold">
                          <Plane className="w-3 h-3 text-sky-500 shrink-0" />
                          <span>{typeof item.airValue === 'number' ? item.airValue.toLocaleString() : item.airValue}</span>
                        </span>
                      )}
                      {item.seaValue !== undefined && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200/60 font-semibold">
                          <Ship className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>{typeof item.seaValue === 'number' ? item.seaValue.toLocaleString() : item.seaValue}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {item.actionLabel && !item.isLoading && (
                  <span className="mt-2.5 inline-block text-[10px] text-[var(--color-secondary)] underline decoration-dashed underline-offset-2">
                    {item.actionLabel}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
