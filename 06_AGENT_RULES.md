# 06 — Aturan Agen & Checklist Eksekusi

Dokumen ini adalah panduan operasional untuk agen murah yang mengeksekusi task.
Baca SELURUH dokumen ini sebelum memulai task apapun.

---

## 🔴 Keputusan yang WAJIB Ditanyakan ke Owner

Agen HARUS berhenti dan menunggu jawaban owner sebelum melanjutkan jika menghadapi:

### Level 1 — BLOKIR TOTAL (jangan lanjutkan sampai dijawab)
- [ ] Nama kolom tabel existing yang tidak diketahui
- [ ] Primary key type tabel existing (INT, UUID, atau custom string?)
- [ ] Nama kolom foreign key yang menghubungkan tabel
- [ ] Apakah ada field yang sensitif/tidak boleh di-expose ke frontend
- [ ] Apakah ada tabel yang perlu filter default (misalnya: hanya tampilkan data bulan ini)

### Level 2 — TANYAKAN sebelum implementasi
- [ ] Field mana yang menjadi kolom di tabel list (kolom apa yang ditampilkan)
- [ ] Field mana yang bisa di-search
- [ ] Status/enum values yang mungkin ada (misalnya: status shipment apa saja?)
- [ ] Apakah ada kolom yang perlu format khusus (berat dalam kg, harga dalam Rupiah, dll)
- [ ] Sort default untuk setiap tabel (urutkan berdasarkan apa?)

### Level 3 — TANYAKAN jika tidak yakin
- [ ] Nama tampilan yang tepat untuk kolom (misalnya: "tglMasuk" → tampilkan sebagai "Tanggal Masuk"?)
- [ ] Apakah row detail perlu ditampilkan di halaman baru atau di drawer?

---

## 📋 Checklist Eksekusi Per Task

### Sebelum Mulai Task Apapun
- [ ] Baca dokumen `00_PROJECT_OVERVIEW.md` sekali
- [ ] Cek apakah task ini bergantung pada task lain yang belum selesai
- [ ] Cek daftar "Keputusan yang WAJIB Ditanyakan" di atas
- [ ] Pastikan tidak ada variabel/fungsi duplikat dengan task yang sudah selesai

### Saat Mengerjakan Task
- [ ] Cek `src/lib/constants.ts` sebelum mendefinisikan konstanta baru
- [ ] Cek `src/lib/utils.ts` sebelum menulis helper function baru
- [ ] Cek `src/components/ui/` sebelum membuat komponen baru
- [ ] Gunakan utility yang sudah ada, JANGAN buat ulang

### Setelah Selesai Task
- [ ] Centang semua item di checklist task yang bersangkutan
- [ ] Pastikan tidak ada `console.log`, `TODO` tanpa komentar, atau `any` type yang tidak disengaja
- [ ] Test endpoint atau komponen secara manual sebelum deklarasi selesai

---

## 🚫 Daftar Anti-Pattern — DILARANG

### Backend
```
❌ new PrismaClient()          → ✅ import { prisma } from '@/config/database'
❌ console.log(...)            → ✅ import { logger } from '@/config/logger'
❌ process.env.JWT_SECRET      → ✅ import { ENV } from '@/config/env'
❌ c.json({ success: true })   → ✅ return successResponse(c, data)
❌ (page-1)*limit              → ✅ buildPagination({ page, limit })
❌ parseInt(c.req.query('page'))→ ✅ parsePagination(c.req.query())
```

### Frontend
```
❌ localStorage.getItem('token')     → ✅ useAuthStore().token
❌ useState({ page: 1 })             → ✅ usePagination()
❌ setTimeout(fn, 400)               → ✅ useDebounce(value)
❌ new Date(d).toLocaleDateString()  → ✅ formatDate(d)
❌ Intl.NumberFormat().format(n)     → ✅ formatCurrency(n) atau formatNumber(n)
❌ navigate('/shipping/customers')   → ✅ navigate(ROUTES.CUSTOMERS)
❌ axios.get('/api/...')             → ✅ customersApi.list(params)
❌ import { customersApi } from './customers' → ✅ from '@/api/endpoints'
❌ <table>...</table>                → ✅ <Table columns={...} data={...} />
❌ #B8422E hardcoded                 → ✅ var(--color-tertiary)
```

---

## 📁 Daftar Variabel & Fungsi Global (Single Source of Truth)

Agen WAJIB cek daftar ini sebelum mendefinisikan sesuatu yang baru:

### Backend Singletons
| Nama | File | Tipe |
|------|------|------|
| `prisma` | `src/config/database.ts` | PrismaClient |
| `logger` | `src/config/logger.ts` | winston.Logger |
| `ENV` | `src/config/env.ts` | object const |
| `authMiddleware` | `src/middleware/auth.ts` | Hono Middleware |
| `successResponse` | `src/utils/response.ts` | function |
| `errorResponse` | `src/utils/response.ts` | function |
| `buildPagination` | `src/utils/pagination.ts` | function |
| `parsePagination` | `src/utils/pagination.ts` | function |

