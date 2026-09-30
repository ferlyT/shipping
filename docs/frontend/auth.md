# 🔐 Modul Autentikasi Frontend (`src/features/auth/`)

Dokumen ini mencakup halaman login, registrasi, siklus hidup token JWT, dan penanganan sesi pada aplikasi web frontend M-Shipping.

---

## 1. Halaman Login (`LoginPage.tsx`)
- **Tujuan & Alur**:
  - Memvalidasi kredensial pengguna (username & password).
  - Menyimpan token JWT dan data user ke Zustand `authStore` dan `localStorage`.
  - Mengarahkan pengguna ke `user.defaultRoute` atau `/mshipping/overview/dashboard`.
- **Fitur**:
  - Validasi form input required.
  - Opsi simpan sesi *"Ingat Saya"*.
  - Notifikasi error kredensial tidak valid atau koneksi server gagal.
- **Endpoint Terkait**:
  - `POST /api/auth/login`
  - **Payload**: `{ "username": "...", "password": "..." }`
  - **Response**:
    ```json
    {
      "success": true,
      "data": {
        "token": "eyJhbGciOi...",
        "user": {
          "id": "USR-001",
          "username": "admin",
          "fullName": "Administrator",
          "role": "admin",
          "permissions": ["/*"],
          "defaultRoute": "/overview/dashboard",
          "fdEmpCode": "F006"
        }
      }
    }
    ```

---

## 2. Halaman Registrasi (`RegisterPage.tsx`)
- **Tujuan & Alur**:
  - Formulir pendaftaran akun staf baru.
  - Akun yang baru didaftarkan berstatus non-aktif (*pending*) hingga diaktifkan oleh Administrator melalui menu User Management (`/admin/users`).
- **Endpoint Terkait**:
  - `POST /api/auth/register`
  - **Payload**: `{ "fullName": "...", "username": "...", "password": "..." }`
  - **Response**: `{ "success": true, "message": "Pendaftaran berhasil..." }`

---

## 3. Manajemen Token & Interceptor
- **Injeksi Token**: Diatur oleh `src/api/client.ts`. Setiap request menyertakan header `Authorization: Bearer <token>`.
- **Auto-Logout 401**: Interceptor response mendeteksi kode HTTP 401 dan memanggil `useAuthStore.getState().logout()`, membersihkan `localStorage`, serta me-redirect browser ke `/mshipping/login`.
