# 💰 Modul Keuangan & Faktur Penagihan (`src/features/billing/`)

Modul paling komprehensif pada sistem mshipping yang mencakup siklus hidup penagihan piutang, audit validasi tarif & fisik, hingga pencetakan dokumen legal.

---

## 1. Dashboard Keuangan (`pages/DashboardPage.tsx`)
- **4 Kartu KPI Terintegrasi Live API (`useBillingDashboard`)**:
  - *Target Bill Hari Ini (Udara)*: Total listcode udara siap ditagih berserta rincian kategori kriteria interaktif (`SJ Sent`, `COD/Urgent`, `Aging > 7`, `FCL`), garis pemisah, dan rincian per PIC (Kiki vs Yati). Setiap chip kategori dapat diklik langsung untuk memfilter halaman Target Bill $\to$ `ROUTES.BILLING_TARGET?type=udara&group=...`.
  - *Target Bill Hari Ini (Laut)*: Total listcode laut berserta rincian kategori kriteria interaktif (`SJ Sent`, `COD/Urgent`, `Aging > 7`, `FCL`), garis pemisah, dan rincian per PIC (Thara, Rico, Ferly). Setiap chip kategori dapat diklik langsung untuk memfilter halaman Target Bill $\to$ `ROUTES.BILLING_TARGET?type=laut&group=...`.
  - *Invoice Terbit Bulan Ini*: Volume invoice bulan berjalan/terpilih, badge tren MoM & YoY interaktif (`GrowthPill`), breakdown per moda $\to$ `ROUTES.BILLING_LIST`.
  - *Total Nominal Tagihan Bulan Ini*: Akumulasi omzet tagihan bulan terpilih (`formatCurrency`), badge tren MoM & YoY interaktif (`GrowthPill`) $\to$ `ROUTES.BILLING_LIST`.
- **Toolbar Navigasi Periode (`BillingPeriodNavigator`)**:
  - Memilih bulan dan tahun evaluasi/audit dengan tombol panah `<` dan `>`.
  - Indikator status visual: badge hijau berdenyut `[Bulan Berjalan]` atau badge amber `[Audit Periode Lampau]`.
  - Tombol aksi cepat reset ke Bulan Berjalan saat staf sedang memeriksa periode lampau.
  - Subline kontekstual nama bulan pembanding MoM vs YoY.
- **Matriks Komparasi 3 Periode (`BillingPeriodMatrixTable`)**:
  - Didedikasikan secara eksklusif dan terfokus pada tab mandiri **Komparasi 3 Periode** (menghilangkan redundansi pada tab **Bulanan** sehingga kanvas grafik 12 bulan kembali lapang 100% full-width).
  - Dilengkapi 3 **Quick Summary Cards** di atas tabel: Total Omzet Tagihan, Volume Faktur Diterbitkan, dan Rata-rata Nilai / Faktur lengkap dengan badge MoM & YoY.
  - Menyajikan 8 metrik kunci penagihan: *Total Faktur*, *Total Tagihan*, *Faktur Udara*, *Tagihan Udara*, *Faktur Laut*, *Tagihan Laut*, *Rata-rata / Bill*, dan *Customer Ditagih*.
  - Menampilkan nilai aktual saat ini berformat tabular font mono, badge pertumbuhan MoM vs bulan lalu (dengan diff nominal/qty pada tooltip), dan badge pertumbuhan YoY vs tahun lalu.
  - Panel samping memuat ikhtisar periode audit dan **Proporsi Pangsa Omzet Moda (Udara vs Laut)** interaktif dengan progress bar warna semantik.
- **Grafik Analitik Interaktif**:
  - **Diferensiasi Moda Udara vs Laut pada Grafik Harian & Bulanan (`TrendChart.tsx`)**:
    - **Filter Moda Terintegrasi**: Pilihan pill selector `[Semua | ✈️ Udara | 🚢 Laut]` berdampingan dengan sakelar metrik `[Jumlah Bill | Total Tagihan]`.
    - **Mode Jumlah Bill (Count) & Nominal Tagihan (Value)**: Keduanya menggunakan **Line Curve Chart (`type="monotone"`)** berpadu dengan gradien area lembut (`trendAreaLautFill` Emerald `#10b981` dan `trendAreaUdaraFill` Sky Blue `#0284c7`), titik data adaptif (`dot` aktif pada $\le 14$ data), dan garis pandu vertikal putus-putus (`cursor`). Visualisasi kurva mulus tanpa distorsi memberikan keterbacaan tren harian dan bulanan yang elegan di seluruh moda dan tema (termasuk Midnight Dark Mode).
    - **Komparasi Year-over-Year (YoY) 12 Bulan Terakhir (Diferensiasi Air & Sea)**:
      - Backend mengagregasi 24 bulan data penagihan dari `tbBilling` sehingga setiap bulan dipasangkan langsung dengan bulan yang sama pada tahun sebelumnya (`${yr - 1}-${mo}`).
      - **Diferensiasi Garis Kurva YoY per Moda**:
        - **✈️ Udara YoY (Tahun Lalu)**: Kurva putus-putus (`strokeDasharray="5 4"`) beraksen Sky 400 (`#38bdf8`).
        - **🚢 Laut YoY (Tahun Lalu)**: Kurva putus-putus (`strokeDasharray="5 4"`) beraksen Mint/Emerald 400 (`#34d399`).
        - Saat filter `[Semua]` aktif, kedua kurva YoY ditampilkan berpasangan dengan kurva tahun berjalan masing-masing moda.
      - **Mini Summary Banner Badge Per-Moda**:
        - Chip **Udara**: Memuat badge YoY pertumbuhan Udara akumulatif 12 bulan (`YoY (12 Bln) ▲ +X%` / `▼ -X%` beserta nominal/bill selisih dan `whitespace-nowrap`). Menghilangkan ambiguitas antara metrik akumulasi tahunan 12 bulan vs fluktuasi titik bulanan pada grafik.
        - Chip **Laut**: Memuat badge YoY pertumbuhan Laut akumulatif 12 bulan (`YoY (12 Bln) ▲ +X%` / `▼ -X%` beserta nominal/bill selisih dan `whitespace-nowrap`).
        - Chip **Total**: Memuat badge YoY pertumbuhan Total akumulatif 12 bulan (`YoY (12 Bln) ▲ +X%` / `▼ -X%`).
      - **Floating Tooltip Detail Per-Moda**: Menampilkan data bulan berjalan, nilai tahun lalu, dan persentase pertumbuhan YoY spesifik per moda (`✈️ Udara: [prev] (▲ +X%)` dan `🚢 Laut: [prev] (▼ -Y%)`), serta kartu rincian selisih nominal/bill terpisah untuk Udara dan Laut.
      - **Sakelar Tombol Toggle**: Tombol `[YoY Aktif / Off]` pada toolbar tab grafik Bulanan (`DashboardPage.tsx`) untuk menyembunyikan/menampilkan garis perbandingan tahun lalu secara interaktif.
      - **Format Label & Ticks Sumbu X Bebas Ambiguitas (`ChartTick.tsx`)**:
        - Sumbu X tab Bulanan menampilkan format 2 baris terpisah: Nama Bulan (baris 1, e.g. `Sep`) dan Tahun 4 Digit (baris 2, e.g. `2026`), mengeliminasi miskonsepsi singkatan `Sep 26` sebagai "tanggal 26 September".
        - Interval sumbu X tab Bulanan disetel `interval={0}` (menampilkan seluruh 12 bulan tanpa ada yang terlewat).
        - Interval sumbu X tab Harian menggunakan `interval="preserveStartEnd"` memastikan tanggal awal dan tanggal akhir (hari ini) selalu tercetak jelas dan tidak terpotong.
    - **Mini Summary Banner Per-Moda**: Chip metrik akumulatif di atas kanvas grafik (`✈️ Udara: X Bill • Rp Y (A%)` dan `🚢 Laut: B Bill • Rp C (D%)` serta total gabungan) untuk periode yang sedang ditampilkan.
    - **Multi-Theme Floating Tooltip**: Tooltip interaktif responsif multi-tema dengan header tanggal, breakdown item Udara & Laut, total gabungan, dan progress bar rasio persentase volume/nominal.
    - **Filter Rentang Waktu Harian**: Dropdown rentang 7, 14, atau 30 hari aktif pada tab Harian.
  - Tren Harian Penagihan per Karyawan/Sales (`by-employee-daily`).
  - Komparasi Surat Jalan vs Faktur Terbit (`sj-vs-bill`).

---

