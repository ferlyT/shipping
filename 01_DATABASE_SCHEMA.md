# 01 — Database Schema & Prisma Models

> **Terakhir diperbarui:** 2026-07-02
> Dokumen ini mencerminkan keadaan `backend/prisma/schema.prisma` yang sebenarnya.

---

## Ringkasan Model

| Model | Tabel DB | Status |
|---|---|---|
| `TbUsers` | `tbUsers` | ✅ Aktif — tabel baru dibuat agen |
| `TbRolePermissions` | `tbRolePermissions` | ✅ Aktif — tabel baru dibuat agen |
| `TbCustomers` | `tbCustomers` | ✅ Aktif — kolom dikonfirmasi |
| `vwCustomerContacts` | `vwCustomerContacts` | ✅ Aktif — relasi ke `TbCustomers` |
| `TbMarking` | `tbMarking` | ✅ Aktif — kolom dikonfirmasi |
| `VwShipment` | `vwShipment` | ✅ Aktif — view, kolom dikonfirmasi |
| `TbEntryList` | `tbEntryList` | ⏳ `@@ignore` — belum dikonfirmasi |
| `TbDelivery` | `tbDelivery` | ✅ Aktif — kolom dikonfirmasi |
| `TbEntryListDetail` | `tbEntryListDetail` | ⏳ `@@ignore` — belum dikonfirmasi |
| `TbDeliveryDetail` | `tbDeliveryDetail` | ⏳ `@@ignore` — belum dikonfirmasi |
| `TbBilling` | `tbBilling` | ✅ Aktif — kolom dikonfirmasi |
| `TbBillingDetail` | `tbBillingDetail` | ✅ Aktif — kolom dikonfirmasi |

---

## Prisma Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlserver"
  url      = env("DATABASE_URL")
}

// ─── TABEL BARU ───────────────────────────────────────────────────

model TbUsers {
  id           String    @id @default(uuid()) @db.UniqueIdentifier
  username     String    @unique @db.NVarChar(100)
  passwordHash String    @db.NVarChar(255)
  fullName     String    @db.NVarChar(200)
  role         String    @default("viewer") @db.NVarChar(50)
  isActive     Boolean   @default(true)
  isDeleted    Boolean   @default(false)
  lastLoginAt  DateTime? @db.DateTime2
  createdAt    DateTime  @default(now()) @db.DateTime2
  updatedAt    DateTime  @updatedAt @db.DateTime2

  @@map("tbUsers")
}

model TbRolePermissions {
  id        String   @id @default(uuid()) @db.UniqueIdentifier
  role      String   @db.NVarChar(50)
  path      String   @db.NVarChar(100)
  canView   Boolean  @default(true)
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now()) @db.DateTime2

  @@unique([role, path])
  @@map("tbRolePermissions")
}

// ─── TABEL EXISTING — KOLOM SUDAH DIKONFIRMASI ────────────────────

model TbCustomers {
  fdCustCode             String    @id @db.Char(7)
  fdCustName             String?   @db.VarChar(50)
  fdContact              String?   @db.Char(25)
  fdAddr1                String?   @db.VarChar(255)
  fdAddr2                String?   @db.VarChar(80)
  fdCityName             String?   @db.Char(35)
  fdTelp                 String?   @db.Char(50)
  fdFax                  String?   @db.Char(50)
  fdHP                   String?   @db.Char(50)
  fdBillTo               String?   @db.VarChar(50)
  fdBillAddr1            String?   @db.VarChar(255)
  fdBillAddr2            String?   @db.VarChar(80)
  fdBillCityName         String?   @db.Char(35)
  fdBroker               Int?      @default(0)  // 1 = tidak broker, 2 = broker
  fdBlocked              Int?      @default(0)  // status 0-5
  fdSalesNM              String?   @db.Char(25)
  fdDiscontinued         Int?      @default(0)
  fdKeterangan           String?   @db.VarChar(255)
  fdNamaPengiriman       String?   @db.VarChar(100)
  fdHpPengiriman         String?   @db.VarChar(25)
  fdAlamatPengiriman     String?   @db.VarChar(255)
  fdKetPengiriman        String?   @db.VarChar(255)
  fdKotaPengiriman       String?   @db.VarChar(50)
  fdHpPenagihan          String?   @db.VarChar(50)
  fdEmailPenagihan       String?   @db.VarChar(50)
  fdNotifPenagihan       Int?      @default(0)
  fdKeteranganPenagihan  String?   @db.VarChar(255)
  fdCreatedDate          DateTime  @default(now()) @db.DateTime2

  // Relations
  addresses vwCustomerContacts[]

  @@map("tbCustomers")
}

