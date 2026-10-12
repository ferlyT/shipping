# 🚚 Mobile Logistics Module (`mobile/app/(tabs)/logistics.tsx`)

Pusat manajemen operasional lapangan yang mengintegrasikan pelacakan resi pengiriman, pemantauan batch marking kontainer/AWB, status surat jalan kurir armada, dan integrasi pemindai kamera barcode/QR hardware.

---

## 1. Segmented Tabs & Navigasi Logistik
- **Tab 1: Daftar Resi (`shipments`)**
- **Tab 2: Batch Marking (`batches`)**
- **Tab 3: Surat Jalan (`delivery`)**
- **Tab 4: Berita Acara Pemeriksaan (`inspection` / BAP)**

---

## 2. Pencarian Universal, Integrasi Barcode & Container Scanner, serta Infinite Scroll
- **Barcode & QR Scanner**: Search bar dilengkapi tombol barcode (`ScanLine`) untuk membuka `BarcodeScannerModal.tsx` memindai resi kargo dan surat jalan.
- **Container Number Scanner (Kamera & Galeri)**: Search bar pada tab Resi & Batch Marking dilengkapi tombol kamera (`Camera`) untuk membuka `ContainerScannerModal.tsx`:
  - Viewfinder khusus dengan guideline rectangular overlay proporsional plat nomor kontainer.
  - Tombol Shutter jepret foto langsung (`expo-camera`) dan tombol pilih dari galeri (`expo-image-picker`).
  - Backend OCR pipeline (`sharp` enhancement + `tesseract.js` + parser cerdas ISO 6346 & kontainer domestik).
  - Dialog review / edit cepat nomor kontainer dengan badge status validasi ISO 6346 dan selektor kandidat alternatif.
- Hasil scan otomatis mengisi kolom pencarian dan memfilter data list secara live.
- **Infinite Scroll**: Keempat sub-tab menerapkan infinite scroll berbasis `useInfiniteQuery` (TanStack React Query v5) dengan batch 20 item (`limit: 20`, `onEndReachedThreshold: 0.4`).

---

## 3. Sub-Tab 1: Daftar Resi (`shipments`)
- Filter moda: `Semua`, `Udara`, `Laut`.
- Menampilkan nomor resi (`fdTerima`), kode marking (`fdMarkingCode`), tanda marking (`fdMarkingNo`), customer, pack & satuan (`fdJmlPack`, `fdSatuan`), berat (kg), dan volume kubikasi ($m^3$).
- **Modal Rincian Muatan (Bottom Sheet 3-Tab)**:
  - **Header**: Nama customer (`displayCustName`), Badge No. List (`fdListCode`), Badge Status (`getShipmentStatusBadge`), dan chip lokasi gudang.
  - **Tab 1: Ringkasan**: 3 KPI (Total Koli, Total Berat kg, Total Volume $m^3$), nomor resi, tracking lokal, tanggal agent, moda/cabang, komoditas, dan catatan operasional.
  - **Tab 2: Dimensi**: Sub-tab switcher (*Packing List*, *Ukuran Gudang*, *Komplain*), total kubikasi m³, dan kartu dimensi koli ($P \times L \times T$, Qty).
  - **Tab 3: Timeline**: 6 tahapan pelacakan logistik vertikal (*Waiting Loading*, *ETD*, *ETA*, *Warehouse*, *Delivery*, *Delivered*), serta banner penanda dibatalkan (*Canceled*) atau **Ditahan/Diblokir Finance (`Blocked`)** jika `fdBlocked = 1` pada `tbEntryList_Bloked_Finance`.

---

