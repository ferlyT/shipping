import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  X, 
  Truck, 
  Package, 
  MapPin, 
  Loader2,
  Plus,
  Check,
  Calendar,
  ChevronDown,
  ChevronUp,
  Copy,
  AlertCircle,
} from 'lucide-react'
import { deliveryOrdersApi } from '../services/delivery-orders.service'
import { useTranslation } from '@/hooks/useTranslation'
import { useToastStore } from '@/stores/toastStore'
import { useModalEscape } from '@/hooks/useModalEscape'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/lib/constants'
import { displayCustName, formatDate } from '@/lib/utils'
import type { 
  GroupedDataRow, 
  CreateDeliveryOrderDto, 
  CustomerDestination, 
  CreateCustomerDestinationDto,
  OrderDeliveryItem,
} from '../types/delivery-orders.types'

interface CreateDeliveryOrderModalProps {
  isOpen: boolean
  onClose: () => void
  cargo: GroupedDataRow | null
  onSuccess?: (newSJNo: string) => void
}

export function CreateDeliveryOrderModal({
  isOpen,
  onClose,
  cargo,
  onSuccess,
}: CreateDeliveryOrderModalProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const todayStr = new Date().toISOString().slice(0, 10)

  // Form state
  const [formData, setFormData] = useState<CreateDeliveryOrderDto>({
    fdListCode: '',
    fdListType: 2,
    fdBranchCode: '',
    fdCustCode: '',
    fdCustNameSJ: '',
    fdJmlPackSJ: 1,
    fdSatuan: 'COLY',
    fdJmlBeratSJ: 0,
    fdCarID: '',
    fdSupir: '',
    fdTelpSupir: '',
    fdEstimasi: todayStr,
    fdAddr: '',
    fdCity: '',
    fdContact: '',
    fdHp: '',
    fdTelp: '',
    fdDescr: '',
    fdKondisiBarang: 1,
  })

  // Customer destination states
  const [selectedDestId, setSelectedDestId] = useState<string>('')
  const [isAddDestOpen, setIsAddDestOpen] = useState(false)
  const [isSavingDest, setIsSavingDest] = useState(false)
  const [newDestForm, setNewDestForm] = useState<CreateCustomerDestinationDto>({
    fdCustCode: '',
    fdContact: '',
    fdHP: '',
    fdTelp: '',
    fdEmail: '',
    fdAddr: '',
    fdCity: '',
  })

  const custCode = (cargo?.custCode || formData.fdCustCode || '').trim()

  // Fetch Master Data (tbKendaraan & tbSatuan)
  const { data: masterData, isLoading: isLoadingMaster } = useQuery({
    queryKey: ['delivery-master-data'],
    queryFn: async () => {
      const res = await deliveryOrdersApi.getMasterData()
      return res.data.data
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch Customer Destinations from tbCustomerPengiriman
  const {
    data: destinations = [],
    isLoading: isLoadingDestinations,
    refetch: refetchDestinations,
  } = useQuery<CustomerDestination[]>({
    queryKey: ['customer-destinations', custCode],
    queryFn: async () => {
      if (!custCode) return []
      const res = await deliveryOrdersApi.getCustomerDestinations(custCode)
      return res.data.data || []
    },
    enabled: isOpen && !!custCode,
    staleTime: 60 * 1000,
  })

  const listCode = cargo?.listCode?.trim() || ''

  // Fetch Instruksi Khusus Pelanggan (Permintaan Pengiriman CS - qr_OrderDelivey)
  const { data: orderDelivery } = useQuery<OrderDeliveryItem | null>({
    queryKey: ['order-delivery', listCode],
    queryFn: async () => {
      if (!listCode) return null
      const res = await deliveryOrdersApi.getOrderDelivery(listCode)
      return res.data.data || null
    },
    enabled: isOpen && !!listCode,
    staleTime: 60 * 1000,
  })

  // State Card Instruksi CS: Otomatis open apabila ada datanya, dan di-hide apabila tidak ada data
  const [isCsInstructionOpen, setIsCsInstructionOpen] = useState(true)

  useEffect(() => {
    if (orderDelivery) {
      setIsCsInstructionOpen(true)
    }
  }, [orderDelivery])

  // Auto-select alamat default (fdAktif === 1) dan isi data modal saat destinations termuat
  useEffect(() => {
    if (isOpen && destinations.length > 0 && !selectedDestId) {
      const defaultDest = destinations.find((d) => Number(d.fdAktif) === 1) || destinations[0]
      if (defaultDest) {
        setSelectedDestId(defaultDest.fdID)
        setFormData((prev) => ({
          ...prev,
          fdContact: defaultDest.fdContact ? defaultDest.fdContact.trim() : prev.fdContact,
          fdHp: defaultDest.fdHP ? defaultDest.fdHP.trim() : prev.fdHp,
          fdTelp: defaultDest.fdTelp ? defaultDest.fdTelp.trim() : prev.fdTelp,
          fdAddr: defaultDest.fdAddr ? defaultDest.fdAddr.trim() : prev.fdAddr,
          fdCity: defaultDest.fdCity ? defaultDest.fdCity.trim() : prev.fdCity,
        }))
      }
    }
  }, [isOpen, destinations, selectedDestId])

  // Populate initial values when cargo changes
  useEffect(() => {
    if (cargo && isOpen) {
      const sisa = Number(cargo.sisa || 0)
      const total = Number(cargo.totalQty || 1)
      const defaultQty = sisa > 0 ? sisa : total
      const totalWeight = Number(cargo.totalWeight || 0)
      // Proportional weight estimation
      const estimatedWeight = total > 0 ? Number(((totalWeight / total) * defaultQty).toFixed(2)) : totalWeight

      // Ambil satuan dari tbEntryList kargo (Single source of truth kargo)
      const rawSatuan = (cargo.satuan || '').trim()
      let initialSatuan = 'COLY'
      if (rawSatuan) {
        const upper = rawSatuan.toUpperCase()
        if (['COLY', 'KOLI', 'PCS', 'BOX', 'ROLL'].includes(upper)) {
          initialSatuan = upper
        } else {
          const matchedUnit = masterData?.units?.find((u) => u.fdUnitCode.toUpperCase() === upper)
          initialSatuan = matchedUnit ? matchedUnit.fdUnitCode : rawSatuan
        }
      }

      setSelectedDestId('')
      setIsAddDestOpen(false)
      setFormData({
        fdListCode: cargo.listCode?.trim() || '',
        fdListType: 2,
        fdBranchCode: cargo.branchCode?.trim() || 'GZ',
        fdCustCode: cargo.custCode?.trim() || '',
        fdCustNameSJ: cargo.customerName?.trim() || '',
        fdJmlPackSJ: defaultQty,
        fdSatuan: initialSatuan,
        fdJmlBeratSJ: estimatedWeight,
        fdCarID: '',
        fdSupir: '',
        fdTelpSupir: '',
        fdEstimasi: todayStr,
        fdAddr: '',
        fdCity: '',
        fdContact: '',
        fdHp: '',
        fdTelp: '',
        fdDescr: cargo.comodity ? `Kargo: ${cargo.comodity.trim()}` : '',
        fdKondisiBarang: 1,
      })
    }
  }, [cargo, isOpen, todayStr, masterData])

  // Handle fleet auto-fill
  const handleVehicleChange = (carId: string) => {
    const selected = masterData?.vehicles.find((v) => v.fdCarID === carId)
    setFormData((prev) => ({
      ...prev,
      fdCarID: carId,
      fdSupir: selected?.fdSupir ? selected.fdSupir.trim() : prev.fdSupir,
      fdTelpSupir: selected?.fdNotel ? selected.fdNotel.trim() : prev.fdTelpSupir,
    }))
  }

  // Handle selecting a destination from combo
  const handleSelectDestination = (destId: string) => {
    setSelectedDestId(destId)
    if (!destId) return
    const dest = destinations.find((d) => d.fdID === destId)
    if (dest) {
      setFormData((prev) => ({
        ...prev,
        fdContact: dest.fdContact ? dest.fdContact.trim() : prev.fdContact,
        fdHp: dest.fdHP ? dest.fdHP.trim() : prev.fdHp,
        fdTelp: dest.fdTelp ? dest.fdTelp.trim() : prev.fdTelp,
        fdAddr: dest.fdAddr ? dest.fdAddr.trim() : prev.fdAddr,
        fdCity: dest.fdCity ? dest.fdCity.trim() : prev.fdCity,
      }))
    }
  }

  // Handle saving a new destination to tbCustomerPengiriman
  const handleSaveNewDestination = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!custCode) {
      addToast({ message: 'Kode customer tidak terdeteksi untuk kargo ini', type: 'error' })
      return
    }
    if (!newDestForm.fdAddr || !newDestForm.fdAddr.trim()) {
      addToast({ message: 'Alamat pengiriman wajib diisi!', type: 'error' })
      return
    }

    setIsSavingDest(true)
    try {
      const res = await deliveryOrdersApi.createCustomerDestination({
        ...newDestForm,
        fdCustCode: custCode,
      })
      addToast({ message: 'Alamat tujuan berhasil ditambahkan!', type: 'success' })
      await refetchDestinations()
      const newDest = res.data?.data
      if (newDest) {
        setSelectedDestId(newDest.fdID)
        setFormData((prev) => ({
          ...prev,
          fdContact: newDest.fdContact ? newDest.fdContact.trim() : prev.fdContact,
          fdHp: newDest.fdHP ? newDest.fdHP.trim() : prev.fdHp,
          fdTelp: newDest.fdTelp ? newDest.fdTelp.trim() : prev.fdTelp,
          fdAddr: newDest.fdAddr ? newDest.fdAddr.trim() : prev.fdAddr,
          fdCity: newDest.fdCity ? newDest.fdCity.trim() : prev.fdCity,
        }))
      }
      setIsAddDestOpen(false)
      setNewDestForm({
        fdCustCode: custCode,
        fdContact: '',
        fdHP: '',
        fdTelp: '',
        fdEmail: '',
        fdAddr: '',
        fdCity: '',
      })
    } catch (err: any) {
      addToast({
        message: err?.response?.data?.message || 'Gagal menyimpan alamat tujuan baru',
        type: 'error',
      })
    } finally {
      setIsSavingDest(false)
    }
  }

  // Terapkan data instruksi pengiriman CS ke formulir
  const handleApplyCsInstruction = () => {
    if (!orderDelivery) return
    setFormData((prev) => ({
      ...prev,
      fdAddr: orderDelivery.fdAlamatKirim ? orderDelivery.fdAlamatKirim.trim() : prev.fdAddr,
      fdCity: orderDelivery.fdCity ? orderDelivery.fdCity.trim() : prev.fdCity,
      fdContact: orderDelivery.fdContact 
        ? orderDelivery.fdContact.trim() 
        : (orderDelivery.fdNamaPemberiOrder ? orderDelivery.fdNamaPemberiOrder.trim() : prev.fdContact),
      fdHp: orderDelivery.fdMobile ? orderDelivery.fdMobile.trim() : prev.fdHp,
      fdTelp: orderDelivery.fdTelp ? orderDelivery.fdTelp.trim() : prev.fdTelp,
      fdDescr: orderDelivery.fdKeterangan ? `[CS Note]: ${orderDelivery.fdKeterangan.trim()}` : prev.fdDescr,
      fdEstimasi: orderDelivery.fdTglKirim ? orderDelivery.fdTglKirim.slice(0, 10) : prev.fdEstimasi,
    }))
    addToast({ message: 'Instruksi pengiriman CS berhasil diterapkan ke formulir!', type: 'success' })
  }

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.fdListCode || !formData.fdListCode.trim()) {
      addToast({ message: 'Kode List Kargo tidak valid', type: 'error' })
      return
    }

    if (!formData.fdCarID || !formData.fdCarID.trim()) {
      addToast({ message: 'Nomor Kendaraan (Plat Mobil) wajib dipilih!', type: 'error' })
      return
    }

    if (!formData.fdEstimasi || !formData.fdEstimasi.trim()) {
      addToast({ message: 'Tanggal Estimasi Kirim wajib diisi!', type: 'error' })
      return
    }

    if (!formData.fdJmlPackSJ || Number(formData.fdJmlPackSJ) <= 0) {
      addToast({ message: 'Jumlah koli yang dikirim harus lebih dari 0!', type: 'error' })
      return
    }

    try {
      setIsSubmitting(true)
      const res = await deliveryOrdersApi.create(formData)
      const newSJNo = res.data.fdSJNo

      addToast({
        message: res.data.message || `Surat Jalan ${newSJNo} berhasil diterbitkan!`,
        type: 'success',
      })

      onClose()
      if (onSuccess) {
        onSuccess(newSJNo)
      } else {
        navigate(ROUTES.DELIVERY_DETAIL(newSJNo))
      }
    } catch (err: any) {
      addToast({
        message: err?.response?.data?.error || err.message || 'Gagal membuat Surat Jalan',
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  useModalEscape(isOpen, onClose)

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen])

  if (!isOpen || !cargo) return null

  const sisa = Number(cargo.sisa || 0)
  const total = Number(cargo.totalQty || 0)

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn font-[var(--font-body)]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div 
        className="relative w-full max-w-2xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slideUp my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-tertiary)]/15 text-[var(--color-tertiary)] shrink-0">
              <Truck size={16} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[var(--color-primary)] font-[var(--font-label)] uppercase tracking-wide">
                Buat Surat Jalan Baru
              </h3>
              <p className="text-xs text-[var(--color-secondary)] mt-0.5">
                Penerbitan surat jalan pengiriman untuk kargo di gudang (List: <strong className="font-mono">{cargo.listCode}</strong>)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-transparent hover:border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cargo Summary Context Bar */}
        <div className="p-3.5 bg-[var(--color-neutral)]/60 border-b border-[var(--color-border)] grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs shrink-0">
          <div>
            <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
              Marking / Cabang
            </span>
            <span className="font-mono font-bold text-[var(--color-primary)] mt-0.5 block truncate">
              {cargo.markingCode || '—'} {cargo.branchCode ? `(${cargo.branchCode})` : ''}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
              Customer
            </span>
            <span className="font-semibold text-[var(--color-primary)] mt-0.5 block truncate" title={cargo.customerName}>
              {displayCustName(cargo.customerName)}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
              Sisa Stok Gudang
            </span>
            <span className="font-mono font-extrabold text-amber-600 dark:text-amber-400 mt-0.5 block">
              {sisa} / {total} {cargo.satuan?.trim() || 'Koli'}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
              No. Resi
            </span>
            <span className="font-mono text-blue-600 dark:text-blue-400 mt-0.5 block truncate">
              {cargo.resiNo || '—'}
            </span>
          </div>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* CARD: Instruksi Khusus Pelanggan (Permintaan Pengiriman CS - qr_OrderDelivey) */}
          {/* Otomatis open apabila ada datanya, dan di-hide apabila tidak ada */}
          {orderDelivery && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10 overflow-hidden shadow-2xs">
              {/* Header Accordion: Klik untuk buka/tutup */}
              <div
                onClick={() => setIsCsInstructionOpen(!isCsInstructionOpen)}
                className="p-3 bg-amber-500/10 dark:bg-amber-500/20 border-b border-amber-500/30 flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11.5px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 font-[var(--font-label)]">
                      Instruksi Khusus Pelanggan (Permintaan Pengiriman CS)
                    </span>
                    {orderDelivery.fdNamaPemberiOrder && (
                      <span className="text-[10.5px] text-[var(--color-secondary)]">
                        (Oleh: <strong className="text-[var(--color-primary)]">{orderDelivery.fdNamaPemberiOrder}</strong>)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {orderDelivery.fdJenisPembayaranLabel && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${
                      orderDelivery.fdJenisPembayaran === 1
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                        : orderDelivery.fdJenisPembayaran === 2
                        ? 'bg-sky-500/20 border border-sky-500/40 text-sky-700 dark:text-sky-300'
                        : 'bg-rose-500/20 border border-rose-500/40 text-rose-700 dark:text-rose-300'
                    }`}>
                      {orderDelivery.fdJenisPembayaranLabel}
                    </span>
                  )}
                  <button
                    type="button"
                    className="text-amber-700 dark:text-amber-300 p-0.5"
                    aria-label={isCsInstructionOpen ? 'Tutup Instruksi CS' : 'Buka Instruksi CS'}
                  >
                    {isCsInstructionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Body Card (Otomatis Terbuka / Open) */}
              {isCsInstructionOpen && (
                <div className="p-3.5 space-y-3 animate-fadeIn">
                  {/* Grid 4 Kolom Info Ringkas */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[var(--color-surface)] p-2.5 rounded-lg border border-amber-500/20 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] flex items-center gap-1">
                        <Calendar size={11} className="text-amber-600 dark:text-amber-400" />
                        Permintaan Tgl Kirim
                      </span>
                      <span className="font-bold text-[var(--color-primary)] mt-0.5 block">
                        {orderDelivery.fdTglKirim ? formatDate(orderDelivery.fdTglKirim) : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                        Pemberi Order (CS)
                      </span>
                      <span className="font-medium text-[var(--color-primary)] mt-0.5 block truncate">
                        {orderDelivery.fdNamaPemberiOrder || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                        Tanggal Transfer
                      </span>
                      <span className="text-[var(--color-primary)] mt-0.5 block">
                        {orderDelivery.fdTglTransfer ? formatDate(orderDelivery.fdTglTransfer) : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                        Biaya Ekspedisi
                      </span>
                      <span className="font-semibold text-[var(--color-primary)] mt-0.5 block">
                        {orderDelivery.fdEksBayar === 1
                          ? 'Bayar Tujuan (COD)'
                          : orderDelivery.fdEksBayar === 2
                          ? 'Dibayar Pengirim'
                          : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Alamat Permintaan Khusus */}
                  {orderDelivery.fdAlamatKirim && (
                    <div className="bg-[var(--color-surface)] p-2.5 rounded-lg border border-amber-500/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] uppercase font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                          <MapPin size={12} />
                          Alamat Permintaan Khusus Pelanggan:
                        </span>
                        <button
                          type="button"
                          onClick={handleApplyCsInstruction}
                          className="text-[10.5px] font-semibold text-[var(--color-tertiary)] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Copy size={11} />
                          <span>Terapkan Alamat ke Form</span>
                        </button>
                      </div>
                      <p className="text-[11.5px] text-[var(--color-primary)] leading-relaxed font-medium">
                        {orderDelivery.fdAlamatKirim}
                      </p>
                    </div>
                  )}

                  {/* Catatan Khusus CS */}
                  {orderDelivery.fdKeterangan && (
                    <div className="bg-[var(--color-surface)] p-2.5 rounded-lg border border-amber-500/20">
                      <span className="text-[10.5px] uppercase font-bold text-amber-700 dark:text-amber-400 block mb-1">
                        Catatan Khusus CS / Finance:
                      </span>
                      <p className="text-[11.5px] text-[var(--color-primary)] italic bg-[var(--color-neutral)]/40 p-2 rounded border border-[var(--color-border)]">
                        "{orderDelivery.fdKeterangan}"
                      </p>
                    </div>
                  )}

                  {/* Tombol Aksi Gunakan Instruksi CS */}
                  <div className="flex items-center justify-end pt-0.5">
                    <button
                      type="button"
                      onClick={handleApplyCsInstruction}
                      className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-amber-600 dark:bg-amber-500 text-white hover:opacity-90 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Check size={12} />
                      <span>Gunakan Instruksi CS Ini pada Form</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 1: Muatan & Kuantitas Kirim */}
          <div className="space-y-3">
            <h4 className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--color-tertiary)] flex items-center gap-1.5">
              <Package size={13} />
              <span>Muatan yang Dikirim</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                  Jumlah {cargo.satuan?.trim() || 'Koli'} Kirim <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={total > 0 ? total : undefined}
                  value={formData.fdJmlPackSJ}
                  onChange={(e) => setFormData({ ...formData, fdJmlPackSJ: Number(e.target.value) })}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] shadow-2xs font-mono font-bold"
                  required
                />
                <span className="text-[10px] text-[var(--color-secondary)] mt-0.5 block">
                  Maksimal sisa: {sisa} {cargo.satuan?.trim() || 'koli'}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                  Satuan
                </label>
                {(() => {
                  const currentSatuan = formData.fdSatuan?.trim() || ''
                  const cargoSatuan = cargo?.satuan?.trim() || ''
                  return (
                    <select
                      value={formData.fdSatuan || 'COLY'}
                      onChange={(e) => setFormData({ ...formData, fdSatuan: e.target.value })}
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] shadow-2xs font-medium"
                    >
                      {/* Pastikan opsi satuan dari tbEntryList kargo tersedia jika di luar standar */}
                      {currentSatuan &&
                        !['COLY', 'KOLI', 'PCS', 'BOX', 'ROLL'].includes(currentSatuan.toUpperCase()) &&
                        !masterData?.units?.some((u) => u.fdUnitCode.toUpperCase() === currentSatuan.toUpperCase()) && (
                          <option value={currentSatuan}>{currentSatuan} (dari tbEntryList)</option>
                        )}
                      {cargoSatuan &&
                        cargoSatuan !== currentSatuan &&
                        !['COLY', 'KOLI', 'PCS', 'BOX', 'ROLL'].includes(cargoSatuan.toUpperCase()) &&
                        !masterData?.units?.some((u) => u.fdUnitCode.toUpperCase() === cargoSatuan.toUpperCase()) && (
                          <option value={cargoSatuan}>{cargoSatuan} (dari tbEntryList)</option>
                        )}
                      <option value="COLY">COLY</option>
                      <option value="KOLI">KOLI</option>
                      <option value="PCS">PCS</option>
                      <option value="BOX">BOX</option>
                      <option value="ROLL">ROLL</option>
                      {masterData?.units?.map((u) => (
                        <option key={u.fdUnitCode} value={u.fdUnitCode}>
                          {u.fdUnitCode} {u.fdUnitName ? `(${u.fdUnitName})` : ''}
                        </option>
                      ))}
                    </select>
                  )
                })()}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                  Estimasi Berat (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.fdJmlBeratSJ ?? ''}
                  onChange={(e) => setFormData({ ...formData, fdJmlBeratSJ: Number(e.target.value) })}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] shadow-2xs font-mono"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--color-border)] pt-3 space-y-3">
            {/* Section 2: Armada & Supir Pengiriman */}
            <h4 className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--color-tertiary)] flex items-center gap-1.5">
              <Truck size={13} />
              <span>Armada & Supir Pengantar</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                  Mobil / Armada <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.fdCarID}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] shadow-2xs font-semibold"
                  required
                >
                  <option value="">-- Pilih Nomor Mobil --</option>
                  {isLoadingMaster ? (
                    <option disabled>Memuat armada...</option>
                  ) : (
                    masterData?.vehicles.map((v) => (
                      <option key={v.fdCarID} value={v.fdCarID}>
                        {v.fdCarID} {v.fdSupir ? `(${v.fdSupir})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                  Nama Supir
                </label>
                <input
                  type="text"
                  value={formData.fdSupir || ''}
                  onChange={(e) => setFormData({ ...formData, fdSupir: e.target.value })}
                  placeholder="Nama pengemudi"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                  Telepon Supir
                </label>
                <input
                  type="text"
                  value={formData.fdTelpSupir || ''}
                  onChange={(e) => setFormData({ ...formData, fdTelpSupir: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                  Tanggal Estimasi Kirim <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.fdEstimasi}
                  onChange={(e) => setFormData({ ...formData, fdEstimasi: e.target.value })}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] shadow-2xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                  Kondisi Barang
                </label>
                <select
                  value={formData.fdKondisiBarang ?? 1}
                  onChange={(e) => setFormData({ ...formData, fdKondisiBarang: Number(e.target.value) })}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] shadow-2xs"
                >
                  <option value={1}>Baik</option>
                  <option value={2}>Rusak Ringan</option>
                  <option value={3}>Rusak Berat</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--color-border)] pt-3 space-y-3">
            {/* Section 3: Penerima & Alamat Tujuan */}
            <div className="flex items-center justify-between">
              <h4 className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--color-tertiary)] flex items-center gap-1.5">
                <MapPin size={13} />
                <span>Tujuan & Penerima Barang</span>
              </h4>
              {custCode && (
                <span className="text-[10.5px] text-[var(--color-secondary)] font-mono">
                  Cust: <strong className="text-[var(--color-primary)]">{custCode}</strong>
                </span>
              )}
            </div>

            {/* Combo Box Alamat Tujuan dari tbCustomerPengiriman */}
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/40 p-2.5 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold text-[var(--color-primary)]">
                    Pilih Alamat Tujuan Customer:
                  </span>
                  {destinations.length > 0 && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      {destinations.length} Alamat
                    </span>
                  )}
                  {selectedDestId && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                      Terpilih: [{selectedDestId}]
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsAddDestOpen(!isAddDestOpen)
                    if (!isAddDestOpen) {
                      setNewDestForm({
                        fdCustCode: custCode,
                        fdContact: formData.fdContact || '',
                        fdHP: formData.fdHp || '',
                        fdTelp: formData.fdTelp || '',
                        fdEmail: '',
                        fdAddr: formData.fdAddr || '',
                        fdCity: formData.fdCity || '',
                      })
                    }
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-tertiary)] hover:opacity-80 cursor-pointer self-start sm:self-auto"
                >
                  <Plus size={12} />
                  <span>{isAddDestOpen ? 'Tutup Form Tambah' : '+ Tambah Alamat'}</span>
                </button>
              </div>

              {/* Combo select */}
              <div className="relative">
                <select
                  value={selectedDestId}
                  onChange={(e) => handleSelectDestination(e.target.value)}
                  disabled={!custCode || isLoadingDestinations}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] shadow-2xs font-medium"
                >
                  <option value="">
                    {!custCode
                      ? '-- Kode Customer Tidak Ditemukan --'
                      : isLoadingDestinations
                      ? 'Memuat daftar alamat tujuan...'
                      : destinations.length === 0
                      ? '-- Belum Ada Alamat Tersimpan (Klik + Tambah Alamat) --'
                      : '-- Pilih Dari Daftar Alamat Tersimpan --'}
                  </option>
                  {destinations.map((d) => (
                    <option key={d.fdID} value={d.fdID}>
                      [{d.fdID}] {d.fdAddr || '(Tanpa Alamat)'} {d.fdCity ? `— ${d.fdCity}` : ''} {d.fdContact ? `(PIC: ${d.fdContact})` : ''} {Number(d.fdAktif) === 1 ? ' ★ [DEFAULT]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Form Tambah Alamat Baru jika isAddDestOpen */}
              {isAddDestOpen && (
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-2.5 mt-2 animate-fadeIn">
                  <div className="flex items-center justify-between pb-1 border-b border-[var(--color-border)]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-tertiary)] flex items-center gap-1">
                      <Plus size={12} />
                      Tambah Alamat Baru ke Master ({custCode || '—'})
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddDestOpen(false)}
                      className="text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="text-[10.5px] font-semibold text-[var(--color-secondary)] block mb-1">
                        Alamat Lengkap <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newDestForm.fdAddr}
                        onChange={(e) => setNewDestForm({ ...newDestForm, fdAddr: e.target.value })}
                        placeholder="Jalan, nomor ruko/gudang, patokan..."
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] shadow-2xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10.5px] font-semibold text-[var(--color-secondary)] block mb-1">
                        Kota Tujuan
                      </label>
                      <input
                        type="text"
                        value={newDestForm.fdCity || ''}
                        onChange={(e) => setNewDestForm({ ...newDestForm, fdCity: e.target.value })}
                        placeholder="Jakarta, Tangerang, dll"
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10.5px] font-semibold text-[var(--color-secondary)] block mb-1">
                        Contact Person (PIC)
                      </label>
                      <input
                        type="text"
                        value={newDestForm.fdContact || ''}
                        onChange={(e) => setNewDestForm({ ...newDestForm, fdContact: e.target.value })}
                        placeholder="Nama kontak di lokasi tujuan"
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10.5px] font-semibold text-[var(--color-secondary)] block mb-1">
                        No. HP
                      </label>
                      <input
                        type="text"
                        value={newDestForm.fdHP || ''}
                        onChange={(e) => setNewDestForm({ ...newDestForm, fdHP: e.target.value })}
                        placeholder="08xxxxxxxxxx"
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10.5px] font-semibold text-[var(--color-secondary)] block mb-1">
                        No. Telepon Kantor
                      </label>
                      <input
                        type="text"
                        value={newDestForm.fdTelp || ''}
                        onChange={(e) => setNewDestForm({ ...newDestForm, fdTelp: e.target.value })}
                        placeholder="021xxxxxxx"
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddDestOpen(false)}
                      disabled={isSavingDest}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-[var(--color-border)] text-[var(--color-secondary)] hover:bg-[var(--color-neutral)] cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNewDestination}
                      disabled={isSavingDest || !newDestForm.fdAddr?.trim()}
                      className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[var(--color-tertiary)] text-white hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      {isSavingDest ? (
                        <>
                          <Loader2 size={11} className="animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <Check size={11} />
                          <span>Simpan ke Master</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                  Nama Penerima di Surat Jalan
                </label>
                <input
                  type="text"
                  value={formData.fdCustNameSJ || ''}
                  onChange={(e) => setFormData({ ...formData, fdCustNameSJ: e.target.value })}
                  placeholder="Nama customer / penerima"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] shadow-2xs font-semibold"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                  Contact Person (PIC)
                </label>
                <input
                  type="text"
                  value={formData.fdContact || ''}
                  onChange={(e) => setFormData({ ...formData, fdContact: e.target.value })}
                  placeholder="Nama PIC di lokasi"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                  Kota Tujuan
                </label>
                <input
                  type="text"
                  value={formData.fdCity || ''}
                  onChange={(e) => setFormData({ ...formData, fdCity: e.target.value })}
                  placeholder="Jakarta, Tangerang, Bekasi..."
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                  No. HP / Telepon Penerima
                </label>
                <input
                  type="text"
                  value={formData.fdHp || formData.fdTelp || ''}
                  onChange={(e) => setFormData({ ...formData, fdHp: e.target.value, fdTelp: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] shadow-2xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                  Alamat Pengiriman Lengkap
                </label>
                <textarea
                  rows={2}
                  value={formData.fdAddr || ''}
                  onChange={(e) => setFormData({ ...formData, fdAddr: e.target.value })}
                  placeholder="Jalan, nomor ruko/gedung, patokan..."
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] shadow-2xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                  Catatan Pengiriman / Delivery Note
                </label>
                <input
                  type="text"
                  value={formData.fdDescr || ''}
                  onChange={(e) => setFormData({ ...formData, fdDescr: e.target.value })}
                  placeholder="Catatan penanganan / info tambahan"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              <span>{t('common.cancel')}</span>
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="gap-1.5 cursor-pointer font-semibold shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Menerbitkan SJ...</span>
                </>
              ) : (
                <>
                  <Truck size={13} />
                  <span>Terbitkan Surat Jalan</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
