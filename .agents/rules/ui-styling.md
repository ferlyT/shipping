# 🎨 Standar Styling UI & Desain Sistem — mshipping

> Bagian dari aturan operasional AI Agent. File ini mendefinisikan token CSS multi-tema, aturan Midnight Dark Mode, skala ukuran font & spacing kompak, pola loading skeleton shimmer, dan komponen UI terpusat.

---

## 1. 🎨 Token Variabel Resmi Per Tema

Sistem styling mendukung 5 tema dinamis melalui atribut `[data-theme]` pada root:

| Token CSS | Heritage (Light) | Ocean (Light) | Emerald (Light) | Amber (Light) | Midnight (Dark) |
|---|---|---|---|---|---|
| `--color-neutral` | `#F7F5F2` | `#F1F5F9` | `#F0FDF4` | `#FDFBF7` | `#0B0F17` (Deep Canvas) |
| `--color-surface` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` | `#151D2A` (Card / Panel) |
| `--color-primary` | `#1A1C1E` | `#0F172A` | `#132E22` | `#291E14` | `#F1F5F9` (Text Utama) |
| `--color-secondary` | `#6C7278` | `#64748B` | `#536B60` | `#786857` | `#94A3B8` (Text Redup) |
| `--color-tertiary` | `#B8422E` | `#2563EB` | `#16A34A` | `#D97706` | `#38BDF8` (Aksen Brand) |
| `--color-border` | `#E8E6E3` | `#E2E8F0` | `#DCFCE7` | `#EFE7DE` | `#1E293B` (Border Lembut) |
| `--color-border-strong` | `#C8C4C0` | `#CBD5E1` | `#BBF7D0` | `#D8C7B8` | `#334155` (Border Tegas) |

---

## 2. 🌙 Aturan Mutlak Desain Mode Gelap (Midnight Dark)

- **Outline Border & Transparent Background (Clean Aesthetics)**:
  Kartu KPI metrik, chip filter, status badge, pill toggle, dan baris accordion WAJIB menggunakan `bg-transparent` dengan border tipis semantik (`border-[var(--color-border)]`, `border-[var(--color-tertiary)]`, `border-amber-500/40`, dll).
- **DILARANG Tombol Solid Putih Terang**:
  Di mode gelap, tombol aktif, tab aktif, atau pill filter DILARANG menggunakan background solid putih (`bg-white` atau `bg-[var(--color-primary)]`) karena menyilaukan. Gunakan:
  ```tsx
  active
    ? "bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs"
    : "border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
  ```
- **DILARANG Background Badge Solid Terang**:
  DILARANG keras menggunakan `bg-gray-100`, `bg-slate-100`, `bg-blue-100`, `bg-amber-100` pada badge/chip di mode gelap karena menjadi kotak putih/abu-abu menyala.
  - Gunakan badge standar:
    ```tsx
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-transparent border border-amber-500/40 text-amber-500">
      Pending
    </span>
    ```
- **Hierarki Kontainer Tanpa Redundansi**:
  - Halaman root: biarkan mewarisi `bg-[var(--color-neutral)]` dari layout utama.
  - Card/Panel: gunakan `bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl`.
  - Item baris/Accordion: gunakan `bg-transparent hover:bg-[var(--color-neutral)]/30 border-b border-[var(--color-border)]`.
  - DILARANG menumpuk `bg-[var(--color-neutral)]` di dalam `bg-[var(--color-surface)]` di dalam `bg-[var(--color-neutral)]` yang membuat warna belang.

---

## 3. 📏 Skala Ukuran Font & Spacing UI Kompak

Setiap komponen UI (terutama Modal Detail, Tabel ERP, Toolbar Filter, & Kartu KPI) **WAJIB** mematuhi hierarki proporsional berikut:

### 1. Header Modal
- **Judul Modal**: `15px font-bold font-[var(--font-label)] uppercase tracking-wide` (DILARANG `20px+`).
- **Subtitle Modal**: `12px text-[var(--color-secondary)]`.
- **Chip Counter / Badge Header**: `11px` / `text-[11px] font-semibold`.

