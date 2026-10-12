import React, { useState, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native'
import {
  X,
  Search,
  ChevronRight,
  Edit2,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useThemeStore } from '@/theme/themeStore'
import { useTranslation } from '@/hooks/useTranslation'
import { useAuthStore } from '@/stores/authStore'
import { canManageBatchExitDate } from '@/lib/permissions'
import {
  formatNumber,
  formatDecimal,
  formatDate,
  displayCustName,
  cleanFoxProString,
} from '@/lib/utils'
import { getFinancialStatusBadge } from '../utils/logistics.utils'
import { useBatchManifest } from '../hooks/useBatchManifest'
import { ShipmentDetailSheet } from './ShipmentDetailSheet'
import { BatchExitDateModal } from './BatchExitDateModal'

interface BatchManifestSheetProps {
  selectedBatch: any | null
  onClose: () => void
  setSelectedBatch: (v: any) => void
  onCreateBap?: (item: any) => void
  onSelectShipment?: (item: any) => void
}

export function BatchManifestSheet({
  selectedBatch,
  onClose,
  setSelectedBatch,
  onCreateBap,
  onSelectShipment,
}: BatchManifestSheetProps) {
  const { colors, mode } = useThemeStore()
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const insets = useSafeAreaInsets()
  const canEditExitDate = canManageBatchExitDate(user)
  const isDark = mode === 'midnight'
  const lineColor = isDark ? '#222C38' : '#E3E7EC'

  const topPadding =
    Platform.OS === 'android'
      ? Math.max(insets.top, 28) + 8
      : Math.max(insets.top, 12) + 4

  const bottomPadding =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, 28) + 12
      : Math.max(insets.bottom, 12) + 12

  const { manifestData, isManifestLoading, manifestSummary } = useBatchManifest(
    selectedBatch,
    setSelectedBatch
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedShipmentForDetail, setSelectedShipmentForDetail] = useState<any | null>(null)
  const [isExitDateModalVisible, setIsExitDateModalVisible] = useState(false)

  const handleOpenShipmentDetail = (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (onSelectShipment) {
      onSelectShipment(item)
    } else {
      setSelectedShipmentForDetail(item)
    }
  }

  useEffect(() => {
    setSearchQuery('')
    setSelectedShipmentForDetail(null)
  }, [selectedBatch])

  const filteredManifestData = useMemo(() => {
    if (!manifestData) return []
    const q = searchQuery.trim().toLowerCase()
    if (!q) return manifestData
    return manifestData.filter((item: any) => {
      const resi = (item.fdTerima || item.fdListCode || '').toLowerCase()
      const markingNo = (item.fdMarkingNo || '').toLowerCase()
      const cust = (item.fdCustName || '').toLowerCase()
      const comodity = (item.fdComodity || '').toLowerCase()
      const comodityType = (item.typeComodityName || item.fdComodityName || '').toLowerCase()
      const sales = (item.fdSalesNM || '').toLowerCase()
      const branch = (item.fdBranchCode || '').toLowerCase()
      return (
        resi.includes(q) ||
        markingNo.includes(q) ||
        cust.includes(q) ||
        comodity.includes(q) ||
        comodityType.includes(q) ||
        sales.includes(q) ||
        branch.includes(q)
      )
    })
  }, [manifestData, searchQuery])

  const isAir = selectedBatch?.fdListType === 1
  const modeLabel = isAir ? 'Udara' : 'Laut'
  const modeDotColor = isAir ? '#E2B266' : '#5FA3D4'

  return (
    <Modal
      visible={Boolean(selectedBatch)}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0C1118' : '#F6F7F9' }]}>
        {/* Sticky Top Bar (.bar) */}
        <View
          style={[
            styles.bar,
            {
              backgroundColor: isDark ? 'rgba(12,17,24,0.94)' : 'rgba(246,247,249,0.94)',
              borderBottomColor: lineColor,
              paddingTop: topPadding,
            },
          ]}
        >
          <View style={{ flex: 1, paddingRight: 10 }}>
            <View style={styles.noRow}>
              <Text style={[styles.batchNoText, { color: colors.primary }]}>
                {selectedBatch?.fdMarkingCode?.trim() || 'Detail Batch'}
              </Text>
              <View style={styles.modeWrapper}>
                <View style={[styles.dot, { backgroundColor: modeDotColor }]} />
                <Text style={[styles.modeText, { color: colors.secondary }]}>
                  {modeLabel}
                </Text>
              </View>
              {selectedBatch?.fdBranchCode?.trim() || selectedBatch?.fdBranch?.trim() ? (
                <View style={[styles.tag, { borderColor: lineColor }]}>
                  <Text style={[styles.tagText, { color: colors.secondary }]}>
                    {selectedBatch?.fdBranchCode?.trim() || selectedBatch?.fdBranch?.trim()}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.subText, { color: colors.secondary }]}>
              {selectedBatch?.fdContNo?.trim()
                ? `Kontainer ${selectedBatch.fdContNo.trim()}`
                : selectedBatch?.fdAWB?.trim()
                ? `AWB ${selectedBatch.fdAWB.trim()}`
                : 'Kontainer / AWB'}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClose}
            style={[styles.iconBtn, { borderColor: lineColor, backgroundColor: isDark ? '#131A23' : '#FFFFFF' }]}
            accessibilityLabel="Tutup"
          >
            <X size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Flat List with Header Components */}
        <FlatList
          data={filteredManifestData}
          keyExtractor={(item, idx) => item.fdTerima || item.fdListCode || String(idx)}
          contentContainerStyle={[
            styles.scrollList,
            { paddingBottom: bottomPadding + 40 },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              {/* 4-Stat Grid (dl.stats) */}
              <View style={styles.statsGrid}>
                <View style={[styles.statCol, { borderLeftColor: lineColor }]}>
                  <Text style={[styles.statDt, { color: colors.secondary }]}>Koli</Text>
                  <Text style={[styles.statDd, { color: colors.primary }]}>
                    {formatNumber(manifestSummary.totalPack)}
                  </Text>
                </View>

                <View style={[styles.statCol, { borderLeftColor: lineColor }]}>
                  <Text style={[styles.statDt, { color: colors.secondary }]}>Berat</Text>
                  <Text style={[styles.statDd, { color: colors.primary }]}>
                    {formatDecimal(manifestSummary.totalBerat, 1)}
                    <Text style={[styles.statUnit, { color: colors.secondary }]}> kg</Text>
                  </Text>
                </View>

                <View style={[styles.statCol, { borderLeftColor: lineColor }]}>
                  <Text style={[styles.statDt, { color: colors.secondary }]}>Volume</Text>
                  <Text style={[styles.statDd, { color: colors.primary }]}>
                    {formatDecimal(manifestSummary.totalM3, 3)}
                    <Text style={[styles.statUnit, { color: colors.secondary }]}> m³</Text>
                  </Text>
                </View>

                <View style={[styles.statCol, { borderLeftColor: lineColor }]}>
                  <Text style={[styles.statDt, { color: colors.secondary }]}>Customer / resi</Text>
                  <Text style={[styles.statDd, { color: colors.primary }]}>
                    {formatNumber(manifestSummary.totalCustomer)} / {manifestSummary.totalResi}
                  </Text>
                </View>
              </View>

              {/* Status Exit Gudang (.exit) */}
              <View
                style={[
                  styles.exitRow,
                  {
                    borderLeftColor: selectedBatch?.fdExitDate
                      ? (isDark ? '#4CC38A' : '#17855A')
                      : (isDark ? '#E5A93C' : '#A97612'),
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.exitLabel, { color: colors.secondary }]}>
                    Status exit gudang
                  </Text>
                  <Text
                    style={[
                      styles.exitVal,
                      {
                        color: selectedBatch?.fdExitDate
                          ? (isDark ? '#4CC38A' : '#17855A')
                          : (isDark ? '#E5A93C' : '#A97612'),
                      },
                    ]}
                  >
                    {selectedBatch?.fdExitDate
                      ? `Keluar: ${formatDate(selectedBatch.fdExitDate)}`
                      : 'Belum keluar gudang'}
                  </Text>
                </View>

                {canEditExitDate && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      setIsExitDateModalVisible(true)
                    }}
                    style={[
                      styles.chipBtn,
                      {
                        borderColor: lineColor,
                        backgroundColor: isDark ? '#131A23' : '#FFFFFF',
                      },
                    ]}
                  >
                    <Edit2 size={16} color={colors.primary} />
                    <Text style={[styles.chipText, { color: colors.primary }]}>
                      {selectedBatch?.fdExitDate ? 'Ubah exit' : 'Input exit'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Search Bar (.search) */}
              <View
                style={[
                  styles.searchContainer,
                  {
                    borderColor: lineColor,
                    backgroundColor: isDark ? '#131A23' : '#FFFFFF',
                  },
                ]}
              >
                <Search size={20} color={colors.secondary} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={t(
                    'logistics.searchManifestPlaceholder',
                    'Cari resi, marking, customer, komoditas…'
                  )}
                  placeholderTextColor={colors.secondary}
                  returnKeyType="search"
                  style={[styles.searchInput, { color: colors.primary }]}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    style={{ padding: 4 }}
                  >
                    <X size={16} color={colors.secondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* List Header (.head) */}
              <View style={styles.headRow}>
                <Text style={[styles.headTitle, { color: colors.primary }]}>
                  Daftar resi
                </Text>
                <View style={[styles.countBadge, { borderColor: lineColor }]}>
                  <Text style={[styles.countText, { color: colors.secondary }]}>
                    {manifestSummary.totalResi}
                  </Text>
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={[styles.emptyBox, { borderTopColor: lineColor }]}>
              <Text style={[styles.emptyText, { color: colors.secondary }]}>
                {searchQuery.trim()
                  ? `Tidak ada resi yang cocok dengan “${searchQuery.trim()}”.`
                  : 'Tidak ada resi ditemukan dalam batch ini.'}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const finBadge = getFinancialStatusBadge(item.financialStatus, item.isBlocked)
            const isItemBlocked = finBadge.label === 'BLOCKED'
            const isItemUrgent = finBadge.label === 'URGENT' || finBadge.label === 'KODING'
            const isItemLate = isItemBlocked || isItemUrgent
            const commodityName = cleanFoxProString(item.fdComodity)
            const commodityType = item.typeComodityName?.trim() || item.fdComodityName?.trim()

            const colyVal = formatNumber(item.fdJmlPack)
            const unitVal = item.fdSatuan?.trim() || 'coly'
            const kgVal = formatDecimal(item.fdJmlBerat, 1)
            const m3Val = formatDecimal(item.fdM3, 3)

            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleOpenShipmentDetail(item)}
                style={[styles.itemArticle, { borderTopColor: lineColor }]}
              >
                {/* i1: #N + ID Resi di kiri, Tag di kanan + Chevron */}
                <View style={styles.i1}>
                  <Text style={[styles.i1Id, { color: colors.primary }]} numberOfLines={1}>
                    <Text style={[styles.i1Num, { color: colors.secondary }]}>#{index + 1} </Text>
                    {item.fdTerima?.trim() || item.fdListCode?.trim()}
                  </Text>
                  <View
                    style={[
                      styles.tag,
                      {
                        borderColor: isItemLate
                          ? (isDark ? '#EF6B5B' : '#C4402F')
                          : lineColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        {
                          color: isItemLate
                            ? (isDark ? '#EF6B5B' : '#C4402F')
                            : colors.secondary,
                          fontWeight: isItemLate ? '600' : '400',
                        },
                      ]}
                    >
                      {finBadge.label}
                    </Text>
                  </View>
                  <View style={styles.goBtn}>
                    <ChevronRight size={18} color={colors.secondary} />
                  </View>
                </View>

                {/* i2: Pelanggan (Bold) & Sales */}
                <View style={styles.i2}>
                  <Text style={[styles.custName, { color: colors.primary }]} numberOfLines={1}>
                    {displayCustName(item.fdCustName)}
                  </Text>
                  {item.fdSalesNM?.trim() ? (
                    <Text style={[styles.salesText, { color: colors.secondary }]}>
                      Sales <Text style={[styles.salesVal, { color: colors.primary }]}>{item.fdSalesNM.trim()}</Text>
                    </Text>
                  ) : null}
                </View>

                {/* mk: Marking */}
                {item.fdMarkingNo?.trim() ? (
                  <Text style={[styles.mkText, { color: colors.secondary }]} numberOfLines={1}>
                    M: {item.fdMarkingNo.trim()}
                  </Text>
                ) : null}

                {/* i4: Komoditas + Tag Tipe Komoditas */}
                {(commodityName || commodityType) ? (
                  <View style={styles.i4}>
                    {commodityName ? (
                      <Text style={[styles.commodityText, { color: colors.primary }]} numberOfLines={2}>
                        {commodityName}
                      </Text>
                    ) : null}
                    {commodityType ? (
                      <View style={[styles.tag, { borderColor: lineColor, alignSelf: 'flex-start', marginTop: 4 }]}>
                        <Text style={[styles.tagText, { color: colors.secondary }]}>
                          {commodityType}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {/* i5: Ukuran koli/kg/m3 di kiri, + BAP tombol di kanan */}
                <View style={styles.i5}>
                  <Text style={[styles.metricsText, { color: colors.secondary }]}>
                    {colyVal} {unitVal} · {kgVal} kg · {m3Val} m³
                  </Text>

                  {onCreateBap && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={(e) => {
                        e.stopPropagation()
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                        onCreateBap({
                          ...item,
                          fdMarkingCode: selectedBatch?.fdMarkingCode || item.fdMarkingCode,
                          fdListType: selectedBatch?.fdListType || item.fdListType,
                        })
                        onClose()
                      }}
                      style={[styles.bapBtn, { borderColor: lineColor }]}
                    >
                      <Text style={styles.bapText}>+ BAP</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            )
          }}
        />

        {/* Shipment Detail Sheet */}
        <ShipmentDetailSheet
          selectedItem={selectedShipmentForDetail}
          onClose={() => setSelectedShipmentForDetail(null)}
          onCreateBap={(shipment) => {
            setSelectedShipmentForDetail(null)
            if (onCreateBap) {
              onCreateBap(shipment)
              onClose()
            }
          }}
        />

        {/* Batch Exit Date Modal */}
        <BatchExitDateModal
          visible={isExitDateModalVisible}
          batch={selectedBatch}
          onClose={() => setIsExitDateModalVisible(false)}
          onSuccess={() => {
            setIsExitDateModalVisible(false)
          }}
        />
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  noRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  batchNoText: {
    fontSize: 19,
    fontWeight: '600',
    letterSpacing: -0.2,
    fontVariant: ['tabular-nums'],
  },
  modeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modeText: {
    fontSize: 14,
  },
  tag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  tagText: {
    fontSize: 12,
  },
  subText: {
    fontSize: 14,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollList: {
    paddingHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 22,
    gap: 18,
  },
  statCol: {
    width: '45%',
    borderLeftWidth: 2,
    paddingLeft: 12,
  },
  statDt: {
    fontSize: 12,
  },
  statDd: {
    fontSize: 22,
    fontWeight: '500',
    letterSpacing: -0.2,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  statUnit: {
    fontSize: 14,
    fontWeight: '400',
  },
  exitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 2,
    paddingLeft: 12,
    marginBottom: 8,
  },
  exitLabel: {
    fontSize: 13,
  },
  exitVal: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    paddingVertical: 10,
  },
  headRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  headTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  countBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  countText: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  itemArticle: {
    paddingVertical: 18,
    borderTopWidth: 1,
  },
  i1: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  i1Id: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  i1Num: {
    fontWeight: '400',
  },
  goBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  i2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 4,
    marginTop: 2,
  },
  custName: {
    fontSize: 14.5,
    fontWeight: '500',
    flex: 1,
  },
  salesText: {
    fontSize: 14,
  },
  salesVal: {
    fontWeight: '500',
  },
  mkText: {
    fontSize: 14,
    marginTop: 2,
  },
  i4: {
    marginTop: 8,
  },
  commodityText: {
    fontSize: 14,
    lineHeight: 19,
  },
  i5: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  metricsText: {
    fontSize: 13.5,
    fontVariant: ['tabular-nums'],
    flex: 1,
  },
  bapBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bapText: {
    color: '#E0644E',
    fontSize: 13.5,
    fontWeight: '600',
  },
  emptyBox: {
    paddingVertical: 28,
    borderTopWidth: 1,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
})
