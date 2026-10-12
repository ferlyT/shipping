import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useThemeStore } from '@/theme/themeStore'
import { useTranslation } from '@/hooks/useTranslation'

interface BillingPeriodNavigatorProps {
  year: number
  month: number
  onChange: (year: number, month: number) => void
}

const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function BillingPeriodNavigator({
  year,
  month,
  onChange,
}: BillingPeriodNavigatorProps) {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'
  const { language, t } = useTranslation()

  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1
  const isCurrentMonth = year === currentYear && month === currentMonth

  const monthNames = language === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_ID
  const monthLabel = monthNames[month - 1] || `Bulan ${month}`
  const lineColor = isDark ? '#222C38' : '#E3E7EC'

  const handlePrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (month === 1) {
      onChange(year - 1, 12)
    } else {
      onChange(year, month - 1)
    }
  }

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (month === 12) {
      onChange(year + 1, 1)
    } else {
      onChange(year, month + 1)
    }
  }

  const handleResetToCurrent = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onChange(currentYear, currentMonth)
  }

  return (
    <View style={styles.container}>
      <View>
        <Text style={[styles.periodLabel, { color: colors.primary }]}>
          {monthLabel} {year}
        </Text>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.nowTag,
              {
                borderColor: isCurrentMonth ? '#4CC38A' : '#E5A93C',
              },
            ]}
          >
            <Text
              style={[
                styles.nowTagText,
                { color: isCurrentMonth ? '#4CC38A' : '#E5A93C' },
              ]}
            >
              {isCurrentMonth
                ? t('overview.currentMonthBadge', 'Bulan berjalan')
                : t('overview.pastAuditBadge', 'Audit lampau')}
            </Text>
          </View>

          {!isCurrentMonth && (
            <TouchableOpacity
              style={[styles.resetBtn, { borderColor: lineColor }]}
              onPress={handleResetToCurrent}
              activeOpacity={0.7}
            >
              <Text style={[styles.resetBtnText, { color: colors.secondary }]}>
                {t('overview.thisMonth', 'Bulan ini')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.arrowsRow}>
        <TouchableOpacity
          style={[
            styles.iconBtn,
            {
              borderColor: lineColor,
              backgroundColor: isDark ? '#131A23' : '#FFFFFF',
            },
          ]}
          onPress={handlePrev}
          activeOpacity={0.7}
        >
          <ChevronLeft size={18} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.iconBtn,
            {
              borderColor: lineColor,
              backgroundColor: isDark ? '#131A23' : '#FFFFFF',
            },
          ]}
          onPress={handleNext}
          activeOpacity={0.7}
        >
          <ChevronRight size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 4,
  },
  periodLabel: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  nowTag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  nowTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  resetBtn: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  arrowsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
