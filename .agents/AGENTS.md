# Aturan Agen (Agent Rules) - mshipping

Dokumen ini berisi panduan, konvensi, dan aturan operasional wajib bagi AI Agent (seperti Antigravity) saat berinteraksi dengan proyek **mshipping**. Aturan ini dirangkum dari spesifikasi arsitektur dan kondisi aktual proyek.

> **⚡ WAJIB**:
> 1. Setiap sesi dimulai → baca `.agents/working.md`. Sesi selesai → update `.agents/working.md`.
> 2. **Sebelum update aplikasi mobile (`mobile/`)** → **WAJIB BACA `mobile-app.md` DULU**.
> 3. **Setelah update mobile selesai** → **WAJIB TANYAKAN DULU ke user: nomor versi baru dan tipe update (apakah ini Force Update?)**.

## 🏗️ Arsitektur Proyek
- **Frontend**: React 19 + Vite + TypeScript (folder `frontend/`)
- **Backend**: Hono.js + Bun + Prisma ORM + MS SQL Server (folder `backend/`)
- **Mobile**: Expo SDK 57 + React Native 0.86 + TypeScript (folder `mobile/`, dokumentasi di `mobile-app.md`)
- **Struktur Folder Frontend**: **Feature-Driven Architecture** (`src/features/<domain>/`)
- **Komunikasi**: REST API via Axios (client di `src/api/client.ts`, endpoint const di `src/api/endpoints/`)


---

## 📂 Struktur Feature-Based Architecture (`src/features/`)

### Domain Aktif (Frontend)
| Domain | Path |
|---|---|
| `auth` | `src/features/auth/` |
| `billing` | `src/features/billing/` |
| `commodity-mapping` | `src/features/commodity-mapping/` |
| `customer-price-list` | `src/features/customer-price-list/` |
| `customers` | `src/features/customers/` |
| `dashboard` | `src/features/dashboard/` |
| `delivery-orders` | `src/features/delivery-orders/` |
| `price-list` | `src/features/price-list/` |
| `profile` | `src/features/profile/` |
| `shipment-batches` | `src/features/shipment-batches/` |
| `shipments` | `src/features/shipments/` |
| `user-management` | `src/features/user-management/` |

### Domain Aktif (Backend Modules)
| Module | Path |
|---|---|
| `auth` | `src/modules/auth/` |
| `billing` | `src/modules/billing/` |
| `commodity-mapping` | `src/modules/commodity-mapping/` |
| `customer-price-list` | `src/modules/customer-price-list/` |
| `customers` | `src/modules/customers/` |
| `dashboard` | `src/modules/dashboard/` |
| `delivery-orders` | `src/modules/delivery-orders/` |
| `m3-check` | `src/modules/m3-check/` |
| `marking` | `src/modules/marking/` |
| `price-check` | `src/modules/price-check/` |
| `price-list` | `src/modules/price-list/` |
| `profile` | `src/modules/profile/` |
| `roles` | `src/modules/roles/` |
| `shipments` | `src/modules/shipments/` |
| `users` | `src/modules/users/` |

### Struktur Internal Standar Feature
```text
src/features/<domain>/
├── components/      # Komponen UI khusus domain
├── constants/       # Konstanta domain (opsional, ada jika kompleks)
├── hooks/           # Custom hooks khusus domain
├── pages/           # Halaman utama domain
├── services/        # Service API domain
├── stores/          # Zustand store domain (opsional)
├── types/           # Interface & tipe data TypeScript
├── utils/           # Helper/formatter khusus domain (opsional)
└── index.ts         # Barrel export untuk fitur
```

> **Catatan**: Fitur kompleks seperti `billing` memiliki sub-folder tambahan: `constants/`, `stores/`, `utils/`. Tambahkan sesuai kebutuhan.

### 🔑 Konvensi Penamaan File Halaman (`pages/`)
- **DILARANG** mengulang nama domain pada nama file halaman di dalam folder fitur!
  - ❌ `features/billing/pages/BillingDashboardPage.tsx`
  - ✅ `features/billing/pages/DashboardPage.tsx`
  - ✅ `features/billing/pages/ListPage.tsx`
  - ✅ `features/billing/pages/DetailPage.tsx`
  - ✅ `features/billing/pages/ValidationListPage.tsx` *(sub-fitur boleh punya prefix konteks)*
  - ✅ `features/billing/pages/ValidationDetailPage.tsx`

