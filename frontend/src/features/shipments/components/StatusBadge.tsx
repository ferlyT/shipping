import { cn } from '@/lib/utils'
import type { ShipmentStatus } from '../types/shipments.types'
import { STATUS_STYLES } from '../utils/status'

export function StatusBadge({ status }: { status?: ShipmentStatus }) {
  const step = status?.statusStep ?? 0
  const style = STATUS_STYLES[step] || STATUS_STYLES[0]
  const isBlocked = step === 10 || status?.statusLabel === 'Blocked' || Boolean(status?.isBlocked)
  const tooltip = isBlocked && (status?.blockedBy || status?.blockedReason)
    ? `Blocked by: ${status?.blockedBy || '-'}${status?.blockedReason ? ` (${status.blockedReason})` : ''}`
    : undefined

  return (
    <span 
      title={tooltip}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap',
        style.bg, style.text,
        isBlocked && 'cursor-help'
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
      {status?.statusLabel || style.label}
    </span>
  )
}
