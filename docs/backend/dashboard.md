# 📊 Modul Dashboard Eksekutif & SLA — Backend

Dokumentasi spesifikasi endpoint ringkasan analitik, pemantauan SLA operasional kargo, metrik cabang, dan pola resiliensi kueri database.

---

## 1. 📂 Struktur Modul

- Direktori: `backend/src/modules/dashboard/`
- Berkas Utama:
  - `dashboard.routes.ts`: Rute endpoint API & permission guard (`/mshipping/dashboard`).
  - `dashboard.service.ts`: Kueri analitik performa kargo laut & udara, alert kedatangan, dan kalkulasi SLA.
  - `dashboard.types.ts`: Antarmuka metrik eksekutif, data chart tren, dan alert SLA.

---

## 2. 🔌 Daftar Endpoint REST API

| Method | Endpoint | Permission | Keterangan |
|---|---|---|---|
| `GET` | `/api/dashboard/overview` | `/mshipping/dashboard` | Ringkasan metrik kargo aktif (Laut & Udara), kargo tiba, dan total tonase |
| `GET` | `/api/dashboard/sla-alerts` | `/mshipping/dashboard` | Daftar peringatan operasional: kargo melewati SLA atau ETA belum keluar |
| `GET` | `/api/dashboard/branch-metrics` | `/mshipping/dashboard` | Agregasi volume (M³) dan tonase (Kg) per cabang pengirim |

---

## 3. 🛡️ Resiliensi Kueri Agregasi (`safeQuery`)

Dashboard merupakan endpoint pertama yang diakses user saat membuka aplikasi. Untuk mencegah kegagalan HTTP 500 saat traffic tinggi atau restart server database:
- Seluruh kueri agregasi di `dashboard.service.ts` dibungkus dengan utilitas `safeQuery`:
  1. Melakukan eksekusi kueri utama.
  2. Jika terjadi galat jaringan (Prisma `P1001`/`P1002`), sistem menunda 500ms dan melakukan *auto-retry* 1x.
  3. Jika retry tetap gagal, sistem memberikan nilai aman (*graceful fallback* default: count 0, list kosong `[]`) dan mencatat peringatan via `logger.warn` tanpa men-crash antarmuka pengguna.
