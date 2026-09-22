# 📚 Arsip Riwayat Pekerjaan — mshipping

Folder ini menyimpan log riwayat pekerjaan yang sudah selesai, dipisah per periode bulan untuk menghemat token saat dibaca AI Agent.

## 📂 Daftar Arsip

| File | Periode | Ukuran |
|---|---|---|
| [history-2026-09.md](./history-2026-09.md) | September 2026 (dan sebelumnya) | ~380 KB |

## 📖 Cara Membaca

- **Jangan baca file ini secara keseluruhan.** Cukup baca `../working.md` untuk konteks aktif.
- Buka arsip hanya jika perlu melacak keputusan atau implementasi dari task yang lebih lama.
- Gunakan `grep` / pencarian kata kunci untuk menemukan bagian yang relevan.

## 📌 Protokol Arsip Baru

Setiap bulan baru (atau saat `working.md` mulai membengkak > 100 baris task selesai), AI Agent wajib:
1. Membuat file baru `history-YYYY-MM.md` di folder ini.
2. Memindahkan log `[x]` yang sudah selesai dari `working.md` ke file arsip baru.
3. Update tabel di atas dengan entri baru.
