# 01 — Database Schema & Prisma Models

## ⚠️ KEPUTUSAN PENTING SEBELUM MULAI

Agen HARUS bertanya kepada owner sebelum melanjutkan:

1. **Kolom-kolom pada tabel yang sudah ada**: Tabel `tbCustomers`, `tbEntryList`, dll sudah ada di DB. Agen WAJIB meminta owner untuk memberikan daftar kolom (bisa dari `SELECT TOP 0 * FROM tbCustomers`) untuk setiap tabel sebelum menulis `schema.prisma`. JANGAN menebak nama kolom.

2. **Primary key setiap tabel**: Apakah menggunakan `INT IDENTITY`, `UNIQUEIDENTIFIER`, atau string custom?

3. **Relasi antar tabel**: Kolom foreign key apa yang menghubungkan tabel-tabel ini?

4. **Password user awal**: Apakah perlu seed script untuk user admin pertama?

---

## tbUsers (Tabel Baru — Dibuat oleh Agen)

Tabel ini adalah satu-satunya tabel yang DIBUAT BARU oleh agen. Semua tabel lainnya sudah ada dan hanya di-mapping.

```sql
-- Jalankan migration ini secara manual atau via Prisma
CREATE TABLE tbUsers (
    id            UNIQUEIDENTIFIER   NOT NULL DEFAULT NEWID() PRIMARY KEY,
    username      NVARCHAR(100)      NOT NULL UNIQUE,
    passwordHash  NVARCHAR(255)      NOT NULL,
    fullName      NVARCHAR(200)      NOT NULL,
    role          NVARCHAR(50)       NOT NULL DEFAULT 'viewer',
    isActive      BIT                NOT NULL DEFAULT 1,
    lastLoginAt   DATETIME2          NULL,
    createdAt     DATETIME2          NOT NULL DEFAULT GETDATE(),
    updatedAt     DATETIME2          NOT NULL DEFAULT GETDATE()
);
```

**Role yang tersedia:**
- `viewer` — hanya bisa melihat data (default)
- `admin` — bisa melihat semua data (untuk pengembangan masa depan)

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
  lastLoginAt  DateTime? @db.DateTime2
  createdAt    DateTime  @default(now()) @db.DateTime2
  updatedAt    DateTime  @updatedAt @db.DateTime2

  @@map("tbUsers")
}

// ─── TABEL EXISTING — KOLOM DI BAWAH INI PLACEHOLDER ─────────────
// ⚠️ Owner WAJIB konfirmasi kolom asli sebelum agen menulis ini

model TbCustomers {
  // TODO: Isi berdasarkan konfirmasi owner
  // Contoh minimal:
  // id        Int     @id @map("CustomerID")
  // name      String  @map("CustomerName") @db.NVarChar(200)
  // ...

  @@map("tbCustomers")
  @@ignore // Hapus @ignore setelah kolom dikonfirmasi
}

model TbEntryList {
  // TODO: Shipment — konfirmasi kolom
  @@map("tbEntryList")
  @@ignore
}

model TbMarking {
  fdMarkingCode    String    @id @db.Char(20)
  fdListType       Int       @default(0)
  fdContNo         String    @db.Char(12)
  fdContSize       String    @db.Char(10)
  fdBLNo           String    @db.Char(30)
  fdAWB            String    @db.Char(50)
  fdConsignee      String    @db.Char(50)
  fdWilayah        String    @db.Char(50)
  fdJmlPack        Decimal   @default(0) @db.Decimal(18, 0)
  fdSatuan         String    @db.Char(20)
  fdJmlBerat       Decimal   @default(0) @db.Decimal(18, 2)
  fdM3             Decimal   @default(0) @db.Decimal(18, 4)
  fdLoadDate       DateTime? @db.DateTime
  fdETA            DateTime? @db.DateTime
  fdETD            DateTime? @db.DateTime
  fdExitDate       DateTime? @db.DateTime
  fdGudang         String    @db.Char(50)
  fdKet            String?   @db.Char(2000)
  fdSysDate        DateTime  @default(now()) @db.DateTime
  fdCreated        String    @db.Char(30)
  fdUpdate         DateTime  @default(now()) @db.DateTime
  fdUpdateBy       String    @db.Char(30)
  fdFinish         Int       @default(0)
  fdBranchCode     String    @db.Char(2)
  fdTypeJalur      Int       @default(0)
  fdBranded        Decimal?  @default(0) @db.Decimal(18, 2)
  fdJmlTerima      Decimal   @default(0) @db.Decimal(18, 0)
  fdTransit        Int       @default(0)
  fdEnterGudang    DateTime? @db.DateTime
  fdUpdate2        DateTime  @default(now()) @db.DateTime
  fdUpdateBy2      String    @db.Char(30)
  fdStatus         Int       @default(1)
  fdConsigneeID    String    @db.Char(5)
  fdReExport       String    @db.VarChar(200)
  fdDeparture      DateTime? @db.DateTime
  fdArrival        DateTime? @db.DateTime
  fdKetCs          String    @db.Char(500)
  fdLokasi         String    @db.Char(50)
  fdKrani          String    @db.Char(50)

  @@map("tbMarking")
}

model TbDelivery {
  // TODO: DeliveryOrder — konfirmasi kolom
  @@map("tbDelivery")
  @@ignore
}

model TbEntryListDetail {
  // TODO: Detail volume per shipment — konfirmasi kolom
  @@map("tbEntryListDetail")
  @@ignore
}

model TbDeliveryDetail {
  // TODO: Detail volume warehouse — konfirmasi kolom
  @@map("tbDeliveryDetail")
  @@ignore
}

model TbBilling {
  // TODO: Billing — konfirmasi kolom
  @@map("tbBilling")
  @@ignore
}

model TbBillingDetail {
  // TODO: Billing detail — konfirmasi kolom
  @@map("tbBillingDetail")
  @@ignore
}
```

---

## Seed Script (`prisma/seed.ts`)

Buat user admin pertama setelah schema dikonfirmasi:

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

## Checklist Konfirmasi Schema (Agen Centang Sebelum Lanjut)

- [ ] Owner sudah berikan kolom `tbCustomers`
- [ ] Owner sudah berikan kolom `tbEntryList`
- [ ] Owner sudah berikan kolom `tbMarking`
- [ ] Owner sudah berikan kolom `tbDelivery`
- [ ] Owner sudah berikan kolom `tbEntryListDetail`
- [ ] Owner sudah berikan kolom `tbDeliveryDetail`
- [ ] Owner sudah berikan kolom `tbBilling`
- [ ] Owner sudah berikan kolom `tbBillingDetail`
- [ ] Semua `@@ignore` sudah dihapus dari schema.prisma
- [ ] `prisma db push` atau migration sudah berhasil
- [ ] Seed user admin sudah dijalankan
