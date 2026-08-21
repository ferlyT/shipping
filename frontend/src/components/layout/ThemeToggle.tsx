import { useState, useRef, useEffect } from 'react'
import { Palette, Check, Sparkles } from 'lucide-react'
import { useThemeStore, THEMES, type ThemeId } from '@/stores/themeStore'
import { useTranslation } from '@/hooks/useTranslation'

interface ThemeToggleProps {
  align?: 'left' | 'right' | 'auto'
}

export function ThemeToggle({ align = 'auto' }: ThemeToggleProps) {
  const { theme, setTheme } = useThemeStore()
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentThemeConfig = THEMES.find((th) => th.id === theme) || THEMES[0]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (id: ThemeId) => {
    setTheme(id)
    setIsOpen(false)
  }

  const dropdownAlignmentClass =
    align === 'right'
      ? 'right-0'
      : align === 'left'
      ? 'left-0'
      : 'left-0 sm:left-auto sm:right-0'

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={t('theme.title')}
        className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 transition-all duration-200 select-none cursor-pointer"
        aria-expanded={isOpen}
      >
        <span
          className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border border-black/15 shadow-2xs shrink-0"
          style={{ backgroundColor: currentThemeConfig.accentColor }}
        />
        <Palette className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
        <span className="hidden md:inline font-medium text-[11px]">
          {t(currentThemeConfig.nameKey)}
        </span>
      </button>

      {isOpen && (
        <div className={`absolute ${dropdownAlignmentClass} mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl p-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-150`}>
          <div className="px-2.5 py-1.5 border-b border-[var(--color-border)] mb-1 flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[var(--color-secondary)] flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[var(--color-tertiary)]" />
              {t('theme.selectTheme')}
            </span>
          </div>

          <div className="space-y-0.5">
            {THEMES.map((th) => {
              const isSelected = th.id === theme
              return (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => handleSelect(th.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--color-neutral)] text-[var(--color-primary)] font-bold shadow-2xs'
                      : 'text-[var(--color-secondary)] hover:bg-[var(--color-neutral)] hover:text-[var(--color-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex items-center -space-x-1 shrink-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs z-10"
                        style={{ backgroundColor: th.accentColor }}
                        title="Accent"
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs"
                        style={{ backgroundColor: th.primaryColor }}
                        title="Primary"
                      />
                    </div>
                    <span className="font-semibold text-xs text-[var(--color-primary)] truncate">
                      {t(th.nameKey)}
                    </span>
                  </div>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-[var(--color-tertiary)] shrink-0 ml-2" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
