import apiClient from '@/api/client'
import type {
  DeliveryOrderDetailResponse,
  DeliveryMasterDataResponse,
  UpdateDeliveryOrderDto,
  PrintDeliveryOrderDto,
  CreateDeliveryOrderDto,
  CustomerDestination,
  CreateCustomerDestinationDto,
  OrderDeliveryItem,
  DeliveryMonitoringItem,
  DeliveryMonitoringKPIs,
  DeliveryMonitoringQueryParams,
  ConfirmDeliveryDto,
  VehicleItem,
  ExpeditionItem,
  DeliveryConfirmTrendsResponse,
  DeliveryBatchDetailResponse,
  DeliveryEstimasiDetailResponse,
} from '../types/delivery-orders.types'

export const deliveryOrdersApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    apiClient.get('/delivery-orders', { params }),

  detail: (id: string) => {
    return apiClient.get<{ success: boolean; data: DeliveryOrderDetailResponse }>(`/delivery-orders/${id}`)
  },

  getById: (id: string) => {
    return apiClient.get<{ success: boolean; data: DeliveryOrderDetailResponse }>(`/delivery-orders/${id}`)
  },

  create: (data: CreateDeliveryOrderDto) => {
    return apiClient.post<{ success: boolean; fdSJNo: string; message: string }>('/delivery-orders', data)
  },

  getMasterData: () => {
    return apiClient.get<{ success: boolean; data: DeliveryMasterDataResponse }>('/delivery-orders/master-data')
  },

  update: (id: string, data: UpdateDeliveryOrderDto) => {
    return apiClient.put(`/delivery-orders/${id}`, data)
  },

  delete: (id: string) => {
    return apiClient.delete(`/delivery-orders/${id}`)
  },

  recordPrint: (id: string, options: PrintDeliveryOrderDto) => {
    return apiClient.post(`/delivery-orders/${id}/print`, options)
  },

  getKPIs: (params?: { year?: number; month?: number; search?: string }) => {
    return apiClient.get('/delivery-orders/kpi', { params })
  },
  getGrouped: (params?: Record<string, string | number | undefined>) => {
    return apiClient.get('/delivery-orders/grouped', { params })
  },
  getMarkingGroups: (params?: Record<string, string | number | undefined>) => {
    return apiClient.get('/delivery-orders/marking-groups', { params })
  },
  getBranchGroups: (params?: Record<string, string | number | undefined>) => {
    return apiClient.get('/delivery-orders/branch-groups', { params })
  },
  getCustomerDestinations: (custCode: string) => {
    return apiClient.get<{ success: boolean; data: CustomerDestination[] }>(`/delivery-orders/customer-destinations/${encodeURIComponent(custCode)}`)
  },
  createCustomerDestination: (data: CreateCustomerDestinationDto) => {
    return apiClient.post<{ success: boolean; data: CustomerDestination }>('/delivery-orders/customer-destinations', data)
  },
  getOrderDelivery: (listCode: string) => {
    return apiClient.get<{ success: boolean; data: OrderDeliveryItem | null }>(
      `/delivery-orders/order-delivery/${encodeURIComponent(listCode)}`
    )
  },
  getMonitoring: (params?: DeliveryMonitoringQueryParams) => {
    return apiClient.get<{
      success: boolean
      data: DeliveryMonitoringItem[]
      meta: { page: number; limit: number; total: number; totalPages: number }
      kpis: DeliveryMonitoringKPIs
    }>('/delivery-orders/monitoring', { params })
  },
  confirmDelivery: (data: ConfirmDeliveryDto) => {
    return apiClient.post<{
      success: boolean
      message: string
      count: number
      updatedSjNos: string[]
    }>('/delivery-orders/confirm-delivery', data)
  },
  getVehicles: () => {
    return apiClient.get<{ success: boolean; data: VehicleItem[] }>('/delivery-orders/vehicles')
  },
  getExpeditions: () => {
    return apiClient.get<{ success: boolean; data: ExpeditionItem[] }>('/delivery-orders/expeditions')
  },
  getConfirmTrends: (days?: number) => {
    return apiClient.get<{
      success: boolean
      data: DeliveryConfirmTrendsResponse['batches']
      dailyComparison: DeliveryConfirmTrendsResponse['dailyComparison']
      summary: DeliveryConfirmTrendsResponse['summary']
      days: number
    }>('/delivery-orders/confirm-trends', {
      params: days ? { days } : undefined,
    })
  },
  getConfirmBatchDetail: (date: string, session: string) => {
    return apiClient.get<{
      success: boolean
      data: DeliveryBatchDetailResponse
    }>('/delivery-orders/confirm-batch-detail', {
      params: { date, session },
    })
  },
  getEstimasiDetails: (date: string, type?: 'all' | 'overdue' | 'pending' | 'sent') => {
    return apiClient.get<{
      success: boolean
      data: DeliveryEstimasiDetailResponse
    }>('/delivery-orders/estimasi-details', {
      params: { date, type },
    })
  },
}

