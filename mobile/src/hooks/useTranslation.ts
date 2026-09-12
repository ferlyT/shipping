import { create } from 'zustand'
import idTranslations from '../lib/i18n/id.json'
import enTranslations from '../lib/i18n/en.json'

export type Language = 'id' | 'en'

const translations: Record<Language, Record<string, string>> = {
  id: idTranslations as Record<string, string>,
  en: enTranslations as Record<string, string>,
}

interface LanguageState {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'id',
  setLanguage: (lang) => set({ language: lang }),
  toggleLanguage: () => set((state) => ({ language: state.language === 'id' ? 'en' : 'id' })),
}))

export function useTranslation() {
  const { language, setLanguage, toggleLanguage } = useLanguageStore()

  const t = (key: string, fallback?: string): string => {
    const currentDict = translations[language]
    if (currentDict && currentDict[key]) {
      return currentDict[key]
    }
    // Fallback to Indonesian if not found in current
    if (language !== 'id' && translations.id[key]) {
      return translations.id[key]
    }
    return fallback ?? key
  }

  return { t, language, setLanguage, toggleLanguage }
}
