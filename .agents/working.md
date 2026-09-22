# 📋 Working Context — mshipping

> **WAJIB DIBACA** oleh setiap AI Agent di awal sesi. WAJIB DIUPDATE di akhir sesi sebelum percakapan ditutup.
> File ini adalah **satu-satunya sumber kebenaran** tentang kondisi pekerjaan aktual proyek saat ini.
>
> 📚 **Riwayat pekerjaan lama** → lihat [history/history-2026-09.md](./history/history-2026-09.md)

---

### 🕐 Terakhir Diperbarui
- **Tanggal**: 2026-09-22
- **Oleh**: Antigravity AI
- **Sesi**: Audit Menu Lanjutan — Live KPI Cards Billing, Dual-Bahasa Penuh Customer Price List, & Breadcrumb 3-Level Overview Dashboard

---

## 📍 Pekerjaan Terakhir Yang Dikerjakan

- [x] **Penyelesaian Masalah Kritis Hasil Audit Menu & Dashboard ERP**:
  1. **Billing Dashboard (`features/billing/pages/DashboardPage.tsx`)**:
     - Memperbaiki bug UX di mana kartu KPI sebelumnya berisi data dummy statis (`KPI_CARDS`).
     - Menghubungkan seluruh kartu KPI secara dinamis ke data live API (`useBillingDashboard` $\to$ `kpis`):
       - Target Bill Hari Ini (Udara): kuantitas listcode dan rincian per PIC (Kiki vs Yati) terhubung ke `ROUTES.BILLING_TARGET`.
       - Target Bill Hari Ini (Laut): kuantitas listcode dan rincian per PIC (Thara, Rico, Ferly) terhubung ke `ROUTES.BILLING_TARGET`.
       - Invoice Terbit Bulan Ini: total invoice terbit bulan berjalan, persentase tren MoM (`↗`/`↘`/`→` % vs bulan lalu) atau breakdown per moda (Udara vs Laut), terhubung ke `ROUTES.BILLING_LIST`.
       - Total Nominal Tagihan Bulan Ini: akumulasi nominal rupiah tagihan terbit bulan ini (`formatCurrency`), persentase tren MoM atau breakdown per moda (`formatCompactRupiah`), terhubung ke `ROUTES.BILLING_LIST`.
  2. **Customer Price List (`features/customer-price-list/pages/ListPage.tsx`)**:
     - Menghilangkan lebih dari 30 string teks bahasa Indonesia hardcode pada tabel, toolbar, kartu mobile, badge, dan modal.
     - Menggantikan string hardcode dengan kunci i18n terstruktur (`customerPriceList.*`), terpasang berpasangan pada `id.json` dan `en.json`.
     - Menghilangkan anti-pattern `console.error` pada handler data.
     - Menyediakan teks bilingual penuh untuk modal konfirmasi akhiri masa berlaku dan modal hapus tarif khusus.
  3. **Overview Dashboard (`features/dashboard/pages/DashboardPage.tsx`)**:
     - Menyesuaikan breadcrumb `DashboardSkeleton` dan halaman utama menjadi **3-Level Standar ERP**: `{ t('module.overview') }` $\to$ `{ t('nav.dashboard') }` $\to$ `{ t('dashboard.overviewTitle') }`.
     - Mengganti teks subtitle modal alert kedatangan dan SLA menjadi dinamis via i18n (`dashboard.etaNotExitDesc` dan `dashboard.missedSlaDesc`).
  4. **Verifikasi Build**:
     - Seluruh perubahan diverifikasi dengan `npm run build` sukses 100% tanpa galat (`✓ built in 3.01s`).

