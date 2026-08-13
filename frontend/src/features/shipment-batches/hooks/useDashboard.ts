import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { markingApi, type ExitHistoryDay } from '../services/marking.service'
import type { Marking } from '../types/marking.types'
import type { ExitListItem } from '../components/ExitListModal'
import type { PrediksiExitItem } from '../components/PredictedExitModal'

export interface KpiData {
  totalBatches: number
  totalBatchesAir: number
  totalBatchesSea: number

  activeBatches: number
  activeBatchesAir: number
  activeBatchesSea: number

  avgTransitTime: number
  avgTransitTimeAir: number
  avgTransitTimeSea: number

  etaNotExitBatches: number
  etaNotExitBatchesAir: number
  etaNotExitBatchesSea: number
  etaNotExitSummary: { name: string; count: number; codes: { code: string; aging: number }[] }[]

  missedTargetBatches: number
  missedTargetBatchesAir: number
  missedTargetBatchesSea: number
  missedTargetSummary: { name: string; count: number; codes: { code: string; transit: number; target: number }[] }[]

  prediksiTerlambatCount: number
  prediksiSegeraCount: number
  prediksiDekatCount: number
  prediksiAttentionAir: number
  prediksiAttentionSea: number
  prediksiExitList: PrediksiExitItem[]

  exitTodayCount: number
  exitTodayAir: number
  exitTodaySea: number
  exitTodayList: ExitListItem[]

  exitYesterdayCount: number
  exitYesterdayAir: number
  exitYesterdaySea: number
  exitYesterdayList: ExitListItem[]

  expectedExitTomorrowCount: number
  expectedExitTomorrowAir: number
  expectedExitTomorrowSea: number
  expectedExitTomorrowList: PrediksiExitItem[]
}

export function useDashboard() {
  const [isRingkasanOpen, setIsRingkasanOpen] = useState(true)
  const [selectedManifestRow, setSelectedManifestRow] = useState<Marking | null>(null)

  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false)
  const [isEtaSummaryModalOpen, setIsEtaSummaryModalOpen] = useState(false)
  const [isMissedTargetModalOpen, setIsMissedTargetModalOpen] = useState(false)
  const [isPrediksiExitModalOpen, setIsPrediksiExitModalOpen] = useState(false)
  const [isExitHistoryModalOpen, setIsExitHistoryModalOpen] = useState(false)

  const [isExitListModalOpen, setIsExitListModalOpen] = useState(false)
  const [exitListModalConfig, setExitListModalConfig] = useState<{ 
    title: string 
    description: string 
    data: ExitListItem[] 
    iconColorClass: string 
    iconBgClass: string 
  }>({ title: '', description: '', data: [], iconColorClass: '', iconBgClass: '' })

  const [exitCalendarMonth, setExitCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  // Queries
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
    queryKey: ['markingKpi'],
    queryFn: async () => {
      const res = await markingApi.getKPIs({})
      return res.data as { data: KpiData }
    }
  })

  const kpis = kpiData?.data

  const { data: exitHistoryData, isLoading: isLoadingExitHistory } = useQuery({
    queryKey: ['markingExitHistory', exitCalendarMonth.getFullYear(), exitCalendarMonth.getMonth()],
    queryFn: async () => {
      const monthKey = `${exitCalendarMonth.getFullYear()}-${String(exitCalendarMonth.getMonth() + 1).padStart(2, '0')}`
      const res = await markingApi.getExitHistory({ month: monthKey })
      return res.data as {
        data: {
          historyMap: Record<string, ExitHistoryDay>
          totalCount: number
          airCount: number
          seaCount: number
        }
      }
    }
  })

  const exitHistoryObj = exitHistoryData?.data
  const exitHistoryMap = exitHistoryObj?.historyMap || {}
  const exitHistoryMonthTotal = exitHistoryObj?.totalCount || 0
  const exitHistoryMonthAir = exitHistoryObj?.airCount || 0
  const exitHistoryMonthSea = exitHistoryObj?.seaCount || 0

  return {
    state: {
      isRingkasanOpen,
      selectedManifestRow,
      isCodeModalOpen,
      isEtaSummaryModalOpen,
      isMissedTargetModalOpen,
      isPrediksiExitModalOpen,
      isExitHistoryModalOpen,
      isExitListModalOpen,
      exitListModalConfig,
      exitCalendarMonth,
    },
    actions: {
      setIsRingkasanOpen,
      setSelectedManifestRow,
      setIsCodeModalOpen,
      setIsEtaSummaryModalOpen,
      setIsMissedTargetModalOpen,
      setIsPrediksiExitModalOpen,
      setIsExitHistoryModalOpen,
      setIsExitListModalOpen,
      setExitListModalConfig,
      setExitCalendarMonth,
    },
    data: {
      kpis,
      manifestBatchDetail,
      exitHistoryMap,
      exitHistoryMonthTotal,
      exitHistoryMonthAir,
      exitHistoryMonthSea,
    },
    flags: {
      isLoadingKpi,
      isLoadingExitHistory,
    }
  }
}
