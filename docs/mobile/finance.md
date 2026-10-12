# 💰 Mobile Finance & Billing (`mobile/app/(tabs)/finance.tsx`)

Manajemen piutang dan tagihan pelanggan, antrean audit validasi (M³ vs KG), kalkulator tarif lookup, serta kompilasi & sharing dokumen PDF faktur yang terproteksi sensor biometrik.

---

## 1. Segmented Tabs Navigasi
- **Tab 1: Daftar Invoice (`billing`)**
- **Tab 2: Audit Validasi (`validation`)**
- **Tab 3: Cek Tarif (`priceLookup`)**

---

## 2. Sub-Tab 1: Daftar Invoice (`billing`)
- **Infinite Scroll**: Menerapkan infinite scroll paginated (`useBillingsQuery` via `useInfiniteQuery`) dengan batch 20 item (`limit: 20`, `onEndReachedThreshold: 0.4`), pull-to-refresh, dan dynamic footer spinner.
- Menampilkan nomor invoice (`fdInvNo`), status pembayaran (`LUNAS`, `PARTIAL`, `ISSUED`, `OVERDUE`, `DRAFT`), nama customer resmi (`displayCustName`), marking & nomor, tanggal tagihan, dan total tagihan.
- **Modal Detail Invoice Komprehensif (`InvoiceDetailSheet`)**:
  - Paritas penuh dengan tampilan `DetailPage.tsx` web frontend.
  - **4 Kartu Utama**:
    1. *Pelanggan*: Nama resmi, kode, status badge (`NORMAL`, `BLOCKED`, `COD`), broker badge, sales, alamat penagihan.
    2. *Waktu & Pembuat*: Tanggal invoice, tanggal terbit (`fdGiveDate` / `DRAFT`), staf penyerah, author pembuat.
    3. *Status Pembayaran*: Status badge (`✓ LUNAS`, `SEBAGIAN`, `BELUM BAYAR`), no. kasir, total dibayar.
    4. *Marking & Komoditi*: Marking code & no, badge consignee, chips nomor resi, komoditas, tanggal agent, tombol salin info marking.
  - **Rincian Item Tagihan**: Baris muatan lengkap (`fdItemName`, kuantiti & unit, tarif, total).
  - **Footer Total**: Breakdown per unit (TOTAL KG, TOTAL M3, TOTAL VFC) dan TOTAL TAGIHAN tebal.
  - **Aksi Dokumen Terproteksi Biometrik**:
    - **Cetak PDF (`Print.printAsync`)**: Dilindungi verifikasi biometrik (Fingerprint / Face ID).
    - **Bagikan PDF (`Sharing.shareAsync`)**: Dilindungi verifikasi biometrik sebelum berkas dibagikan ke WhatsApp/Email/Drive.
    - **Format PDF A5 Landscape**: Spesifikasi $210\,\text{mm} \times 148\,\text{mm}$ identik 100% dengan cetak web (header boks, tabel 4 kolom, terbilang otomatis Bahasa Indonesia via `terbilang.ts`, watermark `"COPY"`).
    - **Salin Nomor Invoice**: Menyalin ke clipboard dengan haptic feedback.
    - **Lampiran Dokumen Faktur (`BillingAttachmentSheet.tsx`)**:
      - Tombol aksi `[Lampiran Dokumen (X)]` pada sheet detail invoice.
      - Grid berkas foto bukti bayar dan dokumen PDF (hingga 10 berkas).
      - Kamera terintegrasi native (`expo-camera`) untuk memotret bukti fisik langsung.
      - Pratinjau layar penuh (gambar zoomable & dokumen PDF viewer/share).
      - Berbagi dokumen via `expo-sharing` (`Sharing.shareAsync`).
      - Terproteksi peran izin akses `canManageBillingAttachments(user)`.

---

## 3. Sub-Tab 2: Audit Validasi Tagihan (`validation`)
- Terproteksi izin akses peran (`canViewBillingValidation`).
- Menampilkan antrean validasi draft aktif sinkron dengan web ERP.
- Query endpoint: `/api/billing?hasAmount=true&draftOnly=true&noPagination=true&minYear=2023`.
- Parameter kartu: nomor invoice, aging days, badge moda, nama customer, marking, pembuat bill, dan nominal tagihan.
- Autocomplete saran via `/api/billing/suggestions`.

---

## 4. Sub-Tab 3: Cek Tarif (Price List Lookup)
- **Sub-Tab Tarif Umum (Master)**:
  - Filter moda (`Semua`, `Udara`, `Laut`) dan cabang asal (`ALL`, `GZ`, `HK`, `SG`, `YW`, `SH`).
  - *Cari Cepat by Resi / Entry Code*: Mengakses `/api/price-list/lookup-by-entry` untuk deteksi tarif otomatis.
  - Menampilkan kategori barang, tarif per kg/m³, cabang, dan estimasi transit.
- **Sub-Tab Tarif Khusus Customer**:
  - Pencarian customer dengan autocomplete langsung dari `/api/customers/suggestions`.
  - Menampilkan kartu tarif kontrak khusus pelanggan bersangkutan.

---

## 5. Endpoint API Terkait
| Endpoint | Method | Parameter / Query | Deskripsi |
|---|:---:|---|---|
| `/api/billing` | `GET` | `limit=20`, `search` | Daftar invoice tagihan resmi |
| `/api/billing/suggestions` | `GET` | `q` | Saran nomor faktur dan nama customer |
| `/api/billing/:id` | `GET` | Path `:id` | Data detail lengkap invoice untuk sheet modal |
| `/api/billing` (Validasi) | `GET` | `hasAmount=true`, `draftOnly=true`, `noPagination=true`, `minYear=2023` | Antrean draft audit validasi penagihan |
| `/api/price-list/lookup` | `GET` | `mode`, `branch`, `date` | Lookup tarif rute umum master |
| `/api/price-list/lookup-by-entry` | `GET` | `entryCode` | Deteksi tarif otomatis dari nomor resi/entry |
| `/api/customer-price-list/lookup` | `GET` | `custCode` | Lookup tarif khusus kontrak pelanggan |
