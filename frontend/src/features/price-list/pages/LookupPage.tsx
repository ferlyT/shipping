import { useLayoutEffect, useRef, useState } from 'react'
import { Calendar, Search } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ROUTES } from '@/lib/constants'
import { useDateLookup, useEntryLookup } from '../hooks'
import { DateLookupTab } from '../components/DateLookupTab'
import { EntryLookupTab } from '../components/EntryLookupTab'

type TabKey = 'date' | 'entry'

const TABS: { key: TabKey; label: string; icon: typeof Search }[] = [
  { key: 'entry', label: 'Cari by Data Pengiriman', icon: Search },
  { key: 'date', label: 'Cari by Tanggal', icon: Calendar },
]

export function LookupPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('entry')
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  const dateLookup = useDateLookup(activeTab === 'date')
  const entryLookup = useEntryLookup(activeTab === 'entry')

  // Keep the sliding indicator pinned under whichever tab is active,
  // regardless of label width.
  useLayoutEffect(() => {
    const node = tabRefs.current[activeTab]
    if (node) {
      setIndicator({ left: node.offsetLeft, width: node.offsetWidth })
    }
  }, [activeTab])

  if (
    dateLookup.isLoadingDate &&
    !dateLookup.dateResult &&
    dateLookup.isLoadingFilters &&
    activeTab === 'entry'
  ) {
    return <LoadingSpinner message={dateLookup.t('common.loading')} />
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0 space-y-6 bg-[var(--color-surface)] font-[var(--font-body)] animate-fadeIn pb-24">
      {/* Page Header */}
      <PageHeader
        title={dateLookup.t('nav.priceListLookup')}
        subtitle="Cek tarif master price list yang berlaku berdasarkan parameter tanggal atau data pengiriman"
        breadcrumbs={[
          { label: dateLookup.t('module.finance'), path: ROUTES.PRICE_LIST },
          { label: dateLookup.t('nav.priceList'), path: ROUTES.PRICE_LIST },
          { label: dateLookup.t('nav.priceListLookup') },
        ]}
      />

      {/* Tab Selector — single seamless surface with a sliding active indicator */}
      <div
        role="tablist"
        className="relative inline-flex items-center gap-0.5 p-1 bg-[var(--color-neutral)] rounded-xl border border-[var(--color-border)] w-fit"
      >
        <div
          aria-hidden
          className="absolute top-1 bottom-1 rounded-lg bg-[var(--color-surface)] shadow-xs transition-[left,width] duration-300 ease-out"
          style={{ left: indicator.left, width: indicator.width }}
        />
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key
          return (
            <button
              key={key}
              ref={(node) => {
                tabRefs.current[key] = node
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(key)}
              className={`relative z-10 flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors duration-200 cursor-pointer ${
                isActive
                  ? 'text-[var(--color-primary)]'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-[var(--color-primary)]' : ''} />
              {label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div key={activeTab} className="animate-fadeIn">
        {activeTab === 'date' && <DateLookupTab {...dateLookup} />}
        {activeTab === 'entry' && <EntryLookupTab {...entryLookup} />}
      </div>
    </div>
  )
}
