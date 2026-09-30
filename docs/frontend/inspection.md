# 📋 Modul Berita Acara Pemeriksaan / BAP (`src/features/inspection/`)

Modul ini mengelola dokumentasi dan pencatatan fisik kondisi kargo saat pemeriksaan di gudang, termasuk pengelolaan foto barang dengan burned-in watermark dan pengarsipan otomatis.

---

## 1. Halaman Berita Acara Pemeriksaan (`pages/InspectionReportsPage.tsx`)
- **Navigasi**: Terletak di bawah modul **LOGISTIK** (`ROUTES.INSPECTION_REPORTS = '/mshipping/logistics/inspection-reports'`).
- **Permission Guard**: Dilindungi izin `canAccessLogistics` / `canManageInspectionReports`.
- **Breadcrumbs 3-Level**: `LOGISTIK` $\to$ `Berita Acara (BAP)`.
- **Ringkasan & Analitik / KPI (Sesuai `local-charges/frontend/src/features/inspection-reports/pages/List.tsx`)**:
  - Tombol toggle `Sembunyikan Analitik` / `Tampilkan Analitik` (`ChevronUp` / `ChevronDown`) dengan state persistensial.
  - **4 Stat Cards Utama**:
    - **Total Form**: Total seluruh dokumen BAP di sistem (`stats.totalForms`).
    - **Bulan Ini**: Total BAP terbit bulan berjalan (`stats.totalThisMonth`), subtext komparasi `vs X bulan lalu`, dan badge pertumbuhan MoM (`growthPercent`) dengan indikator warna (`TrendingUp` hijau / `TrendingDown` merah / `Minus`).
    - **Draft**: Dokumen BAP yang belum selesai diproses (`stats.byStatus.Draft`).
    - **Done**: Dokumen BAP yang telah diselesaikan (`stats.byStatus.Done`).
  - **3 Panel Visual / Charts**:
    - **Tren 6 Bulan (Form per Bulan)**: AreaChart interaktif berbasis Recharts dengan kurva `monotone`, gradient fill ungu (`#8b5cf6`), CartesianGrid horizontal, XAxis bulan lokal (`id-ID`), YAxis, dan styled Tooltip multi-tema.
    - **Distribusi Status (Breakdown)**: Progress bar animasi untuk status Draft (amber) dan Done (emerald), persentase per status, counter angka, dan ringkasan total.
    - **Customer Teratas (Top 5)**: Ranking Top 5 pelanggan dengan nomor urut 1–5, nama customer, counter transaksi (`X×`), dan progress bar proporsional.
  - Skeleton wireframe `.skeleton-shimmer` saat initial load query (`useInspectionReportsStats`).
- **Filter Toolbar Terpadu (`InspectionFilterBar.tsx`)**:
  - Kolom pencarian teks (No. BAP, Marking, Customer, Resi) dengan tombol reset cepat `X`.
  - Pill selector Moda: `[ Semua ]` | `[ ✈️ Udara ]` | `[ 🚢 Laut ]`.
  - Pill selector Status: `[ Status ]` | `[ Draft ]` | `[ Selesai ]`.
  - Tombol aksi utama `+ Buat BAP Baru`.

---

## 2. Tabel Data BAP Compact ERP (`InspectionTable.tsx`)
- Kolom:
  - `No. BAP`: Nomor atomik format `BAP-YYYY-MM-XXXXX` font monospace tebal.
  - `Tanggal`: Tanggal pemeriksaan format `DD/MM/YYYY`.
  - `Moda`: Badge semantik Udara (`Plane`, sky) / Laut (`Ship`, blue).
  - `Marking & List`: Kode marking, nomor marking `#XX`, list code kargo.
  - `Customer & Resi`: Nama resmi customer dan nomor resi terima (`fdTerima`).
  - `Foto`: Live badge counter foto dengan ikon kamera.
  - `Status`: Badge status `Draft` (amber) / `Selesai` (emerald).
  - `Aksi`: Tombol detail (`Eye`), edit (`Edit2`), dan hapus (`Trash2`).

