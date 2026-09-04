import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Phone, Eye } from 'lucide-react'
import {
  statusConfig, BrokerBadge, DiscontinuedBadge, CustomerTierBadge,
  formatCustomerSince, formatCustomerTenure
} from './CustomerBadges'
import { CustomerMobileCard } from './CustomerMobileCard'
import { formatCompactRupiah } from '@/lib/utils'
import type { Customer } from '../types/customers.types'

interface CustomerTableViewProps {
  customers: Customer[]
  page: number
  limit: number
  sortField: string
  sortDir: 'asc' | 'desc'
  onSort: (field: string) => void
  onSelectCustomer: (customer: Customer) => void
  canViewTier?: boolean
  isLoading?: boolean
}

export function CustomerTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="w-full">
      {/* Desktop Skeleton Table */}
      <div className="hidden sm:block">
        <table className="w-full text-xs sm:text-sm table-fixed">
          <thead className="sticky top-0 z-20 shadow-[0_1px_0_0_var(--color-border)]">
            <tr className="bg-[var(--color-neutral)] border-b border-[var(--color-border)]">
              <th className="w-12 px-5 py-[14px] text-left text-[11px] font-medium text-[var(--color-secondary)] uppercase">No.</th>
              <th className="w-[280px] px-5 py-[14px] text-left text-[11px] font-medium text-[var(--color-secondary)] uppercase">Customer Name & Tier</th>
              <th className="w-[170px] px-5 py-[14px] text-left text-[11px] font-medium text-[var(--color-secondary)] uppercase">Contact Person</th>
              <th className="w-[150px] px-5 py-[14px] text-left text-[11px] font-medium text-[var(--color-secondary)] uppercase">Phone</th>
              <th className="w-[120px] px-5 py-[14px] text-left text-[11px] font-medium text-[var(--color-secondary)] uppercase">City</th>
              <th className="w-[130px] px-5 py-[14px] text-left text-[11px] font-medium text-[var(--color-secondary)] uppercase">Status</th>
              <th className="w-[60px] px-5 py-[14px] text-center text-[11px] font-medium text-[var(--color-secondary)] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="bg-[var(--color-surface)]">
                <td className="px-5 py-4 w-12">
                  <div className="h-3.5 w-5 rounded-md skeleton-shimmer" />
                </td>
                <td className="px-5 py-4 w-[280px]">
                  <div className="h-4 rounded-md skeleton-shimmer w-3/4 mb-2" />
                  <div className="flex gap-2">
                    <div className="h-3 rounded-md skeleton-shimmer w-16" />
                    <div className="h-3 rounded-md skeleton-shimmer w-20" />
                  </div>
                </td>
                <td className="px-5 py-4 w-[170px]">
                  <div className="h-3.5 rounded-md skeleton-shimmer w-2/3 mb-1.5" />
                  <div className="h-3 rounded-md skeleton-shimmer w-1/2" />
                </td>
                <td className="px-5 py-4 w-[150px]">
                  <div className="h-3.5 rounded-md skeleton-shimmer w-28 mb-1.5" />
                  <div className="h-3 rounded-md skeleton-shimmer w-20" />
                </td>
                <td className="px-5 py-4 w-[120px]">
                  <div className="h-3.5 rounded-md skeleton-shimmer w-20" />
                </td>
                <td className="px-5 py-4 w-[130px]">
                  <div className="h-5 rounded-full skeleton-shimmer w-20" />
                </td>
                <td className="px-5 py-4 w-[60px] text-center">
                  <div className="h-6 w-6 rounded-md skeleton-shimmer mx-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Skeleton Cards */}
      <div className="sm:hidden divide-y divide-[var(--color-border)]">
        {Array.from({ length: Math.min(rows, 6) }).map((_, i) => (
          <div key={i} className="p-4 space-y-2.5 bg-[var(--color-surface)]">
            <div className="flex justify-between items-center">
              <div className="h-4 rounded-md skeleton-shimmer w-1/2" />
              <div className="h-4 rounded-full skeleton-shimmer w-16" />
            </div>
            <div className="h-3.5 rounded-md skeleton-shimmer w-1/3" />
            <div className="h-3.5 rounded-md skeleton-shimmer w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function CustomerTableView({
  customers,
  page,
  limit,
  sortField,
  sortDir,
  onSort,
  onSelectCustomer,
  canViewTier = true,
  isLoading = false,
}: CustomerTableViewProps) {
  if (isLoading) {
    return <CustomerTableSkeleton rows={limit} />
  }
  const columns = [
    {
      key: 'no',
      header: 'No.',
      className: 'w-12 text-center text-[var(--color-secondary)] text-xs',
      render: (_: unknown, index: number) => (page - 1) * limit + index + 1
    },
    {
      key: 'fdCustName',
      header: canViewTier ? 'Customer Name & Tier' : 'Customer Name',
      sortable: true,
      className: 'w-[280px]',
      render: (row: Customer) => (
        <div className="min-w-0">
          <div className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 min-w-0 text-[var(--color-primary)] flex-wrap">
            <span className="truncate">{row.fdCustName || '-'}</span>
            {canViewTier && row.tier && row.tier !== 'none' && <CustomerTierBadge tier={row.tier} size="xs" />}
            {row.fdBroker === 1 && <BrokerBadge size="xs" />}
            {row.fdDiscontinued === 1 && <DiscontinuedBadge size="xs" />}
          </div>
          <div className="flex items-center gap-1.5 min-w-0 mt-0.5 flex-wrap">
            <span className="text-xs text-[var(--color-secondary)] font-mono font-medium truncate">{row.fdCustCode}</span>
            {formatCustomerTenure(row.fdCreatedDate) && (
              <span
                className="shrink-0 text-[10px] text-[var(--color-secondary)] bg-[var(--color-neutral)] border border-[var(--color-border)] px-1.5 py-0.2 rounded"
                title={`Customer since ${formatCustomerSince(row.fdCreatedDate)}`}
              >
                {formatCustomerTenure(row.fdCreatedDate)}
              </span>
            )}
            {canViewTier && row.annualRevenue !== undefined && row.annualRevenue > 0 && (
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                {formatCompactRupiah(row.annualRevenue)} ({row.totalInvoices || 0} inv)
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'fdContact',
      header: 'Contact Person',
      sortable: true,
      className: 'w-[170px]',
      render: (row: Customer) => (
        <div className="min-w-0">
          <div className="font-medium text-xs sm:text-sm text-[var(--color-primary)] truncate">{row.fdContact || '-'}</div>
          <div className="text-[11px] text-[var(--color-secondary)] truncate">Sales: {row.fdSalesNM || '-'}</div>
        </div>
      )
    },
    {
      key: 'phone',
      header: 'Phone',
      className: 'w-[150px]',
      render: (row: Customer) => (
        <div className="text-xs space-y-0.5 min-w-0">
          {row.fdHP && (
            <div className="flex items-center gap-1.5 text-[var(--color-primary)] font-medium min-w-0">
              <Phone className="w-3 h-3 text-[var(--color-secondary)] flex-shrink-0" />
              <span className="truncate font-mono">{row.fdHP}</span>
            </div>
          )}
          {row.fdTelp && (
            <div className="flex items-center gap-1.5 text-[var(--color-secondary)] min-w-0">
              <Phone className="w-3 h-3 text-[var(--color-secondary)] flex-shrink-0 opacity-60" />
              <span className="truncate font-mono">{row.fdTelp}</span>
            </div>
          )}
          {!row.fdHP && !row.fdTelp && <span className="text-[var(--color-secondary)]">-</span>}
        </div>
      )
    },
    {
      key: 'fdCityName',
      header: 'City',
      sortable: true,
      className: 'w-[120px]',
      render: (row: Customer) => <span className="truncate block text-xs sm:text-sm text-[var(--color-primary)]">{row.fdCityName || '-'}</span>
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-[130px]',
      render: (row: Customer) => {
        const config = statusConfig[(row.fdBlocked || 0) as keyof typeof statusConfig]
        return (
          <Badge variant={config?.badgeVariant || 'default'} className="whitespace-nowrap text-[10px]">
            {config?.label || 'UNKNOWN'}
          </Badge>
        )
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-[60px] text-center',
      render: (row: Customer) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onSelectCustomer(row)}
            className="p-1.5 text-[var(--color-secondary)] hover:text-[var(--color-tertiary)] hover:bg-[var(--color-neutral)] rounded-[var(--radius-sm)] transition-colors cursor-pointer"
            title="Lihat Detail Customer"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  return (
    <>
      {/* Mobile Cards for Table View (< sm) */}
      <div className="sm:hidden divide-y divide-[var(--color-border)]">
        {customers.map((cust) => (
          <CustomerMobileCard
            key={cust.fdCustCode}
            cust={cust}
            onClick={() => onSelectCustomer(cust)}
            canViewTier={canViewTier}
          />
        ))}
      </div>

      {/* Desktop Table (>= sm) */}
      <div className="hidden sm:block">
        <Table<Customer>
          columns={columns}
          data={customers}
          isLoading={false}
          onRowClick={(row) => onSelectCustomer(row)}
          sortColumn={sortField}
          sortDirection={sortDir}
          onSort={onSort}
          keyExtractor={(row) => row.fdCustCode}
        />
      </div>
    </>
  )
}
