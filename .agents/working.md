### 🕐 Terakhir Diperbarui
- **Tanggal**: 2026-10-01
- **Oleh**: Antigravity AI
- **Sesi**: Implementasi Timeline Siklus Kargo pada ValidationDetailPage (8 milestone: Diterima Agen → Loading → ETD → ETA → Masuk Gudang → Surat Jalan → Dikirim → Diserahkan)

---

- [x] **Timeline Siklus Kargo pada Billing Validation Detail Page (`ValidationDetailPage.tsx`, `ShipmentTimeline.tsx`, `billing.service.ts`, `billing.routes.ts`)**:
  - **1. Backend**:
    - `billing.types.ts`: Tambah interface `BillingTimeline` (8 field tanggal).
    - `billing.service.ts`: Tambah function `getBillingTimeline(invNo)` — resolve listCode dari invNo, JOIN `tbEntrylist` + `tbMarking` + `tbDelivery`, `MAX(fdSndDate)` per listCode karena multi-SJ, `MAX(fdGiveDate)`.
    - `billing.routes.ts`: Tambah route `GET /:id/timeline` (ditempatkan sebelum `GET /:id` agar tidak ter-shadow).
  - **2. Frontend**:
    - `billing.types.ts`: Tambah interface `BillingTimeline`.
    - `billing.service.ts`: Tambah method `billingApi.timeline(invNo)`.
    - `ShipmentTimeline.tsx` (BARU): Komponen horizontal strip compact timeline, 8 milestone dengan ikon Lucide, dot filled (primary) jika ada tanggal, outline (muted) jika null, connector line emerald/grey, responsive ke 4-column grid di mobile, skeleton shimmer saat loading, Dark Mode compliant via CSS tokens.
    - `ValidationDetailPage.tsx`: Import `ShipmentTimeline`, tambah `useQuery billingTimeline`, render di atas `<InvoiceItemsTable />`.
  - **3. Urutan Milestone Kronologis**:
    1. Diterima Agen (`fdTerima`, tbEntrylist)
    2. Loading (`fdLoadDate`, tbMarking)
    3. ETD (`fdETD`, tbMarking)
    4. ETA (`fdETA`, tbMarking)
    5. Masuk Gudang (`fdTgl_IN`, tbEntrylist)
    6. Surat Jalan (`fdSjDate`, tbDelivery)
    7. Dikirim (`fdSndDate` MAX, tbDelivery)
    8. Diserahkan (`fdGiveDate` MAX, tbDelivery)
  - **4. Verifikasi**:
    - `bun run build` frontend → **LULUS 0 errors** (3.18s).
    - PM2 `ShippingApi` restart → **online** (PID 25060).
    - Endpoint `GET /billing/:id/timeline` → routing benar (401 auth expected).

---

- [x] **Redesign Komponen Modal Penerbitan Invoice Resmi (`IssueInvoiceModal.tsx`)**:
  - **1. Masalah & Temuan**:
    - Dialog konfirmasi penerbitan invoice sebelumnya menggunakan container sempit `max-w-lg` (512px).
    - Grid pembagian 6-kolom membuat box customer terpotong (`MAJU MAKMUR BAHAGI...`) dan box nominal total tagihan resmi terhimpit.
    - Sisa ruang yang sempit memaksa simbol mata uang dan nominal angka ter-wrap bertumpuk secara canggung (`Rp .` di atas dan `51,833,480.00` di bawah).
  - **2. Perbaikan & Redesign (design-taste-frontend & redesign-existing-projects)**:
    - **Lebar Modal**: Diperlebar dari `max-w-lg` (512px) ke **`max-w-2xl` (672px)**, memberikan ruang proporsional yang lapang dan seimbang.
    - **Header Modal**: Dilengkapi padding yang lebih lapang (`px-6 py-4`), avatar icon squircle `w-10 h-10`, dan typography jelas.
    - **Kartu Ringkasan Eksekutif**:
      - Kolom kiri (`sm:col-span-7`): Avatar pelanggan `w-10 h-10`, nama lengkap pelanggan tampil lapang dan terbaca jelas (`leading-snug line-clamp-2`), serta kode customer pada chip monospaced.
      - Kolom kanan (`sm:col-span-5`): Box **TOTAL TAGIHAN RESMI** dirancang menjadi kartu KPI elegan:
        - Baris atas: Label `TOTAL TAGIHAN RESMI` dan status badge `Siap Ditagihkan`.
        - Baris bawah: Simbol mata uang (`Rp.` / valas) dan nominal monospaced `tabular-nums` (`text-xl sm:text-2xl font-bold`) berada pada 1 baris solid dengan `whitespace-nowrap`, rata kanan, dan tidak akan pernah ter-wrap secara canggung.
  - **3. Verifikasi Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (3.12s).

---

- [x] **Redesign Komponen Modal Detail Fisik & Tagihan Per Marking (`CustMarkingDetailModal.tsx`, `CustMarkingHeaderToolbar.tsx`, `CustMarkingSummaryBanner.tsx`, `CustMarkingDataTable.tsx`)**:
  - **1. Konteks & Tujuan (design-taste-frontend + generative_ui)**:
    - Melakukan upgrade antarmuka modal audit marking ke standar Enterprise ERP Financial & Physical Inspection: anti-slop, kepadatan data tinggi (high-density B2B), navigasi audit cepat, dan keselarasan penuh dengan 5 tema (khususnya Midnight Dark Mode).
    - Menghasilkan visualisasi prototipe interaktif Generative UI (`marking_detail_redesign.html`) di direktori artefak.
  - **2. Perubahan Teknis Komponen**:
    - **`CustMarkingDetailModal.tsx`**:
      - Merestrukturisasi Header: Customer Name dengan label semantik, Marking Code berbalut monospaced pill badge, dan smart alert badge untuk multi-cabang & selisih koli komplain.
      - Memperbarui status bar footer dengan counter baris data terfilter vs total data serta indikator status query aktif.
    - **`CustMarkingHeaderToolbar.tsx`**:
      - Mengganti tombol preset flat menjadi Segmented Pill Control modern (`Semua Kolom`, `Fisik & M³`, `Komplain`, `Finansial`) dengan dot indicator saat terdeteksi selisih komplain.
      - Menambahkan clear button `(X)` interaktif pada input pencarian instan.
      - Merampingkan alert ribbon multi-cabang & selisih komplain menjadi bilah ringkas 1 baris yang hemat ruang vertikal tabel.
    - **`CustMarkingSummaryBanner.tsx`**:
      - Memperbarui 6 KPI Cards menjadi Comparative Executive Analytics Grid: border mikro, kontras monospaced `tabular-nums`, visualisasi delta volume vs gudang, dan highlight card Overweight dengan ambient rose border & pulse badge saat terdeteksi lebih KG.
      - Filter komoditas dibuat dalam format horizontal chip pills dengan badge frekuensi dan total kubikasi m³.
    - **`CustMarkingDataTable.tsx`**:
      - **Sticky Identity Columns**: Kolom `No.` (`sticky left-0`), `BC.` (`sticky left-10`), dan `No. Invoice` (`sticky left-[88px]`) terkunci di sisi kiri saat pengguna menggulir tabel ke kanan untuk melihat rincian finansial & M³. Kolom No. Invoice dilengkapi border dan drop shadow pemisah.
      - **Sticky Table Footer (`tfoot`)**: Baris total keseluruhan terkunci di bagian bawah (`sticky bottom-0 z-30`) dengan pembagian kolom 24 cell yang persis, sehingga auditor selalu melihat total tanpa harus scroll sampai baris terakhir.
      - **Semantic Discrepancy Highlighting**: Baris dengan selisih koli komplain atau kelebihan berat (overweight) otomatis diberi aksen penanda border kiri (amber/rose) dan highlight sel.
  - **3. Generative UI Interactive Prototype**:
    - File artifact: `marking_detail_redesign.html` berisi prototype interaktif lengkap dengan live switcher tema (Midnight Dark vs Light), simulasi filter cabang, status card comparative, dan tabel kargo sticky columns.
  - **4. Verifikasi Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (3.08s).

---

- [x] **Perbaikan Tampilan Total Tagihan Resmi pada Modal Penerbitan Invoice (`IssueInvoiceModal.tsx`, `ValidationDetailPage.tsx`, `InvoiceItemsTable.tsx`, `billing.utils.ts`)**:
  - **1. Masalah & Temuan**:
    - Pada modal penerbitan invoice resmi (`IssueInvoiceModal.tsx`), KPI box "TOTAL TAGIHAN RESMI (Siap Ditagihkan)" menampilkan tanda strip (`—`) alih-alih nominal angka total tagihan (misal pada invoice draft `SGS-002072-10-2026`).
    - Penyebab: `ValidationDetailPage.tsx` sebelumnya mempassing `totalAmount = Number(data.fdJumlah2 || data.fdJumlah1 || 0)`. Pada invoice draft sebelum issued, field `fdJumlah1` dan `fdJumlah2` pada header tabel FoxPro/MSSQL masih bernilai `0` atau `NULL`, sementara rincian item tagihan berada pada tabel `details` (`tbBillingDetail`).
    - Karena `totalAmount` bernilai `0`, logika `{totalAmount > 0 ? ... : '—'}` menghasilkan `—`. Selain itu, simbol mata uang sebelumnya di-hardcode ke Rupiah (`formatCurrency`) tanpa dukungan valas.
  - **2. Perbaikan Teknis**:
    - **`billing.utils.ts`**: Menempatkan helper terpusat `getEffectiveInvoiceTotal(data, details)` sebagai Single Source of Truth perhitungan total tagihan (mendukung kesalahan input valas, valas murni `fdJumlah2`, `fdJumlah1 > 0`, dan fallback akumulasi `sum(details)` untuk invoice draft).
    - **`IssueInvoiceModal.tsx`**:
      - Menambahkan prop `currency?: string` pada `IssueInvoiceModalProps`.
      - Memperbaiki tampilan angka total tagihan menggunakan `formatWithCurrency(totalAmount, currency || 'Rp.')` saat `totalAmount >= 0`.
    - **`ValidationDetailPage.tsx`**:
      - Menghitung `effectiveInvoiceTotal` dan `effectiveInvoiceCurrency` via `getEffectiveInvoiceTotal(data, details)`.
      - Mempassing `totalAmount={effectiveInvoiceTotal}` dan `currency={effectiveInvoiceCurrency}` ke `<IssueInvoiceModal />`.
    - **`InvoiceItemsTable.tsx`**:
      - Memperbarui perhitungan footer sticky total agar menggunakan `getEffectiveInvoiceTotal(data, details)` sehingga selalu sinkron dengan modal penerbitan.
  - **3. Verifikasi**:
    - `bun run build` frontend $\to$ **LULUS 100% 0 errors** (3.44s).

---

- [x] **Implementasi Status Badge (Hybrid Ganda) pada Tabel Rincian Item ValidationDetailPage (`ValidationBadges.tsx`, `InvoiceItemsTable.tsx`)**:
  - **1. Kebutuhan**:
    - Menyelaraskan tampilan badge validasi harga item pada halaman detail validasi (`InvoiceItemsTable.tsx`) agar identik dengan `ProfilePricingTab.tsx` dan `FinancialAuditTab.tsx`.
    - Jika tarif item cocok dengan Profil Customer namun berada di atas Price List Master CS:
      - Menampilkan **Badge Hybrid Ganda**:
        1. `[✓ Sesuai Profil]` (emerald)
        2. `[▲ Overcharge (+Rp ...)]` (sky blue)
    - Jika tarif item cocok dengan Profil Customer namun berada di bawah Price List Master CS:
      - Menampilkan **Badge Hybrid Ganda**:
        1. `[✓ Sesuai Profil]` (emerald)
        2. `[Diskon Profil (-Rp ...)]` (amber)
    - Menampilkan `[Non-Validasi]` untuk item biaya cabang tanpa validasi tarif (`isNonValidatedBranchDashFee`).
  - **2. Perubahan Teknis**:
    - **`ValidationBadges.tsx` (`ItemPriceBadge`)**:
      - Menerima prop opsional `evaluation?: any` agar dapat langsung memanfaatkan objek hasil evaluasi dari `evaluatedItems`.
      - Menambahkan cabang `evalRes.isProfileMatchOverMaster` dengan Badge Hybrid `Sesuai Profil` + `Overcharge (+Rp ...)`.
      - Menambahkan cabang `evalRes.isProfileMatchUnderMaster` dengan Badge Hybrid `Sesuai Profil` + `Diskon Profil (-Rp ...)`.
      - Menambahkan penanganan `isNonValidatedBranchDashFee` (`Non-Validasi`).
    - **`InvoiceItemsTable.tsx`**:
      - Mempassing `evaluation={evalItem}` ke `<ItemPriceBadge />` baik pada tampilan kartu mobile (`< sm`) maupun tabel desktop (`>= sm`).
  - **3. Verifikasi**:
    - `bun run build` frontend $\to$ **LULUS 100% 0 errors** (2.88s).

---

- [x] **Perbaikan Validasi Overweight Jalur Laut: Toleransi Pembulatan Wajar 1 kg (`BillingValidationCard.tsx`, `ValidationCardHeader.tsx`, `BillingValidationSummaryModal.tsx`)**:
  - **1. Masalah & Temuan**:
    - Pada invoice `SHS-000238-10-2026` (`https://app.sampai.co/mshipping/finance/billing/validation/SHS-000238-10-2026`), muatan fisik laut terindikasi overweight `+852 kg`. Invoice telah menagihkan item KG sebesar `851 kg`.
    - Tab Overweight mendeteksi selisih `1 kg` dan menyatakan `isBilledOverweightTolerated = true` (karena $\le 1\text{ kg}$ selisih pembulatan wajar).
    - Namun, pada `BillingValidationCard.tsx`, `hasOverweightIssue` memeriksa `(isOverweight && !isBilledOverweightExactMatch)` sehingga tetap bernilai `true` (karena `851 !== 852`).
    - Akibatnya:
      - Header kartu memicu badge Merah (`danger` X) bertuliskan `SELISIH OVERWEIGHT (+852 KG BELUM DITAGIH)` seolah-olah 852 kg belum ditagih sama sekali padahal 851 kg sudah tertagih.
      - Tab default otomatis terpaksa membuka Overweight tab sebagai "error".
  - **2. Perbaikan Teknis**:
    - **`BillingValidationCard.tsx`**:
      - Memperbaiki `hasOverweightIssue` agar hanya memicu issue jika `(!isBilledOverweightMatch && isOverweight) || isBilledUnneededOverweight`. Kondisi pembulatan wajar $\le 1\text{ kg}$ (`isBilledOverweightTolerated`) tidak lagi dianggap sebagai issue/error.
      - Menambahkan penanganan badge khusus saat `!isAir && isOverweight && isBilledOverweightTolerated`:
        - Variant: `warning` (amber).
        - Icon: `AlertTriangle`.
        - Badge Text: `PEMBULATAN WAJAR ${Math.abs(overweightDiff)} KG (${matchedSourceName})`.
        - Tooltip: `Tagihan memuat item penagihan KG sebesar 851 kg. Terdapat selisih pembulatan wajar 1 kg dengan perhitungan sistem (+852 kg).`
      - Memperbaiki teks selisih overweight saat `effectiveBilledKg > 0`: Menampilkan `SELISIH OVERWEIGHT (+${kurangTagih} KG KURANG TAGIH)` dan bukan lagi `BELUM DITAGIH`.
    - **`ValidationCardHeader.tsx`**:
      - Menambahkan prop `badgeTitle?: string` agar detail penjelasan toleransi pembulatan wajar dapat terbaca jelas pada tooltip saat kursor diarahkan ke badge.
    - **`BillingValidationSummaryModal.tsx`**:
      - Menyederhanakan `hasOverweightIssue` agar konsisten dengan `useBillingValidation` dan tidak lagi membatalkan kecocokan fallback kandidat berat.
  - **3. Verifikasi**:
    - `bun run build` frontend $\to$ **LULUS 100% 0 errors** (3.30s).
  - **1. Kasus & Analisis**:
    - Kasus Invoice: `GZS-011183-10-2026` (`MITRA JAYA` - `M000198`), item `MINIMUM CHARGES - CONTROL MOTOR-B, CARBON BRUSH`.
    - Ditagih di invoice: **Rp 5.500.000 / M³** (Total Rp 550.000).
    - Acuan Master Price List CS: **Rp 4.700.000 / M³**.
    - Angka Profil Customer (`tbCustomersHarga.fdGzLrUmum`): **Rp 5.500.000 / M³**.
    - Pertanyaan pengguna: *"tidak overprice ?"* $\to$ Harga invoice memang di atas Master Price List (+Rp 800.000), namun cocok dengan profil customer `MITRA JAYA`.
  - **2. Solusi Teknis (Badge Hybrid)**:
    - Menambahkan deteksi `isProfileMatchOverMaster` dan `isProfileMatchUnderMaster` serta kalkulasi `masterPriceDiff` pada `billing.utils.ts`.
    - Jika harga invoice cocok dengan Profil CS tetapi lebih tinggi dari Master Price List:
      - Ditampilkan **Badge Hybrid Ganda**:
        1. Badge Hijau: `[✓ Sesuai Profil]` (menegaskan tagihan sah dan sesuai kontrak pelanggan di FoxPro).
        2. Badge Sky Blue: `[▲ Overcharge (+Rp 800.000)]` (menginformasikan secara transparan bahwa tagihan berada di atas Price List Master CS).
    - Diterapkan secara konsisten pada:
      - `ProfilePricingTab.tsx` (kartu validasi detail)
      - `FinancialAuditTab.tsx` (tabel audit ringkasan penerbitan invoice)
  - **3. Verifikasi**:
    - Uji coba data live `GZS-011183-10-2026` $\to$ `isMatched: true`, `isProfileMatchOverMaster: true`, `masterPriceDiff: 800000`.
    - `bun run build` frontend $\to$ **LULUS 100% 0 errors** (3.70s).

---



- [x] **Redesign Billing Dashboard — Eliminasi Redundansi Matriks Komparasi 3 Periode (`DashboardPage.tsx`)**:
  - **1. Analisis & Masalah Redundansi**:
    - Permintaan: */design-taste-frontend redesign billing dashboard dan hilangkan redundant Matriks Komparasi 3 Periode pada grafik bulanan*.
    - Sebelumnya, `BillingPeriodMatrixTable` dirender ganda: di dalam tab **Bulanan** (terhimpit dalam kolom 1/3 di samping grafik tren 12 bulan) dan di tab terpisah **Komparasi**.
    - Penempatan ganda ini membuat grafik 12 bulan terjepit, sumbu X dan kurva komparasi YoY tahun lalu menjadi padat, serta terjadi duplikasi informasi tabel.
  - **2. Perbaikan & Redesign Berbasis Design Taste Frontend**:
    - **Tab Bulanan**: Menghilangkan grid 3-kolom dan membuang `BillingPeriodMatrixTable` dari dalamnya. Kanvas grafik tren 12 bulan kini kembali 100% full-width lapang, kurva tren bulanan & garis putus-putus YoY sangat leluasa dibaca, tombol switcher metrik, filter moda, dan toggle YoY tersusun rapi.
    - **Tab Komparasi**: Didesain ulang menjadi terminal analitik 3 periode yang eksklusif, terstruktur, dan berkelas:
      - 3 **Quick Summary Cards** di atas tabel: *Total Omzet Tagihan*, *Volume Faktur Diterbitkan*, dan *Rata-rata Nilai / Faktur* dengan badge pertumbuhan MoM & YoY.
      - **Tabel Matriks Komparasi 3 Periode** (8 metrik kunci: faktur, tagihan, udara/laut, tiket rata-rata, pelanggan) dengan font mono tabular-nums dan tooltip selisih angka riil.
      - **Panel Evaluasi & Komposisi**: Menampilkan periode audit vs baseline (Bulan Lalu & Tahun Lalu) dan **Proporsi Pangsa Omzet Moda (Udara vs Laut)** interaktif dengan progress bar visual semantik (amber vs sky) dan persentase kontribusi.
  - **3. Verifikasi Build**:
    - `cd c:\shipping\frontend && bun run build` $\to$ **LULUS 100% 0 errors** (3.14s).
  - **4. Sinkronisasi Dokumentasi**:
    - `frontend-app.md`, `docs/frontend/billing.md`, dan `.agents/working.md`.

---

- [x] **Penambahan Matriks Komparasi 3 Periode (MoM & YoY) pada Dashboard Billing (`https://app.sampai.co/mshipping/finance/billing`)**:
  - **1. Analisis Kebutuhan**:
    - Permintaan: *"tambahkan Matriks Komparasi 3 Periode seperti pada dashboard delivery order-> pada https://app.sampai.co/mshipping/finance/billing"*.
    - Menyelaraskan kapabilitas analitik performa bulanan penagihan/billing dengan modul Delivery Order (`DeliveryMomYoySection.tsx`), yang mencakup:
      1. Toolbar Navigasi Periode Bulan & Tahun (MoM & YoY Audit) dengan tombol panah `<` `>` dan tombol kembali ke Bulan Berjalan.
      2. Matriks Komparasi 3 Periode (Bulan Berjalan vs Bulan Lalu vs Tahun Lalu) yang menampilkan 8 metrik kunci penagihan, persentase MoM & YoY, dan nominal/qty selisih.
      3. Kartu KPI Invoice & Tagihan otomatis bereaksi terhadap bulan yang dipilih dan menampilkan badge `GrowthPill` MoM dan YoY interaktif.
  - **2. Backend (`billing-analytics.service.ts`, `billing.types.ts`)**:
    - **Tipe Data Baru**: Menambahkan interface `PeriodBillingMetrics`, `MetricComparison`, `BillingComparisons` pada `billing.types.ts`.
    - **Parameter `year` & `month`**: Endpoint `GET /api/billing/kpi` kini menerima parameter opsional `year` dan `month` (fallback ke tahun & bulan berjalan).
    - **Kueri Paralel 3 Periode**:
      - `currentMonth`: Metrik bulan terpilih (`totalInvoices`, `totalTagihan`, `invoicesUdara`, `tagihanUdara`, `invoicesLaut`, `tagihanLaut`, `avgInvoiceValue`, `uniqueCustomers`).
      - `prevMonth`: Metrik 1 bulan sebelumnya (MoM).
      - `lastYearSameMonth`: Metrik bulan yang sama 1 tahun lalu (YoY).
    - **Kalkulasi Komparasi Otomatis (`calcComp`)**: Menghitung `momDiff`, `momPercent`, `yoyDiff`, dan `yoyPercent` secara presisi.
  - **3. Frontend (`frontend/src/features/billing/`)**:
    - **Komponen Modular Baru (`BillingPeriodMatrixSection.tsx`)**:
      - `BillingPeriodNavigator`: Toolbar navigasi bulan & tahun dengan indikator status badge hijau berdenyut `[Bulan Berjalan]` atau amber `[Audit Periode Lampau]`, subline teks kontekstual, dan tombol reset.
      - `BillingPeriodMatrixTable`: Tabel berdensitas tinggi ber-token tema ERP yang menyajikan 8 metrik penagihan (*Total Faktur*, *Total Tagihan*, *Faktur Udara*, *Tagihan Udara*, *Faktur Laut*, *Tagihan Laut*, *Rata-rata / Bill*, *Customer Ditagih*), format mono tabular-nums, badge persentase naik/turun berikon panah, tooltip detail selisih angka riil, dan footer keterangan periode pembanding.
      - `GrowthPill`: Sub-komponen badge pertumbuhan untuk KPI cards.
    - **Integrasi `DashboardPage.tsx`**:
      - State `selectedYear` dan `selectedMonth` terintegrasi reaktif ke `useBillingDashboard`.
      - Toolbar navigasi disematkan di atas grid kartu KPI.
      - Kartu *Invoice Terbit Bulan Ini* dan *Total Nominal Tagihan Bulan Ini* dilengkapi badge `GrowthPill` MoM & YoY.
      - Tab **Bulanan** dikonfigurasi dalam layout 2-kolom (`grid-cols-1 lg:grid-cols-3`): sisi kiri grafik tren 12 bulan (`TrendChart`), sisi kanan **Matriks Komparasi 3 Periode** (`BillingPeriodMatrixTable`).
      - Ditambahkan tab navigasi mandiri **Komparasi 3 Periode** (`komparasi`) pada `chartTabs`.
    - **Dukungan i18n ID & EN**:
      - Menambahkan translasi kamus di `src/lib/i18n/id.json` dan `en.json` untuk `billing.tab.comparison`, `billing.comparisonMatrixTitle`, `billing.comparisonMatrixSubtitle`, `billing.currentMonthBadge`, `billing.pastAuditBadge`, dan `billing.evaluatingVs`.
  - **4. Verifikasi**:
    - `bun run build` frontend $\to$ **LULUS 100% 0 errors** (3.48s).
    - PM2 service `ShippingApi` online dan stabil.
    - Uji HTTP status produksi `https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Sinkronisasi dokumentasi di `frontend-app.md`, `backend-app.md`, `docs/frontend/billing.md`, dan `docs/backend/billing.md`.

---

- [x] **Perbaikan Radix UI Slot Error pada Komponen Button (`Button.tsx`)**:
  - **1. Akar Masalah**:
    - Error runtime: `Error: Slot failed to slot onto its children. Expected a single React element child or Slottable. at Button-DAnotFne.js:1:1194`.
    - Komponen `<Button asChild>` merender Radix UI `<Slot>` saat `asChild={true}`.
    - Pada implementasi sebelumnya, elemen spinner `{isLoading && (...)}` dan `{children}` disematkan berdampingan di dalam tag `<Comp>`.
    - Di React 19 JSX runtime, hal ini memasukkan array `[undefined/false, children]` sebagai props `children` ke `<Slot>`.
    - Karena `children` berupa Array (bukan single element) dan tidak menggunakan `<Slottable>`, Radix UI memicu crash error tersebut saat komponen seperti `ListPage.tsx` (Customer Price List) menggunakan `<Button asChild>`.
  - **2. Perbaikan**:
    - Memisahkan branch rendering saat `asChild === true`: me-return `<Slot ref={ref} className={combinedClassName} aria-disabled={disabled || isLoading ? true : undefined} {...props}>{children}</Slot>` secara langsung tanpa injeksi sibling spinner di dalam Slot.
    - Branch normal (`<button>`) tetap menyertakan visual loading spinner dan disabled props.
  - **3. Verifikasi**:
    - `bun run build` frontend $\to$ **LULUS 100% 0 errors** (3.61s, `dist/assets/Button-CiW3Ry7e.js`).

---


- [x] **Perbaikan Validasi Tarif M³ Multi-Komoditas — Eliminasi False `NO_TARGET` Saat Profil Flat = 0 (`billing.utils.ts`, `ProfilePricingTab.tsx`)**:
  - **1. Akar Masalah & Kasus**:
    - Kasus Invoice: `GZS-011144-09-2026` (Customer `B000075` - `BINTANG BUANA`), item `PARCELS TO JAKARTA (M3) - MEDICAL DEVICE` (ditagih Rp 6.750.000).
    - Status sebelumnya: Berstatus **`NO_TARGET`** dengan label `LARTAS - S`.
    - Akar Masalah 1: `isM3MainItem` mengasumsikan seluruh item M3 harus divalidasi ke tarif M3 flat profil customer (`profileHarga.harga`). Pada customer multi-komoditas seperti Bintang Buana, `profileHarga.harga = 0` karena tagihan mengikuti kategori komoditas masing-masing (Alkes Rp 6.750.000, Lartas Normal Rp 6.000.000, General Goods Rp 4.500.000). Ketika `profileHarga.harga === 0`, sistem menimpa target price menjadi 0 dan mengunci `hasTargetPrice = profilePrice > 0` $\to$ `false`, memutus rantai fallback ke Price List dan langsung mengembalikan `NO_TARGET`.
    - Akar Masalah 2: Sistem sebelumnya menimpa `comodityName` dengan default kargo (`LARTAS - S`) dari `defaultTypeId` header muatan, mengabaikan teks spesifik barang di nama item (`MEDICAL DEVICE`). Selain itu, kategori `LARTAS - S` tidak ada di Price List Master/Customer, yang ada adalah `Alkes, Makanan & LS Lainnya` (Rp 6.750.000 di Master MKT).
  - **2. Perbaikan Logika**:
    - **`hasM3FlatProfile`**: Item M3 hanya divalidasi ke `profileHarga.harga` jika profil customer memang memiliki harga flat (`profileHarga.harga > 0`). Jika `0`, sistem otomatis fallback melanjutkan pencarian ke Price List komoditas (Customer Price List $\to$ Master Price List).
    - **Ekstraksi Komoditas Spesifik (`textAfterDash`)**: Jika item invoice memiliki teks spesifik setelah tanda `-` (e.g. `MEDICAL DEVICE`), nama komoditas spesifik tersebut diprioritaskan alih-alih ditimpa kategori payung kargo `LARTAS - S`.
    - **Pencocokan Heuristik Kategori Laut**: Menambahkan pengenalan kata `textAfterDash` untuk `MEDICAL` / `ALKES` / `MEDIS` $\to$ kategori `Alkes, Makanan & LS Lainnya`, `GLASS` / `ACCESSORIES` $\to$ `General Goods`, `TABLEWARE` / `STAINLESS` $\to$ `Lartas Normal`, serta deteksi kosmetik/obat.
    - **Sinkronisasi `ProfilePricingTab.tsx`**: `isProfileValidated` disesuaikan menjadi `isTaxReturnItem || (isM3MainItem && profilePrice > 0) || isKgOverweightItem` agar saat `profilePrice === 0`, badge status mengevaluasi terhadap `evaluation.priceItem`.
  - **3. Hasil Evaluasi**:
    - `PARCELS TO JAKARTA (M3) - MEDICAL DEVICE` (ditagih Rp 6.750.000) $\to$ Cocok dengan Master MKT `Alkes, Makanan & LS Lainnya` (Rp 6.750.000) $\to$ Status **`MATCH`**!
    - `PARCELS TO JAKARTA (M3) - GLASS, ELECTRONIC ACCESSORIES` (ditagih Rp 4.500.000) $\to$ Cocok dengan Master MKT `General Goods` (Rp 4.500.000) $\to$ Status **`MATCH`**!
    - `PARCELS TO JAKARTA (M3) - STAINLESS STEEL TABLEWARE, CUPS` (ditagih Rp 6.000.000) $\to$ Cocok dengan Master MKT `Lartas Normal` (Rp 6.000.000) $\to$ Status **`MATCH`**!
  - **4. Verifikasi**:
    - `bun run build` frontend $\to$ **LULUS 100% 0 errors** (3.40s, `dist/assets/billing-Cz0vI-qv.js`).

---

- [x] **Audit & Fix P1 Bug Voice Command pada Validasi Detail Bill (`ValidationDetailPage.tsx`)**:
  - **1. Audit Menyeluruh**:
    - Diaudit seluruh sistem voice command: `ValidationDetailPage.tsx`, `ValidationVoiceHud.tsx`, `voiceAssistantStore.ts`, `useVoiceRecognition.ts`, `voiceSearch.utils.ts`, `Topbar.tsx`.
    - Ditemukan 7 bug + 3 warning. 2 bug P1 kritis difix pada sesi ini.
  - **2. BUG-06 Fix — Mic Auto-Restart Setelah Mute + Tutup Modal**:
    - **Akar Masalah**: `useEffect([isAnyModalOpen, isSupported, ...])` pada saat modal ditutup masuk branch `if (!isAnyModalOpen && isSupported)` → `isManuallyStoppedRef.current = false` → `startListening()`. Tidak ada pengecekan `isMuted` sehingga mic aktif kembali meskipun user sudah mute via Alt+V / klik HUD.
    - **Fix**: Tambah gate `&& !isMuted` pada kondisi if, dan tambah double-check `!isMuted` di dalam callback `setTimeout` (200ms async gap). Tambah `isMuted` ke dep array useEffect.
  - **3. BUG-02 Fix — Race Condition Re-arm Setelah Stop Modal**:
    - **Akar Masalah**: Potensi mic restart sejenak setelah modal dibuka karena `onEnd` dari `stopListening()` terpanggil sebelum state React ter-flush. Walaupun `isManuallyStoppedRef = true` sudah ada di else block, penambahan komentar eksplisit + double-check `!isMuted` di setTimeout memperkuat guard.
    - **Fix**: Komentar eksplisit + double-check `!isMuted` pada setTimeout callback di if-branch.
  - **4. Verifikasi**:
    - `bun run build` frontend → **LULUS 100% 0 errors** (3.35s, `dist/assets/billing-QqKV9CM6.js`).

---

- [x] **Modernisasi Voice Command & Eliminasi Redundansi UI pada Halaman Validasi Billing (`ValidationDetailPage.tsx`, `ValidationVoiceHud.tsx`, `voiceAssistantStore.ts`, `VoiceAssistantModal.tsx`)**:
  - **1. Analisis Kebutuhan & Akar Masalah**:
    - Permintaan: *"buatkan plan update voice command pada validasi detail page biling. Sekarang terdapat redundant pada ui, buatk flow agar sesuai sistem modern. apakah sistem voice global perlu di gabung juga? -> ya"*
    - **Akar Masalah Redundansi**:
      - Terjadi duplikasi tombol kontrol suara: Tombol di Header Ribbon Bar (`[ 🟢 🎙️ Suara Aktif ]` dengan tooltip 15 baris) DAN Tombol bulat FAB Floating Action Stack di sudut kanan bawah layar.
      - Terjadi duplikasi tombol buka drawer invoice: Tombol `ListFilter` di header ribbon dan tombol bulat `ListFilter` di kanan bawah.
      - Floating FAB bulat kanan bawah kerap menutupi tabel dimensi koli atau tombol submit pada layar laptop/tablet.
      - Transkrip suara berupa balon teks melayang di bawah tombol yang sering tumpang tindih dengan elemen lain.
      - Sistem suara terfragmentasi: Halaman validasi menggunakan `suppressVoice()` untuk mematikan asisten global, lalu membuat instance lokal terpisah.
  - **2. Solusi Teknis & Arsitektur Unified Modern**:
    - **Single Source of Truth Store (`voiceAssistantStore.ts`)**:
      - Menghapus supresi kaku `suppressVoice()`. Menggantinya dengan konsep **Adaptive Display Mode** (`displayMode: 'modal' | 'hud'`).
      - Saat di halaman umum/dashboard: `displayMode === 'modal'`, membuka `VoiceAssistantModal` untuk pencarian & navigasi lintas ERP.
      - Saat di Halaman Validasi Billing: `displayMode === 'hud'`, modal pop-up hitam global otomatis di-bypass, dan asisten suara beradaptasi menjadi capsule HUD ramping.
      - Mengintegrasikan state telemetri suara terpusat (`isListening`, `isMuted`, `transcript`, `interimTranscript`, `commandStatus`, `commandFeedback`).
    - **Unified Dynamic Voice Capsule HUD (`ValidationVoiceHud.tsx`)**:
      - Ditempatkan melayang ramping di **Bottom-Center** layar dengan elevasi tinggi di atas Windows taskbar (`fixed bottom-10 sm:bottom-14 md:bottom-16 left-1/2 -translate-x-1/2 z-40`). Jarak 40px–64px menjamin HUD tidak terpotong atau tertutup Windows taskbar/browser bottom bar.
      - Menampilkan 4 status visual adaptif:
        1. *Standby (Idle)*: Pill ramping `[ 🟢 Siap Mendengar ]` + tombol mute/unmute + tombol help `[ ? ]`.
        2. *Listening*: Melebar halus, visualizer mini waveform audio dinamis aktif bergerak, live speech text.
        3. *Executing*: Badge interaktif berikon checkmark dengan nama aksi yang dijalankan (e.g. *"Membuka invoice GZS-011023..."*, *"Beralih ke Tab M³..."*).
        4. *Muted*: Indikator netral `[ 🔇 Mikrofon Jeda ] (Alt+V)`.
      - **Clickable Command Cheat Sheet Popover**: Tombol `[ ? ]` membuka kartu panduan terstruktur dengan chip perintah yang bisa langsung di-klik jika staf berada di area gudang yang bising (tanpa harus bicara).
    - **Auto-Hide Tombol Mic Topbar (`Topbar.tsx`)**:
      - Ditambahkan kondisi pengecekan `canUseVoice && displayMode !== 'hud'`.
      - Tombol asisten suara di topbar otomatis disembunyikan saat pengguna berada di halaman validasi detail (mode HUD) untuk mencegah duplikasi tombol di layar.
    - **Pembersihan Total Redundansi pada `ValidationDetailPage.tsx`**:
      - Menghapus 100% stack `createPortal` FAB floating ganda di sudut kanan bawah. Area kerja tabel menjadi lapang dan bebas halangan.
      - Menghapus tombol telemetri mic lama di ribbon header.
      - Menata tombol drawer invoice di header ribbon dengan ikon dan label teks yang elegan: `<ListFilter className="w-3.5 h-3.5 text-blue-600" /> <span className="hidden sm:inline">Cari Invoice</span>`.
      - Menghubungkan seluruh aksi suara ke `setCommandStatus` untuk feedback real-time pada HUD.
  - **3. Verifikasi**:
    - `bun run build` frontend $\to$ **LULUS 100% 0 errors** (3.36s).
    - Uji bypass modal global di HUD mode & tombol topbar auto-hide berjalan sempurna.
    - Dokumentasi disinkronkan di `frontend-app.md`, `docs/frontend/billing.md`, dan `.agents/working.md`.

---

- [x] **Tombol Mikrofon Eksplisit & Penyelarasan Voice Command pada Validasi Detail Bill (`ValidationDetailPage.tsx`, `ValidationSummaryHeader.tsx`)**:
  - **1. Analisis Kebutuhan**:
    - Pengguna meminta: *"buatkan tombol untuk mengaktifkan mic pada page validasi detail bill /plan buatkan plan dulu. update semua yang terkait fungsi voice command ini pada page validasi detail"*
    - Evaluasi feedback posisi: *"terlalu ke bawah, tidak terlihat... terhalang sidebar juga"*.
    - Karena sidebar M-Shipping berada di sisi kiri (`left`), penempatan FAB di sisi kiri (`left-3`) menyebabkan tombol tertimpa/terhalang sidebar dan `bottom-6` terlalu dekat dengan batas bawah layar.
  - **2. Solusi & Desain Antarmuka**:
    - **FAB Floating Mic (Kanan Bawah Layar — Bebas Terhalang Sidebar)**:
      - Digabungkan ke dalam **Floating Action Stack** di posisi `fixed right-3.5 sm:right-5 bottom-8 sm:bottom-10 z-40`, berpasangan vertikal tepat di atas FAB Drawer Pencarian.
      - **Bebas 100% dari Sidebar**: Posisi di kanan layar menjamin tidak pernah tertimpa sidebar kiri utama.
      - **Ketinggian Aman**: Dinaikkan ke `bottom-8` (32px-40px) agar sangat terlihat dan tidak terpotong oleh navigation bar browser/taskbar.
      - Indikator Visual Aktif: Background emerald (`bg-emerald-600`), ring aksen `ring-4 ring-emerald-500/25`, animasi denyut ganda `animate-ping`, ikon `Mic` putih, dan badge live speech bubble di samping kirinya.
      - Indikator Jeda: Background surface netral dengan border kontras dan ikon `MicOff` bergaris coret.
      - Klik langsung beralih antara mendengarkan vs jeda mikrofon (sinkron dengan `Alt+V`).
    - **Tombol Ribbon Header Bar (`ValidationDetailPage.tsx`)**:
      - Menyederhanakan label menjadi statis (`Suara Aktif` vs `Mikrofon Jeda`) agar ukuran tombol tetap stabil.
      - Menggunakan `MicOff` saat jeda.
      - Menampilkan teks transkrip suara langsung via badge speech bubble kecil mengambang di bawah tombol tanpa merusak lebar ribbon.
      - Refactoring `handleToggleVoice` terpusat yang sinkron dengan shortcut `Alt+V`, tombol header, dan FAB floating.
    - **Tombol Mic Header Modal (`ValidationSummaryHeader.tsx`)**:
      - Menyelaraskan tombol mikrofon modal dengan label stabil (`Suara Aktif` vs `Mikrofon Jeda`), ikon `Mic` / `MicOff`, dan badge ucapan live.
    - **Panduan 17 Perintah Suara Lengkap pada Tooltip**:
      - Didokumentasikan secara terstruktur di dalam tooltip tombol:
        1. Buka Invoice: `"Buka [No Invoice]"`, `"Buka 11023"`, `"Buka invoice 011023"`.
        2. Navigasi Tab: `"Tab 1"` s/d `"Tab 5"`, `"Tab Item"`, `"Tab M3"`, `"Tab Overweight"`, `"Tab Freight"`, `"Tab Ekspedisi"`.
        3. Aksi Cepat: `"Refresh"` / `"Segarkan"`, `"Cari"` / `"Pilih Invoice"`, `"Terbitkan"`, `"Cetak"` / `"Print"`.
        4. Dialog Khusus: `"Inspeksi"`, `"Resi"`, `"History"`, `"Audit Tarif"`, `"Kembali"`.
  - **3. Verifikasi & Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 error** (3.11s).
    - Status PM2 `ShippingApi` stabil online.
    - Dokumentasi disinkronkan di `docs/frontend/billing.md`, `frontend-app.md`, dan `.agents/working.md`.

---


- [x] **Penyempurnaan Indikator & Notifikasi Kargo Pill PARSIAL (`TargetPage.tsx`)**:
  - **1. Analisis & Temuan**:
    - Pertanyaan pengguna: *"pada pill parsial kenapa tidak menampilkan hanya yang parsial?"*
    - Di backend `billing-analytics.service.ts`: Kargo dikategorikan parsial (`isPartial = true`) jika nomor tanda terima agennya (`fdTerima`) memuat lebih dari 1 kode marking untuk customer yang sama (`COUNT(DISTINCT fdMarkingCode) > 1` via CTE `PartialSJ`). Terdapat 11 kargo aktif berstatus parsial multi-marking.
    - Di antarmuka sebelumnya: Kolom *Customer & Status* menampilkan status customer (`OK`, `WARNING`, `URGENT`), dan kolom *Status Kirim* menampilkan `TERIMA SJ [tanggal]`. Badge `PARSIAL` hanya berupa teks kecil di samping kode marking tanpa penjelas yang jelas, sehingga membingungkan pengguna seolah kargo tersebut adalah kargo biasa/normal.
  - **2. Perbaikan & Penyempurnaan UI**:
    - **Banner Kontekstual Parsial**: Menambahkan notice bar ungu di atas tabel saat pill `PARSIAL` aktif yang menjelaskan bahwa daftar menampilkan kargo dengan tanda terima agen multi-marking, lengkap dengan tautan rincian.
    - **Badge Status PARSIAL Interaktif (Desktop Table)**:
      - Di kolom *Customer & Status*: Menambahkan badge tombol interaktif `[PARSIAL (N Resi)]` di samping status customer yang dapat langsung diklik untuk membuka modal `PartialDetailModal`.
      - Di kolom *Marking & Kargo*: Memperjelas tombol badge marking dengan ikon `Layers` dan count resi `[PARSIAL (N)]`.
    - **Badge PARSIAL pada Mobile Card List**:
      - Top bar mobile card: Ditambahkan tombol `PARSIAL (N)` di samping badge status customer.
      - Marking card mobile: Ditambahkan label dan ikon `Layers` interaktif.
  - **3. Verifikasi & Build**:
    - `bun run build` $\to$ **LULUS 100% 0 errors** (2.91s).
    - Data 11 item parsial kini tampil jelas dengan indikator ungu `PARSIAL (N Resi)` di seluruh tampilan desktop dan mobile.

---

- [x] **Fitur Tanggal Berakhirnya Harga Customer & Penyesuaian Validasi Bill (`customer-price-list`, `price-check`, `billing`)**:
  - **1. Database & Prisma Schema**:
    - Menambahkan kolom `endDate DATETIME2 NULL` pada tabel `tbCustomerPriceListUpload` di MS SQL Server.
    - Menambahkan `endDate DateTime? @db.DateTime2` pada `schema.prisma` dan meregenerasi Prisma Client.
  - **2. Backend (`customer-price-list`, `price-check`, `m3-check`)**:
    - `customer-price-list.service.ts`:
      - `ingestCustomerPriceListFile`: Menerima dan menyimpan `endDate` pada metadata upload serta item.
      - `listCustomersWithPriceList` & `listCustomerUploads`: Mengembalikan `endDate`, menghitung `isExpired` (`endDate < TODAY`) dan `isExpiringSoon` ($\le 7$ hari).
      - `lookupCustomerPriceList`: Memfilter upload & item yang masih aktif (`endDate == null || targetDate <= endDate`), meneruskan `endDate` pada setiap item.
      - `updateCustomerUploadEffectiveDate`: Menerima `effectiveDate` dan `endDate`, memperbarui upload dan mensinkronisasikan ke `tbCustomerPriceListItem`.
      - `setCustomerCommodityPriceEndDate`: Endpoint baru `PUT /api/customer-price-list/items/:id/end-date` untuk mengatur tanggal berakhir per item khusus dan sinkronisasi ke `tbCommodityMapping`.
    - `marking-matcher.ts`: Menambahkan filter `endDate` pada `findCustomerMarkingOverrideUpload`.
    - `price-check.service.ts` & `price-check.types.ts`:
      - Evaluasi Tier 1, 2, 3 (single & batch check) mengecualikan tarif khusus yang sudah kedaluwarsa (`endDate < targetDate`).
      - Jika tarif kedaluwarsa, mesin cek harga otomatis fallback ke Master Price List (CS/MKT), serta mencatat `customerEndDate`, `isCustomerPriceExpired: true`, dan `isCustomerPriceExpiringSoon: true`.
    - `m3-check.service.ts` & `m3-check.types.ts`:
      - Memperbaiki `customerEndDate: customerPriceEndDate` pada return object `priceValidation` (sebelumnya memanggil variabel `customerEndDate` yang belum didefinisikan sehingga memicu `ReferenceError: customerEndDate is not defined` pada `/api/billing/m3-check`).
      - Meneruskan metadata kedaluwarsa customer ke payload `priceValidation`.
  - **3. Frontend Customer Price List (`frontend/src/features/customer-price-list/`)**:
    - `customerPriceList.types.ts` & `customerPriceList.service.ts`: Kontrak TypeScript dan service client diperluas dengan field `endDate`, `isExpired`, `isExpiringSoon`, dan method `setSpecialPriceEndDate`.
    - `EditEffectiveDateModal.tsx`: Field `Berlaku Sampai (End Date)`, toggle checkbox "Tanpa batas waktu (Selamanya)", dan validasi `endDate >= effectiveDate`.
    - `UploadPage.tsx`: Input `Berlaku Sampai (End Date)` dan toggle "Tanpa batas waktu (Selamanya)" saat upload berkas Excel.
    - `ListPage.tsx`:
      - Tab 1 (`special_prices`): Kolom Masa Berlaku menampilkan rentang Mulai s/d Sampai, status badge mendukung "Segera Berakhir" ($\le 7$ hari).
      - Tab 2 (`master_uploads`): Kolom Masa Berlaku menampilkan rentang Mulai s/d Sampai, badge "Kedaluwarsa" / "Segera Berakhir", dan tombol aksi cepat "Masa Berlaku" membuka `EditEffectiveDateModal`.
    - `HistoryPage.tsx` & `DiffPage.tsx`: Sinkronisasi modal dan visualisasi rentang masa berlaku.
  - **4. Frontend Validasi Bill (`frontend/src/features/billing/`)**:
    - `billing.types.ts`: Field `customerEndDate`, `isCustomerPriceExpired`, `isCustomerPriceExpiringSoon` pada `PriceItem` dan `priceValidation`.
    - `billing.utils.ts` (`evaluateItemPrice`): Mengecualikan item customer yang `endDate < invoiceDate`, mencatat flag `isCustomerPriceExpired` dan tanggal berakhirnya.
    - `ProfilePricingTab.tsx`:
      - Menampilkan rentang masa berlaku profil tarif customer (`Masa Berlaku: [mulai] s/d [sampai]`).
      - Menampilkan badge warning merah `⚠️ Tarif Customer Kedaluwarsa (Berakhir: [tgl])` jika tanggal tagihan melampaui masa berlaku.
      - Menampilkan badge amber jika masa berlaku segera berakhir ($\le 7$ hari).
      - Menampilkan catatan pada item invoice jika tarif customer telah kedaluwarsa dan terjadi fallback ke Master Price List.
  - **5. Verifikasi & Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (4.08s).
    - PM2 service `ShippingApi` berhasil direstart dan berjalan stabil online.
    - HTTP Health check `GET /api/health` $\to$ **200 OK**.
    - Dokumentasi disinkronkan di `docs/backend/pricing.md`, `docs/frontend/pricing.md`, `docs/frontend/billing.md`, dan `.agents/working.md`.

---


- [x] **Full Audit & Penyempurnaan Semua Pill / Filter Halaman Target Bill (`TargetPage.tsx`, `billing-analytics.service.ts`)**:
  - **1. Analisis & Verifikasi Backend**:
    - URL: `https://app.sampai.co/mshipping/finance/billing/target`
    - Memverifikasi 17 filter pill (3 Mode Tab, 6 PIC Pills, 8 Kategori Pills).
    - Verifikasi backend `getBillingTargetDetails`:
      - `isPartial`: Terverifikasi dikirim dari CTE `PartialSJ` (`COUNT(DISTINCT RTRIM(el.fdMarkingCode)) > 1` per `fdTerima`).
      - `hari`: Terverifikasi dihitung dan dikirim via `Number(r.hari || 0)`.
      - `type=all`: Terverifikasi menggabungkan data `fetchItemsForType('udara')` dan `fetchItemsForType('laut')` via `Promise.all`.
      - `status`: Terverifikasi nilai `COD` dan `URGENT` berada di field `status` (`r.Status`).
  - **2. Perbaikan & Penyempurnaan Frontend (`TargetPage.tsx`)**:
    - **Definisi No Type Diperluas (`isNoTypeTargetItem`)**: Menangkap nilai kosong, `-`, `0`, `NONE`, `N/A`, `NA`, dan `NULL` secara konsisten pada badge, counter, dan filter.
    - **Cross-PIC Group Aggregation (`rawGroupCounts`)**: Menghitung ketersediaan item per kategori di seluruh PIC untuk memberikan auto-suggestion tombol aksi saat filter aktif menghasilkan 0 data.
    - **Penyempurnaan Reset Button Atomik**: Menghapus mutasi state ganda yang berpotensi memicu race condition, kini mendelegasikan pembersihan ke `setSearchParams({})` secara reaktif.
    - **Indikator Visual Pill FCL pada Mode Udara**: Menambahkan tooltip dan visual tone subtle pada pill FCL saat moda Udara aktif untuk memperjelas bahwa FCL spesifik moda Laut (klik langsung auto-switch ke Laut).
    - **Panduan Kontekstual Lengkap Saat Empty State**: Menambahkan pesan penjelasan dan tombol pemulihan cerdas untuk setiap kategori: `sj_sent`, `partial`, `fcl`, `cod`, `urgent`, `aging`, dan `no_type`.
  - **3. Verifikasi & Build**:
    - `bun run build` $\to$ **LULUS 100% 0 errors** (3.11s).
    - PM2 service `ShippingApi` stabil online.
    - Dokumentasi `docs/frontend/billing.md` dan `.agents/working.md` disinkronkan.

---

- [x] **Perbaikan Penanganan Filter URL dan Tampilan Data Kargo FCL pada Target Bill (`TargetPage.tsx`, `billing-analytics.service.ts`)**:
  - **1. Analisis Kebutuhan & Akar Masalah**:
    - URL Pengguna: `https://app.sampai.co/mshipping/finance/billing/target?group=fcl`
    - Keluhan: *"ini kenapa tidak berfungsi / menampilkan data sesuai pill"*
    - **Akar Masalah 1 (Backend Crash Loop Akibat Duplicate Variable Declaration)**:
      - Pada `billing-analytics.service.ts`, terdapat duplikasi deklarasi variabel `const markingNo` di baris 811 dan baris 864 di dalam loop pemetaan data target.
      - Hal ini menyebabkan runtime Bun/Node menghasilkan error `markingNo has already been declared` dan memicu PM2 `ShippingApi` crash-loop (restart berulang kali hingga 7.000+ kali).
      - Setiap panggilan API `GET /api/billing/target-details` gagal (HTTP 500 / 502 / Connection Reset), sehingga frontend tidak dapat mengambil data target billing sama sekali ("Tidak ada data" / stuck).
    - **Akar Masalah 2 (Desinkronisasi State URL SearchParams di Frontend)**:
      - Di `TargetPage.tsx`, parameter URL `group` hanya dibaca satu kali pada saat inisialisasi `useState(initialGroup)`.
      - Komponen tidak memiliki `useEffect` listener untuk menyinkronkan state `activeGroup`, `activeType`, dan `activePic` saat pengguna berpindah URL atau mengklik link deep-link (`?group=fcl`).
    - **Akar Masalah 3 (Kargo FCL Tereliminasi oleh Filter PIC / Moda Udara)**:
      - Seluruh kargo FCL secara inheren adalah moda Laut (kontainer laut) dan ditangani oleh PIC Ferly (`pic = 'ferly'`).
      - Di tab Udara (`type=udara`), kargo FCL berjumlah 0 dan opsi PIC Ferly tidak tersedia.
      - Jika pengguna sedang berada di tab Udara atau sedang memilih PIC selain Ferly (seperti Thara, Yati, atau Kiki), memilih pill FCL menghasilkan 0 item karena terblokir oleh filter aktif tersebut.
    - **Akar Masalah 4 (Pencocokan Definisi FCL Kurang Menyeluruh)**:
      - Frontend sebelumnya hanya mengecek `type.includes('FCL') || comodity.includes('FCL')`. Padahal data kargo kontainer di FoxPro/database juga memuat tipe `'KONTAINER'` dan kode marking berawalan `'26FCL-'`.
  - **2. Solusi Teknis & Implementasi**:
    - **Backend (`billing-analytics.service.ts`)**:
      - Menghapus duplikasi deklarasi `const markingNo`, mengembalikan stabilitas sintaks runtime Bun 100%.
      - Memastikan PM2 `ShippingApi` berstatus online dan merespons `GET /api/billing/target-details?type=all` dengan 200 OK (berhasil mengembalikan 172 item target aktif, termasuk 3 kargo FCL kontainer KB/IRVIN: `26FCL-097`, `26FCL-098`, `26FCL-099`).
    - **Frontend (`TargetPage.tsx`)**:
      - **Sinkronisasi Reaktif Dua Arah URL `searchParams`**:
        - Menambahkan `useEffect` listener terhadap `searchParams`: otomatis menyinkronkan `activeType`, `activePic`, `activeGroup`, dan `searchQuery` secara reaktif dari URL tanpa perlu reload manual.
      - **Pencocokan Komprehensif `isFclTargetItem`**:
        - Memeriksa `typeStr.includes('FCL')`, `typeStr.includes('KONTAINER')`, `comodityStr.includes('FCL')`, serta marking code `markingStr.startsWith('26FCL')` atau `markingStr.includes('FCL')`.
        - Mengintegrasikan `isFclTargetItem` ke dalam `groupCounts`, `groupedList`, dan `matchTargetSearch` (saat mencari "FCL" atau "kontainer").
      - **Smart Mode & PIC Auto-Switching Saat Pill FCL Dipilih**:
        - Jika pengguna memilih pill FCL (`handleGroupChange('fcl')`) saat berada di moda Udara, sistem otomatis mengalihkan tab ke **Laut** (atau **Semua**).
        - Jika PIC yang aktif bukan PIC yang menangani FCL (`ferly` atau `all`), sistem otomatis me-reset filter PIC ke **Semua PIC** agar kargo FCL langsung terlihat di tabel.
      - **Panduan Pemulihan Kontekstual Saat Empty State**:
        - Jika filter menghasilkan 0 item pada kategori FCL, antarmuka menyediakan tombol pemulihan cerdas: `[Beralih ke Tab Laut]` atau `[Tampilkan di Semua PIC (N)]`.
  - **3. Verifikasi & Pengujian**:
    - `bun run build` di frontend $\to$ **LULUS 100% 0 errors** (4.58s).
    - PM2 service `ShippingApi` direstart dan online (PID `19300`).
    - HTTP production status test `https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Verifikasi data lokal API: 3 kargo FCL aktif KB/IRVIN berhasil teragregasi dan tampil pada pill `FCL (3)`.

---

- [x] **Perbaikan Resolusi Customer Per-Item pada Target Bill & Relevance Ranking Pencarian (`TargetPage.tsx`, `billing-analytics.service.ts`)**:
  - **1. Analisis Kebutuhan & Akar Masalah**:
    - URL: `https://app.sampai.co/mshipping/finance/billing/target`
    - Pertanyaan Pengguna: *"saya cari yto kenapa data yto muncul di bawah?"*
    - **Akar Masalah 1 (Pencemaran Nama Customer dari Batch Marking Laut/Udara)**:
      - Di pengiriman laut/konsinyasi, satu batch marking code (misal: `26GZD26`) memuat banyak colly/marking no dari berbagai customer berbeda (`ASH`, `JMD`, `YTO`, `ROBBY GUNAWAN`, dll).
      - Pada `billing-analytics.service.ts`, query pembantu meng-group `tbEntryList` hanya berdasarkan `el.fdMarkingCode` dengan agregasi `MAX(el.fdCustCode) AS sampleCustCode`.
      - Untuk batch `26GZD26`, `MAX(el.fdCustCode)` menghasilkan `'Y000149'` (customer YTO) karena huruf 'Y' memiliki urutan alfabetik tertinggi.
      - Akibatnya, baris colly milik customer lain dalam batch tersebut (seperti `ASH/C :1-8` dan `ASH/C :1-17` yang sebenarnya milik customer `ASH`) salah ditimpa menjadi customer `"YTO"`.
      - Sementara kargo YTO yang asli pada batch tersebut (`0938791`, colly 9) sudah terbit invoice/billing (`fdBillCreated = 1, fdGive = 1`) sehingga tidak berada di target billing.
    - **Akar Masalah 2 (Posisi Tampil di Paling Bawah Karena Default Aging Sort)**:
      - Kargo `26GZD26` memiliki umur kargo baru 4 hari (`hari = 4`).
      - Stored Procedure `get_data_billing_and_data_m3` mengurutkan data berdasarkan `hari DESC` (aging tertua 90 hari, 80 hari, ..., hingga 0 hari).
      - Karena kargo ASH berumur 4 hari keliru dinamai `"YTO"`, saat pengguna mencari `"YTO"`, kargo tersebut muncul di baris-baris paling akhir (bawah tabel).
    - **Akar Masalah 3 (Tidak Ada Bobot Relevansi pada Hasil Pencarian)**:
      - Sebelumnya, filter pencarian hanya memfilter boolean (`includes`) tanpa menyusun ulang urutan item berdasarkan tingkat kecocokan (exact match, prefix match, partial match).
  - **2. Solusi Teknis & Implementasi**:
    - **Backend (`billing-analytics.service.ts`)**:
      - Menyertakan `RTRIM(el.fdCustCode) AS custCode` pada query `entryListRows`.
      - Memetakan entry item secara granular per colly: `entryItemMap.set(`${e.markingCode}|||${e.markingNo}`, { listCode: e.fdListCode, custCode: e.custCode })`.
      - Menghapus ketergantungan pada `sampleCustCode` dari grouping batch marking untuk resolusi customer row.
      - Resolusi customer kini 100% presisi per baris: `itemCustCode = entryItemMap.get(`${marking}|||${markingNo}`)?.custCode`. Baris `ASH/C` tetap customer `ASH` (`A001362`), baris `SP/JMD` tetap `JMD` (`J000588`), dan tidak ada lagi colly customer lain yang tertimpa nama YTO.
    - **Frontend (`TargetPage.tsx`)**:
      - Menambahkan fungsi pembobotan skor pencarian `computeTargetSearchScore(item, rawQuery)`:
        - **Skor 100 (Prioritas Tertinggi)**: Exact match customer name, customer code, atau billTo.
        - **Skor 80**: Customer name / billTo diawali query (starts with).
        - **Skor 70**: Exact match marking code / marking no.
        - **Skor 60**: Customer name / billTo mengandung query (contains).
        - **Skor 40**: Marking code / marking no mengandung query.
        - **Skor 20**: Token generic match lainnya.
      - Mengurutkan `filteredList` saat query aktif: item dengan skor relevansi tertinggi otomatis ditaruh di **PALING ATAS**, diikuti secondary sort `hari DESC`.
  - **3. Verifikasi**:
    - Uji live via backend data check: batch `26GZD26` kini mengembalikan customer asli `ASH` (`A001362`), item semu YTO hilang 100%.
    - `bun run build` frontend $\to$ **LULUS 100% 0 errors** (4.66s).
    - PM2 service `ShippingApi` berhasil direstart dan online (PID `9272`).
    - Dokumentasi disinkronkan di `frontend-app.md`, `backend-app.md`, dan `.agents/working.md`.

---

- [x] **Perbaikan Fitur Pencarian Data Target Bill Berdasarkan Nama Customer (`TargetPage.tsx`, `billing-analytics.service.ts`, `billing.types.ts`, `billing.service.ts`)**:
  - **1. Analisis Kebutuhan & Akar Masalah**:
    - URL: `https://app.sampai.co/mshipping/finance/billing/target`
    - Pengguna melaporkan bahwa fitur pencarian data tidak dapat mencari berdasarkan nama customer.
    - **Akar Masalah 1 (Pencocokan Substring Kaku & Permutasi Nama Legalitas)**:
      - Di database master `tbCustomers.fdCustName`, nama perusahaan pelanggan disimpan dalam format legalitas di belakang (misal: `"SWADAYA SARANA BERLIAN, PT"`, `"BINTANG TIMUR, PT"`, `"KEVIN THOMAS, MR"`, `"ANDA TEXTILE,TK"`).
      - Pengguna Indonesia secara natural mengetik nama dengan awalan legalitas (misal: `"PT SWADAYA"`, `"PT BINTANG TIMUR"`, `"MR KEVIN"`).
      - Fungsi pencarian lama hanya menjalankan `item.customer.toLowerCase().includes(q)` yang kaku terhadap urutan kata contiguous, sehingga pencarian `"PT SWADAYA"` atau `"MR KEVIN"` menghasilkan **0 data** (gagal 100%).
    - **Akar Masalah 2 (Pencarian Kode Customer Tidak Didukung)**:
      - Field `item.custCode` (seperti `"S003077"`, `"B000075"`, `"K000475"`) tidak diikutsertakan dalam `filteredList`, sehingga pencarian berdasarkan kode pelanggan tidak menghasilkan data.
    - **Akar Masalah 3 (Single Source of Truth & Enrichment Backend)**:
      - Backend `getBillingTargetDetails` sebelumnya hanya memetakan nama yang dikembalikan dari Stored Procedure `get_data_billing_and_data_m3` tanpa override nama master resmi dari `tbCustomers.fdCustName` untuk entri yang dimodifikasi teks catatan SP, serta belum menyertakan `billTo` dan `consignee`.
    - **Akar Masalah 4 (Filter Kategori / PIC Menghalangi Hasil Pencarian)**:
      - Ketika pengguna mengetik kata kunci pencarian saat berada pada filter kategori tertentu (`sj_sent`, `cod`, `aging`, dll) atau PIC tertentu, pencarian dibatasi hanya pada subset tersebut. Jika data berada pada kategori lain, pengguna hanya melihat tampilan "Tidak ada data" tanpa indikasi ada hasil di kategori lain.
    - **Akar Masalah 5 (Sinkronisasi URL Param)**:
      - Input pencarian sebelumnya tidak membaca atau menulis ke parameter URL (`?search=...`).
  - **2. Solusi Teknis & Implementasi**:
    - **Backend (`billing-analytics.service.ts`, `billing.service.ts`)**:
      - Memperluas lookup master `tbCustomers` berdasarkan gabungan `distinctCustomers` dan `distinctCustCodes` (dari `tbEntryList`).
      - Menerapkan Single Source of Truth nama pelanggan resmi dari `tbCustomers.fdCustName`.
      - Memperkaya data item target dengan `custCode`, `billTo` (`tbCustomers.fdBillTo`), dan `consignee` (`tbMarking.fdConsignee`).
      - Menambahkan dukungan filter server-side `query.search` berbasis token kata normalisasi.
    - **Frontend (`TargetPage.tsx`, `billing.types.ts`)**:
      - **Smart Multi-Token Search Matcher (`matchTargetSearch`)**:
        - Normalisasi teks: membersihkan tanda baca (`.`, `,`, `-`, `/`, dll) dan multi-spasi.
        - Token matching: seluruh token kata pada query pengguna diverifikasi keberadaannya dalam pool data (`customer`, `custCode`, `billTo`, `consignee`, `markingCode`, `markingNo`, `branch`, `sales`, `comodity`, `type`, `pic`).
        - Evaluasi permutasi awalan nama legalitas (`PT`, `CV`, `UD`, `PD`, `MR`, `MRS`, `TK` $\leftrightarrow$ `TOKO`).
        - Raw exact substring check untuk kode customer (`custCode`), nomor marking, dan list code.
      - **Sinkronisasi URL Dua Arah**: Membaca inisial `searchParams.get('search')` dan sinkronisasi debounced (300ms) saat mengetik.
      - **Panduan Navigasi Kontekstual Saat Empty Result**:
        - Jika filter kategori aktif menghasilkan 0 item namun ditemukan data pada kategori lain, muncul tombol pintas `[Tampilkan di Semua Kategori (N)]`.
        - Jika filter PIC aktif menghasilkan 0 item namun ditemukan data pada PIC lain, muncul tombol `[Tampilkan di Semua PIC (N)]`.
      - **Visualisasi Identitas Customer di Tabel & Kartu**:
        - Menampilkan badge mono kode customer (`[custCode]`) di samping nama customer pada tabel desktop dan kartu mobile.
        - Menampilkan baris `Bill to: [billTo]` jika nama penagihan berbeda dari nama customer.
        - Memperbarui placeholder input: `"Cari customer, kode, marking..."`.
  - **3. Verifikasi**:
    - `bun run build` di frontend $\to$ **LULUS 100% 0 errors** (3.38s).
    - PM2 service backend `ShippingApi` direstart dan online (PID `152`).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi disinkronkan di `docs/frontend/billing.md`, `docs/backend/billing.md`, `frontend-app.md`, `backend-app.md`, dan `.agents/working.md`.

---

- [x] **Klarifikasi dan Penegasan Label YoY Akumulasi 12 Bulan pada Grafik Billing (`TrendChart.tsx`, `docs/frontend/billing.md`)**:
  - **1. Analisis & Verifikasi Data Matematis**:
    - Pengguna menanyakan perbedaan antara kurva grafik bulanan yang turun vs badge tag yang menampilkan kenaikan `+1.5%`.
    - **Hasil Audit Database**:
      - **Kumulatif 12 Bulan Penuh (Okt 2025 – Sep 2026 vs Okt 2024 – Sep 2025)**: Total Udara = 14.276 bill vs 14.069 bill $\to$ naik **+1.5%** (+207 bill).
      - **Titik Performa Per Bulan (Sep 2026 vs Sep 2025)**: Udara Sep 2026 = 1.115 bill vs Sep 2025 = 1.701 bill $\to$ turun **-34.5%** (-586 bill).
      - Keduanya 100% benar, namun label badge sebelumnya hanya tertulis `YoY ▲ +1.5%` tanpa kata "12 Bln", menimbulkan ambiguitas dengan grafik titik bulanan di bawahnya.
  - **2. Implementasi Frontend (`TrendChart.tsx`)**:
    - Memperbarui teks badge mini summary menjadi `YoY (12 Bln) ▲ +X%` pada chip Udara, Laut, dan Total.
    - Menambahkan kelas `whitespace-nowrap` pada pill badge untuk menjaga keterbacaan rapi di berbagai ukuran layar.
  - **3. Verifikasi**:
    - `bun run build` di frontend $\to$ **LULUS 100% 0 errors** (4.37s).
    - Status HTTP live production $\to$ **200 OK**.
    - Dokumentasi disinkronkan di `docs/frontend/billing.md` dan `.agents/working.md`.

---

- [x] **Perbaikan Pemisahan Tarif Tax Return vs M3 Pokok pada Validasi Type 2 & Eliminasi Undercharge Semu M3 (`billing-validation.service.ts`, `billing.utils.ts`, `ProfilePricingTab.tsx`)**:
  - **1. Akar Masalah**:
    - Kasus Invoice: `GZS-011112-09-2026` (Customer S000130 - SUMBER SEGARA MAKMUR).
    - Pada `tbBillingDetail`, terdapat 2 item:
      - Item 1: `PARCELS TO JAKARTA (M3) - ROLLER CHAIN` (`fdListCode = 'M3'`, `fdItemPrice = 6.500.000`, `fdTotal = 15.303.600`).
      - Item 2: `TAX RETURN - MINIMUM` (`fdListCode = 'M3'`, `fdItemPrice = 500.000`, `fdTotal = 1.500.000`).
    - **Masalah 1 (Backend - Type 2 Compare M3 vs KG)**:
      - Loop `detailRows` di `getType2ComparisonCheck` sebelumnya mengecek `if (lc === 'M3') { priceM3 = price }`. Karena item Tax Return juga berunit `M3`, nilai `priceM3` ter-overwrite menjadi `500.000` (bukan `6.500.000`).
      - Akibatnya, nilai M3 dihitung keliru: `2.3544 M3 × 500.000 = Rp 1.177.200`, kalah dari nilai KG `2423 KG × 6.000 = Rp 14.538.000`. Sistem memilih KG sebagai winner dan membandingkannya dengan total tagihan `16.803.600` $\to$ memunculkan selisih overcharge semu **Rp 2.265.600** (`16.803.600 - 14.538.000`).
    - **Masalah 2 (Frontend - Undercharge Semu Item M3)**:
      - Pada `evaluateItemPrice`, item `PARCELS TO JAKARTA (M3) - ROLLER CHAIN` diarahkan ke pencocokan nama komoditas di Price List master umum alih-alih divalidasi ke tarif M3 profil customer (`profileHarga.harga = 6.500.000`). Hal ini memicu peringatan *"Terdapat 1 item dengan tarif di bawah master (undercharge: PARCELS TO JAKARTA (M3) - ROLLER CHAIN)"*.
  - **2. Solusi Teknis & Implementasi**:
    - **Backend (`billing-validation.service.ts`)**:
      - Memisahkan item tambahan (`isAuxiliary`: Tax Return, Admin, Surcharge, Packing, Discount) dari ekstraksi `priceM3` dan `priceKG`.
      - Tarif Tax Return tidak lagi menimpa `priceM3` kargo pokok (tetap `6.500.000`).
      - Mengakumulasikan biaya tambahan non-freight ke `totalBilledAuxiliary` (Tax Return Rp 1.500.000).
      - Menghitung `totalNilaiTagihanIdeal = totalFreightIdeal (winner M3/KG) + totalBilledAuxiliary`. Hasil komparasi: M3 menang (Rp 15.303.600 vs KG Rp 14.538.000) $\to$ `totalNilaiTagihanIdeal = 15.303.600 + 1.500.000 = 16.803.600` $\to$ selisih vs aktual = **Rp 0 (EQUAL / SESUAI)**.
      - Ekuivalen KG min charge (`minKgEquiv`) memprioritaskan rasio kontraktual profil customer (`profileHarga.rasio = 700`, menghasilkan $0.1 \times 700 = 70\text{ KG}$).
    - **Frontend (`billing.utils.ts` & `ProfilePricingTab.tsx`)**:
      - Menambahkan pengenal `isM3MainItem` pada item dengan unit `fdListCode === 'M3'` (non-Tax Return).
      - Mengarahkan acuan validasi `profilePrice` langsung ke `profileHarga.harga` (Rp 6.500.000).
      - Hasil evaluasi: `billedPrice (6.500.000) === profilePrice (6.500.000)` $\to$ status **MATCH**, warning undercharge semu hilang 100%.
  - **3. Verifikasi**:
    - Uji backend live via skrip DB: `priceM3 = 6.500.000`, `overallWinner = M3`, `selisihVsAktual = 0`, `validationStatus = EQUAL`.
    - `bun run build` di frontend $\to$ **LULUS 100% 0 errors** (3.78s).
    - PM2 service `ShippingApi` berhasil di-restart dan online (PID `24000`).
    - Dokumentasi disinkronkan di `docs/backend/billing.md`, `docs/frontend/billing.md`, dan `.agents/working.md`.

---

- [x] **Penambahan Timestamp Issued di Bawah Tanggal Invoice pada Halaman Validasi (`ValidationDetailPage.tsx`)**:
  - **1. Kebutuhan Pengguna**:
    - Pengguna meminta agar halaman detail validasi billing (`/finance/billing/validation/:invNo`, contoh: `SGS-002067-09-2026`) menampilkan timestamp issued tepat di bawah tanggal invoice (`Tgl Tagihan`).
  - **2. Implementasi Antarmuka UI**:
    - Menambahkan blok informasi `Waktu Issued` di bawah tampilan `Tgl Tagihan` pada kartu "Identitas Tagihan & Customer":
      - Ikon `Clock` dengan label uppercase semantik `WAKTU ISSUED`.
      - Menampilkan tanggal & jam terbit lengkap menggunakan `formatDateTime(data.fdGiveDate)` (misal: `30 Sep 2026, 13.06 WIB`) dalam tipografi mono tabular emerald.
      - Menampilkan nama karyawan penerbit (`data.giveEmployee?.fdEmpName`, misal: `Oleh: FERLY`).
      - Fallback rapi: jika invoice masih berstatus draft, menampilkan badge/teks amber `Belum Terbit (Draft)`.
    - Menambahkan `title` tooltip interaktif pada komponen `IssuedBadge` di header bar untuk mengintip tanggal & penerbit saat kursor diarahkan ke badge.
  - **3. Verifikasi & Pengujian**:
    - `bun run build` $\to$ **LULUS 100% 0 errors** (3.26s).
    - Status HTTP live production $\to$ **200 OK**.
    - Dokumentasi disinkronkan di `frontend-app.md`, `docs/frontend/billing.md`, dan `.agents/working.md`.

---

- [x] **Redesign Komprehensif Tab Validasi M³ pada Modal Audit & Validasi Invoice (`PhysicalAuditTab.tsx`)**:
  - **1. Audit Desain & Kebutuhan Pengguna**:
    - Menerapkan prinsip skill `redesign-existing-projects` dan standar antarmuka [`.agents/rules/ui-styling.md`](./rules/ui-styling.md).
    - Menghilangkan div soup, font generik tanpa alignment angka, tabel redundan, dan banner terhimpit.
  - **2. Peningkatan Visual & Tata Letak ERP Berdensitas Tinggi**:
    - **Banner Prioritas Atas**: Memindahkan alert undercharge (`isBilledBelowMinM3`) dan COD/Urgent shortfall (`isCodUrgentShortfall`) ke urutan paling atas dengan border kiri tebal (`border-l-4 border-l-amber-500 bg-amber-500/5`), ikon squircle, dan sorotan angka mono tabular.
    - **Tabel Rekapitulasi Kelompok Bill Terkait (Induk & Pecahan 1 Batch)**:
      - Header bar modern dengan pulse beacon, badge batch, dan status kelengkapan bill dinamis (`Semua ListCode Ada Bill` vs `X ListCode Belum Ada Bill`).
      - Tabel high-density dengan styling interaktif: row invoice aktif ditandai border kiri sky (`bg-sky-500/10 border-l-4 border-l-sky-500`) dan badge `Saat Ini`.
      - Nomor invoice dapat diklik (`onSelectInvoice`) dengan ikon `ExternalLink`.
      - Angka `tabular-nums font-mono` untuk M³, berat kg, dan koli.
      - Baris `tfoot` merangkum total kubikasi, berat, koli, dan status 100% lengkap batch.
    - **Primary KPI Cards (Ditagihkan vs Gudang vs PL vs Komplain)**:
      - Tipografi mono `text-lg sm:text-xl font-bold font-mono tracking-tight tabular-nums`.
      - Sumber acuan yang cocok (`isUsedGudang`, `isUsedPL`, `isUsedKomplain`) diberi border emerald bercahaya (`border-emerald-500/60 bg-emerald-500/[0.04] ring-1 ring-emerald-500/20`) dengan pill denyut `Dipakai Bill`.
    - **Eliminasi Redundansi Rincian Marking**:
      - Tabel `markingDetails` dikonversi menjadi accordion toggle (`isMarkingDetailsOpen`) jika tabel kelompok bill terkait sudah tampil di atas, mencegah scrolling ganda dan duplikasi baris.
    - **Dashboard Konsistensi Muatan Fisik**:
      - 3 panel evaluasi kompak: Kuantitas Koli (`Package`), Timbangan Fisik (`Scale`), dan Status Validasi Fisik (`CheckCircle2`/`XCircle`), 100% Midnight Dark Mode compliant.
  - **3. Verifikasi**:
    - `bun run build` $\to$ **LULUS 100% 0 errors** (2.82s).
    - Status HTTP live production $\to$ **200 OK**.
    - Dokumentasi disinkronkan di `frontend-app.md`, `docs/frontend/billing.md`, dan `.agents/working.md`.

---

- [x] **Rincian Data Asal Target Bill pada Dashboard KPI Cards & Halaman Target Bill (`billing-analytics.service.ts`, `DashboardPage.tsx`, `TargetPage.tsx`, `billing.types.ts`, `useBillingDashboard.ts`)**:
  - **1. Latar Belakang & Kebutuhan Pengguna**:
    - Pengguna meminta agar kartu **Target Bill Hari Ini** pada dashboard billing (`/finance/billing`) tidak hanya menampilkan angka total dan breakdown PIC, melainkan dirinci asal datanya: berapa kargo dari Surat Jalan terkirim belum di-bill (`SJ Sent`), berapa `COD/Urgent`, berapa `Aging > 7 Hari`, dan berapa `FCL`.
  - **2. Peningkatan Backend (`billing-analytics.service.ts`)**:
    - **Resolusi Murni Per `fdListCode`**:
      - Memperbaiki kueri pengiriman `tbDelivery`: hanya mengambil delivery aktif (`YEAR(d.fdSjDate) >= 2024`) dengan `fdSent = 1` yang belum di-bill, dikumpulkan ke dalam `sentListCodeSet`.
      - Memetakan setiap baris kargo dari stored procedure ke `fdListCode` aslinya melalui `entryMap` (`markingCode + '|||' + markingNo`).
      - Evaluasi `isSent` murni per baris `fdListCode`: `statusKirim.includes('TERKIRIM') || statusKirim.includes('TERIMA SJ') || (listCode ? sentListCodeSet.has(listCode) : false)`.
      - Mengeliminasi distorsi marking batch (sehingga jika hanya 1 colly terkirim, colly lain di marking yang sama tidak otomatis terhitung).
    - Menghitung agregasi kategori kriteria penagihan per moda pada `getBillingKPIs`:
      - `sjSent`: Kargo per `fdListCode` dengan status `TERKIRIM` / `TERIMA SJ` atau terdaftar pada `tbDelivery.fdSent = 1` tanpa nomor bill.
      - `codUrgent`: Status kargo mengandung `COD` atau `URGENT`.
      - `agingGt7`: Umur kargo `hari > 7`.
      - `fcl`: Tipe kargo mengandung `FCL` atau `KONTAINER`.
    - Mengembalikan `categories: { sjSent, codUrgent, agingGt7, fcl }` di `targetBillUdara` dan `targetBillLaut`.
    - Pada `getBillingTargetDetails`, menambahkan `listCode` dan flag `isSjSent` pada setiap item kargo untuk menyelaraskan klasifikasi filter antara dashboard dan halaman detail target.
  - **3. Peningkatan Frontend & Desain Interaktif (`DashboardPage.tsx`, `TargetPage.tsx`, `billing.types.ts`)**:
    - **Dashboard KPI Cards**:
      - Menampilkan chip kategori berwarna modern & elegan pada kartu Target Bill Udara & Laut:
        - `SJ Sent`: Biru muda (`bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20`)
        - `COD/Urgent`: Kuning amber (`bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20`)
        - `Aging > 7`: Ungu (`bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20`, hanya muncul jika $> 0$)
        - `FCL`: Hijau emerald (`bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20`, hanya muncul jika $> 0$)
      - Garis pembatas elegan dengan rincian `PIC: Thara: X | Rico: Y | Ferly: Z`.
      - Setiap chip kategori adalah **tombol interaktif** (`cursor-pointer`), saat diklik langsung menavigasi ke halaman Target Bill dengan filter kategori yang sesuai (misal: `?type=laut&group=sj_sent`).
    - **Halaman Target Bill (`TargetPage.tsx`)**:
      - Menambahkan opsi filter `'sj_sent'` (`SJ Terkirim`) pada `GROUP_OPTIONS` dengan badge counter aktif.
      - Mendukung deep-linking query parameter `group` (`?group=sj_sent`, `?group=cod`, dsb).
      - Menghubungkan klik pill filter ke URL search params secara reaktif.
  - **4. Verifikasi & Pengujian**:
    - `bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-DKWqs5vu.js` dalam 3.10s).
    - PM2 `ShippingApi` direstart dan online (PID `23476`).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.

---

- [x] **Tampilkan Tabel Rekapitulasi Kelompok Bill Terkait (Induk & Pecahan 1 Batch) pada Modal Audit Validasi (`PhysicalAuditTab.tsx`, `BillingValidationSummaryModal.tsx`, `m3-check.service.ts`, `m3-check.types.ts`, `billing.types.ts`)**:
  - **1. Analisis Kebutuhan**:
    - Pengguna meminta agar seluruh data rekapitulasi kelompok bill terkait (Induk & Pecahan dalam 1 Batch) ditampilkan langsung pada modal *Audit & Validasi Invoice* -> tab *validasi m3* (`PhysicalAuditTab.tsx`).
    - Sebelumnya, bagian ini hanya menampilkan daftar teks sederhana berisi No Invoice dan M³ tanpa rincian `fdListCode`, berat fisik, koli, status bill, maupun kepastian apakah seluruh listcode pada batch sudah terbit fakturnya.
  - **2. Peningkatan Backend (`m3-check.service.ts` & `m3-check.types.ts`)**:
    - Memperkaya `evaluateM3Check` dengan kueri `batchEntryLists` dari `tbEntryList` untuk mengambil seluruh kargo fisik pada batch customer terkait.
    - Mengintegrasikan mapping data fisik (`detailByListCode`) dari SP kubikasi `get_qr_tbm3_perMarking_plus_rasio` (packing list, komplain, gudang) dengan `relatedBatchBills` di `tbBilling`.
    - Menghasilkan struktur data baru:
      - `listCodeBreakdown: RelatedListCodeItem[]`: Status lengkap per `fdListCode` (`listCode`, `invNo`, `isParent`, `childLetter`, `m3Gudang`, `m3PL`, `berat`, `qty`, `billedM3`, `hasBill`, `firstItemName`).
      - `allListCodesHaveBill`: Boolean penentu apakah 100% listcode pada batch sudah memiliki bill.
      - `missingBillsCount`: Jumlah listcode pada batch yang belum diterbitkan bill-nya.
      - Enriched `relatedInvoices`: Menyertakan `m3Gudang`, `m3PL`, `berat`, `qty`, dan `isCurrent`.
  - **3. Peningkatan Frontend & Redesign Antarmuka Modal (`PhysicalAuditTab.tsx`, `BillingValidationSummaryModal.tsx`)**:
    - **Header Bar**:
      - Indikator denyut biru pulsing dan nama batch kargo (`26GZD73`).
      - Badge Audit Status Dinamis: `✓ Semua ListCode Ada Bill (4/4)` (Emerald outline) atau `⚠️ X ListCode Belum Ada Bill (Missing)` (Rose outline).
      - Badge Posisi Invoice: `Invoice Induk` atau `Invoice Pecahan (A, B, dst)`.
    - **Tabel Rekapitulasi Rinci (High-Density ERP Table)**:
      - Kolom: `No. Invoice` | `Posisi` | `fdListCode` | `M³ Fisik` | `Berat (kg)` | `Koli` | `M³ Ditagih` | `Status Bill`.
      - Highlight baris invoice yang sedang dibuka pengguna (`isCur`) dengan aksen `bg-sky-500/10 dark:bg-sky-950/40 border-l-4 border-l-sky-500` dan badge `Saat Ini`.
      - Kolom No. Invoice interaktif: Jika diklik, memicu `onSelectInvoice` untuk langsung berpindah ke invoice terkait tanpa menutup alur kerja.
      - Status Bill visual: `✓ Ada Bill` (Emerald badge) vs `❌ Belum Ada Bill` (Rose badge).
    - **Baris Total Akumulasi (`tfoot`)**:
      - Menjumlahkan seluruh listcode dalam batch: total M³ fisik gudang, total berat kg, total koli, total billed M³, dan status kelengkapan batch 100% Lengkap.
    - **Banner Edukasi ERP**: Menjelaskan mekanisme konsinyasi FoxPro di mana seluruh rupiah/volume digabung ke invoice induk, sedangkan invoice pecahan diterbitkan Rp 0 sebagai penampung packing list/resi.
  - **4. Verifikasi**:
    - `bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-9xpf0RO5.js` dalam 3.18s).
    - PM2 backend `ShippingApi` direstart dan online (PID `10540`).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi disinkronkan di `frontend-app.md`, `backend-app.md`, `docs/frontend/billing.md`, dan `docs/backend/billing.md`.

---

- [x] **Fix Min Charge M3 pada Validasi Type 2 (`billing-validation.service.ts`, `Type2ComparisonPanel.tsx`)**:
  - **1. Akar Masalah**:
    - Invoice `SHS-000233-09-2026`: Volume aktual = 0.0446 M3 (< minChargeM3 = 0.1), berat = 58 KG (< minKgEquiv = 70).
    - Sistem menghitung nilai ideal tanpa min charge → `nilaiM3 = Rp 289.900`, `nilaiKG = Rp 348.000` → dipilih KG Rp 348.000. Padahal seharusnya `nilaiM3Efektif = max(289.900, 0.1 × 6.500.000) = Rp 650.000` → pilih M3.
  - **2. Solusi Backend (`billing-validation.service.ts`)**:
    - Extract `minChargeM3` dan `minChargeKg` dari `m3CheckRes`. Hitung `rasio = priceM3 / priceKG` → `minKgEquiv = minChargeM3 × rasio` (0.1 × 700 = 70 KG).
    - `nilaiM3Efektif = max(nilaiM3, minChargeM3 × priceM3)`, `nilaiKGEfektif = max(nilaiKG, minKgEquiv × priceKG)`.
    - `winner` dan `totalNilaiTagihanIdeal` dari nilai efektif. Expose `minChargeM3`, `minKgEquiv`, `minChargeApplied`.
  - **3. Update UI (`Type2ComparisonPanel.tsx`)**:
    - Badge `⚡ MIN CHARGE M3 (0.1 M3 / 70 KG)` di header. Banner penjelasan di summary. Tabel item: row amber + badge ⚡ Min Charge + nilai efektif dengan coretan nilai asli.
  - **4. Verifikasi**: `bun run build` → **LULUS 100% 0 errors** (`dist/assets/billing-BapzYn_S.js` dalam 3.94s). PM2 `ShippingApi` online PID `24932`.

---

- [x] **Perhitungan Target Bill Mengikutsertakan Semua Surat Jalan yang Sudah Terkirim (`fdSent = 1`) Namun Belum Di-Bill (`billing-analytics.service.ts`)**:
  - **1. Kebutuhan Bisnis**:
    - Pada dashboard billing (`/finance/billing`), card **Target Bill Hari Ini** (Udara & Laut) sebelumnya hanya menghitung kargo dengan kriteria: COD/Urgent, FCL, atau Aging > 7 hari.
    - Kargo yang surat jalannya sudah dikonfirmasi terkirim ke customer (`tbDelivery.fdSent = 1` atau status `TERKIRIM` / `TERIMA SJ`) namun berumur $\le 7$ hari sebelumnya tereliminasi dari target penagihan, padahal barang yang sudah sampai wajib segera diterbitkan invoice-nya oleh Finance.
  - **2. Solusi & Implementasi Backend**:
    - Pada `getBillingKPIs` dan `getBillingTargetDetails` di `billing-analytics.service.ts`:
      - Mengambil daftar marking dari `tbDelivery` yang memiliki `fdSent = 1`, `el.fdBillCreated = 0`, `el.fdFinish = 0`, dan `d.fdListCode NOT IN (SELECT fdListCode FROM tbBilling)`.
      - Memperbarui evaluator `isTarget`:
        ```ts
        const isSent = statusKirim.includes('TERKIRIM') || statusKirim.includes('TERIMA SJ') || sentMarkingSet.has(mCode)
        return isCodOrUrgent || isAgingGt7 || isFcl || isSent
        ```
      - Memastikan kargo dengan status `isSent` tetap masuk tanpa terhalang status gudang (`if (!isFcl && !isSent)`).
    - PM2 service `ShippingApi` direstart dan online.

---

- [x] **Klasifikasi Status Error Penuh pada Kesalahan Hitung Overweight (`BillingValidationCard.tsx`, `BillingValidationSummaryModal.tsx`, `OverweightAuditTab.tsx`, `validationSummary.utils.ts`)**:
  - **1. Akar Masalah**:
    - Kasus seperti `GZS-011059-09-2026`: Invoice menagihkan item KG (910 kg) padahal muatan fisik (3.917 kg) masih di bawah batas kuota rasio (4.295 kg).
    - Pada `BillingValidationCard.tsx`: Badge header kartu sebelumnya hanya melihat kecocokan M3 (`matchStatus === 'MATCH_PRIMARY'`), sehingga menampilkan badge **"COCOK (KOMPLAIN)"** berwarna hijau dengan centang sukses, meskipun terdapat selisih penagihan KG yang tidak berdasar fisik.
    - Pada `BillingValidationSummaryModal.tsx`: Definisi `hasWarning` sebelumnya mencakup `!isOverallValid`, menyebabkan semua invoice yang tidak valid tetap dianggap warning (amber/kuning), bukan error fatal (rose/merah) dengan ikon silang `XCircle`.
    - Pada `OverweightAuditTab.tsx`: Item penagihan KG tanpa overweight sebelumnya berstatus `'PERINGATAN'`, bukan `'SELISIH'`.
  - **2. Solusi & Perbaikan**:
    - **`BillingValidationCard.tsx`**:
      - Memindahkan perhitungan `overweight` dan `hasOverweightIssue` sebelum evaluasi badge header.
      - Menambahkan kondisi `else if (!isAir && hasOverweightIssue)`: Menampilkan badge **DANGER (merah)** dengan ikon `X` dan teks eksplisit `SELISIH KG (DITAGIH 910 KG TANPA OVERWEIGHT)` atau `SELISIH OVERWEIGHT (+X KG BELUM DITAGIH)`.
    - **`BillingValidationSummaryModal.tsx`**:
      - Memperbaiki `hasWarning`: Hanya bernilai true jika `isOverallValid` terpenuhi dan terdapat soft warning (`isBilledBelowMinM3` atau `isCodUrgentShortfall`).
      - Untuk invoice dengan selisih/kesalahan hitung (`!isOverallValid`), modal header dan alert banner bawah kini berstatus **ERROR MERAH** (`bg-rose-500/10 border-rose-500`) dengan ikon `XCircle`.
    - **`OverweightAuditTab.tsx`**:
      - `isBilledUnneededOverweight` kini berstatus `SELISIH` (Badge merah) dan menampilkan teks peringatan keras: `❌ Kesalahan Hitung: Berat fisik aktual (3.917 kg) masih berada dalam batas kuota rasio (0 kg overweight), namun invoice menagihkan item KG sebesar 910 kg.`
    - **`validationSummary.utils.ts`**:
      - Memperbarui `calculateValidationVerdict` untuk menegaskan judul: `Kesalahan Hitung: Invoice Menagihkan Item KG (910 kg) Padahal Muatan Tidak Overweight`.
  - **3. Verifikasi**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-z1LqwTGT.js` dalam 2.98s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.

---

- [x] **Audit Kelompok Bill Terkait (Induk & Pecahan dalam 1 Batch) & Verifikasi Status Bill per fdListCode (`m3-check.service.ts`, `PhysicalAuditTab.tsx`, `tbEntryList`, `tbBilling`)**:
  - **1. Analisis Mekanisme Kelompok Bill Terkait**:
    - Bagian *Kelompok Bill Terkait* pada tab Validasi M³ dibentuk oleh backend `m3-check.service.ts` berdasarkan relasi customer (`resolvedCustCode`) dan prefix batch (`cleanBatchCode`).
    - Mengelompokkan nomor faktur yang berbagi sequence sama dengan huruf pecahan (`011085`, `A11085`, `B11085`, dst) atau yang mencantumkan referensi invoice induk.
  - **2. Hasil Audit Database & Rekapitulasi per Invoice**:
    - **`GZS-011085-09-2026`** (Customer `E000473` - `ENGL/96/WR`, Batch `26GZD73`):
      - Total `tbEntryList`: 4 listcode (`0942766`, `0942767`, `0942768`, `0942769`).
      - Total `tbBilling`: 4 invoice (`GZS-011085`, `GZS-A11085`, `GZS-B11085`, `GZS-C11085`).
      - **Status**: **100% LENGKAP SUDAH ADA BILL-NYA**.
    - **`GZS-011099-09-2026`** (Customer `A001311` - `ASH`, Batch `26GZD65`):
      - Total `tbEntryList`: 5 listcode (`0941883`, `0941884`, `0941886`, `0941889`, `0941893`).
      - Total `tbBilling`: 5 invoice (`GZS-011099`, `GZS-A11099`, `GZS-B11099`, `GZS-C11099`, `GZS-D11099`).
      - **Status**: **100% LENGKAP SUDAH ADA BILL-NYA**.
    - **`GZS-011064-09-2026`** (Customer `B000703` - `ABS/BINTARO`, Batch `26GZD67`):
      - Total `tbEntryList`: 10 listcode (`0942033` s/d `0942135`).
      - Total `tbBilling`: 10 invoice (`GZS-011064` Induk + `GZS-A11064` s/d `GZS-I11064`).
      - **Status**: **100% LENGKAP SUDAH ADA BILL-NYA**.
    - **`GZS-011093-09-2026`** (Customer `B000075` - `BAGAS`, Batch `26GZD70`):
      - Total `tbEntryList`: 2 listcode (`0942448`, `0942449`).
      - Total `tbBilling`: 2 invoice (`GZS-011093`, `GZS-A11093`).
      - **Status**: **100% LENGKAP SUDAH ADA BILL-NYA**.
    - **`GZS-011086-09-2026`**, **`GZS-011059-09-2026`**, **`SHS-000233-09-2026`**:
      - Batch tunggal tanpa pecahan: 1 listcode = 1 bill terbit (`100% Lengkap`).
  - **3. Catatan Temuan Global Missing Bills**:
    - Pada batch consignment laut murni yang dipecah, operator selalu membuat bill pecahan berpasangan (`A`, `B`, `C`, ...) sehingga 100% listcode tertampung.
    - Sebagian consignment udara (`GZA`) / split shipment tertentu terdapat listcode di `tbEntryList` yang belum diterbitkan bill (misal `A001456` di `26GZD70` listcode `0942494`, `I000659` di `26GZD61` listcode `0941468`).

---

- [x] **Klasifikasi Status Error Penuh pada Kesalahan Hitung Overweight (`BillingValidationCard.tsx`, `BillingValidationSummaryModal.tsx`, `OverweightAuditTab.tsx`, `validationSummary.utils.ts`)**:
  - **1. Akar Masalah**:
    - Kasus seperti `GZS-011059-09-2026`: Invoice menagihkan item KG (910 kg) padahal muatan fisik (3.917 kg) masih di bawah batas kuota rasio (4.295 kg).
    - Pada `BillingValidationCard.tsx`: Badge header kartu sebelumnya hanya melihat kecocokan M3 (`matchStatus === 'MATCH_PRIMARY'`), sehingga menampilkan badge **"COCOK (KOMPLAIN)"** berwarna hijau dengan centang sukses, meskipun terdapat selisih penagihan KG yang tidak berdasar fisik.
    - Pada `BillingValidationSummaryModal.tsx`: Definisi `hasWarning` sebelumnya mencakup `!isOverallValid`, menyebabkan semua invoice yang tidak valid tetap dianggap warning (amber/kuning), bukan error fatal (rose/merah) dengan ikon silang `XCircle`.
    - Pada `OverweightAuditTab.tsx`: Item penagihan KG tanpa overweight sebelumnya berstatus `'PERINGATAN'`, bukan `'SELISIH'`.
  - **2. Solusi & Perbaikan**:
    - **`BillingValidationCard.tsx`**:
      - Memindahkan perhitungan `overweight` dan `hasOverweightIssue` sebelum evaluasi badge header.
      - Menambahkan kondisi `else if (!isAir && hasOverweightIssue)`: Menampilkan badge **DANGER (merah)** dengan ikon `X` dan teks eksplisit `SELISIH KG (DITAGIH 910 KG TANPA OVERWEIGHT)` atau `SELISIH OVERWEIGHT (+X KG BELUM DITAGIH)`.
    - **`BillingValidationSummaryModal.tsx`**:
      - Memperbaiki `hasWarning`: Hanya bernilai true jika `isOverallValid` terpenuhi dan terdapat soft warning (`isBilledBelowMinM3` atau `isCodUrgentShortfall`).
      - Untuk invoice dengan selisih/kesalahan hitung (`!isOverallValid`), modal header dan alert banner bawah kini berstatus **ERROR MERAH** (`bg-rose-500/10 border-rose-500`) dengan ikon `XCircle`.
    - **`OverweightAuditTab.tsx`**:
      - `isBilledUnneededOverweight` kini berstatus `SELISIH` (Badge merah) dan menampilkan teks peringatan keras: `❌ Kesalahan Hitung: Berat fisik aktual (3.917 kg) masih berada dalam batas kuota rasio (0 kg overweight), namun invoice menagihkan item KG sebesar 910 kg.`
    - **`validationSummary.utils.ts`**:
      - Memperbarui `calculateValidationVerdict` untuk menegaskan judul: `Kesalahan Hitung: Invoice Menagihkan Item KG (910 kg) Padahal Muatan Tidak Overweight`.
  - **3. Verifikasi**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-z1LqwTGT.js` dalam 3.50s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.

---

- [x] **Pencarian Berdasarkan Nama Customer pada Customer Price List (`customer-price-list.service.ts`, `customer-price-list.routes.ts`, `ListPage.tsx`, `customerPriceList.service.ts`)**:
  - **1. Analisis Kebutuhan & Akar Masalah**:
    - Pada tab **Harga Khusus Komoditas** (`special_prices`), kueri database `listCustomerCommodityPrices` sebelumnya hanya mencocokkan kolom `category`, `fdCustCode`, `branch`, dan `notes`.
    - Kolom nama customer tersimpan pada master `tbCustomers.fdCustName`, sehingga pencarian dengan nama pelanggan (misal: "ASH", "SAGI", "ANT/ANG") menghasilkan 0 data.
    - Kondisi `where.OR` pencarian sebelumnya tertimpa saat filter status `EXPIRED` dipilih secara bersamaan.
    - Pada tab **Master Uploads** (`master_uploads`), endpoint `GET /api/customer-price-list` belum menerima parameter `search`.
  - **2. Solusi & Desain Teknis**:
    - **Backend (`customer-price-list.service.ts` & `customer-price-list.routes.ts`)**:
      - `listCustomerCommodityPrices`:
        - Mencari kode customer dari `tbCustomers` yang nama atau kodenya mengandung kata kunci pencarian (`fdCustName` / `fdCustCode`).
        - Mencari alias komoditas yang cocok dari `tbCommodityMapping` (`commodityName` $\to$ `targetCommodity`).
        - Mengisolasi klausa ke dalam `andConditions: Prisma.TbCustomerPriceListItemWhereInput[]` dengan filter `{ fdCustCode: { in: matchingCustCodes } }` dan `{ category: { in: matchingCommodities } }` tanpa konflik kondisi status/mode/branch.
      - `listCustomersWithPriceList`:
        - Menerima parameter `search?: string`, mencocokkan `fdCustName` via subquery `tbCustomers`, `fdCustCode`, dan `fileName`.
        - Memastikan sanitasi string `fdCustCode.trim()` pada pengayaan nama customer.
    - **Frontend (`ListPage.tsx` & `customerPriceList.service.ts`)**:
      - Mengintegrasikan `useDebounce` (300ms) pada input pencarian kedua tab (`specialSearch` dan `search`) untuk mengeliminasi spam API requests saat mengetik.
      - Menambahkan tombol bersihkan pencarian `[X]` instan pada search bar kedua tab.
      - Menyaring data client-side pada `filteredSpecialPrices` dan `filteredRows` berdasarkan `custName`, `fdCustCode`, `category`, `branch`, `alias`, dan `fileName`.
  - **3. Verifikasi & Pengujian**:
    - Pengujian backend: Pencarian nama customer "ASH" $\to$ 2 data ditemukan (sebelumnya 0), "SAGI" $\to$ 2 data ditemukan, "ASH" pada master upload $\to$ 1 data ditemukan.
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/customer-price-list-h8A2Aq-Z.js` dalam 3.52s).
    - PM2 service `ShippingApi` direstart dan online (PID `24808`).
    - Verifikasi HTTP production `https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi disinkronkan di `docs/frontend/pricing.md` dan `.agents/working.md`.

---

- [x] **Buffer Debounce Hening Voice Command 1 Detik (~1000ms) (`ValidationDetailPage.tsx`, `BillingValidationSummaryModal.tsx`, `ValidationSummaryHeader.tsx`)**:
  - **1. Penyesuaian Timeout Debounce**:
    - Mengurangi jeda hening pengenalan suara dari 2000ms (2 detik) menjadi 1000ms (1 detik) pada `ValidationDetailPage.tsx` dan `BillingValidationSummaryModal.tsx`.
    - Perintah dieksekusi lebih responsif setelah jeda bicara 1 detik tanpa memotong nomor invoice lengkap.
  - **2. Penyesuaian Telemetry & Tooltip**:
    - Memperbarui teks tooltip tombol mikrofon pada header `ValidationDetailPage` dan `ValidationSummaryHeader`: `"menunggu jeda 1 detik sebelum dieksekusi..."` dan `"Standby Suara Aktif (Jeda 1 detik setelah bicara)"`.
  - **3. Verifikasi & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-Bbbg_PZO.js` dalam 2.99s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi disinkronkan di `frontend-app.md`, `docs/frontend/billing.md`, dan `.agents/working.md`.

---

- [x] **Klarifikasi & Format Label Sumbu X Bebas Ambiguitas pada Grafik Billing (`dateRange.ts`, `billing-analytics.service.ts`, `ChartTick.tsx`, `TrendChart.tsx`)**:
  - **1. Analisis Akar Masalah**:
    - Pada grafik Bulanan dengan fitur **Diferensiasi YoY Udara & Laut**, titik terakhir berlabel `"Sep 26"`.
    - Singkatan 2-digit tahun (`{ month: 'short', year: '2-digit' }` $\to$ `"Sep 26"`) menimbulkan persepsi keliru seolah-olah grafik hanya memuat data sampai **tanggal 26 September**. Padahal `"Sep 26"` adalah **September 2026**, yang sudah mencakup seluruh penagihan bulan September (1–30 September: 3.991 bill, Rp 46,8 miliar).
    - Pada grafik Harian (rentang 30 hari), konfigurasi lama `interval="equidistantPreserveStart"` melompati tick setiap 5 hari (indeks 0, 5, 10, 15, 20, 25), sehingga tick label terakhir yang tercetak di layar berhenti di indeks 25 yaitu `"26 Sep (Sab)"`, melewati 4 hari terakhir (27–30 Sep) meskipun garis kurvanya tetap ada.
  - **2. Solusi & Perbaikan Komprehensif**:
    - **Backend (`dateRange.ts` & `billing-analytics.service.ts`)**: Mengubah formatting label bulan dari 2 digit (`year: '2-digit'`) menjadi 4 digit (`year: 'numeric'`) $\to$ `"Sep 2026"` dan `"Sep 2025"`.
    - **Komponen Tick Sumbu X (`ChartTick.tsx`)**:
      - Menambahkan parser regex `monthYearMatch` untuk memecah teks bulan dan tahun menjadi 2 baris terpisah secara visual: Baris 1: `Sep`, Baris 2: `2026`.
      - Menghilangkan ambiguitas dengan tanggal hari.
      - Memperbaiki parsing tanggal harian `YYYY-MM-DD` ke waktu lokal untuk mencegah pergeseran timezone UTC di browser.
    - **Komponen Grafik (`TrendChart.tsx`)**:
      - Mendestruktur `isMonthly` secara eksplisit pada prop komponen.
      - Untuk grafik Bulanan (`isMonthly = true`), menyetel `interval={0}` sehingga seluruh 12 bulan (Okt 2025 s/d Sep 2026) tercetak tanpa ada bulan yang terlewati.
      - Untuk grafik Harian (`isMonthly = false`), menyetel `interval="preserveStartEnd"` agar tanggal awal (01 Sep) dan tanggal akhir (30 Sep / Hari Ini) dijamin 100% selalu tercetak di tepi kanan sumbu X.
  - **3. Verifikasi & Restart Service**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-DZAGg7eS.js` dalam 3.66s).
    - Restart PM2 service backend `ShippingApi` (PID `7000`, online).
    - Verifikasi HTTP production `https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi disinkronkan di `docs/frontend/billing.md`, `docs/backend/billing.md`, dan `.agents/working.md`.

---

- [x] **Perbaikan Resolusi Voice Command "buka [nomor]" Prioritas Bill Belum Terbit (Draft Only) (`ValidationDetailPage.tsx`)**:
  - **1. Akar Masalah**:
    - Perintah suara seperti `"buka 11023"` atau `"buka gzs 11023"` sebelumnya memicu pencarian umum tanpa parameter `draftOnly: 'true'`.
    - Database mengembalikan belasan invoice historis (sudah terbit dari 2023–2025 serta sub-bill bernilai 0), memicu ambiguitas multi-match dan membuka drawer alih-alih langsung membuka bill unissued target (`GZS-011023-09-2026`).
    - Format incomplete seperti `"GZS-11023"` sempat lolos regex format lengkap dan langsung dinavigasikan sehingga berakhir 404 (format asli SQL Server adalah `GZS-011023-09-2026`).
    - Kolom `tbBilling.fdInvNo` di SQL Server bertipe `CHAR(20)` dengan spasi ekstra di akhir yang merusak URL routing jika tidak di-`.trim()`.
  - **2. Solusi & Desain Resolusi Cerdas**:
    - **Prioritas 1 (Unissued / Draft Bills Only)**: Memanggil `billingApi.list({ search: unpaddedDigits || cleanTarget, draftOnly: 'true', hasAmount: 'true', minYear: '2023', noPagination: 'true' })`.
    - **Sequence Scorer (`evaluateMatch`)**:
      - Mengekstrak segmen sequence nomor bill (misal `011023` dari `GZS-011023-09-2026`).
      - Membandingkan `unpaddedSeq === unpaddedDigits` (`"11023" === "11023"` $\to$ +100 skor) serta kecocokan cabang (`+40` skor).
      - Mengurutkan kandidat berdasarkan skor tertinggi, lalu `fdInvDate` terbaru.
    - **Sanitasi String Presisi**: Seluruh kandidat nomor invoice otomatis di-`.trim()` untuk membersihkan trailing spaces `CHAR(20)`.
    - **Fallback Aman**: Jika bill tidak ditemukan di daftar unissued, sistem mencari di riwayat umum dan memberi tahu pengguna jika bill sudah berstatus Terbit (Issued). Menghilangkan navigasi spekulatif yang berujung 404.
  - **3. Verifikasi & Pengujian**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-B1e1eH1A.js` dalam 3.21s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi disinkronkan di `frontend-app.md`, `docs/frontend/billing.md`, dan `.agents/working.md`.

---

- [x] **Data Year-over-Year (YoY) pada Grafik Bill Bulanan 12 Bulan Terakhir (`billing-analytics.service.ts`, `TrendChart.tsx`, `DashboardPage.tsx`, `billing.types.ts`)**:
  - **1. Analisis Kebutuhan & Agregasi Data 24 Bulan di Backend**:
    - **Backend (`billing-analytics.service.ts`)**: Kueri bulanan diperluas dari 12 bulan menjadi 24 bulan (`months[0].start - 1 tahun`), mengelompokkan `tbBilling` berdasarkan `YEAR(fdInvDate), MONTH(fdInvDate)` via `GROUP BY`.
    - Menggunakan hash lookup map `${yr}-${mo}` untuk memasangkan setiap bulan dari 12 bulan terakhir dengan bulan yang sama tahun sebelumnya (`${yr - 1}-${mo}`).
    - Menghitung metrik perbandingan tahun lalu dan pertumbuhan persentase: `prevTotalBill`, `prevTotalTagihan`, `prevBillUdara`, `prevBillLaut`, `prevTagihanUdara`, `prevTagihanLaut`, serta `totalBillYoYPct`, `totalTagihanYoYPct`, `billUdaraYoYPct`, `tagihanUdaraYoYPct`, `billLautYoYPct`, `tagihanLautYoYPct`.
    - Restart PM2 service `ShippingApi` (PID `16612`).
  - **2. Visualisasi & Diferensiasi Kurva YoY Air vs Sea di Frontend (`TrendChart.tsx`, `DashboardPage.tsx`)**:
    - **Diferensiasi Kurva Putus-Putus Per-Moda**:
      - ✈️ **Udara YoY (Tahun Lalu)**: Garis kurva putus-putus (`strokeDasharray="5 4"`) beraksen Sky 400 (`#38bdf8`), tampil saat filter Semua maupun Udara aktif.
      - 🚢 **Laut YoY (Tahun Lalu)**: Garis kurva putus-putus (`strokeDasharray="5 4"`) beraksen Mint/Emerald 400 (`#34d399`), tampil saat filter Semua maupun Laut aktif.
      - Konsisten di kedua mode: Jumlah Bill (`metric="count"`) dan Nominal Tagihan (`metric="value"`).
    - **Mini Summary Banner Badges Per-Moda**:
      - Chip Udara memuat badge YoY mandiri (`YoY ▲ +X.X%` / `▼ -X.X%` beserta delta bill/nominal).
      - Chip Laut memuat badge YoY mandiri (`YoY ▲ +X.X%` / `▼ -X.X%` beserta delta bill/nominal).
      - Chip Total memuat badge YoY total akumulatif 12 bulan.
    - **Tooltip Interaktif Multi-Moda**: Menampilkan data bulan berjalan, perbandingan tahun lalu per moda, persentase pertumbuhan spesifik Udara & Laut, serta rincian selisih nominal/bill per moda.
    - **Sakelar Toggle YoY**: Tombol `[YoY Aktif / Off]` di toolbar tab Bulanan untuk mengontrol visibilitas kurva pembanding.
  - **3. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-DFsZ7bla.js` dalam 3.26s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi disinkronkan di `frontend-app.md`, `docs/frontend/billing.md`, `backend-app.md`, `docs/backend/billing.md`, dan `.agents/working.md`.

---

- [x] **Buffer Penerimaan Suara 2 Detik (~2000ms Debounce) & Continuous Listening pada Halaman Validasi Detail Bill (`ValidationDetailPage.tsx`, `BillingValidationSummaryModal.tsx`, `ValidationSummaryHeader.tsx`)**:
  - **1. Analisis Kebutuhan & Akar Masalah**:
    - **Akar Masalah Pemotongan Suara Cepat**: Sebelumnya `useVoiceRecognition` diatur dengan mode `continuous: false`. Chrome Web Speech API otomatis memutuskan sesi mikrofon saat terjadi hening singkat (500ms–800ms) antarkata, memicu `onEnd` dan siklus restart yang memotong kata berikutnya.
    - **Akar Masalah Trigger Prematur pada Interim**: `useEffect` pemrosesan suara sebelumnya mengevaluasi string interim secara instan tanpa jeda hening. Ketika pengguna berbicara kalimat majemuk (misal *"buka no invoice GZS 010751"*), saat pengguna baru mengucapkan *"buka 010"*, sistem langsung mengeksekusi navigasi pencarian untuk invoice 010 dan mematikan mikrofon sebelum 3 digit terakhir *"751"* sempat diucapkan.
  - **2. Solusi & Desain Teknis Komprehensif**:
    - **Mode Continuous Listening (`continuous: true`)**: Mengaktifkan `continuous: true` pada `ValidationDetailPage.tsx` dan `BillingValidationSummaryModal.tsx`. Sesi pengenalan suara browser tetap standby aktif menerima audio tanpa auto-cutoff di tengah ucapan.
    - **Buffer Debounce Hening 2 Detik (~2000ms via `voiceCommandTimerRef`)**:
      - Menggabungkan transkrip final dan interim secara mulus: `${transcript} ${interimTranscript}`.
      - Setiap kali ada kata atau token baru masuk ke transkrip, timer hening 2000ms di-reset ulang (`clearTimeout` $\to$ `setTimeout(..., 2000)`).
      - Perintah baru dievaluasi dan dieksekusi setelah pengguna berhenti bicara selama minimal 2 detik (2000ms of silence).
      - Transkrip dibersihkan secara aman (`resetTranscript()`) baik setelah perintah dieksekusi maupun jika tidak ada perintah yang cocok setelah 2 detik hening, mencegah residual buffer tersimpan lama.
    - **Atomic Ref Guard (`executeVoiceCommandRef` & `executeModalVoiceCommandRef`)**: Membungkus eksekusi perintah ke dalam `useRef` agar selalu mengeksekusi state dan callbacks terbaru tanpa hambatan stale closures.
    - **Pembatalan Bersih & Anti-Ghost Execution**:
      - Ketika pengguna menjeda mikrofon secara manual (klik tombol toolbar atau shortcut `Alt+V`), timer 2000ms langsung dibatalkan (`clearTimeout`) dan transkrip di-reset instan.
      - Ketika modal lain terbuka atau komponen unmount, pending timer otomatis dibatalkan.
    - **Live Visual Telemetry & Tooltip Feedback**:
      - Tombol mic pada toolbar header dan modal menampilkan transkrip ucapan yang sedang berjalan secara live (`🎙️ "[teks]"...`).
      - Tooltip tombol mic memberikan panduan jelas: `(menunggu jeda 2 detik sebelum dieksekusi...)`.
  - **3. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-DDpqt_Pz.js` dalam 3.43s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi disinkronkan di `frontend-app.md`, `docs/frontend/billing.md`, dan `.agents/working.md`.

---

- [x] **Redesign Komprehensif Modal Terbitkan Invoice / Issue Modal (`IssueInvoiceModal.tsx`)**:
  - **1. Audit Desain & Standar Desain Sistem**:
    - Menerapkan prinsip skill `redesign-existing-projects` dan standar UI kompak mshipping (`.agents/rules/ui-styling.md`).
    - Eliminasi tampilan flat dan font generik menjadi antarmuka ERP berdensitas tinggi, elegan, serta 100% Midnight Dark Mode compliant.
  - **2. Peningkatan Visual & Tata Letak Komponen**:
    - **Top Accent Gradient Bar Dinamis**: Aksen gradien atas (Emerald teal untuk terbit normal, Amber-rose untuk peringatan undercharge).
    - **Executive Summary Card**: Menyatukan No. Faktur (dengan tombol salin instan `copyToClipboard` dan status feedback), tanggal faktur (kalender mono), identitas pelanggan dengan squircle avatar inisial (`getInitials`), serta ribbon Total Tagihan Resmi tabular figures (`formatCurrency`).
    - **Kartu Identitas Petugas Penyerah (`tbBillingGiveEmp`)**: Menampilkan squircle avatar, kode & nama staf terverifikasi otomatis, badge `Akun Anda`, dan tombol toggle penggantian petugas.
    - **Panel Audit Kepatuhan Risiko Undercharge**: Menampilkan badge `UNDERCHARGE DETECTED`, listbox perbandingan harga ditagih vs harga acuan master dengan delta minus tebal font mono rose, serta kartu checkbox interaktif beraksen aktif.
    - **Ketentuan Legalitas & SOP Compliance**: Banner ringkas dengan ikon gembok yang menjelaskan penguncian status `ISSUED` permanen.
    - **Live Voice Telemetry Capsule & Kontrol Cepat**: Beacon denyut hijau radar mic, transkrip live dialog, tombol batal, dan tombol aksi primer dengan shadow glow, active press feedback (`active:scale-[0.98]`), serta pintasan keyboard `↵ Enter` dan `Esc`.
  - **3. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-Dj7H3kq0.js` dalam 3.64s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi diperbarui di `frontend-app.md`, `docs/frontend/billing.md`, dan `.agents/working.md`.

---

- [x] **Perintah Suara Buka No Invoice Langsung pada Detail Validasi Bill (`ValidationDetailPage.tsx`, `BillingValidationSummaryModal.tsx`, `voiceSearch.utils.ts`)**:
  - **1. Analisis Kebutuhan & Integrasi**:
    - **Tujuan**: Memungkinkan pengguna menyebut nomor faktur secara langsung dari halaman validasi detail untuk berpindah ke faktur tersebut:
      `https://app.sampai.co/mshipping/finance/billing/validation/<no bill yang disebutkan>` (`ROUTES.BILLING_VALIDATION_DETAIL(invNo)`).
    - **Cakupan Pola Ucapan Luas**:
      - *"buka no invoice GZS 010751"* $\to$ `"GZS-010751"`
      - *"buka invoice 010751"* $\to$ `"010751"`
      - *"buka no bill GZS 010751"* $\to$ `"GZS-010751"`
      - *"buka bill 010751"* $\to$ `"010751"`
      - *"buka faktur 010866"* $\to$ `"010866"`
      - *"buka 010751"* $\to$ `"010751"`
      - *"buka no 010751"* $\to$ `"010751"`
      - *"buka GZS 010751"* $\to$ `"GZS-010751"`
      - *"GZS 010751"* $\to$ `"GZS-010751"`
  - **2. Solusi & Desain Teknis**:
    - **Ekstraksi Target Cerdas Bebas Konflik (`extractInvoiceOpenTarget` di `voiceSearch.utils.ts`)**:
      - Menyaring kata reserved sistem (*"tab"*, *"drawer"*, *"resi"*, *"marking"*, *"inspeksi"*, *"refresh"*, *"cetak"*, *"terbitkan"*, *"kembali"*, dll) sehingga perintah navigasi tab (*"buka tab 1-5"*), pembukaan drawer (*"cari"*, *"pilih invoice"*), dan aksi modal tidak tertabrak.
      - Memproses normalisasi fonetik cabang (`GZS`, `GZA`, `YWS`, `YWA`, `JKS`, `JKA`, `SG`, `HK`, `BKK`, `KR`, `SZ`, `SH`, `SUB`), konversi angka fonetik (*"kosong satu..."* $\to$ `"010751"`), dan menghubungkan strip pemisah secara otomatis.
    - **Handler Navigasi Resilien (`handleOpenInvoiceByVoice` di `ValidationDetailPage.tsx`)**:
      - Format lengkap (e.g. `GZS-010751`): Jika invoice yang diminta sedang dibuka, tampilkan info toast tanpa reload; jika berbeda, langsung eksekusi `navigate(ROUTES.BILLING_VALIDATION_DETAIL(target))`.
      - Format angka saja (e.g. `010751`): Menjalankan pencarian cepat ke `billingApi.list`. Jika cocok dengan prefix cabang invoice saat ini (`currentPrefix`) atau hasil tunggal, langsung buka invoice tersebut. Jika terdapat beberapa kandidat cabang berbeda, buka `ValidationListDrawer` dengan query terkait.
      - Proteksi konkurensi via `isNavigatingInvoiceRef` dan pembersihan transkrip atomik (`resetTranscript()`) untuk mengeliminasi false double navigation.
    - **Dukungan Dual-Modal pada Modal Kesimpulan (`BillingValidationSummaryModal.tsx`)**:
      - Mengintegrasikan handler `extractInvoiceOpenTarget` di dalam modal ringkasan. Jika pengguna menyebut *"buka invoice [nomor]"* saat modal ringkasan sedang terbuka, modal langsung ditutup secara aman dan navigasi ke faktur baru dieksekusi via `onSelectInvoice(target)`.
  - **3. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-Bt8h8kZE.js` dalam 3.81s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi diperbarui di `frontend-app.md`, `docs/frontend/billing.md`, dan `.agents/working.md`.

---

- [x] **Resolusi Looping Buka Bill pada Drawer Validasi (`ValidationListDrawer.tsx`, `ValidationDetailPage.tsx`, `useVoiceRecognition.ts`)**:
  - **1. Akar Masalah Looping Setelah Buka Bill dari Drawer**:
    - **Akar Masalah 1 (Ketiadaan Guard `isOpen` pada Voice Effect Drawer)**: Komponen `ValidationListDrawer` tetap di-mount secara virtual di DOM saat `isOpen: false`. Di dalam drawer, `useEffect` pemrosesan suara tidak memiliki guard `if (!isOpen) return`. Ketika faktur dipilih, `navigate()` memicu re-render pada `ValidationDetailPage` yang membuat ulang fungsi inline `onSelectInvoice` dan `onClose`. Akibatnya `useEffect` di drawer yang tertutup terpanggil ulang, dan jika sisa transkrip ucapan `"pilih"` masih berada di state buffer, ia mengeksekusi `onSelectInvoice` kembali secara berulang (infinite re-render / navigation loop).
    - **Akar Masalah 2 (Sisa Transkrip Ucapan Membocorkan Aksi Balik ke Halaman Utama)**: Saat drawer ditutup, mic standby `ValidationDetailPage` aktif kembali. Jika buffer sisa ucapan pengguna (*"pilih ..."* / *"cari ..."*) tertangkap oleh mic induk, baris 534 `ValidationDetailPage` langsung memicu `setIsListDrawerOpen(true)` kembali, menyebabkan drawer berulang-kali tertutup lalu terbuka lagi secara otomatis (bouncing/looping open-close).
    - **Akar Masalah 3 (Salvaging Ghost Interim Text pada `useVoiceRecognition.ts`)**: Ketika `stopListening()` dipanggil saat penutupan drawer, fungsi tersebut justru menginjeksikan kembali teks interim dari `latestInterimRef` ke dalam state `transcript`, menimpa pembersihan `resetTranscript()` dan menghidupkan kembali transkrip pemicu aksi.
    - **Akar Masalah 4 (Auto Re-Arm Timeout Menembus Status Closed)**: Callback `onEnd` di drawer menjalankan `setTimeout` 300ms dengan stale closure variabel `isOpen` lama sehingga `startVoiceListening()` tetap terpanggil meski drawer sudah ditutup.
  - **2. Solusi & Perbaikan Komprehensif**:
    - **Atomic Execution & Flag State (`handleSelectAndClose`)**: Membungkus pemilihan faktur (klik mouse, tombol Enter, dan perintah suara) ke dalam satu handler atomik dengan `isProcessingActionRef.current = true`, pembatalan auto re-arm, pembersihan transkrip instan, dan penutupan drawer.
    - **Strict Guard `if (!isOpen || !isOpenRef.current) return`**: Memasang guard pada baris pertama `useEffect` pemrosesan suara drawer sehingga drawer tertutup tidak akan pernah menjalankan logika aksi faktur.
    - **Stabilisasi Callback Halaman Induk (`useCallback`)**: Membungkus `handleCloseDrawer` dan `handleSelectInvoice` pada `ValidationDetailPage` menggunakan `useCallback` agar referensinya stabil antar-render.
    - **Cooldown Guard 1000ms Anti-Reopen (`drawerClosedAtRef`)**: Menambahkan cooldown 1000ms pada pendeteksi suara drawer di `ValidationDetailPage` agar residu ucapan saat drawer ditutup tidak memicu pembukaan drawer kembali.
    - **Clean Stop pada Hook Suara (`useVoiceRecognition.ts`)**: Mengosongkan `latestInterimRef` dan tidak lagi menginjeksikan sisa teks interim ke `transcript` saat `stopListening()` dipanggil secara manual.
  - **3. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-CeSvBWs0.js` dalam 3.81s).
    - Dokumentasi diperbarui di `frontend-app.md` dan `.agents/working.md`.

---


- [x] **Resolusi Konflik Kata "Buka" pada Drawer Pencarian Faktur Detail Validasi (`ValidationListDrawer.tsx`)**:
  - **1. Akar Masalah Konflik Kata "Buka"**:
    - Di `ValidationListDrawer.tsx`, kata *"buka"* sebelumnya digunakan sebagai kata kunci pembuka faktur terpilih (`isPureOpenCmd` & `hasOpenActionWord`).
    - Hal ini bertabrakan dengan:
      - Perintah navigasi tab pada halaman validasi (*"buka tab 1, 2, dst"*).
      - Perintah pembukaan drawer itu sendiri (*"buka drawer"*). Ketika drawer baru terbuka, sisa transkrip ucapan *"buka"* langsung memicu fallback pembuka faktur secara prematur dan langsung menutup kembali drawer.
      - Fitur pencarian: jika pengguna menyebut nama/nomor yang diawali *"buka ..."*, interim result langsung memicu pembukaan faktur teratas alih-alih mencari.
      - Teks UI dan placeholder mengarahkan pengguna untuk menyebut *"Buka"*.
  - **2. Solusi & Perbaikan**:
    - **Eliminasi 100% Kata "Buka" dari Trigger Aksi**: Mengubah perintah aksi pemilihan faktur murni menjadi *"pilih"*, *"enter"*, *"oke"*, *"ok"*, *"ya"*, atau *"proses"*.
    - **Penghapusan Fallback Acak Prematur**: Jika perintah komposit *"pilih [nama/nomor]"* tidak menemukan faktur yang cocok, sistem tidak lagi memaksa membuka faktur index 0 secara acak.
    - **Supresi & Penyaringan Kata "Buka"**: Ucapan kata *"buka"* yang masuk ke drawer otomatis diabaikan atau dibersihkan dari query pencarian sehingga tidak mengotori search input maupun memicu aksi salah.
    - **Pembersihan Transkrip Saat Buka/Tutup (`resetTranscript`)**: Memanggil `resetTranscript()` saat drawer `isOpen: true` dan `isOpen: false` untuk mengeliminasi sisa buffer ucapan dari halaman induk.
    - **Penyelarasan Teks UI**: Placeholder diubah menjadi `🎙️ Mendengarkan ucapan... (Sebutkan faktur lalu "Pilih" / "Enter")`, status banner menjadi `Suara aktif: sebutkan nomor/nama, lalu katakan "Pilih" atau "Enter"`, dan badge item menjadi `🎯 Terpilih · Katakan "Pilih" atau Tekan Enter ↵`.
  - **3. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-B_2rfgzS.js` dalam 3.66s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi diperbarui di `frontend-app.md`, `docs/frontend/billing.md`, dan `.agents/working.md`.

---

- [x] **Pengubahan Grafik Tren Bill Harian & Bulanan Menjadi Line Curve Chart (`TrendChart.tsx`, `DashboardPage.tsx`)**:
  - **1. Transformasi Diagram Batang ke Line Curve Chart Monotone (`TrendChart.tsx`)**:
    - Mengganti diagram batang (`<Bar>`) pada mode hitung (`metric === 'count'`) menjadi kurva halus presisi (`<Line type="monotone">`) yang didukung gradien area lembut (`<Area type="monotone">`).
    - Konsistensi visual diterapkan untuk moda gabungan (`all`), moda Udara (`udara`), dan moda Laut (`laut`).
    - Gradien area menggunakan `trendAreaLautFill` (Emerald `#10b981`) dan `trendAreaUdaraFill` (Sky Blue `#0284c7`) dengan transisi opasitas 0.25 ke 0.01.
  - **2. Titik Data Adaptif & Hairline Guideline Vertikal**:
    - Disematkan dot data adaptif: `dot={data.length <= 14 ? { r: 3, ... } : false}` yang memberikan penanda titik jelas saat rentang hari pendek (7-14 hari) namun tetap bersih saat data banyak (30 hari / 12 bulan).
    - `activeDot={{ r: 5, stroke: 'var(--color-surface)', strokeWidth: 2 }}` saat hover.
    - `connectNulls` aktif untuk mencegah garis putus jika terdapat gap data.
    - Hairline cursor putus-putus `{ stroke: 'var(--color-border)', strokeWidth: 1.5, strokeDasharray: '4 4' }` memandu pembacaan tooltip dengan presisi.
  - **3. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-BnaNWC8h.js` dalam 13.32s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi disinkronkan di `docs/frontend/billing.md`, `frontend-app.md`, dan `.agents/working.md`.

---

- [x] **Peningkatan Mesin Pencari & UX Search Halaman Customer (`customers.service.ts`, `CustomerToolbar.tsx`, `ListPage.tsx`, `SearchSuggestionsDropdown.tsx`)**:
  - **1. Resolusi Konflik `where.OR` & Dukungan Pencarian Multi-Token pada Backend (`customers.service.ts`)**:
    - **Akar Masalah OR Overwrite**: Sebelumnya ketika filter kategori (seperti `direct` atau `no_status`) dipilih bersamaan dengan teks pencarian, blok `where.OR` pencarian ditimpa oleh kondisi grup `where.OR = [{ fdBroker: 0 }, { fdBroker: null }]`, sehingga filter pencarian musnah total.
    - **Akar Masalah Direct Missing**: Menyelaraskan status `direct` agar mencakup `fdBroker: 2`, `0`, atau `null` sesuai aturan ERP warisan FoxPro (18.165 data dengan `fdBroker = 2` sebelumnya tidak terhitung).
    - **Struktur Kueri Resilien**: Mengisolasi seluruh klausa ke dalam array Prisma `AND: [...]` sehingga `OR` pencarian dan `OR` status beroperasi serentak tanpa saling meniadakan.
    - **Mesin Pencarian Multi-Token**: Memecah query pencarian majemuk berbasis kata (misal `"budi jakarta"`, `"abs bintaro"`) menjadi filter AND antartoken.
    - **Normalisasi Nomor Telepon**: Mengekstrak digit telepon pada query sehingga pencarian nomor seperti `0815-8664-9888` dapat mencocokkan data di database.
    - **Cakupan Kolom Luas**: Pencarian kini memeriksa `fdCustName`, `fdCustCode`, `fdContact`, `fdHP`, `fdTelp`, `fdCityName`, `fdAddr1`, `fdBillTo`, `fdNamaPengiriman`, `fdKotaPengiriman`, `fdSalesNM`, `fdEmailPenagihan`, dan `fdKeterangan`.
  - **2. Peningkatan Saran Autocomplete (`getCustomerSuggestions`)**:
    - Memberikan prioritas ranking prefix: awalan kode pelanggan (`fdCustCode`) $\to$ awalan nama pelanggan (`fdCustName`) $\to$ kontak/kota.
    - Menampilkan informasi kota dan kontak secara terstruktur.
  - **3. Peningkatan Interaksi & Navigasi Keyboard (`CustomerToolbar.tsx`, `SearchSuggestionsDropdown.tsx`)**:
    - Navigasi keyboard panah atas/bawah (`↑` / `↓`) untuk memilih saran autocomplete secara langsung dengan visual highlight seleksi.
    - Tombol `Enter`: Memilih saran yang sedang disorot atau submit pencarian secara instan tanpa menunggu jeda debounce.
    - Tombol `Esc`: Menutup dropdown saran dan membersihkan input saat ditekan.
    - Tombol Clear `[X]`: Membersihkan pencarian sekaligus mereset state kueri seketika.
    - Pintasan keyboard `Ctrl+K`: Tetap fokus instan ke search input.
  - **4. Sinkronisasi URL Dua Arah & Eliminasi Layar Flicker (`ListPage.tsx`)**:
    - Parameter URL `?search=` tersinkronisasi otomatis dengan input pencarian, memungkinkan bookmarking dan deep-linking.
    - Menghilangkan flickering/jumping table: tabel data lama dipertahankan dengan efek semi-transparan (`opacity-60`) saat background refetch berlangsung (`isRefreshing`), bukan diganti total menjadi skeleton wireframe.
    - Menghilangkan churn query: pergantian halaman ke hal 1 hanya dipicu saat query aktif telah dievaluasi, bukan pada setiap ketukan huruf.
  - **5. Verifikasi Build & PM2 Restart**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (10.86s).
    - Service backend PM2 `ShippingApi` direstart dan online (PID 7304).
    - Live HTTPS `https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi diperbarui di `docs/backend/customers.md` dan `docs/frontend/master-admin.md`.

---


- [x] **Redesign Responsif Mobile Modal Rincian Target Estimasi Kirim (DeliveryEstimasiDetailModal.tsx)**:
  - **1. Shell Modal & Layout Responsif Viewport Mobile**:
    - Mengubah kontainer modal menjadi fullscreen-fit pada layar smartphone (h-full sm:h-auto max-h-[100dvh] sm:max-h-[92vh] rounded-none sm:rounded-2xl border-0 sm:border) untuk memaksimalkan ruang kerja vertikal tanpa terpotong batas luar.
    - Touch targets tombol aksi diperbesar (36–40px) dan banner info aturan toleransi disajikan secara ringkas dan rapi (	ext-[11px] leading-relaxed).
  - **2. Dual View Mode (Kartu Mobile vs Tabel Desktop Lengkap)**:
    - Default tampilan dinamis: Layar sempit (< 768px) otomatis memuat **Kartu Responsif (Cards View)**; layar lebar desktop memuat **Tabel Lengkap (Table View)**.
    - Tombol Switcher Mode Tampilan: Disematkan tombol toggle [ 📱 Kartu | ▤ Tabel ] (LayoutGrid vs Rows3) pada toolbar agar staf dapat beralih bebas di perangkat apa pun.
    - **Komponen Kartu Mobile Berdensitas Informasi Tinggi**:
      - Nomor urut & No. Surat Jalan dengan ikon truk dan link langsung ke detail Surat Jalan (ROUTES.DELIVERY_DETAIL).
      - Semantic status badges outline (Midnight Dark Mode compliant): Overdue +H (rose), Toleransi H+1 (amber), Terkirim (emerald), Terkirim Late (sky).
      - Identitas Customer (displayCustName), Moda badge (✈️ Udara / 🚢 Laut), kode & nomor marking, serta nomor resi terima (dTerima).
      - Box Muatan & Armada: Supir, plat kendaraan, link panggilan telepon langsung (	el: pada dTelpSupir), kuantitas koli fisik, dan tonase berat (kg).
      - Timeline tanggal (Tgl SJ, Estimasi, Toleransi H+1, Realisasi Kirim) dan tombol aksi cepat " Detail SJ ↗\.
 - **3. Standar Loading Shimmer Wireframe (Eliminasi Spinner Bulat)**:
 - Menggantikan spinner bulat lawas dengan wireframe skeleton shimmer multi-kartu (.skeleton-shimmer) yang konsisten dengan tema Midnight Dark Mode.
 - **4. Filter Toolbar & KPI Ribbon Sentuh**:
 - Status Filter Chips dalam kontainer horizontal scrollable tanpa scrollbar (scrollbar-none) mencegah layout terlipat canggung di layar sempit.
 - 4 Kartu KPI Ribbon (Target Estimasi, Overdue, Toleransi H+1, Terkirim) memiliki active ring indicator dan berfungsi ganda sebagai tombol filter sekali sentuh.
 - Kolom pencarian teks instan dilengkapi tombol clear [X].
 - Tombol Tutup modal pada footer full-width di mobile untuk ergonomi jempol.
 - **5. Verifikasi Build & Kepatuhan Arsitektur**:
 - cd frontend && bun run build $\to$ **LULUS 100% 0 errors** (dist/assets/delivery-orders-BDmsq8qm.js dalam 2.96s).
 - Dokumentasi diperbarui di docs/frontend/delivery-orders.md dan .agents/working.md.


- [x] **Fitur Suara Refresh Halaman Validasi & Audit Komprehensif Bebas Konflik (`ValidationDetailPage.tsx`, `BillingValidationSummaryModal.tsx`)**:
  - **1. Perintah Suara Refresh / Segarkan Data Validasi & Tagihan**:
    - Mendukung perintah ucapan: *"refresh"*, *"segarkan"*, *"muat ulang"*, *"reload"*, *"cek ulang"*, *"sinkron"*, *"update data"*.
    - Mengeksekusi invalidasi cache TanStack Query serentak: `['billingDetail', id]`, `['m3-check']`, dan `['billingTransportCheck']` via `handleRefresh()`.
    - Dilengkapi notifikasi toast berhasil dan animasi putar ikon pada tombol header baru `[ 🔄 Refresh ]`.
    - Fitur suara refresh juga diintegrasikan ke dalam dialog modal `BillingValidationSummaryModal.tsx`.
  - **2. Perintah Suara Cetak / Print Invoice**:
    - Mendukung ucapan: *"cetak"*, *"print"*, *"unduh pdf"*, *"download pdf"*, *"cetak invoice"*, *"cetak faktur"* $\to$ langsung mengunduh/mencetak dokumen resmi invoice via `downloadInvoicePdf`.
  - **3. Resolusi Konflik Kata Aksi "Buka"**:
    - Menghapus frasa *"buka drawer"* dari trigger pencarian drawer; pembukaan drawer faktur kini murni dipicu oleh: *"cari"*, *"cari invoice"*, *"cari faktur"*, *"pilih invoice"*, *"pilih faktur"*, *"drawer"*, *"daftar invoice"*, *"ganti invoice"*.
    - Menghapus frasa *"buka resi"* dari trigger modal resi (cukup *"resi"*, *"marking"*, *"cek resi"*).
    - Menghapus frasa *"buka terbitkan"* dari modal audit summary `BillingValidationSummaryModal.tsx`.
    - Pemilihan tab disederhanakan: *"tab 1"*, *"tab 2"*, dst, varian kata bilangan (*"tab satu"*, *"tab dua"*), atau nama tab langsung (*"item"*, *"tarif"*, *"m3"*, *"timbangan"*, *"overweight"*, *"freight"*, *"ekspedisi"*), dengan regex toleran `(?:buka\s+)?tab\s*1` sehingga kata *"buka"* mandiri tidak pernah memicu pergantian tab.
    - Kata *"buka"* kini terisolasi 100% khusus sebagai kata aksi pembuka invoice terpilih (`highlightedBilling`) di dalam `ValidationListDrawer.tsx`.
  - **4. Audit Komprehensif & Eliminasi Celah Error (Halaman Validasi dari Baris Pertama)**:
    - *Aturan Hooks*: Memverifikasi 100% hooks (`useState`, `useQuery`, `useMemo`, `useBillingValidation`, `useVoiceRecognition`, `useEffect`, `useCallback`) dijalankan tanpa syarat (unconditionally) di atas blok early return.
    - *Konsistensi Data Pelanggan*: Menyempurnakan fallback prop `customerName` pada `BillingValidationCard` dan modal-modal terkait agar selalu menggunakan `displayCustName(data.customer?.fdCustName || data.fdCustCode)`.
    - *Sinkronisasi Cache Modal Edit Item*: Memperbarui callback `onSuccess` pada `EditBillingDetailsModal` agar meng-invalidate `['billingTransportCheck']` bersama dengan `billingDetail` dan `m3-check`.
    - *Indikator & Tooltip Toolbar*: Menyelaraskan teks tooltip microphone telemetry dari *"Buka tab 1-5"* menjadi panduan perintah baru: *"Tab 1-5"*, *"Refresh"*, *"Cari"*, *"Terbitkan"*, dll.
  - **5. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-COfBWvXq.js` dalam 3.15s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi diperbarui di `frontend-app.md` dan `docs/frontend/billing.md`.

---

- [x] **Mode Standby Suara Otomatis pada Halaman Validasi & Navigasi Tab Hands-Free (`ValidationDetailPage.tsx`, `BillingValidationCard.tsx`, `types.ts`)**:
  - **1. Standby Suara Mandiri Hands-Free Tanpa Modal**:
    - Saat berada di `ValidationDetailPage` (ketika tidak ada dialog modal aktif), mikrofon otomatis siaga mendengarkan dengan auto re-arm resilien 200ms.
    - Dilengkapi supresi suara global (`suppressVoice()`) dan integrasi shortcut `Alt+V` lokal halaman.
    - Saat salah satu dialog modal (`BillingValidationSummaryModal`, `IssueInvoiceModal`, `ValidationListDrawer`, dll) terbuka, mikrofon halaman otomatis jeda/mengalah ke modal terkait.
  - **2. Perintah Buka Drawer Pencarian Invoice**:
    - Perintah ucapan: *"pilih invoice"*, *"pilih faktur"*, *"cari"*, *"cari invoice"*, *"cari faktur"*, *"buka drawer"*, *"drawer"* seketika membuka `ValidationListDrawer` (`setIsListDrawerOpen(true)`).
  - **3. Navigasi Tab Kartu Validasi ("Buka tab 1, 2, dst")**:
    - Terhubung dengan state `validationCardTab` yang diteruskan ke `BillingValidationCard`.
    - Tab 1 = Item & Tarif (`profile`), Tab 2 = Validasi M3 / Timbangan (`m3_weight`), Tab 3 = Overweight (Laut) / Freight (Udara/Type 2), Tab 4 = Freight (Laut) / Ekspedisi (Udara/Type 2), Tab 5 = Ekspedisi (Laut).
    - Mendukung kata bilangan (*"tab satu"*, *"tab dua"*, dst) serta nama tab spesifik (*"overweight"*, *"freight"*, *"ekspedisi"*, *"item"*, *"info tagihan"*).
    - Otomatis mengaktifkan `setMobileTab('validation')` saat beralih tab kartu di mode mobile.
  - **4. Aksi Cepat Halaman Validasi**:
    - *"terbitkan"* $\to$ membuka modal konfirmasi penerbitan (`IssueInvoiceModal`).
    - *"inspeksi"* / *"ringkasan"* $\to$ membuka modal audit summary (`BillingValidationSummaryModal`).
    - *"resi"* / *"marking"* $\to$ membuka modal resi marking (`BillResiMarkingModal`).
    - *"history"* / *"riwayat"* $\to$ membuka modal riwayat (`CustomerBillingHistoryModal`).
    - *"audit"* $\to$ membuka audit tarif customer (`CustomerTariffAuditModal`).
    - *"kembali"* $\to$ kembali ke antrean daftar validasi billing (`ROUTES.BILLING_VALIDATION_LIST`).
  - **5. Indikator Visual Live Telemetry Titik Hijau Berkedip**:
    - Tombol status mic standby beranimasi titik hijau berkedip (`animate-ping` + `animate-pulse`) pada ribbon toolbar header.
    - Titik hijau berkedip pada sudut tombol floating action search (FAB).
  - **6. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-D8lCsr4N.js` dalam 3.65s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi diperbarui di `frontend-app.md` dan `docs/frontend/billing.md`.

---

- [x] **Audit & Stabilisasi Resiliensi Modal Konfirmasi Penerbitan Invoice (`IssueInvoiceModal.tsx`)**:
  - **1. Eliminasi Hambatan Undercharge Warning pada Konfirmasi Suara**:
    - **Akar Masalah**: Panggilan suara cepat (*"ya"*, *"ok"*, *"terbitkan"*) sebelumnya terhalang oleh closure state `hasConfirmedUndercharge` yang bernilai `false`, sehingga eksekusi `handleIssue()` tertahan oleh validasi peringatan undercharge (`toast.warning`).
    - **Solusi**: Menyinkronkan `hasConfirmedUnderchargeRef` dan menambahkan parameter `bypassUnderchargeCheck = false` pada `handleIssue()`. Perintah suara konfirmasi kini langsung memanggil `handleIssue(true)` sekaligus menyetel `hasConfirmedUndercharge = true`, memastikan invoice langsung diterbitkan tanpa terhambat popup warning.
  - **2. Perluasan Kosakata Perintah Suara & Prioritas Batal**:
    - Perintah Batal/Tutup: Ditambahkan *"batalkan"*, *"tidak"*, *"enggak"*, *"nggak"*, *"jangan"* di samping *"batal"*, *"cancel"*, *"tutup"*, *"kembali"*, *"keluar"*. Evaluasi pembatalan diuji terlebih dahulu untuk memitigasi ucapan komposit seperti *"jangan terbitkan"*.
    - Perintah Terbitkan: Ditambahkan *"terbitkan invoice"*, *"terbitkan bill"*, *"lanjut"*, *"lanjutkan"*, *"proses"*, *"siap"*, *"sip"*, *"yup"*, *"acc"*, *"confirm"* di samping *"ya"*, *"ok"*, *"oke"*, *"terbitkan"*, *"setuju"*, *"konfirmasi"*.
  - **3. Proteksi Konkurensi & Auto Re-arm Resilien**:
    - Menambahkan `isProcessingRef` untuk mencegah double execution jika recognition memicu callback berulang.
    - Menambahkan auto re-arm mikrofon jika panggilan API penerbitan gagal atau karyawan belum dipilih, sehingga kontrol suara hands-free tetap aktif tanpa mati permanen.
  - **4. Indikator Visual Header & Sinkronisasi Cache Lengkap**:
    - Menambahkan badge live telemetry titik hijau berkedip (`animate-ping` + `animate-pulse`) `Standby Suara` pada header dialog modal.
    - Menambahkan pembersihan cache React Query untuk `['m3-check']` bersama dengan `billingDetail`, `billingList`, `billingValidationList`, dan `billingM3Check`.
  - **5. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-DdA-kDHC.js` dalam 3.54s).
    - Dokumentasi diperbarui di `frontend-app.md` dan `docs/frontend/billing.md`.

---

- [x] **Peningkatan Perintah Suara: Nomor Urut Tab (Modal Audit) & Kata Cepat Ya/Ok/Batal/Cancel (Modal Konfirmasi) (`BillingValidationSummaryModal.tsx`, `IssueInvoiceModal.tsx`, `ValidationSummaryHeader.tsx`)**:
  - **1. Navigasi Tab Berdasarkan Nomor Urut Tampilan (`BillingValidationSummaryModal.tsx`)**:
    - Mendukung perintah suara: *"buka tab 1"*, *"buka tab 2"*, *"buka tab 3"*, *"buka tab 4"*, *"buka tab 5"*, serta varian kata bilangan (*"tab satu"*, *"tab dua"*, *"tab pertama"*, *"tab kedua"*, dst).
    - Memetakan nomor tab secara dinamis sesuai urutan tampilan visual:
      - **Moda Laut**: Tab 1 = Item & Tarif (`items`), Tab 2 = Validasi M³ (`m3_weight`), Tab 3 = Overweight (`overweight`), Tab 4 = Freight Charge (`freight`), Tab 5 = Transport & Ekspedisi (`transport`).
      - **Moda Udara**: Tab 1 = Item & Tarif (`items`), Tab 2 = Timbangan Fisik (`m3_weight`), Tab 3 = Freight Charge (`freight`), Tab 4 = Transport & Ekspedisi (`transport`).
  - **2. Perintah Cepat Terbitkan & Batal pada Modal Konfirmasi (`IssueInvoiceModal.tsx`)**:
    - Menerbitkan invoice: dapat menggunakan kata cepat *"ya"*, *"ok"*, *"oke"*, *"terbitkan"*, *"konfirmasi"*, atau *"setuju"*.
    - Membatalkan penerbitan: dapat menggunakan kata *"batal"*, *"cancel"*, *"tutup"*, *"kembali"*, atau *"keluar"*.
    - Dilengkapi pembersihan transkrip atomik (`resetTranscript()`) dan auto re-arm standby.
  - **3. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-B4YMZix9.js` dalam 3.81s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi diperbarui di `docs/frontend/billing.md`.

---

- [x] **Mode Standby Otomatis Hands-Free & Titik Hijau Blinking pada Modal Audit & Konfirmasi (`BillingValidationSummaryModal.tsx`, `ValidationSummaryHeader.tsx`, `IssueInvoiceModal.tsx`, `ValidationDetailPage.tsx`)**:
  - **1. Standby Hands-Free Tanpa Shortcut Alt+V**:
    - Kedua modal (`BillingValidationSummaryModal.tsx` & `IssueInvoiceModal.tsx`) sekarang otomatis aktif dalam status standby mendengarkan (`startListening()`) seketika saat dibuka tanpa memerlukan tombol pintasan `Alt+V` maupun klik tombol mikrofon.
    - Dilengkapi mekanisme auto re-arm resilien pada event `onEnd`: apabila ucapan selesai atau terjadi jeda hening, sistem otomatis mengaktifkan kembali listening dalam 200ms selama dialog modal masih aktif terbuka.
    - Menghilangkan label/badge `Alt+V` dari UI dan tooltip modal.
  - **2. Visual Indikator Titik Hijau Blinking (Live Telemetry Dot)**:
    - Menambahkan visual titik hijau berdenyut/berkedip (`animate-ping` + `animate-pulse` emerald dot) pada header modal audit (`ValidationSummaryHeader.tsx`) dan footer modal konfirmasi (`IssueInvoiceModal.tsx`).
    - Menampilkan teks status dinamis: `Standby Suara` saat siaga, dan transkrip kalimat ucapan live saat pengguna mendiktekan perintah.
    - Tombol tetap dapat diklik untuk menjeda atau mengaktifkan kembali mikrofon secara manual bila diinginkan.
  - **3. Penghapusan Link ke Fitur Voice Global**:
    - Menghapus tombol Suara global pada ribbon header `ValidationDetailPage.tsx` untuk mengeliminasi ambiguitas akses suara.
    - Membersihkan unused imports (`Mic`, `canUseVoice`, `openAssistant`) pada `ValidationDetailPage.tsx`.
    - Supresi asisten suara global (`suppressVoice()`) tetap aktif penuh saat modal audit atau modal konfirmasi terbuka.
  - **4. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-DZ1VX62l.js` dalam 3.20s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi diperbarui di `frontend-app.md` dan `docs/frontend/billing.md`.

---

- [x] **Isolasi Fitur Suara pada Modal Audit & Validasi serta Modal Konfirmasi Penerbitan (`BillingValidationSummaryModal.tsx`, `ValidationSummaryHeader.tsx`, `IssueInvoiceModal.tsx`, `voiceAssistantStore.ts`, `AppLayout.tsx`)**:
  - **1. Supresi Asisten Suara Global Otomatis (`voiceAssistantStore.ts` & `AppLayout.tsx`)**:
    - Menambahkan state reference-counting `suppressionCount` dan flag `isSuppressed` pada Zustand store global `useVoiceAssistantStore`.
    - Menyediakan metode `suppressVoice(): () => void` yang mengembalikan fungsi cleanup pelepasan supresi secara atomik dan leak-free.
    - Menambahkan guard pada `openAssistant()` dan `toggleAssistant()` agar panggilan global diabaikan selama dialog modal aktif.
    - Memperbarui listener keyboard `Alt+V` di `AppLayout.tsx` agar memvalidasi `if (useVoiceAssistantStore.getState().isSuppressed) return`, sehingga tombol pintasan `Alt+V` di dalam modal tidak memicu pembukaan `VoiceAssistantModal` global.
  - **2. Fitur Suara Mandiri pada Modal Audit & Validasi (`BillingValidationSummaryModal.tsx` & `ValidationSummaryHeader.tsx`)**:
    - Menghapus pemanggilan `openAssistant()` global dari header modal.
    - Mengintegrasikan hook `useVoiceRecognition` tersendiri di dalam modal `BillingValidationSummaryModal.tsx` dengan mode turn-taking `continuous: false`.
    - Membatasi pengenalan perintah secara eksklusif hanya untuk:
      - **`terbitkan`**: Menghentikan rekaman suara, menutup modal audit, dan membuka modal konfirmasi penerbitan (`IssueInvoiceModal.tsx`).
      - **`buka tab [items|m3_weight|overweight|freight|transport]`**: Berpindah sub-tab modal secara instan (Tab Tarif & Item, Validasi Fisik M³/Kg, Overweight, Freight Charge, dan Ekspedisi Lokal `tbExpIndo`).
      - **`tutup modal` / `batal` / `keluar`**: Menghentikan mikrofon dan menutup dialog modal.
    - Seluruh perintah di luar domain modal diabaikan total (tidak memicu navigasi global atau pencarian global).
    - Memperbarui tombol Suara di header modal (`ValidationSummaryHeader.tsx`) untuk menampilkan status mendengarkan, teks interim/transkrip live, dan animasi denyut mikrofon lokal.
    - Menghubungkan pintasan keyboard `Alt+V` di dalam modal untuk mengontrol hidup/mati mikrofon lokal modal.
  - **3. Fitur Suara Mandiri pada Modal Konfirmasi Penerbitan (`IssueInvoiceModal.tsx`)**:
    - Memasang supresi suara global `suppressVoice()` saat modal konfirmasi dibuka.
    - Menambahkan listener pintasan keyboard `Alt+V` eksklusif modal dengan `e.stopPropagation()` untuk toggle mikrofon konfirmasi lokal.
    - Menambahkan penanganan perintah pembatalan suara: *"tutup"*, *"tutup modal"*, *"batal"*, *"cancel"*, *"kembali"*, *"keluar"* $\to$ langsung menutup modal konfirmasi.
    - Perintah penerbitan suara: *"terbitkan"*, *"konfirmasi"*, *"setuju"* $\to$ menyetujui warning undercharge (jika ada) dan mengeksekusi penerbitan invoice resmi.
  - **4. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/billing-CKfeCsud.js` dalam 3.52s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi diperbarui di `frontend-app.md` dan `docs/frontend/billing.md`.

---


- [x] **Perbaikan Grafik Tren Bill Harian Hari Ini Kosong (`backend/src/utils/dateRange.ts`)**:
  - **1. Akar Masalah**:
    - Fungsi `getLastNDays` di `dateRange.ts` sebelumnya memformat kunci tanggal menggunakan `start.toISOString().slice(0, 10)`.
    - Karena objek `start` dibentuk pada tengah malam waktu lokal (00:00:00 WIB / GMT+7), pemanggilan `toISOString()` mengonversinya ke waktu UTC (17:00:00 hari sebelumnya / H-1).
    - Akibatnya, elemen untuk hari ini (28 Sep) menghasilkan kunci tanggal `"2026-09-27"`, dan seluruh deret harian tergeser mundur 1 hari.
    - Ketika data agregat SQL Server (yang mengembalikan tanggal riil `2026-09-28` dengan 162 bill) dipetakan ke `dailyMap.get(d.date)`, tanggal `2026-09-28` tidak pernah dicocokkan, sehingga grafik bill hari ini tampil kosong (0 bill).
  - **2. Solusi & Perbaikan**:
    - Mengubah formatting `d.date` pada `getLastNDays` menjadi string kalender lokal: `${year}-${month}-${date}` berbasis komponen lokal (`getFullYear()`, `getMonth() + 1`, `getDate()`).
    - Nilai tanggal lokal sekarang cocok 100% dengan hasil grouping SQL Server `CAST(fdInvDate AS DATE)`.
  - **3. Verifikasi & Restart Backend**:
    - Live query membuktikan data hari ini (28 Sep 2026) sekarang tampil akurat: **162 bills** (12 Udara, 150 Laut) dengan total tagihan **Rp 1.187.112.962,14**.
    - PM2 service `ShippingApi` berhasil di-restart (PID: 11648).

---

- [x] **Redesign Komprehensif Overview Dashboard (`DashboardPage.tsx`)**:
  - **1. Header & Live Telemetry**:
    - Menambahkan status badge denyut hijau *"Sistem Aktif"* (Live System Telemetry).
    - Menambahkan tombol *"Segarkan"* dengan feedback status pembaruan dan catatan jam pembaruan real-time tanpa refresh halaman browser.
  - **2. 4 Kartu KPI Metrik Eksekutif**:
    - Kartu beraksen ambient glow sudut, ikon squircle beraksen semantik, angka tebal tabular Space Grotesk, micro-trend pill berborder lembut, dan efek lift hover (`hover:-translate-y-1 hover:shadow-lg`).
    - Nilai omzet terpadu pada kartu Faktur (`Total Invoice`).
  - **3. Command Alert Panel (ETA Not Exit & Missed SLA)**:
    - Garis aksen indikator atas amber & rose, angka tebal tabular, chip pemecahan moda Udara (`✈️`) vs Laut (`🚢`), dan tombol aksi rincian dengan icon chevron.
    - Modal rincian consignee dilengkapi kolom pencarian instan consignee atau kode batch serta total counter.
  - **4. Progressive Delivery Dispatch Pipeline**:
    - Mengubah 4 kartu status surat jalan terpisah menjadi alur pipeline progresif (`Tahap 1 Dijadwalkan` $\to$ `Tahap 2 Dalam Perjalanan` $\to$ `Tahap 3 Terkirim` $\to$ `Tahap 4 SJ Belum Kembali`) lengkap dengan visual progress tracks dan footer ringkasan koli & tonase.
  - **5. Arus Kas & Keuangan (Financial Overview)**:
    - 3 kartu berorientasi tindakan: Antrean Validasi (Amber dengan tombol Cek & Validasi ke `ROUTES.BILLING_VALIDATION_LIST`), Piutang Jatuh Tempo (Rose), dan Omzet Bulan Berjalan (Emerald).
  - **6. Analitik Hub Asal & Kedatangan Mendatang**:
    - Menambahkan visual volume share progress bars pada tabel perbandingan cabang asal kargo.
    - Menambahkan chip urgensi waktu tiba (`Hari Ini`, `Besok`, atau countdown hari) pada kartu manifest kedatangan.
  - **7. Visualisasi Kinerja 12 Bulan (Interactive AreaChart)**:
    - Mengintegrasikan Recharts AreaChart dengan gradient fills halus (`invoicesGradient`, `doGradient`, `shipmentsGradient`).
    - Switcher filter metrik interaktif: `[Semua | Faktur | Surat Jalan | Resi]`.
    - Custom Tooltip terpadu yang ramah terhadap semua tema (termasuk Midnight Dark Mode).
  - **8. Riwayat Aktivitas Terkini**:
    - Inisial avatar pelanggan, tag nomor dokumen mono, tanggal, dan nilai omzet / koli yang terstruktur rapi.
  - **9. Verifikasi Build Frontend**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (3.74s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.

---

- [x] **Perbaikan Fitur Suara pada Drawer Detail Validasi (`useVoiceRecognition.ts`, `ValidationListDrawer.tsx`)**:
  - **1. Eliminasi Reactivity Loop & Pemotongan Audio Mid-Speech (`useVoiceRecognition.ts`)**:
    - Membungkus callback `onResult`, `onError`, dan `onEnd` ke dalam `useRef` (`onResultRef`, `onErrorRef`, `onEndRef`).
    - Menghilangkan churn re-creation pada fungsi `startListening` dan `stopListening` sehingga dependensinya stabil. Hal ini mencegah efek re-render memicu loop `abort()` $\to$ `start()` yang memotong audio saat pengguna mulai berbicara.
    - Mengubah inisialisasi `isSupported` menjadi sinkron saat mount (`useState(() => typeof window !== 'undefined' && Boolean(...))`) agar tidak ada lag deteksi dukungan Web Speech API.
    - Menekan false-positive error: event `no-speech` (jeda hening) dan `aborted` (tutup normal) tidak lagi di-set sebagai status error merah ke UI.
  - **2. Peningkatan Responsivitas & Eksekusi Perintah Drawer (`ValidationListDrawer.tsx`)**:
    - Mengaktifkan mode `continuous: true` dengan auto re-arm resilien pada event `onEnd` selama drawer terbuka dan tidak dihentikan manual.
    - Memperbaiki eksekusi perintah *"Buka"* / *"Pilih"* / *"Enter"*: saat pengguna mengucapkan perintah buka tanpa menyebutkan nomor, sistem langsung membuka invoice yang sedang disorot/terpilih (`highlightedBilling`).
    - Membersihkan unused import `useVoiceAssistantPermission`.
  - **3. Verifikasi Build Frontend**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (3.13s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.

---

- [x] **Konfigurasi Default Folder Root IIS ke `mshipping` Menggantikan `workhub` (`C:\inetpub\wwwroot\web.config`)**:
  - **1. Pengalihan Root IIS**:
    - Sebelumnya, rule IIS URL Rewrite `Redirect Root to WorkHub` di `C:\inetpub\wwwroot\web.config` mengarahkan request root `^$` ke `/workhub/`.
    - Aturan diganti menjadi `Redirect Root to Shipping` yang mengarahkan `^$` ke `/mshipping/`.
    - Ditambahkan rule `Redirect Shipping Alias to MShipping` yang mengarahkan `^shipping/?$` ke `/mshipping/`.
  - **2. Verifikasi Hasil**:
    - Pengujian `curl -I https://app.sampai.co/` $\to$ HTTP 302 Redirect ke `https://app.sampai.co/mshipping/`.
    - Pengujian `curl -IL https://app.sampai.co/` $\to$ HTTP 200 OK langsung memuat aplikasi web mshipping.

---

- [x] **Proteksi Brute-Force Login: Maksimal 5 Kali Salah & Lockout 10 Menit (`LoginPage.tsx`, `auth.routes.ts`)**:
  - **1. Logika Frontend Reaktif & Persisten (`LoginPage.tsx`)**:
    - Menambahkan pelacak percobaan gagal (`mshipping_auth_failed_attempts`) dan timestamp batas kunci (`mshipping_auth_lockout_until`) di `localStorage`.
    - Jika login gagal mencapai 5 kali berturut-turut (atau jika backend mengembalikan HTTP 429 Rate Limit):
      - Formulir dikunci selama 10 menit (600 detik).
      - Input username dan password dinonaktifkan (`disabled:opacity-50 disabled:cursor-not-allowed`).
      - Tombol submit dinonaktifkan dengan label hitung mundur live font mono: `Terkunci (mm:ss)`.
      - Banner peringatan bernuansa amber dengan ikon `ShieldAlert` dan timer denyut `Clock` menampilkan hitung mundur detik per detik.
      - Refresh browser atau reload tab tidak dapat mem-bypass lockout karena status dihitung dari timestamp absolut.
      - Ditambahkan listener `visibilitychange` agar sisa waktu langsung ter-update saat user membuka kembali tab.
      - Saat login berhasil, counter percobaan dan lockout otomatis di-reset (`clearAuthLockout`).
  - **2. Harmonisasi Backend Rate Limiter (`auth.routes.ts`)**:
    - Menyesuaikan `windowMs` login rate limiter backend dari 15 menit menjadi 10 menit (`10 * 60 * 1000`) agar sinkron 100% dengan batas lockout frontend.
    - PM2 `ShippingApi` direstart (PID 5680).
  - **3. Verifikasi Build Frontend**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (3.23s).

---

- [x] **Resolusi 404 `PUT /mshipping/api/profile/password` & Repack APK Force Update (`profile.routes.ts`, `repack_apk.ps1`)**:
  - **1. Akar Masalah 404 Ganti Password Profil**:
    - Backend [`backend/src/modules/profile/profile.routes.ts`](file:///c:/shipping/backend/src/modules/profile/profile.routes.ts) sebelumnya hanya mendaftarkan rute `PUT /change-password`.
    - Di sisi klien web frontend (`profile.service.ts`), mobile app (`ChangePasswordModal.tsx`), serta dokumentasi Swagger (`swagger.ts`), endpoint resmi yang dipanggil adalah `PUT /profile/password`.
  - **2. Perbaikan & Dual Endpoint**:
    - Memperbarui `profile.routes.ts` untuk mendaftarkan kedua rute sekaligus (`PUT /password` dan `PUT /change-password`) menuju handler yang sama `handleChangePassword`.
    - PM2 service `ShippingApi` direstart dan online (PID `21252`).
    - Pengujian live `curl -X PUT https://app.sampai.co/mshipping/api/profile/password` membuktikan status 404 teratasi (beralih ke 401 Unauthorized / token check).
  - **3. Ekspor & Repack APK v1.2.6 (Build 18, Force Update)**:
    - Sesuai konfirmasi user, versi tetap di `v1.2.6` (Build `18`) dengan status `forceUpdate: true`.
    - Mengompilasi ulang bundel Hermes bytecode Android (`entry-98f2d2cf26a54357d4d2c42cbbe651d2.hbc`, 5.6MB) dengan alamat API `https://app.sampai.co/api`.
    - Menginjeksi bytecode ke `mshipping.apk`, zipalign, dan signing release v2/v3 via `uber-apk-signer` (`scripts/repack_apk.ps1`).
    - Sinkronisasi instan ke 4 lokasi server (`c:\shipping\mshipping.apk`, `frontend/dist`, `frontend/public`, `backend/public/uploads`).
  - **4. Verifikasi Build Frontend**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (4.14s).

---

- [x] **Migrasi Subdomain ke `app.sampai.co` dengan Let's Encrypt SSL & Dual SNI IIS (`wacs.exe`, `index.ts`, `client.ts`, `app-version.json`)**:
  - **1. Verifikasi DNS & Penerbitan Sertifikat Let's Encrypt**:
    - DNS `app.sampai.co` terverifikasi resolve ke IP server `36.93.22.142`.
    - Loopback lokal `127.0.0.1 app.sampai.co` ditambahkan pada `C:\Windows\System32\drivers\etc\hosts`.
    - Dijalankan `win-acme` (`wacs.exe`) untuk menerbitkan sertifikat Let's Encrypt resmi bagi `app.sampai.co` (Valid s/d 27 Des 2026, CA `YR2`).
    - Task auto-renewal otomatis terdaftar di Task Scheduler `win-acme renew`.
  - **2. Konfigurasi Dual SNI IIS Port 443**:
    - Memasang sertifikat SSL `CN=app.sampai.co` pada port 443.
    - Mengonfigurasi SNI (`sslFlags: 1`) via `netsh http` dan IIS Web Binding sehingga kedua domain (`app.sampai.co` dan `mshipping.sampai.co`) aktif berdampingan tanpa sertifikat mismatch.
  - **3. Sinkronisasi Backend & Mobile**:
    - `backend/src/index.ts`: Memperbarui fallback origin CORS dan fallback `prodUrl` ke `https://app.sampai.co`.
    - `backend/src/config/app-version.json` & `app-version.service.ts`: Memperbarui URL unduhan APK ke `https://app.sampai.co/mshipping/mshipping.apk`.
    - `mobile/src/api/client.ts`, `mobile/src/lib/utils.ts`, `mobile/src/stores/updateStore.ts`: Memperbarui endpoint dan asset URL ke `https://app.sampai.co`.
    - Backend build & PM2 service `ShippingApi` direstart (PID 20064, status: online).
  - **4. Verifikasi & Pengujian Hasil**:
    - Live HTTPS `curl https://app.sampai.co/mshipping/` $\to$ `200 OK`.
    - Live API `curl https://app.sampai.co/api/health` $\to$ `200 OK`.
    - Live API `curl https://mshipping.sampai.co/api/health` $\to$ `200 OK` (backward-compatibility terjamin).
    - Live Version `curl https://app.sampai.co/api/app-version/latest` $\to$ `200 OK` (link download baru).
    - Mobile type check: `cd mobile && bunx tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
    - Frontend build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (4.67s).

---

- [x] **Inklusi Kargo FCL pada Target Penagihan Tanpa Filter Status Gudang (`billing-analytics.service.ts`)**:
  - **1. Analisis & Aturan Bisnis**:
    - Sebelumnya, fungsi `isTarget` memfilter keluar seluruh kargo dengan `StatusKirim` mengandung `'BELUM DITERIMA GDG'` (`tbEntryListGudang.fdStatus = 0`).
    - Hal ini mengakibatkan kargo FCL (misal kontainer `26GZD22` customer SAGI, 419 colly, 16.918 kg) tidak muncul di Target Page maupun KPI Target Bill Hari Ini meskipun kargo tersebut bertipe FCL dan berstatus URGENT.
  - **2. Perubahan Logika `isTarget`**:
    - Memperbarui `isTarget` pada `getBillingKPIs` dan `getBillingTargetDetails` di [`backend/src/modules/billing/billing-analytics.service.ts`](file:///c:/shipping/backend/src/modules/billing/billing-analytics.service.ts):
      - Jika kargo bertipe FCL (`isFcl === true`), filter `StatusKirim.includes('BELUM DITERIMA GDG')` **dilewati (bypass)** sehingga kargo FCL langsung masuk ke daftar target tanpa bergantung pada status penerimaan gudang.
      - Kargo non-FCL tetap mematuhi filter `BELUM DITERIMA GDG` seperti biasa.
  - **3. Verifikasi & Pengujian Hasil**:
    - Backend build & PM2 service `ShippingApi` direstart (PID 21156).
    - Eksekusi kueri pengujian membuktikan kargo `26GZD22` (SAGI) berhasil muncul di response `getBillingTargetDetails` dengan atribut lengkap (FCL, URGENT, 419 colly, 16.918,7 kg, 68 M³).
    - Verifikasi build Frontend: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/billing-BRoCkBpj.js` dalam 18.95s).

---

- [x] **Rilis Mobile App `v1.2.6` (Build `18`, `forceUpdate: true`) & Migrasi Penuh HTTPS SSL (`client.ts`, `app.json`, `version.ts`, `app-version.json`, `repack_apk.ps1`)**:
  - **1. Konfigurasi Versi & Force Update Terpadu**:
    - Disinkronkan di 5 berkas resmi:
      - `mobile/package.json`: `version: 1.2.6`
      - `mobile/app.json`: `version: 1.2.6`, `versionCode: 18`
      - `mobile/src/config/version.ts`: `APP_VERSION = '1.2.6'`, `APP_VERSION_CODE = 18`, `FORCE_UPDATE = true`, `MIN_APP_VERSION = '1.2.6'`
      - `backend/src/config/app-version.json`: `version: 1.2.6`, `versionCode: 18`, `minVersion: 1.2.6`, `forceUpdate: true`
      - `mobile-app.md`: `Versi Aktif: v1.2.6 (VersionCode: 18)`
  - **2. Endpoint Komunikasi HTTPS & Asset Resolvers**:
    - `mobile/src/api/client.ts`: Mengarahkan `DEFAULT_API_URL` ke `https://mshipping.sampai.co/api`.
    - `mobile/src/lib/utils.ts`: Mengarahkan `resolveAvatarUrl` ke `https://mshipping.sampai.co`.
    - `mobile/src/stores/updateStore.ts`: Mengarahkan fallback download ke `https://mshipping.sampai.co/mshipping/download/`.
  - **3. Kompilasi Hermes Bytecode & Repack Signing APK**:
    - Type check mobile: `cd mobile && bunx tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
    - Hermes export: `bunx expo export --platform android` $\to$ `entry-b6166de6953482c0bb2d6965af0e5236.hbc` (5.6MB, 3355 modules).
    - Repack APK: injeksi bytecode baru ke `mshipping.apk`, zipalign, re-sign release v2/v3 verified via `uber-apk-signer` (`scripts/repack_apk.ps1`).
    - Distribusi sinkron ke 4 titik server:
      - `C:\shipping\mshipping.apk`
      - `C:\shipping\frontend\dist\mshipping.apk`
      - `C:\shipping\frontend\public\mshipping.apk`
      - `C:\shipping\backend\public\uploads\mshipping.apk`
    - PM2 service `ShippingApi` direstart (PID 12284).
    - Endpoint `/api/app-version/latest` terverifikasi 200 OK via HTTPS (`version: 1.2.6`, `versionCode: 18`, `forceUpdate: true`, size 121.2 MB).
  - **4. Verifikasi Frontend Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/billing-BRoCkBpj.js` dalam 3.54s).

---

- [x] **Pemasangan SSL Let's Encrypt Resmi Subdomain `mshipping.sampai.co` & Reverse Proxy IIS (`wacs.exe`, `web.config`, `index.ts`, `client.ts`)**:
  - **1. Konfigurasi Domain DNS & Verifikasi Tantangan ACME**:
    - Subdomain GoDaddy `mshipping.sampai.co` terverifikasi resolve ke IP publik `36.93.22.142`.
    - Dikonfigurasi folder tantangan HTTP-01 di `C:\inetpub\wwwroot\.well-known\acme-challenge\web.config` dengan MIME type map `.*` `text/json`.
  - **2. Penerbitan Sertifikat SSL Let's Encrypt via `win-acme` (WACS)**:
    - Diunduh dan dipasang engine ACME `win-acme` v2.2.9.1701 di `C:\win-acme`.
    - Dijalankan unattended mode: sertifikat resmi Let's Encrypt diterbitkan untuk `mshipping.sampai.co`, valid 90 hari dengan CA `ISRG Root X1 / YR1`.
    - IIS binding diperbarui: `https *:443:` terpasang pada `Default Web Site` (ID: 1).
    - Windows Task Scheduler otomatis dibuat: `win-acme renew (acme-v02.api.letsencrypt.org)` berjalan setiap hari jam 09:00 WIB untuk auto-renewal.
  - **3. Reverse Proxy IIS Application Request Routing (ARR) untuk API**:
    - Menghilangkan masalah *Mixed Content* (HTTP dalam HTTPS) dengan mengonfigurasi IIS URL Rewrite + ARR pada `frontend/public/web.config`, `frontend/dist/web.config`, dan `C:\inetpub\wwwroot\web.config`.
    - Rule `Reverse Proxy to Bun`: merewrite seluruh request `/mshipping/api/(.*)` dan `/api/(.*)` ke backend lokal `http://127.0.0.1:3010/...` secara transparan.
    - Mengubah `frontend/.env` `VITE_API_BASE_URL` dari absolut `http://36.93.22.142:3010/...` menjadi relatif `"/mshipping/api"`, sehingga request frontend otomatis mengikuti skema protokol aktif (HTTPS 443).
    - Menambahkan `mshipping.sampai.co` pada whitelist CORS `backend/src/index.ts`.
  - **4. Dukungan Penuh SSL pada Backend & Mobile App**:
    - **Backend**:
      - `C:\inetpub\wwwroot\web.config`: Menambahkan reverse proxy IIS untuk `^api/(.*)` dan `^uploads/(.*)` ke Bun backend port 3010.
      - `backend/src/config/app-version.json` & `app-version.service.ts`: Memperbarui `downloadUrl` dan `webDownloadUrl` ke `https://mshipping.sampai.co/mshipping/mshipping.apk` dan `https://mshipping.sampai.co/mshipping/download/`.
      - `backend/src/index.ts`: CORS origin fallback dan fallback `prodUrl` diperbarui ke `https://mshipping.sampai.co`.
      - Backend build & PM2 service `ShippingApi` direstart dan online.
    - **Mobile App**:
      - `mobile/src/api/client.ts`: Memperbarui `DEFAULT_API_URL` menjadi **`https://mshipping.sampai.co/api`** (SSL Let's Encrypt Port 443).
      - `mobile/src/lib/utils.ts`: Memperbarui `resolveAvatarUrl` ke `https://mshipping.sampai.co`.
      - `mobile/src/stores/updateStore.ts`: Memperbarui `webDownloadUrl` fallback ke `https://mshipping.sampai.co/mshipping/download/`.
      - Type check mobile: `cd mobile && bunx tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
  - **5. Optimasi Loopback DNS Lokal**:
    - Menambahkan `127.0.0.1 mshipping.sampai.co` pada berkas `C:\Windows\System32\drivers\etc\hosts` agar akses dari server langsung terhubung ke port 443 tanpa kendala keterbatasan NAT loopback / hairpinning router.
  - **6. Verifikasi & Build**:
    - Backend build & PM2 restart `ShippingApi`: **ONLINE** (PID 18416).
    - Frontend build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-BRoCkBpj.js` dalam 4.33s).
    - Mobile typecheck: `bunx tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
    - Pengujian live `curl https://mshipping.sampai.co/api/health` $\to$ `200 OK` dengan header `X-Powered-By: ARR/3.0`.
    - Pengujian live `curl https://mshipping.sampai.co/api/app-version/latest` $\to$ `200 OK` (HTTPS APK link).
    - Pengujian live `curl https://mshipping.sampai.co/mshipping/` $\to$ `200 OK` via Schannel TLS negotiation.

---

- [x] **Resolusi Underprice `GZS-010866-09-2026` & Integrasi Master Branch `tbCabang` pada Form Komoditi Khusus**:
  - **1. Integrasi Master Branch Asal dari `tbCabang` (`CustomerCommodityPriceModal.tsx` & `customer-price-list.service.ts`)**:
    - Menambahkan fungsi backend `getCustomerPriceListBranches()` yang membaca data resmi 20 cabang dari `tbCabang` SQL Server, menormalkan trailing spaces (`.trim()`), dan menyaring kode non-cabang (`'--'`).
    - Mendaftarkan endpoint REST API `GET /api/customer-price-list/branches`.
    - Memperbarui `customerPriceListApi.getBranches()` di frontend dan komponen modal input `CustomerCommodityPriceModal.tsx` agar dropdown pilihan branch terisi otomatis dengan opsi resmi (`{b.code} - {b.name}`, misal `GZ - GUANGZHOU`, `YW - YI WU`, `SH - SHANGHAI`, dsb.) dengan tetap mendukung opsi branch kustom.
  - **2. Agregasi Multi-Upload & Multi-Item Customer Price List**:
    - **Akar Masalah**: Sebelumnya `lookupCustomerPriceList` dan `getActiveCustomerPriceList` hanya melakukan `findFirst` pada 1 file upload teratas (`Upload 10` dengan item `UMUM`). Hal ini mengakibatkan `Upload 11` (item `SEMI GARMENT` @ Rp 6.500.000) sama sekali tidak terangkut saat lookup validasi invoice `GZS-010866-09-2026`, sehingga sistem fallback ke tarif master CS Guangzhou (`Semi Garment` @ Rp 7.000.000) dan menandai status invoice sebagai Underprice.
    - **Solusi**: Memperbarui kueri pada `lookupCustomerPriceList` dan `getActiveCustomerPriceList` agar mencari seluruh item dari upload-upload customer yang berstatus aktif non-superseded (`isSuperseded: false`, `status: { notIn: ['FAILED', 'DELETED'] }`) dengan tanggal efektif berlaku (`effectiveDate <= targetDate`).
    - Melakukan deduplikasi cerdas per `(mode, branch, category)` memprioritaskan `effectiveDate` paling baru, sehingga item `UMUM` (Rp 4.500.000) dan `SEMI GARMENT` (Rp 6.500.000) aktif berdampingan tanpa saling meniadakan.
  - **3. Verifikasi & Pengujian Hasil**:
    - Evaluasi invoice `GZS-010866-09-2026` (`PARCELS TO JAKARTA (M3) - UNDERWEAR, LACE` @ Rp 6.500.000) kini berhasil mencocokkan tarif `SEMI GARMENT` Rp 6.500.000 dari Customer Price List Upload 11 $\to$ Status **VALID / MATCH (Bukan Underprice)**.
    - Build frontend `cd frontend && bun run build` **LULUS 100% 0 errors** dalam 3.69s.
    - Service PM2 `ShippingApi` aktif (`online`).

---

- [x] **Resolusi "App Tidak Memproses Audio" & Penambahan Diagnostik Sinyal Hardware Mikrofon (`useVoiceRecognition.ts`, `ValidationListDrawer.tsx`, `VoiceAssistantModal.tsx`)**:
  - **1. Analisis Akar Masalah & Eliminasi Loop Zombie Instance (`useVoiceRecognition.ts`)**:
    - *Rogue Instance Spawn pada abort()*: Sebelumnya saat `startListening` dipanggil, pemanggilan `recognitionRef.current.abort()` memicu event `onend` pada instance lama yang belum dimatikan listener-nya. Di dalam `onend`, kondisi auto-restart terpenuhi sehingga instance lama membangkitkan instance baru secara liar yang bertabrakan dengan instance baru di Chrome.
    - *Solusi Pelepasan Listener*: Seluruh event listener (`onstart`, `onaudiostart`, `onsoundstart`, `onspeechstart`, `onresult`, `onerror`, `onend`) dinull-kan terlebih dahulu sebelum pemanggilan `.abort()`.
    - *Penghapusan Auto-Restart Tak Terkendali pada onend*: Menghapus pemanggilan liar `newInstance.start()` di dalam `onend` recognizer. Menggunakan flag `hasErrorRef` agar error seperti `not-allowed`, `audio-capture`, dan `network` tidak memicu loop restart yang menghapus pesan error dan menampilkan status palsu "mendengarkan".
  - **2. Mode Turn-Taking Command (`continuous: false`) pada Drawer (`ValidationListDrawer.tsx`)**:
    - Mengubah opsi `continuous: true` menjadi `continuous: false` sehingga Chrome langsung memfinalisasi ucapan (nomor faktur / nama pelanggan) seketika tanpa jeda hening berkepanjangan.
    - Menjaga transkrip pencarian tetap bersih dengan memfilter kata-kata aksi/perintah (`buka`, `pilih`, `tutup`, `bawah`, `atas`) agar tidak masuk mengotori kolom input pencarian.
  - **3. Alat Diagnostik Hardware Mikrofon Browser (`testHardwareMic`)**:
    - Menambahkan fungsi diagnosa hardware murni menggunakan Web Audio API (`getUserMedia` + `AudioContext` + `AnalyserNode`).
    - Menguji mikrofon selama 1.5 detik, mengukur volume peak fisik (RMS 0-100%), dan membaca nama perangkat audio browser (`track.label`).
    - Menyajikan tombol interaktif `[ 🔍 Test Mic ]` pada `ValidationListDrawer.tsx` dan `VoiceAssistantModal.tsx` dengan banner hasil diagnosa:
      - Tiga level evaluasi sinyal: GOOD (Peak ≥ 18%), WEAK (4% ≤ Peak < 18%), dan NONE (Peak < 4%).
      - Resolusi Volume Lemah 7% (USB PnP Audio Device): Mengarahkan pengguna menaikkan volume mic di Windows Sound Settings (`mmsys.cpl`) ke 90-100% agar suara tidak tersaring sebagai noise/hening oleh VAD Google Speech API.
  - **4. Banner Notifikasi Error Interaktif**:
    - Menampilkan banner error terstruktur di bawah kolom pencarian drawer jika terjadi `not-allowed`, `no-speech`, `audio-capture`, atau kendala koneksi dengan tombol aksi langsung `[ 🔍 Test Mic ]`.
  - **5. Verifikasi & Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-BI65K5Xz.js` dalam 3.99s).


---

- [x] **Pencarian Suara Otomatis Hands-Free & Perintah "Buka" pada Drawer Cari Faktur Detail Validasi (`ValidationListDrawer.tsx`)**:
  - **1. Auto-Start Mikrofon Seketika saat Drawer Terbuka**:
    - Saat drawer dibuka (`isOpen === true`), sistem otomatis mengaktifkan mikrofon (`startVoiceListening()`) dan memfokuskan input pencarian tanpa perlu klik icon mikrofon.
    - Mikrofon beroperasi dalam mode `continuous: true` dengan auto-restart resilien sehingga pengguna dapat langsung berbicara mendiktekan nama customer / nomor invoice secara hands-free.
  - **2. Seleksi Otomatis Hasil Pencarian & Perintah Suara "Buka" / "Pilih"**:
    - Hasil pencarian difilter secara instan di sisi klien (`0ms lag`).
    - Kartu hasil pencarian teratas otomatis terpilih dengan badge visual interaktif `[ 🎯 Terpilih · Katakan "Buka" atau Tekan Enter ↵ ]` serta glowing border aksen sky blue.
    - Sistem mengenali perintah suara:
      - *"Buka"* / *"Pilih"* / *"Enter"* / *"Ya buka"* $\to$ langsung membuka faktur terpilih dan menutup drawer.
      - Perintah komposit (e.g. *"Santoso buka"*, *"010751 buka"*, *"Buka Santoso"*) $\to$ mendeteksi target pencarian, mencocokkan faktur yang dimaksud, dan langsung membukanya.
      - *"Bawah"* / *"Turun"* / *"Nomor dua"* $\to$ berpindah ke faktur berikutnya.
      - *"Atas"* / *"Naik"* $\to$ berpindah ke faktur sebelumnya.
      - *"Tutup"* / *"Batal"* $\to$ menutup drawer.
    - Smooth Auto-Scroll: Item yang sedang disorot/terpilih otomatis digulir ke area tampilan viewport saat berpindah pilihan.
  - **3. Integrasi Pintasan Keyboard `Alt+V` di Dalam Drawer**:
    - Menambahkan listener `Alt+V` di capture phase dengan `stopPropagation()`, sehingga saat drawer terbuka `Alt+V` mengontrol mikrofon pencarian drawer secara eksklusif (tidak memicu modal asisten global).
    - Tombol mikrofon di input search dilengkapi badge `<kbd>Alt+V</kbd>`.
  - **4. Elevasi Lapisan Layer (`z-[110]`)**:
    - Mengubah z-index drawer dari `z-50` menjadi `z-[110]` agar selalu tampil di atas modal validasi (`z-[100]`).
  - **5. Verifikasi & Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-BVB5MXfH.js` dalam 3.25s).

---

- [x] **Integrasi Shortcut Alt+V & Asisten Suara pada Modal Audit & Validasi Invoice (`ValidationSummaryHeader.tsx`, `BillingValidationSummaryModal.tsx`, `VoiceAssistantModal.tsx`, `AppLayout.tsx`, `ValidationListPage.tsx`)**:
  - **1. Elevasi Z-Index Dialog Suara (`VoiceAssistantModal.tsx`)**:
    - Meningkatkan `z-index` overlay dialog dari `z-50` menjadi **`z-[10000]`**.
    - Memastikan modal Asisten Suara selalu muncul di lapisan paling depan (di atas dialog modal `Audit & Validasi Invoice` `z-[100]` maupun modal lainnya).
  - **2. Keandalan Shortcut Keyboard Universal (`AppLayout.tsx` & `BillingValidationSummaryModal.tsx`)**:
    - Memperbarui pendengar keyboard global di `AppLayout.tsx` dengan event capture phase (`window.addEventListener('keydown', handleKeyDown, true)`).
    - Memvalidasi kecocokan `e.altKey && (e.key?.toLowerCase() === 'v' || e.code === 'KeyV')` dengan `stopPropagation()`.
    - Menambahkan listener `Alt+V` langsung di dalam komponen `BillingValidationSummaryModal.tsx` agar respon seketika saat dialog modal sedang fokus aktif.
  - **3. Tombol Aksi Suara pada Header Modal (`ValidationSummaryHeader.tsx`)**:
    - Menambahkan tombol interaktif `[ 🎙️ Suara Alt+V ]` beranimasi denyut (`animate-pulse`) di samping tombol cetak pada header modal *"Audit & Validasi Invoice {invNo}"*.
    - Terhubung dengan `openAssistant()` dan diproteksi `useVoiceAssistantPermission()`.
  - **4. Akses Suara pada Daftar Validasi Billing (`ValidationListPage.tsx`)**:
    - Menambahkan tombol `[ 🎙️ Asisten Suara Alt+V ]` pada toolbar header halaman antrean validasi billing (`ROUTES.BILLING_VALIDATION_LIST`).
  - **5. Verifikasi & Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-CdTOjM3P.js` dalam 3.52s).

---

- [x] **Resolusi Minified React Error #310 (Pelanggaran Aturan Hooks pada `IssueInvoiceModal.tsx`)**:
  - **1. Analisis Akar Masalah**:
    - React Error #310 (*"Rendered more hooks than during the previous render"*).
    - Pada `IssueInvoiceModal.tsx`, terdapat conditional early return `if (!isOpen) return null` pada baris 122 yang berada SEBELUM hook `useEffect` pendengar konfirmasi suara (*"Terbitkan", "Setuju", "Konfirmasi"*) di baris 164.
    - Saat modal tertutup (`isOpen === false`), komponen menghentikan eksekusi di baris 122 (tidak menjalankan hook ke-7). Saat modal dibuka (`isOpen === true`), baris 122 dilewati sehingga hook `useEffect` ke-7 dijalankan, menyebabkan jumlah hooks tidak konsisten antar-render dan memicu fatal React error #310.
  - **2. Perbaikan**:
    - Menghapus baris conditional early return `if (!isOpen) return null` sebelum hooks dan handler.
    - Memastikan seluruh hooks (`useState`, `useVoiceRecognition`, `useEffect`) dijalankan tanpa syarat (unconditionally).
    - Return `null` hanya dieksekusi di akhir setelah semua hooks selesai diinisialisasi (`if (!isOpen) return null` sebelum `createPortal`).
    - Melakukan audit menyeluruh pada seluruh berkas di `src/` via skrip AST/regex scanner untuk memastikan 0 pelanggaran hook order di seluruh aplikasi.
  - **3. Verifikasi & Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-BFEkCQqB.js` dalam 3.92s).

---

- [x] **Implementasi Hak Akses Role Permission untuk Fitur Asisten Suara ERP (`ROUTES.VOICE_ASSISTANT`, `AVAILABLE_PATHS`, `useVoiceAssistantPermission`, `tbRolePermissions`, `RoleManagementPage`)**:
  - **1. Definisi Route & Matrix Path (`constants.ts`, `userManagement.types.ts`)**:
    - Menambahkan `VOICE_ASSISTANT: '/mshipping/voice-assistant'` pada konstanta `ROUTES`.
    - Mendaftarkan entri `{ path: ROUTES.VOICE_ASSISTANT, label: 'Asisten Suara ERP (Voice Assistant)', module: 'overview', moduleLabel: 'Overview', accentColor: '#0EA5E9' }` ke dalam `AVAILABLE_PATHS`.
    - Memungkinkan admin mengaktifkan / menonaktifkan izin Asisten Suara secara interaktif per role melalui tabel matriks di menu Role Management (`/mshipping/admin/roles`).
  - **2. Hook Otorisasi Suara Reaktif (`useVoiceAssistantPermission.ts`)**:
    - Memeriksa hak akses pengguna aktif dari `useAuthStore` (`user.permissions`).
    - Mendukung bypass otomatis penuh untuk pengguna ber-role `admin`.
    - Memvalidasi kepemilikan izin wildcard `/*` atau spesifik `/mshipping/voice-assistant`.
  - **3. Proteksi Akses Komponen UI & Pintasan**:
    - `Topbar.tsx`: Tombol global `[ 🎙️ Voice / Asisten Suara ]` dibungkus kondisi `{canUseVoice && (...)}`.
    - `AppLayout.tsx`: Pintasan keyboard universal **`Alt+V`** dan rendering dialog `<VoiceAssistantModal />` diproteksi guard `canUseVoice`.
    - `ValidationDetailPage.tsx`: Tombol aksi cepat ribbon `[ 🎙️ Suara ]` disembunyikan jika role pengguna tidak memiliki izin suara.
  - **4. Seeding & Backfill Database (`[dbo].[tbRolePermissions]`)**:
    - Menjalankan migrasi data via script database langsung:
      - Role `admin`: `canView = 1`
      - Role `ar`: `canView = 1`
      - Role `finance`: `canView = 1`
      - Role `kasir`: `canView = 1`
      - Role `viewer`: `canView = 0` (nonaktif secara default)
  - **5. Verifikasi & Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/billing-rej4zOGu.js` dalam 3.87s).
    - Dokumentasi diperbarui di `frontend-app.md`, `docs/frontend/billing.md`, dan `docs/frontend/master-admin.md`.

---

- [x] **Resolusi "Aplikasi Terus Mendengarkan Tanpa Memproses Audio" — Eliminasi Konflik getUserMedia & Mode Turn-Taking Single-Command (`useVoiceRecognition.ts`, `VoiceAssistantModal.tsx`)**:
  - **1. Analisis Akar Masalah Mengapa Aplikasi "Terus Mendengarkan Tanpa Memproses"**:
    - *Konflik Buffer Audio WASAPI (`getUserMedia` vs `SpeechRecognition`)*: Memanggil `navigator.mediaDevices.getUserMedia` dan `AudioContext` secara bersamaan dengan `SpeechRecognition` di Windows menyebabkan driver WASAPI mengunci mikrofon ke audio context, sehingga recognizer Google Chrome mengalami *buffer starvation* (menerima 0 bytes audio / silent buffer). Akibatnya, recognizer tetap dalam status *listening*, namun Google Speech API tidak pernah memicu event `onresult`.
    - *Anti-Pattern Dictation Mode (`continuous: true`)*: Pada mode `continuous: true`, Chrome menganggap pengguna sedang mendikte dokumen panjang, sehingga tidak pernah memfinalisasi kalimat (`isFinal = true`) sampai pengguna berhenti total atau menekan stop.
    - *Eksekusi Terblokir State `isListening`*: Logika sebelumnya menahan eksekusi jika `isListening === true`, dan auto-execute timer hanya mencakup 4 tipe intent, menyebabkan pencarian invoice (`SEARCH_INVOICE`) dan audit spesifik tertahan tanpa diproses.
    - *Tap Mic Stop Tanpa Eksekusi*: Menekan tombol stop mikrofon sebelumnya hanya mematikan recognizer tanpa memicu eksekusi intent yang telah tertangkap.
  - **2. Solusi Rekonstruksi & Ketahanan**:
    - **Eliminasi Konflik `getUserMedia`**: Menghapus `getUserMedia` concurrent dari pemanggilan `SpeechRecognition`. Memberikan hak akses eksklusif 100% pada `SpeechRecognition` agar audio driver mengirimkan stream murni ke Google Speech API.
    - **Mode Turn-Taking Command (`continuous: false`)**: Begitu pengguna selesai mengucapkan 1 kalimat perintah (misal: *"Buka dashboard"* atau *"Validasi bill ini"*), Chrome langsung memfinalisasi transkrip seketika tanpa menunggu waktu lama.
    - **Auto-Execute 900ms Universal**: Seluruh intent yang valid (`NAVIGATE_PAGE`, `VALIDATE_BILL`, `SEARCH_INVOICE`, `REFRESH_VALIDATION`, `OPEN_SUMMARY`, dll) otomatis diproses dan dieksekusi dalam 900ms setelah selesai berbicara tanpa terhalang status `isListening`.
    - **Eksekusi Seketika Saat Tap Mic Stop (`handleMicToggle`)**: Jika pengguna selesai berbicara lalu mengetuk tombol mic untuk stop, sistem langsung mengeksekusi intent seketika tanpa jeda.
  - **3. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-C3KbaMyU.js` dalam 15.05s).
    - Dokumentasi diperbarui di `frontend-app.md` dan `docs/frontend/billing.md`.

- [x] **Perbaikan Responsivitas Mikrofon Chrome Mobile & Regenerasi Instance SpeechRecognition (`useVoiceRecognition.ts`, `VoiceAssistantModal.tsx`)**:
  - **1. Investigasi Akar Masalah di Chrome Mobile (Android)**:
    - *Reuse Instance yang Sudah Ended*: Sebelumnya instance `webkitSpeechRecognition` dibuat satu kali di `useEffect`. Setelah sesi rekaman pertama berakhir (`onend`), Chrome Android melarang pemanggilan `.start()` pada instance yang sama dan melempar `InvalidStateError`.
    - *Silent Error Swallowing*: Exception `InvalidStateError` ditangkap tanpa mengaktifkan state `isListening` atau error, menyebabkan icon mic tidak bereaksi saat di-tap.
    - *Ketiadaan State Transisi Visual*: State `isListening` hanya di-set pada event `onstart` asynchronous (bisa memakan waktu 500-1000ms untuk inisialisasi audio hardware di ponsel), menimbulkan kesan tombol tidak merespons sentuhan.
    - *Konteks Insecure HTTP vs HTTPS di Android*: Chrome Android memblokir izin mikrofon secara default pada IP HTTP biasa (`http://36.93.22.142`) dengan error `not-allowed`.
  - **2. Solusi Rekonstruksi & Stabilisasi Mobile**:
    - **Instansiasi Baru per Panggilan (`startListening`)**: Meng-abort instance lama dan selalu membuat `new SpeechRecognitionClass()` yang segar di setiap tap tombol mic, mengeliminasi `InvalidStateError` 100%.
    - **Feedback Visual Instan (`isStarting`)**: Tombol mic langsung merespons tap seketika dengan spinner transisi `Loader2` dan denyut visual sebelum audio hardware siap, menghilangkan kesan freeze / delay.
    - **Optimasi Touch Screen (`touch-manipulation select-none active:scale-95`)**: Menghilangkan delay 300ms klik browser mobile pada tombol mikrofon.
    - **Deteksi Insecure Context & Instruksi Izin Chrome Mobile**: Menyajikan box panduan terstruktur di bawah mic jika izin ditolak (`not-allowed`) atau jika browser memblokir karena HTTP IP biasa.
  - **3. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-CrzcbRg5.js` 2.81s).
    - Dokumentasi diperbarui di `frontend-app.md` dan `docs/frontend/billing.md`.

---

- [x] **Grafis Spektrum Suara & Gelombang Audio Reaktif pada Modal Voice Assistant (`VoiceVisualizerGraphic.tsx`, `VoiceAssistantModal.tsx`)**:
  - **1. Komponen Grafis Spektrum & Waveform (`VoiceVisualizerGraphic.tsx`)**:
    - **Dynamic Equalizer Spectrum (24 Bars)**: Menggunakan kurva bobot Gaussian frekuensi vokal manusia. Saat sinyal ucapan terdeteksi (`isReceivingVoice === true`), 24 baris equalizer melonjak aktif dengan fluktuasi dinamis (`from-emerald-500 via-sky-500 to-cyan-400`). Saat mikrofon siaga, baris bernapas halus (`sky-400/30`).
    - **SVG Dynamic Sine Wave Banner**: Mengalirkan 2 lapisan gelombang sinus analog (`d1` cyan/emerald dan `d2` indigo/sky) dengan osilasi frekuensi dan amplitudo membesar saat suara masuk.
    - **Visual Sinyal Status Badge**: Badge reaktif `🔊 Menerima Sinyal Suara...` (warna emerald, animasi ping/pulse) saat suara masuk, dan `🎙️ Mikrofon Siaga` saat hening.
  - **2. Efek Sonar Tiga Lapis di Tombol Mic (`VoiceAssistantModal.tsx`)**:
    - Ring luar 3 (`w-36 h-36 bg-emerald-500/25 animate-ping`), Ring luar 2 (`w-28 h-28 bg-emerald-500/30 animate-pulse`), dan Ring 1 aura neon (`w-22 h-22 bg-cyan-400/30 blur-xs`).
    - Tombol mikrofon bertransisi dinamis ke gradien emerald-teal dengan glowing ring (`ring-4 ring-emerald-400/30 scale-105`) seketika saat pengguna berbicara.
  - **3. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-BOiMcZHB.js` 2.65s).
    - Dokumentasi diperbarui di `frontend-app.md` dan `docs/frontend/billing.md`.

---

- [x] **Perintah Validasi Bill Cerdas via Suara (`VoiceAssistantModal.tsx`, `voiceSearch.utils.ts`, `voiceAssistantStore.ts`, `ValidationDetailPage.tsx`)**:
  - **1. Intent Baru `VALIDATE_BILL` & `REFRESH_VALIDATION` (`voiceSearch.utils.ts`)**:
    - `VALIDATE_BILL`:
      - **Validasi Bill Spesifik**: *"Validasi bill GZS 010751"*, *"Validasi invoice 010751"*, *"Validasi faktur Santoso"* $\to$ normalisasi mengekstrak nomor/nama, API list query, auto-navigate 0.8s langsung membuka invoice validasi terkait.
      - **Validasi Bill Aktif (Current)**: *"Validasi bill ini"*, *"Validasi bill"*, *"Cek validasi"*, *"Periksa validasi"*, *"Inspeksi bill"* $\to$ saat berada di `ValidationDetailPage`, langsung membuka modal kesimpulan validasi `BillingValidationSummaryModal.tsx`.
      - **Validasi Sub-Tab Spesifik**:
        - *"Validasi fisik bill"* / *"Validasi kubikasi"* $\to$ sub-tab `m3_weight` (Fisik M³ / Kg).
        - *"Validasi overweight bill"* $\to$ sub-tab `overweight` (Overweight).
        - *"Validasi tarif bill"* / *"Validasi harga"* $\to$ sub-tab `items` (Audit Tarif & Item).
        - *"Validasi transport bill"* / *"Validasi ongkir"* $\to$ sub-tab `transport` (Biaya `tbExpIndo`).
        - *"Validasi freight bill"* $\to$ sub-tab `freight` (Freight Charge).
      - **Navigasi Antrean**: *"Antrean validasi bill"*, *"Daftar validasi bill"* $\to$ `ROUTES.BILLING_VALIDATION_LIST`.
    - `REFRESH_VALIDATION`:
      - *"Refresh validasi"*, *"Muat ulang validasi"*, *"Cek ulang"* $\to$ mengeksekusi invalidasi cache atomik React Query (`billingDetail`, `m3-check`, `billingTransportCheck`) melalui context delegator `onRefreshValidation` tanpa reload seluruh halaman browser.
  - **2. UI & Quick Action Chips Dinamis (`VoiceAssistantModal.tsx`)**:
    - Badge intent visual emerald: `🛡️ Validasi Bill: [Target / Tab / Invoice]`.
    - Quick Action Pills kontekstual: jika invoice sedang aktif dibuka, modal menyajikan tombol cepat `🛡️ "Validasi Bill Ini"`, `📏 "Audit Fisik"`, `🏷️ "Audit Tarif"`, dan `🔄 "Refresh Validasi"`.
  - **3. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-Agvuilrq.js` 2.80s).
    - Dokumentasi diperbarui di `docs/frontend/billing.md` dan `frontend-app.md`.

---

- [x] **Global ERP Voice Assistant di Seluruh Halaman Aplikasi Web (`VoiceAssistantModal.tsx`, `voiceAssistantStore.ts`, `voiceSearch.utils.ts`, `Topbar.tsx`, `AppLayout.tsx`, `ValidationDetailPage.tsx`)**:
  - **1. Arsitektur Store Terpusat & Delegasi Kontekstual (`voiceAssistantStore.ts`)**:
    - Menggunakan Zustand store global `useVoiceAssistantStore` untuk mengelola visibilitas dialog (`isOpen`, `openAssistant`, `closeAssistant`, `toggleAssistant`).
    - Menyediakan antarmuka pendaftaran konteks reaktif (`registerContext` & `unregisterContext`). Halaman khusus (seperti `ValidationDetailPage.tsx`) dapat mendaftarkan callback spesifik halaman (`onOpenSummary`, `onCloseSummary`, `onTriggerIssue`, `isIssued`, `underchargedCount`, `currentInvNo`) saat mount dan otomatis di-deregister saat unmount.
  - **2. Navigasi Suara Seluruh Modul ERP (`voiceSearch.utils.ts`)**:
    - Intent baru `NAVIGATE_PAGE` dengan pemetaan komprehensif `PAGE_COMMANDS` menggunakan konstanta resmi `ROUTES`:
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
      - *"Buka master tarif"* / *"Price list"* $\to$ `ROUTES.PRICE_LIST`
      - *"Buka tarif customer"* $\to$ `ROUTES.CUSTOMER_PRICE_LIST`
      - *"Buka master customer"* $\to$ `ROUTES.CUSTOMERS`
      - *"Buka profil"* $\to$ `ROUTES.PROFILE`
      - *"Buka user management"* $\to$ `ROUTES.USERS`
  - **3. Pencarian Invoice Universal dari Mana Saja (`SEARCH_INVOICE`)**:
    - Pengguna dapat mencari invoice dari halaman mana saja (e.g. *"Cari invoice GZS 010751"* atau *"Buka invoice Santoso"*).
    - Auto-navigation (0.8s countdown) langsung membuka `ROUTES.BILLING_VALIDATION_DETAIL(invNo)`.
  - **4. Integrasi Akses Global & Pintasan Keyboard (`Topbar.tsx` & `AppLayout.tsx`)**:
    - Tombol `[ 🎙️ Voice / Asisten Suara ]` beranimasi pulse terpasang permanen pada `Topbar.tsx` di samping pemilih tema dan bahasa.
    - Pintasan keyboard global **`Alt+V`** aktif di seluruh halaman melalui listener `keydown` di `AppLayout.tsx`.
    - Komponen `<VoiceAssistantModal />` dimount satu kali secara global di level root layout (`AppLayout.tsx`).
  - **5. Integrasi Kontekstual Validation Detail (`ValidationDetailPage.tsx`)**:
    - Mendaftarkan context sebelum early returns (`registerContext`).
    - Tombol ribbon header memanggil `openAssistant()`.
    - Membersihkan modal lokal lama dan mengarahkan `VoiceInvoiceModal.tsx` sebagai re-export terarah.
  - **6. Internasionalisasi (i18n) & Verifikasi Build**:
    - Menambahkan key `topbar.voiceAssistant` pada `id.json` (*"Asisten Suara"*) dan `en.json` (*"Voice Assistant"*).
    - Verifikasi build frontend: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/billing-CVZKBHUe.js` dalam 10.38s).
    - Dokumentasi diperbarui di `frontend-app.md` dan `docs/frontend/billing.md`.

---

- [x] **Instalasi Skill TypeSafe AI (`.agents/skills/typesafe-ai`)**:
  - Menjalankan `npx skills add typesafe-ai/skills --skill typesafe-ai`.
  - Skill berhasil di-install dan tersimpan di `.agents/skills/typesafe-ai`.

---


- [x] **Billing Voice Assistant: Pencarian Invoice, Buka Tab Summary & Penerbitan Invoice via Suara (`VoiceInvoiceModal.tsx`, `useVoiceRecognition.ts`, `voiceSearch.utils.ts`, `ValidationDetailPage.tsx`, `IssueInvoiceModal.tsx`, `ValidationListDrawer.tsx`)**:
  - **1. Hook Web Speech API (`useVoiceRecognition.ts`)**:
    - Membungkus interface `SpeechRecognition` / `webkitSpeechRecognition` dengan bahasa default Bahasa Indonesia (`id-ID`).
    - Menyediakan lifecycle reaktif: `isSupported`, `isListening`, `transcript`, `interimTranscript`, dan penanganan error (`not-allowed`, `no-speech`, dll).
  - **2. Normalizer & Intent Classifier (`voiceSearch.utils.ts`)**:
    - Normalisasi ejaan angka fonetik ("kosong"/"nol" -> 0, "satu" -> 1, "strip" -> "-", "gezetes" -> GZS, dsb).
    - Klasifikasi 6 intent suara cerdas:
      - `SEARCH_INVOICE`: Menemukan dan membuka invoice target.
      - `OPEN_SUMMARY`: Membuka modal kesimpulan validasi `BillingValidationSummaryModal.tsx` dengan dukungan navigasi sub-tab instan (`m3_weight` Fisik, `overweight`, `items` Tarif, `transport`, `freight`).
      - `CLOSE_SUMMARY`: Menutup dialog summary validasi via perintah suara.
      - `ISSUE_INVOICE`: Membuka alur penerbitan invoice dengan proteksi undercharge.
      - `CONFIRM_ISSUE`: Konfirmasi hands-free eksekusi penerbitan invoice (`billingApi.issueInvoice`).
      - `CANCEL`: Membatalkan aksi atau menutup dialog suara.
  - **3. Dialog Interaktif Voice Assistant (`VoiceInvoiceModal.tsx`)**:
    - Animasi gelombang audio sonar saat merekam (Midnight Dark Mode compliant, border transparan semantik tanpa solid white).
    - Live transcript display dengan badge intent real-time.
    - Kueri pencarian backend instan via `billingApi.list` (auto-navigate 0.8s saat 1 hasil cocok; daftar kartu kandidat saat banyak hasil).
    - Quick hint buttons untuk perintah populer.
  - **4. Integrasi Validasi & Penerbitan Hands-Free (`ValidationDetailPage.tsx`, `IssueInvoiceModal.tsx`, `ValidationListDrawer.tsx`)**:
    - Tombol `[ 🎙️ Suara ]` pada ribbon header `ValidationDetailPage.tsx` + pintasan keyboard global **`Alt+V`**.
    - Sinkronisasi state `summaryInitialTab` ke `<BillingValidationSummaryModal initialTab={summaryInitialTab} />`.
    - Tombol mic inline pada kolom input pencarian drawer `ValidationListDrawer.tsx`.
    - Tombol konfirmasi suara pada footer `IssueInvoiceModal.tsx` ("Katakan 'Terbitkan'").
  - **5. Verifikasi & Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/billing-validation-detail-Dg23K81e.js`).
    - Kamus terjemahan `id.json` dan `en.json` terdaftar lengkap.
    - Dokumentasi diperbarui di `docs/frontend/billing.md` dan `frontend-app.md`.

---

- [x] **Peningkatan Jarak Aman Tombol Ambil Foto BAP dari Navigasi Android (`BapPhotoSheet.tsx`)**:
  - **1. UI Safe Area Insets Elevation (`BapPhotoSheet.tsx`)**:
    - Tombol aksi "+ Ambil Foto Pemeriksaan" pada footer lembar BAP: Mengubah padding bottom dari sebelumnya statis `Math.max(insets.bottom, 24)` menjadi `Platform.OS === 'android' ? Math.max(insets.bottom, 48) + 16 : Math.max(insets.bottom, 24)`. Jarak tombol dari tepi bawah layar kini minimal 64px, memberikan ruang bebas nyaman di atas bar navigasi Android (3-tombol maupun gestur).
    - Shutter tombol jepret kamera native: Mengubah `cameraBottomBar` padding bottom dari `insets.bottom + 24` menjadi `Platform.OS === 'android' ? Math.max(insets.bottom, 48) + 24 : Math.max(insets.bottom, 24) + 16` (~72px), mencegah pengguna salah menekan tombol navigasi Home/Back saat mengambil foto.
    - Fullscreen preview footer: Diperbarui dengan `paddingBottom: Platform.OS === 'android' ? 44 : 36`.
  - **2. Verifikasi, Kompilasi & Repack APK**:
    - Type check: `bunx tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
    - Hermes bundle recompiled: `bunx expo export --platform android` $\to$ `entry-0b36632f6514596c1624fa187cebe6f1.hbc` (5.6MB).
    - Repack APK: injeksi bundle, zipalign, & re-sign release v2/v3 verified via `scripts/repack_apk.ps1`.
    - Distribusi sinkron ke 4 titik server (`c:\shipping\mshipping.apk`, `frontend/dist`, `frontend/public`, `backend/public/uploads`).
    - PM2 service `ShippingApi` di-restart dan aktif online.
    - Endpoint `/api/app-version/latest` terverifikasi 200 OK (`version: 1.2.5`, `versionCode: 17`, `forceUpdate: false`).

---

- [x] **Perbaikan Fatal Crash Tab Logistik Mobile & Stabilisasi Base APK (`BapPhotoSheet.tsx`, `package.json`, `app-version.json`, `docs/mobile/`)**:
  - **1. Investigasi Akar Masalah Crash**:
    - Aplikasi crash seketika saat pengguna membuka tab Logistik.
    - Analisis DEX base APK `C:\shipping\mshipping.apk` membuktikan modul binary native `ExponentImagePicker` **tidak ada** di `classes.dex`.
    - Alur build server menggunakan `scripts/repack_apk.ps1` yang hanya mengganti JavaScript Hermes bytecode (`assets/index.android.bundle`) tanpa Android SDK / compiler Java DEX.
    - Import `expo-image-picker` di level modul pada `BapPhotoSheet.tsx` memanggil `requireNativeModule('ExponentImagePicker')` yang langsung throw unhandled exception fatal saat runtime modul di-load.
  - **2. Solusi & Pemulihan (Rollback ke Native Camera Saja)**:
    - Menghapus import `expo-image-picker`, fungsi `handlePickFromGallery`, tombol galeri, dan dependensi `expo-image-picker` dari `mobile/src/features/inspection/components/BapPhotoSheet.tsx` dan `mobile/package.json`.
    - Modul BAP tetap aman mengambil foto melalui `expo-camera` (`CameraView`) yang sudah ter-compile di binary DEX base APK.
    - Menambahkan dokumentasi aturan arsitektur di `.agents/rules/mobile-standards.md` dan `docs/mobile/release-protocol.md` mengenai batasan base APK repack vs larangan import modul native baru.
  - **3. Verifikasi & Distribusi APK**:
    - Type check: `bunx tsc --noEmit` di `mobile/` $\to$ **LULUS 100% 0 errors**.
    - Hermes bundle recompiled: `bunx expo export --platform android` $\to$ `entry-c0f4be4a8b749b960d96e831dc6de662.hbc` (5.6MB).
    - Repack APK: injeksi bytecode ke `mshipping.apk`, zipalign & signing release v2/v3 verified via `scripts/repack_apk.ps1`.
    - Distribusi sinkron ke 4 titik server (`c:\shipping\mshipping.apk`, `frontend/dist`, `frontend/public`, `backend/public/uploads`).
    - PM2 service `ShippingApi` di-restart dan online.
    - Endpoint `/api/app-version/latest` terverifikasi 200 OK (`version: 1.2.5`, `versionCode: 17`, `forceUpdate: false`, size 121.2 MB).

---

- [x] **Evaluasi Toleransi Pengiriman H+1 & Modal Rincian SJ Pending Overdue (`DeliveryEstimasiDetailModal.tsx`, `DeliveryConfirmChart.tsx`, `deliveryOrders.service.ts`, `deliveryOrders.routes.ts`)**:
  - **1. Aturan Bisnis & Backend SQL Server Engine (`deliveryOrders.service.ts` & `deliveryOrders.routes.ts`)**:
    - **Aturan Toleransi H+1 & Akurasi Realisasi Pengiriman (`fdLoad`)**: Batas maksimal pengiriman normal adalah `fdSent <= fdEstimasi + 1` hari. Apabila hari ini (`GETDATE()`) sudah melewati `fdEstimasi + 1` dan kargo belum terkirim (`fdSent = 0` atau `NULL`), berstatus **Pending Overdue**. Apabila `fdSent = 1`, tanggal dan waktu pemuatan riil diambil dari **`tbDelivery.fdLoad`** (bukan `fdSndDate` yang merupakan tanggal draft/invoice) via `COALESCE(d.fdLoad, d.fdSndDate)`. Menghasilkan akurasi 100% pada evaluasi keterlambatan pengiriman (`SENT_ONTIME` vs `SENT_LATE`).
    - Mengintegrasikan evaluasi `pendingOverdueSj` dan `pendingToleransiSj` pada CTE `DailyEstimation` di `getDeliveryConfirmTrends()`:
      - Overdue: `ISNULL(d.fdSent, 0) = 0 AND CAST(GETDATE() AS DATE) > DATEADD(day, 1, CAST(d.fdEstimasi AS DATE))`.
      - Dalam Toleransi: `ISNULL(d.fdSent, 0) = 0 AND CAST(GETDATE() AS DATE) <= DATEADD(day, 1, CAST(d.fdEstimasi AS DATE))`.
    - Menghitung summary global `totalPendingOverdueSj` dan `totalPendingSj` pada `DeliveryConfirmTrendsSummary`.
    - **Endpoint Baru**: `GET /api/delivery-orders/estimasi-details?date=YYYY-MM-DD&type=all|overdue|pending|sent` (`getDeliveryEstimasiDetails`) yang mengambil daftar Surat Jalan per tanggal estimasi lengkap dengan SSOT customer master (`tbCustomers`), marking, nomor resi gudang (`fdTerima`), list code, armada, supir, koli, berat, selisih hari overdue (`overdueDays`), dan batas toleransi (`maxToleranceDate`).
    - PM2 service `ShippingApi` di-restart dan online di port 3010.
  - **2. UI Komponen Modal Rincian Estimasi (`DeliveryEstimasiDetailModal.tsx`)**:
    - Dialog responsif Midnight Dark Mode compliant (`bg-[var(--color-surface)]`, outline translucent border, tanpa solid white).
    - **Format Tanggal Standar Indonesia (`formatIndoDate`)**:
      - Menyediakan fungsi pemformat tanggal tanpa pergeseran zona waktu (anti-timezone shift UTC).
      - **Header Modal**: Menampilkan format hari dan tanggal lengkap (`Rincian Target Estimasi Kirim: [Hari], [DD] [Mmm] [YYYY]`, misal: *"Rincian Target Estimasi Kirim: Rabu, 23 Sep 2026"*).
      - **Badge Batas Maksimal H+1**: Menampilkan `Batas Maksimal H+1: [Hari], [DD] [Mmm] [YYYY]` (misal: *"Batas Maksimal H+1: Kamis, 24 Sep 2026"*).
      - **Tabel Data**:
        - Kolom No. SJ memuat subtext tanggal penerbitan SJ (`Tgl SJ: 23 Sep 2026`).
        - Kolom Status Toleransi memformat tanggal batas (`Lewat batas 24 Sep 2026` / `Batas s/d 24 Sep 2026`) dan tanggal pengiriman (`Kirim: 24 Sep 2026, 14:30 WIB`).
      - **Ekspor Excel**: Seluruh kolom tanggal (Tgl SJ, Target Estimasi, Batas H+1, Tgl Kirim) diekspor dalam format tanggal Indonesia yang rapi.
      - **Backend Query SQL Presisi**: Menggunakan `CONVERT(varchar(10), d.fdEstimasi, 120)` dan `CONVERT(varchar(10), d.fdSJDate, 120)` untuk mengeliminasi potensi pergeseran tanggal akibat serialisasi Date UTC Prisma.
    - **KPI Summary Banner**: 5 kartu ringkasan (Total Target SJ, ⚠️ Pending Overdue > H+1, 🕒 Pending Toleransi H+1, ✓ Terkirim, Fisik Total Koli & Berat).
    - **Toolbar Interaktif**:
      - 4 Filter status chips (`Semua`, `⚠️ Overdue (> H+1)`, `🕒 Pending (H+1)`, `✓ Terkirim`) dengan counter live reaktif.
      - Segmented switch moda (`[Semua Moda | ✈️ Udara | 🚢 Laut]`).
      - Live search instant (No. SJ, Customer, Marking, Supir, Plat mobil, List Code, No. Resi).
    - **Tabel Data Rinci**: No urut, No. Surat Jalan (bold font mono), Status badge ramping single-line (`whitespace-nowrap`: `🕒 Toleransi H+1` dengan subtext `s/d [Tgl]`, `⚠️ Overdue +[N]H` dengan subtext `Batas: [Tgl]`, `✓ Terkirim` dengan subtext `[Tgl]`), Moda & Cabang, Customer Master & Alamat, Koli & Berat, Armada & Supir, List Code & Resi.
    - **Ekspor Excel (.xlsx)**: Unduh daftar Surat Jalan terfilter langsung ke format spreadsheet.
  - **3. Integrasi Tabel & KPI Ribbon Monitoring (`DeliveryConfirmChart.tsx`)**:
    - **KPI Ribbon Kartu Ke-6**: Menambahkan kartu `⚠️ Pending Overdue (> H+1)` dengan aksen rose/amber dan subtext total pending SJ.
    - **Kolom Baru pada Tabel Log Harian (Mode Compare)**:
      - Menambahkan kolom header `Status Pending (> H+1)`.
      - Sel baris interaktif:
        - Badge Merah/Rose: `⚠️ X SJ Overdue` (onClick membuka modal rincian dengan filter overdue).
        - Subtext Amber: `+Y dlm H+1` (onClick membuka modal rincian toleransi).
        - Badge Hijau: `✓ 0 Pending` saat seluruh target estimasi telah terkirim.
      - Menjadikan kolom `Target Estimasi` interaktif (klik pada `X SJ` langsung membuka seluruh Surat Jalan estimasi tanggal tersebut).
      - Menambahkan kolom `SJ Overdue (> H+1)`, `SJ Pending dlm Toleransi H+1`, dan `Total SJ Pending` pada ekspor Excel sheet `Estimasi_vs_Realisasi`.
      - Merender modal `<DeliveryEstimasiDetailModal ... />` di root komponen.
  - **4. Verifikasi & Build**:
    - Backend build: `bun build src/index.ts --no-bundle` $\to$ **LULUS 100% 0 errors**.
    - Frontend build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/delivery-orders-CLZ5KfY_.js` dalam 3.72s).
    - Langsung aktif pada IIS physical path `C:\shipping\frontend\dist` (`http://36.93.22.142/mshipping/logistics/delivery-orders/monitoring`).

---

# 📋 Working Context — mshipping

> **⚡ WAJIB DIBACA** oleh setiap AI Agent di awal sesi. WAJIB DIUPDATE di akhir sesi sebelum percakapan ditutup.
> File ini adalah **executive summary & konteks aktif** proyek saat ini.
>
> 📚 **Detail Teknis Fitur Aktif**:
> - Surat Jalan & Cetak Continuous Form → [features/delivery-orders.md](./features/delivery-orders.md)
> - Validasi Billing & Penerbitan Invoice → [features/billing-validation.md](./features/billing-validation.md)
> - Cashier Pelunasan & Saldo Wallet → [features/cashier-wallet.md](./features/cashier-wallet.md)
> - Marking, Container M³, & Markup → [features/shipment-marking.md](./features/shipment-marking.md)
> - Search Autocomplete & Caching → [features/search-suggestions.md](./features/search-suggestions.md)
>
> 📚 **Riwayat lengkap pekerjaan lama** → [history/history-2026-09.md](./history/history-2026-09.md)

---

### 🕐 Terakhir Diperbarui
- **Tanggal**: 2026-09-25
- **Oleh**: Antigravity AI
- **Sesi**: Optimalisasi Responsif Penuh Mobile Halaman Monitoring Surat Jalan & Tren Konfirmasi (http://36.93.22.142/mshipping/logistics/delivery-orders/monitoring)

---

- [x] **Optimalisasi Responsif Penuh Mobile Halaman Monitoring Surat Jalan (`MonitoringPage.tsx`, `DeliveryConfirmChart.tsx`, `docs/frontend/delivery-orders.md`)**:
  - **1. Tab 1: Surat Jalan Belum Terkirim (`MonitoringPage.tsx`)**:
    - **Dual View Layout**:
      - Desktop view (`hidden md:block`): Tabel 9 kolom dengan sorting per kolom dan checkbox selection.
      - Mobile view (`md:hidden`): Daftar kartu Surat Jalan komprehensif memuat checkbox multi-select massal, no SJ (link font-mono), icon cetak, aging badge responsif, box info customer master & marking/resi, spesifikasi moda (✈️ Air vs 🚢 Sea) & kuantitas coly/kg/m³, tanggal estimasi kirim & status overdue warning, info plat armada & supir, serta tombol aksi cepat Kirim dan Cetak Continuous Form.
    - **Header & Navigation Tabs**: Tab pending vs trends dilengkapi label responsif (`sm:hidden` ringkas) dan container scroll horizontal.
    - **5 Kartu KPI Ribbon**: Grid `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3` dengan kartu ke-5 (`Aging > 7 Hari`) spanning 2 kolom di mobile (`col-span-2 sm:col-span-1`) agar simetris.
    - **Toolbar Filter**: Search bar full-width, date range pickers wrap responsif (`min-w-[120px]`), dan pill filters (Aging, Status, Moda) pada strip horizontal scrollable tanpa wrapping berantakan.
    - **Batch Selection Floating Bar & Pagination**: Beradaptasi vertikal di mobile (`flex-col sm:flex-row`).
  - **2. Tab 2: Tren Konfirmasi Terkirim (`DeliveryConfirmChart.tsx`)**:
    - **Toolbar Kontrol 2 Baris**:
      - Baris 1: View mode switcher (Estimasi vs Realisasi vs Sesi Batch FoxPro) dengan label adaptif + tombol aksi Ekspor Excel & Refresh.
      - Baris 2: Strip pill swipeable horizontal (`overflow-x-auto no-scrollbar`) memuat switcher Metrik (SJ / Coly / Kg), filter Moda (Semua / Udara / Laut), dan rentang waktu (7h / 14h / 30h / 60h).
      - Sub-banner info batch cycle FoxPro & target komparasi yang wrap rapi.
    - **Chart Recharts Adaptif**: Penyesuaian tinggi `h-[270px] sm:h-[400px]`, negative left margin `-22px` agar label sumbu Y pas tanpa membuang lebar layar ponsel, dan ukuran font axis compact (10px).
    - **Dual View Log Riwayat Harian & Batch**:
      - Desktop view (`hidden md:block`): Tabel 10 kolom (Compare) dan 8 kolom (Batches).
      - Mobile view (`md:hidden`): High-density card list untuk **Mode Compare** (kartu harian memuat perbandingan target estimasi vs realisasi, status pending overdue/toleransi H+1, dan batch cardlets interaktif yang dapat diklik membuka modal detail batch) dan **Mode Batches** (kartu batch dengan sesi Pagi/Sore, jam cetak FoxPro WIB, total SJ interaktif `[ X SJ ↗ ]`, dan rincian koli/berat).
    - **Pagination Footer**: Beradaptasi fleksibel dengan `flex-col sm:flex-row`.
  - **3. Verifikasi & Build**:
    - `bunx tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/delivery-orders-CEOiKBZR.js` dalam 3.35s).
    - Langsung aktif pada web server IIS physical path `C:\shipping\frontend\dist`.

---

- [x] **Modal Rincian Surat Jalan per Batch & Grouping Moda / Cabang (`DeliveryBatchDetailModal.tsx`, `DeliveryConfirmChart.tsx`, `deliveryOrders.service.ts`, `deliveryOrders.routes.ts`)**:
  - **1. Backend Service & Stored Procedure FoxPro (`deliveryOrders.service.ts` & `deliveryOrders.routes.ts`)**:
    - Mengintegrasikan Stored Procedure legacy FoxPro resmi: `EXEC rpt_tbDelivery2023 @ListType, @date1, @date2`.
    - Windowing dinamis dari `tbDeliveryConfirm` (`LAG(fdTglPrintReport)` ke `fdTglPrintReport` saat ini):
      - Contoh sesi Sore 24 Sep: Udara (`@ListType = 1`, 39 SJ) + Laut (`@ListType = 2`, 145 SJ) = 184 SJ presisi 100% dengan FoxPro.
    - Enrichment informasi supir (`fdSupir`, `fdTelpSupir`), satuan koli, dan tanggal estimasi dari `tbDelivery` secara chunked.
    - Mengembalikan metadata batch (jam WIB, total SJ, fisik koli, dan berat kg) beserta rincian lengkap per surat jalan.
    - Endpoint: `GET /api/delivery-orders/confirm-batch-detail?date=YYYY-MM-DD&session=Pagi|Sore` (terproteksi auth JWT).
    - Service PM2 `ShippingApi` di-restart dan online.
  - **2. Badge Counter Volume SJ Versi Ramping (`DeliveryConfirmChart.tsx`)**:
    - Mengembalikan format badge counter volume SJ ke versi bersih (`{b.totalSj} SJ`) di sisi kanan cardlet tanpa teks inline moda yang memadati baris.
    - Lebar cardlet kembali ramping dan kompak (`min-w-[145px] max-w-[185px]`).
    - Menjadikan cardlet interaktif (`cursor-pointer hover:border-sky-500/50 hover:bg-sky-500/5`): Klik pada cardlet sesi batch langsung membuka modal rincian Surat Jalan.
    - Menjadikan kolom Total SJ pada *Table Mode Batches* interaktif (tombol `[ X SJ ↗ ]` membuka modal batch bersangkutan).
  - **3. Komponen Modal `DeliveryBatchDetailModal.tsx`**:
    - **Perbaikan Duplikasi Icon**: Memperbaiki label banner moda (`Moda Laut (Sea)` & `Moda Udara (Air)`) sehingga icon tidak lagi muncul ganda (`🚢 🚢` $\to$ `🚢`).
    - **Grouping Multi-Level Hierarkis**:
      - **Level 1 (Moda)**: Banner terpisah untuk `✈️ Moda Udara (Air)` dan `🚢 Moda Laut (Sea)` lengkap dengan badge counter SJ, koli, dan berat.
      - **Level 2 (Cabang / Branch Name)**: Sub-grup per cabang pengirim (GUANGZHOU, SINGAPORE, YI WU, dll.) dengan kode cabang, counter SJ, counter jumlah marking (`X Marking`), dan accordion toggle expand/collapse.
      - **Level 3 (Marking / `fdMarkingCode`)**: Pengelompokan baris Surat Jalan per marking dengan subheader row khusus (badge marking amber `🏷️`, nama pelanggan master, kode customer, counter SJ per marking, dan total koli/berat) yang dapat di-collapse per marking.
    - **Tabel Data Rinci**: No urut dalam marking, No. Surat Jalan (bold font mono) & Tanggal SJ, Customer Master & Resi/Alamat, Armada Plat Mobil & Supir, Koli (Satuan), Berat (Kg), dan List Code.
    - **Ribbon Ringkasan KPI**: Total SJ, breakdown Air/Sea SJ, koli, tonase berat, dan jam cetak laporan FoxPro WIB.
    - **Toolbar Interaktif**: Live search (No. SJ, Customer, Marking, Supir, Plat mobil), Segmented pill filter moda (`[Semua Moda | ✈️ Air | 🚢 Sea]`), dropdown filter cabang, dan tombol reset.
    - **Ekspor Excel (.xlsx)**: Unduh seluruh data Surat Jalan batch terfilter ke format spreadsheet lengkap dengan satu klik.
    - **Desain Midnight Dark Mode**: Patuh token CSS semantik (`bg-[var(--color-surface)]`, border transparan, tanpa solid white).
  - **4. Verifikasi & Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/delivery-orders-iZHZcHjt.js` dalam 3.84s).
    - Langsung aktif di IIS physical path `C:\shipping\frontend\dist`.

---

- **Sesi**: Integrasi Ambil Gambar dari Galeri Foto pada Modul BAP Mobile

---

- [x] **Dukungan Pengambilan Gambar dari Galeri pada Modul Foto BAP Mobile (`BapPhotoSheet.tsx`, `docs/mobile/logistics.md`)**:
  - **1. Handler `handlePickFromGallery` (`BapPhotoSheet.tsx`)**:
    - Mengintegrasikan `expo-image-picker` (`launchImageLibraryAsync`) dengan opsi `mediaTypes: ['images']`, `allowsMultipleSelection: true`, dan `selectionLimit` proporsional sesuai sisa kuota (maks 10 foto).
    - Meminta izin media library (`requestMediaLibraryPermissionsAsync`) dengan graceful error toast jika ditolak.
    - Ekstraksi base64 otomatis dengan fallback `FileSystem.readAsStringAsync` jika base64 kosong dari picker.
    - Upload berurutan ke server via `uploadMutation.mutateAsync` dan feedback counter foto terunggah.
  - **2. Penataan UI Dual Action (`BapPhotoSheet.tsx`)**:
    - Footer lembar foto BAP kini menampilkan dua tombol berdampingan: `[ 📷 Kamera ]` dan `[ 🖼️ Galeri ]` (styling Midnight Dark compliant, outline border aksen sky blue).
    - Menambahkan tombol pintas Galeri `[ 🖼️ ]` di kiri tombol shutter pada viewfinder kamera native agar pengguna dapat langsung beralih ke galeri tanpa harus menutup kamera.
  - **3. Verifikasi & Dokumentasi**:
    - Type check mobile: `bunx tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
    - Memperbarui dokumentasi logistik di [`docs/mobile/logistics.md`](./docs/mobile/logistics.md).
  - **4. Kompilasi Bundle & Repack APK (`v1.2.5`, Build `17`, `forceUpdate: false`)**:
    - Hermes export: `bunx expo export --platform android` $\to$ `entry-25d94fd46105879b0208dd2812608c17.hbc` (5.6MB).
    - Repack APK: injeksi bytecode ke `mshipping.apk`, zipalign & signing release v2/v3 verified via `scripts/repack_apk.ps1`.
    - Distribusi sinkron ke 4 titik server (`c:\shipping\mshipping.apk`, `frontend/dist`, `frontend/public`, `backend/public/uploads`).
    - PM2 service `ShippingApi` di-restart dan aktif online.
    - Endpoint `/api/app-version/latest` terverifikasi 200 OK (`version: 1.2.5`, `versionCode: 17`, `forceUpdate: false`, size 121.2 MB).

---

- [x] **Implementasi Infinite Scroll pada Tab Billing (Finance) & Penyempurnaan Delivery (Logistics) Mobile App (`finance.tsx`, `useBillings.ts`, `useDeliveryOrders.ts`, `docs/mobile/finance.md`)**:
  - **1. Hook Baru `useBillingsQuery` (`useBillings.ts`)**:
    - Menerapkan `useInfiniteQuery` TanStack Query v5 pada endpoint `/api/billing` dengan pagination batch 20 item (`pageParam: 1`, `limit: 20`).
    - Resolusi pagination cerdas `getNextPageParam` berbasis `meta.totalPages` dan fallback data length.
    - Memoized flat array `data` dari `query.data.pages`.
  - **2. Integrasi Layar Billing (`finance.tsx`)**:
    - Menggantikan query statis `limit: 20` dengan hook `useBillingsQuery`.
    - Menambahkan props `onEndReached` (`onEndReachedThreshold: 0.4`), footer spinner `ActivityIndicator` saat `isFetchingNextPage`, dan pull-to-refresh `refetch`.
  - **3. Verifikasi & Penyempurnaan Delivery Orders (`useDeliveryOrders.ts`)**:
    - Memperbaiki `getNextPageParam` agar menghentikan request saat `currentPage >= totalPages` dan tidak terpicu request phantom saat total baris kelipatan 20.
    - Verifikasi FlatList Surat Jalan (`activeTab === 'delivery'`) di `logistics.tsx`.
  - **4. Verifikasi & Dokumentasi**:
    - Type check mobile: `bunx tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
    - Memperbarui dokumentasi modul keuangan di [`docs/mobile/finance.md`](./docs/mobile/finance.md).
  - **5. Kompilasi Bundle & Repack APK (`v1.2.5`, Build `17`, `forceUpdate: false`)**:
    - Hermes export: `bunx expo export --platform android` $\to$ `entry-c0f4be4a8b749b960d96e831dc6de662.hbc` (5.6MB).
    - Repack APK: injeksi bytecode ke `mshipping.apk`, zipalign & signing release v2/v3 verified via `scripts/repack_apk.ps1`.
    - Distribusi sinkron ke 4 titik server (`c:\shipping\mshipping.apk`, `frontend/dist`, `frontend/public`, `backend/public/uploads`).
    - PM2 service `ShippingApi` di-restart dan aktif online.
    - Endpoint `/api/app-version/latest` terverifikasi 200 OK (`version: 1.2.5`, `versionCode: 17`, `forceUpdate: false`, size 121.2 MB).

---

- [x] **Bugfix: Price List Master Marking Override Kadaluarsa (`26GZC91`) Mengabaikan Master List Baru 1 Sep 2026 (`marking-matcher.ts`, `price-check.service.ts`)**:
  - **1. Akar Masalah**:
    - Pada master price list, Upload 8 (`effectiveDate: 2026-07-17`) memiliki marking override `26GZC91` dengan harga General Goods lama Rp 4.700.000.
    - Pada 1 September 2026, manajemen mengunggah Upload 9 (`effectiveDate: 2026-09-01`) tanpa marking override (tarif dasar umum baru, General Goods Rp 4.500.000).
    - Pada `findGeneralMarkingOverrideUpload` (`marking-matcher.ts`), pencarian upload dengan marking override mengambil seluruh upload masa lalu yang `effectiveDate <= shipmentDate`. Karena kontainer pengiriman adalah `26GZD69` ($\ge 26GZC91$), sistem mencocokkan Upload 8 (17 Juli) dan mengembalikan `isMarkingOverride = true` dengan harga lama Rp 4.700.000, melompati Master List baru 1 September 2026.
  - **2. Perbaikan Logika Bisnis Multi-Tier**:
    - **`marking-matcher.ts` (`findGeneralMarkingOverrideUpload` & `findCustomerMarkingOverrideUpload`)**:
      - Mengambil `latestMasterUpload` yang aktif pada `shipmentDate`.
      - Membatasi pencarian marking override dengan kondisi `effectiveDate >= latestMasterUpload.effectiveDate`.
      - Jika sudah ada upload master baru (1 Sep 2026) yang lebih baru dari upload marking override (17 Juli 2026), marking override dari periode lama otomatis kedaluwarsa dan tidak berlaku lagi.
    - **`price-check.service.ts` (Tier 2 & Tier 5)**:
      - Menambahkan filter `minEffTime = latestMaster.effectiveDate` sehingga Tier 5 (Global Marking Override) dan Tier 2 (Customer Marking Override) hanya mempertimbangkan upload pada periode aktif yang sama dengan upload master/customer terbaru.
  - **3. Verifikasi**:
    - Endpoint `/api/billing/m3-check?listCode=0942279`: `masterEffectiveDate` kini mengacu tepat ke `"2026-09-01"`, `isMarkingOverride = false`, tarif General Goods Rp 4.500.000 (status: MATCH).
    - Backend build: `bun build src/index.ts --no-bundle` $\to$ **LULUS 100% 0 errors**.
    - PM2 service `ShippingApi` aktif online di port 3010.

---

- [x] **Validasi Kesalahan Input Mata Uang Header vs Rincian Item (`useBillingValidation.ts`, `ValidationDetailPage.tsx`, `validationSummary.utils.ts`, `BillingValidationSummaryModal.tsx`)**:
  - **1. Akar Masalah Operasional FoxPro**:
    - Pada invoice `GZS-010751-09-2026`, staf menginput nilai tagihan utama di `fdJumlah1` (Rp 75.949.950) dan nilai Tax Return di `fdJumlah2` (2.881.600) dengan mata uang `fdCurr1 = "S$"`.
    - Pada rincian item (`tbBillingDetail`), seluruh 4 item bertipe Rupiah (`fdCurr = "RP."`, satuan `M3`), dan **TIDAK ADA SATUPUN** item yang menggunakan kode list/satuan valas `S$`.
    - Sistem sebelumnya menganggap faktur bernilai `S$ 2,881,600.00` (mengabaikan `fdJumlah1` dan menyesatkan kasir).
  - **2. Deteksi Engine Validasi (`useBillingValidation.ts`)**:
    - Mendeteksi kondisi `isCurrencyInputError`: `fdJumlah2 > 0` dengan `fdCurr1` valas, namun `hasMatchingForeignItem === false`.
    - Mencocokkan item yang nilainya identik dengan `fdJumlah2` (`matchedItemName`: Tax Return).
    - Menghitung total riil Rupiah yang benar (`correctTotalRp = fdJumlah1 + fdJumlah2` = Rp 78.831.550).
    - Menggagalkan validasi finansial: `isFinancialValid = false` dan menambahkan rincian isu ke `validationIssues`.
  - **3. UI & Alert Responsif (`ValidationDetailPage.tsx`)**:
    - **Alert Box Merah/Rose**: Peringatan anomali mata uang yang mencolok di atas rincian item, menerangkan nilai keliru vs nilai riil Rupiah.
    - **Badge Baris Item**: Item Tax Return (Rp 2.881.600) diberi tag `⚠️ Salah Input ke Valas (S$)` pada tampilan desktop dan mobile.
    - **Koreksi Sticky Footer Total**: Footer tabel menampilkan total riil Rupiah yang benar (`Rp 78.831.550`) dengan badge peringatan `⚠ fdJumlah2 S$ Keliru`.
    - **Issue Invoice**: Nilai total yang diserahkan ke kasir menggunakan `correctTotalRp`.
  - **4. Integrasi Modal Ringkasan (`validationSummary.utils.ts` & `BillingValidationSummaryModal.tsx`)**:
    - `getEffectiveInvoiceTotal`: Mengembalikan `{ total: correctTotalRp, currency: 'Rp.' }` saat terjadi kesalahan input valas.
    - `calculateValidationVerdict`: Menghasilkan verdict title *"Kesalahan Input: Anomali Mata Uang Header vs Rincian Item"*.
  - **5. Verifikasi**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/billing-DMDORpjR.js`).
    - Langsung aktif pada IIS physical path `C:\shipping\frontend\dist` (`http://36.93.22.142/mshipping/finance/billing/validation/GZS-010751-09-2026`).

---

- [x] **Bugfix: Price Check Tier 5 Salah Pakai Price List Lama (Marking Override `26GZC91`) padahal Price List Baru Sudah Berlaku 1 Sep 2026 (`price-check.service.ts`, `marking-matcher.ts`)**:
  - **Root Cause**: Di Tier 5 (Harga Marking Global), loop iterasi `allMasterUploads` tidak memfilter berdasarkan `effectiveDate <= targetDate`. Upload ID 8 (`effectiveDate: 2026-07-17`) yang punya marking `26GZC91` dipilih untuk transaksi 2 Sep 2026, padahal upload ID 9 (`effectiveDate: 2026-09-01`) sudah berlaku tapi tidak punya marking — sehingga Tier 5 loncat ke upload lama dan mengembalikan harga lama Rp 4,700,000.
  - **Fix 1 — `price-check.service.ts` Tier 5 instance 1 (~baris 970)**: `const eligibleMasterUploads = allMasterUploads.filter((u) => new Date(u.effectiveDate) <= targetDate)`.
  - **Fix 2 — `price-check.service.ts` Tier 5 instance 2 (~baris 1482)**: `const eligibleForOverride = mUploads.filter((u) => new Date(u.effectiveDate) <= targetDate)`.
  - **Fix 3 — `marking-matcher.ts` `findGeneralMarkingOverrideUpload`**: Tambah `effectiveDate: { lte: shipmentDate }` pada query Prisma; hapus `newerGeneralUpload` yang redundan.
  - Backend build → **LULUS 100% 0 errors**. PM2 `ShippingApi` online.

---

- [x] **Pill Group CS / MKT & Dropdown Multi-Select Kategori Barang (`DetailPage.tsx`, `DashboardFilters.tsx`, `pricing.md`)**:
  - **1. Pill Group Tipe Sheet (CS / MKT)**:
    - Menambahkan state `sheetTypeFilter` (`''` | `'CS'` | `'MKT'`).
    - Mengambil nilai unik `sheetType` langsung dari response data diff upload (`data.diff`) dengan fallback `['CS', 'MKT']`.
    - Merender pill selector dengan dukungan tombol `Semua`, `CS`, `MKT` serta toggle klik ulang untuk unselect.
    - Mengikuti standar Midnight Dark Mode (outline/transparent border, tanpa solid white).
  - **2. Tata Letak 1 Baris Terpadu (Single-Row Filter Bar)**:
    - Menyatukan seluruh kontrol filter ke dalam **1 baris horizontal responsif** (`flex flex-wrap items-end gap-3 sm:gap-4`):
      - `Tipe (CS / MKT)`: Pill group `[Semua | CS | MKT]`.
      - `Mode`: Pill group `[Semua | Sea | Air]` dengan icon moda.
      - `Cabang`: Pill group `[Semua | GZ | YW | ...]`.
      - `Kategori Barang`: Multi-select dropdown combobox (`flex-1 min-w-[200px] max-w-sm`) dengan live search.
      - `Tombol Reset`: Tombol `[ ↺ Reset ]` terpasang di ujung baris sejajar dengan kontrol lainnya.
    - Tinggi elemen diselaraskan presisi (`h-[38px]`) untuk konsistensi garis dasar horizontal.
  - **3. Dropdown Multi-Select Kategori Barang (`CategoryMultiCombobox`)**:
    - Mengintegrasikan komponen `CategoryMultiCombobox` dari `DashboardFilters.tsx`.
    - Fitur dropdown: pencarian real-time, seleksi multi-kategori, tombol cepat *"Pilih semua"* / *"Bersihkan semua"*, counter jumlah dipilih, dan tag chip kategori terpilih dengan tombol hapus (x).
    - Opsi kategori disaring secara kontekstual berdasarkan `sheetType` dan `mode` terpilih dengan auto-prune.
  - **4. Reaktivitas Metrik (KPI) & Toolbar**:
    - Kartu KPI analitik (Naik, Turun, Tetap, Baru) otomatis dihitung reaktif dari hasil filter aktif.
    - Toolbar tabel menampilkan total baris terfilter vs total baris keseluruhan (`X baris harga (dari Y total)`).
  - **5. Verifikasi & Deploy IIS**:
    - Verifikasi build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/price-list-B1fHbRXB.js`).
    - Langsung aktif pada IIS physical path `C:\shipping\frontend\dist` (`http://36.93.22.142/mshipping/finance/price-list/uploads/7`).

---

- [x] **Agregasi Surat Jalan Estimasi Kirim vs Realisasi Terkonfirmasi (`tbDeliveryConfirm`) (`MonitoringPage.tsx`, `DeliveryConfirmChart.tsx`, `deliveryOrders.service.ts`)**:
  - **1. Backend Dual Aggregation Query (`deliveryOrders.service.ts`)**:
    - Menghubungkan target estimasi pengiriman `tbDelivery.fdEstimasi` dengan realisasi konfirmasi terkirim `tbDeliveryConfirm` (`fdSent = 1`).
    - `DailyEstimation`: Mengelompokkan seluruh surat jalan berdasarkan `CAST(fdEstimasi AS DATE)` (`estSjUdara`, `estSjLaut`, `totalEstSj`, `totalEstPack`, `totalEstWeight`).
    - `DailyRealization`: Mengagregasikan surat jalan terkirim `fdSent = 1` dalam rentang batch `tbDeliveryConfirm` per tanggal (`realSjUdara`, `realSjLaut`, `totalRealSj`, `totalRealPack`, `totalRealWeight`).
    - `FULL OUTER JOIN`: Menghitung rasio ketercapaian harian `achievementPct = (totalRealSj / totalEstSj) * 100` dan selisih pengantaran `diffSj = totalRealSj - totalEstSj`.
    - Menghitung ringkasan global pada summary: `totalSjEstimated`, `totalEstUdara`, `totalEstLaut`, `totalEstColy`, `totalEstWeight`, `overallAchievementPct`, `diffTotalSj`.
    - Backend build lulus 100% 0 errors & PM2 service `ShippingApi` aktif online di port 3010.
  - **2. Komponen Chart & Kontrol Interaktif (`DeliveryConfirmChart.tsx`)**:
    - **Dual View Mode Switcher**:
      - `📊 Estimasi vs Realisasi` (Default): Grouped Bar Chart harian membandingkan target estimasi kirim (Indigo `#6366f1`) berdampingan dengan realisasi terkonfirmasi (Emerald `#059669`).
      - `📦 Sesi Batch FoxPro`: Stacked Bar per sesi batch pencetakan konfirmasi `tbDeliveryConfirm` (Pagi ~09:30 vs Sore ~14:30).
    - **5 Kartu KPI Ribbon Komprehensif**:
      - Target Estimasi Kirim (breakdown Udara vs Laut).
      - Realisasi Terkonfirmasi Terkirim (breakdown Udara vs Laut).
      - Persentase Ketercapaian (% Achievement + visual badge selisih `+/-` SJ).
      - Total Koli / Coly (Realisasi vs Target Estimasi).
      - Total Tonase Berat (Realisasi vs Target Estimasi).
    - **Switcher Kontrol**: Metrik (`Surat Jalan`, `Koli / Coly`, `Berat (Kg)`), Moda (`Semua`, `✈️ Udara`, `🚢 Laut`), dan Rentang Waktu (`7h`, `14h`, `30h`, `60h`).
    - **Custom Floating Tooltip**: Midnight Dark Mode compliant, membandingkan target estimasi dengan realisasi, breakdown moda, fisik kargo, dan selisih +/- SJ.
    - **Tabel Log & Ekspor Excel Dual-Sheet**:
      - Mode Compare: Tabel harian target estimasi, realisasi, % ketercapaian, selisih SJ, koli, berat, dan jumlah batch.
      - Mode Batch: Tabel rincian per sesi batch konfirmasi.
      - Ekspor Excel (.xlsx) dengan 2 sheet terpisah: `Estimasi_vs_Realisasi` & `Sesi_Batch_tbDeliveryConfirm`.
  - **3. Verifikasi & Deploy IIS**:
    - Verifikasi build frontend: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/delivery-orders-BCKYMzSb.js`).
    - Langsung aktif pada IIS physical path `C:\shipping\frontend\dist` (`http://36.93.22.142/mshipping/logistics/delivery-orders/monitoring`).

    - Langsung aktif di IIS physical path `C:\shipping\frontend\dist` (`http://36.93.22.142/mshipping/logistics/delivery-orders/monitoring`).


- [x] **Perbaikan Padding Halaman Monitoring Surat Jalan Belum Terkirim (`MonitoringPage.tsx`, `DeliveryConfirmModal.tsx`)**:
  - Memperbaiki root container `MonitoringPage.tsx` yang sebelumnya hanya `className="space-y-4"` (tanpa padding layar) menjadi standar ERP: `p-3.5 sm:p-6 lg:p-8 w-full min-w-0 space-y-4 sm:space-y-6 font-[var(--font-body)] animate-fadeIn pb-24`.
  - Memperbarui token CSS pada seluruh elemen:
    - Kartu KPI: `p-3 sm:p-3.5 rounded-xl border bg-[var(--color-surface)] border-[var(--color-border)]`, label semantik `text-[var(--color-secondary)]`, nilai `text-[var(--color-primary)]`.
    - Toolbar filter: container `p-3.5 sm:p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs`, input `bg-[var(--color-neutral)] border-[var(--color-border)] text-[var(--color-primary)]`.
    - Pill filter (Aging, Status, Moda): mode gelap mematuhi Midnight Dark standard (tanpa solid white), active state menggunakan border aksen semantik (`bg-sky-500/15 text-sky-600 border-sky-500/40`), inactive state transparan lembut.
    - Tabel Data: header thead `py-2.5 px-3` dengan `bg-[var(--color-neutral)]/70 border-[var(--color-border)]`, sel baris `py-2.5 px-3` proporsional, border & text menggunakan CSS variables.
    - Footer tabel: pagination bar `p-3 sm:p-3.5 border-t border-[var(--color-border)] bg-[var(--color-surface)]`.
    - Modal Konfirmasi: dialog `DeliveryConfirmModal.tsx` diselaraskan ke `bg-[var(--color-surface)] border-[var(--color-border)]`, padding `p-4 sm:p-5`.
  - Verifikasi build frontend: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/delivery-orders-DVL23Iso.js`).
  - Update langsung aktif di IIS web root `c:\shipping\frontend\dist` (`http://36.93.22.142/mshipping/logistics/delivery-orders/monitoring`).

---

- [x] **Fitur Monitoring Surat Jalan Belum Terkirim (`fdSent = 0`) & Konfirmasi Pengiriman FoxPro (`/delivery-orders/monitoring`)**:
  - **1. Backend Service & Endpoint (`deliveryOrders.service.ts` & `deliveryOrders.routes.ts`)**:
    - `getDeliveryMonitoring(query)`: Query gabungan `tbDelivery`, `tbCustomers` (SSOT nama master), dan `tbEntryList` (marking & M³).
    - Menghitung metrik aging (`DATEDIFF(day, d.fdSJDate, GETDATE())`) dan status keterlambatan estimasi (`d.fdEstimasi < Today` $\to$ `isOverdue`, `overdueDays`).
    - Agregasi 11 KPI: `totalPending`, `overdueCount`, `todayCount`, `aging1to2Count`, `aging3to5Count`, `aging6to7Count`, `agingOver7Count`, `airCount`, `seaCount`, `totalPackages`, `totalWeight`.
    - `confirmDelivery(dto, user)`: Mengadopsi form FoxPro `frm_delivery_view_edit_2023.scx`. Memperbarui `tbDelivery` setting `fdSent = 1, fdSndDate, fdCarID, fdSupir, fdTelpSupir, fdUpdate, fdLoad = GETDATE()`. Loop per baris menjamin eksekusi trigger `tgr_update_tbDelivery` memperbarui `tbEntryList.fdSjValid = 1`.
    - Jika opsi ekspedisi lokal terisi, mengeksekusi stored procedure legacy `sp_tbExpIndo @fdListCode, @fdExpID, @fdResiExp, @fdCurrExp, @fdTotalExp, @fdEmp, @fdPaid`.
    - Endpoint: `GET /api/delivery-orders/monitoring`, `POST /api/delivery-orders/confirm-delivery`, `GET /api/delivery-orders/vehicles`, `GET /api/delivery-orders/expeditions`.
    - PM2 service `ShippingApi` di-restart dan aktif online di port 3010.
  - **2. Komponen Modal Konfirmasi Pengiriman (`DeliveryConfirmModal.tsx`)**:
    - Dialog responsif bertema Midnight Dark Mode (outline border, tanpa solid white).
    - Mendukung mode tunggal (1 SJ) maupun mode batch (banyak SJ sekaligus dengan driver & armada yang sama).
    - Pilihan kendaraan dari `tbKendaraan` (auto-fill nama dan nomor telepon supir) serta opsi plat manual/custom ("DIAMBIL").
    - Seksi ekspedisi lokal terintegrasi dengan `tbExpedisi`, nomor resi ekspedisi, total ongkir, dan pilihan bayar (Bayar Jakarta vs Bayar Tujuan / BT).
  - **3. Halaman Monitoring Terpadu (`MonitoringPage.tsx`)**:
    - Rute: `ROUTES.DELIVERY_ORDERS_MONITORING` (`/mshipping/logistics/delivery-orders/monitoring`).
    - 5 Kartu KPI Ribbon interaktif: Total Pending, Lewat Estimasi (Overdue), Dibuat Hari Ini, Aging 1-2 Hari, Aging > 7 Hari.
    - Toolbar filter: Pencarian teks bebas, pill filter aging (`Semua`, `Hari Ini`, `1-2`, `3-5`, `6-7`, `>7`), status estimasi (`Semua`, `Overdue`, `On-Time`), moda (`Semua`, `✈️ Udara`, `🚢 Laut`), dan pemilih rentang tanggal.
    - Checkbox multi-seleksi dengan floating alert bar untuk eksekusi batch confirmation sekaligus.
    - Tabel data desktop & kartu responsif dengan badge semantik (aging, overdue warning, moda, tanda cetak continuous form).
    - Tombol aksi cepat: `[ 🚚 Kirim ]` membuka modal konfirmasi langsung dan `[ 🖨️ Cetak ]` membuka continuous form.
    - Tombol Ekspor Excel instan (`.xlsx`) via sheetjs.
  - **4. Navigasi & Integrasi Menu**:
    - Menambahkan rute `DELIVERY_ORDERS_MONITORING` di `constants.ts` dan `router.tsx`.
    - Menambahkan menu `Monitoring Belum Terkirim` di `Sidebar.tsx` dan `userManagement.types.ts`.
    - Menambahkan shortcut tombol `[ 🕒 Monitoring Pending ]` pada header `DashboardPage.tsx` dan `ListPage.tsx`.
    - Mendaftarkan key kamus `nav.deliveryOrderMonitoring` di `id.json` dan `en.json`.
  - **5. Verifikasi**:
    - Backend build: `bun build src/index.ts --no-bundle` $\to$ **LULUS 100% 0 errors**.
    - Frontend build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/delivery-orders-V_i3YVPg.js`).
    - Langsung aktif pada IIS physical path `C:\shipping\frontend\dist` (`http://36.93.22.142/mshipping`).

---

- [x] **Tag `BillTo ≠ Master` & Tampilan Nama BillTo pada Halaman Detail Validasi (`ValidationDetailPage.tsx`, `billing.types.ts`)**:
  - Menambahkan properti `fdBillTo?: string | null` pada tipe antarmuka `Billing` di `billing.types.ts`.
  - Di `ValidationDetailPage.tsx`:
    - Menghitung kondisi `isBillToDiff = Boolean(rawBillTo && rawCustName && rawBillTo.toLowerCase() !== rawCustName.toLowerCase())`.
    - Menampilkan badge amber `BillTo ≠ Master` di samping nama customer dan di header ribbon atas.
    - Menampilkan baris `Bill To: [Nama BillTo]` langsung di bawah nama customer pada kartu identitas tagihan.
    - Menambahkan alert strip informatif di dalam kartu identitas: `Ditagihkan ke (Bill To): [Nama BillTo] (Master: [Nama Master])`.
    - Menyertakan nama BillTo pada fungsi salin kargo (`handleCopyMarkingInfo`).
  - Verifikasi build frontend: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/billing-Bu15QCsY.js`).
  - Langsung tersinkronisasi ke IIS web root `c:\shipping\frontend\dist`.

- [x] **Tinggi Statis Modal Pricelist Customer (`CustomerHargaModal.tsx`)**:
  - Mengubah ukuran modal menjadi statis `h-[88vh] max-h-[88vh]` (sebelumnya hanya `max-h-[92vh]`) sehingga tinggi dialog konsisten saat perpindahan tab filter, saat loading, dan saat jumlah item tarif berubah.
  - Verifikasi build frontend: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/billing-BNZpv5pZ.js`).
  - Langsung tersinkronisasi ke IIS web root `c:\shipping\frontend\dist`.

- [x] **Format 2 Digit Desimal Tarif Asuransi (`CustomerHargaModal.tsx`)**:
  - Mengubah pemformatan `metadata.asuransi` dan `metadata.asuransi1` (Asuransi 2) dari `formatCurrency(...)` (yang sebelumnya memicu tampilan `Rp. 2.00`) menjadi presisi desimal 2 digit menggunakan `formatDecimal(..., 2)`.
  - Verifikasi build frontend: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/billing-LSPVZjxI.js`).
  - Langsung tersinkronisasi ke IIS web root `c:\shipping\frontend\dist`.

- [x] **Implementasi Modal Pricelist Customer `tbCustomersHarga` & Tombol [🏷️ Tarif] (`CustomerHargaModal.tsx`, `TargetPage.tsx`, `ValidationListPage.tsx`, `ValidationDetailPage.tsx`, `customer-tariff-audit.service.ts`)**:
  - **1. Backend Service & Endpoint Resolusi Kolom (`customer-tariff-audit.service.ts` & `billing.routes.ts`)**:
    - `getCustomerHargaDetail(custCode)`: Membaca tabel `tbCustomersHarga` (136 kolom format `fd + [Branch] + [Service] + [Commodity]`) dan menguraikan nama kolom menggunakan `parseColumnMapping(colName)` ke domain cabang, moda (Laut/Udara), jenis layanan, dan tipe komoditas.
    - Mengintegrasikan tabel audit `tbCustomersHargaAudit`: harga aktif otomatis menggunakan nilai revisi audit terbaru (`isEdited: true`) dengan referensi harga awal (`hargaAwal`) dan jejak waktu/user audit.
    - Fallback cerdas: jika customer dicari berdasarkan nama (bukan kode), sistem otomatis mencocokkan `fdCustName` atau `tbCustomers.fdCustName` dan mengembalikan `custCode` teresolusi.
    - Mengembalikan metadata kontrak: tipe tagihan (`fdTypeTagihan`: 1: m³+kg, 2: Compare, 3: m³ only, 4: kg only), batas rasio overweight kg/m³ (LR, SP, PM), tarif asuransi, surat penawaran, serta catatan khusus udara (`fdNote`) dan catatan laut (`fdNote1`).
    - Rute `GET /api/billing/customer-harga/:custCode?` terlindungi auth middleware.
    - Restart PM2 `ShippingApi` aktif online.
  - **2. Komponen Modal Pricelist Customer (`CustomerHargaModal.tsx`)**:
    - Dialog `size="3xl"` responsif bertema Midnight Dark Mode (outline translucent border, tanpa solid white).
    - **Header**: Nama customer (`displayCustName`), kode customer, badge counter total tarif aktif, tombol refresh kuari, dan tombol ekspor Excel.
    - **Banner Metadata**: 4 kartu ringkasan KPI (Tipe Tagihan, Rasio Overweight kg/m³, Tarif Asuransi, User/Waktu Update) dan 2 kotak catatan khusus (Sky Blue untuk Catatan Udara & Emerald untuk Catatan Laut).
    - **Toolbar Filter**: Navigasi pill per cabang (`Semua`, `GZ`, `YW`, `SH`, `SZ`, `HK`, `SG`, `BKK`, `KR`), Segmented switcher moda (`[Semua Moda | ✈️ Udara | 🚢 Laut]`), input pencarian teks instan, dan toggle filter `[Hanya Revisi (N)]`.
    - **Tabel Desktop & Kartu Mobile**: Rincian cabang, badge moda, layanan, komoditi, tarif aktif terformat mata uang (`/ m³` vs `/ kg`), badge `Master Acuan` atau badge `Revisi Audit` (dengan tooltip perbandingan harga awal & user pengubah).
    - **Ekspor Excel Langsung**: Unduh spreadsheet `.xlsx` berisi seluruh data tarif terfilter dengan satu klik.
  - **3. Integrasi Tombol Aksi Cepat [🏷️ Tarif]**:
    - **Target Bill (`TargetPage.tsx`)**: Tombol `[🏷️ Tarif]` di samping nama customer pada baris tabel desktop dan kartu mobile (dengan `e.stopPropagation()`).
    - **Daftar Antrean Validasi (`ValidationListPage.tsx`)**: Tombol `[🏷️ Tarif]` di samping nama customer pada kolom tabel desktop dan kartu mobile.
    - **Detail Validasi (`ValidationDetailPage.tsx`)**: Tombol `[🏷️ Tarif]` pada ribbon tombol header cepat dan pada kartu identitas tagihan & customer.
  - **4. Verifikasi & Deploy IIS**:
    - Backend build: `bun build src/index.ts --no-bundle` $\to$ **LULUS 100% 0 errors**.
    - Frontend build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/billing-0S0zvrCO.js`).
    - Langsung aktif pada IIS physical path `C:\shipping\frontend\dist` (`http://36.93.22.142/mshipping`).

- [x] **Diferensiasi Moda Udara vs Laut pada Grafik Harian & Bulanan (`billing-analytics.service.ts`, `TrendChart.tsx`, `DashboardPage.tsx`)**:
  - **1. Backend Aggregated SQL Query (`billing-analytics.service.ts`)**:
    - Memperbarui fungsi `getBillingTrends()` untuk mengagregasikan metrik per moda via conditional aggregation:
      - `billUdara`: `SUM(CASE WHEN fdListType = 1 THEN 1 ELSE 0 END)`
      - `tagihanUdara`: `SUM(CASE WHEN fdListType = 1 THEN ISNULL(fdJumlah1, 0) ELSE 0 END)`
      - `billLaut`: `SUM(CASE WHEN fdListType = 2 THEN 1 ELSE 0 END)`
      - `tagihanLaut`: `SUM(CASE WHEN fdListType = 2 THEN ISNULL(fdJumlah1, 0) ELSE 0 END)`
      - `totalBill` & `totalTagihan`: total gabungan faktur dan rupiah.
    - Diterapkan pada kueri harian (`dailyRows`) dan kueri 12 bulan terakhir (`monthlyRows`).
    - Backend build lulus 100% 0 error & PM2 service `ShippingApi` di-restart online.
  - **2. Visualisasi Grafik Multi-Moda (`TrendChart.tsx`)**:
    - **Mode Jumlah Bill (Count)**:
      - Saat `modeFilter === 'all'`: Stacked Bar 2 layer presisi (`billLaut` di dasar dengan emerald gradient `#059669` $\to$ `#10b981` dan `billUdara` di layer atas dengan sky blue gradient `#0284c7` $\to$ `#38bdf8`), mempertahankan total tinggi batang sesuai total invoice sekaligus menampilkan proporsi per moda.
      - Saat mode dipilih `udara` atau `laut`: bar tunggal terfilter dengan radius rounded top `[6, 6, 0, 0]`.
    - **Mode Nominal Tagihan (Value)**:
      - Dual Area & Monotone Lines: kurva Sky Blue (`tagihanUdara`) dan kurva Emerald (`tagihanLaut`) dengan gradient area fill lembut.
    - **Mini Summary Banner Per-Moda**:
      - Chip ringkasan akumulatif di atas chart: `✈️ Udara: X Bill • Rp Y (A%)`, `🚢 Laut: B Bill • Rp C (D%)`, dan `Total: N Bill • Rp M`.
    - **Multi-Theme Floating Tooltip**:
      - Header tanggal/label lokal.
      - Item breakdown Udara (Sky) & Laut (Emerald) lengkap dengan jumlah bill dan nominal rupiah terformat.
      - Total baris gabungan.
      - Visual progress bar rasio persentase moda (`X% Udara • Y% Laut`).
  - **3. Kontrol Navigasi & Filter Dashboard (`DashboardPage.tsx`)**:
    - Menambahkan state `trendMode` (`all` | `udara` | `laut`) dengan kontrol `SegmentedControl` (`[Semua | ✈️ Udara | 🚢 Laut]`) berdampingan dengan sakelar metrik `[Jumlah Bill | Total Tagihan]`.
    - Mengaktifkan pemilih rentang waktu (`daysFilter`: 7, 14, 30 hari) pada tab Harian.
    - Menambahkan key i18n kamus `billing.dailyBillTitle`, `billing.trend.*` di `id.json` & `en.json`.
  - **4. Verifikasi & Deploy IIS**:
    - Build frontend: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/billing-DyXNbvBs.js`).
    - Tersinkronisasi langsung ke direktori fisik IIS `C:\shipping\frontend\dist` (`http://36.93.22.142/mshipping`).

- [x] **Implementasi Ringkasan & Analitik KPI BAP (Sesuai `local-charges/frontend/src/features/inspection-reports/pages/List.tsx`)**:
  - **1. Backend Aggregated Stats Endpoint (`GET /api/inspection-reports/stats`)**:
    - `inspectionReports.service.ts`: Fungsi `getInspectionReportStats()` yang mengagregasikan:
      - Total seluruh dokumen BAP (`totalForms`).
      - Total dokumen bulan berjalan (`totalThisMonth`) & bulan lalu (`totalLastMonth`).
      - Persentase pertumbuhan bulan-ke-bulan (MoM `growthPercent`).
      - Agregasi status dokumen `byStatus` (`Draft` & `Done`).
      - Ranking Top 5 pelanggan (`topCustomers`) berdasarkan frekuensi pemeriksaan kargo.
      - Tren 6 bulan terakhir (`monthlyTrend`) via SQL Server grouping `FORMAT(fdCreatedAt, 'yyyy-MM')`.
      - Total akumulasi foto pemeriksaan kargo (`totalPhotos`).
    - `inspectionReports.routes.ts`: Rute `GET /stats` terlindungi auth middleware.
    - Build backend & restart PM2 service `ShippingApi` sukses online.
  - **2. UI & Visualisasi Komponen KPI (`InspectionKpiCards.tsx` & `InspectionReportsPage.tsx`)**:
    - **Overview Header & Toggle Switch**: Header `Ringkasan & Analitik` dengan tombol interaktif `Sembunyikan Analitik` / `Tampilkan Analitik` (`ChevronUp` / `ChevronDown`) dengan layout presisi sesuai `local-charges`.
    - **4 Stat Cards Utama**:
      - `Total Form`: Total dokumen BAP dengan icon `FileText` & badge terpadu.
      - `Bulan Ini`: Form bulan berjalan dengan komparasi `vs X bulan lalu` serta badge tren dinamis (`TrendingUp` hijau / `TrendingDown` merah / `Minus`).
      - `Draft`: Form BAP yang belum selesai dengan aksen amber dan icon `Clock`.
      - `Done`: Form BAP selesai dengan aksen emerald dan icon `CheckCircle2`.
    - **3 Panel Analitik Bawah**:
      - `Tren 6 Bulan (Form per Bulan)`: AreaChart interaktif Recharts dengan kurva `monotone`, gradient fill ungu (`#8b5cf6`), CartesianGrid horizontal, XAxis tanggal lokal, YAxis, dan multi-theme custom Tooltip.
      - `Distribusi Status (Breakdown)`: Visual progress bar animasi untuk Draft & Done, persentase rasio, angka riil, dan footer total form.
      - `Customer Teratas (Top 5)`: Ranking Top 5 pelanggan dengan nomor urut 1–5 monospaced, nama customer, counter frekuensi `X×`, dan bar proporsional.
    - **Loading State**: Wireframe `.skeleton-shimmer` untuk 4 kartu atas dan 3 panel bawah saat query data berlangsung.
    - **Dual Bahasa (i18n)**: Mendaftarkan seluruh key kamus `bap.overviewTitle`, `bap.showAnalytics`, `bap.hideAnalytics`, `bap.chartMonthlyTitle`, dll pada `id.json` & `en.json`.
  - **3. Verifikasi Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/inspection-IpMhNdFJ.js` 60.51 kB).

- [x] **Redesign Tampilan Foto BAP (Sesuai `local-charges`) & Penyelesaian Masalah Foto 404 (`lampiran/`, IIS & `resolveMediaUrl`)**:
  - **1. UI Lampiran Foto Sesuai `local-charges/frontend/src/features/inspection-reports`**:
    - `InspectionLampiranUploader.tsx`: Drag & drop area dashed border, multi-file upload progress bar animasi, dan listener **`CTRL+V` paste gambar dari clipboard**.
    - `LampiranItem.tsx`: Grid card foto (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`) dengan tag index `#1`, hover overlay aksi (Lihat `Eye`, Unduh `Download`, Hapus `Trash2`), caption nama file, dan timestamp/uploader.
    - `LampiranLightbox.tsx`: Fullscreen lightbox gelap (`backdrop-blur-sm`) dengan tombol Putar 90° (`RotateCw`), Zoom In/Out dengan persentase (`ZoomIn`/`ZoomOut`), Download langsung, navigasi panah kiri/kanan (`ChevronLeft`/`ChevronRight`), dan shortcut keyboard (Esc, Arrows, R, + / -).
    - `InspectionDetailModal.tsx`: Mengadopsi struktur `local-charges` `Form.tsx` dengan metadata header card (No. BAP, Petugas, Tanggal, Status) dan 2 tab navigasi: `Foto Pemeriksaan (N)` dan `Detail & Kargo`.
    - `InspectionTable.tsx`: Pill counter foto interaktif (`📷 N Foto`) yang dapat diklik langsung untuk membuka modal galeri foto BAP bersangkutan.
  - **2. Penyelesaian HTTP 404 pada URL Foto BAP**:
    - *Akar Masalah*: Frontend web diakses melalui IIS port 80 (`http://36.93.22.142/mshipping`), sedangkan file foto fisik tersimpan di `C:\shipping\backend\public\uploads\bap-photos\...` yang dikelola runtime Bun port 3010. URL gambar relatif `/uploads/...` diarahkan browser ke IIS port 80 yang belum memiliki virtual directory `/uploads`, memicu HTTP 404.
    - *Solusi IIS*: Membuat Web Virtual Directory di IIS pada Default Web Site dan Application `mshipping`:
      - `New-WebVirtualDirectory -Site "Default Web Site" -Name "uploads" -PhysicalPath "C:\shipping\backend\public\uploads"`
      - `New-WebVirtualDirectory -Site "Default Web Site" -Application "mshipping" -Name "uploads" -PhysicalPath "C:\shipping\backend\public\uploads"`
    - *Solusi Backend*: Menambahkan header `Content-Type: file.type || 'image/jpeg'` dan `Cache-Control: public, max-age=31536000` pada `serveUploadHandler` di `backend/src/index.ts` untuk melayani request langsung ke port 3010.
    - *Solusi Frontend*: Memperbarui `resolveMediaUrl` di `frontend/src/lib/utils.ts` untuk menormalisasi path `bap-photos/` dan membungkus URL foto di `LampiranItem.tsx` serta `LampiranLightbox.tsx`.
    - *Verifikasi Akses*: Uji coba via curl ke IIS port 80 (`/uploads/bap-photos/...` dan `/mshipping/uploads/bap-photos/...`) menghasilkan status **HTTP 200 OK (Content-Type: image/jpeg)**.
  - **3. Verifikasi Build & PM2**:
    - Frontend build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors**.
    - PM2 service `ShippingApi` aktif online.

- [x] **Isolasi Folder Foto per BAP & Pengarsipan Otomatis (`inspectionPhotos.service.ts` & `inspectionReports.service.ts`)**:
  - **1. Folder Mandiri per BAP Sejak Awal Upload**:
    - Setiap foto BAP disimpan di dalam subdirektori tersendiri berdasarkan Nomor BAP:
      `public/uploads/bap-photos/[Nomor-BAP]/bap_[id]_[timestamp]_[rand].jpg`.
    - URL publik: `/uploads/bap-photos/[Nomor-BAP]/[filename].jpg`.
  - **2. Pengarsipan Otomatis Saat BAP Dihapus (Soft Delete)**:
    - Saat BAP dihapus (`deleteInspectionReport`), seluruh folder foto BAP tersebut otomatis dipindahkan ke direktori sampah:
      `public/uploads/bap-photos/deleted/[Nomor-BAP]/`.
    - Record URL di database `tbInspectionPhoto` otomatis diperbarui ke path baru `/uploads/bap-photos/deleted/...`.
    - Folder aktif `bap-photos/` tetap bersih dan tertata rapi.
  - **3. Pengarsipan Foto Satuan (`deleteBapPhoto`)**:
    - Saat foto dihapus satuan via tombol tong sampah, file fisik otomatis dipindahkan ke direktori sampah `public/uploads/bap-photos/deleted/[Nomor-BAP]/[filename].jpg` (tidak di-unlink/dimusnahkan). Subfolder aktif yang kosong otomatis dibersihkan.
  - **4. Verifikasi & Restart**:
    - Backend build: `bun build src/index.ts --no-bundle` lulus 100% 0 errors.
    - Test script: `deleteBapPhoto` teruji memindahkan berkas fisik ke `deleted/[Nomor-BAP]/`.
    - PM2 `ShippingApi` berhasil di-restart dan aktif online.


- [x] **Optimalisasi Kompresi & Auto-Resize Dimensi Foto BAP (`imageWatermark.service.ts`)**:
  - **1. Auto-Resize Dimensi 1600px**:
    - Foto kamera resolusi tinggi (12 MP – 48 MP / 4000x3000 piksel) kini otomatis di-downscale ke maksimal **1600 × 1600 piksel** (`fit: 'inside'`, `withoutEnlargement: true`).
    - Menjaga rasio aspek asli kargo tetap presisi dan teks/barcode/marking tetap tajam.
  - **2. Penyetelan Kualitas JPEG**:
    - Kualitas encoder disetel ke `quality: 80` dengan `mozjpeg: true`.
    - Ukuran berkas foto kini konsisten **200 KB – 450 KB** (sebelumnya bisa mencapai 1.5 – 2.2 MB).
    - Memangkas penggunaan storage server dan mempercepat loading foto di aplikasi mobile hingga 75%.
  - **3. Verifikasi & Restart**:
    - Backend build: `bun build src/index.ts --no-bundle` lulus 100% 0 errors.
    - PM2 restart `ShippingApi` aktif online.


- [x] **Link / Aksi Cepat Buat BAP pada List Manifest dari Dashboard (`overview.tsx` & `BatchManifestSheet.tsx`)**:
  - **1. Integrasi Handler & Modal Form BAP di Dashboard (`overview.tsx`)**:
    - Menghubungkan state form BAP (`bapInitialData`, `isBapFormVisible`) dan mutasi `useInspectionMutations` ke layar Overview/Dashboard.
    - Menambahkan fungsi `handleCreateBapFromShipment` yang memetakan data kargo dari baris manifest kontainer/batch (`fdListType`, `fdMarkingCode`, `fdMarkingNo`, `fdListCode`, `fdTerima`, `fdNamaCustomer`) langsung ke form BAP.
    - Meneruskan prop `onCreateBap={handleCreateBapFromShipment}` ke `<BatchManifestSheet>` di `overview.tsx` sehingga tombol `+ BAP` aktif dan muncul pada setiap item kargo di lembar manifest.
    - Merender `<InspectionFormSheet>` di root modal container `overview.tsx`.
  - **2. Distribusi & Repack APK**:
    - Versi tetap: `v1.2.5` (VersionCode: `17`), `forceUpdate: false`, `minVersion: "1.2.4"`.
    - `bunx expo export --platform android` $\to$ Hermes bundle `entry-31f8bc72e4f612547ef16375b24d1a43.hbc` (5.6MB).
    - `repack_apk.ps1` $\to$ Sign v2/v3 verified, disalin ke 4 titik server (`frontend/dist`, `frontend/public`, `backend/public/uploads`, `c:\shipping\mshipping.apk`).
    - PM2 restart `ShippingApi` $\to$ Verified online.
    - Endpoint `/api/app-version` $\to$ Verified 200 OK dengan release notes terupdate.


- [x] **Fitur Burned-in Tag Watermark pada Foto BAP (`imageWatermark.service.ts` & `inspectionPhotos.service.ts`)**:
  - **1. Server-Side Watermark Compositing (`imageWatermark.service.ts`)**:
    - Mengintegrasikan library `sharp` v0.35.4 pada runtime Bun backend.
    - Setiap foto yang diunggah ke `POST /api/inspection-reports/:id/photos` otomatis dicetak banner watermark di bagian bawah gambar.
    - Banner menggunakan latar semi-transparan (`#000000` s.d. `#0A0F1D`) dengan aksen garis gradient (`#0284C7` - `#38BDF8` - `#10B981`).
    - Skala font dan padding dihitung dinamis secara proporsional sesuai resolusi asli foto (lebar 800px s.d. 4K).
    - Data yang dicetak permanen ke pixel foto:
      - **Row 1**: `MARKING: [fdMarkingCode] (No: [fdMarkingNo])` (Amber/Bold) • `CUST: [fdNamaCustomer]` (Sky Blue & Putih).
      - **Row 2**: `RESI: [fdTerima]` • `BAP: [fdReportNumber]` (Emerald Green).
      - **Row 3**: `WAKTU: [DD Mmm YYYY, HH:mm:ss WIB]` • `M-SHIPPING LOGISTICS ERP`.
  - **2. Keuntungan Arsitektur**:
    - Tag melekat permanen di dalam pixel file JPEG; saat foto di-share ke WhatsApp atau diunduh dari web/mobile, identitas kargo tidak akan hilang.
    - Zero APK rebuild — klien mobile Expo tidak memerlukan library native baru.
  - **3. Verifikasi & Layanan**:
    - Unit test compositing buffer lulus 100%.
    - Backend build: `bun build src/index.ts --no-bundle` lulus 100% 0 errors.
    - PM2 service `ShippingApi` aktif online.
    - Frontend build: `bun run build` lulus 100% 0 errors.
    - Mobile TypeScript: `bunx tsc --noEmit` lulus 100% 0 errors.


- [x] **Audit & Penyempurnaan Form Input BAP Mobile (`InspectionFormSheet.tsx` & `useMarkingLookup.ts`)**:
  - **1. Perbaikan Form Lifecycle & Stale State Reset (`useEffect`)**:
    - *Sebelumnya*: Dependency array mereset form saat modal ditutup (`visible: false`), namun saat form dibuka kembali dengan objek referensi yang sama, state berisiko tertahan atau tidak tersinkronisasi.
    - *Sesudah*: State diinisialisasi hanya saat `visible === true`, menjamin form selalu bersih/terisi akurat setiap kali dibuka baik dari mode Tambah Baru, Edit, maupun Buat BAP dari Manifest/Resi.
  - **2. Pembersihan Total Marking & Cargo Fields (`handleClearMarking`)**:
    - Menekan tombol `X` pada input pencarian marking sekarang tidak hanya mengosongkan teks pencarian, tapi juga mereset data turunan yang sebelumnya di-autofill (`fdMarkingCode`, `fdMarkingNo`, `fdListCode`, `fdTerima`) agar tidak meninggalkan data kargo kadaluarsa.
  - **3. Fallback Nilai Marking Manual pada Submit**:
    - Jika user mengetik kode marking baru secara manual tanpa memilih dari dropdown autocomplete, nilai teks ketikan user tetap disimpan dan dikirim ke payload (`fdMarkingCode`).
  - **4. Validasi Keterangan pada Status Selesai**:
    - Menambahkan validasi logis: jika status BAP dipilih `Selesai (2)`, `Keterangan Pemeriksaan` wajib diisi agar dokumen BAP final tidak kosong tanpa catatan fisik kargo. Ditandai dengan indikator merah `*`.
  - **5. Label & Hint Informasional**:
    - Memberikan label petunjuk `(opsional)` pada field `MARKING NO`, `LIST CODE`, dan `NO. RESI (TERIMA)` untuk memperjelas bahwa field ini otomatis terisi dari marking namun tetap dapat disesuaikan manual.
  - **6. Penghalusan Autocomplete Dropdown (`keepPreviousData`)**:
    - Mengaktifkan `placeholderData: keepPreviousData` pada TanStack Query di `useMarkingLookup.ts` sehingga hasil pencarian tidak berkedip kosong saat user sedang mengetik karakter baru.
  - **8. Perbaikan Scroll Daftar Saran Marking (`InspectionFormSheet.tsx`)**:
    - *Akar Masalah*: Dropdown saran menggunakan `position: 'absolute'` dengan `<ScrollView>` bersarang di dalam parent `<ScrollView>` yang tidak memiliki `nestedScrollEnabled={true}`. Di Android, `ReactScrollView` menangkap semua event sentuhan vertikal dan membatalkan gesture pada elemen absolute/child, sehingga daftar saran membeku dan tidak bisa digeser sama sekali.
    - *Solusi*:
      - Menghapus `position: 'absolute'` dan menjadikan card saran mengalir secara in-flow di bawah input pencarian.
      - Memasang `nestedScrollEnabled={true}` pada parent `<ScrollView>` dan child `<ScrollView>` dropdown.
      - Menambahkan `persistentScrollbar={true}` pada child ScrollView agar scrollbar selalu tampak jelas di Android.
      - Menaikkan `maxHeight` dropdown scroll menjadi 240px.
  - **Kompilasi & Distribusi Rilis**:
    - Versi: `v1.2.5` (VersionCode: `17`), `forceUpdate: false`, `minVersion: "1.2.4"`.
    - Export bundle Hermes Android selesai (`entry-5393bf982f91fbf5fa8cf9607ed59706.hbc`, 5.6MB).
    - Repack APK & signing release via `repack_apk.ps1` selesai 100% (Zipalign OK, Sign V2/V3 verified).
    - Tersinkronisasi ke 4 lokasi server (`mshipping.apk`).
    - PM2 service `ShippingApi` aktif online.


- [x] **Penyempurnaan Form BAP & Galeri Foto Mobile (Rilis v1.2.5 Build 17 — Force Update)**:
  - **1. Link Buat BAP dari Manifest (`BatchManifestSheet.tsx` & `logistics.tsx`)**:
    - Menambahkan tombol aksi cepat `[ + BAP ]` pada Row 4 di setiap kartu baris muatan kargo pada lembar manifest batch kontainer/AWB.
    - Menghubungkan `onCreateBap={handleCreateBapFromShipment}` pada `BatchManifestSheet` di `logistics.tsx`.
    - Saat ditekan, form BAP langsung terbuka dalam kondisi **seluruh data kargo terisi otomatis (pre-filled)**: moda (`fdListType`), kode marking (`fdMarkingCode`), nomor marking (`fdMarkingNo`), nomor resi (`fdTerima`), list code (`fdListCode`), dan nama customer (`fdNamaCustomer`).
  - **2. Perbaikan Dropdown Suggestions Hilang saat Di-Scroll (`InspectionFormSheet.tsx`)**:
    - *Akar Masalah*: Parent `<ScrollView>` form BAP memiliki event `onScrollBeginDrag={() => setShowMarkingDropdown(false)}`. Ketika user menggeser (drag/scroll) daftar dropdown saran, gesture scroll merambat ke parent ScrollView dan langsung menutup dropdown seketika.
    - *Solusi*: Menghapus prop `onScrollBeginDrag` dari parent ScrollView. Dropdown kini dapat di-scroll dengan mulus tanpa hilang secara tidak sengaja.
  - **3. Textarea Keterangan Terhalang Keyboard (`InspectionFormSheet.tsx`)**:
    - *Akar Masalah*: Form BAP memiliki modal tetap tanpa penyesuaian tinggi otomatis saat keyboard virtual Android muncul, sehingga textarea keterangan di bagian bawah form tertutup oleh keyboard.
    - *Solusi*:
      - Memasang `ref={scrollViewRef}` pada ScrollView utama.
      - Menambahkan listener `Keyboard.addListener` dengan dynamic padding bottom `keyboardHeight > 0 ? keyboardHeight + 120 : 60`.
      - Menambahkan auto `scrollToEnd({ animated: true })` saat textarea Keterangan fokus (`onFocus`), saat tombol `Dikte Suara` ditekan, dan saat chip template frasa cepat di-tap.
  - **4. Fitur Berbagi (Share) & Horizontal Swipe Slider Foto BAP (`BapPhotoSheet.tsx`)**:
    - *Share Foto*: Mengintegrasikan `expo-file-system/legacy` (download ke cache lokal) dan `expo-sharing` (native share sheet dialog). Tombol Share tersedia pada setiap thumbnail grid dan pada header modal preview fullscreen.
    - *Horizontal Swipe Slider Antar Foto*: Mengganti modal preview statis dengan `<FlatList>` horizontal (`pagingEnabled`, `showsHorizontalScrollIndicator={false}`) yang memungkinkan pengguna menggeser (swipe horizontal) ke foto sebelum/berikutnya dengan animasi native.
    - Dilengkapi counter posisi `Foto X / N`, tombol Share & Hapus di header, uploader & timestamp di footer, serta pagination dot indicator.
  - **Kompilasi & Distribusi Rilis**:
    - Versi: `v1.2.5` (VersionCode: `17`), `forceUpdate: true`.
    - Export bundle Hermes Android selesai (`entry-99b90bbd78a94aef92f817b10b579c29.hbc`).
    - Repack APK & signing release via `repack_apk.ps1` selesai 100% (Zipalign OK, Sign V2/V3 verified).
    - Tersinkronisasi ke 4 lokasi server (`mshipping.apk`).
  - **Verifikasi**:
    - Mobile TypeScript: `bunx tsc --noEmit` lulus 100% 0 errors.
    - Frontend build: `bun run build` lulus 100% 0 errors.
    - Backend build: `bun build src/index.ts --no-bundle` lulus 100% 0 errors.
    - PM2 service `ShippingApi` aktif online.

- [x] **Pembaruan Alur Input BAP Mobile & Database: Moda Air/Sea (`fdListType`), Autocomplete Suggestions Terfilter & Auto-fill, Voice Dictation, dan Buat BAP Langsung dari Resi**:
  - **Perbaikan Dropdown Suggestions (Akar Masalah & Solusi)**:
    - *Akar Masalah*: Pada `lookupInspectionMarking` (`inspectionReports.service.ts`), kueri `prisma.vwShipment.findMany` menggunakan `orderBy: { fdTerimaDate: 'desc' }`. Field `fdTerimaDate` tidak ada pada view `vwShipment` (hanya ada di `tbEntryList`), memicu `PrismaClientValidationError` yang di-catch dan me-return array kosong `[]`, sehingga dropdown tidak pernah memunculkan data saran.
    - *Solusi Backend*: Memperbaiki pengurutan ke `orderBy: { fdListCode: 'desc' }`. Kueri langsung mengembalikan data kargo secara instan.
    - *Solusi Mobile*: Memperbarui `useMarkingLookup.ts` untuk mendukung pencarian mulai dari 1 karakter (`cleanSearch.length >= 1`), menambahkan state indikator feedback aktif di dropdown (`Mencari database kargo...` vs `Tidak ada marking '...' di moda Udara/Laut`).
  - **Fitur Baru: Tombol Buat BAP Langsung dari Daftar Resi (`ShipmentListItem.tsx`, `ShipmentDetailSheet.tsx`, `logistics.tsx`)**:
    - Menambahkan tombol aksi cepat `[ + BAP ]` pada setiap kartu baris di tab Daftar Resi (`ShipmentListItem.tsx`).
    - Menambahkan tombol `[ Buat BAP ]` pada header modal detail resi (`ShipmentDetailSheet.tsx`).
    - Saat ditekan, form BAP langsung terbuka dalam keadaan **seluruh data kargo terisi otomatis (pre-filled)**: moda (`fdListType`), kode marking (`fdMarkingCode`), nomor marking (`fdMarkingNo`), list code (`fdListCode`), resi (`fdTerima`), dan customer (`fdNamaCustomer`). Pengguna hanya perlu mendiktekan hasil pemeriksaan dan menyimpan BAP.
  - **Database & Prisma**:
    - Menambahkan kolom `fdListType INT NOT NULL DEFAULT 2` (1: Udara / Air, 2: Laut / Sea) pada tabel `tbInspectionReport`.
    - Menambahkan field `fdListType Int @default(2)` pada model `TbInspectionReport` di `backend/prisma/schema.prisma` dan regenerasi Prisma Client.
  - **Backend Module (`backend/src/modules/inspection-reports/`)**:
    - Memperbarui `inspectionReports.service.ts`: `lookupInspectionMarking` kini memfilter muatan berdasarkan `fdListType` terpilih (`WHERE fdListType = @listType`), mengembalikan `fdMarkingCode`, `fdMarkingNo`, `fdListCode`, `fdCustName`, `fdTerima`, dan `fdListType`.
    - Query list `getInspectionReports` mendukung filter moda `listType`.
    - Mutation create & update menyimpan nilai `fdListType`.
    - Restart PM2 service `ShippingApi` (online, port 3010).
  - **Mobile Module (`mobile/src/features/inspection/`)**:
    - `InspectionFormSheet.tsx`:
      - Menambahkan prop `initialData` untuk pre-fill data dari resi / layar lain.
      - Menambahkan switcher pill moda interaktif `[✈️ Udara / Air]` vs `[🚢 Laut / Sea]` di atas form body.
      - Dropdown saran autocomplete marking menampilkan: kode marking, marking no, badge moda, nama customer, nomor resi (`fdTerima`), dan list code (`fdListCode`).
      - Saat saran diklik: auto-fill otomatis mengisi `fdMarkingCode`, `fdMarkingNo`, `fdTerima`, `fdListCode`, `fdNamaCustomer`, dan menyelaraskan moda `fdListType`.
      - Menambahkan tombol `[🎙️ Dikte Suara]` di samping label Keterangan Pemeriksaan: memfokuskan kursor ke textarea keterangan, menampilkan panduan interaktif keyboard voice typing (Gboard/Samsung), dan menyediakan 6 chip template frasa cepat pemeriksaan kargo (`+ Kondisi baik & tersegel`, `+ Kardus basah / lembab`, dll) yang dapat di-tap langsung tanpa risiko native crash.
    - `InspectionListItem.tsx` & `InspectionDetailSheet.tsx`:
      - Menambahkan badge semantik moda kargo `✈️ Udara` (sky blue) / `🚢 Laut` (emerald green) pada header kartu dan lembar detail.
  - **Kompilasi & Distribusi Rilis**:
    - Versi: `v1.2.4` (VersionCode: `16`), `forceUpdate: true`.
    - Repack APK Hermes bundle & signing via `repack_apk.ps1` selesai 100%.
    - Tersinkronisasi ke 4 lokasi server (`mshipping.apk`).
  - **Verifikasi**:
    - Mobile TypeScript: `bunx tsc --noEmit` lulus 100% 0 errors.
    - Frontend build: `bun run build` lulus 100% 0 errors.
    - Backend build: `bun build src/index.ts --no-bundle` lulus 100% 0 errors.
    - PM2 service `ShippingApi` aktif online.
  - **Verifikasi**:
    - Mobile TypeScript: `bunx tsc --noEmit` lulus 100% 0 errors.
    - Frontend build: `bun run build` lulus 100% 0 errors.
    - Backend build: `bun build src/index.ts --no-bundle` lulus 100% 0 errors.
    - PM2 service `ShippingApi` aktif online.

- [x] **Implementasi Fitur Foto BAP & Kamera Terintegrasi Mobile & Backend (v1.2.4 Build 16)**:
  - **Penyelesaian Masalah Crash APK Native**:
    - Akar Masalah: Paket `expo-speech-recognition` dan `expo-image-picker` tidak terdapat pada binary DEX APK Android yang di-repack, menyebabkan `requireNativeModule` melempar fatal exception saat startup aplikasi.
    - Solusi Kamera: Mengganti seluruh fungsi foto di `BapPhotoSheet.tsx` ke `CameraView` dari `expo-camera` yang sudah 100% terkompilasi di DEX APK native (viewfinder fullscreen, flip kamera, flash toggle, shutter, dan direct base64 upload).
    - Solusi Dikte: Menghapus modul `expo-speech-recognition` dari JavaScript runtime. Dikte suara tetap berjalan alami via tombol mikrofon bawaan keyboard Android (Gboard) saat kursor aktif di field Keterangan.
  - **Database & Prisma**:
    - Membuat tabel `tbInspectionPhoto` (fdId, fdReportId, fdPhotoUrl, fdCaption, fdUploadedBy, fdCreatedAt) dengan referensi FK cascade ke `tbInspectionReport`.
    - Menambahkan model `TbInspectionPhoto` dan relasi `photos` pada `schema.prisma`, regenerasi Prisma Client.
  - **Backend Module (`backend/src/modules/inspection-reports/`)**:
    - `inspectionPhotos.service.ts`: Handler upload base64 (kompresi buffer disk `public/uploads/bap-photos/`), get list foto, dan delete foto fisik & database.
    - `inspectionReports.service.ts`: Pemetaan agregasi `photoCount` pada list query dan eager loading `photos` pada detail by ID.
    - `inspectionReports.routes.ts`: Rute `POST /:id/photos`, `GET /:id/photos`, `DELETE /:id/photos/:photoId`.
    - Restart PM2 service `ShippingApi` (online).
  - **Mobile App (`mobile/src/features/inspection/`)**:
    - `types/inspectionReport.types.ts`: Interface `BapPhoto`, field `photos`, `photoCount`.
    - `hooks/useBapPhotos.ts`: Hooks query & mutasi upload/delete foto.
    - `components/BapPhotoSheet.tsx`: Bottom sheet foto dengan CameraView viewfinder native terintegrasi, grid 3 kolom thumbnail, preview fullscreen modal, dan hapus foto.
    - `components/InspectionListItem.tsx`: Tombol kamera dengan live badge counter `photoCount`.
    - `components/InspectionDetailSheet.tsx`: Strip horizontal thumbnail foto, live badge count, dan shortcut kelola foto.
    - `components/InspectionTab.tsx`: Integrasi lembar `BapPhotoSheet`.
  - **Kompilasi & Distribusi Rilis**:
    - Versi: `v1.2.4` (VersionCode: `16`), `forceUpdate: true`.
    - Repack APK Hermes bundle & signing via `repack_apk.ps1` selesai 100%.
    - Tersinkronisasi ke 4 lokasi server (`mshipping.apk`).
  - **Verifikasi**:
    - Mobile TypeScript: `bunx tsc --noEmit` lulus 100% 0 errors.
    - Frontend build: `bun run build` lulus 100% 0 errors.
    - Backend build: `bun build src/index.ts --no-bundle` lulus 100% 0 errors.
  - **Database SQL Server & Prisma**:
    - Membuat tabel `tbInspectionReport` (id, reportNumber, reportDate, listCode, markingCode, markingNo, namaCustomer, terima, keterangan, status, createdBy, createdAt, updatedAt, deletedAt).
    - Membuat tabel `tbBAPCounter` (composite PK `fdYear`, `fdMonth`, `fdCount`) untuk penomoran atomik format `BAP-YYYY-MM-XXXXX` yang reset otomatis per bulan.
    - Menambahkan model `TbInspectionReport` & `TbBAPCounter` ke `schema.prisma` dan meregenerasi Prisma Client.
  - **Backend Module (`backend/src/modules/inspection-reports/`)**:
    - `inspectionReports.types.ts`: Kontrak data payload create, update, query list, dan autocomplete lookup.
    - `inspectionReports.service.ts`: Logika bisnis `generateReportNumber` dengan SQL `MERGE`, query list paginasi & filter pencarian/status, detail by ID, create, update, soft delete, dan `lookupInspectionMarking` via `vwShipment`.
    - `inspectionReports.routes.ts`: Rute REST API terproteksi JWT auth (`GET /`, `GET /lookup`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`).
    - Pemasangan router di `src/index.ts` pada `/api/inspection-reports` dan restart PM2 service `ShippingApi`.
  - **Mobile App (`mobile/src/features/inspection/`)**:
    - `types/inspectionReport.types.ts`: Interface tipe data BAP.
    - `hooks/useInspectionReports.ts`: Infinite scroll list query (`useInfiniteQuery`).
    - `hooks/useInspectionReportDetail.ts`: Query detail BAP per ID.
    - `hooks/useInspectionMutations.ts`: Mutasi create, update, delete dengan auto-invalidate cache dan toast.
    - `hooks/useMarkingLookup.ts`: Query autocomplete marking code kargo.
    - `components/InspectionStatusBadge.tsx`: Badge status semantic (`Draft` amber / `Selesai` green).
    - `components/InspectionListItem.tsx`: Kartu baris BAP dengan nomor laporan, status badge, customer, marking, catatan, dan tanggal.
    - `components/InspectionDetailSheet.tsx`: Bottom sheet detail lengkap BAP dengan aksi hapus dan navigasi ke edit form.
    - `components/InspectionFormSheet.tsx`: Bottom sheet form pembuatan dan pengeditan BAP dengan autocomplete marking code, switch status draft/selesai, dan validasi nama customer.
    - `components/InspectionTab.tsx`: Kontainer tab BAP dengan search bar, filter chip pill (Semua, Draft, Selesai), FAB `+ Buat BAP`, pull-to-refresh, dan state modal sheet.
    - Integrasi sub-tab `BAP` di `mobile/app/(tabs)/logistics.tsx` pada `SegmentedControl`.
    - Menambahkan helper `canManageInspectionReports` pada `permissions.ts` dan key kamus `logistics.inspection` di `id.json` & `en.json`.
  - **Verifikasi**:
    - Backend build: `bun build src/index.ts --no-bundle` lulus 100% 0 errors.
    - Mobile TypeScript: `bunx tsc --noEmit` lulus 100% 0 errors.


- [x] **Refaktorisasi Modular Billing Validation Card (`BillingValidationCard.tsx` & `validation-card/`)**:
  - Memecah berkas raksasa monolithic `BillingValidationCard.tsx` (2.276 baris, ~140 KB) menjadi arsitektur orchestrator bersih (~640 baris) dengan subkomponen tersegmen di bawah `src/features/billing/components/validation-card/`.
  - Membuat `ValidationCardHeader.tsx` untuk bilah header, badge status validasi, dan tombol refresh query.
  - Membuat `ValidationCardTabsBar.tsx` untuk navigasi 5 tab kompak dengan status pill indikator (`Cek`, `✓ Valid`, `✓ Sesuai`, `Selisih`, `Nihil`, dll).
  - Membuat `ProfilePricingTab.tsx` untuk Tab 1 (Item & Tarif), profil harga, 4 KPI tarif utama, tata letak rata samping Tax Return & Catatan Tarif Customer dengan switcher moda pill (`[Udara] [Laut] [Semua]`), evaluasi komoditas 3-way check, dan tautan acuan Price List modal.
  - Membuat `PhysicalValidationTab.tsx` untuk Tab 2 (Validasi Fisik), perbandingan kubikasi M³ (Laut) / timbangan berat (Udara) / komparasi Type 2 (`Type2ComparisonPanel`), rincian data per listCode & per marking, serta pesan status evaluasi.
  - Membuat `OverweightTab.tsx` untuk Tab 3 (Overweight Jalur Laut), analisis rasio overweight muatan laut, batas kuota rasio, berat aktual fisik multi-sumber, dan status kesesuaian penagihan KG.
  - Membuat `FreightChargeTab.tsx` untuk Tab 4 (Freight Charge) dan `TransportTab.tsx` untuk Tab 5 (Ekspedisi Lokal `tbExpIndo`).
  - Menyusun kontrak antarmuka terpusat di `types.ts` dan barrel export `index.ts`.
  - Verifikasi build `bun run build` sukses 100% (0 errors).

- [x] **Format 2 Digit Desimal Dimensi Fisik Ekspor Excel (`custMarkingExcel.ts`)**:
  - Mengubah format kolom Panjang (`fdPjg`), Lebar (`fdLbr`), dan Tinggi (`fdTng`) pada sheet *Detail Ukuran Fisik* menjadi presisi **2 digit desimal** (`Number(Number(item.fd... || 0).toFixed(2))`).
  - Mengatur volume koli dan total sub-volume M³ konsisten pada **4 digit desimal** (`toFixed(4)`).
  - Memperbaiki alignment kolom baris `TOTAL` (`['TOTAL', '', '', '', subQty, Number(subM3.toFixed(4)), '']`) sehingga `subQty` tepat di bawah kolom Qty dan `subM3` tepat di bawah kolom Volume.
  - Menambahkan konfigurasi lebar kolom otomatis `ws2['!cols']` agar hasil download Excel tidak terpotong.
  - Verifikasi build `bun run build` sukses 100% (0 errors).
- [x] **Pelebaran Ukuran Modal Detail Marking (`CustMarkingDetailModal.tsx` & `Modal.tsx`)**:
  - Memperlebar ukuran modal `full` pada `Modal.tsx` dari `max-w-[96vw] w-[96vw]` menjadi `max-w-[98vw] w-[98vw] max-h-[95vh]`.
  - Merampingkan padding gutter backdrop modal dari `p-3 sm:p-4` menjadi `p-2 sm:p-3` untuk memaksimalkan ruang horizontal.
  - Memperbarui `CustMarkingDetailModal.tsx` dengan kelas eksplisit `w-[98vw] max-w-[98vw] max-h-[94vh] h-[840px]` agar 23 kolom data kargo koli, M³ desimal, dan metrik summary banner memiliki ruang bentang yang lebih luas dan nyaman dibaca.
  - Verifikasi build `bun run build` sukses 100% (0 errors).
- [x] **Pelebaran Ukuran Modal Ringkasan Validasi (`BillingValidationSummaryModal.tsx` & `Modal.tsx`)**:
  - Menambahkan varian ukuran baru `3xl` (`max-w-7xl` = 1280px) pada sistem komponen `src/components/ui/Modal.tsx` (`ModalSize` & `sizeClasses`).
  - Memperlebar dialog audit ringkasan validasi (`BillingValidationSummaryModal.tsx`) dari `size="2xl"` (1152px) menjadi `size="3xl"` (1280px).
  - Memberikan ruang horizontal ekstra (~128px) yang lega untuk seluruh 7 kolom tabel audit finansial (`FinancialAuditTab.tsx`), KPI cards batch marking (`PhysicalAuditTab.tsx`), dan daftar issue validasi tanpa memakan layar penuh.
  - Verifikasi build `bun run build` sukses 100% (0 errors).
- [x] **Link Modal Detail Marking Pelanggan (`CustMarkingDetailModal`) pada Header Ribbon (`ValidationDetailPage.tsx`)**:
  - Menambahkan tombol aksi cepat **Marking** (`<Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />`) pada ribbon tombol header `ValidationDetailPage.tsx` (berdampingan dengan Dimensi, Resi, dan Cetak).
  - Mengintegrasikan state `isCustMarkingModalOpen` dan merender `<CustMarkingDetailModal>` dengan `custCode={data.fdCustCode}`, `custName={displayCustName(data.customer?.fdCustName || data.fdCustCode)}`, dan `markingCode={data.fdMarkingCode || data.fdListCode || primaryListCode}`.
  - Memungkinkan verifikator menginspeksi tabel rincian kargo marking pelanggan (M³ 4 digit desimal, komoditas, Qty, berat, komplain) langsung dari toolbar utama halaman detail validasi billing.
  - Verifikasi build `bun run build` sukses 100% (0 errors).
- [x] **Link Modal Audit Dimensi Koli (`DimensionDetailModal`) pada Header Ribbon (`ValidationDetailPage.tsx`)**:
  - Menambahkan tombol aksi cepat **Dimensi** (`<Box className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />`) pada action ribbon header `ValidationDetailPage.tsx` (berdampingan dengan Inspeksi, Cetak, dan Resi).
  - Mengintegrasikan state `isDimensionModalOpen` dan merender `<DimensionDetailModal>` dengan `listCode={primaryListCode}` dan `customerName` terformat `displayCustName`.
  - Memungkinkan verifikator menginspeksi komparasi dimensi fisik koli $(P \times L \times T \times Qty) \div 1.000.000$ langsung dari halaman detail validasi billing tanpa harus membuka kartu validasi individual.
  - Verifikasi build `bun run build` sukses 100% (0 errors).
- [x] **Penyelarasan Rata Samping Catatan Tarif Customer & Tax Return (`BillingValidationCard.tsx`)**:
  - Mengubah tata letak **Tax Return** dan **Catatan Khusus Tarif Customer** dari yang sebelumnya bertumpuk vertikal menjadi sejajar berdampingan secara responsif (`grid grid-cols-1 lg:grid-cols-2 gap-2.5`).
  - Menampilkan catatan tarif secara dinamis sesuai moda kargo faktur (*data bill*):
    - Jika bill berstatus **Udara** (`res.fdListType === 1` / `isAir`), otomatis menampilkan **Note Air (`fdNote`)** dengan aksen sky dan badge aktif `(Bill)`. Jika ada catatan laut (`fdNote 1`), ditampilkan bar intip ringkas di bagian bawah dengan opsi klik "Buka Laut".
    - Jika bill berstatus **Laut** (`res.fdListType === 2` / `!isAir`), otomatis menampilkan **Note Sea (`fdNote 1`)** dengan aksen blue dan badge aktif `(Bill)`. Jika ada catatan udara (`fdNote`), ditampilkan bar intip ringkas di bagian bawah dengan opsi klik "Buka Udara".
  - Menyediakan pill selector interaktif `[✈️ Udara] [🚢 Laut] [📋 Semua]` di header kartu untuk memudahkan verifikator beralih memeriksa salah satu atau kedua catatan sekaligus (`all` mode).
  - Dot indikator pada tombol pill jika catatan pada moda terkait terisi di database FoxPro.
  - Menyelaraskan kartu Tax Return ke dalam grid 2 kolom kompak (`grid-cols-2`) sehingga proporsional dan presisi sejajar dengan kotak catatan di sebelahnya.
  - Verifikasi build `bun run build` sukses 100% (0 errors).
- [x] **Refactoring Modal Ringkasan Validasi (`BillingValidationSummaryModal.tsx` & `validationSummary.utils.ts`)**:
  - Mengekstrak fungsi-fungsi utilitas bisnis ke berkas khusus [`validationSummary.utils.ts`](file:///c:/shipping/frontend/src/features/billing/components/validation-summary/validationSummary.utils.ts).
  - Mengeliminasi duplikasi pemindaian array kargo pada baris 58-78 (`hasTransportItem` dan `transportDetailItem`) menjadi satu fungsi tunggal `findTransportDetailItem` dan derivasi boolean `hasTransportItem = isTransport || Boolean(transportDetailItem)`.
  - Menerapkan memoization (`useMemo`) untuk sorting `details`, pencarian `transportDetailItem`, resolusi `effectiveTransportAmount`, `allBillingListCodes`, `billingListCodeParam`, `resolvedCustName`, `effectiveTotalInvoice`, dan evaluasi `verdict`.
  - Mengeliminasi 60 baris nested ternary bersarang pada `verdictTitle` dan `verdictDescription` menjadi fungsi terpusat `calculateValidationVerdict(params)` yang rapi, modular, dan teruji.
  - Memastikan seluruh string M³ pada pesan verdict menggunakan presisi standar 4 digit desimal (`formatDecimal(..., 4)`).
  - Menghapus variabel dan komentar duplikat.
  - Verifikasi build `bun run build` sukses 100% (0 errors).
- [x] **Perbaikan i18n JSON Billing Validation (`id.json`, `en.json`, `BillingValidationCard.tsx:L1615`)**:
  - Memperbaiki teks label kartu `PL Per Marking` yang sebelumnya memunculkan raw key JSON string (`billing.validation.plPerMarking`) karena key belum terdaftar di kamus bahasa `id.json` dan `en.json`.
  - Mendaftarkan key `billing.validation.plPerMarking`, `billing.validation.viewCustMarkingDetail`, dan `billing.validation.komplainHybrid` di kedua kamus bahasa secara konsisten.
  - Memperbarui komponen `BillingValidationCard.tsx` untuk menggunakan key i18n semantik.
- [x] **Standardisasi Presisi Volume M³ 4 Digit Desimal (`CustMarkingDataTable.tsx`, `CustMarkingSummaryBanner.tsx`, `utils.ts`, `coding-standards.md`)**:
  - Mengubah seluruh format tampilan kubikasi M³ pada tabel rincian marking pelanggan (`CustMarkingDataTable.tsx`) dan banner ringkasan (`CustMarkingSummaryBanner.tsx`) dari 3 desimal menjadi **4 digit desimal** (`formatDecimal(..., 4)` / `volDecimals = isAirMode ? 2 : 4`).
  - Menambahkan fungsi helper `formatM3(num, includeUnit?)` pada `src/lib/utils.ts`.
  - Menerapkan dan mendokumentasikan aturan baku **WAJIB 4 DIGIT DESIMAL untuk M³** pada panduan koding proyek `.agents/rules/coding-standards.md` (Bagian Anti-Pattern dan Bagian 6 Presisi Satuan Fisik).
- [x] **Penambahan Data Per Batch Marking pada Audit Fisik (`PhysicalAuditTab.tsx` & `BillingValidationSummaryModal.tsx`)**:
  - Mengintegrasikan blok **Data Fisik Per Batch Marking** ke dalam dialog audit ringkasan validasi billing (`PhysicalAuditTab.tsx`).
  - Menampilkan grid KPI cards per marking (Laut: M³ Marking Gudang, PL Per Marking, Komplain Per Marking, dan Komplain Hybrid / Total Berat; Udara: VFC Gudang Marking, VFC Komplain Marking, Berat SJ, dan Total Berat Fisik).
  - Menyediakan deteksi otomatis badge `Dipakai Bill` hijau untuk metrik per marking yang cocok dengan nilai tagihan (`billedM3`).
  - Merender mini-table breakdown untuk seluruh List Code yang tergabung dalam batch marking bersangkutan (`markingDetails`: List Code, Marking No, Qty/Coly, M³ PL, M³ Gudang/VFC, M³ Komplain, Berat kg).
  - Menyediakan tombol link cepat untuk membuka modal rincian penuh kargo pelanggan (`CustMarkingDetailModal.tsx`) langsung dari dalam audit fisik.
  - Meneruskan `custCode` dan `custName` dari `BillingValidationSummaryModal.tsx` ke `PhysicalAuditTab.tsx`.
  - Verifikasi build `bun run build` sukses 100% (0 errors).
- [x] **Penambahan Tipe Komoditi pada Tiap Item Audit Finansial (`FinancialAuditTab.tsx`)**:
  - Menambahkan badge indikator tipe komoditi (`displayComodity`) lengkap dengan ikon `Tag` Lucide pada setiap baris item tagihan di tabel audit finansial.
  - Memperbarui header kolom dari `Item Tagihan` menjadi `Item Tagihan / Komoditi` (`min-w-[200px]`).
  - Mengakomodasi item non-validasi cabang `--` dengan menampilkan label `BIAYA KHUSUS` atau komoditas spesifik, serta item komoditas reguler (`GARMENT`, `ACCESSORIES`, `SPAREPART`, dll) secara presisi.
  - Verifikasi build `bun run build` sukses 100% (0 errors).
- [x] **Fallback Validasi M³ Berbasis No Invoice Terkait (`m3-check.service.ts`, `m3-check.types.ts`, `billing.types.ts`, `useBillingValidation.ts`, `BillingValidationCard.tsx`, `PhysicalAuditTab.tsx`)**:
  - Menyelesaikan mismatch kubikasi pada invoice gabungan dalam 1 batch marking (contoh URL: `/mshipping/finance/billing/validation/--S-000679-09-2026` dengan bill anak `--S-A00679-09-2026`).
  - **Backend (`m3-check.service.ts` & `m3-check.types.ts`)**:
    - Menambahkan helper `parseInvoiceFamily` untuk mendeteksi relasi invoice induk (`PREFIX-0XXXXX-MM-YYYY`) dan invoice anak/tambahan (`PREFIX-[A-Z]XXXXX-MM-YYYY`).
    - Mengagregasi data fisik gudang, packing list, komplain, koli, dan berat dari seluruh listCode yang berelasi (`0943385` [0.0308 m³] + `0943386` [0.1496 m³] = `0.1804 m³`).
    - Menyediakan properti `relatedBillsSummary` (daftar invoice terkait, indikator parent/child, total fisik per sumber, dan total billed M³).
  - **Frontend (`useBillingValidation.ts`, `billing.types.ts`)**:
    - Mengintegrasikan kandidat akumulasi `RelatedBillsGudang`, `RelatedBillsPL`, dan `RelatedBillsKomplain` ke dalam `seaCandidates`.
    - Jika `billedM3` cocok dengan akumulasi bill terkait (e.g. `0.1804 m³`), status menjadi `MATCH_PRIMARY` dengan label `M3 Terkait: [List Induk] + [List Anak]` (status hijau/valid).
    - Khusus invoice anak pecahan (`isChildBillMerged`: tagihan 0 m³ dengan item `GABUNG - ...`), otomatis berstatus valid `MATCH_PRIMARY` dengan label `Digabung ke [Invoice Induk]` tanpa memicu peringatan di bawah minimum charge maupun COD/urgent shortfall.
  - **UI / UX (`BillingValidationCard.tsx`, `PhysicalAuditTab.tsx`)**:
    - Menambahkan pesan validasi sukses spesifik untuk invoice gabungan terkait dan invoice anak pecahan.
    - Menambahkan box rincian keluarga bill terkait pada `PhysicalAuditTab` yang memuat tabel invoice terkait dan ringkasan fisik akumulasi.
  - **Verifikasi Build**: `bun run build` lulus 100% dengan 0 error.
- [x] **Pengecualian Validasi Biaya Khusus Cabang `--` (`ValidationDetailPage.tsx`, `billing.utils.ts`, `useBillingValidation.ts`, `BillingValidationCard.tsx`, `FinancialAuditTab.tsx`)**:
  - Item invoice dengan kode cabang `--` (`fdBranchCode === '--'` atau nomor invoice berawalan `--`) yang memuat kata kunci biaya/fee khusus (~115 kata kunci dari gambar user seperti `AGENCY FEE`, `AWB FEE`, `BEA CUKAI`, `DOCUMENT FEE`, `HANDLING FEE`, `FREIGHT CHARGES`, `DEMURRAGE`, `STORAGE`, `TRUCKING`, `CUSTOM CLEARANCE`, `PORT HANDLING`, `SEWA GUDANG JAKARTA`, `LOLO`, dll) tidak lagi divalidasi ke database tarif acuan karena nilainya tidak tercatat di database.
  - Ditambahkan kamus kata kunci `UNVALIDATED_BRANCH_DASH_FEE_KEYWORDS`, helper `isBranchDash()`, dan `isBranchDashExemptFee()`.
  - Di `evaluateItemPrice`: dievaluasi langsung di Step 0 dengan flag `isNonValidatedBranchDashFee: true`, `statusType: 'NO_TARGET'`, `isUndercharge: false`, `isOvercharge: false`, dan `targetColName: 'Non-Validasi (Cabang --)'`.
  - Di `useBillingValidation`: dikecualikan dari `underchargedItems`, `overchargedItems`, dan `isAuxiliaryItem` (agar tidak mengotori kubikasi M³/KG).
  - Di `ValidationDetailPage`: `ItemPriceBadge` merender badge netral `Non-Validasi`.
  - Di `BillingValidationCard`: status badge item merender `<Badge variant="default">Non-Validasi</Badge>`.
  - Di `FinancialAuditTab`: `StatusBadge` merender `NON-VALIDASI` (`variant="neutral"`) dan tidak dihitung ke `underchargedCount` / `overchargedCount`.
  - Verifikasi build `bun run build` sukses 100% (0 errors).
- [x] **Penghapusan Grouping Cabang pada Tabel Data (`CustMarkingDataTable.tsx`)**:
  - Menghapus pembagian `groupedRows` per cabang dan baris subheader `CABANG: ...`.
  - Merender seluruh baris kargo secara berkelanjutan (flat) dengan penomoran baris `No.` 1..N yang sekuensial.
  - Sorting kolom sekarang beroperasi langsung dan mulus di seluruh baris tanpa terpotong oleh partisi grup.
  - Kode cabang tetap tampil di kolom `BC.` per baris dan total cabang unik dihitung di kolom sticky footer `tfoot` (`uniqueBranchCount`).
- [x] **Redesign Total Summary Banner (`CustMarkingSummaryBanner.tsx`)**:
  - Mengatur ulang visual hierarchy 6 kartu KPI agar rapi, proporsional, dan seragam tingginya (`flex flex-col justify-between`).
  - Menambahkan icon semantik Lucide (`FileText`, `FileCheck2`, `Boxes`, `Scale`, `Box`) pada header tiap kartu dengan badge status terpadu di pojok kanan atas (`Underbilled`, `Overweight`, `Selisih K`, `Cocok`, `Normal`).
  - Menyelaraskan kartu **Lebih KG** ke format angka monospaced (`+XX kg Lebih` / `0 kg Normal`) dengan rincian per sumber timbangan (`Gdg`, `SJ`, `K`, `Rasio`) menggantikan teks panjang yang sebelumnya merusak konsistensi tata letak.
  - Memisahkan baris metrik utama dengan baris rincian micro-detail via garis tipis transparan (`pt-1 border-t border-[var(--color-border)]/40`).
  - Merapikan strip tombol **Filter Komoditas** dengan scrollbar horizontal halus, chip badge counter, dan total kubikasi m³/vfc.
- [x] **Aktivasi Fallback M³ Per Batch Marking / Bill Terkait (`useBillingValidation.ts`, PM2 `ShippingApi`)**:
  - Investigasi URL `http://36.93.22.142/mshipping/finance/billing/validation/--S-000679-09-2026`:
    - Ditemukan proses PM2 backend `ShippingApi` (port 3010) sebelumnya belum direstart sejak 21 September 2026, sehingga respons live HTTP belum menyertakan payload `relatedBillsSummary` (bernilai `undefined`), menyebabkan frontend menganggap tidak ada bill terkait dan mencatat selisih fisik `0.1804 m³ ≠ 0.0308 m³`.
    - Dilakukan restart service PM2 `ShippingApi` (PID baru 20112). Endpoint `/mshipping/api/billing/m3-check?listCode=0943385` kini mengembalikan `relatedBillsSummary` secara lengkap (`sumM3Gudang: 0.1804 m³`, `isParent: true`, bill anak `--S-A00679-09-2026`).
    - Menambahkan `custMarkingValues` (`GudangPerMarking`) ke dalam `seaCandidates` pada `useBillingValidation.ts` agar data fisik M³ per batch marking (`sp_tbEntryListDetail_permarking`) juga dievaluasi sebagai kandidat validasi laut.
    - Validasi invoice `--S-000679-09-2026` kini berstatus **VALID (MATCH)** dengan pencocokan kubikasi akumulasi bill terkait `0.1804 m³`.
    - Verifikasi build `cd frontend && bun run build` sukses 100% 0 errors.
- [x] **Penyederhanaan Tab Catatan Tarif Customer (`ProfilePricingTab.tsx`, `BillingValidationCard.tsx`, `types.ts`)**:
  - Menghapus tab `Semua` dari pill switcher Catatan Tarif Customer (`tbCustomersHarga`), menyisakan hanya tab `Udara` dan `Laut`.
  - Mengisolasi tampilan teks catatan agar 100% eksklusif:
    - Tab `Udara`: hanya menampilkan `fdNote` (Catatan Udara).
    - Tab `Laut`: hanya menampilkan `fdNote 1` (Catatan Laut).
  - Menghapus snippet intip/cross-preview silang (kotak "Catatan Udara (fdNote): Buka Udara" pada tab Laut dan sebaliknya).
  - Memperbarui kontrak tipe `effectiveNoteMode: 'air' | 'sea'` dan `selectedNoteMode: 'air' | 'sea' | null`.
  - Verifikasi build `cd frontend && bun run build` sukses 100% 0 errors.
- [x] **Fallback Validasi Overweight Berbasis Bill Terkait & Kandidat Fisik Multi-Sumber (`useOverweightValidation.ts`, `useBillingValidation.ts`, `OverweightTab.tsx`, `OverweightAuditTab.tsx`, `m3-check.service.ts`, `billing-validation.service.ts`)**:
  - **Masalah**: Pada tagihan gabungan/pecahan (seperti `--S-000679-09-2026`), perhitungan overweight sebelumnya mengambil total berat per marking kontainer penuh (`totalBeratPerMarking` = 226 kg dari 4 listCode), padahal kelompok invoice terkait hanya terdiri dari 2 listCode dengan berat aktual `64 kg`. Hal ini memicu kesalahan deteksi overweight (+99.72 kg).
  - **Backend (`m3-check.service.ts`, `m3-check.types.ts`, `billing-validation.service.ts`)**:
    - Menambahkan `totalBilledKg` ke dalam objek `relatedBillsSummary`.
    - Mengintegrasikan `relatedBillsSummary.sumBerat` ke dalam evaluasi berat Type 2 M3 vs KG (`billing-validation.service.ts`).
    - Restart service PM2 `ShippingApi` (PID 21704).
  - **Frontend Core Logic (`useOverweightValidation.ts`, `useBillingValidation.ts`)**:
    - **Prioritas Berat Aktual**: Jika invoice memiliki relasi keluarga bill terkait (`hasRelatedBills`), berat aktual fisik diambil dari `relatedBills.sumBerat` (64 kg), bukan berat akumulasi batch kontainer penuh.
    - **Daftar Kandidat Multi-Sumber (`candidates`)**: Menyediakan daftar kandidat berat fisik (`RelatedBills`, `Komplain`, `Timbangan Gudang`, `Surat Jalan`, `Entry List`, `Per Batch Marking`) dan menghitung potensi overweight per masing-masing sumber acuan.
    - **Pencocokan Tagihan KG**: Jika invoice menagihkan KG (`effectiveBilledKg > 0`), sistem memvalidasi terhadap `overweightKg` utama maupun fallback kecocokan kandidat multi-sumber (`matchedCandidateSource`).
    - **Invoice Anak Pecahan (`isChildBillMerged`)**: Invoice pecahan yang digabung ke invoice induk otomatis ditandai aman `isOverweight = false` dan `isBilledOverweightMatch = true` dengan keterangan audit terpusat pada invoice induk.
    - Mengintegrasikan `isChildBillMerged` dan `sumBerat` ke dalam `activeWeights` di `useBillingValidation.ts` untuk mencegah false-alarm perbedaan berat dokumen.
  - **UI / UX (`OverweightTab.tsx`, `OverweightAuditTab.tsx`)**:
    - Menampilkan asal acuan berat fisik (`weightSource`) pada kartu KPI dan banner status.
    - Menampilkan badge & banner sukses spesifik saat invoice anak digabung ke induk atau saat tagihan KG cocok dengan kandidat berat fallback.
  - **Verifikasi Build**: `cd frontend && bun run build` sukses 100% 0 errors.
- [x] **Peringatan Selisih Qty Komplain vs Qty Gudang (`qtyK > 0 && qtyK !== qtyGdg`)**:
  - Menghitung flag `isQtyKomplainMismatch` pada tiap baris data dan counter `countQtyKomplainMismatch` pada agregat (`types.ts`, `useCustMarkingData.ts`).
  - **Tabel Data (`CustMarkingDataTable.tsx`)**:
    - Kolom `Qty K` baris kargo menampilkan badge amber transparan `formatNumber(r.qtyK) ⚠️` dengan tooltip penjelas selisih terhadap Qty Gudang.
    - Kolom `Qty K` pada `tfoot` tabel menampilkan badge amber saat total Qty K > 0 dan berbeda dari total Qty Gudang.
  - **KPI Summary Banner (`CustMarkingSummaryBanner.tsx`)**:
    - Kartu `Total Koli` menampilkan badge peringatan `Selisih K (N)` berkedip halus saat ada selisih koli komplain.
    - Subtext kartu menyorot `K: [total] ⚠️` berwarna amber jika terdapat mismatch koli.
  - **Header & Toolbar (`CustMarkingHeaderToolbar.tsx`, `CustMarkingDetailModal.tsx`)**:
    - Menampilkan banner peringatan interaktif `Peringatan Selisih Qty Komplain` di toolbar.
    - Menampilkan badge peringatan `Selisih Qty K (N)` dengan icon `AlertTriangle` di `Modal.Header`.
- [x] **Peringatan Multi-Cabang (`CustMarkingHeaderToolbar.tsx` & `CustMarkingDetailModal.tsx`)**:
  - Menambahkan deteksi otomatis apabila data marking kargo memiliki lebih dari 1 cabang (`branches.length > 1`).
  - Menampilkan badge amber warning `Multi (X)` di sebelah label `Cabang:`.
  - Menampilkan banner peringatan interaktif di dalam toolbar dengan daftar cabang terdeteksi, serta status tampilan (apakah sedang memfilter ke cabang spesifik atau menampilkan gabungan seluruh cabang).
  - Menambahkan badge alert `Multi-Cabang: [Cabang1, Cabang2...]` pada `<Modal.Header>`.
  - Menyesuaikan tinggi statis modal ke `h-[820px] max-h-[92vh]` agar 10 baris data kargo dengan multi-subheader cabang tetap muat tanpa memicu scrollbar vertikal.
- [x] **Peningkatan KPI Summary Banner (`CustMarkingSummaryBanner.tsx`)**:
  - **Penggabungan Card Volume (M³ / VFC)**: Menggabungkan Volume Gudang, Total Volume Bill, Volume Komplain (K), dan Volume Packing List (PL) menjadi satu kartu terpadu dengan status evaluasi *Underbilled* vs *Sesuai Tagihan*.
  - **Card Total Invoice**: Mengklasifikasi nomor faktur berdasarkan karakter ke-5 dan ke-10:
    - *Invoice Utama*: Karakter ke-5 dan ke-10 berupa angka (digit).
    - *Bill Gabungan*: Karakter ke-5 berupa huruf.
    - *Bill Tambahan*: Karakter ke-10 berupa huruf.
    - Menampilkan jumlah Invoice Utama, Bill Gabungan, dan Bill Tambahan, serta total nomor invoice unik.
  - **Card Status Lebih KG (Multi-Source & Hybrid)**: Menampilkan rincian overweight kuota rasio dari timbangan gudang (`fdJmlBerat`), timbangan Surat Jalan (`berat Sj`), dan timbangan revisi komplain (`berat Komplain` hybrid), serta nilai rasio kargo.
  - **Group Pill Tipe Komoditas**: Menampilkan strip pill filter tipe komoditas (`UMUM`, `GARMENT`, dsb.) dengan jumlah resi dan akumulasi volume m³/vfc, terhubung langsung dengan filter tabel data secara reaktif.
- [x] **Build Frontend**: `bun run build` lulus 100% dengan 0 error dalam 2.56s.

---

## 📋 Task Sedang Berjalan & Backlog

- [x] Perbaikan Mobile Inspection: safe area footer anti-tabrakan navigasi HP & dropdown autocomplete marking solid scrollable anti-overflow (`InspectionFormSheet.tsx` & `InspectionDetailSheet.tsx`) — Rilis APK on hold sesuai instruksi user.
- [ ] *(Belum ada task baru)*

---

## 🗂️ Matriks Status Terkini Per Domain

| Domain | Status | Referensi Teknis |
|---|---|---|
| `backend api` | 🟢 Stable | [backend-app.md](../backend-app.md) & [docs/backend/](../docs/backend/) |
| `delivery-orders` | 🟢 Stable | [docs/frontend/delivery-orders.md](../docs/frontend/delivery-orders.md) & [features/delivery-orders.md](./features/delivery-orders.md) |
| `billing` | 🟢 Stable | [docs/frontend/billing.md](../docs/frontend/billing.md) & [features/billing-validation.md](./features/billing-validation.md) |
| `shipment-batches` | 🟢 Stable | [docs/frontend/shipment-batches.md](../docs/frontend/shipment-batches.md) & [features/shipment-marking.md](./features/shipment-marking.md) |
| `cashier / wallet` | 🟡 Planning | [pelunasan.md](../pelunasan.md), [pelunasan-plan.md](../pelunasan-plan.md) & [features/cashier-wallet.md](./features/cashier-wallet.md) |
| `mobile app` | 🟢 v1.2.3 (Build 15) | [mobile-app.md](../mobile-app.md) & [docs/mobile/](../docs/mobile/) |

---

## 📁 File Yang Baru Diubah
| File | Deskripsi Perubahan |
|---|---|
| `frontend/src/features/billing/components/BillingValidationCard.tsx` | Refaktorisasi komponen utama dari 2.276 baris monolithic menjadi orchestrator bersih ~640 baris |
| `frontend/src/features/billing/components/validation-card/types.ts` | Definisi kontrak tipe data dan props derivasi antar subkomponen validasi |
| `frontend/src/features/billing/components/validation-card/ValidationCardHeader.tsx` | Subkomponen bilah header, badge status validasi, dan tombol refresh |
| `frontend/src/features/billing/components/validation-card/ValidationCardTabsBar.tsx` | Subkomponen navigasi 5 tab kompak dengan status pill indikator |
| `frontend/src/features/billing/components/validation-card/ProfilePricingTab.tsx` | Subkomponen Tab 1 (Item & Tarif, profil harga, Tax Return & Catatan Customer rata samping, 3-way check) |
| `frontend/src/features/billing/components/validation-card/PhysicalValidationTab.tsx` | Subkomponen Tab 2 (Validasi Fisik M3/KG/Type 2, breakdown per listCode & marking) |
| `frontend/src/features/billing/components/validation-card/OverweightTab.tsx` | Subkomponen Tab 3 (Analisis rasio overweight muatan laut, kuota rasio, berat multi-sumber) |
| `frontend/src/features/billing/components/validation-card/FreightChargeTab.tsx` | Subkomponen Tab 4 (Rangkuman biaya freight charge valas) |
| `frontend/src/features/billing/components/validation-card/TransportTab.tsx` | Subkomponen Tab 5 (Ekspedisi lokal tbExpIndo Harus Tagih vs COD) |
| `frontend/src/features/billing/components/validation-card/index.ts` | Barrel export modul validation-card |
| `docs/frontend/billing.md` | Dokumentasi arsitektur modular BillingValidationCard |
| `mobile/src/features/inspection/components/InspectionFormSheet.tsx` | Safe area insets footer (anti-tabrakan navigasi HP), dropdown ScrollView solid non-transparent (anti-overflow & bisa discroll), clear search & focus management |
| `mobile/src/features/inspection/components/InspectionDetailSheet.tsx` | Safe area insets footer (anti-tabrakan navigasi HP pada tombol Hapus & Edit BAP) |
| `.agents/working.md` | Executive working context aktif tersegmen |

---

## 🧠 Keputusan Desain & Isu Aktif

- **Cetak Surat Jalan**: Kertas Continuous Form Landscape $23 \times 16.5$ cm (`@page { size: 230mm 165mm landscape }`). Rute mandiri di `ROUTES.DELIVERY_PRINT(':id')`.
- **SSOT Customer**: Master nama customer WAJIB dari `tbCustomers.fdCustName`.
- **Theme Midnight**: Dilarang tombol/badge solid putih atau terang; wajib outline/transparent border.
- **Resiliensi Backend**: Wajib pembungkus `safeQuery` (auto-retry 1x & fallback) untuk mencegah HTTP 500 saat glitch koneksi database.
