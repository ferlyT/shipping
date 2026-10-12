import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Check, Copy, User, Phone, Mail, MapPin,
  MapPinned, FileText, ExternalLink, Calendar,
  ChevronLeft, ChevronRight, TrendingUp, CheckCircle2, Package
} from 'lucide-react'
import { cn, formatCurrency, formatCompactRupiah, displayCustName, copyToClipboard as copyTextToClipboard } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  statusConfig, BrokerBadge, DiscontinuedBadge, CustomerTierBadge,
  formatCustomerSince, formatCustomerTenure, tierBadgeConfig
} from './CustomerBadges'
import { CustomerCommodityTab } from './CustomerCommodityTab'
import type { Customer } from '../types/customers.types'

export function CustomerDetailBodySkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in-50 duration-200">
      {/* Top Grid: Contact Person & Sales Representative Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Card 1 */}
        <div className="p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="h-2.5 w-24 rounded skeleton-shimmer" />
            <div className="h-4 w-40 rounded skeleton-shimmer" />
          </div>
          <div className="pt-2.5 border-t border-[var(--color-border)] flex items-center justify-between">
            <div className="h-3 w-28 rounded skeleton-shimmer" />
            <div className="h-3 w-16 rounded skeleton-shimmer" />
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="h-2.5 w-24 rounded skeleton-shimmer" />
            <div className="h-4 w-36 rounded skeleton-shimmer" />
          </div>
          <div className="pt-2.5 border-t border-[var(--color-border)] flex items-center justify-between">
            <div className="h-3 w-24 rounded skeleton-shimmer" />
            <div className="h-3 w-20 rounded skeleton-shimmer" />
          </div>
        </div>
      </div>

      {/* Middle: Detail Info Key-Value Table Skeleton */}
      <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs divide-y divide-[var(--color-border)]">
        {[
          { labelW: 'w-24', valW: 'w-44' },
          { labelW: 'w-20', valW: 'w-28' },
          { labelW: 'w-28', valW: 'w-36' },
          { labelW: 'w-24', valW: 'w-64' },
          { labelW: 'w-20', valW: 'w-52' },
        ].map((item, idx) => (
          <div key={idx} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0">
            <div className={cn("h-3 rounded skeleton-shimmer", item.labelW)} />
            <div className={cn("h-3 rounded skeleton-shimmer", item.valW)} />
          </div>
        ))}
      </div>

      {/* Bottom: Additional Quick Stats / Tier Bar Skeleton */}
      <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-3 w-32 rounded skeleton-shimmer" />
          <div className="h-4 w-20 rounded-full skeleton-shimmer" />
        </div>
        <div className="h-2 w-full rounded-full skeleton-shimmer" />
        <div className="flex items-center justify-between pt-1">
          <div className="h-2.5 w-40 rounded skeleton-shimmer" />
          <div className="h-2.5 w-24 rounded skeleton-shimmer" />
        </div>
      </div>
    </div>
  )
}

export function CustomerDetailFullSkeleton({ onClose }: { onClose: () => void }) {
  return (
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
        className="relative w-full sm:max-w-2xl md:max-w-3xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col h-[88vh] sm:h-[640px] max-h-[94vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Mobile Drag Indicator */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-[var(--color-surface)]">
          <div className="w-10 h-1 rounded-full bg-[var(--color-border)]" />
        </div>

        {/* Modal Header Skeleton */}
        <div className="px-5 sm:px-6 pt-3 sm:pt-4 pb-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-5 w-48 sm:w-64 rounded-md skeleton-shimmer" />
                <div className="h-4 w-16 rounded-full skeleton-shimmer" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-5 w-24 rounded-md skeleton-shimmer" />
                <div className="h-5 w-20 rounded-md skeleton-shimmer" />
                <div className="h-5 w-28 rounded-md skeleton-shimmer hidden sm:block" />
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer shrink-0"
              title="Tutup Modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tab Navigation Skeleton */}
          <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-[var(--color-border)]/60 scrollbar-none">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-7 w-24 sm:w-28 rounded-lg skeleton-shimmer shrink-0" />
            ))}
          </div>
        </div>

        {/* Modal Body Skeleton */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[var(--color-neutral)]/40 min-h-0 space-y-4">
          <CustomerDetailBodySkeleton />
        </div>

        {/* Modal Footer Skeleton */}
        <div className="px-5 sm:px-6 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] shrink-0 flex items-center justify-between gap-2">
          <div className="h-3 w-40 rounded skeleton-shimmer" />
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/80 hover:bg-[var(--color-neutral)] text-xs font-semibold text-[var(--color-primary)] transition-colors cursor-pointer"
          >
            Tutup Modal
          </button>
        </div>
      </div>
    </div>
  )
}

