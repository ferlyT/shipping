import { describe, expect, it } from 'bun:test'
import idTranslations from './i18n/id.json'
import enTranslations from './i18n/en.json'

describe('Frontend i18n Dictionary Parity', () => {
  it('has identical keys in both id.json and en.json', () => {
    const idKeys = Object.keys(idTranslations).sort()
    const enKeys = Object.keys(enTranslations).sort()

    const missingInEn = idKeys.filter((k) => !(k in enTranslations))
    const missingInId = enKeys.filter((k) => !(k in idTranslations))

    expect(missingInEn).toEqual([])
    expect(missingInId).toEqual([])
    expect(idKeys.length).toBe(enKeys.length)
  })

  it('contains non-empty translation strings for all keys', () => {
    for (const [k, v] of Object.entries(idTranslations)) {
      expect(typeof v).toBe('string')
      expect((v as string).trim().length).toBeGreaterThan(0)
    }
    for (const [k, v] of Object.entries(enTranslations)) {
      expect(typeof v).toBe('string')
      expect((v as string).trim().length).toBeGreaterThan(0)
    }
  })
})
