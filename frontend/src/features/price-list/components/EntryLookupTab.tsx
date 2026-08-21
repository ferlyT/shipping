import {
  Search,
  Anchor,
  Plane,
  RotateCcw,
  Calendar,
  Tag,
  Package,
  User,
  MapPin,
  CheckCircle2,
  FileText,
  FileCheck,
  ChevronDown,
  AlertCircle,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CategoryGroupedPriceTable } from './CategoryGroupedPriceTable'
import type { useEntryLookup } from '../hooks/useEntryLookup'

type EntryLookupTabProps = ReturnType<typeof useEntryLookup>

export function EntryLookupTab({
  entrySearchQuery,
  setEntrySearchQuery,
  searchResults,
  isSearchingEntries,
  isDropdownOpen,
  setIsDropdownOpen,
  selectedListCode,
  entryResult,
  isLoadingEntry,
  entryTableSearch,
  setEntryTableSearch,
  dropdownRef,
  searchLimit,
  dropdownLocalSearch,
  setDropdownLocalSearch,
  filteredSearchResults,
  fetchEntries,
  handlePerformEntryLookup,
  handleSelectEntry,
  handleClearEntrySearch,
  selectedComodityName,
  entryTableItems,
  matchedPriceItem,
  allMatchedItemsList,
  matchedCategoriesList,
}: EntryLookupTabProps) {
  return (
    <div className="space-y-5">
      {/* Autocomplete Input Panel */}
      <div className="card rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] shrink-0">
            <Package size={15} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-primary)]">
              Cari Harga Pengiriman dari Basis Data
            </h3>
            <p className="text-xs text-[var(--color-secondary)]">
              Pilih data harga pengiriman untuk memuat konteks Customer, Mode, Cabang, Tanggal Agent, dan Komoditas
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3" ref={dropdownRef}>
          <div className="relative flex-1">
            <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-[var(--color-secondary)] uppercase flex items-center justify-between gap-1 mb-1.5">
              <span className="flex items-center gap-1">
                <Search size={12} />
                PILIH / KETIK DATA PENGIRIMAN (NO. ENTRY / CUSTOMER / MARKING / NO. RESI)
              </span>
              {entrySearchQuery.trim() && (
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">
                  {searchResults.length} pilihan tersedia
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                value={entrySearchQuery}
                onChange={(e) => {
                  setEntrySearchQuery(e.target.value)
                  setIsDropdownOpen(true)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (entrySearchQuery.trim()) {
                      handlePerformEntryLookup(entrySearchQuery)
                    }
                  }
                }}
                onFocus={() => {
                  fetchEntries(entrySearchQuery.trim())
                  setIsDropdownOpen(true)
                }}
                onClick={() => setIsDropdownOpen(true)}
                placeholder="Cari No. Entry, Customer, Marking, atau No. Resi (contoh: 0936218)..."
                className="w-full h-10 pl-9 pr-16 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] font-medium transition-shadow focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 cursor-pointer"
              />
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] pointer-events-none" />

              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {entrySearchQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleClearEntrySearch()
                    }}
                    className="p-1 text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer text-xs font-bold shrink-0"
                    title="Hapus teks pencarian"
                  >
                    ✕
                  </button>
                )}
                {isSearchingEntries ? (
                  <Loader2 className="w-4 h-4 text-[var(--color-primary)] animate-spin" />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="p-1 text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                    title="Tampilkan daftar pengiriman"
                  >
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
            </div>

            {/* Autocomplete Dropdown List */}
            {isDropdownOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg divide-y divide-[var(--color-border)] animate-fadeIn">
                {/* Sticky In-Menu Search Field */}
                <div className="p-2 sticky top-0 z-20 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Filter instan pada data terunduh..."
                      value={dropdownLocalSearch}
                      onChange={(e) => setDropdownLocalSearch(e.target.value)}
                      className="w-full h-8 pl-8 pr-7 text-[11px] rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-[var(--color-primary)] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    />
                    {dropdownLocalSearch && (
                      <button
                        type="button"
                        onClick={() => setDropdownLocalSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] hover:text-[var(--color-primary)] text-xs font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {filteredSearchResults.length === 0 ? (
                  <div className="p-4 text-xs text-center space-y-2.5">
                    <p className="text-[var(--color-secondary)]">
                      Tidak ada entri pengiriman yang cocok dengan filter.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownLocalSearch('')
                        fetchEntries('', 50)
                      }}
                      className="px-3.5 py-1.5 bg-[var(--color-neutral)] hover:bg-[var(--color-border)] text-[var(--color-primary)] font-bold rounded-lg text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw size={13} />
                      Tarik Data Baru dari Database (Muat 50 Data)
                    </button>
                  </div>
                ) : (
                  <>
                    {filteredSearchResults.map((item) => (
                      <button
                        key={item.fdListCode}
                        type="button"
                        onClick={() => handleSelectEntry(item)}
                        className="w-full text-left p-3 hover:bg-[var(--color-neutral)] transition-colors flex flex-col gap-1 cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-[var(--color-primary)] font-mono">
                            {item.fdListCode}
                          </span>
                          {item.customer?.fdCustName && (
                            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                              {item.customer.fdCustName}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[var(--color-secondary)]">
                          {item.fdMarkingCode && (
                            <span>Marking: <strong className="text-[var(--color-primary)] font-mono">{item.fdMarkingCode}</strong></span>
                          )}
                          {item.fdMarkingNo && (
                            <span>No. Marking: <strong className="text-[var(--color-primary)] font-mono">{item.fdMarkingNo}</strong></span>
                          )}
                          {item.fdTerima && (
                            <span>Resi: <strong className="text-[var(--color-primary)] font-mono">{item.fdTerima}</strong></span>
                          )}
                        </div>
                      </button>
                    ))}

                    {/* Load More Button inside Dropdown */}
                    {searchLimit < 100 && (
                      <div className="p-2.5 bg-[var(--color-neutral)]/80 text-center sticky bottom-0 border-t border-[var(--color-border)]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            fetchEntries(entrySearchQuery.trim(), searchLimit + 30)
                          }}
                          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw size={13} />
                          Tarik Data Lebih Banyak ({searchLimit + 30} Data)
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <Button
            variant="primary"
            onClick={() => handlePerformEntryLookup(selectedListCode || entrySearchQuery)}
            disabled={isLoadingEntry || !entrySearchQuery.trim()}
            className="h-10 text-xs px-5 font-semibold gap-1.5 shrink-0"
          >
            {isLoadingEntry ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Search size={14} />
            )}
            Cek Harga
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoadingEntry && (
        <div className="p-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center gap-3">
          <LoadingSpinner message="Memuat konteks pengiriman & harga yang berlaku..." />
        </div>
      )}

      {/* Entry Context Summary Card */}
      {entryResult?.found && !isLoadingEntry && (
        <div className="space-y-4 animate-fadeIn">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2 flex-wrap">
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                <span className="text-sm font-bold font-mono text-[var(--color-primary)]">
                  {entryResult.fdListCode}
                </span>
                <Badge variant={entryResult.expectedMode === 'BY AIR' ? 'info' : 'default'}>
                  {entryResult.expectedMode === 'BY SEA' ? (
                    <Anchor size={12} className="inline mr-1" />
                  ) : (
                    <Plane size={12} className="inline mr-1" />
                  )}
                  {entryResult.expectedMode || 'MODE N/A'}
                </Badge>
                {entryResult.expectedBranch && (
                  <Badge variant="default" className="font-semibold">
                    Cabang: {entryResult.expectedBranch}
                  </Badge>
                )}
              </div>

              {entryResult.priceValidation?.effectiveDate && (
                <div className="text-xs text-[var(--color-secondary)]">
                  Price List Berlaku:{' '}
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatDate(entryResult.priceValidation.effectiveDate)}
                  </span>
                </div>
              )}
            </div>

            {/* Entry Meta Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="bg-[var(--color-neutral)]/60 p-2.5 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] flex items-center gap-1">
                  <User size={11} /> Customer
                </span>
                <p className="font-semibold text-[var(--color-primary)] mt-0.5 truncate">
                  {entryResult.customer?.fdCustName || '—'}
                  {entryResult.customer?.fdCustCode && (
                    <span className="text-[10px] font-normal text-[var(--color-secondary)] ml-1">
                      ({entryResult.customer.fdCustCode})
                    </span>
                  )}
                </p>
              </div>

              <div className="bg-[var(--color-neutral)]/60 p-2.5 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] flex items-center gap-1">
                  <Tag size={11} /> Marking Code / No
                </span>
                <p className="font-semibold text-[var(--color-primary)] mt-0.5 font-mono truncate">
                  {entryResult.fdMarkingCode || '—'}{' '}
                  {entryResult.fdMarkingNo ? `/ ${entryResult.fdMarkingNo}` : ''}
                </p>
              </div>

              <div className="bg-[var(--color-neutral)]/60 p-2.5 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] flex items-center gap-1">
                  <Calendar size={11} /> Tanggal Agent
                </span>
                <p className="font-semibold text-[var(--color-primary)] mt-0.5">
                  {entryResult.fdTglAgent ? formatDate(entryResult.fdTglAgent) : '—'}
                </p>
              </div>

              <div className="bg-[var(--color-neutral)]/60 p-2.5 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] flex items-center gap-1">
                  <MapPin size={11} /> Mode Expected
                </span>
                <p className="font-semibold text-[var(--color-primary)] mt-0.5">
                  {entryResult.expectedMode || 'Semua'}
                </p>
              </div>

              <div className="bg-[var(--color-neutral)]/60 p-2.5 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] flex items-center gap-1">
                  <MapPin size={11} /> Cabang Expected
                </span>
                <p className="font-semibold text-[var(--color-primary)] mt-0.5">
                  {entryResult.expectedBranch || 'Semua'}
                </p>
              </div>

              {/* Jenis Komoditas — read-only, diambil dari data pengiriman itu sendiri.
                  Tidak ada pemilihan manual: halaman ini hanya mencari berdasarkan data. */}
              <div className="bg-[var(--color-neutral)]/60 p-2.5 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] flex items-center gap-1">
                  <Tag size={11} /> Jenis Komoditas
                </span>
                <p className="font-semibold text-[var(--color-primary)] mt-0.5 truncate">
                  {selectedComodityName || '—'}
                </p>
              </div>
            </div>

            {/* Aturan Prioritas Harga (4-Level Precedence Pricing Rule Badge) */}
            {entryResult.appliedRule && entryResult.appliedRule !== 'NONE' && (
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {entryResult.appliedRule === 'CUSTOMER_MARKING' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold shadow-2xs">
                    <Sparkles size={13} className="text-purple-600 dark:text-purple-400" />
                    Level 1: Tarif Khusus Customer & Agen ({entryResult.fdMarkingCode}) — Override Aktif
                  </span>
                )}
                {entryResult.appliedRule === 'CUSTOMER_DEFAULT' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold shadow-2xs">
                    <User size={13} className="text-blue-600 dark:text-blue-400" />
                    Level 2: Tarif Khusus Customer Standar
                  </span>
                )}
                {entryResult.appliedRule === 'GENERAL_MARKING' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold shadow-2xs">
                    <Tag size={13} className="text-amber-600 dark:text-amber-400" />
                    Level 3: Tarif Price List Umum Khusus Agen ({entryResult.fdMarkingCode}) — Override Aktif
                  </span>
                )}
                {entryResult.appliedRule === 'GENERAL_DEFAULT' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium shadow-2xs">
                    <FileCheck size={13} className="text-slate-500" />
                    Level 4: Tarif Price List Umum Standar
                  </span>
                )}
              </div>
            )}

            {/* Highlighted Matched Price Result Banner */}
            {matchedPriceItem ? (
              <div className="pt-2">
                <div className="relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-emerald-500/[0.05] animate-fadeIn">
                  <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500" aria-hidden />
                  <div className="flex flex-wrap items-center justify-between gap-3 pl-4 pr-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[var(--color-primary)]">
                            {selectedComodityName}
                          </span>
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded font-semibold border border-emerald-200 dark:border-emerald-800">
                            Terhubung ke: {matchedCategoriesList && matchedCategoriesList.length > 0 ? matchedCategoriesList.join(' & ') : matchedPriceItem.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--color-secondary)] mt-0.5">
                          Mode: <strong className="text-[var(--color-primary)]">{matchedPriceItem.mode}</strong>
                          {' · '}Cabang: <strong className="text-[var(--color-primary)]">{matchedPriceItem.branch}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] font-bold text-[var(--color-secondary)] uppercase block">
                        Tarif Spesifik per Sheet Type
                      </span>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {allMatchedItemsList.map((item: any) => (
                          <div key={item.sheetType} className="flex items-center gap-1.5 bg-emerald-500/15 dark:bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                            <Badge variant="default" className="font-mono text-[10px] px-1.5 py-0">
                              {item.sheetType}
                            </Badge>
                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                              {item.minPrice === item.maxPrice
                                ? formatCurrency(item.minPrice)
                                : `${formatCurrency(item.minPrice)} – ${formatCurrency(item.maxPrice)}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : selectedComodityName ? (
              <div className="pt-1">
                <div className="relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-amber-500/[0.05] animate-fadeIn">
                  <div className="absolute inset-y-0 left-0 w-1 bg-amber-500" aria-hidden />
                  <div className="flex items-center gap-2 pl-4 pr-4 py-3 text-xs text-amber-700 dark:text-amber-300">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>Belum ada tarif yang persis cocok untuk komoditas "{selectedComodityName}". Lihat daftar lengkap master tarif di bawah.</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Price Items Grouped Matching Table */}
          <CategoryGroupedPriceTable
            items={entryTableItems}
            totalOriginalCount={entryResult.priceValidation?.items?.length || 0}
            searchQuery={entryTableSearch}
            onSearchChange={setEntryTableSearch}
            selectedComodityName={selectedComodityName}
            emptyMessage={
              entryTableSearch
                ? 'Tidak ada tarif yang cocok dengan pencarian.'
                : 'Tidak ada data master price list yang berlaku.'
            }
          />
        </div>
      )}

      {/* Empty State when lookup yielded no entry */}
      {entryResult && !entryResult.found && !isLoadingEntry && (
        <EmptyState
          title="Data Pengiriman Tidak Ditemukan"
          description={`Tidak ditemukan data pengiriman dengan nomor entry "${entryResult.fdListCode}".`}
        />
      )}

      {/* Default view before any lookup */}
      {!entryResult && !isLoadingEntry && (
        <div className="p-12 text-center border-2 border-dashed border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)]/60 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mx-auto">
            <FileText size={24} />
          </div>
          <h4 className="text-sm font-bold text-[var(--color-primary)]">
            Cari & Verifikasi Harga Pengiriman
          </h4>
          <p className="text-xs text-[var(--color-secondary)] max-w-md mx-auto">
            Ketik Nomor Entry (`fdListCode`), Nama Customer, Code/No. Marking, atau Nomor Resi (`fdTerima`) pada kotak pencarian di atas untuk memulai.
          </p>
        </div>
      )}
    </div>
  )
}
