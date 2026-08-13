import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Plane, Ship, Download, Users, Layers, Clock, X, FileSpreadsheet, AlertTriangle } from 'lucide-react'
import * as XLSX from 'xlsx'
import { billingApi } from '../services/billing.service'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useTranslation } from '@/hooks/useTranslation'
import { formatDateTime, formatCurrency, formatDecimal } from '@/lib/utils'
import { AgingBadge } from '../components/AgingBadge'
import { StatusBadge } from '../components/StatusBadge'
import { StatusKirimBadge } from '../components/StatusKirimBadge'

const PIC_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  thara: { label: 'Thara', bg: '#1A1C1E', text: '#fff' },
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

  const filteredList = useMemo(() => {
    let list = rawList

    if (activeGroup !== 'all') {
      list = list.filter((item: any) => {
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
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((item: any) =>
        item.customer?.toLowerCase().includes(q)    ||
        item.markingCode?.toLowerCase().includes(q) ||
        item.markingNo?.toLowerCase().includes(q)   ||
        item.status?.toLowerCase().includes(q)      ||
        item.comodity?.toLowerCase().includes(q)    ||
        item.branch?.toLowerCase().includes(q)      ||
        item.sales?.toLowerCase().includes(q)
      )
    }

    return list
  }, [rawList, searchQuery, activeGroup])

  const handleExportExcel = () => {
    if (!filteredList.length) return
    const exportData = filteredList.map((item: any) => ({
      'Aging (Hari)':   item.hari ?? 0,
      'PIC':            item.pic || '',
      'Customer':       item.customer || '',
      'Status Item':    item.status || '',
      'Cabang':         item.branch || '',
      'Sales':          item.sales || '',
      'Marking Code':   item.markingCode || '',
      'Marking No':     item.markingNo || '',
      'Komoditi':       item.comodity || '',
      'Type':           item.type || '',
      'Tax Return':     Number(item.taxReturn) === 1 ? 'Ya' : 'Tidak',
      'Jumlah Pack':    item.jmlPack ?? 0,
      'Satuan':         item.satuan || '',
      'M3 Gudang':      item.m3Gudang ?? 0,
      'M3 List':        item.m3List ?? 0,
      'Berat (kg)':     item.berat ?? 0,
      'Status Kirim':   item.statusKirim || '',
      'Harga':          item.harga ?? 0,
      'Diubah Oleh':    item.updateBy || '',
      'Tanggal Update': item.updateDate ? formatDateTime(item.updateDate) : '',
    }))
    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const keys = Object.keys(exportData[0] || {})
    worksheet['!cols'] = keys.map((k) => ({ wch: Math.max(k.length + 4, 12) }))
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, `Target Bill ${activeType.toUpperCase()}`)
    const dateStr  = new Date().toISOString().split('T')[0]
    XLSX.writeFile(workbook, `Target_Bill_${activeType.toUpperCase()}_${activePic}_${dateStr}.xlsx`)
  }

  if (isLoading && !resData) return <LoadingSpinner message={t('common.loadingBilling')} />

  const activeGroupOpt = GROUP_OPTIONS.find((g) => g.key === activeGroup)

  return (
    <div
      className="p-4 sm:p-6 w-full space-y-5 animate-fadeIn pb-24 min-h-screen"
      style={{ fontFamily: '"Public Sans", sans-serif', background: 'var(--color-neutral)' }}
    >
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
      <div className="bg-white rounded-2xl shadow-sm border border-[var(--color-border)] overflow-hidden">

        {/* Row 1 — Mode + PIC */}
        <div className="px-4 py-3 flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] bg-gray-50/60">

          {/* Mode toggle */}
          <div className="flex items-center gap-0.5 p-0.5 bg-[var(--color-neutral)] rounded-xl border border-[var(--color-border)] shrink-0">
            <button
              onClick={() => handleTypeChange('all')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeType === 'all'
                  ? 'bg-[#1A1C1E] text-white shadow-sm'
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
                      ? 'bg-[#1A1C1E] text-white border-transparent shadow-sm'
                      : 'bg-white text-[var(--color-secondary)] border-[var(--color-border)] hover:border-gray-400'
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
                        : 'bg-[#1A1C1E] text-white border-transparent shadow-sm'
                      : 'bg-white text-[var(--color-secondary)] border-[var(--color-border)] hover:border-gray-400 hover:text-[var(--color-primary)]'
                  }`}
                >
                  {opt.key === 'aging' && <Clock className="w-3 h-3" />}
                  {opt.name}
                  <span className={`ml-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                    isActive ? 'bg-white/25 text-current' : 'bg-gray-100 text-gray-600'
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
      <div className="bg-white rounded-2xl shadow-sm border border-[var(--color-border)] overflow-hidden">

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
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Download className="w-6 h-6 text-gray-400" />
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
                      className="group transition-colors hover:bg-blue-50/40"
                      style={{ background: isEven ? '#fff' : '#fafafa' }}
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
                        <div className="font-semibold text-gray-900 truncate leading-tight">{item.customer || '-'}</div>
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
                        <div className="font-semibold text-[var(--color-primary)]">{item.markingCode || '-'}</div>
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

                      {/* Harga */}
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
