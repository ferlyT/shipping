# 🏷️ Modul Master Tarif & Pemetaan Komoditas (`src/features/`)

Dokumen ini merangkum 3 domain pengelolaan tarif pada M-Shipping: **Master Tarif Rute Umum** (`price-list`), **Tarif Khusus Pelanggan** (`customer-price-list`), dan **Pemetaan Komoditas & Tier 0** (`commodity-mapping`).

---

## 1. Modul Master Tarif Umum (`src/features/price-list/`)
- **Dashboard & Trend (`DashboardPage.tsx`)**: Visualisasi pergerakan harga rute per cabang asal dan kategori kargo dalam periode tertentu.
- **Lookup Tarif Global (`LookupPage.tsx`)**: Kalkulator cepat pencarian tarif berlaku berdasarkan tanggal pengiriman, moda (udara/laut), cabang, dan jenis komoditas.
- **Upload Excel Master Tarif (`UploadPage.tsx`)**: Unggah berkas Excel daftar harga baru dengan pemetaan kolom otomatis.
- **Histori & Diff Upload (`HistoryPage.tsx` & `DetailPage.tsx`)**:
  - Riwayat upload berkas tarif.
  - Visual Diff Engine: Menampilkan tarif baru, naik (merah), turun (hijau), atau tetap.
  - **Filter Interaktif Terpadu (`DetailPage.tsx`)**:
    - **Pill Group Tipe (CS / MKT)**: Filter instan tipe sheet master Excel (`Semua Tipe`, `CS`, `MKT`).
    - **Pill Group Tipe Mode**: Filter moda pengiriman (`Semua Mode`, `✈️ BY AIR`, `🚢 BY SEA`).
    - **Pill Group Cabang Target**: Filter cabang asal (`Semua Cabang`, `GZ`, `YW`, dsb).
    - **Dropdown Kategori Barang (Multi-Select)**: `CategoryMultiCombobox` dengan pencarian real-time, toggle "Pilih semua" / "Bersihkan semua", tag chip kategori terpilih dengan tombol hapus, dan sinkronisasi otomatis konteks mode/sheet.
    - **Tombol Reset Semua Filter**: Muncul otomatis saat ada filter aktif.
    - **Sinkronisasi Reaktif Kartu Stat (KPI)**: Metrik Naik, Turun, Tetap, dan Baru otomatis menyesuaikan dengan hasil filter aktif.
  - Pengaturan tanggal berlaku efektif (*Effective Date*).

---

## 2. Modul Tarif Khusus Pelanggan (`src/features/customer-price-list/`)
- **Direktori Customer Price List (`ListPage.tsx`)**:
  - Antarmuka dual-tab: **Harga Komoditi Khusus Customer** (`special_prices`) dan **Daftar Upload File Excel** (`master_uploads`).
  - **Masa Berlaku Lengkap & Penanganan Expiration (`endDate`)**:
    - Kolom Masa Berlaku menampilkan rentang: `[Mulai] s/d [Sampai]` atau `[Mulai] s/d Selamanya`.
    - Badge status visual:
      - **Aktif** (Hijau emerald outline).
      - **Segera Berakhir** (Amber outline): menyala jika sisa masa berlaku $\le 7$ hari.
      - **Kedaluwarsa** (Merah rose outline): menyala jika `endDate < TODAY`.
    - Tab 2 (`master_uploads`): Tombol aksi cepat *"Masa Berlaku"* membuka modal interaktif `EditEffectiveDateModal` untuk mengubah rentang tanggal berlaku upload dan sinkronisasi ke seluruh item terkait.
  - **Pencarian Berdasarkan Nama Customer**:
    - Tab Harga Khusus: Toolbar pencarian mencari nama customer (`tbCustomers.fdCustName`), kode customer (`fdCustCode`), kategori komoditas, branch, dan alias komoditi. Dilengkapi `useDebounce(..., 300)` dan tombol hapus instan `[X]`.
    - Tab Master Uploads: Pencarian customer berdasarkan nama customer (`custName`), kode (`fdCustCode`), dan nama berkas Excel (`fileName`).
  - Penuh dukungan i18n bilingual (`id.json` & `en.json`).
- **Modal Input & Pengaturan Masa Berlaku**:
  - **Form Upload Excel (`UploadPage.tsx`)**: Dilengkapi field `Berlaku Sampai (End Date)` dengan opsi checkbox toggle *"Tanpa batas waktu (Selamanya)"*.
  - **Modal Edit Masa Berlaku (`EditEffectiveDateModal.tsx`)**: Mendukung pengubahan `Berlaku Mulai` dan `Berlaku Sampai`, toggle *"Tanpa batas waktu"*, serta validasi wajib `endDate >= effectiveDate`.
