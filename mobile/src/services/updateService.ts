import apiClient from '../api/client'
import type { AppVersionData, AppVersionResponse } from '../types/update'

export const updateService = {
  /**
   * Mengambil data versi aplikasi terbaru dari backend
   */
  async getLatestVersion(): Promise<AppVersionData> {
    const res = await apiClient.get<AppVersionResponse>('/app-version/latest')
    return res.data.data
  },

  /**
   * Membandingkan dua format versi semantik (misal "1.0.1" vs "1.0.0")
   * Mengembalikan:
   *  1 jika v1 > v2 (v1 lebih baru)
   * -1 jika v1 < v2 (v1 lebih lama)
   *  0 jika v1 === v2
   */
  compareVersions(v1: string, v2: string): number {
    const cleanV1 = v1.replace(/[^0-9.]/g, '')
    const cleanV2 = v2.replace(/[^0-9.]/g, '')

    const p1 = cleanV1.split('.').map((n) => parseInt(n, 10) || 0)
    const p2 = cleanV2.split('.').map((n) => parseInt(n, 10) || 0)

    const len = Math.max(p1.length, p2.length)
    for (let i = 0; i < len; i++) {
      const num1 = p1[i] ?? 0
      const num2 = p2[i] ?? 0
      if (num1 > num2) return 1
      if (num1 < num2) return -1
    }
    return 0
  },

  /**
   * Cek apakah versi server lebih baru dari versi terpasang
   */
  isNewer(currentVersion: string, latestVersion: string): boolean {
    return this.compareVersions(latestVersion, currentVersion) > 0
  },
}
