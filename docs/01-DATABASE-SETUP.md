# Herbaspace POS — Database Setup Guide

## Overview
Database menggunakan Supabase (PostgreSQL) dengan Drizzle ORM untuk type-safe database access.

## Step 1: Setup Supabase SQL Schema

### Option A: Manual SQL Execution (Recommended for first setup)
1. Buka Supabase Dashboard → Project Anda
2. Pergi ke **SQL Editor** → **New Query**
3. Copy-paste isi dari `/db/schema.sql`
4. Run query

### Option B: Menggunakan Drizzle Push
```bash
npm run db:generate
npm run db:migrate
```

---

## Step 2: Verify Tables Created
Setelah SQL selesai dijalankan, verify di Supabase:
- Go to **Tables** menu
- Pastikan semua table berikut ada:
  - `organizations` ✓
  - `users` ✓
  - `categories` ✓
  - `products` ✓
  - `raw_materials` ✓
  - `inventory` ✓
  - `recipes` ✓
  - `recipe_items` ✓
  - `customers` ✓
  - `transactions` ✓
  - `transaction_items` ✓
  - `stock_movements` ✓
  - `expense_categories` ✓
  - `expenses` ✓
  - `settings` ✓

---

## Step 3: Enable Row Level Security (RLS)

### Important: RLS policies harus disetup agar data terlindungi per user/organization

Go ke Supabase Dashboard → **Authentication** → **Policies**

1. **Enable RLS** untuk semua table:
   ```sql
   ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
   -- ... lanjutkan untuk semua table
   ```

2. Lihat `/docs/02-RLS-POLICIES.md` untuk detail policy setup

---

## Step 4: Setup Drizzle ORM Locally

```bash
# Install dependencies (jika belum)
npm install

# Generate Drizzle files
npm run db:generate

# (Optional) Test koneksi
npm run db:studio
```

---

## Step 5: Database Connection String

File `.env` sudah memiliki `POSTGRES_URL`. Pastikan:
- URL sudah valid dari Vercel Postgres atau Neon
- Format: `postgresql://user:password@host/dbname`

---

## Schema Design Notes

### Multi-tenant Architecture
- Semua table memiliki `org_id` (organization_id)
- Data terpisah per cafe/organization
- Efisien untuk scaling horizontal

### UUID Primary Keys
- Semua ID menggunakan UUID bukan SERIAL INT
- Advantages:
  - Distributed system friendly
  - Privacy (ID tidak sequencial)
  - Migration-friendly

### Stock Movement Tracking
- `stock_movements` table mencatat setiap perubahan stok
- `movement_type`: `sale`, `purchase`, `adjustment`, `waste`
- `reference_id`: link ke transaction yang caused the movement

### Auto-update Timestamps
- Semua table punya `updated_at` field
- Triggers otomatis update timestamp

---

## Next Steps
1. Setup RLS Policies → `/docs/02-RLS-POLICIES.md`
2. Setup Authentication → `/docs/03-AUTH-SETUP.md`
3. Run seed data (development) → `npm run db:seed`
