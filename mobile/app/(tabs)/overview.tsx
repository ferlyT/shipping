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
  LogOut,
  AlertTriangle,
  Clock,
  ChevronRight,
  ShieldAlert,
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
import apiClient from '../../src/api/client'
import { AlertDetailModal } from '../../src/features/overview/components/AlertDetailModal'
import { ExitActivityKpiGrid } from '../../src/features/overview/components/ExitActivityKpiGrid'
import { ExitBatchListItem } from '../../src/features/overview/components/ExitBatchListItem'
import { BatchManifestSheet } from '../../src/features/logistics/components/BatchManifestSheet'

type ExitScope = 'today' | 'yesterday' | 'tomorrow' | 'recent' | 'eta_not_exit' | 'missed_sla'

export default function OverviewScreen() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { colors, mode, toggleTheme } = useThemeStore()
  const { t, language, toggleLanguage } = useTranslation()

  const currentYear = new Date().getFullYear().toString()
  const [activeScope, setActiveScope] = useState<ExitScope>('today')
  const [modeFilter, setModeFilter] = useState<'all' | '1' | '2'>('all')
  const [yearFilter, setYearFilter] = useState<string>(currentYear)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null)
  const scrollViewRef = useRef<ScrollView>(null)

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

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setRefreshing(true)
    try {
      await Promise.all([refetchMarkingKpi(), refetchExitBatches()])
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
          <View>
            <Text style={[styles.welcomeLabel, { color: colors.secondary }]}>
              {t('overview.welcomeBack', 'Selamat datang kembali,')}
            </Text>
            <Text style={[styles.userName, { color: colors.primary }]}>
              {user?.fullName || user?.username || 'User'}
            </Text>
            <View style={styles.roleBadgeRow}>
              <Badge label={user?.role?.toUpperCase() || 'USER'} variant="info" />
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={toggleLanguage}
              style={[styles.headerBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <Globe size={18} color={colors.secondary} />
              <Text style={[styles.langText, { color: colors.primary }]}>
                {language.toUpperCase()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleTheme}
              style={[styles.headerBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              {isDark ? <Sun size={18} color="#FBBF24" /> : <Moon size={18} color={colors.primary} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* 1. Operasional Lapangan & Peringatan Dini (Actionable Alerts) */}
        <View style={[styles.sectionHeader, { marginTop: 10 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ShieldAlert size={16} color="#EF4444" />
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              {t('overview.operationalAlerts', 'Peringatan Dini Operasional')}
            </Text>
          </View>
        </View>

        {/* 2 Actionable Alert Cards */}
        <View style={styles.alertCardsRow}>
          {/* Alert 1: ETA Belum Keluar */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleScopeChange('eta_not_exit')}
            style={[
              styles.alertCard,
              {
                borderWidth: activeScope === 'eta_not_exit' ? 2 : 1,
                borderColor: activeScope === 'eta_not_exit'
                  ? '#F59E0B'
                  : (markingKpis?.etaNotExitBatches || 0) > 0
                  ? 'rgba(245, 158, 11, 0.5)'
                  : colors.border,
                backgroundColor: activeScope === 'eta_not_exit'
                  ? (isDark ? 'rgba(245, 158, 11, 0.16)' : 'rgba(245, 158, 11, 0.1)')
                  : (isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.05)'),
              },
            ]}
          >
            <View style={styles.alertCardHeader}>
              <View style={styles.alertTitleWrapper}>
                <AlertTriangle size={13} color="#F59E0B" style={{ flexShrink: 0 }} />
                <Text
                  style={[styles.alertCardTitle, { color: '#F59E0B' }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {t('overview.etaNotExit', 'ETA NOT EXIT').toUpperCase()}
                </Text>
              </View>
              <View style={styles.alertActionsWrapper}>
                {activeScope === 'eta_not_exit' ? (
                  <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#F59E0B' }} />
                ) : null}
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation()
                    openEtaModal()
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <ChevronRight size={13} color={colors.secondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginVertical: 3 }}>
              <Text style={[styles.alertCardValue, { color: colors.primary }]}>
                {formatNumber(markingKpis?.etaNotExitBatches || 0)}
              </Text>
              <Text style={[styles.alertCardSub, { color: colors.secondary }]} numberOfLines={2}>
                {t('overview.etaCardSub', 'Batch ETA lewat & belum keluar')}
              </Text>
            </View>

            <View style={[styles.alertBreakdownRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <Text style={[styles.alertBreakdownText, { color: colors.secondary }]} numberOfLines={1}>
                {t('overview.air', 'Udara')}: <Text style={{ fontWeight: '700', color: colors.primary }}>{markingKpis?.etaNotExitBatchesAir || 0}</Text>
              </Text>
              <Text style={[styles.alertBreakdownDot, { color: colors.secondary }]}>•</Text>
              <Text style={[styles.alertBreakdownText, { color: colors.secondary }]} numberOfLines={1}>
                {t('overview.sea', 'Laut')}: <Text style={{ fontWeight: '700', color: colors.primary }}>{markingKpis?.etaNotExitBatchesSea || 0}</Text>
              </Text>
            </View>
          </TouchableOpacity>

          {/* Alert 2: Melewati Target SLA */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleScopeChange('missed_sla')}
            style={[
              styles.alertCard,
              {
                borderWidth: activeScope === 'missed_sla' ? 2 : 1,
                borderColor: activeScope === 'missed_sla'
                  ? '#EF4444'
                  : (markingKpis?.missedTargetBatches || 0) > 0
                  ? 'rgba(239, 68, 68, 0.5)'
                  : colors.border,
                backgroundColor: activeScope === 'missed_sla'
                  ? (isDark ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.1)')
                  : (isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.05)'),
              },
            ]}
          >
            <View style={styles.alertCardHeader}>
              <View style={styles.alertTitleWrapper}>
                <Clock size={13} color="#EF4444" style={{ flexShrink: 0 }} />
                <Text
                  style={[styles.alertCardTitle, { color: '#EF4444' }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {t('overview.missedSla', 'MISSED SLA').toUpperCase()}
                </Text>
              </View>
              <View style={styles.alertActionsWrapper}>
                {activeScope === 'missed_sla' ? (
                  <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#EF4444' }} />
                ) : null}
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation()
                    openSlaModal()
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <ChevronRight size={13} color={colors.secondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginVertical: 3 }}>
              <Text style={[styles.alertCardValue, { color: colors.primary }]}>
                {formatNumber(markingKpis?.missedTargetBatches || 0)}
              </Text>
              <Text style={[styles.alertCardSub, { color: colors.secondary }]} numberOfLines={2}>
                {t('overview.slaCardSub', 'Durasi transit melebihi target')}
              </Text>
            </View>

            <View style={[styles.alertBreakdownRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <Text style={[styles.alertBreakdownText, { color: colors.secondary }]} numberOfLines={1}>
                {t('overview.air', 'Udara')}: <Text style={{ fontWeight: '700', color: colors.primary }}>{markingKpis?.missedTargetBatchesAir || 0}</Text>
              </Text>
              <Text style={[styles.alertBreakdownDot, { color: colors.secondary }]}>•</Text>
              <Text style={[styles.alertBreakdownText, { color: colors.secondary }]} numberOfLines={1}>
                {t('overview.sea', 'Laut')}: <Text style={{ fontWeight: '700', color: colors.primary }}>{markingKpis?.missedTargetBatchesSea || 0}</Text>
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Exit Activity Section Header */}
        <View style={[styles.sectionHeader, { marginTop: 14 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <LogOut size={16} color={colors.tertiary} />
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              {t('overview.exitActivity', 'Exit Activity')}
            </Text>
          </View>
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
            {getScopeTitle()}
          </Text>
          <Badge
            label={`${exitBatches?.length || 0} Batch`}
            variant={
              activeScope === 'today'
                ? 'success'
                : activeScope === 'tomorrow' || activeScope === 'eta_not_exit'
                ? 'warning'
                : activeScope === 'missed_sla'
                ? 'danger'
                : 'neutral'
            }
          />
        </View>

        {/* Group Pills Udara dan Laut */}
        <View style={{ marginBottom: isAlertScope ? 8 : 10 }}>
          <SegmentedControl
            options={[
              { label: t('overview.all', 'Semua'), value: 'all' },
              { label: t('overview.air', 'Udara'), value: '1' },
              { label: t('overview.sea', 'Laut'), value: '2' },
            ]}
            selectedValue={modeFilter}
            onValueChange={(val) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              setModeFilter(val as any)
            }}
          />
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
              />
            ))}
          </View>
        ) : (
          <Card style={{ alignItems: 'center', padding: 20 }}>
            <Text style={{ color: colors.secondary, fontSize: 12 }}>{getScopeEmptyText()}</Text>
          </Card>
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
    fontSize: 12,
    fontWeight: '500',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  roleBadgeRow: {
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  seeAllText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  alertCardsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  alertCard: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    overflow: 'hidden',
  },
  alertCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 20,
  },
  alertTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    minWidth: 0,
    marginRight: 4,
  },
  alertActionsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
  },
  alertCardTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  alertCardValue: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  alertCardSub: {
    fontSize: 10,
    marginTop: 1,
    lineHeight: 14,
  },
  alertBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderTopWidth: 1,
    paddingTop: 5,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  alertBreakdownText: {
    fontSize: 9.5,
  },
  alertBreakdownDot: {
    fontSize: 9.5,
  },
})
