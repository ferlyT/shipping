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
| `GET` | `/api/billing/kpi` | `/mshipping/billing` | Metrik KPI live & komparasi 3 periode (mendukung filter `year` & `month`): target bill hari ini (Udara/Laut dengan rincian kategori kriteria `categories: { sjSent, codUrgent, agingGt7, fcl }` dan breakdown PIC), total invoice terbit, nominal omset MoM, struktur komparasi 3 periode (`currentMonth`, `prevMonth`, `lastYearSameMonth`, `comparisons`: `totalInvoices`, `totalTagihan`, `invoicesUdara`, `tagihanUdara`, `invoicesLaut`, `tagihanLaut`, `avgInvoiceValue`, `uniqueCustomers`), serta **komparasi kinerja penagihan per cabang (`comparisons.byBranch`)** yang mengagregasikan cabang (`GZ`, `SG`, `HK`, `YW`, `SH`, `SZ`, `LM`, dll) dengan aturan normalisasi otomatis **kode `--` dan `SG` (termasuk invoice prefix `--S%`, `--A%`, `SGS%`, `SGA%`) disatukan ke cabang Singapore**, lengkap dengan MoM & YoY growth, breakdown moda udara/laut, dan persentase pangsa pasar. |
| `GET` | `/api/billing/chart/trends` | `/mshipping/billing` | Tren harian (`daily`, param `days=7|14|30`) dan bulanan (`monthly`, 12 bulan) dengan diferensiasi moda kargo: `totalBill`, `totalTagihan`, `billUdara`, `tagihanUdara`, `billLaut`, `tagihanLaut`. Tab bulanan mengagregasi 24 bulan dari `tbBilling` sehingga menyertakan perbandingan Year-over-Year (YoY): `prevTotalBill`, `prevTotalTagihan`, `prevBillUdara`, `prevBillLaut`, `prevTagihanUdara`, `prevTagihanLaut`, serta persentase pertumbuhan `totalBillYoYPct`, `totalTagihanYoYPct`, `billUdaraYoYPct`, `tagihanUdaraYoYPct`, `billLautYoYPct`, `tagihanLautYoYPct`. Menggunakan format kalender lokal (`YYYY-MM-DD`) pada `getLastNDays` (`dateRange.ts`) agar tidak terjadi pergeseran tanggal -1 hari akibat konversi timezone UTC pada waktu Indonesia (WIB/GMT+7), serta format tahun 4 digit (`numeric`, e.g. `Sep 2026` vs `Sep 2025`) pada `getLastNMonths` untuk mencegah miskonsepsi singkatan 2 digit tahun sebagai tanggal hari. |
| `GET` | `/api/billing/chart/by-employee-daily` | `/mshipping/billing` | Tren produktivitas pembuatan faktur per PIC/karyawan (param `days=7|14|30|365`). Jika `days >= 360`, data otomatis diagregasikan per bulan (12 bulan terakhir) dengan format key lokal `${y}-${mon}` anti-UTC shift. Mengembalikan Top 5 PIC terbanyak + kategori `__others__` (Lainnya). |
| `GET` | `/api/billing/chart/sj-vs-bill` | `/mshipping/billing` | Tren harian monitoring kargo keluar gudang Surat Jalan vs Faktur terbit vs Belum ditagih backlog (param `days=7|14|30|365`) dengan breakdown per PIC (Yati, Kiki, Thara, Rico, Ferly). |
| `GET` | `/api/billing/chart/sj-vs-bill/details` | `/mshipping/billing` | Rincian kargo unbilled/backlog per PIC atau all |
| `GET` | `/api/billing/daily-employee` | `/mshipping/billing` | Rincian target penagihan per PIC penagihan (Kiki, Yati, Thara, Rico, Ferly) |
| `GET` | `/api/billing/suggestions` | `/mshipping/billing` | Autocomplete saran pencarian (mendukung opsi `draftOnly=true`) |
| `POST` | `/api/billing/:invNo/issue` | `/mshipping/billing` | Menerbitkan invoice draft menjadi resmi/issued secara atomik |
| `GET` | `/api/billing/validation/summary` | `/mshipping/billing` | Audit pra-cetak: selisih M³, evaluasi tarif acuan, dan local charge |
| `GET` | `/api/billing/m3-check/:identifier` | `/mshipping/billing` | Evaluasi validasi kubikasi M³ & berat kargo, Single Source of Truth tipe komoditas `tbEntryList` (`entryListTypeComodity`, `entryListComodityName`, `defaultFdTypeComodity`), resolusi profil harga customer, dan mapping komoditas |
| `GET` | `/api/billing/report-template` | `/mshipping/billing` | Mengambil template layout cetak laporan faktur |
| `POST` | `/api/billing/report-template` | `/mshipping/billing` | Menyimpan kustomisasi template cetak laporan faktur |
| `POST` | `/api/billing/pairing-local-charge` | `/mshipping/billing` | Unggah & proses file Excel pairing biaya lokal agen |
| `GET` | `/api/billing/target-details` | `/mshipping/billing` | Rincian kargo Target Bill (Udara/Laut/Semua) per PIC & kelompok (`all`, `sj_sent`, `partial`, `fcl`, `cod`, `urgent`, `aging`, `no_type`). Kargo bertipe FCL dan kargo dengan Surat Jalan terkirim (`fdSent = 1` atau status `TERKIRIM` / `TERIMA SJ`, ditandai dengan flag `isSjSent`) otomatis diikutsertakan tanpa melihat status gudang (`BELUM DITERIMA GDG`). |
| `GET` | `/api/billing/customer-harga/:custCode` | `/mshipping/billing` | Mengambil seluruh tarif acuan aktif `tbCustomersHarga` (136 kolom) per cabang & komoditas yang dioverride audit `tbCustomersHargaAudit` beserta metadata rasio overweight, penawaran, asuransi, dan catatan udara/laut |
| `GET` | `/api/billing/:invNo/timeline` | `/mshipping/billing` | Timeline siklus kargo per invoice (8 milestone kronologis: Diterima Agen, Loading, ETD, ETA, Masuk Gudang, Surat Jalan, Dikirim, Diserahkan). Untuk Masuk Gudang (`fdTgl_IN`), bila `el.fdTgl_IN` kosong otomatis fallback mengambil tanggal keluar/tiba gudang dari `tbMarking.fdExitDate`, serta menyertakan nama gudang sortir/tujuan (`fdGudang` dari `tbMarking.fdGudang`) |
| `GET` | `/api/billing/:invNo/attachments` | `/mshipping/billing` | Mengambil seluruh lampiran berkas/bukti bayar invoice dari `tbBillingAttachment` |
| `POST` | `/api/billing/:invNo/attachments` | `/mshipping/finance/billing/attachments` | Mengunggah lampiran invoice baru (Gambar JPG/PNG/WebP atau PDF hingga 10MB, Base64 payload, kuota maks 10 berkas) |
| `DELETE` | `/api/billing/:invNo/attachments/:id` | `/mshipping/finance/billing/attachments/delete` | Menghapus lampiran invoice (diproteksi permission granular) dan mengarsipkan berkas fisik ke subfolder `deleted/` |
| `GET` | `/api/billing/reports/omset-volume` | `/mshipping/billing` | Laporan matriks multi-tahun perbandingan omzet dan 4 metrik kargo per customer & sales |
| `GET` | `/api/billing/reports/omset-volume/export-pivot` | `/mshipping/billing` | Ekspor Excel (.xlsx) data multi-tahun dengan 4 sheet terpisah (`Total`, `M3`, `KG Udara`, `CTR`) menggunakan ExcelJS |
| `GET` | `/api/billing/batch-exit-comparison` | `/mshipping/billing` | Agregasi data perbandingan batch marking yang sudah keluar gudang (`fdExitDate IS NOT NULL`) terhadap status penerbitan tagihan kargo (`fdBillCreated = 1` vs `0`), metrik total kargo, total billed, unbilled, breakdown moda Udara & Laut, serta **rincian rasio penagihan per cabang (`byBranch`)** dengan normalisasi otomatis kode cabang Singapore (`--` dan `SG` disatukan ke `SG`), didukung filter periode bulan/tahun dan toggle `allTime` |
| `GET` | `/api/billing/batch-exit-comparison/details` | `/mshipping/billing` | Mengambil rincian kargo dalam satu batch marking (`markingCode`): list code, customer SSOT, coly, satuan, m3, berat, status billed (`fdBillCreated`), dan status Surat Jalan |

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
    - `listCodeBreakdown`: Array status per listcode dengan rincian `listCode`, `invNo`, `isParent`, `childLetter`, `fdMarkingNo`, `m3Gudang`, `m3PL`, `berat`, `qty`, `billedM3`, `hasBill`, dan `firstItemName`.
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

