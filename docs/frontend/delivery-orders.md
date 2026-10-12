# 🚚 Modul Surat Jalan & Inventori Gudang (`src/features/delivery-orders/`)

Pusat kendali distribusi pengantaran barang, inventori kargo masuk gudang (`fdListCode`), penerbitan Surat Jalan baru, riwayat pengiriman, dan pencetakan continuous form standar FoxPro.

---

## 1. Dashboard Pengantaran (`pages/DashboardPage.tsx`)
- **Pemantauan MTD vs MoM & YoY (`DeliveryMomYoySection.tsx`)**:
  - Navigasi bulan & tahun (`selectedYear`, `selectedMonth`) dengan tombol pintas *"Bulan Berjalan"*.
  - 5 Kartu KPI Komparatif: Total SJ, Total Koli, Tonase Berat (kg), SJ Sukses Terkirim (`Delivered`), Rata-rata Koli per SJ.
  - Grafik tren 12 bulan Recharts `ComposedChart` (Bar Total SJ + Dual Line Koli & Berat).
  - Matriks ringkasan komparasi 3 periode (MTD, MoM, YoY).
- **Alur Tahapan Gudang**:
  - *Stok Mengendap di Gudang (Ready to Ship)* $\to$ mengarah ke `ROUTES.DELIVERY_ORDERS_INVENTORY`.
  - *Kargo Selesai Terkirim (Delivered)* $\to$ mengarah ke `ROUTES.DELIVERY_ORDERS_LIST`.

---

## 2. Inventori Stok Kargo di Gudang / Buat SJ (`pages/InventoryPage.tsx`)
- **Titik Awal Pembuatan SJ Berbasis `fdListCode`**: Berfokus murni pada kargo on-hand di gudang yang belum dikirim (`sent = '0'`).
- **Fitur Utama**:
  - Switcher Moda: `[ 🚢 Kapal / Laut ]` vs `[ ✈️ Udara ]` dengan live counter kargo on-hand.
  - Filter Status Fisik: `Semua Stok`, `🏢 Di Gudang` (`gudangStatus = '1'`), `⏳ Belum Konfirm` (`gudangStatus = '0'`).
  - **Link "Buka SJ"**: Mengarahkan ke `ROUTES.DELIVERY_ORDERS_LIST?listCode=...` dengan filter terisi otomatis.
  - **Tombol "+ Buat SJ" & Modal Penerbitan (`CreateDeliveryOrderModal.tsx`)**:
    - Hanya muncul pada kargo yang masih memiliki sisa stok (`sisa > 0`).
    - **Satuan Otomatis dari `tbEntryList.fdSatuan`**: Dropdown satuan otomatis memilih satuan aktual kargo (bukan hardcode `COLY`). Opsi non-standar disuntikkan dinamis dengan label `(dari tbEntryList)`.
    - **Card Permintaan Pengiriman CS (`qr_OrderDelivey`)**: Muncul otomatis di posisi teratas jika kargo memiliki instruksi khusus dari CS. Dilengkapi tombol salin cepat ke form.
    - **Master Alamat Tujuan (`tbCustomerPengiriman`)**:
      - Dropdown menampilkan semua alamat customer (`fdCustCode`).
      - Baris `fdAktif = 1` otomatis menjadi pilihan default (`★ [DEFAULT]`) dan auto-fill data penerima.
      - Tombol `+ Tambah Alamat` untuk registrasi alamat baru langsung ke `tbCustomerPengiriman` (auto next `fdID`).
    - Auto-counter FoxPro: Mengambil nomor berikutnya secara atomik dari `tbMasterCounter` (`fdCode = 'A'`, format `[Branch]-[Pad6Digits]`, e.g. `GZ-949650`).

---

## 3. Daftar & Detail Surat Jalan (`pages/ListPage.tsx` & `pages/DetailPage.tsx`)
- **Tab Terpadu**:
  - **Tab Pending** (Dalam Pengiriman, `sent = '0'`).
  - **Tab Delivered** (Lengkap Terkirim, `sent = '1'`).
