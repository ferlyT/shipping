import { useState, useEffect, useRef, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface VoiceVisualizerGraphicProps {
  isListening: boolean
  isReceivingVoice: boolean
  className?: string
}

/**
 * Komponen Grafis Spektrum Suara & Gelombang Audio Reaktif.
 * Menampilkan grafis equalizer multi-bar dinamis dan gelombang sinus SVG
 * yang berosilasi saat mikrofon mendengarkan dan melonjak aktif saat menerima suara ucapan.
 */
export function VoiceVisualizerGraphic({
  isListening,
  isReceivingVoice,
  className,
}: VoiceVisualizerGraphicProps) {
  // Jumlah bar pada spektrum equalizer
  const BAR_COUNT = 24

  // State untuk tinggi bar (0..100%)
  const [barHeights, setBarHeights] = useState<number[]>(() =>
    Array(BAR_COUNT).fill(10)
  )
  const [wavePhase, setWavePhase] = useState(0)
  const animFrameRef = useRef<number | null>(null)

  // Generate kurva Gaussian bobot tengah agar bentuk spektrum vokal alami (tengah lebih tinggi)
  const gaussianWeights = useMemo(() => {
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      const mid = (BAR_COUNT - 1) / 2
      const dist = Math.abs(i - mid) / mid
      return Math.max(0.35, 1 - dist * 0.65)
    })
  }, [BAR_COUNT])

  useEffect(() => {
    let active = true

    const updateAnimation = () => {
      if (!active) return

      setWavePhase((prev) => (prev + (isReceivingVoice ? 0.15 : 0.04)) % (Math.PI * 2))

      setBarHeights((prev) => {
        return prev.map((curr, idx) => {
          if (!isListening) {
            // Standby / Non-aktif: bar rendah statis
            return 8
          }

          if (isReceivingVoice) {
            // Suara terdeteksi: fluktuasi amplitudo tinggi dengan getaran harmonik vokal
            const weight = gaussianWeights[idx]
            const noise = Math.random() * 55 + 25 // 25..80
            const harmonic = Math.sin(idx * 0.6 + wavePhase * 2) * 18
            const target = Math.min(100, Math.max(16, (noise + harmonic) * weight))
            // Interpolasi halus
            return curr + (target - curr) * 0.35
          } else {
            // Mendengarkan tanpa suara (idle whisper): denyut napas halus
            const base = 10 + Math.sin(idx * 0.4 + wavePhase) * 6
            return curr + (base - curr) * 0.2
          }
        })
      })

      animFrameRef.current = requestAnimationFrame(updateAnimation)
    }

    animFrameRef.current = requestAnimationFrame(updateAnimation)

    return () => {
      active = false
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [isListening, isReceivingVoice, gaussianWeights, wavePhase])

  // Path gelombang sinus SVG yang mengalir dinamis
  const wavePoints = useMemo(() => {
    const width = 240
    const height = 40
    const midY = height / 2
    const amp = !isListening ? 2 : isReceivingVoice ? 14 : 5
    const freq = isReceivingVoice ? 0.045 : 0.025

    let d1 = `M 0 ${midY}`
    let d2 = `M 0 ${midY}`

    for (let x = 0; x <= width; x += 4) {
      const y1 = midY + Math.sin(x * freq + wavePhase) * amp
      const y2 = midY + Math.sin(x * freq + wavePhase + Math.PI / 2) * (amp * 0.75)
      d1 += ` L ${x} ${y1}`
      d2 += ` L ${x} ${y2}`
    }

    return { d1, d2 }
  }, [isListening, isReceivingVoice, wavePhase])

  return (
    <div className={cn('w-full flex flex-col items-center justify-center space-y-2 select-none', className)}>
      
      {/* ─── 1. SVG Dynamic Sine Wave Banner ─── */}
      <div className="relative w-full max-w-[260px] h-9 overflow-hidden flex items-center justify-center">
        <svg
          viewBox="0 0 240 40"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Garis tengah acuan tipis */}
          <line
            x1="0"
            y1="20"
            x2="240"
            y2="20"
            stroke="currentColor"
            strokeOpacity="0.12"
            strokeDasharray="2 4"
          />

          {/* Gelombang Lapisan 1: Cyan / Emerald Neon */}
          <path
            d={wavePoints.d1}
            stroke={isReceivingVoice ? '#10b981' : isListening ? '#0ea5e9' : '#94a3b8'}
            strokeWidth={isReceivingVoice ? '2.2' : '1.5'}
            strokeLinecap="round"
            className="transition-colors duration-200 opacity-80"
          />

          {/* Gelombang Lapisan 2: Indigo / Sky Secondary */}
          <path
            d={wavePoints.d2}
            stroke={isReceivingVoice ? '#06b6d4' : isListening ? '#6366f1' : '#cbd5e1'}
            strokeWidth="1.2"
            strokeLinecap="round"
            className="transition-colors duration-200 opacity-60"
          />
        </svg>

        {/* Gradien Vignette Sisi Kiri & Kanan */}
        <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[var(--color-surface)] to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--color-surface)] to-transparent pointer-events-none" />
      </div>

      {/* ─── 2. Equalizer Multi-Bar Spectrum ─── */}
      <div className="flex items-center justify-center gap-1 sm:gap-1.5 h-12 w-full max-w-[280px] px-2">
        {barHeights.map((h, i) => {
          return (
            <div
              key={i}
              className="relative flex-1 flex items-center justify-center h-full"
            >
              <div
                style={{
                  height: `${Math.max(6, h)}%`,
                }}
                className={cn(
                  'w-full max-w-[6px] rounded-full transition-all duration-75',
                  !isListening
                    ? 'bg-slate-300 dark:bg-slate-700 opacity-40'
                    : isReceivingVoice
                    ? 'bg-gradient-to-t from-emerald-500 via-sky-500 to-cyan-400 shadow-xs shadow-emerald-500/50'
                    : 'bg-sky-500/40 dark:bg-sky-400/30'
                )}
              />
            </div>
          )
        })}
      </div>

      {/* ─── 3. Visual Decibel Level Indicator Badge ─── */}
      <div className="flex items-center gap-2 pt-0.5">
        {isReceivingVoice ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span>Menerima Sinyal Suara...</span>
          </div>
        ) : isListening ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-[var(--color-secondary)]">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            <span>Mikrofon Siaga • Silakan Bicara</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium text-[var(--color-secondary)] opacity-70">
            <span>Mikrofon Tidak Aktif</span>
          </div>
        )}
      </div>

    </div>
  )
}
