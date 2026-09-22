import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useToastStore } from '@/stores/toastStore'
import { cashierApi } from '../services/cashier.service'
import { walletApi } from '@/features/wallet/services/wallet.service'
import { BalanceIndicatorBar } from '../components/BalanceIndicatorBar'
import { CashierDetailSkeleton } from '../components/CashierSkeleton'
import { PaymentReceivedModal } from '../components/PaymentReceivedModal'
import { InvoiceAllocationModal } from '../components/InvoiceAllocationModal'
import { AttachTempReceiptModal } from '../components/AttachTempReceiptModal'
import type { CashierDetailResponse, CashierItem } from '../types/cashier.types'

export function DetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)

  const [data, setData] = useState<CashierDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [custWalletBalance, setCustWalletBalance] = useState<number | null>(null)
  const [isAllocatingDeposit, setIsAllocatingDeposit] = useState(false)

  // Modals
  const [isAddRcvOpen, setIsAddRcvOpen] = useState(false)
  const [isAllocateOpen, setIsAllocateOpen] = useState(false)
  const [isAttachOpen, setIsAttachOpen] = useState(false)

  // Confirm delete
  const [isDeleteTxOpen, setIsDeleteTxOpen] = useState(false)
  const [deleteRcvId, setDeleteRcvId] = useState<string | null>(null)
  const [deleteDetailId, setDeleteDetailId] = useState<string | null>(null)

  const fetchDetail = useCallback(async () => {
    if (!id) return
    try {
      const res: any = await cashierApi.getDetail(id)
      const d = res.data?.data ?? res.data
      setData(d)

      if (d?.header?.fdCustCode) {
        walletApi
          .getCustomerWallet(d.header.fdCustCode)
          .then((wRes: any) => {
            const wd = wRes.data?.data ?? wRes.data
            setCustWalletBalance(Number(wd.fdBalance) || 0)
          })
          .catch(() => setCustWalletBalance(0))
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Gagal memuat detail kasir',
      })
      navigate(ROUTES.CASHIER_LIST)
    } finally {
      setIsLoading(false)
    }
  }, [id, navigate, addToast])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  // Alihkan Surplus Uang Masuk ke Saldo Deposit Pelanggan (Zero-Difference Rp 0)
  const handleAllocateOverpaymentToDeposit = async () => {
    if (!id || !data || data.balance <= 0) return
    try {
      setIsAllocatingDeposit(true)
      await cashierApi.allocateOverpaymentToDeposit(id, data.balance)
      addToast({
        type: 'success',
        message: `Kelebihan bayar sebesar ${formatCurrency(data.balance)} berhasil dialihkan ke Saldo Deposit Pelanggan`,
      })
      fetchDetail()
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Gagal mengalihkan surplus ke deposit',
      })
    } finally {
      setIsAllocatingDeposit(false)
    }
  }

  // Delete transaction
  const handleDeleteTransaction = async () => {
    try {
      await cashierApi.deleteCashier(id)
      addToast({ type: 'success', message: `Transaksi kasir ${id} berhasil dihapus` })
      navigate(ROUTES.CASHIER_LIST)
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Gagal menghapus transaksi kasir',
      })
    } finally {
      setIsDeleteTxOpen(false)
    }
  }

  // Delete RCV line
  const handleDeleteRcv = async () => {
    if (!deleteRcvId) return
    try {
      await cashierApi.deleteRcv(id, deleteRcvId)
      addToast({ type: 'success', message: 'Baris penerimaan uang berhasil dihapus' })
      fetchDetail()
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Gagal menghapus uang masuk',
      })
    } finally {
      setDeleteRcvId(null)
    }
  }

  // Delete Detail line
  const handleDeleteDetail = async () => {
    if (!deleteDetailId) return
    try {
      await cashierApi.deleteDetail(id, deleteDetailId)
      addToast({ type: 'success', message: 'Baris alokasi invoice berhasil dihapus' })
      fetchDetail()
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Gagal menghapus alokasi invoice',
      })
    } finally {
      setDeleteDetailId(null)
    }
  }

  // Cetak bukti kasir
  const handlePrint = () => {
    window.print()
  }

  if (isLoading || !data) {
    return <CashierDetailSkeleton />
  }

  const { header, totalRcv, totalDetail, balance, isBalanced, isLocked, type } = data
  const rcvList = Array.isArray(data.rcvList) ? data.rcvList : []
  const detailList = Array.isArray(data.detailList) ? data.detailList : []

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 w-full min-w-0 space-y-4 sm:space-y-6 font-[var(--font-body)] animate-fadeIn pb-24">
      {/* 3-Level Breadcrumbs & Actions */}
      <PageHeader
        title={`${type === 'OFFICIAL' ? 'Kasir Resmi' : 'Kasir Sementara'} [${header.fdCashierID}]`}
        subtitle={`Transaksi pelunasan piutang customer ${header.fdCustName}`}
        breadcrumbs={[
          { label: t('module.finance'), path: ROUTES.BILLING },
          { label: t('nav.cashier'), path: ROUTES.CASHIER_LIST },
          { label: header.fdCashierID },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handlePrint}>
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              {t('cashier.btnPrint')}
            </Button>

            {type === 'TEMPORARY' && !isLocked && (
              <Button variant="primary" size="sm" onClick={() => setIsAttachOpen(true)}>
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                {t('cashier.btnAttach')}
              </Button>
            )}

            {!isLocked && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsDeleteTxOpen(true)}
                className="text-red-500 hover:bg-red-500/10 border-red-500/30"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {t('cashier.btnDelete')}
              </Button>
            )}
          </div>
        }
      />

      {/* Header Summary Card */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
          <div>
            <div className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
              {t('cashier.colCustomer')}
            </div>
            <div className="text-sm font-bold text-[var(--color-primary)] mt-0.5 truncate">
              {header.fdCustName}
            </div>
            <div className="text-[11px] font-mono text-[var(--color-secondary)]">
              Kode: {header.fdCustCode}
            </div>
          </div>

          <div>
            <div className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
              Saldo Deposit Customer
            </div>
            <div className="text-sm font-bold text-emerald-500 tabular-nums mt-0.5">
              {custWalletBalance !== null ? formatCurrency(custWalletBalance) : '...'}
            </div>
            <div className="text-[11px] text-[var(--color-secondary)]">
              Tersedia di Wallet
            </div>
          </div>

          <div>
            <div className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
              {t('cashier.colDate')}
            </div>
            <div className="text-sm font-bold text-[var(--color-primary)] mt-0.5">
              {header.fdCashierDate ? formatDate(header.fdCashierDate) : '-'}
            </div>
            <div className="text-[11px] text-[var(--color-secondary)]">
              Operator: {header.fdEmpCode}
            </div>
          </div>

          <div>
            <div className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
              {t('cashier.colStatus')}
            </div>
            <div className="mt-1">
              {isLocked ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-transparent border border-slate-500/40 text-slate-400">
                  {type === 'OFFICIAL' ? t('cashier.statusPosted') : t('cashier.statusAttached')}
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-transparent border border-sky-500/40 text-sky-500">
                  {type === 'OFFICIAL' ? t('cashier.statusOpen') : t('cashier.statusUnattached')}
                </span>
              )}
            </div>
          </div>

          <div>
            <div className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
              {type === 'OFFICIAL' ? t('cashier.colRefTemp') : 'Keterangan'}
            </div>
            <div className="text-xs font-mono font-medium text-[var(--color-primary)] mt-0.5 truncate">
              {type === 'OFFICIAL' ? header.fdCashierXX || '-' : header.fdDescr || '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Balance Indicator Bar (Zero-Difference) */}
      <BalanceIndicatorBar
        totalRcv={totalRcv}
        totalDetail={totalDetail}
        balance={balance}
        isBalanced={isBalanced}
      />

      {/* 1-Click Action: Alihkan Kelebihan Bayar (Surplus) ke Saldo Deposit Pelanggan */}
      {balance > 0 && !isLocked && (
        <div className="rounded-[var(--radius-lg)] border border-emerald-500/40 bg-emerald-500/10 p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-400">
                Kelebihan Uang Masuk Sebesar {formatCurrency(balance)}
              </div>
              <div className="text-[11px] text-[var(--color-secondary)]">
                Alihkan surplus ini ke saldo deposit pelanggan agar register kasir mencapai Zero-Difference (Rp 0).
              </div>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleAllocateOverpaymentToDeposit}
            isLoading={isAllocatingDeposit}
            className="bg-emerald-600 hover:bg-emerald-500 text-white border-transparent whitespace-nowrap self-end sm:self-auto"
          >
            Alihkan Surplus ke Deposit
          </Button>
        </div>
      )}

      {/* Dual Tables: Grid 1 (Penerimaan Uang) & Grid 2 (Alokasi Faktur) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* GRID 1: DAFTAR PENERIMAAN UANG */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-neutral)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">
                {t('cashier.rcvGridTitle')}
              </h4>
            </div>
            {!isLocked && (
              <Button variant="primary" size="sm" onClick={() => setIsAddRcvOpen(true)}>
                <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('cashier.btnAddRcv')}
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-x-auto">
            {rcvList.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--color-secondary)]">
                Belum ada rincian penerimaan uang (Kas/Bank/Giro).
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                    <th className="py-2 px-3 text-left">Tipe</th>
                    <th className="py-2 px-2 text-center">Mata Uang</th>
                    <th className="py-2 px-3 text-right">Nominal</th>
                    <th className="py-2 px-3 text-left">Bank / Info Warkat</th>
                    {!isLocked && <th className="py-2 px-2 text-center w-10">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] text-xs tabular-nums">
                  {rcvList.map((rcv) => (
                    <tr key={rcv.fdID} className="hover:bg-[var(--color-neutral)]/40 transition-colors">
                      <td className="py-2 px-3 font-semibold text-[var(--color-primary)]">
                        {rcv.fdType}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-[11px] text-[var(--color-secondary)]">
                        {rcv.fdCCYCode}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-500">
                        {formatCurrency(rcv.fdAmount * rcv.fdCurValue)}
                      </td>
                      <td className="py-2 px-3 text-[11px]">
                        {rcv.fdType === 'TRANSFER' && (
                          <div className="text-[var(--color-primary)] font-medium">
                            Bank Tujuan: {rcv.fdBankID1} -  {rcv.fdDate1 ? formatDate(rcv.fdDate1) : '-'}
                          </div>
                        )}
                        {rcv.fdType === 'GIRO' && (
                          <div>
                            <div className="font-mono font-medium text-sky-500">No: {rcv.fdGiroNo}</div>
                            <div className="text-[var(--color-secondary)]">
                              Jt. Tempo: {rcv.fdDate1 ? formatDate(rcv.fdDate1) : '-'} | Efektif:{' '}
                              {rcv.fdDate2 ? formatDate(rcv.fdDate2) : '-'}
                            </div>
                            {rcv.bank2Name && (
                              <div className="text-[var(--color-secondary)]">
                                Penerbit: {rcv.bank2Name}
                              </div>
                            )}
                          </div>
                        )}
                        {rcv.fdType === 'CASH' && (
                          <span className="text-[var(--color-secondary)] italic">Tunai di Kasir</span>
                        )}
                      </td>
                      {!isLocked && (
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => setDeleteRcvId(rcv.fdID)}
                            className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                            title="Hapus baris"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--color-border)] bg-[var(--color-neutral)]/40 font-bold text-xs">
                    <td colSpan={2} className="py-2 px-3 text-[var(--color-primary)]">
                      Total Penerimaan Uang
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-500 tabular-nums">
                      {formatCurrency(totalRcv)}
                    </td>
                    <td colSpan={!isLocked ? 2 : 1} />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>

        {/* GRID 2: ALOKASI FAKTUR INVOICE */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-neutral)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">
                {t('cashier.detailGridTitle')}
              </h4>
            </div>
            {!isLocked && (
              <Button variant="primary" size="sm" onClick={() => setIsAllocateOpen(true)}>
                <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('cashier.btnAllocate')}
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-x-auto">
            {detailList.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--color-secondary)]">
                Belum ada alokasi pelunasan faktur invoice.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                    <th className="py-2 px-3 text-left">No. Invoice</th>
                    <th className="py-2 px-2 text-center">Tgl. Kasir</th>
                    <th className="py-2 px-3 text-right">Nominal Dilunasi</th>
                    {!isLocked && <th className="py-2 px-2 text-center w-10">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] text-xs tabular-nums">
                  {detailList.map((dtl) => (
                    <tr key={dtl.fdID} className="hover:bg-[var(--color-neutral)]/40 transition-colors">
                      <td className="py-2 px-3 font-semibold text-[var(--color-primary)] font-mono">
                        {dtl.fdInvNo}
                      </td>
                      <td className="py-2 px-2 text-center text-[var(--color-secondary)]">
                        {dtl.fdDate ? formatDate(dtl.fdDate) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-blue-500">
                        {formatCurrency(dtl.fdTotal)}
                      </td>
                      {!isLocked && (
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => setDeleteDetailId(dtl.fdID)}
                            className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                            title="Hapus alokasi"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--color-border)] bg-[var(--color-neutral)]/40 font-bold text-xs">
                    <td colSpan={2} className="py-2 px-3 text-[var(--color-primary)]">
                      Total Faktur Dilunasi
                    </td>
                    <td className="py-2 px-3 text-right text-blue-500 tabular-nums">
                      {formatCurrency(totalDetail)}
                    </td>
                    {!isLocked && <td />}
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal Add RCV */}
      <PaymentReceivedModal
        isOpen={isAddRcvOpen}
        onClose={() => setIsAddRcvOpen(false)}
        cashierId={header.fdCashierID}
        custCode={header.fdCustCode}
        customerName={header.fdCustName}
        remainingTarget={Math.max(0, totalDetail - totalRcv)}
        onSuccess={fetchDetail}
      />

      {/* Modal Allocate Invoice */}
      <InvoiceAllocationModal
        isOpen={isAllocateOpen}
        onClose={() => setIsAllocateOpen(false)}
        cashierId={header.fdCashierID}
        custCode={header.fdCustCode}
        custName={header.fdCustName}
        onSuccess={fetchDetail}
      />

      {/* Modal Attach (jika membuka temp receipt) */}
      <AttachTempReceiptModal
        isOpen={isAttachOpen}
        tempReceipt={
          type === 'TEMPORARY'
            ? ({
              fdCashierID: header.fdCashierID,
              fdCashierDate: header.fdCashierDate,
              fdCustCode: header.fdCustCode,
              fdCustName: header.fdCustName,
              fdEmpCode: header.fdEmpCode,
              fdPost: header.fdPost,
              fdCashierXX: '',
              fdDescr: header.fdDescr,
              totalRcv,
              totalDetail,
              balance,
              isBalanced,
              rcvCount: rcvList.length,
              detailCount: detailList.length,
            } as CashierItem)
            : null
        }
        onClose={() => setIsAttachOpen(false)}
        onSuccess={(newId) => {
          navigate(ROUTES.CASHIER_DETAIL(newId))
        }}
      />

      {/* Confirm Delete Transaksi */}
      <ConfirmModal
        isOpen={isDeleteTxOpen}
        onCancel={() => setIsDeleteTxOpen(false)}
        onConfirm={handleDeleteTransaction}
        title="Hapus Transaksi Kasir"
        message={`Apakah Anda yakin ingin menghapus transaksi kasir ${id}? Seluruh rincian uang masuk dan alokasi faktur akan ikut terhapus.`}
      />

      {/* Confirm Delete Rcv Line */}
      <ConfirmModal
        isOpen={!!deleteRcvId}
        onCancel={() => setDeleteRcvId(null)}
        onConfirm={handleDeleteRcv}
        title="Hapus Baris Penerimaan Uang"
        message="Apakah Anda yakin ingin menghapus baris penerimaan uang ini? Saldo kasir akan dihitung ulang."
      />

      {/* Confirm Delete Detail Line */}
      <ConfirmModal
        isOpen={!!deleteDetailId}
        onCancel={() => setDeleteDetailId(null)}
        onConfirm={handleDeleteDetail}
        title="Hapus Alokasi Faktur"
        message="Apakah Anda yakin ingin menghapus alokasi faktur tagihan ini? Saldo piutang faktur akan dikembalikan."
      />
    </div>
  )
}
