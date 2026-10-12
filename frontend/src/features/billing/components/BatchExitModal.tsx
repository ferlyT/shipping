import { useState, useMemo, Fragment } from 'react'
import {
  Boxes,
  Search,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Plane,
  Ship,
  Loader2,
  Calendar,
  X,
  ShieldAlert,
  AlertTriangle,
  Zap,
  Banknote,
  CheckCircle,
} from 'lucide-react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/hooks/useTranslation'
import { cn, formatDate } from '@/lib/utils'
import { statusConfig, BrokerBadge } from '@/features/customers/components/CustomerBadges'
import { billingApi } from '../services/billing.service'
import type { BatchExitItem, BatchExitComparisonSummary, BatchExitCargoItem } from '../types/billing.types'

interface BatchExitModalProps {
  isOpen: boolean
  onClose: () => void
  batches: BatchExitItem[]
  summary?: BatchExitComparisonSummary
  selectedPeriodLabel: string
  allTime: boolean
}

type FilterStatus = 'all' | 'pending' | 'completed'
type FilterMode = 'all' | 'udara' | 'laut'
type CustomerStatusFilterKey = 'all' | 'blocked' | 'warning' | 'urgent' | 'cod' | 'ok'

export function BatchExitModal({
  isOpen,
  onClose,
  batches,
  summary,
  selectedPeriodLabel,
  allTime,
}: BatchExitModalProps) {
  const { t } = useTranslation()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('pending')
  const [modeFilter, setModeFilter] = useState<FilterMode>('all')
  const [branchFilter, setBranchFilter] = useState<string>('all')
  const [custStatusFilter, setCustStatusFilter] = useState<CustomerStatusFilterKey>('all')
  const [expandedMarking, setExpandedMarking] = useState<string | null>(null)
  const [cargoDetails, setCargoDetails] = useState<Record<string, BatchExitCargoItem[]>>({})
  const [loadingMarking, setLoadingMarking] = useState<string | null>(null)

  const availableBranches = useMemo(() => {
    if (summary?.byBranch && summary.byBranch.length > 0) {
      return summary.byBranch.map((b) => ({
        code: b.branchCode,
        name: b.branchName,
        count: b.totalBatches,
      }))
    }
    const map = new Map<string, { code: string; name: string; count: number }>()
    for (const b of batches) {
      const code = b.branchCode || 'LAIN'
      const name = b.branchName || code
      const cur = map.get(code)
      if (cur) cur.count++
      else map.set(code, { code, name, count: 1 })
    }
    return [...map.values()].sort((a, b) => b.count - a.count)
  }, [summary, batches])

  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      // Search
      const cleanSearch = searchTerm.toLowerCase().trim()
      const matchesSearch =
        !cleanSearch ||
        b.markingCode.toLowerCase().includes(cleanSearch) ||
        b.branchName.toLowerCase().includes(cleanSearch)

      if (!matchesSearch) return false

      // Status
      if (statusFilter === 'pending' && b.isFullyBilled) return false
      if (statusFilter === 'completed' && !b.isFullyBilled) return false

      // Mode
      if (modeFilter === 'udara' && b.listType !== 1) return false
      if (modeFilter === 'laut' && b.listType !== 2) return false

      // Branch (Aturan ERP: -- dan SG disatukan ke 'SG')
      if (branchFilter !== 'all' && b.branchCode !== branchFilter) return false

      // Customer Status Filter
      if (custStatusFilter !== 'all') {
        const cs = b.customerStatus
        if (custStatusFilter === 'blocked' && (!cs || cs.blocked === 0)) return false
        if (custStatusFilter === 'warning' && (!cs || cs.warning === 0)) return false
        if (custStatusFilter === 'urgent' && (!cs || cs.urgent === 0)) return false
        if (custStatusFilter === 'cod' && (!cs || cs.cod === 0)) return false
        if (custStatusFilter === 'ok' && (!cs || cs.ok === 0)) return false
      }

      return true
    })
  }, [batches, searchTerm, statusFilter, modeFilter, branchFilter, custStatusFilter])

  const handleToggleExpand = async (markingCode: string) => {
    if (expandedMarking === markingCode) {
      setExpandedMarking(null)
      return
    }

    setExpandedMarking(markingCode)
    if (!cargoDetails[markingCode]) {
      setLoadingMarking(markingCode)
      try {
        const res = await billingApi.getBatchExitCargoDetails(markingCode)
        const raw = res?.data
        const items: BatchExitCargoItem[] = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as any)?.data)
          ? (raw as any).data
          : []
        setCargoDetails((prev) => ({ ...prev, [markingCode]: items }))
      } catch (err) {
        console.error('Failed to load batch cargo details:', err)
      } finally {
        setLoadingMarking(null)
      }
    }
  }

  const custSummary = summary?.byCustomerStatus

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" className="max-h-[92vh]">
      <ModalHeader
        title={t('billing.batchExitComparison.modalTitle')}
        subtitle={`${t('billing.batchExitComparison.modalSubtitle')} • ${allTime ? t('billing.batchExitComparison.allTime') : selectedPeriodLabel}`}
        icon={
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Boxes className="w-5 h-5" />
          </div>
        }
        onClose={onClose}
      />

      <ModalBody className="p-4 sm:p-5 space-y-4 overflow-y-auto">
        {/* KPI Mini Summary Bar */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-[var(--color-neutral)]/40 border border-[var(--color-border)] text-xs">
            <div>
              <span className="text-[var(--color-secondary)] block text-[10px] uppercase font-bold tracking-wider">
                Total Batch Exit
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-[var(--color-primary)]">
                {summary.totalBatches}
              </span>
              <span className="text-[10px] text-[var(--color-secondary)] ml-1">
                ({summary.fullyBilledBatches} tuntas • {summary.pendingBatches} pending)
              </span>
            </div>

            <div>
              <span className="text-[var(--color-secondary)] block text-[10px] uppercase font-bold tracking-wider">
                {t('billing.batchExitComparison.totalCargoExit')}
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-[var(--color-primary)]">
                {summary.totalKargo.toLocaleString('en-US')}
              </span>
              <span className="text-[10px] text-[var(--color-secondary)] ml-1">kargo</span>
            </div>

            <div>
              <span className="text-[var(--color-secondary)] block text-[10px] uppercase font-bold tracking-wider">
                {t('billing.batchExitComparison.billCreated')}
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {summary.totalBilled.toLocaleString('en-US')}
              </span>
              <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 ml-1">
                ({summary.billedPercentage}%)
              </span>
            </div>

            <div>
              <span className="text-[var(--color-secondary)] block text-[10px] uppercase font-bold tracking-wider">
                {t('billing.batchExitComparison.unbilled')}
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-amber-600 dark:text-amber-400">
                {summary.totalUnbilled.toLocaleString('en-US')}
              </span>
              <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 ml-1">kargo sisa</span>
            </div>

            {/* Breakdown Mini Dual Progress Bar Udara & Laut */}
            <div className="col-span-2 sm:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 mt-0.5 border-t border-[var(--color-border)]/50">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Plane className="w-3 h-3" /> Udara ({summary.air.totalBatches} Batch): {summary.air.totalBilled} / {summary.air.totalKargo} Billed
                  </span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    {summary.air.billedPercentage}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[var(--color-neutral)] overflow-hidden flex border border-amber-500/20">
                  <div className="bg-amber-500 h-full transition-all" style={{ width: `${summary.air.billedPercentage}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                    <Ship className="w-3 h-3" /> Laut ({summary.sea.totalBatches} Batch): {summary.sea.totalBilled} / {summary.sea.totalKargo} Billed
                  </span>
                  <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                    {summary.sea.billedPercentage}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[var(--color-neutral)] overflow-hidden flex border border-sky-500/20">
                  <div className="bg-sky-500 h-full transition-all" style={{ width: `${summary.sea.billedPercentage}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Status Customer Summary Bar & Filter Pills ── */}
        {custSummary && (
          <div className="p-2.5 sm:p-3 rounded-xl bg-[var(--color-neutral)]/25 border border-[var(--color-border)] space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2 text-[11px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] flex items-center gap-1">
                <span>Rincian Status Customer (Klik untuk Filter):</span>
              </span>
              {custStatusFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setCustStatusFilter('all')}
                  className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  <X className="w-3 h-3" /> Reset Filter Status
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setCustStatusFilter('all')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border',
                  custStatusFilter === 'all'
                    ? 'bg-[var(--color-surface)] text-[var(--color-primary)] border-[var(--color-tertiary)] shadow-2xs'
                    : 'bg-[var(--color-neutral)]/60 text-[var(--color-secondary)] border-transparent hover:text-[var(--color-primary)]'
                )}
              >
                Semua Status
              </button>

              {/* Blocked */}
              <button
                type="button"
                onClick={() => setCustStatusFilter(custStatusFilter === 'blocked' ? 'all' : 'blocked')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border inline-flex items-center gap-1.5',
                  custStatusFilter === 'blocked'
                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50 shadow-2xs font-bold'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/15'
                )}
                title={`${custSummary.blocked.totalKargo} kargo customer BLOCKED (${custSummary.blocked.totalUnbilled} belum ditagih)`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>BLOCKED</span>
                <span className="font-mono text-[11px]">
                  {custSummary.blocked.totalKargo}
                </span>
                {custSummary.blocked.totalUnbilled > 0 && (
                  <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-rose-500 text-white dark:text-rose-950 font-extrabold">
                    {custSummary.blocked.totalUnbilled} pending
                  </span>
                )}
              </button>

              {/* Warning */}
              <button
                type="button"
                onClick={() => setCustStatusFilter(custStatusFilter === 'warning' ? 'all' : 'warning')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border inline-flex items-center gap-1.5',
                  custStatusFilter === 'warning'
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-2xs font-bold'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/15'
                )}
                title={`${custSummary.warning.totalKargo} kargo customer WARNING (${custSummary.warning.totalUnbilled} belum ditagih)`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>WARNING</span>
                <span className="font-mono text-[11px]">
                  {custSummary.warning.totalKargo}
                </span>
                {custSummary.warning.totalUnbilled > 0 && (
                  <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-amber-500 text-white dark:text-amber-950 font-extrabold">
                    {custSummary.warning.totalUnbilled} pending
                  </span>
                )}
              </button>

              {/* Urgent */}
              <button
                type="button"
                onClick={() => setCustStatusFilter(custStatusFilter === 'urgent' ? 'all' : 'urgent')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border inline-flex items-center gap-1.5',
                  custStatusFilter === 'urgent'
                    ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/50 shadow-2xs font-bold'
                    : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 hover:bg-sky-500/15'
                )}
                title={`${custSummary.urgent.totalKargo} kargo customer URGENT (${custSummary.urgent.totalUnbilled} belum ditagih)`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>URGENT</span>
                <span className="font-mono text-[11px]">
                  {custSummary.urgent.totalKargo}
                </span>
                {custSummary.urgent.totalUnbilled > 0 && (
                  <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-sky-500 text-white dark:text-sky-950 font-extrabold">
                    {custSummary.urgent.totalUnbilled} pending
                  </span>
                )}
              </button>

              {/* COD */}
              <button
                type="button"
                onClick={() => setCustStatusFilter(custStatusFilter === 'cod' ? 'all' : 'cod')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border inline-flex items-center gap-1.5',
                  custStatusFilter === 'cod'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50 shadow-2xs font-bold'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15'
                )}
                title={`${custSummary.cod.totalKargo} kargo customer COD (${custSummary.cod.totalUnbilled} belum ditagih)`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>COD</span>
                <span className="font-mono text-[11px]">
                  {custSummary.cod.totalKargo}
                </span>
                {custSummary.cod.totalUnbilled > 0 && (
                  <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-emerald-500 text-white dark:text-emerald-950 font-extrabold">
                    {custSummary.cod.totalUnbilled} pending
                  </span>
                )}
              </button>

              {/* OK */}
              <button
                type="button"
                onClick={() => setCustStatusFilter(custStatusFilter === 'ok' ? 'all' : 'ok')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border inline-flex items-center gap-1.5',
                  custStatusFilter === 'ok'
                    ? 'bg-[var(--color-surface)] text-[var(--color-primary)] border-[var(--color-border)] shadow-2xs font-bold'
                    : 'bg-[var(--color-neutral)]/60 text-[var(--color-secondary)] border-transparent hover:text-[var(--color-primary)]'
                )}
                title={`${custSummary.ok.totalKargo} kargo customer OK (${custSummary.ok.totalUnbilled} belum ditagih)`}
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>OK</span>
                <span className="font-mono text-[11px]">
                  {custSummary.ok.totalKargo}
                </span>
                {custSummary.ok.totalUnbilled > 0 && (
                  <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                    ({custSummary.ok.totalUnbilled} sisa)
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] text-xs overflow-x-auto shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={cn(
                'px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer whitespace-nowrap',
                statusFilter === 'pending'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-2xs border border-amber-500/30'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              )}
            >
              {t('billing.batchExitComparison.pendingBatches')} ({batches.filter((b) => !b.isFullyBilled).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={cn(
                'px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer whitespace-nowrap',
                statusFilter === 'completed'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-2xs border border-emerald-500/30'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              )}
            >
              {t('billing.batchExitComparison.completedBatches')} ({batches.filter((b) => b.isFullyBilled).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={cn(
                'px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer whitespace-nowrap',
                statusFilter === 'all'
                  ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-2xs border border-[var(--color-border)]'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              )}
            >
              {t('billing.batchExitComparison.allBatches')} ({batches.length})
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Mode Segment */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] text-xs shrink-0">
              <button
                type="button"
                onClick={() => setModeFilter('all')}
                className={cn(
                  'px-2 py-1 rounded-md font-medium transition-colors cursor-pointer',
                  modeFilter === 'all'
                    ? 'bg-[var(--color-surface)] text-[var(--color-primary)] font-bold shadow-2xs'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setModeFilter('udara')}
                className={cn(
                  'px-2 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1',
                  modeFilter === 'udara'
                    ? 'bg-[var(--color-surface)] text-amber-600 dark:text-amber-400 font-bold shadow-2xs'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
              >
                <Plane className="w-3 h-3" />
                Udara
              </button>
              <button
                type="button"
                onClick={() => setModeFilter('laut')}
                className={cn(
                  'px-2 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1',
                  modeFilter === 'laut'
                    ? 'bg-[var(--color-surface)] text-sky-600 dark:text-sky-400 font-bold shadow-2xs'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
              >
                <Ship className="w-3 h-3" />
                Laut
              </button>
            </div>

            {/* Branch Filter Select */}
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs font-semibold text-[var(--color-primary)] shadow-2xs focus:border-[var(--color-tertiary)] focus:outline-none cursor-pointer shrink-0 max-w-[145px] truncate"
              title="Filter batch berdasarkan cabang asal (-- dan SG disatukan)"
            >
              <option value="all">Semua Cabang</option>
              {availableBranches.map((br) => (
                <option key={br.code} value={br.code}>
                  {br.name} ({br.code === 'SG' ? '-- & SG' : br.code})
                </option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-secondary)]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('billing.batchExitComparison.searchPlaceholder')}
                className="w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] placeholder:text-[var(--color-secondary)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--color-tertiary)]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Batches Table List (100% Header & Data Aligned) ── */}
        <div className="border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-surface)]">
          {filteredBatches.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--color-secondary)]">
              <Boxes className="w-8 h-8 mx-auto text-[var(--color-secondary)]/40 mb-2" />
              <p className="font-medium">{t('billing.batchExitComparison.noBatchesFound')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--color-neutral)] border-b border-[var(--color-border)] text-[var(--color-secondary)] text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3 w-40 min-w-[140px]">{t('billing.batchExitComparison.markingCode')}</th>
                    <th className="py-2.5 px-3 w-28 min-w-[100px]">{t('billing.batchExitComparison.exitDate')}</th>
                    <th className="py-2.5 px-3 w-36 min-w-[130px]">{t('billing.batchExitComparison.modeBranch')}</th>
                    <th className="py-2.5 px-3 w-44 min-w-[150px]">Status Customer</th>
                    <th className="py-2.5 px-3 w-36 min-w-[120px] text-center">{t('billing.batchExitComparison.cargoStatus')}</th>
                    <th className="py-2.5 px-3 min-w-[130px]">{t('billing.batchExitComparison.progress')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]/50">
                  {filteredBatches.map((batch) => {
                    const isExpanded = expandedMarking === batch.markingCode
                    const isAir = batch.listType === 1
                    const isFullyBilled = batch.isFullyBilled
                    const isLoadingThis = loadingMarking === batch.markingCode
                    const items = cargoDetails[batch.markingCode] || []
                    const cs = batch.customerStatus

                    return (
                      <Fragment key={batch.markingCode}>
                        <tr className="group hover:bg-[var(--color-neutral)]/30 transition-colors">
                          {/* 1. Expand toggle */}
                          <td className="py-2.5 px-3 w-10 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleExpand(batch.markingCode)}
                              className="p-1 rounded hover:bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer transition-colors"
                              title="Klik untuk rincian kargo batch ini"
                            >
                              {isLoadingThis ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--color-tertiary)]" />
                              ) : isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-[var(--color-tertiary)]" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>

                          {/* 2. Marking Code */}
                          <td className="py-2.5 px-3 w-40 min-w-[140px]">
                            <span className="font-mono font-bold text-xs sm:text-sm text-[var(--color-primary)] hover:text-[var(--color-tertiary)] transition-colors">
                              {batch.markingCode}
                            </span>
                          </td>

                          {/* 3. Exit Date */}
                          <td className="py-2.5 px-3 w-28 min-w-[100px] text-[11px] text-[var(--color-secondary)]">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-[var(--color-secondary)]/70 shrink-0" />
                              <span>{batch.exitDate ? formatDate(batch.exitDate) : '-'}</span>
                            </div>
                          </td>

                          {/* 4. Mode & Branch */}
                          <td className="py-2.5 px-3 w-36 min-w-[130px]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border shrink-0',
                                  isAir
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                    : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                                )}
                              >
                                {isAir ? <Plane className="w-2.5 h-2.5" /> : <Ship className="w-2.5 h-2.5" />}
                                {isAir ? t('billing.batchExitComparison.air') : t('billing.batchExitComparison.sea')}
                              </span>
                              <span
                                className="text-[11px] font-medium text-[var(--color-secondary)] truncate flex items-center gap-1 min-w-0"
                                title={batch.branchCode === 'SG' ? 'Singapore (-- & SG)' : batch.branchName}
                              >
                                <span className="truncate">{batch.branchName}</span>
                                {batch.branchCode === 'SG' && (
                                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold shrink-0">
                                    -- & SG
                                  </span>
                                )}
                              </span>
                            </div>
                          </td>

                          {/* 5. Customer Status Summary per Batch */}
                          <td className="py-2.5 px-3 w-44 min-w-[150px]">
                            <div className="flex items-center gap-1 flex-wrap">
                              {cs && cs.blocked > 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                  title={`${cs.blocked} kargo BLOCKED (${cs.unbilledBlocked} pending)`}
                                >
                                  🚨 {cs.blocked} BLOCKED
                                  {cs.unbilledBlocked > 0 && (
                                    <span className="text-rose-600 dark:text-rose-400 font-extrabold ml-0.5">
                                      ({cs.unbilledBlocked})
                                    </span>
                                  )}
                                </span>
                              )}

                              {cs && cs.warning > 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                  title={`${cs.warning} kargo WARNING (${cs.unbilledWarning} pending)`}
                                >
                                  ⚠️ {cs.warning} WARN
                                  {cs.unbilledWarning > 0 && (
                                    <span className="text-amber-600 dark:text-amber-400 font-extrabold ml-0.5">
                                      ({cs.unbilledWarning})
                                    </span>
                                  )}
                                </span>
                              )}

                              {cs && cs.urgent > 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                                  title={`${cs.urgent} kargo URGENT (${cs.unbilledUrgent} pending)`}
                                >
                                  ⚡ {cs.urgent} URGENT
                                  {cs.unbilledUrgent > 0 && (
                                    <span className="text-sky-600 dark:text-sky-400 font-extrabold ml-0.5">
                                      ({cs.unbilledUrgent})
                                    </span>
                                  )}
                                </span>
                              )}

                              {cs && cs.cod > 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  title={`${cs.cod} kargo COD (${cs.unbilledCod} pending)`}
                                >
                                  💵 {cs.cod} COD
                                  {cs.unbilledCod > 0 && (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold ml-0.5">
                                      ({cs.unbilledCod})
                                    </span>
                                  )}
                                </span>
                              )}

                              {cs && cs.ok > 0 && cs.blocked === 0 && cs.warning === 0 && cs.urgent === 0 && cs.cod === 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-medium text-[var(--color-secondary)] border border-[var(--color-border)]"
                                  title={`${cs.ok} kargo OK`}
                                >
                                  ✓ {cs.ok} OK
                                </span>
                              )}

                              {(!cs || (cs.blocked === 0 && cs.warning === 0 && cs.urgent === 0 && cs.cod === 0 && cs.ok === 0)) && (
                                <span className="text-[10px] text-[var(--color-secondary)]/60">-</span>
                              )}
                            </div>
                          </td>

                          {/* 6. Cargo Status */}
                          <td className="py-2.5 px-3 w-36 min-w-[120px] text-center">
                            <div className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold" title="Sudah Dibuat Bill">
                                ✓ {batch.totalBilled}
                              </span>
                              <span className="text-[var(--color-secondary)]">/</span>
                              <span className="text-[var(--color-primary)] font-semibold" title="Total Kargo Exit">
                                {batch.totalKargo}
                              </span>
                              {batch.totalUnbilled > 0 && (
                                <span className="text-amber-600 dark:text-amber-400 font-bold ml-1" title="Belum Terbit Bill">
                                  ({batch.totalUnbilled} pending)
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 7. Progress Bar */}
                          <td className="py-2.5 px-3 min-w-[130px]">
                            <div className="flex items-center justify-between text-[10px] mb-1 font-mono">
                              <span className={cn('font-bold', isFullyBilled ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
                                {batch.billedPercentage}%
                              </span>
                              {isFullyBilled && (
                                <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium">
                                  <CheckCircle2 className="w-3 h-3" /> Tuntas
                                </span>
                              )}
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-[var(--color-neutral)] overflow-hidden">
                              <div
                                className={cn(
                                  'h-full transition-all duration-300 rounded-full',
                                  isFullyBilled
                                    ? 'bg-emerald-500'
                                    : batch.billedPercentage > 50
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                )}
                                style={{ width: `${batch.billedPercentage}%` }}
                              />
                            </div>
                          </td>
                        </tr>

                        {/* ── Expanded Cargo Table ── */}
                        {isExpanded && (
                          <tr className="bg-[var(--color-neutral)]/20 border-b border-[var(--color-border)]">
                            <td colSpan={7} className="p-3 sm:p-4 animate-fadeIn">
                              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[var(--color-border)]/50">
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1.5">
                                  <span>{t('billing.batchExitComparison.cargoListTitle')} ({batch.markingCode})</span>
                                  <span className="text-[10px] text-[var(--color-secondary)] font-normal">
                                    • {items.length} kargo terdaftar
                                  </span>
                                </h4>
                                <span className="text-[10px] text-[var(--color-secondary)]">
                                  {items.filter((i) => i.isBilled).length} Billed • {items.filter((i) => !i.isBilled).length} Unbilled
                                </span>
                              </div>

                              {isLoadingThis ? (
                                <div className="py-6 flex items-center justify-center gap-2 text-xs text-[var(--color-secondary)]">
                                  <Loader2 className="w-4 h-4 animate-spin text-[var(--color-tertiary)]" />
                                  <span>Memuat kargo dalam batch...</span>
                                </div>
                              ) : items.length === 0 ? (
                                <p className="text-xs text-[var(--color-secondary)] py-3 text-center">
                                  Tidak ada item kargo terdata di batch ini.
                                </p>
                              ) : (
                                <div className="overflow-x-auto max-h-56 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
                                  <table className="w-full text-left text-[11px] border-collapse">
                                    <thead>
                                      <tr className="bg-[var(--color-neutral)] text-[var(--color-secondary)] uppercase tracking-wider text-[10px] border-b border-[var(--color-border)] sticky top-0">
                                        <th className="py-2 px-2.5 w-24">Kode List</th>
                                        <th className="py-2 px-2.5 min-w-[220px]">Pelanggan & Status</th>
                                        <th className="py-2 px-2.5 text-right w-20">Koli</th>
                                        <th className="py-2 px-2.5 text-right w-20">M3</th>
                                        <th className="py-2 px-2.5 text-right w-24">Berat (KG)</th>
                                        <th className="py-2 px-2.5 text-center w-28">Status Bill</th>
                                        <th className="py-2 px-2.5 text-center w-28">Surat Jalan</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)]/40 font-mono">
                                      {items.map((cargo) => {
                                        const cfg = statusConfig[(cargo.custStatus ?? 0) as keyof typeof statusConfig] || statusConfig[0]

                                        return (
                                          <tr key={cargo.listCode} className="hover:bg-[var(--color-neutral)]/40 transition-colors">
                                            <td className="py-2 px-2.5 font-bold text-[var(--color-primary)]">
                                              {cargo.listCode}
                                            </td>
                                            <td className="py-2 px-2.5 font-[var(--font-body)] text-[var(--color-primary)]">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-medium text-xs text-[var(--color-primary)]">
                                                  {cargo.custName}
                                                </span>
                                                {cargo.custCode && (
                                                  <span className="text-[var(--color-secondary)] text-[10px] font-mono">
                                                    ({cargo.custCode})
                                                  </span>
                                                )}

                                                {/* Customer Status Badge */}
                                                <span
                                                  className={cn(
                                                    'inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold border tracking-wider uppercase',
                                                    cargo.custStatus === 4
                                                      ? 'border-rose-500/40 bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                                      : cargo.custStatus === 3
                                                      ? 'border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                                      : cargo.custStatus === 5
                                                      ? 'border-sky-500/40 bg-sky-500/15 text-sky-600 dark:text-sky-400'
                                                      : cargo.custStatus === 2
                                                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                                      : 'border-[var(--color-border)] bg-[var(--color-neutral)] text-[var(--color-secondary)]'
                                                  )}
                                                  title={`Status Customer: ${cfg.label}`}
                                                >
                                                  {cfg.label}
                                                </span>

                                                {cargo.isBroker && <BrokerBadge size="xs" />}
                                              </div>
                                            </td>
                                            <td className="py-2 px-2.5 text-right text-[var(--color-primary)]">
                                              {cargo.coly} {cargo.satuan}
                                            </td>
                                            <td className="py-2 px-2.5 text-right text-[var(--color-primary)]">
                                              {cargo.m3 ? Number(cargo.m3).toFixed(3) : '-'}
                                            </td>
                                            <td className="py-2 px-2.5 text-right text-[var(--color-primary)]">
                                              {cargo.berat ? Number(cargo.berat).toFixed(1) : '-'}
                                            </td>
                                            <td className="py-2 px-2.5 text-center">
                                              {cargo.isBilled ? (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                  ✓ {t('billing.batchExitComparison.statusBilled')}
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                  <AlertCircle className="w-2.5 h-2.5" /> {t('billing.batchExitComparison.statusUnbilled')}
                                                </span>
                                              )}
                                            </td>
                                            <td className="py-2 px-2.5 text-center">
                                              {cargo.sjNo ? (
                                                <span className="text-[10px] font-medium text-[var(--color-secondary)]" title={`SJ: ${cargo.sjNo}`}>
                                                  {cargo.isSent ? '✓ SJ Terkirim' : 'SJ Terbit'}
                                                </span>
                                              ) : (
                                                <span className="text-[10px] text-[var(--color-secondary)]/60">-</span>
                                              )}
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ModalBody>

      <ModalFooter className="flex items-center justify-between">
        <span className="text-xs text-[var(--color-secondary)]">
          Menampilkan <strong className="text-[var(--color-primary)]">{filteredBatches.length}</strong> dari{' '}
          {batches.length} {t('billing.batchExitComparison.batchCount')}
        </span>
        <Button variant="secondary" size="sm" onClick={onClose}>
          Tutup
        </Button>
      </ModalFooter>
    </Modal>
  )
}
