import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Check, Copy, User, Phone, Mail, MapPin,
  Truck, Receipt, MapPinned, FileText, ExternalLink, Calendar,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  statusConfig, BrokerBadge, DiscontinuedBadge,
  formatCustomerSince, formatCustomerTenure
} from './CustomerBadges'
import type { Customer } from '../types/customers.types'

interface CustomerDetailModalProps {
  customer: Customer | null
  isLoading?: boolean
  onClose: () => void
}

type TabType = 'info' | 'pengiriman' | 'penagihan' | 'alamat'

export function CustomerDetailModal({
  customer,
  isLoading = false,
  onClose,
}: CustomerDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('info')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!customer) return null

  const copyToClipboard = (text?: string | null, key?: string) => {
    if (!text || !key) return
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1500)
    })
  }

  const blockConfig = statusConfig[(customer.fdBlocked || 0) as keyof typeof statusConfig]
  const addressCount = customer.addresses?.length || 0

  const tabs: { key: TabType; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: 'info', label: 'Ringkasan & Kontak', icon: User },
    { key: 'pengiriman', label: 'Info Pengiriman', icon: Truck },
    { key: 'penagihan', label: 'Info Penagihan', icon: Receipt },
    { key: 'alamat', label: 'Daftar Alamat', icon: MapPinned, badge: addressCount },
  ]

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full sm:max-w-2xl md:max-w-3xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col h-[85vh] sm:h-[620px] max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Mobile Drag Indicator */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-[var(--color-surface)]">
          <div className="w-10 h-1 rounded-full bg-[var(--color-border)]" />
        </div>

        {/* Modal Header */}
        <div className="px-5 sm:px-6 pt-3 sm:pt-5 pb-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-lg sm:text-xl font-bold font-[var(--font-display)] text-[var(--color-primary)] tracking-tight truncate">
                  {customer.fdCustName || 'Customer Tanpa Nama'}
                </h2>
                {customer.fdBroker === 1 && <BrokerBadge size="sm" />}
                {customer.fdDiscontinued === 1 && <DiscontinuedBadge size="sm" />}
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                {/* Customer Code with copy */}
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--color-neutral)] border border-[var(--color-border)] font-mono font-semibold text-[var(--color-primary)]">
                  <span>{customer.fdCustCode}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(customer.fdCustCode, 'custCode')}
                    className="text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer transition-colors"
                    title="Salin Kode Customer"
                  >
                    {copiedKey === 'custCode' ? (
                      <Check size={12} className="text-emerald-500" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                </div>

                {/* Status Badge */}
                <Badge variant={blockConfig?.badgeVariant || 'default'} className="text-[10px]">
                  <span className={`w-1.5 h-1.5 rounded-full mr-1 ${blockConfig?.dotClass}`} />
                  {blockConfig?.label || 'NO STATUS'}
                </Badge>

                {/* Customer Tenure */}
                {formatCustomerTenure(customer.fdCreatedDate) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--color-neutral)] text-[var(--color-secondary)] text-[11px] font-medium border border-[var(--color-border)]">
                    <Calendar size={11} />
                    {formatCustomerTenure(customer.fdCreatedDate)} ({formatCustomerSince(customer.fdCreatedDate)})
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer shrink-0"
              title="Tutup Modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 overflow-x-auto mt-4 pt-1 border-t border-[var(--color-border)]/60 scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border',
                    isActive
                      ? 'bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs'
                      : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)]/60'
                  )}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={cn(
                      'ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                      isActive
                        ? 'bg-[var(--color-tertiary)]/15 text-[var(--color-tertiary)]'
                        : 'bg-[var(--color-neutral)] text-[var(--color-secondary)]'
                    )}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[var(--color-neutral)]/40 min-h-0 space-y-4">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2.5 text-[var(--color-secondary)]">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--color-tertiary)]" />
              <p className="text-xs font-medium">Memuat rincian customer...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: RINGKASAN & KONTAK */}
              {activeTab === 'info' && (
                <div className="space-y-4">
                  {/* Grid Contact & Sales */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Contact Person Card */}
                    <div className="p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] block">
                          Contact Person
                        </span>
                        <p className="text-sm font-bold text-[var(--color-primary)] mt-1">
                          {customer.fdContact || '—'}
                        </p>
                      </div>
                      {customer.fdHP && (
                        <div className="mt-3 pt-2.5 border-t border-[var(--color-border)] flex items-center justify-between">
                          <span className="text-xs font-mono font-semibold text-[var(--color-primary)] flex items-center gap-1">
                            <Phone size={12} className="text-[var(--color-secondary)]" />
                            {customer.fdHP}
                          </span>
                          <a
                            href={`https://wa.me/${customer.fdHP.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                          >
                            <span>WhatsApp</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Sales Representative */}
                    <div className="p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] block">
                          Sales Person
                        </span>
                        <p className="text-sm font-bold text-[var(--color-primary)] mt-1">
                          {customer.fdSalesNM || 'Tidak ada sales assigned'}
                        </p>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-secondary)]">
                        <span>Telepon Kantor:</span>
                        <span className="font-mono font-semibold text-[var(--color-primary)]">
                          {customer.fdTelp || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Detail Info Key-Value Table */}
                  <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs divide-y divide-[var(--color-border)]">
                    <div className="py-2 flex items-center justify-between text-xs first:pt-0">
                      <span className="text-[var(--color-secondary)]">Email Customer</span>
                      {customer.fdEmail ? (
                        <a
                          href={`mailto:${customer.fdEmail}`}
                          className="font-mono font-semibold text-[var(--color-tertiary)] hover:underline flex items-center gap-1"
                        >
                          <Mail size={12} />
                          {customer.fdEmail}
                        </a>
                      ) : (
                        <span className="text-[var(--color-secondary)] font-medium">—</span>
                      )}
                    </div>

                    <div className="py-2 flex items-center justify-between text-xs">
                      <span className="text-[var(--color-secondary)]">Nomor Fax</span>
                      <span className="font-mono font-semibold text-[var(--color-primary)]">
                        {customer.fdFax || '—'}
                      </span>
                    </div>

                    <div className="py-2 flex items-center justify-between text-xs">
                      <span className="text-[var(--color-secondary)]">Kota Operasional</span>
                      <span className="font-semibold text-[var(--color-primary)] flex items-center gap-1">
                        <MapPin size={12} className="text-[var(--color-secondary)]" />
                        {customer.fdCityName || '—'}
                      </span>
                    </div>

                    <div className="py-2 flex items-start justify-between gap-4 text-xs">
                      <span className="text-[var(--color-secondary)] shrink-0">Alamat Utama</span>
                      <span className="font-medium text-[var(--color-primary)] text-right max-w-sm">
                        {customer.fdAddr1 || '—'}
                      </span>
                    </div>

                    {customer.fdKeterangan && (
                      <div className="py-2.5 flex items-start justify-between gap-4 text-xs last:pb-0">
                        <span className="text-[var(--color-secondary)] shrink-0 flex items-center gap-1">
                          <FileText size={12} /> Keterangan
                        </span>
                        <span className="text-[var(--color-primary)] text-right font-medium italic">
                          {customer.fdKeterangan}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: INFO PENGIRIMAN */}
              {activeTab === 'pengiriman' && (
                <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs divide-y divide-[var(--color-border)]">
                  <div className="py-2.5 flex items-center justify-between text-xs first:pt-0">
                    <span className="text-[var(--color-secondary)]">Nama Penerima / Pengiriman</span>
                    <span className="font-bold text-[var(--color-primary)]">
                      {customer.fdNamaPengiriman || '—'}
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between text-xs">
                    <span className="text-[var(--color-secondary)]">Nomor HP Pengiriman</span>
                    <span className="font-mono font-semibold text-[var(--color-primary)]">
                      {customer.fdHpPengiriman || '—'}
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between text-xs">
                    <span className="text-[var(--color-secondary)]">Kota Pengiriman</span>
                    <span className="font-semibold text-[var(--color-primary)] flex items-center gap-1">
                      <MapPin size={12} className="text-[var(--color-secondary)]" />
                      {customer.fdKotaPengiriman || '—'}
                    </span>
                  </div>

                  <div className="py-2.5 flex items-start justify-between gap-4 text-xs">
                    <span className="text-[var(--color-secondary)] shrink-0">Alamat Lengkap Pengiriman</span>
                    <span className="font-medium text-[var(--color-primary)] text-right max-w-sm">
                      {customer.fdAlamatPengiriman || '—'}
                    </span>
                  </div>

                  {customer.fdKetPengiriman && (
                    <div className="py-2.5 flex items-start justify-between gap-4 text-xs last:pb-0">
                      <span className="text-[var(--color-secondary)] shrink-0">Instruksi Khusus</span>
                      <span className="text-amber-600 dark:text-amber-400 text-right font-medium">
                        {customer.fdKetPengiriman}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: INFO PENAGIHAN */}
              {activeTab === 'penagihan' && (
                <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs divide-y divide-[var(--color-border)]">
                  <div className="py-2.5 flex items-center justify-between text-xs first:pt-0">
                    <span className="text-[var(--color-secondary)]">Nomor HP Penagihan</span>
                    <span className="font-mono font-semibold text-[var(--color-primary)]">
                      {customer.fdHpPenagihan || '—'}
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between text-xs">
                    <span className="text-[var(--color-secondary)]">Email Penagihan</span>
                    {customer.fdEmailPenagihan ? (
                      <a
                        href={`mailto:${customer.fdEmailPenagihan}`}
                        className="font-mono font-semibold text-[var(--color-tertiary)] hover:underline flex items-center gap-1"
                      >
                        <Mail size={12} />
                        {customer.fdEmailPenagihan}
                      </a>
                    ) : (
                      <span className="text-[var(--color-secondary)]">—</span>
                    )}
                  </div>

                  <div className="py-2.5 flex items-center justify-between text-xs">
                    <span className="text-[var(--color-secondary)]">Notifikasi Tagihan</span>
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                      customer.fdNotifPenagihan === 1
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)]'
                    )}>
                      {customer.fdNotifPenagihan === 1 ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </div>

                  {customer.fdKeteranganPenagihan && (
                    <div className="py-2.5 flex items-start justify-between gap-4 text-xs last:pb-0">
                      <span className="text-[var(--color-secondary)] shrink-0">Catatan Penagihan</span>
                      <span className="text-[var(--color-primary)] text-right font-medium">
                        {customer.fdKeteranganPenagihan}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: DAFTAR ALAMAT TAMBAHAN */}
              {activeTab === 'alamat' && (
                <div className="space-y-3">
                  {customer.addresses && customer.addresses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {customer.addresses.map((addr) => (
                        <div
                          key={addr.fdID}
                          className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs flex flex-col justify-between gap-2.5"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="px-2 py-0.5 rounded-md bg-[var(--color-neutral)] text-[var(--color-primary)] text-[11px] font-bold border border-[var(--color-border)]">
                                {addr.fdJenis || 'Cabang'}
                              </span>
                              {addr.fdAktif === 1 ? (
                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                  Aktif
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-[var(--color-secondary)]">
                                  Non-aktif
                                </span>
                              )}
                            </div>

                            <p className="text-xs font-bold text-[var(--color-primary)]">
                              {addr.fdContact || '—'}
                            </p>
                            <p className="text-xs text-[var(--color-secondary)] mt-1 line-clamp-2">
                              {addr.fdAddr}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-[11px] text-[var(--color-secondary)]">
                            <span className="font-semibold text-[var(--color-primary)]">
                              {addr.fdCity || '—'}
                            </span>
                            <span className="font-mono font-medium">
                              {addr.fdHP || addr.fdTelp || '—'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-center">
                      <EmptyState
                        title="Tidak Ada Alamat Tambahan"
                        description="Customer ini belum memiliki daftar alamat cabang atau gudang sekunder."
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] shrink-0 flex items-center justify-between gap-2">
          <span className="text-[11px] text-[var(--color-secondary)]">
            Tekan <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[var(--color-neutral)] border border-[var(--color-border)] rounded shadow-2xs">ESC</kbd> untuk menutup
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-neutral)]/80 hover:bg-[var(--color-neutral)] text-xs font-semibold text-[var(--color-primary)] transition-colors cursor-pointer"
          >
            Tutup Modal
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
