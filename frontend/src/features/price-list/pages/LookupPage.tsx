import { useState } from 'react'
import { Calendar, Search } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ROUTES } from '@/lib/constants'
import { useDateLookup, useEntryLookup } from '../hooks'
import { DateLookupTab } from '../components/DateLookupTab'
import { EntryLookupTab } from '../components/EntryLookupTab'

export function LookupPage() {
  const [activeTab, setActiveTab] = useState<'date' | 'entry'>('entry')

  const dateLookup = useDateLookup(activeTab === 'date')
  const entryLookup = useEntryLookup(activeTab === 'entry')

  if (
    dateLookup.isLoadingDate &&
    !dateLookup.dateResult &&
    dateLookup.isLoadingFilters &&
    activeTab === 'entry'
  ) {
    return <LoadingSpinner message={dateLookup.t('common.loading')} />
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0 space-y-5 bg-[var(--color-surface)] font-[var(--font-body)] animate-fadeIn pb-24">
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

      {/* Tab Selector Header */}
      <div className="flex items-center gap-2 p-1 bg-[var(--color-neutral)] rounded-xl border border-[var(--color-border)] w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('entry')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'entry'
            ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-xs font-bold'
            : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            }`}
        >
          <Search size={14} className={activeTab === 'entry' ? 'text-[var(--color-primary)]' : ''} />
          Cari by Data Pengiriman
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('date')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'date'
            ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-xs font-bold'
            : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            }`}
        >
          <Calendar size={14} className={activeTab === 'date' ? 'text-[var(--color-primary)]' : ''} />
          Cari by Tanggal
        </button>


      </div>

      {/* TAB 1: MODE BY TANGGAL */}
      {activeTab === 'date' && <DateLookupTab {...dateLookup} />}

      {/* TAB 2: MODE BY NO. PENGIRIMAN */}
      {activeTab === 'entry' && <EntryLookupTab {...entryLookup} />}
    </div>
  )
}