## 4. Sub-Tab 2: Batch Marking (`batches`)
- Filter moda: `Semua`, `Udara`, `Laut`.
- Menampilkan kode batch marking (`fdMarkingCode`), cabang gudang (`fdBranch`), keterangan (`fdKet`), dan hirarki tanggal (`Exit` $\to$ `ETA` $\to$ `ETD` $\to$ `Load`).
- **Nomor Muatan Cerdas**: Menampilkan nomor AWB jika moda Udara (`listType = 1`) dan nomor Kontainer jika Laut (`listType = 2`).
- **Input & Update Exit Date Gudang (`BatchExitDateModal`)**:
  - Tombol aksi cepat `[ + Exit ]` / `[ Exit ]` langsung di baris batch dan kartu status Exit Gudang di dalam Manifest Sheet.
  - **Proteksi Role**: Dibatasi via `canManageBatchExitDate(user)` (khusus role Admin, Operasional, Logistik, Superadmin; role viewer hanya read-only).
  - **Preset Cepat & Kalender Mini**: Pilihan 1-klik (`Hari Ini`, `Kemarin`, `-2 Hari`) dan kalender interaktif native. Default tanggal terisi **hari ini**.
  - **Validasi Kronologis & Guard**:
    - Exit Date tidak boleh lebih awal dari Tanggal Muat / Loading Date (`fdLoadDate`) atau ETD (`fdETD`).
    - *Back Date*: Menampilkan callout amber penegas bahwa tanggal mundur dari hari ini.
    - *Future Date*: **Maksimal 3 hari ke depan** (`<= today + 3 hari`). Lebih dari itu ditolak oleh sistem; pengisian 1-3 hari ke depan memicu dialog konfirmasi penegasan khusus sebelum disimpan.
  - **Opsi Hapus Exit Date**: Tombol `[ Hapus Exit Date ]` untuk mereset status jika terjadi kesalahan input fisik.
- **Modal Manifest Batch**:
  - Menampilkan seluruh resi muatan fisik dalam batch (`/api/marking/:id/manifest`).
  - 4-Metric Grid (Total Koli, Total Berat, Total Volume, Customer & Resi).
  - Badge status finansial master `tbCustomers.fdBlocked` (`OK`, `COD`, `WARNING`, `BLOCKED`, `URGENT`).
  - Override otomatis badge merah **`BLOCKED`** jika ada kargo yang diblokir finance (`tbEntryList_Bloked_Finance`).
  - Pencarian real-time item manifest (*client-side instant filtering*).
  - **Link ke Modal Rincian Muatan (`ShipmentDetailSheet`)**: Mengetuk kartu kargo atau tombol `[ Detail ]` membuka rincian lengkap muatan (4 tab: Ringkasan, Dimensi Gudang/PL/Komplain, Timeline, Invoice) in-place di atas manifest.
  - **Aksi Cepat Buat BAP (`+ BAP`)**: Tersedia di setiap baris kargo manifest dan modal rincian muatan untuk autofill instan ke `InspectionFormSheet`.

---

## 5. Sub-Tab 3: Surat Jalan / Delivery Orders (`delivery`)
- Menampilkan nomor surat jalan (`fdSJNo`), customer (`fdCustNameSJ`), supir (`fdSupir`), plat mobil armada (`fdCarID`), perkiraan tanggal kirim (`fdEstimasi`), tanggal penyerahan (`fdGiveDate`), dan status kirim (`Delivered` vs `On Delivery`).

---

## 6. Sub-Tab 4: Berita Acara Pemeriksaan / BAP (`inspection`)
- **Manajemen Pemeriksaan Fisik Kargo**:
  - Filter status: `Semua`, `Draft` (amber), `Selesai` (green).
  - Pencarian nomor laporan (`BAP-YYYY-MM-XXXXX`), nama customer, kode marking, dan nomor resi.
  - FAB `+ Buat BAP` untuk membuka `InspectionFormSheet.tsx` dengan autocomplete marking kargo dari database ERP (`/api/inspection-reports/lookup`).
- **Moda Pengiriman (`fdListType`) & Auto-Fill**:
  - Pilihan moda interaktif `[✈️ Udara / Air]` (`1`) dan `[🚢 Laut / Sea]` (`2`).
  - Autocomplete marking code memfilter saran berdasarkan moda terpilih (`vwShipment WHERE fdListType = @listType`).
  - Dropdown saran menampilkan: kode marking, marking no, badge moda, nama customer, nomor resi (`fdTerima`), dan list code (`fdListCode`).
  - Saat saran dipilih, seluruh input kargo (`fdMarkingCode`, `fdMarkingNo`, `fdTerima`, `fdListCode`, `fdNamaCustomer`) **otomatis terisi (auto-fill)**.
  - Kartu list item (`InspectionListItem.tsx`) dan lembar detail (`InspectionDetailSheet.tsx`) menampilkan badge semantik `✈️ Udara` / `🚢 Laut`.
  - **Quick Action Buat BAP**: Tombol `[ + BAP ]` langsung tersedia di setiap kartu baris **Daftar Resi** (`ShipmentListItem.tsx`), header modal **Detail Resi** (`ShipmentDetailSheet.tsx`), dan kartu baris **Manifest Batch** (`BatchManifestSheet.tsx`) untuk pre-fill instan seluruh field kargo.
