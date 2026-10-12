import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  LayoutChangeEvent,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import Svg, { Line, Path, Circle, Text as SvgText } from 'react-native-svg'
import { useThemeStore } from '@/theme/themeStore'

export interface CommodityMonthlyStat {
  month: number
  monthName: string
  value: number
  percentage: number
}

export interface CommodityStatItem {
  name: string
  color: string
  unit: string
  totalValue: number
  percentage: number
  monthly: CommodityMonthlyStat[]
}

export interface ModeCommodityStats {
  hasData: boolean
  totalResi: number
  commodities: CommodityStatItem[]
}

export interface CustomerCommodityStatsResult {
  year: number
  hasData: boolean
  sea: ModeCommodityStats
  air: ModeCommodityStats
}

interface CustomerCommodityTabProps {
  stats: CustomerCommodityStatsResult | null | undefined
  isLoading: boolean
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des']

export function CustomerCommodityTab({ stats, isLoading }: CustomerCommodityTabProps) {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'

  const lineColor = isDark ? '#222C38' : '#E3E7EC'
  const accentColor = isDark ? '#E0644E' : '#B8402C'
  const okColor = isDark ? '#4CC38A' : '#17855A'
  const surfaceColor = isDark ? '#131A23' : '#FFFFFF'
  const activeBg = isDark ? '#1C2633' : '#F1F5F9'

  // Default mode: prefer sea if available, else air
  const defaultMode = stats?.sea?.hasData ? 'sea' : stats?.air?.hasData ? 'air' : 'sea'
  const [selectedMode, setSelectedMode] = useState<'sea' | 'air'>(defaultMode)
  const [chartWidth, setChartWidth] = useState<number>(320)

  // Sync mode if stats change
  React.useEffect(() => {
    if (stats?.sea?.hasData && !stats?.air?.hasData) {
      setSelectedMode('sea')
    } else if (!stats?.sea?.hasData && stats?.air?.hasData) {
      setSelectedMode('air')
    }
  }, [stats])

  const handleModeChange = (newMode: 'sea' | 'air') => {
    Haptics.selectionAsync()
    setSelectedMode(newMode)
  }

  const handleChartLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout
    if (width > 50) {
      setChartWidth(width)
    }
  }

  const currentModeStats = selectedMode === 'sea' ? stats?.sea : stats?.air
  const commodities = currentModeStats?.commodities || []

  // Hitung koordinat SVG Line Chart
  const chartHeight = 170
  const padLeft = 32
  const padRight = 16
  const padTop = 18
  const padBottom = 26

  const usableWidth = Math.max(10, chartWidth - padLeft - padRight)
  const usableHeight = Math.max(10, chartHeight - padTop - padBottom)

