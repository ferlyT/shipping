import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  History,
  Search,
  User,
  Tag,
  ArrowRight,
  RefreshCw,
  Clock,
  Ship,
  Plane,
  Monitor,
  ChevronDown,
  ChevronUp,
  Layers,
  List,
  X,
} from 'lucide-react'
import { billingApi } from '../services/billing.service'
import { formatDateTime, formatCurrency, formatNumber, cn } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { CustomerTariffAudit } from '../types/billing.types'

interface CustomerTariffAuditTabProps {
  custCode: string | null
}

interface ColumnGroup {
  colName: string
  mapping?: CustomerTariffAudit['mapping']
  items: CustomerTariffAudit[]
  latestItem: CustomerTariffAudit
  totalChanges: number
}

// 1. Branch Pill
function renderBranchPill(branchCode?: string | null, branchName?: string | null) {
  if (!branchCode) return null
  const b = branchCode.toUpperCase()
  let colorClass = 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30'
  if (b === 'GZ') colorClass = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
  else if (b === 'SG') colorClass = 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
  else if (b === 'HK') colorClass = 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
  else if (b === 'YW') colorClass = 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
  else if (b === 'SH') colorClass = 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
  else if (b === 'SZ') colorClass = 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold border tracking-wide shadow-2xs shrink-0',
        colorClass
      )}
    >
      {branchCode}{branchName && branchName !== branchCode ? ` · ${branchName}` : ''}
    </span>
  )
}

// 2. Mode Pill (Icon Only)
function renderModePill(mode?: string | null, serviceType?: string | null) {
  if (!mode && !serviceType) return null
  const isAir = mode === 'BY AIR' || (serviceType && (serviceType.includes('Udara') || serviceType.includes('UC') || serviceType.includes('AS')))
  const label = serviceType || mode || (isAir ? 'BY AIR' : 'BY SEA')

  return (
    <span
      title={label}
      className={cn(
        'inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-2xs shrink-0 cursor-default',
        isAir
          ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30'
          : 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30'
      )}
    >
      {isAir ? <Plane className="w-3.5 h-3.5" /> : <Ship className="w-3.5 h-3.5" />}
    </span>
  )
}

// 3. Commodity Type Pill
function renderCommodityPill(commType?: string | null, fallbackCol?: string) {
  const name = commType || fallbackCol
  if (!name) return null
  const u = name.toUpperCase()

  let colorClass = 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30'
  if (u.includes('UMUM') || u.includes('GENERAL')) {
    colorClass = 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30'
  } else if (u.includes('LARTAS')) {
    colorClass = 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
  } else if (u.includes('GARMENT') || u.includes('SEMI')) {
    colorClass = 'bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30'
  } else if (u.includes('TEKSTIL')) {
    colorClass = 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
  } else if (u.includes('BRANDED')) {
    colorClass = 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
  } else if (u.includes('FOOD')) {
    colorClass = 'bg-lime-500/15 text-lime-700 dark:text-lime-300 border-lime-500/30'
  } else if (u.includes('SHOES')) {
    colorClass = 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30'
  } else if (u.includes('KG') || u.includes('OVERWEIGHT')) {
    colorClass = 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/30'
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold border shadow-2xs shrink-0',
        colorClass
      )}
    >
      <Tag className="w-3 h-3 mr-1 opacity-70 shrink-0" />
      <span>{name}</span>
    </span>
  )
}

// 4. Action Pill
function renderActionPill(action: string) {
  const act = (action || 'UPDATE').toUpperCase()
  let colorClass = 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
  if (act === 'INSERT') colorClass = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
  else if (act === 'DELETE') colorClass = 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'

  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border shadow-2xs', colorClass)}>
      {act}
    </span>
  )
}

