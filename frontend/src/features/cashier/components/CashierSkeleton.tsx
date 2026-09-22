export function CashierListSkeleton() {
  return (
    <div className="p-3.5 sm:p-6 lg:p-8 w-full min-w-0 space-y-4 sm:space-y-6 font-[var(--font-body)] animate-fadeIn pb-24">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-6 w-56 rounded skeleton-shimmer" />
          <div className="h-4 w-96 rounded skeleton-shimmer" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-32 rounded-lg skeleton-shimmer" />
          <div className="h-9 w-36 rounded-lg skeleton-shimmer" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 sm:p-4 space-y-2.5 shadow-xs"
          >
            <div className="flex justify-between items-center">
              <div className="h-3 w-24 rounded skeleton-shimmer" />
              <div className="h-4 w-6 rounded-full skeleton-shimmer" />
            </div>
            <div className="h-6 w-32 rounded skeleton-shimmer" />
            <div className="h-3.5 w-20 rounded skeleton-shimmer" />
          </div>
        ))}
      </div>

      {/* Table Toolbar Skeleton */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3 justify-between">
          <div className="h-9 w-64 rounded-lg skeleton-shimmer" />
          <div className="flex gap-2">
            <div className="h-9 w-40 rounded-lg skeleton-shimmer" />
            <div className="h-9 w-32 rounded-lg skeleton-shimmer" />
          </div>
        </div>
        <div className="space-y-2 pt-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-11 w-full rounded-lg skeleton-shimmer" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function CashierDetailSkeleton() {
  return (
    <div className="p-3.5 sm:p-6 lg:p-8 w-full min-w-0 space-y-4 sm:space-y-6 font-[var(--font-body)] animate-fadeIn pb-24">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-6 w-64 rounded skeleton-shimmer" />
          <div className="h-4 w-80 rounded skeleton-shimmer" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 rounded-lg skeleton-shimmer" />
          <div className="h-9 w-28 rounded-lg skeleton-shimmer" />
        </div>
      </div>

      {/* Summary Card Skeleton */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 space-y-3 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-20 rounded skeleton-shimmer" />
              <div className="h-5 w-36 rounded skeleton-shimmer" />
            </div>
          ))}
        </div>
      </div>

      {/* Balance Bar Skeleton */}
      <div className="h-16 w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] skeleton-shimmer" />

      {/* Two Grids Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3 shadow-xs">
          <div className="h-5 w-40 rounded skeleton-shimmer" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-full rounded-lg skeleton-shimmer" />
          ))}
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3 shadow-xs">
          <div className="h-5 w-40 rounded skeleton-shimmer" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-full rounded-lg skeleton-shimmer" />
          ))}
        </div>
      </div>
    </div>
  )
}
