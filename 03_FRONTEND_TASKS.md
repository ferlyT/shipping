# 03 — Frontend Tasks

**Prasyarat:** Backend Task B-01 sampai B-04 selesai (auth endpoint tersedia).  
**Urutan task WAJIB diikuti.**

---

## TASK F-01: Setup Proyek & Konfigurasi Vite

**Estimasi:** 20 menit  
**File yang dibuat/dimodifikasi:** `vite.config.ts`, `tsconfig.json`, `.env`, `src/main.tsx`

### `vite.config.ts`
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/shipping/',  // PENTING: sesuai dengan production URL
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/shipping/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
```

### `src/lib/constants.ts`
```typescript
// ATURAN: Semua konstanta aplikasi didefinisikan di sini
// DILARANG: string literal route/path di komponen manapun

export const ROUTES = {
  LOGIN: '/shipping/login',
  DASHBOARD: '/shipping/dashboard',
  CUSTOMERS: '/shipping/customers',
  SHIPMENTS: '/shipping/shipments',
  SHIPMENT_DETAIL: (id: string) => `/shipping/shipments/${id}`,
  SHIPMENT_BATCHES: '/shipping/shipment-batches',
  DELIVERY_ORDERS: '/shipping/delivery-orders',
  DELIVERY_DETAIL: (id: string) => `/shipping/delivery-orders/${id}`,
  BILLING: '/shipping/billing',
  BILLING_DETAIL: (id: string) => `/shipping/billing/${id}`,
} as const

