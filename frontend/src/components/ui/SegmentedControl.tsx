interface SegmentedControlOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Buttons stretch to fill the row equally (good for mobile-width toggles) */
  fullWidth?: boolean
  className?: string
}

// NOTE: kalau `SegmentedControl` dari Price List Dashboard sudah ada di project ini
// (disebut di working log sebelumnya), pertimbangkan konsolidasi ke situ supaya tidak
// ada 2 implementasi mirip. Komponen ini dibuat generic supaya gampang di-swap.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  fullWidth = false,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`flex rounded-lg border border-[var(--color-border)] p-0.5 ${
        fullWidth ? 'w-full' : 'shrink-0'
      } ${className}`}
      role="tablist"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            fullWidth ? 'flex-1' : ''
          } ${
            value === opt.value
              ? 'bg-[var(--color-primary)] text-[var(--color-surface)]'
              : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