---

## 🔑 Konvensi Penamaan (Naming Conventions)
Agen WAJIB mematuhi format penamaan berikut:
- **Backend file**: `kebab-case` (contoh: `billing-analytics.service.ts`)
- **Backend function**: `camelCase` (contoh: `getCustomerById()`)
- **Frontend component**: `PascalCase` (contoh: `BillingStatusTag.tsx`)
- **Frontend hook**: `camelCase` dengan awalan `use` (contoh: `useBillingValidation.ts`)
- **Zustand store file**: `camelCase` dengan akhiran `Store.ts` (contoh: `authStore.ts`, `reportDesignerStore.ts`)
- **API endpoint const file**: `camelCase` domain di `src/api/endpoints/` (contoh: `billing.ts`, `deliveryOrders.ts`)
- **Domain constants file**: `<domain>.constants.ts` (contoh: `billing.constants.ts`)
- **Domain utils file**: `<domain>.utils.ts` (contoh: `billing.utils.ts`)
- **CSS class**: `kebab-case` (contoh: `.data-table`, `.skeleton-shimmer`)
- **Prisma model**: `PascalCase` sesuai nama tabel (contoh: `TbCustomers`)

---

## 🌐 Aturan Sistem Dual Bahasa (i18n ID / EN)

Seluruh teks visual di frontend **WAJIB** menggunakan sistem i18n (`useTranslation()`):

- **DILARANG** meng-hardcode string literal bahasa Indonesia/Inggris pada JSX komponen (termasuk judul halaman, subtitle, breadcrumb, label tombol, header tabel, placeholder, empty state, dan toast message).
- **Penggunaan Hook**:
  ```tsx
  import { useTranslation } from '@/hooks/useTranslation'
  const { t } = useTranslation()
  ```
- **Kamus Terjemahan**: Berada di `src/lib/i18n/id.json` dan `src/lib/i18n/en.json`. Selalu tambahkan key baru di kedua file secara berpasangan.

---

## 🧭 Standar Hierarki Breadcrumbs ERP (3-Level)

Setiap halaman yang menggunakan `<PageHeader>` **WAJIB** menyediakan breadcrumb 3-level menggunakan terjemahan `t(...)` dan konstanta `ROUTES`:

```tsx
breadcrumbs={[
  { label: t('module.finance'), path: ROUTES.BILLING },          // Level 1: Modul ERP + Root Path
  { label: t('nav.billing') },                                    // Level 2: Domain/Fitur Utama
  { label: t('nav.billingList') },                                // Level 3: Tampilan / Sub-page
]}
```

---

## 📁 ROUTES — Konstanta Navigasi (`src/lib/constants.ts`)

**DILARANG** navigasi dengan string hardcode. Selalu gunakan `ROUTES` dari `src/lib/constants.ts`.

Daftar ROUTES aktif (sesuai kondisi saat ini):
```ts
// Auth
ROUTES.LOGIN, ROUTES.REGISTER

// Overview
ROUTES.DASHBOARD

// Logistics
ROUTES.SHIPMENTS, ROUTES.SHIPMENTS_LIST
ROUTES.SHIPMENT_DETAIL(id)
ROUTES.SHIPMENT_BATCHES, ROUTES.SHIPMENT_BATCHES_LIST
ROUTES.DELIVERY_ORDERS, ROUTES.DELIVERY_ORDERS_LIST
ROUTES.DELIVERY_DETAIL(id)

// Finance
ROUTES.BILLING, ROUTES.BILLING_LIST, ROUTES.BILLING_TARGET
ROUTES.BILLING_DETAIL(id)
ROUTES.BILLING_PRINT(id, mode?)          // mode: 'pdf' | 'matrix'
ROUTES.BILLING_REPORT_DESIGNER
ROUTES.BILLING_VALIDATION_SUMMARY
ROUTES.BILLING_VALIDATION_LIST
ROUTES.BILLING_VALIDATION_DETAIL(id)
ROUTES.PRICE_LIST, ROUTES.PRICE_LIST_LOOKUP, ROUTES.PRICE_LIST_UPLOAD
ROUTES.PRICE_LIST_HISTORY, ROUTES.PRICE_LIST_DETAIL(id)
ROUTES.CUSTOMER_PRICE_LIST, ROUTES.CUSTOMER_PRICE_LIST_DETAIL(custCode)
ROUTES.CUSTOMER_PRICE_LIST_UPLOAD, ROUTES.CUSTOMER_PRICE_LIST_LOOKUP
ROUTES.COMMODITY_MAPPING

// Master Data
ROUTES.CUSTOMERS, ROUTES.CUSTOMERS_TIER

// Admin
ROUTES.USERS, ROUTES.ROLES

// User
ROUTES.PROFILE
```

