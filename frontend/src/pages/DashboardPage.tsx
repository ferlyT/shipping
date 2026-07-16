import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, FileText, Truck, Box, ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { dashboardApi } from '@/api/endpoints'
import { useToastStore } from '@/stores/toastStore'
import { ROUTES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'

interface DashboardStats {
  metrics: {
    totalCustomers: number
    totalInvoices: number
    totalDeliveryOrders: number
    totalShipments: number
    totalInvoiceAmount: number
  }
  trends: {
    customers: { type: string, value: string, label: string } | null
    invoices: { type: string, value: string, label: string } | null
    deliveryOrders: { type: string, value: string, label: string } | null
    shipments: { type: string, value: string, label: string } | null
  }
  chartData: Array<{
    name: string
    invoices: number
    deliveryOrders: number
    shipments: number
  }>
  recentActivity: {
    invoices: Array<{
      fdInvNo: string
      fdInvDate: string
      fdJumlah1: number
      fdCustCode: string
      customer: { fdCustName: string } | null
    }>
    deliveryOrders: Array<{
      fdSJNo: string
      fdSJDate: string
      fdCustNameSJ: string | null
      fdCustCode: string | null
    }>
  }
}

export default function DashboardPage() {
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
    } catch (err: any) {
      addToast({
        message: err instanceof Error ? err.message : 'Gagal memuat dashboard',
        type: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 h-full flex flex-col justify-center items-center gap-4">
        <span className="w-10 h-10 border-4 border-[var(--color-tertiary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--color-secondary)] text-sm animate-pulse">Memuat data operasional...</p>
      </div>
    )
  }

  if (!data) return null

  const statCards = [
    {
      title: 'Total pelanggan',
      value: data.metrics.totalCustomers,
      icon: Users,
      borderColor: 'border-l-blue-500',
      iconColor: 'text-blue-600',
      trend: data.trends.customers,
      link: ROUTES.CUSTOMERS
    },
    {
      title: 'Total invoices',
      value: data.metrics.totalInvoices,
      subValue: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(data.metrics.totalInvoiceAmount),
      icon: FileText,
      borderColor: 'border-l-emerald-500',
      iconColor: 'text-emerald-600',
      trend: data.trends.invoices,
      link: ROUTES.BILLING
    },
    {
      title: 'Surat jalan (DO)',
      value: data.metrics.totalDeliveryOrders,
      icon: Truck,
      borderColor: 'border-l-amber-500',
      iconColor: 'text-amber-600',
      trend: data.trends.deliveryOrders,
      link: ROUTES.DELIVERY_ORDERS
    },
    {
      title: 'Shipments / resi',
      value: data.metrics.totalShipments,
      icon: Box,
      borderColor: 'border-l-purple-500',
      iconColor: 'text-purple-600',
      trend: data.trends.shipments,
      link: ROUTES.SHIPMENTS
    }
  ]

  return (
    <div className="p-6 w-full space-y-8 animate-fadeIn pb-24">
      <div>
        <h1 className="font-[var(--font-display)] font-medium text-[40px] m-0 mb-1 tracking-[-0.02em] text-[var(--color-primary)]">Dashboard</h1>
        <p className="text-[var(--color-secondary)] mt-1">
          Ringkasan operasional
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <Link
            key={idx}
            to={stat.link}
            className={`group bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm hover:shadow transition-all duration-200 border-l-[3px] ${stat.borderColor} flex flex-col gap-3 relative`}
          >
            <div className="flex items-center gap-2 text-[var(--color-secondary)]">
              <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
              <span className="text-sm font-medium">{stat.title}</span>
            </div>

            <h3 className="text-3xl font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums tracking-tight">
              {stat.value.toLocaleString('id-ID')}
            </h3>

            <div className="mt-1">
              {stat.trend ? (
                <div className={`flex items-center gap-1 text-xs font-medium ${stat.trend.type === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {stat.trend.type === 'up' ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  <span>{stat.trend.value} {stat.trend.label}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs font-medium text-[var(--color-tertiary)]">
                  <span className="w-3.5 flex justify-center">—</span>
                  <span>Data tren belum tersedia</span>
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-4">
              <span className="text-xs text-[var(--color-secondary)]">
                {stat.subValue ? stat.subValue : 'Last updated just now'}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm overflow-hidden p-6">
        <h2 className="text-lg font-semibold text-[var(--color-primary)] font-[var(--font-display)] mb-6">
          Tren Transaksi 12 Bulan Terakhir
        </h2>
        <div className="h-[350px] w-full">
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
                tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
              />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                labelStyle={{ fontWeight: 'bold', color: 'var(--color-primary)' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '15px' }} />
              <Line
                name="Invoices"
                type="monotone"
                dataKey="invoices"
                stroke="#10b981"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
              <Line
                name="Surat Jalan"
                type="monotone"
                dataKey="deliveryOrders"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
              <Line
                name="Shipments"
                type="monotone"
                dataKey="shipments"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between">
            <h3 className="font-semibold text-[var(--color-primary)] flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-500" />
              Invoice Terbaru
            </h3>
            <Link to={ROUTES.BILLING} className="text-sm text-[var(--color-tertiary)] hover:underline flex items-center gap-1">
              Lihat Semua <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-[var(--color-border)] flex-1">
            {data.recentActivity.invoices.length > 0 ? (
              data.recentActivity.invoices.map((invoice) => (
                <div key={invoice.fdInvNo} className="p-4 hover:bg-[var(--color-background)] transition-colors flex justify-between items-center">
                  <div>
                    <div className="font-medium text-[var(--color-primary)]">{invoice.customer?.fdCustName || invoice.fdCustCode || 'Unknown Customer'}</div>
                    <div className="text-sm text-[var(--color-secondary)] font-mono">{invoice.fdInvNo} • {formatDate(invoice.fdInvDate)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-emerald-600">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(invoice.fdJumlah1)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-[var(--color-secondary)] text-sm">Tidak ada data invoice terbaru</div>
            )}
          </div>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between">
            <h3 className="font-semibold text-[var(--color-primary)] flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-500" />
              Surat Jalan Terbaru
            </h3>
            <Link to={ROUTES.DELIVERY_ORDERS} className="text-sm text-[var(--color-tertiary)] hover:underline flex items-center gap-1">
              Lihat Semua <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-[var(--color-border)] flex-1">
            {data.recentActivity.deliveryOrders.length > 0 ? (
              data.recentActivity.deliveryOrders.map((doItem) => (
                <div key={doItem.fdSJNo} className="p-4 hover:bg-[var(--color-background)] transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-[var(--color-primary)]">{doItem.fdSJNo}</span>
                    <span className="text-sm text-[var(--color-primary)] truncate max-w-[150px]">
                      {doItem.fdCustNameSJ || doItem.fdCustCode || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-[var(--color-secondary)]">
                    <span>Surat Jalan</span>
                    <span>{formatDate(doItem.fdSJDate)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-[var(--color-secondary)] text-sm">Tidak ada data surat jalan terbaru</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}