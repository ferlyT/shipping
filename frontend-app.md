# 💻 Dokumentasi Lengkap Aplikasi Web Frontend M-Shipping (Arsitektur, Logika & Integrasi Endpoint)

Dokumen ini menjelaskan secara menyeluruh arsitektur, seluruh modul halaman, logika bisnis, hierarki permission, manajemen state, serta data dari setiap endpoint API backend pada aplikasi web **Frontend M-Shipping** (React 19 / Vite / TypeScript / Tailwind CSS / Zustand / React Query / Hono.js Backend).

---

## 🏗️ 1. Arsitektur Teknis & Konfigurasi Jaringan

### Stack Teknologi
- **Framework & Runtime**: React 19.2 + TypeScript 6.0 + Vite 8.1
- **Routing**: `react-router-dom` v7 (Client-side routing dengan lazy loading & route guards di `src/app/router.tsx`)
- **Arsitektur Direktori**: **Feature-Driven Architecture** (`src/features/<domain>/`)
- **State Management**:
  - Global State: Zustand v5 (`authStore`, `themeStore`, `toastStore`, `uiStore`, `langStore`, `reportDesignerStore`)
  - Server State & Caching: TanStack React Query v5
- **Komunikasi REST**: Axios via `src/api/client.ts` dengan request/response interceptors
- **Styling & Desain Sistem**: Tailwind CSS v3 + CSS Variables dinamis (`[data-theme]`)
- **Visualisasi & Grafik**: Recharts v3 (Responsive Bar & Line Charts ramah multi-tema)
- **Ekspor Dokumen**:
  - `jspdf` + `html2canvas`: Render cetak invoice grafis & PDF
  - `xlsx`: Parsing import Excel tarif dan ekspor data pairing local charge
- **Pustaka Komponen UI Primitif Terpusat**: Terstandarisasi di `src/components/ui/` (`Modal`, `StatCard`, `StatusBadge`, `ConfirmModal`, `Table`, `Pagination`, dll) sebagai Single Source of Truth antarmuka yang ramah 5 tema dinamis dan Midnight Dark Mode.
- **Dual-Bahasa (i18n)**: Sistem kamus bilingual mandiri (`src/lib/i18n/id.json` & `en.json`) via custom hook `useTranslation()`
- **Identitas Visual & Favicon**:
  - **App Logo**: Ikon kotak paket 3D Lucide `Package` (`w-8 h-8 rounded-lg bg-[var(--color-primary)] text-[var(--color-surface)]`) terpasang pada brand header navigasi sidebar (`Sidebar.tsx`) dengan teks `M-Shipping`.
  - **Favicon Terpadu**: Berkas `public/favicon.svg` (vektor scalable berbasis Lucide `Package` dengan latar rounded slate `#1e293b` $\to$ `#0f172a` dan border kontras ramah tab gelap/terang) serta `public/favicon.ico` multi-resolusi (16, 32, 48, 64, 128, 256 px) disinkronkan 100% dengan logo aplikasi di `index.html`.

### Konfigurasi Jaringan & Keamanan
- **Environment File**: `frontend/.env`
  - `VITE_API_BASE_URL="http://36.93.22.142:3010/mshipping/api"`
  - `VITE_APP_BASE="/mshipping"`
- **Token Injection**: Axios request interceptor otomatis menyuntikkan header:
  `Authorization: Bearer <token>` dari `localStorage.getItem('token')`.
- **Auto Logout & Penanganan 401**:
  - Axios response interceptor mendeteksi HTTP 401 dan otomatis membersihkan token serta mengarahkan ke `/mshipping/login` (kecuali error berasal dari request login gagal).
- **Single Source of Truth Customer**:
  - Seluruh nama customer wajib mengutamakan master data resmi `tbCustomers.fdCustName`. Jika SP / query pihak ketiga mengembalikan nama dari tabel harga/entry list, nama tersebut ditimpa (*override*) dengan data `tbCustomers`.

---

## 📑 2. Struktur Routing Web & Sistem Hak Akses (Permission System)

### A. Pohon Direktori Routing (`src/app/router.tsx`)
```text
/mshipping
├── /login                                    # Halaman Masuk Staf
├── /register                                 # Pendaftaran Pengguna Baru
└── (ProtectedRoute)                          # Wajib memiliki JWT Token aktif
    ├── (AppLayout)                           # Shell ERP (Sidebar, Topbar, Content Area)
    │   ├── /overview/dashboard               # Pusat Metrik & Statistik Operasional
    │   ├── /profile                          # Pengaturan Profil, Sandi, Tema & Bahasa
    │   │
    │   ├── (PermissionGuard)                 # Validasi Hak Akses Per-Role / Per-Path
    │   │   ├── /logistics/shipments          # Dashboard Analitik Shipment & Komoditas
    │   │   ├── /logistics/shipments/list     # Tabel Data Resi & Pelacakan Dimensi Fisik
    │   │   ├── /logistics/shipment-batches   # Dashboard Kontainer & Batch Marking
    │   │   ├── /logistics/shipment-batches/list # Tabel Batch Marking & Manifest Muatan
    │   │   ├── /logistics/shipment-batches/marking-size # Audit Ukuran & Tonase per Marking (M³ Laut & Kg Udara)
    │   │   ├── /logistics/delivery-orders    # Dashboard Surat Jalan & Armada Lapangan
    │   │   ├── /logistics/delivery-orders/inventory # Inventori Stok Kargo Gudang & Pembuatan SJ
    │   │   ├── /logistics/delivery-orders/list # Tabel Pengiriman Surat Jalan
    │   │   ├── /logistics/delivery-orders/:id # Rincian Muatan Surat Jalan
    │   │   ├── /finance/billing              # Dashboard Keuangan & Tren Piutang
    │   │   ├── /finance/billing/target       # Analisis Target Penagihan & Audit Tarif
    │   │   ├── /finance/billing/list         # Tabel Faktur / Invoice Tagihan
    │   │   ├── /finance/billing/:id          # Rincian Invoice & Item Detail Transaksi
    │   │   ├── /finance/billing/validation/list # Audit Validasi (M3 vs KG, Overweight)
    │   │   ├── /finance/billing/validation/:id  # Bedah Komparasi Validasi Invoice
    │   │   ├── /finance/billing/pairing-local-charge # Matching Otomatis Local Charge
    │   │   ├── /finance/price-list           # Master Tarif Rute & Histori Efektif
    │   │   ├── /finance/price-list/lookup    # Kalkulator Pencarian Tarif Global
    │   │   ├── /finance/price-list/upload    # Upload Excel Master Tarif Umum
    │   │   ├── /finance/price-list/uploads/:id # Detail & Diff Upload Tarif Umum
    │   │   ├── /finance/customer-price-list  # Direktori Tarif Khusus Pelanggan
    │   │   ├── /finance/customer-price-list/lookup # Pencarian Tarif Khusus Customer
    │   │   ├── /finance/customer-price-list/upload # Upload Excel Tarif Khusus
    │   │   ├── /finance/customer-price-list/:custCode # Riwayat & Tarif Aktif Customer
    │   │   ├── /finance/customer-price-list/uploads/:id # Diff Upload Excel Customer
    │   │   ├── /finance/commodity-mapping    # Normalisasi Nama Komoditas ke Master
    │   │   ├── /finance/cashier              # Registrasi Kasir Resmi (RR-) & Sementara (TR-)
    │   │   ├── /finance/cashier/:id          # Meja Kerja Kasir (Zero-Diff Balancing & Faktur)
    │   │   ├── /finance/wallet               # Customer Wallet & Saldo Deposit Pelanggan (Buku Besar)
    │   │   └── /master/customers             # Direktori Master Pelanggan & Tier
    │   │
    │   └── (AdminGuard)                      # Khusus Pengguna Berperan 'admin'
    │       ├── /admin/users                  # Manajemen Akun Staf & Link Karyawan
    │       ├── /admin/roles                  # Manajemen Matriks Permission Role
    │       └── /finance/billing/report-designer # Studio Visual Layout Invoice
    │
    └── (Tanpa AppLayout / Standalone View)
        └── /finance/billing/:id/print        # Tampilan Cetak Invoice (Dot Matrix & Laser)
```

### B. Mekanisme Route Guards
1. **`ProtectedRoute`**: Memeriksa `isAuthenticated` dari `useAuthStore`. Jika belum login, redirect ke `ROUTES.LOGIN`.
2. **`PermissionGuard`**:
   - Pengguna dengan role `admin` atau memiliki permission wildcard `/*` diberikan akses penuh.
   - Sub-rute validasi penagihan (`/mshipping/finance/billing/validation/*`) memerlukan permission validasi eksplisit.
   - Rute lain diverifikasi apakah cocok dengan daftar izin array `user.permissions`. Jika tidak memiliki hak akses, diarahkan ke `DefaultRouteRedirect`.
3. **`AdminGuard`**: Memverifikasi `user.role === 'admin'`. Jika bukan admin, dialihkan ke `ROUTES.DASHBOARD`.
4. **`DefaultRouteRedirect`**: Mengarahkan staf non-admin ke `user.defaultRoute` (rute default yang dikonfigurasi admin) atau rute pertama yang diizinkan dalam profilnya.

---

## 🔍 3. Rincian Detail Modul Demi Modul

---

### 3.1. Modul Autentikasi (`src/features/auth/`)

#### A. Halaman Login (`LoginPage.tsx`)
- **Tujuan & Alur**: Memvalidasi kredensial pengguna, menyimpan token JWT dan info sesi ke Zustand `authStore` dan `localStorage`.
- **Interaksi**:
  - Form input username & kata sandi dengan validasi required.
  - Opsi *"Ingat Saya"* dan penanganan status akun aktif/pending.
  - Menampilkan toast kesalahan kredensial atau error koneksi server.
- **Endpoint Terkait**:
  - `POST /api/auth/login`
  - **Payload**: `{ "username": "...", "password": "..." }`
  - **Response**: `{ "success": true, "data": { "token": "...", "user": { "id", "username", "fullName", "role", "permissions", "defaultRoute", "fdEmpCode" } } }`

#### B. Halaman Registrasi (`RegisterPage.tsx`)
- **Tujuan & Alur**: Formulir pendaftaran akun pengguna baru. Akun baru berstatus non-aktif (*pending*) hingga diaktifkan oleh Administrator melalui User Management.
- **Endpoint Terkait**:
  - `POST /api/auth/register`
  - **Payload**: `{ "fullName": "...", "username": "...", "password": "..." }`

---

### 3.2. Modul Overview Dashboard (`src/features/dashboard/`)

#### A. Halaman Dashboard (`DashboardPage.tsx`)
- **Tujuan & Alur**: Pusat komando eksekutif terpadu untuk pemantauan kargo logistik, peringatan deviasi SLA, armada pengantaran surat jalan lokal, kesehatan arus kas/validasi tagihan, analitik pangsa muatan cabang asal, serta grafik pergerakan aktivitas 12 bulan terakhir.
- **Komponen Utama**:
  1. **4 Kartu Metrik Utama**:
     - Total Customer (`totalCustomers`)
     - Total Invoice & Nilai Tagihan Terbit (`totalInvoices` & `totalInvoiceAmount`)
     - Surat Jalan / DO (`totalDeliveryOrders`)
     - Total Shipment (`totalShipments`)
  2. **1. Operasional Lapangan & Peringatan Dini (Actionable Alerts)**:
     - **ETA Belum Keluar (ETA Not Exit)**: Batch kontainer/flight yang melewati jadwal kedatangan namun belum keluar dari pelabuhan/gudang (`fdExitDate` null). Dilengkapi breakdown Udara/Laut dan tombol interaktif membuka modal daftar consignee terdampak beserta jumlah hari keterlambatan (*aging*).
     - **Melewati Target SLA (Transit Tertunda)**: Batch dengan waktu tempuh transit (ETD ke ETA) melebihi batas standar SLA rute cabang. Dilengkapi breakdown Udara/Laut dan tombol interaktif membuka modal daftar consignee terdampak beserta durasi vs target transit.
     - **Modal Rincian Consignee**: Dialog popup responsif menampilkan breakdown nama consignee, badge jumlah batch, dan chip kode batch dengan selisih hari keterlambatan / durasi SLA.
  3. **2. Distribusi & Pengantaran Lokal (Delivery Orders Pipeline)**:
     - Pipeline 4 tahap pengiriman lokal:
       - **Dijadwalkan**: Surat jalan terbit (`fdSent` 0 / null dan estimasi mendatang)
       - **Dalam Pengantaran**: Armada dalam perjalanan (`fdSent` 0 / null dan estimasi <= sekarang)
       - **Terkirim**: Barang telah sampai di tujuan penerima (`fdSent = 1`)
       - **Surat Jalan Belum Kembali (Outstanding SJ)**: Surat jalan belum kembali ke kantor (`fdSent = 1` dan `fdKembali` null)
     - Ringkasan akumulasi muatan terdistribusi: Total Koli (`totalPackages`) dan Total Berat (`totalWeight` kg).
     - Tautan cepat langsung menuju modul Surat Jalan (`ROUTES.DELIVERY_ORDERS_LIST`).
  4. **3. Keuangan & Arus Kas (Billing & Cash Flow)**:
     - **Antrean Validasi Tagihan**: Jumlah draft tagihan belum divalidasi beserta akumulasi nominal Rupiah (`draftInvoicesCount` & `draftInvoicesAmount`). Tautan langsung ke `ROUTES.BILLING_VALIDATION_LIST`.
     - **Tagihan Lewat Jatuh Tempo (Overdue)**: Faktur belum lunas yang melewati jangka waktu 30 hari / syarat TOP beserta akumulasi nominal Rupiah (`overdueInvoicesCount` & `overdueInvoicesAmount`).
     - **Omzet Bulan Berjalan**: Total invoice dan nilai Rupiah tagihan yang diterbitkan pada bulan kalender aktif (`monthlyInvoicesCount` & `monthlyRevenue`).
  5. **4. Analitik Jalur Asal (Origin) & Jadwal Kedatangan Mendatang**:
     - **Pangsa Muatan Cabang Asal**: Tabel komparasi cabang (GZ, SG, HK, YW, SH, dll.) menampilkan total resi shipment, rasio Udara vs Laut, volume ($m^3$), dan berat ($kg$) selama 6 bulan terakhir.
     - **Jadwal Kedatangan Mendatang (48-72 Jam)**: Kartu daftar manifest kargo yang diprediksi tiba di pelabuhan/bandara tujuan dalam waktu dekat, lengkap dengan tanggal ETA, badge moda (Udara ✈️ / Laut 🚢), cabang asal, nama consignee, dan gudang tujuan.
  6. **Tren Aktivitas (Grafik Garis 12 Bulan)**:
     - Visualisasi Recharts interaktif multi-tema memperlihatkan pergerakan volume Invoice, Surat Jalan, dan Resi Shipment selama 12 bulan terakhir.
  7. **Riwayat Aktivitas Terkini (Recent Activity)**:
     - 5 Invoice Terkini (Nomor Faktur, Tanggal, Customer, Nilai Tagihan).
     - 5 Surat Jalan Terkini (Nomor DO, Tanggal, Plat Kendaraan, Customer, Marking/No, Koli, Berat).
- **Endpoint Terkait**:
  - `GET /api/dashboard/stats`: Mengembalikan objek terpadu `metrics`, `trends`, `actionableAlerts`, `deliveryStatus`, `financialOverview`, `originAnalytics`, `recentActivity`, dan `chartData`.

---

### 3.3. Modul Shipment & Resi Lapangan (`src/features/shipments/`)

#### A. Halaman Dashboard Shipment (`pages/DashboardPage.tsx`)
- **Tujuan & Alur**: Analitik mendalam performa operasional penerimaan barang gudang berdasarkan moda transportasi (Udara vs Laut).
- **Fitur Utama**:
  1. **Switcher Moda Terpadu**: Pill toggle `[ Semua Moda ]` | `[ ✈️ Udara ]` | `[ 🚢 Laut ]`.
  2. **5 Kartu KPI Eksekutif dengan Rasio Visual (Filter Tahun Berjalan Berdasarkan `fdLoadDate` -> `tbMarking`)**:
     - Total Resi, Total Koli, Total Berat (kg), Total Volume (m³), dan Customer Aktif unik (`COUNT(DISTINCT fdCustName)`).
     - **Filter Waktu Presisi Berdasarkan Tanggal Loading (`tbMarking.fdLoadDate`)**:
       - Secara default, seluruh KPI tahunan (`totalAgg`) dan distribusi komoditas difilter hanya mengambil data pada **tahun sekarang/berjalan (2026)** berdasarkan tanggal muat/loading (`YEAR(fdLoadDate) = YEAR(GETDATE())`).
       - Metrik bulanan (*Bulan Ini* dan *Bulan Lalu*) juga disinkronkan menggunakan `tbMarking.fdLoadDate`, memastikan komparasi MoM (*Month-over-Month*) konsisten 100% dengan data tahun berjalan.
     - Visual bar rasio proporsional tipis (sky untuk udara, indigo untuk laut) + tren pertumbuhan MoM (*Month-over-Month*).
   3. **Grafik Distribusi Tipe Komoditas & Filter Cabang (`CommodityDistributionCard.tsx`)**:
      - Visualisasi horizontal `BarChart` (Recharts) memisahkan moda Laut dan Udara untuk tahun berjalan (2026).
      - Peringkat komoditas teratas (Umum, Lartas, Garment, Food, dll) dengan data real-time live dari `vwShipment` dan `tbTypeComodity`.
       - **Breakdown Cabang Gudang & Nama Cabang Resmi Master `tbCabang`**:
         - Seluruh kode cabang `--` dan `-` secara otomatis dinormalisasi dan disatukan ke cabang **`SG` (Singapore)** sesuai aturan bisnis.
         - **Master Data Cabang Resmi (`tbCabang`)**: Nama cabang diambil langsung dari tabel master `tbCabang` (`fdBranchCode` -> `fdBranchName`) sebagai *Single Source of Truth*, menyelesaikan kekeliruan penamaan hardcode (`EX` = Export, `IM` = Import Lain-lain, `LG` = Legal, `LM` = Legal Mandiri, `SG` = Singapore, `GZ` = Guangzhou, `HK` = Hong Kong, `YW` = Yiwu, `SH` = Shanghai, `SZ` = Shenzhen).
         - **Toolbar Filter Cabang Terpadu**: Tombol pill filter `[Semua Cabang]` | `[SG (Singapore)]` | `[GZ (Guangzhou)]` | `[HK (Hong Kong)]` | `[YW (Yiwu)]` | `[SH (Shanghai)]` | `[SZ (Shenzhen)]` | `[EX (Export)]` | `[IM (Import Lain-lain)]` | `[LG (Legal)]` | `[LM (Legal Mandiri)]` untuk menyaring grafik dan peringkat komoditas secara spesifik per cabang.
         - **Distribusi Cabang pada Tooltip & Badge**: Saat melihat "Semua Cabang", tooltip bar chart menampilkan breakdown 5 cabang pengirim teratas beserta nama cabang resmi dan persentase kontribusinya, dan mini-rank card menampilkan badge sebaran cabang utama. Saat cabang tertentu dipilih, metrik komoditas langsung terfilter sesuai volume cabang tersebut lengkap dengan kalkulasi porsi terhadap total komoditas.
       - Switcher 4 dimensi metrik: **Total Resi**, **Total Koli**, **Berat (kg)**, dan **Volume (m³)**.
