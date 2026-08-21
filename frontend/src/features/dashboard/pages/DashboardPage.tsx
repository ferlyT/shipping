import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, FileText, Truck, Box, ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { dashboardApi } from '../services/dashboard.service'
import { useToastStore } from '@/stores/toastStore'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ROUTES } from '@/lib/constants'
import { formatDate, formatCurrency, formatNumber, formatDecimal } from '@/lib/utils'
import type { DashboardStats } from '../types/dashboard.types'
import { useTranslation } from '@/hooks/useTranslation'

export default function DashboardPage() {
  const { t } = useTranslation()
  const { addToast } = useToastStore()
  const [data, setData] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      const res = await dashboardApi.stats()
      setData(res.data.data)
    } catch (err: unknown) {
      addToast({
        message: err instanceof Error ? err.message : 'Gagal memuat dashboard',
        type: 'error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) return <LoadingSpinner message="Memuat data operasional..." />
  if (!data) return null

  const statCards = [
    {
      title: 'Total Pelanggan',
      value: data.metrics.totalCustomers,
      icon: Users,
      accentColor: '#3B82F6',
      trend: data.trends.customers,
      link: ROUTES.CUSTOMERS,
    },
    {
      title: 'Total Invoices',
      value: data.metrics.totalInvoices,
      subValue: formatCurrency(data.metrics.totalInvoiceAmount),
      icon: FileText,
      accentColor: '#10B981',
      trend: data.trends.invoices,
      link: ROUTES.BILLING,
    },
    {
      title: 'Surat Jalan (DO)',
      value: data.metrics.totalDeliveryOrders,
      icon: Truck,
      accentColor: '#F59E0B',
      trend: data.trends.deliveryOrders,
      link: ROUTES.DELIVERY_ORDERS,
    },
    {
      title: 'Shipments / Resi',
      value: data.metrics.totalShipments,
      icon: Box,
      accentColor: '#8B5CF6',
      trend: data.trends.shipments,
      link: ROUTES.SHIPMENTS,
    },
  ]

  return (
    <div className="p-4 sm:p-6 w-full space-y-6 animate-fadeIn pb-24">
      <PageHeader
        title="Overview Dashboard"
        subtitle="Ringkasan eksekutif operasional mshipping"
        breadcrumbs={[
          { label: t('module.overview'), path: ROUTES.DASHBOARD },
          { label: t('nav.dashboard') },
        ]}
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <Link key={idx} to={stat.link} className="no-underline">
            <Card variant="accent" accentColor={stat.accentColor} className="h-full hover:shadow-md transition-all">
              <Card.Body className="p-5 flex flex-col justify-between h-full gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-secondary)]">{stat.title}</span>
                  <div className="p-2 rounded-xl bg-[var(--color-neutral)]" style={{ color: stat.accentColor }}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-3xl font-bold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums tracking-tight">
                    {stat.value.toLocaleString('id-ID')}
                  </h3>

                  <div>
                    {stat.trend ? (
                      <div className={`flex items-center gap-1 text-xs font-medium ${stat.trend.type === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {stat.trend.type === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        <span>{stat.trend.value} {stat.trend.label}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
                        <span>Data tren belum tersedia</span>
                      </div>
                    )}
                  </div>
                </div>

                {stat.subValue && (
                  <div className="border-t border-[var(--color-border)] pt-2 text-xs font-semibold text-emerald-700">
                    {stat.subValue}
                  </div>
                )}
              </Card.Body>
            </Card>
          </Link>
        ))}
      </div>

      {/* Chart Section */}
      <Card variant="bordered">
        <Card.Header
          title="Tren Transaksi 12 Bulan Terakhir"
          subtitle="Perbandingan grafik volume Invoice, Surat Jalan, dan Shipments"
        />
        <Card.Body className="p-6">
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'var(--color-secondary)' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'var(--color-secondary)' }}
                  tickFormatter={(value) => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value)}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 8px 16px rgba(0, 0, 0, 0.08)' }}
                  labelStyle={{ fontWeight: 'bold', color: 'var(--color-primary)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '15px' }} />
                <Line name="Invoices" type="monotone" dataKey="invoices" stroke="#10B981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                <Line name="Surat Jalan" type="monotone" dataKey="deliveryOrders" stroke="#F59E0B" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                <Line name="Shipments" type="monotone" dataKey="shipments" stroke="#8B5CF6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card.Body>
      </Card>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="bordered">
          <Card.Header
            title="Invoice Terbaru"
            icon={<FileText className="w-4 h-4 text-emerald-600" />}
            action={
              <Link to={ROUTES.BILLING} className="text-xs font-semibold text-[var(--color-tertiary)] hover:underline flex items-center gap-1">
                Lihat Semua <ArrowRight className="w-3 h-3" />
              </Link>
            }
          />
          <Card.Body className="p-0 divide-y divide-[var(--color-border)]">
            {data.recentActivity.invoices.length > 0 ? (
              data.recentActivity.invoices.map((invoice) => (
                <div key={invoice.fdInvNo} className="p-4 hover:bg-[var(--color-neutral)]/50 transition-colors flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-sm text-[var(--color-primary)]">{invoice.customer?.fdCustName || invoice.fdCustCode || 'Unknown Customer'}</div>
                    <div className="text-xs text-[var(--color-secondary)] font-mono mt-0.5">{invoice.fdInvNo} • {formatDate(invoice.fdInvDate)}</div>
                  </div>
                  <div className="text-right font-semibold text-sm text-emerald-700">
                    {formatCurrency(invoice.fdJumlah1)}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="Tidak ada invoice terbaru" className="m-4" />
            )}
          </Card.Body>
        </Card>

        <Card variant="bordered">
          <Card.Header
            title="Surat Jalan Terbaru"
            icon={<Truck className="w-4 h-4 text-amber-600" />}
            action={
              <Link to={ROUTES.DELIVERY_ORDERS} className="text-xs font-semibold text-[var(--color-tertiary)] hover:underline flex items-center gap-1">
                Lihat Semua <ArrowRight className="w-3 h-3" />
              </Link>
            }
          />
          <Card.Body className="p-0 divide-y divide-[var(--color-border)]">
            {data.recentActivity.deliveryOrders.length > 0 ? (
              data.recentActivity.deliveryOrders.map((doItem) => {
                const markingCode = doItem.entryList?.fdMarkingCode
                const markingNo = doItem.entryList?.fdMarkingNo
                const satuan = doItem.entryList?.fdSatuan || doItem.fdSatuan || 'Pack'
                const packQty = doItem.fdJmlPackSJ != null ? Number(doItem.fdJmlPackSJ) : null
                const berat = doItem.fdJmlBeratSJ != null ? Number(doItem.fdJmlBeratSJ) : null

                return (
                  <div key={doItem.fdSJNo} className="p-4 hover:bg-[var(--color-neutral)]/50 transition-colors space-y-1">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[var(--color-primary)] font-mono">{doItem.fdSJNo}</span>
                        {(markingCode || markingNo) && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase">
                            {markingCode} {markingNo ? `#${markingNo}` : ''}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[var(--color-secondary)] truncate max-w-[160px] font-medium" title={doItem.fdCustNameSJ || doItem.fdCustCode || undefined}>
                        {doItem.fdCustNameSJ || doItem.fdCustCode || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-[var(--color-secondary)]">
                      <span>
                        {doItem.fdCarID ? ` ${doItem.fdCarID.trim()}` : '—'} • {formatDate(doItem.fdSJDate)}
                      </span>
                      <span className="font-semibold text-[var(--color-primary)]">
                        {packQty != null ? `${formatNumber(packQty)} ${satuan.trim()}` : '—'}
                        {berat != null ? ` • ${formatDecimal(berat, 2)} Kg` : ''}
                      </span>
                    </div>
                  </div>
                )
              })
            ) : (
              <EmptyState title="Tidak ada surat jalan terbaru" className="m-4" />
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}