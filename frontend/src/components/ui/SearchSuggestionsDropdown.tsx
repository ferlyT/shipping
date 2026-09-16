import {
  Receipt,
  User,
  Tag,
  ChevronRight,
  X,
  Truck,
  FileText,
  Phone,
  Building2,
  Box,
  Search,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SuggestionItem {
  type?: string
  title: string
  subtitle?: string
  value: string
}

interface SearchSuggestionsDropdownProps {
  visible: boolean
  suggestions: SuggestionItem[]
  isLoading?: boolean
  title?: string
  onSelect: (item: SuggestionItem) => void
  onClose: () => void
  className?: string
}

export function SearchSuggestionsDropdown({
  visible,
  suggestions,
  isLoading = false,
  title = 'Saran Pencarian',
  onSelect,
  onClose,
  className,
}: SearchSuggestionsDropdownProps) {
  if (!visible) return null

  const getIcon = (type?: string) => {
    switch (type) {
      case 'resi':
        return <Receipt className="w-3.5 h-3.5 text-amber-500" />
      case 'customer':
        return <User className="w-3.5 h-3.5 text-sky-500" />
      case 'marking':
        return <Tag className="w-3.5 h-3.5 text-indigo-500" />
      case 'container':
        return <Box className="w-3.5 h-3.5 text-teal-500" />
      case 'bl_awb':
      case 'sj':
      case 'invoice':
        return <FileText className="w-3.5 h-3.5 text-emerald-500" />
      case 'consignee':
        return <Building2 className="w-3.5 h-3.5 text-purple-500" />
      case 'supir':
        return <User className="w-3.5 h-3.5 text-amber-500" />
      case 'car':
        return <Truck className="w-3.5 h-3.5 text-sky-500" />
      case 'code':
        return <Tag className="w-3.5 h-3.5 text-blue-500" />
      case 'contact':
        return <Phone className="w-3.5 h-3.5 text-emerald-500" />
      default:
        return <Search className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
    }
  }

  const getBadgeStyle = (type?: string) => {
    switch (type) {
      case 'resi':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
      case 'customer':
        return 'bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400'
      case 'marking':
        return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
      case 'container':
        return 'bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400'
      case 'bl_awb':
      case 'sj':
      case 'invoice':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
      case 'contact':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
      default:
        return 'bg-slate-500/10 border-slate-500/20 text-[var(--color-secondary)]'
    }
  }

  return (
    <div
      className={cn(
        'absolute left-0 right-0 top-full mt-1.5 z-50 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden animate-fadeIn backdrop-blur-md',
        className
      )}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/40 text-[10.5px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
        <span className="flex items-center gap-1.5">
          {title}
          {isLoading && <Loader2 className="w-3 h-3 animate-spin text-[var(--color-tertiary)]" />}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-0.5 rounded hover:bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
          title="Tutup saran"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Suggestion Items */}
      {suggestions.length === 0 && !isLoading ? (
        <div className="px-3 py-3 text-center text-xs text-[var(--color-secondary)] italic">
          Tidak ada saran ditemukan
        </div>
      ) : (
        <div className="max-h-60 overflow-y-auto divide-y divide-[var(--color-border)]">
          {suggestions.map((item, idx) => (
            <button
              key={`${item.type}-${item.value}-${idx}`}
              type="button"
              onClick={() => onSelect(item)}
              className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-[var(--color-neutral)]/60 transition-colors cursor-pointer group"
            >
              <div
                className={cn(
                  'w-6 h-6 rounded-md border flex items-center justify-center shrink-0',
                  getBadgeStyle(item.type)
                )}
              >
                {getIcon(item.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-[var(--color-primary)] truncate group-hover:text-[var(--color-tertiary)] transition-colors">
                  {item.title}
                </div>
                {item.subtitle && (
                  <div className="text-[10.5px] text-[var(--color-secondary)] truncate">
                    {item.subtitle}
                  </div>
                )}
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--color-secondary)]/50 group-hover:text-[var(--color-primary)] transition-colors shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
