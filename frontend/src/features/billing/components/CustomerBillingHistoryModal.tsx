import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { displayCustName, formatDate } from '@/lib/utils'
import { useCustomerHistoryData } from './customer-history/useCustomerHistoryData'
import { CustomerHistoryToolbar } from './customer-history/CustomerHistoryToolbar'
import { CustomerHistoryKpiCards } from './customer-history/CustomerHistoryKpiCards'
import { CustomerHistoryInvoiceTable } from './customer-history/CustomerHistoryInvoiceTable'
import { CustomerHistoryDetailTable } from './customer-history/CustomerHistoryDetailTable'
import type { CustomerBillingHistoryModalProps } from './customer-history/types'

export type { CustomerBillingHistoryModalProps }

export function CustomerBillingHistoryModal({
  isOpen,
  custCode,
  custName,
  tglAgent,
  typeComodity,
  onClose,
}: CustomerBillingHistoryModalProps) {
  const {
    invoices,
    flattenedItems,
    kpis,
    availableBranches,
    availableComodityTypes,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    viewMode,
    setViewMode,
    search,
    setSearch,
    selectedYear,
    setSelectedYear,
    selectedBranch,
    setSelectedBranch,
    selectedTypeComodity,
    setSelectedTypeComodity,
    selectedDiffStatus,
    setSelectedDiffStatus,
    selectedModa,
    setSelectedModa,
    selectedStatus,
    setSelectedStatus,
    resetFilters,
    totalCount,
    loadedCount,
  } = useCustomerHistoryData(isOpen, custCode, typeComodity)

  const displayCust = displayCustName(custName || custCode)

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full" zIndex="z-[100]">
      <Modal.Header
        title="Riwayat Tagihan Customer"
        subtitle={
          <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--color-secondary)] mt-0.5">
            <span>
              Customer Master: <strong className="text-[var(--color-primary)]">{displayCust}</strong>{' '}
              {custCode && <span className="text-[var(--color-secondary)]">({custCode})</span>}
            </span>
            {(tglAgent || typeComodity) && (
              <>
                <span className="text-[var(--color-border)]">•</span>
                {tglAgent && (
                  <span>
                    Tgl Agent: <strong className="text-[var(--color-primary)]">{formatDate(tglAgent)}</strong>
                  </span>
                )}
                {tglAgent && typeComodity && <span className="text-[var(--color-border)]">•</span>}
                {typeComodity && (
                  <button
                    type="button"
                    onClick={() => setSelectedTypeComodity(selectedTypeComodity === typeComodity ? 'all' : typeComodity)}
                    title="Klik untuk filter tipe komoditas ini"
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                      selectedTypeComodity === typeComodity
                        ? 'bg-transparent border border-[var(--color-tertiary)] text-[var(--color-tertiary)]'
                        : 'bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                    }`}
                  >
                    <span>Tipe: <strong>{typeComodity}</strong></span>
                  </button>
                )}
              </>
            )}
          </div>
        }
        badge={
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-[var(--color-border)] text-[var(--color-secondary)]">
            {invoices.length} / {totalCount} invoice · {flattenedItems.length} item
          </span>
        }
        onClose={onClose}
      />

      <CustomerHistoryToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        search={search}
        onSearchChange={setSearch}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        selectedBranch={selectedBranch}
        onBranchChange={setSelectedBranch}
        availableBranches={availableBranches}
        selectedTypeComodity={selectedTypeComodity}
        onTypeComodityChange={setSelectedTypeComodity}
        availableComodities={availableComodityTypes}
        selectedModa={selectedModa}
        onModaChange={setSelectedModa}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedDiffStatus={selectedDiffStatus}
        onDiffStatusChange={setSelectedDiffStatus}
        onReset={resetFilters}
        totalCount={totalCount}
      />

      <CustomerHistoryKpiCards
        kpis={kpis}
        selectedTypeComodity={selectedTypeComodity}
        onSelectTypeComodity={setSelectedTypeComodity}
      />

      <Modal.Body noPadding className="flex flex-col min-h-0 bg-[var(--color-surface)]">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[var(--color-secondary)] space-y-2">
            <div className="h-6 w-36 mx-auto rounded-lg skeleton-shimmer" />
            <p>Memuat riwayat tagihan customer dari server...</p>
          </div>
        ) : viewMode === 'invoice' ? (
          <CustomerHistoryInvoiceTable
            invoices={invoices}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={fetchNextPage}
            totalCount={totalCount}
          />
        ) : (
          <CustomerHistoryDetailTable
            items={flattenedItems}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={fetchNextPage}
            totalCount={totalCount}
          />
        )}
      </Modal.Body>

      <Modal.Footer className="justify-between">
        <div className="flex items-center gap-2 text-[11.5px] text-[var(--color-secondary)] tabular-nums">
          <span>
            Menampilkan <strong className="text-[var(--color-primary)]">{loadedCount}</strong> dari{' '}
            <strong className="text-[var(--color-primary)]">{totalCount}</strong>{' '}
            {viewMode === 'invoice' ? 'invoice' : 'rincian item'}
          </span>
          {isFetchingNextPage && (
            <span className="inline-flex items-center gap-1.5 text-[var(--color-tertiary)] font-medium text-[11px] ml-2">
              <div className="w-3 h-3 rounded-full border-2 border-[var(--color-tertiary)] border-t-transparent animate-spin" />
              Memuat data berikutnya...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onClose} className="text-xs font-semibold px-4 py-1.5 cursor-pointer">
            Tutup
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}
