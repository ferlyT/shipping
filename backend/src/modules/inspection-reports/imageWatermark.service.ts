import sharp from 'sharp'
import { logger } from '../../config/logger'

export interface BapWatermarkMetadata {
  markingCode?: string | null
  markingNo?: string | null
  custName: string
  terima?: string | null
  reportNumber: string
  timestamp?: Date
}

export function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function formatDateWIB(date: Date): string {
  const d = new Date(date.getTime() + 7 * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const day = pad(d.getUTCDate())
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ]
  const month = monthNames[d.getUTCMonth()]
  const year = d.getUTCFullYear()
  const hours = pad(d.getUTCHours())
  const minutes = pad(d.getUTCMinutes())
  const seconds = pad(d.getUTCSeconds())
  return `${day} ${month} ${year}, ${hours}:${minutes}:${seconds} WIB`
}

/**
 * Composite a crisp, high-contrast BAP metadata watermark banner onto the bottom of the photo.
 */
export async function applyBapWatermark(
  imageBuffer: Buffer,
  metadata: BapWatermarkMetadata
): Promise<Buffer> {
  try {
    // Auto-rotate based on EXIF and resize to max 1600x1600 (aspect ratio preserved)
    const normalizedBuffer = await sharp(imageBuffer)
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer()

    const rotatedImg = sharp(normalizedBuffer)
    const normMeta = await rotatedImg.metadata()
    const width = normMeta.width || 1200
    const height = normMeta.height || 1600

    // Calculate proportional sizing based on image width
    // Base reference: 1200px width -> banner height ~140px, font sizes ~22px / ~18px / ~15px
    const scale = Math.max(0.6, Math.min(2.5, width / 1200))
    const bannerHeight = Math.round(145 * scale)
    const paddingX = Math.round(24 * scale)
    const fontSizeTitle = Math.round(22 * scale)
    const fontSizeBody = Math.round(18 * scale)
    const fontSizeSub = Math.round(15 * scale)
    const iconSize = Math.round(16 * scale)

    const markingStr = metadata.markingCode ? metadata.markingCode.trim() : '—'
    const markingNoStr = metadata.markingNo ? ` (No: ${metadata.markingNo.trim()})` : ''
    const fullMarking = `${markingStr}${markingNoStr}`
    const custStr = metadata.custName.trim()
    const resiStr = metadata.terima ? metadata.terima.trim() : '—'
    const reportNumStr = metadata.reportNumber.trim()
    const timeStr = formatDateWIB(metadata.timestamp || new Date())

    const safeMarking = escapeXml(fullMarking)
    const safeCust = escapeXml(custStr)
    const safeResi = escapeXml(resiStr)
    const safeReportNum = escapeXml(reportNumStr)
    const safeTime = escapeXml(timeStr)

    // Row positions inside banner (relative to banner top)
    const row1Y = Math.round(36 * scale)
    const row2Y = Math.round(76 * scale)
    const row3Y = Math.round(116 * scale)

    const accentBarHeight = Math.max(3, Math.round(4 * scale))

    // Create SVG banner overlay
    const svgOverlay = `
      <svg width="${width}" height="${bannerHeight}" viewBox="0 0 ${width} ${bannerHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bannerBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#000000" stop-opacity="0.88" />
            <stop offset="100%" stop-color="#0A0F1D" stop-opacity="0.94" />
          </linearGradient>
          <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#0284C7" />
            <stop offset="50%" stop-color="#38BDF8" />
            <stop offset="100%" stop-color="#10B981" />
          </linearGradient>
        </defs>

        <!-- Top Accent Border Line -->
        <rect x="0" y="0" width="${width}" height="${accentBarHeight}" fill="url(#accentGradient)" />

        <!-- Banner Dark Background -->
        <rect x="0" y="${accentBarHeight}" width="${width}" height="${bannerHeight - accentBarHeight}" fill="url(#bannerBg)" />

        <!-- Row 1: MARKING (Amber/Bold) & CUSTOMER (White) -->
        <text x="${paddingX}" y="${row1Y}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSizeTitle}" font-weight="bold">
          <tspan fill="#F59E0B">MARKING: </tspan>
          <tspan fill="#FFFFFF">${safeMarking}</tspan>
          <tspan fill="#64748B">   |   </tspan>
          <tspan fill="#38BDF8">CUST: </tspan>
          <tspan fill="#FFFFFF">${safeCust}</tspan>
        </text>

        <!-- Row 2: RESI & NO. BAP -->
        <text x="${paddingX}" y="${row2Y}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSizeBody}" font-weight="600">
          <tspan fill="#94A3B8">RESI: </tspan>
          <tspan fill="#E2E8F0">${safeResi}</tspan>
          <tspan fill="#64748B">   •   </tspan>
          <tspan fill="#94A3B8">BAP: </tspan>
          <tspan fill="#34D399">${safeReportNum}</tspan>
        </text>

        <!-- Row 3: TIMESTAMP & WATERMARK BRAND -->
        <text x="${paddingX}" y="${row3Y}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSizeSub}" font-weight="500">
          <tspan fill="#94A3B8">WAKTU: </tspan>
          <tspan fill="#CBD5E1">${safeTime}</tspan>
          <tspan fill="#64748B">   •   </tspan>
          <tspan fill="#38BDF8">M-SHIPPING LOGISTICS ERP</tspan>
        </text>
      </svg>
    `

    const topPosition = height - bannerHeight

    const watermarked = await rotatedImg
      .composite([
        {
          input: Buffer.from(svgOverlay),
          top: topPosition,
          left: 0,
        },
      ])
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer()

    logger.info(`BAP watermark applied: ${width}x${height}, banner: ${bannerHeight}px for ${metadata.reportNumber}`)
    return watermarked
  } catch (error) {
    logger.error('Failed to apply BAP watermark, falling back to original image buffer:', error)
    // Fallback to original image if watermarking fails
    return imageBuffer
  }
}
