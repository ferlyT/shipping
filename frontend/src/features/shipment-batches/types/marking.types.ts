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
    return { Icon: PackageX, color: 'text-slate-400', bg: 'bg-slate-100/80', tooltip: 'Not set' }
  }
  const upperName = name.toUpperCase()
  if (upperName.includes('BOOK')) return { Icon: Book, color: 'text-blue-600', bg: 'bg-blue-50', tooltip: name }
  if (upperName.includes('CLOTH') || upperName.includes('GARMENT') || upperName.includes('FABRIC') || upperName.includes('SHIRT')) {
    return { Icon: Shirt, color: 'text-pink-600', bg: 'bg-pink-50', tooltip: name }
  }
  if (upperName.includes('TRANSFORMER') || upperName.includes('MACHINE') || upperName.includes('ENGINE') || upperName.includes('TURBOCHARGER') || upperName.includes('SPAREPART') || upperName.includes('LAUNCHER')) {
    return { Icon: Settings, color: 'text-orange-600', bg: 'bg-orange-50', tooltip: name }
  }
  if (upperName.includes('ELECTRONIC') || upperName.includes('CIRCUIT') || upperName.includes('KEYBOARD') || upperName.includes('COMPUTER') || upperName.includes('LCD') || upperName.includes('SIM CARD')) {
    return { Icon: Cpu, color: 'text-purple-600', bg: 'bg-purple-50', tooltip: name }
  }
  if (upperName.includes('FOOD') || upperName.includes('DRINK') || upperName.includes('COFFEE')) {
    return { Icon: Coffee, color: 'text-amber-600', bg: 'bg-amber-50', tooltip: name }
  }
  if (upperName.includes('MEDICAL') || upperName.includes('PILL') || upperName.includes('DRUG') || upperName.includes('PHARMACY')) {
    return { Icon: PillIcon, color: 'text-emerald-600', bg: 'bg-emerald-50', tooltip: name }
  }
  if (upperName.includes('VEHICLE') || upperName.includes('CAR') || upperName.includes('AUTO') || upperName.includes('MOTOR')) {
    return { Icon: Car, color: 'text-cyan-600', bg: 'bg-cyan-50', tooltip: name }
  }
  return { Icon: Package, color: 'text-slate-700', bg: 'bg-slate-100', tooltip: name }
}
