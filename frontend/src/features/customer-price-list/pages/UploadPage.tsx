import { useCallback, useRef, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Upload as UploadIcon,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Info,
  Search,
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { PageHeader } from '@/components/ui/PageHeader'
import { ROUTES } from '@/lib/constants'
import { Button } from '@/components/ui/Button'
import { useDebounce } from '@/hooks/useDebounce'
import { customerPriceListApi } from '../services/customerPriceList.service'
import { customersApi } from '@/features/customers/services/customers.service'
import type { CustomerPriceListUploadResult } from '../types'

interface CustomerResult {
  fdCustCode: string
  fdCustName: string | null
}

const STATUS_CLASS: Record<CustomerPriceListUploadResult['status'], string> = {
  PARSED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25',
  PARTIAL: 'bg-amber-500/10 text-amber-600 border-amber-500/25',
  FAILED: 'bg-rose-500/10 text-rose-600 border-rose-500/25',
}

const STATUS_LABEL: Record<CustomerPriceListUploadResult['status'], string> = {
  PARSED: 'Berhasil Sepenuhnya',
  PARTIAL: 'Berhasil Sebagian',
  FAILED: 'Gagal Diproses',
}

function defaultEffectiveDate() {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

export function UploadPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [effectiveDate, setEffectiveDate] = useState(defaultEffectiveDate())
  const [custCode, setCustCode] = useState('')
  const [custName, setCustName] = useState('')

  // Customer search
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [searchResults, setSearchResults] = useState<CustomerResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<CustomerPriceListUploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const resultRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!debouncedSearch) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    customersApi
      .list({ search: debouncedSearch, limit: 10 })
      .then((res: any) => {
        const data = res.data?.data || res.data || []
        setSearchResults(data)
      })
      .catch(() => setSearchResults([]))
      .finally(() => setIsSearching(false))
  }, [debouncedSearch])

  const handleSelectCustomer = (c: CustomerResult) => {
    setCustCode(c.fdCustCode)
    setCustName(c.fdCustName || '-')
    setSearch('')
    setShowDropdown(false)
  }

  const handleFile = (f: File) => {
    if (!/\.xlsx?$/i.test(f.name)) {
      setError('Format file harus .xlsx atau .xls')
      return
    }
    setFile(f)
    setResult(null)
    setError(null)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  const handleSubmit = async () => {
    if (!file || !effectiveDate || !custCode) return
    setUploading(true)
    setProgress(0)
    setError(null)
    setResult(null)

    const form = new FormData()
    form.append('file', file)
    form.append('effectiveDate', effectiveDate)

    const progressInterval = setInterval(() => {
      setProgress((p) => (p < 90 ? p + 10 : p))
    }, 300)

    try {
      const res = await customerPriceListApi.upload(custCode, form)
      clearInterval(progressInterval)
      setProgress(100)
      const data = (res.data as any)?.data ?? res.data
      setResult(data)
      setTimeout(
        () => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
        100
      )
    } catch (err: any) {
      clearInterval(progressInterval)
      setProgress(0)
      setError(err?.response?.data?.message ?? err?.message ?? 'Gagal mengupload file')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0 space-y-6 bg-[var(--color-surface)] font-[var(--font-body)] animate-fadeIn pb-24">
      <PageHeader
        title={t('customerPriceList.uploadTitle')}
        subtitle={t('customerPriceList.uploadSubtitle')}
        breadcrumbs={[
          { label: t('module.finance'), path: ROUTES.BILLING },
          { label: t('nav.customerPriceList'), path: ROUTES.CUSTOMER_PRICE_LIST },
          { label: t('common.add') },
        ]}
        actions={
          <Link to={ROUTES.CUSTOMER_PRICE_LIST}>
            <Button variant="secondary" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              {t('common.cancel')}
            </Button>
          </Link>
        }
      />

      {/* Info banner */}
      <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <Info size={16} className="shrink-0 mt-0.5" />
        <p>
          Format file: <strong>.xlsx / .xls</strong>. Pilih customer tujuan dan tentukan tanggal berlaku. Sheet berisi blok <strong>"BY SEA"</strong> atau <strong>"BY AIR"</strong>, diikuti baris branch, dan baris harga per kategori.
        </p>
      </div>

      <div className="card border border-[var(--color-border)] rounded-xl p-5 space-y-5 bg-[var(--color-surface)] shadow-xs">
        {/* Customer Selection */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-secondary)] mb-1.5">
            Customer <span className="text-rose-500">*</span>
          </label>
          {!custCode ? (
            <div className="relative max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setShowDropdown(true)
                  }}
                  onFocus={() => setShowDropdown(true)}
                  disabled={uploading}
                  placeholder="Ketik kode atau nama customer..."
                  className="w-full pl-10 pr-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50"
                />
              </div>
              {showDropdown && (search || searchResults.length > 0) && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-4 text-sm text-center text-slate-500">Mencari...</div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((c) => (
                      <button
                        key={c.fdCustCode}
                        type="button"
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm focus:outline-none focus:bg-slate-50"
                      >
                        <span className="font-semibold text-slate-700">{c.fdCustCode}</span>
                        <span className="text-slate-500 ml-2">— {c.fdCustName || 'No Name'}</span>
                      </button>
                    ))
                  ) : search ? (
                    <div className="p-4 text-sm text-center text-slate-500">Tidak ada hasil</div>
                  ) : null}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-blue-50/80 border border-blue-200 rounded-lg max-w-md">
              <div>
                <div className="font-semibold text-blue-900 text-sm">{custCode}</div>
                <div className="text-xs text-blue-700">{custName}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setCustCode('')}
                disabled={uploading}
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
              >
                <X className="w-4 h-4 mr-1" /> Ganti
              </Button>
            </div>
          )}
        </div>

        {/* Effective Date */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-secondary)] mb-1.5">
            {t('priceList.effectiveDate')} <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            disabled={uploading}
            className="w-full sm:w-64 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50"
          />
          <p className="text-xs text-[var(--color-secondary)] mt-1">
            Tanggal berlakunya harga khusus dalam file ini untuk customer terpilih.
          </p>
        </div>

        {/* Drop zone */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-secondary)] mb-1.5">
            File Excel <span className="text-rose-500">*</span>
          </label>
          <div
            onClick={() => !uploading && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
              dragging
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                : file
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-neutral)]'
            } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
            {file ? (
              <>
                <FileSpreadsheet size={32} className="text-emerald-500" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-[var(--color-primary)]">{file.name}</p>
                  <p className="text-xs text-[var(--color-secondary)] mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                    setResult(null)
                  }}
                  className="absolute top-2 right-2 p-1 rounded-full hover:bg-rose-100 text-[var(--color-secondary)] hover:text-rose-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <UploadIcon size={32} className="text-[var(--color-secondary)]" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-[var(--color-primary)]">
                    Klik atau drag & drop file
                  </p>
                  <p className="text-xs text-[var(--color-secondary)] mt-0.5">
                    Mendukung .xlsx dan .xls
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Upload progress */}
        {uploading && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[var(--color-secondary)]">
              <span className="flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" />
                Mengupload & memproses…
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm">
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        {/* Submit */}
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!file || !effectiveDate || !custCode || uploading}
          className="w-full justify-center"
        >
          {uploading ? (
            <>
              <Loader2 size={15} className="animate-spin mr-2" />
              Memproses…
            </>
          ) : (
            <>
              <UploadIcon size={15} className="mr-2" />
              Upload Price List Customer
            </>
          )}
        </Button>
      </div>

      {/* Result Card */}
      {result && (
        <div
          ref={resultRef}
          className="card border border-[var(--color-border)] rounded-xl p-5 space-y-4 bg-[var(--color-surface)] shadow-xs"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-primary)]">
                Upload Selesai
              </h3>
              <span
                className={`inline-block mt-1 text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                  STATUS_CLASS[result.status]
                }`}
              >
                {STATUS_LABEL[result.status]}
              </span>
            </div>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {[
              { label: 'Upload ID', value: `#${result.uploadId}` },
              { label: 'Customer', value: result.fdCustCode },
              { label: 'Jumlah Item', value: result.itemCount.toLocaleString('id-ID') },
              {
                label: 'Tanggal Berlaku',
                value: result.effectiveDate
                  ? new Date(result.effectiveDate).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : '—',
              },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[var(--color-neutral)] rounded-lg p-3">
                <dt className="text-[0.7rem] uppercase font-semibold tracking-wider text-[var(--color-secondary)] mb-0.5">
                  {label}
                </dt>
                <dd className="font-semibold text-[var(--color-primary)]">{value}</dd>
              </div>
            ))}
          </dl>

          {result.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1.5">
                Peringatan Parser ({result.warnings.length})
              </p>
              <ul className="space-y-1">
                {result.warnings.map((w, i) => (
                  <li key={i} className="text-xs text-amber-700 flex gap-1.5">
                    <span className="shrink-0">⚠</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/mshipping/finance/customer-price-list/uploads/${result.uploadId}`)}
            >
              Lihat Detail Upload
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(ROUTES.CUSTOMER_PRICE_LIST_DETAIL(result.fdCustCode))}
            >
              Riwayat Customer
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFile(null)
                setResult(null)
                setError(null)
              }}
            >
              Upload Lagi
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
