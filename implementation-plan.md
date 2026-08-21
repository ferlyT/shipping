# Fitur: Customer Price List (Harga Khusus per Customer)

Menambahkan kemampuan upload dan manajemen **harga khusus per customer** dari tabel `tbCustomers` dalam format Excel yang sama dengan price list umum (contoh file: `BB UPDATE 30.7.2026.xlsx`). Harga khusus ini bersifat **terpisah** dari price list umum — jika customer tidak memiliki harga khusus, sistem secara otomatis fallback ke price list umum saat pengecekan validasi billing.

Halaman diletakkan di bawah menu **Finance**, setara dengan Price List umum.

---

## Keputusan Desain

| Topik | Keputusan |
|---|---|
| Penyimpanan | Tabel baru `tbCustomerPriceListUpload` + `tbCustomerPriceListItem` |
| Input Data | Upload Excel (Format Matrix persis seperti `BB UPDATE 30.7.2026.xlsx`) |
| Relasi Price List Umum | **Terpisah** — billing validation fallback ke price list umum jika customer tidak punya harga khusus |
| Skema Kolom Item | `sheetType`, `mode`, `branch`, `transitTime`, `category`, `price` (identik dengan `tbPriceListItem`) |
| Menu Navigasi | **Finance** → sub-menu **Price List Customer** |

---

## Analisis Format File Contoh (`BB UPDATE 30.7.2026.xlsx`)

Berdasarkan analisa isi file `BB UPDATE 30.7.2026.xlsx`:
1. **Struktur Worksheet**: Single sheet (`Sheet1`) yang menggabungkan matriks harga **BY SEA** dan **BY AIR** secara bertumpuk.
2. **Matriks BY SEA**:
   - Baris Header Mode: Col 1 = `"BY SEA"`, Col 2..N = Kode Tujuan (`SG`, `HK`, `GZ`, `SH`, `YW`).
   - Baris Estimasi Transit: Col 2..N = Estimasi waktu (`± 14-20 Days`, `± 30 Days`, dll).
   - Baris Komoditas & Tarif: Col 1 = Nama Komoditas (contoh: `General Goods`, `Lartas Normal`, `Fabric`, `Alkes, Makanan & LS Lainnya`, `Khusus Ipad ...`), Col 2..N = Tarif (contoh: `7.500.000`, `300.000`, `"(Cek Harga)"`).
3. **Matriks BY AIR**:
   - Baris Header Mode: Col 1 = `"BY AIR"`, Col 2..N = Kode Tujuan (`SG`, `HK`, `GZ`).
   - Baris Estimasi Transit: Col 2..N = Estimasi waktu (`± 5 Days`, `± 7 Days`, dll).
   - Baris Komoditas & Tarif: Col 1 = Nama Komoditas (contoh: `General Goods & Non-Brand`, `Branded Goods,Lartas Normal`, `Apple Laptop`), Col 2..N = Tarif (contoh: `150.000`, `180.000`).
4. **Footnotes / Catatan**: Baris yang diawali tanda bintang `*` (contoh: `*Note : BY AIR...`, `*Harga di atas tidak termasuk...`) diabaikan secara otomatis oleh parser.
5. **Kesesuaian Parser**: Parser `parsePriceListWorkbook` (`backend/src/modules/price-list/excel-parser.service.ts`) sudah sepenuhnya kompatibel dengan struktur matriks ini dan dapat langsung di-reuse.

---

## Proposed Changes

---

### Backend — Database Schema

#### [MODIFY] `backend/prisma/schema.prisma`

Tambah 2 model baru:

```prisma
model TbCustomerPriceListUpload {
  id            Int                        @id @default(autoincrement())
  fdCustCode    String                     @db.Char(7)
  fileName      String                     @db.NVarChar(500)
  uploadedBy    String?                    @db.NVarChar(100)
  uploadedAt    DateTime                   @default(now()) @db.DateTime2
  priceDate     DateTime?                  @db.DateTime2
  effectiveDate DateTime                   @db.DateTime2
  status        String                     @db.NVarChar(20)   // PARSED | PARTIAL | FAILED
  warnings      String?                    @db.NVarChar(Max)
  rawSnapshot   String?                    @db.NVarChar(Max)
  isSuperseded  Boolean                    @default(false)
  items         TbCustomerPriceListItem[]
  customer      TbCustomers                @relation(fields: [fdCustCode], references: [fdCustCode])

  @@map("tbCustomerPriceListUpload")
}

model TbCustomerPriceListItem {
  id            Int                          @id @default(autoincrement())
  uploadId      Int
  fdCustCode    String                       @db.Char(7)
  sheetType     String                       @db.NVarChar(20)
  mode          String                       @db.NVarChar(50)
  branch        String                       @db.NVarChar(50)
  transitTime   String?                      @db.NVarChar(50)
  category      String                       @db.NVarChar(200)
  price         Decimal                      @db.Decimal(18, 2)
  upload        TbCustomerPriceListUpload    @relation(fields: [uploadId], references: [id])

  @@map("tbCustomerPriceListItem")
}
```

Dan di model `TbCustomers` tambahkan relasi:
```prisma
customerPriceListUploads TbCustomerPriceListUpload[]
```

---

### Backend — Module

