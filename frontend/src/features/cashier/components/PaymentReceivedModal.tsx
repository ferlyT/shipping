import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'
import { useToastStore } from '@/stores/toastStore'
import { cashierApi } from '../services/cashier.service'
import { walletApi } from '@/features/wallet/services/wallet.service'
import type { BankOption, CurrencyOption, PayTypeOption } from '../types/cashier.types'

interface PaymentReceivedModalProps {
  isOpen: boolean
  onClose: () => void
  cashierId: string
  custCode?: string
  customerName?: string
  remainingTarget?: number
  onSuccess: () => void
}

export function PaymentReceivedModal({
  isOpen,
  onClose,
  cashierId,
  custCode = '',
  customerName = '',
  remainingTarget = 0,
  onSuccess,
}: PaymentReceivedModalProps) {
  const { t } = useTranslation()
  const addToast = useToastStore((s) => s.addToast)

  const [type, setType] = useState('TRANSFER')
  const [ccyCode, setCcyCode] = useState('RP.')
  const [currValue, setCurrValue] = useState(1.0)
  const [amount, setAmount] = useState<number | ''>('')
  const [bankId1, setBankId1] = useState('BCB')
  const [giroNo, setGiroNo] = useState('')
  const [giroDate, setGiroDate] = useState('')
  const [validDate, setValidDate] = useState('')
  const [bankId2, setBankId2] = useState('')

  const [banks, setBanks] = useState<BankOption[]>([])
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([])
  const [payTypes, setPayTypes] = useState<PayTypeOption[]>([])
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [isLoadingWallet, setIsLoadingWallet] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch customer wallet balance
  useEffect(() => {
    if (isOpen && custCode) {
      setIsLoadingWallet(true)
      walletApi
        .getCustomerWallet(custCode)
        .then((res: any) => {
          const d = res.data?.data ?? res.data
          setWalletBalance(Number(d.fdBalance) || 0)
        })
        .catch(() => {
          setWalletBalance(0)
        })
        .finally(() => {
          setIsLoadingWallet(false)
        })
    }
  }, [isOpen, custCode])

  // Load master data bank, currencies, pay types
  useEffect(() => {
    if (isOpen) {
      cashierApi
        .getMasterData()
        .then((res: any) => {
          const d = res.data?.data ?? res.data ?? {}
          setBanks(d.banks || [])
          setCurrencies(d.currencies || [])
          setPayTypes(d.payTypes || [])
        })
        .catch(() => {})
    }
  }, [isOpen])

  // Logika kondisional instrumen pembayaran (sesuai frm_inputRcv FoxPro)
  useEffect(() => {
    if (type === 'CASH' || type === 'WALLET') {
      setBankId1('')
      setGiroNo('')
      setGiroDate('')
      setValidDate('')
      setBankId2('')
    } else if (type === 'TRANSFER') {
      if (!bankId1) setBankId1('BCB')
      setGiroNo('')
      setGiroDate('')
      setValidDate('')
    }
  }, [type])

  // Auto-sync kurs mata uang
  const handleCurrencyChange = (newCcy: string) => {
    setCcyCode(newCcy)
    const match = currencies.find((c) => c.fdCCYCode.trim() === newCcy.trim())
    if (match) {
      setCurrValue(Number(match.fdCCYValue) || 1.0)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) {
      addToast({ type: 'error', message: 'Nominal pembayaran harus lebih dari 0' })
      return
    }

    if (type === 'TRANSFER' && !bankId1) {
      addToast({ type: 'error', message: 'Bank tujuan transfer wajib dipilih' })
      return
    }

    if (type === 'GIRO' && (!giroNo || !giroDate || !validDate)) {
      addToast({ type: 'error', message: 'Nomor giro dan tanggal jatuh tempo/valid wajib diisi' })
      return
    }

    if (type === 'WALLET') {
      if (walletBalance === null || walletBalance <= 0) {
        addToast({
          type: 'error',
          message: 'Pelanggan ini belum memiliki saldo deposit aktif untuk didebit',
        })
        return
      }
      if (Number(amount) * Number(currValue) > walletBalance) {
        addToast({
          type: 'error',
          message: `Nominal melebihi saldo deposit yang tersedia (${formatCurrency(walletBalance)})`,
        })
        return
      }
    }

    try {
      setIsSubmitting(true)
      await cashierApi.addRcv(cashierId, {
        type,
        ccyCode,
        currValue: Number(currValue),
        amount: Number(amount),
        bankId1,
        giroNo,
        giroDate: giroDate || null,
        validDate: validDate || null,
        bankId2,
      })

      addToast({ type: 'success', message: 'Penerimaan uang berhasil ditambahkan' })
      onSuccess()
      onClose()
      // Reset form
      setAmount('')
      setGiroNo('')
      setGiroDate('')
      setValidDate('')
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Gagal menambahkan uang masuk',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const isCash = type === 'CASH'
  const isGiro = type === 'GIRO'
  const isWallet = type === 'WALLET'

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden animate-scaleIn">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-neutral)]">
          <div>
            <h3 className="text-[15px] font-bold font-[var(--font-label)] uppercase tracking-wide text-[var(--color-primary)]">
              {t('cashier.btnAddRcv')}
            </h3>
            <p className="text-[12px] text-[var(--color-secondary)] font-mono">
              Cashier: {cashierId} {customerName ? `• ${customerName}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Tipe Pembayaran & Mata Uang */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1">
                Tipe Pembayaran <span className="text-red-500">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] font-medium"
              >
                <option value="TRANSFER">TRANSFER</option>
                <option value="CASH">CASH</option>
                <option value="GIRO">GIRO</option>
                <option value="WALLET">WALLET (SALDO DEPOSIT)</option>
                <option value="CASH BACK">CASH BACK</option>
                {payTypes
                  .filter((pt) => !['TRANSFER', 'CASH', 'GIRO', 'WALLET', 'CASH BACK'].includes(pt.fdPayName.trim()))
                  .map((pt) => (
                    <option key={pt.fdID} value={pt.fdPayName.trim()}>
                      {pt.fdPayName.trim()}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1">
                Mata Uang & Kurs
              </label>
              <div className="flex gap-2">
                <select
                  value={ccyCode}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="w-24 px-2 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] font-bold"
                >
                  {currencies.map((c) => (
                    <option key={c.fdCCYCode} value={c.fdCCYCode.trim()}>
                      {c.fdCCYCode.trim()}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={currValue}
                  onChange={(e) => setCurrValue(parseFloat(e.target.value) || 1)}
                  placeholder="Kurs"
                  className="w-full px-2 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
                />
              </div>
            </div>
          </div>

          {/* Banner Saldo Deposit Khusus Tipe WALLET */}
          {isWallet && (
            <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 space-y-1.5 animate-fadeIn">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Saldo Deposit Pelanggan Tersedia
                </span>
                <span className="font-bold tabular-nums text-sm text-emerald-400">
                  {isLoadingWallet ? 'Memuat...' : formatCurrency(walletBalance || 0)}
                </span>
              </div>
              {walletBalance !== null && walletBalance > 0 && (
                <div className="flex items-center gap-2 pt-1 border-t border-emerald-500/20 text-[11px]">
                  <span className="text-[var(--color-secondary)]">Isi Cepat:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const maxAmt =
                        remainingTarget > 0 ? Math.min(walletBalance, remainingTarget) : walletBalance
                      setAmount(maxAmt)
                    }}
                    className="text-emerald-400 hover:underline font-semibold cursor-pointer"
                  >
                    {remainingTarget > 0 && remainingTarget < walletBalance
                      ? `Sesuai Target Faktur (${formatCurrency(remainingTarget)})`
                      : `Gunakan Semua Saldo (${formatCurrency(walletBalance)})`}
                  </button>
                </div>
              )}
              {walletBalance === 0 && !isLoadingWallet && (
                <div className="text-[11px] text-amber-400">
                  Customer belum memiliki saldo deposit. Silakan lakukan Top-up deposit terlebih dahulu di menu Wallet.
                </div>
              )}
            </div>
          )}

          {/* Nominal Pembayaran */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1">
              Nominal Diterima ({ccyCode}) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              required
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-base font-bold text-emerald-500 tabular-nums focus:outline-none focus:border-[var(--color-tertiary)]"
            />
          </div>

          {/* Bank Penampung (Tujuan) & Bank Penerbit (Asal) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1">
                Bank Penampung (Tujuan)
              </label>
              <select
                disabled={isCash || isWallet}
                value={bankId1}
                onChange={(e) => setBankId1(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] disabled:opacity-40"
              >
                <option value="">-- Pilih Bank --</option>
                {banks.map((b) => (
                  <option key={b.fdBankCode} value={b.fdBankCode.trim()}>
                    {b.fdBankCode.trim()} - {b.fdBankName.trim()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1">
                Bank Penerbit (Asal)
              </label>
              <select
                disabled={!isGiro}
                value={bankId2}
                onChange={(e) => setBankId2(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] disabled:opacity-40"
              >
                <option value="">-- Pilih Bank Asal --</option>
                {banks.map((b) => (
                  <option key={b.fdBankCode} value={b.fdBankCode.trim()}>
                    {b.fdBankCode.trim()} - {b.fdBankName.trim()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Informasi Warkat Giro / Cek (Hanya jika tipe GIRO) */}
          {isGiro && (
            <div className="p-3 rounded-xl border border-sky-500/30 bg-sky-500/5 space-y-3">
              <div className="text-[11px] font-bold text-sky-500 uppercase tracking-wide">
                Informasi Warkat Bilyet Giro / Cek
              </div>
              <div>
                <label className="block text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1">
                  Nomor Giro / Warkat
                </label>
                <input
                  type="text"
                  placeholder="Contoh: BG12345678"
                  value={giroNo}
                  onChange={(e) => setGiroNo(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1">
                    Tgl. Jatuh Tempo
                  </label>
                  <input
                    type="date"
                    value={giroDate}
                    onChange={(e) => setGiroDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1">
                    Tgl. Efektif / Valid
                  </label>
                  <input
                    type="date"
                    value={validDate}
                    onChange={(e) => setValidDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[var(--color-border)] flex justify-end gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isSubmitting || !amount}>
              {isSubmitting ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
