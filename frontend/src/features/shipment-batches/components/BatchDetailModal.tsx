import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { X, Box, Activity, Truck, Ship, LogOut, Clock, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { markingApi } from '../services/marking.service'
import type { Marking } from '../types/marking.types'
import { getSeaTargetDays, getAirTargetDays } from '../types/marking.types'

export function BatchDetailModal({
  selectedRow,
  listTypeFilter,
  onClose,
}: {
  selectedRow: Marking | null
  listTypeFilter: 'ALL' | '1' | '2'
  onClose: () => void
}) {
  const [modalTab, setModalTab] = useState<'detail' | 'timeline'>('detail')

  const { data: detailData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['markingDetail', selectedRow?.fdMarkingCode],
    queryFn: async () => {
      if (!selectedRow) return null
      const res = await markingApi.detail(selectedRow.fdMarkingCode)
      return res.data as { data: Marking }
    },
    enabled: !!selectedRow,
  })

  const selectedMarking = detailData?.data || selectedRow

  if (!selectedRow || typeof document === 'undefined') return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
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
                onClose()
                setModalTab('detail')
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
                        if (!val) return null
                        const d = new Date(val)
                        if (isNaN(d.getTime())) return null
                        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
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
                          case 'completed': return { ring: "ring-[var(--color-success)]/40", text: "text-[var(--color-success)]", badgeBg: "bg-[var(--color-success)]/10", badgeText: "text-[var(--color-success)]", label: "Completed" }
                          case 'pending': return { ring: "ring-[var(--color-secondary)]/40", text: "text-[var(--color-secondary)]", badgeBg: "bg-[var(--color-secondary)]/10", badgeText: "text-[var(--color-secondary)]", label: "Pending" }
                          case 'missing': return { ring: "ring-[var(--color-danger)]/40", text: "text-[var(--color-danger)]", badgeBg: "bg-[var(--color-danger)]/10", badgeText: "text-[var(--color-danger)]", label: "Missing data" }
                          case 'delayed': return { ring: "ring-[var(--color-warning)]/40", text: "text-[var(--color-warning)]", badgeBg: "bg-[var(--color-warning)]/10", badgeText: "text-[var(--color-warning)]", label: "Delayed" }
                          default: return { ring: "", text: "", badgeBg: "", badgeText: "", label: "" }
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
                                const s = getStatusStyles(stage.status)
                                const Icon = stage.icon
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
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    {/* KPIs */}
                    {(() => {
                      const parseDate = (val: string | undefined | null) => {
                        if (!val) return null
                        const d = new Date(val)
                        return isNaN(d.getTime()) ? null : d
                      }
                      const diffDays = (d1: Date | null, d2: Date | null) => {
                        if (!d1 || !d2) return null
                        return Math.ceil((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24))
                      }
                      const loadDate = parseDate(selectedMarking.fdLoadDate)
                      const etdDate = parseDate(selectedMarking.fdETD)
                      const etaDate = parseDate(selectedMarking.fdETA)
                      const exitDate = parseDate(selectedMarking.fdExitDate)

                      const today = new Date()

                      const leadTimeLoading = diffDays(etdDate, loadDate)
                      const transitTime = diffDays(etaDate, etdDate)
                      const warehouseDelay = diffDays(exitDate || today, etaDate)
                      const totalCycle = diffDays(exitDate || today, loadDate)
                      const isDelayed = warehouseDelay !== null && warehouseDelay > 0

                      const seaTarget = listTypeFilter === '2' ? getSeaTargetDays(selectedMarking.fdMarkingCode) : null
                      const airTarget = listTypeFilter === '1' ? getAirTargetDays(selectedMarking.fdMarkingCode) : null
                      const cycleTarget = listTypeFilter === '2' ? seaTarget : airTarget
                      const isCycleDelayed = cycleTarget !== null && totalCycle !== null ? totalCycle > cycleTarget.max : false

                      return (
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
                              <p className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Transit time</p>
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
                              <p className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Warehouse delay</p>
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
                              <p className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Total shipment cycle</p>
                              <div className="mt-2 flex items-baseline gap-1">
                                <span className={cn("text-2xl sm:text-[1.6rem] md:text-[1.7rem] font-bold font-[var(--font-display)]", isCycleDelayed ? "text-[var(--color-danger)]" : "text-[var(--color-primary)]")}>
                                  {totalCycle === null ? "—" : totalCycle}
                                </span>
                                {totalCycle !== null && <span className="text-[10px] sm:text-[11px] md:text-xs uppercase font-bold text-[var(--color-secondary)]">days</span>}
                              </div>
                              <p className="mt-1 text-[10px] sm:text-[11px] md:text-xs font-medium text-[var(--color-secondary)]">Load → {exitDate ? 'Exit' : 'Today'}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