#### [NEW] `backend/src/modules/customer-price-list/`

**[NEW] `customer-price-list.service.ts`**
Fungsi:
- `ingestCustomerPriceListFile(custCode, buffer, fileName, effectiveDate, uploadedBy)` — reuse parser `parsePriceListWorkbook` + simpan ke `tbCustomerPriceListUpload` & `tbCustomerPriceListItem` dengan `fdCustCode`
- `listCustomerUploads(custCode, page, pageSize)` — list riwayat upload per customer
- `getCustomerUploadDiff(id)` — diff versi current vs previous per customer
- `getLatestCustomerUploadDiff(custCode)` — diff upload terbaru per customer
- `getCustomerFilterOptions(custCode, params)` — filter options khusus customer
- `listCustomersWithPriceList(page, pageSize, search?)` — daftar customer yang punya harga khusus

**[NEW] `customer-price-list.routes.ts`**
```
GET  /api/customer-price-list                               → list customers yang punya price list
GET  /api/customer-price-list/:custCode/uploads             → riwayat upload per customer
GET  /api/customer-price-list/:custCode/uploads/latest/diff → diff terbaru per customer
GET  /api/customer-price-list/:custCode/uploads/:id/diff    → diff upload tertentu
GET  /api/customer-price-list/:custCode/filters             → filter options per customer
POST /api/customer-price-list/:custCode/upload              → upload Excel per customer
```

#### [MODIFY] `backend/src/index.ts`
- Import dan daftarkan `customerPriceListRoutes` di bawah `/api/customer-price-list`

---

### Frontend — Feature

#### [NEW] `frontend/src/features/customer-price-list/`

```
src/features/customer-price-list/
├── components/
│   ├── CustomerPriceFilters.tsx      # Filter sheetType, mode, branch, category
│   └── CustomerPriceTrendChart.tsx   # Chart tren harga per customer
├── hooks/
│   ├── useCustomerList.ts            # List customers dengan price list
│   └── useCustomerPriceDiff.ts       # Fetch diff data
├── pages/
│   ├── ListPage.tsx                  # Daftar customer yang punya harga khusus + modal/button upload
│   ├── DashboardPage.tsx             # Dashboard harga khusus per customer
│   ├── UploadPage.tsx                # Upload Excel untuk customer tertentu
│   └── DetailPage.tsx                # Detail diff upload tertentu per customer
├── services/
│   └── customerPriceList.service.ts  # Axios calls ke semua endpoint di atas
├── types/
│   └── customerPriceList.types.ts    # Interface TypeScript domain
└── index.ts                          # Barrel export
```

#### [MODIFY] `src/lib/constants.ts`
```ts
// Customer Price List
CUSTOMER_PRICE_LIST: '/mshipping/finance/customer-price-list',
CUSTOMER_PRICE_LIST_UPLOAD: (custCode: string) =>
  `/mshipping/finance/customer-price-list/${custCode}/upload`,
CUSTOMER_PRICE_LIST_HISTORY: (custCode: string) =>
  `/mshipping/finance/customer-price-list/${custCode}/history`,
CUSTOMER_PRICE_LIST_DETAIL: (custCode: string, id: string | number) =>
  `/mshipping/finance/customer-price-list/${custCode}/uploads/${id}`,
```

#### [MODIFY] Router (`router.tsx`)
Tambah routes:
```
/mshipping/finance/customer-price-list                           → ListPage
/mshipping/finance/customer-price-list/:custCode/upload          → UploadPage
/mshipping/finance/customer-price-list/:custCode/history         → HistoryPage
/mshipping/finance/customer-price-list/:custCode/uploads/:id     → DetailPage
```

#### [MODIFY] Sidebar / Navigation (`Sidebar.tsx`)
- Tambah menu **Price List Customer** di bawah grup Finance, sejajar dengan **Price List** umum

#### [MODIFY] i18n (`id.json` + `en.json`)
Keys baru:
- `nav.customerPriceList`
- `customerPriceList.title`, `customerPriceList.upload`, `customerPriceList.history`, dsb.

---

### Integrasi dengan Billing Validation

Fitur `BillingValidationCard` saat ini mengecek tarif dari price list umum.

Integrasi Fallback:
1. Pengecekan harga item billing akan mencari harga khusus dari `tbCustomerPriceListItem` berdasarkan `fdCustCode` customer terkait terlebih dahulu.
2. Jika tidak ditemukan data tarif khusus untuk customer tersebut, sistem secara otomatis **fallback** mengecek `tbPriceListItem` (Price List umum).

---

## Verification Plan

### Automated Tests
```bash
npx tsc --noEmit  # frontend
```

### Manual Verification
1. Upload file Excel `E:\download\BB UPDATE 30.7.2026.xlsx` untuk customer `CUS001` → cek tersimpan di DB `tbCustomerPriceListItem` (matriks BY SEA & BY AIR terurai dengan benar)
2. Buka halaman list → customer `CUS001` muncul dengan jumlah item & versi upload
3. Buka history upload customer → riwayat muncul
4. Buka detail diff → delta vs upload sebelumnya per customer benar
5. Upload dua kali dengan effectiveDate sama → yang lama di-supersede
6. Customer tanpa harga khusus tetap aman dan pengecekan validasi billing fallback ke Price List umum
