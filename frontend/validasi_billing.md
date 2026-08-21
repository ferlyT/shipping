Viewed ValidationDetailPage.tsx:1-440
Viewed BillingValidationCard.tsx:1-759

Dalam menentukan tipe komoditi pada **Tabel Validasi Komoditas & Price List**, sistem menggunakan alur penetapan (*fallback mechanism*) secara hierarkis dan dilanjutkan dengan pencocokan pintar (*fuzzy matching*). 

Berikut adalah urutan logika yang terjadi di dalam komponen `BillingValidationCard.tsx` (baris 590-660):

### 1. Menentukan ID Tipe Komoditi (Type ID)
Sistem mencari ID komoditi dengan prioritas berikut:
1. **Pencocokan Master Marking (Berdasarkan Teks Setelah '-' & Pecahan Koma):** Sistem mengambil teks di belakang tanda hubung (`-`), memecahnya jika ada tanda koma (`,`), lalu mencocokkan setiap kata kunci dengan nama komoditi (`fdComodity`) dari data master Marking Customer (SP `get_qr_tbm3_perMarking_plus_rasio`). Jika cocok, tipe komoditi (`fdTypeComodity` / `fdComodityName`) dari komoditas tersebut langsung digunakan.
2. **Level Item Invoice:** Menggunakan tipe komoditi yang tersemat langsung pada rincian item (`item.fdTypeComodity`).
3. **Level Tagihan (Header):** Jika item tidak punya, sistem mengambil dari default komoditi dokumen invoice (`billFdTypeComodity` atau `res.defaultFdTypeComodity`).
4. **Level Customer/Marking:** Jika di invoice tidak ada, sistem akan menarik default tipe komoditi yang tersetting pada master Marking Code milik customer (`res.markingComodityType`).

### 2. Mengkonversi ID menjadi Nama Komoditi (String)
Setelah mendapatkan ID-nya, sistem akan mencari nama komoditi dari master tabel `tbTypeComodity` (`res.comodityTypes`) yang cocok dengan jalur pengiriman (*List Type* Udara/Laut). 
* Jika ID cocok, sistem memakai nama resmi dari master (contoh: "GENERAL GOODS").
* Jika ID tidak valid/kosong, sistem menggunakan inputan manual nama komoditi dari item invoice (`item.fdComodity`).

### 3. Pencocokan dengan Kategori Master Price List (Fuzzy Matching)
Agar harga bisa divalidasi, nama komoditi tadi harus dihubungkan (di- *mapping*) ke data yang ada pada daftar harga (Price List). Karena pengetikan manusia sering berbeda, sistem melakukan *3 level pencarian*:

* **A. Pencocokan Persis (Exact Match):** Mengabaikan kapitalisasi huruf, spasi ekstra, atau tanda hubung. Jika komoditi "LARTAS - N" dan price list "LARTAS-N", maka cocok.
* **B. Pencocokan Berdasarkan Jalur Pengiriman (Advanced Heuristics):** Jika tidak ada yang sama persis, sistem menebak berdasarkan kata kunci standar Cargo:
  * **Jalur Udara (By Air):**
    * Jika mengandung kata `"GENERAL"` → dicarikan kategori price list `"general goods"`
    * Jika mengandung kata `"BRANDED"` → dicarikan `"branded goods"`
    * Jika mengandung kata `"GARMENT"` → dicarikan `"fabric"` atau `"garment"`
    * Jika mengandung kata `"FOOD"` → dicarikan `"ls &"` atau `"food"`
  * **Jalur Laut (By Sea):**
    * Jika mengandung kata `"UMUM"` → dicarikan `"general goods"`
    * Jika mengandung kata `"TEKSTIL"` → dicarikan `"fabric"` atau `"tekstil"`
    * Jika mengandung kata `"LARTAS N"` atau `"NORMAL"` → dicarikan `"lartas normal"`
    * Jika mengandung kata `"LARTAS S"`, `"SUPER"`, `"KOSMETIK"` → dicarikan `"kosmetik"`, `"obat"`, `"lartas s"`
    * Jika mengandung `"ALKES"`, `"MAKANAN"`, dll.
* **C. Pencocokan Parsial (Fallback):** Mengecek apakah nama komoditi bagian dari kategori price list, atau sebaliknya (menggunakan metode `includes()`).

### 4. Kasus Khusus: Biaya Tambahan / Tax Return
Jika nama item mengandung kata **"TAX RETURN"**, sistem secara otomatis menghentikan proses pencocokan Price List di atas. Sistem langsung menganggapnya sebagai biaya Tax Return dan akan membandingkannya dengan *Tax Return Tariff* dari profil khusus kesepakatan harga customer.

### 5. Cek overweight 
Sistem akan menghitung overweight dengan rumus berikut:

```typescript
  const calculateOverweight = (values: number[], base: number) => {
    if (!values || values.length === 0) return 0
    const sum = values.reduce((acc, v) => acc + v, 0)
    return sum > base ? sum - base : 0
  }
```
