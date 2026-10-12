import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useThemeStore } from '@/theme/themeStore'
import { formatCurrency, formatDate, displayCustName } from '@/lib/utils'
import { getAgingDays } from '../utils/finance.utils'

interface ValidationListItemProps {
  item: any
  onPress: (item: any) => void
}

export function ValidationListItem({ item, onPress }: ValidationListItemProps) {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'
  const aging = getAgingDays(item.fdInvDate)
  const amount = item.totalJumlah ?? item.fdTotalAmount ?? item.fdJumlah1 ?? item.fdJumlah2 ?? 0
  const isAir = item.fdListType === 1
  const modeColor = isAir ? '#E2B266' : '#5FA3D4'
  const modeText = isAir ? 'Udara' : 'Laut'
  const lineColor = isDark ? '#222C38' : '#E3E7EC'

  // Warna Aging: <=7 hari (--ok), 8-14 hari (--warn), >30 hari (--late)
  const agingColor = aging > 30 ? '#EF6B5B' : aging > 7 ? '#E5A93C' : '#4CC38A'

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.row, { borderTopColor: lineColor }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress(item)
      }}
    >
      {/* Baris 1: No Invoice di kiri; Aging Tag & Dot Moda di kanan */}
      <View style={styles.b1}>
        <Text style={[styles.invNoText, { color: colors.primary }]} numberOfLines={1}>
          {item.fdInvNo}
        </Text>

        <View style={styles.rightGroup}>
          <View style={[styles.agingTag, { borderColor: agingColor }]}>
            <Text style={[styles.agingTagText, { color: agingColor }]}>
              {aging} hari
            </Text>
          </View>
          <View style={styles.modeGroup}>
            <View style={[styles.dot, { backgroundColor: modeColor }]} />
            <Text style={[styles.modeText, { color: colors.secondary }]}>
              {modeText}
            </Text>
          </View>
        </View>
      </View>

      {/* Baris 2: Nama Customer & Pembuat */}
      <View style={styles.b2}>
        <Text style={[styles.custNameText, { color: colors.primary }]} numberOfLines={1}>
          {displayCustName(item.customer?.fdCustName || item.fdCustName || item.fdBillTo)}
        </Text>
        {item.employee?.fdEmpName?.trim() && (
          <Text style={[styles.empText, { color: colors.secondary }]} numberOfLines={1}>
            {'   · '}{item.employee.fdEmpName.trim()}
          </Text>
        )}
      </View>

      {/* Baris Marking Code & Marking No jika tersedia (Baris Terpisah) */}
      {(item.fdMarkingCode || item.fdMarkingNo) ? (
        <View style={styles.bMarking}>
          <Text style={[styles.markingLabel, { color: colors.secondary }]}>Marking:</Text>
          <Text style={[styles.markingText, { color: colors.primary }]} numberOfLines={1}>
            {item.fdMarkingCode?.trim() || ''}{item.fdMarkingNo ? ` #${item.fdMarkingNo.trim()}` : ''}
          </Text>
        </View>
      ) : null}

      {/* Baris 3: Tanggal di kiri; Nominal Rp di kanan */}
      <View style={styles.b3}>
        <Text style={[styles.dateText, { color: colors.secondary }]}>
          {formatDate(item.fdInvDate)}
        </Text>

        <Text style={[styles.amountText, { color: colors.primary }]}>
          {formatCurrency(amount)}
        </Text>
      </View>
    </TouchableOpacity>
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
  invNoText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.1,
    fontVariant: ['tabular-nums'],
    flex: 1,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  agingTag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 0.5,
  },
  agingTagText: {
    fontSize: 11,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  modeGroup: {
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
    fontSize: 13.5,
  },
  b2: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 2,
  },
  custNameText: {
    fontSize: 14,
    fontWeight: '500',
  },
  empText: {
    fontSize: 13,
  },
  bMarking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 2,
  },
  markingLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  markingText: {
    fontSize: 12.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    flex: 1,
  },
  b3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  dateText: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  amountText: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
})
