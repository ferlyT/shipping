# Aturan Agen (Agent Rules) - mshipping

Dokumen ini berisi panduan, konvensi, dan aturan operasional wajib bagi AI Agent (seperti Antigravity) saat berinteraksi dengan proyek **mshipping**. Aturan ini dirangkum dari spesifikasi arsitektur dan checklist proyek.

## 🏗️ Arsitektur Proyek
- **Frontend**: React 19 + Vite + TypeScript (Berada di folder `frontend/`)
- **Backend**: Hono.js + Bun + Prisma ORM + MS SQL Server (Berada di folder `backend/`)
- **Struktur Folder Frontend**: **Feature-Driven Architecture** (`src/features/<domain>/`)
- **Komunikasi**: REST API via Axios.

---

## 📂 Struktur Feature-Based Architecture (`src/features/`)
Semua fitur domain wajib diletakkan di bawah `src/features/<domain>/` dengan struktur internal standar berikut:

```text
src/features/<domain>/
├── components/      # Komponen UI khusus domain (contoh: CustomerBadges.tsx)
├── hooks/           # Custom hooks khusus domain
├── pages/           # Halaman utama domain (DashboardPage, ListPage, DetailPage)
├── services/        # Service API domain (contoh: billing.service.ts)
├── types/           # Interface & tipe data TypeScript (contoh: billing.types.ts)
└── index.ts         # Barrel export untuk fitur
```

### 🔑 Konvensi Penamaan File Halaman (`pages/`)
- **DILARANG** mengulang nama domain pada nama file halaman di dalam folder fitur!
  - ❌ `features/billing/pages/BillingDashboardPage.tsx`
  - ❌ `features/billing/pages/BillingListPage.tsx`
  - ✅ `features/billing/pages/DashboardPage.tsx`
  - ✅ `features/billing/pages/ListPage.tsx`
  - ✅ `features/billing/pages/DetailPage.tsx`

---

## 🔑 Konvensi Penamaan Lainnya (Naming Conventions)
Agen WAJIB mematuhi format penamaan berikut:
- **Backend file**: `kebab-case` (contoh: `auth.service.ts`)
- **Backend function**: `camelCase` (contoh: `getCustomerById()`)
- **Frontend component**: `PascalCase` (contoh: `CustomerTable.tsx`)
- **Frontend hook**: `camelCase` dengan awalan `use` (contoh: `usePagination()`)
- **Zustand store**: `camelCase` dengan akhiran `Store` (contoh: `authStore.ts`)
- **API endpoint const**: `UPPER_SNAKE` (contoh: `CUSTOMERS_API`)
- **CSS class**: `kebab-case` (contoh: `.data-table`)
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

Setiap halaman yang menggunakan `<PageHeader>` **WAJIB** menyediakan breadcrumb 3-level yang konsisten menggunakan terjemahan `t(...)` dan konstanta `ROUTES`:

