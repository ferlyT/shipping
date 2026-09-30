# 🚚 Mobile Logistics Module (`mobile/app/(tabs)/logistics.tsx`)

Pusat manajemen operasional lapangan yang mengintegrasikan pelacakan resi pengiriman, pemantauan batch marking kontainer/AWB, status surat jalan kurir armada, dan integrasi pemindai kamera barcode/QR hardware.

---

## 1. Segmented Tabs & Navigasi Logistik
- **Tab 1: Daftar Resi (`shipments`)**
- **Tab 2: Batch Marking (`batches`)**
- **Tab 3: Surat Jalan (`delivery`)**
- **Tab 4: Berita Acara Pemeriksaan (`inspection` / BAP)**

---

## 2. Pencarian Universal, Integrasi Barcode Scanner & Infinite Scroll
- Search bar dilengkapi tombol kamera pemindai barcode/QR (`BarcodeScannerModal.tsx`).
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
- **Modal Manifest Batch**:
  - Menampilkan seluruh resi muatan fisik dalam batch (`/api/marking/:id/manifest`).
  - 4-Metric Grid (Total Koli, Total Berat, Total Volume, Customer & Resi).
  - Badge status finansial master `tbCustomers.fdBlocked` (`OK`, `COD`, `WARNING`, `BLOCKED`, `URGENT`).
  - Override otomatis badge merah **`BLOCKED`** jika ada kargo yang diblokir finance (`tbEntryList_Bloked_Finance`).
  - Pencarian real-time item manifest (*client-side instant filtering*).

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
| `/api/inspection-reports` | `GET` | `page`, `limit`, `search`, `status` | Daftar BAP paginated + `photoCount` |
| `/api/inspection-reports/lookup` | `GET` | `search`, `page`, `limit` | Autocomplete data kargo dari `vwShipment` |
| `/api/inspection-reports/:id` | `GET` | Path `:id` | Detail BAP lengkap dengan array `photos` |
| `/api/inspection-reports` | `POST` | Body JSON | Buat BAP baru dengan auto-counter bulanan |
| `/api/inspection-reports/:id` | `PUT` | Path `:id`, Body JSON | Edit data BAP dan ubah status Draft/Selesai |
| `/api/inspection-reports/:id` | `DELETE` | Path `:id` | Soft-delete BAP |
| `/api/inspection-reports/:id/photos` | `POST` | Path `:id`, Body `{ photoBase64, caption? }` | Unggah foto BAP ke server |
| `/api/inspection-reports/:id/photos` | `GET` | Path `:id` | Daftar foto pemeriksaan BAP |
| `/api/inspection-reports/:id/photos/:photoId` | `DELETE` | Path `:id`, `:photoId` | Hapus foto dari server dan database |
