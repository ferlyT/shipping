# mshipping — Master Plan
**Version:** 1.1  
**Stack:** React 19 + Vite + TypeScript (frontend) | Hono.js + Bun + Prisma + MS SQL Server (backend)  
**Production URL:** `http://36.93.22.142/mshipping`  
**Design System:** mshipping Alpha  

---

## 🆕 Fitur Baru (v1.1)

### Delivery Orders — Ringkasan per List Code
**Status:** Planned  
**File Spec:** `frontend/Fitur-baru-delivery-page.md`

Tambah tampilan tabel ringkasan di `DeliveryOrdersPage` yang mengelompokkan data berdasarkan `fdListCode`.

| Kolom Baru | Sumber Data |
|------------|-------------|
| `listCode` | `tbDelivery.fdListCode` |
| `markingCode` | `tbEntryList.fdMarkingCode` |
| `totalQty` | `tbEntryList.fdJmlPAck` |
| `totalTerkirim` | `SUM(tbDeliveryDetail.fdQtySJ)` GROUP BY listcode |
| `sisa` | `totalQty - totalTerkirim` |
| `status` | (kosong, untuk pengisian nanti) |

**Endpoint baru:** `GET /mshipping/api/delivery-orders/grouped`

---


## 🗺️ Struktur Dokumen Master Plan

```
00_PROJECT_OVERVIEW.md       ← (ini) Arsitektur, konvensi, aturan agen
01_DATABASE_SCHEMA.md        ← Skema tbUsers + mapping semua tabel
02_BACKEND_TASKS.md          ← Task backend: auth, routes, prisma
03_FRONTEND_TASKS.md         ← Task frontend: pages, components, stores
04_SHARED_CONTRACTS.md       ← API contracts (request/response shapes)
05_DESIGN_SYSTEM.md          ← Token desain Heritage, komponen UI
06_AGENT_RULES.md            ← Aturan agen: naming, no-repeat, checklist
```

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────┐
│  Browser  http://36.93.22.142/shipping              │
│  React 19 + Vite SPA                                │
└──────────────────┬──────────────────────────────────┘
                   │ HTTP/JSON (axios)
                   │ BASE_URL = /shipping/api
                   ▼
┌─────────────────────────────────────────────────────┐
│  Hono.js + Bun (Backend)                            │
│  Mount path: /shipping                              │
│  Port: 3000 (internal, diproxy nginx)               │
└──────────────────┬──────────────────────────────────┘
                   │ Prisma ORM
                   ▼
