import { Badge } from '@/components/ui/Badge'

export function StatusBadge({ status }: { status: string }) {
  if (!status) return null
  const st = status.toUpperCase().trim()
  if (st.includes('COD')) {
    return <Badge variant="info" className="px-2 py-0.5 text-[10px] font-bold">COD</Badge>
  }
  if (st.includes('URGENT')) {
    return <Badge variant="danger" className="px-2 py-0.5 text-[10px] font-bold">URGENT</Badge>
  }
  if (st.includes('WARNING')) {
    return <Badge variant="warning" className="px-2 py-0.5 text-[10px] font-bold">WARNING</Badge>
  }
  return <Badge variant="default" className="px-2 py-0.5 text-[10px] font-medium">{status}</Badge>
}
