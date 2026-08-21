import { useState } from 'react'
import { Clock, CheckCircle2, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { BatchTable } from './BatchTable'
import { TableFooter } from './TableFooter'
import { DataGroupSection } from './DataGroupSection'
import type { GroupedDataRow, GroupMeta, GroupMode, SentValue } from '../types/delivery-orders.types'

const statusMeta = {
  open: {
    label: "Pending",
    hint: "Daftar pengiriman yang masih dalam proses pengantaran.",
    icon: Clock,
    accent: "text-amber-500",
    chip: "bg-transparent border border-amber-500/30 text-amber-500",
    badgeBg: "bg-transparent",
    badgeText: "text-amber-500 border border-amber-500/40",
  },
  closed: {
    label: "Delivered",
    hint: "Semua pengiriman telah selesai diantar ke tujuan.",
    icon: CheckCircle2,
    accent: "text-emerald-500",
    chip: "bg-transparent border border-emerald-500/30 text-emerald-500",
    badgeBg: "bg-transparent",
    badgeText: "text-emerald-500 border border-emerald-500/40",
  },
} as const

export function StatusBlock({
  status,
  defaultOpen,
  badgeTotal,
  groupMode,
  listTypeValue,
  sentValue,
  search,
  isLoading,
  rows,
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  isGroupsLoading,
  groups,
}: {
  status: "open" | "closed"
  defaultOpen: boolean
  badgeTotal: number
  groupMode: GroupMode
  listTypeValue: string
  sentValue: SentValue
  search: string
  isLoading: boolean
  rows: GroupedDataRow[]
  page: number
  limit: number
  total: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  isGroupsLoading: boolean
  groups: GroupMeta[]
}) {
  const [expanded, setExpanded] = useState(defaultOpen)
  const meta = statusMeta[status]
  const Icon = meta.icon
  const isGroupedMode = groupMode !== 'none'
  const filterField: 'markingCode' | 'branch' = groupMode === 'branch' ? 'branch' : 'markingCode'

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors duration-200 hover:bg-[var(--color-neutral)] cursor-pointer"
      >
        <div className="flex items-center gap-4">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${meta.chip}`}>
            <Icon className={`h-5 w-5 ${meta.accent}`} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-base font-bold text-[var(--color-primary)]">{meta.label}</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${meta.badgeBg} ${meta.badgeText}`}>
                {badgeTotal} lists
              </span>
            </div>
            <span className="block text-xs text-[var(--color-secondary)]">{meta.hint}</span>
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="h-5 w-5 flex-shrink-0 text-[var(--color-secondary)]" />
        ) : (
          <ChevronRight className="h-5 w-5 flex-shrink-0 text-[var(--color-secondary)]" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          {isGroupedMode ? (
            isGroupsLoading ? (
              <div className="flex flex-col justify-center items-center py-12 gap-3">
                <Loader2 className="w-8 h-8 text-[var(--color-tertiary)] animate-spin" />
                <p className="text-[var(--color-secondary)] text-xs animate-pulse">Memuat groups...</p>
              </div>
            ) : groups.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-[var(--color-secondary)]">Tidak ada data untuk status ini.</p>
            ) : (
              <div className="flex flex-col">
                {groups.map((g) => (
                  <DataGroupSection
                    key={`${listTypeValue}-${sentValue}-${filterField}-${g.code}`}
                    filterField={filterField}
                    code={g.code}
                    label={g.label}
                    groupTotal={g.total}
                    listTypeValue={listTypeValue}
                    sentValue={sentValue}
                    search={search}
                  />
                ))}
              </div>
            )
          ) : isLoading ? (
            <div className="flex flex-col justify-center items-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-[var(--color-tertiary)] animate-spin" />
              <p className="text-[var(--color-secondary)] text-xs animate-pulse">Memuat data...</p>
            </div>
          ) : rows.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-[var(--color-secondary)]">Tidak ada data untuk status ini.</p>
          ) : (
            <div className="flex flex-col">
              <BatchTable rows={rows} />
              <TableFooter
                page={page}
                limit={limit}
                total={total}
                onPageChange={onPageChange}
                onLimitChange={onLimitChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
