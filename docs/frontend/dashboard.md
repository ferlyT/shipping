# 📊 Modul Overview Dashboard (`src/features/dashboard/`)

Pusat komando eksekutif terpadu untuk pemantauan kargo logistik, peringatan deviasi SLA, armada pengantaran surat jalan lokal, kesehatan arus kas/validasi tagihan, analitik pangsa muatan cabang asal, serta visualisasi pergerakan aktivitas 12 bulan terakhir.

---

## 1. Komponen & Metrik Utama (`DashboardPage.tsx`)

### A. Header Telemetri & Aksi Cepat
- **Badge Live System**: Indikator denyut hijau real-time status online sistem.
- **Tombol Segarkan Data**: Aksi pembaruan kuari live mandiri dengan animasi spin dan tooltip waktu terakhir diperbarui tanpa reload browser.
- **Hierarki Breadcrumb ERP**: 3-level navigasi (`module.overview` $\to$ `nav.dashboard` $\to$ `dashboard.overviewTitle`).

### B. 4 Kartu Metrik Utama
1. **Total Customer** (`totalCustomers`): Dilengkapi micro-trend pill vs bulan lalu dan ikon squircle sky blue. Tautan ke `ROUTES.CUSTOMERS`.
2. **Total Invoice & Nilai Tagihan Terbit** (`totalInvoices` & `totalInvoiceAmount`): Dilengkapi omzet tagihan terbit dalam format rupiah dan aksen emerald. Tautan ke `ROUTES.BILLING`.
3. **Surat Jalan / DO** (`totalDeliveryOrders`): Dilengkapi tren distribusi dan aksen amber. Tautan ke `ROUTES.DELIVERY_ORDERS`.
4. **Total Shipment** (`totalShipments`): Dilengkapi tren kargo resi dan aksen violet. Tautan ke `ROUTES.SHIPMENTS`.

### C. Operasional Lapangan & Peringatan Dini (Actionable Alerts)
- **Desain Panel Komando**: Dilengkapi garis aksen indikator atas (Amber untuk ETA Not Exit, Rose untuk Missed SLA), angka tebal tabular, serta breakdown micro-capsule Udara (`✈️`) vs Laut (`🚢`).
- **ETA Belum Keluar (ETA Not Exit)**: Batch kontainer/flight yang telah melewati jadwal kedatangan namun belum keluar gudang (`fdExitDate` null).
- **Melewati Target SLA (Transit Tertunda)**: Batch dengan durasi transit ETD $\to$ ETA melebihi batas SLA rute cabang.
- **Modal Rincian Consignee Cerdas**:
  - Kolom pencarian instan consignee atau kode batch di dalam modal.
  - Kartu per-consignee dengan badge count batch, umur keterlambatan (`+X hari keterlambatan` / `Xh / tgt Yh`), dan footer total consignee terdampak.

### D. Pipeline Distribusi Surat Jalan (Delivery Orders Dispatch Flow)
- **Alur 4 Tahap Progresif**:
  1. *Tahap 1 (Dijadwalkan)*: Surat jalan terbit.
  2. *Tahap 2 (Dalam Perjalanan)*: Armada dalam perjalanan pengantaran.
  3. *Tahap 3 (Terkirim)*: Barang sampai di tujuan penerima.
  4. *Tahap 4 (SJ Belum Kembali)*: Menunggu tanda terima fisik kembali ke kantor.
- **Progress Track Visual**: Batang indikator progres di bawah setiap metrik tahap.
- **Footer Agregat**: Rekap total koli dan total tonase berat (Kg) dengan tautan langsung ke modul Surat Jalan.

### E. Keuangan & Arus Kas (Billing & Cash Flow)
- **Antrean Validasi Tagihan**: Kotak amber beraksen dengan nilai total rupiah draft dan tombol cepat audit validasi (`ROUTES.BILLING_VALIDATION_LIST`).
- **Tagihan Lewat Jatuh Tempo (Overdue)**: Peringatan piutang jatuh tempo dengan nilai rupiah ringkas (`formatCompactRupiah`).
- **Omzet Bulan Berjalan**: Ringkasan invoice terbit bulan aktif dengan nilai omzet berjalan.

### F. Analitik Hub Asal & Jadwal Kedatangan Mendatang (48–72 Jam)
- **Pangsa Muatan Cabang Asal**: Tabel komparasi cabang (GZ, SG, HK, YW, SH, dll.) dengan **batang progres visual volume share** proporsional, pemecahan resi Air/Sea, dan font tabular numerik.
- **Jadwal Kedatangan Mendatang**: Kartu manifest kargo dengan chip urgensi pintar (`Hari Ini`, `Besok`, atau countdown hari), ikon moda, cabang asal, dan gudang tujuan.

### G. Visualisasi Tren Kinerja 12 Bulan (Interactive AreaChart)
- **Switcher Metrik Interaktif**: Tombol pill selector `[Semua | Faktur | Surat Jalan | Resi]`.
- **AreaChart Multi-Layer**: Gradient fill lembut di bawah garis kurva (`#10B981`, `#F59E0B`, `#8B5CF6`) untuk kedalaman visual modern.
- **Custom Tooltip Reaktif**: Kotak tooltip multi-tema dengan perbandingan angka tabular 12 bulan terakhir.

### H. Riwayat Aktivitas Terkini (Recent Activity)
- **Faktur Terkini**: Avatar inisial pelanggan, nomor invoice font mono, tanggal, dan nominal omzet.
- **Surat Jalan Terkini**: Nomor DO font mono, tag marking batch, plat nopol kendaraan, tanggal, koli, dan berat kargo.

---

## 2. Endpoint API Terkait
| Endpoint | Method | Deskripsi |
|---|:---:|---|
| `/api/dashboard/stats` | `GET` | Mengembalikan objek terpadu `metrics`, `trends`, `actionableAlerts`, `deliveryStatus`, `financialOverview`, `originAnalytics`, `recentActivity`, dan `chartData`. |
