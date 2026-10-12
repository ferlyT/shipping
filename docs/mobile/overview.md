# 📊 Mobile Overview & Exit Activity (`mobile/app/(tabs)/overview.tsx`)

Pusat informasi eksekutif, peringatan dini operasional lapangan, dan pemantauan aktivitas kontainer/batch yang keluar gudang (*Exit Activity*).

---

## 1. Fitur & Komponen Layar Overview
- **Header Pengguna**: Greeting formal netral (`Halo, [Nama]`), **Icon Shield Role** beraksen warna semantik (Merah: Admin, Biru: Staff, Hijau: Finance, Slate: Customer/Lainnya), toggle bahasa bilingual (`ID`/`EN`), dan toggle tema (`Midnight`/`Heritage`).
- **Hero Card Terpadu (Config-Driven & Icon-Free)**:
  - Kartu ringkasan beranda utama di atas switch tab yang bersih tanpa icon/emoji, menampilkan perpaduan metrik **Exit Activity** dan **Billing Ops**.
  - Kolom Exit Activity: Jumlah batch keluar hari ini (`exitTodayCount`) dengan breakdown tekstual `Udara: N` dan `Laut: N`.
  - Kolom Billing Ops (Kondisional hak akses): Target bill bulan berjalan dengan breakdown `Udara: N` dan `Laut: N`.
  - Baris Micro-Stats Terintegrasi (Drill-Down Cepat):
    - `ETA Not Exit`: Jumlah batch melewati ETA belum keluar (ketuk untuk langsung memfilter daftar).
    - `Missed SLA`: Jumlah batch dengan durasi transit melebihi target SLA (ketuk untuk filter).
    - `Draft Unissued`: Jumlah draft invoice belum di-issue (ketuk untuk membuka bottom sheet unissued bills).
  - Eliminasi Redundansi: Menggantikan seksi kartu peringatan dini terpisah yang sebelumnya menduplikasi data ETA dan SLA, sehingga dashboard tampil rapi dan efisien.
- **4 Kartu KPI Ringkasan Exit**:
  - **Kemarin**: Jumlah batch keluar kemarin (`exitScope=yesterday`).
  - **Hari Ini (Default)**: Jumlah batch keluar hari ini (`exitScope=today`).
  - **Besok (Prediksi)**: Estimasi batch dijadwalkan keluar besok (`exitScope=tomorrow`).
  - **Exit 7 Hari**: Akumulasi batch keluar dalam 7 hari terakhir (`exitScope=recent`).
  - *Desain Anti Shadow Bleed-Through*: Menggunakan latar belakang opaque solid agar elevasi bayangan native Android tampil rata dan bersih.
- **Group Pills Filter Moda & Tahun**:
  - Segmented pills moda (`Semua`, `Udara`, `Laut`) berbasis `listType`.
  - Khusus saat kriteria ETA/SLA aktif, muncul filter tahun batch (`2026`, `2025`, `2024`, `Semua`) dengan tahun berjalan (`2026`) aktif default.
- **Daftar Batch Terkini & In-Place Manifest Sheet**:
  - Menampilkan kode batch marking, kontainer/AWB, cabang asal, consignee, koli & berat, serta tanggal kontekstual.
  - **Quick Action Exit Date pada Alert `ETA NOT EXIT`**: Tombol aksi cepat `[ + Exit ]` tersedia langsung pada daftar batch yang tertahan/belum exit agar staf operasional dapat langsung mengesahkan tanggal keluar gudang tanpa berpindah layar.
  - **In-Place Modal Manifest (`BatchManifestSheet`)**: Mengetuk item batch memunculkan modal lembar manifest secara in-place di halaman Overview tanpa berpindah tab ke Logistik.
  - **Link ke Modal Rincian Muatan (`ShipmentDetailSheet`)**: Setiap kartu resi kargo dalam manifest dapat diketuk langsung atau via tombol `[ Detail ]` untuk membuka lembar rincian muatan (Ringkasan info kargo, Dimensi ukur gudang/packing list/komplain, Timeline pelacakan 6 milestone, dan Faktur Invoice resmi) tanpa me-reset status modal manifest.
  - **Aksi Cepat Buat BAP (`+ BAP`)**: Setiap baris kargo di lembar manifest dan modal rincian muatan dilengkapi tombol `+ BAP` yang langsung membuka form BAP (`InspectionFormSheet`) dengan data ter-autofill (Moda, Marking Code, Marking No, List Code, No. Resi, Nama Customer).
- **Pull-to-Refresh**: Gesture tarik ke bawah untuk memuat ulang data KPI dan daftar batch secara real-time.

---

