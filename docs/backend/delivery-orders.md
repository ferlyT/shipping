# 📦 Modul Surat Jalan (Delivery Orders) — Backend

Dokumentasi spesifikasi endpoint, transaksi pembuatan surat jalan, auto-counter FoxPro, instruksi khusus CS (`qr_OrderDelivey`), dan integrasi cetak.

---

## 1. 📂 Struktur Modul

- Direktori: `backend/src/modules/delivery-orders/`
- Berkas Utama:
  - `deliveryOrders.routes.ts`: Rute endpoint API & permission guard (`/mshipping/delivery-orders`).
  - `deliveryOrders.service.ts`: Query Prisma SQL Server, transaksi pembuatan SJ, lookup alamat tujuan, dan pencatatan cetak.
  - `deliveryOrders.schema.ts`: Skema validasi Zod untuk pembuatan & update surat jalan.
  - `deliveryOrders.types.ts`: DTO header, detail item muatan, dan instruksi order delivery.

---

## 2. 🔌 Daftar Endpoint REST API

| Method | Endpoint | Permission | Keterangan |
|---|---|---|---|
| `GET` | `/api/delivery-orders` | `/mshipping/delivery-orders` | Daftar surat jalan flat dengan pagination & filter status sent (`0`/`1`), cabang, moda |
| `GET` | `/api/delivery-orders/monitoring` | `/mshipping/delivery-orders` | Data monitoring SJ pending (`fdSent = 0`), aging days, status overdue, & ringkasan KPI |
| `POST` | `/api/delivery-orders/confirm-delivery` | `/mshipping/delivery-orders` | Konfirmasi pengiriman SJ satuan atau batch (`fdSent = 1`) & eksekusi `sp_tbExpIndo` |
| `GET` | `/api/delivery-orders/confirm-batch-detail` | `/mshipping/delivery-orders` | Rincian lengkap seluruh Surat Jalan per batch FoxPro grouped by Moda & Cabang |
| `GET` | `/api/delivery-orders/confirm-trends` | `/mshipping/delivery-orders` | Agregasi tren konfirmasi per batch `tbDeliveryConfirm` & evaluasi toleransi H+1 |
| `GET` | `/api/delivery-orders/estimasi-details` | `/mshipping/delivery-orders` | Rincian daftar Surat Jalan per tanggal target estimasi kirim & status overdue H+1 |
| `GET` | `/api/delivery-orders/vehicles` | `/mshipping/delivery-orders` | Master armada kendaraan aktif dari `tbKendaraan` |
| `GET` | `/api/delivery-orders/expeditions` | `/mshipping/delivery-orders` | Master ekspedisi lokal/sub-carrier dari `tbExpedisi` |
| `GET` | `/api/delivery-orders/grouped` | `/mshipping/delivery-orders` | Daftar kargo gudang yang di-group per `fdListCode` (untuk inventori & buat SJ) |
| `GET` | `/api/delivery-orders/:id` | `/mshipping/delivery-orders` | Mengambil detail lengkap surat jalan (header & detail item) |
| `POST` | `/api/delivery-orders` | `/mshipping/delivery-orders` | Membuat surat jalan baru dengan auto-counter atomik |
| `PUT` | `/api/delivery-orders/:id` | `/mshipping/delivery-orders` | Memperbarui data surat jalan (tujuan, supir, nopol, catatan) |
| `POST` | `/api/delivery-orders/:id/print` | `/mshipping/delivery-orders` | Mencatat timestamp & user pencetak surat jalan |
| `GET` | `/api/delivery-orders/suggestions` | `/mshipping/delivery-orders` | Autocomplete no SJ, marking, customer, dan resi |
| `GET` | `/api/delivery-orders/order-delivery/:listCode` | `/mshipping/delivery-orders` | Mengambil instruksi khusus CS dari view `qr_OrderDelivey` |
| `GET` | `/api/delivery-orders/destinations/:custCode` | `/mshipping/delivery-orders` | Mengambil daftar alamat tujuan pengiriman dari `tbCustomerPengiriman` |

---

## 3. 🔢 Logika Auto-Numbering Surat Jalan (FoxPro Counter)

Penomoran nomor surat jalan (`fdSJNo`) mengadopsi standar legacy FoxPro:
- Format: **`[KodeCabang]-[Pad6Digits]`** (contoh: `GZ-001245`, `SG-000892`).
- Sumber Counter: Tabel `tbMasterCounter` dengan filter `fdCode = 'A'`.
- Kolom: `fdSJCounter`.
- Transaksi Atomik:
  ```sql
  UPDATE tbMasterCounter 
  SET fdSJCounter = fdSJCounter + 1 
  OUTPUT inserted.fdSJCounter 
  WHERE fdCode = 'A';
  ```

---

## 4. 📋 Integrasi Instruksi Pengiriman CS (`qr_OrderDelivey`)

