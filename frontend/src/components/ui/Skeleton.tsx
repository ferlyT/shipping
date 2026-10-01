import React from 'react'
import { cn } from '@/lib/utils'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-[var(--color-border)]/50', className)}
      {...props}
    />
  )
}

export interface PageSkeletonProps {
  title?: boolean
  cards?: number
  tableRows?: number
  className?: string
}

export function PageSkeleton({
  title = true,
  cards = 3,
  tableRows = 6,
  className,
}: PageSkeletonProps) {
  return (
    <div className={cn('p-4 sm:p-6 space-y-6 animate-fadeIn', className)}>
      {title && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 sm:w-64" />
          <Skeleton className="h-4 w-72 sm:w-96" />
        </div>
      )}
      {cards > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: cards }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      )}
      {tableRows > 0 && (
        <div className="border border-[var(--color-border)] rounded-xl p-4 space-y-3 bg-[var(--color-surface)]">
          <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
            <Skeleton className="h-7 w-36" />
            <div className="flex gap-2">
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-7 w-24" />
            </div>
          </div>
          {Array.from({ length: tableRows }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-lg" />
          ))}
        </div>
      )}
    </div>
  )
}
