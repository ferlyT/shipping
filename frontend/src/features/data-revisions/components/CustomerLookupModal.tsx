import { useState, useEffect } from 'react'
import { Search, User, Check, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { customersApi } from '@/features/customers/services/customers.service'
import { useDebounce } from '@/hooks/useDebounce'

interface CustomerLookupModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (customer: { custCode: string; custName: string }) => void
}

export default function CustomerLookupModal({
  isOpen,
  onClose,
  onSelect,
}: CustomerLookupModalProps) {
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    if (!isOpen) return
    let active = true

    const fetchCustomers = async () => {
      setIsLoading(true)
      try {
        const res = await customersApi.list({
          search: debouncedSearch,
          limit: 25,
        })
        if (active) {
          setCustomers(res.data?.data || res.data || [])
        }
      } catch {
        if (active) setCustomers([])
      } finally {
        if (active) setIsLoading(false)
      }
    }

    fetchCustomers()
    return () => {
      active = false
    }
  }, [debouncedSearch, isOpen])

  useEffect(() => {
    if (!isOpen) {
      setSearch('')
      setCustomers([])
    }
  }, [isOpen])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      className="max-h-[85vh] flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl"
      zIndex="z-[105]"
    >
      <Modal.Header
        icon={<User className="w-5 h-5 text-[var(--color-primary)]" />}
        title="Pilih Master Customer"
        subtitle="Pencarian cepat data pelanggan dari master database"
        onClose={onClose}
      />

      {/* Search Input Bar */}
      <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-surface-hover)] shrink-0">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-[var(--color-secondary)] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode atau nama customer..."
            className="form-input text-xs pl-9 pr-8 py-2 w-full bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] placeholder:text-[var(--color-secondary)]/70"
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <Modal.Body className="p-2 overflow-y-auto flex-1 min-h-0 divide-y divide-[var(--color-border)]/40">
        {isLoading ? (
          <div className="p-8 space-y-2 text-center text-xs text-[var(--color-secondary)]">
            <div className="h-10 w-full rounded-xl skeleton-shimmer" />
            <div className="h-10 w-full rounded-xl skeleton-shimmer" />
            <div className="h-10 w-full rounded-xl skeleton-shimmer" />
            <p className="pt-2">Memuat data pelanggan...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-10 text-center text-xs text-[var(--color-secondary)]">
            {search ? `Tidak ada customer yang cocok dengan "${search}"` : 'Tidak ada data customer.'}
          </div>
        ) : (
          customers.map((c) => {
            const code = c.fdCustCode || c.custCode || ''
            const name = c.fdCustName || c.custName || ''

            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  onSelect({ custCode: code.trim(), custName: name.trim() })
                  onClose()
                }}
                className="w-full px-3 py-2.5 rounded-lg text-left flex items-center justify-between hover:bg-[var(--color-surface-hover)] transition-colors group cursor-pointer"
              >
                <div className="min-w-0 pr-3">
                  <p className="text-xs font-semibold text-[var(--color-primary)] truncate group-hover:text-[var(--color-primary)]">
                    {name}
                  </p>
                  <p className="text-[0.7rem] text-[var(--color-secondary)] font-mono">
                    Kode: {code}
                  </p>
                </div>
                <Check
                  size={16}
                  className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                />
              </button>
            )
          })
        )}
      </Modal.Body>

      <Modal.Footer className="justify-between bg-[var(--color-surface)] border-t border-[var(--color-border)] px-4 py-2.5">
        <span className="text-xs text-[var(--color-secondary)] font-mono">
          {customers.length} pelanggan ditampilkan
        </span>
        <button
          type="button"
          onClick={onClose}
          className="btn btn-secondary text-xs py-1.5 px-3 cursor-pointer"
        >
          Tutup
        </button>
      </Modal.Footer>
    </Modal>
  )
}
