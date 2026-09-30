# 🚢 Modul Pengiriman Logistik (Shipments) — Backend

Dokumentasi spesifikasi endpoint, logika pencarian manifest kargo, optimasi kueri pada tabel berukuran besar (`tbEntryList`), dan integrasi cache.

---

## 1. 📂 Struktur Modul

- Direktori: `backend/src/modules/shipments/`
- Berkas Utama:
  - `shipments.routes.ts`: Definisi rute HTTP & middleware auth/permission (`/mshipping/shipments`).
  - `shipments.service.ts`: Kueri Prisma, filter dinamis, kalkulasi muatan, dan two-stage search index.
  - `shipments.types.ts`: Interface manifest kargo, filter DTO, dan respons pagination.

---

## 2. 🔌 Daftar Endpoint REST API

| Method | Endpoint | Permission | Keterangan |
|---|---|---|---|
| `GET` | `/api/shipments` | `/mshipping/shipments` | Mengambil daftar kargo ber-pagination dengan filter moda, tanggal, cabang, dan status |
| `GET` | `/api/shipments/:id` | `/mshipping/shipments` | Mengambil detail kargo berdasarkan ID / `fdListCode` |
| `GET` | `/api/shipments/suggestions` | `/mshipping/shipments` | Autocomplete instan pencarian kargo (ter-cache di memori) |
| `GET` | `/api/shipments/branches` | `/mshipping/shipments` | Mengambil daftar cabang aktif beserta ringkasan jumlah kargo |

---

## 3. 🔍 Query Parameter & Filter (`GET /api/shipments`)

| Parameter | Tipe | Default | Keterangan |
|---|---|---|---|
| `page` | `number` | `1` | Halaman data saat ini |
| `limit` | `number` | `20` | Jumlah baris per halaman (10, 20, 50, 100) |
| `search` | `string` | `''` | Kata kunci bebas (Listcode, Marking, Customer, Resi) |
| `searchField`| `string`| `'ALL'` | Target kolom pencarian (`ALL`, `listCode`, `marking`, `customer`, `resi`) |
| `listType` | `string` | `undefined`| Filter moda: `'BY SEA'` (Laut) atau `'BY AIR'` (Udara) |
| `branch` | `string` | `undefined`| Filter kode cabang pengirim (contoh: `'GZ'`, `'SG'`, `'HK'`, `'YW'`) |
| `startDate` | `string` | `undefined`| Batas awal tanggal terima / tanggal agen (`YYYY-MM-DD`) |
| `endDate` | `string` | `undefined`| Batas akhir tanggal terima / tanggal agen (`YYYY-MM-DD`) |
| `sent` | `string` | `undefined`| Filter status pengiriman: `'0'` (Pending/Gudang), `'1'` (Terkirim) |

---

## 4. ⚡ Optimasi Kueri Tabel Raksasa (`tbEntryList` ~726k Baris)

Tabel transaksi kargo `tbEntryList` memiliki lebih dari 726.000 baris. Untuk menjamin latency kueri tetap di bawah 100ms:

1. **Pencarian Marking Code**: Dialihkan langsung ke master `tbMarking` (~14.000 baris) yang memiliki index unik pada `fdMarkingCode`, bukan memindai penuh `tbEntryList`.
2. **Two-Stage Prefix Search**:
   - **Tahap 1 (Index Seek)**: Mencocokkan prefix tepat pada index `tbEntryList.fdTerima` atau `fdListCode`.
   - **Tahap 2 (Fallback Terbatas)**: Jika hasil tahap 1 kurang dari ambang batas, jalankan fallback yang dibatasi kargo tahun 2025 ke atas (`fdTglAgent >= '2025-01-01' OR fdListCode >= '2500000'`).
3. **Filter Pelanggan Aktif**: Kueri customer otomatis menambahkan klausul `ISNULL(fdDiscontinued, 0) <> 1`.
4. **Caching Saran Pencarian**: Endpoint `/api/shipments/suggestions` terhubung ke singleton `SuggestionCache` dengan TTL 30 detik sehingga pencarian berulang selesai dalam < 1ms.
