import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, LogOut, Package, Plane, Ship } from 'lucide-react';

export interface ExitListItem {
  fdMarkingCode: string;
  fdConsignee: string | null;
  fdExitDate: string | null;
  fdGudang?: string | null;
  fdListType?: number | null;
  fdKet?: string | null;
}

interface ExitListModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ExitListItem[];
  title: string;
  description: string;
  iconColorClass?: string;
  iconBgClass?: string;
}

export function ExitListModal({ isOpen, onClose, data, title, description, iconColorClass = "text-blue-500", iconBgClass = "bg-blue-50/10" }: ExitListModalProps) {
  const [search, setSearch] = useState('');

  const filteredData = useMemo(() => {
    let result = data;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(item => 
        item.fdMarkingCode.toLowerCase().includes(q) ||
        (item.fdConsignee && item.fdConsignee.toLowerCase().includes(q))
      );
    }
    return result;
  }, [data, search]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-[var(--color-border)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between ${iconBgClass}`}>
          <div>
            <h2 className="text-xl font-bold font-[var(--font-display)] text-[var(--color-primary)] flex items-center gap-2">
              <LogOut className={`w-5 h-5 ${iconColorClass}`} /> {title}
            </h2>
            <p className="text-sm text-[var(--color-secondary)] mt-1">{description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--color-neutral)] rounded-md transition-colors text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/30 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-secondary)]" />
            <input
              type="text"
              placeholder="Cari marking code / consignee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-tertiary)]/50 focus:border-[var(--color-tertiary)] transition-shadow"
            />
          </div>
          <div className="text-sm text-[var(--color-secondary)] font-medium">
            Total: <span className="text-[var(--color-primary)]">{filteredData.length}</span> Batch
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[var(--color-neutral)]">
          {filteredData.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-[var(--color-neutral)] rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-[var(--color-secondary)] opacity-50" />
              </div>
              <p className="text-[var(--color-secondary)]">Tidak ada batch yang sesuai.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {[
                { title: 'Air (Udara)', type: 1, icon: Plane, color: 'text-sky-500', bg: 'bg-sky-500/10' },
                { title: 'Sea (Laut)', type: 2, icon: Ship, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { title: 'Lainnya', type: null, icon: Package, color: 'text-[var(--color-secondary)]', bg: 'bg-[var(--color-neutral)]' }
              ].map((group) => {
                const groupData = filteredData.filter(item => 
                  group.type === null ? (item.fdListType !== 1 && item.fdListType !== 2) : item.fdListType === group.type
                );
                
                if (groupData.length === 0) return null;

                const GroupIcon = group.icon;

                return (
                  <div key={group.title} className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 pb-1 border-b border-[var(--color-border)]">
                      <GroupIcon className={`w-4 h-4 ${group.color}`} />
                      <h3 className={`text-sm font-bold ${group.color}`}>{group.title}</h3>
                      <span className="text-xs bg-[var(--color-neutral)] px-2 py-0.5 rounded-full text-[var(--color-secondary)]">
                        {groupData.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {groupData.map((item, idx) => (
                        <div key={idx} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 shadow-sm hover:shadow transition-shadow flex items-start gap-3">
                          <div className={`p-2 rounded-md ${group.bg}`}>
                            <GroupIcon className={`w-4 h-4 ${group.color}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-[var(--color-primary)] truncate" title={item.fdMarkingCode}>
                              {item.fdMarkingCode}
                            </p>
                            <p className="text-xs text-[var(--color-secondary)] truncate" title={item.fdConsignee || 'Tidak diketahui'}>
                              {item.fdConsignee || 'Tidak diketahui'}
                            </p>
                            {item.fdKet && item.fdKet.trim() !== '' && (
                              <p className="text-[10px] text-[var(--color-tertiary)] mt-0.5 truncate" title={item.fdKet}>
                                Ket: {item.fdKet}
                              </p>
                            )}
                          </div>
                          {item.fdGudang && (
                            <div className="text-right flex-shrink-0">
                              <p className="text-[10px] uppercase font-bold text-[var(--color-secondary)] tracking-wider">Gudang</p>
                              <p className="text-sm font-medium text-[var(--color-primary)]">
                                {item.fdGudang}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