View `qr_OrderDelivey` menyimpan permintaan operasional khusus dari Customer Service:
- Kolom: `fdTglKirim`, `fdNamaPemberiOrder`, `fdKeterangan`, `fdJenisPembayaran` (`COD`, `TRANSFER`, `DITUNDA`), `fdTglTransfer`, `fdAlamatKirim`, `fdEksBayar`.
- Logika Backend: Mengembalikan `null` jika kargo tidak memiliki instruksi khusus. Jika ada, data dikembalikan ke client untuk auto-open alert card pada modal pembuatan Surat Jalan.

---

## 5. 🏠 Alamat Pengiriman Pelanggan (`tbCustomerPengiriman`)

- Endpoint `/destinations/:custCode` menampilkan seluruh alamat pengiriman yang terdaftar untuk pelanggan tanpa filter hardcode aktif.
- Hasil kueri diurutkan secara khusus: `ORDER BY ISNULL(fdAktif, 0) DESC, fdID ASC` sehingga alamat utama/default (`fdAktif = 1`) berada di urutan paling atas untuk otomatis terpilih pada form modal.

---

## 6. 🚚 Monitoring & Konfirmasi Pengiriman (`confirmDelivery` & FoxPro `frm_delivery_view_edit_2023.scx`)

- **Monitoring Surat Jalan Belum Terkirim (`getDeliveryMonitoring`)**:
  - Filter: `(d.fdSent = 0 OR d.fdSent IS NULL)`.
  - Mengagregasikan 11 metrik KPI (Total Pending, Overdue, Hari Ini, Aging 1-2, 3-5, 6-7, >7, Udara, Laut, Total Pack, Total Berat).
  - Menghitung `agingDays = DATEDIFF(day, d.fdSJDate, GETDATE())` dan `isOverdue = d.fdEstimasi < CAST(GETDATE() AS DATE)`.
  - Single Source of Truth nama customer: `tbCustomers.fdCustName` dengan fallback `d.fdCustNameSJ`.
- **Konfirmasi Pengiriman Massal & Satuan (`confirmDelivery`)**:
  - Memperbarui `tbDelivery` setting `fdSent = 1, fdSndDate, fdCarID, fdSupir, fdTelpSupir, fdUpdate, fdLoad = GETDATE()`.
  - Loop per baris menjamin trigger `tgr_update_tbDelivery` tereksekusi akurat untuk setiap baris dan memperbarui `tbEntryList.fdSjValid = 1`.
  - Jika kargo menggunakan ekspedisi luar kota/sub-carrier, backend mengeksekusi stored procedure legacy FoxPro:
    `EXEC sp_tbExpIndo @fdListCode, @fdExpID, @fdResiExp, @fdCurrExp, @fdTotalExp, @fdEmp, @fdPaid`.

---

## 7. 📊 Tren Konfirmasi Pengiriman FoxPro & Estimasi Kirim (`getDeliveryConfirmTrends`)

- **Tabel Sumber**: `tbDeliveryConfirm` (`fdTglPrintReport`, `fdListType`, `fdCounter`) dan `tbDelivery` (`fdEstimasi`, `fdSent`, `fdKembali`).
- **Mekanisme Agregasi Terpadu**:
  1. **Komparasi Harian (Estimasi vs Realisasi)**:
     - `DailyRealization`: Menghitung SJ terkonfirmasi `fdSent = 1` dalam rentang batch `tbDeliveryConfirm` per tanggal (`realSjUdara`, `realSjLaut`, `totalRealSj`, `totalRealPack`, `totalRealWeight`).
     - `DailyEstimation`: Menghitung target SJ yang dijadwalkan kirim pada tanggal tersebut (`CAST(fdEstimasi AS DATE)`), di-breakdown per moda (`estSjUdara`, `estSjLaut`, `totalEstSj`, `totalEstPack`, `totalEstWeight`).
     - `FULL OUTER JOIN` menggabungkan realisasi dan estimasi per tanggal kalender untuk menghitung rasio ketercapaian `achievementPct = (totalRealSj / totalEstSj) * 100` dan selisih `diffSj = totalRealSj - totalEstSj`.
  2. **Jendela Waktu Batch (Windowing CTE FoxPro)**:
     - FoxPro legacy mencetak laporan konfirmasi 1–2 kali per hari (`sp_delivery_confirm`), yang meng-insert timestamp ke `tbDeliveryConfirm`.
     - Backend menghitung jendela waktu batch dengan `LAG(fdTglPrintReport) OVER (PARTITION BY fdListType ORDER BY fdTglPrintReport ASC) AS prevTglPrintReport`.
     - Surat jalan `tbDelivery` yang dihitung:
       `d.fdSent = 1 AND d.fdKembali > ISNULL(c.prevTglPrintReport, DATEADD(hour, -24, c.fdTglPrintReport)) AND d.fdKembali <= c.fdTglPrintReport`.
     - Dikelompokkan per tanggal dan sesi (`CASE WHEN DATEPART(hour, fdTglPrintReport) < 12 THEN 'Pagi' ELSE 'Sore' END`).
  3. **Ringkasan Global (Summary)**:
     - Realisasi: `totalBatches`, `totalSjSent`, `totalSjUdara`, `totalSjLaut`, `totalColySent`, `totalWeightSent`, `avgSjPerBatch`.
     - Target Estimasi: `totalSjEstimated`, `totalEstUdara`, `totalEstLaut`, `totalEstColy`, `totalEstWeight`.
     - Ketercapaian Global: `overallAchievementPct`, `diffTotalSj`.

