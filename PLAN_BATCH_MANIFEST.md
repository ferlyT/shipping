# Rencana Implementasi: Batch Marking Manifest

Fitur ini bertujuan untuk menampilkan rincian barang / daftar resi (manifest) yang tergabung di dalam suatu *Marking Code* (Batch). Karena skema tabel *database* baru akan diberikan nanti, rencana ini difokuskan pada kerangka kerja (_framework_) integrasinya.

## Open Questions

> [!WARNING]
> **Mohon konfirmasi atau berikan informasi berikut bersama dengan skema tabelnya:**
> 1. Apakah *Manifest* ini akan ditampilkan sebagai halaman baru (misalnya `/shipping/shipment-batches/:markingCode/manifest`), atau ditampilkan di dalam *modal* (kotak pop-up) Detail Batch yang sudah ada saat ini?
> 2. Apa *primary key* atau kolom penghubung (_foreign key_) antara tabel `tbMarking` saat ini dengan tabel manifest yang baru? (Apakah menggunakan `fdMarkingCode`?)

## Proposed Changes

### 1. Database & Schema
- **Create View `vwShipment`:** Saya akan membuat skrip `create-view-shipment.ts` untuk mengeksekusi *raw SQL* pembuatan `vwShipment` di database menggunakan Prisma `$executeRawUnsafe`.
- **Update Schema Prisma:** Menambahkan `model VwShipment` yang di-*map* ke `vwShipment`. Model ini akan menggunakan `fdListCode` sebagai *pseudo-primary key* agar Prisma dapat membacanya, dan memiliki relasi/kolom `fdMarkingCode`.

### 2. Backend API
- **Update Service:** Menambahkan fungsi `getManifestByMarkingCode` di `marking.service.ts` yang akan melakukan `prisma.vwShipment.findMany({ where: { fdMarkingCode: code } })`.
- **Update Controller & Route:** Menambahkan rute `GET /api/markings/:markingCode/manifest` di `marking.controller.ts` dan `marking.routes.ts`.

### 3. Frontend Store & API Client
- **Update API Endpoint:** Menambahkan pemanggilan `getManifest` di `frontend/src/api/endpoints/marking.ts`.
- **Create Hook:** Memanfaatkan React Query `useQuery` di halaman frontend untuk mengambil data manifest.

### 4. Frontend UI (Antarmuka)
- **Implementasi Tab pada Modal Detail Batch:** 
  Mengingat desain *modal* detail pada `ShipmentBatchesPage.tsx` sudah sangat baik, saya akan menyisipkan bagian tabel `Manifest` di bawah informasi *Timeline* dan *Performance KPI*.
  Tabel ini akan menampilkan kolom-kolom krusial dari `vwShipment`:
  - `fdListCode` (ID)
  - `fdCustName` (Customer)
   - `fdTerima` (No. Resi)
  -  `fdTglAgent` (Tgl Agent)
  - `fdJmlPack` (Packages) & `fdSatuan` (Unit)
  - `fdJmlBerat` (Weight KG) & `fdM3` (Volume M3)
  -  `fdComodity` (Deskripsi Barang)
  -  `fdDesc`  (keterangan)

## Verification Plan
1. Menjalankan skrip pembuatan view `create-view-shipment.ts`.
2. Generate ulang Prisma Client (dengan _stop-and-start_ server backend untuk menghindari konflik).
3. Uji endpoint `/api/markings/:markingCode/manifest` melalui cURL atau Browser.
4. Buka halaman Shipment Batches, klik `View` pada salah satu baris.
5. Verifikasi bahwa tabel Manifest muncul di dalam *modal* dengan data yang tepat.
