import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Plane, Ship, Download, Users, Layers, Clock, X, FileSpreadsheet, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
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

const GROUP_OPTIONS = [
  { key: 'all',    name: 'Semua',        color: '' },
  { key: 'fcl',    name: 'FCL',          color: 'bg-violet-600 text-white' },
  { key: 'cod',    name: 'COD',          color: 'bg-rose-600 text-white' },
  { key: 'urgent', name: 'URGENT',       color: 'bg-orange-500 text-white' },
  { key: 'aging',  name: 'Aging > 7 Hari', color: 'bg-amber-600 text-white' },
]

type GroupKey = 'all' | 'fcl' | 'cod' | 'urgent' | 'aging'

export default function TargetPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()

  const typeParam   = searchParams.get('type')
  const initialType = (typeParam === 'laut' ? 'laut' : typeParam === 'udara' ? 'udara' : 'all') as 'all' | 'udara' | 'laut'
  const initialPic  = searchParams.get('pic') || 'all'

  const [activeType,  setActiveType]  = useState<'all' | 'udara' | 'laut'>(initialType)
  const [activePic,   setActivePic]   = useState<string>(initialPic)
  const [activeGroup, setActiveGroup] = useState<GroupKey>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [mismatchItem, setMismatchItem] = useState<any | null>(null)

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
      return res.data as { data: any[] }
    },
    staleTime: 30_000,
  })

  const rawList = resData?.data || []

  // Summary counts per group (always from rawList)
  const groupCounts = useMemo(() => {
    const counts: Record<GroupKey, number> = { all: rawList.length, fcl: 0, cod: 0, urgent: 0, aging: 0 }
    for (const item of rawList) {
      const typeStr     = String(item.type     || '').toUpperCase().trim()
      const comodityStr = String(item.comodity || '').toUpperCase().trim()
      const st          = String(item.status   || '').toUpperCase().trim()
      const hari        = Number(item.hari     || 0)
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
        String(item.pic         || '').toLowerCase().includes(q)
      )
    })
  }, [groupedList, searchQuery])

  // Export to Excel
  const handleExportExcel = () => {
    if (!filteredList.length) return
    const exportData = filteredList.map((item, idx) => ({
      'No':            idx + 1,
      'PIC':           item.pic         || '-',
      'Tipe':          item.type        || '-',
      'List No':       item.listNo      || '-',
      'Marking Code':  item.markingCode || '-',
      'Marking No':    item.markingNo   || '-',
      'Cabang':        item.branch      || '-',
      'Customer':      item.customer    || '-',
      'Komoditi':      item.comodity    || '-',
      'Qty (List)':    item.qty         ?? '-',
      'Qty (PL)':      item.qtyPL       ?? '-',
      'M3':            item.m3          ?? '-',
      'M3 PL':         item.m3PL        ?? '-',
      'M3 Real':       item.m3Real      ?? '-',
      'Harga M3':      item.hargaM3     ?? '-',
      'Total Biaya':   item.totalBiaya  ?? '-',
      'Status':        item.status      || '-',
      'Status Kirim':  item.statusKirim || '-',
      'Hari (Aging)':  item.hari        ?? '-',
      'Tgl Buat List': item.createdDate ? formatDateTime(item.createdDate) : '-',
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Target Billing')

    const typeLabel = activeType === 'all' ? 'Semua' : activeType === 'udara' ? 'Udara' : 'Laut'
    const picLabel  = activePic  === 'all' ? 'Semua-PIC' : activePic.toUpperCase()
    const fileName  = `Target-Billing-${typeLabel}-${picLabel}-${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // Modal mismatch komplain
  const MismatchModal = () => {
    if (!mismatchItem) return null
    const item = mismatchItem
    const m3K  = Number(item.m3Komplain || 0)
    const vfcK = Number(item.vfcKomplain ?? -1)
    const m3PL = Number(item.m3PL || 0)
    const m3R  = Number(item.m3Real || 0)

    const checks = m3K > 0
      ? [
          {
            label: 'M3 Komplain vs M3 Real',
            ok: Math.abs(m3K - m3R) < 0.0001,
            val1: formatDecimal(m3K, 4),
            val2: formatDecimal(m3R, 4),
          },
          {
            label: 'VFC Komplain vs M3 PL',
            ok: vfcK === 0 ? false : Math.abs(vfcK - m3PL) < 0.0001,
            val1: vfcK >= 0 ? formatDecimal(vfcK, 4) : 'N/A',
            val2: formatDecimal(m3PL, 4),
          },
        ]
      : [
          {
            label: 'M3 PL vs M3 Real',
            ok: Math.abs(m3PL - m3R) < 0.0001,
            val1: formatDecimal(m3PL, 4),
            val2: formatDecimal(m3R, 4),
          },
        ]

    return createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
        onClick={() => setMismatchItem(null)}
      >
        <div
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xl)] shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-neutral)]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[var(--color-danger)]" />
              <span className="text-sm font-bold text-[var(--color-danger)]">Detail Mismatch Komplain</span>
            </div>
            <button
              onClick={() => setMismatchItem(null)}
              className="p-1 rounded-[var(--radius-md)] hover:bg-[var(--color-surface)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Info baris */}
          <div className="px-5 py-3 bg-[var(--color-neutral)]/50 border-b border-[var(--color-border)]">
            <div className="text-xs font-semibold text-[var(--color-primary)]">{item.customer || '-'}</div>
            <div className="text-[10px] text-[var(--color-secondary)] mt-0.5">
              {item.markingCode} {item.markingNo ? `· ${item.markingNo}` : ''} · {item.branch}
            </div>
            <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--color-secondary)]">
              <span>M3 Komplain: <strong className="text-[var(--color-primary)]">{m3K}</strong></span>
              <span>VFC Komplain: <strong className="text-[var(--color-primary)]">{item.vfcKomplain ?? 0}</strong></span>
            </div>
          </div>

          {/* Tabel validasi */}
          <div className="px-5 py-4 space-y-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-secondary)] mb-1">
              {m3K > 0 ? 'Validasi (M3 Komplain > 0)' : 'Validasi (M3 Komplain = 0)'}
            </p>
            {checks.map((c, i) => (
              <div
                key={i}
                className={`flex items-center justify-between rounded-[var(--radius-lg)] px-4 py-2.5 text-xs border ${
                  c.ok
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-rose-500/10 border-rose-500/30'
                }`}
              >
                <span className={`font-medium ${c.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{c.label}</span>
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[11px] ${c.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400 font-bold'}`}>
                    {c.val1}
                  </span>
                  <span className="text-[var(--color-secondary)] text-[10px]">vs</span>
                  <span className={`font-mono text-[11px] ${c.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400 font-bold'}`}>
                    {c.val2}
                  </span>
                  {c.ok
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    : <XCircle      className="w-4 h-4 text-rose-500 shrink-0" />
                  }
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 pb-4">
            <button
              onClick={() => setMismatchItem(null)}
              className="w-full py-2 text-xs font-semibold rounded-[var(--radius-md)] bg-[var(--color-neutral)] hover:bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary)] transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  if (isLoading && !resData) return <LoadingSpinner message={t('common.loadingBilling')} />

  const activeGroupOpt = GROUP_OPTIONS.find((g) => g.key === activeGroup)

  return (
    <div
      className="p-4 sm:p-6 w-full space-y-5 animate-fadeIn pb-24 min-h-screen bg-[var(--color-neutral)] font-[var(--font-body)]"
    >
      <MismatchModal />
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
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] overflow-hidden">

        {/* Row 1 — Mode + PIC */}
        <div className="px-4 py-3 flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/50">

          {/* Mode toggle */}
          <div className="flex items-center gap-0.5 p-0.5 bg-[var(--color-neutral)] rounded-xl border border-[var(--color-border)] shrink-0">
            <button
              onClick={() => handleTypeChange('all')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeType === 'all'
                  ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-sm'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => handleTypeChange('udara')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeType === 'udara'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              }`}
            >
              <Plane className="w-3.5 h-3.5" /> Udara
            </button>
            <button
              onClick={() => handleTypeChange('laut')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeType === 'laut'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
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
                      ? 'border-transparent shadow-sm'
                      : isActive
                      ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] border-transparent shadow-sm'
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

          {/* Group filter — card style with count badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--color-secondary)] uppercase tracking-wide">
              <Layers className="w-3 h-3" /> Kategori
            </span>
            {GROUP_OPTIONS.map((opt) => {
              const isActive = activeGroup === opt.key
              const count    = groupCounts[opt.key as GroupKey]
              return (
                <button
                  key={opt.key}
                  onClick={() => setActiveGroup(opt.key as GroupKey)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                    isActive
                      ? opt.color
                        ? `${opt.color} border-transparent shadow-sm`
                        : 'bg-[var(--color-primary)] text-[var(--color-on-primary)] border-transparent shadow-sm'
                      : 'bg-[var(--color-surface)] text-[var(--color-secondary)] border-[var(--color-border)] hover:bg-[var(--color-neutral)] hover:text-[var(--color-primary)]'
                  }`}
                >
                  {opt.key === 'aging' && <Clock className="w-3 h-3" />}
                  {opt.name}
                  <span className={`ml-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                    isActive ? 'bg-white/25 text-current' : 'bg-[var(--color-neutral)] text-[var(--color-secondary)]'
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari customer, marking, komoditi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              onClick={handleExportExcel}
              disabled={filteredList.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-sm shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Excel</span>
              <span className="sm:hidden">Export</span>
            </button>
          </div>
        </div>

        {/* Active filters summary bar */}
        {(activeType !== 'all' || activePic !== 'all' || activeGroup !== 'all' || searchQuery) && (
          <div className="px-4 py-2 border-t border-[var(--color-border)] bg-blue-50/50 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">Filter aktif:</span>
            {activeType !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-semibold rounded-full">
                {activeType === 'udara' ? <Plane className="w-2.5 h-2.5" /> : <Ship className="w-2.5 h-2.5" />}
                {activeType}
              </span>
            )}
            {activePic !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-full capitalize">
                PIC: {activePic}
              </span>
            )}
            {activeGroup !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-semibold rounded-full">
                {activeGroupOpt?.name}
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-semibold rounded-full">
                &ldquo;{searchQuery}&rdquo;
              </span>
            )}
            <button
              onClick={() => { setActiveType('all'); setActivePic('all'); setActiveGroup('all'); setSearchQuery(''); setSearchParams({}) }}
              className="ml-auto text-[10px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
            >
              <X className="w-2.5 h-2.5" /> Reset semua
            </button>
          </div>
        )}
      </div>

      {/* ── TABLE CARD ───────────────────────────────────────── */}
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] overflow-hidden">

        {/* Table header info */}
        <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[var(--color-primary)]" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
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
                className="sticky top-0 z-10 text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)]"
                style={{ fontFamily: '"Space Grotesk", sans-serif', background: 'var(--color-neutral)' }}
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
                {filteredList.map((item: any, idx: number) => {
                  const badge = PIC_BADGES[item.pic] || { label: item.pic, bg: '#4B5563', text: '#fff' }
                  const isEven = idx % 2 === 0
                  return (
                    <tr
                      key={idx}
                      className={cn(
                        "group transition-colors hover:bg-[var(--color-neutral)]",
                        isEven ? "bg-[var(--color-surface)]" : "bg-[var(--color-neutral)]/40"
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
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[var(--color-primary)]">{item.markingCode || '-'}</span>
                          {item.validasiMismatch && activeType !== 'udara' && (
                            <button
                              onClick={() => setMismatchItem(item)}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-full bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 transition-colors cursor-pointer shrink-0"
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
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-gray-100 text-gray-600">
                              {item.type}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
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


                      <td className="px-4 py-3 border-b border-[var(--color-border)] text-right whitespace-nowrap">
                        {item.harga > 0 ? (
                          <div className="font-bold text-emerald-700">
                            {formatCurrency(item.harga)}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                            Belum Ada Harga
                          </span>
                        )}
                        {(item.updateBy || item.updateDate) && (
                          <div className="text-[9px] text-[var(--color-secondary)] mt-0.5">
                            {item.updateBy} {item.updateDate ? `· ${formatDateTime(item.updateDate)}` : ''}
                          </div>
                        )}
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