- **Endpoint Terkait**:
  - `GET /api/shipments/kpi`: Parameter `year` (default: tahun berjalan via `tbMarking.fdLoadDate`, atau `'ALL'`), `listType` (opsional: 1 untuk Udara, 2 untuk Laut), `branch` (filter cabang dengan normalisasi `SG` menyertakan `--`), dll. Mengembalikan statistik eksekutif lengkap beserta agregasi distribusi komoditas kargo udara dan laut (`commodities: { air, sea, availableBranches: BranchInfo[] }`) di mana setiap cabang diperkaya dengan nama resmi dari `tbCabang` (`branchName`), dan setiap komoditas memiliki array breakdown cabang `branches: CommodityBranchMetric[]`.
  - `GET /api/shipments/branches`: Mengambil daftar cabang gudang aktif dengan unifikasi `--` dan `-` ke `SG`.

#### B. Halaman Daftar Resi Shipment (`pages/ListPage.tsx`)
- **Tujuan & Alur**: Pencarian dan pelacakan seluruh resi fisik pengiriman barang secara mendalam.
- **Fitur Utama**:
  - Filter multibasis: Universal Smart Search, Cabang, dan Moda (`Udara`/`Laut`).
  - **Toolbar Universal Smart Search & Dropdown Saran Cerdas (`ShipmentToolbar.tsx`)**:
    - **Universal Search Tanpa Dropdown Tipe (Clean & Modern UI)**: Menghilangkan selektor manual scope pencarian yang redundan, digantikan oleh satu kolom pencarian terpadu (*Universal Search Bar*) selebar penuh dengan placeholder bilingual (`t('shipments.searchPlaceholder')`), counter badge multi-token (`Layers`), dan tombol hapus instan (`X`).
    - Terintegrasi langsung dengan `SearchSuggestionsDropdown.tsx` (`GET /api/shipments/suggestions?q=...`).
    - **Pencarian Ter-Debounce (300ms)**: Menggunakan custom hook `useDebounce(search, 300)` untuk mencegah banjir permintaan API selama pengetikan cepat.
    - **Sinkronisasi Otomatis Lingkup Pencarian Backend (`searchField`)**: Saat pengguna memilih salah satu saran dari dropdown, sistem secara otomatis mengunci `searchField` ke tipe yang sesuai (`customer` $\to$ `'customer'`, `marking` $\to$ `'marking'`, `resi` $\to$ `'resi'`) atau mengembalikan ke `'ALL'` saat dikosongkan, memastikan backend query selalu terarah secara presisi tanpa memerlukan intervensi manual dari pengguna.
    - Menampilkan saran terstruktur dengan badge kategori (`Customer`, `Resi`, `Marking`) dan aksi klik langsung.
  - Indikator badge status resi.
  - **Modal Rincian Dimensi Fisik & Logistik (`ShipmentDetailModal.tsx`)**:
    - **Struktur & Tata Letak**: Menggunakan tinggi dialog statis (`h-[88vh] sm:h-[82vh]`) dengan area bodi `flex-1 overflow-y-auto` sehingga modal tidak melompat-lompat antar tab dan seluruh konten dapat digulir mulus jika terjadi luapan (*overflow*).
    - **Tab Ringkasan (`ShipmentInfoTab.tsx`)**: Menampilkan 3 kartu metrik KPI (Total Koli, Total Berat kg, Total Volume m³), identitas resi terima, tracking lokal, marking & no, tanggal agent, serta panel komoditas & catatan operasional.
    - **Tab Dimensi (`ShipmentDimensionsTab.tsx`)**: Menampilkan komparasi dimensi fisik 3 sumber: **Dimensi Gudang**, **Packing List**, dan **Komplain Customer** (Panjang $\times$ Lebar $\times$ Tinggi, Qty, M³) lengkap dengan total volume kubikasi dinamis.
    - **Tab Timeline (`ShipmentTimelineTab.tsx`)**: Pelacak visual alur logistik (*Waiting Loading*, *ETD*, *ETA*, *Warehouse*, *Delivery*, *Delivered*), penanda status dibatalkan (*Canceled*), dan **status ditahan/diblokir oleh Finance (*Blocked*)** dengan banner peringatan merah jika resi memiliki `fdBlocked = 1` pada `tbEntryList_Bloked_Finance`, lengkap dengan informasi *Blocked by* (`fdCreated`) dan alasan pembatasan (`fdKeterangan`).
    - **Tab Invoice (`ShipmentInvoiceTab.tsx`)**: *Dinamis aktif apabila invoice terkait shipment berstatus > ISSUED* (yaitu telah terbit `fdGive = 1` / `isIssued`, `fdGive2 = 1` / `isCollected`, atau `isPaid` / LUNAS):
      - Header panel identitas faktur: No. Invoice (`fdInvNo`) dilengkapi tombol salin instan, status tagihan (`BillingStatusTag`), tanggal invoice & tanggal terbit, nama penerima tagihan (`fdBillTo`) & nama master customer, serta tanggal audit validasi.
      - 3 Kartu Metrik KPI Finansial: **Total Tagihan** (format Rupiah), **Sudah Dibayar** (hijau emerald), dan **Sisa Tagihan** (amber jika belum lunas / hijau jika lunas).
      - Rincian Multi-Mata Uang (*Multi-Currency Table*): Jika faktur memiliki komponen valuta asing (USD, SGD, RP).
      - Tabel Rincian Item Tagihan: Nomor urut, Deskripsi/Nama Komoditas, Kuantitas Qty, **No. List (`fdListCode`)** *(menggantikan kolom satuan fisik)*, Tarif Satuan, dan Subtotal per baris item beserta baris total akhir.
      - Aksi Navigasi Cepat: Tombol *"Buka Invoice"* yang mengarahkan langsung ke halaman `ROUTES.BILLING_DETAIL(fdInvNo)` dan tombol *"Cetak Faktur"* ke `ROUTES.BILLING_PRINT(fdInvNo)`.
- **Endpoint Terkait**:
  - `GET /api/shipments`: Pagination `{ page, limit, search, searchField, branch, listType, status }`. Status mencakup -1 (Canceled), 10 (Blocked oleh Finance), 0-9 (Waiting s/d Paid).
  - `GET /api/shipments/suggestions`: Auto-suggest cepat untuk resi, customer, dan marking (< 250ms).
  - `GET /api/shipments/:id`: Data detail header resi beserta status logistik (termasuk status Blocked Finance) dan objek faktur `invoice` (`tbBilling` / `tbBillingDetail`).
  - `GET /api/shipments/:id/dimensions/gudang`: Ukuran fisik hasil ukur gudang.
  - `GET /api/shipments/:id/dimensions/packinglist`: Ukuran fisik packing list shipper.
  - `GET /api/shipments/:id/dimensions/komplain`: Ukuran revisi komplain pelanggan.

---

### 3.4. Modul Kontainer & Batch Marking (`src/features/shipment-batches/`)

#### A. Halaman Dashboard Batch Marking (`ShipmentBatchesDashboardPage.tsx`)
- **Tujuan & Alur**: Pemantauan kapasitas batch kontainer laut dan pengelompokan AWB penerbangan kargo udara.
- **Fitur Utama**:
  - Kalender & grafik histori keluar barang gudang (`ExitListModal.tsx`).
  - Agregasi kontainer aktif vs kontainer ditutup (*closed*).
  - **Modal Rincian Operasional & Grouping Per Tahun**:
    - **`EtaSummaryModal.tsx` (ETA Belum Keluar)**: Menampilkan rincian batch kargo yang sudah melewati jadwal ETA namun belum keluar gudang. Dilengkapi filter tab per tahun (`2026`, `2025`, `2024`, dll. + `Semua`), tahun berjalan aktif otomatis secara default dengan badge `Aktif`, penghitungan kartu KPI khusus tahun terpilih, serta sub-grouping tahun pada kartu consignee saat memilih opsi "Semua".
    - **`MissedTargetModal.tsx` (Melewati Target SLA)**: Menampilkan rincian batch kargo dengan transit time melebihi target SLA rute cabang. Dilengkapi filter tab per tahun (`2026`, `2025`, `2024`, dll. + `Semua`), tahun berjalan aktif default, kalkulasi metrik deviasi & batch kritis per tahun, serta sub-grouping tahun pada kartu consignee.
- **Endpoint Terkait**:
  - `GET /api/marking/kpi`: Metrik kontainer berjalan, total tonase muat, dan volume.
  - `GET /api/marking/exit-history`: Parameter `month`, `listType`, `search`.

#### B. Halaman Daftar Batch Marking (`ShipmentBatchesListPage.tsx`)
- **Tujuan & Alur**: Tabel inventaris seluruh batch kontainer dan kargo manifest.
- **Fitur & Logika**:
  - Tampilan nomor muatan cerdas: Nomor AWB untuk Udara (`listType = 1`) dan Nomor Kontainer untuk Laut (`listType = 2`).
  - Hirarki tanggal operasional: `Exit Date` $\to$ `ETA` $\to$ `ETD` $\to$ `Load Date`.
  - **Toolbar Pencarian & Dropdown Saran Batch (`BatchToolbar.tsx`)**:
    - Terhubung langsung dengan komponen `SearchSuggestionsDropdown` yang mengonsumsi endpoint `/api/marking/suggestions`.
    - **Debounce 300ms**: Menggunakan `useDebounce(search, 300)` untuk mengoptimalkan frekuensi pemanggilan query saran batch marking, kontainer, B/L, dan AWB.
    - **Auto-Sync Scope**: Otomatis menyetel lingkup pencarian `searchScope` ke `'code'` (Kode Marking) saat item bertipe marking dipilih dari dropdown.
    - Dilengkapi penutup otomatis saat klik di luar kontainer (*click-outside listener*).
  - **Modal Data Manifest (`ManifestModal.tsx` / `ManifestList.tsx`)**:
    - Menampilkan seluruh resi muatan fisik yang terdaftar dalam batch (`GET /api/marking/:id/manifest`).
    - **Status Finansial & Override Blocked Finance**:
      - Setiap item manifest menampilkan indikator **Status Finansial** yang bersumber dari master status pelanggan **`tbCustomers.fdBlocked`** (`OK`, `COD`, `WARNING`, `BLOCKED`, `URGENT`, `NO STATUS`).
      - **Override Otomatis Status Blocked**: Jika item muatan diblokir oleh Finance (`tbEntryList_Bloked_Finance.fdBlocked = 1`), status finansial otomatis di-override menjadi badge merah **`BLOCKED`**, lengkap dengan identitas petugas pemblokir (*Blocked by* / `fdCreated`) dan catatan alasan penahanan (*Alasan* / `fdKeterangan`) pada tampilan Table, Grid, maupun Shortlist.
    - Filter pencarian instan di dalam manifest (`GET /api/marking/:id/manifest/search?q=...`).
- **Endpoint Terkait**:
  - `GET /api/marking`: Pagination, pencarian nomor kontainer/BL/AWB, filter `listType`, filter `isClosed`.
  - `GET /api/marking/groups`: Pengelompokan batch berdasarkan cabang atau periode.
  - `GET /api/marking/:id/manifest`: Rincian seluruh resi dalam batch (`vwShipment`), status finansial, dan status pemblokiran finance (`tbEntryList_Bloked_Finance`).

#### C. Halaman Audit Ukuran & Tonase per Marking (`MarkingSizePage.tsx`)
- **Tujuan & Alur**: Modernisasi form warisan FoxPro `frm_entrylistdetail_per_marking.scx` ("Ukuran per Marking") untuk melakukan audit komparasi ukuran kubikasi volume (M³) untuk kargo moda laut (`listType !== 1`) dan tonase berat (Kg) untuk kargo moda udara (`listType === 1`).
- **Fitur Utama**:
  1. **Navigasi Sidebar & Toolbar Kontrol Autocomplete (`Sidebar.tsx` & `MarkingSizeToolbar.tsx`)**:
     - **Navigasi Sidebar ERP**: Tersedia langsung di bawah menu **Batch Marking** $\to$ **Audit Ukuran & Tonase** (`ROUTES.SHIPMENT_BATCH_MARKING_SIZE`, icon `Ruler`).
     - **State Awal Bersih (Clean Initialization)**: Input pencarian tidak lagi memaksakan kode marking default tertentu saat halaman dibuka langsung tanpa query param URL. Jika kosong, tabel menampilkan pesan panduan ramah pengguna untuk memilih/mencari kode batch marking.
     - Pencarian cepat kode marking / kontainer dengan autocomplete real-time (`/api/marking/suggestions`), navigasi keyboard (Arrow Up/Down/Enter), dan sinkronisasi URL query param (`?code=...`).
     - Pengurutan data: Sortir berdasarkan `ListCode` (Sort 1) vs `Nama Customer` (Sort 2).
     - Filter instan dalam tabel data (ListCode, Customer, Marking No, Komoditas, Keterangan).
     - Tombol ekspor Excel multi-sheet dan tombol refresh data.
  2. **Kartu KPI Ringkasan Adaptif (`MarkingSizeKpiSection.tsx`)**:
     - Menampilkan 5 kartu metrik proporsional yang beradaptasi secara otomatis berdasarkan moda pengiriman:
       - **Moda Laut**: Ukuran Kontainer (`contSize`), Total Koli PL vs Gudang (dengan badge selisih), Total M³ Gudang (dengan M³ PL & Net Komplain), Selisih M³ (persentase deviasi PL vs Gudang), dan Total Tonase Berat (kg).
       - **Moda Udara**: Batch Udara (AWB / No Kontainer), Total Koli (Pack), Total Berat Gudang (kg) vs List vs Net, Selisih Berat (kg & deviasi), dan Total Berat Surat Jalan (kg).
   3. **Tabel Audit Komparasi 16 Kolom (`MarkingSizeTable.tsx`)**:
      - Kolom identitas: No, ListCode, Customer (`displayCustName` Single Source of Truth `tbCustomers`), Marking No, Komoditas.
      - **Tag Deteksi Mark Up Dimensi (`MARK UP`)**:
        - Jika kargo memiliki data pada tabel ukuran asli gudang (`tbEntryListDetailOri`), artinya kargo tersebut telah mengalami penyesuaian/markup dimensi.
        - Menampilkan badge outline semantik `MARK UP` (ikon `Sparkles`, warna amber) tepat di samping nomor ListCode.
        - Badge bersifat interaktif: mengklik tag `MARK UP` langsung membuka modal dimensi dengan tab *Gudang Asli (Ori)* aktif secara instan.
      - Kolom Koli: Pack PL vs Qty Gudang (dengan alert merah jika ada selisih koli).
      - Kolom Kubikasi M³: M³ PL vs M³ Gudang (dengan alert merah jika ada selisih M³) vs M³ Komplain (alert merah jika > 0).
      - **Tombol Aksi Drilldown Terpadu (`Detil`)**:
        - Menggabungkan kolom `Detil` dan `Komp` menjadi satu kolom aksi tunggal yang proporsional.
        - Menampilkan ikon `AlertCircle` merah (dengan border merah lembut) dan membuka tab *Komplain* secara default jika kargo memiliki komplain ukuran/berat.
        - Menampilkan ikon `Layers` standar dan membuka tab *Gudang Fisik* jika kargo normal tanpa komplain.
        - Pengguna tetap dapat berpindah ke salah satu dari 4 tab (*Gudang*, *Gudang Asli*, *Packing List*, *Komplain*) di dalam modal pop-up.
      - Kolom Tonase Berat: Berat List vs Berat Gudang vs Berat SJ vs Berat Komplain.
      - Sticky footer `tfoot` dengan kalkulasi akumulatif seluruh kolom kuantitas, M³, dan berat.
  4. **Modal Drilldown Dimensi Fisik Koli (`MarkingBoxDimensionModal.tsx`)**:
     - Modal pop-up dengan desain **responsif mobile**:
       - Tampilan dialog fleksibel: *bottom sheet* bersudut membulat di mobile (`rounded-t-2xl max-h-[92vh]`) dan modal terpusat di desktop (`sm:rounded-2xl sm:max-h-[88vh]`).
       - **4 Tab Dimensi Fisik Terintegrasi (Horizontal Scrollable)**:
         - **Gudang Fisik (`gudang`)**: Dimensi fisik aktif saat ini dari `tbEntryListDetail`.
         - **Gudang Asli / Ori (`asliGudang`)**: Dimensi fisik asli sebelum markup dari `tbEntryListDetailOri`, dilengkapi counter badge amber jika kargo memiliki data asli.
         - **Packing List (`packingList`)**: Dimensi dokumen packing list pelanggan/pengirim dari `tbEntryListDetail_PackingList`.
         - **Komplain (`komplain`)**: Dimensi revisi komplain dari `tbEntryListDetail_Komplain`.
       - **Banner Peringatan Mark Up**: Jika `hasMarkup: true`, modal menampilkan alert banner di atas rincian data yang memperingatkan bahwa ukuran aktif saat ini merupakan hasil mark up dari ukuran asli gudang.
       - **Mini KPI Summary Grid**: 3 kartu metrik kompak di atas rincian data (Total Koli, Total Volume M³, dan Total VFC kg untuk udara / Varian ukuran untuk laut).
       - **Dual Presentation**: Tampilan **Mobile Cards List** (`block sm:hidden`) dengan kartu kompak per box ($P \times L \times T$ cm, Qty, Vol M³, VFC kg) dan **Desktop Table** (`hidden sm:block`) dengan tabel 8-kolom lengkap berserta sticky footer total.
       - **Pengurutan Data Standar**: Seluruh rincian box dimensi fisik diurutkan secara konsisten berdasarkan **`fdListDCode ASC`** (Kode Rincian Detail) pada backend dan frontend di seluruh tab.
  5. **Ekspor Excel 4 Sheet Sesuai Standar FoxPro (`markingSizeExcel.ts`)**:
     - Menghasilkan berkas Excel `.xlsx` komprehensif berisi 4 sheet:
       - Sheet 1: `DETAIL` (Rincian dimensi coly fisik gudang per listcode).
       - Sheet 2: `ORIGINAL` (Rincian ukuran koli asli dari `tbEntryListDetailOri`).
       - Sheet 3: `KOMPLAIN` (Rincian dimensi revisi komplain).
       - Sheet 4: `REKAP` (Tabel audit perbandingan 17 kolom + header info kontainer dan akumulasi total).
- **Endpoint Terkait**:
  - `GET /api/marking/size-audit/:code`: Mengambil ringkasan header batch, 5 kartu KPI metrik (termasuk deteksi `hasMarkup` dan `totalMarkupCount`), dan tabel 17 kolom via Stored Procedure `sp_tbEntryListDetail_permarking`.
  - `GET /api/marking/box-dimensions/:listCode`: Mengambil rincian dimensi koli 4 tab (`gudang`, `asliGudang`, `packingList`, `komplain`) dan status `hasMarkup`.
  - `GET /api/marking/size-audit/:code/all-dimensions`: Mengambil seluruh dimensi koli dalam 1 batch marking untuk keperluan ekspor Excel multi-sheet.

---

### 3.5. Modul Surat Jalan & Inventori Gudang / Delivery Orders (`src/features/delivery-orders/`)

