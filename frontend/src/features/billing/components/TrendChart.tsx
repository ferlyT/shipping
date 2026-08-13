import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency, formatCompactRupiah, formatNumber } from '@/lib/utils'
import type { BillingTrendPoint } from '../types/billing.types'
import { CustomXAxisTick } from './ChartTick'

type MetricMode = 'count' | 'value'

interface TrendChartProps {
  data: BillingTrendPoint[]
  isLoading: boolean
  emptyMessage: string
  isMobile: boolean
  metric: MetricMode
}

export function TrendChart({ data, isLoading, emptyMessage, isMobile, metric }: TrendChartProps) {
  if (isLoading) {
    return <div className="h-[260px] sm:h-[320px] w-full bg-[var(--color-border)] animate-pulse rounded-lg" />
  }

  if (data.length === 0) {
    return (
      <div className="h-[180px] sm:h-[200px] flex items-center justify-center text-sm text-[var(--color-secondary)] text-center px-4 font-[var(--font-body)]">
        {emptyMessage}
      </div>
    )
  }

  const isCount = metric === 'count'

  return (
    <div className="h-[260px] sm:h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 5, right: isMobile ? 8 : 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="trendBarFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-tertiary)" stopOpacity={0.95} />
              <stop offset="100%" stopColor="var(--color-tertiary)" stopOpacity={0.35} />
            </linearGradient>
            <linearGradient id="trendAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.16} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--color-border)" opacity={0.7} />
          <XAxis
            dataKey={(row: any) => row.date || row.label}
            axisLine={false}
            tickLine={false}
            tick={<CustomXAxisTick />}
            interval={isMobile ? 'preserveStartEnd' : 'equidistantPreserveStart'}
            dy={5}
            height={40}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: isMobile ? 10 : 11, fill: 'var(--color-secondary)', fontFamily: 'var(--font-label)' }}
            width={metric === 'value' ? (isMobile ? 55 : 75) : (isMobile ? 36 : 46)}
            tickMargin={6}
            tickFormatter={(val) => (metric === 'count' ? formatNumber(val) : formatCompactRupiah(val))}
          />
          <Tooltip
            cursor={isCount ? { fill: 'var(--color-neutral)' } : { stroke: 'var(--color-border)', strokeWidth: 1 }}
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              boxShadow: '0 12px 24px -8px rgba(26,28,30,0.16)',
              fontFamily: 'var(--font-body)',
            }}
            labelStyle={{ fontWeight: 600, color: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}
            formatter={(value: any, name: any) => [isCount ? value : formatCurrency(value), name]}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px', fontFamily: 'var(--font-label)', letterSpacing: '0.02em' }}
          />
          {isCount ? (
            <Bar name="Jumlah Bill" dataKey="totalBill" fill="url(#trendBarFill)" radius={[6, 6, 0, 0]} barSize={isMobile ? 14 : 20} />
          ) : (
            <>
              <Area name="Total Tagihan" type="monotone" dataKey="totalTagihan" stroke="none" fill="url(#trendAreaFill)" legendType="none" />
              <Line
                name="Total Tagihan"
                type="monotone"
                dataKey="totalTagihan"
                stroke="var(--color-primary)"
                strokeWidth={isMobile ? 2 : 2.5}
                dot={false}
                connectNulls
                activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--color-surface)', fill: 'var(--color-primary)' }}
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
