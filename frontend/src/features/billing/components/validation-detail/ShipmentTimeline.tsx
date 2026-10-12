import { cn } from '@/lib/utils'
import type { BillingTimeline } from '../../types/billing.types'
import {
  PackageCheck,
  Ship,
  Anchor,
  MapPin,
  Warehouse,
  FileText,
  Truck,
  Handshake,
  Timer,
} from 'lucide-react'

export interface ShipmentTimelineProps {
  timeline: BillingTimeline | null | undefined
  isLoading: boolean
}

interface Milestone {
  key: keyof BillingTimeline
  label: string
  subLabel?: string
  Icon: React.ElementType
}

const MILESTONES: Milestone[] = [
  { key: 'fdTglAgent', label: 'Diterima Agen', Icon: PackageCheck },
  { key: 'fdLoadDate', label: 'Loading',        Icon: Ship },
  { key: 'fdETD',      label: 'ETD',            subLabel: 'Keberangkatan', Icon: Anchor },
  { key: 'fdETA',      label: 'ETA',            subLabel: 'Tiba Pelabuhan', Icon: MapPin },
  { key: 'fdTgl_IN',   label: 'Masuk Gudang',   Icon: Warehouse },
  { key: 'fdSjDate',   label: 'Surat Jalan',    Icon: FileText },
  { key: 'fdSndDate',  label: 'Dikirim',        Icon: Truck },
  { key: 'fdGiveDate', label: 'Diserahkan',     Icon: Handshake },
]

function formatDate(raw: string | null | undefined): string {
  if (!raw) return '—'
  const clean = raw.trim()
  const parts = clean.split(/[-/]/)
  if (parts.length === 3) {
    const [year, month, dayPart] = parts
    const day = dayPart.split(/[T\s]/)[0]
    const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des']
    const m = parseInt(month, 10)
    if (!isNaN(m) && m >= 1 && m <= 12) {
      return `${day} ${monthNames[m - 1]} ${year}`
    }
  }
  return clean
}

/** Hitung selisih hari antara dua string YYYY-MM-DD */
function diffDays(from: string, to: string): number {
  const a = new Date(from).getTime()
  const b = new Date(to).getTime()
  return Math.round((b - a) / 86_400_000)
}

/**
 * Hitung durasi dari fdTglAgent sampai:
 * - fdSndDate jika tersedia ("sudah dikirim")
 * - milestone non-null terakhir sebelum fdSndDate jika belum dikirim ("dalam proses")
 * Returns null jika fdTglAgent tidak ada.
 */
function calcDuration(timeline: BillingTimeline | null | undefined): {
  days: number
  endLabel: string
  isSent: boolean
} | null {
  const start = timeline?.fdTglAgent
  if (!start) return null

  // Coba end = fdSndDate (sudah dikirim)
  if (timeline?.fdSndDate) {
    return {
      days: diffDays(start, timeline.fdSndDate),
      endLabel: 'Dikirim',
      isSent: true,
    }
  }

  // Fallback: milestone non-null terakhir sebelum fdSndDate (indeks 0–5)
  const checkOrder: { key: keyof BillingTimeline; label: string }[] = [
    { key: 'fdSjDate',  label: 'Surat Jalan' },
    { key: 'fdTgl_IN',  label: 'Masuk Gudang' },
    { key: 'fdETA',     label: 'ETA' },
    { key: 'fdETD',     label: 'ETD' },
    { key: 'fdLoadDate',label: 'Loading' },
  ]

  for (const { key, label } of checkOrder) {
    const val = timeline?.[key]
    if (val) {
      return {
        days: diffDays(start, val),
        endLabel: label,
        isSent: false,
      }
    }
  }

  return null
}

