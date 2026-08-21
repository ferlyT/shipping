import apiClient from '@/api/client'
import type {
  Shipment, ShipmentDimension, ShipmentKpis,
  ShipmentDimensionGudang, ShipmentDimensionPackingList, ShipmentDimensionKomplain,
} from '../types/shipments.types'

type PaginatedResponse<T> = {
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type SearchFieldType = 'ALL' | 'customer' | 'resi' | 'marking' | 'tracking' | 'listCode' | 'customer_marking'

export type ShipmentQuery = {
  page?: number
  limit?: number
  search?: string
  searchField?: SearchFieldType
  customer?: string
  marking?: string
  listType?: string | number | (string | number)[]
  branch?: string | string[]
  status?: string | number | (string | number)[]
}

function serializeQueryParams(params: ShipmentQuery) {
  const query: Record<string, string | number> = {}

  if (params.page) query.page = params.page
  if (params.limit) query.limit = params.limit
  if (params.search?.trim()) query.search = params.search.trim()
  if (params.searchField && params.searchField !== 'ALL') query.searchField = params.searchField
  if (params.customer?.trim()) query.customer = params.customer.trim()
  if (params.marking?.trim()) query.marking = params.marking.trim()

  if (params.listType !== undefined && params.listType !== 'ALL') {
    if (Array.isArray(params.listType)) {
      if (params.listType.length > 0) query.listType = params.listType.join(',')
    } else if (params.listType) {
      query.listType = params.listType
    }
  }

  if (params.branch !== undefined && params.branch !== 'ALL') {
    if (Array.isArray(params.branch)) {
      if (params.branch.length > 0) query.branch = params.branch.join(',')
    } else if (params.branch) {
      query.branch = params.branch
    }
  }

  if (params.status !== undefined && params.status !== 'ALL') {
    if (Array.isArray(params.status)) {
      if (params.status.length > 0) query.status = params.status.join(',')
    } else {
      query.status = params.status
    }
  }

  return query
}

export const shipmentsApi = {
  async getList(params: ShipmentQuery = {}): Promise<PaginatedResponse<Shipment>> {
    const res = await apiClient.get('/shipments', { params: serializeQueryParams(params) })
    return res.data
  },

  async getById(id: string): Promise<Shipment> {
    const res = await apiClient.get(`/shipments/${id}`)
    return res.data.data
  },

  async getDimensions(id: string): Promise<ShipmentDimension[]> {
    const res = await apiClient.get(`/shipments/${id}/dimensions`)
    return res.data.data
  },

  async getDimensionsGudang(id: string): Promise<ShipmentDimensionGudang[]> {
    const res = await apiClient.get(`/shipments/${id}/dimensions/gudang`)
    return res.data.data
  },

  async getDimensionsPackingList(id: string): Promise<ShipmentDimensionPackingList[]> {
    const res = await apiClient.get(`/shipments/${id}/dimensions/packinglist`)
    return res.data.data
  },

  async getDimensionsKomplain(id: string): Promise<ShipmentDimensionKomplain[]> {
    const res = await apiClient.get(`/shipments/${id}/dimensions/komplain`)
    return res.data.data
  },

  async getKpis(params: ShipmentQuery = {}): Promise<ShipmentKpis> {
    const res = await apiClient.get('/shipments/kpi', { params: serializeQueryParams(params) })
    return res.data.data
  },

  async getBranches(): Promise<string[]> {
    const res = await apiClient.get('/shipments/branches')
    return res.data.data
  }
}
