import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Check, Copy, Info, Ruler, Truck,
  MapPin, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusBadge } from './StatusBadge'
import { ShipmentInfoTab } from './detail/ShipmentInfoTab'
import { ShipmentDimensionsTab } from './detail/ShipmentDimensionsTab'
import { ShipmentTimelineTab } from './detail/ShipmentTimelineTab'
import type {
  Shipment,
  ShipmentDimensionGudang,
  ShipmentDimensionPackingList,
  ShipmentDimensionKomplain,
} from '../types/shipments.types'

interface ShipmentDetailModalProps {
  shipment: Shipment
  isLoadingDetail?: boolean
  dimsGudang: ShipmentDimensionGudang[]
  isLoadingGudang: boolean
  dimsPackingList: ShipmentDimensionPackingList[]
  isLoadingPackingList: boolean
  dimsKomplain: ShipmentDimensionKomplain[]
  isLoadingKomplain: boolean
  onClose: () => void
}

type TabId = 'info' | 'dimensions' | 'timeline'

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'info', label: 'Ringkasan', icon: Info },
  { id: 'dimensions', label: 'Dimensi', icon: Ruler },
  { id: 'timeline', label: 'Timeline', icon: Truck },
]

export function ShipmentDetailModal({
  shipment,
  isLoadingDetail = false,
  dimsGudang,
  isLoadingGudang,
  dimsPackingList,
  isLoadingPackingList,
  dimsKomplain,
  isLoadingKomplain,
  onClose,
}: ShipmentDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('info')
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const copyToClipboard = (value: string | null | undefined, field: string) => {
    if (!value) return
    navigator.clipboard?.writeText(value).then(() => {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 1500)
    })
  }

  const status = shipment.shipmentStatus
  const totalDimCount = dimsGudang.length + dimsPackingList.length + dimsKomplain.length

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog Container */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
        <div className="w-full sm:max-w-2xl bg-[var(--color-neutral)] shadow-2xl rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden pointer-events-auto max-h-[92vh] sm:max-h-[86vh] border border-[var(--color-border)] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">

          {/* Drag Pill (Mobile Only) */}
          <div className="sm:hidden flex justify-center pt-3 pb-1 bg-[var(--color-surface)] shrink-0">
            <div className="w-10 h-1 rounded-full bg-[var(--color-border)]" />
          </div>

          {/* ── HEADER ── */}
          <div className="flex-shrink-0 bg-[var(--color-surface)] px-5 sm:px-6 pt-3 sm:pt-5 pb-3.5 border-b border-[var(--color-border)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {/* Title (Customer Name) */}
                <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text)] tracking-tight truncate">
                  {shipment.fdCustName || 'Customer Tidak Dikenal'}
                </h2>

                {/* Subtitle (List Code Badge + Status + Location) */}
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[var(--color-neutral)] text-[var(--color-text)] text-xs font-semibold">
                    <span className="font-mono">{shipment.fdListCode}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(shipment.fdListCode, 'listCode')}
                      className="text-[var(--color-secondary)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
                      title="Salin No. List"
                    >
                      {copiedField === 'listCode' ? (
                        <Check size={12} className="text-emerald-500" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </div>

                  <StatusBadge status={shipment.shipmentStatus} />

                  {status?.fdGudang?.trim() && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-secondary)] bg-[var(--color-neutral)] px-2.5 py-0.5 rounded-lg">
                      <MapPin size={11} className="text-[var(--color-secondary)]" />
                      {status.fdGudang.trim()}
                    </span>
                  )}
                </div>
              </div>

              {/* Close button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-[var(--color-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-neutral)] transition-all shrink-0 cursor-pointer"
                aria-label="Tutup modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Segmented Main Navigation Bar */}
            <div className="flex gap-1 mt-4 p-1 bg-[var(--color-neutral)] rounded-xl border border-[var(--color-border)]">
              {TABS.map(({ id, label, icon: Icon }) => {
                const isActive = activeTab === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer',
                      isActive
                        ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-xs'
                        : 'text-[var(--color-secondary)] hover:text-[var(--color-text)]'
                    )}
                  >
                    <Icon size={14} className={isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-secondary)]'} />
                    <span>{label}</span>
                    {id === 'dimensions' && totalDimCount > 0 && (
                      <span
                        className={cn(
                          'text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[17px] text-center tabular-nums',
                          isActive ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'bg-[var(--color-border)] text-[var(--color-secondary)]'
                        )}
                      >
                        {totalDimCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── BODY (Scrollable Area) ── */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 bg-[var(--color-neutral)]">
            {isLoadingDetail ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-[var(--color-primary)]" />
                <span className="text-xs text-[var(--color-secondary)] font-medium">Memuat rincian pengiriman...</span>
              </div>
            ) : (
              <>
                {activeTab === 'info' && (
                  <ShipmentInfoTab
                    shipment={shipment}
                    copiedField={copiedField}
                    onCopy={copyToClipboard}
                  />
                )}
                {activeTab === 'dimensions' && (
                  <ShipmentDimensionsTab
                    dimsGudang={dimsGudang}
                    isLoadingGudang={isLoadingGudang}
                    dimsPackingList={dimsPackingList}
                    isLoadingPackingList={isLoadingPackingList}
                    dimsKomplain={dimsKomplain}
                    isLoadingKomplain={isLoadingKomplain}
                  />
                )}
                {activeTab === 'timeline' && (
                  <ShipmentTimelineTab shipment={shipment} />
                )}
              </>
            )}
          </div>

          {/* ── FOOTER ── */}
          <div className="shrink-0 flex items-center gap-2.5 px-5 sm:px-6 py-3 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => copyToClipboard(shipment.fdTerima || shipment.fdLocalTrackingNo, 'footerCopy')}
              disabled={!shipment.fdTerima && !shipment.fdLocalTrackingNo}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[var(--color-border)] text-[var(--color-text)] text-xs sm:text-[13px] font-semibold hover:bg-[var(--color-neutral)] active:opacity-80 disabled:opacity-40 transition-colors cursor-pointer"
            >
              {copiedField === 'footerCopy' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span>{copiedField === 'footerCopy' ? 'Nomor Tersalin!' : 'Salin Nomor Resi / Tracking'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none sm:px-8 py-2.5 rounded-xl bg-[var(--color-primary)] text-[var(--color-on-primary)] text-xs sm:text-[13px] font-semibold hover:opacity-90 active:scale-[0.99] transition-all shadow-xs cursor-pointer"
            >
              Tutup
            </button>
          </div>

        </div>
      </div>
    </>,
    document.body
  )
}