- **Fitur 1: Foto BAP, Kamera Native, Share & Horizontal Swipe Slider (`BapPhotoSheet.tsx`)**:
  - Tombol kamera pada setiap item list dengan badge counter foto real-time (`photoCount`).
  - Strip thumbnail horizontal interaktif di lembar detail BAP (`InspectionDetailSheet.tsx`).
  - **Kamera Native Terintegrasi**:
    - Viewfinder `expo-camera` `CameraView` dengan flash toggle, kamera depan/belakang, shutter interaktif, dan kompresi base64 otomatis.
    - *Catatan Arsitektur*: Pengambilan via galeri (`expo-image-picker`) ditunda karena modul binary native `ExponentImagePicker` belum di-compile ke dalam base APK `mshipping.apk` (lingkungan server saat ini menggunakan mekanisme repack Hermes JS bundle).
  - **Fitur Berbagi (Share)**: Tombol Share di setiap thumbnail dan modal preview untuk membagikan foto via native share sheet OS (`expo-sharing` via `expo-file-system/legacy`).
  - **Horizontal Slider / Swipe Paging**: Modal preview foto fullscreen kini mendukung swipe gesture horizontal (`FlatList` dengan `pagingEnabled`) untuk berpindah antar foto secara mulus dengan indikator counter `Foto X / N` dan pagination dots.
- **Fitur 2: Voice Dictation, Template Frasa & Anti-Block Keyboard**:
  - Tombol `[🎙️ Dikte Suara]` di samping label "KETERANGAN PEMERIKSAAN" pada form BAP.
  - Memfokuskan kursor ke textarea keterangan, memicu dictation suara bawaan keyboard Android/iOS secara alami (Gboard/Samsung Voice Typing) tanpa risiko native crash.
  - Menyediakan banner panduan interaktif dan chip template frasa cepat pemeriksaan kargo (`+ Kondisi baik & tersegel`, `+ Kardus basah / lembab`, `+ Kemasan sobek / rusak`, `+ Isi kurang / tidak sesuai`, `+ Lakban ulang / repack`, `+ Barang pecah / penyok`).
  - **Keyboard Handling & Dropdown Stability**: Mengeliminasi glitch dropdown hilang saat di-scroll dengan menghapus drag dismissal pada parent ScrollView, serta dynamic keyboard height padding + auto-scroll ke bawah saat textarea keterangan aktif agar tidak tertutup keyboard virtual.
- **Fitur 3: Voice Memo / Catatan Suara BAP (Maksimal 90 Detik)**:
  - 1 catatan suara utama per laporan BAP yang disimpan pada kolom `fdAudioUrl` dan `fdAudioDuration` (`tbInspectionReport`).
  - Perekaman audio via `expo-av` dengan visualizer status REC pulse merah, durasi berjalan `00:00 / 01:30`, auto-stop tepat di 90 detik, haptic tactile vibration, dan konversi base64 via `expo-file-system`.
  - Perekaman dapat dilakukan langsung saat mengisi formulir (`InspectionFormSheet.tsx`) atau ditambahkan belakangan dari modal detail (`InspectionDetailSheet.tsx`).
  - Pemutar audio bawaan (`VoiceMemoPlayer.tsx`) dengan Play/Pause, scrubber progress bar interaktif, counter waktu sisa/berjalan, dan opsi penghapusan audio memo.
  - Indikator badge merah `[ 🎙️ {duration}s ]` pada daftar kartu item BAP (`InspectionListItem.tsx`).