---

## 8. ⚡ Optimasi Performa Pencarian Faktur (`GET /api/billing?search=...`)

- **Akar Masalah Sebelumnya**:
  - Prisma query sebelumnya mengumpulkan hingga 500 `custCodes` dan 500 `markingCodes` lalu membangun filter `OR` raksasa dengan 1.000+ parameter SQL dan ekspresi `LIKE '%...%'` pada kolom teks tanpa indeks (`fdDescr`, `fdEmpCode`, `fdListCode`, dsb.) pada tabel `tbBilling` (735.000+ baris).
  - SQL Server mengalami *parameter sniffing* dan melakukan *clustered index scan* penuh berulang untuk kueri data dan `count`, memakan waktu **12–18 detik** per request.
- **Penyelesaian Teknis (CTE Candidate Fast Path)**:
  - Mengimplementasikan kueri CTE (`CandidateInvoices`) berindeks dengan petunjuk `WITH (NOLOCK)`:
    - Cabang 1: Pencarian nomor faktur `fdInvNo` (`PK_tbBilling`).
    - Cabang 2: Pencarian kode marking `fdMarkingCode` (`IX_tbBilling`).
    - Cabang 3: Pencarian nomor marking `fdMarkingNo`.
    - Cabang 4: `INNER JOIN tbCustomers c ON b.fdCustCode = c.fdCustCode` (`PK_tbCustomer`) untuk pencarian nama customer, kode customer, dan billTo.
  - Hasil kandidat dipaginasi terlebih dahulu (`OFFSET ${skip} ROWS FETCH NEXT ${take} ROWS ONLY`), baru kemudian di-join kembali ke `tbBilling` dan `tbCustomers` untuk mengambil atribut kolom lengkap.
  - Kueri total data (`COUNT_BIG(1)`) dieksekusi secara paralel.
  - Dilengkapi in-memory TTL cache (`billingSearchCache`, TTL 25 detik) sehingga request berulang dari pagination atau backspace selesai dalam **<0.1 ms**.
