# Aturan Agen (Agent Rules) - mshipping

Dokumen ini adalah **Core Rulebook** operasional bagi AI Agent pada proyek **mshipping**. Modul aturan mendalam tersegmen pada direktori [`.agents/rules/`](./rules/).

> **⚡ WAJIB DIPATUHI**:
> 1. Setiap sesi dimulai → baca [`.agents/working.md`](./working.md). Sesi selesai → update [`.agents/working.md`](./working.md).
> 2. **Sebelum update aplikasi mobile (`mobile/`)** → **WAJIB BACA [`mobile-app.md`](../mobile-app.md) DULU**.
> 3. **Setelah update mobile selesai** → **WAJIB TANYAKAN DULU ke user: nomor versi baru dan tipe update (apakah ini Force Update?)**.
> 4. **Setiap ada update pada Frontend (`frontend/`)** → **WAJIB UPDATE [`frontend-app.md`](../frontend-app.md)**; **setiap update Backend (`backend/`)** → **WAJIB UPDATE [`backend-app.md`](../backend-app.md)**.
> 5. **Verifikasi Build Frontend** → `cd frontend && bun run build` **WAJIB LULUS 100% 0 errors** sebelum task dinyatakan tuntas.

---

## 🏗️ Arsitektur Proyek

- **Frontend**: React 19 + Vite + TypeScript (`frontend/`, dokumentasi di [`frontend-app.md`](../frontend-app.md))
- **Backend**: Hono.js + Bun + Prisma ORM + MS SQL Server (`backend/`, dokumentasi di [`backend-app.md`](../backend-app.md))
- **Mobile**: Expo SDK 57 + React Native 0.86 + TypeScript (`mobile/`, dokumentasi di [`mobile-app.md`](../mobile-app.md))
- **Struktur Folder Frontend**: **Feature-Driven Architecture** (`src/features/<domain>/`)
- **Komunikasi**: REST API via Axios (`src/api/client.ts`, endpoint const di `src/api/endpoints/`)

---

## 📚 Modul Aturan Spesifik Tersegmen

Untuk instruksi teknis terperinci, buka modul terkait:

1. **[Standar Koding & Konvensi](./rules/coding-standards.md)**:
   - Naming conventions (`kebab-case`, `camelCase`, `PascalCase`), larangan mengulang nama domain pada `pages/`.
   - Sistem dual bahasa i18n ID/EN (`useTranslation()`, kamus `id.json` & `en.json`).
   - Hierarki 3-level Breadcrumbs ERP (`module.*` $\to$ `nav.*` $\to$ `sub-page`).
   - Navigasi wajib konstanta `ROUTES` dari `src/lib/constants.ts` (dilarang string hardcode).
   - Daftar anti-pattern lengkap backend & frontend.

2. **[Standar Styling UI & Desain Sistem](./rules/ui-styling.md)**:
   - CSS tokens 5 tema (`heritage`, `ocean`, `emerald`, `amber`, `midnight`).
   - **Midnight Dark Mode**: Dilarang tombol/badge solid putih atau terang; wajib outline/transparent border.
   - Skala proporsional ukuran font & spacing kompak (Modal 15px/12px, KPI 18px, Tabel 11px/12px).
   - Standar loading: Skeleton shimmer (`.skeleton-shimmer`) untuk initial load, bukan spinner bulat.
   - Single Source of Truth komponen UI terpusat di `src/components/ui/`.

3. **[Standar Database & Resiliensi Backend](./rules/database-standards.md)**:
   - Single Source of Truth nama customer: WAJIB dari master `tbCustomers.fdCustName`.
   - Override otomatis nama customer dari stored procedure warisan ke data `tbCustomers`.
   - Mekanisme `safeQuery` auto-retry 1x & graceful fallback default value untuk mencegah HTTP 500 saat hiccup database.

4. **[Standar Mobile App & Rilis APK](./rules/mobile-standards.md)**:
   - Threshold rilis: Jangan rilis APK jika akumulasi perbaikan < 5 item kecuali kritis/diminta.
   - Konfirmasi wajib versi baru semver & versionCode serta status `forceUpdate`.
   - Sinkronisasi versi di 4 file (`app.json`, `package.json`, `mobile.service.ts`, `FinanceTab.tsx`).
   - Alur compile Hermes, repack manifest, sign keystore release, dan sync ke 4 titik server.

---

## 🚫 Anti-Pattern Kritis (Ringkasan)

- ❌ `new PrismaClient()` → ✅ `import { prisma } from '@/config/database'`
- ❌ `console.log` / `console.error` → ✅ `import { logger } from '@/config/logger'`
- ❌ Hardcode string navigasi URL → ✅ `ROUTES.DOMAIN_SUBPAGE`
- ❌ Hardcode string teks tampilan → ✅ `t('namespace.key')`
- ❌ Spinner bulat untuk load halaman → ✅ Skeleton wireframe `.skeleton-shimmer`
- ❌ Tombol solid putih / badge solid terang di Dark Mode → ✅ Border semantik transparan
- ❌ Ambil nama customer dari tabel transaksi → ✅ `tbCustomers.fdCustName`

---

## 🛑 Keputusan yang WAJIB Dikonfirmasi ke User

Agen HARUS BERHENTI dan bertanya kepada user sebelum mengasumsikan:
1. **Database schema yang tidak diketahui**: Nama kolom tabel existing, tipe primary key, atau foreign key.
2. **Kebutuhan UI/UX**: Kolom apa saja yang harus ditampilkan di tabel, kolom search, dan nilai enum/status.
3. **Data sensitif**: Membuka endpoint yang mungkin mengekspos data rahasia tanpa filter default.
4. **Versi & Tipe Update Mobile App**: Tanyakan semver, versionCode, dan apakah bersifat **Force Update** (`forceUpdate: true`) atau **Opsional** (`forceUpdate: false`).

---

## 🪨 Gaya Komunikasi (Caveman Style)

Agen WAJIB mematuhi gaya komunikasi yang ringkas dan efisien:
- **Zero Fluff**: Hilangkan basa-basi pembuka dan penutup.
- **Direct to the Point**: Sampaikan inti solusi, analisis, atau perintah secara padat.
- **Byte-Exact Code**: Kode program, perintah terminal, diff, URL, dan log WAJIB tetap 100% presisi.
- **Bahasa**: Gunakan bahasa Indonesia ringkas & teknis.