---

## 🚫 Anti-Pattern (DILARANG KERAS)

### Backend
- ❌ `new PrismaClient()` → ✅ Gunakan `import { prisma } from '@/config/database'`
- ❌ `console.log(...)` → ✅ Gunakan `import { logger } from '@/config/logger'`
- ❌ `process.env.VAR` → ✅ Gunakan `import { ENV } from '@/config/env'`
- ❌ `c.json({ ... })` manual → ✅ Gunakan `successResponse` / `errorResponse` dari `src/utils/response.ts`
- ❌ Hitung pagination manual → ✅ Gunakan `buildPagination` / `parsePagination`
- ❌ Query Prisma tanpa fallback/retry pada service agregasi/dashboard → ✅ Gunakan pembungkus `safeQuery` dengan auto-retry & default fallback value
- ❌ Mengambil/menampilkan `fdCustName` dari `tbCustomersHarga`, `tbEntryList`, atau tabel denormalisasi lain → ✅ **WAJIB SELALU mengutamakan data master `tbCustomers.fdCustName` (Single Source of Truth)**. Jika SP/query pihak ketiga mengembalikan nama dari tabel harga/entrylist, timpa (override) dengan data dari `tbCustomers`.

### Frontend
- ❌ Ambil token via `localStorage` langsung → ✅ `useAuthStore().token` (dari `src/stores/authStore.ts`)
- ❌ Buat state `page`/`limit` manual → ✅ `usePagination()` (`src/hooks/usePagination.ts`)
- ❌ `setTimeout` manual untuk debounce search → ✅ `useDebounce()` (`src/hooks/useDebounce.ts`)
- ❌ Format angka/tanggal bawaan JS → ✅ gunakan dari `src/lib/utils.ts`:
  - `formatDate()` — tanggal locale id-ID
  - `formatDateTime()` — tanggal + jam WIB
  - `formatDateShort()` — tanggal en-GB (komponen dual-bahasa)
  - `formatDateTimeShort()` — tanggal+jam en-GB
  - `formatCurrency()` — format Rupiah (`Rp. 1,500,000.00`)
  - `formatCompactRupiah()` — format ringkas (`Rp 1.64 M` / `Rp 500 Jt`)
  - `formatNumber()` — angka dengan separator
  - `formatDecimal()` — angka desimal
  - `formatWeight()` — berat kg
  - `formatYearMonthKey()` — label bulan dari key `YYYY-MM`
  - `cn()` — classnames merger (clsx + tailwind-merge)
- ❌ Navigasi hardcode string → ✅ konstanta dari `ROUTES` (`src/lib/constants.ts`)
- ❌ Panggil axios langsung di komponen → ✅ method service dari `src/features/<domain>/services/`
- ❌ Buat tag `<table>` manual → ✅ komponen `<Table>` dari `src/components/ui/`
- ❌ Warna HEX hardcoded di CSS → ✅ CSS variable (contoh: `var(--color-primary)`)
- ❌ Fullscreen spinner saat initial load page → ✅ skeleton wireframe dengan `.skeleton-shimmer`
- ❌ Spinner bulat / inline spinner JSX (`div + border + animate-spin`) → ✅ skeleton shimmer
- ❌ Tombol aktif solid putih (`bg-white`) di dark mode → ✅ `bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)]`
- ❌ Badge solid terang (`bg-gray-100`, `bg-blue-100`, `bg-amber-100`) → ✅ `bg-transparent border border-... text-...`
- ❌ Highlight tabel solid terang (`bg-blue-50`, `bg-neutral-100`) → ✅ `bg-blue-500/10` dan `hover:bg-[var(--color-neutral)]/40`
- ❌ `alert()` bawaan browser → ✅ `toastStore` dari `src/stores/toastStore.ts`
- ❌ Mendefinisikan interface TypeScript yang sama berulang kali → ✅ sentralisasi di `src/features/<domain>/types/`

