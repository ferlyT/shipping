# 🔐 Modul Auth, Profil, Pengguna & Hak Akses (RBAC) — Backend

Dokumentasi spesifikasi endpoint, logika autentikasi JWT, manajemen pengguna, dan matriks hak akses peran (*Role-Based Access Control*).

---

## 1. 📂 Struktur Modul

- **Auth**: `backend/src/modules/auth/` (`auth.routes.ts`, `auth.service.ts`, `auth.schema.ts`)
- **Profile**: `backend/src/modules/profile/` (`profile.routes.ts`, `profile.service.ts`)
- **Users**: `backend/src/modules/users/` (`users.routes.ts`, `users.service.ts`)
- **Roles & Permissions**: `backend/src/modules/roles/` (`roles.routes.ts`, `roles.service.ts`)

---

## 2. 🔌 Daftar Endpoint REST API

| Method | Endpoint | Auth | Permission | Keterangan |
|---|---|---|---|---|
| `POST` | `/api/auth/login` | Publik (Rate Limited) | — | Login pengguna dengan username & password |
| `POST` | `/api/auth/register` | Publik | — | Pendaftaran akun baru (default role: viewer) |
| `GET` | `/api/auth/me` | Wajib JWT | — | Mendapatkan profil sesi pengguna aktif |
| `GET` | `/api/profile` | Wajib JWT | — | Mendapatkan detail profil lengkap pengguna |
| `PUT` | `/api/profile` | Wajib JWT | — | Memperbarui nama lengkap, kontak, email |
| `PUT` | `/api/profile/password` | Wajib JWT | — | Mengubah password pengguna (verifikasi password lama) |
| `POST` | `/api/profile/avatar` | Wajib JWT | — | Upload file foto avatar pengguna (disimpan di `public/uploads/avatars/`) |
| `GET` | `/api/users` | Wajib JWT | `isAdmin` | Daftar seluruh pengguna dengan filter role & pagination |
| `POST` | `/api/users` | Wajib JWT | `isAdmin` | Membuat akun pengguna baru oleh admin |
| `PUT` | `/api/users/:id` | Wajib JWT | `isAdmin` | Mengedit profil pengguna, role, atau link ke `fdEmpCode` |
| `DELETE` | `/api/users/:id` | Wajib JWT | `isAdmin` | Soft delete pengguna (`isDeleted = true`) |
| `PATCH` | `/api/users/:id/toggle-active` | Wajib JWT | `isAdmin` | Toggle status aktif (`isActive = !isActive`) |
| `GET` | `/api/roles` | Wajib JWT | `isAdmin` | Mendapatkan daftar seluruh peran yang tersedia |
| `GET` | `/api/roles/permissions/:role` | Wajib JWT | `isAdmin` | Mendapatkan matriks path yang diizinkan untuk peran |
| `POST` | `/api/roles/permissions` | Wajib JWT | `isAdmin` | Menyimpan/memperbarui matriks izin akses peran |

---

## 3. 🗄️ Model Database (Prisma)

### `tbUsers`
- `id`: UUID (Primary Key)
- `username`: VarChar(100), Unique
- `passwordHash`: NVarChar(255) (Bcrypt hash)
- `fullName`: NVarChar(200)
- `role`: NVarChar(50) (`admin`, `finance`, `cashier`, `operator`, `viewer`)
- `fdEmpCode`: VarChar(7) (Foreign key ke master karyawan `tbEmployees`)
- `avatarUrl`: NVarChar(MAX)
- `isActive`: Boolean (Default: `true`)
- `isDeleted`: Boolean (Default: `false`)
- `lastLoginAt`: DateTime2

### `tbRolePermissions`
- `id`: UUID (Primary Key)
- `role`: NVarChar(50)
- `path`: NVarChar(100) (contoh: `'/mshipping/billing'`, `'/mshipping/delivery-orders'`)
- `canView`: Boolean (Default: `true`)
- `isDefault`: Boolean (Default: `false`)

---

## 4. 🛡️ Mekanisme Autentikasi & Otorisasi

### JWT Middleware (`src/middleware/auth.ts`)
1. **Verifikasi Token**: Memeriksa header `Authorization: Bearer <token>`, memvalidasi signature menggunakan `ENV.JWT_SECRET`.
2. **Payload Context**: Token payload didekode dan disimpan ke Hono Context (`c.set('user', payload)`), memuat `userId`, `username`, `role`, dan `fdEmpCode`.
3. **Guard `requirePermission(path)`**:
   - Jika pengguna adalah `admin`, akses selalu diloloskan (`bypass`).
   - Jika non-admin, sistem mengecek kecocokan `path` pada tabel `tbRolePermissions`. Jika `canView !== true`, melempar HTTP 403 Forbidden.
