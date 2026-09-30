# 🏢 Standar Database & Resiliensi Backend — mshipping

> Bagian dari aturan operasional AI Agent. File ini mendefinisikan aturan Single Source of Truth data customer dan arsitektur resiliensi kueri database pada layer backend.

---

## 1. 🏢 Single Source of Truth: `tbCustomers.fdCustName`

Dalam arsitektur database mshipping, terdapat beberapa tabel yang menyimpan salinan/denormalisasi nama customer (`tbCustomersHarga.fdCustName`, `tbEntryList.fdCustName`, view `qr_tbm3_perMarking_rev1`, dll). Agen **WAJIB** mematuhi aturan berikut:

1. **Selalu Prioritaskan `tbCustomers.fdCustName`**:
   - Master data resmi nama customer HANYA berasal dari tabel master **`tbCustomers`** (`fdCustName`).
   - DILARANG mengandalkan `fdCustName` dari tabel harga (`tbCustomersHarga`), surat jalan, atau view warisan tanpa melakukan verifikasi/override terhadap `tbCustomers`.
2. **Override pada Backend Aggregation & Stored Procedure**:
   - Jika endpoint backend memanggil Stored Procedure legacy (misal `dbo.get_qr_tbm3_perMarking_plus_rasio`) yang melakukan `LEFT JOIN tbCustomersHarga`, backend WAJIB melakukan lookup ke `tbCustomers` dan menimpa (override) nilai `fdCustName` dengan nama resmi dari master `tbCustomers`.
3. **Frontend Component & Modal Props**:
   - Setiap komponen modal atau detail (seperti `CustMarkingDetailModal`, `BillingValidationCard`, dll) harus menerima dan memprioritaskan prop `customerName` dari master header invoice/kartu induk.

---

## 2. 🛡️ Standar Resiliensi & Graceful Fallback Backend (WAJIB)

Setiap service backend yang melakukan query database (terutama agregasi, statistik, atau dashboard) **WAJIB** menerapkan prinsip resiliensi jaringan agar hiccup koneksi database sementara (seperti error Prisma `P1001` / `P1002`) tidak melempar **HTTP 500 Server Error**:

### 1. Auto-Retry & Safe Execution (`safeQuery`)
- Bungkus query Prisma dengan mekanisme *try-catch* dan *auto-retry* 1x (delay ~500ms) jika terindikasi galat koneksi jaringan/server database terputus sesaat.
- Contoh implementasi:
  ```ts
  export async function safeQuery<T>(
    queryFn: () => Promise<T>,
    fallbackValue: T,
    contextName: string
  ): Promise<T> {
    try {
      return await queryFn()
    } catch (err: any) {
      logger.warn(`[safeQuery] Initial attempt failed for ${contextName}: ${err.message}. Retrying in 500ms...`)
      try {
        await new Promise((resolve) => setTimeout(resolve, 500))
        return await queryFn()
      } catch (retryErr: any) {
        logger.error(`[safeQuery] Retry failed for ${contextName}: ${retryErr.message}. Using fallback.`)
        return fallbackValue
      }
    }
  }
  ```

### 2. Fallback Default Value
- Apabila query tetap gagal setelah retry, berikan nilai *fallback default* (misal: `0` untuk count, `[]` untuk array data, `null` untuk trend) sehingga respons endpoint tetap aman dan UI tidak *crash*.

### 3. Penyampaian Log Terstandar
- Catat status *retry* dan *fallback* menggunakan `logger.warn` / `logger.error` dari `@/config/logger`.
- DILARANG menggunakan `console.error` atau `console.log`.
