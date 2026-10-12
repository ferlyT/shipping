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
  const { mode } = useThemeStore()
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

  // Semantic tokens from mobile-design-rules.md
  const lineColor = isDark ? '#222C38' : '#E3E7EC'
  const surfaceColor = isDark ? '#131A23' : '#FFFFFF'
  const textColor = isDark ? '#EEF2F6' : '#141B24'
  const mutedColor = isDark ? '#8A97A6' : '#657080'
  const airColor = isDark ? '#E2B266' : '#A9741C'
  const seaColor = isDark ? '#5FA3D4' : '#256A9E'
  const okColor = isDark ? '#4CC38A' : '#17855A'
  const warnColor = isDark ? '#E5A93C' : '#A97612'
  const lateColor = isDark ? '#EF6B5B' : '#C4402F'
  const accentColor = isDark ? '#E0644E' : '#B8402C'

  const isAir = item.fdListType === 1
  const modaColor = isAir ? airColor : seaColor
  const isDone = item.fdStatus === '2'
  const statusColor = isDone ? okColor : warnColor
  const statusLabel = isDone ? 'Selesai' : 'Draft'

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
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: isDark ? '#0C1118' : '#F6F7F9' }]}>
        {/* Sticky Header Bar */}
        <View
          style={[
            styles.bar,
            {
              borderBottomColor: lineColor,
              backgroundColor: isDark ? 'rgba(12,17,24,0.95)' : 'rgba(246,247,249,0.95)',
              paddingTop: Platform.OS === 'android'
                ? Math.max(insets.top, 24) + 12
                : Math.max(insets.top, 16) + 10,
            },
          ]}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={[styles.reportNumber, { color: textColor }]} numberOfLines={1}>
              {item.fdReportNumber}
            </Text>
            <View style={styles.t2}>
              {item.fdListType ? (
                <View style={styles.modaWrap}>
                  <View style={[styles.dot, { backgroundColor: modaColor }]} />
                  <Text style={[styles.modaText, { color: mutedColor }]}>
                    {isAir ? 'Udara' : 'Laut'}
                  </Text>
                </View>
              ) : null}
              <View style={[styles.tag, { borderColor: isDone ? okColor : warnColor }]}>
                <Text style={[styles.tagText, { color: statusColor }]}>
                  {statusLabel}
                </Text>
              </View>
              <Text style={[styles.dateText, { color: mutedColor }]}>
                {formatDate(item.fdReportDate)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            style={[
              styles.iconBtn,
              {
                borderColor: lineColor,
                backgroundColor: surfaceColor,
              },
            ]}
          >
            <X size={20} color={textColor} />
          </TouchableOpacity>
        </View>

        {/* Scroll Content */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomInset + 80 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Customer Section */}
          <View style={[styles.section, styles.sectionFirst]}>
            <Text style={[styles.lbl, { color: mutedColor }]}>Customer</Text>
            <Text style={[styles.cust, { color: textColor }]} numberOfLines={2}>
              {displayCustName(item.fdNamaCustomer)}
            </Text>
          </View>

          {/* Identifikasi Muatan */}
          <View style={[styles.section, { borderTopColor: lineColor }]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Identifikasi muatan</Text>
            <View style={styles.stats}>
              <View style={[styles.statBox, { borderLeftColor: lineColor }]}>
                <Text style={[styles.statDt, { color: mutedColor }]}>Marking code</Text>
                <Text style={[styles.statDd, { color: item.fdMarkingCode ? textColor : mutedColor }]}>
                  {item.fdMarkingCode || '—'}
                </Text>
              </View>

              <View style={[styles.statBox, { borderLeftColor: lineColor }]}>
                <Text style={[styles.statDt, { color: mutedColor }]}>Marking no</Text>
                <Text style={[styles.statDd, { color: item.fdMarkingNo ? textColor : mutedColor }]}>
                  {item.fdMarkingNo || '—'}
                </Text>
              </View>

              <View style={[styles.statBox, { borderLeftColor: lineColor }]}>
                <Text style={[styles.statDt, { color: mutedColor }]}>List code</Text>
                <Text style={[styles.statDd, { color: item.fdListCode ? textColor : mutedColor }]}>
                  {item.fdListCode || '—'}
                </Text>
              </View>

              <View style={[styles.statBox, { borderLeftColor: lineColor }]}>
                <Text style={[styles.statDt, { color: mutedColor }]}>No. resi (terima)</Text>
                <Text style={[styles.statDd, { color: item.fdTerima ? textColor : mutedColor }]}>
                  {item.fdTerima || '—'}
                </Text>
              </View>
            </View>
          </View>

          {/* Hasil pemeriksaan / catatan */}
          <View style={[styles.section, { borderTopColor: lineColor }]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Hasil pemeriksaan / catatan</Text>
            <Text
              style={[
                styles.note,
                { color: item.fdKeterangan ? textColor : mutedColor },
              ]}
            >
              {item.fdKeterangan ? item.fdKeterangan.trim() : 'Tidak ada catatan tambahan.'}
            </Text>
          </View>

          {/* Foto pemeriksaan */}
          <View style={[styles.section, { borderTopColor: lineColor }]}>
            <View style={styles.photoHeaderRow}>
              <View style={styles.photoTitleWrap}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Foto pemeriksaan</Text>
                <View style={[styles.countBadge, { borderColor: lineColor }]}>
                  <Text style={[styles.countText, { color: mutedColor }]}>{photos.length}</Text>
                </View>
              </View>

              {onOpenPhotos && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    onOpenPhotos(item)
                  }}
                  activeOpacity={0.7}
                  style={styles.linkBtn}
                >
                  <Camera size={18} color={accentColor} />
                  <Text style={[styles.linkBtnText, { color: accentColor }]}>Tambah foto</Text>
                </TouchableOpacity>
              )}
            </View>

            {photos.length === 0 ? (
              <Text style={[styles.note, { color: mutedColor }]}>Belum ada foto kargo.</Text>
            ) : (
              <View style={styles.photosGrid}>
                {photos.map((p) => (
                  <TouchableOpacity
                    key={p.fdId}
                    activeOpacity={0.85}
                    onPress={() => onOpenPhotos?.(item)}
                    style={[styles.photoCard, { borderColor: lineColor }]}
                  >
                    <Image
                      source={{ uri: getFullPhotoUrl(p.fdPhotoUrl) }}
                      style={styles.photoImg}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Riwayat dokumen */}
          <View style={[styles.section, { borderTopColor: lineColor }]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Riwayat dokumen</Text>
            <View style={styles.kv}>
              <View style={styles.kvRow}>
                <Text style={[styles.kvDt, { color: mutedColor }]}>Dibuat oleh</Text>
                <Text style={[styles.kvDd, { color: textColor }]}>{item.fdCreatedBy || '—'}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={[styles.kvDt, { color: mutedColor }]}>Tanggal</Text>
                <Text style={[styles.kvDd, { color: textColor }]}>{formatDate(item.fdCreatedAt)}</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Floating Actions Bar */}
        <View
          style={[
            styles.actionsBar,
            {
              borderTopColor: lineColor,
              backgroundColor: isDark ? 'rgba(12,17,24,0.95)' : 'rgba(246,247,249,0.95)',
              paddingBottom: bottomInset + 12,
            },
          ]}
        >
          <View style={styles.actionsInner}>
            <TouchableOpacity
              onPress={handleDelete}
              activeOpacity={0.7}
              style={[
                styles.btn,
                styles.btnDel,
                {
                  borderColor: lateColor,
                },
              ]}
            >
              <Trash2 size={20} color={lateColor} />
              <Text style={[styles.btnText, { color: lateColor }]}>Hapus</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                onClose()
                onEdit(item)
              }}
              activeOpacity={0.85}
              style={[
                styles.btn,
                styles.btnMain,
                {
                  backgroundColor: accentColor,
                  borderColor: accentColor,
                },
              ]}
            >
              <Edit2 size={20} color="#FFFFFF" />
              <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Edit BAP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  bar: {
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 10,
  },
  reportNumber: {
    fontSize: 19,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },
  t2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  modaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modaText: {
    fontSize: 14,
    fontWeight: '400',
  },
  tag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 14,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  section: {
    paddingVertical: 22,
    borderTopWidth: 1,
  },
  sectionFirst: {
    borderTopWidth: 0,
    paddingTop: 18,
    paddingBottom: 22,
  },
  lbl: {
    fontSize: 13,
    marginBottom: 4,
  },
  cust: {
    fontSize: 22,
    fontWeight: '500',
    lineHeight: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 18,
    columnGap: 16,
    marginTop: 14,
  },
  statBox: {
    width: '47%',
    borderLeftWidth: 2,
    paddingLeft: 12,
  },
  statDt: {
    fontSize: 12,
    marginBottom: 2,
  },
  statDd: {
    fontSize: 18,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  note: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
  },
  photoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 1,
    marginLeft: 8,
  },
  countText: {
    fontSize: 13,
    fontWeight: '400',
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
  },
  linkBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  photoCard: {
    width: '48%',
    aspectRatio: 4 / 3,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  kv: {
    marginTop: 8,
    gap: 6,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  kvDt: {
    fontSize: 14,
  },
  kvDd: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionsBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  actionsInner: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  btnDel: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  btnMain: {
    flex: 2,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  },
})
