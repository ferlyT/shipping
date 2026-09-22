# 📱 Dokumentasi Lengkap Aplikasi Mobile M-Shipping (Logika & Integrasi Endpoint)

Dokumen ini menjelaskan secara menyeluruh seluruh halaman pada aplikasi mobile **M-Shipping** (Expo SDK 57 / React Native 0.86 / TypeScript / Hono.js Backend), termasuk logika interaksi, manajemen state, integrasi hardware, serta data yang ditampilkan dari setiap endpoint API backend.

---

## 🏗️ 1. Arsitektur Teknis & Konfigurasi Jaringan

### Stack Teknologi
- **Framework Mobile**: Expo SDK 57 (React Native 0.86, React 19.2, TypeScript 6.0)
- **Routing**: Expo Router v4 (File-based Routing di folder `mobile/app/`)
- **State Management**: Zustand v5 (`authStore`, `toastStore`, `updateStore`)
- **Server State & Caching**: TanStack React Query v5 (dengan refetching & cache invalidation)
- **Komunikasi REST**: Axios via `mobile/src/api/client.ts`
- **Penyimpanan Kredensial**: `expo-secure-store` (Enkripsi KeyStore Android / Keychain iOS)
- **Versi Rilis Saat Ini**: `v1.2.2` (Build/VersionCode: `14`, Force Update: `true`, `minVersion: "1.2.2"`, Single Source of Truth di `mobile/src/config/version.ts`)
- **Integrasi Perangkat Keras**:
  - `expo-camera`: Pemindai barcode/QR resi fisik
  - `expo-local-authentication`: Autentikasi biometrik FaceID / Fingerprint
  - `expo-print` & `expo-sharing`: Kompilasi HTML ke PDF dan sharing invoice
  - `expo-haptics`: Respon getaran sentuh pada aksi pengguna

### Konfigurasi Jaringan & Keamanan
- **Base URL API**: `http://36.93.22.142:3010/api`
- **Cleartext HTTP**: Diaktifkan melalui Expo Config Plugin (`mobile/plugins/withCleartextTraffic.js`) yang menyuntikkan `android:usesCleartextTraffic="true"` ke `AndroidManifest.xml`.
- **Target Platform**: Android 14 (API 34) Stabil dengan sertifikat rilis SHA256withRSA (`mobile/keystore/release.keystore`, masa berlaku hingga tahun 2054).
- **Injeksi Token**: Axios request interceptor secara otomatis menyisipkan header:
  `Authorization: Bearer <JWT_TOKEN>` yang dibaca dari `useAuthStore`.

---

## 📑 2. Struktur Routing Aplikasi Mobile

```text
mobile/
├── app/                      # Expo Router File-based Routing
│   ├── _layout.tsx           # Root Provider (QueryClient, Theme, Toast, Auth Init)
│   ├── index.tsx             # Splash Screen & Gatekeeper Redirection
│   ├── (auth)/               # Layar Autentikasi
│   │   ├── _layout.tsx       # Auth Stack Layout
│   │   ├── login.tsx         # Halaman Masuk (Manual & Biometrik)
│   │   └── register.tsx      # Halaman Pendaftaran Akun Baru
│   └── (tabs)/               # 5 Modul Ramping (Thin Screen Orchestrators)
│       ├── _layout.tsx       # Bottom Tabs Navigation Bar (Dynamic Safe Area Insets)
│       ├── overview.tsx      # Tab 1: Dashboard Eksekutif & Ringkasan KPI (~360 baris)
│       ├── logistics.tsx     # Tab 2: Resi, Batch Marking, & Surat Jalan (360 baris)
│       ├── finance.tsx       # Tab 3: Daftar Invoice, Audit Validasi, & Cek Tarif (540 baris)
│       ├── master.tsx        # Tab 4: Direktori Pelanggan & Kontak Langsung (~140 baris)
│       └── profile.tsx       # Tab 5: Akun, Biometrik, Tema, Bahasa, & Status ERP
└── src/
    ├── features/             # Feature-Driven Architecture (Modular Components, Hooks & Utils)
    │   ├── overview/         # AlertDetailModal, ExitActivityKpiGrid, ExitBatchListItem
    │   ├── logistics/        # ShipmentListItem, BatchListItem, DeliveryListItem, Sheet & Tabs
    │   ├── finance/          # BillingListItem, ValidationListItem, InvoiceDetailSheet, finance.utils
    │   └── master/           # CustomerListItem, CustomerDetailSheet, master.utils
    ├── components/           # Reusable UI & Scanner components
    ├── stores/               # Zustand Global Stores (auth, toast, update)
    ├── theme/                # Theme Store & Token Styles
    └── lib/                  # Utilities & Helpers
```

> **Catatan Penanganan Safe Area Insets Bawah (Android Navigation Bar)**:
> Pada `mobile/app/(tabs)/_layout.tsx`, tinggi dan padding bawah TabBar dihitung secara dinamis menggunakan `useSafeAreaInsets()` dari `react-native-safe-area-context`:
> - `bottomInset = Platform.OS === 'android' ? Math.max(insets.bottom, 48) : Math.max(insets.bottom, 16)`
> - `tabBarHeight = 52 + bottomInset`
> - `paddingBottom: bottomInset`
> Nilai minimum 48dp pada Android menjamin bahwa tombol navigasi 3-tombol sistem (`|||`, `O`, `<`) tidak pernah bertumpuk dengan ikon atau label teks tab, bahkan pada perangkat ROM OEM (seperti Xiaomi/MIUI/HyperOS atau ColorOS) yang mengembalikan nilai `insets.bottom = 0`.
>
> **Catatan Safe Area Toast Notification**:
> Pada `ToastContainer.tsx`, posisi vertikal dihitung dengan `topOffset = Math.max(insets.top, StatusBar.currentHeight || 0, 24) + 12`, sehingga notifikasi melayang anggun di bawah jam status bar dan punch-hole kamera perangkat tanpa saling bertumpuk.
>
> **Catatan Preferensi Tema & Deteksi Tema Perangkat (`themeStore.ts` & `ThemeSelectionModal.tsx`)**:
> - **Penyimpanan Aman**: Preferensi tema disimpan secara persisten di memori perangkat menggunakan `expo-secure-store` (key `mshipping_theme_preference`).
> - **Default Otomatis Ikuti Tema Perangkat**: Jika pengguna belum memilih tema atau memilih opsi `system`, aplikasi secara bawaan mendeteksi dan mengikuti pengaturan tema HP pengguna (`Appearance.getColorScheme()`: Gelap $\to$ `midnight`, Terang $\to$ `heritage`).
> - **Listener Dinamis Sistem**: Menggunakan `Appearance.addChangeListener` sehingga ketika ponsel berganti mode gelap/terang saat aplikasi berjalan, tema aplikasi langsung menyesuaikan secara real-time.
> - **Modal Pemilih Tema**: Melalui Tab Profil, pengguna dapat memilih 3 opsi tema via `ThemeSelectionModal`:
>   1. `system`: Ikuti Tema Perangkat (Otomatis)
>   2. `midnight`: Mode Gelap (Midnight)
>   3. `heritage`: Mode Terang (Heritage)

---

## 🔍 3. Rincian Detail Halaman Demi Halaman

---

### 3.1. Halaman Splash & Gatekeeper (`app/index.tsx`)

#### A. Tujuan & Logika
Halaman pembuka (*entrypoint*) aplikasi. Bertugas memeriksa apakah pengguna sudah memiliki sesi login yang sah di memori aman perangkat:
1. Memanggil `initializeAuth()` dari `authStore.ts` saat aplikasi dibuka.
2. Membaca token JWT (`mshipping_auth_token`) dan profil pengguna (`mshipping_auth_user`) dari `expo-secure-store`.
3. **Kondisi Pengalihan**:
   - Jika `isAuthenticated === true` $\to$ diarahkan langsung ke `/(tabs)/overview`.
   - Jika `isAuthenticated === false` $\to$ diarahkan ke `/(auth)/login`.

#### B. Tampilan Visual
- Logo paket kontainer (*Package icon*).
- Judul *"M-Shipping"* dan *"Enterprise Logistics & Finance"*.
- Spinner loading (*ActivityIndicator*) hingga inisialisasi selesai.

