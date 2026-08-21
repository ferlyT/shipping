import { Badge } from '@/components/ui/Badge'

export function AgingBadge({ hari }: { hari: number }) {
  if (hari === 0) {
    return <Badge variant="success" className="text-[10px] px-2 py-0.5 font-bold whitespace-nowrap">Hari ini</Badge>
  }
  if (hari <= 3) {
    return <Badge variant="info" className="text-[10px] px-2 py-0.5 font-bold whitespace-nowrap">{hari} hari</Badge>
  }
  if (hari <= 7) {
    return <Badge variant="warning" className="text-[10px] px-2 py-0.5 font-bold whitespace-nowrap">{hari} hari</Badge>
  }
  return <Badge variant="danger" className="text-[10px] px-2 py-0.5 font-bold whitespace-nowrap">{hari} hari</Badge>
}