- **Group Pills Cabang**: Baris scrollable memuat pill *"Semua Cabang"* dan pill cabang spesifik (`GZ`, `SG`, `HK`, dll.) dengan live counter kargo per cabang.
- **Tabel Manifest Kargo & Accordion Rincian (`BatchTable.tsx`, `BatchRow.tsx`, `DeliveryOrderDetails.tsx`)**:
  - Header 8 kolom terstandarisasi.
  - Loading skeleton shimmer wireframe (`BatchTableSkeleton`).
  - Mode Flat Surat Jalan Fisik (`DeliveryOrderTable.tsx`) dan toolbar pencarian autocomplete (`DeliveryOrderToolbar.tsx`).
- **Sistem Pagination Presisi (`TableFooter.tsx`)**: Info kuantitas (`X–Y dari Z data`), limit selector (10, 20, 50, 100), prev/next.
- **Pusat Kendali Surat Jalan (`DetailPage.tsx`)**:
  - JOIN langsung ke `tbEntryList` + `tbCabang` (bukan `tbBranch`).
  - Menampilkan Nomor Invoice dan Komoditas aktual pada Context Bar.
  - Prioritas nama penerima dari dokumen fisik Surat Jalan (`delivery.fdCustNameSJ`).
  - Dual Mode (View $\leftrightarrow$ Edit form armada, supir, alamat).
  - Banner Barang Amfibi & Banner Blocked Finance (`tbEntryList_Bloked_Finance`).

---

## 4. Format Cetak Continuous Form 23 × 16.5 cm Landscape (`PrintPage.tsx` & `PrintDeliveryOrderModal.tsx`)
- **Media Cetak Khusus**: Kertas continuous form ukuran **lebar 23 cm × tinggi 16.5 cm dicetak landscape** (`@page { size: 230mm 165mm landscape; margin: 0; }`).
- **Rute Mandiri**: `ROUTES.DELIVERY_PRINT(':id')` (`/logistics/delivery-orders/:id/print`) di luar `AppLayout`.
- **3 Pilihan Dokumen**:
  1. **SJ + Lampiran Ukuran (Keduanya)**: Mencetak 2 lembar sekaligus dengan pemisah `pageBreakAfter: 'always'`.
  2. **Hanya Surat Jalan Resmi (`rpf_delivery_2022.frx`)**: Header PT. SAMUDERA ENERGI JAYA, No. SJ, No. Mobil, No. Resi, Marking, Penerima, Alamat, Tabel Muatan, ketentuan keluhan, packing original, dan 3 kolom tanda terima.
  3. **Hanya Lampiran Ukuran Marking (`rpt_deliverysize_bill_2023.FRX`)**: Format tabel rincian dimensi koli (No, Panjang, Lebar, Tinggi, Jumlah, Total M³/VFC, Keterangan), Grand Total, tanda tangan Petugas Ukur & Gudang.
- **4 Opsi Cetak FoxPro**: `cetakUkuran`, `cetakKeterangan`, `cetakSupir`, `cetakSJKosong`.
- **Pencatatan Riwayat Cetak**: Endpoint `POST /api/delivery-orders/:id/print` mencatat tanggal, user, dan opsi cetak.

---

---

