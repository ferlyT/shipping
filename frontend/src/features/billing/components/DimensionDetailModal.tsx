import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Ruler,
  Calculator,
  Search,
  RefreshCw,
  Info,
} from 'lucide-react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { billingApi } from '../services/billing.service'
import { formatDecimal, formatNumber, cn } from '@/lib/utils'
import type { DimensionItem, DimensionGroup } from '../types/billing.types'

export type DimensionSourceKey = 'entryList' | 'packingList' | 'komplain'

interface DimensionDetailModalProps {
  isOpen: boolean
  onClose: () => void
  listCode: string
  customerName?: string | null
  initialSource?: DimensionSourceKey
}

interface SourceMeta {
  key: DimensionSourceKey
  label: string
  tableName: string
  desc: string
}

const SOURCES: SourceMeta[] = [
  {
    key: 'entryList',
    label: 'EntryList',
    tableName: 'tbEntryListDetail',
    desc: 'Dimensi fisik barang yang diterima di gudang',
  },
  {
    key: 'packingList',
    label: 'Packing List',
    tableName: 'tbEntryListDetail_PackingList',
    desc: 'Dimensi resmi menurut dokumen packing list pengirim',
  },
  {
    key: 'komplain',
    label: 'Komplain',
    tableName: 'tbEntryListDetail_Komplain',
    desc: 'Dimensi fisik penyesuaian/revisi komplain',
  },
]

