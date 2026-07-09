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
}> = {
  terlambat: { label: 'Terlambat', dot: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-300', ring: 'ring-rose-300', badgeBg: 'bg-rose-100', badgeText: 'text-rose-700' },
  segera: { label: 'Segera (0–3 hari)', dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-300', ring: 'ring-amber-300', badgeBg: 'bg-amber-100', badgeText: 'text-amber-700' },
  dekat: { label: 'Dekat (4–7 hari)', dot: 'bg-sky-500', text: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-300', ring: 'ring-sky-300', badgeBg: 'bg-sky-100', badgeText: 'text-sky-700' },
  normal: { label: 'Normal (>7 hari)', dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-300', ring: 'ring-emerald-300', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700' },
}

const categoryPriority: CategoryKey[] = ['terlambat', 'segera', 'dekat', 'normal']
const MAX_BADGES_PER_DAY = 5

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

export function PredictedExitModal({
  isOpen,
  onClose,
  data,
}: {
  isOpen: boolean
  onClose: () => void
  data: PrediksiExitItem[]
}) {
  const today = useMemo(() => new Date(), [])
  const [viewMonth, setViewMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const itemsByDate = useMemo(() => {
    const map: Record<string, PrediksiExitItem[]> = {}
    data.forEach((item) => {
      const d = new Date(item.predictedExitDate)
      if (Number.isNaN(d.getTime())) return
      const key = toKey(d)
      if (!map[key]) map[key] = []
      map[key].push(item)
    })
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => categoryPriority.indexOf(a.category) - categoryPriority.indexOf(b.category))
    )
    return map
  }, [data])

  useMemo(() => {
    if (!isOpen) return
    const sorted = [...data].sort((a, b) => a.daysUntil - b.daysUntil)
    const target = sorted[0]
    if (target) {
      const d = new Date(target.predictedExitDate)
      if (!Number.isNaN(d.getTime())) {
        setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1))
        setSelectedKey(toKey(d))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  if (!isOpen || typeof document === 'undefined') return null

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = (firstOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells: { date: Date; inMonth: boolean }[] = []
  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true })
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false })
  }

  const monthLabel = viewMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  const selectedItems = selectedKey ? itemsByDate[selectedKey] || [] : []
  const selectedDate = selectedKey ? new Date(selectedKey) : null

  const monthTotal = cells
    .filter((c) => c.inMonth)
    .reduce((sum, c) => sum + (itemsByDate[toKey(c.date)]?.length || 0), 0)

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl m-auto bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-2xl flex flex-col max-h-[90vh] border border-[var(--color-border)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-amber-50 text-amber-600 border border-amber-200">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--color-primary)] leading-none">Prediksi Tanggal Exit</h2>
              <p className="text-xs text-[var(--color-secondary)] mt-1.5">
                Estimasi rata-rata delay ETA → Exit per consignee (data historis)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--color-neutral)] rounded-full text-[var(--color-secondary)]">
            <X size={20} />
          </button>
        </div>

        {/* Month nav + legend */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 pt-4 flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setViewMonth(new Date(year, month - 1, 1))}
              className="p-1.5 rounded-md border border-[var(--color-border)] hover:bg-[var(--color-neutral)] text-[var(--color-secondary)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold text-[var(--color-primary)] w-40 text-center capitalize">{monthLabel}</span>
            <button
              onClick={() => setViewMonth(new Date(year, month + 1, 1))}
              className="p-1.5 rounded-md border border-[var(--color-border)] hover:bg-[var(--color-neutral)] text-[var(--color-secondary)]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
              className="ml-1 text-xs font-bold text-[var(--color-secondary)] underline decoration-dashed underline-offset-2 hover:text-[var(--color-primary)]"
            >
              Hari ini
            </button>
            <span className="text-xs text-[var(--color-secondary)] ml-2">{monthTotal} batch bulan ini</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {categoryPriority.map((k) => (
              <span key={k} className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-secondary)]">
                <span className={cn('h-2.5 w-2.5 rounded-full', categoryMeta[k].dot)} />
                {categoryMeta[k].label}
              </span>
            ))}
          </div>
        </div>

        {/* Calendar grid */}
        <div className="flex-shrink-0 px-6 pt-4 overflow-y-auto" style={{ maxHeight: '48vh' }}>
          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold uppercase tracking-wide text-[var(--color-secondary)] mb-1.5 sticky top-0 bg-[var(--color-surface)] z-10">
            {WEEKDAYS.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2 pb-2">
            {cells.map(({ date, inMonth }, idx) => {
              const key = toKey(date)
              const items = itemsByDate[key] || []
              const isToday = isSameDay(date, today)
              const isSelected = selectedKey === key
              const worstCategory = categoryPriority.find((c) => items.some((i) => i.category === c))
              const shown = items.slice(0, MAX_BADGES_PER_DAY)
              const overflowCount = items.length - shown.length

              return (
                <button
                  key={idx}
                  onClick={() => items.length > 0 && setSelectedKey(isSelected ? null : key)}
                  disabled={items.length === 0}
                  className={cn(
                    'relative min-h-[92px] rounded-[var(--radius-lg)] border text-left p-2 flex flex-col gap-1.5 transition-all',
                    inMonth ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-neutral)]/40',
                    !inMonth && 'opacity-40',
                    items.length === 0 ? 'border-[var(--color-border)] cursor-default' : 'border-[var(--color-border)] hover:shadow-md cursor-pointer',
                    isSelected && worstCategory ? cn('ring-2', categoryMeta[worstCategory].ring) : '',
                    isToday && 'border-[var(--color-primary)] border-2'
                  )}
                >
                  <span className={cn('text-xs font-bold', isToday ? 'text-[var(--color-primary)]' : 'text-[var(--color-secondary)]')}>
                    {date.getDate()}
                  </span>
                  {items.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {shown.map((item) => {
                        const meta = categoryMeta[item.category]
                        return (
                          <span
                            key={item.fdMarkingCode}
                            title={`${item.fdMarkingCode} · ${item.fdConsignee || 'Unknown'}`}
                            className={cn(
                              'inline-block max-w-full truncate rounded px-1.5 py-0.5 text-[10px] font-bold leading-tight',
                              meta.badgeBg,
                              meta.badgeText
                            )}
                          >
                            {item.fdMarkingCode}
                          </span>
                        )
                      })}
                      {overflowCount > 0 && (
                        <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold leading-tight bg-[var(--color-neutral)] text-[var(--color-secondary)]">
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
        <div className="flex-1 overflow-y-auto px-6 py-5 border-t border-[var(--color-border)] bg-[var(--color-neutral)]/30">
          {!selectedDate ? (
            <div className="flex flex-col items-center justify-center text-center text-[var(--color-secondary)] py-10 gap-2">
              <CalendarDays className="h-7 w-7 opacity-50" />
              <p className="text-sm">Klik tanggal yang ada badge marking code untuk lihat detail batch.</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-bold text-[var(--color-primary)] mb-3">
                {selectedDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                <span className="ml-2 font-normal text-sm text-[var(--color-secondary)]">({selectedItems.length} batch)</span>
              </p>
              <div className="space-y-3">
                {selectedItems.map((item) => {
                  const meta = categoryMeta[item.category]
                  return (
                    <div
                      key={item.fdMarkingCode}
                      className={cn('flex items-center justify-between gap-5 rounded-[var(--radius-lg)] border-l-4 border bg-[var(--color-surface)] px-5 py-4 shadow-sm', meta.border)}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)]', meta.bg)}>
                          {item.fdListType === 1 ? (
                            <Plane className={cn('h-5 w-5', meta.text)} />
                          ) : (
                            <Ship className={cn('h-5 w-5', meta.text)} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-base font-bold text-[var(--color-primary)] truncate">{item.fdMarkingCode}</p>
                          <p className="text-sm text-[var(--color-secondary)] truncate mt-0.5">
                            {item.fdConsignee || 'Unknown'} · {item.fdBranchCode || 'Tidak diketahui'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 shrink-0 text-right">
                        <div className="hidden sm:block">
                          <p className="text-[11px] uppercase font-bold tracking-wide text-[var(--color-secondary)]">ETA</p>
                          <p className="text-sm font-medium text-[var(--color-primary)] mt-0.5">{formatDate(item.fdETA)}</p>
                        </div>
                        <span className={cn('rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap', meta.badgeBg, meta.badgeText)}>
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

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-[var(--color-border)] text-[11px] text-[var(--color-secondary)]">
          Prediksi bersifat estimasi — gunakan untuk prioritas follow-up, bukan pengganti konfirmasi ke pelayaran/gudang.
        </div>
      </div>
    </div>,
    document.body
  )
}