## 5. Monitoring Surat Jalan Belum Terkirim & Tren Konfirmasi (`pages/MonitoringPage.tsx`, `DeliveryConfirmModal.tsx`, `DeliveryConfirmChart.tsx`)
- **Tujuan Operasional**: Memantau seluruh Surat Jalan yang sudah diterbitkan namun belum dikonfirmasi kirim (`fdSent = 0`), serta memvisualisasikan tren surat jalan yang sudah terkonfirmasi kirim (`fdSent = 1`) berdasarkan batch cetak laporan FoxPro `tbDeliveryConfirm`.
- **Rute Aplikasi**: `ROUTES.DELIVERY_ORDERS_MONITORING` (`/mshipping/logistics/delivery-orders/monitoring`).
- **Navigasi 2 Tab**:
  1. **Tab 1: 🕒 Surat Jalan Pending (`fdSent = 0`)**:
     - **5 Kartu KPI Utama**: Total Pending (dengan pill counter), Lewat Estimasi (Overdue), Hari Ini, Aging 1-2 Hari, Aging > 7 Hari.
     - **Filter Fleksibel**: Aging (`Semua`, `Hari Ini`, `1-2`, `3-5`, `6-7`, `>7`), Status Estimasi (`Semua`, `Overdue`, `On-Time`), Moda (`Semua`, `Udara`, `Laut`), Rentang Tanggal, dan Pencarian teks bebas.
     - **Konfirmasi Pengiriman Massal & Satuan (`DeliveryConfirmModal.tsx`)**: Integrasi master `tbKendaraan` & `tbExpedisi`, multi-select batch confirmation.
     - **Ekspor Excel Langsung**: Unduh seluruh daftar surat jalan pending ke format `.xlsx`.
  2. **Tab 2: 📊 Tren Konfirmasi Terkirim (`tbDeliveryConfirm`) (`DeliveryConfirmChart.tsx`)**:
     - **Metode Agregasi Data**:
       - Mengagregasikan target estimasi pengiriman (`tbDelivery.fdEstimasi`) berdampingan dengan realisasi konfirmasi terkirim (`tbDeliveryConfirm`) per hari.
       - Menghitung jendela waktu konfirmasi batch via CTE `LAG(fdTglPrintReport)` untuk memetakan surat jalan `fdSent = 1` pada sesi Pagi (~09:30) vs Sore (~14:30).
     - **6 Kartu KPI Ribbon Komprehensif**:
       - Target Estimasi Kirim (breakdown Udara vs Laut).
       - Realisasi Terkonfirmasi Terkirim (breakdown Udara vs Laut).
       - Persentase Ketercapaian Target (% Achievement + Badge selisih `+/-` SJ).
       - **⚠️ Pending Overdue (> H+1)**: Indikator akumulasi Surat Jalan yang belum terkirim dan telah melewati batas maksimal toleransi pengiriman ($fdSent \le fdEstimasi + 1$).
       - Total Koli / Coly (Realisasi vs Target Estimasi).
       - Total Tonase Berat (Realisasi vs Target Estimasi).
     - **Dual View Mode Switcher**:
       - `📊 Estimasi vs Realisasi` (Default): Grouped Bar harian membandingkan target estimasi kirim (Indigo `#6366f1`) berdampingan dengan realisasi terkonfirmasi (Emerald `#059669`).
       - `📦 Sesi Batch FoxPro`: Stacked Bar per sesi batch pencetakan konfirmasi FoxPro (Pagi vs Sore).
     - **Switcher Kontrol**:
       - Metrik: `Surat Jalan (SJ)`, `Koli / Coly`, `Berat (Kg)`.
       - Moda: `Semua Moda`, `✈️ Udara`, `🚢 Laut`.
       - Rentang Waktu: `7 Hari`, `14 Hari`, `30 Hari`, `60 Hari`.
     - **Multi-Theme Custom Floating Tooltip**: Midnight Dark Mode compliant, komparasi target estimasi vs realisasi terkirim, status persentase ketercapaian, breakdown moda, fisik koli, dan selisih +/- SJ.
     - **Log Riwayat Interaktif (Tabel & Ekspor Excel)**:
       - Mode Compare: Tabel harian target estimasi, realisasi, % ketercapaian, selisih SJ, koli, berat, serta kolom Sesi Batch & Jam Cetak berdesain stacked structured cardlets vertikal (dot status warna, label sesi PAGI/SORE, jam WIB presisi, badge counter volume SJ ramping interaktif yang dapat diklik untuk membuka modal rincian Surat Jalan batch dengan hierarki grouping Moda [Sea/Air] → Cabang → Marking).
       - Mode Batch: Tabel rincian per sesi batch konfirmasi `tbDeliveryConfirm`.
       - Ekspor Excel (.xlsx) instan dengan dual-sheet (`Estimasi_vs_Realisasi` lengkap dengan kolom pending overdue/toleransi & `Sesi_Batch_tbDeliveryConfirm`).
      - **Modal Rincian Target Estimasi & Evaluasi Penagihan (DeliveryEstimasiDetailModal.tsx)**:
        - **Hitung Status Penagihan (Sudah vs Belum Dibuat Bill)**:
          - Perhitungan metrik kuantitas Surat Jalan, Koli/Coly, dan Berat (Kg) yang **Sudah Dibuat Bill** (`isBilled = true`) vs **Belum Dibuat Bill** (`isBilled = false`).
          - Tautan langsung nomor invoice (`invNos`) ke halaman validasi penagihan `ROUTES.BILLING_VALIDATION_DETAIL(invNo)`.
        - **6 Kartu KPI Ribbon Ringkasan**: Target Estimasi, Overdue (> H+1), Toleransi H+1, Realisasi Terkirim, Sudah Dibuat Bill (% & koli/berat), Belum Dibuat Bill (dengan badge perhatian & koli/berat).
        - **Filter Terintegrasi Interaktif**: Filter Status Pengiriman (Semua, Overdue, Toleransi, Terkirim) dan Filter Status Penagihan (Semua Bill, Sudah Bill, Belum Bill).
        - **Dual View Mode (Kartu Mobile vs Tabel Lengkap)**:
          - Tampilan Kartu (Cards Mode): Dilengkapi Box Status Bill (`[✓ Sudah Dibuat Bill]` + nomor invoice link atau `[Belum Dibuat Bill]`).
          - Tampilan Tabel (Table Mode): Tabel desktop sticky header 10 kolom dengan kolom khusus **Status Penagihan** lengkap dengan nomor invoice klik-able.
        - **Ekspor Excel (.xlsx)**: Kolom Status Penagihan, Nomor Invoice, dan Tanggal Invoice disertakan saat unduh data.
        - **Footer Ringkasan Kompak**: Total SJ terfilter, total koli, berat kg, dan live breakdown `✓ Sudah Bill: X SJ (A coly) • ⏳ Belum Bill: Y SJ (B coly)`.
        - **Desain Responsif Mobile Penuh**: Shell modal fullscreen-fit pada layar smartphone (h-full sm:h-auto max-h-[100dvh] sm:max-h-[92vh] rounded-none sm:rounded-2xl) dengan touch targets nyaman (36–40px) dan banner aturan toleransi kompak.
        - **Dual View Mode (Kartu Mobile vs Tabel Lengkap)**:
          - Tampilan Kartu (Cards Mode, default pada viewport < 768px): Menampilkan kartu surat jalan informatif berisi no SJ (link ke ROUTES.DELIVERY_DETAIL), status badge semantic outline, customer (displayCustName), moda badge (✈️ Udara / 🚢 Laut), marking code/resi, armada & supir dengan link panggilan cepat telepon (	el:), muatan fisik koli & berat, timeline estimasi & realisasi, serta tombol detail.
          - Tampilan Tabel (Table Mode): Tabel desktop sticky header 9 kolom dengan link detail surat jalan.
          - Tombol Switcher Tampilan: [ 📱 Kartu | ▤ Tabel ] (LayoutGrid vs Rows3) pada toolbar memudahkan pergantian mode di semua perangkat.
        - **Loading Wireframe Shimmer**: Menggunakan wireframe skeleton shimmer (.skeleton-shimmer) ramah Midnight Dark Mode (eliminasi total spinner bulat).
        - **4 Filter Status Chips Interaktif**: Semua, ⚠️ Overdue (> H+1), 🕒 Toleransi H+1, ✓ Sudah Terkirim dalam strip horizontal scrollable tanpa scrollbar (scrollbar-none).
        - **Filter Segmented Moda & Toolbar**: [Semua | ✈️ Udara | 🚢 Laut], pencarian teks instan (SJ, customer, marking, supir, plat, resi) dengan tombol hapus cepat (X), dan tombol refresh data.
        - **4 KPI Ribbon Ringkasan**: Total Target Estimasi, Pending Overdue, Pending Toleransi H+1, dan Sudah Terkirim yang dapat diklik langsung sebagai jalan pintas filter.
        - **Ekspor Excel (.xlsx)**: Unduh data Surat Jalan terfilter langsung ke lembar kerja Excel dengan feedback toast.
        - **Footer Ringkasan Kompak**: Total SJ terfilter, total koli, dan berat kg dengan tombol Tutup full-width pada mobile.
      - **Modal Rincian Surat Jalan Batch FoxPro (DeliveryBatchDetailModal.tsx) - Redesign Premium B2B ERP**:
        - **Redesign UI/UX High-Density B2B ERP (`taste-skill` & `redesign-skill`)**:
          - **Header Komando Interaktif**:
            - Sesi badge dinamis: Sesi Pagi (amber squircle) vs Sesi Sore (indigo squircle) dengan timestamp aktual FoxPro (`effectiveTime WIB`).
            - Pill progress penagihan interaktif: `[🧾 Bill: {billedCount}/{total} SJ ({pct}%)]`.
            - Global accordion toggle: `[ ⇕ Buka/Tutup Semua ]` (`ChevronsUpDown`) untuk melipat/membuka seluruh accordion cabang & marking secara serentak.
            - Quick export button & modern close button.
          - **5 Kartu Grid KPI Eksekutif**:
            1. *Total Batch* (`{totalSj} SJ`, coly, kg) dengan accent border dinamis.
            2. *✈️ Air Freight* (`{sjUdara} SJ`, %, coly, kg).
            3. *🚢 Sea Freight* (`{sjLaut} SJ`, %, coly, kg).
            4. *🧾 Sudah Bill* (`{billedCount} SJ`, %, coly, kg, emerald).
            5. *⏳ Belum Bill* (`{unbilledCount} SJ`, amber, pulse indicator jika > 0).
            - Setiap kartu dapat diklik langsung sebagai jalan pintas filter real-time.
          - **Smart Toolbar & Dual View Engine**:
            - Switcher Mode Tampilan: `[ ▤ Tabel | 📱 Kartu ]` (`Rows3` vs `LayoutGrid`).
            - Segmented Control Filter Status Penagihan: `[Semua Bill]`, `[✓ Sudah Bill]`, `[⚠️ Belum Bill]`.
            - Segmented Control Filter Moda: `[Semua Moda]`, `[✈️ Air]`, `[🚢 Sea]`.
            - Dropdown Cabang dengan indikator jumlah cabang.
            - Input pencarian autocomplete multi-field (SJ, customer, marking, nomor invoice `item.invNos`, supir, armada) lengkap dengan tombol clear `(X)`.
            - Tombol reset filter `RotateCcw`.
          - **Mode Tampilan Tabel (Table View)**:
            - Header 8 kolom terstandarisasi dengan `tabular-nums`.
            - Subheader marking & cabang dengan `displayCustName(marking.custName)` dan pill akumulasi volume kargo.
            - Kolom Status Penagihan: Emerald badge + tautan invoice `ROUTES.BILLING_VALIDATION_DETAIL(invNo)` vs Amber badge + list code manifest.
            - Tautan no. SJ langsung mengarah ke `ROUTES.DELIVERY_DETAIL(item.fdSJNo)`.
          - **Penyempurnaan Marking Subheader (Redesign Tata Letak & Multi-Customer)**:
            - **Eliminasi String Kode Pelanggan Meluber**: Menggantikan list horizontal puluhan kode customer mentah dalam tanda kurung yang memadati baris dengan representasi cerdas: jika 1 customer tampilkan `Nama (Kode)`, jika multi-customer tampilkan `Nama Pertama` + badge chip `+N Pelanggan` berikon `Users` dengan `title` tooltip daftar seluruh pelanggan beserta kodenya.
            - **Kunci Sisi Kanan Metrik Fisik**: Metrik akumulasi muatan fisik (`X coly • Y kg`) terkunci permanen rata kanan (`ml-auto whitespace-nowrap`) tanpa terdorong ke baris bawah oleh overflow teks kiri.
            - **Sinkronisasi Dual Mode**: Struktur subheader marking yang rapi dan konsisten diterapkan pada mode Tabel (`Table Mode`) maupun Kartu (`Cards Mode`).
          - **Mode Tampilan Kartu (Cards View)**:
            - Layout grid 2-kolom responsif untuk kartu SJ per marking.
            - Detail logistik kargo, supir, armada, dan invoice dalam container kompak.
          - **Ekspor Excel (.xlsx)**: Dilengkapi kolom `Status Penagihan`, `No Invoice`, dan `Tgl Invoice`.
          - **Footer Status Real-Time**: Rekapitulasi instan jumlah SJ terfilter, `✓ Sudah Bill: X SJ`, dan `⏳ Belum Bill: Y SJ`.
          - **Midnight Dark Mode Compliant**: Zero solid white badges/buttons, seluruh komponen menggunakan semantic outline, hover effects, dan CSS tokens theme-aware.
