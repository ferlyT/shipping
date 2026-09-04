import { useEffect, useState, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'
import {
  ArrowLeft,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Calendar,
  Tag,
  Plane,
  Ship,
  Search,
  Building2,
  Package,
  FolderTree,
  List,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Edit3,
} from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { customerPriceListApi } from '../services/customerPriceList.service'
import type { CustomerPriceListDiff, CustomerPriceListDiffRow } from '../types'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { EditEffectiveDateModal } from '@/features/price-list/components/EditEffectiveDateModal'
import { MarkingManagerModal } from '@/features/price-list/components/MarkingManagerModal'
import { CustomerCommodityPriceModal } from '../components/CustomerCommodityPriceModal'

interface CategorySubGroup {
  category: string
  items: CustomerPriceListDiffRow[]
  minCurrentPrice: number
  maxCurrentPrice: number
  naikCount: number
  turunCount: number
  tetapCount: number
  baruCount: number
}

interface BranchGroup {
  branch: string
  items: CustomerPriceListDiffRow[]
  categories: CategorySubGroup[]
  minCurrentPrice: number
  maxCurrentPrice: number
  naikCount: number
  turunCount: number
  tetapCount: number
  baruCount: number
}

export function DiffPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const uploadId = Number(id)

  const [data, setData] = useState<CustomerPriceListDiff | null>(null)
  const [onlyChanged, setOnlyChanged] = useState(false)
  const [activeKpi, setActiveKpi] = useState<'all' | 'naik' | 'turun' | 'tetap' | 'baru'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search & Grouping Modes
  const [searchQuery, setSearchQuery] = useState('')
  const [viewGrouping, setViewGrouping] = useState<'branch_category' | 'branch' | 'category' | 'flat'>('branch_category')
  const [collapsedBranches, setCollapsedBranches] = useState<Set<string>>(new Set())
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  const [isEditingEffectiveDate, setIsEditingEffectiveDate] = useState(false)
  const [isManagingMarkings, setIsManagingMarkings] = useState(false)
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any | null>(null)

  const handleOpenCreateModal = () => {
    setEditingItem(null)
    setIsPriceModalOpen(true)
  }

  const handleEditRow = (r: CustomerPriceListDiffRow) => {
    setEditingItem({
      id: r.id,
      fdCustCode: data?.fdCustCode,
      category: r.category,
      mode: r.mode,
      branch: r.branch,
      price: r.currentPrice,
      effectiveDate: data?.currentEffectiveDate,
      aliases: r.aliases || [],
    })
    setIsPriceModalOpen(true)
  }

  const loadData = () => {
    if (!uploadId) return
    setLoading(true)
    customerPriceListApi
      .getUploadDiff(uploadId)
      .then((res) => {
        setData(res.data.data)
      })
      .catch((err: any) => {
        setError(err?.response?.data?.message || err?.message || 'Gagal memuat detail upload')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [uploadId])

  let rows: CustomerPriceListDiffRow[] = data ? data.diff : []

  if (onlyChanged) {
    rows = rows.filter((r) => r.delta !== null && r.delta !== 0)
  }

  if (activeKpi !== 'all') {
    rows = rows.filter((r) => {
      if (activeKpi === 'naik') return r.delta !== null && r.delta > 0
      if (activeKpi === 'turun') return r.delta !== null && r.delta < 0
      if (activeKpi === 'tetap') return r.delta !== null && r.delta === 0
      if (activeKpi === 'baru') return r.delta === null
      return true
    })
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim()
    rows = rows.filter((r) => {
      const cat = (r.category || '').toLowerCase()
      const br = (r.branch || '').toLowerCase()
      const mode = (r.mode || '').toLowerCase()
      const marks = (r.markings || []).map((m) => `${m.markingCode} ${m.agentName || ''}`.toLowerCase())
      return cat.includes(q) || br.includes(q) || mode.includes(q) || marks.some((m) => m.includes(q))
    })
  }

  // Branch -> Category Grouping calculation
  const branchGroups = useMemo<BranchGroup[]>(() => {
    const branchMap = new Map<string, CustomerPriceListDiffRow[]>()

    for (const row of rows) {
      const br = row.branch || 'LAINNYA'
      if (!branchMap.has(br)) {
        branchMap.set(br, [])
      }
      branchMap.get(br)!.push(row)
    }

    const groups: BranchGroup[] = []

    for (const [branch, bItems] of branchMap.entries()) {
      const catMap = new Map<string, CustomerPriceListDiffRow[]>()
      for (const item of bItems) {
        const cat = item.category || 'LAIN-LAIN / UNKNOWN'
        if (!catMap.has(cat)) {
          catMap.set(cat, [])
        }
        catMap.get(cat)!.push(item)
      }

      const categories: CategorySubGroup[] = []
      for (const [category, cItems] of catMap.entries()) {
        categories.push({
          category,
          items: cItems,
          minCurrentPrice: Math.min(...cItems.map((i) => i.currentPrice)),
          maxCurrentPrice: Math.max(...cItems.map((i) => i.currentPrice)),
          naikCount: cItems.filter((i) => i.delta !== null && i.delta > 0).length,
          turunCount: cItems.filter((i) => i.delta !== null && i.delta < 0).length,
          tetapCount: cItems.filter((i) => i.delta !== null && i.delta === 0).length,
          baruCount: cItems.filter((i) => i.delta === null).length,
        })
      }

      categories.sort((a, b) => a.category.localeCompare(b.category))

      groups.push({
        branch,
        items: bItems,
        categories,
        minCurrentPrice: Math.min(...bItems.map((i) => i.currentPrice)),
        maxCurrentPrice: Math.max(...bItems.map((i) => i.currentPrice)),
        naikCount: bItems.filter((i) => i.delta !== null && i.delta > 0).length,
        turunCount: bItems.filter((i) => i.delta !== null && i.delta < 0).length,
        tetapCount: bItems.filter((i) => i.delta !== null && i.delta === 0).length,
        baruCount: bItems.filter((i) => i.delta === null).length,
      })
    }

    return groups.sort((a, b) => a.branch.localeCompare(b.branch))
  }, [rows])

  // Category Only Grouping calculation
  const categoryOnlyGroups = useMemo<CategorySubGroup[]>(() => {
    const catMap = new Map<string, CustomerPriceListDiffRow[]>()
    for (const item of rows) {
      const cat = item.category || 'LAIN-LAIN / UNKNOWN'
      if (!catMap.has(cat)) {
        catMap.set(cat, [])
      }
      catMap.get(cat)!.push(item)
    }

    const groups: CategorySubGroup[] = []
    for (const [category, cItems] of catMap.entries()) {
      groups.push({
        category,
        items: cItems,
        minCurrentPrice: Math.min(...cItems.map((i) => i.currentPrice)),
        maxCurrentPrice: Math.max(...cItems.map((i) => i.currentPrice)),
        naikCount: cItems.filter((i) => i.delta !== null && i.delta > 0).length,
        turunCount: cItems.filter((i) => i.delta !== null && i.delta < 0).length,
        tetapCount: cItems.filter((i) => i.delta !== null && i.delta === 0).length,
        baruCount: cItems.filter((i) => i.delta === null).length,
      })
    }

    return groups.sort((a, b) => a.category.localeCompare(b.category))
  }, [rows])

  const toggleBranch = (branch: string) => {
    setCollapsedBranches((prev) => {
      const next = new Set(prev)
      if (next.has(branch)) {
        next.delete(branch)
      } else {
        next.add(branch)
      }
      return next
    })
  }

  const toggleCategory = (catKey: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(catKey)) {
        next.delete(catKey)
      } else {
        next.add(catKey)
      }
      return next
    })
  }

  const allBranchesCollapsed = branchGroups.length > 0 && branchGroups.every((g) => collapsedBranches.has(g.branch))
  const allCategoriesCollapsed = categoryOnlyGroups.length > 0 && categoryOnlyGroups.every((g) => collapsedCategories.has(g.category))

  const handleToggleAllBranches = () => {
    if (allBranchesCollapsed) {
      setCollapsedBranches(new Set())
    } else {
      setCollapsedBranches(new Set(branchGroups.map((g) => g.branch)))
    }
  }

  const handleToggleAllCategories = () => {
    if (allCategoriesCollapsed) {
      setCollapsedCategories(new Set())
    } else {
      setCollapsedCategories(new Set(categoryOnlyGroups.map((g) => g.category)))
    }
  }

  const stats = data
    ? {
        naik: data.diff.filter((r) => r.delta !== null && r.delta > 0).length,
        turun: data.diff.filter((r) => r.delta !== null && r.delta < 0).length,
        tetap: data.diff.filter((r) => r.delta !== null && r.delta === 0).length,
        baru: data.diff.filter((r) => r.delta === null).length,
      }
    : null

  const custCode = data?.fdCustCode || ''
  const uploadMarkings = data?.markings || []

  const renderDeltaBadge = (r: CustomerPriceListDiffRow) => {
    if (r.delta === null) {
      return <span className="badge bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-[10px] px-2 py-0.5">Baru</span>
    }
    if (r.delta === 0) {
      return <span className="badge bg-[var(--color-neutral)] text-[var(--color-secondary)] border-[var(--color-border)] text-[10px] px-2 py-0.5">Tetap</span>
    }
    if (r.delta > 0) {
      return (
        <span className="badge bg-rose-500/10 text-rose-600 border-rose-500/20 inline-flex items-center gap-1 font-semibold text-[10px] px-2 py-0.5">
          <TrendingUp size={10} />
          +{(r.deltaPct ?? 0).toFixed(1)}%
        </span>
      )
    }
    return (
      <span className="badge bg-emerald-500/10 text-emerald-600 border-emerald-500/20 inline-flex items-center gap-1 font-semibold text-[10px] px-2 py-0.5">
        <TrendingDown size={10} />
        {(r.deltaPct ?? 0).toFixed(1)}%
      </span>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0 space-y-6 sm:space-y-8 bg-[var(--color-surface)] font-[var(--font-body)] animate-fadeIn pb-24">
      <PageHeader
        title={`${t('nav.priceListDetail')} #${uploadId}`}
        subtitle={
          loading
            ? t('common.loading')
            : data
            ? `Customer: ${custCode} · Berlaku mulai: ${formatDate(data.currentEffectiveDate)}${
                data.previousUploadId && data.previousEffectiveDate
                  ? ` · vs. ${formatDate(data.previousEffectiveDate)}`
                  : ' · (upload pertama untuk periode ini)'
              }`
            : ''
        }
        breadcrumbs={[
          { label: t('module.finance'), path: ROUTES.BILLING },
          { label: t('nav.customerPriceList'), path: ROUTES.CUSTOMER_PRICE_LIST },
          { label: custCode || 'History', path: custCode ? ROUTES.CUSTOMER_PRICE_LIST_DETAIL(custCode) : '#' },
          { label: `#${uploadId}` },
        ]}
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            {data && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenCreateModal}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                >
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  + Input / Edit Harga
                </Button>
                <Link to={`${ROUTES.COMMODITY_MAPPING}?scope=customer&search=${custCode || ''}`}>
                  <Button variant="secondary" size="sm">
                    <Tag className="w-4 h-4 mr-1.5 text-blue-600 dark:text-blue-400" />
                    Pemetaan Komoditas
                  </Button>
                </Link>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsManagingMarkings(true)}
                >
                  <Tag className="w-4 h-4 mr-1.5 text-amber-500" />
                  Agen / Marking ({uploadMarkings.length})
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditingEffectiveDate(true)}
                >
                  <Calendar className="w-4 h-4 mr-1.5" />
                  Edit Tgl Efektif
                </Button>
              </>
            )}
            <Link to={custCode ? ROUTES.CUSTOMER_PRICE_LIST_DETAIL(custCode) : ROUTES.CUSTOMER_PRICE_LIST}>
              <Button variant="secondary" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Kembali
              </Button>
            </Link>
          </div>
        }
      />

      {/* Info Agen / Marking Banner */}
      {!loading && data && (
        <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Tag size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[var(--color-primary)]">Agen & Kode Marking Terkait:</span>
                {uploadMarkings.length === 0 ? (
                  <span className="text-xs text-[var(--color-secondary)] italic">
                    Berlaku untuk semua agen customer ini
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {uploadMarkings.map((m) => (
                      <span
                        key={m.markingCode}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      >
                        {m.markingCode}
                        {m.agentName && <span className="ml-1 text-[10px] opacity-80 font-normal">({m.agentName})</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsManagingMarkings(true)}
            className="text-xs shrink-0"
          >
            {uploadMarkings.length > 0 ? 'Edit Marking' : '+ Tambah Marking Agen'}
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/25 bg-rose-500/5 px-4 py-3.5 text-sm text-rose-600">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2">
              <div className="h-4 w-16 rounded skeleton-shimmer" />
              <div className="h-7 w-12 rounded skeleton-shimmer" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            icon={<TrendingUp size={18} className="text-rose-500" />}
            label="Naik"
            value={stats.naik}
            color="rose"
            isActive={activeKpi === 'naik'}
            onClick={() => setActiveKpi((prev) => (prev === 'naik' ? 'all' : 'naik'))}
          />
          <StatCard
            icon={<TrendingDown size={18} className="text-emerald-600" />}
            label="Turun"
            value={stats.turun}
            color="emerald"
            isActive={activeKpi === 'turun'}
            onClick={() => setActiveKpi((prev) => (prev === 'turun' ? 'all' : 'turun'))}
          />
          <StatCard
            icon={<Minus size={18} className="text-[var(--color-secondary)]" />}
            label="Tetap"
            value={stats.tetap}
            color="secondary"
            isActive={activeKpi === 'tetap'}
            onClick={() => setActiveKpi((prev) => (prev === 'tetap' ? 'all' : 'tetap'))}
          />
          <StatCard
            icon={<Sparkles size={18} className="text-indigo-500" />}
            label="Baru"
            value={stats.baru}
            color="tertiary"
            isActive={activeKpi === 'baru'}
            onClick={() => setActiveKpi((prev) => (prev === 'baru' ? 'all' : 'baru'))}
          />
        </div>
      ) : null}

      {/* MAIN CONTAINER: TOOLBAR + GROUPED PRICE TABLES */}
      <div className="bg-[var(--color-surface)] shadow-xs border border-[var(--color-border)] rounded-2xl overflow-hidden space-y-0">
        {/* Top Filter & Grouping Toolbar */}
        <div className="px-4 sm:px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/40 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
          {/* Left: Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-secondary)] pointer-events-none" />
            <input
              type="text"
              placeholder="Cari cabang, kategori barang, marking, mode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] text-[var(--color-primary)] placeholder:text-[var(--color-secondary)] transition-all shadow-2xs"
            />
          </div>

          {/* Right: Grouping Selector + Expand All Button + Only Changed Toggle */}
          <div className="flex items-center justify-between md:justify-end gap-2.5 flex-wrap">
            {/* Grouping Segmented Control */}
            <div className="flex items-center p-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xs">
              <button
                type="button"
                onClick={() => setViewGrouping('branch_category')}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                  viewGrouping === 'branch_category'
                    ? 'bg-[var(--color-primary)] text-[var(--color-surface)] shadow-xs'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
                title="Kelompokkan berdasarkan Cabang lalu Kategori Barang"
              >
                <FolderTree size={13} />
                <span className="hidden sm:inline">Cabang & Kategori</span>
              </button>
              <button
                type="button"
                onClick={() => setViewGrouping('branch')}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                  viewGrouping === 'branch'
                    ? 'bg-[var(--color-primary)] text-[var(--color-surface)] shadow-xs'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
                title="Kelompokkan berdasarkan Cabang"
              >
                <Building2 size={13} />
                <span className="hidden sm:inline">Cabang</span>
              </button>
              <button
                type="button"
                onClick={() => setViewGrouping('category')}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                  viewGrouping === 'category'
                    ? 'bg-[var(--color-primary)] text-[var(--color-surface)] shadow-xs'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
                title="Kelompokkan berdasarkan Kategori Barang"
              >
                <Package size={13} />
                <span className="hidden sm:inline">Kategori</span>
              </button>
              <button
                type="button"
                onClick={() => setViewGrouping('flat')}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                  viewGrouping === 'flat'
                    ? 'bg-[var(--color-primary)] text-[var(--color-surface)] shadow-xs'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
                title="Tampilan Tabel Datar"
              >
                <List size={13} />
                <span className="hidden sm:inline">Flat</span>
              </button>
            </div>

            {/* Toggle Expand All (Always rendered, disabled in Flat view to avoid layout shift) */}
            <button
              type="button"
              disabled={viewGrouping === 'flat'}
              onClick={() => {
                if (viewGrouping === 'category') {
                  handleToggleAllCategories()
                } else {
                  handleToggleAllBranches()
                }
              }}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all shadow-2xs',
                viewGrouping === 'flat'
                  ? 'opacity-40 cursor-not-allowed border-[var(--color-border)] bg-[var(--color-neutral)]/30 text-[var(--color-secondary)] select-none'
                  : 'cursor-pointer border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              )}
              title={
                viewGrouping === 'flat'
                  ? 'Tidak berlaku pada tampilan Flat'
                  : viewGrouping === 'category'
                  ? (allCategoriesCollapsed ? 'Buka Semua Kategori' : 'Tutup Semua Kategori')
                  : (allBranchesCollapsed ? 'Buka Semua Cabang' : 'Tutup Semua Cabang')
              }
            >
              <ChevronsUpDown size={13} />
              <span className="hidden sm:inline">
                {viewGrouping === 'flat'
                  ? 'Tutup Semua'
                  : viewGrouping === 'category'
                  ? (allCategoriesCollapsed ? 'Buka Semua' : 'Tutup Semua')
                  : (allBranchesCollapsed ? 'Buka Semua' : 'Tutup Semua')}
              </span>
            </button>

            {/* Changed Only Toggle Button with High-Contrast Switch */}
            <button
              type="button"
              onClick={() => setOnlyChanged((v) => !v)}
              className={cn(
                'inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs font-semibold select-none cursor-pointer transition-all shadow-2xs',
                onlyChanged
                  ? 'bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300'
                  : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-secondary)]/50'
              )}
              title="Hanya tampilkan tarif yang berubah"
            >
              <div
                className={cn(
                  'relative w-8 h-4 rounded-full transition-colors duration-200 shrink-0',
                  onlyChanged
                    ? 'bg-blue-600 dark:bg-blue-500'
                    : 'bg-slate-300 dark:bg-slate-600 border border-slate-400/60 dark:border-slate-500'
                )}
              >
                <div
                  className={cn(
                    'absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-xs transition-transform duration-200',
                    onlyChanged ? 'translate-x-4' : 'translate-x-0'
                  )}
                />
              </div>
              <span className="whitespace-nowrap">Berubah saja</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded skeleton-shimmer" />
                  <div className="h-4 w-32 rounded skeleton-shimmer" />
                  <div className="h-4 w-16 rounded-full skeleton-shimmer" />
                </div>
                <div className="h-5 w-20 rounded skeleton-shimmer" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-16 text-center text-xs text-[var(--color-secondary)]">
            Tidak ada data tarif yang cocok dengan kriteria pencarian / filter.
          </div>
        ) : viewGrouping === 'branch_category' ? (
          /* ============================================================ */
          /* 1. HIERARCHICAL GROUPING: CABANG -> KATEGORI BARANG          */
          /* ============================================================ */
          <div className="divide-y divide-[var(--color-border)]">
            {branchGroups.map((bGroup) => {
              const isBranchCollapsed = collapsedBranches.has(bGroup.branch)

              return (
                <div key={bGroup.branch} className="bg-[var(--color-surface)]">
                  {/* Branch Level Header */}
                  <div
                    onClick={() => toggleBranch(bGroup.branch)}
                    className="px-4 sm:px-6 py-3.5 bg-[var(--color-neutral)]/60 hover:bg-[var(--color-neutral)] transition-colors cursor-pointer flex items-center justify-between gap-3 select-none flex-wrap sm:flex-nowrap border-b border-[var(--color-border)]/60"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        className="p-1 rounded-md text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors"
                      >
                        {isBranchCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                      </button>

                      {/* Branch Pill */}
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xs font-mono font-bold text-xs text-[var(--color-primary)]">
                        <Building2 size={13} className="text-blue-600 dark:text-blue-400" />
                        <span>CABANG {bGroup.branch}</span>
                      </div>

                      <span className="text-xs text-[var(--color-secondary)] font-medium">
                        {bGroup.categories.length} Kategori · {bGroup.items.length} Baris Tarif
                      </span>
                    </div>

                    {/* Right Stats in Branch Header */}
                    <div className="flex items-center gap-2.5 shrink-0 ml-auto sm:ml-0 text-xs">
                      {bGroup.naikCount > 0 && (
                        <span className="badge bg-rose-500/10 text-rose-600 border-rose-500/25 text-[10px] px-2 py-0.5 font-bold">
                          +{bGroup.naikCount} Naik
                        </span>
                      )}
                      {bGroup.turunCount > 0 && (
                        <span className="badge bg-emerald-500/10 text-emerald-600 border-emerald-500/25 text-[10px] px-2 py-0.5 font-bold">
                          -{bGroup.turunCount} Turun
                        </span>
                      )}
                      {bGroup.baruCount > 0 && (
                        <span className="badge bg-indigo-500/10 text-indigo-600 border-indigo-500/25 text-[10px] px-2 py-0.5 font-bold">
                          {bGroup.baruCount} Baru
                        </span>
                      )}
                      <span className="font-mono font-semibold text-[var(--color-primary)] text-xs hidden sm:inline">
                        {formatCurrency(bGroup.minCurrentPrice)}
                        {bGroup.minCurrentPrice !== bGroup.maxCurrentPrice ? ` – ${formatCurrency(bGroup.maxCurrentPrice)}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Categories inside this Branch */}
                  {!isBranchCollapsed && (
                    <div className="p-3 sm:p-5 space-y-4 bg-[var(--color-neutral)]/10">
                      {bGroup.categories.map((cGroup) => {
                        const catKey = `${bGroup.branch}_${cGroup.category}`
                        const isCatCollapsed = collapsedCategories.has(catKey)

                        return (
                          <div
                            key={catKey}
                            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs overflow-hidden"
                          >
                            {/* Category Sub-Header */}
                            <div
                              onClick={() => toggleCategory(catKey)}
                              className="px-4 py-2.5 bg-[var(--color-neutral)]/40 hover:bg-[var(--color-neutral)]/80 transition-colors cursor-pointer flex items-center justify-between gap-3 select-none flex-wrap sm:flex-nowrap border-b border-[var(--color-border)]/60"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <button
                                  type="button"
                                  className="p-0.5 rounded text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                                >
                                  {isCatCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                </button>

                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--color-primary)]">
                                    <Package size={14} className="text-amber-500 shrink-0" />
                                    <span>{cGroup.category}</span>
                                  </div>
                                  {cGroup.items[0]?.aliases && cGroup.items[0].aliases.length > 0 && (
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className="text-[10px] text-[var(--color-secondary)]">Alias:</span>
                                      {cGroup.items[0].aliases.map((a) => (
                                        <span
                                          key={a}
                                          className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25"
                                        >
                                          {a}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <span className="text-[11px] text-[var(--color-secondary)] font-normal">
                                  ({cGroup.items.length} item)
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-xs font-mono shrink-0">
                                <span className="text-[11px] text-[var(--color-secondary)] hidden sm:inline">Range:</span>
                                <span className="font-semibold text-[var(--color-primary)] text-xs">
                                  {formatCurrency(cGroup.minCurrentPrice)}
                                  {cGroup.minCurrentPrice !== cGroup.maxCurrentPrice ? ` – ${formatCurrency(cGroup.maxCurrentPrice)}` : ''}
                                </span>
                              </div>
                            </div>

                            {/* Category Table Items */}
                            {!isCatCollapsed && (
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-xs">
                                  <thead className="bg-[var(--color-neutral)]/20 text-[10px] uppercase font-bold text-[var(--color-secondary)] border-b border-[var(--color-border)]/50">
                                    <tr>
                                      <th className="px-4 py-2 text-left w-28">Mode</th>
                                      <th className="px-4 py-2 text-left">Agen / Marking</th>
                                      <th className="px-4 py-2 text-right w-36">Harga Sebelumnya</th>
                                      <th className="px-4 py-2 text-right w-36">Harga Sekarang</th>
                                      <th className="px-4 py-2 text-right w-28">Perubahan</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[var(--color-border)]/40 font-sans">
                                    {cGroup.items.map((r, rIdx) => (
                                      <tr key={rIdx} className="hover:bg-[var(--color-neutral)]/40 transition-colors">
                                        {/* Mode */}
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                            {r.mode.toUpperCase().includes('SEA') ? <Ship size={10} /> : <Plane size={10} />}
                                            {r.mode}
                                          </span>
                                        </td>

                                        {/* Marking / Agen */}
                                        <td className="px-4 py-2.5">
                                          {r.markings && r.markings.length > 0 ? (
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              {r.markings.map((m, mi) => (
                                                <span
                                                  key={`${m.markingCode}-${mi}`}
                                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 shadow-2xs font-mono"
                                                >
                                                  {m.markingCode}
                                                  {m.agentName && (
                                                    <span className="font-normal opacity-80 text-[9px] font-sans">({m.agentName})</span>
                                                  )}
                                                </span>
                                              ))}
                                            </div>
                                          ) : (
                                            <span className="text-[11px] text-[var(--color-secondary)]/70 italic">Semua Agen</span>
                                          )}
                                        </td>

                                        {/* Previous Price */}
                                        <td className="px-4 py-2.5 text-right font-mono text-[var(--color-secondary)]">
                                          {r.previousPrice !== null ? formatCurrency(r.previousPrice) : '—'}
                                        </td>

                                        {/* Current Price */}
                                        <td className="px-4 py-2.5 text-right font-mono font-bold text-[var(--color-primary)]">
                                          {formatCurrency(r.currentPrice)}
                                        </td>

                                        {/* Delta Badge & Action */}
                                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                          <div className="flex items-center justify-end gap-1.5">
                                            {renderDeltaBadge(r)}
                                            <button
                                              type="button"
                                              onClick={() => handleEditRow(r)}
                                              className="p-1 rounded-md text-[var(--color-secondary)] hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                                              title="Edit Tarif"
                                            >
                                              <Edit3 size={13} />
                                            </button>
                                          </div>
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
                  )}
                </div>
              )
            })}
          </div>
        ) : viewGrouping === 'branch' ? (
          /* ============================================================ */
          /* 2. GROUPING BY CABANG ONLY                                   */
          /* ============================================================ */
          <div className="divide-y divide-[var(--color-border)]">
            {branchGroups.map((bGroup) => {
              const isBranchCollapsed = collapsedBranches.has(bGroup.branch)

              return (
                <div key={bGroup.branch} className="bg-[var(--color-surface)]">
                  {/* Branch Level Header */}
                  <div
                    onClick={() => toggleBranch(bGroup.branch)}
                    className="px-4 sm:px-6 py-3.5 bg-[var(--color-neutral)]/60 hover:bg-[var(--color-neutral)] transition-colors cursor-pointer flex items-center justify-between gap-3 select-none flex-wrap sm:flex-nowrap border-b border-[var(--color-border)]/60"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        className="p-1 rounded-md text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors"
                      >
                        {isBranchCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                      </button>

                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xs font-mono font-bold text-xs text-[var(--color-primary)]">
                        <Building2 size={13} className="text-blue-600 dark:text-blue-400" />
                        <span>CABANG {bGroup.branch}</span>
                      </div>

                      <span className="text-xs text-[var(--color-secondary)] font-medium">
                        {bGroup.items.length} Item Tarif
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 text-xs font-mono">
                      <span className="font-semibold text-[var(--color-primary)]">
                        {formatCurrency(bGroup.minCurrentPrice)}
                        {bGroup.minCurrentPrice !== bGroup.maxCurrentPrice ? ` – ${formatCurrency(bGroup.maxCurrentPrice)}` : ''}
                      </span>
                    </div>
                  </div>

                  {!isBranchCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-[var(--color-neutral)] text-[10px] uppercase font-bold text-[var(--color-secondary)] border-b border-[var(--color-border)]">
                          <tr>
                            <th className="px-6 py-3 text-left">Mode</th>
                            <th className="px-6 py-3 text-left">Kategori Barang</th>
                            <th className="px-6 py-3 text-left">Agen / Marking</th>
                            <th className="px-6 py-3 text-right">Harga Sebelumnya</th>
                            <th className="px-6 py-3 text-right">Harga Sekarang</th>
                            <th className="px-6 py-3 text-right">Perubahan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]/50">
                          {bGroup.items.map((r, rIdx) => (
                            <tr key={rIdx} className="hover:bg-[var(--color-neutral)]/40 transition-colors">
                              <td className="px-6 py-3 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                  {r.mode.toUpperCase().includes('SEA') ? <Ship size={10} /> : <Plane size={10} />}
                                  {r.mode}
                                </span>
                              </td>
                              <td className="px-6 py-3 font-semibold text-[var(--color-primary)]">
                                <div>{r.category}</div>
                                {r.aliases && r.aliases.length > 0 && (
                                  <div className="flex items-center gap-1 flex-wrap mt-0.5">
                                    {r.aliases.map((a) => (
                                      <span
                                        key={a}
                                        className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25"
                                      >
                                        {a}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-3">
                                {r.markings && r.markings.length > 0 ? (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {r.markings.map((m, mi) => (
                                      <span
                                        key={`${m.markingCode}-${mi}`}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 font-mono"
                                      >
                                        {m.markingCode}
                                        {m.agentName && <span className="font-normal opacity-80 text-[9px] font-sans">({m.agentName})</span>}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-[var(--color-secondary)]/70 italic">Semua Agen</span>
                                )}
                              </td>
                              <td className="px-6 py-3 text-right font-mono text-[var(--color-secondary)]">
                                {r.previousPrice !== null ? formatCurrency(r.previousPrice) : '—'}
                              </td>
                              <td className="px-6 py-3 text-right font-mono font-bold text-[var(--color-primary)]">
                                {formatCurrency(r.currentPrice)}
                              </td>
                              <td className="px-6 py-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  {renderDeltaBadge(r)}
                                  <button
                                    type="button"
                                    onClick={() => handleEditRow(r)}
                                    className="p-1 rounded-md text-[var(--color-secondary)] hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                                    title="Edit Tarif"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                </div>
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
        ) : viewGrouping === 'category' ? (
          /* ============================================================ */
          /* 3. GROUPING BY KATEGORI ONLY                                 */
          /* ============================================================ */
          <div className="divide-y divide-[var(--color-border)]">
            {categoryOnlyGroups.map((cGroup) => {
              const isCatCollapsed = collapsedCategories.has(cGroup.category)

              return (
                <div key={cGroup.category} className="bg-[var(--color-surface)]">
                  {/* Category Header */}
                  <div
                    onClick={() => toggleCategory(cGroup.category)}
                    className="px-4 sm:px-6 py-3.5 bg-[var(--color-neutral)]/60 hover:bg-[var(--color-neutral)] transition-colors cursor-pointer flex items-center justify-between gap-3 select-none flex-wrap sm:flex-nowrap border-b border-[var(--color-border)]/60"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        className="p-1 rounded-md text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors"
                      >
                        {isCatCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                      </button>

                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xs font-semibold text-xs text-[var(--color-primary)]">
                          <Package size={14} className="text-amber-500" />
                          <span>{cGroup.category}</span>
                        </div>
                        {cGroup.items[0]?.aliases && cGroup.items[0].aliases.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[10px] text-[var(--color-secondary)]">Alias:</span>
                            {cGroup.items[0].aliases.map((a) => (
                              <span
                                key={a}
                                className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25"
                              >
                                {a}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <span className="text-xs text-[var(--color-secondary)] font-medium">
                        {cGroup.items.length} Baris Tarif
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 text-xs font-mono">
                      <span className="font-semibold text-[var(--color-primary)]">
                        {formatCurrency(cGroup.minCurrentPrice)}
                        {cGroup.minCurrentPrice !== cGroup.maxCurrentPrice ? ` – ${formatCurrency(cGroup.maxCurrentPrice)}` : ''}
                      </span>
                    </div>
                  </div>

                  {!isCatCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-[var(--color-neutral)] text-[10px] uppercase font-bold text-[var(--color-secondary)] border-b border-[var(--color-border)]">
                          <tr>
                            <th className="px-6 py-3 text-left">Mode</th>
                            <th className="px-6 py-3 text-left">Cabang</th>
                            <th className="px-6 py-3 text-left">Agen / Marking</th>
                            <th className="px-6 py-3 text-right">Harga Sebelumnya</th>
                            <th className="px-6 py-3 text-right">Harga Sekarang</th>
                            <th className="px-6 py-3 text-right">Perubahan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]/50">
                          {cGroup.items.map((r, rIdx) => (
                            <tr key={rIdx} className="hover:bg-[var(--color-neutral)]/40 transition-colors">
                              <td className="px-6 py-3 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                  {r.mode.toUpperCase().includes('SEA') ? <Ship size={10} /> : <Plane size={10} />}
                                  {r.mode}
                                </span>
                              </td>
                              <td className="px-6 py-3 font-mono font-bold text-[var(--color-primary)]">
                                {r.branch}
                              </td>
                              <td className="px-6 py-3">
                                {r.markings && r.markings.length > 0 ? (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {r.markings.map((m, mi) => (
                                      <span
                                        key={`${m.markingCode}-${mi}`}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 font-mono"
                                      >
                                        {m.markingCode}
                                        {m.agentName && <span className="font-normal opacity-80 text-[9px] font-sans">({m.agentName})</span>}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-[var(--color-secondary)]/70 italic">Semua Agen</span>
                                )}
                              </td>
                              <td className="px-6 py-3 text-right font-mono text-[var(--color-secondary)]">
                                {r.previousPrice !== null ? formatCurrency(r.previousPrice) : '—'}
                              </td>
                              <td className="px-6 py-3 text-right font-mono font-bold text-[var(--color-primary)]">
                                {formatCurrency(r.currentPrice)}
                              </td>
                              <td className="px-6 py-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  {renderDeltaBadge(r)}
                                  <button
                                    type="button"
                                    onClick={() => handleEditRow(r)}
                                    className="p-1 rounded-md text-[var(--color-secondary)] hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                                    title="Edit Tarif"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                </div>
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
          /* ============================================================ */
          /* 4. FLAT TABLE VIEW                                           */
          /* ============================================================ */
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-[var(--color-neutral)] text-[10px] uppercase font-bold text-[var(--color-secondary)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-6 py-3 text-left">Mode</th>
                  <th className="px-6 py-3 text-left">Cabang</th>
                  <th className="px-6 py-3 text-left">Kategori Barang</th>
                  <th className="px-6 py-3 text-left">Agen / Marking</th>
                  <th className="px-6 py-3 text-right">Harga Sebelumnya</th>
                  <th className="px-6 py-3 text-right">Harga Sekarang</th>
                  <th className="px-6 py-3 text-right">Perubahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]/50">
                {rows.map((r, rIdx) => (
                  <tr key={rIdx} className="hover:bg-[var(--color-neutral)]/40 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                        {r.mode.toUpperCase().includes('SEA') ? <Ship size={10} /> : <Plane size={10} />}
                        {r.mode}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-mono font-bold text-[var(--color-primary)]">
                      {r.branch}
                    </td>
                    <td className="px-6 py-3 font-semibold text-[var(--color-primary)]">
                      <div>{r.category}</div>
                      {r.aliases && r.aliases.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mt-0.5">
                          {r.aliases.map((a) => (
                            <span
                              key={a}
                              className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {r.markings && r.markings.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {r.markings.map((m, mi) => (
                            <span
                              key={`${m.markingCode}-${mi}`}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 font-mono"
                            >
                              {m.markingCode}
                              {m.agentName && <span className="font-normal opacity-80 text-[9px] font-sans">({m.agentName})</span>}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-[var(--color-secondary)]/70 italic">Semua Agen</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-[var(--color-secondary)]">
                      {r.previousPrice !== null ? formatCurrency(r.previousPrice) : '—'}
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-bold text-[var(--color-primary)]">
                      {formatCurrency(r.currentPrice)}
                    </td>
                    <td className="px-6 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {renderDeltaBadge(r)}
                        <button
                          type="button"
                          onClick={() => handleEditRow(r)}
                          className="p-1 rounded-md text-[var(--color-secondary)] hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                          title="Edit Tarif"
                        >
                          <Edit3 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Effective Date Modal */}
      {data && (
        <EditEffectiveDateModal
          isOpen={isEditingEffectiveDate}
          onClose={() => setIsEditingEffectiveDate(false)}
          uploadId={uploadId}
          currentEffectiveDate={data.currentEffectiveDate}
          onSave={async (newDate) => {
            await customerPriceListApi.updateEffectiveDate(uploadId, newDate)
            loadData()
          }}
        />
      )}

      {/* Marking Manager Modal */}
      {data && (
        <MarkingManagerModal
          isOpen={isManagingMarkings}
          onClose={() => setIsManagingMarkings(false)}
          uploadId={uploadId}
          uploadDescription={{
            title: `Price List Upload #${uploadId}`,
            effectiveDate: data.currentEffectiveDate,
            custCode: custCode,
          }}
          initialMarkings={uploadMarkings}
          onSave={async (markings) => {
            await customerPriceListApi.setUploadMarkings(uploadId, markings)
            loadData()
          }}
        />
      )}

      {/* Customer Commodity Price Modal */}
      <CustomerCommodityPriceModal
        isOpen={isPriceModalOpen}
        initialData={editingItem}
        onClose={() => {
          setIsPriceModalOpen(false)
          setEditingItem(null)
        }}
        onSuccess={() => {
          setIsPriceModalOpen(false)
          setEditingItem(null)
          loadData()
        }}
        defaultCustCode={custCode}
      />
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
  isActive,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: 'emerald' | 'rose' | 'secondary' | 'tertiary'
  isActive?: boolean
  onClick?: () => void
}) {
  const borderColors = {
    emerald: 'border-emerald-500/40 text-emerald-500 hover:border-emerald-500',
    rose: 'border-rose-500/40 text-rose-500 hover:border-rose-500',
    secondary: 'border-[var(--color-border)] text-[var(--color-primary)] hover:border-[var(--color-secondary)]',
    tertiary: 'border-indigo-500/40 text-indigo-500 hover:border-indigo-500',
  }
  
  const activeBorders = {
    emerald: 'ring-2 ring-emerald-500/50 border-emerald-500',
    rose: 'ring-2 ring-rose-500/50 border-rose-500',
    secondary: 'ring-2 ring-[var(--color-primary)]/40 border-[var(--color-primary)]',
    tertiary: 'ring-2 ring-indigo-500/50 border-indigo-500',
  }

  return (
    <div
      onClick={onClick}
      className={`
        bg-transparent border rounded-xl p-4 sm:p-5 
        shadow-xs transition-all duration-200 cursor-pointer flex flex-col gap-3
        ${borderColors[color]}
        ${isActive ? activeBorders[color] : ''}
      `}
    >
      <div className="flex items-center justify-between">
        <span className="text-[0.8rem] font-semibold text-[var(--color-secondary)] tracking-wide">{label}</span>
        <div className="p-1.5 rounded-lg bg-transparent border border-[var(--color-border)]">{icon}</div>
      </div>
      <div className="text-[1.5rem] leading-none font-bold text-[var(--color-primary)] font-mono">
        {value.toLocaleString('en-US')}
      </div>
    </div>
  )
}