```tsx
breadcrumbs={[
  { label: t('module.logistics'), path: ROUTES.SHIPMENT_BATCHES }, // Level 1: Modul ERP + Root Path
  { label: t('nav.batchMarking') },                                // Level 2: Domain/Fitur Utama
  { label: t('nav.batchList') },                                   // Level 3: Tampilan / Sub-page
]}
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

### Frontend
- ❌ Ambil token via `localStorage` langsung → ✅ Gunakan `useAuthStore().token`
- ❌ Buat state manual untuk page/limit → ✅ Gunakan `usePagination()`
- ❌ `setTimeout` manual untuk debounce search → ✅ Gunakan `useDebounce()`
- ❌ Format angka/tanggal bawaan JS → ✅ Gunakan `formatDate`, `formatCurrency`, `formatNumber` dari `src/lib/utils.ts`
- ❌ Navigasi hardcode string → ✅ Gunakan konstanta dari `ROUTES` (`src/lib/constants.ts`)
- ❌ Panggil axios langsung di komponen → ✅ Gunakan method service dari `src/features/<domain>/services/`
- ❌ Buat tag `<table>` manual → ✅ Gunakan komponen `<Table>` dari `src/components/ui/`
- ❌ Warna HEX hardcoded di CSS → ✅ Gunakan CSS variable bawaan (contoh: `var(--color-primary)`)
- ❌ Duplikasi komponen/fungsi/interface di file page berbeda → ✅ Pisahkan ke folder `features/<domain>/components/` atau `features/<domain>/types/`
- ❌ Buat inline spinner JSX (div + border + animate-spin) di page → ✅ Gunakan `<LoadingSpinner>` dari `src/components/ui/LoadingSpinner.tsx`

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

## 📁 Single Source of Truth (Gunakan yang Sudah Ada)
Sebelum membuat utility baru, pastikan untuk menggunakan yang berikut ini:

- **Frontend UI Components** (`src/components/ui/`):
  Gunakan `<Button>`, `<Badge>`, `<Table>`, `<Pagination>`, `<SearchBar>`, `<Modal>`, `<Card>`, `<LoadingSpinner>`, `<EmptyState>`, `<PageHeader>`, `<Breadcrumb>`. Jangan buat komponen redundan.
- **Frontend Domain Components** (`src/features/<domain>/components/`):
  Gunakan folder ini untuk komponen spesifik fitur (contoh: `src/features/shipment-batches/components/`). Jangan campur komponen bisnis logic ke dalam `components/ui/`.
- **Frontend Domain Services** (`src/features/<domain>/services/`):
  Semua pemanggilan API dilakukan via service domain masing-masing.
- **Frontend Types** (`src/features/<domain>/types/`):
  Sentralisasi tipe data TypeScript domain. Jangan mendefinisikan interface yang sama berulang kali.
- **Frontend Utilities** (`src/lib/utils.ts`):
  Gunakan fungsi `cn()` untuk classnames, `formatDate()`, `formatCurrency()`.
- **Backend Auth**: Semua throw error wajib ditangani oleh `errorHandler.ts` middleware.
- **Notifikasi/Alert**: Gunakan `toastStore`. DILARANG menggunakan `alert()` bawaan browser.

---

## ⏳ Standar Loading State (WAJIB untuk Semua Page Baru)

Setiap page yang melakukan data fetching WAJIB mengimplementasikan loading state dengan aturan berikut:

### Pola Wajib — Initial Load (Pertama Kali Masuk Halaman)
Gunakan `<LoadingSpinner>` dari `src/components/ui/LoadingSpinner.tsx` sebagai early return sebelum konten utama:
```tsx
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// Untuk page dengan useState + async fetch:
const [isLoading, setIsLoading] = useState(true)
if (isLoading) return <LoadingSpinner message={t('common.loadingBatch')} />

// Untuk page dengan useQuery:
const { data, isLoading } = useQuery(...)
if (isLoading && !data) return <LoadingSpinner message={t('common.loadingBatch')} />
```

### Pola Wajib — Subsequent Loading (Refresh/Filter/Search)
- ❌ JANGAN tampilkan fullscreen spinner saat data lama masih ada
- ✅ Gunakan progress bar tipis di atas tabel atau opacity overlay di konten yang sedang diperbarui
- ✅ Tampilkan spinner kecil inline di dalam `<SearchBar>` atau toolbar
- Referensi implementasi: lihat `features/billing/pages/ListPage.tsx` (`isRefreshing` → progress bar + `isInitialLoading` → fullscreen spinner)

### Aturan Penamaan State Loading
- `isLoading` → state utama (true saat data pertama kali dimuat)
- `isInitialLoading = isLoading && data.length === 0` → untuk page list (bedakan initial vs refresh)
- `isLoadingKpi`, `isLoadingDetail`, dll → untuk query sekunder/tambahan

---

## 🛑 Keputusan yang WAJIB Dikonfirmasi ke User (Owner)
Agen HARUS BERHENTI dan bertanya kepada user sebelum mengasumsikan:
1. **Database schema yang tidak diketahui**: Nama kolom tabel yang existing, tipe primary key (INT/UUID/String), atau relasi foreign key yang belum jelas.
2. **Kebutuhan UI/UX**: Kolom apa saja yang harus ditampilkan di tabel list data, kolom apa saja yang bisa di-search, dan nilai enum/status yang valid.
3. **Data sensitif**: Membuka endpoint yang mungkin mengekspos data rahasia tanpa filter default.

---

## 🪨 Aturan Komunikasi Ringkas & Hemat Token (Caveman Style)

Agen WAJIB mematuhi gaya komunikasi yang sangat ringkas dan efisien:
- **Zero Fluff**: Hilangkan kata sambutan, basa-basi pembuka, dan kalimat penutup yang tidak perlu.
- **Direct to the Point**: Sampaikan inti solusi, analisis, atau perintah secara singkat dan padat.
- **Byte-Exact Code**: Kode program, perintah terminal, diff, URL, dan error log WAJIB tetap 100% utuh dan presisi tanpa kompromi.
- **Bahasa**: Gunakan bahasa Indonesia ringkas & teknis.

---
*Catatan Sistem: File ini berfungsi sebagai referensi instruksi bagi AI Agent untuk menjaga konsistensi kode sesuai standar proyek.*

