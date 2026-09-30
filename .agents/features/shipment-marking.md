# 📦 Shipment & Marking Context & Implementation Details — mshipping

Dokumen konteks teknis untuk modul Shipment dan Audit Ukuran Batch Marking (`src/features/shipment-batches/`).

---

## 1. Audit Ukuran & Tonase per Marking (`MarkingSizeTable.tsx`)
- **Penjajaran Tombol Markup Sejajar dengan `fdM3`**:
  - Tombol tag markup `<button>` dan nilai `fdM3` dibungkus dalam kontainer `inline-flex items-center justify-end gap-1.5` dengan properti `whitespace-nowrap` pada elemen `<td>`.
  - Memisahkan elemen badge kubikasi dari tombol markup amber, menjamin keduanya selalu sejajar horizontal dalam satu baris dengan penjajaran vertikal tengah (`items-center`).
  - Menambahkan `whitespace-nowrap` pada header kolom `M³ Gdg` (`<th>`).
- **Tag Deteksi Mark Up Dimensi (`MARK UP`)**:
  - Aktif jika kargo memiliki rekaman ukuran asli di `tbEntryListDetailOri`.
  - Mengklik tag langsung membuka modal dimensi dengan tab *Gudang Asli (Ori)* aktif.
- **Dukungan Modal 4-Tab Dimensi Koli**:
  - Tab: *Gudang*, *Gudang Asli (Ori)*, *Packing List*, *Komplain*.
  - Rincian box diurutkan secara konsisten berdasarkan **`fdListDCode ASC`**.
- **Ekspor Excel 4 Sheet**: Sheet `DETAIL`, `ORIGINAL`, `KOMPLAIN`, dan `REKAP`.

---

## 2. Unifikasi Cabang & Distribusi Komoditas
- Seluruh kode cabang `--` dan `-` dinormalisasi menjadi cabang **`SG` (Singapore)**.
- Nama resmi cabang diselaraskan dari master `tbCabang` (`fdBranchCode` $\to$ `fdBranchName`).
- Filter waktu KPI eksekutif menggunakan tanggal loading `tbMarking.fdLoadDate` tahun berjalan (2026).
