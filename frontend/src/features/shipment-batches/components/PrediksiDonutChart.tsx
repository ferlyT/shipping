import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Plane, Ship } from 'lucide-react'
import type { PrediksiExitItem } from './PredictedExitModal'

const renderLegend = () => (
  <div className="flex items-center justify-center gap-4 pt-2 text-xs font-semibold">
    <span className="inline-flex items-center gap-1.5 bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-md border border-sky-200/60">
      <Plane className="w-3.5 h-3.5 text-sky-500 shrink-0" />
      <span className="text-[10px] text-sky-600 font-bold uppercase">Ring Luar</span>
    </span>
    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-md border border-emerald-200/60">
      <Ship className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
      <span className="text-[10px] text-emerald-600 font-bold uppercase">Ring Dalam</span>
    </span>
  </div>
)

export function PrediksiDonutChart({
  prediksiExitList = [],
  isLoading,
  onClickTerlambat,
}: {
  terlambat?: number
  segera?: number
  dekat?: number
  prediksiExitList?: PrediksiExitItem[]
  isLoading: boolean
  onClickTerlambat: () => void
}) {


  const { airData, seaData, totalCount } = useMemo(() => {
    const airList = prediksiExitList.filter(item => item.fdListType === 1)
    const seaList = prediksiExitList.filter(item => item.fdListType === 2)

    const airTerlambat = airList.filter(item => item.category === 'terlambat').length
    const airSegera = airList.filter(item => item.category === 'segera').length
    const airDekat = airList.filter(item => item.category === 'dekat').length

    const seaTerlambat = seaList.filter(item => item.category === 'terlambat').length
    const seaSegera = seaList.filter(item => item.category === 'segera').length
    const seaDekat = seaList.filter(item => item.category === 'dekat').length

    const airData = [
      { mode: 'Air', category: 'Terlambat', value: airTerlambat, color: '#F43F5E' },
      { mode: 'Air', category: 'Segera', value: airSegera, color: '#F59E0B' },
      { mode: 'Air', category: 'Aman', value: airDekat, color: '#10B981' },
    ].filter(d => d.value > 0)

    const seaData = [
      { mode: 'Sea', category: 'Terlambat', value: seaTerlambat, color: '#FB7185' },
      { mode: 'Sea', category: 'Segera', value: seaSegera, color: '#FBBF24' },
      { mode: 'Sea', category: 'Aman', value: seaDekat, color: '#34D399' },
    ].filter(d => d.value > 0)

    const total = prediksiExitList.length

    return { airData, seaData, totalCount: total }
  }, [prediksiExitList])

  if (isLoading) {
    return (
      <div className="h-[220px] sm:h-[260px] flex items-center justify-center">
        <div className="w-28 h-28 rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)] animate-spin opacity-30" />
      </div>
    )
  }

  if (totalCount === 0) {
    return (
      <div className="h-[220px] sm:h-[260px] flex flex-col items-center justify-center gap-2 text-center px-6">
        <span className="text-3xl">✅</span>
        <p className="text-sm text-[var(--color-secondary)]">Semua batch dalam kondisi aman</p>
      </div>
    )
  }

  return (
    <div className="h-[220px] sm:h-[260px] w-full px-2 pb-4 pt-3 flex flex-col">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {/* Ring Luar: Air (Udara) */}
          <Pie
            data={airData}
            cx="50%"
            cy="44%"
            innerRadius="60%"
            outerRadius="78%"
            paddingAngle={3}
            dataKey="value"
            onClick={(entry: any) => {
              const cat = entry?.category ?? entry?.payload?.category
              if (cat === 'Terlambat' || cat === 'Segera') onClickTerlambat()
            }}
            style={{ cursor: 'pointer' }}
          >
            {airData.map((entry, index) => (
              <Cell key={`air-${index}`} fill={entry.color} stroke="none" />
            ))}
          </Pie>

          {/* Ring Dalam: Sea (Laut) */}
          <Pie
            data={seaData}
            cx="50%"
            cy="44%"
            innerRadius="38%"
            outerRadius="54%"
            paddingAngle={3}
            dataKey="value"
            onClick={(entry: any) => {
              const cat = entry?.category ?? entry?.payload?.category
              if (cat === 'Terlambat' || cat === 'Segera') onClickTerlambat()
            }}
            style={{ cursor: 'pointer' }}
          >
            {seaData.map((entry, index) => (
              <Cell key={`sea-${index}`} fill={entry.color} stroke="none" />
            ))}
          </Pie>

          {/* Teks Tengah: Total Batch */}
          <text
            x="50%"
            y="40%"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ pointerEvents: 'none', fontFamily: 'var(--font-display)', fontSize: '22px', fill: 'var(--color-primary)', fontWeight: 700 }}
          >
            {totalCount}
          </text>
          <text
            x="50%"
            y="49%"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ pointerEvents: 'none', fontFamily: 'var(--font-label)', fontSize: '9px', fill: 'var(--color-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            BATCH
          </text>

          <Tooltip
            contentStyle={{
              borderRadius: '10px',
              border: '1px solid var(--color-border)',
              boxShadow: '0 8px 24px -8px rgba(0,0,0,0.15)',
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
            }}
            formatter={(value: any, _name: any, item: any) => {
              const payload = item?.payload
              const modeIcon = payload?.mode === 'Air' ? '✈️' : '🚢'
              return [`${value} batch (${payload?.category})`, modeIcon]
            }}
          />

          <Legend content={renderLegend} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
