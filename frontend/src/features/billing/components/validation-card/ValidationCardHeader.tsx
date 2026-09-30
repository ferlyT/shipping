import React from 'react'
import { ShieldCheck, RefreshCw } from 'lucide-react'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import { useTranslation } from '@/hooks/useTranslation'

interface ValidationCardHeaderProps {
  isAir: boolean
  isType2: boolean
  listCode: string
  badgeVariant: BadgeVariant
  badgeText: string
  StatusIcon: React.ElementType
  refetch: () => void
  isFetching: boolean
}

export const ValidationCardHeader: React.FC<ValidationCardHeaderProps> = ({
  isAir,
  isType2,
  listCode,
  badgeVariant,
  badgeText,
  StatusIcon,
  refetch,
  isFetching,
}) => {
  const { t } = useTranslation()

  return (
    <div className="px-3 py-2.5 sm:px-5 sm:py-3.5 border-b border-[var(--color-border)] bg-[var(--color-neutral)] flex items-center justify-between gap-2 shrink-0">
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <ShieldCheck className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
        <h3 className="text-xs sm:text-sm font-bold font-[var(--font-label)] uppercase tracking-wider text-[var(--color-primary)] truncate">
          {isAir ? 'Validasi Berat (Udara)' : t('billing.validation.title')}
        </h3>
        <span className="text-[10px] sm:text-[11px] text-[var(--color-secondary)] font-mono shrink-0">({listCode})</span>
        {isAir && (
          <Badge variant="default" className="text-[9px] px-1.5 py-0 font-bold uppercase tracking-wider shrink-0">
            BY AIR
          </Badge>
        )}
        {isType2 && (
          <Badge variant="default" className="text-[9px] px-1.5 py-0 font-bold uppercase tracking-wider shrink-0 bg-transparent border border-sky-500/40 text-sky-600 dark:text-sky-400">
            TYPE 2 (M3 vs KG)
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <Badge variant={badgeVariant} className="flex items-center gap-1 text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 font-semibold">
          <StatusIcon className="w-3.5 h-3.5" />
          <span className="truncate max-w-[120px] sm:max-w-none">{badgeText}</span>
        </Badge>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-1 text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
          title={t('common.refresh')}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  )
}
