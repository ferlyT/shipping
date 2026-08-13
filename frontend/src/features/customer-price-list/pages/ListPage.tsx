import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { Upload, Eye } from 'lucide-react'
import { customerPriceListApi } from '../services/customerPriceList.service'
import type { CustomerPriceListUploadRow } from '../types'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

export function ListPage() {
  const { t } = useTranslation()
  const [rows, setRows] = useState<CustomerPriceListUploadRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    customerPriceListApi
      .listCustomers()
      .then((res) => setRows(res.data.data))
      .catch((err) => {
        setError(err?.response?.data?.message || err?.message || 'Gagal memuat daftar')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner message={t('common.loading')} />
  if (error) return <div className="p-4 text-rose-500">{error}</div>

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-500 pb-24">
      <PageHeader
        title={t('customerPriceList.title')}
        subtitle={t('customerPriceList.subtitle')}
        breadcrumbs={[
          { label: t('module.finance'), path: ROUTES.BILLING },
          { label: t('nav.customerPriceList') },
        ]}
        actions={
          <Button asChild>
            <Link to={ROUTES.CUSTOMER_PRICE_LIST_UPLOAD}>
              <Upload className="w-4 h-4 mr-2" />
              {t('common.add')}
            </Link>
          </Button>
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">{t('customerPriceList.customerCode')}</th>
                <th className="px-6 py-4">{t('customerPriceList.customerName')}</th>
                <th className="px-6 py-4">Effective Date</th>
                <th className="px-6 py-4">{t('customerPriceList.totalItems')}</th>
                <th className="px-6 py-4">Upload Date</th>
                <th className="px-6 py-4">{t('common.status')}</th>
                <th className="px-6 py-4 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.fdCustCode} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{row.fdCustCode}</td>
                  <td className="px-6 py-4 text-slate-600">{row.custName}</td>
                  <td className="px-6 py-4 text-slate-600">{formatDate(row.effectiveDate)}</td>
                  <td className="px-6 py-4 text-slate-600">{row.itemCount}</td>
                  <td className="px-6 py-4 text-slate-600">{formatDate(row.uploadedAt)}</td>
                  <td className="px-6 py-4">
                    <Badge
                      variant={
                        row.status === 'PARSED' ? 'success' : row.status === 'PARTIAL' ? 'warning' : 'danger'
                      }
                    >
                      {row.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" asChild>
                      <Link to={ROUTES.CUSTOMER_PRICE_LIST_DETAIL(row.fdCustCode)}>
                        <Eye className="w-4 h-4 mr-2" />
                        {t('common.detail')}
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    {t('common.noData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
