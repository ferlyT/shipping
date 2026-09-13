# 📱 Dokumentasi Lengkap Aplikasi Mobile M-Shipping (Logika & Integrasi Endpoint)

Dokumen ini menjelaskan secara menyeluruh seluruh halaman pada aplikasi mobile **M-Shipping** (Expo SDK 57 / React Native 0.86 / TypeScript / Hono.js Backend), termasuk logika interaksi, manajemen state, integrasi hardware, serta data yang ditampilkan dari setiap endpoint API backend.

---

## 🏗️ 1. Arsitektur Teknis & Konfigurasi Jaringan

### Stack Teknologi
- **Framework Mobile**: Expo SDK 57 (React Native 0.86, React 19.2, TypeScript 6.0)
- **Routing**: Expo Router v4 (File-based Routing di folder `mobile/app/`)
- **State Management**: Zustand v5 (`authStore`, `themeStore`, `toastStore`, `updateStore`)
- **Server State & Caching**: TanStack React Query v5 (dengan refetching & cache invalidation)
- **Komunikasi REST**: Axios via `mobile/src/api/client.ts`
- **Penyimpanan Kredensial**: `expo-secure-store` (Enkripsi KeyStore Android / Keychain iOS)
- **Versi Rilis Saat Ini**: `v1.0.3` (Build/VersionCode: `4`, Single Source of Truth di `mobile/src/config/version.ts`)
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
mobile/app/
├── _layout.tsx           # Root Provider (QueryClient, Theme, Toast, Auth Init)
├── index.tsx             # Splash Screen & Gatekeeper Redirection
├── (auth)/               # Layar Autentikasi
│   ├── _layout.tsx       # Auth Stack Layout
│   ├── login.tsx         # Halaman Masuk (Manual & Biometrik)
│   └── register.tsx      # Halaman Pendaftaran Akun Baru
└── (tabs)/               # 5 Modul Utama (Bottom Tab Navigator)
    ├── _layout.tsx       # Bottom Tabs Navigation Bar (Dynamic Safe Area Insets)
    ├── overview.tsx      # Tab 1: Dashboard Eksekutif & Ringkasan KPI
    ├── logistics.tsx     # Tab 2: Resi, Batch Marking, & Surat Jalan
    ├── finance.tsx       # Tab 3: Daftar Invoice, Audit Validasi, & Kalkulator Tarif
    ├── master.tsx        # Tab 4: Direktori Pelanggan & Kontak Langsung
    └── profile.tsx       # Tab 5: Akun, Biometrik, Tema, Bahasa, & Status ERP
