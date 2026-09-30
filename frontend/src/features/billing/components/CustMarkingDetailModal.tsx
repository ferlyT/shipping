import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToastStore } from '@/stores/toastStore'
import { useCustMarkingData } from './cust-marking-detail/useCustMarkingData'
import { CustMarkingHeaderToolbar } from './cust-marking-detail/CustMarkingHeaderToolbar'
import { CustMarkingSummaryBanner } from './cust-marking-detail/CustMarkingSummaryBanner'
import { CustMarkingDataTable } from './cust-marking-detail/CustMarkingDataTable'
import { exportCustMarkingToExcel } from './cust-marking-detail/custMarkingExcel'
import type { CustMarkingDetailModalProps } from './cust-marking-detail/types'

export type { CustMarkingDetailModalProps }

export function CustMarkingDetailModal({
  isOpen,
  onClose,
  custCode,
  custName: propCustName,
  markingCode,
}: CustMarkingDetailModalProps) {
  const { addToast } = useToastStore()
  const [isExporting, setIsExporting] = useState(false)

  const {
    normalizedRows,
    filteredRows,
    sortedRows,
    aggregates,
    branches,
    selectedCommodityType,
    setSelectedCommodityType,
    rasioValue,
    displayCustName,
    isLoading,
    isError,
    refetch,
    search,
    setSearch,
    selectedBranch,
    setSelectedBranch,
    onlyKomplain,
    setOnlyKomplain,
    columnPreset,
    setColumnPreset,
    sortField,
    sortOrder,
    handleSort,
  } = useCustMarkingData(isOpen, custCode, propCustName, markingCode)

  const handleExport = async () => {
    if (sortedRows.length === 0) {
      addToast({ type: 'warning', message: 'Tidak ada data untuk diekspor' })
      return
    }

    try {
      setIsExporting(true)
      addToast({ type: 'info', message: 'Menyiapkan berkas Excel...' })
      await exportCustMarkingToExcel({
        rows: sortedRows,
        custName: displayCustName,
        custCode,
        markingCode,
      })
      addToast({ type: 'success', message: 'Berkas Excel berhasil diunduh' })
    } catch (err) {
      addToast({ type: 'error', message: 'Gagal mengunduh berkas Excel' })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      className="h-[840px] max-h-[94vh] w-[98vw] max-w-[98vw] flex flex-col"
      zIndex="z-[100]"
    >
      <Modal.Header
        title="Detail Fisik & Tagihan Per Marking"
        subtitle={
          <span>
            Customer: <strong className="text-[var(--color-primary)]">{displayCustName}</strong> · Marking:{' '}
            <strong className="text-[var(--color-primary)]">{markingCode || 'Semua'}</strong>
          </span>
        }
        badge={
          <div className="flex items-center gap-2">
            {branches.length > 1 && (
              <span
                className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                title={`Peringatan: Terdeteksi ${branches.length} cabang (${branches.join(', ')})`}
              >
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                Multi-Cabang: {branches.join(', ')}
              </span>
            )}
            {aggregates.countQtyKomplainMismatch > 0 && (
              <span
                className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse"
                title={`Peringatan: ${aggregates.countQtyKomplainMismatch} baris data Qty Komplain berbeda dengan Qty Gudang`}
              >
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                Selisih Qty K ({aggregates.countQtyKomplainMismatch})
              </span>
            )}
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-[var(--color-border)] text-[var(--color-secondary)]">
              {filteredRows.length} baris data
            </span>
          </div>
        }
        onClose={onClose}
      />

      <CustMarkingHeaderToolbar
        search={search}
        onSearchChange={setSearch}
        columnPreset={columnPreset}
        onColumnPresetChange={setColumnPreset}
        branches={branches}
        selectedBranch={selectedBranch}
        onBranchSelect={setSelectedBranch}
        onlyKomplain={onlyKomplain}
        onToggleKomplain={() => setOnlyKomplain((prev) => !prev)}
        onExportExcel={handleExport}
        isExporting={isExporting}
        totalAll={normalizedRows.length}
        hasSelisihCount={aggregates.countSelisih}
        countQtyKomplainMismatch={aggregates.countQtyKomplainMismatch}
      />

      <CustMarkingSummaryBanner
        aggregates={aggregates}
        rasioValue={rasioValue}
        isAirMode={normalizedRows.some((r) => r.listType === 1)}
        selectedCommodityType={selectedCommodityType}
        onSelectCommodityType={setSelectedCommodityType}
      />

      <Modal.Body noPadding className="flex flex-col min-h-0 flex-1 overflow-hidden bg-[var(--color-surface)]">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-xs text-[var(--color-secondary)] space-y-2">
            <div className="h-6 w-36 mx-auto rounded-lg skeleton-shimmer" />
            <p>Memuat data fisik & marking dari server...</p>
          </div>
        ) : isError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-rose-500 space-y-2">
            <p>Terjadi kesalahan saat memuat data marking.</p>
            <Button size="sm" variant="secondary" onClick={() => refetch()}>
              Coba Lagi
            </Button>
          </div>
        ) : (
          <CustMarkingDataTable
            rows={sortedRows}
            columnPreset={columnPreset}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
        )}
      </Modal.Body>

      <Modal.Footer className="justify-between">
        <div className="text-[11.5px] text-[var(--color-secondary)] tabular-nums">
          Menampilkan <strong className="text-[var(--color-primary)]">{sortedRows.length}</strong> dari{' '}
          {normalizedRows.length} total baris
        </div>
        <Button variant="secondary" size="sm" onClick={onClose} className="text-xs font-semibold px-4 py-1.5">
          Tutup
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
