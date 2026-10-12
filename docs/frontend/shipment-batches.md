# 🚢 Modul Kontainer & Batch Marking (`src/features/shipment-batches/`)

Modul ini memantau kapasitas batch kontainer laut, nomor AWB kargo udara, histori tanggal keluar gudang, data manifest resi muatan, serta audit komparasi ukuran & tonase per marking.

---

## 1. Dashboard Batch Marking (`pages/DashboardPage.tsx`)
- **Fitur**:
  - Pemantauan kontainer aktif vs ditutup (*closed*).
  - Kalender & grafik histori keluar barang gudang (`ExitListModal.tsx`).
  - **Modal Rincian Operasional Per Tahun**:
    - **`EtaSummaryModal.tsx` (ETA Belum Keluar)**: Rincian batch melewati jadwal ETA namun belum keluar gudang. Dilengkapi filter tab per tahun (`2026`, `2025`, `2024`, dll. + `Semua`), tahun aktif default, penghitungan KPI tahunan, dan sub-grouping per consignee.
    - **`MissedTargetModal.tsx` (Melewati Target SLA)**: Rincian batch dengan transit time melebihi target SLA rute cabang. Dilengkapi filter tab per tahun, tahun aktif default, dan kalkulasi deviasi.

---

## 2. Halaman Daftar Batch Marking (`pages/ListPage.tsx`)
- **Tampilan Nomor Muatan Cerdas**: Menampilkan Nomor AWB untuk kargo Udara (`listType = 1`) dan Nomor Kontainer untuk Laut (`listType = 2`).
- **Hirarki Tanggal Operasional**: `Exit Date` $\to$ `ETA` $\to$ `ETD` $\to$ `Load Date`.
- **Toolbar Pencarian & Dropdown Saran Batch (`BatchToolbar.tsx`)**:
  - Terhubung dengan `SearchSuggestionsDropdown` (`GET /api/marking/suggestions?q=...`).
  - **Debounce 300ms** dan auto-sync `searchScope` ke `'code'` saat item marking dipilih.
- **Modal Manifest Muatan (`ManifestModal.tsx` / `ManifestList.tsx`)**:
  - Menampilkan seluruh resi muatan fisik dalam batch (`GET /api/marking/:id/manifest`).
  - **Status Finansial & Override Blocked Finance**:
    - Menampilkan status finansial dari master `tbCustomers.fdBlocked` (`OK`, `COD`, `WARNING`, `BLOCKED`, `URGENT`).
    - Jika item muatan diblokir oleh Finance (`tbEntryList_Bloked_Finance.fdBlocked = 1`), status finansial otomatis di-override menjadi badge merah **`BLOCKED`** lengkap dengan identitas pemblokir dan alasan catatan.
  - Pencarian instan di dalam manifest kargo (`GET /api/marking/:id/manifest/search?q=...`).

---

## 3. Halaman Audit Ukuran & Tonase per Marking (`pages/MarkingSizePage.tsx`)
Modernisasi form Visual FoxPro `frm_entrylistdetail_per_marking.scx` untuk mengaudit komparasi volume (M³) untuk kargo laut dan tonase berat (Kg) untuk kargo udara:

1. **Toolbar Autocomplete & State Awal Bersih (`MarkingSizeToolbar.tsx`)**:
   - Menu Sidebar: **Batch Marking** $\to$ **Audit Ukuran & Tonase** (`ROUTES.SHIPMENT_BATCH_MARKING_SIZE`).
   - Autocomplete kode batch marking real-time via `/api/marking/suggestions`, navigasi keyboard (Up/Down/Enter), tombol aksi **Tampilkan** (`Show`), dan sinkronisasi parameter URL `?code=...`.
   - Pengurutan data: Sortir berdasarkan `ListCode` (Sort 1) vs `Nama Customer` (Sort 2).
   - Tombol ekspor Excel 4 sheet dan tombol refresh.
2. **5 Kartu KPI Ringkasan Adaptif (`MarkingSizeKpiSection.tsx`)**:
   - **Moda Laut**: Ukuran Kontainer, Total Koli PL vs Gudang (badge selisih), Total M³ Gudang (dengan M³ PL & Net Komplain), Selisih M³, dan Total Tonase Berat (kg).
   - **Moda Udara**: Batch Udara (AWB/Kontainer), Total Koli, Total Berat Gudang vs List vs Net, Selisih Berat, dan Total Berat Surat Jalan (kg).
