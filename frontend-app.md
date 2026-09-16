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
    │   │   ├── /logistics/delivery-orders    # Dashboard Surat Jalan & Armada Lapangan
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
  - Filter multibasis: Keyword, Field Selector (`ALL`, `customer`, `resi`, `marking`, `tracking`), Cabang, dan Moda (`Udara`/`Laut`).
  - **Toolbar Pencarian & Dropdown Saran Cerdas (`ShipmentToolbar.tsx`)**:
    - Terintegrasi langsung dengan `SearchSuggestionsDropdown.tsx` (`GET /api/shipments/suggestions?q=...`).
    - **Pencarian Ter-Debounce (300ms)**: Menggunakan custom hook `useDebounce(search, 300)` untuk mencegah banjir permintaan API selama pengetikan cepat.
    - **Sinkronisasi Otomatis Lingkup Pencarian (`searchField`)**: Saat pengguna memilih salah satu saran dari dropdown, `searchField` disinkronkan secara otomatis berdasarkan tipe item yang dipilih (`customer` $\to$ `'customer'`, `marking` $\to$ `'marking'`, `resi` $\to$ `'resi'`) sebelum menyetel teks pencarian, mengeliminasi masalah *zero-result mismatch* (faktur/resi tidak ditemukan akibat ketidaksesuaian kolom filter SQL).
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

---

### 3.5. Modul Surat Jalan & Inventori Gudang / Delivery Orders (`src/features/delivery-orders/`)

#### A. Halaman Dashboard & Inventori Gudang (`DashboardPage.tsx`)
- **Tujuan & Alur**: Bertindak sebagai *Warehouse Inventory & Delivery Orders Control Center* yang memadukan pemantauan stok kargo mengendap di gudang (*on-hand inventory*) dengan alur distribusi surat jalan armada lokal.
- **Fitur Utama**:
  1. **5 Kartu KPI Eksekutif Terintegrasi Gudang**:
     - **Stok Kargo Gudang (On-Hand)**: Total manifes kargo yang masih mengendap di gudang (belum selesai didistribusikan / `sent=0`), dilengkapi breakdown real-time Moda Laut vs Udara.
     - **Total Koli Terkirim**: Akumulasi koli yang telah sukses diserahkan ke pelanggan / tujuan.
     - **Total Surat Jalan**: Jumlah fisik surat jalan terbit yang terdaftar di sistem.
     - **Tonase Berat Terkirim**: Total berat aktual kargo terkirim (kg).
     - **Dalam Pengantaran (On Delivery)**: Jumlah surat jalan yang armadanya sedang bertugas di jalan dan belum selesai diserahkan (proses kirim / `fdSent = 0`). Menghilangkan redundansi dengan Total Surat Jalan.
  2. **Banner Alur Tahapan Gudang (Workflow Stage Cards)**:
     - Kartu Tahap 1: *Stok Mengendap di Gudang (Waiting Delivery)* — Menyorot volume kargo yang siap dijadwalkan pengiriman.
     - Kartu Tahap 2: *Kargo Selesai Terkirim (Fulfilled Deliveries)* — Rekapitulasi distribusi barang yang telah tuntas.
  3. **Tabel Inventori Stok Kargo di Gudang (Warehouse Inventory On-Hand)**:
     - **Switcher Moda Tab**: `[ 🚢 Kargo Laut ]` | `[ ✈️ Kargo Udara ]`
     - **Filter Status Stok**: `[ 📦 Di Gudang (On-Hand) ]` (`sent=0`), `[ ✅ Selesai Kirim ]` (`sent=1`), `[ Semua Kargo ]`.
     - **Live Search & Pagination**: Pencarian instan debounced (350ms) berdasarkan No. List (`fdListCode`), Marking, Resi, atau Customer.
     - **Kolom Tabel Lengkap**: No. List / Manifest Code, Marking & Customer, Komoditi & Cabang Asal, Total Masuk Gudang (Qty), Terkirim, Sisa On-Hand di Gudang, Visual Progress Bar Keterisian/Pengiriman, Status Badge (`100% In-Stock`, `Parsial`, `Selesai`), dan Tombol Aksi Cepat Buat Surat Jalan.
- **Endpoint Terkait**:
  - `GET /api/delivery-orders/kpi`: Ringkasan metrik status pengantaran armada & surat jalan.
  - `GET /api/delivery-orders/grouped`: Menggabungkan manifest inbound kargo (`tbEntryList`) dan outbound delivery (`tbDelivery`) dengan parameter `listType`, `sent`, `search`, `page`, dan `limit`.

