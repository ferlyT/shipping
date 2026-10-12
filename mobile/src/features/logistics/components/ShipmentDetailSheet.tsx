import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native'
import { X, MapPin, Check } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useThemeStore } from '@/theme/themeStore'
import {
  displayCustName,
  formatNumber,
  formatDecimal,
  formatDate,
  formatDateTime,
  cleanFoxProString,
} from '@/lib/utils'
import { getShipmentStatusBadge } from '../utils/logistics.utils'
import { useShipmentDetail } from '../hooks/useShipmentDetail'
import { ShipmentInvoiceTab } from './ShipmentInvoiceTab'

interface ShipmentDetailSheetProps {
  selectedItem: any | null
  onClose: () => void
  onCreateBap?: (item: any) => void
}

export function ShipmentDetailSheet({
  selectedItem,
  onClose,
  onCreateBap,
}: ShipmentDetailSheetProps) {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'
  const insets = useSafeAreaInsets()
  const lineColor = isDark ? '#222C38' : '#E3E7EC'

  const topPadding =
    Platform.OS === 'android'
      ? Math.max(insets.top, 28) + 8
      : Math.max(insets.top, 12) + 4

  const bottomPadding =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, 28) + 12
      : Math.max(insets.bottom, 12) + 12

  const [activeTab, setActiveTab] = useState<'ringkasan' | 'dimensi' | 'timeline' | 'invoice'>('ringkasan')
  const [dimSub, setDimSub] = useState<'pl' | 'gudang' | 'komplain'>('gudang')

  const selectedShipmentCode = selectedItem?.fdListCode?.trim()

  const {
    activeShipment,
    isShipmentDetailLoading,
    dimsPackingList,
    dimsGudang,
    dimsKomplain,
    totalDimCount,
  } = useShipmentDetail(selectedShipmentCode, selectedItem)

  // Audit Trail Data (Created By, Updated By, Timestamps)
  const createdByName = isShipmentDetailLoading
    ? 'Memuat...'
    : (activeShipment?.fdEmp1?.trim() ||
       activeShipment?.createdBy?.trim() ||
       activeShipment?.fdCreated?.trim() ||
       activeShipment?.fdDibuatOleh?.trim() ||
       '–')

  const createdTimestamp =
    activeShipment?.fdCreatedDate ||
    activeShipment?.createdAt ||
    activeShipment?.fdListDate ||
    activeShipment?.fdSysDate

  const updatedByName = isShipmentDetailLoading
    ? 'Memuat...'
    : (activeShipment?.fdEmp2?.trim() ||
       activeShipment?.updatedBy?.trim() ||
       activeShipment?.fdUpdateBy?.trim() ||
       activeShipment?.fdDiubahOleh?.trim() ||
       '–')

  const updatedTimestamp =
    activeShipment?.fdUpdate ||
    activeShipment?.updatedAt ||
    activeShipment?.fdUpdatedDate

  const hasIssuedInvoice = Boolean(
    activeShipment?.invoice && (
      activeShipment.invoice.isIssued ||
      activeShipment.invoice.isCollected ||
      activeShipment.invoice.isPaid ||
      (activeShipment.invoice.fdGive != null && Number(activeShipment.invoice.fdGive) >= 1)
    )
  )

  const status = activeShipment?.shipmentStatus
  const currentStep = status?.statusStep ?? 0
  const isCanceled = currentStep === -1 || Number(activeShipment?.fdCancel) === 1
  const isBlocked = currentStep === 10 || status?.statusLabel === 'Blocked' || Boolean(status?.isBlocked)
  const statusBadge = getShipmentStatusBadge(activeShipment?.shipmentStatus)

  // Status tag styling
  const statusTagColor = isCanceled || isBlocked
    ? (isDark ? '#EF6B5B' : '#C4402F')
    : statusBadge.label === 'Delivered'
    ? (isDark ? '#4CC38A' : '#17855A')
    : (isDark ? '#E5A93C' : '#A97612')

  // Timeline definition
  const timelineSteps = [
    { label: 'Waiting Loading', desc: 'Menunggu proses loading ke kontainer', date: status?.fdLoadDate, stepValue: 1 },
    { label: 'ETD (Keberangkatan)', desc: 'Estimated Time of Departure', date: status?.fdETD, stepValue: 2 },
    { label: 'ETA (Kedatangan)', desc: 'Estimated Time of Arrival di pelabuhan', date: status?.fdETA, stepValue: 3 },
    { label: 'Warehouse (Gudang)', desc: status?.fdGudang?.trim() ? `Tiba di ${status.fdGudang.trim()}` : 'Tiba di gudang penyortiran', date: status?.fdExitDate, stepValue: 4 },
    { label: 'Delivery', desc: 'Dalam pengantaran ke penerima', date: null, stepValue: 5, noDate: true },
    { label: 'Delivered', desc: 'Barang telah diterima oleh customer', date: null, stepValue: 6, noDate: true },
  ]

  // Dimensi active items
  const activeDimItems = dimSub === 'pl'
    ? dimsPackingList
    : dimSub === 'gudang'
    ? dimsGudang
    : dimsKomplain

  const totalVolGudang = dimsGudang.reduce((acc: number, cur: any) => {
    return acc + ((Number(cur.fdPjg || 0) * Number(cur.fdLbr || 0) * Number(cur.fdTng || 0) * Number(cur.fdQty || 0)) / 1_000_000)
  }, 0)

  const totalVolPL = dimsPackingList.reduce((acc: number, cur: any) => {
    return acc + ((Number(cur.fdPjg || 0) * Number(cur.fdLbr || 0) * Number(cur.fdTng || 0) * Number(cur.fdQty || 0)) / 1_000_000)
  }, 0)

  const totalVolKomplain = dimsKomplain.reduce((acc: number, cur: any) => {
    return acc + ((Number(cur.fdPjg || 0) * Number(cur.fdLbr || 0) * Number(cur.fdTng || 0) * Number(cur.fdQty || 0)) / 1_000_000)
  }, 0)

  const currentDimTotalVol = dimSub === 'pl' ? totalVolPL : dimSub === 'gudang' ? totalVolGudang : totalVolKomplain

  const commodityName = cleanFoxProString(activeShipment?.fdComodity)

  return (
    <Modal
      visible={Boolean(selectedItem)}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0C1118' : '#F6F7F9' }]}>
        {/* Sticky Header Bar (.bar) */}
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
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View style={styles.t1}>
              <Text style={[styles.name, { color: colors.primary }]} numberOfLines={1}>
                {displayCustName(activeShipment?.fdCustName, 'Customer Tidak Dikenal')}
              </Text>
              <View style={[styles.tag, { borderColor: statusTagColor }]}>
                <Text style={[styles.tagText, { color: statusTagColor, fontWeight: '600' }]}>
                  {statusBadge.label}
                </Text>
              </View>
            </View>

            <View style={styles.t2}>
              <View style={[styles.tag, { borderColor: lineColor }]}>
                <Text style={[styles.tagText, { color: colors.secondary }]}>
                  {activeShipment?.fdListCode || '–'}
                </Text>
              </View>
              {activeShipment?.shipmentStatus?.fdGudang?.trim() ? (
                <View style={styles.locRow}>
                  <MapPin size={14} color={colors.secondary} />
                  <Text style={[styles.locText, { color: colors.secondary }]}>
                    {activeShipment.shipmentStatus.fdGudang.trim()}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.acts}>
            {onCreateBap && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  onCreateBap(activeShipment || selectedItem)
                  onClose()
                }}
                style={[styles.chipBtn, { borderColor: lineColor, backgroundColor: isDark ? '#131A23' : '#FFFFFF' }]}
              >
                <Text style={styles.chipBtnText}>Buat BAP</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              style={[styles.iconBtn, { borderColor: lineColor, backgroundColor: isDark ? '#131A23' : '#FFFFFF' }]}
              accessibilityLabel="Tutup"
            >
              <X size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Strip (.tabs) */}
        <View style={[styles.tabs, { borderBottomColor: lineColor }]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              Haptics.selectionAsync()
              setActiveTab('ringkasan')
            }}
            style={[
              styles.tabBtn,
              activeTab === 'ringkasan' && styles.tabBtnActive,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'ringkasan' ? colors.primary : colors.secondary,
                  fontWeight: activeTab === 'ringkasan' ? '600' : '500',
                },
              ]}
            >
              Ringkasan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              Haptics.selectionAsync()
              setActiveTab('dimensi')
            }}
            style={[
              styles.tabBtn,
              activeTab === 'dimensi' && styles.tabBtnActive,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'dimensi' ? colors.primary : colors.secondary,
                  fontWeight: activeTab === 'dimensi' ? '600' : '500',
                },
              ]}
            >
              Dimensi ({totalDimCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              Haptics.selectionAsync()
              setActiveTab('timeline')
            }}
            style={[
              styles.tabBtn,
              activeTab === 'timeline' && styles.tabBtnActive,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'timeline' ? colors.primary : colors.secondary,
                  fontWeight: activeTab === 'timeline' ? '600' : '500',
                },
              ]}
            >
              Timeline
            </Text>
          </TouchableOpacity>

          {hasIssuedInvoice && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                Haptics.selectionAsync()
                setActiveTab('invoice')
              }}
              style={[
                styles.tabBtn,
                activeTab === 'invoice' && styles.tabBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: activeTab === 'invoice' ? colors.primary : colors.secondary,
                    fontWeight: activeTab === 'invoice' ? '600' : '500',
                  },
                ]}
              >
                Invoice
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Body Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomPadding + 36 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* TAB 1: RINGKASAN */}
          {activeTab === 'ringkasan' && (
            <View>
              {/* 3 Metric Stats (.stats) */}
              <View style={styles.statsSection}>
                <View style={styles.statsGrid}>
                  <View style={[styles.statCol, { borderLeftColor: lineColor }]}>
                    <Text style={[styles.statDt, { color: colors.secondary }]}>Total koli</Text>
                    <Text style={[styles.statDd, { color: colors.primary }]}>
                      {formatNumber(activeShipment?.fdJmlPack ?? activeShipment?.fdColy ?? 0)}
                      <Text style={[styles.statUnit, { color: colors.secondary }]}> {activeShipment?.fdSatuan?.trim() || 'CT'}</Text>
                    </Text>
                  </View>

                  <View style={[styles.statCol, { borderLeftColor: lineColor }]}>
                    <Text style={[styles.statDt, { color: colors.secondary }]}>Total berat</Text>
                    <Text style={[styles.statDd, { color: colors.primary }]}>
                      {formatDecimal(activeShipment?.fdJmlBerat ?? activeShipment?.fdWeight ?? 0, 1)}
                      <Text style={[styles.statUnit, { color: colors.secondary }]}> kg</Text>
                    </Text>
                  </View>

                  <View style={[styles.statCol, { borderLeftColor: lineColor }]}>
                    <Text style={[styles.statDt, { color: colors.secondary }]}>Total volume</Text>
                    <Text style={[styles.statDd, { color: colors.primary }]}>
                      {formatDecimal(activeShipment?.fdM3 ?? 0, 4)}
                      <Text style={[styles.statUnit, { color: colors.secondary }]}> m³</Text>
                    </Text>
                  </View>
                </View>
              </View>

              {/* Primary Key-Values Panel (.kv) */}
              <View style={[styles.sectionBlock, { borderTopColor: lineColor }]}>
                <View style={styles.kvList}>
                  <View style={styles.kvItem}>
                    <Text style={[styles.kvDt, { color: colors.secondary }]}>No. resi (terima)</Text>
                    <Text style={[styles.kvDdStrong, { color: colors.primary }]}>
                      {activeShipment?.fdTerima || '–'}
                    </Text>
                  </View>

                  <View style={[styles.kvItem, { borderTopColor: lineColor }]}>
                    <Text style={[styles.kvDt, { color: colors.secondary }]}>Tracking no.</Text>
                    <Text style={[styles.kvDd, { color: activeShipment?.fdLocalTrackingNo ? colors.primary : colors.secondary }]}>
                      {activeShipment?.fdLocalTrackingNo || '–'}
                    </Text>
                  </View>

                  <View style={[styles.kvItem, { borderTopColor: lineColor }]}>
                    <Text style={[styles.kvDt, { color: colors.secondary }]}>Marking & no.</Text>
                    <Text style={[styles.kvDd, { color: colors.primary }]}>
                      {[activeShipment?.fdMarkingCode, activeShipment?.fdMarkingNo].filter(Boolean).join(' ') || '–'}
                    </Text>
                  </View>

                  <View style={[styles.kvItem, { borderTopColor: lineColor }]}>
                    <Text style={[styles.kvDt, { color: colors.secondary }]}>Tanggal agent</Text>
                    <Text style={[styles.kvDd, { color: colors.primary }]}>
                      {formatDate(activeShipment?.fdTglAgent)}
                    </Text>
                  </View>

                  <View style={[styles.kvItem, { borderTopColor: lineColor }]}>
                    <Text style={[styles.kvDt, { color: colors.secondary }]}>Moda / cabang</Text>
                    <Text style={[styles.kvDd, { color: colors.primary }]}>
                      {activeShipment?.fdListType === 1 ? 'Udara' : 'Laut'} · {activeShipment?.fdBranch || activeShipment?.fdBranchCode || 'Pusat'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Commodity section */}
              {commodityName ? (
                <View style={[styles.sectionBlock, { borderTopColor: lineColor }]}>
                  <Text style={[styles.sectionHeading, { color: colors.primary }]}>
                    Komoditas
                  </Text>
                  <Text style={[styles.descText, { color: colors.secondary }]}>
                    {commodityName}
                  </Text>
                </View>
              ) : null}

              {/* Keterangan */}
              {activeShipment?.fdDesc ? (
                <View style={[styles.sectionBlock, { borderTopColor: lineColor }]}>
                  <Text style={[styles.sectionHeading, { color: colors.primary }]}>
                    Keterangan
                  </Text>
                  <Text style={[styles.descText, { color: colors.secondary }]}>
                    {activeShipment.fdDesc}
                  </Text>
                </View>
              ) : null}

              {/* Riwayat User Info */}
              <View style={[styles.sectionBlock, { borderTopColor: lineColor }]}>
                <Text style={[styles.sectionHeading, { color: colors.primary }]}>
                  Riwayat
                </Text>
                <View style={styles.kvList}>
                  <View style={styles.kvItem}>
                    <Text style={[styles.kvDt, { color: colors.secondary }]}>Dibuat oleh</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.kvDd, { color: colors.primary }]}>
                        {createdByName}
                      </Text>
                      {createdTimestamp ? (
                        <Text style={[styles.kvSub, { color: colors.secondary }]}>
                          {formatDateTime(createdTimestamp)}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={[styles.kvItem, { borderTopColor: lineColor }]}>
                    <Text style={[styles.kvDt, { color: colors.secondary }]}>Terakhir diperbarui</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.kvDd, { color: colors.primary }]}>
                        {updatedByName !== '–' ? updatedByName : (updatedTimestamp ? 'Sistem' : '–')}
                      </Text>
                      {updatedTimestamp ? (
                        <Text style={[styles.kvSub, { color: colors.secondary }]}>
                          {formatDateTime(updatedTimestamp)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* TAB 2: DIMENSI */}
          {activeTab === 'dimensi' && (
            <View>
              {/* Sub-segment (.seg) */}
              <View style={styles.segRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.selectionAsync()
                    setDimSub('pl')
                  }}
                  style={[
                    styles.segBtn,
                    dimSub === 'pl' && {
                      borderColor: lineColor,
                      backgroundColor: isDark ? '#131A23' : '#FFFFFF',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.segText,
                      {
                        color: dimSub === 'pl' ? colors.primary : colors.secondary,
                        fontWeight: dimSub === 'pl' ? '600' : '400',
                      },
                    ]}
                  >
                    Packing list ({dimsPackingList.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.selectionAsync()
                    setDimSub('gudang')
                  }}
                  style={[
                    styles.segBtn,
                    dimSub === 'gudang' && {
                      borderColor: lineColor,
                      backgroundColor: isDark ? '#131A23' : '#FFFFFF',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.segText,
                      {
                        color: dimSub === 'gudang' ? colors.primary : colors.secondary,
                        fontWeight: dimSub === 'gudang' ? '600' : '400',
                      },
                    ]}
                  >
                    Gudang ({dimsGudang.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.selectionAsync()
                    setDimSub('komplain')
                  }}
                  style={[
                    styles.segBtn,
                    dimSub === 'komplain' && {
                      borderColor: lineColor,
                      backgroundColor: isDark ? '#131A23' : '#FFFFFF',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.segText,
                      {
                        color: dimSub === 'komplain' ? colors.primary : colors.secondary,
                        fontWeight: dimSub === 'komplain' ? '600' : '400',
                      },
                    ]}
                  >
                    Komplain ({dimsKomplain.length})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Total volume bar (.total) */}
              <View style={[styles.totalVolBanner, { borderLeftColor: isDark ? '#4CC38A' : '#17855A' }]}>
                <Text style={[styles.totalVolLabel, { color: colors.secondary }]}>
                  Total volume ukuran {dimSub === 'pl' ? 'packing list' : dimSub === 'gudang' ? 'gudang' : 'komplain'}
                </Text>
                <Text style={[styles.totalVolVal, { color: colors.primary }]}>
                  {formatDecimal(currentDimTotalVol, 4)} m³
                </Text>
              </View>

              {/* Koli rows */}
              {activeDimItems.length === 0 ? (
                <View style={styles.emptyDimBox}>
                  <Text style={[styles.emptyDimText, { color: colors.secondary }]}>
                    Tidak ada data rincian dimensi untuk kategori ini.
                  </Text>
                </View>
              ) : (
                activeDimItems.map((dim: any, idx: number) => {
                  const vol = (Number(dim.fdPjg || 0) * Number(dim.fdLbr || 0) * Number(dim.fdTng || 0) * Number(dim.fdQty || 0)) / 1_000_000
                  return (
                    <View key={`${dim.fdListCode}-${dim.fdListDCode || idx}`} style={[styles.koliCard, { borderTopColor: lineColor }]}>
                      <View style={styles.koliHeader}>
                        <Text style={[styles.koliNo, { color: colors.primary }]}>
                          Koli #{idx + 1}
                        </Text>
                        <Text style={[styles.koliVol, { color: colors.secondary }]}>
                          {formatDecimal(vol, 4)} m³
                        </Text>
                      </View>

                      <View style={styles.koliStatsGrid}>
                        <View style={[styles.koliStatCol, { borderLeftColor: lineColor }]}>
                          <Text style={[styles.koliStatDt, { color: colors.secondary }]}>Panjang</Text>
                          <Text style={[styles.koliStatDd, { color: colors.primary }]}>
                            {dim.fdPjg || 0}
                            <Text style={[styles.koliStatUnit, { color: colors.secondary }]}> cm</Text>
                          </Text>
                        </View>

                        <View style={[styles.koliStatCol, { borderLeftColor: lineColor }]}>
                          <Text style={[styles.koliStatDt, { color: colors.secondary }]}>Lebar</Text>
                          <Text style={[styles.koliStatDd, { color: colors.primary }]}>
                            {dim.fdLbr || 0}
                            <Text style={[styles.koliStatUnit, { color: colors.secondary }]}> cm</Text>
                          </Text>
                        </View>

                        <View style={[styles.koliStatCol, { borderLeftColor: lineColor }]}>
                          <Text style={[styles.koliStatDt, { color: colors.secondary }]}>Tinggi</Text>
                          <Text style={[styles.koliStatDd, { color: colors.primary }]}>
                            {dim.fdTng || 0}
                            <Text style={[styles.koliStatUnit, { color: colors.secondary }]}> cm</Text>
                          </Text>
                        </View>

                        <View style={[styles.koliStatCol, { borderLeftColor: lineColor }]}>
                          <Text style={[styles.koliStatDt, { color: colors.secondary }]}>Jumlah</Text>
                          <Text style={[styles.koliStatDd, { color: colors.primary }]}>
                            {dim.fdQty || 1}
                            <Text style={[styles.koliStatUnit, { color: colors.secondary }]}> pcs</Text>
                          </Text>
                        </View>
                      </View>
                    </View>
                  )
                })
              )}
            </View>
          )}

          {/* TAB 3: TIMELINE */}
          {activeTab === 'timeline' && (
            <View style={{ paddingTop: 16 }}>
              {isCanceled ? (
                <View style={[styles.cancelBanner, { borderLeftColor: isDark ? '#EF6B5B' : '#C4402F' }]}>
                  <Text style={[styles.cancelTitle, { color: isDark ? '#EF6B5B' : '#C4402F' }]}>
                    Pengiriman dibatalkan
                  </Text>
                  <Text style={[styles.cancelDesc, { color: colors.secondary }]}>
                    Resi ini dibatalkan. Aktivitas dan tahapan logistik tidak dilanjutkan.
                  </Text>
                </View>
              ) : (
                <View style={styles.timelineList}>
                  {timelineSteps.map((step, idx) => {
                    const isDone = currentStep > step.stepValue
                    const isNow = currentStep === step.stepValue
                    const isWait = currentStep < step.stepValue
                    const isLast = idx === timelineSteps.length - 1

                    return (
                      <View key={step.label} style={styles.tlItem}>
                        {/* Connecting line */}
                        {!isLast && (
                          <View
                            style={[
                              styles.tlLine,
                              { backgroundColor: isDone ? (isDark ? '#4CC38A' : '#17855A') : lineColor },
                            ]}
                          />
                        )}

                        {/* Point node */}
                        <View
                          style={[
                            styles.tlPoint,
                            isDone && {
                              backgroundColor: isDark ? '#4CC38A' : '#17855A',
                              borderColor: isDark ? '#4CC38A' : '#17855A',
                            },
                            isNow && {
                              borderColor: isDark ? '#4CC38A' : '#17855A',
                            },
                            isWait && {
                              borderColor: lineColor,
                            },
                          ]}
                        >
                          {isDone ? (
                            <Check size={13} color="#FFFFFF" strokeWidth={3} />
                          ) : isNow ? (
                            <View style={[styles.tlPointInnerNow, { backgroundColor: isDark ? '#4CC38A' : '#17855A' }]} />
                          ) : (
                            <View style={[styles.tlPointInnerWait, { backgroundColor: lineColor }]} />
                          )}
                        </View>

                        {/* Content text */}
                        <View style={styles.tlContent}>
                          <View style={styles.tlTitleRow}>
                            <Text
                              style={[
                                styles.tlTitle,
                                { color: isWait ? colors.secondary : colors.primary },
                              ]}
                            >
                              {step.label}
                            </Text>
                            {isNow && (
                              <View style={[styles.tag, { borderColor: isDark ? '#4CC38A' : '#17855A' }]}>
                                <Text style={[styles.tagText, { color: isDark ? '#4CC38A' : '#17855A', fontWeight: '600' }]}>
                                  Berjalan
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.tlDesc, { color: colors.secondary }]}>
                            {step.desc}
                          </Text>
                          <Text
                            style={[
                              styles.tlDate,
                              { color: isWait ? colors.secondary : colors.primary, fontWeight: isWait ? '400' : '500' },
                            ]}
                          >
                            {step.date ? formatDate(step.date) : 'Menunggu'}
                          </Text>
                        </View>
                      </View>
                    )
                  })}
                </View>
              )}
            </View>
          )}

          {/* TAB 4: INVOICE */}
          {activeTab === 'invoice' && activeShipment?.invoice && (
            <ShipmentInvoiceTab
              invoice={activeShipment.invoice}
              fdListCode={activeShipment?.fdListCode}
            />
          )}
        </ScrollView>
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
  t1: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 19,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  t2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locText: {
    fontSize: 13.5,
  },
  tag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
  },
  tagText: {
    fontSize: 12,
  },
  acts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipBtn: {
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipBtnText: {
    color: '#E0644E',
    fontSize: 13.5,
    fontWeight: '600',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 20,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabBtnActive: {
    borderBottomColor: '#E0644E',
  },
  tabText: {
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  statsSection: {
    paddingBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCol: {
    flex: 1,
    borderLeftWidth: 2,
    paddingLeft: 10,
  },
  statDt: {
    fontSize: 12,
  },
  statDd: {
    fontSize: 20,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
    marginTop: 2,
  },
  statUnit: {
    fontSize: 13,
    fontWeight: '400',
  },
  sectionBlock: {
    paddingTop: 18,
    paddingBottom: 6,
    borderTopWidth: 1,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.1,
    marginBottom: 8,
  },
  descText: {
    fontSize: 14,
    lineHeight: 20,
  },
  kvList: {
    gap: 0,
  },
  kvItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  kvDt: {
    fontSize: 14,
  },
  kvDd: {
    fontSize: 14.5,
    fontWeight: '500',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  kvDdStrong: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  kvSub: {
    fontSize: 12.5,
    marginTop: 2,
  },
  segRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  segBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segText: {
    fontSize: 13,
  },
  totalVolBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
    borderLeftWidth: 2,
    paddingLeft: 12,
    marginVertical: 12,
  },
  totalVolLabel: {
    fontSize: 13.5,
  },
  totalVolVal: {
    fontSize: 19,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  emptyDimBox: {
    paddingVertical: 24,
  },
  emptyDimText: {
    fontSize: 13,
    textAlign: 'center',
  },
  koliCard: {
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  koliHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  koliNo: {
    fontSize: 15,
    fontWeight: '600',
  },
  koliVol: {
    fontSize: 14,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  koliStatsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  koliStatCol: {
    flex: 1,
    borderLeftWidth: 2,
    paddingLeft: 8,
  },
  koliStatDt: {
    fontSize: 12,
  },
  koliStatDd: {
    fontSize: 18,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  koliStatUnit: {
    fontSize: 12,
    fontWeight: '400',
  },
  cancelBanner: {
    borderLeftWidth: 2,
    paddingLeft: 12,
  },
  cancelTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  cancelDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  timelineList: {
    gap: 0,
  },
  tlItem: {
    position: 'relative',
    paddingLeft: 38,
    paddingBottom: 26,
  },
  tlLine: {
    position: 'absolute',
    left: 11,
    top: 26,
    bottom: 0,
    width: 2,
  },
  tlPoint: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tlPointInnerNow: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tlPointInnerWait: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tlContent: {
    gap: 2,
  },
  tlTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  tlTitle: {
    fontSize: 15.5,
    fontWeight: '600',
  },
  tlDesc: {
    fontSize: 13.5,
    marginTop: 2,
  },
  tlDate: {
    fontSize: 13.5,
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },
})
