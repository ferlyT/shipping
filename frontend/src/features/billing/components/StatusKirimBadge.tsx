export function StatusKirimBadge({ status }: { status: string }) {
  if (!status) return <span>-</span>
  let main = status
  let sub = ''

  if (status.includes(' - ')) {
    const parts = status.split(' - ')
    main = parts[0]
    sub = parts.slice(1).join(' - ')
  } else {
    const match = status.match(/^(.+?)\s+(\d{1,2}\/\d{1,2}\/\d{2,4}.*)$/)
    if (match) {
      main = match[1]
      sub = match[2]
    }
  }

  return (
    <div className="whitespace-nowrap text-[11px]">
      <div className="font-semibold text-amber-800">{main}</div>
      {sub ? <div className="text-[10px] text-[var(--color-secondary)] font-normal">{sub}</div> : null}
    </div>
  )
}
