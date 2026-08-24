import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Plane, Ship, Download, Users, Layers, Clock, X, FileSpreadsheet, AlertTriangle, CheckCircle2, Tag, Info } from 'lucide-react'
import * as XLSX from 'xlsx'
import { billingApi } from '../services/billing.service'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useTranslation } from '@/hooks/useTranslation'
import { formatDateTime, formatCurrency, formatDecimal, cn } from '@/lib/utils'
import { AgingBadge } from '../components/AgingBadge'
import { StatusBadge } from '../components/StatusBadge'
import { StatusKirimBadge } from '../components/StatusKirimBadge'
import { MismatchModal } from '../components/MismatchModal'
import { PartialDetailModal } from '../components/PartialDetailModal'
import { TargetPriceCheckModal } from '../components/TargetPriceCheckModal'
import type { TargetBillingItem, GroupKey } from '../types/billing.types'

const PIC_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  thara: { label: 'Thara', bg: 'var(--color-primary)', text: 'var(--color-on-primary)' },
  yati:  { label: 'Yati',  bg: '#B8422E', text: '#fff' },
  kiki:  { label: 'Kiki',  bg: '#D97706', text: '#fff' },
  ferly: { label: 'Ferly', bg: '#1F6E5C', text: '#fff' },
  rico:  { label: 'Rico',  bg: '#2A5C8A', text: '#fff' },
}

const PIC_OPTIONS_BY_TYPE = {
  all:   [{ key: 'all', name: 'Semua PIC' }, { key: 'yati', name: 'Yati' }, { key: 'kiki', name: 'Kiki' }, { key: 'thara', name: 'Thara' }, { key: 'ferly', name: 'Ferly' }, { key: 'rico', name: 'Rico' }],
  udara: [{ key: 'all', name: 'Semua PIC' }, { key: 'yati', name: 'Yati' }, { key: 'kiki', name: 'Kiki' }],
  laut:  [{ key: 'all', name: 'Semua PIC' }, { key: 'thara', name: 'Thara' }, { key: 'ferly', name: 'Ferly' }, { key: 'rico', name: 'Rico' }],
}

