import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ROUTES } from '@/lib/constants'
import type { SjVsBillPoint } from '../types/billing.types'
import { CustomXAxisTick } from './ChartTick'
import { useTranslation } from '@/hooks/useTranslation'

interface SjVsBillChartProps {
  data: SjVsBillPoint[]
  isLoading: boolean
  isMobile: boolean
  activeSjPic: string
  setActiveSjPic: (key: string) => void
}

export function SjVsBillChart({ data, isLoading, isMobile, activeSjPic, setActiveSjPic }: SjVsBillChartProps) {
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
    return <div className="h-[280px] sm:h-[340px] w-full bg-[var(--color-border)] animate-pulse rounded-xl" />
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

  const totalSj = data.reduce((sum, row) => sum + (Number(row.sj) || 0), 0)
  const totalBill = data.reduce((sum, row) => sum + (Number(row.bill) || 0), 0)
  const totalUnbilled = Math.max(0, totalSj - totalBill)

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

  return (
    <div>
      {/* PIC Selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none shrink-0 mb-4 sm:mb-6">
        {SJ_PIC_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setActiveSjPic(opt.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              activeSjPic === opt.key
                ? 'bg-[#1A1C1E] text-white shadow-xs'
                : 'bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)] hover:bg-gray-200 hover:text-[var(--color-primary)]'
            }`}
          >
            {opt.name}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs flex flex-col justify-between">
        {/* Chart Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-[var(--color-border)] gap-3">
          <div className="flex items-center gap-2.5">
            <h3 className="font-semibold text-base sm:text-lg text-[var(--color-primary)] font-[var(--font-display)]">
              {selectedPic.name}
            </h3>
            <span className="text-xs text-[var(--color-secondary)] bg-[var(--color-neutral)] px-2 py-0.5 rounded border border-[var(--color-border)]">
              {selectedPic.roleDesc}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-[var(--font-label)] flex-wrap">
            <div className="text-xs text-[var(--color-secondary)]">
              <span className="font-semibold">{t('billing.sjReceived')}: <span className="font-bold text-[#1a365d]">{totalSj.toLocaleString('id-ID')}</span></span>
              <span className="text-[var(--color-border)] mx-2">|</span>
              <span className="font-semibold">{t('billing.billCreated')}: <span className="font-bold text-[#9b2c2c]">{totalBill.toLocaleString('id-ID')}</span></span>
            </div>

            <button
              onClick={handleNavigateTarget}
              title="Lihat Target Bill selengkapnya"
              className={`px-3 py-1 text-xs font-bold rounded-md whitespace-nowrap cursor-pointer hover:opacity-85 transition-opacity ${
                gap > 0
                  ? 'bg-amber-50 text-amber-700 border border-amber-200/80 hover:bg-amber-100'
                  : gap < 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {gap > 0 ? `+${gap} Belum Bill` : gap < 0 ? `${gap} Surplus Bill` : 'Target Bill'}
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-semibold mb-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-[#1a365d] rounded-full inline-block" />
            <span className="text-[#1a365d]">{t('billing.sjReceived')}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-[#9b2c2c] inline-block" />
            <span className="text-[#9b2c2c]">{t('billing.billCreated')}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-[#1F6E5C] rounded-full inline-block" />
            <span className="font-bold text-amber-700">+{totalUnbilled.toLocaleString('id-ID')} {t('billing.unbilled')}</span>
          </span>
        </div>

        {/* Chart */}
        <div className="h-[260px] sm:h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: isMobile ? 12 : 24, left: 10, bottom: 20 }}>
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
              />
              <Tooltip
                cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 8px 16px -4px rgba(26,28,30,0.12)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                }}
                labelStyle={{ fontWeight: 600, color: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}
              />
              {isAll ? (
                <>
                  <Line name={`${t('billing.sjReceived')} (Total)`} type="monotone" dataKey="sj_all" stroke="#2A5C8A" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 1.5, stroke: '#FFFFFF', fill: '#2A5C8A' }} activeDot={{ r: 5, strokeWidth: 2, stroke: '#FFFFFF' }} isAnimationActive={false} />
                  <Line name={`${t('billing.billCreated')} (Total)`} type="monotone" dataKey="bill_all" stroke="#B8422E" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 3, strokeWidth: 1.5, stroke: '#FFFFFF', fill: '#B8422E' }} activeDot={{ r: 5, strokeWidth: 2, stroke: '#FFFFFF' }} isAnimationActive={false} />
                  <Line name={`${t('billing.unbilled')} (Total)`} type="monotone" dataKey="unbilled_all" stroke="#1F6E5C" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 1.5, stroke: '#FFFFFF', fill: '#1F6E5C' }} activeDot={{ r: 5, strokeWidth: 2, stroke: '#FFFFFF' }} isAnimationActive={false} />
                </>
              ) : isYatiKiki ? (
                <>
                  <Line name={`${t('billing.sjReceived')} (Total)`} type="monotone" dataKey="sj_yatiKiki" stroke="#2A5C8A" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 1.5, stroke: '#FFFFFF', fill: '#2A5C8A' }} activeDot={{ r: 5, strokeWidth: 2, stroke: '#FFFFFF' }} isAnimationActive={false} />
                  <Line name={`Yati - ${t('billing.billCreated')}`} type="monotone" dataKey="bill_yati" stroke="#B8422E" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 3, strokeWidth: 1.5, stroke: '#FFFFFF', fill: '#B8422E' }} activeDot={{ r: 5, strokeWidth: 2, stroke: '#FFFFFF' }} isAnimationActive={false} />
                  <Line name={`Kiki - ${t('billing.billCreated')}`} type="monotone" dataKey="bill_kiki" stroke="#C99A2E" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 3, strokeWidth: 1.5, stroke: '#FFFFFF', fill: '#C99A2E' }} activeDot={{ r: 5, strokeWidth: 2, stroke: '#FFFFFF' }} isAnimationActive={false} />
                  <Line name={`${t('billing.unbilled')} (Yati & Kiki)`} type="monotone" dataKey="unbilled_yatiKiki" stroke="#1F6E5C" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 1.5, stroke: '#FFFFFF', fill: '#1F6E5C' }} activeDot={{ r: 5, strokeWidth: 2, stroke: '#FFFFFF' }} isAnimationActive={false} />
                </>
              ) : (
                <>
                  <Line name={t('billing.sjReceived')} type="monotone" dataKey={`sj_${activeSjPic}`} stroke="#2A5C8A" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 1.5, stroke: '#FFFFFF', fill: '#2A5C8A' }} activeDot={{ r: 5, strokeWidth: 2, stroke: '#FFFFFF' }} isAnimationActive={false} />
                  <Line name={t('billing.billCreated')} type="monotone" dataKey={`bill_${activeSjPic}`} stroke="#B8422E" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 3, strokeWidth: 1.5, stroke: '#FFFFFF', fill: '#B8422E' }} activeDot={{ r: 5, strokeWidth: 2, stroke: '#FFFFFF' }} isAnimationActive={false} />
                  <Line name={t('billing.unbilled')} type="monotone" dataKey={`unbilled_${activeSjPic}`} stroke="#1F6E5C" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 1.5, stroke: '#FFFFFF', fill: '#1F6E5C' }} activeDot={{ r: 5, strokeWidth: 2, stroke: '#FFFFFF' }} isAnimationActive={false} />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
