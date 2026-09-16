import { formatCurrency, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'

export interface TransportAuditTabContentProps {
  unbilledExpedisiList: any[]
  mustBillExpedisiList: any[]
  totalUnbilledAmount: number
  hasUnbilledTransport: boolean
  effectiveTransportAmount: number
}

export function TransportAuditTabContent({
  unbilledExpedisiList,
  mustBillExpedisiList,
  totalUnbilledAmount,
  hasUnbilledTransport,
  effectiveTransportAmount,
}: TransportAuditTabContentProps) {
  const allExpedisi = [...mustBillExpedisiList, ...unbilledExpedisiList]

  return (
    <div className="space-y-3">
      {hasUnbilledTransport && (
        <div className="p-2.5 sm:p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs">
          <strong>Perhatian:</strong> Ditemukan biaya ekspedisi lokal operasional senilai{' '}
          <strong>{formatCurrency(totalUnbilledAmount)}</strong> yang berstatus Harus Tagih, namun belum tercatat
          pada invoice ini.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
        <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/20">
          <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
            Transport Ditagihkan
          </span>
          <div className="text-[16px] sm:text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
            {formatCurrency(effectiveTransportAmount)}
          </div>
          <span className="text-[10.5px] text-[var(--color-secondary)]">Nilai pada invoice</span>
        </div>

        <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/20">
          <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
            Biaya Ekspedisi Belum Ditagih
          </span>
          <div className="text-[16px] sm:text-[17px] font-bold tabular-nums mt-0.5">
            {totalUnbilledAmount > 0 ? (
              <span className="text-rose-500">{formatCurrency(totalUnbilledAmount)}</span>
            ) : (
              <span className="text-emerald-500">Rp 0 (Lengkap)</span>
            )}
          </div>
          <span className="text-[10.5px] text-[var(--color-secondary)]">tbExpIndo operasional</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[var(--color-neutral)]/40 border-b border-[var(--color-border)]">
            <tr>
              <th className="px-2.5 py-1.5 text-[10.5px] font-semibold uppercase text-[var(--color-secondary)]">
                Nama Ekspedisi
              </th>
              <th className="px-2.5 py-1.5 text-[10.5px] font-semibold uppercase text-[var(--color-secondary)]">
                No. Resi
              </th>
              <th className="px-2.5 py-1.5 text-[10.5px] font-semibold uppercase text-[var(--color-secondary)] whitespace-nowrap">
                Tanggal
              </th>
              <th className="px-2.5 py-1.5 text-right text-[10.5px] font-semibold uppercase text-[var(--color-secondary)] whitespace-nowrap">
                Total Biaya
              </th>
              <th className="px-2.5 py-1.5 text-center text-[10.5px] font-semibold uppercase text-[var(--color-secondary)] whitespace-nowrap">
                Status Tagihan
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {allExpedisi.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-[var(--color-secondary)]">
                  Tidak ada catatan ekspedisi lokal untuk resi/marking ini.
                </td>
              </tr>
            ) : (
              allExpedisi.map((exp, idx) => (
                <tr key={idx} className="hover:bg-[var(--color-neutral)]/20 transition-colors">
                  <td className="px-2.5 py-1.5 font-medium text-[var(--color-primary)]">{exp.fdExpName || '—'}</td>
                  <td className="px-2.5 py-1.5 tabular-nums text-[var(--color-secondary)] whitespace-nowrap">{exp.fdResiExp || '—'}</td>
                  <td className="px-2.5 py-1.5 tabular-nums text-[var(--color-secondary)] whitespace-nowrap">
                    {exp.fdCreatedDate ? formatDate(exp.fdCreatedDate) : '—'}
                  </td>
                  <td className="px-2.5 py-1.5 text-right tabular-nums font-semibold text-[var(--color-primary)] whitespace-nowrap">
                    {formatCurrency(exp.fdTotalExp)}
                  </td>
                  <td className="px-2.5 py-1.5 text-center whitespace-nowrap">
                    <StatusBadge
                      status={unbilledExpedisiList.some((u) => u.fdId === exp.fdId) ? 'PENDING' : 'MATCH'}
                      size="sm"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