#### A. Halaman Dashboard Pengantaran (`DashboardPage.tsx`)
- **Tujuan & Alur**: Pusat komando kendali distribusi surat jalan dan evaluasi performa operasional bulanan (MTD vs MoM vs YoY) yang terhubung langsung dengan modul Inventori Kargo Gudang dan Daftar Surat Jalan.
- **Fitur Utama**:
  1. **Pemantauan Analitik Bulan Berjalan (MTD) vs MoM & YoY (`DeliveryMomYoySection.tsx`)**:
     - **Navigasi Periode Interaktif**: Selector tahun dan bulan (`selectedYear`, `selectedMonth`) dengan kontrol navigasi panah (`<`, `>`) dan tombol pintas *"Bulan Berjalan"* untuk kembali ke bulan/tahun saat ini secara instan.
     - **5 Kartu Metrik Komparatif MTD**:
       - **Total Surat Jalan (SJ)**: Jumlah fisik surat jalan terbit pada periode terpilih beserta indikator pertumbuhan MoM & YoY.
       - **Total Koli / Packages**: Akumulasi koli paket terdistribusi beserta persentase fluktuasi pertumbuhan.
       - **Tonase Berat (kg)**: Total tonase berat kargo terdistribusi (kg) lengkap dengan perbandingan MoM & YoY.
       - **Surat Jalan Sukses Terkirim (Delivered)**: Jumlah surat jalan yang telah berhasil diserahkan (`fdSent = 1`) beserta rasio sukses pengantaran.
       - **Rata-rata Koli per SJ**: Rata-rata densitas koli yang dimuat per surat jalan armada.
     - **Pill Pertumbuhan Dinamis (Growth Badges)**: Menampilkan persentase selisih `+X%` (hijau) jika meningkat, `-X%` (merah/amber) jika menurun, serta penanda netral (`0%` / `—`) jika data basis pembanding bernilai nol.
     - **Grafik Tren 12 Bulan (Recharts `ComposedChart`)**: Visualisasi pergerakan 12 bulan memadukan Bar Chart (Total SJ) dan Dual Line Chart (Total Koli & Tonase Berat kg) ramah tema Midnight Dark.
     - **Matriks Ringkasan Perbandingan 3 Periode**: Tabel komparasi berdampingan antara Bulan Terpilih (MTD), Bulan Sebelumnya (MoM), dan Bulan Sama Tahun Lalu (YoY).
  2. **Banner Alur Tahapan Gudang (Workflow Stage Cards)**:
     - Kartu 1: *Stok Mengendap di Gudang (Ready to Ship)* — Menampilkan total kargo on-hand (Laut + Udara) dengan tautan langsung menuju halaman `ROUTES.DELIVERY_ORDERS_INVENTORY`.
     - Kartu 2: *Kargo Selesai Terkirim (Delivered)* — Rekapitulasi total koli yang sukses diserahterimakan dengan tautan ke `ROUTES.DELIVERY_ORDERS_LIST`.
  3. **4 Kartu Pintasan Modul Logistik (Quick Navigation Cards)**:
     - Tautan instan ke Inventori Stok Gudang, Daftar & Riwayat DO, Pengiriman Logistik, dan Batch Marking Kontainer.
- **Endpoint Terkait**:
  - `GET /api/delivery-orders/kpi`: Mengembalikan ringkasan MTD, MoM, YoY, tren 12 bulan, dan status pengiriman armada.
  - `GET /api/delivery-orders/grouped`: Digunakan untuk menghitung kuantitas kargo pending laut dan udara on-hand.

#### B. Halaman Inventori Stok Kargo di Gudang / Buat Surat Jalan (`pages/InventoryPage.tsx`)
- **Tujuan & Alur**: Halaman mandiri di sidebar Logistik dengan label *"Buat Surat Jalan"* (`/mshipping/logistics/delivery-orders/inventory`) yang berfungsi sebagai **titik awal operasional pembuatan Surat Jalan berdasarkan manifest kargo gudang (`fdListCode`)**. Halaman ini secara spesifik berfokus murni pada **kargo on-hand di gudang yang belum dikirim (`sent = '0'`)**.
- **Fitur Utama**:
  1. **Switcher Moda Terpadu**: Tab toggle `[ 🚢 Kapal / Laut ]` dan `[ ✈️ Udara ]` dengan live counter jumlah kargo on-hand di gudang transit.
  2. **Filter Status Fisik Gudang**:
     - `Semua Stok`: Menampilkan seluruh kargo belum terkirim.
     - `🏢 Di Gudang` (`gudangStatus = '1'`): Kargo yang fisik barangnya sudah dikonfirmasi berada di gudang transit.
     - `⏳ Belum Konfirm` (`gudangStatus = '0'`): Kargo yang status fisiknya masih pending / belum konfirmasi masuk gudang.
  3. **Live Search & Quick Pagination**: Pencarian instan (debounced 350ms) mencakup marking, customer, invoice, resi, atau list code.
  4. **Tabel Inventori Cerdas**:
     - Kolom data: Marking & Cabang, Customer, Komoditi & Tipe, Resi / List Code, Berat (kg) & Volume (m³ beserta sumber dimensi Gudang vs tbEntryList), Stok Gudang (progress meter kuantitas sisa/total koli), Status Fisik & Distribusi, serta Kelola Surat Jalan.
  5. **Titik Awal Pembuatan & Pengelolaan Surat Jalan Berdasarkan `fdListCode`**:
     - **Link "Buka SJ" ke Riwayat**: Baris kargo yang telah memiliki Surat Jalan dilengkapi tombol *"Buka SJ"* berupa `<Link>` dengan query parameter `?listCode=...` yang langsung mengarahkan pengguna ke halaman Daftar Surat Jalan (`ROUTES.DELIVERY_ORDERS_LIST`) dengan filter kargo tersebut sudah terisi otomatis (mengeliminasi redundansi tampilan riwayat di halaman inventori).
     - **Tombol "+ Buat SJ" & Modal Penerbitan (`CreateDeliveryOrderModal.tsx`)**:
       - Hanya muncul pada baris kargo yang **masih memiliki sisa stok di gudang (`sisa > 0`)**. Jika kargo sudah berstatus **Lengkap Terkirim** (`sisa <= 0`), tombol ini otomatis disembunyikan sehingga mencegah penerbitan ganda.
        - Menginisialisasi form pembuatan Surat Jalan baru dari kargo terpilih (`fdListCode`, `fdMarking`, nama customer, sisa koli, dan berat).
        - Menggunakan `createPortal(..., document.body)` dengan `fixed inset-0 z-[100]` dan flex centering sehingga modal selalu tampil presisi di tengah monitor (*true center viewport*).
        - Memuat data armada (`tbKendaraan`), supir, no telepon supir, tanggal estimasi, tanggal kirim, dan catatan pengiriman.
        - **Satuan Kargo Otomatis dari `tbEntryList` (`fdSatuan`)**:
          - Dropdown pilihan Satuan dan nilai default `formData.fdSatuan` secara otomatis mengambil nilai satuan aktual yang tercatat pada `tbEntryList.fdSatuan` kargo terkait (bukan di-hardcode `COLY`).
          - Jika kargo memiliki satuan di luar opsi standar (`COLY`, `KOLI`, `PCS`, `BOX`, `ROLL`) maupun master `tbSatuan` (seperti `PKGS`, `PLTS`, `CT`, `BAGS`, `DRUMS`, `CRATE`), opsi satuan tersebut otomatis disuntikkan ke dalam pilihan dropdown dengan label `(dari tbEntryList)` sehingga nilai satuan selalu terpilih dengan tepat tanpa terpotong atau tertukar.
          - Context Bar ringkasan kargo di atas formulir serta label kuantitas kirim dan helper text sisa stok secara konsisten mengadopsi satuan kargo (`sisa / total {cargo.satuan}`).
        - **Card Instruksi Khusus Pelanggan (Permintaan Pengiriman CS - `qr_OrderDelivey`)**:
          - Menampilkan instruksi khusus yang diinput oleh tim Customer Service / Sales dari view SQL Server `qr_OrderDelivey` berdasarkan `fdListCode`.
          - **Otomatis Terbuka (Auto-Open)**: Jika kargo memiliki instruksi pengiriman khusus dari CS, card ini langsung muncul di posisi paling atas form dan terbuka secara default agar staf operasional segera mengetahui instruksi khusus tersebut.
          - **Otomatis Tersembunyi (Auto-Hide)**: Jika kargo tidak memiliki instruksi khusus (`qr_OrderDelivey` kosong), card ini disembunyikan sepenuhnya sehingga tampilan formulir tetap ringkas dan bersih.
          - **Aksi Cepat (Quick Apply)**: Dilengkapi tombol *"Gunakan Instruksi CS Ini pada Form"* dan *"Terapkan Alamat ke Form"* untuk menyalin alamat kirim, kota, PIC kontak, tanggal estimasi, dan catatan CS langsung ke input form dalam 1-klik.
        - **Integrasi Master Alamat Tujuan (`tbCustomerPengiriman`)**:
          - Bagian *Tujuan & Penerima Barang* dilengkapi combo dropdown select yang mengambil **seluruh** daftar alamat tujuan customer dari tabel `tbCustomerPengiriman` menggunakan key `fdCustCode`.
          - **Auto-Select Default (`fdAktif = 1`)**: Baris alamat dengan `fdAktif = 1` secara otomatis dianggap sebagai alamat default utama. Saat modal dibuka, combo langsung mengunci opsi default tersebut (`★ [DEFAULT]`) dan otomatis mengisi data modal penerima (kontak PIC, nomor HP/telepon, kota, dan alamat pengiriman lengkap).
          - **Tampilkan Semua Opsi**: Dropdown combo menampilkan semua alamat tersimpan (aktif maupun non-aktif) sehingga pengguna bebas memilih alternatif alamat cabang pengiriman lain jika diperlukan.
          - **Tombol "+ Tambah Alamat" (Quick Add)**: Disediakan tombol tambah alamat jika data tujuan belum ada atau ingin mendaftarkan cabang/gudang penerima baru. Sub-form interaktif langsung menyimpan record baru ke `tbCustomerPengiriman` dengan auto-generate 2-digit `fdID` (`'01'`, `'02'`, ...) dan otomatis memilih alamat tersebut untuk Surat Jalan yang sedang dibuat.
        - Terintegrasi dengan endpoint `POST /api/delivery-orders` yang secara atomik mengambil nomor auto-counter FoxPro berikutnya dari `tbMasterCounter` (`fdCode = 'A'`, format `[Branch]-[Pad6Digits]`, e.g. `GZ-949650`), mengunci transaksi, dan menerbitkan Surat Jalan baru ke `tbDelivery`.
- **Endpoint Terkait**:
  - `GET /api/delivery-orders/grouped`: Mengambil data inventori kargo manifest masuk dengan filter moda dan status fisik (menyertakan `custCode` master dan `satuan` dari `tbEntryList.fdSatuan`).
  - `GET /api/delivery-orders/by-listcode/:listCode`: Mengambil riwayat nomor Surat Jalan yang telah diterbitkan untuk list code tertentu.
  - `GET /api/delivery-orders/order-delivery/:listCode`: Mengambil instruksi khusus pengiriman pelanggan (CS) dari `qr_OrderDelivey`.
  - `GET /api/delivery-orders/customer-destinations/:custCode`: Mengambil daftar alamat tujuan pengiriman customer dari `tbCustomerPengiriman`.
  - `POST /api/delivery-orders/customer-destinations`: Menambahkan alamat tujuan pengiriman baru ke `tbCustomerPengiriman` dengan atomic next `fdID`.
  - `POST /api/delivery-orders`: Menerbitkan Surat Jalan baru dengan nomor otomatis atomic increment.

#### C. Halaman Daftar Surat Jalan (`ListPage.tsx`) & Detail (`DetailPage.tsx`)
- **Revamp Tampilan Daftar Surat Jalan & Manifest Kargo (`ListPage.tsx`)**:
  - **Sistem Tab Terpadu (Pending vs Delivered)**:
    - **Tab Pending (Dalam Pengiriman)**: Menampilkan kargo manifest yang masih dalam proses pengantaran atau belum lengkap terkirim (`sent = '0'`), lengkap dengan live counter badge per total kargo pending.
    - **Tab Delivered (Lengkap Terkirim)**: Menampilkan kargo manifest yang seluruh muatannya telah selesai diantarkan (`sent = '1'`), lengkap dengan live counter badge per total kargo delivered.
    - Menggantikan tampilan accordion ganda bertumpuk lama dengan tab selektif yang fokus dan responsif.
  - **Baris Filter Horizontal Cabang Pengirim (Group Pills Cabang)**:
    - Baris horizontal scrollable ramah mobile/desktop (`no-scrollbar`) yang memuat pil cabang dari API `GET /api/delivery-orders/branch-groups`:
      - **Pill "Semua Cabang"**: Menampilkan seluruh data cabang dengan badge total sesuai tab status aktif.
      - **Pill Cabang Spesifik** (`GZ`, `SG`, `HK`, `YW`, `LM`, `SH`, `SZ`, `EX`, `LG`, dll.): Menampilkan kode cabang, tooltip nama cabang, dan badge jumlah kargo cabang tersebut pada tab aktif.
      - Menampilkan status aktif dengan border aksen brand semantik (`border-[var(--color-tertiary)]`) tanpa tombol solid putih, ramah multi-tema dan Midnight Dark Mode.
  - **Sub-Toolbar Filter & Pencarian Kargo**:
    - **Moda Switcher**: Tombol toggle instan `BY SEA (Laut)` (`listType = 2`) dan `BY AIR (Udara)` (`listType = 1`).
    - **Pencarian Ter-Debounce (350ms)**: Mencakup pencarian multi-kolom (List Code, Marking Code, Nama Customer, Resi Terima, dan Nama Komoditas).
    - **Active Context Bar**: Menampilkan ringkasan filter aktif (Status Tab, Moda, Cabang, kata kunci pencarian) dan tombol cepat *"Reset Filter"*.
  - **Tabel Manifest Kargo & Ekspansi Rincian Surat Jalan (`BatchTable.tsx` & `BatchRow.tsx`)**:
    - Header 8 kolom terstandarisasi: Nomor Urut (`#`), List Code / Cabang / Marking, Customer / Resi, Komoditas, Total Muatan (Qty, Satuan `fdSatuan`, Berat kg, Volume m³), Progres Pengiriman (Terkirim vs Sisa dengan badge semantik), Status Kirim (`StatusPill`), dan Aksi Expand SJ.
    - Loading wireframe terstandarisasi menggunakan `.skeleton-shimmer` (`BatchTableSkeleton`), bebas dari spinner bulat fullscreen.
    - Baris kargo dapat diekspansi langsung untuk melihat seluruh nomor Surat Jalan fisik terkait beserta link detail, armada, supir, status cetak, dan status AR (`DeliveryOrderDetails.tsx`).
  - **Sistem Pagination Presisi & Limit Selector (`TableFooter.tsx`)**:
    - Terintegrasi di footer tabel dengan tampilan counter presisi: `Menampilkan X–Y dari Z data`.
    - Selector baris per halaman: `10`, `20`, `50`, `100`.
    - Tombol navigasi halaman *Prev* dan *Next* serta indikator `page / totalPages`.
  - **Dukungan Dual-View (Manifest Kargo vs Surat Jalan Fisik Flat)**:
    - Pengguna tetap dapat beralih ke mode **Surat Jalan Fisik (Flat)** untuk mencari nomor Surat Jalan tertentu secara spesifik menggunakan `DeliveryOrderToolbar` dan `DeliveryOrderTable`.
  - **Toolbar Pencarian & Dropdown Saran Surat Jalan Flat (`DeliveryOrderToolbar.tsx`)**:
    - Terhubung langsung dengan `SearchSuggestionsDropdown` yang mengonsumsi endpoint `/api/delivery-orders/suggestions`.
    - **Debounce 300ms**: Menggunakan `useDebounce(search, 300)` untuk mempercepat pengetikan tanpa membebani server backend.
    - Menampilkan saran terstruktur untuk nomor surat jalan (`sj`), pelanggan (`customer`), staf pengemudi (`supir`), dan plat nomor kendaraan (`car`).
  - **Indikator Status Siklus Surat Jalan (Lifecycle Badges)**:
    - **Status Pengiriman (Delivery)**: `Terkirim` (`fdSent = 1`) vs `Proses Kirim` (`fdSent = 0`).
    - **Status Cetak Fisik (Print)**: `Printed` (`fdPrintDate IS NOT NULL`) vs `Belum Cetak`.
    - **Hirarki Posisi Dokumen**: `GUDANG` $\to$ `BILLING` $\to$ `AR`.
    - **Status Penyerahan AR**: `AR` (`fdGive = 1`) vs `Belum AR`.
  - **Pusat Kendali Surat Jalan Terintegrasi FoxPro (`DetailPage.tsx`)**:
    - **Data Manifest Akurat via JOIN `tbEntryList` + `tbCabang`**:
      - Menggunakan query JOIN langsung ke tabel kargo masuk `tbEntryList` dan tabel cabang resmi `tbCabang` (bukan `tbBranch` warisan).
      - Menampilkan Nomor Invoice (`fdInvoiceNo`) dan Komoditas (`fdComodity`) aktual pada Manifest Context Bar 8 kolom.
    - **Prioritas Penerima Kargo Aktual di Surat Jalan**:
      - Nama penerima utama diprioritaskan dari dokumen fisik aktual Surat Jalan (`delivery.fdCustNameSJ`), bukan dipaksakan override dari tabel master `tbCustomers`. Nama master akun tetap ditampilkan sebagai referensi jika berbeda.
    - **Dual Mode Interaktif (View Mode $\leftrightarrow$ Edit Mode $\leftrightarrow$ Save)**: Form edit armada `tbKendaraan`, supir, tanggal estimasi, alamat kirim, kota, dan catatan pengiriman.
    - **Pencetakan Surat Jalan Terpadu (`PrintDeliveryOrderModal.tsx` & `PrintPage.tsx`)**:
      - **Media Cetak Standar**: Format presisi untuk kertas continuous form ukuran **lebar 23 cm × tinggi 16.5 cm (Landscape)** (`@page { size: 230mm 165mm landscape; margin: 0; }`).
      - **3 Pilihan Dokumen Terpadu (Single / Combined Sheet)**:
        1. **SJ + Lampiran Ukuran (Keduanya)**: Mencetak 2 lembar continuous form sekaligus secara berurutan dengan pemisah halaman (`pageBreakAfter: 'always'`). Lembar 1 adalah Surat Jalan Resmi, lembar 2 adalah Lampiran Ukuran Marking.
        2. **Hanya Surat Jalan Resmi (`rpf_delivery_2022.frx`)**: Format dokumen fisik legal 1 lembar dengan identitas No. SJ, No. Mobil, No. Resi, Marking, Penerima, Alamat Tujuan, Tabel Muatan (Qty, Berat, Satuan, Koli), 3 butir ketentuan keluhan/perhatian, checkbox packing original, dan 3 kolom tanda terima fisik (Penerima, Pengirim/Supir, Petugas Gudang).
        3. **Hanya Lampiran Ukuran Marking (`rpt_deliverysize_bill_2023.FRX`)**: Format tabel rincian dimensi fisik koli 1 lembar memuat Nomor SJ, Nama Customer, Kode Marking, No. Marking, Tanggal, Tabel kolom `No # | Panjang | Lebar | Tinggi | Jumlah | Total (M3/VFC) | Keterangan`, baris Grand Total, dan tanda tangan Petugas Ukur & Gudang.
      - **4 Opsi Cetak Sesuai Form Warisan FoxPro (`frm_input_surat_jalan_view_2021.scx`)**:
        - `cetakUkuran`: Menampilkan rincian sub-ukuran coly (maks 5 baris) di badan lembar Surat Jalan utama.
        - `cetakKeterangan`: Menampilkan catatan/deskripsi barang dan instruksi pengiriman pada baris kargo.
        - `cetakSupir`: Mencetak nama pengemudi fisik pada kolom tanda terima.
        - `cetakSJKosong`: Format blangko formulir kosong untuk pengisian darurat lapangan.
      - **Halaman Cetak Mandiri (`PrintPage.tsx` / `DeliveryOrderPrintPage`)**:
        - Terdaftar pada rute `ROUTES.DELIVERY_PRINT(':id')` (`/mshipping/logistics/delivery-orders/:id/print`) di luar `AppLayout` tanpa gangguan sidebar/navbar.
        - Toolbar kontrol cetak interaktif: Pemilih dokumen live (`both`, `sj`, `ukuran`), tombol pintas opsi cetak, judul file otomatis, tombol print utama, serta live sheet preview 1:1 format continuous form.
        - Terhubung dengan `deliveryOrdersApi.recordPrint` untuk mencatat riwayat cetak ke database backend (`fdPrint = 1`, `fdPrintDate`, `fdPrintBy`).
    - **Penghapusan Dokumen (`ConfirmModal`)**: Proteksi surat jalan yang telah dicetak.
    - **Banner Peringatan Sistem**: Banner Barang Amfibi dan Banner Finance Blocked (`tbEntryList_Bloked_Finance`).
