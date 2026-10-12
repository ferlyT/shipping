# 🚀 Backend: Modul Input & Revisi Data (`data-revisions`)

Modul backend ini menangani seluruh logika bisnis penyimpanan, auto-numbering, eksekusi pembatalan data inputan manifest (`fdCancel = 1`), auto-detect billing, manajemen file lampiran, dan ekspor data ke Excel.

---

## 🗄️ Model Database (MSSQL & Prisma)
- **`tbDataRevision`**: Tabel master penyimpan formulir (No. Form, Tipe Data, Target Aksi, Status, Tanggal, PIC 5 tanda tangan, audit eksekusi cancel, dan hasil auto-detect invoice).
- **`tbDataRevisionDetail`**: Tabel baris rincian komparasi (`fdAwalCustCode`, `fdAwalSpMark`, `fdAwalNoBilling`, `fdAwalQtyVolWgt`, `fdAwalNoInputan`, `fdAwalDetail` vs `fdBaru...`).
- **`tbDataRevisionLampiran`**: Tabel berkas foto/PDF fisik yang diunggah.
- **`tbDataRevisionCounter`**: Counter atomik penomoran format `NNN/MM/YYYY` per bulan dan tahun.

---

## 📡 Daftar Endpoint REST API (`/api/data-revisions`)

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/data-revisions/next-number` | Menghasilkan nomor form berikutnya atomik `NNN/MM/YYYY`. |
| `GET` | `/api/data-revisions` | Mengambil daftar dokumen form dengan pagination, debounced search, dan filter status/kategori/aksi. Otomatis menjalankan auto-detect billing. |
| `GET` | `/api/data-revisions/:id` | Mengambil 1 dokumen form lengkap beserta rincian baris dan lampiran. |
| `POST` | `/api/data-revisions` | Menyimpan dokumen form baru beserta baris detailnya. Status default `PENDING`. |
| `PUT` | `/api/data-revisions/:id` | Memperbarui header form dan menyinkronkan baris detail. |
| `DELETE` | `/api/data-revisions/:id` | Melakukan soft-delete form (`fdDeletedAt = CURRENT_TIMESTAMP`). |
| `POST` | `/api/data-revisions/:id/execute-cancel` | **Mengeksekusi pembatalan**: Mengubah `tbEntryList.fdCancel = 1` untuk seluruh no inputan (`fdListCode`) terkait, dan mengupdate status form menjadi `DATA_CANCELLED`. |
| `POST` | `/api/data-revisions/:id/revert-cancel` | Mengembalikan status `tbEntryList.fdCancel = 0` dan mengembalikan status form menjadi `PENDING`. |
| `POST` | `/api/data-revisions/:id/lampiran` | Mengunggah berkas foto/PDF ke direktori `public/uploads/data-revisions/`. |
| `DELETE` | `/api/data-revisions/lampiran/:id` | Menghapus fisik file dan record lampiran dari database. |
| `GET` | `/api/data-revisions/export/excel` | Mengunduh berkas rekapitulasi data lengkap ke Excel `.xlsx`. |
