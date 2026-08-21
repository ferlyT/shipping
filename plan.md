# Rencana Implementasi: Multi-Agent Marking Code Override pada Price List Umum & Customer

## 📌 Ringkasan Fitur
Menambahkan kemampuan **1 item Price List dapat diinputkan beberapa agen (1 marking code per agen)**, baik pada **Price List Umum** maupun **Price List Customer**.

Jika suatu resi pengiriman memiliki `fdMarkingCode` yang terdaftar pada salah satu agen di item price list tersebut, sistem akan memprioritaskan harga dari item tersebut (override tarif default).

---

## 🎯 Aturan Hirarki & Precedence Penentuan Harga (Pricing Engine)

Saat sistem melakukan lookup harga (misalnya kalkulasi billing, validasi tarif resi, atau lookup manual):

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     PRIORITY HIERARCHY                                          │
├────┬──────────────────────────────────┬──────────────────────────────────────────────────────────┤
│ 1  │ Customer Price List +            │ [TERTINGGI] Harga khusus customer yang memiliki relasi   │
│    │ Matching Agent Marking Code      │ marking code agen yang cocok dengan resi.                │
├────┼──────────────────────────────────┼──────────────────────────────────────────────────────────┤
│ 2  │ Customer Price List              │ Harga khusus customer default (tanpa pembatasan          │
│    │ (Standard/Semua Agen)            │ marking code agen).                                      │
├────┼──────────────────────────────────┼──────────────────────────────────────────────────────────┤
│ 3  │ General Price List +             │ Harga umum yang memiliki relasi marking code agen        │
│    │ Matching Agent Marking Code      │ yang cocok dengan resi.                                  │
├────┼──────────────────────────────────┼──────────────────────────────────────────────────────────┤
│ 4  │ General Price List               │ [FALLBACK DASAR] Harga umum default (tanpa pembatasan    │
│    │ (Standard/Semua Agen)            │ marking code agen).                                      │
└────┴──────────────────────────────────┴──────────────────────────────────────────────────────────┘
```

---

## 🏗️ Struktur Data Relasional (1 Price List Item → Banyak Agen / Marking Code)

Karena **1 baris harga bisa berlaku untuk beberapa agen sekaligus**, kita menggunakan tabel pemetaan (relasi One-to-Many / Junction) agar query cepat, terindeks, dan tidak terbatas:

### 1. Database Schema (`backend/prisma/schema.prisma`)

```prisma
// ─── PRICE LIST UMUM ───────────────────────────────────────────────

model TbPriceListItem {
  id            Int                       @id @default(autoincrement())
  uploadId      Int
  sheetType     String                    @db.NVarChar(20)    // CS | MKT
  mode          String                    @db.NVarChar(50)    // BY SEA | BY AIR
  branch        String                    @db.NVarChar(50)    // destinasi / tujuan
  transitTime   String?                   @db.NVarChar(50)
  category      String                    @db.NVarChar(200)   // kategori barang
  price         Decimal                   @db.Decimal(18, 2)
  upload        TbPriceListUpload         @relation(fields: [uploadId], references: [id], onDelete: Cascade)
  
  // Relasi ke banyak agen/marking code
  markings      TbPriceListItemMarking[]

  @@map("tbPriceListItem")
}

/// Tabel relasi marking code agen untuk Price List Umum
model TbPriceListItemMarking {
  id            Int              @id @default(autoincrement())
  itemId        Int
  markingCode   String           @db.NVarChar(50)   // Kode Marking unik per agen (misal: "GZC", "EXP-01")
  agentName     String?          @db.NVarChar(100)  // Nama Agen (opsional, untuk display/keterangan)
  item          TbPriceListItem  @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@unique([itemId, markingCode])
  @@index([markingCode])
  @@map("tbPriceListItemMarking")
}

// ─── PRICE LIST CUSTOMER ───────────────────────────────────────────

model TbCustomerPriceListItem {
  id            Int                               @id @default(autoincrement())
  uploadId      Int
  fdCustCode    String                            @db.Char(7)
  sheetType     String                            @db.NVarChar(20)
  mode          String                            @db.NVarChar(50)
  branch        String                            @db.NVarChar(50)
  transitTime   String?                           @db.NVarChar(50)
  category      String                            @db.NVarChar(200)
  price         Decimal                           @db.Decimal(18, 2)
  upload        TbCustomerPriceListUpload         @relation(fields: [uploadId], references: [id], onDelete: Cascade)
  
  // Relasi ke banyak agen/marking code
  markings      TbCustomerPriceListItemMarking[]

  @@map("tbCustomerPriceListItem")
}

