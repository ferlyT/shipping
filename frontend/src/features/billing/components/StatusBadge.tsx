export function StatusBadge({ status }: { status: string }) {
  if (!status) return null
  const st = status.toUpperCase().trim()
  if (st.includes('COD')) {
    return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-100 text-purple-800 border border-purple-200">COD</span>
  }
  if (st.includes('URGENT')) {
    return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-800 border border-rose-200">URGENT</span>
  }
  if (st.includes('WARNING')) {
    return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-200">WARNING</span>
  }
  return <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-700 border border-gray-200">{status}</span>
}
