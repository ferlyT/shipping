import { create } from 'zustand'
import { ThemeMode, THEME_COLORS, ThemeColors } from './colors'

interface ThemeState {
  mode: ThemeMode
  colors: ThemeColors
  setMode: (mode: ThemeMode) => void
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'midnight', // default to midnight dark mode
  colors: THEME_COLORS.midnight,
  setMode: (mode) =>
    set({
      mode,
      colors: THEME_COLORS[mode],
    }),
  toggleTheme: () =>
    set((state) => {
      const nextMode = state.mode === 'midnight' ? 'heritage' : 'midnight'
      return {
        mode: nextMode,
        colors: THEME_COLORS[nextMode],
      }
    }),
}))
