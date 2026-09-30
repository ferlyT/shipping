# 💰 Modul Penagihan & Faktur (Billing) — Backend

Dokumentasi spesifikasi endpoint, transaksi penerbitan faktur atomik, KPI dinamis, audit validasi tarif & kubikasi, dan template laporan faktur.

---

## 1. 📂 Struktur Modul

- Direktori: `backend/src/modules/billing/`
- Berkas Utama:
  - `billing.routes.ts`: Rute endpoint API & permission guard (`/mshipping/billing`).
  - `billing.service.ts`: Kueri faktur, agregasi KPI dinamis, transaksi issue invoice, dan autocomplete ter-cache.
  - `report-template.service.ts`: Penyimpanan konfigurasi JSON template cetak laporan (`tbReportTemplates`).
  - `pairing-local-charge.service.ts`: Pengolahan file Excel biaya lokal dan pencocokan ke nomor resi.
  - `billing.types.ts`: Antarmuka DTO header faktur, baris biaya, dan metrik analitik.

---

## 2. 🔌 Daftar Endpoint REST API

| Method | Endpoint | Permission | Keterangan |
|---|---|---|---|
| `GET` | `/api/billing` | `/mshipping/billing` | Daftar faktur ber-pagination (filter status draft/terbit, cabang, moda, customer) |
| `GET` | `/api/billing/:invNo` | `/mshipping/billing` | Mengambil detail lengkap faktur (header, item baris, ringkasan nominal) |
| `GET` | `/api/billing/kpis` | `/mshipping/billing` | Metrik KPI live: target bill hari ini (Udara/Laut), total invoice terbit, nominal omset MoM |
| `GET` | `/api/billing/chart/trends` | `/mshipping/billing` | Tren harian (`daily`, param `days=7|14|30`) dan bulanan (`monthly`, 12 bulan) dengan diferensiasi moda kargo: `totalBill`, `totalTagihan`, `billUdara`, `tagihanUdara`, `billLaut`, `tagihanLaut`. Tab bulanan mengagregasi 24 bulan dari `tbBilling` sehingga menyertakan perbandingan Year-over-Year (YoY): `prevTotalBill`, `prevTotalTagihan`, `prevBillUdara`, `prevBillLaut`, `prevTagihanUdara`, `prevTagihanLaut`, serta persentase pertumbuhan `totalBillYoYPct`, `totalTagihanYoYPct`, `billUdaraYoYPct`, `tagihanUdaraYoYPct`, `billLautYoYPct`, `tagihanLautYoYPct`. Menggunakan format kalender lokal (`YYYY-MM-DD`) pada `getLastNDays` (`dateRange.ts`) agar tidak terjadi pergeseran tanggal -1 hari akibat konversi timezone UTC pada waktu Indonesia (WIB/GMT+7), serta format tahun 4 digit (`numeric`, e.g. `Sep 2026` vs `Sep 2025`) pada `getLastNMonths` untuk mencegah miskonsepsi singkatan 2 digit tahun sebagai tanggal hari. |
| `GET` | `/api/billing/daily-employee` | `/mshipping/billing` | Rincian target penagihan per PIC penagihan (Kiki, Yati, Thara, Rico, Ferly) |
| `GET` | `/api/billing/suggestions` | `/mshipping/billing` | Autocomplete saran pencarian (mendukung opsi `draftOnly=true`) |
| `POST` | `/api/billing/:invNo/issue` | `/mshipping/billing` | Menerbitkan invoice draft menjadi resmi/issued secara atomik |
| `GET` | `/api/billing/validation/summary` | `/mshipping/billing` | Audit pra-cetak: selisih M³, evaluasi tarif acuan, dan local charge |
| `GET` | `/api/billing/report-template` | `/mshipping/billing` | Mengambil template layout cetak laporan faktur |
| `POST` | `/api/billing/report-template` | `/mshipping/billing` | Menyimpan kustomisasi template cetak laporan faktur |
| `POST` | `/api/billing/pairing-local-charge` | `/mshipping/billing` | Unggah & proses file Excel pairing biaya lokal agen |
| `GET` | `/api/billing/target-details` | `/mshipping/billing` | Rincian kargo Target Bill (Udara/Laut/Semua) per PIC & kelompok (COD, URGENT, FCL, Aging > 7H). Kargo bertipe FCL otomatis diikutsertakan tanpa melihat status gudang (`BELUM DITERIMA GDG`). |
| `GET` | `/api/billing/customer-harga/:custCode` | `/mshipping/billing` | Mengambil seluruh tarif acuan aktif `tbCustomersHarga` (136 kolom) per cabang & komoditas yang dioverride audit `tbCustomersHargaAudit` beserta metadata rasio overweight, penawaran, asuransi, dan catatan udara/laut |

---

## 3. ⚡ Transaksi Atomik Terbitkan Invoice (`POST /api/billing/:invNo/issue`)

Ketika operator menekan tombol *"Terbitkan Invoice"*, backend mengeksekusi transaksi SQL atomik:
1. **Update `tbBilling`**:
   - `fdGive = 1`
   - `fdGiveDate = GETDATE()`
2. **Update `tbBillingPrev`**:
   - `fdGive = 1`
   - `fdGiveDate = GETDATE()`
3. **Upsert `tbBillingGiveEmp`**:
   - Mencatat ID karyawan penerbit faktur (`fdEmpId`), nomor invoice (`fdInvNo`), dan tanggal terbit.
4. **Catatan Keamanan Trigger**:
   - Untuk invoice biaya manual (`fdTypeBilling = 3`) yang memiliki `fdListCode` kosong/spasi, pastikan trigger SQL Server `upd_bill` dan `tgr_update_tbEntryList` tidak memicu galat error 50000 dengan menambahkan guard baris nol (`IF @@ROWCOUNT = 0 RETURN;`).

---

## 4. 🔍 Autocomplete Ter-Cache (`GET /api/billing/suggestions`)

- Terhubung dengan singleton `SuggestionCache` dengan TTL 30 detik.
- Mendukung filter `draftOnly=true` (digunakan pada tab validasi keuangan mobile):
  - Memfilter invoice draft yang belum tervalidasi: `ISNULL(fdGive, 0) <> 1 AND ISNULL(fdGive2, 0) <> 1 AND fdCekDate IS NULL`.
  - Mengecualikan invoice yang sudah terbayar via `tbBillingTotal`.
  - Mengembalikan `custCode` bersama `value` nama pelanggan untuk mencegah data mismatch.