```

> **Catatan Penanganan Safe Area Insets Bawah (Android Navigation Bar)**:
> Pada `mobile/app/(tabs)/_layout.tsx`, tinggi dan padding bawah TabBar dihitung secara dinamis menggunakan `useSafeAreaInsets()` dari `react-native-safe-area-context`:
> - `bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 12 : 8)`
> - `tabBarHeight = 54 + bottomInset`
> - `paddingBottom: bottomInset`
> Pengaturan ini mencegah benturan visual antara navigasi aplikasi dengan tombol navigasi sistem Android (3-button navigation bar / gesture navigation bar), sekaligus memberikan latar belakang warna tema yang mulus di bawah tombol sistem.

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
   - Jika biometrik aktif dan token sebelumnya tersimpan di perangkat:
     - Membuka prompt sistem biometrik (sidik jari/FaceID).
     - Memvalidasi token ke endpoint `GET /api/auth/me`.
     - Jika token masih valid, otomatis login tanpa input ulang password.
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
Halaman utama setelah login yang berfungsi sebagai pusat informasi eksekutif, statistik operasional harian, aksi cepat, dan pemindai resi cepat.

1. **Header Pengguna & Kontrol Cepat**:
   - Menampilkan sapaan nama pengguna (`user.fullName` / `user.username`) dan role badge.
   - Tombol toggle bahasa bilingual (`ID` / `EN`).
   - Tombol toggle tema gelap/terang (`Midnight` / `Heritage`).
2. **4 Quick Action Grid**:
   - **Scan Resi**: Membuka kamera pemindai barcode/QR langsung.
   - **Shipment**: Navigasi cepat ke Tab Logistik (sub-tab Resi).
   - **Billing**: Navigasi cepat ke Tab Keuangan (sub-tab Invoice).
   - **Cek Tarif**: Navigasi cepat ke Tab Keuangan (sub-tab Kalkulator Tarif).
3. **Filter Segmented Moda Operasional**:
   - Pilihan: `Semua Moda` (`all`), `Udara` (`1`), `Laut` (`2`).
   - Perubahan moda memicu refetch data KPI secara instan.
4. **5 Kartu KPI Eksekutif**:
   - **Total Resi**: Jumlah seluruh resi terdaftar + breakdown rasio (Udara vs Laut).
   - **Total Koli**: Akumulasi jumlah fisik koli + breakdown koli Udara vs Laut.
   - **Total Berat (Kg)**: Akumulasi berat aktual gudang + persentase tren MoM (*Month-over-Month*).
   - **Total Volume (M³)**: Akumulasi volume kubikasi gudang + counter jumlah customer unik aktif.
5. **Feed "Shipment Terkini"**:
   - Menampilkan 5 transaksi shipment terbaru dari server.
   - Dilengkapi badge moda (Udara `Plane` sky / Laut `Ship` indigo), nama customer, jumlah koli, berat, dan tanggal terima.
6. **Pull-to-Refresh**:
   - Mendukung gesture tarik ke bawah untuk memuat ulang data KPI secara real-time.

#### B. Endpoint API Terkait

##### 1. Agregasi KPI Shipment
- **Method**: `GET`
- **Endpoint**: `/api/shipments/kpi`
- **Query Params**:
  - `listType` (opsional): `"1"` (Udara) atau `"2"` (Laut)
- **Response Data**:
  ```json
  {
    "success": true,
    "data": {
      "all": {
        "totalReceipts": 1420,
        "totalPackages": 8950,
        "totalWeight": 74520.5,
        "totalVolume": 312.458,
        "totalCust": 128,
        "breakdown": {
          "udara": { "receipts": 420, "packages": 2100, "weight": 12500.0, "volume": 45.2, "cust": 54 },
          "laut": { "receipts": 1000, "packages": 6850, "weight": 62020.5, "volume": 267.258, "cust": 95 }
        },
        "comparison": {
          "weight": { "momGrowth": "+8.4%" },
          "volume": { "momGrowth": "+12.1%" },
          "receipts": { "momGrowth": "+5.2%" }
        }
      }
    }
  }
  ```

##### 2. Daftar Transaksi Shipment Terkini
- **Method**: `GET`
- **Endpoint**: `/api/shipments`
- **Query Params**: `limit=5`
- **Response Data**:
  ```json
  {
    "success": true,
    "data": [
      {
        "fdMarkingCode": "MK-260901-001",
        "fdTerima": "RESI-889102",
        "fdCustName": "PT. MITRA JAYA MAKMUR",
        "fdListType": 1,
        "fdJmlPack": 25,
        "fdSatuan": "Ctn",
        "fdJmlBerat": 350.5,
        "fdM3": 1.254,
        "fdDateTerima": "2026-09-12T04:15:00.000Z"
      }
    ]
  }
  ```

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
   - **Modal Rincian Muatan (Bottom Sheet)**:
     - Jika item kartu diklik, muncul modal bawah yang membedah ukuran fisik: Pack / Satuan, Berat (kg), Volume (m³), cabang gudang, dan identifikasi marking.
4. **Sub-Tab 2: Batch Marking**:
   - Filter tambahan moda: `Semua`, `Udara`, `Laut`.
   - Menampilkan kode batch marking (`fdMarkingCode`), cabang gudang (`fdBranch`), keterangan (`fdKet`), dan tanggal operasional berbasis hirarki (`Exit`, `ETA`, `ETD`, `Load`).
   - **Tampilan Nomor Muatan Khusus**:
     - Jika moda **Udara** (`fdListType === 1`) $\to$ menampilkan nomor AWB (`fdAWB`).
     - Jika moda **Laut** (`fdListType === 2`) $\to$ menampilkan nomor kontainer (`fdContNo`).
     - *Catatan Desain*: Hanya menampilkan string data mentah secara tegas (warna aksen tersier) tanpa teks label awalan "AWB:" maupun "Kontainer:". Tepat di bawahnya, hanya menampilkan `fdKet` jika tersedia (tanpa teks default/placeholder).
   - Tautan/tombol interaktif untuk menampilkan **Data Manifest** resi shipment per batch (`/api/marking/:id/manifest`).
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

##### 2. Data Batch Marking
- **Method**: `GET`
- **Endpoint**: `/api/marking`
- **Query Params**:
  - `limit=20`
  - `search=<keyword>` (kode batch marking, BL/AWB, consignee, kontainer)
  - `listType=ALL|1|2` (**Filter tambahan**: `ALL` / Semua, `1` = Udara, `2` = Laut)
  - `isClosed=true|false` (opsional: status keluar gudang)
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
  - **Deskripsi**: Menampilkan seluruh rincian manifest shipment (`vwShipment`) dalam batch terpilih: daftar resi (`fdTerima`), nama customer (`fdCustName`), koli/pack (`fdJmlPack`), satuan (`fdSatuan`), berat (`fdJmlBerat`), dan volume kubikasi (`fdM3`).

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
    - **`Scheduled / Pending`**: Apabila tanggal sekarang $<$ `fdEstimasi` dan `fdSent === 0` (atau belum dijadwalkan)

---

### 3.6. Halaman Keuangan & Billing (`app/(tabs)/finance.tsx`)

#### A. Tujuan & Logika
Manajemen piutang dan tagihan pelanggan, audit validasi kebenaran tarif dan ukuran fisik (M3 vs KG), serta kalkulator tarif instan untuk estimasi biaya di lapangan.

1. **Segmented Tabs Navigasi**:
   - **Tab 1: Daftar Invoice (`billing`)**
   - **Tab 2: Audit Validasi (`validation`)**
   - **Tab 3: Kalkulator Tarif (`calculator`)**
2. **Sub-Tab 1: Daftar Invoice**:
   - Menampilkan daftar tagihan resmi dengan nomor invoice (`fdInvNo`), nama customer, tanggal tagihan, status bayar (`PAID` / `ISSUED`), dan total nilai tagihan (format mata uang Rupiah).
   - Tombol **Salin No. Inv**: Menyalin nomor invoice ke clipboard dengan haptic feedback.
   - **Modal Rincian & Cetak/Bagikan PDF**:
     - Membuka bottom sheet rincian invoice.
     - Tombol *"Bagikan / Cetak PDF"*: Menggunakan `expo-print` untuk merender template HTML invoice dan `expo-sharing` untuk membagikan file PDF ke WhatsApp, email, atau printer dokumen.
3. **Sub-Tab 2: Audit Validasi Tagihan**:
   - Menampilkan status audit validasi per invoice untuk mencegah kesalahan tagih (*overcharge / undercharge / overweight*).
   - Menampilkan status verdict (`SESUAI / EQUAL`, `OVERWEIGHT`, `OVERCHARGE`, `UNDERCHARGE`).
   - Indikator kecocokan tarif harga master vs tagihan (`priceCheckOk`).
   - Indikator kecocokan volume kubikasi vs berat aktual (`m3CheckOk`).
4. **Sub-Tab 3: Kalkulator Tarif Lapangan**:
   - Switcher moda pengiriman: `Moda Udara` (kalkulasi berbasis tarif per kg) vs `Moda Laut` (kalkulasi berbasis tarif per $m^3$).
   - Input berat muatan (`kg`).
   - Input dimensi fisik karton: Panjang $\times$ Lebar $\times$ Tinggi (`cm`).
   - **Live Quotation Box**:
     - Menghitung volume otomatis: $\text{Volume } (m^3) = \frac{P \times L \times T}{1.000.000}$.
     - Menghitung rasio muatan: $\text{Rasio} = \frac{\text{Berat}}{\text{Volume}} \text{ kg/m}^3$.
     - Menghitung estimasi total biaya tagihan berdasarkan tarif standar rute.

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
  - `fdInvDate`: Tanggal penerbitan invoice
  - `fdTotalColy`: Total koli dalam invoice
  - `fdTotalWeight`: Total akumulasi berat muatan (kg)
  - `fdTotalM3`: Total akumulasi volume muatan ($m^3$)
  - `fdTotalAmount`: Total nilai rupiah tagihan
  - `fdStatus`: Status pembayaran (`PAID`, `ISSUED`, `UNPAID`)

##### 2. Data Audit Validasi Tagihan
- **Method**: `GET`
- **Endpoint**: `/api/billing/validation/list`
- **Query Params**:
  - `limit=20`
  - `search=<keyword>`
- **Data Kunci yang Ditampilkan**:
  - `fdInvNo`: Nomor invoice
  - `fdCustName`: Nama customer
  - `verdict`: Hasil audit validasi (`EQUAL`, `OVERWEIGHT`, `OVERCHARGE`, `UNDERCHARGE`)
  - `priceCheckOk`: Status kesesuaian harga terhadap master price list (boolean)
  - `m3CheckOk`: Status evaluasi hirarki ukuran M3 (Gudang, Komplain, PL) (boolean)

---

### 3.7. Halaman Master Data Customer (`app/(tabs)/master.tsx`)

#### A. Tujuan & Logika
Direktori data pelanggan resmi (*Single Source of Truth* `tbCustomers`) yang dilengkapi fitur komunikasi instan sekali ketuk bagi tim sales dan lapangan.

1. **Pencarian Cepat**:
   - Filter live berdasarkan nama pelanggan, kode pelanggan, kota, atau nama sales.
2. **Single Source of Truth**:
   - Selalu menampilkan `fdCustName` dan `fdCustCode` resmi dari tabel master `tbCustomers`.
3. **Aksi Komunikasi Langsung**:
   - Tombol **Telepon**: Membuka dialer telepon ponsel secara otomatis melalui URI schema `tel:<nomor_telepon>`.
   - Tombol **WhatsApp**: Membuka aplikasi WhatsApp langsung dengan nomor tujuan melalui URI schema `https://wa.me/<nomor_hp_bersih>` (otomatis menstandarisasi awalan `08...` menjadi `628...`).
