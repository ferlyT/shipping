import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mobileDataRevisionsApi } from '../services/data-revisions.service'
import type { DataRevisionsQuery } from '../types/dataRevisions.types'

export const DATA_REVISIONS_QUERY_KEY = 'data-revisions'

export function useDataRevisionsList(query?: DataRevisionsQuery) {
  return useQuery({
    queryKey: [DATA_REVISIONS_QUERY_KEY, 'list', query],
    queryFn: () => mobileDataRevisionsApi.getList(query),
  })
}

export function useDataRevisionDetail(id: number | null) {
  return useQuery({
    queryKey: [DATA_REVISIONS_QUERY_KEY, 'detail', id],
    queryFn: () => (id ? mobileDataRevisionsApi.getDetail(id) : null),
    enabled: !!id,
  })
}

export function useNextFormNumber(enabled = true) {
  return useQuery({
    queryKey: [DATA_REVISIONS_QUERY_KEY, 'next-number'],
    queryFn: () => mobileDataRevisionsApi.getNextNumber(),
    enabled,
    staleTime: 0,
  })
}

export function useCreateDataRevision() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: mobileDataRevisionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DATA_REVISIONS_QUERY_KEY] })
    },
  })
}

export function useUpdateDataRevision() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      mobileDataRevisionsApi.update(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [DATA_REVISIONS_QUERY_KEY] })
      queryClient.invalidateQueries({
        queryKey: [DATA_REVISIONS_QUERY_KEY, 'detail', variables.id],
      })
    },
  })
}

export function useDeleteDataRevision() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => mobileDataRevisionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DATA_REVISIONS_QUERY_KEY] })
    },
  })
}

export function useExecuteCancelData() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => mobileDataRevisionsApi.executeCancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DATA_REVISIONS_QUERY_KEY] })
    },
  })
}

export function useUploadDataRevisionPhoto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      revisionId,
      fileUri,
      fileName,
      keterangan,
    }: {
      revisionId: number
      fileUri: string
      fileName?: string
      keterangan?: string
    }) => {
      return mobileDataRevisionsApi.uploadLampiran(revisionId, fileUri, fileName, keterangan)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [DATA_REVISIONS_QUERY_KEY] })
      queryClient.invalidateQueries({
        queryKey: [DATA_REVISIONS_QUERY_KEY, 'detail', variables.revisionId],
      })
    },
  })
}

export function useDeleteDataRevisionPhoto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      revisionId,
      lampiranId,
    }: {
      revisionId: number
      lampiranId: number
    }) => {
      return mobileDataRevisionsApi.deleteLampiran(lampiranId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [DATA_REVISIONS_QUERY_KEY] })
      queryClient.invalidateQueries({
        queryKey: [DATA_REVISIONS_QUERY_KEY, 'detail', variables.revisionId],
      })
    },
  })
}