#### B. Halaman Daftar Surat Jalan (`ListPage.tsx`) & Detail (`DetailPage.tsx`)
- **Fitur & Logika**:
  - **Toolbar Pencarian & Dropdown Saran Surat Jalan (`DeliveryOrderToolbar.tsx`)**:
    - Terhubung langsung dengan `SearchSuggestionsDropdown` yang mengonsumsi endpoint `/api/delivery-orders/suggestions`.
    - **Debounce 300ms**: Menggunakan `useDebounce(search, 300)` untuk mempercepat pengetikan tanpa membebani server backend.
    - Menampilkan saran terstruktur untuk nomor surat jalan (`sj`), pelanggan (`customer`), staf pengemudi (`supir`), dan plat nomor kendaraan (`car`).
    - Dilengkapi penutup dropdown saat klik di luar kontainer (*click-outside listener*).
  - Status Pengantaran Otomatis:
    - **Delivered** (Hijau): Jika `fdSent === 1`.
    - **On Delivery** (Biru): Jika tanggal sekarang $\ge$ `fdEstimasi` dan `fdSent === 0`.
    - **Scheduled / Pending** (Kuning): Jika tanggal sekarang $<$ `fdEstimasi` dan `fdSent === 0`.
  - Pengelompokan data berdasarkan Cabang (`branch-groups`) atau Marking (`marking-groups`).
  - Halaman detail menampilkan seluruh daftar resi fisik dan jumlah pack/berat muatan yang diangkut pada surat jalan terpilih.
- **Endpoint Terkait**:
  - `GET /api/delivery-orders`: Query `{ page, limit, search }`.
  - `GET /api/delivery-orders/:id`: Detail nomor surat jalan dan item resi terkait.
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
    - **Pencarian Ter-Debounce (300ms)**: Menggunakan `useDebounce(search, 300)` untuk responsivitas tinggi tanpa membebani database backend.
    - **Sinkronisasi Otomatis Cakupan (`searchField`)**: Saat pengguna memilih saran nomor faktur (`invoice`), pelanggan (`customer`), atau marking (`marking`), `searchField` disinkronkan secara otomatis (`'invNo'`, `'customer'`, atau `'marking'`) sebelum teks dimasukkan ke query pencarian, mencegah kesalahan hasil kosong (*empty result*).
    - Dilengkapi panduan pencarian popover interaktif dan penutup otomatis klik di luar (*click-outside listener*).
  - Pemilihan karyawan penagih (*Billing Staff / Collector*).
  - Aksi *Issue Invoice*: Mengunci tagihan dengan tanggal penyerahan resmi (`fdGiveDate`), nomor invoice, dan ID penagih.
  - Edit item tagihan tersimpan (`PUT /api/billing/:id/details`).
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
       - Menghitung nilai ideal tarif M3 vs aktual tagihan dan mendeteksi kondisi: **`EQUAL` (Sesuai)**, **`OVERWEIGHT`**, **`OVERCHARGE`**, atau **`UNDERCHARGE`**.