---

## 🎨 Standar CSS & Desain Sistem Tema (Terutama Midnight Dark Mode)

Sistem styling mshipping mendukung multi-tema dinamis melalui atribut `[data-theme]` di elemen root (`heritage`, `ocean`, `emerald`, `amber`, `midnight`). Agen **WAJIB** mematuhi aturan berikut:

### 1. Token Variabel Resmi Per Tema
| Token CSS | Heritage (Light) | Ocean (Light) | Emerald (Light) | Amber (Light) | Midnight (Dark) |
|---|---|---|---|---|---|
| `--color-neutral` | `#F7F5F2` | `#F1F5F9` | `#F0FDF4` | `#FDFBF7` | `#0B0F17` (Deep Canvas) |
| `--color-surface` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` | `#151D2A` (Card / Panel) |
| `--color-primary` | `#1A1C1E` | `#0F172A` | `#132E22` | `#291E14` | `#F1F5F9` (Text Utama) |
| `--color-secondary` | `#6C7278` | `#64748B` | `#536B60` | `#786857` | `#94A3B8` (Text Redup) |
| `--color-tertiary` | `#B8422E` | `#2563EB` | `#16A34A` | `#D97706` | `#38BDF8` (Aksen Brand) |
| `--color-border` | `#E8E6E3` | `#E2E8F0` | `#DCFCE7` | `#EFE7DE` | `#1E293B` (Border Lembut) |
| `--color-border-strong` | `#C8C4C0` | `#CBD5E1` | `#BBF7D0` | `#D8C7B8` | `#334155` (Border Tegas) |

> **Catatan**: Nilai Midnight `bgColor=#0B0F17` dan `surfaceColor=#151D2A` — sesuai `themeStore.ts` aktual.

### 2. Aturan Mutlak Desain Mode Gelap (Midnight Dark)
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
  - DILARANG menumpuk `bg-[var(--color-neutral)]` di dalam `bg-[var(--color-surface)]` di dalam `bg-[var(--color-neutral)]` yang membuat warna belang/terang.

---

## 📏 Standar Skala Ukuran Font & Spacing UI (Modal, Toolbar, KPI, & Tabel Data)

Setiap pembuatan atau pembaruan komponen UI (terutama Modal Detail, Tabel ERP, Toolbar Filter, dan Kartu KPI), Agen **WAJIB** mematuhi hierarki skala ukuran font dan padding berikut agar tampilan konsisten, proporsional, kompak, dan nyaman dibaca:

### 1. Header Modal
- **Judul Modal**: `15px font-bold font-[var(--font-label)] uppercase tracking-wide` (DILARANG menggunakan `20px+` yang terlalu besar).
- **Subtitle Modal**: `12px text-[var(--color-secondary)]`.
- **Chip Counter / Badge Header**: `11px` / `text-[11px] font-semibold`.

### 2. Tab Cabang, Toolbar, & Filter
- **Tombol Tab Cabang / Filter**: `12px font-medium` dengan padding kompak `5px 10px` (`px-2.5 py-1.25`).
- **Search Input Box**: `12px` (`text-xs`) dengan padding proporsional.
- **Segmented Buttons / Pill Toggles**: `11.5px` (`text-[11.5px] font-medium`).
- **Context Bar / Info Banner**: `11.5px` (`text-[11.5px]`).

### 3. Kartu Metrik KPI
- **Angka KPI Utama**: `18px font-bold tabular-nums` (DILARANG menggunakan `22px+` di dalam modal/tabel kompak).
- **Label KPI**: `10.5px uppercase tracking-wider font-semibold text-[var(--color-secondary)]`.
- **Footer / Unit / Sub-line KPI**: `11px` – `11.5px tabular-nums`.