- **Endpoint Terkait**:
  - `GET /api/delivery-orders`: Query `{ page, limit, search, sent, printed, ar }`.
  - `GET /api/delivery-orders/master-data`: Master armada `tbKendaraan`, satuan `tbSatuan`, jenis bayar `tbJenisPembayaran`, dan ekspedisi `tbExpedisi`.
  - `GET /api/delivery-orders/:id`: Detail nomor surat jalan dengan relasi `tbDelivery`, `tbEntryList` + `tbCabang`, `tbCustomers`, `tbEntryListDetail`, `qr_OrderDelivey`, `m3Comparison`, `tbExpedisi`, amfibi check.
  - `PUT /api/delivery-orders/:id`: Memperbarui data operasional surat jalan.
  - `DELETE /api/delivery-orders/:id`: Menghapus surat jalan dengan proteksi dokumen yang telah dicetak.
  - `POST /api/delivery-orders/:id/print`: Mencatat konfirmasi cetak surat jalan dan opsi cetak ukuran.
  - `GET /api/delivery-orders/grouped`: Agregasi pengelompokan surat jalan.
  - `GET /api/delivery-orders/marking-groups`: Pengelompokan berbasis batch marking.
  - `GET /api/delivery-orders/branch-groups`: Pengelompokan berbasis cabang.


---

### 3.6. Modul Keuangan & Faktur Penagihan (`src/features/billing/`)

Modul paling komprehensif pada sistem mshipping yang mencakup siklus hidup penagihan piutang, audit validasi, hingga pencetakan dokumen legal.

#### A. Dashboard Keuangan (`BillingDashboardPage.tsx`)
- **Fitur**: Kartu KPI piutang (Total Tertagih, Piutang Berjalan, Rasio Lunas), Grafik Tren Harian Penagihan per Karyawan/Sales (`by-employee-daily`), dan Grafik Komparasi Surat Jalan vs Faktur Terbit (`sj-vs-bill`).
- **Endpoint**:
  - `GET /api/billing/kpi`
  - `GET /api/billing/chart/by-employee-daily?days=30`
  - `GET /api/billing/chart/trends?days=30`
  - `GET /api/billing/chart/sj-vs-bill?days=30`
  - `GET /api/billing/chart/sj-vs-bill/details?pic=...&type=...`

#### B. Target Penagihan (`BillingTargetPage.tsx` / `TargetPage.tsx`)
- **Tujuan**: Audit daftar muatan barang yang sudah selesai terkirim atau tiba di gudang namun belum diterbitkan invoice penagihannya.
- **Fitur**: Analisis backlog tagihan per PIC sales, audit estimasi potensi omzet, tombol cepat pembuatan draf faktur, dan tombol **Salin Data Kargo** (Nama Customer, Cabang, Marking, Komoditi, Jml Pack, Berat, Tipe) per baris tabel desktop dan kartu mobile untuk kemudahan komunikasi operasional. Didukung utilitas `copyToClipboard` dengan fallback `execCommand` sehingga tetap bekerja optimal pada lingkungan non-secure/HTTP (`http://36.93.22.142/...`), disertai visual feedback checkmark hijau dan toast notifikasi.
- **Endpoint**: `GET /api/billing/target-details?type=all|udara|laut&pic=...`

#### C. Daftar & Rincian Invoice (`BillingPage.tsx` & `DetailPage.tsx`)
- **Tujuan**: Manajemen status pembayaran faktur, penambahan biaya lokal (*local charges*), diskon, dan penerbitan faktur resmi (*Issue Invoice*).
- **Fitur Utama**:
  - **Toolbar Pencarian & Dropdown Saran Billing (`BillingToolbar.tsx`)**:
    - Terhubung langsung dengan `SearchSuggestionsDropdown` yang mengonsumsi endpoint `/api/billing/suggestions`.
    - **Preservasi Teks Pencarian & Filter Pelanggan Presisi (`selectedCustCode`)**: Saat pengguna memilih saran pelanggan dari dropdown, kolom teks pencarian tetap menampilkan nama pelanggan (`fdCustName`, misal: `RICO`) sesuai yang dipilih pengguna. Di balik layar, sistem mengirimkan parameter `custCode` (`R000470`) ke backend `getBillings` sehingga daftar faktur langsung memfilter faktur milik pelanggan tersebut secara 100% presisi tanpa mengganti teks input menjadi kode. Jika pengguna mengetik ulang atau menghapus teks, filter `selectedCustCode` otomatis di-reset kembali ke pencarian multi-kolom bebas.
    - Dilengkapi panduan pencarian popover interaktif dan penutup otomatis klik di luar (*click-outside listener*).
  - Pemilihan karyawan penagih (*Billing Staff / Collector*).
  - Aksi *Issue Invoice*: Mengunci tagihan dengan tanggal penyerahan resmi (`fdGiveDate`), nomor invoice, dan ID penagih.
  - Edit item tagihan tersimpan (`PUT /api/billing/:id/details`).
  - **Dukungan Dual-Bahasa (i18n) & Fitur Salin Cepat Nomor Invoice (`DetailPage.tsx`)**:
    - Tombol badge salin cepat pada samping nomor invoice header serta tombol mikro pada baris No. Invoice di Card 2 (Status & Waktu Invoice).
    - Seluruh label visual tombol, tooltip, dan pesan feedback toast terhubung penuh ke kamus i18n (`common.copy`, `common.copied`, `billing.invNo`, `billing.detail.copyInvoiceTitle`, `billing.detail.copySuccess`, dll).
  - Navigasi cepat ke Cetak Dokumen dan Audit Validasi.
- **Endpoint**:
  - `GET /api/billing`: Pagination & filter search.
  - `GET /api/billing/:id`: Data lengkap header faktur.
  - `GET /api/billing/:id/details`: Rincian baris muatan item resi dalam faktur.
  - `GET /api/billing/employees`: Daftar karyawan aktif penagihan.
  - `POST /api/billing/:id/issue`: Payload `{ "fdEmpId": "..." }`.

#### D. Audit Validasi Penagihan (`ValidationListPage.tsx` & `ValidationDetailPage.tsx`)
- **Tujuan**: Mencegah kebocoran pendapatan perusahaan dan komplain pelanggan dengan memeriksa akurasi tarif master serta kesesuaian fisik muatan sebelum faktur dikirimkan.
- **3 Aturan Audit Utama**:
  1. **Validasi Harga Master (`Price Check`)**: Membandingkan tarif yang ditagihkan dengan tabel master tarif umum atau tarif khusus pelanggan.
     - **Resolusi Komoditi & Pemetaan (`evaluateItemPrice`)**:
       - Jika item tidak memiliki `fdTypeComodity` khusus atau bernilai `0`, sistem otomatis fallback ke komoditi header invoice (`defaultTypeId`) atau komoditi default marking (`UMUM`, `GENERAL`, dll).
       - Pencocokan heuristik kata kunci komoditi (seperti singkatan `LS` pada *Alkes, Makanan & LS Lainnya*) menggunakan regex batas kata (`/\bLS\b/i`) sehingga kata seperti `PARCELS`, `TOOLS`, dsb tidak memicu false positive kategori tarif yang salah.
       - Item `PARCELS TO JAKARTA (PCS)` tidak diperlakukan sebagai M3 kubikasi.
  2. **Validasi Hirarki Volume M3 (`M3 Check`)**:
     - **Single Bill**: `Komplain` (`fdM3Komplain`) $\to$ `Gudang` (`fdM3Gudang`) $\to$ `PL` (`fdM3`).
     - **Bill Gabung** (`isGabungan`): `Komplain (Marking)` $\to$ `Gudang (Marking)` (`m3CustPerMarking`) $\to$ `PL (Marking)`.
  3. **Validasi Komparasi Berat vs Volume (Type 2 Comparison / Overweight)**:
     - Memeriksa batas rasio berat terhadap volume ($> 300\text{ kg/m}^3$ atau ambang toleransi tarif).
     - **Prinsip Billed M3 Riil vs Basis Validasi KG (Laut)**:
       - **Kotak Billed M3 Riil**: Kotak Billed M3 dan seluruh ringkasan metrik volume faktur selalu menampilkan nilai riil yang ditagihkan di invoice (`tbBillingDetail.fdQty`, misal: `0.0257 m³`), BUKAN dibulatkan secara paksa ke 0.1 m³.
       - **Aturan Minimum 0.1 m³ untuk Validasi KG (Laut)**: Khusus pengiriman laut (`!isAir`), apabila volume muatan berada di bawah 0.1 m³ (`rawRefM3 < 0.1`), maka basis volume acuan (`refM3`) **wajib dinaikkan menjadi 0.1 m³** untuk perhitungan batas kuota rasio berat (`maxAllowedWeight = 0.1 × rasio`). Hal ini menjamin barang kecil (misal: volume 0.0257 m³ dengan berat aktual 8 kg) tidak salah divonis sebagai *overweight*, karena memiliki batas toleransi minimal setara kuota 0.1 m³ (misal $0.1 \times 300 = 30\text{ kg}$).
       - **Aturan Sisa Kuota Berat & Pemicu Catatan Validasi (Laut)**:
         - Pada pengiriman laut (`!isAir`), penagihan dihitung berbasis kubikasi (M3) murni dan berat fisik diatur oleh kuota rasio (`maxAllowedWeight = refM3 × rasio`).
         - Perbedaan catatan timbangan fisik antar dokumen (`hasWeightMismatch`, misal 260 kg vs 270 kg) **TIDAK menggagalkan validasi fisik** dan **TIDAK memunculkan warning "Terdapat Catatan Validasi Pada Invoice Ini"** selama sisa kuota berat aman ($\text{Sisa Kuota Berat} = \text{Batas Kuota} - \text{Berat Aktual} \ge 0$).
         - Warning / catatan validasi kelebihan berat HANYA muncul apabila **Sisa Kuota Berat < 0** (`isOverweight = true` / kuota terlampaui dan belum ditagihkan) atau jika invoice menagihkan item KG yang tidak diperlukan (`isBilledUnneededOverweight`).
       - **Pencocokan Audit Fisik M3**: Sistem pencocokan M3 fisik (`useBillingValidation`) mengenali kecocokan (*MATCH*) baik terhadap volume fisik riil gudang (`rawVal`) maupun nilai faktur yang telah dikenakan tarif minimum (`normM3` = 0.1 m³).
       - **Peringatan Tagihan di Bawah Minimum Charge M3 (Laut)**:
         - Jika volume yang ditagihkan di invoice (`billedM3`) berada di bawah batas minimum charge M3 (`res.profileHarga.minChargeM3` jika ada, atau default `0.1 m³`), sistem memunculkan **indikator peringatan (warning)**:
           - **Header Badge**: Berstatus kuning/amber `DI BAWAH MIN. CHARGE (<nilai billed> < <nilai min> m³)` dengan ikon `AlertTriangle`.
           - **Card Billed M3**: Menampilkan border amber, ikon warning, dan pill `⚠ < Min X.X m³`.
           - **Warning Alert Banner**: Menampilkan pesan peringatan bahwa volume yang ditagihkan lebih rendah dari batas minimum charge agar staf penagihan dapat memastikan apakah penagihan volume riil ini disengaja atau seharusnya ditagihkan tarif minimum.
      - **Catatan Khusus Tarif Customer (`tbCustomersHarga`: Note Air & Note Sea)**:
        - Pada kartu validasi tab **Profile Harga Customer (`Customer Price Profile`)**, sistem menampilkan catatan kontrak tarif pelanggan dari tabel master `tbCustomersHarga`:
          - **Note Air (`fdNote`)**: Catatan khusus tarif pengiriman udara (misal: penawaran khusus rute SG/GZ, ketentuan asuransi, diskon per kg). Diberi aksen border sky-500 dan badge "Moda Faktur Ini" saat invoice merupakan pengiriman udara.
          - **Note Sea (`fdNote 1`)**: Catatan khusus tarif pengiriman laut (misal: tax refund per cbm, minimum charges, kesepakatan harga per nomor kontainer/batch). Diberi aksen border blue-500 dan badge "Moda Faktur Ini" saat invoice merupakan pengiriman laut.
          - Seluruh catatan dibersihkan menggunakan `cleanFoxProString` untuk menormalkan karakter `^` menjadi `'`.
       - **Infinite Scroll Antrean Validasi (`ValidationListPage.tsx`)**:
         - Mencegah *DOM bloating* dan lag rendering pada daftar faktur draft validasi.
         - Menggunakan **Infinite Scroll teroptimasi** dengan tampilan awal **25 faktur pertama** (`PAGE_SIZE = 25`).
         - Dilengkapi observer sentinel otomatis (`IntersectionObserver` dengan `rootMargin: '300px'`) di bagian dasar tabel desktop dan daftar kartu mobile, serta fallback window scroll listener.
         - Saat pengguna menggulir mendekati bagian bawah, 25 baris berikutnya ditambahkan secara otomatis (`25 -> 50 -> 75 ...`).
         - Menampilkan counter status informatif: *"Menampilkan X dari Y faktur validasi"* serta tombol cadangan *"Muat Lebih Banyak (+25)"*.
         - Otomatis mereset batas tampil kembali ke 25 saat filter moda (Udara/Laut), filter PIC staf, atau kata kunci pencarian diubah.
         - **Eksklusi Faktur Issued**: Hanya faktur berstatus **Draft Murni** (`fdGive != 1`, `fdGive2 != 1`, `fdCekDate == null`) yang dimuat dalam antrean validasi; faktur yang telah diterbitkan/di-issue disaring keluar dari antrean.
       - **Penguncian Rincian Item Tagihan (Read-Only) Saat Status > ISSUED / LUNAS**:
         - Pada halaman `ValidationDetailPage.tsx`, jika faktur telah berstatus **ISSUED** (`fdGive = 1`) atau **LUNAS/COLLECTED** (`fdGive2 = 1` / `isPaid = true` / `paymentStatus = 'LUNAS'`), tombol aksi di atas tabel rincian item otomatis beralih menjadi tombol **`Lihat Item`** dengan ikon gembok `Lock`.
         - Modal `EditBillingDetailsModal` otomatis beralih ke mode **Read-Only**: menampilkan badge `READ-ONLY`, banner peringatan bahwa tagihan terkunci, teks rincian item statis tanpa field `<input>`, serta menyembunyikan tombol penambahan baris, penghapusan baris, dan tombol simpan perubahan.
       - **Penanganan Overflow & Scrolling Kartu Validasi (`BillingValidationCard.tsx`)**:
         - Memperbaiki issue overflow terpotong (*clipped*) pada kartu validasi kolom kanan di `ValidationDetailPage.tsx`.
         - Kontainer utama kartu validasi menggunakan `flex flex-col h-full min-h-0`, dengan header kartu dan bar navigasi tab terkunci di atas (`shrink-0`).
         - Kontainer utama tab perbandingan (*main comparison body*) menggunakan `flex-1 min-h-0 overflow-y-auto` dengan padding bawah lapang (`pb-8 sm:pb-10`).
         - Memastikan seluruh konten panjang pada seluruh tab (Item & Tarif, Validasi M3 / Compare M3:KG, Overweight, Freight Charge, dan Ekspedisi) dapat di-scroll vertikal secara mulus tanpa terpotong batas layar atau terhalang tombol FAB drawer.
       - **Modal Rincian Dimensi Fisik & Perhitungan Volume M3 (`DimensionDetailModal.tsx`)**:
         - Pada kartu **Per ListCode** di tab Validasi M3 (`BillingValidationCard.tsx`), disediakan tombol primer **`Detail Dimensi`** di header kartu serta tombol tautan mikro **`Dimensi`** di setiap kotak sumber data (*EntryList / ListBatch*, *Packing List*, dan *Komplain*).
         - Membuka modal terstandar ERP (`size="2xl"`) yang mengintegrasikan data fisik per koli dari 3 tabel basis data terkait:
           1. **EntryList** (`tbEntryListDetail`): Dimensi fisik koli saat diterima dan diukur di gudang.
           2. **Packing List** (`tbEntryListDetail_PackingList`): Dimensi koli menurut dokumen packing list pengirim (beserta kode marking & komoditas).
           3. **Komplain** (`tbEntryListDetail_Komplain`): Dimensi fisik koli hasil komplain atau revisi pengukuran.
         - **Kartu Metrik KPI**: Total Volume M3 (`18px tabular-nums`), Total Koli / Qty, Jumlah Baris Rincian, serta banner panduan rumus konversi $(P \times L \times T \times Qty) \div 1.000.000$.
       - **Tabel Rincian Lengkap**: Menampilkan kolom No, Kode Detail (`fdListDCode`), Deskripsi / Marking / Komoditas, Panjang P (cm), Lebar L (cm), Tinggi T (cm), Qty (Koli), serta Hasil Hitungan Volume M3 dengan background aksen dan baris ringkasan footer total.
         - Dilengkapi filter pencarian teks instan (kode detail, deskripsi, marking, nama barang) dan tombol segarkan data (*refresh*).
       - **Modal Ringkasan Validasi Faktur (`BillingValidationSummaryModal.tsx`)**:
         - Membuka modal ringkasan audit penagihan menyeluruh yang menggabungkan audit fisik (`PhysicalAuditTab.tsx`) dan audit finansial (`FinancialAuditTab.tsx`).
         - Dilengkapi indikator proteksi loading state (`isLoadingValidation`) untuk mencegah penilaian selisih kubikasi prematur saat data fisik gudang masih dimuat di latar belakang.
         - **Audit Fisik & Penanda Data Acuan Tagihan (`PhysicalAuditTab.tsx`)**:
           - Pada kartu metrik KPI ukuran fisik (Volume/Berat Ditagihkan, Volume/Berat Gudang, Volume Packing List, Volume/Berat Komplain), kartu sumber data fisik yang dipakai sebagai acuan tagihan (`isUsedGudang`, `isUsedPL`, `isUsedKomplain`) diberi **highlight border hijau tegas** (`border-emerald-500/70` / `ring-1 ring-emerald-500/20`), latar halus (`bg-emerald-500/5`), dan badge penanda **`Dipakai Bill`**.
           - Kartu pertama (**Nilai Tagihan / Ditagihkan**) juga diberi border semantik responsif: warna aksen brand (`border-[var(--color-tertiary)]/70`) dengan badge **`Ditagihkan`** saat data cocok, border kuning-amber saat berada di bawah minimum charge (`< Min M3`), atau border merah-rose saat terdapat deviasi/selisih fisik (`Selisih`).
           - Mengoper prop `matchedSourceKey` dari hasil validasi `useBillingValidation` (`v.seaPrimaryMatch?.sourceKey` / `v.airPrimaryMatch?.sourceKey`) yang disinkronkan dengan fallback pencocokan angka toleransi.
         - **Audit Finansial (`FinancialAuditTab.tsx` & `evaluateItemPrice` di `billing.utils.ts`)**:
            - **Prioritas Pemetaan Komoditas Eksplisit**:
              - Sistem memprioritaskan Pemetaan Khusus Pelanggan (`tbCommodityMapping` dengan `fdCustCode = custCode`) di atas Pemetaan Global (`fdCustCode IS NULL`).
              - Target komoditas hasil pemetaan (`directComodityName`, misal: `BATTERY` $\to$ `UMUM`) dipertahankan sebagai acuan nama komoditas dan **tidak ditimpa** oleh fallback default (seperti `isGenuineBattery` yang mengarahkan ke `SEMI GARMENT`).
              - Fallback bawaan kata kunci komoditas (`SEMI GARMENT`, `KHUSUS IPAD`, `LAPTOP`) murni hanya digunakan jika tidak ditemukan aturan pemetaan pelanggan maupun global.
            - **Dukungan Tarif Langsung Pemetaan (Tier 0 Direct Price)**:
              - Jika pemetaan komoditas memiliki nilai tarif langsung (`price > 0`), sistem menggunakannya sebagai acuan validasi tarif tertinggi (`Tier 0: Tarif Khusus Pelanggan / Tier 0`) tanpa mencari ke master upload Excel.
              - Status tarif dievaluasi langsung terhadap nominal Tier 0 tersebut (`MATCH` / `LOWER` / `HIGHER`).
            - Membandingkan tarif tagihan dengan tarif acuan master dan menghitung selisih finansial per baris item penagihan.
            - **Tampilan 2 Baris Kolom Sumber Acuan**: Rincian acuan tarif (`item.priceListDisplay`) di-split secara terstruktur menjadi 2 baris (Baris 1: Nominal Harga / Rentang Tarif, Baris 2: Keterangan Acuan Sheet seperti `(Cust)`, `(Tier 0)`, `(CS)`, `(tbExpIndo)`, dll) menggunakan parser cerdas `parsePriceDisplay`.
        - Menghitung nilai ideal tarif M3 vs aktual tagihan dan mendeteksi kondisi: **`EQUAL` (Sesuai)**, **`OVERWEIGHT`**, **`OVERCHARGE`**, atau **`UNDERCHARGE`**.