/// Tabel relasi marking code agen untuk Price List Customer
model TbCustomerPriceListItemMarking {
  id            Int                      @id @default(autoincrement())
  itemId        Int
  markingCode   String                   @db.NVarChar(50)   // Kode Marking unik per agen
  agentName     String?                  @db.NVarChar(100)  // Nama Agen (opsional)
  item          TbCustomerPriceListItem  @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@unique([itemId, markingCode])
  @@index([markingCode])
  @@map("tbCustomerPriceListItemMarking")
}
```

---

## ⚙️ Backend Services & Pricing Lookup Engine

### 1. Lookup Engine dengan Multi-Agent Marking Support
Fungsi `lookupPriceList()` dan `lookupCustomerPriceList()`:
- Menerima parameter opsional `markingCode?: string`.
- **Query Flow**:
  1. Jika `markingCode` diberikan (misal `"GZC"`):
     - Cari item yang memiliki relasi di `markings` dengan `markingCode = 'GZC'`.
  2. Jika tidak ditemukan:
     - Cari item default (yang `markings` kosong / berlaku untuk semua agen).

### 2. API Endpoint CRUD Marking Code pada Price List Item
Endpoint untuk mengelola daftar agen/marking code pada item harga tertentu tanpa perlu upload ulang Excel:

- `GET /api/price-list/items/:id/markings` — Ambil daftar agen/marking pada item harga.
- `POST /api/price-list/items/:id/markings` — Tambah 1 atau beberapa agen/marking code ke item harga.
- `DELETE /api/price-list/items/:id/markings/:markingCode` — Hapus marking code dari item harga.
- `PUT /api/price-list/items/:id/markings` — Bulk replace daftar marking code untuk item harga.
- *(Serta endpoint setara untuk customer price list: `/api/customer-price-list/items/:id/markings`)*.

---

## 🖥️ Frontend UI/UX Design

### 1. Kolom "Agen / Marking" pada Tabel Tarif (Price List & Customer Price List)
- **Tampilan Kolom Agen / Marking**:
  - Jika **tidak ada marking khusus**: Menampilkan chip netral `🌐 Semua Agen / Standar`.
  - Jika **ada 1 agen**: Menampilkan chip `🏷️ GZC (Agen A)`.
  - Jika **ada beberapa agen**: Menampilkan chip `🏷️ GZC`, `🏷️ EXP-01`, `+2 agen lainnya` (dengan tooltip/popover daftar lengkap agen).

### 2. Modal Kelola Agen / Marking Code (Multi-Select Tag Input)
- Tombol aksi cepat **"Kelola Agen"** di setiap baris tabel tarif.
- Membuka modal yang berisi:
  - **Tag / Multi-Select Input**: Ketik kode marking agen (misal: `GZC`, `SGP-02`, `HK-EXP`) dan tekan Enter / pilih dari daftar marking existing.
  - Ringkasan info tarif yang sedang diatur (Mode, Branch, Kategori, Harga).
  - Tombol Simpan Perubahan.

### 3. Filter Dropdown Agen / Marking Code
- Toolbar tabel dilengkapi filter **"Filter Agen / Marking"** untuk melihat tarif khusus agen tertentu saja atau tarif standar.

### 4. Integrasi Billing & Validasi Pengiriman
- Saat sistem memvalidasi tarif suatu resi (berdasarkan `fdMarkingCode`), jika cocok dengan salah satu agen di item harga, sistem menampilkan badge info:
  - `✓ Tarif Khusus Agen: [KODE_MARKING] (Override Aktif)`

---

## 📋 Tahapan Eksekusi

```
Phase 1: Database Schema & Migration
 ├── 1.1 Tambahkan model TbPriceListItemMarking & TbCustomerPriceListItemMarking di schema.prisma
 └── 1.2 Generate Prisma Client & apply perubahan ke DB

Phase 2: Backend Logic & Pricing Engine
 ├── 2.1 Buat service & routes CRUD marking code per price list item
 ├── 2.2 Update lookupPriceList & lookupCustomerPriceList untuk mencocokkan relasi markings
 └── 2.3 Update lookupPriceByEntry agar mengekstrak fdMarkingCode & menerapkan 4-level precedence

Phase 3: Frontend Component & UI
 ├── 3.1 Update TypeScript types (PriceListItem & CustomerPriceListItem dengan field markings[])
 ├── 3.2 Tambahkan badge multi-marking pada Price List Table & Customer Price List Table
 ├── 3.3 Buat komponen Modal "Kelola Agen & Marking Code" (Tag input)
 └── 3.4 Tambah filter dropdown Agen/Marking di toolbar

Phase 4: Verification & Integration Test
 ├── 4.1 Uji coba input multiple agen pada 1 baris harga
 ├── 4.2 Uji coba kalkulasi harga dengan resi matching agen A, matching agen B, dan resi tanpa agen
 └── 4.3 Verifikasi TypeScript dan kestabilan sistem
```
