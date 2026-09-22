import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Printer, ArrowLeft, Layers, FileText, Ruler, CheckSquare, Square } from 'lucide-react'
import { deliveryOrdersApi } from '../services/delivery-orders.service'
import { DeliveryPrintDocument } from '../components/DeliveryPrintDocument'
import { ROUTES } from '@/lib/constants'
import { useToastStore } from '@/stores/toastStore'
import type { DeliveryOrderDetailResponse, PrintDeliveryOrderDto } from '../types/delivery-orders.types'

export default function DeliveryOrderPrintPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { addToast } = useToastStore()

  const cleanId = (id || '').trim()

  // Dokumen type: 'both' | 'sj' | 'ukuran'
  const initialDoc = (searchParams.get('doc') as 'both' | 'sj' | 'ukuran') || 'both'
  const [documentType, setDocumentType] = useState<'both' | 'sj' | 'ukuran'>(initialDoc)

  // Options
  const [options, setOptions] = useState<PrintDeliveryOrderDto>({
    cetakUkuran: searchParams.get('ukuran') === '1',
    cetakSJKosong: searchParams.get('kosong') === '1',
    cetakKeterangan: searchParams.get('ket') !== '0',
    cetakSupir: searchParams.get('supir') !== '0',
  })

  // Fetch Delivery Order Detail
  const { data, isLoading, isError, refetch } = useQuery<DeliveryOrderDetailResponse | null>({
    queryKey: ['delivery-order-print-detail', cleanId],
    queryFn: async () => {
      if (!cleanId) return null
      const res = await deliveryOrdersApi.getById(cleanId)
      return res.data.data
    },
    enabled: !!cleanId,
    staleTime: 60 * 1000,
  })

  // Set document title untuk nama default file saat print
  useEffect(() => {
    if (data?.delivery?.fdSJNo) {
      const docLabel = documentType === 'both' ? 'SJ-UKURAN' : documentType === 'sj' ? 'SJ' : 'UKURAN'
      document.title = `${docLabel}-${data.delivery.fdSJNo}`
    }
  }, [data, documentType])

  // Handle auto print if param autoprint=1
  useEffect(() => {
    if (data && searchParams.get('autoprint') === '1') {
      const timer = setTimeout(() => {
        handlePrint()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [data, searchParams])

  const toggleOption = (key: keyof PrintDeliveryOrderDto) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handlePrint = async () => {
    if (!data) return
    try {
      await deliveryOrdersApi.recordPrint(data.delivery.fdSJNo, options)
      addToast({
        message: `Status cetak Surat Jalan ${data.delivery.fdSJNo} berhasil diperbarui.`,
        type: 'success',
      })
      refetch()
    } catch {
      // Ignore background record print error to let print dialog open
    } finally {
      window.print()
    }
  }

  const handleDocTypeChange = (type: 'both' | 'sj' | 'ukuran') => {
    setDocumentType(type)
    const newParams = new URLSearchParams(searchParams)
    newParams.set('doc', type)
    setSearchParams(newParams)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center font-mono text-xs">
        <div className="animate-spin w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full mb-3" />
        <p className="font-semibold text-neutral-700">Memuat Dokumen Surat Jalan {cleanId}...</p>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center p-4 font-mono text-xs">
        <div className="p-5 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 max-w-md text-center space-y-3 shadow-xs">
          <p className="font-bold">Gagal memuat Surat Jalan #{cleanId}</p>
          <p className="text-[11px] text-rose-600">Pastikan nomor Surat Jalan valid dan Anda memiliki hak akses cetak.</p>
          <button
            onClick={() => navigate(ROUTES.DELIVERY_ORDERS_LIST)}
            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors"
          >
            Kembali ke Daftar Surat Jalan
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-200/70 text-black font-sans pb-12">
      {/* ─── TOOLBAR KONTROL CETAK (NO-PRINT) ─── */}
      <div className="no-print sticky top-0 z-50 bg-neutral-900 text-white border-b border-neutral-800 shadow-md px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Kiri: Back button & Judul Dokumen */}
        <div className="flex items-center gap-3">
          <Link
            to={ROUTES.DELIVERY_DETAIL(cleanId)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Kembali ke Detail Surat Jalan"
          >
            <ArrowLeft size={13} />
            <span>Kembali</span>
          </Link>

          <div>
            <span className="font-bold text-sm tracking-wide text-amber-400 font-mono">
              {data.delivery.fdSJNo}
            </span>
            <span className="text-[11px] text-neutral-400 ml-2 hidden sm:inline">
              (Continuous Form 23 × 16.5 cm Landscape)
            </span>
          </div>
        </div>

        {/* Tengah: Selector Dokumen yang Dicetak */}
        <div className="flex items-center gap-1 bg-neutral-800 p-1 rounded-lg border border-neutral-700">
          <button
            type="button"
            onClick={() => handleDocTypeChange('both')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
              documentType === 'both'
                ? 'bg-amber-500 text-neutral-950 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers size={12} />
            <span>SJ + Lampiran (Keduanya)</span>
          </button>

          <button
            type="button"
            onClick={() => handleDocTypeChange('sj')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
              documentType === 'sj'
                ? 'bg-amber-500 text-neutral-950 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileText size={12} />
            <span>Hanya Surat Jalan</span>
          </button>

          <button
            type="button"
            onClick={() => handleDocTypeChange('ukuran')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
              documentType === 'ukuran'
                ? 'bg-amber-500 text-neutral-950 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Ruler size={12} />
            <span>Hanya Lampiran Ukuran</span>
          </button>
        </div>

        {/* Kanan: Opsi Ringkas & Tombol Print Utama */}
        <div className="flex items-center gap-3">
          {/* Quick Toggle Options */}
          <div className="hidden lg:flex items-center gap-3 text-[11px] text-neutral-300">
            <label
              onClick={() => toggleOption('cetakUkuran')}
              className="flex items-center gap-1 cursor-pointer select-none"
              title="Cetak rincian coly di badan Surat Jalan"
            >
              {options.cetakUkuran ? <CheckSquare size={13} className="text-amber-400" /> : <Square size={13} />}
              <span>Sub-Ukuran di SJ</span>
            </label>

            <label
              onClick={() => toggleOption('cetakSupir')}
              className="flex items-center gap-1 cursor-pointer select-none"
              title="Cetak nama supir pada tanda terima"
            >
              {options.cetakSupir ? <CheckSquare size={13} className="text-amber-400" /> : <Square size={13} />}
              <span>Nama Supir</span>
            </label>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-md transition-transform active:scale-95 cursor-pointer"
          >
            <Printer size={14} />
            <span>Cetak Dokumen</span>
          </button>
        </div>
      </div>

      {/* ─── LIVE PREVIEW / LEMBAR CONTINUOUS FORM ─── */}
      <div className="pt-4 overflow-x-auto">
        <DeliveryPrintDocument
          data={data}
          documentType={documentType}
          options={options}
          isPrintPreview={true}
        />
      </div>
    </div>
  )
}
