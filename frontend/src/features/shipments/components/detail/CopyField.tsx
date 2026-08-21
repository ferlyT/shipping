import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CopyFieldProps {
  label: string
  value: string | null | undefined
  fieldKey: string
  copiedField: string | null
  onCopy: (v: string | null | undefined, key: string) => void
  icon?: React.ElementType
  accent?: boolean
}

export function CopyField({
  label,
  value,
  fieldKey,
  copiedField,
  onCopy,
  icon: Icon,
  accent = false,
}: CopyFieldProps) {
  const isCopied = copiedField === fieldKey

  return (
    <div className="flex items-center justify-between gap-3 py-3 px-4 rounded-xl hover:bg-[var(--color-neutral)] transition-colors group">
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-[var(--color-neutral)] flex items-center justify-center shrink-0 text-[var(--color-secondary)] group-hover:text-[var(--color-text)] transition-colors">
            <Icon size={14} />
          </div>
        )}
        <span className="text-xs font-medium text-[var(--color-secondary)] truncate">{label}</span>
      </div>

      {value ? (
        <button
          type="button"
          onClick={() => onCopy(value, fieldKey)}
          className={cn(
            'flex items-center gap-1.5 text-right font-medium text-xs sm:text-[13px] py-1 px-2 rounded-md transition-all cursor-pointer',
            isCopied
              ? 'bg-emerald-500/10 text-emerald-500'
              : accent
                ? 'text-[var(--color-tertiary)] hover:bg-[var(--color-tertiary)]/5'
                : 'text-[var(--color-text)] hover:bg-[var(--color-neutral)]'
          )}
          title="Klik untuk menyalin"
        >
          <span className="truncate max-w-[210px] font-semibold">{value}</span>
          {isCopied ? (
            <Check size={13} className="text-emerald-500 shrink-0" />
          ) : (
            <Copy size={13} className="text-[var(--color-border)] opacity-60 group-hover:opacity-100 group-hover:text-[var(--color-secondary)] shrink-0 transition-all" />
          )}
        </button>
      ) : (
        <span className="text-xs text-[var(--color-border)] font-medium px-2 py-1">—</span>
      )}
    </div>
  )
}
