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
    const [yStr, mStr, dStr] = payload.value.split('-')
    const dateObj = new Date(Number(yStr), Number(mStr) - 1, Number(dStr))
    line1 = dateObj.toLocaleDateString(lang === 'en' ? 'en-GB' : 'id-ID', { day: '2-digit', month: 'short' })
    line2 = dateObj.toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', { weekday: 'short' })
  } else {
    const val = payload?.value || ''
    const parenMatch = val.match(/(.+?)\s*\((.+?)\)/)
    const monthYearMatch = val.match(/^([A-Za-z]{3,})\s*'?(\d{2,4})$/)

    if (parenMatch) {
      line1 = parenMatch[1].trim()
      line2 = parenMatch[2].trim()
    } else if (monthYearMatch) {
      line1 = monthYearMatch[1].trim()
      line2 = monthYearMatch[2].length === 2 ? `20${monthYearMatch[2]}` : monthYearMatch[2]
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
