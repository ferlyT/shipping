import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useThemeStore } from '@/theme/themeStore'
import { formatNumber, formatDecimal, displayCustName } from '@/lib/utils'

interface ShipmentListItemProps {
  item: any
  onPress: (item: any) => void
  onCreateBap?: (item: any) => void
}

export function ShipmentListItem({ item, onPress, onCreateBap }: ShipmentListItemProps) {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'
  const isAir = item.fdListType === 1
  const modeColor = isAir ? '#E2B266' : '#5FA3D4'
  const modeText = isAir ? 'Udara' : 'Laut'
  const lineColor = isDark ? '#222C38' : '#E3E7EC'

  const resiNo = item.fdTerima?.trim() || item.fdListCode?.trim() || '—'
  const custName = displayCustName(item.fdCustName)
  const markingDisplay = item.fdMarkingCode?.trim() || '—'

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.row, { borderTopColor: lineColor }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress(item)
      }}
    >
      {/* Baris 1: No Resi + Branch Tag di kiri; Dot + Moda di kanan */}
      <View style={styles.b1}>
        <View style={styles.idGroup}>
          <Text style={[styles.resiText, { color: colors.primary }]} numberOfLines={1}>
            {resiNo}
          </Text>
          {item.fdBranchCode?.trim() ? (
            <View style={[styles.typeTag, { borderColor: lineColor }]}>
              <Text style={[styles.typeText, { color: colors.secondary }]}>
                {item.fdBranchCode.trim()}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.modeGroup}>
          <View style={[styles.dot, { backgroundColor: modeColor }]} />
          <Text style={[styles.modeText, { color: colors.secondary }]}>
            {modeText}
          </Text>
        </View>
      </View>

      {/* Baris 2: Marking Code & Customer */}
      <View style={styles.b2}>
        <Text style={[styles.markingText, { color: colors.primary }]}>
          {markingDisplay}
          {item.fdMarkingNo?.trim() ? ` #${item.fdMarkingNo.trim()}` : ''}
        </Text>
        <Text style={[styles.custText, { color: colors.secondary }]} numberOfLines={1}>
          {'   '}{custName}
        </Text>
      </View>

      {/* Baris 3: Koli · Berat · M3 di kiri; Action BAP di kanan */}
      <View style={styles.b3}>
        <Text style={[styles.qtyText, { color: colors.secondary }]}>
          {formatNumber(item.fdJmlPack ?? item.fdColy)} {item.fdSatuan || 'koli'} · {formatDecimal(item.fdJmlBerat ?? item.fdWeight, 1)} kg · {formatDecimal(item.fdM3, 4)} m³
        </Text>

        {onCreateBap && (
          <TouchableOpacity
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            onPress={(e) => {
              e.stopPropagation()
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              onCreateBap(item)
            }}
            style={[styles.bapActionBtn, { borderColor: lineColor }]}
          >
            <Text style={{ fontSize: 11, fontWeight: '500', color: colors.primary }}>
              + BAP
            </Text>
          </TouchableOpacity>
        )}
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
  idGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  resiText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.1,
    fontVariant: ['tabular-nums'],
  },
  typeTag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 0.5,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  modeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
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
    marginVertical: 4,
  },
  markingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  custText: {
    fontSize: 13.5,
    flex: 1,
  },
  b3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  qtyText: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    flex: 1,
  },
  bapActionBtn: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
  },
})
