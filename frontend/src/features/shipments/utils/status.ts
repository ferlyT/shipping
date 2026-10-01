export const STATUS_STYLES: Record<number, { label: string; bg: string; text: string; dot: string }> = {
  [-1]: { label: 'Canceled',       bg: 'bg-rose-500/10 border border-rose-500/20',     text: 'text-rose-600 dark:text-rose-400',       dot: 'bg-rose-500' },
  0:    { label: 'Waiting',        bg: 'bg-slate-500/10 border border-slate-500/20',   text: 'text-slate-600 dark:text-slate-400',     dot: 'bg-slate-400' },
  1:    { label: 'Loading',        bg: 'bg-sky-500/10 border border-sky-500/20',       text: 'text-sky-600 dark:text-sky-400',         dot: 'bg-sky-500' },
  2:    { label: 'ETD',            bg: 'bg-purple-500/10 border border-purple-500/20', text: 'text-purple-600 dark:text-purple-400',   dot: 'bg-purple-500' },
  3:    { label: 'ETA',            bg: 'bg-amber-500/10 border border-amber-500/20',   text: 'text-amber-600 dark:text-amber-400',     dot: 'bg-amber-500' },
  4:    { label: 'Warehouse',      bg: 'bg-emerald-500/10 border border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  5:    { label: 'Delivery',       bg: 'bg-cyan-500/10 border border-cyan-500/20',     text: 'text-cyan-600 dark:text-cyan-400',       dot: 'bg-cyan-500' },
  6:    { label: 'Delivered',      bg: 'bg-teal-500/10 border border-teal-500/20',     text: 'text-teal-600 dark:text-teal-400',       dot: 'bg-teal-500' },
  7:    { label: 'Billed',         bg: 'bg-indigo-500/10 border border-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400',   dot: 'bg-indigo-500' },
  8:    { label: 'Partially Paid', bg: 'bg-amber-500/10 border border-amber-500/20',   text: 'text-amber-600 dark:text-amber-400',     dot: 'bg-amber-500' },
  9:    { label: 'Paid',           bg: 'bg-emerald-500/10 border border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  10:   { label: 'Blocked',        bg: 'bg-rose-500/10 border border-rose-500/30',     text: 'text-rose-600 dark:text-rose-400',       dot: 'bg-rose-500 animate-pulse' },
}

export const STATUS_ORDER = [-1, 10, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