export function DimensionDetailModal({
  isOpen,
  onClose,
  listCode,
  customerName,
  initialSource = 'entryList',
}: DimensionDetailModalProps) {
  const [activeTab, setActiveTab] = useState<DimensionSourceKey>(initialSource)
  const [search, setSearch] = useState('')

  // Sync initialSource whenever modal is opened
  useMemo(() => {
    if (isOpen) {
      setActiveTab(initialSource)
      setSearch('')
    }
  }, [isOpen, initialSource])

  const cleanListCode = (listCode || '').trim()

  const {
    data: responseData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['billingDimensions', cleanListCode],
    queryFn: async () => {
      if (!cleanListCode) return null
      const res = await billingApi.getDimensions(cleanListCode)
      return res.data?.data
    },
    enabled: isOpen && !!cleanListCode,
    staleTime: 60000,
  })

  const currentGroup: DimensionGroup = useMemo(() => {
    if (!responseData) return { items: [], totalQty: 0, totalM3: 0, count: 0 }
    return responseData[activeTab] || { items: [], totalQty: 0, totalM3: 0, count: 0 }
  }, [responseData, activeTab])

  const filteredItems: DimensionItem[] = useMemo(() => {
    if (!search.trim()) return currentGroup.items
    const q = search.toLowerCase()
    return currentGroup.items.filter(
      (item) =>
        item.fdListDCode.toLowerCase().includes(q) ||
        item.fdDescr.toLowerCase().includes(q) ||
        (item.fdMarkingCode && item.fdMarkingCode.toLowerCase().includes(q)) ||
        (item.fdComodity && item.fdComodity.toLowerCase().includes(q))
    )
  }, [currentGroup.items, search])

  const activeSourceMeta = SOURCES.find((s) => s.key === activeTab) || SOURCES[0]

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalHeader
        title="Rincian Dimensi & Volume M3"
        subtitle={`ListCode: ${cleanListCode || '—'} ${customerName ? `• Customer: ${customerName}` : ''}`}
        icon={<Ruler className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
        badge={
          <Badge variant="info" className="text-[11px] font-mono border-blue-500/30 text-blue-600 dark:text-blue-400">
            {activeSourceMeta.tableName}
          </Badge>
        }
        onClose={onClose}
      />

      <ModalBody className="p-3.5 sm:p-4 space-y-3.5 max-h-[78vh] overflow-y-auto font-[var(--font-body)]">
        {/* ── Tabs Bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-[var(--color-neutral)] rounded-lg">
            {SOURCES.map((s) => {
              const isActive = activeTab === s.key
              const count = responseData ? responseData[s.key]?.count ?? 0 : 0
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setActiveTab(s.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border',
                    isActive
                      ? 'bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] font-bold shadow-xs'
                      : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                  )}
                >
                  <span>{s.label}</span>
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums',
                      count > 0
                        ? isActive
                          ? 'bg-[var(--color-tertiary)]/15 text-[var(--color-tertiary)]'
                          : 'bg-[var(--color-border)] text-[var(--color-primary)]'
                        : 'text-[var(--color-secondary)]'
                    )}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            {/* Search filter */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-secondary)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kode, marking, barang..."
                className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] placeholder:text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-tertiary)]"
              />
            </div>

            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Segarkan Data"
              className="p-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* ── KPI Metrik Summary ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Card 1: Total Volume M3 */}
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-2.5 flex flex-col justify-between">
            <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
              Total Volume M3
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-[18px] font-bold tabular-nums text-blue-600 dark:text-blue-400">
                {formatDecimal(currentGroup.totalM3, 4)}
              </span>
              <span className="text-[11px] font-medium text-[var(--color-secondary)]">m³</span>
            </div>
            <span className="text-[9.5px] text-[var(--color-secondary)] mt-0.5">Hasil kalkulasi P×L×T×Qty</span>
          </div>

          {/* Card 2: Total Qty / Koli */}
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 flex flex-col justify-between">
            <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
              Total Koli / Qty
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-[18px] font-bold tabular-nums text-[var(--color-primary)]">
                {formatNumber(currentGroup.totalQty)}
              </span>
              <span className="text-[11px] font-medium text-[var(--color-secondary)]">koli / pcs</span>
            </div>
            <span className="text-[9.5px] text-[var(--color-secondary)] mt-0.5">Akumulasi seluruh baris</span>
          </div>

          {/* Card 3: Jumlah Baris */}
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 flex flex-col justify-between">
            <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
              Rincian Item
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-[18px] font-bold tabular-nums text-[var(--color-primary)]">
                {currentGroup.count}
              </span>
              <span className="text-[11px] font-medium text-[var(--color-secondary)]">baris</span>
            </div>
            <span className="text-[9.5px] text-[var(--color-secondary)] mt-0.5">Tabel {activeSourceMeta.tableName}</span>
          </div>

          {/* Card 4: Rumus & Sumber */}
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 flex flex-col justify-center">
            <div className="flex items-center gap-1 text-[10.5px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider">
              <Calculator className="w-3 h-3 text-amber-500 shrink-0" />
              <span>Rumus Konversi M3</span>
            </div>
            <p className="mt-1 text-[11px] font-mono font-medium text-[var(--color-primary)] leading-tight">
              (P × L × T × Qty) ÷ 10⁶
            </p>
            <span className="text-[9px] text-[var(--color-secondary)] mt-1">Panjang/Lebar/Tinggi dalam cm</span>
          </div>
        </div>

        {/* ── Table Data ── */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-9 w-full rounded-md skeleton-shimmer" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-10 h-10 rounded-full bg-[var(--color-neutral)] text-[var(--color-secondary)] mx-auto flex items-center justify-center mb-2">
                <Box size={20} />
              </div>
              <p className="text-xs font-semibold text-[var(--color-primary)]">
                {search ? 'Tidak ada baris yang sesuai pencarian' : 'Tidak Ada Data Dimensi'}
              </p>
              <p className="text-[11px] text-[var(--color-secondary)] mt-0.5">
                {search
                  ? `Kata kunci "${search}" tidak ditemukan pada ${activeSourceMeta.label}`
                  : `Tabel ${activeSourceMeta.tableName} tidak memiliki rekaman untuk ListCode ${cleanListCode}`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[46vh]">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-[var(--color-neutral)] border-b border-[var(--color-border)] shadow-xs">
                  <tr className="text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                    <th className="py-2 px-2.5 text-center w-10">No</th>
                    <th className="py-2 px-2.5 text-left w-24">Kode Detail</th>
                    <th className="py-2 px-3 text-left">Deskripsi / Info</th>
                    <th className="py-2 px-2.5 text-right w-20">P (cm)</th>
                    <th className="py-2 px-2.5 text-right w-20">L (cm)</th>
                    <th className="py-2 px-2.5 text-right w-20">T (cm)</th>
                    <th className="py-2 px-2.5 text-right w-20">Qty</th>
                    <th className="py-2 px-3 text-right w-28">Volume (M³)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {filteredItems.map((item, idx) => (
                    <tr
                      key={`${item.fdListCode}-${item.fdListDCode}-${idx}`}
                      className="hover:bg-[var(--color-neutral)]/40 transition-colors"
                    >
                      <td className="py-2 px-2.5 text-center text-[var(--color-secondary)] tabular-nums font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2.5 font-mono font-medium text-[var(--color-primary)] text-[11.5px]">
                        {item.fdListDCode || '—'}
                      </td>
                      <td className="py-2 px-3 text-[var(--color-primary)]">
                        <div className="flex flex-col gap-0.5">
                          {item.fdDescr ? (
                            <span className="font-medium text-[12px]">{item.fdDescr}</span>
                          ) : (
                            <span className="text-[var(--color-secondary)] italic text-[11px]">Tanpa deskripsi</span>
                          )}
                          {(item.fdMarkingCode || item.fdComodity) && (
                            <div className="flex items-center gap-1.5 text-[10.5px] text-[var(--color-secondary)]">
                              {item.fdMarkingCode && (
                                <span className="font-mono bg-[var(--color-neutral)] px-1 py-0.2 rounded border border-[var(--color-border)]">
                                  {item.fdMarkingCode}
                                </span>
                              )}
                              {item.fdComodity && <span>{item.fdComodity}</span>}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2.5 text-right tabular-nums text-[var(--color-primary)]">
                        {item.fdPjg > 0 ? formatDecimal(item.fdPjg, 1) : '—'}
                      </td>
                      <td className="py-2 px-2.5 text-right tabular-nums text-[var(--color-primary)]">
                        {item.fdLbr > 0 ? formatDecimal(item.fdLbr, 1) : '—'}
                      </td>
                      <td className="py-2 px-2.5 text-right tabular-nums text-[var(--color-primary)]">
                        {item.fdTng > 0 ? formatDecimal(item.fdTng, 1) : '—'}
                      </td>
                      <td className="py-2 px-2.5 text-right tabular-nums font-semibold text-[var(--color-primary)]">
                        {formatNumber(item.fdQty)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums font-bold text-blue-600 dark:text-blue-400">
                        {formatDecimal(item.fdM3, 4)} m³
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="sticky bottom-0 z-10 bg-[var(--color-surface)] border-t-2 border-[var(--color-border)] font-bold text-xs">
                  <tr>
                    <td colSpan={6} className="py-2.5 px-3 text-right uppercase tracking-wider text-[var(--color-secondary)]">
                      Total ({filteredItems.length} baris) :
                    </td>
                    <td className="py-2.5 px-2.5 text-right tabular-nums font-bold text-[var(--color-primary)]">
                      {formatNumber(filteredItems.reduce((acc, curr) => acc + curr.fdQty, 0))}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10">
                      {formatDecimal(filteredItems.reduce((acc, curr) => acc + curr.fdM3, 0), 4)} m³
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </ModalBody>

      <ModalFooter className="px-4 py-2.5 flex items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-secondary)]">
          <Info size={13} className="shrink-0 text-blue-500" />
          <span>Data disinkronkan langsung dari tabel {activeSourceMeta.tableName}</span>
        </div>
        <Button size="sm" variant="secondary" onClick={onClose} className="text-xs font-semibold">
          Tutup
        </Button>
      </ModalFooter>
    </Modal>
  )
}
