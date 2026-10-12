import { FileText, Clock, Ban, CheckCircle2, PlusCircle, DollarSign, RefreshCw } from 'lucide-react'
import type { DataRevisionsStats } from '../types/data-revisions.types'

interface RevisionAnalyticsSectionProps {
  stats?: DataRevisionsStats
  isLoading?: boolean
  selectedStatus?: string
  onSelectStatus?: (status: string) => void
}

export default function RevisionAnalyticsSection({
  stats,
  isLoading,
  selectedStatus = 'ALL',
  onSelectStatus,
}: RevisionAnalyticsSectionProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-4 h-24 skeleton-shimmer" />
        ))}
      </div>
    )
  }

  const cards = [
    {
      id: 'ALL',
      title: 'TOTAL DOKUMEN',
      value: stats?.total ?? 0,
      icon: FileText,
      color: 'text-primary',
      borderColor: 'border-border/60 hover:border-primary/50',
      activeBorder: 'border-primary ring-1 ring-primary/30',
      sub: `${stats?.tipeRevisi || 0} Revisi • ${stats?.tipeInputBaru || 0} Baru`,
    },
    {
      id: 'PENDING',
      title: 'MENUNGGU TINDAK LANJUT',
      value: stats?.pending ?? 0,
      icon: Clock,
      color: 'text-amber-500',
      borderColor: 'border-border/60 hover:border-amber-500/50',
      activeBorder: 'border-amber-500 ring-1 ring-amber-500/30',
      sub: 'Perlu aksi / pembuatan bill',
    },
    {
      id: 'DATA_CANCELLED',
      title: 'DATA DIBATALKAN',
      value: stats?.cancelled ?? 0,
      icon: Ban,
      color: 'text-rose-500',
      borderColor: 'border-border/60 hover:border-rose-500/50',
      activeBorder: 'border-rose-500 ring-1 ring-rose-500/30',
      sub: 'fdCancel = 1 di tbEntryList',
    },
    {
      id: 'BILL_TERBUAT',
      title: 'BILL TERBUAT',
      value: stats?.billTerbuat ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-500',
      borderColor: 'border-border/60 hover:border-emerald-500/50',
      activeBorder: 'border-emerald-500 ring-1 ring-emerald-500/30',
      sub: 'Invoice terbit di tbBilling',
    },
  ]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((card) => {
          const Icon = card.icon
          const isSelected = selectedStatus === card.id

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelectStatus && onSelectStatus(isSelected && card.id !== 'ALL' ? 'ALL' : card.id)}
              className={`bg-[var(--color-surface)] rounded-2xl border p-3 sm:p-4 text-left transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                isSelected ? card.activeBorder : card.borderColor
              } hover:shadow-md`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[0.68rem] sm:text-[0.72rem] font-semibold uppercase tracking-wider text-[var(--color-secondary)] line-clamp-1">
                  {card.title}
                </span>
                <div className={`p-1.5 rounded-lg bg-[var(--color-surface-hover)] border border-[var(--color-border)] ${card.color}`}>
                  <Icon size={16} />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-[var(--color-primary)]">
                  {card.value.toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-[0.68rem] text-[var(--color-secondary)]/80 line-clamp-1">
                {card.sub}
              </p>
            </button>
          )
        })}
      </div>

      {/* Pill summary tipe data */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-[0.7rem] text-[var(--color-secondary)] font-medium mr-1">Rincian Kategori:</span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[0.7rem] border border-[var(--color-border)] bg-[var(--color-surface-hover)] text-[var(--color-secondary)]">
          <RefreshCw size={11} className="text-[var(--color-primary)]" />
          Revisi: <strong className="text-[var(--color-primary)] font-mono">{stats?.tipeRevisi || 0}</strong>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[0.7rem] border border-[var(--color-border)] bg-[var(--color-surface-hover)] text-[var(--color-secondary)]">
          <PlusCircle size={11} className="text-sky-500" />
          Input Baru: <strong className="text-[var(--color-primary)] font-mono">{stats?.tipeInputBaru || 0}</strong>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[0.7rem] border border-[var(--color-border)] bg-[var(--color-surface-hover)] text-[var(--color-secondary)]">
          <DollarSign size={11} className="text-amber-500" />
          Local Charges: <strong className="text-[var(--color-primary)] font-mono">{stats?.tipeLocalCharges || 0}</strong>
        </span>
      </div>
    </div>
  )
}
