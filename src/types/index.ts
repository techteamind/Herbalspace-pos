import type { InferSelectModel } from "drizzle-orm";
import * as schema from "../../db/schema";

export type Tenant = InferSelectModel<typeof schema.tenants>;
export type Profile = InferSelectModel<typeof schema.profiles>;
export type Category = InferSelectModel<typeof schema.categories>;
export type Product = InferSelectModel<typeof schema.products>;
export type Unit = InferSelectModel<typeof schema.units>;
export type Ingredient = InferSelectModel<typeof schema.ingredients>;
export type RecipeItem = InferSelectModel<typeof schema.recipeItems>;
export type StockMovement = InferSelectModel<typeof schema.stockMovements>;
export type Customer = InferSelectModel<typeof schema.customers>;
export type Transaction = InferSelectModel<typeof schema.transactions>;
export type TransactionItem = InferSelectModel<typeof schema.transactionItems>;
export type Payment = InferSelectModel<typeof schema.payments>;
export type ExpenseCategory = InferSelectModel<typeof schema.expenseCategories>;
export type Expense = InferSelectModel<typeof schema.expenses>;
export type Settings = InferSelectModel<typeof schema.settings>;
export type VariantGroup = InferSelectModel<typeof schema.variantGroups>;
export type VariantOption = InferSelectModel<typeof schema.variantOptions>;
export type ProductVariant = InferSelectModel<typeof schema.productVariants>;
export type ModifierGroup = InferSelectModel<typeof schema.modifierGroups>;
export type ModifierOption = InferSelectModel<typeof schema.modifierOptions>;
export type ProductModifier = InferSelectModel<typeof schema.productModifiers>;

export type TransactionWithItems = Transaction & {
  items: TransactionItem[];
  payments: Payment[];
  customer: Customer | null;
  cashier: Pick<Profile, "id" | "fullName"> | null;
};

export type VariantGroupWithOptions = VariantGroup & {
  options: VariantOption[];
};

export type ModifierGroupWithOptions = ModifierGroup & {
  options: ModifierOption[];
};

export type ProductModifierWithGroup = ProductModifier & {
  modifierGroup: ModifierGroupWithOptions;
};

export type ProductWithCategory = Product & {
  category: Category | null;
  variantGroups?: VariantGroupWithOptions[];
  variants?: ProductVariant[];
  modifiers?: ProductModifierWithGroup[];
};

export type IngredientWithUnit = Ingredient & {
  unit: Unit;
};

export interface DashboardStats {
  todayRevenue: number;
  todayTransactions: number;
  todayProductsSold: number;
  avgPerTransaction: number;
  yesterdayRevenue: number;
  yesterdayTransactions: number;
  yesterdayProductsSold: number;
  profileName: string;
}

export interface TopProduct {
  productId: string;
  productName: string;
  totalSold: number;
  totalRevenue: string | number;
}

export interface LowStockItem {
  id: string;
  name: string;
  currentStock: string | number;
  minStock: string | number;
  unitCode: string;
}
