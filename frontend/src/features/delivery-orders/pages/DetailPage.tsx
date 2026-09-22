import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Truck,
  Package,
  CheckCircle2,
  Clock,
  Printer,
  FileCheck,
  FileText,
  Edit3,
  Save,
  X,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Ruler,
  Building2,
  MapPin,
  Calendar,
  Layers,
  ShieldAlert,
} from 'lucide-react'
import { deliveryOrdersApi } from '../services/delivery-orders.service'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { PrintDeliveryOrderModal } from '../components/PrintDeliveryOrderModal'
import { DimensionDetailModal } from '@/features/billing/components/DimensionDetailModal'
import { formatDate, copyToClipboard, displayCustName, formatDecimal, formatNumber } from '@/lib/utils'
import { useToastStore } from '@/stores/toastStore'
import { useTranslation } from '@/hooks/useTranslation'
import { ROUTES } from '@/lib/constants'
import type { UpdateDeliveryOrderDto } from '../types/delivery-orders.types'

function DetailPageSkeleton() {
  const { t } = useTranslation()
  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0 space-y-6 bg-[var(--color-surface)] font-[var(--font-body)] animate-fadeIn pb-24">
      <PageHeader
        title={t('delivery.detail.title')}
        subtitle={t('delivery.detail.subtitle')}
        breadcrumbs={[
          { label: t('module.logistics'), path: ROUTES.DELIVERY_ORDERS },
          { label: t('nav.deliveryOrder'), path: ROUTES.DELIVERY_ORDERS },
          { label: 'Memuat...' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 rounded-lg skeleton-shimmer" />
            <div className="h-8 w-20 rounded-lg skeleton-shimmer" />
          </div>
        }
      />

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-2.5 shadow-xs">
            <div className="flex justify-between items-center">
              <div className="h-3 w-20 rounded skeleton-shimmer" />
              <div className="h-4 w-12 rounded-full skeleton-shimmer" />
            </div>
            <div className="h-5 w-3/4 rounded skeleton-shimmer" />
            <div className="h-3.5 w-1/2 rounded skeleton-shimmer" />
          </div>
        ))}
      </div>

      {/* Main Grid Panels Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4 shadow-xs">
            <div className="h-5 w-48 rounded skeleton-shimmer" />
            <div className="space-y-2.5 pt-2">
              <div className="h-8 w-full rounded-lg skeleton-shimmer" />
              <div className="h-8 w-full rounded-lg skeleton-shimmer" />
              <div className="h-8 w-full rounded-lg skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { addToast } = useToastStore()

  // State Management
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<UpdateDeliveryOrderDto>({
    fdEstimasi: '',
    fdCarID: '',
    fdSupir: '',
    fdTelpSupir: '',
    fdSndDate: '',
    fdCustNameSJ: '',
    fdContact: '',
    fdAddr: '',
    fdCity: '',
    fdTelp: '',
    fdHp: '',
    fdEmail: '',
    fdDescr: '',
    fdJmlPackSJ: null,
    fdSatuan: '',
    fdJmlBeratSJ: null,
    fdKondisiBarang: 1,
    fdExpID: '',
    fdExp3: 0,
    fdKembali: '',
    fdTerima: '',
  })
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [isDimensionModalOpen, setIsDimensionModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch Delivery Order Detail
  const {
    data: detailResponse,
    isLoading: isDetailLoading,
    refetch: refetchDetail,
  } = useQuery({
    queryKey: ['delivery-order-detail', id],
    queryFn: async () => {
      if (!id) throw new Error('ID Surat Jalan tidak valid')
      const res = await deliveryOrdersApi.detail(id)
      return res.data.data
    },
    enabled: !!id,
  })

  // Fetch Master Data (tbKendaraan, tbSatuan, tbJenisPembayaran, tbExpedisi)
  const { data: masterData } = useQuery({
    queryKey: ['delivery-master-data'],
    queryFn: async () => {
      const res = await deliveryOrdersApi.getMasterData()
      return res.data.data
    },
    staleTime: 5 * 60 * 1000,
  })

  // Start Edit Mode with current data
  const handleStartEdit = () => {
    if (!detailResponse) return
    const { delivery } = detailResponse
    setEditForm({
      fdEstimasi: delivery.fdEstimasi ? delivery.fdEstimasi.slice(0, 10) : '',
      fdCarID: delivery.fdCarID || '',
      fdSupir: delivery.fdSupir || '',
      fdTelpSupir: delivery.fdTelpSupir || '',
      fdSndDate: delivery.fdSndDate ? delivery.fdSndDate.slice(0, 10) : '',
      fdCustNameSJ: delivery.fdCustNameSJ || '',
      fdContact: delivery.fdContact || '',
      fdAddr: delivery.fdAddr || '',
      fdCity: delivery.fdCity || '',
      fdTelp: delivery.fdTelp || '',
      fdHp: delivery.fdHp || '',
      fdEmail: delivery.fdEmail || '',
      fdDescr: delivery.fdDescr || '',
      fdJmlPackSJ: delivery.fdJmlPackSJ ?? null,
      fdSatuan: delivery.fdSatuan || '',
      fdJmlBeratSJ: delivery.fdJmlBeratSJ ?? null,
      fdKondisiBarang: delivery.fdKondisiBarang ?? 1,
      fdExpID: delivery.fdExpID || '',
      fdExp3: delivery.fdExp3 ?? 0,
      fdKembali: delivery.fdKembali ? delivery.fdKembali.slice(0, 10) : '',
      fdTerima: delivery.fdTerima || '',
      fdGive: delivery.fdGive ?? null,
      fdGiveDate: delivery.fdGiveDate ? delivery.fdGiveDate.slice(0, 10) : '',
    })
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
  }

  // Handle Fleet Auto-fill (tbKendaraan)
  const handleVehicleChange = (carId: string) => {
    const selected = masterData?.vehicles.find((v) => v.fdCarID === carId)
    setEditForm((prev) => ({
      ...prev,
      fdCarID: carId,
      fdSupir: selected?.fdSupir ? selected.fdSupir : prev.fdSupir,
      fdTelpSupir: selected?.fdNotel ? selected.fdNotel : prev.fdTelpSupir,
    }))
  }

  // Save changes to backend
  const handleSave = async () => {
    if (!id) return

    // Mandatory FoxPro Validation Check
    if (!editForm.fdEstimasi || !editForm.fdEstimasi.trim()) {
      addToast({
        message: 'Tanggal estimasi pengiriman tidak boleh kosong!',
        type: 'error',
      })
      return
    }

    if (!editForm.fdCarID || !editForm.fdCarID.trim()) {
      addToast({
        message: 'Nomor kendaraan (Mobil) tidak boleh kosong!',
        type: 'error',
      })
      return
    }

    try {
      setIsSaving(true)
      await deliveryOrdersApi.update(id, editForm)
      addToast({
        message: 'Data Surat Jalan berhasil diperbarui!',
        type: 'success',
      })
      setIsEditing(false)
      refetchDetail()
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] })
    } catch (err: any) {
      addToast({
        message: err?.response?.data?.error || err.message || 'Gagal menyimpan data',
        type: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Delete Delivery Order
  const handleDelete = async () => {
    if (!id) return
    try {
      setIsDeleting(true)
      await deliveryOrdersApi.delete(id)
      addToast({
        message: `Surat Jalan ${id} berhasil dihapus!`,
        type: 'success',
      })
      setIsDeleteModalOpen(false)
      navigate(ROUTES.DELIVERY_ORDERS)
    } catch (err: any) {
      addToast({
        message: err?.response?.data?.error || err.message || 'Gagal menghapus Surat Jalan',
        type: 'error',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCopy = (text: string, field: string) => {
    copyToClipboard(text)
    setCopiedId(field)
    setTimeout(() => setCopiedId(null), 1500)
  }

  if (isDetailLoading && !detailResponse) {
    return <DetailPageSkeleton />
  }

  if (!detailResponse) {
    return (
      <div className="p-8 text-center bg-[var(--color-surface)]">
        <p className="text-sm text-[var(--color-secondary)]">Surat Jalan tidak ditemukan.</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(ROUTES.DELIVERY_ORDERS)}
          className="mt-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Daftar
        </Button>
      </div>
    )
  }

  const {
    delivery,
    customer,
    entryList,
    m3Comparison,
    orderDelivery,
    expedition,
    isAmfibi,
    amfibiMarking,
    financeBlocked,
  } = detailResponse

  const isDelivered = delivery.fdSent === 1
  const isPrinted = delivery.fdPrint === 1 || !!delivery.fdPrintDate
  const isAr = delivery.fdGive === 1 || !!delivery.fdGiveDate
  const isBilling = !isAr && !!delivery.fdSndDate
  const statusBlocked = customer?.fdBlocked ?? 0
  const statusName = customer?.fdBlockedStatusName || (
    statusBlocked === 1 ? 'OK' :
    statusBlocked === 2 ? 'COD' :
    statusBlocked === 3 ? 'WARNING' :
    statusBlocked === 4 ? 'BLOCKED' :
    statusBlocked === 5 ? 'URGENT' :
    'NO STATUS'
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0 space-y-6 bg-[var(--color-surface)] font-[var(--font-body)] animate-fadeIn pb-24">
      {/* ─── Page Header & Action Bar ─── */}
      <PageHeader
        title={t('delivery.detail.title')}
        subtitle={t('delivery.detail.subtitle')}
        breadcrumbs={[
          { label: t('module.logistics'), path: ROUTES.DELIVERY_ORDERS },
          { label: t('nav.deliveryOrder'), path: ROUTES.DELIVERY_ORDERS },
          { label: delivery.fdSJNo },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {!isEditing ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleStartEdit}
                  className="gap-1.5"
                >
                  <Edit3 size={14} />
                  <span>{t('delivery.action.edit')}</span>
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="gap-1.5"
                >
                  <Printer size={14} />
                  <span>{t('delivery.action.print')}</span>
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="gap-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border-rose-500/30"
                >
                  <Trash2 size={14} />
                  <span>{t('delivery.action.delete')}</span>
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(ROUTES.DELIVERY_ORDERS)}
                  className="gap-1.5"
                >
                  <ArrowLeft size={14} />
                  <span>Kembali</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="gap-1.5"
                >
                  <Save size={14} />
                  <span>{isSaving ? 'Menyimpan...' : t('delivery.action.save')}</span>
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="gap-1.5"
                >
                  <X size={14} />
                  <span>{t('delivery.action.cancel')}</span>
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* ─── Conditional Alert Banners ─── */}
      {/* 1. Amfibi Banner */}
      {isAmfibi && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3.5 text-amber-700 dark:text-amber-300 animate-pulse">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold uppercase tracking-wide">
              {t('delivery.alert.amfibi')}
            </h4>
            <p className="text-xs mt-0.5 leading-relaxed opacity-90">
              Marking <strong>{amfibiMarking || entryList?.fdMarkingCode}</strong> teridentifikasi sebagai muatan Barang Amfibi. Harap pastikan instruksi penanganan khusus di gudang dan armada.
            </p>
          </div>
        </div>
      )}

      {/* 2. Finance Blocked Banner (MUNCUL APABILA tbEntryList_Bloked_Finance -> fdBlocked = 1) */}
      {financeBlocked?.isBlocked && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 flex items-start gap-3.5 text-rose-700 dark:text-rose-300">
          <ShieldAlert className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold uppercase tracking-wide">
              PERINGATAN: Pelanggan ini sedang dalam status DIBLOKIR / DITAHAN oleh Bagian Keuangan!
            </h4>
            <p className="text-xs mt-0.5 leading-relaxed opacity-90">
              Customer <strong>{customer?.fdCustName}</strong> (No. List: <strong>{entryList?.fdListCode}</strong>) berstatus <strong>DITAHAN OLEH FINANCE</strong> (<code>tbEntryList_Bloked_Finance</code>).
              {financeBlocked.blockedReason && (
                <span className="block mt-1">
                  Alasan: <em>"{financeBlocked.blockedReason}"</em>
                </span>
              )}
              {financeBlocked.blockedBy && (
                <span className="block text-[11px] opacity-80 mt-0.5">
                  Petugas Pemblokir: {financeBlocked.blockedBy}
                </span>
              )}
              <span className="block mt-1 font-semibold">
                Pengiriman kargo wajib mengantongi persetujuan manajemen keuangan sebelum dilepas.
              </span>
            </p>
          </div>
        </div>
      )}

      {/* ─── Header Info Bar ─── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 rounded-xl bg-transparent border border-[var(--color-tertiary)]/40 text-[var(--color-tertiary)] flex items-center justify-center">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-lg font-bold text-[var(--color-primary)]">
                {delivery.fdSJNo}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(delivery.fdSJNo, 'sjno')}
                className="p-1 text-[var(--color-secondary)] hover:text-[var(--color-primary)] rounded transition-colors"
                title="Salin No. SJ"
              >
                {copiedId === 'sjno' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>

              {/* Status Badges */}
              <div className="flex items-center gap-1.5 flex-wrap ml-2">
                {isDelivered ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={11} />
                    {t('delivery.status.delivered')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 border border-amber-500/40 text-amber-600 dark:text-amber-400">
                    <Clock size={11} />
                    {t('delivery.status.inProcess')}
                  </span>
                )}

                {isPrinted ? (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/10 border border-sky-500/40 text-sky-600 dark:text-sky-400"
                    title={delivery.fdPrintDate ? `Dicetak: ${formatDate(delivery.fdPrintDate)}` : undefined}
                  >
                    <Printer size={11} />
                    {t('delivery.status.printed')}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-transparent border border-dashed border-[var(--color-border)] text-[var(--color-secondary)]">
                    {t('delivery.status.unprinted')}
                  </span>
                )}

                {/* Posisi Dokumen: AR vs Billing (Keluar Gudang) vs Gudang */}
                {isAr ? (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/10 border border-purple-500/40 text-purple-600 dark:text-purple-400"
                    title={delivery.fdGiveDate ? `Diserahkan ke AR: ${formatDate(delivery.fdGiveDate)}` : 'Diserahkan ke AR'}
                  >
                    <FileCheck size={11} />
                    <span>AR{delivery.fdGiveDate ? ` • ${formatDate(delivery.fdGiveDate)}` : ''}</span>
                  </span>
                ) : isBilling ? (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 border border-indigo-500/40 text-indigo-600 dark:text-indigo-400"
                    title={`Keluar Gudang / Di Billing: ${formatDate(delivery.fdSndDate!)}`}
                  >
                    <FileText size={11} />
                    <span>Billing • {formatDate(delivery.fdSndDate!)}</span>
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-transparent border border-dashed border-[var(--color-border)] text-[var(--color-secondary)]"
                    title="Surat Jalan masih di Gudang (belum keluar)"
                  >
                    Gudang
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-[var(--color-secondary)] mt-0.5">
              Penerima: <strong className="text-[var(--color-primary)]">{displayCustName(delivery.fdCustNameSJ || customer?.fdCustName, 'Customer')}</strong>
              {delivery.fdSJDate && ` • Tgl SJ: ${formatDate(delivery.fdSJDate)}`}
            </p>
          </div>
        </div>

        {/* Quick KPI Summary Bar */}
        <div className="flex items-center gap-5 text-right">
          <div>
            <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
              Total Coly
            </span>
            <span className="text-sm font-bold font-mono tabular-nums text-[var(--color-primary)]">
              {delivery.fdJmlPackSJ ?? entryList?.fdJmlPack ?? 0} {delivery.fdSatuan || 'KOLI'}
            </span>
          </div>

          <div className="h-7 w-px bg-[var(--color-border)]" />

          <div>
            <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
              Total Berat
            </span>
            <span className="text-sm font-bold font-mono tabular-nums text-[var(--color-primary)]">
              {formatDecimal(delivery.fdJmlBeratSJ ?? entryList?.fdJmlBerat ?? 0)} kg
            </span>
          </div>

          <div className="h-7 w-px bg-[var(--color-border)]" />

          <div>
            <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
              M³ Fisik
            </span>
            <span className="text-sm font-bold font-mono tabular-nums text-[var(--color-tertiary)]">
              {formatDecimal(m3Comparison.m3Gudang || m3Comparison.m3PackingList || 0, 4)} m³
            </span>
          </div>
        </div>
      </div>

      {/* ─── Main Content Panels ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL 1: Dokumen & Logistik Armada */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[var(--color-tertiary)]" />
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-[var(--color-primary)] font-[var(--font-label)]">
                {t('delivery.card.headerArmada')}
              </h3>
            </div>
            {isEditing && (
              <span className="text-[10.5px] font-semibold text-[var(--color-tertiary)] px-2 py-0.5 rounded bg-[var(--color-tertiary)]/10 border border-[var(--color-tertiary)]/30">
                Mode Edit
              </span>
            )}
          </div>

          {!isEditing ? (
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] block">
                  Nomor Kendaraan (Plat)
                </span>
                <span className="font-semibold text-sm text-[var(--color-primary)] mt-0.5 block">
                  {delivery.fdCarID || '—'}
                </span>
              </div>

              <div>
                <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] block">
                  Nama Supir
                </span>
                <span className="font-medium text-[var(--color-primary)] mt-0.5 block">
                  {delivery.fdSupir || '—'}
                </span>
              </div>

              <div>
                <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] block">
                  Telepon Supir
                </span>
                <span className="text-[var(--color-primary)] mt-0.5 block">
                  {delivery.fdTelpSupir || '—'}
                </span>
              </div>

              <div>
                <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] block">
                  Tanggal Estimasi Kirim
                </span>
                <span className="font-semibold text-[var(--color-primary)] mt-0.5 block">
                  {delivery.fdEstimasi ? formatDate(delivery.fdEstimasi) : '—'}
                </span>
              </div>

              <div>
                <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] block">
                  Tanggal Kirim Riil
                </span>
                <span className="text-[var(--color-primary)] mt-0.5 block">
                  {delivery.fdSndDate ? formatDate(delivery.fdSndDate) : '—'}
                </span>
              </div>

              <div>
                <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] block">
                  Tanggal Kembali
                </span>
                <span className="text-[var(--color-primary)] mt-0.5 block">
                  {delivery.fdKembali ? formatDate(delivery.fdKembali) : '—'}
                </span>
              </div>

              <div>
                <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] block">
                  Kondisi Barang
                </span>
                <span className="mt-0.5 block">
                  {delivery.fdKondisiBarang === 1 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                      Baik
                    </span>
                  ) : delivery.fdKondisiBarang === 2 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 border border-amber-500/40 text-amber-600 dark:text-amber-400">
                      Rusak Ringan
                    </span>
                  ) : delivery.fdKondisiBarang === 3 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 border border-rose-500/40 text-rose-600 dark:text-rose-400">
                      Rusak Berat
                    </span>
                  ) : (
                    'Baik'
                  )}
                </span>
              </div>

              <div>
                <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] block">
                  Dibuat Oleh
                </span>
                <span className="text-[var(--color-secondary)] mt-0.5 block">
                  {delivery.fdCreated || '—'} {delivery.fdUpdate && `(Rev: ${delivery.fdUpdate})`}
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Dropdown Armada tbKendaraan */}
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                  Nomor Mobil <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editForm.fdCarID}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
                >
                  <option value="">-- Pilih Armada --</option>
                  {masterData?.vehicles.map((v) => (
                    <option key={v.fdCarID} value={v.fdCarID}>
                      {v.fdCarID} {v.fdSupir ? `(${v.fdSupir})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                  Tanggal Estimasi Kirim <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={editForm.fdEstimasi}
                  onChange={(e) => setEditForm({ ...editForm, fdEstimasi: e.target.value })}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                  Nama Supir
                </label>
                <input
                  type="text"
                  value={editForm.fdSupir || ''}
                  onChange={(e) => setEditForm({ ...editForm, fdSupir: e.target.value })}
                  placeholder="Nama pengemudi armada"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                  Telepon Supir
                </label>
                <input
                  type="text"
                  value={editForm.fdTelpSupir || ''}
                  onChange={(e) => setEditForm({ ...editForm, fdTelpSupir: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                  Tanggal Kirim Riil
                </label>
                <input
                  type="date"
                  value={editForm.fdSndDate || ''}
                  onChange={(e) => setEditForm({ ...editForm, fdSndDate: e.target.value })}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                  Tanggal Kembali
                </label>
                <input
                  type="date"
                  value={editForm.fdKembali || ''}
                  onChange={(e) => setEditForm({ ...editForm, fdKembali: e.target.value })}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
                />
              </div>

              <div className="col-span-2">
                <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                  Kondisi Barang
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 1, label: 'Baik' },
                    { val: 2, label: 'Rusak Ringan' },
                    { val: 3, label: 'Rusak Berat' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, fdKondisiBarang: opt.val })}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        editForm.fdKondisiBarang === opt.val
                          ? 'border-[var(--color-tertiary)] bg-[var(--color-tertiary)]/10 text-[var(--color-tertiary)] shadow-xs'
                          : 'border-[var(--color-border)] bg-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PANEL 2: Data Pelanggan & Alamat Penerima */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[var(--color-tertiary)]" />
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-[var(--color-primary)] font-[var(--font-label)]">
                {t('delivery.card.customerReceiver')}
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              {customer?.fdBlocked !== undefined && (
                <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded border ${
                  statusBlocked === 1
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : statusBlocked === 2
                    ? 'border-teal-500/40 bg-teal-500/10 text-teal-600 dark:text-teal-400'
                    : statusBlocked === 3
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : statusBlocked === 4
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : statusBlocked === 5
                    ? 'border-emerald-600/40 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-[var(--color-border)] bg-transparent text-[var(--color-secondary)]'
                }`}>
                  Status: {statusName}
                </span>
              )}
              {customer?.fdCustCode && (
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-secondary)]">
                  {customer.fdCustCode}
                </span>
              )}
            </div>
          </div>

          {!isEditing ? (
            <div className="space-y-3 text-xs">
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/40 p-3">
                <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] block">
                  Penerima Kargo (Surat Jalan)
                </span>
                <span className="font-bold text-sm text-[var(--color-primary)] mt-0.5 block">
                  {delivery.fdCustNameSJ || customer?.fdCustName || '—'}
                </span>
                {customer?.fdCustName && customer.fdCustName !== delivery.fdCustNameSJ && (
                  <div className="text-[11px] text-[var(--color-secondary)] mt-1 flex items-center gap-1.5">
                    <span>Master Akun:</span>
                    <span className="font-medium text-[var(--color-primary)]">{customer.fdCustName}</span>
                  </div>
                )}
                {customer?.fdBroker === 2 && (
                  <span className="inline-flex items-center px-1.5 py-0.2 mt-1 rounded text-[10px] font-semibold bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400">
                    Pelanggan Broker
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] block">
                    Nama Penerima di Surat Jalan
                  </span>
                  <span className="font-medium text-[var(--color-primary)] mt-0.5 block">
                    {delivery.fdCustNameSJ || '—'}
                  </span>
                </div>

                <div>
                  <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] block">
                    Contact Person (PIC)
                  </span>
                  <span className="text-[var(--color-primary)] mt-0.5 block">
                    {delivery.fdContact || customer?.fdContact || '—'}
                  </span>
                </div>

                <div>
                  <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] block">
                    Telepon Kantor
                  </span>
                  <span className="text-[var(--color-primary)] mt-0.5 block">
                    {delivery.fdTelp || customer?.fdTelp || '—'}
                  </span>
                </div>

                <div>
                  <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] block">
                    No. Handphone / WhatsApp
                  </span>
                  <span className="text-[var(--color-primary)] mt-0.5 block">
                    {delivery.fdHp || customer?.fdHP || '—'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] block">
                  Alamat Pengiriman
                </span>
                <p className="text-[var(--color-primary)] mt-0.5 leading-relaxed">
                  {delivery.fdAddr || customer?.fdAddr1 || '—'}
                  {delivery.fdCity && ` (${delivery.fdCity})`}
                </p>
              </div>

              {delivery.fdDescr && (
                <div>
                  <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] block">
                    Catatan Pengiriman / Delivery Note
                  </span>
                  <p className="text-[var(--color-primary)] mt-0.5 italic bg-[var(--color-neutral)]/50 p-2 rounded-lg border border-[var(--color-border)]">
                    "{delivery.fdDescr}"
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                  Nama Penerima di Surat Jalan
                </label>
                <input
                  type="text"
                  value={editForm.fdCustNameSJ || ''}
                  onChange={(e) => setEditForm({ ...editForm, fdCustNameSJ: e.target.value })}
                  placeholder="Nama customer / PIC pada surat jalan"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={editForm.fdContact || ''}
                    onChange={(e) => setEditForm({ ...editForm, fdContact: e.target.value })}
                    placeholder="Nama kontak"
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                    Kota Tujuan
                  </label>
                  <input
                    type="text"
                    value={editForm.fdCity || ''}
                    onChange={(e) => setEditForm({ ...editForm, fdCity: e.target.value })}
                    placeholder="Jakarta, Tangerang, dll"
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                    Telepon
                  </label>
                  <input
                    type="text"
                    value={editForm.fdTelp || ''}
                    onChange={(e) => setEditForm({ ...editForm, fdTelp: e.target.value })}
                    placeholder="No. Telp"
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                    No. HP / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={editForm.fdHp || ''}
                    onChange={(e) => setEditForm({ ...editForm, fdHp: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                  Alamat Kirim Lengkap
                </label>
                <textarea
                  rows={2}
                  value={editForm.fdAddr || ''}
                  onChange={(e) => setEditForm({ ...editForm, fdAddr: e.target.value })}
                  placeholder="Jalan, nomor, kelurahan, kecamatan..."
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                  Catatan Pengiriman / Delivery Note
                </label>
                <input
                  type="text"
                  value={editForm.fdDescr || ''}
                  onChange={(e) => setEditForm({ ...editForm, fdDescr: e.target.value })}
                  placeholder="Catatan pengiriman kargo..."
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
                />
              </div>
            </div>
          )}
        </div>

        {/* PANEL 3: Rincian Muatan Kargo & Audit Fisik Gudang */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-[var(--color-tertiary)]" />
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-[var(--color-primary)] font-[var(--font-label)]">
                {t('delivery.card.cargoManifest')}
              </h3>
            </div>

            {/* Tombol Cek Dimensi Koli Fisik (FoxPro Cmd1) */}
            {entryList?.fdListCode && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsDimensionModalOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Ruler size={13} />
                <span>{t('delivery.action.checkDimensions')}</span>
              </Button>
            )}
          </div>

          {/* Manifest Context Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/40 p-3.5 text-xs">
            <div>
              <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                No. List Kargo
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="font-mono font-semibold text-[var(--color-primary)]">
                  {entryList?.fdListCode || delivery.fdListCode || '—'}
                </span>
                {entryList?.fdListCode && (
                  <button
                    type="button"
                    onClick={() => handleCopy(entryList.fdListCode, 'listcode')}
                    className="text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                  >
                    {copiedId === 'listcode' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                )}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                Cabang
              </span>
              <span className="font-medium text-[var(--color-primary)] mt-0.5 block truncate">
                {entryList?.fdBranchName || entryList?.fdBranchCode || '—'}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                No. Kontainer
              </span>
              <span className="font-mono font-medium text-[var(--color-primary)] mt-0.5 block truncate">
                {entryList?.fdContainerNo || '—'}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                Kode Marking
              </span>
              <span className="font-semibold text-[var(--color-tertiary)] mt-0.5 block truncate">
                {entryList?.fdMarkingCode || '—'}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                No. Invoice
              </span>
              <span className="font-mono font-medium text-[var(--color-primary)] mt-0.5 block truncate" title={entryList?.fdInvoiceNo || undefined}>
                {entryList?.fdInvoiceNo || '—'}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                Komoditas
              </span>
              <span className="font-medium text-[var(--color-primary)] mt-0.5 block truncate" title={entryList?.fdComodity || undefined}>
                {entryList?.fdComodity || '—'}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                Lokasi Gudang
              </span>
              <span className="font-semibold text-[var(--color-primary)] mt-0.5 block">
                {entryList?.fdLokasi || '—'}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                Tgl Masuk Gudang
              </span>
              <span className="text-[var(--color-secondary)] mt-0.5 block">
                {entryList?.fdTgl_IN ? formatDate(entryList.fdTgl_IN) : '—'}
              </span>
            </div>
          </div>

          {/* Tabel Komparasi Fisik: Surat Jalan vs Gudang (FoxPro Grid Comparison) */}
          <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--color-neutral)]/60 text-[10.5px] uppercase tracking-wider text-[var(--color-secondary)] border-b border-[var(--color-border)] font-semibold">
                <tr>
                  <th className="py-2.5 px-3.5">Parameter Muatan</th>
                  <th className="py-2.5 px-3.5 text-right">Data Surat Jalan (Aktual)</th>
                  <th className="py-2.5 px-3.5 text-right">Data Fisik Gudang</th>
                  <th className="py-2.5 px-3.5 text-right">Status Selisih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {/* 1. Kuantitas Koli */}
                <tr className="hover:bg-[var(--color-neutral)]/30">
                  <td className="py-2.5 px-3.5 font-medium text-[var(--color-primary)]">
                    Kuantitas Koli / Pack
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-[var(--color-primary)] tabular-nums">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editForm.fdJmlPackSJ ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, fdJmlPackSJ: e.target.value ? Number(e.target.value) : null })}
                        className="w-24 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-right text-xs text-[var(--color-primary)]"
                      />
                    ) : (
                      formatNumber(delivery.fdJmlPackSJ ?? 0)
                    )}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-[var(--color-secondary)]">
                    {formatNumber(entryList?.fdJmlPack2 ?? entryList?.fdJmlPack ?? 0)}
                  </td>
                  <td className="py-2.5 px-3.5 text-right">
                    {Number(delivery.fdJmlPackSJ || 0) === Number(entryList?.fdJmlPack2 ?? entryList?.fdJmlPack ?? 0) ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={11} /> Sesuai
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        <AlertTriangle size={11} /> Selisih {Number(delivery.fdJmlPackSJ || 0) - Number(entryList?.fdJmlPack2 ?? entryList?.fdJmlPack ?? 0)}
                      </span>
                    )}
                  </td>
                </tr>

                {/* 2. Satuan Koli */}
                <tr className="hover:bg-[var(--color-neutral)]/30">
                  <td className="py-2.5 px-3.5 font-medium text-[var(--color-primary)]">
                    Satuan Coly
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono text-[var(--color-primary)]">
                    {isEditing ? (
                      <select
                        value={editForm.fdSatuan || ''}
                        onChange={(e) => setEditForm({ ...editForm, fdSatuan: e.target.value })}
                        className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-primary)]"
                      >
                        <option value="">-- Satuan --</option>
                        {masterData?.units.map((u) => (
                          <option key={u.fdUnitCode} value={u.fdUnitCode}>
                            {u.fdUnitCode}
                          </option>
                        ))}
                      </select>
                    ) : (
                      delivery.fdSatuan || 'KOLI'
                    )}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono text-[var(--color-secondary)]">
                    {entryList?.fdSatuan2 || entryList?.fdSatuan || 'KOLI'}
                  </td>
                  <td className="py-2.5 px-3.5 text-right">
                    <span className="text-[11px] text-[var(--color-secondary)]">—</span>
                  </td>
                </tr>

                {/* 3. Berat Bersih */}
                <tr className="hover:bg-[var(--color-neutral)]/30">
                  <td className="py-2.5 px-3.5 font-medium text-[var(--color-primary)]">
                    Berat Kargo (kg)
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-[var(--color-primary)] tabular-nums">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.fdJmlBeratSJ ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, fdJmlBeratSJ: e.target.value ? Number(e.target.value) : null })}
                        className="w-24 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-right text-xs text-[var(--color-primary)]"
                      />
                    ) : (
                      `${formatDecimal(delivery.fdJmlBeratSJ ?? 0)} kg`
                    )}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-[var(--color-secondary)]">
                    {formatDecimal(entryList?.fdJmlBerat2 ?? entryList?.fdJmlBerat ?? 0)} kg
                  </td>
                  <td className="py-2.5 px-3.5 text-right">
                    {Math.abs(Number(delivery.fdJmlBeratSJ || 0) - Number(entryList?.fdJmlBerat2 ?? entryList?.fdJmlBerat ?? 0)) < 0.05 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={11} /> Sesuai
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        <AlertTriangle size={11} /> Selisih {(Number(delivery.fdJmlBeratSJ || 0) - Number(entryList?.fdJmlBerat2 ?? entryList?.fdJmlBerat ?? 0)).toFixed(2)} kg
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* PANEL 4: Trio Kubikasi M3 (FoxPro M3 Packing List vs Gudang vs Bill) */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
            <Layers className="w-4 h-4 text-[var(--color-tertiary)]" />
            <h3 className="text-[13px] font-bold uppercase tracking-wide text-[var(--color-primary)] font-[var(--font-label)]">
              {t('delivery.card.m3Metrics')}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. M3 Packing List */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-neutral)]/40 p-3.5">
              <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                M³ Packing List
              </span>
              <span className="text-base font-bold font-mono text-[var(--color-primary)] mt-1 block tabular-nums">
                {formatDecimal(m3Comparison.m3PackingList, 4)} m³
              </span>
              <span className="text-[11px] text-[var(--color-secondary)] mt-0.5 block">
                Menurut dokumen pengirim
              </span>
            </div>

            {/* 2. M3 Gudang */}
            <div className="rounded-xl border border-[var(--color-tertiary)]/40 bg-[var(--color-tertiary)]/5 p-3.5">
              <span className="text-[10px] uppercase font-semibold text-[var(--color-tertiary)] block">
                M³ Fisik Gudang
              </span>
              <span className="text-base font-bold font-mono text-[var(--color-tertiary)] mt-1 block tabular-nums">
                {formatDecimal(m3Comparison.m3Gudang, 4)} m³
              </span>
              <span className="text-[11px] text-[var(--color-secondary)] mt-0.5 block">
                Ukuran aktual gudang
              </span>
            </div>

            {/* 3. M3 Ditagihkan (Bill) */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-neutral)]/40 p-3.5">
              <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                M³ Tagihan (Invoice)
              </span>
              <span className="text-base font-bold font-mono text-[var(--color-primary)] mt-1 block tabular-nums">
                {formatDecimal(m3Comparison.m3Bill, 4)} m³
              </span>
              <span className="text-[11px] text-[var(--color-secondary)] mt-0.5 block">
                Invoice penagihan finance
              </span>
            </div>
          </div>
        </div>

        {/* PANEL 5: Instruksi Pengiriman CS (qr_OrderDelivey) */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--color-tertiary)]" />
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-[var(--color-primary)] font-[var(--font-label)]">
                {t('delivery.card.orderDelivery')}
              </h3>
            </div>
            {orderDelivery?.fdJenisPembayaranLabel && (
              <span className={`px-2 py-0.5 rounded text-[10.5px] font-semibold ${
                orderDelivery.fdJenisPembayaran === 1
                  ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                  : orderDelivery.fdJenisPembayaran === 2
                  ? 'bg-sky-500/10 border border-sky-500/40 text-sky-600 dark:text-sky-400'
                  : 'bg-amber-500/10 border border-amber-500/40 text-amber-600 dark:text-amber-400'
              }`}>
                {orderDelivery.fdJenisPembayaranLabel}
              </span>
            )}
          </div>

          {orderDelivery ? (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                    Permintaan Tgl Kirim Pelanggan
                  </span>
                  <span className="font-semibold text-[var(--color-primary)] mt-0.5 block">
                    {orderDelivery.fdTglKirim ? formatDate(orderDelivery.fdTglKirim) : '—'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                    Pemberi Order (CS/Sales)
                  </span>
                  <span className="text-[var(--color-primary)] mt-0.5 block">
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
                    Pembayaran Ekspedisi
                  </span>
                  <span className="text-[var(--color-primary)] mt-0.5 block">
                    {orderDelivery.fdEksBayar === 1 ? 'Bayar Tujuan (COD)' : orderDelivery.fdEksBayar === 2 ? 'Dibayar Pengirim' : '—'}
                  </span>
                </div>
              </div>

              {orderDelivery.fdAlamatKirim && (
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                    Alamat Permintaan Khusus
                  </span>
                  <p className="text-[var(--color-primary)] mt-0.5 leading-relaxed bg-[var(--color-neutral)]/40 p-2 rounded-lg border border-[var(--color-border)]">
                    {orderDelivery.fdAlamatKirim}
                  </p>
                </div>
              )}

              {orderDelivery.fdKeterangan && (
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                    Catatan CS / Finance
                  </span>
                  <p className="text-[var(--color-secondary)] mt-0.5 italic">
                    "{orderDelivery.fdKeterangan}"
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-[var(--color-secondary)]">
              Tidak ada instruksi khusus dari CS / Permintaan Pengiriman Pelanggan.
            </div>
          )}
        </div>

        {/* PANEL 6: Ekspedisi Lanjutan (Penerus Luar Kota) */}
        {(expedition || delivery.fdExpID || isEditing) && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xs space-y-4 lg:col-span-2">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
              <MapPin className="w-4 h-4 text-[var(--color-tertiary)]" />
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-[var(--color-primary)] font-[var(--font-label)]">
                {t('delivery.card.expedition')}
              </h3>
            </div>

            {!isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                    Nama Vendor Ekspedisi
                  </span>
                  <span className="font-semibold text-sm text-[var(--color-primary)] mt-0.5 block">
                    {expedition?.fdExpName || delivery.fdExpID || '—'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                    Telepon Ekspedisi
                  </span>
                  <span className="text-[var(--color-primary)] mt-0.5 block">
                    {expedition?.fdTelp || '—'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                    Sistem Pembayaran
                  </span>
                  <span className="text-[var(--color-primary)] mt-0.5 block">
                    {delivery.fdExp3 === 1 ? 'Bayar Tujuan' : delivery.fdExp3 === 2 ? 'Pengirim' : '—'}
                  </span>
                </div>

                {expedition?.fdExpAddr1 && (
                  <div className="col-span-1 sm:col-span-3">
                    <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                      Alamat Ekspedisi
                    </span>
                    <p className="text-[var(--color-secondary)] mt-0.5">
                      {expedition.fdExpAddr1}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                    Vendor Ekspedisi
                  </label>
                  <select
                    value={editForm.fdExpID || ''}
                    onChange={(e) => setEditForm({ ...editForm, fdExpID: e.target.value })}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
                  >
                    <option value="">-- Tanpa Ekspedisi Lanjutan --</option>
                    {masterData?.expeditions.map((e) => (
                      <option key={e.fdExpID} value={e.fdExpID}>
                        {e.fdExpName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[var(--color-secondary)] block mb-1">
                    Tipe Pembayaran Ekspedisi
                  </label>
                  <select
                    value={editForm.fdExp3 ?? 0}
                    onChange={(e) => setEditForm({ ...editForm, fdExp3: Number(e.target.value) })}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
                  >
                    <option value={0}>-- Belum Ditentukan --</option>
                    <option value={1}>Bayar Tujuan (COD)</option>
                    <option value={2}>Dibayar Pengirim</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── MODALS ─── */}
      {/* 1. Modal Cetak Surat Jalan */}
      <PrintDeliveryOrderModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        data={detailResponse}
        onPrintSuccess={() => {
          refetchDetail()
          queryClient.invalidateQueries({ queryKey: ['delivery-orders'] })
        }}
      />

      {/* 2. Modal Rincian Dimensi Koli Gudang (Reused from Billing) */}
      {entryList?.fdListCode && (
        <DimensionDetailModal
          isOpen={isDimensionModalOpen}
          onClose={() => setIsDimensionModalOpen(false)}
          listCode={entryList.fdListCode}
          customerName={delivery.fdCustNameSJ || customer?.fdCustName}
        />
      )}

      {/* 3. Modal Konfirmasi Hapus Surat Jalan */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Hapus Surat Jalan"
        message={`Apakah Anda yakin ingin menghapus Surat Jalan ${delivery.fdSJNo}? Aksi ini tidak dapat dibatalkan.`}
        confirmText="Hapus Surat Jalan"
        cancelText="Batal"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  )
}