- **Optimalisasi Responsif Penuh Mobile (`MonitoringPage.tsx` & `DeliveryConfirmChart.tsx`)**:
  - **Tab 1 (Surat Jalan Pending)**: Dual View Desktop Table (`hidden md:block`) 9 kolom + Mobile Card List (`md:hidden`) lengkap dengan checkbox multi-select massal, link no SJ, badge aging, customer/marking box, armada/supir, serta tombol aksi Kirim dan Cetak.
  - **Tab 2 (Tren Konfirmasi Terkirim)**:
    - Toolbar 2 baris responsif: Switcher mode tampilan & tombol aksi ekspor/refresh di baris 1; horizontal scrollable pill strip untuk Metrik (SJ/Coly/Kg), Moda (Semua/Air/Sea), dan Rentang Waktu (7h/14h/30h/60h) di baris 2.
    - Chart Recharts adaptif dengan tinggi `h-[270px] sm:h-[400px]`, negative left margin snug fit, dan font axis compact.
    - Dual View Log Harian: Desktop Table 10 kolom (`hidden md:block`) + Mobile Card List (`md:hidden`) dengan kartu komparasi target vs realisasi, status pending overdue/toleransi H+1, dan batch cardlets interaktif sesi FoxPro.
- **Standar Layout & Spacing**: Menggunakan kontainer standar ERP `p-2.5 sm:p-6 lg:p-8 w-full min-w-0 space-y-4 sm:space-y-6 font-[var(--font-body)] animate-fadeIn pb-24` serta token CSS multi-tema (Midnight Dark Mode compliant, tanpa solid white).

