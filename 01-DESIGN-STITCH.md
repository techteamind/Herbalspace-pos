# Herbaspace POS — Tahap A: Desain Visual (Stitch)

> Daftar layar, design system, dan **prompt Stitch siap-tempel** per layar.
> Cara pakai: buka stitch.withgoogle.com → pilih **Mobile** (atau Web utk layar lebar) → tempel prompt per layar → generate → export HTML/CSS atau screenshot → kirim balik ke saya untuk dijadikan komponen React.
> Versi 0.1 · 17 Juni 2026

---

## 1. Design System (tempel ini dulu sebagai konteks global di Stitch)

```
Brand: Herbaspace POS — aplikasi kasir cafe & F&B, modern, bersih, profesional.
Style: minimal, clean, high contrast, generous whitespace, rounded-xl cards, subtle shadows.
Primary color: deep herbal green #1F7A53. Accent: warm amber #F2A93B.
Neutrals: slate gray scale. Background: #F7F8F7 (light). Success #16A34A, Warning #F59E0B, Danger #DC2626.
Typography: Inter / sans-serif. Big readable numbers for prices & totals.
Components: Shadcn-style — cards, badges, tabs, data tables, bottom sheet, toasts.
Layout: mobile-first, touch-friendly (min 44px tap targets), thumb-reachable primary actions.
Currency format: Indonesian Rupiah "Rp 25.000". Language: Bahasa Indonesia for all labels.
```

### Palet & Token (untuk implementasi nanti)
| Token | Nilai |
|-------|-------|
| primary | #1F7A53 |
| accent | #F2A93B |
| bg | #F7F8F7 |
| success / warning / danger | #16A34A / #F59E0B / #DC2626 |
| radius | xl (16px) |
| font | Inter |

---

## 2. Inventaris Layar & Flow

| # | Modul | Layar utama |
|---|-------|-------------|
| 1 | Auth | Login |
| 2 | Dashboard | Ringkasan harian |
| 3 | POS Kasir | Grid produk + keranjang |
| 4 | POS Kasir | Pembayaran (bottom sheet) |
| 5 | POS Kasir | Struk / sukses transaksi |
| 6 | Produk | Daftar produk + kategori |
| 7 | Produk | Form tambah/edit produk |
| 8 | Resep | Editor resep produk (BoM) |
| 9 | Inventori | Daftar bahan baku |
| 10 | Inventori | Form bahan + terima stok |
| 11 | Stock Movement | Riwayat pergerakan stok |
| 12 | Pelanggan | Daftar + detail pelanggan |
| 13 | Pengeluaran | Daftar + form pengeluaran |
| 14 | Laporan | Laporan + filter periode + export |
| 15 | Pengaturan | Profil cafe, pajak, user/role |

**Navigasi:** Bottom tab bar (mobile) — Dashboard · Kasir · Produk · Laporan · Lainnya. Modul sekunder (Resep, Inventori, Stock Movement, Pelanggan, Pengeluaran, Pengaturan) masuk di tab "Lainnya".

**Alur inti:** Login → Dashboard → Kasir (pilih produk → keranjang → bayar → struk) → stok bahan otomatis berkurang → tercatat di Stock Movement → masuk Laporan.

---

## 3. Prompt Stitch per Layar

> Tiap blok di bawah adalah prompt mandiri. Tempel design system (bagian 1) lebih dulu, lalu prompt layarnya.

### Layar 1 — Login
```
Design a mobile login screen for "Herbaspace POS", a cafe point-of-sale app.
Centered logo with a leaf icon and app name. Card with email field, password field
(with show/hide toggle), a green primary "Masuk" button full width, and a small
"Lupa password?" link. Subtle herbal-green background gradient at top. Clean, minimal.
```

### Layar 2 — Dashboard
```
Design a mobile dashboard for a cafe POS app in Bahasa Indonesia. Top: greeting
"Halo, Kasir" and today's date. Four summary stat cards in a 2x2 grid: "Omzet Hari Ini"
(Rp value, green), "Transaksi" (count), "Laba Kotor" (Rp), "Produk Terjual". Below: a
line/bar chart card "Penjualan 7 Hari Terakhir". Then a list card "Produk Terlaris"
(top 5 with qty). Then an alert card "Stok Menipis" listing low-stock ingredients with
red badges. Bottom tab bar: Dashboard, Kasir, Produk, Laporan, Lainnya.
```

### Layar 3 — POS Kasir (grid + keranjang)
```
Design a mobile cafe POS / cashier screen in Bahasa Indonesia. Top: search bar and
horizontal scrollable category chips (Semua, Kopi, Non-Kopi, Makanan, Snack). Main area:
a 2-column grid of product cards (image, name, price "Rp 25.000", tap to add). A floating
cart summary bar pinned at the bottom showing item count and total "Rp 75.000" with a
green "Bayar" button. Fast, tappable, high contrast. Touch-friendly.
```

### Layar 4 — Pembayaran (bottom sheet)
```
Design a payment bottom sheet for a cafe POS app in Bahasa Indonesia. Shows order summary
(list of items with qty and price), subtotal, pajak/PB1 10%, total in large bold green text.
Payment method toggle: Tunai / QRIS / Kartu. For Tunai: input "Uang Diterima" and auto
"Kembalian". Optional "Pilih Pelanggan" row. Big green "Proses Pembayaran" button at bottom.
```

### Layar 5 — Struk / Sukses Transaksi
```
Design a success / receipt screen for a cafe POS app in Bahasa Indonesia. Big green check
icon, "Pembayaran Berhasil". A receipt-style card: cafe name, date/time, transaction number,
itemized list, subtotal, pajak, total, payment method, kembalian. Two buttons: "Cetak Struk"
(outline) and "Transaksi Baru" (green primary). Clean receipt aesthetic.
```

