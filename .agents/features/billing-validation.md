# 💰 Billing & Validation Context & Implementation Details — mshipping

Dokumen konteks teknis untuk modul penagihan faktur dan audit validasi (`src/features/billing/`).

---

## 1. Mekanisme Terbitkan Invoice & Analisis Trigger SQL Server 50000
- **Endpoint**: `POST /api/billing/:invNo/issue` dengan payload `{ fdEmpId }`.
- **Transaksi Database**:
  - `tbBilling`: `fdGive = 1`, `fdGiveDate = GETDATE()` (status beralih dari Draft ke ISSUED).
  - `tbBillingPrev`: `fdGive = 1`, `fdGiveDate = GETDATE()`.
  - `tbBillingGiveEmp`: Upsert `fdEmpId`, `fdInvNo`, `fdGiveDate`.
- **Kasus Error 50000 (`Update ditolak. Marking Code [(null)] tidak ditemukan di tbMarking`)**:
  - Muncul pada invoice manual/biaya tambahan (`fdTypeBilling = 3`) yang memiliki `fdListCode = ' '` (kosong).
  - Saat `tbBilling` di-update, trigger SQL Server `upd_bill` mengeksekusi `UPDATE tbEntryList SET fdBillCreated = 1 WHERE fdListCode = @fdListCode`.
  - Update mengenai 0 baris, namun trigger `tgr_update_tbEntryList` pada `tbEntryList` tetap menyala.
  - Karena kursor `inserted` kosong, `@fdMarkingCode` bernilai `NULL`, memicu error pembatalan transaksi `RAISERROR`.
  - **Solusi Rekomendasi**: Menambahkan guard `IF @@ROWCOUNT = 0 RETURN; IF NOT EXISTS (SELECT 1 FROM inserted) RETURN;` pada trigger `tgr_update_tbEntryList`.

---

## 2. Aturan Audit Validasi Penagihan (M³ vs KG & Evaluasi Tarif)
- **Billed M³ Riil vs Basis Validasi KG (Laut)**:
  - Kotak Billed M³ selalu menampilkan nilai riil yang ditagihkan di invoice (`tbBillingDetail.fdQty`, misal: `0.0257 m³`), bukan dibulatkan ke 0.1 m³.
  - Khusus pengiriman laut (`!isAir`), jika volume muatan di bawah 0.1 m³, basis acuan (`refM3`) dinaikkan menjadi `0.1 m³` untuk perhitungan batas kuota rasio berat (`maxAllowedWeight = 0.1 × rasio`) agar kargo kecil tidak salah divonis overweight.
  - Sisa Kuota Berat: $\text{Batas Kuota} - \text{Berat Aktual}$. Perbedaan timbangan fisik antar dokumen TIDAK memicu warning validasi selama sisa kuota aman ($\ge 0$). Warning HANYA muncul bila **Sisa Kuota Berat < 0**.
- **Peringatan Di Bawah Minimum Charge M³ (Laut)**: Jika `billedM3 < minChargeM3`, sistem menampilkan badge amber `DI BAWAH MIN. CHARGE` dan warning banner.
- **Catatan Kontrak Pelanggan (`tbCustomersHarga`)**: Menampilkan Note Air (`fdNote`) dan Note Sea (`fdNote 1`) bersih dari karakter petik FoxPro `^`.
- **Resolusi Komoditi**: Regex word boundary `/\bLS\b/i` mencegah false positive pada kata `PARCELS`, `TOOLS`. Fallback default ke `defaultTypeId` jika bernilai 0.
- **Item `PARCELS TO JAKARTA (PCS)`**: Tidak diklasifikasikan sebagai M³ kubikasi (`billedM3 = 0`).

---

## 3. Preservasi Teks Pencarian Customer di Toolbar (`BillingToolbar.tsx`)
- Saat pengguna memilih saran customer (misal: "RICO"), kolom input pencarian tetap menampilkan nama `"RICO"` (bukan kode mentah `R000470`).
- Sistem mengunci `selectedCustCode` (`"R000470"`) di backend query (`getBillings`), memuat faktur milik customer tersebut secara 100% presisi.
