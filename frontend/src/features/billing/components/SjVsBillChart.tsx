import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ROUTES } from '@/lib/constants'
import { cn, formatNumber } from '@/lib/utils'
import type { SjVsBillPoint } from '../types/billing.types'
import { CustomXAxisTick } from './ChartTick'
import { useTranslation } from '@/hooks/useTranslation'

interface SjVsBillChartProps {
  data: SjVsBillPoint[]
  isLoading: boolean
  isMobile: boolean
  activeSjPic: string
  setActiveSjPic: (key: string) => void
  embedded?: boolean
}

export function SjVsBillChart({
  data,
  isLoading,
  isMobile,
  activeSjPic,
  setActiveSjPic,
  embedded = false,
}: SjVsBillChartProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const SJ_PIC_OPTIONS = [
    { key: 'all', name: t('billing.allPic'), roleDesc: t('billing.allPicDesc') },
    { key: 'yati_kiki', name: 'Yati & Kiki', roleDesc: t('billing.airTeam') },
    { key: 'thara', name: 'Thara', roleDesc: t('billing.seaTeam') },
    { key: 'ferly', name: 'Ferly', roleDesc: t('billing.seaTeam') },
    { key: 'rico', name: 'Rico', roleDesc: t('billing.seaTeam') },
  ]

  if (isLoading) {
    return <div className="h-[280px] sm:h-[340px] w-full skeleton-shimmer rounded-xl" />
  }

  if (data.length === 0) {
    return (
      <div className="h-[180px] sm:h-[200px] flex items-center justify-center text-sm text-[var(--color-secondary)] text-center px-4 font-[var(--font-body)]">
        {t('common.noData')}
      </div>
    )
  }

  const selectedPic = SJ_PIC_OPTIONS.find((p) => p.key === activeSjPic) || SJ_PIC_OPTIONS[0]
  const isYatiKiki = activeSjPic === 'yati_kiki'
  const isAll = activeSjPic === 'all'

  const totalSj = data.reduce((sum, row) => {
    const val = isAll
      ? (row.sj_all ?? row.sj)
      : isYatiKiki
      ? row.sj_yatiKiki
      : row[`sj_${activeSjPic}`]
    return sum + (Number(val) || 0)
  }, 0)

  const totalBill = data.reduce((sum, row) => {
    const val = isAll
      ? (row.bill_all ?? row.bill)
      : isYatiKiki
      ? row.bill_yatiKiki
      : row[`bill_${activeSjPic}`]
    return sum + (Number(val) || 0)
  }, 0)

  const totalUnbilled = data.reduce((sum, row) => {
    const val = isAll
      ? (row.unbilled_all ?? row.unbilled)
      : isYatiKiki
      ? row.unbilled_yatiKiki
      : row[`unbilled_${activeSjPic}`]
    return sum + (Number(val) || 0)
  }, 0)

  const gap = totalSj - totalBill

  function handleNavigateTarget() {
    if (activeSjPic === 'yati_kiki') {
      navigate(`${ROUTES.BILLING_TARGET}?type=udara`)
    } else if (activeSjPic === 'thara' || activeSjPic === 'ferly' || activeSjPic === 'rico') {
      navigate(`${ROUTES.BILLING_TARGET}?type=laut&pic=${activeSjPic}`)
    } else {
      navigate(ROUTES.BILLING_TARGET)
    }
  }

  const content = (
    <div className="space-y-3">
      {/* Header Info & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-[var(--color-border)] gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* PIC Selector Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none shrink-0">
            {SJ_PIC_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setActiveSjPic(opt.key)}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-semibold rounded-lg whitespace-nowrap transition-all cursor-pointer",
                  activeSjPic === opt.key
                    ? "bg-[var(--color-primary)] text-[var(--color-surface)] shadow-2xs"
                    : "bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)]"
                )}
              >
                {opt.name}
              </button>
            ))}
          </div>

          <span className="text-[10px] text-[var(--color-secondary)] bg-[var(--color-neutral)] px-1.5 py-0.5 rounded border border-[var(--color-border)] font-medium">
            {selectedPic.roleDesc}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-[var(--font-label)] flex-wrap">
          <div className="text-[11px] text-[var(--color-secondary)] font-mono flex items-center gap-2">
            <span>📄 {t('billing.sjReceived')}: <strong className="text-sky-600 dark:text-sky-400">{formatNumber(totalSj)}</strong></span>
            <span className="text-[var(--color-border)]">•</span>
            <span>🧾 {t('billing.billCreated')}: <strong className="text-rose-600 dark:text-rose-400">{formatNumber(totalBill)}</strong></span>
          </div>

          <button
            type="button"
            onClick={handleNavigateTarget}
            title={t('billing.viewTargetBillFull')}
            className={cn(
              "px-2 py-0.5 text-[11px] font-bold rounded-md whitespace-nowrap cursor-pointer hover:opacity-85 transition-opacity",
              gap > 0
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                : gap < 0
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : "bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)]"
            )}
          >
            {gap > 0 ? `+${formatNumber(gap)} ${t('billing.unbilled')}` : gap < 0 ? `${formatNumber(gap)} ${t('billing.surplusBill')}` : t('nav.targetBill')}
          </button>
        </div>
      </div>

      {/* Legend Ringkas & Kontras */}
      <div className="flex items-center gap-4 text-xs font-semibold flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
          <span className="w-3.5 h-1 bg-sky-500 rounded-full inline-block" />
          <span>📄 {t('billing.sjReceived')}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
          <span className="w-3.5 h-1 border-t-2 border-dashed border-rose-500 inline-block" />
          <span>🧾 {t('billing.billCreated')}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
          <span className="w-3.5 h-1 bg-amber-500 rounded-full inline-block" />
          <span className="font-bold">⏳ +{formatNumber(totalUnbilled)} {t('billing.unbilled')}</span>
        </span>
      </div>

      {/* Chart Canvas */}
      <div className="h-[260px] sm:h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: isMobile ? 12 : 24, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--color-border)" opacity={0.6} />
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
              width={isMobile ? 36 : 46}
              tickMargin={6}
              allowDecimals={false}
              tickFormatter={(val) => formatNumber(val)}
            />
            <Tooltip
              cursor={{ stroke: 'var(--color-border)', strokeWidth: 1.5, strokeDasharray: '4 4' }}
              contentStyle={{
                borderRadius: '10px',
                border: '1px solid var(--color-border)',
                boxShadow: '0 8px 16px -4px rgba(26,28,30,0.18)',
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-primary)',
              }}
              labelStyle={{ fontWeight: 600, color: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}
            />
            {isAll ? (
              <>
                <Line
                  name={`📄 ${t('billing.sjReceived')} (Total)`}
                  type="monotone"
                  dataKey="sj_all"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 1.5, stroke: 'var(--color-surface)', fill: '#0284c7' }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--color-surface)' }}
                  isAnimationActive={false}
                />
                <Line
                  name={`🧾 ${t('billing.billCreated')} (Total)`}
                  type="monotone"
                  dataKey="bill_all"
                  stroke="#e11d48"
                  strokeWidth={2.5}
                  strokeDasharray="5 4"
                  dot={{ r: 3, strokeWidth: 1.5, stroke: 'var(--color-surface)', fill: '#e11d48' }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--color-surface)' }}
                  isAnimationActive={false}
                />
                <Line
                  name={`⏳ ${t('billing.unbilled')} (Total)`}
                  type="monotone"
                  dataKey="unbilled_all"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 1.5, stroke: 'var(--color-surface)', fill: '#d97706' }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--color-surface)' }}
                  isAnimationActive={false}
                />
              </>
            ) : isYatiKiki ? (
              <>
                <Line
                  name={`📄 ${t('billing.sjReceived')} (Total)`}
                  type="monotone"
                  dataKey="sj_yatiKiki"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 1.5, stroke: 'var(--color-surface)', fill: '#0284c7' }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--color-surface)' }}
                  isAnimationActive={false}
                />
                <Line
                  name={`🧾 Yati - ${t('billing.billCreated')}`}
                  type="monotone"
                  dataKey="bill_yati"
                  stroke="#e11d48"
                  strokeWidth={2.5}
                  strokeDasharray="5 4"
                  dot={{ r: 3, strokeWidth: 1.5, stroke: 'var(--color-surface)', fill: '#e11d48' }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--color-surface)' }}
                  isAnimationActive={false}
                />
                <Line
                  name={`🧾 Kiki - ${t('billing.billCreated')}`}
                  type="monotone"
                  dataKey="bill_kiki"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  dot={{ r: 3, strokeWidth: 1.5, stroke: 'var(--color-surface)', fill: '#d97706' }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--color-surface)' }}
                  isAnimationActive={false}
                />
                <Line
                  name={`⏳ ${t('billing.unbilled')} (Yati & Kiki)`}
                  type="monotone"
                  dataKey="unbilled_yatiKiki"
                  stroke="#059669"
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 1.5, stroke: 'var(--color-surface)', fill: '#059669' }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--color-surface)' }}
                  isAnimationActive={false}
                />
              </>
            ) : (
              <>
                <Line
                  name={`📄 ${t('billing.sjReceived')}`}
                  type="monotone"
                  dataKey={`sj_${activeSjPic}`}
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 1.5, stroke: 'var(--color-surface)', fill: '#0284c7' }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--color-surface)' }}
                  isAnimationActive={false}
                />
                <Line
                  name={`🧾 ${t('billing.billCreated')}`}
                  type="monotone"
                  dataKey={`bill_${activeSjPic}`}
                  stroke="#e11d48"
                  strokeWidth={2.5}
                  strokeDasharray="5 4"
                  dot={{ r: 3, strokeWidth: 1.5, stroke: 'var(--color-surface)', fill: '#e11d48' }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--color-surface)' }}
                  isAnimationActive={false}
                />
                <Line
                  name={`⏳ ${t('billing.unbilled')}`}
                  type="monotone"
                  dataKey={`unbilled_${activeSjPic}`}
                  stroke="#d97706"
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 1.5, stroke: 'var(--color-surface)', fill: '#d97706' }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--color-surface)' }}
                  isAnimationActive={false}
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )

  if (embedded) {
    return content
  }

  return (
    <div className="p-3 sm:p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs">
      {content}
    </div>
  )
}

