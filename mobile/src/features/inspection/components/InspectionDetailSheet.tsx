import React from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  Image,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  X,
  ClipboardList,
  Calendar,
  User,
  Tag,
  FileText,
  Edit2,
  Trash2,
  Receipt,
  Hash,
  Camera,
  Plane,
  Ship,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useThemeStore } from '@/theme/themeStore'
import { formatDate, displayCustName } from '@/lib/utils'
import { DEFAULT_API_URL } from '@/api/client'
import { InspectionStatusBadge } from './InspectionStatusBadge'
import { useBapPhotos } from '../hooks/useBapPhotos'
import type { InspectionReport } from '../types/inspectionReport.types'

interface Props {
  item: InspectionReport | null
  visible: boolean
  onClose: () => void
  onEdit: (item: InspectionReport) => void
  onDelete: (id: number) => void
  onOpenPhotos?: (item: InspectionReport) => void
}

export function InspectionDetailSheet({
  item,
  visible,
  onClose,
  onEdit,
  onDelete,
  onOpenPhotos,
}: Props) {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'
  const insets = useSafeAreaInsets()
  const bottomInset = Platform.OS === 'android'
    ? Math.max(insets.bottom, 48)
    : Math.max(insets.bottom, 16)

  const { data: photos = [] } = useBapPhotos(item?.fdId, visible)

  const getFullPhotoUrl = (url: string) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    const baseUrl = DEFAULT_API_URL.replace(/\/api$/, '')
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
  }

  if (!item) return null

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    Alert.alert(
      'Hapus BAP',
      `Yakin ingin menghapus Berita Acara ${item.fdReportNumber}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => {
            onDelete(item.fdId)
            onClose()
          },
        },
      ]
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                borderBottomColor: isDark
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(0,0,0,0.08)',
              },
            ]}
          >
            <View style={{ flex: 1, marginRight: 10 }}>
              <View style={styles.titleRow}>
                <ClipboardList size={16} color={colors.tertiary} />
                <Text
                  style={[styles.reportNumber, { color: colors.primary }]}
                  numberOfLines={1}
                >
                  {item.fdReportNumber}
                </Text>
              </View>
              <View style={styles.badgeRow}>
                {item.fdListType ? (
                  <View
                    style={[
                      styles.modaBadge,
                      {
                        backgroundColor:
                          item.fdListType === 1
                            ? isDark
                              ? 'rgba(56, 189, 248, 0.15)'
                              : 'rgba(2, 132, 199, 0.1)'
                            : isDark
                            ? 'rgba(52, 211, 153, 0.15)'
                            : 'rgba(5, 150, 105, 0.1)',
                        borderColor:
                          item.fdListType === 1
                            ? '#0284C7'
                            : '#10B981',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modaBadgeText,
                        {
                          color:
                            item.fdListType === 1
                              ? isDark ? '#38BDF8' : '#0284C7'
                              : isDark ? '#34D399' : '#059669',
                        },
                      ]}
                    >
                      {item.fdListType === 1 ? '✈️ Udara' : '🚢 Laut'}
                    </Text>
                  </View>
                ) : null}
                <InspectionStatusBadge status={item.fdStatus} />
                <Text style={[styles.dateText, { color: colors.secondary }]}>
                  {formatDate(item.fdReportDate)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeButton,
                {
                  borderColor: colors.border,
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(0,0,0,0.04)',
                },
              ]}
            >
              <X size={18} color={colors.secondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {/* Customer Box */}
            <View
              style={[
                styles.cardBox,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.03)'
                    : 'rgba(0,0,0,0.02)',
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.secondary }]}>
                CUSTOMER
              </Text>
              <Text style={[styles.custName, { color: colors.primary }]}>
                {displayCustName(item.fdNamaCustomer)}
              </Text>
            </View>

            {/* Marking & Identifikasi */}
            <View
              style={[
                styles.cardBox,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.03)'
                    : 'rgba(0,0,0,0.02)',
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.secondary }]}>
                IDENTIFIKASI MUATAN
              </Text>

              <View style={styles.gridRow}>
                <View style={styles.gridCol}>
                  <Text style={[styles.fieldLabel, { color: colors.secondary }]}>
                    Marking Code
                  </Text>
                  <View style={styles.valueRow}>
                    <Tag size={13} color={colors.tertiary} />
                    <Text
                      style={[styles.fieldValue, { color: colors.primary }]}
                    >
                      {item.fdMarkingCode || '—'}
                    </Text>
                  </View>
                </View>

                <View style={styles.gridCol}>
                  <Text style={[styles.fieldLabel, { color: colors.secondary }]}>
                    Marking No
                  </Text>
                  <Text style={[styles.fieldValue, { color: colors.primary }]}>
                    {item.fdMarkingNo || '—'}
                  </Text>
                </View>
              </View>

              <View style={[styles.gridRow, { marginTop: 10 }]}>
                <View style={styles.gridCol}>
                  <Text style={[styles.fieldLabel, { color: colors.secondary }]}>
                    List Code
                  </Text>
                  <View style={styles.valueRow}>
                    <Hash size={13} color={colors.secondary} />
                    <Text
                      style={[styles.fieldValue, { color: colors.primary }]}
                    >
                      {item.fdListCode || '—'}
                    </Text>
                  </View>
                </View>

                <View style={styles.gridCol}>
                  <Text style={[styles.fieldLabel, { color: colors.secondary }]}>
                    No. Resi (Terima)
                  </Text>
                  <View style={styles.valueRow}>
                    <Receipt size={13} color={colors.secondary} />
                    <Text
                      style={[styles.fieldValue, { color: colors.primary }]}
                    >
                      {item.fdTerima || '—'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.gridRow, { marginTop: 10 }]}>
                <View style={styles.gridCol}>
                  <Text style={[styles.fieldLabel, { color: colors.secondary }]}>
                    Moda Pengiriman
                  </Text>
                  <View style={styles.valueRow}>
                    {item.fdListType === 1 ? (
                      <Plane size={13} color="#0284C7" />
                    ) : (
                      <Ship size={13} color="#10B981" />
                    )}
                    <Text
                      style={[
                        styles.fieldValue,
                        {
                          color:
                            item.fdListType === 1
                              ? isDark ? '#38BDF8' : '#0284C7'
                              : isDark ? '#34D399' : '#059669',
                        },
                      ]}
                    >
                      {item.fdListType === 1 ? 'Udara (Air)' : 'Laut (Sea)'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Keterangan / Pemeriksaan */}
            <View
              style={[
                styles.cardBox,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.03)'
                    : 'rgba(0,0,0,0.02)',
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.secondary }]}>
                HASIL PEMERIKSAAN / KETERANGAN
              </Text>
              <Text
                style={[
                  styles.remarksText,
                  { color: item.fdKeterangan ? colors.primary : colors.secondary },
                ]}
              >
                {item.fdKeterangan || 'Tidak ada catatan tambahan.'}
              </Text>
            </View>

            {/* Foto Pemeriksaan */}
            <View
              style={[
                styles.cardBox,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.03)'
                    : 'rgba(0,0,0,0.02)',
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: colors.secondary, marginBottom: 0 },
                  ]}
                >
                  FOTO PEMERIKSAAN ({photos.length})
                </Text>
                {onOpenPhotos && (
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      onOpenPhotos(item)
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Camera size={13} color={colors.tertiary} />
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: colors.tertiary,
                      }}
                    >
                      {photos.length > 0 ? 'Kelola Foto' : '+ Tambah Foto'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {photos.length === 0 ? (
                <TouchableOpacity
                  onPress={() => onOpenPhotos?.(item)}
                  style={{
                    paddingVertical: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: colors.border,
                    gap: 6,
                  }}
                >
                  <Camera size={18} color={colors.secondary} />
                  <Text style={{ fontSize: 12, color: colors.secondary }}>
                    Belum ada foto kargo. Tap untuk menambah foto.
                  </Text>
                </TouchableOpacity>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {photos.map((p) => (
                    <TouchableOpacity
                      key={p.fdId}
                      activeOpacity={0.8}
                      onPress={() => onOpenPhotos?.(item)}
                      style={{
                        width: 76,
                        height: 76,
                        borderRadius: 8,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Image
                        source={{ uri: getFullPhotoUrl(p.fdPhotoUrl) }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Audit Log */}
            <View
              style={[
                styles.cardBox,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.03)'
                    : 'rgba(0,0,0,0.02)',
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.secondary }]}>
                LOG & PEMBUAT
              </Text>

              <View style={styles.auditRow}>
                <User size={13} color={colors.secondary} />
                <Text style={[styles.auditText, { color: colors.secondary }]}>
                  Dibuat oleh:{' '}
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>
                    {item.fdCreatedBy || '—'}
                  </Text>
                </Text>
              </View>

              <View style={[styles.auditRow, { marginTop: 4 }]}>
                <Calendar size={13} color={colors.secondary} />
                <Text style={[styles.auditText, { color: colors.secondary }]}>
                  Waktu pembuatan: {formatDate(item.fdCreatedAt)}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Bar Footer */}
          <View
            style={[
              styles.footer,
              {
                borderTopColor: isDark
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(0,0,0,0.08)',
                paddingBottom: bottomInset + 8,
              },
            ]}
          >
            <TouchableOpacity
              onPress={handleDelete}
              style={[
                styles.deleteBtn,
                {
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                  backgroundColor: isDark
                    ? 'rgba(239, 68, 68, 0.1)'
                    : 'rgba(239, 68, 68, 0.08)',
                },
              ]}
            >
              <Trash2 size={16} color="#EF4444" />
              <Text style={styles.deleteText}>Hapus</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                onClose()
                onEdit(item)
              }}
              style={[
                styles.editBtn,
                {
                  backgroundColor: colors.tabBarActive,
                },
              ]}
            >
              <Edit2 size={16} color="#FFFFFF" />
              <Text style={styles.editText}>Edit BAP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: '85%',
    height: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  reportNumber: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  modaBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  modaBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  closeButton: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 24,
  },
  cardBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  custName: {
    fontSize: 14,
    fontWeight: '700',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridCol: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fieldValue: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  remarksText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  auditText: {
    fontSize: 11.5,
  },
  footer: {
    flexDirection: 'row',
    padding: 14,
    gap: 10,
    borderTopWidth: 1,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  deleteText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  editText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
})
