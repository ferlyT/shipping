# 📋 Working Context — mshipping

> **WAJIB DIBACA** oleh setiap AI Agent di awal sesi. WAJIB DIUPDATE di akhir sesi sebelum percakapan ditutup.
> File ini adalah **satu-satunya sumber kebenaran** tentang kondisi pekerjaan aktual proyek saat ini.

---

## 🕐 Terakhir Diperbarui
- **Tanggal**: 2026-09-17
- **Oleh**: AI Assistant
- **Sesi**: Analisis Mendalam Form Pembayaran Sementara (fr3_regpayment.scx / TR- Series) & Integrasi Alur Attach Kasir Resmi

---

## 📍 Pekerjaan Terakhir Yang Dikerjakan

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
    - [`pelunasan.md`](file:///c:/project-vibe-coding/shipping/pelunasan.md): Ditambahkan Bab 6 (Analisis Lengkap Modul Pembayaran Sementara `fr3_regpayment.scx`), Bab 7 (Mekanisme Proses Attach & Konversi `TR-` ke `RR-` dengan Mermaid Flowchart), serta pembaruan tabel hubungan form dan Stored Procedure.
    - [`pelunasan-plan.md`](file:///c:/project-vibe-coding/shipping/pelunasan-plan.md): Ditambahkan spesifikasi endpoint REST API untuk kasir sementara (`/api/cashier/temp`, `/api/cashier/attach`), transaksi atomik prisma untuk proses attach, tab navigasi "Kasir Resmi (RR)" vs "Pembayaran Sementara (TR)" di `ListPage.tsx`, modal `AttachTempReceiptModal.tsx`, Bab 3.4 (Matriks Hak Akses & Peran Pengguna / RBAC), Bab 3.5 (Arsitektur Sistem Dual Bahasa i18n ID/EN dengan 36 key terjemahan), serta **Bab 4 (Rancang Bangun Sistem Baru: Customer Wallet / Saldo Deposit Pelanggan)** lengkap dengan skema tabel `tbCustomerWallet`, `tbCustomerWalletLedger`, pessimistic locking, 7 endpoint `/api/wallet`, dan alur integrasi pelunasan kasir & overpayment.

- [x] **Penyusunan Rencana Arsitektur & Peta Jalan Modul Cashier Pelunasan Piutang ([`pelunasan-plan.md`](file:///c:/project-vibe-coding/shipping/pelunasan-plan.md))**:
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
  - **Penyusunan & Pembaruan Dokumentasi Komprehensif ([`pelunasan.md`](file:///c:/project-vibe-coding/shipping/pelunasan.md))**:
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
    2. **Web Frontend Debouncing & Toolbar Auto-Sync (`frontend/`)**:
       - Menerapkan `useDebounce(search, 300)` pada seluruh 5 toolbar utama:
         - `ShipmentToolbar.tsx`: debounce 300ms, auto-sync `searchField` saat saran dipilih (`customer` $\to$ `'customer'`, `marking` $\to$ `'marking'`, `resi` $\to$ `'resi'` atau `'ALL'`).
         - `CustomerToolbar.tsx`: debounce 300ms untuk kueri `/customers/suggestions`.
         - `BatchToolbar.tsx`: terhubung ke `/marking/suggestions`, auto-sync `searchScope` (`marking` $\to$ `'code'`, lainnya $\to$ `'ALL'`).
         - `DeliveryOrderToolbar.tsx`: terhubung ke `/delivery-orders/suggestions` dengan pengelompokan kategori SJ, Customer, Supir, dan Plat.
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

- [x] **Perbaikan Overflow Layout Kartu Peringatan Dini & KPI Exit Activity Dashboard Mobile (`overview.tsx`)**:
  - **Latar Belakang & Keluhan Pengguna**:
    - User mengirimkan tangkapan layar perangkat (`media_1789555739077.jpg`) dengan keluhan *"Perbaiki pada perangkat ada yang overflow pada card dashboard"*.
    - Pada layar perangkat fisik (terutama dengan skala font standar / 360dp), kartu peringatan operasional **"ETA BELUM KELUAR"** dan **"PERINGATAN SLA"** mengalami overflow horizontal:
      1. Teks judul kartu dan ikon chevron `>` saling bertumpuk di tepi kanan.
      2. Pada kartu *PERINGATAN SLA*, ikon chevron `>` terdorong keluar melewati garis border kartu (masuk ke batas layar).
  - **Akar Masalah (Root Cause)**:
    1. Kontainer judul (`alertTitleWrapper`) tidak memiliki `flex: 1`, `minWidth: 0`, dan `marginRight: 4`.
    2. Elemen `<Text>` judul tidak memiliki `flexShrink: 1`, `numberOfLines={1}`, dan `ellipsizeMode="tail"`.
    3. Kontainer aksi kanan (`alertActionsWrapper` dengan chevron `>`) tidak memiliki `flexShrink: 0`, sehingga saat teks judul panjang dievaluasi oleh flexbox, kontainer kanan terdorong ke luar batas kartu.
    4. Kontainer `alertCard` tidak memiliki `overflow: 'hidden'`.
    5. Spacing horizontal: `styles.alertCardsRow` menggunakan `gap: 10` dan `styles.alertCard` menggunakan `padding: 12` yang terlalu lebar untuk layar 360dp (hanya menyisakan ~90dp untuk teks judul di samping icon & chevron).
  - **Implementasi Perbaikan**:
    1. **`mobile/app/(tabs)/overview.tsx`**:
       - `alertCardsRow`: Mengurangi `gap` dari `10` menjadi `8` (menambah ruang horizontal per kartu).
       - `alertCard`: `paddingHorizontal: 10, paddingVertical: 10, overflow: 'hidden'`.
       - `alertTitleWrapper`: Ditambahkan `flex: 1, minWidth: 0, marginRight: 4, gap: 4`.
       - `alertActionsWrapper`: Ditambahkan `flexShrink: 0, gap: 3`.
       - Ikon `AlertTriangle` dan `Clock` disesuaikan ke ukuran `13dp`, dan `ChevronRight` ke `13dp`.
       - `alertCardTitle`: `fontSize: 10, fontWeight: '800', letterSpacing: 0.1, flexShrink: 1` dengan `numberOfLines={1}` dan `ellipsizeMode="tail"`.
       - `alertCardValue`: `fontSize: 24, fontWeight: '900'`.
       - `alertCardSub`: Ditambahkan `numberOfLines={2}` dan `lineHeight: 14`.
       - `alertBreakdownRow`: Ditambahkan `flexWrap: 'wrap'` dan `numberOfLines={1}`.
    2. **`mobile/src/features/overview/components/ExitActivityKpiGrid.tsx`**:
       - Menambahkan `numberOfLines={1}`, `ellipsizeMode="tail"`, dan `flex: 1` pada judul KPI (`kpiTitle`).
       - Menambahkan `flexShrink: 0, marginLeft: 4` pada indikator dot aktif.
       - Menambahkan `numberOfLines={1}` pada nilai KPI dan baris rincian Udara/Laut untuk menjamin nol overflow di berbagai resolusi layar.
    3. **`mobile/src/features/overview/components/ExitBatchListItem.tsx`**:
       - Menambahkan `numberOfLines={1}` pada informasi koli/berat dan tanggal kontekstual.
  - **Verifikasi & Build Pipeline**:
    - Typecheck TypeScript `bun run tsc --noEmit` di `mobile/`: **Lulus 100% (0 error)**.
    - Export bundle bytecode Hermes via `bunx expo export --platform android --clear`: 3.334 modul terkompilasi, bundle `entry-3a9a4920f5a00ecfa1945823412bd481.hbc` (5.5 MB).
    - Repack APK via `C:\shipping\scripts\repack_apk.ps1` & signing resmi via `uber-apk-signer.jar` dengan `release.keystore` (v2 & v3 signature verified, 0 errors).
    - Berkas APK disinkronkan ke 4 titik server: `C:\shipping\mshipping.apk`, `C:\shipping\frontend\dist\mshipping.apk`, `C:\shipping\frontend\public\mshipping.apk`, dan `C:\shipping\backend\public\uploads\mshipping.apk`.
  - **Latar Belakang & Permintaan**: User meminta perbaikan dual bahasa (Bahasa Indonesia & English) pada mobile app secara menyeluruh, lalu menaikkan versi aplikasi menjadi **Force Update** (`forceUpdate: true`).
  - **Penyempurnaan Kamus Terjemahan & Hook i18n**:
    - File kamus [`mobile/src/lib/i18n/id.json`](file:///c:/shipping/mobile/src/lib/i18n/id.json) dan [`mobile/src/lib/i18n/en.json`](file:///c:/shipping/mobile/src/lib/i18n/en.json) disinkronkan secara simetris dengan penambahan key:
      - `overview.*`: `welcomeBack`, `operationalAlerts`, `exitActivity`, `seeAllBatches`, `yesterday`, `today`, `tomorrow`, `exit7Days`, `etaNotExit`, `missedSla`, `etaCardSub`, `slaCardSub`, `batchYear`, `thisYearActive`, `year`, `all`, `air`, `sea`, `etaModalTitle`, `slaModalTitle`, `emptyToday`, `emptyYesterday`, `emptyTomorrow`, `emptyRecent`, `emptyEta`, `emptySla`, `predicted`, `exit`, `eta`.
      - `logistics.*`: `title`, `shipments`, `batches`, `delivery`, `searchShipmentPlaceholder`, `searchBatchPlaceholder`, `searchDeliveryPlaceholder`, `suggestionsShipment`, `suggestionsBatch`, `suggestionsDelivery`, `noShipments`, `noBatches`, `noDelivery`, `manifestBatch`, `totalResi`, `totalColy`, `totalWeight`, `totalVolume`, `totalCustomer`.
      - `finance.*`: `title`, `billing`, `validation`, `priceLookup`, `searchBillingPlaceholder`, `searchValidationPlaceholder`, `noBilling`, `noValidation`, `masterTariff`, `customerTariff`, `selectCustomer`, `searchCustomer`, `noSpecialTariff`, `invoice`, `detailTitle`, `customer`, `timeAuthor`, `invoiceDate`, `issuedDate`, `givenBy`, `author`, `paymentStatus`, `paid`, `partial`, `unpaid`, `cashierNo`, `cashierDate`, `totalPaid`, `noPayment`, `marking`, `receiptNo`, `noReceipt`, `commodity`, `agentDate`, `itemDetails`, `items`, `noItems`, `totalAmount`, `copyInvoiceNo`.
      - `master.*`: `title`, `searchPlaceholder`, `suggestions`, `noCustomers`.
      - `profile.*`: `securitySection`, `systemSection`, `infoSection`, `biometricLogin`, `darkMode`, `language`, `checkUpdate`, `checkingUpdate`, `appVersion`, `backendServer`, `logout`, `logoutConfirmTitle`, `logoutConfirmDesc`.
    - Hook [`mobile/src/hooks/useTranslation.ts`](file:///c:/shipping/mobile/src/hooks/useTranslation.ts) ditingkatkan dengan dukungan interpolasi variabel otomatis (misal: `{year}`, `{count}`).
  - **Penerapan di Seluruh Layar & Komponen UI**:
    1. **Overview Screen (`overview.tsx`)**: Menghilangkan string hardcode pada welcome greeting, alert cards ETA & SLA, exit activity headers, pill filters mode (Semua/Udara/Laut), badge & pill tahun batch (`thisYearActive` / `year`), dan empty states.
    2. **Komponen Overview (`ExitActivityKpiGrid.tsx` & `ExitBatchListItem.tsx`)**: Seluruh label 4-KPI (Kemarin, Hari Ini, Besok, Exit 7 Hari), breakdown Udara/Laut, dan label tanggal (Prediksi, ETA, Exit) menggunakan `t(...)`.
    3. **Logistics Screen (`logistics.tsx`) & Manifest (`BatchManifestSheet.tsx`)**: Header, segment tab, search placeholder, suggestions dropdown title, empty card text, modal manifest title, serta 4 metrik KPI ringkasan batch (Koli, Berat, Volume, Customer & Resi) diterjemahkan penuh.
    4. **Finance Screen (`finance.tsx`) & Modal Detail (`InvoiceDetailSheet.tsx`)**: Seluruh label 5 kartu invoice (Pelanggan, Waktu & Pembuat, Status Pembayaran Kasir, Marking & Resi, Rincian Item, Total Tagihan, dan tombol Salin) menggunakan `t(...)`.
    5. **Master Screen (`master.tsx`)**: Title, placeholder, suggestions, dan empty state terlokalisasi.
    6. **Profile Screen (`profile.tsx`)**: Judul seksi pengaturan, konfirmasi dialog alert logout, label status server ERP, dan status versi aplikasi menggunakan `t(...)`.
  - **Bump Versi & Force Update**:
    - [`mobile/src/config/version.ts`](file:///c:/shipping/mobile/src/config/version.ts): `APP_VERSION = '1.2.0'`, `APP_VERSION_CODE = 12`.
    - [`mobile/app.json`](file:///c:/shipping/mobile/app.json): `version: "1.2.0"`, `android.versionCode: 12`.
    - [`backend/src/config/app-version.json`](file:///c:/shipping/backend/src/config/app-version.json):
      ```json
      {
        "version": "1.2.0",
        "versionCode": 12,
        "minVersion": "1.2.0",
        "forceUpdate": true,
        "downloadUrl": "http://36.93.22.142/mshipping/mshipping.apk",
        "webDownloadUrl": "http://36.93.22.142/mshipping/download/"
      }
      ```
  - **Verifikasi & Build Pipeline**:
    - Typecheck TypeScript `mobile/` & `backend/`: **Lulus 100% (0 error)**.
    - Export bundle bytecode Hermes via `bunx expo export --platform android --clear`: 3.334 modul terkompilasi, bundle `entry-21dd208d6cfdfdd093cc971c4ec425ff.hbc` (5.5 MB).
    - Repack APK & signing resmi via `uber-apk-signer.jar` dengan `release.keystore` (v2 & v3 signature verified).
    - Berkas APK disinkronkan ke 4 titik: `C:\shipping\mshipping.apk`, `C:\shipping\frontend\dist\mshipping.apk`, `C:\shipping\frontend\public\mshipping.apk`, dan `C:\shipping\backend\public\uploads\mshipping.apk`.

- [x] **Integrasi In-Place Modal Manifest Batch pada Layar Overview Mobile (`overview.tsx`)**:
  - **Kebutuhan**: Saat item batch pada *Exit Batches List* disentuh di layar Overview (`mobile/app/(tabs)/overview.tsx`), langsung munculkan modal lembar manifest (`BatchManifestSheet`) di halaman Overview secara in-place tanpa melakukan perpindahan/navigasi ke tab Logistics (`/(tabs)/logistics`).
  - **Implementasi**:
    - Import `BatchManifestSheet` dari `../../src/features/logistics/components/BatchManifestSheet` di `overview.tsx`.
    - Tambahkan state `selectedBatch` (`useState<any | null>(null)`).
    - Perbarui callback `onPress` pada `ExitBatchListItem` agar memanggil `setSelectedBatch(batch)`.
    - Pasang callback `onSelectBatch={(b) => setSelectedBatch(b)}` pada `AlertDetailModal` agar sentuhan pada chip batch alert juga membuka modal manifest secara in-place.
    - Render `<BatchManifestSheet selectedBatch={selectedBatch} onClose={() => setSelectedBatch(null)} setSelectedBatch={setSelectedBatch} />`.
  - **Verifikasi & Build**:
    - Typecheck TypeScript `bun x tsc --noEmit` di folder `mobile/`: **Lulus 100% (0 error)**.
    - Export bundle bytecode Hermes via `bunx expo export --platform android --clear`: 3.333 modul, `entry-*.hbc` (5.4MB).
    - Repack APK via `C:\shipping\scripts\repack_apk.ps1` dan disign dengan `release.keystore` (v2, v3 verified).
    - Versi tetap di **v1.1.0** (versionCode: 11) dan `forceUpdate: false`.

- [x] **Refaktorisasi Komprehensif Layar `mobile/app/(tabs)` & Ekstraksi ke `mobile/src/features/`**:
  - **Tujuan**:
    - Mengurangi *file bloat* dan kompleksitas file tunggal raksasa di folder `mobile/app/(tabs)/` (sebelumnya ribuan baris per file) menjadi arsitektur modular yang ramping (*thin screen orchestrators*), mudah dirawat, dan *type-safe*.
  - **Dekomposisi per Tab**:
    1. **Logistics Screen (`logistics.tsx`)**:
       - Berkurang dari 1.100+ baris menjadi **360 baris**.
       - Ekstraksi komponen:
         - `src/features/logistics/components/ShipmentListItem.tsx`
         - `src/features/logistics/components/BatchListItem.tsx`
         - `src/features/logistics/components/DeliveryListItem.tsx`
         - `src/features/logistics/components/ShipmentDetailSheet.tsx`
         - `src/features/logistics/components/ShipmentInfoTab.tsx`
         - `src/features/logistics/components/ShipmentDimensionsTab.tsx`
         - `src/features/logistics/components/ShipmentTimelineTab.tsx`
         - `src/features/logistics/components/ShipmentInvoiceTab.tsx`
         - `src/features/logistics/components/BatchManifestSheet.tsx` (dilengkapi perbaikan *overflow* nomor marking dan penambahan badge `fdBranchCode`).
       - Ekstraksi hooks: `useShipments.ts`, `useBatches.ts`, `useDeliveryOrders.ts`, `useShipmentDetail.ts`, `useBatchManifest.ts`.
       - Ekstraksi utils: `src/features/logistics/utils/logistics.utils.ts`.
    2. **Finance Screen (`finance.tsx`)**:
       - Berkurang dari 1.223 baris menjadi **540 baris**.
       - Ekstraksi komponen:
         - `src/features/finance/components/BillingListItem.tsx`
         - `src/features/finance/components/ValidationListItem.tsx`
         - `src/features/finance/components/InvoiceDetailSheet.tsx`
       - Ekstraksi utils: `src/features/finance/utils/finance.utils.ts` (helper aging & badge status penagihan).
    3. **Master Customer Screen (`master.tsx`)**:
       - Berkurang drastis dari 1.363 baris menjadi **~140 baris**.
       - Ekstraksi komponen:
         - `src/features/master/components/CustomerListItem.tsx`
         - `src/features/master/components/CustomerDetailSheet.tsx` (5 tab lengkap: Ringkasan, Finansial, Pengiriman, Penagihan, Daftar Alamat).
       - Ekstraksi utils: `src/features/master/utils/master.utils.ts` (`statusConfig` presisi `fdBlocked`, `tierBadgeConfig`, dan tenure).
    4. **Overview Screen (`overview.tsx`)**:
       - Berkurang dari 1.074 baris menjadi **~360 baris**.
       - Ekstraksi komponen:
         - `src/features/overview/components/ExitActivityKpiGrid.tsx` (4-kolom KPI interaktif: Kemarin, Hari Ini, Besok, Exit 7 Hari).
         - `src/features/overview/components/ExitBatchListItem.tsx` (Kartu item batch exit).
         - `src/features/overview/components/AlertDetailModal.tsx` (Modal detail actionable alert ETA lewat & Missed SLA).
  - **Perbaikan Desain UI Mobile**:
    - Memperbaiki layout `fdMarkingNo` pada kartu item manifest agar tidak *overflow* (`flexWrap: 'wrap'`, padding kompak).
    - Menambahkan badge cabang `fdBranchCode` pada seluruh manifest item batch dan shipment cards.
  - **Verifikasi & Build**:
    - Typecheck TypeScript `bun x tsc --noEmit` di folder `mobile/`: **Lulus 100% (0 error)**.
    - Export bundle bytecode Hermes via `bunx expo export --platform android --clear`: 3.333 modul terkompilasi, bundle `entry-*.hbc` (5.4MB).
    - Repack APK via `C:\shipping\scripts\repack_apk.ps1` dan ditandatangani dengan keystore resmi `release.keystore` via `uber-apk-signer.jar` (v2 & v3 signature verified).
    - APK berhasil disinkronkan ke 4 titik server:
      1. `c:\shipping\mshipping.apk` (127.008.637 bytes / 121.1 MB)
      2. `c:\shipping\frontend\dist\mshipping.apk`
      3. `c:\shipping\frontend\public\mshipping.apk`
      4. `c:\shipping\backend\public\uploads\mshipping.apk`
    - Parameter rilis: Versi tetap **`1.1.0`**, VersionCode **`11`**, dan **`forceUpdate: false`** (Non-force update) terverifikasi di endpoint API `GET /api/app-version/latest`.
    - PM2 service `ShippingApi` berhasil direstart dan berjalan normal.
  - **Permintaan Pengguna**:
    - *"gunakan tbCustomers.fdBlocked -> labelnya"*
  - **Investigasi & Analisis Nilai `tbCustomers.fdBlocked`**:
    - Kolom `tbCustomers.fdBlocked` bertipe `INT` dengan distribusi dan mapping resmi desain ERP:
      - `0`: `'NO STATUS'` (default/slate)
      - `1`: `'OK'` (info/sky)
      - `2`: `'COD'` (success/emerald)
      - `3`: `'WARNING'` (warning/amber)
      - `4`: `'BLOCKED'` (danger/red/rose)
      - `5`: `'URGENT'` (info/blue)
    - Jika item muatan tersebut memiliki record `tbEntryList_Bloked_Finance.fdBlocked = 1`, **tetap di-override menjadi `'BLOCKED'`** lengkap dengan identitas *Blocked by* (`fdCreated`) dan *Alasan* (`fdKeterangan`).
  - **Perubahan Backend**:
    - **`marking.service.ts`**:
      - Memperbarui query SQL `getManifestByMarkingCode`:
        ```sql
        ISNULL(bf.isBlocked, 0) as isBlocked,
        bf.fdCreated as blockedBy,
        bf.fdKeterangan as blockedReason,
        ISNULL(c.fdBlocked, 0) as custBlocked,
        CASE 
          WHEN ISNULL(bf.isBlocked, 0) = 1 THEN 'BLOCKED'
          WHEN c.fdBlocked = 1 THEN 'OK'
          WHEN c.fdBlocked = 2 THEN 'COD'
          WHEN c.fdBlocked = 3 THEN 'WARNING'
          WHEN c.fdBlocked = 4 THEN 'BLOCKED'
          WHEN c.fdBlocked = 5 THEN 'URGENT'
          ELSE 'NO STATUS'
        END as financialStatus
        ```
      - Menghapus subquery berat `bil` ke `tbBilling` + `tbBillingTotal` karena status finansial kini mengacu langsung ke status pelanggan & finance blocked (mempercepat eksekusi query manifest secara signifikan).
      - Typecheck `bun run --bun tsc -b` lulus 0 error.
      - PM2 service `ShippingApi` di-restart dan diverifikasi via live call: batch `26GZD13` mengembalikan 32 item dengan status presisi (contoh: LIU/PH $\to$ WARNING, JMI $\to$ BLOCKED, AWMK $\to$ OK, SERBA ANTIK $\to$ BLOCKED override by NOVI, RUBY $\to$ COD, SML $\to$ URGENT).
  - **Perubahan Frontend Web**:
    - **`ManifestList.tsx`**:
      - Memperbarui komponen `FinancialStatusBadge`: merender badge visual dengan skema warna desain sistem ERP untuk status `OK`, `COD`, `WARNING`, `BLOCKED`, `URGENT`, `NO STATUS`.
      - Menambahkan field `custBlocked?: number | null;` pada interface `MarkingManifest` di `marking.service.ts`.
      - Build `npm run build` sukses 100% tanpa error.
  - **Perubahan Mobile App**:
    - **`logistics.tsx`**:
      - Memperbarui mapping status finansial pada kartu manifest item:
        - `isBlocked || 'BLOCKED'` $\to$ variant: `'danger'`, label: `'BLOCKED'` (disertai banner Finance Blocked jika diblokir finance)
        - `'OK'` $\to$ variant: `'neutral'`, label: `'OK'`
        - `'COD'` $\to$ variant: `'success'`, label: `'COD'`
        - `'WARNING'` $\to$ variant: `'warning'`, label: `'WARNING'`
        - `'URGENT'` $\to$ variant: `'info'`, label: `'URGENT'`
        - `'NO STATUS'` $\to$ variant: `'neutral'`, label: `'NO STATUS'`
      - Typecheck `bun run tsc --noEmit` lulus 0 error.
      - Bundle diekspor via Hermes (`npx expo export --platform android`, 3.308 modul terkompilasi, bundle `.hbc` 5.4MB).
      - APK di-repack, di-sign dengan release keystore via `uber-apk-signer.jar` (v2, v3 signature verified), dan disinkronkan ke 4 endpoint distribusi APK:
        1. `C:\shipping\mshipping.apk`
        2. `C:\shipping\frontend\dist\mshipping.apk`
        3. `C:\shipping\frontend\public\mshipping.apk`
        4. `C:\shipping\backend\public\uploads\mshipping.apk`
      - Tetap pada versi `1.1.0`, `versionCode: 11`, dan `forceUpdate: false` sesuai instruksi pengguna.
  - **Kebutuhan Pengguna**:
    - *"buatkan lagi status shipment -> blocked kalau ada data pada tbEntryList_Bloked_Finance -> fdBlocked = 1 dengan key fdListcode dari tbentrylist. Pada data manifest tampilkan -> Status Finansial apabila status shipment -> blocked maka override status finansialnya dan berikan keterangan dari kolom fdCreated -> blocked by dan keterangan dari kolom fdKeterangan dari tbEntryList_Bloked_Finance. kalau ragu tanya"*
  - **Penyelidikan & Analisis Database**:
    - Tabel `tbEntryList_Bloked_Finance` memiliki kolom: `fdID`, `fdListCode`, `fdBlocked`, `fdKeterangan`, `fdCreated`, `fdCreatedDate`.
    - Ditemukan riwayat buka-tutup blokir per `fdListCode` (894 baris memiliki riwayat unblocked `fdBlocked = 0`).
    - Status aktif terakurat ditentukan oleh record terbaru per `fdListCode`: `ROW_NUMBER() OVER (PARTITION BY fdListCode ORDER BY fdID DESC) = 1` dengan kondisi `fdBlocked = 1`.
  - **Perubahan Backend**:
    1. **`shipments.types.ts`**: Menambahkan properti `isBlocked?: boolean`, `blockedBy?: string | null`, `blockedReason?: string | null` pada `ShipmentStatus`.
    2. **`shipments-status.resolver.ts`**:
       - Menambahkan helper `getBlockedFinanceStatusMap(listCodes: string[])`.
       - Memperbarui `resolveShipmentStatus` untuk mengembalikan `{ statusLabel: 'Blocked', statusStep: 10, isBlocked: true, blockedBy, blockedReason }` jika diblokir finance.
       - Menambahkan filter `status === 10` pada `buildSingleStatusCondition`.
    3. **`shipments.service.ts`**:
       - Mengintegrasikan `getBlockedFinanceStatusMap` pada `getShipments()` dan `getShipmentById()`.
    4. **`marking.service.ts`**:
       - Pada `getManifestByMarkingCode`: melakukan `LEFT JOIN` ke record terbaru `tbEntryList_Bloked_Finance` dan `tbBilling` + `tbBillingTotal`.
       - Menghasilkan kolom `isBlocked`, `blockedBy`, `blockedReason`, dan `financialStatus` ('BLOCKED' jika diblokir finance, jika tidak 'PAID', 'PARTIAL', 'BILLED', atau 'UNBILLED').
  - **Perubahan Frontend Web**:
    1. **`status.ts` & `StatusBadge.tsx`**: Menambahkan status step `10` (*Blocked*) dengan style badge merah, serta tooltip detail *Blocked by* & *Keterangan*.
    2. **`ShipmentTimelineTab.tsx`**: Menampilkan banner visual peringatan pengiriman ditahan / diblokir oleh finance lengkap dengan *Blocked by* dan alasannya.
    3. **`ManifestList.tsx`**: Menambahkan kolom & badge **Status Finansial** pada tampilan Table, Shortlist, dan Grid. Jika diblokir finance, otomatis ter-override menjadi badge merah **`BLOCKED`** disertai keterangan *Blocked by* dan teks *Alasan*.
  - **Perubahan Mobile App**:
    1. **`logistics.tsx`**:
       - Memperbarui `getShipmentStatusBadge()` untuk menangani `step === 10 || label === 'Blocked'` (variant: `'danger'`).
       - Memperbarui Timeline Tab untuk menampilkan banner peringatan pengiriman ditahan oleh finance.
       - Pada Modal Manifest batch: menampilkan badge **Status Finansial** di setiap kartu item. Jika diblokir finance, otomatis ter-override menjadi badge merah **`BLOCKED`** dan menampilkan kotak informasi peringatan `Blocked by: ...` dan `Alasan: ...`.
  - **Hasil & Verifikasi**:
    - Backend typecheck `bun run --bun tsc -b`: **0 error**.
    - Frontend build `npm run build`: **0 error** (sukses).
    - Mobile typecheck `bun run tsc --noEmit`: **0 error** (sukses).
    - Verifikasi data live pada marking `26GZD13` dan shipment `GZ-3000728`: berhasil mendeteksi `isBlocked: 1`, `blockedBy: "NOVI"`, `statusLabel: "Blocked"`, `financialStatus: "BLOCKED"`.
    - PM2 `ShippingApi` telah direstart.
    - Dokumentasi `frontend-app.md` dan `mobile-app.md` telah diperbarui.
  - **Kompilasi & Rilis APK Mobile**:
    - Versi: `v1.1.0` (tetap), `versionCode: 11` (tetap).
    - Tipe Update: `forceUpdate: false` (Non-force update sesuai instruksi pengguna).
    - Bundling via `bunx expo export --platform android --clear` menghasilkan bytecode Hermes Android `entry-0a1004b7dcb957843b19193106d89534.hbc` (5.4MB).
    - Repack APK: Injeksi bytecode ke `assets/index.android.bundle` dan signing resmi menggunakan keystore `mobile/keystore/release.keystore` via `uber-apk-signer.jar` (dual signature scheme v2 + v3 verified, zipalign 4096-byte verified, 0 errors).
    - Distribusi sinkron ke 4 titik server:
      - `c:\shipping\mshipping.apk` (127.004.541 bytes)
      - `c:\shipping\frontend\dist\mshipping.apk` (127.004.541 bytes)
      - `c:\shipping\frontend\public\mshipping.apk` (127.004.541 bytes)
      - `c:\shipping\backend\public\uploads\mshipping.apk` (127.004.541 bytes)
    - Verifikasi endpoint `GET /api/app-version/latest`: `version: "1.1.0"`, `versionCode: 11`, `forceUpdate: false`, `formattedSize: "121.1 MB"`, `hasApk: true`.

- [x] **Investigasi & Perbaikan Bug Manifest Batch Marking Tidak Muncul (`26gzd13`)** ([marking.service.ts](file:///c:/shipping/backend/src/modules/marking/marking.service.ts), [schema.prisma](file:///c:/shipping/backend/prisma/schema.prisma)):
  - **Pertanyaan / Keluhan Pengguna**:
    - *"26gzd13 kenapa manifest tidak muncul? cek backend"*
  - **Akar Masalah (Root Cause)**:
    1. Pada query SQL utama di `getManifestByMarkingCode` ([`marking.service.ts`](file:///c:/shipping/backend/src/modules/marking/marking.service.ts)), query mencoba mengambil:
       - `s.fdComodityName` dari view `vwShipment`.
       - `s.fdLocalTrackingNo` dari view `vwShipment`.
    2. Berdasarkan verifikasi ke database SQL Server (`INFORMATION_SCHEMA.COLUMNS`), kolom `fdComodityName` dan `fdLocalTrackingNo` **TIDAK ADA** di view `vwShipment`. Kolom nomor tracking lokal berada di `tbEntryList.fdTrackingNo`, sedangkan nama kategori komoditas berada di `tbTypeComodity.fdComodityName`.
    3. Akibatnya, query SQL melempar error MSSQL `Code 207: Invalid column name 'fdComodityName'`.
    4. Pada blok `catch` fallback, fungsi memanggil `prisma.vwShipment.findMany(...)`. Namun model Prisma `VwShipment` di `schema.prisma` juga mendefinisikan `fdComodityName` dan `fdLocalTrackingNo`, sehingga blok `catch` pun ikut crash dengan error Prisma *"The column fdComodityName does not exist in the current database"*, lalu melempar pesan generic *"Gagal mengambil data manifest"* (HTTP 500).
  - **Tindakan & Solusi**:
    1. **Perbaikan Query SQL `getManifestByMarkingCode`** ([`marking.service.ts`](file:///c:/shipping/backend/src/modules/marking/marking.service.ts)):
       - Mengganti referensi `s.fdComodityName` menjadi `RTRIM(tc.fdComodityName)`.
       - Mengganti referensi `s.fdLocalTrackingNo` menjadi `RTRIM(el.fdTrackingNo) as fdLocalTrackingNo`.
       - Memastikan nama customer menggunakan single source of truth: `COALESCE(NULLIF(RTRIM(c.fdCustName), ''), RTRIM(s.fdCustName)) as fdCustName`.
    2. **Perbaikan Model Prisma `VwShipment`** ([`schema.prisma`](file:///c:/shipping/backend/prisma/schema.prisma)):
       - Menghapus kolom fiktif `fdComodityName` dan `fdLocalTrackingNo`, serta menambahkan kolom asli `fdTypeComodity Int?`.
       - Menjalankan `bunx prisma generate` ulang.
    3. **Verifikasi**:
       - Endpoint manifest untuk `26gzd13` langsung berhasil mengambil seluruh **32 manifest item** secara instan dan akurat.
       - Backend typecheck `bun run --bun tsc -b`: **0 error**.
       - Mobile typecheck `bun run tsc --noEmit`: **0 error**.
       - Backend PM2 `ShippingApi` telah direstart dan berjalan normal.


- [x] **Kompilasi & Rilis APK Mobile v1.1.0 (Non-Force Update)** ([app-version.json](file:///c:/shipping/backend/src/config/app-version.json), [mshipping.apk](file:///c:/shipping/mshipping.apk)):
  - **Permintaan Pengguna**:
    - *"kompile versi sama tidak force update"*
  - **Parameter Rilis**:
    - Versi: `v1.1.0`
    - Version Code: `11` (tetap)
    - Tipe Update: `forceUpdate: false` (Non-force update)
  - **Langkah-langkah yang diselesaikan**:
    1. Melakukan Hermes export Android bundle terbaru melalui `bunx expo export --platform android --clear` (berhasil menghasilkan bundle `.hbc` terbaru tanpa error).
    2. Menginjeksikan bundle `entry-*.hbc` ke dalam arsip `c:\shipping\mshipping.apk` di path `assets/index.android.bundle`.
    3. Menandatangani APK menggunakan `uber-apk-signer.jar` dan keystore resmi `release.keystore` (alias: `mshipping`, signature verified v2, v3).
    4. Mendistribusikan `mshipping.apk` ke 4 titik server:
       - `c:\shipping\mshipping.apk` (121.2 MB)
       - `c:\shipping\frontend\dist\mshipping.apk` (121.2 MB)
       - `c:\shipping\frontend\public\mshipping.apk` (121.2 MB)
       - `c:\shipping\backend\public\uploads\mshipping.apk` (121.2 MB)
    5. Melakukan restart process backend `ShippingApi` via `pm2 restart ShippingApi`.
    6. Verifikasi endpoint API `GET /api/app-version/latest`:
       - `version`: "1.1.0"
       - `versionCode`: 11
       - `forceUpdate`: false
       - `hasApk`: true
       - `fileSize`: 127086461 bytes (~121.2 MB)


- [x] **Perbaikan Warna Kartu "Hari Ini" & Stat Cards Exit Activity pada Tema Terang** ([overview.tsx](file:///c:/shipping/mobile/app/%28tabs%29/overview.tsx), [mobile-app.md](file:///c:/shipping/mobile-app.md)):
  - **Permintaan Pengguna**:
    - *"perbaiki exit activity card hari ini pada tema terang warna hijaunya tidak merata"*
  - **Akar Masalah (Root Cause)**:
    - Komponen `<Card>` memiliki `elevation: 2` (Android native shadow) dan `shadowOpacity: 0.1` (iOS drop shadow).
    - Sebelumnya pada tema terang, kartu *Hari Ini* yang aktif menggunakan `backgroundColor: 'rgba(16, 185, 129, 0.08)'` (translucent / 92% transparan).
    - Di Android, background semi-transparan yang dipadukan dengan native elevation menyebabkan bayangan hitam di bawah kartu tembus ke permukaan kartu (*shadow bleed-through*), menghasilkan gradasi kusam dan tidak merata (*blotchy*).
  - **Tindakan & Solusi**:
    1. Mengubah background kartu *Hari Ini* yang aktif pada tema terang menjadi warna pastel solid/opaque `#ECFDF5` (emerald-50) dan border `#059669` / `#D1FAE5`.
    2. Menyesuaikan teks judul dan angka KPI dengan warna ber-kontras tinggi `#059669` dan `#047857` (emerald gelap pada tema terang).
    3. Menerapkan warna latar solid serupa pada kartu *Kemarin*, *Besok*, dan *Exit 7 Hari* (`#F0F9FF`, `#FFFBEB`) untuk mencegah efek yang sama saat dipilih.
    4. Menjalankan typecheck TypeScript `bun run tsc --noEmit`: Lulus 100% (0 error).
    5. Dokumentasi [`mobile-app.md`](file:///c:/shipping/mobile-app.md) dan [`.agents/working.md`](file:///c:/shipping/.agents/working.md) telah disinkronkan.

- [x] **Integrasi Sentuhan Daftar Batch Overview untuk Membuka Sub-Tab Batch Marking & Auto-Open Modal Detail Manifest** ([overview.tsx](file:///c:/shipping/mobile/app/%28tabs%29/overview.tsx), [logistics.tsx](file:///c:/shipping/mobile/app/%28tabs%29/logistics.tsx), [mobile-app.md](file:///c:/shipping/mobile-app.md)):
  - **Permintaan Pengguna**:
    - *"buat apabila di touch buka tab logistics dengan tab batch marking yang aktif dan buka detail manifest dari sesuai dengan marking code yang di touch"* pada daftar batch overview baris 570.
  - **Tindakan & Solusi**:
    1. **Pengiriman Parameter Navigasi dari Overview ([`overview.tsx`](file:///c:/shipping/mobile/app/%28tabs%29/overview.tsx))**:
       - Pada setiap kartu item daftar batch (`recentItemCard`), `onPress` sekarang mengirimkan:
         ```tsx
         router.push({
           pathname: '/(tabs)/logistics',
           params: {
             tab: 'batches',
             markingCode: code,
             batchData: JSON.stringify(b),
             search: code,
             t: Date.now().toString(),
           },
         })
         ```
       - Pada chip kode batch di dalam modal dialog alert ETA / SLA (`alertModal`), dibungkus dengan `TouchableOpacity` yang juga menavigasi ke tab logistik dengan parameter `markingCode` dan menutup modal alert.
    2. **Penerimaan Parameter & Auto-Open Manifest Modal di Logistik ([`logistics.tsx`](file:///c:/shipping/mobile/app/%28tabs%29/logistics.tsx))**:
       - Memperluas `useLocalSearchParams` untuk menerima `markingCode`, `batchCode`, `batchData`, `search`.
       - Di dalam `useEffect`, jika `params.batchData` atau `params.markingCode` diterima, `selectedBatch` langsung disetel dengan data batch tersebut. Karena `visible={Boolean(selectedBatch)}`, modal manifest kargo langsung terbuka secara otomatis.
       - Menambahkan query `marking-detail-header` untuk memperkaya data kontainer/cabang jika batch dibuka hanya dengan `markingCode`.
    3. **Verifikasi**:
       - Typecheck TypeScript `bun run tsc --noEmit` di `mobile/`: **Lulus 100% (0 error)**.
       - Dokumentasi [mobile-app.md](file:///c:/shipping/mobile-app.md) dan [.agents/working.md](file:///c:/shipping/.agents/working.md) telah disinkronkan.

- [x] **Perbaikan Bug Filter fdETA pada Scope "ETA Not Exit" di Backend (`marking.service.ts`)** ([marking.service.ts](file:///c:/shipping/backend/src/modules/marking/marking.service.ts)):
  - **Permintaan Pengguna**:
    - *"cek -> eta not exit -> udara 1 tapi data nya tidak tampil"* pada mobile app.
  - **Akar Masalah (Root Cause)**:
    - Di `marking-analytics.service.ts` (penghitung KPI & alert kartu dashboard), batch ETA belum keluar dihitung menggunakan kondisi `fdETA: { lt: today }` di mana `today = new Date()` (jam saat ini). Terdapat 1 batch kargo Udara (`26ASG-EJ`) dengan `fdETA = 2026-09-16 00:00:00` (hari ini) dan `fdExitDate = null`. Karena jam 00:00:00 < jam saat ini, batch tersebut terhitung sebagai `Udara: 1`.
    - Namun pada `marking.service.ts` (penyedia data daftar `/marking?exitScope=eta_not_exit`), kondisi yang digunakan adalah `where.fdETA = { lt: todayStart }` di mana `todayStart` adalah awal hari `2026-09-16 00:00:00` (atau `2026-09-15 17:00:00 UTC`). Operator `< todayStart` menyebabkan batch dengan tanggal ETA hari ini tereliminasi (karena `00:00:00` tidak lebih kecil dari `00:00:00`), sehingga ketika user memilih filter scope `eta_not_exit` dan moda `Udara`, data mengembalikan array kosong (`[]`).
  - **Tindakan & Solusi**:
    1. Mengubah kondisi di `marking.service.ts` baris 135 dari `where.fdETA = { lt: todayStart }` menjadi `where.fdETA = { lt: today }` agar 100% identik dan konsisten dengan `marking-analytics.service.ts`.
    2. Menjalankan typecheck backend `bun run --bun tsc -b`: Lulus 100% (0 error).
    3. Merestart PM2 process `ShippingApi` (PID baru aktif dan online).
    4. Menguji query data: batch `26ASG-EJ` (Udara, ETA 2026-09-16, Consignee `AIR/XW`) kini muncul dengan sempurna pada daftar batch saat difilter `ETA Not Exit` + `Udara`.

- [x] **Re-Kompilasi Aplikasi Mobile v1.1.0 (Build 11) — Non-Force Update & Versi Tetap** ([app-version.json](file:///c:/shipping/backend/src/config/app-version.json), [mobile-app.md](file:///c:/shipping/mobile-app.md), [mshipping.apk](file:///c:/shipping/mshipping.apk)):
  - **Permintaan Pengguna**:
    - *"kompile tidak foce update versi tidak naik"*, *"mulai dari awal saya baru update codenya"*
  - **Tindakan & Solusi**:
    1. **Pengecekan Kode & Typecheck**:
       - Menjalankan `bun run tsc --noEmit` pada `mobile/`: lulus 100% tanpa error.
    2. **Bundling Bersih dari Awal**:
       - Menjalankan `bunx expo export --platform android --clear`, menghasilkan bytecode Hermes Android terbaru `entry-0400d156ff6d11f49793a0eff03de2eb.hbc` (5.4MB, 3.308 modul terkompilasi).
    3. **Repacking & Penandatanganan Resmi APK**:
       - Menginjeksikan bundle bytecode baru ke dalam `C:\shipping\mshipping.apk` dengan versionCode `11` dan versionName `1.1.0`.
       - Menandatangani APK dengan keystore resmi `mobile/keystore/release.keystore` via `uber-apk-signer.jar` (v2 & v3 signature verified, zipalign verified).
    4. **Sinkronisasi 4 Endpoint Distribusi APK**:
       - `C:\shipping\mshipping.apk` (Root Workspace)
       - `C:\shipping\frontend\dist\mshipping.apk` (Production Web Dist)
       - `C:\shipping\frontend\public\mshipping.apk` (Vite Public Assets)
       - `C:\shipping\backend\public\uploads\mshipping.apk` (Uploads API)
    5. **Konfigurasi Non-Force Update & Backend Restart**:
       - `backend/src/config/app-version.json`: `version: "1.1.0"`, `versionCode: 11`, `minVersion: "1.0.0"`, `forceUpdate: false`.
       - Layanan PM2 `ShippingApi` direstart, verifikasi endpoint `GET /api/app-version/latest` sukses mengembalikan `forceUpdate: false` dan `hasApk: true`.

- [x] **Penambahan Grouping dan Filter Tab per Tahun pada Modal Web Frontend** ([MissedTargetModal.tsx](file:///c:/shipping/frontend/src/features/shipment-batches/components/MissedTargetModal.tsx), [EtaSummaryModal.tsx](file:///c:/shipping/frontend/src/features/shipment-batches/components/EtaSummaryModal.tsx), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Permintaan Pengguna**:
    - *"@[MissedTargetModal.tsx] @[EtaSummaryModal.tsx] tambahkan grouping per tahun"*
  - **Tindakan & Solusi**:
    1. **Ekstraksi Kode Tahun Cerdas (`extractYearFromCode`)**:
       - Menguraikan 2 digit pertama prefix kode batch marking (contoh: `26...` $\to$ `2026`, `25...` $\to$ `2025`, `24...` $\to$ `2024`) dengan fallback `'Lainnya'`.
    2. **Logika State & Filtering Tahun pada Kedua Modal**:
       - `availableYears`: Mengumpulkan daftar unik tahun yang ada pada data batch yang sedang dimuat, terurut menurun (*descending*).
       - `currentYear`: Mendapatkan tahun kalender berjalan (`new Date().getFullYear().toString()`, yaitu `2026`).
       - `selectedYear`: State tahun terpilih, otomatis terinisialisasi ke tahun berjalan (`2026`).
       - `effectiveYear`: Fallback otomatis jika tahun berjalan tidak memiliki data, ke tahun pertama yang tersedia atau `'ALL'`.
       - `yearCounts`: Akumulasi jumlah batch per tahun dan total `'ALL'`.
       - `yearFilteredData`: Memfilter batch codes di setiap consignee sesuai tahun terpilih, otomatis menghapus consignee tanpa batch di tahun tersebut.
    3. **Metrik & Ringkasan KPI Responsif Per Tahun**:
       - Menghitung ulang kartu KPI statistik (`Total batch`, `Grup terdampak`, `Kritis/Sangat Telat`, `Deviasi terburuk/Tertua`) khusus berdasarkan data tahun yang aktif.
    4. **Desain Filter Tabs Multi-Tema (Midnight Dark Mode Compliant)**:
       - Menambahkan baris tabs selector tahun di bawah bar filter kontrol: `[ 2026 Aktif (count) ]` | `[ 2025 (count) ]` | `[ 2024 (count) ]` | `[ Semua (total) ]`.
       - Sesuai standar desain proyek: menggunakan outline border semantik, dilarang `bg-white` pada dark mode, indikator `Aktif` dengan badge tipis amber.
    5. **Sub-Grouping Tahun pada Tampilan "Semua"**:
       - Saat opsi `Semua` dipilih dan sebuah consignee memiliki batch lintas tahun yang berbeda, batch dikelompokkan secara visual dengan sub-header `Tahun <yr>` dan chip counter batch (`X batch`).
    6. **Verifikasi & Build**:
       - Build & typecheck frontend via `bun run build`: **Lulus 100% (0 error, ✓ built in 13.79s)**.
       - Dokumentasi [frontend-app.md](file:///c:/shipping/frontend-app.md) dan [.agents/working.md](file:///c:/shipping/.agents/working.md) telah disinkronkan.

- [x] **Filter Interaktif Kartu Peringatan Dini Operasional (ETA Not Exit & Missed SLA), Group Pills Moda (Udara & Laut), dan Group Selector Tahun (2026 Aktif Default) pada Dashboard Mobile** ([overview.tsx](file:///c:/shipping/mobile/app/%28tabs%29/overview.tsx), [marking.service.ts](file:///c:/shipping/backend/src/modules/marking/marking.service.ts), [marking.types.ts](file:///c:/shipping/backend/src/modules/marking/marking.types.ts), [marking-analytics.service.ts](file:///c:/shipping/backend/src/modules/marking/marking-analytics.service.ts), [mobile-app.md](file:///c:/shipping/mobile-app.md)):
  - **Permintaan Pengguna**:
    - *"pada saat menampilkan data ETA BELUM KELUAR dan MELEWATI TARGET SLA buat group berdasarkan tahun, tampilkan data tahun ini yang aktif"*
  - **Tindakan & Solusi**:
    1. **Backend Endpoint Extension (`marking.service.ts`)**:
       - Menambahkan parameter `query.year` pada fungsi `getMarkings`:
         - Jika `year` diisi (misal `2026`, `2025`, `2024` dan bukan `'ALL'`), backend secara otomatis memfilter batch pada rentang tahun tersebut melalui kombinasi `fdETA`, `fdLoadDate`, `fdETD`, `fdSysDate`, serta prefix 2-digit kode marking (`startsWith: '26'`).
         - Untuk `missed_sla`, evaluasi transit time terhadap SLA cabang dibatasi secara efisien hanya pada batch di tahun terpilih.
       - PM2 `ShippingApi` direstart (online).
    2. **Group Selector Tahun Interaktif pada Mobile Overview (`overview.tsx`)**:
       - Mendeteksi kondisi `isAlertScope` (`activeScope === 'eta_not_exit' || activeScope === 'missed_sla'`).
       - Menampilkan baris `SegmentedControl` filter tahun batch: `[2026 (Tahun Ini)]` | `[2025]` | `[2024]` | `[Semua]`.
       - Secara default saat kartu ETA BELUM KELUAR atau MELEWATI TARGET SLA disentuh, `yearFilter` otomatis disetel ke tahun berjalan saat ini (`2026`) sebagai tahun yang aktif.
       - Judul daftar dinamis menyesuaikan tahun terpilih (contoh: *"Batch ETA Belum Keluar (2026)"* atau *"Batch Melewati Target SLA (2026)"*).
       - Badge status menampilkan informasi tahun aktif (`2026 (Tahun Ini - Aktif)`).
    3. **Verifikasi & Sinkronisasi**:
       - Typecheck TypeScript `mobile/`: **Lulus 100% (0 error)**.
       - Typecheck TypeScript `backend/`: **Lulus 100% (0 error)**.
       - Pengujian langsung endpoint via script: `Missed SLA 2026` = 63 batch, `Missed SLA 2025` = 102 batch, `ETA Not Exit 2026` = 31 batch.
       - Dokumentasi [mobile-app.md](file:///c:/shipping/mobile-app.md) dan [.agents/working.md](file:///c:/shipping/.agents/working.md) telah disinkronkan.
       - Typecheck TypeScript `mobile/`: **Lulus 100% (0 error)**.
       - Typecheck TypeScript `backend/`: **Lulus 100% (0 error)**.
       - Pengujian langsung endpoint via Bun runtime: `ETA NOT EXIT` mengembalikan 30 batch tertahan, `MISSED SLA` mengembalikan 321 batch lewat target, filter Udara & Laut terverifikasi akurat.
       - Dokumentasi [mobile-app.md](file:///c:/shipping/mobile-app.md) dan [.agents/working.md](file:///c:/shipping/.agents/working.md) telah disinkronkan.

- [x] **Integrasi Navigasi Tombol "Lihat Semua Batch" ke Sub-Tab Batch Marking pada Tab Logistik** ([overview.tsx](file:///c:/shipping/mobile/app/%28tabs%29/overview.tsx), [logistics.tsx](file:///c:/shipping/mobile/app/%28tabs%29/logistics.tsx), [mobile-app.md](file:///c:/shipping/mobile-app.md)):
  - **Permintaan Pengguna**:
    - *"buat apabila di touch buka tab logistics dengan tab batch marking yang aktif"* pada baris 308 `overview.tsx`
  - **Tindakan & Solusi**:
    1. **Pengiriman Parameter Navigasi (`overview.tsx`)**:
       - Mengubah handler sentuhan tombol *"Lihat Semua Batch"* pada seksi Exit Activity dari navigasi statis `router.push('/(tabs)/logistics')` menjadi navigasi berparameter:
         ```tsx
         router.push({
           pathname: '/(tabs)/logistics',
           params: { tab: 'batches', t: Date.now().toString() }
         })
         ```
       - Menambahkan respon taktil `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)`.
       - Menyertakan parameter timestamp `t` agar `useEffect` di halaman tujuan selalu terpicu ulang meskipun user sebelumnya pernah membuka tab yang sama.
    2. **Penerimaan Parameter & Auto Switch Sub-Tab (`logistics.tsx`)**:
       - Mengimpor `useLocalSearchParams` dari `expo-router` dan `useEffect` dari `react`.
       - Menambahkan efek reaktif yang mengevaluasi `params.tab` / `params.initialTab`: jika bernilai `'batches'`, `'shipments'`, atau `'delivery'`, state `activeTab` langsung disetel ke tab yang diminta, serta mereset kolom pencarian (`search`) dan filter moda (`modeFilter`).
    3. **Verifikasi & Dokumentasi**:
       - Typecheck TypeScript `bun run tsc --noEmit` di `mobile/`: **Lulus 100% (0 error)**.
       - Dokumentasi [mobile-app.md](file:///c:/shipping/mobile-app.md) pada Seksi 3.4 telah disinkronkan.

- [x] **Kompilasi, Penandatanganan, dan Rilis Pembaruan Aplikasi Mobile Versi v1.1.0 (Build 11) — Force Update** ([version.ts](file:///c:/shipping/mobile/src/config/version.ts), [app.json](file:///c:/shipping/mobile/app.json), [app-version.json](file:///c:/shipping/backend/src/config/app-version.json), [mobile-app.md](file:///c:/shipping/mobile-app.md)):
  - **Permintaan Pengguna**:
    - *"Kompile mobile app"* -> Dikonfirmasi oleh user: Nomor versi `v1.1.0` (versionCode: `11`), Tipe update: `Force Update` (`forceUpdate: true`).
  - **Tindakan & Solusi**:
    1. **Sinkronisasi Konfigurasi Versi**:
       - `mobile/src/config/version.ts`: `APP_VERSION = '1.1.0'`, `APP_VERSION_CODE = 11`.
       - `mobile/app.json`: `version: "1.1.0"`, `versionCode: 11`.
       - `backend/src/config/app-version.json`: `version: "1.1.0"`, `versionCode: 11`, `minVersion: "1.1.0"`, `forceUpdate: true`.
    2. **Bundling Hermes**:
       - Berhasil menjalankan `bunx expo export --platform android` menghasilkan bundle bytecode Hermes Android (`5.4MB`).
    3. **Patching Manifest, Penandatanganan & Verifikasi Signature**:
       - Memperbarui `versionName` menjadi `'1.1.0'` dan `versionCode` menjadi `11` pada binary `AndroidManifest.xml`.
       - Menandatangani berkas APK menggunakan keystore resmi `mobile/keystore/release.keystore` via `uber-apk-signer.jar` (Signature v2 & v3 verified, zipalign verified).
    4. **Distribusi Serentak**:
       - File APK (`121.1 MB`) disinkronkan ke seluruh 4 target distribusi:
         - `C:\shipping\mshipping.apk`
         - `C:\shipping\frontend\dist\mshipping.apk`
         - `C:\shipping\frontend\public\mshipping.apk`
         - `C:\shipping\backend\public\uploads\mshipping.apk`
    5. **Verifikasi Backend**:
       - Backend PM2 `ShippingApi` direstart dan endpoint `GET /api/app-version/latest` sukses mengembalikan versi `1.1.0`, `versionCode: 11`, dan `forceUpdate: true`.

- [x] **Penghapusan Menu "Profile & Security" (Profil & Keamanan) dari Sidebar Web Frontend** ([Sidebar.tsx](file:///c:/shipping/frontend/src/components/layout/Sidebar.tsx), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Permintaan Pengguna**:
    - *"Hapus dari side bar profile and security"*
  - **Tindakan & Solusi**:
    - Menghapus item navigasi `{ label: t('nav.profile'), path: ROUTES.PROFILE, icon: User }` dari grup modul `overview` pada `Sidebar.tsx`.
    - Membersihkan impor icon `User` yang sudah tidak digunakan di `Sidebar.tsx`.
    - Menu `overview` di sidebar kini hanya menampilkan **Dashboard** (`ROUTES.DASHBOARD`).
    - Akses halaman **Profile & Keamanan** (`/mshipping/profile`) tetap dapat diakses dengan mudah dan elegan melalui chip identitas pengguna / avatar pada header bagian atas (`Topbar.tsx`), serta melalui rute langsung `ROUTES.PROFILE`.
    - Kompilasi `bun run build` frontend berhasil (2.45s, 0 error).

- [x] **Penambahan Fitur Actionable Alerts pada Mobile Dashboard dan 4 Pilar Data Komprehensif pada Web Dashboard** ([overview.tsx](file:///c:/shipping/mobile/app/%28tabs%29/overview.tsx), [DashboardPage.tsx](file:///c:/shipping/frontend/src/features/dashboard/pages/DashboardPage.tsx), [dashboard.service.ts](file:///c:/shipping/backend/src/modules/dashboard/dashboard.service.ts), [dashboard.types.ts](file:///c:/shipping/backend/src/modules/dashboard/dashboard.types.ts), [frontend-app.md](file:///c:/shipping/frontend-app.md), [mobile-app.md](file:///c:/shipping/mobile-app.md)):
  - **Permintaan Pengguna**:
    - *"pada mobile tambahkan 1. Operasional Lapangan & Peringatan Dini (Actionable Alerts) dan pada web tambahkan 4 data itu"*
  - **Implementasi Mobile Dashboard (`mobile/app/(tabs)/overview.tsx`)**:
    1. **Kartu Peringatan Dini Operasional**:
       - **ETA Belum Keluar (*ETA Not Exit*)**: Menghitung jumlah batch melewati jadwal ETA namun belum keluar gudang/pelabuhan (`fdExitDate` null). Breakdown otomatis moda Udara & Laut.
       - **Melewati Target SLA (*Missed Target SLA*)**: Menghitung jumlah batch dengan durasi transit ETD -> ETA melebihi standar SLA cabang (Air SG > 5, HK > 7, GZ > 10 hari; Sea SG > 20, HK/GZ/SH > 30, YW > 40 hari).
    2. **Modal Interaktif Rincian Consignee**:
       - Mengetuk kartu alert membuka modal responsif menampilkan nama consignee, badge jumlah batch, dan chip kode batch lengkap dengan informasi aging hari keterlambatan / durasi transit vs target SLA.
    3. **Bundling & APK Distribution**:
       - Diekspor via Hermes (`bunx expo export --platform android`), di-repack, di-sign dengan `release.keystore` via `uber-apk-signer.jar` (v2, v3 signature verified), dan disinkronkan ke 4 endpoint distribusi APK.
  - **Implementasi Backend (`backend/src/modules/dashboard/`)**:
    - Memperbarui `dashboard.service.ts` dan `dashboard.types.ts` untuk mengembalikan 4 section baru secara terpadu melalui endpoint `GET /api/dashboard/stats`:
      1. `actionableAlerts`: `etaNotExit` & `missedTargetSLA` (dari kalkulasi teruji `getMarkingKPIs`).
      2. `deliveryStatus`: `scheduled`, `onDelivery`, `delivered`, `outstandingSJ`, total koli & total berat.
      3. `financialOverview`: antrean validasi draft tagihan (`draftInvoicesCount` & `draftInvoicesAmount`), piutang jatuh tempo (`overdueInvoicesCount` & `overdueInvoicesAmount`), dan omzet bulan berjalan (`monthlyInvoicesCount` & `monthlyRevenue`).
      4. `originAnalytics`: pangsa muatan kargo per cabang asal (`branches` volume $m^3$, berat $kg$, paket, porsi air/sea) dan jadwal kedatangan mendatang 48-72 jam (`upcomingArrivals`).
    - PM2 Backend (`ShippingApi`) direstart dan terverifikasi online.
  - **Implementasi Web Dashboard (`frontend/src/features/dashboard/pages/DashboardPage.tsx`)**:
    1. **1. Operasional Lapangan & Peringatan Dini (Actionable Alerts)**:
       - Kartu visual berbingkai semantik (Amber & Rose) dengan tombol *"Lihat Rincian Consignee"* yang memunculkan modal dialog daftar consignee & keterlambatan.
    2. **2. Distribusi & Pengantaran Lokal (Delivery Orders Pipeline)**:
       - Pipeline 4 tahap pengiriman lokal (Dijadwalkan -> Dalam Pengantaran -> Terkirim -> Outstanding SJ) beserta akumulasi koli dan berat barang.
    3. **3. Keuangan & Arus Kas (Billing & Cash Flow)**:
       - 3 Kartu metrik: Antrean Validasi Tagihan (tautan langsung ke Audit Validasi), Tagihan Overdue (> 30 hari), dan Omzet Bulan Berjalan.
    4. **4. Analitik Jalur Asal (Origin) & Jadwal Kedatangan Mendatang (Upcoming Arrivals)**:
       - Tabel pangsa muatan cabang asal (GZ, SG, HK, YW, SH, dll.) dengan volume $m^3$ & berat $kg$.
       - Kartu kedatangan mendatang (48-72 jam) lengkap dengan ETA, moda Udara/Laut, consignee, dan gudang.
    5. **Multi-Tema & i18n**:
       - Mendukung tema Midnight Dark (latar transparan, border semantik, tanpa `bg-white`).
       - Menambahkan key terjemahan lengkap di `src/lib/i18n/id.json` dan `src/lib/i18n/en.json`.
       - Kompilasi `tsc -b && vite build` sukses 100% (0 error).

- [x] **Penyelarasan Nama Cabang Resmi Berdasarkan Master `tbCabang` pada Filter & Visualisasi Komoditas Shipment Dashboard** ([shipments.service.ts](file:///c:/shipping/backend/src/modules/shipments/shipments.service.ts), [shipments.types.ts](file:///c:/shipping/backend/src/modules/shipments/shipments.types.ts), [CommodityDistributionCard.tsx](file:///c:/shipping/frontend/src/features/shipments/components/CommodityDistributionCard.tsx), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Permintaan Pengguna**:
    - *"branch -> fdBranchCode -> fdBranchName dari tbCabang -> perbaiki -> Filter Branch: All Branches SG (Singapore) GZ (Guangzhou) HK (Hong Kong) YW (Yiwu) SH (Shanghai) SZ (Shenzhen) EX (Express) IM LG (Logistics) LM (Laem Chabang)"*
  - **Akar Masalah & Ketidaksesuaian**:
    - Sebelumnya pada komponen visualisasi komoditas, nama cabang di-hardcode dengan tebakan yang tidak akurat:
      - `EX` di-hardcode sebagai *"Express"* padahal master `tbCabang` mencatat *"EXPORT"*.
      - `LG` di-hardcode sebagai *"Logistics"* padahal master `tbCabang` mencatat *"LEGAL"*.
      - `LM` di-hardcode sebagai *"Laem Chabang"* padahal master `tbCabang` mencatat *"LEGAL MANDIRI"*.
      - `IM` tidak memiliki label nama padahal master `tbCabang` mencatat *"IMPORT LAIN-LAIN"*.
  - **Tindakan & Solusi**:
    1. **Master Data `tbCabang` sebagai Single Source of Truth**:
       - Membaca seluruh data master dari tabel `dbo.tbCabang` via Prisma:
         - `SG` -> `Singapore` (termasuk `--` dan `-` yang dinormalisasi ke `SG`)
         - `GZ` -> `Guangzhou`
         - `HK` -> `Hong Kong`
         - `YW` -> `Yiwu`
         - `SH` -> `Shanghai`
         - `SZ` -> `Shenzhen`
         - `EX` -> `Export`
         - `IM` -> `Import Lain-lain`
         - `LG` -> `Legal`
         - `LM` -> `Legal Mandiri`
         - `BT` -> `Batam`, `TH` -> `Thailand`
    2. **Penyempurnaan Backend KPI Service (`shipments.service.ts` & `shipments.types.ts`)**:
       - Mengambil data dari `prisma.tbCabang.findMany()` di dalam `getShipmentsKPIs`.
       - Menambahkan properti `branchName` ke setiap `CommodityBranchMetric` dalam `branches`.
       - Mengembalikan `availableBranches` sebagai array `BranchInfo[]` (`{ code: string, name: string }`).
    3. **Penyempurnaan Antarmuka Frontend (`CommodityDistributionCard.tsx`)**:
       - Memperbarui `BRANCH_NAMES_FALLBACK` 100% selaras dengan data resmi `tbCabang`.
       - Menggunakan `branchNameMap` dinamis dari `commodities.availableBranches` yang dikirimkan API.
       - Menampilkan nama resmi pada tombol filter cabang: `SG (Singapore)`, `GZ (Guangzhou)`, `HK (Hong Kong)`, `YW (Yiwu)`, `SH (Shanghai)`, `SZ (Shenzhen)`, `EX (Export)`, `IM (Import Lain-lain)`, `LG (Legal)`, `LM (Legal Mandiri)`.
       - Tooltip hover pada BarChart kini menampilkan nama resmi cabang (misal *"Export"*, *"Legal"*, *"Legal Mandiri"*).
    4. **Verifikasi & Build**:
       - Backend PM2 `ShippingApi` direstart (status online).
       - Kompilasi `bun run build` frontend lulus 100% (3.48s, 0 error).
       - Dokumentasi `frontend-app.md` dan `.agents/working.md` disinkronkan.

- [x] **Filter Data Tahun Berjalan (2026) Berdasarkan Tanggal Loading (`fdLoadDate` -> `tbMarking`) pada Dashboard Shipment & KPI** ([shipments.service.ts](file:///c:/shipping/backend/src/modules/shipments/shipments.service.ts), [shipments-status.resolver.ts](file:///c:/shipping/backend/src/modules/shipments/shipments-status.resolver.ts), [shipments.types.ts](file:///c:/shipping/backend/src/modules/shipments/shipments.types.ts), [DashboardPage.tsx](file:///c:/shipping/frontend/src/features/shipments/pages/DashboardPage.tsx), [CommodityDistributionCard.tsx](file:///c:/shipping/frontend/src/features/shipments/components/CommodityDistributionCard.tsx), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Permintaan Pengguna**:
    - *"ambil data tahun sekarang saja berdasarkan fdLoadDate -> tbMarking"*
  - **Latar Belakang & Akar Masalah**:
    - Sebelumnya, query agregasi `getShipmentsKPIs` mengambil seluruh data historis dari view `vwShipment` tanpa batasan tahun (~387.180 baris data sejak tahun 2009).
    - Metrik bulanan (`thisMonth` dan `lastMonth`) sebelumnya menggunakan `fdTglAgent` yang sering kali null atau berbeda dari tanggal operasional muat kontainer/marking.
  - **Tindakan & Solusi**:
    1. **Relasi SQL `vwShipment.fdMarkingCode` ke `tbMarking.fdLoadDate`**:
       - Mengaitkan resi pengiriman dengan tanggal muat kontainer `fdLoadDate` pada master `tbMarking`.
       - Untuk tahun berjalan (2026):
         ```sql
         fdMarkingCode IN (
           SELECT fdMarkingCode FROM tbMarking WITH (NOLOCK)
           WHERE fdLoadDate >= '2026-01-01' AND fdLoadDate < '2027-01-01'
         )
         ```
       - Query dieksekusi secepat ~300ms memanfaatkan index `fdLoadDate` pada `tbMarking`.
    2. **Sinkronisasi Metrik KPI Eksekutif & Distribusi Komoditas (`shipments.service.ts`)**:
       - `totalAgg`: Total Resi (29.919), Total Koli (552.127), Total Berat (16,68 Jt kg), Total Volume (63,4k m³), dan Total Customer Aktif (2.159) kini merefleksikan tahun berjalan 2026.
       - `thisMonth` (September 2026): 1.920 resi (disinkronkan via `fdLoadDate`).
       - `lastMonth` (Agustus 2026): 3.578 resi (disinkronkan via `fdLoadDate`).
       - `commodityAgg`: Distribusi komoditas Laut dan Udara beserta breakdown cabang (`SG`, `GZ`, `HK`, `YW`, `SH`, `SZ`, dll) dihitung khusus untuk muatan tahun berjalan 2026.
    3. **Dukungan Parameter `year` Dinamis (`shipments-status.resolver.ts`)**:
       - Menambahkan evaluasi parameter `query.year` pada `buildShipmentConditions`.
       - Jika `year` tidak diisi pada KPI, default otomatis ke tahun sekarang (`YEAR(GETDATE())`). Jika diisi `'ALL'`, mengambil seluruh histori.
    4. **Penyelarasan Antarmuka Frontend (`DashboardPage.tsx` & `CommodityDistributionCard.tsx`)**:
       - Header halaman dan section distribusi komoditas menampilkan badge/keterangan konteks tahun berjalan: `Tahun 2026 (Berdasarkan Tgl Loading)`.
       - `CommodityDistributionSection` menerima prop `year={kpis?.year}` dan menampilkan badge tahun pada header visualisasi bar chart.
    5. **Verifikasi & Deployment**:
       - Layanan PM2 `ShippingApi` direstart (status online).
       - Kompilasi `bun run build` sukses (0 error). Live di `http://36.93.22.142/mshipping/logistics/shipments`.

- [x] **Perbaikan Fungsi Copy Data Kargo pada Target Penagihan untuk HTTP Non-Secure Context** ([TargetPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/TargetPage.tsx), [utils.ts](file:///c:/shipping/frontend/src/lib/utils.ts), [ShipmentDetailModal.tsx](file:///c:/shipping/frontend/src/features/shipments/components/ShipmentDetailModal.tsx), [CustomerDetailModal.tsx](file:///c:/shipping/frontend/src/features/customers/components/CustomerDetailModal.tsx), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Permintaan Pengguna**:
    - *"fungsi copy pada http://36.93.22.142/mshipping/finance/billing/target belum bekerja"*
  - **Akar Masalah**:
    - Tombol copy data kargo pada `TargetPage.tsx` sebelumnya memanggil `navigator.clipboard.writeText(textToCopy)` secara langsung.
    - Pada standar browser modern (Chrome, Edge, Firefox, Safari), `navigator.clipboard` hanya tersedia pada *Secure Contexts* (`https://` atau `localhost`).
    - Saat aplikasi diakses melalui alamat IP publik berbasis HTTP tanpa SSL (`http://36.93.22.142/...`), properti `navigator.clipboard` bernilai `undefined`.
    - Pemanggilan `navigator.clipboard.writeText(...)` menghasilkan unhandled JavaScript error: `TypeError: Cannot read properties of undefined (reading 'writeText')`, sehingga event handler terhenti, clipboard gagal diisi, dan visual feedback (checkmark/toast) tidak muncul.
  - **Tindakan & Solusi**:
    1. **Integrasi Helper `copyToClipboard` Standar (`src/lib/utils.ts`) pada `TargetPage.tsx`**:
       - Mengganti pemanggilan langsung `navigator.clipboard.writeText` dengan fungsi utilitas teruji `copyToClipboard(textToCopy)`.
       - Helper ini secara otomatis mendeteksi ketersediaan API modern pada secure context (`navigator.clipboard && window.isSecureContext`), dan menyediakan fallback teruji berbasis elemen `<textarea>` temporer + `document.execCommand('copy')` dengan rentang seleksi penuh (`setSelectionRange`) untuk lingkungan HTTP non-secure.
       - Menyediakan pengecekan boolean `success` untuk memicu toast error jika salinan gagal.
    2. **Pencegahan Masalah Serupa pada Komponen Lain**:
       - Memperbaiki `ShipmentDetailModal.tsx` dan `CustomerDetailModal.tsx` yang sebelumnya juga menggunakan `navigator.clipboard.writeText` secara langsung menjadi `copyToClipboard` terstandarisasi.
    3. **Kompilasi & Verifikasi**:
       - Menjalankan `bun run build` di frontend: Berhasil 100% (4.08s, exit code 0) dan dist IIS terupdate otomatis.
       - Sinkronisasi dokumentasi [frontend-app.md](file:///c:/shipping/frontend-app.md) dan `.agents/working.md`.

- [x] **Breakdown Komoditas Per Kode Cabang (Branch Code) & Unifikasi Kode Cabang `--` ke `SG`** ([shipments.service.ts](file:///c:/shipping/backend/src/modules/shipments/shipments.service.ts), [shipments-status.resolver.ts](file:///c:/shipping/backend/src/modules/shipments/shipments-status.resolver.ts), [shipments.types.ts](file:///c:/shipping/backend/src/modules/shipments/shipments.types.ts), [CommodityDistributionCard.tsx](file:///c:/shipping/frontend/src/features/shipments/components/CommodityDistributionCard.tsx), [id.json](file:///c:/shipping/frontend/src/lib/i18n/id.json), [en.json](file:///c:/shipping/frontend/src/lib/i18n/en.json), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Permintaan Pengguna**:
    - *"bagi tiap2 tipe comodity ke tiap kode branchcode -> -- dan sg itu sama"*
  - **Tindakan & Solusi**:
    1. **Normalisasi Kode Cabang (`--` dan `-` disatukan ke `SG`)**:
       - Berdasarkan aturan bisnis, kode cabang `--` (6,291 baris) dan `-` (12 baris) di `vwShipment` adalah cabang Singapore (`SG`).
       - Diterapkan secara menyeluruh di backend SQL query:
         ```sql
         CASE WHEN s.fdBranchCode IS NULL OR RTRIM(s.fdBranchCode) IN ('', '--', '-') THEN 'SG' ELSE RTRIM(s.fdBranchCode) END as branchCode
         ```
       - Diterapkan juga pada resolver kondisi filter `buildShipmentConditions` ([shipments-status.resolver.ts](file:///c:/shipping/backend/src/modules/shipments/shipments-status.resolver.ts)) sehingga filter cabang `SG` otomatis mencakup `SG`, `--`, `-`, dan string kosong.
       - Diterapkan pada `getShipmentBranches` di mana cabang di-deduplicate dan diprioritaskan (`SG`, `GZ`, `HK`, `YW`, `SH`, `SZ`).
    2. **Agregasi Komoditas Per Cabang pada Backend (`shipments.service.ts`)**:
       - Query `commodityAgg` pada `getShipmentsKPIs` diperbarui untuk mengelompokkan data berdasarkan tipe komoditas, moda (`fdListType`), dan `branchCode`.
       - Menghasilkan struktur `branches: CommodityBranchMetric[]` untuk setiap item komoditas (jumlah resi, koli, berat, volume, dan persentase kontribusi cabang).
       - Menghasilkan daftar `availableBranches` terurut untuk frontend.
    3. **Penyelarasan Tipe Data TypeScript (`shipments.types.ts`)**:
       - Menambahkan interface `CommodityBranchMetric` dan properti `branches` pada `ShipmentCommodityMetric` serta `availableBranches` pada `ShipmentCommoditiesData` di backend dan frontend.
    4. **Antarmuka Interaktif Distribusi Komoditas (`CommodityDistributionCard.tsx`)**:
       - **Toolbar Filter Cabang Terpadu**: Tombol pill filter `[Semua Cabang]` | `[SG (Singapore)]` | `[GZ (Guangzhou)]` | `[HK (Hong Kong)]` | `[YW (Yiwu)]` | `[SH (Shanghai)]` | `[SZ (Shenzhen)]` ... dengan dukungan multi-tema dan Midnight Dark Mode (outline/subtle background).
       - **Tooltip Bar Chart Dinamis**: Saat `Semua Cabang` aktif, hover tooltip menampilkan breakdown 5 cabang pengirim teratas beserta persentase kontribusinya. Saat cabang tertentu dipilih, tooltip menampilkan metrik spesifik cabang dan porsi kontribusinya terhadap total volume komoditas tersebut.
       - **Mini-Rank Card Badges**: Menampilkan pill badge sebaran cabang utama (misal `SG 50%`, `GZ 34%`, `HK 11%`) di bawah kartu 4 komoditas teratas.
       - **Filter Metrik Terpadu**: Mendukung 4 dimensi metrik (Resi, Koli, Berat kg, Volume m³).
    5. **Verifikasi & Build**:
       - Backend PM2 `ShippingApi` direstart (status online).
       - Eksekusi query live menghasilkan data presisi: `GENERAL` Udara (SG: 34,837, GZ: 23,783, HK: 7,911, SZ: 2,479, SH: 490...), `UMUM` Laut (GZ: 71,284, SG: 21,306, HK: 9,079, SZ: 2,902, SH: 2,828, YW: 1,869...).
       - Frontend `bun run build` sukses tanpa error TypeScript / bundling.
       - Dokumentasi `frontend-app.md` dan `.agents/working.md` disinkronkan.

- [x] **Perbaikan Distribusi Komoditas Laut & Udara (Sea & Air Freight Commodities)** ([shipments.service.ts](file:///c:/shipping/backend/src/modules/shipments/shipments.service.ts), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Permintaan Pengguna**:
    - *"http://36.93.22.142/mshipping/logistics/shipments -> perbaiki Sea Freight Commodities No commodity data available dan Air Freight Commodities No commodity data available"*
  - **Akar Masalah**:
    1. View `dbo.vwShipment` di database MS SQL Server sebelumnya tidak menyertakan kolom `e.fdTypeComodity` dari tabel dasar `tbEntryList`, sehingga klausa JOIN `ON tc.fdTypeComodity = s.fdTypeComodity` menyebabkan error SQL `Code: 207 (Invalid column name 'fdTypeComodity')`.
    2. Adanya potensi error SQL `Code: 209 (Ambiguous column name 'fdListType')` saat parameter filter `listType` disertakan dalam query kpi, karena kolom `fdListType` dimiliki oleh kedua tabel (`vwShipment` dan `tbTypeComodity`).
    3. Karena query database dibungkus mekanisme ketahanan `safeQuery`, kegagalan query diam-diam mengembalikan array kosong `[]`, yang membuat frontend menampilkan pesan *"No commodity data available"*.
  - **Tindakan & Solusi**:
    1. **Database Schema View Update**:
       - Mengupdate view `dbo.vwShipment` via `ALTER VIEW` agar menyertakan kolom `e.fdTypeComodity` dari master manifes `dbo.tbEntryList`.
    2. **Subquery Derivasi SQL Terisolasi (`shipments.service.ts`)**:
       - Mengubah query agregasi komoditas menggunakan pola subquery terisolasi:
         ```sql
         FROM (
           SELECT fdListCode, fdListType, fdJmlPack, fdJmlBerat, fdM3, fdTypeComodity
           FROM vwShipment WITH (NOLOCK)
           ${whereClause}
         ) s
         LEFT JOIN tbTypeComodity tc WITH (NOLOCK) 
           ON tc.fdTypeComodity = s.fdTypeComodity AND tc.fdListType = s.fdListType
         GROUP BY ISNULL(NULLIF(RTRIM(tc.fdComodityName), ''), 'Other'), s.fdListType
         ORDER BY s.fdListType, shipments DESC
         ```
       - Pola ini mengisolasi seluruh klausa `${whereClause}` hanya pada `vwShipment`, sehingga menghilangkan risiko *ambiguous column name* dan memastikan eksekusi selalu aman untuk seluruh kombinasi filter (`ALL`, `listType=1`, `listType=2`, `branch`, `search`).
    3. **Verifikasi & Live Test**:
       - Layanan PM2 `ShippingApi` direstart.
       - Pengujian langsung endpoint terautentikasi `GET /api/shipments/kpi` mengembalikan **8 kategori komoditas Udara** (*GENERAL, BRANDED, FOOD, GARMENT, MEDICAL, SHOES, LEGAL, Other*) dan **9 kategori komoditas Laut** (*UMUM, LARTAS - N, LARTAS - S, GARMENT, SEMI GARMENT, TEKSTIL, FCL, LEGAL, Other*) dengan status **HTTP 200 OK**.
       - Frontend web kembali menampilkan grafik horizontal bar dan rincian metrik komoditas secara proporsional dan lengkap.

- [x] **Filter Interaktif 4 Kartu KPI Exit Activity (Default Hari Ini & Exit Terbaru 7 Hari Terakhir)** ([overview.tsx](file:///c:/shipping/mobile/app/%28tabs%29/overview.tsx), [marking.service.ts](file:///c:/shipping/backend/src/modules/marking/marking.service.ts), [marking-analytics.service.ts](file:///c:/shipping/backend/src/modules/marking/marking-analytics.service.ts), [mobile-app.md](file:///c:/shipping/mobile-app.md)):
  - **Permintaan Pengguna**:
    - *"Daftar Batch Exit Terkini: Nomor batch marking, kontainer/AWB, cabang asal, consignee, tanggal exit, koli & berat. -> default yang exit hari ini, apabila 4 Kartu KPI Ringkasan Exit di touch maka data akan menyesuaikan sesuai dengan kriterianya. Exit terbaru ambil dari 7 hari yang lalu."*
  - **Tindakan & Solusi**:
    1. **Backend Aggregation & Filter Endpoint (`marking.service.ts` & `marking-analytics.service.ts`)**:
       - `getMarkings`: Mendukung parameter query `exitScope` (`today`, `yesterday`, `tomorrow`, `recent`):
         - `today`: Filter `fdExitDate >= todayStart AND fdExitDate < tomorrowStart`.
         - `yesterday`: Filter `fdExitDate >= yesterdayStart AND fdExitDate < todayStart`.
         - `recent`: Filter `fdExitDate >= sevenDaysAgoStart AND fdExitDate < tomorrowStart` (mengambil batch keluar dalam 7 hari terakhir).
         - `tomorrow`: Memanggil `computeExitPrediction`, mencari batch dengan perkiraan keluar besok (`fdExitDate` null), dan menyertakan `predictedExitDate`.
       - `getMarkingKPIs`: Menambahkan perhitungan metrik `exitLast7DaysCount`, `exitLast7DaysAir`, dan `exitLast7DaysSea` agar kartu ke-4 (Exit 7 Hari) memiliki jumlah total dan breakdown live Udara vs Laut yang identik dengan ketiga kartu lainnya.
       - PM2 `ShippingApi` direstart (online).
    2. **Interaktivitas 4 Kartu KPI pada Mobile Overview (`overview.tsx`)**:
       - State `activeScope` dengan default `'today'`.
       - Mengetuk kartu KPI manapun (`onPress`) langsung mengubah filter `activeScope` dan memicu fetch data batch list secara instan dengan haptic tactile feedback.
       - Kartu yang aktif ditandai dengan border highlight tebal semantik (Hijau untuk Hari Ini, Biru untuk Kemarin, Amber untuk Besok, dan Biru/Aksen untuk Exit 7 Hari) beserta dot indikator status.
       - Header dinamis di atas list menampilkan judul scope yang aktif (`Batch Exit Hari Ini`, `Batch Exit Kemarin`, `Prediksi Exit Besok`, `Batch Exit 7 Hari Terakhir`) beserta counter badge jumlah batch.
       - Item list menampilkan tanggal exit riil atau tanggal estimasi keluar (`Prediksi: ...`) dengan warna tema yang harmonis.
       - Pesan *empty state* yang kontekstual per filter scope.
    3. **Penyelarasan Dokumentasi & Verifikasi**:
       - [mobile-app.md](file:///c:/shipping/mobile-app.md) diperbarui pada Seksi 3.4.
       - Typecheck `bun run tsc --noEmit` di `mobile/`: **0 error (Lulus 100%)**.
       - Typecheck `bun run --bun tsc --noEmit` di `backend/`: **0 error (Lulus 100%)**.
       - **Status Kompilasi APK**: Disimpan terlebih dahulu (*pending build*) sesuai arahan user, tetap pada versi aktif **v1.0.9 (Build 10)** hingga akumulasi perubahan mencapai > 5 item.

- [x] **Penghapusan Quick Action Grid, Filter Segmented Moda, & 4 Kartu KPI Eksekutif dari Dashboard Mobile Overview** ([overview.tsx](file:///c:/shipping/mobile/app/%28tabs%29/overview.tsx), [finance.tsx](file:///c:/shipping/mobile/app/%28tabs%29/finance.tsx), [mobile-app.md](file:///c:/shipping/mobile-app.md)):
  - **Permintaan Pengguna**:
    - *"pada mobile app -> dashboard -> 2. 4 Quick Action Grid, 3. Filter Segmented Moda Operasional, 4. 4 Kartu KPI Eksekutif -> hapus"*
  - **Tindakan & Solusi**:
    1. **Pembersihan Komponen UI Dashboard Mobile (`overview.tsx`)**:
       - Menghapus **4 Quick Action Grid** (`Scan Resi`, `Shipment`, `Billing`, `Cek Tarif`).
       - Menghapus modal barcode scanner dan state pemindai resi dari dashboard (fungsi scan tetap tersedia pada search bar tab Logistik).
       - Menghapus **Filter Segmented Moda Operasional** (`all`, `1`, `2`).
       - Menghapus **4 Kartu KPI Eksekutif** (`TOTAL RESI`, `TOTAL KOLI`, `TOTAL BERAT`, `TOTAL VOLUME`) beserta pemanggilan query `/api/shipments/kpi`.
       - Halaman Dashboard kini berfokus penuh pada **Header Pengguna** dan seksi **Exit Activity** (4 Kartu Ringkasan Exit dan Daftar Batch Exit Terkini) dengan gesture pull-to-refresh yang ringan dan cepat.
    2. **Perbaikan Button pada `finance.tsx`**:
       - Menyesuaikan prop komponen `<Button />` pada dialog detail faktur (`title`, `icon`, `loading`) agar selaras dengan `ButtonProps` mobile.
    3. **Penyelarasan Dokumentasi**:
       - Dokumentasi [mobile-app.md](file:///c:/shipping/mobile-app.md) disinkronkan pada Seksi 3.4 dan Matriks Endpoint Seksi 4.
    4. **Typecheck & Verifikasi**:
       - `bun run tsc --noEmit` di direktori `mobile/`: **Lulus 100% (0 error)**.

- [x] **Transformasi Dashboard Delivery Orders Menjadi Warehouse Inventory & Delivery Orders Control Center** ([DashboardPage.tsx](file:///c:/shipping/frontend/src/features/delivery-orders/pages/DashboardPage.tsx), [delivery-orders.service.ts](file:///c:/shipping/frontend/src/features/delivery-orders/services/delivery-orders.service.ts), [id.json](file:///c:/shipping/frontend/src/lib/i18n/id.json), [en.json](file:///c:/shipping/frontend/src/lib/i18n/en.json), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Permintaan Pengguna**:
    - *"http://36.93.22.142/mshipping/logistics/delivery-orders -> tampilkan data seolah ini juga seperti data inventory gudang"*
  - **Tindakan & Solusi**:
    1. **5 Kartu KPI Eksekutif Terintegrasi Stok Gudang On-Hand & Status Pengantaran**:
       - *Stok Kargo Gudang (On-Hand)*: Total batch/manifest yang belum selesai kirim (`sent=0`) dengan breakdown live Kargo Laut vs Kargo Udara.
       - *Total Koli Terkirim*, *Total Surat Jalan*, *Tonase Berat Terkirim (kg)*.
       - *Dalam Pengantaran (On Delivery)*: Menghitung total surat jalan yang sedang dibawa armada di jalan dan belum selesai (`fdSent=0`). Menggantikan metrik periode bulanan yang redundan (Opsi C terpilih). Kartu interaktif dapat diklik langsung untuk menuju daftar surat jalan.
    2. **Workflow Stage Banners (Alur Gudang ke Pengiriman)**:
       - Banner Tahap 1: *Stok Mengendap di Gudang (Waiting Delivery)*
       - Banner Tahap 2: *Kargo Selesai Terkirim (Fulfilled Deliveries)*
    3. **Tabel Interaktif Inventori Stok Kargo di Gudang (Warehouse Inventory)**:
       - Tab Mode Moda: Laut (`listType=2`) vs Udara (`listType=1`).
       - Status Filter: `Di Gudang (On-Hand)` (`sent=0`), `Selesai Kirim` (`sent=1`), `Semua Kargo`.
       - Kolom komprehensif: No. List / Manifest Code, Marking & Customer, Komoditi & Cabang Asal, Total Qty Masuk Gudang, Terkirim, Sisa Koli On-Hand, Visual Progress Bar Keterisian, Status Badges (`100% In-Stock`, `Parsial`, `Selesai`), serta Quick Action *"Buat Surat Jalan"* yang mengarahkan langsung ke halaman daftar pengiriman.
       - Live search debounced (350ms) dan pagination 10 item per page.
    4. **Dukungan Multi-Tema & i18n**:
       - Menggunakan variabel tema CSS (`--color-surface`, `--color-primary`, `--color-border`, dll) yang ramah Midnight Dark Mode.
       - Seluruh teks visual diterjemahkan secara bilingual di `id.json` dan `en.json`.
       - Kompilasi produksi `bun run build` sukses 100% tanpa error.
       - Dokumentasi arsitektur di `frontend-app.md` diperbarui.

- [x] **Penyelarasan Form Penagihan (`tbCustomerPenagihan`), Tab Daftar Alamat Resmi, `fdBranchCode` Resi, Exit Activity Dashboard, Audit Validasi ERP, & Cek Tarif Price List Lookup (v1.0.9 Build 10, Force Update: true)** ([master.tsx](file:///c:/shipping/mobile/app/%28tabs%29/master.tsx), [overview.tsx](file:///c:/shipping/mobile/app/%28tabs%29/overview.tsx), [finance.tsx](file:///c:/shipping/mobile/app/%28tabs%29/finance.tsx), [logistics.tsx](file:///c:/shipping/mobile/app/%28tabs%29/logistics.tsx), [customers.service.ts](file:///c:/shipping/backend/src/modules/customers/customers.service.ts), [app-version.json](file:///c:/shipping/backend/src/config/app-version.json), [app.json](file:///c:/shipping/mobile/app.json), [version.ts](file:///c:/shipping/mobile/src/config/version.ts), [mobile-app.md](file:///c:/shipping/mobile-app.md)):
  - **Permintaan Pengguna**:
    - *"Modal Detail Customer -> Tab 4: Penagihan (penagihan): -> fdNPWP tidak perlu hapus. Kategori Pelanggan & Syarat Pembayaran (TOP). -> tidak ada data hapus, Batas Kredit (Credit Limit) tidak ada data hapus. hanya tampilkan seperti image yang di upload. data diambil dari ->tbCustomerPenagihan keynya fdCustCode. Tab Cabang ganti textnya menjadi alamat seperti image yang di upload. tambahkan fdBranchCode dari tbEntrylist pada data daftar resi. pada dasboard tampilkan data http://36.93.22.142/mshipping/logistics/shipment-batches -> Exit Activity. Hapus list Shipment terkini. data pada tab billing -> audit validasi -> ambil dari http://36.93.22.142/mshipping/finance/billing/validation/list. Hapus tab kalkulator tarif ganti dengan http://36.93.22.142/mshipping/finance/price-list/lookup dan http://36.93.22.142/mshipping/finance/customer-price-list/lookup"*
  - **Tindakan & Solusi**:
    1. **Tab 4: Penagihan (`penagihan`) Sesuai Form Master Gambar 1**:
       - Backend `customers.service.ts`: Memperbarui `getCustomerById` untuk mengambil data `tbCustomerPenagihan` (key: `fdCustCode`) serta mengambil kode dan nama staf Finance (`fdFinCode`) dan Kolektor (`fdKodePenagih`) dari master `tbEmployees`.
       - Mobile `master.tsx`: Merender kartu Detail Penagihan identik dengan Form Win32 desktop:
         - Nama (`cust.penagihanDetail.nama || cust.fdBillTo || cust.fdCustName`)
         - Nama PIC (`cust.penagihanDetail.pic || cust.fdContact`)
         - Alamat Lengkap Penagihan (`cust.penagihanDetail.alamat || cust.fdBillAddr1`)
         - Kota Penagihan (`cust.penagihanDetail.kota || cust.fdBillCityName`)
         - HP (`cust.penagihanDetail.hp || cust.fdHpPenagihan`) dengan tombol panggil langsung
         - Email (`cust.penagihanDetail.email || cust.fdEmailPenagihan`)
         - Finance: Kode staf & Nama lengkap staf (misal: `F004 FUTNI`)
         - Notif: Radio pills (`HP`, `Email`, `Kolektor`) dengan highlight metode aktif
         - Kolektor: Kode staf & Nama lengkap staf (misal: `H003 HENDRIK LIE`)
         - Keterangan: Catatan penagihan (`cust.penagihanDetail.keterangan || cust.fdKeteranganPenagihan`)
         - NPWP, TOP, dan Batas Kredit tetap dipertahankan dan hanya tampil jika datanya tersedia.
    2. **Tab 5: Ganti Menjadi "Daftar Alamat" Sesuai Gambar 2**:
       - Mengganti label tab menjadi *"Daftar Alamat (N)"*.
       - Menampilkan kartu alamat dari `vwCustomerContacts`: Badge Jenis (`PENGHUBUNG`, `PENGIRIMAN`, `PENAGIHAN`), Badge Status Keaktifan `Aktif`, Nama PIC, Alamat Lengkap, Kota, dan No. Telepon / HP yang dapat ditelepon langsung.
    3. **Penambahan `fdBranchCode` Pada Data Daftar Resi**:
       - Memastikan `fdBranchCode` dari `tbEntryList` / `vwShipment` dikembalikan oleh service shipment.
       - Menampilkan badge kode cabang (misal `SG`, `GZ`, `HK`, `YW`) di samping badge moda (Udara/Laut) pada kartu resi dan modal detail shipment.
    4. **Exit Activity pada Dashboard Overview (`overview.tsx`)**:
       - Menghapus daftar "Shipment Terkini" sesuai permintaan.
       - Menampilkan seksi **Exit Activity** dari `http://36.93.22.142/mshipping/logistics/shipment-batches`:
         - 4 Kartu KPI: Kemarin, Hari Ini, Besok (Prediksi), dan Total Exit Terbaru (lengkap dengan breakdown Udara & Laut).
         - Daftar batch kontainer/penerbangan yang telah keluar: Nomor Batch Marking, Nomor Kontainer / AWB, Cabang Asal, Penerima (Consignee), Tanggal Exit, Koli & Berat.
    5. **Audit Validasi Billing (`finance.tsx`) Sinkron Penuh dengan ERP Web**:
       - Mengubah query validasi mobile agar mengambil dari `/api/billing?hasAmount=true&draftOnly=true&noPagination=true&minYear=2023` identik dengan `http://36.93.22.142/mshipping/finance/billing/validation/list`.
       - Menampilkan antrean validasi dengan badge Aging Days (Baru, Perhatian, Kritis), moda, customer, marking, staf pembuat, dan nominal tagihan.
    6. **Cek Tarif (Price List Lookup) Menggantikan Kalkulator Statis**:
       - Mengganti tab kalkulator dengan fitur **Cek Tarif** 2-in-1:
         - **Tarif Umum Master (`/price-list/lookup`)**: Filter moda, cabang asal (`ALL`, `GZ`, `HK`, `SG`, `YW`, `SH`), daftar tarif per kg/m³ beserta waktu transit, dan fitur Cek Cepat by Resi/List Code (`/price-list/lookup-by-entry`).
         - **Tarif Khusus Customer (`/customer-price-list/lookup`)**: Pencarian customer dengan autocomplete suggestions langsung, menampilkan tarif khusus yang disepakati per kategori dan tanggal berlaku.
    7. **Naik Versi & Force Update Otomatis (Perubahan > 5 Item)**:
       - Sesuai aturan pengguna (*"berikutnya untuk naik versi dan force update apabila terjadi perubahan lebih dari 5 item"*), versi dinaikkan ke **v1.0.9 (Build 10)** dengan `forceUpdate: true`.
       - Binary manifest APK `AndroidManifest.xml` di-patch (`versionCode` = 10, `versionName` = '1.0.9').
       - Metro bundle diekspor ulang (`entry-9da209c49afbaaf9232c13342a5b46d7.hbc`, 5.4MB).
       - APK ditandatangani ulang dengan `release.keystore` via `uber-apk-signer.jar` (dual signing scheme v2+v3, 4096-byte zipalign verified).
       - Disinkronkan ke seluruh jalur distribusi server (`c:\shipping\mshipping.apk`, `frontend/dist/`, `frontend/public/`, `backend/public/uploads/`). PM2 `ShippingApi` direstart.
  - **Permintaan Pengguna**:
    - *"data pada daftar invoice -> tambah marking, marking no, dan total. pada data customer buat data yang ditampilkan seperti http://36.93.22.142/mshipping/master/customers dan juga pada detailnya samakan dengan yang di frontend"*
  - **Tindakan & Solusi**:
    1. **Daftar Invoice (Mobile `finance.tsx`)**:
       - Menambahkan baris informasi **Marking (`fdMarkingCode`)** dan **No. Marking (`fdMarkingNo`)** dalam kotak kontainer bergaris tepi elegan pada setiap kartu invoice.
       - Menampilkan nilai **Total Tagihan** secara tegas dan mencolok (`formatCurrency(amount)`) berdampingan dengan label tanggal invoice.
       - Memperbarui modal detail invoice (`selectedInvoice`) dan template cetak PDF (`handlePrintShare`) agar menyertakan Marking, No. Marking, dan kalkulasi Total yang akurat (`totalJumlah ?? fdTotalAmount ?? fdJumlah1 ?? 0`).
       - Backend `billing.service.ts`: Memetakan alias `fdTotalAmount: totalJumlah` pada `mappedData` untuk menjamin konsistensi data finansial.
    2. **Tampilan Data Customer (Mobile `master.tsx`) Seperti Frontend Web**:
       - Mengubah kartu pelanggan pada daftar utama agar identik dengan `CustomerMobileCard.tsx` di frontend web:
         - Baris atas: Badge Kode Customer monospace (`fdCustCode`), Badge Tier (`DIAMOND`, `PLATINUM`, `GOLD`, `SILVER`, `BRONZE`), Badge `BROKER`, Badge `DISCONTINUED`, Badge Masa Bergabung (`formatCustomerTenure`, misal: `Baru`, `6 bln`, `3 thn`), dan Badge Status Hubungan Pelanggan (`NORMAL`, `OK`, `COD`, `WARNING`, `BLOCKED`, `URGENT` dari `fdBlocked`).
         - Baris nama: Nama resmi pelanggan (`displayCustName`) dan badge hijau Omset Tahunan berjalan (`formatCompactRupiah(annualRevenue)`).
         - Baris lokasi: Ikon gedung `Building2`, Kota Operasional/Pengiriman, dan alamat kantor/pengiriman.
         - Kotak rincian: Contact Person (CP), Sales Representative, dan nomor telepon/HP.
         - Aksi cepat: Tombol langsung Telepon, WhatsApp, dan tautan Detail.
    3. **Modal Detail Customer 5-Tab Sama Persis dengan Frontend Web**:
       - Mengubah bottom sheet modal dialog menjadi tinggi statis `height: 86%` dengan navigasi 5 Tab tersegmen:
         1. **Ringkasan (`info`)**: Kartu CP, Kartu Sales In-Charge, Telepon Kantor (dengan tombol Panggil), Handphone / WA (dengan tombol Panggil & WA instan), Email, Kota Operasional, Alamat Kantor / Utama, dan Keterangan.
         2. **Finansial (`finansial`)**: Kartu Tier Aktif, Omset Tahunan Berjalan, Total Invoice, Progress Bar ke Tier Berikutnya (persentase & nominal sisa target belanja), dan tabel Riwayat Omzet Billing Multi-Tahun (`financialStats`).
         3. **Pengiriman (`pengiriman`)**: Nama Penerima, No. HP Pengiriman (dengan tombol Telepon Penerima & WA Penerima), Kota Pengiriman, Kotak Alamat Lengkap Pengiriman, dan Instruksi Khusus Pengiriman berlatar amber.
         4. **Penagihan (`penagihan`)**: Nama Penagihan (Bill To), NPWP, Kategori Pelanggan, Syarat Pembayaran (TOP), Batas Kredit (*Credit Limit*), dan Catatan Penagihan.
         5. **Cabang (`alamat`)**: Daftar kartu alamat gudang/cabang sekunder (`addresses` / `vwCustomerContacts`).
    4. **Build, Verifikasi & Distribusi**:
       - Backend typecheck: **0 error**, PM2 `ShippingApi` direstart online (PID 8816).
       - Mobile typecheck: **0 error**.
       - Hermes Android bundle diekspor ulang (`entry-481bf22b15a6632d5cd1d47fb0b49120.hbc`, 5.4 MB, 3.308 modul).
       - Berkas `mshipping.apk` di-patch dan di-sign resmi via `uber-apk-signer.jar` dengan `release.keystore` (dual scheme v2+v3, 4096-byte zipalign verified).
       - Berkas `mshipping.apk` (`126.939.005 bytes`) telah disinkronkan ke seluruh jalur distribusi server (`c:\shipping\mshipping.apk`, `backend/public/uploads/`, `frontend/dist/`, `frontend/public/`).
       - Dokumentasi [mobile-app.md](file:///c:/shipping/mobile-app.md) dan [working.md](file:///c:/shipping/.agents/working.md) telah diselaraskan.

- [x] **Dropdown Suggestions Pada Setiap Pencarian & Akselerasi Ekstrem Performa Query (12x - 18x Lebih Cepat)** ([shipments-status.resolver.ts](file:///c:/shipping/backend/src/modules/shipments/shipments-status.resolver.ts), [shipments.service.ts](file:///c:/shipping/backend/src/modules/shipments/shipments.service.ts), [marking.service.ts](file:///c:/shipping/backend/src/modules/marking/marking.service.ts), [marking.routes.ts](file:///c:/shipping/backend/src/modules/marking/marking.routes.ts), [deliveryOrders.service.ts](file:///c:/shipping/backend/src/modules/delivery-orders/deliveryOrders.service.ts), [deliveryOrders.routes.ts](file:///c:/shipping/backend/src/modules/delivery-orders/deliveryOrders.routes.ts), [billing.service.ts](file:///c:/shipping/backend/src/modules/billing/billing.service.ts), [billing.routes.ts](file:///c:/shipping/backend/src/modules/billing/billing.routes.ts), [customers.service.ts](file:///c:/shipping/backend/src/modules/customers/customers.service.ts), [customers.routes.ts](file:///c:/shipping/backend/src/modules/customers/customers.routes.ts), [SearchSuggestionsDropdown.tsx (mobile)](file:///c:/shipping/mobile/src/components/ui/SearchSuggestionsDropdown.tsx), [logistics.tsx](file:///c:/shipping/mobile/app/%28tabs%29/logistics.tsx), [finance.tsx](file:///c:/shipping/mobile/app/%28tabs%29/finance.tsx), [master.tsx](file:///c:/shipping/mobile/app/%28tabs%29/master.tsx), [SearchBar.tsx (web)](file:///c:/shipping/frontend/src/components/ui/SearchBar.tsx), [SearchSuggestionsDropdown.tsx (web)](file:///c:/shipping/frontend/src/components/ui/SearchSuggestionsDropdown.tsx), [ShipmentToolbar.tsx](file:///c:/shipping/frontend/src/features/shipments/components/ShipmentToolbar.tsx), [CustomerToolbar.tsx](file:///c:/shipping/frontend/src/features/customers/components/CustomerToolbar.tsx), [mobile-app.md](file:///c:/shipping/mobile-app.md), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Permintaan Pengguna**:
    - *"buat drop down sugestion pada pencarian di tiap pencarian. percepat load datanya"*
  - **Akar Masalah Kecepatan Sebelumnya**:
    - Query shipment view `vwShipment` sebelumnya men-JOIN `tbEntryList` dan `tbCustomers` tanpa `WITH (NOLOCK)` dan tanpa menyertakan `e.fdCustCode`. Pencarian teks dengan klausa `OR` pada `fdCustName`, `fdTerima`, `fdMarkingCode`, dan `fdMarkingNo` memaksa SQL Server melakukan Clustered Index Scan pada 1+ juta baris data sehingga pencarian memakan waktu 4.3 – 9.3 detik.
    - Belum ada endpoint suggestion terdedikasi untuk Batch Marking, Delivery Orders, Billing, dan Customer.
  - **Tindakan & Solusi**:
    1. **Optimasi View & Prisma Schema Database**:
       - `ALTER VIEW dbo.vwShipment`: Menambahkan kolom `e.fdCustCode` dan `WITH (NOLOCK)` pada `tbEntryList` dan `tbCustomers`.
       - `backend/prisma/schema.prisma`: Mendaftarkan `fdCustCode String? @db.VarChar(50)` pada model `VwShipment` dan meregenerasi Prisma Client.
       - Query kondisi pencarian `buildShipmentConditions` diubah menjadi `async`: melakukan pre-lookup kode customer dari `tbCustomers` terlebih dahulu, lalu memanfaatkan nonclustered index `IX_tbEntryList_fdCustCode` dengan klausa `fdCustCode IN (...)`. Waktu pencarian turun drastis dari 5+ detik ke **~400ms**.
    2. **5 Endpoint Suggestion Baru & Cepat**:
       - `GET /api/shipments/suggestions?q=...`: 3 query paralel terindeks pada customer, resi, dan marking. Waktu respon: ~230ms.
       - `GET /api/marking/suggestions?q=...`: Saran kode batch marking dan consignee: **~50ms**.
       - `GET /api/delivery-orders/suggestions?q=...`: Saran nomor surat jalan, customer, dan supir: **~8ms**.
       - `GET /api/billing/suggestions?q=...`: Saran nomor invoice dan customer: **~35ms**.
       - `GET /api/customers/suggestions?q=...`: Saran nama customer, kode, dan PIC: **~175ms**.
    3. **Dropdown Suggestions Terpadu Pada Aplikasi Mobile**:
       - Dibuat komponen `mobile/src/components/ui/SearchSuggestionsDropdown.tsx` dengan badge kategori semantik, haptic feedback, penutupan otomatis saat klik luar, dan kompatibilitas tema gelap/terang.
       - Diintegrasikan pada seluruh tab:
         - **Logistik** (`logistics.tsx`): Sub-tab Resi (Shipments), Sub-tab Batch Marking, Sub-tab Surat Jalan (Delivery Orders).
         - **Keuangan** (`finance.tsx`): Sub-tab Invoice (Billing) dan Sub-tab Validasi.
         - **Master** (`master.tsx`): Sub-tab Direktori Pelanggan.
    4. **Dropdown Suggestions Terpadu Pada Web Frontend**:
       - Dibuat komponen `frontend/src/components/ui/SearchSuggestionsDropdown.tsx`.
       - Ditingkatkan `frontend/src/components/ui/SearchBar.tsx` agar mendukung saran mengambang dengan loading spinner dan keyboard/touch interaction.
       - Diintegrasikan pada `ShipmentToolbar.tsx` dan `CustomerToolbar.tsx`.
    5. **Build, Verifikasi & Distribusi APK**:
       - Frontend Web build: **Lulus 100% (2.56s, 0 error)**.
       - Mobile TypeScript typecheck: **0 error**.
       - Hermes bundle Android diekspor: `entry-f835d1984449019530013fb2e652d0a5.hbc` (5.4MB, 3.308 modul).
       - APK diinjeksikan dan di-sign resmi dengan `release.keystore` via `uber-apk-signer.jar` (dual scheme v2+v3, 0 error, verified).
       - Berkas `mshipping.apk` disinkronkan ke 4 jalur distribusi server (`c:\shipping\mshipping.apk`, `backend/public/uploads/`, `frontend/dist/`, `frontend/public/`).
       - Versi aplikasi tetap dipertahankan pada **v1.0.8 (Build 9)** sesuai aturan kenaikan versi hanya jika > 5 item perubahan.

- [x] **Penyelarasan Item Tagihan (fdListCode), Modal Detail Resi Tinggi Statis, & Tag Timeline pada List Resi** ([logistics.tsx](file:///c:/shipping/mobile/app/%28tabs%29/logistics.tsx), [ShipmentDetailModal.tsx](file:///c:/shipping/frontend/src/features/shipments/components/ShipmentDetailModal.tsx), [ShipmentInvoiceTab.tsx](file:///c:/shipping/frontend/src/features/shipments/components/detail/ShipmentInvoiceTab.tsx), [shipments.service.ts](file:///c:/shipping/backend/src/modules/shipments/shipments.service.ts), [shipments.types.ts](file:///c:/shipping/backend/src/modules/shipments/shipments.types.ts), [shipments.types.ts (frontend)](file:///c:/shipping/frontend/src/features/shipments/types/shipments.types.ts), [id.json](file:///c:/shipping/frontend/src/lib/i18n/id.json), [en.json](file:///c:/shipping/frontend/src/lib/i18n/en.json), [mobile-app.md](file:///c:/shipping/mobile-app.md), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Permintaan Pengguna**:
    - *"Rincian Item Tagihan: Satuan -> fdListCode. Buat Detail Daftar Resi tingginya statis dan apabila over flow kasih scroll. Pada list Daftar Resi -> marking code lalu dibawahnya marking no. Kasih tag dari timeline"*
  - **Tindakan & Solusi**:
    1. **Rincian Item Tagihan: Satuan diganti menjadi `fdListCode`**:
       - Backend (`shipments.types.ts` & `shipments.service.ts`): Memperkaya `details` pada `ShipmentInvoiceDetailItem` dengan `fdListCode: d.fdListCode?.trim() || billingRecord.fdListCode?.trim() || ''`.
       - Frontend Web (`ShipmentInvoiceTab.tsx`): Mengganti kolom tabel header dari "Satuan" menjadi "No. List", dan me-render `item.fdListCode` dengan font monospace rapi.
       - Mobile App (`logistics.tsx`): Menampilkan `No. List: {item.fdListCode || activeShipment?.fdListCode}` pada rincian item tagihan.
       - Lokalisasi bilingual: Menambahkan `"shipments.invoice.listCode"` pada `id.json` ("No. List") dan `en.json` ("List Code").
    2. **Modal Detail Daftar Resi Tinggi Statis & Scroll Saat Overflow**:
       - Mobile App (`logistics.tsx`): Mengubah kontainer sheet dari `maxHeight: '88%'` menjadi tinggi statis `height: '86%'`, dengan internal `ScrollView` berproperti `flex: 1` dan `showsVerticalScrollIndicator={true}` sehingga tinggi modal stabil di semua tab dan seluruh konten dapat digulir jika meluap (*overflow*).
       - Frontend Web (`ShipmentDetailModal.tsx`): Mengubah dialog modal menjadi tinggi statis `h-[88vh] sm:h-[82vh]` dengan `flex-1 overflow-y-auto` di area tubuh modal.
    3. **Kartu List Daftar Resi: Marking Code Lalu Dibawahnya Marking No**:
       - Mobile App (`logistics.tsx`): Menampilkan Nomor Resi (`fdTerima`) berikon `Receipt` tebal, diikuti baris Marking Code (`fdMarkingCode`) di bagian atas, dan tepat di bawahnya Marking No (`fdMarkingNo`).
    4. **Tag dari Timeline pada List Daftar Resi**:
       - Mengintegrasikan status logistik timeline real-time `getShipmentStatusBadge(item.shipmentStatus)` (`Waiting`, `Loading`, `ETD`, `ETA`, `Warehouse`, `Delivery`, `Delivered`, dll) pada setiap kartu item di daftar resi berdampingan dengan badge moda (`Udara`/`Laut`).
    5. **Build & Distribusi**:
       - Backend typecheck: **0 error**, PM2 `ShippingApi` direstart online.
       - Frontend web build: **Lulus 100% (2.51s, 0 error)**.
       - Mobile typecheck: **0 error**, Hermes bytecode diekspor ulang (`entry-ae080078a26385b59bfec539bd72022e.hbc`).
       - Berkas APK ditandatangani ulang resmi dengan `release.keystore` via `uber-apk-signer.jar` dan disinkronkan ke seluruh jalur distribusi server (`126.926.717 bytes`).


- [x] **Pencarian 4 Kolom Resi, Dropdown Saran Pencarian, & Infinite Scroll Top 10 + Scroll +5** ([shipments-status.resolver.ts](file:///c:/shipping/backend/src/modules/shipments/shipments-status.resolver.ts), [shipments.service.ts](file:///c:/shipping/backend/src/modules/shipments/shipments.service.ts), [shipments.routes.ts](file:///c:/shipping/backend/src/modules/shipments/shipments.routes.ts), [logistics.tsx](file:///c:/shipping/mobile/app/%28tabs%29/logistics.tsx), [SearchBar.tsx](file:///c:/shipping/mobile/src/components/ui/SearchBar.tsx), [mobile-app.md](file:///c:/shipping/mobile-app.md)):
  - **Permintaan Pengguna**:
    - *"pada tab daftar resi -> buat pencarian hanya resi (fdTerima), Customer name, marking code dan marking no-> data yang di tampilkan adalah top 10 dulu lalu setelah scroll + 5. Tambahkan dropdown sugestion. Pada detail daftar resi apakah sudah menampilkan data billing?"*
  - **Analisis Kebutuhan**:
    1. **Pencarian Dibatasi 4 Kolom**: Pencarian umum sebelumnya mencakup `fdListCode`, `fdLocalTrackingNo`, dan `fdComodity` sehingga sering memunculkan hasil yang kurang relevan. Kini dibatasi hanya pada: `fdTerima` (Resi), `fdCustName` (Customer), `fdMarkingCode` (Kode Marking), dan `fdMarkingNo` (Nomor Marking).
    2. **Pagination Top 10 Dulu, Lalu Scroll + 5**: Permintaan awal memuat 10 item pertama (`skip: 0, limit: 10`), lalu setiap kali pengguna menggulir (`onEndReached`), sistem meminta +5 item berikutnya (`skip: totalLoaded, limit: 5`).
    3. **Dropdown Saran Pencarian (Auto-Suggest)**: Input pencarian menampilkan dropdown saran cepat saat query $\ge$ 2 karakter dengan rekomendasi terstruktur berikon kategori (`Resi`, `Customer`, `Marking`), yang dapat diklik untuk mengisi pencarian langsung.
    4. **Status Data Billing pada Detail Daftar Resi**: Memastikan apakah modal detail resi sudah menampilkan data billing.
  - **Implementasi & Solusi**:
    1. **Backend Integration (`shipments-status.resolver.ts`, `shipments.service.ts`, `shipments.routes.ts`)**:
       - `buildSingleWordCondition`: Mengubah klausa `else` default agar hanya memfilter `fdTerima LIKE ... OR fdCustName LIKE ... OR fdMarkingCode LIKE ... OR fdMarkingNo LIKE ...`.
       - `getShipments`: Menambahkan dukungan parameter `skip` & `take` kustom untuk infinite scroll fleksibel dengan metadata `hasMore`.
       - `getShipmentSuggestions`: Endpoint baru `GET /api/shipments/suggestions?q=...` yang mencari saran cepat dari `vwShipment` dan mengelompokkannya menjadi tipe `resi`, `customer`, dan `marking` (maksimal 8-10 saran).
       - Backend PM2 `ShippingApi` direstart (online).
    2. **Mobile App Synchronization (`logistics.tsx` & `SearchBar.tsx`)**:
       - Menambahkan prop `onFocus` pada `SearchBar.tsx`.
       - Mengubah `useInfiniteQuery` pada tab `shipments` dengan `initialPageParam = { skip: 0, limit: 10 }` dan `getNextPageParam = { skip: totalLoaded, limit: 5 }`.
       - Menambahkan komponen Dropdown Suggestions terapung tepat di bawah SearchBar dengan navigasi cepat, ikon semantik (`Receipt`, `User`, `Tag`), dan tombol dismiss.
       - Memastikan detail shipment: modal detail sudah memiliki **Tab 4: Invoice** lengkap dengan 3 kartu metrik KPI (Total Tagihan, Terbayar, Sisa), Header Faktur, Status LUNAS/SEBAGIAN/TERBIT, dan rincian item tagihan yang otomatis muncul ketika status invoice $\ge$ ISSUED.
    3. **Build & Verifikasi**:
       - Backend typecheck: **0 error**.
       - Mobile typecheck: **0 error**.
       - Kompilasi Hermes bundle sukses (`entry-9f6679461ef82062b4bfaa7ebad935a5.hbc`, 5.4 MB, 3.307 modul).
       - APK `mshipping.apk` di-sign ulang resmi dengan `release.keystore` dan disinkronkan ke 4 direktori distribusi server (126.926.717 bytes).


- [x] **Penambahan Tombol Salin Data Kargo di Tabel Target Penagihan & Penyesuaian Aturan Validasi Kuota Berat Laut** ([TargetPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/TargetPage.tsx), [useBillingValidation.ts](file:///c:/shipping/frontend/src/features/billing/hooks/useBillingValidation.ts), [BillingValidationCard.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationCard.tsx), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Permintaan Pengguna**:
    - *"buat tombol copy pada tabel list http://36.93.22.142/mshipping/finance/billing/target -> nama customer, cabang, marking, comodity, jmlpack, berat,tipe. http://36.93.22.142/mshipping/finance/billing/validation/SGS-001849-09-2026 -> Terdapat Catatan Validasi Pada Invoice Ini ->apabila Sisa Kuota Berat < 0 maka warning ini baru muncul."*
  - **Analisis Kebutuhan & Logika Bisnis**:
    1. **Tombol Salin Data Kargo (`TargetPage.tsx`)**:
       - Staf penagihan dan operasional membutuhkan kemudahan menyalin ringkasan data kargo dari antrean target penagihan untuk dibagikan ke WhatsApp/chat.
       - Data yang wajib disalin: Nama Customer, Cabang, Marking (termasuk nomor marking jika ada), Komoditi, Jumlah Pack, Berat, dan Tipe Kategori.
       - Dibuat tombol copy interaktif baik pada kolom tabel Desktop (`Salin`) maupun pada kartu Mobile dengan indikator visual checklist `Check` hijau (selama 2 detik) dan notifikasi `toastStore`.
    2. **Logika Validasi Kuota Berat Laut & Warning Catatan Validasi (`useBillingValidation.ts` & `BillingValidationCard.tsx`)**:
       - Pada invoice `SGS-001849-09-2026` (moda laut), seluruh komponen M3 (0.8372 m³), Qty (2 koli), dan tarif (7.500.000) telah cocok (*MATCH*).
       - Rasio batas kuota berat adalah 800 kg/m³, sehingga batas maksimal berat muatan adalah $0.8372 \times 800 = 669.76\text{ kg}$.
       - Berat aktual muatan adalah 270 kg (Surat Jalan/Entry List) dan 260 kg (Komplain). Keduanya jauh di bawah 669.76 kg, sehingga **Sisa Kuota Berat = +399.76 kg (Aman, $\ge 0$)**.
       - Namun sebelumnya, perbedaan catatan fisik antar dokumen (`hasWeightMismatch`: 260 kg vs 270 kg) langsung menggagalkan `isPhysicalValid`, sehingga memicu alert warning *"Terdapat Catatan Validasi Pada Invoice Ini"* di modal penerbitan dan badge *"Selisih Berat"* di kartu validasi.
       - Sesuai aturan bisnis logistik kontainer laut: perbedaan catatan fisik antar dokumen tidak mengubah tagihan selama muatan tidak overweight. Peringatan kelebihan berat **HANYA boleh muncul apabila Sisa Kuota Berat < 0** (`isOverweight = true` / kuota terlampaui dan belum ditagihkan) atau jika invoice menagihkan item KG yang tidak diperlukan.
  - **Perbaikan & Implementasi**:
    1. **Target Penagihan (`TargetPage.tsx`)**:
       - Menambahkan handler `handleCopyTargetItem` yang memformat teks secara terstruktur:
         `Customer : ...`, `Cabang : ...`, `Marking : ...`, `Komoditi : ...`, `Jml Pack : ...`, `Berat : ...`, `Tipe : ...`.
       - Menambahkan kolom header `Salin` dan tombol icon `Copy` pada tabel desktop serta tombol copy kompak pada kartu mobile.
       - Menyertakan visual feedback `Check` warna hijau dan `addToast` sukses.
    2. **Mesin Validasi Tagihan (`useBillingValidation.ts` & `BillingValidationCard.tsx`)**:
       - Memperbarui `isWeightPhysicallyValid`: Untuk moda laut (`!isAir`), `hasWeightMismatch` tidak menggagalkan validasi fisik selama `!overweight.isOverweight`.
       - Memperbarui `hasOverweightIssue` dan badge Tab Overweight pada `BillingValidationCard.tsx` agar berstatus `✓ Aman` ketika sisa kuota berat $\ge 0$.
       - Hasilnya, pada invoice `SGS-001849-09-2026`, status validasi menjadi **Valid Penuh (Hijau)** dengan judul *"Tagihan Sesuai dengan Data Fisik & Acuan Tarif"*, dan peringatan *"Terdapat Catatan Validasi Pada Invoice Ini"* tidak lagi muncul.
    3. **Build & Verifikasi**:
       - Menjalankan `bun run build`: Berhasil 100% (0 error, exit code 0) dan dist otomatis aktif di IIS server.
    4. **Dokumentasi**:
       - Memperbarui [frontend-app.md](file:///c:/shipping/frontend-app.md) (Seksi 3.3.B & 3.3.D) dan `.agents/working.md`.

- [x] **Rilis Resmi APK Mobile v1.0.8 (Build 9) dengan Status Force Update & Aturan Kenaikan Versi (> 5 Item)** ([app.json](file:///c:/shipping/mobile/app.json), [version.ts](file:///c:/shipping/mobile/src/config/version.ts), [package.json](file:///c:/shipping/mobile/package.json), [app-version.json](file:///c:/shipping/backend/src/config/app-version.json), [AGENTS.md](file:///c:/shipping/.agents/AGENTS.md), [mobile-app.md](file:///c:/shipping/mobile-app.md)):
  - **Permintaan Pengguna**:
    - *"ya kompile, berikutnya untuk naik versi dan force update apabila terjadi perubahan lebih dari 5 item"*
  - **Tindakan & Solusi**:
    1. **Pembaruan Konfigurasi Versi v1.0.8 (Build 9)**:
       - `mobile/src/config/version.ts`: `APP_VERSION = '1.0.8'`, `APP_VERSION_CODE = 9`.
       - `mobile/app.json`: `"version": "1.0.8"`, `"versionCode": 9`.
       - `mobile/package.json`: `"version": "1.0.8"`.
       - `backend/src/config/app-version.json`: `"version": "1.0.8"`, `"versionCode": 9`, `"minVersion": "1.0.8"`, `"forceUpdate": true`.
    2. **Kompilasi & Export Hermes Bytecode**:
       - Mengekspor bundel Android Hermes (`bunx expo export --platform android`, 3.307 modul tertransformasi, berkas `.hbc` 5.4 MB).
    3. **Patching Binary AndroidManifest.xml & Injeksi Bundle**:
       - Mengubah `versionCode` (offset 9008) menjadi `9` dan `versionName` (offset 1664:1674) menjadi `'1.0.8'` pada binary `AndroidManifest.xml` di dalam APK.
       - Mengganti `assets/index.android.bundle` dengan bytecode Hermes terbaru.
    4. **Signing & Zipalign Resmi**:
       - Menandatangani berkas APK menggunakan `release.keystore` resmi via `uber-apk-signer.jar` (dual signature scheme V2+V3, zipalign 4096-byte verified).
       - File APK fisik (`126.922.621 bytes`, 121.0 MB) telah disinkronkan ke seluruh direktori distribusi server:
         - `c:\shipping\mshipping.apk`
         - `c:\shipping\frontend\dist\mshipping.apk`
         - `c:\shipping\frontend\public\mshipping.apk`
         - `c:\shipping\backend\public\uploads\mshipping.apk`
    5. **Restart Backend & Pengujian**:
       - PM2 `ShippingApi` direstart dan online (PID 23212).
       - Endpoint `GET /api/app-version/latest` dan unduhan langsung IIS `http://36.93.22.142/mshipping/mshipping.apk` (HTTP 200 OK) terverifikasi sinkron sempurna.
    6. **Pencatatan Aturan Operasional Baru Pada `AGENTS.md`**:
       - Kenaikan versi (`version` / `versionCode`) dan rilis Force Update (`forceUpdate: true`) berikutnya **HANYA dilakukan apabila telah terjadi akumulasi perubahan lebih dari 5 item / fitur / perbaikan bug**.


- [x] **Perbaikan Overflow & Scrolling Kartu Validasi Pada Halaman Detail Validasi Faktur** ([BillingValidationCard.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationCard.tsx), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Permintaan Pengguna**:
    - *"perbaiki overflow pada card validation di page bill validation detail"* (disertai tangkapan layar `media_1789438645890.png` pada halaman Detail Validasi Faktur `GZS-010276-09-2026`).
  - **Akar Masalah**:
    - Pada `ValidationDetailPage.tsx`, container kolom kanan di desktop memiliki properti layout `lg:h-full lg:overflow-hidden` dan grid halaman memiliki `lg:min-h-0 lg:overflow-hidden`.
    - Komponen anak `BillingValidationCard` sebelumnya hanya menggunakan kelas kontainer statis `rounded-[var(--radius-lg)] shadow-sm overflow-hidden animate-fadeIn` tanpa properti `flex flex-col h-full min-h-0`.
    - Kontainer tubuh perbandingan tab (`Main Comparison Body`) sebelumnya hanya berupa `div className="p-3 sm:p-5 space-y-3 sm:space-y-4"` tanpa `flex-1 min-h-0 overflow-y-auto`.
    - Akibatnya, ketika konten di dalam tab panjang (misalnya rincian evaluasi harga item vs master tarif, tautan Effective Price List, profil catatan tarif customer, dll), kartu membentang melebihi tinggi layar dan terpotong (*clipped*) secara kaku oleh batasan `lg:overflow-hidden` parent, sehingga pengguna tidak dapat menggulir (*scroll*) untuk melihat bagian bawah kartu dan tertutup tombol FAB drawer.
  - **Perbaikan & Implementasi**:
    1. **Struktur Flex & Internal Scroll (`BillingValidationCard.tsx`)**:
       - Mengubah kontainer root kartu menjadi `flex flex-col h-full min-h-0`.
       - Menambahkan kelas `shrink-0` pada kontainer Header Validasi dan Bar Tab Navigasi agar tetap berada di posisi atas saat konten digulir.
       - Mengubah kontainer tubuh tab perbandingan menjadi `flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4 pb-8 sm:pb-10` sehingga seluruh konten dapat digulir vertikal secara independen dan memiliki ruang margin/padding bawah yang aman.
    2. **Build & Verifikasi**:
       - Menjalankan `bun run build` di `frontend/`: Berhasil 100% (0 error, exit code 0) dan dist otomatis diperbarui di server IIS.
    3. **Dokumentasi**:
       - Memperbarui [frontend-app.md](file:///c:/shipping/frontend-app.md) (Seksi 3.3.D) dan `.agents/working.md`.

- [x] **Penambahan Tab Invoice Dinamis Pada Detail Shipment Apabila Status > ISSUED** ([ShipmentDetailModal.tsx](file:///c:/shipping/frontend/src/features/shipments/components/ShipmentDetailModal.tsx), [ShipmentInvoiceTab.tsx](file:///c:/shipping/frontend/src/features/shipments/components/detail/ShipmentInvoiceTab.tsx), [shipments.service.ts](file:///c:/shipping/backend/src/modules/shipments/shipments.service.ts), [shipments.types.ts](file:///c:/shipping/backend/src/modules/shipments/shipments.types.ts), [shipments.types.ts (frontend)](file:///c:/shipping/frontend/src/features/shipments/types/shipments.types.ts), [id.json](file:///c:/shipping/frontend/src/lib/i18n/id.json), [en.json](file:///c:/shipping/frontend/src/lib/i18n/en.json), [logistics.tsx (mobile)](file:///c:/shipping/mobile/app/%28tabs%29/logistics.tsx), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Permintaan Pengguna**:
    - *"tampilkan invoice pada tab detail shipment juga apabila statusnya > issued"*
  - **Analisis Kebutuhan & Logika Bisnis**:
    - Pada modal detail shipment (baik di Frontend Web maupun Mobile App), sebelumnya hanya tersedia 3 tab: `Ringkasan`, `Dimensi`, dan `Timeline`.
    - Faktur tagihan (`tbBilling`) yang masih dalam tahap perancangan (*DRAFT*, `fdGive != 1`) belum final dan tidak boleh diekspos pada detail logistik lapangan.
    - Namun jika faktur telah diterbitkan (*ISSUED*, `fdGive = 1`) atau telah selesai/lunas (*COLLECTED/PAID*, `fdGive2 = 1`), tab ke-4 **`Invoice`** harus tampil secara dinamis.
  - **Perbaikan & Implementasi**:
    1. **Backend Integration (`shipments.service.ts` & `shipments.types.ts`)**:
       - Memperbarui `getShipmentById` untuk mencari faktur terkait via `tbBilling.fdListCode` atau `tbBillingDetail.fdListCode` secara paralel menggunakan `safeQuery` dan `Promise.all`.
       - Mengembalikan objek `invoice: ShipmentInvoice | null` yang memuat `fdInvNo`, `fdInvDate`, `fdGive`, `fdGiveDate`, `paymentStatus` (`LUNAS`, `PARTIAL`, `OVERDUE`, `ISSUED`, `UNPAID`, `DRAFT`), `totalAmount`, `totalPaid`, `balance`, rincian multi-currency `totals`, dan rincian item `details`.
       - Backend PM2 `ShippingApi` direstart (PID 20552, status online).
    2. **Frontend Web (`ShipmentDetailModal.tsx` & `ShipmentInvoiceTab.tsx`)**:
       - Membuat komponen baru `ShipmentInvoiceTab.tsx`:
         - Header kartu: No. Invoice dengan tombol salin instan, status tagihan (`BillingStatusTag`), tanggal invoice & tanggal terbit, nama tagihan (`fdBillTo`) & master customer, serta tanggal validasi audit.
         - 3 Kartu Metrik Finansial KPI: **Total Tagihan**, **Sudah Dibayar**, **Sisa Tagihan**.
         - Rincian Multi-Currency jika terdapat valas (USD, SGD, RP).
         - Tabel Rincian Item Tagihan: Nomor urut, Deskripsi Item/Komoditas, Qty, Satuan, Tarif Satuan, Subtotal, dan Footer Total.
         - Tombol Aksi Cepat: *"Buka Invoice"* (`ROUTES.BILLING_DETAIL`) dan *"Cetak Faktur"* (`ROUTES.BILLING_PRINT`).
       - Memperbarui `ShipmentDetailModal.tsx`: tab bar secara dinamis menambahkan `{ id: 'invoice', label: 'Invoice', icon: FileText }` jika `hasIssuedInvoice` bernilai `true`.
       - Menambahkan key i18n berpasangan pada `id.json` dan `en.json`.
       - Kompilasi `bun run build`: **Sukses 100% (0 error)**, langsung aktif di IIS web server `Default Web Site/mshipping/`.
    3. **Mobile App Synchronization (`mobile/app/(tabs)/logistics.tsx`)**:
       - Mengintegrasikan tab dinamis ke-4 `'invoice'` pada `SegmentedControl` modal detail resi ketika `hasIssuedInvoice` bernilai `true`.
       - Menyajikan layout kartu invoice, 3 metrik KPI (Total Tagihan, Terbayar, Sisa), dan daftar item tagihan dengan dukungan tema gelap/terang.
       - Typecheck mobile `bun run tsc --noEmit`: **Lulus 100% (0 error)**.
    4. **Dokumentasi**:
       - Dokumentasi [frontend-app.md](file:///c:/shipping/frontend-app.md) (Seksi 3.3.B) telah disinkronkan.


- [x] **Perbaikan Teks Header Tabel Item & Lokalisasi Bilingual Halaman Detail Faktur** ([DetailPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/DetailPage.tsx), [id.json](file:///c:/shipping/frontend/src/lib/i18n/id.json), [en.json](file:///c:/shipping/frontend/src/lib/i18n/en.json), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Permintaan Pengguna**:
    - *"perbaiki text nya"* (disertai tangkapan layar halaman Detail Invoice `GZS-08895A-08-2026` dengan kotak merah pada header tabel rincian item: `BILLING.DETAIL.ITEMDESCRIPTION`, `BILLING.DETAIL.QUANTITY`, `BILLING.DETAIL.UNITPRICE`, `BILLING.DETAIL.AMOUNT`).
  - **Akar Masalah**:
    - Komponen `DetailPage.tsx` memanggil `t('billing.detail.itemDescription')`, `t('billing.detail.quantity')`, `t('billing.detail.unitPrice')`, dan `t('billing.detail.amount')`.
    - Key-key tersebut belum terdaftar pada file kamus bahasa `id.json` maupun `en.json`, sehingga hook `useTranslation` me-return fallback string key mentah yang kemudian diubah menjadi huruf besar oleh kelas Tailwind CSS `uppercase`.
    - Selain itu, beberapa teks visual pada kartu 2, 3, dan 4 masih berupa string literal hardcode Indonesia (`"Diserahkan Oleh"`, `"Status Pembayaran"`, `"Belum ada catatan pembayaran kasir"`, dll) sehingga tidak berubah saat pengguna beralih ke bahasa Inggris (`GB EN`).
  - **Perbaikan & Implementasi**:
    1. **Penambahan Key Kamus i18n Lengkap (`id.json` & `en.json`)**:
       - Mendaftarkan key berpasangan:
         - `billing.detail.itemDescription`: `"Deskripsi Item"` (ID) / `"Item Description"` (EN).
         - `billing.detail.quantity`: `"Kuantitas"` (ID) / `"Quantity"` (EN).
         - `billing.detail.unitPrice`: `"Harga Satuan"` (ID) / `"Unit Price"` (EN).
         - `billing.detail.amount`: `"Jumlah"` (ID) / `"Amount"` (EN).
         - `billing.detail.givenBy`: `"Diserahkan Oleh"` (ID) / `"Issued By"` (EN).
         - `billing.detail.paymentStatus`: `"Status Pembayaran"` (ID) / `"Payment Status"` (EN).
         - `billing.detail.paid`, `billing.detail.partial`, `billing.detail.unpaid`.
         - `billing.detail.noPaymentNote`, `billing.detail.cashierNo`, `billing.detail.paymentDate`, `billing.detail.totalPaid`.
         - `billing.detail.receiptNo`, `billing.detail.noReceipt`, `billing.detail.checkReceipt`, `billing.detail.invoiceHistory`, `billing.detail.commodity`.
    2. **Pembaruan Komponen JSX (`DetailPage.tsx`)**:
       - Seluruh string visual pada kartu Customer, Status Waktu, Pembayaran Kasir, dan Marking kini menggunakan `t(...)`.
       - Header tabel rincian item kini otomatis merender label bahasa yang tepat sesuai bahasa aktif pengguna.
    3. **Verifikasi Build**:
       - Kompilasi `bun run build`: **Lulus 100% tanpa error (0 error, build selesai)**.
       - Dokumentasi [frontend-app.md](file:///c:/shipping/frontend-app.md) disinkronkan.

- [x] **Penguncian (Read-Only) Rincian Item Invoice Apabila Status Invoice > ISSUED / LUNAS** ([ValidationDetailPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/ValidationDetailPage.tsx), [EditBillingDetailsModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/EditBillingDetailsModal.tsx), [billing.service.ts](file:///c:/shipping/backend/src/modules/billing/billing.service.ts), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Permintaan Pengguna**:
    - *"Tampilan invoice apabila status invoice> issued"* $\to$ Dikonfirmasi: *"Kunci pengeditan (Read-Only) pada item invoice apabila status sudah ISSUED atau LUNAS agar data tidak dapat diubah sembarangan."*
  - **Akar Masalah**:
    - Sebelumnya, modal rincian item tagihan (`EditBillingDetailsModal`) pada `ValidationDetailPage.tsx` tetap menyediakan input form pengeditan serta tombol simpan perubahan (`Save`), bahkan saat invoice telah berstatus terbit (`fdGive = 1` / ISSUED) atau telah diselesaikan pembayarannya di kasir (`fdGive2 = 1` / LUNAS).
    - Endpoint backend `updateBillingItems` belum memiliki *guard clause* yang membatasi modifikasi faktur yang sudah melewati tahap penerbitan.
  - **Perbaikan & Implementasi**:
    1. **Backend Integration (`billing.service.ts`)**:
       - Menambahkan pengecekan proteksi integritas data di `updateBillingItems`: jika `Number(billing.fdGive) === 1` atau `Number(billing.fdGive2) === 1`, request update dari staf non-superadmin ditolak dengan pesan: *"Invoice ${cleanInvNo} telah berstatus ISSUED / LUNAS dan telah dikunci. Perubahan rincian item tidak diizinkan demi integritas data akuntansi."*
       - Restart PM2 `ShippingApi` (online, pid 16964).
    2. **Frontend UI Read-Only Mode (`EditBillingDetailsModal.tsx`)**:
       - Menambahkan prop `isLocked` dan `lockReason`.
       - Saat `isLocked = true`:
         - Header menampilkan judul *"Rincian Item Tagihan (Terkunci)"*, ikon gembok `<Lock />`, dan badge `READ-ONLY`.
         - Menampilkan banner peringatan status terkunci berwarna amber/netral.
         - Merender nilai kolom deskripsi, satuan, kuantitas, harga satuan, dan subtotal sebagai teks murni rapi tanpa elemen `<input>`.
         - Kolom aksi menampilkan ikon gembok halus, menyembunyikan tombol hapus baris item.
         - Menyembunyikan tombol "Tambah Baris Item" dan "Reset Perubahan".
         - Menyembunyikan tombol simpan dan checkbox `saveToPrev`; footer hanya menyajikan tombol "Tutup".
    3. **Frontend Page Synchronization (`ValidationDetailPage.tsx`)**:
       - Menghitung flag `isLocked = isIssued || isCollected || isPaid`.
       - Tombol aksi pada kartu "Rincian Item Tagihan" dinamis: menampilkan ikon `<Lock />` dan label *"Lihat Item"* saat terkunci, atau `<Edit3 />` dan label *"Edit Item"* saat draft.
       - Menghubungkan flag `isLocked` dan `lockReason` ke `EditBillingDetailsModal`.
    4. **Verifikasi & Build**:
       - Typecheck backend (`bun run --bun tsc --noEmit`): **0 error**.
       - Kompilasi frontend (`bun run build` via Vite + TypeScript): **sukses 100%** (1.173 modul tertransformasi dalam 2.64 detik).
       - Dokumentasi [frontend-app.md](file:///c:/shipping/frontend-app.md) diperbarui.

- [x] **Rilis Resmi APK Mobile v1.0.7 (Build 8) dengan Status Force Update** ([app.json](file:///c:/shipping/mobile/app.json), [version.ts](file:///c:/shipping/mobile/src/config/version.ts), [app-version.json](file:///c:/shipping/backend/src/config/app-version.json), [mobile-app.md](file:///c:/shipping/mobile-app.md)):
  - Menaikkan versi aplikasi mobile dari `v1.0.6 (Build 7)` menjadi `v1.0.7 (Build 8)`.
  - Mengonfigurasi `forceUpdate: true` dan `minVersion: "1.0.7"` pada `backend/src/config/app-version.json`.
  - Mengompilasi ulang Hermes bytecode bundle (`bunx expo export --platform android`, 3.307 modul, 5.4 MB).
  - Menandatangani ulang APK menggunakan `release.keystore` via `uber-apk-signer.jar` (dual scheme v2+v3, verified).
  - Mendistribusikan berkas `mshipping.apk` (126.918.525 bytes) ke seluruh path distribusi publik server.

- [x] **Perbaikan Overflow Teks Komoditas & Penambahan Tipe Komoditi serta Nama Sales pada Manifest Batch** ([logistics.tsx](file:///c:/shipping/mobile/app/%28tabs%29/logistics.tsx), [marking.service.ts](file:///c:/shipping/backend/src/modules/marking/marking.service.ts), [mobile-app.md](file:///c:/shipping/mobile-app.md)):
  - **Permintaan Pengguna**:
    - *"Pada list manifest perbaiki overflow pada text comodity dan tampilkan juga tipe comodity dan nama sales"*
  - **Akar Masalah**:
    - Pada modal Manifest Batch (`logistics.tsx`), teks komoditas (`fdComodity`) sebelumnya diletakkan di dalam baris `flexDirection: 'row'` dengan `numberOfLines={1}` tanpa pembungkus dinamis, sehingga deskripsi barang yang panjang melebihi lebar layar kartu (*horizontal overflow*).
    - Tipe komoditas (`typeComodityName` / `fdComodityName`) dan nama sales penanggung jawab (`fdSalesNM` dari master `tbCustomers`) belum ditampilkan pada kartu baris manifest.
    - Endpoint backend `getManifestByMarkingCode` sebelumnya hanya men-SELECT `vwShipment` mentah tanpa meng-enrich nama sales dari `tbCustomers` dan nama tipe komoditas dari `tbTypeComodity`.
  - **Perbaikan & Implementasi**:
    1. **Backend Integration (`marking.service.ts`)**:
       - Memperbarui query `getManifestByMarkingCode` dengan raw SQL teroptimasi yang men-`LEFT JOIN tbEntryList`, `tbCustomers` (mengambil `RTRIM(c.fdSalesNM) AS fdSalesNM`), dan `tbTypeComodity` (mengambil `COALESCE(NULLIF(RTRIM(tc.fdComodityName), ''), NULLIF(RTRIM(s.fdComodityName), '')) AS typeComodityName / fdComodityName`).
       - Menambahkan sanitasi `RTRIM` pada seluruh field string.
       - Menyiapkan mekanisme fallback otomatis ke `prisma.vwShipment.findMany`.
       - PM2 `ShippingApi` backend direstart (online).
    2. **Mobile Layout & Anti-Overflow UI (`logistics.tsx`)**:
       - Mengganti baris komoditas dengan kontainer bergaris tepi elegan yang mendukung *natural word wrap* penuh (`lineHeight: 16`), menghilangkan overflow horizontal 100%.
       - Menampilkan **Badge Tipe Komoditi** (`typeComodityName` / `fdComodityName`) seperti `GENERAL`, `BRANDED`, `LARTAS - S`, dsb di sudut kanan atas panel komoditas.
       - Menampilkan **Badge Nama Sales** (`fdSalesNM`) pada baris nama customer (`displayCustName`).
       - Mempercantik pemisah metrik koli, berat kg, dan kubikasi $m^3$.
    3. **Build & Deploy**:
       - TypeScript typecheck `mobile/`: **0 error**.
       - Hermes bytecode bundle diekspor ulang (`entry-b05229e33233d9bc7482634ff893a812.hbc`, 5.4 MB, 3.307 modul).
       - Bundle diinjeksikan ke `mshipping.apk` dan ditandatangani ulang via `uber-apk-signer.jar` dengan sertifikat rilis resmi `release.keystore` (dual scheme v2 + v3, 4096-byte zipalign verified).
       - File APK fisik (`126.918.525 bytes`, 121.0 MB) telah disinkronkan ke seluruh jalur distribusi server (`c:\shipping\mshipping.apk`, `frontend/dist/`, `frontend/public/`, `backend/public/uploads/`).
       - Dokumentasi `mobile-app.md` (seksi 3.5) telah diselaraskan.

- [x] **Penyelarasan Modal Detail Shipment 3-Tab (Ringkasan, Dimensi, Timeline) Mobile App Sama Seperti Frontend Web** ([logistics.tsx](file:///c:/shipping/mobile/app/%28tabs%29/logistics.tsx), [utils.ts](file:///c:/shipping/mobile/src/lib/utils.ts), [mobile-app.md](file:///c:/shipping/mobile-app.md)):
  - **Permintaan Pengguna**:
    - *"Pada detail di tab daftar resi, buat seperti modal pada detail shipment di frontend. Ada tab ringkasan dimensi dan time line"*
  - **Akar Masalah Sebelumnya**:
    - Modal shipment sebelumnya di tab Logistik (`logistics.tsx`) hanya berupa bottom sheet statis sederhana yang menampilkan informasi ringkas tanpa navigasi tab.
    - Belum ada rincian dimensi fisik per koli (`packing list`, `ukuran gudang`, `komplain`), belum ada kalkulasi volume kubikasi, dan belum ada pelacak alur waktu status logistik (*timeline step tracker*).
  - **Perbaikan & Implementasi**:
    1. **Navigasi Tersegmen (SegmentedControl)**:
       - Header menampilkan nama customer (disanitasi dengan `displayCustName`), Badge No. List, Badge Status Pengiriman (`getShipmentStatusBadge`), dan chip lokasi gudang (`MapPin {fdGudang}`).
       - SegmentedControl 3 Tab:
         - **`Ringkasan`**:
           - 3 Kartu Metrik KPI: Total Koli, Total Berat (kg), Total Volume ($m^3$).
           - Panel Informasi Pengiriman: No. Resi Terima, Tracking No., Marking & No., Tanggal Agent, Moda / Cabang.
           - Panel Komoditas (`fdComodity`, `fdComodityName`).
           - Panel Keterangan (`fdDesc`).
         - **`Dimensi`**:
           - Sub-tab switcher: `Packing List`, `Ukuran Gudang`, `Komplain` lengkap dengan badge hitung jumlah item.
           - Banner Total Volume Kubikasi: Akumulasi volume $m^3$ sub-tab aktif berbasis rumus `calcTotalVolume` `(P * L * T * Qty) / 1.000.000`.
           - Daftar Kartu Dimensi Per Koli: Menampilkan deskripsi koli, badge volume, dan grid 4 metrik (Panjang cm, Lebar cm, Tinggi cm, Jumlah pcs).
         - **`Timeline`**:
           - Deteksi status dibatalkan (`fdCancel = 1` / `statusStep = -1`) dengan kartu pembatalan rose.
           - Pelacak 6 tahapan status logistik vertikal (*Waiting Loading*, *ETD*, *ETA*, *Warehouse*, *Delivery*, *Delivered*) dengan node bulat hijau (`Check`), badge *"Berjalan"* untuk tahap aktif, garis konektor vertikal, dan stempel waktu tanggal.
    2. **Integrasi Asinkron React Query**:
       - `GET /api/shipments/:id`: Detail shipment lengkap beserta kalkulasi relasi status `shipmentStatus`.
       - `GET /api/shipments/:id/dimensions/packinglist`: Dimensi packing list.
       - `GET /api/shipments/:id/dimensions/gudang`: Dimensi fisik aktual gudang.
       - `GET /api/shipments/:id/dimensions/komplain`: Dimensi komplain selisih ukuran.
    3. **Helper Baru di Mobile (`utils.ts`)**:
       - `cleanFoxProString()`
       - `displayCustName()`
       - `calcTotalVolume()`
  - **Build & Deploy**:
    - Metro bundle diekspor ulang (`entry-95c4ffab5a56dc96c50f9a3fb34601a9.hbc`, 5.4 MB, 3.307 modul).
    - Bundle diinjeksikan ke `mshipping.apk` dan ditandatangani ulang dengan sertifikat rilis resmi `release.keystore` via `uber-apk-signer.jar` (dual scheme v2 + v3, 4096-byte zipalign verified).
    - File APK fisik (`126.918.525 bytes`, 121.0 MB) telah disinkronkan ke seluruh direktori distribusi server:
      - `c:\shipping\mshipping.apk`
      - `c:\shipping\frontend\dist\mshipping.apk`
      - `c:\shipping\frontend\public\mshipping.apk`
      - `c:\shipping\backend\public\uploads\mshipping.apk`
    - Dokumentasi `mobile-app.md` (seksi 3.5) telah diselaraskan.

- [x] **Penyelarasan Tab Customer Detail & Alamat Kirim Mobile App Sama Seperti Frontend Web** ([master.tsx](file:///c:/shipping/mobile/app/%28tabs%29/master.tsx), [mobile-app.md](file:///c:/shipping/mobile-app.md)):
  - **Permintaan Pengguna**:
    - *"Pada tab customer detail tampilkan alamat kirim sama seperti frontend"*
  - **Akar Masalah Sebelumnya**:
    - Pada aplikasi mobile tab Customer (`master.tsx`), modal profil pelanggan sebelumnya hanya menampilkan daftar teks sederhana (Kode, PIC, Telepon, Kota, Sales).
    - Kolom penting pengiriman fisik seperti `fdNamaPengiriman`, `fdHpPengiriman`, `fdKotaPengiriman`, `fdAlamatPengiriman`, `fdKetPengiriman`, serta daftar alamat cabang (`addresses` / `vwCustomerContacts`) belum ditampilkan sama sekali.
  - **Perbaikan & Implementasi**:
    1. **Navigasi Tersegmen (SegmentedControl)**:
       - Menambahkan tab navigasi di dalam modal Profil Pelanggan:
         - **`Alamat Kirim`** (Tab utama/default saat modal dibuka):
           - Nama Penerima: `fdNamaPengiriman`
           - Nomor HP Pengiriman: `fdHpPengiriman` (dilengkapi tombol aksi cepat **Telepon Penerima** dan **WhatsApp Penerima**)
           - Kota Pengiriman: `fdKotaPengiriman`
           - Alamat Lengkap Pengiriman: Kotak berlatar surface dengan border semantik yang memuat `fdAlamatPengiriman` lengkap
           - Instruksi Khusus: Kotak aksen amber berisi catatan operasional `fdKetPengiriman`
         - **`Info Kontak`**:
           - Kode Customer, PIC/Kontak, No Telepon, No HP, Kota Operasional, Alamat Kantor / Utama (`fdAddr1` & `fdAddr2`), Sales In-Charge, Catatan Keterangan.
         - **`Alamat Cabang`**:
           - Daftar kartu alamat sekunder / gudang dari relasi `addresses` (`vwCustomerContacts`).
    2. **Pratinjau Alamat Kirim pada Daftar Utama**:
       - Kartu customer pada list utama kini menyertakan pratinjau alamat kirim ringkas: `Kirim: <fdAlamatPengiriman>` dan memprioritaskan `fdKotaPengiriman`.
    3. **Query Detail Pelanggan (`GET /api/customers/:id`)**:
       - Mengintegrasikan React Query untuk memuat data lengkap pelanggan beserta relasi cabang (`addresses`) secara asinkron tanpa memblokir pembukaan modal instan.
  - **Build & Deploy**:
    - Metro bundle diekspor ulang (`entry-0174be4a28fd629e70193509b162a478.hbc`, 5.3 MB, 3.307 modul).
    - Bundle diinjeksikan ke `mshipping.apk` dan ditandatangani ulang dengan sertifikat rilis resmi `release.keystore` via `uber-apk-signer.jar` (dual scheme v2 + v3, 4096-byte zipalign verified).
    - File APK fisik (`126.914.429 bytes`) telah disinkronkan ke seluruh direktori distribusi server:
      - `c:\shipping\mshipping.apk`
      - `c:\shipping\frontend\dist\mshipping.apk`
      - `c:\shipping\frontend\public\mshipping.apk`
      - `c:\shipping\backend\public\uploads\mshipping.apk`
    - Dokumentasi `mobile-app.md` telah diselaraskan.

- [x] **Eksklusi Faktur Terbit (Issued) & Infinite Scroll 25 Baris Awal pada Antrean Validasi** ([billing.service.ts](file:///c:/shipping/backend/src/modules/billing/billing.service.ts), [ValidationListPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/ValidationListPage.tsx), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Permintaan Pengguna**:
    - *"kenapa bill yg sudah issued tampil?"*
    - *"ya, tampilan pertama cukup 25 baris saja"*
  - **Akar Masalah & Penyesuaian**:
    1. **Eksklusi Faktur Sudah Terbit / Issued (`fdGive != 1`)**:
       - Di backend `billing.service.ts` dan frontend `ValidationListPage.tsx`, syarat `draftOnly` dikembalikan agar mengecualikan faktur yang sudah di-issue:
         `{ OR: [{ fdGive: null }, { fdGive: { not: 1 } }] }` dan `(b.fdGive ?? 0) !== 1`.
       - Hasilnya: Antrean validasi kini murni hanya memuat faktur yang **belum diterbitkan (Draft murni, 47 faktur)**. Faktur yang sudah `ISSUED` tidak lagi muncul di halaman ini.
       - Waktu eksekusi backend terpangkas menjadi sangat instan: **~435 ms**!
    2. **Tampilan Pertama 25 Baris (`PAGE_SIZE = 25`)**:
       - `PAGE_SIZE` disetel menjadi `25` (dari sebelumnya 50).
       - Tampilan awal me-render 25 baris pertama; saat pengguna menggulir mendekati dasar tabel atau kartu, 25 baris berikutnya ditambahkan secara otomatis (`25 -> 50 -> ...`).
       - Tombol cadangan disesuaikan menjadi *"Muat Lebih Banyak (+25)"*.
  - **Verifikasi**:
    - Backend typecheck: **0 error**.
    - Backend PM2 `ShippingApi` direstart (PID 19596) dan online normal.
    - Frontend build: **0 error (selesai dalam 2.39s)**.
    - Dokumentasi `frontend-app.md` telah disinkronkan.

- [x] **Optimasi Ekstrem Performa & Perbaikan Crash 500 pada Antrean Validasi Faktur (`getBillings`)** ([billing.service.ts](file:///c:/shipping/backend/src/modules/billing/billing.service.ts)):
  - **Keluhan / Motivasi**:
    - Query endpoint `GET /api/billing?hasAmount=true&draftOnly=true&noPagination=true&minYear=2023` mengalami HTTP 500 Internal Server Error saat dibuka dari web frontend.
  - **Akar Masalah**:
    1. **Sintaks Table Hint Ganda**:
       - Query enrichment konsignee menggunakan `WITH (INDEX(...)) WITH (NOLOCK)`. Pada SQL Server, dua kata kunci `WITH` berturut-turut pada klausa tabel memicu error `Error Code 319: Incorrect syntax near the keyword 'with'`.
    2. **Kompatibilitas Fungsi SQL Server**:
       - Fungsi `STRING_SPLIT` dan `STRING_AGG` tidak didukung penuh pada instalasi SQL Server host yang melempar error `Invalid object name 'STRING_SPLIT'`.
    3. **Degradasi Performa Non-Sargable `OUTER APPLY`**:
       - Percobaan menggunakan `OUTER APPLY` dengan `RTRIM(fdInvNo) = RTRIM(b.fdInvNo)` pada seluruh tabel menghasilkan scanning 24 detik karena clustered index seek tidak terpicu.
  - **Solusi Arsitektur Hybrid Teroptimasi**:
    1. **Main Query Cepat Terindeks (`prisma.tbBilling.findMany` + `count`)**:
       - Menggunakan Prisma native parameterized query dengan filter `hasAmount`, `draftOnly`, dan `minYear` (hanya memakan waktu ~980 ms untuk memuat 1.782 invoice draft).
    2. **Enrichment Agregasi Paralel Berbasis IN-Seek Cepat**:
       - Setelah 1.782 baris didapat, ID `fdInvNo`, `fdEmpCode`, dan `fdMarkingCode` dikumpulkan.
       - Tiga enrichment dijalankan konkuren via `Promise.all`:
         - `tbEmployees.findMany` (5 emp codes): ~10 ms.
         - Agregasi `tbBillingTotal` (`SUM(fdJumlah)`, `SUM(fdBayar)`, `MAX(fdSLunas)`) dengan `IN (chunk)` berukuran 1.000 (seek pada Clustered PK): **~16 ms**.
         - Konsignee `tbMarking` dengan `WITH (INDEX(IX_tbMarking_fdMarkingCode_fdConsignee), NOLOCK)` dan fallback aman: **~48 ms**.
  - **Hasil Benchmark**:
    - Waktu respon `getBillings` turun dari **24+ detik** / crash 500 menjadi **~1.9 detik** untuk **1.782 invoice validasi lengkap** beserta customer, sales/employee, totals, dan konsignee.
    - Typecheck backend `bun run --bun tsc --noEmit`: **0 error**.
    - PM2 `ShippingApi` direstart (PID 8740) dan berjalan normal online.

- [x] **Optimasi Ekstrem Performa Loading Halaman Validasi Faktur (`ValidationDetailPage` / `HKS-001056-09-2026`)** ([ValidationDetailPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/ValidationDetailPage.tsx), [billing.service.ts](file:///c:/shipping/backend/src/modules/billing/billing.service.ts), [m3-check.service.ts](file:///c:/shipping/backend/src/modules/m3-check/m3-check.service.ts), [billing-validation.service.ts](file:///c:/shipping/backend/src/modules/billing/billing-validation.service.ts)):
  - **Keluhan Pengguna**:
    - *"http://36.93.22.142/mshipping/finance/billing/validation/HKS-001056-09-2026 perbaiki load nya lama"*
  - **Akar Masalah**:
    1. `getBillingById`:
       - Menjalankan 7+ query pengkayaan secara berurutan (sequential) setelah query header (detail, entryListInfo, markingInfo, cashierRows, employee, giveEmpRow, resiRows, salesRow).
    2. `evaluateM3Check`:
       - SP `dbo.get_profile_harga_dari_listcode` melakukan full table scan pada tabel historis `tbBillingPrev` (766.700 baris) karena kolom `fdCustCode` di `tbBillingPrev` tidak memiliki nonclustered index.
       - SP memakan waktu 2.1 detik hingga 3.8 detik sendiri per eksekusi.
       - `evaluateM3Check` memanggil 8 query paralel, lalu memanggil secara berurutan (serial): `getCustomerHargaAuditInfo`, `tglAgentRes`, `lookupPriceList`, dan `lookupCustomerPriceList`.
    3. `getTransportValidationCheck`:
       - Query duplicate dan ekspedisi lokal memiliki konversi implisit data type.
  - **Tindakan & Solusi**:
    1. **Database Indexing**:
       - Menambahkan nonclustered index `IX_tbBillingPrev_CustCode_InvDate` pada `tbBillingPrev (fdCustCode, fdInvDate DESC) INCLUDE (fdInvNo)`.
       - Waktu eksekusi `dbo.get_profile_harga_dari_listcode` terpangkas dari **~2.200 ms** menjadi **< 150 ms**.
    2. **Refactor & Paralelisasi `m3-check.service.ts`**:
       - Menggabungkan pengambilan parameter awal (`fdTglAgent`, `fdTypeComodity`, `fdSatuan`, `fdBranchCode`, `fdBranchName`) langsung pada query `entryInfo_fast` via `LEFT JOIN tbMarking` dan `tbCabang`.
       - Seluruh query evaluasi M3 (11 operasi termasuk SP, audit info, general price lookup, dan customer price lookup) dijalankan bersamaan secara konkuren dalam satu `Promise.all`.
    3. **Refactor & Paralelisasi `getBillingById` di `billing.service.ts`**:
       - Mengkonsolidasikan header query dan menjalankan pengambilan `details` beserta seluruh pengkayaan (`markingInfo`, `cashierRows`, `emp`, `giveEmpRow`, `salesRow`, `resiRows`) secara paralel menggunakan `Promise.all`.
       - Waktu eksekusi `getBillingById` (warm) turun drastis dari **1.500 ms** menjadi **~135 ms**.
  - **Hasil Benchmark**:
    - `getBillingById`: Turun dari **1.500+ ms** ke **~135 ms** (*~11x lebih cepat*).
    - `evaluateM3Check`: Turun dari **~3.500 - 4.500 ms** ke **~380 - 440 ms** (*~10x lebih cepat*).
    - `checkBillingTransport`: Konsisten di **~250 - 320 ms**.
    - Frontend build & Backend typecheck: **0 error**.

- [x] **Implementasi Nama Customer dari `fdBillTo` & Indikator Perbedaan dengan `fdCustName` pada Antrean Validasi Faktur** ([ValidationListPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/ValidationListPage.tsx), [billing.service.ts](file:///c:/shipping/backend/src/modules/billing/billing.service.ts), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Permintaan Pengguna**:
    - *"kolom nama customer di ambil dari fdBillto dan beri tanda apabila beda fdBillto dengan fdCustName."*
  - **Akar Masalah Mengapa SONY TJOA Tidak Muncul Sebelumnya**:
    1. Faktur terbaru yang dibuat hari ini (14 September 2026, nomor: `HKS-001053-09-2026`) memiliki kode master customer `N000003` dengan nama master **`NUSANTARA ERADATA`**, namun nama penerima tagihan / Bill To-nya adalah **`SONY TJOA`** (`tbCustomers.fdBillTo`).
    2. Kolom customer di `ValidationListPage.tsx` sebelumnya hanya menampilkan `fdCustName` (`NUSANTARA ERADATA`), dan pencarian di backend belum mencocokkan kolom `fdBillTo`.
    3. Selain itu, faktur yang baru dicetak/diserahkan oleh operasional memiliki `fdGive = 1`, namun belum pernah divalidasi (`fdCekDate = null`) dan belum diserahkan kurir (`fdGive2 = 0`). Syarat `draftOnly` lama mengecualikan `fdGive = 1` sehingga faktur yang menunggu validasi ini tidak muncul.
  - **Tindakan Perbaikan & Solusi**:
    1. **Backend Integration (`billing.service.ts`)**:
       - Menambahkan pencarian `fdBillTo: { contains: search }` pada `matchingCustomers` di `getBillings`, sehingga pencarian nama bill to seperti "sony tjoa" otomatis menemukan faktur terkait.
       - Menyertakan `fdBillTo: true` pada `customer: { select: { ... } }` di `getBillings`.
       - Menyesuaikan filter `draftOnly`: faktur yang belum divalidasi (`fdCekDate: null`) dan belum diserahkan kurir (`fdGive2 != 1`) tetap masuk ke antrean validasi draft meskipun telah diprint/diserahkan penagihan (`fdGive = 1`).
    2. **Frontend UI Display & Indikator (`ValidationListPage.tsx`)**:
       - Kolom Nama Customer (baik pada Desktop Table maupun Mobile Card) memprioritaskan nama tagihan **`fdBillTo`** (`row.customer?.fdBillTo`), dengan fallback ke `fdCustName`.
       - Jika `fdBillTo` berbeda dengan `fdCustName` master, ditampilkan badge penanda khusus:
         `[AlertTriangle] BillTo ≠ Master` (warna amber ramah tema gelap/terang).
       - Di sub-line ditampilkan kode customer beserta nama resmi master: `Master: {fdCustName}`.
       - Menambahkan `b.customer?.fdBillTo` ke dalam filter pencarian instan client-side.
  - **Verifikasi**:
    - Backend PM2 `ShippingApi` direstart dan online normal.
    - Test query pencarian "sony tjoa" berhasil menemukan 3 invoice (termasuk faktur hari ini `HKS-001053-09-2026`).
    - Build frontend `bun run build`: **Lulus 100% (0 error)**.
    - Dokumentasi `frontend-app.md` dan `.agents/working.md` telah disinkronkan.

- [x] **Optimasi Ekstrem Performa Pencarian & Load Rincian Customer (`DY/SK`)** ([customers.service.ts](file:///c:/shipping/backend/src/modules/customers/customers.service.ts)):
  - **Keluhan & Permintaan Pengguna**:
    - *"saya cari dy/sk kenapa loadnya lama? dan load detailnya sangat lama"*
  - **Hasil Investigasi & Akar Masalah**:
    1. **Pencarian (`getCustomers`) memakan waktu ~6.063 ms (6 detik)**:
       - Ketika pencarian mencocokkan `DY/SK` (`D000652`), backend melakukan batch perhitungan revenue/tier tahunan (`tbBilling`).
       - Pelanggan `DY/SK` memiliki 421 invoice di tahun 2026 dengan `fdJumlah1 = 0` (yang nilai nominalnya tercatat di `tbBillingPrev`).
       - Kode lama melakukan pemanggilan dua tahap: memuat seluruh nomor invoice nol, lalu menjalankan subquery non-sargable dengan ribuan parameter: `SELECT ... FROM tbBillingPrev WHERE RTRIM(fdInvNo) IN ('...', 421 items)`.
       - Karena dibungkus `RTRIM()`, SQL Server tidak bisa memakai clustered index pada `tbBillingPrev` sehingga melakukan full table scan.
    2. **Load Detail (`getCustomerById`) memakan waktu ~24.852 ms (25 detik)**:
       - Untuk pelanggan besar seperti `DY/SK`, terdapat **3.377 baris invoice** sejak 2024, di mana **1.762 baris invoice bernilai nol**.
       - Kode lama mengirim query raksasa ke SQL Server dengan **1.762 parameter** di dalam klausa `WHERE RTRIM(fdInvNo) IN (...)`.
       - SQL Server tercekik mem-parse query tersebut dan memakan waktu 25+ detik hingga browser terasa macet / loading sangat lama.
  - **Solusi & Optimasi SQL Query**:
    1. **Single Aggregated Query dengan `LEFT JOIN`**:
       - Mengganti pemanggilan dua tahap dan array parameter besar dengan query langsung menggunakan `LEFT JOIN tbBillingPrev p WITH (NOLOCK) ON b.fdInvNo = p.fdInvNo` dan `GROUP BY YEAR(b.fdInvDate)` / `GROUP BY b.fdCustCode`.
       - Menggunakan klausa sargable `b.fdCustCode = ${id.trim()}` atau `b.fdCustCode IN (...)` tanpa `RTRIM` pada kolom tabel, sehingga SQL Server langsung memanfaatkan **NonClusteredIndex pada fdCustCode** dan **Clustered Index Seek pada PK_tbBillingPrev**.
  - **Hasil Benchmark Performa**:
    - **Pencarian Customer (`getCustomers`)**: Turun dari **6.063 ms (6 detik)** menjadi **483 ms (< 0,5 detik)** (*12x lebih cepat*).
    - **Load Detail Customer (`getCustomerById`)**: Turun drastis dari **24.852 ms (25 detik)** menjadi **47 ms (< 0,05 detik)** (*500x lebih cepat*).
  - **Verifikasi**:
    - Backend PM2 `ShippingApi` berhasil direstart dan berjalan normal.
    - Typecheck backend `bun run --bun tsc --noEmit`: 100% clean (0 error).
    - Frontend build `bun run build`: 100% clean (0 error).

- [x] **Implementasi Skeleton Shimmer pada Modal Rincian Customer** ([CustomerDetailModal.tsx](file:///c:/shipping/frontend/src/features/customers/components/CustomerDetailModal.tsx), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Kebutuhan & Permintaan Pengguna**:
    - *"@[CustomerDetailModal.tsx] -> ini pakai sckeletton shimmer"*
  - **Akar Masalah Sebelumnya**:
    - Saat modal detail customer sedang memuat detail data lengkap (`isLoading={isLoadingDetail}` dari React Query), modal sebelumnya menampilkan spinner bulat `Loader2` berputar di tengah layar yang melanggar aturan desain sistem (`AGENTS.md`: *"❌ Spinner bulat / inline spinner JSX -> ✅ skeleton shimmer"*).
    - Jika modal dibuka dengan `customer={null}` saat loading, modal langsung me-return `null` tanpa menampilkan visual container.
  - **Tindakan Perbaikan & Solusi**:
    1. **Komponen Wireframe Skeleton (`CustomerDetailBodySkeleton`)**:
       - Menampilkan wireframe terstruktur menggunakan class animasi `.skeleton-shimmer` yang ramah 5 tema (Heritage, Ocean, Emerald, Amber, Midnight).
       - Merefleksikan tata letak asli:
         - 2 kartu kontak & representatif penjualan (Contact Person & Sales Person).
         - Tabel ringkasan informasi detail key-value 5 baris.
         - Kartu indikator metrik tier & target penagihan.
    2. **Komponen Skeleton Lengkap (`CustomerDetailFullSkeleton`)**:
       - Digunakan saat modal di-mount ketika objek customer belum tersedia (`!customer && isLoading`).
       - Memuat backdrop modal, modal card, header modal shimmer (nama, chip status, kode customer), navigasi tab bar shimmer, body shimmer, dan footer modal.
    3. **Pembersihan Dependency**:
       - Menghapus impor `Loader2` dari `lucide-react`.
    4. **Dokumentasi & Verifikasi**:
       - Update dokumentasi loading state pada `frontend-app.md`.
       - Menjalankan `bun run build` (tsc + vite): **Lulus 100% (0 error, 1.173 modul ter-bundle)**.

- [x] **Menampilkan fdNote Air dan fdNote 1 Sea dari tbCustomersHarga pada Customer Price Profile** ([BillingValidationCard.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationCard.tsx), [billing.types.ts](file:///c:/shipping/frontend/src/features/billing/types/billing.types.ts), [id.json](file:///c:/shipping/frontend/src/lib/i18n/id.json), [en.json](file:///c:/shipping/frontend/src/lib/i18n/en.json), [m3-check.service.ts](file:///c:/shipping/backend/src/modules/m3-check/m3-check.service.ts), [m3-check.types.ts](file:///c:/shipping/backend/src/modules/m3-check/m3-check.types.ts), [price-check.service.ts](file:///c:/shipping/backend/src/modules/price-check/price-check.service.ts), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Kebutuhan & Permintaan Pengguna**:
    - *"pada Customer Price Profile tampilkan fdNote air dan fdNote 1 sea dari tbHargaCustomers"*
  - **Analisis Kolom & Sumber Data**:
    - Tabel master harga customer adalah `tbCustomersHarga`.
    - Kolom catatan harga:
      - `fdNote`: Catatan khusus tarif pengiriman **Udara / Air** (misal rute SG/GZ, ketentuan asuransi, diskon khusus).
      - `fdNote1`: Catatan khusus tarif pengiriman **Laut / Sea** (misal tax refund per cbm, minimum charges, kesepakatan kontainer/batch).
  - **Tindakan Perbaikan & Solusi**:
    1. **Backend Integration (`m3-check.service.ts` & `price-check.service.ts`)**:
       - Memperbarui fungsi `getCustomerHargaAuditInfo` untuk mengekstrak `RTRIM(fdNote) AS fdNoteAir` dan `RTRIM(fdNote1) AS fdNote1Sea` dari `tbCustomersHarga`.
       - Memasukkan `fdNoteAir` dan `fdNote1Sea` ke dalam objek `profileHarga` pada `evaluateM3Check` dan `profileTariff` pada `price-check.service.ts`.
       - Menambahkan definisi field `fdNoteAir?: string | null` dan `fdNote1Sea?: string | null` pada `ProfileHargaItem` di `m3-check.types.ts`.
    2. **Frontend Type System (`billing.types.ts`)**:
       - Menambahkan `fdNoteAir?: string | null` dan `fdNote1Sea?: string | null` pada struktur `profileHarga` di `PriceCheckResponse` dan `UnifiedM3CheckResponse`.
    3. **Komponen Visual UI (`BillingValidationCard.tsx`)**:
       - Pada seksi **Customer Price Profile (`t('billing.validation.custPriceProfile')`)**, menambahkan blok baru: *"Catatan Khusus Tarif Customer (tbCustomersHarga)"*.
       - Menguraikan menjadi 2 kartu grid:
         - **Note Air (fdNote)** dengan icon `Plane`, teks monospace, dan badge highlight "Moda Faktur Ini" jika invoice saat ini bertipe udara (`fdListType === 1`).
         - **Note Sea (fdNote 1)** dengan icon `Ship`, teks monospace, dan badge highlight "Moda Faktur Ini" jika invoice saat ini bertipe laut (`fdListType === 2`).
       - Teks catatan dibersihkan menggunakan `cleanFoxProString()` untuk mengganti karakter `^` menjadi `'`.
       - Jika catatan tidak ada / kosong, menampilkan teks fallback informatif (*"Tidak ada catatan udara"* / *"Tidak ada catatan laut"*).
    4. **Dual Bahasa (i18n)**:
       - Menambahkan pasangan key terjemahan `billing.validation.tariffNotesTitle`, `noteAirLabel`, `noteSeaLabel`, `noAirNote`, `noSeaNote`, `activeModeBadge` pada `id.json` dan `en.json`.
  - **Verifikasi**:
    - `bun run build` frontend: **Lulus 100% (0 error, 1.173 modul ter-bundle)**.
    - `bun run --bun tsc --noEmit` backend: **Lulus 100% (0 error)**.
    - PM2 `ShippingApi` backend direstart dan online normal.
    - Dokumentasi `frontend-app.md` (Seksi 3.6.D) telah disinkronkan.

- [x] **Implementasi Rata-rata Tarif / M³ per Tipe Komoditas pada Riwayat Tagihan Customer** ([CustomerHistoryKpiCards.tsx](file:///c:/shipping/frontend/src/features/billing/components/customer-history/CustomerHistoryKpiCards.tsx), [CustomerBillingHistoryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustomerBillingHistoryModal.tsx), [useCustomerHistoryData.ts](file:///c:/shipping/frontend/src/features/billing/components/customer-history/useCustomerHistoryData.ts), [types.ts](file:///c:/shipping/frontend/src/features/billing/components/customer-history/types.ts), [billing.types.ts](file:///c:/shipping/frontend/src/features/billing/types/billing.types.ts), [customer-billing-history.service.ts](file:///c:/shipping/backend/src/modules/billing/customer-billing-history.service.ts), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Kebutuhan & Permintaan Pengguna**:
    - *"Riwayat Tagihan Customer -> Rata-rata Tarif / M³ -> buat per tipe comodity"*
  - **Akar Masalah Sebelumnya**:
    - Kartu KPI ke-3 pada modal `CustomerBillingHistoryModal` sebelumnya hanya menampilkan angka tunggal global `avgPricePerM3` (`totalAmount / totalM3`), tanpa membedakan variasi tipe komoditas barang (misal: `UMUM`, `GARMENT`, `LARTAS - N`, `LARTAS - S`, `SEMI GARMENT`, `TEKSTIL`, dll).
    - Nilai volume `fdM3` dan berat `fdBerat` pada header invoice sebelumnya belum di-SELECT dari `tbEntryList` (`el.fdM3` dan `el.fdJmlBerat`).
  - **Tindakan Perbaikan & Solusi**:
    1. **Backend Agregasi SQL Server Cepat (`customer-billing-history.service.ts`)**:
       - Menambahkan query paralel `commodityRatesSql` pada halaman pertama (`page=1`) yang menghitung agregasi total kubikasi M3, total rupiah tagihan M3, dan rata-rata tarif efektif per M³ untuk seluruh histori pelanggan yang dikelompokkan berdasarkan `typeComodityName`.
       - Meng-query `el.fdM3` dan `el.fdJmlBerat AS fdBerat` pada `querySql` sehingga data volume dan berat header invoice terisi akurat.
       - Mengembalikan `commodityAvgRates: CommodityAvgRate[]` pada response `summary`.
    2. **Integrasi Hook & State (`useCustomerHistoryData.ts`)**:
       - Mengonsumsi `firstPageSummary?.commodityAvgRates` dari backend dan menyediakan fallback kalkulasi lokal dari `flattenedItems`.
       - Mendukung parameter `initialTypeComodity` dari props modal.
       - Menentukan `activeCommodityRate` ketika pengguna memilih filter tipe komoditas tertentu.
    3. **Penyegaran Tampilan Kartu KPI (`CustomerHistoryKpiCards.tsx`)**:
       - Kartu ke-3 kini menampilkan tarif rata-rata komoditas yang sedang difilter atau rata-rata gabungan.
       - Menyajikan deretan chip/pill interaktif untuk setiap tipe komoditas (`[KOMODITAS]: [TARIF/M3]`) yang dapat diklik langsung untuk memfilter daftar invoice/rincian ke komoditas tersebut.
       - Dilengkapi tombol `[X Tipe ↗]` yang membuka modal dialog *"Rata-rata Tarif / M³ per Tipe Komoditas"* dengan tabel komparasi detail (Tipe Komoditas, Rata-rata Tarif/M³, Volume M³, Total Nilai Tagihan, Jumlah Invoice, dan tombol aksi filter).
  - **Verifikasi**:
    - `bun run build` di frontend: **Lulus 100% (0 error, 1.173 modul tertransformasi, built in 2.37s)**.
    - `bun run --bun tsc --noEmit` di backend: **Lulus 100% (0 error)**.
    - PM2 `ShippingApi` backend direstart dan online normal.
    - Dokumentasi `frontend-app.md` (Seksi 3.6.H.2) telah disinkronkan.

- [x] **Implementasi Fitur Kamera Avatar Mandiri & Ganti Kata Sandi Mobile App** ([AvatarModal.tsx](file:///c:/shipping/mobile/src/components/profile/AvatarModal.tsx), [ChangePasswordModal.tsx](file:///c:/shipping/mobile/src/components/profile/ChangePasswordModal.tsx), [profile.tsx](file:///c:/shipping/mobile/app/%28tabs%29/profile.tsx), [utils.ts](file:///c:/shipping/mobile/src/lib/utils.ts), [id.json](file:///c:/shipping/mobile/src/lib/i18n/id.json), [en.json](file:///c:/shipping/mobile/src/lib/i18n/en.json), [mobile-app.md](file:///c:/shipping/mobile-app.md)):
  - **Kebutuhan & Permintaan Pengguna**:
    - *"buat fitur untuk user upload avatar dan ganti password pada mobile app"*
  - **Analisis Keterbatasan Native Android APK**:
    - Berdasarkan dekompilasi dex binary `mshipping.apk`, modul native `expo-camera` (`CameraView`) telah terkompilasi, sedangkan modul pihak ketiga seperti `expo-image-picker` tidak terdaftar di `classes.dex` dan akan memicu crash fatal jika diimpor.
    - Oleh karena itu, fitur foto profil dibangun memanfaatkan `expo-camera` (`CameraView`) dengan kamera depan/selfie dan belakang serta kompresi Base64.
  - **Implementasi Komponen & Integrasi**:
    1. **Komponen Modal Kamera Avatar (`AvatarModal.tsx`)**:
       - Lembar aksi pilihan (*Choice Sheet*): "Ambil Foto (Kamera)", "Hapus Foto Profil", dan pratinjau avatar saat ini.
       - Viewfinder kamera layar penuh dengan panduan lingkaran wajah (*circular mask frame*), toggle switch kamera depan/belakang (`facing: 'front' | 'back'`), dan toggle lampu senter (*torch*).
       - Menangkap gambar via `takePictureAsync({ base64: true, quality: 0.7 })`.
       - Mode pratinjau instan (*Instant Preview*) dengan tombol "Ambil Ulang" dan "Gunakan Foto".
       - Mengirimkan string Base64 ke `POST /api/profile/avatar`, otomatis menyinkronkan state global `useAuthStore` dan `expo-secure-store`, serta menampilkan toast konfirmasi.
       - Menghapus foto profil via `DELETE /api/profile/avatar` dengan dialog konfirmasi dan mereset ke inisial nama.
    2. **Komponen Modal Ganti Kata Sandi (`ChangePasswordModal.tsx`)**:
       - Form terisolasi: Kata Sandi Saat Ini (`currentPassword`), Kata Sandi Baru (`newPassword`), dan Konfirmasi Kata Sandi Baru (`confirmPassword`).
       - Dilengkapi tombol intip kata sandi (*eye toggle*), validasi panjang minimal 6 karakter, dan lencana validasi kecocokan kata sandi (*real-time match indicator*).
       - Menangani request ke `PUT /api/profile/password`, menampilkan loading state pada `<Button>`, dan menangani error secara terstruktur.
    3. **Pembaruan Layar Profil Akun (`mobile/app/(tabs)/profile.tsx`)**:
       - Kartu header profil menampilkan foto avatar (`user.avatarUrl`) melalui helper `resolveAvatarUrl` ke server `36.93.22.142:3010` dengan fallback inisial nama tebal (`getInitials`).
       - Badge kamera di sudut avatar yang dapat diklik untuk membuka `AvatarModal`.
       - Menambahkan menu navigasi "Ganti Kata Sandi" di section `KEAMANAN & AUTENTIKASI`.
    4. **Dukungan Utilitas & Kamus Dual-Bahasa (i18n)**:
       - Menambahkan helper `resolveAvatarUrl()` dan `getInitials()` pada `mobile/src/lib/utils.ts`.
       - Menambahkan 18 pasangan key `profile.*` pada `mobile/src/lib/i18n/id.json` dan `en.json`.
  - **Verifikasi & Build Rilis Mobile App v1.0.6 (Build 7, Opsional)**:
    - **Identifikasi & Perbaikan AndroidManifest.xml Binary**:
      - Sebelumnya, file binary `AndroidManifest.xml` di dalam basis APK masih bertuliskan `versionCode = 1` dan `versionName = 1.0.0`. Pada Android OS Package Manager, ketika pengguna menginstal APK pembaruan di atas aplikasi yang sudah terpasang, Android menolak instalasi atau tidak menimpa versi lama (*silent skip/downgrade protection*).
      - Diperbaiki dengan mem-patch langsung binary AXML `AndroidManifest.xml` (`versionCode = 7` pada byte offset 9008 dan `versionName = '1.0.6'` pada UTF-16LE offset 1664). Dengan ini, Android OS Package Manager secara resmi mengenali APK sebagai rilis pembaruan `v1.0.6 (Build 7)` yang sah saat diinstal.
    - **Penyempurnaan Visual Kontrol Versi & Sanitasi Informasi Server (UX)**:
      - Pada `profile.tsx`: Menghapus tampilan IP server (`36.93.22.142:3010`) dari baris *Status Sistem ERP* (`Terhubung • Operasional Normal`) dan dari footer versi (`Enterprise Logistics & Finance System • Production`).
      - Teks Versi Aplikasi kini selalu menampilkan nomor versi riil dan build yang sedang berjalan (`Versi Aplikasi: v{currentVersion} (Build {APP_VERSION_CODE})`), baik saat terdapat pembaruan maupun tidak.
      - Menambahkan footer informasi versi di bagian paling bawah tab Profil: `M-Shipping Mobile v{currentVersion} • Build {APP_VERSION_CODE}`.
      - Pada `login.tsx`: Menambahkan teks versi `v{APP_VERSION} (Build {APP_VERSION_CODE})` di bagian bawah formulir login agar versi dapat dikontrol secara visual bahkan sebelum masuk ke akun.
    - `bun run tsc --noEmit` di `mobile/`: **Lulus 100% (0 error)**.
    - `bunx expo export --platform android`: **Lulus 100%** (3.307 modul ter-bundle, Hermes bytecode `entry-168cb21baa977ed69985b54ee866c187.hbc` 5.3 MB berhasil di-generate).
    - Bundle baru dan `AndroidManifest.xml` yang telah di-patch diinjeksikan ke `mshipping.apk`.
    - APK ditandatangani ulang dengan sertifikat resmi `release.keystore` via `uber-apk-signer.jar` (dual-scheme v2 + v3, 4096-byte zipalign verified, 0 errors).
    - Berkas APK terbaru (`126.910.333 bytes`, 121 MB) telah disinkronkan ke seluruh jalur distribusi server:
      - `c:\shipping\mshipping.apk`
      - `c:\shipping\frontend\dist\mshipping.apk`
      - `c:\shipping\backend\public\uploads\mshipping.apk`
    - Versi dinaikkan menjadi `v1.0.6` (`versionCode: 7`) dengan tipe update **Opsional** (`forceUpdate: false`) di seluruh Single Source of Truth:
      - `mobile/src/config/version.ts`
      - `backend/src/config/app-version.json`
      - `mobile/app.json`
      - `mobile/package.json`
      - `mobile-app.md`
    - PM2 `ShippingApi` direstart (PID: 17720, status: online).
    - Pengujian curl `GET /api/app-version/latest` dan `curl -I http://36.93.22.142/mshipping/mshipping.apk` berhasil 100% (HTTP 200 OK, 121.0 MB, Last-Modified 12:41 WIB).
    - Dokumentasi [mobile-app.md](file:///c:/shipping/mobile-app.md) pada seksi 3.8 dan tabel matriks endpoint seksi 4 telah disinkronkan.


- [x] **Penonaktifan Penutupan Sidebar Saat Tombol ESC Ditekan** ([Sidebar.tsx](file:///c:/shipping/frontend/src/components/layout/Sidebar.tsx), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Kebutuhan & Permintaan Pengguna**:
    - *"sidebar apabila esc di tekan jangan di tutup"*
  - **Akar Masalah**:
    - Pada `Sidebar.tsx`, terpasang listener `useModalEscape(isSidebarOpen, handleClose)` yang secara agresif menutup sidebar ketika pengguna menekan tombol `Escape` di keyboard (misalnya saat pengguna berniat menutup tooltip, input, atau hanya kebiasaan menekan ESC).
  - **Tindakan Perbaikan**:
    - Menghapus pemanggilan `useModalEscape(isSidebarOpen, handleClose)` dan import `useModalEscape` dari `Sidebar.tsx`.
    - Sidebar kini tetap terbuka kokoh saat tombol ESC ditekan. Tombol tutup resmi (ikon `ChevronLeft` atau backdrop mobile) tetap berfungsi normal jika pengguna ingin menutup/menyembunyikan sidebar secara manual.
  - **Verifikasi**:
    - `bun run build` di frontend: Exit code 0 (1,171 modul, 0 error).

- [x] **Peringatan (Warning) Tagihan di Bawah Minimum Charge M3** ([useBillingValidation.ts](file:///c:/shipping/frontend/src/features/billing/hooks/useBillingValidation.ts), [BillingValidationCard.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationCard.tsx), [BillingValidationSummaryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationSummaryModal.tsx), [ValidationSummaryTabsBar.tsx](file:///c:/shipping/frontend/src/features/billing/components/validation-summary/ValidationSummaryTabsBar.tsx), [PhysicalAuditTab.tsx](file:///c:/shipping/frontend/src/features/billing/components/validation-summary/PhysicalAuditTab.tsx), [billing.types.ts](file:///c:/shipping/frontend/src/features/billing/types/billing.types.ts), [m3-check.service.ts](file:///c:/shipping/backend/src/modules/m3-check/m3-check.service.ts), [m3-check.types.ts](file:///c:/shipping/backend/src/modules/m3-check/m3-check.types.ts), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Kebutuhan & Perintah Pengguna**:
    - *"kasih warning apabila yg ditagih kurang dari min charge m3 apabila ada tapi kalau tidak ada 0.1"*
  - **Logika Batas Minimum Charge**:
    - `effectiveMinChargeM3 = res.profileHarga?.minChargeM3 > 0 ? res.profileHarga.minChargeM3 : 0.1`
    - Kondisi terpicu jika: `!isAir && billedM3 > 0 && billedM3 < (effectiveMinChargeM3 - 0.0001)`.
  - **Implementasi Visual Peringatan (Warning)**:
    1. **Header Badge Status Card**: Menampilkan status amber `DI BAWAH MIN. CHARGE (X.XXXX m³ < Y.YYY m³ · GUDANG)` dengan ikon `AlertTriangle`.
    2. **Kotak Billed M3**: Diberi outline border amber (`border-amber-500 bg-amber-500/5`), ikon warning di samping judul, serta pill penjelas `⚠ < Min X.XX m³`.
    3. **Warning Alert Banner**: Menampilkan alert banner amber informatif pada kartu validasi yang menjelaskan bahwa volume yang ditagihkan lebih rendah dari batas minimum charge master customer atau standar 0.1 m³, sehingga reviewer dapat memastikan apakah penagihan volume riil ini disengaja atau seharusnya ditagihkan tarif minimum.
    4. **Modal Ringkasan Validasi (`BillingValidationSummaryModal.tsx`)**: Tab bar "Validasi M3" menampilkan tag semantik `Cek Min. M3` (amber), kartu Volume Ditagihkan di `PhysicalAuditTab.tsx` menampilkan badge `&lt; Min M3`, serta verdict banner menyertakan catatan warning.
    5. **Backend & Single Source of Truth**: Menambahkan `minChargeM3` pada `UnifiedM3CheckResult` di `m3-check.types.ts` dan response payload `m3Check` di `m3-check.service.ts` serta `billing.types.ts`.
  - **Verifikasi**:
    - `bun run --bun tsc --noEmit` di backend: Exit code 0 (0 error).
    - `bun run build` di frontend: Exit code 0 (0 error, build 2.78s).
    - PM2 `ShippingApi` backend direstart dan online.
    - Dokumentasi `frontend-app.md` (Seksi 3.6.D) telah disinkronkan.

- [x] **Penyesuaian Billed M3 Riil Faktur & Aturan Minimum 0.1 m³ Validasi KG Laut** ([useInvoiceMetrics.ts](file:///c:/shipping/frontend/src/features/billing/hooks/useInvoiceMetrics.ts), [useOverweightValidation.ts](file:///c:/shipping/frontend/src/features/billing/hooks/useOverweightValidation.ts), [useBillingValidation.ts](file:///c:/shipping/frontend/src/features/billing/hooks/useBillingValidation.ts), [BillingValidationCard.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationCard.tsx), [OverweightAuditTab.tsx](file:///c:/shipping/frontend/src/features/billing/components/validation-summary/OverweightAuditTab.tsx), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Kebutuhan & Perintah Pengguna**:
    - Kasus Invoice `HKS-00954A-09-2026`: *"Kotak Billed M3 selalu menampilkan nilai riil yang ditagihkan di invoice (yaitu 0.0257 m³), semua tagihan laut yang di bawah 0.1 m³ wajib dinaikkan menjadi 0.1 m³ untuk validasi kg"*.
  - **Akar Masalah Sebelumnya**:
    1. Di `useInvoiceMetrics.ts` dan `useBillingValidation.ts`, terdapat aturan pemaksaan nilai minimal `0.1 m³` pada `billedM3` jika `calcM3 > 0 && calcM3 < 0.1`. Akibatnya, kotak kartu Billed M3 menampilkan `0.1000 m³` padahal faktur asli menagih angka riil `0.0257 m³`.
    2. Pada validasi overweight/KG laut, bila volume riil `0.0257 m³` digunakan langsung tanpa dinaikkan ke 0.1 m³, kuota berat menjadi terlalu sempit ($0.0257 \times 300 = 7.71\text{ kg}$) sehingga barang ringan berberat 8 kg salah dideteksi sebagai *overweight*.
  - **Tindakan Perbaikan & Solusi**:
    1. **Billed M3 Riil Faktur**:
       - Mengembalikan `billedM3 = calcM3` di `useInvoiceMetrics.ts` dan `useBillingValidation.ts`. Kotak Billed M3, tabel rincian, dan audit M3 kini selalu menampilkan nilai riil yang tercetak di faktur (`0.0257 m³`).
    2. **Aturan Minimum 0.1 m³ untuk Validasi KG Laut (`useOverweightValidation.ts`)**:
       - Menambahkan pengecekan: `isMinM3EnforcedForKg = !isAir && rawRefM3 > 0 && rawRefM3 < 0.1`.
       - Menghitung basis volume kuota rasio: `refM3 = isMinM3EnforcedForKg ? 0.1 : rawRefM3`.
       - Batas kuota rasio berat (`maxAllowedWeight = refM3 * rasio`) untuk tagihan laut di bawah 0.1 m³ kini menggunakan dasar minimum $0.1\text{ m}^3$ (misal: $0.1 \times 300 = 30\text{ kg}$).
    3. **Pencocokan Audit Fisik Fleksibel (`useBillingValidation.ts`)**:
       - Menyesuaikan `seaPrimaryMatch` dan `seaMarkingMatch` agar mencocokkan `c.rawVal` (nilai riil gudang) ATAU `c.val` (nilai setelah aturan min 0.1), sehingga invoice tetap berstatus `MATCH` (Cocok) baik ketika menagihkan volume riil maupun ketika menagihkan tarif minimum 0.1 m³.
    4. **Indikator Visual & Penjelasan UI**:
       - Pada `BillingValidationCard.tsx` (Card Billed Metric): Menampilkan badge/keterangan informatif `Basis KG: 0.1 m³` saat aturan minimum KG laut aktif.
       - Pada `BillingValidationCard.tsx` (Card Batas Kuota Rasio): Menampilkan rumus `{refM3} m³ × {rasio} kg (Min 0.1)`.
       - Pada `OverweightAuditTab.tsx`: Menampilkan `Basis: {refM3} m³ (Min 0.1 · Real: {billedM3} m³)`.
  - **Verifikasi**:
    - `bun run build` frontend lulus 100% tanpa galat (1,173 modul tertransformasi, exit code 0).
    - Dokumentasi `frontend-app.md` (Seksi 3.6.D) telah disinkronkan.


- [x] **Implementasi Infinite Scroll & Optimasi Performa Backend Riwayat Tagihan Customer** ([CustomerBillingHistoryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustomerBillingHistoryModal.tsx), [useCustomerHistoryData.ts](file:///c:/shipping/frontend/src/features/billing/components/customer-history/useCustomerHistoryData.ts), [CustomerHistoryInvoiceTable.tsx](file:///c:/shipping/frontend/src/features/billing/components/customer-history/CustomerHistoryInvoiceTable.tsx), [CustomerHistoryDetailTable.tsx](file:///c:/shipping/frontend/src/features/billing/components/customer-history/CustomerHistoryDetailTable.tsx), [billing.types.ts](file:///c:/shipping/frontend/src/features/billing/types/billing.types.ts), [customer-billing-history.service.ts](file:///c:/shipping/backend/src/modules/billing/customer-billing-history.service.ts), [billing.routes.ts](file:///c:/shipping/backend/src/modules/billing/billing.routes.ts), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Kebutuhan & Perintah Pengguna**:
    - *"Riwayat Tagihan Customer -> perbaiki jangan pakai pagination, buat infity scroll optimalkan backendnya"*
  - **Tindakan Optimasi Backend (`customer-billing-history.service.ts` & `billing.routes.ts`)**:
    1. **Paging SQL Server Cepat**: Menerapkan pagination `OFFSET ... ROWS FETCH NEXT 30 ROWS ONLY` berurutan tanggal invoice terbaru (`fdInvDate DESC, fdInvNo DESC`), mengeliminasi query 500+ invoice dan ribuan baris rincian yang berat dalam satu eksekusi.
    2. **Pushdown Filter Langsung ke SQL**: Seluruh filter (status bayar: lunas, partial, overdue, unpaid, issued, draft; status selisih: diff, same; tipe komoditas string/angka; moda; pencarian) kini dieksekusi langsung di level SQL `WHERE` / `OUTER APPLY` alih-alih filter lambat di memori JavaScript.
    3. **Batch Rincian Item Ringan**: Query perbandingan revisi (`tbBillingDetail` vs `tbBillingDetailPrev`) kini hanya mengambil rincian untuk 30 faktur per batch halaman (bukan 500 faktur sekaligus).
    4. **Agregasi Ringkasan & Filter Options Paralel**: Pada pemuatan awal (`page=1`), data master customer, ringkasan agregasi cepat, opsi cabang, tipe komoditas, dan tahun tersedia dieksekusi serentak via `Promise.all`. Pada `page > 1`, kueri metadata dilewati untuk efisiensi maksimum.
  - **Tindakan Implementasi Infinite Scroll Frontend**:
    1. **Migrasi ke `useInfiniteQuery` (`useCustomerHistoryData.ts`)**: Menggantikan `useQuery` statis dengan `useInfiniteQuery` (@tanstack/react-query), mengelola akumulasi batch halaman, dan mendebounce search query sebesar 300ms.
    2. **Deteksi Scroll Otomatis (`IntersectionObserver`)**:
       - Pada `CustomerHistoryInvoiceTable.tsx` dan `CustomerHistoryDetailTable.tsx`, dipasang elemen sentinel di dasar tabel dengan `IntersectionObserver` (`rootMargin: '200px'`) serta listener cadangan `onScroll` container untuk memicu `fetchNextPage()` secara mulus sebelum pengguna mencapai batas bawah.
       - Menampilkan indikator loading halus saat data berikutnya sedang dimuat dan label konfirmasi saat seluruh data telah lengkap.
    3. **Eliminasi Komponen Pagination Tradisional (`CustomerBillingHistoryModal.tsx`)**:
       - Menghapus kontrol `<Pagination>` diskrit dari modal footer.
       - Footer menampilkan counter informatif: *"Menampilkan X dari Y invoice / rincian item"* dan status loading inline.
  - **Verifikasi**:
    - `bun run --bun tsc --noEmit` di backend: Exit code 0 (0 galat).
    - `bun run build` di frontend: Exit code 0 (0 galat, build selesai dalam 2.66 detik).
    - Dokumentasi terpadu di [frontend-app.md](file:///c:/shipping/frontend-app.md) (Seksi 3.6.H.2) telah disinkronkan.

- [x] **Penambahan Kolom Tanggal Agent & Tipe Komoditi pada Modal Riwayat Tagihan Customer** ([CustomerBillingHistoryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustomerBillingHistoryModal.tsx), [CustomerHistoryInvoiceTable.tsx](file:///c:/shipping/frontend/src/features/billing/components/customer-history/CustomerHistoryInvoiceTable.tsx), [CustomerHistoryDetailTable.tsx](file:///c:/shipping/frontend/src/features/billing/components/customer-history/CustomerHistoryDetailTable.tsx), [types.ts](file:///c:/shipping/frontend/src/features/billing/components/customer-history/types.ts), [useCustomerHistoryData.ts](file:///c:/shipping/frontend/src/features/billing/components/customer-history/useCustomerHistoryData.ts), [DetailPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/DetailPage.tsx), [ValidationDetailPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/ValidationDetailPage.tsx), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Akar Masalah & Kebutuhan Pengguna**:
    - Pengguna meminta: *"tambahkan tanggal agent dan tipe comodity"* pada `CustomerBillingHistoryModal.tsx`.
    - Sebelumnya, modal ini belum menampilkan tanggal agen (`fdTglAgent`) dan tipe komoditas (`fdTypeComodityName`) di tabel rincian maupun tabel invoice secara terpisah.
  - **Tindakan Perbaikan & Solusi**:
    1. **Tabel Histori Invoice (`CustomerHistoryInvoiceTable.tsx`)**:
       - Menambahkan kolom **Tgl Agent** (format tanggal baku) tepat di sebelah Tgl Invoice.
       - Memisahkan kolom **Tipe Komoditi** (badge pill semantik) dengan **Deskripsi Barang / Komoditas**.
       - Menambahkan kolom **Tipe Komoditi** pada sub-tabel rincian muatan (saat baris di-expand) dan memperbarui `colSpan` menjadi `13`.
       - Membersihkan nama item dan deskripsi menggunakan `cleanFoxProString`.
    2. **Tabel Rincian Item Trace (`CustomerHistoryDetailTable.tsx`)**:
       - Menambahkan kolom **Tgl Agent** (format tanggal baku) tepat di sebelah Tgl Invoice.
       - Menambahkan kolom **Tipe Komoditi** tepat di sebelah Listcode (sebelum Nama Item/Deskripsi).
       - Membersihkan teks deskripsi barang menggunakan `cleanFoxProString`.
    3. **Header Modal & Integrasi Context (`CustomerBillingHistoryModal.tsx`)**:
       - Menambahkan prop `tglAgent` dan `typeComodity` pada `CustomerBillingHistoryModalProps`.
       - Menampilkan ringkasan Tgl Agent dan Tipe Komoditi invoice aktif pada subtitle header dengan pill filter interaktif.
       - Meneruskan prop `tglAgent` dan `typeComodity` dari [DetailPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/DetailPage.tsx) dan [ValidationDetailPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/ValidationDetailPage.tsx).
    4. **Hook & Toolbar (`useCustomerHistoryData.ts` & `CustomerHistoryToolbar.tsx`)**:
       - Memperbarui search matching agar mencakup `tglAgent`.
       - Menyesuaikan label opsi dropdown menjadi `Semua Tipe Komoditas`.
    5. **Verifikasi Build & Dokumentasi**:
       - `bun run build` sukses 100% tanpa galat (1,171 modul tertransformasi, exit code 0).
       - Dokumentasi [frontend-app.md](file:///c:/shipping/frontend-app.md) pada seksi modal 2 telah disinkronkan.

- [x] **Standarisasi Menyeluruh `displayCustName` & Sanitasi Karakter FoxPro (`^` -> `'`) di Seluruh Frontend** ([utils.ts](file:///c:/shipping/frontend/src/lib/utils.ts), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Akar Masalah & Kebutuhan Pengguna**:
    - Pengguna meminta: *"pakai displayCustName setiap menampilkan data fdCustName"* serta normalisasi karakter `^` menjadi petik tunggal `'` (karena pada sistem warisan FoxPro petik tunggal diescape menjadi `^` seperti `"MULTI TOY^S"` untuk mencegah SQL injection).
  - **Solusi & Implementasi**:
    1. **Helper Terpusat (`src/lib/utils.ts`)**:
       - `cleanFoxProString(str)`: Mengganti semua karakter `^` menjadi `'` (`str.replace(/\^/g, "'")`).
       - `displayCustName(input, fallback = '—')`: Menerima input `string` (`row.fdCustName`) maupun objek `{ fdCustName, fdCustCode }`, membersihkan tanda `^` menjadi `'`, dan melakukan fallback cerdas ke `fdCustCode` atau teks fallback jika nama kosong.
    2. **Refactoring Menyeluruh di Seluruh Modul Frontend**:
       - **Billing Domain**: [DetailPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/DetailPage.tsx), [ListPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/ListPage.tsx), [ValidationListPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/ValidationListPage.tsx), [ValidationDetailPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/ValidationDetailPage.tsx), [BillingValidationCard.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationCard.tsx), [BillingValidationSummaryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationSummaryModal.tsx), [ValidationSummaryHeader.tsx](file:///c:/shipping/frontend/src/features/billing/components/validation-summary/ValidationSummaryHeader.tsx), [FinancialAuditTab.tsx](file:///c:/shipping/frontend/src/features/billing/components/validation-summary/FinancialAuditTab.tsx), [PriceListDetailModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/PriceListDetailModal.tsx), [CustomerBillingHistoryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustomerBillingHistoryModal.tsx), [PrintPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/PrintPage.tsx).
       - **Customers Domain**: [CustomerTableView.tsx](file:///c:/shipping/frontend/src/features/customers/components/CustomerTableView.tsx), [CustomerGridView.tsx](file:///c:/shipping/frontend/src/features/customers/components/CustomerGridView.tsx), [CustomerMobileCard.tsx](file:///c:/shipping/frontend/src/features/customers/components/CustomerMobileCard.tsx), [CustomerDetailModal.tsx](file:///c:/shipping/frontend/src/features/customers/components/CustomerDetailModal.tsx).
       - **Shipments Domain**: [ShipmentTableView.tsx](file:///c:/shipping/frontend/src/features/shipments/components/ShipmentTableView.tsx), [ShipmentGridView.tsx](file:///c:/shipping/frontend/src/features/shipments/components/ShipmentGridView.tsx), [ShipmentMobileCard.tsx](file:///c:/shipping/frontend/src/features/shipments/components/ShipmentMobileCard.tsx), [ShipmentDetailModal.tsx](file:///c:/shipping/frontend/src/features/shipments/components/ShipmentDetailModal.tsx).
       - **Shipment Batches Domain**: [ManifestList.tsx](file:///c:/shipping/frontend/src/features/shipment-batches/components/ManifestList.tsx).
       - **Delivery Orders Domain**: [DeliveryOrderTable.tsx](file:///c:/shipping/frontend/src/features/delivery-orders/components/DeliveryOrderTable.tsx), [DeliveryOrderDetails.tsx](file:///c:/shipping/frontend/src/features/delivery-orders/components/DeliveryOrderDetails.tsx), [BatchRow.tsx](file:///c:/shipping/frontend/src/features/delivery-orders/components/BatchRow.tsx), [DetailPage.tsx](file:///c:/shipping/frontend/src/features/delivery-orders/pages/DetailPage.tsx).
       - **Price List Domain**: [EntryLookupTab.tsx](file:///c:/shipping/frontend/src/features/price-list/components/EntryLookupTab.tsx), [useEntryLookup.tsx](file:///c:/shipping/frontend/src/features/price-list/hooks/useEntryLookup.tsx).
       - **Customer Price List Domain**: [UploadPage.tsx](file:///c:/shipping/frontend/src/features/customer-price-list/pages/UploadPage.tsx), [useCustomerPriceHistory.ts](file:///c:/shipping/frontend/src/features/customer-price-list/hooks/useCustomerPriceHistory.ts).
       - **Dashboard Domain**: [DashboardPage.tsx](file:///c:/shipping/frontend/src/features/dashboard/pages/DashboardPage.tsx).
    3. **Verifikasi Build**:
       - `bun run build` sukses 100% tanpa galat (1,171 modul tertransformasi, exit code 0).
    4. **Dokumentasi Terpadu**:
       - Telah disinkronkan ke [frontend-app.md](file:///c:/shipping/frontend-app.md) pada seksi 5.7.

- [x] **Implementasi & Pemolesan Menyeluruh Fitur Upload Avatar dan Ganti Kata Sandi** ([AvatarUpload.tsx](file:///c:/shipping/frontend/src/features/profile/components/AvatarUpload.tsx), [ChangePasswordForm.tsx](file:///c:/shipping/frontend/src/features/profile/components/ChangePasswordForm.tsx), [ProfileInfoForm.tsx](file:///c:/shipping/frontend/src/features/profile/components/ProfileInfoForm.tsx), [AccountPage.tsx](file:///c:/shipping/frontend/src/features/profile/pages/AccountPage.tsx), [Sidebar.tsx](file:///c:/shipping/frontend/src/components/layout/Sidebar.tsx), [UserTable.tsx](file:///c:/shipping/frontend/src/features/user-management/components/UserTable.tsx), [users.service.ts](file:///c:/shipping/backend/src/modules/users/users.service.ts), [userManagement.types.ts](file:///c:/shipping/frontend/src/features/user-management/types/userManagement.types.ts), [id.json](file:///c:/shipping/frontend/src/lib/i18n/id.json), [en.json](file:///c:/shipping/frontend/src/lib/i18n/en.json), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Akar Masalah & Kebutuhan Pengguna**:
    - Pengguna membutuhkan fitur untuk mengunggah foto profil avatar dan mengganti kata sandi secara mandiri di web frontend.
    - Sebelumnya, modul profil belum memiliki translasi i18n (`profile.*` dan `theme.*` sama sekali tidak ada di `id.json` & `en.json`), sehingga judul halaman, tab, dan label formulir tampil sebagai raw string translation key.
    - Pada bilah navigasi utama (`Sidebar.tsx`), rute `ROUTES.PROFILE` belum tersedia di menu sehingga pengguna kesulitan menemukan halaman pengaturan akun.
    - Komponen `AvatarUpload` sebelumnya menggunakan `window.confirm` bawaan browser dan styling tombol mentah yang melanggar aturan Dark Mode (Midnight).
    - Halaman `AccountPage` menggunakan fullscreen spinner bulat saat initial loading alih-alih skeleton shimmer.
    - Tabel user management (`UserTable.tsx`) belum menampilkan foto avatar pengguna.
  - **Tindakan Perbaikan & Solusi**:
    1. **Translasi Bilingual Lengkap (`id.json` & `en.json`)**:
       - Menambahkan seluruh key `nav.profile`, `profile.*` (avatar upload, password validation, error messages, toast status), dan `theme.*` di kedua kamus bahasa secara berpasangan.
    2. **Aksesibilitas Menu Sidebar (`Sidebar.tsx`)**:
       - Menambahkan navigasi menu "Profil & Keamanan" (`ROUTES.PROFILE`) di bawah modul `overview` dengan ikon `User`.
       - Memastikan `hasPermission` selalu mengizinkan akses ke rute profil untuk seluruh pengguna terautentikasi (admin maupun staf biasa).
    3. **Refactor Komponen Avatar Upload (`AvatarUpload.tsx`)**:
       - Mengganti `window.confirm` dengan komponen resmi `<ConfirmModal>`.
       - Menggunakan komponen `<Button>` dengan varian `primary` dan `danger`.
       - Mengintegrasikan pratinjau instan (*instant preview*), validasi ukuran (maks. 3MB), validasi tipe MIME (JPEG, PNG, WEBP, GIF), serta penanganan error fallback inisial nama.
       - Sinkronisasi instan ke state global `useAuthStore` dan cache React Query sehingga avatar di Topbar dan User Table langsung terupdate otomatis.
    4. **Formulir Ganti Sandi Ergonomis (`ChangePasswordForm.tsx`)**:
       - Menggunakan komponen `<Button>` untuk aksi submit.
       - Menambahkan verifikasi kata sandi saat ini, batas minimal 6 karakter, tombol intip sandi (*eye toggle*), dan indikator visual kecocokan (*real-time match validation*).
       - Reset otomatis seluruh input formulir setelah pergantian sandi berhasil.
    5. **Pembaruan Form Profil & Loading Shimmer (`ProfileInfoForm.tsx` & `AccountPage.tsx`)**:
       - Menggunakan `<Button>` pada `ProfileInfoForm.tsx`.
       - Membuat komponen `AccountPageSkeleton` dengan kelas animasi `.skeleton-shimmer` wireframe menggantikan spinner bulat.
    6. **Integrasi Avatar di User Table (`UserTable.tsx` & `users.service.ts`)**:
       - Menambahkan `avatarUrl: true` pada query Prisma `getAllUsers` dan `getTrashedUsers` di backend.
       - Memperbarui interface `User` di `userManagement.types.ts`.
       - Menampilkan foto avatar di baris tabel pengguna dengan fallback inisial nama.
    7. **Verifikasi Build & Reload**:
       - `bun run build` frontend lulus 100% tanpa error TypeScript/Vite (2.35s).
       - PM2 backend `ShippingApi` direstart dan online.
       - Dokumentasi `frontend-app.md` disinkronkan mencakup modul profil dan 5 endpoint REST API terkait.
- [x] **Pencegahan Text-Wrapping Kolom Tarif & Angka Audit Modal Validasi Invoice** ([FinancialAuditTab.tsx](file:///c:/shipping/frontend/src/features/billing/components/validation-summary/FinancialAuditTab.tsx), [StatusBadge.tsx](file:///c:/shipping/frontend/src/components/ui/StatusBadge.tsx), [BillingValidationSummaryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationSummaryModal.tsx), [ValidationSummaryTabsBar.tsx](file:///c:/shipping/frontend/src/features/billing/components/validation-summary/ValidationSummaryTabsBar.tsx), [FreightAuditTab.tsx](file:///c:/shipping/frontend/src/features/billing/components/validation-summary/FreightAuditTab.tsx), [frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - **Akar Masalah & Kebutuhan Pengguna**:
    1. Pengguna meminta tag status validasi semantik pada setiap tab di dalam `BillingValidationSummaryModal` seperti pada versi sebelumnya.
    2. Tampilan modal terlalu lebar dan tinggi modal berubah-ubah (jumping) saat berpindah tab.
    3. Pada tabel audit finansial/tarif (`FinancialAuditTab.tsx`), format nilai nominal mata uang `formatCurrency(val)` menghasilkan teks berspasi (`"Rp. 10,000,000.00"`, `"+Rp. 1,000,000.00"`). Browser table layout engine memecah (*wrap*) teks tersebut menjadi dua baris (`"Rp."` di baris atas dan `"10,000,000.00"` di baris bawah), serta membungkus string `"(CS)"` di bawah nominal acuan.
  - **Tindakan Perbaikan**:
    1. **Pencegahan Text-Wrapping Tarif & Angka**:
       - Menambahkan `whitespace-nowrap` secara merata pada header kolom `<th>` dan sel data `<td>` (No, Qty, Tarif Tagihan, Tarif Acuan, Selisih, Status Audit, Sumber Acuan).
       - Menetapkan lebar minimum kolom yang presisi (`min-w-[125px]` untuk Tarif Tagihan & Tarif Acuan, `min-w-[120px]` untuk Selisih, `min-w-[130px]` untuk Sumber Acuan, `min-w-[200px]` untuk Item Tagihan) dengan `overflow-x-auto rounded-xl` agar angka tidak pernah patah dan tabel dapat bergulir horizontal secara halus jika resolusi layar sempit.
       - Menambahkan `whitespace-nowrap` pada `<span>` selisih dan elemen root `<StatusBadge>`.
    2. **Tag Status Validasi Semantik Tiap Tab**:
       - Mengembalikan tag status badge semantik di masing-masing tab pada `ValidationSummaryTabsBar.tsx`:
         - **Item Tagihan & Tarif**: `✓ Valid` (hijau/emerald) jika tarif valid, atau `Cek Tarif` (kuning/amber) jika ada disparitas tarif.
         - **Timbangan Fisik / Validasi M3**: `✓ Sesuai` (hijau/emerald) jika dimensi/berat cocok, atau `Selisih` (merah/rose) jika terdapat perbedaan fisik.
         - **Overweight** (khusus laut): `✓ Aman` (hijau/emerald) jika dalam batas rasio, atau `Perlu Cek` (kuning/amber) jika terdapat kelebihan muatan.
         - **Freight Charge**: `{totalFc} {currency}` (kuning/amber) jika terdapat biaya FC valas di EntryList, atau `Nihil` (abu-abu/secondary) jika 0.
         - **Transport & Ekspedisi**: `✓ Sesuai` (hijau/emerald) jika transport sudah tercatat, atau `Perlu Tagih` (kuning/amber) jika ada biaya ekspedisi di `tbExpIndo` yang belum ditagihkan.
       - Menerapkan styling aktif yang ramah tema Midnight Dark Mode (`bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)]`) sesuai standar `AGENTS.md`.
    3. **Integrasi Tab Freight Charge (`FreightAuditTab.tsx`)**:
       - Menampilkan ringkasan valas total FC dan jumlah list batch ketika tab `Freight Charge` diklik.
    4. **Optimalisasi Desain Kompak & Tinggi Statis ERP**:
       - Mengubah dimensi modal menjadi `size="2xl" className="h-[85vh] max-h-[85vh] flex flex-col"` (`max-w-6xl` / 1152px dengan tinggi statis `85vh` dan `Modal.Body` `flex-1 min-h-0 overflow-y-auto` agar modal kokoh dan tidak naik-turun/berkedip saat berpindah antar-tab).
       - Mengetatkan padding header (`px-3.5 sm:px-4 py-2 sm:py-2.5`), tab bar (`px-3.5 sm:px-4 py-1.5`), tombol tab (`px-2.5 py-1 text-[11.5px]`), body (`p-3.5 sm:p-4`), dan footer (`px-3.5 sm:px-4 py-2.5`).
    5. **Proporsi & Ergonomi Tombol Footer (`ValidationSummaryFooter.tsx`)**:
       - Mengganti styling tombol custom yang sempat menghasilkan tampilan kapsul/pill tipis (`h-8.5` tidak valid di Tailwind + radius berlebih) dengan pustaka komponen UI terpusat `<Button>`:
         - **Terbitkan Invoice**: `<Button variant="primary" size="sm">` dengan aksen emerald (`bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-1.5`) berpadu ikon `<Send size={13} />`.
         - **Tutup**: `<Button variant="secondary" size="sm">` (`px-4 py-1.5 min-w-[76px] font-semibold text-xs`) dengan border dan background bertema dinamis.
         - Menggunakan sudut sudut persegi melengkung standar ERP (`rounded-[var(--radius-md)]` 6px) yang identik dengan tombol print di header, mengeliminasi bentuk pill/kapsul lonjong.
         - Menyesuaikan padding footer (`px-4 py-3 gap-3`) agar jarak tombol dari kartu verdict proporsional dan tidak menempel rapat.
         - Mengisolasi penutupan modal saat `handleIssueClick` dieksekusi agar `IssueInvoiceModal` terbuka tanpa tumpang tindih (*modal stacking collision*).
    6. **Dokumentasi & Verifikasi Build**:
       - Memperbarui `frontend-app.md` pada seksi 3.6.H.
       - Menjalankan pengujian `bun run build` pada direktori `frontend/`: Lulus 100% (1,171 modul tertransformasi, 0 error dalam 2.44s).


- [x] **Perbaikan Unduh Langsung APK Tanpa Login & Penambahan Landing Page Publik** ([web.config](file:///c:/shipping/frontend/dist/web.config), [index.html](file:///c:/shipping/frontend/public/download/index.html)):
  - **Akar Masalah Mengapa Harus Login Sebelumnya**:
    1. Ekstensi `.apk` belum terdaftar dalam pemetaan MIME type IIS (`application/vnd.android.package-archive`).
    2. Akibat ketiadaan MIME type, IIS menolak melayani berkas `.apk` secara statis (`HTTP Error 404.3 - Not Found`).
    3. Error 404 tersebut memicu aturan *URL Rewrite* (`SPA Fallback`) yang meneruskan URL `/mshipping/mshipping.apk` ke `index.html` (React Single Page Application).
    4. React Router yang menerima path tersebut mendeteksi rute di luar rute publik, lalu `ProtectedRoute` secara otomatis mengalihkan (redirect) pengguna ke layar login web (`/mshipping/login`).
  - **Tindakan Perbaikan**:
    1. Menambahkan pemetaan MIME type `.apk` (`application/vnd.android.package-archive`) di IIS secara global (`appcmd.exe`) serta pada `web.config` di `frontend/public/` dan `frontend/dist/`.
    2. Menyinkronkan file fisik `mshipping.apk` (121.0 MB) ke `frontend/dist/` dan `frontend/public/`.
    3. Membuat halaman landing page unduh publik mandiri di `frontend/public/download/index.html` dan `frontend/dist/download/index.html` yang dilengkapi QR Code scanner dan tombol unduh langsung tanpa login.
  - **Hasil Verifikasi**:
    - `curl -I http://36.93.22.142/mshipping/mshipping.apk` mengembalikan **`HTTP/1.1 200 OK`** dengan `Content-Type: application/vnd.android.package-archive` dan `Content-Length: 126898045` (121 MB). Langsung mengunduh berkas APK di browser tanpa perlu login sama sekali.
    - `http://36.93.22.142/mshipping/download/` mengembalikan halaman unduh publik QR Code (HTTP 200 OK).

- [x] Ringkasan Metrik Manifest Batch Marking & Penambahan Informasi Komoditas Mobile App ([logistics.tsx](file:///c:/shipping/mobile/app/%28tabs%29/logistics.tsx), [app-version.json](file:///c:/shipping/backend/src/config/app-version.json), [mobile-app.md](file:///c:/shipping/mobile-app.md)):
  - **Aturan Operasional Baru pada `AGENTS.md`**:
    - Menambahkan poin 4 pada daftar **⚡ WAJIB** di header `AGENTS.md`: *"Setiap ada update / perubahan pada Frontend Web (`frontend/`) → WAJIB UPDATE `frontend-app.md` agar arsitektur, hierarki komponen, modul, dan endpoint selalu sinkron dengan kondisi aktual kode."*
    - Menambahkan bab baru `## 💻 Standar Operasional & Sinkronisasi Dokumentasi Web Frontend (frontend/ & frontend-app.md)` yang merinci apa saja yang wajib disinkronkan ke `frontend-app.md` (komponen UI baru, dekomposisi submodul, tipe data SSOT, matriks endpoint API baru) serta syarat lolos uji `bun run build` (0 error).
  - **Pembaruan Menyeluruh `frontend-app.md`**:
    - Menambahkan seksi `3.6.H. Arsitektur Komponen Modal Kompleks (Dekomposisi Subkomponen & SSOT Types)` yang merinci pemecahan 3 modal raksasa (`CustMarkingDetailModal`, `CustomerBillingHistoryModal`, `BillingValidationSummaryModal`) menjadi 20 modul subkomponen terisolasi (<250 baris).
    - Mendokumentasikan sentralisasi interface Single Source of Truth pada `src/features/billing/types/billing.types.ts`.
    - Menambahkan tabel pustaka komponen UI primitif terpusat di seksi 5.3 (`<Modal>`, `<StatCard>`, `<StatusBadge>`, `<ConfirmModal>`, `<Table>`, `<Pagination>`, `<SearchBar>`, `<Button>`, `<EmptyState>`, `<PageHeader>`).
    - Menambahkan pengecualian `!/frontend-app.md` pada `.gitignore` agar file dokumentasi terlacak secara resmi di Git bersama `README.md` dan `mobile-app.md`.

- [x] Ringkasan Metrik Manifest Batch Marking & Penambahan Informasi Komoditas Mobile App ([logistics.tsx](file:///c:/shipping/mobile/app/%28tabs%29/logistics.tsx), [app-version.json](file:///c:/shipping/backend/src/config/app-version.json), [mobile-app.md](file:///c:/shipping/mobile-app.md)):
  - **Kebutuhan Pengguna**:
    1. Membuat summary total dari `fdJmlPack`, `fdJmlBerat`, `fdM3`, dan count jumlah customer pada manifest batch marking.
    2. Menambahkan informasi `fdComodity` pada setiap baris data kartu manifest.
    3. Mempertahankan versi yang sama (`v1.0.5`, versionCode `6`) dan bukan force update (`forceUpdate: false`).
  - **Pembaruan Mobile App (`mobile/app/(tabs)/logistics.tsx`)**:
    - Menghitung agregasi manifest secara efisien via `useMemo` (`manifestSummary`):
      - `totalPack`: Akumulasi seluruh nilai `fdJmlPack`.
      - `totalBerat`: Akumulasi seluruh nilai `fdJmlBerat` (kg).
      - `totalM3`: Akumulasi kubikasi `fdM3` (m³).
      - `totalCustomer`: Perhitungan pelanggan unik menggunakan `Set<string>` dari `fdCustName`.
      - `totalResi`: Total kuantitas resi yang tergabung dalam batch.
    - Menampilkan panel ringkasan 4 kartu KPI (2x2 grid) berdesain minimalis tanpa ikon dengan outline border semantik (`border-[var(--color-border)]`) dan angka tebal berformat `tabular-nums` yang adaptif terhadap seluruh ukuran layar (`adjustsFontSizeToFit`).
    - Menambahkan baris informasi komoditas (`fdComodity?.trim() || fdComodityName?.trim() || '—'`) dengan label tegas dan warna teks aksen brand tersier (`colors.tertiary`) di antara nama customer dan rincian fisik paket.
  - **Pembaruan Konfigurasi Versi Backend (`backend/src/config/app-version.json`)**:
    - Mengubah `"forceUpdate": false` sesuai instruksi agar tidak memunculkan dialog pembaruan paksa bagi pengguna yang sudah berada di versi 1.0.5.
    - Mempertahankan `"version": "1.0.5"` dan `"versionCode": 6`.
  - **Ekspor Bundle, Injeksi & Penandatanganan APK**:
    - Mengekspor bundle Metro Android (`entry-5cb19d5dbd78ed112c6db4dfe926c7e7.hbc`, 5.3 MB).
    - Menginjeksikan bundle ke `mshipping.apk` dan membersihkan signature usang menggunakan skrip python `replace_bundle.py`.
    - Menandatangani ulang APK dengan sertifikat resmi `release.keystore` (SHA256withRSA, dual-scheme v2 + v3, 4096-byte zipalign verified, 0 errors) via `uber-apk-signer.jar`.
    - Menyinkronkan APK terbaru (`126.898.045 bytes`) ke:
      - `c:\shipping\mshipping.apk`
      - `c:\shipping\frontend\dist\mshipping.apk`
      - `c:\shipping\backend\public\uploads\mshipping.apk`
    - Memuat ulang proses PM2 `ShippingApi` dan memverifikasi ketersediaan endpoint unduhan publik (HTTP 200 OK).
  - **Pembaruan Dokumentasi**:
    - Menyelaraskan rincian manifest batch dan struktur 4-metric KPI grid pada `mobile-app.md` seksi 3.5.

- [x] **Audit Codebase, Refaktorisasi Spaghetti Code, Penerapan Single Source of Truth (SSOT) & Reusable UI Primitives** ([walkthrough.md](file:///C:/Users/Administrator/.gemini/antigravity/brain/6b5dbd7d-f099-4d72-8be0-b40619d1e17e/walkthrough.md)):
  - **1. Pembuatan Komponen UI Primitif Terpusat (`frontend/src/components/ui/`)**:
    - [`Modal.tsx`](file:///c:/shipping/frontend/src/components/ui/Modal.tsx): Komponen modal universal berbasis React Portal dengan keyboard ESC handler, body scroll lock, standar ukuran (`sm`, `md`, `lg`, `xl`, `full`), compound pattern (`Modal.Header`, `Modal.Body`, `Modal.Footer`), dan ramah Midnight Dark Mode.
    - [`StatCard.tsx`](file:///c:/shipping/frontend/src/components/ui/StatCard.tsx): Kartu KPI universal dengan visual ratio bar tipis, tren MoM, sub-line kontekstual, dan styling semantik tanpa warna blok neon.
    - [`StatusBadge.tsx`](file:///c:/shipping/frontend/src/components/ui/StatusBadge.tsx): Badge status terpadu untuk domain billing, validasi audit, delivery order, dan customer tier dengan outline border tematik.
    - [`ConfirmModal.tsx`](file:///c:/shipping/frontend/src/components/ui/ConfirmModal.tsx): Direfaktor untuk menggunakan fondasi `Modal.tsx`.
  - **2. Dekonstruksi "God Components" (Spaghetti Code >2.000 Baris) Menjadi Subkomponen Modular**:
    - **`CustMarkingDetailModal.tsx`** (*turun dari 2.003 baris $\to$ 144 baris*):
      - Dipecah menjadi folder `cust-marking-detail/`:
        - `types.ts`: Interface dan tipe lokal.
        - `useCustMarkingData.ts`: Hook data fetching, caching, dan tab calculations.
        - `CustMarkingHeaderToolbar.tsx`: Header modal, tabs, date filter, search bar.
        - `CustMarkingSummaryBanner.tsx`: Ringkasan metrik marking, koli, berat, m3.
        - `CustMarkingDataTable.tsx`: Tabel data transaksi marking responsif.
        - `custMarkingExcel.ts`: Utilitas ekspor Excel terisolasi.
    - **`CustomerBillingHistoryModal.tsx`** (*turun dari 2.381 baris $\to$ 135 baris*):
      - Dipecah menjadi folder `customer-history/`:
        - `types.ts`: Tipe data history invoice dan detail.
        - `useCustomerHistoryData.ts`: Hook data pagination dan summary KPI.
        - `CustomerHistoryToolbar.tsx`: Filter tahun, search bar, trigger refresh.
        - `CustomerHistoryKpiCards.tsx`: 4 kartu metrik performa pelanggan.
        - `CustomerHistoryInvoiceTable.tsx`: Tabel riwayat invoice tagihan.
        - `CustomerHistoryDetailTable.tsx`: Tabel rincian muatan per resi/kontainer.
    - **`BillingValidationSummaryModal.tsx`** (*turun dari 2.364 baris $\to$ 309 baris*):
      - Dipecah menjadi folder `validation-summary/`:
        - `types.ts`: Tipe data tab validasi dan audit.
        - `ValidationSummaryHeader.tsx`: Header ringkasan audit.
        - `ValidationSummaryTabsBar.tsx`: Navigasi tab status audit (Financial, Physical, Overweight, Transport).
        - `FinancialAuditTab.tsx`: Panel audit tarif & komparasi ideal vs aktual.
        - `PhysicalAuditTab.tsx`: Panel audit M3 vs KG & single/gabungan.
        - `OverweightAuditTab.tsx`: Panel audit batas toleransi tonase armada.
        - `TransportAuditTabContent.tsx`: Panel audit moda & rute pengiriman.
        - `ValidationSummaryFooter.tsx`: Footer aksi persetujuan & ekspor.
  - **3. Penyelarasan Single Source of Truth (SSOT)**:
    - **Frontend Types**: Memindahkan tipe yang sebelumnya bocor (*leaked types*) di dalam JSX (`M3CheckResponse`, `MarkingDetailItem`, `PriceItem`, `FlatDetailTraceItem`, dll) ke [`billing.types.ts`](file:///c:/shipping/frontend/src/features/billing/types/billing.types.ts).
    - **Cross-Module Components**: Menyelaraskan `StatusPill.tsx` di `delivery-orders` dan `StatusBadge.tsx` di `billing` agar mendelegasikan styling ke komponen primitif `src/components/ui/StatusBadge.tsx`.
    - **Backend Master Customer Resolver**: Membuat [`customer-resolver.service.ts`](file:///c:/shipping/backend/src/modules/customers/customer-resolver.service.ts) untuk menjamin nama pelanggan selalu merujuk pada master `tbCustomers.fdCustName` (Single Source of Truth) dan menimpa nama dari tabel denormalisasi warisan.
    - **Backend Logging Sanitization**: Mengganti panggilan `console.error` yang melanggar aturan arsitektur di `customer-tariff-audit.service.ts` dengan `logger.error` dari `@/config/logger`.
    - **Backend Resiliency & Typecheck Safety**: Memperbaiki safe indexed access pada `pairing-local-charge.service.ts`, `customer-price-list.service.ts`, dan `customers.service.ts`. Mengisolasi direktori `scratch/` pada `backend/tsconfig.json`.
  - **4. Hasil & Verifikasi Build**:
    - `bun run tsc --noEmit` di `backend/`: **Lulus 100% (0 errors)**.
    - `bun run build` di `frontend/`: **Lulus 100% (1170 modules transformed, 0 errors, build in 3.23s)**.

- [x] Pembuatan Dokumentasi Lengkap Aplikasi Web Frontend ([frontend-app.md](file:///c:/shipping/frontend-app.md)):
  - Menyusun dokumen komprehensif sistem frontend web (`frontend-app.md`) setara dengan `mobile-app.md`.
  - Merinci arsitektur teknis (React 19, TypeScript, Vite, Tailwind CSS, Zustand, React Query, Axios interceptor, i18n dual-language).
  - Menguraikan struktur routing dan sistem hak akses bertingkat (`ProtectedRoute`, `PermissionGuard`, `AdminGuard`, `DefaultRouteRedirect`).
  - Menjelaskan seluruh modul dan halaman secara mendalam: Autentikasi, Overview Dashboard, Logistik (Shipments, Shipment Batches, Delivery Orders), Keuangan (Billing Dashboard, Target Tagihan, Invoice List & Detail, Audit Validasi M3 vs KG & Overweight, Pairing Local Charge, Report Designer, Print View), Master Tarif (Price List Umum & Khusus Pelanggan dengan Diff Engine dan Special Commodity Items), Commodity Mapping, Master Customer, Administrasi Pengguna & Role, serta Profil Akun.
  - Menyusun tabel matriks 65 endpoint API backend yang dikonsumsi oleh frontend beserta HTTP Method, parameter/payload, dan data keluarannya.
  - Merinci token CSS 5 tema (Heritage, Ocean, Emerald, Amber, Midnight), aturan desain mode gelap, skala tipografi ERP, skeleton shimmer, dan panduan konfigurasi reverse proxy Nginx.

- [x] Rilis Mobile App v1.0.5 (Force Update) — Perbaikan Tab Bar Bertumpuk Tombol Navigasi Android & Posisi Safe Area Toast Notification ([version.ts](file:///c:/shipping/mobile/src/config/version.ts), [app-version.json](file:///c:/shipping/backend/src/config/app-version.json), [app.json](file:///c:/shipping/mobile/app.json), [package.json](file:///c:/shipping/mobile/package.json), [_layout.tsx](file:///c:/shipping/mobile/app/%28tabs%29/_layout.tsx), [ToastContainer.tsx](file:///c:/shipping/mobile/src/components/ui/ToastContainer.tsx), [id.json](file:///c:/shipping/mobile/src/lib/i18n/id.json), [en.json](file:///c:/shipping/mobile/src/lib/i18n/en.json)):
  - **Akar Masalah Navigasi Bawah Bertumpuk (3-Button Navigation Bar Collision)**:
    - Pada perangkat Android tertentu (seperti Xiaomi / MIUI / HyperOS, ColorOS, dsb.), `useSafeAreaInsets().bottom` mengembalikan nilai `0` meskipun tombol navigasi 3-tombol sistem (`|||`, `O`, `<`) aktif dan dirender menutupi area layar bawah.
    - Kode lama menggunakan fallback `12dp` jika `insets.bottom === 0`.
    - Karena tombol navigasi sistem Android memiliki tinggi 48dp, tombol tersebut menutupi 36dp area tab bar, menutupi separuh ikon dan memotong teks label tab.
    - Selain itu, teks label yang dihasilkan kamus warisan web (`"LOGISTIK"`, `"KEUANGAN"`, `"MASTER DATA"`) berhuruf kapital dan terlalu panjang sehingga terpotong menjadi `Dashboa...`, `KEUANG...`, `MASTER...`.
  - **Solusi Navigasi Bawah**:
    - Menerapkan `bottomInset = Platform.OS === 'android' ? Math.max(insets.bottom, 48) : Math.max(insets.bottom, 16)` dan `tabBarHeight = 52 + bottomInset` pada `mobile/app/(tabs)/_layout.tsx`. Hal ini menjamin bahwa seluruh tombol sistem Android berada di area padding bawah tanpa menyentuh atau menutupi ikon dan teks tab.
    - Menambahkan translasi khusus mobile di `id.json` & `en.json`: `tab.overview` ("Overview"), `tab.logistics` ("Logistik"), `tab.finance` ("Billing"), `tab.master` ("Master"), `tab.profile` ("Akun") berformat Title Case pendek sehingga 100% pas tanpa pernah terpotong (*zero truncation*).
  - **Akar Masalah & Solusi Toast Notification Terlalu Tinggi**:
    - `ToastContainer.tsx` sebelumnya menggunakan `SafeAreaView` bawaan `react-native` yang tidak memiliki efek di Android, serta gaya statis `top: 10`.
    - Pada perangkat ber-notch / punch hole kamera dengan status bar tinggi, posisi `top: 10` membuat toast muncul sejajar dengan jam perangkat (`7:37`) dan ikon status bar.
    - Diperbaiki dengan mengintegrasikan `useSafeAreaInsets` dan `StatusBar.currentHeight`, menghitung `topOffset = Math.max(insets.top, StatusBar.currentHeight || 0, 24) + 12`. Toast kini melayang anggun tepat di bawah status bar jam dan kamera pada seluruh model HP.
  - **Build & Deploy**:
    - Bundle Metro diekspor ulang (`entry-ab0b8cc450949f79179c2216fbf281c3.hbc`, 5.3 MB).
    - Berkas `assets/index.android.bundle` di dalam APK diganti dan ditandatangani ulang dengan `release.keystore` via `uber-apk-signer.jar`.
    - Berkas APK (`126.893.949 bytes`) disinkronkan ke seluruh jalur distribusi server.

- [x] Perbaikan Fatal Crash Mobile App v1.0.4 ([updateStore.ts](file:///c:/shipping/mobile/src/stores/updateStore.ts), [UpdateModal.tsx](file:///c:/shipping/mobile/src/components/update/UpdateModal.tsx), [package.json](file:///c:/shipping/mobile/package.json), [app.json](file:///c:/shipping/mobile/app.json), [mobile-app.md](file:///c:/shipping/mobile-app.md)):
  - **Identifikasi Penyebab Crash (Root Cause)**:
    - Modul `expo-updates` memerlukan kode native C++/Java (`ExpoUpdatesModule`) yang terdaftar di Android binary.
    - Berkas `mshipping.apk` di-compile tanpa modul native `expo-updates` di `classes.dex`.
    - Ketika `updateStore.ts` mengimpor `import * as Updates from 'expo-updates'`, berkas `node_modules/expo-updates/build/ExpoUpdates.js` memanggil `requireNativeModule('ExpoUpdates')` pada waktu evaluasi root bundle JavaScript.
    - Pemanggilan ini langsung melempar unhandled exception fatal `Cannot find native module 'ExpoUpdates'` pada level inisialisasi aplikasi sebelum komponen React mana pun dapat mount, menyebabkan aplikasi tertutup/crash seketika saat ikon ditekan.
  - **Tindakan Perbaikan**:
    - Menghapus paket `expo-updates` dan `expo-file-system` dari dependensi `mobile/package.json` (`bun remove expo-updates expo-file-system`).
    - Mengembalikan `updateStore.ts` ke mekanisme native Android yang terbukti 100% stabil (`Linking.openURL(updateInfo.downloadUrl)`).
    - Membersihkan `UpdateModal.tsx` dari komponen progress bar download yang tidak stabil.
    - Menghapus konfigurasi `updates` dan `runtimeVersion` dari `mobile/app.json`.
    - Membersihkan rute `manifest` yang tidak digunakan dari `backend/src/index.ts` dan menghapus `backend/src/modules/updates`.
  - **Build Ulang, Injeksi Bundle & Re-Sign APK**:
    - Bundle Metro diekspor ulang secara bersih: 3.305 modul, Hermes bytecode `entry-b0cc45c214a8370e4840ba888e4a9bad.hbc` (5.3 MB), terverifikasi 0 modul uncompiled.
    - Bundle diinjeksikan ke `mshipping.apk` menggunakan skrip python `replace_bundle.py`.
    - APK ditandatangani ulang dengan `release.keystore` via `uber-apk-signer.jar` (dual scheme v2 + v3, 4096-byte zipalign verified, 0 errors).
    - Berkas APK (`126.893.949 bytes`) telah disinkronkan ke seluruh jalur distribusi server (`frontend/dist`, `backend/public/uploads`, dan root).
    - PM2 `ShippingApi` direstart dan verifikasi endpoint berhasil.
  - **Kenaikan Versi & Force Update v1.0.4 (versionCode: 5)**:
    - Sesuai konfirmasi user, versi aplikasi dinaikkan menjadi `v1.0.4` dengan `versionCode: 5` dan `forceUpdate: true` di seluruh single source of truth:
      - `mobile/src/config/version.ts`
      - `backend/src/config/app-version.json`
      - `mobile/app.json`
      - `mobile/package.json`
      - `mobile-app.md`
  - **Redesign UI Bersih Bebas Ikon pada List Data & Tab**:
    - `SegmentedControl.tsx`: Menghapus rendering ikon pada tab, menggunakan tipografi kompak `11.5px font-semibold` dengan `numberOfLines={1}` dan `adjustsFontSizeToFit` sehingga label tab tidak terlipat (*zero text-wrapping*) pada layar kecil (360dp) maupun besar (412dp+).
    - `master.tsx`: Menghapus icon `<UserCheck>`, `<Phone>`, dan `<MessageCircle>` dari item list kartu customer. Tombol Telepon dan WhatsApp diubah menjadi badge tombol teks yang bersih dan proporsional.
    - `finance.tsx`: Menghapus icon `<Copy>` dari header kartu invoice list data. Menghapus simbol `✓` dan `⚠` pada baris audit validasi. Menghapus icon `<Sparkles>` pada header kalkulator.
    - `overview.tsx`: Menghapus seluruh ikon pada kartu KPI (`<Box>`, `<Package>`, `<Scale>`, `<TrendingUp>`, `<Plane>`, `<Ship>`, `<Users>`). Menata metrik rasio moda dan MoM menjadi teks tabular minimalis yang konsisten.
    - `logistics.tsx`: Memastikan ketiga sub-tab (Daftar Resi, Batch Marking, Surat Jalan) bebas dari ikon dan emoji, menyelaraskan batasan layout `minWidth: 0, marginRight: 8` dan `flexShrink: 0` pada badge status agar tidak gepeng di layar sempit.
  - **Sistem Update Otomatis Tanpa Unduh/Cari Manual**:
    - **Self-Hosted OTA Updates (Backend)**:
      - Membuat service `UpdatesService` dan route `updatesRoutes` di Hono.js: `GET /api/manifest` dan `GET /api/manifest/bundle`.
      - Menghitung hash SHA-256 berkas Hermes bytecode (`.hbc`) secara otomatis untuk protokol Expo Updates v0.
      - Teruji via curl: mengembalikan manifest valid dan melayani berkas bundle 5.4 MB.
    - **In-App Direct APK Downloader (`updateStore.ts` & `UpdateModal.tsx`)**:
      - Menggunakan `expo-file-system/legacy` (`createDownloadResumable`) untuk mengunduh berkas APK langsung di aplikasi dengan animasi progress bar persentase dan ukuran MB *real-time*.
      - Setelah unduhan tuntas, aplikasi langsung memicu Android Package Installer via `Sharing.shareAsync` (`application/vnd.android.package-archive`) sehingga pop-up instalasi sistem Android langsung muncul di layar tanpa harus membuka Chrome atau mencari berkas di folder Download.
      - Mendukung Over-The-Air reload (`Updates.reloadAsync()`) jika module native `expo-updates` aktif.
    - **Konfigurasi Mobile**: Menambahkan konfigurasi `updates` dan izin `"REQUEST_INSTALL_PACKAGES"` pada `mobile/app.json`.
  - **Build, Sign, & Deploy APK v1.0.4**:
    - Bundle Metro diekspor: 3.319 modul, Hermes bytecode `entry-b570158ca1c6b237328d52c7e598042e.hbc` (5.4 MB), terverifikasi bytecode memuat string `1.0.4`.
    - Bundle diinjeksikan ke `mshipping.apk` menggantikan `assets/index.android.bundle`.
    - APK ditandatangani ulang dengan `release.keystore` (dual signing v2 + v3, 4096-byte zipalign) via `uber-apk-signer.jar` (0 errors).
    - File APK rilis terbaru (`126.910.333 bytes`) telah disinkronkan ke:
      - `C:\shipping\mshipping.apk`
      - `C:\shipping\frontend\dist\mshipping.apk`
      - `C:\shipping\backend\public\uploads\mshipping.apk`
    - PM2 backend `ShippingApi` direstart dan verifikasi uji endpoint:
      - `GET /api/app-version/latest` sukses menyajikan `version: "1.0.4"`, `versionCode: 5`, `forceUpdate: true`.
      - `GET /api/manifest` mengembalikan manifest bundle aktif.
      - `GET http://36.93.22.142/mshipping/mshipping.apk` sukses `HTTP 200 OK`.
  - **Akar Masalah Infinite Scroll Batch Marking Tidak Jalan**:
    - Pada `marking.service.ts`, fungsi `getMarkings` mengembalikan objek meta dengan cara `...meta` di mana `meta` dari `buildPagination` adalah sebuah fungsi (`(total: number) => ({ page, limit, total, totalPages })`).
    - Akibatnya, `...meta` menghasilkan objek kosong `{}` tanpa properti `page` (`meta: { total, totalPages }`).
    - Di `logistics.tsx`, `getNextPageParam` mengecek `page < totalPages` (`undefined < 702` bernilai `false`), sehingga `hasNextBatches` menjadi `false` sejak halaman 1 dan infinite scroll tidak pernah memicu pemanggilan halaman selanjutnya.
  - **Solusi & Perbaikan**:
    1. **Backend**: Mengubah `meta: { ...meta, total, totalPages }` menjadi `meta: meta(total)` di `marking.service.ts`. Terverifikasi respons API kini mengembalikan `page: 1`, `limit: 20`, `total`, dan `totalPages`.
    2. **Frontend Resiliency**: Menyesuaikan `getNextPageParam` pada `logistics.tsx` agar menggunakan fallback `allPages.length` sehingga kalkulasi halaman berikutnya tetap berjalan robust.
    3. **Pembersihan Teks Fallback**: Menghapus teks bawaan hardcoded `'Batch Pengiriman Kontainer'` dan `fdMarkingDesc` pada kartu batch marking. Kini hanya menampilkan `fdKet` jika memang ada datanya (`item.fdKet?.trim()`), ditempatkan tepat setelah nomor kontainer (laut) atau AWB (udara).
    4. **Re-Bundle & Re-Sign APK v1.0.3**:
       - Bundle Hermes diekspor ulang (`entry-0c5a859978035a65fdbfad86e5ca2466.hbc`, 5.3 MB).
       - Terverifikasi string `1.0.3` ada dan teks `Batch Pengiriman Kontainer` sudah bersih (hilang).
       - APK diinjeksi, ditandatangani ulang dengan `release.keystore`, dan disinkronkan ke seluruh direktori distribusi server.
       - PM2 backend `ShippingApi` direstart dan verifikasi uji multi-page API (halaman 1 & 2) berjalan mulus.

- [x] Rilis Mobile APK v1.0.3 (Force Update) & Penyesuaian Tampilan Nomor Muatan Batch Marking ([version.ts](file:///c:/shipping/mobile/src/config/version.ts), [app-version.json](file:///c:/shipping/backend/src/config/app-version.json), [app.json](file:///c:/shipping/mobile/app.json), [package.json](file:///c:/shipping/mobile/package.json), [logistics.tsx](file:///c:/shipping/mobile/app/%28tabs%29/logistics.tsx), [mobile-app.md](file:///c:/shipping/mobile-app.md)):
  - **Tampilan Khusus Nomor Muatan Tab 2 (Batch Marking)**:
    - Menyesuaikan tampilan nomor muatan pada kartu batch marking:
      - Untuk moda **Udara** (`fdListType === 1`): menampilkan nilai mentah `item.fdAWB`.
      - Untuk moda **Laut** (`fdListType === 2`): menampilkan nilai mentah `item.fdContNo`.
      - Menghilangkan teks awalan label `AWB:` dan `Kontainer:` sesuai instruksi pengguna (hanya menampilkan datanya saja secara bersih dan tegas).
  - **Infinite Scroll Halaman Logistik Lapangan**:
    - Mengonversi pemanggilan data pada 3 tab logistik (`shipments`, `batches`, `delivery`) menggunakan `useInfiniteQuery` TanStack React Query v5 dengan pagination `{ page: pageParam, limit: 20 }`.
    - Menghubungkan props `onEndReached` dan `onEndReachedThreshold={0.4}` pada masing-masing `FlatList`.
    - Menampilkan indikator loading footer (*ActivityIndicator* warna aksen `colors.tertiary`) ketika sedang memuat halaman berikutnya (`isFetchingNextPage`).
  - **Kenaikan Versi & Force Update v1.0.3**:
    - Versi dinaikkan menjadi `v1.0.3` (versionCode: `4`) dengan status **`forceUpdate: true`** di:
      - `mobile/src/config/version.ts`
      - `backend/src/config/app-version.json`
      - `mobile/app.json`
      - `mobile/package.json`
      - `mobile-app.md`
  - **Build, Sign, & Deploy APK**:
    - Bundle Metro diekspor: 3.305 modul, Hermes bytecode `entry-f0d0e717942dfc26c5f1338961d57c01.hbc` (5.3 MB), terverifikasi bytecode memuat string `1.0.3`.
    - Bundle diinjeksikan ke `mshipping.apk` menggantikan `assets/index.android.bundle`.
    - APK ditandatangani ulang dengan `release.keystore` (dual signing v2 + v3, 4096-byte zipalign) via `uber-apk-signer.jar` (0 errors).
    - File APK rilis terbaru (`126.893.949 bytes`) telah disinkronkan ke:
      - `C:\shipping\mshipping.apk`
      - `C:\shipping\frontend\dist\mshipping.apk`
      - `C:\shipping\backend\public\uploads\mshipping.apk`
    - PM2 backend `ShippingApi` direstart dan endpoint `GET /api/app-version/latest` sukses menyajikan `version: "1.0.3"`, `versionCode: 4`, `forceUpdate: true`.
  - **Verifikasi**:
    - `bun run tsc --noEmit` di `mobile/` lulus 100% (0 errors).
    - Endpoint download `http://36.93.22.142/mshipping/mshipping.apk` mengembalikan `HTTP 200 OK`.

- [x] Penambahan Aturan Operasional Mobile App di AGENTS.md ([AGENTS.md](file:///c:/shipping/.agents/AGENTS.md)):
  - Menambahkan aturan wajib di header: sebelum update aplikasi mobile (`mobile/`), Agen WAJIB membaca `mobile-app.md` terlebih dahulu.
  - Menambahkan aturan konfirmasi ke user: setelah update mobile selesai, Agen WAJIB BERTANYA kepada User mengenai nomor versi rilis baru dan tipe update (apakah ini Force Update (`forceUpdate: true`) atau Opsional (`forceUpdate: false`)). DILARANG mengasumsikan sendiri.
  - Menambahkan seksi detail `## 📱 Standar Operasional & Rilis Mobile App` yang merinci siklus baca docs, konfirmasi versi, penyesuaian single source of truth (`version.ts`, `app-version.json`, `app.json`, `package.json`), build/sign APK, dan sinkronisasi `mobile-app.md`.

- [x] Perbaikan Pencarian Nomor Kontainer & Tampilan Batch Marking ([marking.service.ts](file:///c:/shipping/backend/src/modules/marking/marking.service.ts), [logistics.tsx](file:///c:/shipping/mobile/app/%28tabs%29/logistics.tsx), [SearchBar.tsx](file:///c:/shipping/mobile/src/components/ui/SearchBar.tsx)):
  - **Akar Masalah**:
    1. Dari log PM2, saat pengguna mencari `EGSU9744442`, query ke server membawa parameter `&listType=1` (`GET /api/marking?limit=20&search=Egsu&listType=1`). Nilai `1` adalah filter **Udara**, sedangkan `EGSU9744442` adalah kontainer **Laut** (`fdListType = 2`). Hal ini terjadi karena state filter moda terbawa dari tab sebelumnya tanpa di-reset saat pindah tab.
    2. Pada kartu Batch Marking sebelumnya, nomor kontainer (`fdContNo`) sama sekali tidak ditampilkan di UI kartu (hanya `fdMarkingCode` misal `26GZD78`, keterangan, dan tanggal). Sehingga pengguna tidak melihat nomor kontainer yang dicarinya.
    3. Backend `where.OR` pada `marking.service.ts` belum mencakup `fdKet`, `fdBranchCode`, dan `fdWilayah`.
  - **Solusi & Hasil**:
    1. **Tampilan Nomor Kontainer & Badge Moda**: Kartu batch marking kini menampilkan nomor kontainer tebal warna aksen (`Kontainer: EGSU9744442 (40)`), B/L, AWB, serta badge moda `✈️ Udara` / `🚢 Laut`.
    2. **Reset Filter Moda Saat Pindah Tab**: Menambahkan `setModeFilter('all')` saat beralih tab di `SegmentedControl`.
    3. **Empty State Interaktif**: Jika tidak ada data akibat filter moda aktif (misal mencari kontainer laut saat filter Udara aktif), ditampilkan notifikasi ramah dan tombol cepat *"Tampilkan Semua Moda"*.
    4. **Responsivitas Search**: Menambahkan `returnKeyType="search"` dan `onSubmitEditing` pada `SearchBar.tsx`.
    5. **Peluasan Search Backend**: Menambahkan `fdKet`, `fdBranchCode`, dan `fdWilayah` pada `where.OR` Prisma.
    6. **Build & Deploy**: Bundle diekspor ulang (Hermes bytecode 5.3 MB), diinjeksikan ke `mshipping.apk`, di-sign dengan `release.keystore`, dan disalin ke `dist` & `uploads`. PM2 `ShippingApi` di-restart.


- [x] Perbaikan Tuntas Modal 'Pembaruan Tersedia' Selalu Muncul di Mobile App ([version.ts](file:///c:/shipping/mobile/src/config/version.ts), [updateStore.ts](file:///c:/shipping/mobile/src/stores/updateStore.ts), [UpdateModal.tsx](file:///c:/shipping/mobile/src/components/update/UpdateModal.tsx), [package.json](file:///c:/shipping/mobile/package.json)):
  - **Akar Masalah**:
    1. `Constants.expoConfig` pada build APK mandiri (*standalone export* tanpa Expo Go / expo-updates service) bernilai `null` saat runtime di perangkat.
    2. Akibatnya, `CURRENT_APP_VERSION = Constants.expoConfig?.version || '1.0.0'` secara permanen jatuh ke fallback hardcoded `'1.0.0'`.
    3. Ketika dicek dengan bytecode inspection, bundle lama tidak memuat teks versi baru sama sekali. Karena versi app selalu terbaca `'1.0.0'`, sementara backend mengembalikan `'1.0.2'` (atau `'1.0.1'`), aplikasi selalu menganggap ada pembaruan (`isNewer = true`) dan memunculkan modal terus-menerus.
    4. Selain itu, aksi `Linking.openURL` hanya mengunduh file APK ke folder Download HP tanpa otomatis memicu installer Android, sehingga pengguna perlu membuka notifikasi unduhan untuk menginstal.
  - **Solusi & Hasil**:
    1. **Single Source of Truth Versi**: Membuat `mobile/src/config/version.ts` yang mengekspor `APP_VERSION = '1.0.2'` dan `APP_VERSION_CODE = 3` yang langsung diimpor oleh `updateStore.ts` dan terkompilasi ke dalam Hermes bytecode (terverifikasi `Contains 1.0.2: True`).
    2. **Dismissed Version State**: Menambahkan logika `dismissedVersion`. Jika pengguna menutup modal dengan tombol "Nanti Saja" atau tombol silang, modal tidak akan muncul otomatis lagi di background kecuali ada versi lebih baru atau jika dicek manual via tab Profil.
    4. **Re-build & Sign**: Bundle Metro diekspor ulang (Hermes bytecode 5.3 MB), diinjeksikan ke `mshipping.apk`, di-sign dengan `release.keystore` (SHA256withRSA), dan disinkronkan ke seluruh direktori unduhan server.
    5. **Pembaruan mobile-app.md**: Menyelaraskan seluruh dokumen arsitektur, konfigurasi versi statis `version.ts`, alur `dismissedVersion`, dan prosedur instalasi sideload APK.


- [x] Penyelarasan Modul Logistik Mobile App & Manifest Batch Marking ([mobile-app.md](file:///c:/shipping/mobile-app.md), [logistics.tsx](file:///c:/shipping/mobile/app/%28tabs%29/logistics.tsx), [deliveryOrders.service.ts](file:///c:/shipping/backend/src/modules/delivery-orders/deliveryOrders.service.ts), [app-version.json](file:///c:/shipping/backend/src/config/app-version.json), [app.json](file:///c:/shipping/mobile/app.json)):
  - **Filter Moda Batch Marking**: Menambahkan tombol segmented filter moda `[ Semua ] | [ ✈️ Udara ] | [ 🚢 Laut ]` pada tab Batch Marking yang mengirimkan parameter query `listType=ALL|1|2` ke backend.
  - **Keterangan Batch**: Menggunakan kolom `fdKet` untuk keterangan batch marking.
  - **Hierarki Tanggal Batch**: Menampilkan tanggal dengan prioritas pertama yang tidak null dengan label prefix: `Exit` (`fdExitDate`), `ETA` (`fdETA`), `ETD` (`fdETD`), `Load` (`fdLoadDate`).
  - **Manifest Resi per Batch (`GET /api/marking/:id/manifest`)**: Menambahkan tautan "Lihat Data Manifest ➔" pada setiap kartu batch yang membuka Bottom Sheet Modal berisi ringkasan total resi serta daftar resi yang tergabung (no resi/terima, marking, nama customer, koli, berat, volume m³).
  - **Penyelarasan Kolom & Status Delivery Order (Surat Jalan)**:
    - Backend Prisma query `getDeliveryOrders` ditambahkan field: `fdEstimasi`, `fdSent`, `fdGiveDate`.
    - Menggunakan kolom `fdCarID` untuk armada mobil dan `fdSupir` untuk supir.
    - Logika penentuan status delivery order:
      - `Delivered` (Hijau): jika `fdSent === 1`.
      - `On Delivery` (Biru): jika tanggal hari ini $\ge$ `fdEstimasi` dan `fdSent === 0`.
      - `Scheduled / Pending` (Kuning): jika tanggal hari ini $<$ `fdEstimasi` dan `fdSent === 0` (atau belum ada tanggal estimasi).
    - Menampilkan informasi "Serah Kantor: DD-MM-YYYY" jika `fdGiveDate` terisi.
  - **Pembaruan mobile-app.md**:
    - Bagian 3.5.A (Batch Marking) dan 3.5.B (Delivery Order) diperbarui secara detail mencakup semua logika, field, dan relasi endpoint.
    - Bagian 4 (Tabel Matriks Endpoint) diperbarui mencakup `/api/marking/:id/manifest` dan parameter `listType`.
  - **Build, Sign, & Deploy APK v1.0.2**:
    - Versi dinaikkan ke `v1.0.2` (versionCode: 3) di `mobile/app.json` dan `backend/src/config/app-version.json`.
    - Bundle Metro diekspor (3.304 modul, Hermes bytecode `entry-6fe4c4a34e0adf12b6ba74a56fa3d54f.hbc`, 5.3 MB).
    - APK di-patch dan ditandatangani menggunakan `release.keystore` (dual-signing v2 + v3) via `uber-apk-signer`.
    - File APK rilis aktif (`126.893.949 bytes`) telah disinkronkan ke `frontend/dist/mshipping.apk`, `backend/public/uploads/mshipping.apk`, dan root `mshipping.apk`.
    - PM2 `ShippingApi` di-restart dan endpoint `/api/app-version/latest` terverifikasi menyajikan versi 1.0.2.


- [x] Penyelarasan Nama Field Data Shipment (`fdMarkingCode`, `fdJmlPack`, `fdSatuan`, `fdJmlBerat`) ([mobile-app.md](file:///c:/shipping/mobile-app.md), [logistics.tsx](file:///c:/shipping/mobile/app/%28tabs%29/logistics.tsx), [overview.tsx](file:///c:/shipping/mobile/app/%28tabs%29/overview.tsx)):
  - Menyelaraskan seluruh dokumentasi dan data mapping field sesuai skema aktual view SQL `vwShipment`:
    - `fdListCode` $\to$ `fdMarkingCode` (Nomor kode batch marking manifest)
    - `fdColy` $\to$ `fdJmlPack` (Jumlah koli/pack) dan `fdSatuan` (Satuan muatan kemasan: Ctn, Pcs, Koli, Roll, Zak)
    - `fdWeight` $\to$ `fdJmlBerat` (Berat timbangan gudang dalam kg)
  - Memperbarui komponen `logistics.tsx` dan `overview.tsx` agar membaca `fdMarkingCode`, `fdJmlPack`, `fdSatuan`, dan `fdJmlBerat` dengan fallback aman.
  - Re-bundle Metro (3.304 modul), patch APK, re-sign dengan `release.keystore`, dan deploy ke seluruh endpoint unduhan server.

- [x] Implementasi Penuh Fitur Auto Update Mobile App ([app-version.routes.ts](file:///c:/shipping/backend/src/modules/app-version/app-version.routes.ts), [app-version.service.ts](file:///c:/shipping/backend/src/modules/app-version/app-version.service.ts), [app-version.json](file:///c:/shipping/backend/src/config/app-version.json), [updateStore.ts](file:///c:/shipping/mobile/src/stores/updateStore.ts), [UpdateModal.tsx](file:///c:/shipping/mobile/src/components/update/UpdateModal.tsx), [profile.tsx](file:///c:/shipping/mobile/app/%28tabs%29/profile.tsx), [_layout.tsx](file:///c:/shipping/mobile/app/_layout.tsx)):
  - **Backend (`backend/`)**:
    - Berkas konfigurasi versi terpusat `backend/src/config/app-version.json` memuat `version`, `versionCode`, `minVersion`, `forceUpdate`, `downloadUrl`, `releaseNotes`, dan timestamp rilis.
    - `AppVersionService` secara dinamis mendeteksi ukuran berkas fisik APK riil (`mshipping.apk` di `uploads/` atau `frontend/dist/`) dan memformatnya (misal `121.0 MB`).
    - Endpoint publik `GET /api/app-version/latest` dan alias `/app-version/latest` terdaftar di `rootApp` & `apiApp`.
    - PM2 `ShippingApi` direload dan terverifikasi mengembalikan HTTP 200 OK via localhost maupun IP publik `36.93.22.142`.
  - **Mobile App (`mobile/`)**:
    - `updateService.ts` & `updateStore.ts` (Zustand): komparasi semantik versi (`compareVersions(v1, v2)`) dan manajemen state pembaruan.
    - `UpdateModal.tsx`: modal dialog ergonomis multi-tema (Midnight Dark / Heritage Light) menampilkan komparasi versi (`v1.0.0 ➔ v1.0.1`), ukuran file APK, daftar catatan rilis (*changelog*), tombol "Perbarui Sekarang" (memicu `Linking.openURL` ke file APK), dan link alternatif ke portal unduh QR.
    - Background check otomatis di root `_layout.tsx` saat aplikasi dibuka.
    - Tombol interaktif "Versi Aplikasi & Cek Pembaruan" di `profile.tsx` (Informasi Sistem) dengan haptic feedback dan toast status.
  - **Build & Deploy**:
    - Bundle Metro diekspor (3.304 modul, Hermes bytecode `entry-938b725d322b2cf1a4fe780e665a8dfb.hbc`, 5.3 MB).
    - APK di-patch, di-align 4096-byte zipalign, dan di-re-sign (v2 + v3) menggunakan `release.keystore` via `uber-apk-signer`.
    - APK terbaru (`126.889.853 bytes`) telah disinkronkan ke seluruh jalur unduhan (`frontend/dist/`, `backend/public/uploads/`, root).

- [x] Perbaikan Menyeluruh 'App Not Installed as Package Appears to Be Invalid' ([app.json](file:///c:/shipping/mobile/app.json), [build-apk.yml](file:///c:/shipping/.github/workflows/build-apk.yml), [release.keystore](file:///c:/shipping/mobile/keystore/release.keystore)):
  - **Akar Masalah Nyata Berdasarkan Uji Decompile**:
    1. **Target SDK 36 (Android 16 Preview / Baklava)**: React Native Gradle Plugin secara otomatis mendeteksi SDK platform tertinggi di runner CI (`android-36` preview). Android OS stabil (Android 14/13/12) menolak instalasi APK yang menargetkan preview SDK dengan error `INSTALL_PARSE_FAILED_BAD_TARGET_SDK` (*App not installed as package appears to be invalid*).
    2. **Algoritma Signature Lemah (`SHA1withRSA`)**: Keystore debug lama menggunakan algoritma usang `SHA1withRSA` yang secara ketat diblokir oleh Android 11+ PackageParser.
    3. **Ketiadaan Berkas Skema v1 (JAR)**: Beberapa installer vendor menolak APK sideload tanpa v1 (`META-INF/MSHIPPIN.RSA`).
  - **Solusi Komprehensif & Uji Lokal Terverifikasi**:
    1. **Mengunci Target SDK ke Android 14 (API 34) Stabil**: Pada `mobile/app.json`, dikonfigurasi `compileSdkVersion: 34`, `targetSdkVersion: 34`, `minSdkVersion: 24`, dan `buildToolsVersion: "34.0.0"`.
    2. **Keystore Rilis Modern (PKCS12 & SHA256withRSA)**: Dibuat `mobile/keystore/release.keystore` dengan sertifikat resmi 2048-bit RSA, validitas 10.000 hari (hingga 2054), ditandatangani `SHA256withRSA` tanpa peringatan keamanan.
    3. **Uji Decompile & Verifikasi Penuh (`apktool` + `uber-apk-signer`)**:
       - Berhasil membangun ulang manifest menjadi: `compileSdkVersion="34"`, `targetSdkVersion="34"`, `minSdkVersion="24"`.
       - Berhasil menandatangani dengan skema ganda lengkap (`META-INF/MSHIPPIN.SF`, `MSHIPPIN.RSA`, `MANIFEST.MF` + `APK Sig Block 42`).
       - Zipalign 4-byte dan 4096-byte verified (0 error).
       - File APK rilis terverifikasi (`129.159.514 bytes`) langsung dipasang ke seluruh link publik server.
    4. **Pembaruan Pipeline CI**: `.github/workflows/build-apk.yml` diselaraskan agar selalu menggunakan `release.keystore` dengan `apksigner` dual-signing.


- [x] Perbaikan Benturan Navigasi Bawah dengan Tombol Navigasi Android ([_layout.tsx](file:///c:/shipping/mobile/app/%28tabs%29/_layout.tsx), [overview.tsx](file:///c:/shipping/mobile/app/%28tabs%29/overview.tsx), [logistics.tsx](file:///c:/shipping/mobile/app/%28tabs%29/logistics.tsx), [finance.tsx](file:///c:/shipping/mobile/app/%28tabs%29/finance.tsx), [master.tsx](file:///c:/shipping/mobile/app/%28tabs%29/master.tsx), [profile.tsx](file:///c:/shipping/mobile/app/%28tabs%29/profile.tsx)):
  - **Akar Masalah**:
    1. Tinggi tab bar sebelumnya di-hardcode `height: 60` dan `paddingBottom: 8` di `(tabs)/_layout.tsx` tanpa memperhitungkan insets navigasi Android (`useSafeAreaInsets()`).
    2. Pada HP Android dengan navigasi 3-tombol (Back, Home, Recents) yang memakan ~48dp, tombol sistem menutupi ikon & teks tab bar aplikasi.
    3. Halaman-halaman tab mengimpor `SafeAreaView` bawaan `'react-native'` yang tidak berfungsi di Android.
  - **Perbaikan Menyeluruh**:
    1. **Dynamic Tab Bar Insets**: `(tabs)/_layout.tsx` menggunakan `useSafeAreaInsets()`. Tinggi tab bar dihitung dinamis: `tabBarHeight = 54 + bottomInset`, dengan `paddingBottom: bottomInset` (`Math.max(insets.bottom, 12)` di Android). Latar belakang tab bar menutupi area di belakang tombol sistem, sementara ikon dan label terangkat bersih di atas tombol Android.
    2. **Cross-Platform SafeAreaView**: Mengganti impor `SafeAreaView` dari `'react-native'` ke `'react-native-safe-area-context'` dengan `edges={['top']}` pada seluruh halaman tab, dan `edges={['top', 'bottom']}` pada halaman login/register.
    3. **Penyelarasan Padding Scroll & Sheet**: Menambahkan `paddingBottom: 28` pada FlatList dan `paddingBottom: 36` pada Bottom Sheet modal.
    4. **Rebuild Bundle & Re-sign**: Bundling Metro berhasil (3.301 modul), bundle diinjeksikan ke `C:\shipping\mshipping.apk` dan ditandatangani ulang dengan `release.keystore` (SHA256withRSA) serta deployed ke seluruh path unduhan web server.

- [x] Pembuatan Dokumentasi Arsitektur, Logika, & Integrasi Endpoint Mobile App ([mobile-app.md](file:///c:/shipping/mobile-app.md)):
  - Menyusun dokumentasi komprehensif seluruh halaman mobile app (`app/index.tsx`, `login.tsx`, `register.tsx`, `overview.tsx`, `logistics.tsx`, `finance.tsx`, `master.tsx`, `profile.tsx`, `BarcodeScannerModal.tsx`).
  - Merinci logika interaksi, manajemen state (Zustand + React Query), integrasi hardware (Kamera, Biometrik, Print & Share PDF, Telepon, WhatsApp), mapping struktur data visual, dan tabel matriks 11 endpoint API backend.

- [x] Perbaikan Tuntas Toast 'Network Error' & Cleartext HTTP Android pada Mobile APK ([withCleartextTraffic.js](file:///c:/shipping/mobile/plugins/withCleartextTraffic.js), [app.json](file:///c:/shipping/mobile/app.json), [build-apk.yml](file:///c:/shipping/.github/workflows/build-apk.yml)):
  - **Akar Masalah**:
    1. **Cleartext HTTP Block di Android OS**: Android 9+ secara bawaan menolak semua koneksi non-HTTPS (`http://36.93.22.142:3010`) sebelum paket keluar dari HP jika `android:usesCleartextTraffic="true"` belum terkompilasi ke dalam binary `AndroidManifest.xml`, memicu error Axios `Network Error`.
    2. Expo SDK 50+ mengabaikan `usesCleartextTraffic` di `app.json` tanpa config plugin resmi.
    3. Windows Firewall belum memiliki inbound rule untuk port 3010.
  - **Solusi & Hasil**:
    1. **Expo Config Plugin**: Dibuat `mobile/plugins/withCleartextTraffic.js` menggunakan `@expo/config-plugins` (`withAndroidManifest`) untuk menginjeksi `android:usesCleartextTraffic="true"` secara permanen ke elemen `<application>` di AndroidManifest.
    2. **Firewall Rule**: Dibuat aturan inbound `ShippingApi Port 3010` (Allow Inbound TCP 3010 Semua Profil) di Windows Defender Firewall.
    3. **APK Rilis Terverifikasi**: APK telah dibangun ulang dan ditandatangani dengan `release.keystore` (SHA256withRSA), `compileSdkVersion: 34`, `targetSdkVersion: 34`, dan terbukti memiliki string `usesCleartextTraffic` di binary AXML.
    4. **Deploy Server Selesai**: File APK rilis aktif (`129.159.514 bytes`) telah disalin ke:
       - `C:\shipping\frontend\dist\mshipping.apk` (unduh via web port 80)
       - `C:\shipping\backend\public\uploads\mshipping.apk` (unduh via mirror port 3010)
       - `C:\shipping\mshipping.apk`
    5. **Git Push**: Commit `7fbbf29` berhasil dipush ke branch `main`.
  - **Akar Masalah Gagal Login**:
    1. `mobile/src/api/client.ts` menggunakan `Platform.select({ android: 'http://10.0.2.2:3001' })` yang hanya berlaku di emulator Android lokal, sehingga saat diinstall di HP fisik memicu Network Error.
    2. URL tidak menyertakan prefix base path `/api`.
    3. Pada Android 9+ (Pie ke atas), release build secara default memblokir cleartext HTTP traffic (`http://`) tanpa izin eksplisit di AndroidManifest.
  - **Perbaikan**:
    1. Mengubah `DEFAULT_API_URL` menjadi `http://36.93.22.142:3010/api` secara permanen.
    2. Menambahkan `package: "com.mshipping.mobile"`, `usesCleartextTraffic: true`, serta izin `INTERNET` dan `ACCESS_NETWORK_STATE` pada `mobile/app.json`.
    3. Meningkatkan penanganan pesan error di `login.tsx` agar menampilkan pesan detail dari server / koneksi secara presisi.
    4. Menampilkan indikator host server aktif di `profile.tsx`.
    5. Menambahkan `*.apk` pada `.gitignore` root.
  - **Verifikasi**:
    - `bun run tsc --noEmit` lulus 100% (0 errors).
    - `bunx expo config --type public` tervalidasi sukses dengan `usesCleartextTraffic: true`.
    - `bunx expo export --platform android` sukses membundel 3.301 modul.
    - Uji coba login langsung via HTTP POST ke backend `http://36.93.22.142:3010/api/auth/login` berhasil `HTTP 200 OK`.

- [x] Implementasi Penuh Expo Mobile App ([mobile/](file:///c:/shipping/mobile/), [walkthrough.md](file:///C:/Users/Administrator/.gemini/antigravity/brain/216aaf69-6285-4be2-afee-3555b5744e2f/walkthrough.md), [implementation_plan.md](file:///C:/Users/Administrator/.gemini/antigravity/brain/216aaf69-6285-4be2-afee-3555b5744e2f/implementation_plan.md)):
  - **Inisialisasi & Setup**: Expo SDK 57 + Expo Router v4 + React 19.2 + TypeScript 6.0 di folder `mobile/`.
  - **Theme & Desain Sistem**: Token warna resmi mshipping (Midnight Dark `#0B0F17` & Heritage Light `#F7F5F2`), switch dinamis di Zustand `themeStore`.
  - **Autentikasi & Biometrik**:
    - [login.tsx](file:///c:/shipping/mobile/app/%28auth%29/login.tsx): Form login + tombol biometrik FaceID / Fingerprint via `expo-local-authentication` & token tersimpan di `expo-secure-store`.
    - [register.tsx](file:///c:/shipping/mobile/app/%28auth%29/register.tsx): Form pendaftaran akun baru.
  - **Modul Utama (5 Bottom Tabs)**:
    - [overview.tsx](file:///c:/shipping/mobile/app/%28tabs%29/overview.tsx): 5 kartu KPI eksekutif, switcher moda Udara/Laut, quick action grid, dan barcode scanner.
    - [logistics.tsx](file:///c:/shipping/mobile/app/%28tabs%29/logistics.tsx): Segmented tabs (Daftar Resi, Batch Marking, Surat Jalan), pemindai barcode kamera (`expo-camera`), dan bottom sheet rincian dimensi fisik.
    - [finance.tsx](file:///c:/shipping/mobile/app/%28tabs%29/finance.tsx): Daftar invoice, status audit validasi, kalkulator tarif lapangan interaktif, dan cetak/bagikan PDF invoice via `expo-print` + `expo-sharing`.
    - [master.tsx](file:///c:/shipping/mobile/app/%28tabs%29/master.tsx): Direktori customer master dengan aksi 1-ketukan panggilan telepon (`tel:`) dan chat WhatsApp (`wa.me/`).
    - [profile.tsx](file:///c:/shipping/mobile/app/%28tabs%29/profile.tsx): Pengaturan akun, toggle biometrik, switcher tema Midnight/Heritage, bahasa bilingual (ID/EN), status server ERP, dan logout.
  - **Download APK & Akses Publik IP**:
    - File APK fisik (123.63 MB) berhasil diunduh dari GitHub Actions Artifact (`run 34681198544`) dan ditempatkan di `C:\shipping\frontend\dist\mshipping.apk`, `C:\shipping\backend\public\uploads\mshipping.apk`, dan root `C:\shipping\mshipping.apk`.
    - Pengujian HTTP Response: `http://36.93.22.142/mshipping/mshipping.apk` mengembalikan **HTTP 200 OK** (`Content-Type: application/vnd.android.package-archive`, ukuran 129.637.851 bytes).
    - Landing page publik dengan QR Code scan aktif di: `http://36.93.22.142/mshipping/download/`.
    - Mirror API download aktif di: `http://36.93.22.142:3010/download/apk`.
  - **Komponen UI**: Button + haptics (`expo-haptics`), Card, Badge outline semantik, SearchBar + scan, SegmentedControl, SkeletonShimmer, ToastContainer.
  - **Verifikasi**:
    - `bun run tsc --noEmit` lulus 100% (0 errors).
    - `bunx expo config` tervalidasi sukses.
    - `bunx expo export --platform android` sukses mem-bundle 3.301 modul.
- [x] Penambahan Grafik Distribusi Tipe Komoditas (Udara & Laut) & Pembersihan Card KPI ([DashboardPage.tsx](file:///c:/shipping/frontend/src/features/shipments/pages/DashboardPage.tsx), [CommodityDistributionCard.tsx](file:///c:/shipping/frontend/src/features/shipments/components/CommodityDistributionCard.tsx), [shipments.service.ts](file:///c:/shipping/backend/src/modules/shipments/shipments.service.ts), [shipments.types.ts](file:///c:/shipping/backend/src/modules/shipments/shipments.types.ts)):
  - **Kebutuhan User**:
    1. Tambahkan grafik tipe komoditas pada shipment dashboard, pisahkan antara moda laut dan udara.
    2. Pada card lain (card KPI), hapus teks `Air` dan `Sea`, cukup gunakan icon saja (`Plane` & `Ship`).
  - **Backend (`shipments.service.ts`, `shipments.types.ts`)**:
    - Menambahkan `ShipmentCommodityMetric` dan `ShipmentCommoditiesData` pada tipe respons KPI.
    - Menambahkan query agregasi komoditas pada `getShipmentsKPIs` via `safeQuery` menggabungkan `vwShipment` dengan `tbTypeComodity` (`ON tc.fdTypeComodity = s.fdTypeComodity AND tc.fdListType = s.fdListType`), menghitung resi, koli, berat, volume, dan persentase untuk masing-masing moda udara (`fdListType = 1`) dan laut (`fdListType = 2`).
  - **Frontend (`DashboardPage.tsx`, `CommodityDistributionCard.tsx`)**:
    - **Pembersihan Teks Air/Sea pada KPI Cards**: Menghapus teks `Air` dan `Sea` (`t('shipments.air')` dan `t('shipments.sea')`) pada baris rasio KPI cards dan mode badge, sehingga hanya menampilkan icon `Plane` (sky) dan `Ship` (indigo) dengan angka dan persentase. Menghemat ruang horizontal dan tampilan jauh lebih bersih.
    - **Grafik Komoditas ([CommodityDistributionCard.tsx](file:///c:/shipping/frontend/src/features/shipments/components/CommodityDistributionCard.tsx))**:
      - Menggunakan Recharts horizontal `BarChart` (`layout="vertical"`) yang responsif dan ramah dark mode.
      - Panel terpisah antara **Moda Laut (Sea)** (palet indigo) dan **Moda Udara (Air)** (palet sky).
      - Menampilkan peringkat komoditas teratas (UMUM, LARTAS, GENERAL, BRANDED, FOOD, GARMENT, dsb.).
      - Switcher metrik interaktif: **Total Resi**, **Total Koli**, **Kg (Berat)**, dan **M³ (Volume)**.
      - Mini-cards breakdown ranking di bawah chart dengan persentase dan nilai metrik.
      - Menyesuaikan mode tampilan: jika mode `all` tampil 2 kolom berdampingan; jika mode `air` atau `sea` tampil panel fokus satu kolom penuh.
    - **i18n**: Menambahkan kamus terjemahan bilingual di `id.json` dan `en.json`.
  - **Verifikasi**:
    - Backend PM2 `ShippingApi` direstart dan online.
    - Uji coba langsung eksekusi query komoditas di backend sukses.
    - Frontend build (`tsc -b && vite build`) lulus 100% tanpa error.
- [x] Penerapan Hirarki M3 pada Validasi Compare M3 vs KG / Type 2 ([billing-validation.service.ts](file:///c:/shipping/backend/src/modules/billing/billing-validation.service.ts), [Type2ComparisonPanel.tsx](file:///c:/shipping/frontend/src/features/billing/components/Type2ComparisonPanel.tsx)):
  - **Kebutuhan User**: `m3 hirarkinya -> m3 komplain, m3 gudang, m3pl -> apabila bill gabung pakai m3 per marking`.
  - **Akar Masalah Sebelumnya**: Pada invoice `GZS-010257-09-2026` (dan Type 2 lainnya), `getType2ComparisonCheck` langsung mengambil nilai mentah dari `tbEntryList.fdM3` (`13.41` / `13,4100 M3`, data input awal PL) tanpa melewati hirarki operasional M3. Akibatnya nilai ideal dihitung $13.41 \times 5.500.000 = 73.755.000$, padahal invoice ditagihkan $13.2768 \times 5.500.000 = 73.022.400$ (sesuai ukuran fisik gudang riil `fdM3Gudang`), sehingga salah memicu status `UNDERCHARGE` (-Rp 732.600).
  - **Perbaikan**:
    1. **Backend (`billing-validation.service.ts`)**:
       - Mengintegrasikan `evaluateM3Check` ke dalam `getType2ComparisonCheck`.
       - Menerapkan hirarki resmi M3:
         - **Single Bill**: `Komplain` (`fdM3Komplain`) $\to$ `Gudang` (`fdM3Gudang`) $\to$ `PL` (`m3PackingList` / `fdM3`).
         - **Bill Gabung** (`isGabungan`): `Komplain (Marking)` $\to$ `Gudang (Marking)` (`m3CustPerMarking`) $\to$ `PL (Marking)` (`m3PLPerMarking`).
       - Menyelaraskan hirarki KG untuk bill gabungan agar menggunakan `totalBeratPerMarking` / `totalJmlBeratSJ`.
       - Menyediakan field metadata `m3Source` dan `isGabungan` pada item dan respons agregat.
    2. **Frontend (`Type2ComparisonPanel.tsx`)**:
       - Menampilkan sumber M3 (`m3Source`, misal: `Gudang`, `Gudang (Marking)`, `Komplain`) pada kartu Total Volume dan baris tabel item di bawah kolom M3.
    3. **Hasil pada invoice `GZS-010257-09-2026`**:
       - Total Volume berubah dari `13,4100 M3` menjadi `13,2768 M3` (sumber: `Gudang`).
       - Nilai M3 Ideal = Rp 73.022.400, Tagihan Aktual = Rp 73.022.400, Selisih = Rp 0, Status = **`EQUAL` (SESUAI)**.
    4. **Hasil pada invoice `GZS-010238-09-2026` (Bill Gabung)**:
       - Total Volume = `14,8387 M3` (sumber: `Gudang (Marking)`).
       - Total Berat = `2.030 KG` (sumber: `Marking`).
       - Selisih = Rp 0, Status = **`EQUAL` (SESUAI)**.
  - **Verifikasi**:
    - Backend PM2 `ShippingApi` direstart dan online.
    - `bun run build` frontend sukses 100% tanpa error (3.45s).
- [x] Perbaikan Validasi Card Overweight pada Bill Gabungan ([useBillingValidation.ts](file:///c:/shipping/frontend/src/features/billing/hooks/useBillingValidation.ts), [BillingValidationCard.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationCard.tsx), [BillingValidationSummaryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationSummaryModal.tsx)):
  - **Akar Masalah**: Pada invoice bill gabungan (seperti `GZS-010238-09-2026`), `beratList` sebelumnya mengambil `fdBeratList` (510 kg) yang hanya merepresentasikan satu resi tunggal dari marking. Sementara `beratSJ` menggunakan `totalJmlBeratSJ` (2,030 kg). Akibatnya sistem salah mendeteksi ketidaksesuaian berat fisik (`hasWeightMismatch = true`), menampilkan badge peringatan "Selisih" dan "Selisih Berat", serta memicu prioritas tab beralih ke overweight padahal tagihan sebenarnya tidak mengalami selisih.
  - **Perbaikan**:
    1. **Single Source of Truth (`useBillingValidation.ts`)**:
       - Bila `isGabungan = true`, `beratList` menggunakan `res?.totalBeratPerMarking` (2,030 kg) jika tersedia, sehingga sebanding *apples-to-apples* dengan `res?.totalJmlBeratSJ` (2,030 kg).
       - Label sumber berat otomatis menyesuaikan: "Berat List (Marking)" dan "Berat SJ (Marking)".
       - Mengekspos `beratMarking` pada interface `BillingValidationState`.
    2. **Komponen Card (`BillingValidationCard.tsx` & `BillingValidationSummaryModal.tsx`)**:
       - Label rincian fisik menyesuaikan konteks: `Entry List (Marking)` dan `Surat Jalan (Marking)`.
       - Menyelaraskan kartu metrik ketika muatan aman (tidak overweight): menampilkan label "Sisa Kuota Berat" beserta nilai sisa kuota aman (`Math.max(0, maxAllowedWeight - actualWeightKg)`).
       - `hasWeightMismatch` dan `hasOverweightIssue` menjadi bersih (`false`) untuk tagihan gabungan yang konsisten, badge tab menjadi `✓ Aman`.
  - **Verifikasi**:
    - `bun run build` di `frontend/` sukses 100% tanpa error.
- [x] Redesign KPI Cards Shipment Dashboard agar Bersih, Lapang, dan Elegan ([DashboardPage.tsx](file:///c:/shipping/frontend/src/features/shipments/pages/DashboardPage.tsx)):
  - **Masalah Sebelumnya**: Card tampak terlalu padat dan berantakan karena menumpuk icon watermark besar, kotak-kotak beranak (nested colored boxes), font berbeda-beda tingkat, serta border bertumpuk dalam kartu sempit.
  - **Pembaruan Desain**:
    1. **Pembersihan Visual Noise**:
       - Menghapus icon watermark raksasa di latar belakang yang mengotori kontras teks.
       - Menghilangkan kotak tebal `bg-sky-500/10` / `bg-indigo-500/10` yang memenuhi kartu.
    2. **Segmented Mode Switcher (All / Air / Sea)**:
       - Menambahkan switcher pill di samping header: `[ Semua Moda ]` | `[ ✈️ Udara ]` | `[ 🚢 Laut ]`.
       - Mode `all`: Angka total all-time + visual ratio bar + rincian udara & laut + MoM.
       - Mode `air` / `sea`: Kartu memfokuskan data pada moda yang dipilih dengan tren MoM spesifik moda tersebut.
    3. **Visual Ratio Bar Tipis**:
       - Menggantikan kotak-kotak tebal dengan bar rasio proporsional setinggi 1.5 (6px) rounded-full (sky untuk Udara, indigo untuk Laut) dilengkapi legend persentase dan angka kompak satu baris.
    4. **Hierarki MoM Tenang**:
       - Footer MoM bulan ini vs bulan lalu dirapikan dengan warna sekunder yang lembut tanpa menabrak angka utama.
  - **Verifikasi**:
    - Frontend build (`tsc -b && vite build`) lulus 100% tanpa error (2.97s).
- [x] Penambahan Card Customer Aktif & Pemisahan Udara/Laut (`fdListType`) pada Seluruh Card KPI Shipment Dashboard ([shipments.service.ts](file:///c:/shipping/backend/src/modules/shipments/shipments.service.ts), [shipments.types.ts](file:///c:/shipping/backend/src/modules/shipments/shipments.types.ts), [DashboardPage.tsx](file:///c:/shipping/frontend/src/features/shipments/pages/DashboardPage.tsx)):
  - **Kebutuhan**:
    1. Menambahkan kartu KPI baru untuk "Customer Aktif" (`COUNT(DISTINCT fdCustName)`).
    2. Pada seluruh kartu KPI (Total Resi, Total Koli, Total Berat, Total Volume, dan Customer Aktif), memisahkan data berdasarkan `fdListType`: `1 = Udara`, `2 = Laut`.
  - **Backend**:
    - [shipments.types.ts](file:///c:/shipping/backend/src/modules/shipments/shipments.types.ts): Menambahkan `ShipmentTypeBreakdown` (`udara`, `laut`), field `totalCust`, breakdown per-tipe di `ShipmentsKPIResponse` dan `ShipmentPeriodMetrics`, serta perbandingan trend `comparison.cust`.
    - [shipments.service.ts](file:///c:/shipping/backend/src/modules/shipments/shipments.service.ts):
      - Menghitung breakdown Udara vs Laut secara agregat SQL Server:
        - `resiUdara` (`fdListType = 1`) & `resiLaut` (`fdListType = 2`)
        - `packagesUdara` & `packagesLaut`
        - `beratUdara` & `beratLaut`
        - `volumeUdara` & `volumeLaut`
        - `custUdara` & `custLaut` (`COUNT(DISTINCT CASE WHEN fdListType = ... THEN fdCustName END)`)
      - Ekstraksi helper `extractPeriodData()` untuk All-Time, Bulan Ini, dan Bulan Lalu.
  - **Frontend**:
    - [shipments.types.ts](file:///c:/shipping/frontend/src/features/shipments/types/shipments.types.ts): Sinkronisasi tipe `ShipmentKpis` dengan `totalCust`, breakdown udara/laut, dan trend perbandingan.
    - [DashboardPage.tsx](file:///c:/shipping/frontend/src/features/shipments/pages/DashboardPage.tsx):
      - Menampilkan 5 kartu KPI responsif (`xl:grid-cols-5`):
        1. **Total Resi**: Breakdown Udara & Laut, MoM comparison.
        2. **Total Koli**: Breakdown Udara & Laut, MoM comparison.
        3. **Total Berat**: Breakdown Udara & Laut, MoM comparison.
        4. **Total Volume**: Breakdown Udara & Laut, MoM comparison.
        5. **Customer Aktif**: Icon `Users`, breakdown customer aktif Udara vs Laut, MoM comparison.
      - Setiap kartu dilengkapi badge icon `Plane` (Udara) & `Ship` (Laut) dengan palet warna semantik (sky/indigo) outline transparan yang ramah dark mode.
    - [id.json](file:///c:/shipping/frontend/src/lib/i18n/id.json) & [en.json](file:///c:/shipping/frontend/src/lib/i18n/en.json): Menambahkan key `activeCustomers`, `air`, dan `sea`.
  - **Verifikasi**:
    - Backend PM2 `ShippingApi` berhasil direload.
    - Frontend build (`tsc -b && vite build`) lulus 100% tanpa error (2.42s).
- [x] Validasi Perbedaan Berat Fisik (List vs Surat Jalan vs Komplain) pada Sistem Validasi Billing ([m3-check.service.ts](file:///c:/shipping/backend/src/modules/m3-check/m3-check.service.ts), [useBillingValidation.ts](file:///c:/shipping/frontend/src/features/billing/hooks/useBillingValidation.ts), [useOverweightValidation.ts](file:///c:/shipping/frontend/src/features/billing/hooks/useOverweightValidation.ts), [BillingValidationSummaryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationSummaryModal.tsx), [BillingValidationCard.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationCard.tsx)):
  - **Kebutuhan**: Memeriksa konsistensi 3 sumber data berat fisik:
    1. `Berat List` (`tbEntryList.fdJmlBerat` / `fdBeratList`)
    2. `Berat Surat Jalan` (`tbDelivery.fdJmlBeratSJ` untuk bill reguler, atau `totalJmlBeratSJ` untuk gabungan)
    3. `Berat Komplain` (`tbEntryListKomplain.fdJmlBeratKomplain`)
  - **Backend**:
    - [m3-check.types.ts](file:///c:/shipping/backend/src/modules/m3-check/m3-check.types.ts): Menambahkan `fdBeratSJ: number | null` pada interface `UnifiedM3CheckResult`.
    - [m3-check.service.ts](file:///c:/shipping/backend/src/modules/m3-check/m3-check.service.ts): Menambahkan query paralel `get_berat_delivery_sj` ke `tbDelivery` (berdasarkan `fdListCode` tunggal) dan mempopulasikan `fdBeratSJ`.
  - **Frontend Core Hooks**:
    - [useBillingValidation.ts](file:///c:/shipping/frontend/src/features/billing/hooks/useBillingValidation.ts):
      - Menambahkan kalkulasi `hasWeightMismatch` (threshold selisih > 0.1 kg antar sumber berat yang aktif).
      - Menambahkan flag per-sumber: `isWeightListDiff`, `isWeightSJDiff`, `isWeightKomplainDiff`.
      - Menghubungkan ke `isPhysicalValid`: `isPhysicalValid = isPhysicalValid && !hasWeightMismatch`.
      - Mendaftarkan issue ke `validationIssues` dan tab auto-select saat ada selisih berat.
    - [useOverweightValidation.ts](file:///c:/shipping/frontend/src/features/billing/hooks/useOverweightValidation.ts):
      - Mendukung `fdBeratSJ` pada bill reguler (`komplain > sjList > gudang > list`).
  - **Frontend UI & Visual Badges**:
    - [BillingValidationSummaryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationSummaryModal.tsx):
      - Menambahkan banner status "Kesesuaian Berat Fisik" di Tab M3 & Berat (Badge `✓ Cocok` jika konsisten, `⚠ Terdapat Selisih Berat Fisik` jika mismatch).
      - Menambahkan 3 kartu ringkasan berat fisik (`Berat List`, `Berat Surat Jalan`, `Berat Komplain`) dengan indikator status selisih individual.
      - Menghubungkan selisih berat ke daftar diskrepansi modal (`discrepancyDetails`) dan verdict status.
    - [BillingValidationCard.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationCard.tsx):
      - Integrasi badge berat surat jalan pada mode UDARA & LAUT.
      - Menambahkan Weight Mismatch Alert banner pada kartu validasi.
  - **Kamus Terjemahan Dual-Bahasa**:
    - Menambahkan key di `id.json` & `en.json`: `weightMatch`, `weightMismatch`, `weightDiff`, `weightList`, `weightSJ`, `weightKomplain`, `weightConsistency`.
  - **Verifikasi**:
    - Build frontend (`tsc -b && vite build`) lulus 100% tanpa error (exit code 0).
    - PM2 backend instance 2 (`ShippingApi`) sukses direstart dan online.
- [x] Implementasi Skeleton Shimmer Loading State pada Tombol Pairing Local Charge ([PairingLocalChargePage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/PairingLocalChargePage.tsx)):
  - **Kebutuhan**: Menampilkan animasi skeleton shimmer saat tombol pairing diklik (baik upload file Excel maupun input manual no. resi), menggantikan empty state atau data lama selama proses kalkulasi dan pencocokan data ke backend.
  - **Komponen Skeleton Shimmer (`PairingLocalChargeSkeleton`)**:
    - **Status Banner**: Banner info proses dengan spinning icon `RefreshCw`, teks panduan pencocokan data, dan progress shimmer bar.
    - **7 Kartu KPI Metrik**: Wireframe skeleton untuk 7 kartu ringkasan status (`Total Baris`, `Cocok`, `Selisih`, `Bill Belum Ada`, `Belum Exit`, `Sudah Exit`, `Tidak Ditemukan`).
    - **Toolbar**: Skeleton bar pencarian dan counter jumlah baris.
    - **Tabel Spreadsheet 12-Kolom Presisi**: Menampilkan header kolom spreadsheet penuh (`#`, `Date`, `Receipt No`, `Customer`, `From`, `Ctn`, `Kg`, `Cbm`, `Charge`, `Shipping Mark`, `Inv No`, `Validation`) dengan 8 baris shimmer sel terdistribusi rata kanan/kiri sesuai tipe datanya, sehingga transisi ke data riil bebas pergeseran layout (*zero layout shift*).
  - **Dukungan Multi-Tema & Mode Gelap**: Menggunakan class `.skeleton-shimmer` bawaan yang dinamis dan ergonomis di seluruh tema (Heritage, Ocean, Emerald, Amber, Midnight).
  - **Kamus Terjemahan**: Menambahkan key `skeletonTitle` dan `skeletonSubtitle` di `id.json` & `en.json`.
  - **Verifikasi**: Build frontend (`tsc -b && vite build`) sukses 100% (2.93s).
- [x] Perbaikan Presisi Layout PDF Bill Sesuai Gambar Referensi ([PrintPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/PrintPage.tsx) & [ReportDesignerPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/ReportDesignerPage.tsx)):
  - **Single Line Description Clipping (Gambar 1)**:
    - Sesuai tampilan asli FoxPro pada gambar 1 (`media_1789097989970.png`), teks deskripsi menggunakan `white-space: nowrap; overflow: hidden; text-overflow: clip;` dengan tinggi baris konsisten single-line.
    - Mencegah teks panjang menimpa/menabrak kolom `UNIT PRICE`. Teks terpotong bersih sebelum garis pembatas kolom (seperti `PARCELS TO JAKARTA (M3) - DOOR LATCH, HINGE,`).
  - **Terbilang Dipindahkan ke Kolom Description (Gambar 2, Panah 1)**:
    - Sesuai arahan panah merah pada gambar 2 (`media_1789098021202.png`) dan koordinat FoxPro (`x = 111.75`), label `Terbilang` dan kalimat terbilang ditempatkan bersama di dalam **Kolom 2 (`DESCRIPTION`)** dengan layout flex (`gap: 16px`), sedangkan Kolom 1 (`QTY`) dibiarkan kosong (`<td>&nbsp;</td>`).
  - **Penataan Posisi `Printed by :Ferly` (Gambar 2, Panah 2)**:
    - Sesuai arahan panah merah pada gambar 2 (`media_1789098021202.png`), posisi `Printed by :Ferly` disesuaikan agar sejajar di bawah kolom `AMOUNT` dan kotak total nilai tagihan (`padding-right: 5.5mm; font-size: 5.5pt; font-family: Arial`), tidak lagi menempel di tepi paling kanan kertas.
  - **Verifikasi**: Build frontend (`tsc -b && vite build`) sukses 100% (2.89s).
- [x] Validasi Status `BELUM_EXIT` Berdasarkan `tbMarking.fdExitDate` pada Pairing Local Charge ([pairing-local-charge.service.ts](file:///c:/shipping/backend/src/modules/billing/pairing-local-charge.service.ts)):
  - **Kebutuhan**: Pada Pairing Local Charge, periksa `fdMarkingCode` pada `tbMarking`. Apabila belum ada `fdExitDate`, status validasi menjadi **`BELUM_EXIT`** (bukan "Sudah Exit (-)" atau "Bill Belum Dibuat").
  - **Penerapan**:
    - Query `tbMarking` dan `tbDelivery` kini mengambil seluruh kode marking dari `entriesList` (`fdMarkingCode`, `fdMarkingCodeAsal`) maupun dari kolom Excel / parser.
    - Menambahkan helper `resolveOperationalStatus(code, markingMap, deliveriesList)`: mengecek `Boolean(m.fdExitDate)`. Jika null, prefix status menjadi `Belum Exit (ETA: ...)`.
- [x] Perbaikan Validasi Berat & Overweight pada Bill Reguler ([useOverweightValidation.ts](file:///c:/shipping/frontend/src/features/billing/hooks/useOverweightValidation.ts), [useBillingValidation.ts](file:///c:/shipping/frontend/src/features/billing/hooks/useBillingValidation.ts), [BillingValidationSummaryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationSummaryModal.tsx)):
  - **Penyebab Masalah**:
    - SP `get_m3_listcode` mengembalikan kolom `TotalJmlBeratSJ` yang merupakan akumulasi seluruh berat dalam satu marking (misal 496 kg untuk 4 entry list).
    - Pada invoice **Bill Reguler** (single listcode seperti `GZS-010250-09-2026`), evaluasi berat sebelumnya memakai `totalJmlBeratSJ` (496 kg) menggantikan berat listcode riil (`fdJmlBeratGudang` / `fdBeratList` = 175 kg).
    - Akibatnya timbul false positive muatan overweight (+166.58 kg), `isPhysicalValid` menjadi `false`, dan verdict modal turun ke peringatan overcharge/overweight.
  - **Perbaikan**:
    - Pada [useOverweightValidation.ts](file:///c:/shipping/frontend/src/features/billing/hooks/useOverweightValidation.ts): Jika `isGabungan = true`, gunakan `komplain > perMarking > sj`. Jika `isGabungan = false` (Bill Reguler), gunakan berat listcode tunggal: `komplain > gudang > list`.
    - Pada [useBillingValidation.ts](file:///c:/shipping/frontend/src/features/billing/hooks/useBillingValidation.ts): `airCandidates` hanya menyertakan `beratSJ` jika `isGabungan = true`.
    - Pada [BillingValidationSummaryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationSummaryModal.tsx): Validasi kecocokan berat gudang per marking hanya aktif saat `isGabungan = true`.
  - **Verifikasi**: Build frontend `tsc -b && vite build` sukses 100% (code 0).
- [x] Pengecekan Menyeluruh & Penyelarasan Skala Font & Spacing UI:
  - **Kebutuhan**: Menyelaraskan seluruh modal, toolbar filter, kartu metrik KPI, tabel data ERP, dan footer di seluruh modul aplikasi sesuai standar hierarki visual:
    1. **Header Modal**: Judul modal `15px font-bold font-[var(--font-label)] uppercase tracking-wide`, Subtitle `12px`, Chip counter `11px`.
    2. **Tab & Toolbar**: Tombol tab & search input `12px` (padding kompak `5px 10px` / `px-2.5 py-1.25`), Segmented buttons `11.5px`, Context bar `11.5px`.
    3. **Kartu Metrik KPI**: Angka KPI utama `18px font-bold tabular-nums`, Label KPI `10.5px uppercase tracking-wider font-semibold`, Footer/Unit `11px – 11.5px`.
    4. **Tabel Data**: Header kolom (`thead th`) `11px uppercase tracking-wider font-semibold` (padding `8px 12px` / `py-2 px-3`), Baris data (`tbody td`) `12px` (meta teks `11px`), Footer tabel (`tfoot td`) `12px font-bold`.
    5. **Footer Bar**: Keterangan ringkasan `12px`, Tombol Tutup/Aksi `12px font-semibold` (`px-4 py-1.5`).
  - **Komponen yang Disesuaikan**:
    - [BillResiMarkingModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillResiMarkingModal.tsx)
    - [TargetPriceCheckModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/TargetPriceCheckModal.tsx)
    - [CustomerBillingHistoryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustomerBillingHistoryModal.tsx)
    - [CustomerTariffAuditModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustomerTariffAuditModal.tsx)
    - [PriceListDetailModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/PriceListDetailModal.tsx)
    - [BatchDetailModal.tsx](file:///c:/shipping/frontend/src/features/shipment-batches/components/BatchDetailModal.tsx)
    - [ShipmentDetailModal.tsx](file:///c:/shipping/frontend/src/features/shipments/components/ShipmentDetailModal.tsx)
    - [CustomerDetailModal.tsx](file:///c:/shipping/frontend/src/features/customers/components/CustomerDetailModal.tsx)
    - [ConfirmModal.tsx](file:///c:/shipping/frontend/src/components/ui/ConfirmModal.tsx)
    - [CustMarkingDetailModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustMarkingDetailModal.tsx)
    - [BillingValidationSummaryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationSummaryModal.tsx)
  - **Verifikasi**: Build frontend (`tsc -b && vite build`) lulus 100% tanpa error (exit code 0).
- [x] Perbaikan Layout Cetak PDF Invoice ([PrintPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/PrintPage.tsx) & [billing.service.ts](file:///c:/shipping/backend/src/modules/billing/billing.service.ts)):
  - **Rata Vertikal Teks & Data Header**:
    - Menyelaraskan teks label dan nilainya pada `BILL NO`, `DATE`, `SALES`, dan `COLLECTOR` agar rata tengah secara vertikal (`display: flex; align-items: center; line-height: 1`).
  - **Perbaikan Deskripsi Terpotong**:
    - Memperbaiki clipping teks pada kolom Description tabel invoice dengan mengubah styling `.cell-desc`, `.split-desc`, dan `.desc-text` menjadi `overflow: visible; line-height: 1.4; padding: 3.5px 6px 3.5px 8px; padding-bottom: 2px` sehingga descender huruf tidak terpotong saat rendering cetak/PDF.
  - **Penataan "Printed by"**:
    - Dibuat rapat dengan garis di atasnya (`margin-top: 0px; padding-top: 0px`).
    - Menggunakan font `Arial Narrow`, ukuran `5pt`, style `Normal` (`font-style: normal; font-weight: normal`).
  - **Lookup Sales Data dari `tbSales`**:
    - Backend `getBillingById` di [billing.service.ts](file:///c:/shipping/backend/src/modules/billing/billing.service.ts) melakukan lookup ke `tbSales` on `LTRIM(RTRIM(c.fdSalesNM)) = LTRIM(RTRIM(s.fdSalesNM))` untuk menarik `fdSalesCode`.
    - Frontend [PrintPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/PrintPage.tsx) memprioritaskan `data.customer?.fdSalesCode` (fallback ke `fdSalesNM`).
  - **Verifikasi**: PM2 backend online dan frontend build (`tsc -b && vite build`) lulus 100% tanpa error.
- [x] Penambahan Tab Form Input Manual No. Resi (Multi) pada Pairing Local Charge:
  - **Kebutuhan**: Menyediakan alternatif pencarian/pairing data selain unggah file Excel, berupa tab switcher yang memuat form textarea untuk input banyak nomor resi sekaligus (newline, koma, titik koma, spasi).
  - **Backend**:
    - Method `processPairingByReceiptNos(rawReceiptInput)` di [pairing-local-charge.service.ts](file:///c:/shipping/backend/src/modules/billing/pairing-local-charge.service.ts): Token parsing, auto-split nomor resi koma (`HK260703-014,5`), batch query sargable index ke `tbEntryList`, `tbCustomers` (SSOT nama customer), `tbBilling`, `tbBillingDetail`, serta status operasional tracking (`tbMarking` + `tbDelivery`).
    - Endpoint `POST /api/billing/pairing-local-charge/by-receipts` di [billing.routes.ts](file:///c:/shipping/backend/src/modules/billing/billing.routes.ts).
  - **Frontend**:
    - Service `billingApi.pairingLocalChargeByReceipts` di [billing.service.ts](file:///c:/shipping/frontend/src/features/billing/services/billing.service.ts).
    - Tab Switcher di [PairingLocalChargePage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/PairingLocalChargePage.tsx):
      - Tab 1: `Upload File Excel` (drag & drop dropzone yang sudah ada).
      - Tab 2: `Input Manual No. Resi` (textarea multi resi dengan counter resi otomatis, tombol Tempel Contoh, tombol Bersihkan, dan tombol Proses Pairing Resi).
    - Desain sesuai Midnight dark mode (`bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)]`).
    - Kamus i18n dual-bahasa di `id.json` dan `en.json`.
  - **Verifikasi**:
    - Build frontend (`tsc -b && vite build`) sukses 100% (code 0).
    - PM2 Backend instance 2 (`ShippingApi`) sukses direstart dan berstatus online.
- [x] Penegakan Single Source of Truth Master Customer (`tbCustomers.fdCustName`):
  - **Penyebab**: SP `dbo.get_qr_tbm3_perMarking_plus_rasio` melakukan `LEFT JOIN tbCustomersHarga` sehingga nama yang ditarik adalah salinan dari `tbCustomersHarga` (misal `HSK/WK` alih-alih `HSG/WK`).
  - **Solusi Backend**: Di [m3-check.service.ts](file:///c:/shipping/backend/src/modules/m3-check/m3-check.service.ts), `getM3CustPerMarkingDetails` kini selalu menimpa `fdCustName` dengan nama resmi dari master `tbCustomers`.
  - **Solusi Frontend**:
    - [CustMarkingDetailModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustMarkingDetailModal.tsx): Menambahkan prop `custName` dan memprioritaskannya di atas data row.
    - [BillingValidationCard.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationCard.tsx): Meneruskan `custName={res.customer?.fdCustName}` ke modal.
  - **Dokumentasi Wajib**: Menambahkan aturan permanen di [.agents/AGENTS.md](file:///c:/shipping/.agents/AGENTS.md) agar seluruh AI Agent selalu memprioritaskan `tbCustomers.fdCustName`.
  - **Verifikasi**: PM2 Backend restart sukses & build frontend (`tsc -b && vite build`) lulus 100%.
- [x] Penambahan Fitur Export Excel 2 Sheet pada [CustMarkingDetailModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustMarkingDetailModal.tsx):
  - **Sheet 1 ("Ringkasan Marking")**: Berisi seluruh baris data listcode/marking dari modal lengkap (No, No. Invoice, Tgl Inv, Cabang, No. Listcode, No. Resi, Marking, Komoditas, Mode, Qty Coly, Berat Kg, Volume M3, Rasio kg/m3, VFC, Status Overweight, Finansial).
  - **Sheet 2 ("Detail Ukuran Gudang")**: Menyesuaikan format persis seperti script FoxPro:
    - **Header Blok Item**: Baris 1: `fdCustName`, Baris 2: `fdTerima`, Baris 3: `fdMarkingCode` (Listcode), Baris 4: `fdMarkingNo` (Marking).
    - **Header Kolom**: `PJG` | `LBR` | `TNG` | `QTY` | `M3` | `DESKRIPSI`.
    - **Baris Detail**: Nilai numerik `fdPjg`, `fdLbr`, `fdTng`, `fdQty`, dan `M3 = ROUND(P * L * T * Qty / 1000000, 4)`.
    - **Baris TOTAL**: Tulisan `"TOTAL :"` di kolom QTY dan nilai `lnTotalM3` (4 digit desimal) di kolom M3.
    - **Pemisah**: Jeda 2 baris kosong antar blok item.
  - **Backend API & Service**:
    - Method `getBatchEntryListDetails(listCodes)` di [billing.service.ts](file:///c:/shipping/backend/src/modules/billing/billing.service.ts) dengan query batch ke `tbEntryListDetail`.
    - Endpoint `POST /api/billing/entry-list-details` & `GET /api/billing/entry-list-details` di [billing.routes.ts](file:///c:/shipping/backend/src/modules/billing/billing.routes.ts).
    - Service frontend `billingService.entryListDetails(listCodes)` di [billing.service.ts](file:///c:/shipping/frontend/src/features/billing/services/billing.service.ts).
  - **UI & Ekspor**:
    - Tombol "Export Excel" dengan ikon spreadsheet & loading state saat mengunduh di header modal.
    - Styling `.export-excel-btn` responsif multi-tema & Midnight dark mode (`border-emerald-500/40 text-emerald-400 bg-transparent`).
  - **Verifikasi**: PM2 Backend online dan frontend build (`tsc -b && vite build`) sukses (code 0).
- [x] Penambahan Tombol Copy No. Invoice pada [ValidationDetailPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/ValidationDetailPage.tsx):
  - Menambahkan tombol copy ikon (`Copy` / `Check`) tepat di samping nomor invoice pada top header bar.
  - Menyimpan nomor invoice (`data.fdInvNo`) ke clipboard serta memunculkan toast notifikasi sukses.
  - Verifikasi build frontend (`tsc -b && vite build`) sukses 100% tanpa error.
- [x] Perbaikan Toast Duplikat saat Klik Tombol PDF di Modal Tagihan:
  - **Penyebab**: Komponen [BillingPrintButtons.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingPrintButtons.tsx) terpasang di 2 tempat secara bersamaan (di halaman induk `ValidationDetailPage` dan di dalam `BillingValidationSummaryModal`), sehingga saat event `window.postMessage` (`BILLING_PDF_DOWNLOADED`) ditembakkan, kedua listener menangkap event tersebut dan memanggil `addToast` secara bersamaan.
  - **Solusi**:
    1. Menambahkan deduplikasi event download di [BillingPrintButtons.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingPrintButtons.tsx) via `lastDownloadToastMap`.
    2. Menambahkan deduplikasi tanda tangan pesan (`signature deduplication` < 1000ms) di level global [toastStore.ts](file:///c:/shipping/frontend/src/stores/toastStore.ts) agar notifikasi identik yang dipicu bersamaan dicegah muncul ganda.
  - Verifikasi build frontend (`tsc -b && vite build`) sukses 100% tanpa error.
- [x] Penambahan 2 Digit Desimal pada Box Total Nilai Tagihan di [BillingValidationSummaryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationSummaryModal.tsx):
  - Menggunakan formatter `formatWithCurrency(totalAmount, currency)` sehingga box **TOTAL NILAI TAGIHAN** selalu menampilkan 2 digit desimal (misal `Rp. 1,500,000.00` atau `USD 1,234.50`).
  - Verifikasi build frontend (`tsc -b && vite build`) sukses 100% tanpa error.
- [x] Penambahan Warna Border Hijau & Status Cocok pada Kartu Dimensi Tab Validasi M3 di [BillingValidationSummaryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationSummaryModal.tsx):
  - Kartu dimensi (`Ditagihkan`, `Ukuran Gudang`, `Packing List`, `Komplain Fisik`) kini otomatis memiliki border hijau tebal (`border-2 border-emerald-500/80 bg-emerald-500/5`), badge status `✓ Cocok` / `✓ Billed`, dan highlight per-marking hijau saat nilainya sesuai dengan dimensi yang ditagihkan.
  - Verifikasi build frontend (`tsc -b && vite build`) sukses 100% tanpa error.
- [x] Penambahan Data M3 per Marking pada Kartu Metrik Tab Validasi M3 di [BillingValidationSummaryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationSummaryModal.tsx):
  - Menambahkan baris sub-value `Per Marking:` pada 3 kartu metrik dimensi di Tab "Validasi M3":
    - **Ukuran Gudang**: Menampilkan volume/berat per marking (`res.m3CustPerMarking` / `res.totalBeratPerMarking`).
    - **Packing List**: Menampilkan volume PL per marking (`res.m3PLPerMarking`).
    - **Komplain Fisik**: Menampilkan volume komplain per marking (`res.m3KomplainPerMarking`).
  - Menyelaraskan kartu **Ditagihkan** dengan sub-line satuan agar layout 4 kartu grid tetap simetris, rapi, dan konsisten.
  - Verifikasi build frontend (`tsc -b && vite build`) sukses 100% tanpa error.
- [x] Penyelarasan Skala & Ukuran Font pada [CustMarkingDetailModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustMarkingDetailModal.tsx):
  - Mengurangi ukuran font yang sebelumnya terlalu besar agar proporsional dan selaras dengan modal lain (`BillResiMarkingModal`, `TargetPriceCheckModal`, `BillingValidationSummaryModal`):
    - **Header**: Judul modal disesuaikan ke `15px / text-xs font-bold font-[var(--font-label)] uppercase tracking-wide` (sebelumnya `22px`), subtitle `12px`, chip `11px`.
    - **Tab & Filter**: Tab cabang `12px` (padding `5px 10px`), search box & input `12px`, segmented buttons `11.5px`.
    - **Kartu Metrik KPI**: Nilai angka KPI disesuaikan ke `18px font-bold` (sebelumnya `22px`), label KPI `10.5px uppercase`, unit & footer `11px-11.5px`.
    - **Tabel**: Header kolom (`thead th`) `11px uppercase tracking-wider`, isi baris data (`tbody td`) `12px` (sebelumnya `13.5px`), meta keterangan `11px`, footer tabel `12px font-bold`.
    - **Footer Modal**: Keterangan footer `12px`, tombol tutup `12px font-semibold`.
  - Verifikasi build frontend selesai tanpa error.
- [x] Perbaikan False Positive Deteksi Baterai & Pemetaan Komoditas (`tbCommodityMapping`):
  - **Penyebab**: Selain fungsi `isGenuineBattery`, terdapat aturan global di database `tbCommodityMapping` (`BATTERY -> SEMI GARMENT, BY SEA`). Pada saat pencocokan pemetaan komoditas di `billing.utils.ts`, `m3-check.service.ts`, `price-check.service.ts`, dan `commodity-mapping.service.ts`, kata `BATTERY` dari deskripsi `... BATTERY CASE` mencocokkan mapping global tersebut karena belum memiliki filter guard `isGenuineBattery`.
  - **Solusi**: Menambahkan guard `isGenuineBattery` pada seluruh alur pencocokan `tbCommodityMapping` baik di frontend (`billing.utils.ts`) maupun backend (`m3-check.service.ts`, `price-check.service.ts`, `commodity-mapping.service.ts`) agar pemetaan `BATTERY` / `SEMI GARMENT` hanya aktif jika komoditas terbukti merupakan unit baterai fisik asli.
  - **Verifikasi**: Build frontend lulus 100% tanpa galat.
- [x] Perbaikan False Positive Deteksi Baterai (`isGenuineBattery`) pada Multi-Item Komoditas:
  - **Penyebab**: Deskripsi multi-item `... MODEL, BATTERY CASE` memicu deteksi kombinasi `,\s*BATTERY` sehingga mengabaikan pengecekan kata penjelas aksesoris (`CASE`) dan salah diklasifikasikan sebagai `SEMI GARMENT`.
  - **Solusi**: Memperbaiki fungsi `isGenuineBattery` di `backend/src/modules/billing/billing-category.matcher.ts`, `frontend/src/features/billing/utils/billing.utils.ts`, dan `frontend/src/features/price-list/utils/commodityMatcher.ts` untuk memisahkan segment/token sebelum validasi murni baterai vs aksesoris (`BATTERY CASE`, `BATTERY CHARGER`, `BATTERY HOLDER`, dll).
  - **Verifikasi**: Pengujian 12 test case (termasuk string pengguna) lulus 100% dan build frontend lulus tanpa error.
- [x] Penggantian Istilah SJ menjadi Listcode pada [CustMarkingDetailModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustMarkingDetailModal.tsx):
  - Mengganti seluruh visual label dan teks `SJ` menjadi `Listcode`:
    - Header counter: `${normalizedRows.length} Listcode` / `${finalFilteredRows.length} dari ${normalizedRows.length} Listcode`.
    - Tab filter cabang: `Semua · X Listcode`, `${bg.branchCode} · X Listcode · Y kg`.
    - Search placeholder: `Cari invoice, Listcode, resi, marking, komoditas…`.
    - Context bar: counter komplain Listcode & status kelengkapan data PL Listcode.
    - KPI card label selisih: `Listcode = Gdg`.
    - Header kolom tabel: `Invoice & Listcode`, `Qty (Gdg/Listcode)`, `Berat (Gdg/Listcode)`.
    - Metadata baris tabel: `Listcode {r.listCode} · Resi {r.terima}`, `Listcode: {formatNumber(r.qtySJ)}`, `Listcode: {formatDecimal(r.weightSJ, 1)} kg`.
    - Group header cabang & Footer tabel (`tfoot` dan modal footer bar).
  - Verifikasi build (`tsc -b && vite build`) berhasil 100% tanpa error.
- [x] Penyelarasan Tema Dinamis & Font Aktif pada [CustMarkingDetailModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustMarkingDetailModal.tsx):
  - **Dukungan Multi-Tema (Heritage, Ocean, Emerald, Amber, Midnight)**:
    - Seluruh warna dan background kini dinamis membaca token CSS tema aktif: `var(--color-primary)`, `var(--color-secondary)`, `var(--color-neutral)`, `var(--color-surface)`, `var(--color-border)`, `var(--color-tertiary)`, `var(--color-success)`, `var(--color-warning)`, `var(--color-danger)`.
    - Menggunakan fungsi `color-mix` untuk background transparan semantik (kartu status ok, badge rust/warning, hover baris tabel).
    - Menghilangkan warna hex hardcoded di modal sehingga tampilan otomatis berganti tema secara konsisten saat tema diubah di UI.
  - **Penyelarasan Font Tema Aktif**:
    - Judul modal menggunakan `var(--font-display)` (`Fraunces`).
    - Body text, label, toolbar, dan deskripsi menggunakan `var(--font-body)` (`Public Sans`).
    - Angka tabular, chip count, dan metrik KPI menggunakan `var(--font-label)` (`Space Grotesk`).
  - **Kepatuhan Mode Gelap (Midnight Dark Mode)**:
    - Tab aktif, tombol footer, dan button segmented tidak lagi menggunakan latar putih solid di mode gelap, melainkan transparent outline border dengan warna aksen `var(--color-tertiary)` sesuai standar AGENTS.md.
- [x] Redesign Presisi [CustMarkingDetailModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustMarkingDetailModal.tsx) Sesuai Desain HTML Mockup:
  - **Tipografi & Desain Hangat (Warm Limestone / Paper Palette)**:
    - Font serif `Fraunces` untuk judul modal utama, `Public Sans` untuk label & teks deskriptif, dan `Space Grotesk` untuk angka tabular / metrik.
    - Sistem warna terisolasi: `--ink: #1C1B18`, `--limestone: #F6F3EC`, `--paper: #FFFFFF`, `--rust: #B5502F`, `--ok-bg: #E7EFE6`, `--warn-bg: #FBF0DD`.
  - **Header & Subtitle Dinamis**:
    - Chip counter jumlah SJ (`12 SJ` / `X dari Y SJ`) + chip rust Rasio (`Rasio 700 kg/m³`) + chip komplain.
    - Subtitle terintegrasi: `Cust · Marking · Komoditas · Mode Pengiriman`.
  - **Filter Cabang Berbasis Tab**:
    - Tab "Semua" + tombol tab per cabang aktif (`GZ · 8 SJ · 3.411 kg`, `YW · 4 SJ · 2.155 kg`) dengan kalkulasi live.
  - **4 Kartu Metrik KPI Eksekutif**:
    1. *Split Card*: Berat total kg & Qty coly + status selisih surat jalan vs gudang.
    2. *Volume Gudang*: Angka m³ gudang + footer M³ Bill.
    3. *Volume PL*: Angka m³ packing list + footer selisih Gdg–PL (highlight warna rust jika ada selisih).
    4. *Status Overweight*: Badge `status-ok` hijau (`✓ Aman` / PL delta kg) atau peringatan overweight.
  - **Context Bar Ringkas**:
    - Menggantikan badge per-baris yang berulang dengan 3 informasi ringkas: counter komplain terdata, counter SJ tanpa data PL, dan rekor selisih Gdg–PL terbesar.
  - **Tabel 6-Kolom Terkondensasi & Inline Branch Grouping**:
    - Kolom utama: `#` | `Invoice & SJ` | `Marking & Komoditas` | `Qty` | `Berat` | `Volume (Gdg / PL)`.
    - Sel volume menggabungkan `Gdg / PL` berdampingan dengan delta `+ / -` berwarna semantik hijau/rust/muted di bawahnya.
    - Baris pengelompokan cabang (`branch-group-row`) hadir inline di dalam tabel dengan pill cabang dan akumulasi berat.
    - Footer tabel (`tfoot`) dan footer modal menghitung grand total real-time sesuai pencarian dan filter aktif.
  - **Dukungan Preset Kolom**:
    - Segmented control untuk berpindah tampilan: `Semua Kolom`, `Fisik (M³/KG)`, `Komplain`, `Financial`.
- [x] Tampilan Tabel ERP Modern Lengkap (Semua Kolom) pada [CustMarkingDetailModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustMarkingDetailModal.tsx):
  - **Desain Enterprise ERP Modern (Grouped Super-Headers)**:
    - Menampilkan seluruh 28+ data dari Stored Procedure `dbo.get_qr_tbm3_perMarking_plus_rasio` secara terorganisir rapi dalam 6 kelompok super-header berjenjang:
      1. **Identitas & Pengiriman**: `#` (sticky), `No. Invoice` (sticky), `Tgl Inv`, `Cabang`, `No. SJ` (`fdListCode`), `No. Terima/Resi` (`fdTerima`), `Marking` (`fdMarkingNo`), `Komoditas & Tipe` (`fdComodity` + `fdComodityName`), `Mode` (UDARA/LAUT).
      2. **Kuantitas (Coly)**: `Gdg`, `SJ`, `PL`, `Komplain`.
      3. **Berat (KG)**: `Gdg`, `SJ`, `Komplain`, `Selisih`.
      4. **Volume (M³)**: `Gdg`, `PL`, `Komplain`, `Selisih`, `Bill`.
      5. **Rasio, VFC & Overweight**: `Rasio`, `VFC Gdg`, `VFC K`, `VFC Bill`, `Overweight`.
      6. **Finansial & Status**: `Nilai Inv`, `Tax`, `Status`, `Tipe Tagihan`.
  - **Sticky Identity Columns & Headers**:
    - Kolom `#` dan `No. Invoice` dikunci di sisi kiri (`sticky left-0` & `left-10`) dengan background solid surface dan drop-shadow pemisah sehingga identitas surat jalan tidak hilang saat scroll horizontal.
    - Super-headers dan sub-headers terkunci di bagian atas (`sticky top-0` & `top-[31px]`).
  - **Preset Kolom & Density Toggle**:
    - Pilihan Preset Cepat: `Semua Kolom`, `Fisik (M³/KG)`, `Komplain & Selisih`, `Finansial`.
    - Pilihan Kerapatan Baris: `Kompak` (High Density ERP) vs `Normal`.
  - **Grand Total Sticky Footer**:
    - Baris `tfoot` terkunci di bagian bawah menghitung total akumulasi real-time untuk seluruh kolom angka.
- [x] Restorasi & Peningkatan Visibilitas Data Komplain pada [CustMarkingDetailModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustMarkingDetailModal.tsx):
  - **Penyebab**: Pada perampingan desain sebelumnya, kolom komplain dan kartu KPI M3 Komplain terhapus dari tampilan visual modal, sehingga data komplain dari SP (`fdm3Komplain`, `fdTotalQtyKomplain`, `fdJmlBeratKomplain`) tidak muncul di layar.
  - **Fitur & Perbaikan**:
    1. **KPI Card M³ Komplain**: Menambahkan kembali kartu eksekutif `VOLUME M³ KOMPLAIN` dengan highlight border semantik amber (Midnight & Multi-theme compliant), menampilkan akumulasi `activeSummary.totalM3K` m³ dan counter jumlah SJ yang memiliki komplain.
    2. **Rincian Komplain di Tabel Desktop**:
       - Kolom Volume: Judul `Volume M³ (Gdg / PL / K)` dengan baris rincian `K: {r.m3K} m³` berlatar amber transparan lembut jika `r.m3K > 0`.
       - Kolom Berat: Menampilkan `K: {r.weightK} kg` saat ada komplain berat.
       - Kolom Qty: Menampilkan `K: {r.qtyK}` saat ada komplain coly.
       - Kolom Invoice: Badge `KOMPLAIN` jika baris memiliki selisih komplain.
    3. **Filter Cepat "Hanya Komplain"**: Menambahkan tombol toggle pill interaktif `Hanya Komplain` di samping filter cabang, yang secara instan menyaring data dan mengkalkulasi ulang seluruh KPI & total footer.
    4. **Mobile Card & Header**: Badge peringatan di header modal `⚠ Komplain: X SJ (Y m³)` dan rincian komplain terintegrasi pada mobile card view.
- [x] Redesign Modal Detail M3 per Marking ([CustMarkingDetailModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustMarkingDetailModal.tsx)):
  - **Konsolidasi Data & Eliminasi Redundansi**:
    - **Tabel 7-Kolom High-Density**: Menggabungkan 16 kolom yang membingungkan dan banyak kosong menjadi 7 kolom terpadu:
      1. `#` (Index)
      2. `No. Invoice & Cabang` (Invoice + Badge Cabang outline + Tgl Inv)
      3. `Marking & Komoditas` (Marking No + Komoditas & Tipe + Badge Tax)
      4. `Qty (Coly)` (Nilai aktif koli + rincian SJ/Komplain jika ada selisih)
      5. `Berat (kg)` (Nilai aktif berat + rincian SJ/Komplain jika ada selisih)
      6. `Volume M³` (M³ Gudang aktual + M³ PL + status M³ Bill)
      7. `Status Overweight` (Delta kg semantik: Aman vs Overweight)
    - **KPI Strip Ringkas**: Dari 6 kartu besar redundan menjadi 4 kartu eksekutif modern (Total Berat & Qty, Volume M³ Gudang, Volume M³ PL, Status Overweight).
  - **Total Interaktif Sesuai Filter Search & Cabang**:
    - Agregasi `activeSummary` dihitung reaktif dari hasil filter search dan branch secara real-time.
    - Pill cabang interaktif (`Semua`, `HK`, `GZ`, dll.) menampilkan live count & live berat/volume sesuai kata kunci yang sedang diketik.
    - Ketika user mengetik di search bar, angka KPI, live badge cabang, dan footer langsung terbarui mencerminkan data yang cocok.
  - **Verifikasi**:
    - `bun run build` sukses 100% (2.55s).
- [x] Implementasi Hirarki KG pada Validasi Compare M3 vs KG:
  - **Aturan Bisnis**: Hirarki KG yang dipakai pada kalkulasi perbandingan M3 vs KG adalah:
    1. **Berat Komplain** (`tbEntryListKomplain.fdJmlBeratKomplain`) jika > 0
    2. **Berat SJ / Gudang** (`tbDelivery.fdJmlBeratSJ` atau `tbEntryListGudang.fdJmlBerat`) jika > 0
    3. **Berat List** (`tbEntryList.fdJmlBerat`) sebagai fallback
  - **Perbaikan Backend**:
    - [billing-validation.service.ts](file:///c:/shipping/backend/src/modules/billing/billing-validation.service.ts): Pada `getType2ComparisonCheck`, menambahkan query paralel ke `tbEntryListKomplain`, `tbDelivery` (agregasi per customer), dan `tbEntryListGudang`. Nilai KG dievaluasi berurutan sesuai hierarki dan menyertakan metadata `kgSource` ('Komplain' | 'SJ' | 'Gudang' | 'List').
    - Verifikasi sampel invoice nyata `GZS-010202-09-2026`: Berat SJ (13.488 kg) berhasil terpilih menggantikan berat list (12.538 kg), sehingga total tagihan ideal presisi Rp 91.044.000 dan status validasi menjadi `EQUAL` (cocok 100% dengan billing aktual).
  - **Perbaikan Frontend**:
    - [useOverweightValidation.ts](file:///c:/shipping/frontend/src/features/billing/hooks/useOverweightValidation.ts): Menyelaraskan urutan `actualWeightKg` agar memprioritaskan `komplain > sj > gudang > list`.
    - [Type2ComparisonPanel.tsx](file:///c:/shipping/frontend/src/features/billing/components/Type2ComparisonPanel.tsx): Menampilkan label `kgSource` (misal: `SJ`, `Gudang`, `Komplain`, `List`) pada kolom KG di tabel perbandingan.
  - **Verifikasi**:
    - `bun run build` frontend sukses 100% (10.78s).
    - PM2 restart instance 2 (`ShippingApi`) sukses dijalankan.
- [x] Pemindahan List dari [DashboardPage.tsx](file:///c:/shipping/frontend/src/features/delivery-orders/pages/DashboardPage.tsx) ke [ListPage.tsx](file:///c:/shipping/frontend/src/features/delivery-orders/pages/ListPage.tsx):
  - **Dashboard Lebih Bersih**:
    - Seluruh tabel panjang, accordion status blocks (`open` & `closed`), filter mode (`BY SEA` / `BY AIR`), search bar, dan grouping per cabang/marking dipindahkan keluar dari Dashboard.
    - [DashboardPage.tsx](file:///c:/shipping/frontend/src/features/delivery-orders/pages/DashboardPage.tsx) kini menjadi **Clean Executive Dashboard**: hanya menampilkan kartu KPI metrik (Total SJ, Total Packages, Total Weight, SJ Bulan Ini), kartu ringkasan status pengiriman (Pending vs Delivered), dan shortcut navigasi langsung ke ListPage serta modul logistik terkait (Shipments & Batch Marking).
  - **ListPage Terpadu & Fleksibel**:
    - [ListPage.tsx](file:///c:/shipping/frontend/src/features/delivery-orders/pages/ListPage.tsx) kini menjadi pusat pengelolaan data surat jalan dengan **View Switcher**:
      1. **Tampilan Grouping DO**: Tab `BY SEA` / `BY AIR`, pencarian ter-debounce, pengelompokan Cabang/Marking/None, dan blok status Open/Closed.
      2. **Tampilan Tabel Flat**: Toolbar lengkap dengan view toggle `Table` / `Cards` dan pagination presisi.
  - **Verifikasi**:
    - `bun run build` sukses 100% (2.38s).
- [x] Standardisasi Penamaan File Halaman [delivery-orders/pages](file:///c:/shipping/frontend/src/features/delivery-orders/pages):
  - **Penyebab**: File sebelumnya melanggar aturan AGENTS.md karena:
    1. Mengulang nama domain pada file (`DeliveryOrdersListPage.tsx` -> ❌).
    2. Halaman grouping/dashboard dinamai `ListPage.tsx` padahal melayani rute dashboard utama `/delivery-orders`.
  - **Restrukturisasi**:
    - [DashboardPage.tsx](file:///c:/shipping/frontend/src/features/delivery-orders/pages/DashboardPage.tsx): Halaman ikhtisar Grouping DO & KPI metrics (sebelumnya `ListPage.tsx`).
    - [ListPage.tsx](file:///c:/shipping/frontend/src/features/delivery-orders/pages/ListPage.tsx): Halaman flat table daftar surat jalan (sebelumnya `DeliveryOrdersListPage.tsx`).
    - [DetailPage.tsx](file:///c:/shipping/frontend/src/features/delivery-orders/pages/DetailPage.tsx): Standardisasi nama komponen menjadi `DetailPage`.
    - File usang `DeliveryOrdersListPage.tsx` dihapus.
  - **Routing & Export**:
    - Update [delivery-orders/index.ts](file:///c:/shipping/frontend/src/features/delivery-orders/index.ts): Export `DashboardPage`, `ListPage`, `DetailPage` beserta alias backward compatibility.
    - Update [router.tsx](file:///c:/shipping/frontend/src/app/router.tsx): Lazy import menggunakan `m.DashboardPage`, `m.ListPage`, dan `m.DetailPage`.
  - **Verifikasi**:
    - `bun run build` sukses 100% (4.39s & 2.49s).
- [x] Perbaikan deteksi komoditas laptop pada sparepart/screen ("LAPTOP SCREEN & SCREEN PARTS"):
  - **Penyebab**: String matching `tbCommodityMapping` ID 10 (`commodityName='LAPTOP'`, `targetCommodity='Laptop (Selain Merek Apple Price per kg, Min. 3pcs)'`, `mode='BY AIR'`) sebelumnya memakai loose matching `includes('LAPTOP')` tanpa memeriksa mode pengiriman (`isAir` vs LAUT) dan tanpa guard `isGenuineLaptop()`. Akibatnya, barang sparepart pengiriman Laut terpetakan ke unit Laptop utuh non-Apple.
  - **Perbaikan Backend**:
    - [m3-check.types.ts](file:///c:/shipping/backend/src/modules/m3-check/m3-check.types.ts): Menambahkan `mode?: string | null` ke `commodityMappings`.
    - [m3-check.service.ts](file:///c:/shipping/backend/src/modules/m3-check/m3-check.service.ts): Memfilter `commodityMappings` berdasarkan mode pengiriman dan menerapkan guard `!isGenuineLaptop` & `!isGenuineIpad`.
    - [billing-category.matcher.ts](file:///c:/shipping/backend/src/modules/billing/billing-category.matcher.ts): Menambahkan guard `isGenuineLaptop` & `isGenuineIpad` di Step 3 (synonym group) & Step 4 (word-boundary prefix match) agar tidak mencocokkan kata 'LAPTOP' pada nama sparepart ke kategori unit laptop.
    - [price-check.service.ts](file:///c:/shipping/backend/src/modules/price-check/price-check.service.ts): Menambahkan `matchesMode()` dan guard gadget valid di `resolveCommodityName` dan `determineCommodityOverride`.
    - [commodity-mapping.service.ts](file:///c:/shipping/backend/src/modules/commodity-mapping/commodity-mapping.service.ts): Memperbaiki filter mode dan guard gadget pada `resolveMappedCommodity`.
  - **Perbaikan Frontend**:
    - [billing.utils.ts](file:///c:/shipping/frontend/src/features/billing/utils/billing.utils.ts): Memfilter `m.mode` (AIR vs SEA) pada `evaluateItemPrice`, menambahkan guard `isGenuineLaptop` & `isGenuineIpad` sebelum memetakan ke mapping laptop, serta validasi ganda pada `directComodityName`.
  - **Verifikasi**:
    - Invoice `HKS-000995-09-2026` (listCode `0938947`, LAUT, komoditas `"LAPTOP SCREEN & SCREEN PARTS (11 PLTS)"`) terverifikasi sukses dipetakan ke **`General Goods`** / **`UMUM`** (bukan unit Laptop fisik).
    - `bun run build` di frontend berhasil 100% tanpa error.
    - PM2 restart instance 2 (`ShippingApi`) sukses dijalankan.
- [x] Hapus panel validasi perbandingan M3 vs KG (`Type2ComparisonPanel`) dari [DetailPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/DetailPage.tsx)
- [x] Perbaikan tampilan [ValidationListPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/ValidationListPage.tsx):
  - **Skeleton Shimmer**: Ditambahkan `ValidationListPageSkeleton` dengan class `.skeleton-shimmer` wireframe penuh (PageHeader, search bar, mode filter, PIC author pills, dan 6 baris table shimmer / 4 kartu mobile shimmer) saat initial load.
  - **Empty State**: Menggunakan komponen `<EmptyState>` standar dengan 2 kondisi semantik (Antrean Kosong vs Filter Nihil).
  - **i18n & Dark Mode**: Memperbaiki fallback raw string `billing.noBillingData` di `id.json` & `en.json`, dan perbaikan token warna progress bar.
- [x] Fix penentuan `isType2` pada validasi billing: `fdListType` (1=udara, 2=laut) dihapus dari evaluasi `isType2`, murni mengacu ke `fdTypeTagihan` (tipe 2)
- [x] Fix unused TS variable `billFdListType` di [BillingValidationCard.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationCard.tsx)
- [x] Rancang Implementation Plan fitur 'Pairing Local Charge' (Lengkap dengan Sistem Role RBAC & 6 Langkah Terukur)
- [x] Implementasi fitur 'Pairing Local Charge' (Backend parser + batch query, Frontend UI grid spreadsheet + download/print, RBAC permission)
- [x] Fix Timeout Pairing Local Charge (Query sargable index + Axios timeout 120s)
- [x] Fix Salah Invoice & URL `%02`:
  - Mengubah urutan prioritas pencarian: `Receipt No` (`fdTerima`) dijadikan **Prioritas 1** (karena unik per transaksi pengiriman) sebelum fallback ke `Shipping Mark` (yang sering dipakai berulang kali untuk banyak pengiriman berbeda).
  - Sanitasi karakter non-printable / control character ASCII (seperti `\u0002` STX) pada backend dan frontend URL link invoice.
  - Hasil verifikasi baris `HK260703-007` (`UC/BOBO`, `JSP/HQ NO.33`): invoice sekarang akurat **`HKA-000744-07-2026`**, Charge DB **250**, status **`COCOK`**.
- [x] Support Multiple Invoice per Baris Excel (Pemisah Koma):
  - Mengubah `entriesList.find` menjadi `filter` agar seluruh pecahan receipt (contoh `HK260703-014` dan `HK260703-015`) tertampung.
  - Menghimpun seluruh invoice terkait ke dalam `invNos: string[]`.
  - Frontend menampilkan daftar link untuk seluruh nomor invoice yang ditemukan secara rapi (contoh `HKS-000920-08-2026`, `HKS-B00954-08-2026`, `HKS-C00954-08-2026`).
  - Akumulasi total charge DB dari seluruh item billing/entry list yang cocok.
- [x] Perbaiki padding halaman `PairingLocalChargePage`:
  - Menambahkan kelas padding responsif standar ERP (`p-3 sm:p-6 lg:p-8 w-full`) yang konsisten dengan halaman ERP lainnya (`ValidationListPage`, `DetailPage`).
- [x] Rebuild frontend sukses & restart PM2 instance 2 (`ShippingApi`). Local Charge selesai diimplementasikan

### Task Pending / Backlog
- [ ] *(Belum ada)*

---

## 🗂️ Konteks Fitur Aktif

### Fitur yang Sedang Dikembangkan
| Domain | Status | Catatan |
|---|---|---|
| `billing` | 🟢 Completed | Fitur Pairing Local Charge selesai diimplementasikan |

### File Yang Baru Diubah
| File | Perubahan |
|---|---|
| `backend/src/modules/m3-check/m3-check.service.ts` | Tambah query paralel `get_berat_delivery_sj` per `fdListCode` dan populate `fdBeratSJ` |
| `frontend/src/features/billing/hooks/useBillingValidation.ts` | Tambah komparasi 3 sumber berat (list, sj, komplain) dengan threshold 0.1 kg & kaitkan ke `isPhysicalValid` |
| `frontend/src/features/billing/components/BillingValidationSummaryModal.tsx` | Status bar Kesesuaian Berat Fisik & 3 kartu ringkasan berat di Tab M3 & Berat |
| `frontend/src/features/billing/components/BillingValidationCard.tsx` | Integrasi bobot SJ pada kartu validasi & alert selisih berat |
| `frontend/src/lib/i18n/id.json` & `en.json` | Key i18n untuk validasi berat fisik |

---

## 🧠 Keputusan Desain / Arsitektur Yang Sudah Diputuskan

| Topik | Keputusan | Tanggal |
|---|---|---|
| Midnight theme colors | `bgColor=#0B0F17`, `surfaceColor=#151D2A` | 2026-09-10 |
| Feature folder | Sub-folder `constants/`, `stores/`, `utils/` opsional | 2026-09-10 |
| API endpoint const | Format `camelCase` | 2026-09-10 |
| `fdListType` semantik | `fdListType` = moda pengiriman (1=udara, 2=laut), **bukan** type tagihan | 2026-09-10 |
| `isType2` source | `isType2` hanya dari `res.profileHarga.typeTagihan === 2`, bukan `fdListType` | 2026-09-10 |

---

## ⚠️ Isu Aktif / Known Issues

| Isu | Dampak | Status |
|---|---|---|
| *(Belum ada isu tercatat)* | — | — |

---

## 📝 Catatan Kontekstual Penting

- Backend module `marking` dan `price-check` ada di backend tapi **tidak ada** frontend feature-nya (masih diakses via modul lain)
- Frontend `user-management` → backend menggunakan module `users` + `roles` (nama berbeda)
- `BILLING_VALIDATION_DETAIL_PATH` di ROUTES adalah path pattern (bukan fungsi), tidak ada di daftar shorthand ROUTES
- Billing adalah fitur paling kompleks: punya `constants/`, `stores/`, `utils/`, `hooks/` khusus

---

## 📌 Protokol Update (WAJIB)

Setiap AI Agent **WAJIB** mengupdate file ini sebelum mengakhiri sesi jika:
1. Ada task baru yang dimulai → tambahkan ke "Task Sedang Berjalan"
2. Ada task yang selesai → pindahkan ke "Task Selesai" dengan tanda `[x]`
3. Ada keputusan desain/arsitektur baru → tambahkan ke tabel "Keputusan Desain"
4. Ada file yang diubah → tambahkan ke "File Yang Baru Diubah" (cukup 5 terakhir)
5. Ada isu baru ditemukan → tambahkan ke "Isu Aktif"

**Format update header wajib:**
```
## 🕐 Terakhir Diperbarui
- **Tanggal**: YYYY-MM-DD
- **Oleh**: [Nama Agent / Model]
- **Sesi**: [Deskripsi singkat task sesi ini]
```
