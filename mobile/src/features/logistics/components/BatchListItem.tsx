import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useThemeStore } from '@/theme/themeStore'
import { formatNumber, formatDecimal, formatDate } from '@/lib/utils'
import { getBatchDateDisplay } from '../utils/logistics.utils'

interface BatchListItemProps {
  item: any
  onPress: (item: any) => void
  onEditExitDate?: (item: any) => void
}

export function BatchListItem({ item, onPress, onEditExitDate }: BatchListItemProps) {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'
  const isAir = item.fdListType === 1
  const modeColor = isAir ? '#E2B266' : '#5FA3D4'
  const modeText = isAir ? 'Udara' : 'Laut'
  const lineColor = isDark ? '#222C38' : '#E3E7EC'

  const dateInfo = getBatchDateDisplay(item)
  const batchNumber = item.fdListType === 1 ? item.fdAWB?.trim() : item.fdContNo?.trim()

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.row, { borderTopColor: lineColor }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress(item)
      }}
    >
      {/* Baris 1: Marking Code + Branch Tag di kiri; Dot + Moda di kanan */}
      <View style={styles.b1}>
        <View style={styles.idGroup}>
          <Text style={[styles.codeText, { color: colors.primary }]} numberOfLines={1}>
            {item.fdMarkingCode?.trim() || '—'}
          </Text>
          {item.fdBranchCode?.trim() || item.fdBranch?.trim() ? (
            <View style={[styles.typeTag, { borderColor: lineColor }]}>
              <Text style={[styles.typeText, { color: colors.secondary }]}>
                {(item.fdBranchCode?.trim() || item.fdBranch?.trim() || 'Pusat')}
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

      {/* Baris 2: Kontainer/AWB tebal + Keterangan */}
      <View style={styles.b2}>
        <Text style={[styles.batchNumText, { color: colors.primary }]}>
          {batchNumber || '—'}
        </Text>
        {item.fdKet?.trim() ? (
          <Text style={[styles.ketText, { color: colors.secondary }]} numberOfLines={1}>
            {'   '}{item.fdKet.trim()}
          </Text>
        ) : null}
      </View>

      {/* Baris 3: Koli & Berat di kiri; Info Exit di kanan */}
      <View style={styles.b3}>
        <Text style={[styles.qtyText, { color: colors.secondary }]}>
          {formatNumber(item.fdJmlPack || 0)} pack · {formatDecimal(item.fdJmlBerat || 0, 1)} kg
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {dateInfo ? (
            <Text
              style={[
                styles.dateText,
                { color: item.fdExitDate ? '#4CC38A' : '#E5A93C' },
              ]}
            >
              {dateInfo.label} {formatDate(dateInfo.date)}
            </Text>
          ) : null}

          {onEditExitDate && (
            <TouchableOpacity
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                onEditExitDate(item)
              }}
              style={[
                styles.exitBtn,
                {
                  borderColor: item.fdExitDate ? '#4CC38A' : lineColor,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 10.5,
                  fontWeight: '600',
                  color: item.fdExitDate ? '#4CC38A' : colors.primary,
                }}
              >
                {item.fdExitDate ? 'Exit' : '+ Exit'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
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
  codeText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.1,
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
  batchNumText: {
    fontSize: 14,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  ketText: {
    fontSize: 13,
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
  dateText: {
    fontSize: 13,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  exitBtn: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
})

