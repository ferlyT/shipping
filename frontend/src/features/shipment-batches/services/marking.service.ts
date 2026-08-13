import apiClient from '@/api/client'
import type { ExitListItem } from '../components/ExitListModal'

export const markingApi = {
  list: (params: { page: number; limit: number; search?: string; sortBy?: string; sortDir?: string; listType?: string; isClosed?: string; groupMode?: string; groupValue?: string }) => {
    return apiClient.get('/marking', { params })
  },
  getGroups: (params: { search?: string; listType?: string; isClosed?: string; groupMode?: string }) => {
    return apiClient.get('/marking/groups', { params })
  },
  detail: (id: string) => {
    return apiClient.get(`/marking/${id}`)
  },
  getManifest: (id: string) => {
    return apiClient.get(`/marking/${id}/manifest`)
  },
  getKPIs: (params: { listType?: string; search?: string }) => {
    return apiClient.get('/marking/kpi', { params })
  },
  getExitHistory: (params: { month: string; listType?: string; search?: string }) => {
    return apiClient.get('/marking/exit-history', { params })
  },
  searchManifest: (id: string, q: string) => {
    return apiClient.get(`/marking/${id}/manifest/search`, { params: { q } })
  },
}

export interface ExitHistoryDay {
  count: number;
  items: ExitListItem[];
}

export interface MarkingManifest {
  fdListCode: string;
  fdCustName: string | null;
  fdTerima: string | null;
  fdTglAgent: string | null;
  fdMarkingCode: string | null;
  fdMarkingNo: string | null;
  fdBranchCode: string | null;
  fdJmlPack: number | null;
  fdSatuan: string | null;
  fdJmlBerat: number | null;
  fdListType: number | null;
  fdDesc: string | null;
  fdComodity: string | null;
  fdM3: number | null;
  fdCancel: number | null;
  fdMarkingCodeAsal: string | null;
}
