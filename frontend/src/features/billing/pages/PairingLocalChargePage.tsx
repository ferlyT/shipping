import { useState, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Truck,
  HelpCircle,
  FileText,
  RefreshCw,
  ExternalLink,
  ListOrdered,
  Sparkles,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { useTranslation } from '@/hooks/useTranslation'
import { useToastStore } from '@/stores/toastStore'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/lib/constants'
import { formatNumber, cn } from '@/lib/utils'
import { billingApi } from '../services/billing.service'
import type {
  PairingLocalChargeResult,
  PairingLocalChargeRow,
} from '../types/billing.types'

export function PairingLocalChargePage() {
  const { t } = useTranslation()
  const { addToast } = useToastStore()
  const { user } = useAuthStore()

  // Hak akses: admin dan finance berhak upload
  const canUpload = user?.role === 'admin' || user?.role === 'finance' || user?.permissions?.includes('/*')

  const [activeTab, setActiveTab] = useState<'excel' | 'receipt'>('excel')
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [receiptInput, setReceiptInput] = useState('')
  const [isProcessingReceipts, setIsProcessingReceipts] = useState(false)
  const [pairingResult, setPairingResult] = useState<PairingLocalChargeResult | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isExporting, setIsExporting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle Drag & Drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (!canUpload) {
      addToast({ type: 'warning', message: 'Anda tidak memiliki hak akses untuk mengunggah file' })
      return
    }
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      validateAndSetFile(droppedFile)
    }
  }, [canUpload, addToast]) // eslint-disable-line react-hooks/exhaustive-deps

  const validateAndSetFile = (f: File) => {
    if (!/\.xlsx?$/i.test(f.name)) {
      addToast({ type: 'error', message: 'Format file harus .xlsx atau .xls' })
      return
    }
    setFile(f)
  }

  // Proses Upload & Pairing
  const handleProcessUpload = async () => {
    if (!file) return
    setIsUploading(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await billingApi.pairingLocalCharge(formData)
      const data = res.data?.data
      if (data) {
        setPairingResult(data)
        addToast({
          type: 'success',
          message: `Berhasil memproses ${data.summary.totalRows} baris tagihan!`,
        })
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Gagal memproses file Excel'
      addToast({ type: 'error', message: msg })
    } finally {
      setIsUploading(false)
    }
  }

  // Hitung jumlah resi yang terdeteksi dari input teks
  const detectedReceiptCount = useMemo(() => {
    if (!receiptInput.trim()) return 0
    const rawTokens = receiptInput
      .split(/[\r\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    return rawTokens.length
  }, [receiptInput])

  // Proses Pairing Manual No Resi
  const handleProcessReceipts = async () => {
    if (!receiptInput.trim()) return
    setIsProcessingReceipts(true)

    try {
      const res = await billingApi.pairingLocalChargeByReceipts(receiptInput)
      const data = res.data?.data
      if (data) {
        setPairingResult(data)
        addToast({
          type: 'success',
          message: `Berhasil memproses ${data.summary.totalRows} baris resi!`,
        })
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Gagal memproses nomor resi'
      addToast({ type: 'error', message: msg })
    } finally {
      setIsProcessingReceipts(false)
    }
  }

  // Export Excel
  const handleExportExcel = async () => {
    if (!pairingResult || pairingResult.rows.length === 0) return
    setIsExporting(true)
    try {
      const res = await billingApi.exportPairingLocalChargeExcel(pairingResult.rows)
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Pairing-Local-Charge-${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      addToast({ type: 'success', message: 'File Excel hasil pairing berhasil diunduh' })
    } catch (err: any) {
      addToast({ type: 'error', message: err?.message || 'Gagal mengekspor file Excel' })
    } finally {
      setIsExporting(false)
    }
  }

  // Print / PDF
  const handlePrint = () => {
    window.print()
  }

  // Filter Data
  const filteredRows = useMemo(() => {
    if (!pairingResult?.rows) return []

    return pairingResult.rows.filter((row) => {
      // Filter status
      if (statusFilter !== 'all') {
        if (statusFilter === 'COCOK' && row.validationStatus !== 'COCOK') return false
        if (statusFilter === 'SELISIH' && row.validationStatus !== 'SELISIH') return false
        if (statusFilter === 'BILL_BELUM_ADA' && row.validationStatus !== 'BILL_BELUM_ADA') return false
        if (statusFilter === 'BELUM_EXIT' && row.validationStatus !== 'BELUM_EXIT') return false
        if (statusFilter === 'SUDAH_EXIT' && row.validationStatus !== 'SUDAH_EXIT') return false
        if (statusFilter === 'TIDAK_DITEMUKAN' && row.validationStatus !== 'TIDAK_DITEMUKAN') return false
      }

      // Filter search
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const matchReceipt = row.receiptNo?.toLowerCase().includes(q)
        const matchCustomer = row.customer?.toLowerCase().includes(q)
        const matchMark = row.shippingMark?.toLowerCase().includes(q)
        const matchInv = row.invNo?.toLowerCase().includes(q)
        const matchNote = row.validationNote?.toLowerCase().includes(q)
        const matchDriver = row.operationalInfo?.supir?.toLowerCase().includes(q)
        if (!matchReceipt && !matchCustomer && !matchMark && !matchInv && !matchNote && !matchDriver) {
          return false
        }
      }

      return true
    })
  }, [pairingResult, statusFilter, search])

  const isProcessing = isUploading || isProcessingReceipts
  const summary = pairingResult?.summary

  return (
    <div className="p-3 sm:p-6 lg:p-8 w-full space-y-5 sm:space-y-6 font-[var(--font-body)] animate-fadeIn pb-24">
      {/* Header & Breadcrumbs */}
      <div className="print:hidden">
        <PageHeader
          title={t('billing.pairingLocalCharge.title')}
          breadcrumbs={[
            { label: t('module.finance'), path: ROUTES.BILLING },
            { label: t('nav.billing'), path: ROUTES.BILLING_LIST },
            { label: t('billing.pairingLocalCharge.title') },
          ]}
          actions={
            pairingResult && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExportExcel}
                  disabled={isExporting}
                  className="bg-transparent border-[var(--color-border)] text-emerald-600 dark:text-emerald-400 hover:border-emerald-500"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  {isExporting ? 'Mengekspor...' : t('billing.pairingLocalCharge.btnExportExcel')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePrint}
                  className="bg-transparent border-[var(--color-border)] hover:border-[var(--color-tertiary)]"
                >
                  <Printer className="w-4 h-4 mr-1.5" />
                  {t('billing.pairingLocalCharge.btnExportPdf')}
                </Button>
              </div>
            )
          }
        />
        <p className="text-xs sm:text-sm text-[var(--color-secondary)] -mt-3">
          {t('billing.pairingLocalCharge.subtitle')}
        </p>
      </div>

      {/* Upload Dropzone & Manual Receipt Section (Hidden saat print) */}
      <div className="print:hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 shadow-xs space-y-4">
        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[var(--color-neutral)]/40 border border-[var(--color-border)] w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('excel')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150',
              activeTab === 'excel'
                ? 'bg-transparent border border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs'
                : 'border border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            )}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{t('billing.pairingLocalCharge.tabUploadExcel')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('receipt')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150',
              activeTab === 'receipt'
                ? 'bg-transparent border border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs'
                : 'border border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            )}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>{t('billing.pairingLocalCharge.tabInputReceipt')}</span>
            {detectedReceiptCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-transparent border border-[var(--color-tertiary)]/50 text-[var(--color-tertiary)] font-bold">
                {detectedReceiptCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Upload Excel Dropzone */}
        {activeTab === 'excel' && (
          <div className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 sm:p-8 cursor-pointer transition-all duration-200',
                isDragging
                  ? 'border-[var(--color-tertiary)] bg-[var(--color-tertiary)]/5'
                  : 'border-[var(--color-border)] hover:border-[var(--color-tertiary)]/60 bg-[var(--color-neutral)]/30'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) validateAndSetFile(f)
                }}
              />
              <div className="p-3 rounded-full bg-transparent border border-[var(--color-border)] mb-3 text-[var(--color-tertiary)]">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--color-primary)]">
                {file ? file.name : t('billing.pairingLocalCharge.uploadTitle')}
              </h3>
              <p className="text-xs text-[var(--color-secondary)] mt-1 text-center max-w-md">
                {file
                  ? `${(file.size / 1024).toFixed(1)} KB — Klik tombol di bawah untuk memproses data`
                  : t('billing.pairingLocalCharge.uploadDesc')}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 text-xs text-[var(--color-secondary)]">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <span>Mendukung file .xlsx dan .xls (contoh: HK 0726_L & C.xlsx)</span>
              </div>

              <div className="flex items-center gap-2">
                {file && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    disabled={isUploading}
                    className="text-xs text-[var(--color-secondary)]"
                  >
                    Batal
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleProcessUpload}
                  disabled={!file || isProcessing || !canUpload}
                  className="bg-transparent border border-[var(--color-tertiary)] text-[var(--color-tertiary)] hover:bg-[var(--color-tertiary)]/10"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {t('billing.pairingLocalCharge.processing')}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {t('billing.pairingLocalCharge.btnUpload')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Manual Input No. Resi (Multi) */}
        {activeTab === 'receipt' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--color-primary)] flex items-center gap-1.5">
                  <ListOrdered className="w-3.5 h-3.5 text-[var(--color-tertiary)]" />
                  <span>{t('billing.pairingLocalCharge.receiptInputLabel')}</span>
                  {detectedReceiptCount > 0 && (
                    <span className="text-[11px] font-normal text-[var(--color-secondary)]">
                      ({detectedReceiptCount} resi terdeteksi)
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptInput(
                        'HK260703-007\nHK260703-014,5\nHK260703-015\nHK260703-020\nHK260703-033'
                      )
                    }}
                    className="text-[11px] text-[var(--color-tertiary)] hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Tempel Contoh
                  </button>
                  {receiptInput && (
                    <button
                      type="button"
                      onClick={() => setReceiptInput('')}
                      className="text-[11px] text-[var(--color-secondary)] hover:text-rose-500"
                    >
                      Bersihkan
                    </button>
                  )}
                </div>
              </div>

              <textarea
                value={receiptInput}
                onChange={(e) => setReceiptInput(e.target.value)}
                placeholder={t('billing.pairingLocalCharge.receiptInputPlaceholder')}
                rows={5}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-neutral)]/20 p-3 text-xs font-mono text-[var(--color-primary)] placeholder-[var(--color-secondary)]/60 focus:outline-none focus:border-[var(--color-tertiary)] focus:ring-1 focus:ring-[var(--color-tertiary)] transition-all resize-y"
              />
              <p className="text-[11px] text-[var(--color-secondary)]">
                {t('billing.pairingLocalCharge.receiptInputHint')}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="text-xs text-[var(--color-secondary)]">
                {detectedReceiptCount > 0 ? (
                  <span>
                    Siap memproses <strong className="text-[var(--color-primary)]">{detectedReceiptCount}</strong> nomor resi
                  </span>
                ) : (
                  <span>Ketik atau tempel daftar nomor resi di atas</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleProcessReceipts}
                  disabled={!receiptInput.trim() || isProcessing || !canUpload}
                  className="bg-transparent border border-[var(--color-tertiary)] text-[var(--color-tertiary)] hover:bg-[var(--color-tertiary)]/10"
                >
                  {isProcessingReceipts ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {t('billing.pairingLocalCharge.processing')}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {t('billing.pairingLocalCharge.btnProcessReceipts')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading Skeleton Shimmer saat proses pairing berjalan */}
      {isProcessing ? (
        <PairingLocalChargeSkeleton />
      ) : pairingResult ? (
        <>
          {/* KPI Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
              <KpiMetricCard
                label={t('billing.pairingLocalCharge.totalRows')}
                value={summary.totalRows}
                icon={FileText}
                color="border-[var(--color-border)] text-[var(--color-primary)]"
                active={statusFilter === 'all'}
                onClick={() => setStatusFilter('all')}
              />
              <KpiMetricCard
                label={t('billing.pairingLocalCharge.totalCocok')}
                value={summary.totalCocok}
                icon={CheckCircle2}
                color="border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                active={statusFilter === 'COCOK'}
                onClick={() => setStatusFilter('COCOK')}
              />
              <KpiMetricCard
                label={t('billing.pairingLocalCharge.totalSelisih')}
                value={summary.totalSelisih}
                icon={AlertTriangle}
                color="border-rose-500/40 text-rose-600 dark:text-rose-400"
                active={statusFilter === 'SELISIH'}
                onClick={() => setStatusFilter('SELISIH')}
              />
              <KpiMetricCard
                label={t('billing.pairingLocalCharge.totalBillBelumAda')}
                value={summary.totalBillBelumAda}
                icon={Clock}
                color="border-amber-500/40 text-amber-600 dark:text-amber-400"
                active={statusFilter === 'BILL_BELUM_ADA'}
                onClick={() => setStatusFilter('BILL_BELUM_ADA')}
              />
              <KpiMetricCard
                label={t('billing.pairingLocalCharge.totalBelumExit')}
                value={summary.totalBelumExit}
                icon={Clock}
                color="border-sky-500/40 text-sky-600 dark:text-sky-400"
                active={statusFilter === 'BELUM_EXIT'}
                onClick={() => setStatusFilter('BELUM_EXIT')}
              />
              <KpiMetricCard
                label={t('billing.pairingLocalCharge.totalSudahExit')}
                value={summary.totalSudahExit}
                icon={Truck}
                color="border-indigo-500/40 text-indigo-600 dark:text-indigo-400"
                active={statusFilter === 'SUDAH_EXIT'}
                onClick={() => setStatusFilter('SUDAH_EXIT')}
              />
              <KpiMetricCard
                label={t('billing.pairingLocalCharge.totalTidakDitemukan')}
                value={summary.totalTidakDitemukan}
                icon={HelpCircle}
                color="border-slate-500/40 text-slate-600 dark:text-slate-400"
                active={statusFilter === 'TIDAK_DITEMUKAN'}
                onClick={() => setStatusFilter('TIDAK_DITEMUKAN')}
              />
            </div>
          )}

          {/* Toolbar: Search & Filter Tabs */}
          <div className="print:hidden flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-secondary)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('billing.pairingLocalCharge.searchPlaceholder')}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] placeholder-[var(--color-secondary)] focus:outline-hidden focus:border-[var(--color-tertiary)]"
              />
            </div>

            <div className="text-xs text-[var(--color-secondary)] self-end sm:self-center">
              Menampilkan <span className="font-semibold text-[var(--color-primary)]">{filteredRows.length}</span> dari {pairingResult.rows.length} baris
            </div>
          </div>

          {/* Spreadsheet Visual Grid Table */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-neutral)] text-[11px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider">
                    <th className="px-3 py-2.5 w-10 text-center">#</th>
                    <th className="px-3 py-2.5 whitespace-nowrap">{t('billing.pairingLocalCharge.colDate')}</th>
                    <th className="px-3 py-2.5 whitespace-nowrap">{t('billing.pairingLocalCharge.colReceiptNo')}</th>
                    <th className="px-3 py-2.5 min-w-[130px] font-sans">{t('billing.pairingLocalCharge.colCustomer')}</th>
                    <th className="px-3 py-2.5 min-w-[120px] font-sans">{t('billing.pairingLocalCharge.colFrom')}</th>
                    <th className="px-2.5 py-2.5 text-right w-14">{t('billing.pairingLocalCharge.colCtn')}</th>
                    <th className="px-2.5 py-2.5 text-right w-16">{t('billing.pairingLocalCharge.colKg')}</th>
                    <th className="px-2.5 py-2.5 text-right w-16">{t('billing.pairingLocalCharge.colCbm')}</th>
                    <th className="px-3 py-2.5 text-right whitespace-nowrap">{t('billing.pairingLocalCharge.colCharge')}</th>
                    <th className="px-3 py-2.5 min-w-[160px]">{t('billing.pairingLocalCharge.colShippingMark')}</th>
                    <th className="px-3 py-2.5 min-w-[160px] whitespace-nowrap bg-[var(--color-tertiary)]/5 border-l border-[var(--color-border)]">
                      {t('billing.pairingLocalCharge.colInvNo')}
                    </th>
                    <th className="px-3 py-2.5 min-w-[240px] font-sans bg-[var(--color-tertiary)]/5 border-l border-[var(--color-border)]">
                      {t('billing.pairingLocalCharge.colValidation')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
                  {filteredRows.length > 0 ? (
                    filteredRows.map((r) => (
                      <tr
                        key={r.rowIndex}
                        className={cn(
                          'hover:bg-[var(--color-neutral)]/40 transition-colors',
                          r.validationStatus === 'SELISIH' && 'bg-rose-500/5',
                          r.validationStatus === 'COCOK' && 'hover:bg-emerald-500/5'
                        )}
                      >
                        <td className="px-3 py-2 text-center text-[var(--color-secondary)] text-[10px]">
                          {r.rowIndex}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-[var(--color-primary)]">
                          {r.date || '—'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap font-bold text-[var(--color-primary)]">
                          <div className="flex items-center gap-1">
                            <span>{r.receiptNo || '—'}</span>
                            {r.receiptNosParsed.length > 1 && (
                              <span
                                title={`Dipecah menjadi: ${r.receiptNosParsed.join(', ')}`}
                                className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30 cursor-help"
                              >
                                +{r.receiptNosParsed.length - 1}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 font-sans font-medium text-[var(--color-primary)] truncate max-w-[150px]" title={r.customer}>
                          {r.customer || '—'}
                        </td>
                        <td className="px-3 py-2 font-sans text-[var(--color-secondary)] truncate max-w-[140px]" title={r.from}>
                          {r.from || '—'}
                        </td>
                        <td className="px-2.5 py-2 text-right tabular-nums text-[var(--color-primary)]">
                          {r.ctn || '—'}
                        </td>
                        <td className="px-2.5 py-2 text-right tabular-nums text-[var(--color-primary)]">
                          {r.kg || '—'}
                        </td>
                        <td className="px-2.5 py-2 text-right tabular-nums text-[var(--color-primary)]">
                          {r.cbm || '—'}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap font-bold tabular-nums text-[var(--color-primary)]">
                          {formatNumber(r.charge)}
                        </td>
                        <td className="px-3 py-2 text-[var(--color-primary)] font-semibold truncate max-w-[180px]" title={r.shippingMark}>
                          {r.shippingMark || '—'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap border-l border-[var(--color-border)] bg-[var(--color-surface)]">
                          {r.invNos && r.invNos.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {r.invNos.map((inv) => {
                                const cleanInv = inv.replace(/[\x00-\x1F\x7F]/g, '').trim()
                                return (
                                  <Link
                                    key={cleanInv}
                                    to={ROUTES.BILLING_DETAIL(cleanInv)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 font-bold text-sky-600 dark:text-sky-400 hover:underline"
                                    title={`Buka detail invoice ${cleanInv}`}
                                  >
                                    <span>{cleanInv}</span>
                                    <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                  </Link>
                                )
                              })}
                            </div>
                          ) : r.invNo ? (
                            <Link
                              to={ROUTES.BILLING_DETAIL(r.invNo.replace(/[\x00-\x1F\x7F]/g, '').trim())}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-bold text-sky-600 dark:text-sky-400 hover:underline"
                              title="Klik untuk membuka detail invoice"
                            >
                              <span>{r.invNo.replace(/[\x00-\x1F\x7F]/g, '').trim()}</span>
                              <ExternalLink className="w-3 h-3 opacity-70" />
                            </Link>
                          ) : (
                            <span className="text-[var(--color-secondary)] italic text-[11px]">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-sans border-l border-[var(--color-border)] bg-[var(--color-surface)]">
                          <ValidationStatusCell row={r} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={12} className="px-4 py-8 text-center text-xs text-[var(--color-secondary)]">
                        Tidak ada data yang cocok dengan kriteria pencarian atau filter status.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          icon={<FileSpreadsheet className="w-7 h-7" />}
          title="Belum Ada Data Pairing"
          description={t('billing.pairingLocalCharge.emptyState')}
        />
      )}
    </div>
  )
}

function PairingLocalChargeSkeleton() {
  const { t } = useTranslation()

  return (
    <div className="space-y-5 sm:space-y-6 animate-fadeIn font-[var(--font-body)]">
      {/* Processing Status Banner */}
      <div className="rounded-xl border border-[var(--color-tertiary)]/40 bg-[var(--color-tertiary)]/5 p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-transparent border border-[var(--color-tertiary)]/50 text-[var(--color-tertiary)]">
            <RefreshCw className="w-4 h-4 animate-spin" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-semibold text-[var(--color-primary)]">
              {t('billing.pairingLocalCharge.skeletonTitle')}
            </p>
            <p className="text-[11px] text-[var(--color-secondary)]">
              {t('billing.pairingLocalCharge.skeletonSubtitle')}
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <div className="h-2.5 w-28 rounded-full skeleton-shimmer" />
        </div>
      </div>

      {/* KPI Cards Skeleton (7 cards matching summary) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:p-3.5 shadow-xs space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-14 rounded skeleton-shimmer" />
              <div className="h-3.5 w-3.5 rounded-full skeleton-shimmer" />
            </div>
            <div className="h-6 w-12 rounded skeleton-shimmer mt-1" />
          </div>
        ))}
      </div>

      {/* Toolbar Skeleton */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="h-9 w-full max-w-md rounded-lg skeleton-shimmer" />
        <div className="h-4 w-36 rounded skeleton-shimmer self-end sm:self-center" />
      </div>

      {/* Spreadsheet Visual Grid Table Skeleton */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-neutral)] text-[11px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider">
                <th className="px-3 py-2.5 w-10 text-center">#</th>
                <th className="px-3 py-2.5 whitespace-nowrap">{t('billing.pairingLocalCharge.colDate')}</th>
                <th className="px-3 py-2.5 whitespace-nowrap">{t('billing.pairingLocalCharge.colReceiptNo')}</th>
                <th className="px-3 py-2.5 min-w-[130px] font-sans">{t('billing.pairingLocalCharge.colCustomer')}</th>
                <th className="px-3 py-2.5 min-w-[120px] font-sans">{t('billing.pairingLocalCharge.colFrom')}</th>
                <th className="px-2.5 py-2.5 text-right w-14">{t('billing.pairingLocalCharge.colCtn')}</th>
                <th className="px-2.5 py-2.5 text-right w-16">{t('billing.pairingLocalCharge.colKg')}</th>
                <th className="px-2.5 py-2.5 text-right w-16">{t('billing.pairingLocalCharge.colCbm')}</th>
                <th className="px-3 py-2.5 text-right whitespace-nowrap">{t('billing.pairingLocalCharge.colCharge')}</th>
                <th className="px-3 py-2.5 min-w-[160px]">{t('billing.pairingLocalCharge.colShippingMark')}</th>
                <th className="px-3 py-2.5 min-w-[160px] whitespace-nowrap bg-[var(--color-tertiary)]/5 border-l border-[var(--color-border)]">
                  {t('billing.pairingLocalCharge.colInvNo')}
                </th>
                <th className="px-3 py-2.5 min-w-[240px] font-sans bg-[var(--color-tertiary)]/5 border-l border-[var(--color-border)]">
                  {t('billing.pairingLocalCharge.colValidation')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-3 py-3 text-center">
                    <div className="h-3 w-4 rounded skeleton-shimmer mx-auto" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-3 w-16 rounded skeleton-shimmer" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-3.5 w-24 rounded skeleton-shimmer" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-3.5 w-28 rounded skeleton-shimmer" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-3 w-20 rounded skeleton-shimmer" />
                  </td>
                  <td className="px-2.5 py-3 text-right">
                    <div className="h-3 w-7 rounded skeleton-shimmer ml-auto" />
                  </td>
                  <td className="px-2.5 py-3 text-right">
                    <div className="h-3 w-10 rounded skeleton-shimmer ml-auto" />
                  </td>
                  <td className="px-2.5 py-3 text-right">
                    <div className="h-3 w-10 rounded skeleton-shimmer ml-auto" />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="h-3.5 w-14 rounded skeleton-shimmer ml-auto" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-3 w-24 rounded skeleton-shimmer" />
                  </td>
                  <td className="px-3 py-3 border-l border-[var(--color-border)]">
                    <div className="h-3.5 w-28 rounded skeleton-shimmer" />
                  </td>
                  <td className="px-3 py-3 border-l border-[var(--color-border)]">
                    <div className="h-5 w-24 rounded-full skeleton-shimmer" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function KpiMetricCard({
  label,
  value,
  icon: Icon,
  color,
  active,
  onClick,
}: {
  label: string
  value: number
  icon: any
  color: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border bg-transparent p-3 sm:p-3.5 shadow-xs cursor-pointer transition-all duration-150',
        color,
        active ? 'ring-2 ring-[var(--color-tertiary)] bg-[var(--color-tertiary)]/5' : 'hover:bg-[var(--color-neutral)]/20'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider font-semibold font-[var(--font-label)] text-[var(--color-secondary)] truncate">
          {label}
        </span>
        <Icon className="w-3.5 h-3.5 opacity-80 shrink-0" />
      </div>
      <p className="mt-1 text-lg sm:text-xl font-bold font-mono tracking-tight text-[var(--color-primary)]">
        {value}
      </p>
    </div>
  )
}

function ValidationStatusCell({ row }: { row: PairingLocalChargeRow }) {
  const { validationStatus, validationNote, chargeDb, diffCharge } = row

  switch (validationStatus) {
    case 'COCOK':
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="success" className="bg-transparent border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] px-1.5 py-0">
            ✓ COCOK
          </Badge>
          <span className="text-[10px] text-[var(--color-secondary)]">
            (DB: {formatNumber(chargeDb)})
          </span>
        </div>
      )

    case 'SELISIH':
      return (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <Badge variant="danger" className="bg-transparent border border-rose-500/40 text-rose-600 dark:text-rose-400 font-bold text-[10px] px-1.5 py-0">
              SELISIH
            </Badge>
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              {diffCharge > 0 ? `+${formatNumber(diffCharge)}` : formatNumber(diffCharge)}
            </span>
          </div>
          <span className="text-[10px] text-[var(--color-secondary)]">
            DB: {formatNumber(chargeDb)}
          </span>
        </div>
      )

    case 'BILL_BELUM_ADA':
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="warning" className="bg-transparent border border-amber-500/40 text-amber-600 dark:text-amber-400 font-semibold text-[10px] px-1.5 py-0">
            BILL BELUM DIBUAT
          </Badge>
          {chargeDb > 0 && (
            <span className="text-[10px] text-[var(--color-secondary)]">
              fdFc: {formatNumber(chargeDb)}
            </span>
          )}
        </div>
      )

    case 'BELUM_EXIT':
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge className="bg-transparent border border-sky-500/40 text-sky-600 dark:text-sky-400 font-semibold text-[10px] px-1.5 py-0">
            BELUM EXIT
          </Badge>
          <span className="text-[10px] text-[var(--color-secondary)] truncate max-w-[200px]" title={validationNote}>
            {validationNote}
          </span>
        </div>
      )

    case 'SUDAH_EXIT':
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge className="bg-transparent border border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-semibold text-[10px] px-1.5 py-0">
            SUDAH EXIT
          </Badge>
          <span className="text-[10px] text-[var(--color-secondary)] truncate max-w-[200px]" title={validationNote}>
            {validationNote}
          </span>
        </div>
      )

    case 'TIDAK_DITEMUKAN':
    default:
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="default" className="bg-transparent border border-slate-500/40 text-slate-500 font-medium text-[10px] px-1.5 py-0">
            TIDAK DITEMUKAN
          </Badge>
        </div>
      )
  }
}

export default PairingLocalChargePage
