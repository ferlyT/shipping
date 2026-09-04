import { Package, Weight, Box, Hash, Barcode, Tag, CalendarDays, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { MetricCard } from './MetricCard'
import { CopyField } from './CopyField'
import type { Shipment } from '../../types/shipments.types'

interface ShipmentInfoTabProps {
  shipment: Shipment
  copiedField: string | null
  onCopy: (v: string | null | undefined, key: string) => void
}

export function ShipmentInfoTab({
  shipment,
  copiedField,
  onCopy,
}: ShipmentInfoTabProps) {
  const markingFull = [shipment.fdMarkingCode, shipment.fdMarkingNo].filter(Boolean).join(' ') || null

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* 3 Metric Cards */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <MetricCard
          label="Total Koli"
          value={Number(shipment.fdJmlPack || 0).toLocaleString('en-US')}
          unit={shipment.fdSatuan?.trim() || 'colly'}
          icon={Package}
          tone="amber"
        />
        <MetricCard
          label="Total Berat"
          value={Number(shipment.fdJmlBerat || 0).toLocaleString('en-US')}
          unit="kg"
          icon={Weight}
          tone="blue"
        />
        <MetricCard
          label="Total Volume"
          value={Number(shipment.fdM3 || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
          unit="m³"
          icon={Box}
          tone="purple"
        />
      </div>

      {/* Primary Key-Values Panel */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-1.5 divide-y divide-[var(--color-border)]">
        <CopyField
          label="No. Resi (Terima)"
          value={shipment.fdTerima}
          fieldKey="terima"
          copiedField={copiedField}
          onCopy={onCopy}
          icon={Hash}
          accent
        />
        <CopyField
          label="Tracking No."
          value={shipment.fdLocalTrackingNo}
          fieldKey="tracking"
          copiedField={copiedField}
          onCopy={onCopy}
          icon={Barcode}
          accent
        />
        <CopyField
          label="Marking & No."
          value={markingFull}
          fieldKey="marking"
          copiedField={copiedField}
          onCopy={onCopy}
          icon={Tag}
        />
        <CopyField
          label="Tanggal Agent"
          value={formatDate(shipment.fdTglAgent)}
          fieldKey="date"
          copiedField={copiedField}
          onCopy={onCopy}
          icon={CalendarDays}
        />
      </div>

      {/* Commodity Panel */}
      {(shipment.fdComodity || shipment.fdComodityName) && (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[var(--color-secondary)]">
              <Package size={13} className="hidden sm:inline-block text-[var(--color-primary)]" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Komoditas</span>
            </div>
            {shipment.fdComodityName && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 uppercase">
                {shipment.fdComodityName}
              </span>
            )}
          </div>
          {shipment.fdComodity ? (
            <p className="text-xs font-semibold text-[var(--color-text)] bg-[var(--color-neutral)] p-3 rounded-xl border border-[var(--color-border)] leading-relaxed">
              {shipment.fdComodity}
            </p>
          ) : (
            <p className="text-xs text-[var(--color-secondary)] italic bg-[var(--color-neutral)] p-2.5 rounded-xl border border-[var(--color-border)]">
              Tidak ada nama komoditas spesifik
            </p>
          )}
        </div>
      )}

      {/* Notes / Description Panel */}
      {shipment.fdDesc && (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-4 space-y-2">
          <div className="flex items-center gap-2 text-[var(--color-secondary)]">
            <FileText size={13} className="hidden sm:inline-block text-[var(--color-secondary)]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Keterangan</span>
          </div>
          <p className="text-xs text-[var(--color-secondary)] leading-relaxed bg-[var(--color-neutral)] p-3 rounded-xl border border-[var(--color-border)] whitespace-pre-wrap">
            {shipment.fdDesc}
          </p>
        </div>
      )}
    </div>
  )
}
