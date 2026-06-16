# Herbaspace POS — ERD (Entity Relationship Diagram)

> Sumber kebenaran: `db/schema.ts` (Drizzle). Diagram ini representasi visualnya.

```mermaid
erDiagram
    tenants ||--o{ profiles : "punya"
    tenants ||--o{ categories : ""
    tenants ||--o{ products : ""
    tenants ||--o{ ingredients : ""
    tenants ||--o{ transactions : ""
    tenants ||--|| settings : ""

    categories ||--o{ products : "mengelompokkan"
    products ||--o{ recipe_items : "punya resep"
    ingredients ||--o{ recipe_items : "dipakai di"
    units ||--o{ ingredients : "satuan"

    ingredients ||--o{ stock_movements : "pergerakan"
    transactions ||--o{ transaction_items : "berisi"
    transactions ||--o{ payments : "dibayar"
    products ||--o{ transaction_items : "terjual"
    customers ||--o{ transactions : "melakukan"
    profiles ||--o{ transactions : "kasir"

    expense_categories ||--o{ expenses : "kategori"

    transactions {
      uuid id PK
      text number
      numeric subtotal
      numeric discount
      numeric tax_amount
      numeric total
      numeric cogs_total "HPP snapshot"
      enum status
    }
    transaction_items {
      uuid id PK
      int quantity
      numeric unit_price "snapshot"
      numeric unit_cogs "snapshot HPP"
      numeric line_total
    }
    products {
      uuid id PK
      text name
      numeric price
      bool is_active
    }
    ingredients {
      uuid id PK
      numeric current_stock
      numeric min_stock
      numeric last_cost
    }
    recipe_items {
      uuid id PK
      numeric quantity "per porsi"
    }
    stock_movements {
      uuid id PK
      enum type
      numeric qty_change "+/-"
      numeric balance_after
      uuid reference_id
    }
```

## Entitas Inti

| Tabel | Peran |
|-------|-------|
| `tenants` | Cafe/outlet (multi-tenant ready) |
| `profiles` | User aplikasi; `id` = Supabase Auth user id; punya `role` |
| `categories` / `products` | Katalog jual |
| `units` / `ingredients` | Master bahan baku + stok + harga beli terakhir |
| `recipe_items` | Resep (BoM): bahan + qty per porsi produk |
| `stock_movements` | Buku besar semua pergerakan stok (audit) |
| `customers` | Data pelanggan |
| `transactions` / `transaction_items` / `payments` | Penjualan + item (snapshot harga & HPP) + pembayaran |
| `expense_categories` / `expenses` | Pengeluaran operasional |
| `settings` | Konfigurasi cafe, pajak, metode bayar |

## Aturan Bisnis pada Schema

- **HPP snapshot**: `transaction_items.unit_cogs` & `transactions.cogs_total` disimpan saat transaksi → laporan historis tidak berubah meski `ingredients.last_cost` berubah.
- **Auto-potong stok**: dilakukan oleh fungsi `create_sale()` (`db/functions.sql`) secara atomik, lalu mencatat ke `stock_movements`.
- **Perhitungan laba**:
  - Omzet = `SUM(transactions.total)`
  - HPP = `SUM(transactions.cogs_total)`
  - Laba Kotor = Omzet − HPP
  - Laba Bersih = Laba Kotor − `SUM(expenses.amount)`
- **Keamanan**: setiap tabel ber-`tenant_id`; otorisasi di lapisan API (verifikasi Supabase JWT + filter `tenant_id`), karena DB di Vercel Postgres tanpa RLS.
