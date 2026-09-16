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

  const t = (
    key: string,
    fallbackOrParams?: string | Record<string, any>,
    params?: Record<string, any>
  ): string => {
    let fallback: string | undefined
    let interpolations: Record<string, any> | undefined

    if (typeof fallbackOrParams === 'object') {
      interpolations = fallbackOrParams
    } else {
      fallback = fallbackOrParams
      interpolations = params
    }

    const currentDict = translations[language]
    let text =
      currentDict?.[key] ||
      (language !== 'id' ? translations.id[key] : undefined) ||
      fallback ||
      key

    if (interpolations) {
      Object.entries(interpolations).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
      })
    }
    return text
  }

  return { t, language, setLanguage, toggleLanguage }
}
