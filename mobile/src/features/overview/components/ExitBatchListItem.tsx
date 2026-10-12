import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useThemeStore } from '@/theme/themeStore'
import { useTranslation } from '@/hooks/useTranslation'
import { formatNumber, formatDecimal, formatDate } from '@/lib/utils'

interface ExitBatchListItemProps {
  batch: any
  activeScope: 'today' | 'yesterday' | 'tomorrow' | 'recent' | 'eta_not_exit' | 'missed_sla'
  onPress: (batch: any) => void
  onEditExitDate?: (batch: any) => void
}

export function ExitBatchListItem({ batch: b, activeScope, onPress, onEditExitDate }: ExitBatchListItemProps) {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'
  const { t } = useTranslation()

  const code = (b.fdMarkingCode || '').trim()
  const contOrAwb = (b.fdContNo || b.fdAWB || b.fdBLNo || '—').trim()
  const isTomorrow = activeScope === 'tomorrow'
  const isEtaNotExit = activeScope === 'eta_not_exit'
  const isMissedSla = activeScope === 'missed_sla'

  const isAir = b.fdListType === 1
  const modeColor = isAir ? '#E2B266' : '#5FA3D4'
  const modeText = isAir ? t('overview.air', 'Udara') : t('overview.sea', 'Laut')
  const lineColor = isDark ? '#222C38' : '#E3E7EC'

  let dateText = ''
  let dateColor = '#4CC38A'
  if (isTomorrow) {
    dateText = `Prediksi ${formatDate(b.predictedExitDate || b.fdETA)}`
    dateColor = '#E5A93C'
  } else if (isEtaNotExit) {
    dateText = `ETA ${formatDate(b.fdETA)}`
    dateColor = '#E5A93C'
  } else if (isMissedSla) {
    dateText = `ETA ${formatDate(b.fdETA)}`
    dateColor = '#EF6B5B'
  } else {
    dateText = `Exit ${formatDate(b.fdExitDate)}`
    dateColor = '#4CC38A'
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.batchRow, { borderTopColor: lineColor }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress(b)
      }}
    >
      {/* Baris 1: ID Batch + Type di kiri; Dot + Moda di kanan */}
      <View style={styles.b1}>
        <View style={styles.idGroup}>
          <Text style={[styles.batchId, { color: colors.primary }]} numberOfLines={1}>
            {code || '—'}
          </Text>
          {b.fdBranchCode?.trim() ? (
            <View style={[styles.typeTag, { borderColor: lineColor }]}>
              <Text style={[styles.typeText, { color: colors.secondary }]}>
                {b.fdBranchCode.trim()}
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

      {/* Baris 2: Kontainer/AWB tebal + Rute/Consignee */}
      <View style={styles.b2}>
        <Text style={[styles.boxText, { color: colors.primary }]}>
          {contOrAwb}
        </Text>
        {b.fdConsignee?.trim() ? (
          <Text style={[styles.routeText, { color: colors.secondary }]} numberOfLines={1}>
            {'   '}{b.fdConsignee.trim()}
          </Text>
        ) : null}
      </View>

      {/* Baris 3: Koli & Berat di kiri; Status Exit di kanan */}
      <View style={styles.b3}>
        <Text style={[styles.qtyText, { color: colors.secondary }]}>
          {formatNumber(b.fdJmlTerima || b.fdJmlPack || 0)} {b.fdSatuan?.trim() || 'koli'} · {formatDecimal(b.fdJmlBerat || 0, 1)} kg
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[styles.exitDateText, { color: dateColor }]}>
            {dateText}
          </Text>

          {isEtaNotExit && onEditExitDate && (
            <TouchableOpacity
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                onEditExitDate(b)
              }}
              style={[styles.exitActionBtn, { borderColor: '#4CC38A' }]}
            >
              <Text style={{ fontSize: 10, fontWeight: '600', color: '#4CC38A' }}>
                + Exit
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  batchRow: {
    paddingVertical: 16,
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
  batchId: {
    fontSize: 19,
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
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 14,
  },
  b2: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 4,
  },
  boxText: {
    fontSize: 14,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  routeText: {
    fontSize: 14,
  },
  b3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
  },
  qtyText: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  exitDateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  exitActionBtn: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
})
