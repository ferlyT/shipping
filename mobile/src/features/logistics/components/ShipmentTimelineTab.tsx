import React from 'react'
import { View, Text } from 'react-native'
import { X, ShieldAlert, Check } from 'lucide-react-native'
import { Card } from '@/components/ui/Card'
import { useThemeStore } from '@/theme/themeStore'
import { formatDate } from '@/lib/utils'

interface ShipmentTimelineTabProps {
  activeShipment: any
}

export function ShipmentTimelineTab({ activeShipment }: ShipmentTimelineTabProps) {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'

  const status = activeShipment?.shipmentStatus
  const currentStep = status?.statusStep ?? 0
  const gudang = status?.fdGudang?.trim()
  const isCanceled = currentStep === -1 || Number(activeShipment?.fdCancel) === 1
  const isBlocked = currentStep === 10 || status?.statusLabel === 'Blocked' || Boolean(status?.isBlocked)

  if (isCanceled) {
    return (
      <View style={{
        padding: 20, borderRadius: 14, borderWidth: 1,
        borderColor: isDark ? 'rgba(248, 113, 113, 0.4)' : '#FCA5A5',
        backgroundColor: isDark ? 'rgba(248, 113, 113, 0.1)' : '#FEF2F2',
        alignItems: 'center', gap: 8,
      }}>
        <View style={{
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: isDark ? 'rgba(248, 113, 113, 0.2)' : '#FEE2E2',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={20} color="#EF4444" strokeWidth={2.5} />
        </View>
        <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.primary }}>
          Pengiriman Dibatalkan (Canceled)
        </Text>
        <Text style={{ fontSize: 11.5, color: colors.secondary, textAlign: 'center', lineHeight: 18 }}>
          Data resi ini memiliki status dibatalkan (fdCancel = 1). Seluruh aktivitas dan tahapan logistik tidak dilanjutkan.
        </Text>
      </View>
    )
  }

  if (isBlocked) {
    return (
      <View style={{
        padding: 20, borderRadius: 14, borderWidth: 1,
        borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FCA5A5',
        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
        alignItems: 'center', gap: 8,
      }}>
        <View style={{
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldAlert size={20} color="#EF4444" strokeWidth={2.5} />
        </View>
        <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.primary }}>
          Pengiriman Ditahan / Diblokir (Blocked)
        </Text>
        <Text style={{ fontSize: 11.5, color: colors.secondary, textAlign: 'center', lineHeight: 18 }}>
          Resi pengiriman ini diblokir oleh Finance sehingga proses pengiriman barang ditahan.
        </Text>
        <View style={{
          marginTop: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
          backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
          borderWidth: 1, borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
          alignItems: 'center', gap: 4,
        }}>
          {status?.blockedBy ? (
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
              Blocked by: <Text style={{ color: '#EF4444' }}>{status.blockedBy.trim()}</Text>
            </Text>
          ) : null}
          {status?.blockedReason ? (
            <Text style={{ fontSize: 10.5, fontStyle: 'italic', color: colors.secondary, textAlign: 'center' }}>
              "{status.blockedReason.trim()}"
            </Text>
          ) : null}
        </View>
      </View>
    )
  }

  const steps = [
    { label: 'Waiting Loading', desc: 'Menunggu proses loading ke kontainer', date: status?.fdLoadDate, stepValue: 1 },
    { label: 'ETD (Keberangkatan)', desc: 'Estimated Time of Departure', date: status?.fdETD, stepValue: 2 },
    { label: 'ETA (Kedatangan)', desc: 'Estimated Time of Arrival di pelabuhan', date: status?.fdETA, stepValue: 3 },
    { label: 'Warehouse (Gudang)', desc: gudang ? `Tiba di ${gudang}` : 'Tiba di gudang penyortiran', date: status?.fdExitDate, stepValue: 4 },
    { label: 'Delivery', desc: 'Dalam pengantaran ke penerima', date: null, stepValue: 5, noDate: true },
    { label: 'Delivered', desc: 'Barang telah diterima oleh customer', date: null, stepValue: 6, noDate: true },
  ]

  return (
    <Card style={{ padding: 16 }}>
      <View style={{ gap: 0 }}>
        {steps.map((step, idx) => {
          const isDone = currentStep >= step.stepValue
          const isCurrent = currentStep === step.stepValue
          const isLast = idx === steps.length - 1

          return (
            <View key={step.label} style={{ flexDirection: 'row', minHeight: 64 }}>
              {/* Step Indicator & Line */}
              <View style={{ width: 28, alignItems: 'center' }}>
                <View style={{
                  width: 24, height: 24, borderRadius: 12, borderWidth: 2,
                  borderColor: isDone ? '#10B981' : colors.border,
                  backgroundColor: isDone ? '#10B981' : colors.surface,
                  alignItems: 'center', justifyContent: 'center', zIndex: 2,
                }}>
                  {isDone ? (
                    <Check size={12} color="#FFFFFF" strokeWidth={3} />
                  ) : (
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border }} />
                  )}
                </View>
                {!isLast && (
                  <View style={{
                    flex: 1, width: 2,
                    backgroundColor: currentStep > step.stepValue ? '#10B981' : colors.border,
                    marginVertical: 2,
                  }} />
                )}
              </View>

              {/* Step Content */}
              <View style={{ flex: 1, paddingLeft: 10, paddingBottom: isLast ? 0 : 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <Text style={{
                    fontSize: 12.5,
                    fontWeight: isDone ? '700' : '600',
                    color: isDone ? colors.primary : colors.secondary,
                  }}>
                    {step.label}
                  </Text>
                  {isCurrent && (
                    <View style={{
                      paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4,
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5',
                    }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: '#10B981', textTransform: 'uppercase' }}>
                        Berjalan
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 11, color: colors.secondary, marginTop: 1 }}>{step.desc}</Text>
                <View style={{ marginTop: 4 }}>
                  {(step as any).noDate ? (
                    <Text style={{ fontSize: 10.5, fontWeight: '600', color: isDone ? '#10B981' : colors.secondary }}>
                      {isDone ? '✓ Selesai' : '• Menunggu'}
                    </Text>
                  ) : step.date ? (
                    <Text style={{ fontSize: 10.5, fontWeight: '600', color: isDone ? colors.primary : colors.secondary, fontVariant: ['tabular-nums'] }}>
                      {formatDate(step.date)}
                    </Text>
                  ) : (
                    <Text style={{ fontSize: 10.5, color: colors.secondary }}>Menunggu</Text>
                  )}
                </View>
              </View>
            </View>
          )
        })}
      </View>
    </Card>
  )
}
