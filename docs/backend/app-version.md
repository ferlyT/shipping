# 📱 Modul Versi Aplikasi Mobile & Distribusi APK — Backend

Dokumentasi spesifikasi endpoint pemeriksaan pembaruan versi mobile (*OTA Version Check*) dan layanan distribusi download file biner APK Android.

---

## 1. 📂 Struktur Modul

- Direktori: `backend/src/modules/app-version/`
- Berkas Utama:
  - `app-version.routes.ts`: Rute endpoint publik pemeriksaan versi aplikasi mobile.
  - `app-version.service.ts`: Penyedia metadata versi terkini, nomor build, status force update, dan riwayat changelog.
  - Handler statis di `backend/src/index.ts`: Penyedia stream biner file APK (`handleApkDownload`).

---

## 2. 🔌 Daftar Endpoint REST API

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| `GET` | `/api/app-version/check` | Publik | Memeriksa ketersediaan versi baru aplikasi mobile |
| `GET` | `/download/apk` | Publik | Mengunduh file biner `mshipping.apk` rilis terbaru |
| `GET` | `/api/download/apk` | Publik | Alias rute pengunduhan biner APK via prefix API |
| `GET` | `/mshipping/download/apk`| Publik | Alias rute pengunduhan biner APK via prefix base path |

---

## 3. 🔍 Spesifikasi Respons Version Check (`GET /api/app-version/check`)

### Request Query Parameters
- `currentVersion`: String semver yang sedang terpasang di perangkat (contoh: `"1.2.0"`).
- `currentVersionCode`: Integer kode build yang sedang terpasang (contoh: `12`).

### Contoh Respons JSON
```json
{
  "success": true,
  "data": {
    "latestVersion": "1.2.1",
    "latestVersionCode": 13,
    "forceUpdate": true,
    "downloadUrl": "http://36.93.22.142/download/apk",
    "changelog": [
      "Perbaikan autocomplete pencarian kargo, faktur, dan surat jalan",
      "Debounce 300ms untuk pengetikan cepat dan hemat bandwidth",
      "Pencegahan data mismatch pada pemilihan pelanggan di tab Keuangan"
    ]
  }
}
```

---

## 4. 📦 Penyajian File Biner APK (`public/uploads/mshipping.apk`)

- File APK dibaca langsung menggunakan engine ultra-cepat `Bun.file(apkPath)`.
- Mengembalikan HTTP Response dengan header biner Android:
  ```http
  Content-Type: application/vnd.android.package-archive
  Content-Disposition: attachment; filename="mshipping.apk"
  ```
- Jika file belum tersedia (misal pada mesin dev baru), server mengembalikan halaman HTML informatif berisi panduan build atau link alternatif.
