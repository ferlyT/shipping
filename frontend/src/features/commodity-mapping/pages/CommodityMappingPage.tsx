import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Tag,
  Plus,
  Search,
  Globe,
  Building2,
  Edit2,
  Trash2,
  RefreshCw,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { ROUTES } from '@/lib/constants'
import { CommodityMappingModal } from '../components/CommodityMappingModal'
import { commodityMappingApi } from '../services/commodity-mapping.service'
import type { CommodityMappingItem, CommodityMappingFilters } from '../types/commodity-mapping.types'

export default function CommodityMappingPage() {
  const [searchParams] = useSearchParams()
  const initialScope = (searchParams.get('scope') as 'all' | 'global' | 'customer') || 'all'
  const initialSearch = searchParams.get('search') || searchParams.get('custCode') || ''

  const [data, setData] = useState<CommodityMappingItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(15)
  const [isLoading, setIsLoading] = useState(false)

  // Filters
  const [search, setSearch] = useState(initialSearch)
  const [scope, setScope] = useState<'all' | 'global' | 'customer'>(initialScope)
  const [mode, setMode] = useState('ALL')

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalDefaultScope, setModalDefaultScope] = useState<'global' | 'customer'>('global')
  const [modalDefaultCustCode, setModalDefaultCustCode] = useState<string>('')
  const [editingItem, setEditingItem] = useState<CommodityMappingItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CommodityMappingItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Synchronize when URL searchParams changes
  useEffect(() => {
    const urlScope = searchParams.get('scope') as 'all' | 'global' | 'customer' | null
    const urlSearch = searchParams.get('search') || searchParams.get('custCode') || null
    if (urlScope && urlScope !== scope) setScope(urlScope)
    if (urlSearch !== null && urlSearch !== search) setSearch(urlSearch)
  }, [searchParams])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: CommodityMappingFilters = {
        page,
        limit,
        search: search.trim() || undefined,
        scope: scope === 'all' ? undefined : scope,
        mode: mode === 'ALL' ? undefined : mode,
      }
      const res: any = await commodityMappingApi.getCommodityMappings(params)
      const responseData = res.data?.data || res.data || []
      const responseTotal = res.data?.meta?.total ?? res.data?.total ?? 0
      setData(responseData)
      setTotal(responseTotal)
    } catch {
      setData([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }, [page, limit, search, scope, mode])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await commodityMappingApi.delete(deleteTarget.id)
      setDeleteTarget(null)
      fetchData()
    } catch {
      // Handle error
    } finally {
      setIsDeleting(false)
    }
  }

  // Summary counts
  const globalCount = data.filter((d) => !d.fdCustCode).length
  const customerCount = data.filter((d) => d.fdCustCode).length

  const openAddModal = (scopeMode: 'global' | 'customer', prefilledCustCode = '') => {
    setEditingItem(null)
    setModalDefaultScope(scopeMode)
    setModalDefaultCustCode(prefilledCustCode || (scope === 'customer' ? search.trim() : ''))
    setIsModalOpen(true)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0 space-y-6 bg-[var(--color-surface)] font-[var(--font-body)] animate-fadeIn pb-24">
      {/* Page Header */}
      <PageHeader
        title="Pemetaan Komoditas (Commodity Mapping)"
        subtitle="Hubungkan deskripsi komoditas ke tipe komoditi & kategori Price List untuk validasi tarif otomatis (Global & Khusus Customer)"
        breadcrumbs={[
          { label: 'Finance', path: ROUTES.BILLING },
          { label: 'Price List', path: ROUTES.PRICE_LIST },
          { label: 'Pemetaan Komoditas' },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchData}
              disabled={isLoading}
              className="flex items-center gap-1.5 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => openAddModal('customer')}
              className="flex items-center gap-1.5 text-xs border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 bg-purple-50/50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/40"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>+ Pemetaan Customer</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => openAddModal('global')}
              className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Pemetaan Global</span>
            </Button>
          </div>
        }
      />

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          onClick={() => {
            setScope('all')
            setPage(1)
          }}
          className="p-4 flex items-center gap-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-gray-800 dark:to-gray-800 border-blue-100 dark:border-gray-700 cursor-pointer hover:border-blue-300 transition-all shadow-xs"
        >
          <div className="p-3 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Total Aturan Pemetaan
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
              {total} <span className="text-xs font-normal text-gray-500">aturan</span>
            </div>
          </div>
        </Card>

        <Card
          onClick={() => {
            setScope('global')
            setPage(1)
          }}
          className="p-4 flex items-center gap-4 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-gray-800 dark:to-gray-800 border-emerald-100 dark:border-gray-700 cursor-pointer hover:border-emerald-300 transition-all shadow-xs"
        >
          <div className="p-3 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Pemetaan Global
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
              {scope === 'all' ? globalCount : scope === 'global' ? total : '-'}{' '}
              <span className="text-xs font-normal text-gray-500">aturan umum</span>
            </div>
          </div>
        </Card>

        <Card
          onClick={() => {
            setScope('customer')
            setPage(1)
          }}
          className="p-4 flex items-center gap-4 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-gray-800 dark:to-gray-800 border-purple-100 dark:border-gray-700 cursor-pointer hover:border-purple-300 transition-all shadow-xs"
        >
          <div className="p-3 rounded-xl bg-purple-600 text-white shadow-md shadow-purple-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Pemetaan Per Customer
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
              {scope === 'all' ? customerCount : scope === 'customer' ? total : '-'}{' '}
              <span className="text-xs font-normal text-gray-500">spesifik</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Filter & Table Card */}
      <Card className="overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
        {/* Controls Bar */}
        <div className="p-3.5 sm:p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 bg-gray-50/40 dark:bg-gray-800/40">
          {/* Scope Tabs */}
          <div className="flex items-center p-1 bg-gray-200/70 dark:bg-gray-700/70 rounded-xl overflow-x-auto max-w-full no-scrollbar shrink-0">
            <button
              onClick={() => {
                setScope('all')
                setPage(1)
              }}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                scope === 'all'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              Semua Lingkup
            </button>
            <button
              onClick={() => {
                setScope('global')
                setPage(1)
              }}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                scope === 'global'
                  ? 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Global Umum</span>
            </button>
            <button
              onClick={() => {
                setScope('customer')
                setPage(1)
              }}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                scope === 'customer'
                  ? 'bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Khusus Pelanggan</span>
            </button>
          </div>

          {/* Search & Mode Filters */}
          <div className="flex items-center gap-2.5 flex-1 max-w-xl justify-end">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Cari nama komoditas, target kategori, atau kode customer..."
                className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-xs"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch('')
                    setPage(1)
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={mode}
              onChange={(e) => {
                setMode(e.target.value)
                setPage(1)
              }}
              className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 shadow-xs"
            >
              <option value="ALL">Semua Moda</option>
              <option value="BY SEA">BY SEA</option>
              <option value="BY AIR">BY AIR</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/75 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Lingkup & Pelanggan</th>
                  <th className="px-4 py-3">Nama Komoditas Sumber</th>
                  <th className="px-4 py-3">Target Kategori Price List</th>
                  <th className="px-4 py-3">Moda</th>
                  <th className="px-4 py-3">Periode Berlaku</th>
                  <th className="px-4 py-3">Catatan</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 font-medium">
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="bg-white dark:bg-gray-900">
                    <td className="px-4 py-3.5"><div className="h-5 w-24 rounded-md skeleton-shimmer" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-36 rounded-md skeleton-shimmer" /></td>
                    <td className="px-4 py-3.5"><div className="h-5 w-28 rounded-full skeleton-shimmer" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-16 rounded-md skeleton-shimmer" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-24 rounded-md skeleton-shimmer" /></td>
                    <td className="px-4 py-3.5"><div className="h-3.5 w-32 rounded-md skeleton-shimmer" /></td>
                    <td className="px-4 py-3.5 text-right"><div className="h-7 w-14 rounded-lg skeleton-shimmer ml-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : data.length === 0 ? (
            <div className="p-12">
              <EmptyState
                icon={<Tag className="w-7 h-7" />}
                title="Tidak Ada Aturan Pemetaan"
                description={
                  search || scope !== 'all' || mode !== 'ALL'
                    ? 'Tidak ditemukan pemetaan komoditas yang cocok dengan filter aktif.'
                    : 'Belum ada pemetaan komoditas yang dibuat. Tambahkan pemetaan komoditas pertama Anda.'
                }
                action={
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openAddModal('customer')}
                      className="text-xs border-purple-300 text-purple-700 bg-purple-50"
                    >
                      <Building2 className="w-3.5 h-3.5 mr-1" />
                      + Tambah Khusus Customer
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openAddModal('global')}
                      className="text-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      + Tambah Global
                    </Button>
                  </div>
                }
              />
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/75 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Lingkup & Pelanggan</th>
                  <th className="px-4 py-3">Nama Komoditas Sumber</th>
                  <th className="px-4 py-3">Target Kategori Price List</th>
                  <th className="px-4 py-3">Moda</th>
                  <th className="px-4 py-3">Periode Berlaku</th>
                  <th className="px-4 py-3">Catatan</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 font-medium">
                {data.map((item) => {
                  const isCustomerScope = Boolean(item.fdCustCode)
                  const isExpired = item.endDate && new Date(item.endDate) < new Date()

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      {/* Scope & Customer */}
                      <td className="px-4 py-3.5">
                        {isCustomerScope ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              <Building2 className="w-3 h-3 shrink-0" />
                              <span className="font-mono">{item.fdCustCode}</span>
                            </span>
                            {item.custName && (
                              <div className="text-[11px] text-gray-600 dark:text-gray-400 font-medium truncate max-w-[150px]">
                                {item.custName}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <Globe className="w-3 h-3 shrink-0" />
                            <span>Global</span>
                          </span>
                        )}
                      </td>

                      {/* Source Commodity Name */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-gray-900 dark:text-white font-mono text-[11px]">
                          {item.commodityName}
                        </div>
                      </td>

                      {/* Target Category */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="info" className="font-semibold text-[11px] px-2.5 py-0.5">
                            {item.targetCommodity}
                          </Badge>
                          {item.fdTypeComodity && (
                            <span className="text-[10px] text-gray-400 font-mono">
                              (ID: {item.fdTypeComodity})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Mode */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {item.mode || 'Semua Moda'}
                        </span>
                      </td>

                      {/* Effective Dates */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-gray-700 dark:text-gray-300 text-[11px]">
                          {new Date(item.effectiveDate).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                          {item.endDate ? (
                            <span className="text-gray-400 text-[10px] block">
                              s/d{' '}
                              {new Date(item.endDate).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          ) : (
                            <span className="text-emerald-600 text-[10px] block font-medium">
                              Seterusnya
                            </span>
                          )}
                        </div>
                        {isExpired && (
                          <span className="text-[9px] font-bold text-red-500 uppercase tracking-tight">
                            Kedaluwarsa
                          </span>
                        )}
                      </td>

                      {/* Notes & File Ref */}
                      <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400 text-[11px] max-w-xs truncate">
                        {item.priceListFileName && (
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium truncate mb-0.5">
                            📄 {item.priceListFileName}
                          </div>
                        )}
                        <span>{item.notes || '—'}</span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingItem(item)
                              setIsModalOpen(true)
                            }}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                            title="Edit Pemetaan"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(item)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                            title="Hapus Pemetaan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {total > limit && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/20 dark:bg-gray-800/20">
            <Pagination
              page={page}
              totalPages={Math.ceil(total / limit)}
              total={total}
              limit={limit}
              onPageChange={setPage}
            />
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-gray-850 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Hapus Pemetaan Komoditas?
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Apakah Anda yakin ingin menghapus aturan pemetaan{' '}
                <strong className="text-gray-800 dark:text-gray-200">
                  {deleteTarget.commodityName}
                </strong>{' '}
                →{' '}
                <strong className="text-gray-800 dark:text-gray-200">
                  {deleteTarget.targetCommodity}
                </strong>
                {deleteTarget.fdCustCode && ` untuk customer ${deleteTarget.fdCustCode}`}?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <CommodityMappingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingItem(null)
        }}
        onSuccess={() => {
          setIsModalOpen(false)
          setEditingItem(null)
          fetchData()
        }}
        initialData={editingItem}
        defaultScope={modalDefaultScope}
        defaultCustCode={modalDefaultCustCode}
      />
    </div>
  )
}
