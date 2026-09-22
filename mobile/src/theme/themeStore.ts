import { create } from 'zustand'
import { Appearance, ColorSchemeName } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { ThemeMode, THEME_COLORS, ThemeColors } from './colors'

export type ThemePreference = 'system' | 'midnight' | 'heritage'

const THEME_PREF_KEY = 'mshipping_theme_preference'

export function resolveThemeMode(pref: ThemePreference, colorScheme?: ColorSchemeName): ThemeMode {
  if (pref === 'midnight' || pref === 'heritage') {
    return pref
  }
  const activeScheme = colorScheme ?? Appearance.getColorScheme()
  return activeScheme === 'dark' ? 'midnight' : 'heritage'
}

interface ThemeState {
  preference: ThemePreference
  mode: ThemeMode
  colors: ThemeColors
  isInitialized: boolean
  setPreference: (pref: ThemePreference) => Promise<void>
  setMode: (mode: ThemeMode | ThemePreference) => void
  toggleTheme: () => void
  initializeTheme: () => Promise<void>
}

// Inisialisasi awal sinkron mengikuti tema perangkat sebelum bacaan async SecureStore selesai
const initialSystemScheme = Appearance.getColorScheme()
const initialMode: ThemeMode = initialSystemScheme === 'dark' ? 'midnight' : 'heritage'

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: 'system',
  mode: initialMode,
  colors: THEME_COLORS[initialMode],
  isInitialized: false,

  setPreference: async (pref: ThemePreference) => {
    try {
      await SecureStore.setItemAsync(THEME_PREF_KEY, pref)
    } catch (e) {
      console.warn('Gagal menyimpan preferensi tema ke SecureStore', e)
    }

    const resolved = resolveThemeMode(pref)
    set({
      preference: pref,
      mode: resolved,
      colors: THEME_COLORS[resolved],
    })
  },

  setMode: (modeOrPref) => {
    get().setPreference(modeOrPref)
  },

  toggleTheme: () => {
    const currentMode = get().mode
    const nextMode: ThemeMode = currentMode === 'midnight' ? 'heritage' : 'midnight'
    get().setPreference(nextMode)
  },

  initializeTheme: async () => {
    try {
      const saved = await SecureStore.getItemAsync(THEME_PREF_KEY)
      if (saved === 'midnight' || saved === 'heritage' || saved === 'system') {
        const resolved = resolveThemeMode(saved as ThemePreference)
        set({
          preference: saved as ThemePreference,
          mode: resolved,
          colors: THEME_COLORS[resolved],
          isInitialized: true,
        })
        return
      }

      // Default: 'system' (mengikuti preferensi tema perangkat)
      const resolved = resolveThemeMode('system')
      set({
        preference: 'system',
        mode: resolved,
        colors: THEME_COLORS[resolved],
        isInitialized: true,
      })
    } catch (e) {
      console.warn('Gagal memuat preferensi tema dari SecureStore', e)
      const resolved = resolveThemeMode('system')
      set({
        preference: 'system',
        mode: resolved,
        colors: THEME_COLORS[resolved],
        isInitialized: true,
      })
    }
  },
}))

// Pasang listener perubahan tema sistem perangkat saat mode 'system' aktif
Appearance.addChangeListener(({ colorScheme }) => {
  const currentPref = useThemeStore.getState().preference
  if (currentPref === 'system') {
    const resolved = resolveThemeMode('system', colorScheme)
    useThemeStore.setState({
      mode: resolved,
      colors: THEME_COLORS[resolved],
    })
  }
})
