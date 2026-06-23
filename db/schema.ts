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
  outletId: uuid("outlet_id").references(() => outlets.id, { onDelete: "set null" }),
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
  outletId: uuid("outlet_id").references(() => outlets.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ byTenant: index("categories_tenant_idx").on(t.tenantId) }));

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  outletId: uuid("outlet_id").references(() => outlets.id, { onDelete: "cascade" }),
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
  outletId: uuid("outlet_id").references(() => outlets.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
}, (t) => ({
  byTenant: index("units_tenant_idx").on(t.tenantId),
  codeUnq: uniqueIndex("units_tenant_code_unq").on(t.tenantId, t.code),
}));

export const ingredients = pgTable("ingredients", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  outletId: uuid("outlet_id").references(() => outlets.id, { onDelete: "cascade" }),
  unitId: uuid("unit_id").notNull().references(() => units.id),
  name: text("name").notNull(),
  currentStock: numeric("current_stock", { precision: 14, scale: 3 }).notNull().default("0"),
  minStock: numeric("min_stock", { precision: 14, scale: 3 }).notNull().default("0"),
  lastCost: numeric("last_cost", { precision: 14, scale: 4 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byTenant: index("ingredients_tenant_idx").on(t.tenantId),
  byOutlet: index("ingredients_outlet_idx").on(t.outletId),
}));

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
  outletId: uuid("outlet_id").references(() => outlets.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  note: text("note"),
  points: integer("points").notNull().default(0),
  totalSpent: numeric("total_spent", { precision: 14, scale: 2 }).notNull().default("0"),
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
  outletId: uuid("outlet_id").references(() => outlets.id, { onDelete: "cascade" }),
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
  byTenantStatusDate: index("transactions_tenant_status_date_idx").on(t.tenantId, t.status, t.createdAt),
  byOutlet: index("transactions_outlet_idx").on(t.outletId),
  numberUnq: uniqueIndex("transactions_number_unq").on(t.tenantId, t.number),
}));

export const transactionItems = pgTable("transaction_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  transactionId: uuid("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(),
  variantLabel: text("variant_label"),
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
  outletId: uuid("outlet_id").references(() => outlets.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
}, (t) => ({ byTenant: index("expense_categories_tenant_idx").on(t.tenantId) }));

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  outletId: uuid("outlet_id").references(() => outlets.id, { onDelete: "cascade" }),
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

/* ----------------------- Shared Receipts ------------------------- */
export const sharedReceipts = pgTable("shared_receipts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  transactionId: uuid("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  tokenUnq: uniqueIndex("shared_receipts_token_unq").on(t.token),
  byTransaction: index("shared_receipts_transaction_idx").on(t.transactionId),
}));

/* -------------------------- Price History -------------------------- */
export const priceHistory = pgTable("price_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  oldPrice: numeric("old_price", { precision: 14, scale: 2 }).notNull(),
  newPrice: numeric("new_price", { precision: 14, scale: 2 }).notNull(),
  changedBy: uuid("changed_by").references(() => profiles.id),
  changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byProduct: index("price_history_product_idx").on(t.productId),
  byChangedAt: index("price_history_changed_at_idx").on(t.changedAt),
}));

/* ----------------------------- Promos ------------------------------ */
export const promoType = pgEnum("promo_type", ["discount_percent", "discount_amount", "buy_x_get_y", "happy_hour"]);

export const promos = pgTable("promos", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  outletId: uuid("outlet_id").references(() => outlets.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: promoType("type").notNull(),
  value: numeric("value", { precision: 14, scale: 2 }).notNull(),
  minPurchase: numeric("min_purchase", { precision: 14, scale: 2 }).notNull().default("0"),
  buyQty: integer("buy_qty"),
  getQty: integer("get_qty"),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
  startAt: timestamp("start_at", { withTimezone: true }),
  endAt: timestamp("end_at", { withTimezone: true }),
  startHour: text("start_hour"),
  endHour: text("end_hour"),
  daysOfWeek: jsonb("days_of_week").$type<number[]>(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byTenant: index("promos_tenant_idx").on(t.tenantId),
}));

/* ----------------------------- Shifts ----------------------------- */
export const shifts = pgTable("shifts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  outletId: uuid("outlet_id").references(() => outlets.id, { onDelete: "cascade" }),
  cashierId: uuid("cashier_id").notNull().references(() => profiles.id),
  cashierName: text("cashier_name").notNull(),
  openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  openingCash: numeric("opening_cash", { precision: 14, scale: 2 }).notNull().default("0"),
  closingCash: numeric("closing_cash", { precision: 14, scale: 2 }),
  expectedCash: numeric("expected_cash", { precision: 14, scale: 2 }),
  totalSales: numeric("total_sales", { precision: 14, scale: 2 }),
  totalTransactions: integer("total_transactions"),
  note: text("note"),
}, (t) => ({
  byTenant: index("shifts_tenant_idx").on(t.tenantId),
  byCashier: index("shifts_cashier_idx").on(t.cashierId),
}));

/* --------------------------- Audit Logs ---------------------------- */
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  outletId: uuid("outlet_id").references(() => outlets.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => profiles.id),
  userName: text("user_name"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byTenant: index("audit_logs_tenant_idx").on(t.tenantId),
  byCreatedAt: index("audit_logs_created_at_idx").on(t.createdAt),
}));

/* ------------------------ Product Variants ------------------------- */
export const variantGroups = pgTable("variant_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
}, (t) => ({
  byProduct: index("variant_groups_product_idx").on(t.productId),
}));

export const variantOptions = pgTable("variant_options", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  groupId: uuid("group_id").notNull().references(() => variantGroups.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
}, (t) => ({
  byGroup: index("variant_options_group_idx").on(t.groupId),
}));

