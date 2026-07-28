# Audit Kelengkapan Fitur — Herbaspace POS (28 Juli 2026)

Audit ini BUKAN tentang bug (lihat `AUDIT-2026-07-28.md`), melainkan tentang **fitur
yang setengah-jadi, dummy/placeholder, tidak berfungsi di platform target, atau tidak
cocok dengan model bisnis** (retail parfum vs. cetakan POS kafe/F&B).

Metode: sweep penanda kode + walkthrough tiap layar + 7 agen telaah paralel + verifikasi
manual. Semua temuan dibaca dari kode, bukan tebakan. `file:line` bisa diklik.

## Gambaran besar

Aplikasi dibangun sebagai **POS kafe/F&B** (HPP dari resep, stok bahan baku, poin
loyalitas, promo) lalu dipakai untuk **retail parfum** (outlet "Aesthetic Perfume",
"Herbaspace Kota Wisata").

- **Loop inti SOLID & nyata:** jual → bayar → catat → void → laporan. Dashboard,
  laporan (Laba Rugi/Neraca), produk/kategori, modifier, bahan+resep+HPP, pelanggan
  (data), multi-outlet, shift, pengeluaran, karyawan — semua pakai data asli.
- **Cincin fitur "lanjutan" banyak yang stub** atau tak cocok retail. Rincian di bawah.

Legend severity: 🔴 tinggi · 🟠 sedang · 🟡 rendah · ⚪ kosmetik/data-mati

---

## A. Fitur yang terlihat jadi tapi TIDAK BERFUNGSI

### 🔴 A1. Poin loyalitas = penghitung hampa (tak bisa ditukar)
- Poin dihitung saat jual (`db/functions.sql:157`, `floor(v_total/10000)`) dan dibalik
  saat void (`api/_handlers/transactions.ts:63-66`) — bagian ini benar & atomik.
- **Tidak ada jalur menukar/memakai poin di mana pun.** Grep `redeem|tukar|pakai poin|
  potong poin|reward` di seluruh `src/ api/ db/` = 0. Poin menumpuk selamanya tanpa sink.
- Rate `10000` **hardcode di 2 tempat** (SQL + `transactions.ts:63`) — ubah satu, lainnya
  drift. Tak ada di settings.
- Poin **tak pernah ditampilkan** di kasir (`payment-sheet.tsx`) maupun struk mana pun.
- **Tak ada tier/membership** (tidak ada di skema, bukan setengah-jadi — memang tak ada).
- Untuk jadi fitur nyata: (a) jalur redeem, (b) rate dari settings, (c) tampilkan di
  kasir/struk.

### 🔴 A2. Promo "Beli X Gratis Y" tak pernah berlaku
- Form bisa pilih tipe `buy_x_get_y` + set Beli/Gratis, disimpan, tampil aktif — tapi
  `submit()` **tak pernah kirim `productId`** dan **tak ada pemilih produk** di form
  (`src/features/promos/index.tsx:100-108`).
- Checkout menuntutnya: `payment-sheet.tsx:85` gate `p.type==="buy_x_get_y" && p.productId`
  → productId selalu null → cabang mati, diskon 0.
- Terkait: `startAt/endAt` (window tanggal) dienforce (`use-promos.ts:62-63`) & disimpan
  API, tapi **form hanya punya input jam & hari, tak ada input tanggal** → kampanye
  ber-tanggal mustahil lewat UI.
- `startHour/endHour` hanya dienforce kalau **dua-duanya diisi** (`use-promos.ts:64`).
- **Tak ada kolom kuota/`maxUses`** di skema promo sama sekali.
- Promo yang JALAN penuh: `discount_percent`, `discount_amount`, `happy_hour`.

### 🔴 A3. Service Charge tak pernah diterapkan
- `serviceChargePercent` bisa diisi & disimpan (`settings.ts:29`), tampil di UI
  (`settings/index.tsx:138`), tapi **tak dibaca di mana pun**. Checkout hanya pakai
  `taxPercent` (`payment-sheet.tsx:116-117`); `create_sale` tak punya suku service charge.

