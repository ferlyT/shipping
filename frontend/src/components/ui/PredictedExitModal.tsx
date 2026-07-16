import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Clock, Ship, Plane, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Heritage theme tokens — same palette as ExitHistoryModal, for consistency:
// architectural minimalism meets journalistic gravitas. Deep ink on warm
// limestone, one single rust accent, flat surfaces only.
// ---------------------------------------------------------------------------
const heritage = {
  font: {
    display: { fontFamily: 'Fraunces, serif' },
    body: { fontFamily: '"Public Sans", sans-serif' },
    label: { fontFamily: '"Space Grotesk", sans-serif' },
  },
}

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

// Palet kategori ditarik dari kombinasi kartu harga: kategori paling kritis
// ("Terlambat") memakai kartu hitam solid + aksen rust — seperti kartu "Pro"
// yang jadi fokus perhatian. Kategori yang lebih tenang memakai kartu putih
// dengan outline ink yang makin tipis seiring makin rendah urgensinya.
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
    dot: 'bg-[#B8422E]',
    text: 'text-white',
    bg: 'bg-[#1A1C1E]',
    border: 'border-[#B8422E]',
    ring: 'ring-[#1A1C1E]',
    badgeBg: 'bg-[#B8422E]',
    badgeText: 'text-white',
    cellClass: 'bg-[#1A1C1E] border-[#1A1C1E] text-white',
    cellDateClass: 'text-white',
    tag: 'Terlambat',
  },
  segera: {
    label: 'Segera (0–3 hari)',
    dot: 'bg-[#B8422E]/70',
    text: 'text-[#B8422E]',
    bg: 'bg-[#B8422E]/10',
    border: 'border-[#B8422E]/60',
    ring: 'ring-[#B8422E]/60',
    badgeBg: 'bg-[#B8422E]/10',
    badgeText: 'text-[#B8422E]',
    cellClass: 'bg-white border-[#1A1C1E]/40 hover:border-[#1A1C1E]/60',
    cellDateClass: 'text-[#1A1C1E]',
  },
  dekat: {
    label: 'Dekat (4–7 hari)',
    dot: 'bg-[#1A1C1E]/50',
    text: 'text-[#1A1C1E]/70',
    bg: 'bg-[#1A1C1E]/5',
    border: 'border-[#1A1C1E]/30',
    ring: 'ring-[#1A1C1E]/30',
    badgeBg: 'bg-[#1A1C1E]/[0.06]',
    badgeText: 'text-[#1A1C1E]',
    cellClass: 'bg-white border-[#1A1C1E]/20 hover:border-[#1A1C1E]/35',
    cellDateClass: 'text-[#1A1C1E]',
  },
  normal: {
    label: 'Normal (>7 hari)',
    dot: 'bg-[#6C7278]/50',
    text: 'text-[#6C7278]',
    bg: 'bg-[#F7F5F2]',
    border: 'border-[#6C7278]/30',
    ring: 'ring-[#6C7278]/30',
    badgeBg: 'bg-[#F7F5F2]',
    badgeText: 'text-[#6C7278]',
    cellClass: 'bg-white border-[#6C7278]/15 hover:border-[#6C7278]/30',
    cellDateClass: 'text-[#1A1C1E]',
  },
}

