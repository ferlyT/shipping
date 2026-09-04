import { Building2, Phone, User, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { statusConfig, BrokerBadge, DiscontinuedBadge, CustomerTierBadge, formatCustomerTenure, formatCustomerSince } from './CustomerBadges'
import { formatCompactRupiah } from '@/lib/utils'
import type { Customer } from '../types/customers.types'

interface CustomerMobileCardProps {
  cust: Customer
  onClick?: () => void
  canViewTier?: boolean
}

export function CustomerMobileCard({ cust, onClick, canViewTier = true }: CustomerMobileCardProps) {
  const statusCfg = statusConfig[(cust.fdBlocked || 0) as keyof typeof statusConfig]

  return (
    <div
      onClick={onClick}
      className="p-3.5 sm:p-4 flex flex-col gap-2.5 bg-[var(--color-surface)] hover:bg-[var(--color-neutral)]/20 transition-colors cursor-pointer"
    >
      {/* Top Row: Customer Code + Badges + Status Badge */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-xs font-bold text-[var(--color-primary)] bg-[var(--color-neutral)] px-2 py-0.5 rounded border border-[var(--color-border)]">
            {cust.fdCustCode}
          </span>

          {canViewTier && cust.tier && cust.tier !== 'none' && <CustomerTierBadge tier={cust.tier} size="xs" />}

          {cust.fdBroker === 1 && <BrokerBadge size="sm" />}

          {cust.fdDiscontinued === 1 && <DiscontinuedBadge size="sm" />}

          {formatCustomerTenure(cust.fdCreatedDate) && (
            <span
              className="text-[10px] text-[var(--color-secondary)] bg-[var(--color-neutral)] border border-[var(--color-border)] px-1.5 py-0.5 rounded"
              title={`Bergabung sejak ${formatCustomerSince(cust.fdCreatedDate)}`}
            >
              {formatCustomerTenure(cust.fdCreatedDate)}
            </span>
          )}
        </div>

        <Badge
          variant={statusCfg?.badgeVariant || 'default'}
          className="text-[10px] px-2 py-0.5 whitespace-nowrap shrink-0"
        >
          {statusCfg?.label || 'NORMAL'}
        </Badge>
      </div>

      {/* Customer Name & City / Address & Revenue */}
      <div className="min-w-0">
        <div className="font-bold text-[var(--color-primary)] text-sm leading-snug break-words flex items-center justify-between gap-2">
          <span>{cust.fdCustName || 'Customer Tidak Dikenal'}</span>
          {canViewTier && cust.annualRevenue !== undefined && cust.annualRevenue > 0 && (
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 shrink-0">
              {formatCompactRupiah(cust.annualRevenue)}
            </span>
          )}
        </div>
        {cust.fdCityName && (
          <div className="text-[11px] text-[var(--color-secondary)] mt-0.5 flex items-center gap-1 flex-wrap">
            <Building2 className="w-3 h-3 text-[var(--color-secondary)] shrink-0" />
            <span>{cust.fdCityName}</span>
            {cust.fdAddr1 && (
              <>
                <span className="text-[var(--color-border)]">·</span>
                <span className="truncate max-w-[200px]">{cust.fdAddr1}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Inner Details Box (CP, Sales, Phone, Actions) */}
      <div className="p-2.5 rounded-xl bg-[var(--color-neutral)]/50 border border-[var(--color-border)]/80 flex flex-col gap-2 text-xs">
        {/* CP & Sales */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
          <div className="flex items-center gap-1.5 min-w-0">
            <User className="w-3 h-3 text-[var(--color-secondary)] shrink-0" />
            <span className="text-[var(--color-secondary)]">CP:</span>
            <span className="font-semibold text-[var(--color-primary)] truncate max-w-[160px]">
              {cust.fdContact || '—'}
            </span>
          </div>

          {cust.fdSalesNM && (
            <div className="flex items-center gap-1 text-[var(--color-secondary)] shrink-0">
              <span>Sales:</span>
              <strong className="text-[var(--color-primary)] font-semibold">{cust.fdSalesNM}</strong>
            </div>
          )}
        </div>

        {/* Phone & Detail Action */}
        <div className="pt-1.5 border-t border-[var(--color-border)]/50 flex items-center justify-between gap-2 text-[11px] font-mono flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {cust.fdHP && (
              <div className="flex items-center gap-1 text-[var(--color-primary)] font-medium">
                <Phone className="w-3 h-3 text-[var(--color-secondary)] shrink-0" />
                <span>{cust.fdHP}</span>
              </div>
            )}
            {cust.fdTelp && !cust.fdHP && (
              <div className="flex items-center gap-1 text-[var(--color-secondary)]">
                <Phone className="w-3 h-3 text-[var(--color-secondary)] shrink-0 opacity-70" />
                <span>{cust.fdTelp}</span>
              </div>
            )}
            {!cust.fdHP && !cust.fdTelp && (
              <span className="text-[var(--color-secondary)] italic text-[10px]">Tidak ada nomor telepon</span>
            )}
          </div>

          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-primary)] ml-auto">
            <span>Detail</span>
            <Eye size={12} className="text-[var(--color-secondary)]" />
          </div>
        </div>
      </div>
    </div>
  )
}
