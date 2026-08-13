import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { X, Search, Plane, Ship, LayoutGrid, Check, ChevronRight, FileText, User } from 'lucide-react'
import { billingApi } from '../services/billing.service'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { CurrencyValue } from '@/components/ui/CurrencyValue'
import { useTranslation } from '@/hooks/useTranslation'
import { useDebounce } from '@/hooks/useDebounce'

interface ValidationListDrawerProps {
  isOpen: boolean
  onClose: () => void
  currentInvNo: string
  onSelectInvoice: (invNo: string) => void
}

interface Billing {
  fdInvNo: string
  fdInvDate: string
  fdCustCode: string
  fdDescr: string
  fdJumlah1: number
  fdJumlah2?: number | null
  fdCurr1: string | null
  fdMarkingCode: string | null
  fdMarkingNo: string | null
  fdListType?: number | null
  fdGive?: number | null
  fdGive2?: number | null
  fdCekDate?: string | null
  employee?: {
    fdEmpName: string | null
  } | null
  customer?: {
    fdCustName: string | null
  } | null
}

export function ValidationListDrawer({
  isOpen,
  onClose,
  currentInvNo,
  onSelectInvoice,
}: ValidationListDrawerProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [modeFilter, setModeFilter] = useState<'all' | 1 | 2>('all')
  const [authorFilter, setAuthorFilter] = useState<string>('all')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      const timer = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const { data: listRes, isLoading, isError } = useQuery({
    queryKey: ['billingValidationListDrawer', debouncedSearch],
    queryFn: async () => {
      const res = await billingApi.list({
        hasAmount: 'true',
        draftOnly: 'true',
        noPagination: 'true',
        minYear: '2023',
        ...(debouncedSearch && { search: debouncedSearch }),
      })
      return res.data
    },
    enabled: isOpen,
    placeholderData: keepPreviousData,
    staleTime: 60000,
  })

  const billingsData = listRes?.data || []

  // Filter active draft billings (> 2022, draft status, amount > 0)
  const activeDraftBillings = useMemo(() => {
    return billingsData.filter((b: Billing) => {
      if (b.fdInvDate) {
        const year = new Date(b.fdInvDate).getFullYear()
        if (!isNaN(year) && year <= 2022) return false
      }

      const amt1 = Number(b.fdJumlah1 || 0)
      const amt2 = Number(b.fdJumlah2 || 0)
      if (amt1 <= 0 && amt2 <= 0) return false

      const isDraft = (b.fdGive2 ?? 0) !== 1 && (b.fdGive ?? 0) !== 1 && !b.fdCekDate
      return isDraft
    })
  }, [billingsData])

  // Extract unique authors (billing creators) with count
  const availableAuthors = useMemo(() => {
    const map = new Map<string, number>()
    activeDraftBillings.forEach((b: Billing) => {
      const author = b.employee?.fdEmpName?.trim() || 'UNASSIGNED'
      map.set(author, (map.get(author) || 0) + 1)
    })
    return Array.from(map.entries()).map(([author, count]) => ({ author, count }))
  }, [activeDraftBillings])

  // Filter by mode (Udara = 1, Laut = 2) AND author, sorted by oldest invoice date first
  const filteredBillings = useMemo(() => {
    const list = activeDraftBillings.filter((b: Billing) => {
      if (modeFilter !== 'all' && b.fdListType !== modeFilter) return false
      if (authorFilter !== 'all') {
        const author = b.employee?.fdEmpName?.trim() || 'UNASSIGNED'
        if (author !== authorFilter) return false
      }
      return true
    })

    return list.sort((a: Billing, b: Billing) => {
      const timeA = a.fdInvDate ? new Date(a.fdInvDate).getTime() : 0
      const timeB = b.fdInvDate ? new Date(b.fdInvDate).getTime() : 0
      return timeA - timeB
    })
  }, [activeDraftBillings, modeFilter, authorFilter])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs animate-fadeIn">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Body */}
      <div className="relative w-full max-w-md sm:max-w-lg bg-[var(--color-surface)] h-full shadow-2xl border-l border-[var(--color-border)] flex flex-col z-10 animate-slideInRight">
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-[var(--color-border)] bg-[var(--color-neutral)] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--color-primary)] text-white shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--color-primary)] font-[var(--font-display)]">
                {t('billing.validation.selectInvoiceTitle')}
              </h2>
              <p className="text-xs text-[var(--color-secondary)]">
                {t('billing.validation.selectInvoiceSubtitle')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-border)]/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search, Mode Filter & Author Filter */}
        <div className="p-3 sm:p-4 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/40 space-y-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)]" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('billing.validation.searchDrawerPlaceholder')}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Mode Filter Pills */}
          <div className="flex items-center gap-1.5 text-xs flex-wrap">
            <button
              onClick={() => setModeFilter('all')}
              className={`px-3 py-1 rounded-full border text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
                modeFilter === 'all'
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-2xs'
                  : 'bg-[var(--color-surface)] text-[var(--color-secondary)] border-[var(--color-border)] hover:bg-[var(--color-neutral)]'
              }`}
            >
              <LayoutGrid className="w-3 h-3" />
              <span>{t('billing.validation.filterAllCount', { count: activeDraftBillings.length })}</span>
            </button>

            <button
              onClick={() => setModeFilter(1)}
              className={`px-3 py-1 rounded-full border text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
                modeFilter === 1
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : 'bg-[var(--color-surface)] text-amber-700 dark:text-amber-400 border-[var(--color-border)] hover:bg-amber-50 dark:hover:bg-amber-950/30'
              }`}
            >
              <Plane className="w-3 h-3" />
              <span>{t('billing.validation.filterAir')}</span>
            </button>

            <button
              onClick={() => setModeFilter(2)}
              className={`px-3 py-1 rounded-full border text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
                modeFilter === 2
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-[var(--color-surface)] text-blue-700 dark:text-blue-400 border-[var(--color-border)] hover:bg-blue-50 dark:hover:bg-blue-950/30'
              }`}
            >
              <Ship className="w-3 h-3" />
              <span>{t('billing.validation.filterSea')}</span>
            </button>
          </div>

          {/* Author / Created By Filter Pills */}
          {availableAuthors.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-[var(--color-border)]/50">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] flex items-center gap-1">
                <User className="w-3 h-3 text-[var(--color-primary)]" />
                {t('billing.validation.filterAuthorLabel')}
              </p>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                <button
                  onClick={() => setAuthorFilter('all')}
                  className={`px-2.5 py-0.5 rounded-md border text-[10px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    authorFilter === 'all'
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-[var(--color-surface)] text-[var(--color-secondary)] border-[var(--color-border)] hover:bg-[var(--color-neutral)]'
                  }`}
                >
                  {t('billing.validation.filterAuthorAll')}
                </button>

                {availableAuthors.map(({ author, count }) => (
                  <button
                    key={author}
                    onClick={() => setAuthorFilter(authorFilter === author ? 'all' : author)}
                    className={`px-2.5 py-0.5 rounded-md border text-[10px] font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                      authorFilter === author
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-[var(--color-surface)] text-[var(--color-primary)] border-[var(--color-border)] hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                    }`}
                  >
                    <span>{author}</span>
                    <span className="opacity-75">({count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          {isLoading ? (
            <div className="py-16 flex items-center justify-center">
              <LoadingSpinner message={t('billing.validation.loadingDrawer')} />
            </div>
          ) : isError ? (
            <div className="p-4 text-center text-xs text-red-600 bg-red-50 rounded-lg">
              {t('billing.validation.errorDrawer')}
            </div>
          ) : filteredBillings.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-7 h-7" />}
              title={t('billing.validation.emptyDrawerTitle')}
              description={search ? t('billing.validation.emptyDrawerSearch', { search }) : t('billing.validation.emptyDrawerNoData')}
            />
          ) : (
            filteredBillings.map((b: Billing) => {
              const isSelected = b.fdInvNo === currentInvNo
              const isAir = b.fdListType === 1

              return (
                <div
                  key={b.fdInvNo}
                  onClick={() => {
                    if (!isSelected) {
                      onSelectInvoice(b.fdInvNo)
                    }
                    onClose()
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer group ${
                    isSelected
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-1 ring-[var(--color-primary)]/30 shadow-xs'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-[var(--color-primary)] font-mono group-hover:text-blue-600 transition-colors">
                          {b.fdInvNo}
                        </span>
                        {isSelected && (
                          <Badge variant="success" className="text-[9px] px-1.5 py-0 font-semibold flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                            {t('billing.validation.currentlyOpen')}
                          </Badge>
                        )}
                        <Badge
                          variant={isAir ? 'warning' : 'info'}
                          className="text-[9px] px-1.5 py-0 uppercase font-semibold"
                        >
                          {isAir ? t('billing.validation.filterAir').toUpperCase() : t('billing.validation.filterSea').toUpperCase()}
                        </Badge>
                      </div>

                      <p className="mt-1 text-xs font-semibold text-[var(--color-primary)] line-clamp-1">
                        {b.customer?.fdCustName || b.fdCustCode || '—'}
                      </p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[var(--color-primary)] group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                  </div>

                  <div className="mt-2 pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between gap-2 text-[11px] text-[var(--color-secondary)]">
                    <div>
                      {t('billing.validation.markingLabel')} <span className="font-medium text-[var(--color-primary)]">{b.fdMarkingNo || b.fdMarkingCode || '—'}</span>
                    </div>
                    <div className="font-bold text-[var(--color-primary)] font-mono">
                      <CurrencyValue value={b.fdJumlah1} currency={b.fdCurr1 || 'IDR'} />
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