#### C. Endpoint Terkait
- Tidak memanggil endpoint eksternal secara langsung (pemeriksaan lokal via SecureStore).

---

### 3.2. Halaman Login (`app/(auth)/login.tsx`)

#### A. Tujuan & Logika
Autentikasi staf dan pengguna lapangan menggunakan kredensial username/password atau biometrik perangkat.

1. **Autentikasi Manual**:
   - Pengguna menginput `username` dan `password`.
   - Menekan tombol *"Masuk Sekarang"*.
   - Mengirim request HTTP POST ke endpoint login.
   - Jika sukses:
     - Token JWT dan data user disimpan di Zustand `authStore`.
     - Kredensial disimpan ke `expo-secure-store` untuk mengaktifkan biometrik berikutnya.
     - Haptic feedback sukses dipicu.
     - Diarahkan ke `/(tabs)/overview`.
2. **Autentikasi Biometrik (Fingerprint / FaceID)**:
   - Pada saat halaman dimuat, `checkBiometrics()` memeriksa ketersediaan sensor hardware via `expo-local-authentication`.
   - Tombol biometrik **hanya ditampilkan** jika hardware tersedia dan terdapat token tersimpan yang valid (`isEnabled && saved?.token`).
   - Tipe biometrik (`Fingerprint` / `Face ID`) diteruskan secara langsung ke prompt sistem untuk menghindari keterlambatan render state (*race condition*).
   - Memvalidasi token tersimpan ke endpoint `GET /api/auth/me`.
   - Jika token masih valid, otomatis login tanpa input ulang password.
   - Saat pengguna melakukan `logout()`, `authStore.ts` secara otomatis membersihkan kredensial biometrik (`clearSavedCredentials()`) untuk mencegah potensi kebocoran sesi akun antar-pengguna.
3. **Penanganan Error**:
   - Galat kredensial salah: menampilkan toast *"Username atau password salah"*.
   - Galat jaringan (server offline / tanpa koneksi): menampilkan toast spesifik *"Network Error"*.

#### B. Endpoint API Terkait

##### 1. Login Akun
- **Method**: `POST`
- **Endpoint**: `/api/auth/login`
- **Request Body**:
  ```json
  {
    "username": "admin",
    "password": "password123"
  }
  ```
- **Response Data**:
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "USR-001",
        "username": "admin",
        "fullName": "Administrator Operasional",
        "role": "admin",
        "fdEmpCode": "F006",
        "fdEmpName": "Ferly",
        "permissions": ["all"]
      }
    }
  }
  ```

##### 2. Verifikasi Token Biometrik
- **Method**: `GET`
- **Endpoint**: `/api/auth/me`
- **Header**: `Authorization: Bearer <TOKEN>`
- **Response Data**:
  ```json
  {
    "success": true,
    "data": {
      "id": "USR-001",
      "username": "admin",
      "fullName": "Administrator Operasional",
      "role": "admin"
    }
  }
  ```

---

### 3.3. Halaman Pendaftaran (`app/(auth)/register.tsx`)

#### A. Tujuan & Logika
Pendaftaran akun staf baru untuk mendapatkan akses ke ekosistem ERP M-Shipping.

1. Pengguna mengisi form:
   - **Nama Lengkap** (`fullName`)
   - **Username** (`username`)
   - **Password** (`password`)
   - **Konfirmasi Password** (`confirmPassword`)
2. **Validasi Klien**:
   - Memeriksa kelengkapan seluruh field.
   - Memastikan `password === confirmPassword`.
3. Mengirim data ke backend. Akun yang baru dibuat berstatus *pending* dan memerlukan persetujuan administrator sebelum dapat digunakan untuk login.
4. Menampilkan notifikasi sukses dan mengembalikan pengguna ke layar login.

#### B. Endpoint API Terkait
- **Method**: `POST`
- **Endpoint**: `/api/auth/register`
- **Request Body**:
  ```json
  {
    "fullName": "Budi Santoso",
    "username": "budisantoso",
    "password": "PasswordRahasia123"
  }
  ```
- **Response Data**:
  ```json
  {
    "success": true,
    "message": "Pendaftaran berhasil! Silakan tunggu persetujuan admin."
  }
  ```

---

### 3.4. Halaman Dashboard & Overview (`app/(tabs)/overview.tsx`)

#### A. Tujuan & Logika
Halaman utama setelah login yang berfungsi sebagai pusat informasi eksekutif dan pemantauan aktivitas kontainer/batch keluar gudang (Exit Activity).

1. **Header Pengguna & Kontrol Cepat**:
   - Menampilkan sapaan nama pengguna (`user.fullName` / `user.username`) dan role badge.
   - Tombol toggle bahasa bilingual (`ID` / `EN`).
   - Tombol toggle tema gelap/terang (`Midnight` / `Heritage`).
2. **Seksi Peringatan Dini Operasional (Actionable Alerts) & Exit Activity Terpadu**:
   - **Peringatan Dini Operasional Interaktif**:
     - **ETA NOT EXIT**: Jumlah batch melewati jadwal ETA namun belum keluar gudang. Mengetuk kartu langsung memfilter daftar batch di bawah untuk menampilkan seluruh batch yang sudah ETA tapi belum exit (`exitScope=eta_not_exit`).
     - **MISSED SLA**: Jumlah batch dengan durasi transit ETD -> ETA melewati standar target SLA cabang. Mengetuk kartu langsung memfilter daftar batch di bawah untuk menampilkan batch yang lewat target SLA (`exitScope=missed_sla`).
     - Ikon panah/chevron pada kartu tetap membuka modal dialog ringkasan rincian per-consignee.
   - **4 Kartu KPI Ringkasan Exit**:
     - **Kemarin**: Jumlah batch keluar kemarin (`exitScope=yesterday`).
     - **Hari Ini (Default)**: Jumlah batch keluar hari ini (`exitScope=today`).
     - **Besok (Prediksi)**: Estimasi batch yang dijadwalkan keluar besok (`exitScope=tomorrow`).
     - **Exit 7 Hari (Terbaru)**: Akumulasi batch keluar dalam 7 hari terakhir (`exitScope=recent`).
     - **Desain Multi-Tema (Anti Shadow Bleed-Through)**: Seluruh kartu menggunakan warna latar belakang opaque solid (contoh: `#ECFDF5` untuk Hari Ini, `#F0F9FF` untuk Kemarin/7 Hari, `#FFFBEB` untuk Besok pada tema terang) agar elevasi bayangan native Android tidak tembus ke dalam kartu dan warna tampil 100% rata, bersih, dan bergradasi proporsional.
   - **Group Pills Filter Moda & Tahun**:
     - Dilengkapi segmented group pills moda (`Semua`, `Udara`, `Laut`) tepat di atas daftar batch untuk memfilter muatan secara instan berbasis `listType`.
     - Khusus saat kriteria **ETA NOT EXIT** atau **MISSED SLA** aktif, muncul filter tahun batch interaktif (`2026`, `2025`, `2024`, `Semua`) dengan tahun berjalan (`2026`) langsung aktif secara otomatis (`year=2026`).
   - **Daftar Batch Terkini**:
     - Menampilkan kode batch marking, kontainer/AWB, cabang asal, consignee, koli & berat, serta tanggal kontekstual (Exit Date, Estimasi Prediksi, ETA Belum Keluar, atau Transit vs SLA).
     - **In-Place Modal Manifest**: Mengetuk item batch langsung memunculkan modal lembar manifest (`BatchManifestSheet`) secara in-place di halaman Overview tanpa berpindah tab ke Logistik, sehingga pengguna dapat langsung meninjau rincian resi & koli muatan dengan cepat dan tetap berada di dashboard.
     - Mengetuk chip kode batch pada dialog popup ringkasan consignee (modal alert ETA/SLA) juga langsung menampilkan modal lembar manifest batch secara in-place di halaman Overview.
   - **Navigasi "Lihat Semua Batch"**: Tombol di header Exit Activity yang membuka tab Logistik (`/(tabs)/logistics`) dengan sub-tab **Batch Marking** (`batches`) aktif otomatis.
3. **Pull-to-Refresh**:
   - Mendukung gesture tarik ke bawah untuk memuat ulang data KPI Exit Activity dan batch exit aktif secara real-time.

