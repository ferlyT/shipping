import { StatusBadge } from '@/components/ui/StatusBadge'

export function StatusPill({ isSent }: { isSent: number }) {
  return <StatusBadge status={isSent === 1 ? 'DELIVERED' : 'PENDING'} size="sm" />
}
