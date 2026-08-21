import { createPortal } from 'react-dom'
import { X, CalendarDays, ChevronLeft, ChevronRight, TrendingUp, Flame, CalendarCheck2, Plane, Ship } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExitListItem } from './ExitListModal'
import type { ExitHistoryDay } from '../services/marking.service'

interface ExitHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  month: Date
  onMonthChange: (month: Date) => void
  historyMap: Record<string, ExitHistoryDay>
  isLoading: boolean
  onSelectDay: (dayKey: string, items: ExitListItem[]) => void
}

function formatDayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

function formatShortDay(dayKey: string): string {
  const d = new Date(`${dayKey}T00:00:00`)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function splitByMode(items?: ExitListItem[]): { udara: number; laut: number } {
  if (!items || items.length === 0) return { udara: 0, laut: 0 }
  let udara = 0
  let laut = 0
  for (const it of items) {
    if (it.fdListType === 1) udara++
    else laut++
  }
  return { udara, laut }
}

interface CalendarCell {
  date: Date
  inCurrentMonth: boolean
}

function buildCalendarGrid(month: Date): CalendarCell[] {
  const year = month.getFullYear()
  const m = month.getMonth()

  const firstDayOfMonth = new Date(year, m, 1)
  const lastDayOfMonth = new Date(year, m + 1, 0)

  const firstDayIndex = (firstDayOfMonth.getDay() + 6) % 7
  const daysInMonth = lastDayOfMonth.getDate()

  const cells: CalendarCell[] = []

  const prevMonthLastDay = new Date(year, m, 0).getDate()
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    cells.push({
      date: new Date(year, m - 1, prevMonthLastDay - i),
      inCurrentMonth: false,
    })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: new Date(year, m, d),
      inCurrentMonth: true,
    })
  }

  const remaining = (7 - (cells.length % 7)) % 7
  for (let i = 1; i <= remaining; i++) {
    cells.push({
      date: new Date(year, m + 1, i),
      inCurrentMonth: false,
    })
  }

  return cells
}

function getIntensity(count: number, maxCount: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || maxCount <= 0) return 0
  const ratio = count / maxCount
  if (ratio <= 0.25) return 1
  if (ratio <= 0.5) return 2
  if (ratio <= 0.75) return 3
  return 4
}

const intensityCellClass: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)]',
  1: 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] hover:border-[var(--color-primary)]/40',
  2: 'bg-[var(--color-surface)] border-[var(--color-primary)]/35 text-[var(--color-primary)] hover:border-[var(--color-primary)]/50',
  3: 'bg-[var(--color-primary)]/15 border-[var(--color-primary)]/50 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/25',
  4: 'bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-on-primary)] hover:opacity-90',
}

const intensityLegendClass: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-[var(--color-surface)] border-[var(--color-border)]',
  1: 'bg-[var(--color-surface)] border-[var(--color-primary)]/20',
  2: 'bg-[var(--color-surface)] border-[var(--color-primary)]/45',
  3: 'bg-[var(--color-primary)]/15 border-[var(--color-primary)]/50',
  4: 'bg-[var(--color-primary)] border-[var(--color-primary)]',
}

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