#### B. Endpoint API Terkait

##### 1. Aktivitas Keluar Kontainer / Batch (Exit Activity) & Peringatan Dini
- **Method**: `GET`
- **Endpoint**: `/api/marking/kpi` & `/api/marking`
- **Query Params `/api/marking`**: `exitScope=today|yesterday|tomorrow|recent|eta_not_exit|missed_sla`, `listType=ALL|1|2`, `year=YYYY|ALL`, `limit=50`
- **Sumber Data KPI**: `/api/marking/kpi` mengembalikan ringkasan harian (kemarin, hari ini, besok prediksi, dan exit 7 hari terakhir) serta alert ETA & SLA.
- **Data Kunci yang Ditampilkan**:
  - **KPI 4-Kolom Ringkasan**:
    - **Kemarin**: Jumlah batch keluar kemarin (breakdown Udara & Laut)
    - **Hari Ini**: Jumlah batch keluar hari ini (breakdown Udara & Laut)
    - **Besok (Prediksi)**: Estimasi batch yang dijadwalkan keluar besok
    - **Exit 7 Hari**: Jumlah batch keluar dalam 7 hari terakhir
  - **Daftar Batch Terkini**:
    - `fdMarkingCode`: Nomor batch marking kontainer / penerbangan
    - `fdContNo` / `fdAWB`: Nomor kontainer atau AWB pengiriman
    - `fdBranchCode`: Kode cabang asal (`GZ`, `HK`, `SG`, `YW`, `SH`)
    - `fdConsignee`: Penerima / consignee batch
    - `fdExitDate` / `predictedExitDate` / `fdETA`: Tanggal selesai keluar, estimasi keluar, atau jadwal ETA
    - Koli & Berat: Total koli muatan dan berat kilogram

---

### 3.5. Halaman Logistik Lapangan (`app/(tabs)/logistics.tsx`)

#### A. Tujuan & Logika
Pusat manajemen operasional muatan fisik di lapangan, pelacakan resi, pemantauan batch marking kontainer, dan status pengiriman surat jalan kurir/armada.

1. **Segmented Tabs Navigasi**:
   - **Tab 1: Daftar Resi (`shipments`)**
   - **Tab 2: Batch Marking (`batches`)**
   - **Tab 3: Surat Jalan (`delivery`)**
2. **Pencarian Universal, Integrasi Barcode Scanner, & Infinite Scroll**:
   - Input search bar dilengkapi tombol kamera pemindai barcode/QR.
   - Hasil pemindaian kamera otomatis masuk ke kolom pencarian dan memfilter data list secara *live*.
   - **Infinite Scroll (Semua Tab)**: Ketiga daftar (`shipments`, `batches`, `delivery`) menerapkan infinite scroll berbasis `useInfiniteQuery` (TanStack React Query v5) dengan parameter `{ page, limit: 20 }`. Saat daftar di-scroll mendekati batas bawah (`onEndReachedThreshold: 0.4`), halaman berikutnya di-fetch secara otomatis dengan indikator loading footer (*ActivityIndicator*).
3. **Sub-Tab 1: Daftar Resi**:
   - Filter tambahan: `Semua`, `Udara`, `Laut`.
   - Menampilkan nomor resi (`fdTerima`), kode marking (`fdMarkingCode`), nomor marking (`fdMarkingNo`), nama customer, jumlah pack & satuan (`fdJmlPack`, `fdSatuan`), berat (`fdJmlBerat`), dan volume kubikasi (`fdM3`).
   - **Modal Rincian Muatan (Bottom Sheet 3-Tab)**:
     - Mengikuti struktur modal detail shipment di Frontend Web (`ShipmentDetailModal.tsx`):
       - **Header Modal**: Nama Customer master (dibersihkan via `displayCustName`), Badge No. List (`fdListCode`), Badge Status Pengiriman (`getShipmentStatusBadge`), dan chip lokasi gudang (`MapPin {fdGudang}`).
       - **Navigasi Tersegmen (SegmentedControl)**:
         1. **`Ringkasan`**:
            - 3 Kartu Metrik KPI: **Total Koli** (`fdJmlPack` / `fdColy` + satuan), **Total Berat** (`fdJmlBerat` kg), dan **Total Volume** (`fdM3` $m^3$).
            - Panel Rincian Identifikasi: No. Resi (`fdTerima`), Tracking No. (`fdLocalTrackingNo`), Marking & No. (`fdMarkingCode` + `fdMarkingNo`), Tanggal Agent (`fdTglAgent`), dan Moda / Cabang.
            - Panel Komoditas: Nama komoditas & badge tipe jika tersedia (`fdComodity`, `fdComodityName`).
            - Panel Keterangan: Catatan operasional resi (`fdDesc`).
         2. **`Dimensi`**:
            - Sub-tab switcher: **Packing List**, **Ukuran Gudang**, dan **Komplain** lengkap dengan badge hitung jumlah item.
            - Banner Total Volume Kubikasi: Menampilkan akumulasi volume $m^3$ sub-tab aktif berbasis rumus `(P * L * T * Qty) / 1.000.000`.
            - Daftar Kartu Dimensi Per Koli: Menampilkan deskripsi koli, badge volume, dan grid 4 metrik (Panjang cm, Lebar cm, Tinggi cm, Jumlah pcs).
         3. **`Timeline`**:
            - Jika pengiriman dibatalkan (`fdCancel = 1` atau `statusStep = -1`), menampilkan kartu pembatalan beraksen rose.
            - **Status Ditahan / Diblokir Finance (`Blocked` / `statusStep = 10`)**: Jika muatan diblokir oleh bagian keuangan (`tbEntryList_Bloked_Finance.fdBlocked = 1`), menampilkan banner peringatan merah ditahan oleh Finance lengkap dengan nama petugas (*Blocked by*) dan alasan pembatasan.
            - Menampilkan 6 tahapan pelacakan logistik vertikal:
              1. **Waiting Loading**: Menunggu proses loading ke kontainer (`fdLoadDate`).
              2. **ETD (Keberangkatan)**: Estimated Time of Departure (`fdETD`).
              3. **ETA (Kedatangan)**: Estimated Time of Arrival di pelabuhan (`fdETA`).
              4. **Warehouse (Gudang)**: Tiba di gudang penyortiran (`fdExitDate` + nama gudang).
              5. **Delivery**: Dalam pengantaran armada ke penerima.
              6. **Delivered**: Barang telah diterima oleh customer.
            - Garis konektor vertikal dengan node bulat hijau (`Check`) untuk langkah selesai, efek ring dan badge *"Berjalan"* untuk tahap aktif, serta indikator *"Menunggu"* untuk tahap mendatang.
4. **Sub-Tab 2: Batch Marking**:
   - Filter tambahan moda: `Semua`, `Udara`, `Laut`.
   - Menampilkan kode batch marking (`fdMarkingCode`), cabang gudang (`fdBranch`), keterangan (`fdKet`), dan tanggal operasional berbasis hirarki (`Exit`, `ETA`, `ETD`, `Load`).
   - **Tampilan Nomor Muatan Khusus**:
     - Jika moda **Udara** (`fdListType === 1`) $\to$ menampilkan nomor AWB (`fdAWB`).
     - Jika moda **Laut** (`fdListType === 2`) $\to$ menampilkan nomor kontainer (`fdContNo`).
     - *Catatan Desain*: Hanya menampilkan string data mentah secara tegas (warna aksen tersier) tanpa teks label awalan "AWB:" maupun "Kontainer:". Tepat di bawahnya, hanya menampilkan `fdKet` jika tersedia (tanpa teks default/placeholder).
   - **Modal Rincian Data Manifest Batch**:
     - Menampilkan seluruh resi muatan fisik yang terdaftar dalam batch (`/api/marking/:id/manifest`).
     - Ringkasan KPI manifest (Total Resi, Koli, Berat kg, Kubikasi m³, dan Jumlah Customer).
     - **Status Finansial & Override Blocked Finance**:
       - Setiap item kartu manifest menampilkan badge **Status Finansial** yang bersumber dari master status pelanggan **`tbCustomers.fdBlocked`** (`OK`, `COD`, `WARNING`, `BLOCKED`, `URGENT`, `NO STATUS`).
       - **Override Otomatis Status Blocked**: Apabila status shipment diblokir oleh Finance (`tbEntryList_Bloked_Finance.fdBlocked = 1`), status finansial otomatis di-override menjadi badge merah **`BLOCKED`**, serta memunculkan kotak banner merah peringatan bertuliskan nama staf (*Blocked by* / `fdCreated`) dan alasan penahanan (*Alasan* / `fdKeterangan`).