const categoryPriority: CategoryKey[] = ['terlambat', 'segera', 'dekat', 'normal']
const MAX_BADGES_PER_DAY = 5
const MAX_BADGES_PER_DAY_MOBILE = 2

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
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h2
                className="text-lg sm:text-2xl font-medium text-[#1A1C1E] leading-none tracking-[-0.02em] truncate"
                style={heritage.font.display}
              >
                Prediksi Tanggal Exit
              </h2>
              <p
                className="text-[9px] sm:text-[11px] uppercase text-[#6C7278] mt-1.5 sm:mt-2 tracking-[0.06em] sm:tracking-[0.08em] truncate"
                style={heritage.font.label}
              >
                Estimasi delay ETA → Exit per consignee (data historis)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 shrink-0 hover:bg-[#F7F5F2] rounded-full text-[#6C7278] hover:text-[#1A1C1E] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body: nav, legend, calendar, detail all scroll together on mobile */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Month nav + legend */}
          <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 flex-wrap gap-3">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <button
                onClick={() => setViewMonth(new Date(year, month - 1, 1))}
                className="p-1.5 rounded-[4px] border border-[#6C7278]/25 hover:border-[#1A1C1E]/40 text-[#6C7278] hover:text-[#1A1C1E] transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs sm:text-sm font-medium text-[#1A1C1E] w-28 sm:w-40 text-center capitalize">
                {monthLabel}
              </span>
              <button
                onClick={() => setViewMonth(new Date(year, month + 1, 1))}
                className="p-1.5 rounded-[4px] border border-[#6C7278]/25 hover:border-[#1A1C1E]/40 text-[#6C7278] hover:text-[#1A1C1E] transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
                className="ml-1 text-[10px] sm:text-[11px] uppercase tracking-[0.06em] font-medium text-[#B8422E] underline decoration-dashed underline-offset-4 hover:opacity-70"
                style={heritage.font.label}
              >
                Hari ini
              </button>
              <span className="text-[11px] sm:text-xs text-[#6C7278] ml-1 sm:ml-2 whitespace-nowrap">
                {monthTotal} batch bulan ini
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {categoryPriority.map((k) => (
                <span key={k} className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold text-[#6C7278]">
                  <span className={cn('h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full shrink-0', categoryMeta[k].dot)} />
                  <span className="whitespace-nowrap">{categoryMeta[k].label}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Calendar grid */}
          <div className="px-4 sm:px-6 pt-4 sm:pt-5">
            <div
              className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[9px] sm:text-[10px] uppercase tracking-[0.04em] sm:tracking-[0.08em] text-[#6C7278] py-1.5 mb-1 sm:mb-1.5 sticky top-0 bg-white z-10 border-b border-[#6C7278]/10"
              style={heritage.font.label}
            >
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
                    onClick={() => items.length > 0 && setSelectedKey(isSelected ? null : key)}
                    disabled={items.length === 0}
                    className={cn(
                      'relative min-h-[64px] sm:min-h-[92px] rounded-[6px] sm:rounded-[8px] border text-left p-1 sm:p-2 flex flex-col gap-1 sm:gap-1.5 transition-all',
                      inMonth
                        ? worstMeta
                          ? worstMeta.cellClass
                          : 'bg-white border-[#6C7278]/15'
                        : 'bg-[#F7F5F2]/40 border-transparent',
                      !inMonth && 'opacity-40',
                      items.length > 0 ? 'hover:shadow-md cursor-pointer' : 'cursor-default',
                      isSelected && worstMeta ? cn('ring-2', worstMeta.ring) : '',
                      isToday && 'ring-2 ring-[#1A1C1E] ring-offset-1'
                    )}
                  >
                    {worstMeta?.tag && (
                      <span className="absolute -top-1.5 -right-1.5 bg-[#B8422E] text-white text-[7px] sm:text-[8px] font-bold uppercase tracking-wide px-1 sm:px-1.5 py-0.5 rounded-[2px] shadow-sm">
                        {worstMeta.tag}
                      </span>
                    )}
                    <span className={cn('text-[10px] sm:text-xs font-medium', worstMeta ? worstMeta.cellDateClass : 'text-[#6C7278]')}>
                      {date.getDate()}
                    </span>
                    {items.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 sm:gap-1">
                        {shown.map((item, badgeIdx) => {
                          const meta = categoryMeta[item.category]
                          const onDarkCell = worstCategory === 'terlambat'
                          return (
                            <span
                              key={item.fdMarkingCode}
                              title={`${item.fdMarkingCode} · ${item.fdConsignee || 'Unknown'}`}
                              className={cn(
                                'inline-block max-w-full truncate rounded-[2px] px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[10px] font-bold leading-tight',
                                onDarkCell ? 'bg-white/15 text-white' : cn(meta.badgeBg, meta.badgeText),
                                badgeIdx >= MAX_BADGES_PER_DAY_MOBILE && 'hidden sm:inline-block'
                              )}
                            >
                              {item.fdMarkingCode}
                            </span>
                          )
                        })}
                        {mobileOverflowCount > 0 && (
                          <span className="sm:hidden inline-block rounded-[2px] px-1 py-0.5 text-[8px] font-bold leading-tight bg-[#1A1C1E]/[0.06] text-[#6C7278]">
                            +{mobileOverflowCount}
                          </span>
                        )}
                        {overflowCount > 0 && (
                          <span className="hidden sm:inline-block rounded-[2px] px-1.5 py-0.5 text-[10px] font-bold leading-tight bg-[#1A1C1E]/[0.06] text-[#6C7278]">
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
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-t border-[#6C7278]/15 bg-[#F7F5F2]/50">
            {!selectedDate ? (
              <div className="flex flex-col items-center justify-center text-center text-[#6C7278] py-8 sm:py-10 gap-2">
                <CalendarDays className="h-6 w-6 sm:h-7 sm:w-7 opacity-50" />
                <p className="text-xs sm:text-sm">Klik tanggal yang ada badge marking code untuk lihat detail batch.</p>
              </div>
            ) : (
              <>
                <p className="text-xs sm:text-sm font-medium text-[#1A1C1E] mb-2.5 sm:mb-3">
                  {selectedDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  <span className="ml-2 font-normal text-xs sm:text-sm text-[#6C7278]">({selectedItems.length} batch)</span>
                </p>
                <div className="space-y-2.5 sm:space-y-3">
                  {selectedItems.map((item) => {
                    const meta = categoryMeta[item.category]
                    return (
                      <div
                        key={item.fdMarkingCode}
                        className={cn(
                          'flex items-center justify-between gap-3 sm:gap-5 rounded-[8px] border-l-4 border border-[#6C7278]/15 bg-white px-3 py-3 sm:px-5 sm:py-4 shadow-sm',
                          meta.border
                        )}
                      >
                        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                          <div className={cn('flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-[8px]', meta.bg)}>
                            {item.fdListType === 1 ? (
                              <Plane className={cn('h-4 w-4 sm:h-5 sm:w-5', meta.text)} />
                            ) : (
                              <Ship className={cn('h-4 w-4 sm:h-5 sm:w-5', meta.text)} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm sm:text-base font-medium text-[#1A1C1E] truncate">{item.fdMarkingCode}</p>
                            <p className="text-xs sm:text-sm text-[#6C7278] truncate mt-0.5">
                              {item.fdConsignee || 'Unknown'} · {item.fdBranchCode || 'Tidak diketahui'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-6 shrink-0 text-right">
                          <div className="hidden sm:block">
                            <p className="text-[10px] uppercase font-medium tracking-wide text-[#6C7278]" style={heritage.font.label}>ETA</p>
                            <p className="text-sm font-medium text-[#1A1C1E] mt-0.5">{formatDate(item.fdETA)}</p>
                          </div>
                          <span className={cn('rounded-[2px] px-2.5 py-1 sm:px-3 text-[10px] sm:text-xs font-bold whitespace-nowrap', meta.badgeBg, meta.badgeText)}>
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
        <div
          className="flex-shrink-0 px-4 sm:px-6 py-2.5 sm:py-3 border-t border-[#6C7278]/15 text-[9px] sm:text-[11px] text-[#6C7278] uppercase tracking-[0.03em] sm:tracking-[0.04em]"
          style={heritage.font.label}
        >
          Prediksi bersifat estimasi — gunakan untuk prioritas follow-up, bukan pengganti konfirmasi ke pelayaran/gudang.
        </div>
      </div>
    </div>,
    document.body
  )
}