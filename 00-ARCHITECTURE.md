# Herbaspace POS — Rencana Arsitektur & Roadmap

> Dokumen perencanaan menyeluruh. Disusun **sebelum** coding, sesuai aturan project (schema → ERD → struktur folder → implementasi bertahap).
> Versi 0.1 · 17 Juni 2026

---

## 1. PRD Ringkas

### 1.1 Visi Produk
Aplikasi POS profesional untuk cafe & F&B kecil–menengah yang menyatukan **transaksi kasir**, **manajemen inventori berbasis resep**, dan **laporan keuangan** dalam satu sistem. Setiap penjualan otomatis memotong stok bahan baku sesuai resep, sehingga owner selalu tahu posisi stok, HPP, dan laba secara real-time.

### 1.2 Target Pengguna
| Peran | Kebutuhan utama |
|-------|-----------------|
| **Owner** | Laporan omzet/HPP/laba, kontrol biaya, kesehatan stok |
| **Kasir** | Transaksi cepat, akurat, minim friksi saat ramai |
| **Manajer/Inventori** | Pantau stok bahan baku, penerimaan barang, stock opname |

### 1.3 Scope Modul (MVP)
1. **Dashboard** — ringkasan omzet hari ini, transaksi, produk terlaris, alert stok rendah.
2. **POS Kasir** — keranjang, pembayaran (tunai/non-tunai), cetak/struk, diskon, pilih pelanggan.
3. **Produk & Kategori** — CRUD produk, harga jual, kategori, status aktif.
4. **Resep Produk** — komposisi bahan baku per produk (BoM) untuk hitung HPP & potong stok.
5. **Inventori Bahan Baku** — master bahan, satuan, stok saat ini, harga beli, titik minimum.
6. **Stock Movement** — riwayat semua pergerakan stok (in/out/adjustment) yang dapat diaudit.
7. **Pelanggan** — data pelanggan, riwayat transaksi (dasar untuk loyalty ke depan).
8. **Pengeluaran Operasional** — pencatatan biaya (sewa, gaji, listrik, dll) per kategori.
9. **Laporan** — harian/mingguan/bulanan/tahunan: omzet, HPP, laba kotor, laba bersih + export PDF & Excel.
10. **Pengaturan** — profil cafe, pajak/service charge, metode bayar, user & role, pajak struk.

### 1.4 Business Rules (wajib)
- Produk **boleh** memiliki resep bahan baku; produk tanpa resep tetap bisa dijual (HPP manual/0).
- Saat transaksi **sukses (paid)**, stok bahan baku **otomatis berkurang** sesuai resep × qty.
- **Semua** pergerakan stok tercatat di `stock_movements` (penjualan, penerimaan, penyesuaian, retur).
- Sistem menghitung: **Omzet**, **HPP**, **Laba Kotor** (= Omzet − HPP), **Laba Bersih** (= Laba Kotor − Pengeluaran Operasional).
- Semua transaksi tersimpan untuk laporan harian, mingguan, bulanan, tahunan.
- Mendukung export **PDF** dan **Excel**.
- HPP dihitung saat transaksi dan **disimpan (snapshot)** di item transaksi — harga beli bahan bisa berubah, laporan historis tidak boleh ikut berubah.

### 1.5 Non-Functional Requirements
- **Keamanan**: Supabase Auth + Row Level Security per tabel; data ter-scope per `tenant`/cafe.
- **Performa**: transaksi kasir terasa instan (<150ms interaksi); query laporan ter-index.
- **Maintainability**: TypeScript strict, reusable component, layering jelas, no dead code.
- **Scalability**: schema multi-tenant-ready, arsitektur folder modular.
- **Mobile**: bundling Android & iOS via Capacitor; layout responsif & touch-friendly.
- **Auditability**: stok & transaksi immutable secara historis (snapshot + movement log).

---

## 2. Arsitektur Teknis

### 2.1 Technology Stack
| Layer | Teknologi |
|-------|-----------|
| UI | React 18 + Vite + TypeScript (strict) |
| Styling | Tailwind CSS + Shadcn UI |
| State server | TanStack Query (cache, sync, optimistic update) |
| State client | Zustand (cart kasir, UI state ringan) |
| Form | React Hook Form + Zod (validasi) |
| Backend | Supabase (PostgreSQL, Auth, RLS, Storage, Edge Functions) |
| Mobile | Capacitor (Android & iOS) |
| Export | Excel: SheetJS · PDF: pdfmake / react-pdf |
| Routing | React Router |