- [x] **Cleanup & Perbaikan Relevansi Menu Delivery Orders (Opsi A)**:
  - **Latar Belakang & Permintaan User**: User menanyakan apakah menu Delivery Orders dan submenu-nya masih relevan.
  - **Analisis**: Setelah audit menyeluruh, ditemukan 4 masalah pada DashboardPage:
    1. Label sidebar generik "Dashboard" tidak menjelaskan konteks → seharusnya "Dashboard Surat Jalan"
    2. DashboardPage menggunakan key i18n yang salah (`do.inventoryTitle`) padahal ada `do.dashboardTitle` yang lebih tepat
    3. Breadcrumb Level 2 hardcoded `'Distribusi & DO'` — belum pakai `t()`
    4. Shortcut card ke `ROUTES.SHIPMENTS` dan `ROUTES.SHIPMENT_BATCHES` di DashboardPage DO — membingungkan karena lintas modul
  - **Perubahan Terpasang**:
    - **`frontend/src/components/layout/Sidebar.tsx`** (line 82): Label submenu Dashboard DO diganti dari `t('nav.dashboard')` → `t('nav.deliveryOrderDashboard')` ("Dashboard Surat Jalan")
    - **`frontend/src/features/delivery-orders/pages/DashboardPage.tsx`**:
      - Judul halaman: dari `t('do.inventoryTitle')` → `t('do.dashboardTitle')`
      - Subtitle: dari `t('do.inventorySubtitle')` → `t('do.dashboardSubtitle')`
      - Breadcrumb Level 2: dari hardcoded `'Distribusi & DO'` → `t('nav.deliveryOrder')`
      - Breadcrumb Level 3: dari `t('nav.dashboard')` → `t('nav.deliveryOrderDashboard')`
      - Action button labels: dari hardcoded → `t('nav.warehouseInventory')` dan `t('nav.deliveryOrderList')`
      - Card titles/descriptions/actions: semua via `t()` — tidak ada lagi hardcoded string
      - Grid shortcut cards: dari `4 kolom (lg:grid-cols-4)` → `2 kolom (sm:grid-cols-2)` karena card Shipments & Batch Marking dihapus
      - **Hapus shortcut card ke Shipments** ("Pengiriman Logistik") dan **Batch Marking** ("Batch Marking Kontainer") — tidak relevan di halaman Delivery Orders
      - **Hapus unused imports** `Layers` dan `Truck` dari lucide-react
    - **`frontend/src/lib/i18n/id.json`**: Tambah 12 key baru: `do.dashboardTitle/Subtitle`, `do.warehouseStockTitle/Desc/Action/Monitor`, `do.deliveredCargoTitle/Desc/Action/Archive`, `do.openInventory`, `do.openListDO`
    - **`frontend/src/lib/i18n/en.json`**: Sinkronisasi keys setara id.json (12 key baru)
  - **Verifikasi**: `npm run build` sukses 100% tanpa galat TypeScript (`built in 11.79s`).

  - **Latar Belakang & Permintaan User**: User meminta evaluasi apakah `/delivery-orders/inventory` dan `/delivery-orders/list` redundant, apa yang perlu diperbaiki, dan apakah navigasi logis.
  - **Analisis**: Kedua halaman punya tujuan berbeda (Inventory = buat SJ baru dari stok gudang; List = riwayat SJ yang sudah terbit), namun ada overlap yang membingungkan: filter "Terkirim"/"Semua" ada di InventoryPage, dan "Buka SJ" inline accordion di InventoryPage membuat user melihat riwayat di tempat yang salah.
  - **Perubahan Terpasang**:
    - **`frontend/src/features/delivery-orders/pages/InventoryPage.tsx`**:
      - **Hapus `statusFilter` state** — InventoryPage kini selalu `sent='0'` (hanya stok belum terkirim).
      - **Hapus filter tombol "Belum Kirim"/"Terkirim"/"Semua"** dari toolbar — tidak relevan di halaman inventori.
      - **Hapus accordion "Buka SJ" inline** (hapus `expandedListCodes` state, `toggleExpand()`, baris `<tr>` accordion, dan import `DeliveryOrderDetails`).
      - **Ganti tombol "Buka SJ"** dengan `<Link to={ROUTES.DELIVERY_ORDERS_LIST?listCode=xxx}>` yang mengarahkan ke ListPage dengan filter listCode pre-filled.
      - **Fix breadcrumb Level 3**: Sebelumnya menampilkan `nav.warehouseInventory` (label baru "Buat Surat Jalan"), sekarang menggunakan `nav.warehouseInventoryFull` ("Inventori Kargo Gudang") yang lebih deskriptif untuk breadcrumb.
      - **Hardcoded strings** diganti ke `t()`: "Buka Riwayat Surat Jalan", "Inventori Stok Kargo di Gudang", "Buat SJ", "Buka SJ", "Belum Dibuat SJ", "Parsial Terkirim", "Selesai Terkirim", dsb.
      - **Cleanup imports**: Hapus `Fragment`, `ChevronDown`, `ChevronRight`, `FileText`, `DeliveryOrderDetails` — ganti dengan `ExternalLink`.
    - **`frontend/src/lib/i18n/id.json` & `en.json`**:
      - `nav.warehouseInventory`: diubah → "Buat Surat Jalan" / "Create Delivery Order" (label sidebar yang lebih intuitif bagi operator)
      - `nav.warehouseInventoryFull`: baru → "Inventori Kargo Gudang" / "Warehouse Cargo Inventory" (untuk breadcrumb & judul halaman)
      - `nav.deliveryOrderList`: diubah → "Riwayat Surat Jalan" / "Delivery Order History"
      - Keys baru: `delivery.inventory.createSJ`, `delivery.inventory.openSJ`, `delivery.inventory.openHistorySJ`, `delivery.inventory.noSJYet`, `delivery.inventory.partialSent`, `delivery.inventory.fullySent`, `delivery.inventory.manageTitle`, `delivery.inventory.allStock`
  - **Verifikasi**: `npm run build` sukses 100% tanpa galat TypeScript (`built in 2.72s`).

