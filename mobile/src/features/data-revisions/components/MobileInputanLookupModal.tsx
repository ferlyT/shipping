import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native'
import { Search, X, Hash, Check, AlertTriangle, Lock } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { useThemeStore } from '@/theme/themeStore'
import { mobileDataRevisionsApi } from '../services/data-revisions.service'
import type { LookupListCodeItem } from '../types/dataRevisions.types'

interface Props {
  visible: boolean
  onClose: () => void
  onSelect: (item: {
    fdNoInputan: string
    fdCustCode?: string
    fdCustName?: string
    fdSpMark?: string
    fdQtyVolWgt?: string
    fdTerima?: string
  }) => void
  title?: string
  isTargetCancel?: boolean
}

export function MobileInputanLookupModal({
  visible,
  onClose,
  onSelect,
  title = 'Pilih No. Inputan (fdListCode)',
  isTargetCancel = false,
}: Props) {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'
  const insets = useSafeAreaInsets()

  const topPadding =
    Platform.OS === 'android'
      ? Math.max(insets.top, 28) + 8
      : Math.max(insets.top, 12) + 4

  const bottomPadding =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, 24) + 8
      : Math.max(insets.bottom, 12) + 4

  const [search, setSearch] = useState('')
  const [items, setItems] = useState<LookupListCodeItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!visible) return
    let active = true

    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await mobileDataRevisionsApi.lookupListCode(search)
        if (active) {
          setItems(res.data || [])
        }
      } catch (err) {
        if (active) setItems([])
      } finally {
        if (active) setIsLoading(false)
      }
    }, 200)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [search, visible])

  useEffect(() => {
    if (!visible) {
      setSearch('')
      setItems([])
    }
  }, [visible])

  if (!visible) return null

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: isDark ? '#0B0F17' : '#F7F5F2' },
        ]}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
              borderBottomColor: isDark ? '#1E293B' : '#E2E8F0',
              paddingTop: topPadding,
            },
          ]}
        >
          <View style={styles.headerTitleRow}>
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: isTargetCancel
                    ? 'rgba(244, 63, 94, 0.15)'
                    : 'rgba(56, 189, 248, 0.15)',
                },
              ]}
            >
              <Hash
                size={18}
                color={isTargetCancel ? '#F43F5E' : colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.headerTitle,
                  { color: isDark ? '#F8FAFC' : '#0F172A' },
                ]}
                numberOfLines={1}
              >
                {title}
              </Text>
              <Text
                style={[
                  styles.headerSubtitle,
                  {
                    color: isTargetCancel
                      ? '#FB7185'
                      : isDark
                      ? '#94A3B8'
                      : '#64748B',
                  },
                ]}
              >
                {isTargetCancel
                  ? 'Pilih fdListCode target pembatalan (fdCancel = 1)'
                  : 'Cari Pelanggan, No. Resi, Marking, atau No. Inputan'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[
              styles.closeBtn,
              { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
            ]}
          >
            <X size={18} color={isDark ? '#E2E8F0' : '#475569'} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View
          style={[
            styles.searchSection,
            {
              backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
              borderBottomColor: isDark ? '#1E293B' : '#E2E8F0',
            },
          ]}
        >
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: isDark ? '#0B0F17' : '#F8FAFC',
                borderColor: isDark ? '#1E293B' : '#CBD5E1',
              },
            ]}
          >
            <Search size={16} color={isDark ? '#64748B' : '#94A3B8'} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Cari customer, no resi, marking, inputan..."
              placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
              style={[
                styles.searchInput,
                { color: isDark ? '#F8FAFC' : '#0F172A' },
              ]}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="default"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                <X size={15} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* List Content */}
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={[
                styles.loadingText,
                { color: isDark ? '#94A3B8' : '#64748B' },
              ]}
            >
              Memindai database tbEntryList...
            </Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.centerContainer}>
            <Search size={36} color={isDark ? '#334155' : '#CBD5E1'} />
            <Text
              style={[
                styles.emptyTitle,
                { color: isDark ? '#E2E8F0' : '#334155' },
              ]}
            >
              {search ? `Tidak ditemukan "${search}"` : 'Cari Data Kargo'}
            </Text>
            <Text
              style={[
                styles.emptySubtitle,
                { color: isDark ? '#64748B' : '#94A3B8' },
              ]}
            >
              {search
                ? 'Periksa kembali nama customer, no resi, marking, atau nomor inputan.'
                : 'Ketik nama customer, no resi pengiriman, kode marking, atau nomor inputan.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item, idx) => `${item.fdListCode}-${idx}`}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const listCode = (item.fdListCode || '').trim()
              const custName = (item.fdCustName || '').trim()
              const custCode = (item.fdCustCode || '').trim()
              const terima = (item.fdTerima || '').trim()
              const marking = `${(item.fdMarkingCode || '').trim()} / ${(item.fdMarkingNo || '').trim()}`
              const pack = Number(item.fdJmlPack || 0)
              const m3 = Number(item.fdM3 || 0).toFixed(4)
              const berat = Number(item.fdJmlBerat || 0).toFixed(1)
              const qtyVolWgt = `${pack} Colly / ${m3} m3 / ${berat} kgs`
              const isCancelled = item.fdCancel === 1
              const hasBill = Boolean(item.hasBill)
              const isGiven = Boolean(item.isGiven)
              const isCancelBlocked = isTargetCancel && (hasBill || isGiven)

              return (
                <TouchableOpacity
                  disabled={isCancelBlocked}
                  onPress={() => {
                    if (isCancelBlocked) {
                      Haptics.notificationAsync(
                        Haptics.NotificationFeedbackType.Warning
                      )
                      return
                    }
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    onSelect({
                      fdNoInputan: listCode,
                      fdCustCode: custCode || undefined,
                      fdCustName: custName || undefined,
                      fdSpMark: marking !== ' / ' ? marking : undefined,
                      fdQtyVolWgt: qtyVolWgt,
                      fdTerima: terima || undefined,
                    })
                    onClose()
                  }}
                  style={[
                    styles.itemCard,
                    {
                      backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                      borderColor: isCancelBlocked
                        ? 'rgba(245, 158, 11, 0.35)'
                        : isCancelled
                        ? 'rgba(244, 63, 94, 0.3)'
                        : isDark
                        ? '#1E293B'
                        : '#E2E8F0',
                      opacity: isCancelBlocked ? 0.6 : 1,
                    },
                  ]}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    {/* Baris 1: Kode Inputan, No Resi & Badges */}
                    <View style={styles.badgeRow}>
                      <Text
                        style={[
                          styles.listCodeText,
                          { color: isDark ? '#38BDF8' : '#0284C7' },
                        ]}
                      >
                        {listCode}
                      </Text>

                      {terima ? (
                        <View style={styles.resiBadge}>
                          <Text style={styles.resiBadgeText}>
                            Resi: {terima}
                          </Text>
                        </View>
                      ) : null}

                      {isCancelBlocked ? (
                        <View style={styles.lockBadge}>
                          <Lock size={10} color="#F59E0B" />
                          <Text style={styles.lockBadgeText}>
                            {hasBill && isGiven
                              ? `Ada Bill (${item.fdInvNo}) + fdGive=1`
                              : hasBill
                              ? `Ada Bill (${item.fdInvNo})`
                              : `Sudah Diserahkan (fdGive=1)`}
                          </Text>
                        </View>
                      ) : (
                        <>
                          {hasBill && (
                            <View style={styles.billBadge}>
                              <Text style={styles.billBadgeText}>
                                Bill: {item.fdInvNo}
                              </Text>
                            </View>
                          )}
                          {isGiven && (
                            <View style={styles.giveBadge}>
                              <Text style={styles.giveBadgeText}>fdGive=1</Text>
                            </View>
                          )}
                        </>
                      )}

                      {isCancelled && (
                        <View style={styles.cancelBadge}>
                          <AlertTriangle size={10} color="#F43F5E" />
                          <Text style={styles.cancelBadgeText}>
                            fdCancel=1
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Customer */}
                    {custName ? (
                      <Text
                        style={[
                          styles.customerText,
                          { color: isDark ? '#E2E8F0' : '#1E293B' },
                        ]}
                        numberOfLines={1}
                      >
                        {custName}{' '}
                        {custCode ? (
                          <Text
                            style={[
                              styles.custCodeText,
                              { color: isDark ? '#94A3B8' : '#64748B' },
                            ]}
                          >
                            ({custCode})
                          </Text>
                        ) : null}
                      </Text>
                    ) : null}

                    {/* Marking & Volume */}
                    <View style={styles.metaRow}>
                      {marking !== ' / ' ? (
                        <Text
                          style={[
                            styles.metaText,
                            { color: isDark ? '#94A3B8' : '#64748B' },
                          ]}
                        >
                          Marking:{' '}
                          <Text
                            style={[
                              styles.metaBold,
                              { color: isDark ? '#CBD5E1' : '#334155' },
                            ]}
                          >
                            {marking}
                          </Text>
                        </Text>
                      ) : null}
                      <Text
                        style={[
                          styles.metaText,
                          { color: isDark ? '#94A3B8' : '#64748B' },
                        ]}
                      >
                        Vol:{' '}
                        <Text
                          style={[
                            styles.metaBold,
                            { color: isDark ? '#CBD5E1' : '#334155' },
                          ]}
                        >
                          {qtyVolWgt}
                        </Text>
                      </Text>
                    </View>

                    {/* Peringatan jika terkunci proteksi */}
                    {isCancelBlocked ? (
                      <View style={styles.reasonRow}>
                        <Lock size={10} color="#F59E0B" />
                        <Text style={styles.reasonText}>
                          Terkunci: {item.cancelBlockReason}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.actionIconCol}>
                    {isCancelBlocked ? (
                      <View style={styles.lockIconBox}>
                        <Lock size={14} color="#F59E0B" />
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.selectIconBox,
                          { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
                        ]}
                      >
                        <Check size={14} color={colors.primary} />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )
            }}
          />
        )}

        {/* Footer */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
              borderTopColor: isDark ? '#1E293B' : '#E2E8F0',
              paddingBottom: bottomPadding,
            },
          ]}
        >
          <Text
            style={[
              styles.footerText,
              { color: isDark ? '#94A3B8' : '#64748B' },
            ]}
          >
            {isLoading
              ? 'Memindai...'
              : `${items.length} nomor inputan ditemukan`}
          </Text>
          {isTargetCancel ? (
            <View style={styles.footerCancelBadge}>
              <AlertTriangle size={11} color="#F43F5E" />
              <Text style={styles.footerCancelText}>Target: fdCancel = 1</Text>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
  },
  listContent: {
    padding: 14,
    gap: 10,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  listCodeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  resiBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  resiBadgeText: {
    fontSize: 10,
    color: '#818CF8',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
  },
  billBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  billBadgeText: {
    fontSize: 10,
    color: '#38BDF8',
    fontWeight: '600',
  },
  giveBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  giveBadgeText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
  },
  cancelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cancelBadgeText: {
    fontSize: 10,
    color: '#F43F5E',
    fontWeight: '700',
  },
  customerText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  custCodeText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaText: {
    fontSize: 11,
  },
  metaBold: {
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  reasonText: {
    fontSize: 10.5,
    color: '#F59E0B',
    fontWeight: '600',
  },
  actionIconCol: {
    marginLeft: 8,
  },
  lockIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 11.5,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 11,
  },
  footerCancelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerCancelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F43F5E',
  },
})
