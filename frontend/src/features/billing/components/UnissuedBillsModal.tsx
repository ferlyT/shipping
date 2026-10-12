import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  Search,
  Plane,
  Ship,
  Calendar,
  User,
  Clock,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  FileQuestion,
  ClipboardCheck,
  Users,
} from 'lucide-react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useTranslation } from '@/hooks/useTranslation'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'
import { billingApi } from '../services/billing.service'
import { useBillingValidationDetailPermission } from '../hooks/useBillingPermissions'
import type { UnissuedBillItem, UnissuedBillsSummary } from '../types/billing.types'

interface UnissuedBillsModalProps {
  isOpen: boolean
  onClose: () => void
  initialAging?: 'all' | 'le7' | '8to14' | '15to30' | 'gt30'
}

type ModeFilter = 'all' | 'udara' | 'laut'
type AgingFilter = 'all' | 'le7' | '8to14' | '15to30' | 'gt30'

export function UnissuedBillsModal({
  isOpen,
  onClose,
  initialAging = 'all',
}: UnissuedBillsModalProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const canValidate = useBillingValidationDetailPermission()

  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<UnissuedBillItem[]>([])
  const [summary, setSummary] = useState<UnissuedBillsSummary | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all')
  const [agingFilter, setAgingFilter] = useState<AgingFilter>(initialAging)
  const [creatorFilter, setCreatorFilter] = useState<string>('all')
  const [copiedInvoice, setCopiedInvoice] = useState<string | null>(null)

  // Update agingFilter bila initialAging berubah saat dibuka
  useEffect(() => {
    if (isOpen) {
      setAgingFilter(initialAging)
      fetchData()
    }
  }, [isOpen, initialAging])

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await billingApi.getUnissuedBills()
      if (res.data?.data) {
        setItems(res.data.data.items || [])
        setSummary(res.data.data.summary || null)
      }
    } catch {
      // safe fallback
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (invNo: string) => {
    navigator.clipboard.writeText(invNo)
    setCopiedInvoice(invNo)
    setTimeout(() => setCopiedInvoice(null), 2000)
  }

  // Daftar creator / pembuat bill unik beserta kuantiti bill
  const creatorList = useMemo(() => {
    const map = new Map<string, { code: string; name: string; count: number; nominal: number }>()
    for (const it of items) {
      const name = (it.empName || it.empCode || 'Tanpa Nama').trim()
      const cur = map.get(name) || { code: it.empCode, name, count: 0, nominal: 0 }
      cur.count += 1
      cur.nominal += it.jumlah1 || 0
      map.set(name, cur)
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [items])

  const filteredItems = useMemo(() => {
    let list = [...items]

    if (modeFilter !== 'all') {
      list = list.filter((it) => it.mode === modeFilter)
    }

    if (agingFilter !== 'all') {
      list = list.filter((it) => it.agingGroup === agingFilter)
    }

    if (creatorFilter !== 'all') {
      list = list.filter((it) => (it.empName || it.empCode || 'Tanpa Nama').trim() === creatorFilter)
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      list = list.filter(
        (it) =>
          it.invNo.toLowerCase().includes(q) ||
          it.custName.toLowerCase().includes(q) ||
          it.custCode.toLowerCase().includes(q) ||
          it.markingCode.toLowerCase().includes(q) ||
          it.markingNo.toLowerCase().includes(q) ||
          it.empName.toLowerCase().includes(q)
      )
    }

    // Urutkan default: aging tertinggi (hari paling lama) di atas
    list.sort((a, b) => b.agingDays - a.agingDays)

    return list
  }, [items, modeFilter, agingFilter, creatorFilter, searchTerm])

  const currentTotalAmount = useMemo(() => {
    return filteredItems.reduce((acc, it) => acc + (it.jumlah1 || 0), 0)
  }, [filteredItems])

  const getAgingBadge = (days: number, group: 'le7' | '8to14' | '15to30' | 'gt30') => {
    switch (group) {
      case 'le7':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
            <Clock className="w-3 h-3 shrink-0" />
            {days} Hari (≤7 Hari)
          </span>
        )
      case '8to14':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap">
            <Clock className="w-3 h-3 shrink-0" />
            {days} Hari (8-14 Hari)
          </span>
        )
      case '15to30':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 whitespace-nowrap">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            {days} Hari (15-30 Hari)
          </span>
        )
      case 'gt30':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 whitespace-nowrap">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            {days} Hari (&gt;30 Hari)
          </span>
        )
    }
  }

  const handleOpenDetail = (invNo: string) => {
    onClose()
    if (canValidate) {
      navigate(ROUTES.BILLING_VALIDATION_DETAIL(invNo))
    } else {
      navigate(ROUTES.BILLING_DETAIL(invNo))
    }
  }

  const handleOpenValidation = (invNo: string) => {
    onClose()
    navigate(ROUTES.BILLING_VALIDATION_DETAIL(invNo))
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      className="max-w-[96vw] w-[1450px]"
    >
      <ModalHeader
        icon={
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <FileQuestion className="w-5 h-5" />
          </div>
        }
        title={t('billing.unissuedBillsModalTitle') || 'Draft Bill Belum Di-Issue (Unissued Bills)'}
        subtitle="Daftar tagihan dengan nominal valid (fdJumlah > 0 & fdJumlah1 > 0) tahun > 2024 yang belum di-issued (fdGive = 1) lengkap dengan aging"
        badge={
          summary ? (
            <Badge variant="warning" className="text-[10px] px-2 py-0.2 font-mono">
              {summary.totalCount} Bill
            </Badge>
          ) : undefined
        }
        onClose={onClose}
      >
        <Button
          variant="secondary"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          className="hidden sm:inline-flex items-center gap-1.5 text-xs mr-2"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </ModalHeader>

      <ModalBody className="p-3.5 sm:p-5 space-y-3 max-h-[80vh] overflow-y-auto">
        {/* ── Metric Cards Ringkasan ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
          {/* Card Total */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-[var(--color-neutral)] border border-[var(--color-border)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-[var(--color-secondary)] font-medium mb-1">
              <span>Total Draft</span>
              <FileText className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-bold font-mono text-[var(--color-primary)]">
                {summary ? `${summary.totalCount} Bill` : '-'}
              </div>
              <div className="text-[10px] font-mono text-[var(--color-secondary)] truncate">
                {summary ? formatCurrency(summary.totalNominal) : '-'}
              </div>
            </div>
          </div>

          {/* Card Udara */}
          <div
            onClick={() => setModeFilter((prev) => (prev === 'udara' ? 'all' : 'udara'))}
            className={cn(
              "p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all",
              modeFilter === 'udara'
                ? "bg-sky-500/10 border-sky-500/40 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500/30"
                : "bg-[var(--color-neutral)] border-[var(--color-border)] hover:border-sky-500/30"
            )}
          >
            <div className="flex items-center justify-between text-[11px] text-[var(--color-secondary)] font-medium mb-1">
              <span>✈️ Moda Udara</span>
              <Plane className="w-3.5 h-3.5 text-sky-500" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-bold font-mono text-sky-600 dark:text-sky-400">
                {summary ? `${summary.countUdara} Bill` : '-'}
              </div>
              <div className="text-[10px] font-mono text-[var(--color-secondary)] truncate">
                {summary ? formatCurrency(summary.nominalUdara) : '-'}
              </div>
            </div>
          </div>

          {/* Card Laut */}
          <div
            onClick={() => setModeFilter((prev) => (prev === 'laut' ? 'all' : 'laut'))}
            className={cn(
              "p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all",
              modeFilter === 'laut'
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30"
                : "bg-[var(--color-neutral)] border-[var(--color-border)] hover:border-emerald-500/30"
            )}
          >
            <div className="flex items-center justify-between text-[11px] text-[var(--color-secondary)] font-medium mb-1">
              <span>🚢 Moda Laut</span>
              <Ship className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {summary ? `${summary.countLaut} Bill` : '-'}
              </div>
              <div className="text-[10px] font-mono text-[var(--color-secondary)] truncate">
                {summary ? formatCurrency(summary.nominalLaut) : '-'}
              </div>
            </div>
          </div>

          {/* Card Aging Kritis (>30 Hari) */}
          <div
            onClick={() => setAgingFilter((prev) => (prev === 'gt30' ? 'all' : 'gt30'))}
            className={cn(
              "p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all",
              agingFilter === 'gt30'
                ? "bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/30"
                : "bg-[var(--color-neutral)] border-[var(--color-border)] hover:border-rose-500/30"
            )}
          >
            <div className="flex items-center justify-between text-[11px] text-[var(--color-secondary)] font-medium mb-1">
              <span>Aging &gt;30 Hari</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-bold font-mono text-rose-600 dark:text-rose-400">
                {summary ? `${summary.aging.gt30.count} Bill` : '-'}
              </div>
              <div className="text-[10px] font-mono text-[var(--color-secondary)] truncate">
                {summary ? formatCurrency(summary.aging.gt30.nominal) : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* ── Filter Toolbar ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari No Inv, Customer, Marking, PIC/Creator..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-primary)] placeholder-[var(--color-secondary)]/60 focus:outline-hidden focus:border-[var(--color-tertiary)]"
            />
          </div>

          {/* Mode Pill Filter */}
          <div className="flex items-center gap-1 bg-[var(--color-neutral)] p-1 rounded-lg border border-[var(--color-border)] shrink-0">
            <button
              type="button"
              onClick={() => setModeFilter('all')}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                modeFilter === 'all'
                  ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-2xs border border-[var(--color-border)]"
                  : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
              )}
            >
              Semua Moda
            </button>
            <button
              type="button"
              onClick={() => setModeFilter('udara')}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap",
                modeFilter === 'udara'
                  ? "bg-[var(--color-surface)] text-sky-600 dark:text-sky-400 shadow-2xs border border-sky-500/20"
                  : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
              )}
            >
              <Plane className="w-3 h-3" />
              Udara
            </button>
            <button
              type="button"
              onClick={() => setModeFilter('laut')}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap",
                modeFilter === 'laut'
                  ? "bg-[var(--color-surface)] text-emerald-600 dark:text-emerald-400 shadow-2xs border border-emerald-500/20"
                  : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
              )}
            >
              <Ship className="w-3 h-3" />
              Laut
            </button>
          </div>
        </div>

        {/* ── Aging Segment Buttons ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
          <span className="text-[11px] font-bold text-[var(--color-secondary)] uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Aging:
          </span>
          <button
            type="button"
            onClick={() => setAgingFilter('all')}
            className={cn(
              "px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer shrink-0 border whitespace-nowrap",
              agingFilter === 'all'
                ? "bg-[var(--color-surface)] text-[var(--color-primary)] border-[var(--color-tertiary)] shadow-2xs"
                : "bg-[var(--color-neutral)] text-[var(--color-secondary)] border-[var(--color-border)] hover:text-[var(--color-primary)]"
            )}
          >
            Semua ({summary?.totalCount ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setAgingFilter('le7')}
            className={cn(
              "px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer shrink-0 border whitespace-nowrap",
              agingFilter === 'le7'
                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500 shadow-2xs"
                : "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10"
            )}
          >
            ≤7 Hari ({summary?.aging?.le7?.count ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setAgingFilter('8to14')}
            className={cn(
              "px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer shrink-0 border whitespace-nowrap",
              agingFilter === '8to14'
                ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500 shadow-2xs"
                : "bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/10"
            )}
          >
            8-14 Hari ({summary?.aging?.d8to14?.count ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setAgingFilter('15to30')}
            className={cn(
              "px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer shrink-0 border whitespace-nowrap",
              agingFilter === '15to30'
                ? "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500 shadow-2xs"
                : "bg-orange-500/5 text-orange-600 dark:text-orange-400 border-orange-500/20 hover:bg-orange-500/10"
            )}
          >
            15-30 Hari ({summary?.aging?.d15to30?.count ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setAgingFilter('gt30')}
            className={cn(
              "px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer shrink-0 border whitespace-nowrap",
              agingFilter === 'gt30'
                ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500 shadow-2xs"
                : "bg-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/10"
            )}
          >
            &gt;30 Hari ({summary?.aging?.gt30?.count ?? 0})
          </button>
        </div>

        {/* ── Group Pills by Creator Bill (Pembuat Invoice) ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
          <span className="text-[11px] font-bold text-[var(--color-secondary)] uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Users className="w-3 h-3" />
            Pembuat (Creator):
          </span>
          <button
            type="button"
            onClick={() => setCreatorFilter('all')}
            className={cn(
              "px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer shrink-0 border whitespace-nowrap",
              creatorFilter === 'all'
                ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500 shadow-2xs"
                : "bg-[var(--color-neutral)] text-[var(--color-secondary)] border-[var(--color-border)] hover:text-[var(--color-primary)]"
            )}
          >
            Semua Creator ({items.length})
          </button>
          {creatorList.map((creator) => (
            <button
              key={creator.name}
              type="button"
              onClick={() => setCreatorFilter((prev) => (prev === creator.name ? 'all' : creator.name))}
              className={cn(
                "px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer shrink-0 border flex items-center gap-1 whitespace-nowrap",
                creatorFilter === creator.name
                  ? "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500 shadow-2xs"
                  : "bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/10"
              )}
            >
              <User className="w-3 h-3" />
              <span>{creator.name}</span>
              <span className="ml-0.5 px-1 rounded-full bg-indigo-500/15 text-[9px] font-mono">
                {creator.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Table Section (Lebar & Tanpa Wrap) ── */}
        <div className="border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-surface)] shadow-2xs">
          <div className="overflow-x-auto max-h-[480px]">
            <table className="w-full text-left text-[11px] sm:text-xs">
              <thead className="bg-[var(--color-neutral)] text-[var(--color-secondary)] uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10 border-b border-[var(--color-border)] whitespace-nowrap">
                <tr>
                  <th className="py-2.5 px-3 min-w-[170px]">No. Invoice &amp; Tanggal</th>
                  <th className="py-2.5 px-4 min-w-[240px]">Customer</th>
                  <th className="py-2.5 px-3 min-w-[160px]">Moda &amp; Marking</th>
                  <th className="py-2.5 px-3 text-right min-w-[130px]">Nilai Tagihan</th>
                  <th className="py-2.5 px-3 min-w-[150px]">Aging Bill</th>
                  <th className="py-2.5 px-3 min-w-[140px]">Pembuat (Creator)</th>
                  <th className="py-2.5 px-3 text-center min-w-[160px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="h-4 w-48 rounded skeleton-shimmer" />
                        <div className="h-4 w-32 rounded skeleton-shimmer" />
                        <span className="text-xs text-[var(--color-secondary)] mt-1">Memuat daftar unissued bills...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[var(--color-secondary)]">
                      <FileQuestion className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-500" />
                      <p className="font-semibold text-xs text-[var(--color-primary)]">Tidak ada bill ditemukan</p>
                      <p className="text-[11px] mt-0.5">Coba sesuaikan kata kunci pencarian, filter creator, atau filter aging Anda.</p>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr
                      key={item.invNo}
                      className="hover:bg-[var(--color-neutral)]/60 transition-colors group"
                    >
                      {/* Invoice & Tanggal */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-[var(--color-primary)]">
                          <span>{item.invNo}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.invNo)}
                            title="Salin No Invoice"
                            className="p-1 rounded text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-border)]/50 transition-colors cursor-pointer"
                          >
                            {copiedInvoice === item.invNo ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="text-[10px] text-[var(--color-secondary)] flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>{item.invDate ? formatDate(item.invDate) : '-'}</span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-[var(--color-primary)] max-w-[320px] truncate" title={item.custName}>
                          {item.custName}
                        </div>
                        <div className="text-[10px] font-mono text-[var(--color-secondary)] mt-0.5">
                          {item.custCode}
                        </div>
                      </td>

                      {/* Moda & Marking */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {item.mode === 'udara' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-600 dark:text-sky-400">
                              <Plane className="w-3 h-3" /> Udara
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              <Ship className="w-3 h-3" /> Laut
                            </span>
                          )}
                          {item.branchCode && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)] uppercase font-mono">
                              {item.branchCode}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-[var(--color-secondary)] mt-0.5 truncate max-w-[200px]" title={`${item.markingCode}${item.markingNo ? ` - ${item.markingNo}` : ''}`}>
                          {item.markingCode ? `${item.markingCode}${item.markingNo ? ` - ${item.markingNo}` : ''}` : '-'}
                        </div>
                      </td>

                      {/* Nilai Tagihan */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="font-mono font-bold text-[var(--color-primary)]">
                          {formatCurrency(item.jumlah1)}
                        </div>
                        {item.jumlahTotal > 0 && Math.abs(item.jumlahTotal - item.jumlah1) > 1 && (
                          <div className="text-[9px] font-mono text-[var(--color-secondary)] mt-0.5" title="Total akumulasi billing total">
                            Tot: {formatCurrency(item.jumlahTotal)}
                          </div>
                        )}
                      </td>

                      {/* Aging Badge */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {getAgingBadge(item.agingDays, item.agingGroup)}
                      </td>

                      {/* Pembuat (Creator) */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-primary)]">
                          <User className="w-3.5 h-3.5 text-[var(--color-secondary)] shrink-0" />
                          <span className="font-medium truncate max-w-[150px]" title={item.empName}>
                            {item.empName || item.empCode || '-'}
                          </span>
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {canValidate && (
                            <button
                              type="button"
                              onClick={() => handleOpenValidation(item.invNo)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
                              title="Buka halaman validasi invoice"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Validasi</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(item.invNo)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-[var(--color-neutral)] hover:bg-[var(--color-border)]/60 text-[var(--color-primary)] border border-[var(--color-border)] transition-colors cursor-pointer"
                            title={canValidate ? "Buka halaman validasi invoice" : "Buka rincian invoice billing"}
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Detail</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ModalBody>

      <ModalFooter className="border-t border-[var(--color-border)] pt-3 flex items-center justify-between">
        <div className="text-[11px] text-[var(--color-secondary)] flex items-center gap-2">
          <span>Menampilkan: <strong className="text-[var(--color-primary)]">{filteredItems.length}</strong> bill</span>
          <span>•</span>
          <span>Subtotal: <strong className="text-[var(--color-primary)] font-mono">{formatCurrency(currentTotalAmount)}</strong></span>
        </div>
        <Button variant="secondary" size="sm" onClick={onClose}>
          {t('common.close') || 'Tutup'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
