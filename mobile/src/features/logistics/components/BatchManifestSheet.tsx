import React from 'react'
import { View, Text, Modal, FlatList, TouchableOpacity } from 'react-native'
import { X, ShieldAlert } from 'lucide-react-native'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SkeletonShimmer } from '@/components/ui/SkeletonShimmer'
import { useThemeStore } from '@/theme/themeStore'
import { useTranslation } from '@/hooks/useTranslation'
import { formatNumber, formatDecimal, displayCustName, cleanFoxProString } from '@/lib/utils'
import { getFinancialStatusBadge } from '../utils/logistics.utils'
import { useBatchManifest } from '../hooks/useBatchManifest'

interface BatchManifestSheetProps {
  selectedBatch: any | null
  onClose: () => void
  setSelectedBatch: (v: any) => void
}

export function BatchManifestSheet({ selectedBatch, onClose, setSelectedBatch }: BatchManifestSheetProps) {
  const { colors, mode } = useThemeStore()
  const { t } = useTranslation()
  const isDark = mode === 'midnight'

  const { manifestData, isManifestLoading, manifestSummary } = useBatchManifest(selectedBatch, setSelectedBatch)

  return (
    <Modal
      visible={Boolean(selectedBatch)}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View style={{
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderWidth: 1,
          maxHeight: '85%',
          paddingBottom: 36,
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }}>
          {/* Sheet Header */}
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', letterSpacing: 0.5, color: colors.primary }}>
                {t('logistics.manifestBatch', 'MANIFEST BATCH MARKING')}
              </Text>
              <Text style={{ fontSize: 12, marginTop: 2, color: colors.secondary }}>
                {selectedBatch?.fdMarkingCode?.trim()}
                {selectedBatch?.fdContNo?.trim() ? ` • Kontainer: ${selectedBatch.fdContNo.trim()}` : ''}
                {` • ${selectedBatch?.fdBranchCode?.trim() || selectedBatch?.fdBranch?.trim() || 'Pusat'}`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{ padding: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
            >
              <X size={18} color={colors.secondary} />
            </TouchableOpacity>
          </View>

          {/* Batch Summary & KPI Overview */}
          <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, gap: 8 }}>
            {selectedBatch?.fdKet ? (
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }} numberOfLines={2}>
                {selectedBatch.fdKet.trim()}
              </Text>
            ) : null}

            {/* 4-Metric KPI Grid */}
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {/* Total Koli/Pack */}
                <View style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.secondary, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    {t('logistics.totalColy', 'Total Koli')}
                  </Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'], marginTop: 2 }}
                    numberOfLines={1} adjustsFontSizeToFit>
                    {formatNumber(manifestSummary.totalPack)}
                  </Text>
                </View>

                {/* Total Berat */}
                <View style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.secondary, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    {t('logistics.totalWeight', 'Total Berat')}
                  </Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'], marginTop: 2 }}
                    numberOfLines={1} adjustsFontSizeToFit>
                    {formatDecimal(manifestSummary.totalBerat, 1)} kg
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 6 }}>
                {/* Total M3 */}
                <View style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.secondary, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    {t('logistics.totalVolume', 'Total Volume')}
                  </Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'], marginTop: 2 }}
                    numberOfLines={1} adjustsFontSizeToFit>
                    {formatDecimal(manifestSummary.totalM3, 4)} m³
                  </Text>
                </View>

                {/* Total Customer & Resi */}
                <View style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.secondary, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    {t('logistics.totalCustomer', 'Customer')} & {t('logistics.totalResi', 'Resi')}
                  </Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'], marginTop: 2 }}
                    numberOfLines={1} adjustsFontSizeToFit>
                    {formatNumber(manifestSummary.totalCustomer)} {t('logistics.totalCustomer', 'Cust')} • {manifestSummary.totalResi} {t('logistics.totalResi', 'Resi')}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Manifest Items List */}
          {isManifestLoading ? (
            <View style={{ padding: 16, gap: 10 }}>
              <SkeletonShimmer height={60} />
              <SkeletonShimmer height={60} />
              <SkeletonShimmer height={60} />
            </View>
          ) : manifestData && manifestData.length > 0 ? (
            <FlatList
              data={manifestData}
              keyExtractor={(item, idx) => item.fdTerima || item.fdListCode || String(idx)}
              contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 36 }}
              renderItem={({ item, index }) => {
                const finBadge = getFinancialStatusBadge(item.financialStatus, item.isBlocked)
                const isItemBlocked = finBadge.label === 'BLOCKED'

                return (
                  <Card style={{ padding: 12, gap: 6 }}>
                    {/* Row 1: Nomor Urut & Resi/ListCode + Status Finansial */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary, flex: 1, marginRight: 8 }}>
                        #{index + 1} {item.fdTerima?.trim() || item.fdListCode?.trim()}
                      </Text>
                      <Badge
                        label={finBadge.label}
                        variant={finBadge.variant}
                        style={{ paddingHorizontal: 6, paddingVertical: 1, flexShrink: 0 }}
                        textStyle={{ fontSize: 10, fontWeight: '700' }}
                      />
                    </View>

                    {/* Marking No & Branch Code — fix overflow */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
                      {item.fdMarkingNo?.trim() ? (
                        <View style={{
                          paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                          borderWidth: 1, borderColor: colors.border,
                        }}>
                          <Text style={{ fontSize: 10.5, color: colors.secondary }}>
                            Marking: <Text style={{ fontWeight: '700', color: colors.primary }}>{item.fdMarkingNo.trim()}</Text>
                          </Text>
                        </View>
                      ) : null}
                      {item.fdBranchCode?.trim() ? (
                        <View style={{
                          paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                          borderWidth: 1, borderColor: colors.border,
                        }}>
                          <Text style={{ fontSize: 10.5, color: colors.secondary }}>
                            Cab: <Text style={{ fontWeight: '700', color: colors.primary }}>{item.fdBranchCode.trim()}</Text>
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Banner Blocked Finance */}
                    {isItemBlocked ? (
                      <View style={{
                        padding: 8, borderRadius: 8,
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                        borderWidth: 1, borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FCA5A5',
                        gap: 3,
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <ShieldAlert size={12} color="#EF4444" />
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#EF4444', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              FINANCE BLOCKED
                            </Text>
                          </View>
                          {item.blockedBy?.trim() ? (
                            <Text style={{ fontSize: 10, color: colors.secondary }}>
                              by: <Text style={{ fontWeight: '700', color: colors.primary }}>{item.blockedBy.trim()}</Text>
                            </Text>
                          ) : null}
                        </View>
                        {item.blockedReason?.trim() ? (
                          <Text style={{ fontSize: 11, color: isDark ? '#FCA5A5' : '#DC2626', fontStyle: 'italic', lineHeight: 15 }}>
                            "{item.blockedReason.trim()}"
                          </Text>
                        ) : null}
                      </View>
                    ) : null}

                    {/* Row 2: Customer Name + Sales Badge */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 12.5, color: colors.primary, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                        {displayCustName(item.fdCustName)}
                      </Text>
                      {item.fdSalesNM?.trim() ? (
                        <View style={{
                          flexDirection: 'row', alignItems: 'center', gap: 3,
                          paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 6,
                          borderWidth: 1, borderColor: colors.border,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                        }}>
                          <Text style={{ fontSize: 10, color: colors.secondary }}>Sales:</Text>
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.primary }}>
                            {item.fdSalesNM.trim()}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Row 3: Komoditas */}
                    <View style={{
                      padding: 8, borderRadius: 8,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      borderWidth: 1, borderColor: colors.border, gap: 4,
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.secondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Komoditas
                        </Text>
                        {(item.typeComodityName?.trim() || item.fdComodityName?.trim()) && (
                          <Badge
                            label={item.typeComodityName?.trim() || item.fdComodityName?.trim() || 'UMUM'}
                            variant="info"
                            style={{ paddingHorizontal: 6, paddingVertical: 1 }}
                            textStyle={{ fontSize: 10, fontWeight: '700' }}
                          />
                        )}
                      </View>
                      <Text style={{ fontSize: 11.5, color: colors.primary, fontWeight: '600', lineHeight: 16 }}>
                        {cleanFoxProString(item.fdComodity) || '—'}
                      </Text>
                    </View>

                    {/* Row 4: Metrics */}
                    <View style={{
                      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                      borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6, marginTop: 2,
                    }}>
                      <Text style={{ fontSize: 11, color: colors.secondary, fontVariant: ['tabular-nums'] }}>
                        {formatNumber(item.fdJmlPack)} {item.fdSatuan?.trim() || 'Pack'} • {formatDecimal(item.fdJmlBerat, 1)} kg
                      </Text>
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.tertiary, fontVariant: ['tabular-nums'] }}>
                        {formatDecimal(item.fdM3, 4)} m³
                      </Text>
                    </View>
                  </Card>
                )
              }}
            />
          ) : (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Text style={{ color: colors.secondary, fontSize: 12 }}>
                Tidak ada manifest ditemukan dalam batch ini.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}
