# 📱 Mobile Architecture & Hardware Integration — M-Shipping

Dokumen ini menjelaskan fondasi arsitektur, konfigurasi jaringan, penanganan safe area insets, preferensi tema dinamis, serta integrasi modul perangkat keras pada aplikasi mobile M-Shipping.

---

## 1. Stack Teknologi & Runtime
- **Framework Mobile**: Expo SDK 57 (React Native 0.86, React 19.2, TypeScript 6.0)
- **Routing**: Expo Router v4 (File-based Routing di `mobile/app/`)
- **State Management**: Zustand v5 (`authStore`, `toastStore`, `updateStore`)
- **Server State & Caching**: TanStack React Query v5
- **Komunikasi REST**: Axios via `mobile/src/api/client.ts`
- **Penyimpanan Kredensial**: `expo-secure-store` (Enkripsi KeyStore Android / Keychain iOS)
- **Versi Rilis**: `v1.2.2` (Build/VersionCode: `14`, Single Source of Truth di `mobile/src/config/version.ts`)
- **Target Platform**: Android 14 (API 34) Stabil dengan sertifikat rilis SHA256withRSA (`mobile/keystore/release.keystore`, berlaku hingga tahun 2054).

---

## 2. Konfigurasi Jaringan & Keamanan
- **Base URL API**: `http://36.93.22.142:3010/api`
- **Cleartext Traffic**: Diaktifkan melalui Expo Config Plugin (`mobile/plugins/withCleartextTraffic.js`) yang menyuntikkan `android:usesCleartextTraffic="true"` ke `AndroidManifest.xml`.
- **Token Injection**: Axios interceptor menyisipkan `Authorization: Bearer <token>` dari `authStore`.

---

## 3. Penanganan Safe Area Insets & Layout Perangkat

### A. Android Navigation Bar Insets (`mobile/app/(tabs)/_layout.tsx`)
Tinggi dan padding bawah TabBar dihitung secara dinamis menggunakan `useSafeAreaInsets()`:
- `bottomInset = Platform.OS === 'android' ? Math.max(insets.bottom, 48) : Math.max(insets.bottom, 16)`
- `tabBarHeight = 52 + bottomInset`
- `paddingBottom: bottomInset`
> **Catatan**: Nilai minimum 48dp pada Android menjamin bahwa tombol navigasi 3-tombol sistem (`|||`, `O`, `<`) tidak pernah bertumpuk dengan ikon atau label teks tab, bahkan pada ROM OEM (Xiaomi MIUI/HyperOS, ColorOS) yang mengembalikan `insets.bottom = 0`.

### B. Safe Area Toast Notification (`ToastContainer.tsx`)
Posisi vertikal dihitung dengan `topOffset = Math.max(insets.top, StatusBar.currentHeight || 0, 24) + 12`, sehingga notifikasi melayang di bawah jam status bar dan punch-hole kamera perangkat tanpa saling bertumpuk.

---

## 4. Preferensi Tema & Deteksi Sistem Dinamis
- **Penyimpanan**: Disimpan persisten di `expo-secure-store` (key `mshipping_theme_preference`).
- **Default Otomatis**: Jika disetel `system`, aplikasi mengikuti pengaturan HP (`Appearance.getColorScheme()`: Gelap $\to$ `midnight`, Terang $\to$ `heritage`).
- **Dynamic Listener**: `Appearance.addChangeListener` mengubah tema secara real-time saat ponsel berganti mode gelap/terang.
- **Pilihan Pengguna**: `system` (Otomatis), `midnight` (Dark), `heritage` (Light).

---

## 5. Integrasi Perangkat Keras (Hardware)
1. **`expo-camera`**: Pemindai barcode/QR resi fisik (`CameraView`) dengan dukungan format internasional (`code128`, `qr`, `code39`, dll) serta lampu senter (*torch*).
2. **`expo-local-authentication`**: Autentikasi biometrik Fingerprint / Face ID untuk verifikasi login dan proteksi cetak/berbagi PDF faktur.
3. **`expo-print` & `expo-sharing`**: Kompilasi HTML faktur A5 landscape ke PDF serta pembukaan dialog sharing native (WhatsApp, Gmail, Drive).
4. **`expo-haptics`**: Respon getaran sentuh pada aksi tombol, pemindaian sukses, dan penyalinan teks.