- **Endpoint Terkait**:
  - `GET /api/billing?hasAmount=true&draftOnly=true&noPagination=true&minYear=2023`: Daftar seluruh invoice antrean validasi draft.
  - `GET /api/billing/type2-compare-check`: Komparasi komprehensif M3 vs KG faktur.
  - `GET /api/billing/m3-check`: Evaluasi hirarki ukuran M3 per list code.
  - `GET /api/billing/dimensions/:listCode`: Mengambil rincian ukuran fisik per koli dari 3 tabel dimensi (`tbEntryListDetail`, `tbEntryListDetail_PackingList`, `tbEntryListDetail_Komplain`) beserta total kuantitas dan kalkulasi volume M3.
  - `GET /api/billing/m3-cust-marking-details`: Rincian ukuran marking customer.
  - `GET /api/billing/transport-check`: Evaluasi biaya transportasi.
  - `GET /api/billing/customer-tariff-audit/:custCode`: Audit tarif menyeluruh customer.

#### E. Pairing Local Charge (`PairingLocalChargePage.tsx`)
- **Tujuan**: Mencocokkan data biaya lokal (*local charges* seperti storage, beacukai, handling fee) dari file Excel eksternal atau daftar nomor resi ke dalam faktur sistem secara otomatis.
- **Fitur**: Upload file Excel (`.xlsx` / `.xls`), input daftar teks resi manual, preview hasil pencocokan (cocok, tidak ditemukan, duplikat), dan ekspor hasil pairing kembali ke Excel.
- **Endpoint**:
  - `POST /api/billing/pairing-local-charge`: Multipart form upload Excel.
  - `POST /api/billing/pairing-local-charge/by-receipts`: Payload `{ "receiptNos": "..." }`.
  - `POST /api/billing/pairing-local-charge/export-excel`: Download file binary Excel hasil matching.

#### F. Report Designer Studio (`ReportDesignerPage.tsx`)
- **Tujuan**: Visual WYSIWYG Designer bagi Administrator untuk merancang template cetak faktur invoice tanpa coding.
- **Fitur**:
  - Grid canvas dengan pengaturan posisi drag-and-drop elemen (Header, Tabel Item Resi, Total Biaya, Kolom Terbilang, Kotak Tanda Tangan, Catatan Rekening).
  - Mode cetak dot matrix (karakter teks font monospaced) vs mode laser/PDF grafis.
  - Penyimpanan konfigurasi template JSON ke server.
- **Endpoint**:
  - `GET /api/billing/report-template`: Membaca konfigurasi template aktif.
  - `PUT /api/billing/report-template`: Payload `{ "config": { ... } }`.

#### G. Halaman Cetak Invoice (`BillingPrintPage.tsx`)
- **Tujuan**: Halaman render khusus (berada di luar `AppLayout` sehingga bersih dari sidebar/navbar) untuk memicu dialog print browser atau unduh PDF.
- **Mode Cetak**:
  - `mode=pdf`: Menggunakan layout grafis modern resolusi tinggi.
  - `mode=matrix`: Menggunakan layout fixed-width monospaced untuk printer continuous paper dot matrix Epson/LX.

#### H. Arsitektur Komponen Modal Kompleks (Dekomposisi Subkomponen & SSOT Types)
Untuk mencegah *God Components* (>2.000 baris) dan kode *spaghetti*, seluruh modal audit dan detail berkapasitas besar diurai menjadi submodul terisolasi (<250 baris) dengan tanggung jawab tunggal (*Single Responsibility Principle*):

1. **`CustMarkingDetailModal` (`src/features/billing/components/cust-marking-detail/`)**:
   - Berfungsi untuk menampilkan rincian muatan per marking code, verifikasi koli/berat/volume gudang vs komplain vs packing list, serta ekspor data ke Excel.
   - **Struktur Modular**:
     - `types.ts`: Interface dan tipe lokal modal.
     - `useCustMarkingData.ts`: Custom hook untuk data fetching, caching, dan kalkulasi agregasi tab.
     - `CustMarkingHeaderToolbar.tsx`: Header modal, tabs, date filter, search bar.
     - `CustMarkingSummaryBanner.tsx`: Ringkasan metrik total koli, berat gudang, berat komplain, dan selisih.
     - `CustMarkingDataTable.tsx`: Tabel data transaksi marking responsif.
     - `custMarkingExcel.ts`: Utilitas terisolasi untuk ekspor spreadsheet Excel.

2. **`CustomerBillingHistoryModal` (`src/features/billing/components/customer-history/`)**:
   - Berfungsi untuk meninjau rekam jejak faktur pelanggan, tren omzet tahunan, rincian transaksi per resi, serta perbandingan tarif historis per komoditas.
   - **Infinite Scroll & Optimasi Backend (Tanpa Pagination)**:
     - Menggantikan sistem pagination diskrit lama dengan **Infinite Scroll** menggunakan `@tanstack/react-query` (`useInfiniteQuery`).
     - Pengambilan data batch halaman per 30 invoice (`OFFSET ... ROWS FETCH NEXT 30 ROWS ONLY`) di SQL Server, mengeliminasi query 500+ invoice berat sekaligus.
     - Backend dioptimasi dengan pemindahan filter (`status`, `diffStatus`, `moda`, `typeComodity`, `search`) langsung ke level SQL `WHERE`, penghitungan `COUNT(*)` cepat, serta eksekusi paralel metadata pelanggan (`summary`, `branches`, `commodityTypes`, `years`) pada pemuatan awal (`page=1`).
     - Pada frontend, tabel mendeteksi scroll pengguna menggunakan `IntersectionObserver` (`rootMargin: '200px'`) dan listener `onScroll` untuk memuat batch data berikutnya secara otomatis, halus, dan mulus tanpa jeda.
     - Footer modal menampilkan status ringkas ("Menampilkan X dari Y invoice/item", animasi indikator memuat data berikutnya, serta konfirmasi seluruh data telah dimuat).
   - **Fitur Tanggal Agent & Tipe Komoditi**:
     - Header modal menerima prop opsional `tglAgent` dan `typeComodity` untuk memberikan visual context instan dari invoice yang sedang diaudit, lengkap dengan tombol filter cepat tipe komoditas.
     - `CustomerHistoryInvoiceTable.tsx`: Dilengkapi kolom khusus **Tgl Agent** (format tanggal baku) serta pemisahan kolom **Tipe Komoditi** (badge pill semantik) dan **Deskripsi Barang / Komoditas**. Sub-tabel rincian muatan saat baris di-expand juga menampilkan kolom **Tipe Komoditi**.
     - `CustomerHistoryDetailTable.tsx`: Dilengkapi kolom eksplisit **Tgl Agent** (setelah Tgl Invoice) dan kolom **Tipe Komoditi** (setelah Tgl Invoice sebelum Nama Item).
     - Seluruh nama deskripsi dan item muatan dibersihkan menggunakan `cleanFoxProString` untuk menormalkan karakter `^` menjadi `'`.
   - **Rata-rata Tarif / M³ per Tipe Komoditas (`commodityAvgRates`)**:
     - Pada kartu KPI ke-3 (*Rata-rata Tarif / M³*), metrik tarif kubikasi kini dihitung dan dikelompokkan **per tipe komoditas barang** (`UMUM`, `GARMENT`, `LARTAS - N`, `LARTAS - S`, `SEMI GARMENT`, `TEKSTIL`, dsb.), BUKAN lagi angka flat tunggal.
     - **Agregasi SQL Cepat di Backend**: Backend (`customer-billing-history.service.ts`) menjalankan query agregasi paralel `commodityRatesSql` pada halaman pertama (`page=1`) untuk menghitung total volume M3, total nominal rupiah tagihan M3, dan rata-rata tarif efektif per kubikasi untuk seluruh histori faktur pelanggan di database.
     - **Interaktivitas Kartu KPI**:
       - Bila filter tipe komoditas aktif (`selectedTypeComodity !== 'all'`), kartu menampilkan tarif rata-rata komoditas tersebut secara dominan lengkap dengan subline volume M3 dan jumlah transaksi.
       - Bila "Semua Tipe", kartu menampilkan rata-rata gabungan disertai deretan pill/chip interaktif per komoditas (`[KOMODITAS]: [TARIF/M3]`). Mengklik salah satu chip langsung memfilter riwayat transaksi ke komoditas tersebut.
     - **Modal Dialog Komparasi Komprehensif**: Kartu dilengkapi tombol aksi `[X Tipe ↗]` yang membuka modal dialog perbandingan komprehensif berisi tabel komparasi: Tipe Komoditas, Rata-rata Tarif / M³, Total Volume (M³), Total Nilai Tagihan (IDR), Jumlah Invoice, serta tombol aksi cepat untuk mengaktifkan filter transaksi.
   - **Struktur Modular**:
     - `types.ts`: Tipe data invoice history, rincian item (`FlatDetailTraceItem`), `CommodityAvgRate`, props modal (`tglAgent`, `typeComodity`), serta tipe pagination dan filter options.
     - `useCustomerHistoryData.ts`: Hook pengelolaan `useInfiniteQuery`, filter tahun, cabang, tipe komoditas, search query (debounced 300ms), agregasi item trace, kalkulasi metrik KPI, dan integrasi tarif per komoditas.
     - `CustomerHistoryToolbar.tsx`: Filter tahun, cabang, tipe komoditas (`Semua Tipe Komoditas`), moda, status audit, status bayar, dan search input.
     - `CustomerHistoryKpiCards.tsx`: 4 kartu metrik performa penagihan pelanggan (Total Nilai Tagihan, Total Muatan Fisik M3/KG, Rata-rata Tarif / M³ per Tipe Komoditas dengan interactive chip & comparison modal, serta Audit Penyesuaian).
     - `CustomerHistoryInvoiceTable.tsx`: Tabel histori faktur dengan scroll container, sentinel observer, kolom Tanggal Agent, Tipe Komoditi, Deskripsi, Volume/Berat, Total, Status Bayar, dan sub-rincian muatan.
     - `CustomerHistoryDetailTable.tsx`: Tabel rincian item trace dengan scroll container, sentinel observer, kolom Tanggal Agent, Tipe Komoditi, Listcode, Qty, Berat, Volume, Harga Satuan, dan Total Tagihan.

3. **`BillingValidationSummaryModal` (`src/features/billing/components/validation-summary/`)**:
   - Modal audit multi-aspek komprehensif sebelum faktur disetujui dan diterbitkan.
   - **Standar Ukuran & Kompak ERP**: Menggunakan `size="2xl" className="h-[85vh] max-h-[85vh] flex flex-col"` (`max-w-6xl` dengan tinggi statis 85vh agar modal stabil tidak naik-turun saat ganti tab), padding kompak `px-3.5 sm:px-4 py-2 sm:py-2.5`, tab bar kompak `text-[11.5px] px-2.5 py-1`, kartu KPI `16-17px tabular-nums`, dan tabel data berpadding `py-1.5 px-2.5` sesuai hierarki desain ERP.
   - **Proteksi Loading Prematur (`isLoadingValidation`)**:
     - Dilengkapi penanganan status pemuatan asinkron data fisik operasional (`/billing/m3-check`).
     - Selama `isLoadingValidation: true`, header, tabs bar, dan footer alert bar menampilkan status evaluasi netral/shimmer (*"Memvalidasi Data Fisik & Acuan Tarif..."*), tombol "Terbitkan Invoice" dinonaktifkan sementara, dan status selisih fisik/tarif dicegah agar tidak memunculkan peringatan palsu (*false discrepancy warning*) sebelum data operasional selesai dimuat.
   - **Struktur Modular**:
     - `types.ts`: Tipe data kategori validasi audit (`SummaryModalTab`).
     - `ValidationSummaryHeader.tsx`: Header ringkasan audit dan status keseluruhan (mendukung `isLoadingValidation`).
     - `ValidationSummaryTabsBar.tsx`: Navigasi tab status audit (`Item Tagihan & Tarif`, `Timbangan Fisik / Validasi M3`, `Overweight`, `Freight Charge`, `Transport & Ekspedisi`) yang dilengkapi semantic status tag pada masing-masing tab (`✓ Valid` / `Cek Tarif`, `✓ Sesuai` / `Selisih`, `✓ Aman` / `Perlu Cek`, `{totalFc} {curr}` / `Nihil`, `✓ Sesuai` / `Perlu Tagih`, serta tag `Cek...` saat memuat).
     - `FinancialAuditTab.tsx`: Panel audit tarif & komparasi ideal vs aktual tagihan. Seluruh kolom angka/tarif (`Tarif Tagihan`, `Tarif Acuan`, `Selisih`, `Sumber Acuan`, `Status Audit`, `Qty`, `No`) dilindungi dengan `whitespace-nowrap` dan min-width terdefinisi (`min-w-[125px]`, `min-w-[120px]`, `min-w-[130px]`) sehingga nominal mata uang (seperti `Rp. 10,000,000.00` dan `+Rp. 1,000,000.00`) tidak ter-wrap antar-baris, dan tabel secara mulus dapat digulir horizontal jika diperlukan.
     - `PhysicalAuditTab.tsx`: Panel audit M3 vs KG & single/bill gabungan.
     - `OverweightAuditTab.tsx`: Panel audit batas toleransi tonase muatan armada.
     - `FreightAuditTab.tsx`: Panel audit biaya Freight Charge valas dan ringkasan list batch EntryList operasional.
     - `TransportAuditTabContent.tsx`: Panel audit biaya ekspedisi lokal (tbExpIndo) & status penagihan transport.
     - `ValidationSummaryFooter.tsx`: Footer aksi persetujuan (*issue/approve*) dengan verdict alert bar dinamis ramah loading dan tombol proporsional seimbang berbasis pustaka UI primitif terpusat `<Button>` (`size="sm"`, `rounded-[var(--radius-md)]` 6px agar tidak berbentuk pill lonjong/kapsul). Tombol "Terbitkan Invoice" beraksen emerald dengan ikon `<Send />`, serta tombol "Tutup" sekunder bertema dinamis yang menutup modal sebelum memicu aksi `onOpenIssueModal`.

4. **`CustMarkingDetailModal` & Ekspor Excel (`src/features/billing/components/cust-marking-detail/`)**:
   - Dialog rincian muatan & komparasi fisik vs invoice per customer & marking.
   - **Tabel Data Transaksi & Redesign (`CustMarkingDataTable.tsx`)**:
     - Tampilan tabel kompak, bersih, dan berstandar ERP (`text-xs`, tabular nums, sticky header & sticky footer).
     - **Dieliminasi**: Kolom `Rasio` dan `Overweight` dihapus dari tampilan tabel sesuai preferensi operasional penagihan kargo.
     - **Penyederhanaan Tax Return**: Kolom `Tax Return` disederhanakan menjadi indikator tag status ringkas (`TAX` hijau emerald ber-border tipis vs `NON` netral dengan border putus-putus), dilengkapi tooltip detail nominal jika terdapat nilai tax return.
     - **Grouping Cabang Rapi**: Baris pemisah cabang dengan badge visual modern di sisi kiri dan akumulasi berat serta kubikasi cabang di sisi kanan.
     - **Sticky Footer Total Terpadu (`tfoot`)**: Akumulasi total kuantitas coly, berat gudang, kubikasi M³ gudang, M³ packing list, data komplain, selisih kubikasi, total tagihan rupiah, serta jumlah transaksi dengan status TAX.
   - **Ekspor Excel Terpadu (`custMarkingExcel.ts`)**:
     - **Sheet 1 ('Ringkasan Marking')**: Tabel komprehensif data shipment (Invoice, Tgl, Cabang, Listcode, Resi `fdTerima`, Marking No, Komoditas, Qty, Berat, Volume, VFC, Nilai Tagihan, Status).
     - **Sheet 2 ('Detail Ukuran Fisik')**: Redesign tata letak sesuai kebutuhan audit pelanggan:
       - **Identitas Kargo Vertikal (5 baris)**: `Customer Name`, `Marking`, `Marking No`, `Resi (fdTerima)`, `Komoditas`. (Menghilangkan `LISTCODE` dan `INVOICE` dari header fisik).
       - **Tabel Ukuran Fisik Horizontal**: `No`, `Panjang (cm)`, `Lebar (cm)`, `Tinggi (cm)`, `Qty`, `Volume (m³)`.
       - **Baris Terakhir**: Akumulasi total kuantitas coly dan `Total m³`.
       - Lebar kolom terstandar proporsional (`!cols`).

5. **Sentralisasi Tipe & Utilitas Billing (`src/features/billing/types/` & `src/features/billing/utils/`)**:
   - Seluruh tipe data inti (`M3CheckResponse`, `MarkingDetailItem`, `PriceItem`, `FlatDetailTraceItem`, `CustomerBillingHistoryItem`, `ValidationCategory`, dll) dipusatkan di `billing.types.ts` sebagai **Single Source of Truth (SSOT)**.
   - **Evaluasi Auxiliary Item (`isAuxiliaryItem`)**: Mendeteksi biaya pelengkap non-muatan (biaya admin, tax return, surcharge, diskon). Wajib menggunakan *word boundary* regex `/\bADMIN(ISTRASI)?\b/i` dan proteksi awalan `PARCEL`/`PARCELS` agar komoditas barang yang mengandung substring serupa (seperti `"BADMINTON RACKET"`) tidak salah diabaikan dari perhitungan kubikasi tagihan.
   - **Evaluasi Tarif Komoditi (`evaluateItemPrice`)**:
     - Memprioritaskan penentuan komoditas berdasarkan hasil pemetaan eksplisit (*Customer Mapping* dahulu, lalu *Global Mapping* atau *Marking Commodities*).
     - **Disambiguasi Presisi SEMI GARMENT vs GARMENT**: Memisahkan secara ketat pencocokan komoditas `SEMI GARMENT` (`Semi Garment / Battery / Powerbank (MSDS required)`) dari `GARMENT` reguler (`Fabric / Garment`). Mencegah komoditas Semi Garment (misal pada rute Singapore/SG MKT @ Rp 8.500.000) salah mencocokkan kategori Garment umum (@ Rp 9.500.000), serta memproteksi pencarian substring agar tidak terjadi salah pasang silang antara kedua kategori tersebut.

