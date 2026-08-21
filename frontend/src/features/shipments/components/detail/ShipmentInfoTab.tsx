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
          value={Number(shipment.fdJmlPack || 0).toLocaleString('id-ID')}
          unit={shipment.fdSatuan?.trim() || 'colly'}
          icon={Package}
          tone="amber"
        />
        <MetricCard
          label="Total Berat"
          value={Number(shipment.fdJmlBerat || 0).toLocaleString('id-ID')}
          unit="kg"
          icon={Weight}
          tone="blue"
        />
        <MetricCard
          label="Total Volume"
          value={Number(shipment.fdM3 || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}
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

      {/* Commodity & Notes Panel */}
      {(shipment.fdComodity || shipment.fdDesc) && (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2 text-[var(--color-secondary)]">
            <FileText size={13} />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Komoditas & Keterangan</span>
          </div>
          {shipment.fdComodity && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--color-neutral)] text-[var(--color-text)] text-xs font-semibold mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-secondary)]" />
              {shipment.fdComodity}
            </div>
          )}
          {shipment.fdDesc && (
            <p className="text-xs text-[var(--color-secondary)] leading-relaxed bg-[var(--color-neutral)] p-3 rounded-xl border border-[var(--color-border)]">
              {shipment.fdDesc}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
