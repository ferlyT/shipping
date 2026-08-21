import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MissedTargetItem {
  name: string;
  count: number;
  codes: { code: string; transit: number; target: number }[];
}

interface MissedTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: MissedTargetItem[];
}

export function MissedTargetModal({ isOpen, onClose, data }: MissedTargetModalProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'deviasi' | 'jumlah'>('jumlah');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [showStats, setShowStats] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 640
  );

  const stats = useMemo(() => {
    let totalBatches = 0;
    let maxDeviation = 0;
    let criticalCount = 0;

    data.forEach(group => {
      totalBatches += group.count;
      group.codes.forEach(c => {
        const deviation = c.transit - c.target;
        if (deviation > maxDeviation) maxDeviation = deviation;
        if (deviation >= 10) criticalCount++;
      });
    });

    return {
      totalBatches,
      groupCount: data.length,
      maxDeviation,
      criticalCount
    };
  }, [data]);

  const filteredAndSortedData = useMemo(() => {
    let result = data;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(group => 
        group.name.toLowerCase().includes(q) ||
        group.codes.some(c => c.code.toLowerCase().includes(q))
      );
    }

    result = [...result].sort((a, b) => {
      if (sortBy === 'jumlah') {
        return b.count - a.count;
      } else {
        const devA = Math.max(...a.codes.map(c => c.transit - c.target), 0);
        const devB = Math.max(...b.codes.map(c => c.transit - c.target), 0);
        return devB - devA;
      }
    });

    return result;
  }, [data, search, sortBy]);

  const toggleExpand = (name: string) => {
    setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-4xl h-full sm:h-auto sm:m-auto bg-[var(--color-surface)] sm:rounded-2xl shadow-xl flex flex-col max-h-[100dvh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200 border-0 sm:border border-[var(--color-border)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface)]">
          <div className="min-w-0 pr-3">
            <h2 className="text-lg sm:text-2xl font-bold text-[var(--color-primary)] font-[var(--font-display)] flex items-center gap-2 sm:gap-2.5 tracking-tight truncate">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500" />
              </div>
              Detil Consignee
            </h2>
            <p className="text-[10px] sm:text-xs uppercase font-semibold text-[var(--color-secondary)] mt-1.5 tracking-wider truncate">
              Transit time melebihi target SLA
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 shrink-0 hover:bg-[var(--color-neutral)] rounded-full transition-colors text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stats Row */}
        <div className={cn("flex-shrink-0 px-4 sm:px-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 overflow-hidden transition-all duration-200", showStats ? "pt-4 sm:pt-6 pb-2 max-h-96" : "pt-0 pb-0 max-h-0")}>
          <div className="bg-[var(--color-neutral)] rounded-xl p-2.5 sm:p-3 border border-[var(--color-border)] shadow-xs">
            <p className="text-[9px] sm:text-[10px] uppercase font-bold text-[var(--color-secondary)] mb-0.5 sm:mb-1 tracking-wider">Total batch telat</p>
            <p className="text-xl sm:text-2xl font-bold font-[var(--font-display)] text-[var(--color-primary)]">{stats.totalBatches}</p>
          </div>
          <div className="bg-[var(--color-neutral)] rounded-xl p-2.5 sm:p-3 border border-[var(--color-border)] shadow-xs">
            <p className="text-[9px] sm:text-[10px] uppercase font-bold text-[var(--color-secondary)] mb-0.5 sm:mb-1 tracking-wider">Grup terdampak</p>
            <p className="text-xl sm:text-2xl font-bold font-[var(--font-display)] text-[var(--color-primary)]">{stats.groupCount}</p>
          </div>
          <div className="bg-[var(--color-neutral)] rounded-xl p-2.5 sm:p-3 border border-[var(--color-border)] shadow-xs relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-rose-500"></div>
            <p className="text-[9px] sm:text-[10px] uppercase font-bold text-[var(--color-secondary)] mb-0.5 sm:mb-1 tracking-wider">Sangat Telat (≥10 hari)</p>
            <p className="text-xl sm:text-2xl font-bold font-[var(--font-display)] text-rose-500">{stats.criticalCount}</p>
          </div>
          <div className="bg-[var(--color-neutral)] rounded-xl p-2.5 sm:p-3 border border-[var(--color-border)] shadow-xs">
            <p className="text-[9px] sm:text-[10px] uppercase font-bold text-[var(--color-secondary)] mb-0.5 sm:mb-1 tracking-wider">Deviasi terburuk</p>
            <p className="text-xl sm:text-2xl font-bold font-[var(--font-display)] text-[var(--color-primary)] flex items-baseline gap-1">
              +{stats.maxDeviation} <span className="text-xs sm:text-sm font-normal text-[var(--color-secondary)]">hari</span>
            </p>
          </div>
        </div>

        {/* Stats Toggle */}
        <div className="flex-shrink-0 px-4 sm:px-6 pt-2 pb-1 flex justify-end">
          <button
            onClick={() => setShowStats(v => !v)}
            className="flex items-center gap-1 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
          >
            {showStats ? 'Sembunyikan ringkasan' : 'Tampilkan ringkasan'}
            {showStats ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Controls */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between border-b border-[var(--color-border)]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:gap-4 text-[10px] sm:text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-rose-500">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-rose-500"></span>
              ≥10 hari telat
            </div>
            <div className="flex items-center gap-1.5 text-amber-500">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-500"></span>
              4–9 hari telat
            </div>
            <div className="flex items-center gap-1.5 text-[var(--color-secondary)]">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[var(--color-border)]"></span>
              ≤3 hari telat
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 w-full sm:w-auto mt-1 sm:mt-0">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--color-secondary)]" />
              <input
                type="text"
                placeholder="Cari kode batch atau consignee"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-xs sm:text-sm text-[var(--color-primary)] placeholder:text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
            <div className="flex w-full sm:w-auto bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg p-0.5">
              <button
                onClick={() => setSortBy('deviasi')}
                className={cn(
                  "flex-1 sm:flex-none px-3 py-1.5 sm:py-1 text-[11px] sm:text-xs font-semibold rounded-md transition-colors text-center cursor-pointer",
                  sortBy === 'deviasi' ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-xs" : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                Deviasi
              </button>
              <button
                onClick={() => setSortBy('jumlah')}
                className={cn(
                  "flex-1 sm:flex-none px-3 py-1.5 sm:py-1 text-[11px] sm:text-xs font-semibold rounded-md transition-colors text-center cursor-pointer",
                  sortBy === 'jumlah' ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-xs" : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                Jumlah
              </button>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6 bg-[var(--color-surface)]">
          {filteredAndSortedData.length === 0 ? (
            <div className="text-center text-[var(--color-secondary)] py-8 text-sm font-medium">
              Tidak ada data yang cocok.
            </div>
          ) : (
            filteredAndSortedData.map((group, idx) => {
              const isExpanded = expandedGroups[group.name];
              const displayCodes = isExpanded ? group.codes : group.codes.slice(0, 12);
              const hiddenCount = group.codes.length - displayCodes.length;

              const critical = group.codes.filter(c => (c.transit - c.target) >= 10).length;
              const warning = group.codes.filter(c => (c.transit - c.target) >= 4 && (c.transit - c.target) <= 9).length;
              const normal = group.codes.filter(c => (c.transit - c.target) <= 3).length;
              const total = group.codes.length;

              const pctCrit = (critical / total) * 100;
              const pctWarn = (warning / total) * 100;
              const pctNorm = (normal / total) * 100;

              return (
                <div key={idx} className="border-b border-[var(--color-border)] pb-5 sm:pb-6 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
                    <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                      <h3 className="font-bold text-base sm:text-lg text-[var(--color-primary)] truncate">{group.name}</h3>
                      {/* Distribution Bar */}
                      <div className="w-16 sm:w-24 h-1.5 sm:h-2 flex rounded-full overflow-hidden bg-[var(--color-neutral)] shrink-0 border border-[var(--color-border)]">
                        {pctCrit > 0 && <div style={{ width: `${pctCrit}%` }} className="bg-rose-500"></div>}
                        {pctWarn > 0 && <div style={{ width: `${pctWarn}%` }} className="bg-amber-500"></div>}
                        {pctNorm > 0 && <div style={{ width: `${pctNorm}%` }} className="bg-[var(--color-border)]"></div>}
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-[var(--color-secondary)] shrink-0">{group.count} batch</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {displayCodes.map((c, cIdx) => {
                      const dev = c.transit - c.target;
                      return (
                        <div
                          key={cIdx}
                          className={cn(
                            "px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-mono rounded-lg flex items-center gap-1.5 border shadow-2xs",
                            dev >= 10 
                              ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold" 
                              : dev >= 4
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold"
                                : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)]"
                          )}
                          title={`Transit: ${c.transit} hari, Target: ${c.target} hari`}
                        >
                          {c.code}
                          <span className={cn(
                            "px-1 rounded text-[8px] sm:text-[9px] font-bold",
                            dev >= 10 ? "bg-rose-500/20 text-rose-700 dark:text-rose-300" : dev >= 4 ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-[var(--color-neutral)] text-[var(--color-secondary)]"
                          )}>
                            +{dev}d
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {hiddenCount > 0 && (
                    <button
                      onClick={() => toggleExpand(group.name)}
                      className="mt-3 text-[11px] uppercase tracking-wider font-bold text-[var(--color-primary)] hover:text-[var(--color-tertiary)] transition-colors flex items-center gap-1 bg-[var(--color-neutral)] px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 cursor-pointer"
                    >
                      Lihat {hiddenCount} lainnya <ChevronDown className="w-3 h-3" />
                    </button>
                  )}
                  {isExpanded && hiddenCount === 0 && group.codes.length > 12 && (
                    <button
                      onClick={() => toggleExpand(group.name)}
                      className="mt-3 text-[11px] uppercase tracking-wider font-bold text-[var(--color-primary)] hover:text-[var(--color-tertiary)] transition-colors flex items-center gap-1 bg-[var(--color-neutral)] px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 cursor-pointer"
                    >
                      Tutup <ChevronUp className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 bg-[var(--color-neutral)] border-t border-[var(--color-border)] sm:rounded-b-2xl flex justify-between items-center">
          <span className="text-[10px] sm:text-xs uppercase tracking-wider font-bold text-[var(--color-secondary)]">
            Total Consignee: {filteredAndSortedData.length}
          </span>
          <button
            onClick={onClose}
            className="px-4 sm:px-6 py-1.5 sm:py-2 bg-[var(--color-primary)] text-[var(--color-on-primary)] text-xs sm:text-sm font-bold rounded-lg shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