5. **Sub-Tab 3: Surat Jalan (Delivery Orders)**:
   - Menampilkan nomor surat jalan (`fdSJNo`), nama customer (`fdCustNameSJ`), supir (`fdSupir`), plat mobil armada (`fdCarID`), perkiraan tanggal kirim (`fdEstimasi`), tanggal penyerahan ke kantor (`fdGiveDate`), dan status kirim (`Delivered` vs `On Delivery`).

#### B. Endpoint API Terkait

##### 1. Data Resi & Shipment
- **Method**: `GET`
- **Endpoint**: `/api/shipments`
- **Query Params**:
  - `limit=20`
  - `search=<keyword>` (pencarian nomor resi, kode marking, customer, marking no)
  - `listType=1|2` (opsional: 1 untuk Udara, 2 untuk Laut)
- **Data Kunci yang Ditampilkan**:
  - `fdTerima`: Nomor resi penerimaan fisik
  - `fdMarkingCode`: Nomor kode batch marking manifest
  - `fdMarkingNo`: Tanda marking fisik karton
  - `fdCustName`: Nama customer pemilik barang
  - `fdListType`: 1 = Udara (`Plane`), 2 = Laut (`Ship`)
  - `fdJmlPack`: Jumlah koli / karton / pack
  - `fdSatuan`: Satuan muatan kemasan (misal: Ctn, Pcs, Koli, Roll, Zak)
  - `fdJmlBerat`: Berat timbangan gudang (kg)
  - `fdM3`: Volume kubikasi riil ($m^3$)

##### 1.1. Saran Pencarian Cepat Resi & Shipment (Dropdown Suggestions)
- **Method**: `GET`
- **Endpoint**: `/api/shipments/suggestions`
- **Query Params**:
  - `q=<keyword>` (minimal 2 karakter)
- **Logika & Optimasi**:
  - Menjalankan 3 query paralel terindeks pada `tbCustomers` (nama pelanggan), `tbEntryList` (nomor resi), dan `tbEntryList` (marking code) menggunakan `WITH (NOLOCK)`.
  - Mengembalikan daftar saran cepat terstruktur dalam waktu ~200ms dengan kategori: `resi`, `customer`, `marking`.
  - Menampilkan dropdown mengambang (`SearchSuggestionsDropdown.tsx`) di bawah SearchBar dengan haptic feedback dan ikon semantik (`Receipt`, `User`, `Tag`).

##### 1.2. Detail Lengkap & Dimensi Resi (Modal Dialog)
- **Method**: `GET`
- **Endpoint**:
  - `GET /api/shipments/:id`: Detail shipment lengkap beserta kalkulasi relasi status `shipmentStatus` (statusStep 1..6, statusLabel, fdLoadDate, fdETD, fdETA, fdExitDate, fdGudang).
  - `GET /api/shipments/:id/dimensions/packinglist`: Daftar rincian dimensi packing list per koli.
  - `GET /api/shipments/:id/dimensions/gudang`: Daftar rincian ukuran fisik aktual gudang (`tbEntryListDetail`).
  - `GET /api/shipments/:id/dimensions/komplain`: Daftar rincian dimensi komplain selisih ukuran.

##### 2. Data Batch Marking
- **Method**: `GET`
- **Endpoint**: `/api/marking`
- **Query Params**:
  - `limit=20`
  - `search=<keyword>` (kode batch marking, BL/AWB, consignee, kontainer)
  - `listType=ALL|1|2` (**Filter tambahan**: `ALL` / Semua, `1` = Udara, `2` = Laut)
  - `isClosed=true|false` (opsional: status keluar gudang)

##### 2.1. Saran Pencarian Batch Marking
- **Method**: `GET`
- **Endpoint**: `/api/marking/suggestions`
- **Query Params**:
  - `q=<keyword>`
- **Response**: Mengembalikan saran cepat kode marking dan consignee dalam waktu ~50ms.
- **Data Kunci yang Ditampilkan**:
  - `fdMarkingCode`: Kode batch container/marking
  - `fdBranch`: Cabang pelabuhan / gudang asal
  - `fdKet`: Keterangan muatan batch
  - **Hirarki Tanggal & Label Status** (tampilkan tanggal pertama yang tidak `null` dengan keterangan):
    1. `fdExitDate` $\to$ `Exit <DD-MM-YYYY>` (sudah keluar dari gudang)
    2. `fdETA` $\to$ `ETA <DD-MM-YYYY>` (perkiraan tiba di tujuan)
    3. `fdETD` $\to$ `ETD <DD-MM-YYYY>` (perkiraan berangkat)
    4. `fdLoadDate` $\to$ `Load <DD-MM-YYYY>` (tanggal muat/loading kontainer)
    5. Jika seluruhnya null $\to$ `—`
  - `fdJmlPack` & `fdJmlBerat`: Akumulasi jumlah pack/koli dan berat (kg) dalam batch
- **Tautan Menampilkan Data Manifest Per Batch**:
  - **Endpoint**: `GET /api/marking/:id/manifest` (dimana `:id` adalah `fdMarkingCode`)
  - **Deskripsi**: Menampilkan seluruh rincian manifest shipment (`vwShipment`) dalam batch terpilih dengan bottom sheet modal yang memuat:
    - **Header & Keterangan**: Kode batch marking, nomor kontainer (jika ada), cabang gudang asal, dan keterangan batch (`fdKet`).
    - **Panel Ringkasan KPI (4-Metric Grid)**:
      1. **Total Koli**: Akumulasi seluruh `fdJmlPack` dalam manifest (`formatNumber`).
      2. **Total Berat**: Akumulasi seluruh berat `fdJmlBerat` dalam kg (`formatDecimal(totalBerat, 1)` kg).
      3. **Total Volume**: Akumulasi volume kubikasi `fdM3` (`formatDecimal(totalM3, 4)` m³).
      4. **Customer & Resi**: Perhitungan jumlah pelanggan unik (`Set<fdCustName>`) dan total nomor resi yang tergabung.
    - **Baris Kartu Resi Manifest (`renderItem`)**:
      - Nomor urut dan nomor resi/terima (`fdTerima` / `fdListCode`) + Marking No (`fdMarkingNo`).
      - Nama Customer (`displayCustName(fdCustName)`) dan Badge Nama Sales (`fdSalesNM`).
      - Informasi Komoditas & Tipe Komoditas: Kotak panel bergaris tepi memuat Badge Tipe Komoditas (`typeComodityName` / `fdComodityName`) dan deskripsi barang (`fdComodity`) yang dibungkus rapi (*natural word wrap*) tanpa pemotongan / overflow horizontal.
      - Rincian fisik: Jumlah Koli & Satuan (`fdJmlPack`, `fdSatuan`), Berat (`fdJmlBerat` kg), dan Kubikasi (`fdM3` m³).
    - **Pencarian Real-Time Manifest (`searchQuery`)**:
      - Kolom pencarian instan di bawah 4-Metric KPI Grid dengan placeholder bilingual (`t('logistics.searchManifestPlaceholder')`).
      - Memfilter daftar item manifest secara langsung (*client-side instant filtering*) mencakup: nomor resi (`fdTerima`, `fdListCode`), tanda marking (`fdMarkingNo`), nama customer (`fdCustName`), deskripsi & tipe komoditas (`fdComodity`, `typeComodityName`), sales PIC (`fdSalesNM`), dan kode cabang (`fdBranchCode`).
      - Menampilkan indikator hitung item tersaring: *"Menampilkan X dari Y item"* dan tombol hapus cepat (`X`).

##### 3. Data Surat Jalan (Delivery Order)
- **Method**: `GET`
- **Endpoint**: `/api/delivery-orders`
- **Query Params**:
  - `limit=20`
  - `search=<keyword>` (nomor surat jalan, customer, nama supir, plat mobil)
