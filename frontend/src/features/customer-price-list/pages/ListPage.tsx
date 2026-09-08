import { useEffect, useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'
import {
  Upload,
  Eye,
  Search,
  Calendar,
  ArrowRight,
  Tag,
  Sparkles,
  Ship,
  Plane,
  Edit3,
  Trash2,
  Ban,
  FileSpreadsheet,
} from 'lucide-react'
import { customerPriceListApi } from '../services/customerPriceList.service'
import type { CustomerPriceListUploadRow, CustomerSpecialPriceItem } from '../types'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Table, type Column } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { formatDate, formatCurrency } from '@/lib/utils'
import { CustomerCommodityPriceModal } from '../components/CustomerCommodityPriceModal'
import { toast } from '@/stores/toastStore'

export function ListPage() {
  const { t } = useTranslation()

  // Active Tab
  const [activeTab, setActiveTab] = useState<'special_prices' | 'master_uploads'>('special_prices')

  // Master Uploads state
  const [rows, setRows] = useState<CustomerPriceListUploadRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Special Prices state
  const [specialPrices, setSpecialPrices] = useState<CustomerSpecialPriceItem[]>([])
  const [isLoadingSpecial, setIsLoadingSpecial] = useState(true)
  const [specialSearch, setSpecialSearch] = useState('')
  const [specialMode, setSpecialMode] = useState<string>('ALL')
  const [specialStatus, setSpecialStatus] = useState<'ALL' | 'ACTIVE' | 'EXPIRED'>('ACTIVE')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<CustomerSpecialPriceItem | null>(null)

  // Confirm delete / deactivate
  const [itemToDelete, setItemToDelete] = useState<CustomerSpecialPriceItem | null>(null)
  const [itemToDeactivate, setItemToDeactivate] = useState<CustomerSpecialPriceItem | null>(null)
  const [isProcessingAction, setIsProcessingAction] = useState(false)

  const fetchMasterUploads = useCallback(async () => {
    try {
      setLoading(true)
      const res = await customerPriceListApi.listCustomers()
      setRows(res.data.data)
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Gagal memuat daftar upload customer')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSpecialPrices = useCallback(async () => {
    try {
      setIsLoadingSpecial(true)
      const res = await customerPriceListApi.listSpecialPrices({
        search: specialSearch || undefined,
        mode: specialMode !== 'ALL' ? specialMode : undefined,
        status: specialStatus !== 'ALL' ? specialStatus : undefined,
        limit: 100,
      })
      setSpecialPrices(res.data.data)
    } catch (err: any) {
      console.error('Failed to load special prices', err)
    } finally {
      setIsLoadingSpecial(false)
    }
  }, [specialSearch, specialMode, specialStatus])

  useEffect(() => {
    fetchMasterUploads()
  }, [fetchMasterUploads])

  useEffect(() => {
    fetchSpecialPrices()
  }, [fetchSpecialPrices])

  // Filtered Master Uploads
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter(
      (r) =>
        r.fdCustCode.toLowerCase().includes(q) ||
        (r.custName && r.custName.toLowerCase().includes(q))
    )
  }, [rows, search])

  // Filtered Special Prices
  const filteredSpecialPrices = useMemo(() => {
    return specialPrices.filter((item) => {
      if (specialMode !== 'ALL') {
        const itemIsAir = item.mode.toUpperCase().includes('AIR')
        if (specialMode === 'AIR' && !itemIsAir) return false
        if (specialMode === 'SEA' && itemIsAir) return false
      }
      return true
    })
  }, [specialPrices, specialMode])

  // Deactivate handler
  const handleConfirmDeactivate = async () => {
    if (!itemToDeactivate) return
    try {
      setIsProcessingAction(true)
      await customerPriceListApi.deactivateSpecialPrice(itemToDeactivate.id)
      toast.success('Masa berlaku harga khusus berhasil diakhiri')
      setItemToDeactivate(null)
      fetchSpecialPrices()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menonaktifkan harga')
    } finally {
      setIsProcessingAction(false)
    }
  }

  // Delete handler
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return
    try {
      setIsProcessingAction(true)
      await customerPriceListApi.deleteSpecialPrice(itemToDelete.id)
      toast.success('Harga khusus berhasil dihapus')
      setItemToDelete(null)
      fetchSpecialPrices()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menghapus harga')
    } finally {
      setIsProcessingAction(false)
    }
  }

  // Special Prices Columns
  const specialColumns: Column<CustomerSpecialPriceItem>[] = [
    {
      key: 'customer',
      header: 'Customer',
      render: (row: CustomerSpecialPriceItem) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-xs font-bold text-[var(--color-primary)] bg-[var(--color-neutral)] px-2 py-0.5 rounded border border-[var(--color-border)]">
              {row.fdCustCode}
            </span>
            <span className="text-xs font-semibold text-[var(--color-primary)] truncate max-w-[200px]" title={row.custName}>
              {row.custName || row.fdCustCode}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Kategori / Komoditi',
      render: (row: CustomerSpecialPriceItem) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs text-[var(--color-primary)]">
              {row.category}
            </span>
          </div>
          {row.aliases && row.aliases.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] text-[var(--color-secondary)]">Alias:</span>
              {row.aliases.map((a) => (
                <span
                  key={a}
                  className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-secondary)]"
                >
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'modeBranch',
      header: 'Moda & Asal',
      render: (row: CustomerSpecialPriceItem) => {
        const isAir = row.mode.toUpperCase().includes('AIR')
        return (
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${
                isAir
                  ? 'bg-transparent border-indigo-500/40 text-indigo-600 dark:text-indigo-400'
                  : 'bg-transparent border-blue-500/40 text-blue-600 dark:text-blue-400'
              }`}
            >
              {isAir ? <Plane size={11} /> : <Ship size={11} />}
              <span>{isAir ? 'AIR' : 'SEA'}</span>
            </span>
            <span className="font-mono text-xs font-bold text-[var(--color-primary)] px-1.5 py-0.5 rounded bg-[var(--color-neutral)] border border-[var(--color-border)]">
              {row.branch}
            </span>
          </div>
        )
      },
    },
    {
      key: 'price',
      header: 'Tarif Khusus',
      render: (row: CustomerSpecialPriceItem) => {
        const isAir = row.mode.toUpperCase().includes('AIR')
        return (
          <div>
            <span className="font-mono font-bold text-sm text-[var(--color-primary)]">
              {formatCurrency(row.price)}
            </span>
            <span className="text-[10px] text-[var(--color-secondary)] ml-1">
              /{isAir ? 'kg' : 'm³'}
            </span>
          </div>
        )
      },
    },
    {
      key: 'validity',
      header: 'Masa Berlaku',
      render: (row: CustomerSpecialPriceItem) => (
        <div className="text-xs space-y-0.5">
          <div className="flex items-center gap-1 text-[var(--color-secondary)]">
            <span>Mulai:</span>
            <strong className="text-[var(--color-primary)]">{formatDate(row.effectiveDate)}</strong>
          </div>
          <div className="text-[11px] text-[var(--color-secondary)]">
            {row.endDate ? (
              <span>s.d. <strong className="text-[var(--color-primary)]">{formatDate(row.endDate)}</strong></span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Seterusnya (Ongoing)</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: CustomerSpecialPriceItem) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            row.isExpired
              ? 'bg-transparent border-amber-500/40 text-amber-600 dark:text-amber-400'
              : 'bg-transparent border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {row.isExpired ? 'Kadaluarsa' : 'Aktif'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (row: CustomerSpecialPriceItem) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedItem(row)
              setIsModalOpen(true)
            }}
            title="Edit Harga"
            className="p-1.5 h-auto text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
          >
            <Edit3 size={14} />
          </Button>

          {!row.isExpired && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setItemToDeactivate(row)}
              title="Akhiri Masa Berlaku Sekarang"
              className="p-1.5 h-auto text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
            >
              <Ban size={14} />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setItemToDelete(row)}
            title="Hapus Harga Khusus"
            className="p-1.5 h-auto text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ]

  // Master Uploads Columns
  const columns: Column<CustomerPriceListUploadRow>[] = [
    {
      key: 'fdCustCode',
      header: t('customerPriceList.customerCode'),
      render: (row: CustomerPriceListUploadRow) => (
        <span className="font-semibold font-mono text-[var(--color-primary)]">
          {row.fdCustCode}
        </span>
      ),
    },
    {
      key: 'custName',
      header: t('customerPriceList.customerName'),
      render: (row: CustomerPriceListUploadRow) => (
        <span className="text-[var(--color-primary)] font-medium">
          {row.custName || '-'}
        </span>
      ),
    },
    {
      key: 'effectiveDate',
      header: 'Effective Date',
      render: (row: CustomerPriceListUploadRow) => (
        <span className="text-[var(--color-secondary)]">
          {formatDate(row.effectiveDate)}
        </span>
      ),
    },
    {
      key: 'itemCount',
      header: t('customerPriceList.totalItems'),
      render: (row: CustomerPriceListUploadRow) => (
        <span className="text-[var(--color-primary)] tabular-nums font-mono font-semibold">
          {row.itemCount.toLocaleString('en-US')}
        </span>
      ),
    },
    {
      key: 'uploadedAt',
      header: 'Upload Date',
      render: (row: CustomerPriceListUploadRow) => (
        <span className="text-[var(--color-secondary)]">
          {formatDate(row.uploadedAt)}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (row: CustomerPriceListUploadRow) => (
        <Badge
          variant={
            row.status === 'PARSED' ? 'success' : row.status === 'PARTIAL' ? 'warning' : 'danger'
          }
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      className: 'text-right',
      render: (row: CustomerPriceListUploadRow) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" asChild>
            <Link to={ROUTES.CUSTOMER_PRICE_LIST_DETAIL(row.fdCustCode)}>
              <Eye className="w-4 h-4 mr-1.5" />
              {t('common.detail')}
            </Link>
          </Button>
        </div>
      ),
    },
  ]

  if (error && activeTab === 'master_uploads') return <div className="p-4 text-[var(--color-danger)]">{error}</div>

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 animate-fadeIn pb-24 bg-[var(--color-surface)] font-[var(--font-body)]">
      <PageHeader
        title={t('customerPriceList.title')}
        subtitle={t('customerPriceList.subtitle')}
        breadcrumbs={[
          { label: t('module.finance'), path: ROUTES.BILLING },
          { label: t('nav.customerPriceList') },
          { label: t('nav.list') },
        ]}
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link to={ROUTES.COMMODITY_MAPPING}>
              <Button variant="secondary" size="sm">
                <Tag className="w-4 h-4 mr-1.5 text-blue-600 dark:text-blue-400" />
                Pemetaan Komoditas
              </Button>
            </Link>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSelectedItem(null)
                setIsModalOpen(true)
              }}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
            >
              <Sparkles className="w-4 h-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
              + Input Harga Khusus
            </Button>
            <Button asChild size="sm">
              <Link to={ROUTES.CUSTOMER_PRICE_LIST_UPLOAD}>
                <Upload className="w-4 h-4 mr-1.5" />
                {t('common.add')} File Excel
              </Link>
            </Button>
          </div>
        }
      />

      {/* Tabs Switcher: Special Commodity Prices vs Master Uploads */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('special_prices')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
            activeTab === 'special_prices'
              ? 'bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs'
              : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
          }`}
        >
          <Sparkles size={14} />
          <span>Harga Komoditi Khusus Customer</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[var(--color-neutral)] border border-[var(--color-border)]">
            {specialPrices.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('master_uploads')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
            activeTab === 'master_uploads'
              ? 'bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs'
              : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
          }`}
        >
          <FileSpreadsheet size={14} />
          <span>Daftar Upload File Excel</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[var(--color-neutral)] border border-[var(--color-border)]">
            {rows.length}
          </span>
        </button>
      </div>

      {activeTab === 'special_prices' ? (
        /* SPECIAL PRICES TAB */
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--color-surface)] p-3 sm:p-4 rounded-2xl border border-[var(--color-border)] shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-secondary)] pointer-events-none" />
              <input
                type="text"
                placeholder="Cari customer, komoditi (misal: BATTERY), atau branch..."
                value={specialSearch}
                onChange={(e) => setSpecialSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-xl focus:outline-hidden focus:border-[var(--color-tertiary)] text-[var(--color-primary)] placeholder:text-[var(--color-secondary)] transition-all"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-[var(--color-neutral)] p-1 rounded-xl border border-[var(--color-border)]">
                {(['ALL', 'SEA', 'AIR'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSpecialMode(m)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      specialMode === m
                        ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-2xs'
                        : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                    }`}
                  >
                    {m === 'ALL' ? 'Semua Moda' : m}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-[var(--color-neutral)] p-1 rounded-xl border border-[var(--color-border)]">
                {(['ACTIVE', 'ALL', 'EXPIRED'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpecialStatus(s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      specialStatus === s
                        ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-2xs'
                        : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                    }`}
                  >
                    {s === 'ACTIVE' ? 'Aktif' : s === 'ALL' ? 'Semua Status' : 'Kadaluarsa'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Special Prices Table / Mobile Card */}
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-xs overflow-hidden">
            {/* Mobile View */}
            <div className="sm:hidden divide-y divide-[var(--color-border)]">
              {isLoadingSpecial ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 space-y-3">
                    <div className="h-4 w-24 rounded skeleton-shimmer" />
                    <div className="h-5 w-3/4 rounded skeleton-shimmer" />
                    <div className="h-12 w-full rounded-xl skeleton-shimmer" />
                  </div>
                ))
              ) : filteredSpecialPrices.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--color-secondary)] space-y-2">
                  <Sparkles size={24} className="mx-auto text-[var(--color-secondary)] opacity-50" />
                  <p>Belum ada harga komoditi khusus yang sesuai filter.</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSelectedItem(null)
                      setIsModalOpen(true)
                    }}
                    className="mt-2"
                  >
                    + Input Harga Khusus Sekarang
                  </Button>
                </div>
              ) : (
                filteredSpecialPrices.map((item) => (
                  <div key={item.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[var(--color-primary)] bg-[var(--color-neutral)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                          {item.fdCustCode}
                        </span>
                        <span className="font-semibold text-xs text-[var(--color-primary)] truncate max-w-[160px]">
                          {item.custName || item.fdCustCode}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          item.isExpired
                            ? 'border-amber-500/40 text-amber-600'
                            : 'border-emerald-500/40 text-emerald-600'
                        }`}
                      >
                        {item.isExpired ? 'Kadaluarsa' : 'Aktif'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--color-neutral)]/40 border border-[var(--color-border)] space-y-1.5 text-xs">
                      <div className="flex justify-between items-baseline">
                        <span className="text-[var(--color-secondary)]">Kategori:</span>
                        <strong className="text-[var(--color-primary)]">{item.category}</strong>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-[var(--color-secondary)]">Moda & Branch:</span>
                        <span className="font-semibold text-[var(--color-primary)]">
                          {item.mode.includes('AIR') ? 'AIR' : 'SEA'} · {item.branch}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline pt-1 border-t border-[var(--color-border)]">
                        <span className="text-[var(--color-secondary)]">Tarif Khusus:</span>
                        <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(item.price)}
                        </span>
                      </div>
                      {item.aliases && item.aliases.length > 0 && (
                        <div className="pt-1 text-[11px] text-[var(--color-secondary)]">
                          <span>Alias: </span>
                          <span className="font-mono text-[var(--color-primary)]">{item.aliases.join(', ')}</span>
                        </div>
                      )}
                    </div>

                    {/* Mobile Card Action */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(item)
                          setIsModalOpen(true)
                        }}
                      >
                        <Edit3 size={13} className="mr-1" />
                        Edit
                      </Button>
                      {!item.isExpired && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setItemToDeactivate(item)}
                          className="text-amber-600"
                        >
                          <Ban size={13} className="mr-1" />
                          Akhiri
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setItemToDelete(item)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop View */}
            <div className="hidden sm:block">
              <Table<CustomerSpecialPriceItem>
                columns={specialColumns}
                data={filteredSpecialPrices}
                keyExtractor={(row) => String(row.id)}
                isLoading={isLoadingSpecial}
                emptyMessage="Belum ada data harga komoditi khusus per customer."
              />
            </div>
          </div>
        </div>
      ) : (
        /* MASTER UPLOADS TAB */
        <div className="space-y-4">
          {/* Toolbar & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--color-surface)] p-3 sm:p-4 rounded-2xl border border-[var(--color-border)] shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-secondary)] pointer-events-none" />
              <input
                type="text"
                placeholder="Cari kode customer atau nama customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-xl focus:outline-hidden focus:border-[var(--color-tertiary)] text-[var(--color-primary)] placeholder:text-[var(--color-secondary)] transition-all"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-[var(--color-secondary)] font-medium">
              <span>
                Menampilkan <strong className="text-[var(--color-primary)] font-mono">{filteredRows.length}</strong> dari{' '}
                <strong className="text-[var(--color-primary)] font-mono">{rows.length}</strong> customer
              </span>
            </div>
          </div>

          {/* Main Content Container: Desktop Table vs Mobile Cards */}
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-xs overflow-hidden">
            {/* Mobile View (< sm) */}
            <div className="sm:hidden divide-y divide-[var(--color-border)]">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 space-y-3 bg-[var(--color-surface)]">
                    <div className="flex justify-between items-center">
                      <div className="h-4 w-20 rounded-md skeleton-shimmer" />
                      <div className="h-4 w-16 rounded-full skeleton-shimmer" />
                    </div>
                    <div className="h-4 w-3/4 rounded-md skeleton-shimmer" />
                    <div className="h-10 w-full rounded-xl skeleton-shimmer" />
                  </div>
                ))
              ) : filteredRows.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--color-secondary)]">
                  {search ? 'Tidak ada customer yang sesuai pencarian.' : 'Belum ada data customer price list.'}
                </div>
              ) : (
                filteredRows.map((row) => (
                  <Link
                    key={row.fdCustCode}
                    to={ROUTES.CUSTOMER_PRICE_LIST_DETAIL(row.fdCustCode)}
                    className="p-4 block space-y-3 hover:bg-[var(--color-neutral)]/30 transition-colors"
                  >
                    {/* Header Row: Code + Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[var(--color-primary)] bg-[var(--color-neutral)] px-2.5 py-0.5 rounded-lg border border-[var(--color-border)]">
                        {row.fdCustCode}
                      </span>

                      <Badge
                        variant={
                          row.status === 'PARSED' ? 'success' : row.status === 'PARTIAL' ? 'warning' : 'danger'
                        }
                        className="text-[10px] px-2 py-0.5"
                      >
                        {row.status}
                      </Badge>
                    </div>

                    {/* Customer Name */}
                    <div>
                      <h4 className="text-sm font-bold text-[var(--color-primary)] line-clamp-1">
                        {row.custName || 'Customer Tanpa Nama'}
                      </h4>
                    </div>

                    {/* Info Metadata Grid */}
                    <div className="p-2.5 rounded-xl bg-[var(--color-neutral)]/50 border border-[var(--color-border)]/70 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                          Tgl Efektif
                        </span>
                        <span className="font-medium text-[var(--color-primary)] text-[11px] flex items-center gap-1 mt-0.5">
                          <Calendar size={11} className="text-[var(--color-secondary)] shrink-0" />
                          {formatDate(row.effectiveDate)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                          Total Tarif
                        </span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-[11px] mt-0.5 block">
                          {row.itemCount.toLocaleString('en-US')}
                        </span>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="flex items-center justify-between pt-1 text-xs text-[var(--color-tertiary)] font-semibold">
                      <span className="text-[11px] text-[var(--color-secondary)]">
                        Upload: {formatDate(row.uploadedAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span>Lihat Riwayat</span>
                        <ArrowRight size={12} />
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>

            {/* Desktop Table View (>= sm) */}
            <div className="hidden sm:block">
              <Table<CustomerPriceListUploadRow>
                columns={columns}
                data={filteredRows}
                keyExtractor={(row) => row.fdCustCode}
                isLoading={loading}
                emptyMessage={t('common.noData')}
              />
            </div>
          </div>
        </div>
      )}

      {/* Customer Commodity Price Modal */}
      <CustomerCommodityPriceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedItem(null)
        }}
        onSuccess={() => {
          fetchSpecialPrices()
          fetchMasterUploads()
        }}
        initialData={selectedItem}
      />

      {/* Confirm Deactivate Modal */}
      <ConfirmModal
        isOpen={Boolean(itemToDeactivate)}
        title="Akhiri Masa Berlaku Harga"
        message={`Apakah Anda yakin ingin mengakhiri masa berlaku harga khusus komoditi ${itemToDeactivate?.category} untuk ${itemToDeactivate?.custName || itemToDeactivate?.fdCustCode} per hari ini?`}
        confirmText="Akhiri Sekarang"
        cancelText="Batal"
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setItemToDeactivate(null)}
        isLoading={isProcessingAction}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(itemToDelete)}
        title="Hapus Harga Khusus"
        message={`Apakah Anda yakin ingin menghapus harga khusus komoditi ${itemToDelete?.category} (${formatCurrency(itemToDelete?.price || 0)}) untuk ${itemToDelete?.custName || itemToDelete?.fdCustCode}?`}
        confirmText="Hapus"
        cancelText="Batal"
        onConfirm={handleConfirmDelete}
        onCancel={() => setItemToDelete(null)}
        isLoading={isProcessingAction}
      />
    </div>
  )
}

