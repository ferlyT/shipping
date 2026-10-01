import { describe, it, expect } from 'bun:test'
import {
  formatFileSize,
  compareVersions,
  isVersionOutdated,
} from './app-version.utils'

describe('App Version Module', () => {
  describe('formatFileSize helper', () => {
    it('returns "0 B" for 0 or negative byte values', () => {
      expect(formatFileSize(0)).toBe('0 B')
      expect(formatFileSize(-100)).toBe('0 B')
    })

    it('formats bytes under 1 KB', () => {
      expect(formatFileSize(512)).toBe('512 B')
      expect(formatFileSize(1000)).toBe('1000 B')
    })

    it('formats kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(2048)).toBe('2 KB')
    })

    it('formats megabytes with decimal precision', () => {
      const fifteenMb = 15 * 1024 * 1024
      expect(formatFileSize(fifteenMb)).toBe('15.0 MB')

      const fifteenPointFiveMb = Math.round(15.5 * 1024 * 1024)
      expect(formatFileSize(fifteenPointFiveMb)).toBe('15.5 MB')
    })

    it('formats gigabytes with decimal precision', () => {
      const twoGb = 2 * 1024 * 1024 * 1024
      expect(formatFileSize(twoGb)).toBe('2.0 GB')
    })
  })

  describe('compareVersions helper', () => {
    it('returns -1 when v1 is less than v2', () => {
      expect(compareVersions('1.0.0', '1.0.1')).toBe(-1)
      expect(compareVersions('1.0.9', '1.1.0')).toBe(-1)
      expect(compareVersions('0.9.5', '1.0.0')).toBe(-1)
    })

    it('returns 1 when v1 is greater than v2', () => {
      expect(compareVersions('1.0.2', '1.0.1')).toBe(1)
      expect(compareVersions('2.0.0', '1.9.9')).toBe(1)
      expect(compareVersions('1.1.0', '1.0.9')).toBe(1)
    })

    it('returns 0 when versions are equal', () => {
      expect(compareVersions('1.0.1', '1.0.1')).toBe(0)
      expect(compareVersions('1.0', '1.0.0')).toBe(0)
    })
  })

  describe('isVersionOutdated helper', () => {
    it('returns true when client version is strictly lower than minimum required version', () => {
      expect(isVersionOutdated('1.0.0', '1.0.1')).toBe(true)
      expect(isVersionOutdated('0.9.8', '1.0.0')).toBe(true)
    })

    it('returns false when client version is equal to or higher than minimum required version', () => {
      expect(isVersionOutdated('1.0.1', '1.0.1')).toBe(false)
      expect(isVersionOutdated('1.0.2', '1.0.1')).toBe(false)
      expect(isVersionOutdated('2.0.0', '1.0.1')).toBe(false)
    })
  })
})