const GROUP_OPTIONS: { key: GroupKey; name: string; borderAccent?: string; activeClass?: string }[] = [
  { key: 'all',     name: 'Semua' },
  { key: 'partial', name: 'PARSIAL',        borderAccent: 'border-purple-500/40 text-purple-600 dark:text-purple-400', activeClass: 'border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-500/10' },
  { key: 'fcl',     name: 'FCL',            borderAccent: 'border-indigo-500/40 text-indigo-600 dark:text-indigo-400', activeClass: 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10' },
  { key: 'cod',     name: 'COD',            borderAccent: 'border-rose-500/40 text-rose-600 dark:text-rose-400',     activeClass: 'border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-500/10' },
  { key: 'urgent',  name: 'URGENT',         borderAccent: 'border-orange-500/40 text-orange-600 dark:text-orange-400', activeClass: 'border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-500/10' },
  { key: 'aging',   name: 'Aging > 7 Hari', borderAccent: 'border-amber-500/40 text-amber-600 dark:text-amber-400',   activeClass: 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10' },
]

export default function TargetPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()

  const typeParam   = searchParams.get('type')
  const initialType = (typeParam === 'laut' ? 'laut' : typeParam === 'udara' ? 'udara' : 'all') as 'all' | 'udara' | 'laut'
  const initialPic  = searchParams.get('pic') || 'all'

  const [activeType,       setActiveType]       = useState<'all' | 'udara' | 'laut'>(initialType)
  const [activePic,        setActivePic]        = useState<string>(initialPic)
  const [activeGroup,      setActiveGroup]      = useState<GroupKey>('all')
  const [searchQuery,      setSearchQuery]      = useState('')
  const [mismatchItem,     setMismatchItem]     = useState<TargetBillingItem | null>(null)
  const [partialModalItem, setPartialModalItem] = useState<TargetBillingItem | null>(null)
  const [priceCheckItem,   setPriceCheckItem]   = useState<TargetBillingItem | null>(null)

  const picOptions = useMemo(() => PIC_OPTIONS_BY_TYPE[activeType] || [], [activeType])

  const handleTypeChange = (type: 'all' | 'udara' | 'laut') => {
    setActiveType(type)
    const validKeys = PIC_OPTIONS_BY_TYPE[type].map((o) => o.key)
    const nextPic   = validKeys.includes(activePic) ? activePic : 'all'
    setActivePic(nextPic)
    setSearchParams((prev) => {
      type === 'all' ? prev.delete('type') : prev.set('type', type)
      nextPic === 'all' ? prev.delete('pic') : prev.set('pic', nextPic)
      return prev
    })
  }

  const handlePicChange = (pic: string) => {
    setActivePic(pic)
    setSearchParams((prev) => {
      pic === 'all' ? prev.delete('pic') : prev.set('pic', pic)
      return prev
    })
  }

  const { data: resData, isLoading } = useQuery({
    queryKey: ['targetBillDetails', activeType, activePic],
    queryFn: async () => {
      const res = await billingApi.targetDetails({ type: activeType, pic: activePic })
      return res.data as { data: TargetBillingItem[] }
    },
    staleTime: 30_000,
  })

  const rawList: TargetBillingItem[] = resData?.data || []

  // Summary counts per group (always from rawList)
  const groupCounts = useMemo(() => {
    const counts: Record<GroupKey, number> = { all: rawList.length, partial: 0, fcl: 0, cod: 0, urgent: 0, aging: 0 }
    for (const item of rawList) {
      const typeStr     = String(item.type     || '').toUpperCase().trim()
      const comodityStr = String(item.comodity || '').toUpperCase().trim()
      const st          = String(item.status   || '').toUpperCase().trim()
      const hari        = Number(item.hari     || 0)
      if (item.isPartial)        counts.partial++
      if (typeStr.includes('FCL') || comodityStr.includes('FCL')) counts.fcl++
      if (st.includes('COD'))    counts.cod++
      if (st.includes('URGENT')) counts.urgent++
      if (hari > 7)              counts.aging++
    }
    return counts
  }, [rawList])

  // Filtered by group
  const groupedList = useMemo(() => {
    if (activeGroup === 'all') return rawList
    return rawList.filter((item) => {
      const typeStr     = String(item.type     || '').toUpperCase().trim()
      const comodityStr = String(item.comodity || '').toUpperCase().trim()
      const st          = String(item.status   || '').toUpperCase().trim()
      const hari        = Number(item.hari     || 0)
      if (activeGroup === 'partial') return !!item.isPartial
      if (activeGroup === 'fcl')    return typeStr.includes('FCL') || comodityStr.includes('FCL')
      if (activeGroup === 'cod')    return st.includes('COD')
      if (activeGroup === 'urgent') return st.includes('URGENT')
      if (activeGroup === 'aging')  return hari > 7
      return true
    })
  }, [rawList, activeGroup])

  // Filtered by search query (client-side)
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return groupedList
    const q = searchQuery.toLowerCase().trim()
    return groupedList.filter((item) => {
      return (
        String(item.customer    || '').toLowerCase().includes(q) ||
        String(item.markingCode || '').toLowerCase().includes(q) ||
        String(item.markingNo   || '').toLowerCase().includes(q) ||
        String(item.listNo      || '').toLowerCase().includes(q) ||
        String(item.branch      || '').toLowerCase().includes(q) ||
        String(item.comodity    || '').toLowerCase().includes(q) ||
        String(item.type        || '').toLowerCase().includes(q) ||
        String(item.pic         || '').toLowerCase().includes(q) ||
        (item.isPartial && (q === 'parsial' || q === 'partial'))
      )
    })
  }, [groupedList, searchQuery])

  // Export to Excel
  const handleExportExcel = () => {
    if (!filteredList.length) return
    const exportData = filteredList.map((item, idx) => ({
      'No':                 idx + 1,
      'PIC':                item.pic         || '-',
      'Tipe':               item.type        || '-',
      'List No':            item.listNo      || '-',
      'Marking Code':       item.markingCode || '-',
      'Marking No':         item.markingNo   || '-',
      'Parsial':            item.isPartial   ? `Parsial (${item.countTerima || 1} terima)` : 'Normal',
      'Tgl Input':          item.fdLoad      ? formatDateTime(item.fdLoad) : '-',
      'Cabang':             item.branch      || '-',
      'Customer':           item.customer    || '-',
      'Komoditi':           item.comodity    || '-',
      'Qty (List)':         item.qty         ?? '-',
      'Qty (PL)':           item.qtyPL       ?? '-',
      'M3':                 item.m3          ?? '-',
      'M3 PL':              item.m3PL        ?? '-',
      'M3 Real':            item.m3Real      ?? '-',
      'Harga M3':           item.hargaM3     ?? '-',
      'Total Biaya':        item.totalBiaya  ?? '-',
      'Status':             item.status      || '-',
      'Status Kirim':       item.statusKirim || '-',
      'Hari (Aging)':       item.hari        ?? '-',
      'Tgl Buat List':      item.createdDate ? formatDateTime(item.createdDate) : '-',
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Target Billing')

    const typeLabel = activeType === 'all' ? 'Semua' : activeType === 'udara' ? 'Udara' : 'Laut'
    const picLabel  = activePic  === 'all' ? 'Semua-PIC' : activePic.toUpperCase()
    const fileName  = `Target-Billing-${typeLabel}-${picLabel}-${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  if (isLoading && !resData) return <LoadingSpinner message={t('common.loadingBilling')} />

  const activeGroupOpt = GROUP_OPTIONS.find((g) => g.key === activeGroup)

  return (
    <div className="p-4 sm:p-6 w-full space-y-5 animate-fadeIn pb-24 min-h-screen bg-[var(--color-neutral)] font-[var(--font-body)]">
      <MismatchModal item={mismatchItem} onClose={() => setMismatchItem(null)} />
      <PartialDetailModal item={partialModalItem} onClose={() => setPartialModalItem(null)} />
      <TargetPriceCheckModal item={priceCheckItem} activeMode={activeType} onClose={() => setPriceCheckItem(null)} />
      
      <PageHeader
        title={`Target Bill ${activeType === 'all' ? 'Semua Mode' : activeType.toUpperCase()}`}
        subtitle={
          activeType === 'udara'
            ? 'Rincian item pengiriman (COD / URGENT / Aging > 7 Hari) yang belum diinvoice'
            : 'Rincian item pengiriman (FCL / COD / URGENT / Aging > 7 Hari) yang belum diinvoice'
        }
        breadcrumbs={[
          { label: t('module.finance'), path: ROUTES.BILLING },
          { label: t('nav.billing'), path: ROUTES.BILLING },
          { label: t('nav.targetBill') },
        ]}
      />

      {/* ── TOOLBAR CARD ─────────────────────────────────────── */}
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-xs border border-[var(--color-border)] overflow-hidden">

        {/* Row 1 — Mode + PIC */}
        <div className="px-4 py-3 flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/50">

          {/* Mode toggle */}
          <div className="flex items-center gap-0.5 p-0.5 bg-[var(--color-neutral)] rounded-xl border border-[var(--color-border)] shrink-0">
            <button
              onClick={() => handleTypeChange('all')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeType === 'all'
                  ? 'bg-transparent border border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs'
                  : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => handleTypeChange('udara')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeType === 'udara'
                  ? 'bg-amber-500/15 border border-amber-500 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              }`}
            >
              <Plane className="w-3.5 h-3.5" /> Udara
            </button>
            <button
              onClick={() => handleTypeChange('laut')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeType === 'laut'
                  ? 'bg-emerald-500/15 border border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              }`}
            >
              <Ship className="w-3.5 h-3.5" /> Laut
            </button>
          </div>

          <div className="h-5 w-px bg-[var(--color-border)] hidden sm:block" />

          {/* PIC pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--color-secondary)] uppercase tracking-wide">
              <Users className="w-3 h-3" /> PIC
            </span>
            {picOptions.map((opt) => {
              const isActive = activePic === opt.key
              const badge    = PIC_BADGES[opt.key]
              return (
                <button
                  key={opt.key}
                  onClick={() => handlePicChange(opt.key)}
                  className={`px-3 py-1 text-[11px] font-semibold rounded-full transition-all cursor-pointer border ${
                    isActive && badge
                      ? 'border-transparent shadow-xs'
                      : isActive
                      ? 'bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs'
                      : 'bg-[var(--color-surface)] text-[var(--color-secondary)] border-[var(--color-border)] hover:bg-[var(--color-neutral)]'
                  }`}
                  style={isActive && badge ? { background: badge.bg, color: badge.text } : {}}
                >
                  {opt.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Row 2 — Group filter cards + Search + Export */}
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">

          {/* Group filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--color-secondary)] uppercase tracking-wide">
              <Layers className="w-3 h-3" /> Kategori
            </span>
            {GROUP_OPTIONS.map((opt) => {
              const isActive = activeGroup === opt.key
              const count    = groupCounts[opt.key]
              return (
                <button
                  key={opt.key}
                  onClick={() => setActiveGroup(opt.key)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                    isActive
                      ? opt.activeClass || 'bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs'
                      : 'bg-[var(--color-surface)] text-[var(--color-secondary)] border-[var(--color-border)] hover:bg-[var(--color-neutral)] hover:text-[var(--color-primary)]'
                  }`}
                >
                  {opt.key === 'aging' && <Clock className="w-3 h-3" />}
                  {opt.name}
                  <span className={`ml-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border ${
                    isActive
                      ? 'border-current bg-current/10 text-current'
                      : 'border-[var(--color-border)] bg-[var(--color-neutral)] text-[var(--color-secondary)]'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Search + Export */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-secondary)]" />
              <input
                type="text"
                placeholder="Cari customer, marking, komoditi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-tertiary)]/20 focus:border-[var(--color-tertiary)] text-[var(--color-primary)] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              onClick={handleExportExcel}
              disabled={filteredList.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Excel</span>
              <span className="sm:hidden">Export</span>
            </button>
          </div>
        </div>

        {/* Active filters summary bar */}
        {(activeType !== 'all' || activePic !== 'all' || activeGroup !== 'all' || searchQuery) && (
          <div className="px-4 py-2 border-t border-[var(--color-border)] bg-[var(--color-neutral)]/40 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-semibold text-[var(--color-tertiary)] uppercase tracking-wide">Filter aktif:</span>
            {activeType !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-transparent border border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px] font-semibold rounded-full">
                {activeType === 'udara' ? <Plane className="w-2.5 h-2.5" /> : <Ship className="w-2.5 h-2.5" />}
                {activeType}
              </span>
            )}
            {activePic !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-transparent border border-[var(--color-border)] text-[var(--color-secondary)] text-[10px] font-semibold rounded-full capitalize">
                PIC: {activePic}
              </span>
            )}
            {activeGroup !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-transparent border border-purple-500/40 text-purple-600 dark:text-purple-400 text-[10px] font-semibold rounded-full">
                {activeGroupOpt?.name}
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-transparent border border-[var(--color-border)] text-[var(--color-primary)] text-[10px] font-semibold rounded-full">
                &ldquo;{searchQuery}&rdquo;
              </span>
            )}
            <button
              onClick={() => { setActiveType('all'); setActivePic('all'); setActiveGroup('all'); setSearchQuery(''); setSearchParams({}) }}
              className="ml-auto text-[10px] font-semibold text-[var(--color-tertiary)] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <X className="w-2.5 h-2.5" /> Reset semua
            </button>
          </div>
        )}
      </div>

      {/* ── TABLE CARD ───────────────────────────────────────── */}
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-xs border border-[var(--color-border)] overflow-hidden">

        {/* Table header info */}
        <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[var(--color-primary)] font-[var(--font-display)]">
              {filteredList.length} item
            </span>
            <span className="text-xs text-[var(--color-secondary)] ml-1.5">
              {activeGroup !== 'all' ? `· ${activeGroupOpt?.name}` : '· semua kategori'}
              {activePic !== 'all' ? ` · PIC ${activePic}` : ''}
            </span>
          </div>
          <span className="text-[10px] text-[var(--color-secondary)]">
            {formatDateTime(new Date().toISOString())}
          </span>
        </div>

        {filteredList.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center gap-3 text-center px-8">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-neutral)] flex items-center justify-center">
              <Download className="w-6 h-6 text-[var(--color-secondary)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-primary)]">Tidak ada data</p>
              <p className="text-xs text-[var(--color-secondary)] mt-0.5">Coba sesuaikan filter atau ubah pencarian</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-xs">
              <thead
                className="sticky top-0 z-10 text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)] bg-[var(--color-neutral)] font-[var(--font-display)]"
              >
                <tr>
                  <th className="px-4 py-3 w-[72px] border-b border-[var(--color-border)]">Aging</th>
                  <th className="px-4 py-3 border-b border-[var(--color-border)]">PIC</th>
                  <th className="px-4 py-3 border-b border-[var(--color-border)]">Customer & Status</th>
                  <th className="px-4 py-3 border-b border-[var(--color-border)]">Cabang & Sales</th>
                  <th className="px-4 py-3 border-b border-[var(--color-border)]">Marking & Kargo</th>
                  <th className="px-4 py-3 border-b border-[var(--color-border)]">Komoditi</th>
                  <th className="px-4 py-3 border-b border-[var(--color-border)]">Type</th>
                  <th className="px-4 py-3 text-right border-b border-[var(--color-border)]">Harga</th>
                  <th className="px-4 py-3 border-b border-[var(--color-border)]">Status Kirim</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item, idx) => {
                  const badge = PIC_BADGES[item.pic] || { label: item.pic, bg: '#4B5563', text: '#fff' }
                  const isEven = idx % 2 === 0
                  return (
                    <tr
                      key={idx}
                      className={cn(
                        "group transition-colors hover:bg-[var(--color-neutral)]/40",
                        isEven ? "bg-[var(--color-surface)]" : "bg-[var(--color-neutral)]/20"
                      )}
                    >
                      {/* Aging */}
                      <td className="px-4 py-3 border-b border-[var(--color-border)] whitespace-nowrap">
                        <AgingBadge hari={item.hari} />
                      </td>

                      {/* PIC */}
                      <td className="px-4 py-3 border-b border-[var(--color-border)] whitespace-nowrap">
                        <span
                          className="inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full"
                          style={{ background: badge.bg, color: badge.text }}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Customer & Status */}
                      <td className="px-4 py-3 border-b border-[var(--color-border)] max-w-[220px]" title={item.customer}>
                        <div className="font-semibold text-[var(--color-primary)] truncate leading-tight">{item.customer || '-'}</div>
                        <div className="mt-0.5">
                          <StatusBadge status={item.status} />
                        </div>
                      </td>

                      {/* Cabang & Sales */}
                      <td className="px-4 py-3 border-b border-[var(--color-border)] whitespace-nowrap">
                        <div className="font-medium text-[var(--color-primary)]">{item.branch || '-'}</div>
                        {item.sales && <div className="text-[10px] text-[var(--color-secondary)] mt-0.5">{item.sales}</div>}
                      </td>

                      {/* Marking & Kargo */}
                      <td className="px-4 py-3 border-b border-[var(--color-border)] whitespace-nowrap" title={`${item.markingCode} ${item.markingNo}`}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-[var(--color-primary)]">{item.markingCode || '-'}</span>
                          {item.isPartial && (
                            <button
                              type="button"
                              onClick={() => setPartialModalItem(item)}
                              className="inline-flex items-center cursor-pointer group/parsial"
                              title={`Klik untuk melihat ${item.countTerima || 1} data pengiriman parsial terkait di tbEntryList`}
                            >
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-md bg-transparent border border-purple-500/50 text-purple-600 dark:text-purple-400 group-hover/parsial:bg-purple-500/10 group-hover/parsial:border-purple-500 transition-colors shadow-2xs shrink-0"
                              >
                                PARSIAL
                              </span>
                            </button>
                          )}
                          {item.validasiMismatch && activeType !== 'udara' && (
                            <button
                              onClick={() => setMismatchItem(item)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-md bg-transparent border border-rose-500/50 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                              title="Klik untuk lihat detail mismatch"
                            >
                              <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                              Mismatch
                            </button>
                          )}
                        </div>
                        <div className="text-[10px] text-[var(--color-secondary)] mt-0.5">
                          {item.markingNo ? `${item.markingNo} · ` : ''}
                          <span className="font-bold text-[var(--color-primary)]">{item.jmlPack} {item.satuan}</span>
                        </div>
                        {(item.m3Gudang > 0 || item.m3List > 0 || item.berat > 0) && (
                          <div className="text-[10px] text-[var(--color-secondary)] mt-0.5">
                            {item.m3Gudang > 0 ? `M3 Gdg: ${item.m3Gudang}` : ''}
                            {item.m3List   > 0 ? ` (List: ${item.m3List})` : ''}
                            {item.berat    > 0 ? ` · ${formatDecimal(item.berat, 2)} kg` : ''}
                          </div>
                        )}
                      </td>

                      {/* Komoditi */}
                      <td className="px-4 py-3 border-b border-[var(--color-border)] max-w-[150px] truncate text-[var(--color-secondary)]" title={item.comodity}>
                        {item.comodity || '-'}
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3 border-b border-[var(--color-border)] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {item.type ? (
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-transparent border border-[var(--color-border)] text-[var(--color-secondary)]">
                              {item.type}
                            </span>
                          ) : (
                            <span className="text-[var(--color-secondary)]">-</span>
                          )}
                          {Number(item.taxReturn) === 1 && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider uppercase rounded bg-indigo-600 text-white shadow-2xs cursor-help shrink-0"
                              title="Tax Return"
                            >
                              TAX
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Harga */}
                      <td className="px-4 py-3 border-b border-[var(--color-border)] text-right whitespace-nowrap">
                        <div className="flex flex-col items-end gap-1">
                          {item.priceStatus === 'MATCH' ? (
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setPriceCheckItem(item)}
                                className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                                title="Klik untuk cek detail tarif database"
                              >
                                {formatCurrency(item.harga)}
                              </button>
                              <button
                                type="button"
                                onClick={() => setPriceCheckItem(item)}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-transparent border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                                title="Harga sesuai database. Klik untuk cek rincian tarif."
                              >
                                <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                                Sesuai
                              </button>
                            </div>
                          ) : item.priceStatus === 'DIFFERENT' ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => setPriceCheckItem(item)}
                                  className="font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                                  title="Klik untuk cek rincian perbandingan harga"
                                >
                                  {formatCurrency(item.harga)}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPriceCheckItem(item)}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-transparent border border-rose-500/50 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  title={`Terdapat selisih dengan database (DB: ${formatCurrency(item.hargaDb || 0)}). Klik untuk cek rincian.`}
                                >
                                  <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                  Beda DB
                                </button>
                              </div>
                              {item.hargaDb && item.hargaDb > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setPriceCheckItem(item)}
                                  className="text-[9px] text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
                                >
                                  DB: {formatCurrency(item.hargaDb)}
                                </button>
                              )}
                            </div>
                          ) : item.priceStatus === 'NOT_SET' ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <button
                                type="button"
                                onClick={() => setPriceCheckItem(item)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-transparent border border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 transition-colors cursor-pointer shadow-2xs"
                                title={`Tarif tersedia di DB (${formatCurrency(item.hargaDb || 0)}). Klik untuk cek rincian.`}
                              >
                                <Info className="w-3 h-3 text-purple-500 shrink-0" />
                                Ada di DB ({formatCurrency(item.hargaDb || 0)})
                              </button>
                            </div>
                          ) : item.harga > 0 ? (
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setPriceCheckItem(item)}
                                className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                                title="Klik untuk cek detail tarif database"
                              >
                                {formatCurrency(item.harga)}
                              </button>
                              <button
                                type="button"
                                onClick={() => setPriceCheckItem(item)}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-transparent border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer"
                                title="Klik untuk cek tarif database"
                              >
                                <Tag className="w-2.5 h-2.5 shrink-0" />
                                Cek DB
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPriceCheckItem(item)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-transparent border border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer shadow-2xs"
                              title="Belum ada harga. Klik untuk cek tarif customer di database."
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                              Belum Ada Harga
                            </button>
                          )}

                          {(item.updateBy || item.updateDate) && (
                            <div className="text-[9px] text-[var(--color-secondary)]">
                              {item.updateBy} {item.updateDate ? `· ${formatDateTime(item.updateDate)}` : ''}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status Kirim */}
                      <td className="px-4 py-3 border-b border-[var(--color-border)] whitespace-nowrap">
                        <StatusKirimBadge status={item.statusKirim} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
