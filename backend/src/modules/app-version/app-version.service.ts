import path from 'path'
import fs from 'fs/promises'
import { logger } from '../../config/logger'
import type { AppVersionConfig, AppVersionResponse } from './app-version.types'

const DEFAULT_CONFIG: AppVersionConfig = {
  version: '1.0.1',
  versionCode: 2,
  minVersion: '1.0.0',
  forceUpdate: false,
  downloadUrl: 'http://36.93.22.142/mshipping/mshipping.apk',
  webDownloadUrl: 'http://36.93.22.142/mshipping/download/',
  releaseNotes: [
    'Pembaruan tata letak navigasi bawah Android',
    'Penambahan fitur auto update versi aplikasi',
    'Peningkatan stabilitas koneksi jaringan ERP',
  ],
  publishedAt: new Date().toISOString(),
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`
}

export class AppVersionService {
  private static configPath = path.join(process.cwd(), 'src', 'config', 'app-version.json')

  /**
   * Mendapatkan informasi versi aplikasi mobile terbaru beserta status berkas APK
   */
  static async getLatestVersion(): Promise<AppVersionResponse> {
    let config: AppVersionConfig = { ...DEFAULT_CONFIG }

    try {
      const fileContent = await fs.readFile(this.configPath, 'utf-8')
      const parsed = JSON.parse(fileContent)
      config = { ...config, ...parsed }
    } catch (error) {
      logger.warn('Tidak dapat membaca app-version.json, menggunakan konfigurasi bawaan')
    }

    // Deteksi ukuran file fisik APK
    let fileSize: number | undefined
    let hasApk = false

    const candidatePaths = [
      path.join(process.cwd(), 'public', 'uploads', 'mshipping.apk'),
      path.join(process.cwd(), '..', 'frontend', 'dist', 'mshipping.apk'),
      path.join(process.cwd(), '..', 'mshipping.apk'),
    ]

    for (const apkPath of candidatePaths) {
      try {
        const stat = await fs.stat(apkPath)
        if (stat.isFile() && stat.size > 0) {
          fileSize = stat.size
          hasApk = true
          break
        }
      } catch {
        // Lanjutkan ke path berikutnya
      }
    }

    return {
      ...config,
      fileSize,
      formattedSize: fileSize ? formatFileSize(fileSize) : undefined,
      hasApk,
    }
  }
}