- **Modal Input Harga Komoditi Khusus (`CustomerCommodityPriceModal.tsx`)**:
  - **Pencarian Customer dari SSOT `tbCustomers`**: Terhubung langsung ke `customersApi.list` dengan status aktif (`fdDiscontinued <> 1`).
  - **Branch Asal dari Master `tbCabang`**: Mengambil daftar resmi cabang operasional dari endpoint `/api/customer-price-list/branches` (`{b.code} - {b.name}`).
  - Pencarian real-time dengan debounce 300ms.
  - Normalisasi petik FoxPro `displayCustName`.
  - Kartu pelanggan terpilih dengan badge kode monospaced dan tombol *"Ganti"*.
  - Multi-alias komoditi dan pengaturan tanggal berlaku (*Effective Date* s/d *End Date*).
- **Visual Diff Pelanggan (`DiffPage.tsx`) & Histori (`HistoryPage.tsx`)**: Komparasi perubahan tarif kontrak khusus pelanggan bersangkutan dengan indikator rentang tanggal berlaku dan badge status.

---

## 3. Modul Commodity Mapping & Tier 0 (`src/features/commodity-mapping/`)
- **Tujuan & Alur**: Menghubungkan variasi penulisan nama komoditas lapangan (misal: `"BAJU ANAK"`, `"KAOS"`) ke kategori master tarif resmi perusahaan (`"GARMENT"`), serta penetapan **Tarif Langsung (*Direct Price / Tier 0*)**.
- **Fitur Utama**:
  - **Tarif Langsung & Acuan Operasional (Tier 0 - Prioritas Tertinggi)**:
    - Menetapkan nominal Harga Langsung (Rp), Cabang Asal, Mulai Marking Code (`startMarkingCode`, e.g. `>= 26GZD53`), dan Mulai Tanggal Agen.
    - Evaluasi harga penagihan mengutamakan Tier 0 (`COMMODITY_MAPPING_PRICE`) sebelum memeriksa master sheet upload Excel.
  - **Pilih Pelanggan dari Master `tbCustomers` (`CommodityMappingModal.tsx`)**:
    - Input pencarian pelanggan khusus (`scope === 'customer'`) bersumber langsung dari `tbCustomers`.
  - **Tampilan Tabel Modern (`CommodityMappingPage.tsx`)**:
    - Kolom khusus *"Tarif Khusus (Tier 0)"* menampilkan nominal terformat, kode marking awal, dan tanggal agen.
  - Auto-suggestions pencarian nama barang operasional (`commodityMappingApi.getSuggestions`).
  - Aksi *"Apply Mappings to Upload"*: Mengaplikasikan normalisasi ke riwayat file upload aktif.

---

## 4. Endpoint API Terkait
| Domain | Endpoint | Method | Deskripsi |
|---|---|:---:|---|
| Price List | `/api/price-list/filters` | `GET` | Opsi filter cabang, kategori, sheet type |
| Price List | `/api/price-list/trend` | `GET` | Tren grafik fluktuasi harga rute |
| Price List | `/api/price-list/uploads` | `GET` | Riwayat unggahan master tarif |
| Price List | `/api/price-list/uploads/:id/diff` | `GET` | Bedah komparasi tarif baru vs lama |
| Price List | `/api/price-list/uploads/:id/effective-date` | `PATCH` | Ubah tanggal berlaku efektif tarif |
| Price List | `/api/price-list/upload` | `POST` | Unggah berkas Excel master tarif |
| Price List | `/api/price-list/lookup` | `GET` | Pencarian tarif berlaku umum |
| Customer Price | `/api/customer-price-list` | `GET` | Daftar customer bertarif kontrak khusus |
| Customer Price | `/api/customer-price-list/:custCode/active` | `GET` | Tarif aktif kontrak customer |
| Customer Price | `/api/customer-price-list/:custCode/uploads` | `GET` | Riwayat upload per customer |
| Customer Price | `/api/customer-price-list/items` | `GET` / `POST` | CRUD harga komoditas khusus customer |
| Commodity Mapping | `/api/commodity-mapping` | `GET` / `POST` | List & buat aturan mapping (Tier 0, marking, cabang) |
| Commodity Mapping | `/api/commodity-mapping/suggestions` | `GET` | Saran nama komoditas operasional |
| Commodity Mapping | `/api/commodity-mapping/apply-to-upload` | `POST` | Terapkan aturan mapping ke upload |
