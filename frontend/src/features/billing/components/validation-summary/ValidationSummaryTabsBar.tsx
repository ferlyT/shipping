import { Layers, Box, Scale, Coins, Truck } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import type { SummaryModalTab } from './types'

export interface ValidationSummaryTabsBarProps {
  activeTab: SummaryModalTab
  onTabChange: (tab: SummaryModalTab) => void
  isAir: boolean
  hasPriceDiscrepancy: boolean
  hasPhysicalDiscrepancy: boolean
  isBilledBelowMinM3?: boolean
  hasOverweightIssue: boolean
  hasUnbilledTransport: boolean
  hasFreightCharge?: boolean
  freightChargeSummary?: {
    totalFc?: number
    currency?: string
    listsWithFcCount?: number
  } | null
  itemCount?: number
}

export function ValidationSummaryTabsBar({
  activeTab,
  onTabChange,
  isAir,
  hasPriceDiscrepancy,
  hasPhysicalDiscrepancy,
  isBilledBelowMinM3 = false,
  hasOverweightIssue,
  hasUnbilledTransport,
  hasFreightCharge = false,
  freightChargeSummary,
  itemCount: _itemCount,
}: ValidationSummaryTabsBarProps) {
  const hasFc = Boolean(
    (freightChargeSummary?.totalFc && freightChargeSummary.totalFc > 0) || hasFreightCharge
  )

  const tabs: Array<{
    id: SummaryModalTab
    label: string
    icon: any
    renderStatusTag: () => React.ReactNode
  }> = [
    {
      id: 'items',
      label: 'Item Tagihan & Tarif',
      icon: Layers,
      renderStatusTag: () =>
        hasPriceDiscrepancy ? (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            Cek Tarif
          </span>
        ) : (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            ✓ Valid
          </span>
        ),
    },
    {
      id: 'm3_weight',
      label: isAir ? 'Timbangan Fisik' : 'Validasi M3',
      icon: Box,
      renderStatusTag: () =>
        hasPhysicalDiscrepancy ? (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            Selisih
          </span>
        ) : isBilledBelowMinM3 ? (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            Cek Min. M3
          </span>
        ) : (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            ✓ Sesuai
          </span>
        ),
    },
    ...(!isAir
      ? [
          {
            id: 'overweight' as SummaryModalTab,
            label: 'Overweight',
            icon: Scale,
            renderStatusTag: () =>
              !hasOverweightIssue ? (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  ✓ Aman
                </span>
              ) : (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Perlu Cek
                </span>
              ),
          },
        ]
      : []),
    {
      id: 'freight',
      label: 'Freight Charge',
      icon: Coins,
      renderStatusTag: () =>
        hasFc && freightChargeSummary?.totalFc ? (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            {formatNumber(freightChargeSummary.totalFc)} {freightChargeSummary.currency || 'USD'}
          </span>
        ) : (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-medium text-[var(--color-secondary)] border border-[var(--color-border)]">
            Nihil
          </span>
        ),
    },
    {
      id: 'transport',
      label: 'Transport & Ekspedisi',
      icon: Truck,
      renderStatusTag: () =>
        hasUnbilledTransport ? (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            Perlu Tagih
          </span>
        ) : (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            ✓ Sesuai
          </span>
        ),
    },
  ]

  return (
    <div className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 bg-[var(--color-surface)] border-b border-[var(--color-border)] overflow-x-auto shrink-0">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-semibold whitespace-nowrap transition-all cursor-pointer border ${
              isActive
                ? 'bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs font-bold'
                : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)]'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span>{tab.label}</span>
            {tab.renderStatusTag()}
          </button>
        )
      })}
    </div>
  )
}
