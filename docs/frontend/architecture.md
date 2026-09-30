# 🏗️ Frontend Architecture, Routing & Deployment — M-Shipping

Dokumen ini menjelaskan fondasi arsitektur, konfigurasi jaringan, pohon rute, sistem proteksi permission guards, serta alur build dan deployment web frontend M-Shipping.

---

## 1. Stack Teknologi & Runtime
- **Framework & Runtime**: React 19.2 + TypeScript 6.0 + Vite 8.1
- **Routing**: `react-router-dom` v7 (Client-side routing dengan lazy loading di `src/app/router.tsx`)
- **Struktur Folder**: **Feature-Driven Architecture** (`src/features/<domain>/`)
- **State Management**:
  - Global State: Zustand v5 (`authStore`, `themeStore`, `toastStore`, `uiStore`, `langStore`, `reportDesignerStore`)
  - Server State & Caching: TanStack React Query v5
- **Komunikasi REST**: Axios via `src/api/client.ts` dengan request/response interceptors
- **Styling**: Tailwind CSS v3 + CSS Variables dinamis (`[data-theme]`)
- **Visualisasi Grafik**: Recharts v3 (Responsive Bar & Line Charts ramah multi-tema)
- **Ekspor Dokumen**:
  - `jspdf` + `html2canvas`: Render cetak invoice grafis & PDF
  - `xlsx`: Parsing import Excel tarif dan ekspor data kargo
- **Pustaka UI Primitif**: Sentralisasi di `src/components/ui/` (lihat [`ui-components.md`](./ui-components.md))
- **Dual-Bahasa (i18n)**: Sistem kamus bilingual mandiri (`src/lib/i18n/id.json` & `en.json`) via `useTranslation()`
- **App Logo & Favicon**: Logo `Package` Lucide di `Sidebar.tsx`, `public/favicon.svg`, dan `public/favicon.ico`.

---

## 2. Konfigurasi Jaringan & Keamanan
- **Environment File**: `frontend/.env`
  ```env
  VITE_API_BASE_URL="http://36.93.22.142:3010/mshipping/api"
  VITE_APP_BASE="/mshipping"
  ```
- **Token Injection**: Axios interceptor menyuntikkan `Authorization: Bearer <token>` otomatis dari `localStorage.getItem('token')`.
- **Auto Logout (HTTP 401)**: Axios response interceptor mendeteksi HTTP 401 dan otomatis membersihkan token serta mengarahkan ke `/mshipping/login` (kecuali pada saat request login gagal).
- **Single Source of Truth Customer**: Seluruh nama customer mengutamakan master data resmi `tbCustomers.fdCustName` (gunakan helper `displayCustName` dari `@/lib/utils`).

---

## 3. Struktur Routing Web & Sistem Hak Akses (`src/app/router.tsx`)

