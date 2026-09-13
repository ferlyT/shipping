# 📋 Working Context — mshipping

> **WAJIB DIBACA** oleh setiap AI Agent di awal sesi. WAJIB DIUPDATE di akhir sesi sebelum percakapan ditutup.
> File ini adalah **satu-satunya sumber kebenaran** tentang kondisi pekerjaan aktual proyek saat ini.

---

## 🕐 Terakhir Diperbarui
- **Tanggal**: 2026-09-13
- **Oleh**: Antigravity (Gemini 3.8 Flash)
- **Sesi**: Perbaikan Masalah Modal Pembaruan Selalu Muncul (Constants.expoConfig Null di Production APK) & Panduan Instalasi APK

---

## 📍 Pekerjaan Terakhir Yang Dikerjakan

### Task Selesai
- [x] Perbaikan Tuntas Modal 'Pembaruan Tersedia' Selalu Muncul di Mobile App ([version.ts](file:///c:/shipping/mobile/src/config/version.ts), [updateStore.ts](file:///c:/shipping/mobile/src/stores/updateStore.ts), [UpdateModal.tsx](file:///c:/shipping/mobile/src/components/update/UpdateModal.tsx), [package.json](file:///c:/shipping/mobile/package.json)):
  - **Akar Masalah**:
    1. `Constants.expoConfig` pada build APK mandiri (*standalone export* tanpa Expo Go / expo-updates service) bernilai `null` saat runtime di perangkat.
    2. Akibatnya, `CURRENT_APP_VERSION = Constants.expoConfig?.version || '1.0.0'` secara permanen jatuh ke fallback hardcoded `'1.0.0'`.
    3. Ketika dicek dengan bytecode inspection, bundle lama tidak memuat teks versi baru sama sekali. Karena versi app selalu terbaca `'1.0.0'`, sementara backend mengembalikan `'1.0.2'` (atau `'1.0.1'`), aplikasi selalu menganggap ada pembaruan (`isNewer = true`) dan memunculkan modal terus-menerus.
    4. Selain itu, aksi `Linking.openURL` hanya mengunduh file APK ke folder Download HP tanpa otomatis memicu installer Android, sehingga pengguna perlu membuka notifikasi unduhan untuk menginstal.
  - **Solusi & Hasil**:
    1. **Single Source of Truth Versi**: Membuat `mobile/src/config/version.ts` yang mengekspor `APP_VERSION = '1.0.2'` dan `APP_VERSION_CODE = 3` yang langsung diimpor oleh `updateStore.ts` dan terkompilasi ke dalam Hermes bytecode (terverifikasi `Contains 1.0.2: True`).
    2. **Dismissed Version State**: Menambahkan logika `dismissedVersion`. Jika pengguna menutup modal dengan tombol "Nanti Saja" atau tombol silang, modal tidak akan muncul otomatis lagi di background kecuali ada versi lebih baru atau jika dicek manual via tab Profil.
    4. **Re-build & Sign**: Bundle Metro diekspor ulang (Hermes bytecode 5.3 MB), diinjeksikan ke `mshipping.apk`, di-sign dengan `release.keystore` (SHA256withRSA), dan disinkronkan ke seluruh direktori unduhan server.
    5. **Pembaruan mobile-app.md**: Menyelaraskan seluruh dokumen arsitektur, konfigurasi versi statis `version.ts`, alur `dismissedVersion`, dan prosedur instalasi sideload APK.


- [x] Penyelarasan Modul Logistik Mobile App & Manifest Batch Marking ([mobile-app.md](file:///c:/shipping/mobile-app.md), [logistics.tsx](file:///c:/shipping/mobile/app/%28tabs%29/logistics.tsx), [deliveryOrders.service.ts](file:///c:/shipping/backend/src/modules/delivery-orders/deliveryOrders.service.ts), [app-version.json](file:///c:/shipping/backend/src/config/app-version.json), [app.json](file:///c:/shipping/mobile/app.json)):
  - **Filter Moda Batch Marking**: Menambahkan tombol segmented filter moda `[ Semua ] | [ ✈️ Udara ] | [ 🚢 Laut ]` pada tab Batch Marking yang mengirimkan parameter query `listType=ALL|1|2` ke backend.
  - **Keterangan Batch**: Menggunakan kolom `fdKet` untuk keterangan batch marking.
  - **Hierarki Tanggal Batch**: Menampilkan tanggal dengan prioritas pertama yang tidak null dengan label prefix: `Exit` (`fdExitDate`), `ETA` (`fdETA`), `ETD` (`fdETD`), `Load` (`fdLoadDate`).
  - **Manifest Resi per Batch (`GET /api/marking/:id/manifest`)**: Menambahkan tautan "Lihat Data Manifest ➔" pada setiap kartu batch yang membuka Bottom Sheet Modal berisi ringkasan total resi serta daftar resi yang tergabung (no resi/terima, marking, nama customer, koli, berat, volume m³).
  - **Penyelarasan Kolom & Status Delivery Order (Surat Jalan)**:
    - Backend Prisma query `getDeliveryOrders` ditambahkan field: `fdEstimasi`, `fdSent`, `fdGiveDate`.
    - Menggunakan kolom `fdCarID` untuk armada mobil dan `fdSupir` untuk supir.
    - Logika penentuan status delivery order:
      - `Delivered` (Hijau): jika `fdSent === 1`.
      - `On Delivery` (Biru): jika tanggal hari ini $\ge$ `fdEstimasi` dan `fdSent === 0`.
      - `Scheduled / Pending` (Kuning): jika tanggal hari ini $<$ `fdEstimasi` dan `fdSent === 0` (atau belum ada tanggal estimasi).
    - Menampilkan informasi "Serah Kantor: DD-MM-YYYY" jika `fdGiveDate` terisi.
  - **Pembaruan mobile-app.md**:
    - Bagian 3.5.A (Batch Marking) dan 3.5.B (Delivery Order) diperbarui secara detail mencakup semua logika, field, dan relasi endpoint.
    - Bagian 4 (Tabel Matriks Endpoint) diperbarui mencakup `/api/marking/:id/manifest` dan parameter `listType`.
  - **Build, Sign, & Deploy APK v1.0.2**:
    - Versi dinaikkan ke `v1.0.2` (versionCode: 3) di `mobile/app.json` dan `backend/src/config/app-version.json`.
    - Bundle Metro diekspor (3.304 modul, Hermes bytecode `entry-6fe4c4a34e0adf12b6ba74a56fa3d54f.hbc`, 5.3 MB).
    - APK di-patch dan ditandatangani menggunakan `release.keystore` (dual-signing v2 + v3) via `uber-apk-signer`.
    - File APK rilis aktif (`126.893.949 bytes`) telah disinkronkan ke `frontend/dist/mshipping.apk`, `backend/public/uploads/mshipping.apk`, dan root `mshipping.apk`.
    - PM2 `ShippingApi` di-restart dan endpoint `/api/app-version/latest` terverifikasi menyajikan versi 1.0.2.


- [x] Penyelarasan Nama Field Data Shipment (`fdMarkingCode`, `fdJmlPack`, `fdSatuan`, `fdJmlBerat`) ([mobile-app.md](file:///c:/shipping/mobile-app.md), [logistics.tsx](file:///c:/shipping/mobile/app/%28tabs%29/logistics.tsx), [overview.tsx](file:///c:/shipping/mobile/app/%28tabs%29/overview.tsx)):
  - Menyelaraskan seluruh dokumentasi dan data mapping field sesuai skema aktual view SQL `vwShipment`:
    - `fdListCode` $\to$ `fdMarkingCode` (Nomor kode batch marking manifest)
    - `fdColy` $\to$ `fdJmlPack` (Jumlah koli/pack) dan `fdSatuan` (Satuan muatan kemasan: Ctn, Pcs, Koli, Roll, Zak)
    - `fdWeight` $\to$ `fdJmlBerat` (Berat timbangan gudang dalam kg)
  - Memperbarui komponen `logistics.tsx` dan `overview.tsx` agar membaca `fdMarkingCode`, `fdJmlPack`, `fdSatuan`, dan `fdJmlBerat` dengan fallback aman.
  - Re-bundle Metro (3.304 modul), patch APK, re-sign dengan `release.keystore`, dan deploy ke seluruh endpoint unduhan server.

- [x] Implementasi Penuh Fitur Auto Update Mobile App ([app-version.routes.ts](file:///c:/shipping/backend/src/modules/app-version/app-version.routes.ts), [app-version.service.ts](file:///c:/shipping/backend/src/modules/app-version/app-version.service.ts), [app-version.json](file:///c:/shipping/backend/src/config/app-version.json), [updateStore.ts](file:///c:/shipping/mobile/src/stores/updateStore.ts), [UpdateModal.tsx](file:///c:/shipping/mobile/src/components/update/UpdateModal.tsx), [profile.tsx](file:///c:/shipping/mobile/app/%28tabs%29/profile.tsx), [_layout.tsx](file:///c:/shipping/mobile/app/_layout.tsx)):
  - **Backend (`backend/`)**:
    - Berkas konfigurasi versi terpusat `backend/src/config/app-version.json` memuat `version`, `versionCode`, `minVersion`, `forceUpdate`, `downloadUrl`, `releaseNotes`, dan timestamp rilis.
    - `AppVersionService` secara dinamis mendeteksi ukuran berkas fisik APK riil (`mshipping.apk` di `uploads/` atau `frontend/dist/`) dan memformatnya (misal `121.0 MB`).
    - Endpoint publik `GET /api/app-version/latest` dan alias `/app-version/latest` terdaftar di `rootApp` & `apiApp`.
    - PM2 `ShippingApi` direload dan terverifikasi mengembalikan HTTP 200 OK via localhost maupun IP publik `36.93.22.142`.
  - **Mobile App (`mobile/`)**:
    - `updateService.ts` & `updateStore.ts` (Zustand): komparasi semantik versi (`compareVersions(v1, v2)`) dan manajemen state pembaruan.
    - `UpdateModal.tsx`: modal dialog ergonomis multi-tema (Midnight Dark / Heritage Light) menampilkan komparasi versi (`v1.0.0 ➔ v1.0.1`), ukuran file APK, daftar catatan rilis (*changelog*), tombol "Perbarui Sekarang" (memicu `Linking.openURL` ke file APK), dan link alternatif ke portal unduh QR.
    - Background check otomatis di root `_layout.tsx` saat aplikasi dibuka.
    - Tombol interaktif "Versi Aplikasi & Cek Pembaruan" di `profile.tsx` (Informasi Sistem) dengan haptic feedback dan toast status.
  - **Build & Deploy**:
    - Bundle Metro diekspor (3.304 modul, Hermes bytecode `entry-938b725d322b2cf1a4fe780e665a8dfb.hbc`, 5.3 MB).
    - APK di-patch, di-align 4096-byte zipalign, dan di-re-sign (v2 + v3) menggunakan `release.keystore` via `uber-apk-signer`.
    - APK terbaru (`126.889.853 bytes`) telah disinkronkan ke seluruh jalur unduhan (`frontend/dist/`, `backend/public/uploads/`, root).

- [x] Perbaikan Menyeluruh 'App Not Installed as Package Appears to Be Invalid' ([app.json](file:///c:/shipping/mobile/app.json), [build-apk.yml](file:///c:/shipping/.github/workflows/build-apk.yml), [release.keystore](file:///c:/shipping/mobile/keystore/release.keystore)):
  - **Akar Masalah Nyata Berdasarkan Uji Decompile**:
    1. **Target SDK 36 (Android 16 Preview / Baklava)**: React Native Gradle Plugin secara otomatis mendeteksi SDK platform tertinggi di runner CI (`android-36` preview). Android OS stabil (Android 14/13/12) menolak instalasi APK yang menargetkan preview SDK dengan error `INSTALL_PARSE_FAILED_BAD_TARGET_SDK` (*App not installed as package appears to be invalid*).
    2. **Algoritma Signature Lemah (`SHA1withRSA`)**: Keystore debug lama menggunakan algoritma usang `SHA1withRSA` yang secara ketat diblokir oleh Android 11+ PackageParser.
    3. **Ketiadaan Berkas Skema v1 (JAR)**: Beberapa installer vendor menolak APK sideload tanpa v1 (`META-INF/MSHIPPIN.RSA`).
  - **Solusi Komprehensif & Uji Lokal Terverifikasi**:
    1. **Mengunci Target SDK ke Android 14 (API 34) Stabil**: Pada `mobile/app.json`, dikonfigurasi `compileSdkVersion: 34`, `targetSdkVersion: 34`, `minSdkVersion: 24`, dan `buildToolsVersion: "34.0.0"`.
    2. **Keystore Rilis Modern (PKCS12 & SHA256withRSA)**: Dibuat `mobile/keystore/release.keystore` dengan sertifikat resmi 2048-bit RSA, validitas 10.000 hari (hingga 2054), ditandatangani `SHA256withRSA` tanpa peringatan keamanan.
    3. **Uji Decompile & Verifikasi Penuh (`apktool` + `uber-apk-signer`)**:
       - Berhasil membangun ulang manifest menjadi: `compileSdkVersion="34"`, `targetSdkVersion="34"`, `minSdkVersion="24"`.
       - Berhasil menandatangani dengan skema ganda lengkap (`META-INF/MSHIPPIN.SF`, `MSHIPPIN.RSA`, `MANIFEST.MF` + `APK Sig Block 42`).
       - Zipalign 4-byte dan 4096-byte verified (0 error).
       - File APK rilis terverifikasi (`129.159.514 bytes`) langsung dipasang ke seluruh link publik server.
    4. **Pembaruan Pipeline CI**: `.github/workflows/build-apk.yml` diselaraskan agar selalu menggunakan `release.keystore` dengan `apksigner` dual-signing.


- [x] Perbaikan Benturan Navigasi Bawah dengan Tombol Navigasi Android ([_layout.tsx](file:///c:/shipping/mobile/app/%28tabs%29/_layout.tsx), [overview.tsx](file:///c:/shipping/mobile/app/%28tabs%29/overview.tsx), [logistics.tsx](file:///c:/shipping/mobile/app/%28tabs%29/logistics.tsx), [finance.tsx](file:///c:/shipping/mobile/app/%28tabs%29/finance.tsx), [master.tsx](file:///c:/shipping/mobile/app/%28tabs%29/master.tsx), [profile.tsx](file:///c:/shipping/mobile/app/%28tabs%29/profile.tsx)):
  - **Akar Masalah**:
    1. Tinggi tab bar sebelumnya di-hardcode `height: 60` dan `paddingBottom: 8` di `(tabs)/_layout.tsx` tanpa memperhitungkan insets navigasi Android (`useSafeAreaInsets()`).
    2. Pada HP Android dengan navigasi 3-tombol (Back, Home, Recents) yang memakan ~48dp, tombol sistem menutupi ikon & teks tab bar aplikasi.
    3. Halaman-halaman tab mengimpor `SafeAreaView` bawaan `'react-native'` yang tidak berfungsi di Android.
  - **Perbaikan Menyeluruh**:
    1. **Dynamic Tab Bar Insets**: `(tabs)/_layout.tsx` menggunakan `useSafeAreaInsets()`. Tinggi tab bar dihitung dinamis: `tabBarHeight = 54 + bottomInset`, dengan `paddingBottom: bottomInset` (`Math.max(insets.bottom, 12)` di Android). Latar belakang tab bar menutupi area di belakang tombol sistem, sementara ikon dan label terangkat bersih di atas tombol Android.
    2. **Cross-Platform SafeAreaView**: Mengganti impor `SafeAreaView` dari `'react-native'` ke `'react-native-safe-area-context'` dengan `edges={['top']}` pada seluruh halaman tab, dan `edges={['top', 'bottom']}` pada halaman login/register.
    3. **Penyelarasan Padding Scroll & Sheet**: Menambahkan `paddingBottom: 28` pada FlatList dan `paddingBottom: 36` pada Bottom Sheet modal.
    4. **Rebuild Bundle & Re-sign**: Bundling Metro berhasil (3.301 modul), bundle diinjeksikan ke `C:\shipping\mshipping.apk` dan ditandatangani ulang dengan `release.keystore` (SHA256withRSA) serta deployed ke seluruh path unduhan web server.

- [x] Pembuatan Dokumentasi Arsitektur, Logika, & Integrasi Endpoint Mobile App ([mobile-app.md](file:///c:/shipping/mobile-app.md)):
  - Menyusun dokumentasi komprehensif seluruh halaman mobile app (`app/index.tsx`, `login.tsx`, `register.tsx`, `overview.tsx`, `logistics.tsx`, `finance.tsx`, `master.tsx`, `profile.tsx`, `BarcodeScannerModal.tsx`).
  - Merinci logika interaksi, manajemen state (Zustand + React Query), integrasi hardware (Kamera, Biometrik, Print & Share PDF, Telepon, WhatsApp), mapping struktur data visual, dan tabel matriks 11 endpoint API backend.

- [x] Perbaikan Tuntas Toast 'Network Error' & Cleartext HTTP Android pada Mobile APK ([withCleartextTraffic.js](file:///c:/shipping/mobile/plugins/withCleartextTraffic.js), [app.json](file:///c:/shipping/mobile/app.json), [build-apk.yml](file:///c:/shipping/.github/workflows/build-apk.yml)):
  - **Akar Masalah**:
    1. **Cleartext HTTP Block di Android OS**: Android 9+ secara bawaan menolak semua koneksi non-HTTPS (`http://36.93.22.142:3010`) sebelum paket keluar dari HP jika `android:usesCleartextTraffic="true"` belum terkompilasi ke dalam binary `AndroidManifest.xml`, memicu error Axios `Network Error`.
    2. Expo SDK 50+ mengabaikan `usesCleartextTraffic` di `app.json` tanpa config plugin resmi.
    3. Windows Firewall belum memiliki inbound rule untuk port 3010.
  - **Solusi & Hasil**:
    1. **Expo Config Plugin**: Dibuat `mobile/plugins/withCleartextTraffic.js` menggunakan `@expo/config-plugins` (`withAndroidManifest`) untuk menginjeksi `android:usesCleartextTraffic="true"` secara permanen ke elemen `<application>` di AndroidManifest.
    2. **Firewall Rule**: Dibuat aturan inbound `ShippingApi Port 3010` (Allow Inbound TCP 3010 Semua Profil) di Windows Defender Firewall.
    3. **APK Rilis Terverifikasi**: APK telah dibangun ulang dan ditandatangani dengan `release.keystore` (SHA256withRSA), `compileSdkVersion: 34`, `targetSdkVersion: 34`, dan terbukti memiliki string `usesCleartextTraffic` di binary AXML.
    4. **Deploy Server Selesai**: File APK rilis aktif (`129.159.514 bytes`) telah disalin ke:
       - `C:\shipping\frontend\dist\mshipping.apk` (unduh via web port 80)
       - `C:\shipping\backend\public\uploads\mshipping.apk` (unduh via mirror port 3010)
       - `C:\shipping\mshipping.apk`
    5. **Git Push**: Commit `7fbbf29` berhasil dipush ke branch `main`.
  - **Akar Masalah Gagal Login**:
    1. `mobile/src/api/client.ts` menggunakan `Platform.select({ android: 'http://10.0.2.2:3001' })` yang hanya berlaku di emulator Android lokal, sehingga saat diinstall di HP fisik memicu Network Error.
    2. URL tidak menyertakan prefix base path `/api`.
    3. Pada Android 9+ (Pie ke atas), release build secara default memblokir cleartext HTTP traffic (`http://`) tanpa izin eksplisit di AndroidManifest.
  - **Perbaikan**:
    1. Mengubah `DEFAULT_API_URL` menjadi `http://36.93.22.142:3010/api` secara permanen.
    2. Menambahkan `package: "com.mshipping.mobile"`, `usesCleartextTraffic: true`, serta izin `INTERNET` dan `ACCESS_NETWORK_STATE` pada `mobile/app.json`.
    3. Meningkatkan penanganan pesan error di `login.tsx` agar menampilkan pesan detail dari server / koneksi secara presisi.
    4. Menampilkan indikator host server aktif di `profile.tsx`.
    5. Menambahkan `*.apk` pada `.gitignore` root.
  - **Verifikasi**:
    - `bun run tsc --noEmit` lulus 100% (0 errors).
    - `bunx expo config --type public` tervalidasi sukses dengan `usesCleartextTraffic: true`.
    - `bunx expo export --platform android` sukses membundel 3.301 modul.
    - Uji coba login langsung via HTTP POST ke backend `http://36.93.22.142:3010/api/auth/login` berhasil `HTTP 200 OK`.

- [x] Implementasi Penuh Expo Mobile App ([mobile/](file:///c:/shipping/mobile/), [walkthrough.md](file:///C:/Users/Administrator/.gemini/antigravity/brain/216aaf69-6285-4be2-afee-3555b5744e2f/walkthrough.md), [implementation_plan.md](file:///C:/Users/Administrator/.gemini/antigravity/brain/216aaf69-6285-4be2-afee-3555b5744e2f/implementation_plan.md)):
  - **Inisialisasi & Setup**: Expo SDK 57 + Expo Router v4 + React 19.2 + TypeScript 6.0 di folder `mobile/`.
  - **Theme & Desain Sistem**: Token warna resmi mshipping (Midnight Dark `#0B0F17` & Heritage Light `#F7F5F2`), switch dinamis di Zustand `themeStore`.
  - **Autentikasi & Biometrik**:
    - [login.tsx](file:///c:/shipping/mobile/app/%28auth%29/login.tsx): Form login + tombol biometrik FaceID / Fingerprint via `expo-local-authentication` & token tersimpan di `expo-secure-store`.
    - [register.tsx](file:///c:/shipping/mobile/app/%28auth%29/register.tsx): Form pendaftaran akun baru.
  - **Modul Utama (5 Bottom Tabs)**:
    - [overview.tsx](file:///c:/shipping/mobile/app/%28tabs%29/overview.tsx): 5 kartu KPI eksekutif, switcher moda Udara/Laut, quick action grid, dan barcode scanner.
    - [logistics.tsx](file:///c:/shipping/mobile/app/%28tabs%29/logistics.tsx): Segmented tabs (Daftar Resi, Batch Marking, Surat Jalan), pemindai barcode kamera (`expo-camera`), dan bottom sheet rincian dimensi fisik.
    - [finance.tsx](file:///c:/shipping/mobile/app/%28tabs%29/finance.tsx): Daftar invoice, status audit validasi, kalkulator tarif lapangan interaktif, dan cetak/bagikan PDF invoice via `expo-print` + `expo-sharing`.
    - [master.tsx](file:///c:/shipping/mobile/app/%28tabs%29/master.tsx): Direktori customer master dengan aksi 1-ketukan panggilan telepon (`tel:`) dan chat WhatsApp (`wa.me/`).
    - [profile.tsx](file:///c:/shipping/mobile/app/%28tabs%29/profile.tsx): Pengaturan akun, toggle biometrik, switcher tema Midnight/Heritage, bahasa bilingual (ID/EN), status server ERP, dan logout.
  - **Download APK & Akses Publik IP**:
    - File APK fisik (123.63 MB) berhasil diunduh dari GitHub Actions Artifact (`run 34681198544`) dan ditempatkan di `C:\shipping\frontend\dist\mshipping.apk`, `C:\shipping\backend\public\uploads\mshipping.apk`, dan root `C:\shipping\mshipping.apk`.
    - Pengujian HTTP Response: `http://36.93.22.142/mshipping/mshipping.apk` mengembalikan **HTTP 200 OK** (`Content-Type: application/vnd.android.package-archive`, ukuran 129.637.851 bytes).
    - Landing page publik dengan QR Code scan aktif di: `http://36.93.22.142/mshipping/download/`.
    - Mirror API download aktif di: `http://36.93.22.142:3010/download/apk`.
  - **Komponen UI**: Button + haptics (`expo-haptics`), Card, Badge outline semantik, SearchBar + scan, SegmentedControl, SkeletonShimmer, ToastContainer.
  - **Verifikasi**:
    - `bun run tsc --noEmit` lulus 100% (0 errors).
    - `bunx expo config` tervalidasi sukses.
    - `bunx expo export --platform android` sukses mem-bundle 3.301 modul.
- [x] Penambahan Grafik Distribusi Tipe Komoditas (Udara & Laut) & Pembersihan Card KPI ([DashboardPage.tsx](file:///c:/shipping/frontend/src/features/shipments/pages/DashboardPage.tsx), [CommodityDistributionCard.tsx](file:///c:/shipping/frontend/src/features/shipments/components/CommodityDistributionCard.tsx), [shipments.service.ts](file:///c:/shipping/backend/src/modules/shipments/shipments.service.ts), [shipments.types.ts](file:///c:/shipping/backend/src/modules/shipments/shipments.types.ts)):
  - **Kebutuhan User**:
    1. Tambahkan grafik tipe komoditas pada shipment dashboard, pisahkan antara moda laut dan udara.
    2. Pada card lain (card KPI), hapus teks `Air` dan `Sea`, cukup gunakan icon saja (`Plane` & `Ship`).
  - **Backend (`shipments.service.ts`, `shipments.types.ts`)**:
    - Menambahkan `ShipmentCommodityMetric` dan `ShipmentCommoditiesData` pada tipe respons KPI.
    - Menambahkan query agregasi komoditas pada `getShipmentsKPIs` via `safeQuery` menggabungkan `vwShipment` dengan `tbTypeComodity` (`ON tc.fdTypeComodity = s.fdTypeComodity AND tc.fdListType = s.fdListType`), menghitung resi, koli, berat, volume, dan persentase untuk masing-masing moda udara (`fdListType = 1`) dan laut (`fdListType = 2`).
  - **Frontend (`DashboardPage.tsx`, `CommodityDistributionCard.tsx`)**:
    - **Pembersihan Teks Air/Sea pada KPI Cards**: Menghapus teks `Air` dan `Sea` (`t('shipments.air')` dan `t('shipments.sea')`) pada baris rasio KPI cards dan mode badge, sehingga hanya menampilkan icon `Plane` (sky) dan `Ship` (indigo) dengan angka dan persentase. Menghemat ruang horizontal dan tampilan jauh lebih bersih.
    - **Grafik Komoditas ([CommodityDistributionCard.tsx](file:///c:/shipping/frontend/src/features/shipments/components/CommodityDistributionCard.tsx))**:
      - Menggunakan Recharts horizontal `BarChart` (`layout="vertical"`) yang responsif dan ramah dark mode.
      - Panel terpisah antara **Moda Laut (Sea)** (palet indigo) dan **Moda Udara (Air)** (palet sky).
      - Menampilkan peringkat komoditas teratas (UMUM, LARTAS, GENERAL, BRANDED, FOOD, GARMENT, dsb.).
      - Switcher metrik interaktif: **Total Resi**, **Total Koli**, **Kg (Berat)**, dan **M³ (Volume)**.
      - Mini-cards breakdown ranking di bawah chart dengan persentase dan nilai metrik.
      - Menyesuaikan mode tampilan: jika mode `all` tampil 2 kolom berdampingan; jika mode `air` atau `sea` tampil panel fokus satu kolom penuh.
    - **i18n**: Menambahkan kamus terjemahan bilingual di `id.json` dan `en.json`.
  - **Verifikasi**:
    - Backend PM2 `ShippingApi` direstart dan online.
    - Uji coba langsung eksekusi query komoditas di backend sukses.
    - Frontend build (`tsc -b && vite build`) lulus 100% tanpa error.
- [x] Penerapan Hirarki M3 pada Validasi Compare M3 vs KG / Type 2 ([billing-validation.service.ts](file:///c:/shipping/backend/src/modules/billing/billing-validation.service.ts), [Type2ComparisonPanel.tsx](file:///c:/shipping/frontend/src/features/billing/components/Type2ComparisonPanel.tsx)):
  - **Kebutuhan User**: `m3 hirarkinya -> m3 komplain, m3 gudang, m3pl -> apabila bill gabung pakai m3 per marking`.
  - **Akar Masalah Sebelumnya**: Pada invoice `GZS-010257-09-2026` (dan Type 2 lainnya), `getType2ComparisonCheck` langsung mengambil nilai mentah dari `tbEntryList.fdM3` (`13.41` / `13,4100 M3`, data input awal PL) tanpa melewati hirarki operasional M3. Akibatnya nilai ideal dihitung $13.41 \times 5.500.000 = 73.755.000$, padahal invoice ditagihkan $13.2768 \times 5.500.000 = 73.022.400$ (sesuai ukuran fisik gudang riil `fdM3Gudang`), sehingga salah memicu status `UNDERCHARGE` (-Rp 732.600).
  - **Perbaikan**:
    1. **Backend (`billing-validation.service.ts`)**:
       - Mengintegrasikan `evaluateM3Check` ke dalam `getType2ComparisonCheck`.
       - Menerapkan hirarki resmi M3:
         - **Single Bill**: `Komplain` (`fdM3Komplain`) $\to$ `Gudang` (`fdM3Gudang`) $\to$ `PL` (`m3PackingList` / `fdM3`).
         - **Bill Gabung** (`isGabungan`): `Komplain (Marking)` $\to$ `Gudang (Marking)` (`m3CustPerMarking`) $\to$ `PL (Marking)` (`m3PLPerMarking`).
       - Menyelaraskan hirarki KG untuk bill gabungan agar menggunakan `totalBeratPerMarking` / `totalJmlBeratSJ`.
       - Menyediakan field metadata `m3Source` dan `isGabungan` pada item dan respons agregat.
    2. **Frontend (`Type2ComparisonPanel.tsx`)**:
       - Menampilkan sumber M3 (`m3Source`, misal: `Gudang`, `Gudang (Marking)`, `Komplain`) pada kartu Total Volume dan baris tabel item di bawah kolom M3.
    3. **Hasil pada invoice `GZS-010257-09-2026`**:
       - Total Volume berubah dari `13,4100 M3` menjadi `13,2768 M3` (sumber: `Gudang`).
       - Nilai M3 Ideal = Rp 73.022.400, Tagihan Aktual = Rp 73.022.400, Selisih = Rp 0, Status = **`EQUAL` (SESUAI)**.
    4. **Hasil pada invoice `GZS-010238-09-2026` (Bill Gabung)**:
       - Total Volume = `14,8387 M3` (sumber: `Gudang (Marking)`).
       - Total Berat = `2.030 KG` (sumber: `Marking`).
       - Selisih = Rp 0, Status = **`EQUAL` (SESUAI)**.
  - **Verifikasi**:
    - Backend PM2 `ShippingApi` direstart dan online.
    - `bun run build` frontend sukses 100% tanpa error (3.45s).
- [x] Perbaikan Validasi Card Overweight pada Bill Gabungan ([useBillingValidation.ts](file:///c:/shipping/frontend/src/features/billing/hooks/useBillingValidation.ts), [BillingValidationCard.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationCard.tsx), [BillingValidationSummaryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationSummaryModal.tsx)):
  - **Akar Masalah**: Pada invoice bill gabungan (seperti `GZS-010238-09-2026`), `beratList` sebelumnya mengambil `fdBeratList` (510 kg) yang hanya merepresentasikan satu resi tunggal dari marking. Sementara `beratSJ` menggunakan `totalJmlBeratSJ` (2,030 kg). Akibatnya sistem salah mendeteksi ketidaksesuaian berat fisik (`hasWeightMismatch = true`), menampilkan badge peringatan "Selisih" dan "Selisih Berat", serta memicu prioritas tab beralih ke overweight padahal tagihan sebenarnya tidak mengalami selisih.
  - **Perbaikan**:
    1. **Single Source of Truth (`useBillingValidation.ts`)**:
       - Bila `isGabungan = true`, `beratList` menggunakan `res?.totalBeratPerMarking` (2,030 kg) jika tersedia, sehingga sebanding *apples-to-apples* dengan `res?.totalJmlBeratSJ` (2,030 kg).
       - Label sumber berat otomatis menyesuaikan: "Berat List (Marking)" dan "Berat SJ (Marking)".
       - Mengekspos `beratMarking` pada interface `BillingValidationState`.
    2. **Komponen Card (`BillingValidationCard.tsx` & `BillingValidationSummaryModal.tsx`)**:
       - Label rincian fisik menyesuaikan konteks: `Entry List (Marking)` dan `Surat Jalan (Marking)`.
       - Menyelaraskan kartu metrik ketika muatan aman (tidak overweight): menampilkan label "Sisa Kuota Berat" beserta nilai sisa kuota aman (`Math.max(0, maxAllowedWeight - actualWeightKg)`).
       - `hasWeightMismatch` dan `hasOverweightIssue` menjadi bersih (`false`) untuk tagihan gabungan yang konsisten, badge tab menjadi `✓ Aman`.
  - **Verifikasi**:
    - `bun run build` di `frontend/` sukses 100% tanpa error.
- [x] Redesign KPI Cards Shipment Dashboard agar Bersih, Lapang, dan Elegan ([DashboardPage.tsx](file:///c:/shipping/frontend/src/features/shipments/pages/DashboardPage.tsx)):
  - **Masalah Sebelumnya**: Card tampak terlalu padat dan berantakan karena menumpuk icon watermark besar, kotak-kotak beranak (nested colored boxes), font berbeda-beda tingkat, serta border bertumpuk dalam kartu sempit.
  - **Pembaruan Desain**:
    1. **Pembersihan Visual Noise**:
       - Menghapus icon watermark raksasa di latar belakang yang mengotori kontras teks.
       - Menghilangkan kotak tebal `bg-sky-500/10` / `bg-indigo-500/10` yang memenuhi kartu.
    2. **Segmented Mode Switcher (All / Air / Sea)**:
       - Menambahkan switcher pill di samping header: `[ Semua Moda ]` | `[ ✈️ Udara ]` | `[ 🚢 Laut ]`.
       - Mode `all`: Angka total all-time + visual ratio bar + rincian udara & laut + MoM.
       - Mode `air` / `sea`: Kartu memfokuskan data pada moda yang dipilih dengan tren MoM spesifik moda tersebut.
    3. **Visual Ratio Bar Tipis**:
       - Menggantikan kotak-kotak tebal dengan bar rasio proporsional setinggi 1.5 (6px) rounded-full (sky untuk Udara, indigo untuk Laut) dilengkapi legend persentase dan angka kompak satu baris.
    4. **Hierarki MoM Tenang**:
       - Footer MoM bulan ini vs bulan lalu dirapikan dengan warna sekunder yang lembut tanpa menabrak angka utama.
  - **Verifikasi**:
    - Frontend build (`tsc -b && vite build`) lulus 100% tanpa error (2.97s).
- [x] Penambahan Card Customer Aktif & Pemisahan Udara/Laut (`fdListType`) pada Seluruh Card KPI Shipment Dashboard ([shipments.service.ts](file:///c:/shipping/backend/src/modules/shipments/shipments.service.ts), [shipments.types.ts](file:///c:/shipping/backend/src/modules/shipments/shipments.types.ts), [DashboardPage.tsx](file:///c:/shipping/frontend/src/features/shipments/pages/DashboardPage.tsx)):
  - **Kebutuhan**:
    1. Menambahkan kartu KPI baru untuk "Customer Aktif" (`COUNT(DISTINCT fdCustName)`).
    2. Pada seluruh kartu KPI (Total Resi, Total Koli, Total Berat, Total Volume, dan Customer Aktif), memisahkan data berdasarkan `fdListType`: `1 = Udara`, `2 = Laut`.
  - **Backend**:
    - [shipments.types.ts](file:///c:/shipping/backend/src/modules/shipments/shipments.types.ts): Menambahkan `ShipmentTypeBreakdown` (`udara`, `laut`), field `totalCust`, breakdown per-tipe di `ShipmentsKPIResponse` dan `ShipmentPeriodMetrics`, serta perbandingan trend `comparison.cust`.
    - [shipments.service.ts](file:///c:/shipping/backend/src/modules/shipments/shipments.service.ts):
      - Menghitung breakdown Udara vs Laut secara agregat SQL Server:
        - `resiUdara` (`fdListType = 1`) & `resiLaut` (`fdListType = 2`)
        - `packagesUdara` & `packagesLaut`
        - `beratUdara` & `beratLaut`
        - `volumeUdara` & `volumeLaut`
        - `custUdara` & `custLaut` (`COUNT(DISTINCT CASE WHEN fdListType = ... THEN fdCustName END)`)
      - Ekstraksi helper `extractPeriodData()` untuk All-Time, Bulan Ini, dan Bulan Lalu.
  - **Frontend**:
    - [shipments.types.ts](file:///c:/shipping/frontend/src/features/shipments/types/shipments.types.ts): Sinkronisasi tipe `ShipmentKpis` dengan `totalCust`, breakdown udara/laut, dan trend perbandingan.
    - [DashboardPage.tsx](file:///c:/shipping/frontend/src/features/shipments/pages/DashboardPage.tsx):
      - Menampilkan 5 kartu KPI responsif (`xl:grid-cols-5`):
        1. **Total Resi**: Breakdown Udara & Laut, MoM comparison.
        2. **Total Koli**: Breakdown Udara & Laut, MoM comparison.
        3. **Total Berat**: Breakdown Udara & Laut, MoM comparison.
        4. **Total Volume**: Breakdown Udara & Laut, MoM comparison.
        5. **Customer Aktif**: Icon `Users`, breakdown customer aktif Udara vs Laut, MoM comparison.
      - Setiap kartu dilengkapi badge icon `Plane` (Udara) & `Ship` (Laut) dengan palet warna semantik (sky/indigo) outline transparan yang ramah dark mode.
    - [id.json](file:///c:/shipping/frontend/src/lib/i18n/id.json) & [en.json](file:///c:/shipping/frontend/src/lib/i18n/en.json): Menambahkan key `activeCustomers`, `air`, dan `sea`.
  - **Verifikasi**:
    - Backend PM2 `ShippingApi` berhasil direload.
    - Frontend build (`tsc -b && vite build`) lulus 100% tanpa error (2.42s).
- [x] Validasi Perbedaan Berat Fisik (List vs Surat Jalan vs Komplain) pada Sistem Validasi Billing ([m3-check.service.ts](file:///c:/shipping/backend/src/modules/m3-check/m3-check.service.ts), [useBillingValidation.ts](file:///c:/shipping/frontend/src/features/billing/hooks/useBillingValidation.ts), [useOverweightValidation.ts](file:///c:/shipping/frontend/src/features/billing/hooks/useOverweightValidation.ts), [BillingValidationSummaryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationSummaryModal.tsx), [BillingValidationCard.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationCard.tsx)):
  - **Kebutuhan**: Memeriksa konsistensi 3 sumber data berat fisik:
    1. `Berat List` (`tbEntryList.fdJmlBerat` / `fdBeratList`)
    2. `Berat Surat Jalan` (`tbDelivery.fdJmlBeratSJ` untuk bill reguler, atau `totalJmlBeratSJ` untuk gabungan)
    3. `Berat Komplain` (`tbEntryListKomplain.fdJmlBeratKomplain`)
  - **Backend**:
    - [m3-check.types.ts](file:///c:/shipping/backend/src/modules/m3-check/m3-check.types.ts): Menambahkan `fdBeratSJ: number | null` pada interface `UnifiedM3CheckResult`.
    - [m3-check.service.ts](file:///c:/shipping/backend/src/modules/m3-check/m3-check.service.ts): Menambahkan query paralel `get_berat_delivery_sj` ke `tbDelivery` (berdasarkan `fdListCode` tunggal) dan mempopulasikan `fdBeratSJ`.
  - **Frontend Core Hooks**:
    - [useBillingValidation.ts](file:///c:/shipping/frontend/src/features/billing/hooks/useBillingValidation.ts):
      - Menambahkan kalkulasi `hasWeightMismatch` (threshold selisih > 0.1 kg antar sumber berat yang aktif).
      - Menambahkan flag per-sumber: `isWeightListDiff`, `isWeightSJDiff`, `isWeightKomplainDiff`.
      - Menghubungkan ke `isPhysicalValid`: `isPhysicalValid = isPhysicalValid && !hasWeightMismatch`.
      - Mendaftarkan issue ke `validationIssues` dan tab auto-select saat ada selisih berat.
    - [useOverweightValidation.ts](file:///c:/shipping/frontend/src/features/billing/hooks/useOverweightValidation.ts):
      - Mendukung `fdBeratSJ` pada bill reguler (`komplain > sjList > gudang > list`).
  - **Frontend UI & Visual Badges**:
    - [BillingValidationSummaryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationSummaryModal.tsx):
      - Menambahkan banner status "Kesesuaian Berat Fisik" di Tab M3 & Berat (Badge `✓ Cocok` jika konsisten, `⚠ Terdapat Selisih Berat Fisik` jika mismatch).
      - Menambahkan 3 kartu ringkasan berat fisik (`Berat List`, `Berat Surat Jalan`, `Berat Komplain`) dengan indikator status selisih individual.
      - Menghubungkan selisih berat ke daftar diskrepansi modal (`discrepancyDetails`) dan verdict status.
    - [BillingValidationCard.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationCard.tsx):
      - Integrasi badge berat surat jalan pada mode UDARA & LAUT.
      - Menambahkan Weight Mismatch Alert banner pada kartu validasi.
  - **Kamus Terjemahan Dual-Bahasa**:
    - Menambahkan key di `id.json` & `en.json`: `weightMatch`, `weightMismatch`, `weightDiff`, `weightList`, `weightSJ`, `weightKomplain`, `weightConsistency`.
  - **Verifikasi**:
    - Build frontend (`tsc -b && vite build`) lulus 100% tanpa error (exit code 0).
    - PM2 backend instance 2 (`ShippingApi`) sukses direstart dan online.
- [x] Implementasi Skeleton Shimmer Loading State pada Tombol Pairing Local Charge ([PairingLocalChargePage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/PairingLocalChargePage.tsx)):
  - **Kebutuhan**: Menampilkan animasi skeleton shimmer saat tombol pairing diklik (baik upload file Excel maupun input manual no. resi), menggantikan empty state atau data lama selama proses kalkulasi dan pencocokan data ke backend.
  - **Komponen Skeleton Shimmer (`PairingLocalChargeSkeleton`)**:
    - **Status Banner**: Banner info proses dengan spinning icon `RefreshCw`, teks panduan pencocokan data, dan progress shimmer bar.
    - **7 Kartu KPI Metrik**: Wireframe skeleton untuk 7 kartu ringkasan status (`Total Baris`, `Cocok`, `Selisih`, `Bill Belum Ada`, `Belum Exit`, `Sudah Exit`, `Tidak Ditemukan`).
    - **Toolbar**: Skeleton bar pencarian dan counter jumlah baris.
    - **Tabel Spreadsheet 12-Kolom Presisi**: Menampilkan header kolom spreadsheet penuh (`#`, `Date`, `Receipt No`, `Customer`, `From`, `Ctn`, `Kg`, `Cbm`, `Charge`, `Shipping Mark`, `Inv No`, `Validation`) dengan 8 baris shimmer sel terdistribusi rata kanan/kiri sesuai tipe datanya, sehingga transisi ke data riil bebas pergeseran layout (*zero layout shift*).
  - **Dukungan Multi-Tema & Mode Gelap**: Menggunakan class `.skeleton-shimmer` bawaan yang dinamis dan ergonomis di seluruh tema (Heritage, Ocean, Emerald, Amber, Midnight).
  - **Kamus Terjemahan**: Menambahkan key `skeletonTitle` dan `skeletonSubtitle` di `id.json` & `en.json`.
  - **Verifikasi**: Build frontend (`tsc -b && vite build`) sukses 100% (2.93s).
- [x] Perbaikan Presisi Layout PDF Bill Sesuai Gambar Referensi ([PrintPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/PrintPage.tsx) & [ReportDesignerPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/ReportDesignerPage.tsx)):
  - **Single Line Description Clipping (Gambar 1)**:
    - Sesuai tampilan asli FoxPro pada gambar 1 (`media_1789097989970.png`), teks deskripsi menggunakan `white-space: nowrap; overflow: hidden; text-overflow: clip;` dengan tinggi baris konsisten single-line.
    - Mencegah teks panjang menimpa/menabrak kolom `UNIT PRICE`. Teks terpotong bersih sebelum garis pembatas kolom (seperti `PARCELS TO JAKARTA (M3) - DOOR LATCH, HINGE,`).
  - **Terbilang Dipindahkan ke Kolom Description (Gambar 2, Panah 1)**:
    - Sesuai arahan panah merah pada gambar 2 (`media_1789098021202.png`) dan koordinat FoxPro (`x = 111.75`), label `Terbilang` dan kalimat terbilang ditempatkan bersama di dalam **Kolom 2 (`DESCRIPTION`)** dengan layout flex (`gap: 16px`), sedangkan Kolom 1 (`QTY`) dibiarkan kosong (`<td>&nbsp;</td>`).
  - **Penataan Posisi `Printed by :Ferly` (Gambar 2, Panah 2)**:
    - Sesuai arahan panah merah pada gambar 2 (`media_1789098021202.png`), posisi `Printed by :Ferly` disesuaikan agar sejajar di bawah kolom `AMOUNT` dan kotak total nilai tagihan (`padding-right: 5.5mm; font-size: 5.5pt; font-family: Arial`), tidak lagi menempel di tepi paling kanan kertas.
  - **Verifikasi**: Build frontend (`tsc -b && vite build`) sukses 100% (2.89s).
- [x] Validasi Status `BELUM_EXIT` Berdasarkan `tbMarking.fdExitDate` pada Pairing Local Charge ([pairing-local-charge.service.ts](file:///c:/shipping/backend/src/modules/billing/pairing-local-charge.service.ts)):
  - **Kebutuhan**: Pada Pairing Local Charge, periksa `fdMarkingCode` pada `tbMarking`. Apabila belum ada `fdExitDate`, status validasi menjadi **`BELUM_EXIT`** (bukan "Sudah Exit (-)" atau "Bill Belum Dibuat").
  - **Penerapan**:
    - Query `tbMarking` dan `tbDelivery` kini mengambil seluruh kode marking dari `entriesList` (`fdMarkingCode`, `fdMarkingCodeAsal`) maupun dari kolom Excel / parser.
    - Menambahkan helper `resolveOperationalStatus(code, markingMap, deliveriesList)`: mengecek `Boolean(m.fdExitDate)`. Jika null, prefix status menjadi `Belum Exit (ETA: ...)`.
- [x] Perbaikan Validasi Berat & Overweight pada Bill Reguler ([useOverweightValidation.ts](file:///c:/shipping/frontend/src/features/billing/hooks/useOverweightValidation.ts), [useBillingValidation.ts](file:///c:/shipping/frontend/src/features/billing/hooks/useBillingValidation.ts), [BillingValidationSummaryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationSummaryModal.tsx)):
  - **Penyebab Masalah**:
    - SP `get_m3_listcode` mengembalikan kolom `TotalJmlBeratSJ` yang merupakan akumulasi seluruh berat dalam satu marking (misal 496 kg untuk 4 entry list).
    - Pada invoice **Bill Reguler** (single listcode seperti `GZS-010250-09-2026`), evaluasi berat sebelumnya memakai `totalJmlBeratSJ` (496 kg) menggantikan berat listcode riil (`fdJmlBeratGudang` / `fdBeratList` = 175 kg).
    - Akibatnya timbul false positive muatan overweight (+166.58 kg), `isPhysicalValid` menjadi `false`, dan verdict modal turun ke peringatan overcharge/overweight.
  - **Perbaikan**:
    - Pada [useOverweightValidation.ts](file:///c:/shipping/frontend/src/features/billing/hooks/useOverweightValidation.ts): Jika `isGabungan = true`, gunakan `komplain > perMarking > sj`. Jika `isGabungan = false` (Bill Reguler), gunakan berat listcode tunggal: `komplain > gudang > list`.
    - Pada [useBillingValidation.ts](file:///c:/shipping/frontend/src/features/billing/hooks/useBillingValidation.ts): `airCandidates` hanya menyertakan `beratSJ` jika `isGabungan = true`.
    - Pada [BillingValidationSummaryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationSummaryModal.tsx): Validasi kecocokan berat gudang per marking hanya aktif saat `isGabungan = true`.
  - **Verifikasi**: Build frontend `tsc -b && vite build` sukses 100% (code 0).
- [x] Pengecekan Menyeluruh & Penyelarasan Skala Font & Spacing UI:
  - **Kebutuhan**: Menyelaraskan seluruh modal, toolbar filter, kartu metrik KPI, tabel data ERP, dan footer di seluruh modul aplikasi sesuai standar hierarki visual:
    1. **Header Modal**: Judul modal `15px font-bold font-[var(--font-label)] uppercase tracking-wide`, Subtitle `12px`, Chip counter `11px`.
    2. **Tab & Toolbar**: Tombol tab & search input `12px` (padding kompak `5px 10px` / `px-2.5 py-1.25`), Segmented buttons `11.5px`, Context bar `11.5px`.
    3. **Kartu Metrik KPI**: Angka KPI utama `18px font-bold tabular-nums`, Label KPI `10.5px uppercase tracking-wider font-semibold`, Footer/Unit `11px – 11.5px`.
    4. **Tabel Data**: Header kolom (`thead th`) `11px uppercase tracking-wider font-semibold` (padding `8px 12px` / `py-2 px-3`), Baris data (`tbody td`) `12px` (meta teks `11px`), Footer tabel (`tfoot td`) `12px font-bold`.
    5. **Footer Bar**: Keterangan ringkasan `12px`, Tombol Tutup/Aksi `12px font-semibold` (`px-4 py-1.5`).
  - **Komponen yang Disesuaikan**:
    - [BillResiMarkingModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillResiMarkingModal.tsx)
    - [TargetPriceCheckModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/TargetPriceCheckModal.tsx)
    - [CustomerBillingHistoryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustomerBillingHistoryModal.tsx)
    - [CustomerTariffAuditModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustomerTariffAuditModal.tsx)
    - [PriceListDetailModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/PriceListDetailModal.tsx)
    - [BatchDetailModal.tsx](file:///c:/shipping/frontend/src/features/shipment-batches/components/BatchDetailModal.tsx)
    - [ShipmentDetailModal.tsx](file:///c:/shipping/frontend/src/features/shipments/components/ShipmentDetailModal.tsx)
    - [CustomerDetailModal.tsx](file:///c:/shipping/frontend/src/features/customers/components/CustomerDetailModal.tsx)
    - [ConfirmModal.tsx](file:///c:/shipping/frontend/src/components/ui/ConfirmModal.tsx)
    - [CustMarkingDetailModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustMarkingDetailModal.tsx)
    - [BillingValidationSummaryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationSummaryModal.tsx)
  - **Verifikasi**: Build frontend (`tsc -b && vite build`) lulus 100% tanpa error (exit code 0).
- [x] Perbaikan Layout Cetak PDF Invoice ([PrintPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/PrintPage.tsx) & [billing.service.ts](file:///c:/shipping/backend/src/modules/billing/billing.service.ts)):
  - **Rata Vertikal Teks & Data Header**:
    - Menyelaraskan teks label dan nilainya pada `BILL NO`, `DATE`, `SALES`, dan `COLLECTOR` agar rata tengah secara vertikal (`display: flex; align-items: center; line-height: 1`).
  - **Perbaikan Deskripsi Terpotong**:
    - Memperbaiki clipping teks pada kolom Description tabel invoice dengan mengubah styling `.cell-desc`, `.split-desc`, dan `.desc-text` menjadi `overflow: visible; line-height: 1.4; padding: 3.5px 6px 3.5px 8px; padding-bottom: 2px` sehingga descender huruf tidak terpotong saat rendering cetak/PDF.
  - **Penataan "Printed by"**:
    - Dibuat rapat dengan garis di atasnya (`margin-top: 0px; padding-top: 0px`).
    - Menggunakan font `Arial Narrow`, ukuran `5pt`, style `Normal` (`font-style: normal; font-weight: normal`).
  - **Lookup Sales Data dari `tbSales`**:
    - Backend `getBillingById` di [billing.service.ts](file:///c:/shipping/backend/src/modules/billing/billing.service.ts) melakukan lookup ke `tbSales` on `LTRIM(RTRIM(c.fdSalesNM)) = LTRIM(RTRIM(s.fdSalesNM))` untuk menarik `fdSalesCode`.
    - Frontend [PrintPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/PrintPage.tsx) memprioritaskan `data.customer?.fdSalesCode` (fallback ke `fdSalesNM`).
  - **Verifikasi**: PM2 backend online dan frontend build (`tsc -b && vite build`) lulus 100% tanpa error.
- [x] Penambahan Tab Form Input Manual No. Resi (Multi) pada Pairing Local Charge:
  - **Kebutuhan**: Menyediakan alternatif pencarian/pairing data selain unggah file Excel, berupa tab switcher yang memuat form textarea untuk input banyak nomor resi sekaligus (newline, koma, titik koma, spasi).
  - **Backend**:
    - Method `processPairingByReceiptNos(rawReceiptInput)` di [pairing-local-charge.service.ts](file:///c:/shipping/backend/src/modules/billing/pairing-local-charge.service.ts): Token parsing, auto-split nomor resi koma (`HK260703-014,5`), batch query sargable index ke `tbEntryList`, `tbCustomers` (SSOT nama customer), `tbBilling`, `tbBillingDetail`, serta status operasional tracking (`tbMarking` + `tbDelivery`).
    - Endpoint `POST /api/billing/pairing-local-charge/by-receipts` di [billing.routes.ts](file:///c:/shipping/backend/src/modules/billing/billing.routes.ts).
  - **Frontend**:
    - Service `billingApi.pairingLocalChargeByReceipts` di [billing.service.ts](file:///c:/shipping/frontend/src/features/billing/services/billing.service.ts).
    - Tab Switcher di [PairingLocalChargePage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/PairingLocalChargePage.tsx):
      - Tab 1: `Upload File Excel` (drag & drop dropzone yang sudah ada).
      - Tab 2: `Input Manual No. Resi` (textarea multi resi dengan counter resi otomatis, tombol Tempel Contoh, tombol Bersihkan, dan tombol Proses Pairing Resi).
    - Desain sesuai Midnight dark mode (`bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)]`).
    - Kamus i18n dual-bahasa di `id.json` dan `en.json`.
  - **Verifikasi**:
    - Build frontend (`tsc -b && vite build`) sukses 100% (code 0).
    - PM2 Backend instance 2 (`ShippingApi`) sukses direstart dan berstatus online.
- [x] Penegakan Single Source of Truth Master Customer (`tbCustomers.fdCustName`):
  - **Penyebab**: SP `dbo.get_qr_tbm3_perMarking_plus_rasio` melakukan `LEFT JOIN tbCustomersHarga` sehingga nama yang ditarik adalah salinan dari `tbCustomersHarga` (misal `HSK/WK` alih-alih `HSG/WK`).
  - **Solusi Backend**: Di [m3-check.service.ts](file:///c:/shipping/backend/src/modules/m3-check/m3-check.service.ts), `getM3CustPerMarkingDetails` kini selalu menimpa `fdCustName` dengan nama resmi dari master `tbCustomers`.
  - **Solusi Frontend**:
    - [CustMarkingDetailModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustMarkingDetailModal.tsx): Menambahkan prop `custName` dan memprioritaskannya di atas data row.
    - [BillingValidationCard.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationCard.tsx): Meneruskan `custName={res.customer?.fdCustName}` ke modal.
  - **Dokumentasi Wajib**: Menambahkan aturan permanen di [.agents/AGENTS.md](file:///c:/shipping/.agents/AGENTS.md) agar seluruh AI Agent selalu memprioritaskan `tbCustomers.fdCustName`.
  - **Verifikasi**: PM2 Backend restart sukses & build frontend (`tsc -b && vite build`) lulus 100%.
- [x] Penambahan Fitur Export Excel 2 Sheet pada [CustMarkingDetailModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustMarkingDetailModal.tsx):
  - **Sheet 1 ("Ringkasan Marking")**: Berisi seluruh baris data listcode/marking dari modal lengkap (No, No. Invoice, Tgl Inv, Cabang, No. Listcode, No. Resi, Marking, Komoditas, Mode, Qty Coly, Berat Kg, Volume M3, Rasio kg/m3, VFC, Status Overweight, Finansial).
  - **Sheet 2 ("Detail Ukuran Gudang")**: Menyesuaikan format persis seperti script FoxPro:
    - **Header Blok Item**: Baris 1: `fdCustName`, Baris 2: `fdTerima`, Baris 3: `fdMarkingCode` (Listcode), Baris 4: `fdMarkingNo` (Marking).
    - **Header Kolom**: `PJG` | `LBR` | `TNG` | `QTY` | `M3` | `DESKRIPSI`.
    - **Baris Detail**: Nilai numerik `fdPjg`, `fdLbr`, `fdTng`, `fdQty`, dan `M3 = ROUND(P * L * T * Qty / 1000000, 4)`.
    - **Baris TOTAL**: Tulisan `"TOTAL :"` di kolom QTY dan nilai `lnTotalM3` (4 digit desimal) di kolom M3.
    - **Pemisah**: Jeda 2 baris kosong antar blok item.
  - **Backend API & Service**:
    - Method `getBatchEntryListDetails(listCodes)` di [billing.service.ts](file:///c:/shipping/backend/src/modules/billing/billing.service.ts) dengan query batch ke `tbEntryListDetail`.
    - Endpoint `POST /api/billing/entry-list-details` & `GET /api/billing/entry-list-details` di [billing.routes.ts](file:///c:/shipping/backend/src/modules/billing/billing.routes.ts).
    - Service frontend `billingService.entryListDetails(listCodes)` di [billing.service.ts](file:///c:/shipping/frontend/src/features/billing/services/billing.service.ts).
  - **UI & Ekspor**:
    - Tombol "Export Excel" dengan ikon spreadsheet & loading state saat mengunduh di header modal.
    - Styling `.export-excel-btn` responsif multi-tema & Midnight dark mode (`border-emerald-500/40 text-emerald-400 bg-transparent`).
  - **Verifikasi**: PM2 Backend online dan frontend build (`tsc -b && vite build`) sukses (code 0).
- [x] Penambahan Tombol Copy No. Invoice pada [ValidationDetailPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/ValidationDetailPage.tsx):
  - Menambahkan tombol copy ikon (`Copy` / `Check`) tepat di samping nomor invoice pada top header bar.
  - Menyimpan nomor invoice (`data.fdInvNo`) ke clipboard serta memunculkan toast notifikasi sukses.
  - Verifikasi build frontend (`tsc -b && vite build`) sukses 100% tanpa error.
- [x] Perbaikan Toast Duplikat saat Klik Tombol PDF di Modal Tagihan:
  - **Penyebab**: Komponen [BillingPrintButtons.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingPrintButtons.tsx) terpasang di 2 tempat secara bersamaan (di halaman induk `ValidationDetailPage` dan di dalam `BillingValidationSummaryModal`), sehingga saat event `window.postMessage` (`BILLING_PDF_DOWNLOADED`) ditembakkan, kedua listener menangkap event tersebut dan memanggil `addToast` secara bersamaan.
  - **Solusi**:
    1. Menambahkan deduplikasi event download di [BillingPrintButtons.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingPrintButtons.tsx) via `lastDownloadToastMap`.
    2. Menambahkan deduplikasi tanda tangan pesan (`signature deduplication` < 1000ms) di level global [toastStore.ts](file:///c:/shipping/frontend/src/stores/toastStore.ts) agar notifikasi identik yang dipicu bersamaan dicegah muncul ganda.
  - Verifikasi build frontend (`tsc -b && vite build`) sukses 100% tanpa error.
- [x] Penambahan 2 Digit Desimal pada Box Total Nilai Tagihan di [BillingValidationSummaryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationSummaryModal.tsx):
  - Menggunakan formatter `formatWithCurrency(totalAmount, currency)` sehingga box **TOTAL NILAI TAGIHAN** selalu menampilkan 2 digit desimal (misal `Rp. 1,500,000.00` atau `USD 1,234.50`).
  - Verifikasi build frontend (`tsc -b && vite build`) sukses 100% tanpa error.
- [x] Penambahan Warna Border Hijau & Status Cocok pada Kartu Dimensi Tab Validasi M3 di [BillingValidationSummaryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationSummaryModal.tsx):
  - Kartu dimensi (`Ditagihkan`, `Ukuran Gudang`, `Packing List`, `Komplain Fisik`) kini otomatis memiliki border hijau tebal (`border-2 border-emerald-500/80 bg-emerald-500/5`), badge status `✓ Cocok` / `✓ Billed`, dan highlight per-marking hijau saat nilainya sesuai dengan dimensi yang ditagihkan.
  - Verifikasi build frontend (`tsc -b && vite build`) sukses 100% tanpa error.
- [x] Penambahan Data M3 per Marking pada Kartu Metrik Tab Validasi M3 di [BillingValidationSummaryModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationSummaryModal.tsx):
  - Menambahkan baris sub-value `Per Marking:` pada 3 kartu metrik dimensi di Tab "Validasi M3":
    - **Ukuran Gudang**: Menampilkan volume/berat per marking (`res.m3CustPerMarking` / `res.totalBeratPerMarking`).
    - **Packing List**: Menampilkan volume PL per marking (`res.m3PLPerMarking`).
    - **Komplain Fisik**: Menampilkan volume komplain per marking (`res.m3KomplainPerMarking`).
  - Menyelaraskan kartu **Ditagihkan** dengan sub-line satuan agar layout 4 kartu grid tetap simetris, rapi, dan konsisten.
  - Verifikasi build frontend (`tsc -b && vite build`) sukses 100% tanpa error.
- [x] Penyelarasan Skala & Ukuran Font pada [CustMarkingDetailModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustMarkingDetailModal.tsx):
  - Mengurangi ukuran font yang sebelumnya terlalu besar agar proporsional dan selaras dengan modal lain (`BillResiMarkingModal`, `TargetPriceCheckModal`, `BillingValidationSummaryModal`):
    - **Header**: Judul modal disesuaikan ke `15px / text-xs font-bold font-[var(--font-label)] uppercase tracking-wide` (sebelumnya `22px`), subtitle `12px`, chip `11px`.
    - **Tab & Filter**: Tab cabang `12px` (padding `5px 10px`), search box & input `12px`, segmented buttons `11.5px`.
    - **Kartu Metrik KPI**: Nilai angka KPI disesuaikan ke `18px font-bold` (sebelumnya `22px`), label KPI `10.5px uppercase`, unit & footer `11px-11.5px`.
    - **Tabel**: Header kolom (`thead th`) `11px uppercase tracking-wider`, isi baris data (`tbody td`) `12px` (sebelumnya `13.5px`), meta keterangan `11px`, footer tabel `12px font-bold`.
    - **Footer Modal**: Keterangan footer `12px`, tombol tutup `12px font-semibold`.
  - Verifikasi build frontend selesai tanpa error.
- [x] Perbaikan False Positive Deteksi Baterai & Pemetaan Komoditas (`tbCommodityMapping`):
  - **Penyebab**: Selain fungsi `isGenuineBattery`, terdapat aturan global di database `tbCommodityMapping` (`BATTERY -> SEMI GARMENT, BY SEA`). Pada saat pencocokan pemetaan komoditas di `billing.utils.ts`, `m3-check.service.ts`, `price-check.service.ts`, dan `commodity-mapping.service.ts`, kata `BATTERY` dari deskripsi `... BATTERY CASE` mencocokkan mapping global tersebut karena belum memiliki filter guard `isGenuineBattery`.
  - **Solusi**: Menambahkan guard `isGenuineBattery` pada seluruh alur pencocokan `tbCommodityMapping` baik di frontend (`billing.utils.ts`) maupun backend (`m3-check.service.ts`, `price-check.service.ts`, `commodity-mapping.service.ts`) agar pemetaan `BATTERY` / `SEMI GARMENT` hanya aktif jika komoditas terbukti merupakan unit baterai fisik asli.
  - **Verifikasi**: Build frontend lulus 100% tanpa galat.
- [x] Perbaikan False Positive Deteksi Baterai (`isGenuineBattery`) pada Multi-Item Komoditas:
  - **Penyebab**: Deskripsi multi-item `... MODEL, BATTERY CASE` memicu deteksi kombinasi `,\s*BATTERY` sehingga mengabaikan pengecekan kata penjelas aksesoris (`CASE`) dan salah diklasifikasikan sebagai `SEMI GARMENT`.
  - **Solusi**: Memperbaiki fungsi `isGenuineBattery` di `backend/src/modules/billing/billing-category.matcher.ts`, `frontend/src/features/billing/utils/billing.utils.ts`, dan `frontend/src/features/price-list/utils/commodityMatcher.ts` untuk memisahkan segment/token sebelum validasi murni baterai vs aksesoris (`BATTERY CASE`, `BATTERY CHARGER`, `BATTERY HOLDER`, dll).
  - **Verifikasi**: Pengujian 12 test case (termasuk string pengguna) lulus 100% dan build frontend lulus tanpa error.
- [x] Penggantian Istilah SJ menjadi Listcode pada [CustMarkingDetailModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustMarkingDetailModal.tsx):
  - Mengganti seluruh visual label dan teks `SJ` menjadi `Listcode`:
    - Header counter: `${normalizedRows.length} Listcode` / `${finalFilteredRows.length} dari ${normalizedRows.length} Listcode`.
    - Tab filter cabang: `Semua · X Listcode`, `${bg.branchCode} · X Listcode · Y kg`.
    - Search placeholder: `Cari invoice, Listcode, resi, marking, komoditas…`.
    - Context bar: counter komplain Listcode & status kelengkapan data PL Listcode.
    - KPI card label selisih: `Listcode = Gdg`.
    - Header kolom tabel: `Invoice & Listcode`, `Qty (Gdg/Listcode)`, `Berat (Gdg/Listcode)`.
    - Metadata baris tabel: `Listcode {r.listCode} · Resi {r.terima}`, `Listcode: {formatNumber(r.qtySJ)}`, `Listcode: {formatDecimal(r.weightSJ, 1)} kg`.
    - Group header cabang & Footer tabel (`tfoot` dan modal footer bar).
  - Verifikasi build (`tsc -b && vite build`) berhasil 100% tanpa error.
- [x] Penyelarasan Tema Dinamis & Font Aktif pada [CustMarkingDetailModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustMarkingDetailModal.tsx):
  - **Dukungan Multi-Tema (Heritage, Ocean, Emerald, Amber, Midnight)**:
    - Seluruh warna dan background kini dinamis membaca token CSS tema aktif: `var(--color-primary)`, `var(--color-secondary)`, `var(--color-neutral)`, `var(--color-surface)`, `var(--color-border)`, `var(--color-tertiary)`, `var(--color-success)`, `var(--color-warning)`, `var(--color-danger)`.
    - Menggunakan fungsi `color-mix` untuk background transparan semantik (kartu status ok, badge rust/warning, hover baris tabel).
    - Menghilangkan warna hex hardcoded di modal sehingga tampilan otomatis berganti tema secara konsisten saat tema diubah di UI.
  - **Penyelarasan Font Tema Aktif**:
    - Judul modal menggunakan `var(--font-display)` (`Fraunces`).
    - Body text, label, toolbar, dan deskripsi menggunakan `var(--font-body)` (`Public Sans`).
    - Angka tabular, chip count, dan metrik KPI menggunakan `var(--font-label)` (`Space Grotesk`).
  - **Kepatuhan Mode Gelap (Midnight Dark Mode)**:
    - Tab aktif, tombol footer, dan button segmented tidak lagi menggunakan latar putih solid di mode gelap, melainkan transparent outline border dengan warna aksen `var(--color-tertiary)` sesuai standar AGENTS.md.
- [x] Redesign Presisi [CustMarkingDetailModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustMarkingDetailModal.tsx) Sesuai Desain HTML Mockup:
  - **Tipografi & Desain Hangat (Warm Limestone / Paper Palette)**:
    - Font serif `Fraunces` untuk judul modal utama, `Public Sans` untuk label & teks deskriptif, dan `Space Grotesk` untuk angka tabular / metrik.
    - Sistem warna terisolasi: `--ink: #1C1B18`, `--limestone: #F6F3EC`, `--paper: #FFFFFF`, `--rust: #B5502F`, `--ok-bg: #E7EFE6`, `--warn-bg: #FBF0DD`.
  - **Header & Subtitle Dinamis**:
    - Chip counter jumlah SJ (`12 SJ` / `X dari Y SJ`) + chip rust Rasio (`Rasio 700 kg/m³`) + chip komplain.
    - Subtitle terintegrasi: `Cust · Marking · Komoditas · Mode Pengiriman`.
  - **Filter Cabang Berbasis Tab**:
    - Tab "Semua" + tombol tab per cabang aktif (`GZ · 8 SJ · 3.411 kg`, `YW · 4 SJ · 2.155 kg`) dengan kalkulasi live.
  - **4 Kartu Metrik KPI Eksekutif**:
    1. *Split Card*: Berat total kg & Qty coly + status selisih surat jalan vs gudang.
    2. *Volume Gudang*: Angka m³ gudang + footer M³ Bill.
    3. *Volume PL*: Angka m³ packing list + footer selisih Gdg–PL (highlight warna rust jika ada selisih).
    4. *Status Overweight*: Badge `status-ok` hijau (`✓ Aman` / PL delta kg) atau peringatan overweight.
  - **Context Bar Ringkas**:
    - Menggantikan badge per-baris yang berulang dengan 3 informasi ringkas: counter komplain terdata, counter SJ tanpa data PL, dan rekor selisih Gdg–PL terbesar.
  - **Tabel 6-Kolom Terkondensasi & Inline Branch Grouping**:
    - Kolom utama: `#` | `Invoice & SJ` | `Marking & Komoditas` | `Qty` | `Berat` | `Volume (Gdg / PL)`.
    - Sel volume menggabungkan `Gdg / PL` berdampingan dengan delta `+ / -` berwarna semantik hijau/rust/muted di bawahnya.
    - Baris pengelompokan cabang (`branch-group-row`) hadir inline di dalam tabel dengan pill cabang dan akumulasi berat.
    - Footer tabel (`tfoot`) dan footer modal menghitung grand total real-time sesuai pencarian dan filter aktif.
  - **Dukungan Preset Kolom**:
    - Segmented control untuk berpindah tampilan: `Semua Kolom`, `Fisik (M³/KG)`, `Komplain`, `Financial`.
- [x] Tampilan Tabel ERP Modern Lengkap (Semua Kolom) pada [CustMarkingDetailModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustMarkingDetailModal.tsx):
  - **Desain Enterprise ERP Modern (Grouped Super-Headers)**:
    - Menampilkan seluruh 28+ data dari Stored Procedure `dbo.get_qr_tbm3_perMarking_plus_rasio` secara terorganisir rapi dalam 6 kelompok super-header berjenjang:
      1. **Identitas & Pengiriman**: `#` (sticky), `No. Invoice` (sticky), `Tgl Inv`, `Cabang`, `No. SJ` (`fdListCode`), `No. Terima/Resi` (`fdTerima`), `Marking` (`fdMarkingNo`), `Komoditas & Tipe` (`fdComodity` + `fdComodityName`), `Mode` (UDARA/LAUT).
      2. **Kuantitas (Coly)**: `Gdg`, `SJ`, `PL`, `Komplain`.
      3. **Berat (KG)**: `Gdg`, `SJ`, `Komplain`, `Selisih`.
      4. **Volume (M³)**: `Gdg`, `PL`, `Komplain`, `Selisih`, `Bill`.
      5. **Rasio, VFC & Overweight**: `Rasio`, `VFC Gdg`, `VFC K`, `VFC Bill`, `Overweight`.
      6. **Finansial & Status**: `Nilai Inv`, `Tax`, `Status`, `Tipe Tagihan`.
  - **Sticky Identity Columns & Headers**:
    - Kolom `#` dan `No. Invoice` dikunci di sisi kiri (`sticky left-0` & `left-10`) dengan background solid surface dan drop-shadow pemisah sehingga identitas surat jalan tidak hilang saat scroll horizontal.
    - Super-headers dan sub-headers terkunci di bagian atas (`sticky top-0` & `top-[31px]`).
  - **Preset Kolom & Density Toggle**:
    - Pilihan Preset Cepat: `Semua Kolom`, `Fisik (M³/KG)`, `Komplain & Selisih`, `Finansial`.
    - Pilihan Kerapatan Baris: `Kompak` (High Density ERP) vs `Normal`.
  - **Grand Total Sticky Footer**:
    - Baris `tfoot` terkunci di bagian bawah menghitung total akumulasi real-time untuk seluruh kolom angka.
- [x] Restorasi & Peningkatan Visibilitas Data Komplain pada [CustMarkingDetailModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustMarkingDetailModal.tsx):
  - **Penyebab**: Pada perampingan desain sebelumnya, kolom komplain dan kartu KPI M3 Komplain terhapus dari tampilan visual modal, sehingga data komplain dari SP (`fdm3Komplain`, `fdTotalQtyKomplain`, `fdJmlBeratKomplain`) tidak muncul di layar.
  - **Fitur & Perbaikan**:
    1. **KPI Card M³ Komplain**: Menambahkan kembali kartu eksekutif `VOLUME M³ KOMPLAIN` dengan highlight border semantik amber (Midnight & Multi-theme compliant), menampilkan akumulasi `activeSummary.totalM3K` m³ dan counter jumlah SJ yang memiliki komplain.
    2. **Rincian Komplain di Tabel Desktop**:
       - Kolom Volume: Judul `Volume M³ (Gdg / PL / K)` dengan baris rincian `K: {r.m3K} m³` berlatar amber transparan lembut jika `r.m3K > 0`.
       - Kolom Berat: Menampilkan `K: {r.weightK} kg` saat ada komplain berat.
       - Kolom Qty: Menampilkan `K: {r.qtyK}` saat ada komplain coly.
       - Kolom Invoice: Badge `KOMPLAIN` jika baris memiliki selisih komplain.
    3. **Filter Cepat "Hanya Komplain"**: Menambahkan tombol toggle pill interaktif `Hanya Komplain` di samping filter cabang, yang secara instan menyaring data dan mengkalkulasi ulang seluruh KPI & total footer.
    4. **Mobile Card & Header**: Badge peringatan di header modal `⚠ Komplain: X SJ (Y m³)` dan rincian komplain terintegrasi pada mobile card view.
- [x] Redesign Modal Detail M3 per Marking ([CustMarkingDetailModal.tsx](file:///c:/shipping/frontend/src/features/billing/components/CustMarkingDetailModal.tsx)):
  - **Konsolidasi Data & Eliminasi Redundansi**:
    - **Tabel 7-Kolom High-Density**: Menggabungkan 16 kolom yang membingungkan dan banyak kosong menjadi 7 kolom terpadu:
      1. `#` (Index)
      2. `No. Invoice & Cabang` (Invoice + Badge Cabang outline + Tgl Inv)
      3. `Marking & Komoditas` (Marking No + Komoditas & Tipe + Badge Tax)
      4. `Qty (Coly)` (Nilai aktif koli + rincian SJ/Komplain jika ada selisih)
      5. `Berat (kg)` (Nilai aktif berat + rincian SJ/Komplain jika ada selisih)
      6. `Volume M³` (M³ Gudang aktual + M³ PL + status M³ Bill)
      7. `Status Overweight` (Delta kg semantik: Aman vs Overweight)
    - **KPI Strip Ringkas**: Dari 6 kartu besar redundan menjadi 4 kartu eksekutif modern (Total Berat & Qty, Volume M³ Gudang, Volume M³ PL, Status Overweight).
  - **Total Interaktif Sesuai Filter Search & Cabang**:
    - Agregasi `activeSummary` dihitung reaktif dari hasil filter search dan branch secara real-time.
    - Pill cabang interaktif (`Semua`, `HK`, `GZ`, dll.) menampilkan live count & live berat/volume sesuai kata kunci yang sedang diketik.
    - Ketika user mengetik di search bar, angka KPI, live badge cabang, dan footer langsung terbarui mencerminkan data yang cocok.
  - **Verifikasi**:
    - `bun run build` sukses 100% (2.55s).
- [x] Implementasi Hirarki KG pada Validasi Compare M3 vs KG:
  - **Aturan Bisnis**: Hirarki KG yang dipakai pada kalkulasi perbandingan M3 vs KG adalah:
    1. **Berat Komplain** (`tbEntryListKomplain.fdJmlBeratKomplain`) jika > 0
    2. **Berat SJ / Gudang** (`tbDelivery.fdJmlBeratSJ` atau `tbEntryListGudang.fdJmlBerat`) jika > 0
    3. **Berat List** (`tbEntryList.fdJmlBerat`) sebagai fallback
  - **Perbaikan Backend**:
    - [billing-validation.service.ts](file:///c:/shipping/backend/src/modules/billing/billing-validation.service.ts): Pada `getType2ComparisonCheck`, menambahkan query paralel ke `tbEntryListKomplain`, `tbDelivery` (agregasi per customer), dan `tbEntryListGudang`. Nilai KG dievaluasi berurutan sesuai hierarki dan menyertakan metadata `kgSource` ('Komplain' | 'SJ' | 'Gudang' | 'List').
    - Verifikasi sampel invoice nyata `GZS-010202-09-2026`: Berat SJ (13.488 kg) berhasil terpilih menggantikan berat list (12.538 kg), sehingga total tagihan ideal presisi Rp 91.044.000 dan status validasi menjadi `EQUAL` (cocok 100% dengan billing aktual).
  - **Perbaikan Frontend**:
    - [useOverweightValidation.ts](file:///c:/shipping/frontend/src/features/billing/hooks/useOverweightValidation.ts): Menyelaraskan urutan `actualWeightKg` agar memprioritaskan `komplain > sj > gudang > list`.
    - [Type2ComparisonPanel.tsx](file:///c:/shipping/frontend/src/features/billing/components/Type2ComparisonPanel.tsx): Menampilkan label `kgSource` (misal: `SJ`, `Gudang`, `Komplain`, `List`) pada kolom KG di tabel perbandingan.
  - **Verifikasi**:
    - `bun run build` frontend sukses 100% (10.78s).
    - PM2 restart instance 2 (`ShippingApi`) sukses dijalankan.
- [x] Pemindahan List dari [DashboardPage.tsx](file:///c:/shipping/frontend/src/features/delivery-orders/pages/DashboardPage.tsx) ke [ListPage.tsx](file:///c:/shipping/frontend/src/features/delivery-orders/pages/ListPage.tsx):
  - **Dashboard Lebih Bersih**:
    - Seluruh tabel panjang, accordion status blocks (`open` & `closed`), filter mode (`BY SEA` / `BY AIR`), search bar, dan grouping per cabang/marking dipindahkan keluar dari Dashboard.
    - [DashboardPage.tsx](file:///c:/shipping/frontend/src/features/delivery-orders/pages/DashboardPage.tsx) kini menjadi **Clean Executive Dashboard**: hanya menampilkan kartu KPI metrik (Total SJ, Total Packages, Total Weight, SJ Bulan Ini), kartu ringkasan status pengiriman (Pending vs Delivered), dan shortcut navigasi langsung ke ListPage serta modul logistik terkait (Shipments & Batch Marking).
  - **ListPage Terpadu & Fleksibel**:
    - [ListPage.tsx](file:///c:/shipping/frontend/src/features/delivery-orders/pages/ListPage.tsx) kini menjadi pusat pengelolaan data surat jalan dengan **View Switcher**:
      1. **Tampilan Grouping DO**: Tab `BY SEA` / `BY AIR`, pencarian ter-debounce, pengelompokan Cabang/Marking/None, dan blok status Open/Closed.
      2. **Tampilan Tabel Flat**: Toolbar lengkap dengan view toggle `Table` / `Cards` dan pagination presisi.
  - **Verifikasi**:
    - `bun run build` sukses 100% (2.38s).
- [x] Standardisasi Penamaan File Halaman [delivery-orders/pages](file:///c:/shipping/frontend/src/features/delivery-orders/pages):
  - **Penyebab**: File sebelumnya melanggar aturan AGENTS.md karena:
    1. Mengulang nama domain pada file (`DeliveryOrdersListPage.tsx` -> ❌).
    2. Halaman grouping/dashboard dinamai `ListPage.tsx` padahal melayani rute dashboard utama `/delivery-orders`.
  - **Restrukturisasi**:
    - [DashboardPage.tsx](file:///c:/shipping/frontend/src/features/delivery-orders/pages/DashboardPage.tsx): Halaman ikhtisar Grouping DO & KPI metrics (sebelumnya `ListPage.tsx`).
    - [ListPage.tsx](file:///c:/shipping/frontend/src/features/delivery-orders/pages/ListPage.tsx): Halaman flat table daftar surat jalan (sebelumnya `DeliveryOrdersListPage.tsx`).
    - [DetailPage.tsx](file:///c:/shipping/frontend/src/features/delivery-orders/pages/DetailPage.tsx): Standardisasi nama komponen menjadi `DetailPage`.
    - File usang `DeliveryOrdersListPage.tsx` dihapus.
  - **Routing & Export**:
    - Update [delivery-orders/index.ts](file:///c:/shipping/frontend/src/features/delivery-orders/index.ts): Export `DashboardPage`, `ListPage`, `DetailPage` beserta alias backward compatibility.
    - Update [router.tsx](file:///c:/shipping/frontend/src/app/router.tsx): Lazy import menggunakan `m.DashboardPage`, `m.ListPage`, dan `m.DetailPage`.
  - **Verifikasi**:
    - `bun run build` sukses 100% (4.39s & 2.49s).
- [x] Perbaikan deteksi komoditas laptop pada sparepart/screen ("LAPTOP SCREEN & SCREEN PARTS"):
  - **Penyebab**: String matching `tbCommodityMapping` ID 10 (`commodityName='LAPTOP'`, `targetCommodity='Laptop (Selain Merek Apple Price per kg, Min. 3pcs)'`, `mode='BY AIR'`) sebelumnya memakai loose matching `includes('LAPTOP')` tanpa memeriksa mode pengiriman (`isAir` vs LAUT) dan tanpa guard `isGenuineLaptop()`. Akibatnya, barang sparepart pengiriman Laut terpetakan ke unit Laptop utuh non-Apple.
  - **Perbaikan Backend**:
    - [m3-check.types.ts](file:///c:/shipping/backend/src/modules/m3-check/m3-check.types.ts): Menambahkan `mode?: string | null` ke `commodityMappings`.
    - [m3-check.service.ts](file:///c:/shipping/backend/src/modules/m3-check/m3-check.service.ts): Memfilter `commodityMappings` berdasarkan mode pengiriman dan menerapkan guard `!isGenuineLaptop` & `!isGenuineIpad`.
    - [billing-category.matcher.ts](file:///c:/shipping/backend/src/modules/billing/billing-category.matcher.ts): Menambahkan guard `isGenuineLaptop` & `isGenuineIpad` di Step 3 (synonym group) & Step 4 (word-boundary prefix match) agar tidak mencocokkan kata 'LAPTOP' pada nama sparepart ke kategori unit laptop.
    - [price-check.service.ts](file:///c:/shipping/backend/src/modules/price-check/price-check.service.ts): Menambahkan `matchesMode()` dan guard gadget valid di `resolveCommodityName` dan `determineCommodityOverride`.
    - [commodity-mapping.service.ts](file:///c:/shipping/backend/src/modules/commodity-mapping/commodity-mapping.service.ts): Memperbaiki filter mode dan guard gadget pada `resolveMappedCommodity`.
  - **Perbaikan Frontend**:
    - [billing.utils.ts](file:///c:/shipping/frontend/src/features/billing/utils/billing.utils.ts): Memfilter `m.mode` (AIR vs SEA) pada `evaluateItemPrice`, menambahkan guard `isGenuineLaptop` & `isGenuineIpad` sebelum memetakan ke mapping laptop, serta validasi ganda pada `directComodityName`.
  - **Verifikasi**:
    - Invoice `HKS-000995-09-2026` (listCode `0938947`, LAUT, komoditas `"LAPTOP SCREEN & SCREEN PARTS (11 PLTS)"`) terverifikasi sukses dipetakan ke **`General Goods`** / **`UMUM`** (bukan unit Laptop fisik).
    - `bun run build` di frontend berhasil 100% tanpa error.
    - PM2 restart instance 2 (`ShippingApi`) sukses dijalankan.
- [x] Hapus panel validasi perbandingan M3 vs KG (`Type2ComparisonPanel`) dari [DetailPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/DetailPage.tsx)
- [x] Perbaikan tampilan [ValidationListPage.tsx](file:///c:/shipping/frontend/src/features/billing/pages/ValidationListPage.tsx):
  - **Skeleton Shimmer**: Ditambahkan `ValidationListPageSkeleton` dengan class `.skeleton-shimmer` wireframe penuh (PageHeader, search bar, mode filter, PIC author pills, dan 6 baris table shimmer / 4 kartu mobile shimmer) saat initial load.
  - **Empty State**: Menggunakan komponen `<EmptyState>` standar dengan 2 kondisi semantik (Antrean Kosong vs Filter Nihil).
  - **i18n & Dark Mode**: Memperbaiki fallback raw string `billing.noBillingData` di `id.json` & `en.json`, dan perbaikan token warna progress bar.
- [x] Fix penentuan `isType2` pada validasi billing: `fdListType` (1=udara, 2=laut) dihapus dari evaluasi `isType2`, murni mengacu ke `fdTypeTagihan` (tipe 2)
- [x] Fix unused TS variable `billFdListType` di [BillingValidationCard.tsx](file:///c:/shipping/frontend/src/features/billing/components/BillingValidationCard.tsx)
- [x] Rancang Implementation Plan fitur 'Pairing Local Charge' (Lengkap dengan Sistem Role RBAC & 6 Langkah Terukur)
- [x] Implementasi fitur 'Pairing Local Charge' (Backend parser + batch query, Frontend UI grid spreadsheet + download/print, RBAC permission)
- [x] Fix Timeout Pairing Local Charge (Query sargable index + Axios timeout 120s)
- [x] Fix Salah Invoice & URL `%02`:
  - Mengubah urutan prioritas pencarian: `Receipt No` (`fdTerima`) dijadikan **Prioritas 1** (karena unik per transaksi pengiriman) sebelum fallback ke `Shipping Mark` (yang sering dipakai berulang kali untuk banyak pengiriman berbeda).
  - Sanitasi karakter non-printable / control character ASCII (seperti `\u0002` STX) pada backend dan frontend URL link invoice.
  - Hasil verifikasi baris `HK260703-007` (`UC/BOBO`, `JSP/HQ NO.33`): invoice sekarang akurat **`HKA-000744-07-2026`**, Charge DB **250**, status **`COCOK`**.
- [x] Support Multiple Invoice per Baris Excel (Pemisah Koma):
  - Mengubah `entriesList.find` menjadi `filter` agar seluruh pecahan receipt (contoh `HK260703-014` dan `HK260703-015`) tertampung.
  - Menghimpun seluruh invoice terkait ke dalam `invNos: string[]`.
  - Frontend menampilkan daftar link untuk seluruh nomor invoice yang ditemukan secara rapi (contoh `HKS-000920-08-2026`, `HKS-B00954-08-2026`, `HKS-C00954-08-2026`).
  - Akumulasi total charge DB dari seluruh item billing/entry list yang cocok.
- [x] Perbaiki padding halaman `PairingLocalChargePage`:
  - Menambahkan kelas padding responsif standar ERP (`p-3 sm:p-6 lg:p-8 w-full`) yang konsisten dengan halaman ERP lainnya (`ValidationListPage`, `DetailPage`).
- [x] Rebuild frontend sukses & restart PM2 instance 2 (`ShippingApi`). Local Charge selesai diimplementasikan

### Task Pending / Backlog
- [ ] *(Belum ada)*

---

## 🗂️ Konteks Fitur Aktif

### Fitur yang Sedang Dikembangkan
| Domain | Status | Catatan |
|---|---|---|
| `billing` | 🟢 Completed | Fitur Pairing Local Charge selesai diimplementasikan |

### File Yang Baru Diubah
| File | Perubahan |
|---|---|
| `backend/src/modules/m3-check/m3-check.service.ts` | Tambah query paralel `get_berat_delivery_sj` per `fdListCode` dan populate `fdBeratSJ` |
| `frontend/src/features/billing/hooks/useBillingValidation.ts` | Tambah komparasi 3 sumber berat (list, sj, komplain) dengan threshold 0.1 kg & kaitkan ke `isPhysicalValid` |
| `frontend/src/features/billing/components/BillingValidationSummaryModal.tsx` | Status bar Kesesuaian Berat Fisik & 3 kartu ringkasan berat di Tab M3 & Berat |
| `frontend/src/features/billing/components/BillingValidationCard.tsx` | Integrasi bobot SJ pada kartu validasi & alert selisih berat |
| `frontend/src/lib/i18n/id.json` & `en.json` | Key i18n untuk validasi berat fisik |

---

## 🧠 Keputusan Desain / Arsitektur Yang Sudah Diputuskan

| Topik | Keputusan | Tanggal |
|---|---|---|
| Midnight theme colors | `bgColor=#0B0F17`, `surfaceColor=#151D2A` | 2026-09-10 |
| Feature folder | Sub-folder `constants/`, `stores/`, `utils/` opsional | 2026-09-10 |
| API endpoint const | Format `camelCase` | 2026-09-10 |
| `fdListType` semantik | `fdListType` = moda pengiriman (1=udara, 2=laut), **bukan** type tagihan | 2026-09-10 |
| `isType2` source | `isType2` hanya dari `res.profileHarga.typeTagihan === 2`, bukan `fdListType` | 2026-09-10 |

---

## ⚠️ Isu Aktif / Known Issues

| Isu | Dampak | Status |
|---|---|---|
| *(Belum ada isu tercatat)* | — | — |

---

## 📝 Catatan Kontekstual Penting

- Backend module `marking` dan `price-check` ada di backend tapi **tidak ada** frontend feature-nya (masih diakses via modul lain)
- Frontend `user-management` → backend menggunakan module `users` + `roles` (nama berbeda)
- `BILLING_VALIDATION_DETAIL_PATH` di ROUTES adalah path pattern (bukan fungsi), tidak ada di daftar shorthand ROUTES
- Billing adalah fitur paling kompleks: punya `constants/`, `stores/`, `utils/`, `hooks/` khusus

---

## 📌 Protokol Update (WAJIB)

Setiap AI Agent **WAJIB** mengupdate file ini sebelum mengakhiri sesi jika:
1. Ada task baru yang dimulai → tambahkan ke "Task Sedang Berjalan"
2. Ada task yang selesai → pindahkan ke "Task Selesai" dengan tanda `[x]`
3. Ada keputusan desain/arsitektur baru → tambahkan ke tabel "Keputusan Desain"
4. Ada file yang diubah → tambahkan ke "File Yang Baru Diubah" (cukup 5 terakhir)
5. Ada isu baru ditemukan → tambahkan ke "Isu Aktif"

**Format update header wajib:**
```
## 🕐 Terakhir Diperbarui
- **Tanggal**: YYYY-MM-DD
- **Oleh**: [Nama Agent / Model]
- **Sesi**: [Deskripsi singkat task sesi ini]
```