## 2. Target Penagihan (`pages/TargetPage.tsx`)
- **Tujuan**: Audit daftar muatan barang yang sudah selesai terkirim atau tiba di gudang namun belum diterbitkan invoice penagihannya.
- **Fitur**:
  - Analisis backlog per PIC sales, audit estimasi omzet, dan tombol pembuatan draf faktur.
  - **Pencarian Cerdas Multi-Token Berdasarkan Nama Customer, Kode, & Marking**:
    - **Single Source of Truth Pelanggan**: Backend `getBillingTargetDetails` menjamin nama customer resmi bersumber dari `tbCustomers.fdCustName` (melakukan lookup kode `tbCustomers.fdCustCode` dan menimpa teks legacy dari SP), serta menyertakan `custCode`, `billTo`, dan `consignee`.
    - **Multi-Token Matching & Normalisasi**: Menghilangkan tanda baca (`.`, `,`, `-`, `/`), mendukung permutasi kata (misal: `"PT SWADAYA SARANA BERLIAN"` atau `"PT SWADAYA"` cocok dengan `"SWADAYA SARANA BERLIAN, PT"`), ekspansi sinonim singkatan Indonesia (`tk` $\leftrightarrow$ `toko`), dan pencarian kode customer langsung (misal: `"S003077"`, `"B000075"`).
    - **Sinkronisasi URL & Deep-linking**: Mendukung query parameter `?search=...` dan auto-sync debounced (300ms) saat mengetik.
    - **Navigasi Kontekstual Lintas Kategori/PIC**: Jika pencarian menghasilkan 0 item di kategori atau PIC aktif namun memiliki hasil di kategori/PIC lain, antarmuka menyediakan tombol pintas instan (`[Tampilkan di Semua Kategori]` atau `[Tampilkan di Semua PIC]`).
    - **Visualisasi Identitas Customer**: Menampilkan badge kode customer font mono tabular di samping nama pelanggan pada tabel desktop dan kartu mobile, serta keterangan nama penagihan `Bill to:` jika berbeda.
  - **Tombol Salin Data Kargo**: Menyalin Nama Customer, Cabang, Marking, Komoditi, Jml Pack, Berat, dan Tipe per baris tabel desktop dan kartu mobile via `copyToClipboard`.
  - **Aksi Cepat [🏷️ Tarif] (Modal Pricelist Customer `CustomerHargaModal.tsx`)**:
    - Tombol semantik ringkas `[🏷️ Tarif]` (aksen amber) di samping nama customer pada tabel desktop dan kartu mobile.
    - Membuka modal terstruktur berisi daftar tarif aktif pelanggan dari `tbCustomersHarga`, dilengkapi breakdown per cabang (`GZ`, `YW`, `SH`, `SZ`, `HK`, `SG`, `BKK`, `KR`), switcher moda (`[Semua | ✈️ Udara | 🚢 Laut]`), pencarian instan, metadata (tipe tagihan, no. penawaran, rasio overweight kg/m³, asuransi, catatan udara/laut), serta audit override dari `tbCustomersHargaAudit` (badge revisi dan riwayat harga).
    - Dilengkapi fitur ekspor tarif pelanggan ke format berkas Excel (`.xlsx`).

---

## 3. Daftar & Rincian Invoice (`pages/ListPage.tsx` & `pages/DetailPage.tsx`)
- **Toolbar Pencarian & Preservasi Teks Customer (`BillingToolbar.tsx`)**:
  - Terhubung dengan `SearchSuggestionsDropdown` (`GET /api/billing/suggestions`).
  - **Preservasi Teks & Filter Presisi (`selectedCustCode`)**: Saat saran customer dipilih, input teks tetap menampilkan nama pelanggan (e.g. `"RICO"`), sementara sistem mengunci `custCode` (`"R000470"`) di backend sehingga 100% faktur milik pelanggan tersebut difilter secara akurat.
- **Aksi Terbitkan Invoice (*Issue Invoice*)**:
  - Mengunci faktur dengan tanggal penyerahan resmi (`fdGive = 1`, `fdGiveDate = GETDATE()`), nomor invoice, dan ID penagih (`fdEmpId`).
  - Menjalankan update atomik pada `tbBilling`, `tbBillingPrev`, dan `tbBillingGiveEmp`.
- **Dukungan Dual-Bahasa (i18n) & Salin Cepat**: Tombol salin No. Invoice instan dengan notifikasi toast.
- **Penguncian Rincian Item (Read-Only)**: Jika faktur telah berstatus **ISSUED** (`fdGive = 1`) atau **LUNAS/COLLECTED** (`fdGive2 = 1`), form beralih menjadi mode **Read-Only** dengan badge gembok.

---

## 4. Audit Validasi Penagihan (`ValidationListPage.tsx` & `ValidationDetailPage.tsx`)
Mencegah kebocoran pendapatan perusahaan dan komplain pelanggan dengan memeriksa akurasi tarif master serta kesesuaian fisik muatan sebelum faktur diterbitkan:

### A. 3 Aturan Audit Utama
1. **Validasi Harga Master (`Price Check`)**:
   - Membandingkan tarif yang ditagihkan dengan tabel master tarif umum atau tarif khusus pelanggan.
   - Evaluasi komoditi (`evaluateItemPrice`): Fallback ke `defaultTypeId` jika bernilai 0. Regex boundary `/\bLS\b/i` mencegah false positive pada kata `PARCELS`, `TOOLS`.
   - Item `PARCELS TO JAKARTA (PCS)` tidak diperlakukan sebagai M³ kubikasi.
2. **Validasi Hirarki Volume M³ (`M3 Check`)**:
   - Single Bill: `Komplain` (`fdM3Komplain`) $\to$ `Gudang` (`fdM3Gudang`) $\to$ `PL` (`fdM3`).
   - Bill Gabung: `Komplain (Marking)` $\to$ `Gudang (Marking)` $\to$ `PL (Marking)`.
3. **Validasi Komparasi Berat vs Volume (Type 2 Comparison / Overweight)**:
   - Memeriksa batas rasio berat terhadap volume ($> 300\text{ kg/m}^3$ atau ambang batas rute).
   - **Prinsip Billed M³ Riil vs Basis Validasi KG (Laut)**:
     - Billed M³ selalu menampilkan nilai riil yang ditagihkan di invoice (`tbBillingDetail.fdQty`, misal `0.0257 m³`).
     - Basis volume acuan (`refM3`) dinaikkan minimal ke `0.1 m³` khusus untuk perhitungan batas kuota rasio berat (`maxAllowedWeight = 0.1 × rasio`) agar kargo kecil tidak salah divonis overweight.
     - Warning overweight HANYA muncul bila **Sisa Kuota Berat < 0**. Perbedaan catatan timbangan fisik antar dokumen selama sisa kuota aman TIDAK memicu warning.
     - **Kesalahan Hitung Penagihan KG Tanpa Overweight (`isBilledUnneededOverweight`)**:
       - Bila berat fisik aktual muatan masih dalam kuota rasio (`isOverweight = false`), namun invoice memuat item penagihan KG (`effectiveBilledKg > 0`), sistem mengklasifikasikan anomali ini sebagai **KESALAHAN HITUNG / SELISIH FATAL** (`hasOverweightIssue: true`, `isOverallValid: false`).
       - Header kartu `BillingValidationCard` menampilkan badge merah **DANGER** dengan ikon `X` dan teks `SELISIH KG (DITAGIH X KG TANPA OVERWEIGHT)` (bukan `COCOK (KOMPLAIN)` hijau).
       - Modal ringkasan validasi `BillingValidationSummaryModal` membuka tab Overweight secara otomatis, menampilkan badge `Selisih` merah, dan banner modal berstatus **ERROR MERAH** (`bg-rose-500/10`) dengan ikon `XCircle`.
   - **Peringatan Di Bawah Minimum Charge M³ (Laut)**: Jika `billedM3 < minChargeM3` (default 0.1 m³), sistem memunculkan badge amber `DI BAWAH MIN. CHARGE` dan warning banner.
   - **Catatan Kontrak Pelanggan (`tbCustomersHarga`) & Tax Return**: Diletakkan secara rata samping berdampingan (`grid grid-cols-1 lg:grid-cols-2`). Menampilkan catatan tarif secara adaptif sesuai moda kargo faktur (Air menampilkan Note Air `fdNote`, Sea menampilkan Note Sea `fdNote 1`) terformat bersih dari karakter `^`, dilengkapi pill selector interaktif `[✈️ Udara] [🚢 Laut] [📋 Semua]` dan snippet intip cepat untuk catatan moda lainnya tanpa memakan ruang berlebih.
    - **Validasi Tarif Pokok M³ Kargo (Prioritas Price List Resmi Sistem)**:
      - Item tagihan kargo utama dengan unit `fdListCode === 'M3'` (dan bukan item Tax Return) diprioritaskan divalidasi ke **Price List Resmi Sistem** (Customer Price List jika ada kontrak khusus -> Master Price List CS/MKT).
      - **Evaluasi MATCH Bersifat Adaptif**:
        1. Jika tagihan cocok dengan Price List resmi (`minTargetPrice` s/d `maxTargetPrice`) -> **MATCH**.
        2. Jika customer ditagih flat sesuai profil CS (`profileHarga.harga > 0 && billedPrice === profileHarga.harga`) -> **MATCH** (mencegah false undercharge bagi pelanggan dengan kesepakatan tarif flat).
      - **Fallback Profil CS Hanya Saat Tidak Ada di Price List**: Jika item M³ sama sekali tidak memiliki padanan kategori di Price List, barulah sistem fallback menggunakan `profileHarga.harga` sebagai target acuan jika `profilePrice > 0`. Angka profil CS dari `tbCustomersHarga` diposisikan sebagai kolom pembanding (profil CS) dan tidak membajak acuan Price List resmi.
4. **Pengecualian Validasi Biaya Khusus Cabang `--` (`isNonValidatedBranchDashFee`)**:
   - Untuk item invoice dengan kode cabang `--` (`fdBranchCode === '--'` atau nomor invoice berawalan `--`), sistem mengecualikan validasi tarif terhadap item yang memuat frasa biaya/fee khusus (e.g. `AGENCY FEE`, `AWB FEE`, `BEA CUKAI`, `DOCUMENT FEE`, `HANDLING FEE`, `FREIGHT CHARGES`, `DEMURRAGE`, `STORAGE`, `TRUCKING`, `CUSTOM CLEARANCE`, `PORT HANDLING`, `SEWA GUDANG JAKARTA`, `LOLO`, dll) karena nilainya tidak terdapat di database acuan.
   - Item tersebut otomatis ditandai `isNonValidatedBranchDashFee: true`, berstatus `NO_TARGET`, dikecualikan dari perhitungan volume kargo utama, tidak memicu peringatan *Undercharge* / *Overcharge*, dan tidak memicu pesan error `tbExpIndo`.
   - Di antarmuka UI (`ValidationDetailPage`, `BillingValidationCard`, `FinancialAuditTab`), item ini menampilkan badge netral `Non-Validasi` dengan keterangan acuan `Tidak Terdapat di Database`.