---

### 3.7. Modul Master Tarif Umum (`src/features/price-list/`)

#### A. Fitur & Halaman
1. **Dashboard & Trend (`DashboardPage.tsx`)**: Grafik fluktuasi pergerakan tarif rute per kategori barang dan cabang asal dalam rentang waktu tertentu.
2. **Lookup Tarif (`LookupPage.tsx`)**: Kalkulator cepat pencarian tarif berlaku berdasarkan tanggal pengiriman, moda (udara/laut), cabang, dan jenis komoditas.
3. **Upload Excel Master Tarif (`UploadPage.tsx`)**: Unggah berkas Excel daftar harga baru dengan pemetaan kolom otomatis.
4. **Histori & Diff Upload (`HistoryPage.tsx` & `DetailPage.tsx`)**:
   - Menampilkan riwayat unggahan tarif.
   - **Visual Diff Engine**: Membedah perubahan tarif antara file yang diunggah dengan tarif aktif sebelumnya (tarif baru, tarif naik bertanda merah, tarif turun bertanda hijau, atau tarif tetap).
   - Pengaturan tanggal berlaku efektif (*Effective Date*).
- **Endpoint Terkait**:
  - `GET /api/price-list/filters`: Opsi filter cabang, kategori, sheet type.
  - `GET /api/price-list/trend`: Parameter tren waktu.
  - `GET /api/price-list/uploads`: Daftar riwayat upload master tarif.
  - `GET /api/price-list/uploads/:id/diff`: Data komparasi detail per baris.
  - `PATCH /api/price-list/uploads/:id/effective-date`: Ubah tanggal berlaku.
  - `POST /api/price-list/upload`: Multipart upload berkas Excel.
  - `GET /api/price-list/lookup`: Parameter `{ date, sheetType, mode, branch, category, markingCode }`.

---

### 3.8. Modul Master Tarif Khusus Customer (`src/features/customer-price-list/`)

#### A. Fitur & Halaman
1. **Direktori Customer Price List (`ListPage.tsx`)**: Daftar seluruh pelanggan yang memiliki kontrak harga khusus tersendiri di luar tarif umum.
2. **Histori & Riwayat Customer (`HistoryPage.tsx`)**: Riwayat penyesuaian tarif per pelanggan tertentu beserta status aktif/kedaluwarsa.
3. **Upload Tarif Khusus Pelanggan (`UploadPage.tsx`)**: Upload Excel daftar harga khusus satu pelanggan tertentu (`POST /api/customer-price-list/:custCode/upload`).
4. **Visual Diff Pelanggan (`DiffPage.tsx`)**: Bedah komparasi tarif baru vs tarif lama khusus kontrak pelanggan bersangkutan.
5. **Modal Input Harga Komoditi Khusus Customer (`CustomerCommodityPriceModal.tsx`)**:
   - **Pencarian Master Customer dari Single Source of Truth `tbCustomers`**:
     - Input pemilihan customer terhubung langsung ke master **`tbCustomers`** melalui `customersApi.list` (`GET /api/customers?search=...&limit=30&status=active`), sehingga staf dapat memilih pelanggan mana saja yang terdaftar di sistem ERP tanpa harus menunggu pelanggan tersebut pernah mengunggah file Excel tarif.
     - **Pencarian Real-Time & Debounce (300ms)**: Menggunakan `useDebounce(customerSearch, 300)` untuk pencarian kode (`fdCustCode`) maupun nama customer (`fdCustName`).
     - **Pembersihan FoxPro String (`displayCustName`)**: Menggunakan `displayCustName` dari `@/lib/utils` untuk menormalisasi karakter warisan FoxPro (`^` $\to$ `'`).
     - **Kartu Pelanggan Terpilih (Selected Customer Card)**: Menampilkan badge kode monospaced, badge emerald `tbCustomers`, nama customer resmi, serta tombol `"Ganti"` untuk beralih atau mereset pilihan.
     - **Auto-Resolution Pelanggan**: Saat modal dibuka dalam mode edit (`initialData`) atau dengan `defaultCustCode`, nama customer resmi diselesaikan secara otomatis melalui `customersApi.detail(targetCode)`.
     - **Fallback Kode Kustom**: Menyediakan tombol pintas penggunaan kode kustom bila staf ingin memasukkan kode pelanggan spesifik secara langsung.
   - **Pengaturan Multi-Alias Komoditi**: Penambahan alias nama barang operasional (misal: `LAPTOP BATTERY`, `POWERBANK`) yang otomatis disinkronkan ke kategori komoditas terkait.
   - **Masa Berlaku Fleksibel**: Pilihan tanggal mulai berlaku (*Effective Date*) dan batas waktu opsional (*End Date* / ongoing).
- **Endpoint Terkait**:
  - `GET /api/customers`: Pencarian master customer dari `tbCustomers` (Single Source of Truth).
  - `GET /api/customers/:id`: Detail customer untuk resolusi nama resmi.
  - `GET /api/customer-price-list`: Daftar pelanggan bertarif khusus.
  - `GET /api/customer-price-list/:custCode/active`: Tarif aktif pelanggan saat ini.
  - `GET /api/customer-price-list/:custCode/uploads`: Riwayat upload per customer.
  - `GET /api/customer-price-list/uploads/:id/diff`: Komparasi diff upload.
  - `GET /api/customer-price-list/items`: List harga komoditas khusus (CRUD).
  - `POST /api/customer-price-list/items`: Tambah harga khusus baru.
  - `PUT /api/customer-price-list/items/:id`: Update harga komoditas khusus.
  - `DELETE /api/customer-price-list/items/:id`: Hapus harga khusus.

---

### 3.9. Modul Commodity Mapping (`src/features/commodity-mapping/`)

#### A. Tujuan & Logika
Menghubungkan variasi penulisan nama komoditas yang tidak beraturan dari data mentah packing list/lapangan (misal: `"BAJU ANAK"`, `"KAOS KATUN"`, `"TEKSTIL"`) ke kategori master tarif resmi perusahaan (misal: `"GARMENT"`), serta memungkinkan penetapan **tarif langsung (*direct price*)** per komoditas dengan batasan cabang asal dan kondisi mulai marking code / tanggal agen.
- **Scope Pemetaan**:
  - `global`: Berlaku untuk seluruh pengiriman umum.
  - `customer`: Berlaku khusus hanya untuk pengiriman pelanggan tertentu.
- **Fitur Utama**:
  - **Tarif Langsung & Acuan Operasional (Tier 0 - Prioritas Tertinggi)**:
    - Memungkinkan staf menetapkan nominal **Harga Langsung (Rp)** (`price`), **Cabang Asal** (`branch`: `ALL`, `GZ`, `YIWU`, `SHANGHAI`, `SHENZHEN`), **Mulai Marking Code** (`startMarkingCode`, e.g. `>= 26GZD53`), dan/atau **Mulai Tanggal Agen** (`startAgentDate`).
    - **Integrasi Mesin Cek Tarif (*Price Check & Billing Validation*)**:
      - Sistem audit tarif (`evaluatePriceCheck` di `price-check.service.ts` & `m3-check.service.ts`) mengevaluasi pemetaan komoditas bertarif sebagai **Tier 0 (`COMMODITY_MAPPING_PRICE`)**.
      - Menggunakan `isMarkingGreaterOrEqual` dari `marking-matcher.ts` untuk membandingkan urutan marking code kapal secara presisi.
      - Jika memenuhi syarat (customer, cabang asal, moda, dan marking $\ge$ `startMarkingCode` atau tanggal agen $\ge$ `startAgentDate`), sistem langsung menetapkan tarif tersebut tanpa perlu mencari lembar master upload Excel.
  - **Pilih Pelanggan dari Master `tbCustomers` (`CommodityMappingModal.tsx`)**:
    - Pada modal Tambah/Edit Pemetaan Khusus Pelanggan (`scope === 'customer'`), daftar pilihan pelanggan diambil langsung dari master data **`tbCustomers`** melalui `customersApi.list` (`GET /api/customers`) dengan status aktif (`fdDiscontinued <> 1`).
    - **Pencarian Real-time & Debounce**: Dilengkapi pencarian kode/nama pelanggan dengan debounce 300ms (`useDebounce`) dan dropdown autocomplete yang menampilkan kode pelanggan (`fdCustCode`), nama resmi (`displayCustName(fdCustName)`), dan kota (`fdCityName`).
    - **Selected Customer Card**: Setelah customer dipilih, ditampilkan kartu informasi pelanggan terpilih lengkap dengan badge `tbCustomers`, nama terformat, dan tombol `"Ganti"` untuk mengubah pilihan secara cepat.
    - **Penyelesaian Otomatis (*Auto-Resolution*)**: Bila modal dibuka dengan parameter awal atau dalam mode edit, nama pelanggan otomatis diselaraskan melalui `customersApi.detail(custCode)` dari tabel `tbCustomers`.
  - **Tampilan Tabel Modern (`CommodityMappingPage.tsx`)**:
    - Dilengkapi kolom khusus **"Tarif Khusus (Tier 0)"** yang menampilkan badge harga langsung (`formatCurrency(item.price)`), kode marking awal (`🏷️ Mulai: >= 26GZD53`), dan tanggal agen.
    - Kolom **"Moda & Cabang"** menampilkan pill moda transportasi dan badge cabang asal (`GZ`, `YIWU`, dll).
  - Auto-suggestions pencarian nama komoditas lapangan (`commodityMappingApi.getSuggestions`).
  - Tombol aksi *"Apply Mappings to Upload"*: Mengaplikasikan aturan mapping langsung ke berkas upload tarif yang sudah ada di database.
- **Endpoint Terkait**:
  - `GET /api/commodity-mapping`: List mapping dengan pagination & filter search (menyertakan `price`, `branch`, `startMarkingCode`, `startAgentDate`, serta nama resmi dari `tbCustomers`).
  - `GET /api/commodity-mapping/suggestions?q=...`: Saran nama komoditas.
  - `GET /api/customers`: Pencarian dan pemilihan data master pelanggan dari `tbCustomers`.
  - `GET /api/customers/:id`: Detail customer untuk resolusi nama Single Source of Truth.
  - `POST /api/commodity-mapping`: Buat aturan mapping baru (mendukung `price`, `branch`, `startMarkingCode`, `startAgentDate`).
  - `PUT /api/commodity-mapping/:id`: Update aturan pemetaan.
  - `DELETE /api/commodity-mapping/:id`: Hapus aturan.
  - `POST /api/commodity-mapping/apply-to-upload`: Payload `{ uploadId, scope, custCode }`.

---

### 3.10. Modul Master Pelanggan (`src/features/customers/`)

#### A. Halaman Direktori Pelanggan (`CustomersPage.tsx`)
- **Tujuan & Alur**: Katalog master data resmi pelanggan (*Single Source of Truth* `tbCustomers`).
- **Fitur**:
  - **Toolbar Pelanggan & Dropdown Saran Cerdas (`CustomerToolbar.tsx`)**:
    - Terhubung langsung dengan `SearchSuggestionsDropdown` yang mengonsumsi endpoint `/api/customers/suggestions`.
    - **Debounce 300ms**: Menggunakan `useDebounce(search, 300)` untuk mempercepat pencarian data saran nama pelanggan, kode pelanggan, dan kontak telepon secara instan dan efisien.
    - Dilengkapi shortcut keyboard `Ctrl+K` untuk langsung fokus ke input pencarian, filter status pelanggan (Aktif / Discontinued / Semua), combobox pemilihan sales, filter kategori/tier, serta switch tampilan (Tabel, Grid, Shortlist).
  - Tabel master customer dengan kode pelanggan (`fdCustCode`), nama resmi (`fdCustName`), kontak PIC, alamat gudang/kantor, kota, nomor telepon, tier pelanggan (`VIP`, `Priority`, `Regular`), dan sales in-charge (`fdSalesNM`).
  - **Modal Detail Pelanggan (`CustomerDetailModal.tsx`)**:
    - Modal dialog komprehensif 3-tab ringkas yang menyajikan informasi terpusat pelanggan:
      1. **Ringkasan & Kontak (`info`)**: Kartu PIC & Sales, informasi kontak (Telepon, WA, Email, Kota), alamat kantor utama, catatan operasional, serta badge status keaktifan/blokir (`fdBlocked`).
      2. **Tier & Finansial (`finansial`)**: Kartu tier aktif, omset tahunan berjalan, progress bar kenaikan tier, dan tabel riwayat transaksi multi-tahun.
      3. **Daftar Alamat (`alamat`)**: Daftar kartu alamat kontak/cabang operasional lengkap (`vwCustomerContacts`).
- **Endpoint Terkait**:
  - `GET /api/customers`: Pagination `{ page, limit, search }`.
  - `GET /api/customers/suggestions`: Saran autocomplete pencarian pelanggan, kode (`custCode`), dan kontak (< 50ms).
  - `GET /api/customers/:id`: Rincian lengkap data master pelanggan.

---

### 3.11. Modul Administrasi Pengguna & Role (`src/features/user-management/`)

Modul eksklusif Administrator yang dilindungi oleh `AdminGuard`.

#### A. Manajemen Pengguna (`UserManagementPage.tsx`)
- **Fitur**:
  - Pengaktifan staf baru: Toggle status `isActive` (menyetujui akun yang mendaftar via register).
  - Penetapan role pengguna: Mengubah peran (`admin`, `staff`, `finance`, `logistics`, `viewer`).
  - Penautan karyawan fisik: Menghubungkan akun login dengan data master karyawan `fdEmpCode` (`/users/:id/employee`) agar transaksi penagihan otomatis tercatat atas nama staf yang tepat.
  - Tab *Trash (Sampah)*: Menampilkan akun yang dinonaktifkan/dihapus sementara dengan opsi *Restore* atau *Permanent Delete*.
- **Endpoint Terkait**:
  - `GET /api/users`: Daftar seluruh pengguna aktif.
  - `GET /api/users/trash`: Daftar pengguna di tong sampah.
  - `GET /api/users/employees`: Pilihan data karyawan master.
  - `PATCH /api/users/:id/status`: Payload `{ "isActive": boolean }`.
  - `PATCH /api/users/:id/role`: Payload `{ "role": string }`.
  - `PATCH /api/users/:id/employee`: Payload `{ "fdEmpCode": string | null }`.
  - `DELETE /api/users/:id`: Soft delete pengguna.
  - `PATCH /api/users/:id/restore`: Memulihkan pengguna dari sampah.
  - `DELETE /api/users/:id/permanent`: Menghapus permanen pengguna dari database.

#### B. Manajemen Role & Matriks Hak Akses (`RoleManagementPage.tsx`)
- **Fitur**:
  - Pembuatan role baru.
  - Matriks checkbox hak akses per rute halaman (`AVAILABLE_PATHS` terpusat di `userManagement.types.ts`, mencakup seluruh domain ERP: Overview, Logistik, Keuangan termasuk Kasir & Pelunasan Piutang serta Commodity Mapping, Master Data, dan Administrasi).
  - Penentuan rute default (*Default Route*) per role untuk pengalihan saat login pertama kali.
- **Endpoint Terkait**:
  - `GET /api/roles`: Daftar nama role sistem.
  - `POST /api/roles/:roleName`: Tambah role baru.
  - `GET /api/roles/:role`: Matriks izin rute role terpilih.
  - `PUT /api/roles/:role`: Simpan matriks izin `{ "permissions": [{ "path", "canView", "isDefault" }] }`.

---

### 3.12. Modul Profil & Pengaturan Akun (`src/features/profile/`)

#### A. Halaman Akun Pengguna (`AccountPage.tsx`)
- **Fitur Utama**:
  1. **Upload & Manajemen Foto Avatar (`AvatarUpload.tsx`)**:
     - Pengunggahan foto avatar profil pengguna dengan dukungan format JPEG, PNG, WEBP, dan GIF (maks. 3MB).
     - Pratinjau (*preview*) visual instan dengan fallback inisial nama jika belum ada foto atau terjadi galat muat gambar.
     - Penanganan hapus avatar menggunakan modal konfirmasi aman (`ConfirmModal`), mengembalikan foto ke inisial nama.
     - Sinkronisasi instan ke state pengguna global (`useAuthStore`) sehingga avatar di Topbar dan Tabel Pengguna langsung terupdate otomatis tanpa perlu refresh browser.
  2. **Ganti Kata Sandi (`ChangePasswordForm.tsx`)**:
     - Formulir pengubahan kata sandi mandiri dengan verifikasi kata sandi saat ini (`currentPassword`).
     - Validasi keamanan kata sandi baru (minimal 6 karakter) dan konfirmasi kecocokan secara *real-time* dengan visual badge penanda (Cocok / Tidak Cocok).
     - Tombol toggle intip/sembunyikan sandi (*eye toggle*) pada seluruh field sandi.
  3. **Informasi Pengguna (`ProfileInfoForm.tsx`)**:
     - Ringkasan identitas: Username (permanen/read-only), nama lengkap (dapat diedit), role badge sistem, tanggal terdaftar, dan waktu login terakhir.
  4. **Preferensi Tema Antarmuka (`ThemeSelectorCard.tsx`)**:
     - Pilihan 5 tema warna ERP resmi (`Heritage`, `Ocean`, `Emerald`, `Amber`, `Midnight Dark`).
  5. **Standar Loading State**:
     - Menerapkan `AccountPageSkeleton` dengan animasi `.skeleton-shimmer` wireframe saat pertama kali memuat data pengguna.
- **Endpoint Terkait**:
  - `GET /api/profile`: Mengambil profil pengguna aktif (`{ id, username, fullName, role, avatarUrl, createdAt, lastLoginAt }`).
  - `PUT /api/profile`: Memperbarui data teks profil (`{ fullName, avatarUrl }`).
  - `PUT /api/profile/password`: Mengubah kata sandi (`{ currentPassword, newPassword, confirmPassword }`).
  - `POST /api/profile/avatar`: Mengunggah berkas gambar foto avatar (multipart/form-data dengan field `avatar`).
  - `DELETE /api/profile/avatar`: Menghapus foto avatar profil dan mereset ke `null`.

---

### 3.13. Modul Kasir & Pelunasan Piutang (`src/features/cashier/`)

Modul ini mengadopsi sistem pencatatan pembayaran piutang dan alokasi faktur (Cashier Register) dari sistem Visual FoxPro dengan arsitektur **Two-Tier Receipt System**:
1. **Kasir Resmi (`RR-` Series)**:
   - Nomor registrasi resmi: `RR-XXXXXX-MM-YYYY` (reset otomatis setiap awal bulan baru).
   - Dikelola oleh Finance & Accounting untuk pelunasan piutang resmi dan posting akuntansi.
2. **Kasir Sementara (`TR-` Series)**:
   - Nomor registrasi sementara: `TR-XXXXXX-MM-YYYY` (reset bulanan, buffer lapangan/front office).
   - Fitur **Attach**: Mengonversi kasir sementara menjadi kasir resmi secara atomik tanpa re-input manual.

