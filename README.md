# mshipping — Freight & Logistics Management System

Sistem manajemen logistik, pengiriman barang (freight forwarding), batch marking, validasi billing, audit tarif kargo, dan analitik operasional berbasis web.

---

## 🚀 Fitur Utama

- **Billing & Freight Validation**:
  - Validasi otomatis tagihan berdasarkan kategori komoditas, berat, volume (M3), dan nominal.
  - Multi-view: Analisis Trace Detail & Paket Invoice (Grouping per Container/Batch).
  - Riwayat penyesuaian tarif, audit selisih harga, serta identifikasi bill transport.
- **Shipment & Batch Marking**:
  - Manajemen kontainer dan batch marking pengiriman dari berbagai cabang (Guangzhou, Yiwu, dll.).
  - Tracking status pengiriman, volume M3, dan koli barang secara real-time.
- **Delivery Orders (DO)**:
  - Manajemen Surat Jalan / Delivery Order terintegrasi.
- **Customer & Tariff Management**:
  - Pengelolaan data pelanggan, tier harga, dan custom price list per komoditas.
- **Multi-Theme & Responsive UI**:
  - Dukungan tema dinamis (`Heritage`, `Ocean`, `Emerald`, `Amber`, dan `Midnight Dark Mode`).
  - Desain sepenuhnya responsif untuk resolusi Desktop maupun Mobile.
  - Sistem dual bahasa (Bahasa Indonesia & English).

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + TypeScript + Vite
- **Routing & State**: React Router 7 + Zustand + TanStack React Query
- **Styling**: Tailwind CSS + Lucide Icons + Recharts
- **Arsitektur**: Feature-Driven Architecture (`src/features/<domain>/`)

### Backend
- **Runtime**: [Bun](https://bun.com)
- **Web Framework**: [Hono.js](https://hono.dev)
- **Database ORM**: Prisma ORM v6
- **Database**: Microsoft SQL Server (MS SQL)
- **Dokumentasi & Validasi**: Hono Swagger UI + Zod

---

## 📁 Struktur Repositori

```text
shipping/
├── backend/                  # Backend REST API (Hono.js + Bun)
│   ├── prisma/               # Skema Prisma & database seeds
│   └── src/
│       ├── config/           # Database, logger, environment
│       ├── middleware/       # Auth, rate limiter, error handler
│       ├── modules/          # Domain modul (billing, shipments, price-list, dll.)
│       └── utils/            # Helper & standard response
├── frontend/                 # Web UI (React 19 + Vite + TypeScript)
│   └── src/
│       ├── components/ui/    # Reusable atomic UI components
│       ├── features/         # Feature modules (billing, shipments, customers, dll.)
│       ├── hooks/            # Custom hooks global
│       ├── lib/              # i18n dictionary, utilities, constants
│       └── stores/           # Zustand stores (auth, UI theme, toast)
└── README.md
```

---

## ⚙️ Panduan Instalasi & Menjalankan Aplikasi

### Prasyarat
- [Bun](https://bun.com) (v1.1+ / v1.3+)
- [Node.js](https://nodejs.org/) (opsional jika menggunakan bun)
- Akses ke Microsoft SQL Server database

---

### 1. Setup Backend

1. Masuk ke direktori backend:
   ```bash
   cd backend
   ```
2. Pasang dependensi:
   ```bash
   bun install
   ```
3. Konfigurasi Environment:
   Salin `.env.example` ke `.env` (atau sesuaikan konfigurasi koneksi MS SQL Server Anda):
   ```env
   PORT=3000
   DATABASE_URL="sqlserver://<HOST>:<PORT>;database=<DB_NAME>;user=<USER>;password=<PASS>;encrypt=false;trustServerCertificate=true"
   JWT_SECRET="your-jwt-secret-key"
   ```
4. Generate Prisma Client:
   ```bash
   bun x prisma generate
   ```
5. Jalankan server development:
   ```bash
   bun run dev
   ```
   API akan aktif di `http://localhost:3000`. Dokumentasi Swagger dapat diakses di `http://localhost:3000/docs`.

---

### 2. Setup Frontend

1. Masuk ke direktori frontend:
   ```bash
   cd frontend
   ```
2. Pasang dependensi:
   ```bash
   bun install
   # atau npm install
   ```
3. Konfigurasi Environment:
   Pastikan URL backend sudah sesuai di `.env` frontend:
   ```env
   VITE_API_URL=http://localhost:3000/api
   ```
4. Jalankan Vite Development Server:
   ```bash
   bun run dev
   ```
   Aplikasi dapat diakses di browser melalui `http://localhost:5173`.

5. Build untuk Produksi:
   ```bash
   bun run build
   ```

---

## 🔒 Konvensi & Lisensi

Proyek ini dikembangkan secara internal untuk manajemen pengiriman & operasional logistik kargo.
Seluruh hak cipta dilindungi undang-undang.
