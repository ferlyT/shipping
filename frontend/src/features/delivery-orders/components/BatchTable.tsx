import { useState } from 'react'
import { BatchRow } from './BatchRow'
import type { GroupedDataRow } from '../types/delivery-orders.types'

export function BatchTable({ rows }: { rows: GroupedDataRow[] }) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  return (
    <div className="overflow-x-auto w-full border-t border-[var(--color-border)]">
      <table className="w-full min-w-[800px] border-collapse bg-[var(--color-surface)]">
        <thead>
          <tr className="bg-[var(--color-neutral)] border-b border-[var(--color-border)] text-left text-xs font-semibold text-[var(--color-secondary)] uppercase tracking-wider">
            <th className="py-3 pl-6 pr-4">List / Marking Code</th>
            <th className="py-3 px-4">Customer / Resi</th>
            <th className="py-3 px-4">Commodity</th>
            <th className="py-3 px-4">Total Qty</th>
            <th className="py-3 px-4">Remaining</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 pr-6 pl-4 text-right">Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <BatchRow 
              key={row.listCode} 
              row={row} 
              expanded={expandedRow === row.listCode} 
              onToggle={() => setExpandedRow(expandedRow === row.listCode ? null : row.listCode)} 
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
