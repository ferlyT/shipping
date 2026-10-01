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
| `GET` | `/api/billing/kpi` | `/mshipping/billing` | Metrik KPI live & komparasi 3 periode (mendukung filter `year` & `month`): target bill hari ini (Udara/Laut dengan rincian kategori kriteria `categories: { sjSent, codUrgent, agingGt7, fcl }` dan breakdown PIC), total invoice terbit, nominal omset MoM, serta struktur komparasi 3 periode (`currentMonth`, `prevMonth`, `lastYearSameMonth`, `comparisons`: `totalInvoices`, `totalTagihan`, `invoicesUdara`, `tagihanUdara`, `invoicesLaut`, `tagihanLaut`, `avgInvoiceValue`, `uniqueCustomers`) |
| `GET` | `/api/billing/chart/trends` | `/mshipping/billing` | Tren harian (`daily`, param `days=7|14|30`) dan bulanan (`monthly`, 12 bulan) dengan diferensiasi moda kargo: `totalBill`, `totalTagihan`, `billUdara`, `tagihanUdara`, `billLaut`, `tagihanLaut`. Tab bulanan mengagregasi 24 bulan dari `tbBilling` sehingga menyertakan perbandingan Year-over-Year (YoY): `prevTotalBill`, `prevTotalTagihan`, `prevBillUdara`, `prevBillLaut`, `prevTagihanUdara`, `prevTagihanLaut`, serta persentase pertumbuhan `totalBillYoYPct`, `totalTagihanYoYPct`, `billUdaraYoYPct`, `tagihanUdaraYoYPct`, `billLautYoYPct`, `tagihanLautYoYPct`. Menggunakan format kalender lokal (`YYYY-MM-DD`) pada `getLastNDays` (`dateRange.ts`) agar tidak terjadi pergeseran tanggal -1 hari akibat konversi timezone UTC pada waktu Indonesia (WIB/GMT+7), serta format tahun 4 digit (`numeric`, e.g. `Sep 2026` vs `Sep 2025`) pada `getLastNMonths` untuk mencegah miskonsepsi singkatan 2 digit tahun sebagai tanggal hari. |
| `GET` | `/api/billing/daily-employee` | `/mshipping/billing` | Rincian target penagihan per PIC penagihan (Kiki, Yati, Thara, Rico, Ferly) |
| `GET` | `/api/billing/suggestions` | `/mshipping/billing` | Autocomplete saran pencarian (mendukung opsi `draftOnly=true`) |
| `POST` | `/api/billing/:invNo/issue` | `/mshipping/billing` | Menerbitkan invoice draft menjadi resmi/issued secara atomik |
| `GET` | `/api/billing/validation/summary` | `/mshipping/billing` | Audit pra-cetak: selisih M³, evaluasi tarif acuan, dan local charge |
| `GET` | `/api/billing/report-template` | `/mshipping/billing` | Mengambil template layout cetak laporan faktur |
| `POST` | `/api/billing/report-template` | `/mshipping/billing` | Menyimpan kustomisasi template cetak laporan faktur |
| `POST` | `/api/billing/pairing-local-charge` | `/mshipping/billing` | Unggah & proses file Excel pairing biaya lokal agen |
| `GET` | `/api/billing/target-details` | `/mshipping/billing` | Rincian kargo Target Bill (Udara/Laut/Semua) per PIC & kelompok (`all`, `sj_sent`, `partial`, `fcl`, `cod`, `urgent`, `aging`, `no_type`). Kargo bertipe FCL dan kargo dengan Surat Jalan terkirim (`fdSent = 1` atau status `TERKIRIM` / `TERIMA SJ`, ditandai dengan flag `isSjSent`) otomatis diikutsertakan tanpa melihat status gudang (`BELUM DITERIMA GDG`). |
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

---

## 5. 📦 Evaluasi M³ Check & Kelompok Bill Terkait (`m3-check.service.ts`)