export const PAGE_SIZES = [10, 20, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 20

export const DEBOUNCE_DELAY = 400 // ms, untuk search input
```

### `public/web.config` — WAJIB untuk IIS

Buat file ini di `frontend/public/web.config`. Vite akan otomatis copy file di folder `public/` ke `dist/` saat build.

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

### Checklist F-01
- [ ] `bun run dev` berjalan tanpa error
- [ ] Vite base path sudah `/shipping/` (trailing slash)
- [ ] Path alias `@` berfungsi
- [ ] Proxy ke backend sudah dikonfigurasi (dev only)
- [ ] `public/web.config` sudah dibuat
- [ ] Setelah `bun run build`, cek `dist/web.config` ada

---

## TASK F-02: Global Styles & Design System Heritage

**Estimasi:** 30 menit  
**File yang dibuat:** `src/styles/globals.css`, `src/styles/animations.css`, `index.html`

### `index.html` — Import Google Fonts
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Public+Sans:wght@400;500;600&family=Space+Grotesk:wght@400;500&display=swap" rel="stylesheet">
```

### `src/styles/globals.css`
```css
/* ═══════════════════════════════════════════════════
   HERITAGE DESIGN SYSTEM — CSS VARIABLES
   ATURAN: Gunakan variabel ini, JANGAN hardcode hex
   ═══════════════════════════════════════════════════ */

:root {
  /* Colors */
  --color-primary:     #1A1C1E;
  --color-secondary:   #6C7278;
  --color-tertiary:    #B8422E;
  --color-neutral:     #F7F5F2;
  --color-surface:     #FFFFFF;
  --color-on-primary:  #FFFFFF;
  
  /* Borders */
  --color-border:      #E8E6E3;
  --color-border-strong: #C8C4C0;
  
  /* Semantic */
  --color-success:     #2D6A4F;
  --color-warning:     #B7860B;
  --color-danger:      #B8422E; /* sama dengan tertiary */
  --color-muted:       #9EA4AA;

  /* Typography */
  --font-display:  'Fraunces', Georgia, serif;
  --font-body:     'Public Sans', system-ui, sans-serif;
  --font-label:    'Space Grotesk', system-ui, sans-serif;

  /* Font Sizes */
  --text-xs:    0.75rem;   /* 12px */
  --text-sm:    0.875rem;  /* 14px */
  --text-base:  1rem;      /* 16px */
  --text-lg:    1.125rem;  /* 18px */
  --text-xl:    1.25rem;   /* 20px */
  --text-2xl:   1.5rem;    /* 24px */
  --text-3xl:   2rem;      /* 32px */
  --text-h1:    2.5rem;    /* 40px */
  --text-display: 4rem;    /* 64px */

  /* Spacing */
  --space-xs:   4px;
  --space-sm:   8px;
  --space-md:   16px;
  --space-lg:   32px;
  --space-xl:   48px;
  --space-2xl:  64px;

  /* Border Radius */
  --radius-sm:  2px;
  --radius-md:  4px;
  --radius-lg:  8px;

  /* Shadows */
  --shadow-sm:  0 1px 3px rgba(26, 28, 30, 0.08);
  --shadow-md:  0 4px 12px rgba(26, 28, 30, 0.12);
  --shadow-lg:  0 8px 24px rgba(26, 28, 30, 0.16);

  /* Transitions */
  --transition-fast:   150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow:   400ms ease;

  /* Layout */
  --sidebar-width:     240px;
  --topbar-height:     56px;
  --content-max-width: 1200px;
}

/* Reset */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { font-size: 16px; -webkit-font-smoothing: antialiased; }

body {
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--color-primary);
  background-color: var(--color-neutral);
  line-height: 1.6;
}

/* Typography Defaults */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--color-neutral); }
::-webkit-scrollbar-thumb { background: var(--color-border-strong); border-radius: 3px; }
```

### `src/styles/animations.css`
```css
/* Fade In — gunakan untuk page transition */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Slide In Right — gunakan untuk drawer/panel */
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(24px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* Shimmer — gunakan untuk skeleton loading */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.animate-fadeIn     { animation: fadeIn 300ms var(--transition-normal) both; }
.animate-slideInRight { animation: slideInRight 250ms ease both; }
.skeleton {
  background: linear-gradient(90deg, var(--color-border) 25%, var(--color-neutral) 50%, var(--color-border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-md);
}
```

### Checklist F-02
- [ ] Google Fonts ter-load (cek Network tab)
- [ ] CSS variables tersedia di browser DevTools
- [ ] Animasi berfungsi

---

## TASK F-03: API Client & Axios Setup

**Estimasi:** 20 menit  
**File yang dibuat:** `src/api/client.ts`, `src/api/endpoints/index.ts` dan semua endpoint files

### `src/api/client.ts`
```typescript
// ATURAN: Semua HTTP call WAJIB melalui instance ini
// DILARANG: axios.create() atau fetch() di file lain

import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Inject token ke setiap request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 — auto logout
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = import.meta.env.VITE_APP_BASE + '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
```

### `src/api/endpoints/auth.ts`
```typescript
import apiClient from '../client'

export const authApi = {
  login: (data: { username: string; password: string }) =>
    apiClient.post('/auth/login', data),
  
  me: () => apiClient.get('/auth/me'),
}
```

### `src/api/endpoints/customers.ts`
```typescript
import apiClient from '../client'

export const customersApi = {
  list: (params: Record<string, string | number>) =>
    apiClient.get('/customers', { params }),
  
  detail: (id: string) => apiClient.get(`/customers/${id}`),
}
```

**Buat file serupa untuk:** `shipments.ts`, `shipmentBatches.ts`, `deliveryOrders.ts`, `billing.ts`

### `src/api/endpoints/index.ts`
```typescript
// Re-export semua API — import dari sini, bukan dari file individual
export { authApi } from './auth'
export { customersApi } from './customers'
export { shipmentsApi } from './shipments'
export { shipmentBatchesApi } from './shipmentBatches'
export { deliveryOrdersApi } from './deliveryOrders'
export { billingApi } from './billing'
```

### Checklist F-03
- [ ] Request ke dev server berhasil (cek Network tab)
- [ ] Token ter-inject di header Authorization
- [ ] 401 response memicu redirect ke login

---

## TASK F-04: Zustand Stores

**Estimasi:** 20 menit  
**File yang dibuat:** `src/stores/authStore.ts`, `src/stores/uiStore.ts`

### `src/stores/authStore.ts`
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  username: string
  fullName: string
  role: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
}

// ATURAN: Gunakan store ini untuk semua auth state
// DILARANG: localStorage.getItem('token') di komponen manapun
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (token, user) => {
        localStorage.setItem('token', token) // Untuk axios interceptor
        set({ token, user, isAuthenticated: true })
      },
      logout: () => {
        localStorage.removeItem('token')
        set({ token: null, user: null, isAuthenticated: false })
      },
    }),
    { name: 'auth-storage', partialize: (s) => ({ token: s.token, user: s.user }) }
  )
)
```

### `src/stores/uiStore.ts`
```typescript
import { create } from 'zustand'

interface UiState {
  isSidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: true,
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
}))
```

### Checklist F-04
- [ ] Login menyimpan state dan persist di reload
- [ ] Logout membersihkan semua state
- [ ] `isAuthenticated` benar setelah reload

---

## TASK F-05: Hooks Reusable

**Estimasi:** 25 menit  
**File yang dibuat:** `src/hooks/usePagination.ts`, `src/hooks/useDebounce.ts`, `src/hooks/useAuth.ts`

### `src/hooks/usePagination.ts`
```typescript
// ATURAN: Gunakan hook ini untuk SEMUA pagination
// DILARANG: useState page/limit manual di komponen manapun
import { useState } from 'react'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'

