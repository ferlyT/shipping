import { useState } from 'react'
import { X, Info, Layers, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ShipmentInfoTab } from './ShipmentInfoTab'
import { ShipmentDimensionsTab } from './ShipmentDimensionsTab'
import type { Shipment, ShipmentDimension } from '@/types/shipments'

interface ShipmentDetailModalProps {
  shipment: Shipment
  dimensions: ShipmentDimension[]
  isLoadingDetail: boolean
  isLoadingDimensions: boolean
  onClose: () => void
}

export function ShipmentDetailModal({
  shipment,
  dimensions,
  isLoadingDetail,
  isLoadingDimensions,
  onClose,
}: ShipmentDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'dimensi'>('info')

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Panel Detail */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[500px] bg-[var(--color-surface)] border-l border-[var(--color-border)] shadow-2xl flex flex-col animate-slideInRight h-full overflow-hidden">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between p-5 border-b border-[var(--color-border)] bg-[var(--color-neutral)]">
          <div className="min-w-0">
            <h2 className="text-lg font-bold font-[var(--font-display)] truncate flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[var(--color-primary)]" />
              {shipment.fdListCode}
            </h2>
            <p className="text-xs text-[var(--color-secondary)] mt-1">Detail Resi Pengiriman</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--color-secondary)] hover:text-[var(--color-primary)] bg-[var(--color-surface)] rounded-full border border-[var(--color-border)] shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Tabs Header */}
          <div className="flex items-center border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 pt-2 gap-4">
            <button
              onClick={() => setActiveTab('info')}
              className={cn(
                'pb-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5',
                activeTab === 'info'
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-secondary)] hover:text-gray-700'
              )}
            >
              <Info className="w-4 h-4" />
              Main Info
            </button>
            <button
              onClick={() => setActiveTab('dimensi')}
              className={cn(
                'pb-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5',
                activeTab === 'dimensi'
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-secondary)] hover:text-gray-700'
              )}
            >
              <Layers className="w-4 h-4" />
              Dimensi (WH)
              {dimensions.length > 0 && (
                <span className="bg-[var(--color-primary)] text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {dimensions.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Content — urutan pengecekan sengaja dipertahankan sama seperti versi lama:
              indikator "Memuat detail..." tidak terikat ke activeTab (perilaku asli). */}
          <div className="p-5 flex-1">
            {isLoadingDetail && (
              <div className="text-center text-sm text-[var(--color-secondary)] mt-10">Memuat detail...</div>
            )}

            {!isLoadingDetail && activeTab === 'info' && <ShipmentInfoTab shipment={shipment} />}

            {!isLoadingDimensions && activeTab === 'dimensi' && (
              <ShipmentDimensionsTab dimensions={dimensions} />
            )}

            {isLoadingDimensions && activeTab === 'dimensi' && (
              <div className="text-center text-sm text-[var(--color-secondary)] mt-10">Memuat dimensi...</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
