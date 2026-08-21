import { cn } from '@/lib/utils'
import type { ShipmentStatus } from '../types/shipments.types'
import { STATUS_STYLES } from '../utils/status'

export function StatusBadge({ status }: { status?: ShipmentStatus }) {
  const step = status?.statusStep ?? 0
  const style = STATUS_STYLES[step] || STATUS_STYLES[0]
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap',
      style.bg, style.text
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
      {status?.statusLabel || style.label}
    </span>
  )
}
