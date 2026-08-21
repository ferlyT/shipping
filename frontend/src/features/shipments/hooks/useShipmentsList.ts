import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { shipmentsApi, type SearchFieldType } from '../services/shipments.service'

interface UseShipmentsListParams {
  page: number
  limit: number
  search?: string
  searchField?: SearchFieldType
  customer?: string
  marking?: string
  listType?: string | number | (string | number)[] | 'ALL'
  branch?: string | string[] | 'ALL'
  status?: number | string | (number | string)[] | 'ALL'
}

export function useShipmentsList({ page, limit, search, searchField, customer, marking, listType, branch, status }: UseShipmentsListParams) {
  // Normalize cache keys
  const statusKey = Array.isArray(status) ? status.join(',') : status
  const branchKey = Array.isArray(branch) ? branch.join(',') : branch
  const listTypeKey = Array.isArray(listType) ? listType.join(',') : listType

  return useQuery({
    queryKey: ['shipments', page, limit, search, searchField, customer, marking, listTypeKey, branchKey, statusKey],
    queryFn: async () => {
      const res = await shipmentsApi.getList({
        page,
        limit,
        ...(search && { search }),
        ...(searchField && searchField !== 'ALL' && { searchField }),
        ...(customer && { customer }),
        ...(marking && { marking }),
        ...(listType && listType !== 'ALL' && { listType }),
        ...(branch && branch !== 'ALL' && { branch }),
        ...(status !== undefined && status !== 'ALL' && { status }),
      })
      return res
    },
    placeholderData: keepPreviousData,
  })
}