- **Data Kunci yang Ditampilkan**:
  - `fdSJNo`: Nomor surat jalan resmi
  - `fdSJDate`: Tanggal pembuatan surat jalan
  - `fdCustNameSJ`: Nama customer tujuan / penerima barang
  - `fdSupir`: Nama pengemudi / supir armada
  - `fdCarID`: Nomor plat mobil armada pengantaran
  - `fdEstimasi`: Perkiraan tanggal kirim barang
  - `fdSent`: Indikator status kirim (`1` = sudah terkirim, `0` = belum terkirim)
  - `fdGiveDate`: Tanggal surat jalan sudah diserahkan ke kantor
  - `fdJmlPackSJ` & `fdJmlBeratSJ`: Total muatan pack dan berat pada surat jalan
  - **Logika Penentuan Status Pengantaran (`fdStatus`)**:
    - **`Delivered`**: Apabila `fdSent === 1` (sudah terkirim)
    - **`On Delivery`**: Apabila tanggal sekarang $\ge$ `fdEstimasi` dan `fdSent === 0`
##### 3.1. Saran Pencarian Surat Jalan (Delivery Order)
- **Method**: `GET`
- **Endpoint**: `/api/delivery-orders/suggestions`
- **Query Params**:
  - `q=<keyword>`
- **Response**: Mengembalikan saran nomor SJ, customer, dan supir dalam waktu ~10ms.

---

### 3.6. Halaman Keuangan & Billing (`app/(tabs)/finance.tsx`)

#### A. Tujuan & Logika
Manajemen piutang dan tagihan pelanggan, audit validasi kebenaran tarif dan ukuran fisik (M3 vs KG), serta kalkulator tarif instan untuk estimasi biaya di lapangan.

1. **Segmented Tabs Navigasi**:
   - **Tab 1: Daftar Invoice (`billing`)**
   - **Tab 2: Audit Validasi (`validation`)**
   - **Tab 3: Cek Tarif (`priceLookup`)**
2. **Sub-Tab 1: Daftar Invoice**:
   - Menampilkan daftar tagihan resmi dengan nomor invoice (`fdInvNo`), status pembayaran (`LUNAS`, `PARTIAL`, `ISSUED`, `OVERDUE`, `DRAFT`), nama customer resmi (`displayCustName`), **Marking (`fdMarkingCode`)**, **No. Marking (`fdMarkingNo`)**, tanggal tagihan, dan **Total Tagihan (`totalJumlah` / `formatCurrency`)**.
   - **Modal Detail Invoice Komprehensif (Paritas Penuh dengan `DetailPage.tsx` Web)**:
      - Saat item invoice disentuh, aplikasi membuka lembar modal detail (`InvoiceDetailSheet`) yang secara otomatis memuat data lengkap invoice via TanStack React Query (`GET /api/billing/:id`).
      - **4 Kartu Informasi Utama**:
        1. **Pelanggan**: Nama pelanggan resmi, kode customer, badge status pelanggan (`NORMAL`, `BLOCKED`, `COD`, `WARNING`, `URGENT`), badge `BROKER (MKT)` / `MKT`, nama sales, dan alamat penagihan.
        2. **Waktu & Pembuat**: Tanggal invoice, tanggal terbit (`fdGiveDate` atau badge `DRAFT`), diserahkan oleh (`giveEmployee`), dan author pembuat bill (`employee`).
        3. **Status Pembayaran (Kasir)**: Status badge (`✓ LUNAS`, `SEBAGIAN`, `BELUM BAYAR`), no. kasir (`cashierID`), tanggal pembayaran (`cashierDate`), dan total dibayar (`totalPaid`).
        4. **Marking & Komoditi**: Marking code & no, badge consignee (dengan verifikasi hak akses role `canViewConsignee`), badge `PARSIAL`, chips nomor resi (`resiSummary.resiList`), komoditi (dengan layout auto-wrap multi-baris agar tidak overflow) & tipe komoditi, tanggal agent, serta tombol salin info marking lengkap.
      - **Rincian Item Tagihan**: Tabel / baris item lengkap (`fdItemName`, kuantiti & unit `fdListCode`, harga satuan `fdItemPrice`, dan total `fdTotal`).
      - **Footer Ringkasan & Total**: Breakdown akumulasi per satuan (TOTAL KG, TOTAL M3, TOTAL VOLUME FREIGHT CHARGES VFC) serta nominal **TOTAL TAGIHAN** tebal dengan format mata uang yang tepat.
      - **Aksi Dokumen Terpadu (Dilindungi Biometrik)**:
        - **Cetak PDF (`Print.printAsync`)**: Membuka dialog cetak native Android/iOS (ke printer WiFi/Bluetooth atau simpan ke memori). Dilindungi **verifikasi biometrik** (Fingerprint / Face ID) sebelum dialog terbuka.
        - **Bagikan PDF (`Sharing.shareAsync`)**: Mengompilasi PDF dan membuka pemilih berbagi native (WhatsApp, Telegram, Gmail, Google Drive). Dilindungi **verifikasi biometrik** sebelum file dibagikan.
        - **Format Dokumen 100% Identik Web (`PrintPage.tsx`)**: Menggunakan generator HTML di `billing-pdf.utils.ts` dengan spesifikasi A5 Landscape ($210\,\text{mm} \times 148\,\text{mm}$), 2 boks header proporsional ($62.4\%$ vs $37.6\%$), tabel 4 kolom dengan angka rata kanan & satuan rata kiri, baris pengisi (*spacer row*), footer terbilang otomatis Bahasa Indonesia via `terbilang.ts`, watermark `"COPY"`, serta catatan `"Printed by"`.
        - **Salin Nomor Invoice**: Menyalin nomor invoice ke clipboard dengan haptic feedback.
3. **Sub-Tab 2: Audit Validasi Tagihan (Sinkron Penuh dengan ERP Web)**:
   - Akses sub-tab Audit Validasi ini dilindungi oleh kontrol izin akses (`canViewBillingValidation`), hanya muncul jika pengguna memiliki hak akses role validasi atau admin.
   - Menampilkan daftar antrean validasi aktif sinkron dengan `http://36.93.22.142/mshipping/finance/billing/validation/list`.
   - Query endpoint: `/api/billing?hasAmount=true&draftOnly=true&noPagination=true&minYear=2023`.
   - Menampilkan nomor invoice, badge umur invoice (Aging Days: Baru, Perhatian, Kritis), badge moda (Udara / Laut), nama customer resmi, marking & nomor, nama pembuat / PIC invoice, serta nominal rupiah tagihan.
   - Mendukung dropdown suggestions via `/api/billing/suggestions`.
   - Membuka modal rincian invoice dan preview tagihan langsung.
4. **Sub-Tab 3: Cek Tarif (Price List Lookup)**:
   - Menggantikan kalkulator statis lama dengan sistem lookup tarif master resmi & khusus pelanggan:
   - **Sub-Tab Tarif Umum (Master)**:
     - Filter Moda: `Semua`, `Udara`, `Laut`.
     - Filter Cabang Asal: `ALL`, `GZ`, `HK`, `SG`, `YW`, `SH`.
     - **Cari Cepat by Resi / Entry Code**: Mengakses `/api/price-list/lookup-by-entry` untuk mendeteksi tarif pengiriman spesifik secara instan.
     - **Daftar Tarif Master**: Menampilkan kategori barang, tarif rupiah per kg atau per m³, cabang, serta estimasi waktu transit.
   - **Sub-Tab Tarif Khusus Customer**:
     - Kolom pencarian customer dengan *autocomplete dropdown* langsung dari `/api/customers/suggestions`.
     - Menampilkan kartu tarif khusus pelanggan terpilih: kategori barang, tarif khusus, moda & cabang, tanggal berlaku, dan catatan khusus.

#### B. Endpoint API Terkait

##### 1. Data Daftar Tagihan (Billing)
- **Method**: `GET`
- **Endpoint**: `/api/billing`
- **Query Params**:
  - `limit=20`
  - `search=<keyword>` (nomor invoice atau nama customer)