export function CustomerTariffAuditTab({ custCode }: CustomerTariffAuditTabProps) {
  const [search, setSearch] = useState('')
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL')
  const [selectedMode, setSelectedMode] = useState<'ALL' | 'BY SEA' | 'BY AIR'>('ALL')
  const [selectedAction, setSelectedAction] = useState<string>('ALL')
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  const { data: auditData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['customerTariffAudit', custCode],
    queryFn: async () => {
      if (!custCode) return []
      const res = await billingApi.customerTariffAudit(custCode)
      return (res.data as { data?: CustomerTariffAudit[] })?.data || []
    },
    enabled: Boolean(custCode),
    staleTime: 30_000,
  })

  const rawList: CustomerTariffAudit[] = auditData || []

  // Extract available branches for filter
  const branchOptions = useMemo(() => {
    const branches = new Set<string>()
    rawList.forEach((item) => {
      if (item.mapping?.branchCode) {
        branches.add(item.mapping.branchCode)
      }
    })
    return Array.from(branches).sort()
  }, [rawList])

  // Filtered data
  const filteredList = useMemo(() => {
    return rawList.filter((item) => {
      if (selectedBranch !== 'ALL' && item.mapping?.branchCode !== selectedBranch) {
        return false
      }

      if (selectedMode !== 'ALL' && item.mapping?.mode !== selectedMode) {
        return false
      }

      if (selectedAction !== 'ALL' && item.fdAction !== selectedAction) {
        return false
      }

      if (search.trim()) {
        const q = search.toLowerCase()
        const col = (item.fdColumnName || '').toLowerCase()
        const display = (item.mapping?.displayName || '').toLowerCase()
        const comm = (item.mapping?.commodityType || '').toLowerCase()
        const user = (item.fdUpdatedBy || '').toLowerCase()
        const oldV = (item.fdOldValue || '').toLowerCase()
        const newV = (item.fdNewValue || '').toLowerCase()
        const ip = (item.fdIPAddress || '').toLowerCase()
        const host = (item.fdHostName || '').toLowerCase()

        return (
          col.includes(q) ||
          display.includes(q) ||
          comm.includes(q) ||
          user.includes(q) ||
          oldV.includes(q) ||
          newV.includes(q) ||
          ip.includes(q) ||
          host.includes(q)
        )
      }

      return true
    })
  }, [rawList, selectedBranch, selectedMode, selectedAction, search])

  // Grouping by Column Name
  const groupedColumns = useMemo<ColumnGroup[]>(() => {
    const map = new Map<string, CustomerTariffAudit[]>()

    filteredList.forEach((item) => {
      const col = item.fdColumnName || 'Unknown'
      if (!map.has(col)) {
        map.set(col, [])
      }
      map.get(col)!.push(item)
    })

    const groups: ColumnGroup[] = []
    map.forEach((items, colName) => {
      const sorted = [...items].sort((a, b) => new Date(b.fdUpdateDate).getTime() - new Date(a.fdUpdateDate).getTime())
      groups.push({
        colName,
        mapping: sorted[0].mapping,
        items: sorted,
        latestItem: sorted[0],
        totalChanges: sorted.length,
      })
    })

    return groups.sort((a, b) => new Date(b.latestItem.fdUpdateDate).getTime() - new Date(a.latestItem.fdUpdateDate).getTime())
  }, [filteredList])

  const toggleGroup = (colName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [colName]: prev[colName] === undefined ? false : !prev[colName],
    }))
  }

  const isGroupExpanded = (colName: string) => {
    return expandedGroups[colName] !== false
  }

  const toggleAllGroups = (expand: boolean) => {
    const next: Record<string, boolean> = {}
    groupedColumns.forEach((g) => {
      next[g.colName] = expand
    })
    setExpandedGroups(next)
  }

  const renderFormattedValue = (val: string | null, isCurrency?: boolean) => {
    if (val === null || val === undefined || val === '') {
      return <span className="text-[var(--color-secondary)] italic font-mono text-[11px]">— (kosong)</span>
    }
    const num = Number(val)
    if (!isNaN(num) && isCurrency && num > 0) {
      return <span className="font-mono font-semibold text-[var(--color-primary)]">{formatCurrency(num)}</span>
    }
    if (!isNaN(num) && !isCurrency && Math.abs(num) >= 1) {
      return <span className="font-mono font-semibold text-[var(--color-primary)]">{formatNumber(num)}</span>
    }
    return <span className="font-mono font-medium text-[var(--color-primary)] break-all">{val}</span>
  }

  const latestAudit = rawList.length > 0 ? rawList[0] : null

  if (!custCode) {
    return (
      <div className="py-12 text-center text-sm text-[var(--color-secondary)]">
        Customer Code tidak tersedia.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Top Summary Banner */}
      {latestAudit && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-neutral)]/50 space-y-1.5 shadow-2xs">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-[var(--color-secondary)]">
              <Clock className="w-3.5 h-3.5 text-purple-500" />
              <span>Update Terakhir</span>
            </div>
            <p className="text-xs font-bold text-[var(--color-primary)]">
              {formatDateTime(latestAudit.fdUpdateDate)}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-secondary)]">
              <span>Oleh:</span>
              <span className="inline-flex items-center rounded-full px-2 py-0.2 text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                <User className="w-2.5 h-2.5 mr-0.5" />
                {latestAudit.fdUpdatedBy}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-neutral)]/50 space-y-1.5 shadow-2xs">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-[var(--color-secondary)]">
              <Tag className="w-3.5 h-3.5 text-blue-500" />
              <span>Tarif Terakhir Diubah</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {renderBranchPill(latestAudit.mapping?.branchCode)}
              {renderModePill(latestAudit.mapping?.mode, latestAudit.mapping?.serviceType)}
              {renderCommodityPill(latestAudit.mapping?.commodityType, latestAudit.fdColumnName)}
            </div>
            <div className="flex items-center gap-1 text-[11px] pt-0.5">
              <span className="text-[var(--color-secondary)]">Nilai:</span>
              <span className="line-through text-rose-500 text-[10px]">
                {latestAudit.fdOldValue || '0'}
              </span>
              <ArrowRight className="w-3 h-3 text-[var(--color-secondary)] shrink-0" />
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {latestAudit.fdNewValue || '0'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-neutral)]/50 space-y-1.5 shadow-2xs">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-[var(--color-secondary)]">
              <Monitor className="w-3.5 h-3.5 text-amber-500" />
              <span>Aplikasi & Host</span>
            </div>
            <p className="text-xs font-bold text-[var(--color-primary)] truncate" title={latestAudit.fdAppName || '—'}>
              {latestAudit.fdAppName || 'Visual Foxpro / Web'}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-[var(--color-secondary)] font-mono">
              <span className="inline-flex items-center rounded-full px-2 py-0.2 text-[10px] bg-[var(--color-neutral)] border border-[var(--color-border)]">
                IP: {latestAudit.fdIPAddress || '127.0.0.1'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filter & View Mode Controls */}
      <div className="flex flex-col gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] p-3 rounded-2xl shadow-2xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-[var(--color-secondary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari komoditi, cabang, user, IP, atau nilai..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-[var(--color-neutral)]/70 border border-[var(--color-border)] rounded-full text-[var(--color-primary)] placeholder:text-[var(--color-secondary)] focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Toggle & Expand/Collapse */}
          <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
            {viewMode === 'grouped' && groupedColumns.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleAllGroups(true)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-[var(--color-secondary)] hover:text-[var(--color-primary)] bg-[var(--color-neutral)] rounded-full border border-[var(--color-border)] transition-colors cursor-pointer"
                >
                  Buka Semua
                </button>
                <button
                  type="button"
                  onClick={() => toggleAllGroups(false)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-[var(--color-secondary)] hover:text-[var(--color-primary)] bg-[var(--color-neutral)] rounded-full border border-[var(--color-border)] transition-colors cursor-pointer"
                >
                  Tutup Semua
                </button>
              </div>
            )}

            <div className="inline-flex rounded-full border border-[var(--color-border)] p-0.5 bg-[var(--color-neutral)]">
              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer',
                  viewMode === 'grouped'
                    ? 'bg-[var(--color-surface)] text-purple-600 dark:text-purple-400 shadow-2xs'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Group Kolom</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('flat')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer',
                  viewMode === 'flat'
                    ? 'bg-[var(--color-surface)] text-purple-600 dark:text-purple-400 shadow-2xs'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
              >
                <List className="w-3.5 h-3.5" />
                <span>Kronologis</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2 rounded-full border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin text-purple-500')} />
            </button>
          </div>
        </div>

        {/* Quick Filter Selectors */}
        <div className="flex items-center gap-2 flex-wrap text-xs pt-2 border-t border-[var(--color-border)]/60">
          {branchOptions.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)]">Cabang:</span>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-full px-2.5 py-1 text-xs text-[var(--color-primary)] focus:outline-none"
              >
                <option value="ALL">Semua Cabang</option>
                {branchOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)]">Moda:</span>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value as any)}
              className="bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-full px-2.5 py-1 text-xs text-[var(--color-primary)] focus:outline-none"
            >
              <option value="ALL">Semua Moda</option>
              <option value="BY SEA">Laut (Sea)</option>
              <option value="BY AIR">Udara (Air)</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)]">Aksi:</span>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-full px-2.5 py-1 text-xs text-[var(--color-primary)] focus:outline-none"
            >
              <option value="ALL">Semua Aksi</option>
              <option value="UPDATE">UPDATE</option>
              <option value="INSERT">INSERT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <LoadingSpinner message="Memuat data log perubahan tarif..." />
        </div>
      ) : filteredList.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-[var(--color-border)] rounded-2xl p-6 bg-[var(--color-neutral)]/30">
          <History className="w-8 h-8 text-[var(--color-secondary)] mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-[var(--color-primary)]">
            {search || selectedBranch !== 'ALL' || selectedMode !== 'ALL' || selectedAction !== 'ALL'
              ? 'Tidak ada riwayat audit yang sesuai dengan filter'
              : 'Belum ada catatan log audit tarif untuk customer ini'}
          </p>
        </div>
      ) : viewMode === 'grouped' ? (
        <div className="space-y-3">
          {groupedColumns.map((group) => {
            const isExpanded = isGroupExpanded(group.colName)
            const isCurrency = group.mapping?.isCurrency ?? false
            const latestVal = group.latestItem.fdNewValue

            return (
              <div
                key={group.colName}
                className="border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)] shadow-2xs overflow-hidden transition-all"
              >
                {/* Group Header */}
                <div
                  onClick={() => toggleGroup(group.colName)}
                  className="px-4 py-3 bg-[var(--color-neutral)]/60 hover:bg-[var(--color-neutral)] border-b border-[var(--color-border)] flex items-center justify-between gap-3 cursor-pointer transition-colors select-none flex-wrap sm:flex-nowrap"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-[var(--color-secondary)] shrink-0"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {renderBranchPill(group.mapping?.branchCode, group.mapping?.branchName)}
                      {renderModePill(group.mapping?.mode, group.mapping?.serviceType)}
                      {renderCommodityPill(group.mapping?.commodityType, group.colName)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 ml-auto sm:ml-0 text-xs">
                    <div className="text-right hidden sm:block">
                      <span className="text-[10px] text-[var(--color-secondary)] block">Nilai Terakhir:</span>
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">
                        {renderFormattedValue(latestVal, isCurrency)}
                      </div>
                    </div>

                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 shadow-2xs">
                      {group.totalChanges}x Perubahan
                    </span>
                  </div>
                </div>

                {/* Table */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)] text-[9px] uppercase font-bold text-[var(--color-secondary)] tracking-wider">
                        <tr>
                          <th className="px-3 py-2 w-10 text-center">#</th>
                          <th className="px-3 py-2">Waktu Perubahan</th>
                          <th className="px-3 py-2 text-center">Aksi</th>
                          <th className="px-3 py-2">Perubahan Nilai (Lama → Baru)</th>
                          <th className="px-3 py-2">Diupdate Oleh</th>
                          <th className="px-3 py-2">Info Teknis</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
                        {group.items.map((item, idx) => (
                          <tr key={item.fdAuditID || idx} className="hover:bg-[var(--color-neutral)]/40 transition-colors">
                            <td className="px-3 py-2.5 text-center">
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-mono font-bold bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)]">
                                {group.items.length - idx}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <div className="font-medium text-[var(--color-primary)]">
                                {formatDateTime(item.fdUpdateDate)}
                              </div>
                              <div className="text-[10px] text-[var(--color-secondary)] font-mono">
                                ID: #{item.fdAuditID}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center whitespace-nowrap">
                              {renderActionPill(item.fdAction)}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <div className="line-through text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20 text-xs font-mono">
                                  {renderFormattedValue(item.fdOldValue, isCurrency)}
                                </div>
                                <ArrowRight className="w-3.5 h-3.5 text-[var(--color-secondary)] shrink-0" />
                                <div className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 text-xs font-mono">
                                  {renderFormattedValue(item.fdNewValue, isCurrency)}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[var(--color-neutral)] text-[var(--color-primary)] border border-[var(--color-border)] shadow-2xs">
                                <User className="w-3 h-3 text-[var(--color-secondary)]" />
                                <span>{item.fdUpdatedBy}</span>
                              </span>
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-[10px] text-[var(--color-secondary)]">
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 font-mono bg-[var(--color-neutral)] border border-[var(--color-border)] mr-1">
                                IP: {item.fdIPAddress || '—'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[var(--color-neutral)] border-b border-[var(--color-border)] text-[10px] uppercase font-bold text-[var(--color-secondary)] tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">Waktu Perubahan</th>
                  <th className="px-3 py-2.5">Cabang & Moda</th>
                  <th className="px-3 py-2.5">Tipe Komoditi</th>
                  <th className="px-3 py-2.5 text-center">Aksi</th>
                  <th className="px-3 py-2.5">Perubahan Nilai (Lama → Baru)</th>
                  <th className="px-3 py-2.5">Diupdate Oleh</th>
                  <th className="px-3 py-2.5">Info Teknis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
                {filteredList.map((item, idx) => {
                  const isCurrency = item.mapping?.isCurrency ?? false

                  return (
                    <tr key={item.fdAuditID || idx} className="hover:bg-[var(--color-neutral)]/40 transition-colors">
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="font-medium text-[var(--color-primary)]">
                          {formatDateTime(item.fdUpdateDate)}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {item.mapping?.branchCode ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {renderBranchPill(item.mapping.branchCode)}
                            {renderModePill(item.mapping.mode, item.mapping.serviceType)}
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] text-[var(--color-secondary)] font-mono bg-[var(--color-neutral)] border border-[var(--color-border)]">
                            {item.mapping?.serviceType || 'Metadata/Rasio'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {renderCommodityPill(item.mapping?.commodityType, item.fdColumnName)}
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        {renderActionPill(item.fdAction)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="line-through text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20 text-xs font-mono">
                            {renderFormattedValue(item.fdOldValue, isCurrency)}
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-[var(--color-secondary)] shrink-0" />
                          <div className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 text-xs font-mono">
                            {renderFormattedValue(item.fdNewValue, isCurrency)}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[var(--color-neutral)] text-[var(--color-primary)] border border-[var(--color-border)] shadow-2xs">
                          <User className="w-3 h-3 text-[var(--color-secondary)]" />
                          <span>{item.fdUpdatedBy}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-[10px] text-[var(--color-secondary)]">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 font-mono bg-[var(--color-neutral)] border border-[var(--color-border)] mr-1">
                          IP: {item.fdIPAddress || '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