export function usePagination(initialLimit = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(initialLimit)

  const goToPage = (newPage: number) => setPage(newPage)
  const reset = () => setPage(1)

  return { page, limit, setLimit, goToPage, reset }
}
```

### `src/hooks/useDebounce.ts`
```typescript
// ATURAN: Gunakan hook ini untuk SEMUA search input
// DILARANG: setTimeout manual untuk debounce di komponen
import { useEffect, useState } from 'react'
import { DEBOUNCE_DELAY } from '@/lib/constants'

export function useDebounce<T>(value: T, delay = DEBOUNCE_DELAY): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}
```

### `src/hooks/useAuth.ts`
```typescript
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/lib/constants'

export function useAuth() {
  const { user, isAuthenticated, login, logout } = useAuthStore()
  return { user, isAuthenticated, login, logout }
}

// Gunakan ini di halaman yang membutuhkan auth
export function useRequireAuth() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  useEffect(() => {
    if (!isAuthenticated) navigate(ROUTES.LOGIN, { replace: true })
  }, [isAuthenticated, navigate])
}
```

### Checklist F-05
- [ ] `usePagination` berhasil track state page dan limit
- [ ] `useDebounce` menunda nilai selama DEBOUNCE_DELAY ms
- [ ] `useRequireAuth` redirect ke login jika tidak autentikasi

---

## TASK F-06: Utility Functions

**Estimasi:** 15 menit  
**File yang dibuat:** `src/lib/utils.ts`

```typescript
// ATURAN: Semua formatter dan helper didefinisikan di sini
// DILARANG: format date/currency inline di komponen

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Class name merger — untuk komponen Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format tanggal ke "12 Jan 2024"
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(date))
}

// Format angka ke "Rp 1.500.000"
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(amount)
}

// Format angka biasa ke "1.500"
export function formatNumber(num: number | null | undefined): string {
  if (num == null) return '—'
  return new Intl.NumberFormat('id-ID').format(num)
}

// Truncate string
export function truncate(str: string, maxLength: number): string {
  return str.length > maxLength ? str.slice(0, maxLength) + '…' : str
}

// Get initials dari nama
export function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}
```

### Checklist F-06
- [ ] `formatDate` mengembalikan format Indonesia yang benar
- [ ] `formatCurrency` mengembalikan format Rupiah yang benar
- [ ] `cn()` berhasil merge Tailwind classes

---

## TASK F-07: Komponen UI (Design System)

**Estimasi:** 60 menit  
**File yang dibuat:** Semua file di `src/components/ui/`

> Setiap komponen menggunakan CSS variables Heritage. DILARANG hardcode warna.

### `src/components/ui/Button.tsx`
```tsx
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export function Button({
  variant = 'primary', size = 'md', isLoading, children, className, disabled, ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary:   'bg-[var(--color-tertiary)] text-[var(--color-on-primary)] hover:opacity-90 focus:ring-[var(--color-tertiary)] rounded-[var(--radius-md)]',
    secondary: 'border border-[var(--color-border-strong)] text-[var(--color-primary)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] focus:ring-[var(--color-primary)] rounded-[var(--radius-md)]',
    ghost:     'text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] rounded-[var(--radius-md)]',
    danger:    'bg-red-50 text-[var(--color-tertiary)] hover:bg-red-100 border border-[var(--color-tertiary)] rounded-[var(--radius-md)]',
  }
  
  const sizes = {
    sm:  'text-xs px-3 py-1.5 gap-1.5',
    md:  'text-sm px-5 py-2.5 gap-2',
    lg:  'text-base px-6 py-3 gap-2.5',
  }
  
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
```

### `src/components/ui/Badge.tsx`
```tsx
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const styles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--color-neutral)] text-[var(--color-secondary)] border-[var(--color-border)]',
  success: 'bg-green-50 text-[var(--color-success)] border-green-200',
  warning: 'bg-yellow-50 text-[var(--color-warning)] border-yellow-200',
  danger:  'bg-red-50 text-[var(--color-tertiary)] border-red-200',
  info:    'bg-blue-50 text-blue-700 border-blue-200',
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-[var(--radius-sm)] font-[var(--font-label)] tracking-wide uppercase',
      styles[variant],
      className
    )}>
      {children}
    </span>
  )
}
```

### `src/components/ui/SearchBar.tsx`
```tsx
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchBar({ value, onChange, placeholder = 'Cari...', className }: SearchBarProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)]" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-primary)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-primary)]"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
```

### `src/components/ui/Table.tsx`
```tsx
// Komponen table reusable — GUNAKAN ini di semua halaman list
// DILARANG: buat elemen <table> custom di halaman manapun