export const productVariants = pgTable("product_variants", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  optionIds: jsonb("option_ids").$type<string[]>().notNull(),
  label: text("label").notNull(),
  sku: text("sku"),
  price: numeric("price", { precision: 14, scale: 2 }).notNull(),
  costPrice: numeric("cost_price", { precision: 14, scale: 2 }).notNull().default("0"),
  stock: integer("stock"),
  isActive: boolean("is_active").notNull().default(true),
}, (t) => ({
  byProduct: index("product_variants_product_idx").on(t.productId),
}));

/* ------------------------- Modifiers / Add-ons ---------------------- */
export const modifierGroups = pgTable("modifier_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  outletId: uuid("outlet_id").references(() => outlets.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isRequired: boolean("is_required").notNull().default(false),
  maxSelect: integer("max_select").notNull().default(5),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byTenant: index("modifier_groups_tenant_idx").on(t.tenantId),
}));

export const modifierOptions = pgTable("modifier_options", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  groupId: uuid("group_id").notNull().references(() => modifierGroups.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  price: numeric("price", { precision: 14, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
}, (t) => ({
  byGroup: index("modifier_options_group_idx").on(t.groupId),
}));

export const productModifiers = pgTable("product_modifiers", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  modifierGroupId: uuid("modifier_group_id").notNull().references(() => modifierGroups.id, { onDelete: "cascade" }),
}, (t) => ({
  byProduct: index("product_modifiers_product_idx").on(t.productId),
  unq: uniqueIndex("product_modifiers_unq").on(t.productId, t.modifierGroupId),
}));

/* ----------------------------- Outlets ----------------------------- */
export const outlets = pgTable("outlets", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  logoUrl: text("logo_url"),
  receiptHeader: text("receipt_header"),
  receiptFooter: text("receipt_footer"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byTenant: index("outlets_tenant_idx").on(t.tenantId),
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
  outlet: one(outlets, { fields: [profiles.outletId], references: [outlets.id] }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  tenant: one(tenants, { fields: [categories.tenantId], references: [tenants.id] }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  tenant: one(tenants, { fields: [products.tenantId], references: [tenants.id] }),
  outlet: one(outlets, { fields: [products.outletId], references: [outlets.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  recipe: many(recipeItems),
  variantGroups: many(variantGroups),
  variants: many(productVariants),
  modifiers: many(productModifiers),
}));

export const variantGroupsRelations = relations(variantGroups, ({ one, many }) => ({
  tenant: one(tenants, { fields: [variantGroups.tenantId], references: [tenants.id] }),
  product: one(products, { fields: [variantGroups.productId], references: [products.id] }),
  options: many(variantOptions),
}));

export const variantOptionsRelations = relations(variantOptions, ({ one }) => ({
  tenant: one(tenants, { fields: [variantOptions.tenantId], references: [tenants.id] }),
  group: one(variantGroups, { fields: [variantOptions.groupId], references: [variantGroups.id] }),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  tenant: one(tenants, { fields: [productVariants.tenantId], references: [tenants.id] }),
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
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
  outlet: one(outlets, { fields: [transactions.outletId], references: [outlets.id] }),
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

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  tenant: one(tenants, { fields: [auditLogs.tenantId], references: [tenants.id] }),
  user: one(profiles, { fields: [auditLogs.userId], references: [profiles.id] }),
}));

export const outletsRelations = relations(outlets, ({ one, many }) => ({
  tenant: one(tenants, { fields: [outlets.tenantId], references: [tenants.id] }),
  profiles: many(profiles),
  products: many(products),
  transactions: many(transactions),
  shifts: many(shifts),
  expenses: many(expenses),
}));

export const settingsRelations = relations(settings, ({ one }) => ({
  tenant: one(tenants, { fields: [settings.tenantId], references: [tenants.id] }),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  product: one(products, { fields: [priceHistory.productId], references: [products.id] }),
  changedByProfile: one(profiles, { fields: [priceHistory.changedBy], references: [profiles.id] }),
}));

export const promosRelations = relations(promos, ({ one }) => ({
  tenant: one(tenants, { fields: [promos.tenantId], references: [tenants.id] }),
  product: one(products, { fields: [promos.productId], references: [products.id] }),
}));

export const shiftsRelations = relations(shifts, ({ one }) => ({
  tenant: one(tenants, { fields: [shifts.tenantId], references: [tenants.id] }),
  cashier: one(profiles, { fields: [shifts.cashierId], references: [profiles.id] }),
}));

export const sharedReceiptsRelations = relations(sharedReceipts, ({ one }) => ({
  tenant: one(tenants, { fields: [sharedReceipts.tenantId], references: [tenants.id] }),
  transaction: one(transactions, { fields: [sharedReceipts.transactionId], references: [transactions.id] }),
}));

export const modifierGroupsRelations = relations(modifierGroups, ({ one, many }) => ({
  tenant: one(tenants, { fields: [modifierGroups.tenantId], references: [tenants.id] }),
  options: many(modifierOptions),
  productModifiers: many(productModifiers),
}));

export const modifierOptionsRelations = relations(modifierOptions, ({ one }) => ({
  tenant: one(tenants, { fields: [modifierOptions.tenantId], references: [tenants.id] }),
  group: one(modifierGroups, { fields: [modifierOptions.groupId], references: [modifierGroups.id] }),
}));

export const productModifiersRelations = relations(productModifiers, ({ one }) => ({
  tenant: one(tenants, { fields: [productModifiers.tenantId], references: [tenants.id] }),
  product: one(products, { fields: [productModifiers.productId], references: [products.id] }),
  modifierGroup: one(modifierGroups, { fields: [productModifiers.modifierGroupId], references: [modifierGroups.id] }),
}));