- **Data Kunci yang Ditampilkan**:
  - `fdInvNo`: Nomor invoice tagihan resmi
  - `fdCustName`: Nama customer resmi (diprioritaskan dari master `tbCustomers`)
  - `fdMarkingCode`: Kode batch marking container/flight
  - `fdMarkingNo`: Nomor marking fisik karton muatan
  - `fdInvDate`: Tanggal penerbitan invoice
  - `totalJumlah` / `fdTotalAmount`: Total nilai rupiah tagihan resmi
  - `paymentStatus`: Status pembayaran (`LUNAS`, `PARTIAL`, `ISSUED`, `OVERDUE`, `DRAFT`)

##### 1.1. Saran Pencarian Invoice & Tagihan
- **Method**: `GET`
- **Endpoint**: `/api/billing/suggestions`
- **Query Params**:
  - `q=<keyword>`
- **Response**: Mengembalikan saran nomor faktur dan customer dalam waktu ~30ms.

##### 2. Data Audit Validasi Tagihan
- **Method**: `GET`
- **Endpoint**: `/api/billing`
- **Query Params**:
  - `hasAmount=true`
  - `draftOnly=true`
  - `noPagination=true`
  - `minYear=2023`
  - `search=<keyword>`
- **Data Kunci yang Ditampilkan**:
  - `fdInvNo`: Nomor invoice
  - `fdCustName`: Nama customer
  - `agingDays`: Hari keterlambatan validasi sejak invoice dibuat
  - `employee.fdEmpName`: Nama staf pembuat invoice
  - `totalJumlah` / `fdTotalAmount`: Nominal rupiah validasi

##### 3. Lookup Tarif Master & Customer
- **Method**: `GET`
- **Endpoint**:
  - `/api/price-list/lookup`: Lookup tarif umum berdasarkan tanggal, moda, cabang, dan kategori.
  - `/api/price-list/lookup-by-entry`: Deteksi otomatis tarif yang berlaku berdasarkan nomor resi/entry.
  - `/api/customer-price-list/lookup`: Lookup tarif khusus pelanggan tertentu berdasarkan `custCode`.

---

### 3.7. Halaman Master Data Customer (`app/(tabs)/master.tsx`)

#### A. Tujuan & Logika
Direktori data pelanggan resmi (*Single Source of Truth* `tbCustomers`) yang dirancang identik dengan tampilan Web Frontend (`http://36.93.22.142/mshipping/master/customers`) dan modal detail 5-tab lengkap.

1. **Tampilan Kartu Pelanggan (Sama Seperti Frontend Web)**:
   - **Top Row**:
     - Kode Customer dalam font monospace (`fdCustCode`)
     - Badge Customer Tier (`DIAMOND`, `PLATINUM`, `GOLD`, `SILVER`, `BRONZE`)
     - Badge `BROKER` (apabila `fdBroker === 1`)
     - Badge `DISCONTINUED` (apabila `fdDiscontinued === 1`)
     - Badge Masa Bergabung / Tenure (`formatCustomerTenure`, misal: `Baru`, `6 bln`, `3 thn`)
     - Badge Status Hubungan Pelanggan (`NORMAL`, `OK`, `COD`, `WARNING`, `BLOCKED`, `URGENT` dari `fdBlocked`)
   - **Nama Customer & Omset**:
     - Nama Customer resmi yang disanitasi (`displayCustName`)
     - Badge Omset Tahunan berjalan (`formatCompactRupiah(annualRevenue)`) jika tersedia
   - **Baris Kota & Alamat**:
     - Ikon gedung `Building2`, Kota Operasional/Pengiriman, dan pratinjau alamat fisik
   - **Kotak Rincian (Inner Box)**:
     - Contact Person (CP: `fdContact`)
     - Sales Representative (Sales: `fdSalesNM`)
     - Nomor Kontak/HP (`fdHP` / `fdTelp`)
     - Tautan Aksi cepat *"Detail"*
   - **Aksi Cepat Komunikasi**:
     - Tombol **Telepon**: Membuka dialer telepon ponsel langsung (`tel:...`)
     - Tombol **WhatsApp**: Membuka WhatsApp langsung dengan standarisasi kode negara 62 (`https://wa.me/...`)
2. **Modal Detail Customer 3-Tab (Sama Persis Seperti Frontend Web)**:
   Modal dialog tinggi statis (`height: 86%`) dengan internal scroll yang memuat 3 tab navigasi ringkas:
   - **Tab 1: Ringkasan (`info`)**:
     - Kartu Contact Person & Kartu Sales Representative
     - Rincian Saluran Kontak: Telepon Kantor, Handphone / WA (dengan tombol Panggil & WA instan), Email, Kota Operasional
     - Alamat Kantor / Utama (`fdAddr1`, `fdAddr2`)
     - Catatan Keterangan operasional (`fdKeterangan`)
   - **Tab 2: Finansial (`finansial`)**:
     - Kartu Tier Aktif, Omset Tahunan Berjalan, dan Total Invoice
     - Progress Bar ke Tier Berikutnya (persentase & nominal sisa target belanja)
     - Tabel Riwayat Finansial & Omzet Billing per Tahun (`financialStats`: Tahun, Omzet Rupiah, Jumlah Invoice, Tier)
   - **Tab 3: Daftar Alamat (`alamat`)**:
     - Daftar kartu alamat resmi (`addresses` / `vwCustomerContacts`):
     - Badge Jenis Alamat (`PENGHUBUNG`, `PENGIRIMAN`, `PENAGIHAN`)
     - Badge Status Keaktifan (`Aktif` / `Non-Aktif`)
     - Nama PIC Alamat (`fdContact`)
     - Alamat Lengkap & Kota (`fdAddr`, `fdCity`)
     - Telepon / Handphone (`fdHP`, `fdTelp`) dengan tombol dialer langsung.

#### B. Endpoint API Terkait

##### 1. Daftar Pelanggan
- **Method**: `GET`
- **Endpoint**: `/api/customers`

##### 1.1. Saran Pencarian Customer
- **Method**: `GET`
- **Endpoint**: `/api/customers/suggestions`
- **Query Params**:
  - `q=<keyword>`
- **Response**: Mengembalikan saran nama customer, kode, dan PIC dalam waktu < 200ms.
- **Query Params**:
  - `limit=25`
  - `search=<keyword>`

##### 2. Detail Pelanggan & Alamat Cabang
- **Method**: `GET`
- **Endpoint**: `/api/customers/:id` (dimana `:id` adalah `fdCustCode`)
- **Response**: Objek customer lengkap termasuk relasi `addresses` (`vwCustomerContacts`).

---

### 3.8. Halaman Profil & Pengaturan (`app/(tabs)/profile.tsx`)

#### A. Tujuan & Logika
Manajemen akun pengguna, konfigurasi keamanan biometrik, preferensi antarmuka (tema dan bahasa), pemantauan konektivitas backend ERP, dan sesi logout.

1. **Kartu Header Pengguna & Avatar Interaktif**:
   - Menampilkan foto avatar pengguna (`user.avatarUrl`) yang di-resolve otomatis via `resolveAvatarUrl(user.avatarUrl)` ke backend `http://36.93.22.142:3010/uploads/...`.
   - Jika foto belum diunggah, menampilkan inisial nama tebal (`getInitials(fullName)`).
   - Dilengkapi badge ikon kamera di sudut avatar; mengetuk avatar membuka modal aksi foto profil (`AvatarModal.tsx`).
   - Nama lengkap (`user.fullName`) dan username (`user.username`).
   - Badge peran sistem (`ADMIN`, `OPERATOR`, `FINANCE`, `VIEWER`).
2. **Kamera Avatar Mandiri (`AvatarModal.tsx`)**:
   - Memanfaatkan modul kamera perangkat keras `expo-camera` (`CameraView`) yang sudah terkompilasi dalam APK.
   - Pilihan:
     - **Ambil Foto (Kamera)**: Membuka viewfinder kamera layar penuh dengan panduan lingkaran wajah (*circular mask guide*), switch kamera depan/selfie atau belakang (`facing: 'front' | 'back'`), dan senter (*torch*).
     - Pengambilan foto via `takePictureAsync({ base64: true, quality: 0.7 })`.
     - Pratinjau instan (*instant preview*) dengan tombol "Ambil Ulang" dan "Gunakan Foto".
     - Mengunggah foto berformat Base64 langsung ke `POST /api/profile/avatar`, otomatis menyinkronkan state global `authStore` dan memicu toast konfirmasi sukses.
     - **Hapus Foto Profil**: Memanggil `DELETE /api/profile/avatar`, menghapus foto dari storage/database, dan mengembalikan tampilan ke inisial nama.