model vwCustomerContacts {
  fdCustCode String  @db.VarChar(7)
  fdJenis    String  @db.Char(25)
  fdID       String  @db.Char(2)
  fdContact  String? @db.VarChar(100)
  fdHP       String? @db.VarChar(25)
  fdTelp     String? @db.VarChar(25)
  fdEmail    String? @db.VarChar(50)
  fdAddr     String? @db.VarChar(255)
  fdCity     String? @db.VarChar(100)
  fdAktif    Int?    @default(1)

  // Relations
  customer TbCustomers @relation(fields: [fdCustCode], references: [fdCustCode], onDelete: Cascade)

  @@id([fdCustCode, fdID])
  @@map("vwCustomerContacts")
}

model TbMarking {
  fdMarkingCode String    @id @db.Char(20)
  fdListType    Int       @default(0)
  fdContNo      String    @db.Char(12)
  fdContSize    String    @db.Char(10)
  fdBLNo        String    @db.Char(30)
  fdAWB         String    @db.Char(50)
  fdConsignee   String    @db.Char(50)
  fdWilayah     String    @db.Char(50)
  fdJmlPack     Decimal   @default(0) @db.Decimal(18, 0)
  fdSatuan      String    @db.Char(20)
  fdJmlBerat    Decimal   @default(0) @db.Decimal(18, 2)
  fdM3          Decimal   @default(0) @db.Decimal(18, 4)
  fdLoadDate    DateTime? @db.DateTime
  fdETA         DateTime? @db.DateTime
  fdETD         DateTime? @db.DateTime
  fdExitDate    DateTime? @db.DateTime
  fdGudang      String    @db.Char(50)
  fdKet         String?   @db.Char(2000)
  fdSysDate     DateTime  @default(now()) @db.DateTime
  fdCreated     String    @db.Char(30)
  fdUpdate      DateTime  @default(now()) @db.DateTime
  fdUpdateBy    String    @db.Char(30)
  fdFinish      Int       @default(0)
  fdBranchCode  String    @db.Char(2)
  fdTypeJalur   Int       @default(0)
  fdBranded     Decimal?  @default(0) @db.Decimal(18, 2)
  fdJmlTerima   Decimal   @default(0) @db.Decimal(18, 0)
  fdTransit     Int       @default(0)
  fdEnterGudang DateTime? @db.DateTime
  fdUpdate2     DateTime  @default(now()) @db.DateTime
  fdUpdateBy2   String    @db.Char(30)
  fdStatus      Int       @default(1)
  fdConsigneeID String    @db.Char(5)
  fdReExport    String    @db.VarChar(200)
  fdDeparture   DateTime? @db.DateTime
  fdArrival     DateTime? @db.DateTime
  fdKetCs       String    @db.Char(500)
  fdLokasi      String    @db.Char(50)
  fdKrani       String    @db.Char(50)

  @@map("tbMarking")
}

model VwShipment {
  fdCustName        String?   @db.VarChar(50)
  fdListCode        String    @id @db.Char(20)
  fdTerima          String?   @db.VarChar(50)
  fdTglAgent        DateTime? @db.DateTime
  fdMarkingCode     String?   @db.Char(20)
  fdMarkingNo       String?   @db.Char(20)
  fdBranchCode      String?   @db.Char(2)
  fdJmlPack         Decimal?  @db.Decimal(18, 0)
  fdSatuan          String?   @db.Char(20)
  fdJmlBerat        Decimal?  @db.Decimal(18, 2)
  fdListType        Int?
  fdDesc            String?   @db.Char(2000)
  fdComodity        String?   @db.Char(200)
  fdM3              Decimal?  @db.Decimal(18, 4)
  fdCancel          Int?
  fdMarkingCodeAsal String?   @db.Char(20)

  @@map("vwShipment")
}

