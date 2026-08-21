import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Clock, Ship, Plane, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PrediksiExitItem {
  fdMarkingCode: string
  fdConsignee: string | null
  fdBranchCode: string | null
  fdListType: number | null
  fdETA: string
  fdGudang: string | null
  fdKet: string | null
  predictedExitDate: string
  daysUntil: number
  avgDelayDays: number
  sampleSize: number
  category: 'terlambat' | 'segera' | 'dekat' | 'normal'
}

type CategoryKey = PrediksiExitItem['category']

const categoryMeta: Record<CategoryKey, {
  label: string
  dot: string
  text: string
  bg: string
  border: string
  ring: string
  badgeBg: string
  badgeText: string
  cellClass: string
  cellDateClass: string
  tag?: string
}> = {
  terlambat: {
    label: 'Terlambat',
    dot: 'bg-rose-500',
    text: 'text-rose-500',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500',
    ring: 'ring-rose-500',
    badgeBg: 'bg-rose-500',
    badgeText: 'text-white',
    cellClass: 'bg-rose-500/10 border-rose-500/30 text-[var(--color-primary)]',
    cellDateClass: 'text-rose-600 dark:text-rose-400 font-bold',
    tag: 'Terlambat',
  },
  segera: {
    label: 'Segera (0–3 hari)',
    dot: 'bg-amber-500',
    text: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/60',
    ring: 'ring-amber-500/60',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-600 dark:text-amber-400',
    cellClass: 'bg-[var(--color-surface)] border-amber-500/40 hover:border-amber-500/60',
    cellDateClass: 'text-[var(--color-primary)]',
  },
  dekat: {
    label: 'Dekat (4–7 hari)',
    dot: 'bg-blue-500',
    text: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    ring: 'ring-blue-500/30',
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-600 dark:text-blue-400',
    cellClass: 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-blue-500/40',
    cellDateClass: 'text-[var(--color-primary)]',
  },
  normal: {
    label: 'Normal (>7 hari)',
    dot: 'bg-[var(--color-secondary)]',
    text: 'text-[var(--color-secondary)]',
    bg: 'bg-[var(--color-neutral)]',
    border: 'border-[var(--color-border)]',
    ring: 'ring-[var(--color-border)]',
    badgeBg: 'bg-[var(--color-neutral)]',
    badgeText: 'text-[var(--color-secondary)]',
    cellClass: 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-primary)]/40',
    cellDateClass: 'text-[var(--color-primary)]',
  },
}

const categoryPriority: CategoryKey[] = ['terlambat', 'segera', 'dekat', 'normal']
const MAX_BADGES_PER_DAY = 5
const MAX_BADGES_PER_DAY_MOBILE = 2

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

interface PredictedExitModalProps {
  isOpen: boolean
  onClose: () => void
  data: PrediksiExitItem[]
}

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