3. **Pengaturan Keamanan & Ganti Kata Sandi**:
   - **Ganti Kata Sandi (`ChangePasswordModal.tsx`)**:
     - Form ganti kata sandi mandiri: Kata Sandi Saat Ini, Kata Sandi Baru, dan Konfirmasi Kata Sandi Baru.
     - Dilengkapi tombol intip kata sandi (*eye toggle*), validasi panjang minimal 6 karakter, serta indikator visual kecocokan kata sandi (*real-time match badge*).
     - Mengirimkan permintaan pembaruan ke `PUT /api/profile/password`.
   - **Login Biometrik (Fingerprint / FaceID)**:
     - Switch toggle login biometrik.
     - Memanggil `biometricService.authenticate()` sebelum mengaktifkan atau menonaktifkan agar keamanan terverifikasi.
4. **Preferensi Tampilan**:
   - Switcher tema antara **Midnight (Dark Mode)** dan **Heritage (Light Mode)**.
   - Mengubah palet warna dinamis di seluruh komponen UI. State tema dikelola secara lokal di `profile.tsx` (tidak ada Zustand `themeStore` terpisah di mobile — berbeda dengan frontend web).
5. **Preferensi Bahasa**:
   - Switcher bahasa bilingual antara 🇮🇩 **Bahasa Indonesia** (`id`) dan 🇬🇧 **English** (`en`).
   - Mengubah kamus terjemahan visual via custom hook `useTranslation()`.
6. **Informasi Sistem & Status ERP**:
   - Menampilkan status live koneksi sistem ERP (`Terhubung • Operasional Normal`) tanpa mengekspos alamat IP backend.
   - Menampilkan badge status server `ONLINE`.
7. **Versi Aplikasi & Fitur Cek Pembaruan (Auto Update)**:
   - Menampilkan versi aktif aplikasi saat ini (misal `v1.0.5` yang bersumber dari `mobile/src/config/version.ts`).
   - Tombol interaktif **"Cek Pembaruan"** (`RefreshCw` / `Sparkles`):
     - Menjalankan pengecekan versi ke backend `GET /api/app-version/latest`.
     - Jika versi server lebih baru: memicu modal dialog pembaruan (`UpdateModal`) dan mengubah badge menjadi `UPDATE` merah.
     - Jika sudah versi terbaru: memicu toast konfirmasi sukses *"Aplikasi sudah dalam versi terbaru"*.
8. **Aksi Keluar (Logout)**:
   - Tombol *"Keluar dari Akun"* memunculkan dialog konfirmasi bawaan.
   - Jika disetujui:
     - Token dan kredensial dihapus secara permanen dari `expo-secure-store`.
     - State autentikasi direset.
     - Pengguna diarahkan kembali ke layar `/(auth)/login`.

#### B. Endpoint API Terkait
- `POST /api/profile/avatar`: Mengunggah foto profil baru pengguna (mendukung payload JSON `{ avatarBase64: 'data:image/jpeg;base64,...' }` maupun `multipart/form-data`).
- `DELETE /api/profile/avatar`: Menghapus foto profil pengguna dan mereset ke `avatarUrl: null`.
- `PUT /api/profile/password`: Mengubah kata sandi pengguna (`{ currentPassword, newPassword, confirmPassword }`).
- `GET /api/app-version/latest`: Pengecekan metadata versi aplikasi, ukuran file APK, dan catatan rilis (*changelog*).
- Operasional lokal berbasis state session pengguna yang diperoleh dari response `/api/auth/login` dan `/api/auth/me`.

---

### 3.9. Komponen Barcode Scanner Modal (`BarcodeScannerModal.tsx`)

#### A. Tujuan & Logika
Komponen pemindai kamera hardware modular yang dapat dipanggil dari berbagai halaman (Dashboard Overview, Tab Logistik):
1. **Manajemen Izin**:
   - Memeriksa izin akses kamera perangkat melalui `useCameraPermissions()`.
   - Menampilkan tombol *"Berikan Izin Kamera"* jika akses belum disetujui pengguna.
2. **Kamera & Deteksi Format**:
   - Menggunakan `CameraView` dari `expo-camera`.
   - Mendukung berbagai standar barcode logistik internasional:
     - `qr`, `code128`, `code39`, `ean13`, `ean8`, `upc_a`, `upc_e`, `pdf417`, `datamatrix`.
3. **Fitur Torch / Senter**:
   - Tombol toggle lampu senter (`Zap` / `ZapOff`) untuk pemindaian di area gudang yang minim cahaya.
4. **Feedback & Routing**:
   - Begitu barcode terdeteksi, sistem memicu getaran konfirmasi `Haptics.notificationAsync(Success)`.
   - Mengirim nilai barcode ke callback `onScanned(data)`.
   - Nilai barcode otomatis disuntikkan ke kolom filter pencarian list terkait.

---

### 3.10. Komponen Dialog Auto Update & Sistem Update Mandiri (`UpdateModal.tsx` & `updateStore.ts`)

#### A. Tujuan & Logika
Menangani alur pembaruan aplikasi mobile secara mandiri (*self-hosted automated update*) tanpa ketergantungan pada Google Play Store dan tanpa perlu unduh manual lewat browser Chrome:
1. **Single Source of Truth Versi (`mobile/src/config/version.ts`)**:
   - Versi aplikasi didefinisikan secara statis melalui `APP_VERSION = '1.0.9'` dan `APP_VERSION_CODE = 10` di `mobile/src/config/version.ts`.
   - Menjamin versi tertanam langsung ke dalam bundle JavaScript/Hermes bytecode (mencegah nilai `null` pada `Constants.expoConfig` di lingkungan APK standalone).
2. **Pemeriksaan Versi Latar Belakang (Otomatis)**:
   - Pada `app/_layout.tsx`, `useUpdateStore.checkUpdate(false)` dieksekusi secara hening saat aplikasi dibuka.
   - Membandingkan `currentVersion` terhadap `latestVersion` dari endpoint backend `/api/app-version/latest`.
   - **Dismissed Version State**: Jika pengguna pernah menekan tombol "Nanti Saja" untuk versi tersebut, modal tidak akan muncul otomatis lagi saat pembukaan aplikasi berikutnya demi kenyamanan pengguna (kecuali jika disetel `forceUpdate: true` oleh server atau dicek manual via tab Profil).
3. **Mekanisme Update Otomatis Tanpa Instalasi Manual**:
   - **Jalur 1: Over-The-Air (OTA) Updates (`expo-updates`)**:
     - Jika module native `expo-updates` aktif (`Updates.isEnabled`), aplikasi memeriksa manifest ke endpoint backend `GET /api/manifest`.
     - Jika bundle baru tersedia, bytecode Hermes (`.hbc`) diunduh di latar belakang via `/api/manifest/bundle` dan aplikasi langsung me-reload kode baru secara instan (`Updates.reloadAsync()`) **tanpa perlu instal ulang APK sama sekali**.
   - **Jalur 2: In-App Direct APK Downloader & Automated Installer**:
     - Jika rilis berupa binary APK baru, aplikasi mengunduh berkas APK langsung di dalam aplikasi menggunakan `expo-file-system/legacy` (`FileSystem.createDownloadResumable`).
     - Menampilkan indikator persentase unduhan *real-time* dan animasi progress bar di dalam modal (`0% - 100%`, ukuran MB terunduh vs total MB).
     - Begitu unduhan selesai, aplikasi secara otomatis memicu Android Package Installer sistem via `Sharing.shareAsync(uri, { mimeType: 'application/vnd.android.package-archive' })` sehingga dialog instalasi sistem langsung muncul di layar ponsel tanpa harus membuka browser atau mencari berkas di folder Download.
   - **Fallback Browser**: Tautan alternatif *"Unduh via Halaman Web QR"* tetap disediakan jika pengguna ingin mengunduh secara manual via browser.

---

## 📊 4. Matriks Ringkasan Endpoint API Backend Mobile