### Frontend Singletons / Utilities
| Nama | File | Tipe |
|------|------|------|
| `apiClient` | `src/api/client.ts` | AxiosInstance |
| `authApi` | `src/api/endpoints/index.ts` | API object |
| `customersApi` | `src/api/endpoints/index.ts` | API object |
| `shipmentsApi` | `src/api/endpoints/index.ts` | API object |
| `shipmentBatchesApi` | `src/api/endpoints/index.ts` | API object |
| `deliveryOrdersApi` | `src/api/endpoints/index.ts` | API object |
| `billingApi` | `src/api/endpoints/index.ts` | API object |
| `useAuthStore` | `src/stores/authStore.ts` | Zustand store |
| `useUiStore` | `src/stores/uiStore.ts` | Zustand store |
| `usePagination` | `src/hooks/usePagination.ts` | React hook |
| `useDebounce` | `src/hooks/useDebounce.ts` | React hook |
| `useAuth` | `src/hooks/useAuth.ts` | React hook |
| `cn` | `src/lib/utils.ts` | function |
| `formatDate` | `src/lib/utils.ts` | function |
| `formatCurrency` | `src/lib/utils.ts` | function |
| `formatNumber` | `src/lib/utils.ts` | function |
| `ROUTES` | `src/lib/constants.ts` | const object |
| `PAGE_SIZES` | `src/lib/constants.ts` | const array |
| `DEFAULT_PAGE_SIZE` | `src/lib/constants.ts` | const number |
| `DEBOUNCE_DELAY` | `src/lib/constants.ts` | const number |

### Frontend UI Components (Jangan Buat Ulang)
| Komponen | File | Digunakan untuk |
|----------|------|-----------------|
| `<Button>` | `src/components/ui/Button.tsx` | Semua tombol |
| `<Badge>` | `src/components/ui/Badge.tsx` | Status label |
| `<Table>` | `src/components/ui/Table.tsx` | Semua tabel data |
| `<Pagination>` | `src/components/ui/Pagination.tsx` | Navigasi halaman |
| `<SearchBar>` | `src/components/ui/SearchBar.tsx` | Input pencarian |
| `<Modal>` | `src/components/ui/Modal.tsx` | Dialog/popup |
| `<Card>` | `src/components/ui/Card.tsx` | Container konten |

---

## 🔢 Urutan Eksekusi Task

### Phase 1: Foundation (Lakukan Pertama)
```
B-01 → B-02 → B-03 → B-04 (Backend foundation + Auth)
F-01 → F-02 → F-03 → F-04 → F-05 → F-06 (Frontend foundation)
```

### Phase 2: UI Shell
```
F-07 → F-08 → F-09 → F-10 (Komponen UI + Layout + Login)
```

### Phase 3: Data Modules (Tunggu konfirmasi schema dari owner)
```
B-05 → B-06 → B-07 → B-08 → B-09 (Backend modules)
F-11 → F-12 → F-13 → F-14 → F-15 → F-16 → F-17 (Frontend pages)
```

### Phase 4: Integration & Polish
```
B-11 (Final backend wiring)
Testing end-to-end per flow
```

---

## 🌐 IIS Config Reference (untuk DevOps/Owner)

**Server menggunakan Windows IIS + ARR.** Detail lengkap ada di `00_PROJECT_OVERVIEW.md` bagian Deployment Notes.

### Ringkasan Cepat
- Frontend `dist/` → copy ke `C:\inetpub\wwwroot\shipping\`
- `public/web.config` harus ada di repo dan ter-copy ke `dist/` saat build
- ARR Reverse Proxy arahkan `/shipping/api/*` → `localhost:3000`
- Backend dijalankan via PM2 atau NSSM Windows Service

### File `public/web.config` (agen WAJIB buat file ini di Task F-01)
```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="API Passthrough" stopProcessing="true">
          <match url="^shipping/api/(.*)" />
          <action type="None" />
        </rule>
        <rule name="SPA Fallback" stopProcessing="true">
          <match url="^shipping/(.*)" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/shipping/index.html" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
    </staticContent>
  </system.webServer>
</configuration>
```

---

## 📊 Progress Tracker

Agen update tabel ini setelah setiap task selesai:

| Task | Status | Tanggal Selesai | Catatan |
|------|--------|-----------------|---------|
| B-01 | ⏳ Pending | — | — |
| B-02 | ⏳ Pending | — | — |
| B-03 | ⏳ Pending | — | — |
| B-04 | ⏳ Pending | — | — |
| B-05 | 🔒 Tunggu Schema | — | Butuh konfirmasi kolom |
| B-06 | 🔒 Tunggu Schema | — | Butuh konfirmasi kolom |
| B-07 | 🔒 Tunggu Schema | — | Butuh konfirmasi kolom |
| B-08 | 🔒 Tunggu Schema | — | Butuh konfirmasi kolom |
| B-09 | 🔒 Tunggu Schema | — | Butuh konfirmasi kolom |
| B-11 | ⏳ Pending | — | — |
| F-01 | ⏳ Pending | — | — |
| F-02 | ⏳ Pending | — | — |
| F-03 | ⏳ Pending | — | — |
| F-04 | ⏳ Pending | — | — |
| F-05 | ⏳ Pending | — | — |
| F-06 | ⏳ Pending | — | — |
| F-07 | ⏳ Pending | — | — |
| F-08 | ⏳ Pending | — | — |
| F-09 | ⏳ Pending | — | — |
| F-10 | ⏳ Pending | — | — |
| F-11 | 🔒 Tunggu Schema | — | Butuh konfirmasi kolom |
| F-12 | 🔒 Tunggu Schema | — | Butuh konfirmasi kolom |
| F-13 | 🔒 Tunggu Schema | — | Butuh konfirmasi kolom |
| F-14 | 🔒 Tunggu Schema | — | Butuh konfirmasi kolom |
| F-15 | 🔒 Tunggu Schema | — | Butuh konfirmasi kolom |
| F-16 | 🔒 Tunggu Schema | — | Butuh konfirmasi kolom |
| F-17 | 🔒 Tunggu Schema | — | Butuh konfirmasi kolom |

**Legend:** ⏳ Pending | 🔒 Blocked | 🔄 In Progress | ✅ Done | ❌ Failed