---

## 3. Modal Form BAP (`InspectionFormModal.tsx`)
- **Semua Kolom Wajib Diisi (`*`)**:
  - Moda Pengiriman: Switcher Udara (Air) vs Laut (Sea).
  - Tanggal Pemeriksaan: Date picker.
  - Kode Marking: Input pencarian dengan autocomplete dinamis ke master kargo (`useInspectionMarkingLookup`).
  - Auto-fill Cerdas: Memilih saran otomatis mengisi kode marking, marking no, list code, resi terima, dan nama customer.
  - Nama Customer: Input teks wajib.
  - No. Marking, List Code, No. Resi: 3 kolom grid wajib.
  - Keterangan Pemeriksaan: Textarea catatan fisik kargo (kondisi kardus, kemasan, lakban, isi).
  - Status BAP: Toggle Draft vs Selesai.

---

## 4. Modal Detail & Galeri Foto (`InspectionDetailModal.tsx` & `components/lampiran/`)
- Desain antarmuka mengadopsi standar `local-charges/frontend/src/components/lampiran` & `Form.tsx`:
  - **Metadata Header Card**: Ringkasan info No. BAP, Petugas pemeriksa, Tanggal, dan Status badge.
  - **Tab Switcher**: Tab `Foto Pemeriksaan (N)` dan `Detail & Kargo`.
- **Modul Galeri Foto Lampiran (`components/lampiran/`)**:
  - `InspectionLampiranUploader.tsx`: Drag & drop area dashed border, multi-file upload, upload progress bar animasi, dan listener **`CTRL+V` paste dari clipboard**.
  - `LampiranItem.tsx`: Grid card foto (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`) dengan tag index `#1`, hover overlay aksi (Lihat `Eye`, Unduh `Download`, Hapus `Trash2`), caption nama file, dan timestamp/uploader.
  - `LampiranLightbox.tsx`: Fullscreen lightbox gelap (`backdrop-blur-sm`) dengan tombol Putar 90° (`RotateCw`), Zoom In/Out dengan persentase (`ZoomIn`/`ZoomOut`), Download langsung, navigasi panah kiri/kanan (`ChevronLeft`/`ChevronRight`), dan shortcut keyboard (Esc, Arrows, R, + / -).
  - Server-side burned-in tag watermark (Marking, Customer, Resi, BAP No, Timestamp WIB) terintegrasi pada setiap foto.
  - Tombol hapus foto dengan konfirmasi; fisik berkas otomatis diarsipkan ke `deleted/[Nomor-BAP]/`.
  - Tombol unduh file langsung ke penyimpanan lokal browser.
  - Informasi uploader dan waktu unggah.

---

## 5. Endpoint API Terkait
| Endpoint | Method | Parameter / Payload | Deskripsi |
|---|:---:|---|---|
| `/api/inspection-reports` | `GET` | `page`, `limit`, `search`, `listType`, `status` | Query list BAP terpaginasi |
| `/api/inspection-reports/stats` | `GET` | - | Statistik agregat BAP (KPIs, tren 6 bulan, status breakdown, top 5 customer) |
| `/api/inspection-reports/lookup` | `GET` | `q`, `listType` | Autocomplete data marking kargo |
| `/api/inspection-reports/:id` | `GET` | Path `id` | Detail tunggal BAP beserta daftar foto |
| `/api/inspection-reports` | `POST` | `CreateInspectionPayload` | Pembuatan BAP baru (auto-numbering BAP) |
| `/api/inspection-reports/:id` | `PUT` | `UpdateInspectionPayload` | Pembaruan data BAP |
| `/api/inspection-reports/:id` | `DELETE` | Path `id` | Hapus BAP & arsipkan folder foto |
| `/api/inspection-reports/:id/photos` | `POST` | `photoBase64`, `caption` | Unggah foto dengan auto-resize & watermark |
| `/api/inspection-reports/:id/photos/:photoId` | `DELETE` | Path `id`, `photoId` | Hapus foto & pindahkan ke folder arsip sampah |
