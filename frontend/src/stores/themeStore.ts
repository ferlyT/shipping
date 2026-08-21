import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeId = 'heritage' | 'ocean' | 'emerald' | 'amber' | 'midnight'

export interface ThemeConfig {
  id: ThemeId
  nameKey: string
  label: string
  primaryColor: string
  accentColor: string
  bgColor: string
  surfaceColor: string
  isDark?: boolean
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'heritage',
    nameKey: 'theme.heritage',
    label: 'Heritage Terracotta',
    primaryColor: '#1A1C1E',
    accentColor: '#B8422E',
    bgColor: '#F7F5F2',
    surfaceColor: '#FFFFFF',
  },
  {
    id: 'ocean',
    nameKey: 'theme.ocean',
    label: 'Ocean Cobalt',
    primaryColor: '#0F172A',
    accentColor: '#2563EB',
    bgColor: '#F1F5F9',
    surfaceColor: '#FFFFFF',
  },
  {
    id: 'emerald',
    nameKey: 'theme.emerald',
    label: 'Emerald Forest',
    primaryColor: '#132E22',
    accentColor: '#16A34A',
    bgColor: '#F0FDF4',
    surfaceColor: '#FFFFFF',
  },
  {
    id: 'amber',
    nameKey: 'theme.amber',
    label: 'Warm Amber',
    primaryColor: '#291E14',
    accentColor: '#D97706',
    bgColor: '#FDFBF7',
    surfaceColor: '#FFFFFF',
  },
  {
    id: 'midnight',
    nameKey: 'theme.midnight',
    label: 'Midnight Dark',
    primaryColor: '#F1F5F9',
    accentColor: '#38BDF8',
    bgColor: '#0B0F17',
    surfaceColor: '#151D2A',
    isDark: true,
  },
]

interface ThemeState {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
}

function applyThemeToDOM(theme: ThemeId) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
  if (theme === 'midnight') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'heritage',
      setTheme: (theme: ThemeId) => {
        applyThemeToDOM(theme)
        set({ theme })
      },
    }),
    {
      name: 'mshipping-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeToDOM(state.theme)
        }
      },
    }
  )
)

// Initial execution on script load
if (typeof document !== 'undefined') {
  try {
    const raw = localStorage.getItem('mshipping-theme')
    if (raw) {
      const parsed = JSON.parse(raw)
      const t = parsed.state?.theme || 'heritage'
      applyThemeToDOM(t)
    } else {
      applyThemeToDOM('heritage')
    }
  } catch {
    applyThemeToDOM('heritage')
  }
}