### 4. Tabel Data
- **Header Kolom (`thead th`)**: `11px uppercase tracking-wider font-semibold` dengan padding kompak `8px 12px` (`py-2 px-3`).
- **Baris Data (`tbody td`)**: `12px` (`text-xs tabular-nums`).
  - **Teks Utama (No. Invoice / Resi / Listcode)**: `12px font-medium`.
  - **Meta Teks / Sub-line (Tanggal, Keterangan Tambahan)**: `11px text-[var(--color-secondary)]`.
- **Footer Tabel (`tfoot td`)**: `12px font-bold` (`text-xs font-bold tabular-nums`).

### 5. Footer Bar & Modal Actions
- **Keterangan Ringkasan Footer**: `12px text-[var(--color-secondary)]`.
- **Tombol Tutup / Aksi Primer**: `12px font-semibold` (`text-xs font-semibold px-3 py-1.5`).

---

## 🏢 Standar Master Data Customer (Single Source of Truth: `tbCustomers.fdCustName`)

Dalam arsitektur database mshipping, terdapat beberapa tabel yang menyimpan salinan/denormalisasi nama customer (`tbCustomersHarga.fdCustName`, `tbEntryList.fdCustName`, view `qr_tbm3_perMarking_rev1`, dll). Agen **WAJIB** mematuhi aturan berikut:

1. **Selalu Prioritaskan `tbCustomers.fdCustName`**:
   - Master data resmi nama customer HANYA berasal dari tabel master **`tbCustomers`** (`fdCustName`).
   - DILARANG mengandalkan `fdCustName` dari tabel harga (`tbCustomersHarga`), surat jalan, atau view warisan tanpa melakukan verifikasi/override terhadap `tbCustomers`.
2. **Override pada Backend Aggregation & Stored Procedure**:
   - Jika endpoint backend memanggil Stored Procedure legacy (misal `dbo.get_qr_tbm3_perMarking_plus_rasio`) yang melakukan `LEFT JOIN tbCustomersHarga`, backend WAJIB melakukan lookup ke `tbCustomers` dan menimpa (override) nilai `fdCustName` dengan nama resmi dari master `tbCustomers`.
3. **Frontend Component & Modal Props**:
   - Setiap komponen modal atau detail (seperti `CustMarkingDetailModal`, `BillingValidationCard`, dll) harus menerima dan memprioritaskan prop `customerName` dari master header invoice/kartu induk.

---

## 🛡️ Standar Resiliensi & Graceful Fallback Database Backend (WAJIB)

Setiap service backend yang melakukan query database (terutama agregasi, statistik, atau dashboard) **WAJIB** menerapkan prinsip resiliensi jaringan agar hiccup koneksi database sementara (seperti error Prisma `P1001` / `P1002`) tidak melempar **HTTP 500 Server Error**:

1. **Auto-Retry & Safe Execution (`safeQuery`)**:
   - Bungkus query Prisma dengan mekanisme *try-catch* dan *auto-retry* 1x (delay ~500ms) jika terindikasi galat koneksi jaringan/server database terputus sesaat.
2. **Fallback Default Value**:
   - Apabila query tetap gagal setelah retry, berikan nilai *fallback default* (misal: `0` untuk nilai count, `[]` untuk array data, `null` untuk trend) sehingga respons endpoint tetap aman dan UI tidak *crash*.
3. **Penyampaian Log Terstandar**:
   - Catat status *retry* dan *fallback* menggunakan `logger.warn` / `logger.error` dari `@/config/logger`. DILARANG menggunakan `console.error` atau `console.log`.

---

## 📦 Single Source of Truth — UI Components (`src/components/ui/`)

Selalu gunakan komponen yang sudah ada. **DILARANG** membuat komponen redundan.

| Komponen | File |
|---|---|
| `<Button>` | `Button.tsx` |
| `<Badge>` | `Badge.tsx` |
| `<Table>` | `Table.tsx` |
| `<Pagination>` | `Pagination.tsx` |
| `<SearchBar>` | `SearchBar.tsx` |
| `<ConfirmModal>` | `ConfirmModal.tsx` |
| `<Card>` | `Card.tsx` |
| `<EmptyState>` | `EmptyState.tsx` |
| `<PageHeader>` | `PageHeader.tsx` |
| `<Breadcrumb>` | `Breadcrumb.tsx` |
| `<SegmentedControl>` | `SegmentedControl.tsx` |
| `<CurrencyValue>` | `CurrencyValue.tsx` |
| `<FadeIn>` | `FadeIn.tsx` |
| `<LoadingSpinner>` | `LoadingSpinner.tsx` *(hanya micro-spinner inline, BUKAN page load)* |
| `<Toast>` / `<ToastContainer>` | `Toast.tsx`, `ToastContainer.tsx` |