### 🟠 A4. "Metode Pembayaran Aktif" tak menyaring apa pun
- `enabledPaymentMethods` disimpan (`settings.ts:32`) & bisa diatur, tapi kasir
  **hardcode 4 metode** (`payment-sheet.tsx:12-14`) dan tak menerima daftar aktif
  (`pos/index.tsx:258` hanya kirim `taxPercent`). Nonaktifkan "Kartu" → tetap muncul.

---

## B. Ketidakcocokan model bisnis (kafe vs retail parfum)

### 🔴 B1. Tidak ada stok barang jadi (paling fundamental)
- Tabel `products` **tak punya kolom stok** (`db/schema.ts` products: name, sku, price,
  costPrice, … tanpa stok).
- `product_variants.stock` ADA tapi **kolom mati** — tak pernah ditulis/dibaca/dikurangi
  (grep = 0 pemakaian).
- Inventori hanya melacak **bahan baku** (`ingredients.current_stock`) yang dipotong via
  resep saat jual (`create_sale`). Produk tanpa resep = tak menyentuh inventori.
- Untuk toko parfum jual botol jadi: **tak bisa lacak "berapa unit produk X tersisa"**
  kecuali akal-akalan tiap produk = 1 bahan dengan resep 1:1.
- Perbaikan = perubahan model + DB: kolom stok produk/varian + potong saat jual + tambah
  saat terima barang + laporan stok produk.

### 🟠 B2. Tidak ada refund (hanya void)
- Enum `transaction_status` punya `refunded` (`db/schema.ts:16`) tapi **tak pernah di-set**
  (grep `refund` = 0). Hanya `void` yang diimplementasi. Refund sebagian mustahil.

### 🟠 B3. Tidak ada split payment
- `payments` per transaksi berupa array (mendukung banyak metode), tapi kasir hanya
  menulis **satu metode** (`payment-sheet.tsx:27` single `method`, `:156` satu entri).

### 🟠 B4. Tidak ada penjualan sebagian / kasbon (hutang)
- `create_sale` menolak pembayaran < total ("Pembayaran kurang dari total"). Tak ada
  status "belum lunas" / piutang pelanggan.

### 🟡 B5. Diskon hanya per-keranjang, bukan per-item.

---

## C. Struk tidak konsisten (3 pembuat struk terpisah)

Ada 3 builder struk dengan daftar field disalin tangan → tiap field baru harus dikawel
3× dan praktiknya 0–1×:

| Field | Browser (`receipt.ts`) | Thermal (`thermal-printer.ts`) | Share (`shared-receipt.tsx`) |
|-------|:---:|:---:|:---:|
| receiptHeader | ✓ | ✗ **tak ada field** | ✓ |
| nama kasir | ✗ (tak diisi) | ✗ (tak dikirim) | ✓ |
| catatan item | ✓ | ✗ | ✗ |
| poin | ✗ | ✗ | ✗ |
| service charge | ✗ | ✗ | ✗ |
| identitas toko | outlet | outlet (tanpa nama outlet) | **settings tenant** (beda!) |

- 🟠 C1. `receiptHeader` hilang total di thermal.
- 🟠 C2. Nama kasir hilang di struk browser & thermal (hanya di link share).
- 🟡 C3. Catatan item hanya di struk browser (bukan thermal/share).
- 🟡 C4. Identitas toko divergen: browser pakai outlet, link share pakai settings tenant
  → transaksi sama, identitas toko beda di multi-outlet.

---

## D. Rusak di APK Android (Web API tak jalan di WebView)

App hanya pakai `@capacitor/core` — tak ada native plugin. Fitur berikut gagal di APK
(mayoritas **diam-diam**, tanpa error):

