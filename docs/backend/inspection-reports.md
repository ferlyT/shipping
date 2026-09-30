# 📋 Modul Inspection Reports (Berita Acara Pemeriksaan / BAP)

Modul ini menangani pencatatan dan pengelolaan Berita Acara Pemeriksaan (BAP) kargo secara terpadu di dalam database ERP MS SQL Server `mshipping`.

---

## 🏗️ Tabel Database

### `tbInspectionReport`
| Kolom | Tipe | Keterangan |
|---|---|---|
| `fdId` | `INT IDENTITY(1,1)` | Primary Key |
| `fdReportNumber` | `NVARCHAR(30)` | Nomor BAP unik format `BAP-YYYY-MM-XXXXX` |
| `fdReportDate` | `DATETIME2` | Tanggal dan waktu pemeriksaan |
| `fdListType` | `INT` | Moda Pengiriman: `1` (Udara / Air), `2` (Laut / Sea, default) |
| `fdListCode` | `CHAR(7)` | List code kargo (opsional) |
| `fdMarkingCode` | `NVARCHAR(50)` | Kode marking kargo |
| `fdMarkingNo` | `NVARCHAR(50)` | Nomor marking kargo |
| `fdNamaCustomer` | `NVARCHAR(150)` | Nama customer / pemilik barang |
| `fdTerima` | `NVARCHAR(50)` | Nomor tanda terima / resi pengiriman |
| `fdKeterangan` | `NVARCHAR(MAX)` | Catatan hasil pemeriksaan fisik kargo |
| `fdStatus` | `NVARCHAR(1)` | Status: `'1'` (Draft), `'2'` (Selesai) |
| `fdCreatedBy` | `NVARCHAR(100)` | Username pembuat BAP |
| `fdCreatedAt` | `DATETIME2` | Timestamp pembuatan |
| `fdUpdatedAt` | `DATETIME2` | Timestamp perubahan |
| `fdDeletedAt` | `DATETIME2` | Soft-delete timestamp |

### `tbBAPCounter`
| Kolom | Tipe | Keterangan |
|---|---|---|
| `fdYear` | `INT` | Tahun (composite PK) |
| `fdMonth` | `INT` | Bulan 1-12 (composite PK) |
| `fdCount` | `INT` | Angka urut berjalan per bulan |

### `tbInspectionPhoto`
| Kolom | Tipe | Keterangan |
|---|---|---|
| `fdId` | `INT IDENTITY(1,1)` | Primary Key |
| `fdReportId` | `INT` | Foreign Key ke `tbInspectionReport.fdId` (Cascade delete) |
| `fdPhotoUrl` | `NVARCHAR(500)` | Lokasi file relatif `/uploads/bap-photos/{filename}` |
| `fdCaption` | `NVARCHAR(255)` | Catatan atau judul foto kargo (opsional) |
| `fdUploadedBy` | `NVARCHAR(100)` | Username pengunggah foto |
| `fdCreatedAt` | `DATETIME2` | Timestamp unggah foto |

---

## 🔌 REST API Endpoints

Base path: `/api/inspection-reports` (dan `/mshipping/api/inspection-reports`)

Semua endpoint memerlukan header `Authorization: Bearer <token>`.

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/` | List BAP terpaginasi (`page`, `limit`, `search`, `status`, `listType`) + field `photoCount` |
| `GET` | `/stats` | Statistik agregat BAP (Total form, total bulan ini vs bulan lalu, MoM growth %, breakdown status Draft & Done, ranking Top 5 customer, tren 6 bulan) |
| `GET` | `/lookup` | Autocomplete data kargo dari `vwShipment` (`search`, `listType`, `page`, `limit`) mengembalikan `fdMarkingCode`, `fdMarkingNo`, `fdListCode`, `fdCustName`, `fdTerima`, `fdListType` |
| `GET` | `/:id` | Detail BAP berdasarkan `fdId` beserta array `photos` |
| `POST` | `/` | Buat BAP baru + generate nomor urut otomatis (payload menyertakan `fdListType`) |
| `PUT` | `/:id` | Update data BAP (termasuk `fdListType`) |
| `DELETE` | `/:id` | Soft-delete BAP |
| `POST` | `/:id/photos` | Upload foto BAP (body `{ photoBase64, caption? }`) — otomatis mencetak watermark tag identitas kargo (marking, customer, resi, BAP no, timestamp) permanen ke pixel file JPEG via `sharp` |
| `GET` | `/:id/photos` | Ambil seluruh foto pemeriksaan BAP |
| `DELETE` | `/:id/photos/:photoId` | Hapus foto spesifik dan file fisik dari disk |

---

## 🏷️ Fitur Burned-in Watermark Foto BAP
Setiap foto yang diunggah melalui endpoint `POST /:id/photos` diproses melalui layanan [`imageWatermark.service.ts`](file:///c:/shipping/backend/src/modules/inspection-reports/imageWatermark.service.ts) menggunakan library `sharp`:
1. Normalisasi rotasi EXIF foto.
2. Auto-resize dimensi foto ke maksimal **1600 × 1600 piksel** (menjaga rasio aspek asli, tanpa pembesaran jika foto lebih kecil) untuk efisiensi penyimpanan dan konsistensi ukuran berkas (~200 KB - 450 KB).
3. Pembuatan banner overlay SVG dinamis di bagian bawah foto (`rgba(0, 0, 0, 0.88)` s.d. `0.94`) dengan aksen garis gradient.
4. Mencetak: Kode Marking, Nomor Marking, Nama Customer, Nomor Resi, Nomor BAP, dan Timestamp waktu unggah (WIB).
5. Hasil disimpan sebagai berkas JPEG teroptimasi via `mozjpeg` pada kualitas 80 di folder terisolasi per BAP.

---

## 📁 Struktur Penyimpanan Folder Foto & Pengarsipan Hapus
1. **Foto Aktif Tersimpan per Folder BAP**:
   - Setiap foto disimpan dalam sub-direktori mandiri sesuai Nomor BAP:
     `public/uploads/bap-photos/[Nomor-BAP]/bap_[id]_[timestamp]_[rand].jpg`
   - URL akses publik: `/uploads/bap-photos/[Nomor-BAP]/[filename].jpg`
2. **Pengarsipan Otomatis Saat BAP Dihapus (Soft Delete)**:
   - Saat dokumen BAP dihapus (`DELETE /api/inspection-reports/:id`), seluruh folder foto BAP tersebut otomatis dipindahkan (di-move) ke direktori arsip sampah:
     `public/uploads/bap-photos/deleted/[Nomor-BAP]/`
   - Kolom `fdPhotoUrl` di tabel `tbInspectionPhoto` otomatis disesuaikan ke path `/uploads/bap-photos/deleted/...`.
   - Folder aktif `bap-photos/` tetap bersih dan tertata rapi.
3. **Penghapusan Foto Satuan**:
   - Jika foto dihapus satu per satu via `DELETE /api/inspection-reports/:id/photos/:photoId`, berkas fisik tidak dimusnahkan melainkan otomatis dipindahkan (di-move) ke direktori arsip sampah:
     `public/uploads/bap-photos/deleted/[Nomor-BAP]/[filename].jpg`
   - Record database `tbInspectionPhoto` dihapus dari tampilan aplikasi, dan subfolder aktif yang kosong otomatis dibersihkan.

