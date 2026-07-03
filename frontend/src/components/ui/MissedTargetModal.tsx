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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-[var(--color-border)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between bg-rose-50/10">
          <div>
            <h2 className="text-xl font-bold font-[var(--font-display)] text-[var(--color-primary)] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" /> Detil Consignee
            </h2>
            <p className="text-sm text-[var(--color-secondary)] mt-1">Transit time melebihi target SLA</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--color-neutral)] rounded-md transition-colors text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 pt-6 pb-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[var(--color-neutral)] rounded-lg p-3 border border-[var(--color-border)]">
            <p className="text-xs font-medium text-[var(--color-secondary)] mb-1">Total batch telat</p>
            <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.totalBatches}</p>
          </div>
          <div className="bg-[var(--color-neutral)] rounded-lg p-3 border border-[var(--color-border)]">
            <p className="text-xs font-medium text-[var(--color-secondary)] mb-1">Grup terdampak</p>
            <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.groupCount}</p>
          </div>
          <div className="bg-[var(--color-neutral)] rounded-lg p-3 border border-[var(--color-border)] relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-rose-500"></div>
            <p className="text-xs font-medium text-[var(--color-secondary)] mb-1">Sangat Telat (≥10 hari)</p>
            <p className="text-2xl font-bold text-rose-600">{stats.criticalCount}</p>
          </div>
          <div className="bg-[var(--color-neutral)] rounded-lg p-3 border border-[var(--color-border)]">
            <p className="text-xs font-medium text-[var(--color-secondary)] mb-1">Deviasi terburuk</p>
            <p className="text-2xl font-bold text-[var(--color-primary)] flex items-baseline gap-1">
              +{stats.maxDeviation} <span className="text-sm font-normal text-[var(--color-secondary)]">hari</span>
            </p>
          </div>
        </div>

        <div className="px-6 py-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b border-[var(--color-border)]">
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5 text-rose-600">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              ≥10 hari telat
            </div>
            <div className="flex items-center gap-1.5 text-amber-600">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              4–9 hari telat
            </div>
            <div className="flex items-center gap-1.5 text-[var(--color-secondary)]">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-border)]"></span>
              ≤3 hari telat
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-secondary)]" />
              <input
                type="text"
                placeholder="Cari kode batch atau consignee"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
            <div className="flex bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-md p-0.5">
              <button
                onClick={() => setSortBy('deviasi')}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded transition-colors",
                  sortBy === 'deviasi' ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                Deviasi
              </button>
              <button
                onClick={() => setSortBy('jumlah')}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded transition-colors",
                  sortBy === 'jumlah' ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                Jumlah
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {filteredAndSortedData.length === 0 ? (
            <div className="text-center text-[var(--color-secondary)] py-8">
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
                <div key={idx} className="border-b border-[var(--color-border)] pb-6 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <h3 className="font-bold text-lg text-[var(--color-primary)]">{group.name}</h3>
                      <div className="w-24 h-2 flex rounded-full overflow-hidden bg-[var(--color-border)]/50">
                        {pctCrit > 0 && <div style={{ width: `${pctCrit}%` }} className="bg-rose-500"></div>}
                        {pctWarn > 0 && <div style={{ width: `${pctWarn}%` }} className="bg-amber-500"></div>}
                        {pctNorm > 0 && <div style={{ width: `${pctNorm}%` }} className="bg-[var(--color-border)]"></div>}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-[var(--color-secondary)]">{group.count} batch</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {displayCodes.map((c, cIdx) => {
                      const dev = c.transit - c.target;
                      return (
                        <div
                          key={cIdx}
                          className={cn(
                            "px-2.5 py-1 text-[11px] font-mono rounded-md flex items-center gap-1.5 border shadow-sm",
                            dev >= 10 
                              ? "bg-rose-50 border-rose-200 text-rose-700" 
                              : dev >= 4
                                ? "bg-amber-50 border-amber-200 text-amber-700"
                                : "bg-[var(--color-neutral)] border-[var(--color-border)] text-[var(--color-primary)]"
                          )}
                        >
                          {c.code}
                          <span className={cn(
                            "px-1 rounded text-[9px] font-bold opacity-80",
                            dev >= 10 ? "bg-rose-200" : dev >= 4 ? "bg-amber-200" : "bg-[var(--color-border)]"
                          )} title={`Transit: ${c.transit} hari, Target: ${c.target} hari`}>
                            +{dev}d
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {hiddenCount > 0 && (
                    <button
                      onClick={() => toggleExpand(group.name)}
                      className="mt-3 text-xs font-semibold text-[var(--color-primary)] hover:text-blue-600 transition-colors flex items-center gap-1 bg-[var(--color-neutral)] px-3 py-1.5 rounded-md border border-[var(--color-border)]"
                    >
                      Lihat {hiddenCount} lainnya <ChevronDown className="w-3 h-3" />
                    </button>
                  )}
                  {isExpanded && hiddenCount === 0 && group.codes.length > 12 && (
                    <button
                      onClick={() => toggleExpand(group.name)}
                      className="mt-3 text-xs font-semibold text-[var(--color-primary)] hover:text-blue-600 transition-colors flex items-center gap-1 bg-[var(--color-neutral)] px-3 py-1.5 rounded-md border border-[var(--color-border)]"
                    >
                      Tutup <ChevronUp className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="px-6 py-4 bg-[var(--color-neutral)] border-t border-[var(--color-border)] rounded-b-[var(--radius-xl)] flex justify-between items-center">
          <span className="text-xs font-bold text-[var(--color-secondary)]">Total Consignee: {filteredAndSortedData.length}</span>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[var(--color-primary)] text-white text-sm font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
