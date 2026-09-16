import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { Card } from '../../src/components/ui/Card'
import { SearchBar } from '../../src/components/ui/SearchBar'
import { SegmentedControl } from '../../src/components/ui/SegmentedControl'
import { SkeletonShimmer } from '../../src/components/ui/SkeletonShimmer'
import { SearchSuggestionsDropdown } from '../../src/components/ui/SearchSuggestionsDropdown'
import { BarcodeScannerModal } from '../../src/components/scanner/BarcodeScannerModal'
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
import { useDebounce } from '../../src/hooks/useDebounce'
import apiClient from '../../src/api/client'

export default function LogisticsScreen() {
  const { colors, mode } = useThemeStore()
  const { showToast } = useToastStore()
  const { t } = useTranslation()
  const params = useLocalSearchParams<{
    tab?: string
    initialTab?: string
    search?: string
    markingCode?: string
    batchCode?: string
    batchData?: string
    t?: string
  }>()

  const [activeTab, setActiveTab] = useState<'shipments' | 'batches' | 'delivery'>('shipments')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [modeFilter, setModeFilter] = useState<'all' | '1' | '2'>('all')
  const [scannerVisible, setScannerVisible] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null)

  const isDark = mode === 'midnight'

  useEffect(() => {
    const target = params.tab || params.initialTab
    if (target === 'batches' || target === 'shipments' || target === 'delivery') {
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
    enabled: debouncedSearch.trim().length >= 2,
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.neutral }]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.topSection}>
          <Text style={[styles.pageTitle, { color: colors.primary }]}>
            {t('logistics.title', 'Logistik Lapangan')}
          </Text>
          <SegmentedControl
            options={[
              { label: t('logistics.shipments', 'Daftar Resi'), value: 'shipments' },
              { label: t('logistics.batches', 'Batch Marking'), value: 'batches' },
              { label: t('logistics.delivery', 'Surat Jalan'), value: 'delivery' },
            ]}
            selectedValue={activeTab}
            onValueChange={(val) => {
              setActiveTab(val as any)
              setSearch('')
              setModeFilter('all')
            }}
            style={{ marginTop: 10 }}
          />

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
            onScanPress={() => setScannerVisible(true)}
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
              <BatchListItem item={item} onPress={(it) => setSelectedBatch(it)} />
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
              ) : (
                <Card style={styles.emptyCard}>
                  <Text style={{ color: colors.secondary }}>{t('logistics.noDelivery', 'Tidak ada surat jalan')}</Text>
                </Card>
              )
            }
            renderItem={({ item }) => <DeliveryListItem item={item} />}
          />
        )}

        {/* Barcode Scanner Modal */}
        <BarcodeScannerModal
          visible={scannerVisible}
          onClose={() => setScannerVisible(false)}
          onScanned={handleBarcodeScanned}
        />

        {/* Shipment Detail Sheet */}
        <ShipmentDetailSheet
          selectedItem={selectedItem}
          onClose={() => setSelectedItem(null)}
        />

        {/* Batch Manifest Sheet */}
        <BatchManifestSheet
          selectedBatch={selectedBatch}
          onClose={() => setSelectedBatch(null)}
          setSelectedBatch={setSelectedBatch}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  topSection: { padding: 16, paddingBottom: 8 },
  pageTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  filterPillRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  pillBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  pillText: { fontSize: 12, fontWeight: '600' },
  listContent: { padding: 16, paddingTop: 8, paddingBottom: 28, gap: 10 },
  emptyCard: { alignItems: 'center', padding: 30 },
})
