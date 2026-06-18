import {
  pgTable, pgEnum, uuid, text, timestamp, numeric, integer,
  boolean, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ----------------------------- Enums ----------------------------- */
export const userRole = pgEnum("user_role", ["owner", "manager", "cashier"]);
export const movementType = pgEnum("movement_type", [
  "sale",
  "purchase",
  "adjustment",
  "waste",
  "return",
]);
export const transactionStatus = pgEnum("transaction_status", ["paid", "void", "refunded"]);
export const paymentMethod = pgEnum("payment_method", ["cash", "qris", "card", "transfer"]);
export const referenceType = pgEnum("reference_type", ["transaction", "purchase", "manual"]);

/* --------------------------- Tenancy ----------------------------- */
export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  role: userRole("role").notNull().default("cashier"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
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
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ byTenant: index("categories_tenant_idx").on(t.tenantId) }));

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  sku: text("sku"),
  imageUrl: text("image_url"),
  price: numeric("price", { precision: 14, scale: 2 }).notNull(),
  costPrice: numeric("cost_price", { precision: 14, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byTenant: index("products_tenant_idx").on(t.tenantId),
  byCategory: index("products_category_idx").on(t.categoryId),
}));

/* ------------------------- Inventory ----------------------------- */
export const units = pgTable("units", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
}, (t) => ({
  byTenant: index("units_tenant_idx").on(t.tenantId),
  codeUnq: uniqueIndex("units_tenant_code_unq").on(t.tenantId, t.code),
}));

export const ingredients = pgTable("ingredients", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  unitId: uuid("unit_id").notNull().references(() => units.id),
  name: text("name").notNull(),
  currentStock: numeric("current_stock", { precision: 14, scale: 3 }).notNull().default("0"),
  minStock: numeric("min_stock", { precision: 14, scale: 3 }).notNull().default("0"),
  lastCost: numeric("last_cost", { precision: 14, scale: 4 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ byTenant: index("ingredients_tenant_idx").on(t.tenantId) }));

export const recipeItems = pgTable("recipe_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  ingredientId: uuid("ingredient_id").notNull().references(() => ingredients.id, { onDelete: "restrict" }),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
}, (t) => ({
  byProduct: index("recipe_items_product_idx").on(t.productId),
  prodIngUnq: uniqueIndex("recipe_items_product_ingredient_unq").on(t.productId, t.ingredientId),
}));

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  ingredientId: uuid("ingredient_id").notNull().references(() => ingredients.id, { onDelete: "restrict" }),
  type: movementType("type").notNull(),
  qtyChange: numeric("qty_change", { precision: 14, scale: 3 }).notNull(),
  balanceAfter: numeric("balance_after", { precision: 14, scale: 3 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 14, scale: 4 }),
  refType: referenceType("ref_type"),
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
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byTenant: index("customers_tenant_idx").on(t.tenantId),
  phoneUnq: uniqueIndex("customers_tenant_phone_unq").on(t.tenantId, t.phone),
}));

/* -------------------------- Transactions ------------------------- */
export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  number: text("number").notNull(),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  cashierId: uuid("cashier_id").references(() => profiles.id),
  status: transactionStatus("status").notNull().default("paid"),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 14, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 14, scale: 2 }).notNull(),
  cogsTotal: numeric("cogs_total", { precision: 14, scale: 2 }).notNull().default("0"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
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
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull(),
  unitCogs: numeric("unit_cogs", { precision: 14, scale: 2 }).notNull().default("0"),
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
  amountReceived: numeric("amount_received", { precision: 14, scale: 2 }),
  changeAmount: numeric("change_amount", { precision: 14, scale: 2 }).default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ byTransaction: index("payments_transaction_idx").on(t.transactionId) }));

/* --------------------------- Expenses ---------------------------- */
export const expenseCategories = pgTable("expense_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
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
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
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
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/* --------------------------- Relations --------------------------- */
export const tenantsRelations = relations(tenants, ({ many, one }) => ({
  profiles: many(profiles),
  settings: one(settings),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  tenant: one(tenants, { fields: [profiles.tenantId], references: [tenants.id] }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  tenant: one(tenants, { fields: [categories.tenantId], references: [tenants.id] }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  tenant: one(tenants, { fields: [products.tenantId], references: [tenants.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  recipe: many(recipeItems),
}));

export const unitsRelations = relations(units, ({ one, many }) => ({
  tenant: one(tenants, { fields: [units.tenantId], references: [tenants.id] }),
  ingredients: many(ingredients),
}));

export const ingredientsRelations = relations(ingredients, ({ one, many }) => ({
  tenant: one(tenants, { fields: [ingredients.tenantId], references: [tenants.id] }),
  unit: one(units, { fields: [ingredients.unitId], references: [units.id] }),
  stockMovements: many(stockMovements),
  recipeItems: many(recipeItems),
}));

export const recipeItemsRelations = relations(recipeItems, ({ one }) => ({
  product: one(products, { fields: [recipeItems.productId], references: [products.id] }),
  ingredient: one(ingredients, { fields: [recipeItems.ingredientId], references: [ingredients.id] }),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  ingredient: one(ingredients, { fields: [stockMovements.ingredientId], references: [ingredients.id] }),
  createdByProfile: one(profiles, { fields: [stockMovements.createdBy], references: [profiles.id] }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  tenant: one(tenants, { fields: [customers.tenantId], references: [tenants.id] }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  tenant: one(tenants, { fields: [transactions.tenantId], references: [tenants.id] }),
  customer: one(customers, { fields: [transactions.customerId], references: [customers.id] }),
  cashier: one(profiles, { fields: [transactions.cashierId], references: [profiles.id] }),
  items: many(transactionItems),
  payments: many(payments),
}));

export const transactionItemsRelations = relations(transactionItems, ({ one }) => ({
  transaction: one(transactions, { fields: [transactionItems.transactionId], references: [transactions.id] }),
  product: one(products, { fields: [transactionItems.productId], references: [products.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  transaction: one(transactions, { fields: [payments.transactionId], references: [transactions.id] }),
}));

export const expenseCategoriesRelations = relations(expenseCategories, ({ one, many }) => ({
  tenant: one(tenants, { fields: [expenseCategories.tenantId], references: [tenants.id] }),
  expenses: many(expenses),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  tenant: one(tenants, { fields: [expenses.tenantId], references: [tenants.id] }),
  category: one(expenseCategories, { fields: [expenses.categoryId], references: [expenseCategories.id] }),
  createdByProfile: one(profiles, { fields: [expenses.createdBy], references: [profiles.id] }),
}));

export const settingsRelations = relations(settings, ({ one }) => ({
  tenant: one(tenants, { fields: [settings.tenantId], references: [tenants.id] }),
}));
