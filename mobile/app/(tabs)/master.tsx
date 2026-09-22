import React, { useState } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Keyboard,
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

  // Fetch Customers List
  const {
    data: customersData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['master-customers', debouncedSearch],
    queryFn: async () => {
      const params: any = { limit: 30 }
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
      const res = await apiClient.get('/customers', { params })
      return res.data.data || []
    },
  })

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: isDark ? '#0B0F17' : '#F7F5F2' }]}>
      <View style={styles.container}>
        {/* Header Section */}
        <View style={styles.topSection}>
          <Text style={[styles.pageTitle, { color: colors.primary }]}>
            {t('master.title', 'Direktori Pelanggan')}
          </Text>
          <Text style={[styles.pageSub, { color: colors.secondary }]}>
            Master data pelanggan resmi & kontak langsung
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
          data={customersData}
          keyExtractor={(item) => item.fdCustCode || item.id || Math.random().toString()}
          refreshing={isRefetching}
          onRefresh={refetch}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            isLoading ? (
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
    padding: 16,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  pageSub: {
    fontSize: 12,
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 12,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 30,
  },
})
