import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Plane, Ship } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import type { ExitHistoryDay } from '../services/marking.service'

const renderLegend = () => (
  <div className="flex items-center justify-center gap-4 pt-2 text-xs font-semibold">
    <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 px-2 py-0.5 rounded-md border border-sky-200/60">
      <Plane className="w-3.5 h-3.5 text-sky-500 shrink-0" />
    </span>
    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200/60">
      <Ship className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
    </span>
  </div>
)

export function ExitBarChart({
  historyMap,
  isLoading,
}: {
  historyMap: Record<string, ExitHistoryDay>
  isLoading: boolean
}) {
  const { t } = useTranslation()

  const chartData = useMemo(() => {
    return Object.entries(historyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, day]) => {
        const items = day?.items || []
        const air = items.filter((i: any) => i.fdListType === 1).length
        const sea = items.filter((i: any) => i.fdListType === 2).length
        return {
          label: dateKey.slice(8), // "01", "02", dst
          air,
          sea,
          total: day?.count || (air + sea),
          dateKey,
        }
      })
  }, [historyMap])

  if (isLoading) {
    return (
      <div className="h-[220px] sm:h-[260px] w-full animate-pulse bg-[var(--color-border)] opacity-40 m-4 rounded-lg" style={{ width: 'calc(100% - 2rem)' }} />
    )
  }

  if (chartData.length === 0 || chartData.every(d => d.total === 0)) {
    return (
      <div className="h-[220px] sm:h-[260px] flex items-center justify-center text-sm text-[var(--color-secondary)] text-center px-6">
        {t('common.noData')}
      </div>
    )
  }

  const maxVal = Math.max(...chartData.map(d => d.total))

  return (
    <div className="h-[220px] sm:h-[260px] w-full px-2 pb-4 pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--color-border)" opacity={0.6} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: 'var(--color-secondary)', fontFamily: 'var(--font-label)' }}
            interval={3}
            dy={6}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: 'var(--color-secondary)', fontFamily: 'var(--font-label)' }}
            allowDecimals={false}
            domain={[0, maxVal > 0 ? Math.ceil(maxVal * 1.2) : 5]}
            width={24}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-neutral)', opacity: 0.6 }}
            contentStyle={{
              borderRadius: '10px',
              border: '1px solid var(--color-border)',
              boxShadow: '0 8px 24px -8px rgba(0,0,0,0.15)',
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
            }}
            labelFormatter={(label) => `Tgl ${label}`}
            formatter={(value: any, name: any) => [
              `${value} batch`,
              name === 'air' ? '✈️' : '🚢'
            ]}
          />
          <Legend content={renderLegend} />
          <Bar dataKey="air" name="air" stackId="exitStack" fill="#0EA5E9" radius={[0, 0, 0, 0]} maxBarSize={28} />
          <Bar dataKey="sea" name="sea" stackId="exitStack" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
