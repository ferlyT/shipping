import React, { useState } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import {
  Package,
  Layers,
  Truck,
  Plane,
  Ship,
  X,
  Scale,
  Box,
  MapPin,
  Calendar,
  AlertCircle,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { Card } from '../../src/components/ui/Card'
import { Badge } from '../../src/components/ui/Badge'
import { SearchBar } from '../../src/components/ui/SearchBar'
import { SegmentedControl } from '../../src/components/ui/SegmentedControl'
import { SkeletonShimmer } from '../../src/components/ui/SkeletonShimmer'
import { BarcodeScannerModal } from '../../src/components/scanner/BarcodeScannerModal'
import { useThemeStore } from '../../src/theme/themeStore'
import { useToastStore } from '../../src/stores/toastStore'
import { formatNumber, formatDecimal, formatDate } from '../../src/lib/utils'
import apiClient from '../../src/api/client'

export default function LogisticsScreen() {
  const { colors, mode } = useThemeStore()
  const { showToast } = useToastStore()

  const [activeTab, setActiveTab] = useState<'shipments' | 'batches' | 'delivery'>('shipments')
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState<'all' | '1' | '2'>('all')
  const [scannerVisible, setScannerVisible] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any | null>(null)

  // Fetch Shipments
  const {
    data: shipmentsData,
    isLoading: isShipmentsLoading,
    refetch: refetchShipments,
    isRefetching: isRefetchingShipments,
  } = useQuery({
    queryKey: ['logistics-shipments', search, modeFilter],
    queryFn: async () => {
      const params: any = { limit: 20 }
      if (search.trim()) params.search = search.trim()
      if (modeFilter !== 'all') params.listType = modeFilter
      const res = await apiClient.get('/shipments', { params })
      return res.data.data || []
    },
    enabled: activeTab === 'shipments',
  })

  // Fetch Batches
  const {
    data: batchesData,
    isLoading: isBatchesLoading,
    refetch: refetchBatches,
    isRefetching: isRefetchingBatches,
  } = useQuery({
    queryKey: ['logistics-batches', search],
    queryFn: async () => {
      const params: any = { limit: 20 }
      if (search.trim()) params.search = search.trim()
      const res = await apiClient.get('/marking', { params })
      return res.data.data || []
    },
    enabled: activeTab === 'batches',
  })

  // Fetch Delivery Orders
  const {
    data: doData,
    isLoading: isDoLoading,
    refetch: refetchDo,
    isRefetching: isRefetchingDo,
  } = useQuery({
    queryKey: ['logistics-do', search],
    queryFn: async () => {
      const params: any = { limit: 20 }
      if (search.trim()) params.search = search.trim()
      const res = await apiClient.get('/delivery-orders', { params })
      return res.data.data || []
    },
    enabled: activeTab === 'delivery',
  })

  const isDark = mode === 'midnight'

  const handleBarcodeScanned = (barcode: string) => {
    setSearch(barcode)
    showToast(`Mencari data: ${barcode}`, 'info')
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#0B0F17' : '#F7F5F2' }]}>
      <View style={styles.container}>
        {/* Header Tabs */}
        <View style={styles.topSection}>
          <Text style={[styles.pageTitle, { color: colors.primary }]}>Logistik Lapangan</Text>
          <SegmentedControl
            options={[
              { label: 'Daftar Resi', value: 'shipments', icon: <Package size={14} color={colors.tertiary} /> },
              { label: 'Batch Marking', value: 'batches', icon: <Layers size={14} color="#8B5CF6" /> },
              { label: 'Surat Jalan', value: 'delivery', icon: <Truck size={14} color="#10B981" /> },
            ]}
            selectedValue={activeTab}
            onValueChange={(val) => {
              setActiveTab(val as any)
              setSearch('')
            }}
            style={{ marginTop: 10 }}
          />

          {/* Search bar with Camera Scan Icon */}
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder={
              activeTab === 'shipments'
                ? 'Cari resi, listcode, marking, customer...'
                : activeTab === 'batches'
                ? 'Cari nomor batch marking...'
                : 'Cari surat jalan, supir, plat...'
            }
            onScanPress={() => setScannerVisible(true)}
            style={{ marginTop: 10 }}
          />

          {/* Secondary filter for Shipments */}
          {activeTab === 'shipments' && (
            <View style={styles.filterPillRow}>
              {(['all', '1', '2'] as const).map((m) => {
                const isSelected = modeFilter === m
                const label = m === 'all' ? 'Semua' : m === '1' ? 'Udara' : 'Laut'
                return (
                  <TouchableOpacity
                    key={m}
                    activeOpacity={0.7}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      setModeFilter(m)
                    }}
                    style={[
                      styles.pillBtn,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? 'rgba(56, 189, 248, 0.15)'
                            : '#E0F2FE'
                          : colors.surface,
                        borderColor: isSelected ? colors.tertiary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        { color: isSelected ? colors.tertiary : colors.secondary },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        </View>

        {/* List Content */}
        {activeTab === 'shipments' && (
          <FlatList
            data={shipmentsData}
            keyExtractor={(item) => item.fdListCode || item.fdTerima || Math.random().toString()}
            refreshing={isRefetchingShipments}
            onRefresh={refetchShipments}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              isShipmentsLoading ? (
                <View style={{ gap: 10 }}>
                  <SkeletonShimmer height={90} />
                  <SkeletonShimmer height={90} />
                  <SkeletonShimmer height={90} />
                </View>
              ) : (
                <Card style={styles.emptyCard}>
                  <Text style={{ color: colors.secondary }}>Tidak ada shipment ditemukan</Text>
                </Card>
              )
            }
            renderItem={({ item }) => (
              <Card
                style={styles.itemCard}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setSelectedItem(item)
                }}
              >
                <View style={styles.itemHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: colors.primary }]}>
                      {item.fdTerima || item.fdListCode}
                    </Text>
                    <Text style={[styles.itemSub, { color: colors.secondary }]}>
                      Listcode: {item.fdListCode} • Marking: {item.fdMarkingNo || '—'}
                    </Text>
                  </View>
                  <Badge
                    label={item.fdListType === 1 ? 'Udara' : 'Laut'}
                    variant={item.fdListType === 1 ? 'air' : 'sea'}
                    icon={item.fdListType === 1 ? <Plane size={10} color="#38BDF8" /> : <Ship size={10} color="#818CF8" />}
                  />
                </View>
                <Text style={[styles.custName, { color: colors.primary }]} numberOfLines={1}>
                  {item.fdCustName || '—'}
                </Text>
                <View style={styles.metricsRow}>
                  <Text style={[styles.metricText, { color: colors.secondary }]}>
                    📦 {formatNumber(item.fdColy)} Koli
                  </Text>
                  <Text style={[styles.metricText, { color: colors.secondary }]}>
                    ⚖️ {formatDecimal(item.fdWeight, 1)} kg
                  </Text>
                  <Text style={[styles.metricText, { color: colors.secondary }]}>
                    📐 {formatDecimal(item.fdM3, 4)} m³
                  </Text>
                </View>
              </Card>
            )}
          />
        )}

        {activeTab === 'batches' && (
          <FlatList
            data={batchesData}
            keyExtractor={(item) => item.fdMarkingCode || Math.random().toString()}
            refreshing={isRefetchingBatches}
            onRefresh={refetchBatches}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              isBatchesLoading ? (
                <View style={{ gap: 10 }}>
                  <SkeletonShimmer height={80} />
                  <SkeletonShimmer height={80} />
                </View>
              ) : (
                <Card style={styles.emptyCard}>
                  <Text style={{ color: colors.secondary }}>Tidak ada batch marking</Text>
                </Card>
              )
            }
            renderItem={({ item }) => (
              <Card style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemTitle, { color: colors.primary }]}>
                    {item.fdMarkingCode}
                  </Text>
                  <Badge label={item.fdBranch || 'Pusat'} variant="neutral" />
                </View>
                <Text style={[styles.itemSub, { color: colors.secondary }]}>
                  {item.fdMarkingDesc || 'Batch Pengiriman Kontainer'}
                </Text>
                <View style={styles.metricsRow}>
                  <Text style={[styles.metricText, { color: colors.secondary }]}>
                    Tanggal: {formatDate(item.fdDate)}
                  </Text>
                  <Text style={[styles.metricText, { color: colors.secondary }]}>
                    ETA: {formatDate(item.fdExitDate)}
                  </Text>
                </View>
              </Card>
            )}
          />
        )}

        {activeTab === 'delivery' && (
          <FlatList
            data={doData}
            keyExtractor={(item) => item.fdDeliveryNo || item.id || Math.random().toString()}
            refreshing={isRefetchingDo}
            onRefresh={refetchDo}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              isDoLoading ? (
                <View style={{ gap: 10 }}>
                  <SkeletonShimmer height={80} />
                  <SkeletonShimmer height={80} />
                </View>
              ) : (
                <Card style={styles.emptyCard}>
                  <Text style={{ color: colors.secondary }}>Tidak ada surat jalan</Text>
                </Card>
              )
            }
            renderItem={({ item }) => (
              <Card style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemTitle, { color: colors.primary }]}>
                    {item.fdDeliveryNo}
                  </Text>
                  <Badge
                    label={item.fdStatus || 'Delivered'}
                    variant={item.fdStatus === 'Delivered' ? 'success' : 'warning'}
                  />
                </View>
                <Text style={[styles.custName, { color: colors.primary }]}>
                  {item.fdCustName || 'Customer'}
                </Text>
                <View style={styles.metricsRow}>
                  <Text style={[styles.metricText, { color: colors.secondary }]}>
                    Supir: {item.fdDriverName || '—'} ({item.fdPoliceNo || '—'})
                  </Text>
                  <Text style={[styles.metricText, { color: colors.secondary }]}>
                    {formatDate(item.fdDeliveryDate)}
                  </Text>
                </View>
              </Card>
            )}
          />
        )}

        {/* Barcode Scanner Modal */}
        <BarcodeScannerModal
          visible={scannerVisible}
          onClose={() => setScannerVisible(false)}
          onScanned={handleBarcodeScanned}
        />

        {/* Shipment Detail Bottom Sheet / Modal */}
        <Modal
          visible={Boolean(selectedItem)}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedItem(null)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.sheetContent,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Sheet Header */}
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={[styles.sheetTitle, { color: colors.primary }]}>
                    DETAIL SHIPMENT
                  </Text>
                  <Text style={[styles.sheetSubtitle, { color: colors.secondary }]}>
                    {selectedItem?.fdTerima || selectedItem?.fdListCode}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedItem(null)}
                  style={[styles.closeBtn, { borderColor: colors.border }]}
                >
                  <X size={18} color={colors.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
                {/* Identification Info */}
                <View style={styles.infoSection}>
                  <Text style={[styles.sectionHeading, { color: colors.tertiary }]}>
                    INFORMASI PENGIRIMAN
                  </Text>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.secondary }]}>Customer Master</Text>
                    <Text style={[styles.infoVal, { color: colors.primary }]}>
                      {selectedItem?.fdCustName || '—'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.secondary }]}>No. Listcode</Text>
                    <Text style={[styles.infoVal, { color: colors.primary }]}>
                      {selectedItem?.fdListCode || '—'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.secondary }]}>Marking No</Text>
                    <Text style={[styles.infoVal, { color: colors.primary }]}>
                      {selectedItem?.fdMarkingNo || '—'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.secondary }]}>Moda / Cabang</Text>
                    <Text style={[styles.infoVal, { color: colors.primary }]}>
                      {selectedItem?.fdListType === 1 ? 'Udara' : 'Laut'} • {selectedItem?.fdBranch || '—'}
                    </Text>
                  </View>
                </View>

                {/* Physical Dimensions */}
                <View style={styles.infoSection}>
                  <Text style={[styles.sectionHeading, { color: colors.tertiary }]}>
                    UKURAN FISIK GUDANG
                  </Text>
                  <View style={styles.dimensionGrid}>
                    <View style={styles.dimCard}>
                      <Text style={[styles.dimLabel, { color: colors.secondary }]}>Coly</Text>
                      <Text style={[styles.dimVal, { color: colors.primary }]}>
                        {formatNumber(selectedItem?.fdColy)}
                      </Text>
                    </View>
                    <View style={styles.dimCard}>
                      <Text style={[styles.dimLabel, { color: colors.secondary }]}>Berat</Text>
                      <Text style={[styles.dimVal, { color: colors.primary }]}>
                        {formatDecimal(selectedItem?.fdWeight, 1)} kg
                      </Text>
                    </View>
                    <View style={styles.dimCard}>
                      <Text style={[styles.dimLabel, { color: colors.secondary }]}>Volume</Text>
                      <Text style={[styles.dimVal, { color: colors.primary }]}>
                        {formatDecimal(selectedItem?.fdM3, 4)} m³
                      </Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  topSection: {
    padding: 16,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  filterPillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  pillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    gap: 10,
  },
  itemCard: {
    padding: 14,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  custName: {
    fontSize: 13,
    fontWeight: '600',
    marginVertical: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 6,
  },
  metricText: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sheetSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoSection: {
    gap: 8,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 12,
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '600',
  },
  dimensionGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  dimCard: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  dimLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  dimVal: {
    fontSize: 14,
    fontWeight: '700',
  },
})