#### A. Halaman Daftar Transaksi Kasir (`ListPage.tsx`)
- **Fitur & Komponen**:
  - **Segmented Control Mode**: Tab **"Kasir Resmi (RR)"** vs **"Kasir Sementara (TR)"**.
  - **Kartu Metrik KPI (`CashierKpiCards.tsx`)**: Menampilkan Penerimaan Hari Ini, Pelunasan Faktur Hari Ini, Kasir Belum Seimbang (*unbalanced*), dan Antrean Kasir Sementara Pending.
  - **Toolbar Filter (`CashierToolbar.tsx`)**: Pencarian cepat nomor kasir / pelanggan, filter rentang tanggal, filter status posting (Open/Posted), dan tombol aksi pembuatan kasir baru.
  - **Tabel Transaksi (`CashierTable.tsx`)**: Daftar registrasi kasir dengan penjaminan *Single Source of Truth* nama pelanggan dari master `tbCustomers.fdCustName`, total uang masuk vs alokasi faktur, badge indikator keseimbangan (*Zero-Difference*), status posting, dan tombol aksi detail/attach.
  - **Modal Pembuatan (`CashierHeaderModal.tsx` & `TempCashierModal.tsx`)**: Pembuatan transaksi baru dengan auto-number bulanan dan opsi langsung menarik kasir sementara.
  - **Modal Konversi (`AttachTempReceiptModal.tsx`)**: Konversi kasir sementara ke resmi.
  - **Loading State Wireframe**: Menerapkan `CashierListSkeleton` dengan class `.skeleton-shimmer`.

#### B. Halaman Meja Kerja Kasir (`DetailPage.tsx`)
- **Fitur & Komponen**:
  - **Kartu Ringkasan Header**: Nomor registrasi, tanggal kasir, customer resmi, operator kasir, referensi kasir sementara, dan status posting/kunci data.
  - **Indikator Keseimbangan Finansial (`BalanceIndicatorBar.tsx`)**: Visual bar interaktif yang memantau total uang masuk (Grid 1) vs total alokasi faktur (Grid 2) dan selisihnya (*Zero-Difference Rule*).
  - **Grid 1: Penerimaan Uang (Kas / Bank / Giro)**:
    - Menampilkan baris instrumen pembayaran, mata uang, nilai kurs, nominal IDR, akun bank penampung, nomor warkat giro, jatuh tempo, tanggal kliring, dan bank asal warkat.
    - Dialog input (`PaymentReceivedModal.tsx`): Form dinamis cerdas yang mengaktifkan/menonaktifkan input warkat dan bank secara otomatis berdasarkan tipe pembayaran (CASH, TRANSFER BCA/Mandiri, atau GIRO).
  - **Grid 2: Alokasi Pelunasan Faktur Invoice**:
    - Menampilkan nomor invoice yang dipotong, tanggal faktur, mata uang, kurs, dan nominal alokasi pelunasan.
    - Dialog alokasi (`InvoiceAllocationModal.tsx`): Checklist interaktif faktur piutang customer yang belum lunas (`fdJumlah - fdBayar > 0`) dengan alokasi otomatis atau kustom.
  - **Aksi Transaksi**: Tombol Cetak Bukti Kasir, Hapus Transaksi, dan Hapus Baris Rincian yang dilindungi proteksi posting akuntansi (`fdPost = 1`).

- **Endpoint Terkait**:
  - `GET /api/cashier`: Mengambil daftar kasir resmi paginated.
  - `GET /api/cashier/temp`: Mengambil daftar kasir sementara paginated.
  - `GET /api/cashier/temp/unattached`: Mengambil daftar kasir sementara yang belum di-attach.
  - `GET /api/cashier/stats`: Mengambil statistik KPI kasir.
  - `GET /api/cashier/master-data`: Mengambil master bank penampung, mata uang, dan tipe pembayaran.
  - `GET /api/cashier/next-number`: Pratinjau auto-number bulanan berikutnya (`RR-` atau `TR-`).
  - `GET /api/cashier/:id`: Mengambil detail lengkap header, rincian uang masuk, alokasi faktur, dan status balance.
  - `GET /api/cashier/unpaid-invoices/:custCode`: Mengambil faktur piutang customer yang belum lunas.
  - `POST /api/cashier`: Membuat kasir resmi baru.
  - `POST /api/cashier/temp`: Membuat kasir sementara baru.
  - `POST /api/cashier/attach`: Mengonversi kasir sementara ke kasir resmi.
  - `PUT /api/cashier/:id`: Mengubah header kasir (jika belum terkunci).
  - `DELETE /api/cashier/:id`: Menghapus transaksi kasir beserta seluruh itemnya.
  - `POST /api/cashier/:id/rcv`: Menambahkan baris uang masuk kas/bank/giro.
  - `DELETE /api/cashier/:id/rcv/:rcvId`: Menghapus baris penerimaan uang.
  - `POST /api/cashier/:id/allocate`: Batch insert alokasi faktur invoice.
  - `POST /api/cashier/:id/details`: Batch insert alokasi faktur invoice.
  - `DELETE /api/cashier/:id/details/:detailId`: Menghapus baris alokasi invoice.
  - `POST /api/cashier/:id/overpayment-deposit`: Mengalihkan surplus uang masuk (overpayment) ke saldo deposit pelanggan dalam 1 klik untuk mencapai *Zero-Difference (Rp 0)*.

---

### 3.14. Modul Customer Wallet & Saldo Deposit Pelanggan (`src/features/wallet/`)

Modul ini mengelola saldo deposit di muka (*Advance Deposit*) milik pelanggan, pencatatan mutasi kredit/debit secara atomik (*Double-Entry Immutable Ledger*), dan integrasi penuh dengan modul kasir pelunasan piutang:
1. **Penyimpanan Saldo & Integritas**:
   - Saldo aktif disimpan pada tabel `[dbo].[tbCustomerWallet]` (`fdCustCode` 7-digit, `fdBalance`, `fdStatus`).
   - Setiap perubahan saldo (top-up, pembayaran kasir, pengalihan overpayment, refund pembatalan kasir, penarikan/withdrawal, atau koreksi memo) dicatat secara mutlak pada tabel buku besar `[dbo].[tbCustomerWalletLedger]` (`CREDIT` / `DEBIT`, `fdAmount`, `fdBalanceBefore`, `fdBalanceAfter`, `fdRefType`, `fdRefNo`, `fdCreatedBy`).
2. **Integrasi Meja Kerja Kasir (Zero-Difference Rp 0)**:
   - **Pembayaran via Deposit (`WALLET`)**: Staf kasir dapat memilih instrumen pembayaran `WALLET (SALDO DEPOSIT)`. Sistem otomatis memvalidasi saldo aktif pelanggan dan mendebit deposit secara aman dalam transaksi database.
   - **1-Click Overpayment Redirect**: Jika uang masuk melebihi total faktur (`totalRcv > totalDetail`), tombol *"Alihkan Surplus ke Deposit"* muncul di meja kerja kasir. Saat diklik, kelebihan bayar langsung ditambahkan ke deposit pelanggan dan baris penyeimbang `DEPOSIT` dicatat di alokasi kasir sehingga selisih kasir tepat Rp 0 (*Zero-Difference*).
   - **Refund Otomatis Pembatalan**: Jika baris uang masuk berinstrumen `WALLET` dihapus dari kasir, saldo yang sebelumnya terpotong otomatis dikembalikan (*refund*) ke akun deposit pelanggan.

#### A. Halaman Direktori Saldo & Mutasi (`ListPage.tsx`)
- **Fitur & Komponen**:
  - **Kartu Metrik KPI**: Menampilkan Total Saldo Deposit Aktif Perusahaan (Rp), Jumlah Pelanggan Bersaldo (> 0), Total Topup Masuk Hari Ini (Rp), dan Total Terpakai/Keluar Hari Ini (Rp).
  - **Tab 1: Saldo Pelanggan**:
    - Tabel saldo seluruh pelanggan dengan pencarian nama/kode, filter hanya yang memiliki saldo, status akun, tanggal update terakhir, dan tombol aksi cepat (+ Topup, - Tarik, Koreksi, Lihat Mutasi).
  - **Tab 2: Buku Besar Mutasi (Ledger Audit Trail)**:
    - Log audit transaksi mutasi mendalam dengan filter tipe transaksi (`TOPUP`, `PAYMENT`, `OVERPAYMENT`, `WITHDRAWAL`, `REFUND`, `ADJUSTMENT`), badge jenis transaksi outline, penanda kredit (+) hijau / debit (-) merah, nomor referensi, catatan, dan identitas staf operator (`fdCreatedBy`).
  - **Modal Setoran Deposit (`TopupModal.tsx`)**: Dialog top-up deposit dengan selektor customer, pilihan metode pembayaran (Transfer, Tunai, Giro), bank tujuan, nomor referensi bukti transfer, dan catatan.
  - **Modal Penarikan Dana (`WithdrawModal.tsx`)**: Dialog pengembalian dana ke rekening bank pelanggan dengan validasi plafon saldo, informasi bank/rekening/atas nama, dan tombol *Tarik Semua*.
  - **Modal Penyesuaian Saldo (`AdjustModal.tsx`)**: Dialog koreksi audit (Kredit/Debit) khusus Finance/Supervisor dengan alasan penyesuaian memo wajib.

- **Endpoint Terkait**:
  - `GET /api/wallet/stats`: Mengambil statistik ringkasan deposit.
  - `GET /api/wallet/customers`: Mengambil daftar saldo deposit pelanggan paginated.
  - `GET /api/wallet/customer/:custCode`: Mengambil detail saldo & 10 mutasi terakhir customer.
  - `GET /api/wallet/ledger`: Mengambil riwayat buku besar mutasi paginated & filtered.
  - `POST /api/wallet/topup`: Menambah saldo deposit customer.
  - `POST /api/wallet/withdraw`: Menarik saldo deposit ke rekening pelanggan.
  - `POST /api/wallet/adjust`: Penyesuaian koreksi saldo kredit/debit manual.
  - `POST /api/wallet/overpayment`: Mengalihkan kelebihan kasir ke deposit customer.

---

## 📊 4. Matriks Ringkasan Seluruh Endpoint API Backend Web Frontend

| No | Modul / Fitur | Endpoint API | HTTP Method | Parameter / Payload Kunci | Output Data & Deskripsi |
|:---|:---|:---|:---:|:---|:---|
| **1** | Auth | `/api/auth/login` | `POST` | `{ username, password }` | Token JWT, Info Sesi Pengguna, Role |
| **2** | Auth | `/api/auth/register` | `POST` | `{ fullName, username, password }` | Pendaftaran akun baru (status pending) |
| **3** | Overview | `/api/dashboard/stats` | `GET` | None | Statistik ringkasan operasional lintas domain |
| **4** | Shipments | `/api/shipments/kpi` | `GET` | `listType`, `search` | Agregasi KPI resi, koli, berat, volume, rasio moda |
| **5** | Shipments | `/api/shipments/branches` | `GET` | None | Daftar cabang pelabuhan/gudang aktif |
| **6** | Shipments | `/api/shipments` | `GET` | `page`, `limit`, `search`, `searchField`, `listType`, `branch` | Tabel resi, customer, koli, dimensi gudang |
| **6b** | Shipments | `/api/shipments/suggestions` | `GET` | `q` | Saran autocomplete resi, customer, marking (< 50ms, cache 30s) |
| **7** | Shipments | `/api/shipments/:id` | `GET` | Path `id` | Detail tunggal resi shipment |
| **8** | Shipments | `/api/shipments/:id/dimensions/gudang` | `GET` | Path `id` | Rincian fisik ukuran timbangan gudang |
| **9** | Shipments | `/api/shipments/:id/dimensions/packinglist` | `GET` | Path `id` | Rincian fisik ukuran dari packing list |
| **10** | Shipments | `/api/shipments/:id/dimensions/komplain` | `GET` | Path `id` | Rincian fisik ukuran revisi komplain |
| **11** | Marking | `/api/marking/kpi` | `GET` | `listType`, `search` | Agregasi kontainer & batch aktif |
| **12** | Marking | `/api/marking/exit-history` | `GET` | `month`, `listType`, `search` | Histori kalender tanggal keluar gudang |
| **13** | Marking | `/api/marking` | `GET` | `page`, `limit`, `search`, `listType`, `isClosed` | Daftar batch marking, BL/AWB, kontainer |
| **13b** | Marking | `/api/marking/suggestions` | `GET` | `q` | Saran autocomplete batch marking, kontainer, B/L, AWB (< 50ms) |
| **14** | Marking | `/api/marking/:id/manifest` | `GET` | Path `id` (`fdMarkingCode`) | Seluruh resi shipment (`vwShipment`) dalam batch |
| **15** | Marking | `/api/marking/:id/manifest/search` | `GET` | Path `id`, `q` | Pencarian langsung dalam manifest batch |
| **15b** | Marking Size Audit | `/api/marking/size-audit/:code` | `GET` | Path `code`, query `sort` (1/2) | Audit komparasi ukuran & tonase batch (17 kolom data + 5 KPI metrik) |
| **15c** | Marking Size Audit | `/api/marking/size-audit/:code/all-dimensions` | `GET` | Path `code` | Seluruh dimensi box 1 batch kargo untuk ekspor Excel 4 sheet |
| **15d** | Marking Size Audit | `/api/marking/box-dimensions/:listCode` | `GET` | Path `listCode` | Rincian dimensi fisik per box ($P \times L \times T$) 3 tab (Gudang, PL, Komplain) |
| **16** | Delivery Orders | `/api/delivery-orders/kpi` | `GET` | `year`, `month`, `search` | Agregasi KPI MTD, komparasi MoM & YoY, tren 12 bulan, dan status pengiriman armada |
| **17** | Delivery Orders | `/api/delivery-orders` | `GET` | `page`, `limit`, `search` | Daftar surat jalan, supir, plat mobil, estimasi |
| **17b** | Delivery Orders | `/api/delivery-orders/suggestions` | `GET` | `q` | Saran autocomplete surat jalan, customer, supir, mobil (< 50ms) |
| **18** | Delivery Orders | `/api/delivery-orders/:id` | `GET` | Path `id` | Rincian muatan resi pada surat jalan |
| **19** | Delivery Orders | `/api/delivery-orders/grouped` | `GET` | `listType`, `sent`, `search`, `page`, `limit` | Inventori stok kargo di gudang (inbound `tbEntryList`, fisik `tbEntryListDetail`, tipe komoditi, status outbound delivery) |
| **20** | Billing | `/api/billing/kpi` | `GET` | `search` | Ringkasan piutang, omzet, rasio lunas |
| **21** | Billing | `/api/billing/chart/by-employee-daily` | `GET` | `days` | Tren performa penagihan harian per sales |
| **22** | Billing | `/api/billing/chart/trends` | `GET` | `days` | Tren pergerakan nilai faktur per periode |
| **23** | Billing | `/api/billing/chart/sj-vs-bill` | `GET` | `days` | Komparasi surat jalan terbit vs faktur dibuat |
| **24** | Billing | `/api/billing/target-details` | `GET` | `type`, `pic` | Muatan barang terkirim yang belum ditagihkan |
| **25** | Billing | `/api/billing` | `GET` | `page`, `limit`, `search` | Tabel faktur invoice, status bayar, total tagihan |
| **25b** | Billing | `/api/billing/suggestions` | `GET` | `q`, `draftOnly` | Saran autocomplete no invoice, customer, marking (< 50ms) |
| **26** | Billing | `/api/billing/:id` | `GET` | Path `id` | Detail header faktur tagihan |
| **27** | Billing | `/api/billing/:id/details` | `GET` | Path `id` | Baris transaksi item resi dalam faktur |
| **28** | Billing | `/api/billing/employees` | `GET` | None | Daftar staf karyawan in-charge penagihan |
| **29** | Billing | `/api/billing/:id/issue` | `POST` | `{ fdEmpId }` | Penerbitan resmi faktur & penyerahan ke staf |
| **30** | Billing | `/api/billing/:id/details` | `PUT` | `{ items, saveToPrev }` | Pembaruan baris biaya dan diskon faktur |
| **31** | Billing | `/api/billing/report-template` | `GET` | None | Konfigurasi template JSON cetak invoice |
| **32** | Billing | `/api/billing/report-template` | `PUT` | `{ config }` | Simpan template desainer cetak invoice |
| **33** | Billing Validasi | `/api/billing/validation/list` | `GET` | `page`, `limit`, `search` | Audit status kesesuaian harga & M3 per faktur |
| **34** | Billing Validasi | `/api/billing/type2-compare-check` | `GET` | `invNo`, `listCode`, `markingCode` | Komparasi mendalam M3 vs KG faktur |
| **35** | Billing Validasi | `/api/billing/m3-check` | `GET` | `listCode` | Evaluasi hierarki ukuran M3 (Gudang/Komplain/PL) |
| **36** | Billing Validasi | `/api/billing/customer-tariff-audit/:custCode` | `GET` | Path `custCode` | Audit kesesuaian tarif kontrak customer |
| **37** | Local Charge | `/api/billing/pairing-local-charge` | `POST` | FormData (`file`) | Matching otomatis biaya lokal via berkas Excel |
| **38** | Local Charge | `/api/billing/pairing-local-charge/by-receipts` | `POST` | `{ receiptNos }` | Matching biaya lokal berdasarkan daftar resi |
| **39** | Local Charge | `/api/billing/pairing-local-charge/export-excel` | `POST` | `{ rows }` | Ekspor hasil pencocokan kembali ke Excel |
| **40** | Price List | `/api/price-list/filters` | `GET` | `sheetType`, `mode` | Pilihan opsi filter master tarif umum |
| **41** | Price List | `/api/price-list/trend` | `GET` | `sheetType`, `mode`, `branch`, `from`, `to` | Tren grafik fluktuasi harga rute |
| **42** | Price List | `/api/price-list/uploads` | `GET` | `page`, `pageSize` | Riwayat unggahan berkas master tarif umum |
| **43** | Price List | `/api/price-list/uploads/:id/diff` | `GET` | Path `id` | Bedah komparasi tarif baru vs tarif lama |
| **44** | Price List | `/api/price-list/uploads/:id/effective-date` | `PATCH` | `{ effectiveDate }` | Pembaruan tanggal berlaku tarif |
| **45** | Price List | `/api/price-list/upload` | `POST` | FormData (`file`) | Unggah berkas Excel master tarif umum |
| **46** | Price List | `/api/price-list/lookup` | `GET` | `{ date, mode, branch, category, markingCode }` | Pencarian tarif berlaku umum |
| **47** | Customer Price | `/api/customer-price-list` | `GET` | None | Daftar customer yang memiliki tarif kontrak khusus |
| **48** | Customer Price | `/api/customer-price-list/:custCode/active` | `GET` | Path `custCode` | Data tarif kontrak khusus aktif customer |
| **49** | Customer Price | `/api/customer-price-list/:custCode/uploads` | `GET` | `custCode`, pagination | Riwayat unggahan tarif per customer |
| **50** | Customer Price | `/api/customer-price-list/uploads/:id/diff` | `GET` | Path `id` | Bedah perbedaan tarif unggahan pelanggan |
| **51** | Customer Price | `/api/customer-price-list/:custCode/upload` | `POST` | FormData (`file`) | Unggah Excel tarif khusus pelanggan terpilih |
| **52** | Customer Price | `/api/customer-price-list/items` | `GET` / `POST` | Query / Payload item | CRUD komoditas khusus bertarif spesifik |
| **53** | Commodity | `/api/commodity-mapping` | `GET` / `POST` | Query / Payload mapping | Pemetaan nama variasi barang ke master kategori |
| **54** | Commodity | `/api/commodity-mapping/suggestions` | `GET` | `q`, `limit` | Saran nama barang dari transaksi operasional |
| **55** | Commodity | `/api/commodity-mapping/apply-to-upload` | `POST` | `{ uploadId, scope, custCode }` | Terapkan normalisasi ke riwayat upload tarif |
| **56** | Customers | `/api/customers` | `GET` | `page`, `limit`, `search` | Katalog data master pelanggan & PIC resmi |
| **56b** | Customers | `/api/customers/suggestions` | `GET` | `q` | Saran autocomplete customer, kode (`custCode`), kontak (< 50ms) |
| **57** | Customers | `/api/customers/:id` | `GET` | Path `id` | Detail profil master pelanggan |
| **58** | Users Admin | `/api/users` | `GET` | None | Manajemen daftar staf pengguna ERP |
| **59** | Users Admin | `/api/users/trash` | `GET` | None | Daftar staf yang dinonaktifkan (di tong sampah) |
| **60** | Users Admin | `/api/users/:id/status` | `PATCH` | `{ isActive: boolean }` | Mengaktifkan atau menonaktifkan akun staf |
| **61** | Users Admin | `/api/users/:id/role` | `PATCH` | `{ role: string }` | Mengubah level peran staf pengguna |
| **62** | Users Admin | `/api/users/:id/employee` | `PATCH` | `{ fdEmpCode }` | Mengaitkan user akun ke identitas karyawan fisik |
| **63** | Roles Admin | `/api/roles` | `GET` / `POST` | Name string | Daftar role dan pembuatan role baru |
| **64** | Roles Admin | `/api/roles/:role` | `GET` / `PUT` | Matriks permissions | Konfigurasi izin rute & rute default per role |
| **65** | Profile | `/api/profile` | `GET` | None | Mengambil data profil akun pengguna aktif |
| **66** | Profile | `/api/profile` | `PUT` | `{ fullName, avatarUrl }` | Memperbarui informasi nama dan avatar profil |
| **67** | Profile | `/api/profile/password` | `PUT` | `{ currentPassword, newPassword, confirmPassword }` | Mengubah kata sandi mandiri pengguna |
| **68** | Profile | `/api/profile/avatar` | `POST` | FormData (`avatar`) | Mengunggah dan menyimpan berkas foto profil avatar |
| **69** | Profile | `/api/profile/avatar` | `DELETE` | None | Menghapus foto profil avatar kembali ke inisial |
| **70** | Cashier | `/api/cashier` | `GET` | `page`, `limit`, `search`, `startDate`, `endDate`, `status`, `type` | Daftar transaksi kasir resmi (`RR-`) & sementara (`TR-`) |
| **71** | Cashier | `/api/cashier/stats` | `GET` | `startDate`, `endDate` | Statistik ringkasan KPI kasir resmi & sementara |
| **72** | Cashier | `/api/cashier/next-number` | `GET` | `type` (`OFFICIAL` / `TEMPORARY`), `date` | Pratinjau nomor otomatis kasir berikutnya (`RR-`/`TR-`) |
| **73** | Cashier | `/api/cashier/master-data` | `GET` | None | Master opsi bank, mata uang (`valuta`), dan pay types |
| **74** | Cashier | `/api/cashier/temp/unattached` | `GET` | `custCode`, `search` | Daftar kasir sementara berstatus unattached |
| **75** | Cashier | `/api/cashier/invoices/unpaid` | `GET` | `custCode`, `search` | Daftar faktur/invoice berstatus belum lunas (outstanding) |
| **76** | Cashier | `/api/cashier/official` | `POST` | Payload Header Kasir Resmi | Registrasi transaksi kasir resmi baru |
| **77** | Cashier | `/api/cashier/temp` | `POST` | Payload Header Kasir Sementara | Registrasi transaksi kasir sementara baru |
| **78** | Cashier | `/api/cashier/attach` | `POST` | `{ tempCashierId, officialDate, descr }` | Mengaitkan kasir sementara mandiri menjadi kasir resmi |
| **79** | Cashier | `/api/cashier/:id` | `GET` / `DELETE` | Path `id`, query `type` | Detail meja kerja kasir & pembatalan transaksi |
| **80** | Cashier | `/api/cashier/:id/rcv` | `POST` | Payload Instrumen Pembayaran | Menambah baris penerimaan uang (Kas/Bank/Giro/Wallet) |
| **81** | Cashier | `/api/cashier/:id/rcv/:rcvId` | `DELETE` | Path `id`, `rcvId`, query `type` | Menghapus baris penerimaan uang kasir & auto-refund jika WALLET |
| **82** | Cashier | `/api/cashier/:id/details` | `POST` | Payload Alokasi Faktur | Mengalokasikan pembayaran ke nomor invoice |
| **83** | Cashier | `/api/cashier/:id/details/:detailId` | `DELETE` | Path `id`, `detailId`, query `type` | Menghapus baris alokasi faktur kasir |
| **84** | Cashier | `/api/cashier/:id/overpayment-deposit` | `POST` | `{ amount }` | Mengalihkan kelebihan kasir ke saldo deposit customer (Zero-Difference Rp 0) |
| **85** | Customer Wallet | `/api/wallet/stats` | `GET` | None | Ringkasan saldo agregat, pelanggan aktif, mutasi kredit/debit hari ini |
| **86** | Customer Wallet | `/api/wallet/customers` | `GET` | `page`, `limit`, `search`, `hasBalance` | Daftar saldo deposit pelanggan beserta status dan tanggal update |
| **87** | Customer Wallet | `/api/wallet/customer/:custCode` | `GET` | Path `custCode` | Detail saldo deposit pelanggan aktif & 10 mutasi buku besar terakhir |
| **88** | Customer Wallet | `/api/wallet/ledger` | `GET` | `page`, `limit`, `search`, `txType`, `direction`, `startDate`, `endDate` | Daftar riwayat buku besar mutasi transaksi (audit trail) |
| **89** | Customer Wallet | `/api/wallet/topup` | `POST` | `{ custCode, amount, paymentMethod, bankId, refNo, notes }` | Setoran dana deposit pelanggan di muka (Advance Deposit) |
| **90** | Customer Wallet | `/api/wallet/withdraw` | `POST` | `{ custCode, amount, bankName, accountNo, accountName, notes }` | Penarikan dana deposit kembali ke rekening bank pelanggan |
| **91** | Customer Wallet | `/api/wallet/adjust` | `POST` | `{ custCode, direction, amount, reason }` | Koreksi memo audit penyesuaian saldo manual (Kredit/Debit) |
| **92** | Customer Wallet | `/api/wallet/overpayment` | `POST` | `{ custCode, amount, cashierId }` | Pengalihan kelebihan bayar kasir langsung ke saldo deposit |

