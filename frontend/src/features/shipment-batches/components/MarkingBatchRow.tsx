// Shared row components untuk tabel/list marking
// DILARANG: mendefinisikan ulang BatchRow atau BatchListRow di halaman manapun

import { MapPin, Calendar, ClipboardList, Eye, Ship, Plane } from 'lucide-react'
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
  onViewManifest?: (row: Marking) => void
}

export function BatchListRow({ row, onView, onViewManifest }: BatchListRowProps) {
  const isAir = row.fdListType === 1

  return (
    <div className="p-3.5 sm:p-4 flex flex-col gap-2.5 bg-[var(--color-surface)] hover:bg-[var(--color-neutral)]/20 transition-colors">
      {/* Top Row: Mode badge + Marking Code + Status Badge */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
              isAir
                ? 'bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400'
                : 'bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400'
            )}
          >
            {isAir ? <Plane size={11} /> : <Ship size={11} />}
            {isAir ? 'UDARA' : 'LAUT'}
          </span>

          <span className="font-mono text-xs sm:text-sm font-bold text-[var(--color-primary)]">
            {row.fdMarkingCode}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <MarkingStatusBadge
            status={row.fdStatus}
            exitDate={row.fdExitDate}
            loadDate={row.fdLoadDate}
            etdDate={row.fdETD}
            etaDate={row.fdETA}
            sysDate={row.fdSysDate}
          />
        </div>
      </div>

      {/* Consignee & Wilayah */}
      <div className="min-w-0 cursor-pointer" onClick={() => onView(row)}>
        <div className="font-bold text-[var(--color-primary)] text-sm leading-tight truncate" title={row.fdConsignee || '-'}>
          {row.fdConsignee || 'Consignee Tidak Diketahui'}
        </div>
        <div className="text-[11px] text-[var(--color-secondary)] mt-0.5 flex items-center gap-1 flex-wrap">
          <MapPin className="h-3 w-3 text-[var(--color-secondary)] shrink-0" />
          <span>{row.fdWilayah || 'Wilayah tidak diketahui'}</span>
        </div>
      </div>

      {/* Inner Details Box */}
      <div className="p-2.5 rounded-xl bg-[var(--color-neutral)]/50 border border-[var(--color-border)]/80 flex flex-col gap-2">
        {/* Dokumen & Container */}
        <div className="flex items-start justify-between gap-2 text-xs flex-wrap">
          <div className="flex items-center gap-1.5 font-mono font-medium text-[var(--color-primary)]">
            <span className="text-[10px] text-[var(--color-secondary)] font-bold uppercase">{isAir ? 'AWB:' : 'BL:'}</span>
            <span>{isAir ? (row.fdAWB || '—') : (row.fdBLNo || '—')}</span>
          </div>

          {!isAir && (row.fdContNo || row.fdContSize) && (
            <div className="text-[11px] text-[var(--color-secondary)] font-mono">
              Cont: <strong className="text-[var(--color-primary)]">{row.fdContNo || '—'}</strong>
              {row.fdContSize && <span> ({row.fdContSize.trim()})</span>}
            </div>
          )}
        </div>

        {row.fdKet && row.fdKet.trim() !== '' && (
          <div className="text-[11px] text-[var(--color-secondary)] bg-[var(--color-surface)] px-2 py-1 rounded-md border border-[var(--color-border)]/60 break-words">
            <span className="font-semibold text-[var(--color-primary)]">Ket:</span> {row.fdKet}
          </div>
        )}

        {/* Milestones Flow: 4 clean boxes (LOAD, ETD, ETA, EXIT) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1.5 border-t border-[var(--color-border)]/60 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-[var(--color-secondary)]">LOAD:</span>
            <span className="text-[var(--color-primary)] font-medium">{formatDateShort(row.fdLoadDate)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-[var(--color-secondary)]">ETD:</span>
            <span className="text-[var(--color-primary)] font-medium">{formatDateShort(row.fdETD)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-[var(--color-secondary)]">ETA:</span>
            <span className="text-[var(--color-primary)] font-medium">{formatDateShort(row.fdETA)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-[var(--color-secondary)]">EXIT:</span>
            <span className={cn(
              'font-medium',
              row.fdExitDate ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-[var(--color-secondary)]/50'
            )}>
              {formatDateShort(row.fdExitDate)}
            </span>
          </div>
        </div>

        {/* Totals & Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[var(--color-border)]/60">
          <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--color-secondary)]">
            <span className="font-bold text-[var(--color-primary)]">
              {Number(row.fdJmlPack || 0).toLocaleString('en-US')} PKGS
            </span>
            <span className="text-[var(--color-border)]">·</span>
            <span>
              {Number(row.fdJmlBerat || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} KG
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onViewManifest && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onViewManifest(row)
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)] transition-colors cursor-pointer shadow-2xs"
              >
                <ClipboardList className="w-3 h-3 text-[var(--color-secondary)]" />
                Manifest
              </button>
            )}
            <button
              type="button"
              onClick={() => onView(row)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] transition-colors cursor-pointer"
            >
              <Eye className="w-3 h-3" />
              Detail
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