### A. Pohon Direktori Routing
```text
/mshipping
├── /login                                    # Halaman Masuk Staf
├── /register                                 # Pendaftaran Pengguna Baru
└── (ProtectedRoute)                          # Wajib JWT Token aktif
    ├── (AppLayout)                           # Shell ERP (Sidebar, Topbar, Content Area)
    │   ├── /overview/dashboard               # Pusat Metrik & Statistik Operasional
    │   ├── /profile                          # Pengaturan Profil, Sandi, Tema & Bahasa
    │   │
    │   ├── (PermissionGuard)                 # Validasi Hak Akses Per-Role / Per-Path
    │   │   ├── /logistics/shipments          # Dashboard Analitik Shipment
    │   │   ├── /logistics/shipments/list     # Tabel Resi & Tracking
    │   │   ├── /logistics/shipment-batches   # Dashboard Kontainer & Batch Marking
    │   │   ├── /logistics/shipment-batches/list # Tabel Batch Marking & Manifest
    │   │   ├── /logistics/shipment-batches/marking-size # Audit Ukuran (M³ Laut & Kg Udara)
    │   │   ├── /logistics/delivery-orders    # Dashboard Surat Jalan
    │   │   ├── /logistics/delivery-orders/inventory # Inventori Gudang & Buat SJ
    │   │   ├── /logistics/delivery-orders/list # Tabel Riwayat Pengiriman SJ
    │   │   ├── /logistics/delivery-orders/:id # Rincian Muatan Surat Jalan
    │   │   ├── /finance/billing              # Dashboard Keuangan
    │   │   ├── /finance/billing/target       # Analisis Target Penagihan
    │   │   ├── /finance/billing/list         # Tabel Faktur / Invoice Tagihan
    │   │   ├── /finance/billing/:id          # Rincian Invoice
    │   │   ├── /finance/billing/validation/list # Audit Validasi (M³ vs KG)
    │   │   ├── /finance/billing/validation/:id  # Bedah Komparasi Validasi
    │   │   ├── /finance/billing/pairing-local-charge # Matching Local Charge Excel
    │   │   ├── /finance/price-list           # Master Tarif Rute & Histori
    │   │   ├── /finance/price-list/lookup    # Kalkulator Tarif Global
    │   │   ├── /finance/price-list/upload    # Upload Excel Master Tarif
    │   │   ├── /finance/price-list/uploads/:id # Diff Upload Tarif Umum
    │   │   ├── /finance/customer-price-list  # Direktori Tarif Khusus Customer
    │   │   ├── /finance/customer-price-list/lookup # Pencarian Tarif Customer
    │   │   ├── /finance/customer-price-list/upload # Upload Excel Tarif Customer
    │   │   ├── /finance/customer-price-list/:custCode # Riwayat & Tarif Aktif Customer
    │   │   ├── /finance/commodity-mapping    # Normalisasi Komoditas & Tier 0
    │   │   ├── /finance/cashier              # Kasir Resmi (RR-) & Sementara (TR-)
    │   │   ├── /finance/cashier/:id          # Meja Kerja Kasir (Zero-Diff Balancing)
    │   │   ├── /finance/wallet               # Customer Wallet & Saldo Deposit
    │   │   └── /master/customers             # Direktori Master Pelanggan & Tier
    │   │
    │   └── (AdminGuard)                      # Khusus Role 'admin'
    │       ├── /admin/users                  # Manajemen Akun Staf
    │       ├── /admin/roles                  # Manajemen Matriks Permission Role
    │       └── /finance/billing/report-designer # Studio Desain Layout Invoice
    │
    └── (Tanpa AppLayout / Standalone View)
        ├── /finance/billing/:id/print        # Cetak Invoice (Dot Matrix & Laser)
        └── /logistics/delivery-orders/:id/print # Cetak Surat Jalan Continuous Form
```

### B. Mekanisme Route Guards
1. **`ProtectedRoute`**: Memeriksa `isAuthenticated` dari `useAuthStore`. Jika belum login, redirect ke `ROUTES.LOGIN`.
2. **`PermissionGuard`**: Role `admin` atau permission wildcard `/*` memiliki akses penuh. Sub-rute validasi penagihan memerlukan izin validasi eksplisit. Rute lain diverifikasi kecocokannya dengan array `user.permissions`. Jika tidak diizinkan, dialihkan ke `DefaultRouteRedirect`.
3. **`AdminGuard`**: Memverifikasi `user.role === 'admin'`. Jika bukan admin, dialihkan ke `ROUTES.DASHBOARD`.
4. **`DefaultRouteRedirect`**: Mengarahkan staf ke `user.defaultRoute` atau rute pertama yang diizinkan dalam profilnya.

---

## 4. Prosedur Build, Nginx Deployment & Troubleshooting

### A. Perintah Build Produksi
```bash
cd c:\shipping\frontend
bun run build
# Mengeksekusi: tsc -b && vite build
# Hasil terkompilasi di: frontend/dist/
```

### B. Integrasi Nginx Web Server (On-Premise)
Frontend disajikan di port 80 dengan path root `/mshipping/`:
```nginx
location /mshipping {
    alias C:/shipping/frontend/dist;
    index index.html;
    try_files $uri $uri/ /mshipping/index.html;
}

location /mshipping/api/ {
    proxy_pass http://127.0.0.1:3010/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```
> **Penting**: Direktif `try_files $uri $uri/ /mshipping/index.html;` mutlak diperlukan agar browser refresh pada rute client-side (SPA) tidak menghasilkan error **HTTP 404 Not Found**.

### C. Jalur Distribusi APK Mobile
Direktori statis `frontend/dist/` dan `frontend/public/` melayani unduhan APK Android:
- URL Publik: `http://36.93.22.142/mshipping/mshipping.apk`
