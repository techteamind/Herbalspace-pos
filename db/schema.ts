/**
 * Herbaspace POS — Database Schema (Drizzle ORM / PostgreSQL)
 * Single source of truth untuk struktur database.
 *
 * Catatan keamanan: database di Vercel Postgres (bukan Supabase), sehingga
 * RLS Supabase TIDAK berlaku. Otorisasi di-enforce di lapisan API (verifikasi
 * Supabase JWT + scoping `tenantId`). Lihat api/_lib/auth.ts.
 */
import {
  pgTable, pgEnum, uuid, text, timestamp, numeric, integer,
  boolean, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ----------------------------- Enums ----------------------------- */
export const userRole = pgEnum("user_role", ["owner", "manager", "cashier"]);
export const movementType = pgEnum("movement_type", [
  "sale",        // keluar karena penjualan
  "purchase",    // masuk karena penerimaan barang
  "adjustment",  // penyesuaian stok opname (+/-)
  "waste",       // kerusakan / kadaluarsa
  "return",      // retur penjualan (masuk kembali)
]);
export const transactionStatus = pgEnum("transaction_status", ["paid", "void", "refunded"]);
export const paymentMethod = pgEnum("payment_method", ["cash", "qris", "card", "transfer"]);

/* --------------------------- Tenancy ----------------------------- */
export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Profil user aplikasi. `id` = id user dari Supabase Auth (auth.users.id).
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // Supabase auth user id
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  role: userRole("role").notNull().default("cashier"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byTenant: index("profiles_tenant_idx").on(t.tenantId),
  emailUnq: uniqueIndex("profiles_email_unq").on(t.email),
}));

/* --------------------------- Catalog ----------------------------- */
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ byTenant: index("categories_tenant_idx").on(t.tenantId) }));

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  sku: text("sku"),
  imageUrl: text("image_url"),
  price: numeric("price", { precision: 14, scale: 2 }).notNull(),  // harga jual
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byTenant: index("products_tenant_idx").on(t.tenantId),
  byCategory: index("products_category_idx").on(t.categoryId),
}));

/* ------------------------- Inventory ----------------------------- */
// Satuan bahan baku (gr, ml, pcs, dll)
export const units = pgTable("units", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  code: text("code").notNull(),   // "gr", "ml", "pcs"
  name: text("name").notNull(),   // "Gram", "Mililiter", "Pieces"
}, (t) => ({ byTenant: index("units_tenant_idx").on(t.tenantId) }));

export const ingredients = pgTable("ingredients", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  unitId: uuid("unit_id").notNull().references(() => units.id),
  name: text("name").notNull(),
  currentStock: numeric("current_stock", { precision: 14, scale: 3 }).notNull().default("0"),
  minStock: numeric("min_stock", { precision: 14, scale: 3 }).notNull().default("0"),
  // harga beli per satuan terakhir; dasar kalkulasi HPP
  lastCost: numeric("last_cost", { precision: 14, scale: 4 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ byTenant: index("ingredients_tenant_idx").on(t.tenantId) }));

// Resep = komposisi bahan baku per produk (Bill of Materials)
export const recipeItems = pgTable("recipe_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  ingredientId: uuid("ingredient_id").notNull().references(() => ingredients.id, { onDelete: "restrict" }),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(), // jumlah bahan per 1 porsi
}, (t) => ({
  byProduct: index("recipe_items_product_idx").on(t.productId),
  prodIngUnq: uniqueIndex("recipe_items_product_ingredient_unq").on(t.productId, t.ingredientId),
}));

// Buku besar pergerakan stok — semua perubahan stok WAJIB tercatat di sini.
export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  ingredientId: uuid("ingredient_id").notNull().references(() => ingredients.id, { onDelete: "restrict" }),
  type: movementType("type").notNull(),
  // qtyChange: negatif untuk keluar, positif untuk masuk
  qtyChange: numeric("qty_change", { precision: 14, scale: 3 }).notNull(),
  balanceAfter: numeric("balance_after", { precision: 14, scale: 3 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 14, scale: 4 }), // harga/satuan saat movement
  referenceType: text("reference_type"), // "transaction" | "purchase" | "manual"
  referenceId: uuid("reference_id"),
  note: text("note"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byTenant: index("stock_movements_tenant_idx").on(t.tenantId),
  byIngredient: index("stock_movements_ingredient_idx").on(t.ingredientId),
  byCreatedAt: index("stock_movements_created_at_idx").on(t.createdAt),
}));

