export function AgingBadge({ hari }: { hari: number }) {
  if (hari === 0) {
    return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap">Hari ini</span>
  }
  if (hari <= 3) {
    return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-200/80 whitespace-nowrap">{hari} hari</span>
  }
  if (hari <= 7) {
    return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-50 text-amber-700 border border-amber-200/80 whitespace-nowrap">{hari} hari</span>
  }
  return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-50 text-rose-700 border border-rose-200/80 whitespace-nowrap">{hari} hari</span>
}
