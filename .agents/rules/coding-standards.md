# 📐 Standar Koding & Konvensi — mshipping

> Bagian dari aturan operasional AI Agent. File ini mendefinisikan konvensi penamaan, arsitektur feature-driven, sistem dual-bahasa (i18n), breadcrumbs, rute navigasi, dan anti-pattern.

---

## 1. 🔑 Konvensi Penamaan (Naming Conventions)

Agen **WAJIB** mematuhi format penamaan berikut:
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

### 🔑 Konvensi Penamaan File Halaman (`pages/`)
- **DILARANG** mengulang nama domain pada nama file halaman di dalam folder fitur!
  - ❌ `features/billing/pages/BillingDashboardPage.tsx`
  - ✅ `features/billing/pages/DashboardPage.tsx`
  - ✅ `features/billing/pages/ListPage.tsx`
  - ✅ `features/billing/pages/DetailPage.tsx`
  - ✅ `features/billing/pages/ValidationListPage.tsx` *(sub-fitur boleh punya prefix konteks)*
  - ✅ `features/billing/pages/ValidationDetailPage.tsx`

---

## 2. 🌐 Aturan Sistem Dual Bahasa (i18n ID / EN)

Seluruh teks visual di frontend **WAJIB** menggunakan sistem i18n (`useTranslation()`):

- **DILARANG** meng-hardcode string literal bahasa Indonesia/Inggris pada JSX komponen (termasuk judul halaman, subtitle, breadcrumb, label tombol, header tabel, placeholder, empty state, dan toast message).
- **Penggunaan Hook**:
  ```tsx
  import { useTranslation } from '@/hooks/useTranslation'
  const { t } = useTranslation()
  ```
- **Kamus Terjemahan**: Berada di `src/lib/i18n/id.json` dan `src/lib/i18n/en.json`. Selalu tambahkan key baru di kedua file secara berpasangan.

---

## 3. 🧭 Standar Hierarki Breadcrumbs ERP (3-Level)

Setiap halaman yang menggunakan `<PageHeader>` **WAJIB** menyediakan breadcrumb 3-level menggunakan terjemahan `t(...)` dan konstanta `ROUTES`:

```tsx
breadcrumbs={[
  { label: t('module.finance'), path: ROUTES.BILLING },          // Level 1: Modul ERP + Root Path
  { label: t('nav.billing') },                                    // Level 2: Domain/Fitur Utama
  { label: t('nav.billingList') },                                // Level 3: Tampilan / Sub-page
]}
```

---

## 4. 📁 ROUTES — Konstanta Navigasi (`src/lib/constants.ts`)

**DILARANG** navigasi dengan string hardcode. Selalu gunakan `ROUTES` dari `src/lib/constants.ts`.

Daftar rute aktif:
- **Auth**: `ROUTES.LOGIN`, `ROUTES.REGISTER`
- **Overview**: `ROUTES.DASHBOARD`
- **Logistics**:
  - `ROUTES.SHIPMENTS`, `ROUTES.SHIPMENTS_LIST`, `ROUTES.SHIPMENT_DETAIL(id)`
  - `ROUTES.SHIPMENT_BATCHES`, `ROUTES.SHIPMENT_BATCHES_LIST`
  - `ROUTES.DELIVERY_ORDERS`, `ROUTES.DELIVERY_ORDERS_LIST`, `ROUTES.DELIVERY_DETAIL(id)`
  - `ROUTES.DELIVERY_PRINT(id, doc?)`
- **Finance**:
  - `ROUTES.BILLING`, `ROUTES.BILLING_LIST`, `ROUTES.BILLING_TARGET`, `ROUTES.BILLING_DETAIL(id)`
  - `ROUTES.BILLING_PRINT(id, mode?)` *(mode: 'pdf' | 'matrix')*
  - `ROUTES.BILLING_REPORT_DESIGNER`
  - `ROUTES.BILLING_VALIDATION_SUMMARY`, `ROUTES.BILLING_VALIDATION_LIST`, `ROUTES.BILLING_VALIDATION_DETAIL(id)`
  - `ROUTES.PRICE_LIST`, `ROUTES.PRICE_LIST_LOOKUP`, `ROUTES.PRICE_LIST_UPLOAD`, `ROUTES.PRICE_LIST_HISTORY`, `ROUTES.PRICE_LIST_DETAIL(id)`
  - `ROUTES.CUSTOMER_PRICE_LIST`, `ROUTES.CUSTOMER_PRICE_LIST_DETAIL(custCode)`, `ROUTES.CUSTOMER_PRICE_LIST_UPLOAD`, `ROUTES.CUSTOMER_PRICE_LIST_LOOKUP`
  - `ROUTES.COMMODITY_MAPPING`
