import React, { useState } from 'react'
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
  ScanLine,
  Package,
  FileText,
  Calculator,
  Plane,
  Ship,
  Users,
  Box,
  Scale,
  TrendingUp,
  Moon,
  Sun,
  Globe,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { Card } from '../../src/components/ui/Card'
import { Badge } from '../../src/components/ui/Badge'
import { SkeletonShimmer } from '../../src/components/ui/SkeletonShimmer'
import { SegmentedControl } from '../../src/components/ui/SegmentedControl'
import { BarcodeScannerModal } from '../../src/components/scanner/BarcodeScannerModal'
import { useAuthStore } from '../../src/stores/authStore'
import { useThemeStore } from '../../src/theme/themeStore'
import { useToastStore } from '../../src/stores/toastStore'
import { useTranslation } from '../../src/hooks/useTranslation'
import { formatNumber, formatDecimal, formatDate } from '../../src/lib/utils'
import apiClient from '../../src/api/client'

export default function OverviewScreen() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { colors, mode, toggleTheme } = useThemeStore()
  const { showToast } = useToastStore()
  const { t, language, toggleLanguage } = useTranslation()

  const [modeFilter, setModeFilter] = useState<'all' | '1' | '2'>('all')
  const [scannerVisible, setScannerVisible] = useState(false)

  // Fetch KPI data
  const {
    data: kpiData,
    isLoading: isKpiLoading,
    refetch: refetchKpi,
    isRefetching,
  } = useQuery({
    queryKey: ['shipments-kpi', modeFilter],
    queryFn: async () => {
      const params: any = {}
      if (modeFilter !== 'all') params.listType = modeFilter
      const res = await apiClient.get('/shipments/kpi', { params })
      return res.data.data
    },
  })

  // Fetch recent shipments
  const { data: recentShipments, isLoading: isListLoading } = useQuery({
    queryKey: ['recent-shipments'],
    queryFn: async () => {
      const res = await apiClient.get('/shipments', { params: { limit: 5 } })
      return res.data.data || []
    },
  })

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    await refetchKpi()
  }

  const handleScanResult = (barcode: string) => {
    showToast(`Resi terdeteksi: ${barcode}`, 'info')
    // Open shipment list with search filter
    router.push({
      pathname: '/(tabs)/logistics',
      params: { search: barcode },
    })
  }

  const isDark = mode === 'midnight'
  const metrics = kpiData?.all || {}

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: isDark ? '#0B0F17' : '#F7F5F2' }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.tertiary}
          />
        }
      >
        {/* Top Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.welcomeLabel, { color: colors.secondary }]}>
              {t('common.welcome', 'Halo')},
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

        {/* Quick Actions Grid */}
        <View style={styles.quickActionGrid}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setScannerVisible(true)}
            style={[
              styles.actionBox,
              { backgroundColor: colors.surface, borderColor: colors.cardBorder },
            ]}
          >
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
              <ScanLine size={22} color="#38BDF8" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.primary }]}>Scan Resi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/logistics')}
            style={[
              styles.actionBox,
              { backgroundColor: colors.surface, borderColor: colors.cardBorder },
            ]}
          >
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Package size={22} color="#10B981" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.primary }]}>Shipment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/finance')}
            style={[
              styles.actionBox,
              { backgroundColor: colors.surface, borderColor: colors.cardBorder },
            ]}
          >
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <FileText size={22} color="#F59E0B" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.primary }]}>Billing</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/finance')}
            style={[
              styles.actionBox,
              { backgroundColor: colors.surface, borderColor: colors.cardBorder },
            ]}
          >
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
              <Calculator size={22} color="#8B5CF6" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.primary }]}>Cek Tarif</Text>
          </TouchableOpacity>
        </View>

        {/* Moda Switcher */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            Ringkasan Operasional
          </Text>
        </View>

        <SegmentedControl
          options={[
            { label: 'Semua Moda', value: 'all' },
            { label: 'Udara', value: '1', icon: <Plane size={14} color="#38BDF8" /> },
            { label: 'Laut', value: '2', icon: <Ship size={14} color="#818CF8" /> },
          ]}
          selectedValue={modeFilter}
          onValueChange={setModeFilter}
          style={{ marginBottom: 16 }}
        />

        {/* 5 Executive KPI Cards Grid */}
        {isKpiLoading ? (
          <View style={styles.kpiGrid}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.kpiCol}>
                <Card style={{ padding: 16, height: 100, justifyContent: 'space-between' }}>
                  <SkeletonShimmer width="40%" height={12} />
                  <SkeletonShimmer width="80%" height={24} />
                  <SkeletonShimmer width="60%" height={10} />
                </Card>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.kpiGrid}>
            {/* Total Resi */}
            <View style={styles.kpiCol}>
              <Card>
                <View style={styles.kpiHeader}>
                  <Text style={[styles.kpiTitle, { color: colors.secondary }]}>TOTAL RESI</Text>
                  <Box size={16} color={colors.tertiary} />
                </View>
                <Text style={[styles.kpiValue, { color: colors.primary }]}>
                  {formatNumber(metrics.totalReceipts || 0)}
                </Text>
                <View style={styles.kpiFooter}>
                  <Plane size={12} color="#38BDF8" />
                  <Text style={[styles.kpiSubText, { color: colors.secondary }]}>
                    {formatNumber(metrics.breakdown?.udara?.receipts || 0)}
                  </Text>
                  <Ship size={12} color="#818CF8" style={{ marginLeft: 6 }} />
                  <Text style={[styles.kpiSubText, { color: colors.secondary }]}>
                    {formatNumber(metrics.breakdown?.laut?.receipts || 0)}
                  </Text>
                </View>
              </Card>
            </View>

            {/* Total Koli */}
            <View style={styles.kpiCol}>
              <Card>
                <View style={styles.kpiHeader}>
                  <Text style={[styles.kpiTitle, { color: colors.secondary }]}>TOTAL KOLI</Text>
                  <Package size={16} color="#10B981" />
                </View>
                <Text style={[styles.kpiValue, { color: colors.primary }]}>
                  {formatNumber(metrics.totalPackages || 0)}
                </Text>
                <View style={styles.kpiFooter}>
                  <Plane size={12} color="#38BDF8" />
                  <Text style={[styles.kpiSubText, { color: colors.secondary }]}>
                    {formatNumber(metrics.breakdown?.udara?.packages || 0)}
                  </Text>
                  <Ship size={12} color="#818CF8" style={{ marginLeft: 6 }} />
                  <Text style={[styles.kpiSubText, { color: colors.secondary }]}>
                    {formatNumber(metrics.breakdown?.laut?.packages || 0)}
                  </Text>
                </View>
              </Card>
            </View>

            {/* Total Berat */}
            <View style={styles.kpiCol}>
              <Card>
                <View style={styles.kpiHeader}>
                  <Text style={[styles.kpiTitle, { color: colors.secondary }]}>TOTAL BERAT</Text>
                  <Scale size={16} color="#F59E0B" />
                </View>
                <Text style={[styles.kpiValue, { color: colors.primary }]}>
                  {formatDecimal(metrics.totalWeight || 0, 1)} <Text style={styles.unitText}>kg</Text>
                </Text>
                <View style={styles.kpiFooter}>
                  <TrendingUp size={12} color={colors.secondary} />
                  <Text style={[styles.kpiSubText, { color: colors.secondary }]}>
                    MoM {metrics.comparison?.weight?.momGrowth || '0%'}
                  </Text>
                </View>
              </Card>
            </View>

            {/* Total Volume */}
            <View style={styles.kpiCol}>
              <Card>
                <View style={styles.kpiHeader}>
                  <Text style={[styles.kpiTitle, { color: colors.secondary }]}>TOTAL VOLUME</Text>
                  <TrendingUp size={16} color="#8B5CF6" />
                </View>
                <Text style={[styles.kpiValue, { color: colors.primary }]}>
                  {formatDecimal(metrics.totalVolume || 0, 3)} <Text style={styles.unitText}>m³</Text>
                </Text>
                <View style={styles.kpiFooter}>
                  <Users size={12} color={colors.secondary} />
                  <Text style={[styles.kpiSubText, { color: colors.secondary }]}>
                    {formatNumber(metrics.totalCust || 0)} Customer
                  </Text>
                </View>
              </Card>
            </View>
          </View>
        )}

        {/* Recent Shipments Feed */}
        <View style={[styles.sectionHeader, { marginTop: 12 }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            Shipment Terkini
          </Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/logistics')}>
            <Text style={[styles.seeAllText, { color: colors.tertiary }]}>Lihat Semua</Text>
          </TouchableOpacity>
        </View>

        {isListLoading ? (
          <View style={{ gap: 10 }}>
            <SkeletonShimmer height={70} />
            <SkeletonShimmer height={70} />
          </View>
        ) : recentShipments?.length > 0 ? (
          <View style={{ gap: 10 }}>
            {recentShipments.map((s: any) => (
              <Card key={s.fdListCode || s.fdTerima} style={styles.recentItemCard}>
                <View style={styles.recentItemHeader}>
                  <Text style={[styles.itemResi, { color: colors.primary }]}>
                    {s.fdTerima || s.fdListCode}
                  </Text>
                  <Badge
                    label={s.fdListType === 1 ? 'Udara' : 'Laut'}
                    variant={s.fdListType === 1 ? 'air' : 'sea'}
                    icon={s.fdListType === 1 ? <Plane size={10} color="#38BDF8" /> : <Ship size={10} color="#818CF8" />}
                  />
                </View>
                <Text style={[styles.itemCust, { color: colors.secondary }]} numberOfLines={1}>
                  {s.fdCustName || '—'}
                </Text>
                <View style={styles.itemMetaRow}>
                  <Text style={[styles.itemMetaText, { color: colors.secondary }]}>
                    {(s.fdJmlPack ?? s.fdColy)
                      ? `${formatNumber(s.fdJmlPack ?? s.fdColy)} ${s.fdSatuan || 'Koli'}`
                      : '—'}{' '}
                    • {formatDecimal(s.fdJmlBerat ?? s.fdWeight, 1)} kg
                  </Text>
                  <Text style={[styles.itemDate, { color: colors.secondary }]}>
                    {formatDate(s.fdDateTerima || s.fdDate)}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <Card style={{ alignItems: 'center', padding: 24 }}>
            <Text style={{ color: colors.secondary }}>Belum ada transaksi terkini</Text>
          </Card>
        )}
      </ScrollView>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={handleScanResult}
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
    marginBottom: 20,
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
    fontSize: 11,
    fontWeight: '700',
  },
  quickActionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    marginBottom: 16,
  },
  kpiCol: {
    width: '50%',
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  unitText: {
    fontSize: 12,
    fontWeight: '500',
  },
  kpiFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kpiSubText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 3,
  },
  recentItemCard: {
    padding: 12,
  },
  recentItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemResi: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemCust: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  itemMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemMetaText: {
    fontSize: 11,
  },
  itemDate: {
    fontSize: 11,
  },
})
