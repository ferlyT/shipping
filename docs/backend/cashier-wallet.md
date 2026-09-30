# 💳 Modul Pelunasan Kasir & Saldo Deposit (Cashier & Wallet) — Backend

Dokumentasi spesifikasi endpoint penerimaan kasir resmi (`RR-`), kasir sementara (`TR-`), alur attach faktur, dan sistem Customer Wallet ledger.

---

## 1. 📂 Struktur Modul

- **Cashier**: `backend/src/modules/cashier/` (`cashier.routes.ts`, `cashier.service.ts`, `cashier.schema.ts`)
- **Wallet**: `backend/src/modules/wallet/` (`wallet.routes.ts`, `wallet.service.ts`)

---

## 2. 🔌 Daftar Endpoint REST API

| Method | Endpoint | Permission | Keterangan |
|---|---|---|---|
| `GET` | `/api/cashier` | `/mshipping/billing` | Daftar transaksi kasir resmi (`RR-`) dan sementara (`TR-`) |
| `GET` | `/api/cashier/:id` | `/mshipping/billing` | Mengambil rincian kasir (header, uang masuk, alokasi faktur) |
| `POST` | `/api/cashier` | `/mshipping/billing` | Membuat kasir resmi baru (`RR-XXXXXX-MM-YYYY`) |
| `POST` | `/api/cashier/temp` | `/mshipping/billing` | Membuat penerimaan pembayaran sementara (`TR-XXXXXX-MM-YYYY`) |
| `POST` | `/api/cashier/attach` | `/mshipping/billing` | Mengonversi kasir sementara ke resmi (proses attach atomik) |
| `GET` | `/api/cashier/unpaid-invoices/:custCode` | `/mshipping/billing` | Mengambil daftar faktur piutang belum lunas per customer |
| `GET` | `/api/wallet/balance/:custCode` | `/mshipping/billing` | Mengambil saldo aktif deposit pelanggan |
| `GET` | `/api/wallet/ledger/:custCode` | `/mshipping/billing` | Mengambil riwayat mutasi buku besar deposit pelanggan |
| `POST` | `/api/wallet/topup` | `/mshipping/billing` | Menambahkan saldo deposit pelanggan |
| `POST` | `/api/wallet/deduct` | `/mshipping/billing` | Memotong saldo deposit pelanggan untuk pelunasan faktur |

---

## 3. 🔢 Auto-Numbering Kasir Resmi & Reset Bulanan

Penomoran kasir resmi menggunakan format standar legacy:
- Format: **`RR-XXXXXX-MM-YYYY`** (contoh: `RR-000001-09-2026`).
- **Aturan Reset Bulanan**:
  - Angka sequence 6-digit **otomatis di-reset kembali ke `000001` setiap pergantian bulan kalender baru**.
  - Menggunakan kueri penguncian atomik (`WITH (UPDLOCK, HOLDLOCK)`) pada `tbMasterCounter` (`fdCode = 'A'`) untuk mencegah nomor ganda/duplikat pada lingkungan konkurensi tinggi.

---

## 4. 🔄 Alur Attach Transaksi Sementara (`TR-` ke `RR-`)

Transaksi kasir sementara (`tb2Cashier`, `tb2CashierRcv`, `tb2CashierDetail`) dijembatani ke kasir resmi melalui endpoint `/attach`:
1. Validasi saldo penerimaan vs nominal alokasi (`fdSelisih = 0`).
2. Generate nomor kasir resmi baru `RR-XXXXXX-MM-YYYY`.
3. Salin data rincian uang masuk dari `tb2CashierRcv` $\to$ `tbCashierRcv`.
4. Salin data alokasi faktur dari `tb2CashierDetail` $\to$ `tbCashierDetail`.
5. Catat nomor referensi kasir sementara pada header resmi (`tbCashier.fdCashierXX = 'TR-...'`).
6. Kunci record kasir sementara (`tb2Cashier.fdPost = 1`) agar tidak dapat di-attach berulang kali.

---

## 5. 💰 Arsitektur Customer Wallet Ledger

- Menggunakan dua tabel inti: `tbCustomerWallet` (header saldo terkini) dan `tbCustomerWalletLedger` (riwayat mutasi kredit/debit immutable).
- Setiap mutasi (topup, pemotongan faktur, overpayment refund) dijalankan dalam transaksi atomik dengan *pessimistic locking* (`UPDLOCK`) untuk menjamin integritas finansial saldo tidak pernah negatif atau salah hitung.