model TbDelivery {
  fdSJNo          String    @id @db.Char(9)
  fdSJDate        DateTime  @db.SmallDateTime
  fdCarID         String?   @db.Char(10)
  fdCustCode      String?   @db.Char(7)
  fdDescr         String    @db.VarChar(250)
  fdListCode      String?   @db.Char(7)
  fdListType      Int?
  fdPrint         Int?
  fdSent          Int?
  fdSndDate       DateTime  @db.DateTime
  fdLoad          DateTime? @db.SmallDateTime
  fdJmlPackSJ     Decimal?  @db.Decimal(18, 2)
  fdJmlBeratSJ    Decimal?  @db.Decimal(18, 2)
  fdPrintDate     DateTime  @db.DateTime
  fdKembali       DateTime  @db.DateTime
  fdUpdate        String    @db.Char(25)
  fdCreated       String    @db.Char(25)
  fdPrintBy       String?   @db.Char(25)
  fdTerima        String?   @db.Char(35)
  fdGive          Int?
  fdGiveDate      DateTime  @db.DateTime
  fdAddr          String?   @db.VarChar(80)
  fdSupir         String?   @db.Char(35)
  fdEstimasi      DateTime  @db.SmallDateTime
  fdCustNameSJ    String?   @db.VarChar(50)
  fdTelp          String?   @db.Char(50)
  fdTelpSupir     String?   @db.Char(50)
  fdSatuan        String?   @db.Char(5)
  fdContact       String?   @db.Char(50)
  fdCity          String?   @db.Char(100)
  fdHp            String?   @db.Char(50)
  fdEmail         String?   @db.VarChar(100)
  fdExpID         String?   @db.Char(4)
  fdExp3          Int?
  fdKondisiBarang Int?

  @@map("tbDelivery")
}

model TbBilling {
  fdInvNo        String    @id @db.Char(20)
  fdInvDate      DateTime  @db.SmallDateTime
  fdCustCode     String?   @db.Char(7)
  fdEmpCode      String?   @db.Char(7)
  fdDescr        String    @db.VarChar(200)
  fdJumlah1      Decimal?  @db.Decimal(18, 2)
  fdJumlah2      Decimal?  @db.Decimal(18, 2)
  fdBranchCode   String?   @db.Char(2)
  fdTypeBilling  Int?
  fdListType     Int?
  fdListCode     String?   @db.Char(7)
  fdMarkingCode  String    @db.Char(30)
  fdMarkingNo    String    @db.Char(50)
  fdHarga1       Decimal?  @db.Decimal(18, 2)
  fdHarga2       Decimal?  @db.Decimal(18, 2)
  fdPayTerm      Int?
  fdPrint        Int?
  fdCurr1        String?   @db.Char(3)
  fdPCounter     Int?
  fdGive         Int?
  fdGiveDate     DateTime  @db.SmallDateTime
  fdTake         Int?
  fdTakeDate     DateTime  @db.SmallDateTime
  fdGive2        Int?
  fdGiveDate2    DateTime  @db.SmallDateTime
  fdTake2        Int?
  fdTakeDate2    DateTime  @db.SmallDateTime
  fdAjpDate      DateTime  @db.SmallDateTime
  fdpost         Int?
  fdDescr2       String    @db.VarChar(2000)
  fdLoad         DateTime? @db.SmallDateTime
  fdEmp2Code     String?   @db.Char(7)
  fdGive3        Int?
  fdGive3Date    DateTime  @db.SmallDateTime
  fdGive3Emp     String    @db.Char(50)
  fdBillTambahan Int?
  fdInvSg        String?   @db.Char(20)
  fdCekDate      DateTime  @db.SmallDateTime
  fdCekBy        String?   @db.Char(20)

  // Relations
  details        TbBillingDetail[]

  @@map("tbBilling")
}

model TbBillingDetail {
  fdInvNo        String    @db.Char(20)
  fdID           String    @db.Char(2)
  fdListCode     String?   @db.Char(7)
  fdItemCode     String?   @db.Char(7)
  fdItemName     String    @db.VarChar(100)
  fdCurr         String?   @db.Char(3)
  fdQty          Decimal?  @db.Decimal(18, 4)
  fdItemPrice    Decimal?  @db.Decimal(18, 2)
  fdTotal        Decimal?  @db.Decimal(18, 2)
  fdSatuan       String?   @db.Char(10)
  fdComodity     String    @db.VarChar(100)
  fdTypeComodity Int?

  // Relations
  billing        TbBilling @relation(fields: [fdInvNo], references: [fdInvNo], onDelete: Cascade)

  @@id([fdInvNo, fdID])
  @@map("tbBillingDetail")
}

