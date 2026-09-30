# 🔍 Search Suggestions & Autocomplete Context — mshipping

Dokumen konteks teknis untuk optimasi mesin pencarian dan autocomplete lintas platform (Backend, Web Frontend, dan Mobile App).

---

## 1. Backend Caching & Index Optimization (`backend/`)
- **`SuggestionCache` Singleton (`backend/src/utils/cache.ts`)**:
  - In-memory cache dengan TTL 30 detik, kapasitas 2.000 entri, dan evictor FIFO otomatis.
  - Menghasilkan respon kueri ter-cache dalam < 1ms (target < 5ms).
- **Two-Stage Prefix Search**:
  - Pencarian marking code langsung ke tabel `tbMarking` (~14k baris) alih-alih scan tabel raksasa `tbEntryList` (726k baris).
  - Prefix matching terindeks pada `tbEntryList.fdTerima`, `tbDelivery.fdSJNo`, dan `tbBilling.fdInvNo` dengan batasan tahun 2023/2025+.
  - Query customer memfilter pelanggan aktif `ISNULL(fdDiscontinued, 0) <> 1`.

---

## 2. Web Frontend Toolbar & Filter Synchronizer (`frontend/`)
- **Pencarian Ter-Debounce 300ms** (`useDebounce(search, 300)`).
- **Komponen Popover Terpadu `<SearchSuggestionsDropdown>` (`z-50`)**:
  - Desain Midnight Dark Mode ramah outline border, preview subtitle, dan navigasi keyboard.
- **Auto-Sync Filter Scope**:
  - `ShipmentToolbar`: Saran customer $\to$ `searchField='customer'`, marking $\to$ `'marking'`, resi $\to$ `'resi'`.
  - `BatchToolbar`: Saran marking $\to$ `searchScope='code'`.
  - `DeliveryOrderToolbar`: Saran SJ $\to$ `'sjNo'`, customer $\to$ `'customer'`, supir $\to$ `'supir'`.
  - `BillingToolbar`: Menerapkan filter teks langsung dan preservasi kode pelanggan `selectedCustCode`.

---

## 3. Mobile App Integration (`mobile/`)
- Menerapkan `useDebounce(300ms)` pada seluruh query pencarian di `logistics.tsx`, `finance.tsx`, dan `master.tsx`.
- Customer price lookup mengikat `selectedCustCode` langsung ke kode pelanggan (`sug.custCode || sug.value`), menyelesaikan masalah pencarian harga khusus pelanggan.
