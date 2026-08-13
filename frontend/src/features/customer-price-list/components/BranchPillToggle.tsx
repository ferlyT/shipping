interface BranchPillToggleProps {
  value: string
  onChange: (v: string) => void
  options: string[]
}

export function BranchPillToggle({
  value,
  onChange,
  options,
}: BranchPillToggleProps) {
  return (
    <div className="flex flex-col gap-1.5 items-start">
      <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-[var(--color-secondary)] uppercase">
        CABANG
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {options.map((o) => {
          const active = value === o
          return (
            <button
              key={o}
              type="button"
              onClick={() => onChange(active ? '' : o)}
              aria-pressed={active}
              className={`px-3.5 min-w-[2.6rem] h-9 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex items-center justify-center cursor-pointer ${
                active
                  ? 'bg-[var(--color-tertiary)] border-[var(--color-tertiary)] text-white shadow-xs'
                  : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]'
              }`}
            >
              {o}
            </button>
          )
        })}
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs font-medium text-[var(--color-tertiary)] hover:underline ml-0.5 cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  )
}