---

## 8. 📑 Stored Procedure Rincian Batch Konfirmasi (`rpt_tbDelivery2023`)

- **Stored Procedure Legacy FoxPro**: `rpt_tbDelivery2023 @ListType int, @fdDate1 varchar(20), @fdDate2 varchar(20)`
  - Parameter:
    - `@ListType`: `1` (Udara) atau `2` (Laut).
    - `@fdDate1`: Waktu batas awal (timestamp cetak batch sebelumnya, format `YYYY-MM-DD HH:mm:ss`).
    - `@fdDate2`: Waktu batas akhir (timestamp cetak batch saat ini, format `YYYY-MM-DD HH:mm:ss`).
  - Menghasilkan daftar Surat Jalan terkonfirmasi (`d.fdKembali BETWEEN @date1 AND @date2`) lengkap dengan join `tbCustomers` (SSOT nama pelanggan), `tbEntryList` (marking & kubikasi), dan `tbCabang` (nama cabang pengirim).
- **Enrichment Informasi Armada**:
  - Backend memperkaya data keluaran SP dengan query sekunder ke `tbDelivery` untuk mengambil `fdSupir`, `fdTelpSupir`, `fdSatuan`, dan `fdEstimasi`.
- **Penggunaan di Frontend**:
  - Melayani endpoint `GET /api/delivery-orders/confirm-batch-detail?date=YYYY-MM-DD&session=Pagi|Sore` untuk modal `DeliveryBatchDetailModal.tsx` saat user mengklik cardlet sesi batch atau tombol batch pada tabel Log Harian Monitoring Delivery Orders.

---

## 9. ⏱️ Aturan Bisnis Toleransi Pengiriman H+1 & Evaluasi Pending Overdue

- **Aturan Operasional**:
  - Tanggal target pengiriman tercatat pada `tbDelivery.fdEstimasi`.
  - Toleransi pengiriman: `fdSent = fdEstimasi + 1` hari adalah batas maksimal toleransi pengiriman normal.
  - Jika tanggal hari ini (`GETDATE()`) sudah melewati `fdEstimasi + 1` hari dan surat jalan belum terkirim (`fdSent = 0` atau `NULL`), surat jalan diklasifikasikan sebagai **Pending Overdue**.
  - **Akurasi Realisasi Pengiriman (`fdSent = 1`)**:
    - Pada sistem FoxPro, `fdSndDate` sering kali terisi tanggal pembuatan draft/invoice (identik dengan `fdSJDate`).
    - Untuk akurasi 100% tanggal dan waktu riil pemuatan kargo, apabila `fdSent = 1`, data diambil dari **`tbDelivery.fdLoad`** (fallback `fdSndDate`):
      `COALESCE(d.fdLoad, d.fdSndDate)`.
- **Kueri Evaluasi Toleransi (`deliveryOrders.service.ts`)**:
  ```sql
  -- Evaluasi status overdue per Surat Jalan
  CASE 
    WHEN (d.fdSent = 0 OR d.fdSent IS NULL) 
         AND CAST(GETDATE() AS DATE) > DATEADD(day, 1, CAST(d.fdEstimasi AS DATE))
      THEN 'PENDING_OVERDUE'
    WHEN (d.fdSent = 0 OR d.fdSent IS NULL)
      THEN 'PENDING_TOLERANCE'
    WHEN d.fdSent = 1 AND (COALESCE(d.fdLoad, d.fdSndDate) IS NULL OR CAST(COALESCE(d.fdLoad, d.fdSndDate) AS DATE) <= DATEADD(day, 1, CAST(d.fdEstimasi AS DATE)))
      THEN 'SENT_ONTIME'
    ELSE 'SENT_LATE'
  END AS statusLabel
  ```
- **Endpoint Rincian Target Estimasi (`GET /api/delivery-orders/estimasi-details`)**:
  - Parameter:
    - `date`: Tanggal target estimasi kirim (format `YYYY-MM-DD`).
    - `type`: Filter status (`all`, `overdue`, `pending`, `sent`).
  - Mengembalikan daftar Surat Jalan lengkap dengan join `tbCustomers` (SSOT nama pelanggan), `tbEntryList` (marking, nomor resi `fdTerima`, list code), supir, plat armada, koli, berat, selisih hari keterlambatan (`overdueDays`), dan tanggal batas toleransi (`maxToleranceDate`).