3. **Tabel Audit Komparasi 16 Kolom (`MarkingSizeTable.tsx`)**:
   - Identitas: No, ListCode, Customer (`displayCustName` SSOT `tbCustomers`), Marking No, Komoditas.
   - **Tag Deteksi Mark Up Dimensi (`MARK UP`)**:
     - Ditampilkan jika kargo memiliki data pada tabel ukuran asli gudang (`tbEntryListDetailOri`).
     - Berupa tombol outline amber (`Sparkles`) yang **sejajar horizontal (*inline-flex items-center gap-1.5 whitespace-nowrap*)** dengan nilai M³ Gudang (`fdM3`).
     - Mengklik tombol langsung membuka modal dimensi dengan tab *Gudang Asli (Ori)* aktif.
   - Koli: Pack PL vs Qty Gudang (alert merah jika selisih).
   - Kubikasi: M³ PL vs M³ Gudang (alert merah jika beda) vs M³ Komplain.
   - **Tombol Detil Terpadu**: Ikon `AlertCircle` merah jika ada komplain (langsung buka tab *Komplain*), atau ikon `Layers` standar (buka tab *Gudang*).
   - Tonase: Berat List vs Berat Gudang vs Berat SJ vs Berat Komplain.
   - Sticky footer `tfoot` dengan akumulasi total seluruh kolom.
4. **Modal Drilldown Dimensi Fisik Koli (`MarkingBoxDimensionModal.tsx`)**:
   - Responsif mobile: bottom sheet di mobile (`rounded-t-2xl max-h-[92vh]`) dan modal terpusat di desktop.
   - **4 Tab Dimensi Fisik Terintegrasi**:
     - *Gudang Fisik (`gudang`)*: Dimensi aktif dari `tbEntryListDetail`.
     - *Gudang Asli / Ori (`asliGudang`)*: Dimensi asli sebelum markup dari `tbEntryListDetailOri`.
     - *Packing List (`packingList`)*: Dimensi shipper dari `tbEntryListDetail_PackingList`.
     - *Komplain (`komplain`)*: Dimensi revisi dari `tbEntryListDetail_Komplain`.
   - Alert banner peringatan jika kargo mengalami mark up dimensi.
   - Mini KPI grid (Total Koli, Total Volume M³, Total VFC kg / varian box).
   - Seluruh rincian dimensi diurutkan secara konsisten berdasarkan **`fdListDCode ASC`**.
5. **Ekspor Excel 4 Sheet Sesuai Standar FoxPro (`markingSizeExcel.ts`)**:
   - Sheet 1: `DETAIL` (Rincian box gudang per listcode).
   - Sheet 2: `ORIGINAL` (Rincian ukuran asli gudang).
   - Sheet 3: `KOMPLAIN` (Rincian revisi komplain).
   - Sheet 4: `REKAP` (Tabel audit perbandingan 17 kolom + header kontainer & total).

---

## 4. Endpoint API Terkait
| Endpoint | Method | Parameter / Payload | Deskripsi |
|---|:---:|---|---|
| `/api/marking/kpi` | `GET` | `listType`, `search` | Agregasi kontainer & batch aktif |
| `/api/marking/exit-history` | `GET` | `month`, `listType`, `search` | Histori kalender tanggal keluar gudang |
| `/api/marking` | `GET` | `page`, `limit`, `search`, `listType`, `isClosed` | Daftar batch marking, BL/AWB, kontainer |
| `/api/marking/suggestions` | `GET` | `q` | Saran autocomplete batch marking, kontainer, B/L, AWB (< 50ms) |
| `/api/marking/:id/manifest` | `GET` | Path `id` | Seluruh resi shipment (`vwShipment`), status finansial, blocked finance |
| `/api/marking/:id/manifest/search` | `GET` | Path `id`, `q` | Pencarian langsung dalam manifest batch |
| `/api/marking/size-audit/:code` | `GET` | Path `code`, query `sort` | Data audit ukuran & tonase batch (17 kolom + 5 KPI) |
| `/api/marking/size-audit/:code/all-dimensions` | `GET` | Path `code` | Seluruh dimensi box batch untuk ekspor Excel 4-sheet |
| `/api/marking/box-dimensions/:listCode` | `GET` | Path `listCode` | Rincian dimensi per box 4 tab (Gudang, Ori, PL, Komplain) |
