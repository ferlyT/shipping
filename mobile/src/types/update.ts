export interface AppVersionData {
  version: string
  versionCode: number
  minVersion: string
  forceUpdate: boolean
  downloadUrl: string
  webDownloadUrl?: string
  releaseNotes: string[]
  publishedAt: string
  fileSize?: number
  formattedSize?: string
  hasApk: boolean
}

export interface AppVersionResponse {
  success: boolean
  data: AppVersionData
}
