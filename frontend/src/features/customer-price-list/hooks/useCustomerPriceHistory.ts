import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { customerPriceListApi } from '../services/customerPriceList.service'
import { customersApi } from '@/features/customers/services/customers.service'
import type { CustomerUploadHistory } from '../types'

interface UploadGroup {
  effectiveDate: string
  items: CustomerUploadHistory[]
}

export function useCustomerPriceHistory() {
  const { t } = useTranslation()
  const { custCode } = useParams<{ custCode: string }>()
  const [custName, setCustName] = useState<string>('')
  const [rows, setRows] = useState<CustomerUploadHistory[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const pageSize = 20
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const loadHistory = () => {
    if (!custCode) return

    // Fetch customer info
    customersApi
      .detail(custCode)
      .then((res: any) => setCustName(res.data?.data?.fdCustName || res.data?.fdCustName || ''))
      .catch(() => setCustName('Unknown Customer'))

    // Fetch history
    setLoading(true)
    customerPriceListApi
      .listUploads(custCode, { page, pageSize })
      .then((res) => {
        const raw = res.data as any
        const data = raw?.data ?? raw
        const meta = raw?.meta ?? {}
        if (Array.isArray(data)) {
          setRows(data)
          setTotal(meta.total ?? data.length)
        } else if (data?.rows) {
          setRows(data.rows)
          setTotal(data.total ?? data.rows.length)
        }
      })
      .catch((err: any) => {
        setError(err?.response?.data?.message || err?.message || 'Gagal memuat riwayat upload')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadHistory()
  }, [custCode, page])

  // Group by effectiveDate so superseded versions stay pinned beneath active version
  const groups: UploadGroup[] = useMemo(() => {
    const map = new Map<string, CustomerUploadHistory[]>()
    for (const row of rows) {
      const key = row.effectiveDate
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(row)
    }

    const result = Array.from(map.entries()).map(([effectiveDate, items]) => ({
      effectiveDate,
      items: [...items].sort((a, b) => {
        if (a.isSuperseded !== b.isSuperseded) return a.isSuperseded ? 1 : -1
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      }),
    }))

    result.sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())
    return result
  }, [rows])

  return {
    t,
    custCode,
    custName,
    rows,
    page,
    setPage,
    total,
    totalPages,
    loading,
    error,
    groups,
    reload: loadHistory,
  }
}
