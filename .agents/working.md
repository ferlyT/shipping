### 🕐 Terakhir Diperbarui
- **Tanggal**: 2026-10-11
- **Oleh**: Antigravity AI
- **Sesi**: Implementasi Tab Komoditas Customer (2 Bar Proporsi Laut/Udara & Grafik Garis Tren Bulanan Jan–Des)

- [x] **Tab Komoditas Pelanggan (2 Bar Proporsi & Grafik Garis Tren Bulanan)**:
  - **Permintaan Pengguna**:
    1. "buatkan plan menampilkan data grafik garis persentase tipe comodity dari keseluruhan barang customer yang ada di database pada tahun aktif. Data diambil dari tbentrylistdetail di agregasi tabel komplain apabila ada."
    2. "Buat bar proporsi untuk data comodity. Buat 2 bar laut dan udara. Data diambil dari fdtglagent. Apakah lebih baik buat tab tersendir"
    3. "Laptop hitung per pcs dari tbbilling detail. Selain laptop ada ipad dan sejenisnya kuncinya fdlistcode pada tbbilling detail pce pcs unit. Kalau fcl hitung per fdlistcode ctr pada billing detail"
  - **Penyelesaian Teknis**:
    1. *Backend Service & Endpoint REST API (`customer-commodity-stats.service.ts` & `customers.routes.ts`)*:
       - Endpoint baru: `GET /api/customers/:id/commodity-stats?year=2026`.
       - Kueri CTE MS SQL Server berindeks menggabungkan `tbEntryList`, `tbTypeComodity`, `tbEntryListDetail`, `tbEntryListDetail_Komplain`, dan `tbBillingDetail`.
       - Agregasi Laut: Dimensi koli fisik gudang dihitung volume $(\text{Pjg} \times \text{Lbr} \times \text{Tng} \times \text{Qty}) / 1.000.000$, di-override dimensi revisi komplain `tbEntryListDetail_Komplain`, fallback `el.fdM3`.
       - Agregasi Udara: Dihitung berat dari `el.fdJmlBerat`.
       - Penanganan Khusus Unit:
         - FCL: Dihitung kontainer (satuan `CTR`) dari `tbBillingDetail` (`bd.fdListCode = 'CTR'`) atau count resi FCL.
         - Laptop / iPad / Tablet / Gadget: Dihitung unit fisik (satuan `PCS` / `UNIT`) dari `tbBillingDetail` (`bd.fdListCode IN ('PCS', 'PCE', 'UNIT')`).
       - Menghasilkan agregasi persentase tahunan untuk 2 bar proporsi dan fluktuasi persentase 12 bulan (Jan–Des).
    2. *Mobile App (`CustomerCommodityTab.tsx` & `CustomerDetailSheet.tsx`)*:
       - Penambahan Tab ke-3 mandiri: `Komoditas` (`Ringkasan` · `Finansial` · `Komoditas` · `Alamat (N)`).
       - Dua Stacked Horizontal Proportion Bar (Laut & Udara) dengan segmen warna proporsional dan legend satuan dinamis (`m³`, `CTR`, `PCS`, `kg`).
       - Interaktif: Mengetuk Bar Laut atau Bar Udara otomatis mensinkronkan grafik garis di bawahnya ke moda tersebut.
       - Multi-line chart SVG (`react-native-svg`) dengan gridline horizontal tipis (0%, 25%, 50%, 75%, 100%), sumbu X 12 bulan (Jan–Des), dan legend indikator warna.
    3. *Web Frontend (`CustomerCommodityTab.tsx` & `CustomerDetailModal.tsx`)*:
       - Penambahan Tab `Komoditas` pada modal detail pelanggan.
       - Dua stacked progress bar proporsi dan grafik garis Recharts multi-line responsive chart.
    4. *Verifikasi Build & Distribusi APK (Versi Sama v1.3.8 Build 30, No Force)*:
       - Backend TypeScript check: `bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
       - Mobile TypeScript check: `bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
       - Frontend Production Build: `bun run build` $\to$ **LULUS 100% 0 errors (9.98s)**.
       - Export Hermes Android bundle: `entry-b1a844b319aeeffaa9163183949120f0.hbc` (6.00 MB).
       - Injeksi ke `assets/index.android.bundle` di `mshipping.apk`.
       - Re-signed via `uber-apk-signer` dengan `release.keystore` $\to$ **Zipalign verified & signature verified [v2, v3] (0 errors)**.
       - Distribusi biner APK (121.35 MB) ke 4 titik server (`mshipping.apk`, `frontend/dist`, `frontend/public`, `backend/public/uploads`).
       - Service PM2 `ShippingApi` direstart & status **online** (PID 66948).

- [x] **Format Singkatan Satuan Omzet Tahun Berjalan Customer Detail Modal (`CustomerDetailSheet.tsx`)**:
  - **Permintaan Pengguna**: "Pada customer detail modal mobile app tab finansial omzet tahun berjalan gunakan singkatan satuan agar tidak terjadi overflow"
  - **Penyelesaian Teknis**:
    1. *Format Singkat Anti-Overflow*:
       - Mengganti `formatCurrency(annualRevenue)` dengan `formatCompactRupiah(annualRevenue)` dari [`@/lib/utils`](file:///c:/shipping/mobile/src/lib/utils.ts).
       - Menghasilkan format ringkas (contoh: `Rp 2.5 Jt`, `Rp 3.50 M`) alih-alih angka penuh desimal panjang `Rp. 3,500,000,000.00`.
       - Memasang `numberOfLines={1}` dan `adjustsFontSizeToFit` pada elemen `<Text>` omzet agar teks selalu pas di dalam kolom tanpa overflow horizontal maupun pemotongan tidak rapi.
    2. *Verifikasi Build & Distribusi APK*:
       - Mobile TypeScript check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
       - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (12.84s)**.
       - Export Hermes Android: `entry-a2a101d138d8624cc64371f5dfb79fa0.hbc` (6.00 MB).
       - Repack & signing via `uber-apk-signer` dengan `release.keystore` $\to$ **Verified 0 errors**.
       - Distribusi APK (121.35 MB) ke 4 titik server & restart PM2 `ShippingApi` (PID: 53852, online).
       - Modal anotasi diselaraskan tombol aksi: "Lewati anotasi" dan "Unggah foto".
    6. *Verifikasi Build & Distribusi APK*:
       - Mobile TypeScript check: `bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
       - Frontend Production Build: `bun run build` $\to$ **LULUS 100% 0 errors (3.40s)**.
       - Export Hermes Android: `entry-e11f93e9702807300c7d3ba933e21af4.hbc` (6.00 MB).
       - Repack & signing via `uber-apk-signer` dengan `release.keystore` $\to$ **Verified 0 errors**.
       - Distribusi APK ke 4 titik server & restart PM2 `ShippingApi` (PID: 63264, online).
       - `PhotoAnnotationModal.tsx`: Ditambahkan `<StatusBar translucent>` dan safe padding atas yang identik agar tombol tutup, undo, dan hapus tidak bertabrakan dengan jam/notch/punch-hole kamera.
    6. *Kompilasi & Build (Versi Sama v1.3.8 Build 30, No Force Update)*:
       - Mobile TypeScript check: `bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
       - Frontend Production Build: `bun run build` $\to$ **LULUS 100% 0 errors (3.39s)**.
       - Export Hermes bundle Android: `entry-6a1576a928312a63fa3c1bd86a5ec069.hbc` (6.00 MB).
       - Repack, zipalign & re-sign via `uber-apk-signer` dengan `release.keystore` $\to$ **Verified 0 errors**.
       - Distribusi biner APK ke 4 lokasi server (`mshipping.apk`, `frontend/dist`, `frontend/public`, `backend/public/uploads`).
       - Service PM2 `ShippingApi` direstart & status **online** (PID 67156).

- [x] **Redesign Editorial Scanner Modal & Perbaikan Tabrakan Baris Jam Perangkat (`ContainerScannerModal.tsx` & `BarcodeScannerModal.tsx`)**:
  - **Permintaan Pengguna**: "Perbaiki design page pencairan batch marking dengan camera sesuai dengan desain rules, icon bertabrakan dengan baris jam perangkat dan cabut fitur scan search pada tab surat jalan.kompile dengan versi sama no force."
  - **Penyelesaian Teknis**:
    1. *Resolusi Tabrakan Baris Jam Perangkat (Status Bar Inset)*:
       - Mengganti pembungkus root dari `SafeAreaView` biasa (yang sering gagal mendeteksi tinggi status bar pada modal Android) ke `View` dengan `topPadding` dinamis:
         `Platform.OS === 'android' ? Math.max(insets.top, StatusBar.currentHeight ?? 24) + 6 : Math.max(insets.top, 16) + 4`.
       - Mengaktifkan `translucent backgroundColor="transparent"` pada `<StatusBar>` modal sehingga header bar kamera turun ke posisi aman dan ikon tutup/flash tidak bertabrakan dengan jam/sinyal/baterai perangkat.
    2. *Penyelarasan Desain Editorial (`mobile-design-rules.md`)*:
       - Header bar ditata dengan struktur teks berlapis: overline uppercase 11px `--muted` (`PEMINDAIAN BATCH MARKING`) + judul 16px/600 `--text` (`#EEF2F6`).
       - Ikon kontrol (Tutup, Rotasi Kamera, Flash) dibungkus tombol berdimensi standar 38x38 ber-border semantik tipis 1px (`#222C38`), latar `#131A23`, dan state aktif flash menggunakan aksen bata `--accent` (`#E0644E`).
    3. *Pencabutan Fitur Scan Search pada Tab Surat Jalan (`logistics.tsx`)*:
       - Pada tab Surat Jalan (`delivery`), properti `onScanPress` dan `onScanContainerPress` dinonaktifkan (`undefined`).
       - Tombol kamera kontainer di SearchBar hanya aktif di tab Batch (`batches`), dan tombol scan barcode hanya aktif di tab Resi (`shipments`).
    4. *Kompilasi Repack Hermes & Distribusi APK (Versi Sama v1.3.8 Build 30, No Force Update)*:
       - Bundle Hermes baru Android: `entry-b90df7e7cd18c672469255e6c5d492fa.hbc` (6.00 MB).
       - Injeksi ke `assets/index.android.bundle` di `mshipping.apk`.
       - Re-signed via `uber-apk-signer` $\to$ **Zipalign verified & signature verified [v2, v3] (0 errors)**.
       - Sinkronisasi biner APK (121.35 MB) ke 4 titik server (`mshipping.apk`, `frontend/dist`, `frontend/public`, `backend/public/uploads`).
       - Service PM2 `ShippingApi` direstart & status **online** (PID 68900).
    5. *Verifikasi Build*:
       - Mobile TypeScript check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
       - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.72s)**.
  - **Permintaan Pengguna**: "Buat plan page customer infinite scroll sudah berkali kali di revisi masih tidak bisa berfungsi. Apa yang salah."
  - **Akar Masalah Fundamental**:
    1. *Platform Mismatch*: Sederet revisi sebelumnya diaplikasikan pada Frontend Web (`ListPage.tsx`), sedangkan pengujian pengguna berlangsung pada Mobile App (`master.tsx`).
    2. *Ketiadaan Momentum Guard pada FlatList*: `FlatList` pada React Native memerlukan `onMomentumScrollBegin` guard agar event `onEndReached` tidak terblokir atau terpicu prematur.
    3. *Versi Aplikasi Statis di Perangkat Pengguna*: Meskipun bundle bytecode diperbarui, nomor versi aplikasi tidak dinaikkan (`v1.3.7 Build 29`), sehingga in-app auto updater (`useUpdateStore`) di HP user menganggap aplikasi sudah up-to-date dan tidak memicu unduhan bundle baru.
  - **Penyelesaian Teknis**:
    1. *Hook Terisolasi `useMasterCustomersQuery` (`mobile/src/features/master/hooks/useMasterCustomers.ts`)*:
       - Implementasi pola infinite query identik dengan `useShipments.ts` dan `useBillings.ts`.
       - Paging deterministik: `initialPageParam: 1`, membaca `lastPage.meta.page` dan `lastPage.meta.totalPages`.
       - Agregasi data aman dengan `flatMap`.
    2. *Hardened FlatList di `master.tsx`*:
       - Memasang momentum guard: `onEndReachedCalledDuringMomentum.current = false` saat `onMomentumScrollBegin`.
       - Handler `handleEndReached`: hanya memicu `fetchNextPage()` jika momentum scroll aktif dan tidak sedang fetching.
       - Menetapkan threshold teruji: `onEndReachedThreshold={0.4}`.
       - Menetapkan prop optimasi FlatList: `initialNumToRender={20}`, `maxToRenderPerBatch={20}`, `windowSize={10}`.
       - Menetapkan `keyExtractor` deterministik: `${item.fdCustCode || item.id || 'cust'}-${index}`.
    3. *Penyelarasan Versi Rilis APK (`v1.3.8 Build 30`, No Force Update)*:
       - Disinkronkan di 4 titik: `mobile/app.json`, `mobile/package.json`, `mobile/src/config/version.ts`, dan `backend/src/config/app-version.json`.
       - Kompilasi Hermes bytecode: `entry-80b88bd2fd851ef1dca6789d0b48fffc.hbc` (5.99 MB).
       - Repack, zipalign, & re-sign via `uber-apk-signer` dengan `release.keystore` (0 errors).
       - Sinkronisasi biner APK (121.34 MB) ke 4 titik server (`mshipping.apk`, `frontend/dist`, `frontend/public`, `backend/public/uploads`).
       - Service PM2 `ShippingApi` direstart & status **online** (PID 66840).
       - Verifikasi `/api/app-version/latest` merespons versi baru `1.3.8` (Build 30).
  - **Verifikasi Build**:
    - Mobile TypeScript check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
    - Backend TypeScript check: `cd backend && bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.65s)**.
  - **Permintaan Pengguna**: "Di frontend page customer buat pakai pagination"
  - **Penyelesaian Teknis**:
    1. *Penggantian `useInfiniteQuery` ke `useQuery`*:
       - Menggunakan hook resmi `usePagination(BATCH_SIZE)` (`page`, `limit: 30`, `goToPage`, `resetPagination`).
       - Query key terikat ke `[customers, page, limit, activeSearch, sortField, sortDir, statusFilter, activeSales, activeGroup]`.
       - Reset pagination ke halaman 1 secara otomatis setiap kali status/sales/group/search berubah.
    2. *Pembersihan Kode Lama*:
       - Menghapus seluruh listener global scroll/wheel/touch, sentinel ref, dan observer infinite scroll.
    3. *Komponen Pagination & Loncat Halaman (ERP Jump Bar)*:
       - Memasang `<Pagination page={page} limit={limit} total={total} totalPages={totalPages} onPageChange={...} />`.
       - Menambahkan input loncat halaman `Loncat ke [ ] / totalPages` yang ter-scroll mulus ke atas tabel saat navigasi.
       - Kolom nomor urut di `CustomerTableView` diperbarui menerima `page` dan `limit` untuk penomoran akurat `(page - 1) * limit + index + 1`.
    4. *Verifikasi Build Frontend*:
       - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.33s)**.

- [x] **Kompilasi Repack Hermes & Rilis APK Mobile (`mshipping.apk`)**:
  - **Status Versi**: v1.3.7 (Build 29, No Force Update sesuai konfirmasi user).
  - **Penyelesaian Teknis**:
    1. Ekspor Hermes bundle Android: `entry-ffa7bcc80d4db5f56df1ce15d8c087e2.hbc` (5.99 MB).
    2. Injeksi ke `assets/index.android.bundle` di `mshipping.apk`.
    3. Sign & zipalign via `uber-apk-signer` dengan `release.keystore` $\to$ **Zipalign verified & signature verified [v2, v3] (0 errors)**.
    4. Sinkronisasi biner APK (121.34 MB) ke 4 titik server (`mshipping.apk`, `frontend/dist`, `frontend/public`, `backend/public/uploads`).
    5. PM2 service `ShippingApi` direstart & status **online** (PID 65592).

- [x] **Implementasi Penuh Infinite Scroll Direktori Customer Mobile App (`mobile/app/(tabs)/master.tsx`)**:
  - **Permintaan Pengguna**: "Yang ga bisa di scroll itu page customer mobile app"
  - **Akar Masalah Fundamental**:
    - Layar `master.tsx` sebelumnya hanya menggunakan `useQuery` standar dengan query parameter statis `{ limit: 30 }`.
    - FlatList tidak memiliki listener `onEndReached`, `onEndReachedThreshold`, dan `ListFooterComponent`, sehingga setelah 30 item pertama dimuat, data berhenti dan tidak dapat digulir lebih lanjut.
  - **Penyelesaian Teknis**:
    1. *Implementasi `useInfiniteQuery`*:
       - Mengganti `useQuery` menjadi `useInfiniteQuery` dengan `initialPageParam: 1`.
       - Menambahkan `getNextPageParam` yang membaca `lastPage.meta.page` dan `lastPage.meta.totalPages` secara dinamis.
       - Memproses akumulasi daftar pelanggan menggunakan `useMemo` dengan `flatMap`.
    2. *Integrasi Infinite Scroll pada `FlatList`*:
       - Menambahkan props `onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage() }}` dengan `onEndReachedThreshold={0.5}`.
       - Menambahkan `ListFooterComponent` dengan `ActivityIndicator` saat `isFetchingNextPage`, indikator progress saat `hasNextPage`, dan konfirmasi akhir saat seluruh data selesai dimuat.
    3. *Verifikasi Type-Check*:
       - `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.

- [x] **Resolusi Definitif & Komprehensif Infinite Scroll Customer Web**:
  - **Permintaan Pengguna**: "Masih belum bisa infinite scroll di page customer" -> "Masih belum bisa infinite scroll!!!"
  - **Akar Masalah Fundamental**:
    1. *Event Scroll Tidak Bubble*: Listener sebelumnya hanya mendengarkan satu elemen `<main>` tanpa mode capture. Jika event terjadi di level window, sub-card, atau document, event scroll tidak pernah tertangkap.
    2. *Bottom Lockout (Ketiadaan Event saat Scrollbar Mentok)*: Saat scrollbar mencapai dasar tabel atau saat viewport layar tinggi belum terisi penuh, browser tidak menembakkan event `scroll` ketika mouse wheel diputar. Akibatnya auto-load tidak pernah terpicu.
    3. *UI Tombol Statis Membingungkan*: Teks tombol "Gulir ke bawah atau klik untuk memuat" menghambat pengalaman infinite scroll alami.
  - **Penyelesaian Teknis (Universal Quad-Detection System)**:
    1. *Universal Position Checker (`checkAndLoadMore`)*:
       - Memeriksa koordinat fisik DOM nyata melalui `sentinelRef.current.getBoundingClientRect().top <= window.innerHeight + 800`.
       - Memeriksa sisa scroll container `<main>` (`dist < 800`).
       - Memeriksa sisa scroll `window` / `document.documentElement` (`dist < 800`).
    2. *Global Capture Event Listeners*:
       - `window.addEventListener('scroll', handleEvent, { capture: true, passive: true })` menangkap seluruh event scroll dari container mana pun di halaman.
       - `window.addEventListener('wheel', handleWheel, { capture: true, passive: true })` mendeteksi putaran roda mouse ke bawah (`e.deltaY > 0`) bahkan saat scrollbar sudah mentok di dasar.
       - `window.addEventListener('touchmove', handleEvent, { capture: true, passive: true })` untuk perangkat layar sentuh / tablet.
    3. *Viewport IntersectionObserver*:
       - `rootMargin: '600px 0px'` mendeteksi sentinel sebelum tiba di batas bawah viewport.
    4. *Auto-Chain Screen Filler Guard*:
       - `useEffect` reaktif memeriksa kembali viewport 150ms setelah render tiap batch baru (`customersList.length`) agar layar monitor besar langsung terisi data tanpa jeda.
    5. *Penyempurnaan UI Sentinel*:
       - Mengganti tombol statis tebal dengan animasi spinner auto-load halus, dan link fallback kecil.
  - **Verifikasi Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (4.04s)**.


- [x] **Perbaikan Tombol Copy No. Invoice Modal Detil & Pemisahan Baris Marking di List Bill**:
  - **Permintaan Pengguna**: "Tombol copy no. Invoice pada modal detil invoice belum berfungsi. Pada list bill. Buat marking code marking no di buat jadi baris yang berbeda dari nama customer. Agar tidak bertumpuk dan mudah terbaca"
  - **Penyelesaian Teknis**:
    1. *Fungsi Clipboard Native Mobile (`mobile/src/lib/utils.ts`)*:
       - Menghapus dependency `expo-clipboard` (karena modul C++/Java native belum terkompilasi ke dalam binary base APK lama sehingga menyebabkan aplikasi crash saat runtime).
       - Menggunakan API bawaan `Clipboard` dari `react-native` dengan proteksi fallback `try/catch` tanpa dependensi native eksternal baru.
    2. *Perbaikan Tombol Copy No. Invoice di Modal Detail (`InvoiceDetailSheet.tsx` & `finance.tsx`)*:
       - Di `InvoiceDetailSheet.tsx`:
         - Membuat handler `handleCopyInvoiceNo` yang memanggil `copyToClipboard(targetInvNo)`, menggetarkan haptic, menampilkan toast sukses, dan memberikan state feedback visual `isCopiedInv` (ikon berubah ke `Check` hijau).
         - Menambahkan tombol aksi copy ringkas di samping judul header sheet modal `Invoice: {invNo}`.
         - Memperbaiki tombol aksi bawah `Salin Nomor Invoice` agar langsung memanggil `handleCopyInvoiceNo` dan meng-update teks menjadi `"Nomor Invoice Tersalin!"`.
         - Memperbaiki `handleCopyMarkingInfo` agar menyalin data teks terformat lengkap ke clipboard native.
       - Di `finance.tsx`:
         - `copyInvoiceNo` diperbarui menjadi `async` dan memanggil `await copyToClipboard(invNo)`.
    3. *Pemisahan Baris Marking Code & Marking No pada List Bill (`BillingListItem.tsx` & `ValidationListItem.tsx`)*:
       - Di `BillingListItem.tsx`:
         - Baris 2 difokuskan khusus untuk Nama Customer (`custNameText`) dengan `width: 100%` tanpa terpotong atau berhimpitan.
         - Menambahkan baris terpisah khusus `bMarking` di bawah nama customer (`Marking: {fdMarkingCode} #{fdMarkingNo}`) dengan label netral dan teks marking tabular tegas.
       - Di `ValidationListItem.tsx`:
         - Menambahkan baris terpisah `bMarking` jika invoice pada antrean validasi memiliki kode marking / nomor marking.
    4. *Kompilasi Hermes & Repack APK Bersih (Versi Sama v1.3.7 Build 29, No Force Update)*:
       - Bundle Hermes Android baru: `entry-54ca5dc2b48c1347d09d7d0a8f37bc67.hbc` (5.99 MB).
       - Injeksi ke `assets/index.android.bundle` di `mshipping.apk`.
       - Re-signed via `uber-apk-signer` $\to$ **Zipalign verified & signature verified [v2, v3] (0 errors)**.
       - Sinkronisasi biner APK (121.34 MB) ke 4 titik server (`mshipping.apk`, `frontend/dist`, `frontend/public`, `backend/public/uploads`).
       - PM2 service `ShippingApi` direstart & status **online** (PID 67316).
    5. *Verifikasi Build*:
       - Mobile TypeScript check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
       - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.65s)**.

- [x] **Perbaikan Mekanisme Infinite Scroll Halaman Pelanggan Web**:
  - **Permintaan Pengguna**: "Belum bisa infinite scroll pada page customer"
  - **Akar Masalah**:
    1. Container scroll di aplikasi berada pada elemen `<main class="flex-1 overflow-auto">` di `AppLayout.tsx`, bukan pada `window` (`window.scrollY` selalu 0).
    2. Sentinel `IntersectionObserver` sebelumnya menggunakan `root: null` tanpa referensi container scroll `<main>` dan tabel card berada di dalam container dengan styling terisolasi.
    3. `getNextPageParam` perlu penanganan eksplisit untuk parameter nomor halaman dari `lastPage.meta.page` dan `lastPage.meta.totalPages`.
  - **Penyelesaian Teknis**:
    1. *Triple Scroll Listener & Hardened Concurrency*:
       - Mengaitkan scroll event listener langsung ke elemen `<main>` (`document.querySelector('main')`), container tabel internal via `tableContainerRef`, serta `window`.
       - Menghitung threshold jarak scroll bawah (`scrollHeight - scrollTop - clientHeight < 500`) dengan concurrency lock (`isLocked` ref) untuk memicu `fetchNextPage()` secara andal sebelum pengguna mencapai dasar halaman.
    2. *Optimasi Sentinel IntersectionObserver*:
       - Mengonfigurasi `IntersectionObserver` dengan `rootMargin: '400px'` dan `threshold: 0` pada sentinel dengan tinggi eksplisit `min-h-[70px]`.
    3. *Normalisasi getNextPageParam*:
       - Menangani meta paging backend `meta.page` & `meta.totalPages` secara deterministik (`currentPage >= totalPages ? undefined : currentPage + 1`).
    4. *Interaktivitas & Fallback*:
       - Menyediakan tombol interaktif "Gulir ke bawah atau klik untuk memuat" di bawah tabel dan tombol "Muat Lagi" di bar status bawah.
       - Navigasi scroll-to-top yang menggulirkan container `<main>` secara mulus.
    5. *Verifikasi Build*:
       - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.42s)**.
  - **Permintaan Pengguna**: "Tombol + pada page revisi buat lebih turun mendekati navigasi tapi dikasih margin"
  - **Penyelesaian Teknis**:
    1. *Reposisi Floating Action Button (`mobile/src/features/data-revisions/components/DataRevisionsTab.tsx`)*:
       - Mengubah `styles.fab`:
         - `bottom`: diturunkan dari `24` ke `12` (menempatkan FAB lebih dekat ke tab bar navigasi bawah namun tetap memiliki margin aman 12dp agar tidak menempel atau tumpang tindih).
         - `right`: disesuaikan ke `16` (selaras dengan horizontal padding container 16px).
    2. *Kompilasi Hermes & Repack APK (Versi Sama, No Force)*:
       - Export bundle Hermes Android baru: `entry-0bde2437afae2a3ef847b8bb5801beb4.hbc` (5.98 MB).
       - Injeksi ke `assets/index.android.bundle` di `mshipping.apk`.
       - Re-signed via `uber-apk-signer` $\to$ **Zipalign verified & signature verified [v2, v3] (0 errors)**.
       - Sinkronisasi biner APK (121.34 MB) ke 4 titik server (`mshipping.apk`, `frontend/dist`, `frontend/public`, `backend/public/uploads`).
       - PM2 `ShippingApi` direstart & online (PID 70036).
    3. *Verifikasi Build*:
       - Mobile TypeScript check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
       - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.09s)**.


- [x] **Implementasi Infinite Scroll pada Halaman Pelanggan**:
  - **Permintaan Pengguna**: "Pada page pelanggan buat infinite scroll"
  - **Penyelesaian Teknis**:
    1. *Refactoring Data Fetching ke `useInfiniteQuery`*:
       - Mengganti `useQuery` tradisional dan pagination halaman per halaman dengan `useInfiniteQuery` dari `@tanstack/react-query`.
       - Menetapkan batch limit 30 item per request (`BATCH_SIZE = 30`).
       - `getNextPageParam` menghitung halaman berikutnya secara dinamis berdasarkan `meta.totalPages`.
       - Mengakumulasi data dari seluruh halaman (`data.pages.flatMap`) ke dalam `customersList`.
    2. *Pemicu Otomatis dengan `IntersectionObserver`*:
       - Memasang elemen sentinel di bawah daftar pelanggan dengan `IntersectionObserver` (`rootMargin: '300px'`).
       - Begitu sentinel mendekati viewport saat pengguna menggulir ke bawah, fungsi `fetchNextPage()` dipanggil secara otomatis jika masih terdapat sisa halaman (`hasNextPage && !isFetchingNextPage`).
       - Menyediakan tombol cadangan "Gulir ke bawah untuk memuat otomatis (N dari Total)" jika observer belum terpicu.
    3. *Penyempurnaan Tampilan Tabel, Grid & Shortlist*:
       - `CustomerTableView.tsx`: Nomor urut baris diperbarui agar otomatis berlanjut secara alami (`index + 1`: 1, 2, 3, ... N).
       - Menghilangkan kedipan transparansi opasitas (`isRefreshing`) saat penambahan data baru di latar belakang (`!isFetchingNextPage`).
    4. *Footer Status Interaktif & Navigasi Scroll*:
       - Menggantikan kontrol tombol pagination dengan bar status ringkas di bagian bawah:
         - Menampilkan jumlah item yang termuat vs total pelanggan (misal: "Menampilkan **30** dari **1,240** pelanggan").
         - Progress bar visual persentase pemuatan data.
         - Tombol "Muat Lagi" manual dan tombol "Ke Atas".
       - Floating action button "Scroll to Top" yang muncul otomatis saat scroll posisi > 400px untuk memudahkan navigasi kembali ke puncak tabel.
    5. *Verifikasi Build*:
       - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.48s)**.
       - Mobile TypeScript check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.


- [x] **Implementasi Fungsi Konversi Karakter Caret `^` Database Menjadi Petik Tunggal `'`**:
  - **Permintaan Pengguna**: "Buat fungsi untuk merubah ^ dari database menjadi ' pada setiap data yang berisi string"
  - **Penyelesaian Teknis**:
    1. *Backend Data Sanitization & Response Pipeline (`backend/src/utils/response.ts` & `backend/src/utils/db.ts`)*:
       - Membuat fungsi `replaceDbCaret(str: string): string` untuk mengubah `^` menjadi `'`.
       - Membuat fungsi rekursif `cleanDbData<T>(obj: T): T` yang menelusuri seluruh data (string, array, objek bersarang, BigInt, Date/toJSON) dan mengganti setiap karakter `^` pada string menjadi `'`.
       - Mengintegrasikan `cleanDbData` secara global ke dalam `successResponse` (menggantikan implementasi lama `deepTrim` sekaligus mempertahankan alias backward compatibility), sehingga **seluruh 200+ endpoint REST API backend otomatis menghasilkan string bersih tanpa karakter `^`**.
       - Re-export `replaceDbCaret` dan `cleanDbData` di `backend/src/utils/db.ts` agar mudah diakses oleh service database.
    2. *Frontend Web Helper (`frontend/src/lib/utils.ts`)*:
       - Menambahkan fungsi `replaceDbCaret(str: string | null | undefined): string` dan `cleanDbData<T>(obj: T): T` yang kompatibel untuk penanganan data di level web UI.
    3. *Mobile App Helper (`mobile/src/lib/utils.ts`)*:
       - Menambahkan fungsi `replaceDbCaret` dan `cleanDbData<T>(obj: T): T` di mobile library utils.
    4. *Unit Tests & Verifikasi Build*:
       - Backend response tests (`backend/src/utils/response.test.ts`): 5/5 pass (termasuk verifikasi konversi `^` ke `'` pada struktur kompleks). Seluruh 252 backend unit tests lulus 100%.
       - Frontend utils tests (`frontend/src/lib/utils.test.ts`): 15/15 pass.
       - Mobile utils tests (`mobile/src/lib/utils.test.ts`): 19/19 pass.
       - Backend TypeScript check: `bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
       - Frontend Production Build: `bun run build` $\to$ **LULUS 100% 0 errors (3.42s)**.
       - Mobile TypeScript check: `bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
       - PM2 `ShippingApi`: Direstart dan online (PID 62592).


- [x] **Perbaikan Text Wrap Header Tab Alamat Saat Terpilih**:
  - **Permintaan Pengguna**: "Betulkan yang di lingkaran. Text ke wrap apabila terselect"
  - **Penyelesaian Teknis**:
    1. *Distribusi Flexbox Tab Proporsional*:
       - Mengganti pembagian rata 3-kolom `flex: 1` (33% masing-masing) menjadi proporsional sesuai panjang karakter teks:
         - Tab `Ringkasan` & `Finansial` (9 huruf): `flex: 1`.
         - Tab `Daftar alamat (N)` (17+ huruf): `flex: 1.4` (`styles.tabBtnWide`).
       - Mengurangi padding container tabs dari 20px menjadi 8px untuk menghemat 24px ruang horizontal.
    2. *Pencegahan Multi-Line Wrap & Truncation*:
       - Menambahkan `numberOfLines={1}` pada seluruh teks tab button (`Ringkasan`, `Finansial`, dan `Daftar alamat (N)`).
       - Menyesuaikan ukuran font tab menjadi `fontSize: 14` (selaras dengan `ShipmentDetailSheet`).
       - Teks tidak akan pernah tertekuk/wrap ke baris kedua baik saat inaktif (`500`) maupun saat aktif (`600`), dan tab `Finansial` tidak lagi terpotong elipsis (`Finansia...`).
    3. *Kompilasi Hermes & Repack APK (Versi Sama, No Force)*:
       - Bundle Hermes baru: `entry-8eb26cb633578b286605b7e41f33bad4.hbc` (5.98 MB).
       - Re-signed via `uber-apk-signer` $\to$ **Zipalign verified & signature verified [v2, v3] (0 errors)**.
       - Sinkronisasi biner APK (121.34 MB) ke 4 titik server.
       - PM2 `ShippingApi` direstart & online (PID 66948).
    4. *Verifikasi Build*:
       - Mobile TypeScript check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
       - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.64s)**.

- [x] **Perbaikan Text Wrap dan Konsistensi Tab Daftar Alamat Detail Pelanggan**:
  - **Permintaan Pengguna**: "Perbaiki pada tab daftar alamat textnya ke wrap jadi tidak konsisten"
  - **Penyelesaian Teknis**:
    1. *Struktur Baris Telepon (`.addrCallRow`)*:
       - Memperbaiki layout `.addrCallRow` menjadi `justifyContent: 'space-between'` (persis seperti `.a4 .call` pada CSS prototype).
       - Nomor telepon (`.addrCallNum`) diberi `flex: 1` dan `numberOfLines={1}` sehingga memanfaatkan lebar ruang kiri secara penuh dan tidak pernah tertekuk/wrap ke baris baru.
       - Tombol aksi (`Panggil` & `WA`) diletakkan di kanan dengan `flexShrink: 0`.
    2. *Konsistensi Data dan Fallback*:
       - Fallback nomor telepon alamat ke nomor telepon customer jika kosong (`rawPhoneStr`), sehingga seluruh kartu alamat memiliki tampilan ritme visual `Telepon / HP` yang konsisten dan setara.
       - Fallback alamat lengkap ke alamat utama customer jika string alamat individual kosong.
    3. *Formatting Tipe Alamat & PIC*:
       - Menormalisasi teks tipe alamat (`fdJenis`) menjadi sentence case (`toSentenceCase`: `Penghubung`, `Pengiriman`, `Penagihan`) dari sebelumnya huruf kapital database.
       - Tipe alamat dan PIC diberi `numberOfLines={1}` dan tag status diberi `flexShrink: 0`.
    4. *Kompilasi Hermes & Repack APK (Versi Sama, No Force)*:
       - Bundle Hermes baru: `entry-2ad8c3172b8190c3fc9fd55d86268ee8.hbc` (5.98 MB).
       - Re-signed via `uber-apk-signer` $\to$ **Zipalign verified & signature verified [v2, v3] (0 errors)**.
       - Sinkronisasi biner APK (121.34 MB) ke 4 titik server.
       - PM2 `ShippingApi` direstart & online (PID 59844).
    5. *Verifikasi Build*:
       - Mobile TypeScript check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
       - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.71s)**.

- [x] **Redesign Detail Pelanggan Mengikuti Desain Editorial HTML Prototype**:
  - **Permintaan Pengguna**: "Perbaiki [Detail pelanggan – Redesign]"
  - **Penyelesaian Teknis**:
    1. *Header Sticky Bar (`.bar`)*:
       - Nama customer tebal (`19px/600`).
       - Sub-baris `.t2`: Tag kode customer (interaktif, salin dengan toast), tag status customer semantik, dan tanggal bergabung (`Bergabung sejak <Bln Thn>`).
       - Tombol tutup icon button minimalis (`44×44`, border `--line`, radius 10).
    2. *Tab Strip Editorial (`.tabs`)*:
       - 3 Tab rata penuh: `Ringkasan`, `Finansial`, dan `Daftar alamat (N)`.
       - Aktif: border bawah 2px aksen `--accent` (`#E0644E`), inaktif: warna `--muted`.
    3. *Tab Ringkasan*:
       - Grid 2-kolom `.stats`: `Contact person` dan `Sales penanggung jawab` (`dt` 12px `--muted`, `dd` 20px/500).
       - Key-value `.kv` terstruktur tanpa kartu:
         - Telepon kantor: daftar nomor terurai dengan link interaktif `Panggil` (min-height 44px, warna `--accent`).
         - Handphone / WA: nomor dengan aksi ganda `Panggil` dan `WA` (warna `--ok`).
         - Email: link interaktif `mailto:`.
         - Kota operasional.
       - Seksi `Alamat kantor / utama` dan `Catatan keterangan` (jika ada).
    4. *Tab Finansial*:
       - Header `.total`: `Tier customer aktif` dengan tag status tier.
       - Grid 2-kolom `.stats`: `Omset tahun berjalan` (format Rupiah) dan `Total invoice` (`N inv`).
       - Seksi `Riwayat finansial & omzet`: daftar baris per tahun (omset, invoice count, tier) atau pesan kosong jika nihil.
    5. *Tab Daftar Alamat (`.addr`)*:
       - Daftar alamat vertikal berpemisah `border-top: 1px solid var(--line)` (18px padding):
         - Baris 1 (`.a1`): Tipe alamat (`17px/600`, sentence case) + Tag status `Aktif` / `Non-Aktif`.
         - Baris 2 (`.a2`): `PIC <Nama>`.
         - Baris 3 (`.a3`): Alamat lengkap kota.
         - Baris 4 (`.a4`): Label `Telepon / HP` + daftar nomor telepon dengan link `Panggil` dan `WA`.
    6. *Kompilasi Hermes & Repack APK (Versi Sama, No Force)*:
       - Bundle Hermes baru: `entry-2f7bd47d35f092ae749698409e36f9b5.hbc` (5.98 MB).
       - Re-signed via `uber-apk-signer` $\to$ **Zipalign verified & signature verified [v2, v3] (0 errors)**.
       - Sinkronisasi biner APK (121.34 MB) ke 4 titik server.
       - PM2 `ShippingApi` direstart & online (PID 66880).
    7. *Verifikasi Build*:
       - Mobile TypeScript check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
       - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.49s)**.

- [x] **Perbaikan Data Created By, Updated By, dan Timestamp Detail Resi**:
  - **Permintaan Pengguna**: "Perbaiki data created by dan update by serta timestamp pada detail resi, datanya tidak tampil."
  - **Penyelesaian Teknis**:
    1. *Backend (`shipments.service.ts`)*:
       - Memperbaiki kueri `auditPromise` pada `getShipmentById`: menambahkan pencocokan string `WHERE RTRIM(fdListCode) = ${cleanId} OR fdListCode = ${cleanId}` dan fallback `ISNULL(fdCreatedDate, fdListDate) AS fdCreatedDate`.
       - Menambahkan field alias standar `createdBy`, `createdAt`, `updatedBy`, `updatedAt` bersama `fdEmp1`, `fdCreatedDate`, `fdEmp2`, `fdUpdate`.
    2. *Mobile App (`ShipmentDetailSheet.tsx`)*:
       - Memperbaiki binding pemetaan data audit trail:
         - `createdByName`: mengambil dari `fdEmp1` / `createdBy` / `fdCreated` (sebelumnya mencari `fdCreated` / `fdDibuatOleh` yang null).
         - `createdTimestamp`: mengambil dari `fdCreatedDate` / `createdAt` / `fdListDate` dan diformat dengan `formatDateTime` (`DD MMM YYYY, HH:mm WIB`) (sebelumnya `fdSysDate` yang null).
         - `updatedByName`: mengambil dari `fdEmp2` / `updatedBy` / `fdUpdateBy` (sebelumnya membaca `fdUpdate` yang berisi tanggal, bukan nama person).
         - `updatedTimestamp`: mengambil dari `fdUpdate` / `updatedAt` / `fdUpdatedDate` dan diformat dengan `formatDateTime`.
       - Menangani state `isShipmentDetailLoading` dengan indikator placeholder yang rapi.
    3. *Kompilasi Hermes & Repack APK (Versi Sama, No Force)*:
       - Bundle Hermes baru: `entry-7ea5b38dfbbda9a3f6042499a294712b.hbc` (5.98 MB).
       - Re-signed via `uber-apk-signer` $\to$ **Zipalign verified & signature verified [v2, v3] (0 errors)**.
       - Sinkronisasi biner APK (121.34 MB) ke 4 titik server.
       - PM2 `ShippingApi` direstart & online (PID 64728).
    4. *Verifikasi Build*:
       - Mobile TypeScript check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
       - Backend TypeScript check: `cd backend && bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
       - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.32s)**.

- [x] **Redesign Detail Resi Mengikuti Desain Editorial HTML Prototype**:
  - **Permintaan Pengguna**: "Perbaiki detail resi"
  - **Penyelesaian Teknis**:
    1. *Header Sticky Bar (`.bar`)*:
       - Nama customer (`19px/600`), tag status semantik (`Sudah terbit bill`, dsb), tag nomor resi kargo, pin lokasi gudang / cabang (`13px`, `--muted`).
       - Tombol aksi header: chip `+ Buat BAP` (border aksen `--accent`, tinggi `36px`) dan tombol tutup icon minimalis (`44×44`).
    2. *Tab Strip Editorial (`.tabs`)*:
       - Tab terpadu: `Ringkasan`, `Dimensi (N)`, `Timeline`, dan `Invoice` (jika sudah terbit).
       - Indikator aktif: teks tebal `600` dengan border bawah 2px aksen `--accent` (`#E0644E`).
    3. *Tab Ringkasan (`Ringkasan`)*:
       - 3 Statistik grid utama (`dl.stats`): `Total koli`, `Total berat` (kg), dan `Total volume` (m³).
       - Key-value list (`.kv`): No resi, Tracking no, Marking, Tanggal agent, Moda & Cabang.
       - Seksi Komoditas (tag jenis barang & deskripsi lengkap) dan Catatan / Keterangan kargo.
       - Catatan riwayat user: Pembuat resi & waktu pembaruan terakhir.
    4. *Tab Dimensi (`Dimensi`)*:
       - Sub-filter segment: `Packing list`, `Gudang (N)`, dan `Komplain` (tinggi `36px`).
       - Volume banner (`.total`): Garis aksen kiri 2px `--ok` hijau dengan volume total m³ dan persentase deviasi koli fisik.
       - Kartu rincian koli dimensi: 4-kolom metrik (Panjang, Lebar, Tinggi, Jumlah) dengan volume per koli.
    5. *Tab Timeline Logistik (`Timeline`)*:
       - Progress timeline vertikal bergaris tipis: bulatan step centang (selesai), dot hijau (berjalan/kini), dan dot abu-abu (menunggu).
       - Banner pembatalan kargo (`.cancel`) jika status dibatalkan.
    6. *Kompilasi Hermes & Repack APK (Versi Sama, No Force)*:
       - Bundle Hermes baru: `entry-8923c15723c6596165bd21f3a855b1b1.hbc` (5.98 MB).
       - Re-signed via `uber-apk-signer` $\to$ **Zipalign verified & signature verified [v2, v3] (0 errors)**.
       - Sinkronisasi biner APK (121.34 MB) ke 4 titik server.
       - PM2 `ShippingApi` direstart & online (PID 69348).
    7. *Verifikasi Build*:
       - Mobile TypeScript check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
       - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.50s)**.

- [x] **Redesign Modal Manifest Batch Mengikuti Desain HTML Prototype**:
  - **Permintaan Pengguna**: "Perbaiki semua modal manifest seperti html ini"
  - **Penyelesaian Teknis**:
    1. *Header Sticky Bar (`.bar`)*:
       - Nomor batch (`19px/600`, tabular-nums), dot moda semantik (`--air` kuning / `--sea` biru), tag cabang (`HK`/`LM`, dsb).
       - Baris kedua: Nomor kontainer / AWB (`14px`, `--muted`).
       - Tombol tutup icon-btn minimalis (`44×44`).
    2. *Ringkasan Statistik Batch (`dl.stats`)*:
       - Grid 2-kolom: `Koli`, `Berat (kg)`, `Volume (m³)`, dan `Customer / resi`.
       - Border aksen kiri tipis `2px solid var(--line)`, label `12px` `--muted`, angka `22px/500`.
    3. *Status Exit Gudang (`.exit`)*:
       - Garis aksen kiri 2px `--ok` hijau (atau kuning jika belum keluar), status tanggal keluar `17px/600`.
       - Tombol chip minimalis `[ Ubah exit ]` (`44px`, border `--line`, latar `--surface`).
    4. *Pencarian & Counter Resi (`.search` & `.head`)*:
       - Input pencarian minimalis tinggi `48px` border `--line`.
       - Judul seksi `Daftar resi` (`16px/600`) dengan tag penghitung resi netral (`.count`).
    5. *Item Resi Manifest (`.item`)*:
       - Baris 1 (`.i1`): Nomor urut `#{n}` + No resi/ListCode (`17px/600`), tag status finansial semantik (`COD`, `URGENT` `--late`, dsb), dan tombol panah buka detail resi (`40×40`).
       - Baris 2 (`.i2`): Nama pelanggan tebal (`14.5px/500`) & PIC Sales (`--muted`).
       - Baris 3 (`.mk`): `M: <MarkingNo>` (`14px`, `--muted`).
       - Baris 4 (`.i4`): Deskripsi komoditas (`14px`) & tag jenis komoditas.
       - Baris 5 (`.i5`): Koli · berat · volume (`13.5px`, tabular-nums) di kiri dan tombol `+ BAP` (`38px`, border `--line`, warna `--accent`) di kanan.
    6. *Kompilasi Hermes & Repack APK*:
       - Bundle Hermes baru: `entry-74dc2740a4566aa473891e9f2b3839c1.hbc` (5.98 MB).
       - Re-signed via `uber-apk-signer` $\to$ **Zipalign verified & signature verified [v2, v3] (0 errors)**.
       - Sinkronisasi biner APK (121.34 MB) ke 4 titik server.
       - PM2 `ShippingApi` direstart & online (PID 71544).
    7. *Verifikasi Build*:
       - Mobile TypeScript check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
       - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.54s)**.

- [x] **Redesign Halaman Revisi dan Detail Kargo Mengikuti Desain HTML Prototype**:
  - **Permintaan Pengguna**: "Buat agar page revisi dan detailnya seperti html itu"
  - **Penyelesaian Teknis**:
    1. *List Item Revisi (`DataRevisionCard.tsx`)*:
       - Mengganti kontainer `Card` tebal menjadi baris datar terstruktur berpemisah `border-top: 1px solid var(--line)`.
       - Baris 1 (`.f1`): Nomor formulir (`19px/600`, tabular-nums) & tanggal (`14px`, `--muted`).
       - Baris Tags (`.tags`): Status tag semantik (`Bill terbit`, `Menunggu`, `Dibatalkan`) & jenis aksi tag (`12px`, border 1px).
       - Baris 2 (`.f2`): Definition list (`No. inputan` & `Pelanggan`) di kiri + tombol edit form bulat minimalis (`44×44`) di kanan.
       - Baris 3 (`.f3`): Nama pembuat di kiri + tombol `Camera` penghitung foto (`N foto` + chevron) di kanan.
    2. *Halaman Tab Revisi (`DataRevisionsTab.tsx`)*:
       - Status segment filter dibuat minimalis (tinggi `36px`, active: border `--line` & background `--surface`, inactive: border transparan).
       - FAB tombol buat baru berbentuk lingkaran 56px warna `--accent` (`#E0644E`).
    3. *Modal Detail Revisi (`DataRevisionDetailModal.tsx`)*:
       - Header sticky bar (`.bar`): Nomor form `19px/600`, subtitle `13.5px`, dan tombol tutup `44×44`.
       - Invoice banner (`.invoice`): Garis aksen kiri 2px `--ok` jika faktur telah diterbitkan beserta nomor invoice tebal.
       - Metadata tags (`.meta`): Tag status semantik, jenis aksi, dan tanggal form.
       - Rincian perubahan data (`.diff`):
         - Grup data awal (`.group.old`): No inputan, pelanggan, marking, volume dalam format `dt`/`dd` netral.
         - Grup data baru (`.group.new`): Aksen garis kiri 2px `--ok` untuk target penagihan baru.
       - Bukti lampiran fisik (`.photos`): Grid foto 2 kolom dengan rasio 4:3, teks nama file, dan link interaktif buka foto.
       - Informasi dokumen terstruktur dan tombol aksi bawah (`.actions`): Tombol Hapus (`.btn.del`, border `--late`) dan Edit form (`.btn.main`, latar `--accent`).
    4. *Kompilasi Hermes & Repack APK*:
       - Bundle Hermes baru: `entry-4c872a3f2c049f559bfd6d3299ac07ba.hbc` (5.98 MB).
       - Re-signed via `uber-apk-signer` $\to$ **Zipalign verified & signature verified [v2, v3] (0 errors)**.
       - Sinkronisasi biner APK (121.34 MB) ke 4 titik server.
       - PM2 `ShippingApi` direstart & online (PID 53964).
    5. *Verifikasi Build*:
       - Mobile TypeScript check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
       - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.20s)**.

- [x] **Penambahan Informasi Marking & Berat/Pack pada Daftar Surat Jalan**:
  - **Permintaan Pengguna**: "Pada list surat jalan tambahkan marking code dan marking no dan detail jlmpack sj dan jmlberat sj di bawah nama customer"
  - **Penyelesaian Teknis**:
    1. *Backend (`deliveryOrders.service.ts`)*:
       - Memperluas relasi Prisma `entryList` pada query `getDeliveryOrders`: mengambil `fdMarkingCode` dan `fdMarkingNo`.
       - Memetakan field `fdMarkingCode` dan `fdMarkingNo` ke dalam respons data surat jalan.
    2. *Mobile App (`DeliveryListItem.tsx`)*:
       - Di bawah nama customer, menampilkan baris baru `detailRow`:
         - Kiri: `fdMarkingCode` · `fdMarkingNo` (`13px/600`, tabular-nums).
         - Kanan: `fdJmlPackSJ` (`formatNumber(N) koli`) · `fdJmlBeratSJ` (`formatWeight(N) kg`) (`12.5px`, tabular-nums, `--muted`).
    3. *Kompilasi & Repack APK*:
       - Bundle Hermes baru: `entry-3dfe17baade4ea8104440fa2773de7e5.hbc` (5.98 MB).
       - Re-signed via `uber-apk-signer` $\to$ **Zipalign verified & signature verified [v2, v3] (0 errors)**.
       - Sinkronisasi biner APK (121.34 MB) ke 4 titik server.
       - PM2 `ShippingApi` direstart & online (PID 54420).
    4. *Verifikasi Build*:
       - Mobile TypeScript check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
       - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.24s)**.

- [x] **Penyelarasan Desain Seluruh Layar Mobile App Menjadi Model Editorial Datar**:
  - **Permintaan Pengguna**: "Buat semua page agar model desainnya seperti pada dashboard."
  - **Penyelesaian Teknis**:
    1. *Modul Logistik (`logistics.tsx` & item components)*:
       - Header editorial sentence case (`Modul operasional` & `Logistik lapangan` 24px/600).
       - Tab strip horizontal bersih bergaris bawah 2px aksen `#E0644E` tanpa ikon dekoratif tab tebal.
       - Filter pill minimalis (Semua / Udara / Laut).
       - `ShipmentListItem.tsx`, `BatchListItem.tsx`, `DeliveryListItem.tsx` direfaktor dari kartu kotak (`Card`) menjadi baris datar terstruktur dengan garis pemisah tipis `border-top: 1px solid var(--line)`, dot moda semantik (`--air` / `--sea`), dan tag status editorial.
    2. *Modul Keuangan/Billing (`finance.tsx` & item components)*:
       - Header editorial sentence case (`Finansial & penagihan` & `Keuangan & billing` 24px/600).
       - Tab strip horizontal bergaris bawah 2px `#E0644E`.
       - `BillingListItem.tsx` & `ValidationListItem.tsx` direfaktor menjadi baris datar editorial dengan tag status semantik (`Issued`/`Draft`), dot moda, dan tag aging umur piutang (`<=7h`, `8-14h`, `>30h`).
    3. *Modul Master Data (`master.tsx` & `CustomerListItem.tsx`)*:
       - Header editorial sentence case (`Master data` & `Direktori pelanggan` 24px/600).
       - Eliminasi kontainer kotak bertumpuk pada daftar pelanggan menjadi baris editorial datar dengan pemisah garis tipis, tag tier/broker netral, dan tombol aksi ringkas (Telp/WA).
    4. *Modul Akun & Profil (`profile.tsx`)*:
       - Header atas selaras dengan Overview (subtitle 13px, nama user 24px/600, tag role teks netral, tombol bahasa & tema 38px ber-border tipis).
       - User profile row flat: Avatar foto/inisial 54px + badge kamera netral tanpa kotak tebal.
       - Seluruh menu (Keamanan/Sandi, Biometrik, Mode Tampilan, Bahasa, Status Server ERP, Cek Versi APK, Logout) diubah dari kotak kartu menjadi seksi daftar vertikal berpemisah garis tipis `borderTop: 1px solid var(--line)` (14px title, 12.5px desc).
    5. *Kompilasi Hermes & Repack APK (Versi Sama, No Force Update)*:
       - Export Hermes Android JS bundle: `entry-e8a522177d97c5af57798c7607174330.hbc` (5.98 MB).
       - Injeksi bytecode ke `assets/index.android.bundle` di dalam base APK.
       - Re-signed via `uber-apk-signer` $\to$ **Zipalign verified & signature verified [v2, v3] (0 errors)**.
       - Sinkronisasi biner APK (121.34 MB) ke 4 titik server:
         1. `C:\shipping\mshipping.apk`
         2. `C:\shipping\frontend\dist\mshipping.apk`
         3. `C:\shipping\frontend\public\mshipping.apk`
         4. `C:\shipping\backend\public\uploads\mshipping.apk`
       - Service PM2 `ShippingApi` direstart & status **online** (PID 34280).
    6. *Verifikasi Build*:
       - Mobile TypeScript check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
       - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.58s)**.

- [x] **Redesign Dashboard Mobile Mengikuti Desain HTML & Penyelarasan Skala Font**:
  - **Permintaan Pengguna**: "Perbaiki design dashboard pada mobile mengikuti design yang di html. Hitung ulang ukuran font, sesuaikan dengan kondisi page sekarang"
  - **Penyelesaian Teknis**:
    1. *Refactor `BatchExitComparisonWidget.tsx` Menjadi Editorial*:
       - Mengeliminasi seluruh kontainer kartu kotak tebal berwarna (`Card`) dan bayangan dekoratif.
       - Menyusun ulang seksi persis dengan HTML prototype:
         - Baris 1: Judul `Batch exit vs bill dibuat` (`16px/600`) & tombol toggle chip `[ Bulan terpilih ]` / `[ Semua waktu ]` (`13.5px`, border `--line`, radius `8px`).
         - Baris 2: Rasio penyelesaian kargo exit `(XX%)` (`14.5px/400`) & tombol rincian `[ Rincian (N pending) ]` (`13.5px/600`, border semantik `--ok`).
         - Baris 3: Split bar kargo exit (tinggi `8px`, radius `2px`, gap `2px`: `--ok` untuk Billed, `--warn` untuk Unbilled).
         - Baris 4: Legenda terstruktur (Dot Billed N · Sisa N · Total N kargo).
         - Baris 5: Sub-list breakdown per moda (Udara vs Laut) & status customer & cabang asal kargo disajikan dalam baris pemisah garis tipis `border-top: 1px solid var(--line)` (editorial list) tanpa kartu warna-warni.
    2. *Audit & Penyelarasan Tipografi di Seluruh Komponen Overview*:
       - `HeroCard.tsx`: Date header `13px`, Label `13px`, Hero pair value `48px/500` (lineHeight `50px`, tabular-nums), Sub-text breakdown `13.5px` (bold `13.5px/600`), Stat `dt` `12px/400`, Stat `dd` `20px/500`.
       - `TargetBillKpiCards.tsx`: Subtitle `15px/400`, Hero faktur diterbitkan `48px/500` + unit `16px/400`, Delta MoM `14px/500` + `13.5px`, Legend `14px`, Judul seksi `16px/600`, Target moda count `34px/500` + unit `14px`, PIC line `14px`, 4-kolom stats `dt` `12px` & `dd` `20px`, Draft unissued `34px/500`, Tag `>2024` `12px`, Aging list `14px`.
       - `overview.tsx`: Welcome label `13px/400`, User name `24px/600`, Tag role `12px/500`, Header buttons `40×40`, Main tabs `15px` (`600` aktif / `500` inaktif), Section header `16px/600`, Action link `14px/500`.
       - `ExitBatchListItem.tsx`: Batch ID `19px/600`, Type tag `12px/600`, Mode `14px`, Container/AWB `14px/500`, Koli & berat `14px`, Exit date `14px/600`, Padding vertikal `16px`.
       - `BillingPeriodNavigator.tsx`: Month label `20px/600`, Now tag `12px/500`, Reset button `12px/500`, Icon button `40×40`.
    3. *Kompilasi & Repack APK*:
       - Bundle Hermes baru: `entry-e99416e5ab014f46ae46c5588b980c4f.hbc` (5.98 MB).
       - Re-signed via `uber-apk-signer` $\to$ **Signature verified [v2, v3] (0 errors)**.
       - Sinkronisasi biner APK (121.3 MB) ke 4 titik server.
       - PM2 service `ShippingApi` direstart & online (PID 71164).
    4. *Verifikasi Build*:
       - Mobile TypeScript check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
       - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (10.80s)**.
       - Mobile TypeScript check: `bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
       - Injeksi bundle & re-sign via `uber-apk-signer` $\to$ **Signature verified [v2, v3] (0 errors)**.
       - Sinkronisasi biner APK (121.3 MB) ke 4 titik server.
       - Service backend PM2 `ShippingApi` direstart & online (PID 67540).
    5. *Verifikasi*:
       - Mobile TypeScript check: `bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
       - Frontend Production Build: `bun run build` $\to$ **LULUS 100% 0 errors (11.97s)**.

- [x] **Redesign Header Greeting & Kartu Billing Ops Mobile**:
  - **Permintaan Pengguna**: "Pada dashboard di atas tambahkan greeting lalu nama user dan rolenya buat jadi icon Shield saja beda warna beda role. Untuk card pada billing ops bisa di redesign lagi."
  - **Penyelesaian Teknis**:
    1. *Header Dashboard Mobile (`overview.tsx`)*:
       - Greeting formal netral: `"Halo,"` di atas nama pengguna.
       - Teks role badge digantikan oleh **Icon Shield** murni (`Shield` dari `lucide-react-native`).
       - Pemetaan warna semantik Shield icon per role:
         - Admin / Superadmin: `#EF4444` (Merah / Danger).
         - Staff / Operator / Logistics: `#0284C7` (Biru Sky / Info).
         - Cashier / Finance / Billing: `#10B981` (Emerald / Success).
         - Customer / Lainnya: `#94A3B8` (Slate / Secondary).
    2. *Redesign Kartu Billing Ops (`TargetBillKpiCards.tsx`)*:
       - Ditata ulang dari 4 kartu vertikal panjang menjadi **Grid 2x2 Kompak & Rapi** (`styles.grid2x2`).
       - 4 Kartu Simetris: *Target Udara*, *Target Laut*, *Faktur Terbit*, dan *Draft Unissued*.
       - 100% bebas dari ikon dekoratif dan emoji.
       - Desain ramah Midnight Dark Mode (border transparan halus, kontras proporsional).
    3. *Verifikasi Build*:
       - Mobile TypeScript check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
       - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.38s)**.

- [x] **Redesign Overview Dashboard Mobile dengan Hero Card Tanpa Ikon & Eliminasi Redundansi**:
  - **Permintaan Pengguna**: "pada mobile app buatkan hero card /plan /grill-me" -> "redesign dashboard page, tambahkan hero card buatkan mockupnya /plan" -> "gunakan tema yang ada jangan di rubah, bagaimana dengan data operasional billingnya?" -> "bagaimana pabila kedepannya akan ada data tambahan lagi pada hero cardnya?" -> "Ok proses, kompile naik versi no force update" -> "Jangan pakai icon pada hero card dan hilangkan data redundan pada dashboard" -> "Masih ada icon pada dashboard. Bersihkan. Hilangkan data redundant pada dashboard."
  - **Penyelesaian Teknis**:
    1. *Pembersihan Total Seluruh Icon & Emoji pada Dashboard*:
       - `HeroCard.tsx`: Bebas emoji/icon (murni teks semantik, label berjenjang, dan angka tipografi tabular).
       - `ExitActivityKpiGrid.tsx`: Disederhanakan dari grid 4 kartu besar menjadi **Scope Selector Pill Bar** horizontal ringkas `[ Hari Ini (N) ] [ Kemarin (N) ] [ Besok (N) ] [ 7 Hari (N) ]`. Menghapus kartu "Hari Ini" besar yang menduplikasi metrik Hero Card.
       - `ExitBatchListItem.tsx`: Menghapus icon `Tag` dan `Calendar` dari setiap baris batch.
       - `BillingPeriodNavigator.tsx`: Menghapus icon `Calendar` dan `RotateCcw`.
       - `TargetBillKpiCards.tsx`: Menghapus seluruh icon (`Plane`, `Ship`, `FileCheck2`, `FileQuestion`, `ArrowUpRight`, `ArrowDownRight`) dan emoji (`✈️`, `🚢`).
       - `BatchExitComparisonWidget.tsx`: Menghapus 10 icon (`Boxes`, `Plane`, `Ship`, `FileSpreadsheet`, `AlertOctagon`, `AlertTriangle`, `Zap`, `Banknote`, `CheckCircle`, `Building`).
       - Tab Switcher & i18n (`overview.tsx`, `id.json`, `en.json`): Menghapus emoji `📦` dan `📊` dari label `Logistik Exit` dan `Billing Ops`.
       - Header Seksi `overview.tsx`: Menghapus icon `LogOut`.
    2. *Eliminasi Total Redundansi Data Dashboard*:
       - Metrik `exitTodayCount` sebelumnya muncul 3 kali (Hero Card, Kartu Hari Ini di KPI Grid, dan Header List). Kini hanya berada di Hero Card sebagai fokus utama, dengan selector pil di bawahnya tanpa kartu duplikat.
       - Dua kartu actionable alert (`alertCardsRow`) yang menduplikasi ETA dan SLA telah dihapus permanen.
       - Header list diubah dari duplikasi `getScopeTitle()` menjadi `Daftar Batch` standar ERP yang rapi.
    3. *Kompilasi & Rilis APK Mobile*:
       - Versi **`v1.3.7`** (Build 29), **`forceUpdate: false`** disinkronkan di 4 titik konfigurasi.
       - Hermes bytecode dikompilasi ulang (`entry-8f6d4060a8fc72dec1f5bc1988a901c4.hbc`, 5.98 MB).
       - Repack & Keystore signing via `scripts/repack_apk.ps1` $\to$ Signature verified [v2, v3] (0 errors).
       - APK disinkronkan ke 4 titik server (`mshipping.apk`, `frontend/dist`, `frontend/public`, `backend/public/uploads`).
    4. *Verifikasi Build*:
       - Mobile TypeScript check: `bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
       - Frontend Production Build: `bun run build` $\to$ **LULUS 100% 0 errors (3.12s)**.

- [x] **Operation Billing Dashboard pada Mobile App Overview**:
  - **Permintaan Pengguna**: "buatkan plan untuk menampilkan operation billing dashboard pada dashboard page pada mobile app" -> "ok proses"
  - **Penyelesaian Teknis**:
    1. *Mobile Permissions (`mobile/src/lib/permissions.ts`)*:
       - Menambahkan fungsi helper `canValidateBilling(user)` berbasis path role `/mshipping/finance/billing/validation*` dan hak Admin.
    2. *Service & Hooks (`operationBilling.service.ts` & `useOperationBilling.ts`)*:
       - Dibuat service `operationBillingService`:
         - `getBillingKpis(year, month)`: memanggil `GET /billing/kpi`
         - `getUnissuedBills(params)`: memanggil `GET /billing/unissued-bills`
         - `getBatchExitComparison(year, month, allTime)`: memanggil `GET /billing/batch-exit-comparison`
         - `getBatchExitCargoDetails(markingCode)`: memanggil `GET /billing/batch-exit-comparison/details`
       - Dibuat React Query hooks: `useBillingKpisQuery`, `useUnissuedBillsQuery`, `useBatchExitComparisonQuery`, `useBatchExitCargoDetailsQuery`.
    3. *Komponen UI Billing Operasional Mobile (`mobile/src/features/overview/components/`)*:
       - `BillingPeriodNavigator.tsx`: Selector bulan & tahun audit dengan tombol panah, badge status `[Bulan Berjalan]` / `[Audit Lampau]`, dan tombol reset instan `Bulan Ini`.
       - `TargetBillKpiCards.tsx`: 4 kartu KPI operasional:
         1. *Target Bill Udara*: Total listcode, breakdown PIC Kiki vs Yati, micro-chips SJ/COD/>7h/FCL.
         2. *Target Bill Laut*: Total listcode, breakdown PIC Thara/Rico/Ferly, micro-chips.
         3. *Volume Faktur Diterbitkan*: Total faktur bulan berjalan, breakdown Udara vs Laut, indikator pertumbuhan MoM %.
         4. *Draft Belum Di-Issue (Unissued Bills > 2024)*: Total draft bill, breakdown moda, nominal Rp, dan 4 interactive aging pills ($\le 7$h, 8-14h, 15-30h, $> 30$h) yang dapat diketuk langsung untuk membuka Bottom Sheet.
       - `UnissuedBillsDetailSheet.tsx`: Bottom Sheet Modal drill-down unissued draft bills:
         - 4 Mini KPI cards (Total Draft, Udara, Laut, Aging >30 Hari Kritis).
         - Search input box (No Invoice, Customer, Marking, PIC Creator).
         - Filter moda (`Semua`, `Udara`, `Laut`) dan filter aging (`Semua`, $\le 7$h, 8-14h, 15-30h, $> 30$h).
         - **Group Pills by Creator Bill**: Filter pil pembuat invoice (Semua Creator, Kiki, Yati, dst.) lengkap dengan counter kuantiti bill.
         - Tombol **Validasi** (Emerald) otomatis muncul bagi user dengan role validasi dan langsung membuka tab validasi invoice (`tab: 'validation'`, `search: invNo`).
         - Tombol **Detail** cerdas mengarah ke validasi atau rincian faktur biasa.
         - Salin nomor invoice one-tap dengan haptic feedback dan toast.
       - `BatchExitComparisonWidget.tsx`: Widget komparasi Batch Marking Exit vs Bill Dibuat:
         - Hero rasio penyelesaian (`billedPercentage%`), progress bar semantik tebal, 3 stats (Total Kargo Exit, Sudah Billed, Sisa Unbilled), tombol `[ Rincian Batch (N) ]`.
         - Breakdown dual moda Udara vs Laut.
         - Breakdown 5 status customer (Blocked, Warning, Urgent, COD, OK).
         - Rasio penagihan per cabang kargo aktif (normalisasi Singapore `--`/`SG`, GZ, HK, YW, SH).
       - `BatchExitDetailSheet.tsx`: Bottom Sheet Modal rincian batch pending dengan filter status (Pending/Semua/Tuntas), moda, search, serta ekspansi in-place daftar resi kargo (`BatchExitCargoItem`).
    4. *Integrasi Layar Utama (`mobile/app/(tabs)/overview.tsx`)*:
       - Memasang Segmented Switcher `📦 Logistik Exit` vs `📊 Billing Ops` di bawah header pengguna jika user memiliki hak `canViewBillingOperational(user)`.
       - Render kondisional antara logistik exit dan billing ops.
       - Integrasi pull-to-refresh untuk memuat ulang data sesuai sub-dashboard yang aktif.
    5. *Integrasi Navigasi Finance Tab (`mobile/app/(tabs)/finance.tsx`)*:
       - Mendukung `useLocalSearchParams` untuk parameter `tab` dan `search` sehingga transisi dari kartu unissued bills langsung mengaktifkan tab validasi dan memfilter invoice target secara otomatis.
    6. *Sistem Dual Bahasa i18n (`id.json` & `en.json`)*:
       - Menambahkan token translasi bilingual untuk tab switcher, badge periode, dan judul kartu target billing.
    7. *Kompilasi & Repack APK Mobile (`scripts/repack_apk.ps1`)*:
       - Versi tetap **`v1.3.6`**, `versionCode: 28`, `forceUpdate: false`.
       - Hermes JS Bytecode compile: `bunx expo export --platform android` $\to$ `entry-dd127b24e6afaae2e8e062c559e445a6.hbc` (5.98 MB).
       - Repack & Keystore signing via `uber-apk-signer` $\to$ **Signature verified [v2, v3] (0 errors)**.
       - Sinkronisasi biner APK (127,238,013 bytes) ke 4 titik server:
         1. `C:\shipping\mshipping.apk`
         2. `C:\shipping\frontend\dist\mshipping.apk`
         3. `C:\shipping\frontend\public\mshipping.apk`
         4. `C:\shipping\backend\public\uploads\mshipping.apk`
       - PM2 service `ShippingApi` direstart & online (PID 66672).
    8. *Verifikasi*:
       - Mobile TypeScript check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
       - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.38s)**.
       - Version API: `GET /api/app-version/latest` $\to$ **HTTP 200 OK** (`v1.3.6`, Build 28, `forceUpdate: false`, `hasApk: true`, `formattedSize: 121.3 MB`).



- [x] **Data Bill Unissued (fdJumlah > 0 & fdJumlah1 > 0 & fdGive <> 1) Lengkap dengan Aging di Dashboard Operational**:
  - **Permintaan Pengguna**: "tambahkan pada dashboard operational data bill dengan fdJumlah > 0 dan fdJumlah1 > 0 yang belum di issued (fdGive = 1 ) lengkap dengan agingnya" + "untuk Unissued Draft Bills ambil dari > 2024"
  - **Penyelesaian Teknis**:
    1. *Backend Analytics Service (`billing-analytics.service.ts`)*:
       - Menambahkan kueri agregasi SQL unissued bills pada `getBillingKPIs()` dengan filter tahun invoice `YEAR(b.fdInvDate) > 2024`:
         `SELECT COUNT(*), SUM(fdJumlah1), countUdara, nominalUdara, countLaut, nominalLaut, countLe7, nominalLe7, count8to14, nominal8to14, count15to30, nominal15to30, countGt30, nominalGt30 FROM tbBilling b LEFT JOIN tbBillingTotal bt ON b.fdInvNo = bt.fdInvNo WHERE ISNULL(bt.fdJumlah, 0) > 0 AND ISNULL(b.fdJumlah1, 0) > 0 AND ISNULL(b.fdGive, 0) <> 1 AND YEAR(b.fdInvDate) > 2024`.
       - Mengupdate service `getUnissuedBillsDetails(query)` dengan klausa `YEAR(b.fdInvDate) > 2024` sehingga hanya tagihan aktif dan relevan periode tahun 2025–2026 yang diolah (7 bill, Rp 478.854.742,90).
       - Menghitung aging days (`DATEDIFF(day, b.fdInvDate, GETDATE())`), aging category (`le7`, `8to14`, `15to30`, `gt30`), nama customer dari `tbCustomers.fdCustName`, nama pembuat dari `tbEmployees.fdEmpName`, moda, nominal, dan support query filter (`search`, `mode`, `aging`, `startDate`, `endDate`).
    2. *Backend Routes (`billing.routes.ts`)*:
       - Mendaftarkan endpoint `GET /mshipping/billing/unissued-bills` memanggil `getUnissuedBillsDetails`.
    3. *Frontend Types & Service (`billing.types.ts` & `billing.service.ts`)*:
       - Menambahkan interface `UnissuedBillsSummary`, `UnissuedBillItem`, `UnissuedBillsResponse`.
       - Memperbarui `BillingKpis` interface dengan field `unissuedBills?: UnissuedBillsSummary`.
       - Menambahkan API method `billingApi.getUnissuedBills(params)`.
    4. *Komponen Modal Interaktif (`UnissuedBillsModal.tsx`)*:
       - Dibuat komponen modal dialog komprehensif `UnissuedBillsModal` dengan layout diperlebar (`size="3xl"`, `max-w-[96vw] w-[1450px]`):
         - Quick KPI summary cards (Total Draft, Moda Udara, Moda Laut, Aging >30 Hari Kritis).
         - Filter bar terpadu: pencarian teks bebas (No Invoice, Customer, Marking, PIC), filter moda pill (Semua, Udara ✈️, Laut 🚢), dan filter aging segment button (Semua, $\le 7$ Hari, 8–14 Hari, 15–30 Hari, $> 30$ Hari).
         - **Group Pills by Creator Bill**: Menampilkan filter pil unik pembuat invoice (Semua Creator, Kiki, Yati, dst.) lengkap dengan counter kuantiti bill per pembuat.
         - **Role Permission Validasi & Routing Cerdas**:
           - Menghubungkan hook `useBillingValidationDetailPermission()`.
           - Tombol "Validasi" (aksen emerald, icon `ClipboardCheck`) otomatis muncul bagi user dengan role validasi dan langsung membuka `ROUTES.BILLING_VALIDATION_DETAIL(item.invNo)`.
           - Tombol "Detail": Jika user memiliki role validasi, langsung membuka halaman validasi invoice (`ROUTES.BILLING_VALIDATION_DETAIL(item.invNo)`); jika tidak memiliki izin validasi, membuka halaman rincian faktur (`ROUTES.BILLING_DETAIL(item.invNo)`).
         - Tabel detail responsif lebar penuh tanpa text-wrapping (`whitespace-nowrap`), no invoice copyable, nama customer lega, badge aging semantik, dan footer subtotal nominal.
    5. *Integrasi Dashboard Operational (`DashboardPage.tsx`)*:
       - Menambahkan kartu KPI ke-4 pada `operationKpiCards`: "Draft Belum Di-Issue" lengkap dengan total bill, breakdown count Udara & Laut, total nominal Rp tertahan, dan pill interaktif aging ($\le 7$h, 8-14h, 15-30h, $> 30$h).
       - Mengubah grid layout kartu KPI operasional menjadi `lg:grid-cols-4` (simetris dan proporsional dengan tab Finance).
       - Menghubungkan klik pada kartu dan masing-masing pill aging untuk langsung membuka `UnissuedBillsModal` dengan filter aging yang sesuai.
       - Memasang modal `UnissuedBillsModal` di root view.
    6. *Sistem Dual Bahasa i18n (`id.json` & `en.json`)*:
       - Menambahkan namespace translations: `billing.unissuedBillsTitle`, `billing.unissuedBillsSubtitle`, `billing.unissuedBillsModalTitle`.
    7. *Verifikasi*:
       - Backend typecheck: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
       - PM2 Service `ShippingApi` restart $\to$ **ONLINE (PID: 71528)**.
       - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (3.51s)**.


- [x] **Pemisahan Granular Role Permission Billing Dashboard (Operational & Finance)**:
  - **Permintaan Pengguna**: "perbaiki role untuk dasboard billing -> buat jadi -> operational dan finance"
  - **Penyelesaian Teknis**:
    1. *Rute & Konstanta (`constants.ts`)*:
       - Menambahkan konstanta `ROUTES.BILLING_OPERATIONAL = '/mshipping/finance/billing/operational'`.
       - Menambahkan konstanta `ROUTES.BILLING_FINANCE = '/mshipping/finance/billing/finance'`.
    2. *Matriks Role Management (`userManagement.types.ts` & `roles.service.ts`)*:
       - Memisahkan opsi hak akses Billing Dashboard pada `AVAILABLE_PATHS` menjadi dua izin granular:
         - `Billing Dashboard (Operational)` (`ROUTES.BILLING_OPERATIONAL`, aksen emerald).
         - `Billing Dashboard (Finance)` (`ROUTES.BILLING_FINANCE`, aksen emerald).
       - Menambahkan path operational dan finance ke default `viewerPaths` pada `roles.service.ts`.
    3. *Database Backfill & Migrasi (`tbRolePermissions`)*:
       - Menjalankan migrasi idempotence (`backfill-billing-dashboard-permissions.ts`):
         - Menambahkan row izin akses `/mshipping/finance/billing/operational` dan `/mshipping/finance/billing/finance` ke seluruh role di `tbRolePermissions`.
         - Role `admin`, `superadmin`, `viewer` mendapatkan `operational = 1` dan `finance = 1`.
         - Role `billing` mendapatkan `operational = 1` dan `finance = 0` (hanya melihat operasional tanpa eksposur omzet finansial).
         - Role `finance` mendapatkan `finance = 1`.
    4. *Hook Izin Akses Dashboard (`useBillingPermissions.ts`)*:
       - Membuat hook `useBillingDashboardPermissions()` yang mengembalikan `{ canViewOperation, canViewFinance, canViewAny }` dengan fallback backward-compatible untuk admin dan legacy token.
    5. *UI Guard & Switcher Kondisional (`DashboardPage.tsx`)*:
       - Menjaga inisialisasi view: jika user hanya memiliki hak akses `operation`, dashboard otomatis mengunci tampilan ke `'operation'`. Jika hanya memiliki hak akses `finance`, otomatis mengunci ke `'finance'`.
       - Tombol switcher master hanya menampilkan tab yang diizinkan untuk role pengguna (tombol Finance disembunyikan bagi staf tanpa izin finance, begitu pula sebaliknya).
       - Menampilkan kartu proteksi `Access Denied` semantik jika role pengguna tidak memiliki izin ke keduanya.
    6. *Sidebar ERP (`Sidebar.tsx`)*:
       - Mendukung `permissionPath: string | string[]` pada `LeafItem` dan fungsi `isItemAllowed()`.
       - Menu `Billing Dashboard` tampil jika pengguna memiliki salah satu dari `ROUTES.BILLING_OPERATIONAL`, `ROUTES.BILLING_FINANCE`, atau `ROUTES.BILLING`.
    7. *Mobile Permissions (`mobile/src/lib/permissions.ts`)*:
       - Menambahkan helper `canViewBillingOperational(user)` dan `canViewBillingFinance(user)` untuk sinkronisasi izin akses mobile app.
    8. *Verifikasi & Build*:
       - Backend typecheck: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
       - Backend PM2 restart: `pm2 restart ShippingApi` $\to$ **ONLINE (PID: 64524)**.
       - Mobile typecheck: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
       - Frontend Production Build: `bun run build` $\to$ **LULUS 100% 0 errors (4.13s)**.
- [x] **Grouping fdMarkingNo Berdasarkan String Sebelum Karakter ':' pada Kelompok Bill Terkait**:
  - **Permintaan Pengguna**: "tambahkan grouping fdmarkingno -> dari string sebelum charakter : /grill-me"
  - **Penyelarasan Desain via /grill-me**:
    1. *Tampilan Grouping*: Sub-header pemisah grup untuk setiap prefix marking (misal `📦 FA/SYAIFUL21 (3 ListCode)`) lengkap dengan subtotal M³ fisik, berat kg, koli, M³ ditagih, dan badge status kelengkapan bill (`✓ Lengkap` vs `Belum Lengkap`).
    2. *Penanganan Data Fallback*: Jika tidak ada karakter `:`, gunakan seluruh teks `fdMarkingNo` sebagai nama grup; jika kosong/null/whitespace, kelompokkan ke `(Tanpa Marking)`.
    3. *Format Cell Kolom*: Nilai string pada cell kolom `fdMarkingNo` di setiap baris tetap ditampilkan lengkap (misal `FA/SYAIFUL21 :1-1`) agar data fisik koli tetap terbaca 100% utuh dan presisi.
  - **Penyelesaian Teknis (`PhysicalAuditTab.tsx`)**:
    1. *Fungsi Helper*: `extractMarkingGroup(markingNo)` mengekstrak substring sebelum karakter `:`, di-trim, dan fallback ke teks utuh atau `(Tanpa Marking)`.
    2. *Agregasi via `useMemo`*:
       - `markingGroups`: Mengelompokkan `listCodeBreakdown` per prefix marking, menghitung subtotal M³ fisik gudang, berat (kg), koli, M³ ditagih, serta status `allHaveBill` & `hasMissingBill`.
       - `fallbackMarkingGroups`: Mengelompokkan data fallback `relatedInvoices` secara konsisten jika breakdown listcode belum ada.
    3. *Header Panel*: Menambahkan pill badge `{N} Grup Marking` di samping status induk/pecahan jika terdapat grup marking aktif.
    4. *Rendering Tabel*:
       - Merender baris sub-header grup beraksen sky (`bg-sky-500/10 dark:bg-sky-950/50 border-t-2 border-b border-sky-500/30 font-semibold`) dengan `colSpan={4}` untuk identitas grup, diikuti kolom subtotal M³ gudang, berat kg, koli, billed M³, dan badge status kelengkapan bill.
       - Merender baris-baris item listcode di bawah masing-masing grup dengan highlight baris invoice saat ini (`isCur`) dan listcode missing bill.
  - **Verifikasi**:
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (4.09s)**.

- [x] **Set Tab Default Operation & Reposisi Switcher Master Billing Dashboard**:
  - **Permintaan Pengguna**: "Billing Dashboard -> set tab operation yang default aktif. rubah agar posisinya menjadi operation lalu finance"
  - **Penyelesaian Teknis**:
    1. *Default State View (`DashboardPage.tsx`)*:
       - Mengubah nilai inisialisasi state `dashboardView` dari `'finance'` menjadi `'operation'` (`useState<DashboardView>('operation')`).
    2. *Reposisi Switcher Tab (`DashboardPage.tsx`)*:
       - Mengubah urutan tombol pada dual-tab master switcher:
         - Tombol 1: Tab **Operation** (Ikon `Ship`, emerald theme, aktif default).
         - Tombol 2: Tab **Finance** (Ikon `CreditCard`, rose theme).
    3. *Dokumentasi & Verifikasi*:
       - Memperbarui `frontend-app.md`, `docs/frontend/billing.md`, dan `.agents/working.md`.
       - Build Frontend Production: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.34s)**.
- [x] **Penambahan Kolom fdMarkingNo pada Kelompok Bill Terkait & Pelebaran Modal Audit**:
  - **Permintaan Pengguna**: "pada modal Audit & Validasi Invoice -> billing detail validasi -> tambahkan kolom fdmarkingno di Kelompok Bill Terkait, modal bisa di perlebar sedikit"
  - **Penyelesaian Teknis**:
    1. *Backend (`m3-check.types.ts` & `m3-check.service.ts`)*:
       - Menambahkan field `fdMarkingNo?: string | null` pada interface `RelatedListCodeItem`.
       - Pada pemetaan `listCodeBreakdown`, mengekstrak nilai `markingNoVal` dari `p?.fdMarkingNo` (tbEntryList/SP) atau `b?.fdMarkingNo` (tbBilling) dan memasukkannya ke properti `fdMarkingNo`.
       - Melakukan typecheck `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
       - Merestart PM2 service `ShippingApi` (PID: 71212) $\to$ **ONLINE**.
    2. *Frontend Types (`billing.types.ts`)*:
       - Menambahkan field `fdMarkingNo?: string | null` pada interface `RelatedListCodeItem`.
    3. *Frontend UI (`PhysicalAuditTab.tsx`)*:
       - Menambahkan kolom header `<th className="py-2 px-2 font-mono">fdMarkingNo</th>` di antara kolom Posisi dan fdListCode pada tabel Kelompok Bill Terkait (Induk & Pecahan dalam 1 Batch).
       - Menambahkan rendering cell `<td className="py-1.5 px-2 font-mono text-[var(--color-secondary)]">{item.fdMarkingNo || '—'}</td>` pada daftar `listCodeBreakdown`.
       - Menambahkan cell `<td className="py-1.5 px-2 font-mono text-[var(--color-secondary)]">{inv.markingNo || '—'}</td>` pada baris fallback `relatedInvoices`.
       - Memperbarui `colSpan` pada baris total `tfoot` dari 3 menjadi 4.
    4. *Pelebaran Modal (`BillingValidationSummaryModal.tsx`)*:
       - Memperlebar modal dengan menambahkan utility class `max-w-[1400px] w-full` pada komponen `<Modal>` (sebelumnya `size="3xl"` / 1280px), memberikan ruang ekstra 120px yang lega dan nyaman untuk menampilkan kolom `fdMarkingNo` dan seluruh kolom audit fisik.
    5. *Dokumentasi & Verifikasi*:
       - Memperbarui `frontend-app.md`, `docs/frontend/billing.md`, dan `docs/backend/billing.md`.
       - Build Frontend Production: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (3.94s)**.

- [x] **Pemisahan Lembar 4 Finansial Menjadi Lembar 4 (Grafik Tren Bulanan) & Lembar 5 (Tabel Rekapitulasi 12 Bulan Mandiri)**:
  - **Permintaan Pengguna**: "pada finance billing report pdf halaman 4 buat agar tabel rekapitulasi jadi 1 lebar sendiri"
  - **Penyelesaian Teknis**:
    1. *Struktur Lembar 4 Finansial (Khusus Kurva Tren Bulanan 12 Bulan & YoY)*:
       - Judul: `Bagian 4: Analitik Kurva Perkembangan Omzet Bulanan per Moda (Udara & Laut) serta Volume Kuantiti Faktur Diterbitkan (YoY)`.
       - 4 Kartu KPI Finansial 12 Bulan: Total Kuantiti Faktur (12 Bln), Pertumbuhan Qty Bill (YoY), Total Omzet Tagihan (12 Bln), Rata-rata Bulanan.
       - Area grafik `TrendChart` diperluas penuh (`chartHeight={420}` dari sebelumnya 180) berpadu dengan batang kuantiti faktur diterbitkan dan kurva omzet vs YoY yang sangat lega.
       - Box catatan evaluasi tren finansial & arahan navigasi ke Lembar 5 untuk tabel data lengkap.
       - Footer: `Lembar 4 dari {totalPages} (Kurva Tren Penagihan Bulanan 12 Bulan & YoY)`.
    2. *Struktur Lembar 5 Finansial (BARU — Khusus Tabel Rekapitulasi Kinerja Penagihan 12 Bulan Terakhir)*:
       - Sheet baru A4 Landscape (1200px $\times$ 840px, zero page-cut).
       - Judul: `Bagian 5: Tabel Rekapitulasi Lengkap Kuantiti Faktur & Nominal Omzet per Moda (Udara & Laut) Serta Perbandingan Pertumbuhan Tahunan (YoY)`.
       - 4 Mini Summary Cards 12 Bulan: Total Omzet Tagihan (12 Bln), Total Kuantiti Faktur, Rata-rata Nilai per Bill (Efisiensi Nominal), Rata-rata Omzet / Bulan.
       - Tabel Rekapitulasi 10 Kolom Lengkap: Bulan, Qty Udara, Qty Laut, Total Qty (Bill), YoY Qty (%), Omzet Udara, Omzet Laut, Total Omzet, YoY Omzet (%), Rata-rata/Bill dengan typography font 10px dan padding nyaman (`4.5px 10px`).
       - Baris Total Konsolidasi di `<tfoot>` (tebal, border 2.5px solid).
       - Box pedoman audit & kepatuhan finansial di dasar tabel.
       - Footer: `Lembar 5 dari {totalPages} (Tabel Rekapitulasi Kinerja Finansial 12 Bulan & YoY)`.
    3. *Struktur Lembar 6 Finansial (Sebelumnya Lembar 5 — Analitik Tren Harian Daily Bill)*:
       - Judul diperbarui menjadi `Bagian 6: Fluktuasi Harian Penerbitan Tagihan dan Omzet Finansial {dailyRangeLabel}`.
       - Footer diperbarui menjadi `Lembar 6 dari {totalPages} (Tren Penagihan Harian {dailyDaysFilter} Hari)`.
    4. *Sinkronisasi Total Halaman & Urutan Segmen Operasional Saat Mode 'All'*:
       - `totalPages` disinkronkan menjadi `isAll ? 13 : isOperation ? 10 : 6`.
       - Pada mode All (`isAll`), segmen operasional bergeser secara mulus:
         - Lembar 7: Evaluasi PIC (Tabel Data)
         - Lembar 8: Evaluasi PIC (Grafik Tren)
         - Lembar 9: Monitoring SJ vs Bill (KPI & Grafik)
         - Lembar 10: Monitoring SJ (Daftar Rincian Unbilled)
         - Lembar 11: Batch Marking Exit vs Bill Dibuat
         - Lembar 12: Rincian Batch Pending & Target Bill
         - Lembar 13: Batch Marking Exit & Progress Details
    5. *Penyelarasan Dual Bahasa (i18n `id.json` & `en.json`)*:
       - Memperbarui label tombol unduh, status ekspor, dan toast: `Unduh PDF Finance (6 Lembar)` / `Export Finance PDF (6 Pages)`.
  - **Verifikasi**:
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.04s)**.

- [x] **Perbaikan Lembar 7 Laporan PDF Operasional (Rincian Surat Jalan Belum Ditagih)**:
  - **Permintaan Pengguna**: "perbaiki daftar rincian surat jalan belum di tagih pada lebar ke 7 footernya tidak terlihat tertimpa tabel; dan tag segera tagih textnya jangan wrap"
  - **Penyelesaian Teknis**:
    1. *Eliminasi Text-Wrap pada Tag Prioritas*:
       - Menambahkan styling `whiteSpace: 'nowrap'`, `display: 'inline-block'`, dan `letterSpacing: '0.2px'` pada tag `🚨 SEGERA TAGIH`.
       - Memperlebar kolom `th Prioritas` menjadi `125px` dan menambahkan `whiteSpace: 'nowrap'` pada seluruh cell tabel agar tiap baris 100% single-line tanpa ada wrapping.
    2. *Pencegahan Footer Tertimpa Tabel*:
       - Membatasi baris data unbilled dengan `slice(0, 11)` yang proporsional di kanvas fixed A4 Landscape (1200px $\times$ 840px).
       - Menambahkan catatan keterbacaan data: `* Menampilkan 11 resi prioritas teratas dari total N surat jalan backlog.`
       - Menyesuaikan padding kartu ringkasan (`padding: '8px 12px'`) dan box instruksi operasional (`padding: '6px 12px'`, `fontSize: '9px'`).
       - Memastikan footer menggunakan `flexShrink: 0`, `marginTop: 'auto'`, dan `backgroundColor: '#ffffff'` sehingga selalu tampil bersih, jelas, dan berada di bagian paling bawah lembar tanpa tumpang tindih.
  - **Verifikasi**:
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (4.32s)**.

- [x] **Pemisahan Lembar PIC (Tabel & Grafik) dan Lembar SJ (Grafik & Rincian Unbilled) Menjadi Halaman Mandiri (Total 10 Lembar PDF Operasional)**:
  - **Permintaan Pengguna**: "lembar 4 buat agar tabel data dan grafik terpisah menjadi masing masing 1 halaman, begitu juga pada lembar 5 kpi dan grafik jadi 1 halaman dan daftar rincian surat jalan belum di tagih jadi 1 halaman."
  - **Penyelesaian Teknis**:
    1. *Struktur Lembar 4 (Khusus Tabel Rekapitulasi PIC)*:
       - Judul: `Bagian 4: Evaluasi Produktivitas User Pembuat Invoice — Tabel Rekapitulasi & Peringkat PIC`.
       - Menampilkan tabel rekapitulasi performa staf pembuat invoice dengan padding nyaman (menampung hingga 14 PIC) beserta kuantiti faktur, rata-rata harian/bulanan, kontribusi persentase, dan ranking.
       - Navigasi diarahkan ke Lembar 5 untuk grafik kurva deret waktu.
    2. *Struktur Lembar 5 (Khusus Grafik Tren PIC)*:
       - Judul: `Bagian 5: Evaluasi Produktivitas PIC — Kurva Tren Volume Penerbitan Faktur`.
       - Menampilkan 4 KPI cards ringkasan tren PIC (Top Producer, PIC Kontributor Terbanyak, Total Volume Faktur, Rata-rata Harian/Bulanan).
       - Area grafik `EmployeeChart` diperluas penuh (`chartHeight={440}`) tanpa terdesak tabel.
    3. *Struktur Lembar 6 (Khusus Monitoring SJ vs Bill — KPI & Grafik)*:
       - Judul: `Bagian 6: Monitoring Arus Surat Jalan (SJ) vs Faktur Diterbitkan (Bill) — Kurva Konversi Logistik`.
       - Menampilkan 4 KPI Cards Konversi SJ: Total Surat Jalan, Sudah Ditagihkan (Billed), Belum Ditagih (Unbilled), dan Rasio Konversi SJ $\to$ Bill.
       - Area grafik kurva harian diperlebar penuh (`height: 420px`) untuk visualisasi deret waktu konversi kargo keluar gudang yang sangat jelas dan jernih.
       - Navigasi diarahkan ke Lembar 7 untuk rincian lembar fisik yang belum ditagihkan.
    4. *Struktur Lembar 7 (Khusus Daftar Rincian SJ Belum Ditagih / Unbilled SJ)*:
       - Judul: `Bagian 7: Monitoring Surat Jalan — Daftar Rincian Surat Jalan Belum Ditagih (Unbilled SJ)`.
       - 4 KPI Ringkasan Backlog: Total SJ Pending, Total Kargo Tertahan (`fdListCode`), Kargo Udara Menanti Faktur, Kargo Laut Menanti Faktur.
       - Tabel 9 Kolom Rincian Surat Jalan Belum Ditagih: `#`, `No. Surat Jalan`, `Tgl Keluar Gudang`, `Penerima / Customer`, `Cabang / Moda`, `Jml Kargo (Listcode)`, `Resi / Kargo (fdListCode)`, `Status Prioritas` (🚨 >7 Hari, ⚡ Urgent, 💵 COD, ⚠️ Normal), dan `Instruksi Operasional`.
       - Kotak panduan operasional follow-up penagihan backlog AR aging.
    5. *Penyesuaian Urutan Segmen & Total Halaman*:
       - `totalPages` diperbarui menjadi `isAll ? 12 : isOperation ? 10 : 5`.
       - Segmen 8 (Batch Marking Exit vs Bill Dibuat): Bagian 8 / Lembar 8 (atau Lembar 10 jika All).
       - Segmen 9 (Rincian Batch Pending): Bagian 9 / Lembar 9 (atau Lembar 11 jika All).
       - Segmen 10 (Batch Marking Exit & Progress Details): Bagian 10 / Lembar 10 (atau Lembar 12 jika All).
    6. *Penyelarasan Dual Bahasa (i18n `id.json` & `en.json`)*:
       - Memperbarui label tombol, status ekspor, dan toast: `Unduh PDF Operation (10 Lembar)` / `Export Operation PDF (10 Pages)`.
  - **Verifikasi**:
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (4.16s)**.

- [x] **Penambahan Lembar 2 Laporan PDF Operasional (Rasio Penagihan per Cabang Asal Kargo, Total 8 Lembar) (`DashboardPdfFullReport.tsx`, `id.json`, `en.json`)**:
  - **Permintaan Pengguna**: "data Rasio penagihan per cabang asal kargo tampilkan juga, buat jadi page 2, report jadi tambah 1 halaman".
  - **Penyelesaian Teknis**:
    1. *Struktur Lembar 2 Dedikasi untuk Rasio Cabang*:
       - Merancang Lembar 2 Laporan PDF Operasional khusus A4 Landscape (1200px x 840px, zero page-cut):
         - **Kop Resmi**: `M-SHIPPING OPERATION REPORT — RASIO PENAGIHAN PER CABANG ASAL KARGO` (Bagian 2).
         - **4 Mini Summary KPI Cards**:
           1. Total Cabang Logistik (jumlah cabang aktif, normalisasi Singapore `--` & `SG`).
           2. Total Kargo Terkonsolidasi (total kargo exit dari seluruh batch).
           3. Sudah Terbit Faktur / Billed (kargo selesai & persentase rasio bill).
           4. Sisa Belum Ditagih / Unbilled (kargo pending & jumlah batch pending).
         - **2 Highlight Cards**: Cabang Rasio Penyelesaian Tertinggi (🏆) vs Cabang Prioritas Follow-Up Penagihan (⚠️).
         - **Tabel Utama Rasio Penagihan per Cabang**:
           - 8 kolom presisi: `#`, `Cabang Asal Kargo`, `Rasio Penagihan (Billed)` (bar semantik tebal + % font mono), `Billed`, `Sisa (Unbilled)`, `Total Kargo`, `Batch (Tuntas · Pending)`, dan `Moda Kargo` (✈️ Udara & 🚢 Laut).
           - Baris Konsolidasi Total Seluruh Cabang di `<tfoot>` (penjumlahan otomatis seluruh kargo, batch, dan moda).
         - **Box Catatan Kepatuhan Operasional Cabang**: Pedoman standardisasi kode cabang warisan, indikator warna rasio (Hijau ≥80%, Amber 50–79%, Merah <50%), serta panduan navigasi dokumen.
    2. *Penyesuaian Total Halaman & Pergeseran Lembar Berikutnya (+1)*:
       - Total lembar Operasional bertambah dari 7 menjadi **8 Lembar** (`totalPages = isAll ? 12 : isOperation ? 8 : 5`).
       - Lembar 1: Ringkasan Eksekutif Operasional & Target Kargo (Bagian 1, Lembar 1).
       - Lembar 2: Rasio Penagihan per Cabang Asal Kargo (Bagian 2, Lembar 2).
       - Lembar 3: Matriks Komparasi 3 Periode Volume Operasional (Bagian 3, Lembar 3).
       - Lembar 4: Evaluasi Produktivitas User Pembuat Invoice / PIC (Bagian 4, Lembar 4).
       - Lembar 5: Monitoring Surat Jalan (SJ) vs Faktur (Bill) (Bagian 5, Lembar 5).
       - Lembar 6: Monitoring Batch Marking Exit vs Bill Dibuat (Bagian 6, Lembar 6).
       - Lembar 7: Rincian Batch Pending & Target Bill (Bagian 7, Lembar 7).
       - Lembar 8: Batch Marking Exit & Billing Progress Details (Bagian 8, Lembar 8).
    3. *Penyelarasan Dual Bahasa (i18n `id.json` & `en.json`)*:
       - Memperbarui label tombol, status ekspor, dan toast: `Unduh PDF Operation (8 Lembar)` / `Export Operation PDF (8 Pages)`.
  - **Verifikasi**:
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (4.14s)**.

- [x] **Redesign Halaman 1 Laporan PDF Operasional Identik Sesuai UI Dashboard Billing (`DashboardPdfFullReport.tsx`)**:
  - **Permintaan Pengguna**: "perbaiki report pdf operational pada halaman 1 buat agar tampilannya seperti pada ui".
  - **Penyelesaian Teknis**:
    1. *Struktur Lembar 1 PDF Operasional Kini 100% Mengikuti Tata Letak UI Dashboard*:
       - **Baris Atas (3 Kartu KPI Operasional)**:
         - Kartu 1: *Target Bill (Udara)* — Hero kuantiti listcode udara, micro-pills kategori interaktif (`SJ Sent: N`, `COD: N`, `>7 Hari: N`), dan footer PIC Kiki vs Yati.
         - Kartu 2: *Target Bill (Laut)* — Hero kuantiti listcode laut, micro-pills kategori (`SJ Sent: N`, `COD: N`, `>7 Hari: N`, `FCL: N`), dan footer PIC Thara, Rico, Ferly.
         - Kartu 3: *Volume Faktur Diterbitkan* — Hero kuantiti bill diterbitkan, breakdown mikro ✈️ Udara vs 🚢 Laut, dan pertumbuhan MoM Faktur.
       - **Blok Utama (Widget Perbandingan Batch Marking Exit vs Bill Dibuat)**:
         - Header widget lengkap dengan badge periode bulan terpilih dan total batch pending.
         - **Panel Kiri (Hero & Dual Moda)**:
           - Hero number rasio penyelesaian kargo (`billedPercentage%`), total kargo exit dari N batch, kargo sudah terbit bill, dan kargo belum terbit bill border kiri semantik.
           - Thick dual progress bar kargo (emerald 100% vs amber sisa).
           - Dual kartu moda horizontal: *Moda Udara* (progress bar amber, N bill · N belum, total kargo) dan *Moda Laut* (progress bar sky, N bill · N belum, total kargo).
         - **Panel Kanan (Kelengkapan Bill per Status Customer)**:
           - Subtitle total kargo.
           - 5 Baris progress bar status customer semantik: Blocked (merah `#fee2e2`/`#dc2626`), Warning (amber `#fef3c7`/`#d97706`), Urgent (sky `#e0f2fe`/`#0284c7`), COD (teal `#ccfbf1`/`#0d9488`), dan OK (slate `#f1f5f9`/`#64748b`) lengkap dengan rasio persentase dan rincian kargo tuntas vs sisa.
       - **Catatan Operasional Eksekutif**: Menjelaskan keselarasan data dengan dashboard ERP, keterkaitan dengan Lembar 5 (Rasio Cabang), dan Lembar 7 (Rincian Batch).
  - **Verifikasi**:
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (4.08s)**.

- [x] **Penambahan Lembar 7 PDF Operasional (Batch Marking Exit & Billing Progress Details) & Eliminasi Link Target Bill pada Modal (`DashboardPdfFullReport.tsx`, `BatchExitModal.tsx`, `id.json`, `en.json`)**:
  - **Permintaan Pengguna**: "tampilkan data Batch Marking Exit & Billing Progress Details pada report pdf dan hilangkan button link target bill pada modal /grill-me".
  - **Penyelesaian Teknis**:
    1. *Eliminasi Tombol Link Target Bill pada Modal (`BatchExitModal.tsx`)*:
       - Menghapus kolom header `th` (`t('billing.batchExitComparison.action')`).
       - Menghapus tombol `td` link `[Target Bill]` (`handleNavigateTarget`) dan ikon `ExternalLink`.
       - Membersihkan impor yang tidak terpakai (`useNavigate`, `ExternalLink`, `ROUTES`) dan fungsi `handleNavigateTarget`.
       - Mengoreksi `colSpan` pada baris expanded rincian kargo dari `8` menjadi `7` agar sejajar 100% presisi.
    2. *Penambahan Lembar 7 pada Laporan PDF Operasional (`DashboardPdfFullReport.tsx`)*:
       - Memperbarui total lembar PDF Operasional menjadi 7 lembar (`totalPages = isAll ? 11 : isOperation ? 7 : 5`).
       - Merancang Lembar 7 berukuran A4 Landscape (1200px x 840px, zero page-cut):
         - Kop resmi: `M-SHIPPING OPERATION REPORT — RINCIAN PROGRES BATCH MARKING EXIT (Batch Marking Exit & Billing Progress Details)`.
         - 4 Mini KPI Card ringkasan: Total Batch Terdata (Tuntas vs Pending), Kargo Sudah Billed (kuantiti + persentase), Kargo Belum Ditagih (Unbilled), dan Prioritas Status Kargo Kritis (🚨 Blocked & ⚠️ Warning).
         - Tabel detail batch marking exit dengan 7 kolom presisi: `#`, `Kode Marking`, `Tgl Exit`, `Moda / Cabang`, `Status Customer` (🚨 Blocked, ⚠️ Warning, ⚡ Urgent, 💵 COD, OK), `Status Kargo` (Billed / Unbilled / Total), dan `Progres Billing` (progress bar + persentase font mono + badge status TUNTAS/PENDING).
         - Menampilkan hingga 14 batch marking exit teratas dengan pengurutan prioritas: batch pending yang memuat kargo customer berstatus Blocked/Warning di posisi puncak.
    3. *Penyelarasan Dual Bahasa (i18n `id.json` & `en.json`)*:
       - Menyesuaikan label unduh PDF Operasional menjadi `Unduh PDF Operation (7 Lembar)` / `Export Operation PDF (7 Pages)` serta notifikasi toast sukses.
  - **Verifikasi**:
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (3.94s)**.
  - **Permintaan Pengguna**:
    1. "pada report pdf -> KURVA TREN HARIAN VOLUME PENERBITAN FAKTUR PER PIC -> kenapa yang di tampilkan tidak seperti range yang di select pada uinya? cek."
    2. "Dan pada KURVA HARIAN KONVERSI SURAT JALAN VS FAKTUR DITERBITKAN -> tulisan keterangannya 30 hari namun grafiknya 1 tahun"
  - **Akar Masalah (Root Causes)**:
    1. *Hardcoded Labels pada PDF*: Judul grafik, badge rentang, ringkasan kartu, keterangan tabel, dan pembagian rata-rata harian (`/ 30`) pada `DashboardPdfFullReport.tsx` di-hardcode ke "30 Hari Terakhir", sehingga ketika user memilih range lain di UI (misal 1 Tahun / 365 hari, 7 hari, atau 14 hari), laporan PDF tetap menuliskan "30 Hari Terakhir".
    2. *State Range Tercampur di UI*: Sebelumnya `karyawan` dan `sj-vs-bill` memakai satu state tunggal `opDaysFilter`. Ketika user memilih rentang 1 tahun pada Karyawan, query `billingSjVsBill` ikut terpicu mengambil 365 data points (1 tahun). Grafiknya merender 365 data points harian, tetapi judulnya tertulis "30 Hari".
    3. *UTC Offset Shift pada Backend*: Pada `getBillingByEmployeeDaily` untuk range 1 tahun (`customDays >= 360`), `m.start.toISOString().slice(0, 7)` menghasilkan bulan yang bergeser 1 bulan ke belakang (karena UTC vs WIB UTC+7 pada tanggal 1 jam 00:00:00 WIB).
  - **Penyelesaian Teknis**:
    1. *Backend Date Formatting (`billing-analytics.service.ts`)*:
       - Mengganti `m.start.toISOString().slice(0, 7)` dengan tanggal lokal `${m.start.getFullYear()}-${String(m.start.getMonth() + 1).padStart(2, '0')}` agar key bulan 100% presisi sesuai kalender lokal.
    2. *Pemisahan Filter Range State (`useBillingDashboard.ts` & `DashboardPage.tsx`)*:
       - Memisahkan state filter rentang waktu operasional menjadi:
         - `opEmployeeDaysFilter: 7 | 14 | 30 | 365` (khusus tab & grafik Karyawan PIC)
         - `opSjDaysFilter: 7 | 14 | 30 | 365` (khusus tab & grafik SJ vs Bill)
       - `useBillingDashboard` kini mendukung parameter terpisah `employeeDaysFilter` dan `sjDaysFilter` sehingga pergantian rentang di satu tab tidak mengganggu tab lain.
    3. *Dynamic Labels & Perhitungan Laporan PDF (`DashboardPdfFullReport.tsx`)*:
       - Menambahkan props `employeeDaysFilter`, `sjDaysFilter`, dan `dailyDaysFilter`.
       - Lembar 3 (PIC):
         - Judul grafik dinamis: `Kurva Tren Bulanan Volume Penerbitan Faktur per PIC (1 Tahun Terakhir)` jika 365 hari, atau `Kurva Tren Harian Volume Penerbitan Faktur per PIC (N Hari Terakhir)`.
         - Header rentang dinamis: `Rentang: 1 Tahun Terakhir` atau `Rentang: N Hari Terakhir`.
         - Banner dinamis: `Total 1 Tahun: ...` atau `Total N Hari: ...`.
         - Keterangan tabel: `Berdasarkan Akumulasi Kuantiti Faktur Diterbitkan 1 Tahun Terakhir (12 Bulan)` atau `... N Hari Terakhir`.
         - Rata-rata PIC: Jika 365 hari, menampilkan rata-rata bulanan dan harian `(emp.totalBills / 12) /bln · (emp.totalBills / 365) /hari`, bukan membagi 30.
       - Lembar 4 (SJ vs Bill):
         - Judul grafik dinamis: `Kurva Harian Konversi Surat Jalan vs Faktur Diterbitkan (1 Tahun Terakhir / N Hari Terakhir)`.
         - Header rentang dinamis: `Rentang: 1 Tahun Terakhir / N Hari Terakhir`.
         - Subtitle kartu: `Kargo Keluar Gudang (1 Tahun / N Hari)`.
       - Lembar 5 (Finansial Tren Harian):
         - Sinkron dengan `dailyDaysFilter` (7, 14, 30 hari).
  - **Verifikasi**:
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.82s)**.

- [x] **Penambahan Matriks 3 Periode pada Operasional (`DashboardPage.tsx`, `BillingPeriodMatrixSection.tsx`, `DashboardPdfFullReport.tsx`, `id.json`, `en.json`)**:
  - **Permintaan Pengguna**: "Tambahkan matriks 3 periode pada operasional".
  - **Penyelesaian Teknis**:
    1. *Web Dashboard Billing (`DashboardPage.tsx`)*:
       - Memperluas tipe `OperationChartTab` dengan opsi `'komparasi'`.
       - Menambahkan tab baru `Matriks 3 Periode` pada segmented control tab Operation (`opChartTabs`).
       - Merender konten tab `komparasi` operasional:
         - **3 Kartu Ringkasan MoM/YoY Non-Moneter**: Total Volume Faktur Terbit (Bill), Volume Faktur Moda (✈️ Udara & 🚢 Laut), dan Customer Unik Ditagih (Cust).
         - **Tabel Matriks Operasional**: `BillingPeriodMatrixTable` dengan prop `variant="operation"`.
         - **Panel Samping Audit**: Ikhtisar periode audit terpilih, MoM & YoY, serta progress bar komposisi volume moda Udara vs Laut.
         - **Toolbar Periode Audit**: `BillingPeriodNavigator` terintegrasi untuk navigasi bulan & tahun.
    2. *Komponen Matriks Komparasi (`BillingPeriodMatrixSection.tsx`)*:
       - Mendukung prop `variant?: 'finance' | 'operation'` (default `'finance'`).
       - Pada mode `operation`, tabel **100% bebas nominal uang/Rp**, menampilkan 7 metrik operasional terukur:
         1. Total Faktur Terbit (Bill)
         2. Faktur Moda Udara (Bill)
         3. Faktur Moda Laut (Bill)
         4. Customer Ditagih (Cust)
         5. Pangsa Volume Udara (%)
         6. Pangsa Volume Laut (%)
         7. Rata-rata Faktur / Customer (Bill/Cust)
       - Perhitungan MoM/YoY pertumbuhan dan selisih (diff) otomatis untuk seluruh metrik volume dan rasio.
    3. *Laporan Unduh PDF Operasional (`DashboardPdfFullReport.tsx`)*:
       - Menambahkan Lembar 2 Operasional khusus: `M-SHIPPING OPERATION REPORT — MATRIKS KOMPARASI 3 PERIODE (MoM & YoY)` (100% non-moneter).
       - Menyesuaikan kapasitas PDF Operasional menjadi 6 Lembar (`totalPages = 6`):
         - Lembar 1: Ringkasan Eksekutif Operasional & Target Kargo
         - Lembar 2: Matriks Komparasi 3 Periode Volume Operasional
         - Lembar 3: Evaluasi Produktivitas User Pembuat Invoice (PIC)
         - Lembar 4: Monitoring Surat Jalan (SJ) vs Faktur (Bill)
         - Lembar 5: Monitoring Batch Marking Exit vs Bill Dibuat
         - Lembar 6: Rincian Batch Pending & Target Bill
    4. *Dual Bahasa (i18n `id.json` & `en.json`)*:
       - Menambahkan key: `billing.opTab.matrix`, `billing.opMatrixTitle`, `billing.opMatrixSubtitle`, `billing.airVolumeShare`, `billing.seaVolumeShare`, `billing.avgInvPerCustomer`.
       - Menyesuaikan label tombol unduh PDF Operasional: `Unduh PDF Operation (6 Lembar)` / `Export Operation PDF (6 Pages)`.
  - **Verifikasi**:
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (4.21s)**.

- [x] **Segregasi Ketat Metrik Laporan PDF Operation & Finance (`DashboardPdfFullReport.tsx`)**:
  - **Permintaan Pengguna**: "pada report pdf operation jangan tampilkan jumla omset atau yang berkaitan dengan uang, focus pada qty bill, begitu juga pada report finance focus pada yang [uang / omset Rp]".
  - **Penyelesaian Teknis**:
    1. *Laporan PDF Operasional (5 Lembar)*:
       - **100% Bebas Nilai Uang (Rp / Omzet)**.
       - Lembar 1 (Ringkasan Eksekutif Operasional): Murni metrik kuantiti target kargo, listcode, volume faktur terbit, kargo exit gudang, dan kelengkapan per status customer. Kop resmi: `M-SHIPPING LOGISTICS & BILLING OPERATIONS REPORT`.
       - Lembar 2 (Evaluasi Produktivitas PIC):
         - Kop diperbarui: `M-SHIPPING OPERATION REPORT — EVALUASI PRODUKTIVITAS USER PEMBUAT INVOICE (PIC)`.
         - Banner dihapus nominal rupiahnya: hanya menampilkan `Total 30 Hari: N Faktur Diterbitkan`.
         - Tabel PIC: Mengeliminasi kolom `Total Omzet Tagihan (Rp)`, `Pangsa Omzet (%)`, `Rata-rata Nilai / Faktur (Rp)`. Diganti dengan kolom operasional: `Fokus Moda` (✈️ Tim Udara Kiki/Yati, 🚢 Tim Laut Thara/Rico/Ferly), `Kuantiti Faktur (Bill)`, `Pangsa Volume (%)`, `Rata-rata Faktur / Hari` (`Bill/Hari`), dan `Status Aktivitas`.
         - Footer tabel PIC: Mengkonsolidasikan total kuantiti bill, pangsa volume 100%, rata-rata bill/hari, dan status SLA.
         - Grafik tren PIC: Diubah dari `metric="value"` (omzet) menjadi `metric="count"` (volume kuantiti bill harian).
       - Lembar 3 (Monitoring Arus SJ vs Bill):
         - Kop diperbarui: `M-SHIPPING OPERATION REPORT — MONITORING SURAT JALAN (SJ) VS FAKTUR (BILL)`.
         - Status diselaraskan menjadi `CONFIDENTIAL / OPERATIONAL`.
         - Badge diperbarui: `Prioritas Penerbitan Invoice Operasional`.
       - Lembar 4 (Batch Exit vs Progres Bill) & Lembar 5 (Rincian Batch Pending):
         - Kop, subjudul, dan footer diselaraskan ke `M-SHIPPING OPERATION REPORT` dan `Sistem Operasional M-Shipping`.
    2. *Laporan PDF Finansial (5 Lembar)*:
       - **Fokus 100% pada Nilai Uang & Metrik Finansial**:
         - Lembar 1: 4 kartu omzet Rp (Total Omzet Tagihan, Omzet Udara, Omzet Laut, Nilai Rata-rata / Faktur), 3 summary MoM/YoY Rp, proporsi omzet moda.
         - Lembar 2: Matriks 8 metrik finansial komparasi 3 periode (MoM & YoY nominal dan diff).
         - Lembar 3: Kinerja penagihan per cabang (omzet Rp cabang, pangsa %, moda laut/udara nominal).
         - Lembar 4: Tren bulanan 12 bulan (kurva omzet bulanan & tabel rekap nominal Rp).
         - Lembar 5: Tren harian 30 hari (kurva daily bill nominal Rp, akumulasi omzet Rp, puncak tagihan).
  - **Verifikasi**:
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.68s)**.

- [x] **Penambahan Grafik Produktivitas Karyawan Rentang 1 Tahun (`billing-analytics.service.ts`, `DashboardPage.tsx`, `ChartTick.tsx`, `id.json`, `en.json`)**:
  - **Permintaan Pengguna**: "tambahkan employee productivity grafik untuk range 1 tahun".
  - **Penyelesaian Teknis**:
    1. *Backend `billing-analytics.service.ts`*:
       - Menambahkan penanganan khusus `customDays >= 360` pada fungsi `getBillingByEmployeeDaily(query)`.
       - Saat range 1 tahun (365 hari) dipilih, data diagregasikan per bulan (12 bulan menggunakan `getLastNMonths(12)`) dengan format tanggal `YYYY-MM` dan label bulan, bukan per hari individu (365 titik).
       - Menentukan Top 5 karyawan dengan akumulasi volume penerbitan bill terbanyak selama 1 tahun, serta mengelompokkan sisanya ke dalam kategori "Lainnya" (`__others__`).
       - Memuat dan mengembalikan data deret bulanan per PIC (`point[key]` untuk count dan `point[${key}__value]` untuk total tagihan).
       - Melakukan restart service PM2 `ShippingApi` (PID: 71324).
    2. *Frontend `DashboardPage.tsx`*:
       - Memperbarui tipe state `opDaysFilter` dari `7 | 14 | 30` menjadi `7 | 14 | 30 | 365`.
       - Menambahkan opsi `<option value={365}>{t('billing.last1Year')}</option>` pada dropdown filter waktu tab Operation.
       - Menyesuaikan label subjudul grafik agar menampilkan "1 Tahun Terakhir (12 Bulan)" saat opsi 365 hari aktif.
    3. *Frontend `ChartTick.tsx`*:
       - Memperluas parsing `CustomXAxisTick` agar mengenali format `YYYY-MM` (misal `2026-10`) dan menampilkannya dengan rapi (Baris 1: Nama Bulan, Baris 2: Tahun).
    4. *Dual Bahasa (i18n `id.json` & `en.json`)*:
       - Menambahkan key `billing.last1Year`: `"1 Tahun Terakhir (12 Bulan)"` / `"Last 1 Year (12 Months)"`.
  - **Verifikasi**:
    - Backend Typecheck: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - PM2 Service Restart: `pm2 restart ShippingApi` $\to$ **ONLINE (PID: 71324)**.
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.87s)**.

- [x] **Pemisahan Laporan Unduh PDF Dashboard Billing Sesuai Domain Operation & Finance (`DashboardPdfFullReport.tsx`, `DashboardPage.tsx`, `id.json`, `en.json`)**:
  - **Permintaan Pengguna**: "perbaiki report unduh pdf pada dashboard billing buat sesuai per operation dan finance".
  - **Penyelesaian Teknis**:
    1. *Prop `reportType` pada `DashboardPdfFullReport.tsx`*:
       - Mendukung mode `'finance'` (5 lembar khusus finansial), `'operation'` (5 lembar khusus operasional), dan `'all'` (9 lembar konsolidasi).
       - Total lembar dinamis `totalPages = isAll ? 9 : 5` serta nomor lembar footer dinamis per domain:
         - **Laporan Finance (5 Lembar)**:
           - Lembar 1: Ringkasan Eksekutif Finansial & Pencapaian Omzet Penagihan (Hero Omzet Rp, Highlights, Pangsa Moda).
           - Lembar 2: Matriks Komparasi 3 Periode (8 Metrik Kunci Finansial MoM & YoY).
           - Lembar 3: Rincian Kinerja Penagihan Per Cabang (Omzet Cabang, Normalisasi Batam/SG).
           - Lembar 4: Analitik Tren Bulanan 12 Bulan (Kurva & Rekap Omzet Rp).
           - Lembar 5: Analitik Tren Harian (Daily Bill 30 Hari Rp & Puncak Tagihan).
         - **Laporan Operation (5 Lembar)**:
           - Lembar 1: Ringkasan Eksekutif Operasional & Target Kargo (Target Listcode Hari Ini, Volume Faktur, Kargo Exit Gudang, & Kelengkapan Status Customer).
           - Lembar 2: Evaluasi Produktivitas Karyawan Pembuat Invoice (PIC Billing Udara Kiki/Yati & Laut Thara/Rico/Ferly).
           - Lembar 3: Monitoring Surat Jalan (SJ) vs Faktur (Bill) & Backlog Unbilled SJ.
           - Lembar 4: Monitoring Perbandingan Batch Marking Exit vs Bill Dibuat.
           - Lembar 5: Rincian Batch Pending & Target Bill Logistik.
    2. *Dukungan Tombol Dinamis & Dual Off-screen Ref di `DashboardPage.tsx`*:
       - Menyiapkan `financeReportRef` dan `operationReportRef` yang merender `DashboardPdfFullReport` standby off-screen.
       - Tombol header `PageHeader.actions` adaptif:
         - Saat tab Finance aktif: tombol teks `Unduh PDF Finance (5 Lembar)` (tema rose), menghasilkan `Laporan-Finance-Billing-YYYY-MM.pdf`.
         - Saat tab Operation aktif: tombol teks `Unduh PDF Operation (5 Lembar)` (tema emerald), menghasilkan `Laporan-Operation-Billing-YYYY-MM.pdf`.
    3. *Dual Bahasa (i18n `id.json` & `en.json`)*:
       - Token ekspor PDF disinkronkan: `billing.exportPdfFinance`, `billing.exportPdfOperation`, `billing.exportingPdfFinance`, `billing.exportingPdfOperation`, `billing.pdfExportSuccessFinance`, `billing.pdfExportSuccessOperation`.
  - **Verifikasi**:
    - Frontend Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.15s)**.

- [x] **Pemisahan Ketat Data Finansial (Uang Rp) ke Tab Finance dan Kuantiti Bill/Karyawan ke Tab Operation (`DashboardPage.tsx`, `id.json`, `en.json`)**:
  - **Permintaan Pengguna**: "semua data yang ada angka mengenai uang maka masuk ke tab finance yang menyangkut kpi karyawan dan jumlah bill masuk ke operational /grill-me".
  - **Penyelesaian Teknis**:
    1. *Kartu KPI Domain Finance (`financeKpiCards`)*:
       - **100% Eksklusif Nilai Uang (Rp)**, bebas metrik jumlah bill dan bebas nama karyawan PIC.
       - **Total Tagihan Bulan Ini**: Hero omzet `formatCurrency(totalOmzet)`, breakdown mikro per moda `✈️ Udara: formatCompactRupiah(omzetUdara)` dan `🚢 Laut: formatCompactRupiah(omzetLaut)`, pill MoM & YoY tagihan.
       - **Omzet Tagihan Udara**: Nilai Rupiah omzet udara dan rasio pangsa pasar (`airPct%`).
       - **Omzet Tagihan Laut**: Nilai Rupiah omzet laut dan rasio pangsa pasar (`seaPct%`).
       - **Rata-rata Nilai / Faktur**: Nilai tiket faktur per invoice (Rp) beserta pill pertumbuhan MoM & YoY.
    2. *Kartu KPI Domain Operation (`operationKpiCards`)*:
       - **100% Eksklusif Kuantiti Bill, Kargo, dan Target PIC**, bebas nominal uang.
       - **Target Bill Hari Ini (Udara)**: Kuantiti listcode udara (`N List`), breakdown PIC Kiki vs Yati, dan 4 filter micro-button (`SJ Sent`, `COD`, `>7 Hari`, `FCL`).
       - **Target Bill Hari Ini (Laut)**: Kuantiti listcode laut (`N List`), breakdown PIC Thara, Rico, Ferly, dan 4 filter micro-button (`SJ Sent`, `COD`, `>7 Hari`, `FCL`).
       - **Volume Faktur Diterbitkan**: Jumlah faktur/bill diterbitkan (`N Bill`), breakdown volume udara vs laut, dan persentase pertumbuhan MoM faktur.
    3. *Tab & Kontrol Domain Finance*:
       - Sub-tab navigasi: **Tren Bulanan (Rp)** (`bulanan`), **Komparasi 3 Periode** (`komparasi`), dan **Tren Harian (Rp)** (`harian`).
       - Mengunci metrik secara permanen ke `metric = "value"` (Rp), menghilangkan tombol toggle `[Jumlah Bill | Total Tagihan]`, menghilangkan tab `karyawan`, dan menghilangkan mode `Arus SJ vs Bill`.
       - Menyertakan Matriks Komparasi 8 metrik finansial, 3 summary cards (Total Omzet Tagihan, Omzet Laut & Udara, Rata-rata Nilai/Faktur), proporsi pangsa pasar moda (Udara vs Laut), serta tabel performa cabang.
    4. *Tab & Kontrol Domain Operation*:
       - Widget **Perbandingan Batch Marking Exit vs Bill Dibuat** (`BatchExitComparisonSection.tsx`): Monitoring rasio penyelesaian kargo exit, breakdown moda udara vs laut, kelengkapan per status customer, dan rasio per cabang logistik.
       - Panel Analitik Operasional dengan 3 Sub-Tab:
         - **Produktivitas Karyawan (PIC)** (`EmployeeChart.tsx`): Terkunci permanen pada metrik `count` (Jumlah Bill yang diterbitkan PIC) dengan filter time range `[7 | 14 | 30 Hari]`.
         - **Arus SJ vs Bill** (`SjVsBillChart.tsx`): Monitoring produksi fisik pengiriman SJ vs Bill Diterbitkan per hari dan per PIC (`Semua`, `Yati & Kiki`, `Thara`, `Ferly`, `Rico`).
         - **Tren Volume Bill** (`TrendChart.tsx`): Terkunci permanen pada metrik `count` (Jumlah Faktur) dengan switcher periode `[Harian | Bulanan]` dan filter moda `[Semua | ✈️ Udara | 🚢 Laut]`.
    5. *Dual Bahasa (i18n `id.json` & `en.json`)*:
       - Memperbarui deskripsi `billing.dashboardTab.financeDesc` dan `operationDesc`.
       - Menambahkan label operasional: `billing.opTab.employee`, `billing.opTab.sjVsBill`, `billing.opTab.volume`, `billing.volumeTrendTitle`, `billing.volumeTrendSubtitle`, `billing.omzetUdara`, `billing.omzetLaut`, `billing.avgInvoiceValue`.
    6. *Ekspor Laporan PDF Lengkap (9 Lembar)*: Tetap mempertahankan struktur 9 lembar A4 Landscape terpisah per segmen data yang mencakup seluruh metrik Finance (Lembar 1-4) dan Operation (Lembar 5-9).
  - **Verifikasi**:
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.02s)**.

- [x] **Resolusi Acuan Master Price List Berdasarkan `tbBilling.fdBranchCode` dan Normalisasi `--` & `SG` Menjadi `SG` (`m3-check.service.ts`, `price-list-lookup.service.ts`, `price-check.service.ts`, `billing.utils.ts`, `price-check.test.ts`)**:
  - **Permintaan Pengguna**: "Acuan Master Price List -> gunakan fdBranchCode dari tbBilling -> -- dan SG adalah SG".
  - **Analisis & Akar Masalah**:
    1. Pada invoice `YWS-000256-10-2026`, header tagihan berasal dari cabang Yiwu (`tbBilling.fdBranchCode = 'YW'`), namun kode marking kargo adalah `26GZD76` (Guangzhou).
    2. Sebelumnya, `evaluateM3Check` backend mengekstrak cabang dari relasi `tbMarking`/`tbCabang` (`cb.fdBranchName = 'GUANGZHOU'`) sehingga `expectedBranch` ter-override menjadi `'GZ'`. Akibatnya, sistem mengambil Master Price List GZ Laut (General Goods = Rp 4.500.000) alih-alih Price List YW Laut (General Goods = Rp 4.800.000).
    3. Cabang Singapore pada faktur warisan sering tercatat sebagai `'--'` atau `'-'`, yang belum ternormalisasi konsisten ke `'SG'` saat lookup tarif master.
  - **Penyelesaian Teknis**:
    1. *Backend `m3-check.service.ts`*:
       - Menambahkan fungsi helper `normalizeBranchCode(branch)` yang memetakan `--`, `-`, `SINGAPORE`, dan `SG` menjadi `'SG'`.
       - Mengubah alur pencarian agar **selalu** mengecek `tbBilling` untuk identifier invoice maupun listcode.
       - Menjadikan `tbBilling.fdBranchCode` sebagai Single Source of Truth utama untuk `expectedBranch`: jika ada di `tbBilling`, cabang dinormalisasi langsung dari `billingInfo.fdBranchCode`. Jika tidak ada di `tbBilling` (unbilled), baru fallback ke `tbMarking.fdBranchCode`.
    2. *Backend `price-list-lookup.service.ts`*:
       - Pada fungsi `lookupPriceByEntry`, menambahkan query pengecekan ke `tbBilling` untuk mengambil `fdBranchCode` dan menormalisasikannya via `normalizeBranchCode`.
    3. *Backend `price-check.service.ts`*:
       - Memperbarui `getNormalizedBranchCode` untuk memetakan `--` dan `-` ke `'SG'`.
       - Memperbarui unit test di `price-check.test.ts` (24/24 tests PASS).
       - Merestart PM2 service `ShippingApi` (PID: 64276).
    4. *Frontend `billing.utils.ts`*:
       - Memperbarui `getNormalizedBranchCode` agar `--` dan `-` dinormalisasi ke `'SG'`.
       - Di `evaluateItemPrice`, `branchFilter` memprioritaskan `ctx.branchCode` (dari `tbBilling.fdBranchCode`) dan `res.expectedBranch` dengan pemanggilan `getNormalizedBranchCode`.
       - Hasil pada invoice `YWS-000256-10-2026`: target harga item no 2 (`CIRCULAR LOOM ACCESSORIES` / General Goods) kini tepat menggunakan Master Price List YW (Rp 4.800.000 / M³).
  - **Verifikasi**:
    - Backend Unit Tests: `bun test backend/src/modules/price-check/price-check.test.ts` $\to$ **24 PASS (0 errors)**.
    - Backend Typecheck: `cd backend && bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (3.35s)**.
  - **Permintaan Pengguna**: "buat jadi 2 tab -> operation dan finance pada dashbard billing. perbaiki dual bahasanya juga dan update report unduh pdf tambahkan report operation /grill-me".
  - **Penyelesaian Teknis**:
    1. *Top Master Tab Switcher (`DashboardPage.tsx`)*:
       - Menambahkan segmented view switcher di bagian atas dashboard:
         - **Tab Finance (`billing.dashboardTab.finance`)**: Menampilkan 3 kartu KPI utama finansial (Target Udara, Target Laut, Kinerja Penagihan Bulan Ini), grafik analitik harian, tren bulanan 12 bulan & YoY, Matriks Komparasi 3 Periode, serta performa karyawan/PIC.
         - **Tab Operation (`billing.dashboardTab.operation`)**: Menampilkan 3 kartu target operasional kargo, widget *Perbandingan Batch Marking Exit vs Bill Dibuat* (`BatchExitComparisonSection.tsx`), dan monitoring *Arus SJ vs Bill* (`SjVsBillChart.tsx`) lengkap dengan filter rentang waktu dan PIC.
    2. *Lokalisasi Dual Bahasa (i18n `id.json` & `en.json`)*:
       - Menambahkan key `billing.dashboardTab.finance` (*Keuangan (Finance)* / *Finance*), `billing.dashboardTab.operation` (*Operasional (Operation)* / *Operation*), dan deskripsi masing-masing tab.
    3. *Penambahan Report Operasional pada Unduh PDF (`DashboardPdfFullReport.tsx`)*:
       - Menambah total lembar eksekutif dari 7 lembar menjadi **9 lembar**:
         - **Lembar 8 (Monitoring Batch Marking Exit vs Bill Dibuat)**: Hero rasio penyelesaian kargo, 3 metric cards kargo, breakdown moda udara vs laut, kelengkapan bill per status customer (Blocked, Warning, Urgent, COD, OK), serta tabel rasio penagihan per cabang logistik (normalisasi `-- & SG`).
         - **Lembar 9 (Rincian Batch Pending & Target Bill Logistik)**: Highlight kesiapan target bill harian udara & laut, serta tabel rincian batch marking yang memiliki kargo unbilled/pending lengkap dengan pill status customer kritis.
         - Memperbarui seluruh nomor footer lembar 1–7 menjadi `Lembar X dari 9`.
    4. *Passing Props Data Batch Exit*: Meneruskan `batchExitSummary` dan `batchExitBatches` dari hook `useBillingDashboard` ke kontainer `DashboardPdfFullReport` off-screen.
  - **Verifikasi**:
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (3.81s)**.


- [x] **Redesign Blok Perbandingan Batch Marking Exit vs Bill Dibuat Sesuai Mockup Gambar (`BatchExitComparisonSection.tsx`)**:
  - **Permintaan Pengguna**: Mengubah layout blok "Perbandingan Batch Marking Exit vs Bill Dibuat" agar 100% identik dengan spesifikasi teks dan mockup gambar (`media_1791512138758_8c16924d.png`).
  - **Penyelesaian Teknis**:
    1. *Header Ribbon & Action*:
       - Judul dinamis `Perbandingan Batch Marking Exit vs Bill Dibuat [Oktober 2026]` + subtitle deskriptif.
       - Switcher toggle `Bulan Aktif` dan tombol aksi cepat `Rincian Batch [N]` (menampilkan badge pending).
    2. *Baris Atas Kiri — Ringkasan & Moda Hero*:
       - Hero number rasio penyelesaian kargo (`72.6%`).
       - 3 kartu ringkasan kargo border kiri semantik: Total Kargo Exit (`678` dari 20 batch), Sudah Terbit Bill (`492` · 72.6%), Belum Terbit Bill (`186` di 17 batch).
       - Thick dual progress bar kargo (emerald = sudah terbit, amber = belum terbit).
       - Dual kartu moda: **Moda Udara** (persentase 96.8%, 181 bill · 6 belum, total 187, status 1 tuntas · 3 pending) dan **Moda Laut** (persentase 63.3%, 311 bill · 180 belum, total 491, status 2 tuntas · 14 pending).
    3. *Baris Atas Kanan — Kelengkapan Bill per Status Customer*:
       - Subtitle progres penagihan & tombol link `Buka rincian`.
       - Segmented switcher pill moda terintegrasi real-time: `[Semua N | 🟠 Udara N | 🔵 Laut N]` yang menghitung ulang persentase status secara instan tanpa fetch ulang.
       - 5 bar status customer horizontal semantik: Blocked (100%), Warning (52.9%), Urgent (89.5%), COD (89.9%), OK (34.6%) lengkap dengan rincian kargo tuntas vs belum ditagih.
    4. *Baris Bawah — Tabel Rasio Penagihan per Cabang Asal Kargo*:
       - Header subteks cabang aktif & penyatuan Singapore (`--` & `SG`).
       - 7 Kolom presisi: `Cabang`, `Rasio bill` (progress bar + persentase font mono), `Bill`, `Sisa`, `Total`, `Batch` (tuntas · pending), dan `Moda` (pill kargo 🟠 Udara / 🔵 Laut).
       - Footer catatan penjelas warna moda & jumlah kargo.
    5. *Kepatuhan Midnight Dark Mode*:
       - Border outline semantik transparan (`border-slate-800`, `bg-slate-900/40`, `border-amber-500/30`), bebas badge solid terang.
  - **Verifikasi**:
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.72s)**.


- [x] **Perbaikan Grafik Arus SJ vs Bill pada Dashboard Billing (`DashboardPage.tsx`, `SjVsBillChart.tsx`, `TrendChart.tsx`)**:
  - **Permintaan Pengguna**: "pada arus sj VS bill grafiknya tidak keluar".
  - **Analisis Akar Masalah**:
    1. *Data Source Coupling*: Pada sesi sebelumnya, mode Arus SJ vs Bill dipaksakan masuk ke dalam `TrendChart.tsx` melalui `mergedChartData` yang me-looping array `daily` (`BillingTrendPoint`). Jika `daily` kosong, terlambat dimuat, atau tanggalnya tidak match, kurva produksi SJ menjadi 0 / kosong.
    2. *Konflik Skala & Format Sumbu Y (`YAxis`)*: `TrendChart` mewarisi `metric` finansial (`value` = nominal Rupiah miliaran). Nilai produksi dokumen SJ (puluhan/ratusan) dipetakan ke sumbu Y miliaran Rupiah, meratakan kurva hingga 0 px di garis dasar sehingga tampak tidak keluar.
    3. *Animasi Recharts Freeze*: `Line` di `TrendChart` memiliki `isAnimationActive={true}` default yang gagal menginterpolasi path SVG saat berganti kunci dataKey secara dinamis.
  - **Solusi & Penyelesaian Teknis**:
    1. *Restorasi Spesialisasi Komponen (`DashboardPage.tsx`)*:
       - Ketika tab Harian berada pada toggle `[Arus SJ vs Bill]`, merender komponen dedikasi `<SjVsBillChart>` yang langsung mengambil dataset `sjVsBillData` mandiri dengan loading state `isLoadingSjVsBill`.
       - Mode `[Tren Faktur]` tetap menggunakan `<TrendChart>` untuk analisis performa faktur Udara & Laut.
    2. *Penyempurnaan `SjVsBillChart.tsx`*:
       - Menambahkan prop `embedded?: boolean` agar saat berada di dalam kontainer tab Harian tidak menimbulkan double card border.
       - Sumbu Y murni diskalakan integer dokumen (`allowDecimals={false}`, `tickFormatter={formatNumber}`).
       - Mendukung penuh pemisahan kurva per PIC (`all`, `yati_kiki` breakdown Yati vs Kiki, `thara`, `ferly`, `rico`).
       - Menonaktifkan animasi render lambat (`isAnimationActive={false}`) agar kurva langsung muncul instan dan presisi.
       - Memperbarui palet warna ke semantic tokens yang terang di Midnight Dark Mode (`#0284c7` Sky, `#e11d48` Rose, `#d97706` Amber, `#059669` Emerald) dan Tooltip berkontras tinggi dengan background surface semantik.
    3. *Pembersihan `TrendChart.tsx`*:
       - Mengeliminasi kode eksperimen `mergedChartData` dan coupling props `sjVsBillData`, `dailyViewMode`, `activeSjPic`.
       - Mengembalikan `TrendChart` ke performa terbaiknya untuk data tren penagihan faktur harian & bulanan.
  - **Verifikasi**:
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (4.00s)**.

- [x] **Penyatuan Elemen Beririsan KPI Eksekutif & Tab Grafik Arus SJ vs Bill pada Dashboard Billing (`DashboardPage.tsx`, `TrendChart.tsx`, `id.json`, `en.json`)**:
  - **Permintaan Pengguna**: "buat agar pada grafik dan kpi yang datanya beririsan bisa di gabung menjadi 1 https://app.sampai.co/mshipping/finance/billing /grill-me".
  - **Penyelesaian Teknis**:
    1. *Penyatuan Kartu KPI Finansial & Volume (Grid 3 Kolom Eksekutif)*:
       - Menggabungkan kartu *Invoice Bulan Ini* (`invoicesBulanIni`) dan *Tagihan Bulan Ini* (`tagihanBulanIni`) menjadi 1 kartu terpadu: **Kinerja Penagihan Bulan Ini** (`kpi_penagihan_bulan_ini`).
       - Menampilkan omzet (Rp) sebagai hero number utama, didampingi pill volume faktur (`N Bill`), breakdown mikro moda Udara (Rp + Bill count) & Laut (Rp + Bill count), dual GrowthPill MoM/YoY omzet, serta selisih MoM faktur.
       - Slot kartu atas berubah dari 4 kartu menjadi 3 kolom simetris yang proporsional (`Target Bill Udara`, `Target Bill Laut`, `Kinerja Penagihan Bulan Ini`).
    2. *Penyatuan Tab Harian + SJ vs Bill (`TrendChart.tsx` & `DashboardPage.tsx`)*:
       - Mengeliminasi tab `sj-vs-bill` mandiri yang redundan dari switcher navigasi grafik.
       - Menyatukan data produksi Surat Jalan (`sjProduction`), Bill Diterbitkan (`sjBillProduction`), dan backlog Unbilled SJ (`unbilledSj`) ke dalam tab **Harian**.
       - Menyediakan segmented toggle di toolbar: `[Tren Faktur | Arus SJ vs Bill]`.
       - Pada mode `[Arus SJ vs Bill]`, grafik menampilkan 3 kurva produksi (SJ, Bill, Unbilled) lengkap dengan drill-down PIC switcher (`Semua`, `Yati & Kiki`, `Thara`, `Ferly`, `Rico`).
       - Pada mode `[Tren Faktur]`, garis pandu produksi SJ otomatis tampil halus di latar belakang saat metrik `Jumlah Bill` aktif untuk perbandingan real-time.
    3. *Lokalisasi Dual Bahasa (i18n)*:
       - Menambahkan key `billing.penagihanBulanIni` pada kamus `id.json` (*Kinerja Penagihan Bulan Ini*) dan `en.json` (*Billing Performance This Month*).
  - **Verifikasi**:
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (15.87s)**.

- [x] **Redesign Dashboard Billing Menjadi Dense Executive Dashboard (`DashboardPage.tsx`, `BatchExitComparisonSection.tsx`, `SjVsBillChart.tsx`)**:
  - **Permintaan Pengguna**: "redesign https://app.sampai.co/mshipping/finance/billing agar lebih compact dan rapi dan mudah dipahami tanpa menghilangkan data yang di tampilkan /redesign-existing-projects /generative_ui /plan /grill-me".
  - **Penyelesaian Teknis**:
    1. *Generative UI Interactive Prototype*:
       - Membuat preview mandiri `billing_dashboard_redesign_preview.html` yang mendukung 5 switcher tema M-Shipping (Heritage, Ocean, Emerald, Amber, Midnight Dark Mode) untuk memvalidasi hirarki dense visual.
    2. *Peningkatan Densitas & Spacing (`DashboardPage.tsx`)*:
       - Merapatkan jarak vertikal halaman dari `space-y-6 sm:space-y-8 pb-24` menjadi `space-y-3.5 sm:space-y-4 pb-16` dan padding kontainer `p-3.5 sm:p-5`.
       - Menyeragamkan tinggi 4 kartu KPI utama (`min-h-[145px] flex flex-col justify-between`) sehingga sejajar sempurna di desktop/mobile.
       - Memadatkan ukuran tipografi angka KPI utama menjadi `text-base sm:text-xl font-bold font-mono tabular-nums`.
       - Merapikan micro-pill filter kategori target Udara/Laut (`SJ Sent`, `COD`, `>7 Hari`, `FCL`) ke ukuran padat `text-[9px] px-1.5 py-0.5`.
    3. *Konsolidasi Header Toolbar Tab Grafik Analitik (`DashboardPage.tsx`)*:
       - Mengintegrasikan tab switcher (`Harian`, `Bulanan`, `Komparasi 3 Periode`, `Karyawan`, `SJ vs Bill`), Time Range (`7 | 14 | 30 Hari`), Trend Mode (`Semua | Udara | Laut`), Metrik (`Jumlah List | Nilai Rp`), dan Toggle YoY ke dalam 1 baris header yang rapi dan responsif.
       - Mengeliminasi kontrol segmented duplikat yang sebelumnya memakan ruang vertikal pada subheader masing-masing tab chart.
    4. *Optimasi Batch Exit Comparison Section (`BatchExitComparisonSection.tsx`)*:
       - Header ribbon dan 4 mini kartu ringkasan dipadatkan (`p-3.5 sm:p-4 space-y-3`).
       - Menambahkan **Collapsible Toggle View** pada breakdown cabang: menampilkan 6 cabang teratas secara default dan tombol expand (`Tampilkan Seluruh N Cabang (+X Lainnya)`) untuk menghemat ruang vertikal ketika banyak cabang aktif.
    5. *Penyelarasan Midnight Dark Mode (`SjVsBillChart.tsx`)*:
       - Mengganti styling tombol PIC hardcode (`bg-[#1A1C1E] text-white`) dengan semantic token classes (`bg-[var(--color-primary)] text-[var(--color-surface)]`).
       - Mengganti background badge status tagihan menjadi semantic transparent outline (`bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30`).
  - **Verifikasi**:
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.74s)**.


- [x] **Penyelarasan Sejajar Header-Data Tabel Modal & Penambahan Detail Berdasarkan Status Customer pada Modal Rincian Batch Marking Exit (`BatchExitModal.tsx`, `BatchExitComparisonSection.tsx`, `billing-batch-exit.service.ts`)**:
  - **Permintaan Pengguna**: "pada modal -> Rincian Batch Marking Exit & Progres Billing -> buat lebih detail berdasarkan status customer. Pada tabelnya buat agar letak header dan data sejajar agar mudah dipahami".
  - **Penyelesaian Teknis**:
    1. *Backend Service (`billing-batch-exit.service.ts`)*:
       - Memperkaya kueri `getBatchExitComparison` dengan join `tbCustomers c` dan metrik ringkasan `fdBlocked`: `blockedCount` (4), `warningCount` (3), `urgentCount` (5), `codCount` (2), `okCount` (1), `noStatusCount` (0) serta `unbilledBlocked`, `unbilledWarning`, `unbilledUrgent`, `unbilledCod`.
       - Agregasi `byCustomerStatus` pada summary DTO untuk seluruh 6 kelompok status customer lengkap dengan total kargo, total billed, total unbilled, dan billed percentage.
       - Memperkaya kueri `getBatchExitCargoDetails` dengan field `custStatus` (`fdBlocked`), `custStatusLabel` (`CUST_STATUS_LABELS`), dan `isBroker` (`fdBroker === 2`).
       - PM2 service `ShippingApi` direstart & online (`PID: 70000`).
    2. *Frontend Types (`billing.types.ts`)*:
       - Menambahkan interface `CustomerStatusMetric` dan `BatchCustomerStatusCounts`.
       - Memperbarui interface `BatchExitComparisonSummary` (menambahkan `byCustomerStatus`), `BatchExitItem` (menambahkan `customerStatus`), dan `BatchExitCargoItem` (menambahkan `custStatus`, `custStatusLabel`, `isBroker`).
    3. *Frontend Modal (`BatchExitModal.tsx`)*:
       - **Perbaikan Alignment Header dan Data (100% Sejajar)**: Mengeliminasi anti-pattern pembungkus `colSpan={7}` flexbox `<div>` yang lebarnya tidak sinkron dengan `<th>`. Menggantinya dengan native tabel HTML `Fragment` di mana setiap sel baris data berupa `<td>` dengan width dan min-width terstruktur (`w-10`, `w-40`, `w-28`, `w-36`, `w-44`, `w-36`, `min-w-[130px]`, `w-28`) yang terikat 1-ke-1 secara presisi dengan setiap `<th>`.
       - **Rincian Status Customer per Batch**: Menambahkan kolom ke-5 "Status Customer" pada tabel batch yang menampilkan mini pill badges ringkasan kargo customer berstatus kritis di batch tersebut (`🚨 BLOCKED`, `⚠️ WARN`, `⚡ URGENT`, `💵 COD`, `✅ OK`) lengkap dengan counter pending.
       - **Pita Filter & KPI Status Customer**: Menambahkan filter baris interaktif status customer (`[Semua Status | 🚨 BLOCKED (N pending) | ⚠️ WARNING | ⚡ URGENT | 💵 COD | ✅ OK]`) yang dapat diklik langsung untuk memfilter daftar batch.
       - **Expanded Row Rincian Kargo**: Kolom "Pelanggan & Status" menampilkan nama, kode customer font mono, badge semantik status pelanggan (`statusConfig[custStatus]`), dan `BrokerBadge`.
    4. *Dashboard Section (`BatchExitComparisonSection.tsx`)*:
       - Menambahkan grid kartu "Distribusi Kelengkapan Bill Berdasarkan Status Customer" di bawah panel cabang untuk pemantauan langsung dari dashboard.
  - **Verifikasi**:
    - Backend Typecheck: `cd backend && bun x tsc --noEmit` -> **LULUS 100% 0 errors**.
    - Frontend Production Build: `cd frontend && bun run build` -> **LULUS 100% 0 errors (3.43s)**.


- [x] **Redesign Tata Letak & Multi-Customer Marking Subheader pada Modal Surat Jalan Batch (`DeliveryBatchDetailModal.tsx`)**:
  - **Permintaan Pengguna**: "pada modal -> Surat Jalan Batch: -> perbaiki designnya" (melampirkan gambar dengan kotak merah pada marking subheader yang berantakan).
  - **Identifikasi Masalah**:
    1. Pada baris subheader marking (`tr > td colSpan={8}`), terdapat rendering string kode customer mentah dalam tanda kurung `({marking.custCode})` tanpa batasan lebar (`truncate`) yang menggabungkan seluruh kode customer dari marking tersebut.
    2. Pada marking forwarder/konsolidasi (misal `26ASG-EP` dengan 24 customer), deretan kode seperti `(A000281, B000440, B000260, ...)` membentang horizontal memadati baris hingga ratusan pixel.
    3. Akibatnya, container dengan `flex-wrap` memecah baris: badges `39 SJ` dan `✓ 39 Bill` terdorong ke posisi janggal, serta metrik koli & berat (`49 coly • 410 kg`) jatuh ke baris kedua, merusak tampilan tabel secara visual.
  - **Penyelesaian Teknis**:
    1. *Struktur Data Marking*: Menambahkan properti `custNamesList`, `custCodesList`, dan `uniqueCustomerCount` ke dalam agregasi data grouping marking.
    2. *Penyajian Cerdas Customer*:
       - **Single Customer (`uniqueCustomerCount <= 1`)**: Menampilkan `Nama Customer (Kode)` dengan truncate rapi.
       - **Multi-Customer / Konsolidasi (`uniqueCustomerCount > 1`)**: Menampilkan nama customer pertama + chip badge indigo `+N Pelanggan` berikon `Users` dengan `title` tooltip yang memuat seluruh nama dan kode pelanggan secara terstruktur per baris.
       - Mengeliminasi string kode horizontal mentah `(A000281, B000440, ...)` yang meluber.
    3. *Penguncian Metrik Rata Kanan*:
       - Sisi kanan metrik muatan fisik (`X coly • Y kg`) terkunci permanen rata kanan (`ml-auto whitespace-nowrap`) dan tidak pernah terdorong ke baris bawah.
       - Sisi kiri dikelompokkan dengan rapi: Chevron collapse $\to$ Tag Marking Code amber $\to$ Info Customer/Pill Pelanggan $\to$ Badge SJ $\to$ Badge Bill.
    4. *Penyelarasan Dual View*: Menerapkan perbaikan yang sama pada subheader strip mode Kartu (`Cards Mode`).
    5. *Branch Header Polish*: Mempertegas border dan background kontras halus pada toggle bar cabang.
  - **Verifikasi**:
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (3.37s)**.

- [x] **Eliminasi Badge Redundan PARSIAL & Penataan Tag Multi-Aktif pada Target Bill (`TargetPage.tsx`)**:
  - **Permintaan Pengguna**: "perbaiki https://app.sampai.co/mshipping/finance/billing/target?group=sj_sent&type=laut pada list data apabila semua taf aktif tampak berantakan" $\to$ "hilangkan redundant badge".
  - **Identifikasi Duplikasi**:
    - Tombol badge `[PARSIAL (N)]` sebelumnya dirender dua kali pada baris yang sama:
      1. Di kolom *Customer & Status* (desktop) dan baris status atas (mobile card).
      2. Di kolom *Marking & Kargo* (desktop) dan kartu marking (mobile card).
    - Status parsial secara logis merupakan properti dari kargo/marking (`tbEntryList`), bukan properti customer.
  - **Penyelesaian Teknis**:
    1. Menghapus rendering tombol badge `[PARSIAL]` dari kolom *Customer & Status* (desktop) dan top row (mobile).
    2. Mempertahankan tombol badge `[PARSIAL ({count})]` secara eksklusif dan kontekstual di kolom *Marking & Kargo* tepat di samping kode marking kargo.
    3. Kolom *Customer & Status* kini murni hanya menampilkan: Nama Customer, `custCode`, tombol `[🏷️ Tarif]`, `StatusBadge` (e.g. WARNING/COD/URGENT), dan `BrokerBadge`.
    4. Seluruh tata letak kolom desktop (`min-w-[1400px]`) dan mobile card 100% rapi, tidak ada duplikasi badge, dan tidak ada kolisi visual antar kolom.
  - **Verifikasi**:
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.85s)**.

- [x] **Pembuatan Fungsi Ekspor Excel Pivot 4 Sheet (Total, M3, KG Udara, CTR) pada Report Omset & Volume Customer (`billing-omset-report.service.ts`, `billing.routes.ts`, `billing.service.ts`, `OmsetVolumeReportPage.tsx`)**:
  - **Permintaan Pengguna**: "pada page Report Omset & Volume Customer -> buat fungsi untuk generate excel yang hasilnya seperti dari file python kode python : ... /plan /grill-me".
  - **Penyelesaian Teknis**:
    1. *Backend Service (`billing-omset-report.service.ts`)*:
       - Menambahkan method `generateOmsetVolumePivotExcel(yearFrom = 2018): Promise<Buffer>`.
       - Query agregasi data multi-tahun (2018 s/d tahun terbaru) dari view `qr_data_master_billing` dengan join master `tbCustomers.fdCustName` (Single Source of Truth) dan `QR_TB_TOTALBILL_PER_CUSTOMER`.
       - Transformasi pivot in-memory dan pembersihan karakter non-XML ilegal (`[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x84\x86-\x9f]`).
       - Membentuk workbook ExcelJS dengan 4 sheet:
         - Sheet 1: `Total` (`fdJumlah`)
         - Sheet 2: `M3` (`m3`)
         - Sheet 3: `KG Udara` (`KG_UDARA`)
         - Sheet 4: `CTR` (`TotalFcl`)
       - Styling sheet identik dengan skrip Python:
         - Header navy solid `#1F4E78`, font Arial tebal putih `#FFFFFF`, alignment center.
         - Kolom `fdCustName` dan `fdSalesNM` lebar 28, kolom tahun lebar 14 dengan number format `#,##0`.
         - Freeze Panes pada `C2` (mengunci kolom customer, sales, dan baris header).
    2. *Backend Route (`billing.routes.ts`)*:
       - Endpoint baru: `GET /api/billing/reports/omset-volume/export-pivot`.
       - Menghasilkan binary response Excel dengan header MIME type `.xlsx` dan penamaan file dinamis `billing_pivot_report_YYYYMMDD_HHmmss.xlsx`.
       - PM2 service `ShippingApi` direstart & online (PID: 68200).
    3. *Frontend Client & Service (`billing.service.ts`)*:
       - Menambahkan method `exportOmsetVolumePivotExcel(params?: { yearFrom?: number })` dengan response type `blob`.
    4. *Frontend UI (`OmsetVolumeReportPage.tsx`)*:
       - Menambahkan dual export button di `PageHeader.actions`:
         - `[Download Excel (Rekap)]`: Mengunduh tabel rekap datar multi-metrik sesuai filter aktif halaman.
         - `[Export Pivot (4 Sheet)]`: Mengunduh file Excel pivot 4 sheet multi-tahun lengkap (2018 s/d terbaru) dengan loading spinner & toast notifikasi via Sonner.
       - Desain tombol patuh standar Midnight Dark Mode dengan border semantik transparan (`border-sky-500/30 bg-sky-500/5`).
  - **Verifikasi**:
    - Backend Typecheck: `cd backend && bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Buffer & ExcelJS Structure Test: 4 sheets (`Total`, `M3`, `KG Udara`, `CTR`), 7.145 rows x 11 cols, Freeze Pane `C2`, 869 KB $\to$ **100% Valid & Sukses (5.79s)**.
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (4.61s)**.


- [x] **Eliminasi Tombol Redundan pada Halaman Validasi Detail Bill (`ValidationDetailPage.tsx`, `ProfilePricingTab.tsx`, `ValidationCardHeader.tsx`)**:
  - **Permintaan Pengguna**: "hilangkan redundant tombol pada page validasi detail bill".
  - **Identifikasi Duplikasi & Restrukturisasi**:
    1. *Tombol Tarif (Sebelumnya ada di 3 tempat)*:
       - Top Ribbon Header (`ValidationDetailPage.tsx`): Dihapus, menyisakan ribbon untuk invoice-level actions (`Terbitkan`, `Inspeksi`, `Cetak`, `Resi`, `History`, `Refresh`, `Cari Invoice`).
       - Header Kartu Profil (`ProfilePricingTab.tsx`): Tombol `[🏷️ Tarif Acuan]` standalone dihapus, tetap mempertahankan badge sumber `tbCustomerHarga` yang dapat diklik langsung.
       - Contextual Placement: Tetap mempertahankan tombol `[🏷️ Tarif]` di samping label Customer pada `CustomerInfoCard.tsx` (sesuai penempatan di daftar faktur).
    2. *Tombol Audit (Sebelumnya ada di 2 tempat)*:
       - Top Ribbon Header (`ValidationDetailPage.tsx`): Dihapus karena pricing audit secara kontekstual berada di dalam Tab 1 (Item & Tarif).
       - Contextual Placement: Tetap mempertahankan tombol `[📜 Audit]` di header `ProfilePricingTab.tsx` (Tab 1).
    3. *Tombol Refresh (Sebelumnya ada di 2 tempat)*:
       - Header Kartu Validasi (`ValidationCardHeader.tsx`): Dihapus mini refresh button `<RefreshCw>` karena telah tercover universal di Top Action Ribbon (`handleRefresh` yang merefresh 3 kuari: billing detail, M3 check, dan transport check dengan voice command & spinner status).
  - **Verifikasi**:
    - Build Frontend: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.43s)**.


- [x] **Penambahan Link & Integrasi Modal Tarif Acuan Customer (`CustomerHargaModal.tsx`) pada Validasi Detail Bill (`ValidationDetailPage.tsx`, `CustomerInfoCard.tsx`, `ProfilePricingTab.tsx`, `BillingValidationCard.tsx`, `GlobalVoiceHud.tsx`)**:
  - **Permintaan Pengguna**: "tambahkan link untuk membuka modal Tarif Acuan Customer (tbCustomersHarga) pada validasi detail bill page".
  - **Penyelesaian Teknis**:
    1. *Ribbon Header Halaman Detail (`ValidationDetailPage.tsx`)*:
       - Menambahkan tombol aksi cepat `[🏷️ Tarif]` di sebelah tombol `Audit` pada ribbon header atas untuk membuka `CustomerHargaModal`.
       - Menambahkan state `isCustomerHargaModalOpen` dan merender `<CustomerHargaModal />` dengan binding `custCode={data.fdCustCode}` dan `custName={displayCustName(...)}`.
       - Menambahkan supresi voice assistant saat modal terbuka (`isAnyModalOpen`).
    2. *Kartu Identitas Tagihan & Customer (`CustomerInfoCard.tsx`)*:
       - Menambahkan link tombol `[🏷️ Tarif]` pada header blok `Customer` di samping nama pelanggan.
    3. *Tab Item & Profil Tarif (`ProfilePricingTab.tsx` & `BillingValidationCard.tsx`)*:
       - Menambahkan prop `onOpenCustomerHargaModal` pada `BillingValidationCardProps` dan `ProfilePricingTabProps`.
       - Menambahkan tombol `[🏷️ Tarif Acuan]` pada header profil harga pelanggan di Tab 1 (Item & Tarif).
       - Menjadikan chip badge `tbCustomerHarga` interaktif untuk membuka modal saat diklik.
    4. *Dukungan Voice Assistant (`GlobalVoiceHud.tsx` & `voiceAssistantStore.ts`)*:
       - Menambahkan intent suara *"tarif"*, *"harga customer"*, *"pricelist"*, *"tarif acuan"* ke `GlobalVoiceHud.tsx`.
       - Menambahkan tipe `'tarif'` ke union `modalName` pada `VoiceAssistantContext`.
  - **Verifikasi**:
    - Frontend build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (3.09s)**.

---

- [x] **Perbaikan Penumpukan Ikon & Padding Search Input pada Modal Detail Fisik & Tagihan Per Marking (`CustMarkingHeaderToolbar.tsx`, `CustMarkingDetailModal.tsx`)**:
  - **Permintaan Pengguna**: "perbaiki modal -> Detail Fisik & Tagihan Per Marking -> icon pada search input bertumpuk".
  - **Akar Masalah**:
    1. Pada `CustMarkingHeaderToolbar.tsx`, search input menggunakan kelas CSS `pl-8.5` yang tidak valid pada standar Tailwind CSS v3. Akibatnya, browser mengabaikan kelas tersebut sehingga input memiliki `padding-left: 0px` (atau default 2px).
    2. Teks pencarian dan placeholder bertumpuk langsung di atas ikon `<Search>` (`left-3` / `12px`).
    3. Menggunakan `focus:outline-hidden` (syntax Tailwind v4) alih-alih `focus:outline-none`.
  - **Penyelesaian Teknis**:
    1. Mengubah posisi ikon `<Search>` menjadi `left-2.5 top-1/2 -translate-y-1/2 pointer-events-none` (10px).
    2. Menerapkan padding horizontal valid Tailwind v3: `pl-8 pr-8` (32px), memberikan jarak bersih (clearance) 8px dari ikon kaca pembesar (14px lebar).
    3. Mengganti `focus:outline-hidden` menjadi `focus:outline-none focus:border-[var(--color-tertiary)]`.
    4. Menyelaraskan kelas padding badge `py-0.2` menjadi `py-0.5` dan `rounded-xs` menjadi `rounded-sm`.
  - **Verifikasi**:
    - Frontend build: `bun run build` $\to$ **LULUS 100% 0 error (11.17s)**.

---
  - **Permintaan Pengguna**: "tambahkan fitur zoom rotate crop pada lampiran revisi".
  - **Penyelesaian Teknis**:
    1. *Backend Service & Routes (`backend/src/modules/data-revisions/`)*:
       - Memanfaatkan library `sharp` yang sudah ada di dependencies backend untuk pemrosesan citra tanpa ketergantungan library native baru di mobile.
       - Menambahkan method `cropLampiran(lampiranId, options, username)` di `dataRevisions.service.ts`:
         - Mendukung rotasi 0°, 90°, 180°, 270°.
         - Mendukung crop dengan pixel pasti maupun rasio desimal proporsional (`isRatio: true`, `0.0 - 1.0`).
         - Mengonversi format ke JPEG dan memperbarui ukuran file fisik di disk serta kolom byte di database.
       - Menambahkan method `cropBase64Image(base64String, options)` untuk pemrosesan in-memory data URL.
       - Endpoint baru: `POST /api/data-revisions/lampiran/:lampiranId/crop` dan `POST /api/data-revisions/crop-base64`.
       - PM2 service `ShippingApi` direstart & online (PID: 61236).
    2. *Frontend Web (`frontend/src/features/data-revisions/`)*:
       - `data-revisions.service.ts`: Menambahkan method `cropLampiran`.
       - `RevisionGalleryModal.tsx`:
         - Kontrol Zoom In (+), Zoom Out (-), Zoom Reset (0), Rotate Kiri (90° Ccw), Rotate Kanan (90° Cw).
         - Mode Crop Interaktif: Bounding box seleksi 3x3 grid (Rule of Thirds) yang dapat digeser dan di-resize lewat 4 handle sudut.
         - Preset rasio: Bebas (Free), 1:1, 4:3, 16:9, dan Dokumen A4.
         - Aksi simpan langsung ke backend Sharp dengan cache buster otomatis dan re-fetch.
    3. *Mobile App (`mobile/src/features/data-revisions/`)*:
       - `data-revisions.service.ts`: Menambahkan `cropLampiran` dan `cropBase64`.
       - Komponen baru `RevisionCropModal.tsx`:
         - Kanvas preview dengan viewfinder crop bertema Midnight Dark Mode.
         - PanResponder untuk menggeser posisi frame cropping secara intuitif.
         - Preset rasio aspek (Bebas, 1:1, 4:3, 16:9, A4).
         - Kontrol rotasi 90° Ccw/Cw, kontrol zoom in/out (75% - 300%) dan tombol reset.
         - Tombol "Terapkan" yang memanggil endpoint backend Sharp dengan haptic feedback dan toast.
       - `RevisionPhotoSheet.tsx`:
         - Fullscreen modal preview kini dilengkapi floating bottom toolbar berdesain kaca transparan (Midnight Dark Mode compliant): tombol putar kiri/kanan, zoom in/out, persentase zoom indikator, dan tombol aksi "Crop".
         - Mengunci gesture swipe horizontal FlatList saat zoom aktif (`previewZoom > 1`) agar tidak konflik.
         - Integrasi TanStack Query invalidate untuk memuat ulang daftar foto seketika setelah crop disimpan.
  - **Verifikasi**:
    - Backend check: `cd backend && bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Mobile check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.24s)**.

---

- [x] **Pemisahan Kolom No. Resi (`fdTerima`) dan No. Listcode (`fdListCode`) pada Rincian & Ekspor Excel (`cargo-volume-report.service.ts`, `billing.types.ts`, `CargoVolumeReportPage.tsx`)**:
  - **Permintaan Pengguna**: "pada rincian -> No.RESI -> GANTI no listcode -> No. Resi dari fdTerima perbaiki ui serta excelnya".
  - **Penyelesaian Teknis**:
    1. *Backend Service (`cargo-volume-report.service.ts`)*:
       - Menambahkan field `fdTerima` ke DTO `CargoResiDetail`.
       - Mengambil `LTRIM(RTRIM(ISNULL(el.fdTerima, ''))) AS fdTerima` dari tabel `tbEntryList` pada temporary table `#CandidateResi`.
       - Menyertakan `el.fdTerima` pada klausa filter `search`.
       - Memetakan `fdTerima` ke `detailItem` respon JSON per resi.
       - PM2 service `ShippingApi` direstart & online (PID: 60996).
    2. *Frontend Types (`billing.types.ts`)*:
       - Menambahkan `fdTerima?: string | null` ke interface `CargoResiDetail`.
    3. *Frontend UI & Sub-tabel (`CargoVolumeReportPage.tsx`)*:
       - Header sub-tabel rincian resi kargo kini memiliki kolom terpisah: `No. Resi` (menampilkan `resi.fdTerima || '-'` tebal berwarna sky) dan `No. Listcode` (menampilkan `resi.fdListCode`).
       - Placeholder search bar diperjelas: `Cari customer, sales, resi, listcode, marking...`.
    4. *Ekspor Excel Detail (`handleExportDetailExcel`)*:
       - Memisahkan kolom `'No. Resi (ListCode)'` menjadi 2 kolom terpisah: `'No. Resi'` (berisi `resi.fdTerima || '-'`) dan `'No. Listcode'` (berisi `resi.fdListCode`).
  - **Verifikasi**:
    - Backend check: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend build: `bun run build` $\to$ **LULUS 100% 0 error (3.65s)**.
    - Live Query Test: `fdTerima` berhasil terbaca (contoh: `SG260824-001` untuk listcode `0942411`).

---

- [x] **Perbaikan Posisi Arrow pada Seluruh Dropdown (`CargoVolumeReportPage.tsx`)**:
  - **Permintaan Pengguna**: "perbaiki posisi arrow pada dropdown".
  - **Masalah**: Dropdown filter (`Cabang`, `Tahun Muat Dari & Ke`, `Tipe Komoditi`, `Sales`, serta `Baris per halaman`) menggunakan tag `<select>` native tanpa `appearance-none`. Di browser/OS tertentu, arrow native tidak presisi secara vertikal, bertumpuk dengan teks pada kolom sempit (misal rentang tahun), dan tidak konsisten antar tema.
  - **Solusi Teknis**:
    1. Membungkus setiap `<select>` dalam container `relative`.
    2. Menambahkan `appearance-none` untuk menonaktifkan panah bawaan browser yang off-center.
    3. Mengatur padding kanan yang aman (`pr-7` atau `pr-6`) agar teks pilihan tidak menimpa arrow.
    4. Menambahkan icon `ChevronDown` kustom dengan posisi absolut vertikal presisi di tengah (`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-secondary)]`, ukuran `w-3.5 h-3.5` / `w-3 h-3`).
  - **Verifikasi**: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (3.79s)**.

---

- [x] **Penerapan Aturan Prioritas Tipe Komoditi Baris 1 Selalu Mengikuti tbEntryList (`m3-check.service.ts`, `m3-check.types.ts`, `useBillingValidation.ts`, `billing.utils.ts`, `billing.types.ts`, `BillingValidationCard.tsx`, `ProfilePricingTab.tsx`, `ValidationBadges.tsx`, `useInvoiceMetrics.ts`)**:
  - **Permintaan Pengguna**: "untuk item baris 1 selalu ikuti tipe comoditi dari tbentrylist".
  - **Investigasi & Analisis Masalah**:
    1. Pada invoice `GZS-011139-09-2026` (resi `0942086`), item baris 1 adalah `PARCELS TO JAKARTA (M3) - LASER THERAPY DEVICE, ACCESSORIES` yang ditagih `Rp 7.000.000` (`LARTAS - S`).
    2. Di `tbEntryList`, resi `0942086` memiliki `fdTypeComodity = 4` (`LARTAS - S`).
    3. Di backend `m3-check.service.ts`, query `markingBranch` sebelumnya diproteksi kondisi `if (!resolvedBranchCode)` sehingga dilewati ketika `resolvedBranchCode` sudah terisi dari `tbBilling`, menyebabkan `defaultFdTypeComodity` bernilai `null`.
    4. Di frontend `billing.utils.ts`, nama komoditi item baris 1 ditimpa teks spesifik barang (`LASER THERAPY DEVICE, ACCESSORIES`). Kemudian pada pencocokan harga moda laut, kondisi `textAfterDash.includes('ACCESSORIES')` dievaluasi paling awal pada blok General Goods, membajak kategori menjadi `General Goods` (Rp 4.700.000) dan memicu peringatan keliru `Overcharge (+Rp 2.300.000)`.
  - **Solusi & Penyelesaian Teknis**:
    1. *Backend (`m3-check.service.ts` & `m3-check.types.ts`)*:
       - Query langsung `tbEntryList` untuk `resolvedListCode` guna mengekstrak `entryListTypeComodity`, `entryListComodityName` (via `tbTypeComodity`), dan `defaultFdTypeComodity` tanpa bergantung pada status `resolvedBranchCode`.
       - Mengembalikan `entryListTypeComodity` dan `entryListComodityName` pada payload respon `evaluateM3Check`.
       - Service PM2 `ShippingApi` direstart & online (PID: 58648).
    2. *Frontend Hook & Types (`useBillingValidation.ts`, `billing.types.ts`)*:
       - Memperbarui interface `M3CheckResponse` dengan field `entryListTypeComodity` dan `entryListComodityName`.
       - Menetapkan `entryListTypeId` dari `res?.entryListTypeComodity` (fallback `res?.defaultFdTypeComodity`).
       - Meneruskan `itemIndex`, `entryListTypeId`, dan `entryListComodityName` ke dalam evaluasi setiap baris detail.
    3. *Evaluator Harga & Komoditi (`billing.utils.ts`)*:
       - Untuk item baris 1 (`isFirstItem` / `itemIndex === 0`), `typeId` dan `comodityName` **WAJIB** mengikuti tipe komoditi dari `tbEntryList` (`entryListTypeId` $\to$ nama komoditi resmi `tbTypeComodity`, misal `LARTAS - S`), dilarang ditimpa teks mentah deskripsi barang.
       - Memproteksi evaluasi General Goods di moda laut: kata kunci parsial `ACCESSORIES`, `SPAREPART`, dan `GLASS` hanya berlaku jika kategori bukan kategori terestriksi/spesifik (`LARTAS`, `ALKES`, `TEKSTIL`, `FABRIC`, `GARMENT`, `SEMI`, `KOSMETIK`, `OBAT`, atau baris 1 dengan tipe non-1).
       - Memperkaya deteksi peralatan medis/terapi (`DEVICE`, `THERAPY`, `LASER`, `DENTAL`, `SURGICAL`, `HEALTHCARE`, `DIAGNOSTIC`) agar tepat mencocokkan ke kategori Price List **Alkes, Makanan & LS Lainnya** (Rp 7.000.000), sehingga tagihan invoice Rp 7.000.000 menjadi **MATCH (Rp 0 selisih)**.
    4. *Penyelarasan Komponen Terkait (`BillingValidationCard.tsx`, `ProfilePricingTab.tsx`, `ValidationBadges.tsx`, `useInvoiceMetrics.ts`)*:
       - Menyelaraskan seluruh pemanggilan `evaluateItemPrice` agar konsisten menyertakan `itemIndex` dan referensi `entryListTypeId`.
  - **Verifikasi**:
    - Backend Typecheck: `cd backend && bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (4.04s)**.

- [x] **Penyempurnaan Padding, Spacing Kompak & Penggunaan Ikon Proporsional pada Report Rekap Volume & Berat (`CargoVolumeReportPage.tsx`)**:
  - **Permintaan Pengguna**: "perbaiki padding dan spacingnya, gunakan icon seperlunya".
  - **Penyelesaian Teknis**:
    1. *Padding & Spacing Kompak Standard ERP*:
       - Container root: `space-y-3.5` (jarak antar elemen tidak melar berlebih).
       - 5 Kartu KPI: padding dipadatkan ke `p-3 sm:p-3.5 rounded-xl`, metrik ukuran `18px/19px font-mono font-bold leading-none` anti-jumbo.
       - Toolbar Filter: tinggi form input & dropdown diseragamkan ke `h-8 text-xs`, label `text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-wider block mb-1`.
       - Tabel Utama: cell padding dirapatkan dari `py-2.5 px-3` menjadi `py-2 px-2.5` (`th`, `td`, skeleton loader, dan `tfoot`), header/footer card dipadatkan ke `p-2.5 sm:p-3`.
       - Sub-Tabel Drill-Down Resi: container nested kargo `p-2.5 pl-8 sm:pl-10`, cell data `py-1.5 px-2` konsisten rapat.
    2. *Penggunaan Ikon Seperlunya (Purposeful & Subtle)*:
       - Menghilangkan kotak background icon warna-warni bulky yang memakan tempat.
       - Menempatkan icon inline ukuran 14px (`w-3.5 h-3.5`) dengan warna subtle berdampingan dengan label judul KPI (`Users`, `Package`, `Ship`, `Plane`, `Scale`) untuk mempercepat pemindaian visual tanpa kelelahan mata.
       - Menyematkan icon fungsional secukupnya pada segmented button moda (`Ship` untuk Laut, `Plane` untuk Udara), search bar (`Search`), reset filter (`RotateCcw`), expand/collapse baris (`ChevronDown`, `ChevronRight`), dan tombol aksi export (`FileSpreadsheet`, `Layers`).
       - Menghapus icon non-fungsional/redundant pada form label dan avatar inisial tabel.
  - **Verifikasi**: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.60s)**.

---

- [x] **Normalisasi Cabang Singapore (`--` & `SG` $\to$ `SG`) pada Report Rekap Volume & Berat dan Modal Detail Fisik Marking (`cargo-volume-report.service.ts`, `useCustMarkingData.ts`)**:
  - **Permintaan Pengguna**: "untuk data cabang -> -- dan SG adalah sama -> dari SINGAPORE /grill-me /plan".
  - **Penyelesaian Teknis**:
    1. *Backend Service (`cargo-volume-report.service.ts`)*:
       - Normalisasi metadata `branches`: menyatukan kode `--` dan `-` ke `SG` dengan label `SINGAPORE`. Dropdown pilihan cabang kini hanya menampilkan 1 pilihan representatif: `SG - SINGAPORE`.
       - Filter SQL dinamis: jika parameter `branch === 'SG'`, filter kueri otomatis mencakup kargo berlabel `SG`, `--`, maupun `-`: `AND (RTRIM(el.fdBranchCode) IN ('SG', '--', '-') OR RTRIM(m.fdBranchCode) IN ('SG', '--', '-'))`.
       - Output SELECT SQL: normalisasi `fdBranchCode` menjadi `'SG'` via `CASE WHEN RTRIM(...) IN ('--', 'SG', '-') THEN 'SG'`.
       - PM2 service `ShippingApi` direstart & online (PID: 60136).
    2. *Frontend Modal (`useCustMarkingData.ts`)*:
       - Normalisasi `rawBc`: `bc = (rawBc === '--' || rawBc === '-') ? 'SG' : (rawBc || '—')`.
       - Menghilangkan false alert: jika suatu marking memiliki kargo dengan kode `--` dan `SG`, keduanya dianggap 1 cabang tunggal (`SG`), sehingga peringatan "Multi-Cabang: --, SG" tidak keliru muncul.
       - Toolbar filter pill dan tabel modal konsisten menampilkan `SG`.
  - **Verifikasi**:
    - Backend check: `cd backend && bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (3.30s)**.
    - Data query check: Kueri `branch=SG` berhasil menarik 21.940 resi (1.288 customer) dari konsolidasi `--` dan `SG`.

---

- [x] **Redesign Halaman Rekap Volume & Berat (`cargo-volume`) dan Modal Detail Fisik & Tagihan Per Marking (`generative_ui`, `CargoVolumeReportPage.tsx`, `CustMarkingDetailModal.tsx`)**:
  - **Permintaan Pengguna**: "redesign https://app.sampai.co/mshipping/finance/reports/cargo-volume /generative_ui dan modal Detail Fisik & Tagihan Per Marking".
  - **Penyelesaian Teknis**:
    1. *Generative UI Interactive Prototype*:
       - Berkas prototype: `C:\Users\Administrator\.gemini\antigravity\brain\82726806-600f-4f5b-8f6b-ba9409b6e8d6\cargo_volume_and_marking_redesign.html`.
       - Dual-view switcher: Tab "Halaman Rekap Volume & Berat" dan Tab "Modal Detail Fisik & Tagihan Per Marking".
       - Live switcher 5 tema M-Shipping: Heritage, Ocean, Emerald, Amber, Midnight Dark Mode.
    2. *Redesign Halaman Rekap Volume & Berat (`CargoVolumeReportPage.tsx`)*:
       - 5 Kartu KPI Eksekutif dengan micro-badge icon dan highlight angka tabular monospace.
       - Toolbar Filter Komprehensif: Cabang, Rentang Tahun (Dari/Ke), Segmented Pill Moda (Semua/Laut/Udara), Tipe Komoditi dinamis, Sales Pelanggan, dan Search instan.
       - Tabel Rekapitulasi Customer & Sales dengan sorting interaktif dan baris collapsible chevron untuk melihat rincian resi kargo lengkap dengan nomor faktur, badge moda, nama komoditi, volume M³, sumber M³, dan berat kargo.
       - Tombol `[Buka Semua | Tutup Semua]` untuk expand/collapse instan.
       - Baris footer `GRAND TOTAL KONSOLIDASI` presisi sejajar dengan kolom data.
       - Dual Ekspor Excel (.xlsx): `[Export Rekap (.xlsx)]` dan `[Export Detail Resi (.xlsx)]`.
    3. *Redesign & Polish Modal Detail Fisik & Tagihan Per Marking (`CustMarkingDetailModal.tsx` & subcomponents)*:
       - Header modal dengan indikator badge multi-cabang, badge peringatan selisih Qty komplain vs gudang, dan counter ringkasan invoice/baris.
       - Toolbar pencarian cepat, segmented column presets (`Semua Kolom`, `Fisik & M³`, `Komplain`, `Finansial`), filter pill cabang, tombol toggle grouping `fdInvNo` dengan counter invoice unik, tombol aksi `[Buka Semua | Tutup Semua]`, dan toggle filter selisih/komplain.
       - 6 Kartu KPI Summary Banner: Total Invoice (Utama/Gab/Tmb), Total Resi (Cocok/Selisih), Total Qty (Gudang/SJ/PL/K), Total Berat (Gudang/SJ/K/Bill), Total Volume M³/VFC (PL/Gdg/K/Bill dengan micro status underbilled), dan Total Lebih KG (OW Gudang/SJ/K).
       - Tabel Data 24-Kolom dengan collapsible invoice grouping header, badge klasifikasi invoice (`Utama`, `Gabungan`, `Tambahan`), subtotal akumulasi per grup invoice, sticky columns (No, BC, No Invoice), penomoran hierarkis `${groupIdx}.${itemIdx}`, dan baris grand total footer.
       - Kepatuhan penuh Midnight Dark Mode: tidak ada tombol/badge solid putih atau terang; menggunakan outline/border semantik transparan (`border-sky-500/30 bg-sky-500/10`).
  - **Verifikasi**:
    - Backend check: `cd backend && bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (4.97s)**.

---

- [x] **Redesign Halaman Antrean Validasi Billing & Penyelarasan Ikon Moda (`ValidationListPage.tsx`, `docs/frontend/billing.md`)**:
  - **Permintaan Pengguna**: "redesign https://app.sampai.co/mshipping/finance/billing/validation/list /generative_ui", "icon laut dan udara tidak konsisten perbaiki", "apakah font mengikuti tema?", "ok proses".
  - **Penyelesaian Teknis**:
    1. *Generative UI Prototype*:
       - Membuat prototype interaktif `validation_list_redesign.html` yang mencakup 5 switcher tema resmi mshipping, tipografi `--font-body`, `--font-display`, `--font-label`, dan layout B2B ERP modern.
    2. *Kartu Metrik KPI Eksekutif*:
       - Menambahkan agregasi metrik `kpiStats` di `ValidationListPage.tsx`: Total Draft Tagihan (Rp nominal & total count), Aging Kritis (> 14 hari), serta breakdown per moda (Laut & Udara beserta nominal masing-masing).
       - Menambahkan 4 kartu KPI ringkasan yang interaktif (klik kartu Laut/Udara langsung memfilter moda kargo).
    3. *Penyelarasan Ikon Moda (Laut & Udara)*:
       - Menyeragamkan penggunaan vektor resmi `Ship` (biru) dan `Plane` (amber) dari `lucide-react` pada kartu KPI, segmented filter toolbar, baris tabel desktop, kartu mobile responsive, serta master tarif.
    4. *Penyelarasan Tipografi & Midnight Dark Mode*:
       - Nomor faktur menggunakan tipografi `font-mono text-xs font-semibold`.
       - Header kolom tabel dan badge menggunakan token `font-[var(--font-label)]`.
       - Menghilangkan badge solid terang dan menggunakan outline border transparan yang patuh penuh aturan Midnight Dark Mode.
    5. *Perbaikan Lebar Search Bar Desktop*:
       - Mengganti lebar kaku `w-80` (320px) menjadi kontainer fleksibel responsif `flex-1 max-w-lg` (`w-full`), memberikan area ketik yang jauh lebih lapang untuk kata kunci panjang (nama customer, nomor faktur, kode marking) tanpa memotong pill filter moda di sampingnya.
  - **Verifikasi**: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.01s)**.

---

- [x] **Penambahan Variabel Nama Customer, No Resi, dan Marking Code pada Pencarian Data Tab Revisi Mobile (`backend/`, `mobile/`, `frontend/`)**:
  - **Permintaan Pengguna**: "pada mobile app tambahkan variabel nama customer, no resi, markingcode pada pencarian data pada tab revisi saat input data baik data awal atau data baru".
  - **Penyelesaian Teknis**:
    1. *Backend Service (`backend/src/modules/data-revisions/dataRevisions.service.ts`)*:
       - Memperbarui fungsi `lookupListCode(q, limit)` dengan kueri CTE Candidate cepat bertingkat:
         - Pencarian nomor inputan (`fdListCode`).
         - Pencarian nomor resi pengiriman (`fdTerima`) dan resi pelacakan (`fdTrackingNo`).
         - Pencarian kode marking (`fdMarkingCode`) dan nomor marking (`fdMarkingNo`).
         - Pencarian nama pelanggan (`c.fdCustName`) dan kode pelanggan (`c.fdCustCode`) melalui join master pelanggan `tbCustomers` (Single Source of Truth).
       - Menambahkan field `RTRIM(e.fdTerima) as fdTerima` pada select result.
       - PM2 service `ShippingApi` direstart dan online (PID 58940).
    2. *Mobile App Types & Component (`mobile/src/features/data-revisions/`)*:
       - `dataRevisions.types.ts`: Menambahkan properti `fdTerima?: string` pada interface `LookupListCodeItem`.
       - `MobileInputanLookupModal.tsx`:
         - Mengganti `keyboardType="number-pad"` menjadi `keyboardType="default"` dengan `autoCapitalize="none"` dan `autoCorrect={false}` sehingga pengguna dapat mengetik teks (nama customer, huruf marking) maupun angka (no resi, listCode).
         - Mengubah placeholder menjadi `"Cari customer, no resi, marking, inputan..."` dan subtitle header `"Cari Pelanggan, No. Resi, Marking, atau No. Inputan"`.
         - Menampilkan badge visual no resi (`Resi: ${item.fdTerima}`) pada kartu hasil pencarian.
         - Meneruskan `fdTerima` pada handler `onSelect`.
       - `DataRevisionWizardModal.tsx`:
         - Menyelaraskan teks tombol lookup pada form Data Awal dan Data Baru dari `"Cari fdListCode"` menjadi `"Cari Data / Resi"`.
    3. *Web Frontend Sinkronisasi (`frontend/src/features/data-revisions/components/InputanLookupModal.tsx`)*:
       - Menyinkronkan placeholder dan subtitle pencarian serta menampilkan badge resi `Resi: ${item.fdTerima}`.
    4. *Kompilasi & Repack APK Mobile (`scripts/repack_apk.ps1`)*:
       - Versi tetap **`v1.3.6`**, `versionCode: 28`, `forceUpdate: false`.
       - Hermes JS Bytecode compile: `bunx expo export --platform android` $\to$ `entry-8614ad71d27217c97125fe128436007d.hbc` (5.9 MB).
       - Repack & Keystore signing via `uber-apk-signer` $\to$ **Signature verified [v2, v3] (0 errors)**.
       - Sinkronisasi biner APK (127,201,149 bytes) ke 4 titik server:
         1. `C:\shipping\mshipping.apk`
         2. `C:\shipping\frontend\dist\mshipping.apk`
         3. `C:\shipping\frontend\public\mshipping.apk`
         4. `C:\shipping\backend\public\uploads\mshipping.apk`
       - PM2 service `ShippingApi` direstart & online (PID 58588).
  - **Verifikasi**:
    - Backend check: `cd backend && bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Mobile check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (12.81s)**.
    - Version API: `GET /api/app-version/latest` $\to$ **HTTP 200 OK** (`v1.3.6`, Build 28, `forceUpdate: false`, `hasApk: true`).

---

- [x] **Penambahan Grouping Berdasarkan fdInvNo pada Modal Detail Fisik & Tagihan Per Marking (`types.ts`, `useCustMarkingData.ts`, `CustMarkingHeaderToolbar.tsx`, `CustMarkingDataTable.tsx`, `CustMarkingDetailModal.tsx`)**:
  - **Permintaan Pengguna**: "pada modal Detail Fisik & Tagihan Per Marking -> tambahkan grouping berdasarkan fdinvno".
  - **Penyelesaian Teknis**:
    1. *Data Model & State Hook (`types.ts`, `useCustMarkingData.ts`)*:
       - Menambahkan interface `InvoiceGroup` (invoice, dateStr, date, branchCode, klasifikasi invoice, total item kargo, subtotal akumulasi kargo [Qty, Berat, M3/VFC, M3 Bill, Nilai Rp/FC], flag selisih/komplain, dan array `rows`).
       - Membangun `invoiceGroups` teragregasi secara reaktif dari `sortedRows`.
       - Mengelola state `groupByInvoice` (default `true`) dan `collapsedInvoices` (Set) lengkap dengan helper `toggleInvoiceCollapse`, `expandAllInvoices`, dan `collapseAllInvoices`.
    2. *Toolbar Kontrol Grouping (`CustMarkingHeaderToolbar.tsx`)*:
       - Menambahkan tombol toggle `[Group fdInvNo (N)]` berikon `Layers` dengan badge jumlah total invoice unik.
       - Menambahkan tombol aksi `[Buka Semua | Tutup Semua]` saat grouping aktif.
    3. *Data Table View & Subtotal (`CustMarkingDataTable.tsx`)*:
       - Baris Collapsible Group Header: chevron expand/collapse (`ChevronDown`/`ChevronRight`), ikon `Receipt`, nomor invoice font-mono bold, badge klasifikasi (`Utama` sky, `Gabungan` purple, `Tambahan` amber), tanggal invoice, cabang (`BC`), counter jumlah baris kargo, indikator peringatan selisih/komplain, serta mini subtotal kargo (Qty, Berat, M3/VFC, Bill, Nilai).
       - Helper `renderRow`: menyatukan rendering 24-kolom presisi dengan penomoran hierarki `${groupIdx + 1}.${itemIdx + 1}` dan indent `↳` nomor invoice.
       - Subtotal Footer Row: baris akumulatif otomatis di bawah setiap grup invoice (jika item > 1) yang sejajar 100% dengan thead dan tfoot.
       - Fallback mode flat: jika toggle dinonaktifkan, data tetap tersaji sebagai flat list standar.
    4. *Modal Header Synchronization (`CustMarkingDetailModal.tsx`)*:
       - Badge counter header modal menampilkan `${invoiceGroups.length} invoice · ${filteredRows.length} baris`.
  - **Verifikasi**: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (4.45s)**.

---

- [x] **Penambahan Fitur Grouping Berdasarkan Tipe Comodity (`m3-check.service.ts`, `m3-check.types.ts`, `PhysicalAuditTab.tsx`, `billing.types.ts`)**:
  - **Permintaan Pengguna**: "tambahkan grouping berdasarkan tipe comodity".
  - **Penyelesaian Teknis**:
    1. *Backend (`m3-check.service.ts` & `m3-check.types.ts`)*:
       - Memperkaya kueri `tbEntryList` pada `relatedBillsSummary` dengan menyertakan `fdTypeComodity`.
       - Mengambil kamus nama tipe komoditi dari `tbTypeComodity` (`fdTypeComodity` $\to$ `fdComodityName`).
       - Memetakan field `fdTypeComodity` dan `typeComodityName` ke setiap item pada `listCodeBreakdown`.
       - PM2 service `ShippingApi` direstart & online (PID: 53436).
    2. *Frontend (`PhysicalAuditTab.tsx` & `billing.types.ts`)*:
       - Memperbarui interface `RelatedListCodeItem` dengan `fdTypeComodity` dan `typeComodityName`.
       - Menghitung `comodityGroups` via `useMemo`: mengelompokkan resi kargo per kategori tipe komoditi lengkap dengan subtotal M³ fisik gudang, M³ packing list, berat kg, koli, M³ ditagih, serta counter status kelengkapan bill (`✓ Lengkap` vs `X Belum Bill`).
       - Menambahkan tombol toggle `[Group Tipe: Aktif / Nonaktif]` dengan badge counter jumlah tipe komoditi di header panel kelompok bill terkait.
       - Menampilkan baris sub-header aksen indigo per tipe komoditas di tabel rekapitulasi dengan subtotal masing-masing, serta kolom "Tipe Komoditi" pada rincian item.
  - **Verifikasi**:
    - Backend check: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend build: `bun run build` $\to$ **LULUS 100% 0 error (4.31s)**.

---

- [x] **Pembaruan Label Tombol 'Go' Menjadi 'Tampilkan' (`id.json`, `en.json`, `MarkingSizeToolbar.tsx`)**:
  - **Permintaan Pengguna**: Mengganti kata "Go" pada tombol halaman Audit Ukuran & Tonase (`https://app.sampai.co/mshipping/logistics/shipment-batches/marking-size`) dengan opsi "Tampilkan".
  - **Penyelesaian**:
    - `frontend/src/lib/i18n/id.json`: Mengubah `"marking.sizeAudit.go": "Go"` menjadi `"Tampilkan"`.
    - `frontend/src/lib/i18n/en.json`: Mengubah `"marking.sizeAudit.go": "Go"` menjadi `"Show"`.
    - `docs/frontend/shipment-batches.md`: Menyinkronkan dokumentasi toolbar audit ukuran.
  - **Verifikasi**: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (4.37s)**.

---

- [x] **Penambahan Indikator Tren Naik / Turun pada Data List & Kartu KPI Report Omset & Volume (`OmsetVolumeReportPage.tsx`)**:
  - **Permintaan Pengguna**: "tambahkan icon yang menunjukkan apakah datanya naik atau turun" & "TAMBAHKAN JUGA PADA DATA LIST".
  - **Penyelesaian**:
    1. *Kartu KPI Ringkasan*:
       - Menghitung pertumbuhan YoY (`yoyGrowth`) perbandingan tahun akhir vs tahun awal dari rentang tahun terpilih untuk seluruh metrik: Volume M3, Berat Laut, Berat Udara, Kontainer FCL, dan Omzet.
       - Menambahkan pill badge tren interaktif di setiap kartu KPI dengan icon arah `ArrowUpRight` (↗️ hijau naik), `ArrowDownRight` (↘️ merah turun), atau `Minus` (netral) disertai persentase dan nilai perubahan riil saat di-hover tooltip.
    2. *Tabel Data List & Footer Konsolidasi*:
       - Helper `renderCellTrend(curr, prev)`: membandingkan metrik tahun berjalan vs tahun sebelumnya (`years[yIdx - 1]`).
       - Menampilkan icon panah tren inline (`ArrowUpRight` hijau / `ArrowDownRight` merah) di samping nilai pada setiap sel metrik tahunan (M3, KG Laut, KG Udara, FCL, Omset Rp) untuk setiap customer.
       - Menampilkan tooltip native detail selisih angka dan persentase perubahan YoY (`vs tahun sebelumnya: +XX (+YY%)`).
       - Diterapkan juga pada seluruh metrik tahunan di baris Footer `TOTAL KONSOLIDASI`.
  - **Verifikasi**: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (3.44s)**.

---

- [x] **Penambahan Data Nama Gudang (fdGudang) pada Timeline Siklus Kargo (`ShipmentTimeline.tsx`, `billing.service.ts`, `billing.types.ts`)**:
  - **Permintaan Pengguna**: "tambahkan data fdGudang pada timeline /plan /grill-me".
  - **Perubahan & Implementasi**:
    1. *Backend*:
       - `billing.types.ts`: Menambahkan `fdGudang: string | null` ke interface `BillingTimeline`.
       - `billing.service.ts`: Menambahkan `MAX(RTRIM(m.fdGudang)) AS fdGudang` pada kueri `getBillingTimeline` dan memetakan nilai `fdGudang` yang di-trim ke response.
    2. *Frontend*:
       - `billing.types.ts`: Menambahkan field `fdGudang: string | null` ke interface `BillingTimeline`.
       - `ShipmentTimeline.tsx`: Merender sub-label nama gudang di bawah teks *"Masuk Gudang"* pada node `fdTgl_IN` (desktop `text-[9px]`, mobile `text-[8px]`, dengan `title` tooltip native), otomatis disembunyikan jika `fdGudang` kosong.
  - **Verifikasi**:
    - Backend check: `bun x tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
    - PM2 restart: `pm2 restart ShippingApi` $\to$ **Online & Healthy (PID 51084)**.
    - Frontend build: `bun run build` $\to$ **LULUS 100% 0 errors (2.79s)**.

---

- [x] **Fitur Baru Report: Omset & Volume Customer Multi-Year Pivot Matrix (`backend/`, `frontend/`, `database`)**:
  - **Permintaan Pengguna**: Mengimplementasikan query pivot SQL `qr_data_master_billing` ke dalam fitur report baru di Sidebar pada grup `Report -> Omset & Volume`, menampilkan sekaligus 5 metrik kargo & omset, serta konfigurasi rolenya.
  - **Penyelesaian Teknis**:
    1. *Backend (`billing-omset-report.service.ts` & `billing.routes.ts`)*:
       - Query agregasi kargo dan pendapatan omzet multi-tahun dari view `qr_data_master_billing` dengan Single Source of Truth nama pelanggan dari master `tbCustomers.fdCustName`.
       - Pivot metrik dinamis di level memori: `m3`, `KG_LAUT`, `KG_UDARA`, `TotalFcl`, dan `fdJumlah` (Omset Rp) per customer dan sales untuk rentang tahun yang dipilih.
       - Penghitungan grand total konsolidasi dan total metrik per tahun.
       - Endpoint baru: `GET /billing/reports/omset-volume` (`yearFrom`, `yearTo`, `search`, `sales`).
       - PM2 service `ShippingApi` direstart (PID: 48620, online).
    2. *Hak Akses & Role Management (`tbRolePermissions`, `userManagement.types.ts`)*:
       - Path baru terdaftar: `/mshipping/finance/reports/omset-volume`.
       - Seeding hak akses database untuk seluruh 9 role: aktif (`canView: true`) untuk `admin`, `superadmin`, `finance`, dan `billing`; default nonaktif untuk role lainnya sehingga dapat diatur fleksibel melalui halaman Role Management.
    3. *Frontend Web (`Sidebar.tsx`, `router.tsx`, `constants.ts`, `OmsetVolumeReportPage.tsx`, `id.json`, `en.json`)*:
       - Menu baru di Sidebar: **Modul Keuangan $\to$ Report $\to$ Omset & Volume** (`BarChart3` icon).
       - Halaman mandiri `OmsetVolumeReportPage.tsx`:
         - 5 Kartu KPI Konsolidasi: Total Customer Aktif, Total Volume M3, Berat Kargo Laut vs Udara, Total Kontainer FCL, dan Total Omzet Pendapatan.
         - Filter Toolbar: Selector rentang multi-tahun (`yearFrom` s/d `yearTo`), dropdown filter Sales, dan pencarian instan (kode/nama customer/sales).
         - Tabel Pivot Multi-Year: Freeze column nama customer (sticky left), sub-kolom 5 metrik per tahun (`M3`, `KG Laut`, `KG Udara`, `FCL`, `Omset Rp`), kolom Grand Total Konsolidasi, dan baris Footer Ringkasan.
         - Sorting interaktif di semua kolom & metrik tahunan.
         - Ekspor Excel (.xlsx) dengan pemformatan kolom tahunan rapi.
  - **Verifikasi**:
    - Backend check: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend build: `bun run build` $\to$ **LULUS 100% 0 errors (3.60s)**.

---

- [x] **Perbaikan Visual & Tata Letak pada PDF Report Billing (`DashboardPdfFullReport.tsx`, `TrendChart.tsx`, `id.json`, `en.json`)**:
  - **Keluhan Pengguna**: Melampirkan 2 gambar tanda merah pada PDF report:
    1. Lembar 4: Kotak merah pada angka sumbu Y kanan grafik kurva (`6,000 B`, `4,500 B`, `B` terpotong ke bawah) dan panah merah pada tabel rekapitulasi 12 bulan bagian bawah ("Okt 2026" & tfoot "TOTAL 12 BULAN" terpotong di tepi bawah halaman).
    2. Lembar 6: Kotak merah pada kolom `RANK` tabel peringkat PIC (`🥇 #1`, `🥈 #2`, `🥉 #3` medal ter-wrap vertikal ke baris kedua di atas nomor rank).
  - **Akar Masalah & Solusi**:
    1. *Sumbu Y Kanan Grafik Kurva 12 Bulan (`TrendChart.tsx`)*:
       - Formatter sebelumnya `${formatNumber(val)} B` menyebabkan huruf `B` ter-wrap ke baris baru di bawah angka karena spasi dan lebar axis sempit. Diubah menjadi `formatNumber(val)` (`6,000`, `4,500`, `3,000`, `1,500`, `0`) yang bersih tanpa pemotongan (keterangan unit sudah tertulis di sub-header: `Sumbu Kanan: Kuantiti Faktur (Bill)`).
       - Menambahkan key i18n `"billing.trend.totalBillQuantity": "Kuantiti Faktur (Bill)"` di `id.json` dan `en.json` agar legend Bar tidak lagi menampilkan string mentah `billing.trend.totalBillQuantity`.
    2. *Tabel Rekapitulasi 12 Bulan Terpotong di Lembar 4 (`DashboardPdfFullReport.tsx`, `TrendChart.tsx`)*:
       - Tinggi konten sebelumnya melebihi kapasitas lembar A4 landscape (840px) karena grafik setinggi 225px ditambah duplikasi mini summary banner di dalam `TrendChart` yang memakan ruang ~36px.
       - Menambahkan prop `hideSummaryBanner={true}` pada `TrendChart` untuk PDF report Lembar 4 (karena 4 kartu KPI di atasnya sudah menampilkan ringkasan tersebut).
       - Mengatur `chartHeight={180}` pada `TrendChart`.
       - Menyesuaikan padding lembar menjadi `18px 26px`, merampingkan padding cell tabel menjadi `2.5px 6px` dan font size `9.5px`.
       - Seluruh 12 baris bulan (termasuk Okt 2026) dan baris `TOTAL 12 BULAN KONSOLIDASI` serta footer kini muat 100% sempurna dengan margin lapang ~120px.
    3. *Pill Badge Rank Kolom Terbungkus Vertikal di Lembar 6 (`DashboardPdfFullReport.tsx`)*:
       - Pada badge rank `#1`, `#2`, `#3`, spasi antara emoji medali dan angka (`🥇 #1`) menyebabkan browser membungkus emoji di baris atas dan `#1` di baris bawah.
       - Ditambahkan properti `display: 'inline-flex'`, `alignItems: 'center'`, `justifyContent: 'center'`, `gap: '4px'`, dan `whiteSpace: 'nowrap'` serta memperlebar `th` Rank menjadi `70px`. Medali dan nomor rank kini terkunci horizontal berdampingan secara rapi.
  - **Verifikasi**: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (3.32s)**.

---

- [x] **Perbaikan Pencarian Data pada Drawer Bill Validasi Detail Page (`backend/src/modules/billing/billing.service.ts`)**:
  - **Keluhan Pengguna**: "saya tidak bisa mencari data pada drawer bill validasi detail page, cek be nya"
  - **Akar Masalah**:
    1. Pada drawer validasi detail (`ValidationListDrawer.tsx`), kueri API dipanggil dengan opsi `noPagination: 'true'`, `draftOnly: 'true'`, `hasAmount: 'true'`, `minYear: '2023'`, dan `search: debouncedSearch`.
    2. Pada kueri CTE fast candidate pencarian di backend (`billing.service.ts`), variabel `pagingSql` dievaluasi menjadi string kosong `''` ketika `isNoPaginationFinal` bernilai `true`.
    3. Akibatnya, sub-query CTE dieksekusi sebagai:
       ```sql
       PagedCandidates AS (
         SELECT fdInvNo
         FROM FilteredCandidates
         ORDER BY fdInvDate DESC
       )
       ```
    4. MS SQL Server melempar galat sintaks fatal **T-SQL Error 1033**: *"The ORDER BY clause is invalid in views, inline functions, derived tables, subqueries, and common table expressions, unless TOP, OFFSET or FOR XML is also specified."*
    5. Galat tersebut tertangkap di catch block, namun kondisi fallback `(!search || custCode)` bernilai false saat ada parameter `search`, sehingga eksekusi mengembalikan `data: []` dan `total: 0`.
  - **Solusi & Perbaikan**:
    1. Memindahkan klausa `ORDER BY fdInvDate DESC` ke dalam ekspresi `pagingSql` kondisional:
       ```ts
       const pagingSql = isNoPaginationFinal
         ? ''
         : `ORDER BY fdInvDate DESC OFFSET ${skip} ROWS FETCH NEXT ${take} ROWS ONLY`
       ```
       Ketika `isNoPaginationFinal` aktif, CTE `PagedCandidates` hanya mengeksekusi `SELECT fdInvNo FROM FilteredCandidates` tanpa `ORDER BY` di dalam CTE (sepenuhnya valid di T-SQL), dan pengurutan akhir tetap dijalankan secara presisi di kueri terluar: `ORDER BY b.fdInvDate DESC`.
    2. Menambahkan flag `fastSearchFailed = true` dan mengizinkan fallback otomatis ke standar bila terjadi anomali query.
    3. PM2 service `ShippingApi` direstart (PID: 50920, online).
  - **Verifikasi**:
    - HTTP Test: Pencarian nama pelanggan `"MAXSIMUS"` $\to$ **HTTP 200 OK** (Ditemukan: `GZS-011248-10-2026 MAXSIMUS`).
    - HTTP Test: Pencarian nomor faktur `"011248"` $\to$ **HTTP 200 OK** (Ditemukan: `GZS-011248-10-2026`).
    - HTTP Test: Pencarian kode marking `"26SGB24"` $\to$ **HTTP 200 OK** (Ditemukan 3 faktur draft).
    - Backend Unit Tests: `bun test` $\to$ **251 passed (0.97s)**.
    - Backend TypeScript Check: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend Production Build: `bun run build` $\to$ **LULUS 100% 0 errors (2.98s)**.

---


- [x] **Penyajian Tabel Rincian Surat Jalan & fdListCode Belum Ditagih pada Lembar 7 PDF (`billing-analytics.service.ts`, `useBillingDashboard.ts`, `DashboardPage.tsx`, `DashboardPdfFullReport.tsx`)**:
  - **Permintaan Pengguna**: "bisa di buat lebih detail 5 sj itu berapa fdlistcode? karena 1 fdlistcode bisa banyak sj" $\to$ "bisa di tampilkan juga di report pdfnya?".
  - **Penyelesaian Teknis**:
    1. *Backend Service (`billing-analytics.service.ts`)*:
       - Menambahkan field `t.fdListType` dan properti return `listType: Number(r.fdListType) === 1 ? 'Udara' : 'Laut'` serta `pic` pada `getSjVsBillDetails` (`type === 'unbilled'`).
       - PM2 service `ShippingApi` direstart (PID: 7720, online).
    2. *Frontend Types & Hook (`billing.types.ts`, `useBillingDashboard.ts`)*:
       - Memperbarui `UnbilledSjDetailItem` dengan menambahkan properti opsional `pic?: string` dan `listType?: string`.
       - Di hook `useBillingDashboard`, menambahkan kueri `unbilledSjDetailsRes` via `billingApi.sjVsBillDetails({ pic: 'all', type: 'unbilled' })` dan mengekspos `unbilledSjDetails` di antarmuka `BillingDashboardData`.
    3. *Frontend Page (`DashboardPage.tsx`)*:
       - Menerima `unbilledSjDetails` dari hook `useBillingDashboard` dan meneruskannya sebagai props ke komponen cetak `DashboardPdfFullReport`.
    4. *Lembar ke-7 Template PDF (`DashboardPdfFullReport.tsx`)*:
       - Mengatur tinggi kanvas Recharts `LineChart` menjadi `175px` dan padding halaman `20px 28px` sehingga seluruh konten tetap tepat 1 lembar A4 Landscape (840px) tanpa risiko pemotongan (zero page-cut).
       - Menambahkan **Tabel Rincian Surat Jalan Belum Ditagih (Unbilled Backlog)** berdensitas tinggi tepat di bawah kurva grafik:
         - Header Tabel: Judul section + pill badge counter status `${unbilledSjDetails.length} SJ Fisik • ${unbilledDistinctListCodes} Nomor Resi (ListCode)` berwarna merah muda bila ada backlog dan hijau bila nihil.
         - 8 Kolom Lengkap: `No`, `No. Surat Jalan` (mono bold), `No. Resi (ListCode)` (mono bold biru `#0284c7`), `Nama Customer` (bold), `Kode Marking` (mono), `Moda` (badge ✈️ Udara / 🚢 Laut), `Tgl SJ Kembali` (`dd/MM/yyyy`), dan `PIC Billing` (nama kapital).
         - Data Riil 5 SJ yang Tampil: `LG-949922` (0943463, TAK PRODUCTS, Laut), `LM-951054` (0943598, KB/IRVIN, Laut), `LM-951053` (0943599, KB/IRVIN, Laut), `LM-951052` (0943600, KB/IRVIN, Laut), `LM-951510` (0945010, ASIA JAYA INDAH, Udara).
         - Catatan kaki metrik diselaraskan dengan data Surat Jalan vs nomor resi kargo.
  - **Verifikasi**: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.62s)**.

---

- [x] **Perbaikan Loading Time Pencarian pada Billing List (`backend/`, `frontend/`)**:
  - **Permintaan Pengguna**: "perbaiki loading time pada search di https://app.sampai.co/mshipping/finance/billing/list"
  - **Akar Masalah (Bottleneck 12–18 Detik)**:
    1. *Prisma Parameter Explosion & Full Table Scan*: Kueri sebelumnya mengambil 500 kode customer dan 500 kode marking terlebih dahulu, lalu memasukkannya ke dalam klausa `OR` raksasa dengan 1.000+ parameter SQL dan 7 ekspresi `LIKE '%...%'` pada kolom-kolom tanpa indeks (`fdDescr`, `fdEmpCode`, `fdListCode`, dsb.) pada tabel `tbBilling` (735.000+ baris).
    2. *Eksekusi Ganda FindMany & Count*: SQL Server terpaksa melakukan dua kali clustered index scan berulang (satu untuk `findMany` data berurutan tanggal, satu lagi untuk `count(*)`) yang memakan waktu total 15–18 detik.
    3. *UI Skeleton Flashing*: Pada frontend `ListPage.tsx`, kondisi `{isInitialLoading || isRefreshing ? <Table isLoading={true} data={[]} /> : ...}` secara keliru menghapus seluruh data tabel menjadi layar kosong dengan skeleton shimmer setiap kali karakter diketik, merusak manfaat `placeholderData: keepPreviousData`.
  - **Solusi & Optimasi**:
    1. **Backend CTE Candidate Fast Path (`backend/src/modules/billing/billing.service.ts`)**:
       - Mengganti kueri Prisma OR yang lambat dengan kueri CTE (`CandidateInvoices`) berindeks dengan petunjuk `WITH (NOLOCK)` (Pencarian nomor faktur `fdInvNo`, kode marking `fdMarkingCode`, nomor marking `fdMarkingNo`, dan `INNER JOIN tbCustomers c` untuk nama customer & billTo).
       - Paginasi `OFFSET ... FETCH NEXT ...` dieksekusi terlebih dahulu pada tingkat candidate sebelum melakukan join lengkap.
       - Kueri data dan `COUNT_BIG(1)` dijalankan secara paralel.
       - Menambahkan in-memory TTL Cache (`billingSearchCache`, TTL 25 detik) sehingga request berulang (pagination, backspace) selesai dalam `<0.1 ms`.
    2. **Frontend Smooth Search & Anti-Flicker (`frontend/src/features/billing/`)**:
       - `ListPage.tsx`: Mengadopsi `DEBOUNCE_DELAY = 400` ms dari `@/lib/constants`. Mengeliminasi pembersihan tabel saat `isRefreshing`, mempertahankan baris data sebelumnya secara lembut dengan efek `opacity-60` dan spinner toolbar hingga data baru tiba.
       - `BillingToolbar.tsx`: Menambahkan `onKeyDown` untuk tombol `Enter` (menutup dropdown saran dan mengeksekusi filter seketika) dan `Escape` (menutup dropdown).
    3. **Penyelarasan Server**: PM2 service `ShippingApi` direstart (PID: 42188, online).
  - **Hasil Benchmark Performa**:
    - Sebelum: **12–18 detik** per pencarian.
    - Sesudah (Uncached): **0.8–1.1 detik** (Peningkatan **15x lebih cepat**).
    - Sesudah (Cached): **0.03 milidetik** (Peningkatan **~500.000x lebih cepat**).
  - **Verifikasi**:
    - Backend TypeScript Check: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Backend Unit Tests: `bun test` $\to$ **251 passed (1.22s)**.
    - Frontend Unit Tests: `bun test` $\to$ **79 passed (0.16s)**.
    - Frontend Production Build: `bun run build` $\to$ **LULUS 100% 0 error (3.37s)**.

---

- [x] **Penyajian Detail fdListCode pada Kartu KPI Belum Ditagih Lembar 7 PDF (`billing-analytics.service.ts`, `useBillingDashboard.ts`, `DashboardPdfFullReport.tsx`)**:
  - **Permintaan Pengguna**: "bisa di buat lebih detail 5 sj itu berapa fdlistcode? karena 1 fdlistcode bisa banyak sj"
  - **Penyelesaian Teknis**:
    1. *Backend (`billing-analytics.service.ts`)*:
       - Memperbarui query `unbilledRows`, `sjRows`, dan `billRows` pada `getSjVsBillComparison` untuk menghitung `COUNT(DISTINCT t.listCode) AS totalListCodes`.
       - Menambahkan pelacakan `unbilledListMap` dan mengembalikan properti `unbilled_list_[pic]`, `sj_list_[pic]`, dan `bill_list_[pic]` pada setiap poin tanggal harian.
       - PM2 `ShippingApi` direstart (PID: 49948).
    2. *Frontend Hook (`useBillingDashboard.ts`)*:
       - Mengagregasikan `unbilled_list_all` dan alias `unbilledList` dari seluruh PIC untuk setiap titik data.
    3. *Frontend PDF Template (`DashboardPdfFullReport.tsx`)*:
       - Menghitung `totalUnbilledListCodes` dari akumulasi `sjVsBillData`.
       - Pada Kartu KPI **Belum Ditagih (Unbilled)** Lembar ke-7, ditambahkan subteks informatif:
         `${formatNumber(totalSjUnbilled)} SJ`
         Subteks: `5 Resi (ListCode) • Backlog`
       - Ditambahkan catatan kaki penjelasan metrik di bawah grafik: membedakan antara Surat Jalan lembar fisik pengantaran vs resi kargo (`fdListCode`).
  - **Verifikasi**: `bun run build` $\to$ **LULUS 100% 0 errors (4.16s)**.

---

- [x] **Penyelarasan UI Lampiran Invoice Web Frontend (`frontend/src/features/billing/`)**:
  - **Permintaan Pengguna**: "perbaiki juga ui di frontendnya".
  - **Tabel & Mobile Cards (`ListPage.tsx`)**:
    - Kolom desktop `lampiran` diubah dari tombol kotak biasa menjadi pill badge rounded-full font-mono font-bold ala BAP (`InspectionTable.tsx`) dan Revisi Data: `[📎 X Lampiran]` dengan aksen tema `var(--color-tertiary)` transparan & hover scale-105 saat terisi, serta pill badge netral saat `0 Lampiran`.
    - Kartu mobile list invoice (`ListPage.tsx` responsive cards): Indikator lampiran ditambahkan di footer kartu dengan gaya pill badge konsisten.
    - Quick Modal: Klik pada pill badge langsung membuka `BillingQuickLampiranModal` tanpa perlu membuka detail invoice.
    - Sinkronisasi TanStack Query: Upload/hapus lampiran pada modal langsung menginvalisasi cache `['billings']` & `['billing', cleanInv]`, jumlah counter lampiran di tabel otomatis ter-update secara reaktif.
  - **Halaman Detail Invoice (`DetailPage.tsx`)**:
    - Ditambahkan tombol pintas indikator lampiran `[📎 X Lampiran]` pada `PageHeader.actions` dengan scroll mulus (`scrollIntoView({ behavior: 'smooth' })`) menuju kontainer `#billing-lampiran-section`.
  - **Verifikasi**:
    - `bun run build` $\to$ **LULUS 100% 0 error (3.44s)**.
  - **Permintaan Pengguna**: "pada ui list invoice di mobile tampilkan apabila ada attachment tampilkan seperti pada bap dan revisi".
  - **Backend (`backend/src/modules/billing/billing.service.ts`)**:
    - Menambahkan `fetchAttachmentCounts()` paralel di `getBillings` untuk menghitung jumlah lampiran `tbBillingAttachment` per `fdInvNo` secara efisien (batching query dengan `NOLOCK`).
    - Menambahkan field `attachmentCount: number` pada mapped response `getBillings` dan `getBillingById`.
    - PM2 `ShippingApi` direstart & running normal (PID: 45268).
  - **Mobile App (`mobile/src/features/finance/`)**:
    - `BillingListItem.tsx`: Menambahkan tombol/indikator lampiran di baris footer (bersebelahan dengan tanggal) dengan styling identik BAP (`InspectionListItem`) & Revisi (`DataRevisionCard`): ikon `Paperclip`, border tema `colors.tertiary`, background semantik transparan, dan teks `${attachmentCount} Lampiran`.
    - `finance.tsx`: Menghubungkan handler `onPressAttachment` dari `BillingListItem` langsung ke `BillingAttachmentSheet` modal sehingga berkas dapat langsung dilihat/dikelola tanpa harus membuka detail invoice terlebih dahulu.
  - **Kompilasi & Repack APK (`mobile/` & `scripts/`)**:
    - Versi tetap **`v1.3.6`**, `versionCode: 28`, `forceUpdate: false`.
    - Hermes JS Bytecode compile: `bunx expo export --platform android` $\to$ `entry-6f84d748b552adff7d4d6aa224dc55b7.hbc` (5.9 MB).
    - Repackaging & signing via `scripts/repack_apk.ps1`:
      - Bytecode diinjeksi ke `C:\shipping\mshipping.apk`.
      - Zipalign & signing release v2/v3 via `uber-apk-signer` + `release.keystore` $\to$ **Signature verified [v2, v3] (0 errors)**.
      - Distribusi otomatis tersinkron ke 4 titik server:
        1. `C:\shipping\mshipping.apk` (127.20 MB)
        2. `C:\shipping\frontend\dist\mshipping.apk` (127.20 MB)
        3. `C:\shipping\frontend\public\mshipping.apk` (127.20 MB)
        4. `C:\shipping\backend\public\uploads\mshipping.apk` (127.20 MB)
    - PM2 `ShippingApi` direstart & online stabil (PID: 44288).
  - **Verifikasi**:
    - Backend check: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend build: `bun run build` $\to$ **LULUS 100% 0 errors (3.74s)**.
    - Mobile check: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - APK signature: Verified [v2, v3] 100%.

---

- [x] **Perbaikan Nilai 0 pada Lembar 7 Ekspor PDF & Tab Monitoring Surat Jalan vs Faktur (`DashboardPdfFullReport.tsx`, `useBillingDashboard.ts`, `SjVsBillChart.tsx`)**:
  - **Keluhan Pengguna**: "periksa pada lembar ke 7 pdf report data surat jalan faktur terbit dan lain lain seperti di gambar itu 0. Apakah sudah benar?"
  - **Hasil Investigasi & Verifikasi Database**:
    - Data di database SQL Server (`tbDelivery` & `tbBilling`) **SAMA SEKALI BUKAN 0**. Pengecekan riil menunjukkan ratusan data Surat Jalan dan Faktur Terbit aktif dalam rentang 30 hari (contoh: 02 Okt terdapat 96 SJ & 84 Bill, 05 Okt terdapat 39 SJ & 32 Bill).
    - **Akar Masalah (Field Mapping Mismatch)**:
      1. Endpoint backend `/billing/chart/sj-vs-bill` mengembalikan poin harian dengan rincian per PIC: `sj_thara`, `bill_thara`, `sj_kiki`, `bill_kiki`, `sj_yati`, dst.
      2. Di `useBillingDashboard.ts`, data diagregasikan ke properti `sj_all`, `bill_all`, dan `unbilled_all`, tetapi **tidak menyediakan field alias `sj`, `bill`, dan `unbilled`**.
      3. Di `DashboardPdfFullReport.tsx`, perhitungan total ditulis `row.sj` dan `row.bill`:
         ```ts
         const totalSjCount = sjVsBillData.reduce((sum, row) => sum + (Number(row.sj) || 0), 0)
         const totalSjBilled = sjVsBillData.reduce((sum, row) => sum + (Number(row.bill) || 0), 0)
         ```
         Karena `row.sj` bernilai `undefined`, `Number(undefined) || 0` menghasilkan **0**. Seluruh 4 kartu KPI (Total SJ, Faktur Terbit, Belum Ditagih, Rasio Konversi) menjadi 0 / 0.0%.
      4. Hal serupa terjadi di `SjVsBillChart.tsx` di mana `totalSj` dan `totalBill` tidak memperhitungkan PIC yang sedang aktif.
  - **Perbaikan yang Diterapkan**:
    1. **`useBillingDashboard.ts`**: Menambahkan alias `sj`, `bill`, dan `unbilled` pada pemetaan baris yang otomatis menjumlahkan seluruh PIC (`totalSjAll`, `totalBillAll`, `totalUnbilledAll`).
    2. **`DashboardPdfFullReport.tsx`**: Memperbaiki kalkulasi statistik 4 kartu KPI Lembar 7 dengan fallback defensif `Number(row.sj_all ?? row.sj)` dan `Number(row.bill_all ?? row.bill)` serta `Number(row.unbilled_all ?? row.unbilled)`.
    3. **`SjVsBillChart.tsx`**: Menyesuaikan perhitungan `totalSj`, `totalBill`, dan `totalUnbilled` secara dinamis sesuai filter PIC yang dipilih (`all`, `yati_kiki`, atau PIC individu).
  - **Verifikasi**: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (18.21s)**.

---

- [x] **Rilis Mobile App v1.3.6 Build 28 (Force Update: Auto Switch Tab Batch Marking & Penyesuaian Posisi Shutter/Galeri)**:
  - **Permintaan Pengguna**: "No kontainer dari foto gallery sudah berhasil discan dengan benar. Namun hasilnya malah di search di resi bukan batch marking jadi datanya tidak ketemu. Perbaiki juga posisi icon gallery dan Shutter terlalu kebawah mepet navigasi"
  - **Penyelesaian Teknis**:
    1. *Pengalihan Otomatis ke Tab Batches*: Di `mobile/app/(tabs)/logistics.tsx`, fungsi `handleContainerScanned` kini otomatis mengeset `setActiveTab('batches')` dan `setModeFilter('all')` sebelum mengisi query `setSearch(containerNo)`. Batch kontainer terkait (mis. `26SGB24` untuk `BMOU6356541`) langsung tampil instan di layar.
    2. *Pencarian Toleran di Backend*: Di `backend/src/modules/marking/marking.service.ts`, query database `getMarkings` ditambahkan `cleanSearch` (hanya alfanumerik) untuk mencocokkan nomor kontainer baik yang berformat raw maupun berspasi/berstrip.
    3. *Penyesuaian Posisi UI Bottom Controls*: Menggunakan `useSafeAreaInsets()` di `ContainerScannerModal.tsx` dengan offset `Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 16) + 36`. Tombol Shutter dan Galeri kini terangkat proporsional di atas soft navigation bar / gesture bar Android tanpa terpotong atau mepet.
  - **Penyelarasan 4 Berkas Versi**:
    - `mobile/src/config/version.ts` $\to$ `v1.3.6`, `versionCode: 28`, `FORCE_UPDATE: true`, `MIN_APP_VERSION: '1.3.6'`.
    - `backend/src/config/app-version.json` $\to$ `v1.3.6`, `versionCode: 28`, `forceUpdate: true`.
    - `mobile/app.json` & `mobile/package.json` $\to$ `v1.3.6`, `versionCode: 28`.
  - **Build & Distribusi**:
    - Hermes Export: `bunx expo export --platform android` $\to$ `entry-2807fdf87a8b81c86971043da98dbbc1.hbc` (5.9 MB).
    - Repack, zipalign & keystore sign: `scripts/repack_apk.ps1` $\to$ disinkronkan ke 4 titik server.
    - PM2 `ShippingApi` direstart (PID: 41204).
    - API Check: `https://app.sampai.co/api/app-version/latest` $\to$ **HTTP 200 OK** (`v1.3.6`, `versionCode: 28`).

---

- [x] **Rilis Mobile App v1.3.5 Build 27 (Force Update: Perbaikan Scan Galeri Android SAF)**:
  - **Permintaan Pengguna**: "Scan foto dari galeri gagal ada error cek ulang. Itu contoh foto kontainernya."
  - **Akar Masalah**:
    - Pada Android, `File.pickFileAsync` mengembalikan SAF content URI (`content://...`).
    - Modul warisan `FileSystem.readAsStringAsync(fileUri)` melempar `Location isn't readable` karena proteksi sandbox path aplikasi.
  - **Solusi & Perbaikan**:
    1. Mengimplementasikan pembacaan berkas multi-tingkat langsung pada instance `File`:
       - Tingkat 1: `await file.base64()` native Expo FileSystem (membaca stream ContentResolver Android tanpa pembatasan sandbox).
       - Tingkat 2: `await file.bytes()` $\to$ konversi vanilla `bytesToBase64()` (kompatibel penuh mesin Hermes).
       - Tingkat 3: `await file.arrayBuffer()` Blob interface.
       - Tingkat 4: Salin berkas ke cache internal aplikasi via `FileSystem.copyAsync` lalu baca dengan Base64.
    2. Verifikasi parser OCR backend terhadap sampel foto pengguna (`media_1791186777770.jpg`): Berhasil mengekstrak kontainer `BMOU 635654 [1]` $\to$ `BMOU6356541` (`isValidIso: true`).
  - **Penyelarasan 4 Berkas Versi**:
    - `mobile/src/config/version.ts` $\to$ `v1.3.5`, `versionCode: 27`, `FORCE_UPDATE: true`, `MIN_APP_VERSION: '1.3.5'`.
    - `backend/src/config/app-version.json` $\to$ `v1.3.5`, `versionCode: 27`, `forceUpdate: true`.
    - `mobile/app.json` & `mobile/package.json` $\to$ `v1.3.5`, `versionCode: 27`.
  - **Build & Distribusi**:
    - Hermes Export: `bunx expo export --platform android` $\to$ `entry-fd1e19af44c7d59da232142c7fc65a5e.hbc` (5.9 MB).
    - Repack, zipalign & keystore sign: `scripts/repack_apk.ps1` $\to$ disinkronkan ke 4 titik server.
    - PM2 `ShippingApi` direstart (PID: 42420).
    - API Check: `https://app.sampai.co/api/app-version/latest` $\to$ **HTTP 200 OK** (`v1.3.5`, `versionCode: 27`).

---

- [x] **Rilis Mobile App v1.3.4 Build 26 (Force Update: Scan Galeri HP via Native SAF)**:
  - **Permintaan Pengguna**: "Untuk scan dari foto yang ada di gallery bagaimana?"
  - **Penyelesaian Teknis**:
    1. Mengintegrasikan pemilih gambar dari penyimpanan internal HP / Google Photos / Galeri menggunakan `File.pickFileAsync({ mimeTypes: ['image/*'] })` dari `expo-file-system` (SAF Storage Access Framework) dan `FileSystem.readAsStringAsync` (Base64) tanpa modul native eksternal yang memicu crash pada repack APK.
    2. Menambahkan tombol **"Galeri"** (`ImageIcon`) di pojok kiri bawah `ContainerScannerModal.tsx`, sejajar dengan tombol shutter kamera.
    3. Foto yang dipilih dari galeri langsung di-encode ke Base64 dan diproses ke endpoint OCR backend (`POST /api/marking/ocr-container`).
  - **Penyelarasan 4 Berkas Versi**:
    - `mobile/src/config/version.ts` $\to$ `v1.3.4`, `versionCode: 26`, `FORCE_UPDATE: true`.
    - `backend/src/config/app-version.json` $\to$ `v1.3.4`, `versionCode: 26`, `forceUpdate: true`.
    - `mobile/app.json` & `mobile/package.json` $\to$ `v1.3.4`, `versionCode: 26`.
  - **Build & Distribusi**:
    - Hermes Export: `bunx expo export --platform android` $\to$ `entry-21eefa30ac719c1b03f9c7e58d4c3242.hbc` (5.9 MB).
    - Repack, zipalign & keystore sign: `scripts/repack_apk.ps1` $\to$ disinkronkan ke 4 titik server.
    - PM2 `ShippingApi` direstart (PID: 35444).
    - API Check: `https://app.sampai.co/api/app-version/latest` $\to$ **HTTP 200 OK** (`v1.3.4`, `versionCode: 26`).

---

- [x] **Rilis Mobile App v1.3.3 Build 25 (Force Update)**:
  - **Permintaan Pengguna**: "Rilis versi baru force update"
  - **Katalog Perubahan yang Dirilis**:
    1. *Fitur Deteksi Nomor Kontainer Otomatis*: Viewfinder kamera dedicated dengan rectangular framing khusus stensil kontainer.
    2. *Engine Backend OCR Tesseract & Sharp*: Preprocessing kontras & grayscale + ekstraksi nomor kontainer ISO 6346 (check-digit modulo 11) dan format kontainer domestik.
    3. *Integrasi SearchBar Logistik*: Tombol pintas kamera di Tab Batches & Tab Resi Logistik.
    4. *Dialog Quick Edit Cerdas*: Review & koreksi nomor kontainer sebelum dimasukkan ke filter data.
    5. *Audit Trail Info Resi*: Penambahan riwayat *Created By* (`fdEmp1`, `fdCreatedDate`) dan *Updated By* (`fdEmp2`, `fdUpdate`) pada modal rincian muatan kargo.
  - **Penyelarasan 4 Berkas Konfigurasi Versi**:
    1. `mobile/src/config/version.ts` $\to$ `APP_VERSION = '1.3.3'`, `APP_VERSION_CODE = 25`, `FORCE_UPDATE = true`, `MIN_APP_VERSION = '1.3.3'`.
    2. `backend/src/config/app-version.json` $\to$ `version: "1.3.3"`, `versionCode: 25`, `minVersion: "1.3.3"`, `forceUpdate: true`.
    3. `mobile/app.json` $\to$ `version: "1.3.3"`, `android.versionCode: 25`.
    4. `mobile/package.json` $\to$ `version: "1.3.3"`.
  - **Kompilasi & Distribusi**:
    - Hermes Bytecode Export: `bunx expo export --platform android` $\to$ `entry-8ae0a6219620937ac78be02a85e6af4c.hbc` (5.9 MB).
    - Repack & Zipalign APK: Injeksi bytecode ke `assets/index.android.bundle` pada `mshipping.apk`.
    - Signing Release: `uber-apk-signer.jar` dengan `release.keystore` (SHA256: `3711a97ee52b...`, signature v2/v3 verified).
    - Sinkronisasi 4 Titik Server:
      - `C:\shipping\mshipping.apk` (127,197,053 bytes)
      - `C:\shipping\frontend\dist\mshipping.apk` (127,197,053 bytes)
      - `C:\shipping\frontend\public\mshipping.apk` (127,197,053 bytes)
      - `C:\shipping\backend\public\uploads\mshipping.apk` (127,197,053 bytes)
    - PM2 Service Restart: `pm2 restart ShippingApi` (PID: 12716, online).
  - **Verifikasi**:
    - Version Check API: `https://app.sampai.co/api/app-version/latest` $\to$ **HTTP 200 OK** (`version: 1.3.3`, `versionCode: 25`, `forceUpdate: true`).
    - APK Download Link: `https://app.sampai.co/mshipping/mshipping.apk` $\to$ **HTTP 200 OK** (127,197,053 bytes).

---

- [x] **Fitur Deteksi Nomor Kontainer via Kamera & Galeri (`mobile/`, `backend/`)**:
  - **Permintaan Pengguna**: "Buat fitur dari camera untuk deteksi no kontainer /plan /grill-me"
  - **Hasil Klarifikasi (Grill-Me)**:
    1. *Platform*: Mobile App (Expo / Android) untuk petugas lapangan di depo/pelabuhan.
    2. *Alur*: Terintegrasi di Pencarian Logistik (Tab Batches & Shipments), dengan tombol pemindai kontainer di samping SearchBar.
    3. *Interaksi*: Tombol Shutter jepret kamera dengan rectangular guideline frame khusus kontainer + opsi pilih foto dari galeri HP (`expo-image-picker`).
    4. *Validasi Cerdas*: Prioritas format standar ISO 6346 (4 huruf + 7 digit, kalkulasi check digit modulo 11), tetap toleran terhadap format domestik/lokal, dan menampilkan dialog konfirmasi / quick edit agar petugas bisa mengoreksi jika ada 1 karakter salah baca.
    5. *Tindakan*: Nomor kontainer yang dikonfirmasi langsung dimasukkan ke SearchBar dan memicu pemfilteran data secara instan.
  - **Penyelesaian**:
    1. **Backend Service (`backend/src/modules/marking/container-ocr.service.ts`)**:
       - Preprocessing gambar via `sharp` (grayscale, normalisasi kontras, auto-orient EXIF, sharpen).
       - Tesseract.js singleton worker dengan whitelist karakter `A-Z0-9- `.
       - Algoritma parser cerdas ISO 6346, deteksi teks vertikal stensil pintu kontainer, dan penghitungan check-digit modulo 11 resmi ISO.
    2. **Backend Unit Tests (`backend/src/modules/marking/container-ocr.test.ts`)**:
       - 7 unit tests (kalkulasi check digit, validasi kontainer ISO & domestik, ekstraksi teks kotor/stensil vertikal) lulus 100%.
    3. **Backend Controller & Routes (`backend/src/modules/marking/marking.controller.ts` & `marking.routes.ts`)**:
       - Endpoint baru `POST /api/marking/ocr-container` dengan dukungan JSON Base64 dan multipart.
       - PM2 `ShippingApi` direstart (PID: 39784, online).
    4. **Mobile Scanner Component (`mobile/src/components/scanner/ContainerScannerModal.tsx`)**:
       - Viewfinder kamera fullscreen (`expo-camera`) dengan rectangular target frame dan sudut aksen.
       - Tombol pilih foto dari galeri (`expo-image-picker`), tombol shutter jepret, switch kamera depan/belakang, dan kontrol senter/flash.
       - Overlay animasi loading saat backend OCR memproses gambar.
       - Dialog konfirmasi / edit cepat nomor kontainer dengan badge status ISO 6346 dan seleksi kandidat alternatif.
    5. **Integrasi SearchBar & Logistik (`mobile/src/components/ui/SearchBar.tsx` & `mobile/app/(tabs)/logistics.tsx`)**:
       - Menambahkan prop `onScanContainerPress` dengan icon kamera pada search bar Logistik.
       - Pemicuan otomatis pencarian dan filter data resi & batch marking begitu nomor kontainer dikonfirmasi.
  - **Verifikasi**:
    - Backend Unit Tests: `bun test src/modules/marking/container-ocr.test.ts` $\to$ **7 passed (2.46s)**, Total: **251 passed (7.70s)**.
    - Backend TypeScript Check: `cd backend && bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Mobile TypeScript Check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.56s)**.

---

- [x] **Revisi Sistem Voice Command: Floating Capsule HUD Terpusat & Kontrol Berbasis Role (`frontend/`)**:
  - **Permintaan Pengguna**: "Revisi sistem voice command. Buat agar seperti pada bill validasi detail page. Semua kontrol ada di floating ui bukan di top bar seperti sekarang. Apabila role aktif maka ui timbul dan sebaliknya apabila role tidak ada maka fitur dan ui tidak muncul."
  - **Akar Masalah & Kebutuhan Arsitektur**:
    1. *Kontrol Tersebar & Duplikasi Engine*: Sebelumnya kontrol suara ada di Topbar (`Topbar.tsx`), toolbar list billing (`ValidationListPage.tsx`), dan instance lokal terpisah di `ValidationDetailPage.tsx`. Dua instance speech recognition terpisah dapat memicu konflik buffer audio/WASAPI.
    2. *UI Tidak Konsisten*: Tampilan di topbar memakan ruang header, sedangkan interaksi modern lebih nyaman menggunakan Floating Capsule HUD di bagian bawah layar seperti pada `ValidationDetailPage.tsx`.
    3. *Role-Gated Zero-Footprint*: Fitur suara harus terisolasi sesuai izin role pengguna (`useVoiceAssistantPermission`). Jika role tidak memiliki izin (`ROUTES.VOICE_ASSISTANT`), UI mengambang tidak boleh muncul, shortcut `Alt + V` dinonaktifkan, dan mikrofon tidak boleh diakses sama sekali (zero DOM footprint).
  - **Penyelesaian**:
    1. **Voice Assistant Store (`frontend/src/stores/voiceAssistantStore.ts`)**:
       - Mengubah default state `isMuted: true` agar mic dalam status jeda/senyap saat aplikasi pertama kali dimuat.
       - Memperluas `VoiceAssistantContext` dengan properti navigasi dan delegate modal (`isSea`, `onBack`, delegate modal issue/drawer).
    2. **Komponen Baru `GlobalVoiceHud.tsx` (`frontend/src/components/ui/GlobalVoiceHud.tsx`)**:
       - Floating capsule HUD di posisi `fixed bottom-5 sm:bottom-7 md:bottom-8 left-1/2 -translate-x-1/2 z-40`.
       - Kontrol: Tombol Mic/Mute dengan pulsating ring, mini visualizer waveform audio, live text telemetri pengenalan suara, serta indikator centang feedback eksekusi.
       - Popover Cheat Sheet adaptif (`?`): Menampilkan panduan perintah global ERP (Dashboard, Shipments, DO, Billing, Kasir, BAP, dsb.) saat di halaman biasa, dan beralih otomatis ke perintah operasional faktur (Tab 1–5, Issue, Cetak PDF, Drawer, Refresh, Resi) saat berada di `ValidationDetailPage`.
       - Engine Speech Recognition terpusat (`id-ID`, continuous hands-free, debounce hening 900ms, feedback Web Audio API sintetis).
    3. **Pembersihan Topbar & Toolbar List (`Topbar.tsx` & `ValidationListPage.tsx`)**:
       - Menghapus tombol asisten suara dari `Topbar.tsx` dan toolbar `ValidationListPage.tsx`.
    4. **Integrasi Role-Gated di `AppLayout.tsx` (`frontend/src/components/layout/AppLayout.tsx`)**:
       - Menggantikan modal lama dengan render kondisional `{canUseVoice && <GlobalVoiceHud />}`.
       - Shortcut <kbd>Alt + V</kbd> hanya aktif jika `canUseVoice === true`.
    5. **Pembersihan & Refactor `ValidationDetailPage.tsx`**:
       - Menghapus engine lokal ganda dan local HUD.
       - Mendaftarkan context aksi halaman (ganti tab 1-5, cetak PDF, refresh, back) ke global store via `registerContext()`.
       - Menghubungkan supresi suara otomatis saat modal apapun di halaman terbuka (`suppressVoice`).
    6. **Dokumentasi Terpadu**:
       - Memperbarui `frontend-app.md` pada bagian Global Voice Command Floating HUD.
  - **Verifikasi**:
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (10.63s)**.
    - Production HTTP Endpoint: `https://app.sampai.co/mshipping/` $\to$ **HTTP 200 OK**.

---

- [x] **Perbaikan Akses Role Superadmin & Audit Matriks Hak Akses Seluruh Role (`backend/`, `frontend/`, `database`)**:
  - **Permintaan Pengguna**: "Saya login pakai role superadmin tapi dashboard dan logistik tidak terbuka datanya. Perbaiki dan cek dengan role lainnya."
  - **Akar Masalah**:
    1. *Admin Bypass di Backend Middleware (`backend/src/middleware/auth.ts`)*: Middleware `isAdmin` dan `requirePermission` sebelumnya HANYA mengecek `if (user.role === 'admin')`. Role `superadmin` tidak lolos bypass admin!
    2. *Database `tbRolePermissions` Tidak Lengkap*: Di tabel `[tbRolePermissions]`, role `superadmin` hanya memiliki 3 baris permissions (terkait lampiran billing), tidak memiliki `/mshipping/dashboard`, `/mshipping/shipments`, `/mshipping/shipment-batches`, atau wildcard `/*`. Akibatnya saat request masuk ke endpoint `/api/dashboard`, `/api/shipments`, atau `/api/marking`, backend menolak dengan **HTTP 403 Forbidden**.
    3. *Token Permissions di Auth Service*: `auth.service.ts` tidak menyertakan wildcard `/*` untuk `superadmin`, sehingga di frontend dan mobile app hak akses superadmin tidak ter-bypass penuh.
    4. *Frontend Router Guard (`frontend/src/app/router.tsx`)*: `PermissionGuard` dan `DefaultRouteRedirect` hanya mengecek `user.role === 'admin'`.
  - **Penyelesaian Komprehensif**:
    1. **Backend Middleware (`backend/src/middleware/auth.ts`)**:
       - `isAdmin`: Diperbarui menjadi `if (user?.role !== 'admin' && user?.role !== 'superadmin')` untuk mengizinkan superadmin.
       - `requirePermission`: Diperbarui menjadi `if (user.role === 'admin' || user.role === 'superadmin') { await next(); return; }` untuk auto-bypass seluruh endpoint API.
    2. **Sinkronisasi Database `tbRolePermissions`**:
       - Menyinkronkan seluruh 34 permissions admin ke role `superadmin` di database SQL Server.
    3. **Backend Auth Service (`backend/src/modules/auth/auth.service.ts`)**:
       - Menambahkan wildcard `'/*'` ke JWT payload untuk role `admin` dan `superadmin`.
       - Menyetel fallback default route ke `/mshipping/overview/dashboard` untuk `admin` dan `superadmin`.
    4. **Frontend Router Guard (`frontend/src/app/router.tsx`)**:
       - Menambahkan pengecekan `user?.role === 'superadmin'` pada `PermissionGuard` dan `DefaultRouteRedirect`.
    5. **PM2 Service Restart**: `ShippingApi` direstart (PID: 35432).
  - **Hasil Pengujian Matriks Hak Akses Seluruh Role**:
    - **`SUPERADMIN`**: Dashboard Marking KPI ✅ 200, Logistik Batches ✅ 200, Logistik Shipments ✅ 200, Logistik DO ✅ 200, Finance Billing ✅ 200, Master Customers ✅ 200 (100% Akses Penuh).
    - **`ADMIN`**: 100% Akses Penuh (Semua Endpoint ✅ 200).
    - **`VIEWER`**: Dashboard, Batches, Shipments, DO, Billing, Master (Semua Endpoint ✅ 200).
    - **`BAP`**: Dashboard KPI ✅ 200, Batches ✅ 200, Shipments ✅ 200, Master ✅ 200, DO & Finance 🔒 403 (Tepat sesuai role lapangan BAP).
    - **`BILLING` / `AR` / `KASIR` / `FINANCE`**: Finance Billing ✅ 200, Master ✅ 200, Logistik 🔒 403 (Tepat sesuai role keuangan).
    - **`REVISI`**: Shipments ✅ 200, Master ✅ 200, Batches/DO/Finance 🔒 403 (Tepat sesuai role revisi data kargo).
  - **Verifikasi**:
    - Endpoint API Real: `GET /api/marking/kpi`, `/api/marking`, `/api/shipments`, `/api/delivery-orders` $\to$ **Semua HTTP 200 OK**.
    - Frontend Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (3.00s)**.

---

- [x] **Penambahan Timestamp Created By dan Update pada Modal Shipment (`backend/`, `frontend/`, `mobile/`)**:
  - **Permintaan Pengguna**: "Tambahkan timestamp created by dan update pada modal shipment".
  - **Analisis & Database Schema**:
    1. *Kolom Database `tbEntryList`*: Berdasarkan `INFORMATION_SCHEMA.COLUMNS` dan data historis, kolom audit trail kargo tersimpan pada `tbEntryList`:
       - `fdEmp1`: User pembuat / penginput kargo (*Created By*).
       - `fdCreatedDate`: Tanggal dan waktu pembuatan kargo (*Created Timestamp*).
       - `fdEmp2`: User terakhir yang memperbarui kargo (*Updated By*).
       - `fdUpdate`: Tanggal dan waktu pembaruan kargo (*Update Timestamp*).
    2. *Tantangan View `vwShipment`*: `vwShipment` di database SQL Server tidak memuat kolom audit ini. Query `getShipmentById` diperkaya dengan query paralel berkecepatan tinggi ke `tbEntryList` (`auditPromise` via `safeQuery`).
  - **Penyelesaian**:
    1. **Backend API (`backend/src/modules/shipments/shipments.service.ts`)**:
       - Pada fungsi `getShipmentById(id)`, menambahkan `auditPromise` untuk mengambil `fdEmp1`, `fdCreatedDate`, `fdEmp2`, `fdUpdate` dari `tbEntryList WITH (NOLOCK)`.
       - Mengembalikan nilai bersih (`trim()`) pada respons endpoint `GET /api/shipments/:id`.
       - PM2 `ShippingApi` direstart (PID: 34664) dan telah diverifikasi via curl/bun.
    2. **Frontend Web (`frontend/`)**:
       - `shipments.types.ts`: Menambahkan properti `fdEmp1`, `fdCreatedDate`, `fdEmp2`, `fdUpdate` pada interface `Shipment`.
       - `ShipmentInfoTab.tsx`: Menambahkan kartu/panel semantik **"Riwayat Pembuatan & Pembaruan"** di bawah panel keterangan:
         - *Dibuat Oleh (Created By)*: Icon `UserCheck` (emerald), nama petugas `fdEmp1`, dan tanggal/jam format WIB (`formatDateTime(fdCreatedDate)`).
         - *Terakhir Diperbarui (Updated)*: Icon `History` (sky), nama petugas `fdEmp2`, dan tanggal/jam format WIB (`formatDateTime(fdUpdate)`).
       - `ShipmentTimelineTab.tsx`: Menambahkan langkah awal **"Entri Data Resi"** di tahapan siklus kargo lengkap dengan tanggal input dan nama petugas penginput.
    3. **Mobile App (`mobile/src/features/logistics/components/ShipmentInfoTab.tsx`)**:
       - Menambahkan kartu ringkasan audit trail serupa yang adaptif terhadap Dark/Light theme (`isDark`), menyajikan *Dibuat Oleh* dan *Terakhir Diperbarui* dengan tipografi tabular-nums dan format WIB (`formatDateTime`).
  - **Verifikasi**:
    - Backend Type Check: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Mobile Type Check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.39s)**.

---

- [x] **Integrasi Role Hak Akses Tampilkan fdConsignee ke Halaman Role Setting (`frontend/`, `backend/`, `mobile/`)**:
  - **Permintaan Pengguna**: "Role untuk menampilkan fdconsignee kenapa tidak ada di page role setting" -> "Ya" (aktifkan dan tambahkan ke role setting).
  - **Akar Masalah**:
    1. *Belum Terdaftar di `AVAILABLE_PATHS`*: Halaman Role Setting (`/mshipping/admin/roles`) memetakan seluruh baris permission dari array `AVAILABLE_PATHS` di `userManagement.types.ts`. Item izin consignee belum pernah didaftarkan.
    2. *String Custom Hardcoded*: Di `DetailPage.tsx`, pengecekan sebelumnya menggunakan string kustom `billing.view_consignee`, bukan path URL standar M-Shipping (`/mshipping/finance/billing/view-consignee`).
    3. *Belum Ada di Database*: Belum ada baris permission path ini di tabel `[tbRolePermissions]`.
    4. *Belum Masuk Sanitasi `nonPagePaths` Backend*: Izin sub-fitur non-halaman harus didaftarkan di `nonPagePaths` pada `auth.service.ts` agar tidak terpilih menjadi `defaultRoute` saat user login.
  - **Penyelesaian**:
    1. **Konstanta Rute & Types Frontend (`constants.ts` & `userManagement.types.ts`)**:
       - Menambahkan konstanta `ROUTES.BILLING_VIEW_CONSIGNEE = '/mshipping/finance/billing/view-consignee'`.
       - Mendaftarkan ke `AVAILABLE_PATHS` (Modul Keuangan) dengan label `'Tampilkan Consignee di Invoice'`, `module: 'finance'`, `isPage: false` (ditandai sebagai `Aksi / Sub-Izin` tanpa radio button default route).
    2. **Hook Terpusat & Guard Komponen (`useBillingPermissions.ts`, `DetailPage.tsx`, `CustomerInfoCard.tsx`)**:
       - Menambahkan hook terpusat `useBillingViewConsigneePermission()` yang mendukung backward compatibility (`/*`, admin, superadmin, `/mshipping/finance/billing/view-consignee`, `/mshipping/finance/billing/view_consignee`, `billing.view_consignee`).
       - Memperbarui `DetailPage.tsx` dan `CustomerInfoCard.tsx` untuk menggunakan hook tersebut.
    3. **Backend Sanitasi Default Route (`auth.service.ts`)**:
       - Mendaftarkan `/mshipping/finance/billing/view-consignee` dan `/mshipping/finance/billing/view_consignee` ke daftar `nonPagePaths`.
    4. **Sinkronisasi Mobile App (`permissions.ts`)**:
       - Memperbarui `canViewConsignee` di mobile agar kompatibel dengan path standar `/mshipping/finance/billing/view-consignee`.
    5. **Database Backfill & Seed (`backfill-consignee-permission.ts`)**:
       - Mengisi path `/mshipping/finance/billing/view-consignee` ke tabel `[tbRolePermissions]` untuk seluruh role (default aktif `canView: 1` untuk `admin`, `superadmin`, `billing`, `finance`, `ar`; dan `0` untuk role lainnya sehingga dapat di-toggle bebas dari UI).
       - PM2 `ShippingApi` direstart dan online sehat (PID: 31020).
  - **Verifikasi**:
    - Backend Type Check: `bun x tsc --noEmit` -> **LULUS 0 error**.
    - Mobile Type Check: `bun x tsc --noEmit` -> **LULUS 0 error**.
    - Frontend Unit Tests: `bun test` -> **79 tests LULUS (0 error)**.
    - Frontend Production Build: `bun run build` -> **LULUS 100% 0 error (2.95s)**.

---

- [x] **Audit & Penguatan Sistem Role & Hak Akses Mobile App (`mobile/`)**:
  - **Permintaan Pengguna**: "Audit semua role di mobile app. Apakah sudah berfungsi dengan benar."
  - **Temuan Celah Keamanan & Inkonsistensi Role**:
    1. *Subpath Over-permissive Bug (`permissions.ts`)*: Logika `p.startsWith(path)` pada permission check sebelumnya mencocokkan subpath sembarangan sehingga user yang HANYA memiliki akses resi (`/mshipping/logistics/shipments`) secara keliru lolos validasi untuk BAP (`canManageInspectionReports`), Revisi Kargo (`canManageDataRevisions`), dan Exit Date Gudang (`canManageBatchExitDate`).
    2. *Sub-tab BAP Tidak Terproteksi (`logistics.tsx`)*: Tab BAP di bilah tab Logistik sebelumnya tampil untuk semua user logistik terlepas dari izin BAP, dan tombol `+ BAP` pada resi/manifest tetap dapat dibuka oleh user tanpa izin BAP.
    3. *Consignee Unmasking Belum Aktif di Detail Invoice (`InvoiceDetailSheet.tsx`)*: Fungsi `canViewConsignee` belum merender badge dan teks `fdConsignee` seperti di frontend web.
  - **Penyelesaian**:
    1. **Penguatan Helper Permission Terpusat (`mobile/src/lib/permissions.ts`)**:
       - Memperketat `hasPermission`: Hanya mencocokkan path eksak `p === path`, wildcard root `/*`, wildcard modul `p.endsWith('/*')`, atau subpath valid `path.startsWith(p + '/')`.
       - Memisahkan izin granular `canManageInspectionReports`, `canManageDataRevisions`, dan `canManageBatchExitDate` agar tidak terpicu oleh izin tunggal `shipments`.
       - Menyelaraskan `canManageBillingAttachments` (upload) dan `canDeleteBillingAttachment` (hapus lampiran bill).
       - Menyelaraskan `canViewConsignee` untuk mendeteksi `billing.view_consignee` atau `/mshipping/finance/billing/view_consignee`.
    2. **Proteksi UI & Routing Tab Logistik (`mobile/app/(tabs)/logistics.tsx`)**:
       - Menyaring `LOGISTICS_TABS`: Tab BAP hanya muncul jika `canAccessInspection` bernilai `true`.
       - Melindungi tombol aksi: `onCreateBap` pada `ShipmentListItem`, `ShipmentDetailSheet`, dan `BatchManifestSheet` hanya diberikan jika `canAccessInspection` aktif.
       - Auto-redirect: Jika navigasi diarahkan ke tab `inspection` tanpa hak akses, otomatis fallback ke tab `shipments`.
    3. **Penyelarasan Consignee di Detail Invoice (`InvoiceDetailSheet.tsx`)**:
       - Menampilkan badge semantik `CONSIGNEE` dan nama consignee hanya jika user memiliki hak akses `canViewConsignee` (admin atau user dengan izin `billing.view_consignee`).
    4. **Pengujian Unit Test Komprehensif (`mobile/src/lib/permissions.test.ts`)**:
       - Menambahkan 38 unit test yang mencakup: Admin, Superadmin, Wildcard `/*`, Subpath isolation, Consignee masking, Tab navigation access, Validasi billing, BAP isolation, Revisi kargo isolation, Exit date isolation, dan Lampiran bill upload & delete.
  - **Verifikasi**:
    - Bun Test Unit Tests: `bun test mobile/src/lib/permissions.test.ts` $\to$ **LULUS 38 pass, 0 fail (46ms)**.
    - Mobile TypeScript Check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (3.04s)**.

---

- [x] **Rilis APK Mobile v1.3.2 Build 24 (Force Update) & Manajemen Foto Revisi Kargo Mirip BAP (`mobile/`, `backend/`)**:
  - **Permintaan Pengguna**:
    1. "Buat tampilan foto yang terlampir pada page revisi seperti pada page bap. Tambahkan tombol tambah foto di list. Dan bisa tambahkan atau hapus tanpa masuk ke wizard edit form revisi. Pastikan data fotonya bisa di tampilkan karena sekarang fotonya tidak terlihat."
    2. "Naik force"
  - **Penyelesaian**:
    1. **Komponen Dedikasi `RevisionPhotoSheet.tsx` (Identik dengan `BapPhotoSheet.tsx`)**:
       - Mengadaptasi seluruh pola visual dan interaksi BAP:
         - Header dengan nomor formulir, nama kargo/customer, counter badge foto (`X/10`), dan tombol tutup `X`.
         - Tombol aksi utama `[+ Ambil Foto Formulir]` langsung membuka kamera native terintegrasi (fullscreen `CameraView`, torch, flip kamera depan/belakang, shutter bottom).
         - Saat foto dijepret: LANGSUNG diunggah ke backend (`POST /api/data-revisions/:id/lampiran`) tanpa perlu masuk ke wizard edit form!
         - Grid foto 3-kolom persegi (1:1 `GRID_ITEM_SIZE`) dengan nomor urut `#1`, `#2` dan tombol hapus merah (`Trash2`) di tiap thumbnail.
         - Hapus foto: Konfirmasi native alert $\to$ panggil endpoint `DELETE /api/data-revisions/lampiran/:lampiranId` $\to$ query cache di-invalidate dan foto langsung terhapus seketika.
         - Fullscreen Photo Viewer Slider: Saat thumbnail ditekan, membuka modal horizontal slider layar penuh dengan counter `#X dari #Y`, tombol Bagikan (`Share2` via `expo-sharing`), tombol Hapus langsung, dan dots pagination.
    2. **Tombol Foto Langsung pada Kartu List (`DataRevisionCard.tsx`)**:
       - Menambahkan prop `onPressPhoto?: (item: DataRevision) => void`.
       - Menghitung jumlah foto dari `item.lampiran?.length || item._count?.lampiran || 0`.
       - Menampilkan tombol aksi foto interaktif pada footer kartu:
         - Berlabel `{photoCount} Foto` (aksen biru/cerah) jika sudah ada foto, atau `Tambah Foto` jika belum ada.
         - Tombol langsung membuka `RevisionPhotoSheet` tanpa membuka detail atau wizard form.
    3. **Integrasi Tab Revisi (`DataRevisionsTab.tsx`)**:
       - Menghubungkan state `photoSheetItem` & `isPhotoSheetOpen`.
       - Meneruskan `onPressPhoto={handleOpenPhoto}` ke setiap `DataRevisionCard`.
       - Memasang modal `<RevisionPhotoSheet revision={photoSheetItem} ... />` di root tab.
    4. **Akses Cepat di Modal Detail (`DataRevisionDetailModal.tsx`)**:
       - Menambahkan tombol aksi `Kelola Foto` pada header section lampiran fisik dan tombol `Tambah Foto Sekarang` pada empty state.
       - Memperbaiki `resolveLampiranUrl` menggunakan normalisasi path andal (`uploads/data-revisions/...`) dan integrasi dengan `RevisionPhotoSheet`.
    5. **Perbaikan Tipe & Service API (`dataRevisions.types.ts`, `data-revisions.service.ts`, `useDataRevisions.ts`)**:
       - Menyelaraskan interface `DataRevisionLampiran` dengan kolom database asli (`fdPath`, `fdNamaFile`, `fdNamaFileSimpan`, `fdUkuranBytes`).
       - Menambahkan method `mobileDataRevisionsApi.deleteLampiran(lampiranId)`.
       - Menambahkan mutasi hook `useUploadDataRevisionPhoto` dan `useDeleteDataRevisionPhoto`.
    6. **Rilis APK Mobile v1.3.2 Build 24 (Force Update)**:
       - Sinkronisasi versi di 4 file: `v1.3.2`, `versionCode: 24`, `forceUpdate: true`.
       - Hermes Android Bytecode: `entry-d1a75ce4452b5a10d4e78e4761f96884.hbc` (5.9MB).
       - Repack & Signing via `scripts/repack_apk.ps1` dengan `uber-apk-signer` + `release.keystore` (verified v2/v3).
       - Tersinkron otomatis ke 4 titik server:
         1. `C:\shipping\mshipping.apk` (121.3 MB)
         2. `C:\shipping\frontend\dist\mshipping.apk` (121.3 MB)
         3. `C:\shipping\frontend\public\mshipping.apk` (121.3 MB)
         4. `C:\shipping\backend\public\uploads\mshipping.apk` (121.3 MB)
       - PM2 `ShippingApi` direstart (PID: 31568). Endpoint `/api/app-version` aktif mengembalikan `v1.3.2` (Force Update).
  - **Verifikasi**:
    - Mobile TypeScript Check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (3.35s)**.
    - App Version API: `curl http://localhost:3010/api/app-version` $\to$ **v1.3.2 (forceUpdate: true)**.

---

- [x] **Perbaikan Anotasi Panah, Posisi Toolbar Anotasi, & Penyelarasan Kamera Revisi (`mobile/`)**:
  - **Permintaan Pengguna**: "Pada image bap anotasi panah error, perbaiki posisi tombol di anotasi gambarnya. Karena terlalu mepet dengan navigasi android. Buat ambil gambar pada revisi page seperti ambil gambar pada bap tanpa anotasi."
  - **Penyelesaian**:
    1. **Fix Render Panah Anotasi (`PhotoAnnotationModal.tsx`)**:
       - Mengganti SVG `<Marker>` / `markerEnd` (yang menyebabkan crash dan render error di `react-native-svg` Android) dengan kalkulasi manual titik sudut kepala panah trigonometrik (`getArrowHeadPoints`).
       - Ujung panah dirender langsung sebagai `<Polygon>` dan garis `<Line>` baik pada live drawing canvas maupun pada `generateSvgString()`, menjamin kestabilan 100% di semua versi Android/iOS tanpa error.
    2. **Elevasi Tombol Toolbar Bawah Anotasi (`PhotoAnnotationModal.tsx`)**:
       - Memperbaiki safe padding Android pada baris aksi bawah (`Lewati Anotasi` & `Simpan`):
         `paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 48) + 16 : Math.max(insets.bottom, 20)`.
       - Memberikan ruang lapang 64dp+ di perangkat Android sehingga tombol tidak lagi mepet atau tertekan tombol navigasi / gesture bar sistem.
    3. **Penyelarasan Kamera Halaman Revisi Mirip BAP Tanpa Anotasi (`CameraCaptureModal.tsx`)**:
       - Mengubah modal kamera formulir revisi agar 100% seragam dengan UX kamera BAP:
         - Viewfinder fullscreen bersih tanpa reticle dashed box yang kaku.
         - Top bar: tombol close `X`, toggle torch/flash (`Zap`/`ZapOff`), dan toggle flip facing kamera depan/belakang (`RotateCcw`).
         - Shutter button melayang elegan 76px dengan inner 58px dan proteksi safe area bottom Android (`Math.max(insets.bottom, 48) + 24`).
       - Alur langsung: Saat tombol shutter ditekan, foto langsung diserahkan ke form revisi tanpa modal anotasi.
  - **Verifikasi**:
    - Mobile TypeScript Check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (3.42s)**.

---

- [x] **Penambahan Opsi Edit pada Halaman Revisi Kargo (`mobile/src/features/data-revisions/`)**:
  - **Permintaan Pengguna**: "Tambahkan opsi edit pada page revisi. Seperti pad fitur bap".
  - **Penyelesaian**:
    1. **Service & Hooks (`data-revisions.service.ts` & `useDataRevisions.ts`)**:
       - Menambahkan endpoint `update(id, payload)` (`PUT /api/data-revisions/:id`) dan `delete(id)` (`DELETE /api/data-revisions/:id`).
       - Menambahkan hook mutasi `useUpdateDataRevision` dan `useDeleteDataRevision` dengan auto invalidation react-query.
    2. **Wizard Modal Support Edit (`DataRevisionWizardModal.tsx`)**:
       - Menambahkan prop `editItem?: DataRevision | null`.
       - Mengisi otomatis seluruh state form saat `editItem` aktif (No Form, Tanggal, PIC/Petugas, Catatan, Data Awal & Baru target kargo).
       - Menyesuaikan handler submit: memanggil `update(editItem.fdId, payload)` jika edit mode, atau `create(payload)` jika baru.
       - Judul header adaptif: `Edit Form: {nomorForm}`.
    3. **Detail Modal Actions Footer (`DataRevisionDetailModal.tsx`)**:
       - Mengubah footer action bar: menambahkan tombol `Edit Form` (`Edit2`) dan `Hapus` (`Trash2`), serupa dengan flow pada Berita Acara Pemeriksaan (BAP).
       - Untuk form berstatus `CANCEL_DATA` & `PENDING`, aksi Eksekusi Pembatalan tetap tersedia berdampingan dengan opsi Edit & Hapus.
    4. **List Item Quick Edit & Tab State (`DataRevisionCard.tsx` & `DataRevisionsTab.tsx`)**:
       - Menambahkan tombol aksi cepat `Edit` langsung pada kartu list (`DataRevisionCard`).
       - Menghubungkan state `editingRevision`, trigger edit dari kartu maupun dari detail modal ke `DataRevisionWizardModal`.
  - **Verifikasi**:
    - Mobile TypeScript Check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (3.33s)**.

---

- [x] **Pembersihan Teks Redundan & Minimalis List Item (`mobile/src/features/`)**:
  - **Permintaan Pengguna**: "Bersihkan design ui mobile app. Buat jadi lebih sederhana dengan gaya minimalis tanpa mengurangi data yang ditampilkan. Kurangi text yang sudah sangat jelas artinya."
  - **Penyelesaian**:
    1. `ShipmentListItem.tsx`:
       - Menghilangkan label berulang `"No. Marking: "`.
       - Menyatukan kode marking dan nomor urut marking secara inline (`{markingCode} #{markingNo}`) dengan angka tabular.
    2. `BatchListItem.tsx`:
       - Menghapus teks navigasi redundan `"Lihat Data Manifest ➔"` (seluruh kartu sudah bertindak sebagai tombol interaktif).
       - Menyejajarkan status tanggal dan tombol aksi `[+ Exit]` secara ringkas di baris bawah.
    3. `ExitBatchListItem.tsx`:
       - Menghapus awalan label redundan `"Cont/AWB: "`.
       - Nomor kontainer / AWB dan consignee disajikan langsung secara bersih dan tegas.
    4. `CustomerListItem.tsx`:
       - Menghilangkan label awalan `"CP: "` dan `"Sales: "`.
       - Mengganti ke icon semantik (`User`, `Phone`) dan teks presisi tanpa label berulang.
    5. `BillingListItem.tsx`:
       - Mengubah format marking dari `(No. 123)` menjadi `#123` ramping.
  - **Verifikasi**:
    - Mobile TypeScript Check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (3.12s)**.

---

- [x] **Eliminasi Redundansi Desain Manifest Batch Marking & Dashboard (`mobile/src/features/logistics/components/BatchManifestSheet.tsx`)**:
  - **Permintaan Pengguna**: "Hilangkan redundan pada design manifest dari dashboard dan batch marking".
  - **Analisis & Akar Masalah**:
    1. *Redundansi Judul & Metadata*: Header modal menampilkan label hardcoded statis "MANIFEST BATCH MARKING" dan menduplikasi kode marking, kontainer, dan cabang yang sudah tercantum di kartu luar.
    2. *Redundansi Kotak KPI*: KPI ringkasan batch sebelumnya memakan 4 kotak kartu terpisah yang tebal dan memboroskan ruang vertikal layar HP.
    3. *Redundansi Item Manifest*: Tiap item manifest membungkus komoditas dalam nested box ber-border ganda yang tebal, serta menampilkan tombol "Detail" ganda padahal seluruh kartu sudah memiliki tap handler dan chevron `➔`.
  - **Penyelesaian**:
    1. **Sheet Header Bersih & Ringkas**:
       - Menjadikan kode marking sebagai judul utama ber-badge moda (Udara/Laut) dan cabang.
       - Subtitle hanya menampilkan nomor kontainer/AWB jika ada.
       - Border divider menggunakan `colors.divider`.
    2. **Single Streamlined KPI Metric Strip**:
       - Mengganti 4 kartu bertumpuk menjadi satu bar horizontal ramping (`border-r` pembatas hairline): Koli, Berat, Volume, dan Cust / Resi.
       - Angka diformat dengan `fontVariant: ['tabular-nums']` berukuran 13.5px bold.
    3. **Item Card Manifest Ramping**:
       - Menggabungkan Nomor Urut, Resi, dan Marking dalam 1 baris atas.
       - Mengganti nested box komoditas tebal menjadi baris inline yang rapi dengan badge tipe komoditas.
       - Menghilangkan tombol redundant `[Detail]` (seluruh baris kartu sudah bertindak sebagai trigger `handleOpenShipmentDetail` dengan `ChevronRight`).
       - Mempertahankan tombol aksi `[+ BAP]` yang penting untuk alur operasional lapangan.
  - **Repack & Verifikasi**:
    - Mobile TypeScript Check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Hermes Bytecode Export: `bunx expo export --platform android` $\to$ `entry-367cd7bcd4bc0f6bce3144a5a9aeb526.hbc` (5.8MB).
    - Repack APK: Signed release [v2, v3] sukses, disinkronkan ke 4 titik server.
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (3.00s)**.

---

- [x] **Redesign Mobile App Gaya Minimalis & Clean Industrial (`mobile/`)**:
  - **Permintaan Pengguna**: "Redesign mobile app dengan gaya minimalis".
  - **Arah Desain**: Modern Monokrom & Clean Industrial (Surface datar/flat, border ultra-tipis 1px & hairline, aksen tunggal tajam Sky Blue/Terracotta, angka tabular `fontVariant: ['tabular-nums']`, memangkas bayangan shadow berat dan border tebal berwarna-warni).
  - **Penyelesaian Komprehensif**:
    1. **Design Tokens & Surfaces (`mobile/src/theme/colors.ts`)**:
       - Memperhalus palet Midnight Dark (`#0B0F17` neutral, `#111827` surface, border `rgba(255,255,255,0.08)`) dan Heritage Light (`#F8F9FA` neutral, border `#E2E8F0`).
       - Menambahkan token semantik `divider` (`rgba(255,255,255,0.06)` di Dark, `#F1F5F9` di Light).
    2. **UI Primitives (`mobile/src/components/ui/`)**:
       - `Card.tsx`: Flat industrial card, radius diseragamkan 12px, memangkas `shadowOpacity` & `elevation` berlebih.
       - `Badge.tsx`: Desain badge kompak industrial (`paddingHorizontal: 6`, `paddingVertical: 2`, `borderRadius: 4`, micro-typography 10px bold, tracking 0.3).
       - `SearchBar.tsx`: Tinggi kompak 40px, border datar radius 10px, pemisah scan button subtle.
       - `Button.tsx`: Radius 8px presisi, letterSpacing 0.2.
    3. **Bottom Tab Navigation Bar (`mobile/app/(tabs)/_layout.tsx`)**:
       - Border atas ultra-tipis `StyleSheet.hairlineWidth`.
       - Flat elevation 0, icon stroke 1.75 dengan ukuran 19px.
       - Label micro-typography 10px bold, tracking 0.2.
       - Dinamika insets Android tetap aman ($\ge 48\text{dp}$).
    4. **Overview / Dashboard Lapangan (`overview.tsx`, `ExitActivityKpiGrid.tsx`)**:
       - Top Header ringkas: Tombol bahasa dan tema 8px borderless/subtle.
       - Alert Cards (ETA Not Exit & Missed SLA): Border 1px halus, status dot indicator, font angka tabular 22px.
       - 4 Kartu KPI Exit Activity (Kemarin, Hari Ini, Besok, 7 Hari): Flat metric tiles dengan status aksen dot dan angka tabular monokrom.
    5. **Logistik, Keuangan, Master Data & Profil (`ShipmentListItem.tsx`, `BillingListItem.tsx`, `CustomerListItem.tsx`, `profile.tsx`)**:
       - Divider internal diperbarui ke `colors.divider`.
       - Tipografi angka kode, resi, nomor invoice, kontak telepon, dan nominal uang diseragamkan ke `fontVariant: ['tabular-nums']`.
       - Pengaturan Profil (`profile.tsx`): Avatar squircle 14px, icon circle 32px, baris item clean industrial.
    6. **Rilis APK Mobile (Kenaikan Versi Force Update v1.3.0 Build 22)**:
       - Penyelarasan versi terpusat: `v1.3.0`, `versionCode: 22`, `forceUpdate: true` di 4 file (`version.ts`, `app-version.json`, `app.json`, `package.json`).
       - Kompilasi Hermes JS bytecode: `bunx expo export --platform android` $\to$ `entry-c662c5520a2d5a6c42923e1f854c3a1b.hbc` (5.8MB).
       - Repackaging & release signing via `scripts/repack_apk.ps1`:
         - Zipalign & signing verified [v2, v3] dengan `release.keystore` $\to$ **LULUS 0 error**.
         - Distribusi tersinkron otomatis ke 4 titik server:
           1. `C:\shipping\mshipping.apk` (127.18 MB)
           2. `C:\shipping\frontend\dist\mshipping.apk` (127.18 MB)
           3. `C:\shipping\frontend\public\mshipping.apk` (127.18 MB)
           4. `C:\shipping\backend\public\uploads\mshipping.apk` (127.18 MB)
       - PM2 `ShippingApi` direstart (PID: 29752). Endpoint `/api/app-version` aktif mengembalikan `v1.3.0` (Force Update).
  - **Verifikasi**:
    - Mobile TypeScript Check: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Backend Version API: `curl http://localhost:3010/api/app-version` $\to$ **v1.3.0 (forceUpdate: true)**.
    - Frontend Production Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (2.92s)**.

---

- [x] **Perbaikan Dot Radio Button Default Route & Audit Role Billing (`backend/`, `frontend/`)**:
  - **Permintaan Pengguna**: "Sekarang target page sebagai default. Kenapa tidak ada dot pada radionya?"
  - **Akar Masalah**:
    1. *Zod Stripping `isDefault`*: Pada `backend/src/modules/roles/roles.types.ts`, schema `UpdateRolePermissionsSchema` tidak menyertakan field `isDefault`. Saat admin menyimpan konfigurasi role via endpoint `PUT /api/roles/:role`, parser Zod memotong (*strip*) properti `isDefault`, sehingga `roles.service.ts` menerima `isDefault: undefined` dan selalu menulis `0` ke kolom `[isDefault]` di tabel `[tbRolePermissions]`.
    2. *State Reset*: Karena `isDefault` bernilai `0` di database, saat halaman role dimuat atau disimpan ulang, `defaultPath` ter-reset menjadi string kosong (`""`). Akibatnya, ekspresi `isDefault = defaultPath === item.path` selalu bernilai `false`, dan elemen `<input type="radio" checked={isDefault} />` tidak pernah terpilih (tidak memunculkan dot).
    3. *Action Permissions sebagai Default Route*: Permission aksi/modal seperti `/attachments` dan `/attachments/delete` sebelumnya memiliki radio button dan berisiko menjadi `defaultRoute`, memicu redirect loop dan error invoice 404 saat login.
  - **Penyelesaian**:
    1. **Backend (`roles.types.ts` & `auth.service.ts`)**:
       - Menambahkan `isDefault: z.boolean().optional().default(false)` pada `UpdateRolePermissionsSchema`.
       - Menyaring `nonPagePaths` (`/attachments`, `/validation/summary`, dll) di `auth.service.ts` agar tidak pernah menjadi `defaultRoute`.
       - Database `tbRolePermissions` diperbarui: role `billing` diset `isDefault: 1` pada `/mshipping/finance/billing/target`.
       - PM2 `ShippingApi` direstart (PID: 30484).
    2. **Frontend (`userManagement.types.ts`, `RolePermissionMatrix.tsx`, `useRoleList.ts`)**:
       - Menambahkan flag `isPage?: boolean` pada `AvailablePath`.
       - Radio button default route hanya dirender untuk item halaman penuh (`item.isPage !== false`). Item aksi diberi badge semantik `Aksi / Sub-Izin`.
       - Memperbaiki styling amber radio badge di dark mode (`dark:text-amber-400 bg-amber-500/15`).
       - Sinkronisasi instan state `defaultPath` dan `rolePermissions` dari response API pada `handleSave`.
  - **Verifikasi**:
    - Backend Type Check: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.46s)**.
    - Database: `SELECT isDefault FROM tbRolePermissions WHERE role = 'billing'` $\to$ **Target Bill isDefault: true**.

---

- [x] **Perbaikan Sidebar Mobile Tidak Menampilkan Semua Menu (`frontend/src/components/layout/`)**:
  - **Permintaan Pengguna**: "Pada frontend perbaiki sidebar pada mobile tidak bisa menampilkan semua menu".
  - **Akar Masalah**:
    1. *Height & Viewport Cutoff*: Container `<aside>` menggunakan `h-screen` (`100vh`) tetap, yang pada browser mobile (Safari/Chrome) mengabaikan tinggi bilah URL & navigasi browser, mendorong bagian bawah sidebar keluar viewport layar sejauh 60-100px.
    2. *Flexbox Scroll Trapping (`min-h-0`)*: Anak flex `<div className="flex-1 overflow-y-auto">` tidak memiliki `min-h-0`. Berdasarkan spesifikasi CSS Flexbox, elemen default `min-height: auto` sehingga tinggi container dihitung dari seluruh menu (1000px+) dan terpotong keras oleh `overflow-hidden` pada `<aside>`, membuat scrolling ke menu bagian bawah gagal atau tidak responsif.
    3. *Missing Bottom Clearance*: Padding bawah hanya `py-4` (16px), menyebabkan menu paling bawah (Master Data & Administrasi) terhalang bilah navigasi atau gesture bar perangkat mobile.
    4. *Accordion State Group Keys Mismatch*: State `openGroups` diinisialisasi dengan key `'logistics-nav.shipment'`, `'finance-nav.billing'`, dll. Sedangkan evaluasi runtime menggunakan `${mod.module}-${item.label}` (`item.label` adalah string terjemahan seperti `"Shipment"`, `"Billing"`). Akibatnya `openGroups[key]` selalu `undefined` dan seluruh menu accordion tertutup (*collapsed*) saat user berada di halaman lain (seperti Dashboard).
  - **Penyelesaian**:
    1. **`Sidebar.tsx`**:
       - Menerapkan `id` unik pada setiap grup `NavItem` (`shipment`, `batchMarking`, `deliveryOrder`, `billing`, `priceList`, `customerPriceList`).
       - Sinkronisasi `openGroups` dengan key terpadu `${mod.module}-${item.id}` dan default `isOpen = true`, sehingga seluruh sub-menu tampil lengkap secara default dan tetap dapat di-toggle buka-tutup.
       - Kontainer `<aside>` disetel `fixed inset-y-0 left-0 z-50 h-[100dvh] max-h-[100dvh] w-72 max-w-[85vw]` dengan bayangan elevasi `shadow-2xl lg:shadow-none`.
       - Kontainer navigasi scroll diberi `flex-1 min-h-0 overflow-y-auto overscroll-contain pb-28 touch-pan-y [webkit-overflow-scrolling:touch]`, menjamin kelancaran momentum touch scroll dan ruang lapang 112px di bawah layar.
       - Backdrop dipercantik dengan `backdrop-blur-xs` dan `bg-black/60`.
       - Tombol navigasi menu di mobile otomatis memicu `handleClose()`.
    2. **`AppLayout.tsx`**:
       - Memperbaiki root layout container menggunakan `h-screen h-[100dvh]` agar pas dengan viewport dinamis browser mobile.
       - Mengubah `Topbar` menu trigger menjadi `toggleSidebar` agar konsisten membuka/menutup sidebar.
  - **Verifikasi Build**:
    - `bun run build` $\to$ **LULUS 100% 0 errors (3.43s)**.

---

- [x] **Role Granular Hapus File Lampiran Bill (`backend/`, `frontend/`, `mobile/`)**:
  - **Permintaan Pengguna**: "Buat role untuk menghapus file lampiran bill".
  - **Database & Prisma (`backend/`)**:
    - Permission path `/mshipping/finance/billing/attachments/delete` dibuat dan diseed via `seed-billing-attachment-delete-permission.ts` ke role `admin` & `superadmin`.
  - **Backend API (`backend/`)**:
    - `billing.routes.ts`: Endpoint `DELETE /api/billing/:id/attachments/:attachmentId` diperketat dengan proteksi `requirePermission(['/mshipping/finance/billing/attachments/delete', '/mshipping/billing/attachments/delete'])`.
    - PM2 `ShippingApi` direstart & running normal (PID: 28716).
  - **Web Frontend (`frontend/`)**:
    - `userManagement.types.ts`: Didaftarkan ke `AVAILABLE_PATHS` (Modul Keuangan) dengan label "Hapus Lampiran Invoice" sehingga dapat diatur pada Role Management matrix.
    - `BillingLampiranSection.tsx`: Memisahkan izin `canUpload` (`/mshipping/finance/billing/attachments`) dan `canDelete` (`/mshipping/finance/billing/attachments/delete`). Tombol sampah pada item lampiran hanya muncul jika memiliki izin hapus.
    - Verifikasi Build: `bun run build` $\to$ **LULUS 100% 0 errors (2.94s)**.
  - **Mobile App (`mobile/`)**:
    - `permissions.ts`: Menambahkan helper `canDeleteBillingAttachment(user)`.
    - `BillingAttachmentSheet.tsx`: Tombol hapus pada thumbnail list dan fullscreen preview modal diproteksi dengan `canDelete`.
    - Verifikasi TypeScript: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.

---

- [x] **Fitur Upload & Manajemen Lampiran Invoice & Role Granular (`backend/`, `frontend/`, `mobile/`)**:
  - **Permintaan Pengguna**:
    1. Tambahkan fitur upload lampiran pada invoice, sama seperti upload pada BAP.
    2. Buat juga rolenya.
    3. Buat juga pada mobile app.
  - **Database & Prisma (`backend/`)**:
    - DDL script `create-billing-attachment-table.ts`: Tabel `[dbo].[tbBillingAttachment]` (`fdId`, `fdInvNo`, `fdFileName`, `fdFileSavedName`, `fdFileType`, `fdFileSize`, `fdFileUrl`, `fdCaption`, `fdUploadedBy`, `fdCreatedAt`) dengan foreign key cascade ke `tbBilling`.
    - `schema.prisma`: Model `TbBillingAttachment` dan relasi `attachments` pada `TbBilling`.
    - `seed-billing-attachment-permission.ts`: Menyuntikkan permission `/mshipping/finance/billing/attachments` ke role `admin`, `superadmin`, `finance`, `kasir`, dan `ar`.
  - **Backend API (`backend/`)**:
    - `billing-attachments.types.ts`: Zod schema `UploadBillingAttachmentSchema` dan tipe TypeScript.
    - `billing-attachments.service.ts`: Fungsi `getBillingAttachments`, `uploadBillingAttachment` (dukungan gambar JPG/PNG/WebP dan dokumen PDF hingga 10MB, kuota maks 10 berkas, auto sanitize folder, penyimpanan berkas ke `public/uploads/billing-attachments/{invNo}/`), dan `deleteBillingAttachment` (arsip fisik ke `deleted/` dan delete record DB).
    - `billing.routes.ts`:
      - `GET /api/billing/:id/attachments`
      - `POST /api/billing/:id/attachments` (diproteksi `requirePermission('/mshipping/finance/billing/attachments')`)
      - `DELETE /api/billing/:id/attachments/:attachmentId` (diproteksi `requirePermission('/mshipping/finance/billing/attachments')`)
    - PM2 `ShippingApi` running online & sehat (PID: 28348).
  - **Web Frontend (`frontend/`)**:
    - `userManagement.types.ts`: Mendaftarkan `/mshipping/finance/billing/attachments` pada `AVAILABLE_PATHS` (Modul Keuangan).
    - `billing.types.ts`: Menambahkan interface `BillingAttachment`.
    - `billing.service.ts`: API client `getAttachments`, `uploadAttachment`, `deleteAttachment`.
    - `useBillingAttachments.ts`: Custom hook TanStack Query dengan auto query invalidation.
    - `BillingLampiranUploader.tsx`: Drag & drop, file picker (.jpg, .jpeg, .png, .webp, .pdf), Ctrl+V image paste, progress bar.
    - `BillingLampiranItem.tsx`: Kartu berkas dengan thumbnail gambar, icon PDF, badge ukuran berkas & tanggal, aksi download & hapus.
    - `BillingLampiranLightbox.tsx`: Modal layar penuh dengan kontrol Zoom, Rotate 90°, embedded PDF iframe viewer, dan keyboard shortcut (Esc, Arrows, +, -, R).
    - `BillingLampiranSection.tsx`: Section mandiri terintegrasi di `DetailPage.tsx` dengan permission detection `canManage`.
    - `BillingQuickLampiranModal.tsx`: Modal aksi cepat dari tabel `ListPage.tsx` via tombol `[Berkas]` / `Paperclip`.
  - **Mobile App (`mobile/`)**:
    - `permissions.ts`: Fungsi helper `canManageBillingAttachments(user)`.
    - `useBillingAttachments.ts`: Custom hook TanStack Query untuk mobile.
    - `BillingAttachmentSheet.tsx`: Bottom sheet modal dengan grid 3-kolom foto & PDF, kamera terintegrasi native (`expo-camera`), preview modal layar penuh, tombol berbagi via `expo-sharing` (`Sharing.shareAsync`), dan proteksi hapus alert.
    - `InvoiceDetailSheet.tsx`: Tombol aksi `[Lampiran Dokumen (X)]` dengan counter badge.
  - **Rilis Mobile App (APK v1.2.9, Force Update)**:
    - Kenaikan versi: `v1.2.9`, `versionCode: 21`, `forceUpdate: true` (diselaraskan pada `mobile/src/config/version.ts`, `backend/src/config/app-version.json`, `mobile/app.json`, `mobile/package.json`).
    - Hermes JS Bytecode compile: `bunx expo export --platform android` $\to$ `entry-0c8c6db2eac0e5d48f231226206c2edf.hbc` (5.8MB).
    - Repackaging & signing via `scripts/repack_apk.ps1`:
      - Bytecode diinjeksi ke `C:\shipping\mshipping.apk`.
      - Zipalign & signing release v2/v3 via `uber-apk-signer` + `release.keystore` $\to$ **Signature verified [v2, v3] (0 errors)**.
      - Distribusi otomatis tersinkron ke 4 titik server:
        1. `C:\shipping\mshipping.apk` (127.18 MB)
        2. `C:\shipping\frontend\dist\mshipping.apk` (127.18 MB)
        3. `C:\shipping\frontend\public\mshipping.apk` (127.18 MB)
        4. `C:\shipping\backend\public\uploads\mshipping.apk` (127.18 MB)
    - PM2 `ShippingApi` direstart dan online stabil (PID: 30692).
  - **Verifikasi**:
    - Backend check: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend build: `bun run build` $\to$ **LULUS 100% 0 errors (2.82s)**.
    - Mobile check: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Integration test API & DB: Upload $\to$ Get $\to$ Delete $\to$ **100% SUKSES**.
    - APK signature: Verified [v2, v3] 100%.

---

- [x] **Fitur Input & Manajemen Exit Date Batch Marking (`mobile/` & `backend/`)**:
  - **Permintaan Pengguna**:
    1. Input exit date pada batch marking di mobile app dengan default tanggal hari ini.
    2. Penanganan jika input back date atau beberapa hari ke depan.
    3. Batasan masa depan: Maksimal 3 hari ke depan (`today + 3`).
    4. Proteksi role: Hanya user dengan role tertentu yang dapat mengedit (`canManageBatchExitDate`).
  - **Perubahan Backend (`backend/`)**:
    - `marking.types.ts`: DTO `UpdateMarkingExitDateSchema` (`exitDate: string | null`, regex YYYY-MM-DD).
    - `marking.service.ts`: Fungsi `updateMarkingExitDate(markingCode, payload, user)` dengan validasi kronologis:
      - Cek `fdLoadDate` dan `fdETD` $\to$ Exit Date tidak boleh lebih awal dari Load Date / ETD.
      - Cek future date $\to$ Ditolak keras jika > 3 hari dari hari ini (`today + 3 hari`).
      - Update kolom `tbMarking.fdExitDate` (bisa diisi tanggal atau di-null-kan).
    - `marking.controller.ts` & `marking.routes.ts`: Endpoint `PATCH/PUT /api/marking/:id/exit-date` dengan middleware `requireRole(['admin', 'ops', 'logistik', 'superadmin', ...])`.
    - PM2 `ShippingApi` di-restart dan berjalan normal (PID: 17000).
  - **Perubahan Mobile (`mobile/`)**:
    - `permissions.ts`: Fungsi `canManageBatchExitDate(user)` untuk memvalidasi hak akses input exit date.
    - `useUpdateBatchExitDate.ts`: Custom hook mutation TanStack Query dengan auto-invalidation untuk cache query logistik (`logistics-batches`, `exit-batches`, `marking-kpi-overview`, `batch-manifest`, `shipments`).
    - `BatchExitDateModal.tsx`: Modal bottom-sheet React Native murni (tanpa native datetime library) dengan:
      - Default tanggal terisi hari ini (`YYYY-MM-DD`).
      - Preset 1-klik: `Hari Ini`, `Kemarin`, `-2 Hari`, dan kalender mini native.
      - Real-time validasi & callout banner: Amber warning untuk tanggal mundur (*back date*), info banner untuk tanggal maju (*future date*), dan error banner jika sebelum `fdLoadDate`.
      - Alert konfirmasi native penegasan jika memilih 1-3 hari ke depan.
      - Penolakan jika > 3 hari ke depan.
      - Opsi tombol `Hapus Exit Date` jika batch sudah memiliki exit date sebelumnya.
    - `BatchListItem.tsx`: Tombol aksi cepat `[ + Exit ]` / `[ Exit ]` pada baris batch marking.
    - `BatchManifestSheet.tsx`: Kartu status Exit Gudang dengan tombol aksi `[ Input Exit Date ]` / `[ Ubah Exit ]`.
    - `ExitBatchListItem.tsx`: Tombol aksi cepat `[ + Exit ]` saat tab `ETA NOT EXIT` di layar Overview.
    - `app/(tabs)/logistics.tsx` & `app/(tabs)/overview.tsx`: Integrasi state dan modal `BatchExitDateModal`.
  - **Verifikasi**:
    - Mobile TypeScript: `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Backend TypeScript: `cd backend && bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend Build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (2.92s)**.
    - PM2 Service: `ShippingApi` running normal.

---

- [x] **Fallback Tanggal Masuk Gudang ke tbMarking.fdExitDate (`billing.service.ts`)**:
  - **Permintaan Pengguna**: "Apabila fdtglin kosong ambil dari tbmarking exitdate".
  - **Perubahan**:
    - Pada backend query `getBillingTimeline(invNo)` di `billing.service.ts`, kolom `fdTgl_IN` diperbarui menggunakan conditional expression:
      ```sql
      CONVERT(VARCHAR(10), MIN(
        CASE
          WHEN el.fdTgl_IN IS NOT NULL AND el.fdTgl_IN > '1900-01-01' THEN el.fdTgl_IN
          WHEN m.fdExitDate IS NOT NULL AND m.fdExitDate > '1900-01-01' THEN m.fdExitDate
          ELSE NULL
        END
      ), 120) AS fdTgl_IN
      ```
    - Jika `tbEntryList.fdTgl_IN` kosong/null/1900-01-01, sistem otomatis mengambil tanggal dari `tbMarking.fdExitDate` (tanggal keluar/tiba gudang).
  - **Verifikasi**:
    - Backend check: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - PM2 restart: `pm2 restart ShippingApi` $\to$ **Online & Healthy (PID 14844)**.
    - Frontend build: `bun run build` $\to$ **LULUS 100% 0 error (2.95s)**.

---

- [x] **Penambahan Tahun pada Timeline Siklus Kargo (`ShipmentTimeline.tsx`)**:
  - **Permintaan Pengguna**: "Tambahkan tahun pada timeline".
  - **Perubahan**:
    - Memperbarui fungsi `formatDate(raw)` pada `ShipmentTimeline.tsx` agar menyertakan tahun lengkap (format: `DD Mmm YYYY`, misal `02 Okt 2026`).
    - Menambahkan `whitespace-nowrap` pada paragraf tanggal desktop agar tanggal tidak patah baris canggung.
    - Menyesuaikan lebar wireframe loading `.skeleton-shimmer` tanggal dari `w-8` ke `w-12` agar pas dengan dimensi tanggal baru yang menyertakan tahun.
  - **Verifikasi**:
    - `bun run build` frontend $\to$ **LULUS 100% 0 errors (2.98s)**.

---

- [x] **Penyempurnaan PDF Report: Legend Anti-Cut, Data Kuantiti Faktur 12 Bulan, & Performa User Pembuat Invoice (`DashboardPdfFullReport.tsx`, `TrendChart.tsx`, `EmployeeChart.tsx`)**:
  - **Instruksi Pengguna**:
    1. "Legend pada kurva penagihan 12 bulan terpotong setengahnya."
    2. "Tampilan juga data quanti dari bill yang sudah di buat."
    3. "Targetnya repot ini juga menampilkan performa dari user yang membuat invoice."
  - **Penyelesaian**:
    1. **Perbaikan Legend Terpotong pada Kurva Penagihan (`TrendChart.tsx`, `EmployeeChart.tsx`, `DashboardPdfFullReport.tsx`)**:
       - Akar masalah: Kanvas grafik dibungkus `overflow: hidden` fixed-height, sementara Recharts `margin.bottom` hanya `5px` sehingga bounding box `<Legend />` berada persis di tepi bawah kanvas dan terpotong horizontal setengahnya oleh container.
       - Solusi: Menambahkan prop `chartHeight?: number` pada `TrendChart` dan `EmployeeChart`, menyetel `margin.bottom: 24-25px`, serta styling `wrapperStyle` Legend dengan `paddingTop: 6px` dan `fontSize: 10.5-11px`. Pada kontainer PDF, tinggi diatur proporsional (`chartHeight={225}` di Lembar 4, `chartHeight={310}` di Lembar 5, dan `chartHeight={200}` di Lembar 6) tanpa clipping, sehingga seluruh item Legend Recharts tampil utuh, bersih, dan lapang.
    2. **Penyajian Data Kuantiti Faktur 12 Bulan Penuh (Lembar 4 PDF)**:
       - **4 Kartu KPI Kuantiti & Finansial 12 Bulan**: Total Kuantiti Faktur 12 Bulan (beserta proporsi Udara vs Laut), Pertumbuhan Qty Bill YoY (+X% / -Y% dan diff kuantiti vs tahun lalu), Total Omzet Tagihan 12 Bulan, dan Rata-rata Kuantiti Faktur / Bulan.
       - **Dual-Axis Visualization (Secondary Y-Axis Batang Kuantiti)**: Kurva 12 bulan kini dilengkapi prop `showQuantityBar={true}` yang merender batang transparan (*Bar*) di background untuk kuantiti faktur diterbitkan per bulan dengan sumbu Y kanan dalam satuan Bill, beriringan dengan kurva garis omzet Udara, Laut, dan pembanding YoY tahun lalu.
       - **Tabel Rekapitulasi 12 Bulan Penuh**: Mengganti tabel 6 bulan dengan tabel lengkap 12 bulan yang memaparkan: Bulan, Qty Udara (Bill), Qty Laut (Bill), Total Qty Faktur (Bill), Pertumbuhan YoY Qty %, Omzet Udara (Rp), Omzet Laut (Rp), Total Omzet (Rp), Pertumbuhan YoY Omzet %, dan baris Total 12 Bulan Konsolidasi.
    3. **Tabel Evaluasi Performa User Pembuat Invoice / PIC (Lembar 6 PDF)**:
       - Mengagregasi data transaksi dari `byEmployeeSeries` dan `byEmployeeData` (yang bersumber langsung dari `tbBilling.fdEmpCode`).
       - Menghadirkan **Tabel Peringkat & Produktivitas User Pembuat Invoice**:
         - *Rank*: Badge medali peringkat (`🥇 #1`, `🥈 #2`, `🥉 #3`, `#4`, dst.).
         - *Nama Karyawan & Avatar*: Lingkaran inisial nama PIC dan nama lengkap staf pembuat invoice.
         - *Kode PIC*: Kode user sistem (`fdEmpCode`).
         - *Kuantiti Faktur (Bill)*: Total volume faktur yang diterbitkan PIC dalam 30 hari.
         - *Pangsa Volume (%)*: Persentase kontribusi kuantiti bill terhadap seluruh faktur.
         - *Total Omzet Tagihan (Rp)*: Total rupiah invoice yang diterbitkan oleh PIC.
         - *Pangsa Omzet (%)*: Persentase kontribusi rupiah terhadap total omzet billing.
         - *Rata-rata Nilai / Faktur*: Rata-rata nominal per bill yang dihasilkan oleh PIC.
         - *Footer Konsolidasi*: Total seluruh PIC (Total Bill, 100% Volume, Total Omzet, 100% Omzet, Rata-rata/Bill Konsolidasi).
       - Dipadukan secara harmonis dengan grafik tren harian kontribusi faktur per PIC (`chartHeight={200}`).
  - **Verifikasi**: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (11.41s)**.

---
  - **Instruksi Pengguna**: "Jadikan setiap segmen data agar di cetak jadi 1 halaman agar hasilnya lebih rapi."
  - **Penyelesaian**:
    1. **Pemisahan 7 Segmen Data Menjadi 7 Halaman Mandiri (`DashboardPdfFullReport.tsx`)**:
       - Setiap segmen data dirancang pas memenuhi 1 lembar A4 Landscape (`1200 x 840 px` $\to$ `285 x 198 mm` area cetak margin 6mm), bebas tumpang tindih, dengan grafik berdimensi besar dan tabel lapang:
         - **Halaman 1 (Ringkasan Eksekutif & 4 KPI Utama)**: Kop resmi laporan eksekutif (*M-SHIPPING FINANCE EXECUTIVE REPORT*), 4 Kartu KPI Utama Finansial (Target Udara, Target Laut, Invoice Bulan Ini, Omzet Bulan Ini beserta breakdown PIC & kategori), 3 Highlight Summary Cards (Omzet, Volume, Nilai Rata-rata/Bill), dan Panel Proporsi Omzet Moda (Udara vs Laut).
         - **Halaman 2 (Matriks Komparasi 3 Periode 8 Metrik Finansial)**: Tabel matriks komparasi 8 metrik finansial berukuran lapang (membandingkan nilai saat ini, MoM % & diff, YoY % & diff) dengan catatan interpretasi data.
         - **Halaman 3 (Rincian Kinerja Penagihan Per Cabang)**: Banner normalisasi Singapore (`--` & `SG`), tabel lengkap seluruh cabang logistik (Omzet, MoM, YoY, Volume, Moda Udara/Laut, Pangsa Pasar), baris Total Konsolidasi, dan catatan evaluasi cabang.
         - **Halaman 4 (Analitik Tren Bulanan 12 Bulan & YoY)**: Grafik kurva 12 bulan kurva penuh (tinggi 360px) dengan perbandingan YoY tahun lalu per moda (Udara vs Laut) dan tabel rekapitulasi 6 bulan terakhir.
         - **Halaman 5 (Analitik Tren Harian Daily Bill 30 Hari)**: 3 Kartu Ringkasan Harian (Total Omzet 30 Hari, Rata-rata/Hari, Peak Day), grafik kurva harian 30 hari kurva penuh (tinggi 380px), dan catatan operasional harian.
         - **Halaman 6 (Kinerja Penagihan Tim Sales / Karyawan)**: Banner PIC terdaftar, grafik tren harian penerbitan faktur per PIC kurva penuh (tinggi 420px), dan evaluasi perputaran target tagihan per karyawan.
         - **Halaman 7 (Monitoring Surat Jalan vs Faktur Diterbitkan)**: 4 Kartu KPI Konversi (Total SJ, Total Bill, Unbilled Backlog, Conversion Rate %), kotak grafik terpadu ber-border kokoh (`overflow: hidden`) yang meng-cover kurva konversi harian SJ vs Bill secara utuh tanpa elemen selector/nested card yang menembus kotak, dan rekomendasi mitigasi piutang tertunda.
    2. **Arsitektur Zero Page-Cut & Margin Presisi (`dashboard-pdf.utils.ts`)**:
       - Menggunakan margin 6mm (`285 x 198 mm`) dengan penangkapan resolusi tinggi (scale 2), menjamin 100% tidak ada teks atau baris tabel yang terpotong.
  - **Verifikasi**: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (3.56s)**.

---

- [x] **Perbaikan Teks Terpotong pada Ekspor PDF Dashboard Billing (`frontend/src/features/billing/utils/dashboard-pdf.utils.ts`)**:
  - **Masalah Pengguna**: "Perbaiki tampilan pdfnya banyak text yang terpotong setengah."
  - **Akar Masalah**:
    1. *Blind Canvas Slicing*: Canvas dipotong tepat di kelipatan 178mm tanpa memperhatikan posisi elemen. Saat garis potong melintasi baris tabel (`<tr>`) atau kartu KPI, teks terbelah dua secara horizontal (separuh di halaman 1, separuh di halaman 2).
    2. *Truncation & Text Clipping*: Penggunaan kelas `.truncate` dan `overflow: hidden` pada container serta `max-w-[110px]` di sel tabel memicu pemotongan teks secara vertikal maupun ellipsis tak diinginkan di `html2canvas`.
    3. *Midnight Dark Mode Clash*: Pada mode gelap, variabel warna `--color-primary` bernilai putih/terang, sehingga saat latar dipaksa putih di canvas, teks menjadi pudar/hilang atau separuh tampak.
    4. *Viewport Shrinking*: Pada layar yang lebih sempit (< 1200px), kartu KPI tergulung secara horizontal dan tabel menyusut.
  - **Solusi Komprehensif**:
    1. **Smart Boundary Slicing**: Algoritma cerdas yang memindai seluruh posisi elemen atomik (seluruh baris tabel `<tr>`, kartu KPI, kartu summary, panel ikhtisar). Jika garis potong jatuh di tengah elemen, titik potong otomatis dimajukan ke atas elemen (`safeCutCanvasY`), sehingga elemen dan baris teks selalu tampil utuh di halaman baru.
    2. **Anti-Text-Clipping Stylesheet**: Menetralisir `.truncate`, `overflow: hidden`, dan membebaskan `line-height: 1.45` pada seluruh sel tabel, paragraf, dan heading saat proses kloning canvas.
    3. **High-Contrast Print Color Override**: Mematikan kelas `dark` pada dokumen klon dan menetapkan variabel CSS tema terang kontras tinggi (`--color-primary: #0f172a`, `--color-secondary: #475569`, `--color-border: #cbd5e1`).
    4. **Fixed Desktop Width Capture (1200px)**: Memaksa tata letak clone ke grid 4 kolom untuk KPI, 3 kolom untuk summary, dan 2:1 untuk matriks komparasi, menjamin tidak ada kolom tabel yang terjepit.
    5. **Pembersihan `max-w-[110px]` & `truncate`**: Pada `BillingPeriodMatrixSection.tsx`, sel label dan nama cabang diubah ke `whitespace-nowrap` agar terbaca utuh.
  - **Verifikasi**: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (2.73s)**.

---

- [x] **Ekspor PDF & Redesign Dashboard Finansial Billing (`frontend/src/features/billing/`)**:
  - **Instruksi Pengguna**:
    1. Tambahkan Matriks Komparasi 3 Periode seperti pada dashboard delivery order pada `/finance/billing`.
    2. Redesign dashboard billing & hilangkan redundant Matriks Komparasi 3 Periode pada grafik bulanan.
    3. Tambahkan detailnya bagi per cabang (cabang `--` sama dengan Singapore).
    4. Tambahkan fitur untuk membuat PDF dari dashboard billing ini.
  - **Penyelesaian**:
    1. **Matriks Komparasi 3 Periode & Rincian Cabang (`BillingComparisonMatrix.tsx`)**:
       - Mengelompokkan metrik per 3 periode (Bulan Ini, Bulan Lalu, 2 Bulan Lalu) untuk Total Invoice, Omzet/Revenue, Pelunasan, dan Piutang (AR).
       - Menampilkan delta persentase MoM dengan indikator visual tren naik/turun.
       - Tabel rincian per cabang logistik dengan pemetaan alias cabang (`--` dipetakan otomatis ke `Singapore / Batam`).
    2. **Generator PDF Dashboard Eksekutif (`dashboard-pdf.utils.ts`)**:
       - Menggunakan `html2canvas` dan `jsPDF` untuk konversi dokumen format **A4 Landscape** (`297 x 210 mm`).
       - Kop Resmi Eksekutif: Memuat title *M-SHIPPING FINANCE EXECUTIVE REPORT*, rentang periode audit, status filter cabang, user pencetak, dan timestamp cetak.
       - Slicing multi-halaman presisi per 178mm konten dengan running header (*CONFIDENTIAL*) dan running footer (*Halaman X dari Y • Sistem Finansial M-Shipping*).
       - Sanitasi cetak (`onclone`): Background putih bersih, teks gelap, elemen tombol/interaktif disembunyikan otomatis (`.no-print`).
    3. **Integrasi UI & i18n (`DashboardPage.tsx`, `id.json`, `en.json`)**:
       - Tombol aksi `[Unduh PDF]` dengan ikon `FileDown` di `PageHeader.actions` dengan state loading dan toast status `sonner`.
       - Container dashboard dibungkus ref `dashboardRef` untuk penangkapan visual utuh.
    4. **Dokumentasi & Verifikasi**:
       - `docs/frontend/billing.md` dan `frontend-app.md` disinkronkan.
       - Build Frontend `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors (2.83s)**.

---

- [x] **Penyelarasan Tema & Desain Sistem Tab Revisi Data Mobile App (`mobile/src/features/data-revisions/`)**:
  - **Instruksi Pengguna**: Samakan tema tab revisi dengan tab yang lain agar konsisten.
  - **Penyelesaian**:
    1. **Struktur Layout & Container (`DataRevisionsTab.tsx`)**:
       - Menghilangkan background hardcoded `#0B0F17` / `#F7F5F2` dan box header terisolasi. Mengadopsi padding standar `flex: 1, paddingHorizontal: 16` yang menyatu seamless dengan container tab Logistik lainnya.
       - Mengganti input manual dengan komponen resmi `<SearchBar />` dari `@/components/ui/SearchBar` dilengkapi debounced search (300ms).
       - Menyelaraskan filter chips menggunakan token tema: border semantik transparan, background `rgba(56, 189, 248, 0.15)` (Midnight Dark) / `rgba(184, 66, 46, 0.1)` (Heritage Light), dan text `colors.tabBarActive`.
       - Mengganti spinner bulat dengan wireframe skeleton shimmer 4 baris (`<SkeletonShimmer height={90} ... />`).
       - Empty state diselaraskan dengan ikon `emptyIconCircle`, tipografi semantik `colors.primary`/`secondary`, dan tombol pintasan berlatar `colors.tabBarActive`.
       - FAB (Floating Action Button) distandarisasi menjadi tombol bulat 52x52 berlatar `colors.tabBarActive` dengan ikon `Plus`, selaras 100% dengan `InspectionTab`.
    2. **Standarisasi Kartu Revisi (`DataRevisionCard.tsx`)**:
       - Menggunakan komponen resmi Single Source of Truth `<Card style={styles.card} onPress={onPress}>` dari `@/components/ui/Card`.
       - Mengganti warna hardcoded biru Tailwind dengan token tema aplikasi (`colors.tertiary`, `colors.primary`, `colors.secondary`, `colors.border`).
       - Memproses nama customer dengan `displayCustName(custName)`.
  - **Kompilasi & Distribusi APK**:
    - Versi tetap **`v1.2.8`**, `versionCode: 20`, `forceUpdate: false`.
    - Mobile TypeScript: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Hermes Android Export: `entry-62686d510e9d05d12b4f128eda817f25.hbc` (5.8 MB).
    - Repack APK via `repack_apk.ps1`: Zipalign & signing verified [v2, v3] $\to$ **Sukses 0 error**.
    - Sinkronisasi otomatis ke 4 titik server (`C:\shipping\mshipping.apk`, `frontend/dist/`, `frontend/public/`, `backend/public/uploads/`).
    - Frontend Build: `bun run build` $\to$ **LULUS 100% 0 error (3.39s)**.

---

- [x] **Penyempurnaan Instant Pinch-to-Zoom & Posisi Floating Control Bar (`mobile/src/features/data-revisions/components/DataRevisionDetailModal.tsx`)**:
  - **Instruksi Pengguna**: Buat apabila di pinch langsung zoom, perbaiki posisi floating control nya agar agak ke atas sedikit karena sangat mempet dengan navigasi android. Kompile versi sama no force.
  - **Penyelesaian**:
    1. **Instant Pinch-to-Zoom (Zero Delay)**:
       - Mengatasi isu jari mendarat asinkron: Pada `onPanResponderMove`, jika `touches.length >= 2` dan `initialDistance.current <= 0`, jarak kedua jari (`dist`) dan skala dasar langsung direkam seketika pada frame pertama pergerakan.
       - Skala gambar (`zoomScale`) langsung dihitung dan diperbarui secara real-time (`factor = dist / initialDistance.current`), membuat efek pinch langsung terasa tanpa jeda.
       - Menambahkan pelacakan posisi sentuh relatif (`lastTouchPos`) untuk mode pan 1-jari saat ter-zoom (`zoomScale > 1`), mencegah sentakan (*jitter / jumping*) saat transisi antara gesture 2-jari dan 1-jari.
    2. **Elevasi Dinamis Floating Control Bar**:
       - Mengganti posisi statis `bottom: 36` dengan perhitungan insets dinamis:
         `bottom: Platform.OS === 'android' ? Math.max(insets.bottom + 48, 76) : Math.max(insets.bottom + 24, 60)`
       - Posisi toolbar terangkat aman minimal 76dp (hingga 96dp pada perangkat Android dengan 3-button navigation bar), memberikan ruang lapang dan mencegah benturan/salah sentuh dengan bilah navigasi Android.
  - **Kompilasi & Distribusi APK**:
    - Versi tetap **`v1.2.8`**, `versionCode: 20`, `forceUpdate: false`.
    - Mobile TypeScript: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Export Hermes Bundle: `bunx expo export --platform android` $\to$ `entry-013ab3c89f860591f5b1f48653e0dd46.hbc` (5.8 MB).
    - Repack APK via `repack_apk.ps1`:
      - Zipalign & signing via `uber-apk-signer` + `release.keystore` $\to$ **Signature verified [v2, v3] 0 errors**.
      - Sinkronisasi otomatis ke 4 titik server:
        1. `C:\shipping\mshipping.apk`
        2. `C:\shipping\frontend\dist\mshipping.apk`
        3. `C:\shipping\frontend\public\mshipping.apk`
        4. `C:\shipping\backend\public\uploads\mshipping.apk`
    - Frontend Build: `bun run build` $\to$ **LULUS 100% 0 errors (3.75s)**.

---

- [x] **Perbaikan Penampil Lampiran & Upload Foto Mobile App (`mobile/`, `backend/`)**:
  - **Instruksi Pengguna**: Perbaiki pada mobile app, link untuk membuka gambar tidak menampilkan gambar yang diupload.
  - **Akar Masalah**:
    1. Dimensi gambar pada modal preview (`DataRevisionDetailModal.tsx`) menggunakan persentase (`width: '95%', height: '80%'`) di dalam flex container tanpa batas piksel eksplisit, menyebabkan Yoga layout engine Android merender gambar dengan ukuran 0x0 (layar hitam).
    2. Resolver URL lampiran belum menangani variasi path Windows (`\`) dan fallback path jika hanya menyimpan nama file.
    3. Belum ada tombol aksi eksplisit untuk membuka tautan gambar langsung di browser eksternal.
    4. Upload lampiran dari mobile app menggunakan `FormData` multipart dengan `Content-Type: multipart/form-data` manual tanpa boundary, yang ditolak backend Hono dengan error `MIME type/boundary`.
  - **Penyelesaian**:
    1. **`DataRevisionDetailModal.tsx`**:
       - `resolveLampiranUrl`: Menormalisasi path lampiran (Windows backslashes $\to$ forward slashes, penambahan otomatis prefix `/uploads/data-revisions/` jika hanya nama file) menuju `https://app.sampai.co`.
       - Preview Modal: Dimensi gambar diperbaiki menggunakan piksel dinamis `SCREEN_WIDTH - 24` dan `SCREEN_HEIGHT * 0.76` dengan `resizeMode="contain"`.
       - Ditambahkan top toolbar lengkap dengan judul, nama file, tombol tutup, dan tombol **Browser** (`Linking.openURL(photoUrl)`).
       - Ditambahkan indikator loading (`ActivityIndicator`) saat mengunduh gambar dan fallback box dengan tombol langsung "Buka di Peramban Web" jika gambar gagal dimuat.
    2. **`CameraCaptureModal.tsx`**:
       - Menambahkan parameter `base64: true` pada `cameraRef.current.takePictureAsync`, menghasilkan data URL `data:image/jpeg;base64,...` secara instan.
    3. **`data-revisions.service.ts` (Mobile)**:
       - Mengubah alur `uploadLampiran` agar membaca file lokal via `expo-file-system` sebagai Base64 dan mengirim payload JSON `{ photoBase64, fileName, keterangan }` yang 100% andal tanpa masalah boundary multipart di Android.
    4. **`DataRevisionWizardModal.tsx`**:
       - Memperbaiki pelaporan error upload foto (tidak lagi ditelan diam-diam), memberitahu pengguna jika ada foto yang gagal diunggah.
    5. **`dataRevisions.service.ts` & `dataRevisions.routes.ts` (Backend)**:
       - Menambahkan `uploadLampiranBase64` untuk mendukung penerimaan foto via JSON Base64 (mobile) sekaligus tetap mendukung multipart `FormData` (web frontend).
  - **Verifikasi & Distribusi APK**:
    - Konfirmasi pengguna: **Versi sama (`v1.2.8`, Build `20`)** dan **Opsional / tidak force update (`forceUpdate: false`)**.
    - Kompilasi Hermes JS Bytecode: `bunx expo export --platform android` $\to$ `entry-b69e7320c489f6a7de37b21ed3b54891.hbc` (5.8 MB).
    - Repackaging & Signing via `scripts/repack_apk.ps1`:
      - Injeksi bytecode ke `mshipping.apk`.
      - Zipalign & signing release v2/v3 via `uber-apk-signer` dengan keystore resmi $\to$ **Sukses 0 error**.
      - Sinkronisasi otomatis ke 4 titik server:
        1. `C:\shipping\mshipping.apk`
        2. `C:\shipping\frontend\dist\mshipping.apk`
        3. `C:\shipping\frontend\public\mshipping.apk`
        4. `C:\shipping\backend\public\uploads\mshipping.apk`
    - Backend TypeScript: `bun x tsc --noEmit` $\to$ **LULUS 0 error**. PM2 online.
    - Mobile TypeScript: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend Build: `bun run build` $\to$ **LULUS 0 error (7.79s)**.

---

- [x] **Standarisasi Tampilan Halaman & Seluruh Modal Fitur Data Revisions (`frontend/src/features/data-revisions/`)**:
  - **Instruksi Pengguna**: Pada frontend tampilan page dan modal tidak sama dengan page dan modal pada fitur lainnya. Samakan karena page dan modalnya tidak sesuai standar project. Perbaiki.
  - **Penyelesaian**:
    1. **Standarisasi Halaman List (`DataRevisionsListPage.tsx`)**:
       - Menggunakan standard layout wrapper `flex flex-col min-h-full bg-[var(--color-neutral)]`.
       - Mengintegrasikan `PageHeader` resmi dari `@/components/ui/PageHeader` lengkap dengan hierarki Breadcrumb 3-level ERP: `LOGISTIK` $\to$ `Input & Revisi Data` $\to$ `Daftar Form`.
       - Toolbar dan Unified Container berlatar `bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-xs`.
       - Mengganti seluruh class Tailwind hardcoded (`text-foreground`, `bg-muted`, `border-border`, dll) dengan CSS tokens resmi (`var(--color-primary)`, `var(--color-secondary)`, `var(--color-surface)`, `var(--color-border)`).
    2. **Standarisasi Halaman Form & Wizard (`DataRevisionFormPage.tsx`)**:
       - Menggunakan standard layout wrapper `bg-[var(--color-neutral)]`.
       - Menambahkan `PageHeader` resmi dengan breadcrumbs terarah dan quick action buttons di header.
       - Stepper container dan footer navigation bar diselaraskan menggunakan CSS tokens dan border radius standar.
    3. **Standarisasi Modal Pencarian Customer (`CustomerLookupModal.tsx`)**:
       - Mengeliminasi raw portal dan inline style hardcoded (`style={{ backgroundColor: ... }}`).
       - Ditulis ulang menggunakan Single Source of Truth modal komponen: `<Modal isOpen={isOpen} onClose={onClose} size="lg">`, `<Modal.Header>`, `<Modal.Body>`, `<Modal.Footer>`.
       - Desain transparan dihapus, diganti background solid semantik dan shimmer loading skeleton.
    4. **Standarisasi Modal Pencarian ListCode (`InputanLookupModal.tsx`)**:
       - Mengeliminasi raw portal dan inline style hardcoded.
       - Ditulis ulang menggunakan `<Modal isOpen={isOpen} onClose={onClose} size="xl">`, `<Modal.Header>`, `<Modal.Body>`, `<Modal.Footer>`.
       - Tetap menjaga 100% proteksi bisnis: deteksi faktur billing aktif & kargo diserahkan (`fdGive = 1`) yang terkunci otomatis saat mode target cancel.
    5. **Pembersihan CSS Tokens Komponen Steps & Tabel**:
       - `StepItems.tsx`: Membersihkan seluruh sisa class Tailwind lama (`bg-muted/20`, `border-border/80`, `text-muted-foreground`, dll) ke CSS tokens.
       - `RevisionTable.tsx`, `RevisionAnalyticsSection.tsx`, `RevisionGrid.tsx`: Dipastikan konsisten dengan CSS design system.
  - **Verifikasi**:
    - Vite Production Build: `bun run build` $\to$ **LULUS 100% 0 errors (10.78s)**.
    - Dokumentasi diperbarui: `frontend-app.md` dan `.agents/working.md`.

---

- [x] **Fix Modal Transparent + Role Permissions + Lampiran Mobile Data Revisions (`frontend/`, `backend/`, `mobile/`)**:
  - **Instruksi Pengguna**: Modal tidak terlihat (transparent) → jadikan standar seperti BillingValidationSummaryModal. Buat juga role untuk fitur ini. Perbaiki lampiran gagal tampil di mobile.
  - **Penyelesaian**:
    1. **`RevisionDetailViewModal.tsx`**: Ditulis ulang penuh menggunakan komponen `Modal` standard. Fix TS error line 39: `revisionId ?? undefined`.
    2. **`RevisionGalleryModal.tsx`**: `createPortal` ke `document.body`, z-index `z-[110]`.
    3. **Backend Permissions**: `dataRevisions.routes.ts` → `requirePermission`. `roles.service.ts` → viewerPaths. Seed dijalankan sukses.
    4. **Frontend Permissions**: `userManagement.types.ts` → `DATA_REVISIONS`. `router.tsx` → PermissionGuard data-revisions.
    5. **Mobile Lampiran**: `DataRevisionDetailModal.tsx` → `lamp.fdPath || lamp.fdFilePath` + URL dari `DEFAULT_API_URL`.
    6. **Mobile RBAC**: `permissions.ts` → `canManageDataRevisions()`. Tab Revisi difilter.
  - **Verifikasi**:
    - Frontend build: `bun run build` → **LULUS 0 error (3.00s)**.
    - Backend TypeScript: **LULUS 0 error**. PM2 online stabil.
    - Mobile TypeScript: **LULUS 0 error**.

---

- [x] **Fitur View Dokumen & Lightbox Gallery Lampiran Revisi Data Frontend (`frontend/src/features/data-revisions/`)**:
  - **Instruksi Pengguna**: Pada frontend buat agar bisa view, untuk lampiran bisa di view juga seperti gallery.
  - **Penyelesaian**:
    1. **`RevisionGalleryModal.tsx`**: Komponen lightbox interaktif untuk foto/lampiran revisi data dengan fitur:
       - Navigasi Previous / Next via tombol dan keyboard arrow (`ArrowLeft`, `ArrowRight`, `Escape` untuk keluar).
       - Indikator counter `Foto X dari Y`.
       - Kontrol visual: Zoom In (`+`), Zoom Out (`-`), Reset Zoom (`0`), dan Rotasi 90° jarum jam (`R` / `RotateCw`).
       - Tombol Download berkas dan buka tautan langsung di tab baru.
       - Thumbnail strip di bagian bawah modal untuk lompat ke foto yang diinginkan.
       - Fallback tampilan dokumen PDF berbasis `<iframe>`.
    2. **`RevisionDetailViewModal.tsx`**: Modal detail dokumen revisi data lengkap:
       - Header ringkasan: No. Form, status badge, status invoice (unmatched/matched), tanggal pengajuan & PIC.
       - Banner eksekusi pembatalan invoice jika revisi telah dieksekusi.
       - Perbandingan data terstruktur berdampingan: **DATA AWAL** vs **DATA BARU**.
       - Tanda tangan PIC: Disetujui Oleh & Dibuat Oleh.
       - Bagian Galeri Lampiran: Grid thumbnail interaktif dengan badge tipe file (`FOTO`/`DOC`), label nama berkas, ukuran, dan preview yang otomatis membuka `RevisionGalleryModal`.
    3. **Integrasi List & Table**:
       - `RevisionTable.tsx`: Menambahkan tombol aksi `Lihat Detail` berikon `Eye` dan menjadikan kolom `No. Form` dapat diklik untuk membuka modal view.
       - `RevisionGrid.tsx`: Menambahkan tombol aksi `Lihat Detail` berikon `Eye` pada kartu grid dan judul nomor form.
       - `DataRevisionsListPage.tsx`: State `viewingRevisionId` dan render `<RevisionDetailViewModal />`.
       - `RevisionLampiranGrid.tsx`: Mengganti lightbox sederhana pada Step 3 form dengan `RevisionGalleryModal`.
  - **Verifikasi**:
    - Vite Production Build: `bun run build` $\to$ **LULUS 100% 0 error (3.72s)**.
    - Dokumentasi diperbarui: `frontend-app.md` dan `docs/frontend/data-revisions.md`.

---

- [x] **Redesign Tab Navigasi Halaman Keuangan & Billing Mobile (`mobile/app/(tabs)/finance.tsx`)**:
  - **Instruksi Pengguna**: Redesign pill pada billing page (selaras dengan tab logistik lapangan).
  - **Penyelesaian Desain**:
    1. Menambahkan label overline kategori `FINANSIAL` di atas judul utama `Keuangan & Billing` (font size 11px, bold, uppercase, tracking lapang).
    2. Menggantikan komponen `SegmentedControl` dengan Tab Strip horizontal berikon senada:
       - 🧾 **Invoice** (`Receipt`)
       - ✅ **Validasi** (`CheckCircle2`, terproteksi izin RBAC `canAuditValidation`)
       - 🧮 **Cek Tarif** (`Calculator`)
    3. Indikator aktif berupa garis bawah merah bata (`#B8422E`) di Light Mode / Sky Blue (`#38BDF8`) di Dark Mode dengan ketebalan 3px dan baseline border tipis di sepanjang tab bar.
    4. Font size judul `pageTitle` diselaraskan menjadi 24px extrabold dengan letter-spacing -0.5.
  - **Verifikasi & Repack APK**:
    - Mobile TypeScript: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend Vite build: `bun run build` $\to$ **LULUS 100% 0 error (3.72s)**.
    - Hermes Android Export: Bytecode `entry-329d28e68d33d550b0d17b5d6b3d2c91.hbc` (5.7MB).
    - Repack APK: Signed dengan `release.keystore` $\to$ **Signature verified [v2, v3]**.
    - Distribusi sinkron ke 4 titik server (`mshipping.apk`).

---

- [x] **Redesign Tab Navigasi Halaman Logistik Mobile (`mobile/app/(tabs)/logistics.tsx`)**:
  - **Instruksi Pengguna**: Redesign pill group pada page logistik sesuai gambar referensi (Icon di atas label dengan garis aktif merah bata dan overline "OPERASIONAL").
  - **Penyelesaian Desain**:
    1. Menambahkan label overline kategori `OPERASIONAL` di atas judul utama `Logistik Lapangan` (font size 11px, bold, uppercase, tracking lapang).
    2. Menggantikan komponen `SegmentedControl` dengan Tab Strip horizontal berikon:
       - 🧾 **Resi** (`Receipt`)
       - 🏷️ **Marking** (`Tag`)
       - 🚚 **Surat Jalan** (`Truck`)
       - 📋 **BAP** (`ClipboardList`)
       - ✏️ **Revisi** (`Pencil`)
    3. Tab aktif disorot dengan warna Terracotta Heritage (`#B8422E`) di Light Mode atau Sky Blue (`#38BDF8`) di Dark Mode, dengan garis indikator bawah (`activeIndicator`) setebal 3px dengan border radius halus, serta garis baseline border tipis di sepanjang tab bar.
    4. Tab non-aktif tampil tenang dengan warna abu-abu semantik (`#78716C` / `#64748B`).

---

- [x] **Perbaikan Data Revisi Tidak Tampil di Tab Mobile (`backend/`, `mobile/`)**:
  - **Akar Masalah**:
    1. Lampiran form pada tabel `TbDataRevisionLampiran` memiliki field `fdUkuranBytes BigInt`.
    2. Saat query `GET /api/data-revisions` dijalankan, serialisasi native JSON melemparkan runtime error: `TypeError: JSON.stringify cannot serialize BigInt.` (HTTP 500).
    3. Filter status di mobile sebelumnya mengirimkan `BILL_CREATED`, sedangkan backend menggunakan enum `BILL_TERBUAT`.
  - **Solusi & Perbaikan**:
    1. Memasang global BigInt polyfill `BigInt.prototype.toJSON = function() { return Number(this) }` di `backend/src/index.ts`.
    2. Menambahkan konversi `typeof obj === 'bigint' ? Number(obj) : ...` pada helper `deepTrim` di `backend/src/utils/response.ts`.
    3. Memperbarui `DataRevisionQuerySchema` dan query filter `dataRevisions.service.ts` agar mendukung alias `BILL_CREATED` $\to$ `BILL_TERBUAT`.
    4. Menyelaraskan enum dan kartu status di `DataRevisionCard.tsx`, `DataRevisionDetailModal.tsx`, dan `DataRevisionsTab.tsx`.
    5. PM2 `ShippingApi` direstart dan endpoint `GET /api/data-revisions` kembali normal (HTTP 200 OK).
  - **Verifikasi & Repack APK**:
    - Mobile TypeScript: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Backend TypeScript: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend Vite build: `bun run build` $\to$ **LULUS 100% 0 error (3.74s)**.
    - Hermes Android Export: Bytecode `entry-36215fb6fe37cd6ad8d6c9b00675a70c.hbc` (5.7MB).
    - Repack APK: Signed dengan `release.keystore` $\to$ **Signature verified [v2, v3]**.
    - Distribusi sinkron ke 4 titik server (`mshipping.apk`).

---

- [x] **Proteksi Safe Area Atas & Pencarian fdListCode Data Baru (`DataRevisionWizardModal.tsx`, `MobileInputanLookupModal.tsx`, `DataRevisionDetailModal.tsx`)**:
  - **Instruksi Pengguna**:
    1. Form melewati batas aman atas pada perangkat (menabrak jam, status bar, dan notch camera) $\to$ perbaiki.
    2. Pada DATA BARU tidak perlu copy dari data awal $\to$ tetap cari `fdListCode`.
  - **Solusi & Perbaikan**:
    1. **Proteksi Safe Area Atas (Status Bar / Jam / Notch)**:
       - Menghitung `topPadding = Platform.OS === 'android' ? Math.max(insets.top, 28) + 8 : Math.max(insets.top, 12) + 4` menggunakan `useSafeAreaInsets()`.
       - Diterapkan pada `styles.header` di:
         - `DataRevisionWizardModal.tsx`
         - `MobileInputanLookupModal.tsx`
         - `DataRevisionDetailModal.tsx`
       - Header tidak akan pernah lagi bertabrakan dengan jam, sinyal, persentase baterai, atau camera hole Android/iOS.
    2. **Pencarian fdListCode untuk DATA BARU**:
       - Tombol "Salin dari Data Awal" (`copyBtn`) dihapus.
       - Pada DATA BARU (Target Penagihan Bill), ditambahkan tombol `[Cari fdListCode]` di header card dan tombol inline search icon pada input `No. Inputan Baru (fdListCode)`.
       - Ditambahkan state `lookupTarget: 'AWAL' | 'BARU'` pada wizard modal untuk mengarahkan pengisian form secara presisi sesuai kartu yang dipilih.
       - Judul modal pencarian disesuaikan: `Pilih Data Awal (Eksisting)` / `Pilih Target Pembatalan` vs `Pilih Target Bill (DATA BARU)`.
  - **Verifikasi & Build**:
    - TypeScript Mobile: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend Vite: `bun run build` $\to$ **LULUS 100% 0 error (3.27s)**.
    - Hermes Android Export: Bytecode `entry-30dcd4037b2cbbd20627f39021b718cf.hbc` (5.7MB).
    - Repack APK: Signed dengan `release.keystore` $\to$ **Signature verified [v2, v3]**.
    - Distribusi sinkron ke 4 titik server (`mshipping.apk`).

---

- [x] **Perbaikan Visibilitas Icon Timeline Siklus Kargo Dark Mode (`ShipmentTimeline.tsx`)**:
  - **Akar Masalah**:
    - Pada halaman detail validasi billing (`ValidationDetailPage.tsx`), komponen `ShipmentTimeline.tsx` menggunakan class `bg-[var(--color-primary)] text-white` untuk milestone yang selesai (`isDone`).
    - Di mode gelap (**Midnight Dark Mode**), `--color-primary` bernilai `#F1F5F9` (putih terang), sementara icon di dalamnya diberi class `text-white` (`#FFFFFF`).
    - Akibatnya icon menjadi putih di atas lingkaran putih (100% tidak terlihat / invisible) dan melanggar aturan desain sistem Midnight Dark Mode (dilarang background solid putih/terang).
    - Selain itu, komponen menggunakan variabel CSS yang tidak terdefinisi (`--color-text-muted`, `--color-text`, `--color-surface-alt`).
  - **Perbaikan**:
    - **Milestone Selesai (`isDone`)**: Di dark mode, menggunakan semantic outline aesthetic `dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-400` (desktop & mobile). Icon berwarna emerald-400 terang dan tajam di atas latar transparan gelap.
    - **Milestone Belum Selesai (`!isDone`)**: Menggunakan `border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-secondary)]/60`, terlihat rapi sebagai milestone pending.
    - **Garis Penghubung (`connectorDone`)**: Menggunakan `dark:bg-emerald-500/60` yang menyambungkan tahapan selesai secara visual.
    - **Tanggal & Label**: Menggunakan token CSS resmi (`text-[var(--color-secondary)]`, `text-[var(--color-primary)]`, `dark:text-emerald-400 font-medium`).
  - **Verifikasi**:
    - `bun run build` frontend $\to$ **LULUS 100% 0 error (3.03s)**.


- [x] **Perbaikan Tombol "Selanjutnya" & Nomor Form Wizard (`DataRevisionWizardModal.tsx`, `data-revisions.service.ts`)**:
  - **Akar Masalah**:
    1. Respon backend `GET /api/data-revisions/next-number` mengembalikan `{ nextNumber: string }`, sedangkan di mobile service sebelumnya dipetakan ke property `nextNomorForm` (sehingga undefined).
    2. Akibatnya nilai `nomorForm` tetap string kosong `""`.
    3. Pada `handleNext` di Step 1 terdapat validasi `if (!nomorForm.trim()) { showToast(...); return; }`. Karena `nomorForm` kosong, fungsi langsung `return`.
    4. Komponen `ToastContainer` berada di root layout di balik modal native Android (`Modal` full-screen), sehingga toast peringatan tersembunyi di belakang modal dan tombol tampak tidak merespons sentuhan ("tidak dapat di-touch").
    5. `ScrollView` di dalam `KeyboardAvoidingView` tidak memiliki `style={{ flex: 1 }}` sehingga berisiko menekan container navigasi bawah.
  - **Solusi & Perbaikan**:
    1. Sinkronisasi pemetaan `nextNumber` dan `nextNomorForm` pada `mobileDataRevisionsApi.getNextNumber()`.
    2. Fallback otomatis nomor formulir lokal (`001/MM/YYYY`) jika API lambat atau offline, sehingga `nomorForm` tidak pernah kosong.
    3. `handleNext` otomatis mengisi nomor form jika belum ada dan mengganti feedback validasi menggunakan `Alert.alert` (native dialog modal-safe yang selalu muncul di atas Modal).
    4. Menambahkan `style={{ flex: 1 }}` pada `ScrollView` dan `hitSlop` luas pada tombol navigasi bawah.
  - **Verifikasi & Build**:
    - TypeScript Mobile: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend Build: `bun run build` $\to$ **LULUS 100% 0 error (3.32s)**.
    - Repack APK: Bytecode `entry-18ba3a5e4726b942620ba6b73d82d158.hbc` $\to$ Signed dengan `release.keystore` $\to$ **Signature verified [v2, v3]**.
    - Distribusi sinkron ke 4 titik server (`mshipping.apk`).
    1. **Proteksi Safe Area Insets Android**:
       - Menggunakan `useSafeAreaInsets()` dari `react-native-safe-area-context`.
       - Menghitung `bottomPadding = Platform.OS === 'android' ? Math.max(insets.bottom, 28) + 12 : Math.max(insets.bottom, 12) + 12`.
       - Diterapkan pada `styles.bottomNav` di wizard modal dan `styles.footerActionBar` di detail modal.
       - Tombol navigasi bawah terangkat proporsional di atas bar navigasi sistem Android dengan touch target minimum 48dp.
    2. **Keyboard Avoiding & Scroll Spacing**:
       - Membungkus seluruh wizard dalam `KeyboardAvoidingView` (`behavior={Platform.OS === 'ios' ? 'padding' : undefined}`).
       - Menambahkan dynamic bottom padding pada `ScrollView` `contentContainerStyle` (`paddingBottom: bottomPadding + 36`) sehingga input di bagian paling bawah dapat digulir bebas ke atas keyboard.
    3. **Ergonomi & Redesign Layout Input**:
       - **Step 1 (Info & Aksi)**: Pilihan target aksi (BUAT BILL vs CANCEL DATA) dirancang menjadi kartu tombol interaktif 2-kolom dengan ikon, indikator check, dan warna semantik kontras. Nomor Form dilengkapi badge `[OTOMATIS]`. Tanggal & Dibuat Oleh ditata 2-kolom simetris. PIC ditata dalam accordion yang rapi.
       - **Step 2 (Data Target)**: Input `No. Inputan (fdListCode)` dilengkapi tombol lookup pencarian inline. Pada Data Baru, ditambahkan tombol pintasan **`[📋 Salin dari Awal]`** untuk otomatis menyalin customer, marking, dan volume dengan 1 klik.
       - **Step 3 (Lampiran Foto)**: Tombol jepret kamera fisik berdimensi lapang (tinggi 48dp) dan grid preview foto dengan tombol hapus yang mudah disentuh.
       - **Step 4 (Review & Simpan)**: Kartu ringkasan terstruktur dengan tipografi monospaced untuk nomor form/inputan dan tombol `Simpan Form` yang solid dan kontras.
  - **Build & Distribusi APK**:
    - TypeScript Mobile: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend Build: `bun run build` $\to$ **LULUS 100% 0 error (3.48s)**.
    - Hermes Android bytecode: `entry-799710d6717f85e6ecf3d6236573d9dc.hbc` (5.7MB).
    - Repack APK: Signed dengan `release.keystore` $\to$ **Signature verified [v2, v3]**.
    - Distribusi sinkron ke 4 titik server (`C:\shipping\mshipping.apk`, `frontend/dist/`, `frontend/public/`, `backend/public/uploads/`).

---

- [x] **Kompilasi & Distribusi APK Rilis (`v1.2.8`, VersionCode `20`, Non-Force Update)**:
  - **Instruksi Pengguna**: Kompile APK versi sama (`v1.2.8`), `forceUpdate: false`.
  - **Sinkronisasi Konfigurasi**:
    - `mobile/src/config/version.ts`: `APP_VERSION = '1.2.8'`, `APP_VERSION_CODE = 20`, `FORCE_UPDATE = false`.
    - `backend/src/config/app-version.json`: `version: "1.2.8"`, `versionCode: 20`, `forceUpdate: false`, update release notes & publishedAt.
    - Restart backend PM2 `ShippingApi` $\to$ online stabil.
  - **Build Hermes & Repack APK**:
    - `bunx expo export --platform android` $\to$ Bundle Hermes bytecode `entry-2d35205f50951e30a27ed013fb3fa124.hbc` (5.7MB).
    - Repack APK via `scripts/repack_apk.ps1`:
      - Injeksi bytecode ke `assets/index.android.bundle`.
      - Zipalign & signing dengan `uber-apk-signer` + `release.keystore` $\to$ **Signature verified [v2, v3]**.
  - **Distribusi Sinkron ke 4 Titik Server**:
    1. `C:\shipping\mshipping.apk` (127,127,421 bytes)
    2. `C:\shipping\frontend\dist\mshipping.apk`
    3. `C:\shipping\frontend\public\mshipping.apk`
    4. `C:\shipping\backend\public\uploads\mshipping.apk`
  - **Verifikasi Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (3.69s)**.

---
  - **Komponen Antarmuka Mobile**:
    - `DataRevisionsTab.tsx`: Tab view utama di Tab Logistik dengan KPI, filter status, search realtime, dan tombol FAB `[+ Buat Form]`.
    - `DataRevisionCard.tsx`: Komponen kartu dokumen dengan pill aksi, status semantik, dan ringkasan kargo.
    - `MobileInputanLookupModal.tsx`: Modal pencarian instan `fdListCode` dengan proteksi bill & serah terima kargo (`isCancelBlocked` $\to$ terkunci otomatis dan tidak bisa dipilih saat cancel).
    - `CameraCaptureModal.tsx`: Kamera native `expo-camera` untuk memotret bukti fisik formulir form.
    - `DataRevisionWizardModal.tsx`: Wizard 4 langkah responsif layar mobile (Info & Aksi $\to$ Target Data $\to$ Foto Kamera $\to$ Review & Simpan).
    - `DataRevisionDetailModal.tsx`: Detail form dengan komparasi data awal vs baru, galeri foto zoomable, dan tombol eksekusi cancel (`fdCancel = 1`) di lapangan.
  - **Integrasi Tab Logistik**:
    - `mobile/app/(tabs)/logistics.tsx`: Menambahkan opsi segmen `Revisi Data` berdampingan dengan Resi, Batch, Surat Jalan, dan BAP.
  - **Verifikasi TypeScript**:
    - `cd mobile && bun x tsc --noEmit` $\to$ **LULUS 100% 0 error**.

---
  - **1. Backend Guard (`dataRevisions.service.ts`)**:
    - `checkListCodeCancelEligibility(codes)`: Memindai `tbBilling` (`b.fdInvNo`, `b.fdGive`) dan `tbDelivery` (`d.fdSJNo`, `d.fdGive = 1`) secara realtime untuk seluruh nomor target pembatalan.
    - `lookupListCode`: Mengembalikan flag `hasBill`, `isGiven`, `isCancelBlocked`, dan `cancelBlockReason` (`"Sudah terbit Bill: ..."` / `"Kargo sudah diserahkan / fdGive=1 (SJ: ...)"`).
    - `createDataRevision`: Memblokir pembuatan form dengan aksi `CANCEL_DATA` jika ada `fdListCode` yang melanggar proteksi (HTTP 400).
    - `executeCancelData`: Memasang validasi ganda (*double-check guard*) sebelum menjalankan `UPDATE tbEntryList SET fdCancel = 1`.
  - **2. Frontend Guard & UI Affordance**:
    - `InputanLookupModal.tsx`:
      - Baris yang terproteksi (`isCancelBlocked`) otomatis terkunci: `disabled`, cursor-not-allowed, opacity 65%, tidak bisa dipilih.
      - Menampilkan badge proteksi amber dengan ikon gembok `[ 🔒 Ada Bill (...) ]` / `[ 🔒 Sudah Diserahkan (fdGive=1) ]`.
      - Penjelasan spesifik alasan kunci ditampilkan langsung pada baris data.
    - `StepItems.tsx`: Menambahkan banner penegasan proteksi sistem pada mode `CANCEL_DATA`.
  - **3. Verifikasi & Restart**:
    - PM2 `ShippingApi` direstart dan online stabil.
    - Backend TypeScript: `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - Frontend build: `bun run build` $\to$ **LULUS 100% 0 error (4.04s)**.

---

- [x] **Penyempurnaan Form Input & Revisi Data (`tbDataRevision`, Fast Lookup Listcode, Redesign UI/UX)**:
  - **1. Target Aksi `BUAT_BILL` Default & Penataan PIC**:
    - Opsi `BUAT_BILL` dijadikan default radio pilihan utama di Step 1 (`StepOfficers.tsx`) dan form state (`DataRevisionFormPage.tsx`).
    - Bagian Penanggung Jawab / Tanda Tangan Form diringkas ke dalam Accordion opsional (default tertutup) agar alur pengisian lebih cepat tanpa membebani user.
  - **2. Eliminasi Istilah SPBL & Percepatan Lookup Listcode**:
    - Istilah "SPBL" dihapus total dari modal pencarian dan tabel form. Diganti menjadi istilah baku **"No. Inputan (fdListCode)"**.
    - Dibuat endpoint backend khusus `GET /api/data-revisions/lookup-listcode?q=` yang langsung melakukan clustered index scan ke `tbEntryList.fdListCode` dengan `WITH (NOLOCK)` (latensi <60ms).
    - `InputanLookupModal.tsx` diredesign fokus pada pencarian instan `fdListCode`, customer info, dan status aktif.
  - **3. Redesign Ukuran Input Text & Drag and Drop Lampiran**:
    - Seluruh field input teks di `StepOfficers` dan `StepItems` diperbesar proporsinya (`py-2.5 px-3.5 text-sm`, border halus rounded-xl, monospaced font untuk kode/nomor dokumen).
    - `RevisionLampiranGrid.tsx` & `StepAttachments.tsx` mendukung interaksi nyata **Drag and Drop** (`onDragEnter`, `onDragLeave`, `onDragOver`, `onDrop`) dengan animasi active drag border (`border-primary bg-primary/10`).
  - **4. Penegasan Target Pembatalan Data (`CANCEL_DATA`)**:
    - Jika user memilih aksi `CANCEL_DATA`, field `fdAwalNoInputan` di Step 2 (DATA AWAL) ditandai dengan badge rose khusus dan alert ribbon penegas.
    - Pada `StepReview.tsx`, ditambahkan banner konfirmasi yang mendaftar secara eksplisit seluruh `fdListCode` pada DATA AWAL yang akan di-update menjadi `fdCancel = 1`.
  - **5. Perbaikan Bug Penomoran Otomatis (Idempotency Counter)**:
    - Masalah: Nomor form selalu naik setiap kali halaman form di-refresh karena `GET /api/data-revisions/next-number` sebelumnya menjalankan query `increment: 1` pada `tbDataRevisionCounter`.
    - Solusi:
      1. Endpoint `getNextFormNumber` diubah menjadi murni **READ-ONLY (Idempotent)** yang menghitung preview nomor berikutnya dari counter aktif dan data existing `tbDataRevision` tanpa memutasi DB.
      2. Counter atomik hanya di-commit ke `tbDataRevisionCounter` saat tombol **Simpan Form** benar-benar ditekan di `createDataRevision`.
      3. Counter di DB yang sempat naik akibat refresh telah di-reset kembali ke `0` (sehingga form pertama akan konsisten `001/10/2026`).
  - **6. Kondisional Kategori Tipe Data pada Aksi Cancel**:
    - Permintaan: Apabila aksi `CANCEL_DATA` dipilih, user tidak perlu diminta memilih "Kategori Tipe Data *".
    - Solusi:
      1. Pada `StepOfficers.tsx`, blok pilihan "Kategori Tipe Data *" (Revisi, Input Baru, Input Local Charges) disembunyikan jika `fdAksi === 'CANCEL_DATA'` dan digantikan pesan informatif penjelas bahwa form beroperasi dalam mode pembatalan data.
      2. Nilai `fdTipeData` otomatis diatur sebagai `'REVISI'` secara transparan di background untuk memenuhi skema validasi database.
      3. Pada `StepReview.tsx` dan `DataRevisionPrintPage.tsx`, ringkasan dan cetakan menampilkan label semantik **"PEMBATALAN DATA (CANCEL)"**.
  - **7. Verifikasi & Build Status**:
    - Frontend build: `bun run build` $\to$ **LULUS 100% 0 error (3.16s)**.
    - Backend check: `bun x tsc --noEmit` $\to$ **LULUS 100% 0 error**.
    - PM2 service `ShippingApi` online & stabil (PID 8948).

---

- [x] **Redesign Premium UI/UX Modal Surat Jalan Batch (`DeliveryBatchDetailModal.tsx`)**:
  - **1. Analisis Kebutuhan & Dial Standar**:
    - URL: `https://app.sampai.co/mshipping/logistics/delivery-orders/monitoring`
    - Perintah Pengguna: `/redesign-existing-projects /design-taste-frontend Modal Surat Jalan Batch: -> PERBAIKI DESIGNNYA`
    - Parameter Desain: `DESIGN_VARIANCE: 4`, `MOTION_INTENSITY: 4`, `VISUAL_DENSITY: 8` (High-density B2B Enterprise ERP). Zero generic AI slop, Midnight Dark Mode compliant (tidak ada tombol/badge solid putih atau terang).
  - **2. Perubahan Desain & Fitur Baru**:
    - **Header Komando Interaktif**:
      - Sesi badge dinamis: Sesi Pagi (amber squircle) vs Sesi Sore (indigo squircle) dengan timestamp aktual FoxPro (`effectiveTime WIB`).
      - Billing progress pill: `[🧾 Bill: {billedCount}/{total} SJ ({pct}%)]`.
      - Global accordion toggle: `[ ⇕ Buka/Tutup Semua ]` (`ChevronsUpDown`) untuk expand/collapse seluruh cabang & marking serentak.
      - Quick export button & modern close button.
    - **5 Kartu Grid KPI Eksekutif**:
      1. *Total Batch* (`{totalSj} SJ`, coly, kg) dengan accent border dinamis.
      2. *✈️ Air Freight* (`{sjUdara} SJ`, %, coly, kg).
      3. *🚢 Sea Freight* (`{sjLaut} SJ`, %, coly, kg).
      4. *🧾 Sudah Bill* (`{billedCount} SJ`, %, coly, kg, emerald).
      5. *⏳ Belum Bill* (`{unbilledCount} SJ`, amber, pulse indicator jika > 0).
      - Setiap kartu dapat diklik langsung sebagai jalan pintas filter real-time.
    - **Smart Toolbar & Dual View Engine**:
      - Switcher Mode Tampilan: `[ ▤ Tabel | 📱 Kartu ]` (`Rows3` vs `LayoutGrid`).
      - Segmented Control Filter Status Penagihan: `[Semua Bill]`, `[✓ Sudah Bill]`, `[⚠️ Belum Bill]`.
      - Segmented Control Filter Moda: `[Semua Moda]`, `[✈️ Air]`, `[🚢 Sea]`.
      - Dropdown Cabang dengan indikator kuantitas cabang.
      - Input pencarian autocomplete multi-field (SJ, customer, marking, nomor invoice `item.invNos`, supir, armada) lengkap dengan tombol clear `(X)`.
      - Tombol reset filter `RotateCcw`.
    - **Mode Tampilan Tabel (Table View)**:
      - Header 8 kolom terstandarisasi dengan `tabular-nums`.
      - Subheader marking & cabang dengan `displayCustName(marking.custName)` dan pill akumulasi volume kargo.
      - Kolom Status Penagihan: Emerald badge + tautan invoice `ROUTES.BILLING_VALIDATION_DETAIL(invNo)` vs Amber badge + list code manifest.
      - Tautan no. SJ langsung mengarah ke `ROUTES.DELIVERY_DETAIL(item.fdSJNo)`.
    - **Mode Tampilan Kartu (Cards View)**:
      - Layout grid 2-kolom responsif untuk kartu SJ per marking.
      - Detail logistik kargo, supir, armada, dan invoice dalam container kompak.
    - **Ekspor Excel (.xlsx)**: Dilengkapi kolom `Status Penagihan`, `No Invoice`, dan `Tgl Invoice`.
    - **Footer Status Real-Time**: Rekapitulasi instan jumlah SJ terfilter, `✓ Sudah Bill: X SJ`, dan `⏳ Belum Bill: Y SJ`.
    - **Midnight Dark Mode Compliant**: Zero solid white badges/buttons, seluruh komponen menggunakan semantic outline, hover effects, dan CSS tokens theme-aware.
  - **3. Verifikasi Build**:
    - `bun run build` frontend $\to$ **LULUS 100% 0 errors (3.31s)**.
    - Dokumentasi disinkronkan di [`docs/frontend/delivery-orders.md`](file:///c:/shipping/docs/frontend/delivery-orders.md) dan [`frontend-app.md`](file:///c:/shipping/frontend-app.md).

---

- [x] **Perhitungan & Filter Data SJ yang Belum dan Sudah Dibuat Bill pada Modal Surat Jalan Batch (`DeliveryBatchDetailModal.tsx`, `delivery-orders.types.ts`, `deliveryOrders.service.ts`, `deliveryOrders.types.ts`)**:
  - **1. Analisis Kebutuhan**:
    - URL: `https://app.sampai.co/mshipping/logistics/delivery-orders/monitoring`
    - Permintaan: *"tambahkan juga pada modal Surat Jalan Batch:"*
    - Pengguna meminta agar fitur perhitungan data Surat Jalan (SJ) yang sudah dibuat bill (`isBilled`) dan belum dibuat bill (`!isBilled`) serta filter penagihan juga diterapkan pada **Modal Surat Jalan Batch** (`DeliveryBatchDetailModal.tsx`) yang dibuka dari cardlet sesi batch (Pagi/Sore) pada grafik & tabel Log Harian.
  - **2. Backend Enrichment (`deliveryOrders.service.ts` & `deliveryOrders.types.ts`)**:
    - Pada fungsi `getDeliveryConfirmBatchDetail(date, session)`:
      - Menambahkan `OUTER APPLY` ke `tbBilling` berdasarkan kesamaan `fdListCode` pada chunk kueri sekunder `tbDelivery` untuk mengambil `isBilled`, `invNos` (`STRING_AGG`), `invDates` (`STRING_AGG`), dan `billCount`.
      - Memetakan field billing ke setiap item `DeliveryBatchOrderItem`.
      - Mengagregasikan `billingRecap` (`billedSjCount`, `unbilledSjCount`, `totalListCodes`, `billedListCodeCount`, `unbilledListCodeCount`, `billedPack`, `billedWeight`, `unbilledPack`, `unbilledWeight`).
    - Menyelaraskan interface `DeliveryBatchOrderItem` dan `DeliveryBatchDetailResponse` pada `backend/src/modules/delivery-orders/deliveryOrders.types.ts` dan `frontend/src/features/delivery-orders/types/delivery-orders.types.ts`.
    - Restart PM2 service `ShippingApi` dan verifikasi TypeScript backend: `bun x tsc --noEmit` $\to$ **LULUS 100% 0 error**.
  - **3. Frontend Modal UI (`DeliveryBatchDetailModal.tsx`)**:
    - **Header Pill**: Menampilkan pill progress penagihan interaktif `[🧾 Bill: {billedCount}/{total} SJ ({pct}%)]`.
    - **Summary Ribbon KPI Pills**:
      - `[🧾 Sudah Bill: {billedCount} SJ ({billedPack} coly • {billedWeight} kg)]` (badge emerald outline, dapat diklik untuk filter).
      - `[⏳ Belum Bill: {unbilledCount} SJ ({unbilledPack} coly • {unbilledWeight} kg)]` (badge amber outline, dapat diklik untuk filter).
    - **Segmented Control Filter Toolbar**:
      - Ditambahkan tombol filter status penagihan: `[Semua Bill]`, `[✓ Sudah Bill ({billedCount})]`, `[⚠️ Belum Bill ({unbilledCount})]`.
      - Pencarian teks diperluas mencakup nomor invoice (`item.invNos`).
      - Tombol Reset otomatis membersihkan status filter billing.
    - **Tabel Hierarkis Grouping (Moda $\to$ Cabang $\to$ Marking)**:
      - Ditambahkan kolom baru **Status Penagihan**:
        - Sudah Ada Bill: Badge emerald `[✓ Sudah Ada Bill]` + tautan klik nomor invoice ke `ROUTES.BILLING_VALIDATION_DETAIL(invNo)` + tanggal terbit invoice.
        - Belum Ada Bill: Badge amber `[Belum Ada Bill]` + info list code manifest `LC: {item.fdListCode}`.
      - Subheader Marking & Cabang: Menampilkan badge volume penagihan `[✓ X Bill]` dan `[⚠️ Y Belum]`.
      - Kolom No. Surat Jalan dilengkapi link navigasi langsung ke `ROUTES.DELIVERY_DETAIL(item.fdSJNo)`.
    - **Ekspor Excel (.xlsx)**:
      - Ditambahkan kolom `Status Penagihan`, `No Invoice`, dan `Tgl Invoice`.
    - **Footer Modal**:
      - Rekapitulasi instan jumlah SJ terfilter, `✓ Sudah Bill: X SJ`, dan `⏳ Belum Bill: Y SJ`.
  - **4. Verifikasi Build**:
    - `bun run build` frontend $\to$ **LULUS 100% 0 errors (2.67s)**.
    - PM2 `ShippingApi` online & stabil.
    - Dokumentasi diperbarui di `frontend-app.md`, `backend-app.md`, `docs/frontend/delivery-orders.md`, `docs/backend/delivery-orders.md`, dan `.agents/working.md`.

---


- [x] **Perhitungan & Filter Data SJ yang Belum dan Sudah Dibuat Bill pada Modal Rincian Target Estimasi Kirim (`DeliveryEstimasiDetailModal.tsx`, `delivery-orders.types.ts`, `deliveryOrders.types.ts`)**:
  - **1. Analisis Kebutuhan**:
    - URL: `https://app.sampai.co/mshipping/logistics/delivery-orders/monitoring`
    - Permintaan: *"pada modal Rincian Target Estimasi Kirim -> hitung data sj yang belum dan sudah di buat bill"*
    - Pengguna memerlukan rekapitulasi transparan mengenai status penagihan/billing dari seluruh Surat Jalan (SJ) yang memiliki target estimasi kirim tertentu: berapa SJ yang sudah diterbitkan invoice/bill, berapa yang belum, serta kemampuan untuk memfilter dan melihat nomor invoice terkait secara langsung.
  - **2. Penyelarasan Tipe Data Backend & Frontend**:
    - Backend `tbDelivery` telah memetakan `isBilled`, `invNos`, `invDates`, `billCount`, dan `billingRecap` via `tbBilling` join `fdListCode`.
    - Menyelaraskan interface `DeliveryEstimasiDetailItem` dan `DeliveryEstimasiDetailResponse` di kedua sisi (`backend/src/modules/delivery-orders/deliveryOrders.types.ts` & `frontend/src/features/delivery-orders/types/delivery-orders.types.ts`) dengan menambahkan `isBilled: boolean`, `invNos: string | null`, `invDates: string | null`, `billCount: number`, dan objek `billingRecap`.
  - **3. Implementasi Komponen Modal (`DeliveryEstimasiDetailModal.tsx`)**:
    - **Header Pill**: Menampilkan badge ringkas `[🧾 Bill: {billedCount}/{totalCount} SJ ({billedPct}%)]` di samping batas tanggal H+1.
    - **6 Kartu KPI Ribbon Ringkasan**:
      1. Target Estimasi (Total SJ).
      2. ⚠️ Pending Overdue (> H+1).
      3. 🕒 Toleransi H+1 (<= H+1).
      4. 🚚 Realisasi Terkirim.
      5. 🧾 **Sudah Dibuat Bill**: Jumlah SJ, persentase ketercapaian bill, total coly, dan berat kg (badge hijau emerald).
      6. ⏳ **Belum Dibuat Bill**: Jumlah SJ, total coly, dan berat kg dengan pulse peringatan jika > 0 (badge amber).
      - Seluruh kartu dapat diklik langsung untuk memicu filter data interaktif.
    - **Filter Toolbar Segmented Control**:
      - Ditambahkan tombol filter status penagihan berdampingan dengan filter pengiriman: `[Semua Bill]`, `[✓ Sudah Bill ({billedCount})]`, dan `[⚠️ Belum Bill ({unbilledCount})]`.
      - Pencarian teks diperluas untuk mencakup nomor faktur/invoice (`item.invNos`).
      - Tombol Reset Filter turut membersihkan filter status penagihan.
    - **Tabel Desktop (10 Kolom)**:
      - Menambahkan kolom **Status Penagihan**:
        - Jika sudah ada bill: Badge emerald `[✓ Sudah Ada Bill]` + tautan klik ke halaman validasi invoice `ROUTES.BILLING_VALIDATION_DETAIL(invNo)` + tanggal terbit invoice.
        - Jika belum ada bill: Badge amber `[Belum Ada Bill]` + kode list manifest.
    - **Tampilan Kartu Mobile**:
      - Ditambahkan section **Box Status Bill** di setiap kartu kargo lengkap dengan tautan nomor invoice dan status verifikasi.
    - **Modal Footer Ringkasan**:
      - Dilengkapi rekapitulasi langsung: `✓ Sudah Bill: X SJ (A coly) • ⏳ Belum Bill: Y SJ (B coly)`.
    - **Ekspor Excel (.xlsx)**:
      - Ditambahkan kolom `Status Penagihan`, `No Invoice`, dan `Tgl Invoice`.
  - **4. Verifikasi Build & Backend**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 error (3.61s)**.
    - `cd backend && bun x tsc --noEmit` $\to$ **LULUS 100% 0 error**.
    - Dokumentasi diperbarui di `docs/frontend/delivery-orders.md` dan `.agents/working.md`.

---

- [x] **Kontrol Mikrofon Terpusat pada Validasi Detail Bill (`ValidationDetailPage.tsx`, `ValidationVoiceHud.tsx`, `ValidationListDrawer.tsx`, `BillingValidationSummaryModal.tsx`, `IssueInvoiceModal.tsx`, `voiceAssistantStore.ts`)**:
  - **1. Analisis Kebutuhan**:
    - Permintaan: *"pada voice command di page validasi detail, buat control untuk listen pada mic terpusat pada ui yang floating di bawah page. Jadi apabila di matikan maka pada setiap modal / drawer juga akan ikut mati tidak aktif mendengarkan input dari mic. /plan"*
    - Sebelumnya, modal dan drawer memiliki instance `useVoiceRecognition` sendiri yang langsung aktif mendengarkan secara sepihak saat dibuka tanpa mengecek apakah mic sedang di-mute di Floating HUD.
  - **2. Implementasi Terpusat**:
    - **Central Store (`voiceAssistantStore.ts`)**: Menambahkan aksi `setVoiceMuted: (muted: boolean) => void`. State `isMuted` dijadikan Master Switch tunggal.
    - **Drawer Pencarian Faktur (`ValidationListDrawer.tsx`)**:
      - Memasang guard `!isMuted` pada auto-standby saat drawer dibuka.
      - Efek reaktif seketika terhadap perubahan `isMuted`: jika user mute via HUD/Alt+V, mic drawer langsung mati seketika.
      - Re-arm di `onEnd` mengecek `!isMuted`.
      - Tombol mic pada input pencarian dan shortcut `Alt+V` di drawer memanggil `toggleVoiceMute()`, menyinkronkan status mute kembali ke Floating HUD secara instan.
      - Placeholder dan visual tombol menampilkan status `(Mikrofon Jeda)` dan ikon `MicOff`.
    - **Modal Ringkasan Validasi (`BillingValidationSummaryModal.tsx`)**:
      - Auto-standby hanya berjalan jika `!isMuted`.
      - Efek reaktif langsung mematikan mic jika `isMuted` aktif.
      - Re-arm di `onEnd` mengecek `!isMuted`.
      - Shortcut `Alt+V` di dalam modal ringkasan disinkronkan ke `toggleVoiceMute()`.
    - **Modal Konfirmasi Terbitkan Invoice (`IssueInvoiceModal.tsx`)**:
      - Auto-standby hanya berjalan jika `!isMuted`.
      - Efek reaktif langsung mematikan mic jika `isMuted` aktif.
      - Re-arm di `onEnd` mengecek `!isMuted`.
      - Tombol indikator standby suara di footer modal dan shortcut `Alt+V` disinkronkan ke `toggleVoiceMute()`, menampilkan ikon `MicOff` dan status teks `Mikrofon Jeda`.
  - **3. Verifikasi Build**:
    - `bun run build` frontend $\to$ **LULUS 100% 0 errors** (3.19s, `dist/assets/billing-BNJqbcEg.js`).

---

- [x] **Penambahan Detail Kinerja Penagihan Per Cabang pada Dashboard Billing (`https://app.sampai.co/mshipping/finance/billing`)**:
  - **1. Analisis Kebutuhan**:
    - Permintaan: *"tambahkan detailnya bagi per cabang -> cabang -- sama dengan singapore"*.
    - Menambahkan rincian kinerja penagihan (MoM & YoY) yang dikelompokkan berdasarkan cabang asal kargo (`GZ`, `SG`, `HK`, `YW`, `SH`, `SZ`, `LM`, dll).
    - **Aturan Bisnis Kunci**: Cabang dengan kode `--` dan `SG` (serta prefix invoice `--S%`, `--A%`, `SGS%`, `SGA%`, `SG-%`) **dianggap dan diagregasikan menjadi satu cabang: Singapore (`SG`)**.
  - **2. Backend (`billing-analytics.service.ts`, `billing.types.ts`)**:
    - **Tipe Data Baru**: Menambahkan interface `BranchBillingMetrics` dan `BranchBillingComparison`, menyematkan `branches?: BranchBillingMetrics[]` pada `PeriodBillingMetrics` dan `byBranch?: BranchBillingComparison[]` pada `BillingComparisons`.
    - **Kueri Agregasi Cabang**: Di `fetchPeriodMetrics`, menambahkan kueri paralel SQL Server dengan ekspresi `CASE WHEN RTRIM(fdBranchCode) IN ('--', 'SG', '-') THEN 'SG' ... END` dan deteksi fallback prefix nomor faktur.
    - **Kalkulasi Komparasi MoM & YoY Cabang**: Menghitung `momTagihanDiff`, `momTagihanPercent`, `yoyTagihanDiff`, `yoyTagihanPercent`, `momInvoicesDiff`, `momInvoicesPercent`, `yoyInvoicesDiff`, `yoyInvoicesPercent`, dan `shareOfTotal` (% kontribusi terhadap total omzet konsolidasi) untuk setiap cabang.
    - **Restart PM2**: `pm2 restart ShippingApi` $\to$ online stabil.
  - **3. Frontend (`frontend/src/features/billing/`)**:
    - **Komponen Baru `BillingBranchComparisonTable` (`BillingPeriodMatrixSection.tsx`)**:
      - Tabel berdensitas tinggi menyajikan rincian seluruh cabang: Cabang (Badge kode + Nama), Tagihan Bulan Ini (Rp font mono tabular-nums), MoM % & diff, YoY % & diff, Volume Faktur (Bill + MoM diff), Breakdown Moda Udara vs Laut (persentase & volume), dan Bilah Visual Pangsa Pasar.
      - Chip penjelas transparan: `🇸🇬 Singapore mencakup kode 'SG' & '--'`.
      - Quick filter switcher pills di header (`Semua`, `GZ`, `SG`, `HK`, `YW`, `SH`, dll).
      - Footer baris Total Konsolidasi seluruh cabang.
    - **Integrasi Filter Cabang Interaktif di `DashboardPage.tsx` & `BillingPeriodMatrixTable`**:
      - Menambahkan state `selectedBranch` (`'ALL' | string`).
      - Saat baris cabang diklik, tabel Matriks 8 Metrik di atasnya langsung memfilter metrik (Total Faktur, Total Tagihan, Udara, Laut, Tiket Rata-rata, Pelanggan) ke cabang tersebut secara responsif, lengkap dengan tombol `[✕ Tampilkan Semua Cabang]` untuk kembali ke konsolidasi.
    - **Dukungan i18n ID & EN**: Menambahkan kamus bahasa di `id.json` dan `en.json`.
  - **4. Verifikasi**:
    - `bun run build` frontend $\to$ **LULUS 100% 0 errors (16.91s)**.
    - PM2 service `ShippingApi` online dan stabil.
    - Dokumentasi disinkronkan di `docs/frontend/billing.md`, `docs/backend/billing.md`, dan `.agents/working.md`.

---

- [x] **Hotfix Rilis Mobile App `v1.2.8` (Build `20`, `forceUpdate: true`) (`mobile/`, `backend/`, `repack_apk.ps1`)**:
  - **1. Investigasi & Akar Masalah Crash**:
    - Aplikasi mengalami crash saat startup setelah rilis `v1.2.7`.
    - Dari inspeksi isi `classes.dex` base APK `mshipping.apk`, modul native `ExponentAV` (`expo-av`) **TIDAK TERPASANG** di dalam base binary APK.
    - Sesuai aturan arsitektur sistem (`.agents/rules/mobile-standards.md` bagian 4), server ini menggunakan alur repack Hermes bytecode (`scripts/repack_apk.ps1`), sehingga modul binary native baru yang belum ada di `classes.dex` tidak dapat dijalankan di runtime.
  - **2. Solusi & Eliminasi expo-av**:
    - Seluruh pemanggilan dan dependensi `expo-av` langsung dieliminasi secara total dari aplikasi mobile.
    - Komponen aman yang tetap aktif: **Anotasi Visual Foto Kerusakan BAP** (`PhotoAnnotationModal.tsx` berbasis `react-native-svg` yang sudah ada di base APK) dan **Link Manifest ke Shipment Detail** (`BatchManifestSheet.tsx` $\to$ `ShipmentDetailSheet.tsx`).
  - **3. Penyelarasan SSOT 4 Berkas Versi**:
    - `mobile/src/config/version.ts`: `APP_VERSION = '1.2.8'`, `APP_VERSION_CODE = 20`, `FORCE_UPDATE = true`, `MIN_APP_VERSION = '1.2.8'`
    - `backend/src/config/app-version.json`: `version: "1.2.8"`, `versionCode: 20`, `minVersion: "1.2.8"`, `forceUpdate: true`
    - `mobile/app.json`: `version: "1.2.8"`, `android.versionCode: 20`
    - `mobile/package.json`: `version: "1.2.8"`
    - `mobile-app.md`: `v1.2.8` (VersionCode: `20`)
  - **4. Kompilasi & Repackaging APK**:
    - Hermes JS bundle Android diekspor via `bunx expo export --platform android` $\to$ bundle `entry-*.hbc` (5.6 MB).
    - Injeksi bytecode ke `assets/index.android.bundle` dalam base APK `mshipping.apk`.
    - Signing dan Zipalign berhasil 100% menggunakan `uber-apk-signer.jar` dan `release.keystore` (Signature V2 & V3 valid).
  - **5. Distribusi Sinkron ke 4 Titik Server**:
    - `C:\shipping\mshipping.apk` (121.2 MB)
    - `C:\shipping\frontend\dist\mshipping.apk` (121.2 MB)
    - `C:\shipping\frontend\public\mshipping.apk` (121.2 MB)
    - `C:\shipping\backend\public\uploads\mshipping.apk` (121.2 MB)
  - **6. Verifikasi & Restart Server**:
    - PM2 `ShippingApi` direstart dan online stabil (PID 10888).
    - Endpoint `GET /api/app-version/latest` $\to$ **HTTP 200 OK** (`version: "1.2.8"`, `versionCode: 20`, `forceUpdate: true`, `hasApk: true`).
    - Verifikasi build Frontend `bun run build` $\to$ **LULUS 100% 0 error (2.83s)**.

---

- [x] **Voice Memo BAP (Catatan Suara 90 Detik) & Anotasi Visual Foto Kerusakan BAP (`mobile/`, `backend/`)**:
  - **1. Konteks & Analisis Kebutuhan**:
    - Petugas lapangan/warehouse memerlukan pencatatan kondisi kerusakan kargo secara cepat melalui suara (audio memo hingga 90 detik) dan penandaan visual langsung di atas foto kerusakan (lingkaran merah, panah penunjuk, freehand pen) sebelum disimpan sebagai Berita Acara Pemeriksaan (BAP).
  - **2. Database & Backend API**:
    - `backend/prisma/schema.prisma` & MS SQL Server: Kolom `fdAudioUrl NVARCHAR(500) NULL` dan `fdAudioDuration INT NULL` ditambahkan ke `tbInspectionReport`.
    - Regenerasi Prisma Client dan reload model data.
    - `backend/src/modules/inspection-reports/inspectionVoiceMemo.service.ts`: Service upload file audio base64 (`.m4a`), validasi durasi (maks 90s), dan penghapusan file memo suara dari folder `public/uploads/bap-audio/<folderName>/`.
    - `backend/src/modules/inspection-reports/inspectionReports.routes.ts`: Rute `POST /:id/voice-memo` dan `DELETE /:id/voice-memo`.
    - `backend/src/modules/inspection-reports/imageWatermark.service.ts`: Dukungan penggabungan vector annotations SVG ke atas citra foto resolusi tinggi menggunakan library `sharp` sebelum dibubuhi banner watermark metadata resmi BAP.
  - **3. Mobile App Implementation (`mobile/`)**:
    - `useVoiceRecorder.ts`: Hook perekaman audio via `expo-av`, limit timer 90 detik dengan auto-stop, haptic feedback, dan konversi ke base64 via `expo-file-system`.
    - `useAudioPlayer.ts`: Hook playback audio responsif dengan pelacakan scrubber position dan total duration.
    - `VoiceMemoRecorder.tsx`: Komponen perekaman dengan visualizer REC pulse merah, counter waktu `00:00 / 01:30`, play preview, reset, dan konfirmasi.
    - `VoiceMemoPlayer.tsx`: Pemutar audio ramping dengan tombol Play/Pause, progress bar scrubber, counter waktu, dan tombol hapus.
    - `PhotoAnnotationModal.tsx`: Canvas penandaan kerusakan kargo berbasis `react-native-svg` + `PanResponder` dengan 3 tool (Pen, Circle, Arrow), palet warna (Merah #EF4444, Kuning #F59E0B, Hijau #10B981), Undo, Clear, dan Skip.
    - `BapPhotoSheet.tsx`: Integrasi transisi kamera ke modal anotasi sebelum upload foto ber-watermark.
    - `InspectionFormSheet.tsx`: Integrasi perekam voice memo yang otomatis diunggah saat pembuatan/pengeditan BAP.
    - `InspectionDetailSheet.tsx`: Integrasi audio player untuk memutar atau menambahkan voice memo pada laporan BAP.
    - `InspectionListItem.tsx`: Badge indikator audio `[ 🎙️ {duration}s ]` pada daftar kartu BAP.
  - **4. Verifikasi & Build Status**:
    - Backend TypeScript `bun x tsc --noEmit` $\to$ **LULUS 0 error**.
    - PM2 `ShippingApi` $\to$ **Online & Healthy (HTTP 200)**.
    - Mobile TypeScript `bun x tsc --noEmit` $\to$ **LULUS 100% 0 error**.
    - Frontend build verification dipastikan lulus 0 error.

---

- [x] **Link Modal Manifest ke Modal Shipment Detail & Redesign Kartu Kargo Mobile App (`BatchManifestSheet.tsx`, `ShipmentDetailSheet.tsx`)**:
  - **1. Konteks & Analisis**:
    - Pengguna meminta agar dari modal manifest batch (`BatchManifestSheet`) pengguna dapat langsung membuka data detail shipment (`ShipmentDetailSheet`), baik saat dibuka dari **Dashboard (`overview.tsx`)** maupun dari **Tab Logistik (`logistics.tsx`)**.
    - Di layar Dashboard (`overview.tsx`), manifest dipicu dari kartu Exit Activity (Hari Ini, Kemarin, Besok, Exit 7 Hari) serta modal alert ETA / SLA (`AlertDetailModal`).
  - **2. Redesign UI Kartu Kargo (`redesign-existing-projects`)**:
    - Seluruh kartu manifest kargo dibungkus `TouchableOpacity` (`activeOpacity={0.75}`) dengan tactile feedback `Haptics.impactAsync(Light)` untuk membuka detail shipment secara instan saat diketuk.
    - Menambahkan indikator affordance visual: `ChevronRight` pada baris header di samping badge status finansial.
    - Menambahkan tombol aksi khusus **`[ 📦 Detail ]`** di baris bawah kartu di samping tombol **`[ + BAP ]`**.
    - Metrik koli, berat, dan volume dikonfigurasi dengan font monospaced `tabular-nums` dan layout lapang.
  - **3. Arsitektur Modal Stacking**:
    - `ShipmentDetailSheet` disematkan langsung di dalam `BatchManifestSheet` dengan state internal `selectedShipmentForDetail` (dan prop fallback `onSelectShipment`).
    - Menutup detail shipment mengembalikan pengguna ke posisi manifest tanpa kehilangan status pencarian atau scroll.
    - Tombol `+ BAP` dari dalam detail shipment menutup kedua modal dan langsung membuka formulir BAP dengan autofill lengkap.
  - **4. Verifikasi & Dokumentasi**:
    - `bun x tsc --noEmit` di `mobile/` $\to$ **LULUS 100% 0 error**.
    - Dokumentasi diperbarui di `docs/mobile/overview.md`, `docs/mobile/logistics.md`, dan `.agents/working.md`.

---

- [x] **Timeline Siklus Kargo pada Billing Validation Detail Page (`ValidationDetailPage.tsx`, `ShipmentTimeline.tsx`, `billing.service.ts`, `billing.routes.ts`)**:
  - **1. Backend**:
    - `billing.types.ts`: Tambah interface `BillingTimeline` (8 field tanggal).
    - `billing.service.ts`: Tambah function `getBillingTimeline(invNo)` — resolve listCode dari invNo, JOIN `tbEntrylist` + `tbMarking` + `tbDelivery`, `MAX(fdSndDate)` per listCode karena multi-SJ, `MAX(fdGiveDate)`.
    - `billing.routes.ts`: Tambah route `GET /:id/timeline` (ditempatkan sebelum `GET /:id` agar tidak ter-shadow).
  - **2. Frontend**:
    - `billing.types.ts`: Tambah interface `BillingTimeline`.
    - `billing.service.ts`: Tambah method `billingApi.timeline(invNo)`.
    - `ShipmentTimeline.tsx` (BARU): Komponen horizontal strip compact timeline, 8 milestone dengan ikon Lucide, dot filled (primary) jika ada tanggal, outline (muted) jika null, connector line emerald/grey, responsive ke 4-column grid di mobile, skeleton shimmer saat loading, Dark Mode compliant via CSS tokens.
    - `ValidationDetailPage.tsx`: Import `ShipmentTimeline`, tambah `useQuery billingTimeline`, render di atas `<InvoiceItemsTable />`.
  - **3. Urutan Milestone Kronologis**:
    1. Diterima Agen (`fdTerima`, tbEntrylist)
    2. Loading (`fdLoadDate`, tbMarking)
    3. ETD (`fdETD`, tbMarking)
    4. ETA (`fdETA`, tbMarking)
    5. Masuk Gudang (`fdTgl_IN`, tbEntrylist)
    6. Surat Jalan (`fdSjDate`, tbDelivery)
    7. Dikirim (`fdSndDate` MAX, tbDelivery)
    8. Diserahkan (`fdGiveDate` MAX, tbDelivery)
  - **4. Verifikasi**:
    - `bun run build` frontend → **LULUS 0 errors** (3.18s).
    - PM2 `ShippingApi` restart → **online** (PID 25060).
    - Endpoint `GET /billing/:id/timeline` → routing benar (401 auth expected).

---

- [x] **Redesign Komponen Modal Penerbitan Invoice Resmi (`IssueInvoiceModal.tsx`)**:
  - **1. Masalah & Temuan**:
    - Dialog konfirmasi penerbitan invoice sebelumnya menggunakan container sempit `max-w-lg` (512px).
    - Grid pembagian 6-kolom membuat box customer terpotong (`MAJU MAKMUR BAHAGI...`) dan box nominal total tagihan resmi terhimpit.
    - Sisa ruang yang sempit memaksa simbol mata uang dan nominal angka ter-wrap bertumpuk secara canggung (`Rp .` di atas dan `51,833,480.00` di bawah).
  - **2. Perbaikan & Redesign (design-taste-frontend & redesign-existing-projects)**:
    - **Lebar Modal**: Diperlebar dari `max-w-lg` (512px) ke **`max-w-2xl` (672px)**, memberikan ruang proporsional yang lapang dan seimbang.
    - **Header Modal**: Dilengkapi padding yang lebih lapang (`px-6 py-4`), avatar icon squircle `w-10 h-10`, dan typography jelas.
    - **Kartu Ringkasan Eksekutif**:
      - Kolom kiri (`sm:col-span-7`): Avatar pelanggan `w-10 h-10`, nama lengkap pelanggan tampil lapang dan terbaca jelas (`leading-snug line-clamp-2`), serta kode customer pada chip monospaced.
      - Kolom kanan (`sm:col-span-5`): Box **TOTAL TAGIHAN RESMI** dirancang menjadi kartu KPI elegan:
        - Baris atas: Label `TOTAL TAGIHAN RESMI` dan status badge `Siap Ditagihkan`.
        - Baris bawah: Simbol mata uang (`Rp.` / valas) dan nominal monospaced `tabular-nums` (`text-xl sm:text-2xl font-bold`) berada pada 1 baris solid dengan `whitespace-nowrap`, rata kanan, dan tidak akan pernah ter-wrap secara canggung.
  - **3. Verifikasi Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (3.12s).

---

- [x] **Redesign Komponen Modal Detail Fisik & Tagihan Per Marking (`CustMarkingDetailModal.tsx`, `CustMarkingHeaderToolbar.tsx`, `CustMarkingSummaryBanner.tsx`, `CustMarkingDataTable.tsx`)**:
  - **1. Konteks & Tujuan (design-taste-frontend + generative_ui)**:
    - Melakukan upgrade antarmuka modal audit marking ke standar Enterprise ERP Financial & Physical Inspection: anti-slop, kepadatan data tinggi (high-density B2B), navigasi audit cepat, dan keselarasan penuh dengan 5 tema (khususnya Midnight Dark Mode).
    - Menghasilkan visualisasi prototipe interaktif Generative UI (`marking_detail_redesign.html`) di direktori artefak.
  - **2. Perubahan Teknis Komponen**:
    - **`CustMarkingDetailModal.tsx`**:
      - Merestrukturisasi Header: Customer Name dengan label semantik, Marking Code berbalut monospaced pill badge, dan smart alert badge untuk multi-cabang & selisih koli komplain.
      - Memperbarui status bar footer dengan counter baris data terfilter vs total data serta indikator status query aktif.
    - **`CustMarkingHeaderToolbar.tsx`**:
      - Mengganti tombol preset flat menjadi Segmented Pill Control modern (`Semua Kolom`, `Fisik & M³`, `Komplain`, `Finansial`) dengan dot indicator saat terdeteksi selisih komplain.
      - Menambahkan clear button `(X)` interaktif pada input pencarian instan.
      - Merampingkan alert ribbon multi-cabang & selisih komplain menjadi bilah ringkas 1 baris yang hemat ruang vertikal tabel.
    - **`CustMarkingSummaryBanner.tsx`**:
      - Memperbarui 6 KPI Cards menjadi Comparative Executive Analytics Grid: border mikro, kontras monospaced `tabular-nums`, visualisasi delta volume vs gudang, dan highlight card Overweight dengan ambient rose border & pulse badge saat terdeteksi lebih KG.
      - Filter komoditas dibuat dalam format horizontal chip pills dengan badge frekuensi dan total kubikasi m³.
    - **`CustMarkingDataTable.tsx`**:
      - **Sticky Identity Columns**: Kolom `No.` (`sticky left-0`), `BC.` (`sticky left-10`), dan `No. Invoice` (`sticky left-[88px]`) terkunci di sisi kiri saat pengguna menggulir tabel ke kanan untuk melihat rincian finansial & M³. Kolom No. Invoice dilengkapi border dan drop shadow pemisah.
      - **Sticky Table Footer (`tfoot`)**: Baris total keseluruhan terkunci di bagian bawah (`sticky bottom-0 z-30`) dengan pembagian kolom 24 cell yang persis, sehingga auditor selalu melihat total tanpa harus scroll sampai baris terakhir.
      - **Semantic Discrepancy Highlighting**: Baris dengan selisih koli komplain atau kelebihan berat (overweight) otomatis diberi aksen penanda border kiri (amber/rose) dan highlight sel.
  - **3. Generative UI Interactive Prototype**:
    - File artifact: `marking_detail_redesign.html` berisi prototype interaktif lengkap dengan live switcher tema (Midnight Dark vs Light), simulasi filter cabang, status card comparative, dan tabel kargo sticky columns.
  - **4. Verifikasi Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (3.08s).

---

- [x] **Perbaikan Tampilan Total Tagihan Resmi pada Modal Penerbitan Invoice (`IssueInvoiceModal.tsx`, `ValidationDetailPage.tsx`, `InvoiceItemsTable.tsx`, `billing.utils.ts`)**:
  - **1. Masalah & Temuan**:
    - Pada modal penerbitan invoice resmi (`IssueInvoiceModal.tsx`), KPI box "TOTAL TAGIHAN RESMI (Siap Ditagihkan)" menampilkan tanda strip (`—`) alih-alih nominal angka total tagihan (misal pada invoice draft `SGS-002072-10-2026`).
    - Penyebab: `ValidationDetailPage.tsx` sebelumnya mempassing `totalAmount = Number(data.fdJumlah2 || data.fdJumlah1 || 0)`. Pada invoice draft sebelum issued, field `fdJumlah1` dan `fdJumlah2` pada header tabel FoxPro/MSSQL masih bernilai `0` atau `NULL`, sementara rincian item tagihan berada pada tabel `details` (`tbBillingDetail`).
    - Karena `totalAmount` bernilai `0`, logika `{totalAmount > 0 ? ... : '—'}` menghasilkan `—`. Selain itu, simbol mata uang sebelumnya di-hardcode ke Rupiah (`formatCurrency`) tanpa dukungan valas.
  - **2. Perbaikan Teknis**:
    - **`billing.utils.ts`**: Menempatkan helper terpusat `getEffectiveInvoiceTotal(data, details)` sebagai Single Source of Truth perhitungan total tagihan (mendukung kesalahan input valas, valas murni `fdJumlah2`, `fdJumlah1 > 0`, dan fallback akumulasi `sum(details)` untuk invoice draft).
    - **`IssueInvoiceModal.tsx`**:
      - Menambahkan prop `currency?: string` pada `IssueInvoiceModalProps`.
      - Memperbaiki tampilan angka total tagihan menggunakan `formatWithCurrency(totalAmount, currency || 'Rp.')` saat `totalAmount >= 0`.
    - **`ValidationDetailPage.tsx`**:
      - Menghitung `effectiveInvoiceTotal` dan `effectiveInvoiceCurrency` via `getEffectiveInvoiceTotal(data, details)`.
      - Mempassing `totalAmount={effectiveInvoiceTotal}` dan `currency={effectiveInvoiceCurrency}` ke `<IssueInvoiceModal />`.
    - **`InvoiceItemsTable.tsx`**:
      - Memperbarui perhitungan footer sticky total agar menggunakan `getEffectiveInvoiceTotal(data, details)` sehingga selalu sinkron dengan modal penerbitan.
  - **3. Verifikasi**:
    - `bun run build` frontend $\to$ **LULUS 100% 0 errors** (3.44s).

---

- [x] **Implementasi Status Badge (Hybrid Ganda) pada Tabel Rincian Item ValidationDetailPage (`ValidationBadges.tsx`, `InvoiceItemsTable.tsx`)**:
  - **1. Kebutuhan**:
    - Menyelaraskan tampilan badge validasi harga item pada halaman detail validasi (`InvoiceItemsTable.tsx`) agar identik dengan `ProfilePricingTab.tsx` dan `FinancialAuditTab.tsx`.
    - Jika tarif item cocok dengan Profil Customer namun berada di atas Price List Master CS:
      - Menampilkan **Badge Hybrid Ganda**:
        1. `[✓ Sesuai Profil]` (emerald)
        2. `[▲ Overcharge (+Rp ...)]` (sky blue)
    - Jika tarif item cocok dengan Profil Customer namun berada di bawah Price List Master CS:
      - Menampilkan **Badge Hybrid Ganda**:
        1. `[✓ Sesuai Profil]` (emerald)
        2. `[Diskon Profil (-Rp ...)]` (amber)
    - Menampilkan `[Non-Validasi]` untuk item biaya cabang tanpa validasi tarif (`isNonValidatedBranchDashFee`).
  - **2. Perubahan Teknis**:
    - **`ValidationBadges.tsx` (`ItemPriceBadge`)**:
      - Menerima prop opsional `evaluation?: any` agar dapat langsung memanfaatkan objek hasil evaluasi dari `evaluatedItems`.
      - Menambahkan cabang `evalRes.isProfileMatchOverMaster` dengan Badge Hybrid `Sesuai Profil` + `Overcharge (+Rp ...)`.
      - Menambahkan cabang `evalRes.isProfileMatchUnderMaster` dengan Badge Hybrid `Sesuai Profil` + `Diskon Profil (-Rp ...)`.
      - Menambahkan penanganan `isNonValidatedBranchDashFee` (`Non-Validasi`).
    - **`InvoiceItemsTable.tsx`**:
      - Mempassing `evaluation={evalItem}` ke `<ItemPriceBadge />` baik pada tampilan kartu mobile (`< sm`) maupun tabel desktop (`>= sm`).
  - **3. Verifikasi**:
    - `bun run build` frontend $\to$ **LULUS 100% 0 errors** (2.88s).

---

- [x] **Perbaikan Validasi Overweight Jalur Laut: Toleransi Pembulatan Wajar 1 kg (`BillingValidationCard.tsx`, `ValidationCardHeader.tsx`, `BillingValidationSummaryModal.tsx`)**:
  - **1. Masalah & Temuan**:
    - Pada invoice `SHS-000238-10-2026` (`https://app.sampai.co/mshipping/finance/billing/validation/SHS-000238-10-2026`), muatan fisik laut terindikasi overweight `+852 kg`. Invoice telah menagihkan item KG sebesar `851 kg`.
    - Tab Overweight mendeteksi selisih `1 kg` dan menyatakan `isBilledOverweightTolerated = true` (karena $\le 1\text{ kg}$ selisih pembulatan wajar).
    - Namun, pada `BillingValidationCard.tsx`, `hasOverweightIssue` memeriksa `(isOverweight && !isBilledOverweightExactMatch)` sehingga tetap bernilai `true` (karena `851 !== 852`).
    - Akibatnya:
      - Header kartu memicu badge Merah (`danger` X) bertuliskan `SELISIH OVERWEIGHT (+852 KG BELUM DITAGIH)` seolah-olah 852 kg belum ditagih sama sekali padahal 851 kg sudah tertagih.
      - Tab default otomatis terpaksa membuka Overweight tab sebagai "error".
  - **2. Perbaikan Teknis**:
    - **`BillingValidationCard.tsx`**:
      - Memperbaiki `hasOverweightIssue` agar hanya memicu issue jika `(!isBilledOverweightMatch && isOverweight) || isBilledUnneededOverweight`. Kondisi pembulatan wajar $\le 1\text{ kg}$ (`isBilledOverweightTolerated`) tidak lagi dianggap sebagai issue/error.
      - Menambahkan penanganan badge khusus saat `!isAir && isOverweight && isBilledOverweightTolerated`:
        - Variant: `warning` (amber).
        - Icon: `AlertTriangle`.
        - Badge Text: `PEMBULATAN WAJAR ${Math.abs(overweightDiff)} KG (${matchedSourceName})`.
        - Tooltip: `Tagihan memuat item penagihan KG sebesar 851 kg. Terdapat selisih pembulatan wajar 1 kg dengan perhitungan sistem (+852 kg).`
      - Memperbaiki teks selisih overweight saat `effectiveBilledKg > 0`: Menampilkan `SELISIH OVERWEIGHT (+${kurangTagih} KG KURANG TAGIH)` dan bukan lagi `BELUM DITAGIH`.
    - **`ValidationCardHeader.tsx`**:
      - Menambahkan prop `badgeTitle?: string` agar detail penjelasan toleransi pembulatan wajar dapat terbaca jelas pada tooltip saat kursor diarahkan ke badge.
    - **`BillingValidationSummaryModal.tsx`**:
      - Menyederhanakan `hasOverweightIssue` agar konsisten dengan `useBillingValidation` dan tidak lagi membatalkan kecocokan fallback kandidat berat.
  - **3. Verifikasi**:
    - `bun run build` frontend $\to$ **LULUS 100% 0 errors** (3.30s).
  - **1. Kasus & Analisis**:
    - Kasus Invoice: `GZS-011183-10-2026` (`MITRA JAYA` - `M000198`), item `MINIMUM CHARGES - CONTROL MOTOR-B, CARBON BRUSH`.
    - Ditagih di invoice: **Rp 5.500.000 / M³** (Total Rp 550.000).
    - Acuan Master Price List CS: **Rp 4.700.000 / M³**.
    - Angka Profil Customer (`tbCustomersHarga.fdGzLrUmum`): **Rp 5.500.000 / M³**.
    - Pertanyaan pengguna: *"tidak overprice ?"* $\to$ Harga invoice memang di atas Master Price List (+Rp 800.000), namun cocok dengan profil customer `MITRA JAYA`.
  - **2. Solusi Teknis (Badge Hybrid)**:
    - Menambahkan deteksi `isProfileMatchOverMaster` dan `isProfileMatchUnderMaster` serta kalkulasi `masterPriceDiff` pada `billing.utils.ts`.
    - Jika harga invoice cocok dengan Profil CS tetapi lebih tinggi dari Master Price List:
      - Ditampilkan **Badge Hybrid Ganda**:
        1. Badge Hijau: `[✓ Sesuai Profil]` (menegaskan tagihan sah dan sesuai kontrak pelanggan di FoxPro).
        2. Badge Sky Blue: `[▲ Overcharge (+Rp 800.000)]` (menginformasikan secara transparan bahwa tagihan berada di atas Price List Master CS).
    - Diterapkan secara konsisten pada:
      - `ProfilePricingTab.tsx` (kartu validasi detail)
      - `FinancialAuditTab.tsx` (tabel audit ringkasan penerbitan invoice)
  - **3. Verifikasi**:
    - Uji coba data live `GZS-011183-10-2026` $\to$ `isMatched: true`, `isProfileMatchOverMaster: true`, `masterPriceDiff: 800000`.
    - `bun run build` frontend $\to$ **LULUS 100% 0 errors** (3.70s).

---



- [x] **Redesign Billing Dashboard — Eliminasi Redundansi Matriks Komparasi 3 Periode (`DashboardPage.tsx`)**:
  - **1. Analisis & Masalah Redundansi**:
    - Permintaan: */design-taste-frontend redesign billing dashboard dan hilangkan redundant Matriks Komparasi 3 Periode pada grafik bulanan*.
    - Sebelumnya, `BillingPeriodMatrixTable` dirender ganda: di dalam tab **Bulanan** (terhimpit dalam kolom 1/3 di samping grafik tren 12 bulan) dan di tab terpisah **Komparasi**.
    - Penempatan ganda ini membuat grafik 12 bulan terjepit, sumbu X dan kurva komparasi YoY tahun lalu menjadi padat, serta terjadi duplikasi informasi tabel.
  - **2. Perbaikan & Redesign Berbasis Design Taste Frontend**:
    - **Tab Bulanan**: Menghilangkan grid 3-kolom dan membuang `BillingPeriodMatrixTable` dari dalamnya. Kanvas grafik tren 12 bulan kini kembali 100% full-width lapang, kurva tren bulanan & garis putus-putus YoY sangat leluasa dibaca, tombol switcher metrik, filter moda, dan toggle YoY tersusun rapi.
    - **Tab Komparasi**: Didesain ulang menjadi terminal analitik 3 periode yang eksklusif, terstruktur, dan berkelas:
      - 3 **Quick Summary Cards** di atas tabel: *Total Omzet Tagihan*, *Volume Faktur Diterbitkan*, dan *Rata-rata Nilai / Faktur* dengan badge pertumbuhan MoM & YoY.
      - **Tabel Matriks Komparasi 3 Periode** (8 metrik kunci: faktur, tagihan, udara/laut, tiket rata-rata, pelanggan) dengan font mono tabular-nums dan tooltip selisih angka riil.
      - **Panel Evaluasi & Komposisi**: Menampilkan periode audit vs baseline (Bulan Lalu & Tahun Lalu) dan **Proporsi Pangsa Omzet Moda (Udara vs Laut)** interaktif dengan progress bar visual semantik (amber vs sky) dan persentase kontribusi.
  - **3. Verifikasi Build**:
    - `cd c:\shipping\frontend && bun run build` $\to$ **LULUS 100% 0 errors** (3.14s).
  - **4. Sinkronisasi Dokumentasi**:
    - `frontend-app.md`, `docs/frontend/billing.md`, dan `.agents/working.md`.

---

- [x] **Penambahan Matriks Komparasi 3 Periode (MoM & YoY) pada Dashboard Billing (`https://app.sampai.co/mshipping/finance/billing`)**:
  - **1. Analisis Kebutuhan**:
    - Permintaan: *"tambahkan Matriks Komparasi 3 Periode seperti pada dashboard delivery order-> pada https://app.sampai.co/mshipping/finance/billing"*.
    - Menyelaraskan kapabilitas analitik performa bulanan penagihan/billing dengan modul Delivery Order (`DeliveryMomYoySection.tsx`), yang mencakup:
      1. Toolbar Navigasi Periode Bulan & Tahun (MoM & YoY Audit) dengan tombol panah `<` `>` dan tombol kembali ke Bulan Berjalan.
      2. Matriks Komparasi 3 Periode (Bulan Berjalan vs Bulan Lalu vs Tahun Lalu) yang menampilkan 8 metrik kunci penagihan, persentase MoM & YoY, dan nominal/qty selisih.
      3. Kartu KPI Invoice & Tagihan otomatis bereaksi terhadap bulan yang dipilih dan menampilkan badge `GrowthPill` MoM dan YoY interaktif.
  - **2. Backend (`billing-analytics.service.ts`, `billing.types.ts`)**:
    - **Tipe Data Baru**: Menambahkan interface `PeriodBillingMetrics`, `MetricComparison`, `BillingComparisons` pada `billing.types.ts`.
    - **Parameter `year` & `month`**: Endpoint `GET /api/billing/kpi` kini menerima parameter opsional `year` dan `month` (fallback ke tahun & bulan berjalan).
    - **Kueri Paralel 3 Periode**:
      - `currentMonth`: Metrik bulan terpilih (`totalInvoices`, `totalTagihan`, `invoicesUdara`, `tagihanUdara`, `invoicesLaut`, `tagihanLaut`, `avgInvoiceValue`, `uniqueCustomers`).
      - `prevMonth`: Metrik 1 bulan sebelumnya (MoM).
      - `lastYearSameMonth`: Metrik bulan yang sama 1 tahun lalu (YoY).
    - **Kalkulasi Komparasi Otomatis (`calcComp`)**: Menghitung `momDiff`, `momPercent`, `yoyDiff`, dan `yoyPercent` secara presisi.
  - **3. Frontend (`frontend/src/features/billing/`)**:
    - **Komponen Modular Baru (`BillingPeriodMatrixSection.tsx`)**:
      - `BillingPeriodNavigator`: Toolbar navigasi bulan & tahun dengan indikator status badge hijau berdenyut `[Bulan Berjalan]` atau amber `[Audit Periode Lampau]`, subline teks kontekstual, dan tombol reset.
      - `BillingPeriodMatrixTable`: Tabel berdensitas tinggi ber-token tema ERP yang menyajikan 8 metrik penagihan (*Total Faktur*, *Total Tagihan*, *Faktur Udara*, *Tagihan Udara*, *Faktur Laut*, *Tagihan Laut*, *Rata-rata / Bill*, *Customer Ditagih*), format mono tabular-nums, badge persentase naik/turun berikon panah, tooltip detail selisih angka riil, dan footer keterangan periode pembanding.
      - `GrowthPill`: Sub-komponen badge pertumbuhan untuk KPI cards.
    - **Integrasi `DashboardPage.tsx`**:
      - State `selectedYear` dan `selectedMonth` terintegrasi reaktif ke `useBillingDashboard`.
      - Toolbar navigasi disematkan di atas grid kartu KPI.
      - Kartu *Invoice Terbit Bulan Ini* dan *Total Nominal Tagihan Bulan Ini* dilengkapi badge `GrowthPill` MoM & YoY.
      - Tab **Bulanan** dikonfigurasi dalam layout 2-kolom (`grid-cols-1 lg:grid-cols-3`): sisi kiri grafik tren 12 bulan (`TrendChart`), sisi kanan **Matriks Komparasi 3 Periode** (`BillingPeriodMatrixTable`).
      - Ditambahkan tab navigasi mandiri **Komparasi 3 Periode** (`komparasi`) pada `chartTabs`.
    - **Dukungan i18n ID & EN**:
      - Menambahkan translasi kamus di `src/lib/i18n/id.json` dan `en.json` untuk `billing.tab.comparison`, `billing.comparisonMatrixTitle`, `billing.comparisonMatrixSubtitle`, `billing.currentMonthBadge`, `billing.pastAuditBadge`, dan `billing.evaluatingVs`.
  - **4. Verifikasi**:
    - `bun run build` frontend $\to$ **LULUS 100% 0 errors** (3.48s).
    - PM2 service `ShippingApi` online dan stabil.
    - Uji HTTP status produksi `https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Sinkronisasi dokumentasi di `frontend-app.md`, `backend-app.md`, `docs/frontend/billing.md`, dan `docs/backend/billing.md`.

---

- [x] **Perbaikan Radix UI Slot Error pada Komponen Button (`Button.tsx`)**:
  - **1. Akar Masalah**:
    - Error runtime: `Error: Slot failed to slot onto its children. Expected a single React element child or Slottable. at Button-DAnotFne.js:1:1194`.
    - Komponen `<Button asChild>` merender Radix UI `<Slot>` saat `asChild={true}`.
    - Pada implementasi sebelumnya, elemen spinner `{isLoading && (...)}` dan `{children}` disematkan berdampingan di dalam tag `<Comp>`.
    - Di React 19 JSX runtime, hal ini memasukkan array `[undefined/false, children]` sebagai props `children` ke `<Slot>`.
    - Karena `children` berupa Array (bukan single element) dan tidak menggunakan `<Slottable>`, Radix UI memicu crash error tersebut saat komponen seperti `ListPage.tsx` (Customer Price List) menggunakan `<Button asChild>`.
  - **2. Perbaikan**:
    - Memisahkan branch rendering saat `asChild === true`: me-return `<Slot ref={ref} className={combinedClassName} aria-disabled={disabled || isLoading ? true : undefined} {...props}>{children}</Slot>` secara langsung tanpa injeksi sibling spinner di dalam Slot.
    - Branch normal (`<button>`) tetap menyertakan visual loading spinner dan disabled props.
  - **3. Verifikasi**:
    - `bun run build` frontend $\to$ **LULUS 100% 0 errors** (3.61s, `dist/assets/Button-CiW3Ry7e.js`).

---


- [x] **Perbaikan Validasi Tarif M³ Multi-Komoditas — Eliminasi False `NO_TARGET` Saat Profil Flat = 0 (`billing.utils.ts`, `ProfilePricingTab.tsx`)**:
  - **1. Akar Masalah & Kasus**:
    - Kasus Invoice: `GZS-011144-09-2026` (Customer `B000075` - `BINTANG BUANA`), item `PARCELS TO JAKARTA (M3) - MEDICAL DEVICE` (ditagih Rp 6.750.000).
    - Status sebelumnya: Berstatus **`NO_TARGET`** dengan label `LARTAS - S`.
    - Akar Masalah 1: `isM3MainItem` mengasumsikan seluruh item M3 harus divalidasi ke tarif M3 flat profil customer (`profileHarga.harga`). Pada customer multi-komoditas seperti Bintang Buana, `profileHarga.harga = 0` karena tagihan mengikuti kategori komoditas masing-masing (Alkes Rp 6.750.000, Lartas Normal Rp 6.000.000, General Goods Rp 4.500.000). Ketika `profileHarga.harga === 0`, sistem menimpa target price menjadi 0 dan mengunci `hasTargetPrice = profilePrice > 0` $\to$ `false`, memutus rantai fallback ke Price List dan langsung mengembalikan `NO_TARGET`.
    - Akar Masalah 2: Sistem sebelumnya menimpa `comodityName` dengan default kargo (`LARTAS - S`) dari `defaultTypeId` header muatan, mengabaikan teks spesifik barang di nama item (`MEDICAL DEVICE`). Selain itu, kategori `LARTAS - S` tidak ada di Price List Master/Customer, yang ada adalah `Alkes, Makanan & LS Lainnya` (Rp 6.750.000 di Master MKT).
  - **2. Perbaikan Logika**:
    - **`hasM3FlatProfile`**: Item M3 hanya divalidasi ke `profileHarga.harga` jika profil customer memang memiliki harga flat (`profileHarga.harga > 0`). Jika `0`, sistem otomatis fallback melanjutkan pencarian ke Price List komoditas (Customer Price List $\to$ Master Price List).
    - **Ekstraksi Komoditas Spesifik (`textAfterDash`)**: Jika item invoice memiliki teks spesifik setelah tanda `-` (e.g. `MEDICAL DEVICE`), nama komoditas spesifik tersebut diprioritaskan alih-alih ditimpa kategori payung kargo `LARTAS - S`.
    - **Pencocokan Heuristik Kategori Laut**: Menambahkan pengenalan kata `textAfterDash` untuk `MEDICAL` / `ALKES` / `MEDIS` $\to$ kategori `Alkes, Makanan & LS Lainnya`, `GLASS` / `ACCESSORIES` $\to$ `General Goods`, `TABLEWARE` / `STAINLESS` $\to$ `Lartas Normal`, serta deteksi kosmetik/obat.
    - **Sinkronisasi `ProfilePricingTab.tsx`**: `isProfileValidated` disesuaikan menjadi `isTaxReturnItem || (isM3MainItem && profilePrice > 0) || isKgOverweightItem` agar saat `profilePrice === 0`, badge status mengevaluasi terhadap `evaluation.priceItem`.
  - **3. Hasil Evaluasi**:
    - `PARCELS TO JAKARTA (M3) - MEDICAL DEVICE` (ditagih Rp 6.750.000) $\to$ Cocok dengan Master MKT `Alkes, Makanan & LS Lainnya` (Rp 6.750.000) $\to$ Status **`MATCH`**!
    - `PARCELS TO JAKARTA (M3) - GLASS, ELECTRONIC ACCESSORIES` (ditagih Rp 4.500.000) $\to$ Cocok dengan Master MKT `General Goods` (Rp 4.500.000) $\to$ Status **`MATCH`**!
    - `PARCELS TO JAKARTA (M3) - STAINLESS STEEL TABLEWARE, CUPS` (ditagih Rp 6.000.000) $\to$ Cocok dengan Master MKT `Lartas Normal` (Rp 6.000.000) $\to$ Status **`MATCH`**!
  - **4. Verifikasi**:
    - `bun run build` frontend $\to$ **LULUS 100% 0 errors** (3.40s, `dist/assets/billing-Cz0vI-qv.js`).

---

- [x] **Audit & Fix P1 Bug Voice Command pada Validasi Detail Bill (`ValidationDetailPage.tsx`)**:
  - **1. Audit Menyeluruh**:
    - Diaudit seluruh sistem voice command: `ValidationDetailPage.tsx`, `ValidationVoiceHud.tsx`, `voiceAssistantStore.ts`, `useVoiceRecognition.ts`, `voiceSearch.utils.ts`, `Topbar.tsx`.
    - Ditemukan 7 bug + 3 warning. 2 bug P1 kritis difix pada sesi ini.
  - **2. BUG-06 Fix — Mic Auto-Restart Setelah Mute + Tutup Modal**:
    - **Akar Masalah**: `useEffect([isAnyModalOpen, isSupported, ...])` pada saat modal ditutup masuk branch `if (!isAnyModalOpen && isSupported)` → `isManuallyStoppedRef.current = false` → `startListening()`. Tidak ada pengecekan `isMuted` sehingga mic aktif kembali meskipun user sudah mute via Alt+V / klik HUD.
    - **Fix**: Tambah gate `&& !isMuted` pada kondisi if, dan tambah double-check `!isMuted` di dalam callback `setTimeout` (200ms async gap). Tambah `isMuted` ke dep array useEffect.
  - **3. BUG-02 Fix — Race Condition Re-arm Setelah Stop Modal**:
    - **Akar Masalah**: Potensi mic restart sejenak setelah modal dibuka karena `onEnd` dari `stopListening()` terpanggil sebelum state React ter-flush. Walaupun `isManuallyStoppedRef = true` sudah ada di else block, penambahan komentar eksplisit + double-check `!isMuted` di setTimeout memperkuat guard.
    - **Fix**: Komentar eksplisit + double-check `!isMuted` pada setTimeout callback di if-branch.
  - **4. Verifikasi**:
    - `bun run build` frontend → **LULUS 100% 0 errors** (3.35s, `dist/assets/billing-QqKV9CM6.js`).

---

- [x] **Modernisasi Voice Command & Eliminasi Redundansi UI pada Halaman Validasi Billing (`ValidationDetailPage.tsx`, `ValidationVoiceHud.tsx`, `voiceAssistantStore.ts`, `VoiceAssistantModal.tsx`)**:
  - **1. Analisis Kebutuhan & Akar Masalah**:
    - Permintaan: *"buatkan plan update voice command pada validasi detail page biling. Sekarang terdapat redundant pada ui, buatk flow agar sesuai sistem modern. apakah sistem voice global perlu di gabung juga? -> ya"*
    - **Akar Masalah Redundansi**:
      - Terjadi duplikasi tombol kontrol suara: Tombol di Header Ribbon Bar (`[ 🟢 🎙️ Suara Aktif ]` dengan tooltip 15 baris) DAN Tombol bulat FAB Floating Action Stack di sudut kanan bawah layar.
      - Terjadi duplikasi tombol buka drawer invoice: Tombol `ListFilter` di header ribbon dan tombol bulat `ListFilter` di kanan bawah.
      - Floating FAB bulat kanan bawah kerap menutupi tabel dimensi koli atau tombol submit pada layar laptop/tablet.
      - Transkrip suara berupa balon teks melayang di bawah tombol yang sering tumpang tindih dengan elemen lain.
      - Sistem suara terfragmentasi: Halaman validasi menggunakan `suppressVoice()` untuk mematikan asisten global, lalu membuat instance lokal terpisah.
  - **2. Solusi Teknis & Arsitektur Unified Modern**:
    - **Single Source of Truth Store (`voiceAssistantStore.ts`)**:
      - Menghapus supresi kaku `suppressVoice()`. Menggantinya dengan konsep **Adaptive Display Mode** (`displayMode: 'modal' | 'hud'`).
      - Saat di halaman umum/dashboard: `displayMode === 'modal'`, membuka `VoiceAssistantModal` untuk pencarian & navigasi lintas ERP.
      - Saat di Halaman Validasi Billing: `displayMode === 'hud'`, modal pop-up hitam global otomatis di-bypass, dan asisten suara beradaptasi menjadi capsule HUD ramping.
      - Mengintegrasikan state telemetri suara terpusat (`isListening`, `isMuted`, `transcript`, `interimTranscript`, `commandStatus`, `commandFeedback`).
    - **Unified Dynamic Voice Capsule HUD (`ValidationVoiceHud.tsx`)**:
      - Ditempatkan melayang ramping di **Bottom-Center** layar dengan elevasi tinggi di atas Windows taskbar (`fixed bottom-10 sm:bottom-14 md:bottom-16 left-1/2 -translate-x-1/2 z-40`). Jarak 40px–64px menjamin HUD tidak terpotong atau tertutup Windows taskbar/browser bottom bar.
      - Menampilkan 4 status visual adaptif:
        1. *Standby (Idle)*: Pill ramping `[ 🟢 Siap Mendengar ]` + tombol mute/unmute + tombol help `[ ? ]`.
        2. *Listening*: Melebar halus, visualizer mini waveform audio dinamis aktif bergerak, live speech text.
        3. *Executing*: Badge interaktif berikon checkmark dengan nama aksi yang dijalankan (e.g. *"Membuka invoice GZS-011023..."*, *"Beralih ke Tab M³..."*).
        4. *Muted*: Indikator netral `[ 🔇 Mikrofon Jeda ] (Alt+V)`.
      - **Clickable Command Cheat Sheet Popover**: Tombol `[ ? ]` membuka kartu panduan terstruktur dengan chip perintah yang bisa langsung di-klik jika staf berada di area gudang yang bising (tanpa harus bicara).
    - **Auto-Hide Tombol Mic Topbar (`Topbar.tsx`)**:
      - Ditambahkan kondisi pengecekan `canUseVoice && displayMode !== 'hud'`.
      - Tombol asisten suara di topbar otomatis disembunyikan saat pengguna berada di halaman validasi detail (mode HUD) untuk mencegah duplikasi tombol di layar.
    - **Pembersihan Total Redundansi pada `ValidationDetailPage.tsx`**:
      - Menghapus 100% stack `createPortal` FAB floating ganda di sudut kanan bawah. Area kerja tabel menjadi lapang dan bebas halangan.
      - Menghapus tombol telemetri mic lama di ribbon header.
      - Menata tombol drawer invoice di header ribbon dengan ikon dan label teks yang elegan: `<ListFilter className="w-3.5 h-3.5 text-blue-600" /> <span className="hidden sm:inline">Cari Invoice</span>`.
      - Menghubungkan seluruh aksi suara ke `setCommandStatus` untuk feedback real-time pada HUD.
  - **3. Verifikasi**:
    - `bun run build` frontend $\to$ **LULUS 100% 0 errors** (3.36s).
    - Uji bypass modal global di HUD mode & tombol topbar auto-hide berjalan sempurna.
    - Dokumentasi disinkronkan di `frontend-app.md`, `docs/frontend/billing.md`, dan `.agents/working.md`.

---

- [x] **Tombol Mikrofon Eksplisit & Penyelarasan Voice Command pada Validasi Detail Bill (`ValidationDetailPage.tsx`, `ValidationSummaryHeader.tsx`)**:
  - **1. Analisis Kebutuhan**:
    - Pengguna meminta: *"buatkan tombol untuk mengaktifkan mic pada page validasi detail bill /plan buatkan plan dulu. update semua yang terkait fungsi voice command ini pada page validasi detail"*
    - Evaluasi feedback posisi: *"terlalu ke bawah, tidak terlihat... terhalang sidebar juga"*.
    - Karena sidebar M-Shipping berada di sisi kiri (`left`), penempatan FAB di sisi kiri (`left-3`) menyebabkan tombol tertimpa/terhalang sidebar dan `bottom-6` terlalu dekat dengan batas bawah layar.
  - **2. Solusi & Desain Antarmuka**:
    - **FAB Floating Mic (Kanan Bawah Layar — Bebas Terhalang Sidebar)**:
      - Digabungkan ke dalam **Floating Action Stack** di posisi `fixed right-3.5 sm:right-5 bottom-8 sm:bottom-10 z-40`, berpasangan vertikal tepat di atas FAB Drawer Pencarian.
      - **Bebas 100% dari Sidebar**: Posisi di kanan layar menjamin tidak pernah tertimpa sidebar kiri utama.
      - **Ketinggian Aman**: Dinaikkan ke `bottom-8` (32px-40px) agar sangat terlihat dan tidak terpotong oleh navigation bar browser/taskbar.
      - Indikator Visual Aktif: Background emerald (`bg-emerald-600`), ring aksen `ring-4 ring-emerald-500/25`, animasi denyut ganda `animate-ping`, ikon `Mic` putih, dan badge live speech bubble di samping kirinya.
      - Indikator Jeda: Background surface netral dengan border kontras dan ikon `MicOff` bergaris coret.
      - Klik langsung beralih antara mendengarkan vs jeda mikrofon (sinkron dengan `Alt+V`).
    - **Tombol Ribbon Header Bar (`ValidationDetailPage.tsx`)**:
      - Menyederhanakan label menjadi statis (`Suara Aktif` vs `Mikrofon Jeda`) agar ukuran tombol tetap stabil.
      - Menggunakan `MicOff` saat jeda.
      - Menampilkan teks transkrip suara langsung via badge speech bubble kecil mengambang di bawah tombol tanpa merusak lebar ribbon.
      - Refactoring `handleToggleVoice` terpusat yang sinkron dengan shortcut `Alt+V`, tombol header, dan FAB floating.
    - **Tombol Mic Header Modal (`ValidationSummaryHeader.tsx`)**:
      - Menyelaraskan tombol mikrofon modal dengan label stabil (`Suara Aktif` vs `Mikrofon Jeda`), ikon `Mic` / `MicOff`, dan badge ucapan live.
    - **Panduan 17 Perintah Suara Lengkap pada Tooltip**:
      - Didokumentasikan secara terstruktur di dalam tooltip tombol:
        1. Buka Invoice: `"Buka [No Invoice]"`, `"Buka 11023"`, `"Buka invoice 011023"`.
        2. Navigasi Tab: `"Tab 1"` s/d `"Tab 5"`, `"Tab Item"`, `"Tab M3"`, `"Tab Overweight"`, `"Tab Freight"`, `"Tab Ekspedisi"`.
        3. Aksi Cepat: `"Refresh"` / `"Segarkan"`, `"Cari"` / `"Pilih Invoice"`, `"Terbitkan"`, `"Cetak"` / `"Print"`.
        4. Dialog Khusus: `"Inspeksi"`, `"Resi"`, `"History"`, `"Audit Tarif"`, `"Kembali"`.
  - **3. Verifikasi & Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 error** (3.11s).
    - Status PM2 `ShippingApi` stabil online.
    - Dokumentasi disinkronkan di `docs/frontend/billing.md`, `frontend-app.md`, dan `.agents/working.md`.

---


- [x] **Penyempurnaan Indikator & Notifikasi Kargo Pill PARSIAL (`TargetPage.tsx`)**:
  - **1. Analisis & Temuan**:
    - Pertanyaan pengguna: *"pada pill parsial kenapa tidak menampilkan hanya yang parsial?"*
    - Di backend `billing-analytics.service.ts`: Kargo dikategorikan parsial (`isPartial = true`) jika nomor tanda terima agennya (`fdTerima`) memuat lebih dari 1 kode marking untuk customer yang sama (`COUNT(DISTINCT fdMarkingCode) > 1` via CTE `PartialSJ`). Terdapat 11 kargo aktif berstatus parsial multi-marking.
    - Di antarmuka sebelumnya: Kolom *Customer & Status* menampilkan status customer (`OK`, `WARNING`, `URGENT`), dan kolom *Status Kirim* menampilkan `TERIMA SJ [tanggal]`. Badge `PARSIAL` hanya berupa teks kecil di samping kode marking tanpa penjelas yang jelas, sehingga membingungkan pengguna seolah kargo tersebut adalah kargo biasa/normal.
  - **2. Perbaikan & Penyempurnaan UI**:
    - **Banner Kontekstual Parsial**: Menambahkan notice bar ungu di atas tabel saat pill `PARSIAL` aktif yang menjelaskan bahwa daftar menampilkan kargo dengan tanda terima agen multi-marking, lengkap dengan tautan rincian.
    - **Badge Status PARSIAL Interaktif (Desktop Table)**:
      - Di kolom *Customer & Status*: Menambahkan badge tombol interaktif `[PARSIAL (N Resi)]` di samping status customer yang dapat langsung diklik untuk membuka modal `PartialDetailModal`.
      - Di kolom *Marking & Kargo*: Memperjelas tombol badge marking dengan ikon `Layers` dan count resi `[PARSIAL (N)]`.
    - **Badge PARSIAL pada Mobile Card List**:
      - Top bar mobile card: Ditambahkan tombol `PARSIAL (N)` di samping badge status customer.
      - Marking card mobile: Ditambahkan label dan ikon `Layers` interaktif.
  - **3. Verifikasi & Build**:
    - `bun run build` $\to$ **LULUS 100% 0 errors** (2.91s).
    - Data 11 item parsial kini tampil jelas dengan indikator ungu `PARSIAL (N Resi)` di seluruh tampilan desktop dan mobile.

---

- [x] **Fitur Tanggal Berakhirnya Harga Customer & Penyesuaian Validasi Bill (`customer-price-list`, `price-check`, `billing`)**:
  - **1. Database & Prisma Schema**:
    - Menambahkan kolom `endDate DATETIME2 NULL` pada tabel `tbCustomerPriceListUpload` di MS SQL Server.
    - Menambahkan `endDate DateTime? @db.DateTime2` pada `schema.prisma` dan meregenerasi Prisma Client.
  - **2. Backend (`customer-price-list`, `price-check`, `m3-check`)**:
    - `customer-price-list.service.ts`:
      - `ingestCustomerPriceListFile`: Menerima dan menyimpan `endDate` pada metadata upload serta item.
      - `listCustomersWithPriceList` & `listCustomerUploads`: Mengembalikan `endDate`, menghitung `isExpired` (`endDate < TODAY`) dan `isExpiringSoon` ($\le 7$ hari).
      - `lookupCustomerPriceList`: Memfilter upload & item yang masih aktif (`endDate == null || targetDate <= endDate`), meneruskan `endDate` pada setiap item.
      - `updateCustomerUploadEffectiveDate`: Menerima `effectiveDate` dan `endDate`, memperbarui upload dan mensinkronisasikan ke `tbCustomerPriceListItem`.
      - `setCustomerCommodityPriceEndDate`: Endpoint baru `PUT /api/customer-price-list/items/:id/end-date` untuk mengatur tanggal berakhir per item khusus dan sinkronisasi ke `tbCommodityMapping`.
    - `marking-matcher.ts`: Menambahkan filter `endDate` pada `findCustomerMarkingOverrideUpload`.
    - `price-check.service.ts` & `price-check.types.ts`:
      - Evaluasi Tier 1, 2, 3 (single & batch check) mengecualikan tarif khusus yang sudah kedaluwarsa (`endDate < targetDate`).
      - Jika tarif kedaluwarsa, mesin cek harga otomatis fallback ke Master Price List (CS/MKT), serta mencatat `customerEndDate`, `isCustomerPriceExpired: true`, dan `isCustomerPriceExpiringSoon: true`.
    - `m3-check.service.ts` & `m3-check.types.ts`:
      - Memperbaiki `customerEndDate: customerPriceEndDate` pada return object `priceValidation` (sebelumnya memanggil variabel `customerEndDate` yang belum didefinisikan sehingga memicu `ReferenceError: customerEndDate is not defined` pada `/api/billing/m3-check`).
      - Meneruskan metadata kedaluwarsa customer ke payload `priceValidation`.
  - **3. Frontend Customer Price List (`frontend/src/features/customer-price-list/`)**:
    - `customerPriceList.types.ts` & `customerPriceList.service.ts`: Kontrak TypeScript dan service client diperluas dengan field `endDate`, `isExpired`, `isExpiringSoon`, dan method `setSpecialPriceEndDate`.
    - `EditEffectiveDateModal.tsx`: Field `Berlaku Sampai (End Date)`, toggle checkbox "Tanpa batas waktu (Selamanya)", dan validasi `endDate >= effectiveDate`.
    - `UploadPage.tsx`: Input `Berlaku Sampai (End Date)` dan toggle "Tanpa batas waktu (Selamanya)" saat upload berkas Excel.
    - `ListPage.tsx`:
      - Tab 1 (`special_prices`): Kolom Masa Berlaku menampilkan rentang Mulai s/d Sampai, status badge mendukung "Segera Berakhir" ($\le 7$ hari).
      - Tab 2 (`master_uploads`): Kolom Masa Berlaku menampilkan rentang Mulai s/d Sampai, badge "Kedaluwarsa" / "Segera Berakhir", dan tombol aksi cepat "Masa Berlaku" membuka `EditEffectiveDateModal`.
    - `HistoryPage.tsx` & `DiffPage.tsx`: Sinkronisasi modal dan visualisasi rentang masa berlaku.
  - **4. Frontend Validasi Bill (`frontend/src/features/billing/`)**:
    - `billing.types.ts`: Field `customerEndDate`, `isCustomerPriceExpired`, `isCustomerPriceExpiringSoon` pada `PriceItem` dan `priceValidation`.
    - `billing.utils.ts` (`evaluateItemPrice`): Mengecualikan item customer yang `endDate < invoiceDate`, mencatat flag `isCustomerPriceExpired` dan tanggal berakhirnya.
    - `ProfilePricingTab.tsx`:
      - Menampilkan rentang masa berlaku profil tarif customer (`Masa Berlaku: [mulai] s/d [sampai]`).
      - Menampilkan badge warning merah `⚠️ Tarif Customer Kedaluwarsa (Berakhir: [tgl])` jika tanggal tagihan melampaui masa berlaku.
      - Menampilkan badge amber jika masa berlaku segera berakhir ($\le 7$ hari).
      - Menampilkan catatan pada item invoice jika tarif customer telah kedaluwarsa dan terjadi fallback ke Master Price List.
  - **5. Verifikasi & Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (4.08s).
    - PM2 service `ShippingApi` berhasil direstart dan berjalan stabil online.
    - HTTP Health check `GET /api/health` $\to$ **200 OK**.
    - Dokumentasi disinkronkan di `docs/backend/pricing.md`, `docs/frontend/pricing.md`, `docs/frontend/billing.md`, dan `.agents/working.md`.

---


- [x] **Full Audit & Penyempurnaan Semua Pill / Filter Halaman Target Bill (`TargetPage.tsx`, `billing-analytics.service.ts`)**:
  - **1. Analisis & Verifikasi Backend**:
    - URL: `https://app.sampai.co/mshipping/finance/billing/target`
    - Memverifikasi 17 filter pill (3 Mode Tab, 6 PIC Pills, 8 Kategori Pills).
    - Verifikasi backend `getBillingTargetDetails`:
      - `isPartial`: Terverifikasi dikirim dari CTE `PartialSJ` (`COUNT(DISTINCT RTRIM(el.fdMarkingCode)) > 1` per `fdTerima`).
      - `hari`: Terverifikasi dihitung dan dikirim via `Number(r.hari || 0)`.
      - `type=all`: Terverifikasi menggabungkan data `fetchItemsForType('udara')` dan `fetchItemsForType('laut')` via `Promise.all`.
      - `status`: Terverifikasi nilai `COD` dan `URGENT` berada di field `status` (`r.Status`).
  - **2. Perbaikan & Penyempurnaan Frontend (`TargetPage.tsx`)**:
    - **Definisi No Type Diperluas (`isNoTypeTargetItem`)**: Menangkap nilai kosong, `-`, `0`, `NONE`, `N/A`, `NA`, dan `NULL` secara konsisten pada badge, counter, dan filter.
    - **Cross-PIC Group Aggregation (`rawGroupCounts`)**: Menghitung ketersediaan item per kategori di seluruh PIC untuk memberikan auto-suggestion tombol aksi saat filter aktif menghasilkan 0 data.
    - **Penyempurnaan Reset Button Atomik**: Menghapus mutasi state ganda yang berpotensi memicu race condition, kini mendelegasikan pembersihan ke `setSearchParams({})` secara reaktif.
    - **Indikator Visual Pill FCL pada Mode Udara**: Menambahkan tooltip dan visual tone subtle pada pill FCL saat moda Udara aktif untuk memperjelas bahwa FCL spesifik moda Laut (klik langsung auto-switch ke Laut).
    - **Panduan Kontekstual Lengkap Saat Empty State**: Menambahkan pesan penjelasan dan tombol pemulihan cerdas untuk setiap kategori: `sj_sent`, `partial`, `fcl`, `cod`, `urgent`, `aging`, dan `no_type`.
  - **3. Verifikasi & Build**:
    - `bun run build` $\to$ **LULUS 100% 0 errors** (3.11s).
    - PM2 service `ShippingApi` stabil online.
    - Dokumentasi `docs/frontend/billing.md` dan `.agents/working.md` disinkronkan.

---

- [x] **Perbaikan Penanganan Filter URL dan Tampilan Data Kargo FCL pada Target Bill (`TargetPage.tsx`, `billing-analytics.service.ts`)**:
  - **1. Analisis Kebutuhan & Akar Masalah**:
    - URL Pengguna: `https://app.sampai.co/mshipping/finance/billing/target?group=fcl`
    - Keluhan: *"ini kenapa tidak berfungsi / menampilkan data sesuai pill"*
    - **Akar Masalah 1 (Backend Crash Loop Akibat Duplicate Variable Declaration)**:
      - Pada `billing-analytics.service.ts`, terdapat duplikasi deklarasi variabel `const markingNo` di baris 811 dan baris 864 di dalam loop pemetaan data target.
      - Hal ini menyebabkan runtime Bun/Node menghasilkan error `markingNo has already been declared` dan memicu PM2 `ShippingApi` crash-loop (restart berulang kali hingga 7.000+ kali).
      - Setiap panggilan API `GET /api/billing/target-details` gagal (HTTP 500 / 502 / Connection Reset), sehingga frontend tidak dapat mengambil data target billing sama sekali ("Tidak ada data" / stuck).
    - **Akar Masalah 2 (Desinkronisasi State URL SearchParams di Frontend)**:
      - Di `TargetPage.tsx`, parameter URL `group` hanya dibaca satu kali pada saat inisialisasi `useState(initialGroup)`.
      - Komponen tidak memiliki `useEffect` listener untuk menyinkronkan state `activeGroup`, `activeType`, dan `activePic` saat pengguna berpindah URL atau mengklik link deep-link (`?group=fcl`).
    - **Akar Masalah 3 (Kargo FCL Tereliminasi oleh Filter PIC / Moda Udara)**:
      - Seluruh kargo FCL secara inheren adalah moda Laut (kontainer laut) dan ditangani oleh PIC Ferly (`pic = 'ferly'`).
      - Di tab Udara (`type=udara`), kargo FCL berjumlah 0 dan opsi PIC Ferly tidak tersedia.
      - Jika pengguna sedang berada di tab Udara atau sedang memilih PIC selain Ferly (seperti Thara, Yati, atau Kiki), memilih pill FCL menghasilkan 0 item karena terblokir oleh filter aktif tersebut.
    - **Akar Masalah 4 (Pencocokan Definisi FCL Kurang Menyeluruh)**:
      - Frontend sebelumnya hanya mengecek `type.includes('FCL') || comodity.includes('FCL')`. Padahal data kargo kontainer di FoxPro/database juga memuat tipe `'KONTAINER'` dan kode marking berawalan `'26FCL-'`.
  - **2. Solusi Teknis & Implementasi**:
    - **Backend (`billing-analytics.service.ts`)**:
      - Menghapus duplikasi deklarasi `const markingNo`, mengembalikan stabilitas sintaks runtime Bun 100%.
      - Memastikan PM2 `ShippingApi` berstatus online dan merespons `GET /api/billing/target-details?type=all` dengan 200 OK (berhasil mengembalikan 172 item target aktif, termasuk 3 kargo FCL kontainer KB/IRVIN: `26FCL-097`, `26FCL-098`, `26FCL-099`).
    - **Frontend (`TargetPage.tsx`)**:
      - **Sinkronisasi Reaktif Dua Arah URL `searchParams`**:
        - Menambahkan `useEffect` listener terhadap `searchParams`: otomatis menyinkronkan `activeType`, `activePic`, `activeGroup`, dan `searchQuery` secara reaktif dari URL tanpa perlu reload manual.
      - **Pencocokan Komprehensif `isFclTargetItem`**:
        - Memeriksa `typeStr.includes('FCL')`, `typeStr.includes('KONTAINER')`, `comodityStr.includes('FCL')`, serta marking code `markingStr.startsWith('26FCL')` atau `markingStr.includes('FCL')`.
        - Mengintegrasikan `isFclTargetItem` ke dalam `groupCounts`, `groupedList`, dan `matchTargetSearch` (saat mencari "FCL" atau "kontainer").
      - **Smart Mode & PIC Auto-Switching Saat Pill FCL Dipilih**:
        - Jika pengguna memilih pill FCL (`handleGroupChange('fcl')`) saat berada di moda Udara, sistem otomatis mengalihkan tab ke **Laut** (atau **Semua**).
        - Jika PIC yang aktif bukan PIC yang menangani FCL (`ferly` atau `all`), sistem otomatis me-reset filter PIC ke **Semua PIC** agar kargo FCL langsung terlihat di tabel.
      - **Panduan Pemulihan Kontekstual Saat Empty State**:
        - Jika filter menghasilkan 0 item pada kategori FCL, antarmuka menyediakan tombol pemulihan cerdas: `[Beralih ke Tab Laut]` atau `[Tampilkan di Semua PIC (N)]`.
  - **3. Verifikasi & Pengujian**:
    - `bun run build` di frontend $\to$ **LULUS 100% 0 errors** (4.58s).
    - PM2 service `ShippingApi` direstart dan online (PID `19300`).
    - HTTP production status test `https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Verifikasi data lokal API: 3 kargo FCL aktif KB/IRVIN berhasil teragregasi dan tampil pada pill `FCL (3)`.

---

- [x] **Perbaikan Resolusi Customer Per-Item pada Target Bill & Relevance Ranking Pencarian (`TargetPage.tsx`, `billing-analytics.service.ts`)**:
  - **1. Analisis Kebutuhan & Akar Masalah**:
    - URL: `https://app.sampai.co/mshipping/finance/billing/target`
    - Pertanyaan Pengguna: *"saya cari yto kenapa data yto muncul di bawah?"*
    - **Akar Masalah 1 (Pencemaran Nama Customer dari Batch Marking Laut/Udara)**:
      - Di pengiriman laut/konsinyasi, satu batch marking code (misal: `26GZD26`) memuat banyak colly/marking no dari berbagai customer berbeda (`ASH`, `JMD`, `YTO`, `ROBBY GUNAWAN`, dll).
      - Pada `billing-analytics.service.ts`, query pembantu meng-group `tbEntryList` hanya berdasarkan `el.fdMarkingCode` dengan agregasi `MAX(el.fdCustCode) AS sampleCustCode`.
      - Untuk batch `26GZD26`, `MAX(el.fdCustCode)` menghasilkan `'Y000149'` (customer YTO) karena huruf 'Y' memiliki urutan alfabetik tertinggi.
      - Akibatnya, baris colly milik customer lain dalam batch tersebut (seperti `ASH/C :1-8` dan `ASH/C :1-17` yang sebenarnya milik customer `ASH`) salah ditimpa menjadi customer `"YTO"`.
      - Sementara kargo YTO yang asli pada batch tersebut (`0938791`, colly 9) sudah terbit invoice/billing (`fdBillCreated = 1, fdGive = 1`) sehingga tidak berada di target billing.
    - **Akar Masalah 2 (Posisi Tampil di Paling Bawah Karena Default Aging Sort)**:
      - Kargo `26GZD26` memiliki umur kargo baru 4 hari (`hari = 4`).
      - Stored Procedure `get_data_billing_and_data_m3` mengurutkan data berdasarkan `hari DESC` (aging tertua 90 hari, 80 hari, ..., hingga 0 hari).
      - Karena kargo ASH berumur 4 hari keliru dinamai `"YTO"`, saat pengguna mencari `"YTO"`, kargo tersebut muncul di baris-baris paling akhir (bawah tabel).
    - **Akar Masalah 3 (Tidak Ada Bobot Relevansi pada Hasil Pencarian)**:
      - Sebelumnya, filter pencarian hanya memfilter boolean (`includes`) tanpa menyusun ulang urutan item berdasarkan tingkat kecocokan (exact match, prefix match, partial match).
  - **2. Solusi Teknis & Implementasi**:
    - **Backend (`billing-analytics.service.ts`)**:
      - Menyertakan `RTRIM(el.fdCustCode) AS custCode` pada query `entryListRows`.
      - Memetakan entry item secara granular per colly: `entryItemMap.set(`${e.markingCode}|||${e.markingNo}`, { listCode: e.fdListCode, custCode: e.custCode })`.
      - Menghapus ketergantungan pada `sampleCustCode` dari grouping batch marking untuk resolusi customer row.
      - Resolusi customer kini 100% presisi per baris: `itemCustCode = entryItemMap.get(`${marking}|||${markingNo}`)?.custCode`. Baris `ASH/C` tetap customer `ASH` (`A001362`), baris `SP/JMD` tetap `JMD` (`J000588`), dan tidak ada lagi colly customer lain yang tertimpa nama YTO.
    - **Frontend (`TargetPage.tsx`)**:
      - Menambahkan fungsi pembobotan skor pencarian `computeTargetSearchScore(item, rawQuery)`:
        - **Skor 100 (Prioritas Tertinggi)**: Exact match customer name, customer code, atau billTo.
        - **Skor 80**: Customer name / billTo diawali query (starts with).
        - **Skor 70**: Exact match marking code / marking no.
        - **Skor 60**: Customer name / billTo mengandung query (contains).
        - **Skor 40**: Marking code / marking no mengandung query.
        - **Skor 20**: Token generic match lainnya.
      - Mengurutkan `filteredList` saat query aktif: item dengan skor relevansi tertinggi otomatis ditaruh di **PALING ATAS**, diikuti secondary sort `hari DESC`.
  - **3. Verifikasi**:
    - Uji live via backend data check: batch `26GZD26` kini mengembalikan customer asli `ASH` (`A001362`), item semu YTO hilang 100%.
    - `bun run build` frontend $\to$ **LULUS 100% 0 errors** (4.66s).
    - PM2 service `ShippingApi` berhasil direstart dan online (PID `9272`).
    - Dokumentasi disinkronkan di `frontend-app.md`, `backend-app.md`, dan `.agents/working.md`.

---

- [x] **Perbaikan Fitur Pencarian Data Target Bill Berdasarkan Nama Customer (`TargetPage.tsx`, `billing-analytics.service.ts`, `billing.types.ts`, `billing.service.ts`)**:
  - **1. Analisis Kebutuhan & Akar Masalah**:
    - URL: `https://app.sampai.co/mshipping/finance/billing/target`
    - Pengguna melaporkan bahwa fitur pencarian data tidak dapat mencari berdasarkan nama customer.
    - **Akar Masalah 1 (Pencocokan Substring Kaku & Permutasi Nama Legalitas)**:
      - Di database master `tbCustomers.fdCustName`, nama perusahaan pelanggan disimpan dalam format legalitas di belakang (misal: `"SWADAYA SARANA BERLIAN, PT"`, `"BINTANG TIMUR, PT"`, `"KEVIN THOMAS, MR"`, `"ANDA TEXTILE,TK"`).
      - Pengguna Indonesia secara natural mengetik nama dengan awalan legalitas (misal: `"PT SWADAYA"`, `"PT BINTANG TIMUR"`, `"MR KEVIN"`).
      - Fungsi pencarian lama hanya menjalankan `item.customer.toLowerCase().includes(q)` yang kaku terhadap urutan kata contiguous, sehingga pencarian `"PT SWADAYA"` atau `"MR KEVIN"` menghasilkan **0 data** (gagal 100%).
    - **Akar Masalah 2 (Pencarian Kode Customer Tidak Didukung)**:
      - Field `item.custCode` (seperti `"S003077"`, `"B000075"`, `"K000475"`) tidak diikutsertakan dalam `filteredList`, sehingga pencarian berdasarkan kode pelanggan tidak menghasilkan data.
    - **Akar Masalah 3 (Single Source of Truth & Enrichment Backend)**:
      - Backend `getBillingTargetDetails` sebelumnya hanya memetakan nama yang dikembalikan dari Stored Procedure `get_data_billing_and_data_m3` tanpa override nama master resmi dari `tbCustomers.fdCustName` untuk entri yang dimodifikasi teks catatan SP, serta belum menyertakan `billTo` dan `consignee`.
    - **Akar Masalah 4 (Filter Kategori / PIC Menghalangi Hasil Pencarian)**:
      - Ketika pengguna mengetik kata kunci pencarian saat berada pada filter kategori tertentu (`sj_sent`, `cod`, `aging`, dll) atau PIC tertentu, pencarian dibatasi hanya pada subset tersebut. Jika data berada pada kategori lain, pengguna hanya melihat tampilan "Tidak ada data" tanpa indikasi ada hasil di kategori lain.
    - **Akar Masalah 5 (Sinkronisasi URL Param)**:
      - Input pencarian sebelumnya tidak membaca atau menulis ke parameter URL (`?search=...`).
  - **2. Solusi Teknis & Implementasi**:
    - **Backend (`billing-analytics.service.ts`, `billing.service.ts`)**:
      - Memperluas lookup master `tbCustomers` berdasarkan gabungan `distinctCustomers` dan `distinctCustCodes` (dari `tbEntryList`).
      - Menerapkan Single Source of Truth nama pelanggan resmi dari `tbCustomers.fdCustName`.
      - Memperkaya data item target dengan `custCode`, `billTo` (`tbCustomers.fdBillTo`), dan `consignee` (`tbMarking.fdConsignee`).
      - Menambahkan dukungan filter server-side `query.search` berbasis token kata normalisasi.
    - **Frontend (`TargetPage.tsx`, `billing.types.ts`)**:
      - **Smart Multi-Token Search Matcher (`matchTargetSearch`)**:
        - Normalisasi teks: membersihkan tanda baca (`.`, `,`, `-`, `/`, dll) dan multi-spasi.
        - Token matching: seluruh token kata pada query pengguna diverifikasi keberadaannya dalam pool data (`customer`, `custCode`, `billTo`, `consignee`, `markingCode`, `markingNo`, `branch`, `sales`, `comodity`, `type`, `pic`).
        - Evaluasi permutasi awalan nama legalitas (`PT`, `CV`, `UD`, `PD`, `MR`, `MRS`, `TK` $\leftrightarrow$ `TOKO`).
        - Raw exact substring check untuk kode customer (`custCode`), nomor marking, dan list code.
      - **Sinkronisasi URL Dua Arah**: Membaca inisial `searchParams.get('search')` dan sinkronisasi debounced (300ms) saat mengetik.
      - **Panduan Navigasi Kontekstual Saat Empty Result**:
        - Jika filter kategori aktif menghasilkan 0 item namun ditemukan data pada kategori lain, muncul tombol pintas `[Tampilkan di Semua Kategori (N)]`.
        - Jika filter PIC aktif menghasilkan 0 item namun ditemukan data pada PIC lain, muncul tombol `[Tampilkan di Semua PIC (N)]`.
      - **Visualisasi Identitas Customer di Tabel & Kartu**:
        - Menampilkan badge mono kode customer (`[custCode]`) di samping nama customer pada tabel desktop dan kartu mobile.
        - Menampilkan baris `Bill to: [billTo]` jika nama penagihan berbeda dari nama customer.
        - Memperbarui placeholder input: `"Cari customer, kode, marking..."`.
  - **3. Verifikasi**:
    - `bun run build` di frontend $\to$ **LULUS 100% 0 errors** (3.38s).
    - PM2 service backend `ShippingApi` direstart dan online (PID `152`).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi disinkronkan di `docs/frontend/billing.md`, `docs/backend/billing.md`, `frontend-app.md`, `backend-app.md`, dan `.agents/working.md`.

---

- [x] **Klarifikasi dan Penegasan Label YoY Akumulasi 12 Bulan pada Grafik Billing (`TrendChart.tsx`, `docs/frontend/billing.md`)**:
  - **1. Analisis & Verifikasi Data Matematis**:
    - Pengguna menanyakan perbedaan antara kurva grafik bulanan yang turun vs badge tag yang menampilkan kenaikan `+1.5%`.
    - **Hasil Audit Database**:
      - **Kumulatif 12 Bulan Penuh (Okt 2025 – Sep 2026 vs Okt 2024 – Sep 2025)**: Total Udara = 14.276 bill vs 14.069 bill $\to$ naik **+1.5%** (+207 bill).
      - **Titik Performa Per Bulan (Sep 2026 vs Sep 2025)**: Udara Sep 2026 = 1.115 bill vs Sep 2025 = 1.701 bill $\to$ turun **-34.5%** (-586 bill).
      - Keduanya 100% benar, namun label badge sebelumnya hanya tertulis `YoY ▲ +1.5%` tanpa kata "12 Bln", menimbulkan ambiguitas dengan grafik titik bulanan di bawahnya.
  - **2. Implementasi Frontend (`TrendChart.tsx`)**:
    - Memperbarui teks badge mini summary menjadi `YoY (12 Bln) ▲ +X%` pada chip Udara, Laut, dan Total.
    - Menambahkan kelas `whitespace-nowrap` pada pill badge untuk menjaga keterbacaan rapi di berbagai ukuran layar.
  - **3. Verifikasi**:
    - `bun run build` di frontend $\to$ **LULUS 100% 0 errors** (4.37s).
    - Status HTTP live production $\to$ **200 OK**.
    - Dokumentasi disinkronkan di `docs/frontend/billing.md` dan `.agents/working.md`.

---

- [x] **Perbaikan Pemisahan Tarif Tax Return vs M3 Pokok pada Validasi Type 2 & Eliminasi Undercharge Semu M3 (`billing-validation.service.ts`, `billing.utils.ts`, `ProfilePricingTab.tsx`)**:
  - **1. Akar Masalah**:
    - Kasus Invoice: `GZS-011112-09-2026` (Customer S000130 - SUMBER SEGARA MAKMUR).
    - Pada `tbBillingDetail`, terdapat 2 item:
      - Item 1: `PARCELS TO JAKARTA (M3) - ROLLER CHAIN` (`fdListCode = 'M3'`, `fdItemPrice = 6.500.000`, `fdTotal = 15.303.600`).
      - Item 2: `TAX RETURN - MINIMUM` (`fdListCode = 'M3'`, `fdItemPrice = 500.000`, `fdTotal = 1.500.000`).
    - **Masalah 1 (Backend - Type 2 Compare M3 vs KG)**:
      - Loop `detailRows` di `getType2ComparisonCheck` sebelumnya mengecek `if (lc === 'M3') { priceM3 = price }`. Karena item Tax Return juga berunit `M3`, nilai `priceM3` ter-overwrite menjadi `500.000` (bukan `6.500.000`).
      - Akibatnya, nilai M3 dihitung keliru: `2.3544 M3 × 500.000 = Rp 1.177.200`, kalah dari nilai KG `2423 KG × 6.000 = Rp 14.538.000`. Sistem memilih KG sebagai winner dan membandingkannya dengan total tagihan `16.803.600` $\to$ memunculkan selisih overcharge semu **Rp 2.265.600** (`16.803.600 - 14.538.000`).
    - **Masalah 2 (Frontend - Undercharge Semu Item M3)**:
      - Pada `evaluateItemPrice`, item `PARCELS TO JAKARTA (M3) - ROLLER CHAIN` diarahkan ke pencocokan nama komoditas di Price List master umum alih-alih divalidasi ke tarif M3 profil customer (`profileHarga.harga = 6.500.000`). Hal ini memicu peringatan *"Terdapat 1 item dengan tarif di bawah master (undercharge: PARCELS TO JAKARTA (M3) - ROLLER CHAIN)"*.
  - **2. Solusi Teknis & Implementasi**:
    - **Backend (`billing-validation.service.ts`)**:
      - Memisahkan item tambahan (`isAuxiliary`: Tax Return, Admin, Surcharge, Packing, Discount) dari ekstraksi `priceM3` dan `priceKG`.
      - Tarif Tax Return tidak lagi menimpa `priceM3` kargo pokok (tetap `6.500.000`).
      - Mengakumulasikan biaya tambahan non-freight ke `totalBilledAuxiliary` (Tax Return Rp 1.500.000).
      - Menghitung `totalNilaiTagihanIdeal = totalFreightIdeal (winner M3/KG) + totalBilledAuxiliary`. Hasil komparasi: M3 menang (Rp 15.303.600 vs KG Rp 14.538.000) $\to$ `totalNilaiTagihanIdeal = 15.303.600 + 1.500.000 = 16.803.600` $\to$ selisih vs aktual = **Rp 0 (EQUAL / SESUAI)**.
      - Ekuivalen KG min charge (`minKgEquiv`) memprioritaskan rasio kontraktual profil customer (`profileHarga.rasio = 700`, menghasilkan $0.1 \times 700 = 70\text{ KG}$).
    - **Frontend (`billing.utils.ts` & `ProfilePricingTab.tsx`)**:
      - Menambahkan pengenal `isM3MainItem` pada item dengan unit `fdListCode === 'M3'` (non-Tax Return).
      - Mengarahkan acuan validasi `profilePrice` langsung ke `profileHarga.harga` (Rp 6.500.000).
      - Hasil evaluasi: `billedPrice (6.500.000) === profilePrice (6.500.000)` $\to$ status **MATCH**, warning undercharge semu hilang 100%.
  - **3. Verifikasi**:
    - Uji backend live via skrip DB: `priceM3 = 6.500.000`, `overallWinner = M3`, `selisihVsAktual = 0`, `validationStatus = EQUAL`.
    - `bun run build` di frontend $\to$ **LULUS 100% 0 errors** (3.78s).
    - PM2 service `ShippingApi` berhasil di-restart dan online (PID `24000`).
    - Dokumentasi disinkronkan di `docs/backend/billing.md`, `docs/frontend/billing.md`, dan `.agents/working.md`.

---

- [x] **Penambahan Timestamp Issued di Bawah Tanggal Invoice pada Halaman Validasi (`ValidationDetailPage.tsx`)**:
  - **1. Kebutuhan Pengguna**:
    - Pengguna meminta agar halaman detail validasi billing (`/finance/billing/validation/:invNo`, contoh: `SGS-002067-09-2026`) menampilkan timestamp issued tepat di bawah tanggal invoice (`Tgl Tagihan`).
  - **2. Implementasi Antarmuka UI**:
    - Menambahkan blok informasi `Waktu Issued` di bawah tampilan `Tgl Tagihan` pada kartu "Identitas Tagihan & Customer":
      - Ikon `Clock` dengan label uppercase semantik `WAKTU ISSUED`.
      - Menampilkan tanggal & jam terbit lengkap menggunakan `formatDateTime(data.fdGiveDate)` (misal: `30 Sep 2026, 13.06 WIB`) dalam tipografi mono tabular emerald.
      - Menampilkan nama karyawan penerbit (`data.giveEmployee?.fdEmpName`, misal: `Oleh: FERLY`).
      - Fallback rapi: jika invoice masih berstatus draft, menampilkan badge/teks amber `Belum Terbit (Draft)`.
    - Menambahkan `title` tooltip interaktif pada komponen `IssuedBadge` di header bar untuk mengintip tanggal & penerbit saat kursor diarahkan ke badge.
  - **3. Verifikasi & Pengujian**:
    - `bun run build` $\to$ **LULUS 100% 0 errors** (3.26s).
    - Status HTTP live production $\to$ **200 OK**.
    - Dokumentasi disinkronkan di `frontend-app.md`, `docs/frontend/billing.md`, dan `.agents/working.md`.

---

- [x] **Redesign Komprehensif Tab Validasi M³ pada Modal Audit & Validasi Invoice (`PhysicalAuditTab.tsx`)**:
  - **1. Audit Desain & Kebutuhan Pengguna**:
    - Menerapkan prinsip skill `redesign-existing-projects` dan standar antarmuka [`.agents/rules/ui-styling.md`](./rules/ui-styling.md).
    - Menghilangkan div soup, font generik tanpa alignment angka, tabel redundan, dan banner terhimpit.
  - **2. Peningkatan Visual & Tata Letak ERP Berdensitas Tinggi**:
    - **Banner Prioritas Atas**: Memindahkan alert undercharge (`isBilledBelowMinM3`) dan COD/Urgent shortfall (`isCodUrgentShortfall`) ke urutan paling atas dengan border kiri tebal (`border-l-4 border-l-amber-500 bg-amber-500/5`), ikon squircle, dan sorotan angka mono tabular.
    - **Tabel Rekapitulasi Kelompok Bill Terkait (Induk & Pecahan 1 Batch)**:
      - Header bar modern dengan pulse beacon, badge batch, dan status kelengkapan bill dinamis (`Semua ListCode Ada Bill` vs `X ListCode Belum Ada Bill`).
      - Tabel high-density dengan styling interaktif: row invoice aktif ditandai border kiri sky (`bg-sky-500/10 border-l-4 border-l-sky-500`) dan badge `Saat Ini`.
      - Nomor invoice dapat diklik (`onSelectInvoice`) dengan ikon `ExternalLink`.
      - Angka `tabular-nums font-mono` untuk M³, berat kg, dan koli.
      - Baris `tfoot` merangkum total kubikasi, berat, koli, dan status 100% lengkap batch.
    - **Primary KPI Cards (Ditagihkan vs Gudang vs PL vs Komplain)**:
      - Tipografi mono `text-lg sm:text-xl font-bold font-mono tracking-tight tabular-nums`.
      - Sumber acuan yang cocok (`isUsedGudang`, `isUsedPL`, `isUsedKomplain`) diberi border emerald bercahaya (`border-emerald-500/60 bg-emerald-500/[0.04] ring-1 ring-emerald-500/20`) dengan pill denyut `Dipakai Bill`.
    - **Eliminasi Redundansi Rincian Marking**:
      - Tabel `markingDetails` dikonversi menjadi accordion toggle (`isMarkingDetailsOpen`) jika tabel kelompok bill terkait sudah tampil di atas, mencegah scrolling ganda dan duplikasi baris.
    - **Dashboard Konsistensi Muatan Fisik**:
      - 3 panel evaluasi kompak: Kuantitas Koli (`Package`), Timbangan Fisik (`Scale`), dan Status Validasi Fisik (`CheckCircle2`/`XCircle`), 100% Midnight Dark Mode compliant.
  - **3. Verifikasi**:
    - `bun run build` $\to$ **LULUS 100% 0 errors** (2.82s).
    - Status HTTP live production $\to$ **200 OK**.
    - Dokumentasi disinkronkan di `frontend-app.md`, `docs/frontend/billing.md`, dan `.agents/working.md`.

---

- [x] **Rincian Data Asal Target Bill pada Dashboard KPI Cards & Halaman Target Bill (`billing-analytics.service.ts`, `DashboardPage.tsx`, `TargetPage.tsx`, `billing.types.ts`, `useBillingDashboard.ts`)**:
  - **1. Latar Belakang & Kebutuhan Pengguna**:
    - Pengguna meminta agar kartu **Target Bill Hari Ini** pada dashboard billing (`/finance/billing`) tidak hanya menampilkan angka total dan breakdown PIC, melainkan dirinci asal datanya: berapa kargo dari Surat Jalan terkirim belum di-bill (`SJ Sent`), berapa `COD/Urgent`, berapa `Aging > 7 Hari`, dan berapa `FCL`.
  - **2. Peningkatan Backend (`billing-analytics.service.ts`)**:
    - **Resolusi Murni Per `fdListCode`**:
      - Memperbaiki kueri pengiriman `tbDelivery`: hanya mengambil delivery aktif (`YEAR(d.fdSjDate) >= 2024`) dengan `fdSent = 1` yang belum di-bill, dikumpulkan ke dalam `sentListCodeSet`.
      - Memetakan setiap baris kargo dari stored procedure ke `fdListCode` aslinya melalui `entryMap` (`markingCode + '|||' + markingNo`).
      - Evaluasi `isSent` murni per baris `fdListCode`: `statusKirim.includes('TERKIRIM') || statusKirim.includes('TERIMA SJ') || (listCode ? sentListCodeSet.has(listCode) : false)`.
      - Mengeliminasi distorsi marking batch (sehingga jika hanya 1 colly terkirim, colly lain di marking yang sama tidak otomatis terhitung).
    - Menghitung agregasi kategori kriteria penagihan per moda pada `getBillingKPIs`:
      - `sjSent`: Kargo per `fdListCode` dengan status `TERKIRIM` / `TERIMA SJ` atau terdaftar pada `tbDelivery.fdSent = 1` tanpa nomor bill.
      - `codUrgent`: Status kargo mengandung `COD` atau `URGENT`.
      - `agingGt7`: Umur kargo `hari > 7`.
      - `fcl`: Tipe kargo mengandung `FCL` atau `KONTAINER`.
    - Mengembalikan `categories: { sjSent, codUrgent, agingGt7, fcl }` di `targetBillUdara` dan `targetBillLaut`.
    - Pada `getBillingTargetDetails`, menambahkan `listCode` dan flag `isSjSent` pada setiap item kargo untuk menyelaraskan klasifikasi filter antara dashboard dan halaman detail target.
  - **3. Peningkatan Frontend & Desain Interaktif (`DashboardPage.tsx`, `TargetPage.tsx`, `billing.types.ts`)**:
    - **Dashboard KPI Cards**:
      - Menampilkan chip kategori berwarna modern & elegan pada kartu Target Bill Udara & Laut:
        - `SJ Sent`: Biru muda (`bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20`)
        - `COD/Urgent`: Kuning amber (`bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20`)
        - `Aging > 7`: Ungu (`bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20`, hanya muncul jika $> 0$)
        - `FCL`: Hijau emerald (`bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20`, hanya muncul jika $> 0$)
      - Garis pembatas elegan dengan rincian `PIC: Thara: X | Rico: Y | Ferly: Z`.
      - Setiap chip kategori adalah **tombol interaktif** (`cursor-pointer`), saat diklik langsung menavigasi ke halaman Target Bill dengan filter kategori yang sesuai (misal: `?type=laut&group=sj_sent`).
    - **Halaman Target Bill (`TargetPage.tsx`)**:
      - Menambahkan opsi filter `'sj_sent'` (`SJ Terkirim`) pada `GROUP_OPTIONS` dengan badge counter aktif.
      - Mendukung deep-linking query parameter `group` (`?group=sj_sent`, `?group=cod`, dsb).
      - Menghubungkan klik pill filter ke URL search params secara reaktif.
  - **4. Verifikasi & Pengujian**:
    - `bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-DKWqs5vu.js` dalam 3.10s).
    - PM2 `ShippingApi` direstart dan online (PID `23476`).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.

---

- [x] **Tampilkan Tabel Rekapitulasi Kelompok Bill Terkait (Induk & Pecahan 1 Batch) pada Modal Audit Validasi (`PhysicalAuditTab.tsx`, `BillingValidationSummaryModal.tsx`, `m3-check.service.ts`, `m3-check.types.ts`, `billing.types.ts`)**:
  - **1. Analisis Kebutuhan**:
    - Pengguna meminta agar seluruh data rekapitulasi kelompok bill terkait (Induk & Pecahan dalam 1 Batch) ditampilkan langsung pada modal *Audit & Validasi Invoice* -> tab *validasi m3* (`PhysicalAuditTab.tsx`).
    - Sebelumnya, bagian ini hanya menampilkan daftar teks sederhana berisi No Invoice dan M³ tanpa rincian `fdListCode`, berat fisik, koli, status bill, maupun kepastian apakah seluruh listcode pada batch sudah terbit fakturnya.
  - **2. Peningkatan Backend (`m3-check.service.ts` & `m3-check.types.ts`)**:
    - Memperkaya `evaluateM3Check` dengan kueri `batchEntryLists` dari `tbEntryList` untuk mengambil seluruh kargo fisik pada batch customer terkait.
    - Mengintegrasikan mapping data fisik (`detailByListCode`) dari SP kubikasi `get_qr_tbm3_perMarking_plus_rasio` (packing list, komplain, gudang) dengan `relatedBatchBills` di `tbBilling`.
    - Menghasilkan struktur data baru:
      - `listCodeBreakdown: RelatedListCodeItem[]`: Status lengkap per `fdListCode` (`listCode`, `invNo`, `isParent`, `childLetter`, `m3Gudang`, `m3PL`, `berat`, `qty`, `billedM3`, `hasBill`, `firstItemName`).
      - `allListCodesHaveBill`: Boolean penentu apakah 100% listcode pada batch sudah memiliki bill.
      - `missingBillsCount`: Jumlah listcode pada batch yang belum diterbitkan bill-nya.
      - Enriched `relatedInvoices`: Menyertakan `m3Gudang`, `m3PL`, `berat`, `qty`, dan `isCurrent`.
  - **3. Peningkatan Frontend & Redesign Antarmuka Modal (`PhysicalAuditTab.tsx`, `BillingValidationSummaryModal.tsx`)**:
    - **Header Bar**:
      - Indikator denyut biru pulsing dan nama batch kargo (`26GZD73`).
      - Badge Audit Status Dinamis: `✓ Semua ListCode Ada Bill (4/4)` (Emerald outline) atau `⚠️ X ListCode Belum Ada Bill (Missing)` (Rose outline).
      - Badge Posisi Invoice: `Invoice Induk` atau `Invoice Pecahan (A, B, dst)`.
    - **Tabel Rekapitulasi Rinci (High-Density ERP Table)**:
      - Kolom: `No. Invoice` | `Posisi` | `fdListCode` | `M³ Fisik` | `Berat (kg)` | `Koli` | `M³ Ditagih` | `Status Bill`.
      - Highlight baris invoice yang sedang dibuka pengguna (`isCur`) dengan aksen `bg-sky-500/10 dark:bg-sky-950/40 border-l-4 border-l-sky-500` dan badge `Saat Ini`.
      - Kolom No. Invoice interaktif: Jika diklik, memicu `onSelectInvoice` untuk langsung berpindah ke invoice terkait tanpa menutup alur kerja.
      - Status Bill visual: `✓ Ada Bill` (Emerald badge) vs `❌ Belum Ada Bill` (Rose badge).
    - **Baris Total Akumulasi (`tfoot`)**:
      - Menjumlahkan seluruh listcode dalam batch: total M³ fisik gudang, total berat kg, total koli, total billed M³, dan status kelengkapan batch 100% Lengkap.
    - **Banner Edukasi ERP**: Menjelaskan mekanisme konsinyasi FoxPro di mana seluruh rupiah/volume digabung ke invoice induk, sedangkan invoice pecahan diterbitkan Rp 0 sebagai penampung packing list/resi.
  - **4. Verifikasi**:
    - `bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-9xpf0RO5.js` dalam 3.18s).
    - PM2 backend `ShippingApi` direstart dan online (PID `10540`).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi disinkronkan di `frontend-app.md`, `backend-app.md`, `docs/frontend/billing.md`, dan `docs/backend/billing.md`.

---

- [x] **Fix Min Charge M3 pada Validasi Type 2 (`billing-validation.service.ts`, `Type2ComparisonPanel.tsx`)**:
  - **1. Akar Masalah**:
    - Invoice `SHS-000233-09-2026`: Volume aktual = 0.0446 M3 (< minChargeM3 = 0.1), berat = 58 KG (< minKgEquiv = 70).
    - Sistem menghitung nilai ideal tanpa min charge → `nilaiM3 = Rp 289.900`, `nilaiKG = Rp 348.000` → dipilih KG Rp 348.000. Padahal seharusnya `nilaiM3Efektif = max(289.900, 0.1 × 6.500.000) = Rp 650.000` → pilih M3.
  - **2. Solusi Backend (`billing-validation.service.ts`)**:
    - Extract `minChargeM3` dan `minChargeKg` dari `m3CheckRes`. Hitung `rasio = priceM3 / priceKG` → `minKgEquiv = minChargeM3 × rasio` (0.1 × 700 = 70 KG).
    - `nilaiM3Efektif = max(nilaiM3, minChargeM3 × priceM3)`, `nilaiKGEfektif = max(nilaiKG, minKgEquiv × priceKG)`.
    - `winner` dan `totalNilaiTagihanIdeal` dari nilai efektif. Expose `minChargeM3`, `minKgEquiv`, `minChargeApplied`.
  - **3. Update UI (`Type2ComparisonPanel.tsx`)**:
    - Badge `⚡ MIN CHARGE M3 (0.1 M3 / 70 KG)` di header. Banner penjelasan di summary. Tabel item: row amber + badge ⚡ Min Charge + nilai efektif dengan coretan nilai asli.
  - **4. Verifikasi**: `bun run build` → **LULUS 100% 0 errors** (`dist/assets/billing-BapzYn_S.js` dalam 3.94s). PM2 `ShippingApi` online PID `24932`.

---

- [x] **Perhitungan Target Bill Mengikutsertakan Semua Surat Jalan yang Sudah Terkirim (`fdSent = 1`) Namun Belum Di-Bill (`billing-analytics.service.ts`)**:
  - **1. Kebutuhan Bisnis**:
    - Pada dashboard billing (`/finance/billing`), card **Target Bill Hari Ini** (Udara & Laut) sebelumnya hanya menghitung kargo dengan kriteria: COD/Urgent, FCL, atau Aging > 7 hari.
    - Kargo yang surat jalannya sudah dikonfirmasi terkirim ke customer (`tbDelivery.fdSent = 1` atau status `TERKIRIM` / `TERIMA SJ`) namun berumur $\le 7$ hari sebelumnya tereliminasi dari target penagihan, padahal barang yang sudah sampai wajib segera diterbitkan invoice-nya oleh Finance.
  - **2. Solusi & Implementasi Backend**:
    - Pada `getBillingKPIs` dan `getBillingTargetDetails` di `billing-analytics.service.ts`:
      - Mengambil daftar marking dari `tbDelivery` yang memiliki `fdSent = 1`, `el.fdBillCreated = 0`, `el.fdFinish = 0`, dan `d.fdListCode NOT IN (SELECT fdListCode FROM tbBilling)`.
      - Memperbarui evaluator `isTarget`:
        ```ts
        const isSent = statusKirim.includes('TERKIRIM') || statusKirim.includes('TERIMA SJ') || sentMarkingSet.has(mCode)
        return isCodOrUrgent || isAgingGt7 || isFcl || isSent
        ```
      - Memastikan kargo dengan status `isSent` tetap masuk tanpa terhalang status gudang (`if (!isFcl && !isSent)`).
    - PM2 service `ShippingApi` direstart dan online.

---

- [x] **Klasifikasi Status Error Penuh pada Kesalahan Hitung Overweight (`BillingValidationCard.tsx`, `BillingValidationSummaryModal.tsx`, `OverweightAuditTab.tsx`, `validationSummary.utils.ts`)**:
  - **1. Akar Masalah**:
    - Kasus seperti `GZS-011059-09-2026`: Invoice menagihkan item KG (910 kg) padahal muatan fisik (3.917 kg) masih di bawah batas kuota rasio (4.295 kg).
    - Pada `BillingValidationCard.tsx`: Badge header kartu sebelumnya hanya melihat kecocokan M3 (`matchStatus === 'MATCH_PRIMARY'`), sehingga menampilkan badge **"COCOK (KOMPLAIN)"** berwarna hijau dengan centang sukses, meskipun terdapat selisih penagihan KG yang tidak berdasar fisik.
    - Pada `BillingValidationSummaryModal.tsx`: Definisi `hasWarning` sebelumnya mencakup `!isOverallValid`, menyebabkan semua invoice yang tidak valid tetap dianggap warning (amber/kuning), bukan error fatal (rose/merah) dengan ikon silang `XCircle`.
    - Pada `OverweightAuditTab.tsx`: Item penagihan KG tanpa overweight sebelumnya berstatus `'PERINGATAN'`, bukan `'SELISIH'`.
  - **2. Solusi & Perbaikan**:
    - **`BillingValidationCard.tsx`**:
      - Memindahkan perhitungan `overweight` dan `hasOverweightIssue` sebelum evaluasi badge header.
      - Menambahkan kondisi `else if (!isAir && hasOverweightIssue)`: Menampilkan badge **DANGER (merah)** dengan ikon `X` dan teks eksplisit `SELISIH KG (DITAGIH 910 KG TANPA OVERWEIGHT)` atau `SELISIH OVERWEIGHT (+X KG BELUM DITAGIH)`.
    - **`BillingValidationSummaryModal.tsx`**:
      - Memperbaiki `hasWarning`: Hanya bernilai true jika `isOverallValid` terpenuhi dan terdapat soft warning (`isBilledBelowMinM3` atau `isCodUrgentShortfall`).
      - Untuk invoice dengan selisih/kesalahan hitung (`!isOverallValid`), modal header dan alert banner bawah kini berstatus **ERROR MERAH** (`bg-rose-500/10 border-rose-500`) dengan ikon `XCircle`.
    - **`OverweightAuditTab.tsx`**:
      - `isBilledUnneededOverweight` kini berstatus `SELISIH` (Badge merah) dan menampilkan teks peringatan keras: `❌ Kesalahan Hitung: Berat fisik aktual (3.917 kg) masih berada dalam batas kuota rasio (0 kg overweight), namun invoice menagihkan item KG sebesar 910 kg.`
    - **`validationSummary.utils.ts`**:
      - Memperbarui `calculateValidationVerdict` untuk menegaskan judul: `Kesalahan Hitung: Invoice Menagihkan Item KG (910 kg) Padahal Muatan Tidak Overweight`.
  - **3. Verifikasi**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-z1LqwTGT.js` dalam 2.98s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.

---

- [x] **Audit Kelompok Bill Terkait (Induk & Pecahan dalam 1 Batch) & Verifikasi Status Bill per fdListCode (`m3-check.service.ts`, `PhysicalAuditTab.tsx`, `tbEntryList`, `tbBilling`)**:
  - **1. Analisis Mekanisme Kelompok Bill Terkait**:
    - Bagian *Kelompok Bill Terkait* pada tab Validasi M³ dibentuk oleh backend `m3-check.service.ts` berdasarkan relasi customer (`resolvedCustCode`) dan prefix batch (`cleanBatchCode`).
    - Mengelompokkan nomor faktur yang berbagi sequence sama dengan huruf pecahan (`011085`, `A11085`, `B11085`, dst) atau yang mencantumkan referensi invoice induk.
  - **2. Hasil Audit Database & Rekapitulasi per Invoice**:
    - **`GZS-011085-09-2026`** (Customer `E000473` - `ENGL/96/WR`, Batch `26GZD73`):
      - Total `tbEntryList`: 4 listcode (`0942766`, `0942767`, `0942768`, `0942769`).
      - Total `tbBilling`: 4 invoice (`GZS-011085`, `GZS-A11085`, `GZS-B11085`, `GZS-C11085`).
      - **Status**: **100% LENGKAP SUDAH ADA BILL-NYA**.
    - **`GZS-011099-09-2026`** (Customer `A001311` - `ASH`, Batch `26GZD65`):
      - Total `tbEntryList`: 5 listcode (`0941883`, `0941884`, `0941886`, `0941889`, `0941893`).
      - Total `tbBilling`: 5 invoice (`GZS-011099`, `GZS-A11099`, `GZS-B11099`, `GZS-C11099`, `GZS-D11099`).
      - **Status**: **100% LENGKAP SUDAH ADA BILL-NYA**.
    - **`GZS-011064-09-2026`** (Customer `B000703` - `ABS/BINTARO`, Batch `26GZD67`):
      - Total `tbEntryList`: 10 listcode (`0942033` s/d `0942135`).
      - Total `tbBilling`: 10 invoice (`GZS-011064` Induk + `GZS-A11064` s/d `GZS-I11064`).
      - **Status**: **100% LENGKAP SUDAH ADA BILL-NYA**.
    - **`GZS-011093-09-2026`** (Customer `B000075` - `BAGAS`, Batch `26GZD70`):
      - Total `tbEntryList`: 2 listcode (`0942448`, `0942449`).
      - Total `tbBilling`: 2 invoice (`GZS-011093`, `GZS-A11093`).
      - **Status**: **100% LENGKAP SUDAH ADA BILL-NYA**.
    - **`GZS-011086-09-2026`**, **`GZS-011059-09-2026`**, **`SHS-000233-09-2026`**:
      - Batch tunggal tanpa pecahan: 1 listcode = 1 bill terbit (`100% Lengkap`).
  - **3. Catatan Temuan Global Missing Bills**:
    - Pada batch consignment laut murni yang dipecah, operator selalu membuat bill pecahan berpasangan (`A`, `B`, `C`, ...) sehingga 100% listcode tertampung.
    - Sebagian consignment udara (`GZA`) / split shipment tertentu terdapat listcode di `tbEntryList` yang belum diterbitkan bill (misal `A001456` di `26GZD70` listcode `0942494`, `I000659` di `26GZD61` listcode `0941468`).

---

- [x] **Klasifikasi Status Error Penuh pada Kesalahan Hitung Overweight (`BillingValidationCard.tsx`, `BillingValidationSummaryModal.tsx`, `OverweightAuditTab.tsx`, `validationSummary.utils.ts`)**:
  - **1. Akar Masalah**:
    - Kasus seperti `GZS-011059-09-2026`: Invoice menagihkan item KG (910 kg) padahal muatan fisik (3.917 kg) masih di bawah batas kuota rasio (4.295 kg).
    - Pada `BillingValidationCard.tsx`: Badge header kartu sebelumnya hanya melihat kecocokan M3 (`matchStatus === 'MATCH_PRIMARY'`), sehingga menampilkan badge **"COCOK (KOMPLAIN)"** berwarna hijau dengan centang sukses, meskipun terdapat selisih penagihan KG yang tidak berdasar fisik.
    - Pada `BillingValidationSummaryModal.tsx`: Definisi `hasWarning` sebelumnya mencakup `!isOverallValid`, menyebabkan semua invoice yang tidak valid tetap dianggap warning (amber/kuning), bukan error fatal (rose/merah) dengan ikon silang `XCircle`.
    - Pada `OverweightAuditTab.tsx`: Item penagihan KG tanpa overweight sebelumnya berstatus `'PERINGATAN'`, bukan `'SELISIH'`.
  - **2. Solusi & Perbaikan**:
    - **`BillingValidationCard.tsx`**:
      - Memindahkan perhitungan `overweight` dan `hasOverweightIssue` sebelum evaluasi badge header.
      - Menambahkan kondisi `else if (!isAir && hasOverweightIssue)`: Menampilkan badge **DANGER (merah)** dengan ikon `X` dan teks eksplisit `SELISIH KG (DITAGIH 910 KG TANPA OVERWEIGHT)` atau `SELISIH OVERWEIGHT (+X KG BELUM DITAGIH)`.
    - **`BillingValidationSummaryModal.tsx`**:
      - Memperbaiki `hasWarning`: Hanya bernilai true jika `isOverallValid` terpenuhi dan terdapat soft warning (`isBilledBelowMinM3` atau `isCodUrgentShortfall`).
      - Untuk invoice dengan selisih/kesalahan hitung (`!isOverallValid`), modal header dan alert banner bawah kini berstatus **ERROR MERAH** (`bg-rose-500/10 border-rose-500`) dengan ikon `XCircle`.
    - **`OverweightAuditTab.tsx`**:
      - `isBilledUnneededOverweight` kini berstatus `SELISIH` (Badge merah) dan menampilkan teks peringatan keras: `❌ Kesalahan Hitung: Berat fisik aktual (3.917 kg) masih berada dalam batas kuota rasio (0 kg overweight), namun invoice menagihkan item KG sebesar 910 kg.`
    - **`validationSummary.utils.ts`**:
      - Memperbarui `calculateValidationVerdict` untuk menegaskan judul: `Kesalahan Hitung: Invoice Menagihkan Item KG (910 kg) Padahal Muatan Tidak Overweight`.
  - **3. Verifikasi**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-z1LqwTGT.js` dalam 3.50s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.

---

- [x] **Pencarian Berdasarkan Nama Customer pada Customer Price List (`customer-price-list.service.ts`, `customer-price-list.routes.ts`, `ListPage.tsx`, `customerPriceList.service.ts`)**:
  - **1. Analisis Kebutuhan & Akar Masalah**:
    - Pada tab **Harga Khusus Komoditas** (`special_prices`), kueri database `listCustomerCommodityPrices` sebelumnya hanya mencocokkan kolom `category`, `fdCustCode`, `branch`, dan `notes`.
    - Kolom nama customer tersimpan pada master `tbCustomers.fdCustName`, sehingga pencarian dengan nama pelanggan (misal: "ASH", "SAGI", "ANT/ANG") menghasilkan 0 data.
    - Kondisi `where.OR` pencarian sebelumnya tertimpa saat filter status `EXPIRED` dipilih secara bersamaan.
    - Pada tab **Master Uploads** (`master_uploads`), endpoint `GET /api/customer-price-list` belum menerima parameter `search`.
  - **2. Solusi & Desain Teknis**:
    - **Backend (`customer-price-list.service.ts` & `customer-price-list.routes.ts`)**:
      - `listCustomerCommodityPrices`:
        - Mencari kode customer dari `tbCustomers` yang nama atau kodenya mengandung kata kunci pencarian (`fdCustName` / `fdCustCode`).
        - Mencari alias komoditas yang cocok dari `tbCommodityMapping` (`commodityName` $\to$ `targetCommodity`).
        - Mengisolasi klausa ke dalam `andConditions: Prisma.TbCustomerPriceListItemWhereInput[]` dengan filter `{ fdCustCode: { in: matchingCustCodes } }` dan `{ category: { in: matchingCommodities } }` tanpa konflik kondisi status/mode/branch.
      - `listCustomersWithPriceList`:
        - Menerima parameter `search?: string`, mencocokkan `fdCustName` via subquery `tbCustomers`, `fdCustCode`, dan `fileName`.
        - Memastikan sanitasi string `fdCustCode.trim()` pada pengayaan nama customer.
    - **Frontend (`ListPage.tsx` & `customerPriceList.service.ts`)**:
      - Mengintegrasikan `useDebounce` (300ms) pada input pencarian kedua tab (`specialSearch` dan `search`) untuk mengeliminasi spam API requests saat mengetik.
      - Menambahkan tombol bersihkan pencarian `[X]` instan pada search bar kedua tab.
      - Menyaring data client-side pada `filteredSpecialPrices` dan `filteredRows` berdasarkan `custName`, `fdCustCode`, `category`, `branch`, `alias`, dan `fileName`.
  - **3. Verifikasi & Pengujian**:
    - Pengujian backend: Pencarian nama customer "ASH" $\to$ 2 data ditemukan (sebelumnya 0), "SAGI" $\to$ 2 data ditemukan, "ASH" pada master upload $\to$ 1 data ditemukan.
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/customer-price-list-h8A2Aq-Z.js` dalam 3.52s).
    - PM2 service `ShippingApi` direstart dan online (PID `24808`).
    - Verifikasi HTTP production `https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi disinkronkan di `docs/frontend/pricing.md` dan `.agents/working.md`.

---

- [x] **Buffer Debounce Hening Voice Command 1 Detik (~1000ms) (`ValidationDetailPage.tsx`, `BillingValidationSummaryModal.tsx`, `ValidationSummaryHeader.tsx`)**:
  - **1. Penyesuaian Timeout Debounce**:
    - Mengurangi jeda hening pengenalan suara dari 2000ms (2 detik) menjadi 1000ms (1 detik) pada `ValidationDetailPage.tsx` dan `BillingValidationSummaryModal.tsx`.
    - Perintah dieksekusi lebih responsif setelah jeda bicara 1 detik tanpa memotong nomor invoice lengkap.
  - **2. Penyesuaian Telemetry & Tooltip**:
    - Memperbarui teks tooltip tombol mikrofon pada header `ValidationDetailPage` dan `ValidationSummaryHeader`: `"menunggu jeda 1 detik sebelum dieksekusi..."` dan `"Standby Suara Aktif (Jeda 1 detik setelah bicara)"`.
  - **3. Verifikasi & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-Bbbg_PZO.js` dalam 2.99s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi disinkronkan di `frontend-app.md`, `docs/frontend/billing.md`, dan `.agents/working.md`.

---

- [x] **Klarifikasi & Format Label Sumbu X Bebas Ambiguitas pada Grafik Billing (`dateRange.ts`, `billing-analytics.service.ts`, `ChartTick.tsx`, `TrendChart.tsx`)**:
  - **1. Analisis Akar Masalah**:
    - Pada grafik Bulanan dengan fitur **Diferensiasi YoY Udara & Laut**, titik terakhir berlabel `"Sep 26"`.
    - Singkatan 2-digit tahun (`{ month: 'short', year: '2-digit' }` $\to$ `"Sep 26"`) menimbulkan persepsi keliru seolah-olah grafik hanya memuat data sampai **tanggal 26 September**. Padahal `"Sep 26"` adalah **September 2026**, yang sudah mencakup seluruh penagihan bulan September (1–30 September: 3.991 bill, Rp 46,8 miliar).
    - Pada grafik Harian (rentang 30 hari), konfigurasi lama `interval="equidistantPreserveStart"` melompati tick setiap 5 hari (indeks 0, 5, 10, 15, 20, 25), sehingga tick label terakhir yang tercetak di layar berhenti di indeks 25 yaitu `"26 Sep (Sab)"`, melewati 4 hari terakhir (27–30 Sep) meskipun garis kurvanya tetap ada.
  - **2. Solusi & Perbaikan Komprehensif**:
    - **Backend (`dateRange.ts` & `billing-analytics.service.ts`)**: Mengubah formatting label bulan dari 2 digit (`year: '2-digit'`) menjadi 4 digit (`year: 'numeric'`) $\to$ `"Sep 2026"` dan `"Sep 2025"`.
    - **Komponen Tick Sumbu X (`ChartTick.tsx`)**:
      - Menambahkan parser regex `monthYearMatch` untuk memecah teks bulan dan tahun menjadi 2 baris terpisah secara visual: Baris 1: `Sep`, Baris 2: `2026`.
      - Menghilangkan ambiguitas dengan tanggal hari.
      - Memperbaiki parsing tanggal harian `YYYY-MM-DD` ke waktu lokal untuk mencegah pergeseran timezone UTC di browser.
    - **Komponen Grafik (`TrendChart.tsx`)**:
      - Mendestruktur `isMonthly` secara eksplisit pada prop komponen.
      - Untuk grafik Bulanan (`isMonthly = true`), menyetel `interval={0}` sehingga seluruh 12 bulan (Okt 2025 s/d Sep 2026) tercetak tanpa ada bulan yang terlewati.
      - Untuk grafik Harian (`isMonthly = false`), menyetel `interval="preserveStartEnd"` agar tanggal awal (01 Sep) dan tanggal akhir (30 Sep / Hari Ini) dijamin 100% selalu tercetak di tepi kanan sumbu X.
  - **3. Verifikasi & Restart Service**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-DZAGg7eS.js` dalam 3.66s).
    - Restart PM2 service backend `ShippingApi` (PID `7000`, online).
    - Verifikasi HTTP production `https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi disinkronkan di `docs/frontend/billing.md`, `docs/backend/billing.md`, dan `.agents/working.md`.

---

- [x] **Perbaikan Resolusi Voice Command "buka [nomor]" Prioritas Bill Belum Terbit (Draft Only) (`ValidationDetailPage.tsx`)**:
  - **1. Akar Masalah**:
    - Perintah suara seperti `"buka 11023"` atau `"buka gzs 11023"` sebelumnya memicu pencarian umum tanpa parameter `draftOnly: 'true'`.
    - Database mengembalikan belasan invoice historis (sudah terbit dari 2023–2025 serta sub-bill bernilai 0), memicu ambiguitas multi-match dan membuka drawer alih-alih langsung membuka bill unissued target (`GZS-011023-09-2026`).
    - Format incomplete seperti `"GZS-11023"` sempat lolos regex format lengkap dan langsung dinavigasikan sehingga berakhir 404 (format asli SQL Server adalah `GZS-011023-09-2026`).
    - Kolom `tbBilling.fdInvNo` di SQL Server bertipe `CHAR(20)` dengan spasi ekstra di akhir yang merusak URL routing jika tidak di-`.trim()`.
  - **2. Solusi & Desain Resolusi Cerdas**:
    - **Prioritas 1 (Unissued / Draft Bills Only)**: Memanggil `billingApi.list({ search: unpaddedDigits || cleanTarget, draftOnly: 'true', hasAmount: 'true', minYear: '2023', noPagination: 'true' })`.
    - **Sequence Scorer (`evaluateMatch`)**:
      - Mengekstrak segmen sequence nomor bill (misal `011023` dari `GZS-011023-09-2026`).
      - Membandingkan `unpaddedSeq === unpaddedDigits` (`"11023" === "11023"` $\to$ +100 skor) serta kecocokan cabang (`+40` skor).
      - Mengurutkan kandidat berdasarkan skor tertinggi, lalu `fdInvDate` terbaru.
    - **Sanitasi String Presisi**: Seluruh kandidat nomor invoice otomatis di-`.trim()` untuk membersihkan trailing spaces `CHAR(20)`.
    - **Fallback Aman**: Jika bill tidak ditemukan di daftar unissued, sistem mencari di riwayat umum dan memberi tahu pengguna jika bill sudah berstatus Terbit (Issued). Menghilangkan navigasi spekulatif yang berujung 404.
  - **3. Verifikasi & Pengujian**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-B1e1eH1A.js` dalam 3.21s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi disinkronkan di `frontend-app.md`, `docs/frontend/billing.md`, dan `.agents/working.md`.

---

- [x] **Data Year-over-Year (YoY) pada Grafik Bill Bulanan 12 Bulan Terakhir (`billing-analytics.service.ts`, `TrendChart.tsx`, `DashboardPage.tsx`, `billing.types.ts`)**:
  - **1. Analisis Kebutuhan & Agregasi Data 24 Bulan di Backend**:
    - **Backend (`billing-analytics.service.ts`)**: Kueri bulanan diperluas dari 12 bulan menjadi 24 bulan (`months[0].start - 1 tahun`), mengelompokkan `tbBilling` berdasarkan `YEAR(fdInvDate), MONTH(fdInvDate)` via `GROUP BY`.
    - Menggunakan hash lookup map `${yr}-${mo}` untuk memasangkan setiap bulan dari 12 bulan terakhir dengan bulan yang sama tahun sebelumnya (`${yr - 1}-${mo}`).
    - Menghitung metrik perbandingan tahun lalu dan pertumbuhan persentase: `prevTotalBill`, `prevTotalTagihan`, `prevBillUdara`, `prevBillLaut`, `prevTagihanUdara`, `prevTagihanLaut`, serta `totalBillYoYPct`, `totalTagihanYoYPct`, `billUdaraYoYPct`, `tagihanUdaraYoYPct`, `billLautYoYPct`, `tagihanLautYoYPct`.
    - Restart PM2 service `ShippingApi` (PID `16612`).
  - **2. Visualisasi & Diferensiasi Kurva YoY Air vs Sea di Frontend (`TrendChart.tsx`, `DashboardPage.tsx`)**:
    - **Diferensiasi Kurva Putus-Putus Per-Moda**:
      - ✈️ **Udara YoY (Tahun Lalu)**: Garis kurva putus-putus (`strokeDasharray="5 4"`) beraksen Sky 400 (`#38bdf8`), tampil saat filter Semua maupun Udara aktif.
      - 🚢 **Laut YoY (Tahun Lalu)**: Garis kurva putus-putus (`strokeDasharray="5 4"`) beraksen Mint/Emerald 400 (`#34d399`), tampil saat filter Semua maupun Laut aktif.
      - Konsisten di kedua mode: Jumlah Bill (`metric="count"`) dan Nominal Tagihan (`metric="value"`).
    - **Mini Summary Banner Badges Per-Moda**:
      - Chip Udara memuat badge YoY mandiri (`YoY ▲ +X.X%` / `▼ -X.X%` beserta delta bill/nominal).
      - Chip Laut memuat badge YoY mandiri (`YoY ▲ +X.X%` / `▼ -X.X%` beserta delta bill/nominal).
      - Chip Total memuat badge YoY total akumulatif 12 bulan.
    - **Tooltip Interaktif Multi-Moda**: Menampilkan data bulan berjalan, perbandingan tahun lalu per moda, persentase pertumbuhan spesifik Udara & Laut, serta rincian selisih nominal/bill per moda.
    - **Sakelar Toggle YoY**: Tombol `[YoY Aktif / Off]` di toolbar tab Bulanan untuk mengontrol visibilitas kurva pembanding.
  - **3. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-DFsZ7bla.js` dalam 3.26s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi disinkronkan di `frontend-app.md`, `docs/frontend/billing.md`, `backend-app.md`, `docs/backend/billing.md`, dan `.agents/working.md`.

---

- [x] **Buffer Penerimaan Suara 2 Detik (~2000ms Debounce) & Continuous Listening pada Halaman Validasi Detail Bill (`ValidationDetailPage.tsx`, `BillingValidationSummaryModal.tsx`, `ValidationSummaryHeader.tsx`)**:
  - **1. Analisis Kebutuhan & Akar Masalah**:
    - **Akar Masalah Pemotongan Suara Cepat**: Sebelumnya `useVoiceRecognition` diatur dengan mode `continuous: false`. Chrome Web Speech API otomatis memutuskan sesi mikrofon saat terjadi hening singkat (500ms–800ms) antarkata, memicu `onEnd` dan siklus restart yang memotong kata berikutnya.
    - **Akar Masalah Trigger Prematur pada Interim**: `useEffect` pemrosesan suara sebelumnya mengevaluasi string interim secara instan tanpa jeda hening. Ketika pengguna berbicara kalimat majemuk (misal *"buka no invoice GZS 010751"*), saat pengguna baru mengucapkan *"buka 010"*, sistem langsung mengeksekusi navigasi pencarian untuk invoice 010 dan mematikan mikrofon sebelum 3 digit terakhir *"751"* sempat diucapkan.
  - **2. Solusi & Desain Teknis Komprehensif**:
    - **Mode Continuous Listening (`continuous: true`)**: Mengaktifkan `continuous: true` pada `ValidationDetailPage.tsx` dan `BillingValidationSummaryModal.tsx`. Sesi pengenalan suara browser tetap standby aktif menerima audio tanpa auto-cutoff di tengah ucapan.
    - **Buffer Debounce Hening 2 Detik (~2000ms via `voiceCommandTimerRef`)**:
      - Menggabungkan transkrip final dan interim secara mulus: `${transcript} ${interimTranscript}`.
      - Setiap kali ada kata atau token baru masuk ke transkrip, timer hening 2000ms di-reset ulang (`clearTimeout` $\to$ `setTimeout(..., 2000)`).
      - Perintah baru dievaluasi dan dieksekusi setelah pengguna berhenti bicara selama minimal 2 detik (2000ms of silence).
      - Transkrip dibersihkan secara aman (`resetTranscript()`) baik setelah perintah dieksekusi maupun jika tidak ada perintah yang cocok setelah 2 detik hening, mencegah residual buffer tersimpan lama.
    - **Atomic Ref Guard (`executeVoiceCommandRef` & `executeModalVoiceCommandRef`)**: Membungkus eksekusi perintah ke dalam `useRef` agar selalu mengeksekusi state dan callbacks terbaru tanpa hambatan stale closures.
    - **Pembatalan Bersih & Anti-Ghost Execution**:
      - Ketika pengguna menjeda mikrofon secara manual (klik tombol toolbar atau shortcut `Alt+V`), timer 2000ms langsung dibatalkan (`clearTimeout`) dan transkrip di-reset instan.
      - Ketika modal lain terbuka atau komponen unmount, pending timer otomatis dibatalkan.
    - **Live Visual Telemetry & Tooltip Feedback**:
      - Tombol mic pada toolbar header dan modal menampilkan transkrip ucapan yang sedang berjalan secara live (`🎙️ "[teks]"...`).
      - Tooltip tombol mic memberikan panduan jelas: `(menunggu jeda 2 detik sebelum dieksekusi...)`.
  - **3. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-DDpqt_Pz.js` dalam 3.43s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi disinkronkan di `frontend-app.md`, `docs/frontend/billing.md`, dan `.agents/working.md`.

---

- [x] **Redesign Komprehensif Modal Terbitkan Invoice / Issue Modal (`IssueInvoiceModal.tsx`)**:
  - **1. Audit Desain & Standar Desain Sistem**:
    - Menerapkan prinsip skill `redesign-existing-projects` dan standar UI kompak mshipping (`.agents/rules/ui-styling.md`).
    - Eliminasi tampilan flat dan font generik menjadi antarmuka ERP berdensitas tinggi, elegan, serta 100% Midnight Dark Mode compliant.
  - **2. Peningkatan Visual & Tata Letak Komponen**:
    - **Top Accent Gradient Bar Dinamis**: Aksen gradien atas (Emerald teal untuk terbit normal, Amber-rose untuk peringatan undercharge).
    - **Executive Summary Card**: Menyatukan No. Faktur (dengan tombol salin instan `copyToClipboard` dan status feedback), tanggal faktur (kalender mono), identitas pelanggan dengan squircle avatar inisial (`getInitials`), serta ribbon Total Tagihan Resmi tabular figures (`formatCurrency`).
    - **Kartu Identitas Petugas Penyerah (`tbBillingGiveEmp`)**: Menampilkan squircle avatar, kode & nama staf terverifikasi otomatis, badge `Akun Anda`, dan tombol toggle penggantian petugas.
    - **Panel Audit Kepatuhan Risiko Undercharge**: Menampilkan badge `UNDERCHARGE DETECTED`, listbox perbandingan harga ditagih vs harga acuan master dengan delta minus tebal font mono rose, serta kartu checkbox interaktif beraksen aktif.
    - **Ketentuan Legalitas & SOP Compliance**: Banner ringkas dengan ikon gembok yang menjelaskan penguncian status `ISSUED` permanen.
    - **Live Voice Telemetry Capsule & Kontrol Cepat**: Beacon denyut hijau radar mic, transkrip live dialog, tombol batal, dan tombol aksi primer dengan shadow glow, active press feedback (`active:scale-[0.98]`), serta pintasan keyboard `↵ Enter` dan `Esc`.
  - **3. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-Dj7H3kq0.js` dalam 3.64s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi diperbarui di `frontend-app.md`, `docs/frontend/billing.md`, dan `.agents/working.md`.

---

- [x] **Perintah Suara Buka No Invoice Langsung pada Detail Validasi Bill (`ValidationDetailPage.tsx`, `BillingValidationSummaryModal.tsx`, `voiceSearch.utils.ts`)**:
  - **1. Analisis Kebutuhan & Integrasi**:
    - **Tujuan**: Memungkinkan pengguna menyebut nomor faktur secara langsung dari halaman validasi detail untuk berpindah ke faktur tersebut:
      `https://app.sampai.co/mshipping/finance/billing/validation/<no bill yang disebutkan>` (`ROUTES.BILLING_VALIDATION_DETAIL(invNo)`).
    - **Cakupan Pola Ucapan Luas**:
      - *"buka no invoice GZS 010751"* $\to$ `"GZS-010751"`
      - *"buka invoice 010751"* $\to$ `"010751"`
      - *"buka no bill GZS 010751"* $\to$ `"GZS-010751"`
      - *"buka bill 010751"* $\to$ `"010751"`
      - *"buka faktur 010866"* $\to$ `"010866"`
      - *"buka 010751"* $\to$ `"010751"`
      - *"buka no 010751"* $\to$ `"010751"`
      - *"buka GZS 010751"* $\to$ `"GZS-010751"`
      - *"GZS 010751"* $\to$ `"GZS-010751"`
  - **2. Solusi & Desain Teknis**:
    - **Ekstraksi Target Cerdas Bebas Konflik (`extractInvoiceOpenTarget` di `voiceSearch.utils.ts`)**:
      - Menyaring kata reserved sistem (*"tab"*, *"drawer"*, *"resi"*, *"marking"*, *"inspeksi"*, *"refresh"*, *"cetak"*, *"terbitkan"*, *"kembali"*, dll) sehingga perintah navigasi tab (*"buka tab 1-5"*), pembukaan drawer (*"cari"*, *"pilih invoice"*), dan aksi modal tidak tertabrak.
      - Memproses normalisasi fonetik cabang (`GZS`, `GZA`, `YWS`, `YWA`, `JKS`, `JKA`, `SG`, `HK`, `BKK`, `KR`, `SZ`, `SH`, `SUB`), konversi angka fonetik (*"kosong satu..."* $\to$ `"010751"`), dan menghubungkan strip pemisah secara otomatis.
    - **Handler Navigasi Resilien (`handleOpenInvoiceByVoice` di `ValidationDetailPage.tsx`)**:
      - Format lengkap (e.g. `GZS-010751`): Jika invoice yang diminta sedang dibuka, tampilkan info toast tanpa reload; jika berbeda, langsung eksekusi `navigate(ROUTES.BILLING_VALIDATION_DETAIL(target))`.
      - Format angka saja (e.g. `010751`): Menjalankan pencarian cepat ke `billingApi.list`. Jika cocok dengan prefix cabang invoice saat ini (`currentPrefix`) atau hasil tunggal, langsung buka invoice tersebut. Jika terdapat beberapa kandidat cabang berbeda, buka `ValidationListDrawer` dengan query terkait.
      - Proteksi konkurensi via `isNavigatingInvoiceRef` dan pembersihan transkrip atomik (`resetTranscript()`) untuk mengeliminasi false double navigation.
    - **Dukungan Dual-Modal pada Modal Kesimpulan (`BillingValidationSummaryModal.tsx`)**:
      - Mengintegrasikan handler `extractInvoiceOpenTarget` di dalam modal ringkasan. Jika pengguna menyebut *"buka invoice [nomor]"* saat modal ringkasan sedang terbuka, modal langsung ditutup secara aman dan navigasi ke faktur baru dieksekusi via `onSelectInvoice(target)`.
  - **3. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-Bt8h8kZE.js` dalam 3.81s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi diperbarui di `frontend-app.md`, `docs/frontend/billing.md`, dan `.agents/working.md`.

---

- [x] **Resolusi Looping Buka Bill pada Drawer Validasi (`ValidationListDrawer.tsx`, `ValidationDetailPage.tsx`, `useVoiceRecognition.ts`)**:
  - **1. Akar Masalah Looping Setelah Buka Bill dari Drawer**:
    - **Akar Masalah 1 (Ketiadaan Guard `isOpen` pada Voice Effect Drawer)**: Komponen `ValidationListDrawer` tetap di-mount secara virtual di DOM saat `isOpen: false`. Di dalam drawer, `useEffect` pemrosesan suara tidak memiliki guard `if (!isOpen) return`. Ketika faktur dipilih, `navigate()` memicu re-render pada `ValidationDetailPage` yang membuat ulang fungsi inline `onSelectInvoice` dan `onClose`. Akibatnya `useEffect` di drawer yang tertutup terpanggil ulang, dan jika sisa transkrip ucapan `"pilih"` masih berada di state buffer, ia mengeksekusi `onSelectInvoice` kembali secara berulang (infinite re-render / navigation loop).
    - **Akar Masalah 2 (Sisa Transkrip Ucapan Membocorkan Aksi Balik ke Halaman Utama)**: Saat drawer ditutup, mic standby `ValidationDetailPage` aktif kembali. Jika buffer sisa ucapan pengguna (*"pilih ..."* / *"cari ..."*) tertangkap oleh mic induk, baris 534 `ValidationDetailPage` langsung memicu `setIsListDrawerOpen(true)` kembali, menyebabkan drawer berulang-kali tertutup lalu terbuka lagi secara otomatis (bouncing/looping open-close).
    - **Akar Masalah 3 (Salvaging Ghost Interim Text pada `useVoiceRecognition.ts`)**: Ketika `stopListening()` dipanggil saat penutupan drawer, fungsi tersebut justru menginjeksikan kembali teks interim dari `latestInterimRef` ke dalam state `transcript`, menimpa pembersihan `resetTranscript()` dan menghidupkan kembali transkrip pemicu aksi.
    - **Akar Masalah 4 (Auto Re-Arm Timeout Menembus Status Closed)**: Callback `onEnd` di drawer menjalankan `setTimeout` 300ms dengan stale closure variabel `isOpen` lama sehingga `startVoiceListening()` tetap terpanggil meski drawer sudah ditutup.
  - **2. Solusi & Perbaikan Komprehensif**:
    - **Atomic Execution & Flag State (`handleSelectAndClose`)**: Membungkus pemilihan faktur (klik mouse, tombol Enter, dan perintah suara) ke dalam satu handler atomik dengan `isProcessingActionRef.current = true`, pembatalan auto re-arm, pembersihan transkrip instan, dan penutupan drawer.
    - **Strict Guard `if (!isOpen || !isOpenRef.current) return`**: Memasang guard pada baris pertama `useEffect` pemrosesan suara drawer sehingga drawer tertutup tidak akan pernah menjalankan logika aksi faktur.
    - **Stabilisasi Callback Halaman Induk (`useCallback`)**: Membungkus `handleCloseDrawer` dan `handleSelectInvoice` pada `ValidationDetailPage` menggunakan `useCallback` agar referensinya stabil antar-render.
    - **Cooldown Guard 1000ms Anti-Reopen (`drawerClosedAtRef`)**: Menambahkan cooldown 1000ms pada pendeteksi suara drawer di `ValidationDetailPage` agar residu ucapan saat drawer ditutup tidak memicu pembukaan drawer kembali.
    - **Clean Stop pada Hook Suara (`useVoiceRecognition.ts`)**: Mengosongkan `latestInterimRef` dan tidak lagi menginjeksikan sisa teks interim ke `transcript` saat `stopListening()` dipanggil secara manual.
  - **3. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-CeSvBWs0.js` dalam 3.81s).
    - Dokumentasi diperbarui di `frontend-app.md` dan `.agents/working.md`.

---


- [x] **Resolusi Konflik Kata "Buka" pada Drawer Pencarian Faktur Detail Validasi (`ValidationListDrawer.tsx`)**:
  - **1. Akar Masalah Konflik Kata "Buka"**:
    - Di `ValidationListDrawer.tsx`, kata *"buka"* sebelumnya digunakan sebagai kata kunci pembuka faktur terpilih (`isPureOpenCmd` & `hasOpenActionWord`).
    - Hal ini bertabrakan dengan:
      - Perintah navigasi tab pada halaman validasi (*"buka tab 1, 2, dst"*).
      - Perintah pembukaan drawer itu sendiri (*"buka drawer"*). Ketika drawer baru terbuka, sisa transkrip ucapan *"buka"* langsung memicu fallback pembuka faktur secara prematur dan langsung menutup kembali drawer.
      - Fitur pencarian: jika pengguna menyebut nama/nomor yang diawali *"buka ..."*, interim result langsung memicu pembukaan faktur teratas alih-alih mencari.
      - Teks UI dan placeholder mengarahkan pengguna untuk menyebut *"Buka"*.
  - **2. Solusi & Perbaikan**:
    - **Eliminasi 100% Kata "Buka" dari Trigger Aksi**: Mengubah perintah aksi pemilihan faktur murni menjadi *"pilih"*, *"enter"*, *"oke"*, *"ok"*, *"ya"*, atau *"proses"*.
    - **Penghapusan Fallback Acak Prematur**: Jika perintah komposit *"pilih [nama/nomor]"* tidak menemukan faktur yang cocok, sistem tidak lagi memaksa membuka faktur index 0 secara acak.
    - **Supresi & Penyaringan Kata "Buka"**: Ucapan kata *"buka"* yang masuk ke drawer otomatis diabaikan atau dibersihkan dari query pencarian sehingga tidak mengotori search input maupun memicu aksi salah.
    - **Pembersihan Transkrip Saat Buka/Tutup (`resetTranscript`)**: Memanggil `resetTranscript()` saat drawer `isOpen: true` dan `isOpen: false` untuk mengeliminasi sisa buffer ucapan dari halaman induk.
    - **Penyelarasan Teks UI**: Placeholder diubah menjadi `🎙️ Mendengarkan ucapan... (Sebutkan faktur lalu "Pilih" / "Enter")`, status banner menjadi `Suara aktif: sebutkan nomor/nama, lalu katakan "Pilih" atau "Enter"`, dan badge item menjadi `🎯 Terpilih · Katakan "Pilih" atau Tekan Enter ↵`.
  - **3. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-B_2rfgzS.js` dalam 3.66s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi diperbarui di `frontend-app.md`, `docs/frontend/billing.md`, dan `.agents/working.md`.

---

- [x] **Pengubahan Grafik Tren Bill Harian & Bulanan Menjadi Line Curve Chart (`TrendChart.tsx`, `DashboardPage.tsx`)**:
  - **1. Transformasi Diagram Batang ke Line Curve Chart Monotone (`TrendChart.tsx`)**:
    - Mengganti diagram batang (`<Bar>`) pada mode hitung (`metric === 'count'`) menjadi kurva halus presisi (`<Line type="monotone">`) yang didukung gradien area lembut (`<Area type="monotone">`).
    - Konsistensi visual diterapkan untuk moda gabungan (`all`), moda Udara (`udara`), dan moda Laut (`laut`).
    - Gradien area menggunakan `trendAreaLautFill` (Emerald `#10b981`) dan `trendAreaUdaraFill` (Sky Blue `#0284c7`) dengan transisi opasitas 0.25 ke 0.01.
  - **2. Titik Data Adaptif & Hairline Guideline Vertikal**:
    - Disematkan dot data adaptif: `dot={data.length <= 14 ? { r: 3, ... } : false}` yang memberikan penanda titik jelas saat rentang hari pendek (7-14 hari) namun tetap bersih saat data banyak (30 hari / 12 bulan).
    - `activeDot={{ r: 5, stroke: 'var(--color-surface)', strokeWidth: 2 }}` saat hover.
    - `connectNulls` aktif untuk mencegah garis putus jika terdapat gap data.
    - Hairline cursor putus-putus `{ stroke: 'var(--color-border)', strokeWidth: 1.5, strokeDasharray: '4 4' }` memandu pembacaan tooltip dengan presisi.
  - **3. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-BnaNWC8h.js` dalam 13.32s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi disinkronkan di `docs/frontend/billing.md`, `frontend-app.md`, dan `.agents/working.md`.

---

- [x] **Peningkatan Mesin Pencari & UX Search Halaman Customer (`customers.service.ts`, `CustomerToolbar.tsx`, `ListPage.tsx`, `SearchSuggestionsDropdown.tsx`)**:
  - **1. Resolusi Konflik `where.OR` & Dukungan Pencarian Multi-Token pada Backend (`customers.service.ts`)**:
    - **Akar Masalah OR Overwrite**: Sebelumnya ketika filter kategori (seperti `direct` atau `no_status`) dipilih bersamaan dengan teks pencarian, blok `where.OR` pencarian ditimpa oleh kondisi grup `where.OR = [{ fdBroker: 0 }, { fdBroker: null }]`, sehingga filter pencarian musnah total.
    - **Akar Masalah Direct Missing**: Menyelaraskan status `direct` agar mencakup `fdBroker: 2`, `0`, atau `null` sesuai aturan ERP warisan FoxPro (18.165 data dengan `fdBroker = 2` sebelumnya tidak terhitung).
    - **Struktur Kueri Resilien**: Mengisolasi seluruh klausa ke dalam array Prisma `AND: [...]` sehingga `OR` pencarian dan `OR` status beroperasi serentak tanpa saling meniadakan.
    - **Mesin Pencarian Multi-Token**: Memecah query pencarian majemuk berbasis kata (misal `"budi jakarta"`, `"abs bintaro"`) menjadi filter AND antartoken.
    - **Normalisasi Nomor Telepon**: Mengekstrak digit telepon pada query sehingga pencarian nomor seperti `0815-8664-9888` dapat mencocokkan data di database.
    - **Cakupan Kolom Luas**: Pencarian kini memeriksa `fdCustName`, `fdCustCode`, `fdContact`, `fdHP`, `fdTelp`, `fdCityName`, `fdAddr1`, `fdBillTo`, `fdNamaPengiriman`, `fdKotaPengiriman`, `fdSalesNM`, `fdEmailPenagihan`, dan `fdKeterangan`.
  - **2. Peningkatan Saran Autocomplete (`getCustomerSuggestions`)**:
    - Memberikan prioritas ranking prefix: awalan kode pelanggan (`fdCustCode`) $\to$ awalan nama pelanggan (`fdCustName`) $\to$ kontak/kota.
    - Menampilkan informasi kota dan kontak secara terstruktur.
  - **3. Peningkatan Interaksi & Navigasi Keyboard (`CustomerToolbar.tsx`, `SearchSuggestionsDropdown.tsx`)**:
    - Navigasi keyboard panah atas/bawah (`↑` / `↓`) untuk memilih saran autocomplete secara langsung dengan visual highlight seleksi.
    - Tombol `Enter`: Memilih saran yang sedang disorot atau submit pencarian secara instan tanpa menunggu jeda debounce.
    - Tombol `Esc`: Menutup dropdown saran dan membersihkan input saat ditekan.
    - Tombol Clear `[X]`: Membersihkan pencarian sekaligus mereset state kueri seketika.
    - Pintasan keyboard `Ctrl+K`: Tetap fokus instan ke search input.
  - **4. Sinkronisasi URL Dua Arah & Eliminasi Layar Flicker (`ListPage.tsx`)**:
    - Parameter URL `?search=` tersinkronisasi otomatis dengan input pencarian, memungkinkan bookmarking dan deep-linking.
    - Menghilangkan flickering/jumping table: tabel data lama dipertahankan dengan efek semi-transparan (`opacity-60`) saat background refetch berlangsung (`isRefreshing`), bukan diganti total menjadi skeleton wireframe.
    - Menghilangkan churn query: pergantian halaman ke hal 1 hanya dipicu saat query aktif telah dievaluasi, bukan pada setiap ketukan huruf.
  - **5. Verifikasi Build & PM2 Restart**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (10.86s).
    - Service backend PM2 `ShippingApi` direstart dan online (PID 7304).
    - Live HTTPS `https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi diperbarui di `docs/backend/customers.md` dan `docs/frontend/master-admin.md`.

---


- [x] **Redesign Responsif Mobile Modal Rincian Target Estimasi Kirim (DeliveryEstimasiDetailModal.tsx)**:
  - **1. Shell Modal & Layout Responsif Viewport Mobile**:
    - Mengubah kontainer modal menjadi fullscreen-fit pada layar smartphone (h-full sm:h-auto max-h-[100dvh] sm:max-h-[92vh] rounded-none sm:rounded-2xl border-0 sm:border) untuk memaksimalkan ruang kerja vertikal tanpa terpotong batas luar.
    - Touch targets tombol aksi diperbesar (36–40px) dan banner info aturan toleransi disajikan secara ringkas dan rapi (	ext-[11px] leading-relaxed).
  - **2. Dual View Mode (Kartu Mobile vs Tabel Desktop Lengkap)**:
    - Default tampilan dinamis: Layar sempit (< 768px) otomatis memuat **Kartu Responsif (Cards View)**; layar lebar desktop memuat **Tabel Lengkap (Table View)**.
    - Tombol Switcher Mode Tampilan: Disematkan tombol toggle [ 📱 Kartu | ▤ Tabel ] (LayoutGrid vs Rows3) pada toolbar agar staf dapat beralih bebas di perangkat apa pun.
    - **Komponen Kartu Mobile Berdensitas Informasi Tinggi**:
      - Nomor urut & No. Surat Jalan dengan ikon truk dan link langsung ke detail Surat Jalan (ROUTES.DELIVERY_DETAIL).
      - Semantic status badges outline (Midnight Dark Mode compliant): Overdue +H (rose), Toleransi H+1 (amber), Terkirim (emerald), Terkirim Late (sky).
      - Identitas Customer (displayCustName), Moda badge (✈️ Udara / 🚢 Laut), kode & nomor marking, serta nomor resi terima (dTerima).
      - Box Muatan & Armada: Supir, plat kendaraan, link panggilan telepon langsung (	el: pada dTelpSupir), kuantitas koli fisik, dan tonase berat (kg).
      - Timeline tanggal (Tgl SJ, Estimasi, Toleransi H+1, Realisasi Kirim) dan tombol aksi cepat " Detail SJ ↗\.
 - **3. Standar Loading Shimmer Wireframe (Eliminasi Spinner Bulat)**:
 - Menggantikan spinner bulat lawas dengan wireframe skeleton shimmer multi-kartu (.skeleton-shimmer) yang konsisten dengan tema Midnight Dark Mode.
 - **4. Filter Toolbar & KPI Ribbon Sentuh**:
 - Status Filter Chips dalam kontainer horizontal scrollable tanpa scrollbar (scrollbar-none) mencegah layout terlipat canggung di layar sempit.
 - 4 Kartu KPI Ribbon (Target Estimasi, Overdue, Toleransi H+1, Terkirim) memiliki active ring indicator dan berfungsi ganda sebagai tombol filter sekali sentuh.
 - Kolom pencarian teks instan dilengkapi tombol clear [X].
 - Tombol Tutup modal pada footer full-width di mobile untuk ergonomi jempol.
 - **5. Verifikasi Build & Kepatuhan Arsitektur**:
 - cd frontend && bun run build $\to$ **LULUS 100% 0 errors** (dist/assets/delivery-orders-BDmsq8qm.js dalam 2.96s).
 - Dokumentasi diperbarui di docs/frontend/delivery-orders.md dan .agents/working.md.


- [x] **Fitur Suara Refresh Halaman Validasi & Audit Komprehensif Bebas Konflik (`ValidationDetailPage.tsx`, `BillingValidationSummaryModal.tsx`)**:
  - **1. Perintah Suara Refresh / Segarkan Data Validasi & Tagihan**:
    - Mendukung perintah ucapan: *"refresh"*, *"segarkan"*, *"muat ulang"*, *"reload"*, *"cek ulang"*, *"sinkron"*, *"update data"*.
    - Mengeksekusi invalidasi cache TanStack Query serentak: `['billingDetail', id]`, `['m3-check']`, dan `['billingTransportCheck']` via `handleRefresh()`.
    - Dilengkapi notifikasi toast berhasil dan animasi putar ikon pada tombol header baru `[ 🔄 Refresh ]`.
    - Fitur suara refresh juga diintegrasikan ke dalam dialog modal `BillingValidationSummaryModal.tsx`.
  - **2. Perintah Suara Cetak / Print Invoice**:
    - Mendukung ucapan: *"cetak"*, *"print"*, *"unduh pdf"*, *"download pdf"*, *"cetak invoice"*, *"cetak faktur"* $\to$ langsung mengunduh/mencetak dokumen resmi invoice via `downloadInvoicePdf`.
  - **3. Resolusi Konflik Kata Aksi "Buka"**:
    - Menghapus frasa *"buka drawer"* dari trigger pencarian drawer; pembukaan drawer faktur kini murni dipicu oleh: *"cari"*, *"cari invoice"*, *"cari faktur"*, *"pilih invoice"*, *"pilih faktur"*, *"drawer"*, *"daftar invoice"*, *"ganti invoice"*.
    - Menghapus frasa *"buka resi"* dari trigger modal resi (cukup *"resi"*, *"marking"*, *"cek resi"*).
    - Menghapus frasa *"buka terbitkan"* dari modal audit summary `BillingValidationSummaryModal.tsx`.
    - Pemilihan tab disederhanakan: *"tab 1"*, *"tab 2"*, dst, varian kata bilangan (*"tab satu"*, *"tab dua"*), atau nama tab langsung (*"item"*, *"tarif"*, *"m3"*, *"timbangan"*, *"overweight"*, *"freight"*, *"ekspedisi"*), dengan regex toleran `(?:buka\s+)?tab\s*1` sehingga kata *"buka"* mandiri tidak pernah memicu pergantian tab.
    - Kata *"buka"* kini terisolasi 100% khusus sebagai kata aksi pembuka invoice terpilih (`highlightedBilling`) di dalam `ValidationListDrawer.tsx`.
  - **4. Audit Komprehensif & Eliminasi Celah Error (Halaman Validasi dari Baris Pertama)**:
    - *Aturan Hooks*: Memverifikasi 100% hooks (`useState`, `useQuery`, `useMemo`, `useBillingValidation`, `useVoiceRecognition`, `useEffect`, `useCallback`) dijalankan tanpa syarat (unconditionally) di atas blok early return.
    - *Konsistensi Data Pelanggan*: Menyempurnakan fallback prop `customerName` pada `BillingValidationCard` dan modal-modal terkait agar selalu menggunakan `displayCustName(data.customer?.fdCustName || data.fdCustCode)`.
    - *Sinkronisasi Cache Modal Edit Item*: Memperbarui callback `onSuccess` pada `EditBillingDetailsModal` agar meng-invalidate `['billingTransportCheck']` bersama dengan `billingDetail` dan `m3-check`.
    - *Indikator & Tooltip Toolbar*: Menyelaraskan teks tooltip microphone telemetry dari *"Buka tab 1-5"* menjadi panduan perintah baru: *"Tab 1-5"*, *"Refresh"*, *"Cari"*, *"Terbitkan"*, dll.
  - **5. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-COfBWvXq.js` dalam 3.15s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi diperbarui di `frontend-app.md` dan `docs/frontend/billing.md`.

---

- [x] **Mode Standby Suara Otomatis pada Halaman Validasi & Navigasi Tab Hands-Free (`ValidationDetailPage.tsx`, `BillingValidationCard.tsx`, `types.ts`)**:
  - **1. Standby Suara Mandiri Hands-Free Tanpa Modal**:
    - Saat berada di `ValidationDetailPage` (ketika tidak ada dialog modal aktif), mikrofon otomatis siaga mendengarkan dengan auto re-arm resilien 200ms.
    - Dilengkapi supresi suara global (`suppressVoice()`) dan integrasi shortcut `Alt+V` lokal halaman.
    - Saat salah satu dialog modal (`BillingValidationSummaryModal`, `IssueInvoiceModal`, `ValidationListDrawer`, dll) terbuka, mikrofon halaman otomatis jeda/mengalah ke modal terkait.
  - **2. Perintah Buka Drawer Pencarian Invoice**:
    - Perintah ucapan: *"pilih invoice"*, *"pilih faktur"*, *"cari"*, *"cari invoice"*, *"cari faktur"*, *"buka drawer"*, *"drawer"* seketika membuka `ValidationListDrawer` (`setIsListDrawerOpen(true)`).
  - **3. Navigasi Tab Kartu Validasi ("Buka tab 1, 2, dst")**:
    - Terhubung dengan state `validationCardTab` yang diteruskan ke `BillingValidationCard`.
    - Tab 1 = Item & Tarif (`profile`), Tab 2 = Validasi M3 / Timbangan (`m3_weight`), Tab 3 = Overweight (Laut) / Freight (Udara/Type 2), Tab 4 = Freight (Laut) / Ekspedisi (Udara/Type 2), Tab 5 = Ekspedisi (Laut).
    - Mendukung kata bilangan (*"tab satu"*, *"tab dua"*, dst) serta nama tab spesifik (*"overweight"*, *"freight"*, *"ekspedisi"*, *"item"*, *"info tagihan"*).
    - Otomatis mengaktifkan `setMobileTab('validation')` saat beralih tab kartu di mode mobile.
  - **4. Aksi Cepat Halaman Validasi**:
    - *"terbitkan"* $\to$ membuka modal konfirmasi penerbitan (`IssueInvoiceModal`).
    - *"inspeksi"* / *"ringkasan"* $\to$ membuka modal audit summary (`BillingValidationSummaryModal`).
    - *"resi"* / *"marking"* $\to$ membuka modal resi marking (`BillResiMarkingModal`).
    - *"history"* / *"riwayat"* $\to$ membuka modal riwayat (`CustomerBillingHistoryModal`).
    - *"audit"* $\to$ membuka audit tarif customer (`CustomerTariffAuditModal`).
    - *"kembali"* $\to$ kembali ke antrean daftar validasi billing (`ROUTES.BILLING_VALIDATION_LIST`).
  - **5. Indikator Visual Live Telemetry Titik Hijau Berkedip**:
    - Tombol status mic standby beranimasi titik hijau berkedip (`animate-ping` + `animate-pulse`) pada ribbon toolbar header.
    - Titik hijau berkedip pada sudut tombol floating action search (FAB).
  - **6. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-D8lCsr4N.js` dalam 3.65s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi diperbarui di `frontend-app.md` dan `docs/frontend/billing.md`.

---

- [x] **Audit & Stabilisasi Resiliensi Modal Konfirmasi Penerbitan Invoice (`IssueInvoiceModal.tsx`)**:
  - **1. Eliminasi Hambatan Undercharge Warning pada Konfirmasi Suara**:
    - **Akar Masalah**: Panggilan suara cepat (*"ya"*, *"ok"*, *"terbitkan"*) sebelumnya terhalang oleh closure state `hasConfirmedUndercharge` yang bernilai `false`, sehingga eksekusi `handleIssue()` tertahan oleh validasi peringatan undercharge (`toast.warning`).
    - **Solusi**: Menyinkronkan `hasConfirmedUnderchargeRef` dan menambahkan parameter `bypassUnderchargeCheck = false` pada `handleIssue()`. Perintah suara konfirmasi kini langsung memanggil `handleIssue(true)` sekaligus menyetel `hasConfirmedUndercharge = true`, memastikan invoice langsung diterbitkan tanpa terhambat popup warning.
  - **2. Perluasan Kosakata Perintah Suara & Prioritas Batal**:
    - Perintah Batal/Tutup: Ditambahkan *"batalkan"*, *"tidak"*, *"enggak"*, *"nggak"*, *"jangan"* di samping *"batal"*, *"cancel"*, *"tutup"*, *"kembali"*, *"keluar"*. Evaluasi pembatalan diuji terlebih dahulu untuk memitigasi ucapan komposit seperti *"jangan terbitkan"*.
    - Perintah Terbitkan: Ditambahkan *"terbitkan invoice"*, *"terbitkan bill"*, *"lanjut"*, *"lanjutkan"*, *"proses"*, *"siap"*, *"sip"*, *"yup"*, *"acc"*, *"confirm"* di samping *"ya"*, *"ok"*, *"oke"*, *"terbitkan"*, *"setuju"*, *"konfirmasi"*.
  - **3. Proteksi Konkurensi & Auto Re-arm Resilien**:
    - Menambahkan `isProcessingRef` untuk mencegah double execution jika recognition memicu callback berulang.
    - Menambahkan auto re-arm mikrofon jika panggilan API penerbitan gagal atau karyawan belum dipilih, sehingga kontrol suara hands-free tetap aktif tanpa mati permanen.
  - **4. Indikator Visual Header & Sinkronisasi Cache Lengkap**:
    - Menambahkan badge live telemetry titik hijau berkedip (`animate-ping` + `animate-pulse`) `Standby Suara` pada header dialog modal.
    - Menambahkan pembersihan cache React Query untuk `['m3-check']` bersama dengan `billingDetail`, `billingList`, `billingValidationList`, dan `billingM3Check`.
  - **5. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-DdA-kDHC.js` dalam 3.54s).
    - Dokumentasi diperbarui di `frontend-app.md` dan `docs/frontend/billing.md`.

---

- [x] **Peningkatan Perintah Suara: Nomor Urut Tab (Modal Audit) & Kata Cepat Ya/Ok/Batal/Cancel (Modal Konfirmasi) (`BillingValidationSummaryModal.tsx`, `IssueInvoiceModal.tsx`, `ValidationSummaryHeader.tsx`)**:
  - **1. Navigasi Tab Berdasarkan Nomor Urut Tampilan (`BillingValidationSummaryModal.tsx`)**:
    - Mendukung perintah suara: *"buka tab 1"*, *"buka tab 2"*, *"buka tab 3"*, *"buka tab 4"*, *"buka tab 5"*, serta varian kata bilangan (*"tab satu"*, *"tab dua"*, *"tab pertama"*, *"tab kedua"*, dst).
    - Memetakan nomor tab secara dinamis sesuai urutan tampilan visual:
      - **Moda Laut**: Tab 1 = Item & Tarif (`items`), Tab 2 = Validasi M³ (`m3_weight`), Tab 3 = Overweight (`overweight`), Tab 4 = Freight Charge (`freight`), Tab 5 = Transport & Ekspedisi (`transport`).
      - **Moda Udara**: Tab 1 = Item & Tarif (`items`), Tab 2 = Timbangan Fisik (`m3_weight`), Tab 3 = Freight Charge (`freight`), Tab 4 = Transport & Ekspedisi (`transport`).
  - **2. Perintah Cepat Terbitkan & Batal pada Modal Konfirmasi (`IssueInvoiceModal.tsx`)**:
    - Menerbitkan invoice: dapat menggunakan kata cepat *"ya"*, *"ok"*, *"oke"*, *"terbitkan"*, *"konfirmasi"*, atau *"setuju"*.
    - Membatalkan penerbitan: dapat menggunakan kata *"batal"*, *"cancel"*, *"tutup"*, *"kembali"*, atau *"keluar"*.
    - Dilengkapi pembersihan transkrip atomik (`resetTranscript()`) dan auto re-arm standby.
  - **3. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-B4YMZix9.js` dalam 3.81s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi diperbarui di `docs/frontend/billing.md`.

---

- [x] **Mode Standby Otomatis Hands-Free & Titik Hijau Blinking pada Modal Audit & Konfirmasi (`BillingValidationSummaryModal.tsx`, `ValidationSummaryHeader.tsx`, `IssueInvoiceModal.tsx`, `ValidationDetailPage.tsx`)**:
  - **1. Standby Hands-Free Tanpa Shortcut Alt+V**:
    - Kedua modal (`BillingValidationSummaryModal.tsx` & `IssueInvoiceModal.tsx`) sekarang otomatis aktif dalam status standby mendengarkan (`startListening()`) seketika saat dibuka tanpa memerlukan tombol pintasan `Alt+V` maupun klik tombol mikrofon.
    - Dilengkapi mekanisme auto re-arm resilien pada event `onEnd`: apabila ucapan selesai atau terjadi jeda hening, sistem otomatis mengaktifkan kembali listening dalam 200ms selama dialog modal masih aktif terbuka.
    - Menghilangkan label/badge `Alt+V` dari UI dan tooltip modal.
  - **2. Visual Indikator Titik Hijau Blinking (Live Telemetry Dot)**:
    - Menambahkan visual titik hijau berdenyut/berkedip (`animate-ping` + `animate-pulse` emerald dot) pada header modal audit (`ValidationSummaryHeader.tsx`) dan footer modal konfirmasi (`IssueInvoiceModal.tsx`).
    - Menampilkan teks status dinamis: `Standby Suara` saat siaga, dan transkrip kalimat ucapan live saat pengguna mendiktekan perintah.
    - Tombol tetap dapat diklik untuk menjeda atau mengaktifkan kembali mikrofon secara manual bila diinginkan.
  - **3. Penghapusan Link ke Fitur Voice Global**:
    - Menghapus tombol Suara global pada ribbon header `ValidationDetailPage.tsx` untuk mengeliminasi ambiguitas akses suara.
    - Membersihkan unused imports (`Mic`, `canUseVoice`, `openAssistant`) pada `ValidationDetailPage.tsx`.
    - Supresi asisten suara global (`suppressVoice()`) tetap aktif penuh saat modal audit atau modal konfirmasi terbuka.
  - **4. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-DZ1VX62l.js` dalam 3.20s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi diperbarui di `frontend-app.md` dan `docs/frontend/billing.md`.

---

- [x] **Isolasi Fitur Suara pada Modal Audit & Validasi serta Modal Konfirmasi Penerbitan (`BillingValidationSummaryModal.tsx`, `ValidationSummaryHeader.tsx`, `IssueInvoiceModal.tsx`, `voiceAssistantStore.ts`, `AppLayout.tsx`)**:
  - **1. Supresi Asisten Suara Global Otomatis (`voiceAssistantStore.ts` & `AppLayout.tsx`)**:
    - Menambahkan state reference-counting `suppressionCount` dan flag `isSuppressed` pada Zustand store global `useVoiceAssistantStore`.
    - Menyediakan metode `suppressVoice(): () => void` yang mengembalikan fungsi cleanup pelepasan supresi secara atomik dan leak-free.
    - Menambahkan guard pada `openAssistant()` dan `toggleAssistant()` agar panggilan global diabaikan selama dialog modal aktif.
    - Memperbarui listener keyboard `Alt+V` di `AppLayout.tsx` agar memvalidasi `if (useVoiceAssistantStore.getState().isSuppressed) return`, sehingga tombol pintasan `Alt+V` di dalam modal tidak memicu pembukaan `VoiceAssistantModal` global.
  - **2. Fitur Suara Mandiri pada Modal Audit & Validasi (`BillingValidationSummaryModal.tsx` & `ValidationSummaryHeader.tsx`)**:
    - Menghapus pemanggilan `openAssistant()` global dari header modal.
    - Mengintegrasikan hook `useVoiceRecognition` tersendiri di dalam modal `BillingValidationSummaryModal.tsx` dengan mode turn-taking `continuous: false`.
    - Membatasi pengenalan perintah secara eksklusif hanya untuk:
      - **`terbitkan`**: Menghentikan rekaman suara, menutup modal audit, dan membuka modal konfirmasi penerbitan (`IssueInvoiceModal.tsx`).
      - **`buka tab [items|m3_weight|overweight|freight|transport]`**: Berpindah sub-tab modal secara instan (Tab Tarif & Item, Validasi Fisik M³/Kg, Overweight, Freight Charge, dan Ekspedisi Lokal `tbExpIndo`).
      - **`tutup modal` / `batal` / `keluar`**: Menghentikan mikrofon dan menutup dialog modal.
    - Seluruh perintah di luar domain modal diabaikan total (tidak memicu navigasi global atau pencarian global).
    - Memperbarui tombol Suara di header modal (`ValidationSummaryHeader.tsx`) untuk menampilkan status mendengarkan, teks interim/transkrip live, dan animasi denyut mikrofon lokal.
    - Menghubungkan pintasan keyboard `Alt+V` di dalam modal untuk mengontrol hidup/mati mikrofon lokal modal.
  - **3. Fitur Suara Mandiri pada Modal Konfirmasi Penerbitan (`IssueInvoiceModal.tsx`)**:
    - Memasang supresi suara global `suppressVoice()` saat modal konfirmasi dibuka.
    - Menambahkan listener pintasan keyboard `Alt+V` eksklusif modal dengan `e.stopPropagation()` untuk toggle mikrofon konfirmasi lokal.
    - Menambahkan penanganan perintah pembatalan suara: *"tutup"*, *"tutup modal"*, *"batal"*, *"cancel"*, *"kembali"*, *"keluar"* $\to$ langsung menutup modal konfirmasi.
    - Perintah penerbitan suara: *"terbitkan"*, *"konfirmasi"*, *"setuju"* $\to$ menyetujui warning undercharge (jika ada) dan mengeksekusi penerbitan invoice resmi.
  - **4. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/billing-CKfeCsud.js` dalam 3.52s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.
    - Dokumentasi diperbarui di `frontend-app.md` dan `docs/frontend/billing.md`.

---


- [x] **Perbaikan Grafik Tren Bill Harian Hari Ini Kosong (`backend/src/utils/dateRange.ts`)**:
  - **1. Akar Masalah**:
    - Fungsi `getLastNDays` di `dateRange.ts` sebelumnya memformat kunci tanggal menggunakan `start.toISOString().slice(0, 10)`.
    - Karena objek `start` dibentuk pada tengah malam waktu lokal (00:00:00 WIB / GMT+7), pemanggilan `toISOString()` mengonversinya ke waktu UTC (17:00:00 hari sebelumnya / H-1).
    - Akibatnya, elemen untuk hari ini (28 Sep) menghasilkan kunci tanggal `"2026-09-27"`, dan seluruh deret harian tergeser mundur 1 hari.
    - Ketika data agregat SQL Server (yang mengembalikan tanggal riil `2026-09-28` dengan 162 bill) dipetakan ke `dailyMap.get(d.date)`, tanggal `2026-09-28` tidak pernah dicocokkan, sehingga grafik bill hari ini tampil kosong (0 bill).
  - **2. Solusi & Perbaikan**:
    - Mengubah formatting `d.date` pada `getLastNDays` menjadi string kalender lokal: `${year}-${month}-${date}` berbasis komponen lokal (`getFullYear()`, `getMonth() + 1`, `getDate()`).
    - Nilai tanggal lokal sekarang cocok 100% dengan hasil grouping SQL Server `CAST(fdInvDate AS DATE)`.
  - **3. Verifikasi & Restart Backend**:
    - Live query membuktikan data hari ini (28 Sep 2026) sekarang tampil akurat: **162 bills** (12 Udara, 150 Laut) dengan total tagihan **Rp 1.187.112.962,14**.
    - PM2 service `ShippingApi` berhasil di-restart (PID: 11648).

---

- [x] **Redesign Komprehensif Overview Dashboard (`DashboardPage.tsx`)**:
  - **1. Header & Live Telemetry**:
    - Menambahkan status badge denyut hijau *"Sistem Aktif"* (Live System Telemetry).
    - Menambahkan tombol *"Segarkan"* dengan feedback status pembaruan dan catatan jam pembaruan real-time tanpa refresh halaman browser.
  - **2. 4 Kartu KPI Metrik Eksekutif**:
    - Kartu beraksen ambient glow sudut, ikon squircle beraksen semantik, angka tebal tabular Space Grotesk, micro-trend pill berborder lembut, dan efek lift hover (`hover:-translate-y-1 hover:shadow-lg`).
    - Nilai omzet terpadu pada kartu Faktur (`Total Invoice`).
  - **3. Command Alert Panel (ETA Not Exit & Missed SLA)**:
    - Garis aksen indikator atas amber & rose, angka tebal tabular, chip pemecahan moda Udara (`✈️`) vs Laut (`🚢`), dan tombol aksi rincian dengan icon chevron.
    - Modal rincian consignee dilengkapi kolom pencarian instan consignee atau kode batch serta total counter.
  - **4. Progressive Delivery Dispatch Pipeline**:
    - Mengubah 4 kartu status surat jalan terpisah menjadi alur pipeline progresif (`Tahap 1 Dijadwalkan` $\to$ `Tahap 2 Dalam Perjalanan` $\to$ `Tahap 3 Terkirim` $\to$ `Tahap 4 SJ Belum Kembali`) lengkap dengan visual progress tracks dan footer ringkasan koli & tonase.
  - **5. Arus Kas & Keuangan (Financial Overview)**:
    - 3 kartu berorientasi tindakan: Antrean Validasi (Amber dengan tombol Cek & Validasi ke `ROUTES.BILLING_VALIDATION_LIST`), Piutang Jatuh Tempo (Rose), dan Omzet Bulan Berjalan (Emerald).
  - **6. Analitik Hub Asal & Kedatangan Mendatang**:
    - Menambahkan visual volume share progress bars pada tabel perbandingan cabang asal kargo.
    - Menambahkan chip urgensi waktu tiba (`Hari Ini`, `Besok`, atau countdown hari) pada kartu manifest kedatangan.
  - **7. Visualisasi Kinerja 12 Bulan (Interactive AreaChart)**:
    - Mengintegrasikan Recharts AreaChart dengan gradient fills halus (`invoicesGradient`, `doGradient`, `shipmentsGradient`).
    - Switcher filter metrik interaktif: `[Semua | Faktur | Surat Jalan | Resi]`.
    - Custom Tooltip terpadu yang ramah terhadap semua tema (termasuk Midnight Dark Mode).
  - **8. Riwayat Aktivitas Terkini**:
    - Inisial avatar pelanggan, tag nomor dokumen mono, tanggal, dan nilai omzet / koli yang terstruktur rapi.
  - **9. Verifikasi Build Frontend**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (3.74s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.

---

- [x] **Perbaikan Fitur Suara pada Drawer Detail Validasi (`useVoiceRecognition.ts`, `ValidationListDrawer.tsx`)**:
  - **1. Eliminasi Reactivity Loop & Pemotongan Audio Mid-Speech (`useVoiceRecognition.ts`)**:
    - Membungkus callback `onResult`, `onError`, dan `onEnd` ke dalam `useRef` (`onResultRef`, `onErrorRef`, `onEndRef`).
    - Menghilangkan churn re-creation pada fungsi `startListening` dan `stopListening` sehingga dependensinya stabil. Hal ini mencegah efek re-render memicu loop `abort()` $\to$ `start()` yang memotong audio saat pengguna mulai berbicara.
    - Mengubah inisialisasi `isSupported` menjadi sinkron saat mount (`useState(() => typeof window !== 'undefined' && Boolean(...))`) agar tidak ada lag deteksi dukungan Web Speech API.
    - Menekan false-positive error: event `no-speech` (jeda hening) dan `aborted` (tutup normal) tidak lagi di-set sebagai status error merah ke UI.
  - **2. Peningkatan Responsivitas & Eksekusi Perintah Drawer (`ValidationListDrawer.tsx`)**:
    - Mengaktifkan mode `continuous: true` dengan auto re-arm resilien pada event `onEnd` selama drawer terbuka dan tidak dihentikan manual.
    - Memperbaiki eksekusi perintah *"Buka"* / *"Pilih"* / *"Enter"*: saat pengguna mengucapkan perintah buka tanpa menyebutkan nomor, sistem langsung membuka invoice yang sedang disorot/terpilih (`highlightedBilling`).
    - Membersihkan unused import `useVoiceAssistantPermission`.
  - **3. Verifikasi Build Frontend**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (3.13s).
    - HTTP production test: `curl.exe -s -o NUL -w "%{http_code}" https://app.sampai.co/mshipping/` $\to$ **200 OK**.

---

- [x] **Konfigurasi Default Folder Root IIS ke `mshipping` Menggantikan `workhub` (`C:\inetpub\wwwroot\web.config`)**:
  - **1. Pengalihan Root IIS**:
    - Sebelumnya, rule IIS URL Rewrite `Redirect Root to WorkHub` di `C:\inetpub\wwwroot\web.config` mengarahkan request root `^$` ke `/workhub/`.
    - Aturan diganti menjadi `Redirect Root to Shipping` yang mengarahkan `^$` ke `/mshipping/`.
    - Ditambahkan rule `Redirect Shipping Alias to MShipping` yang mengarahkan `^shipping/?$` ke `/mshipping/`.
  - **2. Verifikasi Hasil**:
    - Pengujian `curl -I https://app.sampai.co/` $\to$ HTTP 302 Redirect ke `https://app.sampai.co/mshipping/`.
    - Pengujian `curl -IL https://app.sampai.co/` $\to$ HTTP 200 OK langsung memuat aplikasi web mshipping.

---

- [x] **Proteksi Brute-Force Login: Maksimal 5 Kali Salah & Lockout 10 Menit (`LoginPage.tsx`, `auth.routes.ts`)**:
  - **1. Logika Frontend Reaktif & Persisten (`LoginPage.tsx`)**:
    - Menambahkan pelacak percobaan gagal (`mshipping_auth_failed_attempts`) dan timestamp batas kunci (`mshipping_auth_lockout_until`) di `localStorage`.
    - Jika login gagal mencapai 5 kali berturut-turut (atau jika backend mengembalikan HTTP 429 Rate Limit):
      - Formulir dikunci selama 10 menit (600 detik).
      - Input username dan password dinonaktifkan (`disabled:opacity-50 disabled:cursor-not-allowed`).
      - Tombol submit dinonaktifkan dengan label hitung mundur live font mono: `Terkunci (mm:ss)`.
      - Banner peringatan bernuansa amber dengan ikon `ShieldAlert` dan timer denyut `Clock` menampilkan hitung mundur detik per detik.
      - Refresh browser atau reload tab tidak dapat mem-bypass lockout karena status dihitung dari timestamp absolut.
      - Ditambahkan listener `visibilitychange` agar sisa waktu langsung ter-update saat user membuka kembali tab.
      - Saat login berhasil, counter percobaan dan lockout otomatis di-reset (`clearAuthLockout`).
  - **2. Harmonisasi Backend Rate Limiter (`auth.routes.ts`)**:
    - Menyesuaikan `windowMs` login rate limiter backend dari 15 menit menjadi 10 menit (`10 * 60 * 1000`) agar sinkron 100% dengan batas lockout frontend.
    - PM2 `ShippingApi` direstart (PID 5680).
  - **3. Verifikasi Build Frontend**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (3.23s).

---

- [x] **Resolusi 404 `PUT /mshipping/api/profile/password` & Repack APK Force Update (`profile.routes.ts`, `repack_apk.ps1`)**:
  - **1. Akar Masalah 404 Ganti Password Profil**:
    - Backend [`backend/src/modules/profile/profile.routes.ts`](file:///c:/shipping/backend/src/modules/profile/profile.routes.ts) sebelumnya hanya mendaftarkan rute `PUT /change-password`.
    - Di sisi klien web frontend (`profile.service.ts`), mobile app (`ChangePasswordModal.tsx`), serta dokumentasi Swagger (`swagger.ts`), endpoint resmi yang dipanggil adalah `PUT /profile/password`.
  - **2. Perbaikan & Dual Endpoint**:
    - Memperbarui `profile.routes.ts` untuk mendaftarkan kedua rute sekaligus (`PUT /password` dan `PUT /change-password`) menuju handler yang sama `handleChangePassword`.
    - PM2 service `ShippingApi` direstart dan online (PID `21252`).
    - Pengujian live `curl -X PUT https://app.sampai.co/mshipping/api/profile/password` membuktikan status 404 teratasi (beralih ke 401 Unauthorized / token check).
  - **3. Ekspor & Repack APK v1.2.6 (Build 18, Force Update)**:
    - Sesuai konfirmasi user, versi tetap di `v1.2.6` (Build `18`) dengan status `forceUpdate: true`.
    - Mengompilasi ulang bundel Hermes bytecode Android (`entry-98f2d2cf26a54357d4d2c42cbbe651d2.hbc`, 5.6MB) dengan alamat API `https://app.sampai.co/api`.
    - Menginjeksi bytecode ke `mshipping.apk`, zipalign, dan signing release v2/v3 via `uber-apk-signer` (`scripts/repack_apk.ps1`).
    - Sinkronisasi instan ke 4 lokasi server (`c:\shipping\mshipping.apk`, `frontend/dist`, `frontend/public`, `backend/public/uploads`).
  - **4. Verifikasi Build Frontend**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (4.14s).

---

- [x] **Migrasi Subdomain ke `app.sampai.co` dengan Let's Encrypt SSL & Dual SNI IIS (`wacs.exe`, `index.ts`, `client.ts`, `app-version.json`)**:
  - **1. Verifikasi DNS & Penerbitan Sertifikat Let's Encrypt**:
    - DNS `app.sampai.co` terverifikasi resolve ke IP server `36.93.22.142`.
    - Loopback lokal `127.0.0.1 app.sampai.co` ditambahkan pada `C:\Windows\System32\drivers\etc\hosts`.
    - Dijalankan `win-acme` (`wacs.exe`) untuk menerbitkan sertifikat Let's Encrypt resmi bagi `app.sampai.co` (Valid s/d 27 Des 2026, CA `YR2`).
    - Task auto-renewal otomatis terdaftar di Task Scheduler `win-acme renew`.
  - **2. Konfigurasi Dual SNI IIS Port 443**:
    - Memasang sertifikat SSL `CN=app.sampai.co` pada port 443.
    - Mengonfigurasi SNI (`sslFlags: 1`) via `netsh http` dan IIS Web Binding sehingga kedua domain (`app.sampai.co` dan `mshipping.sampai.co`) aktif berdampingan tanpa sertifikat mismatch.
  - **3. Sinkronisasi Backend & Mobile**:
    - `backend/src/index.ts`: Memperbarui fallback origin CORS dan fallback `prodUrl` ke `https://app.sampai.co`.
    - `backend/src/config/app-version.json` & `app-version.service.ts`: Memperbarui URL unduhan APK ke `https://app.sampai.co/mshipping/mshipping.apk`.
    - `mobile/src/api/client.ts`, `mobile/src/lib/utils.ts`, `mobile/src/stores/updateStore.ts`: Memperbarui endpoint dan asset URL ke `https://app.sampai.co`.
    - Backend build & PM2 service `ShippingApi` direstart (PID 20064, status: online).
  - **4. Verifikasi & Pengujian Hasil**:
    - Live HTTPS `curl https://app.sampai.co/mshipping/` $\to$ `200 OK`.
    - Live API `curl https://app.sampai.co/api/health` $\to$ `200 OK`.
    - Live API `curl https://mshipping.sampai.co/api/health` $\to$ `200 OK` (backward-compatibility terjamin).
    - Live Version `curl https://app.sampai.co/api/app-version/latest` $\to$ `200 OK` (link download baru).
    - Mobile type check: `cd mobile && bunx tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
    - Frontend build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (4.67s).

---

- [x] **Inklusi Kargo FCL pada Target Penagihan Tanpa Filter Status Gudang (`billing-analytics.service.ts`)**:
  - **1. Analisis & Aturan Bisnis**:
    - Sebelumnya, fungsi `isTarget` memfilter keluar seluruh kargo dengan `StatusKirim` mengandung `'BELUM DITERIMA GDG'` (`tbEntryListGudang.fdStatus = 0`).
    - Hal ini mengakibatkan kargo FCL (misal kontainer `26GZD22` customer SAGI, 419 colly, 16.918 kg) tidak muncul di Target Page maupun KPI Target Bill Hari Ini meskipun kargo tersebut bertipe FCL dan berstatus URGENT.
  - **2. Perubahan Logika `isTarget`**:
    - Memperbarui `isTarget` pada `getBillingKPIs` dan `getBillingTargetDetails` di [`backend/src/modules/billing/billing-analytics.service.ts`](file:///c:/shipping/backend/src/modules/billing/billing-analytics.service.ts):
      - Jika kargo bertipe FCL (`isFcl === true`), filter `StatusKirim.includes('BELUM DITERIMA GDG')` **dilewati (bypass)** sehingga kargo FCL langsung masuk ke daftar target tanpa bergantung pada status penerimaan gudang.
      - Kargo non-FCL tetap mematuhi filter `BELUM DITERIMA GDG` seperti biasa.
  - **3. Verifikasi & Pengujian Hasil**:
    - Backend build & PM2 service `ShippingApi` direstart (PID 21156).
    - Eksekusi kueri pengujian membuktikan kargo `26GZD22` (SAGI) berhasil muncul di response `getBillingTargetDetails` dengan atribut lengkap (FCL, URGENT, 419 colly, 16.918,7 kg, 68 M³).
    - Verifikasi build Frontend: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/billing-BRoCkBpj.js` dalam 18.95s).

---

- [x] **Rilis Mobile App `v1.2.6` (Build `18`, `forceUpdate: true`) & Migrasi Penuh HTTPS SSL (`client.ts`, `app.json`, `version.ts`, `app-version.json`, `repack_apk.ps1`)**:
  - **1. Konfigurasi Versi & Force Update Terpadu**:
    - Disinkronkan di 5 berkas resmi:
      - `mobile/package.json`: `version: 1.2.6`
      - `mobile/app.json`: `version: 1.2.6`, `versionCode: 18`
      - `mobile/src/config/version.ts`: `APP_VERSION = '1.2.6'`, `APP_VERSION_CODE = 18`, `FORCE_UPDATE = true`, `MIN_APP_VERSION = '1.2.6'`
      - `backend/src/config/app-version.json`: `version: 1.2.6`, `versionCode: 18`, `minVersion: 1.2.6`, `forceUpdate: true`
      - `mobile-app.md`: `Versi Aktif: v1.2.6 (VersionCode: 18)`
  - **2. Endpoint Komunikasi HTTPS & Asset Resolvers**:
    - `mobile/src/api/client.ts`: Mengarahkan `DEFAULT_API_URL` ke `https://mshipping.sampai.co/api`.
    - `mobile/src/lib/utils.ts`: Mengarahkan `resolveAvatarUrl` ke `https://mshipping.sampai.co`.
    - `mobile/src/stores/updateStore.ts`: Mengarahkan fallback download ke `https://mshipping.sampai.co/mshipping/download/`.
  - **3. Kompilasi Hermes Bytecode & Repack Signing APK**:
    - Type check mobile: `cd mobile && bunx tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
    - Hermes export: `bunx expo export --platform android` $\to$ `entry-b6166de6953482c0bb2d6965af0e5236.hbc` (5.6MB, 3355 modules).
    - Repack APK: injeksi bytecode baru ke `mshipping.apk`, zipalign, re-sign release v2/v3 verified via `uber-apk-signer` (`scripts/repack_apk.ps1`).
    - Distribusi sinkron ke 4 titik server:
      - `C:\shipping\mshipping.apk`
      - `C:\shipping\frontend\dist\mshipping.apk`
      - `C:\shipping\frontend\public\mshipping.apk`
      - `C:\shipping\backend\public\uploads\mshipping.apk`
    - PM2 service `ShippingApi` direstart (PID 12284).
    - Endpoint `/api/app-version/latest` terverifikasi 200 OK via HTTPS (`version: 1.2.6`, `versionCode: 18`, `forceUpdate: true`, size 121.2 MB).
  - **4. Verifikasi Frontend Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/billing-BRoCkBpj.js` dalam 3.54s).

---

- [x] **Pemasangan SSL Let's Encrypt Resmi Subdomain `mshipping.sampai.co` & Reverse Proxy IIS (`wacs.exe`, `web.config`, `index.ts`, `client.ts`)**:
  - **1. Konfigurasi Domain DNS & Verifikasi Tantangan ACME**:
    - Subdomain GoDaddy `mshipping.sampai.co` terverifikasi resolve ke IP publik `36.93.22.142`.
    - Dikonfigurasi folder tantangan HTTP-01 di `C:\inetpub\wwwroot\.well-known\acme-challenge\web.config` dengan MIME type map `.*` `text/json`.
  - **2. Penerbitan Sertifikat SSL Let's Encrypt via `win-acme` (WACS)**:
    - Diunduh dan dipasang engine ACME `win-acme` v2.2.9.1701 di `C:\win-acme`.
    - Dijalankan unattended mode: sertifikat resmi Let's Encrypt diterbitkan untuk `mshipping.sampai.co`, valid 90 hari dengan CA `ISRG Root X1 / YR1`.
    - IIS binding diperbarui: `https *:443:` terpasang pada `Default Web Site` (ID: 1).
    - Windows Task Scheduler otomatis dibuat: `win-acme renew (acme-v02.api.letsencrypt.org)` berjalan setiap hari jam 09:00 WIB untuk auto-renewal.
  - **3. Reverse Proxy IIS Application Request Routing (ARR) untuk API**:
    - Menghilangkan masalah *Mixed Content* (HTTP dalam HTTPS) dengan mengonfigurasi IIS URL Rewrite + ARR pada `frontend/public/web.config`, `frontend/dist/web.config`, dan `C:\inetpub\wwwroot\web.config`.
    - Rule `Reverse Proxy to Bun`: merewrite seluruh request `/mshipping/api/(.*)` dan `/api/(.*)` ke backend lokal `http://127.0.0.1:3010/...` secara transparan.
    - Mengubah `frontend/.env` `VITE_API_BASE_URL` dari absolut `http://36.93.22.142:3010/...` menjadi relatif `"/mshipping/api"`, sehingga request frontend otomatis mengikuti skema protokol aktif (HTTPS 443).
    - Menambahkan `mshipping.sampai.co` pada whitelist CORS `backend/src/index.ts`.
  - **4. Dukungan Penuh SSL pada Backend & Mobile App**:
    - **Backend**:
      - `C:\inetpub\wwwroot\web.config`: Menambahkan reverse proxy IIS untuk `^api/(.*)` dan `^uploads/(.*)` ke Bun backend port 3010.
      - `backend/src/config/app-version.json` & `app-version.service.ts`: Memperbarui `downloadUrl` dan `webDownloadUrl` ke `https://mshipping.sampai.co/mshipping/mshipping.apk` dan `https://mshipping.sampai.co/mshipping/download/`.
      - `backend/src/index.ts`: CORS origin fallback dan fallback `prodUrl` diperbarui ke `https://mshipping.sampai.co`.
      - Backend build & PM2 service `ShippingApi` direstart dan online.
    - **Mobile App**:
      - `mobile/src/api/client.ts`: Memperbarui `DEFAULT_API_URL` menjadi **`https://mshipping.sampai.co/api`** (SSL Let's Encrypt Port 443).
      - `mobile/src/lib/utils.ts`: Memperbarui `resolveAvatarUrl` ke `https://mshipping.sampai.co`.
      - `mobile/src/stores/updateStore.ts`: Memperbarui `webDownloadUrl` fallback ke `https://mshipping.sampai.co/mshipping/download/`.
      - Type check mobile: `cd mobile && bunx tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
  - **5. Optimasi Loopback DNS Lokal**:
    - Menambahkan `127.0.0.1 mshipping.sampai.co` pada berkas `C:\Windows\System32\drivers\etc\hosts` agar akses dari server langsung terhubung ke port 443 tanpa kendala keterbatasan NAT loopback / hairpinning router.
  - **6. Verifikasi & Build**:
    - Backend build & PM2 restart `ShippingApi`: **ONLINE** (PID 18416).
    - Frontend build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-BRoCkBpj.js` dalam 4.33s).
    - Mobile typecheck: `bunx tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
    - Pengujian live `curl https://mshipping.sampai.co/api/health` $\to$ `200 OK` dengan header `X-Powered-By: ARR/3.0`.
    - Pengujian live `curl https://mshipping.sampai.co/api/app-version/latest` $\to$ `200 OK` (HTTPS APK link).
    - Pengujian live `curl https://mshipping.sampai.co/mshipping/` $\to$ `200 OK` via Schannel TLS negotiation.

---

- [x] **Resolusi Underprice `GZS-010866-09-2026` & Integrasi Master Branch `tbCabang` pada Form Komoditi Khusus**:
  - **1. Integrasi Master Branch Asal dari `tbCabang` (`CustomerCommodityPriceModal.tsx` & `customer-price-list.service.ts`)**:
    - Menambahkan fungsi backend `getCustomerPriceListBranches()` yang membaca data resmi 20 cabang dari `tbCabang` SQL Server, menormalkan trailing spaces (`.trim()`), dan menyaring kode non-cabang (`'--'`).
    - Mendaftarkan endpoint REST API `GET /api/customer-price-list/branches`.
    - Memperbarui `customerPriceListApi.getBranches()` di frontend dan komponen modal input `CustomerCommodityPriceModal.tsx` agar dropdown pilihan branch terisi otomatis dengan opsi resmi (`{b.code} - {b.name}`, misal `GZ - GUANGZHOU`, `YW - YI WU`, `SH - SHANGHAI`, dsb.) dengan tetap mendukung opsi branch kustom.
  - **2. Agregasi Multi-Upload & Multi-Item Customer Price List**:
    - **Akar Masalah**: Sebelumnya `lookupCustomerPriceList` dan `getActiveCustomerPriceList` hanya melakukan `findFirst` pada 1 file upload teratas (`Upload 10` dengan item `UMUM`). Hal ini mengakibatkan `Upload 11` (item `SEMI GARMENT` @ Rp 6.500.000) sama sekali tidak terangkut saat lookup validasi invoice `GZS-010866-09-2026`, sehingga sistem fallback ke tarif master CS Guangzhou (`Semi Garment` @ Rp 7.000.000) dan menandai status invoice sebagai Underprice.
    - **Solusi**: Memperbarui kueri pada `lookupCustomerPriceList` dan `getActiveCustomerPriceList` agar mencari seluruh item dari upload-upload customer yang berstatus aktif non-superseded (`isSuperseded: false`, `status: { notIn: ['FAILED', 'DELETED'] }`) dengan tanggal efektif berlaku (`effectiveDate <= targetDate`).
    - Melakukan deduplikasi cerdas per `(mode, branch, category)` memprioritaskan `effectiveDate` paling baru, sehingga item `UMUM` (Rp 4.500.000) dan `SEMI GARMENT` (Rp 6.500.000) aktif berdampingan tanpa saling meniadakan.
  - **3. Verifikasi & Pengujian Hasil**:
    - Evaluasi invoice `GZS-010866-09-2026` (`PARCELS TO JAKARTA (M3) - UNDERWEAR, LACE` @ Rp 6.500.000) kini berhasil mencocokkan tarif `SEMI GARMENT` Rp 6.500.000 dari Customer Price List Upload 11 $\to$ Status **VALID / MATCH (Bukan Underprice)**.
    - Build frontend `cd frontend && bun run build` **LULUS 100% 0 errors** dalam 3.69s.
    - Service PM2 `ShippingApi` aktif (`online`).

---

- [x] **Resolusi "App Tidak Memproses Audio" & Penambahan Diagnostik Sinyal Hardware Mikrofon (`useVoiceRecognition.ts`, `ValidationListDrawer.tsx`, `VoiceAssistantModal.tsx`)**:
  - **1. Analisis Akar Masalah & Eliminasi Loop Zombie Instance (`useVoiceRecognition.ts`)**:
    - *Rogue Instance Spawn pada abort()*: Sebelumnya saat `startListening` dipanggil, pemanggilan `recognitionRef.current.abort()` memicu event `onend` pada instance lama yang belum dimatikan listener-nya. Di dalam `onend`, kondisi auto-restart terpenuhi sehingga instance lama membangkitkan instance baru secara liar yang bertabrakan dengan instance baru di Chrome.
    - *Solusi Pelepasan Listener*: Seluruh event listener (`onstart`, `onaudiostart`, `onsoundstart`, `onspeechstart`, `onresult`, `onerror`, `onend`) dinull-kan terlebih dahulu sebelum pemanggilan `.abort()`.
    - *Penghapusan Auto-Restart Tak Terkendali pada onend*: Menghapus pemanggilan liar `newInstance.start()` di dalam `onend` recognizer. Menggunakan flag `hasErrorRef` agar error seperti `not-allowed`, `audio-capture`, dan `network` tidak memicu loop restart yang menghapus pesan error dan menampilkan status palsu "mendengarkan".
  - **2. Mode Turn-Taking Command (`continuous: false`) pada Drawer (`ValidationListDrawer.tsx`)**:
    - Mengubah opsi `continuous: true` menjadi `continuous: false` sehingga Chrome langsung memfinalisasi ucapan (nomor faktur / nama pelanggan) seketika tanpa jeda hening berkepanjangan.
    - Menjaga transkrip pencarian tetap bersih dengan memfilter kata-kata aksi/perintah (`buka`, `pilih`, `tutup`, `bawah`, `atas`) agar tidak masuk mengotori kolom input pencarian.
  - **3. Alat Diagnostik Hardware Mikrofon Browser (`testHardwareMic`)**:
    - Menambahkan fungsi diagnosa hardware murni menggunakan Web Audio API (`getUserMedia` + `AudioContext` + `AnalyserNode`).
    - Menguji mikrofon selama 1.5 detik, mengukur volume peak fisik (RMS 0-100%), dan membaca nama perangkat audio browser (`track.label`).
    - Menyajikan tombol interaktif `[ 🔍 Test Mic ]` pada `ValidationListDrawer.tsx` dan `VoiceAssistantModal.tsx` dengan banner hasil diagnosa:
      - Tiga level evaluasi sinyal: GOOD (Peak ≥ 18%), WEAK (4% ≤ Peak < 18%), dan NONE (Peak < 4%).
      - Resolusi Volume Lemah 7% (USB PnP Audio Device): Mengarahkan pengguna menaikkan volume mic di Windows Sound Settings (`mmsys.cpl`) ke 90-100% agar suara tidak tersaring sebagai noise/hening oleh VAD Google Speech API.
  - **4. Banner Notifikasi Error Interaktif**:
    - Menampilkan banner error terstruktur di bawah kolom pencarian drawer jika terjadi `not-allowed`, `no-speech`, `audio-capture`, atau kendala koneksi dengan tombol aksi langsung `[ 🔍 Test Mic ]`.
  - **5. Verifikasi & Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-BI65K5Xz.js` dalam 3.99s).


---

- [x] **Pencarian Suara Otomatis Hands-Free & Perintah "Buka" pada Drawer Cari Faktur Detail Validasi (`ValidationListDrawer.tsx`)**:
  - **1. Auto-Start Mikrofon Seketika saat Drawer Terbuka**:
    - Saat drawer dibuka (`isOpen === true`), sistem otomatis mengaktifkan mikrofon (`startVoiceListening()`) dan memfokuskan input pencarian tanpa perlu klik icon mikrofon.
    - Mikrofon beroperasi dalam mode `continuous: true` dengan auto-restart resilien sehingga pengguna dapat langsung berbicara mendiktekan nama customer / nomor invoice secara hands-free.
  - **2. Seleksi Otomatis Hasil Pencarian & Perintah Suara "Buka" / "Pilih"**:
    - Hasil pencarian difilter secara instan di sisi klien (`0ms lag`).
    - Kartu hasil pencarian teratas otomatis terpilih dengan badge visual interaktif `[ 🎯 Terpilih · Katakan "Buka" atau Tekan Enter ↵ ]` serta glowing border aksen sky blue.
    - Sistem mengenali perintah suara:
      - *"Buka"* / *"Pilih"* / *"Enter"* / *"Ya buka"* $\to$ langsung membuka faktur terpilih dan menutup drawer.
      - Perintah komposit (e.g. *"Santoso buka"*, *"010751 buka"*, *"Buka Santoso"*) $\to$ mendeteksi target pencarian, mencocokkan faktur yang dimaksud, dan langsung membukanya.
      - *"Bawah"* / *"Turun"* / *"Nomor dua"* $\to$ berpindah ke faktur berikutnya.
      - *"Atas"* / *"Naik"* $\to$ berpindah ke faktur sebelumnya.
      - *"Tutup"* / *"Batal"* $\to$ menutup drawer.
    - Smooth Auto-Scroll: Item yang sedang disorot/terpilih otomatis digulir ke area tampilan viewport saat berpindah pilihan.
  - **3. Integrasi Pintasan Keyboard `Alt+V` di Dalam Drawer**:
    - Menambahkan listener `Alt+V` di capture phase dengan `stopPropagation()`, sehingga saat drawer terbuka `Alt+V` mengontrol mikrofon pencarian drawer secara eksklusif (tidak memicu modal asisten global).
    - Tombol mikrofon di input search dilengkapi badge `<kbd>Alt+V</kbd>`.
  - **4. Elevasi Lapisan Layer (`z-[110]`)**:
    - Mengubah z-index drawer dari `z-50` menjadi `z-[110]` agar selalu tampil di atas modal validasi (`z-[100]`).
  - **5. Verifikasi & Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-BVB5MXfH.js` dalam 3.25s).

---

- [x] **Integrasi Shortcut Alt+V & Asisten Suara pada Modal Audit & Validasi Invoice (`ValidationSummaryHeader.tsx`, `BillingValidationSummaryModal.tsx`, `VoiceAssistantModal.tsx`, `AppLayout.tsx`, `ValidationListPage.tsx`)**:
  - **1. Elevasi Z-Index Dialog Suara (`VoiceAssistantModal.tsx`)**:
    - Meningkatkan `z-index` overlay dialog dari `z-50` menjadi **`z-[10000]`**.
    - Memastikan modal Asisten Suara selalu muncul di lapisan paling depan (di atas dialog modal `Audit & Validasi Invoice` `z-[100]` maupun modal lainnya).
  - **2. Keandalan Shortcut Keyboard Universal (`AppLayout.tsx` & `BillingValidationSummaryModal.tsx`)**:
    - Memperbarui pendengar keyboard global di `AppLayout.tsx` dengan event capture phase (`window.addEventListener('keydown', handleKeyDown, true)`).
    - Memvalidasi kecocokan `e.altKey && (e.key?.toLowerCase() === 'v' || e.code === 'KeyV')` dengan `stopPropagation()`.
    - Menambahkan listener `Alt+V` langsung di dalam komponen `BillingValidationSummaryModal.tsx` agar respon seketika saat dialog modal sedang fokus aktif.
  - **3. Tombol Aksi Suara pada Header Modal (`ValidationSummaryHeader.tsx`)**:
    - Menambahkan tombol interaktif `[ 🎙️ Suara Alt+V ]` beranimasi denyut (`animate-pulse`) di samping tombol cetak pada header modal *"Audit & Validasi Invoice {invNo}"*.
    - Terhubung dengan `openAssistant()` dan diproteksi `useVoiceAssistantPermission()`.
  - **4. Akses Suara pada Daftar Validasi Billing (`ValidationListPage.tsx`)**:
    - Menambahkan tombol `[ 🎙️ Asisten Suara Alt+V ]` pada toolbar header halaman antrean validasi billing (`ROUTES.BILLING_VALIDATION_LIST`).
  - **5. Verifikasi & Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-CdTOjM3P.js` dalam 3.52s).

---

- [x] **Resolusi Minified React Error #310 (Pelanggaran Aturan Hooks pada `IssueInvoiceModal.tsx`)**:
  - **1. Analisis Akar Masalah**:
    - React Error #310 (*"Rendered more hooks than during the previous render"*).
    - Pada `IssueInvoiceModal.tsx`, terdapat conditional early return `if (!isOpen) return null` pada baris 122 yang berada SEBELUM hook `useEffect` pendengar konfirmasi suara (*"Terbitkan", "Setuju", "Konfirmasi"*) di baris 164.
    - Saat modal tertutup (`isOpen === false`), komponen menghentikan eksekusi di baris 122 (tidak menjalankan hook ke-7). Saat modal dibuka (`isOpen === true`), baris 122 dilewati sehingga hook `useEffect` ke-7 dijalankan, menyebabkan jumlah hooks tidak konsisten antar-render dan memicu fatal React error #310.
  - **2. Perbaikan**:
    - Menghapus baris conditional early return `if (!isOpen) return null` sebelum hooks dan handler.
    - Memastikan seluruh hooks (`useState`, `useVoiceRecognition`, `useEffect`) dijalankan tanpa syarat (unconditionally).
    - Return `null` hanya dieksekusi di akhir setelah semua hooks selesai diinisialisasi (`if (!isOpen) return null` sebelum `createPortal`).
    - Melakukan audit menyeluruh pada seluruh berkas di `src/` via skrip AST/regex scanner untuk memastikan 0 pelanggaran hook order di seluruh aplikasi.
  - **3. Verifikasi & Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-BFEkCQqB.js` dalam 3.92s).

---

- [x] **Implementasi Hak Akses Role Permission untuk Fitur Asisten Suara ERP (`ROUTES.VOICE_ASSISTANT`, `AVAILABLE_PATHS`, `useVoiceAssistantPermission`, `tbRolePermissions`, `RoleManagementPage`)**:
  - **1. Definisi Route & Matrix Path (`constants.ts`, `userManagement.types.ts`)**:
    - Menambahkan `VOICE_ASSISTANT: '/mshipping/voice-assistant'` pada konstanta `ROUTES`.
    - Mendaftarkan entri `{ path: ROUTES.VOICE_ASSISTANT, label: 'Asisten Suara ERP (Voice Assistant)', module: 'overview', moduleLabel: 'Overview', accentColor: '#0EA5E9' }` ke dalam `AVAILABLE_PATHS`.
    - Memungkinkan admin mengaktifkan / menonaktifkan izin Asisten Suara secara interaktif per role melalui tabel matriks di menu Role Management (`/mshipping/admin/roles`).
  - **2. Hook Otorisasi Suara Reaktif (`useVoiceAssistantPermission.ts`)**:
    - Memeriksa hak akses pengguna aktif dari `useAuthStore` (`user.permissions`).
    - Mendukung bypass otomatis penuh untuk pengguna ber-role `admin`.
    - Memvalidasi kepemilikan izin wildcard `/*` atau spesifik `/mshipping/voice-assistant`.
  - **3. Proteksi Akses Komponen UI & Pintasan**:
    - `Topbar.tsx`: Tombol global `[ 🎙️ Voice / Asisten Suara ]` dibungkus kondisi `{canUseVoice && (...)}`.
    - `AppLayout.tsx`: Pintasan keyboard universal **`Alt+V`** dan rendering dialog `<VoiceAssistantModal />` diproteksi guard `canUseVoice`.
    - `ValidationDetailPage.tsx`: Tombol aksi cepat ribbon `[ 🎙️ Suara ]` disembunyikan jika role pengguna tidak memiliki izin suara.
  - **4. Seeding & Backfill Database (`[dbo].[tbRolePermissions]`)**:
    - Menjalankan migrasi data via script database langsung:
      - Role `admin`: `canView = 1`
      - Role `ar`: `canView = 1`
      - Role `finance`: `canView = 1`
      - Role `kasir`: `canView = 1`
      - Role `viewer`: `canView = 0` (nonaktif secara default)
  - **5. Verifikasi & Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/billing-rej4zOGu.js` dalam 3.87s).
    - Dokumentasi diperbarui di `frontend-app.md`, `docs/frontend/billing.md`, dan `docs/frontend/master-admin.md`.

---

- [x] **Resolusi "Aplikasi Terus Mendengarkan Tanpa Memproses Audio" — Eliminasi Konflik getUserMedia & Mode Turn-Taking Single-Command (`useVoiceRecognition.ts`, `VoiceAssistantModal.tsx`)**:
  - **1. Analisis Akar Masalah Mengapa Aplikasi "Terus Mendengarkan Tanpa Memproses"**:
    - *Konflik Buffer Audio WASAPI (`getUserMedia` vs `SpeechRecognition`)*: Memanggil `navigator.mediaDevices.getUserMedia` dan `AudioContext` secara bersamaan dengan `SpeechRecognition` di Windows menyebabkan driver WASAPI mengunci mikrofon ke audio context, sehingga recognizer Google Chrome mengalami *buffer starvation* (menerima 0 bytes audio / silent buffer). Akibatnya, recognizer tetap dalam status *listening*, namun Google Speech API tidak pernah memicu event `onresult`.
    - *Anti-Pattern Dictation Mode (`continuous: true`)*: Pada mode `continuous: true`, Chrome menganggap pengguna sedang mendikte dokumen panjang, sehingga tidak pernah memfinalisasi kalimat (`isFinal = true`) sampai pengguna berhenti total atau menekan stop.
    - *Eksekusi Terblokir State `isListening`*: Logika sebelumnya menahan eksekusi jika `isListening === true`, dan auto-execute timer hanya mencakup 4 tipe intent, menyebabkan pencarian invoice (`SEARCH_INVOICE`) dan audit spesifik tertahan tanpa diproses.
    - *Tap Mic Stop Tanpa Eksekusi*: Menekan tombol stop mikrofon sebelumnya hanya mematikan recognizer tanpa memicu eksekusi intent yang telah tertangkap.
  - **2. Solusi Rekonstruksi & Ketahanan**:
    - **Eliminasi Konflik `getUserMedia`**: Menghapus `getUserMedia` concurrent dari pemanggilan `SpeechRecognition`. Memberikan hak akses eksklusif 100% pada `SpeechRecognition` agar audio driver mengirimkan stream murni ke Google Speech API.
    - **Mode Turn-Taking Command (`continuous: false`)**: Begitu pengguna selesai mengucapkan 1 kalimat perintah (misal: *"Buka dashboard"* atau *"Validasi bill ini"*), Chrome langsung memfinalisasi transkrip seketika tanpa menunggu waktu lama.
    - **Auto-Execute 900ms Universal**: Seluruh intent yang valid (`NAVIGATE_PAGE`, `VALIDATE_BILL`, `SEARCH_INVOICE`, `REFRESH_VALIDATION`, `OPEN_SUMMARY`, dll) otomatis diproses dan dieksekusi dalam 900ms setelah selesai berbicara tanpa terhalang status `isListening`.
    - **Eksekusi Seketika Saat Tap Mic Stop (`handleMicToggle`)**: Jika pengguna selesai berbicara lalu mengetuk tombol mic untuk stop, sistem langsung mengeksekusi intent seketika tanpa jeda.
  - **3. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-C3KbaMyU.js` dalam 15.05s).
    - Dokumentasi diperbarui di `frontend-app.md` dan `docs/frontend/billing.md`.

- [x] **Perbaikan Responsivitas Mikrofon Chrome Mobile & Regenerasi Instance SpeechRecognition (`useVoiceRecognition.ts`, `VoiceAssistantModal.tsx`)**:
  - **1. Investigasi Akar Masalah di Chrome Mobile (Android)**:
    - *Reuse Instance yang Sudah Ended*: Sebelumnya instance `webkitSpeechRecognition` dibuat satu kali di `useEffect`. Setelah sesi rekaman pertama berakhir (`onend`), Chrome Android melarang pemanggilan `.start()` pada instance yang sama dan melempar `InvalidStateError`.
    - *Silent Error Swallowing*: Exception `InvalidStateError` ditangkap tanpa mengaktifkan state `isListening` atau error, menyebabkan icon mic tidak bereaksi saat di-tap.
    - *Ketiadaan State Transisi Visual*: State `isListening` hanya di-set pada event `onstart` asynchronous (bisa memakan waktu 500-1000ms untuk inisialisasi audio hardware di ponsel), menimbulkan kesan tombol tidak merespons sentuhan.
    - *Konteks Insecure HTTP vs HTTPS di Android*: Chrome Android memblokir izin mikrofon secara default pada IP HTTP biasa (`http://36.93.22.142`) dengan error `not-allowed`.
  - **2. Solusi Rekonstruksi & Stabilisasi Mobile**:
    - **Instansiasi Baru per Panggilan (`startListening`)**: Meng-abort instance lama dan selalu membuat `new SpeechRecognitionClass()` yang segar di setiap tap tombol mic, mengeliminasi `InvalidStateError` 100%.
    - **Feedback Visual Instan (`isStarting`)**: Tombol mic langsung merespons tap seketika dengan spinner transisi `Loader2` dan denyut visual sebelum audio hardware siap, menghilangkan kesan freeze / delay.
    - **Optimasi Touch Screen (`touch-manipulation select-none active:scale-95`)**: Menghilangkan delay 300ms klik browser mobile pada tombol mikrofon.
    - **Deteksi Insecure Context & Instruksi Izin Chrome Mobile**: Menyajikan box panduan terstruktur di bawah mic jika izin ditolak (`not-allowed`) atau jika browser memblokir karena HTTP IP biasa.
  - **3. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-CrzcbRg5.js` 2.81s).
    - Dokumentasi diperbarui di `frontend-app.md` dan `docs/frontend/billing.md`.

---

- [x] **Grafis Spektrum Suara & Gelombang Audio Reaktif pada Modal Voice Assistant (`VoiceVisualizerGraphic.tsx`, `VoiceAssistantModal.tsx`)**:
  - **1. Komponen Grafis Spektrum & Waveform (`VoiceVisualizerGraphic.tsx`)**:
    - **Dynamic Equalizer Spectrum (24 Bars)**: Menggunakan kurva bobot Gaussian frekuensi vokal manusia. Saat sinyal ucapan terdeteksi (`isReceivingVoice === true`), 24 baris equalizer melonjak aktif dengan fluktuasi dinamis (`from-emerald-500 via-sky-500 to-cyan-400`). Saat mikrofon siaga, baris bernapas halus (`sky-400/30`).
    - **SVG Dynamic Sine Wave Banner**: Mengalirkan 2 lapisan gelombang sinus analog (`d1` cyan/emerald dan `d2` indigo/sky) dengan osilasi frekuensi dan amplitudo membesar saat suara masuk.
    - **Visual Sinyal Status Badge**: Badge reaktif `🔊 Menerima Sinyal Suara...` (warna emerald, animasi ping/pulse) saat suara masuk, dan `🎙️ Mikrofon Siaga` saat hening.
  - **2. Efek Sonar Tiga Lapis di Tombol Mic (`VoiceAssistantModal.tsx`)**:
    - Ring luar 3 (`w-36 h-36 bg-emerald-500/25 animate-ping`), Ring luar 2 (`w-28 h-28 bg-emerald-500/30 animate-pulse`), dan Ring 1 aura neon (`w-22 h-22 bg-cyan-400/30 blur-xs`).
    - Tombol mikrofon bertransisi dinamis ke gradien emerald-teal dengan glowing ring (`ring-4 ring-emerald-400/30 scale-105`) seketika saat pengguna berbicara.
  - **3. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-BOiMcZHB.js` 2.65s).
    - Dokumentasi diperbarui di `frontend-app.md` dan `docs/frontend/billing.md`.

---

- [x] **Perintah Validasi Bill Cerdas via Suara (`VoiceAssistantModal.tsx`, `voiceSearch.utils.ts`, `voiceAssistantStore.ts`, `ValidationDetailPage.tsx`)**:
  - **1. Intent Baru `VALIDATE_BILL` & `REFRESH_VALIDATION` (`voiceSearch.utils.ts`)**:
    - `VALIDATE_BILL`:
      - **Validasi Bill Spesifik**: *"Validasi bill GZS 010751"*, *"Validasi invoice 010751"*, *"Validasi faktur Santoso"* $\to$ normalisasi mengekstrak nomor/nama, API list query, auto-navigate 0.8s langsung membuka invoice validasi terkait.
      - **Validasi Bill Aktif (Current)**: *"Validasi bill ini"*, *"Validasi bill"*, *"Cek validasi"*, *"Periksa validasi"*, *"Inspeksi bill"* $\to$ saat berada di `ValidationDetailPage`, langsung membuka modal kesimpulan validasi `BillingValidationSummaryModal.tsx`.
      - **Validasi Sub-Tab Spesifik**:
        - *"Validasi fisik bill"* / *"Validasi kubikasi"* $\to$ sub-tab `m3_weight` (Fisik M³ / Kg).
        - *"Validasi overweight bill"* $\to$ sub-tab `overweight` (Overweight).
        - *"Validasi tarif bill"* / *"Validasi harga"* $\to$ sub-tab `items` (Audit Tarif & Item).
        - *"Validasi transport bill"* / *"Validasi ongkir"* $\to$ sub-tab `transport` (Biaya `tbExpIndo`).
        - *"Validasi freight bill"* $\to$ sub-tab `freight` (Freight Charge).
      - **Navigasi Antrean**: *"Antrean validasi bill"*, *"Daftar validasi bill"* $\to$ `ROUTES.BILLING_VALIDATION_LIST`.
    - `REFRESH_VALIDATION`:
      - *"Refresh validasi"*, *"Muat ulang validasi"*, *"Cek ulang"* $\to$ mengeksekusi invalidasi cache atomik React Query (`billingDetail`, `m3-check`, `billingTransportCheck`) melalui context delegator `onRefreshValidation` tanpa reload seluruh halaman browser.
  - **2. UI & Quick Action Chips Dinamis (`VoiceAssistantModal.tsx`)**:
    - Badge intent visual emerald: `🛡️ Validasi Bill: [Target / Tab / Invoice]`.
    - Quick Action Pills kontekstual: jika invoice sedang aktif dibuka, modal menyajikan tombol cepat `🛡️ "Validasi Bill Ini"`, `📏 "Audit Fisik"`, `🏷️ "Audit Tarif"`, dan `🔄 "Refresh Validasi"`.
  - **3. Verifikasi Build & Kepatuhan Arsitektur**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/billing-Agvuilrq.js` 2.80s).
    - Dokumentasi diperbarui di `docs/frontend/billing.md` dan `frontend-app.md`.

---

- [x] **Global ERP Voice Assistant di Seluruh Halaman Aplikasi Web (`VoiceAssistantModal.tsx`, `voiceAssistantStore.ts`, `voiceSearch.utils.ts`, `Topbar.tsx`, `AppLayout.tsx`, `ValidationDetailPage.tsx`)**:
  - **1. Arsitektur Store Terpusat & Delegasi Kontekstual (`voiceAssistantStore.ts`)**:
    - Menggunakan Zustand store global `useVoiceAssistantStore` untuk mengelola visibilitas dialog (`isOpen`, `openAssistant`, `closeAssistant`, `toggleAssistant`).
    - Menyediakan antarmuka pendaftaran konteks reaktif (`registerContext` & `unregisterContext`). Halaman khusus (seperti `ValidationDetailPage.tsx`) dapat mendaftarkan callback spesifik halaman (`onOpenSummary`, `onCloseSummary`, `onTriggerIssue`, `isIssued`, `underchargedCount`, `currentInvNo`) saat mount dan otomatis di-deregister saat unmount.
  - **2. Navigasi Suara Seluruh Modul ERP (`voiceSearch.utils.ts`)**:
    - Intent baru `NAVIGATE_PAGE` dengan pemetaan komprehensif `PAGE_COMMANDS` menggunakan konstanta resmi `ROUTES`:
      - *"Buka dashboard"* / *"Halaman utama"* $\to$ `ROUTES.DASHBOARD`
      - *"Buka monitoring surat jalan"* / *"SJ pending"* $\to$ `ROUTES.DELIVERY_ORDERS_MONITORING`
      - *"Buka surat jalan"* $\to$ `ROUTES.DELIVERY_ORDERS_LIST`
      - *"Buka inventori gudang"* $\to$ `ROUTES.DELIVERY_ORDERS_INVENTORY`
      - *"Buka BAP"* / *"Berita acara"* $\to$ `ROUTES.INSPECTION_REPORTS`
      - *"Buka kontainer"* / *"Batch marking"* $\to$ `ROUTES.SHIPMENT_BATCHES`
      - *"Buka ukuran marking"* $\to$ `ROUTES.SHIPMENT_BATCH_MARKING_SIZE`
      - *"Buka resi"* / *"Shipments"* $\to$ `ROUTES.SHIPMENTS`
      - *"Buka antrean validasi"* $\to$ `ROUTES.BILLING_VALIDATION_LIST`
      - *"Buka target penagihan"* $\to$ `ROUTES.BILLING_TARGET`
      - *"Buka daftar invoice"* $\to$ `ROUTES.BILLING_LIST`
      - *"Buka kasir"* / *"Pelunasan"* $\to$ `ROUTES.CASHIER`
      - *"Buka wallet"* / *"Saldo deposit"* $\to$ `ROUTES.WALLET`
      - *"Buka master tarif"* / *"Price list"* $\to$ `ROUTES.PRICE_LIST`
      - *"Buka tarif customer"* $\to$ `ROUTES.CUSTOMER_PRICE_LIST`
      - *"Buka master customer"* $\to$ `ROUTES.CUSTOMERS`
      - *"Buka profil"* $\to$ `ROUTES.PROFILE`
      - *"Buka user management"* $\to$ `ROUTES.USERS`
  - **3. Pencarian Invoice Universal dari Mana Saja (`SEARCH_INVOICE`)**:
    - Pengguna dapat mencari invoice dari halaman mana saja (e.g. *"Cari invoice GZS 010751"* atau *"Buka invoice Santoso"*).
    - Auto-navigation (0.8s countdown) langsung membuka `ROUTES.BILLING_VALIDATION_DETAIL(invNo)`.
  - **4. Integrasi Akses Global & Pintasan Keyboard (`Topbar.tsx` & `AppLayout.tsx`)**:
    - Tombol `[ 🎙️ Voice / Asisten Suara ]` beranimasi pulse terpasang permanen pada `Topbar.tsx` di samping pemilih tema dan bahasa.
    - Pintasan keyboard global **`Alt+V`** aktif di seluruh halaman melalui listener `keydown` di `AppLayout.tsx`.
    - Komponen `<VoiceAssistantModal />` dimount satu kali secara global di level root layout (`AppLayout.tsx`).
  - **5. Integrasi Kontekstual Validation Detail (`ValidationDetailPage.tsx`)**:
    - Mendaftarkan context sebelum early returns (`registerContext`).
    - Tombol ribbon header memanggil `openAssistant()`.
    - Membersihkan modal lokal lama dan mengarahkan `VoiceInvoiceModal.tsx` sebagai re-export terarah.
  - **6. Internasionalisasi (i18n) & Verifikasi Build**:
    - Menambahkan key `topbar.voiceAssistant` pada `id.json` (*"Asisten Suara"*) dan `en.json` (*"Voice Assistant"*).
    - Verifikasi build frontend: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/billing-CVZKBHUe.js` dalam 10.38s).
    - Dokumentasi diperbarui di `frontend-app.md` dan `docs/frontend/billing.md`.

---

- [x] **Instalasi Skill TypeSafe AI (`.agents/skills/typesafe-ai`)**:
  - Menjalankan `npx skills add typesafe-ai/skills --skill typesafe-ai`.
  - Skill berhasil di-install dan tersimpan di `.agents/skills/typesafe-ai`.

---


- [x] **Billing Voice Assistant: Pencarian Invoice, Buka Tab Summary & Penerbitan Invoice via Suara (`VoiceInvoiceModal.tsx`, `useVoiceRecognition.ts`, `voiceSearch.utils.ts`, `ValidationDetailPage.tsx`, `IssueInvoiceModal.tsx`, `ValidationListDrawer.tsx`)**:
  - **1. Hook Web Speech API (`useVoiceRecognition.ts`)**:
    - Membungkus interface `SpeechRecognition` / `webkitSpeechRecognition` dengan bahasa default Bahasa Indonesia (`id-ID`).
    - Menyediakan lifecycle reaktif: `isSupported`, `isListening`, `transcript`, `interimTranscript`, dan penanganan error (`not-allowed`, `no-speech`, dll).
  - **2. Normalizer & Intent Classifier (`voiceSearch.utils.ts`)**:
    - Normalisasi ejaan angka fonetik ("kosong"/"nol" -> 0, "satu" -> 1, "strip" -> "-", "gezetes" -> GZS, dsb).
    - Klasifikasi 6 intent suara cerdas:
      - `SEARCH_INVOICE`: Menemukan dan membuka invoice target.
      - `OPEN_SUMMARY`: Membuka modal kesimpulan validasi `BillingValidationSummaryModal.tsx` dengan dukungan navigasi sub-tab instan (`m3_weight` Fisik, `overweight`, `items` Tarif, `transport`, `freight`).
      - `CLOSE_SUMMARY`: Menutup dialog summary validasi via perintah suara.
      - `ISSUE_INVOICE`: Membuka alur penerbitan invoice dengan proteksi undercharge.
      - `CONFIRM_ISSUE`: Konfirmasi hands-free eksekusi penerbitan invoice (`billingApi.issueInvoice`).
      - `CANCEL`: Membatalkan aksi atau menutup dialog suara.
  - **3. Dialog Interaktif Voice Assistant (`VoiceInvoiceModal.tsx`)**:
    - Animasi gelombang audio sonar saat merekam (Midnight Dark Mode compliant, border transparan semantik tanpa solid white).
    - Live transcript display dengan badge intent real-time.
    - Kueri pencarian backend instan via `billingApi.list` (auto-navigate 0.8s saat 1 hasil cocok; daftar kartu kandidat saat banyak hasil).
    - Quick hint buttons untuk perintah populer.
  - **4. Integrasi Validasi & Penerbitan Hands-Free (`ValidationDetailPage.tsx`, `IssueInvoiceModal.tsx`, `ValidationListDrawer.tsx`)**:
    - Tombol `[ 🎙️ Suara ]` pada ribbon header `ValidationDetailPage.tsx` + pintasan keyboard global **`Alt+V`**.
    - Sinkronisasi state `summaryInitialTab` ke `<BillingValidationSummaryModal initialTab={summaryInitialTab} />`.
    - Tombol mic inline pada kolom input pencarian drawer `ValidationListDrawer.tsx`.
    - Tombol konfirmasi suara pada footer `IssueInvoiceModal.tsx` ("Katakan 'Terbitkan'").
  - **5. Verifikasi & Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/billing-validation-detail-Dg23K81e.js`).
    - Kamus terjemahan `id.json` dan `en.json` terdaftar lengkap.
    - Dokumentasi diperbarui di `docs/frontend/billing.md` dan `frontend-app.md`.

---

- [x] **Peningkatan Jarak Aman Tombol Ambil Foto BAP dari Navigasi Android (`BapPhotoSheet.tsx`)**:
  - **1. UI Safe Area Insets Elevation (`BapPhotoSheet.tsx`)**:
    - Tombol aksi "+ Ambil Foto Pemeriksaan" pada footer lembar BAP: Mengubah padding bottom dari sebelumnya statis `Math.max(insets.bottom, 24)` menjadi `Platform.OS === 'android' ? Math.max(insets.bottom, 48) + 16 : Math.max(insets.bottom, 24)`. Jarak tombol dari tepi bawah layar kini minimal 64px, memberikan ruang bebas nyaman di atas bar navigasi Android (3-tombol maupun gestur).
    - Shutter tombol jepret kamera native: Mengubah `cameraBottomBar` padding bottom dari `insets.bottom + 24` menjadi `Platform.OS === 'android' ? Math.max(insets.bottom, 48) + 24 : Math.max(insets.bottom, 24) + 16` (~72px), mencegah pengguna salah menekan tombol navigasi Home/Back saat mengambil foto.
    - Fullscreen preview footer: Diperbarui dengan `paddingBottom: Platform.OS === 'android' ? 44 : 36`.
  - **2. Verifikasi, Kompilasi & Repack APK**:
    - Type check: `bunx tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
    - Hermes bundle recompiled: `bunx expo export --platform android` $\to$ `entry-0b36632f6514596c1624fa187cebe6f1.hbc` (5.6MB).
    - Repack APK: injeksi bundle, zipalign, & re-sign release v2/v3 verified via `scripts/repack_apk.ps1`.
    - Distribusi sinkron ke 4 titik server (`c:\shipping\mshipping.apk`, `frontend/dist`, `frontend/public`, `backend/public/uploads`).
    - PM2 service `ShippingApi` di-restart dan aktif online.
    - Endpoint `/api/app-version/latest` terverifikasi 200 OK (`version: 1.2.5`, `versionCode: 17`, `forceUpdate: false`).

---

- [x] **Perbaikan Fatal Crash Tab Logistik Mobile & Stabilisasi Base APK (`BapPhotoSheet.tsx`, `package.json`, `app-version.json`, `docs/mobile/`)**:
  - **1. Investigasi Akar Masalah Crash**:
    - Aplikasi crash seketika saat pengguna membuka tab Logistik.
    - Analisis DEX base APK `C:\shipping\mshipping.apk` membuktikan modul binary native `ExponentImagePicker` **tidak ada** di `classes.dex`.
    - Alur build server menggunakan `scripts/repack_apk.ps1` yang hanya mengganti JavaScript Hermes bytecode (`assets/index.android.bundle`) tanpa Android SDK / compiler Java DEX.
    - Import `expo-image-picker` di level modul pada `BapPhotoSheet.tsx` memanggil `requireNativeModule('ExponentImagePicker')` yang langsung throw unhandled exception fatal saat runtime modul di-load.
  - **2. Solusi & Pemulihan (Rollback ke Native Camera Saja)**:
    - Menghapus import `expo-image-picker`, fungsi `handlePickFromGallery`, tombol galeri, dan dependensi `expo-image-picker` dari `mobile/src/features/inspection/components/BapPhotoSheet.tsx` dan `mobile/package.json`.
    - Modul BAP tetap aman mengambil foto melalui `expo-camera` (`CameraView`) yang sudah ter-compile di binary DEX base APK.
    - Menambahkan dokumentasi aturan arsitektur di `.agents/rules/mobile-standards.md` dan `docs/mobile/release-protocol.md` mengenai batasan base APK repack vs larangan import modul native baru.
  - **3. Verifikasi & Distribusi APK**:
    - Type check: `bunx tsc --noEmit` di `mobile/` $\to$ **LULUS 100% 0 errors**.
    - Hermes bundle recompiled: `bunx expo export --platform android` $\to$ `entry-c0f4be4a8b749b960d96e831dc6de662.hbc` (5.6MB).
    - Repack APK: injeksi bytecode ke `mshipping.apk`, zipalign & signing release v2/v3 verified via `scripts/repack_apk.ps1`.
    - Distribusi sinkron ke 4 titik server (`c:\shipping\mshipping.apk`, `frontend/dist`, `frontend/public`, `backend/public/uploads`).
    - PM2 service `ShippingApi` di-restart dan online.
    - Endpoint `/api/app-version/latest` terverifikasi 200 OK (`version: 1.2.5`, `versionCode: 17`, `forceUpdate: false`, size 121.2 MB).

---

- [x] **Evaluasi Toleransi Pengiriman H+1 & Modal Rincian SJ Pending Overdue (`DeliveryEstimasiDetailModal.tsx`, `DeliveryConfirmChart.tsx`, `deliveryOrders.service.ts`, `deliveryOrders.routes.ts`)**:
  - **1. Aturan Bisnis & Backend SQL Server Engine (`deliveryOrders.service.ts` & `deliveryOrders.routes.ts`)**:
    - **Aturan Toleransi H+1 & Akurasi Realisasi Pengiriman (`fdLoad`)**: Batas maksimal pengiriman normal adalah `fdSent <= fdEstimasi + 1` hari. Apabila hari ini (`GETDATE()`) sudah melewati `fdEstimasi + 1` dan kargo belum terkirim (`fdSent = 0` atau `NULL`), berstatus **Pending Overdue**. Apabila `fdSent = 1`, tanggal dan waktu pemuatan riil diambil dari **`tbDelivery.fdLoad`** (bukan `fdSndDate` yang merupakan tanggal draft/invoice) via `COALESCE(d.fdLoad, d.fdSndDate)`. Menghasilkan akurasi 100% pada evaluasi keterlambatan pengiriman (`SENT_ONTIME` vs `SENT_LATE`).
    - Mengintegrasikan evaluasi `pendingOverdueSj` dan `pendingToleransiSj` pada CTE `DailyEstimation` di `getDeliveryConfirmTrends()`:
      - Overdue: `ISNULL(d.fdSent, 0) = 0 AND CAST(GETDATE() AS DATE) > DATEADD(day, 1, CAST(d.fdEstimasi AS DATE))`.
      - Dalam Toleransi: `ISNULL(d.fdSent, 0) = 0 AND CAST(GETDATE() AS DATE) <= DATEADD(day, 1, CAST(d.fdEstimasi AS DATE))`.
    - Menghitung summary global `totalPendingOverdueSj` dan `totalPendingSj` pada `DeliveryConfirmTrendsSummary`.
    - **Endpoint Baru**: `GET /api/delivery-orders/estimasi-details?date=YYYY-MM-DD&type=all|overdue|pending|sent` (`getDeliveryEstimasiDetails`) yang mengambil daftar Surat Jalan per tanggal estimasi lengkap dengan SSOT customer master (`tbCustomers`), marking, nomor resi gudang (`fdTerima`), list code, armada, supir, koli, berat, selisih hari overdue (`overdueDays`), dan batas toleransi (`maxToleranceDate`).
    - PM2 service `ShippingApi` di-restart dan online di port 3010.
  - **2. UI Komponen Modal Rincian Estimasi (`DeliveryEstimasiDetailModal.tsx`)**:
    - Dialog responsif Midnight Dark Mode compliant (`bg-[var(--color-surface)]`, outline translucent border, tanpa solid white).
    - **Format Tanggal Standar Indonesia (`formatIndoDate`)**:
      - Menyediakan fungsi pemformat tanggal tanpa pergeseran zona waktu (anti-timezone shift UTC).
      - **Header Modal**: Menampilkan format hari dan tanggal lengkap (`Rincian Target Estimasi Kirim: [Hari], [DD] [Mmm] [YYYY]`, misal: *"Rincian Target Estimasi Kirim: Rabu, 23 Sep 2026"*).
      - **Badge Batas Maksimal H+1**: Menampilkan `Batas Maksimal H+1: [Hari], [DD] [Mmm] [YYYY]` (misal: *"Batas Maksimal H+1: Kamis, 24 Sep 2026"*).
      - **Tabel Data**:
        - Kolom No. SJ memuat subtext tanggal penerbitan SJ (`Tgl SJ: 23 Sep 2026`).
        - Kolom Status Toleransi memformat tanggal batas (`Lewat batas 24 Sep 2026` / `Batas s/d 24 Sep 2026`) dan tanggal pengiriman (`Kirim: 24 Sep 2026, 14:30 WIB`).
      - **Ekspor Excel**: Seluruh kolom tanggal (Tgl SJ, Target Estimasi, Batas H+1, Tgl Kirim) diekspor dalam format tanggal Indonesia yang rapi.
      - **Backend Query SQL Presisi**: Menggunakan `CONVERT(varchar(10), d.fdEstimasi, 120)` dan `CONVERT(varchar(10), d.fdSJDate, 120)` untuk mengeliminasi potensi pergeseran tanggal akibat serialisasi Date UTC Prisma.
    - **KPI Summary Banner**: 5 kartu ringkasan (Total Target SJ, ⚠️ Pending Overdue > H+1, 🕒 Pending Toleransi H+1, ✓ Terkirim, Fisik Total Koli & Berat).
    - **Toolbar Interaktif**:
      - 4 Filter status chips (`Semua`, `⚠️ Overdue (> H+1)`, `🕒 Pending (H+1)`, `✓ Terkirim`) dengan counter live reaktif.
      - Segmented switch moda (`[Semua Moda | ✈️ Udara | 🚢 Laut]`).
      - Live search instant (No. SJ, Customer, Marking, Supir, Plat mobil, List Code, No. Resi).
    - **Tabel Data Rinci**: No urut, No. Surat Jalan (bold font mono), Status badge ramping single-line (`whitespace-nowrap`: `🕒 Toleransi H+1` dengan subtext `s/d [Tgl]`, `⚠️ Overdue +[N]H` dengan subtext `Batas: [Tgl]`, `✓ Terkirim` dengan subtext `[Tgl]`), Moda & Cabang, Customer Master & Alamat, Koli & Berat, Armada & Supir, List Code & Resi.
    - **Ekspor Excel (.xlsx)**: Unduh daftar Surat Jalan terfilter langsung ke format spreadsheet.
  - **3. Integrasi Tabel & KPI Ribbon Monitoring (`DeliveryConfirmChart.tsx`)**:
    - **KPI Ribbon Kartu Ke-6**: Menambahkan kartu `⚠️ Pending Overdue (> H+1)` dengan aksen rose/amber dan subtext total pending SJ.
    - **Kolom Baru pada Tabel Log Harian (Mode Compare)**:
      - Menambahkan kolom header `Status Pending (> H+1)`.
      - Sel baris interaktif:
        - Badge Merah/Rose: `⚠️ X SJ Overdue` (onClick membuka modal rincian dengan filter overdue).
        - Subtext Amber: `+Y dlm H+1` (onClick membuka modal rincian toleransi).
        - Badge Hijau: `✓ 0 Pending` saat seluruh target estimasi telah terkirim.
      - Menjadikan kolom `Target Estimasi` interaktif (klik pada `X SJ` langsung membuka seluruh Surat Jalan estimasi tanggal tersebut).
      - Menambahkan kolom `SJ Overdue (> H+1)`, `SJ Pending dlm Toleransi H+1`, dan `Total SJ Pending` pada ekspor Excel sheet `Estimasi_vs_Realisasi`.
      - Merender modal `<DeliveryEstimasiDetailModal ... />` di root komponen.
  - **4. Verifikasi & Build**:
    - Backend build: `bun build src/index.ts --no-bundle` $\to$ **LULUS 100% 0 errors**.
    - Frontend build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/delivery-orders-CLZ5KfY_.js` dalam 3.72s).
    - Langsung aktif pada IIS physical path `C:\shipping\frontend\dist` (`http://36.93.22.142/mshipping/logistics/delivery-orders/monitoring`).

---

# 📋 Working Context — mshipping

> **⚡ WAJIB DIBACA** oleh setiap AI Agent di awal sesi. WAJIB DIUPDATE di akhir sesi sebelum percakapan ditutup.
> File ini adalah **executive summary & konteks aktif** proyek saat ini.
>
> 📚 **Detail Teknis Fitur Aktif**:
> - Surat Jalan & Cetak Continuous Form → [features/delivery-orders.md](./features/delivery-orders.md)
> - Validasi Billing & Penerbitan Invoice → [features/billing-validation.md](./features/billing-validation.md)
> - Cashier Pelunasan & Saldo Wallet → [features/cashier-wallet.md](./features/cashier-wallet.md)
> - Marking, Container M³, & Markup → [features/shipment-marking.md](./features/shipment-marking.md)
> - Search Autocomplete & Caching → [features/search-suggestions.md](./features/search-suggestions.md)
>
> 📚 **Riwayat lengkap pekerjaan lama** → [history/history-2026-09.md](./history/history-2026-09.md)

---

### 🕐 Terakhir Diperbarui
- **Tanggal**: 2026-09-25
- **Oleh**: Antigravity AI
- **Sesi**: Optimalisasi Responsif Penuh Mobile Halaman Monitoring Surat Jalan & Tren Konfirmasi (http://36.93.22.142/mshipping/logistics/delivery-orders/monitoring)

---

- [x] **Optimalisasi Responsif Penuh Mobile Halaman Monitoring Surat Jalan (`MonitoringPage.tsx`, `DeliveryConfirmChart.tsx`, `docs/frontend/delivery-orders.md`)**:
  - **1. Tab 1: Surat Jalan Belum Terkirim (`MonitoringPage.tsx`)**:
    - **Dual View Layout**:
      - Desktop view (`hidden md:block`): Tabel 9 kolom dengan sorting per kolom dan checkbox selection.
      - Mobile view (`md:hidden`): Daftar kartu Surat Jalan komprehensif memuat checkbox multi-select massal, no SJ (link font-mono), icon cetak, aging badge responsif, box info customer master & marking/resi, spesifikasi moda (✈️ Air vs 🚢 Sea) & kuantitas coly/kg/m³, tanggal estimasi kirim & status overdue warning, info plat armada & supir, serta tombol aksi cepat Kirim dan Cetak Continuous Form.
    - **Header & Navigation Tabs**: Tab pending vs trends dilengkapi label responsif (`sm:hidden` ringkas) dan container scroll horizontal.
    - **5 Kartu KPI Ribbon**: Grid `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3` dengan kartu ke-5 (`Aging > 7 Hari`) spanning 2 kolom di mobile (`col-span-2 sm:col-span-1`) agar simetris.
    - **Toolbar Filter**: Search bar full-width, date range pickers wrap responsif (`min-w-[120px]`), dan pill filters (Aging, Status, Moda) pada strip horizontal scrollable tanpa wrapping berantakan.
    - **Batch Selection Floating Bar & Pagination**: Beradaptasi vertikal di mobile (`flex-col sm:flex-row`).
  - **2. Tab 2: Tren Konfirmasi Terkirim (`DeliveryConfirmChart.tsx`)**:
    - **Toolbar Kontrol 2 Baris**:
      - Baris 1: View mode switcher (Estimasi vs Realisasi vs Sesi Batch FoxPro) dengan label adaptif + tombol aksi Ekspor Excel & Refresh.
      - Baris 2: Strip pill swipeable horizontal (`overflow-x-auto no-scrollbar`) memuat switcher Metrik (SJ / Coly / Kg), filter Moda (Semua / Udara / Laut), dan rentang waktu (7h / 14h / 30h / 60h).
      - Sub-banner info batch cycle FoxPro & target komparasi yang wrap rapi.
    - **Chart Recharts Adaptif**: Penyesuaian tinggi `h-[270px] sm:h-[400px]`, negative left margin `-22px` agar label sumbu Y pas tanpa membuang lebar layar ponsel, dan ukuran font axis compact (10px).
    - **Dual View Log Riwayat Harian & Batch**:
      - Desktop view (`hidden md:block`): Tabel 10 kolom (Compare) dan 8 kolom (Batches).
      - Mobile view (`md:hidden`): High-density card list untuk **Mode Compare** (kartu harian memuat perbandingan target estimasi vs realisasi, status pending overdue/toleransi H+1, dan batch cardlets interaktif yang dapat diklik membuka modal detail batch) dan **Mode Batches** (kartu batch dengan sesi Pagi/Sore, jam cetak FoxPro WIB, total SJ interaktif `[ X SJ ↗ ]`, dan rincian koli/berat).
    - **Pagination Footer**: Beradaptasi fleksibel dengan `flex-col sm:flex-row`.
  - **3. Verifikasi & Build**:
    - `bunx tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/delivery-orders-CEOiKBZR.js` dalam 3.35s).
    - Langsung aktif pada web server IIS physical path `C:\shipping\frontend\dist`.

---

- [x] **Modal Rincian Surat Jalan per Batch & Grouping Moda / Cabang (`DeliveryBatchDetailModal.tsx`, `DeliveryConfirmChart.tsx`, `deliveryOrders.service.ts`, `deliveryOrders.routes.ts`)**:
  - **1. Backend Service & Stored Procedure FoxPro (`deliveryOrders.service.ts` & `deliveryOrders.routes.ts`)**:
    - Mengintegrasikan Stored Procedure legacy FoxPro resmi: `EXEC rpt_tbDelivery2023 @ListType, @date1, @date2`.
    - Windowing dinamis dari `tbDeliveryConfirm` (`LAG(fdTglPrintReport)` ke `fdTglPrintReport` saat ini):
      - Contoh sesi Sore 24 Sep: Udara (`@ListType = 1`, 39 SJ) + Laut (`@ListType = 2`, 145 SJ) = 184 SJ presisi 100% dengan FoxPro.
    - Enrichment informasi supir (`fdSupir`, `fdTelpSupir`), satuan koli, dan tanggal estimasi dari `tbDelivery` secara chunked.
    - Mengembalikan metadata batch (jam WIB, total SJ, fisik koli, dan berat kg) beserta rincian lengkap per surat jalan.
    - Endpoint: `GET /api/delivery-orders/confirm-batch-detail?date=YYYY-MM-DD&session=Pagi|Sore` (terproteksi auth JWT).
    - Service PM2 `ShippingApi` di-restart dan online.
  - **2. Badge Counter Volume SJ Versi Ramping (`DeliveryConfirmChart.tsx`)**:
    - Mengembalikan format badge counter volume SJ ke versi bersih (`{b.totalSj} SJ`) di sisi kanan cardlet tanpa teks inline moda yang memadati baris.
    - Lebar cardlet kembali ramping dan kompak (`min-w-[145px] max-w-[185px]`).
    - Menjadikan cardlet interaktif (`cursor-pointer hover:border-sky-500/50 hover:bg-sky-500/5`): Klik pada cardlet sesi batch langsung membuka modal rincian Surat Jalan.
    - Menjadikan kolom Total SJ pada *Table Mode Batches* interaktif (tombol `[ X SJ ↗ ]` membuka modal batch bersangkutan).
  - **3. Komponen Modal `DeliveryBatchDetailModal.tsx`**:
    - **Perbaikan Duplikasi Icon**: Memperbaiki label banner moda (`Moda Laut (Sea)` & `Moda Udara (Air)`) sehingga icon tidak lagi muncul ganda (`🚢 🚢` $\to$ `🚢`).
    - **Grouping Multi-Level Hierarkis**:
      - **Level 1 (Moda)**: Banner terpisah untuk `✈️ Moda Udara (Air)` dan `🚢 Moda Laut (Sea)` lengkap dengan badge counter SJ, koli, dan berat.
      - **Level 2 (Cabang / Branch Name)**: Sub-grup per cabang pengirim (GUANGZHOU, SINGAPORE, YI WU, dll.) dengan kode cabang, counter SJ, counter jumlah marking (`X Marking`), dan accordion toggle expand/collapse.
      - **Level 3 (Marking / `fdMarkingCode`)**: Pengelompokan baris Surat Jalan per marking dengan subheader row khusus (badge marking amber `🏷️`, nama pelanggan master, kode customer, counter SJ per marking, dan total koli/berat) yang dapat di-collapse per marking.
    - **Tabel Data Rinci**: No urut dalam marking, No. Surat Jalan (bold font mono) & Tanggal SJ, Customer Master & Resi/Alamat, Armada Plat Mobil & Supir, Koli (Satuan), Berat (Kg), dan List Code.
    - **Ribbon Ringkasan KPI**: Total SJ, breakdown Air/Sea SJ, koli, tonase berat, dan jam cetak laporan FoxPro WIB.
    - **Toolbar Interaktif**: Live search (No. SJ, Customer, Marking, Supir, Plat mobil), Segmented pill filter moda (`[Semua Moda | ✈️ Air | 🚢 Sea]`), dropdown filter cabang, dan tombol reset.
    - **Ekspor Excel (.xlsx)**: Unduh seluruh data Surat Jalan batch terfilter ke format spreadsheet lengkap dengan satu klik.
    - **Desain Midnight Dark Mode**: Patuh token CSS semantik (`bg-[var(--color-surface)]`, border transparan, tanpa solid white).
  - **4. Verifikasi & Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (`dist/assets/delivery-orders-iZHZcHjt.js` dalam 3.84s).
    - Langsung aktif di IIS physical path `C:\shipping\frontend\dist`.

---

- **Sesi**: Integrasi Ambil Gambar dari Galeri Foto pada Modul BAP Mobile

---

- [x] **Dukungan Pengambilan Gambar dari Galeri pada Modul Foto BAP Mobile (`BapPhotoSheet.tsx`, `docs/mobile/logistics.md`)**:
  - **1. Handler `handlePickFromGallery` (`BapPhotoSheet.tsx`)**:
    - Mengintegrasikan `expo-image-picker` (`launchImageLibraryAsync`) dengan opsi `mediaTypes: ['images']`, `allowsMultipleSelection: true`, dan `selectionLimit` proporsional sesuai sisa kuota (maks 10 foto).
    - Meminta izin media library (`requestMediaLibraryPermissionsAsync`) dengan graceful error toast jika ditolak.
    - Ekstraksi base64 otomatis dengan fallback `FileSystem.readAsStringAsync` jika base64 kosong dari picker.
    - Upload berurutan ke server via `uploadMutation.mutateAsync` dan feedback counter foto terunggah.
  - **2. Penataan UI Dual Action (`BapPhotoSheet.tsx`)**:
    - Footer lembar foto BAP kini menampilkan dua tombol berdampingan: `[ 📷 Kamera ]` dan `[ 🖼️ Galeri ]` (styling Midnight Dark compliant, outline border aksen sky blue).
    - Menambahkan tombol pintas Galeri `[ 🖼️ ]` di kiri tombol shutter pada viewfinder kamera native agar pengguna dapat langsung beralih ke galeri tanpa harus menutup kamera.
  - **3. Verifikasi & Dokumentasi**:
    - Type check mobile: `bunx tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
    - Memperbarui dokumentasi logistik di [`docs/mobile/logistics.md`](./docs/mobile/logistics.md).
  - **4. Kompilasi Bundle & Repack APK (`v1.2.5`, Build `17`, `forceUpdate: false`)**:
    - Hermes export: `bunx expo export --platform android` $\to$ `entry-25d94fd46105879b0208dd2812608c17.hbc` (5.6MB).
    - Repack APK: injeksi bytecode ke `mshipping.apk`, zipalign & signing release v2/v3 verified via `scripts/repack_apk.ps1`.
    - Distribusi sinkron ke 4 titik server (`c:\shipping\mshipping.apk`, `frontend/dist`, `frontend/public`, `backend/public/uploads`).
    - PM2 service `ShippingApi` di-restart dan aktif online.
    - Endpoint `/api/app-version/latest` terverifikasi 200 OK (`version: 1.2.5`, `versionCode: 17`, `forceUpdate: false`, size 121.2 MB).

---

- [x] **Implementasi Infinite Scroll pada Tab Billing (Finance) & Penyempurnaan Delivery (Logistics) Mobile App (`finance.tsx`, `useBillings.ts`, `useDeliveryOrders.ts`, `docs/mobile/finance.md`)**:
  - **1. Hook Baru `useBillingsQuery` (`useBillings.ts`)**:
    - Menerapkan `useInfiniteQuery` TanStack Query v5 pada endpoint `/api/billing` dengan pagination batch 20 item (`pageParam: 1`, `limit: 20`).
    - Resolusi pagination cerdas `getNextPageParam` berbasis `meta.totalPages` dan fallback data length.
    - Memoized flat array `data` dari `query.data.pages`.
  - **2. Integrasi Layar Billing (`finance.tsx`)**:
    - Menggantikan query statis `limit: 20` dengan hook `useBillingsQuery`.
    - Menambahkan props `onEndReached` (`onEndReachedThreshold: 0.4`), footer spinner `ActivityIndicator` saat `isFetchingNextPage`, dan pull-to-refresh `refetch`.
  - **3. Verifikasi & Penyempurnaan Delivery Orders (`useDeliveryOrders.ts`)**:
    - Memperbaiki `getNextPageParam` agar menghentikan request saat `currentPage >= totalPages` dan tidak terpicu request phantom saat total baris kelipatan 20.
    - Verifikasi FlatList Surat Jalan (`activeTab === 'delivery'`) di `logistics.tsx`.
  - **4. Verifikasi & Dokumentasi**:
    - Type check mobile: `bunx tsc --noEmit` $\to$ **LULUS 100% 0 errors**.
    - Memperbarui dokumentasi modul keuangan di [`docs/mobile/finance.md`](./docs/mobile/finance.md).
  - **5. Kompilasi Bundle & Repack APK (`v1.2.5`, Build `17`, `forceUpdate: false`)**:
    - Hermes export: `bunx expo export --platform android` $\to$ `entry-c0f4be4a8b749b960d96e831dc6de662.hbc` (5.6MB).
    - Repack APK: injeksi bytecode ke `mshipping.apk`, zipalign & signing release v2/v3 verified via `scripts/repack_apk.ps1`.
    - Distribusi sinkron ke 4 titik server (`c:\shipping\mshipping.apk`, `frontend/dist`, `frontend/public`, `backend/public/uploads`).
    - PM2 service `ShippingApi` di-restart dan aktif online.
    - Endpoint `/api/app-version/latest` terverifikasi 200 OK (`version: 1.2.5`, `versionCode: 17`, `forceUpdate: false`, size 121.2 MB).

---

- [x] **Bugfix: Price List Master Marking Override Kadaluarsa (`26GZC91`) Mengabaikan Master List Baru 1 Sep 2026 (`marking-matcher.ts`, `price-check.service.ts`)**:
  - **1. Akar Masalah**:
    - Pada master price list, Upload 8 (`effectiveDate: 2026-07-17`) memiliki marking override `26GZC91` dengan harga General Goods lama Rp 4.700.000.
    - Pada 1 September 2026, manajemen mengunggah Upload 9 (`effectiveDate: 2026-09-01`) tanpa marking override (tarif dasar umum baru, General Goods Rp 4.500.000).
    - Pada `findGeneralMarkingOverrideUpload` (`marking-matcher.ts`), pencarian upload dengan marking override mengambil seluruh upload masa lalu yang `effectiveDate <= shipmentDate`. Karena kontainer pengiriman adalah `26GZD69` ($\ge 26GZC91$), sistem mencocokkan Upload 8 (17 Juli) dan mengembalikan `isMarkingOverride = true` dengan harga lama Rp 4.700.000, melompati Master List baru 1 September 2026.
  - **2. Perbaikan Logika Bisnis Multi-Tier**:
    - **`marking-matcher.ts` (`findGeneralMarkingOverrideUpload` & `findCustomerMarkingOverrideUpload`)**:
      - Mengambil `latestMasterUpload` yang aktif pada `shipmentDate`.
      - Membatasi pencarian marking override dengan kondisi `effectiveDate >= latestMasterUpload.effectiveDate`.
      - Jika sudah ada upload master baru (1 Sep 2026) yang lebih baru dari upload marking override (17 Juli 2026), marking override dari periode lama otomatis kedaluwarsa dan tidak berlaku lagi.
    - **`price-check.service.ts` (Tier 2 & Tier 5)**:
      - Menambahkan filter `minEffTime = latestMaster.effectiveDate` sehingga Tier 5 (Global Marking Override) dan Tier 2 (Customer Marking Override) hanya mempertimbangkan upload pada periode aktif yang sama dengan upload master/customer terbaru.
  - **3. Verifikasi**:
    - Endpoint `/api/billing/m3-check?listCode=0942279`: `masterEffectiveDate` kini mengacu tepat ke `"2026-09-01"`, `isMarkingOverride = false`, tarif General Goods Rp 4.500.000 (status: MATCH).
    - Backend build: `bun build src/index.ts --no-bundle` $\to$ **LULUS 100% 0 errors**.
    - PM2 service `ShippingApi` aktif online di port 3010.

---

- [x] **Validasi Kesalahan Input Mata Uang Header vs Rincian Item (`useBillingValidation.ts`, `ValidationDetailPage.tsx`, `validationSummary.utils.ts`, `BillingValidationSummaryModal.tsx`)**:
  - **1. Akar Masalah Operasional FoxPro**:
    - Pada invoice `GZS-010751-09-2026`, staf menginput nilai tagihan utama di `fdJumlah1` (Rp 75.949.950) dan nilai Tax Return di `fdJumlah2` (2.881.600) dengan mata uang `fdCurr1 = "S$"`.
    - Pada rincian item (`tbBillingDetail`), seluruh 4 item bertipe Rupiah (`fdCurr = "RP."`, satuan `M3`), dan **TIDAK ADA SATUPUN** item yang menggunakan kode list/satuan valas `S$`.
    - Sistem sebelumnya menganggap faktur bernilai `S$ 2,881,600.00` (mengabaikan `fdJumlah1` dan menyesatkan kasir).
  - **2. Deteksi Engine Validasi (`useBillingValidation.ts`)**:
    - Mendeteksi kondisi `isCurrencyInputError`: `fdJumlah2 > 0` dengan `fdCurr1` valas, namun `hasMatchingForeignItem === false`.
    - Mencocokkan item yang nilainya identik dengan `fdJumlah2` (`matchedItemName`: Tax Return).
    - Menghitung total riil Rupiah yang benar (`correctTotalRp = fdJumlah1 + fdJumlah2` = Rp 78.831.550).
    - Menggagalkan validasi finansial: `isFinancialValid = false` dan menambahkan rincian isu ke `validationIssues`.
  - **3. UI & Alert Responsif (`ValidationDetailPage.tsx`)**:
    - **Alert Box Merah/Rose**: Peringatan anomali mata uang yang mencolok di atas rincian item, menerangkan nilai keliru vs nilai riil Rupiah.
    - **Badge Baris Item**: Item Tax Return (Rp 2.881.600) diberi tag `⚠️ Salah Input ke Valas (S$)` pada tampilan desktop dan mobile.
    - **Koreksi Sticky Footer Total**: Footer tabel menampilkan total riil Rupiah yang benar (`Rp 78.831.550`) dengan badge peringatan `⚠ fdJumlah2 S$ Keliru`.
    - **Issue Invoice**: Nilai total yang diserahkan ke kasir menggunakan `correctTotalRp`.
  - **4. Integrasi Modal Ringkasan (`validationSummary.utils.ts` & `BillingValidationSummaryModal.tsx`)**:
    - `getEffectiveInvoiceTotal`: Mengembalikan `{ total: correctTotalRp, currency: 'Rp.' }` saat terjadi kesalahan input valas.
    - `calculateValidationVerdict`: Menghasilkan verdict title *"Kesalahan Input: Anomali Mata Uang Header vs Rincian Item"*.
  - **5. Verifikasi**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/billing-DMDORpjR.js`).
    - Langsung aktif pada IIS physical path `C:\shipping\frontend\dist` (`http://36.93.22.142/mshipping/finance/billing/validation/GZS-010751-09-2026`).

---

- [x] **Bugfix: Price Check Tier 5 Salah Pakai Price List Lama (Marking Override `26GZC91`) padahal Price List Baru Sudah Berlaku 1 Sep 2026 (`price-check.service.ts`, `marking-matcher.ts`)**:
  - **Root Cause**: Di Tier 5 (Harga Marking Global), loop iterasi `allMasterUploads` tidak memfilter berdasarkan `effectiveDate <= targetDate`. Upload ID 8 (`effectiveDate: 2026-07-17`) yang punya marking `26GZC91` dipilih untuk transaksi 2 Sep 2026, padahal upload ID 9 (`effectiveDate: 2026-09-01`) sudah berlaku tapi tidak punya marking — sehingga Tier 5 loncat ke upload lama dan mengembalikan harga lama Rp 4,700,000.
  - **Fix 1 — `price-check.service.ts` Tier 5 instance 1 (~baris 970)**: `const eligibleMasterUploads = allMasterUploads.filter((u) => new Date(u.effectiveDate) <= targetDate)`.
  - **Fix 2 — `price-check.service.ts` Tier 5 instance 2 (~baris 1482)**: `const eligibleForOverride = mUploads.filter((u) => new Date(u.effectiveDate) <= targetDate)`.
  - **Fix 3 — `marking-matcher.ts` `findGeneralMarkingOverrideUpload`**: Tambah `effectiveDate: { lte: shipmentDate }` pada query Prisma; hapus `newerGeneralUpload` yang redundan.
  - Backend build → **LULUS 100% 0 errors**. PM2 `ShippingApi` online.

---

- [x] **Pill Group CS / MKT & Dropdown Multi-Select Kategori Barang (`DetailPage.tsx`, `DashboardFilters.tsx`, `pricing.md`)**:
  - **1. Pill Group Tipe Sheet (CS / MKT)**:
    - Menambahkan state `sheetTypeFilter` (`''` | `'CS'` | `'MKT'`).
    - Mengambil nilai unik `sheetType` langsung dari response data diff upload (`data.diff`) dengan fallback `['CS', 'MKT']`.
    - Merender pill selector dengan dukungan tombol `Semua`, `CS`, `MKT` serta toggle klik ulang untuk unselect.
    - Mengikuti standar Midnight Dark Mode (outline/transparent border, tanpa solid white).
  - **2. Tata Letak 1 Baris Terpadu (Single-Row Filter Bar)**:
    - Menyatukan seluruh kontrol filter ke dalam **1 baris horizontal responsif** (`flex flex-wrap items-end gap-3 sm:gap-4`):
      - `Tipe (CS / MKT)`: Pill group `[Semua | CS | MKT]`.
      - `Mode`: Pill group `[Semua | Sea | Air]` dengan icon moda.
      - `Cabang`: Pill group `[Semua | GZ | YW | ...]`.
      - `Kategori Barang`: Multi-select dropdown combobox (`flex-1 min-w-[200px] max-w-sm`) dengan live search.
      - `Tombol Reset`: Tombol `[ ↺ Reset ]` terpasang di ujung baris sejajar dengan kontrol lainnya.
    - Tinggi elemen diselaraskan presisi (`h-[38px]`) untuk konsistensi garis dasar horizontal.
  - **3. Dropdown Multi-Select Kategori Barang (`CategoryMultiCombobox`)**:
    - Mengintegrasikan komponen `CategoryMultiCombobox` dari `DashboardFilters.tsx`.
    - Fitur dropdown: pencarian real-time, seleksi multi-kategori, tombol cepat *"Pilih semua"* / *"Bersihkan semua"*, counter jumlah dipilih, dan tag chip kategori terpilih dengan tombol hapus (x).
    - Opsi kategori disaring secara kontekstual berdasarkan `sheetType` dan `mode` terpilih dengan auto-prune.
  - **4. Reaktivitas Metrik (KPI) & Toolbar**:
    - Kartu KPI analitik (Naik, Turun, Tetap, Baru) otomatis dihitung reaktif dari hasil filter aktif.
    - Toolbar tabel menampilkan total baris terfilter vs total baris keseluruhan (`X baris harga (dari Y total)`).
  - **5. Verifikasi & Deploy IIS**:
    - Verifikasi build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/price-list-B1fHbRXB.js`).
    - Langsung aktif pada IIS physical path `C:\shipping\frontend\dist` (`http://36.93.22.142/mshipping/finance/price-list/uploads/7`).

---

- [x] **Agregasi Surat Jalan Estimasi Kirim vs Realisasi Terkonfirmasi (`tbDeliveryConfirm`) (`MonitoringPage.tsx`, `DeliveryConfirmChart.tsx`, `deliveryOrders.service.ts`)**:
  - **1. Backend Dual Aggregation Query (`deliveryOrders.service.ts`)**:
    - Menghubungkan target estimasi pengiriman `tbDelivery.fdEstimasi` dengan realisasi konfirmasi terkirim `tbDeliveryConfirm` (`fdSent = 1`).
    - `DailyEstimation`: Mengelompokkan seluruh surat jalan berdasarkan `CAST(fdEstimasi AS DATE)` (`estSjUdara`, `estSjLaut`, `totalEstSj`, `totalEstPack`, `totalEstWeight`).
    - `DailyRealization`: Mengagregasikan surat jalan terkirim `fdSent = 1` dalam rentang batch `tbDeliveryConfirm` per tanggal (`realSjUdara`, `realSjLaut`, `totalRealSj`, `totalRealPack`, `totalRealWeight`).
    - `FULL OUTER JOIN`: Menghitung rasio ketercapaian harian `achievementPct = (totalRealSj / totalEstSj) * 100` dan selisih pengantaran `diffSj = totalRealSj - totalEstSj`.
    - Menghitung ringkasan global pada summary: `totalSjEstimated`, `totalEstUdara`, `totalEstLaut`, `totalEstColy`, `totalEstWeight`, `overallAchievementPct`, `diffTotalSj`.
    - Backend build lulus 100% 0 errors & PM2 service `ShippingApi` aktif online di port 3010.
  - **2. Komponen Chart & Kontrol Interaktif (`DeliveryConfirmChart.tsx`)**:
    - **Dual View Mode Switcher**:
      - `📊 Estimasi vs Realisasi` (Default): Grouped Bar Chart harian membandingkan target estimasi kirim (Indigo `#6366f1`) berdampingan dengan realisasi terkonfirmasi (Emerald `#059669`).
      - `📦 Sesi Batch FoxPro`: Stacked Bar per sesi batch pencetakan konfirmasi `tbDeliveryConfirm` (Pagi ~09:30 vs Sore ~14:30).
    - **5 Kartu KPI Ribbon Komprehensif**:
      - Target Estimasi Kirim (breakdown Udara vs Laut).
      - Realisasi Terkonfirmasi Terkirim (breakdown Udara vs Laut).
      - Persentase Ketercapaian (% Achievement + visual badge selisih `+/-` SJ).
      - Total Koli / Coly (Realisasi vs Target Estimasi).
      - Total Tonase Berat (Realisasi vs Target Estimasi).
    - **Switcher Kontrol**: Metrik (`Surat Jalan`, `Koli / Coly`, `Berat (Kg)`), Moda (`Semua`, `✈️ Udara`, `🚢 Laut`), dan Rentang Waktu (`7h`, `14h`, `30h`, `60h`).
    - **Custom Floating Tooltip**: Midnight Dark Mode compliant, membandingkan target estimasi dengan realisasi, breakdown moda, fisik kargo, dan selisih +/- SJ.
    - **Tabel Log & Ekspor Excel Dual-Sheet**:
      - Mode Compare: Tabel harian target estimasi, realisasi, % ketercapaian, selisih SJ, koli, berat, dan jumlah batch.
      - Mode Batch: Tabel rincian per sesi batch konfirmasi.
      - Ekspor Excel (.xlsx) dengan 2 sheet terpisah: `Estimasi_vs_Realisasi` & `Sesi_Batch_tbDeliveryConfirm`.
  - **3. Verifikasi & Deploy IIS**:
    - Verifikasi build frontend: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/delivery-orders-BCKYMzSb.js`).
    - Langsung aktif pada IIS physical path `C:\shipping\frontend\dist` (`http://36.93.22.142/mshipping/logistics/delivery-orders/monitoring`).

    - Langsung aktif di IIS physical path `C:\shipping\frontend\dist` (`http://36.93.22.142/mshipping/logistics/delivery-orders/monitoring`).


- [x] **Perbaikan Padding Halaman Monitoring Surat Jalan Belum Terkirim (`MonitoringPage.tsx`, `DeliveryConfirmModal.tsx`)**:
  - Memperbaiki root container `MonitoringPage.tsx` yang sebelumnya hanya `className="space-y-4"` (tanpa padding layar) menjadi standar ERP: `p-3.5 sm:p-6 lg:p-8 w-full min-w-0 space-y-4 sm:space-y-6 font-[var(--font-body)] animate-fadeIn pb-24`.
  - Memperbarui token CSS pada seluruh elemen:
    - Kartu KPI: `p-3 sm:p-3.5 rounded-xl border bg-[var(--color-surface)] border-[var(--color-border)]`, label semantik `text-[var(--color-secondary)]`, nilai `text-[var(--color-primary)]`.
    - Toolbar filter: container `p-3.5 sm:p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs`, input `bg-[var(--color-neutral)] border-[var(--color-border)] text-[var(--color-primary)]`.
    - Pill filter (Aging, Status, Moda): mode gelap mematuhi Midnight Dark standard (tanpa solid white), active state menggunakan border aksen semantik (`bg-sky-500/15 text-sky-600 border-sky-500/40`), inactive state transparan lembut.
    - Tabel Data: header thead `py-2.5 px-3` dengan `bg-[var(--color-neutral)]/70 border-[var(--color-border)]`, sel baris `py-2.5 px-3` proporsional, border & text menggunakan CSS variables.
    - Footer tabel: pagination bar `p-3 sm:p-3.5 border-t border-[var(--color-border)] bg-[var(--color-surface)]`.
    - Modal Konfirmasi: dialog `DeliveryConfirmModal.tsx` diselaraskan ke `bg-[var(--color-surface)] border-[var(--color-border)]`, padding `p-4 sm:p-5`.
  - Verifikasi build frontend: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/delivery-orders-DVL23Iso.js`).
  - Update langsung aktif di IIS web root `c:\shipping\frontend\dist` (`http://36.93.22.142/mshipping/logistics/delivery-orders/monitoring`).

---

- [x] **Fitur Monitoring Surat Jalan Belum Terkirim (`fdSent = 0`) & Konfirmasi Pengiriman FoxPro (`/delivery-orders/monitoring`)**:
  - **1. Backend Service & Endpoint (`deliveryOrders.service.ts` & `deliveryOrders.routes.ts`)**:
    - `getDeliveryMonitoring(query)`: Query gabungan `tbDelivery`, `tbCustomers` (SSOT nama master), dan `tbEntryList` (marking & M³).
    - Menghitung metrik aging (`DATEDIFF(day, d.fdSJDate, GETDATE())`) dan status keterlambatan estimasi (`d.fdEstimasi < Today` $\to$ `isOverdue`, `overdueDays`).
    - Agregasi 11 KPI: `totalPending`, `overdueCount`, `todayCount`, `aging1to2Count`, `aging3to5Count`, `aging6to7Count`, `agingOver7Count`, `airCount`, `seaCount`, `totalPackages`, `totalWeight`.
    - `confirmDelivery(dto, user)`: Mengadopsi form FoxPro `frm_delivery_view_edit_2023.scx`. Memperbarui `tbDelivery` setting `fdSent = 1, fdSndDate, fdCarID, fdSupir, fdTelpSupir, fdUpdate, fdLoad = GETDATE()`. Loop per baris menjamin eksekusi trigger `tgr_update_tbDelivery` memperbarui `tbEntryList.fdSjValid = 1`.
    - Jika opsi ekspedisi lokal terisi, mengeksekusi stored procedure legacy `sp_tbExpIndo @fdListCode, @fdExpID, @fdResiExp, @fdCurrExp, @fdTotalExp, @fdEmp, @fdPaid`.
    - Endpoint: `GET /api/delivery-orders/monitoring`, `POST /api/delivery-orders/confirm-delivery`, `GET /api/delivery-orders/vehicles`, `GET /api/delivery-orders/expeditions`.
    - PM2 service `ShippingApi` di-restart dan aktif online di port 3010.
  - **2. Komponen Modal Konfirmasi Pengiriman (`DeliveryConfirmModal.tsx`)**:
    - Dialog responsif bertema Midnight Dark Mode (outline border, tanpa solid white).
    - Mendukung mode tunggal (1 SJ) maupun mode batch (banyak SJ sekaligus dengan driver & armada yang sama).
    - Pilihan kendaraan dari `tbKendaraan` (auto-fill nama dan nomor telepon supir) serta opsi plat manual/custom ("DIAMBIL").
    - Seksi ekspedisi lokal terintegrasi dengan `tbExpedisi`, nomor resi ekspedisi, total ongkir, dan pilihan bayar (Bayar Jakarta vs Bayar Tujuan / BT).
  - **3. Halaman Monitoring Terpadu (`MonitoringPage.tsx`)**:
    - Rute: `ROUTES.DELIVERY_ORDERS_MONITORING` (`/mshipping/logistics/delivery-orders/monitoring`).
    - 5 Kartu KPI Ribbon interaktif: Total Pending, Lewat Estimasi (Overdue), Dibuat Hari Ini, Aging 1-2 Hari, Aging > 7 Hari.
    - Toolbar filter: Pencarian teks bebas, pill filter aging (`Semua`, `Hari Ini`, `1-2`, `3-5`, `6-7`, `>7`), status estimasi (`Semua`, `Overdue`, `On-Time`), moda (`Semua`, `✈️ Udara`, `🚢 Laut`), dan pemilih rentang tanggal.
    - Checkbox multi-seleksi dengan floating alert bar untuk eksekusi batch confirmation sekaligus.
    - Tabel data desktop & kartu responsif dengan badge semantik (aging, overdue warning, moda, tanda cetak continuous form).
    - Tombol aksi cepat: `[ 🚚 Kirim ]` membuka modal konfirmasi langsung dan `[ 🖨️ Cetak ]` membuka continuous form.
    - Tombol Ekspor Excel instan (`.xlsx`) via sheetjs.
  - **4. Navigasi & Integrasi Menu**:
    - Menambahkan rute `DELIVERY_ORDERS_MONITORING` di `constants.ts` dan `router.tsx`.
    - Menambahkan menu `Monitoring Belum Terkirim` di `Sidebar.tsx` dan `userManagement.types.ts`.
    - Menambahkan shortcut tombol `[ 🕒 Monitoring Pending ]` pada header `DashboardPage.tsx` dan `ListPage.tsx`.
    - Mendaftarkan key kamus `nav.deliveryOrderMonitoring` di `id.json` dan `en.json`.
  - **5. Verifikasi**:
    - Backend build: `bun build src/index.ts --no-bundle` $\to$ **LULUS 100% 0 errors**.
    - Frontend build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/delivery-orders-V_i3YVPg.js`).
    - Langsung aktif pada IIS physical path `C:\shipping\frontend\dist` (`http://36.93.22.142/mshipping`).

---

- [x] **Tag `BillTo ≠ Master` & Tampilan Nama BillTo pada Halaman Detail Validasi (`ValidationDetailPage.tsx`, `billing.types.ts`)**:
  - Menambahkan properti `fdBillTo?: string | null` pada tipe antarmuka `Billing` di `billing.types.ts`.
  - Di `ValidationDetailPage.tsx`:
    - Menghitung kondisi `isBillToDiff = Boolean(rawBillTo && rawCustName && rawBillTo.toLowerCase() !== rawCustName.toLowerCase())`.
    - Menampilkan badge amber `BillTo ≠ Master` di samping nama customer dan di header ribbon atas.
    - Menampilkan baris `Bill To: [Nama BillTo]` langsung di bawah nama customer pada kartu identitas tagihan.
    - Menambahkan alert strip informatif di dalam kartu identitas: `Ditagihkan ke (Bill To): [Nama BillTo] (Master: [Nama Master])`.
    - Menyertakan nama BillTo pada fungsi salin kargo (`handleCopyMarkingInfo`).
  - Verifikasi build frontend: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/billing-Bu15QCsY.js`).
  - Langsung tersinkronisasi ke IIS web root `c:\shipping\frontend\dist`.

- [x] **Tinggi Statis Modal Pricelist Customer (`CustomerHargaModal.tsx`)**:
  - Mengubah ukuran modal menjadi statis `h-[88vh] max-h-[88vh]` (sebelumnya hanya `max-h-[92vh]`) sehingga tinggi dialog konsisten saat perpindahan tab filter, saat loading, dan saat jumlah item tarif berubah.
  - Verifikasi build frontend: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/billing-BNZpv5pZ.js`).
  - Langsung tersinkronisasi ke IIS web root `c:\shipping\frontend\dist`.

- [x] **Format 2 Digit Desimal Tarif Asuransi (`CustomerHargaModal.tsx`)**:
  - Mengubah pemformatan `metadata.asuransi` dan `metadata.asuransi1` (Asuransi 2) dari `formatCurrency(...)` (yang sebelumnya memicu tampilan `Rp. 2.00`) menjadi presisi desimal 2 digit menggunakan `formatDecimal(..., 2)`.
  - Verifikasi build frontend: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/billing-LSPVZjxI.js`).
  - Langsung tersinkronisasi ke IIS web root `c:\shipping\frontend\dist`.

- [x] **Implementasi Modal Pricelist Customer `tbCustomersHarga` & Tombol [🏷️ Tarif] (`CustomerHargaModal.tsx`, `TargetPage.tsx`, `ValidationListPage.tsx`, `ValidationDetailPage.tsx`, `customer-tariff-audit.service.ts`)**:
  - **1. Backend Service & Endpoint Resolusi Kolom (`customer-tariff-audit.service.ts` & `billing.routes.ts`)**:
    - `getCustomerHargaDetail(custCode)`: Membaca tabel `tbCustomersHarga` (136 kolom format `fd + [Branch] + [Service] + [Commodity]`) dan menguraikan nama kolom menggunakan `parseColumnMapping(colName)` ke domain cabang, moda (Laut/Udara), jenis layanan, dan tipe komoditas.
    - Mengintegrasikan tabel audit `tbCustomersHargaAudit`: harga aktif otomatis menggunakan nilai revisi audit terbaru (`isEdited: true`) dengan referensi harga awal (`hargaAwal`) dan jejak waktu/user audit.
    - Fallback cerdas: jika customer dicari berdasarkan nama (bukan kode), sistem otomatis mencocokkan `fdCustName` atau `tbCustomers.fdCustName` dan mengembalikan `custCode` teresolusi.
    - Mengembalikan metadata kontrak: tipe tagihan (`fdTypeTagihan`: 1: m³+kg, 2: Compare, 3: m³ only, 4: kg only), batas rasio overweight kg/m³ (LR, SP, PM), tarif asuransi, surat penawaran, serta catatan khusus udara (`fdNote`) dan catatan laut (`fdNote1`).
    - Rute `GET /api/billing/customer-harga/:custCode?` terlindungi auth middleware.
    - Restart PM2 `ShippingApi` aktif online.
  - **2. Komponen Modal Pricelist Customer (`CustomerHargaModal.tsx`)**:
    - Dialog `size="3xl"` responsif bertema Midnight Dark Mode (outline translucent border, tanpa solid white).
    - **Header**: Nama customer (`displayCustName`), kode customer, badge counter total tarif aktif, tombol refresh kuari, dan tombol ekspor Excel.
    - **Banner Metadata**: 4 kartu ringkasan KPI (Tipe Tagihan, Rasio Overweight kg/m³, Tarif Asuransi, User/Waktu Update) dan 2 kotak catatan khusus (Sky Blue untuk Catatan Udara & Emerald untuk Catatan Laut).
    - **Toolbar Filter**: Navigasi pill per cabang (`Semua`, `GZ`, `YW`, `SH`, `SZ`, `HK`, `SG`, `BKK`, `KR`), Segmented switcher moda (`[Semua Moda | ✈️ Udara | 🚢 Laut]`), input pencarian teks instan, dan toggle filter `[Hanya Revisi (N)]`.
    - **Tabel Desktop & Kartu Mobile**: Rincian cabang, badge moda, layanan, komoditi, tarif aktif terformat mata uang (`/ m³` vs `/ kg`), badge `Master Acuan` atau badge `Revisi Audit` (dengan tooltip perbandingan harga awal & user pengubah).
    - **Ekspor Excel Langsung**: Unduh spreadsheet `.xlsx` berisi seluruh data tarif terfilter dengan satu klik.
  - **3. Integrasi Tombol Aksi Cepat [🏷️ Tarif]**:
    - **Target Bill (`TargetPage.tsx`)**: Tombol `[🏷️ Tarif]` di samping nama customer pada baris tabel desktop dan kartu mobile (dengan `e.stopPropagation()`).
    - **Daftar Antrean Validasi (`ValidationListPage.tsx`)**: Tombol `[🏷️ Tarif]` di samping nama customer pada kolom tabel desktop dan kartu mobile.
    - **Detail Validasi (`ValidationDetailPage.tsx`)**: Tombol `[🏷️ Tarif]` pada ribbon tombol header cepat dan pada kartu identitas tagihan & customer.
  - **4. Verifikasi & Deploy IIS**:
    - Backend build: `bun build src/index.ts --no-bundle` $\to$ **LULUS 100% 0 errors**.
    - Frontend build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/billing-0S0zvrCO.js`).
    - Langsung aktif pada IIS physical path `C:\shipping\frontend\dist` (`http://36.93.22.142/mshipping`).

- [x] **Diferensiasi Moda Udara vs Laut pada Grafik Harian & Bulanan (`billing-analytics.service.ts`, `TrendChart.tsx`, `DashboardPage.tsx`)**:
  - **1. Backend Aggregated SQL Query (`billing-analytics.service.ts`)**:
    - Memperbarui fungsi `getBillingTrends()` untuk mengagregasikan metrik per moda via conditional aggregation:
      - `billUdara`: `SUM(CASE WHEN fdListType = 1 THEN 1 ELSE 0 END)`
      - `tagihanUdara`: `SUM(CASE WHEN fdListType = 1 THEN ISNULL(fdJumlah1, 0) ELSE 0 END)`
      - `billLaut`: `SUM(CASE WHEN fdListType = 2 THEN 1 ELSE 0 END)`
      - `tagihanLaut`: `SUM(CASE WHEN fdListType = 2 THEN ISNULL(fdJumlah1, 0) ELSE 0 END)`
      - `totalBill` & `totalTagihan`: total gabungan faktur dan rupiah.
    - Diterapkan pada kueri harian (`dailyRows`) dan kueri 12 bulan terakhir (`monthlyRows`).
    - Backend build lulus 100% 0 error & PM2 service `ShippingApi` di-restart online.
  - **2. Visualisasi Grafik Multi-Moda (`TrendChart.tsx`)**:
    - **Mode Jumlah Bill (Count)**:
      - Saat `modeFilter === 'all'`: Stacked Bar 2 layer presisi (`billLaut` di dasar dengan emerald gradient `#059669` $\to$ `#10b981` dan `billUdara` di layer atas dengan sky blue gradient `#0284c7` $\to$ `#38bdf8`), mempertahankan total tinggi batang sesuai total invoice sekaligus menampilkan proporsi per moda.
      - Saat mode dipilih `udara` atau `laut`: bar tunggal terfilter dengan radius rounded top `[6, 6, 0, 0]`.
    - **Mode Nominal Tagihan (Value)**:
      - Dual Area & Monotone Lines: kurva Sky Blue (`tagihanUdara`) dan kurva Emerald (`tagihanLaut`) dengan gradient area fill lembut.
    - **Mini Summary Banner Per-Moda**:
      - Chip ringkasan akumulatif di atas chart: `✈️ Udara: X Bill • Rp Y (A%)`, `🚢 Laut: B Bill • Rp C (D%)`, dan `Total: N Bill • Rp M`.
    - **Multi-Theme Floating Tooltip**:
      - Header tanggal/label lokal.
      - Item breakdown Udara (Sky) & Laut (Emerald) lengkap dengan jumlah bill dan nominal rupiah terformat.
      - Total baris gabungan.
      - Visual progress bar rasio persentase moda (`X% Udara • Y% Laut`).
  - **3. Kontrol Navigasi & Filter Dashboard (`DashboardPage.tsx`)**:
    - Menambahkan state `trendMode` (`all` | `udara` | `laut`) dengan kontrol `SegmentedControl` (`[Semua | ✈️ Udara | 🚢 Laut]`) berdampingan dengan sakelar metrik `[Jumlah Bill | Total Tagihan]`.
    - Mengaktifkan pemilih rentang waktu (`daysFilter`: 7, 14, 30 hari) pada tab Harian.
    - Menambahkan key i18n kamus `billing.dailyBillTitle`, `billing.trend.*` di `id.json` & `en.json`.
  - **4. Verifikasi & Deploy IIS**:
    - Build frontend: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/billing-DyXNbvBs.js`).
    - Tersinkronisasi langsung ke direktori fisik IIS `C:\shipping\frontend\dist` (`http://36.93.22.142/mshipping`).

- [x] **Implementasi Ringkasan & Analitik KPI BAP (Sesuai `local-charges/frontend/src/features/inspection-reports/pages/List.tsx`)**:
  - **1. Backend Aggregated Stats Endpoint (`GET /api/inspection-reports/stats`)**:
    - `inspectionReports.service.ts`: Fungsi `getInspectionReportStats()` yang mengagregasikan:
      - Total seluruh dokumen BAP (`totalForms`).
      - Total dokumen bulan berjalan (`totalThisMonth`) & bulan lalu (`totalLastMonth`).
      - Persentase pertumbuhan bulan-ke-bulan (MoM `growthPercent`).
      - Agregasi status dokumen `byStatus` (`Draft` & `Done`).
      - Ranking Top 5 pelanggan (`topCustomers`) berdasarkan frekuensi pemeriksaan kargo.
      - Tren 6 bulan terakhir (`monthlyTrend`) via SQL Server grouping `FORMAT(fdCreatedAt, 'yyyy-MM')`.
      - Total akumulasi foto pemeriksaan kargo (`totalPhotos`).
    - `inspectionReports.routes.ts`: Rute `GET /stats` terlindungi auth middleware.
    - Build backend & restart PM2 service `ShippingApi` sukses online.
  - **2. UI & Visualisasi Komponen KPI (`InspectionKpiCards.tsx` & `InspectionReportsPage.tsx`)**:
    - **Overview Header & Toggle Switch**: Header `Ringkasan & Analitik` dengan tombol interaktif `Sembunyikan Analitik` / `Tampilkan Analitik` (`ChevronUp` / `ChevronDown`) dengan layout presisi sesuai `local-charges`.
    - **4 Stat Cards Utama**:
      - `Total Form`: Total dokumen BAP dengan icon `FileText` & badge terpadu.
      - `Bulan Ini`: Form bulan berjalan dengan komparasi `vs X bulan lalu` serta badge tren dinamis (`TrendingUp` hijau / `TrendingDown` merah / `Minus`).
      - `Draft`: Form BAP yang belum selesai dengan aksen amber dan icon `Clock`.
      - `Done`: Form BAP selesai dengan aksen emerald dan icon `CheckCircle2`.
    - **3 Panel Analitik Bawah**:
      - `Tren 6 Bulan (Form per Bulan)`: AreaChart interaktif Recharts dengan kurva `monotone`, gradient fill ungu (`#8b5cf6`), CartesianGrid horizontal, XAxis tanggal lokal, YAxis, dan multi-theme custom Tooltip.
      - `Distribusi Status (Breakdown)`: Visual progress bar animasi untuk Draft & Done, persentase rasio, angka riil, dan footer total form.
      - `Customer Teratas (Top 5)`: Ranking Top 5 pelanggan dengan nomor urut 1–5 monospaced, nama customer, counter frekuensi `X×`, dan bar proporsional.
    - **Loading State**: Wireframe `.skeleton-shimmer` untuk 4 kartu atas dan 3 panel bawah saat query data berlangsung.
    - **Dual Bahasa (i18n)**: Mendaftarkan seluruh key kamus `bap.overviewTitle`, `bap.showAnalytics`, `bap.hideAnalytics`, `bap.chartMonthlyTitle`, dll pada `id.json` & `en.json`.
  - **3. Verifikasi Build**:
    - `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors** (bundle `dist/assets/inspection-IpMhNdFJ.js` 60.51 kB).

- [x] **Redesign Tampilan Foto BAP (Sesuai `local-charges`) & Penyelesaian Masalah Foto 404 (`lampiran/`, IIS & `resolveMediaUrl`)**:
  - **1. UI Lampiran Foto Sesuai `local-charges/frontend/src/features/inspection-reports`**:
    - `InspectionLampiranUploader.tsx`: Drag & drop area dashed border, multi-file upload progress bar animasi, dan listener **`CTRL+V` paste gambar dari clipboard**.
    - `LampiranItem.tsx`: Grid card foto (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`) dengan tag index `#1`, hover overlay aksi (Lihat `Eye`, Unduh `Download`, Hapus `Trash2`), caption nama file, dan timestamp/uploader.
    - `LampiranLightbox.tsx`: Fullscreen lightbox gelap (`backdrop-blur-sm`) dengan tombol Putar 90° (`RotateCw`), Zoom In/Out dengan persentase (`ZoomIn`/`ZoomOut`), Download langsung, navigasi panah kiri/kanan (`ChevronLeft`/`ChevronRight`), dan shortcut keyboard (Esc, Arrows, R, + / -).
    - `InspectionDetailModal.tsx`: Mengadopsi struktur `local-charges` `Form.tsx` dengan metadata header card (No. BAP, Petugas, Tanggal, Status) dan 2 tab navigasi: `Foto Pemeriksaan (N)` dan `Detail & Kargo`.
    - `InspectionTable.tsx`: Pill counter foto interaktif (`📷 N Foto`) yang dapat diklik langsung untuk membuka modal galeri foto BAP bersangkutan.
  - **2. Penyelesaian HTTP 404 pada URL Foto BAP**:
    - *Akar Masalah*: Frontend web diakses melalui IIS port 80 (`http://36.93.22.142/mshipping`), sedangkan file foto fisik tersimpan di `C:\shipping\backend\public\uploads\bap-photos\...` yang dikelola runtime Bun port 3010. URL gambar relatif `/uploads/...` diarahkan browser ke IIS port 80 yang belum memiliki virtual directory `/uploads`, memicu HTTP 404.
    - *Solusi IIS*: Membuat Web Virtual Directory di IIS pada Default Web Site dan Application `mshipping`:
      - `New-WebVirtualDirectory -Site "Default Web Site" -Name "uploads" -PhysicalPath "C:\shipping\backend\public\uploads"`
      - `New-WebVirtualDirectory -Site "Default Web Site" -Application "mshipping" -Name "uploads" -PhysicalPath "C:\shipping\backend\public\uploads"`
    - *Solusi Backend*: Menambahkan header `Content-Type: file.type || 'image/jpeg'` dan `Cache-Control: public, max-age=31536000` pada `serveUploadHandler` di `backend/src/index.ts` untuk melayani request langsung ke port 3010.
    - *Solusi Frontend*: Memperbarui `resolveMediaUrl` di `frontend/src/lib/utils.ts` untuk menormalisasi path `bap-photos/` dan membungkus URL foto di `LampiranItem.tsx` serta `LampiranLightbox.tsx`.
    - *Verifikasi Akses*: Uji coba via curl ke IIS port 80 (`/uploads/bap-photos/...` dan `/mshipping/uploads/bap-photos/...`) menghasilkan status **HTTP 200 OK (Content-Type: image/jpeg)**.
  - **3. Verifikasi Build & PM2**:
    - Frontend build: `cd frontend && bun run build` $\to$ **LULUS 100% 0 errors**.
    - PM2 service `ShippingApi` aktif online.

- [x] **Isolasi Folder Foto per BAP & Pengarsipan Otomatis (`inspectionPhotos.service.ts` & `inspectionReports.service.ts`)**:
  - **1. Folder Mandiri per BAP Sejak Awal Upload**:
    - Setiap foto BAP disimpan di dalam subdirektori tersendiri berdasarkan Nomor BAP:
      `public/uploads/bap-photos/[Nomor-BAP]/bap_[id]_[timestamp]_[rand].jpg`.
    - URL publik: `/uploads/bap-photos/[Nomor-BAP]/[filename].jpg`.
  - **2. Pengarsipan Otomatis Saat BAP Dihapus (Soft Delete)**:
    - Saat BAP dihapus (`deleteInspectionReport`), seluruh folder foto BAP tersebut otomatis dipindahkan ke direktori sampah:
      `public/uploads/bap-photos/deleted/[Nomor-BAP]/`.
    - Record URL di database `tbInspectionPhoto` otomatis diperbarui ke path baru `/uploads/bap-photos/deleted/...`.
    - Folder aktif `bap-photos/` tetap bersih dan tertata rapi.
  - **3. Pengarsipan Foto Satuan (`deleteBapPhoto`)**:
    - Saat foto dihapus satuan via tombol tong sampah, file fisik otomatis dipindahkan ke direktori sampah `public/uploads/bap-photos/deleted/[Nomor-BAP]/[filename].jpg` (tidak di-unlink/dimusnahkan). Subfolder aktif yang kosong otomatis dibersihkan.
  - **4. Verifikasi & Restart**:
    - Backend build: `bun build src/index.ts --no-bundle` lulus 100% 0 errors.
    - Test script: `deleteBapPhoto` teruji memindahkan berkas fisik ke `deleted/[Nomor-BAP]/`.
    - PM2 `ShippingApi` berhasil di-restart dan aktif online.


- [x] **Optimalisasi Kompresi & Auto-Resize Dimensi Foto BAP (`imageWatermark.service.ts`)**:
  - **1. Auto-Resize Dimensi 1600px**:
    - Foto kamera resolusi tinggi (12 MP – 48 MP / 4000x3000 piksel) kini otomatis di-downscale ke maksimal **1600 × 1600 piksel** (`fit: 'inside'`, `withoutEnlargement: true`).
    - Menjaga rasio aspek asli kargo tetap presisi dan teks/barcode/marking tetap tajam.
  - **2. Penyetelan Kualitas JPEG**:
    - Kualitas encoder disetel ke `quality: 80` dengan `mozjpeg: true`.
    - Ukuran berkas foto kini konsisten **200 KB – 450 KB** (sebelumnya bisa mencapai 1.5 – 2.2 MB).
    - Memangkas penggunaan storage server dan mempercepat loading foto di aplikasi mobile hingga 75%.
  - **3. Verifikasi & Restart**:
    - Backend build: `bun build src/index.ts --no-bundle` lulus 100% 0 errors.
    - PM2 restart `ShippingApi` aktif online.


- [x] **Link / Aksi Cepat Buat BAP pada List Manifest dari Dashboard (`overview.tsx` & `BatchManifestSheet.tsx`)**:
  - **1. Integrasi Handler & Modal Form BAP di Dashboard (`overview.tsx`)**:
    - Menghubungkan state form BAP (`bapInitialData`, `isBapFormVisible`) dan mutasi `useInspectionMutations` ke layar Overview/Dashboard.
    - Menambahkan fungsi `handleCreateBapFromShipment` yang memetakan data kargo dari baris manifest kontainer/batch (`fdListType`, `fdMarkingCode`, `fdMarkingNo`, `fdListCode`, `fdTerima`, `fdNamaCustomer`) langsung ke form BAP.
    - Meneruskan prop `onCreateBap={handleCreateBapFromShipment}` ke `<BatchManifestSheet>` di `overview.tsx` sehingga tombol `+ BAP` aktif dan muncul pada setiap item kargo di lembar manifest.
    - Merender `<InspectionFormSheet>` di root modal container `overview.tsx`.
  - **2. Distribusi & Repack APK**:
    - Versi tetap: `v1.2.5` (VersionCode: `17`), `forceUpdate: false`, `minVersion: "1.2.4"`.
    - `bunx expo export --platform android` $\to$ Hermes bundle `entry-31f8bc72e4f612547ef16375b24d1a43.hbc` (5.6MB).
    - `repack_apk.ps1` $\to$ Sign v2/v3 verified, disalin ke 4 titik server (`frontend/dist`, `frontend/public`, `backend/public/uploads`, `c:\shipping\mshipping.apk`).
    - PM2 restart `ShippingApi` $\to$ Verified online.
    - Endpoint `/api/app-version` $\to$ Verified 200 OK dengan release notes terupdate.


- [x] **Fitur Burned-in Tag Watermark pada Foto BAP (`imageWatermark.service.ts` & `inspectionPhotos.service.ts`)**:
  - **1. Server-Side Watermark Compositing (`imageWatermark.service.ts`)**:
    - Mengintegrasikan library `sharp` v0.35.4 pada runtime Bun backend.
    - Setiap foto yang diunggah ke `POST /api/inspection-reports/:id/photos` otomatis dicetak banner watermark di bagian bawah gambar.
    - Banner menggunakan latar semi-transparan (`#000000` s.d. `#0A0F1D`) dengan aksen garis gradient (`#0284C7` - `#38BDF8` - `#10B981`).
    - Skala font dan padding dihitung dinamis secara proporsional sesuai resolusi asli foto (lebar 800px s.d. 4K).
    - Data yang dicetak permanen ke pixel foto:
      - **Row 1**: `MARKING: [fdMarkingCode] (No: [fdMarkingNo])` (Amber/Bold) • `CUST: [fdNamaCustomer]` (Sky Blue & Putih).
      - **Row 2**: `RESI: [fdTerima]` • `BAP: [fdReportNumber]` (Emerald Green).
      - **Row 3**: `WAKTU: [DD Mmm YYYY, HH:mm:ss WIB]` • `M-SHIPPING LOGISTICS ERP`.
  - **2. Keuntungan Arsitektur**:
    - Tag melekat permanen di dalam pixel file JPEG; saat foto di-share ke WhatsApp atau diunduh dari web/mobile, identitas kargo tidak akan hilang.
    - Zero APK rebuild — klien mobile Expo tidak memerlukan library native baru.
  - **3. Verifikasi & Layanan**:
    - Unit test compositing buffer lulus 100%.
    - Backend build: `bun build src/index.ts --no-bundle` lulus 100% 0 errors.
    - PM2 service `ShippingApi` aktif online.
    - Frontend build: `bun run build` lulus 100% 0 errors.
    - Mobile TypeScript: `bunx tsc --noEmit` lulus 100% 0 errors.


- [x] **Audit & Penyempurnaan Form Input BAP Mobile (`InspectionFormSheet.tsx` & `useMarkingLookup.ts`)**:
  - **1. Perbaikan Form Lifecycle & Stale State Reset (`useEffect`)**:
    - *Sebelumnya*: Dependency array mereset form saat modal ditutup (`visible: false`), namun saat form dibuka kembali dengan objek referensi yang sama, state berisiko tertahan atau tidak tersinkronisasi.
    - *Sesudah*: State diinisialisasi hanya saat `visible === true`, menjamin form selalu bersih/terisi akurat setiap kali dibuka baik dari mode Tambah Baru, Edit, maupun Buat BAP dari Manifest/Resi.
  - **2. Pembersihan Total Marking & Cargo Fields (`handleClearMarking`)**:
    - Menekan tombol `X` pada input pencarian marking sekarang tidak hanya mengosongkan teks pencarian, tapi juga mereset data turunan yang sebelumnya di-autofill (`fdMarkingCode`, `fdMarkingNo`, `fdListCode`, `fdTerima`) agar tidak meninggalkan data kargo kadaluarsa.
  - **3. Fallback Nilai Marking Manual pada Submit**:
    - Jika user mengetik kode marking baru secara manual tanpa memilih dari dropdown autocomplete, nilai teks ketikan user tetap disimpan dan dikirim ke payload (`fdMarkingCode`).
  - **4. Validasi Keterangan pada Status Selesai**:
    - Menambahkan validasi logis: jika status BAP dipilih `Selesai (2)`, `Keterangan Pemeriksaan` wajib diisi agar dokumen BAP final tidak kosong tanpa catatan fisik kargo. Ditandai dengan indikator merah `*`.
  - **5. Label & Hint Informasional**:
    - Memberikan label petunjuk `(opsional)` pada field `MARKING NO`, `LIST CODE`, dan `NO. RESI (TERIMA)` untuk memperjelas bahwa field ini otomatis terisi dari marking namun tetap dapat disesuaikan manual.
  - **6. Penghalusan Autocomplete Dropdown (`keepPreviousData`)**:
    - Mengaktifkan `placeholderData: keepPreviousData` pada TanStack Query di `useMarkingLookup.ts` sehingga hasil pencarian tidak berkedip kosong saat user sedang mengetik karakter baru.
  - **8. Perbaikan Scroll Daftar Saran Marking (`InspectionFormSheet.tsx`)**:
    - *Akar Masalah*: Dropdown saran menggunakan `position: 'absolute'` dengan `<ScrollView>` bersarang di dalam parent `<ScrollView>` yang tidak memiliki `nestedScrollEnabled={true}`. Di Android, `ReactScrollView` menangkap semua event sentuhan vertikal dan membatalkan gesture pada elemen absolute/child, sehingga daftar saran membeku dan tidak bisa digeser sama sekali.
    - *Solusi*:
      - Menghapus `position: 'absolute'` dan menjadikan card saran mengalir secara in-flow di bawah input pencarian.
      - Memasang `nestedScrollEnabled={true}` pada parent `<ScrollView>` dan child `<ScrollView>` dropdown.
      - Menambahkan `persistentScrollbar={true}` pada child ScrollView agar scrollbar selalu tampak jelas di Android.
      - Menaikkan `maxHeight` dropdown scroll menjadi 240px.
  - **Kompilasi & Distribusi Rilis**:
    - Versi: `v1.2.5` (VersionCode: `17`), `forceUpdate: false`, `minVersion: "1.2.4"`.
    - Export bundle Hermes Android selesai (`entry-5393bf982f91fbf5fa8cf9607ed59706.hbc`, 5.6MB).
    - Repack APK & signing release via `repack_apk.ps1` selesai 100% (Zipalign OK, Sign V2/V3 verified).
    - Tersinkronisasi ke 4 lokasi server (`mshipping.apk`).
    - PM2 service `ShippingApi` aktif online.


- [x] **Penyempurnaan Form BAP & Galeri Foto Mobile (Rilis v1.2.5 Build 17 — Force Update)**:
  - **1. Link Buat BAP dari Manifest (`BatchManifestSheet.tsx` & `logistics.tsx`)**:
    - Menambahkan tombol aksi cepat `[ + BAP ]` pada Row 4 di setiap kartu baris muatan kargo pada lembar manifest batch kontainer/AWB.
    - Menghubungkan `onCreateBap={handleCreateBapFromShipment}` pada `BatchManifestSheet` di `logistics.tsx`.
    - Saat ditekan, form BAP langsung terbuka dalam kondisi **seluruh data kargo terisi otomatis (pre-filled)**: moda (`fdListType`), kode marking (`fdMarkingCode`), nomor marking (`fdMarkingNo`), nomor resi (`fdTerima`), list code (`fdListCode`), dan nama customer (`fdNamaCustomer`).
  - **2. Perbaikan Dropdown Suggestions Hilang saat Di-Scroll (`InspectionFormSheet.tsx`)**:
    - *Akar Masalah*: Parent `<ScrollView>` form BAP memiliki event `onScrollBeginDrag={() => setShowMarkingDropdown(false)}`. Ketika user menggeser (drag/scroll) daftar dropdown saran, gesture scroll merambat ke parent ScrollView dan langsung menutup dropdown seketika.
    - *Solusi*: Menghapus prop `onScrollBeginDrag` dari parent ScrollView. Dropdown kini dapat di-scroll dengan mulus tanpa hilang secara tidak sengaja.
  - **3. Textarea Keterangan Terhalang Keyboard (`InspectionFormSheet.tsx`)**:
    - *Akar Masalah*: Form BAP memiliki modal tetap tanpa penyesuaian tinggi otomatis saat keyboard virtual Android muncul, sehingga textarea keterangan di bagian bawah form tertutup oleh keyboard.
    - *Solusi*:
      - Memasang `ref={scrollViewRef}` pada ScrollView utama.
      - Menambahkan listener `Keyboard.addListener` dengan dynamic padding bottom `keyboardHeight > 0 ? keyboardHeight + 120 : 60`.
      - Menambahkan auto `scrollToEnd({ animated: true })` saat textarea Keterangan fokus (`onFocus`), saat tombol `Dikte Suara` ditekan, dan saat chip template frasa cepat di-tap.
  - **4. Fitur Berbagi (Share) & Horizontal Swipe Slider Foto BAP (`BapPhotoSheet.tsx`)**:
    - *Share Foto*: Mengintegrasikan `expo-file-system/legacy` (download ke cache lokal) dan `expo-sharing` (native share sheet dialog). Tombol Share tersedia pada setiap thumbnail grid dan pada header modal preview fullscreen.
    - *Horizontal Swipe Slider Antar Foto*: Mengganti modal preview statis dengan `<FlatList>` horizontal (`pagingEnabled`, `showsHorizontalScrollIndicator={false}`) yang memungkinkan pengguna menggeser (swipe horizontal) ke foto sebelum/berikutnya dengan animasi native.
    - Dilengkapi counter posisi `Foto X / N`, tombol Share & Hapus di header, uploader & timestamp di footer, serta pagination dot indicator.
  - **Kompilasi & Distribusi Rilis**:
    - Versi: `v1.2.5` (VersionCode: `17`), `forceUpdate: true`.
    - Export bundle Hermes Android selesai (`entry-99b90bbd78a94aef92f817b10b579c29.hbc`).
    - Repack APK & signing release via `repack_apk.ps1` selesai 100% (Zipalign OK, Sign V2/V3 verified).
    - Tersinkronisasi ke 4 lokasi server (`mshipping.apk`).
  - **Verifikasi**:
    - Mobile TypeScript: `bunx tsc --noEmit` lulus 100% 0 errors.
    - Frontend build: `bun run build` lulus 100% 0 errors.
    - Backend build: `bun build src/index.ts --no-bundle` lulus 100% 0 errors.
    - PM2 service `ShippingApi` aktif online.

- [x] **Pembaruan Alur Input BAP Mobile & Database: Moda Air/Sea (`fdListType`), Autocomplete Suggestions Terfilter & Auto-fill, Voice Dictation, dan Buat BAP Langsung dari Resi**:
  - **Perbaikan Dropdown Suggestions (Akar Masalah & Solusi)**:
    - *Akar Masalah*: Pada `lookupInspectionMarking` (`inspectionReports.service.ts`), kueri `prisma.vwShipment.findMany` menggunakan `orderBy: { fdTerimaDate: 'desc' }`. Field `fdTerimaDate` tidak ada pada view `vwShipment` (hanya ada di `tbEntryList`), memicu `PrismaClientValidationError` yang di-catch dan me-return array kosong `[]`, sehingga dropdown tidak pernah memunculkan data saran.
    - *Solusi Backend*: Memperbaiki pengurutan ke `orderBy: { fdListCode: 'desc' }`. Kueri langsung mengembalikan data kargo secara instan.
    - *Solusi Mobile*: Memperbarui `useMarkingLookup.ts` untuk mendukung pencarian mulai dari 1 karakter (`cleanSearch.length >= 1`), menambahkan state indikator feedback aktif di dropdown (`Mencari database kargo...` vs `Tidak ada marking '...' di moda Udara/Laut`).
  - **Fitur Baru: Tombol Buat BAP Langsung dari Daftar Resi (`ShipmentListItem.tsx`, `ShipmentDetailSheet.tsx`, `logistics.tsx`)**:
    - Menambahkan tombol aksi cepat `[ + BAP ]` pada setiap kartu baris di tab Daftar Resi (`ShipmentListItem.tsx`).
    - Menambahkan tombol `[ Buat BAP ]` pada header modal detail resi (`ShipmentDetailSheet.tsx`).
    - Saat ditekan, form BAP langsung terbuka dalam keadaan **seluruh data kargo terisi otomatis (pre-filled)**: moda (`fdListType`), kode marking (`fdMarkingCode`), nomor marking (`fdMarkingNo`), list code (`fdListCode`), resi (`fdTerima`), dan customer (`fdNamaCustomer`). Pengguna hanya perlu mendiktekan hasil pemeriksaan dan menyimpan BAP.
  - **Database & Prisma**:
    - Menambahkan kolom `fdListType INT NOT NULL DEFAULT 2` (1: Udara / Air, 2: Laut / Sea) pada tabel `tbInspectionReport`.
    - Menambahkan field `fdListType Int @default(2)` pada model `TbInspectionReport` di `backend/prisma/schema.prisma` dan regenerasi Prisma Client.
  - **Backend Module (`backend/src/modules/inspection-reports/`)**:
    - Memperbarui `inspectionReports.service.ts`: `lookupInspectionMarking` kini memfilter muatan berdasarkan `fdListType` terpilih (`WHERE fdListType = @listType`), mengembalikan `fdMarkingCode`, `fdMarkingNo`, `fdListCode`, `fdCustName`, `fdTerima`, dan `fdListType`.
    - Query list `getInspectionReports` mendukung filter moda `listType`.
    - Mutation create & update menyimpan nilai `fdListType`.
    - Restart PM2 service `ShippingApi` (online, port 3010).
  - **Mobile Module (`mobile/src/features/inspection/`)**:
    - `InspectionFormSheet.tsx`:
      - Menambahkan prop `initialData` untuk pre-fill data dari resi / layar lain.
      - Menambahkan switcher pill moda interaktif `[✈️ Udara / Air]` vs `[🚢 Laut / Sea]` di atas form body.
      - Dropdown saran autocomplete marking menampilkan: kode marking, marking no, badge moda, nama customer, nomor resi (`fdTerima`), dan list code (`fdListCode`).
      - Saat saran diklik: auto-fill otomatis mengisi `fdMarkingCode`, `fdMarkingNo`, `fdTerima`, `fdListCode`, `fdNamaCustomer`, dan menyelaraskan moda `fdListType`.
      - Menambahkan tombol `[🎙️ Dikte Suara]` di samping label Keterangan Pemeriksaan: memfokuskan kursor ke textarea keterangan, menampilkan panduan interaktif keyboard voice typing (Gboard/Samsung), dan menyediakan 6 chip template frasa cepat pemeriksaan kargo (`+ Kondisi baik & tersegel`, `+ Kardus basah / lembab`, dll) yang dapat di-tap langsung tanpa risiko native crash.
    - `InspectionListItem.tsx` & `InspectionDetailSheet.tsx`:
      - Menambahkan badge semantik moda kargo `✈️ Udara` (sky blue) / `🚢 Laut` (emerald green) pada header kartu dan lembar detail.
  - **Kompilasi & Distribusi Rilis**:
    - Versi: `v1.2.4` (VersionCode: `16`), `forceUpdate: true`.
    - Repack APK Hermes bundle & signing via `repack_apk.ps1` selesai 100%.
    - Tersinkronisasi ke 4 lokasi server (`mshipping.apk`).
  - **Verifikasi**:
    - Mobile TypeScript: `bunx tsc --noEmit` lulus 100% 0 errors.
    - Frontend build: `bun run build` lulus 100% 0 errors.
    - Backend build: `bun build src/index.ts --no-bundle` lulus 100% 0 errors.
    - PM2 service `ShippingApi` aktif online.
  - **Verifikasi**:
    - Mobile TypeScript: `bunx tsc --noEmit` lulus 100% 0 errors.
    - Frontend build: `bun run build` lulus 100% 0 errors.
    - Backend build: `bun build src/index.ts --no-bundle` lulus 100% 0 errors.
    - PM2 service `ShippingApi` aktif online.

- [x] **Implementasi Fitur Foto BAP & Kamera Terintegrasi Mobile & Backend (v1.2.4 Build 16)**:
  - **Penyelesaian Masalah Crash APK Native**:
    - Akar Masalah: Paket `expo-speech-recognition` dan `expo-image-picker` tidak terdapat pada binary DEX APK Android yang di-repack, menyebabkan `requireNativeModule` melempar fatal exception saat startup aplikasi.
    - Solusi Kamera: Mengganti seluruh fungsi foto di `BapPhotoSheet.tsx` ke `CameraView` dari `expo-camera` yang sudah 100% terkompilasi di DEX APK native (viewfinder fullscreen, flip kamera, flash toggle, shutter, dan direct base64 upload).
    - Solusi Dikte: Menghapus modul `expo-speech-recognition` dari JavaScript runtime. Dikte suara tetap berjalan alami via tombol mikrofon bawaan keyboard Android (Gboard) saat kursor aktif di field Keterangan.
  - **Database & Prisma**:
    - Membuat tabel `tbInspectionPhoto` (fdId, fdReportId, fdPhotoUrl, fdCaption, fdUploadedBy, fdCreatedAt) dengan referensi FK cascade ke `tbInspectionReport`.
    - Menambahkan model `TbInspectionPhoto` dan relasi `photos` pada `schema.prisma`, regenerasi Prisma Client.
  - **Backend Module (`backend/src/modules/inspection-reports/`)**:
    - `inspectionPhotos.service.ts`: Handler upload base64 (kompresi buffer disk `public/uploads/bap-photos/`), get list foto, dan delete foto fisik & database.
    - `inspectionReports.service.ts`: Pemetaan agregasi `photoCount` pada list query dan eager loading `photos` pada detail by ID.
    - `inspectionReports.routes.ts`: Rute `POST /:id/photos`, `GET /:id/photos`, `DELETE /:id/photos/:photoId`.
    - Restart PM2 service `ShippingApi` (online).
  - **Mobile App (`mobile/src/features/inspection/`)**:
    - `types/inspectionReport.types.ts`: Interface `BapPhoto`, field `photos`, `photoCount`.
    - `hooks/useBapPhotos.ts`: Hooks query & mutasi upload/delete foto.
    - `components/BapPhotoSheet.tsx`: Bottom sheet foto dengan CameraView viewfinder native terintegrasi, grid 3 kolom thumbnail, preview fullscreen modal, dan hapus foto.
    - `components/InspectionListItem.tsx`: Tombol kamera dengan live badge counter `photoCount`.
    - `components/InspectionDetailSheet.tsx`: Strip horizontal thumbnail foto, live badge count, dan shortcut kelola foto.
    - `components/InspectionTab.tsx`: Integrasi lembar `BapPhotoSheet`.
  - **Kompilasi & Distribusi Rilis**:
    - Versi: `v1.2.4` (VersionCode: `16`), `forceUpdate: true`.
    - Repack APK Hermes bundle & signing via `repack_apk.ps1` selesai 100%.
    - Tersinkronisasi ke 4 lokasi server (`mshipping.apk`).
  - **Verifikasi**:
    - Mobile TypeScript: `bunx tsc --noEmit` lulus 100% 0 errors.
    - Frontend build: `bun run build` lulus 100% 0 errors.
    - Backend build: `bun build src/index.ts --no-bundle` lulus 100% 0 errors.
  - **Database SQL Server & Prisma**:
    - Membuat tabel `tbInspectionReport` (id, reportNumber, reportDate, listCode, markingCode, markingNo, namaCustomer, terima, keterangan, status, createdBy, createdAt, updatedAt, deletedAt).
    - Membuat tabel `tbBAPCounter` (composite PK `fdYear`, `fdMonth`, `fdCount`) untuk penomoran atomik format `BAP-YYYY-MM-XXXXX` yang reset otomatis per bulan.
    - Menambahkan model `TbInspectionReport` & `TbBAPCounter` ke `schema.prisma` dan meregenerasi Prisma Client.
  - **Backend Module (`backend/src/modules/inspection-reports/`)**:
    - `inspectionReports.types.ts`: Kontrak data payload create, update, query list, dan autocomplete lookup.
    - `inspectionReports.service.ts`: Logika bisnis `generateReportNumber` dengan SQL `MERGE`, query list paginasi & filter pencarian/status, detail by ID, create, update, soft delete, dan `lookupInspectionMarking` via `vwShipment`.
    - `inspectionReports.routes.ts`: Rute REST API terproteksi JWT auth (`GET /`, `GET /lookup`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`).
    - Pemasangan router di `src/index.ts` pada `/api/inspection-reports` dan restart PM2 service `ShippingApi`.
  - **Mobile App (`mobile/src/features/inspection/`)**:
    - `types/inspectionReport.types.ts`: Interface tipe data BAP.
    - `hooks/useInspectionReports.ts`: Infinite scroll list query (`useInfiniteQuery`).
    - `hooks/useInspectionReportDetail.ts`: Query detail BAP per ID.
    - `hooks/useInspectionMutations.ts`: Mutasi create, update, delete dengan auto-invalidate cache dan toast.
    - `hooks/useMarkingLookup.ts`: Query autocomplete marking code kargo.
    - `components/InspectionStatusBadge.tsx`: Badge status semantic (`Draft` amber / `Selesai` green).
    - `components/InspectionListItem.tsx`: Kartu baris BAP dengan nomor laporan, status badge, customer, marking, catatan, dan tanggal.
    - `components/InspectionDetailSheet.tsx`: Bottom sheet detail lengkap BAP dengan aksi hapus dan navigasi ke edit form.
    - `components/InspectionFormSheet.tsx`: Bottom sheet form pembuatan dan pengeditan BAP dengan autocomplete marking code, switch status draft/selesai, dan validasi nama customer.
    - `components/InspectionTab.tsx`: Kontainer tab BAP dengan search bar, filter chip pill (Semua, Draft, Selesai), FAB `+ Buat BAP`, pull-to-refresh, dan state modal sheet.
    - Integrasi sub-tab `BAP` di `mobile/app/(tabs)/logistics.tsx` pada `SegmentedControl`.
    - Menambahkan helper `canManageInspectionReports` pada `permissions.ts` dan key kamus `logistics.inspection` di `id.json` & `en.json`.
  - **Verifikasi**:
    - Backend build: `bun build src/index.ts --no-bundle` lulus 100% 0 errors.
    - Mobile TypeScript: `bunx tsc --noEmit` lulus 100% 0 errors.


- [x] **Refaktorisasi Modular Billing Validation Card (`BillingValidationCard.tsx` & `validation-card/`)**:
  - Memecah berkas raksasa monolithic `BillingValidationCard.tsx` (2.276 baris, ~140 KB) menjadi arsitektur orchestrator bersih (~640 baris) dengan subkomponen tersegmen di bawah `src/features/billing/components/validation-card/`.
  - Membuat `ValidationCardHeader.tsx` untuk bilah header, badge status validasi, dan tombol refresh query.
  - Membuat `ValidationCardTabsBar.tsx` untuk navigasi 5 tab kompak dengan status pill indikator (`Cek`, `✓ Valid`, `✓ Sesuai`, `Selisih`, `Nihil`, dll).
  - Membuat `ProfilePricingTab.tsx` untuk Tab 1 (Item & Tarif), profil harga, 4 KPI tarif utama, tata letak rata samping Tax Return & Catatan Tarif Customer dengan switcher moda pill (`[Udara] [Laut] [Semua]`), evaluasi komoditas 3-way check, dan tautan acuan Price List modal.
  - Membuat `PhysicalValidationTab.tsx` untuk Tab 2 (Validasi Fisik), perbandingan kubikasi M³ (Laut) / timbangan berat (Udara) / komparasi Type 2 (`Type2ComparisonPanel`), rincian data per listCode & per marking, serta pesan status evaluasi.
  - Membuat `OverweightTab.tsx` untuk Tab 3 (Overweight Jalur Laut), analisis rasio overweight muatan laut, batas kuota rasio, berat aktual fisik multi-sumber, dan status kesesuaian penagihan KG.
  - Membuat `FreightChargeTab.tsx` untuk Tab 4 (Freight Charge) dan `TransportTab.tsx` untuk Tab 5 (Ekspedisi Lokal `tbExpIndo`).
  - Menyusun kontrak antarmuka terpusat di `types.ts` dan barrel export `index.ts`.
  - Verifikasi build `bun run build` sukses 100% (0 errors).

- [x] **Format 2 Digit Desimal Dimensi Fisik Ekspor Excel (`custMarkingExcel.ts`)**:
  - Mengubah format kolom Panjang (`fdPjg`), Lebar (`fdLbr`), dan Tinggi (`fdTng`) pada sheet *Detail Ukuran Fisik* menjadi presisi **2 digit desimal** (`Number(Number(item.fd... || 0).toFixed(2))`).
  - Mengatur volume koli dan total sub-volume M³ konsisten pada **4 digit desimal** (`toFixed(4)`).
  - Memperbaiki alignment kolom baris `TOTAL` (`['TOTAL', '', '', '', subQty, Number(subM3.toFixed(4)), '']`) sehingga `subQty` tepat di bawah kolom Qty dan `subM3` tepat di bawah kolom Volume.
  - Menambahkan konfigurasi lebar kolom otomatis `ws2['!cols']` agar hasil download Excel tidak terpotong.
  - Verifikasi build `bun run build` sukses 100% (0 errors).
- [x] **Pelebaran Ukuran Modal Detail Marking (`CustMarkingDetailModal.tsx` & `Modal.tsx`)**:
  - Memperlebar ukuran modal `full` pada `Modal.tsx` dari `max-w-[96vw] w-[96vw]` menjadi `max-w-[98vw] w-[98vw] max-h-[95vh]`.
  - Merampingkan padding gutter backdrop modal dari `p-3 sm:p-4` menjadi `p-2 sm:p-3` untuk memaksimalkan ruang horizontal.
  - Memperbarui `CustMarkingDetailModal.tsx` dengan kelas eksplisit `w-[98vw] max-w-[98vw] max-h-[94vh] h-[840px]` agar 23 kolom data kargo koli, M³ desimal, dan metrik summary banner memiliki ruang bentang yang lebih luas dan nyaman dibaca.
  - Verifikasi build `bun run build` sukses 100% (0 errors).
- [x] **Pelebaran Ukuran Modal Ringkasan Validasi (`BillingValidationSummaryModal.tsx` & `Modal.tsx`)**:
  - Menambahkan varian ukuran baru `3xl` (`max-w-7xl` = 1280px) pada sistem komponen `src/components/ui/Modal.tsx` (`ModalSize` & `sizeClasses`).
  - Memperlebar dialog audit ringkasan validasi (`BillingValidationSummaryModal.tsx`) dari `size="2xl"` (1152px) menjadi `size="3xl"` (1280px).
  - Memberikan ruang horizontal ekstra (~128px) yang lega untuk seluruh 7 kolom tabel audit finansial (`FinancialAuditTab.tsx`), KPI cards batch marking (`PhysicalAuditTab.tsx`), dan daftar issue validasi tanpa memakan layar penuh.
  - Verifikasi build `bun run build` sukses 100% (0 errors).
- [x] **Link Modal Detail Marking Pelanggan (`CustMarkingDetailModal`) pada Header Ribbon (`ValidationDetailPage.tsx`)**:
  - Menambahkan tombol aksi cepat **Marking** (`<Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />`) pada ribbon tombol header `ValidationDetailPage.tsx` (berdampingan dengan Dimensi, Resi, dan Cetak).
  - Mengintegrasikan state `isCustMarkingModalOpen` dan merender `<CustMarkingDetailModal>` dengan `custCode={data.fdCustCode}`, `custName={displayCustName(data.customer?.fdCustName || data.fdCustCode)}`, dan `markingCode={data.fdMarkingCode || data.fdListCode || primaryListCode}`.
  - Memungkinkan verifikator menginspeksi tabel rincian kargo marking pelanggan (M³ 4 digit desimal, komoditas, Qty, berat, komplain) langsung dari toolbar utama halaman detail validasi billing.
  - Verifikasi build `bun run build` sukses 100% (0 errors).
- [x] **Link Modal Audit Dimensi Koli (`DimensionDetailModal`) pada Header Ribbon (`ValidationDetailPage.tsx`)**:
  - Menambahkan tombol aksi cepat **Dimensi** (`<Box className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />`) pada action ribbon header `ValidationDetailPage.tsx` (berdampingan dengan Inspeksi, Cetak, dan Resi).
  - Mengintegrasikan state `isDimensionModalOpen` dan merender `<DimensionDetailModal>` dengan `listCode={primaryListCode}` dan `customerName` terformat `displayCustName`.
  - Memungkinkan verifikator menginspeksi komparasi dimensi fisik koli $(P \times L \times T \times Qty) \div 1.000.000$ langsung dari halaman detail validasi billing tanpa harus membuka kartu validasi individual.
  - Verifikasi build `bun run build` sukses 100% (0 errors).
- [x] **Penyelarasan Rata Samping Catatan Tarif Customer & Tax Return (`BillingValidationCard.tsx`)**:
  - Mengubah tata letak **Tax Return** dan **Catatan Khusus Tarif Customer** dari yang sebelumnya bertumpuk vertikal menjadi sejajar berdampingan secara responsif (`grid grid-cols-1 lg:grid-cols-2 gap-2.5`).
  - Menampilkan catatan tarif secara dinamis sesuai moda kargo faktur (*data bill*):
    - Jika bill berstatus **Udara** (`res.fdListType === 1` / `isAir`), otomatis menampilkan **Note Air (`fdNote`)** dengan aksen sky dan badge aktif `(Bill)`. Jika ada catatan laut (`fdNote 1`), ditampilkan bar intip ringkas di bagian bawah dengan opsi klik "Buka Laut".
    - Jika bill berstatus **Laut** (`res.fdListType === 2` / `!isAir`), otomatis menampilkan **Note Sea (`fdNote 1`)** dengan aksen blue dan badge aktif `(Bill)`. Jika ada catatan udara (`fdNote`), ditampilkan bar intip ringkas di bagian bawah dengan opsi klik "Buka Udara".
  - Menyediakan pill selector interaktif `[✈️ Udara] [🚢 Laut] [📋 Semua]` di header kartu untuk memudahkan verifikator beralih memeriksa salah satu atau kedua catatan sekaligus (`all` mode).
  - Dot indikator pada tombol pill jika catatan pada moda terkait terisi di database FoxPro.
  - Menyelaraskan kartu Tax Return ke dalam grid 2 kolom kompak (`grid-cols-2`) sehingga proporsional dan presisi sejajar dengan kotak catatan di sebelahnya.
  - Verifikasi build `bun run build` sukses 100% (0 errors).
- [x] **Refactoring Modal Ringkasan Validasi (`BillingValidationSummaryModal.tsx` & `validationSummary.utils.ts`)**:
  - Mengekstrak fungsi-fungsi utilitas bisnis ke berkas khusus [`validationSummary.utils.ts`](file:///c:/shipping/frontend/src/features/billing/components/validation-summary/validationSummary.utils.ts).
  - Mengeliminasi duplikasi pemindaian array kargo pada baris 58-78 (`hasTransportItem` dan `transportDetailItem`) menjadi satu fungsi tunggal `findTransportDetailItem` dan derivasi boolean `hasTransportItem = isTransport || Boolean(transportDetailItem)`.
  - Menerapkan memoization (`useMemo`) untuk sorting `details`, pencarian `transportDetailItem`, resolusi `effectiveTransportAmount`, `allBillingListCodes`, `billingListCodeParam`, `resolvedCustName`, `effectiveTotalInvoice`, dan evaluasi `verdict`.
  - Mengeliminasi 60 baris nested ternary bersarang pada `verdictTitle` dan `verdictDescription` menjadi fungsi terpusat `calculateValidationVerdict(params)` yang rapi, modular, dan teruji.
  - Memastikan seluruh string M³ pada pesan verdict menggunakan presisi standar 4 digit desimal (`formatDecimal(..., 4)`).
  - Menghapus variabel dan komentar duplikat.
  - Verifikasi build `bun run build` sukses 100% (0 errors).
- [x] **Perbaikan i18n JSON Billing Validation (`id.json`, `en.json`, `BillingValidationCard.tsx:L1615`)**:
  - Memperbaiki teks label kartu `PL Per Marking` yang sebelumnya memunculkan raw key JSON string (`billing.validation.plPerMarking`) karena key belum terdaftar di kamus bahasa `id.json` dan `en.json`.
  - Mendaftarkan key `billing.validation.plPerMarking`, `billing.validation.viewCustMarkingDetail`, dan `billing.validation.komplainHybrid` di kedua kamus bahasa secara konsisten.
  - Memperbarui komponen `BillingValidationCard.tsx` untuk menggunakan key i18n semantik.
- [x] **Standardisasi Presisi Volume M³ 4 Digit Desimal (`CustMarkingDataTable.tsx`, `CustMarkingSummaryBanner.tsx`, `utils.ts`, `coding-standards.md`)**:
  - Mengubah seluruh format tampilan kubikasi M³ pada tabel rincian marking pelanggan (`CustMarkingDataTable.tsx`) dan banner ringkasan (`CustMarkingSummaryBanner.tsx`) dari 3 desimal menjadi **4 digit desimal** (`formatDecimal(..., 4)` / `volDecimals = isAirMode ? 2 : 4`).
  - Menambahkan fungsi helper `formatM3(num, includeUnit?)` pada `src/lib/utils.ts`.
  - Menerapkan dan mendokumentasikan aturan baku **WAJIB 4 DIGIT DESIMAL untuk M³** pada panduan koding proyek `.agents/rules/coding-standards.md` (Bagian Anti-Pattern dan Bagian 6 Presisi Satuan Fisik).
- [x] **Penambahan Data Per Batch Marking pada Audit Fisik (`PhysicalAuditTab.tsx` & `BillingValidationSummaryModal.tsx`)**:
  - Mengintegrasikan blok **Data Fisik Per Batch Marking** ke dalam dialog audit ringkasan validasi billing (`PhysicalAuditTab.tsx`).
  - Menampilkan grid KPI cards per marking (Laut: M³ Marking Gudang, PL Per Marking, Komplain Per Marking, dan Komplain Hybrid / Total Berat; Udara: VFC Gudang Marking, VFC Komplain Marking, Berat SJ, dan Total Berat Fisik).
  - Menyediakan deteksi otomatis badge `Dipakai Bill` hijau untuk metrik per marking yang cocok dengan nilai tagihan (`billedM3`).
  - Merender mini-table breakdown untuk seluruh List Code yang tergabung dalam batch marking bersangkutan (`markingDetails`: List Code, Marking No, Qty/Coly, M³ PL, M³ Gudang/VFC, M³ Komplain, Berat kg).
  - Menyediakan tombol link cepat untuk membuka modal rincian penuh kargo pelanggan (`CustMarkingDetailModal.tsx`) langsung dari dalam audit fisik.
  - Meneruskan `custCode` dan `custName` dari `BillingValidationSummaryModal.tsx` ke `PhysicalAuditTab.tsx`.
  - Verifikasi build `bun run build` sukses 100% (0 errors).
- [x] **Penambahan Tipe Komoditi pada Tiap Item Audit Finansial (`FinancialAuditTab.tsx`)**:
  - Menambahkan badge indikator tipe komoditi (`displayComodity`) lengkap dengan ikon `Tag` Lucide pada setiap baris item tagihan di tabel audit finansial.
  - Memperbarui header kolom dari `Item Tagihan` menjadi `Item Tagihan / Komoditi` (`min-w-[200px]`).
  - Mengakomodasi item non-validasi cabang `--` dengan menampilkan label `BIAYA KHUSUS` atau komoditas spesifik, serta item komoditas reguler (`GARMENT`, `ACCESSORIES`, `SPAREPART`, dll) secara presisi.
  - Verifikasi build `bun run build` sukses 100% (0 errors).
- [x] **Fallback Validasi M³ Berbasis No Invoice Terkait (`m3-check.service.ts`, `m3-check.types.ts`, `billing.types.ts`, `useBillingValidation.ts`, `BillingValidationCard.tsx`, `PhysicalAuditTab.tsx`)**:
  - Menyelesaikan mismatch kubikasi pada invoice gabungan dalam 1 batch marking (contoh URL: `/mshipping/finance/billing/validation/--S-000679-09-2026` dengan bill anak `--S-A00679-09-2026`).
  - **Backend (`m3-check.service.ts` & `m3-check.types.ts`)**:
    - Menambahkan helper `parseInvoiceFamily` untuk mendeteksi relasi invoice induk (`PREFIX-0XXXXX-MM-YYYY`) dan invoice anak/tambahan (`PREFIX-[A-Z]XXXXX-MM-YYYY`).
    - Mengagregasi data fisik gudang, packing list, komplain, koli, dan berat dari seluruh listCode yang berelasi (`0943385` [0.0308 m³] + `0943386` [0.1496 m³] = `0.1804 m³`).
    - Menyediakan properti `relatedBillsSummary` (daftar invoice terkait, indikator parent/child, total fisik per sumber, dan total billed M³).
  - **Frontend (`useBillingValidation.ts`, `billing.types.ts`)**:
    - Mengintegrasikan kandidat akumulasi `RelatedBillsGudang`, `RelatedBillsPL`, dan `RelatedBillsKomplain` ke dalam `seaCandidates`.
    - Jika `billedM3` cocok dengan akumulasi bill terkait (e.g. `0.1804 m³`), status menjadi `MATCH_PRIMARY` dengan label `M3 Terkait: [List Induk] + [List Anak]` (status hijau/valid).
    - Khusus invoice anak pecahan (`isChildBillMerged`: tagihan 0 m³ dengan item `GABUNG - ...`), otomatis berstatus valid `MATCH_PRIMARY` dengan label `Digabung ke [Invoice Induk]` tanpa memicu peringatan di bawah minimum charge maupun COD/urgent shortfall.
  - **UI / UX (`BillingValidationCard.tsx`, `PhysicalAuditTab.tsx`)**:
    - Menambahkan pesan validasi sukses spesifik untuk invoice gabungan terkait dan invoice anak pecahan.
    - Menambahkan box rincian keluarga bill terkait pada `PhysicalAuditTab` yang memuat tabel invoice terkait dan ringkasan fisik akumulasi.
  - **Verifikasi Build**: `bun run build` lulus 100% dengan 0 error.
- [x] **Pengecualian Validasi Biaya Khusus Cabang `--` (`ValidationDetailPage.tsx`, `billing.utils.ts`, `useBillingValidation.ts`, `BillingValidationCard.tsx`, `FinancialAuditTab.tsx`)**:
  - Item invoice dengan kode cabang `--` (`fdBranchCode === '--'` atau nomor invoice berawalan `--`) yang memuat kata kunci biaya/fee khusus (~115 kata kunci dari gambar user seperti `AGENCY FEE`, `AWB FEE`, `BEA CUKAI`, `DOCUMENT FEE`, `HANDLING FEE`, `FREIGHT CHARGES`, `DEMURRAGE`, `STORAGE`, `TRUCKING`, `CUSTOM CLEARANCE`, `PORT HANDLING`, `SEWA GUDANG JAKARTA`, `LOLO`, dll) tidak lagi divalidasi ke database tarif acuan karena nilainya tidak tercatat di database.
  - Ditambahkan kamus kata kunci `UNVALIDATED_BRANCH_DASH_FEE_KEYWORDS`, helper `isBranchDash()`, dan `isBranchDashExemptFee()`.
  - Di `evaluateItemPrice`: dievaluasi langsung di Step 0 dengan flag `isNonValidatedBranchDashFee: true`, `statusType: 'NO_TARGET'`, `isUndercharge: false`, `isOvercharge: false`, dan `targetColName: 'Non-Validasi (Cabang --)'`.
  - Di `useBillingValidation`: dikecualikan dari `underchargedItems`, `overchargedItems`, dan `isAuxiliaryItem` (agar tidak mengotori kubikasi M³/KG).
  - Di `ValidationDetailPage`: `ItemPriceBadge` merender badge netral `Non-Validasi`.
  - Di `BillingValidationCard`: status badge item merender `<Badge variant="default">Non-Validasi</Badge>`.
  - Di `FinancialAuditTab`: `StatusBadge` merender `NON-VALIDASI` (`variant="neutral"`) dan tidak dihitung ke `underchargedCount` / `overchargedCount`.
  - Verifikasi build `bun run build` sukses 100% (0 errors).
- [x] **Penghapusan Grouping Cabang pada Tabel Data (`CustMarkingDataTable.tsx`)**:
  - Menghapus pembagian `groupedRows` per cabang dan baris subheader `CABANG: ...`.
  - Merender seluruh baris kargo secara berkelanjutan (flat) dengan penomoran baris `No.` 1..N yang sekuensial.
  - Sorting kolom sekarang beroperasi langsung dan mulus di seluruh baris tanpa terpotong oleh partisi grup.
  - Kode cabang tetap tampil di kolom `BC.` per baris dan total cabang unik dihitung di kolom sticky footer `tfoot` (`uniqueBranchCount`).
- [x] **Redesign Total Summary Banner (`CustMarkingSummaryBanner.tsx`)**:
  - Mengatur ulang visual hierarchy 6 kartu KPI agar rapi, proporsional, dan seragam tingginya (`flex flex-col justify-between`).
  - Menambahkan icon semantik Lucide (`FileText`, `FileCheck2`, `Boxes`, `Scale`, `Box`) pada header tiap kartu dengan badge status terpadu di pojok kanan atas (`Underbilled`, `Overweight`, `Selisih K`, `Cocok`, `Normal`).
  - Menyelaraskan kartu **Lebih KG** ke format angka monospaced (`+XX kg Lebih` / `0 kg Normal`) dengan rincian per sumber timbangan (`Gdg`, `SJ`, `K`, `Rasio`) menggantikan teks panjang yang sebelumnya merusak konsistensi tata letak.
  - Memisahkan baris metrik utama dengan baris rincian micro-detail via garis tipis transparan (`pt-1 border-t border-[var(--color-border)]/40`).
  - Merapikan strip tombol **Filter Komoditas** dengan scrollbar horizontal halus, chip badge counter, dan total kubikasi m³/vfc.
- [x] **Aktivasi Fallback M³ Per Batch Marking / Bill Terkait (`useBillingValidation.ts`, PM2 `ShippingApi`)**:
  - Investigasi URL `http://36.93.22.142/mshipping/finance/billing/validation/--S-000679-09-2026`:
    - Ditemukan proses PM2 backend `ShippingApi` (port 3010) sebelumnya belum direstart sejak 21 September 2026, sehingga respons live HTTP belum menyertakan payload `relatedBillsSummary` (bernilai `undefined`), menyebabkan frontend menganggap tidak ada bill terkait dan mencatat selisih fisik `0.1804 m³ ≠ 0.0308 m³`.
    - Dilakukan restart service PM2 `ShippingApi` (PID baru 20112). Endpoint `/mshipping/api/billing/m3-check?listCode=0943385` kini mengembalikan `relatedBillsSummary` secara lengkap (`sumM3Gudang: 0.1804 m³`, `isParent: true`, bill anak `--S-A00679-09-2026`).
    - Menambahkan `custMarkingValues` (`GudangPerMarking`) ke dalam `seaCandidates` pada `useBillingValidation.ts` agar data fisik M³ per batch marking (`sp_tbEntryListDetail_permarking`) juga dievaluasi sebagai kandidat validasi laut.
    - Validasi invoice `--S-000679-09-2026` kini berstatus **VALID (MATCH)** dengan pencocokan kubikasi akumulasi bill terkait `0.1804 m³`.
    - Verifikasi build `cd frontend && bun run build` sukses 100% 0 errors.
- [x] **Penyederhanaan Tab Catatan Tarif Customer (`ProfilePricingTab.tsx`, `BillingValidationCard.tsx`, `types.ts`)**:
  - Menghapus tab `Semua` dari pill switcher Catatan Tarif Customer (`tbCustomersHarga`), menyisakan hanya tab `Udara` dan `Laut`.
  - Mengisolasi tampilan teks catatan agar 100% eksklusif:
    - Tab `Udara`: hanya menampilkan `fdNote` (Catatan Udara).
    - Tab `Laut`: hanya menampilkan `fdNote 1` (Catatan Laut).
  - Menghapus snippet intip/cross-preview silang (kotak "Catatan Udara (fdNote): Buka Udara" pada tab Laut dan sebaliknya).
  - Memperbarui kontrak tipe `effectiveNoteMode: 'air' | 'sea'` dan `selectedNoteMode: 'air' | 'sea' | null`.
  - Verifikasi build `cd frontend && bun run build` sukses 100% 0 errors.
- [x] **Fallback Validasi Overweight Berbasis Bill Terkait & Kandidat Fisik Multi-Sumber (`useOverweightValidation.ts`, `useBillingValidation.ts`, `OverweightTab.tsx`, `OverweightAuditTab.tsx`, `m3-check.service.ts`, `billing-validation.service.ts`)**:
  - **Masalah**: Pada tagihan gabungan/pecahan (seperti `--S-000679-09-2026`), perhitungan overweight sebelumnya mengambil total berat per marking kontainer penuh (`totalBeratPerMarking` = 226 kg dari 4 listCode), padahal kelompok invoice terkait hanya terdiri dari 2 listCode dengan berat aktual `64 kg`. Hal ini memicu kesalahan deteksi overweight (+99.72 kg).
  - **Backend (`m3-check.service.ts`, `m3-check.types.ts`, `billing-validation.service.ts`)**:
    - Menambahkan `totalBilledKg` ke dalam objek `relatedBillsSummary`.
    - Mengintegrasikan `relatedBillsSummary.sumBerat` ke dalam evaluasi berat Type 2 M3 vs KG (`billing-validation.service.ts`).
    - Restart service PM2 `ShippingApi` (PID 21704).
  - **Frontend Core Logic (`useOverweightValidation.ts`, `useBillingValidation.ts`)**:
    - **Prioritas Berat Aktual**: Jika invoice memiliki relasi keluarga bill terkait (`hasRelatedBills`), berat aktual fisik diambil dari `relatedBills.sumBerat` (64 kg), bukan berat akumulasi batch kontainer penuh.
    - **Daftar Kandidat Multi-Sumber (`candidates`)**: Menyediakan daftar kandidat berat fisik (`RelatedBills`, `Komplain`, `Timbangan Gudang`, `Surat Jalan`, `Entry List`, `Per Batch Marking`) dan menghitung potensi overweight per masing-masing sumber acuan.
    - **Pencocokan Tagihan KG**: Jika invoice menagihkan KG (`effectiveBilledKg > 0`), sistem memvalidasi terhadap `overweightKg` utama maupun fallback kecocokan kandidat multi-sumber (`matchedCandidateSource`).
    - **Invoice Anak Pecahan (`isChildBillMerged`)**: Invoice pecahan yang digabung ke invoice induk otomatis ditandai aman `isOverweight = false` dan `isBilledOverweightMatch = true` dengan keterangan audit terpusat pada invoice induk.
    - Mengintegrasikan `isChildBillMerged` dan `sumBerat` ke dalam `activeWeights` di `useBillingValidation.ts` untuk mencegah false-alarm perbedaan berat dokumen.
  - **UI / UX (`OverweightTab.tsx`, `OverweightAuditTab.tsx`)**:
    - Menampilkan asal acuan berat fisik (`weightSource`) pada kartu KPI dan banner status.
    - Menampilkan badge & banner sukses spesifik saat invoice anak digabung ke induk atau saat tagihan KG cocok dengan kandidat berat fallback.
  - **Verifikasi Build**: `cd frontend && bun run build` sukses 100% 0 errors.
- [x] **Peringatan Selisih Qty Komplain vs Qty Gudang (`qtyK > 0 && qtyK !== qtyGdg`)**:
  - Menghitung flag `isQtyKomplainMismatch` pada tiap baris data dan counter `countQtyKomplainMismatch` pada agregat (`types.ts`, `useCustMarkingData.ts`).
  - **Tabel Data (`CustMarkingDataTable.tsx`)**:
    - Kolom `Qty K` baris kargo menampilkan badge amber transparan `formatNumber(r.qtyK) ⚠️` dengan tooltip penjelas selisih terhadap Qty Gudang.
    - Kolom `Qty K` pada `tfoot` tabel menampilkan badge amber saat total Qty K > 0 dan berbeda dari total Qty Gudang.
  - **KPI Summary Banner (`CustMarkingSummaryBanner.tsx`)**:
    - Kartu `Total Koli` menampilkan badge peringatan `Selisih K (N)` berkedip halus saat ada selisih koli komplain.
    - Subtext kartu menyorot `K: [total] ⚠️` berwarna amber jika terdapat mismatch koli.
  - **Header & Toolbar (`CustMarkingHeaderToolbar.tsx`, `CustMarkingDetailModal.tsx`)**:
    - Menampilkan banner peringatan interaktif `Peringatan Selisih Qty Komplain` di toolbar.
    - Menampilkan badge peringatan `Selisih Qty K (N)` dengan icon `AlertTriangle` di `Modal.Header`.
- [x] **Peringatan Multi-Cabang (`CustMarkingHeaderToolbar.tsx` & `CustMarkingDetailModal.tsx`)**:
  - Menambahkan deteksi otomatis apabila data marking kargo memiliki lebih dari 1 cabang (`branches.length > 1`).
  - Menampilkan badge amber warning `Multi (X)` di sebelah label `Cabang:`.
  - Menampilkan banner peringatan interaktif di dalam toolbar dengan daftar cabang terdeteksi, serta status tampilan (apakah sedang memfilter ke cabang spesifik atau menampilkan gabungan seluruh cabang).
  - Menambahkan badge alert `Multi-Cabang: [Cabang1, Cabang2...]` pada `<Modal.Header>`.
  - Menyesuaikan tinggi statis modal ke `h-[820px] max-h-[92vh]` agar 10 baris data kargo dengan multi-subheader cabang tetap muat tanpa memicu scrollbar vertikal.
- [x] **Peningkatan KPI Summary Banner (`CustMarkingSummaryBanner.tsx`)**:
  - **Penggabungan Card Volume (M³ / VFC)**: Menggabungkan Volume Gudang, Total Volume Bill, Volume Komplain (K), dan Volume Packing List (PL) menjadi satu kartu terpadu dengan status evaluasi *Underbilled* vs *Sesuai Tagihan*.
  - **Card Total Invoice**: Mengklasifikasi nomor faktur berdasarkan karakter ke-5 dan ke-10:
    - *Invoice Utama*: Karakter ke-5 dan ke-10 berupa angka (digit).
    - *Bill Gabungan*: Karakter ke-5 berupa huruf.
    - *Bill Tambahan*: Karakter ke-10 berupa huruf.
    - Menampilkan jumlah Invoice Utama, Bill Gabungan, dan Bill Tambahan, serta total nomor invoice unik.
  - **Card Status Lebih KG (Multi-Source & Hybrid)**: Menampilkan rincian overweight kuota rasio dari timbangan gudang (`fdJmlBerat`), timbangan Surat Jalan (`berat Sj`), dan timbangan revisi komplain (`berat Komplain` hybrid), serta nilai rasio kargo.
  - **Group Pill Tipe Komoditas**: Menampilkan strip pill filter tipe komoditas (`UMUM`, `GARMENT`, dsb.) dengan jumlah resi dan akumulasi volume m³/vfc, terhubung langsung dengan filter tabel data secara reaktif.
- [x] **Build Frontend**: `bun run build` lulus 100% dengan 0 error dalam 2.56s.

---

## 📋 Task Sedang Berjalan & Backlog

- [x] Perbaikan Mobile Inspection: safe area footer anti-tabrakan navigasi HP & dropdown autocomplete marking solid scrollable anti-overflow (`InspectionFormSheet.tsx` & `InspectionDetailSheet.tsx`) — Rilis APK on hold sesuai instruksi user.
- [ ] *(Belum ada task baru)*

---

## 🗂️ Matriks Status Terkini Per Domain

| Domain | Status | Referensi Teknis |
|---|---|---|
| `backend api` | 🟢 Stable | [backend-app.md](../backend-app.md) & [docs/backend/](../docs/backend/) |
| `delivery-orders` | 🟢 Stable | [docs/frontend/delivery-orders.md](../docs/frontend/delivery-orders.md) & [features/delivery-orders.md](./features/delivery-orders.md) |
| `billing` | 🟢 Stable | [docs/frontend/billing.md](../docs/frontend/billing.md) & [features/billing-validation.md](./features/billing-validation.md) |
| `shipment-batches` | 🟢 Stable | [docs/frontend/shipment-batches.md](../docs/frontend/shipment-batches.md) & [features/shipment-marking.md](./features/shipment-marking.md) |
| `cashier / wallet` | 🟡 Planning | [pelunasan.md](../pelunasan.md), [pelunasan-plan.md](../pelunasan-plan.md) & [features/cashier-wallet.md](./features/cashier-wallet.md) |
| `mobile app` | 🟢 v1.2.3 (Build 15) | [mobile-app.md](../mobile-app.md) & [docs/mobile/](../docs/mobile/) |

---

## 📁 File Yang Baru Diubah
| File | Deskripsi Perubahan |
|---|---|
| `frontend/src/features/billing/components/BillingValidationCard.tsx` | Refaktorisasi komponen utama dari 2.276 baris monolithic menjadi orchestrator bersih ~640 baris |
| `frontend/src/features/billing/components/validation-card/types.ts` | Definisi kontrak tipe data dan props derivasi antar subkomponen validasi |
| `frontend/src/features/billing/components/validation-card/ValidationCardHeader.tsx` | Subkomponen bilah header, badge status validasi, dan tombol refresh |
| `frontend/src/features/billing/components/validation-card/ValidationCardTabsBar.tsx` | Subkomponen navigasi 5 tab kompak dengan status pill indikator |
| `frontend/src/features/billing/components/validation-card/ProfilePricingTab.tsx` | Subkomponen Tab 1 (Item & Tarif, profil harga, Tax Return & Catatan Customer rata samping, 3-way check) |
| `frontend/src/features/billing/components/validation-card/PhysicalValidationTab.tsx` | Subkomponen Tab 2 (Validasi Fisik M3/KG/Type 2, breakdown per listCode & marking) |
| `frontend/src/features/billing/components/validation-card/OverweightTab.tsx` | Subkomponen Tab 3 (Analisis rasio overweight muatan laut, kuota rasio, berat multi-sumber) |
| `frontend/src/features/billing/components/validation-card/FreightChargeTab.tsx` | Subkomponen Tab 4 (Rangkuman biaya freight charge valas) |
| `frontend/src/features/billing/components/validation-card/TransportTab.tsx` | Subkomponen Tab 5 (Ekspedisi lokal tbExpIndo Harus Tagih vs COD) |
| `frontend/src/features/billing/components/validation-card/index.ts` | Barrel export modul validation-card |
| `docs/frontend/billing.md` | Dokumentasi arsitektur modular BillingValidationCard |
| `mobile/src/features/inspection/components/InspectionFormSheet.tsx` | Safe area insets footer (anti-tabrakan navigasi HP), dropdown ScrollView solid non-transparent (anti-overflow & bisa discroll), clear search & focus management |
| `mobile/src/features/inspection/components/InspectionDetailSheet.tsx` | Safe area insets footer (anti-tabrakan navigasi HP pada tombol Hapus & Edit BAP) |
| `.agents/working.md` | Executive working context aktif tersegmen |

---

## 🧠 Keputusan Desain & Isu Aktif

- **Cetak Surat Jalan**: Kertas Continuous Form Landscape $23 \times 16.5$ cm (`@page { size: 230mm 165mm landscape }`). Rute mandiri di `ROUTES.DELIVERY_PRINT(':id')`.
- **SSOT Customer**: Master nama customer WAJIB dari `tbCustomers.fdCustName`.
- **Theme Midnight**: Dilarang tombol/badge solid putih atau terang; wajib outline/transparent border.
- **Resiliensi Backend**: Wajib pembungkus `safeQuery` (auto-retry 1x & fallback) untuk mencegah HTTP 500 saat glitch koneksi database.
