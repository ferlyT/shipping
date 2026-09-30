# 💵 Cashier & Customer Wallet Context & Implementation Details — mshipping

Dokumen konteks teknis untuk modul Kasir Pelunasan Piutang (`cashier`) dan Saldo Deposit Pelanggan (`wallet`).

---

## 1. Analisis FoxPro Warisan Modul Kasir (`fr3_regpayment.scx` & `frm_regpayment.scx`)
- **Struktur Dua Tingkat (Two-Tier Receipt System)**:
  - **Kasir Resmi (`RR-` Series)**: `RR-XXXXXX-MM-YYYY` dengan sequence auto-number 6-digit yang **reset otomatis kembali ke `000001` setiap awal bulan baru** via `tbMasterCounter` (`fdCode = 'A'`).
  - **Kasir Sementara (`TR-` Series)**: `TR-XXXXXX-MM-YYYY` via `tbMasterCounter` (`fdCode = 'B'`). Trio tabel: `tb2Cashier` (header), `tb2CashierRcv` (uang masuk), dan `tb2CashierDetail` (alokasi faktur).
- **Mekanisme Proses Attach (`frm_inputpay_attach.scx`)**:
  - Menyalin data dari `tb2CashierRcv` ke `tbCashierRcv` dan `tb2CashierDetail` ke `tbCashierDetail`.
  - Mencatat nomor kasir sementara pada header kasir resmi: `tbCashier.fdCashierXX = 'TR-XXXXXX-MM-YYYY'`.
  - Mengunci kasir sementara (`tb2Cashier.fdPost = 1`) agar tidak di-attach berulang kali.
- **Logika Kondisional Tipe Pembayaran (`PaymentReceivedModal`)**:
  - `CASH`: Input bank dan giro di-disable.
  - `TRANSFER`: Bank default BCA, tanggal kasir auto-sync ke tanggal efektif.
  - `GIRO`: Enable input nomor warkat, bank tertarik (`fdBankID2`), bank penampung (`fdBankID1`), jatuh tempo, dan tanggal kliring.
  - `WALLET`: Memotong saldo deposit di muka pelanggan (`[dbo].[tbCustomerWallet]`).

---

## 2. Arsitektur Customer Wallet & Saldo Deposit Pelanggan
- **Tabel Basis Data**:
  - `[dbo].[tbCustomerWallet]`: Saldo aktif per customer (`fdCustCode`, `fdBalance`, `fdStatus`).
  - `[dbo].[tbCustomerWalletLedger]`: Buku besar mutasi ganda yang tidak dapat diubah (`CREDIT` / `DEBIT`, `fdAmount`, `fdBalanceBefore`, `fdBalanceAfter`, `fdRefType`, `fdRefNo`, `fdCreatedBy`).
- **Integrasi Zero-Difference Rp 0 di Meja Kasir**:
  - Jika uang masuk melebihi total alokasi faktur (`totalRcv > totalDetail`), tombol *"Alihkan Surplus ke Deposit"* muncul di meja kasir.
  - Kelebihan bayar langsung dimasukkan ke deposit pelanggan dan baris penyeimbang `DEPOSIT` dicatat di alokasi kasir sehingga selisih kasir tepat Rp 0 (*Zero-Difference*).
  - Pembatalan uang masuk berinstrumen `WALLET` otomatis mengembalikan saldo (*refund*) ke akun deposit pelanggan.
