import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SearchSuggestionsDropdown, type SuggestionItem } from './SearchSuggestionsDropdown'

export type { SuggestionItem }

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  suggestions?: SuggestionItem[]
  isLoadingSuggestions?: boolean
  suggestionTitle?: string
  onSelectSuggestion?: (item: SuggestionItem) => void
  onFocus?: () => void
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  className,
  suggestions = [],
  isLoadingSuggestions = false,
  suggestionTitle,
  onSelectSuggestion,
  onFocus,
}: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const hasSuggestions = Boolean(suggestions && suggestions.length > 0)
  const shouldShowDropdown = isOpen && value.trim().length >= 2 && (hasSuggestions || isLoadingSuggestions)

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-secondary)] pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          if (e.target.value.trim().length >= 2) {
            setIsOpen(true)
          } else {
            setIsOpen(false)
          }
        }}
        onFocus={() => {
          if (value.trim().length >= 2) {
            setIsOpen(true)
          }
          if (onFocus) onFocus()
        }}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-primary)] placeholder:text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors shadow-2xs font-medium"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('')
            setIsOpen(false)
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Suggestion Dropdown */}
      <SearchSuggestionsDropdown
        visible={shouldShowDropdown}
        suggestions={suggestions}
        isLoading={isLoadingSuggestions}
        title={suggestionTitle}
        onSelect={(item) => {
          if (onSelectSuggestion) {
            onSelectSuggestion(item)
          } else {
            onChange(item.value)
          }
          setIsOpen(false)
        }}
        onClose={() => setIsOpen(false)}
      />
    </div>
  )
}
