import React, { useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import { Plus, ClipboardList, Search, FileText } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useThemeStore } from '@/theme/themeStore'
import { SearchBar } from '@/components/ui/SearchBar'
import { SkeletonShimmer } from '@/components/ui/SkeletonShimmer'
import { Card } from '@/components/ui/Card'
import { useDebounce } from '@/hooks/useDebounce'
import { useInspectionReports } from '../hooks/useInspectionReports'
import { useInspectionMutations } from '../hooks/useInspectionMutations'
import { InspectionListItem } from './InspectionListItem'
import { InspectionDetailSheet } from './InspectionDetailSheet'
import { InspectionFormSheet } from './InspectionFormSheet'
import { BapPhotoSheet } from './BapPhotoSheet'
import type {
  InspectionReport,
  CreateInspectionPayload,
  UpdateInspectionPayload,
} from '../types/inspectionReport.types'

export function InspectionTab() {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [statusFilter, setStatusFilter] = useState<'all' | '1' | '2'>('all')

  const [detailItem, setDetailItem] = useState<InspectionReport | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const [formItem, setFormItem] = useState<InspectionReport | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const [photoItem, setPhotoItem] = useState<InspectionReport | null>(null)
  const [isPhotoOpen, setIsPhotoOpen] = useState(false)

  const {
    data: reports,
    total,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useInspectionReports(debouncedSearch, statusFilter)

  const { createMutation, updateMutation, deleteMutation } = useInspectionMutations()

  const handleOpenDetail = (item: InspectionReport) => {
    setDetailItem(item)
    setIsDetailOpen(true)
  }

  const handleOpenCreate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setFormItem(null)
    setIsFormOpen(true)
  }

  const handleOpenEdit = (item: InspectionReport) => {
    setFormItem(item)
    setIsFormOpen(true)
  }

  const handleOpenPhoto = (item: InspectionReport) => {
    setPhotoItem(item)
    setIsPhotoOpen(true)
  }

  const handleFormSubmit = async (
    payload: CreateInspectionPayload | UpdateInspectionPayload
  ) => {
    if (formItem) {
      await updateMutation.mutateAsync({ id: formItem.fdId, payload })
    } else {
      await createMutation.mutateAsync(payload as CreateInspectionPayload)
    }
  }

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync(id)
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchRow}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Cari BAP (nomor, customer, marking)..."
        />
      </View>

      {/* Status Filter Chips */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync()
            setStatusFilter('all')
          }}
          style={[
            styles.filterChip,
            {
              borderColor:
                statusFilter === 'all'
                  ? colors.tabBarActive
                  : colors.border,
              backgroundColor:
                statusFilter === 'all'
                  ? isDark
                    ? 'rgba(56, 189, 248, 0.15)'
                    : 'rgba(2, 132, 199, 0.1)'
                  : isDark
                  ? 'rgba(255, 255, 255, 0.03)'
                  : 'rgba(0, 0, 0, 0.03)',
            },
          ]}
        >
          <Text
            style={[
              styles.filterText,
              {
                color:
                  statusFilter === 'all'
                    ? colors.tabBarActive
                    : colors.secondary,
                fontWeight: statusFilter === 'all' ? '700' : '500',
              },
            ]}
          >
            Semua ({total})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync()
            setStatusFilter('1')
          }}
          style={[
            styles.filterChip,
            {
              borderColor:
                statusFilter === '1'
                  ? colors.warning
                  : colors.border,
              backgroundColor:
                statusFilter === '1'
                  ? isDark
                    ? 'rgba(251, 191, 36, 0.15)'
                    : 'rgba(217, 119, 6, 0.1)'
                  : isDark
                  ? 'rgba(255, 255, 255, 0.03)'
                  : 'rgba(0, 0, 0, 0.03)',
            },
          ]}
        >
          <Text
            style={[
              styles.filterText,
              {
                color:
                  statusFilter === '1'
                    ? colors.warning
                    : colors.secondary,
                fontWeight: statusFilter === '1' ? '700' : '500',
              },
            ]}
          >
            Draft
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync()
            setStatusFilter('2')
          }}
          style={[
            styles.filterChip,
            {
              borderColor:
                statusFilter === '2'
                  ? colors.success
                  : colors.border,
              backgroundColor:
                statusFilter === '2'
                  ? isDark
                    ? 'rgba(52, 211, 153, 0.15)'
                    : 'rgba(5, 150, 105, 0.1)'
                  : isDark
                  ? 'rgba(255, 255, 255, 0.03)'
                  : 'rgba(0, 0, 0, 0.03)',
            },
          ]}
        >
          <Text
            style={[
              styles.filterText,
              {
                color:
                  statusFilter === '2'
                    ? colors.success
                    : colors.secondary,
                fontWeight: statusFilter === '2' ? '700' : '500',
              },
            ]}
          >
            Selesai
          </Text>
        </TouchableOpacity>
      </View>

      {/* List / Loading / Empty */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <SkeletonShimmer height={80} style={{ borderRadius: 12, marginBottom: 8 }} />
          <SkeletonShimmer height={80} style={{ borderRadius: 12, marginBottom: 8 }} />
          <SkeletonShimmer height={80} style={{ borderRadius: 12, marginBottom: 8 }} />
          <SkeletonShimmer height={80} style={{ borderRadius: 12, marginBottom: 8 }} />
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.emptyIconCircle,
              {
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.04)'
                  : 'rgba(0,0,0,0.04)',
                borderColor: colors.border,
              },
            ]}
          >
            <ClipboardList size={32} color={colors.secondary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.primary }]}>
            Belum Ada Berita Acara
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.secondary }]}>
            {search.trim()
              ? 'Tidak ada Berita Acara Pemeriksaan yang cocok dengan pencarian.'
              : 'Buat Berita Acara Pemeriksaan kargo baru dengan menekan tombol di bawah.'}
          </Text>

          <TouchableOpacity
            onPress={handleOpenCreate}
            style={[
              styles.createEmptyBtn,
              { backgroundColor: colors.tabBarActive },
            ]}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.createEmptyText}>Buat BAP Baru</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => String(item.fdId)}
          renderItem={({ item }) => (
            <InspectionListItem
              item={item}
              onPress={handleOpenDetail}
              onPressPhoto={handleOpenPhoto}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.tertiary}
            />
          }
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage()
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator
                size="small"
                color={colors.tertiary}
                style={{ paddingVertical: 14 }}
              />
            ) : null
          }
        />
      )}

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        onPress={handleOpenCreate}
        activeOpacity={0.85}
        style={[
          styles.fab,
          {
            backgroundColor: colors.tabBarActive,
            shadowColor: colors.tabBarActive,
          },
        ]}
      >
        <Plus size={22} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Detail Sheet */}
      <InspectionDetailSheet
        item={detailItem}
        visible={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setDetailItem(null)
        }}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        onOpenPhotos={handleOpenPhoto}
      />

      {/* Form Sheet (Create / Edit) */}
      <InspectionFormSheet
        visible={isFormOpen}
        editItem={formItem}
        onClose={() => {
          setIsFormOpen(false)
          setFormItem(null)
        }}
        onSubmit={handleFormSubmit}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      {/* BAP Photo Management Sheet */}
      <BapPhotoSheet
        report={photoItem}
        visible={isPhotoOpen}
        onClose={() => {
          setIsPhotoOpen(false)
          setPhotoItem(null)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchRow: {
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 11.5,
  },
  loadingContainer: {
    paddingTop: 8,
  },
  listContent: {
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  createEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  createEmptyText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
})
