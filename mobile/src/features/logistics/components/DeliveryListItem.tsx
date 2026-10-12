import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useThemeStore } from '@/theme/themeStore'
import { formatDate, formatNumber, formatWeight } from '@/lib/utils'
import { getDeliveryOrderStatus } from '../utils/logistics.utils'

interface DeliveryListItemProps {
  item: any
}

export function DeliveryListItem({ item }: DeliveryListItemProps) {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'
  const status = getDeliveryOrderStatus(item)
  const lineColor = isDark ? '#222C38' : '#E3E7EC'

  const markingCode = item.fdMarkingCode?.trim()
  const markingNo = item.fdMarkingNo?.trim()
  const jmlPack = item.fdJmlPackSJ != null ? Number(item.fdJmlPackSJ) : null
  const satuan = item.fdSatuan?.trim() || 'koli'
  const jmlBerat = item.fdJmlBeratSJ != null ? Number(item.fdJmlBeratSJ) : null

  return (
    <View style={[styles.row, { borderTopColor: lineColor }]}>
      {/* Baris 1: No SJ di kiri, Status tag di kanan */}
      <View style={styles.b1}>
        <Text style={[styles.sjNoText, { color: colors.primary }]} numberOfLines={1}>
          {item.fdSJNo || item.fdDeliveryNo}
        </Text>
        <View style={[styles.statusTag, { borderColor: lineColor }]}>
          <Text style={[styles.statusTagText, { color: colors.secondary }]}>
            {status.label}
          </Text>
        </View>
      </View>

      {/* Baris 2: Nama Customer */}
      <View style={styles.b2}>
        <Text style={[styles.custName, { color: colors.primary }]} numberOfLines={1}>
          {item.fdCustNameSJ || item.fdCustName || 'Customer'}
        </Text>
      </View>

      {/* Detail Tambahan: Marking & Jumlah Pack / Berat */}
      {(markingCode || markingNo || jmlPack != null || jmlBerat != null) && (
        <View style={styles.detailRow}>
          {(markingCode || markingNo) && (
            <Text style={[styles.markingText, { color: colors.primary }]} numberOfLines={1}>
              {markingCode || '—'}{markingNo ? ` · ${markingNo}` : ''}
            </Text>
          )}
          {(jmlPack != null || jmlBerat != null) && (
            <Text style={[styles.qtyWeightText, { color: colors.secondary }]}>
              {jmlPack != null ? `${formatNumber(jmlPack)} ${satuan}` : '—'}
              {jmlBerat != null ? ` · ${formatWeight(jmlBerat)}` : ''}
            </Text>
          )}
        </View>
      )}

      {/* Baris 3: Supir & Mobil di kiri; Tanggal di kanan */}
      <View style={styles.b3}>
        <Text style={[styles.metaText, { color: colors.secondary }]}>
          Supir: {item.fdSupir || item.fdDriverName || '—'} ({item.fdCarID || item.fdPoliceNo || '—'})
        </Text>
        <Text style={[styles.dateText, { color: colors.secondary }]}>
          {item.fdEstimasi ? `Estimasi ${formatDate(item.fdEstimasi)}` : formatDate(item.fdSJDate || item.fdDeliveryDate)}
        </Text>
      </View>

      {item.fdGiveDate && (
        <Text style={[styles.giveDateText, { color: colors.secondary }]}>
          Serah kantor: {formatDate(item.fdGiveDate)}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  b1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sjNoText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.1,
    fontVariant: ['tabular-nums'],
    flex: 1,
    marginRight: 8,
  },
  statusTag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 0.5,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  b2: {
    marginVertical: 2,
  },
  custName: {
    fontSize: 14.5,
    fontWeight: '500',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2.5,
    gap: 8,
  },
  markingText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    fontVariant: ['tabular-nums'],
  },
  qtyWeightText: {
    fontSize: 12.5,
    fontVariant: ['tabular-nums'],
  },
  b3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  metaText: {
    fontSize: 13,
    flex: 1,
  },
  dateText: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  giveDateText: {
    fontSize: 12,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
})