- **Frontend Domain Components** (`src/features/<domain>/components/`): komponen spesifik fitur. Jangan campur ke `components/ui/`.
- **Frontend Domain Services** (`src/features/<domain>/services/`): semua panggilan API via service domain.
- **Frontend Types** (`src/features/<domain>/types/`): sentralisasi tipe TypeScript domain.
- **Frontend Utilities** (`src/lib/utils.ts`): lihat daftar fungsi di seksi Anti-Pattern.
- **Backend Error Handler**: semua throw error ditangani `errorHandler.ts` middleware.
- **Notifikasi/Alert**: `toastStore` (`src/stores/toastStore.ts`). DILARANG `alert()` bawaan browser.

---

## ⏳ Standar Loading State (WAJIB untuk Semua Page Baru)

Setiap page yang melakukan data fetching WAJIB mengimplementasikan loading state menggunakan **animasi skeleton shimmer**:

### Pola Wajib — Initial Load (Pertama Kali Masuk Halaman)
- **WAJIB** menggunakan wireframe skeleton dengan class animasi `.skeleton-shimmer` bawaan proyek (sudah mendukung multi-tema otomatis: Heritage, Ocean, Emerald, Amber, Midnight).
- **DILARANG** menggunakan fullscreen loading spinner bulat saat initial load halaman utama karena mengurangi estetika dan terkesan lambat.
- Buat komponen skeleton khusus halaman (misal: `DetailPageSkeleton`, `ListPageSkeleton`) sebagai early return sebelum data siap:
```tsx
// Untuk page dengan useQuery:
const { data, isLoading } = useQuery(...)
if (isLoading && !data) return <DetailPageSkeleton />

// Contoh struktur skeleton component:
function DetailPageSkeleton() {
  const { t } = useTranslation()
  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn font-[var(--font-body)]">
      <PageHeader
        title={t('billing.detail.title')}
        breadcrumbs={[...]}
        actions={<div className="h-9 w-24 rounded-lg skeleton-shimmer" />}
      />

      {/* KPI Cards / Summary Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 sm:p-4 space-y-2.5 shadow-xs">
            <div className="flex justify-between items-center">
              <div className="h-3 w-20 rounded skeleton-shimmer" />
              <div className="h-4 w-12 rounded-full skeleton-shimmer" />
            </div>
            <div className="h-5 w-3/4 rounded skeleton-shimmer" />
            <div className="h-3.5 w-1/2 rounded skeleton-shimmer" />
          </div>
        ))}
      </div>

      {/* Content / Table Skeleton */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 space-y-3 shadow-xs">
        <div className="h-5 w-44 rounded skeleton-shimmer" />
        <div className="space-y-2 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-full rounded-lg skeleton-shimmer" />
          ))}
        </div>
      </div>
    </div>
  )
}
```

### Pola Wajib — Subsequent Loading (Refresh/Filter/Search)
- ❌ JANGAN me-reset tampilan kembali ke full skeleton saat data lama masih ada (menimbulkan efek kedip/jarring).
- ✅ Gunakan progress bar tipis di atas tabel atau opacity overlay (`opacity-60 pointer-events-none`) di konten yang sedang diperbarui.
- ✅ Tampilkan indikator status halus inline (icon refresh berputar atau progress bar tipis) di toolbar saat data sedang diperbarui (`isFetching` / `isRefreshing`).
### Referensi Implementasi
- Skeleton: `features/billing/pages/DetailPage.tsx` (`DetailPageSkeleton`)
- Subsequent loading: `features/delivery-orders/pages/ListPage.tsx`

### Aturan Penamaan State Loading
- `isLoading` → state utama (true saat query pertama kali dimuat tanpa cache)
- `isInitialLoading = isLoading && (!data || data.length === 0)` → penentu apakah menampilkan skeleton atau konten utama
- `isRefreshing` / `isFetching` → penentu indikator loading halus saat data lama tetap tampil di layar
- `isLoadingKpi`, `isLoadingDetail`, dll → untuk query sekunder/tambahan

