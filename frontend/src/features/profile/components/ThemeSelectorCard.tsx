import { Palette, Check } from 'lucide-react'
import { useThemeStore, THEMES, type ThemeId } from '@/stores/themeStore'
import { useTranslation } from '@/hooks/useTranslation'
import { Badge } from '@/components/ui/Badge'

export function ThemeSelectorCard() {
  const { theme, setTheme } = useThemeStore()
  const { t } = useTranslation()

  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] border border-[var(--color-border)] p-6 shadow-xs flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div>
          <h3 className="font-[var(--font-display)] text-base sm:text-lg font-semibold text-[var(--color-primary)] flex items-center gap-2">
            <Palette className="w-5 h-5 text-[var(--color-tertiary)]" />
            {t('theme.themePreference')}
          </h3>
          <p className="text-xs text-[var(--color-secondary)] mt-0.5">
            {t('theme.themePreferenceSubtitle')}
          </p>
        </div>
      </div>

      {/* Grid of Theme Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {THEMES.map((th) => {
          const isSelected = th.id === theme
          return (
            <button
              key={th.id}
              type="button"
              onClick={() => setTheme(th.id as ThemeId)}
              className={`p-4 rounded-[var(--radius-lg)] border text-left transition-all relative flex flex-col justify-between gap-4 cursor-pointer group ${
                isSelected
                  ? 'border-[var(--color-tertiary)] ring-2 ring-[var(--color-tertiary)]/20 bg-[var(--color-neutral)] shadow-sm'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)] hover:shadow-xs'
              }`}
            >
              {/* Top Row: Title & Active Badge */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-[var(--color-primary)] font-[var(--font-display)]">
                    {t(th.nameKey)}
                  </h4>
                  <p className="text-xs text-[var(--color-secondary)] mt-1 leading-relaxed">
                    {t(`${th.nameKey}Desc`)}
                  </p>
                </div>
                {isSelected && (
                  <Badge variant="default" className="shrink-0 flex items-center gap-1">
                    <Check className="w-3 h-3 text-[var(--color-tertiary)]" />
                    {t('theme.active')}
                  </Badge>
                )}
              </div>

              {/* Color Swatch Preview */}
              <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Primary Color Swatch */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-5 h-5 rounded-md border border-black/10 shadow-xs block"
                      style={{ backgroundColor: th.primaryColor }}
                      title="Primary"
                    />
                    <span className="text-[10px] font-mono text-[var(--color-secondary)] uppercase">
                      Primary
                    </span>
                  </div>

                  {/* Accent Color Swatch */}
                  <div className="flex items-center gap-1.5 ml-2">
                    <span
                      className="w-5 h-5 rounded-md border border-black/10 shadow-xs block"
                      style={{ backgroundColor: th.accentColor }}
                      title="Accent"
                    />
                    <span className="text-[10px] font-mono text-[var(--color-secondary)] uppercase">
                      Accent
                    </span>
                  </div>
                </div>

                {/* Surface / BG Mini Box */}
                <div
                  className="w-12 h-6 rounded border border-black/10 flex items-center justify-center text-[9px] font-mono font-bold shadow-xs shrink-0"
                  style={{
                    backgroundColor: th.bgColor,
                    color: th.isDark ? '#FFFFFF' : '#1A1C1E',
                  }}
                >
                  BG
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