```

---

## Detail Model — Tabel Baru

### `tbUsers`

| Kolom | Tipe DB | Keterangan |
|---|---|---|
| `id` | `UNIQUEIDENTIFIER` | PK, auto-generated UUID |
| `username` | `NVARCHAR(100)` | Unique, login identifier |
| `passwordHash` | `NVARCHAR(255)` | bcrypt hash |
| `fullName` | `NVARCHAR(200)` | Nama lengkap |
| `role` | `NVARCHAR(50)` | Default `viewer` |
| `isActive` | `BIT` | Default `true` |
| `isDeleted` | `BIT` | Soft delete, default `false` |
| `lastLoginAt` | `DATETIME2` | Nullable |
| `createdAt` | `DATETIME2` | Auto-set |
| `updatedAt` | `DATETIME2` | Auto-update |

**Role yang tersedia:**
- `viewer` — hanya bisa melihat data (default)
- `admin` — akses penuh

### `tbRolePermissions`

| Kolom | Tipe DB | Keterangan |
|---|---|---|
| `id` | `UNIQUEIDENTIFIER` | PK, auto-generated UUID |
| `role` | `NVARCHAR(50)` | Nama role |
| `path` | `NVARCHAR(100)` | Route / path yang dikontrol |
| `canView` | `BIT` | Default `true` |
| `isDefault` | `BIT` | Apakah permission ini default |
| `createdAt` | `DATETIME2` | Auto-set |

**Constraint:** `@@unique([role, path])` — satu kombinasi role+path hanya boleh ada satu baris.

---

## Detail Model — Tabel Existing

### `tbCustomers` & `vwCustomerContacts`

`TbCustomers` memiliki relasi one-to-many ke `vwCustomerContacts` via `fdCustCode`.

| Kolom penting | Keterangan |
|---|---|
| `fdCustCode` | PK, Char(7) |
| `fdBroker` | `0` = normal, `1` = tidak broker, `2` = broker |
| `fdBlocked` | Status customer 0–5 |

### `tbMarking`

Tabel utama untuk data marking/container pengiriman. PK: `fdMarkingCode` (Char 20).

### `vwShipment`

View (bukan tabel fisik) yang menggabungkan data shipment. PK: `fdListCode`.

### `tbDelivery`

Tabel untuk surat jalan / delivery order. PK: `fdSJNo` (Char 9).

### `tbBilling` & `tbBillingDetail`

Tabel untuk data tagihan (billing/invoice). `tbBilling` berelasi *one-to-many* dengan `tbBillingDetail` melalui kolom `fdInvNo`. PK `tbBilling`: `fdInvNo` (Char 20). PK `tbBillingDetail`: Composite `[fdInvNo, fdID]`.

---

## Seed Script (`prisma/seed.ts`)

```typescript
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('Admin@123', 12)

  await prisma.tbUsers.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      fullName: 'Administrator',
      role: 'admin',
      isActive: true,
      isDeleted: false,
    },
  })

  console.log('Seed selesai: user admin dibuat')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

**Jalankan seed:**
```bash
bun run prisma db seed
```

---

## Checklist Status Schema

- [x] `tbUsers` — kolom dikonfirmasi, migration selesai
- [x] `tbRolePermissions` — kolom dikonfirmasi, migration selesai
- [x] `tbCustomers` — kolom dikonfirmasi, mapping aktif
- [x] `vwCustomerContacts` — kolom dikonfirmasi, relasi aktif
- [x] `tbMarking` — kolom dikonfirmasi, mapping aktif
- [x] `vwShipment` — kolom dikonfirmasi, mapping aktif
- [ ] `tbEntryList` — belum dikonfirmasi (`@@ignore`)
- [x] `tbDelivery` — kolom dikonfirmasi, mapping aktif
- [ ] `tbEntryListDetail` — belum dikonfirmasi (`@@ignore`)
- [ ] `tbDeliveryDetail` — belum dikonfirmasi (`@@ignore`)
- [x] `tbBilling` — kolom dikonfirmasi, mapping aktif
- [x] `tbBillingDetail` — kolom dikonfirmasi, relasi aktif