| Fitur | Masalah | Hasil di APK |
|-------|---------|--------------|
| 🔴 Cetak Struk ("Struk") | `window.open`+`print` (`receipt.ts:30`) | null → **diam, tak cetak** |
| 🔴 Scan Barcode | Manifest tanpa izin CAMERA + `BarcodeDetector` tak ada di WebView (`barcode-scanner.tsx:23,33`) | error "tak bisa akses kamera" |
| 🟠 Export CSV/Excel | `a.download` blob (`export.ts:38`) | **diam, tak ada file** |
| 🟠 Export PDF | `window.open`+print (`export.ts:83`) | **diam** |
| ℹ️ Thermal print | butuh Web Serial (tak ada) | tombol disembunyikan (graceful) |
| ⚪ Notif stok (Notification API) | tak ada di WebView | di-skip diam-diam |

Yang JALAN: share WA (buka WhatsApp di HP), pilih file CSV/foto, upload foto.
Perbaikan butuh native plugin (barcode ML Kit, `@capacitor/filesystem`+share untuk
export, plugin ESC/POS Bluetooth/USB untuk thermal).

---

## E. Kolom / data mati (deklarasi tanpa pemakaian)

| Item | Status |
|------|--------|
| `transactions.paid_at` | Tak pernah ditulis maupun dibaca |
| `customers.total_spent` | Write-only (ditulis saat jual/void, tak pernah dibaca; detail pakai hitung ulang) |
| `product_variants.stock` | Tak pernah ditulis/dibaca |
| `settings.logoUrl` | Ditulis handler, tak ada UI upload, tak ada struk pakai |
| `settings.serviceChargePercent` | Disimpan, tak diterapkan (A3) |
| `settings.enabledPaymentMethods` | Disimpan, tak menyaring (A4) |
| status `refunded` | Tak pernah di-set (B2) |

---

## F. UI setengah-wired (kosmetik)

- ⚪ F1. Swipe kiri di riwayat transaksi memunculkan ikon "edit" (pensil), tapi handler
  hanya membuka detail **read-only** (sama seperti tap) — `transactions/index.tsx:57`.

---

## Keamanan (temuan sampingan dari telaah promo)

- 🟠 Promo PUT/DELETE hanya scope `tenantId` (`api/_handlers/promos.ts:52,62`) → manager
  bisa edit/hapus promo outlet lain. (Pola sama seperti temuan authz lain yang sudah
  diperbaiki; ini instance baru.)
- 🟠 Tak ada validasi promo di server — `create_sale` menerima `discount` mentah dari
  klien (`payment-sheet.tsx:143` → `functions.sql`). Request rekayasa bisa klaim diskon
  apa pun. (Sudah tercatat di audit bug sebagai item terbuka.)

---

## Status pengerjaan (update 28 Juli 2026)

Dikerjakan berurutan & di-deploy:
- ✅ **A2** promo product-picker + input tanggal · ✅ **A3** service charge end-to-end
  (butuh migrasi 0007 + create_sale) · ✅ **A4** filter metode pembayaran
- ✅ **B1** stok barang jadi LENGKAP: lacak per produk & varian, potong saat jual,
  kembalikan saat void, form input, alur "Terima Stok", badge daftar, nilai stok di
  Neraca, alert produk habis di dashboard (migrasi 0008 + create_sale)
- ✅ **C** struk konsisten (kasir/header/catatan di semua struk) · ✅ **F** swipe-edit dibuang
- ⏸️ **A1** tukar poin — DITUNDA atas permintaan (poin tetap terkumpul, belum bisa dipakai)

Belum dikerjakan: **B2** refund · **B3** split payment · **B4** kasbon/piutang ·
**D** plugin native (cetak/scan/export) · **E** drop kolom mati (ditahan: sebagian
dipakai fitur mendatang). Keamanan promo (authz PUT/DELETE, validasi server) juga terbuka.

---

## Rekomendasi prioritas

1. **B1 Stok barang jadi** — paling fundamental untuk retail parfum. Perubahan model + DB.
2. **D Cetak & scan di Android** — krusial untuk POS ritel. Butuh native plugin.
3. **A1 poin bisa ditukar · A3 service charge · A4 filter metode bayar** — frontend/DB sedang.
4. **A2 promo product-picker + input tanggal** — frontend kecil.
5. **B2 refund · B3 split payment · B4 kasbon** — fitur baru.
6. **C samakan struk (satu model) · E bersihkan kolom mati · promo authz/validasi** — kebersihan.
