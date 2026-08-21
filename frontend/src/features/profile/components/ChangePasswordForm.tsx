import { useState } from 'react'
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { toast } from '@/stores/toastStore'
import type { ChangePasswordInput } from '../types/profile.types'

interface ChangePasswordFormProps {
  onChangePassword: (data: ChangePasswordInput) => Promise<any>
  isChanging: boolean
}

export function ChangePasswordForm({ onChangePassword, isChanging }: ChangePasswordFormProps) {
  const { t } = useTranslation()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < 6) {
      toast.error(t('profile.passwordMinLength'))
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('profile.passwordMismatch'))
      return
    }

    try {
      await onChangePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      })
      // Reset form upon success
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      // Handled by hook error handler
    }
  }

  const isMatching = confirmPassword.length > 0 && newPassword === confirmPassword
  const isMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] border border-[var(--color-border)] p-6 shadow-xs flex flex-col gap-6">
      <div className="flex flex-col border-b border-[var(--color-border)] pb-4">
        <h3 className="font-[var(--font-display)] text-base sm:text-lg font-semibold text-[var(--color-primary)] flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-[var(--color-tertiary)]" />
          {t('profile.securitySection')}
        </h3>
        <p className="text-xs text-[var(--color-secondary)] mt-1">
          {t('profile.securityHint')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Current Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
            {t('profile.currentPassword')} <span className="text-[var(--color-danger)]">*</span>
          </label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={t('profile.currentPasswordPlaceholder')}
              className="w-full pl-3.5 pr-10 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-tertiary)] focus:ring-1 focus:ring-[var(--color-tertiary)]/20 outline-none text-sm text-[var(--color-primary)] transition-all placeholder-[var(--color-secondary)]/50"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
            {t('profile.newPassword')} <span className="text-[var(--color-danger)]">*</span>
          </label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('profile.newPasswordPlaceholder')}
              className="w-full pl-3.5 pr-10 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-tertiary)] focus:ring-1 focus:ring-[var(--color-tertiary)]/20 outline-none text-sm text-[var(--color-primary)] transition-all placeholder-[var(--color-secondary)]/50"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {newPassword.length > 0 && newPassword.length < 6 && (
            <span className="text-[11px] text-[var(--color-warning)] font-medium">{t('profile.passwordMinLength')}</span>
          )}
        </div>

        {/* Confirm New Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
            {t('profile.confirmPassword')} <span className="text-[var(--color-danger)]">*</span>
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('profile.confirmPasswordPlaceholder')}
              className="w-full pl-3.5 pr-10 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-tertiary)] focus:ring-1 focus:ring-[var(--color-tertiary)]/20 outline-none text-sm text-[var(--color-primary)] transition-all placeholder-[var(--color-secondary)]/50"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {isMatching && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-success)] font-medium mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t('profile.passwordMatch')}</span>
            </div>
          )}

          {isMismatch && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-danger)] font-medium mt-0.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{t('profile.passwordMismatch')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isChanging || !currentPassword || !newPassword || !confirmPassword || isMismatch || newPassword.length < 6}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:opacity-90 text-xs font-semibold shadow-xs transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isChanging ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <KeyRound className="w-4 h-4" />
          )}
          <span>{t('profile.changePassword')}</span>
        </button>
      </div>
    </form>
  )
}
