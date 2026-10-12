import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useThemeStore } from '@/theme/themeStore'
import { SkeletonShimmer } from '@/components/ui/SkeletonShimmer'
import { formatNumber } from '@/lib/utils'
import { HeroCardProps } from '../types/hero.types'

export function HeroCard({
  sections,
  stats,
  isLoading = false,
}: HeroCardProps) {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'

  if (isLoading) {
    return (
      <View style={{ paddingVertical: 14 }}>
        <SkeletonShimmer height={120} style={{ borderRadius: 8 }} />
      </View>
    )
  }

  const visibleSections = sections.filter((s) => s.visible).slice(0, 2)
  const visibleStats = stats.filter((s) => s.visible).slice(0, 3)

  if (visibleSections.length === 0 && visibleStats.length === 0) {
    return null
  }

  // Format tanggal localized
  const now = new Date()
  const dateFormatted = new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(now)

  const lineColor = isDark ? '#222C38' : '#E3E7EC'
  const warnColor = '#E5A93C'
  const lateColor = '#EF6B5B'

  return (
    <View style={styles.sumSection}>
      {/* Date Header */}
      <Text style={[styles.dateText, { color: colors.secondary }]}>
        {dateFormatted}
      </Text>

      {/* Two Column Summary Pair */}
      {visibleSections.length > 0 && (
        <View style={styles.pairGrid}>
          {visibleSections.map((sec, idx) => {
            const isFirst = idx === 0
            const content = (
              <View
                style={[
                  styles.pairCol,
                  !isFirst && [styles.pairColRight, { borderLeftColor: lineColor }],
                ]}
              >
                <Text
                  style={[styles.pairLabel, { color: colors.secondary }]}
                  numberOfLines={1}
                >
                  {sec.subLabel || sec.label}
                </Text>

                <Text
                  style={[styles.pairValue, { color: colors.primary }]}
                  numberOfLines={1}
                >
                  {formatNumber(sec.value || 0)}
                </Text>

                {sec.breakdown && sec.breakdown.length > 0 && (
                  <Text style={[styles.pairSubText, { color: colors.secondary }]} numberOfLines={1}>
                    {sec.breakdown.map((item, bIdx) => (
                      <React.Fragment key={item.label || String(bIdx)}>
                        {bIdx > 0 && '   '}
                        {item.label} <Text style={[styles.pairSubBold, { color: colors.primary }]}>{formatNumber(item.value || 0)}</Text>
                      </React.Fragment>
                    ))}
                  </Text>
                )}
              </View>
            )

            return (
              <React.Fragment key={sec.id || String(idx)}>
                {sec.onPress ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={{ flex: 1 }}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      sec.onPress?.()
                    }}
                  >
                    {content}
                  </TouchableOpacity>
                ) : (
                  <View style={{ flex: 1 }}>{content}</View>
                )}
              </React.Fragment>
            )
          })}
        </View>
      )}

      {/* Actionable Micro Stats Row (dl.stats) */}
      {visibleStats.length > 0 && (
        <View style={styles.statsRow}>
          {visibleStats.map((st, idx) => {
            const isAlert = (st.id === 'missed_sla' || st.color === colors.danger) && (st.value || 0) > 0
            const isWarn = (st.id === 'eta_not_exit' || st.color === colors.warning) && (st.value || 0) > 0

            let statBorderColor = lineColor
            let statValueColor = colors.primary
            if (isAlert) {
              statBorderColor = lateColor
              statValueColor = lateColor
            } else if (isWarn) {
              statBorderColor = warnColor
              statValueColor = warnColor
            }

            const itemContent = (
              <View
                style={[
                  styles.statCol,
                  { borderLeftColor: statBorderColor },
                ]}
              >
                <Text
                  style={[
                    styles.statDt,
                    { color: isAlert ? lateColor : isWarn ? warnColor : colors.secondary },
                  ]}
                  numberOfLines={1}
                >
                  {st.label}
                </Text>
                <Text
                  style={[styles.statDd, { color: statValueColor }]}
                  numberOfLines={1}
                >
                  {formatNumber(st.value || 0)}
                </Text>
              </View>
            )

            return (
              <React.Fragment key={st.id || String(idx)}>
                {st.onPress ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={{ flex: 1 }}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      st.onPress?.()
                    }}
                  >
                    {itemContent}
                  </TouchableOpacity>
                ) : (
                  <View style={{ flex: 1 }}>{itemContent}</View>
                )}
              </React.Fragment>
            )
          })}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  sumSection: {
    paddingTop: 4,
    paddingBottom: 20,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 12,
  },
  pairGrid: {
    flexDirection: 'row',
  },
  pairCol: {
    flex: 1,
  },
  pairColRight: {
    borderLeftWidth: 1,
    paddingLeft: 18,
  },
  pairLabel: {
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 2,
  },
  pairValue: {
    fontSize: 48,
    fontWeight: '500',
    lineHeight: 50,
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums'],
    marginVertical: 2,
  },
  pairSubText: {
    fontSize: 13.5,
    marginTop: 2,
  },
  pairSubBold: {
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 8,
  },
  statCol: {
    flex: 1,
    borderLeftWidth: 2,
    paddingLeft: 10,
  },
  statDt: {
    fontSize: 12,
    marginBottom: 2,
    fontWeight: '400',
  },
  statDd: {
    fontSize: 20,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
})
