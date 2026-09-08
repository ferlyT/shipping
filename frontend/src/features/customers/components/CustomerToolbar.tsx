import { useRef, useState, useEffect } from 'react'
import {
  X,
  Search,
  Rows3,
  LayoutGrid,
  AlignJustify,
  Users,
  Layers,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Filter,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
import type { CustomerGroupKey, CustomerGroupCounts, CustomerSalesItem } from '../types/customers.types'

export const TIER_GROUP_OPTIONS: {
  key: CustomerGroupKey
  name: string
  icon: string
  colorClass: string
}[] = [
  { key: 'diamond',  name: 'Diamond',  icon: '💎', colorClass: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  { key: 'platinum', name: 'Platinum', icon: '👑', colorClass: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30' },
  { key: 'gold',     name: 'Gold',     icon: '🥇', colorClass: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { key: 'silver',   name: 'Silver',   icon: '🥈', colorClass: 'text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/30' },
  { key: 'bronze',   name: 'Bronze',   icon: '🥉', colorClass: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/30' },
]

export const OPERATIONAL_GROUP_OPTIONS: {
  key: CustomerGroupKey
  name: string
  badgeClass?: string
}[] = [
  { key: 'broker',    name: 'Broker',    badgeClass: 'text-indigo-600 dark:text-indigo-400' },
  { key: 'direct',    name: 'Direct',    badgeClass: 'text-blue-600 dark:text-blue-400' },
  { key: 'cod',       name: 'COD',       badgeClass: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'warning',   name: 'Warning',   badgeClass: 'text-amber-600 dark:text-amber-400' },
  { key: 'blocked',   name: 'Blocked',   badgeClass: 'text-rose-600 dark:text-rose-400' },
  { key: 'urgent',    name: 'Urgent',    badgeClass: 'text-sky-600 dark:text-sky-400' },
  { key: 'ok',        name: 'OK',        badgeClass: 'text-teal-600 dark:text-teal-400' },
  { key: 'no_status', name: 'No Status', badgeClass: 'text-gray-600 dark:text-gray-400' },
]

interface CustomerToolbarProps {
  statusFilter: 'active' | 'discontinued' | 'all'
  onStatusChange: (status: 'active' | 'discontinued' | 'all') => void
  activeSales: string
  onSalesChange: (sales: string) => void
  salesList: CustomerSalesItem[]
  activeGroup: CustomerGroupKey
  onGroupChange: (group: CustomerGroupKey) => void
  groupCounts: CustomerGroupCounts
  search: string
  onSearchChange: (search: string) => void
  onResetFilters: () => void
  hasActiveFilters: boolean
  viewMode: 'table' | 'grid' | 'shortlist'
  onViewModeChange: (mode: 'table' | 'grid' | 'shortlist') => void
  totalCount: number
  canViewTier?: boolean
}

export function CustomerToolbar({
  statusFilter,
  onStatusChange,
  activeSales,
  onSalesChange,
  salesList,
  activeGroup,
  onGroupChange,
  groupCounts,
  search,
  onSearchChange,
  onResetFilters,
  viewMode,
  onViewModeChange,
  totalCount,
  canViewTier = true,
}: CustomerToolbarProps) {
  const { t } = useTranslation()
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Dropdown Open States
  const [isSalesOpen, setIsSalesOpen] = useState(false)
  const [salesSearch, setSalesSearch] = useState('')
  const salesDropdownRef = useRef<HTMLDivElement>(null)
  const salesSearchInputRef = useRef<HTMLInputElement>(null)

  const [isGroupOpen, setIsGroupOpen] = useState(false)
  const [groupSearch, setGroupSearch] = useState('')
  const groupDropdownRef = useRef<HTMLDivElement>(null)
  const groupSearchInputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcut Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (salesDropdownRef.current && !salesDropdownRef.current.contains(e.target as Node)) {
        setIsSalesOpen(false)
      }
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(e.target as Node)) {
        setIsGroupOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus dropdown search input when opened
  useEffect(() => {
    if (isSalesOpen) {
      setSalesSearch('')
      requestAnimationFrame(() => salesSearchInputRef.current?.focus())
    }
  }, [isSalesOpen])

  useEffect(() => {
    if (isGroupOpen) {
      setGroupSearch('')
      requestAnimationFrame(() => groupSearchInputRef.current?.focus())
    }
  }, [isGroupOpen])

  // Filtered sales in dropdown
  const filteredSales = salesList.filter((s) =>
    s.name.toLowerCase().includes(salesSearch.trim().toLowerCase())
  )

  // Filtered groups in dropdown
  const filteredTiers = TIER_GROUP_OPTIONS.filter((t) =>
    t.name.toLowerCase().includes(groupSearch.trim().toLowerCase())
  )
  const filteredOperational = OPERATIONAL_GROUP_OPTIONS.filter((o) =>
    o.name.toLowerCase().includes(groupSearch.trim().toLowerCase())
  )

  const activeTierObj = TIER_GROUP_OPTIONS.find((t) => t.key === activeGroup)
  const activeOpObj = OPERATIONAL_GROUP_OPTIONS.find((o) => o.key === activeGroup)
  const activeGroupName = activeTierObj?.name || activeOpObj?.name

  // Filter is considered active only if changed from default (status !== 'active' OR sales !== 'all' OR group !== 'all' OR search !== '')
  const hasUserActiveFilters = Boolean(
    statusFilter !== 'active' ||
    activeSales !== 'all' ||
    activeGroup !== 'all' ||
    search.trim() !== ''
  )

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl shadow-xs border border-[var(--color-border)] relative z-30 space-y-0">
      {/* ── SINGLE ROW COMPACT TOOLBAR ON PC ── */}
      <div className="px-4 py-3 bg-[var(--color-surface)] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Left: Search Bar */}
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-secondary)] pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={t('customers.searchPlaceholder') || 'Cari customer, kode, kontak, telp, kota...'}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-16 py-2 text-xs bg-[var(--color-neutral)]/40 hover:bg-[var(--color-neutral)]/70 focus:bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-[var(--color-primary)] placeholder:text-[var(--color-secondary)] transition-all shadow-2xs font-medium"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {search ? (
              <button
                type="button"
                onClick={() => {
                  onSearchChange('')
                  searchInputRef.current?.focus()
                }}
                className="p-1 rounded-md text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] cursor-pointer"
                title="Hapus pencarian"
              >
                <X size={13} />
              </button>
            ) : (
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-secondary)]/70 bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-2xs">
                Ctrl K
              </kbd>
            )}
          </div>
        </div>

        {/* Right: Status Segmented + Sales Combobox + Kategori Combobox + View Switcher */}
        <div className="flex items-center justify-between lg:justify-end gap-2.5 flex-wrap">
          {/* 1. Status Segmented Control */}
          <div className="flex items-center p-1 bg-[var(--color-neutral)]/60 rounded-xl border border-[var(--color-border)] shrink-0 shadow-2xs">
            <button
              onClick={() => onStatusChange('active')}
              className={cn(
                'py-1 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                statusFilter === 'active'
                  ? 'bg-[var(--color-surface)] text-emerald-600 dark:text-emerald-400 shadow-xs font-bold border border-emerald-500/30'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Aktif</span>
            </button>

            <button
              onClick={() => onStatusChange('discontinued')}
              className={cn(
                'py-1 px-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1',
                statusFilter === 'discontinued'
                  ? 'bg-[var(--color-surface)] text-rose-600 dark:text-rose-400 shadow-xs font-bold border border-rose-500/30'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              )}
            >
              <X className="w-3.5 h-3.5" />
              <span>Discontinued</span>
            </button>

            <button
              onClick={() => onStatusChange('all')}
              className={cn(
                'py-1 px-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer',
                statusFilter === 'all'
                  ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-xs font-bold border border-[var(--color-border)]'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              )}
            >
              Semua
            </button>
          </div>

          {/* 2. Sales Multi-Combobox Dropdown */}
          <div className="relative shrink-0" ref={salesDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsSalesOpen((prev) => !prev)
                setIsGroupOpen(false)
              }}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center gap-2 shadow-2xs',
                activeSales !== 'all'
                  ? 'border-blue-500/40 bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-bold'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-secondary)]/50'
              )}
            >
              <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="max-w-[120px] truncate">
                {activeSales === 'all' ? 'Sales' : activeSales}
              </span>
              <span
                className={cn(
                  'text-[10px] font-mono px-1.5 py-0.2 rounded-full border',
                  activeSales !== 'all'
                    ? 'border-blue-500/40 bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold'
                    : 'border-[var(--color-border)] bg-[var(--color-neutral)] text-[var(--color-secondary)]'
                )}
              >
                {activeSales === 'all' ? salesList.length : salesList.find((s) => s.name === activeSales)?.count ?? 1}
              </span>
              <ChevronDown
                size={13}
                className={cn('transition-transform duration-150', isSalesOpen && 'rotate-180')}
              />
            </button>

            {/* Popover Dropdown with Internal Search */}
            {isSalesOpen && (
              <>
                {/* Mobile Backdrop Overlay */}
                <div
                  className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 sm:hidden animate-fade-in"
                  onClick={() => setIsSalesOpen(false)}
                />

                <div className="fixed sm:absolute inset-x-4 sm:inset-x-auto top-28 sm:top-auto sm:right-0 sm:mt-1.5 w-auto sm:w-64 max-w-sm mx-auto sm:mx-0 rounded-2xl sm:rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl z-50 flex flex-col overflow-hidden max-h-[70vh] sm:max-h-72 animate-fade-in">
                  {/* Mobile Header Bar */}
                  <div className="px-3.5 py-2.5 border-b border-[var(--color-border)] flex items-center justify-between sm:hidden bg-[var(--color-neutral)]/70">
                    <span className="text-xs font-bold text-[var(--color-primary)] flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-500" /> Pilih Sales
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSalesOpen(false)}
                      className="p-1 text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Search Box inside Dropdown */}
                  <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/40 relative">
                    <Search className="w-3.5 h-3.5 text-[var(--color-secondary)] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={salesSearchInputRef}
                      type="text"
                      placeholder="Cari nama sales..."
                      value={salesSearch}
                      onChange={(e) => setSalesSearch(e.target.value)}
                      className="w-full pl-7 pr-3 py-1 text-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-[var(--color-primary)]"
                    />
                  </div>

                {/* Sales List Items */}
                <div className="overflow-y-auto p-1 divide-y divide-[var(--color-border)]/30">
                  {/* Option: Semua Sales */}
                  <button
                    type="button"
                    onClick={() => {
                      onSalesChange('all')
                      setIsSalesOpen(false)
                    }}
                    className={cn(
                      'w-full px-2.5 py-1.5 text-left text-xs font-semibold rounded-lg flex items-center justify-between transition-colors cursor-pointer',
                      activeSales === 'all'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                        : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)]'
                    )}
                  >
                    <span>Semua Sales</span>
                    {activeSales === 'all' && <Check size={13} className="text-blue-500" />}
                  </button>

                  {filteredSales.map((s) => {
                    const isSelected = activeSales === s.name
                    return (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => {
                          onSalesChange(s.name)
                          setIsSalesOpen(false)
                        }}
                        className={cn(
                          'w-full px-2.5 py-1.5 text-left text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer',
                          isSelected
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-[var(--color-primary)] hover:bg-[var(--color-neutral)]'
                        )}
                      >
                        <span className="truncate">{s.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono text-[var(--color-secondary)]">
                            {s.count.toLocaleString('en-US')}
                          </span>
                          {isSelected && <Check size={13} className="text-blue-500" />}
                        </div>
                      </button>
                    )
                  })}

                  {filteredSales.length === 0 && (
                    <div className="p-3 text-center text-xs text-[var(--color-secondary)] italic">
                      Tidak ada sales "{salesSearch}"
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

          {/* 3. Kategori & Tier Combobox Dropdown */}
          <div className="relative shrink-0" ref={groupDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsGroupOpen((prev) => !prev)
                setIsSalesOpen(false)
              }}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center gap-2 shadow-2xs',
                activeGroup !== 'all'
                  ? 'border-purple-500/40 bg-purple-50/60 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 font-bold'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-secondary)]/50'
              )}
            >
              <Layers className="w-3.5 h-3.5 text-purple-500 shrink-0" />
              <span className="max-w-[130px] truncate">
                {activeGroup === 'all' ? (canViewTier ? 'Kategori & Tier' : 'Kategori') : activeGroupName}
              </span>
              <span
                className={cn(
                  'text-[10px] font-mono px-1.5 py-0.2 rounded-full border',
                  activeGroup !== 'all'
                    ? 'border-purple-500/40 bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold'
                    : 'border-[var(--color-border)] bg-[var(--color-neutral)] text-[var(--color-secondary)]'
                )}
              >
                {activeGroup === 'all'
                  ? (canViewTier ? TIER_GROUP_OPTIONS.length + OPERATIONAL_GROUP_OPTIONS.length : OPERATIONAL_GROUP_OPTIONS.length)
                  : groupCounts[activeGroup] ?? 0}
              </span>
              <ChevronDown
                size={13}
                className={cn('transition-transform duration-150', isGroupOpen && 'rotate-180')}
              />
            </button>

            {/* Popover Dropdown with Internal Search */}
            {isGroupOpen && (
              <>
                {/* Mobile Backdrop Overlay */}
                <div
                  className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 sm:hidden animate-fade-in"
                  onClick={() => setIsGroupOpen(false)}
                />

                <div className="fixed sm:absolute inset-x-4 sm:inset-x-auto top-28 sm:top-auto sm:right-0 sm:mt-1.5 w-auto sm:w-72 max-w-md mx-auto sm:mx-0 rounded-2xl sm:rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl z-50 flex flex-col overflow-hidden max-h-[75vh] sm:max-h-80 animate-fade-in">
                  {/* Mobile Header Bar */}
                  <div className="px-3.5 py-2.5 border-b border-[var(--color-border)] flex items-center justify-between sm:hidden bg-[var(--color-neutral)]/70">
                    <span className="text-xs font-bold text-[var(--color-primary)] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple-500" /> Pilih Kategori & Tier
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsGroupOpen(false)}
                      className="p-1 text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Search Box inside Dropdown */}
                  <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/40 relative">
                    <Search className="w-3.5 h-3.5 text-[var(--color-secondary)] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={groupSearchInputRef}
                      type="text"
                      placeholder="Cari kategori atau tier..."
                      value={groupSearch}
                      onChange={(e) => setGroupSearch(e.target.value)}
                      className="w-full pl-7 pr-3 py-1 text-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-[var(--color-primary)]"
                    />
                  </div>

                <div className="overflow-y-auto p-1 divide-y divide-[var(--color-border)]/30">
                  {/* Option: Semua */}
                  <button
                    type="button"
                    onClick={() => {
                      onGroupChange('all')
                      setIsGroupOpen(false)
                    }}
                    className={cn(
                      'w-full px-2.5 py-1.5 text-left text-xs font-semibold rounded-lg flex items-center justify-between transition-colors cursor-pointer',
                      activeGroup === 'all'
                        ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold'
                        : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)]'
                    )}
                  >
                    <span>Semua Kategori & Tier</span>
                    {activeGroup === 'all' && <Check size={13} className="text-purple-500" />}
                  </button>

                  {/* Section 1: Tier Pelanggan */}
                  {canViewTier && filteredTiers.length > 0 && (
                    <div className="pt-1.5 pb-1">
                      <div className="px-2.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles size={11} className="text-amber-500" />
                        <span>Tingkat Pelanggan (Revenue)</span>
                      </div>
                      {filteredTiers.map((tItem) => {
                        const isSelected = activeGroup === tItem.key
                        const count = groupCounts[tItem.key] ?? 0
                        return (
                          <button
                            key={tItem.key}
                            type="button"
                            onClick={() => {
                              onGroupChange(tItem.key)
                              setIsGroupOpen(false)
                            }}
                            className={cn(
                              'w-full px-2.5 py-1.5 text-left text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer',
                              isSelected
                                ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold'
                                : 'text-[var(--color-primary)] hover:bg-[var(--color-neutral)]'
                            )}
                          >
                            <div className="flex items-center gap-1.5">
                              <span>{tItem.icon}</span>
                              <span>{tItem.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-mono text-[var(--color-secondary)]">
                                {count.toLocaleString('en-US')}
                              </span>
                              {isSelected && <Check size={13} className="text-purple-600" />}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Section 2: Kategori & Status Operasional */}
                  {filteredOperational.length > 0 && (
                    <div className="pt-1.5 pb-1">
                      <div className="px-2.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <Filter size={11} className="text-blue-500" />
                        <span>Status & Kategori Operasional</span>
                      </div>
                      {filteredOperational.map((oItem) => {
                        const isSelected = activeGroup === oItem.key
                        const count = groupCounts[oItem.key] ?? 0
                        return (
                          <button
                            key={oItem.key}
                            type="button"
                            onClick={() => {
                              onGroupChange(oItem.key)
                              setIsGroupOpen(false)
                            }}
                            className={cn(
                              'w-full px-2.5 py-1.5 text-left text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer',
                              isSelected
                                ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold'
                                : 'text-[var(--color-primary)] hover:bg-[var(--color-neutral)]'
                            )}
                          >
                            <span className={oItem.badgeClass}>{oItem.name}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-mono text-[var(--color-secondary)]">
                                {count.toLocaleString('en-US')}
                              </span>
                              {isSelected && <Check size={13} className="text-purple-600" />}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {filteredTiers.length === 0 && filteredOperational.length === 0 && (
                    <div className="p-3 text-center text-xs text-[var(--color-secondary)] italic">
                      Tidak ditemukan kategori "{groupSearch}"
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

          {/* 4. View Mode Switcher */}
          <div className="flex items-center p-1 bg-[var(--color-neutral)]/60 rounded-xl border border-[var(--color-border)] shrink-0 shadow-2xs">
            <button
              onClick={() => onViewModeChange('table')}
              className={cn(
                'p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer',
                viewMode === 'table'
                  ? 'bg-[var(--color-surface)] shadow-xs text-[var(--color-primary)]'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              )}
              title="Tampilan Tabel"
            >
              <Rows3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange('grid')}
              className={cn(
                'p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer',
                viewMode === 'grid'
                  ? 'bg-[var(--color-surface)] shadow-xs text-[var(--color-primary)]'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              )}
              title="Tampilan Grid Card"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange('shortlist')}
              className={cn(
                'p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer',
                viewMode === 'shortlist'
                  ? 'bg-[var(--color-surface)] shadow-xs text-[var(--color-primary)]'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              )}
              title="Tampilan Kompak"
            >
              <AlignJustify className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 5. Total Count Pill */}
          <div className="hidden xl:inline-flex items-center px-2.5 py-1 rounded-xl bg-[var(--color-neutral)]/40 border border-[var(--color-border)] text-[11px] font-mono font-bold text-[var(--color-secondary)]">
            {totalCount.toLocaleString('en-US')} <span className="font-normal font-sans ml-1">cust</span>
          </div>
        </div>
      </div>

      {/* ── ROW 2: ACTIVE FILTER CHIP SUMMARY BAR (ONLY APPEARS IF USER HAS ACTIVE FILTERS) ── */}
      {hasUserActiveFilters && (
        <div className="px-4 py-2 border-t border-[var(--color-border)]/70 bg-blue-500/5 dark:bg-blue-500/10 flex items-center justify-between gap-2 flex-wrap text-xs animate-fade-in">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Filter Aktif:
            </span>

            {statusFilter !== 'active' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary)] shadow-2xs">
                Status: <strong>{statusFilter === 'discontinued' ? 'Discontinued' : 'Semua'}</strong>
                <button
                  type="button"
                  onClick={() => onStatusChange('active')}
                  className="hover:text-rose-500 ml-0.5 p-0.5 rounded cursor-pointer"
                >
                  <X size={11} />
                </button>
              </span>
            )}

            {activeSales !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary)] shadow-2xs">
                Sales: <strong>{activeSales}</strong>
                <button
                  type="button"
                  onClick={() => onSalesChange('all')}
                  className="hover:text-rose-500 ml-0.5 p-0.5 rounded cursor-pointer"
                >
                  <X size={11} />
                </button>
              </span>
            )}

            {activeGroup !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary)] shadow-2xs">
                Grup: <strong>{activeGroupName}</strong>
                <button
                  type="button"
                  onClick={() => onGroupChange('all')}
                  className="hover:text-rose-500 ml-0.5 p-0.5 rounded cursor-pointer"
                >
                  <X size={11} />
                </button>
              </span>
            )}

            {search && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary)] shadow-2xs">
                Cari: <strong className="font-mono">"{search}"</strong>
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="hover:text-rose-500 ml-0.5 p-0.5 rounded cursor-pointer"
                >
                  <X size={11} />
                </button>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-colors ml-auto"
          >
            <RotateCcw size={12} />
            <span>Reset Filter</span>
          </button>
        </div>
      )}
    </div>
  )
}