---

## 🛑 Keputusan yang WAJIB Dikonfirmasi ke User (Owner)
Agen HARUS BERHENTI dan bertanya kepada user sebelum mengasumsikan:
1. **Database schema yang tidak diketahui**: Nama kolom tabel yang existing, tipe primary key (INT/UUID/String), atau relasi foreign key yang belum jelas.
2. **Kebutuhan UI/UX**: Kolom apa saja yang harus ditampilkan di tabel list data, kolom apa saja yang bisa di-search, dan nilai enum/status yang valid.
3. **Data sensitif**: Membuka endpoint yang mungkin mengekspos data rahasia tanpa filter default.
4. **Versi & Tipe Update Mobile App**: Sebelum merilis / build APK baru setelah perbaikan atau penambahan fitur:
   - **Tanyakan nomor versi baru** yang diinginkan (`version` semver & `versionCode`).
   - **Tanyakan tipe update**: *"Apakah pembaruan ini bersifat **Force Update** (`forceUpdate: true`) yang wajib diinstal pengguna agar dapat terus menggunakan aplikasi, atau **Opsional** (`forceUpdate: false`) yang dapat ditunda ('Nanti Saja')?"*
   - DILARANG mengasumsikan sendiri status `forceUpdate`.

---

## 📱 Standar Operasional & Rilis Mobile App (`mobile/` & `mobile-app.md`)

Setiap kali berinteraksi dengan proyek aplikasi mobile (`mobile/`), Agen **WAJIB** mematuhi alur kerja berikut:

### 1. Wajib Baca `mobile-app.md` Sebelum Update
- Sebelum melakukan penambahan fitur, perbaikan bug, atau perubahan tampilan/endpoint pada folder `mobile/`, Agen **WAJIB membaca `mobile-app.md` terlebih dahulu** (`view_file` pada `c:\shipping\mobile-app.md`).
- Memahami alur state management, routing, integrasi hardware, struktur data tabel, dan kontrak endpoint yang sudah berjalan agar perubahan tidak merusak fungsionalitas yang ada.

### 2. Konfirmasi Versi & Tipe Update ke User (WAJIB TANYAKAN DULU)
Setelah pekerjaan perbaikan atau fitur pada mobile app selesai dan sebelum melakukan build/rilis APK baru:
- **Tanyakan ke User**:
  1. Nomor versi baru yang diinginkan (misal `v1.0.3` / `versionCode: 4`).
  2. Tipe update: **Apakah pembaruan ini bersifat Force Update (`forceUpdate: true`) atau Opsional (`forceUpdate: false`)?**
  3. Poin catatan rilis (*release notes*) yang ingin disertakan dalam pop-up dialog.
- **DILARANG** mengasumsikan sendiri apakah rilis tersebut force update atau bukan.

### 3. Penyelarasan Konfigurasi Versi Terpusat
Setelah user mengonfirmasi versi dan status force update, selaraskan seluruh berkas konfigurasi berikut:
1. `mobile/src/config/version.ts` $\to$ `APP_VERSION = 'X.Y.Z'` dan `APP_VERSION_CODE = N` (*Single Source of Truth* yang terkompilasi ke dalam Hermes bytecode).
2. `backend/src/config/app-version.json` $\to$ `version`, `versionCode`, `forceUpdate`, `releaseNotes`, dan `publishedAt`.
3. `mobile/app.json` $\to$ `expo.version`.
4. `mobile/package.json` $\to$ `version`.

### 4. Prosedur Build, Sign, & Distribusi APK
1. Jalankan `bunx expo export --platform android` di direktori `mobile/`.
2. Ganti `assets/index.android.bundle` di dalam `mshipping.apk` dengan file `.hbc` yang baru diekspor, lalu hapus folder `META-INF/`.
3. Sign dan zipalign APK menggunakan `release.keystore` via `uber-apk-signer`:
   ```powershell
   & "C:\Program Files\JetBrains\PyCharm Community Edition 2024.3.1.1\jbr\bin\java.exe" -jar "C:\shipping\uber-apk-signer.jar" -a "C:\shipping\mshipping.apk" --ks "mobile/keystore/release.keystore" --ksAlias mshipping --ksPass mshipping2026 --ksKeyPass mshipping2026 --allowResign --overwrite --verbose
   ```
