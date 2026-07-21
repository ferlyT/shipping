import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useDebounce } from '@/hooks/useDebounce'
import { useQuery } from '@tanstack/react-query'
import { markingApi, type ExitHistoryDay } from '@/api/endpoints/marking'
// Modal domain-marking diimport dari @/components/marking/ (BUKAN @/components/ui/)
import { EtaSummaryModal } from '@/components/marking/EtaSummaryModal'
import { MissedTargetModal } from '@/components/marking/MissedTargetModal'
import { PredictedExitModal, type PrediksiExitItem } from '@/components/marking/PredictedExitModal'
import { ExitListModal, type ExitListItem } from '@/components/marking/ExitListModal'
import { ExitHistoryModal } from '@/components/marking/ExitHistoryModal'
// Shared marking components
import { StatusBlock } from '@/components/marking/MarkingGroupSection'
import { ManifestList } from '@/components/marking/ManifestList'
import { CariManifestModal } from '@/components/marking/CariManifestModal'
// Shared types (DILARANG mendefinisikan ulang di sini)
import type { Marking } from '@/types/marking.types'
import { getSeaTargetDays, getAirTargetDays } from '@/types/marking.types'
import {
  X, Box, Calendar, CheckCircle2, Activity, Truck, Ship, LogOut, Clock,
  AlertTriangle, Info, ClipboardList, RotateCcw, LayoutGrid, ChevronDown, ChevronRight,
  Plane, Rows3, List
} from 'lucide-react'
import { cn, formatDateShort } from '@/lib/utils'


const formatDate = formatDateShort

