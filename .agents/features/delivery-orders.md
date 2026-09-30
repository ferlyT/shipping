# 🚚 Delivery Orders Context & Implementation Details — mshipping

Dokumen konteks teknis untuk modul Surat Jalan (`src/features/delivery-orders/`).

---

## 1. Format Cetak Continuous Form 23 × 16.5 cm Landscape
- **Media Cetak**: Kertas continuous form ukuran **lebar 23 cm × tinggi 16.5 cm dicetak landscape** (`@page { size: 230mm 165mm landscape; margin: 0; }`).
- **Rute Mandiri**: `ROUTES.DELIVERY_PRINT(':id')` (`/logistics/delivery-orders/:id/print`) di luar `AppLayout` tanpa gangguan sidebar/navbar.
- **3 Pilihan Dokumen**:
  1. *SJ + Lampiran Ukuran (Keduanya)*: 2 lembar sekaligus dengan pemisah `pageBreakAfter: 'always'`.
  2. *Surat Jalan Resmi (`rpf_delivery_2022.frx`)*: Format legal 1 lembar (Header PT. SAMUDERA ENERGI JAYA, No. SJ, No. Mobil, No. Resi, Marking, Penerima, Alamat, Tabel Muatan, ketentuan keluhan, packing original, dan 3 kolom tanda terima).
  3. *Lampiran Ukuran Marking (`rpt_deliverysize_bill_2023.FRX`)*: Tabel rincian dimensi koli 1 lembar (No, Panjang, Lebar, Tinggi, Jumlah, Total M³/VFC, Keterangan), Grand Total, tanda tangan Petugas Ukur & Gudang.
- **4 Opsi FoxPro**: `cetakUkuran`, `cetakKeterangan`, `cetakSupir`, `cetakSJKosong`.
- **Pencatatan Konfirmasi Cetak**: `POST /api/delivery-orders/:id/print`.

---

## 2. Inventori Stok Gudang & Pembuatan SJ Baru (`InventoryPage.tsx`)
- **Fokus Murni Kargo On-Hand**: Hanya memuat kargo masuk gudang yang belum terkirim (`sent = '0'`).
- **Satuan Otomatis dari `tbEntryList.fdSatuan`**: Dropdown satuan otomatis mengambil nilai satuan dari `tbEntryList.fdSatuan` kargo terkait (bukan di-hardcode `COLY`). Opsi satuan di luar master standar disuntikkan secara dinamis dengan label `(dari tbEntryList)`.
- **Card Permintaan Pengiriman CS (`qr_OrderDelivey`)**: Muncul otomatis di posisi teratas formulir jika kargo memiliki instruksi khusus dari CS.
- **Master Alamat Tujuan (`tbCustomerPengiriman`)**:
  - Dropdown menampilkan semua alamat customer (`fdCustCode`).
  - Baris dengan `fdAktif = 1` otomatis menjadi default terpilih (`★ [DEFAULT]`).
  - Tombol `+ Tambah Alamat` untuk registrasi alamat baru langsung ke `tbCustomerPengiriman` dengan auto-increment 2-digit `fdID`.
- **Auto-Counter Nomor SJ**: Mengambil nomor berikutnya secara atomik dari `tbMasterCounter` (`fdCode = 'A'`, format `[Branch]-[Pad6Digits]`).

---

## 3. Revamp Tampilan List Surat Jalan (`ListPage.tsx`)
- **2 Tab Status Utama**: **Pending** (`sent = '0'`) dan **Delivered** (`sent = '1'`) dengan live counter badge.
- **Group Pills Cabang**: Baris scrollable memuat pill *"Semua Cabang"* dan pill cabang spesifik (`GZ`, `SG`, `HK`, dll.) dengan live counter kargo per cabang.
- **Data Manifest Akurat**: Query JOIN langsung ke `tbEntryList` + `tbCabang` (bukan `tbBranch`).
- **Prioritas Nama Penerima**: Mengutamakan nama penerima fisik di Surat Jalan (`delivery.fdCustNameSJ`).
