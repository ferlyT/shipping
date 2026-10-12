import React, { useState, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Keyboard,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import * as Haptics from 'expo-haptics'
import { X, User, Search, Receipt, CheckCircle2, Calculator } from 'lucide-react-native'
import { Card } from '../../src/components/ui/Card'
import { Badge } from '../../src/components/ui/Badge'
import { ErrorRetryCard } from '../../src/components/ui/ErrorRetryCard'
import { SearchBar } from '../../src/components/ui/SearchBar'
import { SegmentedControl } from '../../src/components/ui/SegmentedControl'
import { SkeletonShimmer } from '../../src/components/ui/SkeletonShimmer'
import { SearchSuggestionsDropdown } from '../../src/components/ui/SearchSuggestionsDropdown'
import { useAuthStore } from '../../src/stores/authStore'
import { useThemeStore } from '../../src/theme/themeStore'
import { useToastStore } from '../../src/stores/toastStore'
import { useTranslation } from '../../src/hooks/useTranslation'
import { canViewBillingValidation } from '../../src/lib/permissions'
import { formatCurrency, formatNumber, formatDecimal, formatDate, displayCustName, copyToClipboard } from '../../src/lib/utils'
import { BillingListItem } from '../../src/features/finance/components/BillingListItem'
import { ValidationListItem } from '../../src/features/finance/components/ValidationListItem'
import { InvoiceDetailSheet } from '../../src/features/finance/components/InvoiceDetailSheet'
import { BillingAttachmentSheet } from '../../src/features/finance/components/BillingAttachmentSheet'
import { useBillingsQuery } from '../../src/features/finance/hooks/useBillings'
import { useDebounce } from '../../src/hooks/useDebounce'
import apiClient from '../../src/api/client'

const FINANCE_TABS = [
  { key: 'billing', label: 'Invoice', icon: Receipt, permissionCheck: false },
  { key: 'validation', label: 'Validasi', icon: CheckCircle2, permissionCheck: true },
  { key: 'priceLookup', label: 'Cek Tarif', icon: Calculator, permissionCheck: false },
] as const

export default function FinanceScreen() {
  const routeParams = useLocalSearchParams<{ tab?: string; search?: string; t?: string }>()
  const { user } = useAuthStore()
  const { colors, mode } = useThemeStore()
  const { showToast } = useToastStore()
  const { t } = useTranslation()
  const isDark = mode === 'midnight'
  const canAuditValidation = canViewBillingValidation(user)

  const [activeTab, setActiveTab] = useState<'billing' | 'validation' | 'priceLookup'>('billing')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (routeParams.tab === 'validation' || routeParams.tab === 'billing' || routeParams.tab === 'priceLookup') {
      setActiveTab(routeParams.tab)
    }
    if (routeParams.search !== undefined) {
      setSearch(routeParams.search)
    }
  }, [routeParams.tab, routeParams.search, routeParams.t])
  const debouncedSearch = useDebounce(search, 300)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)
  const [attachmentInvoice, setAttachmentInvoice] = useState<{ invNo: string; custName?: string } | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)

  // Price Lookup states
  const [lookupSubTab, setLookupSubTab] = useState<'master' | 'customer'>('master')
  const [lookupMode, setLookupMode] = useState<'all' | 'BY AIR' | 'BY SEA'>('all')
  const [lookupBranch, setLookupBranch] = useState<string>('ALL')
  const [entryLookupQuery, setEntryLookupQuery] = useState('')
  const [entryLookupResult, setEntryLookupResult] = useState<any | null>(null)
  const [isEntryLoading, setIsEntryLoading] = useState(false)
  const [selectedCustCode, setSelectedCustCode] = useState('')
  const [selectedCustName, setSelectedCustName] = useState('')
  const [custSearchQuery, setCustSearchQuery] = useState('')
  const debouncedCustSearchQuery = useDebounce(custSearchQuery, 300)
  const [showCustDropdown, setShowCustDropdown] = useState(false)

  // Suggestions
  const { data: suggestions = [], isFetching: isFetchingSuggestions } = useQuery({
    queryKey: ['finance-suggestions', activeTab, debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.trim().length < 2) return []
      const params: Record<string, string> = { q: debouncedSearch.trim() }
      if (activeTab === 'validation') {
        params.draftOnly = 'true'
      }
      const res = await apiClient.get('/billing/suggestions', { params })
      return res.data.data || []
    },
    enabled: activeTab !== 'priceLookup' && debouncedSearch.trim().length >= 2,
    staleTime: 30000,
  })

  // Customer autocomplete
  const { data: custSuggestions = [] } = useQuery({
    queryKey: ['finance-cust-suggestions', debouncedCustSearchQuery],
    queryFn: async () => {
      if (!debouncedCustSearchQuery || debouncedCustSearchQuery.trim().length < 2) return []
      const res = await apiClient.get('/customers/suggestions', { params: { q: debouncedCustSearchQuery.trim() } })
      return res.data.data || []
    },
    enabled: activeTab === 'priceLookup' && lookupSubTab === 'customer' && debouncedCustSearchQuery.trim().length >= 2,
    staleTime: 30000,
  })

  // Billing data via Infinite Query
  const billings = useBillingsQuery(debouncedSearch, activeTab === 'billing')

  // Validation data
  const { data: rawValidationData, isLoading: isValLoading, refetch: refetchVal, isRefetching: isRefetchingVal, isError: isValError } = useQuery({
    queryKey: ['finance-validation', debouncedSearch],
    queryFn: async () => {
      const params: any = { hasAmount: 'true', draftOnly: 'true', noPagination: 'true', minYear: '2023' }
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
      const res = await apiClient.get('/billing', { params })
      return res.data.data || []
    },
    enabled: activeTab === 'validation',
  })

  const validationData = useMemo(() => {
    return (rawValidationData || []).filter((b: any) => {
      if (b.fdInvDate) {
        const year = new Date(b.fdInvDate).getFullYear()
        if (!isNaN(year) && year <= 2022) return false
      }
      const amt1 = Number(b.fdJumlah1 || 0)
      const amt2 = Number(b.fdJumlah2 || 0)
      if (amt1 <= 0 && amt2 <= 0) return false
      const isDraft = (b.fdGive ?? 0) !== 1 && (b.fdGive2 ?? 0) !== 1 && !b.fdCekDate
      return isDraft
    })
  }, [rawValidationData])

  // Master Price List
  const { data: masterPriceList = [], isLoading: isMasterLoading } = useQuery({
    queryKey: ['finance-master-price-list', lookupMode, lookupBranch],
    queryFn: async () => {
      const params: any = {}
      if (lookupMode !== 'all') params.mode = lookupMode
      if (lookupBranch !== 'ALL') params.branch = lookupBranch
      const res = await apiClient.get('/price-list/lookup', { params })
      return res.data.data?.items || []
    },
    enabled: activeTab === 'priceLookup' && lookupSubTab === 'master',
  })

  // Customer Price List
  const { data: customerPriceList = [], isLoading: isCustPriceLoading } = useQuery({
    queryKey: ['finance-cust-price-list', selectedCustCode, lookupMode],
    queryFn: async () => {
      if (!selectedCustCode) return []
      const params: any = { custCode: selectedCustCode }
      if (lookupMode !== 'all') params.mode = lookupMode
      const res = await apiClient.get('/customer-price-list/lookup', { params })
      return res.data.data?.items || []
    },
    enabled: activeTab === 'priceLookup' && lookupSubTab === 'customer' && Boolean(selectedCustCode),
  })

  const handleEntryLookup = async () => {
    const q = entryLookupQuery.trim()
    if (!q) { showToast('Masukkan nomor resi / list code', 'warning'); return }
    try {
      setIsEntryLoading(true)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      const res = await apiClient.get('/price-list/lookup-by-entry', { params: { listCode: q } })
      setEntryLookupResult(res.data.data || null)
      if (!res.data.data?.found) showToast('Tarif master untuk data ini tidak ditemukan', 'info')
    } catch {
      showToast('Gagal mencari tarif data pengiriman', 'error')
    } finally {
      setIsEntryLoading(false)
    }
  }

  const copyInvoiceNo = async (invNo: string) => {
    if (!invNo) return
    await copyToClipboard(invNo)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    showToast(`No. Invoice ${invNo} berhasil disalin`, 'success')
  }

  const handlePrintShare = async (inv: any) => {
    try {
      setIsPrinting(true)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      const invCust = displayCustName(inv.customer?.fdCustName || inv.fdCustName || inv.fdBillTo || '—')
      const totalAmount = Number(inv.fdJumlah2 || 0) > 0 ? inv.fdJumlah2 : (inv.totalJumlah ?? inv.fdTotalAmount ?? inv.fdJumlah1 ?? 0)
      const itemsHtml = Array.isArray(inv.details) && inv.details.length > 0
        ? `<table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:12px;">
            <thead>
              <tr style="border-bottom:1.5px solid #333;text-align:left;background:#f5f5f5;">
                <th style="padding:6px 8px;">Deskripsi Item</th>
                <th style="padding:6px 8px;text-align:right;">Qty</th>
                <th style="padding:6px 8px;text-align:right;">Harga Satuan</th>
                <th style="padding:6px 8px;text-align:right;">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              ${inv.details.map((d: any) => `
                <tr style="border-bottom:1px solid #e5e5e5;">
                  <td style="padding:6px 8px;font-weight:600;">${d.fdItemName || '—'}</td>
                  <td style="padding:6px 8px;text-align:right;">${d.fdQty || 0} ${d.fdListCode || ''}</td>
                  <td style="padding:6px 8px;text-align:right;">${formatCurrency(d.fdItemPrice)}</td>
                  <td style="padding:6px 8px;text-align:right;font-weight:bold;">${formatCurrency(d.fdTotal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`
        : ''
      const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"/><style>body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;padding:24px;color:#111}.header{border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:20px}.title{font-size:20px;font-weight:bold;margin:0}.sub{font-size:12px;color:#666;margin-top:4px}.row{display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px}.total-box{margin-top:24px;border-top:2px solid #333;padding-top:12px;font-size:16px;font-weight:bold;display:flex;justify-content:space-between}</style></head><body><div class="header"><h1 class="title">M-SHIPPING INVOICE</h1><div class="sub">PT. Global Shipping Enterprise</div></div><div class="row"><strong>No. Invoice:</strong><span>${inv.fdInvNo}</span></div><div class="row"><strong>Customer:</strong><span>${invCust}</span></div>${inv.fdMarkingCode ? `<div class="row"><strong>Marking:</strong><span>${inv.fdMarkingCode}</span></div>` : ''}${inv.fdMarkingNo ? `<div class="row"><strong>No. Marking:</strong><span>${inv.fdMarkingNo}</span></div>` : ''}<div class="row"><strong>Tanggal:</strong><span>${formatDate(inv.fdInvDate)}</span></div>${inv.fdTotalColy != null ? `<div class="row"><strong>Total Koli:</strong><span>${formatNumber(inv.fdTotalColy)}</span></div>` : ''}${inv.fdTotalWeight != null ? `<div class="row"><strong>Total Berat:</strong><span>${formatDecimal(inv.fdTotalWeight, 1)} kg</span></div>` : ''}${inv.fdTotalM3 != null ? `<div class="row"><strong>Total Volume:</strong><span>${formatDecimal(inv.fdTotalM3, 4)} m³</span></div>` : ''}${itemsHtml}<div class="total-box"><span>TOTAL TAGIHAN:</span><span>${formatCurrency(totalAmount)}</span></div></body></html>`
      const { uri } = await Print.printToFileAsync({ html })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' })
      } else {
        await Print.printAsync({ uri })
      }
      showToast('Invoice siap dibagikan / dicetak', 'success')
    } catch {
      showToast('Gagal memproses dokumen invoice', 'error')
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: isDark ? '#0B0F17' : '#F7F5F2' }]}>
      <View style={styles.container}>
        {/* Header Bersih Gaya Dashboard */}
        <View style={styles.topSection}>
          <Text style={[styles.overlineText, { color: colors.secondary }]}>
            Finansial & penagihan
          </Text>
          <Text style={[styles.pageTitle, { color: colors.primary }]}>
            {t('finance.title', 'Keuangan & billing')}
          </Text>

          {/* Tab Strip Editorial (Teks Bersih, Underline 2px Aksen Bata) */}
          <View
            style={[
              styles.tabBarContainer,
              { borderBottomColor: isDark ? '#222C38' : '#E3E7EC' },
            ]}
          >
            {FINANCE_TABS.filter((tab) => !tab.permissionCheck || canAuditValidation).map((tab) => {
              const isActive = activeTab === tab.key

              return (
                <TouchableOpacity
                  key={tab.key}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.selectionAsync()
                    setActiveTab(tab.key as any)
                    setSearch('')
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

          {activeTab !== 'priceLookup' && (
            <>
              <SearchBar
                value={search}
                debounceMs={0}
                onChangeText={(txt) => { setSearch(txt); setShowSuggestions(txt.trim().length >= 2) }}
                onFocus={() => { if (search.trim().length >= 2) setShowSuggestions(true) }}
                placeholder={activeTab === 'billing' ? t('finance.searchBillingPlaceholder', 'Cari no. invoice atau customer...') : t('finance.searchValidationPlaceholder', 'Cari invoice draf validasi...')}
                style={{ marginTop: 10 }}
              />
              <SearchSuggestionsDropdown
                visible={showSuggestions && search.trim().length >= 2}
                suggestions={suggestions}
                isLoading={isFetchingSuggestions}
                title={t('finance.searchBillingPlaceholder', 'Saran Pencarian (Invoice / Customer)')}
                onSelect={(sug) => {
                  Keyboard.dismiss()
                  setSearch(sug.value)
                  setShowSuggestions(false)
                }}
                onClose={() => setShowSuggestions(false)}
              />
            </>
          )}
        </View>

        {/* Billing List */}
        {activeTab === 'billing' && (
          <FlatList
            data={billings.data}
            keyExtractor={(item, index) => `${item.fdInvNo || 'inv'}-${index}`}
            refreshing={billings.isRefetching}
            onRefresh={billings.refetch}
            onEndReached={() => {
              if (billings.hasNextPage && !billings.isFetchingNextPage) {
                billings.fetchNextPage()
              }
            }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              billings.isFetchingNextPage ? (
                <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.tertiary} />
                </View>
              ) : null
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              billings.isLoading ? (
                <View style={{ gap: 10 }}>
                  <SkeletonShimmer height={95} />
                  <SkeletonShimmer height={95} />
                  <SkeletonShimmer height={95} />
                </View>
              ) : billings.isError ? (
                <ErrorRetryCard
                  onRetry={() => billings.refetch()}
                  isRetrying={billings.isRefetching}
                />
              ) : (
                <Card style={styles.emptyCard}>
                  <Text style={{ color: colors.secondary }}>{t('finance.noBilling', 'Tidak ada invoice ditemukan')}</Text>
                </Card>
              )
            }
            renderItem={({ item }) => (
              <BillingListItem
                item={item}
                onPress={setSelectedInvoice}
                onPressAttachment={(inv) => {
                  setAttachmentInvoice({
                    invNo: inv.fdInvNo,
                    custName: displayCustName(inv.customer?.fdCustName || inv.fdCustName || inv.fdBillTo),
                  })
                }}
              />
            )}
          />
        )}

        {/* Validation List */}
        {activeTab === 'validation' && (
          <FlatList
            data={validationData}
            keyExtractor={(item) => item.fdInvNo || Math.random().toString()}
            refreshing={isRefetchingVal}
            onRefresh={refetchVal}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              isValLoading ? (
                <View style={{ gap: 10 }}>
                  <SkeletonShimmer height={105} />
                  <SkeletonShimmer height={105} />
                  <SkeletonShimmer height={105} />
                </View>
              ) : isValError ? (
                <ErrorRetryCard
                  onRetry={() => refetchVal()}
                  isRetrying={isRefetchingVal}
                />
              ) : (
                <Card style={styles.emptyCard}>
                  <Text style={{ color: colors.secondary, fontSize: 12 }}>{t('finance.noValidation', 'Tidak ada antrean validasi')}</Text>
                </Card>
              )
            }
            renderItem={({ item }) => <ValidationListItem item={item} onPress={setSelectedInvoice} />}
          />
        )}

        {/* Price Lookup Tab */}
        {activeTab === 'priceLookup' && (
          <ScrollView contentContainerStyle={styles.calcContainer}>
            <SegmentedControl
              options={[
                { label: t('finance.masterTariff', 'Tarif Umum (Master)'), value: 'master' },
                { label: t('finance.customerTariff', 'Tarif Khusus Pelanggan'), value: 'customer' },
              ]}
              selectedValue={lookupSubTab}
              onValueChange={(val) => { setLookupSubTab(val as any); setEntryLookupResult(null) }}
              style={{ marginBottom: 12 }}
            />

            {/* Moda Filter Pills */}
            <View style={styles.filterPillRow}>
              {(['all', 'BY AIR', 'BY SEA'] as const).map((m) => {
                const isSelected = lookupMode === m
                const label = m === 'all' ? t('common.all', 'Semua') : m === 'BY AIR' ? t('common.air', 'Udara') : t('common.sea', 'Laut')
                return (
                  <TouchableOpacity key={m} activeOpacity={0.7}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLookupMode(m) }}
                    style={[styles.pillBtn, {
                      backgroundColor: isSelected ? (isDark ? 'rgba(56, 189, 248, 0.15)' : '#E0F2FE') : colors.surface,
                      borderColor: isSelected ? colors.tertiary : colors.border,
                    }]}
                  >
                    <Text style={[styles.pillText, { color: isSelected ? colors.tertiary : colors.secondary, fontWeight: isSelected ? '700' : '500' }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Master Price Lookup */}
            {lookupSubTab === 'master' && (
              <View style={{ gap: 14 }}>
                <View style={{ gap: 6 }}>
                  <Text style={[styles.sectionSubLabel, { color: colors.secondary }]}>PILIH CABANG ASAL</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {['ALL', 'GZ', 'HK', 'SG', 'YW', 'SH'].map((br) => {
                      const isSelected = lookupBranch === br
                      return (
                        <TouchableOpacity key={br}
                          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLookupBranch(br) }}
                          style={[styles.branchPill, {
                            backgroundColor: isSelected ? (isDark ? 'rgba(56, 189, 248, 0.15)' : '#E0F2FE') : colors.surface,
                            borderColor: isSelected ? colors.tertiary : colors.border,
                          }]}
                        >
                          <Text style={{ fontSize: 12, fontWeight: isSelected ? '700' : '500', color: isSelected ? colors.tertiary : colors.secondary }}>
                            {br === 'ALL' ? 'Semua Cabang' : br}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </ScrollView>
                </View>

                {/* Quick Resi Lookup */}
                <Card style={{ padding: 12, gap: 8 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.secondary, textTransform: 'uppercase' }}>
                    Cek Tarif by Resi / List Code
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      value={entryLookupQuery}
                      onChangeText={setEntryLookupQuery}
                      placeholder="Contoh: 2603001..."
                      placeholderTextColor={colors.secondary}
                      style={[styles.entryInput, { backgroundColor: isDark ? '#0B0F17' : '#F8FAFC', borderColor: colors.border, color: colors.primary }]}
                    />
                    <TouchableOpacity onPress={handleEntryLookup} disabled={isEntryLoading}
                      style={[styles.entrySearchBtn, { backgroundColor: colors.tertiary }]}>
                      {isEntryLoading ? <ActivityIndicator size="small" color="#fff" /> : <Search size={16} color="#fff" />}
                    </TouchableOpacity>
                  </View>
                  {entryLookupResult && (
                    <View style={{
                      padding: 10, borderRadius: 8, borderWidth: 1, gap: 4,
                      borderColor: entryLookupResult.found ? 'rgba(16, 185, 129, 0.4)' : colors.border,
                      backgroundColor: entryLookupResult.found ? (isDark ? 'rgba(16, 185, 129, 0.08)' : '#ECFDF5') : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'),
                    }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                          {entryLookupResult.entry?.fdTerima || entryLookupResult.entry?.fdListCode || 'Data Pengiriman'}
                        </Text>
                        <Badge label={entryLookupResult.found ? 'Ditemukan' : 'Tidak Ditemukan'} variant={entryLookupResult.found ? 'success' : 'neutral'} />
                      </View>
                      {entryLookupResult.found && (
                        <>
                          <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.tertiary, marginTop: 2 }}>
                            {formatCurrency(entryLookupResult.rate)} / {entryLookupResult.entry?.fdListType === 2 ? 'm³' : 'kg'}
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.secondary }}>
                            Kategori: {entryLookupResult.category || 'Standard'} • Sumber: {entryLookupResult.source}
                          </Text>
                        </>
                      )}
                    </View>
                  )}
                </Card>

                {/* Master Rate List */}
                <View style={{ gap: 8 }}>
                  <Text style={[styles.sectionSubLabel, { color: colors.secondary }]}>DAFTAR TARIF MASTER ({masterPriceList.length})</Text>
                  {isMasterLoading ? (
                    <View style={{ gap: 8 }}><SkeletonShimmer height={75} /><SkeletonShimmer height={75} /><SkeletonShimmer height={75} /></View>
                  ) : masterPriceList.length > 0 ? (
                    masterPriceList.map((item: any, idx: number) => {
                      const isSea = (item.mode || '').toUpperCase().includes('SEA')
                      return (
                        <Card key={item.id || String(idx)} style={{ padding: 12, gap: 6 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>{item.category || 'General Goods'}</Text>
                            <Badge label={isSea ? 'Laut' : 'Udara'} variant={isSea ? 'sea' : 'air'} />
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 2 }}>
                            <View>
                              <Text style={{ fontSize: 11, color: colors.secondary }}>
                                Cabang: <Text style={{ fontWeight: '700', color: colors.primary }}>{item.branch || 'ALL'}</Text>
                              </Text>
                              {item.transitTime ? <Text style={{ fontSize: 11, color: colors.secondary, marginTop: 2 }}>Transit: {item.transitTime} hari</Text> : null}
                            </View>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.tertiary }}>
                              {formatCurrency(item.price)} <Text style={{ fontSize: 11, fontWeight: '500', color: colors.secondary }}>/ {isSea ? 'm³' : 'kg'}</Text>
                            </Text>
                          </View>
                        </Card>
                      )
                    })
                  ) : (
                    <Card style={styles.emptyCard}>
                      <Text style={{ color: colors.secondary, fontSize: 12 }}>Tidak ada tarif master untuk kriteria ini</Text>
                    </Card>
                  )}
                </View>
              </View>
            )}

            {/* Customer Price Lookup */}
            {lookupSubTab === 'customer' && (
              <View style={{ gap: 14 }}>
                <Card style={{ padding: 12, gap: 8 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.secondary, textTransform: 'uppercase' }}>Pilih Pelanggan</Text>
                  <View>
                    <TextInput
                      value={custSearchQuery}
                      onChangeText={(txt) => { setCustSearchQuery(txt); setShowCustDropdown(txt.trim().length >= 2) }}
                      onFocus={() => { if (custSearchQuery.trim().length >= 2) setShowCustDropdown(true) }}
                      placeholder="Ketik nama atau kode customer..."
                      placeholderTextColor={colors.secondary}
                      style={[styles.calcInput, { backgroundColor: isDark ? '#0B0F17' : '#F8FAFC', borderColor: colors.border, color: colors.primary }]}
                    />
                    {showCustDropdown && custSuggestions.length > 0 && (
                      <View style={[styles.custDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        {custSuggestions.map((sug: any) => (
                          <TouchableOpacity key={sug.custCode || sug.value || sug.title}
                            onPress={() => {
                              Keyboard.dismiss()
                              const custCode = sug.custCode || (sug.type === 'code' ? sug.value : sug.value)
                              setSelectedCustCode(custCode)
                              setSelectedCustName(sug.title)
                              setCustSearchQuery(sug.title)
                              setShowCustDropdown(false)
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                            }}
                            style={[styles.custDropdownItem, { borderBottomColor: colors.border }]}
                          >
                            <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.primary }}>{sug.title}</Text>
                            <Text style={{ fontSize: 11, color: colors.secondary, marginTop: 1 }}>
                              {sug.subtitle ? (sug.subtitle.includes('Kode:') ? sug.subtitle : `Kode: ${sug.custCode || sug.value} • ${sug.subtitle}`) : `Kode: ${sug.custCode || sug.value}`}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                  {selectedCustCode ? (
                    <View style={{
                      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                      padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.tertiary,
                      backgroundColor: isDark ? 'rgba(56, 189, 248, 0.08)' : '#E0F2FE',
                    }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.primary }} numberOfLines={1}>{selectedCustName}</Text>
                        <Text style={{ fontSize: 11, color: colors.secondary }}>Kode: {selectedCustCode}</Text>
                      </View>
                      <TouchableOpacity onPress={() => { setSelectedCustCode(''); setSelectedCustName(''); setCustSearchQuery('') }} style={{ padding: 4 }}>
                        <X size={16} color={colors.secondary} />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </Card>

                <View style={{ gap: 8 }}>
                  <Text style={[styles.sectionSubLabel, { color: colors.secondary }]}>
                    TARIF KHUSUS PELANGGAN {selectedCustCode ? `(${customerPriceList.length})` : ''}
                  </Text>
                  {!selectedCustCode ? (
                    <Card style={styles.emptyCard}>
                      <User size={24} color={colors.secondary} style={{ marginBottom: 6, opacity: 0.6 }} />
                      <Text style={{ color: colors.secondary, fontSize: 12, textAlign: 'center' }}>
                        Silakan pilih pelanggan terlebih dahulu untuk melihat daftar tarif khusus
                      </Text>
                    </Card>
                  ) : isCustPriceLoading ? (
                    <View style={{ gap: 8 }}><SkeletonShimmer height={75} /><SkeletonShimmer height={75} /></View>
                  ) : customerPriceList.length > 0 ? (
                    customerPriceList.map((item: any, idx: number) => {
                      const isSea = (item.mode || '').toUpperCase().includes('SEA')
                      return (
                        <Card key={item.id || String(idx)} style={{ padding: 12, gap: 6 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>{item.category || 'Semua Kategori'}</Text>
                            <Badge label={isSea ? 'Laut' : 'Udara'} variant={isSea ? 'sea' : 'air'} />
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 2 }}>
                            <View>
                              <Text style={{ fontSize: 11, color: colors.secondary }}>
                                Cabang: <Text style={{ fontWeight: '700', color: colors.primary }}>{item.branch || 'ALL'}</Text>
                              </Text>
                              {item.effectiveDate ? <Text style={{ fontSize: 10.5, color: colors.secondary, marginTop: 2 }}>Berlaku: {formatDate(item.effectiveDate)}</Text> : null}
                            </View>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.tertiary }}>
                              {formatCurrency(item.price)} <Text style={{ fontSize: 11, fontWeight: '500', color: colors.secondary }}>/ {isSea ? 'm³' : 'kg'}</Text>
                            </Text>
                          </View>
                          {item.notes ? <Text style={{ fontSize: 11, color: colors.secondary, fontStyle: 'italic', marginTop: 2 }}>Ket: {item.notes}</Text> : null}
                        </Card>
                      )
                    })
                  ) : (
                    <Card style={styles.emptyCard}>
                      <Text style={{ color: colors.secondary, fontSize: 12 }}>Pelanggan ini tidak memiliki tarif khusus (mengikuti tarif master umum)</Text>
                    </Card>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* Invoice Detail Sheet */}
        <InvoiceDetailSheet
          selectedInvoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onCopyInvoiceNo={copyInvoiceNo}
        />

        {/* Quick Billing Attachment Sheet from List */}
        <BillingAttachmentSheet
          invNo={attachmentInvoice?.invNo || null}
          custName={attachmentInvoice?.custName}
          visible={Boolean(attachmentInvoice)}
          onClose={() => setAttachmentInvoice(null)}
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
  listContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 36 },
  emptyCard: { alignItems: 'center', padding: 30 },
  calcContainer: { padding: 16, paddingBottom: 36 },
  calcInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 42, fontSize: 13 },
  filterPillRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  pillBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  pillText: { fontSize: 11.5 },
  branchPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  sectionSubLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  entryInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 42, fontSize: 13 },
  entrySearchBtn: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  custDropdown: { borderWidth: 1, borderRadius: 10, marginTop: 4, maxHeight: 180, overflow: 'hidden' },
  custDropdownItem: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
})