export default function ShipmentBatchesDashboardPage() {
  // Fungsi search dihapus dari UI — nilai selalu kosong.
  const search = ''
  const debouncedSearch = useDebounce(search, 400)
  const [viewMode, setViewMode] = useState<'table' | 'shortlist'>('table')
  const [isRingkasanOpen, setIsRingkasanOpen] = useState(true)

  const [listTypeFilter, setListTypeFilter] = useState<'ALL' | '1' | '2'>('ALL') // Default to ALL

  const [selectedRow, setSelectedRow] = useState<Marking | null>(null)
  const [modalTab, setModalTab] = useState<'detail' | 'timeline'>('detail')
  const [selectedManifestRow, setSelectedManifestRow] = useState<Marking | null>(null)

  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false)

  const [isEtaSummaryModalOpen, setIsEtaSummaryModalOpen] = useState(false)
  const [isMissedTargetModalOpen, setIsMissedTargetModalOpen] = useState(false)
  const [isPrediksiExitModalOpen, setIsPrediksiExitModalOpen] = useState(false)
  const [isExitHistoryModalOpen, setIsExitHistoryModalOpen] = useState(false)

  const [isExitListModalOpen, setIsExitListModalOpen] = useState(false)
  const [exitListModalConfig, setExitListModalConfig] = useState<{ title: string, description: string, data: ExitListItem[], iconColorClass: string, iconBgClass: string }>({ title: '', description: '', data: [], iconColorClass: '', iconBgClass: '' })

  const { data: detailData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['markingDetail', selectedRow?.fdMarkingCode],
    queryFn: async () => {
      if (!selectedRow) return null
      const res = await markingApi.detail(selectedRow.fdMarkingCode)
      return res.data as { data: Marking }
    },
    enabled: !!selectedRow
  })

  const selectedMarking = detailData?.data || selectedRow

  const { data: manifestDetailData } = useQuery({
    queryKey: ['markingDetail', selectedManifestRow?.fdMarkingCode],
    queryFn: async () => {
      if (!selectedManifestRow?.fdMarkingCode) return null
      const res = await markingApi.detail(selectedManifestRow.fdMarkingCode)
      return res.data as { data: Marking }
    },
    enabled: !!selectedManifestRow
  })
  const manifestBatchDetail = manifestDetailData?.data || (selectedManifestRow as Marking)

  const { data: kpiData, isLoading: isLoadingKpi } = useQuery({
    queryKey: ['markingKpi', listTypeFilter, debouncedSearch],
    queryFn: async () => {
      const res = await markingApi.getKPIs({ listType: listTypeFilter, search: debouncedSearch })
      return res.data as {
        data: {
          totalBatches: number,
          activeBatches: number,
          avgTransitTime: number,
          etaNotExitBatches: number,
          missedTargetBatches: number,
          etaNotExitSummary: { name: string, count: number, codes: { code: string, aging: number }[] }[],
          missedTargetSummary: { name: string, count: number, codes: { code: string, transit: number, target: number }[] }[],
          prediksiTerlambatCount: number,
          prediksiSegeraCount: number,
          prediksiDekatCount: number,
          prediksiExitList: PrediksiExitItem[],
          exitTodayCount: number,
          exitYesterdayCount: number,
          expectedExitTomorrowCount: number,
          exitTodayList: ExitListItem[],
          exitYesterdayList: ExitListItem[],
          expectedExitTomorrowList: PrediksiExitItem[]
        }
      }
    }
  })

  const kpis = kpiData?.data

  const [exitCalendarMonth, setExitCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const { data: exitHistoryData, isLoading: isLoadingExitHistory } = useQuery({
    queryKey: ['markingExitHistory', exitCalendarMonth.getFullYear(), exitCalendarMonth.getMonth(), listTypeFilter, debouncedSearch],
    queryFn: async () => {
      const monthKey = `${exitCalendarMonth.getFullYear()}-${String(exitCalendarMonth.getMonth() + 1).padStart(2, '0')}`
      const res = await markingApi.getExitHistory({ month: monthKey, listType: listTypeFilter, search: debouncedSearch })
      return res.data as { data: Record<string, ExitHistoryDay> }
    }
  })

  const exitHistoryMap = exitHistoryData?.data || {}
  const exitHistoryMonthTotal = Object.values(exitHistoryMap).reduce((sum, day) => sum + (day?.count || 0), 0)

  return (
    <div className="flex flex-col gap-4 lg:gap-8 bg-[#F8FAFC] p-3 sm:p-4 lg:p-8 min-h-full">
      {/* Header Container */}
      <div className="flex flex-shrink-0 flex-col">
        <h1 className="font-[var(--font-display)] font-medium text-[26px] sm:text-[32px] lg:text-[40px] m-0 mb-1 tracking-[-0.02em] text-[var(--color-primary)]">Shipment Batches</h1>
        <p className="text-[13.5px] sm:text-[15.2px] text-[var(--color-secondary)] m-0 mb-4 sm:mb-8">
          Kelola marking dan batch pengiriman Anda.
        </p>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-0 min-w-0 overflow-hidden">
        {/* Overview Section */}
        <div className="mb-5">
          <button
            type="button"
            onClick={() => setIsRingkasanOpen((v) => !v)}
            className="flex w-full items-center gap-1.5 mb-2.5 px-0.5 py-0.5 text-left cursor-pointer"
            aria-expanded={isRingkasanOpen}
          >
            <LayoutGrid className="h-3.5 w-3.5 text-[var(--color-secondary)]" />
            <span className="font-[var(--font-label)] text-[11px] sm:text-[11.5px] tracking-[0.08em] uppercase text-[var(--color-secondary)] font-semibold">Ringkasan</span>
            {isRingkasanOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-[var(--color-secondary)] ml-auto" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-[var(--color-secondary)] ml-auto" />
            )}
          </button>
          {isRingkasanOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Batches */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
                <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
                  <Box className="w-24 h-24 text-[var(--color-primary)]" />
                </div>
                <div className="flex items-center gap-2 text-[var(--color-secondary)]">
                  <Box className="w-4 h-4 text-blue-500" />
                  <span className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-wider">Total Batch</span>
                </div>
                <div className="mt-3">
                  {isLoadingKpi ? (
                    <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
                  ) : (
                    <h3 className="text-3xl sm:text-[2rem] md:text-[2.2rem] font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                      {kpis?.totalBatches.toLocaleString() || 0}
                    </h3>
                  )}
                </div>
              </div>

              {/* Active Batches */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
                <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
                  <Activity className="w-24 h-24 text-emerald-500" />
                </div>
                <div className="flex items-center gap-2 text-[var(--color-secondary)]">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-wider">Batch Aktif</span>
                </div>
                <div className="mt-3">
                  {isLoadingKpi ? (
                    <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
                  ) : (
                    <h3 className="text-3xl sm:text-[2rem] md:text-[2.2rem] font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                      {kpis?.activeBatches.toLocaleString() || 0}
                    </h3>
                  )}
                </div>
              </div>

              {/* Avg Transit Time */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
                <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
                  <Ship className="w-24 h-24 text-purple-500" />
                </div>
                <div className="flex items-center gap-2 text-[var(--color-secondary)]">
                  <Ship className="w-4 h-4 text-purple-500" />
                  <span className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-wider">Rata-rata Transit</span>
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  {isLoadingKpi ? (
                    <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
                  ) : (
                    <>
                      <h3 className="text-3xl sm:text-[2rem] md:text-[2.2rem] font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                        {kpis?.avgTransitTime || 0}
                      </h3>
                      <span className="text-xs sm:text-[13px] md:text-[14px] font-bold text-[var(--color-secondary)] uppercase">Hari</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Perlu Perhatian Section */}
        <div className="mb-5 rounded-2xl border border-rose-200/60 bg-gradient-to-br from-rose-50/50 via-amber-50/30 to-transparent p-3 sm:p-4">
          <div className="flex items-center gap-1.5 mb-2.5 px-0.5">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
            <span className="font-[var(--font-label)] text-[11px] sm:text-[11.5px] tracking-[0.08em] uppercase text-rose-600 font-semibold">Perlu Perhatian</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* ETA But Not Exit */}
            <div
              onClick={() => {
                if (kpis?.etaNotExitSummary && kpis.etaNotExitSummary.length > 0) {
                  setIsEtaSummaryModalOpen(true)
                }
              }}
              className={cn(
                "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group transition-shadow",
                kpis?.etaNotExitSummary && kpis.etaNotExitSummary.length > 0 ? "hover:shadow cursor-pointer hover:border-amber-400" : ""
              )}
            >
              <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
                <Clock className="w-24 h-24 text-amber-500" />
              </div>
              <div className="flex items-center gap-2 text-[var(--color-secondary)]">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-wider truncate">Sudah ETA (Belum Exit)</span>
              </div>
              <div className="mt-3 flex justify-between items-end">
                {isLoadingKpi ? (
                  <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
                ) : (
                  <>
                    <h3 className="text-3xl sm:text-[2rem] md:text-[2.2rem] font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                      {kpis?.etaNotExitBatches?.toLocaleString() || 0}
                    </h3>
                    {kpis?.etaNotExitSummary && kpis.etaNotExitSummary.length > 0 && (
                      <span className="text-[10px] sm:text-[11px] md:text-xs text-[var(--color-secondary)] underline decoration-dashed underline-offset-2">Lihat Detil</span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Missed Targets */}
            <div
              onClick={() => {
                if (kpis?.missedTargetSummary && kpis.missedTargetSummary.length > 0) {
                  setIsMissedTargetModalOpen(true)
                }
              }}
              className={cn(
                "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group transition-shadow",
                kpis?.missedTargetSummary && kpis.missedTargetSummary.length > 0 ? "hover:shadow cursor-pointer hover:border-rose-400" : ""
              )}
            >
              <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
                <AlertTriangle className="w-24 h-24 text-rose-500" />
              </div>
              <div className="flex items-center gap-2 text-[var(--color-secondary)]">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-wider truncate">Tidak Capai Target</span>
              </div>
              <div className="mt-3 flex justify-between items-end">
                {isLoadingKpi ? (
                  <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
                ) : (
                  <>
                    <h3 className="text-3xl sm:text-[2rem] md:text-[2.2rem] font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                      {kpis?.missedTargetBatches?.toLocaleString() || 0}
                    </h3>
                    {kpis?.missedTargetSummary && kpis.missedTargetSummary.length > 0 && (
                      <span className="text-[10px] sm:text-[11px] md:text-xs text-[var(--color-secondary)] underline decoration-dashed underline-offset-2">Lihat Detil</span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Prediksi Exit Terdekat */}
            <div
              onClick={() => {
                if (kpis?.prediksiExitList && kpis.prediksiExitList.length > 0) {
                  setIsPrediksiExitModalOpen(true)
                }
              }}
              className={cn(
                "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group transition-shadow",
                kpis?.prediksiExitList && kpis.prediksiExitList.length > 0 ? "hover:shadow cursor-pointer hover:border-rose-400" : ""
              )}
            >
              <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
                <Clock className="w-24 h-24 text-rose-500" />
              </div>
              <div className="flex items-center gap-2 text-[var(--color-secondary)]">
                <Clock className="w-4 h-4 text-rose-500" />
                <span className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-wider truncate">Prediksi Exit Perlu Perhatian</span>
              </div>
              <div className="mt-3 flex justify-between items-end">
                {isLoadingKpi ? (
                  <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
                ) : (
                  <>
                    <h3 className="text-3xl sm:text-[2rem] md:text-[2.2rem] font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                      {((kpis?.prediksiTerlambatCount || 0) + (kpis?.prediksiSegeraCount || 0)).toLocaleString()}
                    </h3>
                    {kpis?.prediksiExitList && kpis.prediksiExitList.length > 0 && (
                      <span className="text-[10px] sm:text-[11px] md:text-xs text-[var(--color-secondary)] underline decoration-dashed underline-offset-2">Lihat Detil</span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Aktivitas Exit Section */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2.5 px-0.5">
            <LogOut className="h-3.5 w-3.5 text-[var(--color-secondary)]" />
            <span className="font-[var(--font-label)] text-[11px] sm:text-[11.5px] tracking-[0.08em] uppercase text-[var(--color-secondary)] font-semibold">Aktivitas Exit</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Exit Kemarin */}
            <div
              onClick={() => {
                if (kpis?.exitYesterdayList && kpis.exitYesterdayList.length > 0) {
                  setExitListModalConfig({
                    title: 'Exit Kemarin',
                    description: 'Batch yang keluar gudang kemarin',
                    data: kpis.exitYesterdayList,
                    iconColorClass: 'text-blue-500',
                    iconBgClass: 'bg-blue-50/10'
                  })
                  setIsExitListModalOpen(true)
                }
              }}
              className={cn(
                "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group transition-shadow",
                kpis?.exitYesterdayList && kpis.exitYesterdayList.length > 0 ? "hover:shadow cursor-pointer hover:border-blue-400" : ""
              )}
            >
              <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
                <LogOut className="w-24 h-24 text-blue-500" />
              </div>
              <div className="flex items-center gap-2 text-[var(--color-secondary)]">
                <LogOut className="w-4 h-4 text-blue-500" />
                <span className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-wider">Exit Kemarin</span>
              </div>
              <div className="mt-3 flex justify-between items-end">
                {isLoadingKpi ? (
                  <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
                ) : (
                  <>
                    <h3 className="text-3xl sm:text-[2rem] md:text-[2.2rem] font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                      {kpis?.exitYesterdayCount.toLocaleString() || 0}
                    </h3>
                    {kpis?.exitYesterdayList && kpis.exitYesterdayList.length > 0 && (
                      <span className="text-[10px] sm:text-[11px] md:text-xs text-[var(--color-secondary)] underline decoration-dashed underline-offset-2">Lihat Detil</span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Exit Hari Ini */}
            <div
              onClick={() => {
                if (kpis?.exitTodayList && kpis.exitTodayList.length > 0) {
                  setExitListModalConfig({
                    title: 'Exit Hari Ini',
                    description: 'Batch yang keluar gudang hari ini',
                    data: kpis.exitTodayList,
                    iconColorClass: 'text-emerald-500',
                    iconBgClass: 'bg-emerald-50/10'
                  })
                  setIsExitListModalOpen(true)
                }
              }}
              className={cn(
                "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group transition-shadow",
                kpis?.exitTodayList && kpis.exitTodayList.length > 0 ? "hover:shadow cursor-pointer hover:border-emerald-400" : ""
              )}
            >
              <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
                <LogOut className="w-24 h-24 text-emerald-500" />
              </div>
              <div className="flex items-center gap-2 text-[var(--color-secondary)]">
                <LogOut className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-wider">Exit Hari Ini</span>
              </div>
              <div className="mt-3 flex justify-between items-end">
                {isLoadingKpi ? (
                  <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
                ) : (
                  <>
                    <h3 className="text-3xl sm:text-[2rem] md:text-[2.2rem] font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                      {kpis?.exitTodayCount.toLocaleString() || 0}
                    </h3>
                    {kpis?.exitTodayList && kpis.exitTodayList.length > 0 && (
                      <span className="text-[10px] sm:text-[11px] md:text-xs text-[var(--color-secondary)] underline decoration-dashed underline-offset-2">Lihat Detil</span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Perkiraan Exit Besok */}
            <div
              onClick={() => {
                if (kpis?.expectedExitTomorrowList && kpis.expectedExitTomorrowList.length > 0) {
                  const list = kpis.expectedExitTomorrowList.map(item => ({
                    fdMarkingCode: item.fdMarkingCode,
                    fdConsignee: item.fdConsignee || null,
                    fdExitDate: null,
                    fdGudang: item.fdGudang || null,
                    fdListType: item.fdListType || null,
                    fdKet: item.fdKet || null
                  }))
                  setExitListModalConfig({
                    title: 'Perkiraan Exit Besok',
                    description: 'Batch yang diprediksi akan keluar gudang besok',
                    data: list,
                    iconColorClass: 'text-amber-500',
                    iconBgClass: 'bg-amber-50/10'
                  })
                  setIsExitListModalOpen(true)
                }
              }}
              className={cn(
                "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group transition-shadow",
                kpis?.expectedExitTomorrowList && kpis.expectedExitTomorrowList.length > 0 ? "hover:shadow cursor-pointer hover:border-amber-400" : ""
              )}
            >
              <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
                <Calendar className="w-24 h-24 text-amber-500" />
              </div>
              <div className="flex items-center gap-2 text-[var(--color-secondary)]">
                <Calendar className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-wider">Perkiraan Exit Besok</span>
              </div>
              <div className="mt-3 flex justify-between items-end">
                {isLoadingKpi ? (
                  <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
                ) : (
                  <>
                    <h3 className="text-3xl sm:text-[2rem] md:text-[2.2rem] font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                      {kpis?.expectedExitTomorrowCount.toLocaleString() || 0}
                    </h3>
                    {kpis?.expectedExitTomorrowList && kpis.expectedExitTomorrowList.length > 0 && (
                      <span className="text-[10px] sm:text-[11px] md:text-xs text-[var(--color-secondary)] underline decoration-dashed underline-offset-2">Lihat Detil</span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* History Exit */}
            <div
              onClick={() => setIsExitHistoryModalOpen(true)}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group transition-shadow hover:shadow cursor-pointer hover:border-indigo-400"
            >
              <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
                <Calendar className="w-24 h-24 text-indigo-500" />
              </div>
              <div className="flex items-center gap-2 text-[var(--color-secondary)]">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <span className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-wider truncate">History Exit</span>
              </div>
              <div className="mt-3 flex justify-between items-end">
                {isLoadingExitHistory ? (
                  <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
                ) : (
                  <>
                    <h3 className="text-3xl sm:text-[2rem] md:text-[2.2rem] font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                      {exitHistoryMonthTotal.toLocaleString()}
                    </h3>
                    <span className="text-[10px] sm:text-[11px] md:text-xs text-[var(--color-secondary)] underline decoration-dashed underline-offset-2">Lihat Kalender</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filter Card */}
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[#E4E1DA] p-4 sm:p-5 mb-6 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
            {/* Left: Sea/Air Segmented Control */}
            <div className="inline-flex items-center gap-0.5 bg-[#F7F5F2] border border-[#E4E1DA] rounded-[var(--radius-md)] p-1 shrink-0 w-fit">
              {([
                { key: 'ALL' as const, label: 'Semua', TabIcon: LayoutGrid },
                { key: '1' as const, label: 'Udara', TabIcon: Plane },
                { key: '2' as const, label: 'Laut', TabIcon: Ship },
              ]).map(({ key, label, TabIcon }) => (
                <button
                  key={key}
                  onClick={() => setListTypeFilter(key)}
                  className={cn(
                    "px-[13px] sm:px-[16px] py-[9.5px] sm:py-[10.5px] rounded-[calc(var(--radius-md)-3px)] text-[13px] sm:text-[13.5px] font-semibold cursor-pointer flex items-center gap-1.5 transition-all shrink-0",
                    listTypeFilter === key
                      ? "bg-[var(--color-tertiary)] text-[var(--color-on-primary)] shadow-sm"
                      : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                  )}
                >
                  <TabIcon size={15} />
                  {label}
                </button>
              ))}
            </div>

            {/* Right: Cari Manifest (tombol berdiri sendiri) + View Mode Toggle */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => {
                  setIsCodeModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-[14px] sm:px-[18px] py-2.5 sm:py-[10px] bg-[var(--color-surface)] hover:border-[var(--color-tertiary)] hover:text-[var(--color-tertiary)] text-[var(--color-primary)] text-[13px] sm:text-[13.6px] font-semibold rounded-[var(--radius-md)] border border-[#E4E1DA] transition-colors whitespace-nowrap"
              >
                <ClipboardList size={15} />
                Cari Manifest
              </button>

              <div className="hidden sm:flex items-center gap-1 bg-[#F7F5F2] rounded-[var(--radius-md)] p-0.5 border border-[#E4E1DA] shrink-0">
                <button
                  onClick={() => setViewMode('table')}
                  className={cn('p-1.5 rounded-[var(--radius-sm)] transition-all', viewMode === 'table' ? 'bg-white shadow-sm text-[var(--color-primary)]' : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]')}
                  title="Tampilan Tabel"
                >
                  <Rows3 size={16} />
                </button>
                <button
                  onClick={() => setViewMode('shortlist')}
                  className={cn('p-1.5 rounded-[var(--radius-sm)] transition-all', viewMode === 'shortlist' ? 'bg-white shadow-sm text-[var(--color-primary)]' : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]')}
                  title="Tampilan Ringkas"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Recent Batches (Simplified) */}
          <div className="flex-1 overflow-y-auto pb-6">
            <div className="space-y-4">
              <StatusBlock viewMode={viewMode} status="open" isClosed="false" search={search} groupMode="branch" defaultOpen={true} onView={setSelectedRow} onViewManifest={setSelectedManifestRow} listTypeFilter={listTypeFilter} totalCountOverride={kpis?.activeBatches} />
            </div>
          </div>
        </div>

        {/* Code Input Modal */}
        <CariManifestModal
          isOpen={isCodeModalOpen}
          onClose={() => setIsCodeModalOpen(false)}
          onSelect={(code) => setSelectedManifestRow({ fdMarkingCode: code } as any)}
        />

        <EtaSummaryModal
          isOpen={isEtaSummaryModalOpen}
          onClose={() => setIsEtaSummaryModalOpen(false)}
          data={kpis?.etaNotExitSummary || []}
        />

        {/* Missed Target Modal */}
        <MissedTargetModal
          isOpen={isMissedTargetModalOpen}
          onClose={() => setIsMissedTargetModalOpen(false)}
          data={kpis?.missedTargetSummary || []}
        />

        {/* Predicted Exit Modal */}
        <PredictedExitModal
          isOpen={isPrediksiExitModalOpen}
          onClose={() => setIsPrediksiExitModalOpen(false)}
          data={kpis?.prediksiExitList || []}
        />

        {/* Exit List Modal */}
        <ExitListModal
          isOpen={isExitListModalOpen}
          onClose={() => setIsExitListModalOpen(false)}
          data={exitListModalConfig.data}
          title={exitListModalConfig.title}
          description={exitListModalConfig.description}
          iconColorClass={exitListModalConfig.iconColorClass}
          iconBgClass={exitListModalConfig.iconBgClass}
        />

        {/* Exit History Modal — calendar view, day click drills into Exit List Modal */}
        <ExitHistoryModal
          isOpen={isExitHistoryModalOpen}
          onClose={() => setIsExitHistoryModalOpen(false)}
          month={exitCalendarMonth}
          onMonthChange={setExitCalendarMonth}
          historyMap={exitHistoryMap}
          isLoading={isLoadingExitHistory}
          onSelectDay={(dayKey, items) => {
            setExitListModalConfig({
              title: `Exit ${formatDate(dayKey)}`,
              description: `Batch yang keluar gudang pada ${formatDate(dayKey)}`,
              data: items,
              iconColorClass: 'text-indigo-500',
              iconBgClass: 'bg-indigo-50/10'
            })
            setIsExitListModalOpen(true)
          }}
        />

        {/* Detail Modal — mobile-first bottom sheet, dialog on desktop */}
        {selectedRow && typeof document !== 'undefined' && createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm transition-opacity"
              onClick={() => setSelectedRow(null)}
            />
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 pointer-events-none">
              <div
                className="w-full sm:max-w-2xl bg-white shadow-2xl rounded-t-[28px] sm:rounded-2xl flex flex-col overflow-hidden pointer-events-auto h-[94vh] sm:h-auto sm:max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header Panel */}
                <div className="flex-shrink-0 px-5 sm:px-8 pt-5 sm:pt-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] border border-slate-100">
                      <Box className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg sm:text-[1.15rem] md:text-[1.2rem] font-bold font-[var(--font-display)] text-[var(--color-primary)] leading-none">{selectedRow.fdMarkingCode}</h2>
                        <span className="rounded-full bg-[#F7F5F2] border border-slate-100 px-2 py-0.5 text-[11px] sm:text-[11.5px] md:text-xs font-[var(--font-label)] font-medium text-[var(--color-secondary)]">
                          {listTypeFilter === '1' ? 'AIR' : 'SEA'}
                        </span>
                      </div>
                      <p className="text-xs sm:text-[13px] md:text-[14px] text-[var(--color-secondary)] mt-1 font-[var(--font-body)]">{listTypeFilter === '1' ? 'Air freight batch' : 'Sea freight batch'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedRow(null);
                      setModalTab('detail');
                    }}
                    className="p-2 hover:bg-[#F7F5F2] rounded-full transition-colors text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex px-5 sm:px-8 border-b border-slate-100 bg-white sticky top-[79px] z-10 text-sm sm:text-[14.5px] md:text-[15px] shrink-0">
                  <button
                    className={cn("px-4 py-3 font-semibold border-b-2 transition-colors", modalTab === 'detail' ? "border-[var(--color-primary)] text-[var(--color-primary)]" : "border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]")}
                    onClick={() => setModalTab('detail')}
                  >
                    Info Detail
                  </button>
                  <button
                    className={cn("px-4 py-3 font-semibold border-b-2 transition-colors", modalTab === 'timeline' ? "border-[var(--color-primary)] text-[var(--color-primary)]" : "border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]")}
                    onClick={() => setModalTab('timeline')}
                  >
                    Timeline & Performance
                  </button>
                </div>

                {/* Content Panel */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50">
                  {isLoadingDetail ? (
                    <div className="p-8 flex justify-center">
                      <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
                    </div>
                  ) : selectedMarking ? (
                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                      {modalTab === 'detail' && (
                        <>
                          {/* Info Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                              <p className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Consignee</p>
                              <p className="mt-1 text-sm sm:text-[14.5px] md:text-[15px] font-semibold text-[var(--color-primary)]">{selectedMarking.fdConsignee || '-'}</p>
                            </div>
                            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                              <p className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Region</p>
                              <p className={cn("mt-1 text-sm sm:text-[14.5px] md:text-[15px] font-semibold", selectedMarking.fdWilayah ? "text-[var(--color-primary)]" : "text-[var(--color-muted)]")}>
                                {selectedMarking.fdWilayah || 'Not recorded'}
                              </p>
                            </div>
                            <div className="col-span-1 sm:col-span-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                              <p className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">{listTypeFilter === '1' ? 'AWB No.' : 'BL No.'}</p>
                              <p className={cn("mt-1 text-sm sm:text-[14.5px] md:text-[15px] font-semibold break-all", (listTypeFilter === '1' ? selectedMarking.fdAWB : selectedMarking.fdBLNo) ? "text-[var(--color-primary)]" : "text-[var(--color-muted)]")}>
                                {listTypeFilter === '1' ? (selectedMarking.fdAWB || 'Not recorded') : (selectedMarking.fdBLNo || 'Not recorded')}
                              </p>
                            </div>
                            {listTypeFilter === '2' && (
                              <div className="col-span-1 sm:col-span-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                                <p className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Container</p>
                                <p className={cn("mt-1 text-sm sm:text-[14.5px] md:text-[15px] font-semibold", selectedMarking.fdContNo ? "text-[var(--color-primary)]" : "text-[var(--color-muted)]")}>
                                  {selectedMarking.fdContNo ? `${selectedMarking.fdContNo} ${selectedMarking.fdContSize ? `(${selectedMarking.fdContSize})` : ''}` : '—'}
                                </p>
                              </div>
                            )}
                            {selectedMarking.fdGudang && selectedMarking.fdGudang.trim() !== '' && (
                              <div className="col-span-1 sm:col-span-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                                <p className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Gudang</p>
                                <p className="mt-1 text-sm sm:text-[14.5px] md:text-[15px] font-semibold text-[var(--color-primary)]">
                                  {selectedMarking.fdGudang}
                                </p>
                              </div>
                            )}
                            {selectedMarking.fdKet && selectedMarking.fdKet.trim() !== '' && (
                              <div className="col-span-1 sm:col-span-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                                <p className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Keterangan</p>
                                <p className="mt-1 text-sm sm:text-[14.5px] md:text-[15px] font-semibold text-[var(--color-primary)]">
                                  {selectedMarking.fdKet}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Volume & Weight */}
                          <div className={cn("grid grid-cols-1 gap-3", listTypeFilter === '2' ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
                            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center shadow-sm">
                              <p className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Packages</p>
                              <p className="mt-1 text-lg sm:text-[1.15rem] md:text-[1.2rem] font-bold text-[var(--color-tertiary)]">
                                {selectedMarking.fdJmlPack != null ? Number(selectedMarking.fdJmlPack).toLocaleString('en-US') : 0}
                              </p>
                            </div>
                            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center shadow-sm">
                              <p className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Weight</p>
                              <p className="mt-1 text-lg sm:text-[1.15rem] md:text-[1.2rem] font-bold text-[var(--color-tertiary)]">
                                {selectedMarking.fdJmlBerat != null ? Number(selectedMarking.fdJmlBerat).toLocaleString('en-US') : 0}
                                <span className="ml-1 text-xs sm:text-[13px] md:text-[14px] font-medium text-[var(--color-secondary)]">kg</span>
                              </p>
                            </div>
                            {listTypeFilter === '2' && (
                              <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center shadow-sm">
                                <p className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Volume</p>
                                <p className="mt-1 text-lg sm:text-[1.15rem] md:text-[1.2rem] font-bold text-[var(--color-primary)]">
                                  {selectedMarking.fdM3 != null ? Number(selectedMarking.fdM3).toLocaleString('en-US') : 0}
                                  <span className="ml-1 text-xs sm:text-[13px] md:text-[14px] font-medium text-[var(--color-secondary)]">m³</span>
                                </p>
                              </div>
                            )}
                            {listTypeFilter === '1' && (
                              <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center shadow-sm">
                                <p className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Branded</p>
                                <p className="mt-1 text-lg sm:text-[1.15rem] md:text-[1.2rem] font-bold text-[var(--color-primary)]">
                                  {selectedMarking.fdBranded || 0}
                                  <span className="ml-1 text-xs sm:text-[13px] md:text-[14px] font-medium text-[var(--color-secondary)]">kg</span>
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Timestamps */}
                          <div className="flex flex-col sm:flex-row justify-between items-center text-[10px] sm:text-[11px] md:text-xs text-[var(--color-secondary)] gap-2 mt-4 pt-4 border-t border-[var(--color-border)]">
                            {selectedMarking.fdSysDate && (
                              <div>
                                <span className="font-medium">Created:</span> {new Date(selectedMarking.fdSysDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                {selectedMarking.fdCreated ? ` by ${selectedMarking.fdCreated.trim()}` : ''}
                              </div>
                            )}
                            {selectedMarking.fdUpdate && (
                              <div>
                                <span className="font-medium">Last Update:</span> {new Date(selectedMarking.fdUpdate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                {selectedMarking.fdUpdateBy ? ` by ${selectedMarking.fdUpdateBy.trim()}` : ''}
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* Timeline & Performance Tab */}
                      {modalTab === 'timeline' && (
                        <div className="space-y-6">
                          {/* Timeline section */}
                          {(() => {
                            const formatDate = (val: string | undefined | null) => {
                              if (!val) return null;
                              const d = new Date(val);
                              if (isNaN(d.getTime())) return null;
                              return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                            }
                            const stages: { key: string; label: string; date: string | null | undefined; status: string; icon: typeof Truck }[] = [
                              {
                                key: "load",
                                label: "Load date",
                                date: selectedMarking.fdLoadDate,
                                status: selectedMarking.fdLoadDate ? "completed" : "pending",
                                icon: Truck,
                              },
                              {
                                key: "etd_eta",
                                label: "ETD → ETA",
                                date: selectedMarking.fdETD && selectedMarking.fdETA ? `${formatDate(selectedMarking.fdETD)} → ${formatDate(selectedMarking.fdETA)}` : null,
                                status: selectedMarking.fdETD && selectedMarking.fdETA ? "completed" : "pending",
                                icon: Ship,
                              },
                              {
                                key: "exit",
                                label: "Exit date",
                                date: selectedMarking.fdExitDate,
                                status: selectedMarking.fdExitDate ? "completed" : "pending",
                                icon: LogOut,
                              },
                            ]

                            if (selectedMarking.fdStatus === 4) {
                              stages.push({
                                key: "reexport",
                                label: "Re-export",
                                date: null,
                                status: "completed",
                                icon: RotateCcw,
                              })
                            }

                            const getStatusStyles = (status: string) => {
                              switch (status) {
                                case 'completed': return { ring: "ring-[var(--color-success)]/40", text: "text-[var(--color-success)]", badgeBg: "bg-[var(--color-success)]/10", badgeText: "text-[var(--color-success)]", label: "Completed" };
                                case 'pending': return { ring: "ring-[var(--color-secondary)]/40", text: "text-[var(--color-secondary)]", badgeBg: "bg-[var(--color-secondary)]/10", badgeText: "text-[var(--color-secondary)]", label: "Pending" };
                                case 'missing': return { ring: "ring-[var(--color-danger)]/40", text: "text-[var(--color-danger)]", badgeBg: "bg-[var(--color-danger)]/10", badgeText: "text-[var(--color-danger)]", label: "Missing data" };
                                case 'delayed': return { ring: "ring-[var(--color-warning)]/40", text: "text-[var(--color-warning)]", badgeBg: "bg-[var(--color-warning)]/10", badgeText: "text-[var(--color-warning)]", label: "Delayed" };
                                default: return { ring: "", text: "", badgeBg: "", badgeText: "", label: "" };
                              }
                            }

                            return (
                              <div>
                                <h3 className="mb-4 text-xs sm:text-[13px] md:text-[14px] font-bold font-[var(--font-label)] uppercase tracking-widest text-[var(--color-secondary)] flex items-center gap-2">
                                  <Activity size={14} />
                                  Timeline
                                </h3>
                                <div className="relative">
                                  <div className="absolute left-0 right-0 top-5 h-px bg-[var(--color-border-strong)] opacity-50 hidden sm:block" />
                                  <div className="absolute top-0 bottom-0 left-[19px] w-px bg-[var(--color-border-strong)] opacity-50 sm:hidden" />
                                  <div className={cn("relative grid grid-cols-1 gap-6 sm:gap-2", stages.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3")}>
                                    {stages.map((stage) => {
                                      const s = getStatusStyles(stage.status);
                                      const Icon = stage.icon;
                                      return (
                                        <div key={stage.key} className="flex sm:flex-col items-start sm:items-center text-left sm:text-center relative">
                                          <div className={cn("z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] ring-2 border border-[var(--color-border)] shadow-sm", s.ring)}>
                                            <Icon className={cn("h-4 w-4", s.text)} />
                                          </div>
                                          <div className="ml-4 sm:ml-0 mt-0 sm:mt-3 flex flex-col sm:items-center">
                                            <p className="text-[10px] sm:text-[11px] md:text-xs uppercase font-[var(--font-label)] text-[var(--color-secondary)] font-medium">{stage.label}</p>
                                            <p className="text-[11px] sm:text-[11.5px] md:text-xs font-semibold text-[var(--color-primary)] mt-0.5 min-h-[16px]">
                                              {!stage.date ? "—" : (stage.key === "etd_eta" ? stage.date : formatDate(stage.date))}
                                            </p>
                                            <span className={cn("mt-1 sm:mt-1.5 rounded-full px-2 py-0.5 text-[9px] sm:text-[9.5px] md:text-[10px] uppercase font-bold tracking-wider w-fit", s.badgeBg, s.badgeText)}>
                                              {s.label}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )
                          })()}

                          {/* KPIs */}
                          {(() => {
                            const parseDate = (val: string | undefined | null) => {
                              if (!val) return null;
                              const d = new Date(val);
                              return isNaN(d.getTime()) ? null : d;
                            }
                            const diffDays = (d1: Date | null, d2: Date | null) => {
                              if (!d1 || !d2) return null;
                              return Math.ceil((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
                            }
                            const loadDate = parseDate(selectedMarking.fdLoadDate);
                            const etdDate = parseDate(selectedMarking.fdETD);
                            const etaDate = parseDate(selectedMarking.fdETA);
                            const exitDate = parseDate(selectedMarking.fdExitDate);
                            const enterGudang = (selectedMarking as any).fdEnterGudang ? true : false;

                            const today = new Date();

                            const leadTimeLoading = diffDays(etdDate, loadDate);
                            const transitTime = diffDays(etaDate, etdDate);
                            const warehouseDelay = diffDays(exitDate || today, etaDate);
                            const totalCycle = diffDays(exitDate || today, loadDate);
                            const isDelayed = warehouseDelay !== null && warehouseDelay > 0;
                            const isMissingETA = etaDate === null;

                            const seaTarget = listTypeFilter === '2' ? getSeaTargetDays(selectedMarking.fdMarkingCode) : null;
                            const airTarget = listTypeFilter === '1' ? getAirTargetDays(selectedMarking.fdMarkingCode) : null;
                            const cycleTarget = listTypeFilter === '2' ? seaTarget : airTarget;
                            const isCycleDelayed = cycleTarget !== null && totalCycle !== null ? totalCycle > cycleTarget.max : false;

                            return (
                              <>
                                <div>
                                  <h3 className="mb-4 text-xs sm:text-[13px] md:text-[14px] font-bold font-[var(--font-label)] uppercase tracking-widest text-[var(--color-secondary)] flex items-center gap-2">
                                    <Clock size={14} />
                                    Performance
                                  </h3>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {/* KpiCard 1 */}
                                    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                                      <p className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Lead time loading</p>
                                      <div className="mt-2 flex items-baseline gap-1">
                                        <span className="text-2xl sm:text-[1.6rem] md:text-[1.7rem] font-bold font-[var(--font-display)] text-[var(--color-primary)]">
                                          {leadTimeLoading === null ? "—" : leadTimeLoading}
                                        </span>
                                        {leadTimeLoading !== null && <span className="text-[10px] sm:text-[11px] md:text-xs uppercase font-bold text-[var(--color-secondary)]">days</span>}
                                      </div>
                                      <p className="mt-1 text-[10px] sm:text-[11px] md:text-xs font-medium text-[var(--color-secondary)]">Load date → ETD</p>
                                    </div>

                                    {/* KpiCard 2 */}
                                    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                                      <p className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Transit time</p>
                                      <div className="mt-2 flex items-baseline gap-1">
                                        <span className="text-2xl sm:text-[1.6rem] md:text-[1.7rem] font-bold font-[var(--font-display)] text-[var(--color-primary)]">
                                          {transitTime === null ? "—" : transitTime}
                                        </span>
                                        {transitTime !== null && <span className="text-[10px] sm:text-[11px] md:text-xs uppercase font-bold text-[var(--color-secondary)]">days</span>}
                                      </div>
                                      <p className="mt-1 text-[10px] sm:text-[11px] md:text-xs font-medium text-[var(--color-secondary)]">ETD → ETA</p>
                                    </div>

                                    {/* KpiCard 3 */}
                                    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                                      <p className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Warehouse delay</p>
                                      <div className="mt-2 flex items-baseline gap-1">
                                        <span className="text-2xl sm:text-[1.6rem] md:text-[1.7rem] font-bold font-[var(--font-display)] text-[var(--color-primary)]">
                                          {warehouseDelay === null ? "—" : warehouseDelay}
                                        </span>
                                        {warehouseDelay !== null && <span className="text-[10px] sm:text-[11px] md:text-xs uppercase font-bold text-[var(--color-secondary)]">days</span>}
                                      </div>
                                      <p className="mt-1 text-[10px] sm:text-[11px] md:text-xs font-medium text-[var(--color-secondary)]">ETA → {exitDate ? 'Exit date' : 'Today (ongoing)'}</p>
                                      {warehouseDelay !== null && (
                                        <p className={cn("mt-2 text-[11px] sm:text-[11.5px] md:text-xs font-bold", isDelayed ? "text-[var(--color-warning)]" : "text-[var(--color-success)]")}>
                                          {isDelayed ? `${warehouseDelay}d over ETA` : (exitDate ? "Within ETA" : "On track (ongoing)")}
                                        </p>
                                      )}
                                    </div>

                                    {/* KpiCard 4 */}
                                    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                                      <p className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Total shipment cycle</p>
                                      <div className="mt-2 flex items-baseline gap-1">
                                        <span className={cn("text-2xl sm:text-[1.6rem] md:text-[1.7rem] font-bold font-[var(--font-display)]", isCycleDelayed ? "text-[var(--color-warning)]" : "text-[var(--color-primary)]")}>
                                          {totalCycle === null ? "—" : totalCycle}
                                        </span>
                                        {totalCycle !== null && <span className="text-[10px] sm:text-[11px] md:text-xs uppercase font-bold text-[var(--color-secondary)]">days</span>}
                                      </div>
                                      <p className="mt-1 text-[10px] sm:text-[11px] md:text-xs font-medium text-[var(--color-secondary)]">Load date → {exitDate ? 'Exit date' : 'Today (ongoing)'}</p>
                                      {cycleTarget && (
                                        <p className={cn("mt-2 text-[11px] sm:text-[11.5px] md:text-xs font-bold", isCycleDelayed ? "text-[var(--color-warning)]" : "text-[var(--color-success)]")}>
                                          Target: ± {cycleTarget.label}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Issues */}
                                <div className="space-y-3">
                                  {/* Issue 1 */}
                                  <div className={cn("flex items-start gap-3 rounded-[var(--radius-lg)] border p-4 shadow-sm", enterGudang ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/5" : "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5")}>
                                    {enterGudang ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-success)]" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-danger)]" />}
                                    <div className="min-w-0">
                                      <p className="text-sm sm:text-[14.5px] md:text-[15px] font-bold text-[var(--color-primary)]">Warehouse entry compliance</p>
                                      <p className="mt-1 text-[11px] sm:text-[11.5px] md:text-xs font-medium text-[var(--color-secondary)]">
                                        {enterGudang ? "Enter gudang date is recorded for this batch." : "Enter gudang date is not recorded for this batch."}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Issue 2 */}
                                  <div className={cn("flex items-start gap-3 rounded-[var(--radius-lg)] border p-4 shadow-sm", isMissingETA ? "border-[var(--color-border-strong)] bg-[var(--color-neutral)]" : (isDelayed ? "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5" : "border-[var(--color-success)]/30 bg-[var(--color-success)]/5"))}>
                                    {isMissingETA ? <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-secondary)]" /> : (isDelayed ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-warning)]" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-success)]" />)}
                                    <div className="min-w-0">
                                      <p className="text-sm sm:text-[14.5px] md:text-[15px] font-bold text-[var(--color-primary)]">ETA achievement</p>
                                      <p className="mt-1 text-[11px] sm:text-[11.5px] md:text-xs font-medium text-[var(--color-secondary)]">
                                        {isMissingETA ? "ETA is missing." : (isDelayed ? (exitDate ? `Exit date is ${warehouseDelay} day${warehouseDelay! > 1 ? "s" : ""} after ETA.` : `Currently ${warehouseDelay} day${warehouseDelay! > 1 ? "s" : ""} over ETA (ongoing).`) : (exitDate ? "Exit date is on or before ETA." : "Currently on track before ETA (ongoing)."))}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Issue 3: Cycle Target */}
                                  {cycleTarget && (
                                    <div className={cn("flex items-start gap-3 rounded-[var(--radius-lg)] border p-4 shadow-sm", isCycleDelayed ? "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5" : "border-[var(--color-success)]/30 bg-[var(--color-success)]/5")}>
                                      {isCycleDelayed ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-warning)]" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-success)]" />}
                                      <div className="min-w-0">
                                        <p className="text-sm sm:text-[14.5px] md:text-[15px] font-bold text-[var(--color-primary)]">Cycle achievement</p>
                                        <p className="mt-1 text-[11px] sm:text-[11.5px] md:text-xs font-medium text-[var(--color-secondary)]">
                                          {isCycleDelayed ? `Total shipment cycle is ${totalCycle! - cycleTarget.max} day(s) over target (${cycleTarget.label}).` : `Total shipment cycle is within target (${cycleTarget.label}).`}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-start gap-2 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-3 text-xs sm:text-[13px] md:text-[14px] text-[var(--color-secondary)] font-medium shadow-sm">
                                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-secondary)]" />
                                  <p>All duration calculations are based on calendar days.</p>
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Footer Action */}
                <div className="shrink-0 flex items-center gap-2.5 px-5 sm:px-8 py-3.5 sm:py-4 border-t border-slate-100 bg-white pb-[calc(env(safe-area-inset-bottom)+14px)] sm:pb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedManifestRow(selectedRow); // Buka manifest modal
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-slate-50 text-[var(--color-primary)] border border-slate-200 text-[13.5px] sm:text-[14px] md:text-[15px] font-semibold active:opacity-80 transition-opacity"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Manifest
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRow(null)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-[var(--color-primary)] text-white text-[13.5px] sm:text-[14px] md:text-[15px] font-semibold active:opacity-80 transition-opacity"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

        {/* Manifest Modal */}
        {selectedManifestRow && typeof document !== 'undefined' && createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6"
            onClick={() => setSelectedManifestRow(null)}
          >
            <div
              className="relative w-full max-w-[1000px] m-auto bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-[0_20px_60px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Panel */}
              <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-[#E4E1DA] bg-[var(--color-surface)] sticky top-0 z-10">
                <div className="flex items-center gap-[14px]">
                  <div className="w-[38px] h-[38px] rounded-[var(--radius-md)] border border-[#E4E1DA] bg-[var(--color-neutral)] flex items-center justify-center text-[1.1rem] sm:text-[1.15rem] md:text-[1.2rem] text-[var(--color-tertiary)]">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-[var(--font-display)] font-semibold text-[1.1rem] sm:text-[1.2rem] md:text-[1.3rem] tracking-[-0.01em] leading-tight text-[var(--color-primary)]">
                      {selectedManifestRow.fdMarkingCode}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="font-[var(--font-label)] text-[0.65rem] sm:text-[0.7rem] tracking-[0.08em] uppercase text-[var(--color-secondary)] mt-[2px] leading-tight">
                        Batch Manifest List
                      </div>
                      {manifestBatchDetail?.fdListType === 2 && manifestBatchDetail?.fdContNo && (
                        <>
                          <span className="text-[var(--color-border)] text-xs sm:text-[13px] md:text-[14px] mt-[2px]">•</span>
                          <div className="font-[var(--font-label)] text-[0.65rem] sm:text-[0.7rem] tracking-[0.08em] uppercase text-[var(--color-tertiary)] mt-[2px] leading-tight font-bold bg-[var(--color-tertiary)]/10 px-1.5 py-0.5 rounded-md">
                            CONT: {manifestBatchDetail.fdContNo} {manifestBatchDetail.fdContSize ? `(${manifestBatchDetail.fdContSize.trim()})` : ''}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedManifestRow(null)}
                  className="text-[1.2rem] sm:text-[1.25rem] md:text-[1.3rem] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <ManifestList markingCode={selectedManifestRow.fdMarkingCode} onClose={() => setSelectedManifestRow(null)} />
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  )
}
