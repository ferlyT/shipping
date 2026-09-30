import React from 'react'
import { Layers, Box, Scale, Coins, Truck } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import type { ValidationCardTab, M3CheckResponse } from './types'

interface ValidationCardTabsBarProps {
  activeTab: ValidationCardTab
  setUserSelectedTab: (tab: ValidationCardTab) => void
  hasPriceDiscrepancy: boolean
  isType2: boolean
  isAir: boolean
  isType2Discrepancy: boolean
  isMatch: boolean
  isBilledOverweightExactMatch?: boolean
  isOverweight?: boolean
  isBilledUnneededOverweight?: boolean
  isBilledOverweightTolerated?: boolean
  hasFreightCharge: boolean
  res?: M3CheckResponse | null
  hasUnbilledTransport: boolean
  unbilledExpedisiList: any[]
  codExpedisiList: any[]
  mustBillExpedisiList: any[]
  validExpedisiList: any[]
}

export const ValidationCardTabsBar: React.FC<ValidationCardTabsBarProps> = ({
  activeTab,
  setUserSelectedTab,
  hasPriceDiscrepancy,
  isType2,
  isAir,
  isType2Discrepancy,
  isMatch,
  isBilledOverweightExactMatch = false,
  isOverweight = false,
  isBilledUnneededOverweight = false,
  isBilledOverweightTolerated = false,
  hasFreightCharge,
  res,
  hasUnbilledTransport,
  unbilledExpedisiList,
  codExpedisiList,
  mustBillExpedisiList,
  validExpedisiList,
}) => {
  return (
    <div className="px-2.5 sm:px-4 py-1.5 sm:py-2 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/30 flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar touch-pan-x shrink-0">
      {/* Tab 1: Profile / Items */}
      <button
        type="button"
        onClick={() => setUserSelectedTab('profile')}
        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border shrink-0 ${
          activeTab === 'profile'
            ? 'bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs font-bold'
            : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
        }`}
      >
        <Layers size={13} />
        <span>Item & Tarif</span>
        {hasPriceDiscrepancy ? (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
            Cek
          </span>
        ) : (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
            ✓ Valid
          </span>
        )}
      </button>

      {/* Tab 2: M3 / Weight / Type 2 Compare */}
      <button
        type="button"
        onClick={() => setUserSelectedTab('m3_weight')}
        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border shrink-0 ${
          activeTab === 'm3_weight'
            ? 'bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs font-bold'
            : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
        }`}
      >
        {isType2 ? <Scale size={13} /> : <Box size={13} />}
        <span>{isType2 ? 'Compare M3:KG' : isAir ? 'Timbangan' : 'Validasi M3'}</span>
        {isType2 ? (
          isType2Discrepancy ? (
            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
              Perlu Cek
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
              ✓ Valid
            </span>
          )
        ) : isMatch ? (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
            ✓ Sesuai
          </span>
        ) : (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500/15 text-rose-600 border border-rose-500/30">
            Selisih
          </span>
        )}
      </button>

      {/* Tab 3: Overweight (Sea only, not applicable for Type 2) */}
      {!isAir && !isType2 && (
        <button
          type="button"
          onClick={() => setUserSelectedTab('overweight')}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border shrink-0 ${
            activeTab === 'overweight'
              ? 'bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs font-bold'
              : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
          }`}
        >
          <Scale size={13} />
          <span>Overweight</span>
          {isBilledOverweightExactMatch || (!isOverweight && !isBilledUnneededOverweight) ? (
            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
              ✓ Aman
            </span>
          ) : isBilledOverweightTolerated ? (
            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
              ✓ Toleransi
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
              Cek
            </span>
          )}
        </button>
      )}

      {/* Tab 4: Freight Charge */}
      <button
        type="button"
        onClick={() => setUserSelectedTab('freight')}
        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border shrink-0 ${
          activeTab === 'freight'
            ? 'bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs font-bold'
            : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
        }`}
      >
        <Coins size={13} />
        <span>Freight Charge</span>
        {hasFreightCharge ? (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
            {formatNumber(res?.freightChargeSummary?.totalFc || 0)} {res?.freightChargeSummary?.currency}
          </span>
        ) : (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-medium text-[var(--color-secondary)]">
            Nihil
          </span>
        )}
      </button>

      {/* Tab 5: Ekspedisi (tbExpIndo) */}
      <button
        type="button"
        onClick={() => setUserSelectedTab('transport')}
        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border shrink-0 ${
          activeTab === 'transport'
            ? 'bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs font-bold'
            : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
        }`}
      >
        <Truck size={13} />
        <span>Ekspedisi</span>
        {hasUnbilledTransport ? (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30 animate-pulse">
            {unbilledExpedisiList.length} Belum Ditagih
          </span>
        ) : codExpedisiList.length > 0 && mustBillExpedisiList.length === 0 ? (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-sky-500/15 text-sky-600 border border-sky-500/30">
            {codExpedisiList.length} COD
          </span>
        ) : validExpedisiList.length > 0 ? (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
            ✓ Sesuai
          </span>
        ) : (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-medium text-[var(--color-secondary)]">
            Nihil
          </span>
        )}
      </button>
    </div>
  )
}
