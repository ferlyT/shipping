import { createPortal } from 'react-dom'
import { X, CalendarDays, ChevronLeft, ChevronRight, TrendingUp, Flame, CalendarCheck2, Plane, Ship } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExitListItem } from '@/components/ui/ExitListModal'
import type { ExitHistoryDay } from '@/api/endpoints/marking'

// ---------------------------------------------------------------------------
// Heritage theme tokens
// Architectural minimalism meets journalistic gravitas — deep ink on warm
// limestone, one single rust accent for interaction, flat surfaces only.
// ---------------------------------------------------------------------------
const heritage = {
  color: {
    primary: '#1A1C1E',
    secondary: '#6C7278',
    tertiary: '#B8422E',
    neutral: '#F7F5F2',
    surface: '#FFFFFF',
    onPrimary: '#FFFFFF',
  },
  font: {
    display: { fontFamily: 'Fraunces, serif' },
    h1: { fontFamily: 'Fraunces, serif' },
    body: { fontFamily: '"Public Sans", sans-serif' },
    label: { fontFamily: '"Space Grotesk", sans-serif' },
  },
}

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

// fdListType 1 = udara (air), selain itu dianggap laut (sea) — mengikuti
// konvensi yang sama dengan PredictedExitModal.
function splitByMode(items: ExitListItem[] | undefined): { udara: number; laut: number } {
  if (!items || items.length === 0) return { udara: 0, laut: 0 }
  let udara = 0
  for (const item of items) {
    if ((item as { fdListType?: number | null }).fdListType === 1) udara++
  }
  return { udara, laut: items.length - udara }
}

interface CalendarCell {
  date: Date
  inCurrentMonth: boolean
}

function buildCalendarGrid(monthDate: Date): CalendarCell[] {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  // Convert JS Sunday-first (0-6) into Monday-first offset (0-6)
  const leadingOffset = (firstOfMonth.getDay() + 6) % 7
  const gridStart = new Date(year, month, 1 - leadingOffset)

  const cells: CalendarCell[] = []
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
    cells.push({ date: cellDate, inCurrentMonth: cellDate.getMonth() === month })
  }
  return cells
}

// Heatmap intensity, 0 (kosong) .. 4 (paling ramai dalam bulan ini).
// Palet ditarik dari kombinasi kartu harga: kartu putih polos untuk hari
// sepi, kartu putih dengan outline tegas + aksen rust untuk hari ramai,
// dan satu kartu hitam solid ala "Pro" (tag rust "Puncak") khusus untuk
// hari paling sibuk di bulan itu.
function getIntensity(count: number, maxCount: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || maxCount <= 0) return 0
  const ratio = count / maxCount
  if (ratio <= 0.25) return 1
  if (ratio <= 0.5) return 2
  if (ratio <= 0.75) return 3
  return 4
}

const intensityCellClass: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-white border-[#6C7278]/15 text-[#1A1C1E]',
  1: 'bg-white border-[#1A1C1E]/15 text-[#1A1C1E] hover:border-[#1A1C1E]/30',
  2: 'bg-white border-[#1A1C1E]/35 text-[#1A1C1E] hover:border-[#1A1C1E]/50',
  3: 'bg-[#1A1C1E]/85 border-[#1A1C1E] text-white hover:bg-[#1A1C1E]/95',
  4: 'bg-[#1A1C1E] border-[#1A1C1E] text-white hover:bg-[#1A1C1E]/90',
}

