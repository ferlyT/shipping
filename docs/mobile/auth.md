# 🔐 Mobile Authentication & Splash Gatekeeper (`mobile/app/(auth)/`)

Dokumen ini menjelaskan alur inisialisasi aplikasi (*entrypoint*), otentikasi kredensial pengguna, integrasi sensor biometrik (Fingerprint / Face ID), dan pendaftaran akun baru.

---

## 1. Halaman Splash & Gatekeeper (`app/index.tsx`)
- **Tujuan**: Memeriksa sesi login yang tersimpan di memori aman perangkat (`expo-secure-store`).
- **Alur Kerja**:
  1. Memanggil `initializeAuth()` dari `authStore.ts` saat aplikasi dibuka.
  2. Membaca token JWT (`mshipping_auth_token`) dan data profil (`mshipping_auth_user`).
  3. **Pengalihan Otomatis**:
     - Jika token valid (`isAuthenticated === true`) $\to$ langsung ke `/(tabs)/overview`.
     - Jika belum login (`isAuthenticated === false`) $\to$ diarahkan ke `/(auth)/login`.

---

## 2. Halaman Login (`app/(auth)/login.tsx`)
- **Autentikasi Manual**:
  - Input username dan password.
  - POST request ke `/api/auth/login`.
  - Jika sukses: simpan token dan user ke Zustand `authStore` dan `expo-secure-store`, picu haptic sukses, dan arahkan ke tab Overview.
- **Autentikasi Biometrik (Fingerprint / Face ID)**:
  - `checkBiometrics()` mendeteksi sensor via `expo-local-authentication`.
  - Tombol biometrik hanya muncul jika hardware tersedia dan terdapat token tersimpan (`isEnabled && saved?.token`).
  - Memvalidasi token ke endpoint `GET /api/auth/me`.
  - Jika valid, langsung login tanpa input ulang password.
  - Saat `logout()`, kredensial biometrik otomatis dibersihkan (`clearSavedCredentials()`) guna mencegah kebocoran akun antar-pengguna.
- **Penanganan Error**: Toast *"Username atau password salah"* atau *"Network Error"* jika koneksi server terputus.

---

## 3. Halaman Pendaftaran (`app/(auth)/register.tsx`)
- Mengisi nama lengkap, username, password, dan konfirmasi password.
- Validasi form klien (`password === confirmPassword`).
- POST ke `/api/auth/register`. Akun baru berstatus *pending* hingga disetujui administrator.

---

## 4. Endpoint API Terkait
| Endpoint | Method | Header / Payload | Deskripsi |
|---|:---:|---|---|
| `/api/auth/login` | `POST` | `{ "username", "password" }` | Token JWT, data profil staf, role, permissions |
| `/api/auth/me` | `GET` | `Authorization: Bearer <TOKEN>` | Verifikasi keabsahan token biometrik tersimpan |
| `/api/auth/register` | `POST` | `{ "fullName", "username", "password" }` | Pendaftaran akun baru (status pending) |