5. **Fallback Validasi M³ Berbasis No Invoice Terkait (Induk & Anak/Pecahan)**:
   - Pada pengiriman laut dalam 1 batch marking (`fdMarkingCode`), faktur pelanggan dapat terdiri dari Invoice Induk (e.g. `--S-000679-09-2026`) dan Invoice Pecahan/Anak (e.g. `--S-A00679-09-2026`, `--S-B...`).
   - Tagihan kubikasi fisik kargo dari beberapa listCode (e.g. `0943385` [0.0308 m³] + `0943386` [0.1496 m³]) digabungkan dan ditagihkan secara akumulatif pada invoice induk (`0.1804 m³`), sementara pada invoice anak ditagihkan 0 m³ dengan item `GABUNG - [NO_INVOICE_INDUK]`.
   - Engine `useBillingValidation` mengevaluasi `relatedBillsSummary` dari backend:
     - **Invoice Induk**: Menambahkan kandidat `RelatedBillsGudang` (`normM3(sumM3Gudang)`), `RelatedBillsPL`, dan `RelatedBillsKomplain`. Saat `billedM3` cocok dengan total akumulasi fisik bill terkait, status dinyatakan **VALID** (`matchStatus: MATCH_PRIMARY`) dengan label informatif `M3 Terkait: [List Induk] + [List Anak]`.
     - **Invoice Anak (`isChildBillMerged`)**: Otomatis berstatus **VALID** (`matchStatus: MATCH_PRIMARY`) dengan label `Digabung ke [Invoice Induk]`, tanpa memicu peringatan keliru di bawah minimum charge (`isBilledBelowMinM3`) maupun COD/urgent shortfall.
     - **UI Highlight (`PhysicalAuditTab.tsx`, `BillingValidationCard.tsx`)**: Menampilkan box rincian keluarga invoice, daftar invoice terkait, status induk vs pecahan, dan akumulasi M³ fisik gudang/PL.

### B. Infinite Scroll Antrean Validasi (`ValidationListPage.tsx`) & Detail Validasi (`ValidationDetailPage.tsx`)
- Menggunakan `PAGE_SIZE = 25` dengan `IntersectionObserver` sentinel untuk mencegah DOM bloating.
- Menyaring hanya faktur **Draft Murni** (`fdGive != 1`, `fdGive2 != 1`, `fdCekDate == null`).
- **Indikator BillTo ≠ Master**:
  - Mendeteksi perbedaan nama antara penerima faktur (`fdBillTo`) dengan nama master customer (`tbCustomers.fdCustName`).
  - Menampilkan badge amber `BillTo ≠ Master` pada kolom customer tabel desktop dan kartu mobile `ValidationListPage.tsx`.
- **Timestamp Issued & Petugas Penerbit (`ValidationDetailPage.tsx`)**:
  - Ditempatkan di bawah tampilan **Tgl Tagihan** pada kartu "Identitas Tagihan & Customer":
    - **Header**: Ikon `Clock` + label `WAKTU ISSUED`.
    - **Waktu**: Format lengkap `formatDateTime(data.fdGiveDate)` (misal `30 Sep 2026, 13.06 WIB`) dengan tipografi mono tabular emerald.
    - **Petugas**: `Oleh: [Nama Petugas]` (`data.giveEmployee?.fdEmpName`) jika faktur telah diterbitkan.
    - **Status Belum Terbit**: Teks amber `Belum Terbit (Draft)` jika `fdGiveDate` belum terisi.
  - **Tooltip `IssuedBadge`**: Komponen `IssuedBadge` pada header bar kini menerima properti `issuedDate` dan `issuedBy` untuk menampilkan tooltip hover lengkap (e.g. `Diterbitkan: 30 Sep 2026, 13.06 WIB oleh FERLY`).
- **Drawer Pencarian & Pemilihan Invoice (`ValidationListDrawer.tsx`)**:
  - Dibuka dari `ValidationDetailPage` via tombol pencarian cepat atau perintah suara (*"cari"*, *"pilih invoice"*, *"drawer"*, *"daftar invoice"*).
  - Standby suara otomatis saat terbuka dengan pembersihan transkrip atomik (`resetTranscript()`) saat mount/unmount untuk mencegah trigger residual.
  - **Eliminasi Konflik Kata "Buka"**:
    - Kata *"buka"* dihapus 100% dari trigger aksi dan UI drawer untuk menghindari tabrakan dengan navigasi tab halaman detail (*"buka tab 1-5"*).
    - Memilih faktur terpilih/disorot menggunakan perintah murni: *"pilih"*, *"enter"*, *"oke"*, *"ya"*, atau tombol Enter keyboard.
    - Perintah komposit: *"pilih [nomor/nama]"* langsung mencocokkan dan membuka faktur yang cocok tanpa fallback acak.
    - Ucapan kata *"buka"* di dalam drawer otomatis diabaikan atau disaring dari teks pencarian (e.g. *"buka 010866"* $\to$ mencari *"010866"*).
    - Banner status dan badge item UI diselaraskan menjadi panduan *"Pilih"* / *"Tekan Enter ↵"*.
- **Unified Dynamic Voice Capsule HUD (`ValidationVoiceHud.tsx`) & Integrasi Topbar**:
  - **Dynamic Voice Capsule HUD (Bottom-Center Layar)**:
    - Menggantikan FAB floating ganda dan tombol ribbon lama dengan komponen kapsul modern mengambang di posisi `fixed bottom-10 sm:bottom-14 md:bottom-16 left-1/2 -translate-x-1/2 z-40`.
    - **Elevasi Di Atas Navbar Windows**: Ditinggikan ke `bottom-10` (40px) pada layar kecil dan `bottom-16` (64px) pada desktop/laptop agar melayang nyaman di atas Windows taskbar atau browser bottom bar tanpa menutupi elemen tabel.
    - 4 Siklus Status Visual: Standby (`[ 🟢 Siap Mendengar ]`), Listening (waveform audio mini bergerak dinamis + live transcript), Executing (badge checkmark interaktif + nama aksi), dan Muted (`[ 🔇 Mikrofon Jeda ] (Alt+V)`).
    - Tombol Popover Panduan Perintah (`[ ? ]`): Menampilkan cheat sheet terstruktur dengan chip perintah suara hands-free yang dapat diklik langsung bila lingkungan bising.
  - **Auto-Hide Tombol Voice Assistant di Topbar (`Topbar.tsx`)**:
    - Topbar memeriksa `canUseVoice && displayMode !== 'hud'`. Saat pengguna berada di Halaman Validasi Billing (`displayMode === 'hud'`), tombol mic di topbar otomatis disembunyikan untuk mencegah tombol ganda di layar.
    - Ketika pengguna berpindah ke halaman lain, `displayMode` otomatis kembali ke `'modal'` dan tombol mic di Topbar muncul kembali.
- **Perintah Suara Buka Invoice Langsung (`handleOpenInvoiceByVoice`) & Standby Hands-free**:
  - Diterapkan pada `ValidationDetailPage.tsx` dan `BillingValidationSummaryModal.tsx` untuk perintah seperti: *"buka 11023"*, *"buka no invoice 11023"*, *"buka invoice GZS 011023"*, *"buka 010751"*.
  - **Buffer Debounce Hening 1 Detik (~1000ms)**: Menunggu 1 detik jeda hening setelah ucapan terakhir pengguna sebelum mengevaluasi perintah, memastikan nomor invoice dan kata majemuk lengkap terserap tanpa terpotong namun eksekusi tetap responsif.
  - **Pencarian Prioritas Data Belum Issued (`draftOnly: true`)**:
    - Query memprioritaskan faktur berstatus **Draft Murni / Belum Issued** (`draftOnly: true`, `hasAmount: true`, `minYear: 2023`).
    - **Resolusi Urutan Angka Cerdas (Smart Sequence Matching)**: Membandingkan nomor urut faktur tanpa leading zeros (`unpaddedDigits`, misal ucapan `"11023"` cerdas mencocokkan sequence `"011023"` pada `"GZS-011023-09-2026"`).
    - Mencegah navigasi ke string URL mentah/palsu (seperti `GZS-11023` yang memicu 404). Sistem selalu menyelesaikan string nomor faktur asli yang di-trim dari database.
    - **Fallback Penanganan Status Issued**: Jika nomor faktur yang disebutkan tidak ditemukan pada antrean draft (karena sudah diterbitkan sebelumnya), sistem menjalankan kueri fallback tanpa `draftOnly` dan membuka faktur tersebut disertai notifikasi informatif status Terbit/Issued.

### C. Modal Dimensi Fisik Koli (`DimensionDetailModal.tsx`)
- Membedah komparasi dimensi koli dari 3 tabel: `tbEntryListDetail` (Gudang), `tbEntryListDetail_PackingList` (PL), dan `tbEntryListDetail_Komplain` (Komplain).
- Menampilkan rumus konversi $(P \times L \times T \times Qty) \div 1.000.000$ dan tabel rincian lengkap per koli.
  - Indikator standby titik hijau blinking `[ 🟢 Standby Suara ]` langsung pada header modal **Audit & Validasi Invoice** (`ValidationSummaryHeader.tsx`).

