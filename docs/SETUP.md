# SETUP — GitHub + Vercel + Vercel Postgres + Supabase Auth

Panduan langkah demi langkah dari nol sampai online. Yang ditandai 🧑 dikerjakan kamu (butuh akun); sisanya sudah disiapkan di repo.

---

## 1. Prasyarat
- Node.js 20+ (`node -v`)
- Akun: **GitHub**, **Vercel**, **Supabase** (gratis)
- (Opsional) `psql` CLI untuk menjalankan `db/functions.sql`

## 2. Push ke GitHub 🧑
```bash
cd "herbaspace-pos"
git init
git add .
git commit -m "chore: scaffold Herbaspace POS"
git branch -M main
# buat repo kosong di github.com lalu:
git remote add origin https://github.com/<user>/herbaspace-pos.git
git push -u origin main
```

## 3. Buat Project di Vercel 🧑
1. Vercel → **Add New → Project** → import repo `herbaspace-pos`.
2. Framework otomatis terdeteksi **Vite**. Build sudah diatur lewat `vercel.json`.
3. **Jangan deploy dulu** — set environment variables (langkah 5) lebih dulu, atau deploy lalu redeploy.

## 4. Provision Vercel Postgres 🧑
1. Di project Vercel → tab **Storage → Create Database → Postgres**.
2. Pilih region terdekat (mis. Singapore), beri nama `herbaspace-db`.
3. **Connect** ke project. Vercel otomatis menambah env `POSTGRES_URL` (dan variabel terkait) ke project.
4. Untuk lokal: tab Storage → `.env.local` → **copy** `POSTGRES_URL` ke file `.env` kamu.

## 5. Setup Supabase Auth 🧑
1. supabase.com → **New project** (region terdekat). Catat password.
2. **Project Settings → API**:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
   - `JWT Secret` → `SUPABASE_JWT_SECRET`
3. **Authentication → Providers → Email**: aktifkan. Untuk awal, matikan "Confirm email" agar mudah testing.
4. Masukkan ketiga nilai di atas ke env **Vercel** (Settings → Environment Variables) dan ke `.env` lokal.

> Catatan: Supabase di sini **hanya untuk login**. Semua data bisnis ada di Vercel Postgres.

## 6. Isi `.env` lokal
Salin `.env.example` → `.env`, lengkapi:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_JWT_SECRET=...
POSTGRES_URL=...
```

## 7. Migrasi Database
```bash
npm install
npm run db:generate     # buat file SQL migrasi dari db/schema.ts
npm run db:migrate      # terapkan tabel ke Vercel Postgres
psql "$POSTGRES_URL" -f db/functions.sql   # pasang fungsi create_sale()
```
Verifikasi: `npm run db:studio` untuk melihat tabel.

## 8. Seed data awal (manual, sekali) 🧑
Buat 1 tenant + profil owner yang terhubung ke user Supabase:
```sql
-- 1) buat user di Supabase (Authentication > Users > Add user), salin UUID-nya
-- 2) jalankan (ganti <AUTH_USER_UUID> dan email):
insert into tenants (id, name) values (gen_random_uuid(), 'Herbaspace Cafe')
  returning id;  -- catat <TENANT_ID>

insert into profiles (id, tenant_id, full_name, email, role)
values ('<AUTH_USER_UUID>', '<TENANT_ID>', 'Owner', 'owner@cafe.com', 'owner');

insert into settings (tenant_id, cafe_name, tax_percent)
values ('<TENANT_ID>', 'Herbaspace Cafe', 10);
```

## 9. Jalankan & Deploy
```bash
npm run dev            # lokal: http://localhost:5173
# API lokal: gunакан `vercel dev` agar folder /api ikut jalan
```
Deploy: setiap `git push` ke `main` otomatis ter-deploy oleh Vercel.

## 10. (Nanti) Build Mobile — Capacitor 🧑
```bash
npm run build
npx cap add android
npx cap add ios
npm run cap:sync
npx cap open android   # buka di Android Studio
```
> Set `server.url` Capacitor ke domain Vercel, atau bundle `dist` + arahkan API ke domain produksi.

---

## Checklist Cepat
- [ ] Repo di GitHub
- [ ] Project Vercel terhubung repo
- [ ] Vercel Postgres dibuat & `POSTGRES_URL` ada
- [ ] Supabase Auth: 3 env terisi (URL, anon, JWT secret)
- [ ] `db:migrate` sukses + `functions.sql` terpasang
- [ ] Seed tenant + profil owner
- [ ] `vercel dev` jalan, bisa login & hit `/api/health`

## Troubleshooting
- **401 di /api**: cek `SUPABASE_JWT_SECRET` cocok dengan project Supabase, dan profil user ada di tabel `profiles`.
- **`POSTGRES_URL belum di-set`**: env belum termuat; untuk lokal pakai `vercel dev` atau ekspor env manual.
- **Stok tidak berkurang**: pastikan `db/functions.sql` sudah dijalankan dan produk punya `recipe_items`.
