import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency, formatCompactRupiah, formatNumber } from '@/lib/utils'
import { CustomXAxisTick } from './ChartTick'
import { useTranslation } from '@/hooks/useTranslation'
import type { BillingByEmployeeDaily } from '../types/billing.types'

type MetricMode = 'count' | 'value'

const EMPLOYEE_LINE_COLORS = ['#1A1C1E', '#B8422E', '#1F6E5C', '#2A5C8A', '#C99A2E', '#6C7278']

interface EmployeeChartProps {
  data: BillingByEmployeeDaily['data']
  series: BillingByEmployeeDaily['series']
  isLoading: boolean
  isMobile: boolean
  metric: MetricMode
}

export function EmployeeChart({ data, series, isLoading, isMobile, metric }: EmployeeChartProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return <div className="h-[260px] sm:h-[320px] w-full bg-[var(--color-border)] animate-pulse rounded-lg" />
  }

  if (data.length === 0 || series.length === 0) {
    return (
      <div className="h-[180px] sm:h-[200px] flex items-center justify-center text-sm text-[var(--color-secondary)] text-center px-4">
        {t('billing.noData')}
      </div>
    )
  }

  return (
    <div className="h-[260px] sm:h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: isMobile ? 12 : 24, left: 10, bottom: 20 }}>
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
            cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }}
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              boxShadow: '0 12px 24px -8px rgba(26,28,30,0.16)',
              fontFamily: 'var(--font-body)',
            }}
            labelStyle={{ fontWeight: 600, color: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}
            formatter={(value: any, name: any) => [metric === 'value' ? formatCurrency(value) : value, name]}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px', fontFamily: 'var(--font-label)', letterSpacing: '0.02em' }}
          />
          {series.map((s, idx) => (
            <Line
              key={s.key}
              name={s.name}
              type="linear"
              dataKey={metric === 'value' ? `${s.key}__value` : s.key}
              stroke={EMPLOYEE_LINE_COLORS[idx % EMPLOYEE_LINE_COLORS.length]}
              strokeWidth={isMobile ? 2 : 2.5}
              dot={{
                r: isMobile ? 3 : 4,
                fill: '#FFFFFF',
                stroke: EMPLOYEE_LINE_COLORS[idx % EMPLOYEE_LINE_COLORS.length],
                strokeWidth: 2,
              }}
              activeDot={{
                r: 6,
                fill: '#FFFFFF',
                stroke: EMPLOYEE_LINE_COLORS[idx % EMPLOYEE_LINE_COLORS.length],
                strokeWidth: 2.5,
              }}
              isAnimationActive={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