| No | Modul / Halaman | Endpoint API | HTTP Method | Parameter / Body Kunci | Tipe Data yang Ditampilkan |
|:---|:---|:---|:---:|:---|:---|
| **1** | Autentikasi | `/api/auth/login` | `POST` | `{ username, password }` | Token JWT, Profil User, Role |
| **2** | Autentikasi | `/api/auth/me` | `GET` | Header `Authorization: Bearer` | Verifikasi token biometrik |
| **3** | Registrasi | `/api/auth/register` | `POST` | `{ fullName, username, password }` | Konfirmasi pendaftaran akun |
| **4** | Dashboard - Exit Activity KPI | `/api/marking/kpi` | `GET` | `isClosed=true` | Ringkasan batch keluar: kemarin, hari ini, besok, total |
| **5** | Dashboard - Exit Activity List | `/api/marking` | `GET` | `isClosed=true`, `limit=10`, `sortBy=fdExitDate`, `sortDir=desc` | Daftar batch exit terkini: marking, kontainer/AWB, cabang, consignee, tanggal, koli, berat |
| **6** | Logistik - Resi | `/api/shipments` | `GET` | `skip`, `limit` (Awal: 10, Scroll: +5), `search`, `listType` | Nomor resi, marking code/no, customer name, koli, berat, volume, `fdBranchCode` |
| **7** | Logistik - Saran Resi | `/api/shipments/suggestions` | `GET` | `q` (min. 2 karakter) | Rekomendasi auto-suggest 4-kategori: Resi (`fdTerima`), Customer, Marking Code, Marking No |
| **8** | Logistik - Batch | `/api/marking` | `GET` | `limit=20`, `search`, `listType` (`ALL`, `1`, `2`) | Kode batch marking, cabang, `fdKet`, hirarki tanggal (`Exit`/`ETA`/`ETD`/`Load`) |
| **9** | Logistik - Manifest Batch | `/api/marking/:id/manifest` | `GET` | Path `id` (`fdMarkingCode`) | Rincian resi manifest (`vwShipment`): resi, customer, pack, satuan, berat, m³ |
| **10** | Logistik - Surat Jalan | `/api/delivery-orders` | `GET` | `limit=20`, `search` | `fdSJNo`, `fdCustNameSJ`, `fdSupir`, `fdCarID`, `fdEstimasi`, `fdSent`, `fdGiveDate` |
| **11** | Finance - Invoice | `/api/billing` | `GET` | `limit=20`, `search` | No. inv, nama customer, marking, no. marking, tanggal, total tagihan |
| **12** | Finance - Validasi | `/api/billing` | `GET` | `hasAmount=true`, `draftOnly=true`, `noPagination=true`, `minYear=2023` | Antrean validasi: aging days, moda, customer, marking, PIC, nominal |
| **13** | Finance - Saran Invoice | `/api/billing/suggestions` | `GET` | `q` (min. 2 karakter) | Saran nomor invoice dan nama customer |
| **14** | Finance - Lookup Tarif Umum | `/api/price-list/lookup` | `GET` | `mode`, `branch`, `date` | Tarif master per kg/m³, moda, cabang, transit |
| **15** | Finance - Lookup by Resi | `/api/price-list/lookup-by-entry` | `GET` | `entryCode` | Tarif spesifik berdasarkan nomor resi/entry |
| **16** | Finance - Lookup Tarif Customer | `/api/customer-price-list/lookup` | `GET` | `custCode` | Tarif khusus pelanggan: kategori, moda, cabang, tanggal berlaku |
| **17** | Master Customer | `/api/customers` | `GET` | `limit=25`, `search` | Nama customer master, telepon, sales, tier, omset |
| **18** | Master Customer - Saran | `/api/customers/suggestions` | `GET` | `q` (min. 2 karakter) | Saran nama customer, kode, dan PIC |
| **19** | Master Customer - Detail | `/api/customers/:id` | `GET` | Path `id` (`fdCustCode`) | Detail customer lengkap termasuk `addresses` (`vwCustomerContacts`), `penagihanDetail` (`tbCustomerPenagihan`), `financialStats` |
| **20** | Sistem & Auto Update | `/api/app-version/latest` | `GET` | None | Versi terbaru, changelog, URL APK, size |
| **21** | Self-Hosted OTA Manifest | `/api/manifest` | `GET` | Headers: `expo-runtime-version`, `expo-platform` | Manifest Expo Updates, launchAsset URL, metadata |
| **22** | Self-Hosted OTA Bundle | `/api/manifest/bundle` | `GET` | None | Berkas bytecode JavaScript/Hermes (`.hbc`) |
| **23** | Profil - Upload Avatar | `/api/profile/avatar` | `POST` | `{ avatarBase64 }` atau multipart file | Status sukses, `avatarUrl`, objek user |
| **24** | Profil - Hapus Avatar | `/api/profile/avatar` | `DELETE` | None | Status sukses penghapusan foto profil |
| **25** | Profil - Ganti Password | `/api/profile/password` | `PUT` | `{ currentPassword, newPassword, confirmPassword }` | Pesan konfirmasi pembaruan password |

---

## 🛡️ 5. Standar Penanganan Error & Pengalaman Pengguna (UX)

1. **Skeleton Shimmer Loading State**:
   - Seluruh daftar data menggunakan komponen wireframe animasi shimmer (`SkeletonShimmer.tsx`) saat proses pemuatan pertama (*initial load*).
   - DILARANG menggunakan fullscreen spinner bulat yang menghalangi konten.
2. **Desain Bersih Bebas Ikon pada List Data & Tab**:
   - Seluruh tab navigasi atas (`SegmentedControl`) dan item list data bersih dari ikon dan emoji untuk estetika korporat modern.
   - Menggunakan tipografi proporsional (`11.5px font-semibold` dengan `numberOfLines={1}` dan `adjustsFontSizeToFit`) agar teks tab tidak terlipat (*zero wrapping discrepancy*) baik pada HP berlayar kecil (360dp) maupun besar (412dp+).
   - Header kartu list mengikat judul muatan dalam `flex: 1` dengan batasan `minWidth: 0, marginRight: 8` serta `flexShrink: 0` pada badge status sehingga badge tidak terdorong atau gepeng di layar sempit.
3. **Haptic Tactile Feedback**:
   - Setiap ketukan tombol navigasi, filter mode, pemindaian barcode sukses, dan penyalinan teks memicu getaran proporsional (`Light`, `Medium`, `Success`, `Error`).
4. **Format Representasi Data Standar**:
   - Seluruh angka dan mata uang diformat menggunakan utilitas terpusat:
     - Mata Uang: `formatCurrency(amount)` $\to$ `Rp 1.500.000`
     - Berat Fisik: `formatDecimal(weight, 1)` $\to$ `350,5 kg`
     - Volume Fisik: `formatDecimal(volume, 4)` $\to$ `1,2540 m³`
     - Angka Koli / Counter: `formatNumber(coly)` $\to$ `1.420`
     - Tanggal: `formatDate(date)` $\to$ `12 Sep 2026`
5. **Single Source of Truth Customer**:
   - Nama customer yang muncul di seluruh modul (Dashboard, Logistik, Finance, dan Master) selalu terikat dan memprioritaskan data master `tbCustomers.fdCustName`.

---

## 📲 6. Prosedur Distribusi & Pemasangan APK (Sideloading & In-App Update)

Aplikasi didistribusikan secara mandiri di server on-premise perusahaan:
1. **Titik Akses Unduhan Resmi**:
    - **URL Unduh Langsung**: `http://36.93.22.142/mshipping/mshipping.apk`
    - **URL Mirror Backend API**: `http://36.93.22.142:3010/uploads/mshipping.apk`
    - **Landing Page QR Scanner**: `http://36.93.22.142/mshipping/download/`
2. **Alur Pembaruan Aplikasi**:
    - Ketika dialog "Pembaruan Tersedia" atau "Pembaruan Wajib" muncul, pengguna mengetuk tombol **"Perbarui Sekarang"**.
    - Aplikasi memicu Android Download Manager via `Linking.openURL()` untuk mengunduh berkas APK secara andal di latar belakang.
    - Notifikasi unduhan sistem Android menampilkan progres unduhan secara transparan.
    - Begitu unduhan selesai, pengguna cukup mengetuk notifikasi untuk langsung memasang pembaruan (*1-tap update*).
