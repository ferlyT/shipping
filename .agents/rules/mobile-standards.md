# 📱 Standar Mobile App & Rilis APK — mshipping

> Bagian dari aturan operasional AI Agent. File ini mendefinisikan protokol pra-rilis, konfirmasi versi, dan prosedur kompilasi & distribusi APK Expo React Native.

---

## 1. 🛑 Protokol Pra-Rilis & Konfirmasi Wajib

Sebelum merilis / build APK baru setelah perbaikan atau penambahan fitur:

1. **Wajib Baca Dokumentasi Mobile Dulu**:
   - Agen **WAJIB** membaca [`mobile-app.md`](../../mobile-app.md) dan modul terkait di [`docs/mobile/`](../../docs/mobile/) sebelum menyentuh kode di `mobile/`.
2. **Threshold Rilis (Akumulasi Task)**:
   - Jangan build/rilis APK baru jika akumulasi perbaikan masih < 5 item, KECUALI ada bug kritis yang memblokir operasional atau ada permintaan eksplisit dari pengguna.
3. **Konfirmasi Wajib ke Pengguna**:
   - Agen **WAJIB BERTANYA DULU** ke user sebelum build:
     - **Nomor versi baru**: Semver (`version`) dan nomor build (`versionCode`).
     - **Tipe Update**: *"Apakah pembaruan ini bersifat **Force Update** (`forceUpdate: true`) yang wajib diinstal pengguna agar dapat terus menggunakan aplikasi, atau **Opsional** (`forceUpdate: false`) yang dapat ditunda ('Nanti Saja')?"*
   - **DILARANG** mengasumsikan sendiri nomor versi atau status `forceUpdate`.

---

## 2. 🔄 Sinkronisasi Versi (4 File Wajib)

Ketika versi baru telah disetujui pengguna, sinkronkan di 4 file berikut secara bersamaan:

1. **`mobile/app.json`**:
   - `expo.version`: `"x.y.z"`
   - `expo.android.versionCode`: `N`
2. **`mobile/package.json`**:
   - `"version"`: `"x.y.z"`
3. **`backend/src/modules/mobile/mobile.service.ts`**:
   - `latestVersion`: `'x.y.z'`
   - `latestVersionCode`: `N`
   - `forceUpdate`: `true` | `false`
   - `changelog`: array string rincian pembaruan
4. **`mobile/src/features/finance/components/FinanceTab.tsx`**:
   - Badge info versi di UI mobile: `vX.Y.Z (Build N)`

---

## 3. 📦 Prosedur Kompilasi Bundle & Repack APK

Prosedur repackaging cepat tanpa EAS Cloud:

1. **Export Hermes JS Bundle**:
   ```bash
   cd mobile
   npx react-native bundle --platform android --dev false --entry-file index.ts --bundle-output dist/index.android.bundle --assets-dest dist/res
   ```
2. **Compile Hermes Bytecode**:
   Gunakan compiler `hermesc` bawaan node_modules untuk mengompilasi `index.android.bundle` menjadi `index.android.bundle` bytecode teroptimasi.
3. **Repackage & Patch Manifest**:
   - Update `versionCode` dan `versionName` di `AndroidManifest.xml` via `apktool` atau `aapt2`.
   - Masukkan bundle baru ke APK base via zip injector.
4. **Zipalign & Sign APK**:
   ```bash
   zipalign -v -p 4 temp.apk aligned.apk
   apksigner sign --ks c:\shipping\mobile\mshipping-release-key.keystore --ks-key-alias mshipping --out mshipping.apk aligned.apk
   ```
5. **Distribusi Sinkron ke 4 Titik Server**:
   Salin `mshipping.apk` hasil sign ke:
   1. `c:\shipping\mshipping.apk` (Root)
   2. `c:\shipping\frontend\dist\mshipping.apk` (Frontend Static Dist)
   3. `c:\shipping\frontend\public\mshipping.apk` (Frontend Public Source)
   4. `c:\shipping\backend\public\uploads\mshipping.apk` (Backend OTA Update Server)

---

## 4. ⚠️ Larangan Kritis: Jangan Tambah Library Memerlukan Native Binary Baru

- Lingkungan server ini mengandalkan skrip repack `scripts/repack_apk.ps1` yang **hanya menginjeksi Hermes JS bytecode** ke dalam base APK `mshipping.apk`.
- Tidak ada toolchain Android SDK / Gradle untuk mengompilasi Java/Kotlin DEX baru.
- **DILARANG** menginstal atau mengimpor library baru yang memanggil `requireNativeModule` jika modul tersebut belum ada di `classes.dex` base APK (contoh: `expo-image-picker`, `expo-document-picker`, `react-native-image-crop-picker`).
- Pelanggaran akan menyebabkan **aplikasi crash seketika** (fatal uncaught exception: `Cannot find native module 'ExponentXxx'`) saat runtime atau navigasi tab dibuka.
- Modul native yang valid & sudah ada di base APK: `expo-camera`, `expo-file-system`, `expo-sharing`, `expo-print`, `expo-local-authentication`, `expo-secure-store`, `expo-haptics`, `react-native-svg`, `react-native-screens`, `react-native-reanimated`.