import { cn } from '@/lib/utils'

interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  className?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  keyExtractor: (row: T) => string | number
  isLoading?: boolean
  emptyMessage?: string
}

export function Table<T>({ columns, data, onRowClick, keyExtractor, isLoading, emptyMessage }: TableProps<T>) {
  if (isLoading) return <TableSkeleton columns={columns.length} />
  if (!data.length) return <EmptyTableState message={emptyMessage} />

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            {columns.map((col) => (
              <th key={col.key} className={cn(
                'px-4 py-3 text-left font-medium text-[var(--color-secondary)] font-[var(--font-label)] text-xs tracking-widest uppercase',
                col.className
              )}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'border-b border-[var(--color-border)] transition-colors duration-100',
                onRowClick && 'cursor-pointer hover:bg-[var(--color-neutral)]'
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn('px-4 py-3 text-[var(--color-primary)]', col.className)}>
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TableSkeleton({ columns }: { columns: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className="skeleton h-8" />
          ))}
        </div>
      ))}
    </div>
  )
}

function EmptyTableState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-[var(--color-muted)]">
      <p className="text-sm">{message ?? 'Tidak ada data'}</p>
    </div>
  )
}
```

### `src/components/ui/Pagination.tsx`
```tsx
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  total: number
  limit: number
}

export function Pagination({ page, totalPages, onPageChange, total, limit }: PaginationProps) {
  if (totalPages <= 1) return null
  
  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, total)
  
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)]">
      <p className="text-xs text-[var(--color-secondary)] font-[var(--font-label)]">
        {start}–{end} dari {total} data
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost" size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-xs text-[var(--color-primary)] font-medium px-2">
          {page} / {totalPages}
        </span>
        <Button
          variant="ghost" size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
```

### Checklist F-07
- [ ] Semua komponen UI tidak menggunakan warna hardcode
- [ ] `Table` menampilkan skeleton saat loading
- [ ] `Table` menampilkan empty state saat data kosong
- [ ] `Pagination` tidak muncul jika hanya 1 halaman
- [ ] `Button` menampilkan spinner saat isLoading

---

## TASK F-08: Layout (AppLayout, Sidebar, Topbar)

**Estimasi:** 45 menit  
**File yang dibuat:** `src/components/layout/AppLayout.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/Topbar.tsx`

### Sidebar — Navigation Items
```typescript
// Di dalam Sidebar.tsx
const navItems = [
  { label: 'Dashboard',     path: ROUTES.DASHBOARD,        icon: LayoutDashboard },
  { label: 'Customer',      path: ROUTES.CUSTOMERS,        icon: Users },
  { label: 'Shipment',      path: ROUTES.SHIPMENTS,        icon: Package },
  { label: 'Batch Marking', path: ROUTES.SHIPMENT_BATCHES, icon: Layers },
  { label: 'Delivery Order',path: ROUTES.DELIVERY_ORDERS,  icon: Truck },
  { label: 'Billing',       path: ROUTES.BILLING,          icon: FileText },
]
```

**Desain Sidebar:**
- Background: `var(--color-primary)` (ink dark)
- Text aktif: `var(--color-on-primary)` + accent `var(--color-tertiary)` pada left border
- Text inaktif: `rgba(255,255,255,0.5)`
- Lebar: `var(--sidebar-width)` = 240px
- Collapsible di mobile (hamburger dari Topbar)

**Desain Topbar:**
- Background: `var(--color-surface)` dengan border bottom
- Kiri: Hamburger button (mobile) + Page title
- Kanan: User avatar (initials) + nama + logout button

### Checklist F-08
- [ ] Sidebar berfungsi di desktop dan mobile
- [ ] Active route ter-highlight
- [ ] Logout berfungsi dan redirect ke login
- [ ] Topbar menampilkan nama halaman yang benar

---

## TASK F-09: Routes & Protected Route

**Estimasi:** 20 menit

### `src/routes/ProtectedRoute.tsx`
```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/lib/constants'

