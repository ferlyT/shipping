import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { customersApi } from '../services/customers.service'
import { cn } from '@/lib/utils'

export interface CommodityMonthlyStat {
  month: number
  monthName: string
  value: number
  percentage: number
}

export interface CommodityStatItem {
  name: string
  color: string
  unit: string
  totalValue: number
  percentage: number
  monthly: CommodityMonthlyStat[]
}

export interface ModeCommodityStats {
  hasData: boolean
  totalResi: number
  commodities: CommodityStatItem[]
}

export interface CustomerCommodityStatsResult {
  year: number
  hasData: boolean
  sea: ModeCommodityStats
  air: ModeCommodityStats
}

interface CustomerCommodityTabProps {
  customerId: string
}

export function CustomerCommodityTab({ customerId }: CustomerCommodityTabProps) {
  const { data: stats, isLoading } = useQuery<CustomerCommodityStatsResult>({
    queryKey: ['customer-commodity-stats', customerId],
    queryFn: async () => {
      const res = await customersApi.commodityStats(customerId)
      return res.data.data
    },
    enabled: Boolean(customerId),
  })

  const [selectedMode, setSelectedMode] = useState<'sea' | 'air'>('sea')

  React.useEffect(() => {
    if (stats?.sea?.hasData && !stats?.air?.hasData) {
      setSelectedMode('sea')
    } else if (!stats?.sea?.hasData && stats?.air?.hasData) {
      setSelectedMode('air')
    }
  }, [stats])

  const currentModeStats = selectedMode === 'sea' ? stats?.sea : stats?.air
  const commodities = currentModeStats?.commodities || []

  // Recharts data format: 12 objects (1 per month) with commodity names as keys
  const chartData = useMemo(() => {
    if (!commodities.length) return []
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des']
    return months.map((monthName, idx) => {
      const row: Record<string, any> = { monthName, month: idx + 1 }
      for (const c of commodities) {
        const mData = c.monthly[idx]
        row[c.name] = mData ? mData.percentage : 0
        row[`${c.name}__val`] = mData ? mData.value : 0
        row[`${c.name}__unit`] = c.unit
      }
      return row
    })
  }, [commodities])

  if (isLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-[var(--color-secondary)]">Memuat data komoditas pelanggan...</span>
      </div>
    )
  }

  if (!stats || !stats.hasData) {
    return (
      <div className="py-10 text-center rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6">
        <h4 className="text-sm font-bold text-[var(--color-primary)]">Tidak Ada Data Komoditas</h4>
        <p className="text-xs text-[var(--color-secondary)] mt-1">
          Belum ada catatan pengiriman barang pada tahun {stats?.year || new Date().getFullYear()}.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      {/* SEKSI 1: DUA BAR PROPORSI (LAUT & UDARA) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
              Proporsi Komoditas ({stats.year})
            </h4>
            <p className="text-[11px] text-[var(--color-secondary)]">
              Klik bar laut atau udara untuk memfilter grafik tren bulanan di bawah.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* BAR LAUT */}
          {stats.sea.hasData && (
            <div
              onClick={() => setSelectedMode('sea')}
              className={cn(
                'p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3',
                selectedMode === 'sea'
                  ? 'bg-[var(--color-surface)] border-[var(--color-tertiary)] shadow-sm'
                  : 'bg-[var(--color-surface)]/60 border-[var(--color-border)] hover:border-[var(--color-border)]/80'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#4B9CFA]" />
                  <span className="text-xs font-bold text-[var(--color-primary)]">Kargo Laut</span>
                  {selectedMode === 'sea' && (
                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold border border-[var(--color-tertiary)] text-[var(--color-tertiary)]">
                      Aktif
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-mono text-[var(--color-secondary)]">
                  {stats.sea.totalResi} resi
                </span>
              </div>

              {/* Stacked Progress Bar */}
              <div className="h-3 w-full bg-[var(--color-neutral)] rounded-full overflow-hidden flex border border-[var(--color-border)]/60">
                {stats.sea.commodities.map((item, idx) => (
                  <div
                    key={idx}
                    style={{ width: `${Math.max(2, item.percentage)}%`, backgroundColor: item.color }}
                    title={`${item.name}: ${item.percentage}%`}
                    className="h-full transition-all"
                  />
                ))}
              </div>

              {/* Legend Komoditas Laut */}
              <div className="space-y-1.5 pt-1 border-t border-[var(--color-border)]/60">
                {stats.sea.commodities.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-medium text-[var(--color-primary)] truncate">{item.name}</span>
                    </div>
                    <span className="font-mono text-[var(--color-secondary)] shrink-0 ml-2">
                      {item.totalValue.toLocaleString('id-ID')} {item.unit} ({item.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BAR UDARA */}
          {stats.air.hasData && (
            <div
              onClick={() => setSelectedMode('air')}
              className={cn(
                'p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3',
                selectedMode === 'air'
                  ? 'bg-[var(--color-surface)] border-[var(--color-tertiary)] shadow-sm'
                  : 'bg-[var(--color-surface)]/60 border-[var(--color-border)] hover:border-[var(--color-border)]/80'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#E5A93C]" />
                  <span className="text-xs font-bold text-[var(--color-primary)]">Kargo Udara</span>
                  {selectedMode === 'air' && (
                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold border border-[var(--color-tertiary)] text-[var(--color-tertiary)]">
                      Aktif
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-mono text-[var(--color-secondary)]">
                  {stats.air.totalResi} resi
                </span>
              </div>

              {/* Stacked Progress Bar */}
              <div className="h-3 w-full bg-[var(--color-neutral)] rounded-full overflow-hidden flex border border-[var(--color-border)]/60">
                {stats.air.commodities.map((item, idx) => (
                  <div
                    key={idx}
                    style={{ width: `${Math.max(2, item.percentage)}%`, backgroundColor: item.color }}
                    title={`${item.name}: ${item.percentage}%`}
                    className="h-full transition-all"
                  />
                ))}
              </div>

              {/* Legend Komoditas Udara */}
              <div className="space-y-1.5 pt-1 border-t border-[var(--color-border)]/60">
                {stats.air.commodities.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-medium text-[var(--color-primary)] truncate">{item.name}</span>
                    </div>
                    <span className="font-mono text-[var(--color-secondary)] shrink-0 ml-2">
                      {item.totalValue.toLocaleString('id-ID')} {item.unit} ({item.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SEKSI 2: GRAFIK GARIS TREN BULANAN */}
      <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
              Tren Bulanan Komoditas
            </h4>
            <p className="text-[11px] text-[var(--color-secondary)]">
              Pergerakan persentase kargo {selectedMode === 'sea' ? 'laut' : 'udara'} per bulan (Jan–Des)
            </p>
          </div>

          {stats.sea.hasData && stats.air.hasData && (
            <div className="inline-flex items-center p-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/40 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSelectedMode('sea')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer',
                  selectedMode === 'sea'
                    ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-xs'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
              >
                Laut
              </button>
              <button
                type="button"
                onClick={() => setSelectedMode('air')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer',
                  selectedMode === 'air'
                    ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-xs'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
              >
                Udara
              </button>
            </div>
          )}
        </div>

        {/* Recharts Container */}
        <div className="h-[220px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} opacity={0.6} />
              <XAxis
                dataKey="monthName"
                tick={{ fontSize: 10.5, fill: 'var(--color-secondary)' }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10.5, fill: 'var(--color-secondary)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null
                  return (
                    <div className="rounded-lg p-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-lg text-xs space-y-1 z-50">
                      <div className="font-bold text-[var(--color-primary)] border-b border-[var(--color-border)] pb-1 mb-1">
                        Bulan {label} ({stats.year})
                      </div>
                      {payload
                        .filter((p: any) => p.value > 0)
                        .map((p: any, idx: number) => {
                          const unit = p.payload[`${p.dataKey}__unit`] || ''
                          const val = p.payload[`${p.dataKey}__val`] || 0
                          return (
                            <div key={idx} className="flex items-center justify-between gap-4">
                              <span className="flex items-center gap-1.5" style={{ color: p.color }}>
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                <span className="font-medium">{p.name}:</span>
                              </span>
                              <span className="font-mono font-semibold text-[var(--color-primary)]">
                                {p.value}% ({val.toLocaleString('id-ID')} {unit})
                              </span>
                            </div>
                          )
                        })}
                    </div>
                  )
                }}
              />
              {commodities.map((item) => (
                <Line
                  key={item.name}
                  type="monotone"
                  dataKey={item.name}
                  stroke={item.color}
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: item.color }}
                  activeDot={{ r: 4.5, strokeWidth: 1 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend di bawah chart */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--color-border)]/60">
          {commodities.map((item, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2.5 h-1 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[var(--color-primary)] font-medium">{item.name}</span>
              <span className="text-[var(--color-secondary)] font-mono">({item.percentage}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