---

## 6. Endpoint API Terkait
| Endpoint | Method | Parameter / Payload | Deskripsi |
|---|:---:|---|---|
| `/api/delivery-orders/kpi` | `GET` | `year`, `month`, `search` | Agregasi KPI MTD, MoM, YoY, tren 12 bulan |
| `/api/delivery-orders` | `GET` | `page`, `limit`, `search`, `sent`, `branch`, `listType` | Flat list data surat jalan |
| `/api/delivery-orders/monitoring` | `GET` | `page`, `limit`, `startDate`, `endDate`, `search`, `aging`, `status`, `listType` | Data monitoring SJ pending, aging, overdue, & KPI |
| `/api/delivery-orders/confirm-delivery` | `POST` | `ConfirmDeliveryDto` (`sjNos`, `fdSndDate`, `fdCarID`, `fdSupir`, `expedition`) | Konfirmasi kirim SJ (`fdSent = 1`) & trigger `sp_tbExpIndo` |
| `/api/delivery-orders/confirm-batch-detail` | `GET` | `date`, `session` | Rincian lengkap Surat Jalan per batch FoxPro grouped by Moda & Cabang |
| `/api/delivery-orders/confirm-trends` | `GET` | `days` (default: 30) | Data tren konfirmasi batch `tbDeliveryConfirm` per sesi Pagi/Sore & toleransi H+1 |
| `/api/delivery-orders/estimasi-details` | `GET` | `date`, `type` (`all`, `overdue`, `pending`, `sent`) | Rincian Surat Jalan per tanggal estimasi dengan evaluasi toleransi H+1 |
| `/api/delivery-orders/vehicles` | `GET` | - | Daftar kendaraan & supir master `tbKendaraan` |
| `/api/delivery-orders/expeditions` | `GET` | - | Daftar sub-carrier lokal dari master `tbExpedisi` |
| `/api/delivery-orders/suggestions` | `GET` | `q` | Autocomplete no SJ, customer, supir, mobil (< 50ms) |
| `/api/delivery-orders/grouped` | `GET` | `listType`, `sent`, `search`, `page`, `limit` | Inventori kargo manifest masuk gudang |
| `/api/delivery-orders/branch-groups` | `GET` | `sent`, `listType`, `search` | Counter kargo per cabang pengirim |
| `/api/delivery-orders/:id` | `GET` | Path `id` | Detail lengkap nomor surat jalan |
| `/api/delivery-orders` | `POST` | Payload SJ baru | Terbitkan Surat Jalan baru dengan auto-counter FoxPro |
| `/api/delivery-orders/:id` | `PUT` | Payload update | Perbarui data operasional surat jalan |
| `/api/delivery-orders/:id` | `DELETE` | Path `id` | Hapus surat jalan (terproteksi jika sudah cetak) |
| `/api/delivery-orders/:id/print` | `POST` | `{ cetakUkuran }` | Catat konfirmasi cetak surat jalan |
| `/api/delivery-orders/customer-destinations/:custCode` | `GET` | Path `custCode` | Daftar alamat tujuan pelanggan dari `tbCustomerPengiriman` |
| `/api/delivery-orders/customer-destinations` | `POST` | Payload alamat baru | Tambah alamat pengiriman baru customer |
| `/api/delivery-orders/order-delivery/:listCode` | `GET` | Path `listCode` | Instruksi pengiriman khusus CS dari `qr_OrderDelivey` |
