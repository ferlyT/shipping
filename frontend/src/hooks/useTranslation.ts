// Hook untuk internasionalisasi (i18n) tanpa library eksternal
// Naming convention: camelCase dengan awalan use ✅

import { useLangStore } from '@/stores/langStore'
import idDict from '@/lib/i18n/id.json'
import enDict from '@/lib/i18n/en.json'

type Dict = typeof idDict

const dictMap: Record<string, Dict> = {
  id: idDict,
  en: enDict as unknown as Dict,
}

/**
 * Hook terjemahan. Mengembalikan fungsi `t(key)` yang mengembalikan string
 * sesuai bahasa aktif. Jika key tidak ditemukan, key itu sendiri dikembalikan.
 *
 * Contoh penggunaan:
 *   const { t } = useTranslation()
 *   <span>{t('common.close')}</span>
 */
export function useTranslation() {
  const { lang } = useLangStore()
  const dict = dictMap[lang] ?? idDict

  function t(key: keyof typeof idDict, vars?: Record<string, string | number>): string {
    let result: string = (dict as Record<string, string>)[key] ?? key
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        result = result.replace(`{${k}}`, String(v))
      })
    }
    return result
  }

  return { t, lang }
}