4. **Modal Profil Lengkap Customer**:
   - Jika kartu diklik, modal menampilkan rincian kontak lengkap: Kode Customer, Nama PIC/Kontak, Alamat kantor/gudang, Kota, dan nama Sales In-Charge (`fdSalesNM`).

#### B. Endpoint API Terkait
- **Method**: `GET`
- **Endpoint**: `/api/customers`
- **Query Params**:
  - `limit=25`
  - `search=<keyword>`
- **Data Kunci yang Ditampilkan**:
  - `fdCustCode`: Kode unik customer master
  - `fdCustName`: Nama resmi perusahaan / pemilik barang
  - `fdCity`: Kota domisili customer
  - `fdAddress`: Alamat lengkap pengiriman/kantor
  - `fdPhone` / `fdTelp`: Nomor kontak telepon / HP customer
  - `fdContact`: Nama orang yang dapat dihubungi (PIC)
  - `fdTier`: Tingkatan tier customer (`VIP`, `PRIORITY`, `REGULAR`)
  - `fdSalesNM`: Nama petugas sales yang bertanggung jawab

---

### 3.8. Halaman Profil & Pengaturan (`app/(tabs)/profile.tsx`)

#### A. Tujuan & Logika
Manajemen akun pengguna, konfigurasi keamanan biometrik, preferensi antarmuka (tema dan bahasa), pemantauan konektivitas backend ERP, dan sesi logout.

