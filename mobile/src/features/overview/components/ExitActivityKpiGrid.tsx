import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Card } from '@/components/ui/Card'
import { useThemeStore } from '@/theme/themeStore'
import { useTranslation } from '@/hooks/useTranslation'
import { formatNumber } from '@/lib/utils'

type ExitScope = 'today' | 'yesterday' | 'tomorrow' | 'recent' | 'eta_not_exit' | 'missed_sla'

interface ExitActivityKpiGridProps {
  activeScope: ExitScope
  markingKpis: any
  onScopeChange: (scope: ExitScope) => void
}

export function ExitActivityKpiGrid({
  activeScope,
  markingKpis,
  onScopeChange,
}: ExitActivityKpiGridProps) {
  const { colors, mode } = useThemeStore()
  const { t } = useTranslation()
  const isDark = mode === 'midnight'

  return (
    <View style={styles.kpiGrid}>
      {/* 1. Kemarin */}
      <View style={styles.kpiCol}>
        <Card
          onPress={() => onScopeChange('yesterday')}
          style={{
            padding: 10,
            borderWidth: activeScope === 'yesterday' ? 2 : 1,
            borderColor: activeScope === 'yesterday'
              ? colors.tertiary
              : (isDark ? colors.border : '#E2E8F0'),
            backgroundColor: activeScope === 'yesterday'
              ? (isDark ? 'rgba(56, 189, 248, 0.16)' : '#F0F9FF')
              : colors.surface,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text
              style={[styles.kpiTitle, { color: activeScope === 'yesterday' ? (isDark ? colors.tertiary : '#0284C7') : colors.secondary, flex: 1 }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {t('overview.yesterday', 'Kemarin').toUpperCase()}
            </Text>
            {activeScope === 'yesterday' ? (
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isDark ? colors.tertiary : '#0284C7', flexShrink: 0, marginLeft: 4 }} />
            ) : null}
          </View>
          <Text
            style={[styles.kpiValue, { color: activeScope === 'yesterday' ? (isDark ? colors.tertiary : '#0369A1') : colors.primary }]}
            numberOfLines={1}
          >
            {formatNumber(markingKpis?.exitYesterdayCount || 0)}
          </Text>
          <Text style={{ fontSize: 10.5, color: colors.secondary }} numberOfLines={1} ellipsizeMode="tail">
            {t('overview.air', 'Udara')}: {markingKpis?.exitYesterdayAir || 0} • {t('overview.sea', 'Laut')}: {markingKpis?.exitYesterdaySea || 0}
          </Text>
        </Card>
      </View>

      {/* 2. Hari Ini */}
      <View style={styles.kpiCol}>
        <Card
          onPress={() => onScopeChange('today')}
          style={{
            padding: 10,
            borderWidth: activeScope === 'today' ? 2 : 1,
            borderColor: activeScope === 'today'
              ? (isDark ? '#10B981' : '#059669')
              : (isDark ? 'rgba(16, 185, 129, 0.35)' : '#D1FAE5'),
            backgroundColor: activeScope === 'today'
              ? (isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5')
              : colors.surface,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text
              style={[styles.kpiTitle, { color: activeScope === 'today' ? (isDark ? '#10B981' : '#059669') : (isDark ? '#10B981' : '#059669'), flex: 1 }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {t('overview.today', 'Hari Ini').toUpperCase()}
            </Text>
            {activeScope === 'today' ? (
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isDark ? '#10B981' : '#059669', flexShrink: 0, marginLeft: 4 }} />
            ) : null}
          </View>
          <Text
            style={[styles.kpiValue, { color: activeScope === 'today' ? (isDark ? '#10B981' : '#047857') : (isDark ? '#10B981' : '#059669') }]}
            numberOfLines={1}
          >
            {formatNumber(markingKpis?.exitTodayCount || 0)}
          </Text>
          <Text style={{ fontSize: 10.5, color: colors.secondary }} numberOfLines={1} ellipsizeMode="tail">
            {t('overview.air', 'Udara')}: {markingKpis?.exitTodayAir || 0} • {t('overview.sea', 'Laut')}: {markingKpis?.exitTodaySea || 0}
          </Text>
        </Card>
      </View>

      {/* 3. Besok (Prediksi) */}
      <View style={styles.kpiCol}>
        <Card
          onPress={() => onScopeChange('tomorrow')}
          style={{
            padding: 10,
            borderWidth: activeScope === 'tomorrow' ? 2 : 1,
            borderColor: activeScope === 'tomorrow'
              ? '#F59E0B'
              : (isDark ? 'rgba(245, 158, 11, 0.35)' : '#FDE68A'),
            backgroundColor: activeScope === 'tomorrow'
              ? (isDark ? 'rgba(245, 158, 11, 0.16)' : '#FFFBEB')
              : colors.surface,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text
              style={[styles.kpiTitle, { color: activeScope === 'tomorrow' ? (isDark ? '#F59E0B' : '#D97706') : colors.secondary, flex: 1 }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {t('overview.tomorrow', 'Besok').toUpperCase()}
            </Text>
            {activeScope === 'tomorrow' ? (
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isDark ? '#F59E0B' : '#D97706', flexShrink: 0, marginLeft: 4 }} />
            ) : null}
          </View>
          <Text
            style={[styles.kpiValue, { color: activeScope === 'tomorrow' ? (isDark ? '#F59E0B' : '#B45309') : colors.primary }]}
            numberOfLines={1}
          >
            {formatNumber(markingKpis?.expectedExitTomorrowCount || 0)}
          </Text>
          <Text style={{ fontSize: 10.5, color: colors.secondary }} numberOfLines={1} ellipsizeMode="tail">
            {t('overview.air', 'Udara')}: {markingKpis?.expectedExitTomorrowAir || 0} • {t('overview.sea', 'Laut')}: {markingKpis?.expectedExitTomorrowSea || 0}
          </Text>
        </Card>
      </View>

      {/* 4. Exit 7 Hari Terakhir */}
      <View style={styles.kpiCol}>
        <Card
          onPress={() => onScopeChange('recent')}
          style={{
            padding: 10,
            borderWidth: activeScope === 'recent' ? 2 : 1,
            borderColor: activeScope === 'recent'
              ? colors.tertiary
              : (isDark ? colors.border : '#E2E8F0'),
            backgroundColor: activeScope === 'recent'
              ? (isDark ? 'rgba(56, 189, 248, 0.16)' : '#F0F9FF')
              : colors.surface,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text
              style={[styles.kpiTitle, { color: activeScope === 'recent' ? (isDark ? colors.tertiary : '#0284C7') : colors.secondary, flex: 1 }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {t('overview.exit7Days', 'Exit 7 Hari').toUpperCase()}
            </Text>
            {activeScope === 'recent' ? (
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isDark ? colors.tertiary : '#0284C7', flexShrink: 0, marginLeft: 4 }} />
            ) : null}
          </View>
          <Text
            style={[styles.kpiValue, { color: activeScope === 'recent' ? (isDark ? colors.tertiary : '#0369A1') : colors.primary }]}
            numberOfLines={1}
          >
            {formatNumber(markingKpis?.exitLast7DaysCount || 0)}
          </Text>
          <Text style={{ fontSize: 10.5, color: colors.secondary }} numberOfLines={1} ellipsizeMode="tail">
            {t('overview.air', 'Udara')}: {markingKpis?.exitLast7DaysAir || 0} • {t('overview.sea', 'Laut')}: {markingKpis?.exitLast7DaysSea || 0}
          </Text>
        </Card>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  kpiCol: {
    width: '48.5%',
  },
  kpiTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    marginVertical: 2,
    fontVariant: ['tabular-nums'],
  },
})
