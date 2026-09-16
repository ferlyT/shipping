import { useState } from 'react'
import { formatCurrency, formatDecimal, formatNumber, formatCompactRupiah } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { CustomerHistoryKpiSummary } from './types'

export interface CustomerHistoryKpiCardsProps {
  kpis: CustomerHistoryKpiSummary
  selectedTypeComodity?: string
  onSelectTypeComodity?: (comodity: string) => void
}

export function CustomerHistoryKpiCards({
  kpis,
  selectedTypeComodity = 'all',
  onSelectTypeComodity,
}: CustomerHistoryKpiCardsProps) {
  const [showBreakdownModal, setShowBreakdownModal] = useState(false)

  const {
    totalInvoices,
    totalItems,
    totalAmount,
    totalM3,
    totalWeight,
    avgPricePerM3,
    diffInvoicesCount,
    commodityAvgRates = [],
    activeCommodityRate,
  } = kpis

  // Sort commodities by total volume M3 desc
  const m3Commodities = commodityAvgRates.filter((c) => c.totalM3 > 0 || c.avgPricePerM3 > 0)
  const isFiltered = selectedTypeComodity !== 'all'

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 p-3.5 sm:p-4 bg-[var(--color-surface)] border-b border-[var(--color-border)] shrink-0">
        {/* 1. Total Tagihan */}
        <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/20 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] block">
              Total Nilai Tagihan
            </span>
            <div className="text-[17px] sm:text-[19px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5 truncate">
              {formatCurrency(totalAmount)}
            </div>
          </div>
          <span className="text-[11px] text-[var(--color-secondary)] mt-1">
            {formatNumber(totalInvoices)} invoice · {formatNumber(totalItems)} rincian
          </span>
        </div>

        {/* 2. Total Volume & Berat */}
        <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/20 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] block">
              Total Muatan Fisik
            </span>
            <div className="text-[17px] sm:text-[19px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
              {formatDecimal(totalM3, 3)} <span className="text-xs font-normal">m³</span>
            </div>
          </div>
          <span className="text-[11px] text-[var(--color-secondary)] mt-1">
            Berat: {formatNumber(totalWeight)} kg
          </span>
        </div>

        {/* 3. Rata-rata Tarif / M³ per Tipe Komoditas */}
        <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/20 flex flex-col justify-between min-h-[92px]">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] truncate">
                {isFiltered ? `Tarif / M³ · ${selectedTypeComodity}` : 'Rata-rata Tarif / M³'}
              </span>
              {m3Commodities.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowBreakdownModal(true)}
                  title="Klik untuk melihat perbandingan tarif semua komoditas"
                  className="text-[9.5px] px-1.5 py-0.5 rounded font-semibold border border-[var(--color-border)] text-[var(--color-tertiary)] hover:border-[var(--color-tertiary)] bg-[var(--color-surface)]/80 cursor-pointer transition-colors shrink-0"
                >
                  {m3Commodities.length} Tipe ↗
                </button>
              )}
            </div>

            {/* Nilai Tarif Utama */}
            <div className="text-[17px] sm:text-[19px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5 truncate">
              {isFiltered && activeCommodityRate ? (
                activeCommodityRate.avgPricePerM3 > 0 ? (
                  formatCurrency(activeCommodityRate.avgPricePerM3)
                ) : (
                  '—'
                )
              ) : avgPricePerM3 > 0 ? (
                formatCurrency(avgPricePerM3)
              ) : (
                '—'
              )}
            </div>
          </div>

          {/* Subline / Per-Commodity Pill List */}
          {isFiltered && activeCommodityRate ? (
            <div className="flex items-center justify-between text-[11px] text-[var(--color-secondary)] mt-1">
              <span className="truncate">
                Vol: <strong>{formatDecimal(activeCommodityRate.totalM3, 3)} m³</strong> ({activeCommodityRate.invoiceCount} inv)
              </span>
              <button
                type="button"
                onClick={() => onSelectTypeComodity?.('all')}
                className="text-[10.5px] text-[var(--color-tertiary)] hover:underline ml-1 cursor-pointer shrink-0 font-medium"
              >
                Semua Tipe
              </button>
            </div>
          ) : m3Commodities.length > 1 ? (
            <div className="flex flex-wrap gap-1 mt-1.5 max-h-[38px] overflow-y-auto pr-0.5 custom-scrollbar">
              {m3Commodities.slice(0, 4).map((cr) => {
                const isSelected = selectedTypeComodity.toUpperCase() === cr.typeComodityName.toUpperCase()
                return (
                  <button
                    key={cr.typeComodityName}
                    type="button"
                    onClick={() => onSelectTypeComodity?.(isSelected ? 'all' : cr.typeComodityName)}
                    title={`Klik untuk filter ${cr.typeComodityName}: Rp ${formatNumber(cr.avgPricePerM3)}/m³ (${formatDecimal(cr.totalM3, 2)} m³)`}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--color-tertiary)] bg-transparent text-[var(--color-tertiary)] font-bold'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)]/80 text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-border-strong)]'
                    }`}
                  >
                    <span className="truncate max-w-[70px]">{cr.typeComodityName}:</span>
                    <strong className="text-[var(--color-primary)] tabular-nums">
                      {cr.avgPricePerM3 > 0 ? formatCompactRupiah(cr.avgPricePerM3) : '—'}
                    </strong>
                  </button>
                )
              })}
              {m3Commodities.length > 4 && (
                <button
                  type="button"
                  onClick={() => setShowBreakdownModal(true)}
                  className="px-1 py-0.5 text-[9px] text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
                >
                  +{m3Commodities.length - 4} lagi
                </button>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-[var(--color-secondary)] mt-1 truncate">
              {m3Commodities[0] ? `${m3Commodities[0].typeComodityName} · ${formatDecimal(m3Commodities[0].totalM3, 2)} m³` : 'Efektif per kubikasi'}
            </span>
          )}
        </div>

        {/* 4. Revisi / Penyesuaian */}
        <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/20 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] block">
              Audit Penyesuaian
            </span>
            <div className="text-[17px] sm:text-[19px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
              {diffInvoicesCount > 0 ? (
                <span className="text-amber-500 font-bold">{diffInvoicesCount} Invoice</span>
              ) : (
                <span className="text-emerald-500 font-semibold">0 Revisi</span>
              )}
            </div>
          </div>
          <span className="text-[11px] text-[var(--color-secondary)] mt-1">
            {diffInvoicesCount > 0 ? 'Pernah disesuaikan' : 'Seluruhnya sesuai'}
          </span>
        </div>
      </div>

      {/* Modal Detail Rincian Tarif per Tipe Komoditas */}
      {showBreakdownModal && (
        <Modal
          isOpen={showBreakdownModal}
          onClose={() => setShowBreakdownModal(false)}
          size="md"
          zIndex="z-[110]"
        >
          <Modal.Header
            title="Rata-rata Tarif / M³ per Tipe Komoditas"
            subtitle="Ringkasan komprehensif tarif kubikasi berdasarkan tipe komoditas barang"
            badge={
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-[var(--color-border)] text-[var(--color-secondary)]">
                {m3Commodities.length} Tipe Komoditas
              </span>
            }
            onClose={() => setShowBreakdownModal(false)}
          />

          <Modal.Body className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-[var(--font-body)]">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-neutral)]/40 text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                    <th className="py-2.5 px-3.5">Tipe Komoditas</th>
                    <th className="py-2.5 px-3 text-right">Rata-rata Tarif / M³</th>
                    <th className="py-2.5 px-3 text-right">Volume (M³)</th>
                    <th className="py-2.5 px-3 text-right">Total Tagihan</th>
                    <th className="py-2.5 px-3 text-center">Invoice</th>
                    <th className="py-2.5 px-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] text-[12px] tabular-nums">
                  {m3Commodities.map((cr) => {
                    const isSelected = selectedTypeComodity.toUpperCase() === cr.typeComodityName.toUpperCase()
                    return (
                      <tr
                        key={cr.typeComodityName}
                        className={`hover:bg-[var(--color-neutral)]/30 transition-colors ${
                          isSelected ? 'bg-[var(--color-tertiary)]/5' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3.5 font-medium text-[var(--color-primary)]">
                          <div className="flex items-center gap-1.5">
                            <span>{cr.typeComodityName}</span>
                            {isSelected && (
                              <span className="text-[9.5px] px-1.5 py-0.2 rounded font-bold border border-[var(--color-tertiary)] text-[var(--color-tertiary)]">
                                Aktif
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[var(--color-primary)]">
                          {cr.avgPricePerM3 > 0 ? formatCurrency(cr.avgPricePerM3) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[var(--color-secondary)]">
                          {formatDecimal(cr.totalM3, 3)} m³
                        </td>
                        <td className="py-2.5 px-3 text-right text-[var(--color-secondary)]">
                          {formatCurrency(cr.totalAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-center text-[var(--color-secondary)]">
                          {cr.invoiceCount}
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <Button
                            size="sm"
                            variant={isSelected ? 'secondary' : 'ghost'}
                            onClick={() => {
                              onSelectTypeComodity?.(isSelected ? 'all' : cr.typeComodityName)
                              setShowBreakdownModal(false)
                            }}
                            className={`text-[11px] font-semibold px-2 py-1 h-auto cursor-pointer ${
                              isSelected
                                ? 'border-[var(--color-tertiary)] text-[var(--color-tertiary)] bg-transparent'
                                : ''
                            }`}
                          >
                            {isSelected ? 'Batal' : 'Pilih'}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--color-border-strong)] bg-[var(--color-neutral)]/20 text-[12px] font-bold tabular-nums">
                    <td className="py-2.5 px-3.5 text-[var(--color-primary)]">Total / Rata-rata Gabungan</td>
                    <td className="py-2.5 px-3 text-right text-[var(--color-primary)]">
                      {avgPricePerM3 > 0 ? formatCurrency(avgPricePerM3) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[var(--color-primary)]">
                      {formatDecimal(totalM3, 3)} m³
                    </td>
                    <td className="py-2.5 px-3 text-right text-[var(--color-primary)]">
                      {formatCurrency(totalAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-center text-[var(--color-primary)]">{totalInvoices}</td>
                    <td className="py-2.5 px-3.5 text-center">
                      {isFiltered && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectTypeComodity?.('all')
                            setShowBreakdownModal(false)
                          }}
                          className="text-[11px] text-[var(--color-tertiary)] underline cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Modal.Body>

          <Modal.Footer className="justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowBreakdownModal(false)}
              className="text-xs font-semibold px-4 py-1.5"
            >
              Tutup
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  )
}