export function PredictedExitModal({ isOpen, onClose, data }: PredictedExitModalProps) {
  const today = useMemo(() => new Date(), [])
  const [viewMonth, setViewMonth] = useState<Date>(() => new Date())
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const itemsByDate = useMemo(() => {
    const map: Record<string, PrediksiExitItem[]> = {}
    for (const item of data) {
      const k = item.predictedExitDate ? item.predictedExitDate.slice(0, 10) : ''
      if (!k) continue
      if (!map[k]) map[k] = []
      map[k].push(item)
    }
    return map
  }, [data])

  const selectedItems = selectedKey ? itemsByDate[selectedKey] || [] : []
  const selectedDate = selectedKey ? new Date(`${selectedKey}T00:00:00`) : null

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const monthLabel = viewMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

  const cells = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    const firstDayIndex = (firstDayOfMonth.getDay() + 6) % 7
    const daysInMonth = lastDayOfMonth.getDate()

    const list: { date: Date; inMonth: boolean }[] = []

    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      list.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        inMonth: false,
      })
    }

    for (let d = 1; d <= daysInMonth; d++) {
      list.push({
        date: new Date(year, month, d),
        inMonth: true,
      })
    }

    const remaining = (7 - (list.length % 7)) % 7
    for (let i = 1; i <= remaining; i++) {
      list.push({
        date: new Date(year, month + 1, i),
        inMonth: false,
      })
    }

    return list
  }, [year, month])

  if (!isOpen || typeof document === 'undefined') return null

  const monthTotal = cells
    .filter((c) => c.inMonth)
    .reduce((sum, c) => sum + (itemsByDate[toKey(c.date)]?.length || 0), 0)

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
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-[var(--color-primary)] font-[var(--font-display)] leading-none tracking-tight truncate">
                Prediksi Tanggal Exit
              </h2>
              <p className="text-[10px] sm:text-xs uppercase text-[var(--color-secondary)] mt-1.5 font-semibold tracking-wider truncate">
                Estimasi delay ETA → Exit per consignee (data historis)
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

        {/* Scrollable body: nav, legend, calendar, detail all scroll together on mobile */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-[var(--color-surface)]">
          {/* Month nav + legend */}
          <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 flex-wrap gap-3">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={() => setViewMonth(new Date(year, month - 1, 1))}
                className="p-1.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs sm:text-sm font-bold text-[var(--color-primary)] w-28 sm:w-40 text-center capitalize">
                {monthLabel}
              </span>
              <button
                type="button"
                onClick={() => setViewMonth(new Date(year, month + 1, 1))}
                className="p-1.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
                className="ml-1 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-[var(--color-tertiary)] underline decoration-dashed underline-offset-4 hover:opacity-70 cursor-pointer"
              >
                Hari ini
              </button>
              <span className="text-[11px] sm:text-xs text-[var(--color-secondary)] ml-1 sm:ml-2 whitespace-nowrap font-medium">
                {monthTotal} batch bulan ini
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {categoryPriority.map((k) => (
                <span key={k} className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold text-[var(--color-secondary)]">
                  <span className={cn('h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full shrink-0', categoryMeta[k].dot)} />
                  <span className="whitespace-nowrap">{categoryMeta[k].label}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Calendar grid */}
          <div className="px-4 sm:px-6 pt-4 sm:pt-5">
            <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-[var(--color-secondary)] py-1.5 mb-1 sm:mb-1.5 sticky top-0 bg-[var(--color-surface)] z-10 border-b border-[var(--color-border)]">
              {WEEKDAYS.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2 pb-2">
              {cells.map(({ date, inMonth }, idx) => {
                const key = toKey(date)
                const items = itemsByDate[key] || []
                const isToday = isSameDay(date, today)
                const isSelected = selectedKey === key
                const worstCategory = categoryPriority.find((c) => items.some((i) => i.category === c))
                const worstMeta = worstCategory ? categoryMeta[worstCategory] : null
                const shown = items.slice(0, MAX_BADGES_PER_DAY)
                const overflowCount = items.length - shown.length
                const mobileOverflowCount = Math.max(items.length - MAX_BADGES_PER_DAY_MOBILE, 0)

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => items.length > 0 && setSelectedKey(isSelected ? null : key)}
                    disabled={items.length === 0}
                    className={cn(
                      'relative min-h-[64px] sm:min-h-[92px] rounded-xl border text-left p-1 sm:p-2 flex flex-col gap-1 sm:gap-1.5 transition-all',
                      inMonth
                        ? worstMeta
                          ? worstMeta.cellClass
                          : 'bg-[var(--color-surface)] border-[var(--color-border)]'
                        : 'bg-[var(--color-neutral)] border-transparent opacity-40',
                      items.length > 0 ? 'hover:shadow-md cursor-pointer' : 'cursor-default',
                      isSelected && worstMeta ? cn('ring-2', worstMeta.ring) : '',
                      isToday && 'ring-2 ring-[var(--color-primary)] ring-offset-1'
                    )}
                  >
                    {worstMeta?.tag && (
                      <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[7px] sm:text-[8px] font-bold uppercase tracking-wide px-1 sm:px-1.5 py-0.5 rounded shadow-sm">
                        {worstMeta.tag}
                      </span>
                    )}
                    <span className={cn('text-[10px] sm:text-xs font-semibold', worstMeta ? worstMeta.cellDateClass : 'text-[var(--color-secondary)]')}>
                      {date.getDate()}
                    </span>
                    {items.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 sm:gap-1">
                        {shown.map((item, badgeIdx) => {
                          const meta = categoryMeta[item.category]
                          return (
                            <span
                              key={item.fdMarkingCode}
                              title={`${item.fdMarkingCode} · ${item.fdConsignee || 'Unknown'}`}
                              className={cn(
                                'inline-block max-w-full truncate rounded px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[10px] font-bold leading-tight',
                                meta.badgeBg, meta.badgeText,
                                badgeIdx >= MAX_BADGES_PER_DAY_MOBILE && 'hidden sm:inline-block'
                              )}
                            >
                              {item.fdMarkingCode}
                            </span>
                          )
                        })}
                        {mobileOverflowCount > 0 && (
                          <span className="sm:hidden inline-block rounded px-1 py-0.5 text-[8px] font-bold leading-tight bg-[var(--color-neutral)] text-[var(--color-secondary)]">
                            +{mobileOverflowCount}
                          </span>
                        )}
                        {overflowCount > 0 && (
                          <span className="hidden sm:inline-block rounded px-1.5 py-0.5 text-[10px] font-bold leading-tight bg-[var(--color-neutral)] text-[var(--color-secondary)]">
                            +{overflowCount}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Detail panel tanggal terpilih */}
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-t border-[var(--color-border)] bg-[var(--color-neutral)]">
            {!selectedDate ? (
              <div className="flex flex-col items-center justify-center text-center text-[var(--color-secondary)] py-8 sm:py-10 gap-2">
                <CalendarDays className="h-6 w-6 sm:h-7 sm:w-7 opacity-50" />
                <p className="text-xs sm:text-sm font-medium">Klik tanggal yang ada badge marking code untuk lihat detail batch.</p>
              </div>
            ) : (
              <>
                <p className="text-xs sm:text-sm font-bold text-[var(--color-primary)] mb-2.5 sm:mb-3">
                  {selectedDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  <span className="ml-2 font-normal text-xs sm:text-sm text-[var(--color-secondary)]">({selectedItems.length} batch)</span>
                </p>
                <div className="space-y-2.5 sm:space-y-3">
                  {selectedItems.map((item) => {
                    const meta = categoryMeta[item.category]
                    return (
                      <div
                        key={item.fdMarkingCode}
                        className={cn(
                          'flex items-center justify-between gap-3 sm:gap-5 rounded-xl border-l-4 border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 sm:px-5 sm:py-4 shadow-sm',
                          meta.border
                        )}
                      >
                        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                          <div className={cn('flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg', meta.bg)}>
                            {item.fdListType === 1 ? (
                              <Plane className={cn('h-4 w-4 sm:h-5 sm:w-5', meta.text)} />
                            ) : (
                              <Ship className={cn('h-4 w-4 sm:h-5 sm:w-5', meta.text)} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm sm:text-base font-bold text-[var(--color-primary)] truncate">{item.fdMarkingCode}</p>
                            <p className="text-xs sm:text-sm text-[var(--color-secondary)] truncate mt-0.5">
                              {item.fdConsignee || 'Unknown'} · {item.fdBranchCode || 'Tidak diketahui'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-6 shrink-0 text-right">
                          <div className="hidden sm:block">
                            <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)]">ETA</p>
                            <p className="text-sm font-medium text-[var(--color-primary)] mt-0.5">{formatDate(item.fdETA)}</p>
                          </div>
                          <span className={cn('rounded px-2.5 py-1 sm:px-3 text-[10px] sm:text-xs font-bold whitespace-nowrap', meta.badgeBg, meta.badgeText)}>
                            {item.daysUntil < 0 ? `${Math.abs(item.daysUntil)} hari lewat` : `${item.daysUntil} hari lagi`}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-2.5 sm:py-3 border-t border-[var(--color-border)] text-[10px] sm:text-xs text-[var(--color-secondary)] uppercase font-semibold tracking-wider bg-[var(--color-neutral)]">
          Prediksi bersifat estimasi — gunakan untuk prioritas follow-up, bukan pengganti konfirmasi ke pelayaran/gudang.
        </div>
      </div>
    </div>,
    document.body
  )
}