1. **Kartu Header Pengguna**:
   - Menampilkan avatar inisial/ikon pengguna.
   - Nama lengkap (`user.fullName`) dan username (`user.username`).
   - Badge peran sistem (`ADMIN`, `OPERATOR`, `FINANCE`, `VIEWER`).
2. **Pengaturan Keamanan & Biometrik**:
   - Switch toggle login biometrik (Fingerprint / FaceID).
   - Memanggil `biometricService.authenticate()` sebelum mengaktifkan atau menonaktifkan agar keamanan terverifikasi.
3. **Preferensi Tampilan**:
   - Switcher tema antara **Midnight (Dark Mode)** dan **Heritage (Light Mode)**.
   - Mengubah palet warna dinamis di seluruh komponen UI via Zustand `themeStore`.
4. **Preferensi Bahasa**:
   - Switcher bahasa bilingual antara 🇮🇩 **Bahasa Indonesia** (`id`) dan 🇬🇧 **English** (`en`).
   - Mengubah kamus terjemahan visual via custom hook `useTranslation()`.
5. **Informasi Sistem & Status ERP**:
   - Menampilkan status live koneksi ke server backend (`Online • 36.93.22.142:3010`).
   - Menampilkan badge status server `ONLINE`.
6. **Versi Aplikasi & Fitur Cek Pembaruan (Auto Update)**:
   - Menampilkan versi aktif aplikasi saat ini (misal `v1.0.2` yang bersumber dari `mobile/src/config/version.ts`).
   - Tombol interaktif **"Cek Pembaruan"** (`RefreshCw` / `Sparkles`):
     - Menjalankan pengecekan versi ke backend `GET /api/app-version/latest`.
     - Jika versi server lebih baru: memicu modal dialog pembaruan (`UpdateModal`) dan mengubah badge menjadi `UPDATE` merah.
     - Jika sudah versi terbaru: memicu toast konfirmasi sukses *"Aplikasi sudah dalam versi terbaru (v1.0.2)"*.
