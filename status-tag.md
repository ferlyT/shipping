# Dokumentasi Status Tag / Badge Halaman Validasi Billing Detail

Dokumen ini merinci seluruh nama **Tag / Badge / Status Pill** yang muncul pada halaman **Validasi Billing Detail** (`ValidationDetailPage.tsx`), kartu mesin validasi (`BillingValidationCard.tsx`), modal kesimpulan inspeksi (`BillingValidationSummaryModal.tsx`), serta aturan dan kondisi logika yang menghasilkannya.

---

## 1. Header Bar Halaman (Status Utama Tagihan)

Berada di bar bagian atas halaman (`ValidationDetailPage.tsx`):

| Nama Tag / Badge | Warna & Tampilan | Sumber / Aturan Logika Penghasil | Keterangan |
| :--- | :--- | :--- | :--- |
| **Bill Reguler** | Slate (Netral) | `billType === 'BILL_REGULAR'` | Tagihan standar operasional dengan kode entry list (`fdListCode`). |
| **Bill Gabungan** | Purple (Ungu) | `billType === 'BILL_GABUNGAN'`<br>• Memiliki `fdListCode` operasional.<br>• `fdMarkingNo` atau `fdMarkingCode` mengandung tanda titik koma `;`. | Konsolidasi multi-marking. Validasi kubikasi menggunakan data agregasi per marking. |
| **Bill Revisi** | Amber (Kuning) | `billType === 'BILL_REVISI'`<br>• Tidak memiliki `fdListCode` operasional.<br>• Karakter ke-5 no. invoice adalah angka `1` (contoh: `GZS-1...`). | Dikecualikan dari validasi operasional kubikasi/timbangan. |
| **Bill Transport** | Blue (Biru) | `billType === 'BILL_TRANSPORT'`<br>• Tidak memiliki `fdListCode` operasional.<br>• Karakter ke-10 no. invoice adalah huruf `A` (contoh: `GZS-00123A...`). | Divalidasi khusus dengan cek duplikasi nominal invoice di customer & marking yang sama serta histori data ekspedisi lokal (`tbExpIndo`). |
| **ISSUED** | Hijau (Emerald) | `Number(data.fdGive) === 1` | Invoice telah diterbitkan/diserahkan ke customer. |
| **DRAFT** | Kuning (Amber) | `Number(data.fdGive) !== 1` | Invoice masih berupa draf, belum diterbitkan. |
| **LUNAS** | Hijau (Emerald) | `data.paymentStatus === 'LUNAS'`<br>(atau `data.isPaid === true`) | Kasir telah mengonfirmasi pembayaran penuh. |
| **SEBAGIAN** | Kuning (Amber) | `data.paymentStatus === 'SEBAGIAN'` | Pembayaran telah diterima sebagian oleh kasir. |
| **BELUM LUNAS** | Abu-abu (Slate) | `data.paymentStatus === 'BELUM LUNAS'` | Belum ada pembayaran masuk dari kasir. |

---

## 2. Tag Sumber Acuan Tarif (Price List Source Badges)

Muncul pada Tab **Validasi Item & Harga** (`BillingValidationCard.tsx` & `BillingValidationSummaryModal.tsx`) untuk menunjukkan tabel referensi master tarif yang digunakan sistem:

| Nama Tag / Badge | Warna & Tampilan | Sumber / Aturan Logika Penghasil | Keterangan |
| :--- | :--- | :--- | :--- |
| **Price List Khusus Customer** *(Khusus Cust)* | Ungu (Purple) | `res.priceValidation.hasCustomerPriceList === true`<br>Dihasilkan jika customer memiliki file tarif khusus yang diunggah ATAU terdaftar tarif individual di database ERP (`tbCustomers` / `vwCustomersHargaUnpivot`). | Prioritas tertinggi sistem saat ini. Mengambil tarif personal customer dari master ERP. |
| **Marking Override: [KODE]** *(Override Marking)* | Teal (Toska) | `res.priceValidation.isMarkingOverride === true`<br>Dihasilkan jika kode marking cocok dengan aturan override marking di master price list. | Acuan tarif berpindah ke sheet override marking khusus. |
| **Sheet MKT (Broker / Sales MKT)** *(Master MKT)* | Amber (Kuning) | `!hasCustomerPriceList && !isMarkingOverride && isMktCustomer(...)`<br>Terpicu jika `fdBroker === 1` ATAU nama sales terdaftar dalam `MKT_SALES_GROUP` (`KB`, `ERIC`, `EDDIE HTM`, `FEBRI A`, `HERY`, `INDAH`, `SUSI`, `TSC`). | Acuan harga menggunakan sheet master **Marketing (MKT)**. |
| **Sheet CS (Non-Broker)** *(Master CS)* | Biru (Blue) | Tidak memenuhi seluruh kondisi di atas (Customer reguler, non-broker, non-MKT sales). | Acuan harga menggunakan sheet master **Customer Service (CS)**. |

