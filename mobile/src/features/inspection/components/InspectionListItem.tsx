import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import * as Haptics from 'expo-haptics'
import { ClipboardList, Calendar, Tag, User, Camera } from 'lucide-react-native'
import { Card } from '@/components/ui/Card'
import { useThemeStore } from '@/theme/themeStore'
import { formatDate, displayCustName } from '@/lib/utils'
import { InspectionStatusBadge } from './InspectionStatusBadge'
import type { InspectionReport } from '../types/inspectionReport.types'

interface Props {
  item: InspectionReport
  onPress: (item: InspectionReport) => void
  onPressPhoto?: (item: InspectionReport) => void
}

export function InspectionListItem({ item, onPress, onPressPhoto }: Props) {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'
  const photoCount = item.photoCount ?? item.photos?.length ?? 0
  const hasPhotos = photoCount > 0

  return (
    <Card
      style={styles.card}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress(item)
      }}
    >
      {/* Top Header: Report Number & Status Badge */}
      <View style={styles.headerRow}>
        <View style={styles.numberRow}>
          <ClipboardList size={14} color={colors.tertiary} />
          <Text style={[styles.reportNumber, { color: colors.primary }]}>
            {item.fdReportNumber}
          </Text>
        </View>
        <View style={styles.headerRightBadges}>
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
                      ? isDark
                        ? '#0284C7'
                        : '#0284C7'
                      : isDark
                      ? '#059669'
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
                        ? isDark
                          ? '#38BDF8'
                          : '#0284C7'
                        : isDark
                        ? '#34D399'
                        : '#059669',
                  },
                ]}
              >
                {item.fdListType === 1 ? '✈️ Udara' : '🚢 Laut'}
              </Text>
            </View>
          ) : null}
          <InspectionStatusBadge status={item.fdStatus} />
        </View>
      </View>

      {/* Customer Name */}
      <Text style={[styles.customerName, { color: colors.primary }]} numberOfLines={1}>
        {displayCustName(item.fdNamaCustomer)}
      </Text>

      {/* Marking & List Code */}
      {(item.fdMarkingCode || item.fdMarkingNo || item.fdListCode) && (
        <View style={styles.markingRow}>
          <Tag size={12} color={colors.secondary} />
          <Text style={[styles.markingText, { color: colors.secondary }]} numberOfLines={1}>
            {item.fdMarkingCode ? item.fdMarkingCode.trim() : '—'}
            {item.fdMarkingNo ? ` (${item.fdMarkingNo.trim()})` : ''}
            {item.fdListCode ? ` • List: ${item.fdListCode.trim()}` : ''}
          </Text>
        </View>
      )}

      {/* Remarks preview if present */}
      {item.fdKeterangan ? (
        <Text style={[styles.remarks, { color: colors.secondary }]} numberOfLines={2}>
          {item.fdKeterangan.trim()}
        </Text>
      ) : null}

      {/* Footer: Date, Author & Photo Action */}
      <View
        style={[
          styles.footerRow,
          {
            borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        <View style={styles.metaLeft}>
          <View style={styles.metaItem}>
            <Calendar size={11} color={colors.secondary} />
            <Text style={[styles.metaText, { color: colors.secondary }]}>
              {formatDate(item.fdReportDate)}
            </Text>
          </View>

          {item.fdCreatedBy ? (
            <View style={styles.metaItem}>
              <User size={11} color={colors.secondary} />
              <Text style={[styles.metaText, { color: colors.secondary }]}>
                {item.fdCreatedBy}
              </Text>
            </View>
          ) : null}
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
                borderColor: hasPhotos ? colors.tertiary : colors.border,
                backgroundColor: hasPhotos
                  ? isDark
                    ? 'rgba(56, 189, 248, 0.15)'
                    : 'rgba(2, 132, 199, 0.1)'
                  : isDark
                  ? 'rgba(255, 255, 255, 0.04)'
                  : 'rgba(0, 0, 0, 0.04)',
              },
            ]}
          >
            <Camera size={12} color={hasPhotos ? colors.tertiary : colors.secondary} />
            <Text
              style={[
                styles.photoBtnText,
                { color: hasPhotos ? colors.tertiary : colors.secondary },
              ]}
            >
              {hasPhotos ? `${photoCount} Foto` : 'Tambah Foto'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerRightBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  reportNumber: {
    fontSize: 13.5,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
  },
  customerName: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  markingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  markingText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  remarks: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
    marginBottom: 4,
    lineHeight: 15,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
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
    fontWeight: '600',
  },
})
