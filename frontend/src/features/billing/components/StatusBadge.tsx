import { StatusBadge as UniversalStatusBadge } from '@/components/ui/StatusBadge'

export function StatusBadge({ status }: { status: string }) {
  if (!status) return null
  return <UniversalStatusBadge status={status} size="sm" />
}
