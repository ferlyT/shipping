import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Search, Tag, ShieldCheck, Filter, Plane, Ship } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CurrencyValue } from '@/components/ui/CurrencyValue'
import { formatDate } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'

export interface PriceItem {
  id: number
  sheetType: string
  mode: string
  branch: string
  category: string
  price: number
}

interface PriceListDetailModalProps {
  isOpen: boolean
  onClose: () => void
  tglAgent?: string | null
  effectiveDate?: string | null
  expectedMode?: string | null
  expectedBranch?: string | null
  salesName?: string | null
  customerName?: string | null
  customerCode?: string | null
  hasCustomerPriceList?: boolean
  items: PriceItem[]
}

export function PriceListDetailModal({
  isOpen,
  onClose,
  tglAgent,
  effectiveDate,
  expectedMode,
  expectedBranch,
  salesName,
  customerName,
  customerCode,
  items,
}: PriceListDetailModalProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [selectedSheetType, setSelectedSheetType] = useState<string>('ALL')
  const [selectedMode, setSelectedMode] = useState<string>('ALL')
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL')
  const [filterOnlyRelevant, setFilterOnlyRelevant] = useState(true)

  // Sync default filter state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'

      const hasCustomerItems = items.some((it) => it.sheetType?.toUpperCase() === 'CUSTOMER')
      const isCsSales = salesName?.trim()?.toUpperCase().includes('CS')
      const defaultSheetType = hasCustomerItems ? 'CUSTOMER' : (isCsSales ? 'CS' : 'ALL')

      setSelectedSheetType(defaultSheetType)
      setSelectedMode(expectedMode ? expectedMode.toUpperCase() : 'ALL')
      setSelectedBranch(expectedBranch ? expectedBranch.toUpperCase() : 'ALL')
      setFilterOnlyRelevant(true)
      setSearch('')
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, expectedMode, expectedBranch, salesName, items])

  const availableBranches = useMemo(() => {
    const set = new Set<string>()
    items.forEach((it) => {
      if (it.branch) set.add(it.branch.trim().toUpperCase())
    })
    return Array.from(set).sort()
  }, [items])

  const availableSheetTypes = useMemo(() => {
    const set = new Set<string>()
    items.forEach((it) => {
      if (it.sheetType) set.add(it.sheetType.trim().toUpperCase())
    })
    const order = ['CUSTOMER', 'CS', 'MKT']
    return Array.from(set).sort((a, b) => {
      const idxA = order.indexOf(a)
      const idxB = order.indexOf(b)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return a.localeCompare(b)
    })
  }, [items])

  const filteredItems = useMemo(() => {
    let list = items

    if (selectedSheetType !== 'ALL') {
      list = list.filter((it) => it.sheetType?.trim().toUpperCase() === selectedSheetType)
    }

    if (filterOnlyRelevant) {
      if (selectedMode !== 'ALL') {
        list = list.filter((it) => it.mode?.trim().toUpperCase() === selectedMode)
      }
      if (selectedBranch !== 'ALL') {
        list = list.filter((it) => it.branch?.trim().toUpperCase() === selectedBranch)
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (it) =>
          it.category.toLowerCase().includes(q) ||
          it.branch.toLowerCase().includes(q) ||
          it.mode.toLowerCase().includes(q) ||
          it.sheetType.toLowerCase().includes(q)
      )
    }

    return list
  }, [items, selectedSheetType, filterOnlyRelevant, selectedMode, selectedBranch, search])

  // Group filtered items by sheetType (CUSTOMER / CS / MKT)
  const groupedItems = useMemo(() => {
    const groups: { key: string; label: string; items: PriceItem[] }[] = []
    const map = new Map<string, PriceItem[]>()

    // Priority order: CUSTOMER first, then CS, then MKT, then others
    const order = ['CUSTOMER', 'CS', 'MKT']

    filteredItems.forEach((it) => {
      const st = it.sheetType?.trim().toUpperCase() || 'OTHER'
      if (!map.has(st)) map.set(st, [])
      map.get(st)!.push(it)
    })

    // Sort according to priority order
    const keys = Array.from(map.keys()).sort((a, b) => {
      const idxA = order.indexOf(a)
      const idxB = order.indexOf(b)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return a.localeCompare(b)
    })

    keys.forEach((k) => {
      let label = k
      if (k === 'CUSTOMER') {
        label = customerName
          ? `${t('billing.validation.groupCustomer') || 'Harga Khusus Customer'} (${customerName})`
          : `${t('billing.validation.groupCustomer') || 'Harga Khusus Customer'} (${customerCode || 'Customer'})`
      } else if (k === 'CS') {
        label = t('billing.validation.groupCs')
      } else if (k === 'MKT') {
        label = t('billing.validation.groupMkt')
      }
      groups.push({ key: k, label, items: map.get(k)! })
    })

    return groups
  }, [filteredItems, t, customerName, customerCode])

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs transition-opacity font-[var(--font-body)]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xl)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-neutral)] flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <ShieldCheck className="w-5 h-5 text-[var(--color-primary)] shrink-0" />
              <h3 className="text-base font-bold font-[var(--font-label)] text-[var(--color-primary)]">
                {t('billing.validation.modalTitle')}
              </h3>
              {(expectedMode || expectedBranch) && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-transparent text-blue-500 border border-blue-500/40 flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  <span>
                    Relevan: {expectedMode === 'BY AIR' ? 'Udara (BY AIR)' : expectedMode === 'BY SEA' ? 'Laut (BY SEA)' : expectedMode || '—'}
                    {expectedBranch ? ` • ${expectedBranch}` : ''}
                  </span>
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--color-secondary)]">
              {t('billing.validation.modalSubtitle').replace('{date}', tglAgent ? formatDate(tglAgent) : '—')}
              {effectiveDate && (
                <span className="ml-2 inline-flex items-center gap-1 font-semibold text-blue-500">
                  <Tag className="w-3.5 h-3.5" />
                  {t('billing.validation.effectivePriceDate')}: {formatDate(effectiveDate)}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('billing.validation.modalSearch')}
                className="w-full pl-9 pr-4 py-2 text-xs border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-neutral)] text-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
            </div>

            {/* Toggle Relevant vs All */}
            <button
              type="button"
              onClick={() => setFilterOnlyRelevant((prev) => !prev)}
              className={`px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 border ${
                filterOnlyRelevant
                  ? 'bg-transparent border-blue-500 text-blue-500 shadow-xs'
                  : 'bg-[var(--color-surface)] text-[var(--color-secondary)] border-[var(--color-border)] hover:bg-[var(--color-neutral)]'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{filterOnlyRelevant ? t('billing.validation.filterRelevant') : t('billing.validation.showAll')}</span>
            </button>
          </div>

          {/* Group Tipe (CS / MKT), Mode & Branch Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              {/* SheetType Pill Filter (CS / MKT) */}
              <div className="flex items-center gap-1 bg-[var(--color-neutral)] p-1 rounded-[var(--radius-md)] border border-[var(--color-border)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] px-1">Tipe:</span>
                <button
                  type="button"
                  onClick={() => setSelectedSheetType('ALL')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all border ${
                    selectedSheetType === 'ALL'
                      ? 'bg-transparent border-[var(--color-primary)] text-[var(--color-primary)] shadow-xs'
                      : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                  }`}
                >
                  {t('billing.validation.allTypes')}
                </button>
                {availableSheetTypes.map((st) => {
                  const isActive = selectedSheetType === st
                  const isCust = st === 'CUSTOMER'
                  const isCs = st === 'CS'
                  const isMkt = st === 'MKT'
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSelectedSheetType(st)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all border ${
                        isActive
                          ? isCust
                            ? 'bg-transparent border-purple-500 text-purple-500 shadow-xs'
                            : isCs
                            ? 'bg-transparent border-blue-500 text-blue-500 shadow-xs'
                            : isMkt
                            ? 'bg-transparent border-amber-500 text-amber-500 shadow-xs'
                            : 'bg-transparent border-[var(--color-primary)] text-[var(--color-primary)] shadow-xs'
                          : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                      }`}
                    >
                      {isCust ? (t('billing.validation.groupCustomer') || 'Harga Customer') : st}
                    </button>
                  )
                })}
              </div>

              {/* Mode Selector */}
              <div className="flex items-center gap-1 bg-[var(--color-neutral)] p-1 rounded-[var(--radius-md)] border border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMode('ALL')
                    setFilterOnlyRelevant(true)
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all border ${
                    selectedMode === 'ALL'
                      ? 'bg-transparent border-[var(--color-primary)] text-[var(--color-primary)] shadow-xs'
                      : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                  }`}
                >
                  {t('billing.validation.allModes')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMode('BY AIR')
                    setFilterOnlyRelevant(true)
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all flex items-center gap-1 border ${
                    selectedMode === 'BY AIR'
                      ? 'bg-transparent border-amber-500 text-amber-500 shadow-xs'
                      : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                  }`}
                >
                  <Plane className="w-3 h-3" />
                  <span>Udara</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMode('BY SEA')
                    setFilterOnlyRelevant(true)
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all flex items-center gap-1 border ${
                    selectedMode === 'BY SEA'
                      ? 'bg-transparent border-blue-500 text-blue-500 shadow-xs'
                      : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                  }`}
                >
                  <Ship className="w-3 h-3" />
                  <span>Laut</span>
                </button>
              </div>
            </div>

            {/* Branch Selector */}
            {availableBranches.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin py-0.5">
                <span className="text-[11px] font-semibold text-[var(--color-secondary)] mr-1">Destinasi:</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBranch('ALL')
                    setFilterOnlyRelevant(true)
                  }}
                  className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full transition-all whitespace-nowrap border ${
                    selectedBranch === 'ALL'
                      ? 'bg-transparent border-[var(--color-primary)] text-[var(--color-primary)] shadow-xs'
                      : 'bg-transparent text-[var(--color-secondary)] border border-[var(--color-border)] hover:text-[var(--color-primary)]'
                  }`}
                >
                  Semua
                </button>
                {availableBranches.map((br) => {
                  const isActive = selectedBranch === br
                  return (
                    <button
                      key={br}
                      type="button"
                      onClick={() => {
                        setSelectedBranch(br)
                        setFilterOnlyRelevant(true)
                      }}
                      className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full transition-all whitespace-nowrap border ${
                        isActive
                          ? 'bg-transparent border-blue-500 text-blue-500 shadow-xs'
                          : 'bg-transparent text-[var(--color-secondary)] border border-[var(--color-border)] hover:text-[var(--color-primary)]'
                      }`}
                    >
                      {br}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Grouped Tables Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin bg-[var(--color-surface)] space-y-6">
          {groupedItems.length > 0 ? (
            groupedItems.map((group) => {
              const isCustGroup = group.key === 'CUSTOMER'
              const isCsGroup = group.key === 'CS'
              const isMktGroup = group.key === 'MKT'

              return (
                <div key={group.key} className="space-y-2.5">
                  {/* Group Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${
                          isCustGroup
                            ? 'bg-transparent text-purple-500 border-purple-500/40'
                            : isCsGroup
                            ? 'bg-transparent text-blue-500 border-blue-500/40'
                            : isMktGroup
                            ? 'bg-transparent text-amber-500 border-amber-500/40'
                            : 'bg-transparent text-[var(--color-secondary)] border-[var(--color-border)]'
                        }`}
                      >
                        {isCustGroup ? 'CUSTOMER' : group.key}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold font-[var(--font-label)] text-[var(--color-primary)]">
                        {group.label}
                      </h4>
                    </div>
                    <span className="text-xs font-semibold text-[var(--color-secondary)] bg-[var(--color-neutral)] px-2.5 py-0.5 rounded-full border border-[var(--color-border)]">
                      {group.items.length} tarif
                    </span>
                  </div>

                  {/* Group Table */}
                  <div className="border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden shadow-xs">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-[var(--color-neutral)] border-b border-[var(--color-border)]">
                          <th className="px-3.5 py-2.5 text-left font-bold uppercase font-[var(--font-label)] text-[var(--color-secondary)]">
                            {t('billing.validation.colSheetType')}
                          </th>
                          <th className="px-3.5 py-2.5 text-left font-bold uppercase font-[var(--font-label)] text-[var(--color-secondary)]">
                            {t('billing.validation.colMode')}
                          </th>
                          <th className="px-3.5 py-2.5 text-left font-bold uppercase font-[var(--font-label)] text-[var(--color-secondary)]">
                            {t('billing.validation.colBranch')}
                          </th>
                          <th className="px-3.5 py-2.5 text-left font-bold uppercase font-[var(--font-label)] text-[var(--color-secondary)]">
                            {t('billing.validation.colCategory')}
                          </th>
                          <th className="px-3.5 py-2.5 text-right font-bold uppercase font-[var(--font-label)] text-[var(--color-secondary)]">
                            {t('billing.validation.colTariff')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
                        {group.items.map((item) => {
                          const isRelevantRow =
                            (!expectedMode || item.mode?.toUpperCase() === expectedMode.toUpperCase()) &&
                            (!expectedBranch || item.branch?.toUpperCase() === expectedBranch.toUpperCase())

                          return (
                            <tr
                              key={item.id}
                              className={`transition-colors ${
                                isRelevantRow
                                  ? 'bg-blue-500/10 hover:bg-blue-500/15 font-semibold'
                                  : 'hover:bg-[var(--color-neutral)]/50'
                              }`}
                            >
                              <td className="px-3.5 py-2.5 font-bold text-[var(--color-primary)]">{item.sheetType}</td>
                              <td className="px-3.5 py-2.5 font-medium text-[var(--color-secondary)]">{item.mode}</td>
                              <td className="px-3.5 py-2.5 font-semibold text-[var(--color-primary)]">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-transparent border border-[var(--color-border)] text-[var(--color-primary)]">
                                  {item.branch || '—'}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 font-semibold text-[var(--color-primary)]">{item.category}</td>
                              <td className="px-3.5 py-2.5 text-right font-bold text-[var(--color-tertiary)] tabular-nums">
                                <CurrencyValue value={item.price} currency="Rp." />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="py-12 text-center text-xs text-[var(--color-secondary)]">
              {t('billing.validation.noPriceList')}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[var(--color-border)] bg-[var(--color-neutral)] flex items-center justify-between">
          <span className="text-xs text-[var(--color-secondary)] font-medium">
            Total <span className="font-bold text-[var(--color-primary)]">{filteredItems.length}</span> tarif
            {filterOnlyRelevant && items.length !== filteredItems.length && (
              <span className="ml-1 text-[11px] text-[var(--color-secondary)]">
                (dari total {items.length} tarif)
              </span>
            )}
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
