import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Edit2, Camera, ChevronRight } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useThemeStore } from '@/theme/themeStore'
import { displayCustName } from '@/lib/utils'
import type { DataRevision } from '../types/dataRevisions.types'

interface Props {
  item: DataRevision
  onPress: () => void
  onEdit?: (item: DataRevision) => void
  onPressPhoto?: (item: DataRevision) => void
}

export function DataRevisionCard({ item, onPress, onEdit, onPressPhoto }: Props) {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'
  const lineColor = isDark ? '#222C38' : '#E3E7EC'

  const isCancel = item.fdAksi === 'CANCEL_DATA'
  const isPending = item.fdStatus === 'PENDING'
  const isBilled = item.fdStatus === 'BILL_CREATED' || item.fdStatus === 'BILL_TERBUAT'

  const firstDetail = item.details?.[0]
  const inputCode = isCancel
    ? firstDetail?.fdAwalNoInputan || firstDetail?.fdBaruNoInputan
    : firstDetail?.fdBaruNoInputan || firstDetail?.fdAwalNoInputan

  const custName = isCancel
    ? firstDetail?.fdAwalCustName || firstDetail?.fdBaruCustName
    : firstDetail?.fdBaruCustName || firstDetail?.fdAwalCustName

  const photoCount = item.lampiran?.length ?? item._count?.lampiran ?? 0

  const statusLabel = isPending
    ? 'Menunggu'
    : isBilled
    ? 'Bill terbit'
    : 'Dibatalkan'

  const statusColor = isBilled
    ? isDark ? '#4CC38A' : '#17855A'
    : isPending
    ? isDark ? '#E5A93C' : '#A97612'
    : isDark ? '#EF6B5B' : '#C4402F'

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress()
      }}
      style={[styles.row, { borderTopColor: lineColor }]}
    >
      {/* Baris 1: Nomor Form + Tanggal */}
      <View style={styles.f1}>
        <Text style={[styles.formNoText, { color: colors.primary }]} numberOfLines={1}>
          {item.fdNomorForm}
        </Text>
        <Text style={[styles.dateText, { color: colors.secondary }]}>
          {item.fdTanggal ? item.fdTanggal.substring(0, 10) : '-'}
        </Text>
      </View>

      {/* Baris Tags: Status Tag */}
      <View style={styles.tagsRow}>
        <View style={[styles.tag, { borderColor: statusColor }]}>
          <Text style={[styles.tagText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
        <View style={[styles.tag, { borderColor: lineColor }]}>
          <Text style={[styles.tagText, { color: colors.secondary }]}>
            {isCancel ? 'Cancel data' : 'Buat bill'}
          </Text>
        </View>
      </View>

      {/* Baris 2: DL Info (No inputan, Pelanggan) + Icon Edit Button di kanan */}
      <View style={styles.f2}>
        <View style={styles.dlBox}>
          <View style={styles.dlRow}>
            <Text style={[styles.dtText, { color: colors.secondary }]}>No. inputan</Text>
            <Text style={[styles.ddText, { color: colors.primary }]} numberOfLines={1}>
              {inputCode || '—'}
            </Text>
          </View>
          <View style={styles.dlRow}>
            <Text style={[styles.dtText, { color: colors.secondary }]}>Pelanggan</Text>
            <Text style={[styles.ddText, { color: colors.primary }]} numberOfLines={1}>
              {custName ? displayCustName(custName) : '—'}
            </Text>
          </View>
        </View>

        {onEdit && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={(e) => {
              e.stopPropagation()
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              onEdit(item)
            }}
            style={[
              styles.iconBtn,
              {
                borderColor: lineColor,
                backgroundColor: isDark ? '#131A23' : '#FFFFFF',
              },
            ]}
            accessibilityLabel={`Ubah form ${item.fdNomorForm}`}
          >
            <Edit2 size={17} color={colors.secondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Baris 3: User Dibuat di kiri + Button Foto/Detail di kanan */}
      <View style={styles.f3}>
        <Text style={[styles.userText, { color: colors.secondary }]} numberOfLines={1}>
          {item.fdDibuatOleh || item.fdCreatedBy || '—'}
        </Text>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={(e) => {
            if (onPressPhoto) {
              e.stopPropagation()
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              onPressPhoto(item)
            } else {
              onPress()
            }
          }}
          style={styles.openBtn}
        >
          <View style={styles.photoCountRow}>
            <Camera size={15} color={colors.secondary} />
            <Text style={[styles.photoCountText, { color: colors.secondary }]}>
              {photoCount} foto
            </Text>
          </View>
          <ChevronRight size={16} color={colors.secondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 18,
    borderTopWidth: 1,
  },
  f1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  formNoText: {
    fontSize: 19,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
    flex: 1,
    marginRight: 10,
  },
  dateText: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 8,
  },
  tag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  f2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 2,
  },
  dlBox: {
    flex: 1,
    gap: 4,
  },
  dlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dtText: {
    fontSize: 13.5,
    width: 86,
  },
  ddText: {
    fontSize: 14.5,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    flex: 1,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  f3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  userText: {
    fontSize: 13.5,
    flex: 1,
    marginRight: 8,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingLeft: 8,
  },
  photoCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  photoCountText: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
})