/* --------------------------- Customers --------------------------- */
export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ byTenant: index("customers_tenant_idx").on(t.tenantId) }));

/* -------------------------- Transactions ------------------------- */
export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  number: text("number").notNull(),        // nomor struk, mis. TRX-20260617-0001
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  cashierId: uuid("cashier_id").references(() => profiles.id),
  status: transactionStatus("status").notNull().default("paid"),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 14, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 14, scale: 2 }).notNull(),
  cogsTotal: numeric("cogs_total", { precision: 14, scale: 2 }).notNull().default("0"), // HPP total (snapshot)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byTenant: index("transactions_tenant_idx").on(t.tenantId),
  byCreatedAt: index("transactions_created_at_idx").on(t.createdAt),
  numberUnq: uniqueIndex("transactions_number_unq").on(t.tenantId, t.number),
}));

export const transactionItems = pgTable("transaction_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  transactionId: uuid("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(), // snapshot nama
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull(),   // snapshot harga jual
  unitCogs: numeric("unit_cogs", { precision: 14, scale: 2 }).notNull().default("0"), // snapshot HPP/unit
  lineTotal: numeric("line_total", { precision: 14, scale: 2 }).notNull(),
}, (t) => ({
  byTransaction: index("transaction_items_transaction_idx").on(t.transactionId),
}));

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  transactionId: uuid("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  method: paymentMethod("method").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  amountReceived: numeric("amount_received", { precision: 14, scale: 2 }), // utk tunai
  changeAmount: numeric("change_amount", { precision: 14, scale: 2 }).default("0"),
}, (t) => ({ byTransaction: index("payments_transaction_idx").on(t.transactionId) }));

/* --------------------------- Expenses ---------------------------- */
export const expenseCategories = pgTable("expense_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // Sewa, Gaji, Listrik, Bahan, Lainnya
}, (t) => ({ byTenant: index("expense_categories_tenant_idx").on(t.tenantId) }));

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => expenseCategories.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  spentAt: timestamp("spent_at", { withTimezone: true }).notNull(),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byTenant: index("expenses_tenant_idx").on(t.tenantId),
  bySpentAt: index("expenses_spent_at_idx").on(t.spentAt),
}));

/* --------------------------- Settings ---------------------------- */
export const settings = pgTable("settings", {
  tenantId: uuid("tenant_id").primaryKey().references(() => tenants.id, { onDelete: "cascade" }),
  cafeName: text("cafe_name").notNull().default("Herbaspace"),
  address: text("address"),
  phone: text("phone"),
  logoUrl: text("logo_url"),
  taxPercent: numeric("tax_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  serviceChargePercent: numeric("service_charge_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  receiptHeader: text("receipt_header"),
  receiptFooter: text("receipt_footer"),
  enabledPaymentMethods: jsonb("enabled_payment_methods").$type<string[]>().notNull().default(["cash", "qris"]),
});

/* --------------------------- Relations --------------------------- */
export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  recipe: many(recipeItems),
}));
export const recipeItemsRelations = relations(recipeItems, ({ one }) => ({
  product: one(products, { fields: [recipeItems.productId], references: [products.id] }),
  ingredient: one(ingredients, { fields: [recipeItems.ingredientId], references: [ingredients.id] }),
}));
export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  customer: one(customers, { fields: [transactions.customerId], references: [customers.id] }),
  items: many(transactionItems),
  payments: many(payments),
}));
export const transactionItemsRelations = relations(transactionItems, ({ one }) => ({
  transaction: one(transactions, { fields: [transactionItems.transactionId], references: [transactions.id] }),
  product: one(products, { fields: [transactionItems.productId], references: [products.id] }),
}));
