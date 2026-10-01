import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useToastStore } from '@/stores/toastStore'
import { walletApi } from '../services/wallet.service'
import { TopupModal } from '../components/TopupModal'
import { WithdrawModal } from '../components/WithdrawModal'
import { AdjustModal } from '../components/AdjustModal'
import type {
  CustomerWalletListItem,
  WalletLedgerItem,
  WalletStats,
} from '../types/wallet.types'

export function ListPage() {
  const { t } = useTranslation()
  const addToast = useToastStore((s) => s.addToast)

  // Tabs: 'customers' | 'ledgers'
  const [activeTab, setActiveTab] = useState<'customers' | 'ledgers'>('customers')

  // Stats
  const [stats, setStats] = useState<WalletStats | null>(null)

  // Customer Wallets
  const [customers, setCustomers] = useState<CustomerWalletListItem[]>([])
  const [custTotal, setCustTotal] = useState(0)
  const [custPage, setCustPage] = useState(1)
  const [custLimit] = useState(20)
  const [custSearch, setCustSearch] = useState('')
  const [custHasBalance, setCustHasBalance] = useState(false)
  const [isLoadingCust, setIsLoadingCust] = useState(true)

  // Ledgers
  const [ledgers, setLedgers] = useState<WalletLedgerItem[]>([])
  const [ledgerTotal, setLedgerTotal] = useState(0)
  const [ledgerPage, setLedgerPage] = useState(1)
  const [ledgerLimit] = useState(20)
  const [ledgerSearch, setLedgerSearch] = useState('')
  const [ledgerTxType, setLedgerTxType] = useState('all')
  const [isLoadingLedger, setIsLoadingLedger] = useState(false)

  // Modals state
  const [isTopupOpen, setIsTopupOpen] = useState(false)
  const [selectedCustForTopup, setSelectedCustForTopup] = useState<{ code: string; name: string } | null>(null)

  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)
  const [selectedCustForWithdraw, setSelectedCustForWithdraw] = useState<{ code: string; name: string; balance: number } | null>(null)

  const [isAdjustOpen, setIsAdjustOpen] = useState(false)
  const [selectedCustForAdjust, setSelectedCustForAdjust] = useState<{ code: string; name: string; balance: number } | null>(null)

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const res: any = await walletApi.getStats()
      const d = res.data?.data ?? res.data
      setStats(d)
    } catch {
      // safe fallback
    }
  }, [])

  // Fetch Customers
  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoadingCust(true)
      const res: any = await walletApi.getCustomerWallets({
        page: custPage,
        limit: custLimit,
        search: custSearch || undefined,
        hasBalance: custHasBalance ? 'true' : undefined,
      })
      const d = res.data?.data ?? res.data
      setCustomers(d.items || [])
      setCustTotal(d.meta?.total || 0)
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Gagal memuat saldo pelanggan',
      })
    } finally {
      setIsLoadingCust(false)
    }
  }, [custPage, custLimit, custSearch, custHasBalance, addToast])

  // Fetch Ledgers
  const fetchLedgers = useCallback(async () => {
    try {
      setIsLoadingLedger(true)
      const res: any = await walletApi.getLedgers({
        page: ledgerPage,
        limit: ledgerLimit,
        search: ledgerSearch || undefined,
        txType: ledgerTxType !== 'all' ? ledgerTxType : undefined,
      })
      const d = res.data?.data ?? res.data
      setLedgers(d.items || [])
      setLedgerTotal(d.meta?.total || 0)
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Gagal memuat mutasi buku besar',
      })
    } finally {
      setIsLoadingLedger(false)
    }
  }, [ledgerPage, ledgerLimit, ledgerSearch, ledgerTxType, addToast])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    if (activeTab === 'customers') {
      fetchCustomers()
    } else {
      fetchLedgers()
    }
  }, [activeTab, fetchCustomers, fetchLedgers])

  const handleOpenTopup = (cust?: { code: string; name: string }) => {
    setSelectedCustForTopup(cust || null)
    setIsTopupOpen(true)
  }

  const handleOpenWithdraw = (cust: { code: string; name: string; balance: number }) => {
    setSelectedCustForWithdraw(cust)
    setIsWithdrawOpen(true)
  }

  const handleOpenAdjust = (cust: { code: string; name: string; balance: number }) => {
    setSelectedCustForAdjust(cust)
    setIsAdjustOpen(true)
  }

  const handleFilterLedgerByCustomer = (code: string) => {
    setActiveTab('ledgers')
    setLedgerSearch(code)
    setLedgerPage(1)
  }

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 w-full min-w-0 space-y-4 sm:space-y-6 font-[var(--font-body)] animate-fadeIn pb-24">
      {/* 3-Level Breadcrumb & Actions */}
      <PageHeader
        title={t('wallet.title')}
        subtitle={t('wallet.subtitle')}
        breadcrumbs={[
          { label: t('module.finance'), path: ROUTES.BILLING },
          { label: t('nav.wallet'), path: ROUTES.WALLET },
          { label: activeTab === 'customers' ? 'Saldo Pelanggan' : 'Buku Besar Mutasi' },
        ]}
        actions={
          <Button variant="primary" size="sm" onClick={() => handleOpenTopup()}>
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('wallet.btnTopup')}
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Saldo Deposit */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 sm:p-4 shadow-xs">
          <div className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
            Total Saldo Deposit Aktif
          </div>
          <div className="text-[18px] font-bold text-emerald-500 tabular-nums mt-1 truncate">
            {stats ? formatCurrency(stats.totalBalance) : 'Rp 0'}
          </div>
          <div className="text-[11px] text-[var(--color-secondary)] mt-1">
            Dana titipan pelanggan tersimpan
          </div>
        </div>

        {/* Jumlah Pelanggan Bersaldo */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 sm:p-4 shadow-xs">
          <div className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
            Pelanggan Bersaldo
          </div>
          <div className="text-[18px] font-bold text-[var(--color-primary)] tabular-nums mt-1">
            {stats ? stats.activeCustomerCount : 0}
          </div>
          <div className="text-[11px] text-[var(--color-secondary)] mt-1">
            Customer dengan saldo deposit &gt; 0
          </div>
        </div>

        {/* Topup Masuk Hari Ini */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 sm:p-4 shadow-xs">
          <div className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
            Masuk / Topup Hari Ini
          </div>
          <div className="text-[18px] font-bold text-sky-400 tabular-nums mt-1 truncate">
            {stats ? formatCurrency(stats.totalCreditToday) : 'Rp 0'}
          </div>
          <div className="text-[11px] text-[var(--color-secondary)] mt-1">
            Total kredit deposit hari ini
          </div>
        </div>

        {/* Terpakai / Keluar Hari Ini */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 sm:p-4 shadow-xs">
          <div className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
            Terpakai / Keluar Hari Ini
          </div>
          <div className="text-[18px] font-bold text-amber-500 tabular-nums mt-1 truncate">
            {stats ? formatCurrency(stats.totalDebitToday) : 'Rp 0'}
          </div>
          <div className="text-[11px] text-[var(--color-secondary)] mt-1">
            Pelunasan kasir & penarikan
          </div>
        </div>
      </div>

      {/* Main Card with Tabs */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs overflow-hidden">
        {/* Tabs Bar */}
        <div className="flex border-b border-[var(--color-border)] px-4 sm:px-6 pt-3 gap-2 bg-[var(--color-neutral)]">
          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`pb-3 px-3 text-xs font-semibold cursor-pointer border-b-2 transition-colors ${
              activeTab === 'customers'
                ? 'border-[var(--color-tertiary)] text-[var(--color-tertiary)]'
                : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            }`}
          >
            Saldo Pelanggan ({custTotal})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ledgers')}
            className={`pb-3 px-3 text-xs font-semibold cursor-pointer border-b-2 transition-colors ${
              activeTab === 'ledgers'
                ? 'border-[var(--color-tertiary)] text-[var(--color-tertiary)]'
                : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            }`}
          >
            Buku Besar Mutasi (Audit Trail)
          </button>
        </div>

        {/* TAB 1: SALDO PELANGGAN */}
        {activeTab === 'customers' && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Filter Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Cari kode atau nama customer..."
                  value={custSearch}
                  onChange={(e) => {
                    setCustSearch(e.target.value)
                    setCustPage(1)
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <label className="inline-flex items-center gap-1.5 text-xs text-[var(--color-secondary)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={custHasBalance}
                    onChange={(e) => {
                      setCustHasBalance(e.target.checked)
                      setCustPage(1)
                    }}
                    className="rounded border-[var(--color-border)] accent-[var(--color-tertiary)]"
                  />
                  Hanya yang memiliki saldo (&gt; 0)
                </label>

                <Button variant="secondary" size="sm" onClick={fetchCustomers}>
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </Button>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto border border-[var(--color-border)] rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-neutral)] text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                    <th className="py-2.5 px-3 text-left">Customer</th>
                    <th className="py-2.5 px-3 text-left">Kode</th>
                    <th className="py-2.5 px-3 text-right">Saldo Deposit</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Terakhir Diperbarui</th>
                    <th className="py-2.5 px-3 text-center">Aksi Transaksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] text-xs">
                  {isLoadingCust ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs text-[var(--color-secondary)]">
                        <div className="space-y-2">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-9 w-full rounded-lg skeleton-shimmer" />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ) : customers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs text-[var(--color-secondary)]">
                        Tidak ada data customer yang cocok.
                      </td>
                    </tr>
                  ) : (
                    customers.map((c) => (
                      <tr
                        key={c.fdCustCode}
                        className="hover:bg-[var(--color-neutral)]/40 transition-colors"
                      >
                        <td className="py-2 px-3 font-semibold text-[var(--color-primary)]">
                          {c.fdCustName}
                        </td>
                        <td className="py-2 px-3 font-mono text-[var(--color-secondary)]">
                          {c.fdCustCode}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-500 tabular-nums">
                          {formatCurrency(c.fdBalance)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-transparent border border-emerald-500/40 text-emerald-500">
                            {c.fdStatus}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center text-[11px] text-[var(--color-secondary)]">
                          {c.fdLastUpdated ? formatDateTime(c.fdLastUpdated) : '-'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenTopup({ code: c.fdCustCode, name: c.fdCustName })}
                              className="px-2 py-1 rounded text-[11px] font-semibold border border-sky-500/40 text-sky-400 hover:bg-sky-500/10 transition-colors cursor-pointer"
                              title="Topup Deposit"
                            >
                              + Topup
                            </button>
                            <button
                              type="button"
                              disabled={c.fdBalance <= 0}
                              onClick={() => handleOpenWithdraw({ code: c.fdCustCode, name: c.fdCustName, balance: c.fdBalance })}
                              className="px-2 py-1 rounded text-[11px] font-semibold border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Tarik Dana"
                            >
                              - Tarik
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenAdjust({ code: c.fdCustCode, name: c.fdCustName, balance: c.fdBalance })}
                              className="px-2 py-1 rounded text-[11px] font-semibold border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                              title="Koreksi / Penyesuaian Saldo"
                            >
                              Koreksi
                            </button>
                            <button
                              type="button"
                              onClick={() => handleFilterLedgerByCustomer(c.fdCustCode)}
                              className="px-2 py-1 rounded text-[11px] font-medium text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer"
                              title="Lihat Rincian Mutasi"
                            >
                              Mutasi
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Touch Card View */}
            <div className="block md:hidden border border-[var(--color-border)] rounded-lg divide-y divide-[var(--color-border)] overflow-hidden">
              {isLoadingCust ? (
                <div className="p-4 space-y-2.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-24 w-full rounded-lg skeleton-shimmer" />
                  ))}
                </div>
              ) : customers.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--color-secondary)]">
                  Tidak ada data customer yang cocok.
                </div>
              ) : (
                customers.map((c) => (
                  <div key={c.fdCustCode} className="p-3.5 bg-[var(--color-surface)] hover:bg-[var(--color-neutral)]/40 transition-colors space-y-2.5">
                    {/* Header: Name + Code + Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-xs text-[var(--color-primary)]">
                          {c.fdCustName}
                        </div>
                        <div className="font-mono text-[10px] text-[var(--color-secondary)]">
                          {c.fdCustCode}
                        </div>
                      </div>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border border-emerald-500/40 text-emerald-500">
                        {c.fdStatus}
                      </span>
                    </div>

                    {/* Balance & Updated Date */}
                    <div className="flex items-baseline justify-between pt-1 border-t border-[var(--color-border)]/50">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-[var(--color-secondary)] block">Saldo Deposit</span>
                        <span className="font-bold text-sm text-emerald-500 tabular-nums">
                          {formatCurrency(c.fdBalance)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-wider text-[var(--color-secondary)] block">Update</span>
                        <span className="text-[10px] text-[var(--color-secondary)]">
                          {c.fdLastUpdated ? formatDateTime(c.fdLastUpdated) : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Actions Grid */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-[var(--color-border)]/50">
                      <button
                        type="button"
                        onClick={() => handleOpenTopup({ code: c.fdCustCode, name: c.fdCustName })}
                        className="py-1 px-1 rounded text-center text-[10px] font-semibold border border-sky-500/40 text-sky-400 hover:bg-sky-500/10 transition-colors"
                      >
                        + Topup
                      </button>
                      <button
                        type="button"
                        disabled={c.fdBalance <= 0}
                        onClick={() => handleOpenWithdraw({ code: c.fdCustCode, name: c.fdCustName, balance: c.fdBalance })}
                        className="py-1 px-1 rounded text-center text-[10px] font-semibold border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
                      >
                        - Tarik
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenAdjust({ code: c.fdCustCode, name: c.fdCustName, balance: c.fdBalance })}
                        className="py-1 px-1 rounded text-center text-[10px] font-semibold border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-colors"
                      >
                        Koreksi
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFilterLedgerByCustomer(c.fdCustCode)}
                        className="py-1 px-1 rounded text-center text-[10px] font-medium border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors"
                      >
                        Mutasi
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {custTotal > custLimit && (
              <Pagination
                page={custPage}
                totalPages={Math.ceil(custTotal / custLimit) || 1}
                total={custTotal}
                limit={custLimit}
                onPageChange={(p) => setCustPage(p)}
              />
            )}
          </div>
        )}

        {/* TAB 2: BUKU BESAR MUTASI */}
        {activeTab === 'ledgers' && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Filter Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Cari customer, no ref, catatan..."
                  value={ledgerSearch}
                  onChange={(e) => {
                    setLedgerSearch(e.target.value)
                    setLedgerPage(1)
                  }}
                  className="w-full sm:w-64 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
                />

                <select
                  value={ledgerTxType}
                  onChange={(e) => {
                    setLedgerTxType(e.target.value)
                    setLedgerPage(1)
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
                >
                  <option value="all">Semua Tipe Mutasi</option>
                  <option value="TOPUP">TOPUP</option>
                  <option value="PAYMENT">PAYMENT (Kasir)</option>
                  <option value="OVERPAYMENT">OVERPAYMENT (Surplus Kasir)</option>
                  <option value="WITHDRAWAL">WITHDRAWAL</option>
                  <option value="REFUND">REFUND</option>
                  <option value="ADJUSTMENT">ADJUSTMENT</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={fetchLedgers}>
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </Button>
              </div>
            </div>

            {/* Desktop Ledger Table */}
            <div className="hidden md:block overflow-x-auto border border-[var(--color-border)] rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-neutral)] text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                    <th className="py-2.5 px-3 text-left">Waktu</th>
                    <th className="py-2.5 px-3 text-left">Customer</th>
                    <th className="py-2.5 px-3 text-center">Tipe Transaksi</th>
                    <th className="py-2.5 px-3 text-right">Nominal (+/-)</th>
                    <th className="py-2.5 px-3 text-right">Saldo Sesudah</th>
                    <th className="py-2.5 px-3 text-left">Ref No / Catatan</th>
                    <th className="py-2.5 px-3 text-center">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] text-xs">
                  {isLoadingLedger ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-xs text-[var(--color-secondary)]">
                        <div className="space-y-2">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-9 w-full rounded-lg skeleton-shimmer" />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ) : ledgers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-xs text-[var(--color-secondary)]">
                        Belum ada catatan transaksi buku besar.
                      </td>
                    </tr>
                  ) : (
                    ledgers.map((l) => {
                      const isCredit = l.fdDirection === 'CREDIT'
                      return (
                        <tr
                          key={l.fdLedgerID}
                          className="hover:bg-[var(--color-neutral)]/40 transition-colors"
                        >
                          <td className="py-2 px-3 text-[11px] text-[var(--color-secondary)] tabular-nums whitespace-nowrap">
                            {formatDateTime(l.fdCreatedDate)}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-[var(--color-primary)]">
                              {l.fdCustName || l.fdCustCode}
                            </div>
                            <div className="text-[11px] font-mono text-[var(--color-secondary)]">
                              {l.fdCustCode}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold bg-transparent border ${
                                l.fdTxType === 'TOPUP' || l.fdTxType === 'OVERPAYMENT'
                                  ? 'border-emerald-500/40 text-emerald-400'
                                  : l.fdTxType === 'PAYMENT'
                                  ? 'border-sky-500/40 text-sky-400'
                                  : l.fdTxType === 'WITHDRAWAL'
                                  ? 'border-rose-500/40 text-rose-400'
                                  : 'border-amber-500/40 text-amber-400'
                              }`}
                            >
                              {l.fdTxType}
                            </span>
                          </td>
                          <td
                            className={`py-2 px-3 text-right font-bold tabular-nums whitespace-nowrap ${
                              isCredit ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                          >
                            {isCredit ? '+' : '-'} {formatCurrency(l.fdAmount)}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-[var(--color-primary)] tabular-nums whitespace-nowrap">
                            {formatCurrency(l.fdBalanceAfter)}
                          </td>
                          <td className="py-2 px-3">
                            {l.fdRefNo && (
                              <div className="font-mono text-[11px] text-[var(--color-tertiary)] font-semibold">
                                {l.fdRefNo}
                              </div>
                            )}
                            <div className="text-[11px] text-[var(--color-secondary)] line-clamp-1">
                              {l.fdNotes || '-'}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-[11px] text-[var(--color-secondary)]">
                            {l.fdCreatedBy}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Touch Card View for Ledgers */}
            <div className="block md:hidden border border-[var(--color-border)] rounded-lg divide-y divide-[var(--color-border)] overflow-hidden">
              {isLoadingLedger ? (
                <div className="p-4 space-y-2.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-24 w-full rounded-lg skeleton-shimmer" />
                  ))}
                </div>
              ) : ledgers.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--color-secondary)]">
                  Belum ada catatan transaksi buku besar.
                </div>
              ) : (
                ledgers.map((l) => {
                  const isCredit = l.fdDirection === 'CREDIT'
                  return (
                    <div key={l.fdLedgerID} className="p-3.5 bg-[var(--color-surface)] hover:bg-[var(--color-neutral)]/40 transition-colors space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono text-[var(--color-secondary)]">
                          {formatDateTime(l.fdCreatedDate)}
                        </span>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                            l.fdTxType === 'TOPUP' || l.fdTxType === 'OVERPAYMENT'
                              ? 'border-emerald-500/40 text-emerald-400'
                              : l.fdTxType === 'PAYMENT'
                              ? 'border-sky-500/40 text-sky-400'
                              : l.fdTxType === 'WITHDRAWAL'
                              ? 'border-rose-500/40 text-rose-400'
                              : 'border-amber-500/40 text-amber-400'
                          }`}
                        >
                          {l.fdTxType}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-xs text-[var(--color-primary)]">
                            {l.fdCustName || l.fdCustCode}
                          </div>
                          <div className="text-[10px] font-mono text-[var(--color-secondary)]">
                            {l.fdCustCode}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold text-xs tabular-nums ${isCredit ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isCredit ? '+' : '-'} {formatCurrency(l.fdAmount)}
                          </div>
                          <div className="text-[10px] text-[var(--color-secondary)] tabular-nums">
                            Sisa: {formatCurrency(l.fdBalanceAfter)}
                          </div>
                        </div>
                      </div>

                      {(l.fdRefNo || l.fdNotes || l.fdCreatedBy) && (
                        <div className="text-[10px] pt-1.5 border-t border-[var(--color-border)]/50 text-[var(--color-secondary)] flex items-center justify-between gap-2">
                          <span className="truncate max-w-[200px]">
                            {l.fdRefNo ? `Ref: ${l.fdRefNo}` : ''} {l.fdNotes ? `(${l.fdNotes})` : ''}
                          </span>
                          <span className="shrink-0 font-medium">
                            {l.fdCreatedBy || '-'}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Pagination */}
            {ledgerTotal > ledgerLimit && (
              <Pagination
                page={ledgerPage}
                totalPages={Math.ceil(ledgerTotal / ledgerLimit) || 1}
                total={ledgerTotal}
                limit={ledgerLimit}
                onPageChange={(p) => setLedgerPage(p)}
              />
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <TopupModal
        isOpen={isTopupOpen}
        onClose={() => {
          setIsTopupOpen(false)
          setSelectedCustForTopup(null)
        }}
        initialCustCode={selectedCustForTopup?.code}
        initialCustName={selectedCustForTopup?.name}
        onSuccess={() => {
          fetchStats()
          if (activeTab === 'customers') fetchCustomers()
          else fetchLedgers()
        }}
      />

      {selectedCustForWithdraw && (
        <WithdrawModal
          isOpen={isWithdrawOpen}
          onClose={() => {
            setIsWithdrawOpen(false)
            setSelectedCustForWithdraw(null)
          }}
          custCode={selectedCustForWithdraw.code}
          custName={selectedCustForWithdraw.name}
          currentBalance={selectedCustForWithdraw.balance}
          onSuccess={() => {
            fetchStats()
            if (activeTab === 'customers') fetchCustomers()
            else fetchLedgers()
          }}
        />
      )}

      {selectedCustForAdjust && (
        <AdjustModal
          isOpen={isAdjustOpen}
          onClose={() => {
            setIsAdjustOpen(false)
            setSelectedCustForAdjust(null)
          }}
          custCode={selectedCustForAdjust.code}
          custName={selectedCustForAdjust.name}
          currentBalance={selectedCustForAdjust.balance}
          onSuccess={() => {
            fetchStats()
            if (activeTab === 'customers') fetchCustomers()
            else fetchLedgers()
          }}
        />
      )}
    </div>
  )
}
