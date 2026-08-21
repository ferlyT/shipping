import { useState, useEffect } from 'react'
import { User, Shield, Calendar, Clock, Save, Loader2, Lock } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { formatDate, formatDateTime } from '@/lib/utils'
import type { UserProfile, UpdateProfileInput } from '../types/profile.types'

interface ProfileInfoFormProps {
  profile: UserProfile | undefined
  onSave: (data: UpdateProfileInput) => Promise<any>
  isSaving: boolean
}

export function ProfileInfoForm({ profile, onSave, isSaving }: ProfileInfoFormProps) {
  const { t } = useTranslation()
  const [fullName, setFullName] = useState(profile?.fullName || '')

  useEffect(() => {
    if (profile?.fullName) {
      setFullName(profile.fullName)
    }
  }, [profile?.fullName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) return
    await onSave({ fullName: fullName.trim() })
  }

  const isDirty = fullName.trim() !== (profile?.fullName || '').trim()

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] border border-[var(--color-border)] p-6 shadow-xs flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div>
          <h3 className="font-[var(--font-display)] text-base sm:text-lg font-semibold text-[var(--color-primary)]">
            {t('profile.accountInfo')}
          </h3>
          <p className="text-xs text-[var(--color-secondary)] mt-0.5">
            {t('profile.accountSubtitle')}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-md)] text-xs font-semibold uppercase tracking-wider bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)]">
          <Shield className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
          {profile?.role || 'viewer'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Username (Read-Only) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary)] flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-[var(--color-secondary)]" />
            {t('profile.username')}
          </label>
          <div className="relative">
            <input
              type="text"
              value={profile?.username || ''}
              disabled
              className="w-full px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-neutral)] text-sm text-[var(--color-secondary)] font-medium cursor-not-allowed select-all"
            />
          </div>
          <span className="text-[11px] text-[var(--color-secondary)]/70">{t('profile.usernameHint')}</span>
        </div>

        {/* Full Name (Editable) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1.5">
            <User className="w-3 h-3 text-[var(--color-secondary)]" />
            {t('profile.fullName')} <span className="text-[var(--color-danger)]">*</span>
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t('profile.fullNamePlaceholder')}
            className="w-full px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-tertiary)] focus:ring-1 focus:ring-[var(--color-tertiary)]/20 outline-none text-sm text-[var(--color-primary)] font-medium transition-all placeholder-[var(--color-secondary)]/50"
          />
        </div>
      </div>

      {/* Meta info: Registered since & Last login */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-[var(--radius-lg)] bg-[var(--color-neutral)] border border-[var(--color-border)] text-xs text-[var(--color-secondary)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-secondary)] shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)]">{t('profile.createdAt')}</span>
            <span className="font-semibold text-[var(--color-primary)] mt-0.5">{formatDate(profile?.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-secondary)] shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)]">{t('profile.lastLogin')}</span>
            <span className="font-semibold text-[var(--color-primary)] mt-0.5">{formatDateTime(profile?.lastLoginAt)}</span>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSaving || !isDirty || !fullName.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-tertiary)] hover:opacity-90 text-[var(--color-on-primary)] text-xs font-semibold shadow-xs transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{t('profile.saveProfile')}</span>
        </button>
      </div>
    </form>
  )
}