export function ExitHistoryModal({
  isOpen,
  onClose,
  month,
  onMonthChange,
  historyMap,
  isLoading,
  onSelectDay,
}: ExitHistoryModalProps) {
  if (!isOpen || typeof document === 'undefined') return null

  const today = new Date()
  const isCurrentMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth()
  const calendarCells = buildCalendarGrid(month)

  const dayEntries = Object.entries(historyMap)
  const monthTotal = dayEntries.reduce((sum, [, day]) => sum + (day?.count || 0), 0)
  const modeTotals = dayEntries.reduce(
    (acc, [, day]) => {
      const { udara, laut } = splitByMode(day?.items)
      acc.udara += udara
      acc.laut += laut
      return acc
    },
    { udara: 0, laut: 0 }
  )
  const activeDays = dayEntries.filter(([, day]) => (day?.count || 0) > 0).length
  const avgPerActiveDay = activeDays > 0 ? Math.round((monthTotal / activeDays) * 10) / 10 : 0
  const maxCount = dayEntries.reduce((max, [, day]) => Math.max(max, day?.count || 0), 0)
  const peakEntry = dayEntries.reduce<[string, ExitHistoryDay] | null>((peak, entry) => {
    if (!peak || entry[1].count > peak[1].count) return entry
    return peak
  }, null)

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-5xl h-full sm:h-auto sm:m-auto bg-[var(--color-surface)] sm:rounded-2xl shadow-xl flex flex-col sm:max-h-[90vh] border-0 sm:border sm:border-[var(--color-border)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--color-border)] flex items-center justify-between gap-3 bg-[var(--color-surface)]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-[var(--color-primary)] font-[var(--font-display)] leading-none tracking-tight truncate">
                History Exit
              </h2>
              <p className="text-[10px] sm:text-xs uppercase text-[var(--color-secondary)] mt-1.5 font-semibold tracking-wider truncate">
                Batch marking keluar gudang per tanggal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 shrink-0 hover:bg-[var(--color-neutral)] rounded-full text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body: nav, legend, stats, calendar all scroll together on mobile */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-[var(--color-surface)]">
          {/* Month nav + legend */}
          <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 flex-wrap gap-3">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                className="p-1.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs sm:text-sm font-bold text-[var(--color-primary)] w-28 sm:w-40 text-center capitalize">
                {formatMonthLabel(month)}
              </span>
              <button
                type="button"
                onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                className="p-1.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              {!isCurrentMonth && (
                <button
                  type="button"
                  onClick={() => onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1))}
                  className="ml-1 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-[var(--color-tertiary)] underline decoration-dashed underline-offset-4 hover:opacity-70 cursor-pointer"
                >
                  Hari ini
                </button>
              )}
              <span className="text-[11px] sm:text-xs text-[var(--color-secondary)] ml-1 sm:ml-2 whitespace-nowrap">
                {monthTotal.toLocaleString()} batch bulan ini
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="hidden sm:inline text-[11px] uppercase font-semibold text-[var(--color-secondary)] mr-0.5">
                Sedikit
              </span>
              {([0, 1, 2, 3, 4] as const).map((level) => (
                <span key={level} className={cn('h-2.5 w-4 rounded border', intensityLegendClass[level])} />
              ))}
              <span className="hidden sm:inline text-[11px] uppercase font-semibold text-[var(--color-secondary)] ml-0.5">
                Banyak
              </span>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 px-4 sm:px-6 pt-4 sm:pt-5">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-neutral)] px-2.5 py-2 sm:px-4 sm:py-3 flex flex-col gap-1">
              <div className="flex items-center gap-1 sm:gap-1.5 text-[var(--color-secondary)]">
                <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider truncate">
                  Total Exit
                </span>
              </div>
              {isLoading ? (
                <div className="h-6 sm:h-7 w-12 bg-[var(--color-border)] animate-pulse rounded" />
              ) : (
                <>
                  <span className="text-lg sm:text-2xl font-bold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                    {monthTotal.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-2 sm:gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-[9px] sm:text-[11px] text-[var(--color-secondary)] tabular-nums">
                      <Plane className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-sky-500" /> {modeTotals.udara.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1 text-[9px] sm:text-[11px] text-[var(--color-secondary)] tabular-nums">
                      <Ship className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-500" /> {modeTotals.laut.toLocaleString()}
                    </span>
                  </div>
                </>
              )}
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-neutral)] px-2.5 py-2 sm:px-4 sm:py-3 flex flex-col gap-1">
              <div className="flex items-center gap-1 sm:gap-1.5 text-[var(--color-secondary)]">
                <CalendarCheck2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider truncate">
                  Rata-rata/Hari
                </span>
              </div>
              {isLoading ? (
                <div className="h-6 sm:h-7 w-12 bg-[var(--color-border)] animate-pulse rounded" />
              ) : (
                <span className="text-lg sm:text-2xl font-bold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                  {avgPerActiveDay > 0 ? avgPerActiveDay.toLocaleString() : '—'}
                </span>
              )}
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-neutral)] px-2.5 py-2 sm:px-4 sm:py-3 flex flex-col gap-1">
              <div className="flex items-center gap-1 sm:gap-1.5 text-[var(--color-secondary)]">
                <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider truncate">
                  Puncak
                </span>
              </div>
              {isLoading ? (
                <div className="h-6 sm:h-7 w-14 bg-[var(--color-border)] animate-pulse rounded" />
              ) : peakEntry && peakEntry[1].count > 0 ? (
                <span className="text-lg sm:text-2xl font-bold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                  {peakEntry[1].count}
                  <span className="text-[9px] sm:text-[11px] font-normal text-[var(--color-secondary)] ml-1 sm:ml-1.5 align-middle">
                    {formatShortDay(peakEntry[0])}
                  </span>
                </span>
              ) : (
                <span className="text-lg sm:text-2xl font-bold text-[var(--color-secondary)] font-[var(--font-display)]">—</span>
              )}
            </div>
          </div>

          {/* Calendar grid */}
          <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-2">
            <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-[var(--color-secondary)] py-1.5 mb-1 sm:mb-1.5 sticky top-0 bg-[var(--color-surface)] z-10 border-b border-[var(--color-border)]">
              {WEEKDAYS.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {Array.from({ length: 42 }).map((_, i) => (
                  <div key={i} className="min-h-[60px] sm:min-h-[100px] rounded-xl bg-[var(--color-neutral)] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1 sm:gap-2 pb-2">
                {calendarCells.map((cell) => {
                  const dayKey = formatDayKey(cell.date)
                  const dayData = historyMap[dayKey]
                  const count = dayData?.count || 0
                  const hasExits = count > 0
                  const isToday = isSameDay(cell.date, today)
                  const intensity = getIntensity(count, maxCount)
                  const { udara, laut } = splitByMode(dayData?.items)
                  const isPeakDay = !!peakEntry && peakEntry[1].count > 0 && dayKey === peakEntry[0]

                  return (
                    <button
                      key={dayKey}
                      type="button"
                      disabled={!hasExits}
                      onClick={() => {
                        if (!dayData || !hasExits) return
                        onSelectDay(dayKey, dayData.items)
                      }}
                      className={cn(
                        'relative min-h-[60px] sm:min-h-[100px] rounded-xl border text-left p-1 sm:p-2 flex flex-col gap-1 sm:gap-1.5 transition-colors',
                        cell.inCurrentMonth ? intensityCellClass[intensity] : 'bg-[var(--color-neutral)] border-transparent opacity-40',
                        cell.inCurrentMonth && isPeakDay && 'bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-on-primary)]',
                        hasExits ? 'cursor-pointer' : 'cursor-default',
                        isToday && 'ring-2 ring-[var(--color-primary)] ring-offset-1'
                      )}
                    >
                      {isPeakDay && (
                        <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[7px] sm:text-[8px] font-bold uppercase tracking-wide px-1 sm:px-1.5 py-0.5 rounded shadow-sm">
                          Puncak
                        </span>
                      )}
                      <span className="text-[10px] sm:text-xs font-semibold">
                        {cell.date.getDate()}
                      </span>
                      {hasExits && (
                        <div className="flex flex-col gap-0.5 sm:gap-1">
                          {udara > 0 && (
                            <span
                              className={cn(
                                'inline-flex w-fit items-center gap-0.5 sm:gap-1 rounded px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[10px] font-bold leading-tight tabular-nums',
                                intensity >= 3 || isPeakDay
                                  ? 'bg-[var(--color-on-primary)]/20 text-current'
                                  : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                              )}
                            >
                              <Plane className="h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0" />
                              {udara}
                            </span>
                          )}
                          {laut > 0 && (
                            <span
                              className={cn(
                                'inline-flex w-fit items-center gap-0.5 sm:gap-1 rounded px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[10px] font-bold leading-tight tabular-nums',
                                intensity >= 3 || isPeakDay
                                  ? 'bg-[var(--color-on-primary)]/20 text-current'
                                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              )}
                            >
                              <Ship className="h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0" />
                              {laut}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-2.5 sm:py-3 border-t border-[var(--color-border)] text-[10px] sm:text-xs text-[var(--color-secondary)] uppercase font-semibold tracking-wider flex flex-wrap items-center gap-x-3 gap-y-1 bg-[var(--color-neutral)]">
          <span className="inline-flex items-center gap-1"><Plane className="h-3 w-3 text-sky-500" /> Udara</span>
          <span className="inline-flex items-center gap-1"><Ship className="h-3 w-3 text-emerald-500" /> Laut</span>
          <span className="normal-case font-normal">— klik tanggal berwarna untuk lihat detail batch yang keluar gudang.</span>
        </div>
      </div>
    </div>,
    document.body
  )
}