## 2. Operation Billing Dashboard (`canViewBillingOperational`)
Layar Overview kini dilengkapi Segmented Switcher di bagian atas: `📦 Logistik Exit` vs `📊 Billing Ops` bagi pengguna yang memiliki hak akses `canViewBillingOperational(user)`.
- **BillingPeriodNavigator**: Kontrol periode audit bulan dan tahun dengan tombol mundur `<` dan maju `>`, badge status `[Bulan Berjalan]` (hijau) atau `[Audit Lampau]` (kuning), dan tombol reset instan `Bulan Ini`.
- **Target Bill & KPI Operasional (Editorial Clean Layout)**:
  1. **Faktur Diterbitkan (Hero Section)**:
     - Hero angka besar (`formatNumber(invoicesBulanIni) bill`), persentase MoM (`+N% vs bulan lalu`), horizontal dual split bar (Udara `#E2B266` vs Laut `#5FA3D4`), serta legend dots.
  2. **Target Bill (Moda Rows & Metric Columns)**:
     - Dikelompokkan per moda: **Udara** dan **Laut** dengan pemisah garis halus.
     - Baris PIC (`Kiki 1 • Yati 0`, `Thara 71 • Rico 15 • Ferly 1`).
     - 4 Kolom status bergaris batas kiri: `SJ`, `COD`, `FCL`, dan `>7 hari` (alert merah jika ada backlog).
  3. **Draft Belum Di-Issue (> 2024)**:
     - Total draft bill (`N bill`), sub-label `Udara N • Laut N • Rp X jt`.
     - Multi-color segmented aging ratio bar.
     - 4 Baris daftar aging interaktif (`≤7 hari`, `8–14 hari`, `15–30 hari`, `>30 hari`) one-tap drill down ke Bottom Sheet.
  - *Layout Editorial*: Menggunakan clean grouped sections dengan border pembatas halus, terintegrasi elegan, dan 100% bebas dari icon dekoratif/emoji.
- **UnissuedBillsDetailSheet**:
  - Mini KPI cards: Total Draft, Udara, Laut, Aging >30 Hari Kritis.
  - Search input: No Invoice, Customer, Marking, PIC Creator.
  - Filter Moda (`Semua`, `✈️ Udara`, `🚢 Laut`) dan Filter Aging (`Semua`, `≤7h`, `8-14h`, `15-30h`, `>30h`).
  - **Group Pills by Creator Bill**: Filter pil pembuat invoice (Semua, Kiki, Yati, dst.) lengkap dengan counter kuantiti bill.
  - Tombol aksi:
    - **Validasi** (Emerald, icon ClipboardCheck): Otomatis muncul bagi pengguna dengan hak `canValidateBilling(user)` dan mengarahkan langsung ke tab validasi invoice (`tab: 'validation'`, `search: invNo`).
    - **Detail**: Membuka halaman validasi jika punya hak validasi, atau rincian faktur biasa jika tidak.
  - One-tap copy invoice number dengan haptic feedback dan toast.
- **BatchExitComparisonWidget (Batch Exit vs Bill Dibuat)**:
  - Hero summary card: Rasio penyelesaian kargo exit (`billedPercentage%`), progress bar tebal semantik, 3 mini stat (Total Kargo Exit, Sudah Billed, Sisa Unbilled), tombol `[ Rincian Batch (N) ]`.
  - Dual Moda: Perbandingan kargo Udara (amber) vs Laut (sky).
  - Status Customer: 5 baris status semantik (🚨 Blocked, ⚠️ Warning, ⚡ Urgent, 💵 COD, OK).
  - Rasio Penagihan per Cabang: Normalisasi Singapore (`SG`/`--`), GZ, HK, YW, SH.
- **BatchExitDetailSheet**:
  - Modal drilldown rincian batch pending dengan filter status (Pending/Semua/Tuntas), filter moda, dan search.
  - Tiap batch dapat diekspansi untuk melihat daftar resi kargo (`BatchExitCargoItem`) secara langsung.

---

## 3. Endpoint API Terkait
| Endpoint | Method | Query Parameters / Body | Deskripsi |
|---|:---:|---|---|
| `/api/marking/kpi` | `GET` | `isClosed=true` | Ringkasan batch exit: kemarin, hari ini, besok, exit 7 hari, alert ETA/SLA |
| `/api/marking` | `GET` | `exitScope`, `listType`, `year`, `limit=50` | Daftar batch exit terkini sesuai kriteria filter aktif |
| `/api/marking/:id/manifest` | `GET` | Path `:id` (`fdMarkingCode`) | Rincian resi manifest dalam batch terpilih |
| `/api/marking/:id/exit-date` | `PATCH`/`PUT` | `{ "exitDate": "YYYY-MM-DD" \| null }` | Update/hapus Exit Date batch marking |
| `/api/billing/kpi` | `GET` | `year`, `month` | KPI operasional billing: Target Udara, Laut, Faktur Terbit, & Unissued Bills |
| `/api/billing/unissued-bills` | `GET` | `search`, `mode`, `aging` | Daftar draft bill belum di-issue (> 2024) lengkap dengan aging & creator |
| `/api/billing/batch-exit-comparison` | `GET` | `year`, `month`, `allTime` | Ringkasan dan daftar perbandingan batch exit vs bill dibuat |
| `/api/billing/batch-exit-comparison/details` | `GET` | `markingCode` | Rincian kargo resi dalam batch marking exit terpilih |