const intensityLegendClass: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-white border-[#6C7278]/15',
  1: 'bg-white border-[#1A1C1E]/20',
  2: 'bg-white border-[#1A1C1E]/45',
  3: 'bg-[#1A1C1E]/85 border-[#1A1C1E]',
  4: 'bg-[#1A1C1E] border-[#1A1C1E]',
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1A1C1E]/60 p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-5xl h-full sm:h-auto sm:m-auto bg-white sm:rounded-[8px] shadow-xl flex flex-col sm:max-h-[90vh] border-0 sm:border sm:border-[#6C7278]/20"
        style={heritage.font.body}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 sm:px-6 sm:py-4 border-b border-[#6C7278]/15 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-[4px] bg-[#B8422E]/10 text-[#B8422E] border border-[#B8422E]/20">
              <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h2
                className="text-lg sm:text-2xl font-medium text-[#1A1C1E] leading-none tracking-[-0.02em] truncate"
                style={heritage.font.display}
              >
                History Exit
              </h2>
              <p
                className="text-[9px] sm:text-[11px] uppercase text-[#6C7278] mt-1.5 sm:mt-2 tracking-[0.06em] sm:tracking-[0.08em] truncate"
                style={heritage.font.label}
              >
                Batch marking keluar gudang per tanggal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 shrink-0 hover:bg-[#F7F5F2] rounded-full text-[#6C7278] hover:text-[#1A1C1E] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body: nav, legend, stats, calendar all scroll together on mobile */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Month nav + legend */}
          <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 flex-wrap gap-3">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                className="p-1.5 rounded-[4px] border border-[#6C7278]/25 hover:border-[#1A1C1E]/40 text-[#6C7278] hover:text-[#1A1C1E] transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs sm:text-sm font-medium text-[#1A1C1E] w-28 sm:w-40 text-center capitalize">
                {formatMonthLabel(month)}
              </span>
              <button
                type="button"
                onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                className="p-1.5 rounded-[4px] border border-[#6C7278]/25 hover:border-[#1A1C1E]/40 text-[#6C7278] hover:text-[#1A1C1E] transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              {!isCurrentMonth && (
                <button
                  type="button"
                  onClick={() => onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1))}
                  className="ml-1 text-[10px] sm:text-[11px] uppercase tracking-[0.06em] font-medium text-[#B8422E] underline decoration-dashed underline-offset-4 hover:opacity-70"
                  style={heritage.font.label}
                >
                  Hari ini
                </button>
              )}
              <span className="text-[11px] sm:text-xs text-[#6C7278] ml-1 sm:ml-2 whitespace-nowrap">
                {monthTotal.toLocaleString()} batch bulan ini
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="hidden sm:inline text-[11px] uppercase tracking-[0.06em] text-[#6C7278] mr-0.5" style={heritage.font.label}>
                Sedikit
              </span>
              {([0, 1, 2, 3, 4] as const).map((level) => (
                <span key={level} className={cn('h-2.5 w-4 rounded-[2px] border', intensityLegendClass[level])} />
              ))}
              <span className="hidden sm:inline text-[11px] uppercase tracking-[0.06em] text-[#6C7278] ml-0.5" style={heritage.font.label}>
                Banyak
              </span>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 px-4 sm:px-6 pt-4 sm:pt-5">
            <div className="rounded-[8px] border border-[#6C7278]/15 bg-[#F7F5F2] px-2.5 py-2 sm:px-4 sm:py-3 flex flex-col gap-1">
              <div className="flex items-center gap-1 sm:gap-1.5 text-[#6C7278]">
                <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="text-[8px] sm:text-[10px] uppercase tracking-[0.06em] sm:tracking-[0.08em] truncate" style={heritage.font.label}>
                  Total Exit
                </span>
              </div>
              {isLoading ? (
                <div className="h-6 sm:h-7 w-12 bg-[#6C7278]/15 animate-pulse rounded-[2px]" />
              ) : (
                <>
                  <span className="text-lg sm:text-2xl font-medium text-[#1A1C1E] tabular-nums" style={heritage.font.display}>
                    {monthTotal.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-2 sm:gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-[9px] sm:text-[11px] text-[#6C7278] tabular-nums">
                      <Plane className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {modeTotals.udara.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1 text-[9px] sm:text-[11px] text-[#6C7278] tabular-nums">
                      <Ship className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {modeTotals.laut.toLocaleString()}
                    </span>
                  </div>
                </>
              )}
            </div>
            <div className="rounded-[8px] border border-[#6C7278]/15 bg-[#F7F5F2] px-2.5 py-2 sm:px-4 sm:py-3 flex flex-col gap-1">
              <div className="flex items-center gap-1 sm:gap-1.5 text-[#6C7278]">
                <CalendarCheck2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="text-[8px] sm:text-[10px] uppercase tracking-[0.06em] sm:tracking-[0.08em] truncate" style={heritage.font.label}>
                  Rata-rata/Hari
                </span>
              </div>
              {isLoading ? (
                <div className="h-6 sm:h-7 w-12 bg-[#6C7278]/15 animate-pulse rounded-[2px]" />
              ) : (
                <span className="text-lg sm:text-2xl font-medium text-[#1A1C1E] tabular-nums" style={heritage.font.display}>
                  {avgPerActiveDay > 0 ? avgPerActiveDay.toLocaleString() : '—'}
                </span>
              )}
            </div>
            <div className="rounded-[8px] border border-[#6C7278]/15 bg-[#F7F5F2] px-2.5 py-2 sm:px-4 sm:py-3 flex flex-col gap-1">
              <div className="flex items-center gap-1 sm:gap-1.5 text-[#6C7278]">
                <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="text-[8px] sm:text-[10px] uppercase tracking-[0.06em] sm:tracking-[0.08em] truncate" style={heritage.font.label}>
                  Puncak
                </span>
              </div>
              {isLoading ? (
                <div className="h-6 sm:h-7 w-14 bg-[#6C7278]/15 animate-pulse rounded-[2px]" />
              ) : peakEntry && peakEntry[1].count > 0 ? (
                <span className="text-lg sm:text-2xl font-medium text-[#1A1C1E] tabular-nums" style={heritage.font.display}>
                  {peakEntry[1].count}
                  <span className="text-[9px] sm:text-[11px] font-normal text-[#6C7278] ml-1 sm:ml-1.5 align-middle" style={heritage.font.body}>
                    {formatShortDay(peakEntry[0])}
                  </span>
                </span>
              ) : (
                <span className="text-lg sm:text-2xl font-medium text-[#6C7278]" style={heritage.font.display}>—</span>
              )}
            </div>
          </div>

          {/* Calendar grid */}
          <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-2">
            <div
              className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[9px] sm:text-[10px] uppercase tracking-[0.04em] sm:tracking-[0.08em] text-[#6C7278] py-1.5 mb-1 sm:mb-1.5 sticky top-0 bg-white z-10 border-b border-[#6C7278]/10"
              style={heritage.font.label}
            >
              {WEEKDAYS.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {Array.from({ length: 42 }).map((_, i) => (
                  <div key={i} className="min-h-[60px] sm:min-h-[100px] rounded-[6px] sm:rounded-[8px] bg-[#6C7278]/10 animate-pulse" />
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
                        'relative min-h-[60px] sm:min-h-[100px] rounded-[6px] sm:rounded-[8px] border text-left p-1 sm:p-2 flex flex-col gap-1 sm:gap-1.5 transition-colors',
                        cell.inCurrentMonth ? intensityCellClass[intensity] : 'bg-[#F7F5F2] border-transparent opacity-40',
                        cell.inCurrentMonth && isPeakDay && 'bg-[#1A1C1E] border-[#1A1C1E] text-white',
                        hasExits ? 'cursor-pointer' : 'cursor-default',
                        isToday && 'ring-2 ring-[#1A1C1E] ring-offset-1'
                      )}
                    >
                      {isPeakDay && (
                        <span className="absolute -top-1.5 -right-1.5 bg-[#B8422E] text-white text-[7px] sm:text-[8px] font-bold uppercase tracking-wide px-1 sm:px-1.5 py-0.5 rounded-[2px] shadow-sm">
                          Puncak
                        </span>
                      )}
                      <span className="text-[10px] sm:text-xs font-medium">
                        {cell.date.getDate()}
                      </span>
                      {hasExits && (
                        <div className="flex flex-col gap-0.5 sm:gap-1">
                          {udara > 0 && (
                            <span
                              className={cn(
                                'inline-flex w-fit items-center gap-0.5 sm:gap-1 rounded-[2px] px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[10px] font-medium leading-tight tabular-nums',
                                intensity >= 3 || isPeakDay
                                  ? 'bg-[#B8422E] text-white'
                                  : 'bg-[#B8422E]/10 text-[#B8422E]'
                              )}
                            >
                              <Plane className="h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0" />
                              {udara}
                            </span>
                          )}
                          {laut > 0 && (
                            <span
                              className={cn(
                                'inline-flex w-fit items-center gap-0.5 sm:gap-1 rounded-[2px] px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[10px] font-medium leading-tight tabular-nums',
                                intensity >= 3 || isPeakDay
                                  ? 'bg-[#B8422E] text-white'
                                  : 'bg-[#B8422E]/10 text-[#B8422E]'
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
        <div
          className="flex-shrink-0 px-4 sm:px-6 py-2.5 sm:py-3 border-t border-[#6C7278]/15 text-[9px] sm:text-[11px] text-[#6C7278] uppercase tracking-[0.03em] sm:tracking-[0.04em] flex flex-wrap items-center gap-x-3 gap-y-1"
          style={heritage.font.label}
        >
          <span className="inline-flex items-center gap-1"><Plane className="h-2.5 w-2.5" /> Udara</span>
          <span className="inline-flex items-center gap-1"><Ship className="h-2.5 w-2.5" /> Laut</span>
          <span>— klik tanggal berwarna untuk lihat detail batch yang keluar gudang.</span>
        </div>
      </div>
    </div>,
    document.body
  )
}
