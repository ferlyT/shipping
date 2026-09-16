import { useState } from 'react'
import { User, Lock, Palette } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { cn } from '@/lib/utils'
import { useProfile } from '../hooks/useProfile'
import { AvatarUpload } from '../components/AvatarUpload'
import { ProfileInfoForm } from '../components/ProfileInfoForm'
import { ChangePasswordForm } from '../components/ChangePasswordForm'
import { ThemeSelectorCard } from '../components/ThemeSelectorCard'

type ActiveTab = 'info' | 'security' | 'theme'

function AccountPageSkeleton() {
  const { t } = useTranslation()
  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0 space-y-6 bg-[var(--color-surface)] font-[var(--font-body)] animate-fadeIn pb-24">
      <PageHeader
        title={t('profile.title')}
        subtitle={t('profile.subtitle')}
        breadcrumbs={[
          { label: t('module.overview'), path: ROUTES.DASHBOARD },
          { label: t('nav.profile'), path: ROUTES.PROFILE },
          { label: t('profile.tabInfo') },
        ]}
      />

      {/* Tabs Skeleton */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
        <div className="h-8 w-28 rounded-lg skeleton-shimmer" />
        <div className="h-8 w-32 rounded-lg skeleton-shimmer" />
        <div className="h-8 w-28 rounded-lg skeleton-shimmer" />
      </div>

      {/* Avatar Card Skeleton */}
      <div className="flex items-center gap-6 p-6 bg-[var(--color-surface)] rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-xs">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full skeleton-shimmer shrink-0" />
        <div className="space-y-3 flex-1">
          <div className="h-5 w-36 rounded skeleton-shimmer" />
          <div className="h-3.5 w-64 rounded skeleton-shimmer" />
          <div className="flex gap-2 pt-1">
            <div className="h-8 w-28 rounded-lg skeleton-shimmer" />
            <div className="h-8 w-24 rounded-lg skeleton-shimmer" />
          </div>
        </div>
      </div>

      {/* Form Skeleton */}
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] border border-[var(--color-border)] p-6 shadow-xs space-y-5">
        <div className="h-5 w-44 rounded skeleton-shimmer" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-10 rounded-lg skeleton-shimmer" />
          <div className="h-10 rounded-lg skeleton-shimmer" />
        </div>
      </div>
    </div>
  )
}

export default function AccountPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<ActiveTab>('info')

  const {
    profile,
    isLoading,
    updateProfile,
    isUpdatingProfile,
    changePassword,
    isChangingPassword,
    uploadAvatar,
    isUploadingAvatar,
    deleteAvatar,
    isDeletingAvatar,
  } = useProfile()

  if (isLoading && !profile) {
    return <AccountPageSkeleton />
  }

  const getBreadcrumbTabLabel = () => {
    switch (activeTab) {
      case 'info':
        return t('profile.tabInfo')
      case 'security':
        return t('profile.tabSecurity')
      case 'theme':
        return t('theme.tabTheme')
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0 space-y-6 bg-[var(--color-surface)] font-[var(--font-body)] animate-fadeIn pb-24">
      <PageHeader
        title={t('profile.title')}
        subtitle={t('profile.subtitle')}
        breadcrumbs={[
          { label: t('module.overview'), path: ROUTES.DASHBOARD },
          { label: t('nav.profile'), path: ROUTES.PROFILE },
          { label: getBreadcrumbTabLabel() },
        ]}
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 rounded-t-[var(--radius-md)] transition-all cursor-pointer select-none -mb-px',
            activeTab === 'info'
              ? 'border-[var(--color-tertiary)] text-[var(--color-tertiary)] bg-[var(--color-neutral)]'
              : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-border-strong)]'
          )}
        >
          <User className="w-4 h-4" />
          <span>{t('profile.tabInfo')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 rounded-t-[var(--radius-md)] transition-all cursor-pointer select-none -mb-px',
            activeTab === 'security'
              ? 'border-[var(--color-tertiary)] text-[var(--color-tertiary)] bg-[var(--color-neutral)]'
              : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-border-strong)]'
          )}
        >
          <Lock className="w-4 h-4" />
          <span>{t('profile.tabSecurity')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('theme')}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 rounded-t-[var(--radius-md)] transition-all cursor-pointer select-none -mb-px',
            activeTab === 'theme'
              ? 'border-[var(--color-tertiary)] text-[var(--color-tertiary)] bg-[var(--color-neutral)]'
              : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-border-strong)]'
          )}
        >
          <Palette className="w-4 h-4" />
          <span>{t('theme.tabTheme')}</span>
        </button>
      </div>

      {/* Content Area */}
      {activeTab === 'info' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-150">
          {/* Avatar Upload Card */}
          <AvatarUpload
            avatarUrl={profile?.avatarUrl}
            fullName={profile?.fullName || ''}
            onUpload={uploadAvatar}
            onDelete={deleteAvatar}
            isUploading={isUploadingAvatar}
            isDeleting={isDeletingAvatar}
          />

          {/* Profile Info Form */}
          <ProfileInfoForm
            profile={profile}
            onSave={updateProfile}
            isSaving={isUpdatingProfile}
          />
        </div>
      )}

      {activeTab === 'security' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-150">
          {/* Change Password Form */}
          <ChangePasswordForm
            onChangePassword={changePassword}
            isChanging={isChangingPassword}
          />
        </div>
      )}

      {activeTab === 'theme' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-150">
          {/* Theme Selection Card */}
          <ThemeSelectorCard />
        </div>
      )}
    </div>
  )
}
