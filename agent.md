# Aturan Agen (Agent Rules) - mshipping

Dokumen ini berisi panduan, konvensi, dan aturan operasional wajib bagi AI Agent (seperti Antigravity) saat berinteraksi dengan proyek **mshipping**. Aturan ini dirangkum dari spesifikasi arsitektur dan checklist proyek.

## 🏗️ Arsitektur Proyek
- **Frontend**: React 19 + Vite + TypeScript (Berada di folder `frontend/`)
- **Backend**: Hono.js + Bun + Prisma ORM + MS SQL Server (Berada di folder `backend/`)
- **Komunikasi**: REST API via Axios.

## 🔑 Konvensi Penamaan (Naming Conventions)
Agen WAJIB mematuhi format penamaan berikut:
- **Backend file**: `kebab-case` (contoh: `auth.service.ts`)
- **Backend function**: `camelCase` (contoh: `getCustomerById()`)
- **Frontend component**: `PascalCase` (contoh: `CustomerTable.tsx`)
- **Frontend hook**: `camelCase` dengan awalan `use` (contoh: `usePagination()`)
- **Zustand store**: `camelCase` dengan akhiran `Store` (contoh: `authStore.ts`)
- **API endpoint const**: `UPPER_SNAKE` (contoh: `CUSTOMERS_API`)
- **CSS class**: `kebab-case` (contoh: `.data-table`)
- **Prisma model**: `PascalCase` sesuai nama tabel (contoh: `TbCustomers`)

## 🚫 Anti-Pattern (DILARANG KERAS)

### Backend
- ❌ `new PrismaClient()` → ✅ Gunakan `import { prisma } from '@/config/database'`
- ❌ `console.log(...)` → ✅ Gunakan `import { logger } from '@/config/logger'`
- ❌ `process.env.VAR` → ✅ Gunakan `import { ENV } from '@/config/env'`
- ❌ `c.json({ ... })` manual → ✅ Gunakan `successResponse` / `errorResponse` dari `src/utils/response.ts`
- ❌ Hitung pagination manual → ✅ Gunakan `buildPagination` / `parsePagination`

### Frontend
- ❌ Ambil token via `localStorage` langsung → ✅ Gunakan `useAuthStore().token`
- ❌ Buat state manual untuk page/limit → ✅ Gunakan `usePagination()`
- ❌ `setTimeout` manual untuk debounce search → ✅ Gunakan `useDebounce()`
- ❌ Format angka/tanggal bawaan JS → ✅ Gunakan `formatDate`, `formatCurrency`, `formatNumber` dari `src/lib/utils.ts`
- ❌ Navigasi hardcode string → ✅ Gunakan konstanta dari `ROUTES` (`src/lib/constants.ts`)
- ❌ Panggil axios langsung di komponen → ✅ Gunakan method dari folder `src/api/endpoints/`
- ❌ Buat tag `<table>` manual → ✅ Gunakan komponen `<Table>` dari `src/components/ui/`
- ❌ Warna HEX hardcoded di CSS → ✅ Gunakan CSS variable bawaan (contoh: `var(--color-primary)`)

## 📁 Single Source of Truth (Gunakan yang Sudah Ada)
Sebelum membuat utility baru, pastikan untuk menggunakan yang berikut ini:

- **Frontend UI Components** (`src/components/ui/`):
  Gunakan `<Button>`, `<Badge>`, `<Table>`, `<Pagination>`, `<SearchBar>`, `<Modal>`, `<Card>`, `<LoadingSpinner>`, `<EmptyState>`. Jangan buat komponen redundan.
- **Frontend Utilities** (`src/lib/utils.ts`):
  Gunakan fungsi `cn()` untuk classnames, `formatDate()`, `formatCurrency()`.
- **Backend Auth**: Semua throw error wajib ditangani oleh `errorHandler.ts` middleware.
- **Notifikasi/Alert**: Gunakan `toastStore`. DILARANG menggunakan `alert()` bawaan browser.

## 🛑 Keputusan yang WAJIB Dikonfirmasi ke User (Owner)
Agen HARUS BERHENTI dan bertanya kepada user sebelum mengasumsikan:
1. **Database schema yang tidak diketahui**: Nama kolom tabel yang existing, tipe primary key (INT/UUID/String), atau relasi foreign key yang belum jelas.
2. **Kebutuhan UI/UX**: Kolom apa saja yang harus ditampilkan di tabel list data, kolom apa saja yang bisa di-search, dan nilai enum/status yang valid.
3. **Data sensitif**: Membuka endpoint yang mungkin mengekspos data rahasia tanpa filter default.

---
*Catatan Sistem: File ini berfungsi sebagai referensi instruksi bagi AI Agent untuk menjaga konsistensi kode sesuai standar proyek.*
