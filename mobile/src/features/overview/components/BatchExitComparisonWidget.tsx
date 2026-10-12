import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useThemeStore } from '@/theme/themeStore'
import { useTranslation } from '@/hooks/useTranslation'
import { formatNumber } from '@/lib/utils'
import { BatchExitComparisonSummary } from '../services/operationBilling.service'

interface BatchExitComparisonWidgetProps {
  summary?: BatchExitComparisonSummary
  allTime: boolean
  onToggleAllTime: () => void
  onOpenBatchDetailModal: () => void
}

export function BatchExitComparisonWidget({
  summary,
  allTime,
  onToggleAllTime,
  onOpenBatchDetailModal,
}: BatchExitComparisonWidgetProps) {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'
  const { t } = useTranslation()

  const billedPct = summary?.billedPercentage || 0
  const airPct = summary?.air?.billedPercentage || 0
  const seaPct = summary?.sea?.billedPercentage || 0
  const totalKargo = summary?.totalKargo || 0
  const totalBilled = summary?.totalBilled || 0
  const totalUnbilled = summary?.totalUnbilled || 0

  const custBlocked = summary?.byCustomerStatus?.blocked
  const custWarning = summary?.byCustomerStatus?.warning
  const custUrgent = summary?.byCustomerStatus?.urgent
  const custCod = summary?.byCustomerStatus?.cod
  const custOk = summary?.byCustomerStatus?.ok

  const branches = (summary?.byBranch || []).filter((b) => b.totalKargo > 0)

  const billedFlex = totalKargo > 0 ? Math.max(1, Math.round((totalBilled / totalKargo) * 100)) : 1
  const unbilledFlex = totalKargo > 0 ? Math.max(1, Math.round((totalUnbilled / totalKargo) * 100)) : 1

  const lineColor = isDark ? '#222C38' : '#E3E7EC'
  const okColor = '#4CC38A'
  const warnColor = '#E5A93C'
  const lateColor = '#EF6B5B'
  const airColor = '#E2B266'
  const seaColor = '#5FA3D4'

  return (
    <View style={[styles.section, { borderTopColor: lineColor }]}>
      {/* 1. Header: Judul Section & Toggle Scope */}
      <View style={styles.row}>
        <Text style={[styles.secTitle, { color: colors.primary }]}>
          {t('overview.batchExitComparisonTitle', 'Batch exit vs bill dibuat')}
        </Text>

        <TouchableOpacity
          style={[
            styles.chipBtn,
            {
              backgroundColor: isDark ? '#131A23' : '#FFFFFF',
              borderColor: lineColor,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            onToggleAllTime()
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipBtnText, { color: colors.primary }]}>
            {allTime ? 'Semua waktu' : 'Bulan terpilih'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Baris Rasio Penyelesaian Kargo Exit & Tombol Rincian */}
      <View style={[styles.row, styles.ratioRow]}>
        <Text style={[styles.ratioLabel, { color: colors.secondary }]}>
          Rasio penyelesaian kargo exit ({billedPct.toFixed(0)}%)
        </Text>

        <TouchableOpacity
          style={[styles.detailChipBtn, { borderColor: okColor }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            onOpenBatchDetailModal()
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.detailChipText, { color: okColor }]}>
            Rincian ({summary?.pendingBatches || 0} pending)
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Bar Pembagian Kargo Exit (Split Bar) */}
      {totalKargo > 0 && (
        <>
          <View style={styles.splitBar}>
            {totalBilled > 0 && <View style={{ flex: billedFlex, backgroundColor: okColor }} />}
            {totalUnbilled > 0 && <View style={{ flex: unbilledFlex, backgroundColor: warnColor }} />}
          </View>

          {/* Legenda Bar Kargo */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: okColor }]} />
              <Text style={[styles.legendText, { color: colors.secondary }]}>
                Billed <Text style={[styles.legendBold, { color: colors.primary }]}>{formatNumber(totalBilled)}</Text>
              </Text>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: warnColor }]} />
              <Text style={[styles.legendText, { color: colors.secondary }]}>
                Sisa <Text style={[styles.legendBold, { color: colors.primary }]}>{formatNumber(totalUnbilled)}</Text>
              </Text>
            </View>

            <Text style={[styles.legendTotalText, { color: colors.secondary }]}>
              Total <Text style={[styles.legendBold, { color: colors.primary }]}>{formatNumber(totalKargo)}</Text> kargo
            </Text>
          </View>
        </>
      )}

      {/* 4. Rincian Per Moda (Garis Pemisah Bersih) */}
      <View style={[styles.subListSection, { borderTopColor: lineColor }]}>
        <View style={styles.subItemRow}>
          <View style={styles.subItemLeft}>
            <View style={[styles.dot, { backgroundColor: airColor }]} />
            <Text style={[styles.subItemTitle, { color: colors.primary }]}>Udara</Text>
          </View>
          <Text style={[styles.subItemMeta, { color: colors.secondary }]}>
            {summary?.air?.totalBilled || 0} bill · {summary?.air?.totalUnbilled || 0} sisa ({summary?.air?.totalKargo || 0} kargo)
          </Text>
          <Text style={[styles.subItemPct, { color: colors.primary }]}>
            {airPct.toFixed(0)}%
          </Text>
        </View>

        <View style={[styles.subItemRow, { borderTopColor: lineColor }]}>
          <View style={styles.subItemLeft}>
            <View style={[styles.dot, { backgroundColor: seaColor }]} />
            <Text style={[styles.subItemTitle, { color: colors.primary }]}>Laut</Text>
          </View>
          <Text style={[styles.subItemMeta, { color: colors.secondary }]}>
            {summary?.sea?.totalBilled || 0} bill · {summary?.sea?.totalUnbilled || 0} sisa ({summary?.sea?.totalKargo || 0} kargo)
          </Text>
          <Text style={[styles.subItemPct, { color: colors.primary }]}>
            {seaPct.toFixed(0)}%
          </Text>
        </View>
      </View>

      {/* 5. Kelengkapan Status Customer (Daftar Garis Tipis) */}
      <View style={[styles.subListSection, { borderTopColor: lineColor }]}>
        <Text style={[styles.subListHeader, { color: colors.secondary }]}>
          Status customer
        </Text>

        {custBlocked && custBlocked.totalKargo > 0 && (
          <View style={[styles.statusLine, { borderTopColor: lineColor }]}>
            <View style={[styles.statusTag, { borderColor: lateColor }]}>
              <Text style={[styles.statusTagText, { color: lateColor }]}>BLOCKED</Text>
            </View>
            <Text style={[styles.statusDetailText, { color: colors.secondary }]}>
              {custBlocked.totalBilled}/{custBlocked.totalKargo} kargo
            </Text>
            <Text style={[styles.statusPctText, { color: lateColor }]}>
              {custBlocked.billedPercentage.toFixed(0)}%
            </Text>
          </View>
        )}

        {custWarning && custWarning.totalKargo > 0 && (
          <View style={[styles.statusLine, { borderTopColor: lineColor }]}>
            <View style={[styles.statusTag, { borderColor: warnColor }]}>
              <Text style={[styles.statusTagText, { color: warnColor }]}>WARNING</Text>
            </View>
            <Text style={[styles.statusDetailText, { color: colors.secondary }]}>
              {custWarning.totalBilled}/{custWarning.totalKargo} kargo
            </Text>
            <Text style={[styles.statusPctText, { color: warnColor }]}>
              {custWarning.billedPercentage.toFixed(0)}%
            </Text>
          </View>
        )}

        {custUrgent && custUrgent.totalKargo > 0 && (
          <View style={[styles.statusLine, { borderTopColor: lineColor }]}>
            <View style={[styles.statusTag, { borderColor: '#0284C7' }]}>
              <Text style={[styles.statusTagText, { color: '#0284C7' }]}>URGENT</Text>
            </View>
            <Text style={[styles.statusDetailText, { color: colors.secondary }]}>
              {custUrgent.totalBilled}/{custUrgent.totalKargo} kargo
            </Text>
            <Text style={[styles.statusPctText, { color: colors.primary }]}>
              {custUrgent.billedPercentage.toFixed(0)}%
            </Text>
          </View>
        )}

        {custCod && custCod.totalKargo > 0 && (
          <View style={[styles.statusLine, { borderTopColor: lineColor }]}>
            <View style={[styles.statusTag, { borderColor: '#0D9488' }]}>
              <Text style={[styles.statusTagText, { color: '#0D9488' }]}>COD</Text>
            </View>
            <Text style={[styles.statusDetailText, { color: colors.secondary }]}>
              {custCod.totalBilled}/{custCod.totalKargo} kargo
            </Text>
            <Text style={[styles.statusPctText, { color: colors.primary }]}>
              {custCod.billedPercentage.toFixed(0)}%
            </Text>
          </View>
        )}

        {custOk && custOk.totalKargo > 0 && (
          <View style={[styles.statusLine, { borderTopColor: lineColor }]}>
            <View style={[styles.statusTag, { borderColor: lineColor }]}>
              <Text style={[styles.statusTagText, { color: colors.secondary }]}>OK</Text>
            </View>
            <Text style={[styles.statusDetailText, { color: colors.secondary }]}>
              {custOk.totalBilled}/{custOk.totalKargo} kargo
            </Text>
            <Text style={[styles.statusPctText, { color: colors.primary }]}>
              {custOk.billedPercentage.toFixed(0)}%
            </Text>
          </View>
        )}
      </View>

      {/* 6. Rasio Penagihan per Cabang Kargo */}
      {branches.length > 0 && (
        <View style={[styles.subListSection, { borderTopColor: lineColor }]}>
          <Text style={[styles.subListHeader, { color: colors.secondary }]}>
            Cabang asal kargo
          </Text>

          {branches.map((b) => {
            const bPct = b.billedPercentage || 0
            const branchDisplay =
              b.branchCode === '--' || b.branchCode === 'SG'
                ? 'Singapore (SG)'
                : b.branchName || b.branchCode

            return (
              <View key={b.branchCode} style={[styles.branchLine, { borderTopColor: lineColor }]}>
                <View style={{ flex: 1.2 }}>
                  <Text style={[styles.branchTitle, { color: colors.primary }]} numberOfLines={1}>
                    {branchDisplay}
                  </Text>
                  <Text style={[styles.branchSub, { color: colors.secondary }]}>
                    {b.pendingBatches} batch pending
                  </Text>
                </View>

                <View style={styles.branchStatsCol}>
                  <Text style={[styles.branchRatioText, { color: colors.secondary }]}>
                    {b.totalBilled}/{b.totalKargo} billed
                  </Text>
                  <Text
                    style={[
                      styles.branchPctText,
                      { color: bPct >= 80 ? okColor : bPct >= 50 ? warnColor : lateColor },
                    ]}
                  >
                    {bPct.toFixed(0)}%
                  </Text>
                </View>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: 18,
    borderTopWidth: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  secTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  chipBtn: {
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipBtnText: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  ratioRow: {
    marginTop: 14,
  },
  ratioLabel: {
    fontSize: 14.5,
    fontWeight: '400',
    flex: 1,
  },
  detailChipBtn: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailChipText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  splitBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 2,
    overflow: 'hidden',
    gap: 2,
    marginTop: 14,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
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
    fontSize: 13,
  },
  legendBold: {
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  legendTotalText: {
    fontSize: 13,
  },
  subListSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  subListHeader: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  subItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderTopWidth: 1,
  },
  subItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    width: 60,
  },
  subItemTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  subItemMeta: {
    fontSize: 12.5,
    flex: 1,
    paddingHorizontal: 6,
    fontVariant: ['tabular-nums'],
  },
  subItemPct: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  statusTag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 64,
    alignItems: 'center',
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  statusDetailText: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  statusPctText: {
    fontSize: 13.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  branchLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderTopWidth: 1,
  },
  branchTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  branchSub: {
    fontSize: 12,
    marginTop: 1,
  },
  branchStatsCol: {
    alignItems: 'flex-end',
    gap: 1,
  },
  branchRatioText: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  branchPctText: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
})
