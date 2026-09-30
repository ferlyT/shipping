import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Tag,
  Search,
  Plane,
  Ship,
  RefreshCw,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User,
  Info,
  Scale,
  ShieldAlert,
  FileText,
  X,
  History,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { Modal } from '@/components/ui/Modal'
import { billingApi } from '../services/billing.service'
import { formatCurrency, formatDecimal, formatDateTime, cn, displayCustName } from '@/lib/utils'
import { useToastStore } from '@/stores/toastStore'
import type { CustomerHargaDetailResult } from '../types/billing.types'

export interface CustomerHargaModalProps {
  isOpen: boolean
  onClose: () => void
  custCode: string
  custName?: string
}

export function CustomerHargaModal({
  isOpen,
  onClose,
  custCode,
  custName: propCustName,
}: CustomerHargaModalProps) {
  const { addToast } = useToastStore()
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL')
  const [selectedMode, setSelectedMode] = useState<'ALL' | 'BY AIR' | 'BY SEA'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [onlyEdited, setOnlyEdited] = useState(false)

  const cleanCustCode = custCode?.trim() || ''

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['customerHarga', cleanCustCode],
    queryFn: async () => {
      if (!cleanCustCode) return null
      const res = await billingApi.customerHarga(cleanCustCode)
      return res.data?.data as CustomerHargaDetailResult
    },
    enabled: isOpen && !!cleanCustCode,
    staleTime: 60000,
  })

  const tariffs = useMemo(() => data?.tariffs || [], [data?.tariffs])
  const metadata = data?.metadata
  const resolvedCustName = displayCustName(data?.custName || propCustName || cleanCustCode)

  // Filter tariffs
  const filteredTariffs = useMemo(() => {
    return tariffs.filter((item) => {
      // Branch filter
      if (selectedBranch !== 'ALL' && item.branchCode !== selectedBranch) {
        return false
      }
      // Mode filter
      if (selectedMode !== 'ALL' && item.mode !== selectedMode) {
        return false
      }
      // Only edited filter
      if (onlyEdited && !item.isEdited) {
        return false
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = item.displayName.toLowerCase().includes(q)
        const matchComm = item.commodityType.toLowerCase().includes(q)
        const matchService = item.serviceType.toLowerCase().includes(q)
        const matchBranch = item.branchName.toLowerCase().includes(q) || item.branchCode.toLowerCase().includes(q)
        if (!matchName && !matchComm && !matchService && !matchBranch) {
          return false
        }
      }
      return true
    })
  }, [tariffs, selectedBranch, selectedMode, onlyEdited, searchQuery])

  // Counts
  const counts = useMemo(() => {
    let air = 0
    let sea = 0
    let edited = 0
    for (const t of tariffs) {
      if (t.mode === 'BY AIR') air++
      if (t.mode === 'BY SEA') sea++
      if (t.isEdited) edited++
    }
    return { total: tariffs.length, air, sea, edited }
  }, [tariffs])

  // Excel Export
  const handleExportExcel = () => {
    if (!tariffs.length) {
      addToast({ type: 'warning', message: 'Tidak ada data tarif untuk diekspor' })
      return
    }

    try {
      const exportRows = filteredTariffs.map((t, idx) => ({
        No: idx + 1,
        'Kode Cabang': t.branchCode,
        'Nama Cabang': t.branchName,
        Moda: t.mode === 'BY AIR' ? 'Udara' : 'Laut',
        Layanan: t.serviceType,
        Komoditi: t.commodityType,
        'Tarif Aktif (Rp)': t.hargaAktif,
        'Tarif Awal (Rp)': t.hargaAwal,
        'Status Revisi': t.isEdited ? 'Diedit (Audit)' : 'Master Acuan',
        'Diupdate Oleh': t.auditInfo?.updatedBy || '-',
        'Tgl Update': t.auditInfo?.updateDate ? formatDateTime(t.auditInfo.updateDate) : '-',
      }))

      const ws = XLSX.utils.json_to_sheet(exportRows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Tarif Customer')

      const filename = `Tarif_${cleanCustCode}_${resolvedCustName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`
      XLSX.writeFile(wb, filename)
      addToast({ type: 'success', message: `Berkas Excel ${filename} berhasil diunduh` })
    } catch (err) {
      addToast({ type: 'error', message: 'Gagal mengekspor data ke Excel' })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      className="h-[88vh] max-h-[88vh] flex flex-col font-[var(--font-body)]"
    >
      {/* Header */}
      <Modal.Header
        title={
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Tarif Acuan Customer (tbCustomersHarga)</span>
          </div>
        }
        subtitle={
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-[var(--color-primary)]">{resolvedCustName}</span>
            <span className="font-mono text-xs px-1.5 py-0.2 rounded bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-secondary)]">
              {cleanCustCode}
            </span>
          </div>
        }
        badge={
          tariffs.length > 0 && (
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
              {tariffs.length} Tarif Aktif
            </span>
          )
        }
        onClose={onClose}
      >
        <div className="flex items-center gap-1.5 mr-1">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className={cn(
              'p-1.5 rounded-lg text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer',
              isFetching && 'animate-spin text-amber-500'
            )}
            title="Muat ulang data tarif"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {tariffs.length > 0 && (
            <button
              type="button"
              onClick={handleExportExcel}
              className="p-1.5 rounded-lg text-[var(--color-secondary)] hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-[var(--color-neutral)] transition-colors cursor-pointer"
              title="Ekspor ke Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
          )}
        </div>
      </Modal.Header>

      {/* Body */}
      <Modal.Body className="p-4 sm:p-5 space-y-4 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3.5">
            {/* Skeleton Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl skeleton-shimmer" />
              ))}
            </div>
            {/* Skeleton Table */}
            <div className="space-y-2 pt-2">
              <div className="h-10 rounded-lg skeleton-shimmer" />
              <div className="h-48 rounded-xl skeleton-shimmer" />
            </div>
          </div>
        ) : isError || !data ? (
          <div className="py-12 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[var(--color-primary)]">
                Tarif Customer Tidak Ditemukan
              </h4>
              <p className="text-xs text-[var(--color-secondary)] max-w-md mx-auto">
                Customer <span className="font-semibold text-[var(--color-primary)]">{cleanCustCode}</span> ({resolvedCustName}) belum memiliki data tarif tersimpan di tabel <code className="font-mono text-amber-600 dark:text-amber-400">tbCustomersHarga</code>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Coba Lagi
            </button>
          </div>
        ) : (
          <>
            {/* Metadata & Rules Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Card 1: Tipe Tagihan & Penawaran */}
              <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col justify-between gap-1 shadow-2xs">
                <div className="flex items-center justify-between gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
                  <span>Tipe Tagihan</span>
                  <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                </div>
                <div className="mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold rounded-md bg-blue-500/10 border border-blue-500/40 text-blue-600 dark:text-blue-400">
                    {metadata?.typeTagihanLabel || 'Belum Diatur'}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--color-secondary)] truncate mt-1">
                  Penawaran: <span className="font-medium text-[var(--color-primary)]">{metadata?.penawaran || '-'}</span>
                </div>
              </div>

              {/* Card 2: Batas Rasio Overweight (Laut) */}
              <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col justify-between gap-1 shadow-2xs">
                <div className="flex items-center justify-between gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
                  <span>Rasio Overweight (Laut)</span>
                  <Scale className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                </div>
                <div className="grid grid-cols-3 gap-1.5 mt-1 text-center">
                  <div className="p-1 rounded bg-[var(--color-neutral)] border border-[var(--color-border)]/60">
                    <span className="text-[9px] font-semibold text-[var(--color-secondary)] block">LR</span>
                    <span className="text-[11px] font-bold text-[var(--color-primary)]">
                      {metadata?.rasioLr ? `${metadata.rasioLr} kg` : '-'}
                    </span>
                  </div>
                  <div className="p-1 rounded bg-[var(--color-neutral)] border border-[var(--color-border)]/60">
                    <span className="text-[9px] font-semibold text-[var(--color-secondary)] block">SP</span>
                    <span className="text-[11px] font-bold text-[var(--color-primary)]">
                      {metadata?.rasioSp ? `${metadata.rasioSp} kg` : '-'}
                    </span>
                  </div>
                  <div className="p-1 rounded bg-[var(--color-neutral)] border border-[var(--color-border)]/60">
                    <span className="text-[9px] font-semibold text-[var(--color-secondary)] block">PM</span>
                    <span className="text-[11px] font-bold text-[var(--color-primary)]">
                      {metadata?.rasioPm ? `${metadata.rasioPm} kg` : '-'}
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-[var(--color-secondary)] text-center">
                  Batas berat per m³
                </div>
              </div>

              {/* Card 3: Asuransi */}
              <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col justify-between gap-1 shadow-2xs">
                <div className="flex items-center justify-between gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
                  <span>Tarif Asuransi</span>
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                </div>
                <div className="mt-1">
                  <div className="text-xs font-bold text-[var(--color-primary)]">
                    {metadata?.asuransi ? formatDecimal(metadata.asuransi, 2) : '0% / Standar'}
                  </div>
                  {metadata?.asuransi1 ? (
                    <div className="text-[11px] text-[var(--color-secondary)]">
                      Asuransi 2: <span className="font-semibold text-[var(--color-primary)]">{formatDecimal(metadata.asuransi1, 2)}</span>
                    </div>
                  ) : null}
                </div>
                <div className="text-[10px] text-[var(--color-secondary)]">
                  Biaya proteksi kargo
                </div>
              </div>

              {/* Card 4: Audit & Terakhir Diperbarui */}
              <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col justify-between gap-1 shadow-2xs">
                <div className="flex items-center justify-between gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
                  <span>Pembaruan Master</span>
                  <History className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                </div>
                <div className="mt-1 space-y-0.5">
                  <div className="text-[11px] text-[var(--color-primary)] font-semibold flex items-center gap-1">
                    <User className="w-3 h-3 text-[var(--color-secondary)]" />
                    <span>{metadata?.lastUpdateBy || 'Sistem'}</span>
                  </div>
                  <div className="text-[10px] text-[var(--color-secondary)] flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[var(--color-secondary)]" />
                    <span>{metadata?.lastUpdateDate ? formatDateTime(metadata.lastUpdateDate) : '-'}</span>
                  </div>
                </div>
                <div className="text-[10px] text-[var(--color-secondary)]">
                  {counts.edited > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      {counts.edited} tarif direvisi di audit
                    </span>
                  ) : (
                    <span>Sesuai data master asli</span>
                  )}
                </div>
              </div>
            </div>

            {/* Catatan Tarif Khusus (Note Udara & Laut) */}
            {(metadata?.noteUdara || metadata?.noteLaut) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {metadata?.noteUdara && (
                  <div className="p-2.5 rounded-xl border border-sky-500/40 bg-sky-500/5 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-sky-600 dark:text-sky-400">
                      <Plane className="w-3.5 h-3.5" />
                      <span>Catatan Tarif Udara (Air)</span>
                    </div>
                    <p className="text-[11px] text-[var(--color-primary)] leading-relaxed whitespace-pre-wrap">
                      {metadata.noteUdara}
                    </p>
                  </div>
                )}
                {metadata?.noteLaut && (
                  <div className="p-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/5 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                      <Ship className="w-3.5 h-3.5" />
                      <span>Catatan Tarif Laut (Sea)</span>
                    </div>
                    <p className="text-[11px] text-[var(--color-primary)] leading-relaxed whitespace-pre-wrap">
                      {metadata.noteLaut}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Filter & Toolbar Bar */}
            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2.5">
              {/* Row 1: Branch Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] shrink-0 mr-1">
                  Cabang:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedBranch('ALL')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0',
                    selectedBranch === 'ALL'
                      ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-2xs'
                      : 'bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] border border-[var(--color-border)]'
                  )}
                >
                  Semua ({tariffs.length})
                </button>
                {data.branches.map((b) => (
                  <button
                    key={b.code}
                    type="button"
                    onClick={() => setSelectedBranch(b.code)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1',
                      selectedBranch === b.code
                        ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-2xs'
                        : 'bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] border border-[var(--color-border)]'
                    )}
                  >
                    <span>{b.code}</span>
                    <span className="text-[10px] opacity-75 font-mono">({b.count})</span>
                  </button>
                ))}
              </div>

              {/* Row 2: Mode, Search, & Edited Switch */}
              <div className="flex items-center justify-between gap-2.5 flex-wrap pt-1 border-t border-[var(--color-border)]/60">
                {/* Mode Segmented Controls */}
                <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedMode('ALL')}
                    className={cn(
                      'px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer',
                      selectedMode === 'ALL'
                        ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-2xs'
                        : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                    )}
                  >
                    Semua Moda
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMode('BY AIR')}
                    className={cn(
                      'px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1',
                      selectedMode === 'BY AIR'
                        ? 'bg-[var(--color-surface)] text-sky-600 dark:text-sky-400 shadow-2xs'
                        : 'text-[var(--color-secondary)] hover:text-sky-600 dark:hover:text-sky-400'
                    )}
                  >
                    <Plane className="w-3 h-3" />
                    <span>Udara ({counts.air})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMode('BY SEA')}
                    className={cn(
                      'px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1',
                      selectedMode === 'BY SEA'
                        ? 'bg-[var(--color-surface)] text-emerald-600 dark:text-emerald-400 shadow-2xs'
                        : 'text-[var(--color-secondary)] hover:text-emerald-600 dark:hover:text-emerald-400'
                    )}
                  >
                    <Ship className="w-3 h-3" />
                    <span>Laut ({counts.sea})</span>
                  </button>
                </div>

                {/* Search Bar & Edited Filter */}
                <div className="flex items-center gap-2 flex-1 min-w-[240px] justify-end">
                  {counts.edited > 0 && (
                    <button
                      type="button"
                      onClick={() => setOnlyEdited(!onlyEdited)}
                      className={cn(
                        'px-2 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center gap-1 shrink-0',
                        onlyEdited
                          ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-2xs'
                          : 'border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] bg-[var(--color-neutral)]'
                      )}
                      title="Tampilkan hanya tarif yang pernah direvisi melalui tabel audit"
                    >
                      <History className="w-3 h-3 text-amber-500" />
                      <span>Hanya Revisi ({counts.edited})</span>
                    </button>
                  )}

                  <div className="relative flex-1 max-w-xs">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-secondary)]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari komoditi, layanan..."
                      className="w-full pl-8 pr-7 py-1 text-xs rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)] placeholder-[var(--color-secondary)] focus:outline-hidden focus:border-[var(--color-primary)]"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tariffs List / Table */}
            {filteredTariffs.length === 0 ? (
              <div className="py-10 text-center space-y-1 text-xs text-[var(--color-secondary)]">
                <Info className="w-5 h-5 mx-auto text-[var(--color-secondary)] mb-1" />
                <p className="font-semibold text-[var(--color-primary)]">Tidak ada tarif yang cocok dengan filter</p>
                <p>Coba atur ulang filter cabang, moda, atau kata kunci pencarian.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-2xs">
                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto max-h-[380px] overflow-y-auto no-scrollbar">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-[var(--color-neutral)] border-b border-[var(--color-border)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
                      <tr>
                        <th className="px-3.5 py-2.5">Cabang</th>
                        <th className="px-3.5 py-2.5">Moda</th>
                        <th className="px-3.5 py-2.5">Layanan</th>
                        <th className="px-3.5 py-2.5">Komoditi</th>
                        <th className="px-3.5 py-2.5 text-right">Tarif Aktif</th>
                        <th className="px-3.5 py-2.5 text-center">Status / Revisi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]/60">
                      {filteredTariffs.map((t) => {
                        const isAir = t.mode === 'BY AIR'
                        const isKg = t.commodityType.includes('KG') || t.displayName.includes('KG')
                        const unitLabel = isAir ? '/ kg' : isKg ? '/ kg' : '/ m³'

                        return (
                          <tr
                            key={t.colName}
                            className={cn(
                              'hover:bg-[var(--color-neutral)]/40 transition-colors',
                              t.isEdited && 'bg-amber-500/5'
                            )}
                          >
                            {/* Cabang */}
                            <td className="px-3.5 py-2 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold font-mono text-[var(--color-primary)]">
                                  {t.branchCode}
                                </span>
                                <span className="text-[11px] text-[var(--color-secondary)]">
                                  {t.branchName}
                                </span>
                              </div>
                            </td>

                            {/* Moda */}
                            <td className="px-3.5 py-2 whitespace-nowrap">
                              {isAir ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border border-sky-500/40 text-sky-600 dark:text-sky-400 bg-sky-500/10">
                                  <Plane className="w-2.5 h-2.5" />
                                  <span>Udara</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                                  <Ship className="w-2.5 h-2.5" />
                                  <span>Laut</span>
                                </span>
                              )}
                            </td>

                            {/* Layanan */}
                            <td className="px-3.5 py-2 whitespace-nowrap">
                              <span className="font-medium text-[var(--color-primary)]">
                                {t.serviceType}
                              </span>
                            </td>

                            {/* Komoditi */}
                            <td className="px-3.5 py-2 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-[var(--color-primary)]">
                                  {t.commodityType}
                                </span>
                                <span className="text-[9.5px] font-mono text-[var(--color-secondary)] opacity-60">
                                  ({t.colName})
                                </span>
                              </div>
                            </td>

                            {/* Tarif Aktif */}
                            <td className="px-3.5 py-2 text-right whitespace-nowrap">
                              <div className="flex items-baseline justify-end gap-1 font-mono">
                                <span className="font-bold text-sm text-[var(--color-primary)]">
                                  {formatCurrency(t.hargaAktif)}
                                </span>
                                <span className="text-[10px] text-[var(--color-secondary)] font-normal font-sans">
                                  {unitLabel}
                                </span>
                              </div>
                            </td>

                            {/* Status & Audit */}
                            <td className="px-3.5 py-2 text-center whitespace-nowrap">
                              {t.isEdited ? (
                                <div className="inline-flex flex-col items-center">
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 cursor-help"
                                    title={`Harga awal: ${formatCurrency(t.hargaAwal)} | Diubah oleh ${t.auditInfo?.updatedBy || '-'} pada ${t.auditInfo?.updateDate ? formatDateTime(t.auditInfo.updateDate) : '-'}`}
                                  >
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    <span>Revisi Audit</span>
                                  </span>
                                  <span className="text-[9px] text-[var(--color-secondary)] mt-0.5">
                                    Awal: {formatCurrency(t.hargaAwal)}
                                  </span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border border-[var(--color-border)] text-[var(--color-secondary)]">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                                  <span>Master</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="sm:hidden divide-y divide-[var(--color-border)] max-h-[400px] overflow-y-auto">
                  {filteredTariffs.map((t) => {
                    const isAir = t.mode === 'BY AIR'
                    const isKg = t.commodityType.includes('KG') || t.displayName.includes('KG')
                    const unitLabel = isAir ? '/ kg' : isKg ? '/ kg' : '/ m³'

                    return (
                      <div key={t.colName} className="p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold font-mono text-xs text-[var(--color-primary)]">
                              {t.branchCode}
                            </span>
                            <span className="text-[11px] text-[var(--color-secondary)]">
                              · {t.serviceType}
                            </span>
                          </div>
                          {isAir ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold border border-sky-500/40 text-sky-600 dark:text-sky-400 bg-sky-500/10">
                              <Plane className="w-2.5 h-2.5" /> Udara
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                              <Ship className="w-2.5 h-2.5" /> Laut
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-xs text-[var(--color-primary)]">
                              {t.commodityType}
                            </div>
                            <div className="text-[10px] font-mono text-[var(--color-secondary)]">
                              {t.colName}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-sm text-[var(--color-primary)] font-mono">
                              {formatCurrency(t.hargaAktif)}
                            </div>
                            <div className="text-[10px] text-[var(--color-secondary)]">
                              {unitLabel}
                            </div>
                          </div>
                        </div>

                        {t.isEdited && (
                          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-600 dark:text-amber-400 flex items-center justify-between">
                            <span>Harga Awal: {formatCurrency(t.hargaAwal)}</span>
                            <span>Oleh: {t.auditInfo?.updatedBy || '-'}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </Modal.Body>

      {/* Footer */}
      <Modal.Footer className="flex items-center justify-between px-4 sm:px-5 py-2.5">
        <div className="text-[11px] text-[var(--color-secondary)]">
          Menampilkan <span className="font-bold text-[var(--color-primary)]">{filteredTariffs.length}</span> dari {tariffs.length} tarif
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)] hover:bg-[var(--color-border)]/50 transition-colors cursor-pointer"
        >
          Tutup
        </button>
      </Modal.Footer>
    </Modal>
  )
}
