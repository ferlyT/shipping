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
- **Desain Sistem**: Tailwind CSS v3 + CSS Variables 5 tema dinamis (termasuk Midnight Dark Mode)
- **Single Source of Truth Pelanggan**: Master data nama customer HANYA berasal dari `tbCustomers.fdCustName` (selalu bungkus dengan helper `displayCustName` dari `@/lib/utils`).
- **Global ERP Voice Assistant & Audio Visualizer**: `src/components/ui/VoiceAssistantModal.tsx` + `src/components/ui/VoiceVisualizerGraphic.tsx` + `src/features/billing/hooks/useVoiceRecognition.ts` + `src/stores/voiceAssistantStore.ts` + `src/hooks/useVoiceAssistantPermission.ts` (Alt+V shortcut di `AppLayout.tsx`, navigasi seluruh halaman ERP, eliminasi konflik buffer audio WASAPI, mode single-command turn-taking langsung memproses ucapan dalam 900ms atau instan saat tap mic stop, pencarian invoice global, delegasi aksi audit kontekstual, switcher bahasa ID/EN, kontrol hak akses granular via RBAC path `ROUTES.VOICE_ASSISTANT: '/mshipping/voice-assistant'` terintegrasi ke `tbRolePermissions` & Role Management, pencarian suara otomatis hands-free & perintah "Pilih" / "Enter" faktur pada `ValidationListDrawer.tsx` bebas konflik kata "buka" dan proteksi anti-looping transkrip residu via `isOpenRef` & `handleSelectAndClose`, supresi suara global saat dialog modal audit / konfirmasi / halaman validasi dibuka, navigasi tab nomor urut 1-5 dan perintah "Refresh" pada `BillingValidationSummaryModal.tsx`, standby suara hands-free dengan titik hijau blinking dan konfirmasi kata cepat "Ya"/"Ok"/"Terbitkan"/"Batal" tanpa hambatan warning undercharge pada `IssueInvoiceModal.tsx`, serta standby suara hands-free halaman validasi `ValidationDetailPage.tsx` & modal ringkasan `BillingValidationSummaryModal.tsx` dengan mode `continuous: true` dan buffer jeda hening 1 detik (~1000ms debounce via `voiceCommandTimerRef`) agar ucapan kata majemuk tidak terpotong prematur dan eksekusi tetap responsif, perintah langsung "Buka [No Invoice]" / "Buka invoice [nomor]" / "Buka [nomor]" yang mencari prioritas data bill BELUM ISSUED (`draftOnly: true`) dengan resolusi urutan nomor (misal ucapan "11023" cerdas mencocokkan "GZS-011023-09-2026") dan direct redirect ke `ROUTES.BILLING_VALIDATION_DETAIL(invNo)`, membuka drawer pencarian dengan perintah "Cari" / "Pilih invoice" dilengkapi cooldown guard 1000ms, berpindah tab kartu validasi dengan perintah "Tab 1, 2, dst", perintah "Refresh" / "Segarkan" data & tarif, serta perintah "Cetak" / "Print" invoice).

---

## 📂 2. Peta Modul Dokumentasi Terfokus (`docs/frontend/`)

| Domain / Fitur | Berkas Modul | Cakupan Isi & Logika Bisnis |
|---|---|---|
| **Fondasi & Routing** | [`docs/frontend/architecture.md`](./docs/frontend/architecture.md) | Konfigurasi jaringan, interceptor token, pohon rute `router.tsx`, permission guards, dan integrasi Nginx. |
| **Autentikasi** | [`docs/frontend/auth.md`](./docs/frontend/auth.md) | Login page, register page, authStore, persistensi token JWT, dan auto-logout 401. |
| **Overview Dashboard** | [`docs/frontend/dashboard.md`](./docs/frontend/dashboard.md) | 4 KPI utama, actionable alerts (ETA Not Exit, Missed SLA), delivery pipeline, origin analytics, tren 12 bulan. |
| **Shipments (Resi)** | [`docs/frontend/shipments.md`](./docs/frontend/shipments.md) | Dashboard shipment, tabel resi, smart toolbar universal, modal 4-tab dimensi fisik, status blocked finance. |
| **Batch Marking** | [`docs/frontend/shipment-batches.md`](./docs/frontend/shipment-batches.md) | Dashboard kontainer, manifest modal, audit ukuran per marking (`MarkingSizeTable`), tag markup dimensi, ekspor Excel. |
| **Delivery Orders** | [docs/frontend/delivery-orders.md](./docs/frontend/delivery-orders.md) | Dashboard pengantaran, inventori gudang, penerbitan SJ, cetak continuous form, monitoring pending & tren konfirmasi, modal responsif rincian target estimasi (DeliveryEstimasiDetailModal). |
| **Berita Acara (BAP)** | [`docs/frontend/inspection.md`](./docs/frontend/inspection.md) | Dokumentasi pemeriksaan kargo, live status Draft/Selesai, upload foto multi-gambar dengan watermark server & lightbox. |
| **Billing & Faktur** | [`docs/frontend/billing.md`](./docs/frontend/billing.md) | Dashboard keuangan (grafik tren kurva harian & bulanan dengan komparasi YoY tahun lalu), list faktur, validasi M³ vs KG, audit tarif, pairing local charge, cetak invoice, report designer. |
| **Master Tarif** | [`docs/frontend/pricing.md`](./docs/frontend/pricing.md) | Master tarif rute (`price-list`), tarif khusus customer (`customer-price-list`), dan pemetaan komoditas Tier 0. |
| **Kasir & Saldo Wallet** | [`docs/frontend/cashier-wallet.md`](./docs/frontend/cashier-wallet.md) | Kasir resmi (RR-), kasir sementara (TR-), zero-diff balancing, attach, customer wallet & saldo deposit. |
| **Master & Admin** | [`docs/frontend/master-admin.md`](./docs/frontend/master-admin.md) | Master data customer & tiering, user management staf, role permissions matrix, dan profil pengguna. |
| **Desain & UI Library** | [`docs/frontend/ui-components.md`](./docs/frontend/ui-components.md) | Katalog `src/components/ui/`, 5 tema CSS, aturan Midnight Dark Mode, skala font/padding ERP, skeleton shimmer. |

---

## 🚦 3. Standar Verifikasi & Build
Setiap kali melakukan pembaruan kode frontend, jalankan verifikasi build:
```bash
cd c:\shipping\frontend
bun run build
# tsc -b && vite build — WAJIB LULUS 100% dengan 0 errors
```

*Terakhir disinkronkan: 2026-09-30.*
