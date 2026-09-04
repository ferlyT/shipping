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

export function BatchTableSkeleton() {
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
        <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
          {Array.from({ length: 4 }).map((_, i) => (
            <tr key={i} className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              <td className="py-3.5 pl-6 pr-4">
                <div className="h-4 w-28 rounded-md skeleton-shimmer" />
              </td>
              <td className="py-3.5 px-4">
                <div className="h-4 w-36 rounded-md skeleton-shimmer" />
              </td>
              <td className="py-3.5 px-4">
                <div className="h-4 w-24 rounded-md skeleton-shimmer" />
              </td>
              <td className="py-3.5 px-4">
                <div className="h-4 w-16 rounded skeleton-shimmer" />
              </td>
              <td className="py-3.5 px-4">
                <div className="h-4 w-16 rounded skeleton-shimmer" />
              </td>
              <td className="py-3.5 px-4">
                <div className="h-6 w-20 rounded-full skeleton-shimmer" />
              </td>
              <td className="py-3.5 pr-6 pl-4 text-right">
                <div className="h-8 w-8 rounded-lg skeleton-shimmer ml-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

