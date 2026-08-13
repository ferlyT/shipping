# Fitur Status "Billed", "Partially Paid", dan "Paid" pada Shipment

**Tujuan**: Menambahkan pelacakan status penagihan invoice pada alur pengiriman (Shipment).
**Status Baru**:
- **Billed (7)**: Resi sudah dibuatkan invoice (`tbBilling.fdGive = 1`).
- **Partially Paid (8)**: Sebagian invoice sudah dibayar (`tbBillingTotal.fdBayar < fdJumlah` dan `fdBayar > 0`).
- **Paid (9)**: Seluruh baris tagihan pada invoice resi ini sudah dibayar penuh (`tbBillingTotal.fdBayar >= fdJumlah`).

## Perubahan Kode yang Telah Dilakukan:

1. **Database Schema** (`backend/prisma/schema.prisma`):
   - Menambahkan tabel `TbBillingTotal` beserta kolomnya (`fdInvNo`, `fdID`, `fdCCYCode`, `fdJumlah`, `fdBayar`, dsb).
   - Menghubungkannya dengan `TbBilling`.
   - Meregenerasi Prisma Client.

2. **Backend API Logic** (`backend/src/modules/shipments/shipments.service.ts`):
   - **Filter Query**: Menambahkan handler untuk filter status `7`, `8`, dan `9` pada query SQL raw (`getShipments`).
   - **Batch Processing**: Menulis fungsi `getBillingStatusMap(listCodes: string[])` untuk mencari status penagihan sekaligus (batch query), dan menggunakan array method `totals.every()` / `totals.some()` untuk mendeteksi Partially Paid vs Paid.
   - **Detail Handler**: Memodifikasi `getShipmentById` untuk menarik `totals` dan meneruskan status penagihan.

3. **Frontend UI** (`frontend/src/pages/ShipmentsPage.tsx`):
   - Memperbarui `STATUS_STYLES` agar mengikutsertakan badge untuk:
     - `7: Ditagih (Billed)` (warna ungu)
     - `8: Dibayar Sebagian` (warna kuning)
     - `9: Lunas (Paid)` (warna hijau toska pekat)
   - Memperbarui `STATUS_ORDER` menjadi `[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]`.
   - Fitur "Group by Status" sekarang secara otomatis memisahkan resi yang sudah lunas/tertagih ke kelompoknya sendiri-sendiri di urutan teratas/terakhir tergantung dari sorting (karena status stepnya lebih besar).