7. **Aksi Keluar (Logout)**:
   - Tombol *"Keluar dari Akun"* memunculkan dialog konfirmasi bawaan.
   - Jika disetujui:
     - Token dan kredensial dihapus secara permanen dari `expo-secure-store`.
     - State autentikasi direset.
     - Pengguna diarahkan kembali ke layar `/(auth)/login`.

#### B. Endpoint API Terkait
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

### 3.10. Komponen Dialog Auto Update (`UpdateModal.tsx`)

#### A. Tujuan & Logika
Menangani alur pembaruan aplikasi mobile secara mandiri (*self-hosted sideload*) tanpa ketergantungan pada Google Play Store:
1. **Single Source of Truth Versi (`mobile/src/config/version.ts`)**:
   - Versi aplikasi didefinisikan secara statis melalui `APP_VERSION = '1.0.2'` dan `APP_VERSION_CODE = 3` di `mobile/src/config/version.ts`.
   - Hal ini menjamin versi tertanam langsung ke dalam bundle JavaScript/Hermes bytecode (mencegah nilai `null` pada `Constants.expoConfig` di lingkungan production APK mandiri).
2. **Pemeriksaan Versi Latar Belakang (Otomatis)**:
   - Pada `app/_layout.tsx`, `useUpdateStore.checkUpdate(false)` dieksekusi secara hening saat aplikasi terbuka.
   - Membandingkan `currentVersion` terhadap `latestVersion` dari endpoint backend `/api/app-version/latest`.
   - **Dismissed Version State**: Jika pengguna pernah menekan tombol "Nanti Saja" untuk versi tersebut, modal tidak akan muncul otomatis lagi saat pembukaan aplikasi berikutnya demi kenyamanan pengguna (kecuali jika disetel `forceUpdate: true` oleh server atau dicek manual via tab Profil).
3. **Karakteristik & Kontrol Pembaruan**:
   - **Informasi Versi**: Menampilkan perbandingan versi lama ➔ versi baru (`v1.0.1 ➔ v1.0.2`), ukuran berkas APK (`121.0 MB`), serta daftar catatan rilis (*release notes*).
   - **Pembaruan Opsional vs Wajib**: Jika `forceUpdate === true`, tombol "Nanti Saja" dan gestur tutup modal dinonaktifkan sehingga pengguna wajib memperbarui demi menjaga kompatibilitas API.
   - **Tindakan Unduh**: Tombol *"Perbarui Sekarang"* mengeksekusi `Linking.openURL(downloadUrl)` untuk memicu download file APK ke folder Download HP.
   - **Petunjuk Instalasi APK**: Dilengkapi instruksi ramah pengguna: *"💡 Setelah unduh selesai, ketuk file APK di notifikasi HP untuk menginstal."*
   - **Alternatif Web**: Tautan *"Unduh via Halaman Web QR"* mengarahkan ke portal web `/mshipping/download/`.

---

## 📊 4. Matriks Ringkasan Endpoint API Backend Mobile

