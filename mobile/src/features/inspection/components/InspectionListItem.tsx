import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Camera } from 'lucide-react-native'
import { useThemeStore } from '@/theme/themeStore'
import { formatDate, displayCustName } from '@/lib/utils'
import type { InspectionReport } from '../types/inspectionReport.types'

interface Props {
  item: InspectionReport
  onPress: (item: InspectionReport) => void
  onPressPhoto?: (item: InspectionReport) => void
}

export function InspectionListItem({ item, onPress, onPressPhoto }: Props) {
  const { mode } = useThemeStore()
  const isDark = mode === 'midnight'

  const photoCount = item.photoCount ?? item.photos?.length ?? 0
  const hasPhotos = photoCount > 0

  // Semantic tokens from mobile-design-rules.md
  const lineColor = isDark ? '#222C38' : '#E3E7EC'
  const textColor = isDark ? '#EEF2F6' : '#141B24'
  const mutedColor = isDark ? '#8A97A6' : '#657080'
  const airColor = isDark ? '#E2B266' : '#A9741C'
  const seaColor = isDark ? '#5FA3D4' : '#256A9E'
  const okColor = isDark ? '#4CC38A' : '#17855A'
  const warnColor = isDark ? '#E5A93C' : '#A97612'

  const isAir = item.fdListType === 1
  const modaColor = isAir ? airColor : seaColor
  const isDone = item.fdStatus === '2'
  const statusColor = isDone ? okColor : warnColor
  const statusLabel = isDone ? 'Selesai' : 'Draft'

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress(item)
      }}
      style={[styles.row, { borderTopColor: lineColor }]}
    >
      {/* Baris 1: Nomor BAP (tabular-nums), Dot Moda, Tag Status, & Tombol Foto */}
      <View style={styles.topRow}>
        <View style={styles.leftMeta}>
          <Text style={[styles.reportNumber, { color: textColor }]}>
            {item.fdReportNumber}
          </Text>

          {item.fdListType ? (
            <View style={styles.modaWrap}>
              <View style={[styles.dot, { backgroundColor: modaColor }]} />
              <Text style={[styles.modaText, { color: mutedColor }]}>
                {isAir ? 'Udara' : 'Laut'}
              </Text>
            </View>
          ) : null}

          <View style={[styles.statusTag, { borderColor: lineColor }]}>
            <Text style={[styles.statusTagText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {onPressPhoto && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={(e) => {
              e.stopPropagation()
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              onPressPhoto(item)
            }}
            style={[
              styles.photoBtn,
              {
                borderColor: hasPhotos ? lineColor : lineColor,
                backgroundColor: hasPhotos
                  ? (isDark ? '#131A23' : '#FFFFFF')
                  : 'transparent',
              },
            ]}
          >
            <Camera size={12} color={hasPhotos ? (isDark ? '#EEF2F6' : '#141B24') : mutedColor} />
            <Text
              style={[
                styles.photoBtnText,
                { color: hasPhotos ? (isDark ? '#EEF2F6' : '#141B24') : mutedColor },
              ]}
            >
              {hasPhotos ? `${photoCount} foto` : '+ foto'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Baris 2: Nama Customer */}
      <Text style={[styles.customerName, { color: textColor }]} numberOfLines={1}>
        {displayCustName(item.fdNamaCustomer)}
      </Text>

      {/* Baris 3: Identifikasi Muatan (Marking, No, List) */}
      {(item.fdMarkingCode || item.fdMarkingNo || item.fdListCode) && (
        <Text style={[styles.markingText, { color: mutedColor }]} numberOfLines={1}>
          {item.fdMarkingCode ? item.fdMarkingCode.trim() : '—'}
          {item.fdMarkingNo ? ` (${item.fdMarkingNo.trim()})` : ''}
          {item.fdListCode ? ` · List ${item.fdListCode.trim()}` : ''}
          {item.fdTerima ? ` · Resi ${item.fdTerima.trim()}` : ''}
        </Text>
      )}

      {/* Baris 4: Keterangan (jika ada) */}
      {item.fdKeterangan ? (
        <Text style={[styles.keteranganText, { color: mutedColor }]} numberOfLines={2}>
          {item.fdKeterangan.trim()}
        </Text>
      ) : null}

      {/* Baris 5: Tanggal & Pembuat */}
      <View style={styles.footerRow}>
        <Text style={[styles.dateText, { color: mutedColor }]}>
          {formatDate(item.fdReportDate)}
        </Text>
        {item.fdCreatedBy ? (
          <Text style={[styles.authorText, { color: mutedColor }]}>
            oleh {item.fdCreatedBy}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  leftMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  reportNumber: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },
  modaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusTag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  photoBtnText: {
    fontSize: 11,
    fontWeight: '500',
  },
  customerName: {
    fontSize: 14.5,
    fontWeight: '500',
    marginBottom: 3,
    lineHeight: 19,
  },
  markingText: {
    fontSize: 13,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
    marginBottom: 3,
  },
  keteranganText: {
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 2,
    marginBottom: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  dateText: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  authorText: {
    fontSize: 12,
  },
})