### D. Modal Ringkasan Validasi (`BillingValidationSummaryModal.tsx`)
- Dialog komprehensif `size="3xl"` (`max-w-7xl` = 1280px) dengan tinggi 85vh yang menggabungkan:
  - **Verdict Rinci & Multi-Issue List (`ValidationSummaryFooter.tsx`)**: Mengeliminasi pesan generik "Terdapat Catatan Validasi Pada Invoice Ini" dengan rincian spesifik: shortfall volume COD/Urgent (`isCodUrgentShortfall`), ketidaksesuaian koli (`hasQtyMismatch`), overweight kuota rasio, selisih hasil komplain disetujui, selisih simulasi Type 2, serta rendering daftar catatan berpoin lengkap (`validationIssues`).
  - **Audit Finansial (`FinancialAuditTab.tsx`)**: Menampilkan **Total Invoice** pada KPI card atas dan baris `tfoot` tabel, kolom **Subtotal Tagihan** per baris item, badge **Tipe Komoditi** (`COMMODITY_TYPES`), prioritas pemetaan khusus pelanggan di atas global, dukungan Tier 0 direct price, dan komparasi selisih tarif master.
  - **Audit Fisik (`PhysicalAuditTab.tsx`)**:
    - **Banner Prioritas Atas**: Banner peringatan volume di bawah rekomendasi COD/Urgent (`recommendedM3` vs `billedM3`) dan di bawah batas minimum charge (`minChargeM3`) diposisikan di urutan paling atas dengan aksen border kiri tebal (`border-l-4 border-l-amber-500 bg-amber-500/5`), ikon squircle, dan sorotan angka mono.
    - **Kartu KPI Primer & Sekunder Berdensitas Tinggi**: Menampilkan angka volume dan berat dengan `text-lg sm:text-xl font-bold font-mono tracking-tight tabular-nums`. Kartu acuan terpilih (`isUsedGudang`, `isUsedPL`, `isUsedKomplain`) mendapat elevasi semantik beraksen emerald (`border-emerald-500/60 bg-emerald-500/[0.04] ring-1 ring-emerald-500/20`) dengan pill `Dipakai Bill` berdenyut hijau.
    - **Tabel Rekapitulasi Kelompok Bill Terkait (Induk & Pecahan 1 Batch)**:
      - Menampilkan tabel komprehensif seluruh `fdListCode` dalam batch: No. Invoice (dengan navigasi klik `onSelectInvoice`, ikon `ExternalLink`, dan highlight aksen baris `(Saat Ini)` `bg-sky-500/10 border-l-4 border-l-sky-500`), Posisi (Induk / Pecahan A-Z), fdListCode mono, M³ Fisik Gudang, Berat (kg), Koli, M³ Ditagih, dan Status Bill (`✓ Ada Bill` vs `✕ Belum Ada Bill`).
      - Status audit badge header otomatis: `✓ Semua ListCode Ada Bill (N/N)` (Emerald) atau `⚠️ X ListCode Belum Ada Bill` (Rose pulse).
      - Baris total akumulasi `tfoot` merangkum total M³ gudang, berat kg, koli, billed M³, dan status kelengkapan batch 100%.
    - **Eliminasi Redundansi Rincian Marking**: Tabel `markingDetails` dikonversi menjadi panel accordion yang dapat dibuka/tutup (`isMarkingDetailsOpen`) ketika tabel kelompok bill terkait sudah aktif di atas, atau ditampilkan langsung bila invoice berstatus single bill.
    - **Dashboard Konsistensi Muatan Fisik**: Panel audit 3 kolom di bagian bawah mencakup Kuantitas Koli (`Package`), Timbangan Fisik (`Scale`), dan Status Validasi Fisik (`CheckCircle2`/`XCircle`), 100% patuh standar Midnight Dark Mode.
  - **Audit Overweight (`OverweightAuditTab.tsx`)**: Audit rasio overweight muatan laut, kuota rasio, berat aktual fisik multi-sumber dengan fallback keluarga bill terkait (`sumBerat`), toleransi selisih penagihan KG, dan status aman untuk invoice anak pecahan (`isChildBillMerged`).
  - **Audit Freight Charge (`FreightAuditTab.tsx`)**.
  - **Audit Transport Lokal (`TransportAuditTabContent.tsx`)**: Biaya ekspedisi `tbExpIndo`.
  - **Modularisasi & Helper Terpusat (`validationSummary.utils.ts`)**:
    - `findTransportDetailItem(details)`: Mengeliminasi duplikasi pemindaian array kargo untuk pencarian biaya lokal.
    - `getEffectiveTransportAmount(billingData, transportItem)`: Resolusi nominal tagihan transport lokal.
    - `getEffectiveInvoiceTotal(billingData, details)`: Resolusi total tagihan & mata uang efektif.
    - `calculateValidationVerdict(params)`: Menyatukan hierarki 12 cabang evaluasi verdict title & description secara deterministik dan teruji, menggantikan 60 baris nested ternary bersarang.

### E. Arsitektur Modular Kartu Validasi (`BillingValidationCard.tsx` & `validation-card/`)
Komponen visual utama validasi billing individual (`BillingValidationCard.tsx`) direfaktorisasi dari monolithic 2.276 baris menjadi arsitektur orchestrator ramping (~640 baris) dengan subkomponen tersegmen di bawah direktori `src/features/billing/components/validation-card/`:
- **`ValidationCardHeader.tsx`**: Header kartu dengan identitas listCode, status mode (By Air / Type 2), badge status dinamis (termasuk status amber `PEMBULATAN WAJAR X KG` dengan `badgeTitle` tooltip saat ada selisih pembulatan wajar $\le 1\text{ kg}$), dan tombol refresh kuari.
- **`ValidationCardTabsBar.tsx`**: Bilah navigasi 5 tab kompak dengan status pill indikator live (`Cek`, `✓ Valid`, `✓ Sesuai`, `✓ Toleransi`, `Selisih`, `Nihil`, dll).
- **`ProfilePricingTab.tsx`**: Tab 1 (Item & Tarif) — profil harga customer, 4 KPI tarif utama, layout rata samping Tax Return & Catatan Tarif Customer dengan switcher moda pill (`[Udara] [Laut]`) tanpa tab Semua dan hanya menampilkan note yang relevan (`fdNote` untuk Udara, `fdNote 1` untuk Laut), evaluasi komoditas 3-way check, link acuan Price List modal, serta **pengecekan masa berlaku tarif customer (`endDate`)**:
  - Menampilkan rentang masa berlaku lengkap: `Masa Berlaku: [Tgl Mulai] s/d [Tgl Akhir / Selamanya]`.
  - Badge peringatan merah `⚠️ Tarif Customer Kedaluwarsa (Berakhir: [tgl])` jika tanggal tagihan > tanggal berakhir tarif, serta keterangan invoice item `Tarif customer kedaluwarsa (fallback ke Master Price List)`.
  - Badge amber `⚡ Segera Berakhir (Berakhir: [tgl])` jika masa berlaku tersisa $\le 7$ hari.
  - **Badge Hybrid Status Tarif**: Menampilkan `[✓ Sesuai Profil]` sekaligus `[▲ Overcharge vs Master (+Rp ...)]` jika tarif invoice cocok dengan profil customer namun melampaui Price List Master CS.
- **`PhysicalValidationTab.tsx`**: Tab 2 (Validasi Fisik) — perbandingan kubikasi M³ (Laut) / timbangan berat (Udara) / komparasi Type 2 (`Type2ComparisonPanel`), rincian data per listCode & per marking, serta pesan status evaluasi.
- **`OverweightTab.tsx`**: Tab 3 (Overweight Jalur Laut) — analisis rasio overweight muatan laut, batas kuota rasio, berat aktual fisik multi-sumber dengan fallback keluarga bill terkait (`sumBerat`), toleransi selisih pembulatan wajar penagihan KG ($\le 1\text{ kg}$ $\to$ `isBilledOverweightTolerated`, berstatus aman dengan badge amber `PEMBULATAN WAJAR X KG` tanpa memicu false-alarm `BELUM DITAGIH`), dan status aman untuk invoice anak pecahan (`isChildBillMerged`).
- **`FreightChargeTab.tsx`**: Tab 4 (Freight Charge) — rangkuman biaya FC valas operasional dari EntryList pengiriman.
- **`TransportTab.tsx`**: Tab 5 (Ekspedisi Lokal) — verifikasi biaya ekspedisi lokal `tbExpIndo` (Harus Tagih vs COD).
- **`types.ts` & `index.ts`**: Kontrak antarmuka `ValidationCardDerivedProps` dan barrel export terpusat.
- **Tabel Rincian Item (`InvoiceItemsTable.tsx` & `ValidationBadges.tsx`)**: Menampilkan item baris tagihan pada kolom kiri `ValidationDetailPage.tsx` lengkap dengan **Badge Hybrid Ganda** (`ItemPriceBadge`) yang menampilkan `[✓ Sesuai Profil]` sekaligus `[▲ Overcharge (+Rp ...)]` atau `[Diskon Profil (-Rp ...)]` serta `[Non-Validasi]` untuk biaya invoice cabang.

### F. Modal Pricelist Customer (`CustomerHargaModal.tsx`)
- **Tujuan**: Menampilkan seluruh tarif acuan aktif milik pelanggan dari tabel lebar `tbCustomersHarga` (136 kolom) yang telah diparsing secara terstruktur sesuai cabang dan komoditas, terintegrasi langsung dengan revisi audit `tbCustomersHargaAudit`.
- **Integrasi Tombol [🏷️ Tarif]**:
  - `ValidationListPage.tsx`: Terpasang di samping nama customer pada kolom tabel desktop dan kartu mobile (dengan `e.stopPropagation()` agar tidak memicu navigasi baris).
  - `ValidationDetailPage.tsx`: Terpasang pada **Ribbon Tombol Header Cepat** (di samping tombol Audit) dan pada kartu **Identitas Tagihan & Customer** di samping nama pelanggan.
- **Fitur Antarmuka**:
  - Banner Metadata: Tipe Tagihan (`metadata.typeTagihanLabel`), No. Penawaran (`metadata.penawaran`), Batas Rasio Overweight kg/m³ (LR, SP, PM), Tarif Asuransi (format 2 digit desimal via `formatDecimal(..., 2)`), serta Catatan Khusus Udara (`fdNote`) dan Catatan Laut (`fdNote1`).
  - Navigasi Tab Cabang (`Semua`, `GZ`, `YW`, `SH`, `SZ`, `HK`, `SG`, `BKK`, `KR`) dengan counter tarif per cabang.
  - Segmented Switcher Moda (`[Semua Moda | ✈️ Udara | 🚢 Laut]`).
  - Search filter instan komoditi/layanan dan toggle filter `[Hanya Revisi (N)]`.
  - Tabel tarif & kartu mobile: Menampilkan tarif aktif, unit satuan (`/ m³` vs `/ kg`), badge `Master Acuan` atau badge `Revisi Audit` (lengkap dengan tooltip harga awal dan user pengubah).
  - Ekspor Excel: Tombol unduh seluruh tarif pelanggan terfilter ke file spreadsheet `.xlsx`.