- **Master Data**: `ROUTES.CUSTOMERS`, `ROUTES.CUSTOMERS_TIER`
- **Admin**: `ROUTES.USERS`, `ROUTES.ROLES`
- **User**: `ROUTES.PROFILE`

---

## 5. 🚫 Anti-Pattern (DILARANG KERAS)

### Backend
- ❌ `new PrismaClient()` → ✅ `import { prisma } from '@/config/database'`
- ❌ `console.log(...)` → ✅ `import { logger } from '@/config/logger'`
- ❌ `process.env.VAR` → ✅ `import { ENV } from '@/config/env'`
- ❌ `c.json({ ... })` manual → ✅ `successResponse` / `errorResponse` dari `src/utils/response.ts`
- ❌ Hitung pagination manual → ✅ `buildPagination` / `parsePagination`
- ❌ Query Prisma tanpa fallback/retry pada agregasi/dashboard → ✅ pembungkus `safeQuery`
- ❌ Mengambil `fdCustName` dari tabel denormalisasi → ✅ WAJIB master `tbCustomers.fdCustName`

### Frontend
- ❌ Ambil token via `localStorage` langsung → ✅ `useAuthStore().token`
- ❌ Buat state `page`/`limit` manual → ✅ `usePagination()` (`src/hooks/usePagination.ts`)
- ❌ `setTimeout` manual untuk debounce search → ✅ `useDebounce()` (`src/hooks/useDebounce.ts`)
- ❌ Format angka/tanggal bawaan JS → ✅ gunakan utilitas terpusat dari `src/lib/utils.ts` (`formatDate`, `formatDateTime`, `formatCurrency`, `formatCompactRupiah`, `formatNumber`, `formatDecimal`, `formatM3`, `formatWeight`, `cn`)
- ❌ Format volume kubikasi M³ dengan < 4 desimal atau toFixed() manual → ✅ WAJIB 4 digit desimal (`formatDecimal(m3, 4)` atau `formatM3(m3)`)
- ❌ Navigasi hardcode string → ✅ konstanta `ROUTES` (`src/lib/constants.ts`)
- ❌ Panggil axios langsung di komponen → ✅ method service domain di `src/features/<domain>/services/`
- ❌ Buat tag `<table>` manual → ✅ `<Table>` dari `src/components/ui/`
- ❌ Warna HEX hardcoded di CSS → ✅ CSS variable (e.g. `var(--color-primary)`)
- ❌ Fullscreen spinner saat initial load → ✅ skeleton wireframe `.skeleton-shimmer`
- ❌ Spinner bulat / inline spinner JSX (`animate-spin`) untuk halaman → ✅ skeleton shimmer
- ❌ Tombol aktif solid putih (`bg-white`) di dark mode → ✅ outline / transparent border
- ❌ Badge solid terang (`bg-gray-100`, `bg-blue-100`) di dark mode → ✅ outline border semantik
- ❌ Highlight tabel solid terang di dark mode → ✅ `bg-blue-500/10` dan `hover:bg-[var(--color-neutral)]/40`
- ❌ `alert()` bawaan browser → ✅ `toastStore` (`src/stores/toastStore.ts`)
- ❌ Interface duplikat berulang kali → ✅ sentralisasi di `src/features/<domain>/types/`

---

## 6. 📏 Standar Format Angka & Presisi Satuan Fisik
- **Volume Kubikasi (M³)**: **WAJIB 4 DIGIT DESIMAL** (`formatDecimal(m3, 4)` atau helper `formatM3(m3)`). Nilai presisi ini krusial karena selisih $0.0001\text{ m}^3$ pada kargo laut berdampak finansial dan mempengaruhi matching validasi invoice.
- **Berat Fisik / Timbangan (KG)**: 2 digit desimal (`formatDecimal(kg, 2)` atau `formatWeight(kg)`).
- **Mata Uang (Rupiah)**: `formatCurrency(val)` (2 digit desimal).
- **Kuantitas Koli (Qty)**: `formatNumber(qty)` (tanpa desimal / integer).

