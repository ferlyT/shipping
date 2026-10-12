# 👥 Mobile Master Data & Profil (`mobile/app/(tabs)/`)

Dokumen ini merangkum dua layar penting: **Direktori Master Pelanggan** (`master.tsx`) dan **Pengaturan Profil, Keamanan & Tema** (`profile.tsx`).

---

## 1. Halaman Master Data Customer (`app/(tabs)/master.tsx`)
- **Pagination & Infinite Scrolling**:
  - Menggunakan `useInfiniteQuery` dengan parameter batch `{ page, limit: 30 }`.
  - Integrasi `FlatList` dengan `onEndReached` (`threshold: 0.5`) dan `ListFooterComponent` dengan `ActivityIndicator`.
- **Tampilan Kartu Pelanggan (Paritas Penuh dengan Web)**:
  - Kode Customer monospace (`fdCustCode`).
  - Badge Customer Tier (`DIAMOND`, `PLATINUM`, `GOLD`, `SILVER`, `BRONZE`).
  - Badge `BROKER` (jika `fdBroker === 1`), `DISCONTINUED`, Tenure bergabung, dan Status `fdBlocked` (`NORMAL`, `OK`, `COD`, `WARNING`, `BLOCKED`, `URGENT`).
  - Nama resmi customer (`displayCustName`) dan omset tahunan berjalan (`formatCompactRupiah`).
  - Pratinjau kota & alamat, CP (`fdContact`), Sales (`fdSalesNM`), dan nomor telepon/HP.
  - **Aksi Cepat Komunikasi**:
    - Tombol **Telepon**: Membuka dialer telepon langsung (`tel:...`).
    - Tombol **WhatsApp**: Membuka WhatsApp chat dengan kode negara 62 (`https://wa.me/...`).
- **Modal Detail Customer 4-Tab**:
  - Tab 1: *Ringkasan (`ringkasan`)* — Kartu CP & Sales, kontak lengkap, alamat kantor utama, catatan operasional.
  - Tab 2: *Finansial (`finansial`)* — Tier aktif, omset berjalan, format compact Rupiah anti-overflow, tabel histori omzet tahunan.
  - Tab 3: *Komoditas (`komoditas`)* — 2 Stacked horizontal proportion bar (Laut & Udara) dengan satuan dinamis (`m³`, `CTR`, `PCS`, `kg`) serta multi-line SVG chart tren bulanan Jan–Des.
  - Tab 4: *Daftar Alamat (`alamat`)* — Kartu alamat operasional (`addresses` / `vwCustomerContacts`) lengkap dengan tombol dialer & WhatsApp.

---

## 2. Halaman Profil & Pengaturan (`app/(tabs)/profile.tsx`)
- **Avatar Pengguna & Kamera Mandiri (`AvatarModal.tsx`)**:
  - Foto avatar dari backend (`resolveAvatarUrl`) dengan fallback inisial nama.
  - Menggunakan modul kamera native `expo-camera` (`CameraView`) dengan panduan lingkaran wajah, switch kamera depan/belakang, senter, dan preview instan.
  - Mengunggah foto berformat Base64 ke `POST /api/profile/avatar` atau menghapus via `DELETE /api/profile/avatar`.
- **Pengaturan Keamanan & Ganti Sandi**:
  - Modal ganti password mandiri (`ChangePasswordModal.tsx`).
  - Toggle autentikasi biometrik (Fingerprint / Face ID) dengan verifikasi keamanan sebelum aktivasi.
- **Preferensi Tema & Bahasa**:
  - Switcher tema: **Midnight (Dark Mode)** vs **Heritage (Light Mode)** vs **System**.
  - Switcher bahasa bilingual: 🇮🇩 **Bahasa Indonesia** (`id`) vs 🇬🇧 **English** (`en`).
- **Informasi Sistem & Cek Pembaruan (Auto Update)**:
  - Status koneksi live ERP (`Terhubung • Operasional Normal`) dan status server `ONLINE`.
  - Versi aplikasi aktif (dari `version.ts`).
  - Tombol *"Cek Pembaruan"*: Pengecekan versi ke `GET /api/app-version/latest`, memunculkan `UpdateModal` jika ada rilis baru.
- **Logout Aman**: Membersihkan token dan kredensial biometrik dari `expo-secure-store`.

---

## 3. Endpoint API Terkait
| Modul | Endpoint | Method | Deskripsi |
|---|---|:---:|---|
| Master | `/api/customers` | `GET` | Daftar pelanggan paginated (`limit=25`, `search`) |
| Master | `/api/customers/suggestions` | `GET` | Autocomplete customer, kode, dan PIC (< 50ms) |
| Master | `/api/customers/:id` | `GET` | Detail pelanggan lengkap termasuk relasi alamat |
| Profil | `/api/profile/avatar` | `POST` / `DELETE` | Upload / hapus foto avatar profil pengguna |
| Profil | `/api/profile/password` | `PUT` | Pembaruan kata sandi mandiri |
| Update | `/api/app-version/latest` | `GET` | Metadata versi terbaru, changelog, dan URL APK |
