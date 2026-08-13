import { useIsMobile } from '@/hooks/useIsMobile'
import { useLangStore } from '@/stores/langStore'

interface ChartTickProps {
  x?: number
  y?: number
  payload?: {
    value: string
    payload?: {
      date?: string
      [key: string]: any
    }
  }
}

export function CustomXAxisTick({ x = 0, y = 0, payload }: ChartTickProps) {
  const isMobile = useIsMobile()
  const lang = useLangStore((s) => s.lang)
  
  let line1 = payload?.value || ''
  let line2 = ''

  if (typeof payload?.value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(payload.value)) {
    const dateObj = new Date(payload.value)
    line1 = dateObj.toLocaleDateString(lang === 'en' ? 'en-GB' : 'id-ID', { day: '2-digit', month: 'short' })
    line2 = dateObj.toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', { weekday: 'short' })
  } else {
    const val = payload?.value || ''
    const match = val.match(/(.+?)\s*\((.+?)\)/)
    if (match) {
      line1 = match[1].trim()
      line2 = match[2].trim()
    }
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill="var(--color-secondary)" fontFamily="var(--font-label)">
        <tspan textAnchor="middle" x="0" fontSize={isMobile ? 9 : 11} fontWeight={500}>
          {line1}
        </tspan>
        {line2 && (
          <tspan textAnchor="middle" x="0" dy={isMobile ? 12 : 16} fontSize={isMobile ? 8 : 10} fill="var(--color-secondary)" opacity={0.7} fontWeight={600}>
            {line2}
          </tspan>
        )}
      </text>
    </g>
  )
}
