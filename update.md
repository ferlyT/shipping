# Prompt: Selaraskan Tampilan `ShipmentBatchesPage` dengan `CustomersPage`

## Konteks
Di codebase ini ada dua halaman:
- `src/pages/ShipmentsListPage.tsx` — **referensi gaya visual** (source of truth untuk styling).
- `src/pages/CustomersPage.tsx` — halaman yang perlu direstyle agar tampilannya senada dengan `ShipmentsListPage`, **tanpa mengubah logika bisnis** (query React Query, kalkulasi KPI/timeline, grouping, modal manifest, dll — semua state & fungsi tetap sama).

Sesuaikan path import sesuai struktur project yang sebenarnya.

## Aturan Umum
- **Jangan hapus/ubah fungsi, state, query, atau kalkulasi apa pun.** Ini murni perubahan `className` dan sedikit restrukturisasi markup untuk kebutuhan visual (mis. bottom-sheet modal).
- Gunakan design token yang sudah ada di project: `var(--color-primary)`, `var(--color-secondary)`, `var(--color-tertiary)`, `var(--color-surface)`, `var(--color-on-primary)`, `var(--radius-md)`, `var(--radius-lg)`, `font-[var(--font-display)]`, `font-[var(--font-label)]`, dst.
- Warna border/hover flat yang dipakai `ShipmentsListPage` dan harus disamakan:
  - Border card/filter: `border-[#E4E1DA]`
  - Border tipis antar-item (dalam card): `border-[#EFEDE7]`
  - Hover row tabel: `hover:bg-[#EFF6FF]`
  - Background header grup/sticky: `bg-[#F7F5F2]`
  - Background halaman: `bg-[#F8FAFC]`
- **Jangan pakai warna hardcode custom** seperti `#BC4736` — ganti semua ke `var(--color-tertiary)` supaya konsisten dengan tema aplikasi.

## Daftar Perubahan (per bagian)

### 1. Header halaman
Samakan ukuran judul & spacing wrapper dengan `ShipmentsListPage`:
```tsx
<div className="flex flex-col gap-4 lg:gap-8 bg-[#F8FAFC] p-3 sm:p-4 lg:p-8 min-h-full">
  <div className="flex flex-shrink-0 flex-col">
    <h1 className="font-[var(--font-display)] font-medium text-[26px] sm:text-[32px] lg:text-[40px] m-0 mb-1 tracking-[-0.02em] text-[var(--color-primary)]">
      Shipment Batches
    </h1>
    <p className="text-[13.5px] sm:text-[15.2px] text-[var(--color-secondary)] m-0 mb-4 sm:mb-8">
      Manage your marking and shipment batches.
    </p>
  </div>
```
(Sebelumnya: `gap-6 lg:gap-8 p-4 lg:p-8`, `text-[40px]`, `mb-8` — tidak responsif di mobile.)

### 2. Filter Card (tab Semua/Udara/Laut + search + Group by)
- Padding card: `p-4 sm:p-6` (bukan `p-6` statis).
- Semua tombol tab (`Semua`, `Udara`, `Laut`) pakai pola pill yang sama:
  ```tsx
  className={cn(
    "px-[14px] sm:px-[18px] py-[9px] sm:py-[10px] rounded-[var(--radius-md)] border text-[13px] sm:text-[13.6px] font-medium cursor-pointer flex items-center gap-2 transition-colors shrink-0",
    active
      ? "bg-[var(--color-tertiary)] border-[var(--color-tertiary)] text-[var(--color-on-primary)]"
      : "bg-[var(--color-surface)] border-[#E4E1DA] text-[var(--color-primary)] hover:border-[var(--color-tertiary)]"
  )}
  ```
  **Hapus** warna hardcode `#BC4736` pada tombol "Semua" — ganti jadi sama seperti tombol lain (pakai `var(--color-tertiary)`).
- **Ganti komponen `SearchBar`** dengan input search inline bergaya sama seperti di `ShipmentsListPage` (ikon `Search` di kiri, tombol clear `X` di kanan saat ada teks):
  ```tsx
  <div className="relative flex-1 sm:max-w-[280px]">
    <Search size={17} className="absolute left-3 sm:left-[14px] top-1/2 -translate-y-1/2 text-[var(--color-secondary)]" />
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Cari marking code, BL/AWB..."
      className="w-full pl-9 sm:pl-[42px] pr-[14px] py-2.5 sm:py-[10px] rounded-[var(--radius-md)] border border-[#E4E1DA] text-[14px] text-[var(--color-primary)] font-[var(--font-body)] outline-none focus:border-[var(--color-secondary)] transition-colors bg-transparent"
    />
    {search && (
      <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
        <X size={14} />
      </button>
    )}
  </div>
  ```
  Setelah ini, import `SearchBar` yang sudah tidak dipakai **harus dihapus**.