4. Salin APK hasil sign ke:
   - `C:\shipping\frontend\dist\mshipping.apk`
   - `C:\shipping\backend\public\uploads\mshipping.apk`
   - `C:\shipping\mshipping.apk`
5. Restart PM2 `ShippingApi` agar metadata `app-version.json` termuat ulang: `pm2 restart ShippingApi`.

### 5. Sinkronisasi Dokumentasi `mobile-app.md`
- Setelah update selesai dan terverifikasi, perbarui dokumen [mobile-app.md](file:///c:/shipping/mobile-app.md) agar selalu mencerminkan kondisi riil halaman, logika, dan endpoint yang terpasang.

---

## 🪨 Aturan Komunikasi Ringkas & Hemat Token (Caveman Style)

Agen WAJIB mematuhi gaya komunikasi yang sangat ringkas dan efisien:
- **Zero Fluff**: Hilangkan kata sambutan, basa-basi pembuka, dan kalimat penutup yang tidak perlu.
- **Direct to the Point**: Sampaikan inti solusi, analisis, atau perintah secara singkat dan padat.
- **Byte-Exact Code**: Kode program, perintah terminal, diff, URL, dan error log WAJIB tetap 100% utuh dan presisi tanpa kompromi.
- **Bahasa**: Gunakan bahasa Indonesia ringkas & teknis.

---

## 🧰 Skills Tersedia (`.agents/skills/`)

Agent WAJIB membaca file `SKILL.md` dari skill yang relevan sebelum mengerjakan task yang berkaitan.

| Skill | Path | Kapan Digunakan |
|---|---|---|
| `design-taste-frontend` | `.agents/skills/taste-skill/SKILL.md` | Landing page, portfolio, halaman pemasaran baru — saat butuh desain premium non-template |
| `redesign-existing-projects` | `.agents/skills/redesign-skill/SKILL.md` | Upgrade/redesign UI yang sudah ada — audit dulu, lalu perbaiki tanpa rewrite total |

### Cara Membaca Skill
```
Sebelum mulai task desain/UI → baca SKILL.md yang relevan via view_file
Ikuti instruksi di SKILL.md sebagai standar eksekusi
```

> **Catatan penting**: Kedua skill di atas berlaku untuk halaman **marketing / landing / portfolio**. Untuk komponen ERP (tabel data, form input, dashboard analytics), gunakan standar desain yang ada di file ini (AGENTS.md), bukan skill frontend.

---

## 📋 Protokol `working.md` — Memori Lintas Sesi (WAJIB)

File `.agents/working.md` adalah **living document** yang menjaga kontinuitas pemahaman antar agent dan antar sesi.

### Kapan WAJIB Dibaca
- **Awal setiap sesi** — sebelum mengerjakan task apapun, baca `working.md` untuk memahami konteks aktif.

### Kapan WAJIB Diupdate
Update `working.md` sebelum menutup sesi jika ada salah satu dari kondisi berikut:

| Kondisi | Apa yang Diupdate |
|---|---|
| Task baru dimulai | Tambah ke "Task Sedang Berjalan" |
| Task selesai | Pindah ke "Task Selesai" dengan `[x]` |
| File penting diubah | Tambah ke "File Yang Baru Diubah" (maks 5 terakhir) |
| Keputusan desain/arsitektur baru | Tambah ke tabel "Keputusan Desain" |
| Bug / isu baru ditemukan | Tambah ke "Isu Aktif" |
| Pergantian agent / model | Update header "Terakhir Diperbarui" |

### Format Header Wajib
```markdown
## 🕐 Terakhir Diperbarui
- **Tanggal**: YYYY-MM-DD
- **Oleh**: [Nama Agent / Model]
- **Sesi**: [Deskripsi singkat task sesi ini]
```

### Lokasi File
```
c:\shipping\.agents\working.md
```

---
*Catatan Sistem: File ini berfungsi sebagai referensi instruksi bagi AI Agent untuk menjaga konsistensi kode sesuai standar proyek. Terakhir diperbarui: 2026-09-10.*
