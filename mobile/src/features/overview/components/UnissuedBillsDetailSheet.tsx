import React, { useState, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  Modal,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native'
import {
  X,
  Search,
  Copy,
  ClipboardCheck,
  ExternalLink,
  Plane,
  Ship,
  Calendar,
  User,
  Clock,
  AlertCircle,
  FileQuestion,
  Filter,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SkeletonShimmer } from '@/components/ui/SkeletonShimmer'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useThemeStore } from '@/theme/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import { useTranslation } from '@/hooks/useTranslation'
import { canValidateBilling } from '@/lib/permissions'
import { formatCurrency, formatCompactRupiah, formatDate, formatNumber } from '@/lib/utils'
import { useUnissuedBillsQuery } from '../hooks/useOperationBilling'
import { UnissuedBillItem, UnissuedBillsSummary } from '../services/operationBilling.service'

interface UnissuedBillsDetailSheetProps {
  visible: boolean
  initialAgingFilter?: string
  summaryKpis?: UnissuedBillsSummary
  onClose: () => void
}

export function UnissuedBillsDetailSheet({
  visible,
  initialAgingFilter,
  summaryKpis,
  onClose,
}: UnissuedBillsDetailSheetProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'
  const { showToast } = useToastStore()
  const { t } = useTranslation()
  const userCanValidate = canValidateBilling(user)

  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState<'all' | 'udara' | 'laut'>('all')
  const [agingFilter, setAgingFilter] = useState<string>('all')
  const [creatorFilter, setCreatorFilter] = useState<string>('all')

  useEffect(() => {
    if (visible && initialAgingFilter) {
      setAgingFilter(initialAgingFilter)
    } else if (visible && !initialAgingFilter) {
      setAgingFilter('all')
    }
    if (visible) {
      setSearch('')
      setModeFilter('all')
      setCreatorFilter('all')
    }
  }, [visible, initialAgingFilter])

  // Fetch unissued bills
  const queryParams = useMemo(() => {
    const params: { search?: string; mode?: string; aging?: string } = {}
    if (search.trim()) params.search = search.trim()
    if (modeFilter !== 'all') params.mode = modeFilter
    if (agingFilter !== 'all') params.aging = agingFilter
    return params
  }, [search, modeFilter, agingFilter])

  const { data, isLoading, refetch } = useUnissuedBillsQuery(queryParams, visible)

  // Creator pills grouping
  const creatorList = useMemo(() => {
    const items = data?.items || []
    const map = new Map<string, number>()
    for (const item of items) {
      const name = (item.empName || item.empCode || 'Unknown').trim()
      map.set(name, (map.get(name) || 0) + 1)
    }
    const list = Array.from(map.entries()).map(([name, count]) => ({ name, count }))
    list.sort((a, b) => b.count - a.count)
    return [{ name: 'all', label: 'Semua Creator', count: items.length }, ...list.map((c) => ({ name: c.name, label: c.name, count: c.count }))]
  }, [data?.items])

  // Filter by creator
  const filteredItems = useMemo(() => {
    let items = data?.items || []
    if (creatorFilter !== 'all') {
      items = items.filter(
        (it) => (it.empName || it.empCode || '').trim().toLowerCase() === creatorFilter.toLowerCase()
      )
    }
    return items
  }, [data?.items, creatorFilter])

  const subtotalNominal = useMemo(() => {
    return filteredItems.reduce(
      (acc, it) => acc + (Number(it.jumlahTotal) || Number(it.jumlah1) || 0),
      0
    )
  }, [filteredItems])

  const handleCopyInvoice = (invNo: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    showToast(`No. Invoice ${invNo} berhasil disalin`, 'success')
  }

  const handleValidate = (invNo: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onClose()
    router.push({
      pathname: '/(tabs)/finance',
      params: { tab: 'validation', search: invNo, t: Date.now().toString() },
    })
  }

  const handleDetail = (invNo: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onClose()
    const targetTab = userCanValidate ? 'validation' : 'billing'
    router.push({
      pathname: '/(tabs)/finance',
      params: { tab: targetTab, search: invNo, t: Date.now().toString() },
    })
  }

  const getAgingBadgeColor = (agingGroup: string) => {
    switch (agingGroup) {
      case 'le7':
        return { bg: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.12)', text: '#10B981', border: '#10B981' }
      case '8to14':
        return { bg: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.12)', text: '#F59E0B', border: '#F59E0B' }
      case '15to30':
        return { bg: isDark ? 'rgba(249, 115, 22, 0.2)' : 'rgba(249, 115, 22, 0.12)', text: '#F97316', border: '#F97316' }
      case 'gt30':
      default:
        return { bg: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.12)', text: '#EF4444', border: '#EF4444' }
    }
  }

  const renderItem = ({ item }: { item: UnissuedBillItem }) => {
    const agingStyle = getAgingBadgeColor(item.agingGroup)
    const isAir = item.mode === 'udara' || item.listType === 1
    const nominal = item.jumlahTotal || item.jumlah1 || 0

    return (
      <Card
        style={[
          styles.itemCard,
          {
            backgroundColor: isDark ? colors.surface : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          },
        ]}
      >
        {/* Card Header: Inv No & Aging Badge */}
        <View style={styles.itemHeader}>
          <View style={styles.invNoRow}>
            <Text style={[styles.invNoText, { color: colors.primary }]}>{item.invNo}</Text>
            <TouchableOpacity
              onPress={() => handleCopyInvoice(item.invNo)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[styles.copyBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
            >
              <Copy size={12} color={colors.secondary} />
            </TouchableOpacity>
          </View>
          <View
            style={[
              styles.agingBadge,
              { backgroundColor: agingStyle.bg, borderColor: agingStyle.border },
            ]}
          >
            <Clock size={10} color={agingStyle.text} />
            <Text style={[styles.agingBadgeText, { color: agingStyle.text }]}>
              {item.agingDays} Hari
            </Text>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.customerRow}>
          <Text style={[styles.customerName, { color: colors.primary }]} numberOfLines={1}>
            {item.custName || item.custCode}
          </Text>
          <Text style={[styles.customerCode, { color: colors.secondary }]}>
            ({item.custCode})
          </Text>
        </View>

        {/* Meta row: Date, Mode, Marking */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Calendar size={11} color={colors.secondary} />
            <Text style={[styles.metaText, { color: colors.secondary }]}>
              {formatDate(item.invDate)}
            </Text>
          </View>

          <View style={styles.metaItem}>
            {isAir ? <Plane size={11} color="#F59E0B" /> : <Ship size={11} color="#0284C7" />}
            <Text
              style={[
                styles.metaText,
                { color: isAir ? '#F59E0B' : '#0284C7', fontWeight: '700' },
              ]}
            >
              {isAir ? 'Udara' : 'Laut'}
            </Text>
          </View>

          {Boolean(item.markingCode) && (
            <View style={styles.metaItem}>
              <Text style={[styles.metaText, { color: colors.tertiary, fontWeight: '700' }]}>
                {item.markingCode}
              </Text>
            </View>
          )}
        </View>

        {/* Amount & Creator Row */}
        <View style={[styles.amountRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
          <View>
            <Text style={[styles.amountLabel, { color: colors.secondary }]}>Total Tagihan</Text>
            <Text style={[styles.amountValue, { color: colors.primary }]}>
              {formatCurrency(nominal)}
            </Text>
          </View>

          <View style={styles.creatorInfo}>
            <User size={11} color={colors.secondary} />
            <Text style={[styles.creatorText, { color: colors.secondary }]} numberOfLines={1}>
              {item.empName || item.empCode || '—'}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          {userCanValidate && (
            <TouchableOpacity
              style={[styles.validateBtn, { backgroundColor: '#10B981' }]}
              onPress={() => handleValidate(item.invNo)}
              activeOpacity={0.8}
            >
              <ClipboardCheck size={13} color="#FFFFFF" />
              <Text style={styles.validateBtnText}>Validasi</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.detailBtn,
              {
                borderColor: colors.border,
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              },
            ]}
            onPress={() => handleDetail(item.invNo)}
            activeOpacity={0.8}
          >
            <ExternalLink size={13} color={colors.primary} />
            <Text style={[styles.detailBtnText, { color: colors.primary }]}>Detail</Text>
          </TouchableOpacity>
        </View>
      </Card>
    )
  }

  const summary = data?.summary || summaryKpis

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: isDark ? '#0B0F17' : '#F7F5F2', borderColor: colors.border },
          ]}
        >
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <FileQuestion size={16} color="#EA580C" />
                <Text style={[styles.modalTitle, { color: colors.primary }]}>
                  Draft Belum Di-Issue (&gt; 2024)
                </Text>
              </View>
              <Text style={[styles.modalSubtitle, { color: colors.secondary }]}>
                Tagihan draf dengan nominal &gt; 0 yang belum diserahkan (fdGive ≠ 1)
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { borderColor: colors.border }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Quick KPI Summary Cards */}
          {summary && (
            <View style={styles.kpiSummaryRow}>
              <View style={[styles.miniKpiCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: colors.border }]}>
                <Text style={[styles.miniKpiLabel, { color: colors.secondary }]}>Total Draft</Text>
                <Text style={[styles.miniKpiValue, { color: colors.primary }]}>
                  {summary.totalCount || 0}
                </Text>
              </View>

              <View style={[styles.miniKpiCard, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFFFFF', borderColor: isDark ? 'rgba(245, 158, 11, 0.2)' : colors.border }]}>
                <Text style={[styles.miniKpiLabel, { color: '#F59E0B' }]}>Udara</Text>
                <Text style={[styles.miniKpiValue, { color: '#F59E0B' }]}>
                  {summary.countUdara || 0}
                </Text>
              </View>

              <View style={[styles.miniKpiCard, { backgroundColor: isDark ? 'rgba(2, 132, 199, 0.08)' : '#FFFFFF', borderColor: isDark ? 'rgba(2, 132, 199, 0.2)' : colors.border }]}>
                <Text style={[styles.miniKpiLabel, { color: '#0284C7' }]}>Laut</Text>
                <Text style={[styles.miniKpiValue, { color: '#0284C7' }]}>
                  {summary.countLaut || 0}
                </Text>
              </View>

              <View style={[styles.miniKpiCard, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FFFFFF', borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : colors.border }]}>
                <Text style={[styles.miniKpiLabel, { color: '#EF4444' }]}>&gt;30 Hari</Text>
                <Text style={[styles.miniKpiValue, { color: '#EF4444' }]}>
                  {summary.aging?.gt30?.count || 0}
                </Text>
              </View>
            </View>
          )}

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View
              style={[
                styles.searchBox,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Search size={14} color={colors.secondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.primary }]}
                placeholder="Cari invoice, customer, marking, creator..."
                placeholderTextColor={colors.secondary}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
              />
              {Boolean(search) && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <X size={14} color={colors.secondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filter Moda Segment */}
          <View style={styles.segmentRow}>
            <SegmentedControl
              options={[
                { label: 'Semua Moda', value: 'all' },
                { label: '✈️ Udara', value: 'udara' },
                { label: '🚢 Laut', value: 'laut' },
              ]}
              selectedValue={modeFilter}
              onValueChange={(val) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                setModeFilter(val as any)
              }}
            />
          </View>

          {/* Filter Aging Segment */}
          <View style={styles.agingSegmentRow}>
            <SegmentedControl
              options={[
                { label: 'Semua Aging', value: 'all' },
                { label: '≤ 7h', value: 'le7' },
                { label: '8-14h', value: '8to14' },
                { label: '15-30h', value: '15to30' },
                { label: '> 30h', value: 'gt30' },
              ]}
              selectedValue={agingFilter}
              onValueChange={(val) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                setAgingFilter(val)
              }}
            />
          </View>

          {/* Group Pills by Creator Bill */}
          {creatorList.length > 1 && (
            <View style={styles.creatorPillsContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.creatorPillsScroll}
              >
                {creatorList.map((c) => {
                  const isActive = creatorFilter === c.name
                  return (
                    <TouchableOpacity
                      key={c.name}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                        setCreatorFilter(c.name)
                      }}
                      style={[
                        styles.creatorPill,
                        {
                          backgroundColor: isActive
                            ? colors.tertiary
                            : isDark
                            ? 'rgba(255,255,255,0.06)'
                            : '#FFFFFF',
                          borderColor: isActive ? colors.tertiary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.creatorPillText,
                          { color: isActive ? '#FFFFFF' : colors.primary },
                        ]}
                      >
                        {c.label} ({c.count})
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>
          )}

          {/* Main List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.tertiary} />
              <Text style={[styles.loadingText, { color: colors.secondary }]}>
                Memuat rincian draft bill...
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredItems}
              keyExtractor={(item) => item.invNo}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <AlertCircle size={28} color={colors.secondary} />
                  <Text style={[styles.emptyText, { color: colors.primary }]}>
                    Tidak ada draft bill yang cocok
                  </Text>
                  <Text style={[styles.emptySubtext, { color: colors.secondary }]}>
                    Ubah filter atau kata kunci pencarian
                  </Text>
                </View>
              }
            />
          )}

          {/* Footer Subtotal */}
          <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: isDark ? colors.surface : '#FFFFFF' }]}>
            <View>
              <Text style={[styles.footerCount, { color: colors.secondary }]}>
                Tersaring: {filteredItems.length} Bill
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.footerLabel, { color: colors.secondary }]}>Subtotal Nominal</Text>
              <Text style={[styles.footerNominal, { color: '#10B981' }]}>
                {formatCurrency(subtotalNominal)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    height: '92%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 10.5,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  kpiSummaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 6,
  },
  miniKpiCard: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  miniKpiLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  miniKpiValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  searchContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    padding: 0,
  },
  segmentRow: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  agingSegmentRow: {
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  creatorPillsContainer: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  creatorPillsScroll: {
    paddingHorizontal: 12,
    gap: 6,
  },
  creatorPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  creatorPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    padding: 12,
    gap: 10,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 6,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptySubtext: {
    fontSize: 11,
  },
  itemCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invNoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  invNoText: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  copyBtn: {
    padding: 4,
    borderRadius: 4,
  },
  agingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  agingBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  customerName: {
    fontSize: 12.5,
    fontWeight: '700',
    flexShrink: 1,
  },
  customerCode: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  amountLabel: {
    fontSize: 10,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  creatorText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  validateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  validateBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  detailBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  footerCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  footerLabel: {
    fontSize: 9.5,
  },
  footerNominal: {
    fontSize: 14,
    fontWeight: '900',
  },
})
