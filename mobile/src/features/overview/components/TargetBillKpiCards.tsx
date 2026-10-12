import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useThemeStore } from '@/theme/themeStore'
import { useTranslation } from '@/hooks/useTranslation'
import { formatNumber, formatCompactRupiah } from '@/lib/utils'
import { BillingKPIs } from '../services/operationBilling.service'

interface TargetBillKpiCardsProps {
  kpis?: BillingKPIs
  onOpenUnissuedModal: (agingGroup?: string) => void
}

export function TargetBillKpiCards({
  kpis,
  onOpenUnissuedModal,
}: TargetBillKpiCardsProps) {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'
  const { t } = useTranslation()

  // Data Faktur Diterbitkan
  const totalBills = kpis?.invoicesBulanIni || 0
  const udaraBills = kpis?.invoicesBulanIniBreakdown?.udara || 0
  const lautBills = kpis?.invoicesBulanIniBreakdown?.laut || 0
  const invoiceTrend = kpis?.trend?.invoicesBulanIni
  const trendDir = invoiceTrend?.direction || 'flat'
  const trendVal = invoiceTrend?.value || 0

  // Perhitungan rasio split faktur
  const totalSplitBills = udaraBills + lautBills
  const airFlex = totalSplitBills > 0 ? Math.max(1, Math.round((udaraBills / totalSplitBills) * 100)) : 1
  const seaFlex = totalSplitBills > 0 ? Math.max(1, Math.round((lautBills / totalSplitBills) * 100)) : 1

  // Data Target Bill
  const airTotal = kpis?.targetBillUdara?.total || 0
  const airCats = kpis?.targetBillUdara?.categories || { sjSent: 0, codUrgent: 0, agingGt7: 0, fcl: 0 }
  const airPic = kpis?.targetBillUdara?.breakdown || { kiki: 0, yati: 0 }

  const seaTotal = kpis?.targetBillLaut?.total || 0
  const seaCats = kpis?.targetBillLaut?.categories || { sjSent: 0, codUrgent: 0, agingGt7: 0, fcl: 0 }
  const seaPic = kpis?.targetBillLaut?.breakdown || { thara: 0, rico: 0, ferly: 0 }

  // Data Draft Unissued
  const unissued = kpis?.unissuedBills
  const unissuedTotal = unissued?.totalCount || 0
  const unissuedUdara = unissued?.countUdara || 0
  const unissuedLaut = unissued?.countLaut || 0
  const unissuedNominal = unissued?.totalNominal || 0

  const ageLe7 = unissued?.aging?.le7?.count || 0
  const age8to14 = unissued?.aging?.d8to14?.count || 0
  const age15to30 = unissued?.aging?.d15to30?.count || 0
  const ageGt30 = unissued?.aging?.gt30?.count || 0
  const totalAgingCount = ageLe7 + age8to14 + age15to30 + ageGt30

  // Warna Semantik
  const airColor = '#E2B266'
  const seaColor = '#5FA3D4'
  const okColor = '#4CC38A'
  const warnColor = '#E5A93C'
  const lateColor = '#EF6B5B'
  const lineColor = isDark ? '#222C38' : '#E3E7EC'

  return (
    <View style={styles.container}>
      {/* SECTION 1: Faktur Diterbitkan (Hero Big Stat) */}
      <View style={[styles.section, { borderTopColor: lineColor }]}>
        <Text style={[styles.sectionSubtitle, { color: colors.secondary }]}>
          {t('overview.invoicesIssuedTitle', 'Faktur diterbitkan')}
        </Text>

        <View style={styles.heroRow}>
          <View style={styles.bigValueRow}>
            <Text style={[styles.bigNumber, { color: colors.primary }]}>
              {formatNumber(totalBills)}
            </Text>
            <Text style={[styles.bigUnit, { color: colors.secondary }]}>bill</Text>
          </View>

          {trendDir !== 'flat' && (
            <View style={styles.deltaContainer}>
              <Text
                style={[
                  styles.deltaText,
                  { color: trendDir === 'up' ? okColor : lateColor },
                ]}
              >
                {trendVal > 0 ? `+${trendVal.toFixed(1)}%` : `${trendVal.toFixed(1)}%`}
              </Text>
              <Text style={[styles.deltaLabel, { color: colors.secondary }]}>
                {' '}vs bulan lalu
              </Text>
            </View>
          )}
        </View>

        {/* Split Ratio Bar */}
        <View style={styles.splitBar}>
          <View style={{ flex: airFlex, backgroundColor: airColor }} />
          <View style={{ flex: seaFlex, backgroundColor: seaColor }} />
        </View>

        {/* Legend Row */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: airColor }]} />
            <Text style={[styles.legendText, { color: colors.secondary }]}>
              Udara <Text style={[styles.legendBold, { color: colors.primary }]}>{formatNumber(udaraBills)}</Text>
            </Text>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: seaColor }]} />
            <Text style={[styles.legendText, { color: colors.secondary }]}>
              Laut <Text style={[styles.legendBold, { color: colors.primary }]}>{formatNumber(lautBills)}</Text>
            </Text>
          </View>
        </View>
      </View>

      {/* SECTION 2: Target Bill */}
      <View style={[styles.section, { borderTopColor: lineColor }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>
          {t('overview.targetBillSection', 'Target bill')}
        </Text>

        {/* 2a. Moda Udara */}
        <View style={styles.modeBlock}>
          <View style={styles.modeTop}>
            <View style={styles.modeNameGroup}>
              <View style={[styles.dot, { backgroundColor: airColor }]} />
              <Text style={[styles.modeName, { color: colors.primary }]}>Udara</Text>
            </View>
            <View style={styles.modeCountGroup}>
              <Text style={[styles.modeNumber, { color: colors.primary }]}>
                {formatNumber(airTotal)}
              </Text>
              <Text style={[styles.modeUnit, { color: colors.secondary }]}>list</Text>
            </View>
          </View>

          <Text style={[styles.picLine, { color: colors.secondary }]}>
            Kiki <Text style={[styles.picBold, { color: colors.primary }]}>{airPic?.kiki || 0}</Text>
            {'   '}
            Yati <Text style={[styles.picBold, { color: colors.primary }]}>{airPic?.yati || 0}</Text>
          </Text>

          <View style={styles.statsGrid}>
            <View style={[styles.statCol, { borderLeftColor: lineColor }]}>
              <Text style={[styles.statDt, { color: colors.secondary }]}>SJ</Text>
              <Text style={[styles.statDd, { color: colors.primary }]}>{airCats.sjSent}</Text>
            </View>
            <View style={[styles.statCol, { borderLeftColor: lineColor }]}>
              <Text style={[styles.statDt, { color: colors.secondary }]}>COD</Text>
              <Text style={[styles.statDd, { color: colors.primary }]}>{airCats.codUrgent}</Text>
            </View>
            <View style={[styles.statCol, { borderLeftColor: lineColor }]}>
              <Text style={[styles.statDt, { color: colors.secondary }]}>FCL</Text>
              <Text style={[styles.statDd, { color: colors.primary }]}>{airCats.fcl}</Text>
            </View>
            <View
              style={[
                styles.statCol,
                { borderLeftColor: airCats.agingGt7 > 0 ? lateColor : lineColor },
              ]}
            >
              <Text
                style={[
                  styles.statDt,
                  { color: airCats.agingGt7 > 0 ? lateColor : colors.secondary },
                ]}
              >
                &gt;7 hari
              </Text>
              <Text
                style={[
                  styles.statDd,
                  { color: airCats.agingGt7 > 0 ? lateColor : colors.primary },
                ]}
              >
                {airCats.agingGt7}
              </Text>
            </View>
          </View>
        </View>

        {/* Divider halus antar moda */}
        <View style={[styles.modeDivider, { backgroundColor: lineColor }]} />

        {/* 2b. Moda Laut */}
        <View style={styles.modeBlock}>
          <View style={styles.modeTop}>
            <View style={styles.modeNameGroup}>
              <View style={[styles.dot, { backgroundColor: seaColor }]} />
              <Text style={[styles.modeName, { color: colors.primary }]}>Laut</Text>
            </View>
            <View style={styles.modeCountGroup}>
              <Text style={[styles.modeNumber, { color: colors.primary }]}>
                {formatNumber(seaTotal)}
              </Text>
              <Text style={[styles.modeUnit, { color: colors.secondary }]}>list</Text>
            </View>
          </View>

          <Text style={[styles.picLine, { color: colors.secondary }]}>
            Thara <Text style={[styles.picBold, { color: colors.primary }]}>{seaPic?.thara || 0}</Text>
            {'   '}
            Rico <Text style={[styles.picBold, { color: colors.primary }]}>{seaPic?.rico || 0}</Text>
            {'   '}
            Ferly <Text style={[styles.picBold, { color: colors.primary }]}>{seaPic?.ferly || 0}</Text>
          </Text>

          <View style={styles.statsGrid}>
            <View style={[styles.statCol, { borderLeftColor: lineColor }]}>
              <Text style={[styles.statDt, { color: colors.secondary }]}>SJ</Text>
              <Text style={[styles.statDd, { color: colors.primary }]}>{seaCats.sjSent}</Text>
            </View>
            <View style={[styles.statCol, { borderLeftColor: lineColor }]}>
              <Text style={[styles.statDt, { color: colors.secondary }]}>COD</Text>
              <Text style={[styles.statDd, { color: colors.primary }]}>{seaCats.codUrgent}</Text>
            </View>
            <View style={[styles.statCol, { borderLeftColor: lineColor }]}>
              <Text style={[styles.statDt, { color: colors.secondary }]}>FCL</Text>
              <Text style={[styles.statDd, { color: colors.primary }]}>{seaCats.fcl}</Text>
            </View>
            <View
              style={[
                styles.statCol,
                { borderLeftColor: seaCats.agingGt7 > 0 ? lateColor : lineColor },
              ]}
            >
              <Text
                style={[
                  styles.statDt,
                  { color: seaCats.agingGt7 > 0 ? lateColor : colors.secondary },
                ]}
              >
                &gt;7 hari
              </Text>
              <Text
                style={[
                  styles.statDd,
                  { color: seaCats.agingGt7 > 0 ? lateColor : colors.primary },
                ]}
              >
                {seaCats.agingGt7}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* SECTION 3: Draft Belum Di-Issue */}
      <View style={[styles.section, { borderTopColor: lineColor }]}>
        <View style={styles.draftHead}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            {t('overview.unissuedTitle', 'Draft belum di-issue')}
          </Text>
          <View style={[styles.tagBadge, { borderColor: lineColor }]}>
            <Text style={[styles.tagBadgeText, { color: colors.secondary }]}>{'>2024'}</Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            onOpenUnissuedModal()
          }}
          style={styles.draftSummaryRow}
        >
          <View style={styles.draftCountGroup}>
            <Text style={[styles.draftBigNumber, { color: colors.primary }]}>
              {formatNumber(unissuedTotal)}
            </Text>
            <Text style={[styles.draftBigUnit, { color: colors.secondary }]}>bill</Text>
          </View>

          <Text style={[styles.draftDetailText, { color: colors.secondary }]}>
            Udara {unissuedUdara}   Laut {unissuedLaut}   {formatCompactRupiah(unissuedNominal)}
          </Text>
        </TouchableOpacity>

        {/* Aging Segmented Bar */}
        {totalAgingCount > 0 && (
          <View style={styles.splitBar}>
            {ageLe7 > 0 && <View style={{ flex: ageLe7, backgroundColor: okColor }} />}
            {age8to14 > 0 && <View style={{ flex: age8to14, backgroundColor: warnColor }} />}
            {age15to30 > 0 && <View style={{ flex: age15to30, backgroundColor: '#EA580C' }} />}
            {ageGt30 > 0 && <View style={{ flex: ageGt30, backgroundColor: lateColor }} />}
          </View>
        )}

        {/* Interactive Aging List */}
        <View style={styles.agingList}>
          {/* ≤7 hari */}
          <TouchableOpacity
            style={[styles.agingItem, { borderTopColor: 'transparent' }]}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              onOpenUnissuedModal('le7')
            }}
          >
            <View style={[styles.dot, { backgroundColor: okColor }]} />
            <Text style={[styles.agingKey, { color: colors.primary }]}>≤7 hari</Text>
            <Text style={[styles.agingVal, { color: colors.primary }]}>{ageLe7}</Text>
          </TouchableOpacity>

          {/* 8–14 hari */}
          <TouchableOpacity
            style={[styles.agingItem, { borderTopColor: lineColor }]}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              onOpenUnissuedModal('8to14')
            }}
          >
            <View style={[styles.dot, { backgroundColor: warnColor }]} />
            <Text style={[styles.agingKey, { color: colors.primary }]}>8–14 hari</Text>
            <Text style={[styles.agingVal, { color: colors.primary }]}>{age8to14}</Text>
          </TouchableOpacity>

          {/* 15–30 hari */}
          <TouchableOpacity
            style={[styles.agingItem, { borderTopColor: lineColor }]}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              onOpenUnissuedModal('15to30')
            }}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: age15to30 > 0 ? '#EA580C' : lineColor },
              ]}
            />
            <Text
              style={[
                styles.agingKey,
                { color: age15to30 > 0 ? colors.primary : colors.secondary },
              ]}
            >
              15–30 hari
            </Text>
            <Text
              style={[
                styles.agingVal,
                { color: age15to30 > 0 ? colors.primary : colors.secondary },
              ]}
            >
              {age15to30}
            </Text>
          </TouchableOpacity>

          {/* >30 hari */}
          <TouchableOpacity
            style={[styles.agingItem, { borderTopColor: lineColor }]}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              onOpenUnissuedModal('gt30')
            }}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: ageGt30 > 0 ? lateColor : lineColor },
              ]}
            />
            <Text
              style={[
                styles.agingKey,
                { color: ageGt30 > 0 ? lateColor : colors.secondary },
              ]}
            >
              &gt;30 hari
            </Text>
            <Text
              style={[
                styles.agingVal,
                { color: ageGt30 > 0 ? lateColor : colors.secondary },
              ]}
            >
              {ageGt30}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  section: {
    paddingVertical: 18,
    borderTopWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  sectionSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    marginBottom: 4,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  bigValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bigNumber: {
    fontSize: 48,
    fontWeight: '500',
    letterSpacing: -1.2,
    lineHeight: 50,
    fontVariant: ['tabular-nums'],
  },
  bigUnit: {
    fontSize: 16,
    fontWeight: '400',
    marginLeft: 8,
  },
  deltaContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  deltaText: {
    fontSize: 14,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  deltaLabel: {
    fontSize: 13.5,
    fontWeight: '400',
  },
  splitBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 2,
    overflow: 'hidden',
    gap: 2,
    marginVertical: 10,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 14,
  },
  legendBold: {
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  modeBlock: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  modeDivider: {
    height: 1,
    marginVertical: 12,
  },
  modeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  modeNameGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  modeName: {
    fontSize: 15,
    fontWeight: '500',
  },
  modeCountGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  modeNumber: {
    fontSize: 34,
    fontWeight: '500',
    letterSpacing: -0.6,
    lineHeight: 36,
    fontVariant: ['tabular-nums'],
  },
  modeUnit: {
    fontSize: 14,
    fontWeight: '400',
    marginLeft: 6,
  },
  picLine: {
    fontSize: 14,
    marginVertical: 4,
  },
  picBold: {
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  statsGrid: {
    flexDirection: 'row',
    marginTop: 8,
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
  draftHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  tagBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  draftSummaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginVertical: 8,
  },
  draftCountGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  draftBigNumber: {
    fontSize: 34,
    fontWeight: '500',
    letterSpacing: -0.6,
    lineHeight: 36,
    fontVariant: ['tabular-nums'],
  },
  draftBigUnit: {
    fontSize: 14,
    fontWeight: '400',
    marginLeft: 6,
  },
  draftDetailText: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  agingList: {
    marginTop: 4,
  },
  agingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
  },
  agingKey: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
  },
  agingVal: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
})
