# Herbaspace POS — Drizzle ORM Setup

## Overview
Drizzle ORM digunakan untuk type-safe database access dengan TypeScript.

## Configuration

### drizzle.config.ts
Sudah dikonfigurasi untuk:
- PostgreSQL dialect
- Schema dari `db/schema.ts`
- Migrations folder: `drizzle/`

### db/index.ts
- Connection pooling dengan `postgres-js`
- `prepare: false` untuk compatibility dengan Vercel Postgres

## Available Commands

### Generate Migrations
Setelah mengubah schema:
```bash
npm run db:generate
```

### Run Migrations
Jalankan pending migrations:
```bash
npm run db:migrate
```

### Open Drizzle Studio
GUI untuk manage database locally:
```bash
npm run db:studio
```

### Seed Database
Populate test data (development):
```bash
npm run db:seed
```

---

## Usage Example

### Querying Data
```typescript
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { eq } from "drizzle-orm";

// Get all products with category
const allProducts = await db.query.products.findMany({
  with: {
    category: true,
  },
});

// Get product by ID
const product = await db.query.products.findFirst({
  where: eq(products.id, "uuid-here"),
  with: {
    category: true,
    recipes: {
      with: {
        items: {
          with: {
            rawMaterial: true,
          },
        },
      },
    },
  },
});
```

### Insert Data
```typescript
const [newProduct] = await db
  .insert(products)
  .values({
    orgId: "org-uuid",
    categoryId: "category-uuid",
    name: "Espresso",
    price: 25000,
    requiresRecipe: true,
  })
  .returning();
```

### Update Data
```typescript
const updated = await db
  .update(products)
  .set({ price: 30000 })
  .where(eq(products.id, "product-uuid"))
  .returning();
```

### Delete Data
```typescript
await db
  .delete(products)
  .where(eq(products.id, "product-uuid"));
```

### Transactions
```typescript
await db.transaction(async (tx) => {
  // All queries dalam transaction ini
  await tx.insert(transactions).values({...});
  await tx.update(inventory).set({...});
});
```

---

## Relations

### One-to-Many
```typescript
const org = await db.query.organizations.findFirst({
  with: {
    users: true,      // All users in org
    products: true,
  },
});
```

### Many-to-One
```typescript
const product = await db.query.products.findFirst({
  with: {
    category: true,   // Single category
  },
});
```

### Deep Relations
```typescript
const transaction = await db.query.transactions.findFirst({
  with: {
    items: {
      with: {
        product: {
          with: {
            category: true,
          },
        },
      },
    },
  },
});
```

---

## API Routes Example

Lihat `/api/products.ts`, `/api/transactions.ts` untuk implementasi lengkap.

---

## Migration Workflow

1. **Modify schema.ts**
   ```bash
   npm run db:generate
   ```

2. **Review migration file**
   ```bash
   # Check drizzle/ folder untuk generated SQL
   ```

3. **Run migration**
   ```bash
   npm run db:migrate
   ```

4. **Verify in Drizzle Studio**
   ```bash
   npm run db:studio
   ```

---

## Performance Tips

- Always include indexes in schema
- Use relations with care (N+1 queries)
- Use transactions untuk write operations
- Leverage Drizzle prepared statements
- Profile dengan PostgreSQL EXPLAIN ANALYZE

---

## Troubleshooting

### Migration Conflicts
```bash
# Reset (⚠️ CAUTION: Data loss)
npm run db:migrate -- --fresh
```

### Connection Timeout
- Check POSTGRES_URL env variable
- Verify database is accessible
- Check connection pool settings

### Schema Sync Issues
```bash
npm run db:generate
npm run db:migrate
```
