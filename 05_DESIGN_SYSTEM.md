# 05 — Design System: Heritage Alpha

## Prinsip Utama

1. **Satu aksen** — `#B8422E` (tertiary) adalah satu-satunya warna interaktif. Hanya satu per screen.
2. **Flat** — tanpa gradient, tanpa shadow berlebihan.
3. **Ruang negatif adalah fitur** — biarkan `#F7F5F2` (neutral) dominan.
4. **Tipografi bertingkat** — Fraunces untuk heading, Public Sans untuk body, Space Grotesk untuk label/metadata.

---

## Color Tokens

| Token | Hex | Penggunaan |
|-------|-----|------------|
| `--color-primary` | `#1A1C1E` | Teks utama, heading, sidebar bg |
| `--color-secondary` | `#6C7278` | Teks sekunder, caption, border |
| `--color-tertiary` | `#B8422E` | CTA button, aksen aktif — SATU per screen |
| `--color-neutral` | `#F7F5F2` | Background halaman, row hover |
| `--color-surface` | `#FFFFFF` | Card, modal, input bg |
| `--color-on-primary` | `#FFFFFF` | Teks di atas primary/tertiary |
| `--color-border` | `#E8E6E3` | Border halus |
| `--color-border-strong` | `#C8C4C0` | Border tegas |
| `--color-success` | `#2D6A4F` | Badge sukses |
| `--color-warning` | `#B7860B` | Badge peringatan |
| `--color-danger` | `#B8422E` | Badge bahaya (sama dengan tertiary) |
| `--color-muted` | `#9EA4AA` | Placeholder, icon inaktif |

---

## Typography Scale

```
Display  — Fraunces 4rem    weight:500  tracking:-0.02em  → judul halaman login
H1       — Fraunces 2.5rem  weight:500  tracking:-0.02em  → page title
H2       — Fraunces 2rem    weight:500                    → section title
H3       — Fraunces 1.5rem  weight:500                    → card title
Body     — Public Sans 1rem  line:1.6                     → konten umum
Body SM  — Public Sans .875rem                            → teks pendukung
Label    — Space Grotesk .75rem  tracking:0.08em CAPS     → header kolom, badge
```

---

## Komponen — Visual Spec

### Button Primary
```
bg: var(--color-tertiary) = #B8422E
text: #FFFFFF
radius: var(--radius-md) = 4px
padding: 10px 20px
hover: opacity 90%
→ HANYA SATU per form/section
```

### Button Secondary
```
bg: var(--color-surface)
border: 1px solid var(--color-border-strong)
text: var(--color-primary)
radius: var(--radius-md)
hover: bg var(--color-neutral)
```

### Card
```
bg: var(--color-surface)
border: 1px solid var(--color-border)
radius: var(--radius-lg) = 8px
padding: 24px
shadow: var(--shadow-sm)
```

### Table Row
```
header: bg transparent, text var(--color-secondary), font Space Grotesk uppercase 0.75rem
row: border-bottom var(--color-border)
hover: bg var(--color-neutral)
active/selected: border-left 2px solid var(--color-tertiary)
```

### Input
```
bg: var(--color-surface)
border: 1px solid var(--color-border)
radius: var(--radius-md)
focus: border-color var(--color-primary), outline none
placeholder: var(--color-muted)
```

### Badge
```
radius: var(--radius-sm) = 2px
font: Space Grotesk uppercase 0.75rem tracking-wide
padding: 2px 8px
border: 1px solid (sesuai variant)
```

### Sidebar
```
bg: var(--color-primary) = #1A1C1E
width: 240px
nav item aktif: bg rgba(255,255,255,0.08) + border-left 2px solid var(--color-tertiary)
nav item hover: bg rgba(255,255,255,0.04)
text aktif: #FFFFFF
text inaktif: rgba(255,255,255,0.5)
```

---

## Animasi

| Nama | Keyframe | Durasi | Digunakan untuk |
|------|----------|--------|-----------------|
| `fadeIn` | opacity 0→1 + translateY 8px→0 | 300ms | Page load, modal open |
| `slideInRight` | opacity 0→1 + translateX 24px→0 | 250ms | Drawer/panel slide |
| `shimmer` | background-position sweep | 1.5s loop | Skeleton loading |
| Spin | rotate 360deg | 800ms loop | Button loading state |

### Aturan Animasi
- **Jangan** animasikan lebih dari satu elemen bersamaan tanpa alasan
- **Gunakan** `transition-colors duration-100` untuk hover state tabel
- **Gunakan** `transition-all duration-150` untuk button state
- Semua animasi harus `prefers-reduced-motion` safe

---

## Layout

```
┌─────────────────────────────────────────────────┐
│ TOPBAR (height: 56px)                           │
├───────────────┬─────────────────────────────────┤
│               │                                 │
│   SIDEBAR     │   CONTENT AREA                  │
│   240px       │   padding: 32px                 │
│               │   max-width: 1200px             │
│               │                                 │
│               │                                 │
│               │                                 │
└───────────────┴─────────────────────────────────┘
```

### Mobile Breakpoint (< 768px)
- Sidebar collapse menjadi overlay drawer
- Topbar menampilkan hamburger icon
- Table scroll horizontal
- Card padding reduce ke 16px

---

## Contoh Halaman List (Pola Standar)

```
┌─────────────────────────────────────────────────┐
│ PageHeader                                      │
│   H2: "Shipment"           [font: Fraunces]     │
│   caption: "456 data"      [font: Space Grotesk]│
├─────────────────────────────────────────────────┤
│ Toolbar                                         │
│   [🔍 Cari shipment...    ]   [Filter ▾]        │
├─────────────────────────────────────────────────┤
│ Card (bg: surface, border: border)              │
│  ┌──────────────────────────────────────────┐   │
│  │ NO RESI  │ CUSTOMER  │ TGL   │ STATUS    │   │
│  │ [label Space Grotesk uppercase tiny]     │   │
│  ├──────────────────────────────────────────┤   │
│  │ SHP-001  │ PT Maju   │ 15 Jan│ [AKTIF]   │   │
│  │ SHP-002  │ CV Sejati │ 16 Jan│ [SELESAI] │   │
│  │ ...                                      │   │
│  ├──────────────────────────────────────────┤   │
│  │ 1–20 dari 456 data        < 1/23 >       │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## Do's dan Don'ts Heritage

### ✅ DO
- Gunakan `var(--color-tertiary)` hanya untuk satu tombol utama per screen
- Biarkan `var(--color-neutral)` mendominasi background
- Gunakan Space Grotesk uppercase untuk semua label dan header kolom tabel
- Gunakan Fraunces untuk semua heading halaman
- Tambahkan `border-left: 2px solid var(--color-tertiary)` untuk item/row aktif

### ❌ DON'T
- Jangan gunakan gradient apapun
- Jangan gunakan warna selain dari token yang terdefinisi
- Jangan gunakan `color-tertiary` untuk lebih dari satu elemen per screen
- Jangan campur font — Fraunces hanya untuk heading, Public Sans untuk body
- Jangan tambahkan border-radius lebih dari `var(--radius-lg)` = 8px
