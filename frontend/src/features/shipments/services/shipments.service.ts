import apiClient from '@/api/client'
import type { Shipment, ShipmentDimension, ShipmentKpis } from '../types/shipments.types'

type PaginatedResponse<T> = {
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

type ShipmentQuery = {
  page?: number
  limit?: number
  search?: string
  listType?: string
  branch?: string
  status?: string | number
}

export const shipmentsApi = {
  async getList(params: ShipmentQuery = {}): Promise<PaginatedResponse<Shipment>> {
    const res = await apiClient.get('/shipments', { params })
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

  async getKpis(params: ShipmentQuery = {}): Promise<ShipmentKpis> {
    const res = await apiClient.get('/shipments/kpi', { params })
    return res.data.data
  },

  async getBranches(): Promise<string[]> {
    const res = await apiClient.get('/shipments/branches')
    return res.data.data
  }
}
