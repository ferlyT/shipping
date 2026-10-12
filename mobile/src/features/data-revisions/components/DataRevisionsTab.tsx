import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StyleSheet,
} from 'react-native'
import { Plus, FileText } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useThemeStore } from '@/theme/themeStore'
import { SearchBar } from '@/components/ui/SearchBar'
import { SkeletonShimmer } from '@/components/ui/SkeletonShimmer'
import { useDebounce } from '@/hooks/useDebounce'
import { useDataRevisionsList } from '../hooks/useDataRevisions'
import { DataRevisionCard } from './DataRevisionCard'
import { DataRevisionWizardModal } from './DataRevisionWizardModal'
import { DataRevisionDetailModal } from './DataRevisionDetailModal'
import { RevisionPhotoSheet } from './RevisionPhotoSheet'
import type { DataRevision } from '../types/dataRevisions.types'

export function DataRevisionsTab() {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')

  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [editingRevision, setEditingRevision] = useState<DataRevision | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [photoSheetItem, setPhotoSheetItem] = useState<DataRevision | null>(null)
  const [isPhotoSheetOpen, setIsPhotoSheetOpen] = useState(false)

  const handleOpenCreate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setEditingRevision(null)
    setIsWizardOpen(true)
  }

  const handleOpenEdit = (item: DataRevision) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setEditingRevision(item)
    setIsWizardOpen(true)
  }

  const handleOpenPhoto = (item: DataRevision) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setPhotoSheetItem(item)
    setIsPhotoSheetOpen(true)
  }

  const { data, isLoading, isRefetching, refetch } = useDataRevisionsList({
    search: debouncedSearch.trim() || undefined,
    status: selectedStatus,
    limit: 50,
  })

  const items = data?.data || []

  const statusFilters = [
    { id: 'ALL', label: 'Semua' },
    { id: 'PENDING', label: 'Menunggu' },
    { id: 'BILL_TERBUAT', label: 'Bill Terbit' },
    { id: 'DATA_CANCELLED', label: 'Dibatalkan' },
  ]

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchRow}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Cari form, fdListCode, customer..."
        />
      </View>

      {/* Status Filter Segment */}
      <View style={styles.filterRow}>
        {statusFilters.map((s) => {
          const active = selectedStatus === s.id
          return (
            <TouchableOpacity
              key={s.id}
              activeOpacity={0.7}
              onPress={() => {
                Haptics.selectionAsync()
                setSelectedStatus(s.id)
              }}
              style={[
                styles.filterChip,
                {
                  borderColor: active ? (isDark ? '#222C38' : '#E3E7EC') : 'transparent',
                  backgroundColor: active
                    ? isDark
                      ? '#131A23'
                      : '#FFFFFF'
                    : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  {
                    color: active ? colors.primary : colors.secondary,
                    fontWeight: active ? '600' : '400',
                  },
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* List / Loading / Empty */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <SkeletonShimmer height={90} style={{ borderRadius: 14, marginBottom: 10 }} />
          <SkeletonShimmer height={90} style={{ borderRadius: 14, marginBottom: 10 }} />
          <SkeletonShimmer height={90} style={{ borderRadius: 14, marginBottom: 10 }} />
          <SkeletonShimmer height={90} style={{ borderRadius: 14, marginBottom: 10 }} />
        </View>
      ) : items.length === 0 ? (
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
            <FileText size={32} color={colors.secondary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.primary }]}>
            Belum Ada Formulir Revisi
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.secondary }]}>
            {debouncedSearch.trim()
              ? 'Tidak ada formulir revisi kargo yang cocok dengan pencarian.'
              : 'Buat permohonan revisi data atau pembatalan kargo dengan menekan tombol di bawah.'}
          </Text>

          <TouchableOpacity
            onPress={handleOpenCreate}
            style={[
              styles.createEmptyBtn,
              { backgroundColor: colors.tabBarActive },
            ]}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.createEmptyText}>Buat Form Baru</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.fdId)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <DataRevisionCard
              item={item}
              onPress={() => setSelectedId(item.fdId)}
              onEdit={(rev) => handleOpenEdit(rev)}
              onPressPhoto={handleOpenPhoto}
            />
          )}
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

      {/* Modals */}
      <DataRevisionWizardModal
        visible={isWizardOpen}
        editItem={editingRevision}
        onClose={() => {
          setIsWizardOpen(false)
          setEditingRevision(null)
        }}
        onSuccess={() => {
          refetch()
          setEditingRevision(null)
        }}
      />

      <DataRevisionDetailModal
        revisionId={selectedId}
        visible={!!selectedId}
        onClose={() => setSelectedId(null)}
        onSuccess={refetch}
        onEdit={(rev) => handleOpenEdit(rev)}
        onOpenPhotos={(rev) => handleOpenPhoto(rev)}
      />

      {/* Photo Management Sheet (Mirip BAP) */}
      <RevisionPhotoSheet
        revision={photoSheetItem}
        visible={isPhotoSheetOpen}
        onClose={() => {
          setIsPhotoSheetOpen(false)
          setPhotoSheetItem(null)
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
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterText: {
    fontSize: 13,
  },
  loadingContainer: {
    paddingTop: 8,
  },
  listContent: {
    paddingBottom: 90,
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
    bottom: 12,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0644E',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

})