### G. Deteksi Kesalahan Input Mata Uang (Anomali Header Valas vs Rincian Item Rupiah)
- **Latar Belakang Masalah**:
  - Pada sistem FoxPro warisan, invoice tertentu (contoh: `GZS-010751-09-2026`) memiliki nilai tagihan utama di `fdJumlah1` (misal Rp 75.949.950) dan nilai item lain di `fdJumlah2` (misal 2.881.600 untuk Tax Return).
  - Kesalahan operator terjadi saat `fdCurr1` diinput sebagai valas (`"S$"` / SGD), sementara pada seluruh item rincian (`tbBillingDetail`) tidak ada satu pun item yang menggunakan satuan atau mata uang `S$` (semua item dalam Rupiah `RP.` / `M3`).
  - Sistem sebelumnya menganggap tagihan tersebut bernilai `S$ 2.881.600,00` (jutaan dollar Singapura), mengabaikan `fdJumlah1`, dan menyesatkan kasir serta staf penagihan.
- **Logika Deteksi Sistem (`useBillingValidation.ts`)**:
  - `isCurrencyInputError`: Aktif jika `fdJumlah2 > 0` dan `fdCurr1` adalah valas (bukan `RP`, `RP.`, `IDR`), namun **TIDAK ADA** satupun baris item yang menggunakan `fdListCode` atau `fdCurr` valas tersebut.
  - `currencyInputErrorDetail`: Menyimpan kode valas yang keliru, nominal `fdJumlah2`, nama item yang nilainya cocok (`matchedItemName`, misal TAX RETURN), dan total riil Rupiah (`correctTotalRp = fdJumlah1 + fdJumlah2`).
  - **Dampak Status Validasi**:
    - `isFinancialValid = false` (audit finansial otomatis berstatus TIDAK VALID / GAGAL).
    - Menambahkan rincian isu ke `validationIssues` dan footer kesimpulan modal summary.
- **Tampilan Antarmuka (`ValidationDetailPage.tsx`)**:
  - **Banner Peringatan Merah**: Alert box mencolok bertema Midnight Dark Mode (`bg-rose-500/10 border-rose-500/35 text-rose-700 dark:text-rose-300`) di atas baris pembuat/kasir dan rincian item, menjelaskan nilai valas yang keliru dan total riil Rupiah yang seharusnya.
  - **Badge Baris Item**: Baris item yang nilainya sama dengan `fdJumlah2` (baik di mobile view maupun desktop table) ditandai dengan badge `⚠️ Salah Input ke Valas ([Mata Uang])`.
  - **Issue Invoice**: Modal penerbitan invoice menerima total riil Rupiah (`correctTotalRp`) sehingga pencatatan penerbitan invoice tidak menghasilkan nominal valas yang salah.

### H. Universal ERP & Billing Voice Assistant (`VoiceAssistantModal.tsx`, `voiceAssistantStore.ts`, `useVoiceRecognition.ts`, `voiceSearch.utils.ts`)
- **Tujuan**: Asisten suara cerdas hands-free yang beroperasi di **seluruh halaman aplikasi web ERP** (`AppLayout.tsx`) untuk mempercepat navigasi modul, pencarian invoice, serta audit validasi dan penerbitan invoice.
- **4 Kapabilitas Utama**:
  1. **Navigasi Modul ERP Global (`NAVIGATE_PAGE`)**:
     - Berpindah halaman langsung dari mana saja tanpa mouse/keyboard:
       - *"Buka dashboard"* / *"Halaman utama"* $\to$ `ROUTES.DASHBOARD`
       - *"Buka monitoring surat jalan"* / *"SJ pending"* $\to$ `ROUTES.DELIVERY_ORDERS_MONITORING`
       - *"Buka surat jalan"* $\to$ `ROUTES.DELIVERY_ORDERS_LIST`
       - *"Buka inventori gudang"* $\to$ `ROUTES.DELIVERY_ORDERS_INVENTORY`
       - *"Buka BAP"* / *"Berita acara"* $\to$ `ROUTES.INSPECTION_REPORTS`
       - *"Buka kontainer"* / *"Batch marking"* $\to$ `ROUTES.SHIPMENT_BATCHES`
       - *"Buka ukuran marking"* $\to$ `ROUTES.SHIPMENT_BATCH_MARKING_SIZE`
       - *"Buka resi"* / *"Shipments"* $\to$ `ROUTES.SHIPMENTS`
       - *"Buka antrean validasi"* $\to$ `ROUTES.BILLING_VALIDATION_LIST`
       - *"Buka target penagihan"* $\to$ `ROUTES.BILLING_TARGET`
       - *"Buka daftar invoice"* $\to$ `ROUTES.BILLING_LIST`
       - *"Buka kasir"* / *"Pelunasan"* $\to$ `ROUTES.CASHIER`
       - *"Buka wallet"* / *"Saldo deposit"* $\to$ `ROUTES.WALLET`
       - *"Buka price list"* / *"Master tarif"* $\to$ `ROUTES.PRICE_LIST`
       - *"Buka tarif customer"* $\to$ `ROUTES.CUSTOMER_PRICE_LIST`
       - *"Buka customer"* $\to$ `ROUTES.CUSTOMERS`
       - *"Buka profil"* $\to$ `ROUTES.PROFILE`
       - *"Buka user management"* $\to$ `ROUTES.USERS`
  2. **Pencarian & Buka Invoice dari Halaman Mana Saja (`SEARCH_INVOICE`)**:
     - Pengenalan ucapan: e.g. *"Cari invoice GZS kosong satu kosong tujuh lima satu"*, *"Buka faktur Santoso"*.
     - Normalisasi ejaan angka fonetik (`kosong`/`nol` $\to$ `0`, `satu` $\to$ `1`, `strip` $\to$ `-`, `gezetes` $\to$ `GZS`).
     - Auto-navigation (0.8s countdown) saat ditemukan 1 invoice cocok langsung ke `ROUTES.BILLING_VALIDATION_DETAIL`.
     - Tampilan kartu kandidat jika ditemukan beberapa hasil pencarian yang cocok.
  3. **Perintah Suara Validasi Bill Cerdas (`VALIDATE_BILL`, `REFRESH_VALIDATION`)**:
     - **Validasi Bill Spesifik**: *"Validasi bill GZS 010751"*, *"Validasi invoice 010751"*, *"Validasi faktur Santoso"* $\to$ Otomatis mengekstrak nomor/nama invoice, mengeksekusi pencarian API, dan membuka detail validasi invoice.
     - **Validasi Bill Aktif (Hands-Free Inspection)**: *"Validasi bill ini"*, *"Validasi bill"*, *"Cek validasi"*, *"Periksa validasi"*, *"Inspeksi bill"* $\to$ Membuka modal kesimpulan validasi (`BillingValidationSummaryModal.tsx`) saat berada di halaman detail faktur.
     - **Validasi Per Sub-Tab**:
       - *"Validasi fisik bill"* / *"Validasi kubikasi"* $\to$ Tab `m3_weight` (Fisik M³ / Kg).
       - *"Validasi overweight bill"* $\to$ Tab `overweight` (Overweight).
       - *"Validasi tarif bill"* / *"Validasi harga"* $\to$ Tab `items` (Finansial / Item).
       - *"Validasi transport bill"* / *"Validasi ongkir"* $\to$ Tab `transport` (Biaya `tbExpIndo`).
       - *"Validasi freight bill"* $\to$ Tab `freight` (Freight Charge).
     - **Navigasi Antrean Validasi**: *"Antrean validasi bill"*, *"Daftar validasi bill"* $\to$ `ROUTES.BILLING_VALIDATION_LIST`.
     - **Muat Ulang / Refresh Data Validasi**: *"Refresh validasi"*, *"Muat ulang validasi"*, *"Cek ulang"* $\to$ Meng-invalidate React Query cache (`billingDetail`, `m3-check`, `billingTransportCheck`) secara atomik tanpa refresh layar.
  4. **Penerbitan Invoice Resmi (`ISSUE_INVOICE`, `CONFIRM_ISSUE`) & Redesign Modal (`IssueInvoiceModal.tsx`)**:
     - **Redesign Visual Premium & Densitas Tinggi**:
       - Top ambient accent bar dinamis: Emerald gradient untuk penerbitan standar, Amber/Rose gradient saat terdeteksi risiko undercharge.
       - Kartu ringkasan eksekutif: Header identitas nomor faktur dengan tombol salin instan (`copyToClipboard`), tanggal faktur, box avatar customer (`getInitials`), dan highlight ribbon Total Tagihan Resmi tabular figures.
       - Kartu identitas petugas penyerah invoice (`tbBillingGiveEmp`): squircle avatar, kode & nama staf terverifikasi otomatis, dan selector switch petugas.
       - Panel audit risiko undercharge: badge risiko `UNDERCHARGE DETECTED`, list item interaktif dengan delta minus font mono rose, dan checkbox persetujuan dengan ring feedback.
       - Ketentuan legalitas & SOP compliance banner.
     - **Interaktivitas & Kontrol Cepat**:
       - Perintah suara konfirmasi hands-free: *"Ya"*, *"Ok"*, *"Terbitkan"*, *"Konfirmasi"* (otomatis menyetujui warning undercharge) atau *"Batal"*, *"Tutup"*.
       - Pintasan keyboard: `↵ Enter` untuk konfirmasi instan, `Esc` untuk menutup dialog, `Alt+V` untuk toggle standby mic.
  5. **Pencarian Suara Hands-Free & Perintah "Buka" Drawer Cari Faktur (`ValidationListDrawer.tsx`)**:
     - *Auto-Start & Continuous Re-Arm*: Mikrofon otomatis aktif seketika saat drawer dibuka tanpa klik icon mikrofon. Dilengkapi auto re-arm resilien pada event onEnd selama drawer aktif.
     - *Eliminasi Reactivity Loop (useVoiceRecognition.ts)*: Callback onResult, onError, dan onEnd dibungkus useRef agar fungsi kontrol startListening dan stopListening memiliki identitas referensi stabil, mencegah loop pembatalan audio saat pengguna mulai berbicara.
     - *Penanganan Event Hening*: Event browser no-speech dan aborted tidak lagi diperlakukan sebagai error kritis (mencegah false-positive alert saat jeda hening membaca layar).
     - *Filter Instan*: Pencarian langsung menyaring dataset draft invoice aktif (`activeDraftBillings`) di memori tanpa jeda debouncing backend.
     - *Auto-Selection*: Hasil pencarian teratas otomatis terpilih dengan badge `🎯 Terpilih · Katakan "Buka" atau Tekan Enter ↵` serta glowing ring sky blue.
     - *Smooth Auto-Scroll*: Item yang sedang disorot otomatis digulir ke viewport saat berpindah pilihan.
     - *Eksekusi Perintah Suara*:
       - *"Buka"* / *"Pilih"* / *"Enter"* / *"Ya buka"* $\to$ langsung membuka faktur terpilih dan menutup drawer.
       - Perintah komposit (e.g. *"Santoso buka"*, *"010751 buka"*, *"Buka Santoso"*) $\to$ mendeteksi target pencarian, mencocokkan faktur, dan langsung membukanya.
       - *"Bawah"* / *"Turun"* / *"Atas"* / *"Naik"* $\to$ navigasi baris pilihan secara bertahap.
       - *"Tutup"* / *"Batal"* $\to$ menutup drawer.
     - *Shortcut Eksklusif `Alt+V`*: Mengontrol toggle mikrofon input drawer secara capture phase dengan `stopPropagation()`, tanpa memicu modal suara global.
   6. **Isolasi Fitur Suara & Standby Otomatis pada Modal Audit & Konfirmasi (`BillingValidationSummaryModal.tsx`, `ValidationSummaryHeader.tsx`, `IssueInvoiceModal.tsx`)**:
      - *Standby Hands-Free Otomatis*: Kedua modal otomatis berada dalam status standby mendengarkan (`startListening()`) seketika saat dibuka tanpa perlu menekan Alt+V atau klik tombol mic.
      - *Auto Re-Arm*: Jika terjadi jeda hening atau kalimat selesai, pengenal suara otomatis re-arm (standby kembali dalam 200ms) selama modal masih terbuka.
      - *Visual Titik Hijau Blinking*: Menampilkan indikator titik hijau berkedip (`animate-ping` + `animate-pulse` emerald dot) dan badge 'Standby Suara' yang menandakan sistem siap menerima perintah suara kapan saja secara hands-free.
      - *Supresi Penuh Asisten Global (`suppressVoice()`)*: Selama modal audit atau konfirmasi terbuka, fitur voice global diblokir total (tidak membuka `VoiceAssistantModal`). Tombol link asisten suara global pada ribbon header `ValidationDetailPage.tsx` dihapus demi eliminasi ambiguitas antarmuka.
      - *Perintah Eksklusif Modal Audit & Validasi (`BillingValidationSummaryModal.tsx`)*:
        1. **`terbitkan`**: Menghentikan suara, menutup modal audit, dan membuka modal konfirmasi penerbitan.
        2. **`buka tab 1` - `buka tab 5`** atau **`buka tab [nama_tab]`**: Berpindah sub-tab modal secara instan sesuai urutan tampilan (Tab 1: Items/Tarif, Tab 2: Fisik/Kubikasi/M3, Tab 3: Overweight/Freight, Tab 4: Freight/Transport, Tab 5: Transport), atau berdasarkan nama tab.
        3. **`tutup modal` / `batal`**: Menutup modal audit.
        - Perintah di luar domain ini diabaikan (tidak menjalankan navigasi global / pencarian global).
      - *Perintah Eksklusif Modal Konfirmasi (`IssueInvoiceModal.tsx`)*:
        1. **`ya` / `ok` / `oke` / `terbitkan` / `konfirmasi` / `setuju`**: Menyetujui peringatan undercharge (jika ada) dan memproses penerbitan invoice resmi.
        2. **`batal` / `cancel` / `tutup`**: Membatalkan dan menutup modal konfirmasi penerbitan.
    7. **Perintah Suara Buka No Invoice Langsung (`extractInvoiceOpenTarget`, `handleOpenInvoiceByVoice` di `ValidationDetailPage.tsx` & `BillingValidationSummaryModal.tsx`)**:
       - *Pengenalan Format Luas*:
         - Mengakomodasi varian ucapan lengkap: *"Buka no invoice GZS 010751"*, *"Buka invoice 010751"*, *"Buka no bill GZS 010751"*, *"Buka bill 010751"*, *"Buka faktur 010866"*, *"Buka 010751"*, *"Buka nomor 010751"*, *"Buka GZS 010751"*, atau kode langsung *"GZS 010751"*.
         - Normalisasi ejaan fonetik huruf cabang (`GZS`, `GZA`, `YWS`, `YWA`, `JKS`, `JKA`, `SG`, `HK`, `BKK`, `KR`, `SZ`, `SH`, `SUB`) dan angka fonetik (*"kosong satu kosong tujuh lima satu"* $\to$ `"010751"`).
       - *Direct Navigation*:
         - Jika format invoice sudah lengkap (e.g. `GZS-010751`), sistem langsung mengarahkan halaman ke `ROUTES.BILLING_VALIDATION_DETAIL(cleanTarget)` (`https://app.sampai.co/mshipping/finance/billing/validation/GZS-010751`) tanpa jeda.
         - Jika pengguna menyebut angka saja (e.g. `010751`), sistem menjalankan pencarian cepat ke `billingApi.list` untuk mencocokkan nomor faktur di database. Jika terdapat kecocokan cabang aktif saat ini atau tunggal, sistem langsung membuka invoice tersebut. Jika ambigu lintas cabang, drawer pencarian dibuka otomatis dengan keyword terkait.
       - *Proteksi Anti-Looping & Dual-Modal Support*:
         - Dilengkapi guard `isNavigatingInvoiceRef` untuk mencegah re-trigger ganda.
         - Jika invoice yang diminta adalah invoice yang sedang dibuka saat ini, sistem menampilkan notifikasi `Invoice [Nomor] sedang dibuka saat ini` tanpa memicu churn reload.
         - Perintah ini didukung baik saat berada di kartu validasi utama (`ValidationDetailPage.tsx`) maupun saat modal ringkasan (`BillingValidationSummaryModal.tsx`) sedang terbuka (modal otomatis tertutup dan halaman berganti ke faktur baru).
     8. **Buffer Penerimaan Suara 2 Detik (~2000ms Debounce) & Continuous Listening (`ValidationDetailPage.tsx` & `BillingValidationSummaryModal.tsx`)**:
        - Mengaktifkan `continuous: true` pada `useVoiceRecognition` agar sesi mikrofon tetap standby terbuka antarkata tanpa terputus otomatis oleh browser pada hening singkat (500–800ms).
        - Menerapkan mekanisme debounce hening 2 detik (2000ms via `voiceCommandTimerRef`): setiap suku kata atau token baru yang diucapkan pengguna memperbarui transkrip gabungan (`${transcript} ${interimTranscript}`) dan me-reset timer hening 2 detik.
        - Perintah suara baru dievaluasi dan dieksekusi secara atomik setelah hening penuh selama 2 detik pasca-ucapan terakhir, mencegah salah trigger prematur pada frasa majemuk (seperti *"buka no invoice GZS 010751"* tidak lagi terpotong pada angka awal).
        - Tombol telemetry mikrofon pada header dan modal menampilkan transkrip berjalan live dan status tunggu (`🎙️ "[teks]"...`), serta pembatalan instan saat tombol mic di-klik atau shortcut `Alt+V` ditekan.