- **Hasil Benchmark**:
  - Waktu eksekusi pencarian terpangkas dari **15–18 detik** menjadi **0.8–1.1 detik** (uncached) dan **0.03 milidetik** (cached), peningkatan kecepatan hingga **15x–500x**.

---

## 9. 📦 Rekonsiliasi Kelompok Bill Terkait & Pemetaan Tipe Komoditi

- **Endpoint**: `GET /api/billing/m3-check/:listCode` & `evaluateM3Check` (`m3-check.service.ts`).
- **Kelompok Bill Terkait (`relatedBillsSummary`)**:
  - Mengagregasikan seluruh faktur induk & pecahan dalam 1 batch kontainer (`cleanBatchCode`).
  - Menghimpun seluruh `fdListCode` fisik dari `tbEntryList` dan memetakan status penerbitan tagihannya (`hasBill: true/false`).
  - **Pemetaan Tipe Komoditi**: Membaca `fdTypeComodity` dari `tbEntryList` dan mencocokkan namanya ke `tbTypeComodity` (`typeComodityName`), menyediakan data pendukung grouping per tipe komoditas pada modal validasi fisik & audit ukuran kargo.

---

## 10. 📊 Report Rekap Volume & Berat Kargo Customer & Sales (`GET /api/billing/reports/cargo-volume`)

- **Service**: [`cargo-volume-report.service.ts`](../../backend/src/modules/billing/cargo-volume-report.service.ts).
- **Endpoint**: `GET /api/billing/reports/cargo-volume`.
- **Query Parameters**:
  - `branch`: Kode cabang (`SG`, `GZ`, dll). Cabang `--` dan `-` dinormalisasi otomatis ke `SG` (SINGAPORE).
  - `yearFrom` & `yearTo`: Rentang tahun muat (`tbMarking.fdLoadDate` / `tbEntryList.fdListDate`).
  - `mode`: `1` (Udara), `2` (Laut).
  - `typeComodity`: ID tipe komoditi (`tbTypeComodity.fdTypeComodity`).
  - `sales`: Nama sales marketing (`tbCustomers.fdSalesNM`).
  - `search`: Pencarian multi-kolom (`fdCustCode`, `fdCustName`, `fdSalesNM`, `fdListCode`, `fdTerima`, `fdMarkingCode`).
