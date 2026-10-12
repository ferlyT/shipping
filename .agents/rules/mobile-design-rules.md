# 📱 Aturan Desain: Dashboard Operasional Mobile

Aturan untuk membuat atau mengubah layar dashboard logistik/billing dengan gaya tenang dan editorial. Ikuti aturan ini persis. Jangan menambah dekorasi. Kalau ragu, pilih yang lebih polos.

---

## 1. Prinsip Inti

1. **Angka adalah isi, bukan hiasan.** Satu angka besar per bagian, label kecil abu-abu di atasnya.
2. **Warna hanya untuk arti.** Merah = terlambat/bermasalah. Kuning = perlu perhatian. Hijau = baik/selesai. Selain itu netral.
3. **Struktur dari garis tipis dan spasi**, bukan dari kotak berwarna. Satu daftar vertikal, bagian dipisah `border-top: 1px solid var(--line)`.
4. **Satu aksen interaktif** (`--accent`, merah bata) untuk tab aktif, chip aktif, nav aktif, dan link. Tidak ada aksen kedua.
5. **Mobile dulu.** Lebar penuh, satu kolom, maks 560px, padding samping 20px.

---

## 2. Token Desain (Wajib Digunakan)

### Mode Gelap (Midnight / Default)
```css
--bg: #0c1118;
--surface: #131a23;
--line: #222c38;
--text: #eef2f6;
--muted: #8a97a6;
--air: #e2b266;       /* identitas moda Udara */
--sea: #5fa3d4;       /* identitas moda Laut */
--ok: #4cc38a;        /* selesai / tepat waktu */
--warn: #e5a93c;      /* perhatian / mendekati SLA */
--late: #ef6b5b;      /* terlambat / bermasalah */
--accent: #e0644e;    /* interaktif aktif (merah bata) */
--onaccent: #ffffff;
```

### Mode Terang (Heritage / Light)
```css
--bg: #f6f7f9;
--surface: #ffffff;
--line: #e3e7ec;
--text: #141b24;
--muted: #657080;
--air: #a9741c;
--sea: #256a9e;
--ok: #17855a;
--warn: #a97612;
--late: #c4402f;
--accent: #b8402c;
--onaccent: #ffffff;
```

---

## 3. Tipografi

- Satu keluarga font: **IBM Plex Sans** (400/500/600), fallback `system-ui, sans-serif`.
- Selalu gunakan `font-variant-numeric: tabular-nums`.
- **Skala Ukuran (px)**:
  - `64px`: Hero angka utama.
  - `52px`: Angka ringkasan.
  - `34px`: Angka bagian.
  - `26px`: Judul halaman.
  - `24px`: Nama pengguna di header.
  - `20px`: Angka statistik.
  - `16px`: Judul bagian (`h2`, weight 600).
  - `15px`: Isi teks biasa.
  - `14px`: Sekunder.
  - `13px`: Tanggal / label kecil.
  - `12px`: Tag dan label statistik.
- **Angka besar**: weight 500, `letter-spacing: -0.02em` s/d `-0.03em`, `line-height: 1`.
- **Satuan di samping angka** (`list`, `bill`): 14–18px, weight 400, `--muted`, margin kiri 6–8px.
- **Sentence case**: Dilarang ALL CAPS, dilarang letter-spacing lebar, dilarang label di atas judul ("eyebrow").
- Dilarang memberi aksen satu kata dengan warna atau miring di dalam judul.

---

## 4. Spasi dan Bentuk

- **Bagian (`section`)**: `padding: 22px 0`, `border-top: 1px solid var(--line)`. Bagian pertama tanpa border.
- **Radius**: 4px untuk tag kecil, 8–10px untuk tombol dan chip, 999px hanya untuk chip filter hari. Tidak ada radius besar (16px+).
- **Tanpa bayangan, tanpa gradien, tanpa blur dekoratif, tanpa border putus-putus** (kecuali tombol "muat lagi").
- **Target sentuh minimal 40px tinggi** (tombol ikon 44px).
- Jangan membungkus bagian dalam kartu berwarna. Jangan membuat kartu-kartu dengan warna latar berbeda.

---

## 5. Spesifikasi Komponen

### 5.1 Header
- Sapaan kecil abu-abu ("Halo,"), nama 24px/600, lalu **tag role dari teks** (bukan ikon): `font-size: 12px; color: var(--muted); border: 1px solid var(--line); border-radius: 4px; padding: 1px 7px`.
- Di kanan: tombol ikon ganti tema 44×44 (`--surface`, border `--line`, radius 10).

