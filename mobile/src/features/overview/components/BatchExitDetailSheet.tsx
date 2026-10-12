import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native'
import {
  X,
  Search,
  ChevronDown,
  ChevronUp,
  Package,
  Plane,
  Ship,
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useThemeStore } from '@/theme/themeStore'
import { useTranslation } from '@/hooks/useTranslation'
import { formatDate, formatNumber, formatDecimal } from '@/lib/utils'
import { useBatchExitCargoDetailsQuery } from '../hooks/useOperationBilling'
import {
  BatchExitItem,
  BatchExitComparisonSummary,
  BatchExitCargoItem,
} from '../services/operationBilling.service'

interface BatchExitDetailSheetProps {
  visible: boolean
  summary?: BatchExitComparisonSummary
  batches?: BatchExitItem[]
  onClose: () => void
}

function CargoItemsList({ markingCode }: { markingCode: string }) {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'
  const { data: cargoList = [], isLoading } = useBatchExitCargoDetailsQuery(markingCode, true)

  if (isLoading) {
    return (
      <View style={{ padding: 12, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={colors.tertiary} />
      </View>
    )
  }

  if (cargoList.length === 0) {
    return (
      <View style={{ padding: 10, alignItems: 'center' }}>
        <Text style={{ fontSize: 11, color: colors.secondary }}>
          Tidak ada data resi kargo dalam batch ini.
        </Text>
      </View>
    )
  }

  return (
    <View style={{ gap: 6, paddingTop: 6 }}>
      {cargoList.map((item: BatchExitCargoItem, idx: number) => {
        const isBilled = item.isBilled
        return (
          <View
            key={item.listCode || String(idx)}
            style={[
              styles.cargoItemRow,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderColor: colors.border,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.cargoListCode, { color: colors.primary }]}>
                  {item.listCode}
                </Text>
                {Boolean(item.custStatusLabel) && (
                  <View
                    style={[
                      styles.custStatusTag,
                      {
                        backgroundColor:
                          item.custStatus === 1
                            ? 'rgba(239, 68, 68, 0.15)'
                            : item.custStatus === 2
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(100, 116, 139, 0.15)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.custStatusText,
                        {
                          color:
                            item.custStatus === 1
                              ? '#EF4444'
                              : item.custStatus === 2
                              ? '#F59E0B'
                              : colors.secondary,
                        },
                      ]}
                    >
                      {item.custStatusLabel}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.cargoCustName, { color: colors.secondary }]} numberOfLines={1}>
                {item.custName} ({item.custCode})
              </Text>
              <Text style={[styles.cargoDimText, { color: colors.secondary }]}>
                {item.coly || 0} {item.satuan || 'koli'} • {formatDecimal(item.m3, 3)} m³ • {formatDecimal(item.berat, 1)} kg
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
              <Badge
                label={isBilled ? '✓ Billed' : 'Menanti Bill'}
                variant={isBilled ? 'success' : 'warning'}
              />
              {Boolean(item.sjNo) && (
                <Text style={[styles.cargoSjText, { color: colors.secondary }]}>
                  SJ: {item.sjNo}
                </Text>
              )}
            </View>
          </View>
        )
      })}
    </View>
  )
}

export function BatchExitDetailSheet({
  visible,
  summary,
  batches = [],
  onClose,
}: BatchExitDetailSheetProps) {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'
  const { t } = useTranslation()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'billed'>('pending')
  const [modeFilter, setModeFilter] = useState<'all' | '1' | '2'>('all')
  const [expandedMarkingCode, setExpandedMarkingCode] = useState<string | null>(null)

  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      // Status filter
      if (statusFilter === 'pending' && b.isFullyBilled) return false
      if (statusFilter === 'billed' && !b.isFullyBilled) return false

      // Mode filter
      if (modeFilter === '1' && b.listType !== 1) return false
      if (modeFilter === '2' && b.listType !== 2) return false

      // Search filter
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const code = (b.markingCode || '').toLowerCase()
        const branch = (b.branchName || b.branchCode || '').toLowerCase()
        if (!code.includes(q) && !branch.includes(q)) return false
      }

      return true
    })
  }, [batches, statusFilter, modeFilter, search])

  const toggleExpand = (code: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setExpandedMarkingCode((prev) => (prev === code ? null : code))
  }

  const renderBatchItem = ({ item: b }: { item: BatchExitItem }) => {
    const isAir = b.listType === 1
    const isExpanded = expandedMarkingCode === b.markingCode
    const pct = b.billedPercentage || 0
    const isComplete = b.isFullyBilled

    return (
      <Card
        style={[
          styles.batchCard,
          {
            backgroundColor: isDark ? colors.surface : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          },
        ]}
      >
        {/* Header: Marking Code, Mode, Date */}
        <View style={styles.batchHeader}>
          <View style={styles.markingCodeRow}>
            {isAir ? <Plane size={13} color="#F59E0B" /> : <Ship size={13} color="#0284C7" />}
            <Text style={[styles.markingCodeText, { color: colors.primary }]}>
              {b.markingCode}
            </Text>
            <Badge
              label={isAir ? 'Udara' : 'Laut'}
              variant={isAir ? 'warning' : 'info'}
            />
          </View>

          <Badge
            label={isComplete ? 'TUNTAS' : 'PENDING'}
            variant={isComplete ? 'success' : 'warning'}
          />
        </View>

        {/* Branch & Exit Date */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Building size={11} color={colors.secondary} />
            <Text style={[styles.metaText, { color: colors.secondary }]}>
              Cabang: {b.branchName || b.branchCode || '—'}
            </Text>
          </View>

          <View style={styles.metaItem}>
            <Calendar size={11} color={colors.secondary} />
            <Text style={[styles.metaText, { color: colors.secondary }]}>
              Exit: {formatDate(b.exitDate)}
            </Text>
          </View>
        </View>

        {/* Progress Bar & Kargo stats */}
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={[styles.progressStatText, { color: colors.secondary }]}>
              Kargo: <Text style={{ fontWeight: '700', color: colors.primary }}>{b.totalBilled}</Text> / {b.totalKargo} Billed
            </Text>
            <Text style={[styles.progressPctText, { color: isComplete ? '#10B981' : '#F59E0B' }]}>
              {pct.toFixed(0)}%
            </Text>
          </View>
          <View style={[styles.progressBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(pct, 100)}%`,
                  backgroundColor: isComplete ? '#10B981' : '#F59E0B',
                },
              ]}
            />
          </View>
        </View>

        {/* Customer status tags */}
        <View style={styles.customerStatusRow}>
          {b.customerStatus?.unbilledBlocked > 0 && (
            <View style={[styles.miniStatusTag, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <Text style={[styles.miniStatusText, { color: '#EF4444' }]}>
                🚨 Blocked: {b.customerStatus.unbilledBlocked}
              </Text>
            </View>
          )}
          {b.customerStatus?.unbilledWarning > 0 && (
            <View style={[styles.miniStatusTag, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Text style={[styles.miniStatusText, { color: '#F59E0B' }]}>
                ⚠️ Warning: {b.customerStatus.unbilledWarning}
              </Text>
            </View>
          )}
          {b.customerStatus?.unbilledUrgent > 0 && (
            <View style={[styles.miniStatusTag, { backgroundColor: 'rgba(14, 165, 233, 0.15)' }]}>
              <Text style={[styles.miniStatusText, { color: '#0284C7' }]}>
                ⚡ Urgent: {b.customerStatus.unbilledUrgent}
              </Text>
            </View>
          )}
          {b.customerStatus?.unbilledCod > 0 && (
            <View style={[styles.miniStatusTag, { backgroundColor: 'rgba(20, 184, 166, 0.15)' }]}>
              <Text style={[styles.miniStatusText, { color: '#0D9488' }]}>
                💵 COD: {b.customerStatus.unbilledCod}
              </Text>
            </View>
          )}
        </View>

        {/* Expand / Collapse Button */}
        <TouchableOpacity
          style={[styles.expandBtn, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}
          onPress={() => toggleExpand(b.markingCode)}
          activeOpacity={0.7}
        >
          <Text style={[styles.expandBtnText, { color: colors.tertiary }]}>
            {isExpanded ? 'Tutup Rincian Resi' : 'Lihat Rincian Resi'}
          </Text>
          {isExpanded ? (
            <ChevronUp size={13} color={colors.tertiary} />
          ) : (
            <ChevronDown size={13} color={colors.tertiary} />
          )}
        </TouchableOpacity>

        {/* Expandable Cargo List */}
        {isExpanded && <CargoItemsList markingCode={b.markingCode} />}
      </Card>
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: isDark ? '#0B0F17' : '#F7F5F2', borderColor: colors.border },
          ]}
        >
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <FileSpreadsheet size={16} color={colors.tertiary} />
                <Text style={[styles.modalTitle, { color: colors.primary }]}>
                  Rincian Batch Marking Exit
                </Text>
              </View>
              <Text style={[styles.modalSubtitle, { color: colors.secondary }]}>
                Pemantauan status penerbitan faktur batch kargo keluar gudang
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { borderColor: colors.border }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Quick Summary Pill Bar */}
          {summary && (
            <View style={styles.summaryBar}>
              <View style={[styles.summaryPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: colors.border }]}>
                <Text style={[styles.summaryPillText, { color: colors.secondary }]}>
                  Total: <Text style={{ fontWeight: '800', color: colors.primary }}>{summary.totalBatches}</Text> Batch
                </Text>
              </View>
              <View style={[styles.summaryPill, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFFFFF', borderColor: isDark ? 'rgba(245, 158, 11, 0.2)' : colors.border }]}>
                <Text style={[styles.summaryPillText, { color: '#F59E0B' }]}>
                  Pending: <Text style={{ fontWeight: '800' }}>{summary.pendingBatches}</Text>
                </Text>
              </View>
              <View style={[styles.summaryPill, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#FFFFFF', borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : colors.border }]}>
                <Text style={[styles.summaryPillText, { color: '#10B981' }]}>
                  Tuntas: <Text style={{ fontWeight: '800' }}>{summary.fullyBilledBatches}</Text>
                </Text>
              </View>
            </View>
          )}

          {/* Search Box */}
          <View style={styles.searchContainer}>
            <View
              style={[
                styles.searchBox,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Search size={14} color={colors.secondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.primary }]}
                placeholder="Cari kode marking, cabang..."
                placeholderTextColor={colors.secondary}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
              />
              {Boolean(search) && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <X size={14} color={colors.secondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filter Status Segment */}
          <View style={styles.segmentRow}>
            <SegmentedControl
              options={[
                { label: 'Pending Batch', value: 'pending' },
                { label: 'Semua Batch', value: 'all' },
                { label: 'Tuntas Billed', value: 'billed' },
              ]}
              selectedValue={statusFilter}
              onValueChange={(val) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                setStatusFilter(val as any)
              }}
            />
          </View>

          {/* Filter Moda Segment */}
          <View style={styles.segmentRow}>
            <SegmentedControl
              options={[
                { label: 'Semua Moda', value: 'all' },
                { label: '✈️ Udara', value: '1' },
                { label: '🚢 Laut', value: '2' },
              ]}
              selectedValue={modeFilter}
              onValueChange={(val) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                setModeFilter(val as any)
              }}
            />
          </View>

          {/* Batch List */}
          <FlatList
            data={filteredBatches}
            keyExtractor={(b, idx) => b.markingCode || String(idx)}
            renderItem={renderBatchItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <CheckCircle2 size={32} color={colors.tertiary} />
                <Text style={[styles.emptyText, { color: colors.primary }]}>
                  Tidak ada batch yang cocok
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.secondary }]}>
                  Semua batch telah selesai atau sesuaikan filter
                </Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    height: '92%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 10.5,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  summaryBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 6,
  },
  summaryPill: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  summaryPillText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    padding: 0,
  },
  segmentRow: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  listContent: {
    padding: 12,
    gap: 10,
    paddingBottom: 30,
  },
  batchCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  markingCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  markingCodeText: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
  },
  progressSection: {
    gap: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStatText: {
    fontSize: 11,
  },
  progressPctText: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  customerStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  miniStatusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniStatusText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  expandBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  expandBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cargoItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  cargoListCode: {
    fontSize: 11.5,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  custStatusTag: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  custStatusText: {
    fontSize: 8.5,
    fontWeight: '800',
  },
  cargoCustName: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  cargoDimText: {
    fontSize: 10,
    marginTop: 1,
  },
  cargoSjText: {
    fontSize: 9.5,
    marginTop: 3,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 6,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptySubtext: {
    fontSize: 11,
  },
})
