import { Anchor, Plane } from 'lucide-react'

interface ModeSegmentedControlProps {
  value: string
  onChange: (v: string) => void
}

export function ModeSegmentedControl({
  value,
  onChange,
}: ModeSegmentedControlProps) {
  return (
    <div className="flex flex-col gap-1.5 items-start">
      <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-[var(--color-secondary)] uppercase">
        MODE
      </label>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChange(value === 'BY SEA' ? '' : 'BY SEA')}
          aria-pressed={value === 'BY SEA'}
          className={`flex items-center gap-1.5 px-3.5 h-9 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border cursor-pointer ${
            value === 'BY SEA'
              ? 'bg-[var(--color-tertiary)] text-white shadow-xs border-transparent'
              : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]'
          }`}
        >
          <Anchor size={14} />
          BY SEA
        </button>
        <button
          type="button"
          onClick={() => onChange(value === 'BY AIR' ? '' : 'BY AIR')}
          aria-pressed={value === 'BY AIR'}
          className={`flex items-center gap-1.5 px-3.5 h-9 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border cursor-pointer ${
            value === 'BY AIR'
              ? 'bg-[var(--color-tertiary)] text-white shadow-xs border-transparent'
              : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]'
          }`}
        >
          <Plane size={14} />
          BY AIR
        </button>
      </div>
    </div>
  )
}