  // Points generator untuk setiap komoditas
  const pathsData = useMemo(() => {
    return commodities.map((item) => {
      const points = item.monthly.map((m, idx) => {
        const x = padLeft + (idx / 11) * usableWidth
        // Percentage 0..100 -> y invert
        const y = padTop + usableHeight - (Math.min(100, Math.max(0, m.percentage)) / 100) * usableHeight
        return { x, y, percentage: m.percentage, value: m.value }
      })

      // Generate SVG path d string
      const pathD = points.reduce((acc, pt, idx) => {
        return idx === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`
      }, '')

      return {
        item,
        pathD,
        points,
      }
    })
  }, [commodities, chartWidth])

  if (isLoading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="small" color={accentColor} />
        <Text style={[styles.loadingText, { color: colors.secondary }]}>
          Memuat statistik komoditas pelanggan...
        </Text>
      </View>
    )
  }

  if (!stats || !stats.hasData) {
    return (
      <View style={[styles.emptyBox, { borderTopColor: lineColor }]}>
        <Text style={[styles.emptyTitle, { color: colors.primary }]}>
          Tidak Ada Data Komoditas
        </Text>
        <Text style={[styles.emptyText, { color: colors.secondary }]}>
          Belum ada catatan pengiriman barang untuk pelanggan ini pada tahun {stats?.year || new Date().getFullYear()}.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* SEKSI 1: DUA BAR PROPORSI (LAUT & UDARA) */}
      <View style={styles.barsSection}>
        <Text style={[styles.sectionHeading, { color: colors.primary }]}>
          Proporsi Komoditas ({stats.year})
        </Text>
        <Text style={[styles.sectionSub, { color: colors.secondary }]}>
          Ketuk bar laut atau udara untuk melihat rincian tren bulanan di bawah.
        </Text>

        {/* 1A. BAR PROPORSI LAUT */}
        {stats.sea.hasData && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleModeChange('sea')}
            style={[
              styles.barCard,
              {
                borderColor: selectedMode === 'sea' ? accentColor : lineColor,
                backgroundColor: selectedMode === 'sea' ? activeBg : surfaceColor,
              },
            ]}
          >
            <View style={styles.barHeader}>
              <View style={styles.barTitleRow}>
                <View style={[styles.modeDot, { backgroundColor: '#4B9CFA' }]} />
                <Text style={[styles.barTitle, { color: colors.primary }]}>
                  Kargo Laut
                </Text>
                {selectedMode === 'sea' && (
                  <View style={[styles.activeTag, { borderColor: accentColor }]}>
                    <Text style={[styles.activeTagText, { color: accentColor }]}>
                      Aktif di grafik
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.barResiCount, { color: colors.secondary }]}>
                {stats.sea.totalResi} resi
              </Text>
            </View>

            {/* Stacked Horizontal Progress Bar */}
            <View style={[styles.stackedBarContainer, { backgroundColor: isDark ? '#1C2633' : '#E2E8F0' }]}>
              {stats.sea.commodities.map((item, idx) => {
                const widthPct = Math.max(2, item.percentage)
                return (
                  <View
                    key={idx}
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: item.color,
                      height: '100%',
                    }}
                  />
                )
              })}
            </View>

            {/* Legend Rincian Komoditas Laut */}
            <View style={styles.legendGrid}>
              {stats.sea.commodities.map((item, idx) => (
                <View key={idx} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.legendName, { color: colors.primary }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.legendVal, { color: colors.secondary }]}>
                    {item.totalValue.toLocaleString('id-ID')} {item.unit} ({item.percentage}%)
                  </Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        )}

        {/* 1B. BAR PROPORSI UDARA */}
        {stats.air.hasData && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleModeChange('air')}
            style={[
              styles.barCard,
              {
                marginTop: stats.sea.hasData ? 12 : 0,
                borderColor: selectedMode === 'air' ? accentColor : lineColor,
                backgroundColor: selectedMode === 'air' ? activeBg : surfaceColor,
              },
            ]}
          >
            <View style={styles.barHeader}>
              <View style={styles.barTitleRow}>
                <View style={[styles.modeDot, { backgroundColor: '#E5A93C' }]} />
                <Text style={[styles.barTitle, { color: colors.primary }]}>
                  Kargo Udara
                </Text>
                {selectedMode === 'air' && (
                  <View style={[styles.activeTag, { borderColor: accentColor }]}>
                    <Text style={[styles.activeTagText, { color: accentColor }]}>
                      Aktif di grafik
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.barResiCount, { color: colors.secondary }]}>
                {stats.air.totalResi} resi
              </Text>
            </View>

            {/* Stacked Horizontal Progress Bar */}
            <View style={[styles.stackedBarContainer, { backgroundColor: isDark ? '#1C2633' : '#E2E8F0' }]}>
              {stats.air.commodities.map((item, idx) => {
                const widthPct = Math.max(2, item.percentage)
                return (
                  <View
                    key={idx}
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: item.color,
                      height: '100%',
                    }}
                  />
                )
              })}
            </View>

            {/* Legend Rincian Komoditas Udara */}
            <View style={styles.legendGrid}>
              {stats.air.commodities.map((item, idx) => (
                <View key={idx} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.legendName, { color: colors.primary }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.legendVal, { color: colors.secondary }]}>
                    {item.totalValue.toLocaleString('id-ID')} {item.unit} ({item.percentage}%)
                  </Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* SEKSI 2: GRAFIK GARIS TREN BULANAN (MULTI-LINE CHART) */}
      <View style={[styles.chartSection, { borderTopColor: lineColor }]}>
        <View style={styles.chartHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionHeading, { color: colors.primary }]}>
              Tren Bulanan Komoditas
            </Text>
            <Text style={[styles.sectionSub, { color: colors.secondary }]}>
              Fluktuasi persentase komoditas {selectedMode === 'sea' ? 'laut' : 'udara'} per bulan
            </Text>
          </View>

          {/* Segment Selector jika kedua moda tersedia */}
          {stats.sea.hasData && stats.air.hasData && (
            <View style={[styles.toggleWrap, { borderColor: lineColor }]}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleModeChange('sea')}
                style={[
                  styles.toggleBtn,
                  selectedMode === 'sea' && { backgroundColor: accentColor },
                ]}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    { color: selectedMode === 'sea' ? '#FFFFFF' : colors.secondary },
                  ]}
                >
                  Laut
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleModeChange('air')}
                style={[
                  styles.toggleBtn,
                  selectedMode === 'air' && { backgroundColor: accentColor },
                ]}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    { color: selectedMode === 'air' ? '#FFFFFF' : colors.secondary },
                  ]}
                >
                  Udara
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Area Render SVG Line Chart */}
        <View onLayout={handleChartLayout} style={styles.svgContainer}>
          <Svg width={chartWidth} height={chartHeight}>
            {/* Gridlines horizontal (0%, 25%, 50%, 75%, 100%) */}
            {[0, 25, 50, 75, 100].map((pct) => {
              const y = padTop + usableHeight - (pct / 100) * usableHeight
              return (
                <React.Fragment key={pct}>
                  <Line
                    x1={padLeft}
                    y1={y}
                    x2={padLeft + usableWidth}
                    y2={y}
                    stroke={lineColor}
                    strokeWidth={pct === 0 ? 1.5 : 0.75}
                    strokeDasharray={pct === 0 ? undefined : '3, 4'}
                  />
                  <SvgText
                    x={padLeft - 5}
                    y={y + 3.5}
                    fontSize="9"
                    fill={colors.secondary}
                    textAnchor="end"
                  >
                    {pct}%
                  </SvgText>
                </React.Fragment>
              )
            })}

            {/* Sumbu X Label Bulan */}
            {MONTH_NAMES.map((mName, idx) => {
              const x = padLeft + (idx / 11) * usableWidth
              return (
                <SvgText
                  key={idx}
                  x={x}
                  y={chartHeight - 6}
                  fontSize="8.5"
                  fill={colors.secondary}
                  textAnchor="middle"
                >
                  {mName}
                </SvgText>
              )
            })}

            {/* Render Garis Kurva untuk Tiap Komoditas */}
            {pathsData.map(({ item, pathD, points }, idx) => (
              <React.Fragment key={idx}>
                <Path
                  d={pathD}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Dots untuk data > 0 */}
                {points.map((pt, pIdx) => {
                  if (pt.percentage <= 0) return null
                  return (
                    <Circle
                      key={pIdx}
                      cx={pt.x}
                      cy={pt.y}
                      r="3.2"
                      fill={item.color}
                      stroke={surfaceColor}
                      strokeWidth="1.2"
                    />
                  )
                })}
              </React.Fragment>
            ))}
          </Svg>
        </View>

        {/* Legend Daftar Komoditas Garis */}
        <View style={styles.chartLegendWrap}>
          {commodities.map((item, idx) => (
            <View key={idx} style={styles.chartLegendChip}>
              <View style={[styles.chartLegendLine, { backgroundColor: item.color }]} />
              <Text style={[styles.chartLegendText, { color: colors.primary }]}>
                {item.name}
              </Text>
              <Text style={[styles.chartLegendVal, { color: colors.secondary }]}>
                {item.percentage}%
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyBox: {
    paddingVertical: 32,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  barsSection: {
    paddingBottom: 16,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  sectionSub: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 12,
  },
  barCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  barHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  barTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  barTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeTag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 4,
  },
  activeTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  barResiCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  stackedBarContainer: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 10,
  },
  legendGrid: {
    gap: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  legendName: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  legendVal: {
    fontSize: 11.5,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
  },
  chartSection: {
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 6,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  toggleWrap: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  svgContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartLegendWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 4,
  },
  chartLegendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  chartLegendLine: {
    width: 12,
    height: 3,
    borderRadius: 1.5,
  },
  chartLegendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  chartLegendVal: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
})
