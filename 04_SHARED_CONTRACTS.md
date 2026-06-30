# 04 — Shared API Contracts

Dokumen ini mendefinisikan bentuk request dan response yang HARUS diikuti oleh backend dan frontend.
Perubahan apapun pada kontrak ini WAJIB dikonfirmasi dengan owner terlebih dahulu.

---

## Standard Response Envelope

Semua API response menggunakan envelope ini:

### Success (list dengan pagination)
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Success (single item)
```json
{
  "success": true,
  "data": { ... }
}
```

### Error
```json
{
  "success": false,
  "error": "Pesan error yang jelas dalam Bahasa Indonesia"
}
```

---

## Auth Endpoints

### POST `/shipping/api/auth/login`

**Request:**
```json
{
  "username": "admin",
  "password": "Admin@123"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid-string",
      "username": "admin",
      "fullName": "Administrator",
      "role": "admin"
    }
  }
}
```

**Response 401:**
```json
{
  "success": false,
  "error": "Username atau password salah"
}
```

---

## List Endpoints — Query Parameters (Semua Sama)

```
GET /shipping/api/[resource]?page=1&limit=20&search=keyword
```

| Parameter | Tipe | Default | Keterangan |
|-----------|------|---------|------------|
| `page`    | int  | 1       | Nomor halaman (min: 1) |
| `limit`   | int  | 20      | Item per halaman (max: 100) |
| `search`  | string | — | Kata kunci pencarian |

---

## Customers

### GET `/shipping/api/customers`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "kodeCustomer": "CUST001",
      "namaCustomer": "PT. Maju Jaya",
      "telepon": "021-1234567",
      "alamat": "Jl. Sudirman No. 1"
      // ⚠️ Field lain dikonfirmasi setelah schema diketahui
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 45, "totalPages": 3 }
}
```

---

## Shipments (tbEntryList)

### GET `/shipping/api/shipments`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "noResi": "SHP-2024-001",
      "customerId": "...",
      "namaCustomer": "PT. Maju Jaya",
      "tanggalMasuk": "2024-01-15T00:00:00.000Z",
      "status": "aktif",
      "modePengiriman": "Udara"
      // ⚠️ Field lain dikonfirmasi setelah schema diketahui
    }
  ],
  "meta": { ... }
}
```

### GET `/shipping/api/shipments/:id/details`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "shipment": { /* data tbEntryList */ },
    "details": [
      {
        "id": "...",
        "noResi": "SHP-2024-001",
        "berat": 10.5,
        "volume": 0.08,
        "koli": 2
        // ⚠️ Field lain dikonfirmasi setelah schema diketahui
      }
    ]
  }
}
```

---

## Shipment Batches (tbMarking)

### GET `/shipping/api/shipment-batches`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "noMarking": "MRK-2024-001",
      "tujuan": "Jakarta",
      "tanggalKeberangkatan": "2024-01-20T00:00:00.000Z",
      "modePengiriman": "Laut"
      // ⚠️ Field lain dikonfirmasi setelah schema diketahui
    }
  ],
  "meta": { ... }
}
```

---

## Delivery Orders (tbDelivery)

### GET `/shipping/api/delivery-orders`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "noDelivery": "DO-2024-001",
      "customerId": "...",
      "namaCustomer": "PT. Maju Jaya",
      "tanggalDelivery": "2024-01-22T00:00:00.000Z",
      "status": "selesai"
      // ⚠️ Field lain dikonfirmasi setelah schema diketahui
    }
  ],
  "meta": { ... }
}
```

### GET `/shipping/api/delivery-orders/:id/details`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "delivery": { /* data tbDelivery */ },
    "details": [
      { /* data tbDeliveryDetail */ }
    ]
  }
}
```

---

## Billing (tbBilling + tbBillingDetail)

### GET `/shipping/api/billing`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "noInvoice": "INV-2024-001",
      "customerId": "...",
      "namaCustomer": "PT. Maju Jaya",
      "tanggalInvoice": "2024-01-25T00:00:00.000Z",
      "totalTagihan": 5000000,
      "status": "belum_bayar"
      // ⚠️ Field lain dikonfirmasi setelah schema diketahui
    }
  ],
  "meta": { ... }
}
```

### GET `/shipping/api/billing/:id/details`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "billing": { /* data tbBilling */ },
    "details": [
      { /* data tbBillingDetail */ }
    ]
  }
}
```

---

## HTTP Status Codes

| Status | Kapan Digunakan |
|--------|-----------------|
| 200    | Request berhasil |
| 201    | Resource berhasil dibuat |
| 400    | Request tidak valid (validasi gagal) |
| 401    | Tidak terautentikasi |
| 403    | Tidak memiliki izin |
| 404    | Resource tidak ditemukan |
| 500    | Server error |

---

## ⚠️ Catatan Penting

Semua field yang ditandai dengan komentar `// ⚠️ Field lain dikonfirmasi setelah schema diketahui` adalah placeholder. **Agen WAJIB bertanya kepada owner** untuk mendapatkan nama kolom asli dari database sebelum mengimplementasi endpoint yang bersangkutan.

Frontend TypeScript types HARUS disinkronkan dengan response aktual. Disarankan membuat file `src/types/api.ts` yang mendefinisikan semua response types setelah schema dikonfirmasi.
