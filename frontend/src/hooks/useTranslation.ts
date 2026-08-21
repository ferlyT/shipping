import { useLangStore, type Lang } from '@/stores/langStore'
import idDict from '@/lib/i18n/id.json'
import enDict from '@/lib/i18n/en.json'

type DictKey = keyof typeof idDict

const dictMap: Record<Lang, Record<string, string>> = {
  id: idDict as Record<string, string>,
  en: enDict as Record<string, string>,
}

/**
 * Hook terjemahan i18n.
 * Mengembalikan fungsi `t(key, vars)` dan state bahasa aktif (`lang`, `setLang`, `toggleLang`).
 */
export function useTranslation() {
  const { lang, setLang, toggleLang } = useLangStore()
  const dict = dictMap[lang] ?? idDict

  function t(key: DictKey | (string & {}), vars?: Record<string, string | number>): string {
    let result = dict[key] ?? idDict[key as DictKey] ?? key
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        result = result.replace(`{${k}}`, String(v))
      })
    }
    return result
  }

  return { t, lang, setLang, toggleLang }
}
