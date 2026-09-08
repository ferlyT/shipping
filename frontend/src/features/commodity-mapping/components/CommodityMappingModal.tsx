import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Save,
  AlertCircle,
  Sparkles,
  Building2,
  Globe,
  Calendar,
  Tag,
  FileSpreadsheet,
  Check,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { commodityMappingApi } from '../services/commodity-mapping.service'
import { customerPriceListApi } from '@/features/customer-price-list/services/customerPriceList.service'
import type { CommodityMappingItem, PriceListOptionItem } from '../types/commodity-mapping.types'
import type { CustomerPriceListUploadRow } from '@/features/customer-price-list/types'

interface CommodityMappingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialData?: CommodityMappingItem | null
  defaultScope?: 'global' | 'customer'
  defaultCustCode?: string
}

const COMMON_TARGET_CATEGORIES = [
  'UMUM',
  'TEKSTIL',
  'GARMENT',
  'SEMI GARMENT',
  'LARTAS - N',
  'LARTAS - S',
  'ALKES',
  'LAPTOP/TABLET',
  'HANDPHONE',
  'FCL',
  'LEGAL',
  'MASKER',
  'SEPEDA MAHAL',
  'PESTISIDA',
]

export function CommodityMappingModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  defaultScope = 'global',
  defaultCustCode = '',
}: CommodityMappingModalProps) {
  const isEdit = Boolean(initialData)
  const commodityInputRef = useRef<HTMLInputElement>(null)

  const [commodityName, setCommodityName] = useState('')
  const [targetCommodity, setTargetCommodity] = useState('UMUM')
  const [customTarget, setCustomTarget] = useState('')
  const [isCustomTarget, setIsCustomTarget] = useState(false)

  const [scope, setScope] = useState<'global' | 'customer'>(defaultScope)
  const [fdCustCode, setFdCustCode] = useState(defaultCustCode)
  const [mode, setMode] = useState<string>('ALL')

  // Customer List for Dropdown
  const [customers, setCustomers] = useState<CustomerPriceListUploadRow[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  // Price List Dropdown & Effective Date
  const [priceListOptions, setPriceListOptions] = useState<PriceListOptionItem[]>([])
  const [isLoadingPriceLists, setIsLoadingPriceLists] = useState(false)
  const [selectedUploadId, setSelectedUploadId] = useState<number | null>(null)
  const [isCustomDate, setIsCustomDate] = useState(false)
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10))

  const [applyToNewUploads, setApplyToNewUploads] = useState(true)
  const [notes, setNotes] = useState('')

  // Edit-specific scope of change option
  const [scopeChangeOption, setScopeChangeOption] = useState<
    'specific_effective_date' | 'all_active_future' | 'retroactive'
  >('specific_effective_date')

  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [hasInteractedWithCommodity, setHasInteractedWithCommodity] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Global ESC Key Listener & Body Scroll Lock
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  // Fetch customers on open
  useEffect(() => {
    if (!isOpen) return
    let active = true
    setIsLoadingCustomers(true)
    customerPriceListApi
      .listCustomers()
      .then((res) => {
        if (active) setCustomers(res.data.data || [])
      })
      .catch(() => {
        if (active) setCustomers([])
      })
      .finally(() => {
        if (active) setIsLoadingCustomers(false)
      })

    return () => {
      active = false
    }
  }, [isOpen])

  // Auto focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        commodityInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Fetch price lists from database whenever scope or custCode changes
  useEffect(() => {
    if (!isOpen) return
    let active = true
    setIsLoadingPriceLists(true)

    commodityMappingApi
      .getPriceListOptions({
        scope,
        custCode: scope === 'customer' && fdCustCode.trim() ? fdCustCode.trim().toUpperCase() : undefined,
      })
      .then((res: any) => {
        if (!active) return
        const opts: PriceListOptionItem[] = res.data?.data || res.data || []
        setPriceListOptions(opts)
      })
      .catch(() => {
        if (active) setPriceListOptions([])
      })
      .finally(() => {
        if (active) setIsLoadingPriceLists(false)
      })

    return () => {
      active = false
    }
  }, [isOpen, scope, fdCustCode])

  // Populate initial state
  useEffect(() => {
    setHasInteractedWithCommodity(false)
    setShowSuggestions(false)
    if (initialData) {
      setCommodityName(initialData.commodityName || '')
      if (COMMON_TARGET_CATEGORIES.includes(initialData.targetCommodity)) {
        setTargetCommodity(initialData.targetCommodity)
        setIsCustomTarget(false)
        setCustomTarget('')
      } else {
        setTargetCommodity('CUSTOM')
        setIsCustomTarget(true)
        setCustomTarget(initialData.targetCommodity || '')
      }

      setScope(initialData.fdCustCode ? 'customer' : 'global')
      setFdCustCode(initialData.fdCustCode || '')
      setMode(initialData.mode || 'ALL')
      setSelectedUploadId(initialData.priceListUploadId || null)
      setEffectiveDate(
        initialData.effectiveDate ? initialData.effectiveDate.slice(0, 10) : new Date().toISOString().slice(0, 10)
      )
      setApplyToNewUploads(initialData.applyToNewUploads ?? true)
      setNotes(initialData.notes || '')
      setIsCustomDate(Boolean(initialData.effectiveDate && !initialData.priceListUploadId))
    } else {
      // Reset for new creation
      setCommodityName('')
      setTargetCommodity('UMUM')
      setIsCustomTarget(false)
      setCustomTarget('')
      setScope(defaultScope)
      setFdCustCode(defaultCustCode)
      setMode('ALL')
      setSelectedUploadId(null)
      setIsCustomDate(false)
      setEffectiveDate(new Date().toISOString().slice(0, 10))
      setApplyToNewUploads(true)
      setNotes('')
    }
    setError(null)
  }, [initialData, defaultScope, defaultCustCode, isOpen])

  // Fetch commodity suggestions as user types
  useEffect(() => {
    if (!isOpen || !hasInteractedWithCommodity) return

    const timer = setTimeout(async () => {
      try {
        const res = await commodityMappingApi.getSuggestions(commodityName)
        const results = res.data || []
        setSuggestions(results)
      } catch {
        setSuggestions([])
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [commodityName, hasInteractedWithCommodity, isOpen])

  const resolvedFinalTarget = isCustomTarget ? customTarget.trim().toUpperCase() : targetCommodity

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!commodityName.trim()) {
      setError('Nama komoditas sumber wajib diisi.')
      return
    }

    if (!resolvedFinalTarget) {
      setError('Target kategori Price List wajib ditentukan.')
      return
    }

    if (scope === 'customer' && !fdCustCode.trim()) {
      setError('Kode pelanggan wajib diisi untuk pemetaan khusus customer.')
      return
    }

    setIsSubmitting(true)
    try {
      if (isEdit && initialData) {
        await commodityMappingApi.update(initialData.id, {
          commodityName: commodityName.trim().toUpperCase(),
          targetCommodity: resolvedFinalTarget,
          fdCustCode: scope === 'customer' ? fdCustCode.trim().toUpperCase() : null,
          priceListUploadId: isCustomDate ? null : selectedUploadId,
          effectiveDate,
          mode: mode === 'ALL' ? null : mode,
          applyToNewUploads,
          notes: notes.trim() || null,
          scopeChangeOption,
        })
      } else {
        await commodityMappingApi.create({
          commodityName: commodityName.trim().toUpperCase(),
          targetCommodity: resolvedFinalTarget,
          fdCustCode: scope === 'customer' ? fdCustCode.trim().toUpperCase() : null,
          priceListUploadId: isCustomDate ? null : selectedUploadId,
          effectiveDate,
          mode: mode === 'ALL' ? null : mode,
          applyToNewUploads,
          notes: notes.trim() || null,
        })
      }

      onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Gagal menyimpan aturan pemetaan komoditas')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filtered customers list
  const filteredCustomers = customers.filter(
    (c) =>
      c.fdCustCode.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.custName && c.custName.toLowerCase().includes(customerSearch.toLowerCase()))
  )

  const selectedCustomerInfo = customers.find((c) => c.fdCustCode.toUpperCase() === fdCustCode.trim().toUpperCase())

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/70 dark:bg-gray-850 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs ${
                scope === 'customer' ? 'bg-purple-600' : 'bg-blue-600'
              }`}
            >
              {scope === 'customer' ? <Building2 className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                {isEdit ? 'Edit Pemetaan Komoditas' : scope === 'customer' ? 'Tambah Pemetaan Khusus Pelanggan' : 'Tambah Pemetaan Komoditas Global'}
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {isEdit
                  ? `Perbarui aturan mapping #${initialData?.id}`
                  : scope === 'customer'
                  ? 'Konfigurasi mapping komoditas spesifik untuk akun customer tertentu'
                  : 'Aturan umum yang berlaku ke semua customer (jika tidak ada aturan khusus)'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 overscroll-contain">
          {error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2.5 text-red-700 dark:text-red-300 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug font-medium">{error}</span>
            </div>
          )}

          {/* Section 1: Scope Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
              <span>1. Lingkup Pemetaan (Scope)</span>
              <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setScope('global')
                  setSelectedUploadId(null)
                }}
                className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  scope === 'global'
                    ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-850'
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    scope === 'global' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>Global (Semua Pelanggan)</span>
                    {scope === 'global' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Berlaku untuk Master Price List umum dan seluruh invoice
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setScope('customer')
                  setSelectedUploadId(null)
                }}
                className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  scope === 'customer'
                    ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-900/20 text-purple-900 dark:text-purple-200 ring-2 ring-purple-500/20 shadow-xs'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-850'
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    scope === 'customer' ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>Khusus Pelanggan</span>
                    {scope === 'customer' && <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Berlaku prioritas tertinggi untuk Customer Price List tertentu
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Customer Code (if scope === 'customer') */}
          {scope === 'customer' && (
            <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-purple-600" />
                  <span>Pilih Pelanggan (Customer Code & Nama)</span>
                  <span className="text-red-500">*</span>
                </label>
                {selectedCustomerInfo && (
                  <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded">
                    {selectedCustomerInfo.custName}
                  </span>
                )}
              </div>

              {/* Customer Input & Autocomplete Dropdown */}
              <div className="relative">
                <input
                  type="text"
                  value={fdCustCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase()
                    setFdCustCode(val)
                    setCustomerSearch(val)
                    setShowCustomerDropdown(true)
                  }}
                  onFocus={() => {
                    setCustomerSearch(fdCustCode)
                    setShowCustomerDropdown(true)
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowCustomerDropdown(false), 250)
                  }}
                  placeholder={isLoadingCustomers ? 'Memuat daftar customer...' : 'Ketik kode / nama customer (contoh: D000652, A001456, JDL)...'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all uppercase tracking-wider font-semibold shadow-xs"
                />

                {showCustomerDropdown && customers.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 animate-fade-in">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((cust) => (
                        <button
                          key={cust.fdCustCode}
                          type="button"
                          onMouseDown={() => {
                            setFdCustCode(cust.fdCustCode)
                            setShowCustomerDropdown(false)
                          }}
                          className="w-full px-3.5 py-2 text-left text-xs hover:bg-purple-50 dark:hover:bg-purple-900/30 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                              {cust.fdCustCode}
                            </span>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                              {cust.custName || '-'}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {cust.itemCount} items
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="p-2.5 text-center text-xs text-gray-400 italic">
                        Ketik untuk mendaftarkan kode kustom: <strong>{fdCustCode}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Pilih customer dari daftar atau ketik langsung kode customer.
              </p>
            </div>
          )}

          {/* Section 2: Commodity & Target Category */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-850 space-y-4">
            <div className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-600" />
              <span>2. Komoditas Sumber & Target Kategori Price List</span>
            </div>

            {/* Source Commodity Name Input */}
            <div className="space-y-1.5 relative">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                <span>
                  Nama Komoditas / Alias Yang Diinput <span className="text-red-500">*</span>
                </span>
                <span className="text-[10px] text-gray-400 font-normal">
                  Saran otomatis dari riwayat transaksi
                </span>
              </label>
              <div className="relative">
                <input
                  ref={commodityInputRef}
                  type="text"
                  value={commodityName}
                  onChange={(e) => {
                    setCommodityName(e.target.value)
                    setHasInteractedWithCommodity(true)
                    setShowSuggestions(true)
                  }}
                  onFocus={() => {
                    setHasInteractedWithCommodity(true)
                    if (suggestions.length > 0) setShowSuggestions(true)
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 250)
                  }}
                  placeholder="Ketik nama barang... (Misal: RAT POISON, BATTERY, KAOS OBLONG, DRONE)"
                  className="w-full pl-3.5 pr-16 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-xs"
                />
                <div className="absolute right-3 top-2.5 flex items-center gap-1.5">
                  {commodityName && (
                    <button
                      type="button"
                      onClick={() => {
                        setCommodityName('')
                        setSuggestions([])
                        setShowSuggestions(false)
                        commodityInputRef.current?.focus()
                      }}
                      className="text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
                      title="Hapus teks"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse pointer-events-none" />
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 animate-fade-in">
                    <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Saran dari Riwayat Entry Resi
                    </div>
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={() => {
                          setCommodityName(s)
                          setShowSuggestions(false)
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-200 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span>{s}</span>
                        <span className="text-[10px] text-blue-500 opacity-60">Pilih</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Target Category Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Target Kategori Price List <span className="text-red-500">*</span>
                </label>
                {resolvedFinalTarget && (
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-lg">
                    Target: {resolvedFinalTarget}
                  </span>
                )}
              </div>

              {/* Grid of Common Categories */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {COMMON_TARGET_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setTargetCommodity(cat)
                      setIsCustomTarget(false)
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                      !isCustomTarget && targetCommodity === cat
                        ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <span className="truncate block">{cat}</span>
                  </button>
                ))}

                {/* Button for Custom / Other */}
                <button
                  type="button"
                  onClick={() => setIsCustomTarget(true)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                    isCustomTarget
                      ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                      : 'border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800'
                  }`}
                >
                  <span className="truncate block">+ Kustom / Lainnya</span>
                </button>
              </div>

              {/* Custom Input when Custom category selected */}
              {isCustomTarget && (
                <div className="pt-1.5 animate-fade-in space-y-1">
                  <input
                    type="text"
                    value={customTarget}
                    onChange={(e) => setCustomTarget(e.target.value.toUpperCase())}
                    placeholder="Ketik nama kategori Price List kustom (misal: PESTISIDA, SEPEDA, DLL)..."
                    className="w-full px-3.5 py-2 rounded-xl border border-blue-400 dark:border-blue-700 bg-blue-50/20 text-gray-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-blue-500 uppercase"
                  />
                  <p className="text-[10px] text-gray-500">
                    Pastikan nama kategori sesuai dengan sheet/header kolom pada Price List Excel.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Period & Parameters */}
          <div className="space-y-4">
            <div className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>3. Periode & Parameter Tarif</span>
            </div>

            {/* Price List binding vs Custom Date Card */}
            <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                  <span>Mulai Berlaku Pada Price List:</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setIsCustomDate(!isCustomDate)
                    if (!isCustomDate) setSelectedUploadId(null)
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                >
                  {isCustomDate ? 'Pilih dari Upload Price List' : 'Input Tanggal Manual'}
                </button>
              </div>

              {!isCustomDate ? (
                <div className="space-y-1.5 animate-fade-in">
                  <div className="relative">
                    <select
                      disabled={isLoadingPriceLists}
                      value={selectedUploadId || ''}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null
                        setSelectedUploadId(val)
                        if (val) {
                          const matched = priceListOptions.find((p) => p.id === val)
                          if (matched?.effectiveDate) {
                            setEffectiveDate(matched.effectiveDate.slice(0, 10))
                          }
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 pr-8 appearance-none shadow-xs"
                    >
                      <option value="">
                        {isLoadingPriceLists
                          ? 'Memuat daftar price list dari database...'
                          : priceListOptions.length === 0
                          ? scope === 'customer' && !fdCustCode
                            ? '-- Masukkan kode customer terlebih dahulu --'
                            : '-- Belum ada upload price list (Pilih Tanggal Manual) --'
                          : '-- Pilih Periode Upload Price List --'}
                      </option>
                      {priceListOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.fileName} (Efektif: {opt.effectiveDate.slice(0, 10)})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                  </div>

                  {selectedUploadId && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        Terikat ke Price List: <strong>{effectiveDate}</strong>
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type="date"
                      value={effectiveDate}
                      onChange={(e) => setEffectiveDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Pemetaan akan mulai aktif untuk pengiriman terhitung sejak tanggal efektif ini.
                  </p>
                </div>
              )}
            </div>

            {/* Mode & Toggle Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              {/* Mode Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Moda Pengiriman
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 transition-all shadow-xs"
                >
                  <option value="ALL">Semua Moda (Laut & Udara)</option>
                  <option value="BY SEA">BY SEA (Laut Saja)</option>
                  <option value="BY AIR">BY AIR (Udara Saja)</option>
                </select>
              </div>

              {/* Auto Apply Checkbox */}
              <div className="sm:pt-5">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-gray-700 dark:text-gray-300 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={applyToNewUploads}
                    onChange={(e) => setApplyToNewUploads(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-xs font-medium">
                    Otomatis terapkan ke Price List baru di masa depan
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 4: Scope of change for Edit Mode */}
          {isEdit && (
            <div className="p-4 bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2.5 text-xs animate-fade-in">
              <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span>Pilihan Masa Berlaku Perubahan (Scope of Change):</span>
              </div>
              <div className="space-y-2.5 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="scopeOption"
                    value="specific_effective_date"
                    checked={scopeChangeOption === 'specific_effective_date'}
                    onChange={() => setScopeChangeOption('specific_effective_date')}
                    className="mt-0.5 text-blue-600"
                  />
                  <div>
                    <strong className="text-gray-900 dark:text-white">Mulai berlaku dari tanggal efektif ini ke depan (Rekomendasi)</strong>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      Riwayat Price List sebelum tanggal ini tetap utuh dan tidak terpengaruh.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="scopeOption"
                    value="retroactive"
                    checked={scopeChangeOption === 'retroactive'}
                    onChange={() => setScopeChangeOption('retroactive')}
                    className="mt-0.5 text-blue-600"
                  />
                  <div>
                    <strong className="text-gray-900 dark:text-white">Perbarui langsung untuk semua periode (Retroaktif)</strong>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      Menimpa mapping untuk seluruh histori transaksi masa lalu dan masa depan.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Section 5: Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <span>Catatan / Keterangan (Opsional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Contoh: Kesepakatan rate khusus komoditas customer, rat poison -> lartas - n..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 transition-all shadow-xs"
            />
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-gray-100 dark:border-gray-800 flex flex-col-reverse sm:flex-row gap-2 sm:gap-2 items-stretch sm:items-center bg-gray-50/90 dark:bg-gray-850 shrink-0">
          <span className="text-[11px] text-gray-400 hidden sm:inline mr-auto">
            Tekan <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded font-mono text-[10px]">ESC</kbd> untuk membatalkan
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial h-10 sm:h-9 text-xs font-semibold text-gray-600 dark:text-gray-300"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial h-10 sm:h-9 flex items-center justify-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Pemetaan'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