- **Endpoint Terkait**:
  - `GET /api/billing?hasAmount=true&draftOnly=true&noPagination=true&minYear=2023`: Daftar seluruh invoice antrean validasi draft.
  - `GET /api/billing/type2-compare-check`: Komparasi komprehensif M3 vs KG faktur.
  - `GET /api/billing/m3-check`: Evaluasi hirarki ukuran M3 per list code.
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
   - **Struktur Modular**:
     - `types.ts`: Tipe data kategori validasi audit (`SummaryModalTab`).
     - `ValidationSummaryHeader.tsx`: Header ringkasan audit dan status keseluruhan.
     - `ValidationSummaryTabsBar.tsx`: Navigasi tab status audit (`Item Tagihan & Tarif`, `Timbangan Fisik / Validasi M3`, `Overweight`, `Freight Charge`, `Transport & Ekspedisi`) yang dilengkapi semantic status tag pada masing-masing tab (`✓ Valid` / `Cek Tarif`, `✓ Sesuai` / `Selisih`, `✓ Aman` / `Perlu Cek`, `{totalFc} {curr}` / `Nihil`, `✓ Sesuai` / `Perlu Tagih`).
     - `FinancialAuditTab.tsx`: Panel audit tarif & komparasi ideal vs aktual tagihan. Seluruh kolom angka/tarif (`Tarif Tagihan`, `Tarif Acuan`, `Selisih`, `Sumber Acuan`, `Status Audit`, `Qty`, `No`) dilindungi dengan `whitespace-nowrap` dan min-width terdefinisi (`min-w-[125px]`, `min-w-[120px]`, `min-w-[130px]`) sehingga nominal mata uang (seperti `Rp. 10,000,000.00` dan `+Rp. 1,000,000.00`) tidak ter-wrap antar-baris, dan tabel secara mulus dapat digulir horizontal jika diperlukan.
     - `PhysicalAuditTab.tsx`: Panel audit M3 vs KG & single/bill gabungan.
     - `OverweightAuditTab.tsx`: Panel audit batas toleransi tonase muatan armada.
     - `FreightAuditTab.tsx`: Panel audit biaya Freight Charge valas dan ringkasan list batch EntryList operasional.
     - `TransportAuditTabContent.tsx`: Panel audit biaya ekspedisi lokal (tbExpIndo) & status penagihan transport.
      - `ValidationSummaryFooter.tsx`: Footer aksi persetujuan (*issue/approve*) dengan tombol proporsional seimbang berbasis pustaka UI primitif terpusat `<Button>` (`size="sm"`, `rounded-[var(--radius-md)]` 6px agar tidak berbentuk pill lonjong/kapsul). Tombol "Terbitkan Invoice" beraksen emerald dengan ikon `<Send />`, serta tombol "Tutup" sekunder bertema dinamis yang menutup modal sebelum memicu aksi `onOpenIssueModal`.

4. **Sentralisasi Tipe TypeScript (`src/features/billing/types/billing.types.ts`)**:
   - Seluruh tipe data inti (`M3CheckResponse`, `MarkingDetailItem`, `PriceItem`, `FlatDetailTraceItem`, `CustomerBillingHistoryItem`, `ValidationCategory`, dll) dipusatkan di berkas ini sebagai **Single Source of Truth (SSOT)**. Komponen `.tsx` dilarang mendefinisikan interface yang digunakan lintas berkas.

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
5. **Special Commodity Price CRUD**: Manajemen harga khusus untuk varian komoditas tertentu pelanggan (misal: kosmetik, baterai, cairan) dengan status *Active* / *Expired*.
- **Endpoint Terkait**:
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
Menghubungkan variasi penulisan nama komoditas yang tidak beraturan dari data mentah packing list/lapangan (misal: `"BAJU ANAK"`, `"KAOS KATUN"`, `"TEKSTIL"`) ke kategori master tarif resmi perusahaan (misal: `"GARMENT"`).
- **Scope Pemetaan**:
  - `global`: Berlaku untuk seluruh pengiriman umum.
  - `customer`: Berlaku khusus hanya untuk pengiriman pelanggan tertentu.
- **Fitur Utama**:
  - Auto-suggestions pencarian nama komoditas lapangan.
  - Tombol aksi *"Apply Mappings to Upload"*: Mengaplikasikan aturan mapping langsung ke berkas upload tarif yang sudah ada di database.
- **Endpoint Terkait**:
  - `GET /api/commodity-mapping`: List mapping dengan pagination & filter search.
  - `GET /api/commodity-mapping/suggestions?q=...`: Saran nama komoditas.
  - `POST /api/commodity-mapping`: Buat aturan mapping baru.
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
  - Modal rincian profil pelanggan.
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
  - Matriks checkbox hak akses per rute halaman (Can View / Tidak).
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
| **16** | Delivery Orders | `/api/delivery-orders/kpi` | `GET` | `search` | Agregasi status pengiriman surat jalan armada |
| **17** | Delivery Orders | `/api/delivery-orders` | `GET` | `page`, `limit`, `search` | Daftar surat jalan, supir, plat mobil, estimasi |
| **17b** | Delivery Orders | `/api/delivery-orders/suggestions` | `GET` | `q` | Saran autocomplete surat jalan, customer, supir, mobil (< 50ms) |
| **18** | Delivery Orders | `/api/delivery-orders/:id` | `GET` | Path `id` | Rincian muatan resi pada surat jalan |
| **19** | Delivery Orders | `/api/delivery-orders/grouped` | `GET` | Params query | Pengelompokan agregat surat jalan |
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
     - Memilih saran `invoice` otomatis menyinkronkan `searchField` ke `'invNo'`.
     - Memilih saran `customer` otomatis menyinkronkan `searchField` ke `'customer'`.
     - Memilih saran `marking` otomatis menyinkronkan `searchField` ke `'marking'`.
     - Fallback otomatis ke `'ALL'`.

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
