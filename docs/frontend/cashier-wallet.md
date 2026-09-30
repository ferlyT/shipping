# 💵 Modul Kasir Pelunasan Piutang & Customer Wallet (`src/features/`)

Dokumen ini menjelaskan dua modul keuangan terintegrasi: **Kasir Pelunasan Piutang** (`cashier`) dan **Saldo Deposit Pelanggan** (`wallet`).

---

## 1. Modul Kasir & Pelunasan Piutang (`src/features/cashier/`)
Mengadopsi sistem pencatatan pembayaran piutang dan alokasi faktur (Cashier Register) FoxPro dengan sistem dua tingkat (**Two-Tier Receipt System**):
1. **Kasir Resmi (`RR-` Series)**:
   - Format: `RR-XXXXXX-MM-YYYY` (reset otomatis kembali ke `000001` setiap awal bulan baru dengan atomic DB lock).
   - Digunakan oleh Finance & Accounting untuk pelunasan piutang resmi dan posting akuntansi.
2. **Kasir Sementara (`TR-` Series)**:
   - Format: `TR-XXXXXX-MM-YYYY` (reset bulanan, buffer penerimaan uang di front office/lapangan).
   - Fitur **Attach**: Mengonversi kasir sementara menjadi kasir resmi secara atomik tanpa re-input manual.

### A. Fitur Meja Kerja Kasir (`DetailPage.tsx`)
- **Indikator Keseimbangan Finansial (`BalanceIndicatorBar.tsx`)**:
  - Memantau total uang masuk (Grid 1) vs total alokasi faktur (Grid 2).
  - Menegakkan aturan **Zero-Difference Balancing** (Selisih = Rp 0).
- **Grid 1: Penerimaan Uang (Kas / Bank / Giro / Wallet)**:
  - Form dinamis (`PaymentReceivedModal.tsx`): Menyesuaikan input warkat dan bank secara otomatis berdasarkan tipe pembayaran (`CASH`, `TRANSFER`, `GIRO`, `WALLET`).
- **Grid 2: Alokasi Pelunasan Faktur Invoice**:
  - Dialog alokasi (`InvoiceAllocationModal.tsx`): Checklist interaktif faktur piutang customer yang belum lunas (`fdJumlah - fdBayar > 0`).
- **1-Click Overpayment Redirect**:
  - Jika uang masuk melebihi total tagihan faktur, tombol *"Alihkan Surplus ke Deposit"* muncul otomatis. Kelebihan bayar langsung dialihkan ke deposit customer untuk mencapai Zero-Difference Rp 0.
- **Proteksi Posting Akuntansi (`fdPost = 1`)**: Transaksi yang telah diposting otomatis dikunci menjadi mode read-only.

---

## 2. Modul Customer Wallet & Saldo Deposit Pelanggan (`src/features/wallet/`)
Mengelola saldo deposit di muka (*Advance Deposit*) pelanggan dengan buku besar ganda yang tidak dapat diubah (*Double-Entry Immutable Ledger*):

### A. Penyimpanan Saldo & Integritas
- Saldo aktif disimpan pada tabel `[dbo].[tbCustomerWallet]` (`fdCustCode`, `fdBalance`, `fdStatus`).
- Setiap perubahan saldo dicatat pada `[dbo].[tbCustomerWalletLedger]` (`CREDIT` / `DEBIT`, `fdAmount`, `fdBalanceBefore`, `fdBalanceAfter`, `fdRefType`, `fdRefNo`, `fdCreatedBy`).

### B. Integrasi Kasir Pelunasan
- **Pembayaran via Deposit (`WALLET`)**: Kasir dapat memilih instrumen `WALLET`. Sistem memotong saldo deposit pelanggan secara atomik.
- **Refund Otomatis Pembatalan**: Menghapus baris uang masuk berinstrumen `WALLET` otomatis mengembalikan saldo ke akun deposit pelanggan.

### C. Halaman Direktori Saldo & Mutasi (`ListPage.tsx`)
- **4 Kartu KPI**: Total Saldo Deposit Aktif, Pelanggan Bersaldo (> 0), Total Topup Hari Ini, Total Keluar Hari Ini.
- **Tab 1: Saldo Pelanggan**: Daftar saldo per pelanggan dengan tombol aksi cepat (+ Topup, - Tarik, Koreksi, Lihat Mutasi).
- **Tab 2: Buku Besar Mutasi (Ledger Audit Trail)**: Log audit mutasi mendalam dengan filter tipe transaksi (`TOPUP`, `PAYMENT`, `OVERPAYMENT`, `WITHDRAWAL`, `REFUND`, `ADJUSTMENT`).
- **Modal Setoran (`TopupModal.tsx`)**, **Penarikan Dana (`WithdrawModal.tsx`)**, dan **Penyesuaian Koreksi (`AdjustModal.tsx`)**.

---

## 3. Endpoint API Terkait
| Modul | Endpoint | Method | Deskripsi |
|---|---|:---:|---|
| Cashier | `/api/cashier` | `GET` | Daftar kasir resmi paginated |
| Cashier | `/api/cashier/temp` | `GET` | Daftar kasir sementara paginated |
| Cashier | `/api/cashier/temp/unattached` | `GET` | Kasir sementara yang belum di-attach |
| Cashier | `/api/cashier/stats` | `GET` | Statistik KPI kasir |
| Cashier | `/api/cashier/master-data` | `GET` | Master bank penampung, mata uang, pay types |
| Cashier | `/api/cashier/next-number` | `GET` | Pratinjau nomor otomatis bulanan (`RR-`/`TR-`) |
| Cashier | `/api/cashier/:id` | `GET` / `DELETE` | Detail meja kerja & pembatalan kasir |
| Cashier | `/api/cashier/invoices/unpaid` | `GET` | Faktur piutang customer belum lunas |
| Cashier | `/api/cashier/official` | `POST` | Buat kasir resmi baru |
| Cashier | `/api/cashier/temp` | `POST` | Buat kasir sementara baru |
| Cashier | `/api/cashier/attach` | `POST` | Konversi kasir sementara ke resmi |
| Cashier | `/api/cashier/:id/rcv` | `POST` / `DELETE` | Tambah / hapus baris penerimaan uang |
| Cashier | `/api/cashier/:id/details` | `POST` / `DELETE` | Tambah / hapus alokasi faktur invoice |
| Cashier | `/api/cashier/:id/overpayment-deposit` | `POST` | Alihkan surplus kasir ke saldo deposit customer |
| Wallet | `/api/wallet/stats` | `GET` | Ringkasan saldo agregat & mutasi harian |
| Wallet | `/api/wallet/customers` | `GET` | Daftar saldo deposit pelanggan |
| Wallet | `/api/wallet/customer/:custCode` | `GET` | Detail saldo & 10 mutasi terakhir customer |
| Wallet | `/api/wallet/ledger` | `GET` | Riwayat buku besar mutasi (audit trail) |
| Wallet | `/api/wallet/topup` | `POST` | Setoran deposit pelanggan |
| Wallet | `/api/wallet/withdraw` | `POST` | Penarikan dana deposit pelanggan |
| Wallet | `/api/wallet/adjust` | `POST` | Penyesuaian memo koreksi audit |
| Wallet | `/api/wallet/overpayment` | `POST` | Pengalihan kelebihan bayar kasir ke deposit |