- **Aksesibilitas & Kepatuhan Desain Global**:
  - Tombol global `[ 🎙️ Voice / Asisten Suara ]` pada `Topbar.tsx` di seluruh halaman aplikasi web.
  - Tombol aksi `[ 🎙️ Suara Alt+V ]` pada ribbon header `ValidationDetailPage.tsx`.
  - Tombol aksi `[ 🎙️ Suara Alt+V ]` langsung pada header modal **Audit & Validasi Invoice** (`ValidationSummaryHeader.tsx`).
  - Tombol `[ 🎙️ Asisten Suara Alt+V ]` pada antrean daftar validasi billing (`ValidationListPage.tsx`).
  - Icon tombol mic inline pada kolom input pencarian `ValidationListDrawer.tsx`.
  - Tombol mic konfirmasi suara pada footer `IssueInvoiceModal.tsx`.
  - Quick action pills kontekstual: tombol chip suara dinamis (*"Validasi Bill Ini"*, *"Audit Fisik"*, *"Audit Tarif"*, *"Refresh Validasi"*) muncul otomatis saat membuka faktur.
  - Pintasan keyboard universal **`Alt+V`** di seluruh halaman aplikasi (`AppLayout.tsx`) dengan event capturing dan elevasi modal `z-[10000]`.
  - **Grafis Visualizer Suara Reaktif (`VoiceVisualizerGraphic.tsx`)**: Menampilkan equalizer spektrum multi-bar dinamis (24-bar dengan kurva Gaussian vokal) dan gelombang sinus SVG mengalir live yang melonjak aktif seketika saat ucapan terdeteksi, berpadu dengan triple-ring radar sonar neon di tombol mic.
  - **Ketahanan Mikrofon Mobile & Android Chrome (`useVoiceRecognition.ts` & `VoiceAssistantModal.tsx`)**:
    - *Instansiasi Baru per Panggilan*: Menghilangkan `InvalidStateError` di Chrome Android.
    - *Interim Salvage*: Mengamankan kata-kata ucapan interim yang belum difinalisasi oleh Android saat sesi berakhir atau tombol stop di-tap.
    - *Hardware Sound Detection*: Menerapkan listener getaran fisik mic (`onaudiostart`, `onsoundstart`, `onspeechstart`, `onsoundend`, `onaudioend`) untuk mendeteksi suara nyata ke UI visualizer.
    - *Debounce Auto-Execute*: Mengeksekusi otomatis perintah setelah jeda hening tanpa harus menunggu recognizer timeout.
    - *Fallback Input Manual*: Dilengkapi kolom ketik perintah `[ 💬 Ketik perintah ]` di bawah modal agar staf gudang tetap bisa mengontrol ERP via teks jika berada di area bising atau mic diblokir.
    - *Panduan & Salin Cepat HTTP Insecure Origin*: Tombol satu-klik untuk menyalin URL `chrome://flags/#unsafely-treat-insecure-origin-as-secure` dan IP server `http://36.93.22.142` saat izin mikrofon terkunci oleh kebijakan browser.
  - **Kontrol Hak Akses & Role Permission (`useVoiceAssistantPermission.ts`)**:
    - Penggunaan fitur Asisten Suara dikendalikan secara granular melalui RBAC path `ROUTES.VOICE_ASSISTANT` (`/mshipping/voice-assistant`).
    - Pengguna dengan permission yang diizinkan (atau role `admin` dengan bypass otomatis) dapat mengakses tombol mic di `Topbar.tsx`, shortcut `Alt+V`, dan ribbon `ValidationDetailPage.tsx`.
    - Pengguna tanpa hak akses (e.g. role `viewer`) disembunyikan tombolnya dan shortcut keyboard dinonaktifkan secara aman.
  - Sepenuhnya mematuhi token tema Midnight Dark Mode (lingkaran sonar animasi, border transparan, tanpa background solid putih).

