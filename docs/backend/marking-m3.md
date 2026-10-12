# 📐 Modul Marking & Audit Dimensi Kubikasi (M3 Check) — Backend

Dokumentasi spesifikasi endpoint, pengelolaan dimensi coly, Stored Procedure kalkulasi kubikasi, dan audit perbandingan fisik gudang vs entry list.

---

## 1. 📂 Struktur Modul

- **Marking**: `backend/src/modules/marking/` (`marking.routes.ts`, `marking.service.ts`)
- **M3 Check**: `backend/src/modules/m3-check/` (`m3-check.routes.ts`, `m3-check.service.ts`)

---

## 2. 🔌 Daftar Endpoint REST API

| Method | Endpoint | Permission | Keterangan |
|---|---|---|---|
| `GET` | `/api/marking/suggestions` | `/mshipping/shipments` | Autocomplete saran pencarian kode marking & nama pelanggan |
| `GET` | `/api/marking/:code` | `/mshipping/shipments` | Mengambil info profil marking dan data pelanggan terkait |
| `GET` | `/api/marking/:code/sizes` | `/mshipping/shipments` | Mengambil daftar rincian dimensi coly (`tbMarkingSize`) |
| `POST` | `/api/marking/:code/sizes` | `/mshipping/shipments` | Menyimpan / memperbarui rincian ukuran fisik marking |
| `POST` | `/api/marking/ocr-container` | `/mshipping/shipment-batches` / `/mshipping/shipments` | Deteksi OCR nomor kontainer dari gambar kamera / galeri (Tesseract + Sharp + ISO 6346) |
| `PATCH`/`PUT` | `/api/marking/:id/exit-date` | `/mshipping/shipments` | Update atau hapus Exit Date batch marking (validasi kronologis & future date <= 3 hari) |
| `GET` | `/api/m3-check` | `/mshipping/m3-check` | Mengambil daftar audit kargo per marking beserta rasio & selisih M³ |
| `GET` | `/api/m3-check/marking/:code` | `/mshipping/m3-check` | Mengambil rincian perbandingan M³ fisik vs M³ sistem per marking |

---

## 3. 🧮 Logika Kalkulasi & Formula Dimensi

1. **Kalkulasi Kubikasi Per Baris Ukuran (`tbMarkingSize`)**:
   $$\text{M3} = \frac{\text{Panjang (cm)} \times \text{Lebar (cm)} \times \text{Tinggi (cm)} \times \text{Qty (Coly)}}{1.000.000}$$
2. **Volumetric Weight (VFC Laut / Udara)**:
   - Udara: $(p \times l \times t \times \text{qty}) / 6.000$
   - Laut: $1\,\text{m}^3 \approx 600\,\text{kg}$ atau $1.000\,\text{kg}$ tergantung standar rute.
3. **Deteksi Selisih Kubikasi (M3 Diff)**:
   - Bandingkan total M³ fisik gudang (`fdM3_Gudang` dari `tbMarkingSize`) dengan total M³ di manifest (`tbEntryList.fdM3`).
   - Jika $|\text{M3 Gudang} - \text{M3 Entry}| > 0.005\,\text{m}^3$, tandai sebagai `isM3Diff = true` dan tampilkan alert badge.

---

## 4. 🗄️ Stored Procedure & View Warisan

- **Stored Procedure**: `dbo.get_qr_tbm3_perMarking_plus_rasio`
  - Mengeksekusi kalkulasi agregasi M³ per marking dan rasio berat terhadap volume.
- **Aturan SSOT Nama Customer**:
  - Pada hasil query yang melakukan JOIN ke `tbCustomersHarga`, service backend **WAJIB** melakukan lookup ulang ke master `tbCustomers` dan menimpa properti `fdCustName` agar nama customer selalu resmi dan seragam.

---

## 5. 🔗 Fallback Validasi M³ Berbasis Nomor Invoice Terkait (Induk & Anak / Pecahan)

- **Fungsi**: `parseInvoiceFamily(invNo: string)` & integrasi pada `evaluateM3Check(identifier: string)`.
- **Latar Belakang & Aturan Bisnis**:
  - Pada sistem FoxPro / ERP mshipping, faktur dalam satu batch marking kargo sering kali dipecah menjadi beberapa faktur:
    - **Invoice Induk**: Pola `PREFIX-0XXXXX-MM-YYYY` (contoh: `--S-000679-09-2026`).
    - **Invoice Anak / Pecahan**: Pola `PREFIX-[A-Z]XXXXX-MM-YYYY` (contoh: `--S-A00679-09-2026`, `GZS-C10616-09-2026`).
  - Kubikasi fisik dari listCode-listCode terkait (misal listCode `0943385` [0.0308 m³] dan `0943386` [0.1496 m³]) digabungkan dan ditagihkan secara utuh pada invoice induk (`0.1804 m³`).
  - Invoice anak menagihkan 0 m³ dengan item `GABUNG - [NO_INVOICE_INDUK]`.
- **Struktur Response (`RelatedBillsSummary`)**:
  - `hasRelatedBills`: boolean (true jika terdeteksi relasi keluarga invoice dalam 1 batch).
  - `isParent` / `isChild`: boolean indikator posisi invoice.
  - `parentInvNo`: nomor invoice induk.
  - `relatedInvoices`: daftar invoice terkait berserta `listCode`, `isParent`, dan `billedM3`.
  - `sumM3Gudang`, `sumM3PL`, `sumM3Komplain`, `sumQty`, `sumBerat`: akumulasi fisik kargo dari seluruh listCode yang berelasi dalam kelompok bill ini.
  - `totalBilledM3`, `totalBilledKg`: akumulasi kubikasi dan berat KG yang ditagihkan di kelompok invoice tersebut.
  - **Dukungan Fallback Overweight**: `sumBerat` dan `totalBilledKg` digunakan oleh engine validasi untuk mengaudit overweight keluarga tagihan secara proporsional berdasarkan berat aktual kelompok bill terkait (bukan berat total batch kontainer penuh).