### 2.2 Prinsip Arsitektur
- **Database-first**: logika integritas kritikal (potong stok, catat movement) dilakukan di **PostgreSQL function + trigger / RPC transaksional**, bukan di klien. Mencegah race condition & stok korup.
- **Thin client, smart DB**: klien memanggil RPC `create_sale(...)` yang atomik — insert transaksi, insert item, potong stok, catat movement dalam satu transaksi DB.
- **Feature-based modules**: tiap modul mandiri (komponen, hooks, types, services-nya sendiri).
- **Shared UI kit**: komponen reusable (DataTable, FormField, Money, DateRangePicker, dll).

### 2.3 Struktur Folder (scalable)
```
herbaspace-pos/
├─ src/
│  ├─ app/                 # entry, providers, router, layout shell
│  ├─ components/ui/       # shadcn primitives
│  ├─ components/shared/   # DataTable, Money, EmptyState, PageHeader…
│  ├─ features/
│  │  ├─ dashboard/
│  │  ├─ pos/              # kasir: cart store, checkout, payment
│  │  ├─ products/
│  │  ├─ recipes/
│  │  ├─ inventory/
│  │  ├─ stock-movements/
│  │  ├─ customers/
│  │  ├─ expenses/
│  │  ├─ reports/
│  │  └─ settings/
│  │     └─ (tiap feature: components/ hooks/ services/ types.ts index.ts)
│  ├─ lib/                 # supabase client, query client, utils, formatters
│  ├─ hooks/               # global hooks (useAuth, useTenant…)
│  ├─ types/               # types global & generated DB types
│  └─ config/              # env, constants, routes
├─ supabase/
│  ├─ migrations/          # SQL berurutan (schema, functions, RLS, seed)
│  └─ functions/           # edge functions (export berat, dll bila perlu)
├─ android/  ios/          # Capacitor
└─ docs/                   # ERD, ADR, dokumen ini
```

### 2.4 Entitas Inti (preview — detail di dokumen schema/ERD)
`tenants` · `users/profiles` · `categories` · `products` · `units` · `ingredients` · `recipes` (product↔ingredient + qty) · `stock_movements` · `customers` · `transactions` · `transaction_items` · `payments` · `expense_categories` · `expenses` · `settings`.

### 2.5 Keamanan (RLS)
- Setiap tabel punya kolom `tenant_id`; policy `tenant_id = auth.jwt() -> tenant_id`.
- Role-based: `owner`, `manager`, `cashier` — hak akses per modul (mis. kasir tak bisa hapus produk).
- Operasi mutasi sensitif lewat `SECURITY DEFINER` RPC dengan validasi di dalamnya.

### 2.6 Alur Transaksi (inti sistem)
```
Kasir checkout
   └─ RPC create_sale(items, payment, customer)  [atomik]
        ├─ insert transactions (status=paid, simpan subtotal/pajak/total)
        ├─ insert transaction_items (snapshot harga jual + HPP per item)
        ├─ untuk tiap item dgn resep:
        │     potong stok ingredients (qty resep × qty jual)
        │     insert stock_movements (type=sale, ref=transaction_id)
        └─ insert payments
   → return receipt
```

---

## 3. Roadmap Implementasi Bertahap

### Fase 0 — Fondasi Data (mulai di sini)
- **M0.1** ERD lengkap + diagram relasi.
- **M0.2** SQL migration: tabel + index + constraint.
- **M0.3** Functions/RPC: `create_sale`, `adjust_stock`, `receive_stock` + trigger movement.
- **M0.4** RLS policies + seed data demo.

### Fase 1 — Skeleton Aplikasi
- **M1.1** Scaffold Vite + TS strict + Tailwind + Shadcn + struktur folder.
- **M1.2** Supabase client, Auth (login), app shell + routing + layout.
- **M1.3** Generate DB types, setup TanStack Query & shared UI kit.

### Fase 2 — Modul Inti (urut dependency)
1. Produk & Kategori → 2. Inventori Bahan Baku → 3. Resep Produk → 4. **POS Kasir** → 5. Stock Movement (viewer/audit) → 6. Pelanggan.

> Urutan ini wajib: kasir butuh produk, resep, dan inventori lebih dulu.

### Fase 3 — Keuangan & Pelaporan
- 7. Pengeluaran Operasional → 8. **Laporan** (omzet/HPP/laba + filter periode + export PDF & Excel) → 9. Dashboard (agregasi) → 10. Pengaturan.

### Fase 4 — Mobile & Hardening
- Integrasi Capacitor (Android/iOS), uji RLS, optimasi performa, error/empty states, QA end-to-end.

---

## 4. Definisi Selesai (per modul)
Setiap modul dianggap selesai bila: CRUD/alur utama berfungsi, validasi Zod, RLS teruji, reusable component dipakai, tidak ada kode dummy menganggur, dan responsif di mobile.

## 5. Langkah Berikutnya
Rekomendasi: lanjut ke **Fase 0 — M0.1 (ERD) + M0.2 (schema SQL)**. Beri perintah dan saya buatkan ERD beserta migration Supabase lengkap.
