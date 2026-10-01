/**
 * Utility functions for App Version module
 */

/**
 * Format raw bytes into human-readable size string (B, KB, MB, GB)
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`
}

/**
 * Compare two semver strings (e.g. "1.2.3" vs "1.2.4")
 * Returns:
 *  -1 if v1 < v2
 *   0 if v1 === v2
 *   1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const p1 = (v1 || '').split('.').map((n) => parseInt(n, 10) || 0)
  const p2 = (v2 || '').split('.').map((n) => parseInt(n, 10) || 0)
  const maxLen = Math.max(p1.length, p2.length)

  for (let i = 0; i < maxLen; i++) {
    const num1 = p1[i] || 0
    const num2 = p2[i] || 0
    if (num1 > num2) return 1
    if (num1 < num2) return -1
  }

  return 0
}

/**
 * Checks whether client version is strictly below the minimum required version
 */
export function isVersionOutdated(clientVersion: string, minVersion: string): boolean {
  return compareVersions(clientVersion, minVersion) < 0
}