---

## 3. Tag Status Tab & Indikator Masalah (Tab Header Badges)

Muncul di tombol tab navigasi kartu validasi:

| Tab | Nama Tag / Badge | Warna & Tampilan | Sumber / Aturan Logika Penghasil |
| :--- | :--- | :--- | :--- |
| **Validasi Item & Harga** | **`[N] Selisih`** | Kuning (Amber) | Ditemukan item tagihan yang harganya di bawah acuan (`LOWER`), atau kuantiti item KG overweight tidak cocok dengan hitungan fisik. |
| | **`Harga M3 Kosong`** | Kuning (Amber) | Jalur laut (BY SEA), tetapi kolom tarif `res.profileHarga.harga` di master `tbCustomers` bernilai `0` / belum diisi oleh CS. |
| | **`Khusus Cust` / `Master MKT` / `Master CS`** | Ungu / Amber / Biru | Jika tidak ada selisih, menampilkan ringkasan acuan master yang aktif. |
| **Validasi M3 / Berat** | **`Cocok`** | Hijau (Emerald) | Kuantiti M3 (Sea) atau Berat KG (Air) pada tagihan sama dengan salah satu dokumen operasional fisik (PL / Gudang / Komplain / Marking). |
| | **`Selisih`** | Merah (Rose) | Angka M3 / KG tagihan tidak cocok dengan data fisik operasional mana pun. |
| **Overweight** *(Khusus BY SEA)* | **`Aman`** | Hijau (Emerald) | Berat fisik muatan masih di bawah kuota rasio (`overweightKg === 0`), dan invoice tidak menagih item KG. |
| | **`Tervalidasi`** | Hijau (Emerald) | Muatan terindikasi overweight (`overweightKg > 0`) dan invoice menagihkan item KG dengan kuantiti yang tepat/sesuai. |
| | **`+[N] KG`** | Merah (Rose Pulse) | Muatan fisik overweight (`overweightKg > 0`), namun invoice belum/tidak menagihkan biaya overweight tersebut. |
| | **`Ditagih [N] KG`** | Kuning (Amber Pulse) | Berat aktual fisik sebenarnya aman/normal (0 kg overweight), tetapi invoice tetap menagihkan item KG. |
| **Freight Charge** | **`[Nominal] [Valas]`** | Kuning (Amber) | Terdapat biaya `fdFC` valas di `tbEntrylist` (contoh: `150 RMB`). |

---

## 4. Status Bar Validasi Kubikasi M3 / Berat Fisik (Tab 1)

Muncul di banner bagian atas Tab Kubikasi M3 / Timbangan Fisik:

| Nama Status / Badge | Varian Badge | Kondisi Logika Penghasil |
| :--- | :--- | :--- |
| **COCOK (GUDANG)** | Hijau (Emerald) | Billed M3 sama persis dengan M3 Surat Jalan / Timbangan Gudang (`m3Gudang`). |
| **COCOK (PACKING LIST)** | Hijau (Emerald) | Billed M3 sama persis dengan M3 Packing List (`m3PackingList`). |
| **COCOK (KOMPLAIN)** | Hijau (Emerald) | Billed M3 sama persis dengan M3 Hasil Komplain (`m3Komplain`). |
| **COCOK (ATURAN MIN. 0,1 m³)** | Hijau (Emerald) | Volume riil fisik di bawah 0.1 m³, dan tagihan dibulatkan ke minimum charge `0.1000 m³`. |
| **COCOK (ATURAN MIN. CHARGE [N] KG)** | Hijau (Emerald) | Jalur udara (Air): berat riil di bawah minimum charge (default 3 kg), dan tagihan mengikuti min. charge. |
| **COCOK (GUDANG / LIST PER MARKING)** | Biru (Info) | Billed M3 cocok dengan total agregasi gabungan per kode marking (`custMarkingValues`). |
| **SELISIH KUBIKASI / SELISIH BERAT** | Merah (Rose) | Nilai M3 / KG yang ditagihkan pada invoice tidak ditemukan sama di dokumen operasional mana pun. |
| **PERINGATAN COD / URGENT** | Kuning (Amber) | Customer berstatus COD/Urgent dan kubikasi yang ditagihkan lebih kecil dari kubikasi rekomendasi gudang. |
| **Beda Qty** *(pada kartu PL/Gudang/Komplain)* | Kuning (Amber) | Jumlah koli/coly pada dokumen tersebut berbeda dengan Qty EntryList operasional (`isQtyDiff`). |

