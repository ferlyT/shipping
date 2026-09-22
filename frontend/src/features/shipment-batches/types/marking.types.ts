import {
  PackageX, Book, Shirt, Settings, Cpu, Coffee,
  Pill as PillIcon, Car, Package
} from 'lucide-react'

export interface Marking {
  fdMarkingCode: string
  fdListType: number
  fdContNo: string
  fdContSize: string
  fdBLNo: string
  fdAWB: string
  fdConsignee: string
  fdWilayah: string
  fdJmlPack: number
  fdSatuan: string
  fdJmlBerat: number
  fdM3: number
  fdLoadDate: string
  fdETA: string
  fdETD: string
  fdExitDate: string
  fdGudang: string
  fdStatus: number
  fdBranded?: number
  fdKet?: string
  fdSysDate?: string
  fdCreated?: string
  fdUpdate?: string
  fdUpdateBy?: string
}

export interface MarkingGroupMeta {
  groupValue: string
  count: number
  totalPkgs: number
  totalWeight: number
}

export type MarkingGroupMode = 'none' | 'year' | 'branch' | 'load' | 'etd' | 'eta'

export function getSeaTargetDays(
  markingCode: string | undefined
): { min: number; max: number; label: string } | null {
  if (!markingCode) return null
  const upper = markingCode.toUpperCase()
  if (upper.includes('SG')) return { min: 14, max: 20, label: '14-20 Days' }
  if (upper.includes('HK')) return { min: 30, max: 30, label: '30 Days' }
  if (upper.includes('GZ')) return { min: 30, max: 30, label: '30 Days' }
  if (upper.includes('SH')) return { min: 30, max: 30, label: '30 Days' }
  if (upper.includes('YW')) return { min: 30, max: 40, label: '30-40 Days' }
  return null
}

export function getAirTargetDays(
  markingCode: string | undefined
): { min: number; max: number; label: string } | null {
  if (!markingCode) return null
  const upper = markingCode.toUpperCase()
  if (upper.includes('SG')) return { min: 5, max: 5, label: '5 Days' }
  if (upper.includes('HK')) return { min: 7, max: 7, label: '7 Days' }
  if (upper.includes('GZ')) return { min: 7, max: 10, label: '7-10 Days' }
  return null
}

export function getCommodityIcon(name: string | null | undefined): {
  Icon: typeof Package
  color: string
  bg: string
  tooltip: string
} {
  if (!name || typeof name !== 'string' || name.toUpperCase() === 'NOT SET') {
    return { Icon: PackageX, color: 'text-[var(--color-secondary)]', bg: 'bg-[var(--color-neutral)]', tooltip: 'Not set' }
  }
  const upperName = name.toUpperCase()
  if (upperName.includes('BOOK')) return { Icon: Book, color: 'text-blue-500', bg: 'bg-blue-500/10', tooltip: name }
  if (upperName.includes('CLOTH') || upperName.includes('GARMENT') || upperName.includes('FABRIC') || upperName.includes('SHIRT')) {
    return { Icon: Shirt, color: 'text-pink-500', bg: 'bg-pink-500/10', tooltip: name }
  }
  if (upperName.includes('TRANSFORMER') || upperName.includes('MACHINE') || upperName.includes('ENGINE') || upperName.includes('TURBOCHARGER') || upperName.includes('SPAREPART') || upperName.includes('LAUNCHER')) {
    return { Icon: Settings, color: 'text-orange-500', bg: 'bg-orange-500/10', tooltip: name }
  }
  if (upperName.includes('ELECTRONIC') || upperName.includes('CIRCUIT') || upperName.includes('KEYBOARD') || upperName.includes('COMPUTER') || upperName.includes('LCD') || upperName.includes('SIM CARD')) {
    return { Icon: Cpu, color: 'text-purple-500', bg: 'bg-purple-500/10', tooltip: name }
  }
  if (upperName.includes('FOOD') || upperName.includes('DRINK') || upperName.includes('COFFEE')) {
    return { Icon: Coffee, color: 'text-amber-500', bg: 'bg-amber-500/10', tooltip: name }
  }
  if (upperName.includes('MEDICAL') || upperName.includes('PILL') || upperName.includes('DRUG') || upperName.includes('PHARMACY')) {
    return { Icon: PillIcon, color: 'text-emerald-500', bg: 'bg-emerald-500/10', tooltip: name }
  }
  if (upperName.includes('VEHICLE') || upperName.includes('CAR') || upperName.includes('AUTO') || upperName.includes('MOTOR')) {
    return { Icon: Car, color: 'text-cyan-500', bg: 'bg-cyan-500/10', tooltip: name }
  }
  return { Icon: Package, color: 'text-[var(--color-primary)]', bg: 'bg-[var(--color-neutral)]', tooltip: name }
}

export interface MarkingSizeDetailItem {
  fdCustName: string
  fdListCode: string
  fdJmlBerat: number
  fdListType: number
  fdMarkingCode: string
  fdMarkingNo: string
  fdJmlPack: number
  fdM3List: number
  fdComodity: string
  fdDesc: string
  fdTotalQty: number
  fdM3: number
  fdExitDate: string | null
  fdM3PL: number
  fdJmlBeratSJ: number
  fdm3Komplain: number
  fdJmlBeratKomplain: number
  fdJmlBeratGudang: number
  fdKeterangan: string
  fdSelisihM3: number
  fdSelisihBerat: number
  hasMarkup?: boolean
}

export interface MarkingSizeSummary {
  markingCode: string
  listType: number // 1 = Udara, 2 = Laut
  contSize: string | null
  contNo: string | null
  exitDate: string | null
  loadDate: string | null
  etaDate: string | null
  totalPackPL: number
  totalPackGdg: number
  selisihPack: number
  totalM3PL: number
  totalM3Gdg: number
  totalM3Komplain: number
  totalM3Net: number
  selisihM3: number
  persenSelisihM3: number
  totalBeratList: number
  totalBeratGdg: number
  totalBeratSJ: number
  totalBeratKomplain: number
  totalBeratNet: number
  totalVFC: number
  totalRowCount: number
  totalMarkupCount?: number
}

export interface MarkingSizeAuditResponse {
  header: {
    fdMarkingCode: string
    fdListType: number
    fdContSize: string | null
    fdContNo: string | null
    fdExitDate: string | null
    fdLoadDate: string | null
    fdEtaDate: string | null
    fdM3: number
    fdJmlPack: number
  }
  summary: MarkingSizeSummary
  items: MarkingSizeDetailItem[]
}

export interface BoxDimensionItem {
  no: number
  fdListDCode?: string | null
  fdPjg: number
  fdLbr: number
  fdTng: number
  fdQty: number
  m3: number
  vfc: number
  fdDescr?: string | null
}

export interface BoxDimensionDetailResponse {
  listCode: string
  gudang: BoxDimensionItem[]
  asliGudang: BoxDimensionItem[]
  packingList: BoxDimensionItem[]
  komplain: BoxDimensionItem[]
  hasMarkup: boolean
  original?: BoxDimensionItem[]
}