┌─────────────────────────────────────────────────────┐
│  MS SQL Server                                      │
│  Tables & Views: tbUsers, tbRolePermissions,        │
│          tbCustomers, vwCustomerContacts,           │
│          tbEntryList, tbEntryListDetail,            │
│          tbMarking, vwShipment, tbDelivery,         │
│          tbDeliveryDetail, tbBilling,               │
│          tbBillingDetail, vwShipmentDimensionWH     │
└─────────────────────────────────────────────────────┘
```

---

## 📁 Struktur Folder Proyek

```
project-root/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts           # Semua env var (satu sumber kebenaran)
│   │   │   ├── database.ts      # Prisma client singleton
│   │   │   └── logger.ts        # Winston logger singleton
│   │   ├── middleware/
│   │   │   ├── auth.ts          # JWT verify middleware
│   │   │   └── errorHandler.ts  # Global error handler
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── auth.schema.ts    # Zod schemas
│   │   │   ├── customers/
│   │   │   │   ├── customers.routes.ts
│   │   │   │   └── customers.service.ts
│   │   │   ├── shipments/            # tbEntryList
│   │   │   ├── shipment-batches/     # tbMarking
│   │   │   ├── delivery-orders/      # tbDelivery
│   │   │   ├── shipment-details/     # tbEntryListDetail
│   │   │   ├── delivery-details/     # tbDeliveryDetail
│   │   │   └── billing/              # tbBilling + tbBillingDetail
│   │   ├── utils/
│   │   │   ├── pagination.ts         # Reusable pagination helper
│   │   │   ├── response.ts           # Standar response builder
│   │   │   └── queryBuilder.ts       # Reusable filter/search builder
│   │   └── index.ts                  # Entry point, mount semua routes
│   ├── prisma/
│   │   └── schema.prisma
│   ├── .env
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   ├── client.ts           # Axios instance (BASE_URL, interceptors)
    │   │   └── endpoints/          # Satu file per modul
    │   │       ├── auth.ts
    │   │       ├── customers.ts
    │   │       ├── shipments.ts
    │   │       ├── shipmentBatches.ts
    │   │       ├── deliveryOrders.ts
    │   │       ├── billing.ts
    │   │       └── index.ts        # Re-export semua
    │   ├── stores/
    │   │   ├── authStore.ts        # Zustand: user, token, login, logout
    │   │   └── uiStore.ts          # Zustand: sidebar open/close, theme
    │   ├── hooks/
    │   │   ├── useAuth.ts          # Wrapper authStore + guard
    │   │   ├── usePagination.ts    # Reusable pagination state
    │   │   └── useDebounce.ts      # Search debounce
    │   ├── components/
    │   │   ├── ui/                 # Design system components
    │   │   │   ├── Button.tsx
    │   │   │   ├── Input.tsx
    │   │   │   ├── Badge.tsx
    │   │   │   ├── Card.tsx
    │   │   │   ├── Table.tsx
    │   │   │   ├── Pagination.tsx
    │   │   │   ├── SearchBar.tsx
    │   │   │   ├── LoadingSpinner.tsx
    │   │   │   ├── EmptyState.tsx
    │   │   │   └── Modal.tsx
    │   │   ├── layout/
    │   │   │   ├── AppLayout.tsx   # Shell: sidebar + topbar + outlet
    │   │   │   ├── Sidebar.tsx
    │   │   │   └── Topbar.tsx
    │   │   └── shared/
    │   │       └── DetailDrawer.tsx # Slide-in panel untuk detail row
    │   ├── pages/
    │   │   ├── LoginPage.tsx
    │   │   ├── DashboardPage.tsx
    │   │   ├── CustomersPage.tsx
    │   │   ├── ShipmentsPage.tsx       # tbEntryList
    │   │   ├── ShipmentDetailPage.tsx  # tbEntryList + tbEntryListDetail
    │   │   ├── ShipmentBatchesPage.tsx # tbMarking
    │   │   ├── DeliveryOrdersPage.tsx  # tbDelivery
    │   │   ├── DeliveryDetailPage.tsx  # tbDelivery + tbDeliveryDetail
    │   │   ├── BillingPage.tsx         # tbBilling + tbBillingDetail
    │   │   └── NotFoundPage.tsx
    │   ├── routes/
    │   │   ├── AppRouter.tsx       # React Router setup + protected route
    │   │   └── ProtectedRoute.tsx
    │   ├── lib/
    │   │   ├── utils.ts            # cn(), formatDate(), formatCurrency()
    │   │   └── constants.ts        # ROUTES, PAGE_SIZES, dll
    │   ├── styles/
    │   │   ├── globals.css         # Heritage CSS variables + font imports
    │   │   └── animations.css      # Keyframes reusable
    │   └── main.tsx
    └── package.json
```

---

## 🔑 Konvensi Wajib (Baca Sebelum Mulai)

### Penamaan

| Konteks | Konvensi | Contoh |
|---------|----------|--------|
| Backend file | `kebab-case` | `auth.service.ts` |
| Backend function | `camelCase` | `getCustomerById()` |
| Frontend component | `PascalCase` | `CustomerTable.tsx` |
| Frontend hook | `camelCase` prefix `use` | `usePagination()` |
| Zustand store | `camelCase` suffix `Store` | `authStore` |
| API endpoint const | `UPPER_SNAKE` | `CUSTOMERS_API` |
| CSS class | `kebab-case` | `.data-table` |
| Prisma model | `PascalCase` match tabel | `TbCustomers` |

### Anti-Duplikasi

- **Alert/Notifikasi**: Selalu gunakan `toast` dari `stores/toastStore.ts` — DILARANG menggunakan `alert()` bawaan browser.
- **Pagination**: Selalu gunakan `usePagination.ts` — DILARANG buat state `page`/`limit` manual di komponen manapun
- **API call**: Semua axios call WAJIB melalui `src/api/client.ts` — DILARANG `fetch()` atau axios direct di komponen
- **Format tanggal**: Selalu gunakan `formatDate()` dari `lib/utils.ts`
- **Format angka/mata uang**: Selalu gunakan `formatCurrency()` dari `lib/utils.ts`
- **Response builder backend**: Semua route WAJIB gunakan `utils/response.ts` — DILARANG return JSON manual
- **Error handling backend**: Semua try/catch WAJIB `throw` ke `errorHandler.ts` middleware
- **Logger**: Gunakan singleton dari `config/logger.ts` — DILARANG `console.log` di production code
- **Prisma client**: Gunakan singleton dari `config/database.ts` — DILARANG `new PrismaClient()` di file lain

---

## 🌐 URL & Routing

### Backend Routes Pattern
```
POST   /shipping/api/auth/login
POST   /shipping/api/auth/logout
GET    /shipping/api/auth/me

GET    /shipping/api/customers
GET    /shipping/api/customers/:id

GET    /shipping/api/shipments
GET    /shipping/api/shipments/:id
GET    /shipping/api/shipments/:id/details