---

## 5. Pairing Local Charge (`PairingLocalChargePage.tsx`)
- Mencocokkan data biaya lokal (storage, beacukai, handling fee) dari Excel atau daftar teks resi manual.
- Mendukung pratinjau hasil matching dan ekspor kembali ke file binary Excel.

---

## 6. Report Designer Studio & Halaman Cetak Invoice
- **Report Designer (`ReportDesignerPage.tsx`)**: WYSIWYG studio layout drag-and-drop untuk mengatur posisi elemen header, tabel, total biaya, terbilang, rekening, dan tanda tangan.
- **Halaman Cetak Mandiri (`BillingPrintPage.tsx`)**:
  - Rute: `ROUTES.BILLING_PRINT(':id', mode)` di luar `AppLayout`.
  - `mode=pdf`: Layout grafis modern resolusi tinggi.
  - `mode=matrix`: Layout monospaced fixed-width untuk printer dot matrix Epson/LX continuous form.

---

## 7. Dekomposisi Komponen Modal Kompleks
Untuk mencegah *God Components*, modal audit dipecah menjadi submodul terisolasi:
1. `src/features/billing/components/cust-marking-detail/`:
   - **Paritas FoxPro (`frm_cust_permarking_view_fhd.scx`)**: Menampilkan 23 kolom lengkap data grid (`BC.`, `No. Invoice`, `Tgl. Inv`, `Marking No`, `Comodity`, `Ket`, `Curr`, `Value`, `Fc`, `Berat`, `Berat SJ`, `Berat K`, `KG Bill`, `Qty SJ`, `Qty Gdg`, `Qty PL`, `Qty K`, `Tipe`, `Tax`, `M3 Pl`, `M3/Vfc`, `M3 K/Vfc K`, `M3 Bill/Vfc Bill`).
   - **Tabel Data Datar / Flat (Tanpa Grouping)**: Baris kargo dirender secara berkelanjutan dengan penomoran urut `No.` (1..N) tanpa sekat baris subheader cabang, memastikan pengurutan (sorting) kolom berlaku langsung ke seluruh dataset. Identitas cabang tetap tampil ringkas pada kolom `BC.` per baris dan total cabang unik ditampilkan di baris sticky footer (`X Cab`).
   - **Mode Udara vs Laut**: Header dan data beralih otomatis antara `M³` (Laut) dan `VFC` (Udara).
   - **Pewarnaan Sesuai Tema**: Alert visual FoxPro diadaptasi ke CSS design tokens (badge rose transparan untuk `Qty PL = 0` dan `M3 Gudang > M3 Bill`, badge ungu transparan untuk status non-standar `status != 1`, badge emerald untuk `Tax = YES`).
   - **Sticky Footer 24-Cell**: Akumulasi total sejajar presisi di bawah setiap kolom data numerik.
   - **KPI Summary Banner Modern & Rapi (`CustMarkingSummaryBanner.tsx`)**:
     - Arsitektur 6 kartu KPI terpadu dengan tinggi seragam (`flex flex-col justify-between`), ikon semantik Lucide (`FileText`, `FileCheck2`, `Boxes`, `Scale`, `Box`), tipografi angka tabular monospaced terstruktur (`18-19px`), dan badge status pojok kanan atas (`Underbilled`, `Overweight`, `Selisih K`, `Sesuai`).
     - *Card Total Invoice*: Menampilkan jumlah faktur utama dan rincian `Gab` (gabungan) serta `Tmb` (tambahan) berbasis posisi karakter ke-5 dan ke-10 nomor invoice.
     - *Card Volume Kargo (Merged)*: Menggabungkan Volume Gudang (M³/VFC), Total Volume Bill, Volume Komplain (K), dan Volume Packing List (PL) lengkap dengan status evaluasi *Underbilled* vs *Sesuai Tagihan*.
     - *Card Status Lebih KG (Hybrid)*: Menampilkan angka overweight numerik yang konsisten (`+XX kg Lebih` / `0 kg Normal`) dengan rincian multi-sumber (Gudang `fdJmlBerat`, Surat Jalan `berat Sj`, dan Komplain `berat Komplain` hybrid) plus nilai rasio kargo.
     - *Filter Komoditas*: Baris pill scrollable horizontal dengan ikon `Tags`, chip filter aktif beraksen kontras, counter resi, dan akumulasi m³/vfc.
   - **Peringatan Multi-Cabang (`CustMarkingHeaderToolbar.tsx` & `CustMarkingDetailModal.tsx`)**: Menampilkan peringatan visual otomatis (`AlertTriangle`) saat terdeteksi lebih dari 1 cabang (`branches.length > 1`) pada data marking yang sama. Warning ditampilkan pada badge toolbar, badge `Modal.Header`, dan banner peringatan interaktif yang menandai apakah pengguna sedang melihat tampilan gabungan atau filter per cabang.
   - **Peringatan Selisih Qty Komplain (`qtyK > 0 && qtyK !== qtyGdg`)**:
     - *Cell Grid*: Kolom `Qty K` menampilkan badge peringatan amber transparan `formatNumber(qtyK) ⚠️` disertai tooltip detail ketika `qtyK > 0` dan tidak sama dengan `qtyGdg`.
     - *Sticky Footer*: Akumulasi total `Qty K` pada baris `tfoot` tabel menampilkan badge amber saat total Qty K berbeda dari total Qty Gudang.
     - *KPI Summary Banner*: Kartu `Total Koli` menampilkan badge `Selisih K (N)` beranimasi halus serta penyorotan subtext `K: [total] ⚠️`.
     - *Toolbar & Modal Header*: Banner notifikasi peringatan audit selisih koli komplain pada toolbar dan badge peringatan `Selisih Qty K (N)` pada `Modal.Header`.
   - **Redesign Standar Enterprise ERP & Generative UI (CustMarkingDetailModal.tsx)**: Mengunci tinggi modal pada h-[860px] max-h-[95vh] dengan sticky identity columns (No, BC, No. Invoice), sticky table footer (	foot), segmented presets, visualisasi kartu analitik komparatif, dan highlight selisih koli/overweight. Prototipe interaktif tersimpan di artefak marking_detail_redesign.html.
   - **Ekspor Excel 2-Sheet**: Sheet 1 (Ringkasan 23 kolom FoxPro) dan Sheet 2 (Detail dimensi fisik koli).
   - Berkas: `types.ts`, `useCustMarkingData.ts`, `CustMarkingHeaderToolbar.tsx`, `CustMarkingSummaryBanner.tsx`, `CustMarkingDataTable.tsx`, `custMarkingExcel.ts`, `CustMarkingDetailModal.tsx`.
2. `src/features/billing/components/customer-history/`: `types.ts`, `useCustomerHistoryData.ts` (Infinite scroll TanStack Query), `CustomerHistoryToolbar.tsx`, `CustomerHistoryKpiCards.tsx` (agregasi tarif rata-rata per tipe komoditi `commodityAvgRates`), `CustomerHistoryInvoiceTable.tsx`, `CustomerHistoryDetailTable.tsx`.
3. `src/features/billing/components/validation-summary/`: `types.ts`, `ValidationSummaryHeader.tsx`, `ValidationSummaryTabsBar.tsx`, `FinancialAuditTab.tsx`, `PhysicalAuditTab.tsx`, `OverweightAuditTab.tsx`, `FreightAuditTab.tsx`, `TransportAuditTabContent.tsx`, `ValidationSummaryFooter.tsx`.
4. `src/features/billing/components/IssueInvoiceModal.tsx`:
   - **Mode Standby Hands-Free Otomatis**: Mikrofon langsung aktif mendengarkan seketika saat modal dibuka tanpa shortcut keyboard atau klik icon mic.
   - **Visual Live Telemetry Titik Hijau Berkedip**: Indikator titik hijau berdenyut (`animate-ping` + `animate-pulse`) di header dialog dan footer mikrofon.
   - **Eksekusi Konfirmasi Suara Resilien Tanpa Stale Closure**: Mengatasi hambatan warning undercharge dengan `handleIssue(true)` dan `hasConfirmedUnderchargeRef`, memastikan kata cepat (*"ya"*, *"ok"*, *"oke"*, *"terbitkan"*, *"setuju"*, *"konfirmasi"*) langsung menerbitkan invoice secara deterministik.
   - **Perintah Suara Batal Cepat**: Mendeteksi ragam frasa pembatalan (*"batal"*, *"batalkan"*, *"cancel"*, *"tutup"*, *"kembali"*, *"keluar"*, *"tidak"*, *"jangan"*) dengan prioritas evaluasi tertinggi.
   - **Proteksi Konkurensi & Auto Re-arm**: `isProcessingRef` mencegah double-submission, dan sistem otomatis mere-arm mikrofon jika terjadi kegagalan jaringan atau validasi agar hands-free tetap berlanjut.
   - **Sinkronisasi Cache Multi-Kuari**: Meng-invalidate `billingDetail`, `billingList`, `billingValidationList`, `billingM3Check`, dan `m3-check`.
