import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Plane, Ship, Download, Users, Layers, Clock, X, FileSpreadsheet, AlertTriangle, CheckCircle2, Tag, Info, Sparkles, TrendingUp, Copy, Check } from 'lucide-react'
import * as XLSX from 'xlsx'
import { billingApi } from '../services/billing.service'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { useTranslation } from '@/hooks/useTranslation'
import { formatDateTime, formatCurrency, formatDecimal, cn, copyToClipboard } from '@/lib/utils'
import { useToastStore } from '@/stores/toastStore'
import { AgingBadge } from '../components/AgingBadge'
import { StatusBadge } from '../components/StatusBadge'
import { StatusKirimBadge } from '../components/StatusKirimBadge'
import { MismatchModal } from '../components/MismatchModal'
import { PartialDetailModal } from '../components/PartialDetailModal'
import { TargetPriceCheckModal } from '../components/TargetPriceCheckModal'
import { CustomerHargaModal } from '../components/CustomerHargaModal'
import { BrokerBadge } from '@/features/customers/components/CustomerBadges'
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
  { key: 'sj_sent', name: 'SJ Terkirim',    borderAccent: 'border-blue-500/40 text-blue-600 dark:text-blue-400',     activeClass: 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-500/10' },
  { key: 'partial', name: 'PARSIAL',        borderAccent: 'border-purple-500/40 text-purple-600 dark:text-purple-400', activeClass: 'border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-500/10' },
  { key: 'fcl',     name: 'FCL',            borderAccent: 'border-indigo-500/40 text-indigo-600 dark:text-indigo-400', activeClass: 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10' },
  { key: 'cod',     name: 'COD',            borderAccent: 'border-rose-500/40 text-rose-600 dark:text-rose-400',     activeClass: 'border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-500/10' },
  { key: 'urgent',  name: 'URGENT',         borderAccent: 'border-orange-500/40 text-orange-600 dark:text-orange-400', activeClass: 'border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-500/10' },
  { key: 'aging',   name: 'Aging > 7 Hari', borderAccent: 'border-amber-500/40 text-amber-600 dark:text-amber-400',   activeClass: 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10' },
  { key: 'no_type', name: 'Belum Set Tipe', borderAccent: 'border-amber-500/40 text-amber-600 dark:text-amber-400',   activeClass: 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10' },
]

export function isFclTargetItem(item: { type?: string; comodity?: string; markingCode?: string }): boolean {
  const typeStr     = String(item.type     || '').toUpperCase().trim()
  const comodityStr = String(item.comodity || '').toUpperCase().trim()
  const markingStr  = String(item.markingCode || '').toUpperCase().trim()
  return (
    typeStr.includes('FCL') ||
    typeStr.includes('KONTAINER') ||
    comodityStr.includes('FCL') ||
    markingStr.startsWith('26FCL') ||
    markingStr.includes('FCL-') ||
    markingStr.includes('FCL')
  )
}

export function isNoTypeTargetItem(typeText?: string): boolean {
  const trimmed = String(typeText || '').toUpperCase().trim()
  return !trimmed || trimmed === '-' || trimmed === '0' || trimmed === 'NONE' || trimmed === 'N/A' || trimmed === 'NA' || trimmed === 'NULL'
}

function CategoryTypeBadge({ typeText }: { typeText?: string }) {
  const trimmed = (typeText || '').trim()
  if (isNoTypeTargetItem(trimmed)) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide rounded bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400">
        Belum Set Tipe
      </span>
    )
  }

  // Format digit/angka: jika teks adalah angka (contoh: "1", "2") atau berawalan angka (contoh: "1 (UMUM)", "2 - LARTAS")
  const numMatch = trimmed.match(/^(\d+)(.*)$/)
  if (numMatch) {
    const numPart = numMatch[1]
    const restPart = numMatch[2].trim()

    return (
      <div className="inline-flex items-center gap-1.5">
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-extrabold shadow-2xs shrink-0 transition-colors bg-[var(--color-tertiary)] text-white dark:bg-[var(--color-surface)] dark:border dark:border-[var(--color-tertiary)] dark:text-[var(--color-tertiary)]"
          title={`Kategori ${trimmed}`}
        >
          {numPart}
        </span>
        {restPart && (
          <span className="text-[10px] font-medium text-[var(--color-secondary)] truncate max-w-[120px]">
            {restPart.replace(/^[-–—:]\s*/, '')}
          </span>
        )}
      </div>
    )
  }

  // Format teks non-angka biasa (contoh: "UMUM", "GARMENT", "LEGAL", "GENERAL")
  return (
    <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-transparent border border-[var(--color-border)] text-[var(--color-secondary)]">
      {trimmed}
    </span>
  )
}

function normalizeSearchText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function matchTargetSearch(item: TargetBillingItem, rawQuery: string): boolean {
  if (!rawQuery.trim()) return true
  const qClean = normalizeSearchText(rawQuery)
  const qRaw = rawQuery.toLowerCase().trim()
  const qTokens = qClean.split(' ').filter(Boolean)

  // 1. Raw exact substring check for identifiers (custCode, markingCode, markingNo, listNo/listCode)
  const custCode = (item.custCode || '').toLowerCase().trim()
  const markingCode = (item.markingCode || '').toLowerCase().trim()
  const markingNo = (item.markingNo || '').toLowerCase().trim()
  const listNo = (item.listNo || item.listCode || '').toLowerCase().trim()

  if (
    (custCode && custCode.includes(qRaw)) ||
    (markingCode && markingCode.includes(qRaw)) ||
    (markingNo && markingNo.includes(qRaw)) ||
    (listNo && listNo.includes(qRaw))
  ) {
    return true
  }

  // 2. Expand common abbreviation synonyms in query tokens (e.g. tk <-> toko, pt, mr, dll)
  const expandedTokens = qTokens.map((tok) => {
    if (tok === 'tk') return ['tk', 'toko']
    if (tok === 'toko') return ['toko', 'tk']
    return [tok]
  })

  // 3. Normalized comprehensive text pool
  const pool = normalizeSearchText(
    [
      item.customer,
      item.custCode,
      item.billTo,
      item.consignee,
      item.markingCode,
      item.markingNo,
      item.listNo,
      item.listCode,
      item.branch,
      item.sales,
      item.comodity,
      item.type,
      item.pic,
    ]
      .filter(Boolean)
      .join(' ')
  )

  // Every token (or its expanded synonym) must match in the pool
  const allTokensMatch = expandedTokens.every((tokenVariants) =>
    tokenVariants.some((variant) => pool.includes(variant))
  )
  if (allTokensMatch) return true

  // 4. Special check: if user searches for company / individual name (e.g. "PT BINTANG TIMUR" or "MR KEVIN")
  // Check against customer normalized string
  const custNormalized = normalizeSearchText(item.customer || '')
  if (
    custNormalized &&
    expandedTokens.every((variants) => variants.some((v) => custNormalized.includes(v)))
  ) {
    return true
  }

  if (item.isPartial && (qRaw === 'parsial' || qRaw === 'partial')) {
    return true
  }

  if (isFclTargetItem(item) && (qRaw === 'fcl' || qRaw === 'kontainer' || qRaw === 'container')) {
    return true
  }

  return false
}

function computeTargetSearchScore(item: TargetBillingItem, rawQuery: string): number {
  if (!rawQuery.trim()) return 0
  const qClean = normalizeSearchText(rawQuery)
  const qRaw = rawQuery.toLowerCase().trim()
  const custName = (item.customer || '').toLowerCase().trim()
  const custClean = normalizeSearchText(item.customer || '')
  const billTo = (item.billTo || '').toLowerCase().trim()
  const markingCode = (item.markingCode || '').toLowerCase().trim()
  const markingNo = (item.markingNo || '').toLowerCase().trim()
  const custCode = (item.custCode || '').toLowerCase().trim()

  // 1. Exact match customer / billTo / custCode -> highest priority
  if (custName === qRaw || custClean === qClean || custCode === qRaw) return 100
  if (billTo === qRaw) return 95

  // 2. Starts with customer / billTo
  if (custName.startsWith(qRaw) || custClean.startsWith(qClean)) return 80
  if (billTo.startsWith(qRaw)) return 75

  // 3. Exact match markingCode / markingNo
  if (markingCode === qRaw || markingNo === qRaw) return 70

  // 4. Customer contains query
  if (custName.includes(qRaw) || custClean.includes(qClean)) return 60
  if (billTo.includes(qRaw)) return 55

  // 5. Marking contains query
  if (markingCode.includes(qRaw) || markingNo.includes(qRaw)) return 40

  // 6. Generic token match
  return 20
}

function TargetTableSkeleton() {
  return (
    <>
      {/* Mobile skeleton */}
      <div className="sm:hidden divide-y divide-[var(--color-border)]">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="p-3.5 flex flex-col gap-2.5 bg-[var(--color-surface)]">
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-14 h-5 rounded-full skeleton-shimmer" />
                <div className="w-14 h-5 rounded-full skeleton-shimmer" />
                <div className="w-16 h-5 rounded skeleton-shimmer" />
              </div>
              <div className="w-16 h-5 rounded skeleton-shimmer" />
            </div>
            <div className="space-y-1">
              <div className="h-4 w-40 rounded-md skeleton-shimmer" />
              <div className="h-3 w-28 rounded skeleton-shimmer" />
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--color-neutral)] border border-[var(--color-border)] space-y-2">
              <div className="flex justify-between items-center">
                <div className="h-3.5 w-24 rounded skeleton-shimmer" />
                <div className="h-4 w-16 rounded skeleton-shimmer" />
              </div>
              <div className="h-3 w-48 rounded skeleton-shimmer" />
              <div className="h-3 w-32 rounded skeleton-shimmer" />
            </div>
            <div className="flex justify-between items-center pt-1">
              <div className="h-3 w-20 rounded skeleton-shimmer" />
              <div className="h-6 w-24 rounded-lg skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop skeleton */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full min-w-[1200px] text-left text-xs">
          <thead className="sticky top-0 z-10 text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)] bg-[var(--color-neutral)] font-[var(--font-display)]">
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
              <th className="px-3 py-3 border-b border-[var(--color-border)] text-center w-14">Salin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {Array.from({ length: 8 }).map((_, idx) => (
              <tr key={idx} className="border-b border-[var(--color-border)]">
                <td className="px-4 py-3.5"><div className="h-4 w-12 rounded skeleton-shimmer" /></td>
                <td className="px-4 py-3.5"><div className="h-4 w-14 rounded-full skeleton-shimmer" /></td>
                <td className="px-4 py-3.5">
                  <div className="space-y-1">
                    <div className="h-4 w-36 rounded-md skeleton-shimmer" />
                    <div className="h-3 w-16 rounded skeleton-shimmer" />
                  </div>
                </td>
                <td className="px-4 py-3.5"><div className="h-4 w-20 rounded skeleton-shimmer" /></td>
                <td className="px-4 py-3.5"><div className="h-4 w-28 rounded skeleton-shimmer" /></td>
                <td className="px-4 py-3.5"><div className="h-4 w-32 rounded skeleton-shimmer" /></td>
                <td className="px-4 py-3.5"><div className="h-4 w-14 rounded skeleton-shimmer" /></td>
                <td className="px-4 py-3.5 text-right"><div className="h-6 w-24 rounded-lg skeleton-shimmer ml-auto" /></td>
                <td className="px-4 py-3.5"><div className="h-4 w-20 rounded skeleton-shimmer" /></td>
                <td className="px-3 py-3.5 text-center"><div className="h-6 w-6 rounded-lg skeleton-shimmer mx-auto" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default function TargetPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()

  const typeParam   = searchParams.get('type')
  const initialType = (typeParam === 'laut' ? 'laut' : typeParam === 'udara' ? 'udara' : 'all') as 'all' | 'udara' | 'laut'
  const initialPic  = searchParams.get('pic') || 'all'
  const groupParam  = searchParams.get('group') as GroupKey | null
  const validGroups: GroupKey[] = ['all', 'sj_sent', 'partial', 'fcl', 'cod', 'urgent', 'aging', 'no_type']
  const initialSearch = searchParams.get('search') || searchParams.get('q') || ''
  const initialGroup = groupParam && validGroups.includes(groupParam) ? groupParam : 'all'

  const [activeType,       setActiveType]       = useState<'all' | 'udara' | 'laut'>(initialType)
  const [activePic,        setActivePic]        = useState<string>(initialPic)
  const [activeGroup,      setActiveGroup]      = useState<GroupKey>(initialGroup)
  const [searchQuery,      setSearchQuery]      = useState(initialSearch)
  const [mismatchItem,     setMismatchItem]     = useState<TargetBillingItem | null>(null)
  const [partialModalItem, setPartialModalItem] = useState<TargetBillingItem | null>(null)
  const [priceCheckItem,   setPriceCheckItem]   = useState<TargetBillingItem | null>(null)
  const [selectedCustForHarga, setSelectedCustForHarga] = useState<{ code: string; name?: string } | null>(null)
  const [copiedKey,        setCopiedKey]        = useState<string | null>(null)

  const { addToast } = useToastStore()

  // Reaktif terhadap perubahan URL searchParams (deep link / navigasi internal / klik dari dashboard)
  useEffect(() => {
    const typeP  = searchParams.get('type')
    const picP   = searchParams.get('pic') || 'all'
    const groupP = searchParams.get('group') as GroupKey | null
    const qP     = searchParams.get('search') || searchParams.get('q') || ''

    if (typeP === 'laut' || typeP === 'udara' || typeP === 'all') {
      setActiveType((cur) => (cur !== typeP ? typeP : cur))
    }
    setActivePic((cur) => (cur !== picP ? picP : cur))
    if (groupP && validGroups.includes(groupP)) {
      setActiveGroup((cur) => (cur !== groupP ? groupP : cur))
    } else if (!groupP) {
      setActiveGroup((cur) => (cur !== 'all' ? 'all' : cur))
    }
    setSearchQuery((cur) => (cur !== qP ? qP : cur))
  }, [searchParams])

  // Sync search query ke URL query param (debounced)
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchParams((prev) => {
        const currentParam = prev.get('search') || prev.get('q') || ''
        const trimmed = searchQuery.trim()
        if (trimmed) {
          if (currentParam === trimmed) return prev
          const next = new URLSearchParams(prev)
          next.set('search', trimmed)
          return next
        } else if (currentParam) {
          const next = new URLSearchParams(prev)
          next.delete('search')
          next.delete('q')
          return next
        }
        return prev
      })
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery, setSearchParams])

  const handleCopyTargetItem = async (item: TargetBillingItem) => {
    const markingFull = [item.markingCode, item.markingNo ? `#${item.markingNo.trim()}` : ''].filter(Boolean).join(' ')
    const packStr = `${item.jmlPack || 0} ${item.satuan || 'COLY'}`
    const beratStr = item.berat > 0 ? `${formatDecimal(item.berat, 2)} kg` : '-'

    const textToCopy = [
      `Customer : ${item.customer || '-'}`,
      `Cabang   : ${item.branch || '-'}`,
      `Marking  : ${markingFull || '-'}`,
      `Komoditi : ${item.comodity || '-'}`,
      `Jml Pack : ${packStr}`,
      `Berat    : ${beratStr}`,
      `Tipe     : ${item.type || '-'}`,
    ].join('\n')

    const success = await copyToClipboard(textToCopy)
    const key = item.listCode || item.listNo || `${item.markingCode}`

    if (success) {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
      addToast({
        type: 'success',
        message: `Data kargo ${item.customer || item.markingCode} berhasil disalin`,
      })
    } else {
      addToast({
        type: 'error',
        message: 'Gagal menyalin data kargo ke clipboard',
      })
    }
  }

  const picOptions = useMemo(() => PIC_OPTIONS_BY_TYPE[activeType] || [], [activeType])

  const handleTypeChange = (type: 'all' | 'udara' | 'laut') => {
    setActiveType(type)
    const validKeys = PIC_OPTIONS_BY_TYPE[type].map((o) => o.key)
    const nextPic   = validKeys.includes(activePic) ? activePic : 'all'
    setActivePic(nextPic)
    let nextGroup = activeGroup
    if (type === 'udara' && activeGroup === 'fcl') {
      nextGroup = 'all'
      setActiveGroup('all')
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      type === 'all' ? next.delete('type') : next.set('type', type)
      nextPic === 'all' ? next.delete('pic') : next.set('pic', nextPic)
      if (nextGroup !== activeGroup) {
        nextGroup === 'all' ? next.delete('group') : next.set('group', nextGroup)
      }
      return next
    })
  }

  const handlePicChange = (pic: string) => {
    setActivePic(pic)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      pic === 'all' ? next.delete('pic') : next.set('pic', pic)
      return next
    })
  }

  const handleGroupChange = (group: GroupKey) => {
    setActiveGroup(group)
    let nextType = activeType
    let nextPic = activePic

    // Jika filter FCL dipilih dan moda masih Udara, alihkan ke Laut (karena kargo FCL hanya ada di Laut)
    if (group === 'fcl' && activeType === 'udara') {
      nextType = 'laut'
      setActiveType('laut')
    }
    // Jika filter FCL dipilih dan PIC aktif bukan yang menangani FCL ('all' atau 'ferly'), reset PIC ke 'all'
    if (group === 'fcl' && activePic !== 'all' && activePic !== 'ferly') {
      nextPic = 'all'
      setActivePic('all')
    }

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      group === 'all' ? next.delete('group') : next.set('group', group)
      if (nextType !== activeType) {
        nextType === 'all' ? next.delete('type') : next.set('type', nextType)
      }
      if (nextPic !== activePic) {
        nextPic === 'all' ? next.delete('pic') : next.set('pic', nextPic)
      }
      return next
    })
  }

  const { data: resData, isLoading } = useQuery({
    queryKey: ['targetBillDetails', activeType],
    queryFn: async () => {
      const res = await billingApi.targetDetails({ type: activeType })
      return res.data
    },
    staleTime: 60_000,
  })

  const rawList: TargetBillingItem[] = useMemo(() => {
    if (!resData) return []
    const payload = (resData as any)?.data !== undefined ? (resData as any).data : resData
    let items: any[] = []
    if (Array.isArray(payload)) items = payload
    else if (Array.isArray(payload?.items)) items = payload.items
    else if (Array.isArray((resData as any)?.items)) items = (resData as any).items
    else return []

    return items.map((r: any) => ({
      ...r,
      hari: Number(r.hari ?? r.Hari ?? 0),
      pic: String(r.pic ?? r.Pic ?? '').trim(),
      customer: String(r.customer ?? r.Customer ?? '').trim(),
      custCode: String(r.custCode ?? r.CustCode ?? r.fdCustCode ?? '').trim(),
      billTo: String(r.billTo ?? r.BillTo ?? r.fdBillTo ?? '').trim(),
      consignee: String(r.consignee ?? r.Consignee ?? r.fdConsignee ?? '').trim(),
      branch: String(r.branch ?? r.Branch ?? '').trim(),
      sales: String(r.sales ?? r.Sales ?? '').trim(),
      markingCode: String(r.markingCode ?? r.Marking_code ?? r.marking_code ?? '').trim(),
      markingNo: String(r.markingNo ?? r.Marking_no ?? r.marking_no ?? '').trim(),
      status: String(r.status ?? r.Status ?? '').trim(),
      jmlPack: Number(r.jmlPack ?? r.Jml_pack ?? r.jml_pack ?? 0),
      satuan: String(r.satuan ?? r.Satuan ?? '').trim(),
      berat: Number(r.berat ?? r.Berat ?? 0),
      m3List: Number(r.m3List ?? r.M3_List ?? r.fdM3List ?? 0),
      m3Gudang: Number(r.m3Gudang ?? r.M3_Gudang ?? r.fdM3Gudang ?? 0),
      type: String(r.type ?? r.Type ?? '').trim(),
      taxReturn: Number(r.taxReturn ?? r.TaxReturn ?? 0),
      comodity: String(r.comodity ?? r.Comodity ?? '').trim(),
      tglAgen: r.tglAgen ?? r.Tgl_Agen ?? null,
      exitDate: r.exitDate ?? r.ExitDate ?? null,
      statusKirim: String(r.statusKirim ?? r.StatusKirim ?? '').trim(),
      isSjSent: Boolean(
        r.isSjSent ??
        (String(r.statusKirim ?? r.StatusKirim ?? '').toUpperCase().includes('TERKIRIM') ||
         String(r.statusKirim ?? r.StatusKirim ?? '').toUpperCase().includes('TERIMA SJ'))
      ),
      harga: Number(r.harga ?? r.Harga ?? 0),
      updateBy: String(r.updateBy ?? r.UpdateBy ?? '').trim(),
      updateDate: r.updateDate ?? r.UpdateDate ?? null,
      isPartial: Boolean(r.isPartial),
      countTerima: Number(r.countTerima || 0),
      priceStatus: r.priceStatus || 'NO_RATE',
      hargaDb: Number(r.hargaDb || 0),
      diffAmount: Number(r.diffAmount || 0),
      priceSourceType: r.priceSourceType || '',
      matchedTier: r.matchedTier || '',
      isBroker: Boolean(r.isBroker),
      isCommodityOverride: Boolean(r.isCommodityOverride),
      commodityOverrideDetail: r.commodityOverrideDetail || '',
      matchedCategory: r.matchedCategory || '',
      mode: r.mode || (/^26A|^A[A-Z]{2}|AGZ|ASH|AYW|ASZ|AHK|ASG|AIR/i.test(String(r.markingCode ?? r.Marking_code ?? '')) ? 'udara' : 'laut'),
    }))
  }, [resData])

  // Filtered by PIC in-memory for 0ms instant tab switching
  const picFilteredList = useMemo(() => {
    if (activePic === 'all') return rawList
    return rawList.filter((item) => item.pic.toLowerCase() === activePic.toLowerCase())
  }, [rawList, activePic])

  // Summary counts per group (from picFilteredList)
  const groupCounts = useMemo(() => {
    const counts: Record<GroupKey, number> = { all: picFilteredList.length, sj_sent: 0, partial: 0, fcl: 0, cod: 0, urgent: 0, aging: 0, no_type: 0 }
    for (const item of picFilteredList) {
      const st   = String(item.status || '').toUpperCase().trim()
      const hari = Number(item.hari || 0)
      if (item.isSjSent)                 counts.sj_sent++
      if (item.isPartial)                counts.partial++
      if (isFclTargetItem(item))         counts.fcl++
      if (st.includes('COD'))            counts.cod++
      if (st.includes('URGENT'))         counts.urgent++
      if (hari > 7)                      counts.aging++
      if (isNoTypeTargetItem(item.type)) counts.no_type++
    }
    return counts
  }, [picFilteredList])

  // Summary counts across all PICs for current active mode
  const rawGroupCounts = useMemo(() => {
    const counts: Record<GroupKey, number> = { all: rawList.length, sj_sent: 0, partial: 0, fcl: 0, cod: 0, urgent: 0, aging: 0, no_type: 0 }
    for (const item of rawList) {
      const st   = String(item.status || '').toUpperCase().trim()
      const hari = Number(item.hari || 0)
      if (item.isSjSent)                 counts.sj_sent++
      if (item.isPartial)                counts.partial++
      if (isFclTargetItem(item))         counts.fcl++
      if (st.includes('COD'))            counts.cod++
      if (st.includes('URGENT'))         counts.urgent++
      if (hari > 7)                      counts.aging++
      if (isNoTypeTargetItem(item.type)) counts.no_type++
    }
    return counts
  }, [rawList])

  // Filtered by group
  const groupedList = useMemo(() => {
    if (activeGroup === 'all') return picFilteredList
    return picFilteredList.filter((item) => {
      const st   = String(item.status || '').toUpperCase().trim()
      const hari = Number(item.hari || 0)
      if (activeGroup === 'sj_sent') return !!item.isSjSent
      if (activeGroup === 'partial') return !!item.isPartial
      if (activeGroup === 'fcl')     return isFclTargetItem(item)
      if (activeGroup === 'cod')     return st.includes('COD')
      if (activeGroup === 'urgent')  return st.includes('URGENT')
      if (activeGroup === 'aging')   return hari > 7
      if (activeGroup === 'no_type') return isNoTypeTargetItem(item.type)
      return true
    })
  }, [picFilteredList, activeGroup])

  // Total FCL items available across the entire loaded list
  const totalFclInRawList = useMemo(() => {
    return rawGroupCounts.fcl
  }, [rawGroupCounts.fcl])

  // Total matches across the entire activeType mode
  const totalSearchMatchesInMode = useMemo(() => {
    if (!searchQuery.trim()) return rawList.length
    return rawList.filter((it) => matchTargetSearch(it, searchQuery)).length
  }, [rawList, searchQuery])

  // Total matches within the active PIC across all categories
  const totalSearchMatchesInPic = useMemo(() => {
    if (!searchQuery.trim()) return picFilteredList.length
    return picFilteredList.filter((it) => matchTargetSearch(it, searchQuery)).length
  }, [picFilteredList, searchQuery])

  // Filtered by search query (client-side) using smart multi-token matcher + relevance sorting
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return groupedList
    const matched = groupedList.filter((item) => matchTargetSearch(item, searchQuery))
    return [...matched].sort((a, b) => {
      const scoreB = computeTargetSearchScore(b, searchQuery)
      const scoreA = computeTargetSearchScore(a, searchQuery)
      if (scoreB !== scoreA) return scoreB - scoreA
      return (Number(b.hari) || 0) - (Number(a.hari) || 0)
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
      'Parsial':            item.isPartial   ? `Parsial (${item.countTerima || 2} marking)` : 'Normal',
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

  const activeGroupOpt = GROUP_OPTIONS.find((g) => g.key === activeGroup)

  return (
    <div className="p-4 sm:p-6 w-full space-y-5 animate-fadeIn pb-24 min-h-screen bg-[var(--color-neutral)] font-[var(--font-body)]">
      <MismatchModal item={mismatchItem} onClose={() => setMismatchItem(null)} />
      <PartialDetailModal item={partialModalItem} onClose={() => setPartialModalItem(null)} />
      {priceCheckItem && (
        <TargetPriceCheckModal
          key={priceCheckItem.listCode || priceCheckItem.listNo || priceCheckItem.markingCode}
          item={priceCheckItem}
          activeMode={activeType}
          onClose={() => setPriceCheckItem(null)}
        />
      )}
      {selectedCustForHarga && (
        <CustomerHargaModal
          isOpen={Boolean(selectedCustForHarga)}
          onClose={() => setSelectedCustForHarga(null)}
          custCode={selectedCustForHarga.code}
          custName={selectedCustForHarga.name}
        />
      )}
      
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
        <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/50">

          {/* Mode toggle */}
          <div className="grid grid-cols-3 sm:flex items-center gap-1 p-1 bg-[var(--color-neutral)] rounded-xl border border-[var(--color-border)] shrink-0 w-full sm:w-auto">
            <button
              onClick={() => handleTypeChange('all')}
              className={`py-1.5 px-2 sm:px-3.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeType === 'all'
                  ? 'bg-[var(--color-surface)] sm:bg-transparent border border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-2xs font-bold'
                  : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => handleTypeChange('udara')}
              className={`py-1.5 px-2 sm:px-3.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeType === 'udara'
                  ? 'bg-amber-500/15 border border-amber-500 text-amber-600 dark:text-amber-400 shadow-2xs font-bold'
                  : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              }`}
            >
              <Plane className="w-3.5 h-3.5 shrink-0" /> Udara
            </button>
            <button
              onClick={() => handleTypeChange('laut')}
              className={`py-1.5 px-2 sm:px-3.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeType === 'laut'
                  ? 'bg-emerald-500/15 border border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                  : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              }`}
            >
              <Ship className="w-3.5 h-3.5 shrink-0" /> Laut
            </button>
          </div>

          <div className="h-5 w-px bg-[var(--color-border)] hidden sm:block" />

          {/* PIC pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--color-secondary)] uppercase tracking-wide shrink-0">
              <Users className="w-3 h-3" /> PIC
            </span>
            {picOptions.map((opt) => {
              const isActive = activePic === opt.key
              const badge    = PIC_BADGES[opt.key]
              return (
                <button
                  key={opt.key}
                  onClick={() => handlePicChange(opt.key)}
                  className={`px-3 py-1 text-[11px] font-semibold rounded-full transition-all cursor-pointer border shrink-0 ${
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
        <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">

          {/* Group filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--color-secondary)] uppercase tracking-wide shrink-0">
              <Layers className="w-3 h-3" /> Kategori
            </span>
            {GROUP_OPTIONS.map((opt) => {
              const isActive = activeGroup === opt.key
              const count    = groupCounts[opt.key]
              const isFclUdara = opt.key === 'fcl' && activeType === 'udara'
              return (
                <button
                  key={opt.key}
                  onClick={() => handleGroupChange(opt.key)}
                  title={isFclUdara ? 'Kargo FCL hanya tersedia di moda Laut (klik untuk otomatis beralih ke Laut)' : undefined}
                  className={`relative flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? opt.activeClass || 'bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs font-bold'
                      : isFclUdara
                      ? 'bg-[var(--color-surface)] text-[var(--color-secondary)]/60 border-[var(--color-border)] hover:bg-[var(--color-neutral)] hover:text-[var(--color-primary)]'
                      : 'bg-[var(--color-surface)] text-[var(--color-secondary)] border-[var(--color-border)] hover:bg-[var(--color-neutral)] hover:text-[var(--color-primary)]'
                  }`}
                >
                  {opt.key === 'aging' && <Clock className="w-3 h-3 shrink-0" />}
                  <span>{opt.name}</span>
                  <span className={`ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center inline-flex items-center justify-center transition-colors ${
                    isFclUdara && count === 0
                      ? 'bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)]'
                      : 'bg-[var(--color-tertiary)] text-white dark:bg-[var(--color-surface)] dark:text-[var(--color-tertiary)] dark:border dark:border-[var(--color-tertiary)] shadow-2xs'
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
              <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-secondary)]" />
              <input
                type="text"
                placeholder="Cari customer, kode, marking..."
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Excel</span>
              <span className="sm:hidden">Export</span>
            </button>
          </div>
        </div>

        {/* Active filters summary bar */}
        {(activeType !== 'all' || activePic !== 'all' || activeGroup !== 'all' || searchQuery) && (
          <div className="px-3.5 sm:px-4 py-2 border-t border-[var(--color-border)] bg-[var(--color-neutral)]/40 flex items-center gap-1.5 sm:gap-2 flex-wrap">
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
              onClick={() => {
                setSearchQuery('')
                setSearchParams({})
              }}
              className="ml-auto text-[10px] font-semibold text-[var(--color-tertiary)] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <X className="w-2.5 h-2.5" /> Reset semua
            </button>
          </div>
        )}
      </div>

      {/* ── TABLE / CARD CONTAINER ────────────────────────────── */}
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-xs border border-[var(--color-border)] overflow-hidden">

        {/* Table header info */}
        <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[var(--color-primary)] font-[var(--font-display)]">
              {filteredList.length} item
            </span>
            <span className="text-xs text-[var(--color-secondary)] ml-1.5">
              {activeGroup !== 'all' ? `· ${activeGroupOpt?.name}` : '· semua kategori'}
              {activePic !== 'all' ? ` · PIC ${activePic}` : ''}
              {searchQuery && ` · hasil pencarian "${searchQuery}"`}
            </span>
          </div>
          <span className="text-[10px] text-[var(--color-secondary)]">
            {formatDateTime(new Date().toISOString())}
          </span>
        </div>

        {/* Partial category context notification */}
        {activeGroup === 'partial' && filteredList.length > 0 && (
          <div className="px-4 py-2 border-b border-purple-500/20 bg-purple-500/5 flex items-center gap-2 text-xs animate-fadeIn">
            <Layers className="w-3.5 h-3.5 shrink-0 text-purple-500" />
            <span className="text-purple-700 dark:text-purple-300">
              <strong>Kategori Parsial:</strong> Menampilkan {filteredList.length} kargo dengan pengiriman parsial multi-marking (1 tanda terima agen berisi lebih dari 1 marking). Klik tombol <span className="font-bold underline text-purple-600 dark:text-purple-400">PARSIAL</span> untuk melihat rincian pengiriman terkait.
            </span>
          </div>
        )}

        {isLoading && !resData ? (
          <TargetTableSkeleton />
        ) : filteredList.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center gap-3 text-center px-8">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-neutral)] flex items-center justify-center">
              {searchQuery ? <Search className="w-6 h-6 text-[var(--color-secondary)]" /> : <Download className="w-6 h-6 text-[var(--color-secondary)]" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-primary)]">Tidak ada data</p>
              <p className="text-xs text-[var(--color-secondary)] mt-0.5 max-w-md">
                {searchQuery
                  ? `Tidak ada item yang cocok dengan "${searchQuery}" di filter aktif saat ini.`
                  : activeGroup === 'fcl' && activeType === 'udara'
                  ? 'Kargo FCL hanya tersedia pada moda Laut. Silakan beralih ke tab Laut atau Semua.'
                  : activeGroup === 'fcl' && activePic !== 'all' && totalFclInRawList > 0
                  ? `Kargo FCL ditangani oleh PIC Ferly. Tidak ada kargo FCL pada PIC ${activePic.toUpperCase()}.`
                  : activeGroup === 'fcl' && totalFclInRawList === 0
                  ? 'Saat ini seluruh kargo FCL sudah terbit invoice (tidak ada target penagihan FCL).'
                  : activeGroup === 'sj_sent' && activePic !== 'all' && rawGroupCounts.sj_sent > 0
                  ? `Tidak ada kargo Surat Jalan (SJ) terkirim pada PIC ${activePic.toUpperCase()}, tetapi tersedia di PIC lain.`
                  : activeGroup === 'sj_sent'
                  ? 'Tidak ada kargo dengan Surat Jalan (SJ) terkirim yang belum dibuatkan invoice.'
                  : activeGroup === 'partial' && activePic !== 'all' && rawGroupCounts.partial > 0
                  ? `Tidak ada kargo parsial pada PIC ${activePic.toUpperCase()}, tetapi tersedia di PIC lain.`
                  : activeGroup === 'partial'
                  ? 'Tidak ada kargo berstatus parsial yang menunggu pembuatan invoice.'
                  : activeGroup === 'cod' && activePic !== 'all' && rawGroupCounts.cod > 0
                  ? `Tidak ada kargo COD pada PIC ${activePic.toUpperCase()}, tetapi tersedia di PIC lain.`
                  : activeGroup === 'cod'
                  ? 'Tidak ada kargo dengan status COD yang belum dibuatkan invoice.'
                  : activeGroup === 'urgent' && activePic !== 'all' && rawGroupCounts.urgent > 0
                  ? `Tidak ada kargo URGENT pada PIC ${activePic.toUpperCase()}, tetapi tersedia di PIC lain.`
                  : activeGroup === 'urgent'
                  ? 'Tidak ada kargo dengan status URGENT yang belum dibuatkan invoice.'
                  : activeGroup === 'aging' && activePic !== 'all' && rawGroupCounts.aging > 0
                  ? `Tidak ada kargo tertahan (> 7 hari) pada PIC ${activePic.toUpperCase()}, tetapi ada di PIC lain.`
                  : activeGroup === 'aging'
                  ? 'Bagus! Seluruh kargo bergerak lancar, tidak ada kargo tertahan (aging) melebihi 7 hari.'
                  : activeGroup === 'no_type' && activePic !== 'all' && rawGroupCounts.no_type > 0
                  ? `Tidak ada kargo tanpa tipe pada PIC ${activePic.toUpperCase()}, tetapi ada di PIC lain.`
                  : activeGroup === 'no_type'
                  ? 'Semua kargo sudah terdefinisi tipe komoditasnya dengan lengkap.'
                  : 'Coba sesuaikan filter atau ubah pencarian'}
              </p>
            </div>
            {!searchQuery && activeGroup === 'fcl' && activeType === 'udara' && (
              <button
                onClick={() => handleTypeChange('laut')}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                <Ship className="w-3.5 h-3.5" />
                <span>Beralih ke Tab Laut</span>
              </button>
            )}
            {!searchQuery && activeGroup !== 'all' && activePic !== 'all' && rawGroupCounts[activeGroup] > 0 && (
              <button
                onClick={() => handlePicChange('all')}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[var(--color-tertiary)] text-white hover:opacity-90 transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                <span>Tampilkan di Semua PIC</span>
                <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px] font-bold">
                  {rawGroupCounts[activeGroup]}
                </span>
              </button>
            )}
            {!searchQuery && activeGroup !== 'all' && picFilteredList.length > 0 && (
              <button
                onClick={() => handleGroupChange('all')}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-transparent border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>Tampilkan Semua Kategori</span>
                <span className="px-1.5 py-0.2 bg-[var(--color-neutral)] rounded-full text-[10px] font-bold">
                  {picFilteredList.length}
                </span>
              </button>
            )}
            {searchQuery && activeGroup !== 'all' && totalSearchMatchesInPic > 0 && (
              <button
                onClick={() => handleGroupChange('all')}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[var(--color-tertiary)] text-white hover:opacity-90 transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                <span>Tampilkan di Semua Kategori</span>
                <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px] font-bold">
                  {totalSearchMatchesInPic}
                </span>
              </button>
            )}
            {searchQuery && activePic !== 'all' && totalSearchMatchesInMode > 0 && (
              <button
                onClick={() => handlePicChange('all')}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[var(--color-tertiary)] text-white hover:opacity-90 transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                <span>Tampilkan di Semua PIC</span>
                <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px] font-bold">
                  {totalSearchMatchesInMode}
                </span>
              </button>
            )}
            {searchQuery && activeType !== 'all' && totalSearchMatchesInMode === 0 && (
              <button
                onClick={() => handleTypeChange('all')}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-transparent border border-[var(--color-tertiary)] text-[var(--color-tertiary)] hover:bg-[var(--color-tertiary)]/10 transition-all cursor-pointer"
              >
                Cari di Semua Mode (Udara & Laut)
              </button>
            )}
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[11px] font-semibold text-[var(--color-secondary)] hover:text-[var(--color-primary)] underline cursor-pointer mt-1"
              >
                Bersihkan kata kunci
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── MOBILE CARD LIST (< sm) ── */}
            <div className="sm:hidden divide-y divide-[var(--color-border)]">
              {filteredList.map((item, idx) => {
                const badge = PIC_BADGES[item.pic] || { label: item.pic, bg: '#4B5563', text: '#fff' }
                return (
                  <div key={item.listCode || item.listNo || `${item.markingCode}-${idx}`} className="p-3.5 flex flex-col gap-2 bg-[var(--color-surface)] hover:bg-[var(--color-neutral)]/20 transition-colors">
                    {/* Top: Aging + PIC + Status + Broker + StatusKirim */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <AgingBadge hari={item.hari} />
                        <span
                          className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full"
                          style={{ background: badge.bg, color: badge.text }}
                        >
                          {badge.label}
                        </span>
                        <StatusBadge status={item.status} />
                        {item.isPartial && (
                          <button
                            type="button"
                            onClick={() => setPartialModalItem(item)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-purple-500/15 border border-purple-500/50 text-purple-600 dark:text-purple-400 cursor-pointer shadow-2xs"
                            title={`Kargo ini memiliki pengiriman parsial multi-marking (${item.countTerima || 2} marking). Klik untuk lihat rincian.`}
                          >
                            <Layers className="w-2.5 h-2.5 shrink-0" />
                            <span>PARSIAL ({item.countTerima || 2})</span>
                          </button>
                        )}
                        {item.isBroker && (
                          <BrokerBadge size="xs" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusKirimBadge status={item.statusKirim} />
                        <button
                          type="button"
                          onClick={() => handleCopyTargetItem(item)}
                          className={cn(
                            "p-1.5 rounded-lg border transition-all cursor-pointer inline-flex items-center justify-center shadow-2xs",
                            (copiedKey === (item.listCode || item.listNo || `${item.markingCode}`))
                              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-tertiary)]"
                          )}
                          title="Salin Data Kargo (Customer, Cabang, Marking, Komoditi, Jml Pack, Berat, Tipe)"
                        >
                          {(copiedKey === (item.listCode || item.listNo || `${item.markingCode}`))
                            ? <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            : <Copy className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                    </div>

                    {/* Customer & Branch */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-[var(--color-primary)] text-sm leading-tight truncate" title={item.consignee ? `${item.customer} (Consignee: ${item.consignee})` : item.customer}>
                          {item.customer || '-'}
                        </span>
                        {item.custCode && (
                          <span
                            className="text-[9.5px] font-mono font-medium px-1.5 py-0.5 rounded bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-secondary)] shrink-0"
                            title={`Kode Customer: ${item.custCode}`}
                          >
                            {item.custCode}
                          </span>
                        )}
                        {(item.custCode || item.customer) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedCustForHarga({ code: item.custCode || item.customer, name: item.customer })
                            }}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9.5px] font-bold rounded-md bg-transparent border border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer shrink-0"
                            title="Lihat Pricelist Customer (tbCustomersHarga)"
                          >
                            <Tag className="w-2.5 h-2.5 shrink-0" />
                            <span>Tarif</span>
                          </button>
                        )}
                      </div>
                      {item.billTo && item.billTo.trim().toUpperCase() !== item.customer.trim().toUpperCase() && (
                        <div className="text-[10px] text-[var(--color-secondary)] truncate mt-0.5" title={`Bill To: ${item.billTo}`}>
                          Bill to: {item.billTo}
                        </div>
                      )}
                      <div className="text-[11px] text-[var(--color-secondary)] mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{item.branch || '-'}</span>
                        {item.sales && <span>· Sales: {item.sales}</span>}
                      </div>
                    </div>

                    {/* Marking & Badges Card */}
                    <div className="p-2.5 rounded-xl bg-[var(--color-neutral)]/50 border border-[var(--color-border)]/80 flex flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-[var(--color-primary)] font-mono text-xs">
                              {item.markingCode || '-'}
                            </span>
                            {item.isPartial && (
                              <button
                                type="button"
                                onClick={() => setPartialModalItem(item)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-purple-500/15 border border-purple-500/50 text-purple-600 dark:text-purple-400 cursor-pointer shadow-2xs"
                                title={`Klik untuk melihat ${item.countTerima || 2} data pengiriman parsial terkait`}
                              >
                                <Layers className="w-2.5 h-2.5 shrink-0" />
                                <span>PARSIAL ({item.countTerima || 2})</span>
                              </button>
                            )}
                            {item.validasiMismatch && activeType !== 'udara' && (
                              <button
                                onClick={() => setMismatchItem(item)}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-rose-500/10 border border-rose-500/40 text-rose-600 dark:text-rose-400 cursor-pointer"
                              >
                                <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                Mismatch
                              </button>
                            )}
                          </div>
                          {item.markingNo && (
                            <span className="text-[11px] text-[var(--color-secondary)] font-mono font-medium truncate" title={item.markingNo}>
                              #{item.markingNo}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                          <CategoryTypeBadge typeText={item.type} />
                          {Number(item.taxReturn) === 1 && (
                            <span className="px-1.5 py-0.2 text-[9px] font-extrabold tracking-wider uppercase rounded bg-indigo-600 text-white">
                              TAX
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Baris 1: Nama Komoditi (Satu Baris Penuh) */}
                      <div className="pt-1.5 border-t border-[var(--color-border)]/50">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-semibold text-[var(--color-primary)] leading-snug break-words">
                            {item.comodity || '-'}
                          </p>
                          {item.isCommodityOverride && item.commodityOverrideDetail && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 max-w-full truncate"
                              title={`Override Komoditi: ${item.commodityOverrideDetail}`}
                            >
                              <Sparkles className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400 shrink-0" />
                              <span className="truncate">{item.commodityOverrideDetail}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Baris 2: Qty, Berat, dan M3 */}
                      <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-secondary)] font-mono flex-wrap">
                        <span className="font-bold text-[var(--color-primary)]">
                          {item.jmlPack} {item.satuan || 'COLY'}
                        </span>
                        {item.m3Gudang > 0 && (
                          <>
                            <span className="text-[var(--color-border)]">·</span>
                            <span>{item.m3Gudang} m³</span>
                          </>
                        )}
                        {item.berat > 0 && (
                          <>
                            <span className="text-[var(--color-border)]">·</span>
                            <span>{formatDecimal(item.berat, 2)} kg</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Price & Action Row */}
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <div className="text-[10px] text-[var(--color-secondary)] truncate">
                        {item.updateBy ? `${item.updateBy}` : 'Tarif Database'}
                      </div>

                      {/* Price status button */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.priceStatus === 'MATCH' ? (
                          <button
                            type="button"
                            onClick={() => setPriceCheckItem(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 cursor-pointer shadow-2xs"
                          >
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            {formatCurrency(item.harga)}
                          </button>
                        ) : item.priceStatus === 'DIFFERENT' ? (
                          <button
                            type="button"
                            onClick={() => setPriceCheckItem(item)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg ${
                              (item.diffAmount ?? 0) > 0
                                ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-500/10 border border-rose-500/40 text-rose-600 dark:text-rose-400'
                            } cursor-pointer shadow-2xs`}
                          >
                            {(item.diffAmount ?? 0) > 0 ? (
                              <TrendingUp className="w-3 h-3 shrink-0 text-emerald-500" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                            )}
                            {formatCurrency(item.harga)} {(item.diffAmount ?? 0) > 0 ? '(Di Atas DB)' : '(Beda DB)'}
                          </button>
                        ) : item.priceStatus === 'NOT_SET' ? (
                          <button
                            type="button"
                            onClick={() => setPriceCheckItem(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-500/10 border border-purple-500/40 text-purple-600 dark:text-purple-400 cursor-pointer shadow-2xs"
                          >
                            <Info className="w-3 h-3 shrink-0" />
                            Ada di DB ({formatCurrency(item.hargaDb || 0)})
                          </button>
                        ) : item.harga > 0 ? (
                          <button
                            type="button"
                            onClick={() => setPriceCheckItem(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)] hover:border-[var(--color-tertiary)] cursor-pointer"
                          >
                            <Tag className="w-3 h-3 shrink-0" />
                            {formatCurrency(item.harga)}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPriceCheckItem(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-600 dark:text-amber-400 cursor-pointer shadow-2xs"
                          >
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            Belum Ada Harga
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── DESKTOP TABLE (>= sm) ── */}
            <div className="hidden sm:block overflow-x-auto">
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
                    <th className="px-3 py-3 border-b border-[var(--color-border)] text-center w-14">Salin</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item, idx) => {
                    const badge = PIC_BADGES[item.pic] || { label: item.pic, bg: '#4B5563', text: '#fff' }
                    const isEven = idx % 2 === 0
                    return (
                      <tr
                        key={item.listCode || item.listNo || `${item.markingCode}-${idx}`}
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
                        <td className="px-4 py-3 border-b border-[var(--color-border)] max-w-[240px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-[var(--color-primary)] text-xs truncate leading-snug" title={item.consignee ? `${item.customer} (Consignee: ${item.consignee})` : item.customer}>
                              {item.customer || '-'}
                            </span>
                            {item.custCode && (
                              <span
                                className="text-[9.5px] font-mono font-medium px-1.5 py-0.5 rounded bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-secondary)] shrink-0"
                                title={`Kode Customer: ${item.custCode}`}
                              >
                                {item.custCode}
                              </span>
                            )}
                            {(item.custCode || item.customer) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedCustForHarga({ code: item.custCode || item.customer, name: item.customer })
                                }}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-transparent border border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer shrink-0"
                                title="Lihat Pricelist Customer (tbCustomersHarga)"
                              >
                                <Tag className="w-2.5 h-2.5 shrink-0" />
                                <span>Tarif</span>
                              </button>
                            )}
                          </div>
                          {item.billTo && item.billTo.trim().toUpperCase() !== item.customer.trim().toUpperCase() && (
                            <div className="text-[10px] text-[var(--color-secondary)] truncate mt-0.5" title={`Bill To: ${item.billTo}`}>
                              Bill to: {item.billTo}
                            </div>
                          )}
                          <div className="mt-1 flex items-center gap-1.5 flex-nowrap">
                            <StatusBadge status={item.status} />
                            {item.isPartial && (
                              <button
                                type="button"
                                onClick={() => setPartialModalItem(item)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-purple-500/15 border border-purple-500/50 text-purple-600 dark:text-purple-400 hover:bg-purple-500/25 transition-colors cursor-pointer shadow-2xs shrink-0"
                                title={`Kargo ini memiliki pengiriman parsial multi-marking (${item.countTerima || 2} marking). Klik untuk lihat rincian.`}
                              >
                                <Layers className="w-2.5 h-2.5 shrink-0" />
                                <span>PARSIAL ({item.countTerima || 2} Resi)</span>
                              </button>
                            )}
                            {item.isBroker && (
                              <BrokerBadge size="xs" />
                            )}
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
                                title={`Klik untuk melihat ${item.countTerima || 2} data pengiriman parsial terkait di tbEntryList`}
                              >
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-md bg-purple-500/15 border border-purple-500/50 text-purple-600 dark:text-purple-400 group-hover/parsial:bg-purple-500/25 transition-colors shadow-2xs shrink-0"
                                >
                                  <Layers className="w-2.5 h-2.5 shrink-0" />
                                  PARSIAL ({item.countTerima || 2})
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
                        <td className="px-4 py-3 border-b border-[var(--color-border)] max-w-[220px] text-[var(--color-secondary)]" title={item.comodity}>
                          <div className="flex flex-col gap-1 items-start max-w-full overflow-hidden">
                            <span className="truncate max-w-full font-medium text-[var(--color-primary)]">{item.comodity || '-'}</span>
                            {item.isCommodityOverride && item.commodityOverrideDetail && (
                              <span
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 max-w-full truncate overflow-hidden"
                                title={`Override Komoditi: ${item.commodityOverrideDetail}`}
                              >
                                <Sparkles className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400 shrink-0" />
                                <span className="truncate">{item.commodityOverrideDetail}</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-4 py-3 border-b border-[var(--color-border)] whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <CategoryTypeBadge typeText={item.type} />
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
                                    className={`font-bold ${
                                      (item.diffAmount ?? 0) > 0
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-rose-600 dark:text-rose-400'
                                    } hover:underline cursor-pointer`}
                                    title="Klik untuk cek rincian perbandingan harga"
                                  >
                                    {formatCurrency(item.harga)}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPriceCheckItem(item)}
                                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-transparent ${
                                      (item.diffAmount ?? 0) > 0
                                        ? 'border border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                                        : 'border border-rose-500/50 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
                                    } transition-colors cursor-pointer`}
                                    title={
                                      (item.diffAmount ?? 0) > 0
                                        ? `Harga di atas acuan database (DB: ${formatCurrency(item.hargaDb || 0)}, Selisih: +${formatCurrency(item.diffAmount || 0)}). Klik untuk cek rincian.`
                                        : `Terdapat selisih dengan database (DB: ${formatCurrency(item.hargaDb || 0)}). Klik untuk cek rincian.`
                                    }
                                  >
                                    {(item.diffAmount ?? 0) > 0 ? (
                                      <TrendingUp className="w-2.5 h-2.5 shrink-0 text-emerald-500" />
                                    ) : (
                                      <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                    )}
                                    {(item.diffAmount ?? 0) > 0 ? 'Di Atas DB' : 'Beda DB'}
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

                        {/* Salin Data Kargo */}
                        <td className="px-3 py-3 border-b border-[var(--color-border)] text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleCopyTargetItem(item)}
                            className={cn(
                              "p-1.5 rounded-lg border transition-all cursor-pointer inline-flex items-center justify-center shadow-2xs",
                              (copiedKey === (item.listCode || item.listNo || `${item.markingCode}`))
                                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-tertiary)]"
                            )}
                            title="Salin Data Kargo (Customer, Cabang, Marking, Komoditi, Jml Pack, Berat, Tipe)"
                          >
                            {(copiedKey === (item.listCode || item.listNo || `${item.markingCode}`))
                              ? <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              : <Copy className="w-3.5 h-3.5" />
                            }
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
