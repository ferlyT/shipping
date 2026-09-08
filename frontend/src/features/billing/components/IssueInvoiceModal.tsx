import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import { billingApi } from '../services/billing.service'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Send, AlertCircle, ShieldCheck, Check, X, Loader2, AlertTriangle } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

export interface UnderchargedItemInfo {
  itemName: string
  billedPrice: number
  targetPrice: number
  difference: number
  priceSource?: string
  priceListDisplay?: string
}

interface IssueInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  invNo: string
  custName?: string
  custCode?: string
  invDate?: string | Date
  totalAmount?: number
  onSuccess?: () => void
  underchargedItems?: UnderchargedItemInfo[]
}

interface EmployeeItem {
  fdEmpCode: string
  fdEmpName: string
}

export function IssueInvoiceModal({
  isOpen,
  onClose,
  invNo,
  custName,
  custCode,
  invDate,
  totalAmount,
  onSuccess,
  underchargedItems,
}: IssueInvoiceModalProps) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const [employees, setEmployees] = useState<EmployeeItem[]>([])
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)
  const [selectedEmpId, setSelectedEmpId] = useState<string>('')
  const [isOverrideEmp, setIsOverrideEmp] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasConfirmedUndercharge, setHasConfirmedUndercharge] = useState(false)

  // Default ke fdEmpCode dari user yang sedang login & reset warning state
  useEffect(() => {
    if (isOpen) {
      setHasConfirmedUndercharge(false)
      if (user?.fdEmpCode) {
        setSelectedEmpId(user.fdEmpCode.trim())
        setIsOverrideEmp(false)
      } else {
        setSelectedEmpId('')
        setIsOverrideEmp(true)
      }
    }
  }, [isOpen, user?.fdEmpCode])

  // Fetch daftar karyawan saat modal dibuka atau saat override aktif
  useEffect(() => {
    if (isOpen && (isOverrideEmp || !user?.fdEmpCode) && employees.length === 0) {
      setIsLoadingEmployees(true)
      billingApi
        .getEmployees()
        .then((res) => {
          setEmployees(res.data.data || [])
        })
        .catch(() => {
          toast.error('Gagal memuat daftar master karyawan')
        })
        .finally(() => {
          setIsLoadingEmployees(false)
        })
    }
  }, [isOpen, isOverrideEmp, user?.fdEmpCode, employees.length])

  // Close modal on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen) return null

  const handleIssue = async () => {
    const finalEmpId = isOverrideEmp || !user?.fdEmpCode ? selectedEmpId : user?.fdEmpCode

    if (!finalEmpId) {
      toast.error('Silakan pilih karyawan penyerah invoice')
      return
    }

    if (underchargedItems && underchargedItems.length > 0 && !hasConfirmedUndercharge) {
      toast.warning('Peringatan: Harap centang persetujuan peringatan undercharge terlebih dahulu sebelum menerbitkan!')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await billingApi.issueInvoice(invNo, { fdEmpId: finalEmpId })
      const data = res.data.data
      toast.success(data?.message || `Invoice ${invNo} berhasil diterbitkan (Issued)!`)

      // Invalidate react-query caches
      queryClient.invalidateQueries({ queryKey: ['billingDetail'] })
      queryClient.invalidateQueries({ queryKey: ['billingList'] })
      queryClient.invalidateQueries({ queryKey: ['billingValidationList'] })
      queryClient.invalidateQueries({ queryKey: ['billingM3Check'] })

      onSuccess?.()
      onClose()
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Gagal menerbitkan invoice'
      toast.error(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const userHasMapping = Boolean(user?.fdEmpCode)

  if (!isOpen) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn font-[var(--font-body)]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden animate-slideUp flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/60">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold font-[var(--font-label)] uppercase tracking-wider text-[var(--color-primary)]">
              Terbitkan Invoice (Issue)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 font-sans text-xs">
          {/* Ringkasan Invoice */}
          <div className="p-3.5 rounded-xl bg-[var(--color-neutral)]/60 border border-[var(--color-border)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[var(--color-secondary)] uppercase font-semibold">
                Nomor Invoice
              </span>
              <span className="font-mono font-bold text-sm text-[var(--color-primary)]">
                {invNo}
              </span>
            </div>

            {custName && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--color-secondary)]">Pelanggan</span>
                <span className="font-medium text-[var(--color-primary)] text-right truncate max-w-[200px]">
                  {custName} {custCode ? `(${custCode})` : ''}
                </span>
              </div>
            )}

            {invDate && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--color-secondary)]">Tanggal Invoice</span>
                <span className="text-[var(--color-primary)] font-mono">{formatDate(invDate)}</span>
              </div>
            )}

            {typeof totalAmount === 'number' && totalAmount > 0 && (
              <div className="flex items-center justify-between pt-1.5 border-t border-[var(--color-border)]/60">
                <span className="text-[11px] font-semibold text-[var(--color-secondary)]">
                  Total Tagihan
                </span>
                <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            )}
          </div>

          {/* Informasi Karyawan Penyerah (tbBillingGiveEmp) */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[var(--color-primary)] flex items-center justify-between">
              <span>Karyawan Penyerah Invoice (fdEmpId)</span>
              {userHasMapping && (
                <button
                  type="button"
                  onClick={() => setIsOverrideEmp(!isOverrideEmp)}
                  className="text-[11px] text-[var(--color-tertiary)] hover:underline font-normal cursor-pointer"
                >
                  {isOverrideEmp ? 'Gunakan Akun Saya' : 'Ganti Karyawan...'}
                </button>
              )}
            </div>

            {!isOverrideEmp && userHasMapping ? (
              <div className="p-3 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                  <Check size={16} strokeWidth={3} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>{user?.fdEmpCode} - {user?.fdEmpName || user?.fullName}</span>
                    <Badge variant="success" className="text-[9px] px-1.5 py-0">Akun Anda</Badge>
                  </div>
                  <p className="text-[10px] opacity-80 truncate">
                    Invoice akan dicatat diterbitkan oleh identitas karyawan Anda.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {!userHasMapping && (
                  <div className="p-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 text-[11px] flex items-start gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-600" />
                    <span>
                      Akun login Anda belum terhubung ke master karyawan. Silakan pilih karyawan penyerah di bawah:
                    </span>
                  </div>
                )}

                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  disabled={isLoadingEmployees || isSubmitting}
                  className="w-full text-xs font-semibold py-2 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-tertiary)] cursor-pointer"
                >
                  <option value="">— Pilih Karyawan Penyerah —</option>
                  {employees.map((emp) => (
                    <option key={emp.fdEmpCode} value={emp.fdEmpCode}>
                      {emp.fdEmpCode} - {emp.fdEmpName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Warning Banner Undercharge jika ada */}
          {underchargedItems && underchargedItems.length > 0 && (
            <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300">
                <AlertTriangle size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
                <span>Peringatan: {underchargedItems.length} Item di Bawah Tarif Acuan (Undercharge)</span>
              </div>
              <p className="text-[11px] text-[var(--color-secondary)] leading-relaxed">
                Item invoice berikut ditagih dengan tarif lebih rendah dari acuan resmi (Multi-Tier Waterfall Engine):
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                {underchargedItems.map((u, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-[var(--color-surface)] border border-rose-500/20 text-[11px] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-[var(--color-primary)] truncate block">{u.itemName}</span>
                      <span className="text-[10px] text-[var(--color-secondary)]">
                        Ditagih: <strong className="font-mono text-[var(--color-primary)]">{formatCurrency(u.billedPrice)}</strong> vs Acuan: <strong className="font-mono text-blue-600 dark:text-blue-400">{u.priceListDisplay || formatCurrency(u.targetPrice)}</strong>
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 shrink-0">
                      Selisih -{formatCurrency(Math.abs(u.difference))}
                    </span>
                  </div>
                ))}
              </div>

              <label className="flex items-start gap-2 pt-2 border-t border-rose-500/20 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasConfirmedUndercharge}
                  onChange={(e) => setHasConfirmedUndercharge(e.target.checked)}
                  className="mt-0.5 rounded border-rose-400 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-200 leading-snug">
                  Saya memahami adanya selisih tarif di bawah acuan (undercharge) dan mengonfirmasi untuk tetap menerbitkan invoice ini.
                </span>
              </label>
            </div>
          )}

          {/* Info Box SOP */}
          <div className="p-2.5 rounded-lg bg-[var(--color-neutral)]/40 border border-[var(--color-border)] text-[10px] text-[var(--color-secondary)] leading-relaxed space-y-1">
            <div className="flex items-center gap-1 font-semibold text-[var(--color-primary)]">
              <ShieldCheck size={12} className="text-blue-600" />
              <span>Ketentuan Penerbitan:</span>
            </div>
            <p>
              Status invoice akan diubah menjadi <strong>ISSUED (Terbit)</strong> pada tbBilling & tbBillingPrev, serta riwayat penyerah disimpan ke tbBillingGiveEmp. Setelah terbit, invoice tidak dapat diterbitkan ulang.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleIssue}
              disabled={isSubmitting || (!selectedEmpId && (!userHasMapping || isOverrideEmp))}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Menerbitkan...</span>
                </>
              ) : (
                <>
                  <Send size={13} />
                  <span>Ya, Terbitkan Invoice</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