- [x] **Analisis Lengkap Form Pembayaran Sementara (`fr3_regpayment.scx` / `TR-` Series) & Integrasi Alur Attach**:
  - **Latar Belakang & Konfirmasi Pengguna**:
    - *"fr3_regpayment.scx -> ini adalah form input pembayaran sementara"*
  - **Penyelidikan & Analisis Berkas FoxPro (`c:\sejdb\sejdb2018\forms\`)**:
    - **`fr3_regpayment.scx` (Register Pembayaran Sementara)**: 70 objek kontrol UI, mengelola transaksi kasir sementara ber-prefix **`TR-XXXXXX-MM-YYYY`** (contoh: `TR-000001-09-2026`).
    - **Trio Tabel Sementara Terisolasi**:
      - `tb2Cashier`: Header pembayaran sementara (`fdCashierID`, `fdCashierDate`, `fdCustCode`, `fdDescr`, `fdCreated`, `fdPost`).
      - `tb2CashierRcv`: Rincian uang masuk sementara kas/bank/giro (`fdID`, `fdType`, `fdCCYCode`, `fdCurrValue`, `fdAmount`, `fdBankID1`, `fdGiroNo`, `fdDate1`, `fdDate2`, `fdBankId2`).
      - `tb2CashierDetail`: Rincian alokasi faktur/invoice sementara (`fdInvNo`, `fdAmount`, `fdCurValue`, `fdTotal`).
    - **Counter Khusus Kasir Sementara**:
      - `tbMasterCounter` menggunakan kode **`fdCode = 'B'`** (sedangkan kasir resmi `RR-` menggunakan `fdCode = 'A'`).
      - `fdCRCounter`: Auto-increment nomor baris penerimaan uang sementara.
      - `fdCDCounter`: Auto-increment nomor baris alokasi faktur sementara.
    - **Ekosistem Form Pendamping `fr3_`**:
      - `fr3_inputpay2.scx`: Dialog pembuatan kasir sementara (`sp_tb3Cashier`) & lookup data kasir `TR-`.
      - `fr3_inputrcv.scx` & `fr3_inputrcv2.scx`: Input & edit penerimaan uang sementara dengan sinkronisasi kurs `tbMataUang.fdCCYValue` dan bank `tbBank`.
      - `fr3_inputdtl.scx` & `fr3_inputdtl2.scx`: Input alokasi faktur sementara manual.
      - `fr3_checkbilling.scx`: Checklist alokasi faktur piutang belum lunas (`sp_tb2BillingTotalView`).
    - **Mekanisme Fitur "Attach" (`frm_inputpay_attach.scx` / `sp_tbCashierSearch_attach`)**:
      - Menjembatani transaksi kasir sementara (`TR-`) ke kasir resmi (`RR-`).
      - Membuka popup daftar kasir sementara yang belum di-attach (`EXECUTE sp_tbCashierSearch_attach`).
      - Menyalin data dari `tb2CashierRcv` ke `tbCashierRcv` dan `tb2CashierDetail` ke `tbCashierDetail`.
      - Mencatat referensi nomor kasir sementara pada header kasir resmi: `tbCashier.fdCashierXX = 'TR-XXXXXX-MM-YYYY'`.
      - Mengunci kasir sementara (`tb2Cashier.fdPost = 1`) agar tidak dapat di-attach berulang kali.
  - **Pembaruan Berkas Dokumentasi & Perencanaan**:
    - [`pelunasan.md`](file:///c:/shipping/pelunasan.md): Ditambahkan Bab 6 (Analisis Lengkap Modul Pembayaran Sementara `fr3_regpayment.scx`), Bab 7 (Mekanisme Proses Attach & Konversi `TR-` ke `RR-` dengan Mermaid Flowchart), serta pembaruan tabel hubungan form dan Stored Procedure.
    - [`pelunasan-plan.md`](file:///c:/shipping/pelunasan-plan.md): Ditambahkan spesifikasi endpoint REST API untuk kasir sementara (`/api/cashier/temp`, `/api/cashier/attach`), transaksi atomik prisma untuk proses attach, tab navigasi "Kasir Resmi (RR)" vs "Pembayaran Sementara (TR)" di `ListPage.tsx`, modal `AttachTempReceiptModal.tsx`, Bab 3.4 (Matriks Hak Akses & Peran Pengguna / RBAC), Bab 3.5 (Arsitektur Sistem Dual Bahasa i18n ID/EN dengan 36 key terjemahan), serta **Bab 4 (Rancang Bangun Sistem Baru: Customer Wallet / Saldo Deposit Pelanggan)** lengkap dengan skema tabel `tbCustomerWallet`, `tbCustomerWalletLedger`, pessimistic locking, 7 endpoint `/api/wallet`, dan alur integrasi pelunasan kasir & overpayment.

- [x] **Penyusunan Rencana Arsitektur & Peta Jalan Modul Cashier Pelunasan Piutang ([`pelunasan-plan.md`](file:///c:/shipping/pelunasan-plan.md))**:
  - **Latar Belakang & Permintaan Pengguna**:
    - *"buatkan pelunasan-plan.md yang berisi plan modul cashier dan endpoint Backend API terkait"*
  - **Isi Rencana Komprehensif (`pelunasan-plan.md`)**:
    1. **Spesifikasi Lengkap 17 Endpoint Backend REST API (`/api/cashier`)**:
       - List, Stats KPI, Master Data (`tbMataUang` -> kurs `fdCCYValue`, `tbBank` -> `fdBankCode`, `tbPayType`), Unpaid Invoices per Customer, Detail Kasir Lengkap.
       - CRUD Header Kasir (`tbCashier`), Penerimaan Uang Kas/Bank/Giro (`tbCashierRcv`), dan Batch Alokasi Faktur Piutang (`tbCashierDetail`).
       - Fitur Attach Kasir Sementara, Ekspor PDF Bukti Kasir terstandar, dan Ekspor Excel.
    2. **Logika Bisnis Finansial & Keamanan Database**:
       - Validasi Zod Schemas lengkap dengan aturan kondisional (CASH vs TRANSFER vs GIRO).
       - *Zero-Difference Balancing*: Kalkulasi otomatis total penerimaan vs total alokasi (`fdSelisih = 0`).
       - **Auto-Numbering Reset Bulanan (`RR-XXXXXX-MM-YYYY`)**: Format resmi `RR-000001-01(BULAN)-2011(TAHUN)` dengan 6 digit sequence leading zero yang **otomatis di-reset kembali ke 000001 setiap awal bulan baru** dengan penguncian atomic database (`UPDLOCK, HOLDLOCK`).
       - Auto-numbering thread-safe dengan atomic increment pada `tbMasterCounter` (`fdCRCounter` & `fdCDCounter`).
       - Proteksi posting akuntansi (`fdPost = 1`) yang mengunci edit/delete dan mengalihkan ke mode read-only.
       - Penjaminan Single Source of Truth nama pelanggan via master `tbCustomers.fdCustName`.
    3. **Arsitektur Frontend Web ERP (`src/features/cashier/` / `billing/`)**:
       - Halaman Daftar (`ListPage.tsx`) dan Meja Kerja Kasir (`DetailPage.tsx`).
       - Komponen Modal Interaktif: `CashierHeaderModal`, `PaymentReceivedModal` (kondisional dinamis), `InvoiceAllocationModal` (checklist faktur belum lunas), dan `BalanceIndicatorBadge` (visual alert).
       - Kepatuhan Desain ERP: Midnight Dark Mode (tanpa tombol solid putih), 3-level breadcrumbs ERP, kamus i18n ID/EN berpasangan, dan loading skeleton shimmer.
    4. **Roadmap 4 Fase Eksekusi & Verification Plan**:
       - Fase 1: Fondasi Backend & Skema Database.
       - Fase 2: Logika Bisnis Penerimaan, Alokasi, & Ekspor.
       - Fase 3: Antarmuka Web Frontend & Modal Interaktif.
       - Fase 4: Pengujian End-to-End, Benchmark Kecepatan (< 50ms), & Rilis.

- [x] **Analisis Mendalam & Pembuatan Dokumentasi Modul Pelunasan Kasir (`pelunasan.md`) dari Form Visual FoxPro (`frm_regpayment.scx`, `frm_inputpay2.scx`, `frm_inputRcv.scx`)**:
  - **Latar Belakang & Permintaan Pengguna**:
    - *"buat pelunasan.md dan baca c:\sejdb\sejdb2018\forms\frm_regpayment.scx"*
    - *"baca juga frm_inputpay2.scx dan frm_inputRcv.scx lalu update pelunasan.md"*
  - **Penyelidikan & Analisis Berkas FoxPro (`c:\sejdb\sejdb2018\forms\`)**:
    - **`frm_regpayment.scx` (Orkestrator Sentral)**: 75 record objek UI, 30 procedure/method, Grid 2 (`tbmscashierrcv`), Grid 1 (`tbmscashierdetail`), validasi selisih dengan `Timer8` kedip merah, eksekusi Stored Procedure kalkulasi total.
    - **`frm_inputpay2.scx` (Dialog Header & Lookup Kasir)**:
      - Mode Ganda: Create Kasir Baru (`sp_tbCashier`) & Lookup Kasir Existing (`frm_inputpaylist`).
      - Auto-numbering format `RR-xxxxxx-...` berbasis counter sesi `_CounterReg + 1` dan suffix `_StrKanan`.
      - Validasi pelanggan (`fdCustCode` & `fdCustName`) dengan helper `PutComma`, tombol popup `cmd4` (`frm_customerslist1_rev1`).
      - Proteksi posting accounting (`tbCashier.fdPost = 1`), konfirmasi dialihkan ke mode read-only `frm_view_billing`.
    - **`frm_inputRcv.scx` (Dialog Input Penerimaan Uang Kas/Bank/Giro)**:
      - Logika kondisional dinamis `fdType.InteractiveChange`:
        - `CASH`: Auto-reset & disabled seluruh field bank dan giro warkat.
        - `TRANSFER`: Auto-fill Bank default BCA (`BCB`), auto-fill tanggal kasir ke tanggal giro & tanggal kliring efektif.
        - `GIRO`: Enable input nomor warkat, bank tertarik (`fdBankID2`), bank penerima (`fdBankID1`), tanggal giro, dan tanggal efektif.
      - Auto-sync nilai kurs mata uang dari kursor `tbMataUang.fdCCYValue`.
      - Auto-increment nomor baris penerimaan 7-digit via counter `tbMasterCounter.fdCRCounter + 1` (`fdCode = 'A'`).
      - Eksekusi Stored Procedure `sp_tbCashierRcv` dengan format tanggal MDY.
  - **Penyusunan & Pembaruan Dokumentasi Komprehensif ([`pelunasan.md`](file:///c:/shipping/pelunasan.md))**:
    - Memperbarui berkas dokumentasi dengan diagram urutan interaksi data (Mermaid Sequence Diagram), inventaris kontrol dan properti detail untuk ketiga form, bedah logika kondisional form per form, serta rekomendasi desain modal web ERP mshipping yang mematuhi aturan single source of truth `tbCustomers.fdCustName` dan Midnight Dark Mode.

- [x] **Optimalisasi & Perbaikan Menyeluruh Autocomplete Search Suggestions (Multi-Platform: Backend, Web Frontend, & Mobile App)**:
  - **Latar Belakang & Keluhan Pengguna**:
    - User mengeluhkan saran pencarian lambat dan tidak terkoneksi dengan benar (*"Perbaiki sugestion pada setiap search, karena lambat dan tidak terkoneksi dengan benar"*).
  - **Akar Masalah (Root Cause)**:
    1. **Lambat (Latency Tinggi)**:
       - Tidak adanya debounce pada input client (setiap ketukan huruf langsung memicu query HTTP bertubi-tubi).
       - Query SQL backend menggunakan `LIKE '%...'` tanpa batas index yang memindai tabel raksasa (`tbEntryList` 726k baris dan `tbBilling` 732k baris).
       - Ketiadaan in-memory caching untuk query identik / pengetikan cepat.
    2. **Tidak Terkoneksi (Data Mismatch)**:
       - Di mobile Finance tab Validasi, saran pencarian mengembalikan invoice yang sudah divalidasi/lunas/diberikan (*given*), sehingga saat dipilih list validasi kosong.
       - Di mobile Customer Price Lookup, `selectedCustCode` disetel ke nama pelanggan (`fdCustName`) alih-alih kode pelanggan (`fdCustCode`), sehingga endpoint `/customer-price-list/lookup` gagal menemukan tarif pelanggan.
       - Di Surat Jalan (DO), saran mengembalikan data historis lama (< 2023) yang tidak lolos filter tanggal pada list view utama (`fdSJDate >= '2023-01-01'`).
       - Di Web Frontend, dropdown saran pencarian belum tersambung pada Batch, DO, dan Billing toolbars, serta tidak ada auto-synchronization scope filter di Shipment Toolbar.
  - **Implementasi Perbaikan Multi-Platform**:
    1. **Backend Caching & Index Optimization (`backend/`)**:
       - `backend/src/utils/cache.ts`: Mengimplementasikan `SuggestionCache` singleton dengan TTL 30 detik, kapasitas 2.000 entri, dan evictor FIFO otomatis. Menghasilkan respon kueri ter-cache dalam < 1ms (target < 5ms).
       - `backend/src/modules/shipments/shipments.service.ts`:
         - Mengalihkan pencarian marking code langsung ke tabel `tbMarking` (~14k baris) alih-alih scan `tbEntryList` (726k baris).
         - Menerapkan two-stage prefix search pada `tbEntryList.fdTerima` (stage 1 prefix index seek, stage 2 fallback terbatas tahun 2025+ `fdTglAgent >= '2025-01-01' OR fdListCode >= '2500000'`).
         - Query customer memfilter pelanggan aktif `ISNULL(fdDiscontinued, 0) <> 1`.
         - Terintegrasi penuh dengan `suggestionCache`.
       - `backend/src/modules/billing/billing.service.ts` & `billing.routes.ts`:
         - Menambahkan dukungan parameter `draftOnly: boolean`.
         - Membatasi kueri dengan `fdInvDate >= '2023-01-01'` dan prefix matching pada `fdInvNo`.
         - Saat `draftOnly=true`, memfilter secara ketat invoice draft yang belum tervalidasi: `ISNULL(fdGive, 0) <> 1 AND ISNULL(fdGive2, 0) <> 1 AND fdCekDate IS NULL` serta mengecualikan invoice lunas/terbayar via `tbBillingTotal`.
         - Terintegrasi penuh dengan `suggestionCache`.
       - `backend/src/modules/delivery-orders/deliveryOrders.service.ts`:
         - Menambahkan batasan `fdSJDate >= '2023-01-01'` pada kueri stage 1 (prefix `fdSJNo`) dan stage 2 fallback.
         - Terintegrasi penuh dengan `suggestionCache`.
       - `backend/src/modules/customers/customers.service.ts`:
         - Memfilter pelanggan tidak aktif `ISNULL(fdDiscontinued, 0) <> 1`.
         - Menambahkan properti `custCode: string` pada interface `CustomerSuggestion` untuk seluruh tipe saran (`customer`, `code`, `contact`), menjamin client mobile/web dapat mengikat langsung kode pelanggan.
         - Terintegrasi penuh dengan `suggestionCache`.
       - `backend/src/modules/marking/marking.service.ts`:
         - Mengintegrasikan `suggestionCache` dengan cacheKey `marking:${cleanQ.toLowerCase()}` dan TTL 30 detik.
         - Terintegrasi penuh dengan `suggestionCache` pada `getMarkingSuggestions(keyword)`.
       - `backend/scripts/benchmark-suggestions.ts`:
         - Script benchmark otomatis (Bun runtime) yang menguji cold latency (< 100ms) dan cached latency (< 5ms) pada seluruh 6 pengujian saran autocomplete (Shipments, Billing Standard, Billing Draft Only, Delivery Orders, Customers, dan Marking).
    2. **Web Frontend Integration & Filter Synchronizer (`frontend/`)**:
       - `SearchSuggestionsDropdown.tsx`: Dropdown popover terpadu ber-z-index tinggi (`z-50`) dengan preview meta, badge semantik, auto-scroll keyboard arrow, dan high-contrast keyboard navigation.
       - `ShipmentToolbar.tsx`: Menggunakan `useDebounce(300ms)` dan auto-sync filter dropdown (pilihan jenis saran otomatis menyesuaikan scope `searchField`).
       - `BatchToolbar.tsx`: terhubung ke `/marking/suggestions`, auto-sync `marking` vs `customer`.
       - `DeliveryOrderToolbar.tsx`: terhubung ke `/delivery-orders/suggestions`, auto-sync `delivery` $\to$ `'sjNo'`, `customer` $\to$ `'customer'`, `marking` $\to$ `'marking'`.
       - `BillingToolbar.tsx`: terhubung ke `/billing/suggestions`, auto-sync `searchField` (`invoice` $\to$ `'invNo'`, `customer` $\to$ `'customer'`, `marking` $\to$ `'marking'`, lainnya $\to$ `'ALL'`).
       - Memperbarui dokumentasi `frontend-app.md` Seksi 5.8 sesuai aturan AGENTS.md Rule 4.
    3. **Mobile App Debouncing & Customer Code Binding (`mobile/`)**:
       - `mobile/src/hooks/useDebounce.ts`: Membuat hook debounce kustom dengan delay standar 300ms.
       - `mobile/app/(tabs)/logistics.tsx`: Menerapkan `debouncedSearch` pada saran autocomplete (`shipments`, `batches`, `delivery`) serta kueri daftar data utama (`useShipmentsQuery`, `useBatchesQuery`, `useDeliveryOrdersQuery`).
       - `mobile/app/(tabs)/finance.tsx`:
         - Menerapkan debouncing 300ms pada `debouncedSearch` dan `debouncedCustSearchQuery`.
         - Mengirimkan `draftOnly: 'true'` saat `activeTab === 'validation'` pada kueri `/billing/suggestions`.
         - Memperbaiki bug Customer Price Lookup: mengikat `selectedCustCode` ke `sug.custCode || (sug.type === 'code' ? sug.value : sug.value)` (kode pelanggan, misal `"C001"`) alih-alih nama pelanggan, sehingga endpoint `/customer-price-list/lookup` berhasil memuat daftar tarif khusus pelanggan secara instan.
       - `mobile/app/(tabs)/master.tsx`: Menerapkan `debouncedSearch` pada saran dan daftar master customer.
    4. **Verifikasi & Integritas Distribusi**:
       - Seluruh 4 endpoint distribusi file APK terverifikasi sinkron dan berukuran identik (127.020.925 bytes):
         1. `c:\shipping\mshipping.apk`
         2. `c:\shipping\frontend\dist\mshipping.apk`
         3. `c:\shipping\frontend\public\mshipping.apk`
         4. `c:\shipping\backend\public\uploads\mshipping.apk`
       - Status versi rilis dinaikkan ke `v1.2.1` (Build `13`, Force Update: `true`).
       - Seluruh bundle Hermes terbaru terkompilasi (3.335 modul), di-repack, di-sign resmi dengan keystore release, dan terdistribusi sinkron ke 4 titik server.


- [x] **Bugfix Pencarian Billing: Preservasi Teks Pencarian Customer & Filter Akurat via `custCode`**:
  - **Latar Belakang & Masalah**:
    - User melaporkan: *"harusnya pada input text search tetap sesuai dengan apa yang user ketik, sekarang malah kode customer yang tampil setelah select dari suggestion"*.
    - User ingin saat memilih saran customer (misal: "RICO"), kolom input pencarian tetap menampilkan nama `"RICO"` (bukan kode mentah `R000470`), namun daftar faktur yang dimuat tetap secara akurat memfilter faktur milik customer RICO (`fdCustCode = 'R000470'`).
  - **Perbaikan Terpasang**:
    - **Backend (`backend/src/modules/billing/billing.service.ts`)**:
      - `BillingSuggestion`: Menambahkan properti `custCode?: string` pada antarmuka saran.
      - `getBillingSuggestions`: Nilai `value` dikembalikan ke nama customer `cust.fdCustName` (sehingga input menampilkan nama customer yang dipilih, e.g. `"RICO"`), disertai `custCode: cust.fdCustCode` (`"R000470"`).
      - `getBillings`: Menambahkan dukungan parameter eksplisit `custCode = query.custCode?.trim()`. Jika `custCode` diberikan dari saran customer, query langsung menerapkan filter presisi `WHERE fdCustCode = @custCode` tanpa perlu bergantung pada pencocokan teks nama.
      - PM2 service `ShippingApi` direstart dan online.
    - **Frontend (`frontend/src/features/billing/`)**:
      - `SearchSuggestionsDropdown.tsx`: Memperluas interface `SuggestionItem` dengan `custCode?: string`.
      - `BillingToolbar.tsx`: Menambahkan callback `onSelectSuggestion(item)` saat item saran dipilih atau di-clear via tombol (X).
      - `ListPage.tsx`:
        - Menambahkan state `selectedCustCode`.
        - Saat saran dipilih, `setSearch(item.value)` mengisi teks input dengan nama customer (`"RICO"`), dan `setSelectedCustCode(item.custCode)` mengunci kode customer (`"R000470"`).
        - Parameter query API menyertakan `{ custCode: selectedCustCode }` jika aktif, sehingga backend memuat 382 faktur milik `R000470` secara presisi.
        - Jika pengguna mengetik ulang atau menghapus teks input, `selectedCustCode` otomatis di-reset ke `null` sehingga kembali ke pencarian multi-kolom bebas.
  - **Hasil & Verifikasi**:
    - Klik saran customer `RICO`: Input teks tetap menampilkan `"RICO"`, dan tabel menampilkan tepat **382 faktur** yang semuanya milik customer `R000470` (RICO).
    - `npm run build` sukses 100% tanpa error TypeScript (`built in 3.06s`).

- [x] **Revamp Tampilan List Surat Jalan (`/logistics/delivery-orders/list`)**:
  - **Latar Belakang & Permintaan User**:
    - Merombak tampilan halaman `http://36.93.22.142/mshipping/logistics/delivery-orders/list`.
    - Menyediakan Tab terpadu untuk kargo **Pending** dan **Delivered**.
    - Menyediakan **Group Pills Cabang** untuk memfilter data per cabang pengirim (`Semua Cabang`, `GZ`, `SG`, `HK`, `YW`, `LM`, `SH`, `SZ`, `EX`, `LG`).
    - Menyediakan **Sistem Pagination Presisi** di footer tabel data.
  - **Backend Layer (`backend/src/modules/delivery-orders/`)**:
    - `deliveryOrders.service.ts`:
      - Penambahan dukungan filter `branch` (`fdSJNo.startsWith(branch + '-')`) dan `listType` pada fungsi `getDeliveryOrders` sehingga flat list juga dapat difilter per cabang dan moda.
      - Memastikan `getDeliveryBranchGroups` dan `getDeliveryGroupedByListCode` berjalan cepat dan akurat dengan filter `sent`, `branch`, `listType`, dan `search`.
      - PM2 `ShippingApi` running normal dan online.
  - **Frontend Web Layer (`frontend/src/features/delivery-orders/`)**:
    - `ListPage.tsx`:
      - **2 Tab Status Utama**: Tab **Pending** (Dalam Pengiriman, `sent = '0'`) dan Tab **Delivered** (Lengkap Terkirim, `sent = '1'`), masing-masing dilengkapi live counter badge total kargo.
      - **Sub-Toolbar**: Switcher moda `BY SEA (Laut)` vs `BY AIR (Udara)` serta input pencarian ter-debounce (350ms) untuk list code, marking, customer, resi, dan komoditas.
      - **Group Pills Cabang**: Baris horizontal scrollable memuat pill *"Semua Cabang"* dan pill cabang spesifik (`GZ`, `SG`, `HK`, dll.) lengkap dengan live counter kargo per cabang dan tooltip nama cabang.
      - **Active Filter Summary**: Menampilkan ringkasan filter aktif dan tombol cepat *"Reset Filter"*.
      - **Dual Mode**: Dukungan mode tampilan *"Manifest Kargo"* (`BatchTable`) dan *"Surat Jalan Fisik"* (`DeliveryOrderTable`).
    - `BatchRow.tsx` & `BatchTable.tsx`:
      - Kolom 8 header terstandarisasi: No Urut (`#`), List Code / Cabang / Marking, Customer Master / Resi, Komoditas, Total Muatan (Qty, Satuan `fdSatuan`, Berat kg, Volume m³), Progres Pengiriman (terkirim & sisa dengan badge semantik), Status Kirim (`StatusPill`), dan Aksi Expand Surat Jalan (`DeliveryOrderDetails`).
      - Dukungan pagination offset (`startIndex`) dan skeleton shimmer wireframe (`BatchTableSkeleton`).
    - `TableFooter.tsx`:
      - Menampilkan info kuantitas presisi: `Menampilkan X–Y dari Z data`.
      - Dropdown limit selector (10, 20, 50, 100).
      - Tombol navigasi halaman *Prev* dan *Next* serta indikator `page / totalPages`.
  - **Verifikasi**:
    - `npm run build` di frontend sukses 100% tanpa galat TypeScript (`built in 2.77s`).
    - Dokumentasi `frontend-app.md` dan `.agents/working.md` disinkronkan.

- [x] **Format Cetak Surat Jalan Resmi (`rpf_delivery_2022`) & Lampiran Ukuran Marking (`rpt_deliverysize_bill_2023`) Kertas Continuous Form 23 × 16.5 cm Landscape**:
  - **Latar Belakang & Permintaan User**:
    - Mereplikasi hasil cetak surat jalan dari FoxPro warisan (`C:\sejdb\sejdb2018\Reports\rpt_deliverysize_bill_2023.FRX`, `rpf_delivery_2022.frx`, dan form `C:\sejdb\sejdb2018\Forms\frm_input_surat_jalan_view_2021.scx` -> `cmdprint`).
    - Menyediakan **Surat Jalan Resmi (`rpf_delivery_2022`)** dan **Lampiran Ukuran Marking (`rpt_deliverysize_bill_2023.FRX`)** yang dapat dipilih terpisah atau dicetak bersamaan sekaligus.
    - **Media Cetak Khusus**: Kertas continuous form ukuran **lebar 23 cm × tinggi 16.5 cm dicetak landscape** (`@page { size: 230mm 165mm landscape; margin: 0; }`).
  - **Frontend Web Layer (`frontend/src/features/delivery-orders/`)**:
    - **Navigasi & Routing**:
      - `constants.ts`: Menambahkan helper rute `ROUTES.DELIVERY_PRINT(id, doc?)`.
      - `router.tsx`: Mendaftarkan rute mandiri `ROUTES.DELIVERY_PRINT(':id')` dengan lazy-loading `DeliveryOrderPrintPage` di luar `AppLayout` (berdampingan dengan `BILLING_PRINT`) agar halaman cetak bebas dari sidebar dan navbar.
      - `index.ts`: Menambahkan export `PrintPage` dan alias `DeliveryOrderPrintPage`.
    - **Komponen Lembar Cetak Continuous Form (`DeliveryPrintDocument.tsx`)**:
      - Menyertakan CSS `@page { size: 230mm 165mm landscape; margin: 0; }` dan `@media print` dengan ukuran sheet presisi `w-[230mm] h-[165mm]` font monospaced FoxPro.
      - **Lembar 1 (`SuratJalanSheet`)**: Sesuai `rpf_delivery_2022.frx` memuat Header PT. SAMUDERA ENERGI JAYA, Kota/Tanggal, Cabang, No. SJ, No. Mobil, No. Resi, Shipment Marking, Marking No, ID Inv/List, Kepada Customer, Alamat Pengiriman, Tabel Muatan (Qty, Berat, Satuan, Vol M³, VFC kg), sub-dimensi coly (jika `cetakUkuran = true`), 3 butir ketentuan keluhan/perhatian, checkbox status packing original, dan footer 3 kolom tanda terima fisik (Penerima, Pengirim/Supir, Gudang).
      - **Lembar 2 (`LampiranUkuranSheet`)**: Sesuai `rpt_deliverysize_bill_2023.FRX` memuat Judul "Lampiran Ukuran Marking", No. SJ, Tanggal, Customer, Kode Marking, No. Marking, Ringkasan Muatan & Tonase, Tabel dimensi `No # | Panjang | Lebar | Tinggi | Jumlah | Total (M3/VFC) | Keterangan`, Baris Grand Total, dan tanda tangan Petugas Ukur & Gudang.
      - Pada mode `both`, lembar pertama memiliki `page-break-after: always` sehingga langsung berlanjut ke lembar continuous form berikutnya secara presisi.
    - **Halaman Cetak Mandiri (`pages/PrintPage.tsx`)**:
      - Menyediakan toolbar kontrol cetak gelap ramah pengguna dengan live document selector (`both`, `sj`, `ukuran`), quick checkboxes (`cetakUkuran`, `cetakSupir`), tombol "Cetak Dokumen", auto-print jika query param `autoprint=1`, penyesuaian `document.title`, serta live sheet preview.
    - **Modal Cetak Surat Jalan (`PrintDeliveryOrderModal.tsx`)**:
      - Menampilkan kartu selector 3 dokumen: *SJ + Lampiran (Keduanya)*, *Hanya Surat Jalan*, dan *Hanya Lampiran Ukuran*.
      - Menyediakan 4 opsi checkbox FoxPro: `cetakUkuran`, `cetakKeterangan`, `cetakSupir`, `cetakSJKosong`.
      - Tombol *"Pratinjau Halaman Cetak"* (membuka tab mandiri) dan tombol *"Cetak Dokumen"* (mencatat status cetak ke database `POST /api/delivery-orders/:id/print` dan langsung membuka jendela cetak).
    - `delivery-orders.service.ts`: Menambahkan alias method `getById`.
  - **Verifikasi & Build**:
    - `npm run build` sukses 100% tanpa galat TypeScript (`built in 5.19s`).
    - Dokumentasi `frontend-app.md` dan `.agents/working.md` telah disinkronkan.

- [x] **Bugfix Evaluasi Tarif: False Positive Undercharge pada Item `PARCELS TO JAKARTA (M3) ...`**:
  - **Latar Belakang & Masalah**:
    - User menanyakan mengapa item `PARCELS TO JAKARTA (M3) - STONE CHISEL` (@ Rp 5.300.000) pada invoice `YWS-000241-09-2026` ditandai sebagai **Undercharge** padahal harga profil customer adalah Rp 5.300.000 dan acuan General Goods adalah Rp 5.000.000.
  - **Root Cause**:
    1. Pencocokan naif string `normName.includes('LS')` mencocokkan kata `PARCE`**`LS`** sehingga item secara keliru masuk kategori *Alkes, Makanan & LS Lainnya* (tarif MKT Rp 7.300.000).
    2. Nilai default `fdTypeComodity = 0` pada database `tbBillingDetail` gagal fallback karena nullish coalescing `0 ?? 1` mengembalikan `0`.
  - **Perbaikan Terpasang**:
    - `billing.utils.ts`: Mengganti `normName.includes('LS')` menjadi regex word boundary `/\bLS\b/i.test(normName)`, memperbaiki resolusi `typeId` (abaikan 0), dan perbaiki fallback nama komoditi ke `defaultComodityName` (`UMUM`).
    - `useBillingValidation.ts` & `ValidationDetailPage.tsx`: Memperbaiki fallback `defaultTypeId` jika bernilai 0.
  - **Verifikasi**: `npm run build` sukses 100% tanpa galat TypeScript.

- [x] **Satuan pada Modal Surat Jalan Diambil Otomatis dari `tbEntryList.fdSatuan`**:
  - **Latar Belakang & Permintaan User**:
    - Pada modal pembuatan Surat Jalan Baru (`CreateDeliveryOrderModal.tsx`), field Satuan (`formData.fdSatuan`) harus otomatis mengambil nilai satuan dari `tbEntryList.fdSatuan` kargo terkait (bukan di-hardcode `'COLY'`).
    - Dropdown select Satuan harus otomatis memilih satuan yang tercatat pada `tbEntryList` kargo tersebut. Jika satuan kargo di luar opsi standar, opsi tersebut tetap harus tersedia di dropdown dan terpilih secara otomatis.
  - **Backend Layer (`backend/src/modules/delivery-orders/`)**:
    - `deliveryOrders.service.ts`: Query `getDeliveryGroupedByListCode` menyertakan `RTRIM(el.fdSatuan) AS fdSatuan` dan outer SELECT `el.fdSatuan AS satuan`. Query `getDeliveryOrders` menyertakan `fdSatuan: true`.
    - PM2 `ShippingApi` direstart dan online.
  - **Frontend Web Layer (`frontend/src/features/delivery-orders/`)**:
    - `delivery-orders.types.ts`: Menambahkan properti `satuan?: string | null` ke `GroupedDataRow`.
    - `CreateDeliveryOrderModal.tsx`: Auto-fill `formData.fdSatuan` dari `cargo.satuan` dan inject opsi dinamis `(dari tbEntryList)` jika satuan di luar opsi standar.
  - **Verifikasi**: `npm run build` di frontend sukses 100% tanpa galat TypeScript (`built in 2.95s`).

- [x] **Combo Alamat Tujuan `tbCustomerPengiriman`: Tampilkan Semua & Auto-Select Alamat Default (`fdAktif = 1`)**:
  - **Latar Belakang & Permintaan User**:
    - Pada combo dropdown Alamat Tujuan modal Surat Jalan, tampilkan **semua** data alamat customer tanpa memfilter `fdAktif`.
    - Baris alamat dengan `fdAktif = 1` dianggap sebagai alamat default, sehingga saat modal dibuka, combo otomatis memilih baris tersebut dan form modal terisi dari data baris `fdAktif = 1` tersebut.
  - **Backend Layer (`backend/src/modules/delivery-orders/`)**:
    - `deliveryOrders.service.ts`: Mengubah query `getCustomerDestinations`: Menghapus filter `AND ISNULL(fdAktif, 1) = 1` dan mengurutkan `ORDER BY ISNULL(fdAktif, 0) DESC, fdID ASC`.
    - PM2 `ShippingApi` direstart dan online.
  - **Frontend Web Layer (`frontend/src/features/delivery-orders/`)**:
    - `CreateDeliveryOrderModal.tsx`: `useEffect` auto-select mencari baris dengan `Number(d.fdAktif) === 1`, memilihnya di combo, dan mengisi kontak PIC, telepon/HP, kota, dan alamat. Dropdown menampilkan seluruh opsi dengan badge `★ [DEFAULT]`.
  - **Verifikasi**: `npm run build` sukses 100% tanpa galat TypeScript (`built in 3.20s`).

- [x] **Bugfix `billedM3`: Item `PARCELS TO JAKARTA (PCS)` Salah Diklasifikasikan sebagai M3**:
  - **Latar Belakang & Root Cause**:
    - Invoice `--S-000665-09-2026` memiliki item `PARCELS TO JAKARTA (PCS) - LAPTOPS (225 PCS)` yang ditagihkan per PCS, namun sistem menampilkan `Volume Ditagihkan: 225.0000 m³` dan status `Selisih Kubikasi (M3)` secara keliru.
    - Root cause: Kondisi `isM3` di `rawM3` calculation menggunakan fallback `nameUpper.includes('PARCEL')` tanpa mengecualikan item yang unit-nya `PCS`.
  - **Perbaikan Terpasang**:
    - `useBillingValidation.ts` & `useInvoiceMetrics.ts`: Menambahkan deteksi `unit === 'PCS'` dan `!nameUpper.includes('(PCS)')` pada semua cabang kondisi PARCEL fallback.
  - **Hasil**: Invoice `PARCELS TO JAKARTA (PCS)` menghasilkan `billedM3 = 0` (benar), sementara invoice M3 tetap normal.
  - **Verifikasi**: `npm run build` sukses 100% tanpa error TypeScript (3.56s).

---

## 📋 Task Sedang Berjalan

*(Tidak ada task aktif)*

### Task Pending / Backlog
- [ ] *(Belum ada)*

---

## 🗂️ Konteks Fitur Aktif

### Fitur yang Sedang Dikembangkan
| Domain | Status | Catatan |
|---|---|---|
| `delivery-orders` | 🟢 Completed | Cetak Surat Jalan Resmi (rpf_delivery_2022) & Lampiran Ukuran (rpt_deliverysize_bill_2023) Continuous Form 23 × 16.5 cm Landscape |

### File Yang Baru Diubah
| File | Perubahan |
|---|---|
| `frontend/src/features/delivery-orders/components/DeliveryPrintDocument.tsx` | Layout continuous form 23x16.5cm landscape: SuratJalanSheet & LampiranUkuranSheet |
| `frontend/src/features/delivery-orders/pages/PrintPage.tsx` | Halaman cetak mandiri dengan selector dokumen live (both, sj, ukuran), toolbar kontrol, dan sheet preview |
| `frontend/src/features/delivery-orders/components/PrintDeliveryOrderModal.tsx` | Modal cetak dengan pemilih dokumen (both/sj/ukuran), 4 opsi FoxPro, tombol pratinjau, dan direct print |
| `frontend/src/app/router.tsx` | Registrasi rute cetak mandiri ROUTES.DELIVERY_PRINT(':id') di luar AppLayout |
| `frontend/src/features/delivery-orders/index.ts` | Export PrintPage dan DeliveryOrderPrintPage |

---

## 🧠 Keputusan Desain / Arsitektur Yang Sudah Diputuskan

| Topik | Keputusan | Tanggal |
|---|---|---|
| Ukuran Kertas Cetak Surat Jalan | Continuous Form Landscape Lebar 23 cm × Tinggi 16.5 cm (`size: 230mm 165mm landscape; margin: 0;`) | 2026-09-21 |
| Pemilihan Dokumen Cetak SJ | Opsi cetak fleksibel: 1 lembar Surat Jalan Resmi (`rpf_delivery_2022`), 1 lembar Lampiran Ukuran (`rpt_deliverysize_bill_2023`), atau Keduanya (2 lembar dengan `pageBreakAfter: 'always'`) | 2026-09-21 |
| Rute Mandiri Print DO | `ROUTES.DELIVERY_PRINT(':id')` diletakkan di luar `AppLayout` berdampingan dengan `BILLING_PRINT` agar hasil print bersih tanpa komponen layout | 2026-09-21 |
| DO Counter FoxPro | Menggunakan `tbMasterCounter` `fdCode = 'A'` kolom `fdSJCounter + 1`, format `[Cabang]-[Pad6Digits]` | 2026-09-21 |
| Manifest DO Single Source | Detail DO menggunakan JOIN `tbEntryList` + `tbCabang` (bukan `tbBranch`), utamakan penerima aktual di SJ | 2026-09-21 |

---

## ⚠️ Isu Aktif / Known Issues

| Isu | Dampak | Status |
|---|---|---|
| *(Belum ada isu tercatat)* | — | — |

---

## 📝 Catatan Kontekstual Penting

- Format cetak surat jalan mengadopsi spesifikasi FoxPro warisan: `rpf_delivery_2022.frx` (Surat Jalan Resmi) dan `rpt_deliverysize_bill_2023.FRX` (Lampiran Ukuran Marking).
- Media cetak continuous form: $23\,\text{cm} \times 16.5\,\text{cm}$ landscape ($230\,\text{mm} \times 165\,\text{mm}$).
- Backend module `delivery-orders` endpoint `/delivery-orders/:id/print` menangani pencatatan konfirmasi cetak.
