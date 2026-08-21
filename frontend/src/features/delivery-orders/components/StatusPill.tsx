import { Badge } from '@/components/ui/Badge'

export function StatusPill({ isSent }: { isSent: number }) {
  if (isSent === 1) {
    return <Badge variant="success">Delivered</Badge>
  }
  return <Badge variant="warning">Pending</Badge>
}
