# Herbaspace POS

Aplikasi POS untuk operasional cafe & F&B. Transaksi kasir, inventori berbasis resep, dan laporan keuangan dalam satu sistem.

## Stack

- **Frontend:** React + Vite + TypeScript (strict) + Tailwind CSS + Shadcn UI
- **State:** TanStack Query (server) + Zustand (cart/UI)
- **Backend:** Vercel Serverless Functions (`/api`)
- **Database:** Vercel Postgres (Neon) + Drizzle ORM
- **Auth:** Supabase Auth (autentikasi saja)
- **Mobile:** Capacitor (Android & iOS)
- **Deploy:** GitHub → Vercel

## Struktur Folder

```
herbaspace-pos/
├─ api/                 # Vercel serverless functions (akses DB + auth guard)
│  ├─ _lib/auth.ts      # verifikasi Supabase JWT + scoping tenant
│  ├─ health.ts
│  └─ sales.ts          # POST /api/sales -> create_sale (atomik)
├─ db/                  # schema & client database (sumber kebenaran)
│  ├─ schema.ts         # Drizzle schema (semua tabel + relasi)
│  ├─ index.ts          # koneksi Drizzle ke Vercel Postgres
│  └─ functions.sql     # fungsi create_sale (jalankan manual sekali)
├─ drizzle/             # output migrasi drizzle-kit
├─ src/
│  ├─ app/              # router + layout shell
│  ├─ components/       # ui (shadcn) + shared (reusable)
│  ├─ features/         # modul: dashboard, pos, products, ... (feature-based)
│  ├─ hooks/            # useAuth, dll
│  └─ lib/              # supabase, api-client, query-client, utils
├─ design/stitch/       # mockup UI dari Stitch (15 layar) + design tokens
└─ docs/                # ERD.md, dokumen arsitektur
```

## Mulai Cepat (lokal)

```bash
npm install
cp .env.example .env        # isi nilainya (lihat docs/SETUP.md)
npm run db:generate         # generate migrasi dari schema
npm run db:migrate          # terapkan ke Vercel Postgres
psql "$POSTGRES_URL" -f db/functions.sql   # pasang fungsi create_sale
npm run dev
```

## Dokumentasi

- **Setup lengkap (GitHub + Vercel + DB + Auth):** [`docs/SETUP.md`](docs/SETUP.md)
- **ERD:** [`docs/ERD.md`](docs/ERD.md)
- **Arsitektur & roadmap:** [`00-ARCHITECTURE.md`](00-ARCHITECTURE.md)
- **Desain UI (Stitch):** [`01-DESIGN-STITCH.md`](01-DESIGN-STITCH.md)

## Status

✅ Fondasi: schema, ERD, scaffold, API inti (`create_sale`), auth.
⏳ Berikutnya (Tahap D): implementasi modul per fitur mengikuti mockup di `design/stitch/`.