GET    /shipping/api/shipment-batches
GET    /shipping/api/shipment-batches/:id

GET    /shipping/api/delivery-orders
GET    /shipping/api/delivery-orders/:id
GET    /shipping/api/delivery-orders/:id/details

GET    /shipping/api/billing
GET    /shipping/api/billing/:id
GET    /shipping/api/billing/:id/details
```

### Frontend Routes Pattern
```
/shipping/login
/shipping/                          → redirect ke /shipping/dashboard
/shipping/dashboard
/shipping/customers
/shipping/shipments
/shipping/shipments/:id
/shipping/shipment-batches
/shipping/delivery-orders
/shipping/delivery-orders/:id
/shipping/billing
/shipping/billing/:id
```

---

## ⚙️ Environment Variables

### Backend `.env`
```env
DATABASE_URL="sqlserver://HOST:PORT;database=DB_NAME;user=USER;password=PASS;trustServerCertificate=true"
JWT_SECRET="ganti-dengan-secret-panjang"
JWT_EXPIRES_IN="8h"
PORT=3000
APP_BASE_PATH="/shipping"
NODE_ENV="production"
```

### Frontend `.env`
```env
VITE_API_BASE_URL="http://36.93.22.142/shipping/api"
VITE_APP_BASE="/shipping"
```

---

## 🔐 Auth Flow

```
User isi form login
    ↓
POST /shipping/api/auth/login
    ↓ (bcrypt verify)
Return JWT token + user data
    ↓
Frontend simpan token di localStorage via authStore
    ↓
Axios interceptor: inject Authorization: Bearer <token> di setiap request
    ↓
Backend auth middleware: verify JWT, inject user ke context
    ↓
Semua protected route cek context user
```

Token expire → axios interceptor 401 → auto logout + redirect `/shipping/login`

---

## 📦 Deployment Notes — IIS

Server menggunakan **Windows IIS**, bukan nginx. Arsitektur deployment:

```
Internet
    ↓
IIS (port 80)
    ├── /shipping/*        → Static files (frontend dist)  [IIS Static Handler]
    │   └── web.config     → URL Rewrite untuk SPA fallback
    └── /shipping/api/*    → Reverse Proxy → localhost:3000 [ARR Proxy]
                                ↓
                           Hono.js + Bun (Windows Service / PM2-Windows)
```

### Prasyarat IIS (Owner/DevOps install sebelum deploy)
- **IIS + ARR (Application Request Routing)** — untuk reverse proxy ke backend
- **URL Rewrite Module** — untuk SPA fallback routing
- **Bun untuk Windows** — runtime backend

### Frontend: `web.config` (wajib ada di root `dist/`)

Buat file ini dan taruh di `public/web.config` agar ter-copy ke `dist/` saat build:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- Jangan rewrite request ke /shipping/api/ -->
        <rule name="API Passthrough" stopProcessing="true">
          <match url="^shipping/api/(.*)" />
          <action type="None" />
        </rule>
        <!-- SPA fallback: semua route yang bukan file/folder → index.html -->
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
      <!-- Agar IIS serve .js/.json/.woff2 dengan benar -->
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
    </staticContent>
  </system.webServer>
</configuration>
```

### Backend: ARR Reverse Proxy Config (di IIS Manager)

Tambahkan rule di **IIS level site** (bukan di web.config frontend):

```xml
<!-- Di web.config IIS site root, BUKAN di dist/ -->
<rule name="Backend API Proxy" stopProcessing="true">
  <match url="^shipping/api/(.*)" />
  <action type="Rewrite" url="http://localhost:3000/shipping/api/{R:1}" />
</rule>
```

Atau konfigurasi via IIS Manager:
1. Buka IIS Manager → pilih site
2. Application Request Routing → Server Proxy Settings → Enable proxy
3. URL Rewrite → Add Rule → Reverse Proxy → `localhost:3000`

### Backend: Jalankan Hono.js di Windows

Gunakan **PM2** (atau NSSM sebagai Windows Service):
```powershell
# Install PM2 secara global
npm install -g pm2

# Jalankan backend
pm2 start "bun run src/index.ts" --name "logistics-backend"
pm2 startup
pm2 save
```

Atau gunakan NSSM (Non-Sucking Service Manager) untuk register sebagai Windows Service.

### Vite Build Config — Pastikan `base` benar
```typescript
// vite.config.ts
base: '/shipping/'  // trailing slash PENTING untuk IIS static serving
```

### Deploy Steps (setiap update)
```powershell
# Frontend
cd frontend
bun run build
# Copy isi dist/ ke folder IIS: C:\inetpub\wwwroot\shipping\

# Backend
cd backend
pm2 restart logistics-backend
# atau: pm2 reload logistics-backend (zero-downtime)
```
