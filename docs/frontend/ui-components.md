# 🎨 Desain Sistem, Multi-Tema & Pustaka Komponen UI (`src/components/ui/`)

Dokumen ini adalah referensi visual dan panduan implementasi antarmuka pengguna pada web frontend M-Shipping.

---

## 1. Token Variabel Resmi 5 Tema
Sistem mendukung multi-tema dinamis melalui atribut `[data-theme]` pada root DOM:

| Token CSS | Heritage (Light) | Ocean (Light) | Emerald (Light) | Amber (Light) | Midnight (Dark Mode) |
|---|---|---|---|---|---|
| `--color-neutral` | `#F7F5F2` | `#F1F5F9` | `#F0FDF4` | `#FDFBF7` | `#0B0F17` (Deep Canvas) |
| `--color-surface` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` | `#151D2A` (Card / Panel) |
| `--color-primary` | `#1A1C1E` | `#0F172A` | `#132E22` | `#291E14` | `#F1F5F9` (Text Utama) |
| `--color-secondary` | `#6C7278` | `#64748B` | `#536B60` | `#786857` | `#94A3B8` (Text Redup) |
| `--color-tertiary` | `#B8422E` | `#2563EB` | `#16A34A` | `#D97706` | `#38BDF8` (Aksen Brand) |
| `--color-border` | `#E8E6E3` | `#E2E8F0` | `#DCFCE7` | `#EFE7DE` | `#1E293B` (Border Lembut) |
| `--color-border-strong` | `#C8C4C0` | `#CBD5E1` | `#BBF7D0` | `#D8C7B8` | `#334155` (Border Tegas) |

---

## 2. Aturan Mutlak Desain Mode Gelap (Midnight Dark)
- **Outline Border & Background Transparan**: Kartu KPI, chip filter, status badge, pill toggle, dan baris accordion WAJIB menggunakan `bg-transparent` dengan border tipis semantik (`border-[var(--color-border)]`, `border-amber-500/40`, dll).
- **DILARANG Tombol Solid Putih**: Di mode gelap, tombol/tab aktif DILARANG menggunakan `bg-white` karena menyilaukan. Gunakan:
  ```tsx
  active
    ? "bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs"
    : "border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
  ```
- **DILARANG Background Badge Solid Terang**: Jangan gunakan `bg-gray-100`, `bg-blue-100`, `bg-amber-100` pada badge di mode gelap. Gunakan badge outline semantik.

---

## 3. Pustaka Komponen UI Primitif Terpusat (`src/components/ui/`)
Seluruh modul dan fitur **WAJIB** menggunakan komponen terstandarisasi berikut:

| Komponen | Berkas | Deskripsi & Aturan Penggunaan |
|---|---|---|
| `<Modal>` | `src/components/ui/Modal.tsx` | Dialog pop-up universal berbasis React Portal (`document.body`). ESC key listener, body scroll lock, backdrop blur. Standard size: `sm`, `md`, `lg`, `xl`, `2xl`, `full`. |
| `<StatCard>` | `src/components/ui/StatCard.tsx` | Kartu metrik KPI universal dengan visual ratio bar tipis (6px) rounded-full, indikator tren MoM, tabular nums, dan status skeleton otomatis. |
| `<StatusBadge>` | `src/components/ui/StatusBadge.tsx` | Badge status tunggal untuk Billing, Validasi Audit, DO, dan Customer Tier. |
| `<ConfirmModal>` | `src/components/ui/ConfirmModal.tsx` | Dialog konfirmasi aksi destruktif atau penting berbasis `<Modal>`. |
| `<Table>` | `src/components/ui/Table.tsx` | Tabel ERP terstandarisasi dengan header sticky dan hover highlight lembut. |
| `<Pagination>` | `src/components/ui/Pagination.tsx` | Navigasi halaman kompak dengan informasi rentang baris dan limit selector. |
| `<SearchBar>` | `src/components/ui/SearchBar.tsx` | Kolom pencarian debounced dengan icon search dan tombol clear. |
| `<SearchSuggestionsDropdown>` | `src/components/ui/SearchSuggestionsDropdown.tsx` | Dropdown autocomplete popover terpadu z-index tinggi (`z-50`). |
| `<Button>` | `src/components/ui/Button.tsx` | Tombol primer, sekunder, outline, ghost dengan efek hover terstandarisasi. |
| `<EmptyState>` | `src/components/ui/EmptyState.tsx` | Visual ketika data kosong atau hasil pencarian tidak ditemukan. |
| `<PageHeader>` | `src/components/ui/PageHeader.tsx` | Header ERP memuat breadcrumbs 3-level, judul, dan toolbar aksi. |

---

## 4. Skala Font & Padding Kompak ERP
- **Header Modal**: Judul `15px font-bold font-[var(--font-label)] uppercase tracking-wide`, Subtitle `12px text-[var(--color-secondary)]`.
- **Tab Cabang & Filter**: `12px font-medium px-2.5 py-1.25`.
- **Kartu KPI**: Angka utama `18px font-bold tabular-nums`, label `10.5px uppercase tracking-wider font-semibold`.
- **Tabel Data**: Header `11px uppercase tracking-wider font-semibold py-2 px-3`, Baris `12px tabular-nums`.
- **Footer Actions**: `12px font-semibold px-3 py-1.5`.

---

## 5. Standar Loading State (Skeleton Shimmer)
- **Initial Load**: Wireframe skeleton dengan class animasi `.skeleton-shimmer` bawaan proyek. DILARANG menggunakan fullscreen spinner bulat.
- **Subsequent Loading**: Pertahankan data lama dengan overlay opacity tipis (`opacity-60 pointer-events-none`) atau progress bar tipis.