- Tombol "Cari Manifest" ikut disamakan bordernya jadi `border-[#E4E1DA]` dengan hover ke warna tertiary (bukan `bg-[var(--color-neutral)]` solid).
- Baris "Group by": label pakai gaya `SectionLabel` (`font-[var(--font-label)] text-[11px] tracking-[0.08em] uppercase text-[var(--color-secondary)] w-[70px]`), dan setiap chip pilihan (`None/Tahun/Cabang/Loading/ETD/ETA`) diubah jadi bentuk **pill bulat penuh** (`rounded-[16px]`), bukan `rounded-[var(--radius-md)]` kotak:
  ```tsx
  className={cn(
    "px-[14px] py-2 rounded-[16px] border text-[13px] transition-colors duration-150 shrink-0",
    active
      ? "bg-[var(--color-tertiary)] border-[var(--color-tertiary)] text-[var(--color-on-primary)]"
      : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] hover:border-[var(--color-tertiary)]"
  )}
  ```

### 3. Badge status (buat komponen baru, reuse di tabel & card)
Tambahkan dua helper component baru (mirip `StatusBadge` di `ShipmentsListPage`, pakai dot kecil + pill berwarna):
```tsx
function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap mt-1',
      active ? 'bg-[#EBFBEE] text-[#2B8A3E]' : 'bg-[#F1F3F5] text-[#495057]'
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', active ? 'bg-[#2B8A3E]' : 'bg-[#495057]')}></span>
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function ExitBadge({ exitDate }: { exitDate: string | null | undefined }) {
  if (exitDate) {
    return <span className="text-[var(--color-secondary)] font-medium">{formatDate(exitDate)}</span>
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3BF] px-2.5 py-0.5 text-[10px] font-semibold text-[#E67700] whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-[#E67700]"></span>
      Belum keluar
    </span>
  )
}
```
Ganti semua badge "Active/Inactive" (di `BatchRow` & `BatchCard`) pakai `<ActiveBadge active={row.fdStatus === 1} />`, dan semua badge tanggal exit pakai `<ExitBadge exitDate={row.fdExitDate} />`.

### 4. Tabel desktop (`BatchRow` + `<thead>` di `GroupSection`)
- Row: `className="bg-white hover:bg-[#EFF6FF] transition-colors duration-200 border-b border-[#E4E1DA] last:border-0"` (sebelumnya `hover:bg-[var(--color-neutral)]/50`, border pakai token lama).
- `<thead>` row: `className="text-left font-[var(--font-label)] text-[11px] tracking-[0.08em] uppercase text-[var(--color-secondary)] border-b border-[#E4E1DA] bg-slate-50/50"` (sebelumnya `text-[10px] font-bold uppercase tracking-wider` tanpa background).
- `<table>` bg diganti `bg-white` (bukan `bg-[var(--color-surface)]`).
- Kolom aksi: tombol "Manifest" tetap sebagai button berlabel, tapi tombol "View" diganti jadi **icon-only button** seperti di `ShipmentsListPage`:
  ```tsx
  <button onClick={() => onView(row)} className="inline-flex items-center justify-center p-2 text-[var(--color-secondary)] hover:bg-[#F7F5F2] rounded-lg transition-all duration-200">
    <Eye className="w-[18px] h-[18px]" />
  </button>
  ```

### 5. Card mobile/grid (`BatchCard`)
Desain ulang total meniru pola card grid di `ShipmentsListPage`:
- Container: `bg-white border border-[#E4E1DA] rounded-[8px] overflow-hidden hover:shadow-md transition-all flex flex-col`.
- **Header section**: background `bg-[var(--color-neutral)]`, label kecil huruf besar font `Space_Grotesk` (`text-[0.6rem] tracking-[0.08em] uppercase text-[var(--color-secondary)]`), nilai utama pakai font `Fraunces` (`font-['Fraunces'] font-semibold text-[1rem]`), badge status di kanan.
- **Body**: setiap baris info (Consignee, AWB/BL, Container, Pkg/Wgt, Load/ETD/ETA/Exit) dipisah `border-b border-[#EFEDE7]`, label kiri kecil huruf besar, value kanan bold.
- **Footer**: dua tombol pill rounded-full (`rounded-[24px]`) — "Manifest" (border abu `#E4E1DA`) dan "View" (border `var(--color-tertiary)`, hover `bg-[#F3E4E0]`).
- Wrapper grid mobile di `GroupSection`: `className="sm:hidden grid grid-cols-1 gap-3 p-3 bg-slate-50/50"`.

### 6. Header grup (accordion) di `GroupSection`
```tsx
<div className="border-b border-[#E4E1DA] last:border-0">
  <button
    onClick={() => setOpen((v) => !v)}
    className="flex w-full items-center justify-between gap-3 bg-[#F7F5F2]/95 px-4 sm:px-6 py-2.5 text-left transition-colors hover:bg-[#F7F5F2] border-y border-[#E4E1DA]"
  >
    ...
    <span className="font-[var(--font-label)] text-[11px] tracking-[0.08em] uppercase text-[var(--color-secondary)]">{displayTitle}</span>
    ...
```
(Meniru sticky group header di compact list `ShipmentsListPage`. Hapus badge count berbentuk pill solid, ganti jadi teks kecil bold biasa.)

