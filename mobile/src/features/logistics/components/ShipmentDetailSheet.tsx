import React, { useState, useMemo } from 'react'
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native'
import { X, MapPin, ClipboardList } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Badge } from '@/components/ui/Badge'
import { useThemeStore } from '@/theme/themeStore'
import { displayCustName } from '@/lib/utils'
import { getShipmentStatusBadge } from '../utils/logistics.utils'
import { useShipmentDetail } from '../hooks/useShipmentDetail'
import { ShipmentInfoTab } from './ShipmentInfoTab'
import { ShipmentDimensionsTab } from './ShipmentDimensionsTab'
import { ShipmentTimelineTab } from './ShipmentTimelineTab'
import { ShipmentInvoiceTab } from './ShipmentInvoiceTab'

interface ShipmentDetailSheetProps {
  selectedItem: any | null
  onClose: () => void
  onCreateBap?: (item: any) => void
}

export function ShipmentDetailSheet({ selectedItem, onClose, onCreateBap }: ShipmentDetailSheetProps) {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'

  const [shipmentTab, setShipmentTab] = useState<'info' | 'dimensions' | 'timeline' | 'invoice'>('info')
  const [dimSubTab, setDimSubTab] = useState<'packinglist' | 'gudang' | 'komplain'>('packinglist')

  const selectedShipmentCode = selectedItem?.fdListCode?.trim()

  const {
    activeShipment,
    dimsPackingList,
    dimsGudang,
    dimsKomplain,
    isDimsPackingListLoading,
    isDimsGudangLoading,
    isDimsKomplainLoading,
    totalDimCount,
    getSubTabVolume,
  } = useShipmentDetail(selectedShipmentCode, selectedItem)

  const currentTotalVol = useMemo(() => getSubTabVolume(dimSubTab), [dimSubTab, getSubTabVolume])

  const hasIssuedInvoice = Boolean(
    activeShipment?.invoice && (
      activeShipment.invoice.isIssued ||
      activeShipment.invoice.isCollected ||
      activeShipment.invoice.isPaid ||
      (activeShipment.invoice.fdGive != null && Number(activeShipment.invoice.fdGive) >= 1)
    )
  )

  const options = [
    { label: 'Ringkasan', value: 'info' },
    { label: totalDimCount > 0 ? `Dimensi (${totalDimCount})` : 'Dimensi', value: 'dimensions' },
    { label: 'Timeline', value: 'timeline' },
    ...(hasIssuedInvoice ? [{ label: 'Invoice', value: 'invoice' }] : []),
  ]

  const currentTab = shipmentTab === 'invoice' && !hasIssuedInvoice ? 'info' : shipmentTab
  const statusBadge = getShipmentStatusBadge(activeShipment?.shipmentStatus)

  return (
    <Modal
      visible={Boolean(selectedItem)}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View style={{
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderWidth: 1,
          maxHeight: '80%',
          paddingBottom: 36,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          height: '86%',
        }}>
          {/* Sheet Header */}
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
          }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', letterSpacing: 0.5, color: colors.primary }} numberOfLines={1}>
                {displayCustName(activeShipment?.fdCustName, 'Customer Tidak Dikenal')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                <View style={{
                  paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  borderWidth: 1, borderColor: colors.border,
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'] }}>
                    {activeShipment?.fdListCode}
                  </Text>
                </View>
                <Badge label={statusBadge.label} variant={statusBadge.variant} />
                {activeShipment?.shipmentStatus?.fdGudang?.trim() ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <MapPin size={11} color={colors.secondary} />
                    <Text style={{ fontSize: 11, color: colors.secondary, fontWeight: '500' }}>
                      {activeShipment.shipmentStatus.fdGudang.trim()}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {onCreateBap && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    onCreateBap(activeShipment || selectedItem)
                    onClose()
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.tabBarActive,
                    backgroundColor: isDark
                      ? 'rgba(56, 189, 248, 0.15)'
                      : 'rgba(2, 132, 199, 0.1)',
                  }}
                >
                  <ClipboardList size={13} color={colors.tabBarActive} />
                  <Text
                    style={{
                      fontSize: 11.5,
                      fontWeight: '700',
                      color: colors.tabBarActive,
                    }}
                  >
                    Buat BAP
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={onClose}
                style={{
                  padding: 6,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <X size={18} color={colors.secondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tabs */}
          <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
            <SegmentedControl
              options={options}
              selectedValue={currentTab}
              onValueChange={(val: any) => setShipmentTab(val)}
            />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingTop: 6, paddingBottom: 36, gap: 12 }}
            showsVerticalScrollIndicator={true}
          >
            {currentTab === 'info' && (
              <ShipmentInfoTab activeShipment={activeShipment} />
            )}
            {currentTab === 'dimensions' && (
              <ShipmentDimensionsTab
                dimsPackingList={dimsPackingList}
                dimsGudang={dimsGudang}
                dimsKomplain={dimsKomplain}
                isDimsPackingListLoading={isDimsPackingListLoading}
                isDimsGudangLoading={isDimsGudangLoading}
                isDimsKomplainLoading={isDimsKomplainLoading}
                dimSubTab={dimSubTab}
                onDimSubTabChange={setDimSubTab}
                currentTotalVol={currentTotalVol}
              />
            )}
            {currentTab === 'timeline' && (
              <ShipmentTimelineTab activeShipment={activeShipment} />
            )}
            {currentTab === 'invoice' && activeShipment?.invoice && (
              <ShipmentInvoiceTab
                invoice={activeShipment.invoice}
                fdListCode={activeShipment?.fdListCode}
              />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
