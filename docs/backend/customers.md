# 👥 Modul Pelanggan (Customers) — Backend

Dokumentasi spesifikasi endpoint pelanggan, single source of truth nama pelanggan (`tbCustomers.fdCustName`), alamat pengiriman, dan klasifikasi tier.

---

## 1. 📂 Struktur Modul

- Direktori: `backend/src/modules/customers/`
- Berkas Utama:
  - `customers.routes.ts`: Rute endpoint API & permission guard (`/mshipping/customers`).
  - `customers.service.ts`: Kueri master pelanggan, filter status aktif, dan autocomplete ter-cache.
  - `customers.types.ts`: Antarmuka profil pelanggan, tier, dan saran autocomplete.

---

## 2. 🔌 Daftar Endpoint REST API

| Method | Endpoint | Permission | Keterangan |
|---|---|---|---|
| `GET` | `/api/customers` | `/mshipping/customers` | Daftar master pelanggan ber-pagination dengan filter status aktif |
| `GET` | `/api/customers/:custCode` | `/mshipping/customers` | Mengambil detail profil pelanggan, alamat tagihan, kontak PIC |
| `GET` | `/api/customers/suggestions` | `/mshipping/customers` | Autocomplete instan nama pelanggan, kode pelanggan, kontak |
| `GET` | `/api/customers/:custCode/destinations` | `/mshipping/customers` | Mengambil daftar alamat tujuan pengiriman barang |
| `GET` | `/api/customers/tiers` | `/mshipping/customers` | Daftar tiering pelanggan berdasarkan volume / omset transaksi |

---

## 3. 🏢 Single Source of Truth & Mesin Pencarian Pelanggan

- Master data nama customer **HANYA** bersumber dari `tbCustomers.fdCustName`.
- Pada kueri agregasi atau Stored Procedure warisan yang me-return `fdCustName` dari tabel transaksi, service backend **WAJIB menimpa (*override*)** nilai tersebut dengan `tbCustomers.fdCustName`.
- **Mesin Pencarian Multi-Token & Resilien (`getCustomers`)**:
  - Mendukung pencarian majemuk berbasis kata kunci terpisah spasi (*multi-token AND logic*), contoh: `"budi jakarta"`, `"abs bintaro"`, `"pt santoso semarang"`.
  - Mencakup field komprehensif: `fdCustName`, `fdCustCode`, `fdContact`, `fdHP`, `fdTelp`, `fdCityName`, `fdAddr1`, `fdBillTo`, `fdNamaPengiriman`, `fdKotaPengiriman`, `fdSalesNM`, `fdEmailPenagihan`, `fdKeterangan`.
  - Normalisasi nomor telepon: Mendeteksi digit telepon (menghilangkan strip, spasi, tanda kurung) untuk mencocokkan format nomor telepon seperti `0815-8664-9888` ke database.
  - Memisahkan kondisi filter `category` (misal `direct`, `broker`, `no_status`) ke dalam struktur array Prisma `AND: [...]` sehingga tidak menimpa (*overwrite*) blok `OR` pencarian.
  - Mengoreksi penanganan pelanggan Direct / CS (`fdBroker: 2`, `0`, atau `null`) sesuai aturan ERP warisan.
- **Saran Pencarian Instan (`getCustomerSuggestions`)**:
  - Mengurutkan saran berdasarkan prioritas awalan kode pelanggan (`fdCustCode`) dan awalan nama pelanggan (`fdCustName`).
  - Menyertakan informasi kota dan kontak untuk hasil autocomplete yang informatif.

