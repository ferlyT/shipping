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
import { Table, type Column } from '@/components/ui/Table'
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

  const columns: Column<CustomerPriceListUploadRow>[] = [
    {
      key: 'fdCustCode',
      header: t('customerPriceList.customerCode'),
      render: (row: CustomerPriceListUploadRow) => (
        <span className="font-semibold text-[var(--color-primary)] font-[var(--font-body)]">
          {row.fdCustCode}
        </span>
      ),
    },
    {
      key: 'custName',
      header: t('customerPriceList.customerName'),
      render: (row: CustomerPriceListUploadRow) => (
        <span className="text-[var(--color-primary)] font-medium">
          {row.custName || '-'}
        </span>
      ),
    },
    {
      key: 'effectiveDate',
      header: 'Effective Date',
      render: (row: CustomerPriceListUploadRow) => (
        <span className="text-[var(--color-secondary)]">
          {formatDate(row.effectiveDate)}
        </span>
      ),
    },
    {
      key: 'itemCount',
      header: t('customerPriceList.totalItems'),
      render: (row: CustomerPriceListUploadRow) => (
        <span className="text-[var(--color-primary)] tabular-nums">
          {row.itemCount}
        </span>
      ),
    },
    {
      key: 'uploadedAt',
      header: 'Upload Date',
      render: (row: CustomerPriceListUploadRow) => (
        <span className="text-[var(--color-secondary)]">
          {formatDate(row.uploadedAt)}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (row: CustomerPriceListUploadRow) => (
        <Badge
          variant={
            row.status === 'PARSED' ? 'success' : row.status === 'PARTIAL' ? 'warning' : 'danger'
          }
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      className: 'text-right',
      render: (row: CustomerPriceListUploadRow) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" asChild>
            <Link to={ROUTES.CUSTOMER_PRICE_LIST_DETAIL(row.fdCustCode)}>
              <Eye className="w-4 h-4 mr-1.5" />
              {t('common.detail')}
            </Link>
          </Button>
        </div>
      ),
    },
  ]

  if (loading) return <LoadingSpinner message={t('common.loading')} />
  if (error) return <div className="p-4 text-[var(--color-danger)]">{error}</div>

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fadeIn pb-24 bg-[var(--color-surface)] font-[var(--font-body)]">
      <PageHeader
        title={t('customerPriceList.title')}
        subtitle={t('customerPriceList.subtitle')}
        breadcrumbs={[
          { label: t('module.finance'), path: ROUTES.BILLING },
          { label: t('nav.customerPriceList') },
          { label: t('nav.list') },
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

      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-xs overflow-hidden">
        <Table<CustomerPriceListUploadRow>
          columns={columns}
          data={rows}
          keyExtractor={(row) => row.fdCustCode}
          emptyMessage={t('common.noData')}
        />
      </div>
    </div>
  )
}