- **Fitur 4: Anotasi Visual Foto Kerusakan BAP**:
  - Modal canvas interaktif fullscreen (`PhotoAnnotationModal.tsx`) yang muncul otomatis setelah pengambilan foto kargo rusak dari kamera.
  - Berbasis `react-native-svg` dan `PanResponder` tanpa ketergantungan library binary native eksternal.
  - **3 Tool Penandaan**:
    - `Pen`: Goresan bebas (freehand path) untuk melingkari atau mencoret kerusakan.
    - `Circle`: Lingkaran elips target kerusakan dengan kalkulasi bounding-box live.
    - `Arrow`: Panah penunjuk arah kerusakan dengan marker arrowhead dinamis.
  - **Palet Warna Kontras**: Merah Bahaya (`#EF4444`), Oranye/Kuning Peringatan (`#F59E0B`), dan Hijau Informasi (`#10B981`).
  - **Aksi Cepat**: Undo langkah terakhir, Clear seluruh anotasi, dan Skip (lewati anotasi tanpa mencoret foto).
  - **Lossless Server Compositing**: Anotasi SVG dikirimkan bersama base64 foto ke backend (`POST /api/inspection-reports/:id/photos`). Server menggunakan library `sharp` untuk menggabungkan layer anotasi vektor SVG secara presisi ke atas resolusi asli foto kamera sebelum menambahkan banner watermark metadata BAP di bagian bawah.

---

## 7. Endpoint API Terkait
| Endpoint | Method | Parameter / Query | Deskripsi |
|---|:---:|---|---|
| `/api/shipments` | `GET` | `limit=20`, `search`, `listType` | Daftar resi shipment paginated |
| `/api/shipments/suggestions` | `GET` | `q` | Saran autocomplete resi, customer, marking (< 50ms) |
| `/api/shipments/:id` | `GET` | Path `:id` | Detail lengkap resi shipment & timeline status |
| `/api/shipments/:id/dimensions/gudang` | `GET` | Path `:id` | Dimensi fisik ukur gudang per koli |
| `/api/shipments/:id/dimensions/packinglist` | `GET` | Path `:id` | Dimensi dokumen packing list |
| `/api/shipments/:id/dimensions/komplain` | `GET` | Path `:id` | Dimensi revisi komplain pelanggan |
| `/api/marking` | `GET` | `limit=20`, `search`, `listType`, `isClosed` | Daftar batch marking kontainer / AWB |
| `/api/marking/suggestions` | `GET` | `q` | Saran autocomplete kode batch marking & consignee |
| `/api/marking/:id/manifest` | `GET` | Path `:id` | Seluruh resi muatan manifest dalam batch |
| `/api/delivery-orders` | `GET` | `limit=20`, `search` | Daftar surat jalan armada pengantaran |
| `/api/delivery-orders/suggestions` | `GET` | `q` | Saran autocomplete nomor SJ, customer, supir |
| `/api/inspection-reports` | `GET` | `page`, `limit`, `search`, `status` | Daftar BAP paginated + `photoCount`, `fdAudioUrl`, `fdAudioDuration` |
| `/api/inspection-reports/lookup` | `GET` | `search`, `page`, `limit` | Autocomplete data kargo dari `vwShipment` |
| `/api/inspection-reports/:id` | `GET` | Path `:id` | Detail BAP lengkap dengan array `photos`, `fdAudioUrl`, `fdAudioDuration` |
| `/api/inspection-reports` | `POST` | Body JSON | Buat BAP baru dengan auto-counter bulanan |
| `/api/inspection-reports/:id` | `PUT` | Path `:id`, Body JSON | Edit data BAP dan ubah status Draft/Selesai |
| `/api/inspection-reports/:id` | `DELETE` | Path `:id` | Soft-delete BAP |
| `/api/inspection-reports/:id/photos` | `POST` | Path `:id`, Body `{ photoBase64, caption?, annotationsSvg? }` | Unggah foto BAP ber-watermark & composite anotasi SVG |
| `/api/inspection-reports/:id/photos` | `GET` | Path `:id` | Daftar foto pemeriksaan BAP |
| `/api/inspection-reports/:id/photos/:photoId` | `DELETE` | Path `:id`, `:photoId` | Hapus foto dari server dan database |
| `/api/inspection-reports/:id/voice-memo` | `POST` | Path `:id`, Body `{ audioBase64, duration }` | Unggah rekaman suara BAP (maks 90 detik, .m4a) |
| `/api/inspection-reports/:id/voice-memo` | `DELETE` | Path `:id` | Hapus rekaman suara BAP dari server & database |

