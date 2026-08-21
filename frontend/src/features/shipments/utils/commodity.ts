import {
  Package, PackageX, Shirt, Coffee,
  Pill as PillIcon, Bike, Footprints, Smartphone, Camera,
  Laptop, ShieldCheck, Box, Tag, FlaskConical,
  AlertTriangle, AlertOctagon, AlertCircle,
  type LucideIcon,
} from 'lucide-react'

export interface CommodityIconInfo {
  Icon: LucideIcon
  color: string
  bg: string
  tooltip: string
}

/**
 * Mapping icon khusus berdasarkan nilai fdComodityName dari tabel tbTypeComodity
 */
export function getCommodityIcon(fdComodityName: string | null | undefined): CommodityIconInfo {
  if (!fdComodityName || typeof fdComodityName !== 'string' || fdComodityName.trim() === '' || fdComodityName.toUpperCase() === 'NOT SET') {
    return { Icon: PackageX, color: 'text-slate-400', bg: 'bg-slate-100/80', tooltip: 'Not Set' }
  }

  const name = fdComodityName.trim().toUpperCase()

  // 1. Pakaian / Tekstil (GARMENT, SEMI GARMENT, TEKSTIL)
  if (name.includes('GARMENT') || name.includes('TEKSTIL')) {
    return { Icon: Shirt, color: 'text-pink-600', bg: 'bg-pink-50', tooltip: fdComodityName }
  }

  // 2. Sepatu (SHOES)
  if (name === 'SHOES') {
    return { Icon: Footprints, color: 'text-violet-600', bg: 'bg-violet-50', tooltip: fdComodityName }
  }

  // 3. Laptop / Komputer / Tablet (LAPTOP/TABLET, MACBOOK & OTHER LAPTOP, IPAD & OTHER TABLET)
  if (name.includes('LAPTOP') || name.includes('MACBOOK') || name.includes('IPAD') || name.includes('TABLET')) {
    return { Icon: Laptop, color: 'text-indigo-600', bg: 'bg-indigo-50', tooltip: fdComodityName }
  }

  // 4. Smartphone / Handphone (HANDPHONE)
  if (name.includes('HANDPHONE') || name.includes('PHONE')) {
    return { Icon: Smartphone, color: 'text-blue-600', bg: 'bg-blue-50', tooltip: fdComodityName }
  }

  // 5. Kamera (CAMERA)
  if (name.includes('CAMERA')) {
    return { Icon: Camera, color: 'text-teal-600', bg: 'bg-teal-50', tooltip: fdComodityName }
  }

  // 6. Makanan & Minuman (FOOD)
  if (name.includes('FOOD')) {
    return { Icon: Coffee, color: 'text-amber-600', bg: 'bg-amber-50', tooltip: fdComodityName }
  }

  // 7. Medis, Alkes & Masker (MEDICAL, ALKES, MASKER)
  if (name.includes('MEDICAL') || name.includes('ALKES') || name.includes('MASKER')) {
    return { Icon: PillIcon, color: 'text-emerald-600', bg: 'bg-emerald-50', tooltip: fdComodityName }
  }

  // 8. Sepeda (SEPEDA MAHAL)
  if (name.includes('SEPEDA')) {
    return { Icon: Bike, color: 'text-cyan-600', bg: 'bg-cyan-50', tooltip: fdComodityName }
  }

  // 9. Pestisida / Kimia (PESTISIDA)
  if (name.includes('PESTISIDA')) {
    return { Icon: FlaskConical, color: 'text-lime-600', bg: 'bg-lime-50', tooltip: fdComodityName }
  }

  // 10. Legal (LEGAL)
  if (name.includes('LEGAL')) {
    return { Icon: ShieldCheck, color: 'text-sky-600', bg: 'bg-sky-50', tooltip: fdComodityName }
  }

  // 11. Branded (BRANDED)
  if (name.includes('BRANDED')) {
    return { Icon: Tag, color: 'text-rose-600', bg: 'bg-rose-50', tooltip: fdComodityName }
  }

  // 12. FCL (FCL)
  if (name === 'FCL') {
    return { Icon: Box, color: 'text-slate-800', bg: 'bg-slate-200/80', tooltip: fdComodityName }
  }

  // 13. LARTAS - N (Lartas N - Amber Triangle Warning)
  if (name.includes('LARTAS - N') || name.includes('LARTAS-N') || name === 'LARTAS N') {
    return { Icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', tooltip: fdComodityName }
  }

  // 14. LARTAS - S (Lartas S - Red Octagon Alert)
  if (name.includes('LARTAS - S') || name.includes('LARTAS-S') || name === 'LARTAS S') {
    return { Icon: AlertOctagon, color: 'text-red-600', bg: 'bg-red-50', tooltip: fdComodityName }
  }

  // 15. LARTAS umum lainnya
  if (name.includes('LARTAS')) {
    return { Icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', tooltip: fdComodityName }
  }

  // 16. Default Umum (UMUM, GENERAL, atau lainnya)
  return { Icon: Package, color: 'text-slate-700', bg: 'bg-slate-100', tooltip: fdComodityName }
}
