# 👥 Modul Master Data, Administrasi & Profil (`src/features/`)

Dokumen ini merangkum 3 domain operasional: **Master Data Pelanggan** (`customers`), **Administrasi Pengguna & Role** (`user-management`), dan **Pengaturan Profil Pengguna** (`profile`).

---

## 1. Modul Master Pelanggan (`src/features/customers/`)
- **Katalog Master Data Resmi (SSOT `tbCustomers`)**:
  - Seluruh nama pelanggan mengutamakan `tbCustomers.fdCustName`.
  - Format penulisan petik FoxPro dinormalkan menggunakan helper `displayCustName`.
- **Toolbar Pelanggan Cerdas (`CustomerToolbar.tsx`)**:
  - Terhubung dengan `SearchSuggestionsDropdown` (`GET /api/customers/suggestions`).
  - Pencarian debounced 350ms, shortcut keyboard `Ctrl+K` untuk fokus, `Esc` untuk menutup saran/membersihkan pencarian, dan `Enter` untuk submit instan.
  - Dukungan navigasi keyboard panah atas/bawah (`↑` / `↓`) untuk memilih entri saran autocomplete secara cepat.
  - Sinkronisasi URL dua arah: parameter query `?search=` tersinkronisasi otomatis dengan input pencarian, memungkinkan bookmarking dan deep-linking.
  - Filter status (Aktif/Discontinued), filter sales in-charge, dan switch tampilan (Tabel, Grid, Shortlist).
  - Transisi loading halus: eliminasi layar kedip (*flicker*) saat background fetch (`isRefreshing`) dengan mempertahankan tabel aktif semi-transparan.
- **Modal Detail Pelanggan (`CustomerDetailModal.tsx`)**:
  - Tab 1: *Ringkasan & Kontak* (PIC, sales, telepon, WA, alamat, status blokir `fdBlocked`).
  - Tab 2: *Tier & Finansial* (Tier aktif, omset tahun berjalan, progress bar, riwayat transaksi).
  - Tab 3: *Daftar Alamat* (Alamat kontak dan gudang operasional cabang `vwCustomerContacts`).

---

## 2. Modul Administrasi Pengguna & Role (`src/features/user-management/`)
Khusus peran `admin` yang dilindungi oleh `AdminGuard`:

### A. Manajemen Pengguna (`UserManagementPage.tsx`)
- Pengaktifan staf baru via toggle `isActive` (menyetujui akun pending register).
- Penetapan role (`admin`, `staff`, `finance`, `logistics`, `viewer`).
- Penautan akun login dengan identitas fisik karyawan `fdEmpCode` (`/users/:id/employee`).
- Tab *Trash (Sampah)*: Restore dan permanent delete akun.

### B. Manajemen Role & Matriks Hak Akses (`RoleManagementPage.tsx`)
- Pembuatan role baru.
- Matriks checkbox permission per rute halaman (`AVAILABLE_PATHS` terpusat di `userManagement.types.ts`), termasuk hak akses fitur utilitas seperti **Asisten Suara ERP** (`ROUTES.VOICE_ASSISTANT: '/mshipping/voice-assistant'`).
- Pengaturan rute default (*Default Route*) per role.
- Tabel database penampung: `[dbo].[tbRolePermissions]` (`role`, `path`, `canView`, `isDefault`).

---

## 3. Modul Profil & Pengaturan Akun (`src/features/profile/`)
- **Avatar Pengguna (`AvatarUpload.tsx`)**:
  - Dukungan upload JPEG, PNG, WEBP, GIF (maks. 3MB).
  - Pratinjau instan dengan fallback inisial nama.
  - Sinkronisasi instan ke state global `useAuthStore` (avatar Topbar & tabel staf langsung terupdate).
- **Ganti Kata Sandi (`ChangePasswordForm.tsx`)**:
  - Verifikasi sandi lama, sandi baru minimal 6 karakter, dan indikator kecocokan real-time.
- **Informasi Profil & Preferensi Tema**:
  - Edit nama lengkap, status role sistem, tanggal registrasi.
  - Pemilihan 5 tema warna ERP resmi (`Heritage`, `Ocean`, `Emerald`, `Amber`, `Midnight Dark`).

---

## 4. Endpoint API Terkait
| Modul | Endpoint | Method | Deskripsi |
|---|---|:---:|---|
| Customers | `/api/customers` | `GET` | Pagination master pelanggan |
| Customers | `/api/customers/suggestions` | `GET` | Autocomplete pelanggan, kode (`custCode`), kontak |
| Customers | `/api/customers/:id` | `GET` | Rincian lengkap master data pelanggan |
| Users | `/api/users` | `GET` | Daftar pengguna staf aktif |
| Users | `/api/users/trash` | `GET` | Daftar pengguna di tong sampah |
| Users | `/api/users/:id/status` | `PATCH` | Aktifkan/nonaktifkan akun staf |
| Users | `/api/users/:id/role` | `PATCH` | Ubah level peran pengguna |
| Users | `/api/users/:id/employee` | `PATCH` | Tautkan akun ke data karyawan fisik |
| Roles | `/api/roles` | `GET` / `POST` | Daftar role dan pembuatan role baru |
| Roles | `/api/roles/:role` | `GET` / `PUT` | Konfigurasi matriks izin rute role |
| Profile | `/api/profile` | `GET` / `PUT` | Data profil akun aktif & edit nama |
| Profile | `/api/profile/password` | `PUT` | Ubah kata sandi mandiri |
| Profile | `/api/profile/avatar` | `POST` / `DELETE` | Upload / hapus foto avatar profil |
