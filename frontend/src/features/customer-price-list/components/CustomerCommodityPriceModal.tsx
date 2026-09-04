import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Save,
  AlertCircle,
  Building2,
  Calendar,
  Tag,
  Plus,
  Check,
  ChevronDown,
  Plane,
  Ship,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import apiClient from '@/api/client'
import { customerPriceListApi } from '../services/customerPriceList.service'
import type { CustomerSpecialPriceItem } from '../types'
import { toast } from '@/stores/toastStore'

interface CustomerCommodityPriceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialData?: CustomerSpecialPriceItem | null
  defaultCustCode?: string
}

const COMMON_CATEGORIES = [
  'BATTERY',
  'UMUM',
  'TEKSTIL',
  'GARMENT',
  'SEMI GARMENT',
  'LARTAS - N',
  'LARTAS - S',
  'ALKES',
  'LAPTOP/TABLET',
  'HANDPHONE',
  'SPAREPART',
  'KOSMETIK',
  'MAKANAN',
  'FCL',
  'LEGAL',
  'CHEMICAL',
]

const COMMON_BRANCHES = ['GZ', 'YIWU', 'SH', 'SZ', 'FOSHAN', 'JKT']

export function CustomerCommodityPriceModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  defaultCustCode = '',
}: CustomerCommodityPriceModalProps) {
  const isEdit = Boolean(initialData)

  const [fdCustCode, setFdCustCode] = useState(defaultCustCode)
  const [custName, setCustName] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers, setCustomers] = useState<{ fdCustCode: string; custName: string }[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  const [category, setCategory] = useState('BATTERY')
  const [customCategory, setCustomCategory] = useState('')
  const [isCustomCategory, setIsCustomCategory] = useState(false)

  const [mode, setMode] = useState<'BY SEA' | 'BY AIR'>('BY SEA')
  const [branch, setBranch] = useState('GZ')
  const [customBranch, setCustomBranch] = useState('')
  const [isCustomBranch, setIsCustomBranch] = useState(false)

  const [price, setPrice] = useState<string>('6500000')
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState<string>('')
  const [hasEndDate, setHasEndDate] = useState(false)
  const [notes, setNotes] = useState('')

  // Multi-Alias Komoditi Operasional
  const [aliases, setAliases] = useState<string[]>([])
  const [newAlias, setNewAlias] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const customerDropdownRef = useRef<HTMLDivElement>(null)

  // Load customer list
  useEffect(() => {
    if (!isOpen) return
    const fetchCustomers = async () => {
      try {
        setIsLoadingCustomers(true)
        const res = await customerPriceListApi.listCustomers()
        const list = res.data.data.map((c) => ({
          fdCustCode: c.fdCustCode.trim(),
          custName: c.custName || c.fdCustCode.trim(),
        }))
        setCustomers(list)
      } catch (err) {
        console.error('Failed to load customers', err)
      } finally {
        setIsLoadingCustomers(false)
      }
    }
    fetchCustomers()
  }, [isOpen])

  // Populate data when editing or opening
  useEffect(() => {
    if (!isOpen) return

    if (initialData) {
      setFdCustCode(initialData.fdCustCode.trim())
      setCustName(initialData.custName || initialData.fdCustCode.trim())
      setCustomerSearch(initialData.custName || initialData.fdCustCode.trim())

      const catUpper = initialData.category.toUpperCase().trim()
      if (COMMON_CATEGORIES.includes(catUpper)) {
        setCategory(catUpper)
        setIsCustomCategory(false)
      } else {
        setCategory('CUSTOM')
        setCustomCategory(catUpper)
        setIsCustomCategory(true)
      }

      setMode(initialData.mode.toUpperCase().includes('AIR') ? 'BY AIR' : 'BY SEA')

      const brUpper = initialData.branch.toUpperCase().trim()
      if (COMMON_BRANCHES.includes(brUpper)) {
        setBranch(brUpper)
        setIsCustomBranch(false)
      } else {
        setBranch('CUSTOM')
        setCustomBranch(brUpper)
        setIsCustomBranch(true)
      }

      setPrice(String(initialData.price || ''))
      setEffectiveDate(initialData.effectiveDate ? initialData.effectiveDate.slice(0, 10) : new Date().toISOString().slice(0, 10))

      if (initialData.endDate) {
        setEndDate(initialData.endDate.slice(0, 10))
        setHasEndDate(true)
      } else {
        setEndDate('')
        setHasEndDate(false)
      }

      setNotes(initialData.notes || '')
      setAliases(initialData.aliases || [])
    } else {
      setFdCustCode(defaultCustCode)
      setCustName('')
      setCustomerSearch('')
      setCategory('BATTERY')
      setCustomCategory('')
      setIsCustomCategory(false)
      setMode('BY SEA')
      setBranch('GZ')
      setCustomBranch('')
      setIsCustomBranch(false)
      setPrice('6500000')
      setEffectiveDate(new Date().toISOString().slice(0, 10))
      setEndDate('')
      setHasEndDate(false)
      setNotes('')
      setAliases([])
    }
    setError(null)
  }, [isOpen, initialData, defaultCustCode])

  const selectedCategory = isCustomCategory ? customCategory.trim().toUpperCase() : category
  const selectedBranch = isCustomBranch ? customBranch.trim().toUpperCase() : branch

  // Auto-fetch existing commodity mapping aliases for this customer + category + mode
  useEffect(() => {
    if (!isOpen || !fdCustCode.trim() || !selectedCategory) return

    let isMounted = true
    apiClient
      .get<{ data: any[] }>('/commodity-mapping', {
        params: {
          scope: 'customer',
          search: fdCustCode.trim(),
          limit: 100,
        },
      })
      .then((res) => {
        if (!isMounted) return
        const mappings = res.data?.data || []
        const matched = mappings
          .filter(
            (m: any) =>
              (m.targetCommodity || '').toUpperCase() === selectedCategory.toUpperCase() &&
              (!m.mode || m.mode === 'ALL' || m.mode.toUpperCase() === mode.toUpperCase())
          )
          .map((m: any) => m.commodityName.toUpperCase())

        if (matched.length > 0) {
          setAliases((prev) => Array.from(new Set([...prev, ...matched])))
        }
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [isOpen, fdCustCode, selectedCategory, mode])

  // Click outside to close customer dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.toLowerCase().trim()
    return !q || c.fdCustCode.toLowerCase().includes(q) || c.custName.toLowerCase().includes(q)
  })

  const handleAddAlias = () => {
    const trimmed = newAlias.trim().toUpperCase()
    if (trimmed && !aliases.includes(trimmed)) {
      setAliases([...aliases, trimmed])
      setNewAlias('')
    }
  }

  const handleRemoveAlias = (aliasToRemove: string) => {
    setAliases(aliases.filter((a) => a !== aliasToRemove))
  }

  const handlePriceChange = (val: string) => {
    const cleaned = val.replace(/[^\d]/g, '')
    setPrice(cleaned)
  }

  const formattedDisplayPrice = price
    ? Number(price).toLocaleString('en-US')
    : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!fdCustCode.trim()) {
      setError('Silakan pilih customer terlebih dahulu')
      return
    }

    if (!selectedCategory) {
      setError('Kategori komoditi wajib diisi')
      return
    }

    if (!selectedBranch) {
      setError('Branch/asal wajib diisi')
      return
    }

    const numPrice = Number(price)
    if (isNaN(numPrice) || numPrice <= 0) {
      setError('Harga harus berupa angka valid lebih dari 0')
      return
    }

    if (!effectiveDate) {
      setError('Tanggal mulai berlaku wajib diisi')
      return
    }

    try {
      setIsSubmitting(true)

      // Collect all aliases including any unadded text in newAlias input
      const finalAliases = [...aliases]
      if (newAlias.trim()) {
        const trimmed = newAlias.trim().toUpperCase()
        if (!finalAliases.includes(trimmed)) {
          finalAliases.push(trimmed)
        }
      }

      const payload = {
        fdCustCode: fdCustCode.trim(),
        category: selectedCategory,
        mode,
        branch: selectedBranch,
        price: numPrice,
        effectiveDate,
        endDate: hasEndDate && endDate ? endDate : null,
        notes: notes.trim() || null,
        aliases: finalAliases,
      }

      if (isEdit && initialData) {
        await customerPriceListApi.updateSpecialPrice(initialData.id, payload)
        toast.success('Harga komoditi khusus & alias berhasil diperbarui')
      } else {
        await customerPriceListApi.createSpecialPrice(payload)
        toast.success('Harga komoditi khusus & alias berhasil ditambahkan')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal menyimpan harga khusus'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!initialData?.id) return
    const isConfirmed = window.confirm(
      `Yakin ingin menghapus tarif khusus ${selectedCategory} untuk ${fdCustCode}?\n\nTarif ini akan dinonaktifkan (Soft Delete) dan tidak akan digunakan lagi sebagai acuan tarif aktif.`
    )
    if (!isConfirmed) return

    try {
      setIsSubmitting(true)
      await customerPriceListApi.deleteSpecialPrice(initialData.id)
      toast.success('Tarif khusus berhasil dinonaktifkan (Soft Delete)')
      onSuccess()
      onClose()
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal menghapus tarif khusus'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn font-[var(--font-body)]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl flex flex-col rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl overflow-hidden animate-fadeIn max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/60 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--color-primary)] font-[var(--font-display)] tracking-tight">
                {isEdit ? 'Edit Harga Komoditi Khusus' : 'Input Harga Komoditi Khusus Customer'}
              </h2>
              <p className="text-[11px] text-[var(--color-secondary)]">
                Atur tarif spesifik komoditas per customer tanpa upload ulang Excel
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Customer Selector */}
          <div className="space-y-1.5" ref={customerDropdownRef}>
            <label className="text-xs font-semibold text-[var(--color-primary)] flex items-center gap-1.5">
              <Building2 size={13} className="text-[var(--color-primary)]" />
              <span>Customer</span>
              <span className="text-rose-500">*</span>
            </label>

            <div className="relative">
              <div
                onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs flex items-center justify-between cursor-pointer hover:border-[var(--color-primary)]/40 transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  {fdCustCode ? (
                    <>
                      <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--color-neutral)] border border-[var(--color-border)] text-[11px]">
                        {fdCustCode}
                      </span>
                      <span className="font-medium text-[var(--color-primary)] truncate">{custName || fdCustCode}</span>
                    </>
                  ) : (
                    <span className="text-[var(--color-secondary)]">Pilih customer...</span>
                  )}
                </div>
                <ChevronDown size={14} className="text-[var(--color-secondary)] shrink-0" />
              </div>

              {showCustomerDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl overflow-hidden max-h-56 flex flex-col animate-fadeIn">
                  <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/40">
                    <input
                      type="text"
                      placeholder="Cari kode atau nama customer..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] focus:outline-hidden focus:border-[var(--color-primary)] text-[var(--color-primary)]"
                      autoFocus
                    />
                  </div>

                  <div className="overflow-y-auto flex-1 divide-y divide-[var(--color-border)]/50">
                    {isLoadingCustomers ? (
                      <div className="p-3 text-center text-xs text-[var(--color-secondary)]">Memuat customer...</div>
                    ) : filteredCustomers.length === 0 ? (
                      <div className="p-3 text-center text-xs text-[var(--color-secondary)]">
                        {customerSearch ? (
                          <button
                            type="button"
                            onClick={() => {
                              setFdCustCode(customerSearch.trim().toUpperCase())
                              setCustName(customerSearch.trim().toUpperCase())
                              setShowCustomerDropdown(false)
                            }}
                            className="text-[var(--color-primary)] font-bold hover:underline cursor-pointer"
                          >
                            Gunakan &quot;{customerSearch.toUpperCase()}&quot; sebagai kode customer
                          </button>
                        ) : (
                          'Tidak ada data customer'
                        )}
                      </div>
                    ) : (
                      filteredCustomers.map((c) => (
                        <div
                          key={c.fdCustCode}
                          onClick={() => {
                            setFdCustCode(c.fdCustCode)
                            setCustName(c.custName)
                            setShowCustomerDropdown(false)
                          }}
                          className={`p-2.5 text-xs flex items-center justify-between hover:bg-[var(--color-neutral)] cursor-pointer transition-colors ${
                            fdCustCode === c.fdCustCode ? 'bg-[var(--color-primary)]/10 font-bold' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono text-[11px] text-[var(--color-secondary)]">{c.fdCustCode}</span>
                            <span className="text-[var(--color-primary)] truncate">{c.custName}</span>
                          </div>
                          {fdCustCode === c.fdCustCode && <Check size={14} className="text-[var(--color-primary)]" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Category & Moda Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-primary)] flex items-center gap-1.5">
                <Tag size={13} className="text-[var(--color-primary)]" />
                <span>Kategori Komoditi</span>
                <span className="text-rose-500">*</span>
              </label>

              <select
                value={isCustomCategory ? 'CUSTOM' : category}
                onChange={(e) => {
                  if (e.target.value === 'CUSTOM') {
                    setIsCustomCategory(true)
                  } else {
                    setIsCustomCategory(false)
                    setCategory(e.target.value)
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-primary)] focus:outline-hidden focus:border-[var(--color-primary)] cursor-pointer"
              >
                {COMMON_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="CUSTOM">+ Ketik Kategori Lainnya...</option>
              </select>

              {isCustomCategory && (
                <input
                  type="text"
                  placeholder="Contoh: BATTERY, SPAREPART..."
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 mt-1 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-primary)] focus:outline-hidden focus:border-[var(--color-primary)]"
                />
              )}
            </div>

            {/* Moda */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-primary)]">Moda Pengiriman</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('BY SEA')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    mode === 'BY SEA'
                      ? 'bg-blue-500/15 border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                  }`}
                >
                  <Ship size={14} />
                  <span>SEA (Laut)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('BY AIR')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    mode === 'BY AIR'
                      ? 'bg-indigo-500/15 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                      : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                  }`}
                >
                  <Plane size={14} />
                  <span>AIR (Udara)</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. Branch & Price Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Branch */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-primary)]">Branch / Asal</label>
              <select
                value={isCustomBranch ? 'CUSTOM' : branch}
                onChange={(e) => {
                  if (e.target.value === 'CUSTOM') {
                    setIsCustomBranch(true)
                  } else {
                    setIsCustomBranch(false)
                    setBranch(e.target.value)
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-primary)] focus:outline-hidden focus:border-[var(--color-primary)] cursor-pointer"
              >
                {COMMON_BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
                <option value="CUSTOM">+ Branch Lainnya...</option>
              </select>

              {isCustomBranch && (
                <input
                  type="text"
                  placeholder="Contoh: NINGBO, BEIJING..."
                  value={customBranch}
                  onChange={(e) => setCustomBranch(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 mt-1 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-primary)] focus:outline-hidden focus:border-[var(--color-primary)]"
                />
              )}
            </div>

            {/* Price Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-primary)] flex items-center justify-between">
                <span>Harga Tarif (IDR)</span>
                <span className="text-[10px] text-[var(--color-secondary)]">per {mode === 'BY SEA' ? 'm³' : 'kg'}</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-secondary)]">
                  Rp
                </span>
                <input
                  type="text"
                  placeholder="6.500.000"
                  value={formattedDisplayPrice}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-mono font-bold text-[var(--color-primary)] focus:outline-hidden focus:border-[var(--color-primary)]"
                  required
                />
              </div>
            </div>
          </div>

          {/* 4. Alias Komoditas Operasional (Auto Mapping) */}
          <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-neutral)]/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-primary)] flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-500" />
                <span>Alias Komoditi Operasional (Pencocokan Otomatis)</span>
              </span>
              <span className="text-[10px] text-[var(--color-secondary)]">Opsional</span>
            </div>
            <p className="text-[11px] text-[var(--color-secondary)] leading-tight">
              Ketik nama barang di database/invoice operasional (contoh: <code>LAPTOP BATTERY</code>, <code>POWERBANK</code>) agar otomatis dicocokkan ke harga {selectedCategory} ini.
            </p>

            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Tambah alias nama barang..."
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddAlias()
                  }
                }}
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-primary)] focus:outline-hidden focus:border-[var(--color-primary)]"
              />
              <Button type="button" size="sm" variant="secondary" onClick={handleAddAlias} className="text-xs px-2.5 py-1">
                <Plus size={13} />
                <span>Tambah</span>
              </Button>
            </div>

            {aliases.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {aliases.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary)] shadow-2xs"
                  >
                    <span>{a}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAlias(a)}
                      className="text-[var(--color-secondary)] hover:text-rose-500 cursor-pointer"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 5. Effective Date & End Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Effective Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-primary)] flex items-center gap-1.5">
                <Calendar size={13} className="text-[var(--color-primary)]" />
                <span>Mulai Berlaku</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-primary)] focus:outline-hidden focus:border-[var(--color-primary)]"
                required
              />
            </div>

            {/* End Date (Optional) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--color-primary)]">Berlaku Sampai Tanggal</label>
                <button
                  type="button"
                  onClick={() => setHasEndDate(!hasEndDate)}
                  className="text-[11px] text-[var(--color-primary)] font-semibold hover:underline cursor-pointer"
                >
                  {hasEndDate ? 'Hapus Batas Waktu' : '+ Batasi Tanggal'}
                </button>
              </div>

              {hasEndDate ? (
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-primary)] focus:outline-hidden focus:border-[var(--color-primary)]"
                />
              ) : (
                <div className="px-3 py-2 rounded-xl bg-[var(--color-neutral)]/40 border border-[var(--color-border)] text-[11px] text-[var(--color-secondary)] italic">
                  Berlaku seterusnya (ongoing tanpa batas)
                </div>
              )}
            </div>
          </div>

          {/* 6. Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-primary)]">Catatan / Keterangan (Opsional)</label>
            <input
              type="text"
              placeholder="Contoh: Kesepakatan khusus per September, battery promo..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-primary)] focus:outline-hidden focus:border-[var(--color-primary)]"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
            <div>
              {isEdit && initialData?.id && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="border-rose-500/30 text-rose-600 hover:bg-rose-500/10 flex items-center gap-1.5 text-xs"
                >
                  <Trash2 size={13} />
                  <span>Hapus</span>
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting} className="flex items-center gap-1.5">
                <Save size={14} />
                <span>{isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan Harga Khusus'}</span>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
