import { useState } from 'react'
import { Box, Ruler } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DimItemCard, calcTotalVolume } from './DimItemCard'
import type {
  ShipmentDimensionGudang,
  ShipmentDimensionPackingList,
  ShipmentDimensionKomplain,
} from '../../types/shipments.types'

export type DimSubTab = 'packinglist' | 'gudang' | 'komplain'

const DIM_SUB_TABS: { id: DimSubTab; label: string }[] = [
  { id: 'packinglist', label: 'Packing List' },
  { id: 'gudang', label: 'Ukuran Gudang' },
  { id: 'komplain', label: 'Komplain' },
]

function EmptyData({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center px-4 bg-[var(--color-surface)] rounded-2xl border border-dashed border-[var(--color-border)]">
      <div className="w-11 h-11 rounded-2xl bg-[var(--color-neutral)] flex items-center justify-center text-[var(--color-secondary)] mb-2.5">
        <Ruler size={20} />
      </div>
      <p className="text-xs font-medium text-[var(--color-secondary)]">{message}</p>
    </div>
  )
}

function SectionLoader({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-7 h-7 border-2 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin" />
      <span className="text-xs text-[var(--color-secondary)] font-medium">{text}</span>
    </div>
  )
}

interface ShipmentDimensionsTabProps {
  dimsGudang: ShipmentDimensionGudang[]
  isLoadingGudang: boolean
  dimsPackingList: ShipmentDimensionPackingList[]
  isLoadingPackingList: boolean
  dimsKomplain: ShipmentDimensionKomplain[]
  isLoadingKomplain: boolean
}

export function ShipmentDimensionsTab({
  dimsGudang,
  isLoadingGudang,
  dimsPackingList,
  isLoadingPackingList,
  dimsKomplain,
  isLoadingKomplain,
}: ShipmentDimensionsTabProps) {
  const [subTab, setSubTab] = useState<DimSubTab>('packinglist')

  const counts: Record<DimSubTab, number> = {
    packinglist: dimsPackingList.length,
    gudang: dimsGudang.length,
    komplain: dimsKomplain.length,
  }

  const currentTotal = subTab === 'packinglist'
    ? calcTotalVolume(dimsPackingList)
    : subTab === 'gudang'
      ? calcTotalVolume(dimsGudang)
      : calcTotalVolume(dimsKomplain)

  return (
    <div className="flex flex-col gap-3.5 animate-in fade-in duration-200">
      {/* Sub-tab segmented bar */}
      <div className="flex gap-1 bg-[var(--color-neutral)] p-1 rounded-xl">
        {DIM_SUB_TABS.map(({ id, label }) => {
          const isActive = subTab === id
          const count = counts[id]
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSubTab(id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                isActive
                  ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-text)]'
              )}
            >
              <span>{label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    'text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums',
                    isActive
                      ? 'bg-[var(--color-neutral)] text-[var(--color-text)]'
                      : 'bg-[var(--color-border)] text-[var(--color-secondary)]'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Total Volume Chip Banner */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/15 rounded-xl">
        <div className="flex items-center gap-2">
          <Box size={14} className="text-[var(--color-primary)]" />
          <span className="text-xs font-semibold text-[var(--color-text)]">
            Total Volume {DIM_SUB_TABS.find((s) => s.id === subTab)?.label}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-sm sm:text-base font-bold text-[var(--color-primary)] tabular-nums">
            {currentTotal.toLocaleString('id-ID', { maximumFractionDigits: 4 })}
          </span>
          <span className="text-[11px] font-medium text-[var(--color-primary)]/60">m³</span>
        </div>
      </div>

      {/* Sub-tab items */}
      {subTab === 'packinglist' && (
        isLoadingPackingList ? <SectionLoader text="Memuat dimensi packing list..." /> :
        dimsPackingList.length === 0 ? <EmptyData message="Tidak ada data packing list." /> : (
          <div className="flex flex-col gap-2.5">
            {dimsPackingList.map((dim, idx) => (
              <DimItemCard
                key={`${dim.fdListCode}-${dim.fdListDCode}`}
                dim={dim}
                index={idx}
              />
            ))}
          </div>
        )
      )}

      {subTab === 'gudang' && (
        isLoadingGudang ? <SectionLoader text="Memuat dimensi gudang..." /> :
        dimsGudang.length === 0 ? <EmptyData message="Tidak ada data ukuran fisik gudang." /> : (
          <div className="flex flex-col gap-2.5">
            {dimsGudang.map((dim, idx) => (
              <DimItemCard
                key={`${dim.fdListCode}-${dim.fdListDCode}`}
                dim={dim}
                index={idx}
              />
            ))}
          </div>
        )
      )}

      {subTab === 'komplain' && (
        isLoadingKomplain ? <SectionLoader text="Memuat data komplain..." /> :
        dimsKomplain.length === 0 ? <EmptyData message="Tidak ada data dimensi komplain." /> : (
          <div className="flex flex-col gap-2.5">
            {dimsKomplain.map((dim, idx) => (
              <DimItemCard
                key={`${dim.fdListCode}-${dim.fdListDCode}`}
                dim={dim}
                index={idx}
              />
            ))}
          </div>
        )
      )}
    </div>
  )
}