| No | Modul / Halaman | Endpoint API | HTTP Method | Parameter / Body Kunci | Tipe Data yang Ditampilkan |
|:---|:---|:---|:---:|:---|:---|
| **1** | Autentikasi | `/api/auth/login` | `POST` | `{ username, password }` | Token JWT, Profil User, Role |
| **2** | Autentikasi | `/api/auth/me` | `GET` | Header `Authorization: Bearer` | Verifikasi token biometrik |
| **3** | Registrasi | `/api/auth/register` | `POST` | `{ fullName, username, password }` | Konfirmasi pendaftaran akun |
| **4** | Dashboard KPI | `/api/shipments/kpi` | `GET` | `listType` (`all`, `1`, `2`) | Total resi, koli, berat, volume, MoM |
| **5** | Dashboard Terkini | `/api/shipments` | `GET` | `limit=5` | 5 transaksi resi & shipment terbaru |
| **6** | Logistik - Resi | `/api/shipments` | `GET` | `limit=20`, `search`, `listType` | Nomor resi, marking code, jml pack, satuan, berat (kg), m³ |
| **7** | Logistik - Batch | `/api/marking` | `GET` | `limit=20`, `search`, `listType` (`ALL`, `1`, `2`) | Kode batch marking, cabang, `fdKet`, hirarki tanggal (`Exit`/`ETA`/`ETD`/`Load`) |
| **8** | Logistik - Manifest Batch | `/api/marking/:id/manifest` | `GET` | Path `id` (`fdMarkingCode`) | Rincian resi manifest (`vwShipment`): resi, customer, pack, satuan, berat, m³ |
| **9** | Logistik - Surat Jalan | `/api/delivery-orders` | `GET` | `limit=20`, `search` | `fdSJNo`, `fdCustNameSJ`, `fdSupir`, `fdCarID`, `fdEstimasi`, `fdSent`, `fdGiveDate` |
| **10** | Finance - Invoice | `/api/billing` | `GET` | `limit=20`, `search` | No. inv, nama customer, tanggal, nominal |
| **11** | Finance - Validasi | `/api/billing/validation/list` | `GET` | `limit=20`, `search` | Status verdict, audit tarif, audit M3 |
| **12** | Master Customer | `/api/customers` | `GET` | `limit=25`, `search` | Nama customer master, telepon, sales |
| **13** | Sistem & Auto Update | `/api/app-version/latest` | `GET` | None | Versi terbaru, changelog, URL APK, size |

---

## 🛡️ 5. Standar Penanganan Error & Pengalaman Pengguna (UX)

1. **Skeleton Shimmer Loading State**:
   - Seluruh daftar data menggunakan komponen wireframe animasi shimmer (`SkeletonShimmer.tsx`) saat proses pemuatan pertama (*initial load*).
   - DILARANG menggunakan fullscreen spinner bulat yang menghalangi konten.
2. **Haptic Tactile Feedback**:
   - Setiap ketukan tombol navigasi, filter mode, pemindaian barcode sukses, dan penyalinan teks memicu getaran proporsional (`Light`, `Medium`, `Success`, `Error`).
3. **Format Representasi Data Standar**:
   - Seluruh angka dan mata uang diformat menggunakan utilitas terpusat:
     - Mata Uang: `formatCurrency(amount)` $\to$ `Rp 1.500.000`
     - Berat Fisik: `formatDecimal(weight, 1)` $\to$ `350,5 kg`
     - Volume Fisik: `formatDecimal(volume, 4)` $\to$ `1,2540 m³`
     - Angka Koli / Counter: `formatNumber(coly)` $\to$ `1.420`
     - Tanggal: `formatDate(date)` $\to$ `12 Sep 2026`
4. **Single Source of Truth Customer**:
   - Nama customer yang muncul di seluruh modul (Dashboard, Logistik, Finance, dan Master) selalu terikat dan memprioritaskan data master `tbCustomers.fdCustName`.

---

## 📲 6. Prosedur Distribusi & Pemasangan APK (Sideloading)

Karena aplikasi didistribusikan secara mandiri di server on-premise perusahaan (tanpa Google Play Store):
1. **Titik Akses Unduhan Resmi**:
   - **URL Unduh Langsung**: `http://36.93.22.142/mshipping/mshipping.apk`
   - **URL Mirror Backend API**: `http://36.93.22.142:3010/uploads/mshipping.apk`
   - **Landing Page QR Scanner**: `http://36.93.22.142/mshipping/download/`
2. **Langkah Pemasangan di Perangkat Android**:
   - Ketuk tombol *"Perbarui Sekarang"* di dalam dialog update aplikasi atau buka salah satu URL di atas melalui browser Chrome di HP.
   - Browser akan mengunduh file `mshipping.apk` ke folder **Download**.
   - Setelah unduhan selesai, **tarik bilah notifikasi Android ke bawah** atau buka File Manager di folder Download.
   - Ketuk file `mshipping.apk` dan pilih **Update / Pasang**.
   - Jika Android meminta izin *"Install unknown apps"* untuk browser/file manager, aktifkan izin tersebut sekali.
   - Setelah selesai terpasang, buka aplikasi M-Shipping. Cek tab **Profil** $\to$ versi akan terbaca **`v1.0.2`** dan pop-up pembaruan tidak akan muncul lagi.
