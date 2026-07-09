import { Table } from '@/components/ui/Table'
import { formatNumber } from '@/lib/utils'
import type { ShipmentDimension } from '@/types/shipments'

interface ShipmentDimensionsTabProps {
  dimensions: ShipmentDimension[]
}

export function ShipmentDimensionsTab({ dimensions }: ShipmentDimensionsTabProps) {
  const dimColumns = [
    { key: 'fdDescr', header: 'Deskripsi' },
    { key: 'fdPjg', header: 'P (cm)', render: (row: ShipmentDimension) => formatNumber(row.fdPjg) },
    { key: 'fdLbr', header: 'L (cm)', render: (row: ShipmentDimension) => formatNumber(row.fdLbr) },
    { key: 'fdTng', header: 'T (cm)', render: (row: ShipmentDimension) => formatNumber(row.fdTng) },
    { key: 'fdQty', header: 'Qty', render: (row: ShipmentDimension) => formatNumber(row.fdQty) },
  ]

  // Total volume (m3) dihitung dari dimensi yang ada: (P x L x T x Qty) / 1.000.000, satuan cm -> m3
  const totalDimensiM3 = dimensions.reduce((sum, dim) => {
    const p = Number(dim.fdPjg || 0)
    const l = Number(dim.fdLbr || 0)
    const t = Number(dim.fdTng || 0)
    const qty = Number(dim.fdQty || 0)
    return sum + (p * l * t * qty) / 1_000_000
  }, 0)

  return (
    <div className="h-full flex flex-col min-h-0 bg-white border border-gray-100 rounded-xl overflow-hidden">
      <Table
        columns={dimColumns}
        data={dimensions}
        keyExtractor={(row) => `${row.fdListCode}-${row.fdListDCode}`}
        emptyMessage="Tidak ada data dimensi (WH) untuk resi ini."
      />
      {dimensions.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Total Volume ({dimensions.length} dimensi)
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold text-gray-900 tabular-nums">
              {totalDimensiM3.toLocaleString('id-ID', { maximumFractionDigits: 4 })}
            </span>
            <span className="text-xs text-gray-500 font-medium">m³</span>
          </div>
        </div>
      )}
    </div>
  )
}
