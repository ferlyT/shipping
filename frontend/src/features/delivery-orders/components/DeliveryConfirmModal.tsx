import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { 
  X, 
  Truck, 
  CheckCircle2, 
  Calendar, 
  User, 
  Phone, 
  Send, 
  Receipt, 
  Loader2,
  Layers
} from 'lucide-react'
import { deliveryOrdersApi } from '../services/delivery-orders.service'
import { useToastStore } from '@/stores/toastStore'
import { useModalEscape } from '@/hooks/useModalEscape'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import type { 
  DeliveryMonitoringItem, 
  ConfirmDeliveryDto,
  VehicleItem,
  ExpeditionItem
} from '../types/delivery-orders.types'

interface DeliveryConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  items: DeliveryMonitoringItem[]
  onSuccess: () => void
}

export function DeliveryConfirmModal({
  isOpen,
  onClose,
  items,
  onSuccess,
}: DeliveryConfirmModalProps) {
  const addToast = useToastStore((s) => s.addToast)
  useModalEscape(isOpen, onClose)

  const isBatch = items.length > 1
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])

  // Form states
  const [sndDate, setSndDate] = useState<string>(todayStr)
  const [selectedCarID, setSelectedCarID] = useState<string>('')
  const [customCarID, setCustomCarID] = useState<string>('')
  const [supir, setSupir] = useState<string>('')
  const [telpSupir, setTelpSupir] = useState<string>('')

  // Expedition section states
  const [useExpedition, setUseExpedition] = useState<boolean>(false)
  const [expID, setExpID] = useState<string>('')
  const [resiExp, setResiExp] = useState<string>('')
  const [currExp, setCurrExp] = useState<string>('RP.')
  const [totalExp, setTotalExp] = useState<string>('0')
  const [paid, setPaid] = useState<number>(1) // 1: Bayar Jkt, 2: BT

  // Master data
  const [vehicles, setVehicles] = useState<VehicleItem[]>([])
  const [expeditions, setExpeditions] = useState<ExpeditionItem[]>([])
  const [isLoadingMaster, setIsLoadingMaster] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form when items change
  useEffect(() => {
    if (!isOpen) return

    setSndDate(todayStr)
    setUseExpedition(false)
    setExpID('')
    setResiExp('')
    setCurrExp('RP.')
    setTotalExp('0')
    setPaid(1)

    // If single item has existing driver/car prefilled
    if (items.length === 1) {
      const item = items[0]
      if (item.fdCarID) {
        setSelectedCarID(item.fdCarID)
        setCustomCarID(item.fdCarID)
      } else {
        setSelectedCarID('')
        setCustomCarID('')
      }
      setSupir(item.fdSupir || '')
      setTelpSupir(item.fdTelpSupir || '')
    } else {
      setSelectedCarID('')
      setCustomCarID('')
      setSupir('')
      setTelpSupir('')
    }

    // Load master data (vehicles & expeditions)
    let isMounted = true
    setIsLoadingMaster(true)
    Promise.all([
      deliveryOrdersApi.getVehicles().catch(() => ({ data: { success: false, data: [] } })),
      deliveryOrdersApi.getExpeditions().catch(() => ({ data: { success: false, data: [] } })),
    ])
      .then(([vRes, eRes]) => {
        if (!isMounted) return
        setVehicles(vRes.data?.data || [])
        setExpeditions(eRes.data?.data || [])
      })
      .finally(() => {
        if (isMounted) setIsLoadingMaster(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, items, todayStr])

  // Auto-fill driver and phone when vehicle is chosen from dropdown
  const handleVehicleChange = (carID: string) => {
    setSelectedCarID(carID)
    if (carID === '__custom__') {
      return
    }
    const found = vehicles.find((v) => v.fdCarID.toLowerCase() === carID.toLowerCase())
    if (found) {
      setCustomCarID(found.fdCarID)
      if (found.fdSupir) setSupir(found.fdSupir)
      if (found.fdNotel) setTelpSupir(found.fdNotel)
    } else {
      setCustomCarID(carID)
    }
  }

  const effectiveCarID = selectedCarID === '__custom__' ? customCarID.trim() : (selectedCarID || customCarID).trim()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (items.length === 0) {
      addToast({ type: 'error', message: 'Tidak ada Surat Jalan yang dipilih' })
      return
    }

    if (!sndDate) {
      addToast({ type: 'error', message: 'Tanggal Kirim / Konfirmasi wajib diisi' })
      return
    }

    if (!effectiveCarID) {
      addToast({ type: 'error', message: 'Plat Mobil wajib dipilih atau diisi' })
      return
    }

    if (!supir.trim()) {
      addToast({ type: 'error', message: 'Nama Supir wajib diisi' })
      return
    }

    if (useExpedition) {
      if (!expID) {
        addToast({ type: 'error', message: 'Nama Ekspedisi Lokal wajib dipilih' })
        return
      }
      if (!resiExp.trim()) {
        addToast({ type: 'error', message: 'Nomor Resi Ekspedisi wajib diisi' })
        return
      }
    }

    setIsSubmitting(true)
    try {
      const payload: ConfirmDeliveryDto = {
        sjNos: items.map((i) => i.fdSJNo),
        fdSndDate: sndDate,
        fdCarID: effectiveCarID,
        fdSupir: supir.trim(),
        fdTelpSupir: telpSupir.trim() || null,
        expedition: useExpedition
          ? {
              fdExpID: expID,
              fdResiExp: resiExp.trim(),
              fdCurrExp: currExp,
              fdTotalExp: Number(totalExp) || 0,
              fdPaid: paid,
            }
          : null,
      }

      const res = await deliveryOrdersApi.confirmDelivery(payload)
      if (res.data?.success) {
        addToast({
          type: 'success',
          message: isBatch
            ? `Berhasil mengonfirmasi ${res.data.count || items.length} Surat Jalan`
            : `Surat Jalan ${items[0].fdSJNo} berhasil dikonfirmasi terkirim`,
        })
        onSuccess()
        onClose()
      } else {
        throw new Error(res.data?.message || 'Gagal menyimpan konfirmasi')
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err?.response?.data?.error || err.message || 'Terjadi kesalahan sistem',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--color-primary)] flex items-center gap-2">
                Konfirmasi Pengiriman Surat Jalan
                {isBatch && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Batch ({items.length} SJ)
                  </span>
                )}
              </h3>
              <p className="text-xs text-[var(--color-secondary)]">
                {isBatch
                  ? `Mengisi tanggal pengiriman dan armada untuk ${items.length} Surat Jalan terpilih`
                  : `Isi Tanggal Konfirmasi & Ekspedisi untuk Surat Jalan ${items[0]?.fdSJNo}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--color-secondary)] hover:text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-neutral)] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Target SJ Summary Card */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-xs">
            {isBatch ? (
              <div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-medium mb-2">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-500" />
                    Daftar Surat Jalan Terpilih ({items.length}):
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Total: {items.reduce((s, i) => s + (i.fdJmlPackSJ || 0), 0)} Coly •{' '}
                    {items.reduce((s, i) => s + (i.fdJmlBeratSJ || 0), 0).toLocaleString('id-ID')} Kg
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {items.map((it) => (
                    <span
                      key={it.fdSJNo}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-mono text-[11px]"
                    >
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{it.fdSJNo}</span>
                      <span className="text-slate-400">({it.fdCustName || it.fdCustNameSJ})</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-slate-400 text-[11px] block">No. Surat Jalan</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-100 text-sm">
                    {items[0]?.fdSJNo}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Tanggal SJ</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {formatDate(items[0]?.fdSJDate)}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 text-[11px] block">Customer</span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold truncate block">
                    {items[0]?.fdCustName || items[0]?.fdCustNameSJ}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Marking</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {items[0]?.fdMarkingCode || '-'} {items[0]?.fdMarkingNo ? `(${items[0]?.fdMarkingNo})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Jumlah Muatan</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {items[0]?.fdJmlPackSJ} {items[0]?.fdSatuan || 'COLY'} • {items[0]?.fdJmlBeratSJ} Kg
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 text-[11px] block">Tujuan Pengiriman</span>
                  <span className="text-slate-600 dark:text-slate-400 truncate block">
                    {items[0]?.fdAddr ? `${items[0].fdAddr}, ${items[0].fdCity || ''}` : '-'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Form Fields: Tanggal Kirim, Plat Mobil, Supir, Telp */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-sky-500" />
              Informasi Pengiriman & Supir
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Tanggal Kirim */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Kirim / Konfirmasi <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={sndDate}
                    onChange={(e) => setSndDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* Pilihan Plat Mobil */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Plat Mobil / Armada <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedCarID}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                >
                  <option value="">-- Pilih Kendaraan Master --</option>
                  {vehicles.map((v) => (
                    <option key={v.fdCarID} value={v.fdCarID}>
                      {v.fdCarID} {v.fdSupir ? `(${v.fdSupir})` : ''}
                    </option>
                  ))}
                  <option value="__custom__">-- Ketik Plat Manual / Lainnya --</option>
                </select>
              </div>

              {/* Plat Mobil Manual jika dipilih custom */}
              {selectedCarID === '__custom__' && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Ketik Nomor Plat Mobil <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: B 1234 XYZ atau DIAMBIL"
                    value={customCarID}
                    onChange={(e) => setCustomCarID(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              )}

              {/* Nama Supir */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nama Supir <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Nama supir pengantar"
                    value={supir}
                    onChange={(e) => setSupir(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* Telp Supir */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  No. Telepon / HP Supir
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="0812xxxx atau telepon kontak"
                    value={telpSupir}
                    onChange={(e) => setTelpSupir(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Expedition Section (FoxPro Integration with tbExpIndo via sp_tbExpIndo) */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label 
                className="flex items-center gap-2 cursor-pointer select-none"
                onClick={() => setUseExpedition(!useExpedition)}
              >
                <input
                  type="checkbox"
                  checked={useExpedition}
                  onChange={(e) => setUseExpedition(e.target.checked)}
                  className="rounded text-sky-500 focus:ring-sky-400 border-slate-300 dark:border-slate-700 w-4 h-4"
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-indigo-500" />
                  Menggunakan Ekspedisi Lokal / Sub-Carrier (tbExpIndo)
                </span>
              </label>
              {useExpedition && (
                <span className="text-[11px] text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  FoxPro sp_tbExpIndo
                </span>
              )}
            </div>

            {useExpedition && (
              <div className="p-3.5 rounded-lg border border-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Nama Ekspedisi */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Nama Ekspedisi (tbExpedisi) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={expID}
                      onChange={(e) => setExpID(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Pilih Ekspedisi Lokal --</option>
                      {expeditions.map((e) => (
                        <option key={e.fdExpID} value={e.fdExpID}>
                          {e.fdExpName} ({e.fdExpID})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Resi Ekspedisi */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      No. Resi Ekspedisi <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Contoh: RESI-12345678"
                        value={resiExp}
                        onChange={(e) => setResiExp(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                      <Receipt className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  {/* Mata Uang & Total Ongkir */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Total Ongkir Ekspedisi
                    </label>
                    <div className="flex gap-1.5">
                      <select
                        value={currExp}
                        onChange={(e) => setCurrExp(e.target.value)}
                        className="w-20 px-2 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 font-mono"
                      >
                        <option value="RP.">RP.</option>
                        <option value="USD">USD</option>
                        <option value="IDR">IDR</option>
                      </select>
                      <input
                        type="number"
                        placeholder="0"
                        value={totalExp}
                        onChange={(e) => setTotalExp(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 font-mono text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Jenis Pembayaran Ekspedisi (fdPaid: 1 = Bayar Jkt, 2 = BT) */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Sistem Pembayaran Ongkir Ekspedisi
                    </label>
                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="paidMethod"
                          checked={paid === 1}
                          onChange={() => setPaid(1)}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          1 - Bayar Jakarta (Pengirim)
                        </span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="paidMethod"
                          checked={paid === 2}
                          onChange={() => setPaid(2)}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          2 - BT (Bayar Tujuan)
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between">
          <span className="text-xs text-[var(--color-secondary)]">
            {isBatch ? `${items.length} Surat Jalan akan di-update ke fdSent = 1` : `Status akan diubah ke Terkirim (fdSent = 1)`}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting || isLoadingMaster}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Konfirmasi Pengiriman
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