export function ProtectedRoute() {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <Outlet /> : <Navigate to={ROUTES.LOGIN} replace />
}
```

### `src/routes/AppRouter.tsx`
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { ROUTES } from '@/lib/constants'

// Lazy load pages untuk performa
import { lazy, Suspense } from 'react'
const LoginPage          = lazy(() => import('@/pages/LoginPage'))
const DashboardPage      = lazy(() => import('@/pages/DashboardPage'))
const CustomersPage      = lazy(() => import('@/pages/CustomersPage'))
const ShipmentsPage      = lazy(() => import('@/pages/ShipmentsPage'))
const ShipmentDetailPage = lazy(() => import('@/pages/ShipmentDetailPage'))
const ShipmentBatchesPage = lazy(() => import('@/pages/ShipmentBatchesPage'))
const DeliveryOrdersPage = lazy(() => import('@/pages/DeliveryOrdersPage'))
const DeliveryDetailPage = lazy(() => import('@/pages/DeliveryDetailPage'))
const BillingPage        = lazy(() => import('@/pages/BillingPage'))
const BillingDetailPage  = lazy(() => import('@/pages/BillingDetailPage'))

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading…</div>}>
        <Routes>
          <Route path="/shipping/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/shipping" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
              <Route path={ROUTES.DASHBOARD}         element={<DashboardPage />} />
              <Route path={ROUTES.CUSTOMERS}         element={<CustomersPage />} />
              <Route path={ROUTES.SHIPMENTS}         element={<ShipmentsPage />} />
              <Route path="/shipping/shipments/:id"  element={<ShipmentDetailPage />} />
              <Route path={ROUTES.SHIPMENT_BATCHES}  element={<ShipmentBatchesPage />} />
              <Route path={ROUTES.DELIVERY_ORDERS}   element={<DeliveryOrdersPage />} />
              <Route path="/shipping/delivery-orders/:id" element={<DeliveryDetailPage />} />
              <Route path={ROUTES.BILLING}           element={<BillingPage />} />
              <Route path="/shipping/billing/:id"    element={<BillingDetailPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
```

---

## TASK F-10: Login Page

**Estimasi:** 30 menit

**Desain:**
- Halaman split: kiri gelap (`var(--color-primary)`) dengan tipografi Fraunces, kanan form putih
- Di mobile: hanya tampilkan form
- Form: username + password + tombol Login (primary/tertiary)
- Validasi: field tidak boleh kosong, error dari API ditampilkan inline

### Checklist F-10
- [ ] Login berhasil → redirect ke dashboard
- [ ] Login gagal → tampilkan pesan error
- [ ] Loading state aktif selama request
- [ ] Enter key submit form

---

## TASK F-11 sampai F-17: Halaman Data

**Pola setiap halaman list:**
1. PageHeader (judul + deskripsi)
2. Toolbar (SearchBar + filter jika perlu)
3. Card wrapping Table + Pagination
4. onClick row → navigate ke detail atau buka drawer

| Task | Halaman | Endpoint | Search Field |
|------|---------|----------|-------------|
| F-11 | CustomersPage | `GET /customers` | nama, kode |
| F-12 | ShipmentsPage | `GET /shipments` | no resi, customer |
| F-13 | ShipmentBatchesPage | `GET /shipment-batches` | no batch, tujuan |
| F-14 | DeliveryOrdersPage | `GET /delivery-orders` | no DO, customer |
| F-15 | BillingPage | `GET /billing` | no invoice, customer |

**⚠️ Field yang akan di-search dan ditampilkan di tabel WAJIB konfirmasi dengan owner setelah schema diketahui.**

**Pola halaman detail:**
- Header: ID + badge status + tombol Back
- Grid info: 2 kolom di desktop, 1 kolom di mobile
- Section detail: tabel untuk child records (misalnya `tbEntryListDetail`)

### Checklist F-11 sampai F-17
- [ ] Setiap halaman list menampilkan data dari API
- [ ] Search bekerja dengan debounce
- [ ] Pagination berfungsi
- [ ] Click row menampilkan detail
- [ ] Semua halaman memiliki loading state dan empty state
- [ ] React Query cache bekerja (tidak re-fetch saat kembali ke halaman yang sama)

---

## 🔴 Aturan Wajib untuk Agen Frontend

1. **JANGAN** import dari file endpoint individual — selalu dari `@/api/endpoints/index.ts`
2. **JANGAN** buat state `page`/`limit` manual — selalu gunakan `usePagination()`
3. **JANGAN** format tanggal/angka inline — selalu gunakan `lib/utils.ts`
4. **JANGAN** hardcode warna atau ukuran — gunakan CSS variables Heritage
5. **JANGAN** buat komponen `<table>` baru — gunakan komponen `Table` dari `ui/`
6. **SELALU** gunakan `ROUTES` dari `constants.ts` untuk navigasi
7. **SELALU** wrap API call dengan React Query `useQuery`/`useMutation`
