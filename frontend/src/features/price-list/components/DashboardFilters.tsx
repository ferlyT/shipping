import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import { Search, ChevronDown, SlidersHorizontal, RotateCcw, Anchor, Plane, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FilterOptions } from "../types";

// ============================================================================
// HOOK — perhitungan tinggi dropdown
// ============================================================================
function useDropdownMaxHeight(open: boolean, triggerRef: React.RefObject<HTMLButtonElement | null>) {
  const [maxHeight, setMaxHeight] = useState(320);

  useEffect(() => {
    if (!open) return;

    function recompute() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const bottomSafeArea = 88;
      const topSafeArea = 12;
      const available = viewportHeight - rect.bottom - bottomSafeArea;
      setMaxHeight(Math.max(160, Math.min(available, viewportHeight - topSafeArea)));
    }

    recompute();
    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, true);
    window.visualViewport?.addEventListener("resize", recompute);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
      window.visualViewport?.removeEventListener("resize", recompute);
    };
  }, [open, triggerRef]);

  return maxHeight;
}

// ============================================================================
// SUMMARY CHIP — potongan ringkasan filter saat panel diciutkan
// ============================================================================
function SummaryChip({ label, muted = false }: { label: string; muted?: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-md text-[0.72rem] font-medium truncate max-w-[9rem] sm:max-w-[11rem] ${muted ? "bg-[var(--color-neutral)] text-[var(--color-secondary)]/80 italic" : "bg-[var(--color-neutral)] text-[var(--color-primary)]"
        }`}
    >
      {label}
    </span>
  );
}

// ============================================================================
// DASHBOARD FILTERS — komponen utama: header, ringkasan, dan panel filter
// ============================================================================
export function DashboardFilters({
  options,
  optionsLoading,
  mode,
  setMode,
  categories,
  setCategories,
  branch,
  setBranch,
  branchOptions,
  categoryOptions,
  categoriesLoading,
}: {
  options: FilterOptions | null;
  optionsLoading: boolean;
  sheetTypes?: string[];
  setSheetTypes?: (v: string[]) => void;
  mode: string;
  setMode: (v: string) => void;
  categories: string[];
  setCategories: (v: string[]) => void;
  branch: string;
  setBranch: (v: string) => void;
  branchOptions?: string[];
  categoryOptions: string[];
  categoriesLoading: boolean;
}) {
  const [filtersExpanded, setFiltersExpanded] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia("(min-width: 640px)").matches
  );
  const [panelSettled, setPanelSettled] = useState(filtersExpanded);

  const isFiltered =
    !!branch ||
    (categoryOptions.length > 0 && !(categories.length === 1 && categories[0] === categoryOptions[0]));

  useEffect(() => {
    if (filtersExpanded) {
      const t = setTimeout(() => setPanelSettled(true), 300);
      return () => clearTimeout(t);
    }
    setPanelSettled(false);
  }, [filtersExpanded]);

  return (
    <div className="sticky top-2 sm:top-4 z-20">
      <div className="card p-4 sm:p-5 rounded-2xl shadow-xs border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-surface)]/80">
        <div
          className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 transition-all duration-300 ${filtersExpanded ? "mb-4 pb-3 border-b border-[var(--color-border)]" : ""
            }`}
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFiltersExpanded((v) => !v)}
              aria-expanded={filtersExpanded}
              className="flex items-center gap-2 shrink-0 pl-1.5 pr-2.5 py-1.5 -ml-1.5 -my-1 rounded-lg hover:bg-[var(--color-neutral)] transition-colors"
            >
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
              <ChevronDown
                size={14}
                className={`text-[var(--color-secondary)] transition-transform duration-150 ${filtersExpanded ? "rotate-180" : ""}`}
              />
            </button>
            {isFiltered && (
              <button
                type="button"
                onClick={() => {
                  const defaultMode = options?.modes?.find((m) => m.toLowerCase().includes('sea')) ?? options?.modes?.[0] ?? mode;
                  const defaultBranch = (branchOptions ?? options?.branches ?? []).find((b) => b.toLowerCase() === 'gz') ?? 'GZ';
                  const defaultCat = categoryOptions.find((c) => /general|good|cargo|umum/i.test(c)) ?? categoryOptions[0];
                  setMode(defaultMode);
                  setBranch(defaultBranch);
                  setCategories(defaultCat ? [defaultCat] : []);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[0.75rem] font-medium text-[var(--color-tertiary)] hover:bg-[var(--color-tertiary)]/10 transition-colors"
              >
                <RotateCcw size={11} />
                Reset
              </button>
            )}
          </div>
        </div>

        <div
          className={`grid transition-all duration-200 ease-out ${filtersExpanded ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100 mt-1"}`}
        >
          <div className="overflow-hidden">
            <button
              type="button"
              onClick={() => setFiltersExpanded(true)}
              className="w-full flex items-center justify-between gap-2 py-1 text-left"
            >
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <SummaryChip label={mode || "Semua Mode"} muted={!mode} />
                <SummaryChip
                  label={
                    categories.length === 0
                      ? "Semua Kategori"
                      : categories.length === 1
                        ? categories[0]
                        : `${categories.length} kategori`
                  }
                  muted={categories.length === 0}
                />
                <SummaryChip label={branch || "Semua Cabang"} muted={!branch} />
              </div>
              <span className="text-[0.75rem] font-medium text-[var(--color-tertiary)] shrink-0">Ubah</span>
            </button>
          </div>
        </div>

        <div
          className={`grid transition-all duration-300 ease-out ${filtersExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
        >
          <div className={panelSettled ? "overflow-visible" : "overflow-hidden"}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
              {optionsLoading ? (
                <>
                  <div className="lg:col-span-3 space-y-1.5">
                    <div className="h-3 w-14 bg-[var(--color-border)]/50 rounded" />
                    <div className="h-9 w-32 bg-[var(--color-border)]/50 rounded-full" />
                  </div>
                  <div className="lg:col-span-6 space-y-1.5">
                    <div className="h-3 w-24 bg-[var(--color-border)]/50 rounded" />
                    <div className="h-9 w-full bg-[var(--color-border)]/50 rounded-lg" />
                  </div>
                  <div className="lg:col-span-3 space-y-1.5">
                    <div className="h-3 w-14 bg-[var(--color-border)]/50 rounded" />
                    <div className="h-9 w-full bg-[var(--color-border)]/50 rounded-lg" />
                  </div>
                </>
              ) : (
                <>
                  <div className="lg:col-span-2">
                    <SegmentedControl
                      label="Mode"
                      value={mode}
                      onChange={setMode}
                      options={options?.modes ?? []}
                      getIcon={(o) => {
                        const v = o.toLowerCase();
                        if (v.includes("sea") || v.includes("laut")) return Anchor;
                        if (v.includes("air") || v.includes("udara")) return Plane;
                        return undefined;
                      }}
                    />
                  </div>
                  <div className="lg:col-span-5">
                    <PillSingleToggle
                      label="Cabang"
                      value={branch}
                      onChange={setBranch}
                      options={branchOptions ?? options?.branches ?? []}
                      clearLabel="Semua Cabang"
                    />
                  </div>
                  <div className="lg:col-span-5">
                    <CategoryMultiCombobox
                      label="Kategori Barang"
                      value={categories}
                      onChange={setCategories}
                      options={categoryOptions}
                      loading={categoriesLoading}
                      helperText={mode ? `mengikuti ${mode}` : undefined}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SEGMENTED CONTROL — dipakai untuk filter "Mode"
// ============================================================================
export function SegmentedControl({
  label,
  value,
  onChange,
  options,
  getIcon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  getIcon?: (option: string) => LucideIcon | undefined;
}) {
  if (options.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-[var(--color-secondary)] uppercase">
          {label}
        </label>
        <div className="px-3 py-2 rounded-lg bg-[var(--color-neutral)] text-sm text-[var(--color-secondary)]">— Tidak ada data —</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5 items-start">
      <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-[var(--color-secondary)] uppercase">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const Icon = getIcon?.(o);
          const active = value === o;
          return (
            <button
              key={o}
              type="button"
              onClick={() => onChange(o)}
              aria-pressed={active}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${active
                ? "bg-[var(--color-tertiary)] text-white shadow-xs"
                : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]"
                }`}
            >
              {Icon && <Icon size={14} />}
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// CATEGORY COMBOBOX — dropdown pencarian single-select
// ============================================================================
export function CategoryCombobox({
  label,
  value,
  onChange,
  options,
  allowClear = false,
  clearLabel = "Semua",
  searchPlaceholder = "Cari kategori...",
  loading = false,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allowClear?: boolean;
  clearLabel?: string;
  searchPlaceholder?: string;
  loading?: boolean;
  helperText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownMaxHeight = useDropdownMaxHeight(open, triggerRef);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [open]);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.trim().toLowerCase())
  );
  const selectable = allowClear ? [{ value: "", label: clearLabel }, ...filtered.map((o) => ({ value: o, label: o }))] : filtered.map((o) => ({ value: o, label: o }));

  useEffect(() => {
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function commit(v: string) {
    onChange(v);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleSearchKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, selectable.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectable[activeIndex]) commit(selectable[activeIndex].value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  const displayValue = value || (allowClear ? clearLabel : "");

  return (
    <div className={`flex flex-col gap-1.5 relative ${open ? "z-50" : "z-10"}`} ref={containerRef}>
      <div className="flex items-center gap-1.5">
        <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-[var(--color-secondary)] uppercase">
          {label}
        </label>
        {helperText && !loading && (
          <span
            className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]/70 shrink-0 cursor-help"
            title={helperText}
            aria-label={helperText}
          >
            <Info size={9} />
          </span>
        )}
      </div>
      <div className="relative w-full">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={options.length === 0 || loading}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="form-input py-2 pl-3 pr-9 text-sm w-full flex items-center justify-between gap-2 text-left disabled:opacity-60 border-[var(--color-border)] rounded-lg bg-[var(--color-surface)]"
        >
          <span className={`truncate ${!value && !allowClear ? "text-[var(--color-secondary)]" : "text-[var(--color-primary)]"}`}>
            {loading ? "Memuat kategori..." : displayValue || searchPlaceholder}
          </span>
          {loading ? (
            <span className="w-3.5 h-3.5 border-2 border-[var(--color-secondary)]/30 border-t-[var(--color-tertiary)] rounded-full animate-spin shrink-0" />
          ) : (
            <ChevronDown
              size={14}
              className={`text-[var(--color-secondary)] shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
            />
          )}
        </button>

        {open && options.length > 0 && (
          <div
            role="listbox"
            className="absolute z-50 mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl flex flex-col overflow-hidden"
            style={{ maxHeight: dropdownMaxHeight }}
          >
            <div className="relative border-b border-[var(--color-border)] p-1.5 shrink-0">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                className="w-full pl-7 pr-2 py-1.5 text-sm bg-transparent outline-none placeholder:text-[var(--color-secondary)]/60 text-[var(--color-primary)]"
              />
            </div>
            <div className="min-h-0 overflow-y-auto overscroll-contain py-1">
              {selectable.length === 0 ? (
                <p className="px-3 py-2.5 text-sm text-[var(--color-secondary)]">Tidak ditemukan.</p>
              ) : (
                selectable.map((opt, i) => (
                  <button
                    key={opt.value || "__clear__"}
                    ref={(el) => { optionRefs.current[i] = el; }}
                    type="button"
                    onClick={() => commit(opt.value)}
                    onMouseEnter={() => setActiveIndex(i)}
                    role="option"
                    aria-selected={opt.value === value}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 sm:py-2 text-sm text-left transition-colors ${i === activeIndex ? "bg-[var(--color-neutral)]" : ""
                      } ${opt.value === "" && allowClear ? "italic text-[var(--color-secondary)]" : "text-[var(--color-primary)]"}`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {opt.value === value && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-tertiary)] shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CATEGORY MULTI COMBOBOX — dropdown pencarian multi-select
// ============================================================================
export function CategoryMultiCombobox({
  label,
  value,
  onChange,
  options,
  searchPlaceholder = "Cari kategori...",
  loading = false,
  helperText,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  options: string[];
  searchPlaceholder?: string;
  loading?: boolean;
  helperText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownMaxHeight = useDropdownMaxHeight(open, triggerRef);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [open]);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.trim().toLowerCase())
  );

  useEffect(() => {
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function toggle(v: string) {
    if (value.includes(v)) {
      onChange(value.filter((c) => c !== v));
    } else {
      onChange([...value, v]);
    }
  }

  function handleSearchKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) toggle(filtered[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  const displayValue =
    value.length === 0
      ? "Pilih kategori..."
      : value.length === 1
        ? value[0]
        : `${value.length} kategori dipilih`;

  const allSelected = options.length > 0 && value.length === options.length;

  return (
    <div className={`flex flex-col gap-1.5 relative ${open ? "z-50" : "z-10"}`} ref={containerRef}>
      <div className="flex items-center gap-1.5">
        <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-[var(--color-secondary)] uppercase">
          {label}
        </label>
        {helperText && !loading && (
          <span
            className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]/70 shrink-0 cursor-help"
            title={helperText}
            aria-label={helperText}
          >
            <Info size={9} />
          </span>
        )}
      </div>
      <div className="relative w-full">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={options.length === 0 || loading}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="form-input py-2 pl-3 pr-9 text-sm w-full flex items-center justify-between gap-2 text-left disabled:opacity-60 border-[var(--color-border)] rounded-lg bg-[var(--color-surface)]"
        >
          <span className={`truncate ${value.length === 0 ? "text-[var(--color-secondary)]" : "text-[var(--color-primary)]"}`}>
            {loading ? "Memuat kategori..." : displayValue}
          </span>
          {loading ? (
            <span className="w-3.5 h-3.5 border-2 border-[var(--color-secondary)]/30 border-t-[var(--color-tertiary)] rounded-full animate-spin shrink-0" />
          ) : (
            <ChevronDown
              size={14}
              className={`text-[var(--color-secondary)] shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
            />
          )}
        </button>

        {open && options.length > 0 && (
          <div
            role="listbox"
            aria-multiselectable="true"
            className="absolute z-50 mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl flex flex-col overflow-hidden"
            style={{ maxHeight: dropdownMaxHeight }}
          >
            <div className="relative border-b border-[var(--color-border)] p-1.5 shrink-0">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                className="w-full pl-7 pr-2 py-1.5 text-sm bg-transparent outline-none placeholder:text-[var(--color-secondary)]/60 text-[var(--color-primary)]"
              />
            </div>

            {value.length > 0 && (
              <div className="flex flex-wrap gap-1 px-2.5 py-2 border-b border-[var(--color-border)] max-h-20 overflow-y-auto shrink-0">
                {value.map((v) => (
                  <span
                    key={v}
                    className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-[var(--color-tertiary)]/10 text-[var(--color-tertiary)] text-[0.72rem] font-medium"
                  >
                    {v}
                    <button
                      type="button"
                      onClick={() => toggle(v)}
                      aria-label={`Hapus ${v}`}
                      className="hover:bg-[var(--color-tertiary)]/20 rounded-full p-0.5"
                    >
                      <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none">
                        <path d="M2.5 2.5 9.5 9.5M9.5 2.5 2.5 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/40 shrink-0">
              <button
                type="button"
                onClick={() => onChange(allSelected ? [] : options)}
                className="text-[0.75rem] font-medium text-[var(--color-tertiary)] hover:underline"
              >
                {allSelected ? "Bersihkan semua" : "Pilih semua"}
              </button>
              <span className="text-[0.7rem] text-[var(--color-secondary)]">{value.length} dipilih</span>
            </div>

            <div className="min-h-0 overflow-y-auto overscroll-contain py-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-2.5 text-sm text-[var(--color-secondary)]">Tidak ditemukan.</p>
              ) : (
                filtered.map((opt, i) => {
                  const selected = value.includes(opt);
                  return (
                    <button
                      key={opt}
                      ref={(el) => { optionRefs.current[i] = el; }}
                      type="button"
                      onClick={() => toggle(opt)}
                      onMouseEnter={() => setActiveIndex(i)}
                      role="option"
                      aria-selected={selected}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 sm:py-2 text-sm text-left transition-colors ${i === activeIndex ? "bg-[var(--color-neutral)]" : ""
                        }`}
                    >
                      <span
                        className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${selected
                          ? "bg-[var(--color-tertiary)] border-[var(--color-tertiary)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface)]"
                          }`}
                      >
                        {selected && (
                          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none">
                            <path d="M2 6.2 4.8 9 10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className={`truncate ${selected ? "text-[var(--color-primary)] font-medium" : "text-[var(--color-secondary)]"}`}>{opt}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {value.length > 1 && !loading && !open && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {value.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-[var(--color-tertiary)]/10 text-[var(--color-tertiary)] text-[0.72rem] font-medium"
            >
              {v}
              <button
                type="button"
                onClick={() => toggle(v)}
                aria-label={`Hapus ${v}`}
                className="hover:bg-[var(--color-tertiary)]/20 rounded-full p-0.5"
              >
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none">
                  <path d="M2.5 2.5 9.5 9.5M9.5 2.5 2.5 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PILL TOGGLE
// ============================================================================
export function PillToggle({
  label,
  value,
  onChange,
  options,
  allowClear = false,
  clearLabel = "Semua",
  loading = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allowClear?: boolean;
  clearLabel?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-[var(--color-secondary)] uppercase">
          {label}
        </label>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-16 bg-[var(--color-border)]/50 rounded-md" />
          ))}
        </div>
      </div>
    );
  }
  if (options.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-[var(--color-secondary)] uppercase">
          {label}
        </label>
        <div className="px-3 py-2 rounded-lg bg-[var(--color-neutral)] text-sm text-[var(--color-secondary)]">— Tidak ada data —</div>
      </div>
    );
  }
  const pills = allowClear ? [{ v: "", label: clearLabel }, ...options.map((o) => ({ v: o, label: o }))] : options.map((o) => ({ v: o, label: o }));
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-[var(--color-secondary)] uppercase">
        {label}
      </label>
      <div className="inline-flex flex-wrap bg-[var(--color-neutral)] rounded-lg p-[3px] gap-0.5">
        {pills.map((p) => {
          const active = value === p.v;
          return (
            <button
              key={p.v || "__clear__"}
              type="button"
              onClick={() => onChange(p.v)}
              aria-pressed={active}
              className={`flex items-center justify-center gap-1.5 px-4 min-h-[40px] rounded-md text-sm font-medium whitespace-nowrap transition-colors ${active
                ? "bg-[var(--color-primary)] border border-[var(--color-primary)] text-white shadow-xs"
                : "border border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                } ${p.v === "" && allowClear && !active ? "italic" : ""}`}
            >
              {active && (
                <svg viewBox="0 0 12 12" className="w-3 h-3 shrink-0" fill="none">
                  <path d="M2 6.2 4.8 9 10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// PILL SINGLE TOGGLE — gaya "chip" baru, dipakai untuk filter "Cabang"
// ============================================================================
export function PillSingleToggle({
  label,
  value,
  onChange,
  options,
  clearLabel = "Semua",
  loading = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  clearLabel?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-[var(--color-secondary)] uppercase">
          {label}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-16 bg-[var(--color-border)]/50 rounded-full" />
          ))}
        </div>
      </div>
    );
  }
  if (options.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-[var(--color-secondary)] uppercase">
          {label}
        </label>
        <div className="px-3 py-2 rounded-lg bg-[var(--color-neutral)] text-sm text-[var(--color-secondary)]">— Tidak ada data —</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 items-start">
      <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-[var(--color-secondary)] uppercase">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {options.map((o) => {
          const active = value === o;
          return (
            <button
              key={o}
              type="button"
              onClick={() => onChange(active ? "" : o)}
              aria-pressed={active}
              className={`px-3.5 min-w-[2.6rem] h-9 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex items-center justify-center ${active
                ? "bg-[var(--color-tertiary)] border-[var(--color-tertiary)] text-white shadow-xs"
                : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]"
                }`}
            >
              {o}
            </button>
          );
        })}
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[0.75rem] font-medium text-[var(--color-tertiary)] hover:underline shrink-0"
          >
            Reset
          </button>
        )}
      </div>
      {!value && (
        <p className="text-[0.72rem] text-[var(--color-secondary)]/80 mt-0.5">{clearLabel} — pilih salah satu untuk mempersempit</p>
      )}
    </div>
  );
}

// ============================================================================
// PILL MULTI TOGGLE — versi multi-select dari PillSingleToggle
// ============================================================================
export function PillMultiToggle({
  label,
  value,
  onChange,
  options,
  clearLabel = "Semua",
  loading = false,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  options: string[];
  clearLabel?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-[var(--color-secondary)] uppercase">
          {label}
        </label>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-16 bg-[var(--color-border)]/50 rounded-full" />
          ))}
        </div>
      </div>
    );
  }
  if (options.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-[var(--color-secondary)] uppercase">
          {label}
        </label>
        <div className="px-3 py-2 rounded-lg bg-[var(--color-neutral)] text-sm text-[var(--color-secondary)]">— Tidak ada data —</div>
      </div>
    );
  }

  function toggle(opt: string) {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  }

  return (
    <div className="flex flex-col gap-1.5 items-start">
      <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-[var(--color-secondary)] uppercase">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-1.5">
        {options.map((o) => {
          const active = value.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              aria-pressed={active}
              className={`flex items-center gap-1.5 pl-2.5 pr-3 h-9 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${active
                ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]"
                : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]"
                }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${active ? "bg-[var(--color-primary)]" : "bg-[var(--color-neutral)] border border-[var(--color-border)]"
                  }`}
              >
                {active && (
                  <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none">
                    <path d="M2 6.2 4.8 9 10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {o}
            </button>
          );
        })}
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[0.75rem] font-medium text-[var(--color-tertiary)] hover:underline shrink-0"
          >
            Reset
          </button>
        )}
      </div>
      {value.length === 0 && (
        <p className="text-[0.72rem] text-[var(--color-secondary)]/70">{clearLabel} — pilih salah satu untuk mempersempit</p>
      )}
    </div>
  );
}
