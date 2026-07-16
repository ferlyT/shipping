import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Heritage theme tokens
// ---------------------------------------------------------------------------
const heritage = {
  font: {
    display: { fontFamily: 'Fraunces, serif' },
    body: { fontFamily: '"Public Sans", sans-serif' },
    label: { fontFamily: '"Space Grotesk", sans-serif' },
  },
}

export interface EtaSummaryItem {
  name: string;
  count: number;
  codes: { code: string; aging: number }[];
}

interface EtaSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: EtaSummaryItem[];
}

export function EtaSummaryModal({ isOpen, onClose, data }: EtaSummaryModalProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'usia' | 'jumlah'>('jumlah');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [showStats, setShowStats] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 640
  );

  const stats = useMemo(() => {
    let totalBatches = 0;
    let criticalCount = 0;
    let maxAging = 0;

    data.forEach(group => {
      totalBatches += group.count;
      group.codes.forEach(c => {
        if (c.aging >= 30) criticalCount++;
        if (c.aging > maxAging) maxAging = c.aging;
      });
    });

    return {
      totalBatches,
      groupCount: data.length,
      criticalCount,
      maxAging
    };
  }, [data]);

  const filteredAndSortedData = useMemo(() => {
    let result = data;

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(group => 
        group.name.toLowerCase().includes(q) ||
        group.codes.some(c => c.code.toLowerCase().includes(q))
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'jumlah') {
        return b.count - a.count;
      } else {
        const maxA = Math.max(...a.codes.map(c => c.aging), 0);
        const maxB = Math.max(...b.codes.map(c => c.aging), 0);
        return maxB - maxA;
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1A1C1E]/60 backdrop-blur-sm transition-opacity p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-4xl h-full sm:h-auto sm:m-auto bg-white sm:rounded-[8px] shadow-xl flex flex-col max-h-[100dvh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200 border-0 sm:border border-[#6C7278]/20 overflow-hidden"
        style={heritage.font.body}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-[#6C7278]/15 flex items-center justify-between bg-[#F7F5F2]/50">
          <div className="min-w-0 pr-3">
            <h2 
              className="text-lg sm:text-2xl font-medium text-[#1A1C1E] flex items-center gap-2 sm:gap-2.5 tracking-[-0.02em] truncate"
              style={heritage.font.display}
            >
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-[4px] bg-[#1A1C1E]/5 border border-[#1A1C1E]/10">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#1A1C1E]" />
              </div>
              Detil Consignee
            </h2>
            <p 
              className="text-[9px] sm:text-[10px] uppercase text-[#6C7278] mt-1.5 sm:mt-2 tracking-[0.06em] truncate"
              style={heritage.font.label}
            >
              ETA sudah lewat, belum exit gudang
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 shrink-0 hover:bg-[#F7F5F2] sm:hover:bg-black/5 rounded-full transition-colors text-[#6C7278] hover:text-[#1A1C1E]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stats Row */}
        <div className={cn("flex-shrink-0 px-4 sm:px-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 overflow-hidden transition-all duration-200", showStats ? "pt-4 sm:pt-6 pb-2 max-h-96" : "pt-0 pb-0 max-h-0")}>
          <div className="bg-white rounded-[6px] p-2.5 sm:p-3 border border-[#6C7278]/20 shadow-sm">
            <p className="text-[9px] sm:text-[10px] uppercase font-medium text-[#6C7278] mb-0.5 sm:mb-1 tracking-[0.04em]" style={heritage.font.label}>Total batch</p>
            <p className="text-xl sm:text-2xl font-medium text-[#1A1C1E]">{stats.totalBatches}</p>
          </div>
          <div className="bg-white rounded-[6px] p-2.5 sm:p-3 border border-[#6C7278]/20 shadow-sm">
            <p className="text-[9px] sm:text-[10px] uppercase font-medium text-[#6C7278] mb-0.5 sm:mb-1 tracking-[0.04em]" style={heritage.font.label}>Grup consignee</p>
            <p className="text-xl sm:text-2xl font-medium text-[#1A1C1E]">{stats.groupCount}</p>
          </div>
          <div className="bg-white rounded-[6px] p-2.5 sm:p-3 border border-[#6C7278]/20 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#B8422E]"></div>
            <p className="text-[9px] sm:text-[10px] uppercase font-medium text-[#6C7278] mb-0.5 sm:mb-1 tracking-[0.04em]" style={heritage.font.label}>Kritis (≥30 hari)</p>
            <p className="text-xl sm:text-2xl font-medium text-[#B8422E]">{stats.criticalCount}</p>
          </div>
          <div className="bg-white rounded-[6px] p-2.5 sm:p-3 border border-[#6C7278]/20 shadow-sm">
            <p className="text-[9px] sm:text-[10px] uppercase font-medium text-[#6C7278] mb-0.5 sm:mb-1 tracking-[0.04em]" style={heritage.font.label}>Tertua</p>
            <p className="text-xl sm:text-2xl font-medium text-[#1A1C1E] flex items-baseline gap-1">
              {stats.maxAging} <span className="text-xs sm:text-sm font-normal text-[#6C7278]">hari</span>
            </p>
          </div>
        </div>

        {/* Stats Toggle */}
        <div className="flex-shrink-0 px-4 sm:px-6 pt-2 pb-1 flex justify-end">
          <button
            onClick={() => setShowStats(v => !v)}
            className="flex items-center gap-1 text-[10px] sm:text-[11px] uppercase tracking-[0.04em] font-medium text-[#6C7278] hover:text-[#1A1C1E] transition-colors"
            style={heritage.font.label}
          >
            {showStats ? 'Sembunyikan ringkasan' : 'Tampilkan ringkasan'}
            {showStats ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Controls */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between border-b border-[#6C7278]/15">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:gap-4 text-[10px] sm:text-xs font-medium">
            <div className="flex items-center gap-1.5 text-[#B8422E]">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#B8422E]"></span>
              ≥30 hari
            </div>
            <div className="flex items-center gap-1.5 text-[#B8422E]/80">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#B8422E]/70"></span>
              8–29 hari
            </div>
            <div className="flex items-center gap-1.5 text-[#6C7278]">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#1A1C1E]/20"></span>
              ≤7 hari
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 w-full sm:w-auto mt-1 sm:mt-0">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#6C7278]" />
              <input
                type="text"
                placeholder="Cari kode batch atau consignee"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-1.5 bg-white border border-[#6C7278]/25 rounded-[4px] text-xs sm:text-sm focus:outline-none focus:border-[#1A1C1E]/50 transition-colors"
              />
            </div>
            <div className="flex w-full sm:w-auto bg-[#F7F5F2] border border-[#6C7278]/15 rounded-[4px] p-0.5">
              <button
                onClick={() => setSortBy('usia')}
                className={cn(
                  "flex-1 sm:flex-none px-3 py-1.5 sm:py-1 text-[11px] sm:text-xs font-medium rounded-[2px] transition-colors text-center",
                  sortBy === 'usia' ? "bg-white text-[#1A1C1E] shadow-sm border border-[#6C7278]/15" : "text-[#6C7278] hover:text-[#1A1C1E]"
                )}
              >
                Usia
              </button>
              <button
                onClick={() => setSortBy('jumlah')}
                className={cn(
                  "flex-1 sm:flex-none px-3 py-1.5 sm:py-1 text-[11px] sm:text-xs font-medium rounded-[2px] transition-colors text-center",
                  sortBy === 'jumlah' ? "bg-white text-[#1A1C1E] shadow-sm border border-[#6C7278]/15" : "text-[#6C7278] hover:text-[#1A1C1E]"
                )}
              >
                Jumlah
              </button>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
          {filteredAndSortedData.length === 0 ? (
            <div className="text-center text-[#6C7278] py-8 text-sm">
              Tidak ada data yang cocok.
            </div>
          ) : (
            filteredAndSortedData.map((group, idx) => {
              const isExpanded = expandedGroups[group.name];
              const displayCodes = isExpanded ? group.codes : group.codes.slice(0, 12);
              const hiddenCount = group.codes.length - displayCodes.length;

              // Compute distribution
              const critical = group.codes.filter(c => c.aging >= 30).length;
              const warning = group.codes.filter(c => c.aging >= 8 && c.aging <= 29).length;
              const normal = group.codes.filter(c => c.aging <= 7).length;
              const total = group.codes.length;

              const pctCrit = (critical / total) * 100;
              const pctWarn = (warning / total) * 100;
              const pctNorm = (normal / total) * 100;

              return (
                <div key={idx} className="border-b border-[#6C7278]/15 pb-5 sm:pb-6 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
                    <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                      <h3 className="font-medium text-base sm:text-lg text-[#1A1C1E] truncate">{group.name}</h3>
                      {/* Distribution Bar */}
                      <div className="w-16 sm:w-24 h-1.5 sm:h-2 flex rounded-full overflow-hidden bg-[#1A1C1E]/5 shrink-0">
                        {pctCrit > 0 && <div style={{ width: `${pctCrit}%` }} className="bg-[#B8422E]"></div>}
                        {pctWarn > 0 && <div style={{ width: `${pctWarn}%` }} className="bg-[#B8422E]/60"></div>}
                        {pctNorm > 0 && <div style={{ width: `${pctNorm}%` }} className="bg-[#1A1C1E]/20"></div>}
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-[#6C7278] shrink-0">{group.count} batch</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {displayCodes.map((c, cIdx) => (
                      <div
                        key={cIdx}
                        className={cn(
                          "px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-mono rounded-[4px] flex items-center gap-1.5 border shadow-sm",
                          c.aging >= 30 
                            ? "bg-[#1A1C1E] border-[#1A1C1E] text-white" 
                            : c.aging >= 8
                              ? "bg-white border-[#1A1C1E]/40 text-[#1A1C1E]"
                              : "bg-white border-[#6C7278]/20 text-[#6C7278]"
                        )}
                      >
                        {c.code}
                        <span className={cn(
                          "px-1 rounded-[2px] text-[8px] sm:text-[9px] font-bold",
                          c.aging >= 30 ? "bg-white/15" : c.aging >= 8 ? "bg-[#B8422E]/10" : "bg-[#1A1C1E]/[0.06]"
                        )}>
                          {c.aging}d
                        </span>
                      </div>
                    ))}
                  </div>

                  {hiddenCount > 0 && (
                    <button
                      onClick={() => toggleExpand(group.name)}
                      className="mt-3 text-[11px] uppercase tracking-[0.04em] font-medium text-[#1A1C1E] hover:text-[#B8422E] transition-colors flex items-center gap-1 bg-[#F7F5F2] px-3 py-1.5 rounded-[4px] border border-[#6C7278]/15 hover:border-[#1A1C1E]/30"
                      style={heritage.font.label}
                    >
                      Lihat {hiddenCount} lainnya <ChevronDown className="w-3 h-3" />
                    </button>
                  )}
                  {isExpanded && hiddenCount === 0 && group.codes.length > 12 && (
                    <button
                      onClick={() => toggleExpand(group.name)}
                      className="mt-3 text-[11px] uppercase tracking-[0.04em] font-medium text-[#1A1C1E] hover:text-[#B8422E] transition-colors flex items-center gap-1 bg-[#F7F5F2] px-3 py-1.5 rounded-[4px] border border-[#6C7278]/15 hover:border-[#1A1C1E]/30"
                      style={heritage.font.label}
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
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 bg-[#F7F5F2] border-t border-[#6C7278]/15 sm:rounded-b-[8px] flex justify-between items-center">
          <span 
            className="text-[9px] sm:text-[10px] uppercase tracking-[0.06em] font-medium text-[#6C7278]"
            style={heritage.font.label}
          >
            Total Consignee: {filteredAndSortedData.length}
          </span>
          <button
            onClick={onClose}
            className="px-4 sm:px-6 py-1.5 sm:py-2 bg-[#1A1C1E] text-white text-xs sm:text-sm font-medium rounded-[4px] shadow-sm hover:opacity-90 transition-opacity"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
