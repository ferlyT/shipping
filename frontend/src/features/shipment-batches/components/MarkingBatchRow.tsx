// Shared row components untuk tabel/list marking
// DILARANG: mendefinisikan ulang BatchRow atau BatchListRow di halaman manapun

import { MapPin, Calendar, ClipboardList, Eye, Ship, Plane, ChevronRight } from 'lucide-react'
import { cn, formatDateShort } from '@/lib/utils'
import { MarkingStatusBadge } from './MarkingStatusBadge'
import type { Marking } from '../types/marking.types'

// ─────────────────────────────────────────────────────────────────────────────
// BatchRow — Baris desktop table
// ─────────────────────────────────────────────────────────────────────────────

interface BatchRowProps {
  row: Marking
  onView: (row: Marking) => void
  onViewManifest: (row: Marking) => void
}

export function BatchRow({ row, onView, onViewManifest }: BatchRowProps) {
  return (
    <tr className="bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] transition-colors duration-200 border-b border-[var(--color-border)] last:border-0">
      <td className="py-4 pl-4 pr-3">
        <p className="text-sm font-semibold text-[var(--color-primary)]">
          {row.fdMarkingCode}
        </p>
        <span className="mt-1.5 inline-block">
          <MarkingStatusBadge
            status={row.fdStatus}
            exitDate={row.fdExitDate}
            loadDate={row.fdLoadDate}
            etdDate={row.fdETD}
            etaDate={row.fdETA}
            sysDate={row.fdSysDate}
          />
        </span>
      </td>
      <td className="py-4 px-3">
        <p className="text-sm text-[var(--color-primary)] font-medium">
          {row.fdConsignee || '-'}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-[var(--color-secondary)]">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate max-w-[150px]">{row.fdWilayah || 'Tidak diketahui'}</span>
        </p>
      </td>
      <td className="py-4 px-3 text-sm text-[var(--color-secondary)]">
        {row.fdListType === 1 ? (
          <span className="font-medium text-[var(--color-primary)]">AWB: {row.fdAWB || '—'}</span>
        ) : (
          <span className="font-medium text-[var(--color-primary)]">BL: {row.fdBLNo || '—'}</span>
        )}
        {row.fdListType !== 1 && (row.fdListType === 2 || (row.fdContNo && row.fdContNo.trim() !== '')) && (
          <p className="text-xs mt-1">
            Cont: {row.fdContNo || '—'}
            {row.fdContSize && row.fdContSize.trim() !== '' ? ` (${row.fdContSize.trim()})` : ''}
          </p>
        )}
        {row.fdKet && row.fdKet.trim() !== '' && (
          <p className="text-xs mt-1 text-[var(--color-tertiary)] truncate max-w-[150px]" title={row.fdKet}>
            Ket: {row.fdKet}
          </p>
        )}
      </td>
      <td className="py-4 px-3">
        <p className="text-sm text-[var(--color-primary)] font-medium">
          {row.fdJmlPack != null ? Number(row.fdJmlPack).toLocaleString('en-US') : 0} PKGS
        </p>
        <p className="mt-0.5 text-xs text-[var(--color-secondary)]">
          {row.fdJmlBerat != null ? Number(row.fdJmlBerat).toLocaleString('en-US') : 0} KG
        </p>
      </td>
      <td className="py-4 px-3 text-sm text-[var(--color-secondary)] whitespace-nowrap">
        <div className="flex items-start gap-2">
          <Calendar className="h-4 w-4 mt-0.5 text-[var(--color-secondary)]/70 shrink-0" />
          <div className="flex flex-col space-y-1.5">
            {[
              { label: 'LOAD', value: row.fdLoadDate },
              { label: 'ETD',  value: row.fdETD },
              { label: 'ETA',  value: row.fdETA },
              { label: 'EXIT', value: row.fdExitDate },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] md:text-xs font-bold text-[var(--color-primary)] w-8">
                  {label}
                </span>
                <span className={cn(
                  'text-xs font-medium',
                  label === 'EXIT' && !value && 'text-[var(--color-muted)]'
                )}>
                  {formatDateShort(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </td>
      <td className="py-4 pr-4 pl-3 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => onViewManifest(row)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-neutral)] bg-[var(--color-surface)] cursor-pointer"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Manifest
          </button>
          <button
            onClick={() => onView(row)}
            className="inline-flex items-center justify-center p-2 text-[var(--color-secondary)] hover:bg-[var(--color-neutral)] rounded-lg transition-all duration-200"
          >
            <Eye className="w-[18px] h-[18px]" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BatchListRow — Baris mobile/shortlist
// ─────────────────────────────────────────────────────────────────────────────

interface BatchListRowProps {
  row: Marking
  onView: (row: Marking) => void
}

export function BatchListRow({ row, onView }: BatchListRowProps) {
  const isAir = row.fdListType === 1

  return (
    <button
      type="button"
      onClick={() => onView(row)}
      className="flex w-full flex-col gap-3 p-3.5 sm:p-4 text-left hover:bg-[var(--color-neutral)] active:opacity-80 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]/40"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/5 text-[var(--color-primary)] border border-[var(--color-border)]">
            {isAir ? <Plane className="h-3.5 w-3.5" /> : <Ship className="h-3.5 w-3.5" />}
          </div>
          <div>
            <div className="font-bold font-[var(--font-display)] text-[var(--color-primary)] text-[13px] sm:text-[14px] md:text-[15px] leading-none">
              {row.fdMarkingCode}
            </div>
            <div className="text-[10px] sm:text-[11px] md:text-xs text-[var(--color-secondary)] mt-0.5 line-clamp-1">
              {row.fdConsignee || 'Consignee tidak diketahui'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex flex-col items-end gap-1">
            <MarkingStatusBadge
              status={row.fdStatus}
              exitDate={row.fdExitDate}
              loadDate={row.fdLoadDate}
              etdDate={row.fdETD}
              etaDate={row.fdETA}
              sysDate={row.fdSysDate}
            />
            <div className="text-[10px] font-medium text-[var(--color-secondary)]">
              {row.fdJmlPack || 0} PKGS
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--color-secondary)] shrink-0" />
        </div>
      </div>
    </button>
  )
}
