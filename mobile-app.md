# 📱 Dokumentasi Mobile App M-Shipping — Master Index

Dokumen ini adalah **Master Index & Quick Guide** arsitektur aplikasi mobile **M-Shipping** (Expo SDK 57 / React Native 0.86 / TypeScript / Zustand / TanStack Query / Hono.js Backend).

> 💡 **Panduan Membaca AI Agent**:
> Sebelum mengubah kode pada folder `mobile/`, **JANGAN membaca seluruh dokumentasi sekaligus**. Dokumen telah disegmentasi menjadi modul-modul terfokus per domain di folder [`docs/mobile/`](./docs/mobile/). Buka berkas modul yang relevan melalui tautan di bawah ini.

---

## 🏗️ 1. Ringkasan Arsitektur & Lingkungan
- **Framework Mobile**: Expo SDK 57 (React Native 0.86, React 19.2, TypeScript 6.0)
- **Routing**: Expo Router v4 (`mobile/app/`)
- **State Management**: Zustand v5 (`authStore`, `toastStore`, `updateStore`)
- **REST API**: Axios via `mobile/src/api/client.ts` (`https://app.sampai.co/api` via SSL Let's Encrypt Port 443)
- **Kredensial**: `expo-secure-store` (Enkripsi KeyStore Android)
- **Versi Aktif**: `v1.3.8` (VersionCode: `30`, SSOT di `mobile/src/config/version.ts`, Force Update: `false`)
- **Hardware Native**: `expo-camera`, `expo-local-authentication`, `expo-print`, `expo-sharing`, `expo-haptics`.

---

## 📂 2. Peta Modul Dokumentasi Mobile (`docs/mobile/`)

| Domain / Layar | Berkas Modul | Cakupan Isi & Logika Teknis |
|---|---|---|
| **Fondasi & Hardware** | [`docs/mobile/architecture.md`](./docs/mobile/architecture.md) | Stack teknologi, penanganan safe area insets Android, preferensi tema dinamis, kamera, biometrik, print & share PDF. |
| **Autentikasi & Splash** | [`docs/mobile/auth.md`](./docs/mobile/auth.md) | Splash gatekeeper (`index.tsx`), login manual, autentikasi biometrik Fingerprint/FaceID, dan pendaftaran akun baru. |
| **Overview & Exit Activity** | [`docs/mobile/overview.md`](./docs/mobile/overview.md) | Dashboard eksekutif, Hero Card tanpa icon terpadu (Exit + Billing Ops), 4 kartu exit activity, manifest popup in-place. |
| **Logistik Lapangan** | [`docs/mobile/logistics.md`](./docs/mobile/logistics.md) | Tab Resi (`shipments`), Batch Marking (`batches`), Surat Jalan (`delivery`), barcode & container scanner modal, infinite scroll. |
| **Keuangan & Billing** | [`docs/mobile/finance.md`](./docs/mobile/finance.md) | Daftar invoice, antrean validasi draft, lookup tarif master & customer, kompilasi PDF A5 landscape terproteksi biometrik. |
| **Master & Profil** | [`docs/mobile/master-profile.md`](./docs/mobile/master-profile.md) | Direktori customer (dialer telepon & WhatsApp langsung), modal detail 3-tab, ganti password, avatar kamera native, status ERP. |
| **Protokol Rilis APK** | [`docs/mobile/release-protocol.md`](./docs/mobile/release-protocol.md) | Ambang batas rilis > 5 item, force update protocol, penyelarasan versi terpusat, Hermes export, sign & zipalign APK. |
| **Revisi Data Lapangan** | [`docs/mobile/data-revisions.md`](./docs/mobile/data-revisions.md) | Form revisi data & pembatalan kargo (`fdCancel = 1`), fast lookup `fdListCode`, jepret bukti fisik, safe area bottom nav. |

---

## 🚦 3. Aturan Wajib Rilis & Pembaruan Mobile
1. **Wajib Baca Modul Terkait**: Sebelum memodifikasi kode di `mobile/`, baca modul terkait di [`docs/mobile/`](./docs/mobile/).
2. **Ambang Batas > 5 Item**: Kenaikan versi dan rilis APK hanya dilakukan jika perubahan telah terakumulasi lebih dari 5 item.
3. **Konfirmasi User**: Tanyakan nomor versi baru dan tipe update (*Force Update* vs *Opsional*) sebelum merilis.
4. **Verifikasi Build**: Selalu pastikan hermes export dan signing APK terverifikasi di 4 titik server.

*Terakhir disinkronkan: 2026-10-11 (Kompilasi v1.3.8 Build 30 No Force Update - Resolusi Menyeluruh Infinite Scroll Halaman Customer Mobile).*
