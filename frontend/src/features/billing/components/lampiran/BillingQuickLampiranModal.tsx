import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import BillingLampiranSection from './BillingLampiranSection'

interface BillingQuickLampiranModalProps {
  isOpen: boolean
  onClose: () => void
  invNo: string | null
  custName?: string
}

export default function BillingQuickLampiranModal({
  isOpen,
  onClose,
  invNo,
  custName,
}: BillingQuickLampiranModalProps) {
  if (!invNo) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl">
      <Modal.Header
        title={`Lampiran Invoice: ${invNo}`}
        subtitle={custName ? `Customer: ${custName}` : 'Unggah dan tinjau berkas bukti bayar / dokumen faktur'}
      />

      <Modal.Body className="py-4">
        <BillingLampiranSection invNo={invNo} compact={true} />
      </Modal.Body>

      <Modal.Footer>
        <Button variant="outline" size="sm" onClick={onClose}>
          Tutup
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
