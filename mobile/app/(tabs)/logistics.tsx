import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { Card } from '../../src/components/ui/Card'
import { ErrorRetryCard } from '../../src/components/ui/ErrorRetryCard'
import { SearchBar } from '../../src/components/ui/SearchBar'
import { SkeletonShimmer } from '../../src/components/ui/SkeletonShimmer'
import { SearchSuggestionsDropdown } from '../../src/components/ui/SearchSuggestionsDropdown'
import { BarcodeScannerModal } from '../../src/components/scanner/BarcodeScannerModal'
import { ContainerScannerModal } from '../../src/components/scanner/ContainerScannerModal'
import { Receipt, Tag, Truck, ClipboardList, Pencil } from 'lucide-react-native'
import { useThemeStore } from '../../src/theme/themeStore'
import { useToastStore } from '../../src/stores/toastStore'
import { useTranslation } from '../../src/hooks/useTranslation'
import { useShipmentsQuery } from '../../src/features/logistics/hooks/useShipments'
import { useBatchesQuery } from '../../src/features/logistics/hooks/useBatches'
import { useDeliveryOrdersQuery } from '../../src/features/logistics/hooks/useDeliveryOrders'
import { ShipmentListItem } from '../../src/features/logistics/components/ShipmentListItem'
import { BatchListItem } from '../../src/features/logistics/components/BatchListItem'
import { DeliveryListItem } from '../../src/features/logistics/components/DeliveryListItem'
import { ShipmentDetailSheet } from '../../src/features/logistics/components/ShipmentDetailSheet'
import { BatchManifestSheet } from '../../src/features/logistics/components/BatchManifestSheet'
import { InspectionTab } from '../../src/features/inspection/components/InspectionTab'
import { InspectionFormSheet } from '../../src/features/inspection/components/InspectionFormSheet'
import { useInspectionMutations } from '../../src/features/inspection/hooks/useInspectionMutations'
import { useAuthStore } from '../../src/stores/authStore'
import { canManageDataRevisions, canManageBatchExitDate, canManageInspectionReports } from '../../src/lib/permissions'
import { useDebounce } from '../../src/hooks/useDebounce'
import { DataRevisionsTab } from '../../src/features/data-revisions/components/DataRevisionsTab'
import { BatchExitDateModal } from '../../src/features/logistics/components/BatchExitDateModal'
import apiClient from '../../src/api/client'



const LOGISTICS_TABS = [
  { key: 'shipments', label: 'Resi', icon: Receipt },
  { key: 'batches', label: 'Marking', icon: Tag },
  { key: 'delivery', label: 'Surat Jalan', icon: Truck },
  { key: 'inspection', label: 'BAP', icon: ClipboardList },
  { key: 'revisions', label: 'Revisi', icon: Pencil },
] as const

