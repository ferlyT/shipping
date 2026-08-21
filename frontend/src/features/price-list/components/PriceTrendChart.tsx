import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Upload,
  BarChart3,
  LineChart as LineChartIcon,
  Table as TableIcon,
  Search,
  X,
  Minus,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";
import type { TrendSeries } from "../types";
import { formatCurrency } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

function formatRupiah(v: number) {
  return formatCurrency(v);
}

function SheetBadge({ sheetType, solid }: { sheetType: string; solid: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-[1px] rounded text-[0.62rem] font-semibold uppercase tracking-wide shrink-0 leading-tight ${
        solid
          ? "bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)]"
          : "bg-transparent text-[var(--color-secondary)]/70 border border-dashed border-[var(--color-border)]"
      }`}
    >
      {sheetType}
    </span>
  );
}

const DASH_PATTERNS = ["", "7 5", "2 4", "1 4 4 4"];

const LINE_COLORS = [
  '#1A1C1E', // Charcoal Black
  '#B8422E', // Terracotta Red
  '#2A5C8A', // Steel Blue
  '#1F6E5C', // Deep Pine Emerald
  '#C99A2E', // Warm Ochre Gold
  '#7C3AED', // Royal Violet
  '#0D9488', // Rich Teal
  '#EA580C', // Burnt Orange
];

function lightenHex(hex: string, amount: number) {
  const clamp = (n: number) => Math.min(255, Math.max(0, n));
  const num = parseInt(hex.replace("#", ""), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const mix = (c: number) => clamp(Math.round(c + (255 - c) * amount));
  const toHex = (c: number) => c.toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

export function PriceTrendChart({
  chartData,
  series,
  yDomain,
  latestPrices,
  seriesTrend,
  maxPrice,
  loading,
  isRefetching = false,
  sheetTypes,
  mode,
  categories,
  branch,
}: {
  chartData: any[];
  series: TrendSeries[];
  yDomain: (string | number)[];
  latestPrices: Record<string, number>;
  seriesTrend: Record<string, { delta: number; pct: number } | null>;
  maxPrice: number;
  loading: boolean;
  isRefetching?: boolean;
  sheetTypes: string[];
  mode: string;
  categories: string[];
  branch: string;
}) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [activeSeriesKey, setActiveSeriesKey] = useState<string | null>(null);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

  const visibleSeries = series.filter((s) =>
    s.category.toLowerCase().includes(categoryQuery.trim().toLowerCase())
  );

  function toggleSeries(key: string) {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const uniqueCategories = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const s of series) {
      if (!seen.has(s.category)) {
        seen.add(s.category);
        list.push(s.category);
      }
    }
    return list;
  }, [series]);

  const uniqueSheetTypes = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const s of series) {
      if (!seen.has(s.sheetType)) {
        seen.add(s.sheetType);
        list.push(s.sheetType);
      }
    }
    return list;
  }, [series]);

  const showSheetLabel = uniqueSheetTypes.length > 1;

  function categoryColor(cat: string) {
    const idx = uniqueCategories.indexOf(cat);
    return LINE_COLORS[idx % LINE_COLORS.length];
  }

  function seriesColor(s: { category: string; sheetType: string }) {
    const base = categoryColor(s.category);
    const sheetIdx = uniqueSheetTypes.indexOf(s.sheetType);
    if (sheetIdx <= 0) return base;
    return lightenHex(base, 0.18);
  }

  function sheetDash(st: string) {
    const idx = uniqueSheetTypes.indexOf(st);
    return DASH_PATTERNS[idx % DASH_PATTERNS.length] || undefined;
  }

  function seriesDotStyle(s: { category: string; sheetType: string }, isHidden: boolean) {
    return { background: isHidden ? "var(--color-border, #94a3b8)" : seriesColor(s) };
  }

  function seriesLabel(s: { category: string; sheetType: string }) {
    return showSheetLabel ? `${s.category} · ${s.sheetType}` : s.category;
  }

  const seriesByKey = useMemo(() => new Map(series.map((s) => [s.key, s])), [series]);

  const biggestMover = (() => {
    if (!seriesTrend) return null;
    let best: { label: string; delta: number; pct: number } | null = null;
    for (const [key, tr] of Object.entries(seriesTrend)) {
      if (!tr || tr.delta === 0) continue;
      if (!best || Math.abs(tr.pct) > Math.abs(best.pct)) {
        const s = seriesByKey.get(key);
        best = { label: s ? seriesLabel(s) : key, delta: tr.delta, pct: tr.pct };
      }
    }
    return best;
  })();

  return (
    <div className="card bg-[var(--color-surface)] shadow-xs border border-[var(--color-border)] rounded-xl overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-[var(--color-neutral)] shrink-0">
            <BarChart3 size={18} className="text-[var(--color-secondary)]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[1rem] font-semibold text-[var(--color-primary)] flex items-center gap-2">
              Tren Harga
              {isRefetching && (
                <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-[var(--color-primary)] transition-opacity duration-200">
                  <Loader2 className="w-3 h-3 text-[var(--color-primary)] animate-spin shrink-0" />
                  Memperbarui…
                </span>
              )}
            </h2>
            <p className="text-[0.78rem] text-[var(--color-secondary)] truncate" title={branch || undefined}>
              {sheetTypes.length === 0 ? "—" : sheetTypes.join(" + ")} · {mode || "—"} · {branch || "Pilih cabang"}
            </p>
          </div>
        </div>
        {chartData.length > 0 && !loading && (
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("chart")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[0.78rem] font-medium transition-all ${viewMode === "chart" ? "bg-[var(--color-surface)] shadow-xs text-[var(--color-primary)]" : "text-[var(--color-secondary)]"
                }`}
            >
              <LineChartIcon size={14} />
              Grafik
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[0.78rem] font-medium transition-all ${viewMode === "table" ? "bg-[var(--color-surface)] shadow-xs text-[var(--color-primary)]" : "text-[var(--color-secondary)]"
                }`}
            >
              <TableIcon size={14} />
              Tabel
            </button>
          </div>
        )}
      </div>

      {biggestMover && !loading && (
        <div className="px-4 sm:px-6 py-3 bg-transparent border-b border-[var(--color-border)] flex items-start sm:items-center gap-2.5">
          <Lightbulb size={15} className="text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
          <p className="text-[0.82rem] text-[var(--color-primary)]">
            <span className="font-semibold">{biggestMover.label}</span> mengalami perubahan harga
            terbesar:{" "}
            <span className={`font-semibold ${biggestMover.delta > 0 ? "text-rose-500" : "text-emerald-500"}`}>
              {biggestMover.delta > 0 ? "naik" : "turun"} {formatRupiah(Math.abs(biggestMover.delta))}
              {" "}({Math.abs(biggestMover.pct).toFixed(1)}%)
            </span>{" "}
            sejak awal periode.
          </p>
        </div>
      )}

      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-2 w-48 bg-[var(--color-border)] rounded-full animate-pulse" />
            <div className="h-2 w-32 bg-[var(--color-border)] rounded-full animate-pulse" />
            <p className="text-sm text-[var(--color-secondary)] mt-2">Memuat data tren harga...</p>
          </div>
        ) : sheetTypes.length === 0 && !mode && categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-[var(--color-neutral)] rounded-full flex items-center justify-center mb-4 border border-[var(--color-border)]">
              <BarChart3 className="w-8 h-8 text-[var(--color-secondary)]" />
            </div>
            <h3 className="text-base font-semibold text-[var(--color-primary)] mb-1">Pilih filter untuk memulai</h3>
            <p className="text-[var(--color-secondary)] text-sm text-center max-w-xs">
              Pilih Tipe Sheet, Mode, dan Kategori Barang di atas untuk menampilkan grafik tren harga.
            </p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-[var(--color-neutral)] rounded-full flex items-center justify-center mb-4 border border-[var(--color-border)]">
              <TrendingUp className="w-8 h-8 text-[var(--color-secondary)]" />
            </div>
            <h3 className="text-base font-semibold text-[var(--color-primary)] mb-1">Belum ada data</h3>
            <p className="text-[var(--color-secondary)] text-sm text-center max-w-xs mb-5">
              Tidak ada data harga untuk kombinasi filter ini. Coba ubah filter atau upload price list baru.
            </p>
            <Link to={ROUTES.PRICE_LIST_UPLOAD} className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-2">
              <Upload size={15} />
              Upload Price List
            </Link>
          </div>
        ) : (
          <div className={`transition-opacity duration-300 ${isRefetching ? "opacity-50" : "opacity-100"}`}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-xs">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-secondary)]" />
                  <input
                    type="text"
                    value={categoryQuery}
                    onChange={(e) => setCategoryQuery(e.target.value)}
                    placeholder="Cari kategori..."
                    className="form-input py-1.5 pl-8 pr-7 text-sm w-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary)] rounded-lg"
                  />
                  {categoryQuery && (
                    <button
                      type="button"
                      onClick={() => setCategoryQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {hiddenSeries.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setHiddenSeries(new Set())}
                    className="text-[0.78rem] font-medium text-[var(--color-primary)] hover:underline shrink-0"
                  >
                    Tampilkan semua ({hiddenSeries.size} disembunyikan)
                  </button>
                )}
              </div>

            {visibleSeries.length > 0 && (
              <div className="hidden sm:flex items-center gap-3 px-2.5 mb-1.5 text-[0.68rem] font-semibold text-[var(--color-secondary)] uppercase tracking-[0.04em]">
                <span className="w-5 shrink-0 text-right">#</span>
                <span className="w-2.5 shrink-0" />
                <span className={`${showSheetLabel ? "w-48" : "w-32"} shrink-0`}>Kategori</span>
                <span className="flex-1">Posisi Harga</span>
                <span className="w-40 shrink-0 text-right">Harga Terkini</span>
                <span className="w-16 shrink-0 text-right">Tren</span>
              </div>
            )}
            {(
              <div className="flex flex-col gap-1 mb-5">
                {visibleSeries.map((s, i) => {
                  const d = seriesLabel(s);
                  const color = seriesColor(s);
                  const isHidden = hiddenSeries.has(s.key);
                  const price = latestPrices[s.key];
                  const barPct = maxPrice && price != null ? Math.max(4, (price / maxPrice) * 100) : 0;
                  const tr = seriesTrend?.[s.key] ?? null;
                  const trendChip = tr && tr.delta !== 0 ? (
                    <span className={`flex items-center gap-0.5 ${tr.delta > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {tr.delta > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {Math.abs(tr.pct).toFixed(1)}%
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-[var(--color-secondary)]">
                      <Minus size={12} />
                    </span>
                  );
                  return (
                    <div key={s.key}>
                      <button
                        type="button"
                        onClick={() => toggleSeries(s.key)}
                        className={`sm:hidden w-full flex flex-col gap-1.5 px-2.5 py-2.5 rounded-lg text-left transition-all ${isHidden ? "opacity-40" : "active:bg-[var(--color-neutral)]"
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[0.7rem] font-semibold text-[var(--color-secondary)] shrink-0 tabular-nums">
                              {i + 1}
                            </span>
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={seriesDotStyle(s, isHidden)}
                            />
                            <span className="text-[0.85rem] font-semibold text-[var(--color-primary)] truncate">{s.category}</span>
                            {showSheetLabel && (
                              <SheetBadge
                                sheetType={s.sheetType}
                                solid={uniqueSheetTypes.indexOf(s.sheetType) === 0}
                              />
                            )}
                          </div>
                          <span className="text-[0.75rem] font-medium tabular-nums shrink-0">{trendChip}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="flex-1 h-1.5 rounded-full bg-[var(--color-neutral)] overflow-hidden">
                            <span
                              className="block h-full rounded-full transition-all"
                              style={{ width: `${barPct}%`, background: isHidden ? "var(--color-border)" : color }}
                            />
                          </span>
                          <span className="text-[0.8rem] font-medium text-[var(--color-primary)] tabular-nums shrink-0 whitespace-nowrap">
                            {price != null ? formatRupiah(price) : "—"}
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleSeries(s.key)}
                        onMouseEnter={() => setActiveSeriesKey(s.key)}
                        onMouseLeave={() => setActiveSeriesKey(null)}
                        className={`hidden sm:flex items-center gap-3 px-2.5 py-2 rounded-lg text-left w-full transition-all ${isHidden ? "opacity-40" : "hover:bg-[var(--color-neutral)]"
                          }`}
                      >
                        <span className="w-5 shrink-0 text-[0.72rem] font-semibold text-[var(--color-secondary)] text-right tabular-nums">
                          {i + 1}
                        </span>
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={seriesDotStyle(s, isHidden)}
                        />
                        <span
                          className={`${showSheetLabel ? "w-48" : "w-32"} shrink-0 flex items-center gap-1.5 text-[0.85rem] font-semibold text-[var(--color-primary)]`}
                          title={d}
                        >
                          <span className="truncate">{s.category}</span>
                          {showSheetLabel && (
                            <SheetBadge
                              sheetType={s.sheetType}
                              solid={uniqueSheetTypes.indexOf(s.sheetType) === 0}
                            />
                          )}
                        </span>
                        <span className="flex-1 h-2 rounded-full bg-[var(--color-neutral)] overflow-hidden min-w-[60px]">
                          <span
                            className="block h-full rounded-full transition-all"
                            style={{ width: `${barPct}%`, background: isHidden ? "var(--color-border)" : color }}
                          />
                        </span>
                        <span className="w-40 shrink-0 text-right text-[0.85rem] font-medium text-[var(--color-primary)] tabular-nums whitespace-nowrap">
                          {price != null ? formatRupiah(price) : "—"}
                        </span>
                        <span className="w-16 shrink-0 flex items-center justify-end gap-0.5 text-[0.75rem] font-medium tabular-nums">
                          {trendChip}
                        </span>
                      </button>
                    </div>
                  );
                })}
                {visibleSeries.length === 0 && (
                  <p className="text-sm text-[var(--color-secondary)] py-1">Tidak ada kategori yang cocok dengan pencarian.</p>
                )}
              </div>
            )}

            {viewMode === "chart" ? (
              <div className="h-[280px] sm:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 15, bottom: 10, left: 10 }}>
                    <defs>
                      {series.map((s) => (
                        <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={seriesColor(s)} stopOpacity={0.28} />
                          <stop offset="100%" stopColor={seriesColor(s)} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 6" stroke="var(--color-border)" strokeOpacity={0.8} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "var(--color-secondary)" }}
                      tickLine={false}
                      axisLine={{ stroke: "var(--color-border)", strokeOpacity: 0.8 }}
                      tickFormatter={(v) => new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                      minTickGap={24}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      width={48}
                      tickMargin={6}
                      tick={{ fontSize: 11, fill: "var(--color-secondary)" }}
                      tickLine={false}
                      axisLine={false}
                      domain={yDomain as any}
                      tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}jt`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid var(--color-border)",
                        backgroundColor: "var(--color-surface)",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                        fontSize: "0.85rem",
                        padding: "10px 14px",
                      }}
                      formatter={(v: any, name: any) => [formatRupiah(v as number), name]}
                      labelFormatter={(v) =>
                        new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                      }
                      labelStyle={{ fontWeight: 600, marginBottom: "4px", color: "var(--color-primary)" }}
                      itemSorter={(item) => -(item.value as number)}
                    />
                    {activeSeriesKey && !hiddenSeries.has(activeSeriesKey) && (
                      <Area
                        dataKey={activeSeriesKey}
                        stroke="none"
                        fill={`url(#fill-${activeSeriesKey})`}
                        connectNulls
                        isAnimationActive={false}
                        legendType="none"
                        tooltipType="none"
                        activeDot={false}
                      />
                    )}
                    {series
                      .filter((s) => !hiddenSeries.has(s.key))
                      .map((s) => {
                        const isDimmed = activeSeriesKey !== null && activeSeriesKey !== s.key;
                        return (
                          <Line
                            key={s.key}
                            type="monotone"
                            dataKey={s.key}
                            name={seriesLabel(s)}
                            stroke={seriesColor(s)}
                            strokeDasharray={sheetDash(s.sheetType)}
                            strokeWidth={activeSeriesKey === s.key ? 3.5 : 2.5}
                            strokeOpacity={isDimmed ? 0.2 : 1}
                            dot={{ r: 4, strokeWidth: 2, fill: "var(--color-surface)" }}
                            activeDot={{ r: 6 }}
                            connectNulls
                            isAnimationActive={false}
                          />
                        );
                      })}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="w-full">
                <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--color-border)] bg-[var(--color-neutral)]">
                          <th className="text-left py-2.5 pr-4 pl-2 font-semibold text-[var(--color-secondary)] text-[0.78rem] uppercase tracking-[0.04em] sticky left-0 z-10 bg-[var(--color-neutral)] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                            Tanggal Berlaku
                          </th>
                          {visibleSeries
                            .filter((s) => !hiddenSeries.has(s.key))
                            .map((s) => (
                              <th key={s.key} className="text-right py-2.5 px-4 font-semibold text-[var(--color-primary)] whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5">
                                  {s.category}
                                  {showSheetLabel && (
                                    <SheetBadge
                                      sheetType={s.sheetType}
                                      solid={uniqueSheetTypes.indexOf(s.sheetType) === 0}
                                    />
                                  )}
                                </span>
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {chartData.map((row, idx) => (
                          <tr
                            key={String(row.date)}
                            className={`border-b border-[var(--color-border)] last:border-0 ${idx % 2 === 1 ? "bg-[var(--color-neutral)]/50" : "bg-transparent"
                              }`}
                          >
                            <td
                              className={`py-2.5 pr-4 pl-2 text-[var(--color-secondary)] whitespace-nowrap sticky left-0 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] ${idx % 2 === 1 ? "bg-[var(--color-neutral)]" : "bg-[var(--color-surface)]"
                                }`}
                            >
                              {new Date(String(row.date)).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            {visibleSeries
                              .filter((s) => !hiddenSeries.has(s.key))
                              .map((s) => (
                                <td key={s.key} className="text-right py-2.5 px-4 text-[var(--color-primary)] whitespace-nowrap tabular-nums">
                                  {row[s.key] != null ? formatRupiah(Number(row[s.key])) : "—"}
                                </td>
                              ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
