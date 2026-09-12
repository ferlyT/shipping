export interface AppVersionConfig {
  version: string
  versionCode: number
  minVersion: string
  forceUpdate: boolean
  downloadUrl: string
  webDownloadUrl?: string
  releaseNotes: string[]
  publishedAt: string
}

export interface AppVersionResponse extends AppVersionConfig {
  fileSize?: number
  formattedSize?: string
  hasApk: boolean
}
