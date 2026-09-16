import React from 'react'
import { View, Text } from 'react-native'
import { Box, Ruler } from 'lucide-react-native'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SkeletonShimmer } from '@/components/ui/SkeletonShimmer'
import { useThemeStore } from '@/theme/themeStore'
import { formatDecimal, formatNumber } from '@/lib/utils'

interface ShipmentDimensionsTabProps {
  dimsPackingList: any[]
  dimsGudang: any[]
  dimsKomplain: any[]
  isDimsPackingListLoading: boolean
  isDimsGudangLoading: boolean
  isDimsKomplainLoading: boolean
  dimSubTab: 'packinglist' | 'gudang' | 'komplain'
  onDimSubTabChange: (val: 'packinglist' | 'gudang' | 'komplain') => void
  currentTotalVol: number
}

export function ShipmentDimensionsTab({
  dimsPackingList,
  dimsGudang,
  dimsKomplain,
  isDimsPackingListLoading,
  isDimsGudangLoading,
  isDimsKomplainLoading,
  dimSubTab,
  onDimSubTabChange,
  currentTotalVol,
}: ShipmentDimensionsTabProps) {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'

  const isSubLoading = dimSubTab === 'packinglist'
    ? isDimsPackingListLoading
    : dimSubTab === 'gudang'
    ? isDimsGudangLoading
    : isDimsKomplainLoading

  const items: any[] = dimSubTab === 'packinglist'
    ? dimsPackingList
    : dimSubTab === 'gudang'
    ? dimsGudang
    : dimsKomplain

  return (
    <View style={{ gap: 12 }}>
      {/* Sub-Tabs Switcher */}
      <SegmentedControl
        options={[
          { label: dimsPackingList.length > 0 ? `Packing List (${dimsPackingList.length})` : 'Packing List', value: 'packinglist' },
          { label: dimsGudang.length > 0 ? `Gudang (${dimsGudang.length})` : 'Ukuran Gudang', value: 'gudang' },
          { label: dimsKomplain.length > 0 ? `Komplain (${dimsKomplain.length})` : 'Komplain', value: 'komplain' },
        ]}
        selectedValue={dimSubTab}
        onValueChange={(val: any) => onDimSubTabChange(val)}
      />

      {/* Total Volume Banner */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(37, 99, 235, 0.25)',
        backgroundColor: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(37, 99, 235, 0.05)',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Box size={14} color={colors.tertiary} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
            Total Volume {dimSubTab === 'packinglist' ? 'Packing List' : dimSubTab === 'gudang' ? 'Ukuran Gudang' : 'Komplain'}
          </Text>
        </View>
        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.tertiary, fontVariant: ['tabular-nums'] }}>
          {formatDecimal(currentTotalVol, 4)} m³
        </Text>
      </View>

      {/* Dimension Items */}
      {isSubLoading ? (
        <View style={{ gap: 8 }}>
          <SkeletonShimmer height={75} />
          <SkeletonShimmer height={75} />
        </View>
      ) : items.length === 0 ? (
        <View style={{
          padding: 24,
          borderRadius: 12,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: colors.border,
          alignItems: 'center',
          gap: 8,
        }}>
          <Ruler size={24} color={colors.secondary} />
          <Text style={{ color: colors.secondary, fontSize: 12, textAlign: 'center' }}>
            {dimSubTab === 'packinglist'
              ? 'Tidak ada data packing list.'
              : dimSubTab === 'gudang'
              ? 'Tidak ada data ukuran fisik gudang.'
              : 'Tidak ada data komplain.'}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {items.map((dim, idx) => {
            const volume = (Number(dim.fdPjg || 0) * Number(dim.fdLbr || 0) * Number(dim.fdTng || 0) * Number(dim.fdQty || 0)) / 1_000_000
            return (
              <Card key={`${dim.fdListCode}-${dim.fdListDCode || idx}`} style={{ padding: 12, gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
                    <View style={{
                      width: 20, height: 20, borderRadius: 10,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.secondary }}>
                        {idx + 1}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }} numberOfLines={1}>
                      {dim.fdDescr || `Koli #${idx + 1}`}
                    </Text>
                  </View>
                  <Badge label={`${formatDecimal(volume, 4)} m³`} variant="info" />
                </View>

                {/* 4-Metric Grid */}
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[
                    { label: 'Panjang', val: dim.fdPjg, unit: 'cm' },
                    { label: 'Lebar', val: dim.fdLbr, unit: 'cm' },
                    { label: 'Tinggi', val: dim.fdTng, unit: 'cm' },
                    { label: 'Jumlah', val: dim.fdQty, unit: 'pcs' },
                  ].map((m) => (
                    <View key={m.label} style={{
                      flex: 1,
                      paddingVertical: 6,
                      paddingHorizontal: 4,
                      borderRadius: 8,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      borderWidth: 1,
                      borderColor: colors.border,
                      alignItems: 'center',
                    }}>
                      <Text style={{ fontSize: 9.5, color: colors.secondary, textTransform: 'uppercase', fontWeight: '600' }}>
                        {m.label}
                      </Text>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'], marginTop: 2 }}
                        numberOfLines={1}>
                        {m.val != null ? formatNumber(m.val) : '—'}
                      </Text>
                      <Text style={{ fontSize: 9.5, color: colors.secondary }}>
                        {m.unit}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            )
          })}
        </View>
      )}
    </View>
  )
}