### 5.2 Ringkasan (Dua Angka Berdampingan)
- Grid 2 kolom, gap 20px, kolom kedua diberi `border-left: 1px solid var(--line); padding-left: 20px`.
- Isi per kolom: label 13px `--muted`, angka 52px/500, baris sekunder 14px (`Udara <b>0</b>  Laut <b>3</b>`, `b` = 600 warna `--text`).

### 5.3 Statistik Berderet (`dl.stats`)
- `display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 8px`.
- Setiap item: `border-left: 2px solid var(--line); padding-left: 10px`, `dt` 12px `--muted`, `dd` 20px/500.
- Varian: `.w` (kuning), `.a` atau `.alert` (merah): ubah warna **border kiri dan angka**. Berikan hanya jika nilainya perlu tindakan dan > 0.

### 5.4 Bar Pembagian (`split`)
- Tinggi 8px, radius 2px, `gap: 2px`, setiap segmen `flex: <nilai>`.
- Di bawahnya legenda satu baris: titik 8px + nama + angka tebal.
- Dua moda memakai `--air` dan `--sea`. Bar umur memakai `--ok`, `--warn`, `--late` (segmen 0 dihilangkan).

### 5.5 Daftar Umur (`ul.aging`)
- Baris: titik warna + label (flex: 1) + angka tebal. Pemisah `border-top` 1px, padding vertikal 9px.
- Nilai 0: titik `--line`, label dan angka `--muted`, weight 400.

### 5.6 Blok per Moda (Target Bill)
- Baris atas: titik warna + nama moda (kiri), angka 34px + satuan "list" (kanan).
- Di bawahnya nama PIC dan jumlah (`Thara <b>71</b>`), lalu `dl.stats` untuk SJ, COD, FCL, >7 hari.

### 5.7 Tab Utama
- Dua tab sama lebar, `border-bottom: 1px solid var(--line)`.
- Aktif: teks `--text` weight 600 dan garis bawah 2px `--accent`. Tidak aktif: `--muted`.

### 5.8 Chip Filter (Hari)
- Horizontal scrollable pill 999px, tinggi 40px, border `--line`, latar `--surface`.
- Aktif: latar `--accent`, teks `--onaccent`, weight 600.

### 5.9 Filter Moda (Segmen Kecil)
- Tombol teks tanpa latar.
- Aktif: border `--line`, latar `--surface`, teks `--text` weight 600. Tinggi 36px.

### 5.10 Baris Batch
- Bukan kartu, tetapi baris dengan `border-top`.
  1. Baris 1: nomor batch 19px/600 + tag tipe di kiri; moda (titik warna + teks 14px `--muted`) di kanan.
  2. Baris 2: nomor kontainer weight 500 `--text`, rute `--muted`.
  3. Baris 3: jumlah · berat (`--muted`, 14px) di kiri; `Exit <tanggal>` `--ok` weight 600 di kanan.

### 5.11 Navigasi Bawah
- `position: fixed`, latar `--navbg` + `backdrop-filter: blur(12px)`, border atas `--line`.
- 5 item: ikon garis 24px (stroke 1.6, tanpa isi) + label 12px. Aktif: warna `--accent`, weight 600.

---

## 6. Aturan Warna per Makna

| Makna | Token | Penggunaan |
|---|---|---|
| Terlambat / SLA terlewat / >30 hari / >7 hari (jika > 0) | `--late` | Angka & border kiri statistik, segmen bar |
| Perlu perhatian (ETA belum exit, 8–14 hari) | `--warn` | Angka & border kiri, segmen bar |
| Baik / selesai / naik / tanggal exit | `--ok`, `--up` | Teks, titik |
| Moda Udara / Laut | `--air` / `--sea` | **Hanya titik dan bar moda** |
| Interaktif aktif | `--accent` | Tab, chip, nav, link |

---

## 7. Hal yang DILARANG Keras

- ❌ Kartu berwarna berbeda per bagian, latar gradien, bayangan, glow.
- ❌ Ikon bulat berwarna atau infografis berikon sebagai dekorasi.
- ❌ Border putus-putus dekoratif, garis tepi tebal berwarna di sisi kartu.
- ❌ ALL CAPS, eyebrow, penomoran 01/02/03.
- ❌ Ikon tunggal untuk role (wajib gunakan tag teks).
- ❌ Animasi berlebih atau hover effects yang ramai.
- ❌ Font monospace untuk label data umum.