---

## 5. Status Per Baris Item Tagihan (Tabel Item)

Muncul pada kolom status di tabel rincian item invoice:

| Nama Tag / Badge | Warna & Ikon | Sumber / Aturan Logika Penghasil |
| :--- | :--- | :--- |
| **Match** | Hijau (Emerald) `✓` | Harga satuan (`fdItemPrice`) cocok dengan target acuan price list master (`minTargetPrice <= harga <= maxTargetPrice`), atau tarif profil DB. |
| **Undercharge** *(atau panah merah ke bawah)* | Merah / Amber `↓` | Harga satuan invoice **lebih murah / di bawah** batas minimum tarif acuan master price list. |
| **Overcharge** *(atau panah hijau ke atas)* | Hijau / Amber `↑` | Harga satuan invoice **lebih tinggi / di atas** batas tarif acuan master price list. |
| **Tidak Dicek** | Abu-abu (Slate) | Item khusus seperti `Transport Charges` yang nominalnya ditentukan manual dan tidak ada master tarif bakunya. |
| **Selisih Qty (+[N] KG)** | Kuning (Amber) `⚠` | Item penagihan KG overweight: kuantiti yang ditagihkan berbeda dengan kuantiti kelebihan berat hasil hitungan rumus rasio fisik. |
| **Ditagih [N] KG (Aman)** | Kuning (Amber) `⚠` | Item penagihan KG ditagihkan pada invoice, padahal secara perhitungan rasio muatan tidak overweight (0 kg). |
| **Cocok (VFC)** | Hijau (Emerald) | Kuantiti item *Volume Freight Charges* (Air) sama persis dengan hitungan VFC timbangan gudang. |
| **Cocok (fdFC)** | Hijau (Emerald) | Kuantiti item valas *Freight Charge* sama persis dengan total `fdFC` di `tbEntrylist`. |
| **fdFC Kosong (0)** | Merah (Rose) | Invoice menagih item *Freight Charge*, tetapi data `fdFC` di `tbEntrylist` bernilai 0 / tidak ditemukan. |

---

## 6. Status Modal Kesimpulan Inspeksi Ringkas (`BillingValidationSummaryModal.tsx`)

Muncul pada banner kesimpulan utama modal inspeksi:

| Status Utama Banner | Kondisi Logika Penghasil |
| :--- | :--- |
| **SESUAI (VALID)** | • Kubikasi M3 / Timbangan Berat cocok dengan data operasional.<br>• Tidak ada item yang harganya undercharge.<br>• Tidak ada selisih koli/qty.<br>• Overweight tervalidasi atau tidak ada overweight. |
| **PERINGATAN** | • Data fisik cocok, tetapi terdapat tarif item di bawah acuan master (`hasUnderchargePrice`).<br>• Terdapat ukuran komplain disetujui, tetapi tagihan masih memakai ukuran lama.<br>• Tagihan memuat selisih pembulatan wajar overweight (toleransi $\le 1$ kg).<br>• Terdeteksi duplikasi nominal pada tagihan tipe Transport. |
| **SELISIH** | • Angka M3 / Berat KG pada invoice tidak cocok dengan dokumen operasional.<br>• Overweight belum ditagihkan sama sekali padahal muatan melebihi kuota rasio. |
| **DIKECUALIKAN** | Tagihan adalah tipe `BILL_REVISI` sehingga proses validasi operasional dilewati. |