### 7. Container `StatusBlock` (open/closed)
Ganti border & background jadi:
```tsx
<div className="overflow-hidden rounded-[var(--radius-lg)] border border-[#E4E1DA] bg-white shadow-sm">
  <button ... className={`flex w-full items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 text-left ${meta.bg} transition-colors hover:opacity-90`}>
```

### 8. Footer pagination (di dalam `GroupSection`)
```tsx
<div className="border-t border-[#E4E1DA] px-3 sm:px-6 py-3 sm:py-4 flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4 bg-white">
  <Pagination ... />
  <div className="flex items-center gap-1.5 text-[12.5px] text-[var(--color-secondary)] shrink-0">
    <span>Rows:</span>
    <select ... className="text-[12.5px] text-[var(--color-primary)] border border-[#E4E1DA] rounded-[var(--radius-sm)] px-2 py-1 outline-none bg-white cursor-pointer font-[var(--font-body)]">
      ...
```

### 9. Modal Detail Batch → ubah jadi Bottom Sheet (mobile-first)
Struktur modal saat ini adalah dialog `flex items-center justify-center` di tengah layar. Ubah total jadi pola bottom-sheet seperti panel detail di `ShipmentsListPage`:
```tsx
{selectedRow && typeof document !== 'undefined' && createPortal(
  <>
    {/* Backdrop */}
    <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={() => setSelectedRow(null)} />

    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 pointer-events-none">
      <div
        className="w-full sm:max-w-2xl bg-white shadow-2xl rounded-t-[28px] sm:rounded-2xl flex flex-col overflow-hidden pointer-events-auto h-[94vh] sm:h-auto sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header, Tabs, Content (bg-slate-50/50, padding p-4 sm:p-6) sama seperti sebelumnya
            tapi border pakai border-slate-100, bg header/tab pakai bg-white sticky */}

        {/* Footer */}
        <div className="shrink-0 flex items-center gap-2.5 px-5 sm:px-8 py-3.5 sm:py-4 border-t border-slate-100 bg-white pb-[calc(env(safe-area-inset-bottom)+14px)] sm:pb-4">
          <button
            type="button"
            onClick={() => setSelectedRow(null)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-[var(--color-primary)] text-white text-[13.5px] font-semibold active:opacity-80 transition-opacity"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  </>,
  document.body
)}
```
Poin penting:
- Backdrop dan panel jadi **dua elemen terpisah** (bukan satu div backdrop yang membungkus panel), dibungkus fragment `<>...</>`.
- Panel muncul dari **bawah layar di mobile** (`items-end`, `rounded-t-[28px]`), jadi **dialog tengah di desktop** (`sm:items-center`, `sm:rounded-2xl`).
- Tombol close (X) tetap di header, tapi tombol "Close" lama di footer diganti tombol pill penuh "Tutup" (`rounded-full bg-[var(--color-primary)]`).
- Konten tab (Info Detail & Timeline/Performance) — **tidak perlu diubah isinya**, cukup sesuaikan padding jadi `p-4 sm:p-6` dan border card di dalamnya boleh tetap pakai `var(--color-border)` (token ini sudah konsisten dengan tema).

### 10. Import yang perlu disesuaikan
- **Hapus**: `import { SearchBar } from '@/components/ui/SearchBar'` (sudah tidak dipakai).
- **Pastikan** `Search` sudah ada di import dari `lucide-react` (biasanya sudah ada untuk kebutuhan lain, tinggal dipakai).

## Yang TIDAK boleh berubah
- Semua `useQuery` (list marking groups, KPI, detail, manifest) — key, endpoint, params.
- Logika grouping (`groupByStatus` setara `GroupMode`, `StatusBlock`, `GroupSection`).
- Modal "Cari Manifest" (code input), `EtaSummaryModal`, `MissedTargetModal`, `PredictedExitModal`, `ExitListModal` — cukup selaraskan warna border/radius bila sempat, tapi prioritas rendah.
- Kalkulasi KPI/timeline (lead time, transit time, warehouse delay, cycle target) di dalam modal detail tab "Timeline & Performance".
- Modal Manifest (`ManifestList`) — biarkan struktur & style-nya seperti sekarang (sudah cukup senada), fokus perubahan di halaman utama & modal detail.

## Cara Verifikasi
1. Jalankan `tsc --noEmit` (atau build project) untuk pastikan tidak ada error sintaks/tipe baru.
2. Cek visual di breakpoint mobile (`<640px`) dan desktop — pastikan modal detail muncul sebagai bottom sheet di mobile dan dialog tengah di desktop.
3. Pastikan search, filter tab, group by, dan pagination masih berfungsi seperti sebelumnya (hanya tampilan yang berubah).
4. Bandingkan warna hover tabel, badge status, dan card grid dengan `ShipmentsListPage` — harus terlihat senada (warna, radius, spacing, font label).