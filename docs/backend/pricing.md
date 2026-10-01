# 🏷️ Modul Master Tarif & Evaluasi Harga (Pricing) — Backend

Dokumentasi spesifikasi endpoint tarif umum, tarif khusus pelanggan (`tbCustomersHarga`), pemetaan komoditas, dan engine evaluasi undercharge/overcharge.

---

## 1. 📂 Struktur Modul

- **Price List**: `backend/src/modules/price-list/` (`price-list.routes.ts`, `price-list.service.ts`)
- **Customer Price List**: `backend/src/modules/customer-price-list/` (`customer-price-list.routes.ts`, `customer-price-list.service.ts`)
- **Commodity Mapping**: `backend/src/modules/commodity-mapping/` (`commodity-mapping.routes.ts`, `commodity-mapping.service.ts`)
- **Price Check Engine**: `backend/src/modules/price-check/` (`price-check.routes.ts`, `price-check.service.ts`)

---

## 2. 🔌 Daftar Endpoint REST API

| Method | Endpoint | Permission | Keterangan |
|---|---|---|---|
| `GET` | `/api/price-list` | `/mshipping/price-list` | Daftar master tarif umum per rute, moda, dan komoditas |
| `POST` | `/api/price-list/upload` | `/mshipping/price-list` | Unggah file Excel untuk batch import tarif umum |
| `GET` | `/api/customer-price-list/branches` | `/mshipping/customer-price-list` | Daftar master branch resmi dari `tbCabang` |
| `GET` | `/api/customer-price-list` | `/mshipping/customer-price-list` | Daftar master tarif khusus per customer (`tbCustomersHarga`) |
| `GET` | `/api/customer-price-list/lookup` | `/mshipping/customer-price-list` | Lookup tarif khusus aktif instan berdasarkan `custCode` (multi-upload agregasi) |
| `POST` | `/api/customer-price-list` | `/mshipping/customer-price-list` | Menambahkan tarif khusus pelanggan baru |
| `PUT` | `/api/customer-price-list/:id` | `/mshipping/customer-price-list` | Memperbarui nominal tarif atau masa berlaku |
| `PATCH` | `/api/customer-price-list/uploads/:id/effective-date` | `/mshipping/customer-price-list` | Memperbarui masa berlaku upload (`effectiveDate` & `endDate`) dan sinkronisasi ke items |
| `PUT` | `/api/customer-price-list/items/:id/end-date` | `/mshipping/customer-price-list` | Mengatur tanggal berakhir (`endDate`) untuk item harga khusus |
| `GET` | `/api/commodity-mapping` | `/mshipping/commodity-mapping` | Daftar pemetaan variasi nama komoditas ke tipe resmi |
| `POST` | `/api/price-check` | `/mshipping/billing` | Evaluasi audit harga acuan vs harga faktur riil |

---

## 3. 🔍 Aturan Evaluasi Tarif & Pencegahan False Positive

Engine evaluasi tarif membandingkan harga yang ditagihkan (`fdPrice`) terhadap tarif profil pelanggan atau tarif acuan marketing:

1. **Word Boundary Regex Matching**:
   - DILARANG menggunakan pencocokan naif `.includes('LS')` karena kata `PARCE`**`LS`** akan keliru terdeteksi sebagai kategori Lartas/Alkes (LS).
   - Gunakan regex word-boundary: `/\bLS\b/i.test(comodityName)`.
2. **Penanganan Fallback Tipe Komoditas**:
   - Jika nilai `fdTypeComodity` bernilai `0` atau `null` di database, sistem mengabaikan `0` dan melakukan fallback ke tipe standar `1` (`UMUM`).
3. **Pemeriksaan Masa Berlaku & Expiration Handling (`endDate`)**:
   - Kolom `endDate DATETIME2 NULL` pada `tbCustomerPriceListUpload` dan item menentukan tanggal berakhir tarif pelanggan.
   - Tarif khusus pelanggan dinyatakan aktif apabila `endDate == null || targetDate <= endDate`.
   - Jika `targetDate > endDate`, tarif dianggap **kedaluwarsa (Expired)**:
     - Mesin cek harga (`price-check.service.ts` & `marking-matcher.ts`) mengecualikan harga khusus yang sudah kedaluwarsa.
     - Sistem otomatis melakukan fallback ke Master Price List (CS/MKT).
     - Mengembalikan metadata `customerEndDate`, `isCustomerPriceExpired: true`, dan `isCustomerPriceExpiringSoon: true` (jika sisa masa berlaku $\le 7$ hari terhadap hari ini).

