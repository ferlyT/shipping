# 🚀 Mobile Release Protocol, Force Update & Distribution

Dokumen ini adalah panduan standar operasional bagi pengembang dan AI Agent untuk menaikkan versi, mengompilasi APK, melakukan signing rilis, serta mendistribusikan aplikasi mobile M-Shipping.

---

## 1. Single Source of Truth Versi (`mobile/src/config/version.ts`)
Versi aplikasi didefinisikan secara statis di `mobile/src/config/version.ts`:
```ts
export const APP_VERSION = '1.2.2'
export const APP_VERSION_CODE = 14
export const FORCE_UPDATE = true
export const MIN_APP_VERSION = '1.2.2'
```
> **Penting**: Penulisan statis ini menjamin nomor versi tertanam permanen ke dalam bytecode Hermes, mencegah nilai `null` pada `Constants.expoConfig` di lingkungan APK standalone Android.

---

## 2. Aturan Naik Versi & Ambang Batas Rilis (> 5 Item)
Sesuai aturan pemilik sistem:
- **Ambang Batas**: Kenaikan nomor versi (`version` / `versionCode`) dan rilis **Force Update (`forceUpdate: true`)** HANYA dilakukan jika telah terjadi akumulasi perubahan **lebih dari 5 item / perbaikan bug**.
- Jika akumulasi perubahan masih $\le$ 5 item:
  - Kode disimpan dan diuji lokal, tidak langsung memicu kenaikan versi atau build rilis kecuali diminta secara eksplisit oleh user.
- Ketika akumulasi perubahan telah melebihi 5 item:
  - **WAJIB tanyakan konfirmasi ke user**: nomor versi baru (`version` semver & `versionCode`) serta tipe update (*Force Update* wajib instal vs *Opsional* dapat ditunda).
  - DILARANG mengasumsikan sendiri status `forceUpdate`.

---

## 3. Penyelarasan Konfigurasi Versi Terpusat (4 Berkas)
Setelah konfirmasi user diperoleh, selaraskan seluruh berkas berikut:
1. `mobile/src/config/version.ts` $\to$ `APP_VERSION`, `APP_VERSION_CODE`, `FORCE_UPDATE`, `MIN_APP_VERSION`.
2. `backend/src/config/app-version.json` $\to$ `version`, `versionCode`, `forceUpdate`, `releaseNotes`, `publishedAt`.
3. `mobile/app.json` $\to$ `expo.version`.
4. `mobile/package.json` $\to$ `version`.

---

## 4. Prosedur Build, Hermes Export, Sign & Distribusi APK
1. **Ekspor Bundle Hermes**:
   ```powershell
   cd c:\shipping\mobile
   bunx expo export --platform android
   ```
2. **Patch APK (`AndroidManifest.xml` & Bytecode)**:
   - Ambil bytecode Hermes terbaru (`.hbc`) dari `mobile/dist/_expo/static/js/android/`.
   - Modifikasi binary `AndroidManifest.xml` pada APK agar `versionCode` dan `versionName` sinkron.
   - Ganti berkas `assets/index.android.bundle` pada APK dan hapus folder tanda tangan lama `META-INF/`.
3. **Sign & Zipalign APK Menggunakan `release.keystore`**:
   ```powershell
   & "C:\Program Files\JetBrains\PyCharm Community Edition 2024.3.1.1\jbr\bin\java.exe" -jar "C:\shipping\uber-apk-signer.jar" -a "C:\shipping\mshipping.apk" --ks "mobile/keystore/release.keystore" --ksAlias mshipping --ksPass mshipping2026 --ksKeyPass mshipping2026 --allowResign --overwrite --verbose
   ```
4. **Salin APK ke 4 Titik Distribusi Server**:
   - `C:\shipping\mshipping.apk`
   - `C:\shipping\frontend\dist\mshipping.apk`
   - `C:\shipping\frontend\public\mshipping.apk`
   - `C:\shipping\backend\public\uploads\mshipping.apk`
5. **Restart Backend API PM2**:
   ```powershell
   pm2 restart ShippingApi
   ```

### 4.1 Batasan Krusial: Repack Base APK vs Native Binary Baru
- Server Windows ini menggunakan alur repack `scripts/repack_apk.ps1` yang **hanya memperbarui JavaScript Hermes bytecode** (`assets/index.android.bundle`) ke dalam base APK `mshipping.apk`.
- Di server tidak terpasang Android SDK / Gradle / EAS Build untuk mengompilasi kode native Java/Kotlin baru ke dalam file DEX Android (`classes.dex`).
- **DILARANG mengimpor library baru yang memerlukan modul native binary yang belum ada di base APK** (seperti `expo-image-picker`, `expo-document-picker`, `react-native-image-crop-picker`, dll). Import library native yang tidak ada di DEX akan memicu fatal uncaught exception `Cannot find native module 'ExponentXxx'` dan menyebabkan app crash instan saat layar dibuka.
- Pustaka native yang aman dan sudah ter-bundle di base APK: `expo-camera`, `expo-file-system`, `expo-sharing`, `expo-print`, `expo-local-authentication`, `expo-secure-store`, `expo-haptics`, `react-native-svg`, `react-native-screens`, `react-native-reanimated`.

---

## 5. Mekanisme In-App Auto Update & Sideloading
- **Pemeriksaan Latar Belakang**: `useUpdateStore.checkUpdate(false)` dieksekusi hening di `_layout.tsx`.
- **In-App Direct Downloader**: Jika rilis baru tersedia, aplikasi mengunduh berkas APK di latar belakang via `expo-file-system/legacy` dengan progress bar `0% - 100%`.
- **1-Tap Installer**: Begitu selesai diunduh, aplikasi langsung memicu dialog Package Installer Android native via `Sharing.shareAsync` tanpa perlu buka browser manual.
- **Titik Akses Unduhan Publik**:
  - `http://36.93.22.142/mshipping/mshipping.apk`
  - `http://36.93.22.142/mshipping/download/`
