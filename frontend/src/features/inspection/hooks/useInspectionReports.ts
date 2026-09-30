import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { inspectionApi } from '../services/inspection.service'
import type {
  InspectionListParams,
  CreateInspectionPayload,
  UpdateInspectionPayload,
} from '../types/inspection.types'

export const INSPECTION_QUERY_KEYS = {
  all: ['inspection-reports'] as const,
  lists: () => [...INSPECTION_QUERY_KEYS.all, 'list'] as const,
  list: (params?: InspectionListParams) => [...INSPECTION_QUERY_KEYS.lists(), params] as const,
  details: () => [...INSPECTION_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: number | string) => [...INSPECTION_QUERY_KEYS.details(), id] as const,
  photos: (id: number | string) => [...INSPECTION_QUERY_KEYS.detail(id), 'photos'] as const,
  stats: () => [...INSPECTION_QUERY_KEYS.all, 'stats'] as const,
  lookup: (search: string, listType?: number | string) =>
    [...INSPECTION_QUERY_KEYS.all, 'lookup', { search, listType }] as const,
}

export function useInspectionReports(params?: InspectionListParams) {
  return useQuery({
    queryKey: INSPECTION_QUERY_KEYS.list(params),
    queryFn: () => inspectionApi.list(params),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  })
}

export function useInspectionReportsStats() {
  return useQuery({
    queryKey: INSPECTION_QUERY_KEYS.stats(),
    queryFn: async () => {
      const res = await inspectionApi.getStats()
      return res.data
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  })
}

export function useInspectionReport(id?: number | string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: INSPECTION_QUERY_KEYS.detail(id || 0),
    queryFn: () => inspectionApi.detail(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 1000 * 15,
  })
}

export function useInspectionMarkingLookup(search: string, listType?: number | string) {
  return useQuery({
    queryKey: INSPECTION_QUERY_KEYS.lookup(search, listType),
    queryFn: () => inspectionApi.lookupMarking({ search, listType, limit: 15 }),
    enabled: search.trim().length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60,
  })
}

export function useInspectionMutations() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (payload: CreateInspectionPayload) => inspectionApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.stats() })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: UpdateInspectionPayload }) =>
      inspectionApi.update(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.stats() })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => inspectionApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.stats() })
    },
  })

  const uploadPhotoMutation = useMutation({
    mutationFn: ({
      reportId,
      photoBase64,
      caption,
    }: {
      reportId: number | string
      photoBase64: string
      caption?: string
    }) => inspectionApi.uploadPhoto(reportId, photoBase64, caption),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.detail(variables.reportId) })
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.stats() })
    },
  })

  const deletePhotoMutation = useMutation({
    mutationFn: ({
      reportId,
      photoId,
    }: {
      reportId: number | string
      photoId: number | string
    }) => inspectionApi.deletePhoto(reportId, photoId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.detail(variables.reportId) })
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.stats() })
    },
  })

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    uploadPhotoMutation,
    deletePhotoMutation,
  }
}