---

## 🎨 5. Standar Desain Sistem, Multi-Tema & Pengalaman Pengguna (UX)

### 1. Token CSS Resmi 5 Tema
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

### 2. Aturan Mutlak Desain Mode Gelap (Midnight Dark)
- **Outline Border & Transparent Background**: Kartu KPI, chip filter, status badge, pill toggle, dan baris accordion WAJIB menggunakan `bg-transparent` dengan border tipis semantik (`border-[var(--color-border)]`, `border-amber-500/40`, dll).
- **DILARANG Tombol Solid Putih**: Tombol/tab aktif di mode gelap DILARANG menggunakan `bg-white` karena menyilaukan. Gunakan `bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)]`.
- **DILARANG Badge Solid Terang**: Dilarang menggunakan `bg-gray-100`, `bg-blue-100`, `bg-amber-100` pada badge di mode gelap. Gunakan badge outline semantik.

### 3. Pustaka Komponen UI Primitif Terpusat (Single Source of Truth: `src/components/ui/`)
Seluruh modul dan fitur aplikasi web **WAJIB** menggunakan komponen primitif terstandarisasi berikut untuk menghindari duplikasi kode (*spaghetti*) dan menjaga konsistensi visual multi-tema:

| Komponen | Berkas | Deskripsi & Aturan Penggunaan |
|---|---|---|
| `<Modal>` | `src/components/ui/Modal.tsx` | Dialog pop-up universal berbasis React Portal (`document.body`). Memiliki ESC key listener, body scroll lock, backdrop blur, dan animasi fade/scale. Mendukung compound pattern: `<Modal>`, `<Modal.Header>`, `<Modal.Body>`, `<Modal.Footer>` dengan standar ukuran: `sm`, `md`, `lg`, `xl`, `2xl`, `full`. |
| `<StatCard>` | `src/components/ui/StatCard.tsx` | Kartu metrik KPI eksekutif universal dengan visual ratio bar tipis (6px) rounded-full, indikator tren MoM (*Month-over-Month*), counter data tabular (`tabular-nums font-mono`), dan status skeleton shimmer otomatis. |
| `<StatusBadge>` | `src/components/ui/StatusBadge.tsx` | Komponen badge status tunggal (Single Source of Truth) untuk domain Billing, Validasi Audit, Delivery Order, dan Customer Tier. Menggunakan outline border semantik ramah mode gelap. |
| `<ConfirmModal>` | `src/components/ui/ConfirmModal.tsx` | Dialog konfirmasi aksi destruktif atau penting, dibangun di atas fondasi `<Modal>`. |
| `<Table>` | `src/components/ui/Table.tsx` | Komponen tabel ERP terstandarisasi dengan header sticky, zebra striping tematik, dan hover highlight lembut. |
| `<Pagination>` | `src/components/ui/Pagination.tsx` | Pengontrol navigasi halaman kompak dengan informasi rentang baris dan tombol prev/next. |
| `<SearchBar>` | `src/components/ui/SearchBar.tsx` | Kolom pencarian debounced terintegrasi dengan icon search dan tombol clear. |
| `<Button>` | `src/components/ui/Button.tsx` | Tombol primer, sekunder, outline, dan ghost dengan efek hover terstandarisasi. |
| `<EmptyState>` | `src/components/ui/EmptyState.tsx` | Komponen visual ketika data kosong atau hasil pencarian tidak ditemukan. |
| `<PageHeader>` | `src/components/ui/PageHeader.tsx` | Header halaman ERP terpadu memuat breadcrumbs 3-level, judul, dan toolbar aksi. |

### 4. Skala Font & Padding Kompak ERP
- **Judul Modal**: `15px font-bold font-[var(--font-label)] uppercase tracking-wide`.
- **Subtitle Modal**: `12px text-[var(--color-secondary)]`.
- **Tab & Filter**: `12px font-medium px-2.5 py-1.25`.
- **Header Kolom Tabel (`thead th`)**: `11px uppercase tracking-wider font-semibold py-2 px-3`.
- **Baris Data Tabel (`tbody td`)**: `12px tabular-nums`.
- **Footer Ringkasan / Actions**: `12px font-semibold px-3 py-1.5`.

### 5. Standar Loading State (Skeleton Shimmer)
- **Initial Load**: Menggunakan wireframe skeleton dengan animasi shimmer bawaan proyek (`.skeleton-shimmer`). DILARANG keras menggunakan fullscreen loading spinner bulat yang memblokir layar.
- **Subsequent Loading (Filter/Paging/Search)**: Mempertahankan data lama dengan overlay opacity tipis (`opacity-60 pointer-events-none`) atau indikator progress bar di atas tabel tanpa me-reset tampilan.
- **Modal Loading (`CustomerDetailModal`)**: Menggunakan `CustomerDetailBodySkeleton` dan `CustomerDetailFullSkeleton` berbasis `.skeleton-shimmer` yang proporsional (grid kontak & sales, tabel detail info key-value, progress tier) saat memuat detail rincian customer tanpa spinner bulat `Loader2`.

### 6. Standar Dual-Bahasa (i18n ID / EN)
- Dilarang meng-hardcode string literal dalam JSX.
- Seluruh teks visual (judul, breadcrumb, label tombol, header kolom, status toast) dibaca dari `t('key')` yang terdaftar berpasangan di `src/lib/i18n/id.json` dan `src/lib/i18n/en.json`.

### 7. Helper Normalisasi Karakter Legacy FoxPro & Penampilan Nama Customer (`src/lib/utils.ts`)
- **Akar Masalah**: Pada database warisan FoxPro, karakter petik tunggal (`'`) diubah dan disimpan sebagai tanda sisip (`^`) guna menghindari error sintaks atau celah SQL Injection (misal: `"MULTI TOY^S"` untuk nama customer `"MULTI TOY'S"`).
- **Fungsi Helper Pembersih Teks**: `cleanFoxProString(text: string | null | undefined): string` (dengan alias `normalizeFoxProText` dan `unmaskFoxProQuotes`) di `src/lib/utils.ts`. Mengembalikan string dengan semua karakter `^` dikembalikan ke `'`.
- **Standar Wajib Penampilan Nama Customer (`displayCustName`)**:
  ```ts
  displayCustName(
    input?: string | { fdCustName?: string | null; fdCustCode?: string | null } | null,
    fallback = '—'
  ): string
  ```
  - Menerima input berupa `string` langsung (`row.fdCustName`) maupun objek customer (`row.customer`, `{ fdCustName, fdCustCode }`).
  - Otomatis melakukan unmask tanda `^` menjadi `'` via `cleanFoxProString`.
  - Jika nama kosong, otomatis fallback ke `fdCustCode`, atau teks `fallback` (default `'—'`, atau kustom seperti `'Customer Tidak Dikenal'`).
  - **ATURAN MUTLAK**: Seluruh halaman dan komponen frontend (Billing, Customers, Shipments, Shipment Batches, Delivery Orders, Price List, Dashboard, dan Cetak Invoice) **WAJIB** membungkus setiap penampilan `fdCustName` dengan `displayCustName`.
- **Standar Kolom Customer Antrean Validasi Tagihan (`ValidationListPage.tsx`)**:
  - Kolom Customer memprioritaskan nama tagihan faktur **`fdBillTo`** (`row.customer?.fdBillTo`), dengan fallback ke nama master `fdCustName`.
  - Jika terdapat perbedaan antara `fdBillTo` dan `fdCustName`, sistem menampilkan badge penanda **`BillTo ≠ Master`** (ikon `AlertTriangle` warna amber) dan subline `Master: {fdCustName}` agar staf audit dapat langsung membedakan entitas penagihan vs identitas master pelanggan.
  - Pencarian (Search) di backend dan client-side otomatis mencocokkan `fdBillTo`.

### 8. Standar Autocomplete Search Suggestions & Debounced Toolbars (Single Source of Truth)

Untuk menjamin performa pencarian yang responsif (< 50ms) tanpa membebani server backend (*request flooding* saat mengetik cepat), seluruh 5 modul operasional utama web frontend menerapkan arsitektur pencarian saran terpadu:

1. **Komponen Primitif Terpadu `<SearchSuggestionsDropdown>` (`src/components/ui/SearchSuggestionsDropdown.tsx`)**:
   - Menerima props standar: `visible: boolean`, `suggestions: SuggestionItem[]`, `isLoading?: boolean`, `title?: string`, `onSelect: (item: SuggestionItem) => void`, `onClose: () => void`.
   - **Tipe Data `SuggestionItem`**: `{ type?: string, title: string, subtitle?: string, value: string }`.
   - **Desain Multi-Tema & Midnight Dark Mode**: Menggunakan styling CSS variables semantik (`bg-[var(--color-surface)]`, `border-[var(--color-border)]`, `text-[var(--color-primary)]`), backdrop-blur lembut, dan outline border tipis tanpa background solid putih atau badge terang menyala.
   - **Pemetaan Ikon & Tag Semantik**:
     - `resi` $\to$ `<Receipt />` (Amber)
     - `customer` $\to$ `<User />` (Sky)
     - `marking` $\to$ `<Tag />` (Indigo)
     - `container` $\to$ `<Box />` (Teal)
     - `bl_awb`, `sj`, `invoice` $\to$ `<FileText />` (Emerald)
     - `supir` $\to$ `<User />` (Amber)
     - `car` $\to$ `<Truck />` (Sky)
     - `code` $\to$ `<Tag />` (Blue)
     - `contact` $\to$ `<Phone />` (Emerald)

2. **Debounce Terpadu (`useDebounce(search, 300)`)**:
   - Seluruh query saran TanStack React Query (`useQuery`) di 5 toolbar menggunakan custom hook `useDebounce(search, 300)` (`src/hooks/useDebounce.ts`).
   - Waktu jeda 300ms terbukti optimal memberikan kesan pengetikan instan sembari mengurangi lebih dari 80% lalu lintas jaringan saat pengguna mengetik cepat.
   - Query hanya dipicu ketika `debouncedSearch.trim().length >= 2` dengan `staleTime: 30000` (30 detik in-memory client cache).

3. **Sinkronisasi Otomatis Lingkup Pencarian (Auto-Sync Scope) & Pencegahan Zero-Result**:
   - **`ShipmentToolbar.tsx`** (`GET /api/shipments/suggestions`):
     - Memilih saran `customer` otomatis mengubah `searchField` ke `'customer'`.
     - Memilih saran `marking` otomatis mengubah `searchField` ke `'marking'`.
     - Memilih saran `resi` otomatis mengubah `searchField` ke `'resi'`.
     - Fallback otomatis ke `'ALL'` untuk jenis saran lainnya.
     - **Hasil**: Mencegah kondisi *zero-result mismatch* saat pengguna mencari customer namun dropdown filter kolom masih terkunci pada nomor resi.
   - **`CustomerToolbar.tsx`** (`GET /api/customers/suggestions`):
     - Menyediakan autocomplete cerdas untuk nama pelanggan, kode master pelanggan (`custCode`), nomor kontak PIC, kota, dan telepon.
     - Dilengkapi keyboard shortcut `Ctrl+K` untuk langsung fokus ke input pencarian.
   - **`BatchToolbar.tsx`** (`GET /api/marking/suggestions`):
     - Menghubungkan dropdown dengan saran kode marking, nomor kontainer laut, B/L, dan AWB udara.
     - Memilih saran `marking` otomatis menyinkronkan `searchScope` ke `'code'`, dan tipe lainnya ke `'ALL'`.
   - **`DeliveryOrderToolbar.tsx`** (`GET /api/delivery-orders/suggestions`):
     - Menghubungkan dropdown dengan saran nomor Surat Jalan (`sj`), nama pelanggan (`customer`), nama supir (`supir`), dan plat kendaraan (`car`).
   - **`BillingToolbar.tsx`** (`GET /api/billing/suggestions`):
     - Menghubungkan dropdown dengan saran nomor invoice faktur (`invoice`), pelanggan (`customer`), dan kode marking (`marking`).
     - Memilih saran secara langsung menerapkan nilai pencarian (`search`), menutup dropdown, mereset halaman ke 1, dan mengeksekusi filter secara instan tanpa perlu pemilihan scope manual.

4. **Penanganan Interaksi Klik di Luar (*Click-Outside Listener*)**:
   - Setiap toolbar membungkus kotak pencarian dan dropdown dalam kontainer referensi `searchContainerRef = useRef<HTMLDivElement>(null)`.
   - Listener `document.addEventListener('mousedown', handleClickOutside)` memastikan dropdown saran tertutup secara otomatis dan mulus saat pengguna mengklik di luar area input.

---

## 🚀 6. Prosedur Build, Nginx Deployment & Troubleshooting

### 1. Perintah Build Produksi
```bash
cd c:\shipping\frontend
bun run build
# Perintah ini mengeksekusi: tsc -b && vite build
# Hasil kompilasi statis terbit di direktori: frontend/dist/
```

### 2. Integrasi Nginx Web Server (On-Premise)
Frontend disajikan di balik reverse proxy Nginx pada port 80 dengan path root `/mshipping/`:
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
> **Penting**: Konfigurasi `try_files $uri $uri/ /mshipping/index.html;` mutlak diperlukan agar browser refresh pada rute client-side (SPA) seperti `/mshipping/finance/billing/list` tidak menghasilkan galat **HTTP 404 Not Found**.

### 3. Distribusi Berkas APK Mobile Melalui Web Frontend
Direktori statis `frontend/dist/` juga berfungsi sebagai salah satu titik distribusi unduhan berkas APK aplikasi mobile Android:
- Berkas fisik: `frontend/dist/mshipping.apk`
- Tautan unduh publik: `http://36.93.22.142/mshipping/mshipping.apk`
- Landing page QR Scanner: `http://36.93.22.142/mshipping/download/`
