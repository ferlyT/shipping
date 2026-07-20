// Zustand store untuk manajemen bahasa aplikasi
// Naming convention: camelCase dengan akhiran Store ✅

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Lang = 'id' | 'en'

interface LangState {
  lang: Lang
  setLang: (lang: Lang) => void
  toggleLang: () => void
}

export const useLangStore = create<LangState>()(
  persist(
    (set, get) => ({
      lang: 'id',
      setLang: (lang) => set({ lang }),
      toggleLang: () => set({ lang: get().lang === 'id' ? 'en' : 'id' }),
    }),
    {
      name: 'mshipping-lang',
    }
  )
)
