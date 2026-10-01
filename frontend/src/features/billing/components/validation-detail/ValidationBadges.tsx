import { Check, TrendingUp } from 'lucide-react'
import { formatDateTime, formatCurrency } from '@/lib/utils'
import { formatWithCurrency } from '@/components/ui/CurrencyValue'
import { evaluateItemPrice } from '../../utils/billing.utils'
import type { BillingDetail, M3CheckResponse } from '../../types/billing.types'

export function IssuedBadge({
  isIssued,
  issuedDate,
  issuedBy,
}: {
  isIssued: boolean
  issuedDate?: string | null
  issuedBy?: string | null
}) {
  const title = isIssued && issuedDate ? `Diterbitkan: ${formatDateTime(issuedDate)}${issuedBy ? ` oleh ${issuedBy.trim()}` : ''}` : undefined
  return isIssued ? (
    <span
      title={title}
      className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
    >
      <Check size={10} className="stroke-[3]" /> ISSUED
    </span>
  ) : (
    <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
      DRAFT
    </span>
  )
}

export function PaymentBadge({ status }: { status?: string | null }) {
  if (status === 'LUNAS')
    return (
      <span className="inline-flex items-center text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
        LUNAS
      </span>
    )
  if (status === 'SEBAGIAN')
    return (
      <span className="inline-flex items-center text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
        SEBAGIAN
      </span>
    )
  return (
    <span className="inline-flex items-center text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30">
      BELUM LUNAS
    </span>
  )
}

export function ItemPriceBadge({
  row,
  validationData,
  expedisiList,
  evaluation,
}: {
  row: BillingDetail
  validationData?: M3CheckResponse | null
  expedisiList?: any[]
  evaluation?: any
}) {
  if (!validationData && (!expedisiList || expedisiList.length === 0) && !evaluation) return null
  const evalRes = evaluation || evaluateItemPrice(row, {
    res: validationData,
    isAir: validationData?.fdListType === 1 || validationData?.expectedMode === 'BY AIR',
    defaultTypeId: (validationData?.defaultFdTypeComodity && validationData.defaultFdTypeComodity > 0)
      ? validationData.defaultFdTypeComodity
      : (validationData?.markingComodityType ?? null),
    defaultComodityName: validationData?.markingComodities?.[0]?.fdComodityName || '—',
    expedisiList,
  })

  // Item biaya cabang tanpa validasi tarif
  if (evalRes.isNonValidatedBranchDashFee) {
    return (
      <span
        className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)] whitespace-nowrap"
        title="Item biaya invoice cabang -- (tidak divalidasi ke database tarif)"
      >
        Non-Validasi
      </span>
    )
  }

  // Penanganan khusus item Transport terhadap tbExpIndo
  if (evalRes.isTransportItem) {
    const exp = evalRes.transportExpedisi
    if (!evalRes.hasTargetPrice) {
      return (
        <span
          className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap"
          title="Belum ada data biaya ekspedisi lokal tercatat di tbExpIndo"
        >
          Belum Ada tbExpIndo
        </span>
      )
    }

    const paidStatus = exp?.fdPaid === 1 ? 'Harus Tagih' : exp?.fdPaid === 2 ? 'COD' : ''
    const expTooltip = exp
      ? `Acuan tbExpIndo${paidStatus ? ` [${paidStatus}]` : ''}: ${exp.fdExpName || 'Ekspedisi'}${exp.fdResiExp ? ` (Resi: ${exp.fdResiExp})` : ''} — ${formatWithCurrency(exp.fdTotalExp, 'Rp.')}`
      : 'Acuan tbExpIndo'

    if (evalRes.statusType === 'LOWER') {
      return (
        <span
          className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 whitespace-nowrap flex items-center gap-1"
          title={expTooltip}
        >
          <span>Undercharge</span>
          {exp?.fdExpName && <span className="opacity-75 font-normal">({exp.fdExpName.trim()})</span>}
        </span>
      )
    }

    if (evalRes.statusType === 'HIGHER') {
      return (
        <span
          className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap flex items-center gap-1"
          title={expTooltip}
        >
          <span>Overcharge</span>
          {exp?.fdExpName && <span className="opacity-75 font-normal">({exp.fdExpName.trim()})</span>}
        </span>
      )
    }

    return (
      <span
        className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap flex items-center gap-1"
        title={expTooltip}
      >
        <span>✓ Match tbExpIndo</span>
        {exp?.fdExpName && <span className="opacity-75 font-normal">({exp.fdExpName.trim()})</span>}
      </span>
    )
  }

  // 1. Status Badge (Hybrid Ganda): Sesuai Profil + Overcharge vs Master
  if (evalRes.isProfileMatchOverMaster) {
    const diffVal = evalRes.masterPriceDiff || evalRes.difference || 0
    return (
      <div className="flex items-center gap-1 flex-wrap">
        <span
          className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap"
          title={`Harga invoice (${formatWithCurrency(row.fdItemPrice, row.fdCurr)}) cocok dengan Profil CS (${formatCurrency(evalRes.profilePrice)})`}
        >
          <Check size={9} className="stroke-[2.5]" />
          <span>Sesuai Profil</span>
        </span>
        <span
          className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 whitespace-nowrap"
          title={`Harga di atas Master Price List ${evalRes.priceListDisplay} (Selisih +${formatCurrency(diffVal)}) — Diizinkan`}
        >
          <TrendingUp size={9} />
          <span>Overcharge (+{formatCurrency(diffVal)})</span>
        </span>
      </div>
    )
  }

  // 2. Status Badge (Hybrid Ganda): Sesuai Profil + Diskon Profil vs Master
  if (evalRes.isProfileMatchUnderMaster) {
    const diffVal = Math.abs(evalRes.masterPriceDiff || evalRes.difference || 0)
    return (
      <div className="flex items-center gap-1 flex-wrap">
        <span
          className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap"
          title={`Harga invoice (${formatWithCurrency(row.fdItemPrice, row.fdCurr)}) cocok dengan Profil CS (${formatCurrency(evalRes.profilePrice)})`}
        >
          <Check size={9} className="stroke-[2.5]" />
          <span>Sesuai Profil</span>
        </span>
        <span
          className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap"
          title={`Harga di bawah Master Price List ${evalRes.priceListDisplay} (Diskon khusus profil: -${formatCurrency(diffVal)})`}
        >
          <span>Diskon Profil (-{formatCurrency(diffVal)})</span>
        </span>
      </div>
    )
  }

  if (!evalRes.hasTargetPrice && !evalRes.isTaxReturnItem && !evalRes.isKgOverweightItem) return null

  if (evalRes.statusType === 'LOWER')
    return (
      <span
        className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 whitespace-nowrap"
        title={`Harga di bawah tarif acuan master (${evalRes.priceListDisplay || 'Master Price List'})`}
      >
        Undercharge
      </span>
    )

  if (evalRes.statusType === 'HIGHER')
    return (
      <span
        className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 whitespace-nowrap"
        title={`Harga di atas tarif acuan master (${evalRes.priceListDisplay || 'Master Price List'})`}
      >
        <TrendingUp size={9} />
        <span>Overcharge</span>
      </span>
    )

  return (
    <span
      className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap"
      title="Harga sesuai acuan master"
    >
      <Check size={9} className="stroke-[2.5]" />
      <span>Match</span>
    </span>
  )
}
