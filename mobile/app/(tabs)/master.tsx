import React, { useState, useRef } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Keyboard,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Card } from '../../src/components/ui/Card'
import { SearchBar } from '../../src/components/ui/SearchBar'
import { SkeletonShimmer } from '../../src/components/ui/SkeletonShimmer'
import { SearchSuggestionsDropdown } from '../../src/components/ui/SearchSuggestionsDropdown'
import { useThemeStore } from '../../src/theme/themeStore'
import { useTranslation } from '../../src/hooks/useTranslation'
import { useDebounce } from '../../src/hooks/useDebounce'
import apiClient from '../../src/api/client'
import { useMasterCustomersQuery } from '../../src/features/master/hooks/useMasterCustomers'
import { CustomerListItem } from '../../src/features/master/components/CustomerListItem'
import { CustomerDetailSheet } from '../../src/features/master/components/CustomerDetailSheet'

export default function MasterDataScreen() {
  const { colors, mode } = useThemeStore()
  const { t } = useTranslation()
  const isDark = mode === 'midnight'

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)
  const onEndReachedCalledDuringMomentum = useRef(true)

  // Fetch Suggestions untuk Customer
  const { data: suggestions = [], isFetching: isFetchingSuggestions } = useQuery({
    queryKey: ['customer-suggestions', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.trim().length < 2) return []
      const res = await apiClient.get('/customers/suggestions', {
        params: { q: debouncedSearch.trim() },
      })
      return res.data.data || []
    },
    enabled: debouncedSearch.trim().length >= 2,
    staleTime: 30000,
  })

  // Infinite Query Fetch Customers List via Hook Teruji
  const customers = useMasterCustomersQuery(debouncedSearch)

  const handleEndReached = () => {
    if (!onEndReachedCalledDuringMomentum.current && customers.hasNextPage && !customers.isFetchingNextPage) {
      customers.fetchNextPage()
      onEndReachedCalledDuringMomentum.current = true
    }
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: isDark ? '#0B0F17' : '#F7F5F2' }]}>
      <View style={styles.container}>
        {/* Header Bersih Gaya Dashboard */}
        <View style={styles.topSection}>
          <Text style={[styles.overlineText, { color: colors.secondary }]}>
            Master data
          </Text>
          <Text style={[styles.pageTitle, { color: colors.primary }]}>
            {t('master.title', 'Direktori pelanggan')}
          </Text>
          <Text style={[styles.pageSub, { color: colors.secondary }]}>
            Daftar pelanggan resmi & kontak langsung
          </Text>

          <SearchBar
            value={search}
            debounceMs={0}
            onChangeText={(txt) => {
              setSearch(txt)
              if (txt.trim().length >= 2) {
                setShowSuggestions(true)
              } else {
                setShowSuggestions(false)
              }
            }}
            onFocus={() => {
              if (search.trim().length >= 2) {
                setShowSuggestions(true)
              }
            }}
            placeholder={t('master.searchPlaceholder', 'Cari nama customer, kode, kota, sales...')}
            style={{ marginTop: 12 }}
          />

          <SearchSuggestionsDropdown
            visible={showSuggestions && search.trim().length >= 2}
            suggestions={suggestions}
            isLoading={isFetchingSuggestions}
            title={t('master.suggestions', 'Saran Pelanggan')}
            onSelect={(sug) => {
              Keyboard.dismiss()
              setSearch(sug.value)
              setShowSuggestions(false)
            }}
            onClose={() => setShowSuggestions(false)}
          />
        </View>

        {/* Customer List */}
        <FlatList
          data={customers.data}
          keyExtractor={(item, index) => `${item.fdCustCode || item.id || 'cust'}-${index}`}
          refreshing={customers.isRefetching}
          onRefresh={customers.refetch}
          contentContainerStyle={styles.listContent}
          onMomentumScrollBegin={() => {
            onEndReachedCalledDuringMomentum.current = false
          }}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={10}
          ListFooterComponent={
            customers.isFetchingNextPage ? (
              <ActivityIndicator
                size="small"
                color={colors.tertiary || '#E0644E'}
                style={{ paddingVertical: 18 }}
              />
            ) : customers.hasNextPage ? (
              <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: colors.secondary }}>
                  Memuat pelanggan lainnya...
                </Text>
              </View>
            ) : customers.data.length > 0 ? (
              <View style={{ paddingVertical: 18, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: colors.secondary, opacity: 0.7 }}>
                  Semua {customers.data.length} pelanggan telah dimuat
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            customers.isLoading ? (
              <View style={{ gap: 10 }}>
                <SkeletonShimmer height={110} />
                <SkeletonShimmer height={110} />
                <SkeletonShimmer height={110} />
              </View>
            ) : (
              <Card style={styles.emptyCard}>
                <Text style={{ color: colors.secondary }}>{t('master.noCustomers', 'Tidak ada pelanggan ditemukan')}</Text>
              </Card>
            )
          }
          renderItem={({ item }) => (
            <CustomerListItem
              item={item}
              onPress={(cust) => setSelectedCustomer(cust)}
            />
          )}
        />

        {/* Customer Detail Bottom Sheet */}
        <CustomerDetailSheet
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
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
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
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
  pageSub: {
    fontSize: 13,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 28,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 30,
  },
})
