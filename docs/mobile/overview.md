# 📊 Mobile Overview & Exit Activity (`mobile/app/(tabs)/overview.tsx`)

Pusat informasi eksekutif, peringatan dini operasional lapangan, dan pemantauan aktivitas kontainer/batch yang keluar gudang (*Exit Activity*).

---

## 1. Fitur & Komponen Layar Overview
- **Header Pengguna**: Sapaan nama user (`fullName`/`username`), badge role, toggle bahasa bilingual (`ID`/`EN`), dan toggle tema (`Midnight`/`Heritage`).
- **Seksi Peringatan Dini Operasional (Actionable Alerts)**:
  - **ETA NOT EXIT**: Jumlah batch yang sudah melewati jadwal kedatangan namun belum keluar gudang. Mengetuk kartu langsung memfilter daftar batch di bawah (`exitScope=eta_not_exit`).
  - **MISSED SLA**: Jumlah batch dengan durasi transit ETD $\to$ ETA melewati target SLA cabang. Mengetuk kartu langsung memfilter batch yang terlambat transit (`exitScope=missed_sla`).
  - Ikon panah/chevron membuka dialog ringkasan rincian per-consignee terdampak.
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
  - **In-Place Modal Manifest (`BatchManifestSheet`)**: Mengetuk item batch memunculkan modal lembar manifest secara in-place di halaman Overview tanpa berpindah tab ke Logistik.
  - **Aksi Cepat Buat BAP (`+ BAP`)**: Setiap baris kargo di lembar manifest dilengkapi tombol `+ BAP` yang langsung membuka form BAP (`InspectionFormSheet`) dengan data ter-autofill (Moda, Marking Code, Marking No, List Code, No. Resi, Nama Customer).
- **Pull-to-Refresh**: Gesture tarik ke bawah untuk memuat ulang data KPI dan daftar batch secara real-time.

---

## 2. Endpoint API Terkait
| Endpoint | Method | Query Parameters | Deskripsi |
|---|:---:|---|---|
| `/api/marking/kpi` | `GET` | `isClosed=true` | Ringkasan batch exit: kemarin, hari ini, besok, exit 7 hari, alert ETA/SLA |
| `/api/marking` | `GET` | `exitScope`, `listType`, `year`, `limit=50` | Daftar batch exit terkini sesuai kriteria filter aktif |
| `/api/marking/:id/manifest` | `GET` | Path `:id` (`fdMarkingCode`) | Rincian resi manifest dalam batch terpilih |
