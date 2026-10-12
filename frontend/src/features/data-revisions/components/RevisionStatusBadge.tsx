import { Clock, Ban, CheckCircle2 } from 'lucide-react'
import type { RevisionStatus } from '../types/data-revisions.types'

interface RevisionStatusBadgeProps {
  status: RevisionStatus
  matchedInvNo?: string | null
  className?: string
}

export default function RevisionStatusBadge({
  status,
  matchedInvNo,
  className = '',
}: RevisionStatusBadgeProps) {
  if (status === 'DATA_CANCELLED') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold border border-rose-500/30 bg-rose-500/10 text-rose-500 whitespace-nowrap ${className}`}
      >
        <Ban size={13} />
        Data Dibatalkan
      </span>
    )
  }

  if (status === 'BILL_TERBUAT') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 whitespace-nowrap ${className}`}
        title={matchedInvNo ? `Invoice: ${matchedInvNo}` : undefined}
      >
        <CheckCircle2 size={13} />
        Bill Terbuat {matchedInvNo ? `(${matchedInvNo})` : ''}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-500 whitespace-nowrap ${className}`}
    >
      <Clock size={13} />
      Menunggu
    </span>
  )
}