### 2. Tab Cabang, Toolbar, & Filter
- **Tombol Tab Cabang / Filter**: `12px font-medium` dengan padding kompak `5px 10px` (`px-2.5 py-1.25`).
- **Search Input Box**: `12px` (`text-xs`) dengan padding proporsional.
- **Segmented Buttons / Pill Toggles**: `11.5px` (`text-[11.5px] font-medium`).
- **Context Bar / Info Banner**: `11.5px` (`text-[11.5px]`).

### 3. Kartu Metrik KPI
- **Angka KPI Utama**: `18px font-bold tabular-nums` (DILARANG `22px+` di modal/tabel kompak).
- **Label KPI**: `10.5px uppercase tracking-wider font-semibold text-[var(--color-secondary)]`.
- **Footer / Unit / Sub-line KPI**: `11px` – `11.5px tabular-nums`.

### 4. Tabel Data
- **Header Kolom (`thead th`)**: `11px uppercase tracking-wider font-semibold` dengan padding kompak `8px 12px` (`py-2 px-3`).
- **Baris Data (`tbody td`)**: `12px` (`text-xs tabular-nums`).
  - Teks Utama (No. Invoice / Resi / Listcode): `12px font-medium`.
  - Meta Teks / Sub-line (Tanggal, Keterangan Tambahan): `11px text-[var(--color-secondary)]`.
- **Footer Tabel (`tfoot td`)**: `12px font-bold` (`text-xs font-bold tabular-nums`).

### 5. Footer Bar & Modal Actions
- **Keterangan Ringkasan Footer**: `12px text-[var(--color-secondary)]`.
- **Tombol Tutup / Aksi Primer**: `12px font-semibold` (`text-xs font-semibold px-3 py-1.5`).

---

## 4. ⏳ Standar Loading State (Skeleton Shimmer)

Setiap page yang melakukan data fetching WAJIB mengimplementasikan loading state menggunakan wireframe `.skeleton-shimmer`:

### Initial Load
- Gunakan wireframe skeleton beranimasi `.skeleton-shimmer` bawaan multi-tema.
- **DILARANG** menggunakan fullscreen loading spinner bulat pada load halaman utama.
- Buat komponen skeleton khusus halaman (misal: `DetailPageSkeleton`, `ListPageSkeleton`) sebagai early return:
  ```tsx
  const { data, isLoading } = useQuery(...)
  if (isLoading && !data) return <DetailPageSkeleton />
  ```

### Subsequent Loading (Filter / Search / Refresh)
- ❌ JANGAN me-reset tampilan kembali ke full skeleton jika data lama masih ada (menimbulkan kedip/jarring).
- ✅ Gunakan progress bar tipis di atas tabel atau opacity overlay (`opacity-60 pointer-events-none`).
- ✅ Gunakan indikator loading halus inline di toolbar saat data diperbarui (`isFetching` / `isRefreshing`).

---

## 5. 📦 Single Source of Truth — UI Components (`src/components/ui/`)

Selalu gunakan komponen yang sudah ada. DILARANG membuat komponen redundan:

| Komponen | File | Deskripsi |
|---|---|---|
| `<Button>` | `Button.tsx` | Tombol interaktif multi-varian |
| `<Badge>` | `Badge.tsx` | Badge status outline / pill |
| `<Table>` | `Table.tsx` | Kontainer tabel data ERP |
| `<Pagination>` | `Pagination.tsx` | Navigasi halaman data |
| `<SearchBar>` | `SearchBar.tsx` | Input pencarian terstandar |
| `<ConfirmModal>` | `ConfirmModal.tsx` | Dialog konfirmasi aksi |
| `<Card>` | `Card.tsx` | Kontainer panel permukaan |
| `<EmptyState>` | `EmptyState.tsx` | Tampilan data kosong |
| `<PageHeader>` | `PageHeader.tsx` | Header judul & breadcrumbs 3-level |
| `<Breadcrumb>` | `Breadcrumb.tsx` | Navigasi jejak halaman |
| `<SegmentedControl>` | `SegmentedControl.tsx` | Switcher tab kompak |
| `<CurrencyValue>` | `CurrencyValue.tsx` | Formatter nilai mata uang |
| `<FadeIn>` | `FadeIn.tsx` | Transisi tampilan animasi |
| `<ToastContainer>` | `ToastContainer.tsx` | Notifikasi toast (`toastStore`) |
| `<LoadingSpinner>` | `LoadingSpinner.tsx` | Micro-spinner inline (BUKAN full page) |
