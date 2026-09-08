import { useState, useMemo } from 'react'
import {
  Search,
  ChevronDown,
  ChevronsUpDown,
  Anchor,
  Plane,
  Ship,
  LayoutGrid,
  List,
  Edit3,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import type { CustomerPriceListItem } from '../types'

export interface CustomerCategoryGroupedPriceTableProps {
  items: CustomerPriceListItem[]
  totalOriginalCount?: number
  searchQuery?: string
  onSearchChange?: (val: string) => void
  emptyMessage?: string
  defaultViewMode?: 'grouped' | 'flat'
  onEdit?: (item: CustomerPriceListItem) => void
}

interface CategoryGroup {
  category: string
  items: CustomerPriceListItem[]
  minPrice: number
  maxPrice: number
  modes: string[]
  branches: string[]
}

export function CustomerCategoryGroupedPriceTable({
  items,
  totalOriginalCount,
  searchQuery,
  onSearchChange,
  emptyMessage,
  defaultViewMode = 'grouped',
  onEdit,
}: CustomerCategoryGroupedPriceTableProps) {
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
          branches: [item.branch],
        })
      } else {
        const group = map.get(cat)!
        group.items.push(item)
        group.minPrice = Math.min(group.minPrice, item.price)
        group.maxPrice = Math.max(group.maxPrice, item.price)
        if (!group.modes.includes(item.mode)) group.modes.push(item.mode)
        if (!group.branches.includes(item.branch)) group.branches.push(item.branch)
      }
    })

    return Array.from(map.values()).sort((a, b) => a.category.localeCompare(b.category))
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
      setCollapsedCategories(new Set())
    } else {
      setCollapsedCategories(new Set(groupedCategories.map((g) => g.category)))
    }
  }

  if (items.length === 0) {
    return (
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-12 text-center shadow-xs">
        <p className="text-sm text-[var(--color-secondary)]">
          {emptyMessage || 'Tidak ada data tarif yang sesuai dengan kriteria pencarian.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Top Toolbar: Search + View Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--color-surface)] p-3 sm:p-3.5 rounded-2xl border border-[var(--color-border)] shadow-xs">
        {/* Search inside results */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-secondary)] pointer-events-none" />
          <input
            type="text"
            placeholder="Cari kategori, marking, cabang, estimasi..."
            value={searchQuery ?? ''}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-tertiary)]/20 focus:border-[var(--color-tertiary)] text-[var(--color-primary)] placeholder:text-[var(--color-secondary)] transition-all"
          />
        </div>

        {/* View Mode & Counters */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          <span className="text-xs text-[var(--color-secondary)] font-medium">
            <strong className="text-[var(--color-primary)] font-mono">{items.length}</strong> item
            {totalOriginalCount && totalOriginalCount !== items.length && (
              <span className="opacity-70"> (dari {totalOriginalCount})</span>
            )}
            {' · '}
            <strong className="text-[var(--color-primary)] font-mono">{groupedCategories.length}</strong> kategori
          </span>

          {/* View Switcher & Expand/Collapse */}
          <div className="flex items-center gap-1.5">
            {viewMode === 'grouped' && (
              <button
                type="button"
                onClick={handleToggleAll}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                title={allCollapsed ? 'Buka Semua Kategori' : 'Tutup Semua Kategori'}
              >
                <ChevronsUpDown size={13} />
                <span>{allCollapsed ? 'Buka Semua' : 'Tutup Semua'}</span>
              </button>
            )}

            <div className="flex items-center gap-0.5 bg-[var(--color-neutral)] p-0.5 rounded-xl border border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'grouped'
                    ? 'bg-[var(--color-surface)] shadow-xs text-[var(--color-primary)]'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                }`}
                title="Tampilan Terkelompok per Kategori"
              >
                <LayoutGrid size={14} />
                <span className="hidden sm:inline">Kategori</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('flat')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'flat'
                    ? 'bg-[var(--color-surface)] shadow-xs text-[var(--color-primary)]'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                }`}
                title="Tampilan Daftar Flat"
              >
                <List size={14} />
                <span className="hidden sm:inline">Flat</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mode A: Flat View */}
      {viewMode === 'flat' ? (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-xs overflow-hidden">
          {/* Mobile Card List (< sm) */}
          <div className="sm:hidden divide-y divide-[var(--color-border)]">
            {items.map((row) => (
              <div key={row.id} className="p-3.5 space-y-2.5 hover:bg-[var(--color-neutral)]/20 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-xs font-bold text-[var(--color-primary)] line-clamp-1">
                      {row.category}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                        {row.mode.toUpperCase().includes('SEA') ? <Anchor size={10} /> : <Plane size={10} />}
                        {row.mode}
                      </span>
                      <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-[var(--color-neutral)] text-[var(--color-primary)] border border-[var(--color-border)]">
                        {row.branch}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(row.price)}
                      </span>
                    </div>
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(row)}
                        className="p-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-secondary)] hover:text-emerald-600 hover:border-emerald-500/30 transition-colors cursor-pointer"
                        title="Edit Tarif"
                      >
                        <Edit3 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between gap-2 text-[11px] text-[var(--color-secondary)] flex-wrap">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="font-medium">Marking:</span>
                    {row.markings && row.markings.length > 0 ? (
                      row.markings.map((m, idx) => (
                        <span
                          key={`${m.markingCode}-${idx}`}
                          className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25"
                        >
                          {m.markingCode}
                        </span>
                      ))
                    ) : (
                      <span className="italic text-[10px]">Semua Agen</span>
                    )}
                  </div>
                  {row.transitTime && (
                    <span className="text-[10px] font-medium opacity-80">{row.transitTime}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (>= sm) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--color-neutral)]/60 text-[10px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="py-2.5 px-4 w-[110px]">Mode</th>
                  <th className="py-2.5 px-4 w-[80px]">Cabang</th>
                  <th className="py-2.5 px-4">Kategori Barang</th>
                  <th className="py-2.5 px-4 w-[180px]">Agen / Marking</th>
                  <th className="py-2.5 px-4 w-[140px]">Estimasi Transit</th>
                  <th className="py-2.5 px-4 text-right w-[150px]">Harga Tarif</th>
                  {onEdit && <th className="py-2.5 px-4 text-center w-[70px]">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {items.map((row) => (
                  <tr key={row.id} className="hover:bg-[var(--color-neutral)]/40 transition-colors">
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
                    <td className="py-3 px-4 font-semibold font-mono text-[var(--color-primary)]">
                      {row.branch}
                    </td>
                    <td className="py-3 px-4 text-[var(--color-primary)] font-medium">
                      {row.category}
                    </td>
                    <td className="py-3 px-4">
                      {row.markings && row.markings.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {row.markings.map((m, idx) => (
                            <span
                              key={`${m.markingCode}-${idx}`}
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
                      ) : (
                        <span className="text-[11px] font-medium text-[var(--color-secondary)]/70 italic">
                          Semua Agen
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[var(--color-secondary)]">
                      {row.transitTime || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold font-mono text-xs text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(row.price)}
                      </span>
                    </td>
                    {onEdit && (
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onEdit(row)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-secondary)] hover:text-emerald-600 hover:border-emerald-500/30 transition-colors cursor-pointer"
                          title="Edit Tarif"
                        >
                          <Edit3 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Mode B: Grouped Category Accordion */
        <div className="space-y-3">
          {groupedCategories.map((group) => {
            const isCollapsed = collapsedCategories.has(group.category)

            return (
              <div
                key={group.category}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-xs transition-shadow hover:shadow-md"
              >
                {/* Category Header Bar */}
                <div
                  onClick={() => toggleCategory(group.category)}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none bg-[var(--color-surface)] hover:bg-[var(--color-neutral)]/30 transition-colors"
                >
                  {/* Left: Category Title + Sub-meta */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-[var(--color-primary)] font-[var(--font-display)] truncate">
                          {group.category}
                        </h3>
                        <Badge variant="default" className="text-[10px] px-2 py-0.2 font-mono">
                          {group.items.length} tarif
                        </Badge>
                      </div>

                      {/* Sub-meta: Mode and Branches */}
                      <div className="flex items-center gap-2 text-[11px] text-[var(--color-secondary)] mt-1 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          {group.modes.map((m) => (
                            <span key={m} className="inline-flex items-center gap-1 font-medium">
                              {m.toUpperCase().includes('SEA') ? (
                                <Anchor size={11} className="text-blue-500" />
                              ) : (
                                <Plane size={11} className="text-sky-500" />
                              )}
                              <span>{m}</span>
                            </span>
                          ))}
                        </div>
                        <span>·</span>
                        <span>Cabang: {group.branches.join(', ')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Price Range & Chevron */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--color-border)]/60">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] tracking-wider block">
                        Tarif Customer
                      </span>
                      <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                        {group.minPrice === group.maxPrice
                          ? formatCurrency(group.minPrice)
                          : `${formatCurrency(group.minPrice)} – ${formatCurrency(group.maxPrice)}`}
                      </span>
                    </div>

                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-transform">
                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${
                          isCollapsed ? '' : 'rotate-180'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Expanded Accordion Content */}
                {!isCollapsed && (
                  <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] animate-fadeIn">
                    {/* Mobile Card List for Group (< sm) */}
                    <div className="sm:hidden divide-y divide-[var(--color-border)]">
                      {group.items.map((row) => (
                        <div key={row.id} className="p-3.5 space-y-2 bg-[var(--color-neutral)]/20">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                {row.mode.toUpperCase().includes('SEA') ? <Anchor size={10} /> : <Plane size={10} />}
                                {row.mode}
                              </span>
                              <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-[var(--color-surface)] text-[var(--color-primary)] border border-[var(--color-border)]">
                                {row.branch}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-bold font-mono text-xs text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(row.price)}
                              </span>
                              {onEdit && (
                                <button
                                  type="button"
                                  onClick={() => onEdit(row)}
                                  className="p-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-secondary)] hover:text-emerald-600 hover:border-emerald-500/30 transition-colors cursor-pointer"
                                  title="Edit Tarif"
                                >
                                  <Edit3 size={12} />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--color-secondary)] flex-wrap pt-1">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="font-medium">Marking:</span>
                              {row.markings && row.markings.length > 0 ? (
                                row.markings.map((m, idx) => (
                                  <span
                                    key={`${m.markingCode}-${idx}`}
                                    className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25"
                                  >
                                    {m.markingCode}
                                  </span>
                                ))
                              ) : (
                                <span className="italic text-[10px]">Semua Agen</span>
                              )}
                            </div>
                            {row.transitTime && (
                              <span className="text-[10px] opacity-80">{row.transitTime}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table for Group (>= sm) */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-[var(--color-neutral)]/50 text-[10px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] border-b border-[var(--color-border)]">
                            <th className="py-2.5 px-4 w-[110px]">Mode</th>
                            <th className="py-2.5 px-4 w-[80px]">Cabang</th>
                            <th className="py-2.5 px-4 w-[180px]">Estimasi Transit</th>
                            <th className="py-2.5 px-4">Agen / Marking</th>
                            <th className="py-2.5 px-4 text-right w-[150px]">Harga Tarif</th>
                            {onEdit && <th className="py-2.5 px-4 text-center w-[70px]">Aksi</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                          {group.items.map((row) => (
                            <tr key={row.id} className="hover:bg-[var(--color-neutral)]/40 transition-colors">
                              <td className="py-2.5 px-4 font-semibold text-[var(--color-primary)]">
                                <span className="flex items-center gap-1.5">
                                  {row.mode.toUpperCase().includes('SEA') ? (
                                    <Anchor size={13} className="text-blue-500 shrink-0" />
                                  ) : (
                                    <Plane size={13} className="text-sky-500 shrink-0" />
                                  )}
                                  {row.mode}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 font-semibold font-mono text-[var(--color-primary)]">
                                {row.branch}
                              </td>
                              <td className="py-2.5 px-4 text-[var(--color-secondary)]">
                                {row.transitTime || '—'}
                              </td>
                              <td className="py-2.5 px-4">
                                {row.markings && row.markings.length > 0 ? (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {row.markings.map((m, idx) => (
                                      <span
                                        key={`${m.markingCode}-${idx}`}
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
                                ) : (
                                  <span className="text-[11px] font-medium text-[var(--color-secondary)]/70 italic">
                                    Semua Agen
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <span className="font-bold font-mono text-xs text-emerald-600 dark:text-emerald-400">
                                  {formatCurrency(row.price)}
                                </span>
                              </td>
                              {onEdit && (
                                <td className="py-2.5 px-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => onEdit(row)}
                                    className="inline-flex items-center justify-center p-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-secondary)] hover:text-emerald-600 hover:border-emerald-500/30 transition-colors cursor-pointer"
                                    title="Edit Tarif"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                </td>
                              )}
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