### Layar 6 — Daftar Produk & Kategori
```
Design a mobile product management list for a cafe POS app in Bahasa Indonesia. Top: title
"Produk", search bar, and a green "+ Tambah" button. Category filter chips. A list of product
rows: thumbnail, name, category badge, price, and an active/inactive toggle. Each row tappable
to edit. Tab for "Kategori" to manage categories. Clean admin list style.
```

### Layar 7 — Form Tambah/Edit Produk
```
Design a mobile form to add/edit a product in a cafe POS app, Bahasa Indonesia. Fields:
image upload, "Nama Produk", "Kategori" (dropdown), "Harga Jual" (Rp), "SKU" (optional),
"Status Aktif" toggle, and a section "Resep Bahan Baku" with a link "Atur Resep". Sticky
"Simpan" green button at bottom. Clean, well-spaced form.
```

### Layar 8 — Editor Resep (Bill of Materials)
```
Design a mobile recipe editor for a cafe POS product in Bahasa Indonesia. Header shows the
product name. A list of ingredient rows: ingredient name, quantity input, unit (gr, ml, pcs),
and a delete icon. A "+ Tambah Bahan" button opens an ingredient picker. A summary card at
bottom shows calculated "HPP (Cost) per porsi: Rp 8.500" and estimated margin. Sticky "Simpan
Resep" button.
```

### Layar 9 — Daftar Bahan Baku (Inventori)
```
Design a mobile raw-material inventory list for a cafe in Bahasa Indonesia. Title "Inventori
Bahan Baku", search, "+ Tambah" button. List rows: ingredient name, current stock with unit
(e.g. "1.200 gr"), a low-stock red/amber badge when below minimum, and last purchase price.
Filter chips: Semua, Stok Menipis, Habis. Tappable rows. Clean inventory style.
```

### Layar 10 — Form Bahan / Terima Stok
```
Design a mobile form for a cafe inventory app in Bahasa Indonesia with two tabs: "Detail Bahan"
(fields: Nama Bahan, Satuan dropdown, Stok Minimum, Harga Beli per satuan) and "Terima Stok"
(fields: Jumlah Masuk, Harga Beli, Tanggal, Catatan, with a green "Catat Penerimaan" button
that adds to stock). Clean, clear.
```

### Layar 11 — Stock Movement (Riwayat)
```
Design a mobile stock movement / audit log screen for a cafe inventory app in Bahasa Indonesia.
Title "Pergerakan Stok", date range filter, and type filter chips: Semua, Penjualan, Penerimaan,
Penyesuaian. A timeline list: each entry shows ingredient name, movement type badge (green=in,
red=out, gray=adjustment), quantity with +/- sign, resulting balance, timestamp, and reference
(e.g. transaction number). Read-only audit feel.
```

### Layar 12 — Pelanggan
```
Design a mobile customer list and detail for a cafe POS app in Bahasa Indonesia. List: search,
"+ Tambah", rows with avatar/initial, name, phone, and total spend "Rp 1.250.000". Detail view:
customer info card, total transactions, total spend, and a history list of past transactions
with dates and amounts. Clean CRM-lite style.
```

### Layar 13 — Pengeluaran Operasional
```
Design a mobile operational expenses screen for a cafe in Bahasa Indonesia. Title "Pengeluaran",
month selector, a total spent card. List of expense rows: category icon+name (Sewa, Gaji, Listrik,
Bahan, Lainnya), description, date, amount in red. A green "+ Tambah Pengeluaran" button opening
a form (Kategori, Jumlah, Tanggal, Catatan). Clean finance list.
```

### Layar 14 — Laporan
```
Design a mobile business report screen for a cafe POS app in Bahasa Indonesia. Period tabs:
Harian, Mingguan, Bulanan, Tahunan, plus a custom date range picker. Summary cards: Omzet, HPP,
Laba Kotor, Pengeluaran, Laba Bersih (Laba Bersih highlighted). A bar chart of revenue over the
period and a breakdown list of top products. Two export buttons at top right: "PDF" and "Excel".
Professional dashboard report style.
```

### Layar 15 — Pengaturan
```
Design a mobile settings screen for a cafe POS app in Bahasa Indonesia. Grouped sections:
"Profil Cafe" (nama, alamat, logo, telepon), "Pajak & Biaya" (PB1/pajak %, service charge %),
"Metode Pembayaran" (toggle Tunai, QRIS, Kartu), "Pengguna & Role" (list users with role badges
Owner/Manajer/Kasir, + tambah user), "Struk" (header/footer text). Clean grouped list with
section headers and chevrons.
```

---

## 4. Setelah Generate di Stitch
Kirim balik ke saya salah satu dari:
- **Export HTML/CSS** dari Stitch (paling ideal — saya konversi presisi ke React + Tailwind + Shadcn), atau
- **Screenshot** tiap layar (saya bangun ulang komponennya).

Lalu kita lanjut ke **Tahap B** (repo GitHub + Vercel + Vercel Postgres) sambil saya rakit komponen UI.

## 5. Tips Pakai Stitch
- Generate per layar, jangan sekaligus — hasil lebih konsisten.
- Tempel **Design System (bagian 1)** sebelum tiap prompt agar warna/gaya seragam.
- Pilih mode **Mobile** untuk semua layar (app utama mobile-first); Laporan & Pengaturan boleh juga di-generate versi **Web** untuk tablet/desktop.
- Kalau hasil kurang pas, minta Stitch "iterate" dengan menyebut perubahan spesifik (mis. "make the cart bar sticky and larger").
