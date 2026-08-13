import { Link } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'
import {
  Search,
  AlertCircle,
  CheckCircle2,
  Anchor,
  Plane,
  X,
  ExternalLink,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'
import { ModeSegmentedControl } from '../components/ModeSegmentedControl'
import { BranchPillToggle } from '../components/BranchPillToggle'
import { CategoryMultiCombobox } from '../components/CategoryMultiCombobox'
import { useCustomerPriceLookup } from '../hooks/useCustomerPriceLookup'

export function PriceLookupPage() {
  const { t } = useTranslation()
  const {
    isLoadingCustomers,
    globalBranches,
    isLoadingFilters,
    custCode,
    setCustCode,
    custName,
    targetDate,
    setTargetDate,
    modeFilter,
    setModeFilter,
    branchFilter,
    setBranchFilter,
    categoriesFilter,
    setCategoriesFilter,
    search,
    setSearch,
    showDropdown,
    setShowDropdown,
    loading,
    hasSearched,
    result,
    error,
    tableSearch,
    setTableSearch,
    availableCategories,
    filteredCustomers,
    handleSelectCustomer,
    isFiltered,
    handleResetAll,
    handleLookup,
    filteredItems,
  } = useCustomerPriceLookup()

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0 space-y-5 bg-[var(--color-surface)] font-[var(--font-body)] animate-fadeIn pb-24">
      {/* Page Header */}
      <PageHeader
        title="Pencarian Harga Customer"
        subtitle="Cek tarif khusus customer per tanggal & spesifikasi pengiriman"
        breadcrumbs={[
          { label: t('module.finance'), path: ROUTES.BILLING },
          { label: t('nav.customerPriceList'), path: ROUTES.CUSTOMER_PRICE_LIST },
          { label: 'Cari Harga' },
        ]}
      />

      {/* Filter Card — Mirror DashboardFilters Layout */}
      <div className="card p-4 sm:p-5 rounded-2xl shadow-xs border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-surface)]/80 space-y-4">
        {/* Top Header Bar inside Filter Card */}
        <div className="flex items-center justify-between gap-2.5 pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-2 shrink-0 pl-1.5 pr-2.5 py-1.5 -ml-1.5 -my-1 rounded-lg">
              <div className="relative shrink-0 flex items-center justify-center w-6 h-6 rounded-md bg-[var(--color-tertiary)]/10">
                <SlidersHorizontal size={13} className="text-[var(--color-tertiary)]" />
                {isFiltered && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--color-tertiary)] ring-2 ring-[var(--color-surface)]"
                  />
                )}
              </div>
              <span className="text-[0.82rem] font-semibold text-[var(--color-primary)]">Filter Data</span>
            </div>
            {isFiltered && (
              <button
                type="button"
                onClick={handleResetAll}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[0.75rem] font-medium text-[var(--color-tertiary)] hover:bg-[var(--color-tertiary)]/10 transition-colors cursor-pointer"
              >
                <RotateCcw size={11} />
                Reset
              </button>
            )}
          </div>

          <Button
            type="button"
            onClick={handleLookup}
            disabled={!custCode || loading}
            size="sm"
            className="px-5 h-9"
          >
            {loading ? (
              <span className="flex items-center gap-1.5 text-xs">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Mencari...
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <Search size={14} /> Cari Harga
              </span>
            )}
          </Button>
        </div>

        {/* Row 1: Primary Inputs (Customer & Tanggal Acuan) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Customer Input */}
          <div className="md:col-span-7 flex flex-col gap-1.5">
            <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-[var(--color-secondary)] uppercase">
              CUSTOMER <span className="text-rose-500">*</span>
            </label>
            {!custCode ? (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setShowDropdown(true)
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Pilih dari daftar Price List Customer..."
                  className="form-input py-2 pl-9 pr-4 text-sm w-full border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] h-9 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                />
                {showDropdown && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {isLoadingCustomers ? (
                      <div className="p-3 text-xs text-center text-slate-500">Memuat customer...</div>
                    ) : filteredCustomers.length > 0 ? (
                      filteredCustomers.map((c) => (
                        <button
                          key={c.fdCustCode}
                          type="button"
                          onClick={() => handleSelectCustomer(c)}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 text-xs flex justify-between items-center border-b border-slate-50 last:border-0 cursor-pointer"
                        >
                          <div>
                            <span className="font-semibold text-slate-800">{c.fdCustCode}</span>
                            <span className="text-slate-500 ml-1.5">— {c.custName || '-'}</span>
                          </div>
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-mono font-medium">
                            {c.itemCount} item
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-xs text-center text-slate-500">
                        Tidak ada customer dengan Price List
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between px-3 h-9 bg-blue-50/80 border border-blue-200 rounded-lg text-xs">
                <span className="font-semibold text-blue-900 truncate">
                  {custCode} <span className="text-blue-700 font-normal">— {custName}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCustCode('')
                  }}
                  className="text-blue-600 hover:text-blue-800 ml-2 shrink-0 flex items-center gap-0.5 font-medium cursor-pointer"
                >
                  <X size={14} /> Ganti
                </button>
              </div>
            )}
          </div>

          {/* Date Picker */}
          <div className="md:col-span-5 flex flex-col gap-1.5">
            <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-[var(--color-secondary)] uppercase">
              TANGGAL ACUAN <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="form-input py-2 px-3 text-sm w-full border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] h-9 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        {/* Row 2: Filter Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 pt-1">
          {/* MODE */}
          <div className="lg:col-span-3">
            <ModeSegmentedControl value={modeFilter} onChange={setModeFilter} />
          </div>

          {/* CABANG */}
          <div className="lg:col-span-4">
            <BranchPillToggle
              value={branchFilter}
              onChange={setBranchFilter}
              options={globalBranches.length > 0 ? globalBranches : ['GZ', 'HK', 'SG', 'SH', 'SZ', 'YW']}
            />
          </div>

          {/* KATEGORI BARANG (MULTI-SELECT) */}
          <div className="lg:col-span-5">
            <CategoryMultiCombobox
              value={categoriesFilter}
              onChange={setCategoriesFilter}
              options={availableCategories}
              loading={isLoadingFilters}
              modeLabel={modeFilter || undefined}
            />
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Results Section */}
      {hasSearched && !loading && result && (
        <div className="space-y-3 animate-fadeIn">
          {!result.found ? (
            /* Not Found Alert */
            <div className="card border border-amber-200 bg-amber-50/70 rounded-xl p-4 text-center space-y-2">
              <AlertCircle size={20} className="text-amber-600 mx-auto" />
              <div className="space-y-0.5">
                <h3 className="font-semibold text-slate-800 text-sm">Price List Khusus Tidak Ditemukan</h3>
                <p className="text-slate-600 text-xs">
                  Customer <span className="font-semibold text-slate-900">{result.fdCustCode}</span> tidak memiliki Price List khusus yang berlaku per <span className="font-semibold text-slate-900">{formatDate(result.targetDate)}</span>.
                </p>
              </div>
              <p className="text-[0.7rem] text-slate-500 italic">
                Sistem akan otomatis menggunakan General Price List.
              </p>
            </div>
          ) : (
            /* Found Result View */
            <div className="space-y-3">
              {/* Compact Header Bar */}
              <div className="card border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    <CheckCircle2 size={13} /> Price List Khusus Aktif
                  </span>
                  <span className="text-[var(--color-secondary)] font-mono">
                    File: <strong className="text-[var(--color-primary)]">{result.uploadInfo?.fileName}</strong>
                  </span>
                  <span className="text-[var(--color-secondary)]">
                    · Effective: <strong className="text-[var(--color-primary)]">{formatDate(result.uploadInfo?.effectiveDate)}</strong>
                  </span>
                </div>
                {result.uploadInfo && (
                  <Link
                    to={`/mshipping/finance/customer-price-list/uploads/${result.uploadInfo.uploadId}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 shrink-0"
                  >
                    <span>Full Diff</span>
                    <ExternalLink size={12} />
                  </Link>
                )}
              </div>

              {/* Table Toolbar & Search */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Filter hasil tabel..."
                    className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <span className="text-[0.7rem] text-[var(--color-secondary)] font-mono">
                  Menampilkan {filteredItems.length} dari {result.items.length} item
                </span>
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-xs text-left">
                    <thead className="bg-[var(--color-neutral)] text-[var(--color-secondary)] uppercase font-semibold text-[0.68rem] tracking-wider border-b border-[var(--color-border)]">
                      <tr>
                        <th className="px-4 py-2.5">Mode</th>
                        <th className="px-4 py-2.5">Branch</th>
                        <th className="px-4 py-2.5">Kategori</th>
                        <th className="px-4 py-2.5">Estimasi Transit</th>
                        <th className="px-4 py-2.5 text-right">Harga Tarif</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.68rem] font-semibold uppercase ${
                                item.mode.toUpperCase().includes('SEA')
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                              }`}
                            >
                              {item.mode.toUpperCase().includes('SEA') ? <Anchor size={11} /> : <Plane size={11} />}
                              {item.mode}
                            </span>
                          </td>
                          <td className="px-4 py-2 font-semibold text-slate-800 font-mono">{item.branch}</td>
                          <td className="px-4 py-2 text-slate-700">{item.category}</td>
                          <td className="px-4 py-2 text-slate-500">{item.transitTime || '—'}</td>
                          <td className="px-4 py-2 text-right font-semibold font-mono text-emerald-700">
                            {formatCurrency(item.price)}
                          </td>
                        </tr>
                      ))}
                      {filteredItems.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-500 text-xs">
                            Tidak ada tarif yang sesuai dengan filter yang dipilih.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
