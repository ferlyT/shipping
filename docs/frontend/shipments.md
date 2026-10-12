# 📦 Modul Shipment & Resi Lapangan (`src/features/shipments/`)

Modul ini mengelola pencarian, pelacakan, analitik distribusi komoditas, serta inspeksi dimensi fisik dari seluruh resi pengiriman barang di gudang asal maupun tujuan.

---

## 1. Dashboard Shipment (`pages/DashboardPage.tsx`)
- **Switcher Moda**: Pill toggle `[ Semua Moda ]` | `[ ✈️ Udara ]` | `[ 🚢 Laut ]`.
- **5 Kartu KPI Eksekutif (Tahun Berjalan Berdasarkan `fdLoadDate`)**:
  - Total Resi, Total Koli, Total Berat (kg), Total Volume (m³), dan Customer Aktif unik (`COUNT(DISTINCT fdCustName)`).
  - Menggunakan tanggal muat loading (`tbMarking.fdLoadDate`) tahun berjalan (2026) secara konsisten untuk komparasi MoM.
  - Visual ratio bar proporsional tipis (sky untuk udara, indigo untuk laut).
- **Grafik Distribusi Komoditas & Filter Cabang (`CommodityDistributionCard.tsx`)**:
  - Visualisasi `BarChart` horizontal (Recharts) memisahkan moda Laut dan Udara.
  - Peringkat komoditas teratas (Umum, Lartas, Garment, Food, dll).
  - Normalisasi cabang `--` dan `-` disatukan ke cabang **`SG` (Singapore)**.
  - Nama resmi cabang diambil langsung dari master data `tbCabang` (`fdBranchCode` $\to$ `fdBranchName`).
  - Toolbar pill filter cabang: `[Semua Cabang]`, `[SG]`, `[GZ]`, `[HK]`, `[YW]`, `[SH]`, `[SZ]`, `[EX]`, `[IM]`, `[LG]`, `[LM]`.
  - Switcher 4 dimensi metrik: Total Resi, Total Koli, Berat (kg), dan Volume (m³).

---

## 2. Halaman Daftar Resi Shipment (`pages/ListPage.tsx`)
- **Toolbar Smart Search Universal (`ShipmentToolbar.tsx`)**:
  - Kolom pencarian terpadu tunggal selebar penuh tanpa dropdown manual.
  - Integrasi autocomplete cerdas dengan `SearchSuggestionsDropdown.tsx` (`GET /api/shipments/suggestions?q=...`).
  - **Debounce 300ms** (`useDebounce`) untuk mencegah flooding request.
  - **Auto-Sync Scope**: Memilih saran customer otomatis menyetel `searchField` ke `'customer'`, marking ke `'marking'`, dan resi ke `'resi'`.
- **Modal Rincian Dimensi Fisik & Logistik (`ShipmentDetailModal.tsx`)**:
  - Dialog responsif dengan tinggi statis (`h-[88vh] sm:h-[82vh]`) dan bodi scrollable.
  - **Tab Ringkasan (`ShipmentInfoTab.tsx`)**: 3 KPI (Koli, Berat kg, Volume m³), identitas resi terima, tracking lokal, marking & no, tanggal agent, komoditas, catatan operasional, dan **Riwayat Pembuatan & Pembaruan (Audit Trail)** menampilkan Dibuat Oleh (`fdEmp1` & timestamp `fdCreatedDate`) serta Terakhir Diperbarui (`fdEmp2` & timestamp `fdUpdate`) dengan format standar WIB.
  - **Tab Dimensi (`ShipmentDimensionsTab.tsx`)**: Komparasi dimensi fisik 3 sumber: **Gudang**, **Packing List**, dan **Komplain Customer** ($P \times L \times T$, Qty, M³).
  - **Tab Timeline (`ShipmentTimelineTab.tsx`)**: Pelacak visual alur status (*Entri Data Resi* dengan tanggal input & PIC, *Waiting Loading*, *ETD*, *ETA*, *Warehouse*, *Delivery*, *Delivered*, *Canceled*), dan **Status Blocked Finance** jika memiliki `fdBlocked = 1` pada `tbEntryList_Bloked_Finance` (lengkap dengan nama pemblokir & alasan).
  - **Tab Invoice (`ShipmentInvoiceTab.tsx`)**: Aktif dinamis jika invoice terkait telah terbit/lunas:
    - Header info faktur, status tagihan (`BillingStatusTag`), tanggal invoice/terbit, penerima tagihan (`fdBillTo`) & nama customer resmi.
    - 3 KPI Finansial: Total Tagihan, Sudah Dibayar, Sisa Tagihan.
    - Tabel rincian muatan dengan kolom No List (`fdListCode`), tarif, subtotal, dan tombol aksi ke halaman detail/cetak invoice.

---

## 3. Endpoint API Terkait
| Endpoint | Method | Parameter / Payload | Deskripsi |
|---|:---:|---|---|
| `/api/shipments/kpi` | `GET` | `year`, `listType`, `branch`, `search` | Agregasi KPI resi, koli, berat, volume, rasio moda |
| `/api/shipments/branches` | `GET` | None | Daftar cabang aktif dengan unifikasi `--` ke `SG` |
| `/api/shipments` | `GET` | `page`, `limit`, `search`, `searchField`, `listType`, `branch`, `status` | Tabel data resi shipment |
| `/api/shipments/suggestions` | `GET` | `q` | Saran autocomplete resi, customer, marking (< 50ms, cache 30s) |
| `/api/shipments/:id` | `GET` | Path `id` | Detail tunggal resi shipment & status blocked finance |
| `/api/shipments/:id/dimensions/gudang` | `GET` | Path `id` | Rincian dimensi fisik ukur gudang |
| `/api/shipments/:id/dimensions/packinglist` | `GET` | Path `id` | Rincian dimensi fisik dokumen packing list |
| `/api/shipments/:id/dimensions/komplain` | `GET` | Path `id` | Rincian dimensi revisi komplain pelanggan |
