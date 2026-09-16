import React from 'react'
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { X } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useThemeStore } from '@/theme/themeStore'

interface AlertDetailModalProps {
  visible: boolean
  type: 'eta' | 'sla'
  title: string
  subtitle: string
  items: any[]
  onClose: () => void
  onSelectBatch?: (batch: any) => void
}

export function AlertDetailModal({
  visible,
  type,
  title,
  subtitle,
  items,
  onClose,
  onSelectBatch,
}: AlertDetailModalProps) {
  const router = useRouter()
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.modalTitle, { color: colors.primary }]}>
                {title}
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.secondary }]}>
                {subtitle}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.modalCloseBtn, { borderColor: colors.border }]}
            >
              <X size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Modal Body */}
          <ScrollView contentContainerStyle={styles.modalScroll}>
            {items.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={[styles.modalEmptyText, { color: colors.secondary }]}>
                  Tidak ada data keterlambatan consignee saat ini.
                </Text>
              </View>
            ) : (
              items.map((item, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.modalItemCard,
                    {
                      borderColor: colors.border,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                    },
                  ]}
                >
                  <View style={styles.modalItemHeader}>
                    <Text style={[styles.modalConsigneeName, { color: colors.primary }]}>
                      {item.name || 'Unknown Consignee'}
                    </Text>
                    <View
                      style={[
                        styles.modalCountBadge,
                        {
                          backgroundColor: type === 'eta' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          borderColor: type === 'eta' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalCountText,
                          { color: type === 'eta' ? '#F59E0B' : '#EF4444' },
                        ]}
                      >
                        {item.count} BATCH
                      </Text>
                    </View>
                  </View>

                  {/* Batch Chips list */}
                  <View style={styles.modalBatchChips}>
                    {(item.codes || []).map((b: any, bIdx: number) => (
                      <TouchableOpacity
                        key={bIdx}
                        activeOpacity={0.7}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                          onClose()
                          if (onSelectBatch) {
                            onSelectBatch({ fdMarkingCode: b.code })
                          } else {
                            router.push({
                              pathname: '/(tabs)/logistics',
                              params: {
                                tab: 'batches',
                                markingCode: b.code,
                                search: b.code,
                                t: Date.now().toString(),
                              },
                            })
                          }
                        }}
                        style={[
                          styles.batchChip,
                          {
                            borderColor: colors.border,
                            backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                          },
                        ]}
                      >
                        <Text style={[styles.batchChipCode, { color: colors.primary }]}>
                          {b.code}
                        </Text>
                        {type === 'eta' ? (
                          <Text style={styles.batchChipTagEta}>
                            +{b.aging} hr
                          </Text>
                        ) : (
                          <Text style={styles.batchChipTagSla}>
                            {b.transit}h / tgt {b.target}h
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    height: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalScroll: {
    padding: 16,
    gap: 12,
  },
  modalEmpty: {
    padding: 30,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 12,
  },
  modalItemCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  modalItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalConsigneeName: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  modalCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalCountText: {
    fontSize: 10,
    fontWeight: '800',
  },
  modalBatchChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  batchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  batchChipCode: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  batchChipTagEta: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
  },
  batchChipTagSla: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },
})
