import { Receipt, Package, Weight, Box } from 'lucide-react'
import type { ShipmentKpis } from '@/types/shipments'

interface ShipmentKpiCardsProps {
  kpis?: ShipmentKpis
  isLoading: boolean
}

export function ShipmentKpiCards({ kpis, isLoading }: ShipmentKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Resi */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
        <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
          <Receipt className="w-24 h-24 text-[var(--color-primary)]" />
        </div>
        <div className="flex items-center gap-2 text-[var(--color-secondary)]">
          <Receipt className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-bold uppercase tracking-wider">Total Resi</span>
        </div>
        <div className="mt-3">
          {isLoading ? (
            <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
          ) : (
            <h3 className="text-3xl font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
              {Number(kpis?.totalResi || 0).toLocaleString('id-ID')}
            </h3>
          )}
        </div>
      </div>

      {/* Total Packages */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
        <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
          <Package className="w-24 h-24 text-emerald-500" />
        </div>
        <div className="flex items-center gap-2 text-[var(--color-secondary)]">
          <Package className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-bold uppercase tracking-wider">Total Packages</span>
        </div>
        <div className="mt-3">
          {isLoading ? (
            <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
          ) : (
            <h3 className="text-3xl font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
              {Number(kpis?.totalPackages || 0).toLocaleString('id-ID')}
            </h3>
          )}
        </div>
      </div>

      {/* Total Berat */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
        <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
          <Weight className="w-24 h-24 text-purple-500" />
        </div>
        <div className="flex items-center gap-2 text-[var(--color-secondary)]">
          <Weight className="w-4 h-4 text-purple-500" />
          <span className="text-xs font-bold uppercase tracking-wider">Total Berat</span>
        </div>
        <div className="mt-3 flex items-baseline gap-1">
          {isLoading ? (
            <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
          ) : (
            <h3 className="text-3xl font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
              {Number(kpis?.totalBerat || 0).toLocaleString('id-ID')}
            </h3>
          )}
        </div>
      </div>

      {/* Total Volume */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
        <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
          <Box className="w-24 h-24 text-rose-500" />
        </div>
        <div className="flex items-center gap-2 text-[var(--color-secondary)]">
          <Box className="w-4 h-4 text-rose-500" />
          <span className="text-xs font-bold uppercase tracking-wider">Total Volume</span>
        </div>
        <div className="mt-3 flex items-baseline gap-1">
          {isLoading ? (
            <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
          ) : (
            <>
              <h3 className="text-3xl font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                {Number(kpis?.totalVolume || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}
              </h3>
              <span className="text-sm font-bold text-[var(--color-secondary)] ml-1">m³</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
