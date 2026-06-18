CREATE TYPE "public"."movement_type" AS ENUM('sale', 'purchase', 'adjustment', 'waste', 'return');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'qris', 'card', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."reference_type" AS ENUM('transaction', 'purchase', 'manual');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('paid', 'void', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('owner', 'manager', 'cashier');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"category_id" uuid,
	"description" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"spent_at" timestamp with time zone NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"name" text NOT NULL,
	"current_stock" numeric(14, 3) DEFAULT '0' NOT NULL,
	"min_stock" numeric(14, 3) DEFAULT '0' NOT NULL,
	"last_cost" numeric(14, 4) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"method" "payment_method" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"amount_received" numeric(14, 2),
	"change_amount" numeric(14, 2) DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"category_id" uuid,
	"name" text NOT NULL,
	"sku" text,
	"image_url" text,
	"price" numeric(14, 2) NOT NULL,
	"cost_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" DEFAULT 'cashier' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"quantity" numeric(14, 3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"tenant_id" uuid PRIMARY KEY NOT NULL,
	"cafe_name" text DEFAULT 'Herbaspace' NOT NULL,
	"address" text,
	"phone" text,
	"logo_url" text,
	"tax_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"service_charge_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"receipt_header" text,
	"receipt_footer" text,
	"enabled_payment_methods" jsonb DEFAULT '["cash","qris"]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"type" "movement_type" NOT NULL,
	"qty_change" numeric(14, 3) NOT NULL,
	"balance_after" numeric(14, 3) NOT NULL,
	"unit_cost" numeric(14, 4),
	"ref_type" "reference_type",
	"reference_id" uuid,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"product_id" uuid,
	"product_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(14, 2) NOT NULL,
	"unit_cogs" numeric(14, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"number" text NOT NULL,
	"customer_id" uuid,
	"cashier_id" uuid,
	"status" "transaction_status" DEFAULT 'paid' NOT NULL,
	"subtotal" numeric(14, 2) NOT NULL,
	"discount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"cogs_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_cashier_id_profiles_id_fk" FOREIGN KEY ("cashier_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_tenant_idx" ON "categories" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "customers_tenant_idx" ON "customers" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_tenant_phone_unq" ON "customers" USING btree ("tenant_id","phone");--> statement-breakpoint
CREATE INDEX "expense_categories_tenant_idx" ON "expense_categories" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "expenses_tenant_idx" ON "expenses" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "expenses_spent_at_idx" ON "expenses" USING btree ("spent_at");--> statement-breakpoint
CREATE INDEX "ingredients_tenant_idx" ON "ingredients" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "payments_transaction_idx" ON "payments" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "products_tenant_idx" ON "products" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "profiles_tenant_idx" ON "profiles" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_email_unq" ON "profiles" USING btree ("email");--> statement-breakpoint
CREATE INDEX "recipe_items_product_idx" ON "recipe_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_items_product_ingredient_unq" ON "recipe_items" USING btree ("product_id","ingredient_id");--> statement-breakpoint
CREATE INDEX "stock_movements_tenant_idx" ON "stock_movements" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "stock_movements_ingredient_idx" ON "stock_movements" USING btree ("ingredient_id");--> statement-breakpoint
CREATE INDEX "stock_movements_created_at_idx" ON "stock_movements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "transaction_items_transaction_idx" ON "transaction_items" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "transactions_tenant_idx" ON "transactions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "transactions_created_at_idx" ON "transactions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_number_unq" ON "transactions" USING btree ("tenant_id","number");--> statement-breakpoint
CREATE INDEX "units_tenant_idx" ON "units" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "units_tenant_code_unq" ON "units" USING btree ("tenant_id","code");