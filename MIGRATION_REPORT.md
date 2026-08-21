# Laporan Migrasi Struktur Folder Frontend mshipping

## 1. Daftar File yang Dipindahkan (Per Fase)

### FASE 1 — Fitur `shipments`
- `src/pages/ShipmentsPage.tsx` ➔ `src/features/shipments/pages/ShipmentsPage.tsx`
- `src/pages/ShipmentsListPage.tsx` ➔ `src/features/shipments/pages/ShipmentsListPage.tsx`
- `src/pages/ShipmentsDashboardPage.tsx` ➔ `src/features/shipments/pages/ShipmentsDashboardPage.tsx`

### FASE 2 — Fitur `shipment-batches`
- `src/pages/ShipmentBatchesDashboardPage.tsx` ➔ `src/features/shipment-batches/pages/ShipmentBatchesDashboardPage.tsx`
- `src/pages/ShipmentBatchesListPage.tsx` ➔ `src/features/shipment-batches/pages/ShipmentBatchesListPage.tsx`

### FASE 3 — Fitur `delivery-orders`
- `src/pages/DeliveryOrdersPage.tsx` ➔ `src/features/delivery-orders/pages/DeliveryOrdersPage.tsx`
- `src/pages/DeliveryDetailPage.tsx` ➔ `src/features/delivery-orders/pages/DeliveryDetailPage.tsx`

### FASE 4 — Fitur `billing`
- `src/pages/BillingPage.tsx` ➔ `src/features/billing/pages/BillingPage.tsx`
- `src/pages/BillingDetailPage.tsx` ➔ `src/features/billing/pages/BillingDetailPage.tsx`

### FASE 5 — Fitur `customers`
- `src/pages/CustomersPage.tsx` ➔ `src/features/customers/pages/CustomersPage.tsx`

### FASE 6 — Fitur `auth`
- `src/pages/LoginPage.tsx` ➔ `src/features/auth/pages/LoginPage.tsx`
- `src/pages/RegisterPage.tsx` ➔ `src/features/auth/pages/RegisterPage.tsx`

### FASE 7 — Fitur `user-management`
- `src/pages/UserManagementPage.tsx` ➔ `src/features/user-management/pages/UserManagementPage.tsx`
- `src/pages/RoleManagementPage.tsx` ➔ `src/features/user-management/pages/RoleManagementPage.tsx`

### FASE 9 — Finalisasi
- Semua file di `src/routes/*` (AdminGuard, PermissionGuard, ProtectedRoute, DefaultRouteRedirect, AppRouter) telah **digabungkan** ke dalam `src/app/router.tsx` tanpa mengubah logika routing.
- Path import di dalam page maupun routing telah disesuaikan menjadi `@/features/<domain>`.

---

## 2. File yang Ragu-Ragu dan Tidak Dipindahkan
- `src/pages/DashboardPage.tsx` masih tersisa di folder `src/pages/` karena belum ada instruksi spesifik untuk memindahkannya ke dalam `features/`. Butuh arahan lebih lanjut apakah akan dibuatkan fitur khusus `dashboard` atau diletakkan di tempat lain.

---

## 3. Hasil Build & Lint Terakhir

### Hasil `npm run build`
```
> tsc -b && vite build

vite v8.1.0 building client environment for production...
transforming...✓ 671 modules transformed.
rendering chunks...
computing gzip size...
...
✓ built in 1.66s
```
**Status: BERHASIL (Tanpa Error TypeScript)**

### Hasil `npm run lint` (Oxlint)
```
Found 10 warnings and 0 errors.
```
**Status: BERHASIL (Hanya peringatan dari linter tentang missing dependency array di `useEffect` dan export component).**

---

## 4. Daftar Pelanggaran Anti-Pattern `AGENTS.md`
Sepanjang migrasi (memindahkan file), tidak ditemukan pelanggaran fatal seperti pemanggilan `axios` secara langsung atau penggunaan `localStorage` / `alert()`. Semua page terpantau menggunakan SSOT yang sudah ada (misalnya `@/api/endpoints` dan `@/stores/authStore`).

*Catatan Linter (bukan dari AGENTS.md, namun patut diperhatikan):*
- Peringatan `react-hooks/exhaustive-deps` (missing dependency) di beberapa page seperti `UserManagementPage.tsx`, `BillingDetailPage.tsx`, dan `DeliveryDetailPage.tsx`.
- Peringatan `react(only-export-components)` di `src/components/shipments/ShipmentStatusBadge.tsx` karena meng-eksport konstanta `STATUS_STYLES` selain komponen React (fitur Fast Refresh Vite terganggu). Hal ini disarankan untuk dipisah ke file `constants` terpisah atau dihapus export-nya jika hanya dipakai internal komponen.

---

## 5. Konfirmasi Eksplisit

> **"Tidak ada file di `api/endpoints/`, `types/`, `components/ui/`, `components/<domain>/`, atau `stores/` yang berpindah lokasi selama migrasi ini. Semua struktur Single Source of Truth (SSOT) yang diatur dalam AGENTS.md tetap utuh pada lokasinya."**