- **Hierarki Kalkulasi Volume M³ (Laut)**:
  1. `tbBillingDetail` (`bd.fdListCode = 'M3'` / `BILLING`).
  2. Fallback gudang `tbEntryListDetail.fdm3` (`GUDANG`).
  3. Fallback packing list `tbEntryListDetail_packinglist.fdM3` (`PACKING_LIST`).
  4. Fallback master `tbEntryList.fdM3` (`ENTRY_LIST`).
- **Diferensiasi Resi vs ListCode**:
  - **No. Resi**: Diambil dari `tbEntryList.fdTerima` (tanda terima / nomor resi fisik kargo).
  - **No. Listcode**: Diambil dari `tbEntryList.fdListCode` (kode unik list kargo internal).
- **Performa Kueri**: Menggunakan temporary table `#CandidateResi` dengan indeks pada `fdListCode` dan `fdInvNo` serta hint `WITH (NOLOCK)` sehingga agregasi ~20.000+ resi selesai dalam ~2 detik.
 
---
 
## 11. 📈 Report Omset & Volume Customer & Ekspor Excel Pivot 4-Sheet (`GET /api/billing/reports/omset-volume/export-pivot`)
 
- **Service**: [`billing-omset-report.service.ts`](../../backend/src/modules/billing/billing-omset-report.service.ts).
- **Endpoints**:
  - `GET /api/billing/reports/omset-volume`: Agregasi multi-tahun (filter `yearFrom`, `yearTo`, `search`, `sales`).
  - `GET /api/billing/reports/omset-volume/export-pivot`: Ekspor penuh dari `yearFrom = 2018` s/d tahun terbaru ke file Excel (.xlsx).
- **Struktur File Excel Ekspor (ExcelJS)**:
  - 4 Sheet terpisah:
    1. `Total`: Metrik `fdJumlah` (Total omset/pendapatan tagihan).
    2. `M3`: Metrik `m3` (Volume kubikasi kargo laut).
    3. `KG Udara`: Metrik `KG_UDARA` (Berat kargo udara).
    4. `CTR`: Metrik `TotalFcl` (Jumlah kontainer FCL).
  - Kolom tahun bersih tanpa prefix (`2018`, `2019`, dst.) terurut ascending.
  - Header styling: Solid navy (`#1F4E78`), font Arial tebal putih (`#FFFFFF`), alignment center.
  - Lebar kolom: `fdCustName` (28), `fdSalesNM` (28), kolom tahun (14 dengan number format `#,##0`).
  - Freeze Panes pada sel `C2` (mengunci kolom customer & sales serta baris header).
  - Sanitasi karakter kontrol non-XML/Excel ilegal (`[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x84\x86-\x9f]`).
  - Single Source of Truth nama customer: `tbCustomers.fdCustName` (fallback `qr_data_master_billing.fdCustName`).

---

## 12. 🔐 Pemisahan Granular Role Permissions Billing Dashboard (`tbRolePermissions`)

- **Dua Path Terpisah**:
  1. `/mshipping/finance/billing/operational`: Izin khusus melihat dashboard penagihan operasional (Target Bill, Volume Faktur, Perbandingan Batch Marking Exit vs Bill Dibuat, Produktivitas PIC).
  2. `/mshipping/finance/billing/finance`: Izin khusus melihat dashboard penagihan finansial (Omzet Rp, Tren Bulanan, Tren Harian, Matriks Komparasi 3 Periode Finansial).
- **Backend Migration & Seeding**:
  - Script migrasi `backfill-billing-dashboard-permissions.ts` mendaftarkan kedua path secara idempotent ke `tbRolePermissions` untuk seluruh role.
  - Role `admin`, `superadmin`, `viewer` memiliki kedua akses (`operational = 1`, `finance = 1`).
  - Role `billing` memiliki akses `operational = 1` dan `finance = 0` (fokus murni target fisik tanpa eksposur omzet).
  - Role `finance` memiliki akses `finance = 1`.
  - Default `viewerPaths` pada `roles.service.ts` telah disinkronkan dengan kedua path ini.
- **Backend Access Validation**:
  - `authMiddleware` dan `requirePermission('/mshipping/billing')` mengenali kedua path ini sebagai turunan sah modul billing melalui normalisasi prefix.