5. `src/features/billing/pages/ValidationDetailPage.tsx` & `src/features/billing/components/ValidationVoiceHud.tsx`:
   - **Unified Adaptive Voice Engine (`voiceAssistantStore.ts`)**:
     - Menghilangkan pemisahan sistem suara global vs lokal (`displayMode: 'hud'` vs `'modal'`).
     - Halaman validasi tidak lagi men-supresi asisten suara secara kaku; asisten suara otomatis beradaptasi menjadi capsule HUD ramping tanpa modal pop-up hitam yang menutupi layar kerja.
     - Shortcut universal `Alt+V` 100% konsisten di seluruh ERP.
   - **Eliminasi 100% Redundansi UI**:
     - *Penghapusan Floating FAB Ganda*: Menghapus seluruh stack `createPortal` FAB bulat di kanan bawah layar (tombol mic bulat dan tombol search bulat yang sebelumnya menutupi tabel dimensi koli).
     - *Penghapusan Tombol Mic Ribbon*: Menghapus tombol telemetri mic yang padat tooltip dari header ribbon.
     - *Perapihan Tombol Drawer Invoice*: Menata tombol `ListFilter` di header ribbon menjadi `<ListFilter /> <span>Cari Invoice</span>`.
   - **Unified Dynamic Voice Capsule HUD (`ValidationVoiceHud.tsx`)**:
     - Melayang ramping di **Bottom-Center** layar (`fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40`).
     - *Visual Waveform Reaktif*: Gelombang spektrum audio mini aktif saat mendeteksi ucapan.
     - *Telemetry Status 4-Fase*:
       1. **Standby**: Pill ramping `[ 🟢 Siap Mendengar ]` + tombol mute/unmute + tombol help `[ ? ]`.
       2. **Listening**: Melebar dinamis, visualizer waveform aktif, live transcript berjalan.
       3. **Executing**: Badge interaktif checkmark dengan umpan balik perintah nyata (e.g. *"Membuka invoice GZS-011023..."*, *"Beralih ke Tab M³..."*).
       4. **Muted**: Status netral `[ 🔇 Mikrofon Jeda ] (Alt+V)`.
     - *Clickable Command Cheat Sheet Popover*: Tombol `[ ? ]` membuka kartu panduan terstruktur dengan chip perintah langsung (*Buka Invoice*, *Tab 1-5*, *Refresh*, *Terbitkan*, *Cetak*, *Inspeksi*, dll) yang dapat di-klik langsung jika staf berada di ruangan bising.
   - **Pencarian Suara Drawer Bersih Tanpa Konflik Kata "Buka"**: Perintah *"cari"*, *"cari invoice"*, *"pilih invoice"*, *"drawer"*, *"daftar invoice"* langsung membuka `ValidationListDrawer` tanpa memuat kata "buka", sehingga kata "buka" diisolasi murni sebagai aksi pembuka faktur terpilih di dalam drawer.
   - **Perintah Suara Refresh / Segarkan Halaman & Data Validasi**: Mendeteksi ucapan *"refresh"*, *"segarkan"*, *"muat ulang"*, *"reload"*, *"cek ulang"*, *"sinkron"*, *"update data"* yang seketika meng-invalidate cache query (`billingDetail`, `m3-check`, `billingTransportCheck`) dengan feedback toast informatif dan animasi putar pada tombol header `[ 🔄 Refresh ]`.
   - **Perintah Suara Cetak / Print Invoice**: Mendeteksi ucapan *"cetak"*, *"print"*, *"unduh pdf"*, *"download pdf"*, *"cetak invoice"* untuk langsung mengunduh/mencetak dokumen faktur via `downloadInvoicePdf`.
   - **Navigasi Tab Hands-Free ("Tab 1, 2, dst")**:
     - Memetakan nomor tab ke kartu validasi `BillingValidationCard`: Tab 1 = Item & Tarif (`profile`), Tab 2 = Validasi M3 / Timbangan (`m3_weight`), Tab 3 = Overweight (Laut) / Freight (Udara/Type 2), Tab 4 = Freight (Laut) / Ekspedisi (Udara/Type 2), Tab 5 = Ekspedisi (Laut).
     - Mendukung varian kata bilangan (*"tab satu"*, *"tab dua"*, dst) serta nama tab spesifik (*"overweight"*, *"freight"*, *"ekspedisi"*, *"item"*, *"info tagihan"*) tanpa mewajibkan awalan *"buka"*.
     - Otomatis mengaktifkan `setMobileTab('validation')` saat beralih tab kartu di layar smartphone/tablet.
   - **Aksi Cepat Halaman**: Mendeteksi ucapan *"terbitkan"*, *"inspeksi"*, *"resi"*, *"history"*, *"audit"*, dan *"kembali"*.
6. `src/features/billing/pages/TargetPage.tsx`:
   - **Target Bill Dashboard (`/finance/billing/target`)**: Menampilkan kargo terkirim / siap tagih (FCL, COD, URGENT, Aging > 7 hari) yang belum dibuatkan faktur invoice.
   - **Audit & Sinkronisasi Pill / Filter Lengkap**:
     - *Mode Tabs (Semua, Udara, Laut)*: Reaktif terhadap URL `?type=...`. Auto-switch cerdas ke moda Laut saat filter FCL dipilih (karena kargo FCL hanya ada di Laut).
     - *PIC Filter*: Reaktif terhadap URL `?pic=...`. Menampilkan PIC relevan per moda (`yati`, `kiki` untuk udara; `thara`, `ferly`, `rico` untuk laut). Auto-reset PIC saat berganti moda jika PIC tidak kompatibel.
     - *Kategori Pills (Semua, SJ Terkirim, PARSIAL, FCL, COD, URGENT, Aging > 7 Hari, Belum Set Tipe)*: Reaktif terhadap URL `?group=...`. Helper `isFclTargetItem` memeriksa komoditas FCL/Kontainer & format marking code `26FCL-`. Helper `isNoTypeTargetItem` menangkap komoditas kosong, `-`, `0`, `NONE`, `N/A`, `NULL`.
     - *Pill PARSIAL (Multi-Marking Agent Delivery)*: Menampilkan kargo yang tanda terima agennya (`fdTerima`) memuat lebih dari 1 kode marking. Dilengkapi banner notifikasi kontekstual di atas tabel, badge interaktif `PARSIAL (N Resi)` di kolom Customer & Status serta kolom Marking & Kargo baik pada tampilan desktop maupun mobile card yang langsung membuka `PartialDetailModal`.
     - *Atomic URL Reset*: Tombol `Reset semua` membersihkan `searchParams` secara atomik melalui `useSearchParams`, menghindari bentrok multiple re-render.
     - *Empty State Guidance Komprehensif*: Memberikan pesan panduan kontekstual spesifik untuk setiap pill kategori saat data kosong, dilengkapi tombol aksi cepat otomatis `[Beralih ke Tab Laut]`, `[Tampilkan di Semua PIC (N)]` (menggunakan `rawGroupCounts`), dan `[Tampilkan Semua Kategori (N)]`.
   - **Smart Multi-Token Search Matcher (`matchTargetSearch`)**: Normalisasi tanda baca, pemecahan token kata, permutasi awalan nama legalitas (`PT`, `CV`, `MR`, `TK`), serta pencarian langsung identifier (`custCode`, `markingCode`, `markingNo`, `listNo`).
   - **Relevance Ranking & Scoring (`computeTargetSearchScore`)**:
     - *Skor 100*: Exact match nama customer, kode customer (`custCode`), atau `billTo`.
     - *Skor 80*: Nama customer / billTo berawalan kata kunci (prefix match).
     - *Skor 70*: Exact match marking code / marking no.
     - *Skor 60*: Nama customer / billTo mengandung kata kunci.
     - *Skor 40*: Marking code / marking no mengandung kata kunci.
     - *Urutan*: Hasil pencarian diurutkan prioritas berdasarkan skor relevansi tertinggi di paling atas, diikuti secondary sort aging (`hari DESC`).
   - **Sinkronisasi URL Dua Arah**: Sinkronisasi otomatis ke `?search=...` dengan 300ms debounce.
   - **Pintasan Kontekstual Saat Empty Result**: Tombol otomatis `[Tampilkan di Semua Kategori (N)]` atau `[Tampilkan di Semua PIC (N)]` jika item yang dicari berada di kategori/PIC lain.

---

## 8. Endpoint API Terkait
| Endpoint | Method | Deskripsi |
|---|:---:|---|
| `/api/billing/kpi` | `GET` | Metrik agregasi invoice & target tagihan live |
| `/api/billing/chart/by-employee-daily` | `GET` | Tren harian penagihan sales |
| `/api/billing/chart/trends` | `GET` | Tren transaksi bulanan |
| `/api/billing/chart/sj-vs-bill` | `GET` | Komparasi Surat Jalan vs Invoice |
| `/api/billing/target-details` | `GET` | Kargo terkirim yang belum ditagihkan |
| `/api/billing` | `GET` | Tabel faktur invoice (pagination, search, draftOnly) |
| `/api/billing/suggestions` | `GET` | Autocomplete no invoice, customer, marking (< 50ms) |
| `/api/billing/:id` | `GET` | Data header faktur |
| `/api/billing/:id/details` | `GET` / `PUT` | Baris transaksi item resi dalam faktur |
| `/api/billing/:id/issue` | `POST` | Terbitkan invoice resmi (`fdGive = 1`) |
| `/api/billing/type2-compare-check` | `GET` | Komparasi komprehensif M³ vs KG faktur |
| `/api/billing/m3-check` | `GET` | Evaluasi hirarki ukuran M³ per list code |
| `/api/billing/dimensions/:listCode` | `GET` | Rincian dimensi fisik per koli 3 tabel |
| `/api/billing/customer-tariff-audit/:custCode` | `GET` | Audit tarif kontrak customer |
| `/api/billing/pairing-local-charge` | `POST` | Matching otomatis biaya lokal via Excel |
| `/api/billing/report-template` | `GET` / `PUT` | Konfigurasi template JSON cetak invoice |
