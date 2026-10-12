import React, { useState, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import {
  Moon,
  Sun,
  Globe,
  Shield,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { Card } from '../../src/components/ui/Card'
import { Badge } from '../../src/components/ui/Badge'
import { SkeletonShimmer } from '../../src/components/ui/SkeletonShimmer'
import { SegmentedControl } from '../../src/components/ui/SegmentedControl'
import { useAuthStore } from '../../src/stores/authStore'
import { useThemeStore } from '../../src/theme/themeStore'
import { useTranslation } from '../../src/hooks/useTranslation'
import { formatNumber } from '../../src/lib/utils'
import { canManageBatchExitDate, canViewBillingOperational } from '../../src/lib/permissions'
import { BatchExitDateModal } from '../../src/features/logistics/components/BatchExitDateModal'
import { AlertDetailModal } from '../../src/features/overview/components/AlertDetailModal'
import { ExitActivityKpiGrid } from '../../src/features/overview/components/ExitActivityKpiGrid'
import { ExitBatchListItem } from '../../src/features/overview/components/ExitBatchListItem'
import { BatchManifestSheet } from '../../src/features/logistics/components/BatchManifestSheet'
import { useToastStore } from '../../src/stores/toastStore'
import { useInspectionMutations } from '../../src/features/inspection/hooks/useInspectionMutations'
import apiClient from '../../src/api/client'
import { InspectionFormSheet } from '../../src/features/inspection/components/InspectionFormSheet'
import { BillingPeriodNavigator } from '../../src/features/overview/components/BillingPeriodNavigator'
import { TargetBillKpiCards } from '../../src/features/overview/components/TargetBillKpiCards'
import { UnissuedBillsDetailSheet } from '../../src/features/overview/components/UnissuedBillsDetailSheet'
import { BatchExitComparisonWidget } from '../../src/features/overview/components/BatchExitComparisonWidget'
import { BatchExitDetailSheet } from '../../src/features/overview/components/BatchExitDetailSheet'
import { HeroCard } from '../../src/features/overview/components/HeroCard'
import type { HeroSection, HeroStat } from '../../src/features/overview/types/hero.types'
import {
  useBillingKpisQuery,
  useBatchExitComparisonQuery,
} from '../../src/features/overview/hooks/useOperationBilling'


type ExitScope = 'today' | 'yesterday' | 'tomorrow' | 'recent' | 'eta_not_exit' | 'missed_sla'

export default function OverviewScreen() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { colors, mode, toggleTheme } = useThemeStore()
  const { t, language, toggleLanguage } = useTranslation()
  const canEditExitDate = canManageBatchExitDate(user)

  const currentYear = new Date().getFullYear().toString()
  const [activeScope, setActiveScope] = useState<ExitScope>('today')
  const [modeFilter, setModeFilter] = useState<'all' | '1' | '2'>('all')
  const [yearFilter, setYearFilter] = useState<string>(currentYear)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null)
  const [batchForExitDate, setBatchForExitDate] = useState<any | null>(null)
  const scrollViewRef = useRef<ScrollView>(null)


  const { showToast } = useToastStore()

  // BAP from manifest state
  const [bapInitialData, setBapInitialData] = useState<any | null>(null)
  const [isBapFormVisible, setIsBapFormVisible] = useState(false)
  const { createMutation: createBapMutation } = useInspectionMutations()

  const handleCreateBapFromShipment = (shipment: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const prefilled = {
      fdListType: shipment.fdListType ? (Number(shipment.fdListType) as 1 | 2) : 2,
      fdMarkingCode: shipment.fdMarkingCode?.trim() || '',
      fdMarkingNo: shipment.fdMarkingNo?.trim() || '',
      fdListCode: shipment.fdListCode?.trim() || '',
      fdTerima: shipment.fdTerima?.trim() || '',
      fdNamaCustomer: shipment.fdCustName?.trim() || '',
      fdReportDate: new Date().toISOString(),
      fdStatus: '1',
    }
    setBapInitialData(prefilled)
    setIsBapFormVisible(true)
  }

  const handleBapSubmit = async (payload: any) => {
    try {
      const res = await createBapMutation.mutateAsync(payload)
      setIsBapFormVisible(false)
      setBapInitialData(null)
      showToast('Berita Acara Pemeriksaan berhasil dibuat', 'success')
      return res
    } catch {
      // handled by mutation
    }
  }

  const isAlertScope = activeScope === 'eta_not_exit' || activeScope === 'missed_sla'

  // Actionable Alerts Detail Modal State
  const [alertModal, setAlertModal] = useState<{
    visible: boolean
    type: 'eta' | 'sla'
    title: string
    subtitle: string
    items: any[]
  }>({
    visible: false,
    type: 'eta',
    title: '',
    subtitle: '',
    items: [],
  })

  const openEtaModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setAlertModal({
      visible: true,
      type: 'eta',
      title: t('overview.etaModalTitle', 'Batch ETA Belum Keluar'),
      subtitle: `${markingKpis?.etaNotExitBatches || 0} ${t('overview.etaModalSubtitle', 'batch melewati jadwal ETA namun belum tercatat keluar')}`,
      items: markingKpis?.etaNotExitSummaryArray || [],
    })
  }

  const openSlaModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setAlertModal({
      visible: true,
      type: 'sla',
      title: t('overview.slaModalTitle', 'Peringatan Target SLA'),
      subtitle: `${markingKpis?.missedTargetBatches || 0} ${t('overview.slaModalSubtitle', 'batch dengan durasi transit melebihi target SLA rute')}`,
      items: markingKpis?.missedTargetSummaryArray || [],
    })
  }

  // Fetch Exit Activity KPIs from /marking/kpi
  const {
    data: markingKpis,
    isLoading: isMarkingKpiLoading,
    refetch: refetchMarkingKpi,
  } = useQuery({
    queryKey: ['marking-kpi-overview'],
    queryFn: async () => {
      const res = await apiClient.get('/marking/kpi')
      return res.data.data
    },
  })

  // Fetch Exit Batches according to activeScope, modeFilter & yearFilter
  const {
    data: exitBatches,
    isLoading: isExitListLoading,
    refetch: refetchExitBatches,
  } = useQuery({
    queryKey: ['exit-batches', activeScope, modeFilter, isAlertScope ? yearFilter : 'all'],
    queryFn: async () => {
      const params: any = {
        exitScope: activeScope,
        limit: 50,
      }
      if (modeFilter !== 'all') {
        params.listType = modeFilter
      }
      if (isAlertScope && yearFilter !== 'ALL') {
        params.year = yearFilter
      }
      const res = await apiClient.get('/marking', { params })
      return res.data.data || []
    },
  })

  const canViewBillingOps = canViewBillingOperational(user)
  const [dashboardSection, setDashboardSection] = useState<'exit_activity' | 'billing_ops'>('exit_activity')

  // Billing Ops State
  const [billingYear, setBillingYear] = useState<number>(new Date().getFullYear())
  const [billingMonth, setBillingMonth] = useState<number>(new Date().getMonth() + 1)
  const [billingAllTime, setBillingAllTime] = useState<boolean>(false)
  const [unissuedSheetVisible, setUnissuedSheetVisible] = useState(false)
  const [unissuedInitialAging, setUnissuedInitialAging] = useState<string | undefined>(undefined)
  const [batchExitDetailVisible, setBatchExitDetailVisible] = useState(false)

  // Fetch Billing KPIs & Batch Exit comparison
  const {
    data: billingKpis,
    isLoading: isBillingKpiLoading,
    refetch: refetchBillingKpis,
  } = useBillingKpisQuery(
    billingYear,
    billingMonth,
    canViewBillingOps && dashboardSection === 'billing_ops'
  )

  const {
    data: batchExitData,
    isLoading: isBatchExitLoading,
    refetch: refetchBatchExit,
  } = useBatchExitComparisonQuery(
    billingYear,
    billingMonth,
    billingAllTime,
    canViewBillingOps && dashboardSection === 'billing_ops'
  )

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setRefreshing(true)
    try {
      if (dashboardSection === 'exit_activity') {
        await Promise.all([refetchMarkingKpi(), refetchExitBatches()])
      } else {
        await Promise.all([refetchBillingKpis(), refetchBatchExit()])
      }
    } finally {
      setRefreshing(false)
    }
  }

  const handleScopeChange = (scope: ExitScope) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setActiveScope(scope)
    if (scope === 'eta_not_exit' || scope === 'missed_sla') {
      setYearFilter(currentYear)
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 360, animated: true })
      }, 100)
    }
  }

  const isDark = mode === 'midnight'

  const getScopeTitle = () => {
    switch (activeScope) {
      case 'today':
        return t('overview.today', 'Batch Exit Hari Ini')
      case 'yesterday':
        return t('overview.yesterday', 'Batch Exit Kemarin')
      case 'tomorrow':
        return t('overview.tomorrow', 'Prediksi Exit Besok')
      case 'recent':
        return t('overview.exit7Days', 'Batch Exit 7 Hari Terakhir')
      case 'eta_not_exit':
        return `${t('overview.etaNotExit', 'Batch ETA Belum Keluar')} (${yearFilter === 'ALL' ? t('overview.all', 'Semua') : yearFilter})`
      case 'missed_sla':
        return `${t('overview.missedSla', 'Peringatan SLA')} (${yearFilter === 'ALL' ? t('overview.all', 'Semua') : yearFilter})`
    }
  }

  const getScopeEmptyText = () => {
    switch (activeScope) {
      case 'today':
        return t('overview.emptyToday', 'Belum ada aktivitas exit batch hari ini')
      case 'yesterday':
        return t('overview.emptyYesterday', 'Tidak ada aktivitas exit batch kemarin')
      case 'tomorrow':
        return t('overview.emptyTomorrow', 'Tidak ada prediksi batch keluar besok')
      case 'recent':
        return t('overview.emptyRecent', 'Tidak ada aktivitas exit batch dalam 7 hari terakhir')
      case 'eta_not_exit':
        return t('overview.emptyEta', 'Bagus! Semua batch yang tiba (ETA) telah diproses keluar gudang')
      case 'missed_sla':
        return t('overview.emptySla', 'Hebat! Semua batch tiba tepat waktu sesuai standar target SLA rute')
    }
  }

  // Scalable Config-Driven Hero Card Configuration (Icon-Free)
  const heroSections: HeroSection[] = [
    {
      id: 'exit_activity',
      label: t('overview.exitActivity', 'Exit Activity'),
      value: markingKpis?.exitTodayCount || 0,
      subLabel: t('overview.batchExitToday', 'Batch Exit Hari Ini'),
      subLabelColor: colors.tertiary,
      breakdown: [
        { label: 'Udara', value: markingKpis?.exitTodayAir || 0 },
        { label: 'Laut', value: markingKpis?.exitTodaySea || 0 },
      ],
      visible: true,
      onPress: () => {
        setDashboardSection('exit_activity')
        handleScopeChange('today')
      },
    },
    {
      id: 'billing_ops',
      label: t('overview.tabBilling', 'Billing Ops'),
      value:
        (billingKpis?.targetBillUdara?.total || 0) +
        (billingKpis?.targetBillLaut?.total || 0),
      subLabel: t('overview.targetBillMonth', 'Target Bill Bulan Ini'),
      subLabelColor: colors.success,
      breakdown: [
        { label: 'Udara', value: billingKpis?.targetBillUdara?.total || 0 },
        { label: 'Laut', value: billingKpis?.targetBillLaut?.total || 0 },
      ],
      visible: canViewBillingOps,
      onPress: () => {
        setDashboardSection('billing_ops')
      },
    },
  ]

  const heroStats: HeroStat[] = [
    {
      id: 'eta_not_exit',
      value: markingKpis?.etaNotExitBatches || 0,
      label: 'ETA Not Exit',
      color: colors.warning,
      visible: true,
      onPress: () => handleScopeChange('eta_not_exit'),
    },
    {
      id: 'missed_sla',
      value: markingKpis?.missedTargetBatches || 0,
      label: 'Missed SLA',
      color: colors.danger,
      visible: true,
      onPress: () => handleScopeChange('missed_sla'),
    },
    {
      id: 'draft_unissued',
      value: billingKpis?.unissuedBills?.totalCount || 0,
      label: 'Draft Unissued',
      color: colors.primary,
      visible: canViewBillingOps && (billingKpis?.unissuedBills?.totalCount || 0) > 0,
      onPress: () => {
        setUnissuedSheetVisible(true)
      },
    },
  ]

  const getRoleShieldColor = () => {
    const r = (user?.role || '').toLowerCase()
    if (r.includes('admin') || r.includes('superadmin')) return '#EF4444' // Red
    if (r.includes('staff') || r.includes('operator') || r.includes('logistics')) return '#0284C7' // Sky Blue
    if (r.includes('cashier') || r.includes('finance') || r.includes('billing')) return '#10B981' // Emerald
    return '#94A3B8' // Slate / Secondary
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: isDark ? '#0B0F17' : '#F7F5F2' }]}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.tertiary}
          />
        }
      >
        {/* Top Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={[styles.welcomeLabel, { color: colors.secondary }]}>
              {t('overview.greeting', 'Halo,')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 1 }}>
              <Text style={[styles.userName, { color: colors.primary }]} numberOfLines={1}>
                {user?.fullName || user?.username || 'User'}
              </Text>
              <View
                style={[
                  styles.roleTextTag,
                  {
                    borderColor: isDark ? '#222C38' : '#E3E7EC',
                  },
                ]}
              >
                <Text style={[styles.roleTextTagLabel, { color: colors.secondary }]}>
                  {user?.role || 'User'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={toggleLanguage}
              style={[styles.headerBtn, { borderColor: isDark ? '#222C38' : '#E3E7EC', backgroundColor: isDark ? '#131A23' : '#FFFFFF' }]}
            >
              <Globe size={18} color={colors.secondary} />
              <Text style={[styles.langText, { color: colors.primary }]}>
                {language.toUpperCase()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleTheme}
              style={[styles.headerBtn, { borderColor: isDark ? '#222C38' : '#E3E7EC', backgroundColor: isDark ? '#131A23' : '#FFFFFF' }]}
            >
              {isDark ? <Sun size={18} color="#FBBF24" /> : <Moon size={18} color={colors.primary} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Overview Section */}
        <HeroCard
          sections={heroSections}
          stats={heroStats}
          isLoading={isMarkingKpiLoading || (canViewBillingOps && isBillingKpiLoading)}
        />

        {/* Main Tabs Switcher: Logistik Exit vs Billing Ops */}
        {canViewBillingOps && (
          <View style={[styles.mainTabsContainer, { borderBottomColor: isDark ? '#222C38' : '#E3E7EC' }]}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.mainTabBtn,
                dashboardSection === 'exit_activity' && styles.mainTabBtnActive,
              ]}
              onPress={() => {
                Haptics.selectionAsync()
                setDashboardSection('exit_activity')
              }}
            >
              <Text
                style={[
                  styles.mainTabText,
                  {
                    color: dashboardSection === 'exit_activity' ? colors.primary : colors.secondary,
                    fontWeight: dashboardSection === 'exit_activity' ? '600' : '500',
                  },
                ]}
              >
                {t('overview.tabExit', 'Logistik exit')}
              </Text>
              {dashboardSection === 'exit_activity' && <View style={styles.mainTabUnderline} />}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.mainTabBtn,
                dashboardSection === 'billing_ops' && styles.mainTabBtnActive,
              ]}
              onPress={() => {
                Haptics.selectionAsync()
                setDashboardSection('billing_ops')
              }}
            >
              <Text
                style={[
                  styles.mainTabText,
                  {
                    color: dashboardSection === 'billing_ops' ? colors.primary : colors.secondary,
                    fontWeight: dashboardSection === 'billing_ops' ? '600' : '500',
                  },
                ]}
              >
                {t('overview.tabBilling', 'Billing ops')}
              </Text>
              {dashboardSection === 'billing_ops' && <View style={styles.mainTabUnderline} />}
            </TouchableOpacity>
          </View>
        )}

        {dashboardSection === 'exit_activity' ? (
          <>
            {/* Exit Activity Section Header */}
            <View style={[styles.sectionHeader, { marginTop: 4 }]}>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                {t('overview.exitActivity', 'Exit Activity')}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  router.push({
                    pathname: '/(tabs)/logistics',
                    params: { tab: 'batches', t: Date.now().toString() },
                  })
                }}
              >
                <Text style={[styles.seeAllText, { color: colors.tertiary }]}>{t('overview.seeAllBatches', 'Lihat Semua Batch')}</Text>
              </TouchableOpacity>
            </View>

        {/* Exit Activity 4-Column Stat Cards */}
        <ExitActivityKpiGrid
          activeScope={activeScope}
          markingKpis={markingKpis}
          onScopeChange={handleScopeChange}
        />

        {/* Dynamic List Header with Active Scope Badge */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 4 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>
            {isAlertScope ? getScopeTitle() : t('overview.batchList', 'Daftar batch')}
          </Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: '#4CC38A',
              borderRadius: 4,
              paddingHorizontal: 8,
              paddingVertical: 1,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '500', color: '#4CC38A' }}>
              {exitBatches?.length || 0} batch
            </Text>
          </View>
        </View>

        {/* Group Filter Moda (seg style) */}
        <View style={{ flexDirection: 'row', gap: 4, marginVertical: 8 }}>
          {[
            { label: t('overview.all', 'Semua'), value: 'all' },
            { label: t('overview.air', 'Udara'), value: '1' },
            { label: t('overview.sea', 'Laut'), value: '2' },
          ].map((opt) => {
            const isSelected = modeFilter === opt.value
            return (
              <TouchableOpacity
                key={opt.value}
                activeOpacity={0.7}
                style={{
                  borderWidth: 1,
                  borderColor: isSelected ? (isDark ? '#222C38' : '#E3E7EC') : 'transparent',
                  backgroundColor: isSelected ? (isDark ? '#131A23' : '#FFFFFF') : 'transparent',
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  minHeight: 36,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setModeFilter(opt.value as any)
                }}
              >
                <Text
                  style={{
                    color: isSelected ? colors.primary : colors.secondary,
                    fontWeight: isSelected ? '600' : '400',
                    fontSize: 13,
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Group Pills Berdasarkan Tahun */}
        {isAlertScope && (
          <View style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.secondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t('overview.batchYear', 'Tahun Batch:')}
              </Text>
              <Badge
                label={yearFilter === currentYear ? t('overview.thisYearActive', `${yearFilter} (Tahun Ini - Aktif)`, { year: yearFilter }) : t('overview.year', `Tahun ${yearFilter}`, { year: yearFilter })}
                variant={yearFilter === currentYear ? 'info' : 'neutral'}
              />
            </View>
            <SegmentedControl
              options={[
                { label: `${currentYear}`, value: currentYear },
                { label: '2025', value: '2025' },
                { label: '2024', value: '2024' },
                { label: t('overview.all', 'Semua'), value: 'ALL' },
              ]}
              selectedValue={yearFilter}
              onValueChange={(val) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                setYearFilter(val)
              }}
            />
          </View>
        )}

        {/* Exit Batches List */}
        {isExitListLoading ? (
          <View style={{ gap: 10 }}>
            <SkeletonShimmer height={80} />
            <SkeletonShimmer height={80} />
          </View>
        ) : exitBatches && exitBatches.length > 0 ? (
          <View style={{ gap: 10 }}>
            {exitBatches.map((b: any, idx: number) => (
              <ExitBatchListItem
                key={(b.fdMarkingCode || '').trim() || String(idx)}
                batch={b}
                activeScope={activeScope}
                onPress={(batch) => {
                  setSelectedBatch(batch)
                }}
                onEditExitDate={canEditExitDate ? (batch) => setBatchForExitDate(batch) : undefined}
              />
            ))}
          </View>
        ) : (
          <Card style={{ alignItems: 'center', padding: 20 }}>
            <Text style={{ color: colors.secondary, fontSize: 12 }}>{getScopeEmptyText()}</Text>
          </Card>
        )}
          </>
        ) : (
          <>
            {/* Billing Period Navigator */}
            <BillingPeriodNavigator
              year={billingYear}
              month={billingMonth}
              onChange={(y, m) => {
                setBillingYear(y)
                setBillingMonth(m)
              }}
            />

            {/* 4 Target Bill KPI Cards */}
            {isBillingKpiLoading ? (
              <View style={{ gap: 10, marginBottom: 14 }}>
                <SkeletonShimmer height={110} />
                <SkeletonShimmer height={110} />
              </View>
            ) : (
              <TargetBillKpiCards
                kpis={billingKpis}
                onOpenUnissuedModal={(agingGroup) => {
                  setUnissuedInitialAging(agingGroup)
                  setUnissuedSheetVisible(true)
                }}
              />
            )}

            {/* Batch Exit vs Bill Dibuat Comparison Widget */}
            {isBatchExitLoading ? (
              <View style={{ gap: 10 }}>
                <SkeletonShimmer height={180} />
                <SkeletonShimmer height={140} />
              </View>
            ) : (
              <BatchExitComparisonWidget
                summary={batchExitData?.summary}
                allTime={billingAllTime}
                onToggleAllTime={() => setBillingAllTime((prev) => !prev)}
                onOpenBatchDetailModal={() => setBatchExitDetailVisible(true)}
              />
            )}
          </>
        )}
      </ScrollView>

      {/* Alert Detail Modal */}
      <AlertDetailModal
        visible={alertModal.visible}
        type={alertModal.type}
        title={alertModal.title}
        subtitle={alertModal.subtitle}
        items={alertModal.items}
        onClose={() => setAlertModal((prev) => ({ ...prev, visible: false }))}
        onSelectBatch={(b) => setSelectedBatch(b)}
      />

      {/* Batch Manifest Sheet */}
      <BatchManifestSheet
        selectedBatch={selectedBatch}
        onClose={() => setSelectedBatch(null)}
        setSelectedBatch={setSelectedBatch}
        onCreateBap={handleCreateBapFromShipment}
      />

      {/* Create BAP from Manifest Modal */}
      <InspectionFormSheet
        visible={isBapFormVisible}
        initialData={bapInitialData}
        onClose={() => {
          setIsBapFormVisible(false)
          setBapInitialData(null)
        }}
        onSubmit={handleBapSubmit}
        isSaving={createBapMutation.isPending}
      />

      {/* Batch Exit Date Modal */}
      <BatchExitDateModal
        visible={Boolean(batchForExitDate)}
        batch={batchForExitDate}
        onClose={() => setBatchForExitDate(null)}
      />

      {/* Unissued Bills Detail Sheet */}
      <UnissuedBillsDetailSheet
        visible={unissuedSheetVisible}
        initialAgingFilter={unissuedInitialAging}
        summaryKpis={billingKpis?.unissuedBills}
        onClose={() => {
          setUnissuedSheetVisible(false)
          setUnissuedInitialAging(undefined)
        }}
      />

      {/* Batch Exit Detail Sheet */}
      <BatchExitDetailSheet
        visible={batchExitDetailVisible}
        summary={batchExitData?.summary}
        batches={batchExitData?.batches}
        onClose={() => setBatchExitDetailVisible(false)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  welcomeLabel: {
    fontSize: 13,
    fontWeight: '400',
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  roleTextTag: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTextTagLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  mainTabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginTop: 4,
    marginBottom: 12,
  },
  mainTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  mainTabBtnActive: {},
  mainTabText: {
    fontSize: 15,
  },
  mainTabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#E0644E',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    height: 40,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  langText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E0644E',
  },
})
