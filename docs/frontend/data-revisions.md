# 📝 Dokumentasi Frontend: Input & Revisi Data

Modul **Input & Revisi Data** (`frontend/src/features/data-revisions/`) digunakan untuk mencatat dan memantau formulir pengajuan perubahan data, pembatalan data inputan manifest (`fdCancel = 1`), atau penerbitan tagihan/bill baru.

---

## 🧭 Rute & Navigasi
- Rute Utama: `ROUTES.DATA_REVISIONS` (`/mshipping/logistics/data-revisions`)
- Form Baru: `ROUTES.DATA_REVISION_NEW` (`/mshipping/logistics/data-revisions/new`)
- Edit Form: `ROUTES.DATA_REVISION_EDIT(id)` (`/mshipping/logistics/data-revisions/:id/edit`)
- Cetak Form A4: `ROUTES.DATA_REVISION_PRINT(id)` (`/mshipping/logistics/data-revisions/:id/print`)

---

## ⚙️ Fitur Utama
1. **Target Aksi Sistem**:
   - `BUAT_BILL` *(Default)*: Opsi standar untuk pengajuan pembuatan tagihan/invoice baru. Sistem memantau `tbBilling` secara otomatis (**Auto-Detect**) dan mengubah status formulir menjadi **Bill Terbuat** saat invoice terbit di FoxPro/MSSQL.
   - `CANCEL_DATA`: Untuk membatalkan data manifest lama (`UPDATE tbEntryList SET fdCancel = 1`). Nomor inputan target yang dibatalkan wajib diisi pada kolom **DATA AWAL** (`fdAwalNoInputan`). Tombol eksekusi dan revert tersedia bagi staf operasional berwenang.
2. **Form Wizard 4-Step**:
   - **Step 1 (Officers)**: Memilih Target Aksi (default: *Buat Bill*). Jika aksi adalah *Cancel Data*, input pilihan "Kategori Tipe Data *" otomatis disembunyikan. Jika aksi adalah *Buat Bill*, user dapat memilih kategori (`INPUT BARU` / `INPUT LOCAL CHARGES` / `REVISI`). Dilengkapi Nomor Form otomatis (`NNN/MM/YYYY`), Tanggal, dan Accordion opsional Penanggung Jawab (5 PIC: Dibuat Oleh, Stuffing, Billing, AR, Diketahui) yang default tertutup.
   - **Step 2 (Rincian Data)**: Perbandingan baris dinamis **DATA AWAL** vs **DATA BARU**. Jika aksi adalah `CANCEL_DATA`, field No. Inputan di DATA AWAL diberi highlight rose tegas dan alert ribbon penjelas. Dilengkapi modal autocomplete instan: Customer (`CustomerLookupModal`) dan No. Inputan (`InputanLookupModal` murni scan `fdListCode` <60ms tanpa istilah usang SPBL).
   - **Step 3 (Lampiran)**: Area upload dengan dukungan **Drag & Drop** nyata (highlight border saat file digeser ke dropzone), preview thumbnail responsif, dan modal lightbox gambar resolusi tinggi.
   - **Step 4 (Review & Simpan)**: Ringkasan komparasi sebelum simpan. Dilengkapi banner callout khusus yang mendaftar daftar `fdListCode` target pembatalan jika aksi `CANCEL_DATA` aktif, serta pilihan *Simpan Selesai* atau *Simpan & Cetak Form*.
3. **Cetak Form Fisik A4 Presisi**:
   - Mereplikasi 1:1 layout lembar resmi "FORM INPUT & REVISI DATA": kop form, tabel perbandingan Data Awal vs Data Baru, 5 box tanda tangan basah (`DIBUAT OLEH`, `STUFFING`, `BILLING`, `AR`, `DIKETAHUI`), dan catatan kaki update 11.8.2026.
4. **List View & Analytics**:
   - 4 Kartu KPI Ringkasan (Total Dokumen, Menunggu, Data Dibatalkan, Bill Terbuat) dan pill rincian kategori.
   - Dual View: Table View & Grid View responsif.
   - Debounced search, status filter segmented pills, eksekusi tombol pembatalan data, dan ekspor data ke Excel `.xlsx`.
5. **Modal View Detail & Galeri Lampiran Interaktif**:
   - **`RevisionDetailViewModal`**: Pratinjau detail lengkap formulir langsung dari tabel/grid (klik nomor form atau tombol ikon `Eye`), menampilkan status operasional, komparasi perbandingan data awal vs baru, audit PIC dan penanggung jawab, serta tombol cetak/edit.
   - **`RevisionGalleryModal`**: Galeri foto lampiran interaktif berbasis lightbox dengan navigasi `Next`/`Prev` (tombol on-screen & panah keyboard), counter foto `Foto X dari Y`, thumbnail strip di bawah, kontrol Zoom In/Out/Reset, rotasi 90° (`RotateCw`), unduh berkas, dan buka tab baru. Dukungan pratinjau dokumen PDF secara inline.