- **Kelompok Bill Terkait (Induk & Pecahan 1 Batch)**:
  - Mengidentifikasi relasi invoice keluarga (`parseInvoiceFamily`) untuk mendeteksi pasangan invoice induk (`GZS-011085-09-2026`) dan invoice pecahan (`GZS-A11085`, `GZS-B11085`, dst) dalam batch dan customer yang sama.
  - **Sinkronisasi Data Fisik & Penagihan (`batchEntryLists` + `detailRows` + `relatedBatchBills`)**:
    - Kueri `tbEntryList` (`get_related_batch_entry_lists`) mengambil seluruh entri fisik kargo dalam batch customer tersebut.
    - Dipadukan dengan data SP kubikasi `get_qr_tbm3_perMarking_plus_rasio` untuk packing list dan komplain.
    - Dipetakan secara 1-to-1 dengan faktur di `tbBilling` baik yang tercatat pada header `fdListCode` maupun baris detail.
  - **Rincian `listCodeBreakdown` & Metrik Audit**:
    - `listCodeBreakdown`: Array status per listcode dengan rincian `listCode`, `invNo`, `isParent`, `childLetter`, `m3Gudang`, `m3PL`, `berat`, `qty`, `billedM3`, `hasBill`, dan `firstItemName`.
    - `allListCodesHaveBill`: Indikator boolean penentu apakah seluruh kargo fisik pada batch sudah 100% memiliki faktur penagihan.
    - `missingBillsCount`: Jumlah listcode pada batch yang belum diterbitkan fakturnya (missing bill).
    - `sumM3Gudang`, `sumM3PL`, `sumQty`, `sumBerat`, `totalBilledM3`: Akumulasi volume dan berat aktual 1 batch.
## 6. ⚖️ Validasi Type 2 (Compare M³ vs KG) & Pemisahan Item Tambahan (`billing-validation.service.ts`)

- **Ekstraksi Tarif Muatan Pokok (`priceM3` & `priceKG`)**:
  - Item tambahan seperti **Tax Return** (`TAX RETURN`, `TAXRETURN`), biaya administrasi (`ADMIN`), surcharge (`SURCHARGE`), packing, atau diskon otomatis dipisahkan dari ekstraksi tarif muatan pokok (`isAuxiliary`).
  - Mencegah tarif Tax Return (misalnya `Rp 500.000/M³` pada item `TAX RETURN - MINIMUM`) menimpa tarif pokok M³ kargo (misalnya `Rp 6.500.000/M³` pada `PARCELS TO JAKARTA (M3) - ROLLER CHAIN`).
  - Jika detail billing belum memuat item kargo M³ atau KG, sistem fallback otomatis mengambil tarif dari profil master customer `dbo.get_profile_harga_dari_listcode` (`Harga`, `Kg`, `Rasio`).
- **Penerapan Batas Minimum Charge (`minChargeM3`) & Ekuivalen KG**:
  - Rasio konversi ekuivalen berat (`minKgEquiv = minChargeM3 * rasio`) memprioritaskan rasio kontraktual profil customer (`profileHarga.rasio`, misal 700 $\to$ $0.1 \times 700 = 70\text{ KG}$) sebelum fallback ke rasio matematis harga (`priceM3 / priceKG`).
  - Penentuan winner dan perhitungan nilai efektif menggunakan `Math.max(nilaiM3, minChargeM3 * priceM3)` dan `Math.max(nilaiKG, minKgEquiv * priceKG)`.
- **Perhitungan Nilai Tagihan Ideal Komprehensif (`totalNilaiTagihanIdeal`)**:
  - Formula: `totalNilaiTagihanIdeal = totalFreightIdeal (winner M3/KG) + totalBilledAuxiliary (Tax Return + Admin + Surcharge)`.
  - Mencegah peringatan overcharge semu pada faktur yang sah membebankan biaya tambahan seperti Tax Return.

---

## 7. 🎯 Target Bill Details & Customer SSOT (`billing-analytics.service.ts`)

- **Endpoint**: `GET /api/billing/target-details` (Query params: `type`, `pic`, `search`).
- **Single Source of Truth Customer (`tbCustomers.fdCustName`) & Resolusi Per-Item**:
  - Mengambil data dari Stored Procedure `get_data_billing_and_data_m3` dan melakukan override nama customer resmi langsung dari master `tbCustomers.fdCustName` via kode customer `tbCustomers.fdCustCode`.
  - **Granular Per-Colly Mapping (`entryItemMap`)**:
    - Dalam pengiriman konsinyasi/laut, satu batch marking code (misal: `26GZD26`) memuat banyak colly dengan customer yang berbeda (`ASH`, `JMD`, `YTO`, dll).
    - Query `entryListRows` mengambil `RTRIM(el.fdCustCode) AS custCode` dan memetakan kunci unik `${markingCode}|||${markingNo}` ke `{ listCode, custCode }`.
    - Menghilangkan `MAX(el.fdCustCode)` batch grouping yang sebelumnya menyebabkan colly customer lain tertimpa nama customer tertinggi alfabetik (`YTO`).
  - Menghasilkan metadata identitas customer lengkap: `customer` (nama master resmi), `custCode`, `billTo` (`tbCustomers.fdBillTo`), dan `consignee` (`tbMarking.fdConsignee`).
- **Dukungan Pencarian Server-Side (`query.search`)**:
  - Mendukung pencarian multi-token multi-kata untuk menyaring item kargo berdasarkan nama customer, kode customer, billTo, markingCode, markingNo, branch, sales, comodity, type, dan PIC.