interface CustomerDetailModalProps {
  customer: Customer | null
  isLoading?: boolean
  onClose: () => void
  canViewTier?: boolean
}

type TabType = 'info' | 'finansial' | 'komoditas' | 'alamat'

const TAB_KEYS: TabType[] = ['info', 'finansial', 'komoditas', 'alamat']

export function CustomerDetailModal({
  customer,
  isLoading = false,
  onClose,
  canViewTier = true,
}: CustomerDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('info')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const tabButtonRefs = useRef<Record<TabType, HTMLButtonElement | null>>({
    info: null,
    finansial: null,
    komoditas: null,
    alamat: null,
  })

  // Touch Swipe coordinates ref
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)
  const touchEndY = useRef<number | null>(null)

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Reset tab on modal open
  useEffect(() => {
    if (customer) {
      setActiveTab('info')
    }
  }, [customer?.fdCustCode])

  // Auto-scroll active tab into view in the tab bar
  useEffect(() => {
    const activeBtn = tabButtonRefs.current[activeTab]
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      })
    }
  }, [activeTab])

  if (!customer) {
    if (isLoading) {
      if (typeof document === 'undefined') return null
      return createPortal(<CustomerDetailFullSkeleton onClose={onClose} />, document.body)
    }
    return null
  }

  const copyToClipboard = async (text?: string | null, key?: string) => {
    if (!text || !key) return
    const ok = await copyTextToClipboard(text)
    if (ok) {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1500)
    }
  }

  const blockConfig = statusConfig[(customer.fdBlocked || 0) as keyof typeof statusConfig]
  const addressCount = customer.addresses?.length || 0
  const activeTier = customer.currentTier || customer.tier || 'none'
  const financialStats = customer.financialStats || []
  const latestFinStat = financialStats[0] || null

  const tabs: { key: TabType; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: 'info', label: 'Ringkasan & Kontak', icon: User },
    { key: 'finansial', label: 'Tier & Finansial', icon: TrendingUp },
    { key: 'komoditas', label: 'Komoditas', icon: Package },
    { key: 'alamat', label: 'Daftar Alamat', icon: MapPinned, badge: addressCount },
  ]

  const effectiveTabs = tabs.filter((t) => canViewTier || t.key !== 'finansial')
  const effectiveTabKeys = TAB_KEYS.filter((k) => canViewTier || k !== 'finansial')

  // Touch handlers for mobile slide/swipe gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null
    touchEndY.current = null
    touchStartX.current = e.targetTouches[0].clientX
    touchStartY.current = e.targetTouches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
    touchEndY.current = e.targetTouches[0].clientY
  }

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return
    const diffX = touchStartX.current - touchEndX.current
    const diffY = (touchStartY.current || 0) - (touchEndY.current || 0)

    // Ensure horizontal swipe is dominant and above minimum distance threshold (40px)
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) * 1.3) {
      const currentIndex = effectiveTabKeys.indexOf(activeTab)
      if (diffX > 0) {
        // Swiped Left -> go to Next Tab
        if (currentIndex < effectiveTabKeys.length - 1) {
          setActiveTab(effectiveTabKeys[currentIndex + 1])
        }
      } else {
        // Swiped Right -> go to Previous Tab
        if (currentIndex > 0) {
          setActiveTab(effectiveTabKeys[currentIndex - 1])
        }
      }
    }

    touchStartX.current = null
    touchStartY.current = null
    touchEndX.current = null
    touchEndY.current = null
  }

  const currentTabIndex = effectiveTabKeys.indexOf(activeTab)

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
        className="relative w-full sm:max-w-2xl md:max-w-3xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col h-[88vh] sm:h-[640px] max-h-[94vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Mobile Drag Indicator */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-[var(--color-surface)]">
          <div className="w-10 h-1 rounded-full bg-[var(--color-border)]" />
        </div>

        {/* Modal Header */}
        <div className="px-5 sm:px-6 pt-3 sm:pt-4 pb-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-[15px] font-bold font-[var(--font-label)] uppercase tracking-wide text-[var(--color-primary)] truncate">
                  {displayCustName(customer.fdCustName, 'Customer Tanpa Nama')}
                </h2>
                {canViewTier && activeTier !== 'none' && <CustomerTierBadge tier={activeTier} size="sm" />}
                {customer.fdBroker === 1 && <BrokerBadge size="sm" />}
                {customer.fdDiscontinued === 1 && <DiscontinuedBadge size="sm" />}
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                {/* Customer Code with copy */}
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--color-neutral)] border border-[var(--color-border)] font-mono font-semibold text-[11px] text-[var(--color-primary)]">
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
                <Badge variant={blockConfig?.badgeVariant || 'default'} className="text-[10.5px]">
                  <span className={`w-1.5 h-1.5 rounded-full mr-1 ${blockConfig?.dotClass}`} />
                  {blockConfig?.label || 'NO STATUS'}
                </Badge>

                {/* Customer Tenure */}
                {formatCustomerTenure(customer.fdCreatedDate) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--color-neutral)] text-[var(--color-secondary)] text-[11px] font-medium border border-[var(--color-border)]">
                    <Calendar size={11} className="hidden sm:inline-block" />
                    {formatCustomerTenure(customer.fdCreatedDate)} ({formatCustomerSince(customer.fdCreatedDate)})
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer shrink-0"
              title="Tutup Modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 overflow-x-auto mt-3 pt-1 border-t border-[var(--color-border)]/60 scrollbar-none">
            {effectiveTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  ref={(el) => { tabButtonRefs.current[tab.key] = el }}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border',
                    isActive
                      ? 'bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs'
                      : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)]/60'
                  )}
                >
                  <Icon size={14} className="hidden sm:inline-block" />
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

        {/* Modal Body Content (Supports Touch Swipe Gesture on Mobile) */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[var(--color-neutral)]/40 min-h-0 space-y-4 touch-pan-y select-none sm:select-auto"
        >
          {isLoading ? (
            <CustomerDetailBodySkeleton />
          ) : (
            <div key={activeTab} className="animate-in fade-in-50 duration-200">
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
                            <Phone size={12} className="hidden sm:inline-block text-[var(--color-secondary)]" />
                            {customer.fdHP}
                          </span>
                          <a
                            href={`https://wa.me/${customer.fdHP.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                          >
                            <span>WhatsApp</span>
                            <ExternalLink size={10} className="hidden sm:inline-block" />
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
                          <Mail size={12} className="hidden sm:inline-block" />
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
                        <MapPin size={12} className="hidden sm:inline-block text-[var(--color-secondary)]" />
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
                          <FileText size={12} className="hidden sm:inline-block" /> Keterangan
                        </span>
                        <span className="text-[var(--color-primary)] text-right font-medium italic">
                          {customer.fdKeterangan}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: TIER & FINANSIAL */}
              {activeTab === 'finansial' && (
                <div className="space-y-4">
                  {/* Active Tier Summary Card */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col gap-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] block">
                          Klasifikasi Tier Pelanggan
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-lg sm:text-xl font-extrabold text-[var(--color-primary)]">
                            {tierBadgeConfig[activeTier]?.label || 'UNRANKED'}
                          </span>
                          <CustomerTierBadge tier={activeTier} size="md" />
                        </div>
                      </div>

                      {latestFinStat && (
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] block">
                            Omzet Invoice ({latestFinStat.year})
                          </span>
                          <span className="text-base sm:text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(latestFinStat.totalRevenue)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Tier Progress Bar */}
                    {latestFinStat && latestFinStat.nextTier && latestFinStat.remainingForNextTier !== undefined && (
                      <div className="mt-1 pt-3 border-t border-[var(--color-border)] space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[var(--color-primary)]">
                            Progress Menuju {tierBadgeConfig[latestFinStat.nextTier]?.label}
                          </span>
                          <span className="text-[11px] font-mono text-[var(--color-secondary)]">
                            {latestFinStat.progressToNextTier || 0}%
                          </span>
                        </div>

                        <div className="h-2 w-full bg-[var(--color-neutral)] rounded-full overflow-hidden border border-[var(--color-border)]/60">
                          <div
                            className="h-full bg-gradient-to-r from-[var(--color-tertiary)] to-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(5, latestFinStat.progressToNextTier || 0))}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[var(--color-secondary)]">
                          <span>
                            {latestFinStat.remainingForNextTier > 0 ? (
                              <>
                                Kurang <strong className="text-[var(--color-primary)] font-semibold font-mono">{formatCurrency(latestFinStat.remainingForNextTier)}</strong> untuk naik tier
                              </>
                            ) : (
                              'Target tier tercapai'
                            )}
                          </span>
                          <span>Target: {formatCompactRupiah(latestFinStat.nextMin)}</span>
                        </div>
                      </div>
                    )}

                    {latestFinStat && latestFinStat.adjustedInvoices > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px]">
                        <CheckCircle2 size={13} className="shrink-0" />
                        <span>Termasuk {latestFinStat.adjustedInvoices} invoice penyesuaian rekonsiliasi dari data awal (tbBillingPrev).</span>
                      </div>
                    )}
                  </div>

                  {/* Multi-Year History Table */}
                  <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs overflow-hidden">
                    <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/40 flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
                        Riwayat Omzet Tahunan
                      </h4>
                      <span className="text-[11px] text-[var(--color-secondary)]">
                        {financialStats.length} Periode Tercatat
                      </span>
                    </div>

                    {financialStats.length > 0 ? (
                      <div className="divide-y divide-[var(--color-border)] text-xs">
                        {financialStats.map((stat) => (
                          <div key={stat.year} className="p-3.5 flex items-center justify-between gap-3 hover:bg-[var(--color-neutral)]/20 transition-colors">
                            <div className="flex items-center gap-2.5">
                              <span className="font-mono font-bold text-sm text-[var(--color-primary)] bg-[var(--color-neutral)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                                {stat.year}
                              </span>
                              <CustomerTierBadge tier={stat.tier} size="xs" />
                            </div>

                            <div className="text-right">
                              <div className="font-mono font-bold text-[var(--color-primary)]">
                                {formatCurrency(stat.totalRevenue)}
                              </div>
                              <div className="text-[10px] text-[var(--color-secondary)]">
                                {stat.totalInvoices.toLocaleString('en-US')} invoice
                                {stat.adjustedInvoices > 0 && ` (${stat.adjustedInvoices} prev)`}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-xs text-[var(--color-secondary)]">
                        Belum ada riwayat transaksi invoice untuk customer ini.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: KOMODITAS */}
              {activeTab === 'komoditas' && (
                <CustomerCommodityTab customerId={customer.fdCustCode} />
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
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] shrink-0 flex items-center justify-between gap-2">
          {/* Mobile Swipe Navigation / Dots */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[var(--color-secondary)] hidden sm:inline">
              Tekan <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[var(--color-neutral)] border border-[var(--color-border)] rounded shadow-2xs">ESC</kbd> untuk menutup
            </span>

            {/* Mobile Tab Swipe Dots */}
            <div className="flex sm:hidden items-center gap-1.5 py-1">
              <button
                type="button"
                disabled={currentTabIndex === 0}
                onClick={() => currentTabIndex > 0 && setActiveTab(effectiveTabKeys[currentTabIndex - 1])}
                className="p-1 rounded text-[var(--color-secondary)] disabled:opacity-30 cursor-pointer"
                title="Tab Sebelumnya"
              >
                <ChevronLeft size={14} />
              </button>

              <div className="flex items-center gap-1">
                {effectiveTabKeys.map((key, idx) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={cn(
                      "h-1.5 rounded-full transition-all cursor-pointer",
                      activeTab === key
                        ? "w-4 bg-[var(--color-tertiary)]"
                        : "w-1.5 bg-[var(--color-border)] hover:bg-[var(--color-secondary)]"
                    )}
                    title={effectiveTabs[idx]?.label}
                  />
                ))}
              </div>

              <button
                type="button"
                disabled={currentTabIndex === effectiveTabKeys.length - 1}
                onClick={() => currentTabIndex < effectiveTabKeys.length - 1 && setActiveTab(effectiveTabKeys[currentTabIndex + 1])}
                className="p-1 rounded text-[var(--color-secondary)] disabled:opacity-30 cursor-pointer"
                title="Tab Berikutnya"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/80 hover:bg-[var(--color-neutral)] text-xs font-semibold text-[var(--color-primary)] transition-colors cursor-pointer"
          >
            Tutup Modal
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
