import { useState, useMemo } from 'react'
import {
  Search,
  ChevronDown,
  ChevronsUpDown,
  Anchor,
  Plane,
  Ship,
  Layers,
  LayoutGrid,
  List,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
import type { PriceListLookupItem } from '../types'

export interface CategoryGroupedPriceTableProps {
  items: (PriceListLookupItem & { isMatch?: boolean })[]
  totalOriginalCount?: number
  searchQuery?: string
  onSearchChange?: (val: string) => void
  onManageMarkings?: (item: PriceListLookupItem) => void
  selectedComodityName?: string | null
  emptyMessage?: string
  defaultViewMode?: 'grouped' | 'flat'
}

interface CategoryGroup {
  category: string
  items: (PriceListLookupItem & { isMatch?: boolean })[]
  minPrice: number
  maxPrice: number
  modes: string[]
  sheetTypes: string[]
  branches: string[]
  hasMatch: boolean
}

export function CategoryGroupedPriceTable({
  items,
  totalOriginalCount,
  searchQuery,
  onSearchChange,
  onManageMarkings,
  selectedComodityName,
  emptyMessage,
  defaultViewMode = 'grouped',
}: CategoryGroupedPriceTableProps) {
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>(defaultViewMode)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  // Group items by category
  const groupedCategories = useMemo<CategoryGroup[]>(() => {
    if (!items || items.length === 0) return []

    const map = new Map<string, CategoryGroup>()

    items.forEach((item) => {
      const cat = item.category || 'LAIN-LAIN / UNKNOWN'
      if (!map.has(cat)) {
        map.set(cat, {
          category: cat,
          items: [item],
          minPrice: item.price,
          maxPrice: item.price,
          modes: [item.mode],
          sheetTypes: [item.sheetType],
          branches: [item.branch],
          hasMatch: Boolean(item.isMatch),
        })
      } else {
        const group = map.get(cat)!
        group.items.push(item)
        group.minPrice = Math.min(group.minPrice, item.price)
        group.maxPrice = Math.max(group.maxPrice, item.price)
        if (!group.modes.includes(item.mode)) group.modes.push(item.mode)
        if (!group.sheetTypes.includes(item.sheetType)) group.sheetTypes.push(item.sheetType)
        if (!group.branches.includes(item.branch)) group.branches.push(item.branch)
        if (item.isMatch) group.hasMatch = true
      }
    })

    // Sort categories: matched ones first, then alphabetical
    return Array.from(map.values()).sort((a, b) => {
      if (a.hasMatch && !b.hasMatch) return -1
      if (!a.hasMatch && b.hasMatch) return 1
      return a.category.localeCompare(b.category)
    })
  }, [items])

  const allCollapsed = useMemo(() => {
    if (groupedCategories.length === 0) return false
    return groupedCategories.every((g) => collapsedCategories.has(g.category))
  }, [groupedCategories, collapsedCategories])

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) {
        next.delete(cat)
      } else {
        next.add(cat)
      }
      return next
    })
  }

  const handleToggleAll = () => {
    if (allCollapsed) {
      // Expand all
      setCollapsedCategories(new Set())
    } else {
      // Collapse all
      setCollapsedCategories(new Set(groupedCategories.map((g) => g.category)))
    }
  }

  // Flat Table Columns definition
  const flatColumns = useMemo(
    () => [
      {
        key: 'sheetType',
        header: 'TYPE',
        className: 'w-[80px]',
        render: (item: PriceListLookupItem) => (
          <Badge variant="default" className="font-mono text-[0.7rem]">
            {item.sheetType}
          </Badge>
        ),
      },
      {
        key: 'mode',
        header: 'MODE',
        className: 'w-[110px]',
        render: (item: PriceListLookupItem) => (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)]">
            {item.mode.toUpperCase().includes('SEA') ? (
              <Anchor size={13} className="text-blue-500 shrink-0" />
            ) : (
              <Plane size={13} className="text-sky-500 shrink-0" />
            )}
            {item.mode}
          </span>
        ),
      },
      {
        key: 'branch',
        header: 'CABANG',
        className: 'w-[90px]',
        render: (item: PriceListLookupItem) => (
          <span className="font-semibold text-xs text-[var(--color-primary)]">{item.branch}</span>
        ),
      },
      {
        key: 'transitTime',
        header: 'ESTIMASI WAKTU',
        className: 'w-[150px] whitespace-nowrap',
        render: (item: PriceListLookupItem) => (
          <span className="text-xs text-[var(--color-secondary)]">{item.transitTime || '-'}</span>
        ),
      },
      {
        key: 'category',
        header: 'KATEGORI BARANG',
        className: 'w-auto',
        render: (item: PriceListLookupItem & { isMatch?: boolean }) => (
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs ${
                item.isMatch
                  ? 'font-bold text-emerald-700 dark:text-emerald-300'
                  : 'font-medium text-[var(--color-primary)]'
              }`}
            >
              {item.category}
            </span>
            {item.isMatch && (
              <Badge variant="success" className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0">
                <CheckCircle2 size={11} />
                Match Kategori
              </Badge>
            )}
          </div>
        ),
      },
      {
        key: 'markings',
        header: 'AGEN / MARKING',
        className: 'w-[180px]',
        render: (item: PriceListLookupItem) => {
          const markings = item.markings || []
          if (markings.length === 0) {
            return (
              <span className="text-[11px] font-medium text-[var(--color-secondary)]/70 italic">
                Semua Agen
              </span>
            )
          }
          return (
            <div className="flex items-center gap-1 flex-wrap">
              {markings.map((m, idx) => (
                <span
                  key={`${m.markingCode}-${m.mode || 'ALL'}-${idx}`}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25"
                  title={
                    m.agentName
                      ? `${m.markingCode} (${m.agentName}${m.mode ? ` · ${m.mode}` : ''})`
                      : `${m.markingCode}${m.mode ? ` (${m.mode})` : ''}`
                  }
                >
                  {m.mode?.toUpperCase().includes('AIR') && <Plane size={9} className="text-sky-500" />}
                  {m.mode?.toUpperCase().includes('SEA') && <Ship size={9} className="text-blue-500" />}
                  <span>{m.markingCode}</span>
                  {m.agentName && (
                    <span className="text-[9px] font-normal text-[var(--color-secondary)]">
                      · {m.agentName}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )
        },
      },

      {
        key: 'price',
        header: 'HARGA (TARIF)',
        className: 'w-[150px] text-right',
        render: (item: PriceListLookupItem & { isMatch?: boolean }) => (
          <span
            className={`font-bold text-xs ${
              item.isMatch
                ? 'text-emerald-700 dark:text-emerald-300 text-sm'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {formatCurrency(item.price)}
          </span>
        ),
      },
    ],
    [onManageMarkings, t]
  )

  const hasAnyMatch = useMemo(() => items.some((i) => i.isMatch), [items])

  return (
    <div className="space-y-4">
      {/* Top Toolbar: Search + Stats + View Mode + Expand/Collapse */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          {onSearchChange !== undefined && (
            <div className="relative flex-1 max-w-sm">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] pointer-events-none"
              />
              <input
                type="text"
                placeholder={t('priceList.lookup.searchPlaceholder')}
                value={searchQuery || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-8 h-9 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-neutral)]/50 text-[var(--color-primary)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:bg-[var(--color-surface)]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] hover:text-[var(--color-primary)] text-xs font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Action Toolbar */}
          <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
            {/* Stats Badge */}
            <div className="text-xs text-[var(--color-secondary)] px-2">
              <span className="font-semibold text-[var(--color-primary)]">
                {groupedCategories.length}
              </span>{' '}
              {t('priceList.lookup.categoriesCount', { count: groupedCategories.length })}{' '}
              <span className="text-[var(--color-secondary)]/50">·</span>{' '}
              <span className="font-semibold text-[var(--color-primary)]">{items.length}</span>{' '}
              {t('priceList.lookup.tariffsCount', { count: items.length })}
              {totalOriginalCount !== undefined && totalOriginalCount !== items.length && (
                <span className="text-[var(--color-secondary)]/70">
                  {' '}
                  (dari {totalOriginalCount} total)
                </span>
              )}
            </div>

            {/* Expand / Collapse All (Grouped Mode Only) */}
            {viewMode === 'grouped' && groupedCategories.length > 0 && (
              <button
                type="button"
                onClick={handleToggleAll}
                className="h-8 px-2.5 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-neutral)] rounded-lg border border-[var(--color-border)] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ChevronsUpDown size={13} className="text-[var(--color-secondary)]" />
                <span>
                  {allCollapsed
                    ? t('priceList.lookup.expandAll')
                    : t('priceList.lookup.collapseAll')}
                </span>
              </button>
            )}

            {/* View Mode Toggle: Grouped vs Flat */}
            <div
              role="group"
              aria-label="View mode"
              className="inline-flex items-center p-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]"
            >
              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  viewMode === 'grouped'
                    ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-2xs'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                }`}
                title={t('priceList.lookup.groupByCategory')}
              >
                <LayoutGrid size={13} />
                <span className="hidden sm:inline">{t('priceList.lookup.groupByCategory')}</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('flat')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  viewMode === 'flat'
                    ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-2xs'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                }`}
                title={t('priceList.lookup.flatTable')}
              >
                <List size={13} />
                <span className="hidden sm:inline">{t('priceList.lookup.flatTable')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {items.length === 0 ? (
        <div className="p-12 text-center border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)] shadow-xs space-y-2">
          <p className="text-sm font-semibold text-[var(--color-primary)]">
            {emptyMessage || t('priceList.lookup.noMatch')}
          </p>
          <p className="text-xs text-[var(--color-secondary)]">
            Coba sesuaikan filter atau kata kunci pencarian Anda.
          </p>
        </div>
      ) : viewMode === 'flat' ? (
        /* Flat Table View */
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs overflow-hidden">
          <Table
            columns={flatColumns}
            data={items}
            keyExtractor={(item) => item.id}
            emptyMessage={emptyMessage || t('priceList.lookup.noMatch')}
          />
        </div>
      ) : (
        /* Grouped by Category View */
        <div className="space-y-3.5 animate-fadeIn">
          {groupedCategories.map((group) => {
            const isCollapsed = collapsedCategories.has(group.category)

            return (
              <div
                key={group.category}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs ${
                  group.hasMatch
                    ? 'border-emerald-500/50 bg-[var(--color-surface)] ring-1 ring-emerald-500/20'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                }`}
              >
                {/* Category Header Bar */}
                <div
                  onClick={() => toggleCategory(group.category)}
                  className={`w-full text-left p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                    group.hasMatch
                      ? 'bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08]'
                      : 'hover:bg-[var(--color-neutral)]/40'
                  }`}
                >
                  {/* Left: Category Title, Match Badge, Attributes */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        group.hasMatch
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      }`}
                    >
                      {group.hasMatch ? <Sparkles size={18} /> : <Layers size={18} />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-[var(--color-primary)] truncate">
                          {group.category}
                        </h4>

                        {group.hasMatch && (
                          <Badge variant="success" className="gap-1 text-[10px] px-2 py-0.5">
                            <CheckCircle2 size={11} />
                            {selectedComodityName
                              ? `Cocok: ${selectedComodityName}`
                              : t('priceList.lookup.matchedCategory')}
                          </Badge>
                        )}
                      </div>

                      {/* Attribute Pills */}
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-[var(--color-secondary)] mt-1">
                        <span className="font-semibold text-[var(--color-primary)]">
                          {t('priceList.lookup.tariffVariations', { count: group.items.length })}
                        </span>
                        <span>·</span>
                        <div className="flex items-center gap-1">
                          {group.modes.map((m) => (
                            <span
                              key={m}
                              className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-secondary)]"
                            >
                              {m.toUpperCase().includes('SEA') ? (
                                <Anchor size={10} className="text-blue-500" />
                              ) : (
                                <Plane size={10} className="text-sky-500" />
                              )}
                              {m}
                            </span>
                          ))}
                        </div>
                        <span>·</span>
                        <span>Cabang: {group.branches.join(', ')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Price Summary Pill & Chevron */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--color-border)]/60">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] tracking-wider block">
                        {t('priceList.lookup.tariffPrice')}
                      </span>
                      <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                        {group.minPrice === group.maxPrice
                          ? formatCurrency(group.minPrice)
                          : `${formatCurrency(group.minPrice)} – ${formatCurrency(group.maxPrice)}`}
                      </span>
                    </div>

                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-transform">
                      <ChevronDown
                        size={18}
                        className={`transition-transform duration-200 ${
                          isCollapsed ? '' : 'rotate-180'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Expanded Table per Category */}
                {!isCollapsed && (
                  <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] animate-fadeIn">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-[var(--color-neutral)]/60 text-[10px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] border-b border-[var(--color-border)]">
                            <th className="py-2.5 px-4 text-left w-[80px]">Sheet</th>
                            <th className="py-2.5 px-4 text-left w-[120px]">Mode</th>
                            <th className="py-2.5 px-4 text-left w-[90px]">Cabang</th>
                            <th className="py-2.5 px-4 text-left w-[140px]">
                              {t('priceList.lookup.estimatedTime')}
                            </th>
                            <th className="py-2.5 px-4 text-left w-[180px]">
                              {t('priceList.lookup.agentMarking')}
                            </th>
                            {hasAnyMatch && (
                              <th className="py-2.5 px-4 text-left w-[110px]">Status</th>
                            )}
                            <th className="py-2.5 px-4 text-right w-[150px]">
                              {t('priceList.lookup.tariffPrice')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                          {group.items.map((row) => (
                            <tr
                              key={row.id}
                              className={`transition-colors ${
                                row.isMatch
                                  ? 'bg-emerald-500/[0.07] hover:bg-emerald-500/[0.12]'
                                  : 'hover:bg-[var(--color-neutral)]/40'
                              }`}
                            >
                              {/* Sheet Type */}
                              <td className="py-3 px-4">
                                <Badge variant="default" className="font-mono text-[10px] px-1.5 py-0.5">
                                  {row.sheetType}
                                </Badge>
                              </td>

                              {/* Mode */}
                              <td className="py-3 px-4 font-semibold text-[var(--color-primary)]">
                                <span className="flex items-center gap-1.5">
                                  {row.mode.toUpperCase().includes('SEA') ? (
                                    <Anchor size={13} className="text-blue-500 shrink-0" />
                                  ) : (
                                    <Plane size={13} className="text-sky-500 shrink-0" />
                                  )}
                                  {row.mode}
                                </span>
                              </td>

                              {/* Cabang */}
                              <td className="py-3 px-4 font-semibold text-[var(--color-primary)]">
                                {row.branch}
                              </td>

                              {/* Estimasi Waktu */}
                              <td className="py-3 px-4 text-[var(--color-secondary)]">
                                {row.transitTime || '-'}
                              </td>

                              {/* Agen / Marking */}
                              <td className="py-3 px-4">
                                {(row.markings?.length || 0) === 0 ? (
                                  <span className="text-[11px] font-medium text-[var(--color-secondary)]/70 italic">
                                    Semua Agen
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {row.markings!.map((m, idx) => (
                                      <span
                                        key={`${m.markingCode}-${m.mode || 'ALL'}-${idx}`}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25"
                                        title={
                                          m.agentName
                                            ? `${m.markingCode} (${m.agentName}${m.mode ? ` · ${m.mode}` : ''})`
                                            : `${m.markingCode}${m.mode ? ` (${m.mode})` : ''}`
                                        }
                                      >
                                        {m.mode?.toUpperCase().includes('AIR') && <Plane size={9} className="text-sky-500" />}
                                        {m.mode?.toUpperCase().includes('SEA') && <Ship size={9} className="text-blue-500" />}
                                        <span>{m.markingCode}</span>
                                        {m.agentName && (
                                          <span className="text-[9px] font-normal text-[var(--color-secondary)]">
                                            · {m.agentName}
                                          </span>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>


                              {/* Match status */}
                              {hasAnyMatch && (
                                <td className="py-3 px-4">
                                  {row.isMatch ? (
                                    <Badge
                                      variant="success"
                                      className="text-[10px] px-1.5 py-0.5 gap-1"
                                    >
                                      <CheckCircle2 size={10} />
                                      Match
                                    </Badge>
                                  ) : (
                                    <span className="text-[11px] text-[var(--color-secondary)]/60">
                                      —
                                    </span>
                                  )}
                                </td>
                              )}

                              {/* Price */}
                              <td className="py-3 px-4 text-right">
                                <span
                                  className={`font-bold font-mono ${
                                    row.isMatch
                                      ? 'text-sm text-emerald-700 dark:text-emerald-300'
                                      : 'text-xs text-emerald-600 dark:text-emerald-400'
                                  }`}
                                >
                                  {formatCurrency(row.price)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
