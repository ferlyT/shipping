# 💻 Dokumentasi Web Frontend M-Shipping — Master Index

Dokumen ini adalah **Master Index & Navigation Hub** arsitektur aplikasi web frontend **M-Shipping** (React 19 / Vite / TypeScript / Tailwind CSS / Zustand / React Query / Hono.js Backend).

> 💡 **Panduan Membaca AI Agent**:
> Jangan membaca seluruh dokumentasi sekaligus. Dokumen telah dipecah menjadi modul-modul terfokus per domain di folder [`docs/frontend/`](./docs/frontend/). Buka dan baca hanya berkas modul yang relevan dengan tugas yang sedang Anda kerjakan melalui tautan di bawah ini.

---

## 🏗️ 1. Ringkasan Arsitektur & Lingkungan
- **Framework**: React 19.2 + TypeScript 6.0 + Vite 8.1
- **Arsitektur**: Feature-Driven Architecture (`src/features/<domain>/`)
- **State Management**: Zustand v5 + TanStack React Query v5
- **Komunikasi REST**: Axios via `src/api/client.ts` (`/mshipping/api` via IIS ARR Reverse Proxy ke Bun backend `127.0.0.1:3010`)
- **Domain Resmi & SSL**: `https://app.sampai.co/mshipping/` (Let's Encrypt SSL resmi aktif via win-acme, alias `https://mshipping.sampai.co/mshipping/`)
- **Desain Sistem & Layout Responsif**: Tailwind CSS v3 + CSS Variables 5 tema dinamis (termasuk Midnight Dark Mode), layout dinamis `h-[100dvh]` anti-clipping di browser mobile, Sidebar drawer responsif (`w-72 max-w-[85vw]`, `inset-y-0`, `min-h-0`, `overscroll-contain`, bottom padding `pb-28`, touch momentum gestures, default expand seluruh menu, dan toggle hamburger aman).
- **Formatters & Database Sanitization**: Helper `src/lib/utils.ts` dilengkapi fungsi `replaceDbCaret` dan `cleanDbData` untuk konversi otomatis karakter caret `'^'` warisan database menjadi tanda petik tunggal `"'"` pada string maupun objek data terstruktur.
- **Global ERP Voice Assistant & Floating Capsule HUD**: `src/components/ui/GlobalVoiceHud.tsx` + `src/features/billing/hooks/useVoiceRecognition.ts` + `src/stores/voiceAssistantStore.ts` + `src/hooks/useVoiceAssistantPermission.ts` (Seluruh kontrol suara 100% terpusat pada Floating Capsule HUD di bagian bawah layar `AppLayout.tsx`, tombol Topbar dan toolbar tabel dihapus total; **Otorisasi Role Kondisional**: Floating HUD hanya timbul jika role memiliki izin `ROUTES.VOICE_ASSISTANT: '/mshipping/voice-assistant'` di `tbRolePermissions` / admin dan tersembunyi total jika tanpa izin; **Status Awal Muted**: Default awal mikrofon dijeda (`isMuted: true`) dan aktif mendengarkan hands-free via klik ikon mic atau shortcut Alt+V; **Panduan Adaptif Dinamis**: Popover bantuan (?) otomatis menampilkan navigasi ERP global saat di halaman umum dan beralih ke perintah operasional validasi [Tab 1–5, Terbitkan, Cetak, Refresh, Resi, BAP] saat membuka halaman detail faktur; pencarian & resolusi nomor invoice cerdas [misal ucapan '11023' mencocokkan 'GZS-011023-09-2026']; supresi otomatis saat dialog modal dibuka; serta eliminasi penuh konflik WASAPI audio stream).

---

## 📂 2. Peta Modul Dokumentasi Terfokus (`docs/frontend/`)

| Domain / Fitur | Berkas Modul | Cakupan Isi & Logika Bisnis |
|---|---|---|
| **Fondasi & Routing** | [`docs/frontend/architecture.md`](./docs/frontend/architecture.md) | Konfigurasi jaringan, interceptor token, pohon rute `router.tsx`, permission guards, layout responsif `AppLayout` & `Sidebar` (dukungan mobile viewport 100dvh & touch scrolling), dan integrasi Nginx. |
| **Autentikasi** | [`docs/frontend/auth.md`](./docs/frontend/auth.md) | Login page, register page, authStore, persistensi token JWT, dan auto-logout 401. |
| **Overview Dashboard** | [`docs/frontend/dashboard.md`](./docs/frontend/dashboard.md) | 4 KPI utama, actionable alerts (ETA Not Exit, Missed SLA), delivery pipeline, origin analytics, tren 12 bulan. |
| **Shipments (Resi)** | [`docs/frontend/shipments.md`](./docs/frontend/shipments.md) | Dashboard shipment, tabel resi, smart toolbar universal, modal 4-tab dimensi fisik, panel riwayat pembuatan & pembaruan (created by & update timestamps) di tab ringkasan & timeline, status blocked finance. |
| **Batch Marking** | [`docs/frontend/shipment-batches.md`](./docs/frontend/shipment-batches.md) | Dashboard kontainer, manifest modal, audit ukuran per marking (`MarkingSizeTable`), tag markup dimensi, ekspor Excel. |
| **Delivery Orders** | [docs/frontend/delivery-orders.md](./docs/frontend/delivery-orders.md) | Dashboard pengantaran, inventori gudang, penerbitan SJ, cetak continuous form, monitoring pending & tren konfirmasi, modal responsif rincian target estimasi (DeliveryEstimasiDetailModal) & modal batch (DeliveryBatchDetailModal) dengan redesign premium B2B ERP (5 kartu grid KPI, dual view table/cards, expand-collapse all, perhitungan & filter bill). |
| **Berita Acara (BAP)** | [`docs/frontend/inspection.md`](./docs/frontend/inspection.md) | Dokumentasi pemeriksaan kargo, live status Draft/Selesai, upload foto multi-gambar dengan watermark server & lightbox. |
| **Input & Revisi Data** | [`docs/frontend/data-revisions.md`](./docs/frontend/data-revisions.md) | Pencatatan revisi kargo, pembatalan data inputan (`fdCancel = 1`), auto-detect billing, wizard 4-step, standard PageHeader & unified layout wrapper, tabel/grid view, standarisasi Modal component (`Modal.Header`, `Modal.Body`, `Modal.Footer`) untuk detail view, customer lookup & fast listCode lookup, galeri lampiran foto interaktif (zoom, rotate, next/prev), dan print form fisik A4 (5 box ttd). |
| **Billing & Faktur** | [`docs/frontend/billing.md`](./docs/frontend/billing.md) | Dashboard keuangan & operasional (Pemisahan ketat 2 Master Tab dengan **Pemisahan Granular Role Permissions**: `ROUTES.BILLING_OPERATIONAL` untuk staf operasional kargo dan `ROUTES.BILLING_FINANCE` untuk staf keuangan/omzet Rp; hook `useBillingDashboardPermissions()` mengunci tampilan dan menyembunyikan tombol tab switcher secara dinamis; **Tab Operation sebagai default aktif** di urutan pertama diikuti **Tab Finance** di urutan kedua: **Tab Operation** khusus kuantiti bill & kargo fisik [target bill udara & laut per PIC, volume bill, **Kartu KPI ke-4 & Modal Rincian Draft Belum Di-Issue (Unissued Bills fdGive <> 1)** dengan ringkasan nominal Rp tertahan, pills interaktif aging $\le 7$h, 8-14h, 15-30h, $> 30$h, dan dialog `UnissuedBillsModal` (layout diperlebar `1450px`, tanpa text-wrap) lengkap dengan filter pencarian, moda, **group pill by creator bill**, copy invoice, **tombol Validasi kondisional** (`ClipboardCheck`) yang otomatis muncul jika user memiliki role validasi dan langsung membuka halaman validasi invoice, serta tombol Detail cerdas yang mengarah ke halaman validasi atau rincian faktur berdasarkan role, widget Batch Marking Exit vs Bill Dibuat, monitoring Arus SJ vs Bill, produktivitas karyawan/PIC dengan switcher rentang waktu 7, 14, 30 hari hingga 1 tahun agregasi bulanan, **Matriks Komparasi 3 Periode Operasional** dengan 7 metrik volume/rasio MoM & YoY non-moneter, dan tren volume bill count] dan **Tab Finance** khusus metrik finansial/omzet Rupiah [4 kartu KPI omzet Rp, tren harian & bulanan Rp, matriks 3 periode & komparasi cabang]; **Ekspor PDF Terpisah per Domain**: Tombol dinamis mengunduh PDF Laporan Keuangan [6 Lembar A4 Landscape, `Laporan-Finance-Billing-*.pdf`] fokus 100% pada nilai uang/omzet Rp (**Lembar 4 Kurva Tren Bulanan & Lembar 5 Tabel Rekapitulasi 12 Bulan dipisah mandiri**) dan PDF Laporan Operasional [10 Lembar A4 Landscape, `Laporan-Operation-Billing-*.pdf`] 100% bebas metrik uang/Rp dengan fokus murni pada kuantiti bill, volume, **Lembar 2 Rasio Penagihan per Cabang Asal Kargo**, Lembar 3 Matriks 3 Periode Operasional, **Lembar 4 Rekapitulasi PIC & Lembar 5 Kurva Tren PIC (dipisah mandiri)**, **Lembar 6 Monitoring SJ vs Bill & Lembar 7 Rincian Surat Jalan Belum Ditagih (dipisah mandiri)**, serta Lembar 8-10 Batch Marking Exit & Progress Details; eliminasi tombol link target bill dari `BatchExitModal.tsx` agar fokus murni pada audit progres kargo), report pivot multi-year Omset & Volume customer (`OmsetVolumeReportPage.tsx`), report Rekap Volume & Berat Kargo per customer & sales (`CargoVolumeReportPage.tsx`), list faktur, fitur upload & manajemen lampiran invoice, validasi M³ vs KG, aturan prioritas komoditi baris 1 selalu mengikuti `tbEntryList`, timeline siklus kargo, audit tarif, pairing local charge, cetak invoice, report designer. |
| **Master Tarif** | [`docs/frontend/pricing.md`](./docs/frontend/pricing.md) | Master tarif rute (`price-list`), tarif khusus customer (`customer-price-list`), dan pemetaan komoditas Tier 0. |
| **Kasir & Saldo Wallet** | [`docs/frontend/cashier-wallet.md`](./docs/frontend/cashier-wallet.md) | Kasir resmi (RR-), kasir sementara (TR-), zero-diff balancing, attach, customer wallet & saldo deposit. |
| **Master & Admin** | [`docs/frontend/master-admin.md`](./docs/frontend/master-admin.md) | Master data customer dengan infinite scroll otomatis, tiering, user management staf, role permissions matrix, dan profil pengguna. |

| **Desain & UI Library** | [`docs/frontend/ui-components.md`](./docs/frontend/ui-components.md) | Katalog `src/components/ui/`, 5 tema CSS, aturan Midnight Dark Mode, skala font/padding ERP, skeleton shimmer. |

---

## 🚦 3. Standar Verifikasi & Build
Setiap kali melakukan pembaruan kode frontend, jalankan verifikasi build:
```bash
cd c:\shipping\frontend
bun run build
# tsc -b && vite build — WAJIB LULUS 100% dengan 0 errors
```

*Terakhir disinkronkan: 2026-10-11 (Standarisasi Halaman Master Pelanggan Web menggunakan ERP Pagination Bar & Loncat Halaman, 30 baris/halaman).*