export function ShipmentTimeline({ timeline, isLoading }: ShipmentTimelineProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 mb-2">
        <div className="skeleton-shimmer h-3 w-24 rounded mb-3" />
        <div className="flex items-center gap-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1.5">
                <div className="skeleton-shimmer w-7 h-7 rounded-full" />
                <div className="skeleton-shimmer h-2 w-10 rounded" />
                <div className="skeleton-shimmer h-2 w-12 rounded" />
              </div>
              {i < 7 && <div className="skeleton-shimmer h-px flex-1 mx-1" />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const doneUntil = MILESTONES.reduce((acc, m, idx) => {
    const val = timeline?.[m.key]
    return val ? idx : acc
  }, -1)

  const duration = calcDuration(timeline)

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 mb-2">
      {/* Header row: label + durasi chip */}
      <div className="flex items-center justify-between mb-2.5 gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-secondary)] select-none">
          Siklus Kargo
        </p>

        {duration && (
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold tabular-nums whitespace-nowrap',
              duration.isSent
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
            )}
          >
            <Timer className="w-3 h-3 shrink-0" />
            <span>{duration.days} hari</span>
            <span className="font-normal opacity-70">
              · s/d {duration.endLabel}
            </span>
          </div>
        )}
      </div>

      {/* ── Desktop: Horizontal strip ── */}
      <div className="hidden sm:flex items-start">
        {MILESTONES.map((ms, idx) => {
          const raw = timeline?.[ms.key]
          const isDone = !!raw
          const isLast = idx === MILESTONES.length - 1
          const connectorDone = idx < doneUntil

          return (
            <div key={ms.key} className="flex items-start flex-1 min-w-0">
              {/* Milestone node */}
              <div className="flex flex-col items-center w-full">
                {/* Icon dot */}
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-200 shrink-0',
                    isDone
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-400 shadow-xs'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-secondary)]/60'
                  )}
                >
                  <ms.Icon className="w-3.5 h-3.5" />
                </div>

                {/* Label */}
                <p
                  className={cn(
                    'mt-1.5 text-center leading-tight text-[10px] font-medium px-0.5 truncate w-full',
                    isDone ? 'text-[var(--color-primary)] font-semibold' : 'text-[var(--color-secondary)]'
                  )}
                >
                  {ms.label}
                </p>

                {/* Sub-label gudang jika tersedia */}
                {ms.key === 'fdTgl_IN' && timeline?.fdGudang && (
                  <span
                    className="block text-center leading-tight text-[9px] font-normal text-[var(--color-secondary)] truncate max-w-full px-0.5 -mt-0.5"
                    title={`Gudang: ${timeline.fdGudang}`}
                  >
                    {timeline.fdGudang}
                  </span>
                )}

                {/* Date */}
                <p
                  className={cn(
                    'text-[10px] tabular-nums text-center font-mono whitespace-nowrap',
                    isDone
                      ? 'text-[var(--color-primary)] dark:text-emerald-400 font-medium'
                      : 'text-[var(--color-secondary)] opacity-50'
                  )}
                >
                  {formatDate(raw)}
                </p>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 mt-3.5 mx-0.5 shrink-0 min-w-0">
                  <div
                    className={cn(
                      'h-0.5 w-full rounded-full transition-all duration-300',
                      connectorDone
                        ? 'bg-[var(--color-primary)]/70 dark:bg-emerald-500/60'
                        : 'bg-[var(--color-border)]'
                    )}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Mobile: 4-column grid ── */}
      <div className="sm:hidden grid grid-cols-4 gap-y-3 gap-x-1">
        {MILESTONES.map((ms) => {
          const raw = timeline?.[ms.key]
          const isDone = !!raw

          return (
            <div key={ms.key} className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center border-2 shrink-0',
                  isDone
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-400'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-secondary)]/60'
                )}
              >
                <ms.Icon className="w-3 h-3" />
              </div>
              <p className={cn(
                'text-[9px] font-medium text-center leading-tight',
                isDone ? 'text-[var(--color-primary)] font-semibold' : 'text-[var(--color-secondary)]'
              )}>
                {ms.label}
              </p>
              {ms.key === 'fdTgl_IN' && timeline?.fdGudang && (
                <span
                  className="block text-center leading-tight text-[8px] font-normal text-[var(--color-secondary)] truncate max-w-full px-0.5 -mt-0.5"
                  title={`Gudang: ${timeline.fdGudang}`}
                >
                  {timeline.fdGudang}
                </span>
              )}
              <p className={cn(
                'text-[9px] tabular-nums font-mono text-center',
                isDone
                  ? 'text-[var(--color-primary)] dark:text-emerald-400 font-medium'
                  : 'text-[var(--color-secondary)] opacity-50'
              )}>
                {formatDate(raw)}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
