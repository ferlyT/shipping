import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { deliveryOrdersApi } from '../services/delivery-orders.service'
import { usePagination } from '@/hooks/usePagination'
import { BatchTable } from './BatchTable'
import { TableFooter } from './TableFooter'
import { cn } from '@/lib/utils'
import type { GroupedDataRow, SentValue } from '../types/delivery-orders.types'

export function DataGroupSection({
  filterField,
  code,
  label,
  groupTotal,
  listTypeValue,
  sentValue,
  search,
}: {
  filterField: 'markingCode' | 'branch'
  code: string
  label: string
  groupTotal: number
  listTypeValue: string
  sentValue: SentValue
  search: string
}) {
  const [open, setOpen] = useState(false)
  const pg = usePagination(10)

  useEffect(() => {
    pg.reset()
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading } = useQuery({
    queryKey: ['delivery-grouped-sub', filterField, code, listTypeValue, sentValue, search, pg.page, pg.limit],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: pg.page,
        limit: pg.limit,
        listType: listTypeValue,
        sent: sentValue,
        [filterField]: code,
        ...(search && { search }),
      }
      const res = await deliveryOrdersApi.getGrouped(params)
      return res.data as { data: GroupedDataRow[], meta: { total: number } }
    },
    enabled: open,
  })

  const rows = data?.data || []
  const total = data?.meta?.total ?? groupTotal

  return (
    <div className="border-t border-[var(--color-border)] first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 bg-transparent hover:bg-[var(--color-neutral)]/30 px-6 py-4 text-left transition-colors duration-200 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDown className="h-4 w-4 text-[var(--color-secondary)]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[var(--color-secondary)]" />
          )}
          <span className={cn(
            "text-sm font-semibold",
            open ? "text-[var(--color-primary)]" : "text-[var(--color-secondary)]"
          )}>
            {label}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-transparent border border-[var(--color-border)] text-[var(--color-secondary)]">
            {groupTotal}
          </span>
        </div>
      </button>
      {open && (
        isLoading ? (
          <div className="flex flex-col justify-center items-center py-10 bg-transparent gap-3">
            <Loader2 className="w-7 h-7 text-[var(--color-tertiary)] animate-spin" />
            <p className="text-[var(--color-secondary)] text-xs animate-pulse">Memuat group data...</p>
          </div>
        ) : rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-[var(--color-secondary)] bg-transparent">
            Tidak ada data dalam grup ini.
          </p>
        ) : (
          <div className="bg-transparent">
            <BatchTable rows={rows} />
            <TableFooter
              page={pg.page}
              limit={pg.limit}
              total={total}
              onPageChange={pg.goToPage}
              onLimitChange={pg.setLimit}
            />
          </div>
        )
      )}
    </div>
  )
}