export default function LogisticsScreen() {
  const { user } = useAuthStore()
  const { colors, mode } = useThemeStore()
  const { showToast } = useToastStore()
  const { t } = useTranslation()
  const canAccessRevisions = canManageDataRevisions(user)
  const canAccessInspection = canManageInspectionReports(user)
  const canEditExitDate = canManageBatchExitDate(user)
  const params = useLocalSearchParams<{
    tab?: string
    initialTab?: string
    search?: string
    markingCode?: string
    batchCode?: string
    batchData?: string
    t?: string
  }>()

  const [activeTab, setActiveTab] = useState<'shipments' | 'batches' | 'delivery' | 'inspection' | 'revisions'>('shipments')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [modeFilter, setModeFilter] = useState<'all' | '1' | '2'>('all')
  const [scannerVisible, setScannerVisible] = useState(false)
  const [containerScannerVisible, setContainerScannerVisible] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null)
  const [batchForExitDate, setBatchForExitDate] = useState<any | null>(null)

  // BAP from shipment state
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

  const isDark = mode === 'midnight'

  useEffect(() => {
    const target = params.tab || params.initialTab
    if (target === 'revisions' && !canAccessRevisions) {
      setActiveTab('shipments')
    } else if (target === 'inspection' && !canAccessInspection) {
      setActiveTab('shipments')
    } else if (
      target === 'batches' ||
      target === 'shipments' ||
      target === 'delivery' ||
      (target === 'inspection' && canAccessInspection) ||
      (target === 'revisions' && canAccessRevisions)
    ) {
      setActiveTab(target)
      setModeFilter('all')
      setSearch(params.search || '')
    }

    if (params.batchData) {
      try {
        const parsed = JSON.parse(params.batchData)
        setSelectedBatch(parsed)
      } catch {
        if (params.markingCode || params.batchCode) {
          const code = (params.markingCode || params.batchCode)!.trim()
          setSelectedBatch({ fdMarkingCode: code })
        }
      }
    } else if (params.markingCode || params.batchCode) {
      const code = (params.markingCode || params.batchCode)!.trim()
      setSelectedBatch({ fdMarkingCode: code })
    }
  }, [params.tab, params.initialTab, params.markingCode, params.batchCode, params.batchData, params.search, params.t])

  // Suggestions
  const suggestionEndpoint =
    activeTab === 'shipments'
      ? '/shipments/suggestions'
      : activeTab === 'batches'
      ? '/marking/suggestions'
      : '/delivery-orders/suggestions'

  const { data: suggestions = [], isFetching: isFetchingSuggestions } = useQuery({
    queryKey: ['logistics-suggestions', activeTab, debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.trim().length < 2) return []
      const res = await apiClient.get(suggestionEndpoint, { params: { q: debouncedSearch.trim() } })
      return res.data.data || []
    },
    enabled:
      activeTab !== 'inspection' &&
      activeTab !== 'revisions' &&
      debouncedSearch.trim().length >= 2,
    staleTime: 30000,
  })

  // Data queries via custom hooks
  const shipments = useShipmentsQuery(debouncedSearch, modeFilter, activeTab === 'shipments')
  const batches = useBatchesQuery(debouncedSearch, modeFilter, activeTab === 'batches')
  const deliveryOrders = useDeliveryOrdersQuery(debouncedSearch, activeTab === 'delivery')

  const handleBarcodeScanned = (code: string) => {
    setSearch(code)
    setScannerVisible(false)
    showToast(`Scanned: ${code}`, 'info')
  }

  const handleContainerScanned = (containerNo: string) => {
    setActiveTab('batches')
    setModeFilter('all')
    setSearch(containerNo)
    setContainerScannerVisible(false)
    showToast(`Kontainer: ${containerNo}`, 'info')
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.neutral }]}>
      <View style={styles.container}>
        {/* Header Bersih Gaya Dashboard */}
        <View style={styles.topSection}>
          <Text style={[styles.overlineText, { color: colors.secondary }]}>
            Modul operasional
          </Text>
          <Text style={[styles.pageTitle, { color: colors.primary }]}>
            {t('logistics.title', 'Logistik lapangan')}
          </Text>

          {/* Tab Strip Editorial (Teks Bersih, Underline 2px Aksen Bata) */}
          <View
            style={[
              styles.tabBarContainer,
              { borderBottomColor: isDark ? '#222C38' : '#E3E7EC' },
            ]}
          >
            {LOGISTICS_TABS.filter((tab) => {
              if (tab.key === 'revisions') return canAccessRevisions
              if (tab.key === 'inspection') return canAccessInspection
              return true
            }).map((tab) => {
              const isActive = activeTab === tab.key

              return (
                <TouchableOpacity
                  key={tab.key}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.selectionAsync()
                    setActiveTab(tab.key as any)
                    setSearch('')
                    setModeFilter('all')
                  }}
                  style={styles.tabItem}
                >
                  <Text
                    style={[
                      styles.tabLabel,
                      {
                        color: isActive ? colors.primary : colors.secondary,
                        fontWeight: isActive ? '600' : '500',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Text>
                  {isActive ? (
                    <View style={styles.activeIndicator} />
                  ) : (
                    <View style={styles.inactiveIndicatorPlaceholder} />
                  )}
                </TouchableOpacity>
              )
            })}
          </View>

          {activeTab !== 'inspection' && activeTab !== 'revisions' && (
            <>
              <SearchBar
                value={search}
                debounceMs={0}
                onChangeText={(txt) => {
                  setSearch(txt)
                  setShowSuggestions(txt.trim().length >= 2)
                }}
                onFocus={() => {
                  if (search.trim().length >= 2) setShowSuggestions(true)
                }}
                placeholder={
                  activeTab === 'shipments'
                    ? t('logistics.searchShipmentPlaceholder', 'Cari resi, customer, marking code/no...')
                    : activeTab === 'batches'
                    ? t('logistics.searchBatchPlaceholder', 'Cari nomor batch marking...')
                    : t('logistics.searchDeliveryPlaceholder', 'Cari surat jalan, supir, plat...')
                }
                onScanPress={
                  activeTab === 'shipments'
                    ? () => setScannerVisible(true)
                    : undefined
                }
                onScanContainerPress={
                  activeTab === 'batches'
                    ? () => setContainerScannerVisible(true)
                    : undefined
                }
                style={{ marginTop: 10 }}
              />

              <SearchSuggestionsDropdown
                visible={showSuggestions && search.trim().length >= 2}
                suggestions={suggestions}
                isLoading={isFetchingSuggestions}
                title={
                  activeTab === 'shipments'
                    ? t('logistics.suggestionsShipment', 'Saran Pencarian (Resi / Cust / Marking)')
                    : activeTab === 'batches'
                    ? t('logistics.suggestionsBatch', 'Saran Pencarian (Marking / Kontainer / BL)')
                    : t('logistics.suggestionsDelivery', 'Saran Pencarian (Surat Jalan / Supir / Plat)')
                }
                onSelect={(sug) => {
                  Keyboard.dismiss()
                  setSearch(sug.value)
                  setShowSuggestions(false)
                }}
                onClose={() => setShowSuggestions(false)}
              />

              {/* Mode Filter Pills */}
              {(activeTab === 'shipments' || activeTab === 'batches') && (
                <View style={styles.filterPillRow}>
                  {(['all', '1', '2'] as const).map((m) => {
                    const isSelected = modeFilter === m
                    const label = m === 'all' ? t('common.all', 'Semua') : m === '1' ? t('common.air', 'Udara') : t('common.sea', 'Laut')
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
                              ? isDark ? 'rgba(56, 189, 248, 0.15)' : '#E0F2FE'
                              : colors.surface,
                            borderColor: isSelected ? colors.tertiary : colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.pillText, { color: isSelected ? colors.tertiary : colors.secondary }]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}
            </>
          )}
        </View>

        {/* Shipments List */}
        {activeTab === 'shipments' && (
          <FlatList
            data={shipments.data}
            keyExtractor={(item, index) => `${item.fdListCode || item.fdTerima || 'ship'}-${index}`}
            refreshing={shipments.isRefetching}
            onRefresh={shipments.refetch}
            onEndReached={() => { if (shipments.hasNextPage && !shipments.isFetchingNextPage) shipments.fetchNextPage() }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              shipments.isFetchingNextPage ? (
                <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.tertiary} />
                </View>
              ) : null
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              shipments.isLoading ? (
                <View style={{ gap: 10 }}>
                  <SkeletonShimmer height={90} />
                  <SkeletonShimmer height={90} />
                  <SkeletonShimmer height={90} />
                </View>
              ) : shipments.isError ? (
                <ErrorRetryCard
                  onRetry={() => shipments.refetch()}
                  isRetrying={shipments.isRefetching}
                />
              ) : (
                <Card style={styles.emptyCard}>
                  <Text style={{ color: colors.secondary }}>{t('logistics.noShipments', 'Tidak ada data resi pengiriman')}</Text>
                </Card>
              )
            }
            renderItem={({ item }) => (
              <ShipmentListItem
                item={item}
                onPress={(it) => setSelectedItem(it)}
                onCreateBap={canAccessInspection ? handleCreateBapFromShipment : undefined}
              />
            )}
          />
        )}

        {/* Batches List */}
        {activeTab === 'batches' && (
          <FlatList
            data={batches.data}
            keyExtractor={(item, index) => `${item.fdMarkingCode || 'batch'}-${index}`}
            refreshing={batches.isRefetching}
            onRefresh={batches.refetch}
            onEndReached={() => { if (batches.hasNextPage && !batches.isFetchingNextPage) batches.fetchNextPage() }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              batches.isFetchingNextPage ? (
                <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.tertiary} />
                </View>
              ) : null
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              batches.isLoading ? (
                <View style={{ gap: 10 }}>
                  <SkeletonShimmer height={80} />
                  <SkeletonShimmer height={80} />
                </View>
              ) : batches.isError ? (
                <ErrorRetryCard
                  onRetry={() => batches.refetch()}
                  isRetrying={batches.isRefetching}
                />
              ) : (
                <Card style={styles.emptyCard}>
                  <Text style={{ color: colors.secondary, textAlign: 'center' }}>
                    {modeFilter !== 'all'
                      ? `${t('logistics.noBatches', 'Tidak ada batch')} (${modeFilter === '1' ? t('common.air', 'Udara') : t('common.sea', 'Laut')}).`
                      : t('logistics.noBatches', 'Tidak ada batch marking ditemukan')}
                  </Text>
                  {modeFilter !== 'all' && (
                    <TouchableOpacity
                      onPress={() => setModeFilter('all')}
                      style={{
                        marginTop: 8, paddingVertical: 6, paddingHorizontal: 12,
                        borderRadius: 8, borderWidth: 1, borderColor: colors.tertiary, alignSelf: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 11, color: colors.tertiary, fontWeight: '700' }}>
                        {t('common.all', 'Semua')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </Card>
              )
            }
            renderItem={({ item }) => (
              <BatchListItem
                item={item}
                onPress={(it) => setSelectedBatch(it)}
                onEditExitDate={canEditExitDate ? (it) => setBatchForExitDate(it) : undefined}
              />
            )}
          />
        )}

        {/* Delivery Orders List */}
        {activeTab === 'delivery' && (
          <FlatList
            data={deliveryOrders.data}
            keyExtractor={(item, index) => `${item.fdSJNo || item.fdDeliveryNo || item.id || 'do'}-${index}`}
            refreshing={deliveryOrders.isRefetching}
            onRefresh={deliveryOrders.refetch}
            onEndReached={() => { if (deliveryOrders.hasNextPage && !deliveryOrders.isFetchingNextPage) deliveryOrders.fetchNextPage() }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              deliveryOrders.isFetchingNextPage ? (
                <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.tertiary} />
                </View>
              ) : null
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              deliveryOrders.isLoading ? (
                <View style={{ gap: 10 }}>
                  <SkeletonShimmer height={80} />
                  <SkeletonShimmer height={80} />
                </View>
              ) : deliveryOrders.isError ? (
                <ErrorRetryCard
                  onRetry={() => deliveryOrders.refetch()}
                  isRetrying={deliveryOrders.isRefetching}
                />
              ) : (
                <Card style={styles.emptyCard}>
                  <Text style={{ color: colors.secondary }}>{t('logistics.noDelivery', 'Tidak ada surat jalan')}</Text>
                </Card>
              )
            }
            renderItem={({ item }) => <DeliveryListItem item={item} />}
          />
        )}

        {/* Inspection Reports (BAP) */}
        {activeTab === 'inspection' && <InspectionTab />}

        {/* Form Input & Revisi Data */}
        {activeTab === 'revisions' && <DataRevisionsTab />}

        {/* Barcode Scanner Modal */}
        <BarcodeScannerModal
          visible={scannerVisible}
          onClose={() => setScannerVisible(false)}
          onScanned={handleBarcodeScanned}
        />

        {/* Container Scanner Modal */}
        <ContainerScannerModal
          visible={containerScannerVisible}
          onClose={() => setContainerScannerVisible(false)}
          onScanned={handleContainerScanned}
        />

        {/* Shipment Detail Sheet */}
        <ShipmentDetailSheet
          selectedItem={selectedItem}
          onClose={() => setSelectedItem(null)}
          onCreateBap={canAccessInspection ? handleCreateBapFromShipment : undefined}
        />

        {/* Batch Manifest Sheet */}
        <BatchManifestSheet
          selectedBatch={selectedBatch}
          onClose={() => setSelectedBatch(null)}
          setSelectedBatch={setSelectedBatch}
          onCreateBap={canAccessInspection ? handleCreateBapFromShipment : undefined}
        />

        {/* Create BAP from Resi Modal */}
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
      </View>
    </SafeAreaView>
  )
}


const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  topSection: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  overlineText: {
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 2,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    marginTop: 10,
    marginBottom: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 13.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#E0644E',
  },
  inactiveIndicatorPlaceholder: {
    height: 2,
    width: '100%',
    backgroundColor: 'transparent',
  },
  filterPillRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  pillBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillText: { fontSize: 13, fontVariant: ['tabular-nums'] },
  listContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 28 },
  emptyCard: { alignItems: 'center', padding: 30 },
})
