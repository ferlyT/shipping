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
      - **Modal Rincian Target Estimasi & Pending H+1 (DeliveryEstimasiDetailModal.tsx)**:
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
