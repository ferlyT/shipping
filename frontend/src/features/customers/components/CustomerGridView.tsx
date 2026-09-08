import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { statusConfig, BrokerBadge, DiscontinuedBadge, CustomerTierBadge } from './CustomerBadges'
import { formatCompactRupiah } from '@/lib/utils'
import type { Customer } from '../types/customers.types'

interface CustomerGridViewProps {
  customers: Customer[]
  onSelectCustomer: (customer: Customer) => void
  canViewTier?: boolean
}

export function CustomerGridView({
  customers,
  onSelectCustomer,
  canViewTier = true,
}: CustomerGridViewProps) {
  return (
    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {customers.map((cust) => (
        <div
          key={cust.fdCustCode}
          onClick={() => onSelectCustomer(cust)}
          className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-tertiary)]/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3 group"
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-[var(--color-primary)] truncate group-hover:text-[var(--color-tertiary)] transition-colors">
                  {cust.fdCustName || '—'}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="font-mono text-xs text-[var(--color-secondary)]">
                    {cust.fdCustCode}
                  </span>
                  {canViewTier && cust.annualRevenue !== undefined && cust.annualRevenue > 0 && (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                      {formatCompactRupiah(cust.annualRevenue)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                {canViewTier && cust.tier && cust.tier !== 'none' && <CustomerTierBadge tier={cust.tier} size="xs" />}
                {cust.fdBroker === 1 && <BrokerBadge size="xs" />}
                {cust.fdDiscontinued === 1 && <DiscontinuedBadge size="xs" />}
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[var(--color-border)] space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[var(--color-secondary)]">
                <span>Kontak:</span>
                <span className="font-semibold text-[var(--color-primary)] truncate max-w-[140px]">
                  {cust.fdContact || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--color-secondary)]">
                <span>Telepon:</span>
                <span className="font-mono text-[var(--color-primary)]">
                  {cust.fdHP || cust.fdTelp || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--color-secondary)]">
                <span>Kota:</span>
                <span className="font-semibold text-[var(--color-primary)]">
                  {cust.fdCityName || '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between">
            <Badge variant={statusConfig[(cust.fdBlocked || 0) as keyof typeof statusConfig]?.badgeVariant || 'default'} className="text-[9px]">
              {statusConfig[(cust.fdBlocked || 0) as keyof typeof statusConfig]?.label || 'NO STATUS'}
            </Badge>

            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-tertiary)]">
              <span>Lihat Detail</span>
              <Eye size={12} className="hidden sm:inline-block" />
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
