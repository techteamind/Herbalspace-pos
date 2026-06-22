# Herbaspace POS — Complete Setup Guide

Setup basis untuk Herbaspace POS sudah selesai! Ikuti langkah-langkah ini untuk menyelesaikan semuanya.

---

## ✅ Selesai (Done)

### 1. ✅ Database Schema & ERD
- File: `/db/schema.sql` (SQL schema lengkap)
- File: `/db/schema.ts` (Drizzle ORM type-safe schema)
- Includes: 15 tables untuk seluruh operasional POS
- Multi-tenant architecture dengan RLS support

### 2. ✅ Row Level Security (RLS) Policies
- File: `/db/rls-policies.sql`
- Policies untuk secure data access per organization
- Role-based access control (owner, manager, cashier, inventory)

### 3. ✅ Authentication System
- Files:
  - `/src/contexts/AuthContext.tsx` - Auth state management
  - `/src/pages/auth/login.tsx` - Login page
  - `/src/pages/auth/register.tsx` - Register page
  - `/src/components/ProtectedRoute.tsx` - Route protection
- Features:
  - Sign up dengan auto organization creation
  - Login dengan email/password
  - Session persistence
  - JWT token verification

### 4. ✅ Drizzle ORM Setup
- Configuration: `/drizzle.config.ts`
- Database connection: `/db/index.ts`
- Type-safe schema with relations
- Ready untuk queries dan mutations

### 5. ✅ Environment Setup
- `.env` sudah diisi dengan Supabase credentials
- Siap untuk database connection

---

## 🚀 Next Steps (Langkah Berikutnya)

### Step 1: Setup Supabase Database

**A. Jalankan SQL Schema**
1. Buka Supabase Dashboard → SQL Editor
2. Copy-paste isi file `/db/schema.sql`
3. Run query
4. Verify semua tables created di Supabase

**B. Enable RLS Policies**
1. Copy-paste isi file `/db/rls-policies.sql`
2. Run di Supabase SQL Editor
3. Verify policies di Supabase → Authentication → Policies

### Step 2: Test Setup di Local

```bash
# 1. Install dependencies
npm install

# 2. Generate Drizzle files
npm run db:generate

# 3. Run dev server
npm run dev

# 4. Open browser
# Go to http://localhost:5173

# 5. Register akun baru
# Fill cafe name, owner name, email, password

# 6. Test login
```

### Step 3: Verify Database Connection

```bash
# Open Drizzle Studio
npm run db:studio

# Cek semua tables tersedia
# Cek RLS policies aktif
```

---

## 📋 Implementation Roadmap (Per Module)

Setelah basic setup selesai, implementasi modul-modul POS:

### 🔄 Priority 1 (Core Features)
1. **Dashboard** - Overview revenue, top products, recent transactions
2. **POS Kasir** - Transaction flow, auto stock deduction
3. **Produk & Kategori** - CRUD products with categories
4. **Resep Produk** - Recipe management dengan raw materials

### 📊 Priority 2 (Inventory & Tracking)
5. **Inventori Bahan Baku** - Stock management
6. **Stock Movement** - Audit trail semua stock changes
7. **Pelanggan** - Customer management & transaction history

### 💰 Priority 3 (Financial)
8. **Pengeluaran Operasional** - Operational expenses tracking
9. **Laporan** - Sales, HPP, profit calculations
10. **Pengaturan** - Business configuration

---

## 📁 Folder Structure

```
src/
├── app/              # Application layout & router
├── components/       # Reusable components (UI, Protected routes)
├── contexts/         # Auth context & providers
├── features/         # Feature modules (dashboard, pos, products, dll)
├── hooks/           # Custom React hooks
├── lib/             # Utilities (supabase, api-client, etc)
├── pages/           # Page components (auth pages)
└── types/           # TypeScript type definitions

db/
├── schema.ts        # Drizzle ORM schema definitions
├── schema.sql       # SQL schema (for Supabase)
├── rls-policies.sql # RLS policies
├── index.ts         # Database connection setup
└── seed.ts          # Test data seeding

docs/
├── 01-DATABASE-SETUP.md
├── 02-RLS-POLICIES.md
├── 03-DRIZZLE-ORM-SETUP.md
└── 03-AUTH-SETUP.md
```

---

## 🔧 Key Technologies

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + Vite | UI & routing |
| Database | PostgreSQL (Supabase) | Data persistence |
| ORM | Drizzle ORM | Type-safe DB access |
| Auth | Supabase Auth | User authentication |
| Security | RLS Policies | Row-level security |
| State | Zustand + React Context | State management |
| Forms | React Hook Form + Zod | Form validation |
| API | React Query + Fetch API | Data fetching |
| Styling | Tailwind CSS + shadcn/ui | UI components |

---

## ⚠️ Important Notes

### Security
- ✅ JWT tokens dari Supabase Auth
- ✅ RLS policies protect data per organization
- ✅ Server-side validation untuk semua operations
- ✅ Never commit `.env` file (sudah di `.gitignore`)

### Performance
- ✅ Indexes pada frequently queried columns
- ✅ Drizzle query optimization
- ✅ React Query untuk client caching
- ✅ TypeScript strict mode untuk type safety

### Scalability
- ✅ UUID primary keys untuk distributed scaling
- ✅ Multi-tenant architecture
- ✅ Reusable components & hooks
- ✅ Clean separation of concerns

---

## 🐛 Troubleshooting

### Auth issues
- Check VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY di `.env`
- Verify Supabase project settings
- Check RLS policies enabled

### Database connection errors
- Check POSTGRES_URL di `.env`
- Verify PostgreSQL accessible
- Try `npm run db:studio` untuk test connection

### Migration conflicts
- Run `npm run db:generate` untuk sync schema
- Check `/drizzle` folder untuk migration files
- Run `npm run db:migrate` untuk apply changes

---

## 📚 Documentation

- `/docs/01-DATABASE-SETUP.md` - Database schema & table creation
- `/docs/02-RLS-POLICIES.md` - Security policies documentation
- `/docs/03-DRIZZLE-ORM-SETUP.md` - ORM usage & best practices
- `/docs/03-AUTH-SETUP.md` - Authentication flow details

---

## 🎯 Testing Checklist

- [ ] Register new user
- [ ] Login with created credentials
- [ ] Verify user redirected to dashboard
- [ ] Logout & redirect to login
- [ ] Test protected route access
- [ ] Check RLS policies working (data isolation)
- [ ] Test database queries in Drizzle Studio

---

## 🚀 Ready untuk Development!

Setelah setup selesai, Anda siap untuk:
1. Implementasi modul per modul
2. Create API routes untuk CRUD operations
3. Build UI dengan shadcn/ui components
4. Test dengan real transaction flows

**Happy coding! 🎉**
