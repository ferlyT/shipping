import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
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

  const scopes: Array<{ key: ExitScope; label: string; count: number }> = [
    {
      key: 'today',
      label: t('overview.today', 'Hari Ini'),
      count: markingKpis?.exitTodayCount || 0,
    },
    {
      key: 'yesterday',
      label: t('overview.yesterday', 'Kemarin'),
      count: markingKpis?.exitYesterdayCount || 0,
    },
    {
      key: 'tomorrow',
      label: t('overview.tomorrow', 'Besok'),
      count: markingKpis?.expectedExitTomorrowCount || 0,
    },
    {
      key: 'recent',
      label: t('overview.exit7Days', '7 Hari'),
      count: markingKpis?.exitLast7DaysCount || 0,
    },
  ]

  return (
    <View style={styles.scrollWrapper}>
      <View style={styles.container}>
        {scopes.map((s) => {
          const isActive = activeScope === s.key
          return (
            <TouchableOpacity
              key={s.key}
              activeOpacity={0.7}
              style={[
                styles.scopePill,
                {
                  backgroundColor: isActive
                    ? '#E0644E'
                    : isDark
                    ? '#131A23'
                    : '#FFFFFF',
                  borderColor: isActive ? '#E0644E' : isDark ? '#222C38' : '#E3E7EC',
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                onScopeChange(s.key)
              }}
            >
              <Text
                style={[
                  styles.scopeText,
                  {
                    color: isActive ? '#FFFFFF' : colors.primary,
                    fontWeight: isActive ? '600' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                {s.label} ({formatNumber(s.count)})
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  scrollWrapper: {
    marginVertical: 8,
  },
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  scopePill: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scopeText: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
})
